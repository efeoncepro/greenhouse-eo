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
 * ═══ TASK-1784 — `descriptionHash`: por qué el texto también viaja ═══
 *
 * Hasta esta task el artefacto llevaba nombre, dominio, banderas y claves de schema, pero NO la
 * descripción. Mientras la descripción era sólo documentación eso alcanzaba. Dejó de alcanzar
 * cuando el RUTEO —qué tool preferir sobre cuál vecina, y por qué NUNCA elegir un mercado en
 * silencio— pasó a vivir dentro de ella: una descripción vieja en el gateway sirve un mapa
 * desactualizado, y eso era estructuralmente invisible.
 *
 * Está medido, no supuesto: al aplicar el ruteo a siete descripciones, `pnpm mcp:manifest:check`
 * respondió «artefacto al día». El gate no mentía — es que no miraba ahí.
 *
 * 🔴 Viaja el TEXTO COMPLETO, no sólo su hash. La primera versión de esta task transportaba sólo
 * el hash —diffs más chicos, misma capacidad de DETECTAR la divergencia— y al conectarlo el guard
 * del gateway encontró 21 de 27 descripciones federadas ya divergentes. Con hash solo, cerrar eso
 * habría sido copiar 21 textos a mano y volver a copiarlos en cada edición futura: un espejo
 * manual, que es exactamente lo que `TASK-1780` eliminó para el inventario.
 *
 * Detectar la deriva es más débil que hacerla imposible. Con el texto acá, el gateway DERIVA su
 * descripción igual que deriva `writes` y `inputKeys`, y la clase de defecto deja de existir en
 * vez de quedar vigilada. El `descriptionHash` se conserva para comparar barato y para que una
 * edición a mano del artefacto se note.
 *
 * Lo que costó: el artefacto pasa a pesar decenas de KB. Es un archivo generado que nadie lee
 * línea por línea, y el precio compra la eliminación de una clase de drift.
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
  /**
   * La `description` agent-facing EXACTA, introspectada del servidor real. El gateway la deriva
   * de acá en vez de mantener su propia copia: el ruteo tiene un solo dueño.
   */
  description: string
  /**
   * SHA-256 de la `description` agent-facing registrada, introspectada del servidor real.
   * El guard del gateway lo compara con el hash de la descripción que él registra: un drift de
   * texto pasa a ser un finding en vez de una diferencia silenciosa (TASK-1784).
   */
  descriptionHash: string
}

const sha256 = (value: string): string => createHash('sha256').update(value).digest('hex')

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
    { description?: string; inputSchema?: { shape?: Record<string, unknown> } }
  >

  const tools: GeneratedTool[] = GREENHOUSE_MCP_TOOL_MANIFEST.map(entry => ({
    name: entry.name,
    domain: entry.domain,
    writes: entry.writes,
    spendsProviderBudget: entry.spendsProviderBudget,
    purpose: entry.purpose,
    inputKeys: Object.keys(registered[entry.name]?.inputSchema?.shape ?? {}).sort(),
    description: registered[entry.name]?.description ?? '',
    descriptionHash: sha256(registered[entry.name]?.description ?? '')
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
