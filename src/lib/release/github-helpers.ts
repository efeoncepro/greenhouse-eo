/**
 * TASK-849 — Canonical GitHub API helpers para readers reliability +
 * watchdog detector. Extraido de TASK-848 V1.0 readers (release-stale-approval.ts
 * y release-pending-without-jobs.ts) para evitar duplicacion.
 *
 * Single source of truth para:
 *   - Token resolution (`GITHUB_RELEASE_OBSERVER_TOKEN` > `GITHUB_TOKEN`)
 *   - Auth headers builder
 *   - Timeout-bounded fetch (10s default)
 *   - Repo coordinates resolution
 *
 * **Patron canonico**: degradacion honesta. Si no hay token, retorna `null`.
 * Cada caller decide si emite `severity='unknown'` (readers) o exit con error
 * (CLI). NO falla loud aqui — los callers deciden.
 *
 * **Rate budget**: cada call HTTP cuenta contra el rate limit GitHub API
 * (5000 req/h authenticated). Los 3 readers + watchdog combinados consumen
 * ~50-60 req per cycle (cada 30 min) → ~120 req/h total. Trivial vs limit.
 *
 * Spec: docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md §2.9.
 */

const GH_API_TIMEOUT_MS = 10_000

const REPO_OWNER = process.env.GITHUB_REPOSITORY_OWNER ?? 'efeoncepro'
const REPO_NAME = process.env.GITHUB_REPOSITORY_NAME ?? 'greenhouse-eo'

/**
 * Identidad para User-Agent. GitHub API exige User-Agent en todos los
 * requests; sin uno descriptivo, debugging y rate limit attribution se
 * vuelven opacos. Mantener stable.
 */
export const GITHUB_OBSERVER_USER_AGENT = 'greenhouse-release-observer'

export const githubRepoCoords = (): { owner: string; repo: string } => ({
  owner: REPO_OWNER,
  repo: REPO_NAME
})

/**
 * Resuelve token GitHub para queries observer-only.
 *
 * Orden de fallback (TASK-849 V1.1 — GH App primary, PAT fallback):
 *   1. **GitHub App installation token** (canonical, ROBUST):
 *      Si las 3 env vars `GITHUB_APP_ID` + `GITHUB_APP_INSTALLATION_ID` +
 *      `GREENHOUSE_GITHUB_APP_PRIVATE_KEY_SECRET_REF` estan configuradas,
 *      mintea installation token (1h TTL) via JWT firmado con private key.
 *      Token NO ligado a usuario individual + rate limit 15K req/h vs 5K
 *      per-user. Cache in-process con renovacion 5min antes de expiry.
 *   2. `GITHUB_RELEASE_OBSERVER_TOKEN` PAT dedicado (V1 fallback)
 *   3. `GITHUB_TOKEN` (auto-provisto en GH Actions runner)
 *   4. `null` → caller decide si degrada (`severity='unknown'`) o falla
 *
 * **Async**: por GH App JWT mint asincrono. Caller pre-existente sincronos
 * (V1.0 readers) usan `resolveGithubTokenSync()` que solo cubre PAT path.
 *
 * Vercel runtime: PAT GITHUB_TOKEN no se inyecta automaticamente. GH App
 * recomendado (vive el lifecycle del Vercel function instance).
 */
export const resolveGithubToken = async (): Promise<string | null> => {
  const { resolveGithubAppInstallationToken } = await import('./github-app-token-resolver')
  const appToken = await resolveGithubAppInstallationToken()

  if (appToken) return appToken

  return resolveGithubTokenSync()
}

/**
 * Sincronos PAT-only resolver. Mantiene back-compat con V1.0 readers que
 * todavia llaman `resolveGithubToken()` esperando string|null sin promise.
 * Una vez que todos los callers migren a `resolveGithubToken` async, este
 * helper deja de ser necesario.
 */
export const resolveGithubTokenSync = (): string | null => {
  return process.env.GITHUB_RELEASE_OBSERVER_TOKEN ?? process.env.GITHUB_TOKEN ?? null
}

/**
 * Headers canonicos GitHub API v3 con auth.
 */
export const buildGithubAuthHeaders = (token: string): Record<string, string> => ({
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  Authorization: `Bearer ${token}`,
  'User-Agent': GITHUB_OBSERVER_USER_AGENT
})

/**
 * Fetch con timeout bounded — nunca cuelga indefinidamente.
 *
 * Por qué AbortController en lugar de Promise.race: AbortController es la
 * primitive canonica de Node 18+ para cancelar HTTP requests en curso, libera
 * recursos del socket inmediatamente. Promise.race mantiene el request vivo
 * en background hasta que la respuesta llegue (memory leak en escenarios de
 * GitHub API slow).
 */
export const fetchGithubWithTimeout = async (
  url: string,
  init: RequestInit,
  timeoutMs: number = GH_API_TIMEOUT_MS
): Promise<Response> => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Type guard generico para responses GitHub API. Lanza error con detalle
 * si la response no es OK — los callers atrapan y degradan a 'unknown' o
 * propagan segun policy.
 */
export const assertGithubResponseOk = (response: Response, endpoint: string): void => {
  if (!response.ok) {
    throw new Error(
      `GitHub API ${endpoint} returned ${response.status} ${response.statusText}`
    )
  }
}

/**
 * Convenience: GET con auth + timeout + assert ok + parse JSON.
 * Errors de red, timeouts y status no-2xx se propagan al caller.
 */
export const githubFetchJson = async <T>(
  endpoint: string,
  token: string,
  options?: { timeoutMs?: number }
): Promise<T> => {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `https://api.github.com${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`

  const response = await fetchGithubWithTimeout(
    url,
    { headers: buildGithubAuthHeaders(token) },
    options?.timeoutMs
  )

  assertGithubResponseOk(response, endpoint)

  return (await response.json()) as T
}
