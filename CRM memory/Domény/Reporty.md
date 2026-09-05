---
tags: [domena, reporty, portal, pdf]
updated: 2026-09-05
status: v1 (generovaný PDF); přílohy TODO
---

# 📊 Reporty (klientské)

Reporty, které interní tým **posílá klientům** (marketing / weby / akce). Klient si je v [[Klientský portál|portálu]] stáhne jako **PDF**. Obecné — ne jen eventy.

> [!info] Rozdíl od interní analytiky
> `/reports` (modul „Reporty") = interní analytika (grafy, KPI). **Klientské reporty** = samostatná pod-sekce `/reports/klienti` (dědí přístup modulu `reports`). Nová tabulka, nový koncept.

## Datový model (migrace `20240654_client_reports.sql`, aplikováno na Neon main)
- `client_reports` — hlavička: tenant_id, client_id, title, period_label, summary, **status** (`draft`|`sent`), created_by, created_at, sent_at.
- `client_report_metrics` — dlaždice s čísly (label, value, note, position), FK cascade.
- `client_report_sections` — textové bloky (heading, body, position), FK cascade.
- `client_report_attachments` — přílohy ve Vercel Blob (name, storage_path, mime_type, file_size). **UI zatím TODO.**
- Drizzle: `clientReports`, `clientReportMetrics`, `clientReportSections`, `clientReportAttachments` v `schema.ts`. pg-shim je najde přes toCamel.

## Interní strana (tvorba)
- `/reports` → tlačítko **„Klientské reporty"** (PageHeader children) → `/reports/klienti`.
- `(dashboard)/reports/klienti/page.tsx` — přehled reportů + formulář „Nový report" (výběr klienta + název → `createReportFromForm` → redirect do editoru).
- `(dashboard)/reports/klienti/[id]/page.tsx` + `report-editor.tsx` (client) — editace: hlavička (název/období/shrnutí), dynamické **metriky** a **sekce**, tlačítka Uložit / Náhled PDF / Odeslat klientovi (↔ Vrátit do konceptu) / Smazat.
- `actions.ts` — `createClientReport`, `createReportFromForm`, `saveClientReport` (smaž+vlož metriky/sekce), `sendClientReport`/`unsendClientReport` (status+sent_at), `deleteClientReport`. Auth: `requireTenant` + odmítá `external` a bez modulu `reports`.

## Portál (klient)
- Nav položka **Reporty** (`portal-nav.tsx`, ikona BarChart3).
- `(portal)/portal/reports/page.tsx` — jen **odeslané** (`status='sent'`) reporty klienta, tlačítko PDF.
- Prázdný stav rozlišuje „účet nepropojen" vs „nic tu není".

## PDF
- `src/lib/reports.ts` `loadReportForPdf(supabase, tenantId, id)` — report + klient + firma (`company_settings`) + metriky + sekce.
- `src/lib/pdf/report.ts` `renderReportPdf()` — pdf-lib + Roboto (base64), A4: hlavička firmy, titul + období + „Pro: klient", shrnutí, dlaždice metrik, sekce (wrap textu + stránkování), patička s číslováním.
- Routy: `/api/reports/[id]/pdf` (interní náhled, inline; odmítá external) · `/api/portal/reports/[id]/pdf` (portál, attachment; ownership `client_id==clientId` && `status='sent'`).

## TODO
- [ ] Přílohy (upload souborů k reportu + stažení v portálu) — tabulka je, UI ne. Viz [[Otevřené úkoly]].
- [ ] Volitelně logo firmy do PDF hlavičky.

Souvisí: [[Klientský portál]] · [[Faktury]] (stejný PDF vzor) · [[Databáze a multi-tenant]]
