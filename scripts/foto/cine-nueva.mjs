// pnpm foto:cine:nueva — una ficha cine nueva parte SIEMPRE de una foto cine aprobada, nunca de cero.
//
//   pnpm foto:cine:nueva --listar
//   pnpm foto:cine:nueva --desde NX7d --id NX8 --dir ai-generations/2026-10-03_mi-corrida [--formato 9:16] [--alcance social-nexa]
//
// Copia la ficha aprobada con su estructura (formato, palanca, atmósfera, identidad, objetos, lecho, reservas),
// cambia el id, declara `registro: "cine"` y `desde`, y deja la escena marcada para reescribir. Los campos del
// oficio (`llave`, `primerPlano`, `fondo`, `fenomeno`, `alcance`) se conservan si la receta los trae; si no, se
// listan en `__completar` y `foto:prompt` avisa hasta que estén. Casebook:
// docs/operations/brand-photography/EFEONCE_PHOTO_CINE_CASEBOOK_V1.md
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const indice = JSON.parse(readFileSync(path.join(raiz, 'scripts/foto/cine-recetas.json'), 'utf8'))

export const CAMPOS_CINE = ['alcance', 'llave', 'primerPlano', 'fondo', 'fenomeno']

export const nuevaFichaDesde = (receta, original, id, { formato, alcance } = {}) => {
  const ficha = { ...original, id, registro: 'cine', desde: receta.id }

  // Cambiar el formato cambia la geometría: las reservas de la receta ya no sirven y se reescriben.
  if (formato && formato !== original.formato) {
    ficha.formato = formato
    delete ficha.reservas
    ficha.__completar = ['reservas']
  }

  if (alcance) ficha.alcance = alcance

  ficha.escena = `REESCRIBIR — escena de la receta ${receta.id}, como punto de partida: ${original.escena}`
  if (!ficha.alcance && receta.alcance) ficha.alcance = receta.alcance

  const faltan = [...(ficha.__completar ?? []), ...CAMPOS_CINE.filter(c => ficha[c] == null)]

  if (faltan.length) ficha.__completar = faltan
  else delete ficha.__completar

  delete ficha.piloto

  return ficha
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  const args = process.argv.slice(2)

  const valor = flag => {
    const i = args.indexOf(flag)

    return i >= 0 ? args[i + 1] : undefined
  }

  if (args.includes('--listar') || !args.length) {
    console.log('Fotos cine aprobadas (parte de la más cercana a tu caso):\n')

    for (const r of indice.recetas) {
      console.log(`  ${r.id.padEnd(5)} ${r.formato.padEnd(5)} ${r.alcance.padEnd(18)} ${r.protagonista}`)
      console.log(`        ${r.porque}`)
      if (r.isotipoPintado) console.log('        ⚠ isotipo pintado: receta de luz y escena, no de bordado')
      if (r.ojo) console.log(`        ⚠ ${r.ojo}`)
    }

    console.log('\nUso: pnpm foto:cine:nueva --desde <id> --id <nuevo-id> --dir <carpeta de la corrida> [--formato 9:16] [--alcance social-nexa]')
    process.exit(0)
  }

  const desde = valor('--desde')
  const id = valor('--id')
  const dir = valor('--dir')
  const receta = indice.recetas.find(r => r.id === desde)

  if (!receta) {
    console.error(`No hay receta cine "${desde}". Corre \`pnpm foto:cine:nueva --listar\`.`)
    process.exit(2)
  }

  if (!id || !dir) {
    console.error('Faltan --id y --dir. Ejemplo: --desde NX7d --id NX8 --dir ai-generations/2026-10-03_mi-corrida')
    process.exit(2)
  }

  const origen = path.join(raiz, receta.ficha)

  if (!existsSync(origen)) {
    console.error(`La ficha de ${receta.id} no está en disco (${receta.ficha}). Si ai-generations/ está archivado, tráela con \`pnpm ai-gen:pull\`.`)
    process.exit(1)
  }

  const destinoDir = path.resolve(raiz, dir, 'fichas')
  const destino = path.join(destinoDir, `${id}.json`)

  if (existsSync(destino)) {
    console.error(`Ya existe ${destino}: no se sobrescribe.`)
    process.exit(1)
  }

  mkdirSync(destinoDir, { recursive: true })

  const ficha = nuevaFichaDesde(receta, JSON.parse(readFileSync(origen, 'utf8')), id, { formato: valor('--formato'), alcance: valor('--alcance') })

  writeFileSync(destino, `${JSON.stringify(ficha, null, 2)}\n`)
  const mostrar = p => (path.relative(raiz, p).startsWith('..') ? p : path.relative(raiz, p))

  console.log(`✓ ${mostrar(destino)} (desde ${receta.id})`)
  if (ficha.__completar) console.log(`  completa: ${ficha.__completar.join(', ')} — y reescribe la escena.`)
  console.log('  Luego: pnpm foto:prompt <ficha> · agente cine-reviewer · pnpm foto:generar <ficha> --quality high')
}
