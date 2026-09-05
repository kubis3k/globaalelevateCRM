import 'server-only'
import { PDFDocument, rgb, type PDFFont } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { robotoRegularBase64 } from './fonts/roboto-regular'
import { robotoBoldBase64 } from './fonts/roboto-bold'
import type { UctoInvoiceDetail } from '@/lib/ucto'

// Generuje plnohodnotný daňový doklad (A4) z účto dat. pdf-lib je pure-JS
// (Vercel-safe, žádný chromium). Fonty jsou vložené base64 (žádný fetch — na
// klient. doméně by host guard fetch /fonts přesměroval).

const A4 = { w: 595.28, h: 841.89 }
const M = 48 // margin
const INK = rgb(0.11, 0.12, 0.14)
const MUTE = rgb(0.42, 0.45, 0.5)
const LINE = rgb(0.85, 0.86, 0.88)
const ACCENT = rgb(0.14, 0.39, 0.92)

function fmtMoney(n: number, currency: string): string {
  const s = new Intl.NumberFormat('cs-CZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)
  const suffix = currency === 'CZK' ? ' Kč' : ` ${currency}`
  return s + suffix
}
function fmtQty(n: number): string {
  return new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 3 }).format(n)
}
function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  return m ? `${m[3]}.${m[2]}.${m[1]}` : iso
}

