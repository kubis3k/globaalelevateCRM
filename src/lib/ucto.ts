import 'server-only'

// ─────────────────────────────────────────────────────────────────────────
// Read-only adaptér na účetní systém (ucto.globaalelevate.com).
// Připojuje se přímo na jeho Postgres (env UCTO_DATABASE_URL, Neon).
// POZOR: nasazená webová verze má tabulky ve schématu `public` a používá
// SQLite-styl typů (datumy jako ISO text, booleany jako 0/1) — dotazy tomu
// odpovídají (texty se porovnávají lexikálně, což pro ISO datumy funguje).
// Účto je autoritativní zdroj finančních čísel; work z něj čte jen souhrn.
// Bez env proměnné (nebo při chybě) vrací { connected: false } a UI to řekne.
// ─────────────────────────────────────────────────────────────────────────

import { Pool } from 'pg'

export type UctoSummary = {
  connected: true
  revenueYtd: number      // tržby (faktury vydané + pokladní příjmy) od začátku roku
  costsYtd: number        // náklady (faktury přijaté + pokladní výdaje) od začátku roku
  profitYtd: number
  receivables: number     // neuhrazené vydané faktury
  receivablesCount: number
  payables: number        // neuhrazené přijaté faktury
  payablesCount: number
  bankBalance: number     // součet bankovních pohybů
  isVatPayer: boolean
  vatDueQuarter: number | null   // DPH k odvodu za běžné čtvrtletí (jen plátce)
  obrat12m: number | null        // obrat 12 měsíců (neplátce — sledování limitu 2 mil.)
  zbyvaDoLimitu: number | null
  months: { month: string; inflow: number; outflow: number }[]  // bankovní pohyby po měsících (12 m)
}

export type UctoResult = UctoSummary | { connected: false; reason: string }

// Pool přežívá hot-reload i mezi requesty (Vercel container reuse).
const g = globalThis as unknown as { __uctoPool?: Pool }
function getPool(): Pool | null {
  const url = process.env.UCTO_DATABASE_URL
  if (!url) return null
  if (!g.__uctoPool) {
    g.__uctoPool = new Pool({
      connectionString: url,
      max: 3,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 8_000,
      ssl: url.includes('localhost') || url.includes('127.0.0.1') ? undefined : { rejectUnauthorized: false },
    })
  }
  return g.__uctoPool
}

// Krátká cache — dashboard i Finance se často obnovují, účto se mění pomalu.
let cache: { at: number; data: UctoResult } | null = null
const CACHE_MS = 5 * 60_000

const iso = (d: Date) => d.toISOString().slice(0, 10)

export type UctoInvoice = {
  id: number
  docType: 'faktura_vydana' | 'faktura_prijata'
  number: string
  variableSymbol: string | null
  contactName: string | null
  description: string
  amount: number
  currency: string
  issueDate: string
  dueDate: string | null
  paid: boolean
}

let invCache: { at: number; data: UctoInvoice[] } | null = null

// Faktury z účta (read-only zrcadlo pro modul Faktury). Uhrazenost = spárovaná
// bankovní platba NEBO zaplacená online platba (Stripe).
export async function getUctoInvoices(limit = 300): Promise<UctoInvoice[] | null> {
  if (invCache && Date.now() - invCache.at < CACHE_MS) return invCache.data
  const pool = getPool()
  if (!pool) return null
  try {
    const { rows } = await pool.query(
      `SELECT d.id, d.doc_type, d.doc_number, d.variable_symbol, d.issue_date, d.due_date,
              d.description, d.total_amount, d.currency,
              c.name AS contact_name,
              (EXISTS (SELECT 1 FROM bank_statement_line b WHERE b.matched_document_id = d.id)
               OR EXISTS (SELECT 1 FROM invoice_payment p WHERE p.document_id = d.id AND p.status = 'paid')) AS paid
       FROM document d
       LEFT JOIN contact c ON c.id = d.contact_id
       WHERE d.doc_type IN ('faktura_vydana','faktura_prijata') AND d.status <> 'stornovany'
       ORDER BY d.issue_date DESC, d.id DESC
       LIMIT $1`,
      [limit],
    )
    const data: UctoInvoice[] = rows.map((r: any) => ({
      id: Number(r.id),
      docType: r.doc_type,
      number: r.doc_number,
      variableSymbol: r.variable_symbol || null,
      contactName: r.contact_name || null,
      description: r.description || '',
      amount: Number(r.total_amount || 0),
      currency: r.currency || 'CZK',
      issueDate: r.issue_date,
      dueDate: r.due_date || null,
      paid: !!r.paid,
    }))
    invCache = { at: Date.now(), data }
    return data
  } catch (e: any) {
    console.error('[ucto] invoices failed', e?.message || e)
    return null
  }
}

