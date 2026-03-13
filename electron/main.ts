import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, is } from '@electron-toolkit/utils'
import { initDb } from '../database/connection'
import { runMigrations } from '../database/migrate'
import { registerAllIpcHandlers } from './ipc'

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    show: true,
    autoHideMenuBar: true,
    title: 'Acompanhamento Regional — Matriz Educação',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  win.on('ready-to-show', () => win.show())

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.matrizeducacao.regional')

  try {
    // Inicializa banco (async porque sql.js usa WASM)
    await initDb()
    runMigrations()
    registerAllIpcHandlers()
  } catch (err) {
    console.error('[DB] Falha ao inicializar banco de dados:', err)
    // Cria janela mesmo assim para mostrar o erro ao usuário
  }

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
