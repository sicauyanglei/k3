<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>资产负债表</span>
          <div>
            <el-date-picker v-model="reportDate" type="month" placeholder="选择月份" value-format="YYYY-MM" style="width: 150px; margin-right: 10px" />
            <el-button type="primary" @click="handleGenerate">生成报表</el-button>
            <el-button @click="handleExport">导出</el-button>
            <el-button @click="handlePrint">打印</el-button>
          </div>
        </div>
      </template>

      <el-table :data="tableData" border stripe v-loading="loading" size="small" id="balanceTable">
        <el-table-column prop="asset_item" label="资产" width="200" />
        <el-table-column prop="asset_line" label="行次" width="60" align="center" />
        <el-table-column label="期末余额" width="150" align="right">
          <template #default="{ row }">{{ formatMoney(row.asset_end) }}</template>
        </el-table-column>
        <el-table-column label="年初余额" width="150" align="right">
          <template #default="{ row }">{{ formatMoney(row.asset_begin) }}</template>
        </el-table-column>
        <el-table-column prop="liability_item" label="负债和所有者权益" width="200" />
        <el-table-column prop="liability_line" label="行次" width="60" align="center" />
        <el-table-column label="期末余额" width="150" align="right">
          <template #default="{ row }">{{ formatMoney(row.liability_end) }}</template>
        </el-table-column>
        <el-table-column label="年初余额" width="150" align="right">
          <template #default="{ row }">{{ formatMoney(row.liability_begin) }}</template>
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
      `SELECT a.code, a.name, a.category, b.end_debit, b.end_credit, b.begin_debit, b.begin_credit 
       FROM gl_balance b 
       JOIN bd_account a ON b.account_id = a.id 
       WHERE b.year = ${year} AND b.period = ${period}`
    )
    
    const balanceMap = new Map<string, any>()
    for (const bal of balances) {
      balanceMap.set(bal.code, bal)
    }
    
    tableData.value = [
      { asset_item: '流动资产：', asset_line: '', asset_end: '', asset_begin: '', liability_item: '流动负债：', liability_line: '', liability_end: '', liability_begin: '' },
      { asset_item: '  货币资金', asset_line: '1', asset_end: getBalance(balanceMap, ['1001', '1002', '1012'], 'debit'), asset_begin: 0, liability_item: '  短期借款', liability_line: '32', liability_end: getBalance(balanceMap, ['2001'], 'credit'), liability_begin: 0 },
      { asset_item: '  应收票据', asset_line: '2', asset_end: getBalance(balanceMap, ['1121'], 'debit'), asset_begin: 0, liability_item: '  应付票据', liability_line: '33', liability_end: getBalance(balanceMap, ['2201'], 'credit'), liability_begin: 0 },
      { asset_item: '  应收账款', asset_line: '3', asset_end: getBalance(balanceMap, ['1122'], 'debit'), asset_begin: 0, liability_item: '  应付账款', liability_line: '34', liability_end: getBalance(balanceMap, ['2202'], 'credit'), liability_begin: 0 },
      { asset_item: '  预付账款', asset_line: '4', asset_end: getBalance(balanceMap, ['1123'], 'debit'), asset_begin: 0, liability_item: '  预收账款', liability_line: '35', liability_end: getBalance(balanceMap, ['2203'], 'credit'), liability_begin: 0 },
      { asset_item: '  其他应收款', asset_line: '5', asset_end: getBalance(balanceMap, ['1221'], 'debit'), asset_begin: 0, liability_item: '  应付职工薪酬', liability_line: '36', liability_end: getBalance(balanceMap, ['2211'], 'credit'), liability_begin: 0 },
      { asset_item: '  存货', asset_line: '6', asset_end: getBalance(balanceMap, ['1401', '1403', '1405'], 'debit'), asset_begin: 0, liability_item: '  应交税费', liability_line: '37', liability_end: getBalance(balanceMap, ['2221'], 'credit'), liability_begin: 0 },
      { asset_item: '流动资产合计', asset_line: '7', asset_end: '', asset_begin: '', liability_item: '流动负债合计', liability_line: '38', liability_end: '', liability_begin: '' },
      { asset_item: '非流动资产：', asset_line: '', asset_end: '', asset_begin: '', liability_item: '非流动负债：', liability_line: '', liability_end: '', liability_begin: '' },
      { asset_item: '  固定资产', asset_line: '8', asset_end: getBalance(balanceMap, ['1601'], 'debit') - getBalance(balanceMap, ['1602'], 'credit'), asset_begin: 0, liability_item: '  长期借款', liability_line: '39', liability_end: getBalance(balanceMap, ['2501'], 'credit'), liability_begin: 0 },
      { asset_item: '  无形资产', asset_line: '9', asset_end: getBalance(balanceMap, ['1701'], 'debit') - getBalance(balanceMap, ['1702'], 'credit'), asset_begin: 0, liability_item: '非流动负债合计', liability_line: '40', liability_end: '', liability_begin: '' },
      { asset_item: '非流动资产合计', asset_line: '10', asset_end: '', asset_begin: '', liability_item: '负债合计', liability_line: '41', liability_end: '', liability_begin: '' },
      { asset_item: '', asset_line: '', asset_end: '', asset_begin: '', liability_item: '所有者权益：', liability_line: '', liability_end: '', liability_begin: '' },
      { asset_item: '', asset_line: '', asset_end: '', asset_begin: '', liability_item: '  实收资本', liability_line: '42', liability_end: getBalance(balanceMap, ['4001'], 'credit'), liability_begin: 0 },
      { asset_item: '', asset_line: '', asset_end: '', asset_begin: '', liability_item: '  资本公积', liability_line: '43', liability_end: getBalance(balanceMap, ['4002'], 'credit'), liability_begin: 0 },
      { asset_item: '', asset_line: '', asset_end: '', asset_begin: '', liability_item: '  盈余公积', liability_line: '44', liability_end: getBalance(balanceMap, ['4101'], 'credit'), liability_begin: 0 },
      { asset_item: '', asset_line: '', asset_end: '', asset_begin: '', liability_item: '  未分配利润', liability_line: '45', liability_end: getBalance(balanceMap, ['4103', '4104'], 'credit'), liability_begin: 0 },
      { asset_item: '', asset_line: '', asset_end: '', asset_begin: '', liability_item: '所有者权益合计', liability_line: '46', liability_end: '', liability_begin: '' },
      { asset_item: '资产总计', asset_line: '11', asset_end: '', asset_begin: '', liability_item: '负债和所有者权益总计', liability_line: '47', liability_end: '', liability_begin: '' }
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
      total += type === 'debit' ? (bal.end_debit || 0) : (bal.end_credit || 0)
    }
  }
  return total
}

function handleExport() {
  const exportData = tableData.value.map(row => ({
    资产: row.asset_item,
    行次: row.asset_line,
    期末余额: row.asset_end || '',
    年初余额: row.asset_begin || '',
    负债和所有者权益: row.liability_item,
    行次2: row.liability_line,
    期末余额2: row.liability_end || '',
    年初余额2: row.liability_begin || ''
  }))
  
  if (exportToExcel(exportData, '资产负债表')) {
    ElMessage.success('导出成功')
  }
}

function handlePrint() {
  const columns = [
    { field: 'asset_item', title: '资产', width: '20%' },
    { field: 'asset_line', title: '行次', width: '8%' },
    { field: 'asset_end', title: '期末余额', width: '12%' },
    { field: 'asset_begin', title: '年初余额', width: '12%' },
    { field: 'liability_item', title: '负债和所有者权益', width: '20%' },
    { field: 'liability_line', title: '行次', width: '8%' },
    { field: 'liability_end', title: '期末余额', width: '10%' },
    { field: 'liability_begin', title: '年初余额', width: '10%' }
  ]
  
  if (printTable('资产负债表', tableData.value, columns)) {
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
