---
tags: [integrace, storage, blob]
updated: 2026-09-05
---

# 📦 Storage — Vercel Blob

Soubory (dokumenty, HR smlouvy/CV, přílohy) se ukládají do **Vercel Blob** (private access). Dřív Supabase Storage — migrace dokončena **2026-09-05** (viz [[Deník změn]]).

## Konfigurace
- Store: **`globaal-documents`** (Vercel Blob, region **FRA1 / Frankfurt**, private) — GDPR.
- Připojen k projektu `globaalelevate` (Production + Preview).
- Wrapper: [`src/lib/storage/blob.ts`](../globaalelevateCRM/src/lib/storage/blob.ts) — `putObject`, `removeObjects`, `blobResponse` (stream private blobu jako Response).
- Klientský upload (přímo browser→Blob) přes [`/api/blob/documents`](../globaalelevateCRM/src/app/api/blob/documents/route.ts) (`handleUpload` token endpoint).

> [!bug] KLÍČOVÝ POZNATEK — prefix env proměnných
> Store byl ve Vercelu připojen s prefixem env proměnných **malými písmeny** (`blob_READ_WRITE_TOKEN`), ale `@vercel/blob` SDK čte jen **`BLOB_READ_WRITE_TOKEN`** (velkými). Runtime hlásil *„No blob credentials found"* a kopie storage padala.
>
> **Řešení (commit `314b0b7`):** helper `blobToken()` = `BLOB_READ_WRITE_TOKEN || blob_READ_WRITE_TOKEN`, předán explicitně do `put`/`del`/`get` i `handleUpload`. Odolné vůči oběma prefixům.

## Vzor stahování (dvě vrstvy)
1. **Server action** (např. `portalDocUrl` v `(portal)/portal/actions.ts`) — re-check scope + ownership → vrátí relativní URL (bez tokenu).
2. **Route handler** (`/api/.../download`) — znovu ověří session + scope → `blobResponse(storage_path)`.
- Interní download routes odmítají roli `external` (má vlastní client-scoped `/api/portal/...`) → zavřen cross-client únik dokumentů. Viz [[Autentizace a role]].

## Data migrace
- 20/20 souborů (19 documents + 1 hr_document) zkopírováno **pod stejnou cestou** (bez přemapování DB — `blobResponse` čte podle uložené `storage_path`).
- Supabase Storage ponechán jako **záloha** (nemazáno).
- `@supabase/*` balíky odstraněny z `package.json`, ale `SUPABASE_SERVICE_ROLE_KEY` **zůstává** v env (potřebný pro `createAdminClient` auth lookup + [[Mail a šifrování]] dokud není `MAIL_ENCRYPTION_KEY`).

## Kosmetika k dořešení (nehoří)
- Volitelně přepojit store s defaultním prefixem `BLOB_` a pak zrevokovat starý token. Kód funguje tak jako tak.

Souvisí: [[Deník změn]] · [[Deploy a prostředí]] · [[Autentizace a role]]
