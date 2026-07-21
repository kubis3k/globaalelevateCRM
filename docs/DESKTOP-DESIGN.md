# Globaal Elevate Work — Desktop (PC) aplikace: Software design

## 1. Cíl a požadavky

Instalovatelná aplikace pro Windows se **stejnými funkcemi jako work.globaalelevate.com**, **sdílenou databází** a **realtime daty**. Uživatel dostane ikonu na ploše / v nabídce Start, vlastní okno bez prohlížečové lišty a trvale přihlášenou session.

## 2. Zvolená architektura: Electron shell nad produkční aplikací

```
┌─────────────────────────────────────────────┐
│  Desktop app (Electron, Windows NSIS .exe)  │
│  ┌───────────────────────────────────────┐  │
│  │ BrowserWindow (Chromium)              │  │
│  │   → https://work.globaalelevate.com   │  │
│  └───────────────────────────────────────┘  │
│  main proces: okno, session, navigační      │
│  politika, offline obrazovka, stahování     │
└──────────────────────┬──────────────────────┘
                       │ HTTPS
        ┌──────────────▼──────────────┐
        │  Vercel (Next.js 16, SSR)   │
        │  work.globaalelevate.com    │
        └──────┬───────────────┬──────┘
               │               │
        ┌──────▼──────┐ ┌──────▼───────┐
        │  Supabase   │ │  Neon (účto) │
        │  (work DB)  │ │  read-only   │
        └─────────────┘ └──────────────┘
```

**Proč shell nad nasazenou aplikací (a ne lokální běh):**

| Kritérium | Shell (zvoleno) | Lokální Next.js server v appce |
|---|---|---|
| Stejné funkce jako web | ✅ identické — je to táž aplikace | ⚠️ riziko driftu verzí |
| Sdílená DB + realtime | ✅ automaticky (stejný server) | ✅, ale… |
| Tajné klíče (service-role, účto DB) | ✅ zůstávají jen na Vercelu | ❌ musely by být na každém PC |
| Aktualizace funkcí | ✅ okamžitě s každým deployem, bez reinstalace | ❌ nový instalátor při každé změně |
| Velikost/údržba | 1 malý shell, mění se ~nikdy | celý runtime + build pipeline |

Bezpečnostní argument je rozhodující: aplikace je multi-tenant se service-role přístupem k DB — tyto klíče nesmí opustit server. Shell je proto jediná architektura, která splňuje „vše stejné + spojená DB" bez kompromitace klíčů.

**Proč Electron (a ne Tauri):** stejný stack jako existující desktop appka účetnictví (`ucetnictvi/app`, Electron 31 + electron-builder/NSIS) — jednotná údržba, žádný Rust toolchain, ověřený build na tomto stroji.

## 3. Komponenty

`desktop/` v repu (samostatný npm projekt, mimo Next.js build):

- **`main.js`** — celý main proces:
  - jediné okno 1440×900 (min. 1100×700), `autoHideMenuBar` (menu se ukáže klávesou Alt),
  - **single-instance lock** — druhé spuštění jen fokusne existující okno,
  - **perzistence okna** (pozice/velikost/maximalizace → `window-state.json` v userData),
  - **perzistentní session** (cookies v userData → přihlášení přežije restart PC),
  - **navigační politika**: uvnitř okna smí běžet jen `work.globaalelevate.com`; vše ostatní (účto, globaalelevate.com, mailto:) se otevře v systémovém prohlížeči,
  - **stahování**: podepsané URL ze Supabase Storage (dokumenty, smlouvy, dodávky) se stáhnou nativně přes Electron download manager (dialog Uložit jako),
  - **offline obrazovka**: při výpadku sítě lokální `offline.html` s tlačítkem „Zkusit znovu",
  - standardní zkratky: Ctrl+R reload, F11 fullscreen, Ctrl+/− zoom, F12 DevTools.
- **`offline.html`** — lokální stránka pro stav bez připojení (logo + retry).
- **`build/icon.png`** — ikona (2000×2000 z `public/logo.png`; electron-builder z ní generuje `.ico`).
- **`package.json`** — Electron 31, electron-builder 24, target **NSIS** (instalátor s výběrem složky, zástupce na ploše i ve Start menu), `appId: com.globaalelevate.work`.

## 4. Bezpečnost shellu

- `contextIsolation: true`, `nodeIntegration: false`, žádný preload s API — webový obsah nemá přístup k Node/OS.
- Whitelist navigace (viz výše) — cizí web se v okně aplikace nikdy neotevře.
- Shell neobsahuje žádné klíče ani konfiguraci; autentizace je výhradně Supabase session cookie stejná jako v prohlížeči.

## 5. Aktualizace

- **Funkce aplikace**: aktualizují se automaticky s každým deployem na Vercel — desktop shell vždy zobrazuje aktuální verzi, reinstalace není nikdy potřeba.
- **Shell samotný**: mění se výjimečně (nová Electron verze, změna politik). V1 bez auto-updateru — nová verze = nový instalátor (bez code-signing certifikátu by auto-update stejně narážel na SmartScreen). Volitelný upgrade later: `electron-updater` + GitHub Releases.

## 6. Známé limity

- **Web-push notifikace na pozadí** (VAPID) v Electronu nefungují — `PushManager` v shellu není napojen na FCM. Aplikace degraduje tiše (in-app toasty fungují). Push notifikace nadále chodí do PWA/prohlížeče na mobilu; případné nativní desktop notifikace = budoucí rozšíření (polling přes preload).
- Bez code-signingu ukáže Windows při první instalaci SmartScreen upozornění („Přesto spustit").
- Vyžaduje internet (aplikace je server-rendered) — offline režim řeší jen zdvořilá obrazovka s retry, ne offline práce s daty.

## 7. Build & distribuce

```bash
cd desktop
npm install
npm run dist        # → desktop/dist/Globaal Elevate Work Setup <verze>.exe
```

Instalátor se distribuuje ručně (sdílený disk / odkaz). `desktop/node_modules` a `desktop/dist` jsou mimo git.
