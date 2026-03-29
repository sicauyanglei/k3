<template>
  <div class="dashboard-container">
    <el-row :gutter="16">
      <el-col :span="6">
        <div class="stat-card" @click="navigateTo('/gl/ledger')">
          <div class="stat-icon" style="background-color: #409eff;">
            <el-icon size="28"><Wallet /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ formatMoney(summary.totalAssets) }}</div>
            <div class="stat-label">资产总额</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card" @click="navigateTo('/report/income')">
          <div class="stat-icon" style="background-color: #67c23a;">
            <el-icon size="28"><TrendCharts /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ formatMoney(summary.totalRevenue) }}</div>
            <div class="stat-label">本期收入</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card" @click="navigateTo('/report/income')">
          <div class="stat-icon" style="background-color: #e6a23c;">
            <el-icon size="28"><Money /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ formatMoney(summary.totalExpense) }}</div>
            <div class="stat-label">本期支出</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card" @click="navigateTo('/report/income')">
          <div class="stat-icon" style="background-color: #f56c6c;">
            <el-icon size="28"><DataAnalysis /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-value">{{ formatMoney(summary.totalProfit) }}</div>
            <div class="stat-label">本期利润</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="mt-16">
      <el-col :span="16">
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">收支趋势</span>
            <el-select v-model="chartYear" size="small" style="width: 100px" @change="loadChartData">
              <el-option v-for="y in yearOptions" :key="y" :label="`${y}年`" :value="y" />
            </el-select>
          </div>
          <div class="panel-body">
            <div ref="chartRef" class="chart-container"></div>
          </div>
        </div>
      </el-col>
      <el-col :span="8">
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">待办事项</span>
          </div>
          <div class="panel-body">
            <div class="todo-list">
              <div class="todo-item" v-for="item in todoList" :key="item.id" @click="navigateTo(item.path)">
                <el-icon :class="item.type"><component :is="item.icon" /></el-icon>
                <span class="todo-text">{{ item.text }}</span>
                <el-tag :type="item.type" size="small">{{ item.count }}</el-tag>
              </div>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="mt-16">
      <el-col :span="12">
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">应收账款账龄</span>
            <el-button type="primary" link @click="navigateTo('/ar/analysis')">查看详情</el-button>
          </div>
          <div class="panel-body">
            <div ref="arChartRef" class="chart-container-small"></div>
          </div>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">应付账款账龄</span>
            <el-button type="primary" link @click="navigateTo('/ap/analysis')">查看详情</el-button>
          </div>
          <div class="panel-body">
            <div ref="apChartRef" class="chart-container-small"></div>
          </div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="16" class="mt-16">
      <el-col :span="12">
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">最近凭证</span>
            <el-button type="primary" link @click="navigateTo('/gl/voucher')">查看全部</el-button>
          </div>
          <div class="panel-body">
            <el-table :data="recentVouchers" size="small" v-loading="voucherLoading">
              <el-table-column prop="voucher_word" label="字" width="60" />
              <el-table-column prop="voucher_no" label="号" width="80" />
              <el-table-column prop="voucher_date" label="日期" width="100" />
              <el-table-column prop="description" label="摘要" show-overflow-tooltip />
              <el-table-column label="金额" width="120" align="right">
                <template #default="{ row }">{{ formatMoney(row.total_amount) }}</template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </el-col>
      <el-col :span="12">
        <div class="panel">
          <div class="panel-header">
            <span class="panel-title">系统公告</span>
          </div>
          <div class="panel-body">
            <el-timeline>
              <el-timeline-item timestamp="2024-01-15" placement="top">
                <el-card shadow="never">
                  <h4>系统上线</h4>
                  <p>金蝶财务系统正式上线运行</p>
                </el-card>
              </el-timeline-item>
              <el-timeline-item timestamp="2024-01-10" placement="top">
                <el-card shadow="never">
                  <h4>数据初始化</h4>
                  <p>完成基础资料和会计科目的初始化</p>
                </el-card>
              </el-timeline-item>
            </el-timeline>
          </div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'

