<template>
  <div class="page-container">
    <el-card>
      <template #header>
        <span>自定义报表</span>
      </template>

      <el-form :inline="true" style="margin-bottom: 16px">
        <el-form-item label="报表名称">
          <el-input v-model="reportName" placeholder="请输入报表名称" style="width: 200px" clearable />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleCreate">新建报表</el-button>
          <el-button @click="handleLoad">刷新</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="tableData" border stripe v-loading="loading">
        <el-table-column prop="name" label="报表名称" width="200" />
        <el-table-column prop="report_type" label="报表类型" width="120">
          <template #default="{ row }">
            <el-tag>{{ getReportType(row.report_type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180" />
        <el-table-column label="操作" width="250" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="success" link @click="handleView(row)">查看</el-button>
            <el-button type="info" link @click="handleCopy(row)">复制</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="editingItem ? '编辑自定义报表' : '新建自定义报表'" width="800px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="报表编码" prop="code">
              <el-input v-model="form.code" placeholder="请输入报表编码" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="报表名称" prop="name">
              <el-input v-model="form.name" placeholder="请输入报表名称" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="报表类型" prop="reportType">
          <el-select v-model="form.reportType" style="width: 200px">
            <el-option label="资产负债类" value="balance" />
            <el-option label="损益类" value="income" />
            <el-option label="成本类" value="cost" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-divider content-position="left">报表项目设置</el-divider>
        <div class="report-items">
          <el-table :data="form.items" border stripe size="small">
            <el-table-column prop="row_name" label="项目名称" width="200">
              <template #default="{ row }">
                <el-input v-model="row.row_name" placeholder="项目名称" />
              </template>
            </el-table-column>
            <el-table-column prop="formula" label="取数公式" width="250">
              <template #default="{ row }">
                <el-input v-model="row.formula" placeholder="如: K1001+K1002" />
              </template>
            </el-table-column>
            <el-table-column prop="row_type" label="类型" width="100">
              <template #default="{ row }">
                <el-select v-model="row.row_type" size="small">
                  <el-option label="数据行" value="data" />
                  <el-option label="标题行" value="title" />
                  <el-option label="合计行" value="total" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100">
              <template #default="{ $index }">
                <el-button type="danger" link @click="removeItem($index)">
                  <el-icon><Delete /></el-icon>
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-button type="primary" link @click="addItem" style="margin-top: 8px">
            <el-icon><Plus /></el-icon>
            添加项目
          </el-button>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="viewDialogVisible" :title="`查看报表 - ${viewReportName}`" width="900px">
      <el-table :data="viewData" border stripe size="small" v-loading="viewLoading">
        <el-table-column prop="row_name" label="项目" width="250" />
        <el-table-column prop="value" label="金额" width="150" align="right">
          <template #default="{ row }">{{ formatMoney(row.value) }}</template>
        </el-table-column>
      </el-table>
      <template #footer>
        <el-button @click="handleExportView">导出</el-button>
        <el-button @click="handlePrintView">打印</el-button>
        <el-button @click="viewDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { exportToExcel, printTable } from '@/utils/export'

const loading = ref(false)
const dialogVisible = ref(false)
const viewDialogVisible = ref(false)
const viewLoading = ref(false)
const tableData = ref<any[]>([])
const viewData = ref<any[]>([])
const viewReportName = ref('')
const reportName = ref('')
const editingItem = ref<any>(null)
const formRef = ref<FormInstance>()

const form = reactive({
  code: '',
  name: '',
  reportType: 'other',
  items: [] as { row_name: string; formula: string; row_type: string }[]
})

const rules: FormRules = {
  code: [{ required: true, message: '请输入报表编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入报表名称', trigger: 'blur' }],
  reportType: [{ required: true, message: '请选择报表类型', trigger: 'change' }]
}

onMounted(() => {
  loadData()
})

async function loadData() {
  loading.value = true
  try {
    let sql = 'SELECT * FROM rpt_template WHERE 1=1'
    if (reportName.value) {
      sql += ` AND name LIKE '%${reportName.value}%'`
    }
    sql += ' ORDER BY created_at DESC'
    const data = await window.api.database.query(sql)
    tableData.value = data
  } catch (error: any) {
    ElMessage.error(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function handleLoad() {
  loadData()
}

function handleCreate() {
  editingItem.value = null
  Object.assign(form, { code: '', name: '', reportType: 'other', items: [] })
  dialogVisible.value = true
}

function handleEdit(row: any) {
  editingItem.value = row
  Object.assign(form, {
    code: row.code,
    name: row.name,
    reportType: row.report_type || 'other',
    items: row.items ? JSON.parse(row.items) : []
  })
  if (form.items.length === 0) {
    addItem()
  }
  dialogVisible.value = true
}

async function handleView(row: any) {
  viewDialogVisible.value = true
  viewReportName.value = row.name
  viewLoading.value = true
  
  try {
    const items = row.items ? JSON.parse(row.items) : []
    viewData.value = []
    
    for (const item of items) {
      let value = 0
      if (item.formula && item.row_type === 'data') {
        value = await calculateFormula(item.formula)
      }
      viewData.value.push({
        row_name: item.row_name,
        value: value
      })
    }
  } catch (error: any) {
    ElMessage.error(error.message || '计算失败')
  } finally {
    viewLoading.value = false
  }
}

async function calculateFormula(formula: string): Promise<number> {
  let result = 0
  const accountCodes = formula.match(/K\d+/g) || []
  
  for (const code of accountCodes) {
    const accountCode = code.substring(1)
    const data = await window.api.database.query(
      `SELECT SUM(b.end_debit) - SUM(b.end_credit) as balance 
       FROM gl_balance b 
       JOIN bd_account a ON b.account_id = a.id 
       WHERE a.code LIKE '${accountCode}%'`
    )
    const balance = data[0]?.balance || 0
    result += balance
  }
  
  return result
}

async function handleCopy(row: any) {
  try {
    await window.api.database.execute(
      `INSERT INTO rpt_template (code, name, report_type, items, is_system) VALUES ('${row.code}_copy', '${row.name}(副本)', '${row.report_type}', '${row.items || '[]'}', 0)`
    )
    ElMessage.success('复制成功')
    loadData()
  } catch (error: any) {
    ElMessage.error(error.message || '复制失败')
  }
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm('确定要删除该报表吗？', '提示', { type: 'warning' })
    await window.api.database.execute(`DELETE FROM rpt_template WHERE id = ${row.id}`)
    ElMessage.success('删除成功')
    loadData()
  } catch (e) {}
}

function addItem() {
  form.items.push({ row_name: '', formula: '', row_type: 'data' })
}

function removeItem(index: number) {
  form.items.splice(index, 1)
}

async function handleSubmit() {
  const valid = await formRef.value?.validate()
  if (!valid) return

  try {
    const escapeSql = (v: string) => v.replace(/'/g, "''")
    const itemsJson = JSON.stringify(form.items)
    
    if (editingItem.value) {
      await window.api.database.execute(
        `UPDATE rpt_template SET code='${escapeSql(form.code)}', name='${escapeSql(form.name)}', report_type='${form.reportType}', items='${escapeSql(itemsJson)}' WHERE id=${editingItem.value.id}`
      )
    } else {
      await window.api.database.execute(
        `INSERT INTO rpt_template (code, name, report_type, items, is_system) VALUES ('${escapeSql(form.code)}', '${escapeSql(form.name)}', '${form.reportType}', '${escapeSql(itemsJson)}', 0)`
      )
    }
    ElMessage.success('保存成功')
    dialogVisible.value = false
    loadData()
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败')
  }
}

function handleExportView() {
  if (viewData.value.length === 0) {
    ElMessage.warning('没有数据可导出')
    return
  }
  
  const exportData = viewData.value.map(row => ({
    项目: row.row_name,
    金额: row.value || ''
  }))
  
  if (exportToExcel(exportData, viewReportName.value)) {
    ElMessage.success('导出成功')
  }
}

function handlePrintView() {
  if (viewData.value.length === 0) {
    ElMessage.warning('没有数据可打印')
    return
  }
  
  const columns = [
    { field: 'row_name', title: '项目', width: '60%' },
    { field: 'value', title: '金额', width: '40%' }
  ]
  
  if (printTable(viewReportName.value, viewData.value, columns)) {
    ElMessage.success('打印预览已打开')
  }
}

function getReportType(type: string) {
  const map: Record<string, string> = { balance: '资产负债类', income: '损益类', cost: '成本类', other: '其他' }
  return map[type] || type
}

function formatMoney(v: number) {
  if (!v) return ''
  return v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
</script>

<style scoped>
.report-items {
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 12px;
}
</style>
