const { app, BrowserWindow, ipcMain, Menu, Tray, dialog, shell, nativeImage } = require('electron')
const path = require('path')
const { autoUpdater } = require('electron-updater')
const Store = require('electron-store').default
const Database = require('better-sqlite3')

// ── Step 6: persistent storage ──────────────────────────────
const store = new Store()
const db = new Database(path.join(app.getPath('userData'), 'notes.db'))

db.exec(`
  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL DEFAULT 'Untitled',
    content TEXT DEFAULT '',
    updated_at TEXT DEFAULT (datetime('now'))
  )
`)

// ── Step 4: BrowserWindow ────────────────────────────────────
let mainWindow
let tray

function createWindow() {
  const bounds = store.get('windowBounds', { width: 1100, height: 700 })

  mainWindow = new BrowserWindow({
    ...bounds,
    minWidth: 700,
    minHeight: 500,
    icon: path.join(__dirname, '../../resources/icon.png'),
    show: false, // avoid white flash
    titleBarStyle: 'hiddenInset', // custom title bar
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true, // Step 10: security
      nodeIntegration: false,
      sandbox: true
    }
  })

  // remember window size/position
  mainWindow.on('resize', () => store.set('windowBounds', mainWindow.getBounds()))
  mainWindow.on('move', () => store.set('windowBounds', mainWindow.getBounds()))
  mainWindow.once('ready-to-show', () => mainWindow.show())

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173') // Step 11: Vite dev server
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

// ── Step 5: native menu ──────────────────────────────────────
function buildMenu() {
  const isMac = process.platform === 'darwin'
  const template = [
    ...(isMac
      ? [
        {
          label: app.getName(),
          submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'quit' }]
        }
      ]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'New Note',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow.webContents.send('menu:new-note')
        },
        {
          label: 'Export Note',
          accelerator: 'CmdOrCtrl+E',
          click: () => mainWindow.webContents.send('menu:export')
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

// ── Step 5: system tray ──────────────────────────────────────
function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, '../../resources/tray-icon.png'))
  tray = new Tray(icon)
  tray.setToolTip('ElectronNotes')
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: 'Open', click: () => mainWindow.show() },
      {
        label: 'New Note',
        click: () => {
          mainWindow.show()
          mainWindow.webContents.send('menu:new-note')
        }
      },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() }
    ])
  )
  tray.on('click', () => (mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show()))
}

// ── Step 3 + Step 7: IPC handlers ────────────────────────────
function registerIPC() {
  // Notes CRUD
  ipcMain.handle('notes:getAll', () =>
    db.prepare('SELECT * FROM notes ORDER BY updated_at DESC').all()
  )
  ipcMain.handle('notes:create', () =>
    db.prepare("INSERT INTO notes (title, content) VALUES ('Untitled', '')").run()
  )
  ipcMain.handle('notes:update', (_, { id, title, content }) =>
    db
      .prepare("UPDATE notes SET title=?, content=?, updated_at=datetime('now') WHERE id=?")
      .run(title, content, id)
  )
  ipcMain.handle('notes:delete', (_, id) => db.prepare('DELETE FROM notes WHERE id=?').run(id))

  // Step 7: file export
  ipcMain.handle('dialog:exportNote', async (_, { title, content }) => {
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      defaultPath: `${title}.txt`,
      filters: [{ name: 'Text Files', extensions: ['txt', 'md'] }]
    })
    if (!canceled) {
      require('fs').writeFileSync(filePath, content)
      shell.showItemInFolder(filePath)
    }
    return !canceled
  })

  // Step 7: import from file
  ipcMain.handle('dialog:importNote', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [{ name: 'Text Files', extensions: ['txt', 'md'] }]
    })
    if (!canceled) {
      const content = require('fs').readFileSync(filePaths[0], 'utf-8')
      const title = path.basename(filePaths[0], path.extname(filePaths[0]))
      return { title, content }
    }
    return null
  })

  // Step 10: validate IPC path input
  ipcMain.handle('shell:openExternal', async (_, url) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      await shell.openExternal(url)
    }
  })
}

// ── Step 2: app lifecycle ─────────────────────────────────────
app.whenReady().then(() => {
  createWindow()
  buildMenu()
  createTray()
  registerIPC()

  // Step 9: auto-updates (deferred so app starts fast)
  setTimeout(() => autoUpdater.checkForUpdatesAndNotify(), 3000)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// Step 10: block unexpected navigation
app.on('web-contents-created', (_, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
  contents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://') && !url.startsWith('http://localhost')) {
      e.preventDefault()
    }
  })
})

// Step 9: auto-update handler
autoUpdater.on('update-downloaded', () => {
  dialog
    .showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: 'A new version is ready. Restart to apply it?',
      buttons: ['Restart', 'Later']
    })
    .then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall()
    })
})
