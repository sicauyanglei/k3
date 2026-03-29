<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>现金流量表</span>
          <div>
            <el-date-picker v-model="reportDate" type="year" placeholder="选择年度" value-format="YYYY" style="width: 120px; margin-right: 10px" />
            <el-button type="primary" @click="handleGenerate">生成报表</el-button>
            <el-button @click="handleExport">导出</el-button>
            <el-button @click="handlePrint">打印</el-button>
          </div>
        </div>
      </template>

      <el-table :data="tableData" border stripe v-loading="loading" size="small">
        <el-table-column prop="item" label="项目" min-width="250" />
        <el-table-column prop="line" label="行次" width="80" align="center" />
        <el-table-column label="金额" width="150" align="right">
          <template #default="{ row }">{{ formatMoney(row.amount) }}</template>
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
const reportDate = ref(new Date().getFullYear().toString())

onMounted(() => {
  handleGenerate()
})

async function handleGenerate() {
  loading.value = true
  try {
    tableData.value = [
      { item: '一、经营活动产生的现金流量：', line: '', amount: '' },
      { item: '  销售商品、提供劳务收到的现金', line: '1', amount: 0 },
      { item: '  收到的税费返还', line: '2', amount: 0 },
      { item: '  收到其他与经营活动有关的现金', line: '3', amount: 0 },
      { item: '  经营活动现金流入小计', line: '4', amount: 0 },
      { item: '  购买商品、接受劳务支付的现金', line: '5', amount: 0 },
      { item: '  支付给职工以及为职工支付的现金', line: '6', amount: 0 },
      { item: '  支付的各项税费', line: '7', amount: 0 },
      { item: '  支付其他与经营活动有关的现金', line: '8', amount: 0 },
      { item: '  经营活动现金流出小计', line: '9', amount: 0 },
      { item: '  经营活动产生的现金流量净额', line: '10', amount: 0 },
      { item: '', line: '', amount: '' },
      { item: '二、投资活动产生的现金流量：', line: '', amount: '' },
      { item: '  收回投资收到的现金', line: '11', amount: 0 },
      { item: '  取得投资收益收到的现金', line: '12', amount: 0 },
      { item: '  处置固定资产、无形资产和其他长期资产收回的现金净额', line: '13', amount: 0 },
      { item: '  投资活动现金流入小计', line: '14', amount: 0 },
      { item: '  购建固定资产、无形资产和其他长期资产支付的现金', line: '15', amount: 0 },
      { item: '  投资支付的现金', line: '16', amount: 0 },
      { item: '  投资活动现金流出小计', line: '17', amount: 0 },
      { item: '  投资活动产生的现金流量净额', line: '18', amount: 0 },
      { item: '', line: '', amount: '' },
      { item: '三、筹资活动产生的现金流量：', line: '', amount: '' },
      { item: '  吸收投资收到的现金', line: '19', amount: 0 },
      { item: '  取得借款收到的现金', line: '20', amount: 0 },
      { item: '  筹资活动现金流入小计', line: '21', amount: 0 },
      { item: '  偿还债务支付的现金', line: '22', amount: 0 },
      { item: '  分配股利、利润或偿付利息支付的现金', line: '23', amount: 0 },
      { item: '  筹资活动现金流出小计', line: '24', amount: 0 },
      { item: '  筹资活动产生的现金流量净额', line: '25', amount: 0 },
      { item: '', line: '', amount: '' },
      { item: '四、汇率变动对现金的影响', line: '26', amount: 0 },
      { item: '五、现金及现金等价物净增加额', line: '27', amount: 0 },
      { item: '  加：期初现金及现金等价物余额', line: '28', amount: 0 },
      { item: '六、期末现金及现金等价物余额', line: '29', amount: 0 }
    ]
  } catch (error: any) {
    ElMessage.error(error.message || '生成失败')
  } finally {
    loading.value = false
  }
}

function handleExport() {
  const exportData = tableData.value.map(row => ({
    项目: row.item,
    行次: row.line,
    金额: row.amount || ''
  }))
  
  if (exportToExcel(exportData, '现金流量表')) {
    ElMessage.success('导出成功')
  }
}

function handlePrint() {
  const columns = [
    { field: 'item', title: '项目', width: '70%' },
    { field: 'line', title: '行次', width: '10%' },
    { field: 'amount', title: '金额', width: '20%' }
  ]
  
  if (printTable('现金流量表', tableData.value, columns)) {
    ElMessage.success('打印预览已打开')
  }
}

function formatMoney(v: number) {
  if (!v) return ''
  return v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
