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

## SEO / Google
- `src/app/sitemap.ts` — sitemap náborového webu (landing + detaily pozic, absolutní `https://jobs.globaalelevate.com` URL, z published pozic). `src/app/robots.ts` — allow all + odkaz na sitemap. Slouží pro **Google Search Console** / Google Jobs.
- **Landing `page.tsx`** (commit ac65614): brand-rich `generateMetadata` (`metadataBase`, `alternates.canonical`, `keywords` s názvem firmy, OG+twitter) + **Organization JSON-LD** (název, legalName, `taxID`/`vatID` IČO 24972070, sídlo Dlouhá 715/38 Praha 1, `foundingDate` 2026-04-20, `sameAs` → globaalelevate.com) + **WebSite JSON-LD**. Cíl: brand search / knowledge panel spojí web s firmou.
- **Detail `[id]/page.tsx`** (commit ac65614): **JobPosting JSON-LD** kompletní pro Google Jobs — `validThrough` (POVINNÉ, rolling +45 dní, pozice nemají expiry sloupec), `hiringOrganization.logo` (`${BASE}/logo.png`), `identifier`, `url`, `baseSalary` (`parseSalary()` z volného textu — jen když pozná jednotku HOUR/MONTH, provize/% přeskočí), remote → `jobLocationType: TELECOMMUTE` + `applicantLocationRequirements`. `generateMetadata` má canonical/metadataBase/OG/twitter.
- **Stav indexu:** web zatím NENÍ v Google indexu (brand search „globaal elevate production" ukazuje jen rejstříkové weby Kurzy.cz/Peníze.cz a `globaalelevate.com/podminky-uziti`). Strukt. data + metadata jsou nutná, ale **NEstačí** — rozhodující je ověření v GSC + submit sitemapy (na uživateli).
- **GSC setup (na uživateli, potřebuje Google účet + DNS):** přidat property `jobs.globaalelevate.com` (nebo doménovou `globaalelevate.com`), ověřit DNS TXT, submitnout `https://jobs.globaalelevate.com/sitemap.xml`, Rich Results test na detailu pozice, případně požádat o indexaci. Bez GSC ověření Google web neproindexuje spolehlivě.
- **Pozn. logo v JSON-LD** je na `jobs.` subdoméně; ideálně logo i na hlavní `globaalelevate.com` (brand entita sídlí tam). Hlavní web ale není v tomto repu.

## TODO / nápady
- [ ] Strukturované požadavky/benefity per pozice (nový sloupec + admin UI) — teď jen `description`.
- [ ] Fotky z akcí (hero/galerie) — zatím jen grafika/gradienty (uživatel fotky nedodal).
- [ ] OG obrázek (dedikovaný) pro sdílení pozic.
- [ ] Portfolio/dostupnost jako vlastní sloupce hr_candidates (teď v cover_letter).

Souvisí: [[HR a nábor]] · [[Storage — Vercel Blob]] · [[Deploy a prostředí]]
