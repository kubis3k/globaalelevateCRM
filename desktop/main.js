// Globaal Elevate Work — desktopový shell nad work.globaalelevate.com.
// Architektura a zdůvodnění: docs/DESKTOP-DESIGN.md. Shell neobsahuje žádné
// klíče — autentizace je výhradně Supabase session cookie jako v prohlížeči.
const { app, BrowserWindow, Menu, shell, session } = require('electron')
const path = require('node:path')
const fs = require('node:fs')

const APP_URL = 'https://work.globaalelevate.com'
const APP_ORIGIN = new URL(APP_URL).origin
const STATE_FILE = () => path.join(app.getPath('userData'), 'window-state.json')

let mainWindow = null

// ── Jediná instance: druhé spuštění jen fokusne existující okno ──────────
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })
  app.whenReady().then(createWindow)
}

// ── Perzistence velikosti/pozice okna ─────────────────────────────────────
function loadWindowState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE(), 'utf8')) } catch { return {} }
}
function saveWindowState() {
  if (!mainWindow) return
  try {
    const state = { ...mainWindow.getNormalBounds(), maximized: mainWindow.isMaximized() }
    fs.writeFileSync(STATE_FILE(), JSON.stringify(state))
  } catch { /* best-effort */ }
}

// Podepsané URL ze Supabase Storage (dokumenty, smlouvy, dodávky) → nativní
// stažení; jakýkoli jiný externí cíl (účto, mailto, weby) → systémový prohlížeč.
function isSupabaseDownload(url) {
  try {
    const u = new URL(url)
    return u.hostname.endsWith('.supabase.co') && u.pathname.includes('/storage/v1/object/sign/')
  } catch { return false }
}

function createWindow() {
  const state = loadWindowState()
  mainWindow = new BrowserWindow({
    width: state.width || 1440,
    height: state.height || 900,
    x: state.x,
    y: state.y,
    minWidth: 1100,
    minHeight: 700,
    autoHideMenuBar: true,
    backgroundColor: '#ffffff',
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
    },
  })
  if (state.maximized) mainWindow.maximize()

  // Minimální menu kvůli klávesovým zkratkám; lišta je skrytá (zobrazí Alt).
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: 'Aplikace',
      submenu: [
        { label: 'Obnovit', accelerator: 'CmdOrCtrl+R', click: () => mainWindow?.webContents.reload() },
        { label: 'Domů', accelerator: 'Alt+Home', click: () => mainWindow?.loadURL(APP_URL) },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Celá obrazovka' },
        { role: 'zoomIn', label: 'Přiblížit' },
        { role: 'zoomOut', label: 'Oddálit' },
        { role: 'resetZoom', label: 'Původní velikost' },
        { type: 'separator' },
        { role: 'toggleDevTools', label: 'Vývojářské nástroje' },
        { role: 'quit', label: 'Ukončit' },
      ],
    },
  ]))

  // Navigační politika: v okně smí běžet jen work.globaalelevate.com
  // (+ lokální offline.html); vše ostatní jde do systémového prohlížeče.
  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (url.startsWith('file://')) return
    if (new URL(url).origin !== APP_ORIGIN) {
      e.preventDefault()
      shell.openExternal(url)
    }
  })
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (isSupabaseDownload(url)) {
      mainWindow.webContents.downloadURL(url) // Electron ukáže dialog Uložit jako
    } else {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  // Výpadek sítě → lokální offline obrazovka s tlačítkem Zkusit znovu.
  mainWindow.webContents.on('did-fail-load', (e, code, desc, validatedURL, isMainFrame) => {
    if (isMainFrame && code !== -3 /* ERR_ABORTED (běžné při redirectech) */) {
      mainWindow.loadFile(path.join(__dirname, 'offline.html'))
    }
  })

  mainWindow.on('close', saveWindowState)
  mainWindow.on('closed', () => { mainWindow = null })

  mainWindow.loadURL(APP_URL)
}

app.on('window-all-closed', () => app.quit())
