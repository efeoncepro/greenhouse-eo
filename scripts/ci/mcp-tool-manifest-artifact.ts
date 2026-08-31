/**
 * TASK-1780 — Genera y verifica el artefacto del inventario de tools MCP.
 *
 * ═══ Por qué un artefacto generado y no una copia ═══
 *
 * El guard de paridad del gateway (`efeonce-mcp`) vive en otro repo y su CI **no puede leer
 * greenhouse-eo**. La restricción que decidió la forma: el CI del gateway no debe depender de un
 * deployment vivo para un gate de merge — eso descarta publicar el inventario por HTTP y que el
 * guard lo consulte en cada PR.
 *
 * Así que el gateway consume una copia. La diferencia con el espejo que esta task elimina es que
 * esta copia **no se escribe a mano**:
 *
 *   - se GENERA introspectando el servidor real (`_registeredTools`), nunca transcribiendo;
 *   - lleva `manifestHash` de su propio contenido, así que una edición a mano se detecta en los
 *     dos repos;
 *   - un gate en Greenhouse (`pnpm mcp:manifest:check`) falla si el artefacto committeado difiere
 *     del registro vivo, así que no puede quedar viejo en silencio.
 *
 * `inputKeys` sale de la introspección, NO del manifiesto: duplicar los schemas a mano es
 * exactamente el problema que esta task cierra.
 *
 * Uso:
 *   pnpm mcp:manifest:check      # gate
 *   pnpm mcp:manifest:generate   # regenera
 */
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { createGreenhouseMcpServer } from '@/mcp/greenhouse/server'
import { GREENHOUSE_MCP_TOOL_MANIFEST } from '@/mcp/greenhouse/tool-manifest'

const ARTIFACT_PATH = join(process.cwd(), 'src/mcp/greenhouse/tool-manifest.generated.json')

type GeneratedTool = {
  name: string
  domain: string
  writes: boolean
  spendsProviderBudget: boolean
  purpose: string
  inputKeys: string[]
}

const buildArtifact = () => {
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

  const tools: GeneratedTool[] = GREENHOUSE_MCP_TOOL_MANIFEST.map(entry => ({
    name: entry.name,
    domain: entry.domain,
    writes: entry.writes,
    spendsProviderBudget: entry.spendsProviderBudget,
    purpose: entry.purpose,
    inputKeys: Object.keys(registered[entry.name]?.inputSchema?.shape ?? {}).sort()
  }))

  const manifestHash = createHash('sha256').update(JSON.stringify(tools)).digest('hex')

  return {
    $comment:
      'GENERADO por pnpm mcp:manifest:generate (TASK-1780). NO editar a mano: el hash y el gate de ' +
      'Greenhouse lo detectan. Greenhouse declara que EXISTE; el gateway decide que CRUZA.',
    source: 'greenhouse-eo/src/mcp/greenhouse/tool-manifest.ts',
    generator: 'pnpm mcp:manifest:generate',
    manifestHash,
    toolCount: tools.length,
    tools
  }
}

const artifact = buildArtifact()
const next = `${JSON.stringify(artifact, null, 2)}\n`
const shortHash = artifact.manifestHash.slice(0, 12)

if (process.argv.includes('--write')) {
  writeFileSync(ARTIFACT_PATH, next, 'utf8')
  console.log(`mcp:manifest — artefacto regenerado (${artifact.toolCount} tools, hash ${shortHash}).`)
} else {
  let current: string | null = null

  try {
    current = readFileSync(ARTIFACT_PATH, 'utf8')
  } catch {
    console.error(
      'mcp:manifest — falta src/mcp/greenhouse/tool-manifest.generated.json. Genera con: pnpm mcp:manifest:generate'
    )
    process.exit(1)
  }

  if (current !== next) {
    console.error(
      'mcp:manifest — el artefacto committeado NO coincide con el registro vivo del servidor MCP. ' +
        'Es el modo de falla que TASK-1780 existe para impedir: el gateway consumiria un inventario ' +
        'viejo sin que nada falle. Regenera con: pnpm mcp:manifest:generate'
    )
    process.exit(1)
  }

  console.log(`mcp:manifest — artefacto al dia (${artifact.toolCount} tools, hash ${shortHash}).`)
}
