import 'server-only'

import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { AccountSpacesFacet, AccountSpaceEntry, AccountScope, AccountFacetContext } from '@/types/account-complete-360'

type SpaceRow = {
  space_id: string
  public_id: string
  space_name: string
  space_type: string
  client_id: string | null
  client_name: string | null
  status: string
  active_module_count: string | number
}

const toNum = (v: unknown): number => {
  if (typeof v === 'number') return v

  if (typeof v === 'string') { const n = Number(v);

 

return Number.isFinite(n) ? n : 0 }
  
return 0
}

export const fetchSpacesFacet = async (
  scope: AccountScope,
  ctx: AccountFacetContext
): Promise<AccountSpacesFacet | null> => {
  void ctx
  if (scope.spaceIds.length === 0) return []

  const rows = await runGreenhousePostgresQuery<SpaceRow>(
    `SELECT
      s.space_id,
      s.public_id,
      s.space_name,
      s.space_type,
      s.client_id,
      c.client_name,
      s.status,
      COALESCE(csm.cnt, 0) AS active_module_count
    FROM greenhouse_core.spaces s
    LEFT JOIN greenhouse_core.clients c
      ON c.client_id = s.client_id
    LEFT JOIN (
      SELECT client_id, COUNT(*) AS cnt
      FROM greenhouse_core.client_service_modules
      WHERE status = 'active'
      GROUP BY client_id
    ) csm ON csm.client_id = s.client_id
    WHERE s.space_id = ANY($1)
    ORDER BY s.space_name ASC`,
    [scope.spaceIds]
  )

  return rows.map((row): AccountSpaceEntry => ({
    spaceId: row.space_id,
    publicId: row.public_id,
    spaceName: row.space_name,
    spaceType: row.space_type,
    clientId: row.client_id,
    clientName: row.client_name,
    status: row.status,
    activeModuleCount: toNum(row.active_module_count)
  }))
}
