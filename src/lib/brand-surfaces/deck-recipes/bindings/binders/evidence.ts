/**
 * La verificación de una evidencia, compartida por todos los binders (TASK-1930). Una regla, un lugar:
 *
 * - En una `Proposal`, el `evidenceRef` es un `evidence_id` de su `proposal_evidence`. Una referencia que no existe
 *   aborta como en `assertEvidenceAllowedForAudience`: una evidencia inventada no «se omite», es un error.
 * - Ningún deck usa evidencia `internal`, ni siquiera uno interno (`internal-evidence`, error). Un deck de «La órbita»
 *   es material para mostrar hacia afuera y el binder no puede saber qué significa un número: la evidencia interna es
 *   donde vive el costo cargado y el margen, y así ninguno llega a una lámina (decisión del operador 2026-09-28).
 * - Una cifra propia necesita evidencia `measured`; un caso, un testimonio o un logo de tercero, `attested` con su
 *   documento de respaldo (`source_asset_id`). `illustrative` nunca liga un slot real.
 * - Fuera de una `Proposal`, una cifra puede venir del intent con un asset de respaldo verificado; la autorización de
 *   un tercero, no (la biblioteca canónica de autorizaciones es un follow-up).
 */

import type { DeckBindingSources, SlotBindingSource, SlotUnboundReason } from '../types'

export type EvidenceNeed = 'measured' | 'attested'

export interface BindingIssueDraft {
  code: 'binding-evidence-unknown' | 'binding-internal-evidence'
  detail: string
}

export type EvidenceCheck =
  | { ok: true; source: SlotBindingSource; evidenceRef: string; asOf: string; locator: string | null }
  | { ok: false; reason: SlotUnboundReason; issue?: BindingIssueDraft }

export const checkEvidence = (sources: DeckBindingSources, evidenceRef: string, need: EvidenceNeed): EvidenceCheck => {
  const ref = typeof evidenceRef === 'string' ? evidenceRef.trim() : ''

  if (!ref) return { ok: false, reason: need === 'attested' ? 'no-authorization' : 'no-evidence' }

  if (!sources.proposal) {
    // Sin `Proposal`: sólo cifras con un asset de respaldo verificado por el loader.
    if (need === 'attested') return { ok: false, reason: 'no-authorization' }

    const asset = sources.intentAssets[ref]

    if (!asset) {
      return {
        ok: false,
        reason: 'no-evidence',
        issue: { code: 'binding-evidence-unknown', detail: `El hecho cita «${ref}», que no es un asset de respaldo verificado: un dato sin respaldo no entra al deck.` }
      }
    }

    return { ok: true, source: 'intent', evidenceRef: ref, asOf: asset.asOf, locator: null }
  }

  const evidence = sources.proposal.evidence.find(entry => entry.evidenceId === ref)

  if (!evidence) {
    return {
      ok: false,
      reason: need === 'attested' ? 'no-authorization' : 'no-evidence',
      issue: {
        code: 'binding-evidence-unknown',
        detail: `La evidencia «${ref}» no es de esta propuesta: un hecho con evidencia inventada rechaza el deck (fail-closed).`
      }
    }
  }

  if (evidence.audience !== 'client_facing') {
    return {
      ok: false,
      reason: 'internal-evidence',
      issue: {
        code: 'binding-internal-evidence',
        detail: `La evidencia «${ref}» es interna: un deck nunca usa evidencia interna, ni siquiera uno interno, y con una sola no compone.`
      }
    }
  }

  if (need === 'measured' && evidence.classification !== 'measured') return { ok: false, reason: 'no-evidence' }

  if (need === 'attested' && (evidence.classification !== 'attested' || !evidence.sourceAssetId)) {
    return { ok: false, reason: 'no-authorization' }
  }

  return { ok: true, source: 'proposal-evidence', evidenceRef: ref, asOf: evidence.asOf, locator: evidence.locator }
}

/** La fecha más antigua: un slot con varias evidencias vale desde la más vieja. */
export const oldestAsOf = (dates: string[]): string | undefined =>
  dates.length === 0 ? undefined : [...dates].sort((a, b) => Date.parse(a) - Date.parse(b))[0]
