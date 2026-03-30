import 'server-only'

// ─── Nubox API Response Types ───────────────────────────────────────────────

// Shared nested types

export type NuboxIdentification = {
  type?: number
  value: string // RUT (e.g., "88417000-1")
}

export type NuboxDocumentType = {
  id: number
  legalCode: string // SII code: "33", "34", "56", "61", etc.
  abbreviation: string // "FAC-EL", "N/C-EL", etc.
  name: string
}

export type NuboxEmissionStatus = {
  id: number // 1=Emitido, 2=Borrador, 3=Anulado, 4=Esperando SII, 5=Rechazado, 6=Esperando Re-emisión, 7=Sin Respuesta SII, 8=Reintento Disponible
  name: string
}

export type NuboxOrigin = {
  id: number
  name: string // "Manual Emision", "Integración SII", etc.
}

export type NuboxPaymentForm = {
  id: number
  legalCode: string // "1" contado, "2" crédito
  name: string
}

export type NuboxLink = {
  rel: string // "self", "details", "references", "pdf", "xml"
  href: string
}

// Sales (ventas emitidas por Efeonce)

export type NuboxClient = {
  tradeName: string
  identification: NuboxIdentification
  mainActivity?: string
}

export type NuboxDataClSale = {
  trackId: number
  annulled: boolean
}

export type NuboxSaleType = {
  id: number
  legalCode: string
  name: string
}

export type NuboxSale = {
  id: number
  number: string // folio
  type: NuboxDocumentType
  totalNetAmount: number
  totalExemptAmount: number
  totalTaxVatAmount: number
  totalAmount: number
  totalOtherTaxesAmount?: number
  totalWithholdingAmount?: number
  balance?: number
  emissionDate: string // ISO timestamp
  periodMonth: number
  periodYear: number
  dueDate?: string // "YYYY-MM-DD"
  origin?: NuboxOrigin
  paymentForm?: NuboxPaymentForm
  dataCl?: NuboxDataClSale
  client: NuboxClient
  emissionStatus: NuboxEmissionStatus
  saleType?: NuboxSaleType
  links?: NuboxLink[]
}

export type NuboxSaleDetail = {
  lineNumber: number
  description: string
  quantity: number
  unitPrice: number
  totalAmount: number
  discountPercent?: number
  exemptIndicator?: boolean
}

// Purchases (facturas de proveedores recibidas)

export type NuboxSupplier = {
  identification: NuboxIdentification
  tradeName: string
}

export type NuboxDocumentStatus = {
  id: number
  name: string // "Aceptado", "Reclamado", etc.
}

export type NuboxPurchaseType = {
  id?: number
  legalCode: string
  name: string // "Compras del Giro"
}

export type NuboxDataClPurchase = {
  annulled: boolean
  receiptAt?: string
  vatUnrecoverableAmount?: number
  vatFixedAssetsAmount?: number
  vatCommonUseAmount?: number
}

export type NuboxPurchase = {
  id: number
  number: string // folio
  type: NuboxDocumentType
  totalNetAmount: number
  totalExemptAmount: number
  totalTaxVatAmount: number
  totalAmount: number
  totalOtherTaxesAmount?: number
  totalWithholdingAmount?: number
  balance: number
  emissionDate: string
  periodMonth: number
  periodYear: number
  dueDate?: string
  origin?: NuboxOrigin
  dataCl?: NuboxDataClPurchase
  supplier: NuboxSupplier
  documentStatus: NuboxDocumentStatus
  purchaseType?: NuboxPurchaseType
  links?: NuboxLink[]
}

// Expenses (egresos — pagos bancarios a proveedores)

export type NuboxBank = {
  id: number
  description: string
}

export type NuboxPaymentMethod = {
  id: number
  description: string
}

export type NuboxExpenseType = {
  id: number
  description: string
}

export type NuboxExpense = {
  id: number
  folio: number
  type: NuboxExpenseType
  bank?: NuboxBank
  paymentMethod?: NuboxPaymentMethod
  supplier?: NuboxSupplier
  totalAmount: number
  paymentDate: string // "YYYY-MM-DD"
  links?: NuboxLink[]
}

// Incomes (ingresos — cobros bancarios de clientes)

export type NuboxIncome = {
  id: number
  folio?: number
  type?: { id: number; description: string }
  bank?: NuboxBank
  paymentMethod?: NuboxPaymentMethod
  client?: NuboxClient
  totalAmount: number
  paymentDate: string
  links?: NuboxLink[]
}

// Paginated list response wrapper

export type NuboxPaginatedResponse<T> = {
  data: T[]
  totalCount: number
}

// ─── Issuance (Emission) Types ──────────────────────────────────────────────

