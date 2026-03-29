<template>
  <div class="page-container">
    <div class="search-form">
      <el-form :inline="true" :model="searchForm">
        <el-form-item label="会计期间">
          <el-select v-model="searchForm.year" style="width: 100px">
            <el-option v-for="y in yearOptions" :key="y" :label="y" :value="y" />
          </el-select>
          <span style="margin: 0 5px">年</span>
          <el-select v-model="searchForm.period" style="width: 100px">
            <el-option v-for="p in 12" :key="p" :label="`${p}期`" :value="p" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button type="success" @click="handlePay">发放工资</el-button>
        </el-form-item>
      </el-form>
    </div>

    <el-table :data="tableData" border stripe v-loading="loading" show-summary :summary-method="getSummary">
      <el-table-column prop="payment_no" label="发放单号" width="150" />
      <el-table-column prop="employee_name" label="员工姓名" width="100" />
      <el-table-column label="应发合计" width="120" align="right">
        <template #default="{ row }">{{ formatMoney(row.gross_amount) }}</template>
      </el-table-column>
      <el-table-column label="扣款合计" width="120" align="right">
        <template #default="{ row }">{{ formatMoney(row.deduct_amount) }}</template>
      </el-table-column>
      <el-table-column label="实发金额" width="130" align="right">
        <template #default="{ row }">{{ formatMoney(row.net_amount) }}</template>
      </el-table-column>
      <el-table-column prop="payment_date" label="发放日期" width="110" />
      <el-table-column prop="status" label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link @click="handleGenerateVoucher(row)" v-if="row.status === 'draft'">生成凭证</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const tableData = ref<any[]>([])

const yearOptions = computed(() => {
  const years = []
  const currentYear = new Date().getFullYear()
  for (let i = currentYear - 2; i <= currentYear + 1; i++) {
    years.push(i)
  }
  return years
})

const searchForm = reactive({
  year: new Date().getFullYear(),
  period: new Date().getMonth() + 1
})

onMounted(() => {
  loadData()
})

async function loadData() {
  loading.value = true
  try {
    const data = await window.api.database.query(
      `SELECT p.*, e.name as employee_name FROM hr_salary_payment p LEFT JOIN bd_employee e ON p.employee_id = e.id WHERE p.year = ${searchForm.year} AND p.period = ${searchForm.period} ORDER BY p.payment_no`
    )
    tableData.value = data
  } catch (error: any) {
    ElMessage.error(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() { loadData() }

async function handlePay() {
  try {
    await ElMessageBox.confirm('确定要发放本期工资吗？', '提示', { type: 'warning' })
    
    const employees = await window.api.database.query(
      `SELECT e.id, e.name, 
        COALESCE(SUM(CASE WHEN si.item_type = 'add' THEN sd.amount ELSE 0 END), 0) as gross_amount,
        COALESCE(SUM(CASE WHEN si.item_type = 'subtract' THEN sd.amount ELSE 0 END), 0) as deduct_amount
       FROM bd_employee e
       LEFT JOIN hr_salary_data sd ON e.id = sd.employee_id AND sd.year = ${searchForm.year} AND sd.period = ${searchForm.period}
       LEFT JOIN hr_salary_item si ON sd.item_id = si.id
       WHERE e.is_enabled = 1
       GROUP BY e.id`
    )
    
    for (const emp of employees) {
      const netAmount = emp.gross_amount - emp.deduct_amount
      await window.api.database.execute(
        `INSERT INTO hr_salary_payment (payment_no, year, period, employee_id, gross_amount, deduct_amount, net_amount, payment_date, status) VALUES ('PAY${Date.now()}', ${searchForm.year}, ${searchForm.period}, ${emp.id}, ${emp.gross_amount}, ${emp.deduct_amount}, ${netAmount}, '${new Date().toISOString().split('T')[0]}', 'draft')`
      )
    }
    
    ElMessage.success('工资发放成功')
    loadData()
  } catch (e) {}
}

async function handleGenerateVoucher(row: any) {
  try {
    await ElMessageBox.confirm('确定要生成凭证吗？', '提示', { type: 'warning' })
    await window.api.database.execute(
      `UPDATE hr_salary_payment SET status = 'confirmed' WHERE id = ${row.id}`
    )
    ElMessage.success('凭证生成成功')
    loadData()
  } catch (e) {}
}

function getSummary({ columns, data }: any) {
  const sums: string[] = []
  columns.forEach((column: any, index: number) => {
    if (index === 0) {
      sums[index] = '合计'
    } else if (['gross_amount', 'deduct_amount', 'net_amount'].includes(column.property)) {
      const total = data.reduce((sum: number, row: any) => sum + (row[column.property] || 0), 0)
      sums[index] = formatMoney(total)
    } else {
      sums[index] = ''
    }
  })
  return sums
}

function getStatusType(status: string) {
  const map: Record<string, string> = { draft: 'info', confirmed: 'success' }
  return map[status] || 'info'
}

function getStatusText(status: string) {
  const map: Record<string, string> = { draft: '待处理', confirmed: '已确认' }
  return map[status] || status
}

function formatMoney(v: number) {
  return '¥' + (v || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })
}
</script>
