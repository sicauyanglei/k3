<template>
  <div class="page-container">
    <div class="table-toolbar">
      <el-button type="primary" @click="handleAdd">
        <el-icon><Plus /></el-icon>
        新增工资项目
      </el-button>
    </div>

    <el-table :data="tableData" border stripe v-loading="loading">
      <el-table-column prop="code" label="项目编码" width="120" />
      <el-table-column prop="name" label="项目名称" width="150" />
      <el-table-column prop="item_type" label="项目类型" width="100">
        <template #default="{ row }">
          <el-tag :type="row.item_type === 'add' ? 'success' : 'danger'">
            {{ row.item_type === 'add' ? '增项' : '减项' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="formula" label="计算公式" min-width="200" show-overflow-tooltip />
      <el-table-column prop="is_system" label="系统项" width="80">
        <template #default="{ row }">
          <el-tag v-if="row.is_system" type="info">是</el-tag>
          <el-tag v-else>否</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="sort_order" label="排序" width="80" />
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link @click="handleEdit(row)" :disabled="row.is_system">编辑</el-button>
          <el-button type="danger" link @click="handleDelete(row)" :disabled="row.is_system">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="editingItem ? '编辑项目' : '新增项目'" width="500px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="项目编码" prop="code">
          <el-input v-model="form.code" placeholder="请输入项目编码" />
        </el-form-item>
        <el-form-item label="项目名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入项目名称" />
        </el-form-item>
        <el-form-item label="项目类型" prop="itemType">
          <el-select v-model="form.itemType" style="width: 100%">
            <el-option label="增项" value="add" />
            <el-option label="减项" value="subtract" />
          </el-select>
        </el-form-item>
        <el-form-item label="计算公式">
          <el-input v-model="form.formula" type="textarea" :rows="3" placeholder="如: base_salary * 0.1" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sortOrder" :min="0" style="width: 100%" />
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
  itemType: 'add',
  formula: '',
  sortOrder: 0
})

const rules: FormRules = {
  code: [{ required: true, message: '请输入项目编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入项目名称', trigger: 'blur' }],
  itemType: [{ required: true, message: '请选择项目类型', trigger: 'change' }]
}

onMounted(() => {
  loadData()
})

async function loadData() {
  loading.value = true
  try {
    const data = await window.api.database.query(
      'SELECT * FROM hr_salary_item ORDER BY sort_order, code'
    )
    if (data.length === 0) {
      await initDefaultItems()
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

async function initDefaultItems() {
  const defaultItems = [
    { code: 'base_salary', name: '基本工资', item_type: 'add', is_system: 1, sort_order: 1 },
    { code: 'overtime', name: '加班工资', item_type: 'add', is_system: 0, sort_order: 2 },
    { code: 'bonus', name: '奖金', item_type: 'add', is_system: 0, sort_order: 3 },
    { code: 'subsidy', name: '补贴', item_type: 'add', is_system: 0, sort_order: 4 },
    { code: 'social_insurance', name: '社保', item_type: 'subtract', is_system: 1, sort_order: 10 },
    { code: 'housing_fund', name: '公积金', item_type: 'subtract', is_system: 1, sort_order: 11 },
    { code: 'tax', name: '个人所得税', item_type: 'subtract', is_system: 1, sort_order: 12 }
  ]
  for (const item of defaultItems) {
    await window.api.database.execute(
      `INSERT INTO hr_salary_item (code, name, item_type, is_system, sort_order) VALUES ('${item.code}', '${item.name}', '${item.item_type}', ${item.is_system}, ${item.sort_order})`
    )
  }
}

function handleAdd() {
  editingItem.value = null
  Object.assign(form, { code: '', name: '', itemType: 'add', formula: '', sortOrder: 0 })
  dialogVisible.value = true
}

function handleEdit(row: any) {
  editingItem.value = row
  Object.assign(form, {
    code: row.code,
    name: row.name,
    itemType: row.item_type,
    formula: row.formula || '',
    sortOrder: row.sort_order || 0
  })
  dialogVisible.value = true
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm('确定要删除该项目吗？', '提示', { type: 'warning' })
    await window.api.database.execute(`DELETE FROM hr_salary_item WHERE id = ${row.id}`)
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
        `UPDATE hr_salary_item SET code='${escapeSql(form.code)}', name='${escapeSql(form.name)}', item_type='${form.itemType}', formula='${escapeSql(form.formula)}', sort_order=${form.sortOrder} WHERE id=${editingItem.value.id}`
      )
    } else {
      await window.api.database.execute(
        `INSERT INTO hr_salary_item (code, name, item_type, formula, sort_order, is_system) VALUES ('${escapeSql(form.code)}', '${escapeSql(form.name)}', '${form.itemType}', '${escapeSql(form.formula)}', ${form.sortOrder}, 0)`
      )
    }
    ElMessage.success('保存成功')
    dialogVisible.value = false
    loadData()
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败')
  }
}
</script>
