import 'server-only'

import type { PoolClient } from 'pg'

import { withTransaction } from '@/lib/db'

import { writePersonAddressAuditEntry, writePersonIdentityDocumentAuditEntry } from './audit'
import { PersonLegalProfileError } from './errors'
import type {
  AddressType,
  DocumentSnapshotUseCase,
  PersonDocumentType,
  PersonLegalSnapshot
} from './types'

/**
 * TASK-784 — Document snapshot reader server-only.
 *
 * Devuelve los valores plenos (`value_full`, `presentation_text`) UNICAMENTE
 * cuando el documento/direccion estan en `verification_status='verified'` y
 * el `useCase` matchea uno de los canonicos.
 *
 * Cada invocacion escribe un audit log con action='export_snapshot' que
 * referencia el useCase. Esto permite reconstruir QUE document/address salio
 * en QUE finiquito/recibo/contrato.
 *
 * NUNCA llamar este helper desde un route handler que sirve UI directo.
 * Solo desde generadores de documentos (final_settlement, payroll_receipt,
 * onboarding_contract).
 */

const VALID_USE_CASES: ReadonlyArray<DocumentSnapshotUseCase> = [
  'final_settlement',
  'payroll_receipt',
  'honorarios_closure',
  'onboarding_contract'
]

interface SnapshotDocumentRow {
  document_id: string
  profile_id: string
  document_type: string
  country_code: string
  value_full: string
  display_mask: string
  verification_status: string
  verified_at: Date | null
}

interface SnapshotAddressRow {
  address_id: string
  profile_id: string
  address_type: string
  country_code: string
  presentation_text: string
  presentation_mask: string
  verification_status: string
}

export interface SnapshotInput {
  profileId: string
  useCase: DocumentSnapshotUseCase
  documentType?: PersonDocumentType
  countryCode?: string
  addressType?: AddressType
  invokedByUserId?: string | null
  invokedByService?: string
}

const dateToIso = (value: Date | null): string | null => (value ? value.toISOString() : null)

const isValidUseCase = (value: unknown): value is DocumentSnapshotUseCase =>
  typeof value === 'string' && (VALID_USE_CASES as readonly string[]).includes(value)

