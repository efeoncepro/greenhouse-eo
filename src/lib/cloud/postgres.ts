import 'server-only'

import type { CloudPostgresPosture } from '@/lib/cloud/contracts'
import { getGreenhousePostgresConfig, isGreenhousePostgresConfigured } from '@/lib/postgres/client'

const RECOMMENDED_SERVERLESS_POOL = 15

export const getCloudPostgresPosture = (): CloudPostgresPosture => {
  const configured = isGreenhousePostgresConfigured()
  const config = getGreenhousePostgresConfig()
  const usesConnector = Boolean(config.instanceConnectionName)
  const sslEnabled = usesConnector || config.sslEnabled
  const meetsRecommendedPool = config.maxConnections >= RECOMMENDED_SERVERLESS_POOL
  const risks: string[] = []

  if (!configured) risks.push('Postgres runtime no configurado')
  if (!usesConnector) risks.push('Cloud SQL Connector no activo')
  if (!sslEnabled) risks.push('SSL no activo para conexión directa')
  if (!meetsRecommendedPool) risks.push(`Pool bajo el baseline serverless (${config.maxConnections}/${RECOMMENDED_SERVERLESS_POOL})`)

  return {
    configured,
    usesConnector,
    sslEnabled,
    maxConnections: config.maxConnections,
    meetsRecommendedPool,
    summary: !configured ? 'Postgres runtime no configurado' : risks.length === 0 ? 'Postgres runtime alineado con el baseline Cloud' : risks.join(' · '),
    risks
  }
}
