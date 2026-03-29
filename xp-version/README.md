# 金蝶财务软件 K3 - Windows XP 版本

## 系统要求

- **操作系统**: Windows XP SP3 / Windows 7 / Windows 10
- **内存**: 512MB 以上
- **硬盘**: 100MB 可用空间

## 技术架构

本项目使用 **NW.js 0.14.7** (最后支持 Windows XP 的版本) 开发：

| 组件 | 版本 |
|------|------|
| NW.js | 0.14.7 |
| Chromium | 50 |
| Node.js | 5.11.0 |
| sql.js | 1.8.0 |

## 安装步骤

### 1. 下载 NW.js 0.14.7

从以下地址下载对应系统的 NW.js：

- 官方: https://dl.nwjs.io/v0.14.7/
- Windows 32位: https://dl.nwjs.io/v0.14.7/nwjs-v0.14.7-win-ia32.zip
- Windows 64位: https://dl.nwjs.io/v0.14.7/nwjs-v0.14.7-win-x64.zip

### 2. 部署应用

1. 解压 NW.js 到任意目录
2. 将 `xp-version` 文件夹中的所有文件复制到 NW.js 目录下
3. 下载 sql.js:
   - 访问 https://github.com/sql-js/sql.js/releases
   - 下载 sql.js 1.8.0 版本
   - 将 `sql-wasm.js` 和 `sql-wasm.wasm` 复制到 `lib` 目录

### 3. 运行应用

双击 `nw.exe` 启动应用

或者在命令行运行：
```
nw.exe .
```

## 目录结构

```
xp-version/
├── package.json        # NW.js 配置文件
├── index.html          # 主页面
├── css/
│   ├── reset.css       # 样式重置
│   ├── layout.css      # 布局样式
│   └── components.css  # 组件样式
├── js/
│   ├── database.js     # 数据库模块
│   ├── utils.js        # 工具函数
│   ├── router.js       # 路由模块
│   └── app.js          # 主应用
├── lib/
│   ├── sql-wasm.js     # sql.js 库
│   └── sql-wasm.wasm   # sql.js WASM
└── assets/
    ├── logo.png        # 应用图标
    └── logo-small.png  # 小图标
```

## 功能模块

### 基础资料
- 会计科目管理
- 部门管理
- 客户管理
- 供应商管理

### 总账系统
- 凭证录入
- 总账查询

### 报表中心
- 资产负债表
- 利润表

## 默认账号

- 用户名: `admin`
- 密码: `admin`

## 数据存储

数据存储在用户目录下：
- Windows: `C:\Users\用户名\k3-finance-xp\data\`
- 或应用所在目录的 `data` 文件夹

## 与主版本的区别

| 特性 | 主版本 (Electron) | XP版本 (NW.js) |
|------|------------------|----------------|
| 运行环境 | Windows 10+ | Windows XP+ |
| 界面框架 | Vue 3 | 原生 JavaScript |
| UI组件 | Element Plus | 自定义 CSS |
| 构建工具 | Vite | 无需构建 |
| 数据库 | sql.js | sql.js |

## 注意事项

1. NW.js 0.14.7 使用 Chromium 50，部分 ES6+ 语法可能不支持
2. 建议使用 ES5 语法或经过 Babel 转译
3. sql.js 需要手动下载并放置到 lib 目录

## 开发说明

如需修改代码，直接编辑 `js` 目录下的文件即可，无需编译。

## 打包发布

使用 NW.js 打包工具：
```
nwbuild -p win32 -o dist .
```

或手动打包：
1. 将应用文件打包成 `app.nw`
2. 与 `nw.exe` 一起分发
