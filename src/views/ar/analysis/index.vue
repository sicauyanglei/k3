<template>
  <div class="page-container">
    <div class="search-form">
      <el-form :inline="true" :model="searchForm">
        <el-form-item label="客户">
          <el-select v-model="searchForm.customerId" filterable placeholder="请选择客户" clearable style="width: 200px">
            <el-option v-for="c in customerList" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="截止日期">
          <el-date-picker v-model="searchForm.asOfDate" type="date" placeholder="选择日期" value-format="YYYY-MM-DD" style="width: 150px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleExport">导出</el-button>
        </el-form-item>
      </el-form>
    </div>

    <el-card v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>应收账款账龄分析</span>
          <span class="total-info">应收总额: {{ formatMoney(totalAmount) }}</span>
        </div>
      </template>

      <el-table :data="tableData" border stripe show-summary :summary-method="getSummary">
        <el-table-column prop="customer_name" label="客户名称" width="200" />
        <el-table-column label="未到期" width="120" align="right">
          <template #default="{ row }">{{ formatMoney(row.current) }}</template>
        </el-table-column>
        <el-table-column label="1-30天" width="120" align="right">
          <template #default="{ row }">{{ formatMoney(row.days30) }}</template>
        </el-table-column>
        <el-table-column label="31-60天" width="120" align="right">
          <template #default="{ row }">{{ formatMoney(row.days60) }}</template>
        </el-table-column>
        <el-table-column label="61-90天" width="120" align="right">
          <template #default="{ row }">{{ formatMoney(row.days90) }}</template>
        </el-table-column>
        <el-table-column label="90天以上" width="120" align="right">
          <template #default="{ row }">{{ formatMoney(row.over90) }}</template>
        </el-table-column>
        <el-table-column label="合计" width="140" align="right">
          <template #default="{ row }">{{ formatMoney(row.total) }}</template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { exportToExcel, printTable } from '@/utils/export'

const loading = ref(false)
const tableData = ref<any[]>([])
const customerList = ref<any[]>([])

const searchForm = reactive({
  customerId: null as number | null,
  asOfDate: new Date().toISOString().split('T')[0]
})

const totalAmount = computed(() => {
  return tableData.value.reduce((sum, row) => sum + (row.total || 0), 0)
})

onMounted(() => {
  loadCustomers()
  loadData()
})

async function loadCustomers() {
  const data = await window.api.database.query(
    'SELECT id, name FROM bd_customer WHERE is_enabled = 1 ORDER BY code'
  )
  customerList.value = data
}

async function loadData() {
  loading.value = true
  try {
    const invoices = await window.api.database.query(
      `SELECT i.customer_id, c.name as customer_name, i.total_amount, i.invoice_date,
       (SELECT COALESCE(SUM(r.amount), 0) FROM ar_receipt r JOIN ar_write_off w ON r.id = w.receipt_id WHERE w.invoice_id = i.id) as paid_amount
       FROM ar_invoice i 
       LEFT JOIN bd_customer c ON i.customer_id = c.id
       WHERE i.status != 'cancelled'
       ORDER BY c.name`
    )
    
    const asOfDate = new Date(searchForm.asOfDate)
    const customerMap = new Map<number, any>()
    
    for (const inv of invoices) {
      const remaining = (inv.total_amount || 0) - (inv.paid_amount || 0)
      if (remaining <= 0) continue
      
      if (!customerMap.has(inv.customer_id)) {
        customerMap.set(inv.customer_id, {
          customer_name: inv.customer_name,
          current: 0,
          days30: 0,
          days60: 0,
          days90: 0,
          over90: 0,
          total: 0
        })
      }
      
      const customer = customerMap.get(inv.customer_id)
      const invoiceDate = new Date(inv.invoice_date)
      const daysDiff = Math.floor((asOfDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24))
      
      if (daysDiff <= 0) {
        customer.current += remaining
      } else if (daysDiff <= 30) {
        customer.days30 += remaining
      } else if (daysDiff <= 60) {
        customer.days60 += remaining
      } else if (daysDiff <= 90) {
        customer.days90 += remaining
      } else {
        customer.over90 += remaining
      }
      customer.total += remaining
    }
    
    tableData.value = Array.from(customerMap.values()).filter(c => c.total > 0)
  } catch (error: any) {
    ElMessage.error(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() { loadData() }

function handleExport() {
  if (tableData.value.length === 0) {
    ElMessage.warning('没有数据可导出')
    return
  }
  
  const exportData = tableData.value.map(row => ({
    客户名称: row.customer_name,
    未到期: row.current || '',
    '1-30天': row.days30 || '',
    '31-60天': row.days60 || '',
    '61-90天': row.days90 || '',
    '90天以上': row.over90 || '',
    合计: row.total || ''
  }))
  
  if (exportToExcel(exportData, '应收账款账龄分析')) {
    ElMessage.success('导出成功')
  }
}

function getSummary({ columns, data }: any) {
  const sums: string[] = []
  columns.forEach((column: any, index: number) => {
    if (index === 0) {
      sums[index] = '合计'
    } else {
      const total = data.reduce((sum: number, row: any) => sum + (row[column.property] || 0), 0)
      sums[index] = formatMoney(total)
    }
  })
  return sums
}

function formatMoney(v: number) {
  return '¥' + (v || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })
}
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.total-info {
  font-weight: normal;
  color: #409eff;
  font-size: 16px;
}
</style>
