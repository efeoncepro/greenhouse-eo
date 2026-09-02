import type { GcpCostDriver } from '@/types/billing-export'

/**
 * Stable incident identity for cooldown/dedup.
 *
 * Costs, percentages and export dates change on every billing refresh; including
 * them makes one continuing incident look new every six hours. A new driver or a
 * severity transition still creates a new incident and can notify immediately.
 */
export const buildCloudCostAlertIncident = ({
  severity,
  drivers
}: {
  severity: 'warning' | 'error'
  drivers: GcpCostDriver[]
}) => ({
  version: 'cloud-cost-alert-incident-v2',
  severity,
  drivers: drivers
    .map(driver => ({
      driverId: driver.driverId,
      severity: driver.severity
    }))
    .sort((a, b) => a.driverId.localeCompare(b.driverId))
})
