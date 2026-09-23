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

const REPO = fileURLToPath(new URL('../../', import.meta.url))

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
const COMPOSITOR = 'scripts/foto/componer-cta.mjs'

const DEPENDENCIAS = [
  'scripts/foto/accesibilidad.mjs',
  'scripts/foto/cta-variantes.mjs',
  'scripts/foto/cta-esquema.mjs',
  'scripts/foto/cta-integridad.mjs',
  'scripts/creative/layout-compiler/axis-advertising.mjs',
  'scripts/creative/layout-compiler/compiler.mjs',
  'scripts/creative/layout-compiler/contract.mjs'
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

// Bloqueo por carpeta de salida: dos composiciones en la misma `out/` no pueden correr a la vez. Un bloqueo de un
// proceso que ya no existe se toma (quedó de una corrida que murió).
export function tomarBloqueo(dirOut) {
  const ruta = path.join(dirOut, '.componer.lock')

  fs.mkdirSync(dirOut, { recursive: true })

  for (let intento = 0; intento < 2; intento++) {
    try {
      fs.writeFileSync(ruta, String(process.pid), { flag: 'wx' })

      const soltar = () => {
        try {
          if (fs.readFileSync(ruta, 'utf8') === String(process.pid)) fs.rmSync(ruta, { force: true })
        } catch {
          // ya no está
        }
      }

      process.on('exit', soltar)

      return soltar
    } catch (e) {
      if (e.code !== 'EEXIST') throw e
      const pid = Number(fs.readFileSync(ruta, 'utf8'))
      let vivo = false

      try {
        process.kill(pid, 0)
        vivo = true
      } catch {
        vivo = false
      }

      if (vivo && pid !== process.pid) throw new Error(`otra composición usa ${dirOut} (proceso ${pid}). Espera a que termine: dos composiciones en la misma carpeta se mezclan.`)
      fs.rmSync(ruta, { force: true })
    }
  }

  throw new Error(`no se pudo tomar el bloqueo de ${dirOut}`)
}
