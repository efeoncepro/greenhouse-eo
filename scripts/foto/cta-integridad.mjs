// Integridad de las salidas de `pnpm foto:componer:cta`: huellas, QA por plan, escritura atómica y bloqueo de carpeta.
//
// Existe por la auditoría adversarial del 2026-09-23 (hallazgo bloqueante): el gate decidía si un QA estaba vigente
// comparando FECHAS de archivo, todos los planes de una carpeta compartían `out/qa.json` y dos composiciones
// simultáneas se mezclaban. Resultado verificado: el gate certificó en verde piezas de OTRO plan, un QA viejo tras
// cambiar el plate, y en 7 de 8 corridas concurrentes, archivos empalmados. Ahora cada pieza del QA lleva huellas del
// contenido —su definición en el plan, el plate, el comando y el PNG— y el gate las RECALCULA: ninguna fecha decide.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

export const REPO = fileURLToPath(new URL('../../', import.meta.url))

export const sha = datos => createHash('sha256').update(datos).digest('hex')

// ── Identidad de la suite de pruebas (tramo 10; auditorías de arquitectura, hallazgo 3, y de diseño, hallazgo 6) ────────
// El aprobador `soloPruebas` valía en cualquier plan cuya ruta no EMPEZARA con la del repo: con otras mayúsculas, por un
// enlace simbólico o con `--origen`, un plan del repo lo usaba (el repo responde también a /USERS/JREYE/…). Ahora decide
// la ruta REAL —resuelve enlaces y, en macOS, las mayúsculas— y, además, una marca que sólo pone la suite: `.suite-pruebas`
// junto al plan, con el mismo valor que la suite exporta en `FOTO_SUITE_NONCE`. Un plan fuera del repo sin esa marca (un
// piloto en OneDrive) tampoco lo usa.
export const MARCA_SUITE = '.suite-pruebas'

export const rutaReal = p => {
  try {
    return fs.realpathSync.native(p)
  } catch {
    return path.resolve(p)
  }
}

const INSENSIBLE = process.platform === 'darwin' || process.platform === 'win32'
const normal = p => (INSENSIBLE ? p.toLowerCase() : p)

// ¿La ruta (un plan que existe) está dentro del repo? Por su ruta real, no por cómo se escribió.
export const dentroDelRepo = p => {
  const repo = normal(rutaReal(REPO)).replace(/[/\\]+$/, '')
  const r = normal(rutaReal(p))

  return r === repo || r.startsWith(repo + path.sep)
}

// La marca vale en la carpeta del plan o en una superior (la suite la deja en la raíz de su temporal).
export function marcaDeSuite(dirPlan) {
  const nonce = process.env.FOTO_SUITE_NONCE

  if (!nonce || nonce.length < 32) return false

  for (let d = rutaReal(dirPlan); ; d = path.dirname(d)) {
    try {
      if (fs.readFileSync(path.join(d, MARCA_SUITE), 'utf8').trim() === nonce) return true
    } catch {
      // sin marca aquí: se sigue hacia arriba
    }

    if (path.dirname(d) === d) return false
  }
}

// JSON con claves ordenadas: la misma pieza da la misma huella aunque el plan reordene sus campos.
export const estable = v =>
  Array.isArray(v)
    ? `[${v.map(estable).join(',')}]`
    : v && typeof v === 'object'
      ? `{${Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => `${JSON.stringify(k)}:${estable(v[k])}`).join(',')}}`
      : JSON.stringify(v)

export const huellaPieza = pieza => sha(estable(pieza))

// ── Canon por pieza (tramo 11; decisiones del operador del 2026-09-23) ────────────────────────────────────────────
// Las piezas APROBADAS al corte siguen con las reglas de entonces (canon 2026-09-22); todo lo demás nace con el canon
// vigente. Una pieza aprobada se reconoce por su huella —su definición en el plan SIN la ruta del plate, más el sha256
// del plate—, no por un campo que el plan pueda omitir: así nadie esquiva el canon nuevo, y una pieza aprobada que se
// edita pasa a ser nueva. El registro es una foto del corte (`canon-anterior.json`): no se regenera.
export const CANON_ANTERIOR = '2026-09-22'
export const CANON_VIGENTE = '2026-09-23'
export const REGISTRO_CANON = 'scripts/foto/canon-anterior.json'
export const huellaSinPlate = pieza => sha(estable({ ...pieza, plate: undefined }))

const registros = new Map()

