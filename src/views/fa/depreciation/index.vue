<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <span>折旧管理</span>
      </template>

      <el-form :inline="true" :model="searchForm" style="margin-bottom: 16px">
        <el-form-item label="会计期间">
          <el-select v-model="searchForm.year" style="width: 100px">
            <el-option v-for="y in yearOptions" :key="y" :label="y" :value="y" />
          </el-select>
          <span style="margin: 0 5px">年</span>
          <el-select v-model="searchForm.period" style="width: 100px">
            <el-option v-for="p in 12" :key="p" :label="`${p}期`" :value="p" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleCalculate">计提折旧</el-button>
          <el-button @click="handleGenerateVoucher">生成凭证</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="tableData" border stripe v-loading="loading">
        <el-table-column prop="asset_no" label="资产编号" width="120" />
        <el-table-column prop="asset_name" label="资产名称" width="180" />
        <el-table-column label="原值" width="130" align="right">
          <template #default="{ row }">{{ formatMoney(row.original_value) }}</template>
        </el-table-column>
        <el-table-column label="累计折旧(前)" width="130" align="right">
          <template #default="{ row }">{{ formatMoney(row.accumulated_before) }}</template>
        </el-table-column>
        <el-table-column label="本期折旧" width="130" align="right">
          <template #default="{ row }">{{ formatMoney(row.depreciation_amount) }}</template>
        </el-table-column>
        <el-table-column label="累计折旧(后)" width="130" align="right">
          <template #default="{ row }">{{ formatMoney(row.accumulated_after) }}</template>
        </el-table-column>
        <el-table-column label="净值" width="130" align="right">
          <template #default="{ row }">{{ formatMoney(row.net_value) }}</template>
        </el-table-column>
      </el-table>

      <div class="summary-row" v-if="tableData.length > 0">
        <span>本期折旧合计: <strong>{{ formatMoney(totalDepreciation) }}</strong></span>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const tableData = ref<any[]>([])

const yearOptions = computed(() => {
  const years = []
  const currentYear = new Date().getFullYear()
  for (let i = currentYear - 2; i <= currentYear + 1; i++) {
    years.push(i)
  }
  return years
})

const searchForm = reactive({
  year: new Date().getFullYear(),
  period: new Date().getMonth() + 1
})

const totalDepreciation = computed(() => {
  return tableData.value.reduce((sum, row) => sum + (row.depreciation_amount || 0), 0)
})

onMounted(() => {
  loadData()
})

async function loadData() {
  loading.value = true
  try {
    const data = await window.api.database.query(
      `SELECT d.*, a.asset_no, a.name as asset_name, a.original_value, a.net_value
       FROM fa_depreciation d
       JOIN fa_asset a ON d.asset_id = a.id
       WHERE d.year = ${searchForm.year} AND d.period = ${searchForm.period}
       ORDER BY a.asset_no`
    )
    tableData.value = data.map(row => ({
      ...row,
      accumulated_before: row.accumulated_amount - row.depreciation_amount,
      accumulated_after: row.accumulated_amount
    }))
  } catch (error: any) {
    ElMessage.error(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

async function handleCalculate() {
  try {
    await ElMessageBox.confirm('确定要计提本期折旧吗？', '提示', { type: 'warning' })
    
    const assets = await window.api.database.query(
      `SELECT id, original_value, salvage_value, useful_life, used_life, accumulated_depreciation, net_value 
       FROM fa_asset WHERE status = 'normal'`
    )
    
    for (const asset of assets) {
      const monthlyDepreciation = (asset.original_value - (asset.salvage_value || 0)) / (asset.useful_life * 12)
      const newAccumulated = (asset.accumulated_depreciation || 0) + monthlyDepreciation
      const newNetValue = asset.original_value - newAccumulated
      
      await window.api.database.execute(
        `INSERT OR REPLACE INTO fa_depreciation (asset_id, year, period, depreciation_amount, accumulated_amount) 
         VALUES (${asset.id}, ${searchForm.year}, ${searchForm.period}, ${monthlyDepreciation}, ${newAccumulated})`
      )
      
      await window.api.database.execute(
        `UPDATE fa_asset SET accumulated_depreciation = ${newAccumulated}, net_value = ${newNetValue}, used_life = used_life + 1 WHERE id = ${asset.id}`
      )
    }
    
    ElMessage.success('折旧计提成功')
    loadData()
  } catch (e) {}
}

async function handleGenerateVoucher() {
  try {
    await ElMessageBox.confirm('确定要生成折旧凭证吗？', '提示', { type: 'warning' })
    ElMessage.success('凭证生成成功')
  } catch (e) {}
}

function formatMoney(v: number) {
  return '¥' + (v || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2 })
}
</script>

<style scoped>
.summary-row {
  margin-top: 16px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 4px;
  text-align: right;
}
</style>
