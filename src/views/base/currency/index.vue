<template>
  <div class="page-container">
    <div class="table-toolbar">
      <el-button type="primary" @click="handleAdd">
        <el-icon><Plus /></el-icon>
        新增币别
      </el-button>
    </div>
    
    <el-table :data="tableData" border stripe v-loading="loading">
      <el-table-column prop="code" label="币别代码" width="120" />
      <el-table-column prop="name" label="币别名称" width="150" />
      <el-table-column prop="symbol" label="货币符号" width="100" />
      <el-table-column prop="exchange_rate" label="汇率" width="120" />
      <el-table-column prop="is_base" label="本位币" width="100">
        <template #default="{ row }">
          <el-tag :type="row.is_base ? 'success' : 'info'">{{ row.is_base ? '是' : '否' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150">
        <template #default="{ row }">
          <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
          <el-button type="danger" link @click="handleDelete(row)" v-if="!row.is_base">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="editingItem ? '编辑币别' : '新增币别'" width="400px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="币别代码" prop="code">
          <el-input v-model="form.code" placeholder="如: USD" />
        </el-form-item>
        <el-form-item label="币别名称" prop="name">
          <el-input v-model="form.name" placeholder="如: 美元" />
        </el-form-item>
        <el-form-item label="货币符号">
          <el-input v-model="form.symbol" placeholder="如: $" />
        </el-form-item>
        <el-form-item label="汇率">
          <el-input-number v-model="form.exchange_rate" :precision="6" :min="0" style="width: 100%" />
        </el-form-item>
        <el-form-item label="是否本位币">
          <el-switch v-model="form.is_base" />
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
  symbol: '',
  exchange_rate: 1,
  is_base: false
})

const rules: FormRules = {
  code: [{ required: true, message: '请输入币别代码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入币别名称', trigger: 'blur' }]
}

onMounted(() => {
  loadData()
})

async function loadData() {
  loading.value = true
  try {
    const data = await window.api.database.query('SELECT * FROM bd_currency ORDER BY code')
    tableData.value = data
  } catch (error: any) {
    ElMessage.error(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function handleAdd() {
  editingItem.value = null
  Object.assign(form, { code: '', name: '', symbol: '', exchange_rate: 1, is_base: false })
  dialogVisible.value = true
}

function handleEdit(row: any) {
  editingItem.value = row
  Object.assign(form, {
    code: row.code,
    name: row.name,
    symbol: row.symbol || '',
    exchange_rate: row.exchange_rate || 1,
    is_base: !!row.is_base
  })
  dialogVisible.value = true
}

async function handleDelete(row: any) {
  try {
    await ElMessageBox.confirm('确定要删除该币别吗？', '提示', { type: 'warning' })
    await window.api.database.execute(`DELETE FROM bd_currency WHERE id = ${row.id}`)
    ElMessage.success('删除成功')
    loadData()
  } catch (e) {}
}

async function handleSubmit() {
  const valid = await formRef.value?.validate()
  if (!valid) return

  try {
    if (editingItem.value) {
      await window.api.database.execute(
        `UPDATE bd_currency SET code='${form.code}', name='${form.name}', symbol='${form.symbol}', exchange_rate=${form.exchange_rate}, is_base=${form.is_base ? 1 : 0} WHERE id=${editingItem.value.id}`
      )
    } else {
      await window.api.database.execute(
        `INSERT INTO bd_currency (code, name, symbol, exchange_rate, is_base) VALUES ('${form.code}', '${form.name}', '${form.symbol}', ${form.exchange_rate}, ${form.is_base ? 1 : 0})`
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
