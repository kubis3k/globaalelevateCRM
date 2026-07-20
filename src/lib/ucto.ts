import 'server-only'

// ─────────────────────────────────────────────────────────────────────────
// Read-only adaptér na účetní systém (ucto.globaalelevate.com).
// Připojuje se přímo na jeho Postgres (env UCTO_DATABASE_URL), schéma
// `ucetnictvi` (viz repo ucetnictvi/db/001_schema.sql). Účto je autoritativní
// zdroj finančních čísel — dashboard/Finance z něj čtou jen souhrn.
// Bez env proměnné (nebo při chybě) vrací { connected: false } a UI to řekne.
// ─────────────────────────────────────────────────────────────────────────

import { Pool } from 'pg'

export type UctoSummary = {
  connected: true
  revenueYtd: number      // tržby (faktury vydané + pokladní příjmy) od začátku roku
  costsYtd: number        // náklady (faktury přijaté + pokladní výdaje) od začátku roku
  profitYtd: number
  receivables: number     // neuhrazené vydané faktury (kniha pohledávek)
  receivablesCount: number
  payables: number        // neuhrazené přijaté faktury (kniha závazků)
  payablesCount: number
  bankBalance: number     // součet bankovních pohybů
  isVatPayer: boolean
  vatDueQuarter: number | null   // DPH k odvodu za běžné čtvrtletí (jen plátce)
  obrat12m: number | null        // obrat 12 měsíců (neplátce — sledování limitu)
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

export async function getUctoSummary(): Promise<UctoResult> {
  if (cache && Date.now() - cache.at < CACHE_MS && cache.data.connected) return cache.data

  const pool = getPool()
  if (!pool) return { connected: false, reason: 'Chybí UCTO_DATABASE_URL — přidej ji do env proměnných na Vercelu.' }

  try {
    const yearStart = `${new Date().getFullYear()}-01-01`

    const [kpi, unpaid, bank, monthsRes, unit, vat, obrat] = await Promise.all([
      pool.query(
        `SELECT
           COALESCE(SUM(total_amount) FILTER (WHERE doc_type IN ('faktura_vydana','pokladni_prijem') AND issue_date >= $1), 0) AS revenue,
           COALESCE(SUM(total_amount) FILTER (WHERE doc_type IN ('faktura_prijata','pokladni_vydej') AND issue_date >= $1), 0) AS costs
         FROM ucetnictvi.document
         WHERE status <> 'stornovany'`,
        [yearStart],
      ),
      pool.query(
        `SELECT doc_type, COALESCE(SUM(total_amount), 0) AS total, COUNT(*)::int AS cnt
         FROM ucetnictvi.v_kniha_pohledavky_zavazky
         GROUP BY doc_type`,
      ),
      pool.query(`SELECT COALESCE(SUM(amount), 0) AS balance FROM ucetnictvi.bank_statement_line`),
      pool.query(
        `SELECT to_char(statement_date, 'YYYY-MM') AS month,
                COALESCE(SUM(amount) FILTER (WHERE amount > 0), 0) AS inflow,
                COALESCE(SUM(-amount) FILTER (WHERE amount < 0), 0) AS outflow
         FROM ucetnictvi.bank_statement_line
         WHERE statement_date >= (CURRENT_DATE - INTERVAL '12 months')
         GROUP BY 1 ORDER BY 1`,
      ),
      pool.query(`SELECT is_vat_payer FROM ucetnictvi.accounting_unit ORDER BY id LIMIT 1`),
      pool.query(
        `SELECT COALESCE(SUM(vat_amount) FILTER (WHERE direction = 'uskutecnene'), 0)
              - COALESCE(SUM(vat_amount) FILTER (WHERE direction = 'prijate'), 0) AS vat_due
         FROM ucetnictvi.vat_ledger_entry
         WHERE duzp >= date_trunc('quarter', CURRENT_DATE)`,
      ),
      pool.query(`SELECT obrat_12m, zbyva_do_limitu FROM ucetnictvi.v_obrat_12m LIMIT 1`),
    ])

    const revenueYtd = Number(kpi.rows[0]?.revenue || 0)
    const costsYtd = Number(kpi.rows[0]?.costs || 0)
    const rec = unpaid.rows.find((r: any) => r.doc_type === 'faktura_vydana')
    const pay = unpaid.rows.find((r: any) => r.doc_type === 'faktura_prijata')
    const isVatPayer = !!unit.rows[0]?.is_vat_payer

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
      obrat12m: obrat.rows[0] ? Number(obrat.rows[0].obrat_12m || 0) : 0,
      zbyvaDoLimitu: obrat.rows[0] ? Number(obrat.rows[0].zbyva_do_limitu || 0) : 2_000_000,
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
