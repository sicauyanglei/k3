<template>
  <div class="page-container">
    <div class="table-toolbar">
      <el-button type="primary" @click="handleAdd">
        <el-icon><Plus /></el-icon>
        新增类别
      </el-button>
    </div>

    <el-table :data="tableData" border stripe v-loading="loading">
      <el-table-column prop="code" label="类别编码" width="120" />
      <el-table-column prop="name" label="类别名称" width="200" />
      <el-table-column prop="depreciation_method" label="折旧方法" width="150">
        <template #default="{ row }">{{ getMethodName(row.depreciation_method) }}</template>
      </el-table-column>
      <el-table-column prop="useful_life" label="使用年限" width="100">
        <template #default="{ row }">{{ row.useful_life }}年</template>
      </el-table-column>
      <el-table-column prop="salvage_rate" label="残值率" width="100">
        <template #default="{ row }">{{ row.salvage_rate || 0 }}%</template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
          <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="editingItem ? '编辑类别' : '新增类别'" width="500px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="类别编码" prop="code">
          <el-input v-model="form.code" placeholder="请输入类别编码" />
        </el-form-item>
        <el-form-item label="类别名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入类别名称" />
        </el-form-item>
        <el-form-item label="折旧方法">
          <el-select v-model="form.depreciationMethod" style="width: 100%">
            <el-option label="直线法" value="straight_line" />
            <el-option label="双倍余额递减法" value="double_declining" />
            <el-option label="年数总和法" value="sum_of_years" />
          </el-select>
        </el-form-item>
        <el-form-item label="使用年限">
          <el-input-number v-model="form.usefulLife" :min="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="残值率(%)">
          <el-input-number v-model="form.salvageRate" :precision="2" :min="0" :max="100" style="width: 100%" />
        </el-form-item>
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
const editingItem = ref<any>(null)
const formRef = ref<FormInstance>()

const form = reactive({
  code: '',
  name: '',
  depreciationMethod: 'straight_line',
  usefulLife: 10,
  salvageRate: 5
})

const rules: FormRules = {
  code: [{ required: true, message: '请输入类别编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入类别名称', trigger: 'blur' }]
}

onMounted(() => {
  loadData()
})

async function loadData() {
  loading.value = true
  try {
    const data = await window.api.database.query('SELECT * FROM fa_category ORDER BY code')
    if (data.length === 0) {
      await initDefaultCategories()
      await loadData()
      return
    }
    tableData.value = data
  } catch (error: any) {
    ElMessage.error(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

async function initDefaultCategories() {
  const categories = [
    { code: '01', name: '房屋建筑物', depreciation_method: 'straight_line', useful_life: 30, salvage_rate: 5 },
    { code: '02', name: '机器设备', depreciation_method: 'straight_line', useful_life: 10, salvage_rate: 5 },
    { code: '03', name: '运输设备', depreciation_method: 'straight_line', useful_life: 8, salvage_rate: 5 },
    { code: '04', name: '电子设备', depreciation_method: 'straight_line', useful_life: 3, salvage_rate: 5 },
    { code: '05', name: '办公设备', depreciation_method: 'straight_line', useful_life: 5, salvage_rate: 5 }
  ]
  
  for (const cat of categories) {
    await window.api.database.execute(
      `INSERT INTO fa_category (code, name, depreciation_method, useful_life, salvage_rate) VALUES ('${cat.code}', '${cat.name}', '${cat.depreciation_method}', ${cat.useful_life}, ${cat.salvage_rate})`
    )
  }
}

function handleAdd() {
  editingItem.value = null
  Object.assign(form, { code: '', name: '', depreciationMethod: 'straight_line', usefulLife: 10, salvageRate: 5 })
  dialogVisible.value = true
}

function handleEdit(row: any) {
  editingItem.value = row
  Object.assign(form, {
    code: row.code,
    name: row.name,
    depreciationMethod: row.depreciation_method || 'straight_line',
    usefulLife: row.useful_life || 10,
    salvageRate: row.salvage_rate || 5
  })
  dialogVisible.value = true
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm('确定要删除该类别吗？', '提示', { type: 'warning' })
    await window.api.database.execute(`DELETE FROM fa_category WHERE id = ${row.id}`)
    ElMessage.success('删除成功')
    loadData()
  } catch (e) {}
}

async function handleSubmit() {
  const valid = await formRef.value?.validate()
  if (!valid) return

  try {
    const escapeSql = (v: string) => v.replace(/'/g, "''")
    if (editingItem.value) {
      await window.api.database.execute(
        `UPDATE fa_category SET code='${escapeSql(form.code)}', name='${escapeSql(form.name)}', depreciation_method='${form.depreciationMethod}', useful_life=${form.usefulLife}, salvage_rate=${form.salvageRate} WHERE id=${editingItem.value.id}`
      )
    } else {
      await window.api.database.execute(
        `INSERT INTO fa_category (code, name, depreciation_method, useful_life, salvage_rate) VALUES ('${escapeSql(form.code)}', '${escapeSql(form.name)}', '${form.depreciationMethod}', ${form.usefulLife}, ${form.salvageRate})`
      )
    }
    ElMessage.success('保存成功')
    dialogVisible.value = false
    loadData()
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败')
  }
}

function getMethodName(method: string) {
  const map: Record<string, string> = {
    straight_line: '直线法',
    double_declining: '双倍余额递减法',
    sum_of_years: '年数总和法'
  }
  return map[method] || method
}
</script>
