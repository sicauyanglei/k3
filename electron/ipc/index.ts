import { ipcMain } from 'electron'
import { getSystemDb, getAccountDb, openAccountDb, closeAccountDb, getDataPath, saveAccountDb, getSQL } from '../services/database'
import { join } from 'path'
import { copyFileSync, mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs'
import * as crypto from 'crypto'

export function setupIpc(): void {
  ipcMain.handle('db:execute', async (_, sql: string, params?: any[]) => {
    const db = getAccountDb() || getSystemDb()
    db.run(sql, params)
    return { changes: db.getRowsModified(), lastInsertRowid: 0 }
  })

  ipcMain.handle('db:query', async (_, sql: string, params?: any[]) => {
    const db = getAccountDb() || getSystemDb()
    
    try {
      if (params && params.length > 0) {
        const stmt = db.prepare(sql)
        stmt.bind(params)
        const results: any[] = []
        while (stmt.step()) {
          const row = stmt.getAsObject()
          results.push(row)
        }
        stmt.free()
        return results
      } else {
        const result = db.exec(sql)
        if (result.length === 0) return []
        
        const columns = result[0].columns
        return result[0].values.map(row => {
          const obj: any = {}
          columns.forEach((col, i) => {
            obj[col] = row[i]
          })
          return obj
        })
      }
    } catch (e) {
      console.error('db:query error:', e, 'SQL:', sql, 'Params:', params)
      throw e
    }
  })

  ipcMain.handle('db:queryOne', async (_, sql: string, params?: any[]) => {
    const db = getAccountDb() || getSystemDb()
    
    try {
      if (params && params.length > 0) {
        const stmt = db.prepare(sql)
        stmt.bind(params)
        if (stmt.step()) {
          const row = stmt.getAsObject()
          stmt.free()
          return row
        }
        stmt.free()
        return null
      } else {
        const result = db.exec(sql)
        if (result.length === 0) return null
        
        const columns = result[0].columns
        const row = result[0].values[0]
        if (!row) return null
        
        const obj: any = {}
        columns.forEach((col, i) => {
          obj[col] = row[i]
        })
        return obj
      }
    } catch (e) {
      console.error('db:queryOne error:', e, 'SQL:', sql, 'Params:', params)
      throw e
    }
  })

  ipcMain.handle('account:getList', async () => {
    const db = getSystemDb()
    const result = db.exec('SELECT * FROM sys_account_book ORDER BY created_at DESC')
    if (result.length === 0) return []
    
    const columns = result[0].columns
    return result[0].values.map(row => {
      const obj: any = {}
      columns.forEach((col, i) => {
        obj[col] = row[i]
      })
      return obj
    })
  })

  ipcMain.handle('account:create', async (_, data: any) => {
    const { name, companyName, accountingStandard, fiscalYearStart } = data
    const accountsPath = join(getDataPath(), 'accounts')
    
    if (!existsSync(accountsPath)) {
      mkdirSync(accountsPath, { recursive: true })
    }

    const fileName = `${name}_${Date.now()}.k3db`
    const dbPath = join(accountsPath, fileName)

    const db = getSystemDb()
    db.run(
      'INSERT INTO sys_account_book (name, company_name, db_path, accounting_standard, fiscal_year_start) VALUES (?, ?, ?, ?, ?)',
      [name, companyName, dbPath, accountingStandard, fiscalYearStart]
    )
    
    const lastIdResult = db.exec('SELECT last_insert_rowid()')
    const lastId = lastIdResult[0].values[0][0]

    const sql = await getSQL()
    const accountDb = new sql.Database()
    initAccountTables(accountDb)
    initAccountSeedData(accountDb)
    
    const data2 = accountDb.export()
    const buffer = Buffer.from(data2)
    writeFileSync(dbPath, buffer)

    return { id: lastId, name, dbPath }
  })

  ipcMain.handle('account:open', async (_, id: number) => {
    const db = getSystemDb()
    const result = db.exec(`SELECT * FROM sys_account_book WHERE id = ${id}`)
    
    if (result.length === 0 || result[0].values.length === 0) {
      throw new Error('账套不存在')
    }
    
    const columns = result[0].columns
    const row = result[0].values[0]
    
    const account: any = {}
    columns.forEach((col, i) => {
      account[col] = row[i]
    })
    
    openAccountDb(account.db_path)
    return { success: true, account }
  })

  ipcMain.handle('account:delete', async (_, id: number) => {
    const db = getSystemDb()
    const result = db.exec('SELECT * FROM sys_account_book WHERE id = ?')
    
    if (result.length > 0 && result[0].values.length > 0) {
      const row = result[0].values[0]
      const dbPath = row[3] as string
      const accountName = row[1] as string
      
      closeAccountDb()
      if (existsSync(dbPath)) {
        const backupPath = join(getDataPath(), '..', 'backup', `${accountName}_${Date.now()}.k3bak`)
        mkdirSync(join(getDataPath(), '..', 'backup'), { recursive: true })
        copyFileSync(dbPath, backupPath)
      }
      db.run('DELETE FROM sys_account_book WHERE id = ?', [id])
    }
    return { success: true }
  })

  ipcMain.handle('account:backup', async (_, id: number, backupPath: string) => {
    const db = getSystemDb()
    const result = db.exec('SELECT * FROM sys_account_book WHERE id = ?')
    
    if (result.length > 0 && result[0].values.length > 0) {
      const row = result[0].values[0]
      const dbPath = row[3] as string
      
      if (existsSync(dbPath)) {
        copyFileSync(dbPath, backupPath)
        return { success: true }
      }
    }
    throw new Error('账套不存在或文件损坏')
  })

  ipcMain.handle('account:restore', async (_, filePath: string) => {
    const accountsPath = join(getDataPath(), 'accounts')
    if (!existsSync(accountsPath)) {
      mkdirSync(accountsPath, { recursive: true })
    }

    const fileName = `restored_${Date.now()}.k3db`
    const dbPath = join(accountsPath, fileName)
    copyFileSync(filePath, dbPath)

    return { success: true, dbPath }
  })

  ipcMain.handle('user:login', async (_, username: string, password: string) => {
    const db = getSystemDb()
    const escapedUsername = username.replace(/'/g, "''")
    const result = db.exec(`SELECT * FROM sys_user WHERE username = '${escapedUsername}'`)
    
    if (result.length === 0 || result[0].values.length === 0) {
      throw new Error('用户不存在')
    }
    
    const columns = result[0].columns
    const row = result[0].values[0]
    const user: any = {}
    columns.forEach((col, i) => {
      user[col] = row[i]
    })
    
    const hashedPassword = hashPassword(password)
    if (user.password !== hashedPassword) {
      throw new Error('密码错误')
    }

    return { id: user.id, username: user.username, realName: user.real_name, role: user.role }
  })

  ipcMain.handle('user:logout', async () => {
    closeAccountDb()
    return { success: true }
  })

  ipcMain.handle('user:changePassword', async (_, oldPassword: string, newPassword: string) => {
    const db = getSystemDb()
    const hashedOldPassword = hashPassword(oldPassword)
    const hashedNewPassword = hashPassword(newPassword)
    
    const result = db.exec('SELECT * FROM sys_user WHERE password = ?', [hashedOldPassword])
    if (result.length === 0 || result[0].values.length === 0) {
      throw new Error('原密码错误')
    }
    
    db.run('UPDATE sys_user SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE password = ?', [hashedNewPassword, hashedOldPassword])
    return { success: true }
  })
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + 'k3_salt').digest('hex')
}

function initAccountTables(db: any): void {
  const tables = [
    `CREATE TABLE IF NOT EXISTS bd_department (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code VARCHAR(20) NOT NULL UNIQUE,
      name VARCHAR(100) NOT NULL,
      parent_id INTEGER,
      is_enabled INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS bd_currency (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code VARCHAR(10) NOT NULL UNIQUE,
      name VARCHAR(50) NOT NULL,
      symbol VARCHAR(10),
      exchange_rate DECIMAL(18,6) DEFAULT 1,
      is_base INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS bd_account_period (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year INTEGER NOT NULL,
      period INTEGER NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      is_closed INTEGER DEFAULT 0,
      closed_at DATETIME,
      UNIQUE(year, period)
    )`,
    `CREATE TABLE IF NOT EXISTS bd_account (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code VARCHAR(50) NOT NULL UNIQUE,
      name VARCHAR(100) NOT NULL,
      parent_id INTEGER,
      category VARCHAR(20),
      direction VARCHAR(10),
      level INTEGER DEFAULT 1,
      is_leaf INTEGER DEFAULT 1,
      is_enabled INTEGER DEFAULT 1,
      has_aux INTEGER DEFAULT 0,
      aux_types TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS bd_customer (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code VARCHAR(20) NOT NULL UNIQUE,
      name VARCHAR(200) NOT NULL,
      short_name VARCHAR(100),
      credit_limit DECIMAL(18,2) DEFAULT 0,
      contact VARCHAR(50),
      phone VARCHAR(50),
      address VARCHAR(500),
      is_enabled INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS bd_supplier (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code VARCHAR(20) NOT NULL UNIQUE,
      name VARCHAR(200) NOT NULL,
      short_name VARCHAR(100),
      contact VARCHAR(50),
      phone VARCHAR(50),
      address VARCHAR(500),
      is_enabled INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS bd_employee (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code VARCHAR(20) NOT NULL UNIQUE,
      name VARCHAR(50) NOT NULL,
      department_id INTEGER,
      position VARCHAR(50),
      id_card VARCHAR(20),
      bank_account VARCHAR(50),
      bank_name VARCHAR(100),
      is_enabled INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS gl_voucher (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      voucher_word VARCHAR(10) NOT NULL,
      voucher_no INTEGER NOT NULL,
      year INTEGER NOT NULL,
      period INTEGER NOT NULL,
      voucher_date DATE NOT NULL,
      description VARCHAR(500),
      attachment_count INTEGER DEFAULT 0,
      maker_id INTEGER,
      auditor_id INTEGER,
      poster_id INTEGER,
      status VARCHAR(20) DEFAULT 'draft',
      made_at DATETIME,
      audited_at DATETIME,
      posted_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(voucher_word, voucher_no, year, period)
    )`,
    `CREATE TABLE IF NOT EXISTS gl_voucher_entry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      voucher_id INTEGER NOT NULL,
      entry_no INTEGER NOT NULL,
      account_id INTEGER NOT NULL,
      account_code VARCHAR(50),
      account_name VARCHAR(100),
      description VARCHAR(500),
      debit DECIMAL(18,2) DEFAULT 0,
      credit DECIMAL(18,2) DEFAULT 0,
      currency_id INTEGER,
      exchange_rate DECIMAL(18,6),
      original_debit DECIMAL(18,2),
      original_credit DECIMAL(18,2),
      customer_id INTEGER,
      supplier_id INTEGER,
      employee_id INTEGER,
      department_id INTEGER,
      project_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS gl_balance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year INTEGER NOT NULL,
      period INTEGER NOT NULL,
      account_id INTEGER NOT NULL,
      currency_id INTEGER DEFAULT 1,
      customer_id INTEGER,
      supplier_id INTEGER,
      employee_id INTEGER,
      department_id INTEGER,
      begin_debit DECIMAL(18,2) DEFAULT 0,
      begin_credit DECIMAL(18,2) DEFAULT 0,
      period_debit DECIMAL(18,2) DEFAULT 0,
      period_credit DECIMAL(18,2) DEFAULT 0,
      end_debit DECIMAL(18,2) DEFAULT 0,
      end_credit DECIMAL(18,2) DEFAULT 0,
      year_debit DECIMAL(18,2) DEFAULT 0,
      year_credit DECIMAL(18,2) DEFAULT 0,
      UNIQUE(year, period, account_id, currency_id, customer_id, supplier_id, employee_id, department_id)
    )`,
    `CREATE TABLE IF NOT EXISTS gl_budget (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year INTEGER NOT NULL,
      period INTEGER NOT NULL,
      account_id INTEGER NOT NULL,
      budget_amount DECIMAL(18,2) DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(year, period, account_id)
    )`,
    `CREATE TABLE IF NOT EXISTS ar_invoice (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_no VARCHAR(50) NOT NULL UNIQUE,
      invoice_type VARCHAR(20),
      customer_id INTEGER NOT NULL,
      invoice_date DATE NOT NULL,
      amount DECIMAL(18,2) NOT NULL,
      tax_amount DECIMAL(18,2) DEFAULT 0,
      total_amount DECIMAL(18,2) NOT NULL,
      status VARCHAR(20) DEFAULT 'draft',
      voucher_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS ar_receipt (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_no VARCHAR(50) NOT NULL UNIQUE,
      customer_id INTEGER NOT NULL,
      receipt_date DATE NOT NULL,
      amount DECIMAL(18,2) NOT NULL,
      bank_account VARCHAR(100),
      status VARCHAR(20) DEFAULT 'draft',
      voucher_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS ar_write_off (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      receipt_id INTEGER NOT NULL,
      invoice_id INTEGER NOT NULL,
      amount DECIMAL(18,2) NOT NULL,
      write_off_date DATE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS ap_invoice (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_no VARCHAR(50) NOT NULL UNIQUE,
      invoice_type VARCHAR(20),
      supplier_id INTEGER NOT NULL,
      invoice_date DATE NOT NULL,
      amount DECIMAL(18,2) NOT NULL,
      tax_amount DECIMAL(18,2) DEFAULT 0,
      total_amount DECIMAL(18,2) NOT NULL,
      status VARCHAR(20) DEFAULT 'draft',
      voucher_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS ap_payment (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_no VARCHAR(50) NOT NULL UNIQUE,
      supplier_id INTEGER NOT NULL,
      payment_date DATE NOT NULL,
      amount DECIMAL(18,2) NOT NULL,
      bank_account VARCHAR(100),
      status VARCHAR(20) DEFAULT 'draft',
      voucher_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS ap_write_off (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_id INTEGER NOT NULL,
      invoice_id INTEGER NOT NULL,
      amount DECIMAL(18,2) NOT NULL,
      write_off_date DATE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS fa_category (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code VARCHAR(20) NOT NULL UNIQUE,
      name VARCHAR(100) NOT NULL,
      depreciation_method VARCHAR(50),
      useful_life INTEGER,
      salvage_rate DECIMAL(5,2),
      debit_account_id INTEGER,
      credit_account_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS fa_asset (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_no VARCHAR(50) NOT NULL UNIQUE,
      name VARCHAR(200) NOT NULL,
      category_id INTEGER NOT NULL,
      department_id INTEGER,
      acquisition_date DATE NOT NULL,
      original_value DECIMAL(18,2) NOT NULL,
      salvage_value DECIMAL(18,2) DEFAULT 0,
      depreciation_method VARCHAR(50),
      useful_life INTEGER,
      used_life INTEGER DEFAULT 0,
      accumulated_depreciation DECIMAL(18,2) DEFAULT 0,
      net_value DECIMAL(18,2),
      status VARCHAR(20) DEFAULT 'normal',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS fa_depreciation (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_id INTEGER NOT NULL,
      year INTEGER NOT NULL,
      period INTEGER NOT NULL,
      depreciation_amount DECIMAL(18,2) NOT NULL,
      accumulated_amount DECIMAL(18,2),
      voucher_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(asset_id, year, period)
    )`,
    `CREATE TABLE IF NOT EXISTS fa_change (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_id INTEGER NOT NULL,
      change_type VARCHAR(20) NOT NULL,
      change_date DATE NOT NULL,
      before_value DECIMAL(18,2),
      after_value DECIMAL(18,2),
      description VARCHAR(500),
      voucher_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS hr_salary_item (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code VARCHAR(20) NOT NULL UNIQUE,
      name VARCHAR(50) NOT NULL,
      item_type VARCHAR(20),
      formula TEXT,
      is_system INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS hr_salary_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year INTEGER NOT NULL,
      period INTEGER NOT NULL,
      employee_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      amount DECIMAL(18,2) DEFAULT 0,
      UNIQUE(year, period, employee_id, item_id)
    )`,
    `CREATE TABLE IF NOT EXISTS hr_salary_payment (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payment_no VARCHAR(50) NOT NULL UNIQUE,
      year INTEGER NOT NULL,
      period INTEGER NOT NULL,
      employee_id INTEGER NOT NULL,
      gross_amount DECIMAL(18,2),
      deduct_amount DECIMAL(18,2),
      net_amount DECIMAL(18,2),
      payment_date DATE,
      status VARCHAR(20) DEFAULT 'draft',
      voucher_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS cash_journal (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      journal_type VARCHAR(20) NOT NULL,
      entry_date DATE NOT NULL,
      voucher_no VARCHAR(50),
      account_code VARCHAR(50),
      description VARCHAR(500),
      debit DECIMAL(18,2) DEFAULT 0,
      credit DECIMAL(18,2) DEFAULT 0,
      balance DECIMAL(18,2),
      voucher_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS cash_bank_account (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_no VARCHAR(50) NOT NULL UNIQUE,
      account_name VARCHAR(100) NOT NULL,
      bank_name VARCHAR(100),
      bank_code VARCHAR(50),
      currency_id INTEGER DEFAULT 1,
      account_id INTEGER,
      is_enabled INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS cash_check (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      check_no VARCHAR(50) NOT NULL,
      bank_account_id INTEGER NOT NULL,
      check_type VARCHAR(20),
      amount DECIMAL(18,2),
      issue_date DATE,
      due_date DATE,
      payee VARCHAR(200),
      status VARCHAR(20) DEFAULT 'unused',
      voucher_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS rpt_template (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code VARCHAR(50) NOT NULL UNIQUE,
      name VARCHAR(100) NOT NULL,
      report_type VARCHAR(20),
      template_data TEXT,
      is_system INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS rpt_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER NOT NULL,
      year INTEGER NOT NULL,
      period INTEGER NOT NULL,
      report_data TEXT,
      generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(template_id, year, period)
    )`,
    `CREATE TABLE IF NOT EXISTS sys_backup_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename VARCHAR(200) NOT NULL,
      size INTEGER DEFAULT 0,
      type VARCHAR(20) DEFAULT 'manual',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
  ]
  
  tables.forEach(sql => db.run(sql))
}

function initAccountSeedData(db: any): void {
  const currencies = [
    `INSERT INTO bd_currency (code, name, symbol, exchange_rate, is_base) VALUES ('CNY', '人民币', '¥', 1, 1)`,
    `INSERT INTO bd_currency (code, name, symbol, exchange_rate, is_base) VALUES ('USD', '美元', '$', 7.2, 0)`,
    `INSERT INTO bd_currency (code, name, symbol, exchange_rate, is_base) VALUES ('EUR', '欧元', '€', 7.8, 0)`,
    `INSERT INTO bd_currency (code, name, symbol, exchange_rate, is_base) VALUES ('HKD', '港币', 'HK$', 0.92, 0)`
  ]
  currencies.forEach(sql => db.run(sql))
  
  const periods = [
    `INSERT INTO bd_account_period (year, period, start_date, end_date) VALUES (2024, 1, '2024-01-01', '2024-01-31')`,
    `INSERT INTO bd_account_period (year, period, start_date, end_date) VALUES (2024, 2, '2024-02-01', '2024-02-29')`,
    `INSERT INTO bd_account_period (year, period, start_date, end_date) VALUES (2024, 3, '2024-03-01', '2024-03-31')`,
    `INSERT INTO bd_account_period (year, period, start_date, end_date) VALUES (2024, 4, '2024-04-01', '2024-04-30')`,
    `INSERT INTO bd_account_period (year, period, start_date, end_date) VALUES (2024, 5, '2024-05-01', '2024-05-31')`,
    `INSERT INTO bd_account_period (year, period, start_date, end_date) VALUES (2024, 6, '2024-06-01', '2024-06-30')`,
    `INSERT INTO bd_account_period (year, period, start_date, end_date) VALUES (2024, 7, '2024-07-01', '2024-07-31')`,
    `INSERT INTO bd_account_period (year, period, start_date, end_date) VALUES (2024, 8, '2024-08-01', '2024-08-31')`,
    `INSERT INTO bd_account_period (year, period, start_date, end_date) VALUES (2024, 9, '2024-09-01', '2024-09-30')`,
    `INSERT INTO bd_account_period (year, period, start_date, end_date) VALUES (2024, 10, '2024-10-01', '2024-10-31')`,
    `INSERT INTO bd_account_period (year, period, start_date, end_date) VALUES (2024, 11, '2024-11-01', '2024-11-30')`,
    `INSERT INTO bd_account_period (year, period, start_date, end_date) VALUES (2024, 12, '2024-12-01', '2024-12-31')`
  ]
  periods.forEach(sql => db.run(sql))

  const accounts = getStandardAccounts()
  accounts.forEach(account => {
    db.run(
      `INSERT INTO bd_account (code, name, parent_id, category, direction, level, is_leaf, is_enabled) VALUES (?, ?, ?, ?, ?, ?, 1, 1)`,
      [account.code, account.name, account.parentId, account.category, account.direction, account.level]
    )
  })
}

function getStandardAccounts(): any[] {
  return [
    { code: '1001', name: '库存现金', parentId: null, category: 'asset', direction: 'debit', level: 1 },
    { code: '1002', name: '银行存款', parentId: null, category: 'asset', direction: 'debit', level: 1 },
    { code: '1012', name: '其他货币资金', parentId: null, category: 'asset', direction: 'debit', level: 1 },
    { code: '1101', name: '交易性金融资产', parentId: null, category: 'asset', direction: 'debit', level: 1 },
    { code: '1121', name: '应收票据', parentId: null, category: 'asset', direction: 'debit', level: 1 },
    { code: '1122', name: '应收账款', parentId: null, category: 'asset', direction: 'debit', level: 1 },
    { code: '1123', name: '预付账款', parentId: null, category: 'asset', direction: 'debit', level: 1 },
    { code: '1221', name: '其他应收款', parentId: null, category: 'asset', direction: 'debit', level: 1 },
    { code: '1231', name: '坏账准备', parentId: null, category: 'asset', direction: 'credit', level: 1 },
    { code: '1401', name: '材料采购', parentId: null, category: 'asset', direction: 'debit', level: 1 },
    { code: '1403', name: '原材料', parentId: null, category: 'asset', direction: 'debit', level: 1 },
    { code: '1405', name: '库存商品', parentId: null, category: 'asset', direction: 'debit', level: 1 },
    { code: '1601', name: '固定资产', parentId: null, category: 'asset', direction: 'debit', level: 1 },
    { code: '1602', name: '累计折旧', parentId: null, category: 'asset', direction: 'credit', level: 1 },
    { code: '1701', name: '无形资产', parentId: null, category: 'asset', direction: 'debit', level: 1 },
    { code: '1702', name: '累计摊销', parentId: null, category: 'asset', direction: 'credit', level: 1 },
    { code: '2001', name: '短期借款', parentId: null, category: 'liability', direction: 'credit', level: 1 },
    { code: '2201', name: '应付票据', parentId: null, category: 'liability', direction: 'credit', level: 1 },
    { code: '2202', name: '应付账款', parentId: null, category: 'liability', direction: 'credit', level: 1 },
    { code: '2203', name: '预收账款', parentId: null, category: 'liability', direction: 'credit', level: 1 },
    { code: '2211', name: '应付职工薪酬', parentId: null, category: 'liability', direction: 'credit', level: 1 },
    { code: '2221', name: '应交税费', parentId: null, category: 'liability', direction: 'credit', level: 1 },
    { code: '2241', name: '其他应付款', parentId: null, category: 'liability', direction: 'credit', level: 1 },
    { code: '2501', name: '长期借款', parentId: null, category: 'liability', direction: 'credit', level: 1 },
    { code: '4001', name: '实收资本', parentId: null, category: 'equity', direction: 'credit', level: 1 },
    { code: '4002', name: '资本公积', parentId: null, category: 'equity', direction: 'credit', level: 1 },
    { code: '4101', name: '盈余公积', parentId: null, category: 'equity', direction: 'credit', level: 1 },
    { code: '4103', name: '本年利润', parentId: null, category: 'equity', direction: 'credit', level: 1 },
    { code: '4104', name: '利润分配', parentId: null, category: 'equity', direction: 'credit', level: 1 },
    { code: '5001', name: '生产成本', parentId: null, category: 'cost', direction: 'debit', level: 1 },
    { code: '5101', name: '制造费用', parentId: null, category: 'cost', direction: 'debit', level: 1 },
    { code: '6001', name: '主营业务收入', parentId: null, category: 'profit', direction: 'credit', level: 1 },
    { code: '6051', name: '其他业务收入', parentId: null, category: 'profit', direction: 'credit', level: 1 },
    { code: '6401', name: '主营业务成本', parentId: null, category: 'profit', direction: 'debit', level: 1 },
    { code: '6403', name: '税金及附加', parentId: null, category: 'profit', direction: 'debit', level: 1 },
    { code: '6601', name: '销售费用', parentId: null, category: 'profit', direction: 'debit', level: 1 },
    { code: '6602', name: '管理费用', parentId: null, category: 'profit', direction: 'debit', level: 1 },
    { code: '6603', name: '财务费用', parentId: null, category: 'profit', direction: 'debit', level: 1 },
    { code: '6801', name: '所得税费用', parentId: null, category: 'profit', direction: 'debit', level: 1 }
  ]
}
