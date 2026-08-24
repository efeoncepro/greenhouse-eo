#!/usr/bin/env node
/**
 * Corre los `*.live.test.ts` contra PostgreSQL real, exportando SÓLO credenciales de base.
 *
 * ⚠️ **Por qué existe: `set -a; source .env.local; set +a` rompe los tests unitarios.**
 *
 * Los live tests necesitan credenciales de PG, y la vía obvia para dárselas es sourcear
 * `.env.local`. Eso exporta las ~85 variables del archivo al proceso, y ahí empieza el problema:
 * decenas de tests unitarios afirman COMPORTAMIENTOS POR DEFECTO —«nace disabled», «reporta
 * unconfigured sin token», «marca la postura como riesgosa»— que sólo son ciertos con el entorno
 * limpio. Con el archivo sourceado, 15 de esos tests fallaban, en 6 archivos de 4 dominios
 * distintos (secrets, cloud/billing, cloud/postgres, emails).
 *
 * Arreglarlos uno a uno no escala: la variable siguiente que alguien agregue a `.env.local` rompe
 * un test nuevo, y el fallo aparece en un dominio que no tiene nada que ver con quien la agregó.
 * La causa no es cada test — es que el runner filtra configuración de aplicación hacia un proceso
 * que debe ser hermético.
 *
 * **Este script no filtra nada.** Pasa el prefijo `GREENHOUSE_POSTGRES_` y nada más: es lo único
 * que un live test necesita para hablar con la base. Si un live test necesita además un flag, lo
 * declara él (`FLAG=1 pnpm test:live …`), que es explícito y local en vez de ambiental y global.
 *
 * Uso:
 *   pnpm test:live                                   # todos los live tests, serializados
 *   pnpm test:live src/lib/hiring/opening-capacity   # filtrados por path
 */
import { spawnSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import net from 'node:net'
import { resolve } from 'node:path'

const ENV_FILE = resolve(process.cwd(), '.env.local')

/**
 * Lo único que cruza al proceso de test: CÓMO LLEGAR A LA BASE. Nunca CÓMO SE COMPORTA LA APP.
 *
 * Esa es la línea, y es la que hay que defender al ampliar la lista. `GCP_PROJECT` entra porque el
 * Cloud SQL Connector lo exige para abrir la conexión — sin él, todo live test muere con
 * «Missing GCP_PROJECT». Un `*_ENABLED` NO entra jamás: eso es comportamiento, y un live test que
 * lo necesite lo declara él mismo en su invocación.
 */
const ALLOWED_PREFIXES = ['GREENHOUSE_POSTGRES_']
const ALLOWED_KEYS = ['GCP_PROJECT', 'GOOGLE_CLOUD_PROJECT', 'GOOGLE_APPLICATION_CREDENTIALS']

/**
 * Guarda anti-erosión: aunque alguien agregue un prefijo nuevo, un flag de comportamiento no pasa.
 * Sin esto, la lista se ensancha de a poco —siempre por una razón puntual y razonable— hasta
 * volver a ser `source .env.local` con más pasos.
 */
const isBehaviourFlag = key => /_ENABLED$/.test(key) || /_RUN_MODE$/.test(key)

const isAllowed = key =>
  !isBehaviourFlag(key) && (ALLOWED_KEYS.includes(key) || ALLOWED_PREFIXES.some(prefix => key.startsWith(prefix)))

if (!existsSync(ENV_FILE)) {
  console.error(`[test:live] No existe ${ENV_FILE}. Los live tests necesitan credenciales de PostgreSQL.`)
  process.exit(1)
}

const parsed = {}

for (const rawLine of readFileSync(ENV_FILE, 'utf8').split('\n')) {
  const line = rawLine.trim()

  if (!line || line.startsWith('#')) continue

  const eq = line.indexOf('=')

  if (eq <= 0) continue

  const key = line.slice(0, eq).trim()

  if (!isAllowed(key)) continue

  let value = line.slice(eq + 1).trim()

  // Las comillas envolventes son sintaxis del archivo, no parte del secreto.
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1)
  }

  parsed[key] = value
}

const required = ['GREENHOUSE_POSTGRES_DATABASE', 'GREENHOUSE_POSTGRES_USER', 'GREENHOUSE_POSTGRES_PASSWORD']
const missing = required.filter(key => !parsed[key])

if (missing.length > 0) {
  // Falla FUERTE en vez de dejar que vitest reporte «skipped»: un live test saltado se ve
  // exactamente igual que uno verde en el resumen, y eso es peor que un rojo.
  console.error(`[test:live] Faltan credenciales en .env.local: ${missing.join(', ')}`)
  process.exit(1)
}

const passthrough = Object.keys(parsed).length

console.log(
  `[test:live] ${passthrough} variables de acceso a base → proceso de test. El resto de .env.local NO se exporta.`
)

/**
 * Preflight de conectividad: si el host configurado es local, hay un Cloud SQL Proxy en el medio y
 * tiene que estar arriba ANTES de arrancar.
 *
 * Por qué vale las 2 líneas: sin esto, un proxy caído produce el peor modo de fallo del repo —los
 * tests PASAN («5 passed») y la suite igual sale roja, porque quien no puede conectarse es el
 * teardown. El resumen dice «1 failed» y a ojo se lee como test roto, así que el diagnóstico
 * empieza por el lugar equivocado. Pasó dos veces en una sola sesión.
 */
const checkTcp = (host, port) =>
  new Promise(resolveCheck => {
    const socket = net.connect({ host, port })

    const done = ok => {
      socket.destroy()
      resolveCheck(ok)
    }

    socket.setTimeout(2500)
    socket.once('connect', () => done(true))
    socket.once('error', () => done(false))
    socket.once('timeout', () => done(false))
  })

const host = parsed.GREENHOUSE_POSTGRES_HOST
const port = Number(parsed.GREENHOUSE_POSTGRES_PORT ?? 5432)

if (host && (host === '127.0.0.1' || host === 'localhost')) {
  const reachable = await checkTcp(host, port)

  if (!reachable) {
    console.error(`[test:live] No hay nada escuchando en ${host}:${port}.`)
    console.error('[test:live] Los live tests usan el Cloud SQL Proxy para el perfil `ops` (limpieza).')
    console.error('[test:live] Levántalo con:')
    console.error('[test:live]   cloud-sql-proxy "efeonce-group:us-east4:greenhouse-pg-dev" --port 15432')
    process.exit(1)
  }
}

const args = process.argv.slice(2)

const result = spawnSync('pnpm', ['exec', 'vitest', 'run', '--project', 'live', ...args], {
  stdio: 'inherit',
  env: { ...process.env, ...parsed }
})

process.exit(result.status ?? 1)
