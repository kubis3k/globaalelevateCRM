import 'server-only'
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import { robotoRegularBase64 } from './fonts/roboto-regular'
import { robotoBoldBase64 } from './fonts/roboto-bold'
import type { ReportPdfData } from '@/lib/reports'

// Branded PDF klientského reportu (A4). pdf-lib pure-JS, font Roboto base64.

const A4 = { w: 595.28, h: 841.89 }
const M = 48
const INK = rgb(0.11, 0.12, 0.14)
const MUTE = rgb(0.42, 0.45, 0.5)
const LINE = rgb(0.85, 0.86, 0.88)
const ACCENT = rgb(0.14, 0.39, 0.92)
const CARD = rgb(0.96, 0.97, 0.98)

function fmtDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('cs-CZ')
}

export async function renderReportPdf(data: ReportPdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.registerFontkit(fontkit)
  const regular = await doc.embedFont(Buffer.from(robotoRegularBase64, 'base64'), { subset: true })
  const bold = await doc.embedFont(Buffer.from(robotoBoldBase64, 'base64'), { subset: true })

  let page = doc.addPage([A4.w, A4.h])
  let y = A4.h - M
  const bottom = 64

  const ensure = (h: number) => {
    if (y - h < bottom) { page = doc.addPage([A4.w, A4.h]); y = A4.h - M }
  }
  const draw = (s: string, x: number, size: number, o: { bold?: boolean; color?: ReturnType<typeof rgb> } = {}) => {
    page.drawText(s ?? '', { x, y, size, font: o.bold ? bold : regular, color: o.color ?? INK })
  }
  // Rozdělí text na řádky, které se vejdou do maxW (po slovech).
  const wrap = (text: string, maxW: number, size: number, f: PDFFont): string[] => {
    const out: string[] = []
    for (const rawLine of (text || '').split(/\r?\n/)) {
      if (rawLine.trim() === '') { out.push(''); continue }
      let line = ''
      for (const word of rawLine.split(/\s+/)) {
        const trial = line ? line + ' ' + word : word
        if (f.widthOfTextAtSize(trial, size) > maxW && line) { out.push(line); line = word }
        else line = trial
      }
      if (line) out.push(line)
    }
    return out
  }
  const paragraph = (text: string, size: number, o: { color?: ReturnType<typeof rgb>; gap?: number } = {}) => {
    const lh = size * 1.4
    for (const line of wrap(text, A4.w - 2 * M, size, regular)) {
      ensure(lh)
      draw(line, M, size, { color: o.color })
      y -= lh
    }
    y -= o.gap ?? 4
  }

  const contentW = A4.w - 2 * M

  // ── Hlavička firmy ──────────────────────────────────────────────────────
  const c = data.company
  draw(c.name, M, 13, { bold: true })
  y -= 16
  const companyLine = [
    c.ico ? `IČO: ${c.ico}` : null,
    c.dic ? `DIČ: ${c.dic}` : null,
    c.address || null,
    [c.email, c.phone].filter(Boolean).join(' · ') || null,
  ].filter(Boolean).join('  ·  ')
  if (companyLine) { draw(companyLine, M, 8.5, { color: MUTE }); y -= 14 }
  y -= 4
  page.drawLine({ start: { x: M, y }, end: { x: A4.w - M, y }, thickness: 1, color: LINE })
  y -= 24

  // ── Titul reportu ───────────────────────────────────────────────────────
  draw('REPORT', M, 9, { bold: true, color: ACCENT })
  y -= 16
  for (const line of wrap(data.title, contentW, 19, bold)) { ensure(24); draw(line, M, 19, { bold: true }); y -= 24 }
  y -= 2
  const sub = [data.periodLabel, `Pro: ${data.client.name}${data.client.ico ? ' (IČO ' + data.client.ico + ')' : ''}`].filter(Boolean).join('  ·  ')
  draw(sub, M, 10, { color: MUTE })
  y -= 22

  // ── Shrnutí ─────────────────────────────────────────────────────────────
  if (data.summary && data.summary.trim()) {
    paragraph(data.summary, 10.5, { color: INK, gap: 12 })
  }

  // ── Metriky (dlaždice) ──────────────────────────────────────────────────
  if (data.metrics.length) {
    const cols = 3
    const gap = 12
    const cardW = (contentW - gap * (cols - 1)) / cols
    const cardH = 62
    for (let i = 0; i < data.metrics.length; i++) {
      const col = i % cols
      if (col === 0) { ensure(cardH + gap); y -= 0 }
      const x = M + col * (cardW + gap)
      const top = y
      page.drawRectangle({ x, y: top - cardH, width: cardW, height: cardH, color: CARD, borderColor: LINE, borderWidth: 0.75 })
      const m = data.metrics[i]
      // label
      page.drawText((m.label || '').slice(0, 40), { x: x + 12, y: top - 20, size: 8, font: regular, color: MUTE })
      // value
      page.drawText((m.value || '').slice(0, 20), { x: x + 12, y: top - 40, size: 15, font: bold, color: INK })
      // note
      if (m.note) page.drawText(m.note.slice(0, 24), { x: x + 12, y: top - 54, size: 8, font: regular, color: ACCENT })
      if (col === cols - 1 || i === data.metrics.length - 1) y = top - cardH - gap
    }
    y -= 6
  }

  // ── Sekce ───────────────────────────────────────────────────────────────
  for (const s of data.sections) {
    if (s.heading && s.heading.trim()) {
      ensure(22)
      draw(s.heading, M, 12.5, { bold: true })
      y -= 18
    }
    if (s.body && s.body.trim()) {
      paragraph(s.body, 10.5, { color: INK, gap: 12 })
    } else {
      y -= 6
    }
  }

  // ── Patička (na každé stránce spodní linka + text) ──────────────────────
  const pages = doc.getPages()
  const footer = `${data.company.name}${data.sentAt ? ' · ' + fmtDate(data.sentAt) : data.createdAt ? ' · ' + fmtDate(data.createdAt) : ''}`
  pages.forEach((p: PDFPage, idx: number) => {
    p.drawLine({ start: { x: M, y: 54 }, end: { x: A4.w - M, y: 54 }, thickness: 0.5, color: LINE })
    p.drawText(footer, { x: M, y: 42, size: 7.5, font: regular, color: MUTE })
    const pageNo = `${idx + 1}/${pages.length}`
    p.drawText(pageNo, { x: A4.w - M - regular.widthOfTextAtSize(pageNo, 7.5), y: 42, size: 7.5, font: regular, color: MUTE })
  })

  return await doc.save()
}
