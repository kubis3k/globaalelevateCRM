# Poznatky — critic
(append-only log ověřených poznatků z předchozích běhů; max 40 řádků, scribe prořezává nejstarší a nejméně užitečné)
- [migrace+FK] FK na číselník nad sloupcem, do kterého app píše volný text, rozbije první zápis i na
  prázdné tabulce — FK patří do samostatné migrace až po přepnutí formuláře/importu na kódy.
- [skóring] normalizace skóre na "dosažitelné maximum ze známých signálů" odměňuje neznalost
  (lead jen s kontaktem → 100 %). Absolutní body + per-source prahy je správně.
- [config-driven trigger] jakýkoli cast z jsonb configu uvnitř BEFORE triggeru = riziko, že garbage
  config zablokuje VEŠKERÝ zápis do tabulky. Číst čísla defenzivně (jsonb_typeof guard + fallback).
