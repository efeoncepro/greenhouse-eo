/**
 * TASK-1676 Slice 4 — `pnpm release:workers`.
 *
 * Imprime estado + `GIT_SHA` de los 4 servicios Cloud Run mapeados, una línea por
 * servicio.
 *
 * ## Por qué existe (y por qué no es "un comando más")
 *
 * En el release del 2026-08-08/09 fallaron **tres** comandos copiados de la
 * documentación: `vercel ls --target=` (el flag pasó a `--environment` en el CLI
 * 50.x), un `gcloud run services describe --format="value(...filter(...))"` cuya
 * sintaxis dejó de resolver, y un `vercel redeploy` que no hace lo que la doc
 * promete. **Ninguno de los comandos envueltos en `pnpm` falló.**
 *
 * No es casualidad: un wrapper es un lugar donde el cambio de una herramienta se
 * arregla una vez y el uso diario lo ejercita; un snippet en markdown es un fósil
 * que nadie corre hasta que hay un incidente — y cuando falla, el operador no
 * puede distinguir "comando viejo" de "sistema roto", que es el peor momento
 * posible para esa ambigüedad.
 *
 * El mapeo servicio↔región NO se hardcodea acá: sale de `RELEASE_DEPLOY_WORKFLOWS`
 * (`src/lib/release/workflow-allowlist.ts`), que ya es el SSOT que usa el watchdog.
 * Un worker nuevo aparece en este comando por el mismo cambio que lo registra en el
 * control plane.
 *
 * Uso:
 *   pnpm release:workers
 *   pnpm release:workers --json
 *   pnpm release:workers --expected-sha=<sha>   # marca drift contra ese SHA
 */

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

import { RELEASE_DEPLOY_WORKFLOWS } from '@/lib/release/workflow-allowlist'

const execFileAsync = promisify(execFile)

const GCLOUD_TIMEOUT_MS = 30_000
const GCP_PROJECT = 'efeonce-group'

interface WorkerStatus {
  readonly service: string
  readonly region: string
  readonly ready: string
  readonly gitSha: string | null
  readonly revision: string | null
  readonly error?: string
}

const parseArg = (flag: string): string | null => {
  const hit = process.argv.find(arg => arg.startsWith(`${flag}=`))

  return hit ? hit.slice(flag.length + 1) : null
}

/**
 * Lee el servicio con `--format=json` y proyecta en JS.
 *
 * Deliberado: la clase de bug que este wrapper cierra es precisamente la de las
 * proyecciones `--format="value(...filter(...))"` de gcloud, que son frágiles ante
 * cambios del CLI y fallan de formas difíciles de leer. Pedir JSON y proyectar acá
 * mueve esa lógica a un lugar que los tests y el uso diario ejercitan.
 */
const readWorker = async (service: string, region: string): Promise<WorkerStatus> => {
  try {
    const { stdout } = await execFileAsync(
      'gcloud',
      [
        'run',
        'services',
        'describe',
        service,
        `--region=${region}`,
        `--project=${GCP_PROJECT}`,
        '--format=json'
      ],
      { timeout: GCLOUD_TIMEOUT_MS, maxBuffer: 10 * 1024 * 1024 }
    )

    const payload = JSON.parse(stdout) as {
      status?: {
        conditions?: readonly { type?: string; status?: string }[]
        latestReadyRevisionName?: string
      }
      spec?: {
        template?: {
          spec?: { containers?: readonly { env?: readonly { name?: string; value?: string }[] }[] }
        }
      }
    }

    const readyCondition = payload.status?.conditions?.find(c => c.type === 'Ready')

    const env = payload.spec?.template?.spec?.containers?.[0]?.env ?? []
    const gitSha = env.find(e => e.name === 'GIT_SHA')?.value ?? null

    return {
      service,
      region,
      ready: readyCondition?.status ?? 'Unknown',
      gitSha,
      revision: payload.status?.latestReadyRevisionName ?? null
    }
  } catch (error) {
    return {
      service,
      region,
      ready: 'Unknown',
      gitSha: null,
      revision: null,
      error: error instanceof Error ? error.message.split('\n')[0] : String(error)
    }
  }
}

const main = async (): Promise<void> => {
  const asJson = process.argv.includes('--json')
  const expectedSha = parseArg('--expected-sha')

  const mapped = RELEASE_DEPLOY_WORKFLOWS.filter(
    (w): w is typeof w & { cloudRunService: string } => Boolean(w.cloudRunService)
  )

  const results = await Promise.all(
    mapped.map(w => readWorker(w.cloudRunService, w.cloudRunRegion ?? 'us-east4'))
  )

  if (asJson) {
    console.log(JSON.stringify({ expectedSha, workers: results }, null, 2))
    process.exit(results.some(r => r.error) ? 1 : 0)
  }

  console.log(`\nCloud Run workers del release${expectedSha ? ` (esperado: ${expectedSha.slice(0, 12)})` : ''}\n`)

  for (const r of results) {
    const shaLabel = r.gitSha ? r.gitSha.slice(0, 12) : '—'

    // Un SHA distinto NO es drift por sí solo: `ops-worker-deploy` es change-gated
    // y conserva el SHA del último deploy que sí tocó código de worker cuando las
    // rutas runtime no cambiaron. El runbook §4.1 tiene el `git diff` que decide.
    const drift = expectedSha && r.gitSha && r.gitSha !== expectedSha ? '  ⚠ SHA distinto' : ''

    const readyMark = r.ready === 'True' ? '✓' : '✗'

    console.log(
      `  ${readyMark} ${r.service.padEnd(32)} ${r.region.padEnd(12)} Ready=${r.ready.padEnd(8)} GIT_SHA=${shaLabel}${drift}`
    )

    if (r.error) console.log(`      error: ${r.error}`)
  }

  const failed = results.filter(r => r.error)

  if (failed.length > 0) {
    console.log(
      `\n${failed.length} servicio(s) no se pudieron leer. Si es de autenticación: \`gcloud auth login\`.` +
        '\nSi gcloud rechaza los flags, la herramienta cambió — corregir ESTE wrapper, no cada doc.\n'
    )
    process.exit(1)
  }

  if (expectedSha) {
    const drifted = results.filter(r => r.gitSha && r.gitSha !== expectedSha)

    console.log(
      drifted.length === 0
        ? '\nTodos los workers sirven el SHA esperado.\n'
        : `\n${drifted.length} worker(s) con SHA distinto. NO es drift automáticamente: ver runbook §4.1 (ops-worker es change-gated).\n`
    )
  } else {
    console.log('')
  }
}

main().catch(error => {
  console.error('release:workers falló:', error instanceof Error ? error.message : error)
  process.exit(1)
})
