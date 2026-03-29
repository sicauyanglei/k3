<template>
  <div class="voucher-edit-page">
    <div class="page-header">
      <el-button @click="handleBack">
        <el-icon><ArrowLeft /></el-icon>
        返回
      </el-button>
      <span class="title">{{ isView ? '查看凭证' : (voucherId ? '编辑凭证' : '新增凭证') }}</span>
      <div class="header-actions" v-if="!isView">
        <el-button type="primary" @click="handleSave">保存</el-button>
        <el-button @click="handleSaveAndNew">保存并新增</el-button>
      </div>
    </div>

    <el-card class="voucher-header">
      <el-form :model="voucher" label-width="80px" inline>
        <el-form-item label="凭证字">
          <el-select v-model="voucher.voucherWord" style="width: 80px">
            <el-option label="记" value="记" />
            <el-option label="收" value="收" />
            <el-option label="付" value="付" />
            <el-option label="转" value="转" />
          </el-select>
        </el-form-item>
        <el-form-item label="凭证号">
          <el-input v-model="voucher.voucherNo" style="width: 100px" disabled />
        </el-form-item>
        <el-form-item label="日期">
          <el-date-picker v-model="voucher.voucherDate" type="date" placeholder="选择日期" value-format="YYYY-MM-DD" style="width: 150px" />
        </el-form-item>
        <el-form-item label="附单据">
          <el-input-number v-model="voucher.attachmentCount" :min="0" style="width: 100px" />
        </el-form-item>
      </el-form>
    </el-card>

    <el-card class="voucher-entries">
      <el-table :data="entries" border stripe show-summary :summary-method="getSummary">
        <el-table-column type="index" label="序号" width="60" />
        <el-table-column label="摘要" min-width="200">
          <template #default="{ row, $index }">
            <el-input v-model="row.description" placeholder="请输入摘要" :disabled="isView" @change="copyDescription($index)" />
          </template>
        </el-table-column>
        <el-table-column label="科目" min-width="200">
          <template #default="{ row }">
            <el-select v-model="row.accountId" filterable placeholder="请选择科目" :disabled="isView" @change="onAccountChange(row)" style="width: 100%">
              <el-option v-for="acc in accountList" :key="acc.id" :label="`${acc.code} ${acc.name}`" :value="acc.id" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="借方金额" width="150">
          <template #default="{ row }">
            <el-input-number v-model="row.debit" :precision="2" :min="0" :controls="false" :disabled="isView" style="width: 100%" @change="onDebitChange(row)" />
          </template>
        </el-table-column>
        <el-table-column label="贷方金额" width="150">
          <template #default="{ row }">
            <el-input-number v-model="row.credit" :precision="2" :min="0" :controls="false" :disabled="isView" style="width: 100%" @change="onCreditChange(row)" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" v-if="!isView">
          <template #default="{ $index }">
            <el-button type="danger" link @click="removeEntry($index)" :disabled="entries.length <= 2">
              <el-icon><Delete /></el-icon>
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="entry-actions" v-if="!isView">
        <el-button @click="addEntry">新增分录</el-button>
        <el-button @click="autoBalance">自动平衡</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()

const voucherId = computed(() => route.params.id as string)
const isView = computed(() => route.query.mode === 'view')

const voucher = reactive({
  voucherWord: '记',
  voucherNo: '',
  voucherDate: new Date().toISOString().split('T')[0],
  attachmentCount: 0
})

const entries = ref<any[]>([
  { description: '', accountId: null, accountCode: '', accountName: '', debit: 0, credit: 0 },
  { description: '', accountId: null, accountCode: '', accountName: '', debit: 0, credit: 0 }
])

const accountList = ref<any[]>([])

onMounted(async () => {
  await loadAccounts()
  if (voucherId.value) {
    await loadVoucher()
  } else {
    await getNextVoucherNo()
  }
})

async function loadAccounts() {
  const data = await window.api.database.query(
    "SELECT id, code, name FROM bd_account WHERE is_enabled = 1 AND is_leaf = 1 ORDER BY code"
  )
  accountList.value = data
}

async function getNextVoucherNo() {
  const year = new Date(voucher.voucherDate).getFullYear()
  const data = await window.api.database.query(
    `SELECT MAX(voucher_no) as max_no FROM gl_voucher WHERE voucher_word = '${voucher.voucherWord}' AND year = ${year}`
  )
  const maxNo = data[0]?.max_no || 0
  voucher.voucherNo = String(maxNo + 1).padStart(4, '0')
}

