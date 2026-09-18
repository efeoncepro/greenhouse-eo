import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

/**
 * Snapshot de los esquemas de entrada de Higgsfield — `pnpm ai:higgsfield:sync-schemas`.
 *
 * Higgsfield no publica un OpenAPI al día (su `openapi.json` lista endpoints retirados), pero cada modelo tiene su
 * JSON Schema completo embebido en la página del playground de la consola. Este script lo extrae y lo congela en
 * `src/lib/ai/higgsfield-schemas.json`, que la CLI usa para validar en local ANTES de pedir precio o encolar.
 *
 * Fuentes de endpoints (unión): los catálogos `console.higgsfield.ai/explore/{image,video}` y las páginas de modelo de
 * `docs.higgsfield.ai` (campo "Endpoint ID"). Un endpoint sin esquema en el playground queda listado en `missing`:
 * la CLI lo sigue pudiendo usar, validado sólo por el endpoint de estimación del proveedor.
 *
 * No requiere credenciales. Es de corta vida y no toca runtime: sólo reescribe el snapshot.
 */

const CONSOLE = 'https://console.higgsfield.ai'
const DOCS = 'https://docs.higgsfield.ai'
const OUTPUT = join(process.cwd(), 'src', 'lib', 'ai', 'higgsfield-schemas.json')

const fetchText = async (url: string): Promise<string> => {
  const response = await fetch(url, { headers: { 'User-Agent': 'greenhouse-higgsfield-schema-sync' } })

  if (!response.ok) throw new Error(`${url} respondió HTTP ${response.status}`)

  return response.text()
}

const consoleEndpoints = async (): Promise<string[]> => {
  const endpoints = new Set<string>()

  for (const path of ['/explore', '/explore/image', '/explore/video']) {
    const html = await fetchText(`${CONSOLE}${path}`)

    for (const match of html.matchAll(/\/models\/([^"/]+)\/playground/g)) {
      const endpoint = decodeURIComponent(match[1])

      // Los workflows de Marketing Studio viven en la consola pero no se exponen por la API.
      if (!endpoint.startsWith('workflows/')) endpoints.add(endpoint)
    }
  }

  return [...endpoints]
}

const docsEndpoints = async (): Promise<string[]> => {
  const sitemap = await fetchText(`${DOCS}/docs/sitemap.xml`)
  const pages = [...sitemap.matchAll(/<loc>([^<]*\/docs\/models\/[^<]+)<\/loc>/g)].map(match => match[1])
  const endpoints = new Set<string>()

  for (const page of pages) {
    const markdown = await fetchText(`${page}.md`).catch(() => '')
    const id = /\*\*Endpoint ID:\*\* `([^`]+)`/.exec(markdown)

    if (id) endpoints.add(id[1])
  }

  return [...endpoints]
}

/**
 * El esquema viaja dentro de un string JS del payload de Next (`\n`, `\"` escapados). Se toma el segmento escapado y se
 * des-escapa con JSON.parse antes de parsear el esquema en sí.
 */
const extractSchema = (html: string): Record<string, unknown> | null => {
  const match = /### Input JSON Schema\\n\\n```json\\n([\s\S]*?)\\n```/.exec(html)

  if (!match) return null

  try {
    return JSON.parse(JSON.parse(`"${match[1]}"`) as string) as Record<string, unknown>
  } catch {
    return null
  }
}

const main = async () => {
  const endpoints = [...new Set([...(await consoleEndpoints()), ...(await docsEndpoints())])].sort()
  const schemas: Record<string, Record<string, unknown>> = {}
  const missing: string[] = []

  for (const endpoint of endpoints) {
    const html = await fetchText(`${CONSOLE}/models/${encodeURIComponent(endpoint)}/playground`).catch(() => '')
    const schema = extractSchema(html)

    if (schema) schemas[endpoint] = schema
    else missing.push(endpoint)
  }

  if (!Object.keys(schemas).length) {
    throw new Error('No se extrajo ningún esquema: la consola cambió de forma. No se sobrescribe el snapshot.')
  }

  const snapshot = {
    capturedAt: new Date().toISOString().slice(0, 10),
    source: `${CONSOLE}/models/<endpoint>/playground (Input JSON Schema)`,
    missing,
    schemas
  }

  await writeFile(OUTPUT, `${JSON.stringify(snapshot, null, 2)}\n`)

  process.stdout.write(`✓ ${Object.keys(schemas).length} esquemas → ${OUTPUT.replace(`${process.cwd()}/`, '')}\n`)
  if (missing.length) process.stdout.write(`  sin esquema en el playground: ${missing.join(', ')}\n`)
}

void main().catch((error: unknown) => {
  process.stderr.write(`FATAL: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
})
