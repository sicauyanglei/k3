<template>
  <div class="page-container">
    <div class="search-form">
      <el-form :inline="true" :model="searchForm">
        <el-form-item label="凭证字号">
          <el-select v-model="searchForm.voucherWord" placeholder="字" style="width: 80px">
            <el-option label="记" value="记" />
            <el-option label="收" value="收" />
            <el-option label="付" value="付" />
            <el-option label="转" value="转" />
          </el-select>
          <el-input v-model="searchForm.voucherNo" placeholder="号" style="width: 100px; margin-left: 5px" />
        </el-form-item>
        <el-form-item label="日期">
          <el-date-picker v-model="searchForm.dateRange" type="daterange" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" style="width: 240px" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable style="width: 120px">
            <el-option label="草稿" value="draft" />
            <el-option label="已审核" value="audited" />
            <el-option label="已过账" value="posted" />
          </el-select>
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
        新增凭证
      </el-button>
      <el-button @click="handleAudit" :disabled="!selectedRows.length">
        <el-icon><Check /></el-icon>
        审核
      </el-button>
      <el-button @click="handlePost" :disabled="!selectedRows.length">
        <el-icon><Position /></el-icon>
        过账
      </el-button>
    </div>

    <el-table :data="tableData" border stripe v-loading="loading" @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="50" />
      <el-table-column prop="voucher_word" label="字" width="60" />
      <el-table-column prop="voucher_no" label="号" width="80" />
      <el-table-column prop="voucher_date" label="日期" width="110" />
      <el-table-column prop="description" label="摘要" min-width="200" show-overflow-tooltip />
      <el-table-column label="借方金额" width="120" align="right">
        <template #default="{ row }">{{ formatMoney(row.debit_total) }}</template>
      </el-table-column>
      <el-table-column label="贷方金额" width="120" align="right">
        <template #default="{ row }">{{ formatMoney(row.credit_total) }}</template>
      </el-table-column>
      <el-table-column prop="attachment_count" label="附单" width="60" align="center" />
      <el-table-column prop="status" label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
          <el-button type="primary" link @click="handleView(row)">查看</el-button>
          <el-button type="danger" link @click="handleDelete(row)" v-if="row.status === 'draft'">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-container">
      <el-pagination v-model:current-page="pagination.page" v-model:page-size="pagination.pageSize" :total="pagination.total" :page-sizes="[20, 50, 100]" layout="total, sizes, prev, pager, next" @size-change="loadData" @current-change="loadData" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const loading = ref(false)
const tableData = ref<any[]>([])
const selectedRows = ref<any[]>([])
const pagination = reactive({ page: 1, pageSize: 20, total: 0 })

const searchForm = reactive({
  voucherWord: '',
  voucherNo: '',
  dateRange: [] as string[],
  status: ''
})

onMounted(() => {
  loadData()
})

async function loadData() {
  loading.value = true
  try {
    let sql = `SELECT v.*, 
      (SELECT SUM(debit) FROM gl_voucher_entry WHERE voucher_id = v.id) as debit_total,
      (SELECT SUM(credit) FROM gl_voucher_entry WHERE voucher_id = v.id) as credit_total
      FROM gl_voucher v WHERE 1=1`
    
    if (searchForm.voucherWord) {
      sql += ` AND v.voucher_word = '${searchForm.voucherWord}'`
    }
    if (searchForm.voucherNo) {
      sql += ` AND v.voucher_no = ${searchForm.voucherNo}`
    }
    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
      sql += ` AND v.voucher_date BETWEEN '${searchForm.dateRange[0]}' AND '${searchForm.dateRange[1]}'`
    }
    if (searchForm.status) {
      sql += ` AND v.status = '${searchForm.status}'`
    }
    
    const countSql = sql.replace('SELECT v.*,', 'SELECT COUNT(*) as total FROM (SELECT 1')
    const countResult = await window.api.database.query(countSql + ') as t')
    pagination.total = countResult[0]?.total || 0
    
    sql += ` ORDER BY v.voucher_date DESC, v.voucher_no DESC`
    sql += ` LIMIT ${pagination.pageSize} OFFSET ${(pagination.page - 1) * pagination.pageSize}`
    
    const data = await window.api.database.query(sql)
    tableData.value = data
  } catch (error: any) {
    ElMessage.error(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.page = 1
  loadData()
}

function handleReset() {
  Object.assign(searchForm, { voucherWord: '', voucherNo: '', dateRange: [], status: '' })
  handleSearch()
}

function handleSelectionChange(rows: any[]) {
  selectedRows.value = rows
}

function handleAdd() {
  router.push('/gl/voucher/edit')
}

function handleEdit(row: any) {
  if (row.status !== 'draft') {
    ElMessage.warning('只有草稿状态的凭证才能编辑')
    return
  }
  router.push(`/gl/voucher/edit/${row.id}`)
}

function handleView(row: any) {
  router.push(`/gl/voucher/edit/${row.id}?mode=view`)
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm('确定要删除该凭证吗？', '提示', { type: 'warning' })
    await window.api.database.execute(`DELETE FROM gl_voucher_entry WHERE voucher_id = ${row.id}`)
    await window.api.database.execute(`DELETE FROM gl_voucher WHERE id = ${row.id}`)
    ElMessage.success('删除成功')
    loadData()
  } catch (e) {}
}