const router = useRouter()

const chartRef = ref<HTMLElement>()
const arChartRef = ref<HTMLElement>()
const apChartRef = ref<HTMLElement>()

const chartYear = ref(new Date().getFullYear())
const voucherLoading = ref(false)
const recentVouchers = ref<any[]>([])

const yearOptions = computed(() => {
  const years = []
  const currentYear = new Date().getFullYear()
  for (let i = currentYear - 2; i <= currentYear; i++) {
    years.push(i)
  }
  return years
})

const summary = reactive({
  totalAssets: 0,
  totalRevenue: 0,
  totalExpense: 0,
  totalProfit: 0
})

const todoList = ref([
  { id: 1, text: '待审核凭证', icon: 'Document', type: 'warning' as const, count: 0, path: '/gl/voucher' },
  { id: 2, text: '待处理发票', icon: 'Tickets', type: 'danger' as const, count: 0, path: '/ar/invoice' },
  { id: 3, text: '待计提折旧', icon: 'Box', type: 'info' as const, count: 0, path: '/fa/depreciation' },
  { id: 4, text: '待发放工资', icon: 'User', type: 'success' as const, count: 0, path: '/hr/payment' }
])

onMounted(() => {
  loadSummaryData()
  loadChartData()
  loadTodoData()
  loadRecentVouchers()
  initArChart()
  initApChart()
})

async function loadSummaryData() {
  try {
    const year = new Date().getFullYear()
    const period = new Date().getMonth() + 1
    
    const assetData = await window.api.database.query(
      `SELECT SUM(end_debit) - SUM(end_credit) as total FROM gl_balance WHERE year = ${year} AND period = ${period} AND account_id IN (SELECT id FROM bd_account WHERE category = 'asset')`
    )
    summary.totalAssets = assetData[0]?.total || 0
    
    const revenueData = await window.api.database.query(
      `SELECT SUM(period_credit) as total FROM gl_balance WHERE year = ${year} AND period = ${period} AND account_id IN (SELECT id FROM bd_account WHERE code LIKE '6%')`
    )
    summary.totalRevenue = revenueData[0]?.total || 0
    
    const expenseData = await window.api.database.query(
      `SELECT SUM(period_debit) as total FROM gl_balance WHERE year = ${year} AND period = ${period} AND account_id IN (SELECT id FROM bd_account WHERE code LIKE '6%')`
    )
    summary.totalExpense = expenseData[0]?.total || 0
    
    summary.totalProfit = summary.totalRevenue - summary.totalExpense
  } catch (error) {
    console.error('加载汇总数据失败', error)
  }
}

async function loadChartData() {
  try {
    const revenueData = await window.api.database.query(
      `SELECT period, SUM(period_credit) as amount FROM gl_balance WHERE year = ${chartYear.value} AND account_id IN (SELECT id FROM bd_account WHERE code LIKE '6001%' OR code LIKE '6051%') GROUP BY period`
    )
    
    const expenseData = await window.api.database.query(
      `SELECT period, SUM(period_debit) as amount FROM gl_balance WHERE year = ${chartYear.value} AND account_id IN (SELECT id FROM bd_account WHERE code LIKE '64%' OR code LIKE '66%') GROUP BY period`
    )
    
    const revenueMap = new Map(revenueData.map((r: any) => [r.period, r.amount || 0]))
    const expenseMap = new Map(expenseData.map((r: any) => [r.period, r.amount || 0]))
    
    const revenues: number[] = []
    const expenses: number[] = []
    const profits: number[] = []
    
    for (let i = 1; i <= 12; i++) {
      const rev = revenueMap.get(i) || 0
      const exp = expenseMap.get(i) || 0
      revenues.push(rev / 10000)
      expenses.push(exp / 10000)
      profits.push((rev - exp) / 10000)
    }
    
    initMainChart(revenues, expenses, profits)
  } catch (error) {
    console.error('加载图表数据失败', error)
    initMainChart([], [], [])
  }
}

