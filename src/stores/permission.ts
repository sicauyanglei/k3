import { defineStore } from 'pinia'
import { ref } from 'vue'

interface IPermission {
  module: string
  actions: string[]
}

export const usePermissionStore = defineStore('permission', () => {
  const permissions = ref<IPermission[]>([])
  const menuCollapsed = ref(false)

  function setPermissions(perms: IPermission[]) {
    permissions.value = perms
  }

  function hasPermission(module: string, action: string): boolean {
    const perm = permissions.value.find(p => p.module === module)
    return perm ? perm.actions.includes(action) : false
  }

  function toggleMenu() {
    menuCollapsed.value = !menuCollapsed.value
  }

  return {
    permissions,
    menuCollapsed,
    setPermissions,
    hasPermission,
    toggleMenu
  }
})
