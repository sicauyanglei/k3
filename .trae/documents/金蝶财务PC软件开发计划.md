# 金蝶财务板块PC软件实施计划（单机版）

## 一、项目概述

本项目旨在开发一个功能完整的金蝶财务板块PC单机软件，涵盖企业财务管理的核心业务场景，数据本地存储，无需联网即可使用。

## 二、核心功能模块（9大系统）

### 2.1 总账系统
- 凭证管理：凭证录入、审核、过账、查询、打印
- 账簿查询：总分类账、明细分类账、多栏账、日记账
- 期末处理：期末调汇、期末结账、损益结转
- 科目管理：会计科目设置、辅助核算、多币别核算
- 预算控制：科目预算设置与控制

### 2.2 应收款系统
- 销售发票管理：发票录入、审核、查询
- 应收单据管理：应收单、应收票据管理
- 收款管理：收款单录入、核销处理
- 信用管理：客户信用额度控制
- 账龄分析：应收账龄分析、回款预测
- 坏账管理：坏账计提、坏账核销

### 2.3 应付款系统
- 采购发票管理：发票录入、审核、匹配
- 应付单据管理：应付单、应付票据管理
- 付款管理：付款单录入、核销处理
- 账龄分析：应付账龄分析、付款预测
- 供应商对账：对账单生成与核对

### 2.4 固定资产系统
- 资产卡片管理：资产登记、变动、清理
- 折旧管理：折旧方法设置、自动计提折旧
- 资产盘点：盘点作业、差异处理
- 资产报表：固定资产清单、折旧明细表

### 2.5 工资系统
- 工资项目设置：工资项目定义、计算公式
- 工资数据录入：考勤数据、绩效数据
- 工资计算：自动计算工资、个人所得税
- 工资发放：银行代发、工资条打印
- 费用分配：工资费用分配凭证生成

### 2.6 现金管理系统
- 现金日记账：现金收支登记、查询
- 银行日记账：银行收支登记、对账
- 票据管理：支票、汇票管理
- 资金日报：资金日报表生成
- 银行对账：银行流水导入、自动对账

### 2.7 报表系统
- 财务报表：资产负债表、利润表、现金流量表
- 自定义报表：报表模板设计、取数公式
- 报表分析：报表对比、趋势分析

### 2.8 现金流量表系统
- 现金流量项目设置
- 现金流量凭证指定
- 现金流量表生成

### 2.9 财务分析系统
- 财务指标分析：偿债能力、盈利能力、运营能力
- 趋势分析：多期对比分析
- 预警分析：财务预警指标

## 三、技术架构方案（单机版）

### 3.1 技术栈选择

#### 前端技术
- **框架**: Electron + Vue 3 + TypeScript
- **UI组件库**: Element Plus
- **状态管理**: Pinia
- **路由**: Vue Router
- **图表**: ECharts
- **表格**: vxe-table（支持大数据量、虚拟滚动）
- **打印**: hiprint（自定义报表打印）
- **Excel**: xlsx（导入导出）

#### 本地数据库
- **SQLite**: 轻量级嵌入式数据库
- **ORM**: better-sqlite3 + 类型封装
- **数据迁移**: 自定义迁移脚本

#### 桌面端
- **Electron**: 跨平台桌面应用
- **Electron Builder**: 打包发布

### 3.2 单机版架构图

