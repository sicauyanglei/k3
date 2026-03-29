<template>
  <div class="page-container">
    <div class="search-form">
      <el-form :inline="true" :model="searchForm">
        <el-form-item label="会计科目">
          <el-select v-model="searchForm.accountId" filterable placeholder="请选择科目" style="width: 250px">
            <el-option v-for="acc in accountList" :key="acc.id" :label="`${acc.code} ${acc.name}`" :value="acc.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="会计期间">
          <el-select v-model="searchForm.year" placeholder="年" style="width: 100px">
            <el-option v-for="y in yearOptions" :key="y" :label="y" :value="y" />
          </el-select>
          <span style="margin: 0 5px">年</span>
          <el-select v-model="searchForm.startPeriod" placeholder="起始期间" style="width: 100px">
            <el-option v-for="p in 12" :key="p" :label="`${p}期`" :value="p" />
          </el-select>
          <span style="margin: 0 5px">至</span>
          <el-select v-model="searchForm.endPeriod" placeholder="结束期间" style="width: 100px">
            <el-option v-for="p in 12" :key="p" :label="`${p}期`" :value="p" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handlePrint">打印</el-button>
          <el-button @click="handleExport">导出</el-button>
        </el-form-item>
      </el-form>
    </div>

    <el-card v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>总分类账</span>
          <span class="account-info" v-if="currentAccount">{{ currentAccount.code }} {{ currentAccount.name }}</span>
        </div>
      </template>

      <el-table :data="tableData" border stripe show-summary :summary-method="getSummary" v-if="tableData.length > 0">
        <el-table-column prop="period" label="期间" width="80">
          <template #default="{ row }">{{ row.year }}年{{ row.period }}期</template>
        </el-table-column>
        <el-table-column prop="voucher_word" label="凭证字" width="80" />
        <el-table-column prop="voucher_no" label="凭证号" width="80" />
        <el-table-column prop="description" label="摘要" min-width="200" show-overflow-tooltip />
        <el-table-column label="借方" width="120" align="right">
          <template #default="{ row }">{{ formatMoney(row.debit) }}</template>
        </el-table-column>
        <el-table-column label="贷方" width="120" align="right">
          <template #default="{ row }">{{ formatMoney(row.credit) }}</template>
        </el-table-column>
        <el-table-column label="方向" width="60" align="center">
          <template #default="{ row }">{{ row.direction }}</template>
        </el-table-column>
        <el-table-column label="余额" width="140" align="right">
          <template #default="{ row }">{{ formatMoney(row.balance) }}</template>
        </el-table-column>
      </el-table>

      <el-empty v-else description="请选择科目和期间进行查询" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { exportToExcel, printTable } from '@/utils/export'

const loading = ref(false)
const tableData = ref<any[]>([])
const accountList = ref<any[]>([])
const currentAccount = ref<any>(null)

const yearOptions = computed(() => {
  const years = []
  const currentYear = new Date().getFullYear()
  for (let i = currentYear - 5; i <= currentYear + 1; i++) {
    years.push(i)
  }
  return years
})

const searchForm = reactive({
  accountId: null as number | null,
  year: new Date().getFullYear(),
  startPeriod: 1,
  endPeriod: new Date().getMonth() + 1
})

onMounted(async () => {
  await loadAccounts()
})

async function loadAccounts() {
  const data = await window.api.database.query(
    "SELECT id, code, name, direction FROM bd_account WHERE is_enabled = 1 ORDER BY code"
  )
  accountList.value = data
}

