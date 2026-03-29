export interface ICustomer {
  id: number
  code: string
  name: string
  shortName: string
  creditLimit: number
  contact: string
  phone: string
  address: string
  isEnabled: boolean
  createdAt: string
}

export interface ISupplier {
  id: number
  code: string
  name: string
  shortName: string
  contact: string
  phone: string
  address: string
  isEnabled: boolean
  createdAt: string
}

export interface IARInvoice {
  id: number
  invoiceNo: string
  invoiceType: string
  customerId: number
  invoiceDate: string
  amount: number
  taxAmount: number
  totalAmount: number
  status: 'draft' | 'audited' | 'posted'
  voucherId: number | null
  createdAt: string
}

export interface IARReceipt {
  id: number
  receiptNo: string
  customerId: number
  receiptDate: string
  amount: number
  bankAccount: string
  status: 'draft' | 'audited' | 'posted'
  voucherId: number | null
  createdAt: string
}

export interface IAPInvoice {
  id: number
  invoiceNo: string
  invoiceType: string
  supplierId: number
  invoiceDate: string
  amount: number
  taxAmount: number
  totalAmount: number
  status: 'draft' | 'audited' | 'posted'
  voucherId: number | null
  createdAt: string
}

export interface IAPPayment {
  id: number
  paymentNo: string
  supplierId: number
  paymentDate: string
  amount: number
  bankAccount: string
  status: 'draft' | 'audited' | 'posted'
  voucherId: number | null
  createdAt: string
}
