<template>
  <div class="page-container">
    <div class="search-form">
      <el-form :inline="true" :model="searchForm">
        <el-form-item label="日记账类型">
          <el-select v-model="searchForm.journalType" style="width: 120px">
            <el-option label="现金日记账" value="cash" />
            <el-option label="银行日记账" value="bank" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期">
          <el-date-picker v-model="searchForm.dateRange" type="daterange" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" style="width: 240px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="table-toolbar">
      <el-button type="primary" @click="handleAdd">
        <el-icon><Plus /></el-icon>
        新增记录
      </el-button>
    </div>

    <el-table :data="tableData" border stripe v-loading="loading" show-summary :summary-method="getSummary">
      <el-table-column prop="entry_date" label="日期" width="110" />
      <el-table-column prop="voucher_no" label="凭证号" width="100" />
      <el-table-column prop="description" label="摘要" min-width="200" show-overflow-tooltip />
      <el-table-column label="收入" width="130" align="right">
        <template #default="{ row }">{{ formatMoney(row.debit) }}</template>
      </el-table-column>
      <el-table-column label="支出" width="130" align="right">
        <template #default="{ row }">{{ formatMoney(row.credit) }}</template>
      </el-table-column>
      <el-table-column label="余额" width="140" align="right">
        <template #default="{ row }">{{ formatMoney(row.balance) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const tableData = ref<any[]>([])

const searchForm = reactive({
  journalType: 'cash',
  dateRange: [] as string[]
})

onMounted(() => {
  loadData()
})

async function loadData() {
  loading.value = true
  try {
    let sql = `SELECT * FROM cash_journal WHERE journal_type = '${searchForm.journalType}'`
    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
      sql += ` AND entry_date BETWEEN '${searchForm.dateRange[0]}' AND '${searchForm.dateRange[1]}'`
    }
    sql += ' ORDER BY entry_date, id'
    const data = await window.api.database.query(sql)
    
    let balance = 0
    tableData.value = data.map((row: any) => {
      balance += (row.debit || 0) - (row.credit || 0)
      return { ...row, balance }
    })
  } catch (error: any) {
    ElMessage.error(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() { loadData() }

async function handleAdd() {
  try {
    const { value } = await ElMessageBox.prompt('请输入收入金额（负数为支出）', '新增记录', {
      inputPattern: /^-?\d+(\.\d+)?$/,
      inputErrorMessage: '请输入有效数字'
    })
    
    const amount = parseFloat(value)
    const today = new Date().toISOString().split('T')[0]
    
    await window.api.database.execute(
      `INSERT INTO cash_journal (journal_type, entry_date, description, debit, credit) VALUES ('${searchForm.journalType}', '${today}', '${amount >= 0 ? '收入' : '支出'}', ${amount >= 0 ? amount : 0}, ${amount < 0 ? -amount : 0})`
    )
    
    ElMessage.success('添加成功')
    loadData()
  } catch (e) {}
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm('确定要删除该记录吗？', '提示', { type: 'warning' })
    await window.api.database.execute(`DELETE FROM cash_journal WHERE id = ${row.id}`)
    ElMessage.success('删除成功')
    loadData()
  } catch (e) {}
}

function getSummary({ columns, data }: any) {
  const sums: string[] = []
  let balance = 0
  data.forEach((row: any) => {
    balance += (row.debit || 0) - (row.credit || 0)
  })
  
  columns.forEach((column: any, index: number) => {
    if (index === 0) {
      sums[index] = '本期合计'
    } else if (column.property === 'debit') {
      const total = data.reduce((sum: number, row: any) => sum + (row.debit || 0), 0)
      sums[index] = formatMoney(total)
    } else if (column.property === 'credit') {
      const total = data.reduce((sum: number, row: any) => sum + (row.credit || 0), 0)
      sums[index] = formatMoney(total)
    } else if (column.property === 'balance') {
      sums[index] = formatMoney(balance)
    } else {
      sums[index] = ''
    }
  })
  return sums
}

function formatMoney(v: number) {
  return '¥' + (v || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })
}
</script>
