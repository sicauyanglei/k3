<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <span>资产报表</span>
      </template>

      <el-form :inline="true" style="margin-bottom: 16px">
        <el-form-item label="报表类型">
          <el-select v-model="reportType" style="width: 200px">
            <el-option label="固定资产明细表" value="detail" />
            <el-option label="固定资产汇总表" value="summary" />
            <el-option label="折旧明细表" value="depreciation" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleGenerate">生成报表</el-button>
          <el-button @click="handleExport">导出</el-button>
          <el-button @click="handlePrint">打印</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="tableData" border stripe v-loading="loading" show-summary :summary-method="getSummary">
        <el-table-column prop="asset_no" label="资产编号" width="120" />
        <el-table-column prop="name" label="资产名称" width="180" />
        <el-table-column prop="category_name" label="类别" width="100" />
        <el-table-column prop="department_name" label="部门" width="100" />
        <el-table-column prop="acquisition_date" label="取得日期" width="100" />
        <el-table-column label="原值" width="120" align="right">
          <template #default="{ row }">{{ formatMoney(row.original_value) }}</template>
        </el-table-column>
        <el-table-column label="累计折旧" width="120" align="right">
          <template #default="{ row }">{{ formatMoney(row.accumulated_depreciation) }}</template>
        </el-table-column>
        <el-table-column label="净值" width="120" align="right">
          <template #default="{ row }">{{ formatMoney(row.net_value) }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { exportToExcel, printTable } from '@/utils/export'

const loading = ref(false)
const tableData = ref<any[]>([])
const reportType = ref('detail')

onMounted(() => {
  handleGenerate()
})

async function handleGenerate() {
  loading.value = true
  try {
    let sql = `SELECT a.*, c.name as category_name, d.name as department_name 
               FROM fa_asset a 
               LEFT JOIN fa_category c ON a.category_id = c.id 
               LEFT JOIN bd_department d ON a.department_id = d.id 
               ORDER BY a.asset_no`
    const data = await window.api.database.query(sql)
    tableData.value = data
  } catch (error: any) {
    ElMessage.error(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function handleExport() {
  if (tableData.value.length === 0) {
    ElMessage.warning('没有数据可导出')
    return
  }
  
  const exportData = tableData.value.map(row => ({
    资产编号: row.asset_no,
    资产名称: row.name,
    类别: row.category_name || '',
    部门: row.department_name || '',
    取得日期: row.acquisition_date,
    原值: row.original_value || '',
    累计折旧: row.accumulated_depreciation || '',
    净值: row.net_value || '',
    状态: getStatusText(row.status)
  }))
  
  if (exportToExcel(exportData, '固定资产明细表')) {
    ElMessage.success('导出成功')
  }
}

function handlePrint() {
  if (tableData.value.length === 0) {
    ElMessage.warning('没有数据可打印')
    return
  }
  
  const columns = [
    { field: 'asset_no', title: '资产编号', width: '12%' },
    { field: 'name', title: '资产名称', width: '18%' },
    { field: 'category_name', title: '类别', width: '10%' },
    { field: 'department_name', title: '部门', width: '10%' },
    { field: 'acquisition_date', title: '取得日期', width: '10%' },
    { field: 'original_value', title: '原值', width: '12%' },
    { field: 'accumulated_depreciation', title: '累计折旧', width: '12%' },
    { field: 'net_value', title: '净值', width: '12%' }
  ]
  
  if (printTable('固定资产明细表', tableData.value, columns)) {
    ElMessage.success('打印预览已打开')
  }
}

function getSummary({ columns, data }: any) {
  const sums: string[] = []
  columns.forEach((column: any, index: number) => {
    if (index === 0) {
      sums[index] = '合计'
    } else if (['original_value', 'accumulated_depreciation', 'net_value'].includes(column.property)) {
      const total = data.reduce((sum: number, row: any) => sum + (row[column.property] || 0), 0)
      sums[index] = formatMoney(total)
    } else {
      sums[index] = ''
    }
  })
  return sums
}

function getStatusType(status: string) {
  const map: Record<string, string> = { normal: 'success', stopped: 'warning', scrapped: 'info' }
  return map[status] || 'info'
}

function getStatusText(status: string) {
  const map: Record<string, string> = { normal: '正常', stopped: '停用', scrapped: '报废' }
  return map[status] || status
}

function formatMoney(v: number) {
  return '¥' + (v || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })
}
</script>
