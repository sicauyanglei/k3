var K3Database = (function() {
  var db = null;
  var SQL = null;
  var dbPath = null;
  var fs = require('fs');
  var path = require('path');
  
  function getDataPath() {
    var dataDir;
    try {
      var os = require('os');
      dataDir = path.join(os.homedir(), 'k3-finance-xp', 'data');
    } catch (e) {
      dataDir = path.join(process.cwd(), 'data');
    }
    
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch (e) {
        dataDir = process.cwd();
      }
    }
    return dataDir;
  }
  
  function init(sqlJs) {
    SQL = sqlJs;
    var dataPath = getDataPath();
    dbPath = path.join(dataPath, 'system.db');
    
    console.log('Database path:', dbPath);
    
    if (fs.existsSync(dbPath)) {
      try {
        var buffer = fs.readFileSync(dbPath);
        db = new SQL.Database(buffer);
        console.log('Loaded existing database');
      } catch (e) {
        console.error('Failed to load database:', e);
        db = new SQL.Database();
      }
    } else {
      db = new SQL.Database();
      console.log('Created new database');
    }
    
    initTables();
    initDefaultData();
    save();
    
    return db;
  }
  
  function initTables() {
    db.run(`
      CREATE TABLE IF NOT EXISTS sys_user (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        real_name VARCHAR(50),
        role VARCHAR(20) DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    db.run(`
      CREATE TABLE IF NOT EXISTS sys_account_book (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name VARCHAR(100) NOT NULL,
        company_name VARCHAR(200),
        db_path VARCHAR(500) NOT NULL,
        accounting_standard VARCHAR(50),
        fiscal_year_start DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    db.run(`
      CREATE TABLE IF NOT EXISTS sys_operation_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        operation VARCHAR(100),
        module VARCHAR(50),
        detail TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    db.run(`
      CREATE TABLE IF NOT EXISTS base_account (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code VARCHAR(20) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        parent_id INTEGER,
        level INTEGER DEFAULT 1,
        category VARCHAR(20),
        direction VARCHAR(10),
        is_leaf INTEGER DEFAULT 1,
        is_enabled INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    db.run(`
      CREATE TABLE IF NOT EXISTS base_department (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code VARCHAR(20) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        parent_id INTEGER,
        is_enabled INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    db.run(`
      CREATE TABLE IF NOT EXISTS base_customer (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code VARCHAR(20) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        short_name VARCHAR(50),
        contact VARCHAR(50),
        phone VARCHAR(30),
        address VARCHAR(200),
        credit_limit DECIMAL(18,2) DEFAULT 0,
        is_enabled INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    db.run(`
      CREATE TABLE IF NOT EXISTS base_supplier (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code VARCHAR(20) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        short_name VARCHAR(50),
        contact VARCHAR(50),
        phone VARCHAR(30),
        address VARCHAR(200),
        credit_limit DECIMAL(18,2) DEFAULT 0,
        is_enabled INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    db.run(`
      CREATE TABLE IF NOT EXISTS gl_voucher (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        voucher_no VARCHAR(20) NOT NULL,
        voucher_date DATE NOT NULL,
        period VARCHAR(7),
        entry_count INTEGER DEFAULT 0,
        total_debit DECIMAL(18,2) DEFAULT 0,
        total_credit DECIMAL(18,2) DEFAULT 0,
        maker VARCHAR(50),
        auditor VARCHAR(50),
        status INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    db.run(`
      CREATE TABLE IF NOT EXISTS gl_voucher_entry (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        voucher_id INTEGER NOT NULL,
        account_id INTEGER NOT NULL,
        summary VARCHAR(200),
        debit DECIMAL(18,2) DEFAULT 0,
        credit DECIMAL(18,2) DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('Tables initialized');
  }
  
  function initDefaultData() {
    var result = db.exec('SELECT COUNT(*) as count FROM sys_user');
    var count = result.length > 0 ? result[0].values[0][0] : 0;
    
    if (count === 0) {
      var crypto = require('crypto');
      var defaultPassword = crypto.createHash('sha256').update('admin' + 'k3_salt').digest('hex');
      
      db.run(
        'INSERT INTO sys_user (username, password, real_name, role) VALUES (?, ?, ?, ?)',
        ['admin', defaultPassword, '系统管理员', 'admin']
      );
      
      db.run(
        'INSERT INTO sys_account_book (name, company_name, db_path, accounting_standard) VALUES (?, ?, ?, ?)',
        ['演示账套', '演示公司', 'demo.db', '企业会计准则']
      );
      
      initDefaultAccounts();
      
      console.log('Default data initialized');
    }
  }
  
  function initDefaultAccounts() {
    var accounts = [
      { code: '1001', name: '库存现金', category: '资产', direction: '借' },
      { code: '1002', name: '银行存款', category: '资产', direction: '借' },
      { code: '1012', name: '其他货币资金', category: '资产', direction: '借' },
      { code: '1101', name: '交易性金融资产', category: '资产', direction: '借' },
      { code: '1121', name: '应收票据', category: '资产', direction: '借' },
      { code: '1122', name: '应收账款', category: '资产', direction: '借' },
      { code: '1123', name: '预付账款', category: '资产', direction: '借' },
      { code: '1131', name: '应收股利', category: '资产', direction: '借' },
      { code: '1132', name: '应收利息', category: '资产', direction: '借' },
      { code: '1221', name: '其他应收款', category: '资产', direction: '借' },
      { code: '1231', name: '坏账准备', category: '资产', direction: '贷' },
      { code: '1401', name: '材料采购', category: '资产', direction: '借' },
      { code: '1402', name: '在途物资', category: '资产', direction: '借' },
      { code: '1403', name: '原材料', category: '资产', direction: '借' },
      { code: '1404', name: '材料成本差异', category: '资产', direction: '借' },
      { code: '1405', name: '库存商品', category: '资产', direction: '借' },
      { code: '1601', name: '固定资产', category: '资产', direction: '借' },
      { code: '1602', name: '累计折旧', category: '资产', direction: '贷' },
      { code: '2001', name: '短期借款', category: '负债', direction: '贷' },
      { code: '2201', name: '应付票据', category: '负债', direction: '贷' },
      { code: '2202', name: '应付账款', category: '负债', direction: '贷' },
      { code: '2203', name: '预收账款', category: '负债', direction: '贷' },
      { code: '2211', name: '应付职工薪酬', category: '负债', direction: '贷' },
      { code: '2221', name: '应交税费', category: '负债', direction: '贷' },
      { code: '2231', name: '应付利息', category: '负债', direction: '贷' },
      { code: '2232', name: '应付股利', category: '负债', direction: '贷' },
      { code: '2241', name: '其他应付款', category: '负债', direction: '贷' },
      { code: '2501', name: '长期借款', category: '负债', direction: '贷' },
      { code: '4001', name: '实收资本', category: '权益', direction: '贷' },
      { code: '4002', name: '资本公积', category: '权益', direction: '贷' },
      { code: '4101', name: '盈余公积', category: '权益', direction: '贷' },
      { code: '4103', name: '本年利润', category: '权益', direction: '贷' },
      { code: '4104', name: '利润分配', category: '权益', direction: '贷' },
      { code: '5001', name: '生产成本', category: '成本', direction: '借' },
      { code: '5101', name: '制造费用', category: '成本', direction: '借' },
      { code: '6001', name: '主营业务收入', category: '损益', direction: '贷' },
      { code: '6051', name: '其他业务收入', category: '损益', direction: '贷' },
      { code: '6111', name: '投资收益', category: '损益', direction: '贷' },
      { code: '6301', name: '营业外收入', category: '损益', direction: '贷' },
      { code: '6401', name: '主营业务成本', category: '损益', direction: '借' },
      { code: '6402', name: '其他业务成本', category: '损益', direction: '借' },
      { code: '6403', name: '税金及附加', category: '损益', direction: '借' },
      { code: '6601', name: '销售费用', category: '损益', direction: '借' },
      { code: '6602', name: '管理费用', category: '损益', direction: '借' },
      { code: '6603', name: '财务费用', category: '损益', direction: '借' },
      { code: '6701', name: '资产减值损失', category: '损益', direction: '借' },
      { code: '6711', name: '营业外支出', category: '损益', direction: '借' },
      { code: '6801', name: '所得税费用', category: '损益', direction: '借' }
    ];
    
    accounts.forEach(function(acc) {
      db.run(
        'INSERT INTO base_account (code, name, category, direction, level) VALUES (?, ?, ?, ?, 1)',
        [acc.code, acc.name, acc.category, acc.direction]
      );
    });
    
    console.log('Default accounts initialized');
  }
  
  function save() {
    if (db && dbPath) {
      try {
        var data = db.export();
        var buffer = new Buffer(data);
        fs.writeFileSync(dbPath, buffer);
        console.log('Database saved');
      } catch (e) {
        console.error('Failed to save database:', e);
      }
    }
  }
  
  function query(sql, params) {
    params = params || [];
    if (!db) return [];
    
    try {
      var stmt = db.prepare(sql);
      stmt.bind(params);
      
      var results = [];
      while (stmt.step()) {
        results.push(stmt.getAsObject());
      }
      stmt.free();
      
      return results;
    } catch (e) {
      console.error('Query error:', e, sql);
      return [];
    }
  }
  
  function queryOne(sql, params) {
    var results = query(sql, params);
    return results.length > 0 ? results[0] : null;
  }
  
  function execute(sql, params) {
    params = params || [];
    if (!db) return { changes: 0 };
    
    try {
      db.run(sql, params);
      save();
      return { changes: db.getRowsModified() };
    } catch (e) {
      console.error('Execute error:', e, sql);
      return { changes: 0, error: e.message };
    }
  }
  
  function getDb() {
    return db;
  }
  
  return {
    init: init,
    save: save,
    query: query,
    queryOne: queryOne,
    execute: execute,
    getDb: getDb
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = K3Database;
}
