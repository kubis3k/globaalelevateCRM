---
tags: [integrace, mail, bezpecnost]
updated: 2026-09-05
---

# ✉️ Mail a šifrování

Modul **Mail** — IMAP/SMTP schránka přímo v CRM.

## Komponenty
- `src/lib/mail/smtp.ts` (nodemailer), `src/lib/mail/imap.ts` (imapflow), `src/lib/mail/crypto.ts` (šifrování hesel schránek).
- Actions: `src/app/(dashboard)/mail/actions.ts`.
- Polling nových mailů přes **cron** (`src/app/api/cron/route.ts`, Node runtime, `maxDuration:60`) — volá **Supabase pg_cron přes pg_net http_post** s `Authorization: Bearer <CRON_SECRET>`. Poll IMAP + CRM upomínky (web push).

## crypto.ts — šifrování hesel schránek 🔐 (ADR 0003)
- AES-256-GCM, formát `base64(iv(12)|tag(16)|ciphertext)`, klíč přes `scryptSync`.
- **Primární klíč = `MAIL_ENCRYPTION_KEY`.**
- **Legacy fallback = klíč odvozený ze `SUPABASE_SERVICE_ROLE_KEY`** (data zašifrovaná dřív, než `MAIL_ENCRYPTION_KEY` existoval).
- Dešifrování zkusí primární → legacy; při re-save se přešifruje pod primární (self-migrace).

> [!warning] Nemazat SUPABASE_SERVICE_ROLE_KEY
> `SUPABASE_SERVICE_ROLE_KEY` je pořád aktivní závislost — kvůli legacy mail crypto (a `createAdminClient` auth/tenant lookup). Nemazat z Vercel env, dokud není nastaven `MAIL_ENCRYPTION_KEY` a stará data přešifrována. Viz [[Otevřené úkoly]].

Souvisí: [[Deploy a prostředí]] · [[Storage — Vercel Blob]] · [[Otevřené úkoly]]
