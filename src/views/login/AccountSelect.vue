<template>
  <div class="account-select-container">
    <div class="account-select-box">
      <div class="header">
        <h2>选择账套</h2>
        <p>请选择要打开的账套或创建新账套</p>
      </div>
      
      <div class="account-list" v-loading="loading">
        <div
          v-for="account in accountList"
          :key="account.id"
          class="account-item"
          @click="openAccount(account)"
        >
          <div class="account-icon">
            <el-icon size="32"><FolderOpened /></el-icon>
          </div>
          <div class="account-info">
            <div class="account-name">{{ account.name }}</div>
            <div class="account-company">{{ account.company_name }}</div>
            <div class="account-meta">
              <span>{{ account.accounting_standard }}</span>
              <span>{{ formatDate(account.created_at) }}</span>
            </div>
          </div>
          <div class="account-actions">
            <el-button type="primary" link @click.stop="openAccount(account)">
              打开
            </el-button>
            <el-button type="danger" link @click.stop="deleteAccount(account)">
              删除
            </el-button>
          </div>
        </div>
        
        <div v-if="accountList.length === 0 && !loading" class="empty-state">
          <el-empty description="暂无账套，请创建新账套" />
        </div>
      </div>
      
      <div class="actions">
        <el-button type="primary" @click="showCreateDialog = true">
          <el-icon><Plus /></el-icon>
          新建账套
        </el-button>
        <el-button @click="handleRestore">
          <el-icon><Upload /></el-icon>
          恢复账套
        </el-button>
        <el-button @click="handleLogout">
          <el-icon><SwitchButton /></el-icon>
          退出登录
        </el-button>
      </div>
    </div>
    
    <el-dialog
      v-model="showCreateDialog"
      title="新建账套"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="100px">
        <el-form-item label="账套名称" prop="name">
          <el-input v-model="createForm.name" placeholder="请输入账套名称" />
        </el-form-item>
        <el-form-item label="公司名称" prop="companyName">
          <el-input v-model="createForm.companyName" placeholder="请输入公司名称" />
        </el-form-item>
        <el-form-item label="会计准则" prop="accountingStandard">
          <el-select v-model="createForm.accountingStandard" style="width: 100%">
            <el-option label="企业会计准则" value="enterprise" />
            <el-option label="小企业会计准则" value="small_enterprise" />
          </el-select>
        </el-form-item>
        <el-form-item label="会计年度" prop="fiscalYearStart">
          <el-date-picker
            v-model="createForm.fiscalYearStart"
            type="year"
            placeholder="选择年度"
            value-format="YYYY"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreateDialog = false">取消</el-button>
        <el-button type="primary" :loading="createLoading" @click="handleCreate">
          创建
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { useAccountStore } from '@/stores/account'
import dayjs from 'dayjs'

const router = useRouter()
const userStore = useUserStore()
const accountStore = useAccountStore()

const loading = ref(false)
const createLoading = ref(false)
const showCreateDialog = ref(false)
const accountList = ref<any[]>([])
const createFormRef = ref<FormInstance>()

const createForm = reactive({
  name: '',
  companyName: '',
  accountingStandard: 'enterprise',
  fiscalYearStart: String(new Date().getFullYear())
})

const createRules: FormRules = {
  name: [{ required: true, message: '请输入账套名称', trigger: 'blur' }],
  companyName: [{ required: true, message: '请输入公司名称', trigger: 'blur' }],
  accountingStandard: [{ required: true, message: '请选择会计准则', trigger: 'change' }],
  fiscalYearStart: [{ required: true, message: '请选择会计年度', trigger: 'change' }]
}

onMounted(() => {
  loadAccountList()
})

async function loadAccountList() {
  loading.value = true
  try {
    accountList.value = await window.api.account.getList()
  } catch (error: any) {
    ElMessage.error(error.message || '加载账套列表失败')
  } finally {
    loading.value = false
  }
}

