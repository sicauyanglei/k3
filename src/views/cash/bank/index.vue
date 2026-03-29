<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <span>银行对账</span>
      </template>

      <el-form :inline="true" style="margin-bottom: 16px">
        <el-form-item label="银行账户">
          <el-select v-model="selectedAccount" placeholder="请选择银行账户" style="width: 250px">
            <el-option v-for="acc in bankAccounts" :key="acc.id" :label="`${acc.account_no} - ${acc.account_name}`" :value="acc.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="对账日期">
          <el-date-picker v-model="reconcileDate" type="date" placeholder="选择日期" value-format="YYYY-MM-DD" style="width: 150px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleReconcile">开始对账</el-button>
        </el-form-item>
      </el-form>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-card shadow="never">
            <template #header>
              <span>企业账面</span>
            </template>
            <el-descriptions :column="1" border>
              <el-descriptions-item label="期初余额">{{ formatMoney(companyData.beginBalance) }}</el-descriptions-item>
              <el-descriptions-item label="本期收入">{{ formatMoney(companyData.debit) }}</el-descriptions-item>
              <el-descriptions-item label="本期支出">{{ formatMoney(companyData.credit) }}</el-descriptions-item>
              <el-descriptions-item label="期末余额">{{ formatMoney(companyData.endBalance) }}</el-descriptions-item>
            </el-descriptions>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card shadow="never">
            <template #header>
              <span>银行对账单</span>
            </template>
            <el-descriptions :column="1" border>
              <el-descriptions-item label="期初余额">
                <el-input-number v-model="bankData.beginBalance" :precision="2" style="width: 150px" />
              </el-descriptions-item>
              <el-descriptions-item label="本期收入">
                <el-input-number v-model="bankData.debit" :precision="2" style="width: 150px" />
              </el-descriptions-item>
              <el-descriptions-item label="本期支出">
                <el-input-number v-model="bankData.credit" :precision="2" style="width: 150px" />
              </el-descriptions-item>
              <el-descriptions-item label="期末余额">
                <el-input-number v-model="bankData.endBalance" :precision="2" style="width: 150px" />
              </el-descriptions-item>
            </el-descriptions>
          </el-card>
        </el-col>
      </el-row>

      <el-card shadow="never" style="margin-top: 16px">
        <template #header>
          <span>对账结果</span>
        </template>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="企业账面余额">{{ formatMoney(companyData.endBalance) }}</el-descriptions-item>
          <el-descriptions-item label="银行对账单余额">{{ formatMoney(bankData.endBalance) }}</el-descriptions-item>
          <el-descriptions-item label="差额">
            <span :class="diffClass">{{ formatMoney(difference) }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="对账状态">
            <el-tag :type="isBalanced ? 'success' : 'danger'">{{ isBalanced ? '平衡' : '不平衡' }}</el-tag>
          </el-descriptions-item>
        </el-descriptions>
      </el-card>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'

const bankAccounts = ref<any[]>([])
const selectedAccount = ref<number | null>(null)
const reconcileDate = ref(new Date().toISOString().split('T')[0])

const companyData = reactive({
  beginBalance: 0,
  debit: 0,
  credit: 0,
  endBalance: 0
})

const bankData = reactive({
  beginBalance: 0,
  debit: 0,
  credit: 0,
  endBalance: 0
})

const difference = computed(() => companyData.endBalance - bankData.endBalance)
const isBalanced = computed(() => Math.abs(difference.value) < 0.01)
const diffClass = computed(() => isBalanced.value ? 'text-success' : 'text-danger')

onMounted(() => {
  loadBankAccounts()
})

async function loadBankAccounts() {
  const data = await window.api.database.query(
    'SELECT * FROM cash_bank_account WHERE is_enabled = 1 ORDER BY account_no'
  )
  bankAccounts.value = data
}

async function handleReconcile() {
  if (!selectedAccount.value) {
    ElMessage.warning('请选择银行账户')
    return
  }
  
  const journal = await window.api.database.query(
    `SELECT SUM(debit) as debit, SUM(credit) as credit FROM cash_journal WHERE journal_type = 'bank' AND account_code IN (SELECT account_no FROM cash_bank_account WHERE id = ${selectedAccount.value})`
  )
  
  companyData.debit = journal[0]?.debit || 0
  companyData.credit = journal[0]?.credit || 0
  companyData.endBalance = companyData.beginBalance + companyData.debit - companyData.credit
  
  ElMessage.info('对账完成')
}

function formatMoney(v: number) {
  return '¥' + (v || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })
}
</script>

<style scoped>
.text-success {
  color: #67c23a;
}
.text-danger {
  color: #f56c6c;
}
</style>
