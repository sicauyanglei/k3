<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <span>数据备份与恢复</span>
      </template>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-card shadow="never">
            <template #header>
              <div class="card-header">
                <el-icon><Download /></el-icon>
                <span>数据备份</span>
              </div>
            </template>
            <el-form label-width="100px">
              <el-form-item label="备份说明">
                <el-alert type="info" :closable="false">
                  备份将导出当前账套的所有数据，包括基础资料、凭证、报表等。
                </el-alert>
              </el-form-item>
              <el-form-item label="备份文件">
                <el-input v-model="backupFilename" placeholder="备份文件名">
                  <template #append>.k3bak</template>
                </el-input>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="handleBackup" :loading="backupLoading">
                  <el-icon><Download /></el-icon>
                  开始备份
                </el-button>
              </el-form-item>
            </el-form>
          </el-card>
        </el-col>

        <el-col :span="12">
          <el-card shadow="never">
            <template #header>
              <div class="card-header">
                <el-icon><Upload /></el-icon>
                <span>数据恢复</span>
              </div>
            </template>
            <el-form label-width="100px">
              <el-form-item label="恢复说明">
                <el-alert type="warning" :closable="false">
                  恢复将覆盖当前账套的所有数据，请谨慎操作！建议先备份当前数据。
                </el-alert>
              </el-form-item>
              <el-form-item label="选择文件">
                <el-upload
                  ref="uploadRef"
                  :auto-upload="false"
                  :limit="1"
                  accept=".k3bak,.json"
                  :on-change="handleFileChange"
                  :on-remove="handleFileRemove"
                >
                  <el-button type="primary">选择备份文件</el-button>
                  <template #tip>
                    <div class="el-upload__tip">只能上传 .k3bak 或 .json 文件</div>
                  </template>
                </el-upload>
              </el-form-item>
              <el-form-item>
                <el-button type="danger" @click="handleRestore" :loading="restoreLoading" :disabled="!selectedFile">
                  <el-icon><Upload /></el-icon>
                  开始恢复
                </el-button>
              </el-form-item>
            </el-form>
          </el-card>
        </el-col>
      </el-row>

      <el-card shadow="never" style="margin-top: 20px">
        <template #header>
          <div class="card-header">
            <el-icon><Clock /></el-icon>
            <span>备份历史</span>
          </div>
        </template>
        <el-table :data="backupHistory" border stripe v-loading="historyLoading">
          <el-table-column prop="filename" label="文件名" width="250" />
          <el-table-column prop="size" label="文件大小" width="120">
            <template #default="{ row }">{{ formatSize(row.size) }}</template>
          </el-table-column>
          <el-table-column prop="created_at" label="备份时间" width="180" />
          <el-table-column prop="type" label="类型" width="100">
            <template #default="{ row }">
              <el-tag :type="row.type === 'auto' ? 'info' : 'primary'">
                {{ row.type === 'auto' ? '自动' : '手动' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150">
            <template #default="{ row }">
              <el-button type="primary" link @click="handleDownloadBackup(row)">下载</el-button>
              <el-button type="danger" link @click="handleDeleteBackup(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { UploadFile } from 'element-plus'

const backupFilename = ref(`backup_${new Date().toISOString().split('T')[0]}`)
const backupLoading = ref(false)
const restoreLoading = ref(false)
const historyLoading = ref(false)
const selectedFile = ref<File | null>(null)
const backupHistory = ref<any[]>([])

onMounted(() => {
  loadBackupHistory()
})

async function loadBackupHistory() {
  historyLoading.value = true
  try {
    const data = await window.api.database.query(
      'SELECT * FROM sys_backup_log ORDER BY created_at DESC LIMIT 20'
    )
    backupHistory.value = data
  } catch (error) {
    console.error('加载备份历史失败', error)
  } finally {
    historyLoading.value = false
  }
}

async function handleBackup() {
  try {
    await ElMessageBox.confirm('确定要备份当前数据吗？', '提示', { type: 'info' })
    
    backupLoading.value = true
    
    const tables = [
      'bd_account', 'bd_department', 'bd_currency', 'bd_account_period',
      'bd_customer', 'bd_supplier', 'bd_employee',
      'gl_voucher', 'gl_voucher_entry', 'gl_balance',
      'ar_invoice', 'ar_receipt', 'ap_invoice', 'ap_payment',
      'fa_asset', 'fa_category', 'fa_depreciation',
      'hr_salary_item', 'hr_salary_data', 'hr_salary_payment',
      'cash_journal', 'cash_bank_account', 'cash_check',
      'rpt_template'
    ]
    
    const backupData: Record<string, any[]> = {}
    
    for (const table of tables) {
      try {
        const data = await window.api.database.query(`SELECT * FROM ${table}`)
        backupData[table] = data
      } catch (e) {
        backupData[table] = []
      }
    }
    
    backupData['_meta'] = {
      version: '1.0',
      backup_time: new Date().toISOString(),
      tables: tables
    }
    
    const jsonStr = JSON.stringify(backupData, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${backupFilename.value}.k3bak`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    await window.api.database.execute(
      `INSERT INTO sys_backup_log (filename, size, type) VALUES ('${backupFilename.value}.k3bak', ${jsonStr.length}, 'manual')`
    )
    
    ElMessage.success('备份成功')
    loadBackupHistory()
  } catch (e) {
    console.error(e)
  } finally {
    backupLoading.value = false
  }
}

function handleFileChange(file: UploadFile) {
  if (file.raw) {
    selectedFile.value = file.raw
  }
}

function handleFileRemove() {
  selectedFile.value = null
}

async function handleRestore() {
  if (!selectedFile.value) {
    ElMessage.warning('请选择备份文件')
    return
  }
  
  try {
    await ElMessageBox.confirm(
      '恢复将覆盖当前所有数据，此操作不可逆！确定要继续吗？',
      '警告',
      { type: 'warning', confirmButtonText: '确定恢复', cancelButtonText: '取消' }
    )
    
    restoreLoading.value = true
    
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const backupData = JSON.parse(e.target?.result as string)
        
        if (!backupData._meta) {
          throw new Error('无效的备份文件格式')
        }
        
        for (const table of backupData._meta.tables || []) {
          if (backupData[table] && backupData[table].length > 0) {
            try {
              await window.api.database.execute(`DELETE FROM ${table}`)
              
              for (const row of backupData[table]) {
                const columns = Object.keys(row).filter(k => k !== 'id')
                const values = columns.map(c => {
                  const val = row[c]
                  if (val === null || val === undefined) return 'NULL'
                  if (typeof val === 'number') return val
                  return `'${String(val).replace(/'/g, "''")}'`
                })
                
                await window.api.database.execute(
                  `INSERT INTO ${table} (${columns.join(',')}) VALUES (${values.join(',')})`
                )
              }
            } catch (err) {
              console.error(`恢复表 ${table} 失败:`, err)
            }
          }
        }
        
        ElMessage.success('数据恢复成功，请重启应用')
      } catch (error: any) {
        ElMessage.error(error.message || '恢复失败')
      } finally {
        restoreLoading.value = false
      }
    }
    
    reader.readAsText(selectedFile.value)
  } catch (e) {
    restoreLoading.value = false
  }
}

async function handleDownloadBackup(row: any) {
  ElMessage.info('请从本地文件系统查找备份文件')
}

async function handleDeleteBackup(row: any) {
  try {
    await ElMessageBox.confirm('确定要删除该备份记录吗？', '提示', { type: 'warning' })
    await window.api.database.execute(`DELETE FROM sys_backup_log WHERE id = ${row.id}`)
    ElMessage.success('删除成功')
    loadBackupHistory()
  } catch (e) {}
}

function formatSize(size: number) {
  if (!size) return '0 B'
  if (size < 1024) return size + ' B'
  if (size < 1024 * 1024) return (size / 1024).toFixed(2) + ' KB'
  return (size / 1024 / 1024).toFixed(2) + ' MB'
}
</script>

<style scoped>
.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
