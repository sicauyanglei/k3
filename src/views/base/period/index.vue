<template>
  <div class="page-container">
    <div class="table-toolbar">
      <el-button type="primary" @click="handleInitPeriods" :loading="initLoading">
        <el-icon><Calendar /></el-icon>
        初始化会计年度
      </el-button>
    </div>
    
    <el-table :data="tableData" border stripe v-loading="loading">
      <el-table-column prop="year" label="会计年度" width="120" />
      <el-table-column prop="period" label="会计期间" width="120">
        <template #default="{ row }">第{{ row.period }}期</template>
      </el-table-column>
      <el-table-column prop="start_date" label="开始日期" width="150" />
      <el-table-column prop="end_date" label="结束日期" width="150" />
      <el-table-column prop="is_closed" label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="row.is_closed ? 'danger' : 'success'">
            {{ row.is_closed ? '已结账' : '未结账' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150">
        <template #default="{ row }">
          <el-button 
            type="primary" 
            link 
            @click="handleClosePeriod(row)" 
            v-if="!row.is_closed"
          >
            结账
          </el-button>
          <el-button 
            type="warning" 
            link 
            @click="handleReopenPeriod(row)" 
            v-if="row.is_closed"
          >
            反结账
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" title="初始化会计年度" width="400px">
      <el-form :model="initForm" label-width="100px">
        <el-form-item label="会计年度">
          <el-date-picker
            v-model="initForm.year"
            type="year"
            placeholder="选择年度"
            value-format="YYYY"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="doInitPeriods">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const initLoading = ref(false)
const dialogVisible = ref(false)
const tableData = ref<any[]>([])

const initForm = reactive({
  year: String(new Date().getFullYear())
})

onMounted(() => {
  loadData()
})

async function loadData() {
  loading.value = true
  try {
    const data = await window.api.database.query('SELECT * FROM bd_account_period ORDER BY year DESC, period')
    tableData.value = data
  } catch (error: any) {
    ElMessage.error(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function handleInitPeriods() {
  dialogVisible.value = true
}

async function doInitPeriods() {
  initLoading.value = true
  try {
    const year = parseInt(initForm.year)
    const sqls: string[] = []
    
    for (let period = 1; period <= 12; period++) {
      const startDate = `${year}-${String(period).padStart(2, '0')}-01`
      const endDate = new Date(year, period, 0).toISOString().split('T')[0]
      sqls.push(
        `INSERT OR IGNORE INTO bd_account_period (year, period, start_date, end_date) VALUES (${year}, ${period}, '${startDate}', '${endDate}')`
      )
    }
    
    for (const sql of sqls) {
      await window.api.database.execute(sql)
    }
    
    ElMessage.success('初始化成功')
    dialogVisible.value = false
    loadData()
  } catch (error: any) {
    ElMessage.error(error.message || '初始化失败')
  } finally {
    initLoading.value = false
  }
}

async function handleClosePeriod(row: any) {
  try {
    await ElMessageBox.confirm(`确定要结账第${row.period}期吗？`, '提示', { type: 'warning' })
    await window.api.database.execute(
      `UPDATE bd_account_period SET is_closed = 1, closed_at = datetime('now') WHERE id = ${row.id}`
    )
    ElMessage.success('结账成功')
    loadData()
  } catch (e) {}
}

async function handleReopenPeriod(row: any) {
  try {
    await ElMessageBox.confirm(`确定要反结账第${row.period}期吗？`, '提示', { type: 'warning' })
    await window.api.database.execute(
      `UPDATE bd_account_period SET is_closed = 0, closed_at = NULL WHERE id = ${row.id}`
    )
    ElMessage.success('反结账成功')
    loadData()
  } catch (e) {}
}
</script>
