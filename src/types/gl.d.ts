export interface IAccount {
  id: number
  code: string
  name: string
  parentId: number | null
  category: 'asset' | 'liability' | 'equity' | 'cost' | 'profit'
  direction: 'debit' | 'credit'
  level: number
  isLeaf: boolean
  isEnabled: boolean
  hasAux: boolean
  auxTypes?: string
  createdAt: string
}

export interface IVoucher {
  id: number
  voucherWord: string
  voucherNo: number
  year: number
  period: number
  voucherDate: string
  description: string
  attachmentCount: number
  makerId: number
  auditorId: number | null
  posterId: number | null
  status: 'draft' | 'audited' | 'posted'
  madeAt: string
  auditedAt: string | null
  postedAt: string | null
  entries: IVoucherEntry[]
  createdAt: string
}

export interface IVoucherEntry {
  id: number
  voucherId: number
  entryNo: number
  accountId: number
  accountCode: string
  accountName: string
  description: string
  debit: number
  credit: number
  currencyId: number | null
  exchangeRate: number | null
  originalDebit: number | null
  originalCredit: number | null
  customerId: number | null
  supplierId: number | null
  employeeId: number | null
  departmentId: number | null
  projectId: number | null
  createdAt: string
}

export interface IBalance {
  id: number
  year: number
  period: number
  accountId: number
  currencyId: number
  customerId: number | null
  supplierId: number | null
  employeeId: number | null
  departmentId: number | null
  beginDebit: number
  beginCredit: number
  periodDebit: number
  periodCredit: number
  endDebit: number
  endCredit: number
  yearDebit: number
  yearCredit: number
}

export interface IAccountPeriod {
  id: number
  year: number
  period: number
  startDate: string
  endDate: string
  isClosed: boolean
  closedAt: string | null
}
