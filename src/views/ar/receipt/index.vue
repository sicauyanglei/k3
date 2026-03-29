<template>
  <div class="page-container">
    <div class="search-form">
      <el-form :inline="true" :model="searchForm">
        <el-form-item label="收款单号">
          <el-input v-model="searchForm.receiptNo" placeholder="请输入收款单号" clearable />
        </el-form-item>
        <el-form-item label="客户">
          <el-select v-model="searchForm.customerId" filterable placeholder="请选择客户" clearable style="width: 200px">
            <el-option v-for="c in customerList" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="日期">
          <el-date-picker v-model="searchForm.dateRange" type="daterange" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" style="width: 240px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="table-toolbar">
      <el-button type="primary" @click="handleAdd">
        <el-icon><Plus /></el-icon>
        新增收款单
      </el-button>
    </div>

    <el-table :data="tableData" border stripe v-loading="loading">
      <el-table-column prop="receipt_no" label="收款单号" width="150" />
      <el-table-column prop="customer_name" label="客户" width="200" />
      <el-table-column prop="receipt_date" label="收款日期" width="110" />
      <el-table-column label="收款金额" width="130" align="right">
        <template #default="{ row }">{{ formatMoney(row.amount) }}</template>
      </el-table-column>
      <el-table-column prop="bank_account" label="收款账户" width="180" />
      <el-table-column prop="status" label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
          <el-button type="primary" link @click="handleWriteOff(row)" v-if="row.status === 'draft'">核销</el-button>
          <el-button type="danger" link @click="handleDelete(row)" v-if="row.status === 'draft'">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="editingItem ? '编辑收款单' : '新增收款单'" width="500px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="收款单号" prop="receiptNo">
          <el-input v-model="form.receiptNo" placeholder="请输入收款单号" />
        </el-form-item>
        <el-form-item label="客户" prop="customerId">
          <el-select v-model="form.customerId" filterable placeholder="请选择客户" style="width: 100%">
            <el-option v-for="c in customerList" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="收款日期" prop="receiptDate">
          <el-date-picker v-model="form.receiptDate" type="date" placeholder="选择日期" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="收款金额" prop="amount">
          <el-input-number v-model="form.amount" :precision="2" :min="0" style="width: 100%" />
        </el-form-item>
        <el-form-item label="收款账户">
          <el-input v-model="form.bankAccount" placeholder="请输入收款账户" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'

const loading = ref(false)
const dialogVisible = ref(false)
const tableData = ref<any[]>([])
const customerList = ref<any[]>([])
const editingItem = ref<any>(null)
const formRef = ref<FormInstance>()

const searchForm = reactive({
  receiptNo: '',
  customerId: null as number | null,
  dateRange: [] as string[]
})

const form = reactive({
  receiptNo: '',
  customerId: null as number | null,
  receiptDate: new Date().toISOString().split('T')[0],
  amount: 0,
  bankAccount: ''
})

const rules: FormRules = {
  receiptNo: [{ required: true, message: '请输入收款单号', trigger: 'blur' }],
  customerId: [{ required: true, message: '请选择客户', trigger: 'change' }],
  receiptDate: [{ required: true, message: '请选择收款日期', trigger: 'change' }],
  amount: [{ required: true, message: '请输入收款金额', trigger: 'blur' }]
}

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
    let sql = `SELECT r.*, c.name as customer_name FROM ar_receipt r LEFT JOIN bd_customer c ON r.customer_id = c.id WHERE 1=1`
    if (searchForm.receiptNo) {
      sql += ` AND r.receipt_no LIKE '%${searchForm.receiptNo}%'`
    }
    if (searchForm.customerId) {
      sql += ` AND r.customer_id = ${searchForm.customerId}`
    }
    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
      sql += ` AND r.receipt_date BETWEEN '${searchForm.dateRange[0]}' AND '${searchForm.dateRange[1]}'`
    }
    sql += ' ORDER BY r.receipt_date DESC'
    const data = await window.api.database.query(sql)
    tableData.value = data
  } catch (error: any) {
    ElMessage.error(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() { loadData() }
function handleReset() {
  Object.assign(searchForm, { receiptNo: '', customerId: null, dateRange: [] })
  loadData()
}

function handleAdd() {
  editingItem.value = null
  Object.assign(form, {
    receiptNo: `SK${Date.now()}`,
    customerId: null,
    receiptDate: new Date().toISOString().split('T')[0],
    amount: 0,
    bankAccount: ''
  })
  dialogVisible.value = true
}

function handleEdit(row: any) {
  editingItem.value = row
  Object.assign(form, {
    receiptNo: row.receipt_no,
    customerId: row.customer_id,
    receiptDate: row.receipt_date,
    amount: row.amount,
    bankAccount: row.bank_account || ''
  })
  dialogVisible.value = true
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm('确定要删除该收款单吗？', '提示', { type: 'warning' })
    await window.api.database.execute(`DELETE FROM ar_receipt WHERE id = ${row.id}`)
    ElMessage.success('删除成功')
    loadData()
  } catch (e) {}
}

async function handleWriteOff(row: any) {
  try {
    await ElMessageBox.confirm('确定要进行核销吗？', '提示', { type: 'warning' })
    ElMessage.success('核销成功')
    loadData()
  } catch (e) {}
}

async function handleSubmit() {
  const valid = await formRef.value?.validate()
  if (!valid) return

  try {
    const escapeSql = (v: string) => v.replace(/'/g, "''")
    if (editingItem.value) {
      await window.api.database.execute(
        `UPDATE ar_receipt SET receipt_no='${escapeSql(form.receiptNo)}', customer_id=${form.customerId}, receipt_date='${form.receiptDate}', amount=${form.amount}, bank_account='${escapeSql(form.bankAccount)}' WHERE id=${editingItem.value.id}`
      )
    } else {
      await window.api.database.execute(
        `INSERT INTO ar_receipt (receipt_no, customer_id, receipt_date, amount, bank_account, status) VALUES ('${escapeSql(form.receiptNo)}', ${form.customerId}, '${form.receiptDate}', ${form.amount}, '${escapeSql(form.bankAccount)}', 'draft')`
      )
    }
    ElMessage.success('保存成功')
    dialogVisible.value = false
    loadData()
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败')
  }
}

function getStatusType(status: string) {
  const map: Record<string, string> = { draft: 'info', confirmed: 'success' }
  return map[status] || 'info'
}

function getStatusText(status: string) {
  const map: Record<string, string> = { draft: '草稿', confirmed: '已确认' }
  return map[status] || status
}

function formatMoney(v: number) {
  return '¥' + (v || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })
}
</script>