async function loadVoucher() {
  const data = await window.api.database.query(
    `SELECT * FROM gl_voucher WHERE id = ${voucherId.value}`
  )
  if (data.length > 0) {
    const v = data[0]
    voucher.voucherWord = v.voucher_word
    voucher.voucherNo = String(v.voucher_no).padStart(4, '0')
    voucher.voucherDate = v.voucher_date
    voucher.attachmentCount = v.attachment_count || 0
    
    const entryData = await window.api.database.query(
      `SELECT * FROM gl_voucher_entry WHERE voucher_id = ${voucherId.value} ORDER BY entry_no`
    )
    if (entryData.length > 0) {
      entries.value = entryData.map(e => ({
        description: e.description || '',
        accountId: e.account_id,
        accountCode: e.account_code,
        accountName: e.account_name,
        debit: e.debit || 0,
        credit: e.credit || 0
      }))
    }
  }
}

function onAccountChange(row: any) {
  const acc = accountList.value.find(a => a.id === row.accountId)
  if (acc) {
    row.accountCode = acc.code
    row.accountName = acc.name
  }
}

function copyDescription(index: number) {
  if (index === 0 && entries.value[0].description) {
    for (let i = 1; i < entries.value.length; i++) {
      if (!entries.value[i].description) {
        entries.value[i].description = entries.value[0].description
      }
    }
  }
}

function onDebitChange(row: any) {
  if (row.debit > 0) {
    row.credit = 0
  }
}

function onCreditChange(row: any) {
  if (row.credit > 0) {
    row.debit = 0
  }
}

function addEntry() {
  const lastEntry = entries.value[entries.value.length - 1]
  entries.value.push({
    description: lastEntry?.description || '',
    accountId: null,
    accountCode: '',
    accountName: '',
    debit: 0,
    credit: 0
  })
}

function removeEntry(index: number) {
  entries.value.splice(index, 1)
}

function autoBalance() {
  const totalDebit = entries.value.reduce((sum, e) => sum + (e.debit || 0), 0)
  const totalCredit = entries.value.reduce((sum, e) => sum + (e.credit || 0), 0)
  const diff = totalDebit - totalCredit
  
  if (Math.abs(diff) < 0.01) {
    ElMessage.success('凭证已平衡')
    return
  }
  
  const lastEntry = entries.value[entries.value.length - 1]
  if (diff > 0) {
    lastEntry.credit = diff
    lastEntry.debit = 0
  } else {
    lastEntry.debit = -diff
    lastEntry.credit = 0
  }
  ElMessage.success('已自动平衡')
}

function getSummary({ columns, data }: any) {
  const sums: string[] = []
  columns.forEach((column: any, index: number) => {
    if (index === 0) {
      sums[index] = '合计'
      return
    }
    if (column.property === 'debit') {
      const total = data.reduce((sum: number, row: any) => sum + (row.debit || 0), 0)
      sums[index] = total.toLocaleString('zh-CN', { minimumFractionDigits: 2 })
    } else if (column.property === 'credit') {
      const total = data.reduce((sum: number, row: any) => sum + (row.credit || 0), 0)
      sums[index] = total.toLocaleString('zh-CN', { minimumFractionDigits: 2 })
    } else {
      sums[index] = ''
    }
  })
  return sums
}

