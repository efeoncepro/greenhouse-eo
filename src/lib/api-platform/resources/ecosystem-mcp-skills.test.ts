/**
 * TASK-1804 — Lane ecosystem de manuales MCP: gating por binding + freshness.
 *
 * Cubre, contra el catálogo REAL del repo (no un stub — el contenido es estático y el test debe
 * ver lo que producción sirve):
 *   - binding `internal` → catálogo completo con la cuenta EXACTA del manifiesto
 *   - binding no-internal → catálogo VACÍO (no aparece nada, no hay marcador de "no disponible")
 *   - detalle desde binding internal → cuerpo verbatim + contentHash + ETag
 *   - detalle desde binding no-internal → 404 anti-oráculo (nunca 403)
 *   - detalle de un manual inexistente → el MISMO 404, indistinguible
 *   - nombre con forma inválida → el mismo 404
 *   - If-None-Match con el ETag vigente → notModified
 *   - el bundling de Vercel declara los .md como filesystem input (guarda textual que SEÑALA al
 *     verificador real: el smoke de staging/producción compara la cuenta exacta del catálogo)
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { ApiPlatformError } from '@/lib/api-platform/core/errors'
import { getGreenhouseMcpSkillCatalog } from '@/mcp/greenhouse/skill-catalog'
import { GREENHOUSE_MCP_SKILL_MANIFEST, GREENHOUSE_MCP_SKILLS_ROOT } from '@/mcp/greenhouse/skill-manifest'

import { getEcosystemMcpSkillCatalogPayload, getEcosystemMcpSkillPayload } from './ecosystem-mcp-skills'

const ctx = (scopeType: string, organizationId: string | null = null) =>
  ({
    requestId: 'req-1',
    routeKey: 'platform.ecosystem.mcp.skills',
    version: '2026-04-25',
    binding: { greenhouseScopeType: scopeType, organizationId },
    consumer: { sisterPlatformKey: 'efeonce-mcp-gateway', consumerId: 'consumer-1' },
    rateLimit: {}
  }) as never

const internalCtx = ctx('internal')
const clientCtx = ctx('organization', 'org-client')

const request = (headers: Record<string, string> = {}) =>
  new Request('https://greenhouse.example.test/api/platform/ecosystem/mcp/skills', { headers })

const catalog = getGreenhouseMcpSkillCatalog()

describe('catálogo de manuales MCP — lane ecosystem', () => {
  it('binding internal: catálogo completo con la cuenta EXACTA del manifiesto', async () => {
    const result = await getEcosystemMcpSkillCatalogPayload({ context: internalCtx, request: request() })

    expect(result.data.count).toBe(GREENHOUSE_MCP_SKILL_MANIFEST.length)
    expect(result.data.skills.map(skill => skill.name)).toEqual(GREENHOUSE_MCP_SKILL_MANIFEST.map(entry => entry.name))
    expect(result.cacheControl).toContain('max-age=300')
    expect(result.etag).toMatch(/^"[0-9a-f]+"$/)
    expect(result.notModified).toBe(false)
  })

  it('el catálogo nunca lleva cuerpos', async () => {
    const result = await getEcosystemMcpSkillCatalogPayload({ context: internalCtx, request: request() })

    for (const skill of result.data.skills) {
      expect('body' in skill).toBe(false)
      expect(Object.keys(skill).sort()).toEqual(['appliesTo', 'audience', 'description', 'name', 'uri'])
    }
  })

  it('binding de cliente: catálogo VACÍO, sin marcador de existencia', async () => {
    const result = await getEcosystemMcpSkillCatalogPayload({ context: clientCtx, request: request() })

    expect(result.data).toEqual({ skills: [], count: 0 })
  })

  it('el ETag del catálogo distingue el subconjunto visible: internal ≠ cliente', async () => {
    const internal = await getEcosystemMcpSkillCatalogPayload({ context: internalCtx, request: request() })
    const client = await getEcosystemMcpSkillCatalogPayload({ context: clientCtx, request: request() })

    expect(internal.etag).not.toBe(client.etag)
  })

  it('If-None-Match con el ETag vigente → notModified', async () => {
    const first = await getEcosystemMcpSkillCatalogPayload({ context: internalCtx, request: request() })

    const second = await getEcosystemMcpSkillCatalogPayload({
      context: internalCtx,
      request: request({ 'if-none-match': first.etag as string })
    })

    expect(second.notModified).toBe(true)
  })
})

describe('detalle de un manual MCP — lane ecosystem', () => {
  it('binding internal: cuerpo verbatim, byte-idéntico al catálogo canónico, con hash y ETag', async () => {
    for (const skill of catalog.skills) {
      const result = await getEcosystemMcpSkillPayload({ context: internalCtx, request: request(), name: skill.name })

      expect(result.data.body).toBe(skill.body)
      expect(result.data.contentHash).toBe(skill.contentHash)
      expect(result.data.uri).toBe(skill.uri)
      expect(result.etag).toBe(`"${skill.contentHash.slice(0, 32)}"`)
      expect(result.cacheControl).toContain('max-age=300')
    }
  })

  it('el cuerpo servido es EXACTAMENTE el archivo del repo', async () => {
    const entry = GREENHOUSE_MCP_SKILL_MANIFEST[0]
    const onDisk = readFileSync(join(process.cwd(), entry.sourcePath), 'utf8')
    const result = await getEcosystemMcpSkillPayload({ context: internalCtx, request: request(), name: entry.name })

    expect(result.data.body).toBe(onDisk)
  })

  const expect404 = async (context: never, name: string) => {
    let caught: unknown

    try {
      await getEcosystemMcpSkillPayload({ context, request: request(), name })
    } catch (error) {
      caught = error
    }

    expect(caught).toBeInstanceOf(ApiPlatformError)
    expect((caught as ApiPlatformError).statusCode).toBe(404)
    expect((caught as ApiPlatformError).errorCode).toBe('not_found')

    return (caught as ApiPlatformError).message
  }

  it('binding de cliente sobre un manual internal → 404 anti-oráculo, nunca 403', async () => {
    await expect404(clientCtx, 'seo-spend-discipline')
  })

  it('manual inexistente → el MISMO 404 desde cualquier binding (indistinguible)', async () => {
    const fromInternal = await expect404(internalCtx, 'no-such-manual')
    const fromClient = await expect404(clientCtx, 'no-such-manual')
    const hidden = await expect404(clientCtx, 'seo-spend-discipline')

    expect(fromInternal).toBe(fromClient)
    expect(fromClient).toBe(hidden)
  })

  it('un nombre con forma inválida → el mismo 404 (el formato no filtra nada)', async () => {
    await expect404(internalCtx, '../SKILL.md')
    await expect404(internalCtx, 'Seo.Spend')
  })

  it('If-None-Match con el ETag vigente → notModified', async () => {
    const entry = GREENHOUSE_MCP_SKILL_MANIFEST[0]
    const first = await getEcosystemMcpSkillPayload({ context: internalCtx, request: request(), name: entry.name })

    const second = await getEcosystemMcpSkillPayload({
      context: internalCtx,
      request: request({ 'if-none-match': first.etag as string }),
      name: entry.name
    })

    expect(second.notModified).toBe(true)
  })
})

describe('el runtime no depende del filesystem (TASK-1804, lección del build de Vercel)', () => {
  /**
   * La primera versión leía `docs/mcp/skills/**` en runtime y declaraba los `.md` en
   * `outputFileTracingIncludes`; Vercel rechazó el build (función sola de 397 MB). El contrato
   * vigente: el catálogo viaja como artefacto generado en el bundle y `pnpm mcp:skills:check` lo
   * mantiene sincronizado. Esta guarda textual SEÑALA a ese verificador: impide reintroducir el
   * tracing sin leer este comentario.
   */
  it('next.config.ts no declara outputFileTracingIncludes para los manuales', () => {
    const nextConfig = readFileSync(join(process.cwd(), 'next.config.ts'), 'utf8')

    expect(nextConfig).not.toContain(GREENHOUSE_MCP_SKILLS_ROOT)
  })

  it('la lane sirve la cuenta EXACTA del manifiesto desde el artefacto en bundle', async () => {
    const result = await getEcosystemMcpSkillCatalogPayload({ context: internalCtx, request: request() })

    expect(result.data.count).toBe(GREENHOUSE_MCP_SKILL_MANIFEST.length)
  })
})
