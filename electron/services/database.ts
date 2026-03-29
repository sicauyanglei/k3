import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'

let SQL: any = null
let systemDb: SqlJsDatabase | null = null
let accountDb: SqlJsDatabase | null = null
let systemDbPath: string = ''
let accountDbPath: string = ''
let dataPathCache: string = ''

function tryCreateDir(dir: string): boolean {
  try {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    const testFile = join(dir, '.write_test')
    writeFileSync(testFile, 'test')
    existsSync(testFile) || writeFileSync(testFile, 'test')
    const fs = require('fs')
    fs.unlinkSync(testFile)
    return true
  } catch (e) {
    console.error('Cannot write to directory:', dir, e)
    return false
  }
}

export function getUserDataPath(): string {
  try {
    const userDataPath = app.getPath('userData')
    if (tryCreateDir(userDataPath)) {
      return userDataPath
    }
  } catch (e) {
    console.error('Failed to get userData path:', e)
  }
  
  const fallbackPath = join(process.cwd(), 'app-data')
  tryCreateDir(fallbackPath)
  return fallbackPath
}

export function getDataPath(): string {
  if (dataPathCache) {
    return dataPathCache
  }
  
  const basePath = getUserDataPath()
  const dataDir = join(basePath, 'data')
  
  if (tryCreateDir(dataDir)) {
    dataPathCache = dataDir
    return dataDir
  }
  
  const fallbackDataPath = join(process.cwd(), 'data')
  tryCreateDir(fallbackDataPath)
  dataPathCache = fallbackDataPath
  return fallbackDataPath
}

export async function setupDatabase(): Promise<void> {
  try {
    const wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm')
    SQL = await initSqlJs({
      locateFile: (file: string) => {
        if (file.endsWith('.wasm')) {
          return wasmPath
        }
        return file
      }
    })
    console.log('sql.js initialized with custom WASM path')
  } catch (e) {
    console.error('Failed to init sql.js with custom path:', e)
    try {
      SQL = await initSqlJs()
      console.log('sql.js initialized with default path')
    } catch (e2) {
      console.error('Failed to init sql.js completely:', e2)
      throw e2
    }
  }
  
  const dataPath = getDataPath()
  systemDbPath = join(dataPath, 'system.db')
  
  console.log('Database path:', systemDbPath)
  console.log('Data directory:', dataPath)
  
  if (existsSync(systemDbPath)) {
    try {
      const buffer = readFileSync(systemDbPath)
      systemDb = new SQL.Database(buffer)
      console.log('Loaded existing database')
    } catch (e) {
      console.error('Failed to load database, creating new one:', e)
      systemDb = new SQL.Database()
    }
  } else {
    systemDb = new SQL.Database()
    console.log('Created new database')
  }
  
  initSystemTables()
  initDefaultUser()
  saveSystemDb()
  
  console.log('Database setup completed')
}

function saveSystemDb(): void {
  if (systemDb && systemDbPath) {
    try {
      const data = systemDb.export()
      const buffer = Buffer.from(data)
      writeFileSync(systemDbPath, buffer)
      console.log('System database saved to:', systemDbPath)
    } catch (e) {
      console.error('Failed to save system db:', e)
      try {
        const fallbackPath = join(process.cwd(), 'system.db')
        const data = systemDb.export()
        const buffer = Buffer.from(data)
        writeFileSync(fallbackPath, buffer)
        systemDbPath = fallbackPath
        console.log('System database saved to fallback path:', fallbackPath)
      } catch (e2) {
        console.error('Failed to save to fallback path:', e2)
      }
    }
  }
}

export function saveAccountDb(): void {
  if (accountDb && accountDbPath) {
    try {
      const data = accountDb.export()
      const buffer = Buffer.from(data)
      writeFileSync(accountDbPath, buffer)
    } catch (e) {
      console.error('Failed to save account db:', e)
    }
  }
}

function initSystemTables(): void {
  if (!systemDb) {
    console.error('Cannot init tables: systemDb is null')
    return
  }
  
  try {
    systemDb.run(`
      CREATE TABLE IF NOT EXISTS sys_user (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        real_name VARCHAR(50),
        role VARCHAR(20) DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('Created sys_user table')
    
    systemDb.run(`
      CREATE TABLE IF NOT EXISTS sys_account_book (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) NOT NULL,
        company_name VARCHAR(200),
        db_path VARCHAR(500) NOT NULL,
        accounting_standard VARCHAR(50),
        fiscal_year_start DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('Created sys_account_book table')
    
    systemDb.run(`
      CREATE TABLE IF NOT EXISTS sys_operation_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        operation VARCHAR(100),
        module VARCHAR(50),
        detail TEXT,
        ip VARCHAR(50),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    console.log('Created sys_operation_log table')
  } catch (e) {
    console.error('Failed to init tables:', e)
  }
}

function initDefaultUser(): void {
  if (!systemDb) {
    console.error('Cannot init default user: systemDb is null')
    return
  }
  
  try {
    const result = systemDb.exec('SELECT COUNT(*) as count FROM sys_user')
    const count = result.length > 0 ? result[0].values[0][0] : 0
    
    console.log('Current user count:', count)
    
    if (count === 0) {
      const crypto = require('crypto')
      const defaultPassword = crypto.createHash('sha256').update('admin' + 'k3_salt').digest('hex')
      
      systemDb.run(
        'INSERT INTO sys_user (username, password, real_name, role) VALUES (?, ?, ?, ?)',
        ['admin', defaultPassword, '系统管理员', 'admin']
      )
      console.log('Default user created: admin / admin')
    } else {
      console.log('Users already exist, skipping default user creation')
    }
  } catch (e) {
    console.error('Failed to init default user:', e)
  }
}

export function getSystemDb(): SqlJsDatabase {
  return systemDb!
}

export function getAccountDb(): SqlJsDatabase | null {
  return accountDb
}

export function openAccountDb(dbPath: string): SqlJsDatabase {
  if (accountDb) {
    saveAccountDb()
  }
  
  accountDbPath = dbPath
  
  if (existsSync(dbPath)) {
    try {
      const buffer = readFileSync(dbPath)
      accountDb = new SQL.Database(buffer)
    } catch (e) {
      console.error('Failed to load account db:', e)
      accountDb = new SQL.Database()
    }
  } else {
    accountDb = new SQL.Database()
  }
  
  return accountDb
}

export function closeAccountDb(): void {
  if (accountDb) {
    saveAccountDb()
    accountDb = null
    accountDbPath = ''
  }
}

export function saveDatabases(): void {
  saveSystemDb()
  saveAccountDb()
}

export function getSQL(): any {
  return SQL
}