// El registro del canon se lee del árbol de trabajo: una pieza nueva agregada sin commit se juzgaba con el canon anterior
// (tramo 12; auditoría de arquitectura de la cuarta certificación). El gate no certifica con un registro que difiere del
// commit vigente (o que no se puede comparar).
let alteradoCanon

export function registroCanonAlterado() {
  if (alteradoCanon !== undefined) return alteradoCanon

  try {
    alteradoCanon = execFileSync('git', ['show', `HEAD:${REGISTRO_CANON}`], { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64e6 }) !== fs.readFileSync(path.join(REPO, REGISTRO_CANON), 'utf8')
  } catch {
    alteradoCanon = true
  }

  return alteradoCanon
}

// `registro`: otra ruta del registro, sólo para las pruebas unitarias.
export function canonDe(pieza, plateSha, registro = path.join(REPO, REGISTRO_CANON)) {
  if (!registros.has(registro)) registros.set(registro, new Set(JSON.parse(fs.readFileSync(registro, 'utf8')).piezas.map(x => `${x.plate}:${x.pieza}`)))

  return registros.get(registro).has(`${plateSha}:${huellaSinPlate(pieza)}`) ? CANON_ANTERIOR : CANON_VIGENTE
}

// Huella del COMANDO: su código y el de sus dependencias locales, más las versiones de los paquetes que deciden la
// geometría y el color. Si cambia, la pieza se compuso con otras reglas. El compositor se hashea desde el archivo que
// CORRE (`compositor`), no desde la ruta canónica: así una copia o un mutante del comando no se hace pasar por él.
export const COMPOSITOR = 'scripts/foto/componer-cta.mjs'

const DEPENDENCIAS = [
  'scripts/foto/accesibilidad.mjs',
  'scripts/foto/cta-variantes.mjs',
  'scripts/foto/cta-esquema.mjs',
  'scripts/foto/cta-integridad.mjs',
  'scripts/foto/cta-invariantes.mjs',
  'scripts/foto/svg-texto.mjs',
  // El registro del canon decide qué reglas aplica el compositor: si cambia, cambian las piezas (tramo 11).
  'scripts/foto/canon-anterior.json',
  'scripts/creative/layout-compiler/axis-advertising.mjs',
  'scripts/creative/layout-compiler/compiler.mjs',
  'scripts/creative/layout-compiler/contract.mjs'
]

export const ACTIVOS = [
  'src/assets/fonts/BricolageGrotesque-Variable.ttf',
  'src/assets/fonts/Poppins-Regular.ttf',
  'src/assets/fonts/Poppins-Medium.ttf',
  'src/assets/fonts/Poppins-SemiBold.ttf',
  'src/assets/fonts/Poppins-Bold.ttf',
  'public/branding/logo-full.svg',
  'public/branding/logo-negative.svg',
  'src/lib/artifact-composer/catalogs/deck-axis/assets/url-lum.svg'
]

const PAQUETES = ['@efeoncepro/axis-tokens', '@efeoncepro/axis-ui-contracts', 'sharp', 'fontkit', '@imgly/background-removal-node', 'zod']

export const versionPaquete = nombre => {
  try {
    return JSON.parse(fs.readFileSync(path.join(REPO, 'node_modules', nombre, 'package.json'), 'utf8')).version
  } catch {
    return 'desconocida'
  }
}

export function huellaComando({ compositor = path.join(REPO, COMPOSITOR) } = {}) {
  const partes = [`compositor:${sha(fs.readFileSync(compositor))}`, ...DEPENDENCIAS.map(f => `${f}:${sha(fs.readFileSync(path.join(REPO, f)))}`)]

  for (const p of PAQUETES) partes.push(`${p}@${versionPaquete(p)}`)
  // Tramo 9 (auditoría de arquitectura, hallazgo 13): las fuentes, los logos y el SVG de la firma web deciden el píxel
  // igual que el código. Guttery (fuera del repo) no entra: sólo la usa el gesto, que no se certifica.
  for (const f of ACTIVOS) partes.push(`${f}:${fs.existsSync(path.join(REPO, f)) ? sha(fs.readFileSync(path.join(REPO, f))) : 'ausente'}`)

  return sha(partes.join('\n'))
}

// Un QA POR PLAN: dos planes en la misma carpeta ya no se pisan el registro.
export const rutaQa = (dirOut, planPath) => path.join(dirOut, `qa-${path.basename(planPath, '.json')}.json`)

