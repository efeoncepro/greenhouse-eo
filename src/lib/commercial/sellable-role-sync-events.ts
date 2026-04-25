import type { PoolClient } from 'pg'

import {
  publishSellableRoleCreated,
  publishSellableRoleDeactivated,
  publishSellableRoleReactivated,
  publishSellableRoleUpdated
} from '@/lib/commercial/sellable-role-events'

export interface SellableRoleProjectionEventRow extends Record<string, unknown> {
  role_id: string
  role_sku: string
  role_code: string
  role_label_es: string
  category: string
  tier: string
  active: boolean
  updated_at: string | Date
}

export const getSellableRoleProjectionEventRow = async (
  client: PoolClient,
  roleId: string
): Promise<SellableRoleProjectionEventRow | null> => {
  const result = await client.query<SellableRoleProjectionEventRow>(
    `SELECT role_id, role_sku, role_code, role_label_es, category, tier, active, updated_at
       FROM greenhouse_commercial.sellable_roles
      WHERE role_id = $1
      LIMIT 1`,
    [roleId]
  )

  return result.rows[0] ?? null
}

const toTimestamp = (value: string | Date) => (value instanceof Date ? value.toISOString() : value)

export const publishSellableRoleProjectionEvent = async (
  event: 'created' | 'updated' | 'deactivated' | 'reactivated',
  role: SellableRoleProjectionEventRow,
  client?: PoolClient
) => {
  switch (event) {
    case 'created':
      return publishSellableRoleCreated(
        {
          roleId: role.role_id,
          roleSku: role.role_sku,
          roleCode: role.role_code,
          roleLabelEs: role.role_label_es,
          category: role.category,
          tier: role.tier
        },
        client
      )
    case 'updated':
      return publishSellableRoleUpdated(
        {
          roleId: role.role_id,
          roleSku: role.role_sku,
          roleCode: role.role_code,
          roleLabelEs: role.role_label_es,
          category: role.category,
          tier: role.tier,
          active: role.active
        },
        client
      )
    case 'deactivated':
      return publishSellableRoleDeactivated(
        {
          roleId: role.role_id,
          roleSku: role.role_sku,
          deactivatedAt: toTimestamp(role.updated_at)
        },
        client
      )
    case 'reactivated':
      return publishSellableRoleReactivated(
        {
          roleId: role.role_id,
          roleSku: role.role_sku,
          reactivatedAt: toTimestamp(role.updated_at)
        },
        client
      )
  }
}