export async function getUctoSummary(): Promise<UctoResult> {
  if (cache && Date.now() - cache.at < CACHE_MS && cache.data.connected) return cache.data

  const pool = getPool()
  if (!pool) return { connected: false, reason: 'Chybí UCTO_DATABASE_URL — přidej ji do env proměnných na Vercelu.' }

  try {
    const now = new Date()
    const yearStart = `${now.getFullYear()}-01-01`
    const twelveMonthsAgo = iso(new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()))
    const quarterStart = iso(new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1))

    const [kpi, unpaid, bank, monthsRes, unit, vat, obrat] = await Promise.all([
      pool.query(
        `SELECT
           COALESCE(SUM(total_amount) FILTER (WHERE doc_type IN ('faktura_vydana','pokladni_prijem') AND issue_date >= $1), 0) AS revenue,
           COALESCE(SUM(total_amount) FILTER (WHERE doc_type IN ('faktura_prijata','pokladni_vydej') AND issue_date >= $1), 0) AS costs
         FROM document
         WHERE status <> 'stornovany'`,
        [yearStart],
      ),
      // Kniha pohledávek a závazků — neuhrazené = bez spárované bankovní platby
      // a bez zaplacené online platby (Stripe).
      pool.query(
        `SELECT d.doc_type, COALESCE(SUM(d.total_amount), 0) AS total, COUNT(*)::int AS cnt
         FROM document d
         WHERE d.doc_type IN ('faktura_vydana','faktura_prijata')
           AND d.status <> 'stornovany'
           AND NOT EXISTS (SELECT 1 FROM bank_statement_line b WHERE b.matched_document_id = d.id)
           AND NOT EXISTS (SELECT 1 FROM invoice_payment p WHERE p.document_id = d.id AND p.status = 'paid')
         GROUP BY d.doc_type`,
      ),
      pool.query(`SELECT COALESCE(SUM(amount), 0) AS balance FROM bank_statement_line`),
      // statement_date je ISO text → měsíc přes substr.
      pool.query(
        `SELECT substr(statement_date, 1, 7) AS month,
                COALESCE(SUM(amount) FILTER (WHERE amount > 0), 0) AS inflow,
                COALESCE(SUM(-amount) FILTER (WHERE amount < 0), 0) AS outflow
         FROM bank_statement_line
         WHERE statement_date >= $1
         GROUP BY 1 ORDER BY 1`,
        [twelveMonthsAgo],
      ),
      pool.query(`SELECT is_vat_payer FROM accounting_unit ORDER BY id LIMIT 1`),
      pool.query(
        `SELECT COALESCE(SUM(vat_amount) FILTER (WHERE direction = 'uskutecnene'), 0)
              - COALESCE(SUM(vat_amount) FILTER (WHERE direction = 'prijate'), 0) AS vat_due
         FROM vat_ledger_entry
         WHERE duzp >= $1`,
        [quarterStart],
      ),
      // Obrat 12 po sobě jdoucích měsíců vůči limitu povinné registrace k DPH.
      pool.query(
        `SELECT COALESCE(SUM(total_amount), 0) AS obrat
         FROM document
         WHERE doc_type = 'faktura_vydana' AND status <> 'stornovany' AND issue_date >= $1`,
        [twelveMonthsAgo],
      ),
    ])

    const revenueYtd = Number(kpi.rows[0]?.revenue || 0)
    const costsYtd = Number(kpi.rows[0]?.costs || 0)
    const rec = unpaid.rows.find((r: any) => r.doc_type === 'faktura_vydana')
    const pay = unpaid.rows.find((r: any) => r.doc_type === 'faktura_prijata')
    const isVatPayer = Number(unit.rows[0]?.is_vat_payer || 0) === 1
    const obrat12m = Number(obrat.rows[0]?.obrat || 0)

    const data: UctoSummary = {
      connected: true,
      revenueYtd,
      costsYtd,
      profitYtd: revenueYtd - costsYtd,
      receivables: Number(rec?.total || 0),
      receivablesCount: Number(rec?.cnt || 0),
      payables: Number(pay?.total || 0),
      payablesCount: Number(pay?.cnt || 0),
      bankBalance: Number(bank.rows[0]?.balance || 0),
      isVatPayer,
      vatDueQuarter: isVatPayer ? Number(vat.rows[0]?.vat_due || 0) : null,
      obrat12m,
      zbyvaDoLimitu: Math.max(0, 2_000_000 - obrat12m),
      months: monthsRes.rows.map((r: any) => ({ month: r.month, inflow: Number(r.inflow), outflow: Number(r.outflow) })),
    }
    cache = { at: Date.now(), data }
    return data
  } catch (e: any) {
    console.error('[ucto] summary failed', e?.message || e)
    const fail: UctoResult = { connected: false, reason: `Účto se nepodařilo načíst: ${e?.message || 'neznámá chyba'}` }
    cache = { at: Date.now(), data: fail }
    return fail
  }
}
