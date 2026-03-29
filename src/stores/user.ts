import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface IUser {
  id: number
  username: string
  realName: string
  role: string
}

export const useUserStore = defineStore('user', () => {
  const user = ref<IUser | null>(null)
  const token = ref<string>('')

  const isLoggedIn = computed(() => !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  function setUser(userData: IUser) {
    user.value = userData
  }

  function setToken(t: string) {
    token.value = t
  }

  function logout() {
    user.value = null
    token.value = ''
  }

  return {
    user,
    token,
    isLoggedIn,
    isAdmin,
    setUser,
    setToken,
    logout
  }
})