```
┌─────────────────────────────────────────────────────────────┐
│                   Electron 主进程                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  窗口管理 │ 系统托盘 │ 本地文件 │ 打印服务 │ 自动更新 │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   渲染进程 (Vue 3)                           │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐│
│  │  总账   │ │ 应收应付 │ │ 固定资产 │ │  工资   │ │  报表   ││
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘│
│  ┌─────────────────────────────────────────────────────┐   │
│  │              公共组件 / 工具函数 / 状态管理            │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   数据服务层 (本地)                          │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │  凭证服务   │ │  往来服务   │ │  资产服务   │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │  工资服务   │ │  报表服务   │ │  系统服务   │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   SQLite 本地数据库                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │     账套文件 (*.k3db) - 支持多账套管理               │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 3.3 数据存储方案

```
用户数据目录/
├── data/
│   ├── system.db          # 系统库（用户、权限、账套列表）
│   └── accounts/
│       ├── 公司A.k3db     # 账套数据库文件
│       └── 公司B.k3db     # 账套数据库文件
├── backup/                 # 自动备份目录
│   ├── 公司A/
│   │   ├── 20240101_120000.k3bak
│   │   └── 20240102_120000.k3bak
│   └── 公司B/
├── templates/              # 报表模板
│   ├── 资产负债表.tpl
│   └── 利润表.tpl
├── exports/                # 导出文件
└── logs/                   # 日志文件
```

## 四、数据库设计

### 4.1 系统库表结构

```sql
-- 系统用户表
CREATE TABLE sys_user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    real_name VARCHAR(50),
    role VARCHAR(20) DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 账套信息表
