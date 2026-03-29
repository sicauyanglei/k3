<template>
  <div class="page-container">
    <div class="table-toolbar">
      <el-button type="primary" @click="handleAdd">
        <el-icon><Plus /></el-icon>
        新增银行账户
      </el-button>
    </div>

    <el-table :data="tableData" border stripe v-loading="loading">
      <el-table-column prop="account_no" label="账号" width="180" />
      <el-table-column prop="account_name" label="账户名称" width="200" />
      <el-table-column prop="bank_name" label="开户银行" width="200" />
      <el-table-column prop="bank_code" label="银行代码" width="100" />
      <el-table-column prop="is_enabled" label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.is_enabled ? 'success' : 'info'">{{ row.is_enabled ? '启用' : '停用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
          <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="editingItem ? '编辑银行账户' : '新增银行账户'" width="500px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="账号" prop="accountNo">
          <el-input v-model="form.accountNo" placeholder="请输入银行账号" />
        </el-form-item>
        <el-form-item label="账户名称" prop="accountName">
          <el-input v-model="form.accountName" placeholder="请输入账户名称" />
        </el-form-item>
        <el-form-item label="开户银行" prop="bankName">
          <el-input v-model="form.bankName" placeholder="请输入开户银行" />
        </el-form-item>
        <el-form-item label="银行代码">
          <el-input v-model="form.bankCode" placeholder="请输入银行代码" />
        </el-form-item>
        <el-form-item label="是否启用">
          <el-switch v-model="form.isEnabled" />
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
const editingItem = ref<any>(null)
const formRef = ref<FormInstance>()

const form = reactive({
  accountNo: '',
  accountName: '',
  bankName: '',
  bankCode: '',
  isEnabled: true
})

const rules: FormRules = {
  accountNo: [{ required: true, message: '请输入银行账号', trigger: 'blur' }],
  accountName: [{ required: true, message: '请输入账户名称', trigger: 'blur' }],
  bankName: [{ required: true, message: '请输入开户银行', trigger: 'blur' }]
}

onMounted(() => {
  loadData()
})

async function loadData() {
  loading.value = true
  try {
    const data = await window.api.database.query('SELECT * FROM cash_bank_account ORDER BY account_no')
    tableData.value = data
  } catch (error: any) {
    ElMessage.error(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function handleAdd() {
  editingItem.value = null
  Object.assign(form, { accountNo: '', accountName: '', bankName: '', bankCode: '', isEnabled: true })
  dialogVisible.value = true
}

function handleEdit(row: any) {
  editingItem.value = row
  Object.assign(form, {
    accountNo: row.account_no,
    accountName: row.account_name,
    bankName: row.bank_name || '',
    bankCode: row.bank_code || '',
    isEnabled: !!row.is_enabled
  })
  dialogVisible.value = true
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm('确定要删除该银行账户吗？', '提示', { type: 'warning' })
    await window.api.database.execute(`DELETE FROM cash_bank_account WHERE id = ${row.id}`)
    ElMessage.success('删除成功')
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
        `UPDATE cash_bank_account SET account_no='${escapeSql(form.accountNo)}', account_name='${escapeSql(form.accountName)}', bank_name='${escapeSql(form.bankName)}', bank_code='${escapeSql(form.bankCode)}', is_enabled=${form.isEnabled ? 1 : 0} WHERE id=${editingItem.value.id}`
      )
    } else {
      await window.api.database.execute(
        `INSERT INTO cash_bank_account (account_no, account_name, bank_name, bank_code, is_enabled) VALUES ('${escapeSql(form.accountNo)}', '${escapeSql(form.accountName)}', '${escapeSql(form.bankName)}', '${escapeSql(form.bankCode)}', ${form.isEnabled ? 1 : 0})`
      )
    }
    ElMessage.success('保存成功')
    dialogVisible.value = false
    loadData()
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败')
  }
}
</script>