async function handleAudit() {
  const draftRows = selectedRows.value.filter(r => r.status === 'draft')
  if (!draftRows.length) {
    ElMessage.warning('请选择草稿状态的凭证')
    return
  }
  try {
    await ElMessageBox.confirm(`确定要审核选中的 ${draftRows.length} 张凭证吗？`, '提示', { type: 'warning' })
    for (const row of draftRows) {
      await window.api.database.execute(
        `UPDATE gl_voucher SET status = 'audited', audited_at = datetime('now') WHERE id = ${row.id}`
      )
    }
    ElMessage.success('审核成功')
    loadData()
  } catch (e) {}
}

async function handlePost() {
  const auditedRows = selectedRows.value.filter(r => r.status === 'audited')
  if (!auditedRows.length) {
    ElMessage.warning('请选择已审核状态的凭证')
    return
  }
  try {
    await ElMessageBox.confirm(`确定要过账选中的 ${auditedRows.length} 张凭证吗？`, '提示', { type: 'warning' })
    for (const row of auditedRows) {
      await postVoucher(row)
    }
    ElMessage.success('过账成功')
    loadData()
  } catch (e: any) {
    ElMessage.error(e.message || '过账失败')
  }
}

async function postVoucher(voucher: any) {
  const entries = await window.api.database.query(
    `SELECT * FROM gl_voucher_entry WHERE voucher_id = ${voucher.id}`
  )
  
  for (const entry of entries) {
    let balanceSql = `SELECT * FROM gl_balance WHERE year = ${voucher.year} AND period = ${voucher.period} AND account_id = ${entry.account_id}`
    const existing = await window.api.database.query(balanceSql)
    
    if (existing.length > 0) {
      const bal = existing[0]
      const newPeriodDebit = (bal.period_debit || 0) + (entry.debit || 0)
      const newPeriodCredit = (bal.period_credit || 0) + (entry.credit || 0)
      const newEndDebit = (bal.begin_debit || 0) + newPeriodDebit
      const newEndCredit = (bal.begin_credit || 0) + newPeriodCredit
      
      await window.api.database.execute(
        `UPDATE gl_balance SET period_debit = ${newPeriodDebit}, period_credit = ${newPeriodCredit}, end_debit = ${newEndDebit}, end_credit = ${newEndCredit} WHERE id = ${bal.id}`
      )
    } else {
      await window.api.database.execute(
        `INSERT INTO gl_balance (year, period, account_id, period_debit, period_credit, end_debit, end_credit) VALUES (${voucher.year}, ${voucher.period}, ${entry.account_id}, ${entry.debit || 0}, ${entry.credit || 0}, ${entry.debit || 0}, ${entry.credit || 0})`
      )
    }
  }
  
  await window.api.database.execute(
    `UPDATE gl_voucher SET status = 'posted', posted_at = datetime('now') WHERE id = ${voucher.id}`
  )
}

function getStatusType(status: string) {
  const map: Record<string, string> = { draft: 'info', audited: 'warning', posted: 'success' }
  return map[status] || 'info'
}

function getStatusText(status: string) {
  const map: Record<string, string> = { draft: '草稿', audited: '已审核', posted: '已过账' }
  return map[status] || status
}

function formatMoney(v: number) {
  return (v || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>

<style scoped>
.pagination-container {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
