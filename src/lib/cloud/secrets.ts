import 'server-only'

import type { CloudSecretPostureEntry, CloudSecretsPosture } from '@/lib/cloud/contracts'
import { getSecretSource } from '@/lib/secrets/secret-manager'

const TRACKED_SECRET_ENTRIES = [
  {
    key: 'postgres_runtime_password',
    envVarName: 'GREENHOUSE_POSTGRES_PASSWORD',
    classification: 'runtime'
  },
  {
    key: 'postgres_migrator_password',
    envVarName: 'GREENHOUSE_POSTGRES_MIGRATOR_PASSWORD',
    classification: 'tooling'
  },
  {
    key: 'postgres_admin_password',
    envVarName: 'GREENHOUSE_POSTGRES_ADMIN_PASSWORD',
    classification: 'tooling'
  },
  {
    key: 'nextauth_secret',
    envVarName: 'NEXTAUTH_SECRET',
    classification: 'runtime'
  },
  {
    key: 'azure_ad_client_secret',
    envVarName: 'AZURE_AD_CLIENT_SECRET',
    classification: 'runtime'
  },
  {
    key: 'nubox_bearer_token',
    envVarName: 'NUBOX_BEARER_TOKEN',
    classification: 'runtime'
  },
  {
    key: 'slack_alerts_webhook',
    envVarName: 'SLACK_ALERTS_WEBHOOK_URL',
    classification: 'runtime'
  },
  {
    key: 'pii_normalization_pepper',
    envVarName: 'GREENHOUSE_PII_NORMALIZATION_PEPPER',
    classification: 'runtime'
  }
] as const

const buildSecretsSummary = (entries: CloudSecretPostureEntry[]) => {
  const sourceCounts = entries.reduce<Record<CloudSecretPostureEntry['source'], number>>(
    (counts, entry) => {
      counts[entry.source] += 1

      return counts
    },
    {
      secret_manager: 0,
      env: 0,
      unconfigured: 0
    }
  )

  const summaryParts = [
    sourceCounts.secret_manager > 0 ? `${sourceCounts.secret_manager} via Secret Manager` : null,
    sourceCounts.env > 0 ? `${sourceCounts.env} via env var` : null,
    sourceCounts.unconfigured > 0 ? `${sourceCounts.unconfigured} sin configurar` : null
  ].filter(Boolean)

  return summaryParts.length > 0 ? summaryParts.join(' · ') : 'Sin secretos registrados'
}

export const getCloudSecretsPosture = async (): Promise<CloudSecretsPosture> => {
  const entries = await Promise.all(
    TRACKED_SECRET_ENTRIES.map(async entry => {
      const source = await getSecretSource({
        envVarName: entry.envVarName
      })

      return {
        key: entry.key,
        envVarName: entry.envVarName,
        secretRefEnvVarName: source.secretRefEnvVarName,
        secretRefConfigured: Boolean(source.secretRef),
        source: source.source,
        classification: entry.classification
      } satisfies CloudSecretPostureEntry
    })
  )

  const runtimeEntries = entries.filter(entry => entry.classification === 'runtime')
  const toolingEntries = entries.filter(entry => entry.classification === 'tooling')

  return {
    summary: buildSecretsSummary(entries),
    runtimeSummary: buildSecretsSummary(runtimeEntries),
    toolingSummary: buildSecretsSummary(toolingEntries),
    entries
  }
}
