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

// Vydané faktury pro konkrétního klienta klientského portálu — spárováno na
// contact v účtu podle IČO (přesná shoda), jinak podle názvu firmy (case-
// insensitive). Bez shody vrací prázdné pole (ne null — to je vyhrazeno pro
// "účto nedostupné").
export async function getUctoInvoicesForClient(client: { name: string; ico?: string | null }): Promise<UctoInvoice[] | null> {
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
       JOIN contact c ON c.id = d.contact_id
       WHERE d.doc_type = 'faktura_vydana' AND d.status <> 'stornovany'
         AND ((c.ico IS NOT NULL AND c.ico = $1) OR lower(c.name) = lower($2))
       ORDER BY d.issue_date DESC, d.id DESC
       LIMIT 200`,
      [client.ico || null, client.name],
    )
    return rows.map((r: any) => ({
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
  } catch (e: any) {
    console.error('[ucto] invoices for client failed', e?.message || e)
    return null
  }
}

// ── Detail jedné vydané faktury pro klienta portálu (pro generování PDF) ──────
// Ownership: faktura musí patřit contactu, který odpovídá klientovi (přesné IČO
// nebo case-insensitive název) — jinak vrací null (IDOR ochrana). null i když
// účto není dostupné nebo doklad neexistuje/není faktura_vydana.
export type UctoInvoiceDetail = {
  id: number
  number: string
  variableSymbol: string | null
  issueDate: string
  taxableSupplyDate: string | null
  dueDate: string | null
  description: string
  currency: string
  isVatDocument: boolean
  vatBase: number | null
  vatRate: number | null
  vatAmount: number | null
  totalAmount: number
  paid: boolean
  seller: {
    name: string; ico: string | null; dic: string | null
    address: string | null; iban: string | null; bankAccount: string | null
    email: string | null; phone: string | null; isVatPayer: boolean
    logoDataUrl: string | null
  }
  buyer: { name: string; ico: string | null; dic: string | null; address: string | null; email: string | null }
  lines: { lineNo: number; description: string; quantity: number; unitPrice: number; vatRate: number | null; lineAmount: number }[]
}

export async function getUctoInvoiceDetailForClient(
  id: number,
  client: { name: string; ico?: string | null },
): Promise<UctoInvoiceDetail | null> {
  const pool = getPool()
  if (!pool || !Number.isFinite(id)) return null
  try {
    const { rows } = await pool.query(
      `SELECT d.id, d.doc_number, d.variable_symbol, d.issue_date, d.taxable_supply_date, d.due_date,
              d.description, d.currency, d.is_vat_document, d.vat_base_amount, d.vat_rate, d.vat_amount,
              d.total_amount,
              (EXISTS (SELECT 1 FROM bank_statement_line b WHERE b.matched_document_id = d.id)
               OR EXISTS (SELECT 1 FROM invoice_payment p WHERE p.document_id = d.id AND p.status = 'paid')) AS paid,
              c.name AS buyer_name, c.ico AS buyer_ico, c.dic AS buyer_dic, c.address AS buyer_address, c.email AS buyer_email,
              u.name AS seller_name, u.ico AS seller_ico, u.dic AS seller_dic, u.address AS seller_address,
              u.iban AS seller_iban, u.bank_account AS seller_bank, u.email AS seller_email, u.phone AS seller_phone,
              u.is_vat_payer AS seller_vat_payer, u.logo_data_url AS seller_logo
       FROM document d
       JOIN contact c ON c.id = d.contact_id
       LEFT JOIN accounting_unit u ON u.id = d.accounting_unit_id
       WHERE d.id = $1 AND d.doc_type = 'faktura_vydana' AND d.status <> 'stornovany'
         AND ((c.ico IS NOT NULL AND c.ico = $2) OR lower(c.name) = lower($3))
       LIMIT 1`,
      [id, client.ico || null, client.name],
    )
    const r = rows[0]
    if (!r) return null

    const { rows: lineRows } = await pool.query(
      `SELECT line_no, description, quantity, unit_price, vat_rate, line_amount
       FROM document_line WHERE document_id = $1 ORDER BY line_no ASC, id ASC`,
      [id],
    )

    return {
      id: Number(r.id),
      number: r.doc_number,
      variableSymbol: r.variable_symbol || null,
      issueDate: r.issue_date,
      taxableSupplyDate: r.taxable_supply_date || null,
      dueDate: r.due_date || null,
      description: r.description || '',
      currency: r.currency || 'CZK',
      isVatDocument: Number(r.is_vat_document || 0) === 1,
      vatBase: r.vat_base_amount != null ? Number(r.vat_base_amount) : null,
      vatRate: r.vat_rate != null ? Number(r.vat_rate) : null,
      vatAmount: r.vat_amount != null ? Number(r.vat_amount) : null,
      totalAmount: Number(r.total_amount || 0),
      paid: !!r.paid,
      seller: {
        name: r.seller_name || 'Globaal Elevate',
        ico: r.seller_ico || null,
        dic: r.seller_dic || null,
        address: r.seller_address || null,
        iban: r.seller_iban || null,
        bankAccount: r.seller_bank || null,
        email: r.seller_email || null,
        phone: r.seller_phone || null,
        isVatPayer: Number(r.seller_vat_payer || 0) === 1,
        logoDataUrl: r.seller_logo || null,
      },
      buyer: {
        name: r.buyer_name || client.name,
        ico: r.buyer_ico || null,
        dic: r.buyer_dic || null,
        address: r.buyer_address || null,
        email: r.buyer_email || null,
      },
      lines: lineRows.map((l: any) => ({
        lineNo: Number(l.line_no || 0),
        description: l.description || '',
        quantity: Number(l.quantity || 0),
        unitPrice: Number(l.unit_price || 0),
        vatRate: l.vat_rate != null ? Number(l.vat_rate) : null,
        lineAmount: Number(l.line_amount || 0),
      })),
    }
  } catch (e: any) {
    console.error('[ucto] invoice detail failed', e?.message || e)
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
