declare global {
  interface Window {
    api: {
      window: {
        minimize: () => void
        maximize: () => void
        close: () => void
      }
      dialog: {
        openFile: (options: any) => Promise<{ canceled: boolean; filePaths: string[] }>
        saveFile: (options: any) => Promise<{ canceled: boolean; filePath?: string }>
      }
      database: {
        execute: (sql: string, params?: any[]) => Promise<{ changes: number; lastInsertRowid: number }>
        query: (sql: string, params?: any[]) => Promise<any[]>
        queryOne: (sql: string, params?: any[]) => Promise<any>
      }
      account: {
        getList: () => Promise<any[]>
        create: (data: any) => Promise<{ id: number; name: string; dbPath: string }>
        open: (id: number) => Promise<{ success: boolean; account: any }>
        delete: (id: number) => Promise<{ success: boolean }>
        backup: (id: number, path: string) => Promise<{ success: boolean }>
        restore: (path: string) => Promise<{ success: boolean; dbPath: string }>
      }
      user: {
        login: (username: string, password: string) => Promise<{ id: number; username: string; realName: string; role: string }>
        logout: () => Promise<{ success: boolean }>
        changePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean }>
      }
    }
  }
}

export {}
