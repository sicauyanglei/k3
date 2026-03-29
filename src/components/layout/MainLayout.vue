<template>
  <div class="main-layout">
    <app-sidebar />
    <div class="main-container" :class="{ collapsed: permissionStore.menuCollapsed }">
      <app-header />
      <app-main />
    </div>
  </div>
</template>

<script setup lang="ts">
import { usePermissionStore } from '@/stores/permission'
import AppHeader from './AppHeader.vue'
import AppSidebar from './AppSidebar.vue'
import AppMain from './AppMain.vue'

const permissionStore = usePermissionStore()
</script>

<style scoped lang="scss">
@use '@/styles/variables.scss' as *;

.main-layout {
  display: flex;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

.main-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  margin-left: $sidebar-width;
  transition: margin-left $transition-duration;
  
  &.collapsed {
    margin-left: 64px;
  }
}
</style>
