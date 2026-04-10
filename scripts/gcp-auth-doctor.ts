import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { getGoogleCredentialDiagnostics } from '@/lib/google-credentials'

import { DEFAULT_ENV_FILES, loadGreenhouseToolEnv, parseEnvFile } from './lib/load-greenhouse-tool-env'

type EnvFileReport = {
  file: string
  exists: boolean
  hasPersistedVercelOidcToken: boolean
}

const readEnvFileReport = (envFile: string): EnvFileReport => {
  const resolvedPath = path.resolve(process.cwd(), envFile)

  if (!existsSync(resolvedPath)) {
    return {
      file: envFile,
      exists: false,
      hasPersistedVercelOidcToken: false
    }
  }

  const entries = parseEnvFile(readFileSync(resolvedPath, 'utf8'))

  return {
    file: envFile,
    exists: true,
    hasPersistedVercelOidcToken: Boolean(entries.VERCEL_OIDC_TOKEN?.trim())
  }
}

loadGreenhouseToolEnv()

const envFiles = DEFAULT_ENV_FILES.map(readEnvFileReport)
const issues: string[] = []
let diagnostics: ReturnType<typeof getGoogleCredentialDiagnostics> | null = null
let diagnosticsError: string | null = null

try {
  diagnostics = getGoogleCredentialDiagnostics()
} catch (error) {
  diagnosticsError = error instanceof Error ? error.message : String(error)
}

if (envFiles.some(file => file.hasPersistedVercelOidcToken)) {
  const files = envFiles
    .filter(file => file.hasPersistedVercelOidcToken)
    .map(file => file.file)
    .join(', ')

  issues.push(`Persisted Vercel OIDC token detected in local env files: ${files}`)
}

if (diagnostics?.hasPersistedLocalVercelOidcToken) {
  issues.push('process.env contains a persisted VERCEL_OIDC_TOKEN outside a real Vercel runtime')
}

if (diagnostics && diagnostics.source === 'wif' && !diagnostics.isVercelRuntime && !diagnostics.hasInjectedVercelOidcToken) {
  issues.push('Workload Identity resolved outside a real Vercel runtime without an injected test token')
}

if (diagnosticsError) {
  issues.push(`Unable to resolve Google credential diagnostics: ${diagnosticsError}`)
}

const report = {
  ok: issues.length === 0,
  diagnostics,
  diagnosticsError,
  envFiles,
  issues
}

console.log(JSON.stringify(report, null, 2))

if (issues.length > 0) {
  process.exitCode = 1
}
