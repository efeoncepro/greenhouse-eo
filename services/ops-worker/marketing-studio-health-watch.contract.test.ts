import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const read = (file: string) => readFileSync(join(__dirname, file), 'utf8')

describe('TASK-1896 — Marketing Studio health watch en el ops-worker', () => {
  it('declara el secreto por referencia (deploy.sh usa --set-env-vars destructivo)', () => {
    expect(read('deploy.sh')).toContain(
      'ENV_VARS="${ENV_VARS},MARKETING_STUDIO_HEALTH_TOKEN_SECRET_REF=${MARKETING_STUDIO_HEALTH_TOKEN_SECRET_REF:-greenhouse-marketing-studio-health-token}"'
    )
  })

  it('crea el scheduler diario PAUSADO hasta el primer ensayo verde', () => {
    const script = read('deploy.sh')
    const at = script.indexOf('"ops-marketing-studio-health-watch"')

    expect(at).toBeGreaterThan(0)
    expect(script.slice(at, at + 200)).toContain('"/marketing-studio/health-watch"')
    expect(script.slice(at, at + 200)).toContain('"true"')
  })

  it('el endpoint está enrutado', () => {
    expect(read('server.ts')).toContain("path === '/marketing-studio/health-watch'")
  })
})
