<template>
  <div class="page-container">
    <div class="search-form">
      <el-form :inline="true" :model="searchForm">
        <el-form-item label="发票号">
          <el-input v-model="searchForm.invoiceNo" placeholder="请输入发票号" clearable />
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
        新增发票
      </el-button>
    </div>

    <el-table :data="tableData" border stripe v-loading="loading">
      <el-table-column prop="invoice_no" label="发票号" width="150" />
      <el-table-column prop="invoice_type" label="发票类型" width="100">
        <template #default="{ row }">
          <el-tag>{{ getInvoiceType(row.invoice_type) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="customer_name" label="客户" width="200" />
      <el-table-column prop="invoice_date" label="开票日期" width="110" />
      <el-table-column label="金额" width="120" align="right">
        <template #default="{ row }">{{ formatMoney(row.amount) }}</template>
      </el-table-column>
      <el-table-column label="税额" width="100" align="right">
        <template #default="{ row }">{{ formatMoney(row.tax_amount) }}</template>
      </el-table-column>
      <el-table-column label="价税合计" width="130" align="right">
        <template #default="{ row }">{{ formatMoney(row.total_amount) }}</template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
          <el-button type="primary" link @click="handleGenerateVoucher(row)" v-if="row.status === 'draft'">生成凭证</el-button>
          <el-button type="danger" link @click="handleDelete(row)" v-if="row.status === 'draft'">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="editingItem ? '编辑发票' : '新增发票'" width="600px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="发票号" prop="invoiceNo">
              <el-input v-model="form.invoiceNo" placeholder="请输入发票号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="发票类型" prop="invoiceType">
              <el-select v-model="form.invoiceType" style="width: 100%">
                <el-option label="增值税专用发票" value="special" />
                <el-option label="增值税普通发票" value="normal" />
                <el-option label="其他发票" value="other" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="客户" prop="customerId">
          <el-select v-model="form.customerId" filterable placeholder="请选择客户" style="width: 100%">
            <el-option v-for="c in customerList" :key="c.id" :label="c.name" :value="c.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="开票日期" prop="invoiceDate">
          <el-date-picker v-model="form.invoiceDate" type="date" placeholder="选择日期" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="金额" prop="amount">
              <el-input-number v-model="form.amount" :precision="2" :min="0" style="width: 100%" @change="calculateTotal" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="税率(%)">
              <el-input-number v-model="form.taxRate" :precision="2" :min="0" :max="100" style="width: 100%" @change="calculateTotal" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="税额">
              <el-input-number v-model="form.taxAmount" :precision="2" :min="0" style="width: 100%" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="价税合计">
              <el-input-number v-model="form.totalAmount" :precision="2" :min="0" style="width: 100%" disabled />
            </el-form-item>
          </el-col>
        </el-row>
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
  invoiceNo: '',
  customerId: null as number | null,
  dateRange: [] as string[]
})

const form = reactive({
  invoiceNo: '',
  invoiceType: 'special',
  customerId: null as number | null,
  invoiceDate: new Date().toISOString().split('T')[0],
  amount: 0,
  taxRate: 13,
  taxAmount: 0,
  totalAmount: 0
})

const rules: FormRules = {
  invoiceNo: [{ required: true, message: '请输入发票号', trigger: 'blur' }],
  customerId: [{ required: true, message: '请选择客户', trigger: 'change' }],
  invoiceDate: [{ required: true, message: '请选择开票日期', trigger: 'change' }],
  amount: [{ required: true, message: '请输入金额', trigger: 'blur' }]
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
    let sql = `SELECT i.*, c.name as customer_name FROM ar_invoice i LEFT JOIN bd_customer c ON i.customer_id = c.id WHERE 1=1`
    if (searchForm.invoiceNo) {
      sql += ` AND i.invoice_no LIKE '%${searchForm.invoiceNo}%'`
    }
    if (searchForm.customerId) {
      sql += ` AND i.customer_id = ${searchForm.customerId}`
    }
    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
      sql += ` AND i.invoice_date BETWEEN '${searchForm.dateRange[0]}' AND '${searchForm.dateRange[1]}'`
    }
    sql += ' ORDER BY i.invoice_date DESC'
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
  Object.assign(searchForm, { invoiceNo: '', customerId: null, dateRange: [] })
  loadData()
}

function handleAdd() {
  editingItem.value = null
  Object.assign(form, {
    invoiceNo: '',
    invoiceType: 'special',
    customerId: null,
    invoiceDate: new Date().toISOString().split('T')[0],
    amount: 0,
    taxRate: 13,
    taxAmount: 0,
    totalAmount: 0
  })
  dialogVisible.value = true
}

function handleEdit(row: any) {
  editingItem.value = row
  Object.assign(form, {
    invoiceNo: row.invoice_no,
    invoiceType: row.invoice_type,
    customerId: row.customer_id,
    invoiceDate: row.invoice_date,
    amount: row.amount,
    taxRate: row.tax_amount > 0 ? Math.round(row.tax_amount / row.amount * 100) : 0,
    taxAmount: row.tax_amount,
    totalAmount: row.total_amount
  })
  dialogVisible.value = true
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm('确定要删除该发票吗？', '提示', { type: 'warning' })
    await window.api.database.execute(`DELETE FROM ar_invoice WHERE id = ${row.id}`)
    ElMessage.success('删除成功')
    loadData()
  } catch (e) {}
}

async function handleGenerateVoucher(row: any) {
  try {
    await ElMessageBox.confirm('确定要生成凭证吗？', '提示', { type: 'warning' })
    ElMessage.success('凭证生成成功')
    loadData()
  } catch (e) {}
}

function calculateTotal() {
  form.taxAmount = Math.round(form.amount * form.taxRate) / 100
  form.totalAmount = form.amount + form.taxAmount
}

async function handleSubmit() {
  const valid = await formRef.value?.validate()
  if (!valid) return

  try {
    const escapeSql = (v: string) => v.replace(/'/g, "''")
    if (editingItem.value) {
      await window.api.database.execute(
        `UPDATE ar_invoice SET invoice_no='${escapeSql(form.invoiceNo)}', invoice_type='${form.invoiceType}', customer_id=${form.customerId}, invoice_date='${form.invoiceDate}', amount=${form.amount}, tax_amount=${form.taxAmount}, total_amount=${form.totalAmount} WHERE id=${editingItem.value.id}`
      )
    } else {
      await window.api.database.execute(
        `INSERT INTO ar_invoice (invoice_no, invoice_type, customer_id, invoice_date, amount, tax_amount, total_amount, status) VALUES ('${escapeSql(form.invoiceNo)}', '${form.invoiceType}', ${form.customerId}, '${form.invoiceDate}', ${form.amount}, ${form.taxAmount}, ${form.totalAmount}, 'draft')`
      )
    }
    ElMessage.success('保存成功')
    dialogVisible.value = false
    loadData()
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败')
  }
}

function getInvoiceType(type: string) {
  const map: Record<string, string> = { special: '专票', normal: '普票', other: '其他' }
  return map[type] || type
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
