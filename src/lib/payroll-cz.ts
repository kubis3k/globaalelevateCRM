// Czech payroll — KONTROLNÍ výpočet (HPP + DPP/DPČ). Všechny sazby a prahy jsou
// PARAMETRY (payroll_config) dle roku — roční aktualizace = úprava hodnot, ne kódu.
// Zjednodušení (zaokrouhlování, prahy) → výsledek je orientační podklad pro
// mzdovou účtárnu, NE závazný výpočet odvodů.

export type PayrollConfig = {
  sp_emp: number; zp_emp: number          // pojistné zaměstnanec (0.071 / 0.045)
  sp_er: number; zp_er: number            // pojistné zaměstnavatel (0.248 / 0.09)
  tax_rate1: number; tax_rate2: number     // 0.15 / 0.23
  tax_progress_monthly: number            // měsíční hranice pro 23 %
  credit_taxpayer: number                 // sleva na poplatníka / měs
  credit_child1: number; credit_child2: number; credit_child3: number
  min_wage_hour: number
  dpp_threshold: number                   // DPP: od této částky/měs odvody
  dpc_threshold: number                   // DPČ: od této částky/měs odvody
  srazkova_rate: number                   // srážková daň (0.15)
}

// Výchozí hodnoty 2026 (orientační — uprav dle aktuální legislativy v Nastavení mezd).
export const DEFAULT_PAYROLL_CONFIG: PayrollConfig = {
  sp_emp: 0.071, zp_emp: 0.045, sp_er: 0.248, zp_er: 0.09,
  tax_rate1: 0.15, tax_rate2: 0.23, tax_progress_monthly: 139671,
  credit_taxpayer: 2570, credit_child1: 1267, credit_child2: 1860, credit_child3: 2320,
  min_wage_hour: 134.4, dpp_threshold: 12000, dpc_threshold: 4500, srazkova_rate: 0.15,
}

export type PayrollInput = { contractType: string; gross: number; children: number; taxpayerCredit: boolean }
export type PayrollResult = {
  gross: number; spEmp: number; zpEmp: number; tax: number; net: number
  spEr: number; zpEr: number; employerCost: number
  regime: 'employment' | 'dpp_srazka' | 'dpp_zaloha' | 'dpc' | 'none'
}

function childCredit(n: number, c: PayrollConfig): number {
  let t = 0
  if (n >= 1) t += c.credit_child1
  if (n >= 2) t += c.credit_child2
  if (n >= 3) t += c.credit_child3 * (n - 2)
  return t
}

// Zálohová daň ze základu (zaokr. na 100 nahoru), po slevě na poplatníka a dětech.
// Záporný výsledek = daňový bonus.
function advanceTax(base: number, c: PayrollConfig, taxpayer: boolean, children: number): number {
  const tb = Math.ceil(base / 100) * 100
  const before = tb <= c.tax_progress_monthly
    ? tb * c.tax_rate1
    : c.tax_progress_monthly * c.tax_rate1 + (tb - c.tax_progress_monthly) * c.tax_rate2
  let t = Math.ceil(before)
  t = Math.max(0, t - (taxpayer ? c.credit_taxpayer : 0))
  return t - childCredit(children, c)
}

export function computePayroll(input: PayrollInput, c: PayrollConfig): PayrollResult {
  const g = Math.max(0, Math.round(input.gross || 0))
  const t = input.contractType
  const make = (regime: PayrollResult['regime'], spEmp: number, zpEmp: number, tax: number, spEr: number, zpEr: number): PayrollResult => ({
    gross: g, spEmp, zpEmp, tax, net: g - spEmp - zpEmp - tax, spEr, zpEr, employerCost: g + spEr + zpEr, regime,
  })
  const employment = (regime: PayrollResult['regime']) =>
    make(regime, Math.round(g * c.sp_emp), Math.round(g * c.zp_emp), advanceTax(g, c, input.taxpayerCredit, input.children), Math.round(g * c.sp_er), Math.round(g * c.zp_er))

  if (t === 'ico' || t === 'other') return make('none', 0, 0, 0, 0, 0)

  if (t === 'dpp') {
    if (g < c.dpp_threshold) {
      return input.taxpayerCredit
        ? make('dpp_zaloha', 0, 0, advanceTax(g, c, true, input.children), 0, 0)
        : make('dpp_srazka', 0, 0, Math.round(g * c.srazkova_rate), 0, 0)
    }
    return employment('employment')
  }
  if (t === 'dpc') {
    if (g < c.dpc_threshold) {
      return input.taxpayerCredit
        ? make('dpc', 0, 0, advanceTax(g, c, true, input.children), 0, 0)
        : make('dpc', 0, 0, Math.round(g * c.srazkova_rate), 0, 0)
    }
    return employment('dpc')
  }
  // full_time / part_time / intern / hpp → pracovní poměr
  return employment('employment')
}

export const REGIME_LABEL: Record<string, string> = {
  employment: 'Pracovní poměr', dpp_srazka: 'DPP (srážková daň)', dpp_zaloha: 'DPP (záloha)', dpc: 'DPČ', none: 'Bez odvodů (IČO)',
}
