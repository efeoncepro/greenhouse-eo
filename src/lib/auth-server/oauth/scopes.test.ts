import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { EFEONCE_MCP_SCOPES, EFEONCE_MCP_WRITE_SCOPES, PUBLISHED_SCOPES_SUPPORTED, isWriteScope } from './scopes'

/**
 * Paridad de scopes con el gateway. Dos guardas independientes:
 *  1. snapshot versionado (siempre corre) — cambiar un scope obliga a tocar este test a propósito;
 *  2. el archivo hermano `../efeonce-mcp/src/config.ts` cuando existe en la máquina — el `it` se
 *     salta CON NOMBRE cuando no está, para que un skip nunca se lea como verde silencioso.
 */

const SNAPSHOT = [
  'efeonce.mcp.read',
  'efeonce.mcp.globe.read',
  'efeonce.mcp.hiring.read',
  'efeonce.mcp.globe.credits.funding.ensure',
  'efeonce.mcp.seo.write'
]

const SIBLING_CONFIG = join(process.cwd(), '..', 'efeonce-mcp', 'src', 'config.ts')

describe('auth-server scopes parity with efeonce-mcp', () => {
  it('matches the versioned snapshot of gateway scopes', () => {
    expect([...EFEONCE_MCP_SCOPES].sort()).toEqual([...SNAPSHOT].sort())
  })

  it('write scopes are never published as the minimum', () => {
    for (const scope of EFEONCE_MCP_WRITE_SCOPES) {
      expect(isWriteScope(scope)).toBe(true)
      expect(PUBLISHED_SCOPES_SUPPORTED).not.toContain(scope)
    }
  })

  it.skipIf(!existsSync(SIBLING_CONFIG))(
    'matches the literal scopes declared in ../efeonce-mcp/src/config.ts (skipped when the sibling repo is absent)',
    () => {
      const source = readFileSync(SIBLING_CONFIG, 'utf8')
      const declared = new Set(Array.from(source.matchAll(/'(efeonce\.mcp\.[a-z0-9._]+)'/g)).map(m => m[1]))

      expect([...declared].sort()).toEqual([...EFEONCE_MCP_SCOPES].sort())
    }
  )
})
