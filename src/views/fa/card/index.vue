<template>
  <div class="page-container">
    <div class="search-form">
      <el-form :inline="true" :model="searchForm">
        <el-form-item label="资产编号">
          <el-input v-model="searchForm.assetNo" placeholder="请输入资产编号" clearable />
        </el-form-item>
        <el-form-item label="资产名称">
          <el-input v-model="searchForm.name" placeholder="请输入资产名称" clearable />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable style="width: 120px">
            <el-option label="正常" value="normal" />
            <el-option label="停用" value="stopped" />
            <el-option label="报废" value="scrapped" />
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
        新增资产
      </el-button>
    </div>

    <el-table :data="tableData" border stripe v-loading="loading">
      <el-table-column prop="asset_no" label="资产编号" width="120" />
      <el-table-column prop="name" label="资产名称" width="200" />
      <el-table-column prop="category_name" label="资产类别" width="120" />
      <el-table-column prop="department_name" label="使用部门" width="120" />
      <el-table-column prop="acquisition_date" label="取得日期" width="110" />
      <el-table-column label="原值" width="130" align="right">
        <template #default="{ row }">{{ formatMoney(row.original_value) }}</template>
      </el-table-column>
      <el-table-column label="累计折旧" width="130" align="right">
        <template #default="{ row }">{{ formatMoney(row.accumulated_depreciation) }}</template>
      </el-table-column>
      <el-table-column label="净值" width="130" align="right">
        <template #default="{ row }">{{ formatMoney(row.net_value) }}</template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
          <el-button type="primary" link @click="handleDepreciate(row)" v-if="row.status === 'normal'">折旧</el-button>
          <el-button type="danger" link @click="handleDelete(row)" v-if="row.status === 'normal'">报废</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="editingItem ? '编辑资产' : '新增资产'" width="700px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="资产编号" prop="assetNo">
              <el-input v-model="form.assetNo" placeholder="请输入资产编号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="资产名称" prop="name">
              <el-input v-model="form.name" placeholder="请输入资产名称" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="资产类别">
              <el-select v-model="form.categoryId" placeholder="请选择类别" style="width: 100%">
                <el-option v-for="c in categoryList" :key="c.id" :label="c.name" :value="c.id" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="使用部门">
              <el-select v-model="form.departmentId" placeholder="请选择部门" style="width: 100%">
                <el-option v-for="d in departmentList" :key="d.id" :label="d.name" :value="d.id" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="取得日期" prop="acquisitionDate">
              <el-date-picker v-model="form.acquisitionDate" type="date" placeholder="选择日期" value-format="YYYY-MM-DD" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="原值" prop="originalValue">
              <el-input-number v-model="form.originalValue" :precision="2" :min="0" style="width: 100%" @change="calculateNetValue" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="残值">
              <el-input-number v-model="form.salvageValue" :precision="2" :min="0" style="width: 100%" @change="calculateNetValue" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="净值">
              <el-input-number v-model="form.netValue" :precision="2" :min="0" style="width: 100%" disabled />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="折旧方法">
              <el-select v-model="form.depreciationMethod" style="width: 100%">
                <el-option label="直线法" value="straight_line" />
                <el-option label="双倍余额递减法" value="double_declining" />
                <el-option label="年数总和法" value="sum_of_years" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="使用年限">
              <el-input-number v-model="form.usefulLife" :min="1" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'

const loading = ref(false)
const dialogVisible = ref(false)
const tableData = ref<any[]>([])
const categoryList = ref<any[]>([])
const departmentList = ref<any[]>([])
const editingItem = ref<any>(null)
const formRef = ref<FormInstance>()

const searchForm = reactive({
  assetNo: '',
  name: '',
  status: ''
})

const form = reactive({
  assetNo: '',
  name: '',
  categoryId: null as number | null,
  departmentId: null as number | null,
  acquisitionDate: new Date().toISOString().split('T')[0],
  originalValue: 0,
  salvageValue: 0,
  netValue: 0,
  depreciationMethod: 'straight_line',
  usefulLife: 10
})

const rules: FormRules = {
  assetNo: [{ required: true, message: '请输入资产编号', trigger: 'blur' }],
  name: [{ required: true, message: '请输入资产名称', trigger: 'blur' }],
  acquisitionDate: [{ required: true, message: '请选择取得日期', trigger: 'change' }],
  originalValue: [{ required: true, message: '请输入原值', trigger: 'blur' }]
}

onMounted(() => {
  loadCategories()
  loadDepartments()
  loadData()
})

async function loadCategories() {
  const data = await window.api.database.query(
    'SELECT id, name FROM fa_category ORDER BY code'
  )
  categoryList.value = data
}

