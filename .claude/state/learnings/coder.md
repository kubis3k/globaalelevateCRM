# Poznatky — coder
(append-only log ověřených poznatků z předchozích běhů; max 40 řádků, scribe prořezává nejstarší a nejméně užitečné)
- [migrace] apply-migration.mjs posílá celý soubor jedním client.query() → implicitní transakce,
  žádné CREATE INDEX CONCURRENTLY. PG nemá CREATE TRIGGER IF NOT EXISTS → vždy DROP TRIGGER IF EXISTS napřed.
- [down migrace] když up rozšíří CHECK enum, down MUSÍ nejdřív UPDATE přemapovat porušující řádky,
  jinak zúžení CHECKu spadne "violated by some row". Append-only tabulky: DISABLE TRIGGER jen podmíněně
  (v reverzním pořadí ho už mohla smazat pozdější down).
- [append-only vs cascade] BEFORE DELETE trigger blokující mazání musí povolit DELETE, když už
  neexistuje rodič (crm_prospects NEBO tenants) — jinak cascade z tenanta padne (pořadí RI mezi child
  tabulkami není definované).
