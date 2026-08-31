/**
 * TASK-1780 — El manifiesto es fuente sólo si algo falla cuando deja de serlo.
 *
 * Tres capas, en el orden de la doctrina de `MCP_TOOL_SURFACE_INVARIANTS.md` §3:
 *
 *   1. La construcción del servidor ya es un guard estructural: registra recorriendo el
 *      manifiesto, así que una tool sin entrada no se puede registrar. Acá se verifica que el
 *      servidor REAL construye y que su registro coincide con el inventario en las dos direcciones.
 *   2. El poder de detección se ejercita con estados sintéticos sobre la función pura: un guard
 *      que nunca se pone rojo no prueba nada.
 *   3. El cruce contra el censo de lente (`TASK-1785`) impide que el manifiesto nazca como una
 *      TERCERA lista, que es exactamente el modo de falla que esta task existe para cerrar.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { SEO_LENS_SURFACES } from '@/lib/growth/seo/lens-surface-manifest'
import { createGreenhouseMcpServer } from '../server'
import {
  buildGreenhouseMcpServerIdentity,
  computeGreenhouseMcpToolCoverage,
  GREENHOUSE_MCP_TOOL_MANIFEST,
  greenhouseMcpToolIsReadOnly
} from '../tool-manifest'

const registeredToolNames = (): string[] => {
  const server = createGreenhouseMcpServer(
    {
      apiBaseUrl: 'https://example.invalid',
      consumerToken: 'stub',
      externalScopeType: 'other',
      externalScopeId: 'stub',
      apiVersion: '2026-04-25',
      requestTimeoutMs: 1_000
    },
    { fetch: (async () => new Response('{}')) as unknown as typeof fetch }
  )

  // Introspección del registro interno del SDK: la misma estructura que sirve `tools/list`.
  // Se mide lo REGISTRADO, no lo que una regex sobre el fuente crea leer.
  return Object.keys((server as any)._registeredTools as Record<string, unknown>)
}

describe('manifiesto de tools MCP (TASK-1780)', () => {
  it('el servidor real registra exactamente lo que el manifiesto declara, en su orden', () => {
    expect(registeredToolNames()).toEqual(GREENHOUSE_MCP_TOOL_MANIFEST.map(entry => entry.name))
  })

  it('ninguna entrada del manifiesto está duplicada', () => {
    const names = GREENHOUSE_MCP_TOOL_MANIFEST.map(entry => entry.name)

    expect(names).toEqual([...new Set(names)])
  })

  it('gastar presupuesto del proveedor NUNCA se describe como lectura', () => {
    const spendersReadAsReadOnly = GREENHOUSE_MCP_TOOL_MANIFEST.filter(
      entry => entry.spendsProviderBudget && greenhouseMcpToolIsReadOnly(entry)
    )

    expect(spendersReadAsReadOnly).toEqual([])
  })

  it('la clase de escritura del gateway (writes || spendsProviderBudget) es la esperada', () => {
    // Congelado a propósito: este conjunto deriva `GREENHOUSE_SEO_WRITE_TOOLS`, que gatea el 403
    // de scope en el gateway EN RUNTIME (`efeonce-mcp/src/app.ts`). Un cambio silencioso acá abre
    // una tool de escritura sin desafío de scope; que este test falle obliga a que sea deliberado.
    const writeClass = GREENHOUSE_MCP_TOOL_MANIFEST.filter(entry => !greenhouseMcpToolIsReadOnly(entry)).map(
      entry => entry.name
    )

    expect(writeClass.sort()).toEqual(
      [
        'declare_seo_competitors',
        'discover_seo_keywords',
        'prepare_seo_grounded_queries',
        'retire_seo_competitors',
        'run_seo_prospect_diagnostic',
        'track_seo_keywords',
        'untrack_seo_keywords'
      ].sort()
    )
  })
})

describe('poder de detección de la cobertura (estados sintéticos)', () => {
  const entry = {
    name: 'get_seo_real_tool',
    domain: 'seo',
    writes: false,
    spendsProviderBudget: false,
    purpose: 'sintética — caso base'
  } as const

  it('el caso base no reporta nada', () => {
    expect(computeGreenhouseMcpToolCoverage({ manifest: [entry], definedNames: [entry.name] })).toEqual([])
  })

  it('una tool definida sin entrada en el manifiesto se pone roja NOMBRÁNDOLA', () => {
    const findings = computeGreenhouseMcpToolCoverage({
      manifest: [entry],
      definedNames: [entry.name, 'get_seo_rogue_tool']
    })

    expect(findings.map(finding => finding.code)).toEqual(['defined_not_in_manifest'])
    expect(findings[0].message).toContain('get_seo_rogue_tool')
  })

  it('una entrada del manifiesto sin definición se pone roja NOMBRÁNDOLA', () => {
    const findings = computeGreenhouseMcpToolCoverage({
      manifest: [entry, { ...entry, name: 'get_seo_ghost_tool' }],
      definedNames: [entry.name]
    })

    expect(findings.map(finding => finding.code)).toEqual(['in_manifest_not_defined'])
    expect(findings[0].message).toContain('get_seo_ghost_tool')
  })
})

describe('el manifiesto no es una tercera lista', () => {
  const manifestSeoTools = GREENHOUSE_MCP_TOOL_MANIFEST.filter(tool => tool.domain === 'seo').map(tool => tool.name)
  const censusedTools = SEO_LENS_SURFACES.map(surface => surface.tool).filter((tool): tool is string => Boolean(tool))

  it('toda tool SEO del manifiesto está censada en SEO_LENS_SURFACES', () => {
    const missing = manifestSeoTools.filter(tool => !censusedTools.includes(tool))

    expect(
      missing,
      `Tools SEO del manifiesto sin lente declarada: ${missing.join(', ')}. Dos censos que no se ` +
        'cruzan son dos listas otra vez.'
    ).toEqual([])
  })

  it('el censo de lente no nombra tools SEO que el manifiesto no declara', () => {
    const ghosts = censusedTools.filter(tool => !manifestSeoTools.includes(tool))

    expect(
      ghosts,
      `Tools censadas que el manifiesto no declara: ${ghosts.join(', ')}. Un censo que nombra ` +
        'superficies muertas se lee como cobertura y no cubre nada.'
    ).toEqual([])
  })

  it('las dos formas de contar que ya mintieron siguen cubiertas', () => {
    // Un patrón de prefijos de verbo (`get_|run_|track_`) se come las dos primeras; una clase de
    // caracteres sin dígitos se come la tercera. Las tres tienen que estar en el inventario.
    const names = GREENHOUSE_MCP_TOOL_MANIFEST.map(tool => tool.name)

    expect(names).toContain('declare_seo_competitors')
    expect(names).toContain('retire_seo_competitors')
    expect(names).toContain('get_seo_visibility_360')
  })
})

describe('el cartel del servidor se deriva del inventario (Slice 2)', () => {
  it('no puede anunciarse read-only mientras registre escrituras', () => {
    const identity = buildGreenhouseMcpServerIdentity()

    expect(identity.name).toBe('greenhouse')
    expect(identity.instructions).not.toContain('all of them read-only')
    expect(identity.instructions).toContain('7 that WRITE')
  })

  it('nombra cada escritura y cada compromiso de gasto, sin que nadie las escriba a mano', () => {
    const instructions = buildGreenhouseMcpServerIdentity().instructions

    for (const entry of GREENHOUSE_MCP_TOOL_MANIFEST.filter(tool => !greenhouseMcpToolIsReadOnly(tool))) {
      expect(instructions).toContain(entry.name)
    }

    expect(instructions).toContain('COMMIT PROVIDER BUDGET')
  })

  it('un inventario sin escrituras SÍ se anuncia read-only: la derivación es real, no un literal', () => {
    const identity = buildGreenhouseMcpServerIdentity([
      {
        name: 'get_seo_real_tool',
        domain: 'seo',
        writes: false,
        spendsProviderBudget: false,
        purpose: 'sintética'
      }
    ])

    expect(identity.name).toBe('greenhouse-read-only')
    expect(identity.instructions).toContain('all of them read-only')
    expect(identity.instructions).not.toContain('COMMIT PROVIDER BUDGET')
  })

  it('conserva las afirmaciones verdaderas que ninguna cifra puede derivar', () => {
    const instructions = buildGreenhouseMcpServerIdentity().instructions

    expect(instructions).toContain('downstream of api/platform/ecosystem/*')
    expect(instructions).toContain('fixed external scope from server configuration')
    expect(instructions).toContain('preserves Greenhouse request IDs')
    expect(instructions).toContain('tenancy inference from free text')
  })
})

describe('el artefacto que consume el gateway (Slice 3)', () => {
  const artifact = JSON.parse(
    readFileSync(join(process.cwd(), 'src/mcp/greenhouse/tool-manifest.generated.json'), 'utf8')
  ) as {
    toolCount: number
    tools: { name: string; writes: boolean; spendsProviderBudget: boolean; inputKeys: string[] }[]
  }

  it('declara exactamente las tools del manifiesto, en su orden', () => {
    expect(artifact.tools.map(tool => tool.name)).toEqual(GREENHOUSE_MCP_TOOL_MANIFEST.map(entry => entry.name))
    expect(artifact.toolCount).toBe(GREENHOUSE_MCP_TOOL_MANIFEST.length)
  })

  it('sus inputKeys salen del servidor real, no de una transcripción', () => {
    const server = createGreenhouseMcpServer(
      {
        apiBaseUrl: 'https://example.invalid',
        consumerToken: 'stub',
        externalScopeType: 'other',
        externalScopeId: 'stub',
        apiVersion: '2026-04-25',
        requestTimeoutMs: 1_000
      },
      { fetch: (async () => new Response('{}')) as unknown as typeof fetch }
    )

     
    const registered = (server as any)._registeredTools as Record<
      string,
      { inputSchema?: { shape?: Record<string, unknown> } }
    >

    for (const tool of artifact.tools) {
      expect(tool.inputKeys, `inputKeys de ${tool.name}`).toEqual(
        Object.keys(registered[tool.name]?.inputSchema?.shape ?? {}).sort()
      )
    }
  })

  it('la clase de escritura viaja al artefacto sin fusionarse', () => {
    // El gateway deriva su gate de scope de `writes || spendsProviderBudget`. Si el artefacto
    // colapsara las dos banderas en una, la distinción se perdería justo en la frontera.
    for (const entry of GREENHOUSE_MCP_TOOL_MANIFEST) {
      const tool = artifact.tools.find(candidate => candidate.name === entry.name)

      expect(tool?.writes).toBe(entry.writes)
      expect(tool?.spendsProviderBudget).toBe(entry.spendsProviderBudget)
    }
  })
})
