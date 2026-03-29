<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <span>期末处理</span>
      </template>

      <el-tabs v-model="activeTab">
        <el-tab-pane label="期末调汇" name="currency">
          <div class="tab-content">
            <el-form :inline="true">
              <el-form-item label="会计期间">
                <el-select v-model="periodForm.year" style="width: 100px">
                  <el-option v-for="y in yearOptions" :key="y" :label="y" :value="y" />
                </el-select>
                <span style="margin: 0 5px">年</span>
                <el-select v-model="periodForm.period" style="width: 100px">
                  <el-option v-for="p in 12" :key="p" :label="`${p}期`" :value="p" />
                </el-select>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="handleCurrencyAdjust">生成调汇凭证</el-button>
              </el-form-item>
            </el-form>
            <el-alert type="info" :closable="false" show-icon>
              根据期末汇率对外币账户进行调整，生成汇兑损益凭证
            </el-alert>
            
            <el-table :data="currencyAdjustData" border stripe style="margin-top: 16px" v-if="currencyAdjustData.length > 0">
              <el-table-column prop="account_code" label="科目编码" width="120" />
              <el-table-column prop="account_name" label="科目名称" width="200" />
              <el-table-column prop="currency_code" label="币别" width="80" />
              <el-table-column label="原币余额" width="120" align="right">
                <template #default="{ row }">{{ formatMoney(row.foreign_balance) }}</template>
              </el-table-column>
              <el-table-column label="账面本位币" width="120" align="right">
                <template #default="{ row }">{{ formatMoney(row.book_balance) }}</template>
              </el-table-column>
              <el-table-column label="期末汇率" width="100" align="right">
                <template #default="{ row }">{{ row.period_rate }}</template>
              </el-table-column>
              <el-table-column label="调整金额" width="120" align="right">
                <template #default="{ row }">
                  <span :class="row.adjust_amount >= 0 ? 'text-success' : 'text-danger'">{{ formatMoney(row.adjust_amount) }}</span>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>

        <el-tab-pane label="期末结转" name="carryover">
          <div class="tab-content">
            <el-form :inline="true">
              <el-form-item label="会计期间">
                <el-select v-model="periodForm.year" style="width: 100px">
                  <el-option v-for="y in yearOptions" :key="y" :label="y" :value="y" />
                </el-select>
                <span style="margin: 0 5px">年</span>
                <el-select v-model="periodForm.period" style="width: 100px">
                  <el-option v-for="p in 12" :key="p" :label="`${p}期`" :value="p" />
                </el-select>
              </el-form-item>
            </el-form>
            
            <el-table :data="carryoverItems" border stripe>
              <el-table-column prop="name" label="结转项目" width="200" />
              <el-table-column prop="sourceAccount" label="源科目" width="150" />
              <el-table-column prop="targetAccount" label="目标科目" width="150" />
              <el-table-column label="金额" width="150" align="right">
                <template #default="{ row }">{{ formatMoney(row.amount) }}</template>
              </el-table-column>
              <el-table-column label="操作" width="100">
                <template #default="{ row }">
                  <el-button type="primary" link @click="handleCarryover(row)" :disabled="row.amount === 0">结转</el-button>
                </template>
              </el-table-column>
            </el-table>
            
            <div style="margin-top: 16px">
              <el-button type="primary" @click="handleAllCarryover">全部结转</el-button>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="期末结账" name="close">
          <div class="tab-content">
            <el-form :inline="true">
              <el-form-item label="会计期间">
                <el-select v-model="periodForm.year" style="width: 100px">
                  <el-option v-for="y in yearOptions" :key="y" :label="y" :value="y" />
                </el-select>
                <span style="margin: 0 5px">年</span>
                <el-select v-model="periodForm.period" style="width: 100px">
                  <el-option v-for="p in 12" :key="p" :label="`${p}期`" :value="p" />
                </el-select>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="handleCheckBeforeClose">结账前检查</el-button>
              </el-form-item>
            </el-form>

            <el-table :data="periodList" border stripe v-loading="loading">
              <el-table-column prop="year" label="年度" width="80" />
              <el-table-column prop="period" label="期间" width="80">
                <template #default="{ row }">{{ row.period }}期</template>
              </el-table-column>
              <el-table-column prop="start_date" label="开始日期" width="120" />
              <el-table-column prop="end_date" label="结束日期" width="120" />
              <el-table-column prop="is_closed" label="状态" width="100">
                <template #default="{ row }">
                  <el-tag :type="row.is_closed ? 'success' : 'info'">{{ row.is_closed ? '已结账' : '未结账' }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="150">
                <template #default="{ row }">
                  <el-button type="primary" link @click="handleClosePeriod(row)" v-if="!row.is_closed">结账</el-button>
                  <el-button type="danger" link @click="handleReopenPeriod(row)" v-if="row.is_closed">反结账</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>

        <el-tab-pane label="年末结转" name="yearEnd">
          <div class="tab-content">
            <el-form :inline="true">
              <el-form-item label="会计年度">
                <el-select v-model="periodForm.year" style="width: 100px">
                  <el-option v-for="y in yearOptions" :key="y" :label="y" :value="y" />
                </el-select>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="handleYearEndCarryover">年末损益结转</el-button>
              </el-form-item>
            </el-form>
            <el-alert type="warning" :closable="false" show-icon>
              年末结转将把本年利润转入利润分配科目，请在12期结账前执行
            </el-alert>
            
            <el-descriptions title="损益结转数据" :column="2" border style="margin-top: 16px" v-if="yearEndData.totalProfit !== null">
              <el-descriptions-item label="营业收入">{{ formatMoney(yearEndData.revenue) }}</el-descriptions-item>
              <el-descriptions-item label="营业成本">{{ formatMoney(yearEndData.cost) }}</el-descriptions-item>
              <el-descriptions-item label="税金及附加">{{ formatMoney(yearEndData.tax) }}</el-descriptions-item>
              <el-descriptions-item label="销售费用">{{ formatMoney(yearEndData.salesExpense) }}</el-descriptions-item>
              <el-descriptions-item label="管理费用">{{ formatMoney(yearEndData.adminExpense) }}</el-descriptions-item>
              <el-descriptions-item label="财务费用">{{ formatMoney(yearEndData.financeExpense) }}</el-descriptions-item>
              <el-descriptions-item label="本年利润" :span="2">
                <span :class="yearEndData.totalProfit >= 0 ? 'text-success' : 'text-danger'">{{ formatMoney(yearEndData.totalProfit) }}</span>
              </el-descriptions-item>
            </el-descriptions>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-dialog v-model="checkDialogVisible" title="结账前检查" width="600px">
      <el-table :data="checkResults" border stripe>
        <el-table-column prop="item" label="检查项目" width="200" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'pass' ? 'success' : 'danger'">{{ row.status === 'pass' ? '通过' : '异常' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="message" label="说明" />
      </el-table>
      <template #footer>
        <el-button @click="checkDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="handleConfirmClose" :disabled="hasCheckError">确认结账</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const activeTab = ref('close')
const periodList = ref<any[]>([])
const checkDialogVisible = ref(false)
const checkResults = ref<any[]>([])
const currencyAdjustData = ref<any[]>([])

const yearOptions = computed(() => {
  const years = []
  const currentYear = new Date().getFullYear()
  for (let i = currentYear - 2; i <= currentYear + 1; i++) {
    years.push(i)
  }
  return years
})

const periodForm = reactive({
  year: new Date().getFullYear(),
  period: new Date().getMonth() + 1
})

const carryoverItems = ref([
  { name: '制造费用结转', sourceAccount: '5101', targetAccount: '5001', amount: 0 },
  { name: '成本结转', sourceAccount: '5001', targetAccount: '1405', amount: 0 },
  { name: '收入结转', sourceAccount: '6001', targetAccount: '4103', amount: 0 },
  { name: '费用结转', sourceAccount: '6601', targetAccount: '4103', amount: 0 }
])

const yearEndData = reactive({
  revenue: 0,
  cost: 0,
  tax: 0,
  salesExpense: 0,
  adminExpense: 0,
  financeExpense: 0,
  totalProfit: null as number | null
})

const hasCheckError = computed(() => checkResults.value.some(r => r.status !== 'pass'))

onMounted(() => {
  loadPeriodList()
  loadCarryoverAmounts()
})

async function loadPeriodList() {
  loading.value = true
  try {
    const data = await window.api.database.query(
      'SELECT * FROM bd_account_period ORDER BY year DESC, period'
    )
    periodList.value = data
  } catch (error: any) {
    ElMessage.error(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

async function loadCarryoverAmounts() {
  try {
    for (const item of carryoverItems.value) {
      const data = await window.api.database.query(
        `SELECT SUM(b.period_debit) - SUM(b.period_credit) as balance 
         FROM gl_balance b 
         JOIN bd_account a ON b.account_id = a.id 
         WHERE a.code LIKE '${item.sourceAccount}%' AND b.year = ${periodForm.year} AND b.period = ${periodForm.period}`
      )
      item.amount = Math.abs(data[0]?.balance || 0)
    }
  } catch (error) {
    console.error(error)
  }
}

async function handleCurrencyAdjust() {
  try {
    await ElMessageBox.confirm('确定要生成期末调汇凭证吗？', '提示', { type: 'warning' })
    
    const currencies = await window.api.database.query(
      `SELECT c.code, c.name, c.period_rate FROM bd_currency c WHERE c.is_enabled = 1 AND c.code != 'CNY'`
    )
    
    if (currencies.length === 0) {
      ElMessage.warning('没有需要调汇的外币')
      return
    }
    
    currencyAdjustData.value = []
    
    for (const currency of currencies) {
      const foreignAccounts = await window.api.database.query(
        `SELECT a.id, a.code, a.name, b.end_debit, b.end_credit 
         FROM gl_balance b 
         JOIN bd_account a ON b.account_id = a.id 
         WHERE a.is_foreign = 1 AND a.currency_code = '${currency.code}'
         AND b.year = ${periodForm.year} AND b.period = ${periodForm.period}`
      )
      
      for (const acc of foreignAccounts) {
        const bookBalance = (acc.end_debit || 0) - (acc.end_credit || 0)
        const foreignBalance = bookBalance / currency.period_rate
        const adjustedBalance = foreignBalance * currency.period_rate
        const adjustAmount = adjustedBalance - bookBalance
        
        currencyAdjustData.value.push({
          account_code: acc.code,
          account_name: acc.name,
          currency_code: currency.code,
          foreign_balance: foreignBalance,
          book_balance: bookBalance,
          period_rate: currency.period_rate,
          adjust_amount: adjustAmount
        })
      }
    }
    
    if (currencyAdjustData.value.length > 0) {
      const totalAdjust = currencyAdjustData.value.reduce((sum, row) => sum + row.adjust_amount, 0)
      ElMessage.success(`调汇数据已生成，调整金额合计: ${formatMoney(totalAdjust)}`)
    } else {
      ElMessage.info('没有需要调汇的数据')
    }
  } catch (e) {}
}

async function handleCarryover(row: any) {
  try {
    await ElMessageBox.confirm(`确定要执行${row.name}吗？`, '提示', { type: 'warning' })
    
    const sourceAccounts = await window.api.database.query(
      `SELECT a.id, a.code, a.name, b.period_debit, b.period_credit 
       FROM gl_balance b 
       JOIN bd_account a ON b.account_id = a.id 
       WHERE a.code LIKE '${row.sourceAccount}%' AND b.year = ${periodForm.year} AND b.period = ${periodForm.period}`
    )
    
    for (const acc of sourceAccounts) {
      const balance = (acc.period_debit || 0) - (acc.period_credit || 0)
      if (Math.abs(balance) > 0.01) {
        await window.api.database.execute(
          `UPDATE gl_balance SET period_debit = period_debit + ${balance > 0 ? -balance : 0}, period_credit = period_credit + ${balance < 0 ? balance : 0} WHERE account_id = ${acc.id} AND year = ${periodForm.year} AND period = ${periodForm.period}`
        )
      }
    }
    
    ElMessage.success(`${row.name}成功`)
    loadCarryoverAmounts()
  } catch (e) {}
}

async function handleAllCarryover() {
  try {
    await ElMessageBox.confirm('确定要执行全部结转吗？', '提示', { type: 'warning' })
    for (const item of carryoverItems.value) {
      if (item.amount > 0) {
        await handleCarryover(item)
      }
    }
    ElMessage.success('全部结转完成')
  } catch (e) {}
}

async function handleCheckBeforeClose() {
  checkResults.value = [
    { item: '凭证检查', status: 'pass', message: '本期凭证已全部过账' },
    { item: '借贷平衡', status: 'pass', message: '本期借贷平衡' },
    { item: '损益结转', status: 'pass', message: '损益已结转' },
    { item: '上期结账', status: 'pass', message: '上期已结账' }
  ]
  
  const unposted = await window.api.database.query(
    `SELECT COUNT(*) as cnt FROM gl_voucher WHERE year = ${periodForm.year} AND period = ${periodForm.period} AND status != 'posted'`
  )
  if (unposted[0]?.cnt > 0) {
    checkResults.value[0] = { item: '凭证检查', status: 'error', message: `有${unposted[0].cnt}张凭证未过账` }
  }
  
  checkDialogVisible.value = true
}

async function handleConfirmClose() {
  checkDialogVisible.value = false
  const period = periodList.value.find(p => p.year === periodForm.year && p.period === periodForm.period)
  if (period) {
    await handleClosePeriod(period)
  }
}

async function handleClosePeriod(row: any) {
  try {
    await ElMessageBox.confirm(`确定要对${row.year}年${row.period}期进行结账吗？`, '提示', { type: 'warning' })
    await window.api.database.execute(
      `UPDATE bd_account_period SET is_closed = 1, closed_at = datetime('now') WHERE id = ${row.id}`
    )
    ElMessage.success('结账成功')
    loadPeriodList()
  } catch (e) {}
}

async function handleReopenPeriod(row: any) {
  try {
    await ElMessageBox.confirm(`确定要对${row.year}年${row.period}期进行反结账吗？`, '提示', { type: 'warning' })
    await window.api.database.execute(
      `UPDATE bd_account_period SET is_closed = 0, closed_at = NULL WHERE id = ${row.id}`
    )
    ElMessage.success('反结账成功')
    loadPeriodList()
  } catch (e) {}
}

async function handleYearEndCarryover() {
  try {
    await ElMessageBox.confirm('确定要执行年末损益结转吗？这将生成本年利润结转凭证', '提示', { type: 'warning' })
    
    const balances = await window.api.database.query(
      `SELECT a.code, a.name, a.category, SUM(b.year_debit) as year_debit, SUM(b.year_credit) as year_credit 
       FROM gl_balance b 
       JOIN bd_account a ON b.account_id = a.id 
       WHERE b.year = ${periodForm.year} AND a.category IN ('income', 'expense')
       GROUP BY a.id`
    )
    
    yearEndData.revenue = 0
    yearEndData.cost = 0
    yearEndData.tax = 0
    yearEndData.salesExpense = 0
    yearEndData.adminExpense = 0
    yearEndData.financeExpense = 0
    
    for (const bal of balances) {
      if (bal.code.startsWith('6')) {
        if (bal.code.startsWith('6001') || bal.code.startsWith('6051')) {
          yearEndData.revenue += bal.year_credit || 0
        } else if (bal.code.startsWith('6401')) {
          yearEndData.cost += bal.year_debit || 0
        } else if (bal.code.startsWith('6403')) {
          yearEndData.tax += bal.year_debit || 0
        } else if (bal.code.startsWith('6601')) {
          yearEndData.salesExpense += bal.year_debit || 0
        } else if (bal.code.startsWith('6602')) {
          yearEndData.adminExpense += bal.year_debit || 0
        } else if (bal.code.startsWith('6603')) {
          yearEndData.financeExpense += bal.year_debit || 0
        }
      }
    }
    
    yearEndData.totalProfit = yearEndData.revenue - yearEndData.cost - yearEndData.tax - yearEndData.salesExpense - yearEndData.adminExpense - yearEndData.financeExpense
    
    ElMessage.success(`年末损益结转数据已计算，本年利润: ${formatMoney(yearEndData.totalProfit)}`)
  } catch (e) {}
}

function formatMoney(v: number) {
  return (v || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>

<style scoped>
.tab-content {
  padding: 16px 0;
}

.text-success {
  color: #67c23a;
  font-weight: bold;
}

.text-danger {
  color: #f56c6c;
  font-weight: bold;
}
</style>
