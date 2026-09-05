---
tags: [provoz, demo, test]
updated: 2026-09-05
---

# 🧪 Demo data (klientský portál)

Testovací data pro [[Klientský portál]] — vytvořeno 2026-09-05 pro ověření portálu vč. [[Faktury|PDF faktur]].

## Přihlášení
- Portál: **klient.globaalelevate.com**, účet **`test@test.com`** (role `external`, existující).
- Heslo: uživatelovo (nebylo měněno). Kdyby chybělo → reset přes better-auth (ne přes SQL).

## Co bylo vytvořeno
### Hlavní DB (`restless-sound-29076324`, tenant `e0a625e9-…` Global Elevate)
- **crm_clients**: „Demo Klient s.r.o.", IČO `12345678`, DIČ `CZ12345678` → `client_id = 45194ee2-f539-4b0d-b624-5af05a7e5b3a`.
- **portal_access**: `test@test.com` (`34db2b7c-…`) napojen na tento `client_id` (dřív null).
- **deliverables** ×3 (2 submitted, 1 approved), **business_contracts** ×2 (client, active), **events** ×1 (confirmed, 2026-10-15), **portal_messages** ×1.
- Dokumenty ZÁMĚRNĚ nevytvořeny (vyžadují reálný soubor v [[Storage — Vercel Blob|Blobu]]; nechtěl jsem do test loginu vystavit reálné firemní soubory).

### Účto DB (`purple-star-75414719`)
- **contact**: „Demo Klient s.r.o." IČO `12345678` (párování na klienta přes IČO/název).
- **document** ×2 `faktura_vydana` (status `koncept` — portál filtruje jen `stornovany`, projde):
  - `DEMO-2026-001` (#56) — 52 000 Kč, **neuhrazená**, splatnost 2026-09-15, 2 položky.
  - `DEMO-2026-002` (#57) — 25 000 Kč, **uhrazená** (invoice_payment), 1 položka.
- Bez DPH — dodavatel `accounting_unit` #1 (Globaal Elevate Production s.r.o., IČO 24972070) je **neplátce** (`is_vat_payer=0`).

> [!warning] Znečištění účetních KPI
> Demo faktury se počítají do tržeb/pohledávek na interním dashboardu (čte účto). Proto označeny `DEMO-…`. Po testu smazat.

## 🧹 Úklid (smazání demo dat)
Účto (`purple-star-75414719`):
```sql
DELETE FROM invoice_payment WHERE document_id IN (56,57);
DELETE FROM document_line   WHERE document_id IN (56,57);
DELETE FROM document         WHERE id IN (56,57);
DELETE FROM contact          WHERE ico='12345678' AND name='Demo Klient s.r.o.';
```
Hlavní DB (`restless-sound-29076324`):
```sql
UPDATE portal_access SET client_id=NULL, display_name='test' WHERE user_id='34db2b7c-ce9a-4843-8306-a394dfdb9304';
DELETE FROM deliverables       WHERE client_id='45194ee2-f539-4b0d-b624-5af05a7e5b3a';
DELETE FROM business_contracts WHERE client_id='45194ee2-f539-4b0d-b624-5af05a7e5b3a';
DELETE FROM events             WHERE client_id='45194ee2-f539-4b0d-b624-5af05a7e5b3a';
DELETE FROM portal_messages    WHERE tenant_id='e0a625e9-c015-475e-8526-d3a8ac7f652d' AND user_id='34db2b7c-ce9a-4843-8306-a394dfdb9304' AND subject='Dotaz k harmonogramu';
DELETE FROM crm_clients        WHERE id='45194ee2-f539-4b0d-b624-5af05a7e5b3a';
```

Souvisí: [[Klientský portál]] · [[Faktury]] · [[Účto integrace]] · [[Deník změn]]
