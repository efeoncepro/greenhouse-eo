import 'server-only'

import { Text, View, StyleSheet } from '@react-pdf/renderer'

import {
  EFEONCE_LEGAL_ADDRESS_FALLBACK,
  EFEONCE_LEGAL_NAME_FALLBACK,
  EFEONCE_URL
} from '@/config/efeonce-brand'

/**
 * Canonical, reusable Efeonce PDF footer.
 *
 * The footer carries the LEGAL / CONTACT identity block — the same on every
 * Efeonce document. Do NOT put the marketing slogan here (that's a brand-zone
 * element, see efeonce-slogan-pdf.tsx); the footer is the institutional block:
 *   line 1: legal entity (legalName · RUT) + legal address
 *   line 2: efeoncepro.com (center) + optional "Generado: <ts>" / page marker
 *
 * Prefer passing the runtime operating entity (greenhouse_core.organizations,
 * is_operating_entity = TRUE; legalName + taxId + legalAddress). Falls back to
 * the canonical brand constants when no operating-entity context is available.
 *
 * Usage in a react-pdf <Page>:
 *   <EfeoncePdfFooter operatingEntity={operatingEntity} generatedAt={generatedAt} fixed />
 * `fixed` pins it to the bottom of every page (react-pdf `fixed` prop).
 */

const TEXT_MUTED = '#6b7280'
const TEXT_FAINT = '#9ca3af'
const BORDER = '#e5e7eb'

const s = StyleSheet.create({
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 36,
    right: 36,
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: BORDER,
    flexDirection: 'column',
    rowGap: 1
  },
  line1: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  entity: { fontSize: 6.5, color: TEXT_MUTED, fontFamily: 'Helvetica-Bold' },
  address: { fontSize: 6.5, color: TEXT_FAINT, fontFamily: 'Helvetica', textAlign: 'right' },
  line2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 1
  },
  url: { fontSize: 6.5, color: TEXT_MUTED, fontFamily: 'Helvetica-Bold' },
  meta: { fontSize: 6, color: TEXT_FAINT, fontFamily: 'Helvetica' }
})

export interface EfeoncePdfFooterOperatingEntity {
  legalName?: string | null
  taxId?: string | null
  legalAddress?: string | null
}

export interface EfeoncePdfFooterProps {
  operatingEntity?: EfeoncePdfFooterOperatingEntity | null
  /** Optional right-side meta on line 2 (e.g. "Generado: 31/05/2026 18:40"). */
  generatedAt?: string | null
  /** Pin to the bottom of every page (react-pdf `fixed`). */
  fixed?: boolean
}

export const EfeoncePdfFooter = ({ operatingEntity, generatedAt, fixed }: EfeoncePdfFooterProps) => {
  const legalName = operatingEntity?.legalName?.trim() || EFEONCE_LEGAL_NAME_FALLBACK
  const taxId = operatingEntity?.taxId?.trim() || null
  const address = operatingEntity?.legalAddress?.trim() || EFEONCE_LEGAL_ADDRESS_FALLBACK
  const entityLine = taxId ? `${legalName} · RUT ${taxId}` : legalName

  return (
    <View style={s.footer} fixed={fixed}>
      <View style={s.line1}>
        <Text style={s.entity}>{entityLine}</Text>
        <Text style={s.address}>{address}</Text>
      </View>
      <View style={s.line2}>
        <Text style={s.url}>{EFEONCE_URL}</Text>
        {generatedAt ? <Text style={s.meta}>{`Generado: ${generatedAt}`}</Text> : <Text style={s.meta} />}
      </View>
    </View>
  )
}

export default EfeoncePdfFooter
