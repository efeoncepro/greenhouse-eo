/**
 * TASK-850 — Release batch policy: domain classification + sensitive paths +
 * irreversibility heuristics.
 *
 * Code constants (NOT a PG table) per Decision 2 of the foundational
 * validation. YAGNI promote-to-PG hasta que rule-edit frequency >1x/mes
 * justifique editar sin deploy. Mientras tanto:
 *   - Edit este archivo
 *   - Acompañar con tests anti-regresion (`classifier.test.ts`)
 *   - PR review = single gate de cambio
 *
 * **Reglas duras al extender** (canonicas para futuras tasks):
 *   - NUNCA agregar dominio al union ReleaseBatchPolicyDomain sin entry en
 *     DOMAIN_PATTERNS + IRREVERSIBLE_DOMAINS (si aplica) + SENSITIVE_PATTERNS
 *     (si aplica) + tests cubriendo.
 *   - NUNCA cambiar SENSITIVE_PATTERNS sin re-validar contra inventario real
 *     `find src/lib/{db,payroll,finance,auth,entitlements} -type f` para
 *     confirmar que el patron sigue matcheando los paths canonicos.
 *   - NUNCA mover dominio de `IRREVERSIBLE_DOMAINS` a no-irreversible sin
 *     ADR explicito (e.g. si emerge un futuro `data_seed` que se considera
 *     reversible).
 */

import type { ReleaseBatchPolicyDomain } from '../types'

/**
 * Map de patron regex -> dominio canonico. El primer match en el orden
 * declarado gana. Patterns son intentionally specific — un file que
 * matchea multiples puede gana el primero.
 *
 * Ordering rationale: high-risk/specific first (db_migrations, auth_access,
 * payroll, finance), luego generales (ui, docs, tests, config).
 */