async function handleSearch() {
  if (!searchForm.accountId) {
    ElMessage.warning('请选择会计科目')
    return
  }
  
  loading.value = true
  try {
    currentAccount.value = accountList.value.find(a => a.id === searchForm.accountId)
    
    const entries = await window.api.database.query(
      `SELECT e.*, v.voucher_word, v.voucher_no, v.year, v.period 
       FROM gl_voucher_entry e 
       JOIN gl_voucher v ON e.voucher_id = v.id 
       WHERE e.account_id = ${searchForm.accountId} 
       AND v.year = ${searchForm.year} 
       AND v.period >= ${searchForm.startPeriod} 
       AND v.period <= ${searchForm.endPeriod}
       AND v.status = 'posted'
       ORDER BY v.period, v.voucher_no, e.entry_no`
    )
    
    let beginBalance = 0
    const firstPeriodData = await window.api.database.query(
      `SELECT * FROM gl_balance WHERE account_id = ${searchForm.accountId} AND year = ${searchForm.year} AND period = ${searchForm.startPeriod - 1 > 0 ? searchForm.startPeriod - 1 : 12} AND year = ${searchForm.startPeriod === 1 ? searchForm.year - 1 : searchForm.year}`
    )
    if (firstPeriodData.length > 0) {
      const bal = firstPeriodData[0]
      beginBalance = (bal.end_debit || 0) - (bal.end_credit || 0)
    }
    
    tableData.value = []
    
    tableData.value.push({
      year: searchForm.year,
      period: searchForm.startPeriod,
      voucher_word: '',
      voucher_no: '',
      description: '期初余额',
      debit: 0,
      credit: 0,
      direction: beginBalance >= 0 ? '借' : '贷',
      balance: Math.abs(beginBalance)
    })
    
    let runningBalance = beginBalance
    const accountDirection = currentAccount.value?.direction || 'debit'
    
    for (const entry of entries) {
      if (accountDirection === 'debit') {
        runningBalance += (entry.debit || 0) - (entry.credit || 0)
      } else {
        runningBalance += (entry.credit || 0) - (entry.debit || 0)
      }
      
      tableData.value.push({
        year: entry.year,
        period: entry.period,
        voucher_word: entry.voucher_word,
        voucher_no: entry.voucher_no,
        description: entry.description || '',
        debit: entry.debit || 0,
        credit: entry.credit || 0,
        direction: runningBalance >= 0 ? '借' : '贷',
        balance: Math.abs(runningBalance)
      })
    }
    
  } catch (error: any) {
    ElMessage.error(error.message || '查询失败')
  } finally {
    loading.value = false
  }
}

function getSummary({ columns, data }: any) {
  const sums: string[] = []
  let totalDebit = 0
  let totalCredit = 0
  
  data.forEach((row: any) => {
    totalDebit += row.debit || 0
    totalCredit += row.credit || 0
  })
  
  columns.forEach((column: any, index: number) => {
    if (index === 0) {
      sums[index] = '本期合计'
    } else if (column.property === 'debit') {
      sums[index] = formatMoney(totalDebit)
    } else if (column.property === 'credit') {
      sums[index] = formatMoney(totalCredit)
    } else {
      sums[index] = ''
    }
  })
  return sums
}

function handlePrint() {
  if (tableData.value.length === 0) {
    ElMessage.warning('请先查询数据')
    return
  }
  
  const columns = [
    { field: 'period', title: '期间', width: '12%' },
    { field: 'voucher_word', title: '凭证字', width: '8%' },
    { field: 'voucher_no', title: '凭证号', width: '8%' },
    { field: 'description', title: '摘要', width: '30%' },
    { field: 'debit', title: '借方', width: '14%' },
    { field: 'credit', title: '贷方', width: '14%' },
    { field: 'direction', title: '方向', width: '6%' },
    { field: 'balance', title: '余额', width: '14%' }
  ]
  
  const title = `总分类账 - ${currentAccount.value?.code || ''} ${currentAccount.value?.name || ''}`
  if (printTable(title, tableData.value, columns)) {
    ElMessage.success('打印预览已打开')
  }
}

function handleExport() {
  if (tableData.value.length === 0) {
    ElMessage.warning('请先查询数据')
    return
  }
  
  const exportData = tableData.value.map(row => ({
    期间: `${row.year}年${row.period}期`,
    凭证字: row.voucher_word,
    凭证号: row.voucher_no,
    摘要: row.description,
    借方: row.debit || '',
    贷方: row.credit || '',
    方向: row.direction,
    余额: row.balance || ''
  }))
  
  const filename = `总分类账_${currentAccount.value?.code || ''}_${searchForm.year}年${searchForm.startPeriod}-${searchForm.endPeriod}期`
  if (exportToExcel(exportData, filename)) {
    ElMessage.success('导出成功')
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

.account-info {
  font-weight: normal;
  color: #666;
}
</style>
