<template>
  <aside class="app-sidebar" :class="{ collapsed: permissionStore.menuCollapsed }">
    <div class="logo">
      <img src="@/assets/logo.svg" alt="K3" class="logo-img" />
      <span v-show="!permissionStore.menuCollapsed" class="logo-text">K3财务软件</span>
    </div>
    <el-scrollbar>
      <el-menu
        :default-active="activeMenu"
        :collapse="permissionStore.menuCollapsed"
        :collapse-transition="false"
        router
      >
        <template v-for="route in menuRoutes" :key="route.path">
          <el-sub-menu v-if="route.children && route.children.length > 0" :index="route.path">
            <template #title>
              <el-icon><component :is="route.meta?.icon" /></el-icon>
              <span>{{ route.meta?.title }}</span>
            </template>
            <el-menu-item
              v-for="child in route.children"
              :key="child.path"
              :index="`/${route.path}/${child.path}`"
            >
              {{ child.meta?.title }}
            </el-menu-item>
          </el-sub-menu>
          <el-menu-item v-else :index="route.path">
            <el-icon><component :is="route.meta?.icon" /></el-icon>
            <span>{{ route.meta?.title }}</span>
          </el-menu-item>
        </template>
      </el-menu>
    </el-scrollbar>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { usePermissionStore } from '@/stores/permission'

const route = useRoute()
const permissionStore = usePermissionStore()

const activeMenu = computed(() => route.path)

const menuRoutes = computed(() => {
  const mainRoute = route.matched[0]
  return mainRoute?.children?.filter(r => !r.meta?.hidden) || []
})
</script>

<style scoped lang="scss">
@use '@/styles/variables.scss' as *;

.app-sidebar {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: $sidebar-width;
  background-color: #fff;
  border-right: 1px solid $border-color;
  transition: width $transition-duration;
  z-index: 100;
  
  &.collapsed {
    width: 64px;
    
    .logo-text {
      display: none;
    }
  }
}

.logo {
  display: flex;
  align-items: center;
  height: $header-height;
  padding: 0 16px;
  border-bottom: 1px solid $border-color;
  
  .logo-img {
    width: 32px;
    height: 32px;
  }
  
  .logo-text {
    margin-left: 12px;
    font-size: 16px;
    font-weight: 600;
    color: $primary-color;
    white-space: nowrap;
  }
}

.el-menu {
  border-right: none;
}

:deep(.el-menu-item),
:deep(.el-sub-menu__title) {
  height: 48px;
  line-height: 48px;
  
  &:hover {
    background-color: $menu-hover-bg;
  }
}

:deep(.el-menu-item.is-active) {
  background-color: $menu-active-bg;
  color: $primary-color;
}
</style>