export async function renderInvoicePdf(inv: UctoInvoiceDetail): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  const regular = await doc.embedFont(Buffer.from(robotoRegularBase64, 'base64'), { subset: true })
  const bold = await doc.embedFont(Buffer.from(robotoBoldBase64, 'base64'), { subset: true })

  let page = doc.addPage([A4.w, A4.h])
  let y = A4.h - M

  const draw = (
    s: string,
    x: number,
    yy: number,
    o: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb> } = {},
  ) => {
    page.drawText(s ?? '', { x, y: yy, size: o.size ?? 9, font: o.bold ? bold : regular, color: o.color ?? INK })
  }
  const drawRight = (
    s: string,
    xRight: number,
    yy: number,
    o: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb> } = {},
  ) => {
    const f = o.bold ? bold : regular
    const size = o.size ?? 9
    const w = f.widthOfTextAtSize(s ?? '', size)
    page.drawText(s ?? '', { x: xRight - w, y: yy, size, font: f, color: o.color ?? INK })
  }
  // Ořízne text na max šířku (přidá … když je delší).
  const clip = (s: string, maxW: number, size: number, f: PDFFont): string => {
    if (f.widthOfTextAtSize(s, size) <= maxW) return s
    let t = s
    while (t.length > 1 && f.widthOfTextAtSize(t + '…', size) > maxW) t = t.slice(0, -1)
    return t + '…'
  }

  // ── Hlavička: dodavatel vlevo, logo vpravo ──────────────────────────────
  const s = inv.seller
  draw(s.name, M, y, { size: 15, bold: true })
  // logo (volitelně, jen png/jpg data-url; chyba = přeskočit)
  if (s.logoDataUrl) {
    try {
      const m = /^data:image\/(png|jpe?g);base64,(.+)$/i.exec(s.logoDataUrl.trim())
      if (m) {
        const bytes = Buffer.from(m[2], 'base64')
        const img = m[1].toLowerCase() === 'png' ? await doc.embedPng(bytes) : await doc.embedJpg(bytes)
        const maxW = 130, maxH = 54
        const sc = Math.min(maxW / img.width, maxH / img.height, 1)
        page.drawImage(img, { x: A4.w - M - img.width * sc, y: y - 8, width: img.width * sc, height: img.height * sc })
      }
    } catch { /* logo je nice-to-have */ }
  }
  y -= 18
  const sellerLines = [
    s.ico ? `IČO: ${s.ico}` : null,
    s.dic ? `DIČ: ${s.dic}` : (s.isVatPayer ? null : 'Neplátce DPH'),
    s.address || null,
    [s.email, s.phone].filter(Boolean).join(' · ') || null,
  ].filter(Boolean) as string[]
  for (const l of sellerLines) { draw(l, M, y, { size: 9, color: MUTE }); y -= 12 }

  // ── Titul + číslo ───────────────────────────────────────────────────────
  y -= 14
  draw('FAKTURA — DAŇOVÝ DOKLAD', M, y, { size: 16, bold: true, color: ACCENT })
  drawRight(`č. ${inv.number}`, A4.w - M, y, { size: 13, bold: true })
  y -= 10
  page.drawLine({ start: { x: M, y }, end: { x: A4.w - M, y }, thickness: 1, color: LINE })
  y -= 22

  // ── Odběratel (vlevo) + meta (vpravo) ───────────────────────────────────
  const blockTop = y
  const b = inv.buyer
  draw('ODBĚRATEL', M, y, { size: 8, bold: true, color: MUTE }); y -= 14
  draw(clip(b.name, 260, 11, bold), M, y, { size: 11, bold: true }); y -= 13
  const buyerLines = [
    b.ico ? `IČO: ${b.ico}` : null,
    b.dic ? `DIČ: ${b.dic}` : null,
    b.address || null,
    b.email || null,
  ].filter(Boolean) as string[]
  for (const l of buyerLines) { draw(clip(l, 260, 9, regular), M, y, { size: 9, color: MUTE }); y -= 12 }

  // meta vpravo — dvousloupcová tabulka (label / hodnota)
  const metaX = A4.w - M - 200
  const metaValX = A4.w - M
  let my = blockTop
  const meta: [string, string][] = [
    ['Variabilní symbol', inv.variableSymbol || inv.number],
    ['Datum vystavení', fmtDate(inv.issueDate)],
    ['DUZP', fmtDate(inv.taxableSupplyDate || inv.issueDate)],
    ['Datum splatnosti', fmtDate(inv.dueDate)],
  ]
  for (const [k, v] of meta) {
    draw(k, metaX, my, { size: 9, color: MUTE })
    drawRight(v, metaValX, my, { size: 9, bold: true })
    my -= 14
  }

  y = Math.min(y, my) - 18

  // ── Tabulka položek ─────────────────────────────────────────────────────
  const cols = { desc: M, qty: 360, unit: 440, vat: 480, amount: A4.w - M }
  draw('Popis', cols.desc, y, { size: 8, bold: true, color: MUTE })
  drawRight('Množ.', cols.qty, y, { size: 8, bold: true, color: MUTE })
  drawRight('J. cena', cols.unit, y, { size: 8, bold: true, color: MUTE })
  drawRight('DPH', cols.vat, y, { size: 8, bold: true, color: MUTE })
  drawRight('Celkem', cols.amount, y, { size: 8, bold: true, color: MUTE })
  y -= 6
  page.drawLine({ start: { x: M, y }, end: { x: A4.w - M, y }, thickness: 0.75, color: LINE })
  y -= 14

  const lines = inv.lines.length > 0
    ? inv.lines
    : [{ lineNo: 1, description: inv.description || 'Fakturovaná částka', quantity: 1, unitPrice: inv.totalAmount, vatRate: inv.vatRate, lineAmount: inv.totalAmount }]

  for (const l of lines) {
    if (y < 140) { // stránka došla — nová strana
      page = doc.addPage([A4.w, A4.h])
      y = A4.h - M
    }
    draw(clip(l.description || '—', cols.qty - cols.desc - 60, 9, regular), cols.desc, y, { size: 9 })
    drawRight(fmtQty(l.quantity), cols.qty, y, { size: 9, color: MUTE })
    drawRight(fmtMoney(l.unitPrice, inv.currency), cols.unit, y, { size: 9, color: MUTE })
    drawRight(l.vatRate != null ? `${l.vatRate}%` : '—', cols.vat, y, { size: 9, color: MUTE })
    drawRight(fmtMoney(l.lineAmount, inv.currency), cols.amount, y, { size: 9, bold: true })
    y -= 16
  }

  y -= 6
  page.drawLine({ start: { x: M, y }, end: { x: A4.w - M, y }, thickness: 0.75, color: LINE })
  y -= 20

  // ── Rekapitulace (vpravo) ───────────────────────────────────────────────
  const sumLabelX = A4.w - M - 200
  const sumValX = A4.w - M
  if (inv.isVatDocument && (inv.vatBase != null || inv.vatAmount != null)) {
    draw('Základ DPH', sumLabelX, y, { size: 9, color: MUTE })
    drawRight(fmtMoney(inv.vatBase ?? inv.totalAmount - (inv.vatAmount ?? 0), inv.currency), sumValX, y, { size: 9 })
    y -= 15
    draw(`DPH ${inv.vatRate != null ? inv.vatRate + '%' : ''}`.trim(), sumLabelX, y, { size: 9, color: MUTE })
    drawRight(fmtMoney(inv.vatAmount ?? 0, inv.currency), sumValX, y, { size: 9 })
    y -= 8
    page.drawLine({ start: { x: sumLabelX, y }, end: { x: sumValX, y }, thickness: 0.75, color: LINE })
    y -= 16
  }
  draw('Celkem k úhradě', sumLabelX, y, { size: 12, bold: true })
  drawRight(fmtMoney(inv.totalAmount, inv.currency), sumValX, y, { size: 12, bold: true, color: ACCENT })
  y -= 26

  if (inv.paid) {
    draw('UHRAZENO', sumLabelX, y, { size: 11, bold: true, color: rgb(0.13, 0.55, 0.33) })
    y -= 20
  }

  // ── Platební údaje (vlevo dole) ─────────────────────────────────────────
  let py = 120
  draw('PLATEBNÍ ÚDAJE', M, py, { size: 8, bold: true, color: MUTE }); py -= 14
  const payLines = [
    s.bankAccount ? `Číslo účtu: ${s.bankAccount}` : null,
    s.iban ? `IBAN: ${s.iban}` : null,
    `Variabilní symbol: ${inv.variableSymbol || inv.number}`,
    `Částka: ${fmtMoney(inv.totalAmount, inv.currency)}`,
  ].filter(Boolean) as string[]
  for (const l of payLines) { draw(l, M, py, { size: 9 }); py -= 13 }

  // ── Patička ─────────────────────────────────────────────────────────────
  page.drawLine({ start: { x: M, y: 54 }, end: { x: A4.w - M, y: 54 }, thickness: 0.5, color: LINE })
  draw('Vygenerováno z účetního systému Globaal Elevate.', M, 42, { size: 7.5, color: MUTE })
  drawRight(`${s.name}${s.dic ? ' · DIČ ' + s.dic : ''}`, A4.w - M, 42, { size: 7.5, color: MUTE })

  return await doc.save()
}
