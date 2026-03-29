<template>
  <div class="page-container">
    <div class="search-form">
      <el-form :inline="true" :model="searchForm">
        <el-form-item label="客户名称">
          <el-input v-model="searchForm.name" placeholder="请输入客户名称" clearable />
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
        新增客户
      </el-button>
    </div>
    
    <el-table :data="tableData" border stripe v-loading="loading">
      <el-table-column prop="code" label="客户编码" width="120" />
      <el-table-column prop="name" label="客户名称" width="200" />
      <el-table-column prop="short_name" label="简称" width="120" />
      <el-table-column prop="contact" label="联系人" width="100" />
      <el-table-column prop="phone" label="电话" width="130" />
      <el-table-column prop="credit_limit" label="信用额度" width="120">
        <template #default="{ row }">{{ formatMoney(row.credit_limit) }}</template>
      </el-table-column>
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

    <el-dialog v-model="dialogVisible" :title="editingItem ? '编辑客户' : '新增客户'" width="550px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="客户编码" prop="code">
              <el-input v-model="form.code" placeholder="请输入客户编码" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="客户名称" prop="name">
              <el-input v-model="form.name" placeholder="请输入客户名称" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="简称">
              <el-input v-model="form.short_name" placeholder="请输入简称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="信用额度">
              <el-input-number v-model="form.credit_limit" :precision="2" :min="0" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="联系人">
              <el-input v-model="form.contact" placeholder="请输入联系人" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="电话">
              <el-input v-model="form.phone" placeholder="请输入电话" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="地址">
          <el-input v-model="form.address" placeholder="请输入地址" />
        </el-form-item>
        <el-form-item label="是否启用">
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
  code: '',
  name: '',
  short_name: '',
  credit_limit: 0,
  contact: '',
  phone: '',
  address: '',
  is_enabled: true
})

const rules: FormRules = {
  code: [{ required: true, message: '请输入客户编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入客户名称', trigger: 'blur' }]
}

onMounted(() => {
  loadData()
})

async function loadData() {
  loading.value = true
  try {
    let sql = 'SELECT * FROM bd_customer WHERE 1=1'
    if (searchForm.name) {
      sql += ` AND name LIKE '%${searchForm.name}%'`
    }
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
  Object.assign(form, { code: '', name: '', short_name: '', credit_limit: 0, contact: '', phone: '', address: '', is_enabled: true })
  dialogVisible.value = true
}

function handleEdit(row: any) {
  editingItem.value = row
  Object.assign(form, {
    code: row.code,
    name: row.name,
    short_name: row.short_name || '',
    credit_limit: row.credit_limit || 0,
    contact: row.contact || '',
    phone: row.phone || '',
    address: row.address || '',
    is_enabled: !!row.is_enabled
  })
  dialogVisible.value = true
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm('确定要删除该客户吗？', '提示', { type: 'warning' })
    await window.api.database.execute(`DELETE FROM bd_customer WHERE id = ${row.id}`)
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
        `UPDATE bd_customer SET code='${escapeSql(form.code)}', name='${escapeSql(form.name)}', short_name='${escapeSql(form.short_name)}', credit_limit=${form.credit_limit}, contact='${escapeSql(form.contact)}', phone='${escapeSql(form.phone)}', address='${escapeSql(form.address)}', is_enabled=${form.is_enabled ? 1 : 0} WHERE id=${editingItem.value.id}`
      )
    } else {
      await window.api.database.execute(
        `INSERT INTO bd_customer (code, name, short_name, credit_limit, contact, phone, address, is_enabled) VALUES ('${escapeSql(form.code)}', '${escapeSql(form.name)}', '${escapeSql(form.short_name)}', ${form.credit_limit}, '${escapeSql(form.contact)}', '${escapeSql(form.phone)}', '${escapeSql(form.address)}', ${form.is_enabled ? 1 : 0})`
      )
    }
    ElMessage.success('保存成功')
    dialogVisible.value = false
    loadData()
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败')
  }
}

function formatMoney(v: number) {
  return '¥' + (v || 0).toLocaleString()
}
</script>
