import { contextBridge, ipcRenderer } from 'electron'

console.log('Preload script starting...')

const api = {
  window: {
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close')
  },
  dialog: {
    openFile: (options: any) => ipcRenderer.invoke('dialog:openFile', options),
    saveFile: (options: any) => ipcRenderer.invoke('dialog:saveFile', options)
  },
  database: {
    execute: (sql: string, params?: any[]) => ipcRenderer.invoke('db:execute', sql, params),
    query: (sql: string, params?: any[]) => ipcRenderer.invoke('db:query', sql, params),
    queryOne: (sql: string, params?: any[]) => ipcRenderer.invoke('db:queryOne', sql, params)
  },
  account: {
    getList: () => ipcRenderer.invoke('account:getList'),
    create: (data: any) => ipcRenderer.invoke('account:create', data),
    open: (id: number) => ipcRenderer.invoke('account:open', id),
    delete: (id: number) => ipcRenderer.invoke('account:delete', id),
    backup: (id: number, path: string) => ipcRenderer.invoke('account:backup', id, path),
    restore: (path: string) => ipcRenderer.invoke('account:restore', path)
  },
  user: {
    login: (username: string, password: string) => ipcRenderer.invoke('user:login', username, password),
    logout: () => ipcRenderer.invoke('user:logout'),
    changePassword: (oldPassword: string, newPassword: string) => ipcRenderer.invoke('user:changePassword', oldPassword, newPassword)
  }
}

try {
  contextBridge.exposeInMainWorld('api', api)
  console.log('API exposed to main world successfully')
} catch (error) {
  console.error('Failed to expose API:', error)
}