async function loadTodoData() {
  try {
    const unpostedVouchers = await window.api.database.query(
      `SELECT COUNT(*) as cnt FROM gl_voucher WHERE status = 'draft'`
    )
    todoList.value[0].count = unpostedVouchers[0]?.cnt || 0
    
    const pendingInvoices = await window.api.database.query(
      `SELECT COUNT(*) as cnt FROM ar_invoice WHERE status = 'draft'`
    )
    todoList.value[1].count = pendingInvoices[0]?.cnt || 0
    
    const assetsToDepreciate = await window.api.database.query(
      `SELECT COUNT(*) as cnt FROM fa_asset WHERE status = 'normal'`
    )
    todoList.value[2].count = assetsToDepreciate[0]?.cnt || 0
    
    const pendingPayments = await window.api.database.query(
      `SELECT COUNT(*) as cnt FROM hr_salary_payment WHERE status = 'draft'`
    )
    todoList.value[3].count = pendingPayments[0]?.cnt || 0
  } catch (error) {
    console.error('加载待办数据失败', error)
  }
}

async function loadRecentVouchers() {
  voucherLoading.value = true
  try {
    const data = await window.api.database.query(
      `SELECT v.*, 
        (SELECT SUM(debit) FROM gl_voucher_entry WHERE voucher_id = v.id) as debit_total,
        (SELECT SUM(credit) FROM gl_voucher_entry WHERE voucher_id = v.id) as credit_total,
        (SELECT description FROM gl_voucher_entry WHERE voucher_id = v.id LIMIT 1) as description
       FROM gl_voucher v 
       ORDER BY v.created_at DESC 
       LIMIT 5`
    )
    recentVouchers.value = data.map((v: any) => ({
      ...v,
      total_amount: v.debit_total || v.credit_total || 0
    }))
  } catch (error) {
    console.error('加载最近凭证失败', error)
  } finally {
    voucherLoading.value = false
  }
}

function initMainChart(revenues: number[], expenses: number[], profits: number[]) {
  if (!chartRef.value) return
  const chart = echarts.init(chartRef.value)
  
  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        let result = params[0].axisValue + '<br/>'
        params.forEach((item: any) => {
          result += `${item.marker}${item.seriesName}: ${item.value.toFixed(2)}万元<br/>`
        })
        return result
      }
    },
    legend: {
      data: ['收入', '支出', '利润']
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
    },
    yAxis: {
      type: 'value',
      name: '单位：万元'
    },
    series: [
      {
        name: '收入',
        type: 'line',
        smooth: true,
        data: revenues.length > 0 ? revenues : Array(12).fill(0),
        itemStyle: { color: '#67c23a' }
      },
      {
        name: '支出',
        type: 'line',
        smooth: true,
        data: expenses.length > 0 ? expenses : Array(12).fill(0),
        itemStyle: { color: '#e6a23c' }
      },
      {
        name: '利润',
        type: 'bar',
        data: profits.length > 0 ? profits : Array(12).fill(0),
        itemStyle: { color: '#409eff' }
      }
    ]
  }
  
  chart.setOption(option)
}

async function initArChart() {
  if (!arChartRef.value) return
  const chart = echarts.init(arChartRef.value)
  
  try {
    const data = await window.api.database.query(
      `SELECT 
        SUM(CASE WHEN julianday('now') - julianday(invoice_date) <= 30 THEN total_amount ELSE 0 END) as days30,
        SUM(CASE WHEN julianday('now') - julianday(invoice_date) > 30 AND julianday('now') - julianday(invoice_date) <= 60 THEN total_amount ELSE 0 END) as days60,
        SUM(CASE WHEN julianday('now') - julianday(invoice_date) > 60 AND julianday('now') - julianday(invoice_date) <= 90 THEN total_amount ELSE 0 END) as days90,
        SUM(CASE WHEN julianday('now') - julianday(invoice_date) > 90 THEN total_amount ELSE 0 END) as over90
       FROM ar_invoice WHERE status != 'cancelled'`
    )
    
    const option = {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)'
      },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          data: [
            { value: data[0]?.days30 || 0, name: '30天内' },
            { value: data[0]?.days60 || 0, name: '30-60天' },
            { value: data[0]?.days90 || 0, name: '60-90天' },
            { value: data[0]?.over90 || 0, name: '90天以上' }
          ]
        }
      ]
    }
    
    chart.setOption(option)
  } catch (error) {
    chart.setOption({
      tooltip: { trigger: 'item' },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        data: [
          { value: 0, name: '30天内' },
          { value: 0, name: '30-60天' },
          { value: 0, name: '60-90天' },
          { value: 0, name: '90天以上' }
        ]
      }]
    })
  }
}

