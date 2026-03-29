<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>利润表</span>
          <div>
            <el-date-picker v-model="reportDate" type="month" placeholder="选择月份" value-format="YYYY-MM" style="width: 150px; margin-right: 10px" />
            <el-button type="primary" @click="handleGenerate">生成报表</el-button>
            <el-button @click="handleExport">导出</el-button>
            <el-button @click="handlePrint">打印</el-button>
          </div>
        </div>
      </template>

      <el-table :data="tableData" border stripe v-loading="loading" size="small">
        <el-table-column prop="item" label="项目" min-width="200" />
        <el-table-column prop="line" label="行次" width="80" align="center" />
        <el-table-column label="本期金额" width="150" align="right">
          <template #default="{ row }">{{ formatMoney(row.currentAmount) }}</template>
        </el-table-column>
        <el-table-column label="本年累计金额" width="150" align="right">
          <template #default="{ row }">{{ formatMoney(row.yearAmount) }}</template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { exportToExcel, printTable } from '@/utils/export'

const loading = ref(false)
const tableData = ref<any[]>([])
const reportDate = ref(new Date().toISOString().slice(0, 7))

onMounted(() => {
  handleGenerate()
})

async function handleGenerate() {
  loading.value = true
  try {
    const [year, month] = reportDate.value.split('-').map(Number)
    const period = month
    
    const balances = await window.api.database.query(
      `SELECT a.code, a.name, b.period_debit, b.period_credit, b.year_debit, b.year_credit 
       FROM gl_balance b 
       JOIN bd_account a ON b.account_id = a.id 
       WHERE b.year = ${year} AND b.period = ${period}`
    )
    
    const balanceMap = new Map<string, any>()
    for (const bal of balances) {
      balanceMap.set(bal.code, bal)
    }
    
    const revenue = getBalance(balanceMap, ['6001', '6051'], 'credit')
    const cost = getBalance(balanceMap, ['6401'], 'debit')
    const taxExpense = getBalance(balanceMap, ['6403'], 'debit')
    const salesExpense = getBalance(balanceMap, ['6601'], 'debit')
    const adminExpense = getBalance(balanceMap, ['6602'], 'debit')
    const financeExpense = getBalance(balanceMap, ['6603'], 'debit')
    const incomeTax = getBalance(balanceMap, ['6801'], 'debit')
    
    const operatingProfit = revenue - cost - taxExpense - salesExpense - adminExpense - financeExpense
    const netProfit = operatingProfit - incomeTax
    
    tableData.value = [
      { item: '一、营业收入', line: '1', currentAmount: revenue, yearAmount: revenue },
      { item: '  减：营业成本', line: '2', currentAmount: cost, yearAmount: cost },
      { item: '      税金及附加', line: '3', currentAmount: taxExpense, yearAmount: taxExpense },
      { item: '      销售费用', line: '4', currentAmount: salesExpense, yearAmount: salesExpense },
      { item: '      管理费用', line: '5', currentAmount: adminExpense, yearAmount: adminExpense },
      { item: '      财务费用', line: '6', currentAmount: financeExpense, yearAmount: financeExpense },
      { item: '二、营业利润（亏损以"-"号填列）', line: '7', currentAmount: operatingProfit, yearAmount: operatingProfit },
      { item: '  加：营业外收入', line: '8', currentAmount: 0, yearAmount: 0 },
      { item: '  减：营业外支出', line: '9', currentAmount: 0, yearAmount: 0 },
      { item: '三、利润总额（亏损总额以"-"号填列）', line: '10', currentAmount: operatingProfit, yearAmount: operatingProfit },
      { item: '  减：所得税费用', line: '11', currentAmount: incomeTax, yearAmount: incomeTax },
      { item: '四、净利润（净亏损以"-"号填列）', line: '12', currentAmount: netProfit, yearAmount: netProfit }
    ]
  } catch (error: any) {
    ElMessage.error(error.message || '生成失败')
  } finally {
    loading.value = false
  }
}

function getBalance(map: Map<string, any>, codes: string[], type: 'debit' | 'credit'): number {
  let total = 0
  for (const code of codes) {
    const bal = map.get(code)
    if (bal) {
      total += type === 'debit' ? (bal.period_debit || 0) : (bal.period_credit || 0)
    }
  }
  return total
}

function handleExport() {
  const exportData = tableData.value.map(row => ({
    项目: row.item,
    行次: row.line,
    本期金额: row.currentAmount || '',
    本年累计金额: row.yearAmount || ''
  }))
  
  if (exportToExcel(exportData, '利润表')) {
    ElMessage.success('导出成功')
  }
}

function handlePrint() {
  const columns = [
    { field: 'item', title: '项目', width: '50%' },
    { field: 'line', title: '行次', width: '10%' },
    { field: 'currentAmount', title: '本期金额', width: '20%' },
    { field: 'yearAmount', title: '本年累计金额', width: '20%' }
  ]
  
  if (printTable('利润表', tableData.value, columns)) {
    ElMessage.success('打印预览已打开')
  }
}

function formatMoney(v: number) {
  if (!v) return ''
  return v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
