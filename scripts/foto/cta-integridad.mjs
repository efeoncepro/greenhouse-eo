// Integridad de las salidas de `pnpm foto:componer:cta`: huellas, QA por plan, escritura atómica y bloqueo de carpeta.
//
// Existe por la auditoría adversarial del 2026-09-23 (hallazgo bloqueante): el gate decidía si un QA estaba vigente
// comparando FECHAS de archivo, todos los planes de una carpeta compartían `out/qa.json` y dos composiciones
// simultáneas se mezclaban. Resultado verificado: el gate certificó en verde piezas de OTRO plan, un QA viejo tras
// cambiar el plate, y en 7 de 8 corridas concurrentes, archivos empalmados. Ahora cada pieza del QA lleva huellas del
// contenido —su definición en el plan, el plate, el comando y el PNG— y el gate las RECALCULA: ninguna fecha decide.
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

export const REPO = fileURLToPath(new URL('../../', import.meta.url))

export const sha = datos => createHash('sha256').update(datos).digest('hex')

// JSON con claves ordenadas: la misma pieza da la misma huella aunque el plan reordene sus campos.
export const estable = v =>
  Array.isArray(v)
    ? `[${v.map(estable).join(',')}]`
    : v && typeof v === 'object'
      ? `{${Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => `${JSON.stringify(k)}:${estable(v[k])}`).join(',')}}`
      : JSON.stringify(v)

export const huellaPieza = pieza => sha(estable(pieza))

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

    if (pid == null) continue // se soltó entre medio: se reintenta
    if (pid !== process.pid && vivo(pid)) throw new Error(`otra composición usa ${dirOut} (proceso ${pid}). Espera a que termine: dos composiciones en la misma carpeta se mezclan.`)

    try {
      fs.writeFileSync(reclamo, String(process.pid), { flag: 'wx' })
    } catch (e) {
      if (e.code !== 'EEXIST') throw e
      // Otro proceso está reclamando. Si su reclamo quedó huérfano (murió en medio), se limpia; si no, se espera.
      const quien = leerPid(reclamo)

      if (quien != null && !vivo(quien)) fs.rmSync(reclamo, { force: true })
      esperar(25)
      continue
    }

    try {
      if (leerPid(ruta) === pid) fs.rmSync(ruta, { force: true })
    } finally {
      fs.rmSync(reclamo, { force: true })
    }
  }

  throw new Error(`no se pudo tomar el bloqueo de ${dirOut}`)
}