// Escritura atómica: se escribe a un temporal y se renombra. Una composición que falla o compite con otra nunca deja
// un archivo a medias ni empalmado.
export function escribirAtomico(ruta, datos) {
  const tmp = `${ruta}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`

  fs.mkdirSync(path.dirname(ruta), { recursive: true })
  fs.writeFileSync(tmp, datos)
  fs.renameSync(tmp, ruta)
}

// Bloqueo por carpeta de salida: dos composiciones en la misma `out/` no pueden correr a la vez.
//
// Tramo 9 (auditoría de arquitectura, N8): reclamar el bloqueo de un proceso muerto tenía una carrera —dos procesos
// veían el mismo bloqueo muerto, el primero lo borraba y tomaba uno nuevo, y el segundo borraba ESE (medido: 3 de 60
// corridas con dos dueños; con 6 procesos, 16 de 40)—. Ahora sólo quien toma el RECLAMO (`.reclamo`, creado con `wx`,
// atómico) puede borrar el bloqueo muerto, y antes verifica que sigue siendo el mismo (el mismo pid muerto). Y el
// bloqueo se suelta también con Ctrl-C, SIGTERM y SIGHUP: antes Ctrl-C lo dejaba tomado.
const leerPid = ruta => {
  try {
    return Number(fs.readFileSync(ruta, 'utf8')) || null
  } catch {
    return null
  }
}

const vivo = pid => {
  try {
    process.kill(pid, 0)

    return true
  } catch (e) {
    return e.code === 'EPERM'
  }
}

const esperar = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)

// Un bloqueo o un reclamo VACÍO es de un proceso que murió entre crear el archivo y escribir su pid (p. ej. con el disco
// lleno): pasado este plazo se reclama como uno de un proceso muerto. Antes dejaba la carpeta tomada para siempre, con
// «no se pudo tomar el bloqueo» y sin nombrar el archivo (tramo 10; auditoría de arquitectura, hallazgo 15).
const HUERFANO_MS = 10e3

const edad = ruta => {
  try {
    return Date.now() - fs.statSync(ruta).mtimeMs
  } catch {
    return 0
  }
}

// La ruta de ESTE archivo: la prueba de señales la carga en un proceso hijo (y así prueba también a un mutante).
export const RUTA_MODULO = fileURLToPath(import.meta.url)
const SENALES = { SIGINT: 130, SIGTERM: 143, SIGHUP: 129 }

export function tomarBloqueo(dirOut) {
  const ruta = path.join(dirOut, '.componer.lock')
  const reclamo = `${ruta}.reclamo`

  fs.mkdirSync(dirOut, { recursive: true })

  for (let intento = 0; intento < 40; intento++) {
    try {
      fs.writeFileSync(ruta, String(process.pid), { flag: 'wx' })

      const soltar = () => {
        if (leerPid(ruta) === process.pid) fs.rmSync(ruta, { force: true })
      }

      process.on('exit', soltar)
      for (const [senal, codigo] of Object.entries(SENALES)) process.once(senal, () => { soltar(); process.exit(codigo) })

      return soltar
    } catch (e) {
      if (e.code !== 'EEXIST') throw e
    }

    const pid = leerPid(ruta)

    // Sin pid: o se soltó entre medio, o otro proceso lo está escribiendo (milisegundos), o quedó huérfano.
    if (pid == null && (!fs.existsSync(ruta) || edad(ruta) < HUERFANO_MS)) {
      esperar(25)
      continue
    }

    if (pid != null && pid !== process.pid && vivo(pid)) throw new Error(`otra composición usa ${dirOut} (proceso ${pid}). Espera a que termine: dos composiciones en la misma carpeta se mezclan.`)

    try {
      fs.writeFileSync(reclamo, String(process.pid), { flag: 'wx' })
    } catch (e) {
      if (e.code !== 'EEXIST') throw e
      // Otro proceso está reclamando. Si su reclamo quedó huérfano (murió en medio), se limpia; si no, se espera.
      const quien = leerPid(reclamo)

      if ((quien != null && !vivo(quien)) || (quien == null && edad(reclamo) >= HUERFANO_MS)) fs.rmSync(reclamo, { force: true })
      esperar(25)
      continue
    }

    try {
      if (leerPid(ruta) === pid) fs.rmSync(ruta, { force: true })
    } finally {
      fs.rmSync(reclamo, { force: true })
    }
  }

  throw new Error(`no se pudo tomar el bloqueo de ${dirOut}: \`${ruta}\` sigue tomado${leerPid(ruta) == null ? ' y vacío' : ` por el proceso ${leerPid(ruta)}`}. Si no hay otra composición corriendo en esa carpeta, bórralo.`)
}
