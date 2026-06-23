import 'server-only'

import { createHash } from 'node:crypto'

import { resolveSecretByRef } from '@/lib/secrets/secret-manager'

import { signPublicSiteBridgeRequest } from '../bridge-signing'

import {
  COMPARISON_TABLE_SCHEMA_VERSION,
  type ComparisonTableManifest,
} from './manifest-schema'
import {
  validateComparisonTableManifest,
  type ComparisonTableManifestIssue,
} from './validate-manifest'

/**
 * Governed authoring command for the `greenhouse_comparison_table` widget
 * (TASK-1225). It is the propose/execute primitive shared by every consumer
 * (admin API today; Nexa/MCP later) — Full API Parity: one validator + one
 * signed-request builder, never per-consumer logic.
 *
 * INVARIANTS:
 * - validate-before-write: an invalid manifest throws BEFORE any signing/fetch.
 * - draft-only: the bridge route authors a draft/private page, never publish.
 * - the LLM never mutates directly: `mode: 'execute'` is gated behind
 *   `PUBLIC_SITE_COMPARISON_TABLE_WRITES_ENABLED` (default OFF) + a resolved
 *   shared secret; the governed loop is propose (dry_run) → human confirm →
 *   execute. Default mode is `dry_run` (no network, synthetic secret).
 */

const BRIDGE_BASE_PATH = '/wp-json/greenhouse-wp-bridge/v1'

export const COMPARISON_TABLE_BRIDGE_ROUTE = `${BRIDGE_BASE_PATH}/drafts/comparison-table`
export const COMPARISON_TABLE_BRIDGE_CONTRACT_VERSION =
  'greenhouse-wp-bridge-comparison-table.v1' as const

const SYNTHETIC_DRY_RUN_SECRET = 'comparison-table-author-dry-run-secret'
const SHARED_SECRET_ENV_REF = 'PUBLIC_WEBSITE_WORDPRESS_BRIDGE_SHARED_SECRET_SECRET_REF'
const WRITES_FLAG_ENV = 'PUBLIC_SITE_COMPARISON_TABLE_WRITES_ENABLED'
const DEFAULT_BASE_URL = 'https://efeoncepro.com'

export type AuthorComparisonTableMode = 'dry_run' | 'execute'

export type AuthorComparisonTableInput = {
  /** WordPress page id whose Elementor draft will host the widget. */
  pageId: string
  /** Raw manifest — validated inside (reject-before-write). */
  manifest: unknown
  /** Actor identity for the signed request + audit (e.g. the user id). */
  actor: string
  /** Bridge environment header. */
  environment: 'staging' | 'production'
  /** dry_run (default, no network) | execute (gated by flag + secret). */
  mode?: AuthorComparisonTableMode
  /** When set, the bridge updates this existing widget node instead of inserting. */
  widgetElementId?: string
  /** Override base URL (tests/staging). */
  baseUrl?: string
}

export type AuthorComparisonTablePlan = {
  contractVersion: typeof COMPARISON_TABLE_BRIDGE_CONTRACT_VERSION
  schemaVersion: typeof COMPARISON_TABLE_SCHEMA_VERSION
  greenhouseManifestId: string
  contentHash: string
  mode: AuthorComparisonTableMode
  sendsWordPressWrite: boolean
  method: 'POST'
  route: string
  redactedHeaders: Record<string, string>
  canonicalRequestPreview: string
  rolloutPreconditions: string[]
  rollback: { kind: string; detail: string }
  /** Populated only when an execute actually hit the bridge. */
  result?: { status: number; ok: boolean }
}

export const COMPARISON_TABLE_AUTHOR_ERROR_CODES = [
  'comparison_table_manifest_invalid',
  'comparison_table_writes_disabled',
  'comparison_table_shared_secret_missing',
  'comparison_table_bridge_failed',
] as const

export type ComparisonTableAuthorErrorCode =
  (typeof COMPARISON_TABLE_AUTHOR_ERROR_CODES)[number]

export class ComparisonTableAuthorError extends Error {
  readonly code: ComparisonTableAuthorErrorCode
  readonly issues?: ComparisonTableManifestIssue[]
  readonly statusCode: number

  constructor(
    code: ComparisonTableAuthorErrorCode,
    message: string,
    options: { issues?: ComparisonTableManifestIssue[]; statusCode?: number } = {}
  ) {
    super(message)
    this.name = 'ComparisonTableAuthorError'
    this.code = code
    this.issues = options.issues
    this.statusCode = options.statusCode ?? 422
  }
}

const sanitizeManifestId = (pageId: string) =>
  `public-site.comparison-table.page-${pageId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'unknown'}`

const hashManifest = (manifest: ComparisonTableManifest) =>
  createHash('sha256').update(JSON.stringify(manifest), 'utf8').digest('hex')

const redactHeaders = (headers: Record<string, string>): Record<string, string> =>
  Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [
      key,
      key.toLowerCase().includes('signature') ? `${value.slice(0, 18)}…redacted` : value,
    ])
  )

const writesEnabled = () => {
  const raw = (process.env[WRITES_FLAG_ENV] ?? '').trim().toLowerCase()

  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on'
}