CREATE TABLE sys_account_book (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    company_name VARCHAR(200),
    db_path VARCHAR(500) NOT NULL,
    accounting_standard VARCHAR(50),  -- 会计准则
    fiscal_year_start DATE,          -- 会计年度起始
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 4.2 账套库核心表结构

#### 基础资料表
```sql
-- 部门信息
CREATE TABLE bd_department (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    parent_id INTEGER,
    is_enabled INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 币别信息
CREATE TABLE bd_currency (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(50) NOT NULL,
    symbol VARCHAR(10),
    exchange_rate DECIMAL(18,6) DEFAULT 1,
    is_base INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 会计期间
CREATE TABLE bd_account_period (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER NOT NULL,
    period INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_closed INTEGER DEFAULT 0,
    closed_at DATETIME,
    UNIQUE(year, period)
);

-- 会计科目
CREATE TABLE bd_account (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    parent_id INTEGER,
    category VARCHAR(20),           -- 资产/负债/权益/成本/损益
    direction VARCHAR(10),          -- 借方/贷方
    level INTEGER DEFAULT 1,
    is_leaf INTEGER DEFAULT 1,      -- 是否末级
    is_enabled INTEGER DEFAULT 1,
    has_aux INTEGER DEFAULT 0,      -- 是否有辅助核算
    aux_types TEXT,                 -- 辅助核算类型JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 客户信息
CREATE TABLE bd_customer (
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
);

-- 供应商信息
CREATE TABLE bd_supplier (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    short_name VARCHAR(100),
    contact VARCHAR(50),
    phone VARCHAR(50),
    address VARCHAR(500),
    is_enabled INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 员工信息
CREATE TABLE bd_employee (
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
);
```

#### 总账模块表
```sql
-- 凭证主表
CREATE TABLE gl_voucher (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    voucher_word VARCHAR(10) NOT NULL,    -- 凭证字（记/收/付/转）
    voucher_no INTEGER NOT NULL,          -- 凭证号
    year INTEGER NOT NULL,
    period INTEGER NOT NULL,
    voucher_date DATE NOT NULL,
    description VARCHAR(500),
    attachment_count INTEGER DEFAULT 0,
    maker_id INTEGER,                      -- 制单人
    auditor_id INTEGER,                    -- 审核人
    poster_id INTEGER,                     -- 过账人
    status VARCHAR(20) DEFAULT 'draft',   -- draft/audited/posted
    made_at DATETIME,
    audited_at DATETIME,
    posted_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(voucher_word, voucher_no, year, period)
);

-- 凭证分录
CREATE TABLE gl_voucher_entry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    voucher_id INTEGER NOT NULL,
    entry_no INTEGER NOT NULL,            -- 分录号
    account_id INTEGER NOT NULL,          -- 科目ID
    account_code VARCHAR(50),             -- 科目代码
    account_name VARCHAR(100),            -- 科目名称
    description VARCHAR(500),             -- 摘要
    debit DECIMAL(18,2) DEFAULT 0,        -- 借方金额
    credit DECIMAL(18,2) DEFAULT 0,       -- 贷方金额
    currency_id INTEGER,                  -- 币别
    exchange_rate DECIMAL(18,6),          -- 汇率
    original_debit DECIMAL(18,2),         -- 原币借方
    original_credit DECIMAL(18,2),        -- 原币贷方
    -- 辅助核算字段
    customer_id INTEGER,
    supplier_id INTEGER,
    employee_id INTEGER,
    department_id INTEGER,
    project_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 科目余额表
CREATE TABLE gl_balance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER NOT NULL,
    period INTEGER NOT NULL,
    account_id INTEGER NOT NULL,
    currency_id INTEGER DEFAULT 1,
    -- 辅助核算维度
    customer_id INTEGER,
    supplier_id INTEGER,
    employee_id INTEGER,
    department_id INTEGER,
    -- 金额
    begin_debit DECIMAL(18,2) DEFAULT 0,
    begin_credit DECIMAL(18,2) DEFAULT 0,
    period_debit DECIMAL(18,2) DEFAULT 0,
    period_credit DECIMAL(18,2) DEFAULT 0,
    end_debit DECIMAL(18,2) DEFAULT 0,
    end_credit DECIMAL(18,2) DEFAULT 0,
    year_debit DECIMAL(18,2) DEFAULT 0,
    year_credit DECIMAL(18,2) DEFAULT 0,
    UNIQUE(year, period, account_id, currency_id, customer_id, supplier_id, employee_id, department_id)
);

-- 科目预算
CREATE TABLE gl_budget (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER NOT NULL,
    period INTEGER NOT NULL,
    account_id INTEGER NOT NULL,
    budget_amount DECIMAL(18,2) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(year, period, account_id)
);
```

#### 应收模块表
```sql
-- 销售发票
CREATE TABLE ar_invoice (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_no VARCHAR(50) NOT NULL UNIQUE,
    invoice_type VARCHAR(20),             -- 普通/专用
    customer_id INTEGER NOT NULL,
    invoice_date DATE NOT NULL,
    amount DECIMAL(18,2) NOT NULL,
    tax_amount DECIMAL(18,2) DEFAULT 0,
    total_amount DECIMAL(18,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'draft',
    voucher_id INTEGER,                   -- 关联凭证
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 收款单
CREATE TABLE ar_receipt (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_no VARCHAR(50) NOT NULL UNIQUE,
    customer_id INTEGER NOT NULL,
    receipt_date DATE NOT NULL,
    amount DECIMAL(18,2) NOT NULL,
    bank_account VARCHAR(100),
    status VARCHAR(20) DEFAULT 'draft',
    voucher_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 核销记录
CREATE TABLE ar_write_off (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_id INTEGER NOT NULL,
    invoice_id INTEGER NOT NULL,
    amount DECIMAL(18,2) NOT NULL,
    write_off_date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 应付模块表
```sql
-- 采购发票
CREATE TABLE ap_invoice (
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
);

-- 付款单
CREATE TABLE ap_payment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_no VARCHAR(50) NOT NULL UNIQUE,
    supplier_id INTEGER NOT NULL,
    payment_date DATE NOT NULL,
    amount DECIMAL(18,2) NOT NULL,
    bank_account VARCHAR(100),
    status VARCHAR(20) DEFAULT 'draft',
    voucher_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 核销记录
CREATE TABLE ap_write_off (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_id INTEGER NOT NULL,
    invoice_id INTEGER NOT NULL,
    amount DECIMAL(18,2) NOT NULL,
    write_off_date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 固定资产表
```sql
-- 资产类别
CREATE TABLE fa_category (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    depreciation_method VARCHAR(50),      -- 折旧方法
    useful_life INTEGER,                  -- 使用年限
    salvage_rate DECIMAL(5,2),            -- 残值率
    debit_account_id INTEGER,             -- 折旧借方科目
    credit_account_id INTEGER,            -- 折旧贷方科目
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 资产卡片
CREATE TABLE fa_asset (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_no VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    category_id INTEGER NOT NULL,
    department_id INTEGER,
    acquisition_date DATE NOT NULL,
    original_value DECIMAL(18,2) NOT NULL,
    salvage_value DECIMAL(18,2) DEFAULT 0,
    depreciation_method VARCHAR(50),
    useful_life INTEGER,                  -- 使用年限（月）
    used_life INTEGER DEFAULT 0,          -- 已使用月数
    accumulated_depreciation DECIMAL(18,2) DEFAULT 0,
    net_value DECIMAL(18,2),
    status VARCHAR(20) DEFAULT 'normal',  -- normal/transferred/sold/scrapped
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 折旧记录
CREATE TABLE fa_depreciation (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER NOT NULL,
    year INTEGER NOT NULL,
    period INTEGER NOT NULL,
    depreciation_amount DECIMAL(18,2) NOT NULL,
    accumulated_amount DECIMAL(18,2),
    voucher_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(asset_id, year, period)
);

-- 资产变动记录
CREATE TABLE fa_change (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_id INTEGER NOT NULL,
    change_type VARCHAR(20) NOT NULL,     -- 增值/减值/转移/清理
    change_date DATE NOT NULL,
    before_value DECIMAL(18,2),
    after_value DECIMAL(18,2),
    description VARCHAR(500),
    voucher_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 工资模块表
```sql
-- 工资项目
CREATE TABLE hr_salary_item (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(50) NOT NULL,
    item_type VARCHAR(20),                -- 增项/减项
    formula TEXT,                         -- 计算公式
    is_system INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 工资数据
CREATE TABLE hr_salary_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER NOT NULL,
    period INTEGER NOT NULL,
    employee_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    amount DECIMAL(18,2) DEFAULT 0,
    UNIQUE(year, period, employee_id, item_id)
);

-- 工资发放记录
CREATE TABLE hr_salary_payment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    payment_no VARCHAR(50) NOT NULL UNIQUE,
    year INTEGER NOT NULL,
    period INTEGER NOT NULL,
    employee_id INTEGER NOT NULL,
    gross_amount DECIMAL(18,2),           -- 应发合计
    deduct_amount DECIMAL(18,2),          -- 扣款合计
    net_amount DECIMAL(18,2),             -- 实发合计
    payment_date DATE,
    status VARCHAR(20) DEFAULT 'draft',
    voucher_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 现金管理表
```sql
-- 现金日记账
CREATE TABLE cash_journal (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    journal_type VARCHAR(20) NOT NULL,    -- cash/bank
    entry_date DATE NOT NULL,
    voucher_no VARCHAR(50),
    account_code VARCHAR(50),             -- 现金/银行科目
    description VARCHAR(500),
    debit DECIMAL(18,2) DEFAULT 0,
    credit DECIMAL(18,2) DEFAULT 0,
    balance DECIMAL(18,2),
    voucher_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 银行账户
CREATE TABLE cash_bank_account (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_no VARCHAR(50) NOT NULL UNIQUE,
    account_name VARCHAR(100) NOT NULL,
    bank_name VARCHAR(100),
    bank_code VARCHAR(50),
    currency_id INTEGER DEFAULT 1,
    account_id INTEGER,                   -- 关联科目
    is_enabled INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 支票管理
CREATE TABLE cash_check (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    check_no VARCHAR(50) NOT NULL,
    bank_account_id INTEGER NOT NULL,
    check_type VARCHAR(20),               -- cash/transfer
    amount DECIMAL(18,2),
    issue_date DATE,
    due_date DATE,
    payee VARCHAR(200),
    status VARCHAR(20) DEFAULT 'unused',  -- unused/used/cancelled
    voucher_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### 报表模板表
```sql
-- 报表模板
CREATE TABLE rpt_template (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    report_type VARCHAR(20),              -- balance/income/cashflow/custom
    template_data TEXT,                   -- JSON格式模板定义
    is_system INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 报表数据
CREATE TABLE rpt_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    template_id INTEGER NOT NULL,
    year INTEGER NOT NULL,
    period INTEGER NOT NULL,
    report_data TEXT,                     -- JSON格式报表数据
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(template_id, year, period)
);
```

## 五、项目目录结构

```
k3/
├── electron/                      # Electron主进程
│   ├── main.ts                   # 主进程入口
│   ├── preload.ts                # 预加载脚本
│   ├── ipc/                      # IPC通信模块
│   │   ├── index.ts
│   │   ├── account.ts            # 账套管理IPC
│   │   ├── backup.ts             # 备份恢复IPC
│   │   └── print.ts              # 打印服务IPC
│   ├── services/                 # 主进程服务
│   │   ├── database.ts           # 数据库服务
│   │   ├── backup.ts             # 备份服务
│   │   ├── export.ts             # 导出服务
│   │   └── update.ts             # 自动更新服务
│   └── utils/                    # 工具函数
│       ├── path.ts
│       └── security.ts
│
├── src/                          # 渲染进程(Vue3)
│   ├── main.ts                   # Vue入口
│   ├── App.vue
│   ├── views/                    # 页面组件
│   │   ├── login/                # 登录
│   │   ├── dashboard/            # 首页仪表盘
│   │   ├── system/               # 系统管理
│   │   │   ├── user/             # 用户管理
│   │   │   ├── account/          # 账套管理
│   │   │   └── backup/           # 备份恢复
│   │   ├── base/                 # 基础资料
│   │   │   ├── account/          # 会计科目
│   │   │   ├── department/       # 部门
│   │   │   ├── customer/         # 客户
│   │   │   ├── supplier/         # 供应商
│   │   │   └── employee/         # 员工
│   │   ├── gl/                   # 总账
│   │   │   ├── voucher/          # 凭证管理
│   │   │   ├── ledger/           # 账簿查询
│   │   │   └── period/           # 期末处理
│   │   ├── ar/                   # 应收管理
│   │   │   ├── invoice/          # 销售发票
│   │   │   ├── receipt/          # 收款单
│   │   │   └── analysis/         # 账龄分析
│   │   ├── ap/                   # 应付管理
│   │   │   ├── invoice/          # 采购发票
│   │   │   ├── payment/          # 付款单
│   │   │   └── analysis/         # 账龄分析
│   │   ├── fa/                   # 固定资产
│   │   │   ├── card/             # 资产卡片
│   │   │   ├── depreciation/     # 折旧管理
│   │   │   └── report/           # 资产报表
│   │   ├── hr/                   # 工资管理
│   │   │   ├── item/             # 工资项目
│   │   │   ├── data/             # 工资数据
│   │   │   └── payment/          # 工资发放
│   │   ├── cash/                 # 现金管理
│   │   │   ├── journal/          # 日记账
│   │   │   ├── bank/             # 银行对账
│   │   │   └── check/            # 支票管理
│   │   └── report/               # 报表中心
│   │       ├── balance/          # 资产负债表
│   │       ├── income/           # 利润表
│   │       ├── cashflow/         # 现金流量表
│   │       └── custom/           # 自定义报表
│   ├── components/               # 公共组件
│   │   ├── layout/               # 布局组件
│   │   │   ├── AppHeader.vue
│   │   │   ├── AppSidebar.vue
│   │   │   └── AppMain.vue
│   │   ├── business/             # 业务组件
│   │   │   ├── AccountSelect.vue     # 科目选择器
│   │   │   ├── CustomerSelect.vue    # 客户选择器
│   │   │   ├── SupplierSelect.vue    # 供应商选择器
│   │   │   ├── VoucherForm.vue       # 凭证表单
│   │   │   └── ReportViewer.vue      # 报表查看器
│   │   └── common/               # 通用组件
│   │       ├── TablePage.vue
│   │       ├── SearchForm.vue
│   │       └── DialogWrapper.vue
│   ├── stores/                   # 状态管理(Pinia)
│   │   ├── user.ts
│   │   ├── account.ts
│   │   ├── permission.ts
│   │   └── app.ts
│   ├── services/                 # 数据服务
│   │   ├── database.ts           # 数据库操作封装
│   │   ├── gl/                   # 总账服务
│   │   │   ├── account.ts
│   │   │   ├── voucher.ts
│   │   │   └── balance.ts
│   │   ├── ar/                   # 应收服务
│   │   ├── ap/                   # 应付服务
│   │   ├── fa/                   # 固定资产服务
│   │   ├── hr/                   # 工资服务
│   │   ├── cash/                 # 现金管理服务
│   │   └── report/               # 报表服务
│   ├── utils/                    # 工具函数
│   │   ├── number.ts             # 数字处理
│   │   ├── date.ts               # 日期处理
│   │   ├── print.ts              # 打印工具
│   │   └── export.ts             # 导出工具
│   ├── router/                   # 路由配置
│   │   └── index.ts
│   ├── styles/                   # 样式文件
│   │   ├── variables.scss
│   │   └── global.scss
│   └── types/                    # 类型定义
│       ├── global.d.ts
│       ├── gl.d.ts
│       └── ar.d.ts
│
├── database/                      # 数据库相关
│   ├── migrations/               # 迁移脚本
│   │   ├── 001_system.ts
│   │   ├── 002_base.ts
│   │   ├── 003_gl.ts
│   │   └── ...
│   ├── seeds/                    # 种子数据
│   │   ├── accounts.ts           # 预置科目
│   │   └── templates.ts          # 预置报表模板
│   └── init.ts                   # 数据库初始化
│
├── resources/                     # 资源文件
│   ├── icons/                    # 图标
│   ├── templates/                # 报表模板
│   └── print/                    # 打印模板
│
├── scripts/                       # 构建脚本
│   ├── build.ts
│   └── dev.ts
│
├── package.json
├── vite.config.ts
├── tsconfig.json
├── electron-builder.json         # 打包配置
└── README.md
```

## 六、实施阶段规划

### 第一阶段：基础框架搭建（预计1周）
**任务清单：**
1. 项目初始化（Electron + Vue3 + TypeScript）
2. 开发环境配置（Vite、ESLint、Prettier）
3. SQLite数据库封装与初始化
4. 主进程与渲染进程通信桥接
5. 登录界面与用户认证
6. 主界面框架搭建（侧边栏、顶栏、内容区）
7. 多账套管理功能

### 第二阶段：基础资料模块（预计1周）
**任务清单：**
1. 会计科目管理（树形结构、增删改查）
2. 部门管理
3. 币别管理
4. 会计期间设置
5. 客户管理
6. 供应商管理
7. 员工管理

### 第三阶段：总账系统开发（预计2周）
**任务清单：**
1. 凭证录入界面（分录编辑、辅助核算）
2. 凭证审核功能
3. 凭证过账功能（余额更新）
4. 凭证查询与打印
5. 总分类账查询
6. 明细分类账查询
7. 多栏账查询
8. 期末结账功能
9. 损益结转自动生成

### 第四阶段：应收应付系统开发（预计2周）
**任务清单：**
1. 销售发票管理
2. 收款单管理
3. 应收核销处理
4. 应收账龄分析
5. 采购发票管理
6. 付款单管理
7. 应付核销处理
8. 应付账龄分析

### 第五阶段：固定资产系统开发（预计1周）
**任务清单：**
1. 资产类别管理
2. 资产卡片管理
3. 资产折旧计提
4. 资产变动处理
5. 资产报表查询

### 第六阶段：工资系统开发（预计1周）
**任务清单：**
1. 工资项目管理
2. 工资公式设置
3. 工资数据录入
4. 工资计算
5. 工资条打印
6. 工资费用分配

### 第七阶段：现金管理系统（预计1周）
**任务清单：**
1. 现金日记账
2. 银行日记账
3. 银行对账功能
4. 支票管理
5. 资金日报表

### 第八阶段：报表系统（预计1周）
**任务清单：**
1. 资产负债表
2. 利润表
3. 现金流量表
4. 报表取数公式引擎
5. 自定义报表设计器
6. 报表打印与导出

### 第九阶段：系统完善与优化（预计1周）
**任务清单：**
1. 数据备份与恢复
2. Excel导入导出
3. 操作日志记录
4. 系统设置完善
5. 性能优化
6. Bug修复

### 第十阶段：打包发布（预计0.5周）
**任务清单：**
1. 应用图标设计
2. 安装程序制作
3. 自动更新功能
4. 用户手册编写
5. 最终测试

## 七、关键技术要点

### 7.1 凭证处理核心逻辑

```typescript
// 凭证过账核心流程
async function postVoucher(voucherId: number) {
  // 1. 校验凭证借贷平衡
  const entries = await getVoucherEntries(voucherId);
  const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
  const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error('凭证借贷不平衡');
  }
  
  // 2. 更新科目余额
  for (const entry of entries) {
    await updateBalance({
      year: voucher.year,
      period: voucher.period,
      accountId: entry.accountId,
      debit: entry.debit,
      credit: entry.credit,
      // 辅助核算维度
      customerId: entry.customerId,
      supplierId: entry.supplierId,
      // ...
    });
  }
  
  // 3. 更新凭证状态
  await updateVoucherStatus(voucherId, 'posted');
}
```

### 7.2 折旧计算方法

```typescript
// 平均年限法（直线法）
function straightLineDepreciation(
  originalValue: number,
  salvageValue: number,
  usefulLifeMonths: number
): number {
  return (originalValue - salvageValue) / usefulLifeMonths;
}

// 双倍余额递减法
function doubleDecliningDepreciation(
  bookValue: number,
  usefulLifeMonths: number,
  remainingLife: number
): number {
  if (remainingLife <= 2) {
    // 最后两年改为直线法
    return bookValue / remainingLife;
  }
  return bookValue * (2 / usefulLifeMonths);
}

// 年数总和法
function sumOfYearsDepreciation(
  originalValue: number,
  salvageValue: number,
  usefulLifeYears: number,
  currentYear: number
): number {
  const sumOfYears = (usefulLifeYears * (usefulLifeYears + 1)) / 2;
  const remainingLife = usefulLifeYears - currentYear + 1;
  return (originalValue - salvageValue) * (remainingLife / sumOfYears);
}
```

### 7.3 报表取数公式引擎

```typescript
// 取数公式解析
interface FormulaContext {
  year: number;
  period: number;
  accountId?: string;
  customerId?: string;
  // ...
}

// ACCT函数：取科目余额
async function ACCT(
  accountCode: string,
  itemType: 'C' | 'D' | 'J' | 'Y',  // 期初/期末/借方/贷方
  context: FormulaContext
): Promise<number> {
  const account = await getAccountByCode(accountCode);
  const balance = await getBalance({
    year: context.year,
    period: context.period,
    accountId: account.id
  });
  
  switch (itemType) {
    case 'C': return balance.beginDebit - balance.beginCredit;  // 期初
    case 'D': return balance.endDebit - balance.endCredit;      // 期末
    case 'J': return balance.periodDebit;                        // 本期借方
    case 'Y': return balance.periodCredit;                       // 本期贷方
  }
}

// 公式计算引擎
async function evaluateFormula(formula: string, context: FormulaContext): Promise<number> {
  // 解析公式字符串，替换函数调用，计算结果
  // 例如: "ACCT('1001','D') + ACCT('1002','D')"
}
```

### 7.4 数据安全

```typescript
// 密码加密
import { safeStorage } from 'electron';

function encryptPassword(password: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.encryptString(password).toString('base64');
  }
  // 降级方案
  return hashPassword(password);
}

