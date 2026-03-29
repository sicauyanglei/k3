<template>
  <header class="app-header">
    <div class="header-left">
      <el-icon class="collapse-btn" @click="toggleMenu">
        <Fold v-if="!permissionStore.menuCollapsed" />
        <Expand v-else />
      </el-icon>
      <el-breadcrumb separator="/">
        <el-breadcrumb-item v-for="item in breadcrumbs" :key="item.path">
          {{ item.meta?.title || item.name }}
        </el-breadcrumb-item>
      </el-breadcrumb>
    </div>
    <div class="header-center">
      <span class="account-info" v-if="accountStore.isAccountLoaded">
        {{ accountStore.currentAccount?.companyName }} - 
        {{ accountStore.currentYear }}年{{ accountStore.currentPeriod }}期
      </span>
    </div>
    <div class="header-right">
      <div class="window-controls">
        <el-icon @click="minimize"><Minus /></el-icon>
        <el-icon @click="maximize"><FullScreen /></el-icon>
        <el-icon @click="close"><Close /></el-icon>
      </div>
      <el-dropdown @command="handleCommand">
        <span class="user-info">
          <el-avatar :size="28" icon="UserFilled" />
          <span class="username">{{ userStore.user?.realName || userStore.user?.username }}</span>
          <el-icon><ArrowDown /></el-icon>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="password">修改密码</el-dropdown-item>
            <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { usePermissionStore } from '@/stores/permission'
import { useAccountStore } from '@/stores/account'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const permissionStore = usePermissionStore()
const accountStore = useAccountStore()

const breadcrumbs = computed(() => {
  return route.matched.filter(item => item.meta?.title)
})

function toggleMenu() {
  permissionStore.toggleMenu()
}

function minimize() {
  window.api.window.minimize()
}

function maximize() {
  window.api.window.maximize()
}

function close() {
  window.api.window.close()
}

async function handleCommand(command: string) {
  if (command === 'logout') {
    try {
      await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
        type: 'warning'
      })
      await window.api.user.logout()
      userStore.logout()
      accountStore.clearAccount()
      router.push('/login')
    } catch (e) {
      // cancelled
    }
  } else if (command === 'password') {
    ElMessage.info('修改密码功能开发中')
  }
}
</script>

<style scoped lang="scss">
@use '@/styles/variables.scss' as *;

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: $header-height;
  padding: 0 16px;
  background-color: #fff;
  border-bottom: 1px solid $border-color;
  -webkit-app-region: drag;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  -webkit-app-region: no-drag;
  
  .collapse-btn {
    font-size: 18px;
    cursor: pointer;
    color: $text-regular;
    
    &:hover {
      color: $primary-color;
    }
  }
}

.header-center {
  flex: 1;
  text-align: center;
  
  .account-info {
    font-size: 13px;
    color: $text-secondary;
  }
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
  -webkit-app-region: no-drag;
}

.window-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-right: 16px;
  border-right: 1px solid $border-color;
  
  .el-icon {
    font-size: 16px;
    cursor: pointer;
    color: $text-regular;
    padding: 4px;
    border-radius: 4px;
    
    &:hover {
      background-color: $bg-color;
      color: $text-primary;
    }
    
    &:last-child:hover {
      background-color: $danger-color;
      color: #fff;
    }
  }
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  
  .username {
    font-size: 14px;
    color: $text-primary;
  }
}
</style>
