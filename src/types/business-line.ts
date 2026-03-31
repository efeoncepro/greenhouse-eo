/**
 * Rich metadata for a business line (canonical identity via service_modules.module_code).
 * Source of truth: greenhouse_core.business_line_metadata table.
 */
export type BusinessLineMetadata = {
  moduleCode: string
  label: string
  labelFull: string | null
  claim: string | null
  loopPhase: string | null
  loopPhaseLabel: string | null
  leadIdentityProfileId: string | null
  leadName: string | null
  colorHex: string
  colorBg: string | null
  iconName: string | null
  hubspotEnumValue: string
  notionLabel: string | null
  isActive: boolean
  sortOrder: number
  description: string | null
}

/** Lightweight subset for session / TenantContext enrichment (no server round-trip). */
export type BusinessLineMetadataSummary = Pick<
  BusinessLineMetadata,
  'moduleCode' | 'label' | 'colorHex' | 'loopPhase'
>
