import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface IAccount {
  id: number
  name: string
  companyName: string
  dbPath: string
  accountingStandard: string
  fiscalYearStart: string
  createdAt: string
}

export const useAccountStore = defineStore('account', () => {
  const currentAccount = ref<IAccount | null>(null)
  const currentYear = ref<number>(new Date().getFullYear())
  const currentPeriod = ref<number>(new Date().getMonth() + 1)

  const isAccountLoaded = computed(() => !!currentAccount.value)

  function setAccount(account: IAccount) {
    currentAccount.value = account
  }

  function setPeriod(year: number, period: number) {
    currentYear.value = year
    currentPeriod.value = period
  }

  function clearAccount() {
    currentAccount.value = null
  }

  return {
    currentAccount,
    currentYear,
    currentPeriod,
    isAccountLoaded,
    setAccount,
    setPeriod,
    clearAccount
  }
})