async function initApChart() {
  if (!apChartRef.value) return
  const chart = echarts.init(apChartRef.value)
  
  try {
    const data = await window.api.database.query(
      `SELECT 
        SUM(CASE WHEN julianday('now') - julianday(invoice_date) <= 30 THEN total_amount ELSE 0 END) as days30,
        SUM(CASE WHEN julianday('now') - julianday(invoice_date) > 30 AND julianday('now') - julianday(invoice_date) <= 60 THEN total_amount ELSE 0 END) as days60,
        SUM(CASE WHEN julianday('now') - julianday(invoice_date) > 60 AND julianday('now') - julianday(invoice_date) <= 90 THEN total_amount ELSE 0 END) as days90,
        SUM(CASE WHEN julianday('now') - julianday(invoice_date) > 90 THEN total_amount ELSE 0 END) as over90
       FROM ap_invoice WHERE status != 'cancelled'`
    )
    
    const option = {
      tooltip: {
        trigger: 'item',
        formatter: '{b}: {c} ({d}%)'
      },
      series: [
        {
          type: 'pie',
          radius: ['40%', '70%'],
          data: [
            { value: data[0]?.days30 || 0, name: '30天内' },
            { value: data[0]?.days60 || 0, name: '30-60天' },
            { value: data[0]?.days90 || 0, name: '60-90天' },
            { value: data[0]?.over90 || 0, name: '90天以上' }
          ]
        }
      ]
    }
    
    chart.setOption(option)
  } catch (error) {
    chart.setOption({
      tooltip: { trigger: 'item' },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        data: [
          { value: 0, name: '30天内' },
          { value: 0, name: '30-60天' },
          { value: 0, name: '60-90天' },
          { value: 0, name: '90天以上' }
        ]
      }]
    })
  }
}

function navigateTo(path: string) {
  router.push(path)
}

function formatMoney(value: number) {
  return '¥' + (value || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>

<style scoped lang="scss">
@use '@/styles/variables.scss' as *;

.dashboard-container {
  padding: 0;
}

.stat-card {
  display: flex;
  align-items: center;
  padding: 20px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}

.stat-icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: #fff;
  margin-right: 16px;
}

.stat-info {
  .stat-value {
    font-size: 24px;
    font-weight: 600;
    color: $text-primary;
    margin-bottom: 4px;
  }
  
  .stat-label {
    font-size: 14px;
    color: $text-secondary;
  }
}

.panel {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.panel-header {
  padding: 16px 20px;
  border-bottom: 1px solid $border-color-lighter;
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  .panel-title {
    font-size: 16px;
    font-weight: 500;
    color: $text-primary;
  }
}

.panel-body {
  padding: 20px;
}

.chart-container {
  height: 300px;
}

.chart-container-small {
  height: 200px;
}

.todo-list {
  .todo-item {
    display: flex;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid $border-color-lighter;
    cursor: pointer;
    
    &:last-child {
      border-bottom: none;
    }
    
    &:hover {
      background-color: #f5f7fa;
    }
    
    .el-icon {
      font-size: 20px;
      margin-right: 12px;
      
      &.warning {
        color: $warning-color;
      }
      
      &.danger {
        color: $danger-color;
      }
      
      &.info {
        color: $info-color;
      }
      
      &.success {
        color: $success-color;
      }
    }
    
    .todo-text {
      flex: 1;
      font-size: 14px;
      color: $text-regular;
    }
  }
}

.mt-16 {
  margin-top: 16px;
}
</style>
