export const EXPENSE_SOURCE_TYPES = [
  'manual',
  'payroll_generated',
  'bank_statement_detected',
  'reconciliation_suggested',
  'gateway_sync',
  'system_adjustment'
] as const

export type ExpenseSourceType = (typeof EXPENSE_SOURCE_TYPES)[number]

export const PAYMENT_PROVIDERS = [
  'bank',
  'previred',
  'stripe',
  'webpay',
  'paypal',
  'mercadopago',
  'wise',
  'other'
] as const

export type ExpensePaymentProvider = (typeof PAYMENT_PROVIDERS)[number]

export const PAYMENT_RAILS = [
  'bank_transfer',
  'card',
  'gateway',
  'wallet',
  'cash',
  'check',
  'payroll_file',
  'previred',
  'other'
] as const

export type ExpensePaymentRail = (typeof PAYMENT_RAILS)[number]

export const EXPENSE_DRAWER_TABS = ['operational', 'tooling', 'tax', 'other'] as const

export type ExpenseDrawerTab = (typeof EXPENSE_DRAWER_TABS)[number]

export type ExpenseDrawerCategory = {
  value: string
  label: string
  expenseType: string
  costCategory: 'operational' | 'infrastructure' | 'tax_social'
  directOverheadKind?: 'tool_license' | 'tool_usage' | 'equipment' | 'reimbursement' | 'other'
}

export const EXPENSE_DRAWER_CATEGORIES: Record<ExpenseDrawerTab, ExpenseDrawerCategory[]> = {
  operational: [
    { value: 'professional_services', label: 'Servicios profesionales', expenseType: 'supplier', costCategory: 'operational' },
    { value: 'external_production', label: 'Produccion externa', expenseType: 'supplier', costCategory: 'operational' },
    { value: 'office_space', label: 'Oficina y espacio', expenseType: 'supplier', costCategory: 'operational' },
    { value: 'equipment', label: 'Equipamiento', expenseType: 'supplier', costCategory: 'operational', directOverheadKind: 'equipment' },
    { value: 'media_advertising', label: 'Media y pauta', expenseType: 'supplier', costCategory: 'operational' },
    { value: 'own_marketing', label: 'Marketing propio', expenseType: 'supplier', costCategory: 'operational' },
    { value: 'travel_representation', label: 'Viajes y representacion', expenseType: 'supplier', costCategory: 'operational' },
    { value: 'insurance', label: 'Seguros', expenseType: 'supplier', costCategory: 'operational' }
  ],
  tooling: [
    { value: 'saas_license', label: 'Licencia SaaS', expenseType: 'supplier', costCategory: 'infrastructure', directOverheadKind: 'tool_license' },
    { value: 'cloud_hosting', label: 'Cloud y hosting', expenseType: 'supplier', costCategory: 'infrastructure', directOverheadKind: 'tool_usage' },
    { value: 'hardware_peripherals', label: 'Hardware y perifericos', expenseType: 'supplier', costCategory: 'infrastructure', directOverheadKind: 'equipment' }
  ],
  tax: [
    { value: 'iva_mensual', label: 'IVA mensual', expenseType: 'tax', costCategory: 'tax_social' },
    { value: 'ppm', label: 'PPM', expenseType: 'tax', costCategory: 'tax_social' },
    { value: 'renta_anual', label: 'Renta anual', expenseType: 'tax', costCategory: 'tax_social' },
    { value: 'patente_municipal', label: 'Patente municipal', expenseType: 'tax', costCategory: 'tax_social' },
    { value: 'retencion_honorarios', label: 'Retencion honorarios', expenseType: 'tax', costCategory: 'tax_social' },
    { value: 'contribuciones', label: 'Contribuciones', expenseType: 'tax', costCategory: 'tax_social' }
  ],
  other: [
    { value: 'bank_fee', label: 'Comision bancaria', expenseType: 'bank_fee', costCategory: 'operational' },
    { value: 'gateway_fee', label: 'Fee de gateway', expenseType: 'gateway_fee', costCategory: 'operational' },
    { value: 'financial_cost', label: 'Costo financiero', expenseType: 'financial_cost', costCategory: 'operational' },
    { value: 'fine_surcharge', label: 'Multa o recargo', expenseType: 'financial_cost', costCategory: 'tax_social' },
    { value: 'uncategorized', label: 'Sin categoria', expenseType: 'miscellaneous', costCategory: 'operational' }
  ]
}

export const EXPENSE_DRAWER_TAB_LABELS: Record<ExpenseDrawerTab, string> = {
  operational: 'Operacional',
  tooling: 'Tooling',
  tax: 'Impuesto',
  other: 'Otro'
}

export const RECURRENCE_FREQUENCIES = ['monthly', 'quarterly', 'annual'] as const

export type RecurrenceFrequency = (typeof RECURRENCE_FREQUENCIES)[number]
