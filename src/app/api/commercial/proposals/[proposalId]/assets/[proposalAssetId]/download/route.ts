import { NextResponse } from 'next/server'

import { assertProposalStudioAccess } from '@/lib/commercial/tenders/proposals/authz'
import { proposalErrorResponse } from '@/lib/commercial/tenders/proposals/http'
import { ProposalInputError } from '@/lib/commercial/tenders/proposals/errors'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import { downloadPrivateAsset } from '@/lib/storage/greenhouse-assets'
import { requireTenantContext } from '@/lib/tenant/authorization'

export const dynamic = 'force-dynamic'

/**
 * GET /api/commercial/proposals/[proposalId]/assets/[proposalAssetId]/download?ownerOrgId=…
 *
 * TASK-1412 — descarga GOBERNADA de un artefacto de la proposal: authz del dominio (gate único +
 * capability read) + pertenencia del asset a ESTA proposal + gate de audience (un `internal` —
 * diagnóstico, squad blueprint: loaded cost/piso — JAMÁS cruza a un principal de portal cliente).
 * El binario se streamea vía el helper canónico del store: cero URLs de storage expuestas.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ proposalId: string; proposalAssetId: string }> }
) {
  const { tenant, unauthorizedResponse } = await requireTenantContext()

  if (!tenant) return unauthorizedResponse

  try {
    const { proposalId, proposalAssetId } = await params
    const ownerOrgId = new URL(request.url).searchParams.get('ownerOrgId')

    if (!ownerOrgId) {
      throw new ProposalInputError('ownerOrgId es obligatorio.')
    }

    await assertProposalStudioAccess({ tenant, ownerOrgId, need: 'read' })

    const link = await runGreenhousePostgresQuery<{ asset_id: string; audience: string }>(
      `SELECT asset_id, audience FROM greenhouse_commercial.proposal_assets
        WHERE owner_org_id = $1 AND proposal_id = $2 AND proposal_asset_id = $3`,
      [ownerOrgId, proposalId, proposalAssetId]
    )

    if (!link[0]) {
      return NextResponse.json(
        { error: 'El artefacto no existe en esta propuesta.', code: 'proposal_asset_not_found', actionable: false },
        { status: 404 }
      )
    }

    if (link[0].audience === 'internal' && tenant.tenantType === 'client') {
      return NextResponse.json(
        { error: 'Este documento es de uso interno de Efeonce.', code: 'proposal_asset_internal', actionable: false },
        { status: 403 }
      )
    }

    const downloaded = await downloadPrivateAsset({
      assetId: link[0].asset_id,
      actorUserId: tenant.userId
    })

    return new NextResponse(new Uint8Array(downloaded.file.arrayBuffer), {
      headers: {
        'Content-Type': downloaded.asset.mimeType,
        'Content-Disposition': `attachment; filename="${downloaded.asset.filename}"`,
        'Cache-Control': 'private, no-store'
      }
    })
  } catch (error) {
    return proposalErrorResponse(error)
  }
}
