---
tags: [domena, nabor, jobs, verejny-web, seo]
updated: 2026-09-09
---

# 💼 Náborový web — jobs.globaalelevate.com

Veřejný kariérní web. Doména `jobs.` → middleware rewrite na `/jobs`. Světlý & čistý design, amber akcent. Od 2026-09-09 **nábor celé Globaal Elevate Production** (produkce/eventy, marketing, web, obchod, provoz), ne jen event joby.

## Struktura `src/app/(public)/jobs/`
- `layout.tsx` — header (logo, KARIÉRA, Volné pozice, ThemeToggle) + footer (GDPR).
- `page.tsx` — landing: hero (celofiremní), **Kde hledáme** (6 oblastí/týmů), **Otevřené pozice** (`PositionsList` s filtry), **Proč k nám** (benefity), **Jak probíhá nábor** (4 kroky), **FAQ** (`<details>`), **Spontánní přihláška** (`ApplyForm` bez pozice). `generateMetadata` (title/OG).
- `positions-list.tsx` (client) — filtr pozic podle **typu** a **týmu/oddělení** (chips), grid karet. TYPE_LABELS duplikované (scope.ts je server-only).
- `[id]/page.tsx` — detail pozice + sticky `ApplyForm`. `generateMetadata` + **JobPosting JSON-LD** (Google Jobs).
- `apply-form.tsx` (client) — jméno/telefon/e-mail, (spontánní: „zájem o pozici"), zpráva, **portfolio odkaz**, **dostupnost**, CV upload, **GDPR checkbox** (required), honeypot.
- `actions.ts` `applyToJob(fd)` — bez `jobId` = spontánní (job_id null, source `web-spontaneous`); portfolio/dostupnost/zájem se **skládají do `cover_letter`** (bez migrace, vidí HR). CV → Blob `applications/<uuid>`. Insert `hr_candidates` (stage `applied`).
- `scope.ts` — `getCareersTenant()` z `company_settings` (`jobs_enabled`, `careers_intro`), `EMPLOYMENT_TYPES`.

## Data (bez nových sloupců)
- `hr_job_postings`: title, description (jen 1 text — žádné strukt. požadavky/benefity), location, employment_type, salary_range, department_id, status, published.
- `hr_candidates`: name/email/phone/cover_letter/cv_path/source/stage/**job_id (nullable → spontánní)**. Portfolio/dostupnost jsou v cover_letter.

## Zapnutí náboru
`company_settings.jobs_enabled = true` (+ `careers_intro` = hero text). Bez toho web ukáže „Nábor právě neprobíhá".

## TODO / nápady
- [ ] Strukturované požadavky/benefity per pozice (nový sloupec + admin UI) — teď jen `description`.
- [ ] Fotky z akcí (hero/galerie) — zatím jen grafika/gradienty (uživatel fotky nedodal).
- [ ] sitemap.xml pro jobs (kvůli subdoméně netriviální) + OG obrázek.
- [ ] Portfolio/dostupnost jako vlastní sloupce hr_candidates (teď v cover_letter).

Souvisí: [[HR a nábor]] · [[Storage — Vercel Blob]] · [[Deploy a prostředí]]
