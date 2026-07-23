# ADR-0003: Oddělení šifrovacího klíče e-mailových schránek

- **Status:** Přijato
- **Datum:** 2026-07-22

## Kontext

Hesla e-mailových schránek (`mail_accounts.secret_enc`) se šifrují AES-256-GCM klíčem odvozeným ze `SUPABASE_SERVICE_ROLE_KEY`. Problém: **rotace service-role klíče** (běžná bezpečnostní operace, doporučeno po expozici) by znehodnotila všechna uložená hesla — nešly by dešifrovat.

## Rozhodnutí

Zavést dedikovaný secret **`MAIL_ENCRYPTION_KEY`** jako primární materiál pro odvození klíče. Kvůli existujícím datům implementovat **dvojklíčové dešifrování**:

- **Šifrování**: vždy primárním klíčem (`MAIL_ENCRYPTION_KEY`, fallback service-role, dokud není nastaven).
- **Dešifrování**: zkusí primární klíč; při selhání (data zašifrovaná starým klíčem) zkusí **legacy** klíč odvozený ze service-role. Legacy větev je aktivní jen když je `MAIL_ENCRYPTION_KEY` nastaven.

## Migrační postup (bez zásahu do dat)

1. Vygenerovat silný náhodný `MAIL_ENCRYPTION_KEY` a nastavit ho v env (Vercel).
2. Redeploy. Od té chvíle:
   - stará data se čtou přes legacy fallback,
   - jakékoli uložení schránky je přešifruje primárním klíčem.
3. (Volitelně, plná rotace) po přešifrování všech účtů lze legacy fallback odstranit; do té doby **neměnit** service-role klíč, jinak nepřešifrovaná data přestanou jít číst.

Žádná datová migrace ani downtime; při nenastaveném `MAIL_ENCRYPTION_KEY` je chování 100% zpětně kompatibilní (primární = dnešní derivace).

## Trade-offy

- Ponechání legacy fallbacku je dočasný kompromis: umožňuje bezvýpadkovou migraci za cenu toho, že plná bezpečnost rotace service-role nastane až po přešifrování všech schránek. Přijatelné pro malý počet účtů.