/**
 * Validate → build signed bridge request → (dry_run) return plan | (execute)
 * POST to the bridge. Never writes on `dry_run`. `execute` is gated.
 */
export async function authorComparisonTable(
  input: AuthorComparisonTableInput
): Promise<AuthorComparisonTablePlan> {
  const mode: AuthorComparisonTableMode = input.mode ?? 'dry_run'

  // 1. Reject-before-write.
  const validation = validateComparisonTableManifest(input.manifest)

  if (!validation.ok) {
    throw new ComparisonTableAuthorError(
      'comparison_table_manifest_invalid',
      'El manifest comparisonTable.v1 no es válido.',
      { issues: validation.issues, statusCode: 422 }
    )
  }

  const manifest = validation.manifest
  const greenhouseManifestId = sanitizeManifestId(input.pageId)
  const contentHash = hashManifest(manifest)

  // 2. Build the bridge body (semantic manifest; the WP handler maps it to the
  //    widget's Elementor settings + builds the node).
  const body = {
    contractVersion: COMPARISON_TABLE_BRIDGE_CONTRACT_VERSION,
    schemaVersion: COMPARISON_TABLE_SCHEMA_VERSION,
    greenhouseManifestId,
    contentHash,
    pageId: input.pageId,
    widgetElementId: input.widgetElementId ?? null,
    manifest,
  }

  const bodyJson = JSON.stringify(body)

  const rolloutPreconditions = [
    `Set ${WRITES_FLAG_ENV}=true on the target environment.`,
    `Provision the bridge shared secret (${SHARED_SECRET_ENV_REF}) + enable bridge writes (GREENHOUSE_WP_BRIDGE_WRITES_ENABLED) in WordPress.`,
    'Author into a draft/private page first; publish stays a human step.',
  ]

  const rollback = {
    kind: 'restore_elementor_data',
    detail: `Restore the _elementor_data backup of page ${input.pageId}; flag off ${WRITES_FLAG_ENV}.`,
  }

  // 3. Sign. dry_run uses a synthetic secret (no real secret touched, no network).
  if (mode === 'dry_run') {
    const signed = signPublicSiteBridgeRequest({
      method: 'POST',
      route: COMPARISON_TABLE_BRIDGE_ROUTE,
      body: bodyJson,
      secret: SYNTHETIC_DRY_RUN_SECRET,
      actor: input.actor,
      environment: input.environment,
    })

    return {
      contractVersion: COMPARISON_TABLE_BRIDGE_CONTRACT_VERSION,
      schemaVersion: COMPARISON_TABLE_SCHEMA_VERSION,
      greenhouseManifestId,
      contentHash,
      mode,
      sendsWordPressWrite: false,
      method: 'POST',
      route: COMPARISON_TABLE_BRIDGE_ROUTE,
      redactedHeaders: redactHeaders(signed.headers),
      canonicalRequestPreview: signed.canonicalRequest,
      rolloutPreconditions,
      rollback,
    }
  }

  // 4. execute — gated. The LLM never reaches here without human confirm + flag.
  if (!writesEnabled()) {
    throw new ComparisonTableAuthorError(
      'comparison_table_writes_disabled',
      'La escritura gobernada del widget está deshabilitada en este entorno.',
      { statusCode: 409 }
    )
  }

  const secret = await resolveSecretByRef(process.env[SHARED_SECRET_ENV_REF] ?? '')

  if (!secret) {
    throw new ComparisonTableAuthorError(
      'comparison_table_shared_secret_missing',
      'No se pudo resolver el shared secret del bridge.',
      { statusCode: 503 }
    )
  }

  const signed = signPublicSiteBridgeRequest({
    method: 'POST',
    route: COMPARISON_TABLE_BRIDGE_ROUTE,
    body: bodyJson,
    secret,
    actor: input.actor,
    environment: input.environment,
  })

  const baseUrl = (input.baseUrl ?? process.env.PUBLIC_WEBSITE_WORDPRESS_BASE_URL ?? DEFAULT_BASE_URL).replace(
    /\/+$/,
    ''
  )

  let response: Response

  try {
    response = await fetch(`${baseUrl}${COMPARISON_TABLE_BRIDGE_ROUTE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...signed.headers },
      body: bodyJson,
    })
  } catch {
    throw new ComparisonTableAuthorError(
      'comparison_table_bridge_failed',
      'No se pudo contactar el bridge de WordPress.',
      { statusCode: 502 }
    )
  }

  if (!response.ok) {
    throw new ComparisonTableAuthorError(
      'comparison_table_bridge_failed',
      'El bridge de WordPress rechazó la escritura del widget.',
      { statusCode: 502 }
    )
  }

  return {
    contractVersion: COMPARISON_TABLE_BRIDGE_CONTRACT_VERSION,
    schemaVersion: COMPARISON_TABLE_SCHEMA_VERSION,
    greenhouseManifestId,
    contentHash,
    mode,
    sendsWordPressWrite: true,
    method: 'POST',
    route: COMPARISON_TABLE_BRIDGE_ROUTE,
    redactedHeaders: redactHeaders(signed.headers),
    canonicalRequestPreview: signed.canonicalRequest,
    rolloutPreconditions,
    rollback,
    result: { status: response.status, ok: response.ok },
  }
}
