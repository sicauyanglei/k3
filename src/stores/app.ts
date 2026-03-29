import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const loading = ref(false)
  const loadingText = ref('加载中...')
  const fullscreen = ref(false)

  function setLoading(isLoading: boolean, text?: string) {
    loading.value = isLoading
    loadingText.value = text || '加载中...'
  }

  function toggleFullscreen() {
    fullscreen.value = !fullscreen.value
  }

  return {
    loading,
    loadingText,
    fullscreen,
    setLoading,
    toggleFullscreen
  }
})
