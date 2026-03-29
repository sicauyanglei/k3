import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { join } from 'path'
import { setupDatabase, saveDatabases } from './services/database'
import { setupIpc } from './ipc'

let mainWindow: BrowserWindow | null = null

async function createWindow(): Promise<void> {
  await setupDatabase()
  setupIpc()
  
  const isDev = !app.isPackaged
  
  const preloadPath = join(__dirname, 'preload.js')
  
  console.log('Preload path:', preloadPath)
  console.log('__dirname:', __dirname)
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    webPreferences: {
      preload: preloadPath,
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    }
  })

  mainWindow.webContents.openDevTools()

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.webContents.setWindowOpenHandler(details => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow?.webContents.executeJavaScript('console.log("Page loaded, checking API:", typeof window.api)')
  })

  if (isDev) {
    const ports = [3000, 3001, 3002, 3003, 3004, 3005]
    let loaded = false
    for (const port of ports) {
      try {
        await mainWindow.loadURL(`http://localhost:${port}`)
        console.log(`Loaded app on port ${port}`)
        loaded = true
        break
      } catch (e) {
        console.log(`Port ${port} not available, trying next...`)
      }
    }
    if (!loaded) {
      mainWindow.loadURL('http://localhost:3000')
    }
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  saveDatabases()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  saveDatabases()
})

ipcMain.on('window-minimize', () => {
  mainWindow?.minimize()
})

ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})

ipcMain.on('window-close', () => {
  mainWindow?.close()
})

ipcMain.handle('dialog:openFile', async (_, options) => {
  const result = await dialog.showOpenDialog(mainWindow!, options)
  return result
})

ipcMain.handle('dialog:saveFile', async (_, options) => {
  const result = await dialog.showSaveDialog(mainWindow!, options)
  return result
})
