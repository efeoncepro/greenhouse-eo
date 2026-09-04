import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))
vi.mock('@/lib/postgres/client', () => ({ runGreenhousePostgresQuery: vi.fn() }))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))

import { CHANGE_GATED_RUNTIME_PATHS } from './release-worker-revision-drift'

/**
 * El watchdog clasifica un skip change-gated con un ESPEJO del array `WORKER_RUNTIME_PATHS=(` del
 * workflow de deploy de cada servicio. Este test lee los workflows reales: si el gate cambia y el
 * espejo no, el watchdog volvería a reportar DRIFT sobre un no-op legítimo (o, peor, a callar un
 * drift real). El mecanismo que manda sigue siendo `pnpm worker:deploy-path-gate`.
 */
const parseWorkflowRuntimePaths = (workflowFile: string): string[] => {
  const source = readFileSync(join(process.cwd(), '.github/workflows', workflowFile), 'utf8')
  const match = source.match(/WORKER_RUNTIME_PATHS=\(([\s\S]*?)\n\s*\)/)

  if (!match) throw new Error(`${workflowFile}: WORKER_RUNTIME_PATHS=( no encontrado`)

  return match[1]
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
}

const WORKFLOW_BY_SERVICE: Record<string, string> = {
  'ops-worker': 'ops-worker-deploy.yml',
  'auth-server': 'auth-server-deploy.yml'
}

describe('watchdog change-gate mirror ↔ deploy workflows (release 9100bbd2765d, 2026-09-04)', () => {
  it.each(Object.entries(WORKFLOW_BY_SERVICE))('%s mirrors the WORKER_RUNTIME_PATHS array of %s', (service, workflowFile) => {
    expect([...CHANGE_GATED_RUNTIME_PATHS[service]].sort()).toEqual(parseWorkflowRuntimePaths(workflowFile).sort())
  })

  it('every change-gated service in the mirror has a deploy workflow to mirror', () => {
    expect(Object.keys(CHANGE_GATED_RUNTIME_PATHS).sort()).toEqual(Object.keys(WORKFLOW_BY_SERVICE).sort())
  })
})