export const readPersonLegalSnapshot = async (
  input: SnapshotInput,
  client?: PoolClient
): Promise<PersonLegalSnapshot> => {
  if (!isValidUseCase(input.useCase)) {
    throw new PersonLegalProfileError(
      `useCase invalido: ${String(input.useCase)}. Valores permitidos: ${VALID_USE_CASES.join(', ')}`,
      'invalid_input',
      400
    )
  }

  const run = async (c: PoolClient): Promise<PersonLegalSnapshot> => {
    let documentRow: SnapshotDocumentRow | null = null

    if (input.documentType && input.countryCode) {
      const docResult = await c.query<SnapshotDocumentRow>(
        `
          SELECT document_id, profile_id, document_type, country_code,
                 value_full, display_mask, verification_status, verified_at
          FROM greenhouse_core.person_identity_documents
          WHERE profile_id = $1
            AND document_type = $2
            AND country_code = $3
            AND verification_status = 'verified'
          ORDER BY verified_at DESC NULLS LAST
          LIMIT 1
        `,
        [input.profileId, input.documentType, input.countryCode.toUpperCase()]
      )

      documentRow = docResult.rows[0] ?? null
    } else if (input.documentType) {
      // sin country: best-effort single-country match
      const docResult = await c.query<SnapshotDocumentRow>(
        `
          SELECT document_id, profile_id, document_type, country_code,
                 value_full, display_mask, verification_status, verified_at
          FROM greenhouse_core.person_identity_documents
          WHERE profile_id = $1
            AND document_type = $2
            AND verification_status = 'verified'
          ORDER BY verified_at DESC NULLS LAST
          LIMIT 1
        `,
        [input.profileId, input.documentType]
      )

      documentRow = docResult.rows[0] ?? null
    } else {
      // Sin filtro especifico: buscar el documento "principal" verified mas reciente
      const docResult = await c.query<SnapshotDocumentRow>(
        `
          SELECT document_id, profile_id, document_type, country_code,
                 value_full, display_mask, verification_status, verified_at
          FROM greenhouse_core.person_identity_documents
          WHERE profile_id = $1
            AND verification_status = 'verified'
          ORDER BY
            CASE WHEN document_type = 'CL_RUT' THEN 0 ELSE 1 END,
            verified_at DESC NULLS LAST
          LIMIT 1
        `,
        [input.profileId]
      )

      documentRow = docResult.rows[0] ?? null
    }

    let addressRow: SnapshotAddressRow | null = null

    if (input.addressType) {
      const addrResult = await c.query<SnapshotAddressRow>(
        `
          SELECT address_id, profile_id, address_type, country_code,
                 presentation_text, presentation_mask, verification_status
          FROM greenhouse_core.person_addresses
          WHERE profile_id = $1
            AND address_type = $2
            AND verification_status = 'verified'
          ORDER BY verified_at DESC NULLS LAST
          LIMIT 1
        `,
        [input.profileId, input.addressType]
      )

      addressRow = addrResult.rows[0] ?? null
    } else {
      const addrResult = await c.query<SnapshotAddressRow>(
        `
          SELECT address_id, profile_id, address_type, country_code,
                 presentation_text, presentation_mask, verification_status
          FROM greenhouse_core.person_addresses
          WHERE profile_id = $1
            AND verification_status = 'verified'
          ORDER BY
            CASE address_type WHEN 'legal' THEN 0 WHEN 'residence' THEN 1 ELSE 2 END,
            verified_at DESC NULLS LAST
          LIMIT 1
        `,
        [input.profileId]
      )

      addressRow = addrResult.rows[0] ?? null
    }

    // Audit logs (only when something was actually returned)
    const auditDiff = {
      useCase: input.useCase,
      invokedByService: input.invokedByService ?? null,
      documentEmitted: Boolean(documentRow),
      addressEmitted: Boolean(addressRow)
    }

    if (documentRow) {
      await writePersonIdentityDocumentAuditEntry(c, {
        documentId: documentRow.document_id,
        profileId: documentRow.profile_id,
        action: 'export_snapshot',
        actorUserId: input.invokedByUserId ?? null,
        diff: auditDiff
      })
    }

    if (addressRow) {
      await writePersonAddressAuditEntry(c, {
        addressId: addressRow.address_id,
        profileId: addressRow.profile_id,
        action: 'export_snapshot',
        actorUserId: input.invokedByUserId ?? null,
        diff: auditDiff
      })
    }

    return {
      profileId: input.profileId,
      document: documentRow
        ? {
            documentType: documentRow.document_type as PersonDocumentType,
            countryCode: documentRow.country_code,
            valueFull: documentRow.value_full,
            displayMask: documentRow.display_mask,
            verificationStatus:
              documentRow.verification_status as PersonLegalSnapshot['document'] extends infer T
                ? T extends { verificationStatus: infer S } ? S : never
                : never,
            verifiedAt: dateToIso(documentRow.verified_at)
          }
        : null,
      address: addressRow
        ? {
            addressType: addressRow.address_type as AddressType,
            countryCode: addressRow.country_code,
            presentationText: addressRow.presentation_text,
            presentationMask: addressRow.presentation_mask,
            verificationStatus: addressRow.verification_status as 'verified'
          }
        : null
    }
  }

  if (client) return run(client)

  return withTransaction(run)
}

/**
 * Conveniencia: snapshot de finiquito para Chile dependent — busca CL_RUT +
 * direccion legal o residencial. Server-only.
 */
export const readFinalSettlementSnapshot = async (
  profileId: string,
  invokedByUserId?: string | null,
  client?: PoolClient
): Promise<PersonLegalSnapshot> =>
  readPersonLegalSnapshot(
    {
      profileId,
      useCase: 'final_settlement',
      documentType: 'CL_RUT',
      countryCode: 'CL',
      invokedByService: 'final_settlement_document_store',
      invokedByUserId: invokedByUserId ?? null
    },
    client
  )
