import 'server-only'

import type {
  CloudPostgresAccessProfile,
  CloudPostgresAccessProfilesPosture,
  CloudPostgresPosture,
  CloudSecretsPosture
} from '@/lib/cloud/contracts'
import { getGreenhousePostgresConfig, isGreenhousePostgresConfigured } from '@/lib/postgres/client'

const RECOMMENDED_SERVERLESS_POOL = 15
const POSTGRES_PROFILE_KEYS = ['runtime', 'migrator', 'admin'] as const

const toSourceLabel = (source: CloudPostgresAccessProfile['source']) => {
  switch (source) {
    case 'secret_manager':
      return 'Secret Manager'
    case 'env':
      return 'env var'
    default:
      return 'sin configurar'
  }
}

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

export const getCloudPostgresAccessProfilesPosture = (secrets: CloudSecretsPosture): CloudPostgresAccessProfilesPosture => {
  const profiles = POSTGRES_PROFILE_KEYS.map(profile => {
    const entry = secrets.entries.find(secret => secret.key === `postgres_${profile}_password`)

    if (!entry) {
      return {
        profile,
        configured: false,
        secretRefConfigured: false,
        source: 'unconfigured',
        envVarName:
          profile === 'runtime'
            ? 'GREENHOUSE_POSTGRES_PASSWORD'
            : profile === 'migrator'
              ? 'GREENHOUSE_POSTGRES_MIGRATOR_PASSWORD'
              : 'GREENHOUSE_POSTGRES_ADMIN_PASSWORD',
        secretRefEnvVarName:
          profile === 'runtime'
            ? 'GREENHOUSE_POSTGRES_PASSWORD_SECRET_REF'
            : profile === 'migrator'
              ? 'GREENHOUSE_POSTGRES_MIGRATOR_PASSWORD_SECRET_REF'
              : 'GREENHOUSE_POSTGRES_ADMIN_PASSWORD_SECRET_REF',
        summary: `Perfil ${profile} sin postura registrada`
      } satisfies CloudPostgresAccessProfile
    }

    return {
      profile,
      configured: entry.source !== 'unconfigured',
      secretRefConfigured: entry.secretRefConfigured,
      source: entry.source,
      envVarName: entry.envVarName,
      secretRefEnvVarName: entry.secretRefEnvVarName,
      summary:
        entry.source === 'unconfigured'
          ? `Perfil ${profile} sin configurar`
          : `Perfil ${profile} resuelto via ${toSourceLabel(entry.source)}`
    } satisfies CloudPostgresAccessProfile
  })

  const configuredProfiles = profiles.filter(profile => profile.configured).length
  const unconfiguredProfiles = profiles.filter(profile => !profile.configured).length

  const summaryParts = [
    configuredProfiles > 0 ? `${configuredProfiles}/${profiles.length} perfiles configurados` : null,
    unconfiguredProfiles > 0 ? `${unconfiguredProfiles} sin configurar` : null
  ].filter(Boolean)

  return {
    summary: summaryParts.length > 0 ? summaryParts.join(' · ') : 'Sin perfiles Postgres registrados',
    profiles
  }
}
