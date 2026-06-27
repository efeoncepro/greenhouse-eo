#!/usr/bin/env tsx
/**
 * TASK-1258 — Provisión/rotación de la credencial per-site (embed key) de una
 * host surface de Growth Forms (modelo de auth del catálogo externo, Opción A).
 *
 * El secreto se muestra UNA sola vez: guardalo server-side en el plugin WordPress
 * (NUNCA en el browser ni en el repo). Rotarlo invalida el anterior de inmediato.
 *
 * Requiere conexión a Postgres (corré `pnpm pg:connect` antes, o tené el proxy/ADC listos).
 *
 * Uso:
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/mint-surface-embed-key.ts --list
 *   pnpm tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/mint-surface-embed-key.ts --surface-id <surfaceId>
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Carga .env.local / .env ANTES de tocar el cliente Postgres (mismo patrón que wpcli-remote).
const loadEnvFile = (relativePath: string) => {
  try {
    const contents = readFileSync(resolve(process.cwd(), relativePath), 'utf8')

    for (const rawLine of contents.split('\n')) {
      const line = rawLine.trim()

      if (!line || line.startsWith('#')) continue
      const normalized = line.startsWith('export ') ? line.slice('export '.length).trim() : line
      const eq = normalized.indexOf('=')

      if (eq <= 0) continue
      const key = normalized.slice(0, eq).trim()

      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key) || process.env[key] !== undefined) continue
      let value = normalized.slice(eq + 1).trim()

      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }

      process.env[key] = value
    }
  } catch {
    // best-effort
  }
}

loadEnvFile('.env.local')
loadEnvFile('.env')

const argv = process.argv.slice(2)
const list = argv.includes('--list')
const surfaceIdx = argv.indexOf('--surface-id')
const surfaceId = surfaceIdx >= 0 ? argv[surfaceIdx + 1] : null

const main = async () => {
  // Import dinámico DESPUÉS de cargar env (el cliente Postgres lee GREENHOUSE_POSTGRES_*).
  const { listHostSurfaces } = await import('../../src/lib/growth/forms/store')
  const { setSurfaceEmbedKey } = await import('../../src/lib/growth/forms/commands')

  if (list || !surfaceId) {
    const surfaces = await listHostSurfaces()

    console.log(`\nHost surfaces (${surfaces.length}):\n`)

    for (const s of surfaces) {
      const origins = Array.isArray(s.origin_allowlist_json) ? s.origin_allowlist_json : []
      const slugs = Array.isArray(s.allowed_form_slugs_json) ? s.allowed_form_slugs_json : []

      console.log(`  ${s.surface_id}`)
      console.log(`    name=${s.surface_name}  kind=${s.surface_kind}  status=${s.status}`)
      console.log(`    embedKey=${s.embed_key_id ? `provisioned (${s.embed_key_id})` : 'NONE'}`)
      console.log(`    origins=${JSON.stringify(origins)}`)
      console.log(`    allowedSlugs=${slugs.length ? JSON.stringify(slugs) : '[] (todos)'}\n`)
    }

    if (!surfaceId) {
      console.log('Para mintear: --surface-id <surfaceId>')

      return
    }
  }

  const result = await setSurfaceEmbedKey(surfaceId)

  if (!result.ok) {
    console.error(`\n✗ Surface no encontrada: ${surfaceId}`)
    process.exit(1)
  }

  console.log('\n✓ Embed key minteada (rotó cualquier anterior).')
  console.log(`  surfaceId   = ${surfaceId}`)
  console.log(`  embedKeyId  = ${result.embedKeyId}`)
  console.log(`  SECRET      = ${result.secret}`)
  console.log('\n⚠️  Guardá el SECRET server-side en el plugin WordPress. NO vuelve a mostrarse.\n')
}

main()
  .then(() => process.exit(0)) // el pool Postgres mantiene vivo el event loop; salir explícito.
  .catch(error => {
    console.error(`mint-surface-embed-key failed: ${error instanceof Error ? error.message : String(error)}`)
    process.exit(1)
  })
