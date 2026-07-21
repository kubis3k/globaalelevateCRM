# Globaal Elevate — Systémová dokumentace

Interní firemní systém (CRM + ERP) pro **Globaal Elevate Production s.r.o.** — produkce eventů a provoz klubu. Jde o jednu multi-tenant aplikaci, která pod jednou střechou spojuje obchod, finance, personalistiku, provoz klubu, produkci akcí, komunikaci, kreativní studia, interní AI a klientský portál. UI je kompletně v češtině.

> **Rozsah:** ~27 modulů, ~39 databázových migrací, veřejný kariérní web na vlastní subdoméně, PWA s push notifikacemi a plánované úlohy (cron). Tento dokument popisuje, **co systém umí** a **jak funguje**.

---

## Obsah

1. [Architektura a tech stack](#1-architektura-a-tech-stack)
2. [Multi-tenancy a přihlášení](#2-multi-tenancy-a-přihlášení)
3. [Role a oprávnění](#3-role-a-oprávnění)
4. [Databáze a bezpečnost dat (RLS)](#4-databáze-a-bezpečnost-dat-rls)
5. [Moduly](#5-moduly)
   - [5.1 Přehled a řízení](#51-přehled-a-řízení) — Dashboard, Cíle, Reporty
   - [5.2 Obchod a CRM](#52-obchod-a-crm) — CRM, Projekty, Nabídky
   - [5.3 Finance](#53-finance) — Finance, Faktury, Výdaje, Obch. smlouvy, Dodavatelé
   - [5.4 HR a lidé](#54-hr-a-lidé) — HR, Směny, Mzdy CZ, Můj portál, Tým, Kalendář, Osobní sektor
   - [5.5 Eventy a provoz](#55-eventy-a-provoz) — Akce, Provoz (SOP/checklisty)
   - [5.6 Komunikace](#56-komunikace) — Pošta, Sociální sítě
   - [5.7 Globaal AI](#57-globaal-ai)
   - [5.8 Kreativní studia](#58-kreativní-studia) — 3D Studio, Animace, Vizualizátor
   - [5.9 Dokumenty](#59-dokumenty)
   - [5.10 Klientský portál](#510-klientský-portál) — Portál, Správa portálu
6. [Veřejný kariérní web](#6-veřejný-kariérní-web)
7. [Notifikace a PWA](#7-notifikace-a-pwa)
8. [Automatizace (cron)](#8-automatizace-cron)
9. [Nasazení a proměnné prostředí](#9-nasazení-a-proměnné-prostředí)
10. [Vývojářské konvence](#10-vývojářské-konvence)

---

## 1. Architektura a tech stack

| Vrstva | Technologie |
|---|---|
| Framework | **Next.js 16.2.6** (App Router), **React 19.2.4**, dev i build na **Turbopack** |
| Backend | **Supabase** — Postgres + Auth + Storage |
| Přístup k DB | `@supabase/ssr` + `@supabase/supabase-js` |
| Styling | **Tailwind v4**, `tw-animate-css`, komponenty stylu shadcn, `lucide-react` ikony, `@base-ui/react` |
| Grafy | `recharts` |
| 3D / média | `three` (3D studio, vizualizér), `esm-potrace-wasm` (vektorizace) |
| E-mail | `imapflow` (IMAP) + `nodemailer` (SMTP) + `mailparser` |
| Notifikace | `web-push` (VAPID) |
| AI | `@anthropic-ai/sdk` (model `claude-opus-4-8`) |
| Deploy | **Vercel** (auto-deploy z `main`), cron přes Supabase pg_cron |

**Struktura routování** (App Router, route groups):

- `(auth)` — přihlášení
- `(dashboard)` — hlavní interní aplikace (všechny moduly, chráněno přihlášením)
- `(portal)` — klientský portál pro externí uživatele
- `(public)` — veřejný kariérní web (`/jobs`)
- `api` — AI streaming, ISDOC export faktur, cron endpoint

UI je v češtině (`<html lang="cs">`, font Inter). Výchozí je světlý režim s přepínačem světlý/tmavý, který se ukládá do `localStorage`.

---

## 2. Multi-tenancy a přihlášení

Systém je připravený jako **multi-tenant** (více organizací v jedné databázi), i když provozně běží pro jednu firmu.

**Datový model tenancy:**
- `tenants` — organizace
- `profiles` — 1:1 s `auth.users`, vytvářeno automaticky triggerem `handle_new_user`
- `tenant_users` — vazba uživatel ↔ tenant, nese `role`, `custom_role_id` (unikát na dvojici tenant+uživatel)

**Přihlášení:** username-based. Uživatelské jméno se interně mapuje na `${username}@globaalelevate.com` a přihlašuje přes Supabase `signInWithPassword`. Odhlášení přes `/auth/signout`.

**Auth brána (middleware `src/middleware.ts`):** běží na všech routách kromě statiky.
- Nepřihlášený uživatel na neveřejné routě → redirect na `/login`.
- Přihlášený na `/login` → redirect na `/dashboard`.
- Veřejné routy: `/login`, `/auth`, `/jobs`.
- **Subdoménový rewrite:** host začínající `jobs.` se přepíše na `/jobs/*` (kariérní web na vlastní doméně).

**Resoluce tenantu (`src/lib/supabase/tenant.ts`, `requireTenant()`):** získá přihlášeného uživatele a přes **service-role klienta** dohledá `tenant_id`, `role` a `custom_role_id` — tím se obchází rekurze v RLS. Vrací kontext `{ supabase (admin), user, tenantId, role, customRoleId, allowedModules }`.

**Tři Supabase klienti (`src/lib/supabase/`):**
- `server.ts` — SSR (cookies, anon key)
- `client.ts` — browser (anon key)
- `admin.ts` — service-role (obchází RLS; používá se pro serverové čtení/zápis)

---

## 3. Role a oprávnění

**Systémové role** (`app_role`): `admin`, `manager`, `employee`, `external`.
- `external` (klient) je z dashboardu automaticky přesměrován do **klientského portálu** `/portal`.

**Přístup k modulům** (`src/lib/permissions.ts`, `getAllowedModules`):
- `admin` → všechny moduly
- uživatel s přiřazenou **custom rolí** → přesně moduly té role
- bez custom role → všechny moduly (zpětně kompatibilní default)

**Custom role** (`custom_roles`, per-tenant): pojmenovaná role s barvou a JSONB polem `modules` (seznam module-id). Výchozí seedované role „Marketing" a „Účetnictví". Spravuje se v modulu **Tým**. Jediný zdroj pravdy o modulech je `src/lib/modules.ts` (pole `MODULES`).

**Guard na úrovni stránky:** `requireModuleAccess(moduleId)` — bez přístupu přesměruje na první povolený modul, jinak na `/no-access`.

**Jemnější práva** (helpery): `canManageHr`, `canManageSharedMail`, `canManageDocuments`, `canManageMilestones`, `canManageSocial`, `canManageEvents` — všechny odpovídají `admin || manager`. Řadový zaměstnanec dostává jen self-service pohledy.

---

## 4. Databáze a bezpečnost dat (RLS)

Migrace v `supabase/migrations/` (~39 souborů `20240530`–`20240638`), psané idempotentně. Hlavní skupiny tabulek:

| Oblast | Tabulky |
|---|---|
| Jádro / tenancy | `tenants`, `profiles`, `tenant_users`, `custom_roles` |
| Finance | `invoices`, `transactions`, `transaction_categories`, `company_settings`, `expense_claims` |
| CRM | `crm_clients`, `crm_contacts`, `crm_deals`, `crm_activities` |
| HR | `hr_employees`, `hr_departments`, `hr_contracts`, `hr_leave_requests`, `hr_attendance`, `hr_shifts`, `hr_shift_assignments`, `hr_documents`, `hr_job_postings`, `hr_candidates`, `hr_checklists*`, `hr_trainings`, `hr_reviews`, `hr_audit` |
| Mzdy | `payroll_config`, `payroll_runs`, `payroll_items` |
| Projekty / výkazy | `projects`, `project_tasks`, `time_entries`, `quotes`, `quote_items`, `catalog_items` |
| Kalendář / cíle | `calendar_events`, `milestones`, `personal_*` |
| Eventy | `events`, `event_lineup`, `event_timeline`, `vip_reservations`, `guest_list` |
| Provoz / dodavatelé | `sop_articles`, `ops_checklist*`, `suppliers`, `purchase_orders*`, `business_contracts` |
| Portál | `portal_access`, `portal_event_access`, `portal_document_access`, `portal_messages` |
| Komunikace / AI | `mail_accounts`, `social_accounts`, `social_metrics`, `social_posts`, `ai_conversations`, `ai_messages`, `documents` |
| Notifikace | `push_subscriptions`, `notification_prefs` |

**RLS vzor (napříč moduly konzistentní):** RLS je zapnuté na všech tabulkách. Čtení je izolované per-tenant přes SECURITY DEFINER funkci `get_user_tenant_ids()` (obchází rekurzi). Typicky dvě politiky na tabulku:
- `"tenant read <table>"` — `FOR SELECT USING (tenant_id IN (SELECT get_user_tenant_ids()))`
- `"admin manage <table>"` — `FOR ALL` pro roli `admin` daného tenantu

Zápisy z aplikace jdou převážně přes **service-role klienta** — RLS je zde jako obranná vrstva navíc (defense-in-depth). Portál a některé cross-tenant scénáře scopují data ručně v aplikačním kódu.

---

## 5. Moduly

### 5.1 Přehled a řízení

#### Dashboard (`/dashboard`)
Souhrnný přehled organizace na jedné (read-only) stránce:
- KPI karty: zůstatek cash-flow (příjmy − výdaje), počet nezaplacených faktur, aktivní zaměstnanci, nadcházející úkoly.
- Finanční řada: tržby (uhrazené vydané faktury), pohledávky, závazky.
- Sekce **Firemní cíle** (průměrný pokrok podle období) — jen s přístupem k modulu `milestones`.
- Sekce **Aktivní projekty** (dlaždice s poměrem hotových úkolů) — jen s přístupem k `projects`.
- Graf cash-flow (kumulativní zůstatek) + posledních 6 transakcí.

Data: `milestones`, `tenant_users`, `invoices`, `calendar_events`, `transactions`, `projects`, `project_tasks`.

#### Cíle (`/milestones`)
Firemní cíle podle období (týden / měsíc / rok): název, popis, cílové datum, pokrok 0–100 %, archivace. Editace jen pro admin/manažera, ostatní jen čtou.
Akce: `saveMilestone`, `setMilestoneProgress`, `setMilestoneArchived`, `deleteMilestone`. Data: `milestones`.

#### Reporty (`/reports`)
Analytický přehled za aktuální rok, obsah podmíněný přístupem k modulům:
- Provozní KPI (akce, sledující na sítích, aktivní zaměstnanci).
- Finanční KPI (tržby, náklady, zisk, hodnota přijatých nabídek) + graf cash-flow.
- Grafy: náklady dle kategorie, tržby dle klienta (top klienti), obchodní funnel (dle fáze).
- Provozní dlaždice: fakturovatelné hodiny a jejich hodnota, otevřené/přijaté nabídky.

Read-only agregace. Data: `invoices`, `transactions`, `transaction_categories`, `crm_deals`, `quotes`, `time_entries`, `events`, `social_accounts`, `hr_employees`.

---

### 5.2 Obchod a CRM

#### Akvizice (`/prospects`)
Akviziční vrstva **před CRM** — evidence prospektů (scrapnutých/nekvalifikovaných leadů), kadence follow-upů a metriky.
- **Prospekti** — název, IČO/DIČ (doplnění přes ARES), region, zdroj (mapy/firmy/rejstřík/doporučení/IG/osobní/jiné), kontakty, **skóre 0–15** (badge dle pásma) a **signály** (JSONB — např. pagespeed, pixel, mobil, rok webu).
- **Kadence follow-upů** — zalogování doteku (kanál + výsledek) automaticky posouvá `next_touch_at`: 1.→+3 dny, 2.→+4, 3.→+7; po 4. bez odpovědi → `nurture` (+90 dní). Odpověď/schůzka kadenci ukončí, odmítnutí → `dead`.
- **Dnes kontaktovat** — sekce s prospekty po splatnosti doteku, řazená dle skóre.
- **Konverze** — prospekt → CRM klient + příležitost (`crm_deals`) ve fázi lead; idempotentní.
- **Import API** — `POST /api/prospects/import` (auth `Authorization: Bearer <PROSPECTS_IMPORT_SECRET>`, bez klíče 503), dávka až 500 záznamů, dedup dle IČO nebo název+region, vrací `{ inserted, skipped }`.
- **Cron** — denní akviziční digest (prospekti k doteku → push ownerovi/managementu) + hlídač odeslaných nabídek bez reakce 7+ dní.

Akce: `createProspect`/`updateProspect`/`deleteProspect`, `logTouch`, `convertProspectToClient`, `setProspectStatus`, `assignProspectOwner`.
Data: `crm_prospects`, `crm_prospect_touches`, `crm_clients`, `crm_deals`. Metriky akvizice jsou i v modulu **Reporty** (výtěžnost zdrojů, konverze, leaderboard).

#### CRM (`/crm`)
- **Přehled** s KPI (klienti, otevřené příležitosti, hodnota pipeline, tržby za rok).
- **Klienti** (`/crm/clients`, detail `/crm/clients/[id]`): kontaktní údaje, vlastník, kontaktní osoby, aktivity (poznámka/hovor/schůzka/e-mail/úkol s termínem), související faktury. Aktivita může být označena **„Zobrazit klientovi v portálu"** (`visible_to_client`) — pak se objeví klientovi v `/portal/messages` (Komunikace). Feed aktivit navíc sloučí i zprávy, které klient poslal přes portál (`portal_messages`) — staff vidí celou komunikaci na jednom místě.
- **Příležitosti** (`/crm/pipeline`): obchodní pipeline po fázích (lead → qualified → proposal → negotiation → won/lost).
- **ARES lookup** — doplnění názvu, DIČ a adresy podle IČO (české veřejné API `ares.gov.cz`).
- Push notifikace managementu při vytvoření CRM úkolu s termínem.

Akce: `createCrmClient`/`updateCrmClient`/`deleteCrmClient`, `createContact`/`deleteContact`, `createActivity`/`toggleActivity`/`deleteActivity`, `createDeal`/`setDealStage`/`deleteDeal`, `lookupAres`.
Data: `crm_clients`, `crm_contacts`, `crm_activities`, `crm_deals`, `invoices`.

#### Projekty (`/projects`)
- **Přehled** s KPI (aktivní/dokončené projekty, otevřené úkoly, souhrn rozpočtů).
- **Nástěnka** (`/projects/board`) a **detail** (`/projects/[id]`) — metadata (klient, vlastník, stav, priorita, termíny, rozpočet, měna), úkoly a napočtený odpracovaný čas z `time_entries`.
- Úkoly se stavem, prioritou, přiřazením a termínem; při dokončení `completed_at`. Push přiřazené osobě.

Akce: `createProject`/`updateProject`/`setProjectStatus`/`deleteProject`, `createTask`/`setTaskStatus`/`deleteTask`.
Data: `projects`, `project_tasks`, `crm_clients`, `time_entries`.

> **Výkazy (`/time`)** — evidence odpracovaného času (`time_entries`), zdroj pro fakturovatelné hodiny v Reportech a pro odpracovaný čas na detailu projektu.

#### Nabídky (`/quotes`)
- Cenové nabídky s položkami (popis, množství, cena, sazba DPH) a automatickým výpočtem mezisoučtu/DPH/celku.
- Automatické číslování `NAB-{rok}-{pořadí}`, stavy draft/sent/accepted.
- **Převod nabídky na fakturu** (`convertQuoteToInvoice`) — vytvoří vydanou fakturu (`FA-{rok}-{pořadí}`, splatnost +14 dní), propojí přes `invoice_id`, nastaví nabídku na accepted.
- **Katalog** (`/quotes/catalog`) — produkty/služby (jednotka, cena, DPH, měna), aktivní se nabízí při tvorbě.

Akce: `createQuote`/`updateQuoteStatus`/`deleteQuote`/`convertQuoteToInvoice`, `createCatalogItem`/`updateCatalogItem`/`deleteCatalogItem`.
Data: `quotes`, `quote_items`, `catalog_items`, `crm_clients`, `invoices`.

---

### 5.3 Finance

#### Finance (`/finance`)
- **Napojeno na účetní systém** (ucto.globaalelevate.com) přes read-only Postgres adaptér `src/lib/ucto.ts` (env `UCTO_DATABASE_URL`, schéma `ucetnictvi`). Účto je autoritativní zdroj finančních čísel.
- Hlavní KPI z účta: stav banky, tržby/náklady/zisk (rok), pohledávky a závazky (kniha neuhrazených faktur), DPH k odvodu (plátce) / obrat 12 m vůči limitu DPH (neplátce) + cash-flow graf z bankovních pohybů. Bez env proměnné UI zobrazí „Účetnictví není připojeno".
- Dashboard bere finanční čísla **výhradně z účta**; work data zůstávají pro provoz (cíle, projekty, tým).
- Provozní evidence (work): ruční transakce, kategorie, **import CSV výpisů** (limit 1000 řádků), vazba na faktury (`invoice_id`) — sekce pod účetním souhrnem.

Akce: `createTransaction`/`updateTransaction`/`deleteTransaction`, `createCategory`/`deleteCategory`, `importTransactions`.
Data: `transactions`, `transaction_categories`, `invoices`. Propojení faktura→transakce řeší DB trigger `sync_invoice_transaction`.

#### Faktury (`/invoices`)
- Vydané i přijaté doklady (`issued`/`received`) — odběratel/dodavatel, částka, měna, datum vystavení a splatnosti.
- Stavy: koncept, čeká na úhradu, uhrazeno, po splatnosti, stornováno.
- Odběratele lze navázat na CRM klienta.
- **Export do ISDOC 6.0.1** (české e-faktury): `GET /api/invoices/[id]/isdoc`, XML sestavuje `src/lib/isdoc.ts`. DPH se dopočítává z uložených polí, nebo z celkové částky podle nastavení plátcovství DPH firmy (`company_settings.vat_payer`, `default_vat_rate`, výchozí 21 %).
- Uhrazená faktura se přes DB trigger promítá do Financí.

Akce: `createInvoice`/`updateInvoice`/`updateInvoiceStatus`/`deleteInvoice`.
Data: `invoices`, `crm_clients`, `company_settings`.

#### Výdaje (`/expenses`)
- Evidence výdajů zaměstnanců k proplacení (datum, částka, kategorie, popis).
- Schvalovací workflow `pending` → `approved`/`rejected`. Schválení automaticky zaúčtuje výdajovou transakci do Financí.
- Schvalovat může jen admin/manažer; řadový uživatel maže jen vlastní nevyřízené.

Akce: `createExpense`, `deleteExpense`, `reviewExpense`.
Data: `expense_claims`, `transactions`.

#### Obchodní smlouvy (`/business-contracts`)
- Smlouvy (umělci, pronájmy, dodavatelé) — název, typ, protistrana, platnost, hodnota + měna, stav.
- Protistrana navázatelná na dodavatele / CRM klienta / volný text; volitelně na akci a přiložený dokument.
- Sledování expirací a **e-akceptace** protistranou (`acknowledged_at`).

Akce: `createBusinessContract`/`updateBusinessContract`/`deleteBusinessContract`/`toggleAcknowledged`.
Data: `business_contracts`, `suppliers`, `crm_clients`, `events`, `documents`.

#### Dodavatelé (`/suppliers`)
- Správa dodavatelů (umělci, security, půjčovny, nápoje…) — název, kategorie, IČO/DIČ, kontakt.
- **Nákupní objednávky** (`/suppliers/orders`) s položkami, auto-číslem `OBJ-{rok}-{pořadí}`, navázáním na akci, stavy.
- **Zaúčtování objednávky jako výdaj** do Financí (jen jednou — hlídá `transaction_id`).

Akce: `createSupplier`/…, `createPurchaseOrder`/`updatePOStatus`/`deletePurchaseOrder`/`bookPurchaseOrderExpense`.
Data: `suppliers`, `purchase_orders`, `purchase_order_items`, `transactions`, `events`.

---

### 5.4 HR a lidé

#### HR (`/hr`)
Kompletní personalistika. **Přehled** s KPI (aktivní zaměstnanci, dnes mimo, čekající žádosti, otevřené pozice) a **compliance blokem** (blížící se expirace smluv do 30 dní, končící certifikace, varování na limit **DPP 300 h/rok**). Přístup: `canManageHr` (admin/manažer) = plná správa; ostatní jen self-service. Mzdy vidí jen admin; změny platu se logují do `hr_audit`.

Podsekce: Zaměstnanci, Smlouvy, Mzdy, Dovolená, Docházka, Směny, Onboarding, Hodnocení, Školení, Dokumenty, Analýzy, Nábor.
- **Zaměstnanci** — CRUD karet (pozice, oddělení, úvazek, plat/sazba, dovolená, manažer); self-service úprava vlastních kontaktů.
- **Smlouvy** — dohody (HPP/DPP/DPČ), příloha do bucketu `hr-documents`, potvrzení zaměstnancem.
- **Dovolená** — žádost + schvalování; schválená se propíše do `calendar_events` (počet dní přes `workingDaysBetween`).
- **Docházka** — clock-in/out (`hr_attendance`).
- **Onboarding/offboarding** — šablony checklistů, přiřazení a odškrtávání.
- **Hodnocení / 1:1** — rating 1–5, silné stránky, zlepšení, next steps.
- **Školení & certifikace** — sledování `expires_on` pro compliance.
- **Dokumenty** — privátní bucket `hr-documents`.
- **Nábor** — pracovní pozice (publikované na veřejný kariérní web) + kandidáti se stage pipeline; CV z veřejné přihlášky z bucketu `applications`.
- **Analýzy** (jen management) — struktura úvazků, fluktuace, čerpaná dovolená, mzdové náklady, expirující smlouvy/certifikace.

Data: `hr_*`, `payroll_*`, `calendar_events`. Buckety: `hr-documents`, `applications`.

#### Plánování směn + docházka (workflow HR ↔ Můj portál)
Propojený cyklus manažer (`/hr/shifts`) ↔ zaměstnanec (`/muj-portal`):
1. **Manažer vytvoří směnu** (datum, čas, role, místo, počet lidí, volitelně navázání na projekt/akci).
2. **Obsazení** — manažer přiřadí (`assigned`, push zaměstnanci), nebo si zaměstnanec vezme volnou směnu (`claimOpenShift` → `confirmed`, hlídá kapacitu).
3. **Zaměstnanec potvrdí / odmítne** — `confirmed`, nebo `requestDecline(reason)` → HR schvaluje (`reviewDecline`).
4. **Po odpracování** — zaměstnanec „Byl/a jsem na směně" (`reportWorked`), manažer **ověří** (`verifyWorked`). Jen ověřené hodiny se počítají.
5. **Mzdové náklady** — manažerský kalendář ukazuje náklady měsíce (hodiny × sazba); barevná signalizace poddimenzovaných směn.

Statusy: assignment `assigned`/`confirmed`/`decline_requested`/`declined`; worked `none`/`reported`/`verified`. Push na většinu přechodů.
Data: `hr_shifts`, `hr_shift_assignments`, `hr_attendance`, `projects`.

#### Mzdy — česká logika (`src/lib/payroll-cz.ts` + `cz-holidays.ts`)
**Orientační kontrolní výpočet** čisté mzdy a nákladů zaměstnavatele (podklad pro účtárnu, ne závazný výpočet). Všechny sazby a prahy jsou **parametry** v `payroll_config` dle roku — roční aktualizace legislativy = úprava hodnot v Nastavení mezd, ne kódu.
- `computePayroll` řeší režimy: pracovní poměr (HPP/part_time/intern), **DPP** (pod prahem srážková daň 15 %, s prohlášením zálohová; nad prahem plné odvody), **DPČ**, IČO/other (bez odvodů). Zálohová daň se počítá se slevou na poplatníka a daňovým bonusem na děti.
- `cz-holidays.ts` — české státní svátky (vč. pohyblivých Velikonoc přes Computus); `workingDaysBetween` počítá pracovní dny (bez víkendů a svátků), používá dovolená i mzdy.
- `createPayrollRun` automaticky natáhne odpracované hodiny z (neodmítnutých) směn měsíce a spočítá hrubou mzdu. Uzávěrku lze zamknout/odemknout (jen admin, audit).

Výchozí hodnoty (`DEFAULT_PAYROLL_CONFIG`) orientačně pro rok 2026.

#### Můj portál (`/muj-portal`)
Self-service portál zaměstnance (uvnitř dashboardu, **není** to klientský portál):
- Statistiky: naplánované hodiny tento týden, ověřeně odpracováno tento měsíc, zůstatek dovolené, směny k potvrzení; u hodinových úvazků orientační výdělek.
- Kalendář jen s potvrzenými směnami; sekce K potvrzení, Docházka (report odpracování), Otevřené směny („Beru"), Žádost o volno.

Volá přímo HR akce (`setAssignmentStatus`, `requestDecline`, `reportWorked`, `claimOpenShift`, `requestLeave`).

#### Oddělení (`/departments`)
Chat a úkoly per oddělení (`hr_departments`). Zaměstnanec vidí své oddělení (dle `hr_employees.department_id`), management všechna.
- **Chat** — zprávy v reálném čase (polling 30 s), autor smaže vlastní, management vše; push členům oddělení.
- **Úkoly oddělení** — název, popis, termín, priorita, přiřazení (konkrétní člen / celé oddělení), odškrtávání; push přiřazenému či oddělení.
- Boční panel se členy oddělení (jméno + pozice).

Akce: `sendDepartmentMessage`/`deleteDepartmentMessage`, `createDepartmentTask`/`toggleDepartmentTask`/`deleteDepartmentTask`.
Data: `department_messages`, `department_tasks`, `hr_departments`, `hr_employees`.

#### Tým (`/team`)
Správa členů organizace a **custom rolí** (mutace jen admin):
- Přidání/odebrání člena (zakládá auth účet, profil, `tenant_users`; nelze smazat sám sebe).
- Custom role = pojmenované role s barvou a seznamem povolených modulů; přiřazení role uživateli.

Akce: `addTeamMember`/`removeTeamMember`, `createCustomRole`/`updateCustomRole`/`deleteCustomRole`, `assignCustomRole`.
Data: `tenant_users`, `custom_roles`, `profiles`.

#### Kalendář (`/calendar`)
Sdílený firemní kalendář. Události lze přiřadit osobě, systémové roli nebo custom roli (nepřiřazené jdou všem). Vytváření/mazání pro admin/manažera, push příjemcům. Schválené dovolené z HR se sem propisují.
Data: `calendar_events`, `custom_roles`, `profiles`.

#### Osobní sektor (`/personal`)
Soukromý prostor uživatele (scopováno na `user_id`): Poznámky (pin), Úkoly (termín, priorita), Cíle (progress, archivace), osobní Kalendář. Přehled slučuje osobní i přiřazené sdílené události (read-only).
Data: `personal_notes`, `personal_tasks`, `personal_events`, `personal_goals`, `calendar_events`.

---

### 5.5 Eventy a provoz

#### Akce (`/events`)
Produkční hub pro eventy. Seznam (datum, začátek, místo, kapacita, stav, rozpočet, klient) a detail (`/events/[id]`) sdružující:
- **Line-up** — umělci se sloty, honorářem (`fee`) a stavem (booked/confirmed/cancelled).
- **Run-of-show** — časový harmonogram položek.
- **VIP rezervace** — boxy, host, kontakt, počet osob, min. útrata, záloha, stav (vč. `seated`).
- **Guest list** — hosté s počtem osob a označením příchodu.
- **Směny** — HR směny na datum akce s obsazením personálu.

Správa jen pro admin/manažera. Akce: `saveEvent`/`deleteEvent`, `saveLineup`/`deleteLineup`, `saveTimeline`/`deleteTimeline`, `saveReservation`/`setReservationStatus`/`deleteReservation`, `saveGuest`/`setGuestArrived`/`deleteGuest`.
Data: `events`, `event_lineup`, `event_timeline`, `vip_reservations`, `guest_list`, `hr_shifts`.

> ⚠️ Honoráře umělců (`event_lineup.fee`) jsou interní data — nesmí se dostat na veřejný web ani do klientského portálu.

#### Provoz (`/ops`)
- **SOP wiki** (`/ops`) — standardní postupy (název, kategorie, tělo, `updated_by/at`).
- **Checklisty** (`/ops/checklists`) — šablony (otevření/zavření klubu, nouzové postupy, barové recepty) a jejich „běhy" (runs) s odškrtáváním položek.

Akce: `createArticle`/…, `saveChecklist`/`deleteChecklist`, `startRun`/`toggleRunItem`/`deleteRun`.
Data: `sop_articles`, `ops_checklists`, `ops_checklist_items`, `ops_checklist_runs`, `ops_checklist_run_items`.

---

### 5.6 Komunikace

#### Pošta (`/mail`)
Firemní e-mailový klient přes IMAP/SMTP (výchozí předvyplněno pro Zoho Mail EU).
- **Sdílené** schránky (firemní, připojí jen admin/manažer) i **osobní** (per uživatel).
- Procházení složek, výpis zpráv, čtení (HTML/text + přílohy), odesílání a odpovědi, označení přečteno, přesun do koše.
- Přílohu lze uložit přímo do modulu **Dokumenty** (kategorie e-mail, limit 25 MB).
- Odeslané se best-effort ukládají do Sent (IMAP APPEND).
- Hesla schránek šifrována AES-256-GCM (klíč odvozen z `SUPABASE_SERVICE_ROLE_KEY`); `secret_enc` nikdy neopustí server.

Akce: `connectAccount`, `deleteAccount`, `listMailFolders`, `listMailMessages`, `getMailMessage`, `sendMessage`, `saveAttachmentToDocuments`, `markRead`, `deleteMessage`.
Data: `mail_accounts`, bucket `documents`.

#### Sociální sítě (`/social`)
- Evidence profilů (instagram, facebook, tiktok, youtube, x, linkedin, threads, other) + ruční zadávání počtů (followers/following/posts) se snapshoty → graf růstu (365 dní).
- **Plánovač příspěvků** — text + volitelné médium z Dokumentů, výběr platforem, stav draft/scheduled/published/failed, naplánovaný čas. Splatné příspěvky spouští push managementu (auto-posting přes API zatím nezapojen).
- Správa jen pro admin/manažera.

Akce: `saveAccount`, `recordCounts`, `deleteAccount`, `savePost`, `setPostStatus`, `deletePost`.
Data: `social_accounts`, `social_metrics`, `social_posts`, `documents`.

---

### 5.7 Globaal AI

Interní AI asistent (`/ai`) firmy, odpovídá česky.
- Streamovaná konverzace s historií; konverzace osobní i sdílené; přejmenování, sdílení, mazání. Nadpis se auto-nastaví z první zprávy.
- **Nástroje:** `web_search` (server tool se zdroji) + firemní datové nástroje omezené **modulovými právy uživatele** — AI čte jen to, co by uživatel viděl v UI.
- Firemní tools (gated dle modulů): `search_clients`, `list_crm_activities`, `get_finance_data`, `get_hr_data` (jen management), `get_calendar`, `search_documents`, `get_company_goals`, `get_personal_goals`, `list_projects`, `get_time_entries`, `list_quotes`, `list_events`.

**Model `claude-opus-4-8`** (`src/lib/ai/anthropic.ts`), streaming endpoint `POST /api/ai/chat` (Node runtime, tool-loop max 8 kol, `max_tokens 8000`, adaptivní thinking, prompt caching). Env: `ANTHROPIC_API_KEY` (bez klíče vrací 503).
Data: `ai_conversations`, `ai_messages` + tabulky čtené nástroji (tenant-scoped, přes service-role).

---

### 5.8 Kreativní studia

#### 3D Studio (`/logo3d`)
Převede 2D logo/grafiku (raster i SVG) na otáčecí 3D model a exportuje `.glb` + PNG.
- Rastr se vektorizuje na SVG přes **potrace ve WebAssembly** (`esm-potrace-wasm`, načítaný runtime z `/public/vendor/esm-potrace-wasm/index.js`).
- 3D engine (**three.js**): extrudovaná geometrie (hloubka, bevel), materiálové presety, prostředí, odrazová podlaha, bloom post-processing. Export přes `GLTFExporter` a `toDataURL`.

Ukládá do bucketu `documents`.

#### Animace (`/animations`)
Skládání vrstev (grafika / 3D logo z Dokumentů) na animované pozadí a **export videa** (`video/webm` přes MediaRecorder + `canvas.captureStream`). Parametry: formát, dvě barvy pozadí, FPS. Uložení do Dokumentů nebo stažení.
Data: `documents`.

#### Vizualizátor (`/visualizer`)
3D model klubu (three.js) s promítáním návrhů grafik a animací na **LED panely u stage** — textury z dokumentů (obrázky i video přes `VideoTexture`).
Data: `documents`.

---

### 5.9 Dokumenty (`/documents`)
Firemní knihovna souborů.
- Kategorie: Smlouvy, Faktury, Nabídky, Reporty, E-mailové přílohy, Ostatní. Limit **25 MB**, podepsané URL (60 s).
- Dva způsoby uploadu: klasický server action + **direct-to-storage** přes signed upload URL (obchází ~4,5 MB limit server actions → velká videa).
- Mazat smí nahrávající vlastník; jinak admin/manažer. Bucket je privátní, cesta tenant-scoped.

Akce: `uploadDocument`, `getDocumentUrl`, `createUploadUrl`, `finalizeUpload`, `deleteDocument`. Sdílený write-path `src/lib/documents-store.ts` používá i Pošta.
Data: `documents`, bucket **`documents`** (privátní).

---

### 5.10 Klientský portál

Portál v2 (kompletní přestavba) — **auto-share podle `client_id`**: cokoliv navázané na klienta (akce, dokumenty, smlouvy, dodávky) se v jeho portálu zobrazí automaticky, bez ručního zaškrtávání. Admin může výjimečně jednotlivou položku skrýt (`portal_visibility_overrides`).

#### Portál (`/portal`)
Samostatná route group, jen pro **externí uživatele** (role `external`; admin má náhled).
- **Přehled** — KPI (nadcházející akce, nezaplacené faktury, počet dokumentů), karta nejbližší akce, seznam akcí.
- **Detail akce** — line-up, run-of-show; viditelné, pokud `events.client_id` odpovídá klientovi.
- **Faktury** — vydané faktury z účetního systému, spárované na klienta dle IČO/názvu (`getUctoInvoicesForClient`).
- **Smlouvy** (`/portal/contracts`) — smlouvy s `client_id`; klient sám klikne **„Souhlasím"** (`acceptContract` — zapíše čas + IP, žádné staff potvrzování za klienta).
- **Dodávky** (`/portal/deliverables`) — odevzdaná práce (soubor/odkaz) ke schválení; klient **Schválí** nebo **Žádá úpravu** s komentářem (`decideDeliverable`) — notifikuje interního vlastníka.
- **Dokumenty** — dokumenty s `client_id`, stažení signed URL (120 s).
- **Zprávy** — klient napíše venue, vidí historii a stav.

Data: `portal_access`, `portal_visibility_overrides`, `portal_messages`, `deliverables`, `events.client_id`, `documents.client_id`, `business_contracts` (+ `acknowledged_ip`), `crm_clients`.

#### Přihlášení klienta — pozvánka odkazem
Admin zadá jen e-mail a jméno klienta (`sendPortalInvite`) → vygeneruje se token (`portal_invites`, platnost 7 dní) a **odkaz na pozvánku** (`/invite/[token]`), který se zobrazí v dialogu s tlačítkem Kopírovat — **žádný e-mail se automaticky přes systém neodesílá** (Zoho SMTP blokuje odchozí pošta z Vercelu jako podezřelou — `554 5.7.8 Access Restricted`); admin odkaz zkopíruje a pošle klientovi libovolným kanálem (e-mail, WhatsApp…) sám. Klient odkaz otevře a sám si nastaví heslo (`acceptInvite` — vytvoří `auth.users`, `profiles`, `tenant_users` role `external`, `portal_access`).

Přihlašovací formulář (`/login`) rozlišuje vstup: obsahuje-li `@`, použije se jako reálný e-mail (klienti); jinak se doplní interní doména jako u staffu.

#### Správa portálu (`/portal-admin`)
Administrace (**jen admin**):
- **Pozvánky** — čekající (tlačítko „Odkaz" prodlouží platnost a znovu ukáže odkaz ke zkopírování / „Zrušit"), využité.
- Přiřazení klienta k účtu (`setPortalClient`).
- **„Co vidí"** — přehled auto-sdílených akcí a dokumentů daného klienta s přepínačem skrýt/zobrazit (`togglePortalVisibility`) — výjimka z auto-share, ne allowlist.
- Inbox zpráv z portálu (vyřízeno/nové, mazání), mazání portálového účtu.

Akce: `sendPortalInvite`/`resendPortalInvite`/`revokePortalInvite`, `deletePortalUser`, `setPortalClient`, `togglePortalVisibility`, `resolvePortalMessage`, `deletePortalMessage`.

#### Dodávky — interní strana
Sekce „Dodávky" v detailu **Projektu** i **Akce** (`src/components/deliverables/deliverable-dialog.tsx`, `src/lib/deliverables/actions.ts`): staff nahraje soubor nebo přiloží odkaz; `client_id` se odvodí z projektu/akce (musí mít klienta v CRM, jinak nelze odeslat). Příloha automaticky dostane stejný `client_id`, aby ji portál směl vydat ke stažení.

---

## 6. Veřejný kariérní web

**Adresa:** `jobs.globaalelevate.com` (subdoménový rewrite v middleware → `/jobs`). Bez přihlášení.
- **Který tenant se zobrazí:** `getCareersTenant()` čte `company_settings` s `jobs_enabled = true` (jméno firmy, IČO, `careers_intro`).
- **Co veřejnost vidí:** hero + seznam pozic z `hr_job_postings` (jen `status='open' AND published=true`), detail pozice na `/jobs/[id]`.
- **Přihláška:** `applyToJob(formData)` — honeypot, validace jméno + (email nebo telefon), ověření že pozice je stále otevřená, vloží `hr_candidates` (`stage='applied'`, `source='web'`). CV volitelně (max **8 MB**) do privátního bucketu **`applications`** (`{tenantId}/{uuid}.ext`), cesta v `cv_path`.
- **GDPR:** formulář uvádí právní základ **předsmluvní jednání (čl. 6 odst. 1 písm. b GDPR)** + odkaz na zásady; footer nese identifikaci správce (název + IČO) a odkazy na Ochranu osobních údajů a Podmínky užití.

> **Poznámka k zásadám ochrany osobních údajů:** CV se ukládá do Supabase Storage (bucket `applications`), ne e-mailem. Tuto skutečnost (účel, právní základ, zpracovatel Supabase, doba uložení, práva uchazeče) je vhodné doplnit do zásad na hlavním webu `globaalelevate.com` — ten se needituje z tohoto repozitáře.

---

## 7. Notifikace a PWA

**PWA:** manifest (`src/app/manifest.ts`) — „Globaal Elevate Production", `display: standalone`, `start_url: /dashboard`, ikony 192/512/maskable, `lang: cs`. Service worker (`public/sw.js`) obsluhuje `push` a `notificationclick` (bez offline cache), servírován s `no-cache`.

**Web Push (VAPID)** přes `web-push`:
- Odesílání na všechna zařízení uživatele (`push_subscriptions`), respektuje per-user přepínače (`notification_prefs`); mrtvé subscriptiony (404/410) se mažou.
- Typy: `calendar`, `email`, `crm`, `hr`, `projects`, `social`.
- Auto-prompt na povolení hned po startu; subscription se re-mapuje na aktuálně přihlášeného uživatele (oprava po re-loginu / sdíleném zařízení). iOS vyžaduje PWA na ploše.

Klíčové soubory: `src/lib/push/webpush.ts` (`sendPushToUsers`), `src/lib/push/actions.ts`, komponenty `src/components/pwa/*`.

---

## 8. Automatizace (cron)

Endpoint `src/app/api/cron/route.ts` (Node runtime, `maxDuration = 60`), volaný přes Supabase **pg_cron** (`pg_net` HTTP POST) s hlavičkou `Authorization: Bearer <CRON_SECRET>`. Idempotentní (guardy přes `*_reminded_at`/`notified_at`). Vykonává:
- **Poll pošty** (IMAP) — nové e-maily → push.
- **CRM připomínky** termínů úkolů.
- **Sociální příspěvky** — splatné naplánované → push managementu.
- **HR připomínky** — končící smlouvy/dohody (do 14 dní), certifikace (do 30 dní).
- **Kalendář** — nadcházející události → push.

---

## 9. Nasazení a proměnné prostředí

**Build (`next.config.ts`):**
- `typescript.ignoreBuildErrors: true` — build neselže na TS chybách (proto ověřovat zvlášť `npx tsc --noEmit`).
- `experimental.serverActions.bodySizeLimit: '10mb'` (upload CV).
- `serverExternalPackages` — Node-only mail/push knihovny se nebundlují.
- `turbopack.resolveAlias` — stub `fs`/`path` pro browser bundle (kvůli potrace).
- redirect `/` → `/dashboard` (mimo host `jobs.globaalelevate.com`), header `no-cache` pro `/sw.js`.

**Deploy:** push do `main` (GitHub `kubis3k/globaalelevateCRM`) → automatický deploy na Vercelu. Migrace se aplikují přes Supabase (projekt `vqyjrsxnmlwshhazaqjs`).

**Desktopová aplikace (PC/Mac):** složka `desktop/` — Electron shell nad work.globaalelevate.com (stejné funkce, sdílená DB, realtime; klíče zůstávají na serveru). Design a zdůvodnění: [DESKTOP-DESIGN.md](DESKTOP-DESIGN.md). Instalátory se stahují přímo z webu (`/downloads/GlobaalElevateWork-Setup.exe`, `…-arm64.dmg`, `…-x64.dmg`) — nabízí je zavíratelný banner „Aplikace pro počítač" v dashboardu (jen v prohlížeči na počítači). Windows build lokálně (`cd desktop && npm run dist`), macOS přes GitHub Actions („Desktop installers (mac)"). Funkce se aktualizují automaticky s každým deployem — reinstalace není potřeba.

**Proměnné prostředí (jen názvy):**

| Proměnná | Účel |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase klient |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role (server, obchází RLS; též klíč pro šifrování mailu) |
| `CRON_SECRET` | Autorizace cron endpointu |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Web Push |
| `ANTHROPIC_API_KEY` | Globaal AI |
| `PROSPECTS_IMPORT_SECRET` | Bearer token pro import prospektů (`/api/prospects/import`) |
| `UCTO_DATABASE_URL` | Read-only Postgres connection string účetního systému (schéma `ucetnictvi`) |

> 🔒 Tajné klíče nikdy nepatří do repozitáře — jen do env proměnných na Vercelu/Supabase.

---

## 10. Vývojářské konvence

- **Registrace modulu:** přidat do `MODULES` v `src/lib/modules.ts` + do `MODULE_ICONS`/nav v `src/components/collapsible-sidebar.tsx` (sdíleno s mobilním `app-shell.tsx`).
- **Vzor server action:** `'use server'` → získání kontextu (auth → admin klient → `tenant_id`) → zápis přes service-role → `revalidatePath`.
- **RLS na tabulce:** dvě politiky — „tenant read" (SELECT) + „admin manage" (ALL); migrace idempotentní.
- **Typy DB:** `database.types.ts = any` (bez typegenu); build ignoruje TS chyby → po změnách ověřovat `npx tsc --noEmit` a `npm run build`.
- **Worktrees** nemají vlastní `node_modules` — build se spouští z hlavního pracovního adresáře.
- **AGENTS.md:** tato verze Next.js má breaking changes oproti běžné znalosti — před psaním kódu číst příslušný návod v `node_modules/next/dist/docs/`.

---

*Dokumentace popisuje stav systému k datu vygenerování. Při větších změnách modulů ji aktualizuj spolu s kódem.*