export type NuboxIssuanceDetail = {
  lineNumber: number
  description: string
  quantity: number
  unitPrice: number
  exemptIndicator?: boolean
  discountPercent?: number
}

export type NuboxIssuanceClientAddress = {
  street: string
  city: string
  commune: string
}

export type NuboxIssuanceClient = {
  tradeName: string
  identification: NuboxIdentification
  mainActivity?: string
  address?: NuboxIssuanceClientAddress
}

export type NuboxIssuanceDocument = {
  type: { legalCode: string }
  paymentForm?: { legalCode: string }
  dueDate?: string
  client: NuboxIssuanceClient
  details: NuboxIssuanceDetail[]
  references?: Array<{
    type: { legalCode: string }
    number: string
    date: string
    reason?: string
  }>
}

export type NuboxIssuanceRequest = {
  documents: NuboxIssuanceDocument[]
}

export type NuboxIssuanceResultItem = {
  index: number
  status: number // HTTP status per document
  id?: number // nubox_document_id
  number?: string // folio
  trackId?: number
  emissionStatus?: NuboxEmissionStatus
  error?: string
}

export type NuboxIssuanceResponse = {
  results: NuboxIssuanceResultItem[]
}

// ─── Conformed (Internal) Types ─────────────────────────────────────────────

export type NuboxConformedSale = {
  nubox_sale_id: string
  folio: string | null
  dte_type_code: string | null
  dte_type_abbreviation: string | null
  dte_type_name: string | null
  net_amount: number | null
  exempt_amount: number | null
  tax_vat_amount: number | null
  total_amount: number | null
  other_taxes_amount: number | null
  withholding_amount: number | null
  balance: number | null
  emission_date: string | null
  due_date: string | null
  period_year: number | null
  period_month: number | null
  payment_form_code: string | null
  payment_form_name: string | null
  sii_track_id: string | null
  is_annulled: boolean
  emission_status_id: number | null
  emission_status_name: string | null
  origin_name: string | null
  client_rut: string | null
  client_trade_name: string | null
  client_main_activity: string | null
  // Links
  pdf_url: string | null
  xml_url: string | null
  details_url: string | null
  references_url: string | null

  // Identity resolution (populated during conformed sync)
  organization_id: string | null
  client_id: string | null
  income_id: string | null
  payload_hash: string | null
  sync_run_id: string
  synced_at: string
}

export type NuboxConformedPurchase = {
  nubox_purchase_id: string
  folio: string | null
  dte_type_code: string | null
  dte_type_abbreviation: string | null
  dte_type_name: string | null
  net_amount: number | null
  exempt_amount: number | null
  tax_vat_amount: number | null
  total_amount: number | null
  total_other_taxes_amount: number | null
  total_withholding_amount: number | null
  balance: number | null
  emission_date: string | null
  due_date: string | null
  period_year: number | null
  period_month: number | null
  document_status_id: number | null
  document_status_name: string | null
  purchase_type_code: string | null
  purchase_type_name: string | null
  is_annulled: boolean
  receipt_date: string | null
  vat_unrecoverable_amount: number | null
  vat_fixed_assets_amount: number | null
  vat_common_use_amount: number | null
  origin_name: string | null
  supplier_rut: string | null
  supplier_trade_name: string | null
  // Links
  pdf_url: string | null

  // Identity resolution
  supplier_id: string | null
  organization_id: string | null
  expense_id: string | null
  payload_hash: string | null
  sync_run_id: string
  synced_at: string
}

export type NuboxConformedBankMovement = {
  nubox_movement_id: string
  movement_direction: 'debit' | 'credit' // debit = expense (payment out), credit = income (collection in)
  nubox_folio: string | null
  movement_type_id: number | null
  movement_type_description: string | null
  bank_id: number | null
  bank_description: string | null
  payment_method_id: number | null
  payment_method_description: string | null
  counterpart_rut: string | null
  counterpart_trade_name: string | null
  total_amount: number | null
  payment_date: string | null
  period_year: number | null
  period_month: number | null
  linked_sale_id: string | null
  linked_purchase_id: string | null
  payload_hash: string | null
  sync_run_id: string
  synced_at: string
}

// ─── Raw Snapshot Row ───────────────────────────────────────────────────────

export type NuboxRawSnapshotRow = {
  sync_run_id: string
  source_system: 'nubox'
  source_object_type: 'sale' | 'purchase' | 'expense' | 'income'
  source_object_id: string
  source_created_at: string | null
  source_updated_at: string | null
  is_deleted: boolean
  payload_json: string // JSON.stringify of full Nubox response
  payload_hash: string
  ingested_at: string
  ingested_date: string // YYYY-MM-DD
}
