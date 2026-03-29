<template>
  <div class="page-container">
    <div class="search-form">
      <el-form :inline="true" :model="searchForm">
        <el-form-item label="员工姓名">
          <el-input v-model="searchForm.name" placeholder="请输入员工姓名" clearable />
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
        新增员工
      </el-button>
    </div>
    
    <el-table :data="tableData" border stripe v-loading="loading">
      <el-table-column prop="code" label="员工编码" width="120" />
      <el-table-column prop="name" label="员工姓名" width="120" />
      <el-table-column prop="department_id" label="部门" width="120" />
      <el-table-column prop="position" label="职位" width="120" />
      <el-table-column prop="phone" label="电话" width="130" />
      <el-table-column prop="bank_name" label="开户银行" width="150" />
      <el-table-column prop="bank_account" label="银行账号" width="150" />
      <el-table-column prop="is_enabled" label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.is_enabled ? 'success' : 'info'">{{ row.is_enabled ? '在职' : '离职' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
          <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="editingItem ? '编辑员工' : '新增员工'" width="550px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="员工编码" prop="code">
              <el-input v-model="form.code" placeholder="请输入员工编码" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="员工姓名" prop="name">
              <el-input v-model="form.name" placeholder="请输入员工姓名" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="职位">
              <el-input v-model="form.position" placeholder="请输入职位" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="身份证号">
              <el-input v-model="form.id_card" placeholder="请输入身份证号" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="开户银行">
              <el-input v-model="form.bank_name" placeholder="请输入开户银行" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="银行账号">
              <el-input v-model="form.bank_account" placeholder="请输入银行账号" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="是否在职">
          <el-switch v-model="form.is_enabled" />
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

const searchForm = reactive({ name: '' })
const form = reactive({
  code: '', name: '', position: '', id_card: '', bank_name: '', bank_account: '', is_enabled: true
})

const rules: FormRules = {
  code: [{ required: true, message: '请输入员工编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入员工姓名', trigger: 'blur' }]
}

onMounted(() => { loadData() })

async function loadData() {
  loading.value = true
  try {
    let sql = 'SELECT * FROM bd_employee WHERE 1=1'
    if (searchForm.name) sql += ` AND name LIKE '%${searchForm.name}%'`
    sql += ' ORDER BY code'
    const data = await window.api.database.query(sql)
    tableData.value = data
  } catch (error: any) {
    ElMessage.error(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() { loadData() }
function handleReset() { searchForm.name = ''; loadData() }

function handleAdd() {
  editingItem.value = null
  Object.assign(form, { code: '', name: '', position: '', id_card: '', bank_name: '', bank_account: '', is_enabled: true })
  dialogVisible.value = true
}

function handleEdit(row: any) {
  editingItem.value = row
  Object.assign(form, {
    code: row.code, name: row.name, position: row.position || '', id_card: row.id_card || '',
    bank_name: row.bank_name || '', bank_account: row.bank_account || '', is_enabled: !!row.is_enabled
  })
  dialogVisible.value = true
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm('确定要删除该员工吗？', '提示', { type: 'warning' })
    await window.api.database.execute(`DELETE FROM bd_employee WHERE id = ${row.id}`)
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
        `UPDATE bd_employee SET code='${escapeSql(form.code)}', name='${escapeSql(form.name)}', position='${escapeSql(form.position)}', id_card='${escapeSql(form.id_card)}', bank_name='${escapeSql(form.bank_name)}', bank_account='${escapeSql(form.bank_account)}', is_enabled=${form.is_enabled ? 1 : 0} WHERE id=${editingItem.value.id}`
      )
    } else {
      await window.api.database.execute(
        `INSERT INTO bd_employee (code, name, position, id_card, bank_name, bank_account, is_enabled) VALUES ('${escapeSql(form.code)}', '${escapeSql(form.name)}', '${escapeSql(form.position)}', '${escapeSql(form.id_card)}', '${escapeSql(form.bank_name)}', '${escapeSql(form.bank_account)}', ${form.is_enabled ? 1 : 0})`
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
