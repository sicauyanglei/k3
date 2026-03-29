<template>
  <div class="page-container">
    <div class="search-form">
      <el-form :inline="true" :model="searchForm">
        <el-form-item label="用户名">
          <el-input v-model="searchForm.username" placeholder="请输入用户名" clearable />
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
        新增用户
      </el-button>
    </div>
    
    <el-table :data="tableData" border stripe v-loading="loading">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="username" label="用户名" width="150" />
      <el-table-column prop="real_name" label="姓名" width="120" />
      <el-table-column prop="role" label="角色" width="120">
        <template #default="{ row }">
          <el-tag :type="row.role === 'admin' ? 'danger' : 'info'">
            {{ row.role === 'admin' ? '管理员' : '普通用户' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="创建时间" width="180" />
      <el-table-column prop="updated_at" label="更新时间" width="180" />
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link @click="handleEdit(row)" :disabled="row.username === 'admin'">编辑</el-button>
          <el-button type="warning" link @click="handleResetPassword(row)">重置密码</el-button>
          <el-button type="danger" link @click="handleDelete(row)" :disabled="row.username === 'admin'">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="editingItem ? '编辑用户' : '新增用户'" width="450px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" :disabled="!!editingItem" />
        </el-form-item>
        <el-form-item label="姓名" prop="realName">
          <el-input v-model="form.realName" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="密码" prop="password" v-if="!editingItem">
          <el-input v-model="form.password" type="password" placeholder="请输入密码" show-password />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="form.role" style="width: 100%">
            <el-option label="管理员" value="admin" />
            <el-option label="普通用户" value="user" />
          </el-select>
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

const searchForm = reactive({ username: '' })

const form = reactive({
  username: '',
  realName: '',
  password: '',
  role: 'user'
})

const rules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在3到20个字符', trigger: 'blur' }
  ],
  realName: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度在6到20个字符', trigger: 'blur' }
  ],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }]
}

onMounted(() => {
  loadData()
})

async function loadData() {
  loading.value = true
  try {
    let sql = 'SELECT id, username, real_name, role, created_at, updated_at FROM sys_user WHERE 1=1'
    if (searchForm.username) {
      sql += ` AND username LIKE '%${searchForm.username}%'`
    }
    sql += ' ORDER BY id'
    const data = await window.api.database.query(sql)
    tableData.value = data
  } catch (error: any) {
    ElMessage.error(error.message || '加载数据失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() { loadData() }

function handleReset() {
  searchForm.username = ''
  loadData()
}

function handleAdd() {
  editingItem.value = null
  Object.assign(form, { username: '', realName: '', password: '', role: 'user' })
  dialogVisible.value = true
}

function handleEdit(row: any) {
  editingItem.value = row
  Object.assign(form, {
    username: row.username,
    realName: row.real_name || '',
    password: '',
    role: row.role || 'user'
  })
  dialogVisible.value = true
}

async function handleResetPassword(row: any) {
  try {
    const { value } = await ElMessageBox.prompt('请输入新密码', '重置密码', {
      inputPattern: /^.{6,20}$/,
      inputErrorMessage: '密码长度在6到20个字符'
    })
    
    const crypto = require('crypto')
    const hashedPassword = crypto.createHash('sha256').update(value + 'k3_salt').digest('hex')
    
    await window.api.database.execute(
      `UPDATE sys_user SET password = '${hashedPassword}', updated_at = datetime('now') WHERE id = ${row.id}`
    )
    ElMessage.success('密码重置成功')
  } catch (e) {}
}

async function handleDelete(row: any) {
  if (row.username === 'admin') {
    ElMessage.warning('不能删除管理员账户')
    return
  }
  
  try {
    await ElMessageBox.confirm('确定要删除该用户吗？', '提示', { type: 'warning' })
    await window.api.database.execute(`DELETE FROM sys_user WHERE id = ${row.id}`)
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
        `UPDATE sys_user SET real_name='${escapeSql(form.realName)}', role='${form.role}', updated_at=datetime('now') WHERE id=${editingItem.value.id}`
      )
    } else {
      const crypto = require('crypto')
      const hashedPassword = crypto.createHash('sha256').update(form.password + 'k3_salt').digest('hex')
      
      await window.api.database.execute(
        `INSERT INTO sys_user (username, password, real_name, role) VALUES ('${escapeSql(form.username)}', '${hashedPassword}', '${escapeSql(form.realName)}', '${form.role}')`
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