async function handleSave() {
  const valid = validateVoucher()
  if (!valid) return
  
  try {
    const escapeSql = (v: string) => (v || '').replace(/'/g, "''")
    const date = new Date(voucher.voucherDate)
    const year = date.getFullYear()
    const period = date.getMonth() + 1
    const voucherNo = parseInt(voucher.voucherNo)
    
    if (voucherId.value) {
      await window.api.database.execute(
        `UPDATE gl_voucher SET voucher_word='${voucher.voucherWord}', voucher_no=${voucherNo}, voucher_date='${voucher.voucherDate}', year=${year}, period=${period}, attachment_count=${voucher.attachmentCount} WHERE id=${voucherId.value}`
      )
      await window.api.database.execute(`DELETE FROM gl_voucher_entry WHERE voucher_id=${voucherId.value}`)
      
      for (let i = 0; i < entries.value.length; i++) {
        const e = entries.value[i]
        await window.api.database.execute(
          `INSERT INTO gl_voucher_entry (voucher_id, entry_no, account_id, account_code, account_name, description, debit, credit) VALUES (${voucherId.value}, ${i + 1}, ${e.accountId}, '${e.accountCode}', '${escapeSql(e.accountName)}', '${escapeSql(e.description)}', ${e.debit || 0}, ${e.credit || 0})`
        )
      }
    } else {
      await window.api.database.execute(
        `INSERT INTO gl_voucher (voucher_word, voucher_no, year, period, voucher_date, attachment_count, status) VALUES ('${voucher.voucherWord}', ${voucherNo}, ${year}, ${period}, '${voucher.voucherDate}', ${voucher.attachmentCount}, 'draft')`
      )
      
      const result = await window.api.database.query('SELECT last_insert_rowid() as id')
      const newId = result[0].id
      
      for (let i = 0; i < entries.value.length; i++) {
        const e = entries.value[i]
        await window.api.database.execute(
          `INSERT INTO gl_voucher_entry (voucher_id, entry_no, account_id, account_code, account_name, description, debit, credit) VALUES (${newId}, ${i + 1}, ${e.accountId}, '${e.accountCode}', '${escapeSql(e.accountName)}', '${escapeSql(e.description)}', ${e.debit || 0}, ${e.credit || 0})`
        )
      }
    }
    
    ElMessage.success('保存成功')
    handleBack()
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败')
  }
}

async function handleSaveAndNew() {
  const valid = validateVoucher()
  if (!valid) return
  
  try {
    const escapeSql = (v: string) => (v || '').replace(/'/g, "''")
    const date = new Date(voucher.voucherDate)
    const year = date.getFullYear()
    const period = date.getMonth() + 1
    const voucherNo = parseInt(voucher.voucherNo)
    
    await window.api.database.execute(
      `INSERT INTO gl_voucher (voucher_word, voucher_no, year, period, voucher_date, attachment_count, status) VALUES ('${voucher.voucherWord}', ${voucherNo}, ${year}, ${period}, '${voucher.voucherDate}', ${voucher.attachmentCount}, 'draft')`
    )
    
    const result = await window.api.database.query('SELECT last_insert_rowid() as id')
    const newId = result[0].id
    
    for (let i = 0; i < entries.value.length; i++) {
      const e = entries.value[i]
      await window.api.database.execute(
        `INSERT INTO gl_voucher_entry (voucher_id, entry_no, account_id, account_code, account_name, description, debit, credit) VALUES (${newId}, ${i + 1}, ${e.accountId}, '${e.accountCode}', '${escapeSql(e.accountName)}', '${escapeSql(e.description)}', ${e.debit || 0}, ${e.credit || 0})`
      )
    }
    
    ElMessage.success('保存成功')
    
    await getNextVoucherNo()
    entries.value = [
      { description: '', accountId: null, accountCode: '', accountName: '', debit: 0, credit: 0 },
      { description: '', accountId: null, accountCode: '', accountName: '', debit: 0, credit: 0 }
    ]
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败')
  }
}

function validateVoucher() {
  if (!voucher.voucherDate) {
    ElMessage.warning('请选择凭证日期')
    return false
  }
  
  const totalDebit = entries.value.reduce((sum, e) => sum + (e.debit || 0), 0)
  const totalCredit = entries.value.reduce((sum, e) => sum + (e.credit || 0), 0)
  
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    ElMessage.warning('借贷不平衡，请检查金额')
    return false
  }
  
  if (totalDebit === 0 && totalCredit === 0) {
    ElMessage.warning('凭证金额不能为零')
    return false
  }
  
  for (const e of entries.value) {
    if (!e.accountId) {
      ElMessage.warning('请选择科目')
      return false
    }
    if ((e.debit || 0) === 0 && (e.credit || 0) === 0) {
      ElMessage.warning('分录金额不能为零')
      return false
    }
  }
  
  return true
}

function handleBack() {
  router.push('/gl/voucher')
}
</script>

<style scoped>
.voucher-edit-page {
  padding: 16px;
}

.page-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  gap: 16px;
}

.title {
  font-size: 18px;
  font-weight: bold;
}

.header-actions {
  margin-left: auto;
}

.voucher-header {
  margin-bottom: 16px;
}

.entry-actions {
  margin-top: 16px;
  display: flex;
  gap: 8px;
}
</style>
