// Czech public holidays + working-day calculation (used by leave + payroll).
// Movable feasts (Good Friday, Easter Monday) computed via the Gregorian Computus.

function easterSunday(year: number): Date {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(Date.UTC(year, month - 1, day))
}

const iso = (d: Date) => d.toISOString().slice(0, 10)

// State holidays of the Czech Republic for a given year (YYYY-MM-DD set).
export function czHolidays(year: number): Set<string> {
  const s = new Set<string>()
  const add = (m: number, d: number) => s.add(`${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  // Fixed-date state holidays
  add(1, 1)   // Nový rok / Den obnovy samostatného českého státu
  add(5, 1)   // Svátek práce
  add(5, 8)   // Den vítězství
  add(7, 5)   // Cyril a Metoděj
  add(7, 6)   // Jan Hus
  add(9, 28)  // Den české státnosti
  add(10, 28) // Vznik samostatného Československa
  add(11, 17) // Den boje za svobodu a demokracii
  add(12, 24) // Štědrý den
  add(12, 25) // 1. svátek vánoční
  add(12, 26) // 2. svátek vánoční
  // Movable: Velký pátek (−2) a Velikonoční pondělí (+1)
  const easter = easterSunday(year)
  const gf = new Date(easter); gf.setUTCDate(easter.getUTCDate() - 2)
  const em = new Date(easter); em.setUTCDate(easter.getUTCDate() + 1)
  s.add(iso(gf)); s.add(iso(em))
  return s
}

export function isCzHoliday(dateIso: string): boolean {
  return czHolidays(Number(dateIso.slice(0, 4))).has(dateIso)
}

export function isWorkingDay(d: Date, holidays: Set<string>): boolean {
  const day = d.getUTCDay()
  if (day === 0 || day === 6) return false
  return !holidays.has(iso(d))
}

// Working days between two ISO dates (inclusive), excluding weekends + CZ holidays.
export function workingDaysBetween(start: string, end: string): number {
  const s = new Date(start + 'T00:00:00Z'), e = new Date(end + 'T00:00:00Z')
  if (e < s) return 0
  const hol = new Set<string>()
  for (let y = s.getUTCFullYear(); y <= e.getUTCFullYear(); y++) for (const h of czHolidays(y)) hol.add(h)
  let count = 0
  for (const d = new Date(s); d <= e; d.setUTCDate(d.getUTCDate() + 1)) if (isWorkingDay(d, hol)) count++
  return count
}
