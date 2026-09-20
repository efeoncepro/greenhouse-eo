/**
 * `pnpm foto:doctor` — dice si esta máquina puede producir una foto de marca, y si no, qué falta.
 *
 * Existe porque la credencial es lo único del pipeline que NO viaja con el repo: los comandos, los
 * bloques, la tabla de formatos y los umbrales están versionados, pero `.env.local` está gitignored y
 * las ADC de gcloud expiran. Sin esto, un agente en una máquina nueva choca contra un error de
 * resolución de secreto y no sabe si le falta la variable, el permiso o simplemente re-autenticar.
 *
 * No lista variables: **ejercita la cadena**. Una variable presente no prueba que el secreto resuelva,
 * y un secreto que resuelve no prueba que la clave sirva. Cada chequeo hace la operación real.
 *
 * Uso:
 *   pnpm foto:doctor            # diagnóstico (no gasta: la verificación de clave usa /v1/models, gratis)
 *   pnpm foto:doctor --json     # salida para encadenar
 *
 * Sale con código 1 si algo bloquea la generación.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { config as loadEnv } from 'dotenv'

import { resolveSecret } from '@/lib/secrets/secret-manager'

// Igual que `pnpm ai:image`: sin esto, `resolveSecret` lee un process.env sin la referencia y el
// diagnóstico culpa al secreto cuando el problema es que nadie cargó el archivo. Me pasó al escribirlo.
loadEnv({ path: path.join(process.cwd(), '.env.local') })

type Estado = 'ok' | 'falla' | 'aviso'

interface Chequeo {
  nombre: string
  estado: Estado
  detalle: string
  arreglo?: string
  bloquea: boolean
}

const raiz = path.resolve(__dirname, '../..')

const main = async () => {

  const chequeos: Chequeo[] = []

  const añadir = (c: Chequeo) => {
    chequeos.push(c)

    return c.estado === 'ok'
  }

  // ── 1. Los bloques de prompt están y no traen un valor de formato adentro ────────────────────────
  const BLOQUES = path.join(raiz, 'scripts/foto/bloques')
  const archivos = ['bloque-realismo-v2.txt', 'bloque-impacto-v1.txt']
  const faltantes = archivos.filter(f => !existsSync(path.join(BLOQUES, f)))

  if (faltantes.length) {
    añadir({
      nombre: 'Bloques de prompt',
      estado: 'falla',
      detalle: `faltan en scripts/foto/bloques/: ${faltantes.join(', ')}`,
      arreglo: 'git checkout scripts/foto/bloques/',
      bloquea: true
    })
  } else {
    // La misma guarda que `foto:prompt`: un valor de UN formato dentro de un bloque que corre en TODOS.
    const sucio = archivos
      .map(f => ({ f, m: readFileSync(path.join(BLOQUES, f), 'utf8').match(/\b(?:Vertical|Horizontal|Square)\s+\d+:\d+|bottom\s+\d+%/i) }))
      .find(x => x.m)

    añadir(
      sucio
        ? {
            nombre: 'Bloques de prompt',
            estado: 'falla',
            detalle: `"${sucio.f}" contiene un valor de un formato concreto ("${sucio.m?.[0]}")`,
            arreglo: 'Sacá esa frase del archivo: el formato sale de la tabla de foto:prompt, nunca de un bloque reusado.',
            bloquea: true
          }
        : { nombre: 'Bloques de prompt', estado: 'ok', detalle: `${archivos.length} presentes y sin valores de formato`, bloquea: false }
    )
  }

  // ── 2. sharp, que es lo que mide ─────────────────────────────────────────────────────────────────
  try {
    const sharp = (await import('sharp')).default

    añadir({ nombre: 'sharp (medición)', estado: 'ok', detalle: `disponible · libvips ${sharp.versions.vips}`, bloquea: false })
  } catch (error) {
    añadir({
      nombre: 'sharp (medición)',
      estado: 'falla',
      detalle: error instanceof Error ? error.message : String(error),
      arreglo: 'pnpm install',
      bloquea: true
    })
  }

  // ── 3. ADC de gcloud vigentes ────────────────────────────────────────────────────────────────────
  // Se ejercita pidiendo un token de verdad: que el archivo de credenciales exista no prueba que sirva.
  let adcOk = false

  try {
    execFileSync('gcloud', ['auth', 'application-default', 'print-access-token'], { stdio: 'pipe', timeout: 30_000 })
    adcOk = añadir({ nombre: 'ADC de gcloud', estado: 'ok', detalle: 'token emitido', bloquea: false })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)

    añadir({
      nombre: 'ADC de gcloud',
      estado: 'falla',
      detalle: /ENOENT/.test(msg) ? 'el CLI `gcloud` no está instalado' : 'no emite token (expiradas o sin configurar)',
      arreglo: 'pnpm gcloud:auth:playwright -- --force   (renueva los DOS planos: CLI y ADC)',
      bloquea: true
    })
  }

  // ── 4. La referencia al secreto está declarada ───────────────────────────────────────────────────
  const envLocal = path.join(raiz, '.env.local')
  const tieneEnv = existsSync(envLocal)
  const env = tieneEnv ? readFileSync(envLocal, 'utf8') : ''
  const declarada = /^OPENAI_API_KEY(_SECRET_REF)?=\s*\S/m.test(env) || Boolean(process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_SECRET_REF)

  añadir(
    declarada
      ? { nombre: 'Referencia al secreto', estado: 'ok', detalle: 'OPENAI_API_KEY_SECRET_REF u OPENAI_API_KEY declarada', bloquea: false }
      : {
          nombre: 'Referencia al secreto',
          estado: 'falla',
          detalle: tieneEnv ? '.env.local existe pero no declara OPENAI_API_KEY_SECRET_REF' : '.env.local no existe',
          arreglo:
            'Copiá .env.example a .env.local y poné OPENAI_API_KEY_SECRET_REF="greenhouse-openai-api-key" (el NOMBRE del secreto, nunca la clave cruda). .env.local está gitignored por diseño.',
          bloquea: true
        }
  )

  // ── 5. El secreto resuelve de verdad ─────────────────────────────────────────────────────────────
  let clave: string | null = null

  if (declarada && adcOk) {
    try {
      const r = await resolveSecret({ envVarName: 'OPENAI_API_KEY' })

      clave = r.value
      añadir(
        clave
          ? { nombre: 'Secreto resuelto', estado: 'ok', detalle: `vía ${r.source} · ${clave.length} caracteres (nunca se imprime)`, bloquea: false }
          : { nombre: 'Secreto resuelto', estado: 'falla', detalle: 'resolvió a vacío', arreglo: 'Verificá que el secreto exista y tenga una versión habilitada.', bloquea: true }
      )
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error)

      añadir({
        nombre: 'Secreto resuelto',
        estado: 'falla',
        detalle: msg.slice(0, 160),
        arreglo: /permission|denied|403/i.test(msg)
          ? 'Tu cuenta no tiene acceso al secreto. Pedile al operador el rol secretAccessor sobre greenhouse-openai-api-key.'
          : 'pnpm gcloud:auth:playwright -- --force y reintentá.',
        bloquea: true
      })
    }
  } else {
    añadir({ nombre: 'Secreto resuelto', estado: 'aviso', detalle: 'no se probó: falta un paso anterior', bloquea: false })
  }

  // ── 6. La clave SIRVE (gratis: /v1/models no cobra) ──────────────────────────────────────────────
  // Que el secreto resuelva no prueba que la clave sea válida: puede estar revocada o rotada a medias.
  if (clave) {
    try {
      const res = await fetch('https://api.openai.com/v1/models', { headers: { Authorization: `Bearer ${clave}` } })

      añadir(
        res.ok
          ? { nombre: 'Clave aceptada por OpenAI', estado: 'ok', detalle: 'HTTP 200 en /v1/models (sin costo)', bloquea: false }
          : {
              nombre: 'Clave aceptada por OpenAI',
              estado: 'falla',
              detalle: `HTTP ${res.status}`,
              arreglo:
                res.status === 401
                  ? 'La clave está revocada o mal publicada. Rotar con `pnpm secrets:rotate` y publicar el escalar crudo, sin comillas ni \\n.'
                  : 'Reintentá; si persiste, revisá el estado de la cuenta de OpenAI.',
              bloquea: true
            }
      )
    } catch (error) {
      añadir({
        nombre: 'Clave aceptada por OpenAI',
        estado: 'aviso',
        detalle: `no se pudo consultar: ${error instanceof Error ? error.message : String(error)}`.slice(0, 140),
        arreglo: 'Suele ser red o proxy. No bloquea el diagnóstico del resto.',
        bloquea: false
      })
    }
  }

  // ── Salida ───────────────────────────────────────────────────────────────────────────────────────
  // ── Assets del catálogo contra el lock de huellas ───────────────────────────────────────────────
  // Los renders de referencia y los kits pesan 640 MB y viven fuera de git, así que una copia local
  // puede diferir de la aprobada sin que nada lo note y la pieza saldría con una referencia que el
  // equipo no aprobó. Faltar NO bloquea (en una máquina sin el set se puede preparar igual); diferir
  // SÍ, porque generaría con la referencia equivocada.
  try {
    const { verificar } = await import('./assets-lock.mjs')
    const r = verificar()

    if (r.sinLock) {
      añadir({
        nombre: 'Assets del catálogo',
        estado: 'aviso',
        detalle: 'sin assets.lock.json',
        arreglo: 'pnpm foto:assets:lock',
        bloquea: false
      })
    } else if (r.sinDeclarar.length) {
      añadir({
        nombre: 'Assets del catálogo',
        estado: 'falla',
        detalle: `${r.sinDeclarar.length} vista(s) del catálogo no están en el lock`,
        arreglo: 'pnpm foto:assets:lock && commitear',
        bloquea: true
      })
    } else if (r.cambiados.length) {
      añadir({
        nombre: 'Assets del catálogo',
        estado: 'falla',
        detalle: `${r.cambiados.length} asset(s) difieren del aprobado: ${r.cambiados[0]}`,
        arreglo: 'restaura la copia buena, o pnpm foto:assets:lock si el cambio es intencional',
        bloquea: true
      })
    } else if (r.faltanEnDisco.length) {
      añadir({
        nombre: 'Assets del catálogo',
        estado: 'aviso',
        detalle: `${r.faltanEnDisco.length} no están en esta máquina (se pueden bajar de OneDrive)`,
        bloquea: false
      })
    } else {
      añadir({ nombre: 'Assets del catálogo', estado: 'ok', detalle: 'coinciden con el lock', bloquea: false })
    }
  } catch (e) {
    añadir({
      nombre: 'Assets del catálogo',
      estado: 'aviso',
      detalle: `no se pudo verificar: ${(e as Error).message.slice(0, 60)}`,
      bloquea: false
    })
  }

  const bloqueantes = chequeos.filter(c => c.estado === 'falla' && c.bloquea)

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ puedeGenerar: bloqueantes.length === 0, chequeos }, null, 2))
  } else {
    const icono = { ok: '✓', falla: '✗', aviso: '·' } as const

    console.log('\n  Fotografía de marca Efeonce — ¿puede esta máquina producir un plate?\n')
    for (const c of chequeos) console.log(`  ${icono[c.estado]} ${c.nombre.padEnd(28)} ${c.detalle}`)

    const conArreglo = chequeos.filter(c => c.estado !== 'ok' && c.arreglo)

    if (conArreglo.length) {
      console.log('\n  Qué hacer:')
      for (const c of conArreglo) console.log(`    · ${c.nombre}: ${c.arreglo}`)
    }

    console.log(
      bloqueantes.length === 0
        ? '\n  Listo para `pnpm ai:image`.\n'
        : `\n  ${bloqueantes.length} bloqueo(s). \`pnpm foto:prompt\` y \`pnpm foto:validar\` funcionan igual: no necesitan credencial.\n`
    )
  }

  if (bloqueantes.length) process.exitCode = 1
}

void main()