// 数据库加密
import Database from 'better-sqlite3';

const db = new Database('account.k3db', {
  // SQLite加密扩展
  verbose: process.env.NODE_ENV === 'development' ? console.log : undefined
});
```

## 八、开发规范

### 8.1 代码规范
- ESLint + Prettier 代码格式化
- TypeScript 严格模式
- Git提交规范：`feat/fix/docs/style/refactor/test/chore`

### 8.2 命名规范
| 类型 | 规范 | 示例 |
|------|------|------|
| 数据库表 | 小写下划线 | `gl_voucher` |
| 数据库字段 | 小写下划线 | `voucher_no` |
| Vue组件 | 大驼峰 | `VoucherEntry.vue` |
| TypeScript接口 | 大驼峰+I前缀 | `IVoucher` |
| 变量/函数 | 小驼峰 | `voucherList` |
| 常量 | 大写下划线 | `MAX_PAGE_SIZE` |
| CSS类名 | 小写连字符 | `voucher-form` |

### 8.3 组件规范
```vue
<template>
  <!-- 模板内容 -->
</template>

<script setup lang="ts">
// 1. 导入
import { ref, computed, onMounted } from 'vue';
import type { IVoucher } from '@/types/gl';

// 2. Props/Emits
const props = defineProps<{
  voucherId: number;
}>();

