<template>
  <div class="page-container">
    <div class="search-form">
      <el-form :inline="true" :model="searchForm">
        <el-form-item label="付款单号">
          <el-input v-model="searchForm.paymentNo" placeholder="请输入付款单号" clearable />
        </el-form-item>
        <el-form-item label="供应商">
          <el-select v-model="searchForm.supplierId" filterable placeholder="请选择供应商" clearable style="width: 200px">
            <el-option v-for="s in supplierList" :key="s.id" :label="s.name" :value="s.id" />
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
        新增付款单
      </el-button>
    </div>

    <el-table :data="tableData" border stripe v-loading="loading">
      <el-table-column prop="payment_no" label="付款单号" width="150" />
      <el-table-column prop="supplier_name" label="供应商" width="200" />
      <el-table-column prop="payment_date" label="付款日期" width="110" />
      <el-table-column label="付款金额" width="130" align="right">
        <template #default="{ row }">{{ formatMoney(row.amount) }}</template>
      </el-table-column>
      <el-table-column prop="bank_account" label="付款账户" width="180" />
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

    <el-dialog v-model="dialogVisible" :title="editingItem ? '编辑付款单' : '新增付款单'" width="500px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="付款单号" prop="paymentNo">
          <el-input v-model="form.paymentNo" placeholder="请输入付款单号" />
        </el-form-item>
        <el-form-item label="供应商" prop="supplierId">
          <el-select v-model="form.supplierId" filterable placeholder="请选择供应商" style="width: 100%">
            <el-option v-for="s in supplierList" :key="s.id" :label="s.name" :value="s.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="付款日期" prop="paymentDate">
          <el-date-picker v-model="form.paymentDate" type="date" placeholder="选择日期" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="付款金额" prop="amount">
          <el-input-number v-model="form.amount" :precision="2" :min="0" style="width: 100%" />
        </el-form-item>
        <el-form-item label="付款账户">
          <el-input v-model="form.bankAccount" placeholder="请输入付款账户" />
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
const supplierList = ref<any[]>([])
const editingItem = ref<any>(null)
const formRef = ref<FormInstance>()

const searchForm = reactive({
  paymentNo: '',
  supplierId: null as number | null,
  dateRange: [] as string[]
})

const form = reactive({
  paymentNo: '',
  supplierId: null as number | null,
  paymentDate: new Date().toISOString().split('T')[0],
  amount: 0,
  bankAccount: ''
})

const rules: FormRules = {
  paymentNo: [{ required: true, message: '请输入付款单号', trigger: 'blur' }],
  supplierId: [{ required: true, message: '请选择供应商', trigger: 'change' }],
  paymentDate: [{ required: true, message: '请选择付款日期', trigger: 'change' }],
  amount: [{ required: true, message: '请输入付款金额', trigger: 'blur' }]
}

onMounted(() => {
  loadSuppliers()
  loadData()
})

async function loadSuppliers() {
  const data = await window.api.database.query(
    'SELECT id, name FROM bd_supplier WHERE is_enabled = 1 ORDER BY code'
  )
  supplierList.value = data
}

async function loadData() {
  loading.value = true
  try {
    let sql = `SELECT p.*, s.name as supplier_name FROM ap_payment p LEFT JOIN bd_supplier s ON p.supplier_id = s.id WHERE 1=1`
    if (searchForm.paymentNo) {
      sql += ` AND p.payment_no LIKE '%${searchForm.paymentNo}%'`
    }
    if (searchForm.supplierId) {
      sql += ` AND p.supplier_id = ${searchForm.supplierId}`
    }
    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
      sql += ` AND p.payment_date BETWEEN '${searchForm.dateRange[0]}' AND '${searchForm.dateRange[1]}'`
    }
    sql += ' ORDER BY p.payment_date DESC'
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
  Object.assign(searchForm, { paymentNo: '', supplierId: null, dateRange: [] })
  loadData()
}

function handleAdd() {
  editingItem.value = null
  Object.assign(form, {
    paymentNo: `FK${Date.now()}`,
    supplierId: null,
    paymentDate: new Date().toISOString().split('T')[0],
    amount: 0,
    bankAccount: ''
  })
  dialogVisible.value = true
}

function handleEdit(row: any) {
  editingItem.value = row
  Object.assign(form, {
    paymentNo: row.payment_no,
    supplierId: row.supplier_id,
    paymentDate: row.payment_date,
    amount: row.amount,
    bankAccount: row.bank_account || ''
  })
  dialogVisible.value = true
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm('确定要删除该付款单吗？', '提示', { type: 'warning' })
    await window.api.database.execute(`DELETE FROM ap_payment WHERE id = ${row.id}`)
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
        `UPDATE ap_payment SET payment_no='${escapeSql(form.paymentNo)}', supplier_id=${form.supplierId}, payment_date='${form.paymentDate}', amount=${form.amount}, bank_account='${escapeSql(form.bankAccount)}' WHERE id=${editingItem.value.id}`
      )
    } else {
      await window.api.database.execute(
        `INSERT INTO ap_payment (payment_no, supplier_id, payment_date, amount, bank_account, status) VALUES ('${escapeSql(form.paymentNo)}', ${form.supplierId}, '${form.paymentDate}', ${form.amount}, '${escapeSql(form.bankAccount)}', 'draft')`
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
