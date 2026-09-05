---
tags: [domena, hr, nabor]
updated: 2026-09-05
---

# 👥 HR a nábor

## HR hub — `src/app/(dashboard)/hr/`
Podstránky: `employees`, `attendance`, `contracts`, `documents`, `leave`, `onboarding`, `payroll`, `recruitment`, `reviews`, `shifts`, `training`, `analytics`.
- Server actions: `src/app/(dashboard)/hr/actions.ts`.
- Dokumenty/CV/smlouvy → [[Storage — Vercel Blob]] (`hr-documents` bucket). Download routes `/api/hr/{candidates/[id]/cv, contracts/[id]/download, documents/[id]/download}` — scoped `tenant_id`, `blobResponse`.
- **Payroll payslip** (`hr/payroll/payroll-client.tsx` `payslip()`) — vzor „tisk dokumentu": `window.open` + inline HTML + `window.print()`. (De-facto konvence pro tisk v repu, alternativa k PDF libu.)

## Náborový web — `src/app/(public)/jobs/`
Veřejný web na doméně **`jobs.globaalelevate.com`**:
- `jobs/page.tsx` — seznam otevřených pozic.
- `jobs/[id]/page.tsx` — detail pozice + veřejná přihláška (upload CV přes server action, `bodySizeLimit: 10mb`).
- Scope: `jobs/scope.ts` (`getCareersTenant`, `EMPLOYMENT_TYPES`).
- Middleware **rewrite** `jobs.*/<path>` → `/jobs/<path>`; `/` redirect na `/dashboard` je na tomto hostu potlačen.

Souvisí: [[Storage — Vercel Blob]] · [[Deploy a prostředí]] · [[Architektura]]