const emit = defineEmits<{
  (e: 'submit', data: IVoucher): void;
}>();

// 3. 响应式状态
const loading = ref(false);
const formData = ref<IVoucher>({} as IVoucher);

// 4. 计算属性
const isValid = computed(() => {
  return formData.value.debit === formData.value.credit;
});

// 5. 方法
const handleSubmit = async () => {
  // ...
};

// 6. 生命周期
onMounted(() => {
  loadData();
});
</script>

<style scoped lang="scss">
// 样式
</style>
```

## 九、测试计划

### 9.1 单元测试
- 工具函数测试（数字处理、日期处理）
- 计算逻辑测试（折旧计算、工资计算）
- 公式解析测试

### 9.2 集成测试
- 数据库操作测试
- 凭证处理流程测试
- 报表生成测试

### 9.3 功能测试用例
| 模块 | 测试场景 | 预期结果 |
|------|----------|----------|
| 凭证 | 录入借贷不平衡凭证 | 提示错误，禁止保存 |
| 凭证 | 过账后修改凭证 | 禁止修改，提示已过账 |
| 余额 | 凭证过账后查询余额 | 余额正确更新 |
| 折旧 | 月末计提折旧 | 折旧金额正确，凭证自动生成 |
| 报表 | 生成资产负债表 | 数据准确，借贷平衡 |

## 十、打包发布

### 10.1 打包配置
```json
// electron-builder.json
{
  "appId": "com.k3.finance",
  "productName": "K3财务软件",
  "directories": {
    "output": "release"
  },
  "files": [
    "dist/**/*",
    "electron/**/*"
  ],
  "win": {
    "target": [
      {
        "target": "nsis",
        "arch": ["x64", "ia32"]
      }
    ],
    "icon": "resources/icons/icon.ico"
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true
  }
}
```

### 10.2 自动更新
```typescript
import { autoUpdater } from 'electron-updater';

// 检查更新
autoUpdater.checkForUpdatesAndNotify();

// 更新事件
autoUpdater.on('update-available', () => {
  // 通知渲染进程有新版本
});

autoUpdater.on('update-downloaded', () => {
  // 提示用户安装
});
```

---

**预计总开发周期：约10-12周**

**技术栈总结：**
- 前端：Electron + Vue 3 + TypeScript + Element Plus
- 数据库：SQLite (better-sqlite3)
- 打包：electron-builder
- 图表：ECharts
- 表格：vxe-table
- 打印：hiprint
