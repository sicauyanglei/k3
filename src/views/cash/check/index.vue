<template>
  <div class="page-container">
    <div class="search-form">
      <el-form :inline="true" :model="searchForm">
        <el-form-item label="支票号码">
          <el-input v-model="searchForm.checkNo" placeholder="请输入支票号码" clearable />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable style="width: 120px">
            <el-option label="未使用" value="unused" />
            <el-option label="已使用" value="used" />
            <el-option label="已作废" value="cancelled" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">查询</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="table-toolbar">
      <el-button type="primary" @click="handleAdd">
        <el-icon><Plus /></el-icon>
        新增支票
      </el-button>
    </div>

    <el-table :data="tableData" border stripe v-loading="loading">
      <el-table-column prop="check_no" label="支票号码" width="150" />
      <el-table-column prop="check_type" label="支票类型" width="100">
        <template #default="{ row }">
          <el-tag>{{ row.check_type === 'cash' ? '现金支票' : '转账支票' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="金额" width="130" align="right">
        <template #default="{ row }">{{ formatMoney(row.amount) }}</template>
      </el-table-column>
      <el-table-column prop="issue_date" label="签发日期" width="110" />
      <el-table-column prop="due_date" label="到期日期" width="110" />
      <el-table-column prop="payee" label="收款人" width="150" />
      <el-table-column prop="status" label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link @click="handleUse(row)" v-if="row.status === 'unused'">使用</el-button>
          <el-button type="danger" link @click="handleCancel(row)" v-if="row.status === 'unused'">作废</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" title="新增支票" width="500px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="支票号码" prop="checkNo">
          <el-input v-model="form.checkNo" placeholder="请输入支票号码" />
        </el-form-item>
        <el-form-item label="支票类型" prop="checkType">
          <el-select v-model="form.checkType" style="width: 100%">
            <el-option label="现金支票" value="cash" />
            <el-option label="转账支票" value="transfer" />
          </el-select>
        </el-form-item>
        <el-form-item label="签发日期" prop="issueDate">
          <el-date-picker v-model="form.issueDate" type="date" placeholder="选择日期" value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="到期日期">
          <el-date-picker v-model="form.dueDate" type="date" placeholder="选择日期" value-format="YYYY-MM-DD" style="width: 100%" />
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
const formRef = ref<FormInstance>()

const searchForm = reactive({
  checkNo: '',
  status: ''
})

const form = reactive({
  checkNo: '',
  checkType: 'transfer',
  issueDate: new Date().toISOString().split('T')[0],
  dueDate: ''
})

const rules: FormRules = {
  checkNo: [{ required: true, message: '请输入支票号码', trigger: 'blur' }],
  checkType: [{ required: true, message: '请选择支票类型', trigger: 'change' }],
  issueDate: [{ required: true, message: '请选择签发日期', trigger: 'change' }]
}

onMounted(() => {
  loadData()
})

async function loadData() {
  loading.value = true
  try {
    let sql = 'SELECT * FROM cash_check WHERE 1=1'
    if (searchForm.checkNo) {
      sql += ` AND check_no LIKE '%${searchForm.checkNo}%'`
    }
    if (searchForm.status) {
      sql += ` AND status = '${searchForm.status}'`
    }
    sql += ' ORDER BY check_no'
    const data = await window.api.database.query(sql)
    tableData.value = data
  } catch (error: any) {
    ElMessage.error(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() { loadData() }

function handleAdd() {
  Object.assign(form, {
    checkNo: '',
    checkType: 'transfer',
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: ''
  })
  dialogVisible.value = true
}

async function handleUse(row: any) {
  try {
    const { value } = await ElMessageBox.prompt('请输入使用金额', '使用支票', {
      inputPattern: /^\d+(\.\d+)?$/,
      inputErrorMessage: '请输入有效金额'
    })
    
    await window.api.database.execute(
      `UPDATE cash_check SET status = 'used', amount = ${value} WHERE id = ${row.id}`
    )
    ElMessage.success('支票已使用')
    loadData()
  } catch (e) {}
}

async function handleCancel(row: any) {
  try {
    await ElMessageBox.confirm('确定要作废该支票吗？', '提示', { type: 'warning' })
    await window.api.database.execute(
      `UPDATE cash_check SET status = 'cancelled' WHERE id = ${row.id}`
    )
    ElMessage.success('支票已作废')
    loadData()
  } catch (e) {}
}

async function handleSubmit() {
  const valid = await formRef.value?.validate()
  if (!valid) return

  try {
    await window.api.database.execute(
      `INSERT INTO cash_check (check_no, check_type, issue_date, due_date, status) VALUES ('${form.checkNo}', '${form.checkType}', '${form.issueDate}', '${form.dueDate || ''}', 'unused')`
    )
    ElMessage.success('保存成功')
    dialogVisible.value = false
    loadData()
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败')
  }
}

function getStatusType(status: string) {
  const map: Record<string, string> = { unused: 'info', used: 'success', cancelled: 'danger' }
  return map[status] || 'info'
}

function getStatusText(status: string) {
  const map: Record<string, string> = { unused: '未使用', used: '已使用', cancelled: '已作废' }
  return map[status] || status
}

function formatMoney(v: number) {
  return '¥' + (v || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })
}
</script>