async function loadDepartments() {
  const data = await window.api.database.query(
    'SELECT id, name FROM bd_department WHERE is_enabled = 1 ORDER BY code'
  )
  departmentList.value = data
}

async function loadData() {
  loading.value = true
  try {
    let sql = `SELECT a.*, c.name as category_name, d.name as department_name 
               FROM fa_asset a 
               LEFT JOIN fa_category c ON a.category_id = c.id 
               LEFT JOIN bd_department d ON a.department_id = d.id 
               WHERE 1=1`
    if (searchForm.assetNo) {
      sql += ` AND a.asset_no LIKE '%${searchForm.assetNo}%'`
    }
    if (searchForm.name) {
      sql += ` AND a.name LIKE '%${searchForm.name}%'`
    }
    if (searchForm.status) {
      sql += ` AND a.status = '${searchForm.status}'`
    }
    sql += ' ORDER BY a.asset_no'
    const data = await window.api.database.query(sql)
    tableData.value = data
  } catch (error: any) {
    ElMessage.error(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() { loadData() }
function handleReset() {
  Object.assign(searchForm, { assetNo: '', name: '', status: '' })
  loadData()
}

function handleAdd() {
  editingItem.value = null
  Object.assign(form, {
    assetNo: `FA${Date.now().toString().slice(-8)}`,
    name: '',
    categoryId: null,
    departmentId: null,
    acquisitionDate: new Date().toISOString().split('T')[0],
    originalValue: 0,
    salvageValue: 0,
    netValue: 0,
    depreciationMethod: 'straight_line',
    usefulLife: 10
  })
  dialogVisible.value = true
}

function handleEdit(row: any) {
  editingItem.value = row
  Object.assign(form, {
    assetNo: row.asset_no,
    name: row.name,
    categoryId: row.category_id,
    departmentId: row.department_id,
    acquisitionDate: row.acquisition_date,
    originalValue: row.original_value,
    salvageValue: row.salvage_value || 0,
    netValue: row.net_value || row.original_value,
    depreciationMethod: row.depreciation_method || 'straight_line',
    usefulLife: row.useful_life || 10
  })
  dialogVisible.value = true
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm('确定要报废该资产吗？', '提示', { type: 'warning' })
    await window.api.database.execute(
      `UPDATE fa_asset SET status = 'scrapped' WHERE id = ${row.id}`
    )
    ElMessage.success('资产已报废')
    loadData()
  } catch (e) {}
}

async function handleDepreciate(row: any) {
  try {
    await ElMessageBox.confirm('确定要对该资产进行折旧吗？', '提示', { type: 'warning' })
    const monthlyDepreciation = (row.original_value - (row.salvage_value || 0)) / (row.useful_life * 12)
    const newAccumulated = (row.accumulated_depreciation || 0) + monthlyDepreciation
    const newNetValue = row.original_value - newAccumulated
    
    await window.api.database.execute(
      `UPDATE fa_asset SET accumulated_depreciation = ${newAccumulated}, net_value = ${newNetValue}, used_life = used_life + 1 WHERE id = ${row.id}`
    )
    ElMessage.success('折旧成功')
    loadData()
  } catch (e) {}
}

function calculateNetValue() {
  form.netValue = form.originalValue - form.salvageValue
}

async function handleSubmit() {
  const valid = await formRef.value?.validate()
  if (!valid) return

  try {
    const escapeSql = (v: string) => v.replace(/'/g, "''")
    if (editingItem.value) {
      await window.api.database.execute(
        `UPDATE fa_asset SET asset_no='${escapeSql(form.assetNo)}', name='${escapeSql(form.name)}', category_id=${form.categoryId || 'NULL'}, department_id=${form.departmentId || 'NULL'}, acquisition_date='${form.acquisitionDate}', original_value=${form.originalValue}, salvage_value=${form.salvageValue}, net_value=${form.netValue}, depreciation_method='${form.depreciationMethod}', useful_life=${form.usefulLife} WHERE id=${editingItem.value.id}`
      )
    } else {
      await window.api.database.execute(
        `INSERT INTO fa_asset (asset_no, name, category_id, department_id, acquisition_date, original_value, salvage_value, net_value, depreciation_method, useful_life, status) VALUES ('${escapeSql(form.assetNo)}', '${escapeSql(form.name)}', ${form.categoryId || 'NULL'}, ${form.departmentId || 'NULL'}, '${form.acquisitionDate}', ${form.originalValue}, ${form.salvageValue}, ${form.netValue}, '${form.depreciationMethod}', ${form.usefulLife}, 'normal')`
      )
    }
    ElMessage.success('保存成功')
    dialogVisible.value = false
    loadData()
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败')
  }
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
