<template>
  <div class="page-container">
    <div class="table-toolbar">
      <el-button type="primary" @click="handleCreate">
        <el-icon><Plus /></el-icon>
        新建账套
      </el-button>
    </div>
    
    <el-table :data="tableData" border stripe v-loading="loading">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="name" label="账套名称" />
      <el-table-column prop="company_name" label="公司名称" />
      <el-table-column prop="accounting_standard" label="会计准则" />
      <el-table-column prop="created_at" label="创建时间" width="180" />
      <el-table-column label="操作" width="200" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link @click="handleOpen(row)">打开</el-button>
          <el-button type="warning" link @click="handleBackup(row)">备份</el-button>
          <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAccountStore } from '@/stores/account'

const router = useRouter()
const accountStore = useAccountStore()
const loading = ref(false)
const tableData = ref<any[]>([])

onMounted(() => {
  loadData()
})

async function loadData() {
  loading.value = true
  try {
    tableData.value = await window.api.account.getList()
  } catch (error: any) {
    ElMessage.error(error.message || '加载数据失败')
  } finally {
    loading.value = false
  }
}

function handleCreate() {
  router.push('/account-select')
}

async function handleOpen(row: any) {
  try {
    await window.api.account.open(row.id)
    accountStore.setAccount({
      id: row.id,
      name: row.name,
      companyName: row.company_name,
      dbPath: row.db_path,
      accountingStandard: row.accounting_standard,
      fiscalYearStart: row.fiscal_year_start,
      createdAt: row.created_at
    })
    ElMessage.success('打开成功')
  } catch (error: any) {
    ElMessage.error(error.message || '打开失败')
  }
}

async function handleBackup(row: any) {
  try {
    const result = await window.api.dialog.saveFile({
      title: '保存备份',
      defaultPath: `${row.name}_${Date.now()}.k3bak`,
      filters: [{ name: 'K3备份文件', extensions: ['k3bak'] }]
    })
    if (!result.canceled && result.filePath) {
      await window.api.account.backup(row.id, result.filePath)
      ElMessage.success('备份成功')
    }
  } catch (error: any) {
    ElMessage.error(error.message || '备份失败')
  }
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm(`确定要删除账套"${row.name}"吗？`, '提示', { type: 'warning' })
    await window.api.account.delete(row.id)
    ElMessage.success('删除成功')
    loadData()
  } catch (e) {
    // cancelled
  }
}
</script>
