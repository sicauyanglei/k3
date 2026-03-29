import { createRouter, createWebHashHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useUserStore } from '@/stores/user'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录', requiresAuth: false }
  },
  {
    path: '/account-select',
    name: 'AccountSelect',
    component: () => import('@/views/login/AccountSelect.vue'),
    meta: { title: '选择账套', requiresAuth: true }
  },
  {
    path: '/',
    component: () => import('@/components/layout/MainLayout.vue'),
    redirect: '/dashboard',
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { title: '首页', icon: 'HomeFilled' }
      },
      {
        path: 'system',
        name: 'System',
        meta: { title: '系统管理', icon: 'Setting' },
        children: [
          {
            path: 'user',
            name: 'User',
            component: () => import('@/views/system/user/index.vue'),
            meta: { title: '用户管理' }
          },
          {
            path: 'account',
            name: 'Account',
            component: () => import('@/views/system/account/index.vue'),
            meta: { title: '账套管理' }
          },
          {
            path: 'backup',
            name: 'Backup',
            component: () => import('@/views/system/backup/index.vue'),
            meta: { title: '备份恢复' }
          }
        ]
      },
      {
        path: 'base',
        name: 'Base',
        meta: { title: '基础资料', icon: 'Folder' },
        children: [
          {
            path: 'account',
            name: 'BaseAccount',
            component: () => import('@/views/base/account/index.vue'),
            meta: { title: '会计科目' }
          },
          {
            path: 'department',
            name: 'Department',
            component: () => import('@/views/base/department/index.vue'),
            meta: { title: '部门管理' }
          },
          {
            path: 'currency',
            name: 'Currency',
            component: () => import('@/views/base/currency/index.vue'),
            meta: { title: '币别管理' }
          },
          {
            path: 'period',
            name: 'Period',
            component: () => import('@/views/base/period/index.vue'),
            meta: { title: '会计期间' }
          },
          {
            path: 'customer',
            name: 'Customer',
            component: () => import('@/views/base/customer/index.vue'),
            meta: { title: '客户管理' }
          },
          {
            path: 'supplier',
            name: 'Supplier',
            component: () => import('@/views/base/supplier/index.vue'),
            meta: { title: '供应商管理' }
          },
          {
            path: 'employee',
            name: 'Employee',
            component: () => import('@/views/base/employee/index.vue'),
            meta: { title: '员工管理' }
          }
        ]
      },
      {
        path: 'gl',
        name: 'GL',
        meta: { title: '总账', icon: 'Notebook' },
        children: [
          {
            path: 'voucher',
            name: 'Voucher',
            component: () => import('@/views/gl/voucher/index.vue'),
            meta: { title: '凭证管理' }
          },
          {
            path: 'voucher/edit/:id?',
            name: 'VoucherEdit',
            component: () => import('@/views/gl/voucher/Edit.vue'),
            meta: { title: '凭证编辑', hidden: true }
          },
          {
            path: 'ledger',
            name: 'Ledger',
            component: () => import('@/views/gl/ledger/index.vue'),
            meta: { title: '总分类账' }
          },
          {
            path: 'detail-ledger',
            name: 'DetailLedger',
            component: () => import('@/views/gl/detail-ledger/index.vue'),
            meta: { title: '明细账' }
          },
          {
            path: 'period-end',
            name: 'PeriodEnd',
            component: () => import('@/views/gl/period-end/index.vue'),
            meta: { title: '期末处理' }
          }
        ]
      },
      {
        path: 'ar',
        name: 'AR',
        meta: { title: '应收管理', icon: 'Money' },
        children: [
          {
            path: 'invoice',
            name: 'ARInvoice',
            component: () => import('@/views/ar/invoice/index.vue'),
            meta: { title: '销售发票' }
          },
          {
            path: 'receipt',
            name: 'Receipt',
            component: () => import('@/views/ar/receipt/index.vue'),
            meta: { title: '收款单' }
          },
          {
            path: 'analysis',
            name: 'ARAnalysis',
            component: () => import('@/views/ar/analysis/index.vue'),
            meta: { title: '账龄分析' }
          }
        ]
      },
      {
        path: 'ap',
        name: 'AP',
        meta: { title: '应付管理', icon: 'Wallet' },
        children: [
          {
            path: 'invoice',
            name: 'APInvoice',
            component: () => import('@/views/ap/invoice/index.vue'),
            meta: { title: '采购发票' }
          },
          {
            path: 'payment',
            name: 'Payment',
            component: () => import('@/views/ap/payment/index.vue'),
            meta: { title: '付款单' }
          },
          {
            path: 'analysis',
            name: 'APAnalysis',
            component: () => import('@/views/ap/analysis/index.vue'),
            meta: { title: '账龄分析' }
          }
        ]
      },
      {
        path: 'fa',
        name: 'FA',
        meta: { title: '固定资产', icon: 'Box' },
        children: [
          {
            path: 'category',
            name: 'AssetCategory',
            component: () => import('@/views/fa/category/index.vue'),
            meta: { title: '资产类别' }
          },
          {
            path: 'card',
            name: 'AssetCard',
            component: () => import('@/views/fa/card/index.vue'),
            meta: { title: '资产卡片' }
          },
          {
            path: 'depreciation',
            name: 'Depreciation',
            component: () => import('@/views/fa/depreciation/index.vue'),
            meta: { title: '折旧管理' }
          },
          {
            path: 'report',
            name: 'FAReport',
            component: () => import('@/views/fa/report/index.vue'),
            meta: { title: '资产报表' }
          }
        ]
      },
      {
        path: 'hr',
        name: 'HR',
        meta: { title: '工资管理', icon: 'User' },
        children: [
          {
            path: 'item',
            name: 'SalaryItem',
            component: () => import('@/views/hr/item/index.vue'),
            meta: { title: '工资项目' }
          },
          {
            path: 'data',
            name: 'SalaryData',
            component: () => import('@/views/hr/data/index.vue'),
            meta: { title: '工资数据' }
          },
          {
            path: 'payment',
            name: 'SalaryPayment',
            component: () => import('@/views/hr/payment/index.vue'),
            meta: { title: '工资发放' }
          }
        ]
      },
      {
        path: 'cash',
        name: 'Cash',
        meta: { title: '现金管理', icon: 'Coin' },
        children: [
          {
            path: 'journal',
            name: 'Journal',
            component: () => import('@/views/cash/journal/index.vue'),
            meta: { title: '日记账' }
          },
          {
            path: 'bank-account',
            name: 'BankAccount',
            component: () => import('@/views/cash/bank-account/index.vue'),
            meta: { title: '银行账户' }
          },
          {
            path: 'bank',
            name: 'BankReconcile',
            component: () => import('@/views/cash/bank/index.vue'),
            meta: { title: '银行对账' }
          },
          {
            path: 'check',
            name: 'CheckManage',
            component: () => import('@/views/cash/check/index.vue'),
            meta: { title: '支票管理' }
          }
        ]
      },
      {
        path: 'report',
        name: 'Report',
        meta: { title: '报表中心', icon: 'DataAnalysis' },
        children: [
          {
            path: 'balance',
            name: 'BalanceSheet',
            component: () => import('@/views/report/balance/index.vue'),
            meta: { title: '资产负债表' }
          },
          {
            path: 'income',
            name: 'IncomeStatement',
            component: () => import('@/views/report/income/index.vue'),
            meta: { title: '利润表' }
          },
          {
            path: 'cashflow',
            name: 'CashFlowStatement',
            component: () => import('@/views/report/cashflow/index.vue'),
            meta: { title: '现金流量表' }
          },
          {
            path: 'custom',
            name: 'CustomReport',
            component: () => import('@/views/report/custom/index.vue'),
            meta: { title: '自定义报表' }
          }
        ]
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const userStore = useUserStore()
  
  if (to.meta.requiresAuth !== false && !userStore.isLoggedIn) {
    next('/login')
  } else if (to.path === '/login' && userStore.isLoggedIn) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router
