import 'server-only'

/**
 * TASK-1412 — historial de VERSIONES de artefactos por kind.
 *
 * La versión es DERIVADA (MAX+1 en el attach, índice único (proposal, kind, version)): este reader
 * expone esa historia como contrato para cualquier consumer (UI, Nexa, MCP). Regla no-leak del
 * dominio: NUNCA una URL de storage (`gs://`) en el shape — la descarga va por el endpoint gobernado.
 */

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { getAssetById } from '@/lib/storage/greenhouse-assets'

import type { ProposalAssetKind, ProposalAudience } from './types'

export interface ProposalArtifactVersion {
  proposalAssetId: string
  version: number
  status: 'draft' | 'in_review' | 'final'
  audience: ProposalAudience
  assetId: string
  fileName: string | null
  mimeType: string | null
  sizeBytes: number | null
  createdAt: string
  createdByMemberId: string | null
}

export interface ProposalArtifactKindHistory {
  kind: ProposalAssetKind
  current: ProposalArtifactVersion
  history: ProposalArtifactVersion[]
}

export const readProposalArtifactVersions = async (input: {
  ownerOrgId: string
  proposalId: string
}): Promise<{ kinds: ProposalArtifactKindHistory[] }> => {
  const rows = await runGreenhousePostgresQuery<{
    proposal_asset_id: string
    kind: ProposalAssetKind
    version: number
    status: 'draft' | 'in_review' | 'final'
    audience: ProposalAudience
    asset_id: string
    created_at: string
    created_by_member_id: string | null
  }>(
    `SELECT proposal_asset_id, kind, version, status, audience, asset_id,
            created_at::text AS created_at, created_by_member_id
       FROM greenhouse_commercial.proposal_assets
      WHERE owner_org_id = $1 AND proposal_id = $2
      ORDER BY kind ASC, version DESC`,
    [input.ownerOrgId, input.proposalId]
  )

  // Enriquecimiento vía el helper canónico del store (volúmenes chicos por proposal); el shape del
  // asset NUNCA expone la ubicación física.
  const byKind = new Map<ProposalAssetKind, ProposalArtifactVersion[]>()

  for (const row of rows) {
    const asset = await getAssetById(row.asset_id)

    const version: ProposalArtifactVersion = {
      proposalAssetId: row.proposal_asset_id,
      version: row.version,
      status: row.status,
      audience: row.audience,
      assetId: row.asset_id,
      fileName: asset?.filename ?? null,
      mimeType: asset?.mimeType ?? null,
      sizeBytes: asset?.sizeBytes ?? null,
      createdAt: row.created_at,
      createdByMemberId: row.created_by_member_id
    }

    const list = byKind.get(row.kind) ?? []

    list.push(version)
    byKind.set(row.kind, list)
  }

  return {
    kinds: [...byKind.entries()].map(([kind, history]) => ({
      kind,
      current: history[0]!,
      history
    }))
  }
}