async function openAccount(account: any) {
  try {
    await window.api.account.open(account.id)
    accountStore.setAccount({
      id: account.id,
      name: account.name,
      companyName: account.company_name,
      dbPath: account.db_path,
      accountingStandard: account.accounting_standard,
      fiscalYearStart: account.fiscal_year_start,
      createdAt: account.created_at
    })
    router.push('/dashboard')
  } catch (error: any) {
    ElMessage.error(error.message || '打开账套失败')
  }
}

async function deleteAccount(account: any) {
  try {
    await ElMessageBox.confirm(
      `确定要删除账套"${account.name}"吗？删除前会自动备份。`,
      '删除确认',
      { type: 'warning' }
    )
    await window.api.account.delete(account.id)
    ElMessage.success('删除成功')
    loadAccountList()
  } catch (e) {
    // cancelled
  }
}

async function handleCreate() {
  const valid = await createFormRef.value?.validate()
  if (!valid) return

  createLoading.value = true
  try {
    await window.api.account.create({
      name: createForm.name,
      companyName: createForm.companyName,
      accountingStandard: createForm.accountingStandard,
      fiscalYearStart: `${createForm.fiscalYearStart}-01-01`
    })
    ElMessage.success('创建成功')
    showCreateDialog.value = false
    loadAccountList()
  } catch (error: any) {
    ElMessage.error(error.message || '创建账套失败')
  } finally {
    createLoading.value = false
  }
}

async function handleRestore() {
  try {
    const result = await window.api.dialog.openFile({
      title: '选择备份文件',
      filters: [{ name: 'K3备份文件', extensions: ['k3bak', 'k3db'] }]
    })
    if (!result.canceled && result.filePaths.length > 0) {
      await window.api.account.restore(result.filePaths[0])
      ElMessage.success('恢复成功')
      loadAccountList()
    }
  } catch (error: any) {
    ElMessage.error(error.message || '恢复失败')
  }
}

async function handleLogout() {
  try {
    await ElMessageBox.confirm('确定要退出登录吗？', '提示', { type: 'warning' })
    await window.api.user.logout()
    userStore.logout()
    router.push('/login')
  } catch (e) {
    // cancelled
  }
}

function formatDate(date: string) {
  return dayjs(date).format('YYYY-MM-DD')
}
</script>

<style scoped lang="scss">
@use '@/styles/variables.scss' as *;

.account-select-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 100vh;
  background-color: $bg-color;
  padding: 20px;
}

.account-select-box {
  width: 100%;
  max-width: 800px;
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  padding: 24px;
}

.header {
  text-align: center;
  margin-bottom: 24px;
  
  h2 {
    font-size: 20px;
    font-weight: 600;
    color: $text-primary;
    margin-bottom: 8px;
  }
  
  p {
    font-size: 14px;
    color: $text-secondary;
  }
}

.account-list {
  min-height: 200px;
  max-height: 400px;
  overflow-y: auto;
  margin-bottom: 24px;
}

.account-item {
  display: flex;
  align-items: center;
  padding: 16px;
  border: 1px solid $border-color-lighter;
  border-radius: 8px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    border-color: $primary-color;
    background-color: #fafafa;
  }
  
  &:last-child {
    margin-bottom: 0;
  }
}

.account-icon {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f0f7ff;
  border-radius: 8px;
  color: $primary-color;
  margin-right: 16px;
}

.account-info {
  flex: 1;
  
  .account-name {
    font-size: 16px;
    font-weight: 500;
    color: $text-primary;
    margin-bottom: 4px;
  }
  
  .account-company {
    font-size: 14px;
    color: $text-regular;
    margin-bottom: 4px;
  }
  
  .account-meta {
    font-size: 12px;
    color: $text-secondary;
    
    span {
      margin-right: 16px;
    }
  }
}

.account-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.empty-state {
  padding: 40px 0;
}

.actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}
</style>
