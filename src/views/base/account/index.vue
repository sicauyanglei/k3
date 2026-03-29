<template>
  <div class="page-container">
    <el-row :gutter="16">
      <el-col :span="8">
        <div class="tree-panel">
          <div class="panel-header">
            <span>科目分类</span>
            <el-button type="primary" size="small" @click="handleAdd(null)">新增</el-button>
          </div>
          <el-tree
            ref="treeRef"
            :data="treeData"
            :props="{ label: 'name', children: 'children' }"
            node-key="id"
            highlight-current
            default-expand-all
            @node-click="handleNodeClick"
          >
            <template #default="{ node, data }">
              <span class="tree-node">
                <span>{{ data.code }} - {{ data.name }}</span>
              </span>
            </template>
          </el-tree>
        </div>
      </el-col>
      <el-col :span="16">
        <div class="detail-panel">
          <div class="panel-header">
            <span>科目详情</span>
            <div v-if="currentAccount">
              <el-button type="primary" size="small" @click="handleEdit(currentAccount)">编辑</el-button>
              <el-button type="danger" size="small" @click="handleDelete(currentAccount)">删除</el-button>
            </div>
          </div>
          <div class="panel-body" v-if="currentAccount">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="科目编码">{{ currentAccount.code }}</el-descriptions-item>
              <el-descriptions-item label="科目名称">{{ currentAccount.name }}</el-descriptions-item>
              <el-descriptions-item label="科目类别">{{ getCategoryName(currentAccount.category) }}</el-descriptions-item>
              <el-descriptions-item label="余额方向">{{ currentAccount.direction === 'debit' ? '借方' : '贷方' }}</el-descriptions-item>
              <el-descriptions-item label="科目级次">第{{ currentAccount.level }}级</el-descriptions-item>
              <el-descriptions-item label="是否末级">{{ currentAccount.is_leaf ? '是' : '否' }}</el-descriptions-item>
              <el-descriptions-item label="状态">{{ currentAccount.is_enabled ? '启用' : '停用' }}</el-descriptions-item>
              <el-descriptions-item label="辅助核算">{{ currentAccount.has_aux ? '是' : '否' }}</el-descriptions-item>
            </el-descriptions>
          </div>
          <el-empty v-else description="请选择左侧科目查看详情" />
        </div>
      </el-col>
    </el-row>

    <el-dialog v-model="dialogVisible" :title="editingAccount ? '编辑科目' : '新增科目'" width="500px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="科目编码" prop="code">
          <el-input v-model="form.code" placeholder="请输入科目编码" />
        </el-form-item>
        <el-form-item label="科目名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入科目名称" />
        </el-form-item>
        <el-form-item label="科目类别" prop="category">
          <el-select v-model="form.category" style="width: 100%">
            <el-option label="资产" value="asset" />
            <el-option label="负债" value="liability" />
            <el-option label="权益" value="equity" />
            <el-option label="成本" value="cost" />
            <el-option label="损益" value="profit" />
          </el-select>
        </el-form-item>
        <el-form-item label="余额方向" prop="direction">
          <el-radio-group v-model="form.direction">
            <el-radio label="debit">借方</el-radio>
            <el-radio label="credit">贷方</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="是否启用">
          <el-switch v-model="form.is_enabled" />
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
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'

const treeRef = ref()
const dialogVisible = ref(false)
const loading = ref(false)
const accountList = ref<any[]>([])
const currentAccount = ref<any>(null)
const editingAccount = ref<any>(null)
const formRef = ref<FormInstance>()

const form = reactive({
  code: '',
  name: '',
  category: 'asset',
  direction: 'debit',
  parent_id: null as number | null,
  level: 1,
  is_enabled: true,
  is_leaf: true
})

const rules: FormRules = {
  code: [{ required: true, message: '请输入科目编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入科目名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择科目类别', trigger: 'change' }],
  direction: [{ required: true, message: '请选择余额方向', trigger: 'change' }]
}

const treeData = computed(() => {
  const buildTree = (items: any[], parentId: number | null = null) => {
    return items
      .filter(item => item.parent_id === parentId)
      .map(item => ({
        ...item,
        children: buildTree(items, item.id)
      }))
  }
  return buildTree(accountList.value)
})

onMounted(() => {
  loadAccounts()
})

async function loadAccounts() {
  loading.value = true
  try {
    const data = await window.api.database.query('SELECT * FROM bd_account ORDER BY code')
    accountList.value = data
  } catch (error: any) {
    ElMessage.error(error.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function handleNodeClick(data: any) {
  currentAccount.value = data
}

function handleAdd(parent: any) {
  editingAccount.value = null
  form.code = parent ? parent.code : ''
  form.name = ''
  form.category = parent ? parent.category : 'asset'
  form.direction = parent ? parent.direction : 'debit'
  form.parent_id = parent ? parent.id : null
  form.level = parent ? parent.level + 1 : 1
  form.is_enabled = true
  form.is_leaf = true
  dialogVisible.value = true
}

function handleEdit(account: any) {
  editingAccount.value = account
  Object.assign(form, {
    code: account.code,
    name: account.name,
    category: account.category,
    direction: account.direction,
    parent_id: account.parent_id,
    level: account.level,
    is_enabled: !!account.is_enabled,
    is_leaf: !!account.is_leaf
  })
  dialogVisible.value = true
}

async function handleDelete(account: any) {
  try {
    await ElMessageBox.confirm('确定要删除该科目吗？', '提示', { type: 'warning' })
    await window.api.database.execute(`DELETE FROM bd_account WHERE id = ${account.id}`)
    ElMessage.success('删除成功')
    currentAccount.value = null
    loadAccounts()
  } catch (e) {
    // cancelled
  }
}

async function handleSubmit() {
  const valid = await formRef.value?.validate()
  if (!valid) return

  try {
    if (editingAccount.value) {
      await window.api.database.execute(
        `UPDATE bd_account SET code='${form.code}', name='${form.name}', category='${form.category}', direction='${form.direction}', is_enabled=${form.is_enabled ? 1 : 0} WHERE id=${editingAccount.value.id}`
      )
    } else {
      await window.api.database.execute(
        `INSERT INTO bd_account (code, name, parent_id, category, direction, level, is_leaf, is_enabled) VALUES ('${form.code}', '${form.name}', ${form.parent_id || 'NULL'}, '${form.category}', '${form.direction}', ${form.level}, 1, ${form.is_enabled ? 1 : 0})`
      )
    }
    ElMessage.success('保存成功')
    dialogVisible.value = false
    loadAccounts()
  } catch (error: any) {
    ElMessage.error(error.message || '保存失败')
  }
}

function getCategoryName(category: string) {
  const map: Record<string, string> = {
    asset: '资产',
    liability: '负债',
    equity: '权益',
    cost: '成本',
    profit: '损益'
  }
  return map[category] || category
}
</script>

<style scoped lang="scss">
.tree-panel, .detail-panel {
  background: #fff;
  border-radius: 8px;
  height: calc(100vh - 150px);
  overflow: auto;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #ebeef5;
  font-weight: 500;
}

.panel-body {
  padding: 16px;
}

.tree-node {
  font-size: 14px;
}
</style>