export const DOMAIN_PATTERNS: ReadonlyArray<{
  readonly pattern: RegExp
  readonly domain: ReleaseBatchPolicyDomain
}> = Object.freeze([
  // tests FIRST — a test file under any domain is a test, not part of runtime.
  // Avoids misclassifying `src/lib/payroll/store.test.ts` as payroll
  // (which would trigger requires_break_glass for a test-only change).
  { pattern: /\.(test|spec)\.tsx?$/, domain: 'tests' },
  { pattern: /^tests\//, domain: 'tests' },
  // db_migrations — schema mutations, highest blast radius
  { pattern: /^migrations\//, domain: 'db_migrations' },
  { pattern: /^src\/lib\/db\//, domain: 'db_migrations' },
  { pattern: /^src\/lib\/postgres\//, domain: 'db_migrations' },
  { pattern: /^src\/types\/db\.d\.ts$/, domain: 'db_migrations' },
  // auth_access — identity model + entitlements + capabilities
  { pattern: /^src\/lib\/auth\//, domain: 'auth_access' },
  { pattern: /^src\/lib\/entitlements\//, domain: 'auth_access' },
  { pattern: /^src\/lib\/capabilities-registry\//, domain: 'auth_access' },
  { pattern: /^src\/config\/entitlements-catalog\.ts$/, domain: 'auth_access' },
  { pattern: /^src\/lib\/tenant\//, domain: 'auth_access' },
  // payroll — wage / SII / Previred / contract semantics
  { pattern: /^src\/lib\/payroll\//, domain: 'payroll' },
  { pattern: /^src\/lib\/calendar\//, domain: 'payroll' },
  { pattern: /^src\/app\/api\/hr\/payroll\//, domain: 'payroll' },
  // finance — accounts, payments, ledger, taxes
  { pattern: /^src\/lib\/finance\//, domain: 'finance' },
  { pattern: /^src\/lib\/commercial-cost-attribution\//, domain: 'finance' },
  { pattern: /^src\/app\/api\/finance\//, domain: 'finance' },
  // cloud_release — deploy infra, workflows, services bootstrap
  { pattern: /^\.github\/workflows\//, domain: 'cloud_release' },
  { pattern: /^services\/[^/]+\/deploy\.sh$/, domain: 'cloud_release' },
  { pattern: /^services\/[^/]+\/Dockerfile$/, domain: 'cloud_release' },
  { pattern: /^vercel\.json$/, domain: 'cloud_release' },
  { pattern: /^src\/lib\/release\//, domain: 'cloud_release' },
  { pattern: /^scripts\/release\//, domain: 'cloud_release' },
  // ui — components, pages, views (after specific domain matches above)
  { pattern: /^src\/(components|views|app)\//, domain: 'ui' },
  // config — non-entitlements config files
  { pattern: /^src\/config\//, domain: 'config' },
  { pattern: /^package\.json$/, domain: 'config' },
  { pattern: /^pnpm-lock\.yaml$/, domain: 'config' },
  { pattern: /^tsconfig.*\.json$/, domain: 'config' },
  { pattern: /^eslint\.config\.mjs$/, domain: 'config' },
  // docs — last so domain-specific docs (e.g. payroll docs) still classify here
  { pattern: /^docs\//, domain: 'docs' },
  { pattern: /^README/, domain: 'docs' },
  { pattern: /^CLAUDE\.md$/, domain: 'docs' },
  { pattern: /^AGENTS\.md$/, domain: 'docs' },
  { pattern: /^Handoff/, domain: 'docs' },
  { pattern: /^changelog/, domain: 'docs' }
])

/**
 * Specific path patterns flagged as sensitive (requires explicit operator
 * scrutiny). Subset of DOMAIN_PATTERNS but called out in the evidence
 * payload for visibility. Match check is independent of domain
 * classification — a file can be sensitive AND classified as `ui`.
 */
export const SENSITIVE_PATH_PATTERNS: readonly RegExp[] = Object.freeze([
  /^migrations\//,
  /^src\/lib\/db\//,
  /^src\/lib\/postgres\//,
  /^src\/lib\/payroll\//,
  /^src\/lib\/finance\//,
  /^src\/lib\/auth\//,
  /^src\/lib\/entitlements\//,
  /^src\/lib\/capabilities-registry\//,
  /^\.github\/workflows\//,
  /^services\/[^/]+\/deploy\.sh$/,
  /^vercel\.json$/,
  /^src\/config\/entitlements-catalog\.ts$/,
  /docs\/architecture\/.*SECURITY/i,
  /docs\/operations\/.*SECRETS/i
])

/**
 * Domains where a release CANNOT be reverted by a simple deploy + revert
 * cycle. Triggers `requires_break_glass` decision and demands the
 * `platform.release.preflight.override_batch_policy` capability.
 *
 * Rationale per domain:
 *   - db_migrations: schema mutations (e.g. DROP COLUMN, NOT NULL constraints)
 *     can require operational backfill to revert. Some migrations are
 *     literally one-way.
 *   - auth_access: granting a capability mid-release exposes data; revert
 *     requires audit + revocation but doesn't unread what was read.
 *   - payroll: wage payments execute (settlement_legs persisted). Revert
 *     of incorrect payment requires manual ledger correction + bank refund.
 *   - finance: similar to payroll — money moved is hard to unmove.
 *   - cloud_release: infra changes (workflow alterations, deploy script
 *     mutations) can render rollback workflows themselves broken.
 */
export const IRREVERSIBLE_DOMAINS: ReadonlySet<ReleaseBatchPolicyDomain> = new Set([
  'db_migrations',
  'auth_access',
  'payroll',
  'finance',
  'cloud_release'
])

/**
 * Domain pairs that are INDEPENDENT — mixing them in the same release
 * triggers `split_batch` decision unless explicitly documented as a
 * coupled release in the commit body (`[release-coupled: <reason>]`).
 *
 * The list is symmetric: declaring `[A, B]` covers `[B, A]` automatically.
 *
 * Rationale: independent domain mix increases blast radius — a payroll
 * regression should not require reverting an unrelated finance change.
 */
export const INDEPENDENT_DOMAIN_PAIRS: ReadonlyArray<
  readonly [ReleaseBatchPolicyDomain, ReleaseBatchPolicyDomain]
> = Object.freeze([
  ['payroll', 'finance'],
  ['payroll', 'auth_access'],
  ['finance', 'auth_access'],
  ['payroll', 'cloud_release'],
  ['finance', 'cloud_release'],
  ['auth_access', 'cloud_release']
])

/**
 * Sentinel commit body marker that signals the release explicitly couples
 * two otherwise-independent sensitive domains. Required to bypass
 * `split_batch` decision when the mix is intentional.
 */
export const RELEASE_COUPLED_MARKER_REGEX = /\[release-coupled:[^\]]+\]/i

/**
 * Classify a single changed file. Returns first matched domain, or
 * `'unclassified'` if no pattern matches.
 */
export const classifyFileDomain = (filePath: string): ReleaseBatchPolicyDomain => {
  for (const { pattern, domain } of DOMAIN_PATTERNS) {
    if (pattern.test(filePath)) return domain
  }

  return 'unclassified'
}

/**
 * Returns the subset of files that match any sensitive path pattern.
 */
export const detectSensitivePaths = (files: readonly string[]): readonly string[] => {
  return files.filter(file => SENSITIVE_PATH_PATTERNS.some(pattern => pattern.test(file)))
}

/**
 * Returns the irreversibility flags raised by a domain count map.
 */
export const detectIrreversibilityFlags = (
  domains: Readonly<Partial<Record<ReleaseBatchPolicyDomain, number>>>
): readonly string[] => {
  const flags: string[] = []

  for (const domain of IRREVERSIBLE_DOMAINS) {
    const count = domains[domain] ?? 0

    if (count > 0) {
      flags.push(`${domain}: ${count} archivo(s) afectados (revert requiere backfill u operacion manual)`)
    }
  }

  return flags
}
