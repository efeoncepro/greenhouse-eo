// `pnpm foto:cta:gate <plan.json>` — verifica los mínimos de accesibilidad del CTA sobre el QA ya emitido.
//
// Existe porque el hueco que cierra NO se veía: en variante `solid` el compositor marcaba `skipContrast`
// y la clave `contraste.cta` nunca se escribía, así que el QA salía limpio **porque el dato no existía**,
// no porque hubiera pasado. Un gate que sólo mira las claves presentes no puede detectar una ausencia:
// por eso éste EXIGE la clave y falla si falta.
import { readFileSync, existsSync, statSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync, spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { fileURLToPath } from 'node:url'

import { axisAdvertising } from '@efeoncepro/axis-tokens'

import { CANON_ANTERIOR, CANON_VIGENTE, COMPOSITOR, REPO, canonDe, dentroDelRepo, estable, huellaComando, huellaPieza, marcaDeSuite, registroCanonAlterado, rutaQa, rutaReal, sha } from './cta-integridad.mjs'
import { fueraDeReserva, invariantesMaquetacion } from './cta-invariantes.mjs'
import { copiaEnEscena } from './accesibilidad.mjs'

// Ancho y alto de un PNG, leídos de su cabecera (IHDR): el gate verifica el tamaño ENTREGADO sin decodificar la imagen.
const dimensionesPng = b => (b.length >= 24 && b.readUInt32BE(12) === 0x49484452 ? [b.readUInt32BE(16), b.readUInt32BE(20)] : null)

// EXCEPCIONES AUDITADAS (tramo 4): una regla del canon puede exceptuarse en UNA pieza, declarando `excepciones:
// [{ regla, razon, aprobadoPor }]` en el plan. La excepción no apaga la medición: el gate la imprime con su razón y
// quién la aprobó, para que quien revise la vea. Sin excepción, la regla bloquea.
//
// Tramo 7 (auditoría de arquitectura, N7): una excepción vale sólo si (1) quien la aprueba está en el registro
// `scripts/foto/aprobadores.json`, (2) nombra el sha256 del plate para el que se aprobó —un plate regenerado se vuelve
// a aprobar— y (3), cuando la regla se mide con un número, declara `hasta`: el valor que aprueba. Antes una razón que
// decía «2 a 6 px» aprobaba un desborde de 956×724 px y cualquier texto servía de aprobador. Una excepción que no vale
// no apaga nada: la regla bloquea y el gate dice por qué.
const exceptuada = (p, regla) => (p.excepciones ?? []).find(e => e.regla === regla)
const TEXTO_APROBADORES = readFileSync(new URL('./aprobadores.json', import.meta.url), 'utf8')
const APROBADORES = JSON.parse(TEXTO_APROBADORES).aprobadores

// El registro se lee del árbol de trabajo: una edición sin commit —alguien que se agrega a sí mismo— aprobaba sin aviso
// (tramo 10; auditoría de arquitectura, hallazgo 16). Si difiere del commit vigente, una pieza que USA una aprobación no se
// certifica.
const registroAlterado = (() => {
  try {
    return execFileSync('git', ['show', 'HEAD:scripts/foto/aprobadores.json'], { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }) !== TEXTO_APROBADORES
  } catch {
    // Sin historial con qué comparar (una copia del repo sin git) no hay cómo saber si el registro es el del commit.
    return true
  }
})()

// ¿El plan es de la suite de pruebas? Su ruta REAL está fuera del repo y la suite dejó su marca al lado (tramo 10). Antes
// bastaba con que la ruta escrita no empezara con la del repo: con otras mayúsculas, un enlace o `--origen`, un plan del
// repo pasaba por uno de la suite.
const deLaSuite = () => {
  const origen = ORIGEN ?? path.resolve(plan)

  // También el plan que se juzga, no sólo el origen declarado: con `.origen` y los valores de entorno forjados a mano, un
  // plan del repo pasaba por uno de la suite (tramo 12; auditoría de arquitectura de la cuarta certificación).
  return !dentroDelRepo(origen) && !dentroDelRepo(path.resolve(plan)) && marcaDeSuite(path.dirname(origen))
}

// `null` si el aprobador vale; si no, por qué. Un aprobador `soloPruebas` vale únicamente en los planes de la suite.
const motivoAprobador = id => {
  const a = APROBADORES.find(x => x.id === id)

  if (!a) return `«${id}» no está en el registro de aprobadores (scripts/foto/aprobadores.json)`
  if (registroAlterado) noCertificable.push(`el registro de aprobadores (scripts/foto/aprobadores.json) tiene cambios sin commit: una aprobación no se certifica con un registro que no está en el historial`)

  return a.soloPruebas && !deLaSuite() ? `«${id}» sólo vale en los planes de la suite de pruebas` : null
}

const shaPlates = new Map()

const plateDe = p => {
  if (!shaPlates.has(p.id)) {
    const f = path.resolve(dir, p.plate)

    shaPlates.set(p.id, existsSync(f) ? sha(readFileSync(f)) : null)
  }

  return shaPlates.get(p.id)
}

const cifra = v => (Number.isFinite(v) ? v : 'sin medir')

// `medida`: { valor, sentido } cuando la regla se mide con un número; `min` = la medida no puede bajar de `hasta`,
// `max` = no puede pasarlo.
const bloquea = (p, regla, mensaje, medida = null) => {
  const e = exceptuada(p, regla)

  if (e) {
    const motivo = motivoAprobador(e.aprobadoPor)

    const invalida = motivo ? motivo
      : e.plate !== plateDe(p) ? `se aprobó para otro plate${e.plate ? '' : ' (no nombra ninguno)'}: declara \`plate: "${plateDe(p)}"\` si se re-aprueba para éste`
        : medida && typeof e.hasta !== 'number' ? `no declara \`hasta\`, el valor que aprueba (hoy la medida es ${cifra(medida.valor)})`
          : medida && !(medida.sentido === 'min' ? medida.valor >= e.hasta : medida.valor <= e.hasta) ? `la medida (${cifra(medida.valor)}) va más allá de lo aprobado (${medida.sentido === 'min' ? '≥' : '≤'} ${e.hasta})`
            : null

    if (!invalida) {
      console.warn(`⚠ ${p.id}: ${mensaje} — excepción auditada «${regla}»${medida ? ` (hasta ${e.hasta})` : ''}: ${e.razon} (aprobó ${e.aprobadoPor}).`)

      return false
    }

    console.error(`✗ ${p.id}: ${mensaje} — la excepción «${regla}» no vale: ${invalida}.`)

    return true
  }

  console.error(`✗ ${p.id}: ${mensaje}`)

  return true
}

// Salidas del canon que no se miden —pieza sin firma, concepto reducido—: exigen un aprobador del registro, y el gate
// las imprime para que quien revise las vea (antes pasaban sin aprobador y en silencio).
// Tramo 10: la aprobación nombra el plate (como las excepciones); con un plate regenerado se vuelve a aprobar.
const salidaAprobada = (p, que, declaracion) => {
  const motivo = declaracion?.aprobadoPor ? motivoAprobador(declaracion.aprobadoPor) : null

  if (!declaracion?.aprobadoPor) console.error(`✗ ${p.id}: ${que} sin aprobador del registro (declara \`aprobadoPor\`).`)
  else if (motivo) console.error(`✗ ${p.id}: ${que} sin aprobador válido: ${motivo}.`)
  else if (declaracion.plate !== plateDe(p)) console.error(`✗ ${p.id}: ${que} se aprobó para otro plate${declaracion.plate ? '' : ' (no nombra ninguno)'}: declara \`plate: "${plateDe(p)}"\` si se re-aprueba para éste.`)
  else {
    console.warn(`⚠ ${p.id}: ${que} — ${declaracion.razon} (aprobó ${declaracion.aprobadoPor}).`)

    return true
  }

  return false
}

// CÓDIGOS DE SALIDA (tramo 6): 0 certificado · 1 falla · 2 uso · 3 NO CERTIFICABLE. «No certificable» no es un pase
// ni una falla de la pieza: el gate no tiene cómo probar lo que certificaría —QA del formato anterior, pieza compuesta
// con otra versión del comando, máscara del sujeto sacada de una caché ajena o un elemento que nadie mide (el gesto
// manuscrito)—. Antes esos casos salían con 0 y «✓»: la auditoría de arquitectura certificó así 18 piezas de CMP-002
// sin una sola medición de accesibilidad, entre ellas KV-07-916, que el compositor vigente rechaza.
const noCertificable = []

const args = process.argv.slice(2)
const plan = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--comando')

// `--origen` era un flag público y cualquiera lo pasaba para que un plan del repo se juzgara como uno de la suite (tramo
// 10; auditorías de arquitectura, hallazgo 3, y de diseño, hallazgo 6). Ahora el origen es interno de `--reproducir`: el
// gate padre lo escribe en `.origen` junto a la copia temporal, con un valor aleatorio que sólo le pasa a su hijo.
if (args.includes('--origen')) { console.error('`--origen` ya no existe: es interno de `--reproducir`. Uso: pnpm foto:cta:gate <plan.json> [--reproducir]'); process.exit(2) }

const ORIGEN = (() => {
  const nonce = process.env.FOTO_GATE_ORIGEN_NONCE

  if (!nonce || !plan) return null

  try {
    const o = JSON.parse(readFileSync(path.join(path.dirname(path.resolve(plan)), '.origen'), 'utf8'))

    return o.nonce === nonce && typeof o.origen === 'string' ? o.origen : null
  } catch {
    return null
  }
})()

const REPRODUCIR = args.includes('--reproducir')
// `--comando <archivo>`: certifica contra OTRA versión del compositor (la suite de pruebas la usa con sus mutantes). Sin
// el flag, la vigente del repo.
const COMANDO = args.includes('--comando') ? path.resolve(args[args.indexOf('--comando') + 1]) : path.join(REPO, COMPOSITOR)

if (!plan) { console.error('uso: pnpm foto:cta:gate <plan.json> [--reproducir]'); process.exit(2) }

// Un compositor que no es el del repo no certifica (tramo 10; auditoría de arquitectura, hallazgo 9): con `--comando
// <mutante>` el gate decía «comando vigente» y salía con 0, también con `--reproducir`. Sólo la suite de pruebas juzga con
// otro comando (sus mutantes y la referencia de la regresión).
const COMANDO_CANONICO = rutaReal(COMANDO) === rutaReal(path.join(REPO, COMPOSITOR))

if (!COMANDO_CANONICO && !deLaSuite()) noCertificable.push(`se juzga con \`--comando ${COMANDO}\`, que no es el compositor del repo: sólo la suite de pruebas certifica con otro comando`)

const dir = path.dirname(path.resolve(plan))
const qaPlan = rutaQa(path.join(dir, 'out'), plan)

// CERTIFICACIÓN POR REPRODUCCIÓN (tramo 6; auditoría de arquitectura, N4). La huella del comando la escribe el propio
// compositor en el QA: un QA armado a mano, o una caché de máscaras envenenada con metadatos coherentes, la trae
// correcta y pasaba. Lo que no se falsifica es reproducir: se recompone el plan en un temporal con el comando VIGENTE
// y una segmentación nueva (caché vacía), cada PNG y layout entregado tiene que ser idéntico byte a byte al reproducido
// (P01 prueba que el compositor es determinista), y el veredicto es el de este gate sobre el QA reproducido.
if (REPRODUCIR) {
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'foto-certificar-'))
  let codigo = 1

  try {
    const piezasPlan = JSON.parse(readFileSync(path.resolve(plan), 'utf8')).map(p => ({ ...p, plate: path.resolve(dir, p.plate) }))
    const planTmp = path.join(tmp, path.basename(plan))

    writeFileSync(planTmp, JSON.stringify(piezasPlan, null, 2))
    const nonce = randomBytes(24).toString('hex')

    // El origen es SIEMPRE el plan que se certifica: heredado del entorno, un falso repo aprobaba un plan del repo (sexta, Y1).
    writeFileSync(path.join(tmp, '.origen'), JSON.stringify({ origen: path.resolve(plan), nonce }))
    console.log(`Reproduciendo ${piezasPlan.length} pieza(s) con el comando vigente y segmentación nueva…`)
    const c = spawnSync(process.execPath, [COMANDO, planTmp], { encoding: 'utf8', env: { ...process.env, FOTO_MASCARAS_DIR: path.join(tmp, '.mascaras') }, maxBuffer: 64e6 })

    if (c.status !== 0) {
      console.error(`✗ la reproducción no compuso: ${(String(c.stderr).match(/Error: ([^\n]+)/) ?? [null, 'ver la salida del compositor'])[1]}`)
    } else {
      const distintos = []

      // Lo ENTREGADO completo (tramo 10): el PNG, el layout, el texto alternativo y la fila del QA. Antes el `.alt.txt` y el
      // QA no se comparaban: reemplazarlos daba 0. De la fila se excluyen las huellas (la del plan cambia con la ruta del
      // plate en la copia; las demás se comparan archivo por archivo) y la máscara (su origen es otro por construcción).
      const qaDe = f => {
        try {
          return JSON.parse(readFileSync(f, 'utf8'))
        } catch {
          return []
        }
      }

      const qaEntregado = qaDe(rutaQa(path.join(dir, 'out'), plan))
      const qaReproducido = qaDe(rutaQa(path.join(tmp, 'out'), planTmp))

      const fila = (q, id) => {
        const r = q.find(x => x?.id === id)

        if (!r) return null
        const resto = { ...r }

        delete resto.huellas
        delete resto.mascara

        return estable(resto)
      }

      for (const p of piezasPlan.filter(p => p.cta)) {
        if (fila(qaEntregado, p.id) !== fila(qaReproducido, p.id)) distintos.push(`la fila de ${p.id} en el QA entregado`)

        for (const f of [`${p.id}.png`, `${p.id}-layout.json`, `${p.id}.alt.txt`]) {
          const entregado = path.join(dir, 'out', f)
          const reproducido = path.join(tmp, 'out', f)

          if (!existsSync(entregado)) distintos.push(`falta out/${f}`)
          else if (!existsSync(reproducido) || sha(readFileSync(entregado)) !== sha(readFileSync(reproducido))) distintos.push(`out/${f}`)
        }
      }

      if (distintos.length) {
        console.error(`✗ lo entregado no es lo que produce el comando vigente: ${distintos.join(', ')}. Recompón con \`pnpm foto:componer:cta ${plan}\`.`)
      } else {
        console.log('✓ lo entregado es idéntico a la reproducción. Veredicto sobre el QA reproducido:')
        codigo = spawnSync(process.execPath, [fileURLToPath(import.meta.url), planTmp, '--comando', COMANDO], { stdio: 'inherit', env: { ...process.env, FOTO_GATE_ORIGEN_NONCE: nonce } }).status ?? 1
      }
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }

  process.exit(codigo)
}

const qaLegado = path.join(dir, 'out', 'qa.json')

// QA POR PLAN, con huellas [2026-09-23]. El formato anterior (`out/qa.json` compartido por todos los planes de la
// carpeta, sin huellas) se sigue leyendo para no dejar a nadie sin gate, pero NO certifica: no hay cómo probar que
// sus números describen este plan, este plate y este PNG.
const legado = !existsSync(qaPlan)
const qaPath = legado ? qaLegado : qaPlan

if (!existsSync(qaPath)) { console.error(`✗ no existe ${qaPlan}. Corre \`pnpm foto:componer:cta ${plan}\` primero.`); process.exit(1) }

if (legado) {
  console.warn(`⚠ ${qaLegado} es del formato anterior (compartido y sin huellas): este gate no puede certificarlo. Recompón con \`pnpm foto:componer:cta ${plan}\` para certificar.`)
  noCertificable.push(`${qaLegado} es del formato anterior (compartido, sin huellas ni mediciones del trazo): no hay cómo probar que describe este plan, este plate y este PNG — recompón`)

  // 🔴 Una salida más vieja que el plan NO es la salida del plan [2026-09-22, CMP-002]. Sólo en el formato anterior:
  // el actual lo decide con huellas del contenido, que no dependen de la fecha de un archivo.
  if (statSync(qaPath).mtimeMs < statSync(path.resolve(plan)).mtimeMs) {
    console.error(
      `✗ ${qaPath} es anterior al plan: la última composición no terminó o no se corrió. ` +
        `Corre \`pnpm foto:componer:cta ${plan}\` y resuelve su error antes del gate.`
    )
    process.exit(1)
  }
}

const piezas = JSON.parse(readFileSync(path.resolve(plan), 'utf8'))
const qa = JSON.parse(readFileSync(qaPath, 'utf8'))
const conCta = new Set(piezas.filter(p => p.cta).map(p => p.id))

// 🔴 Una pieza del plan que NO está en el QA no pasó: no se compuso [2026-09-22]. El loop de abajo sólo recorre
// lo que el QA trae, así que una pieza ausente salía en verde por omisión — el mismo bug class que este archivo
// vino a cerrar («la ausencia ES el fallo»), a nivel de pieza.
const sinQa = [...conCta].filter(id => !qa.some(r => r.id === id))

if (sinQa.length) {
  console.error(`✗ piezas del plan sin QA (no se compusieron): ${sinQa.join(', ')}. Corre \`pnpm foto:componer:cta ${plan}\` completo.`)
  process.exitCode = 1
}

// 🔴 HUELLAS: el QA vale sólo para el plan, el plate y el PNG que lo produjeron [auditoría 2026-09-23]. Antes decidía
// una fecha de archivo, y el gate certificó en verde piezas de otro plan, un QA viejo tras cambiar el plate y salidas
// empalmadas por dos composiciones simultáneas. Cada huella se RECALCULA acá: si no coincide, el QA describe otra cosa.
// Reserva editorial rota, por pieza: se reporta con las reglas de contenido (no corta el gate como la integridad).
const reservasRotas = new Map()

if (!legado) {
  const comando = huellaComando({ compositor: COMANDO })

  for (const p of piezas.filter(p => p.cta)) {
    const h = qa.find(r => r.id === p.id)?.huellas

    if (!h) continue
    const fallas = []

    if (h.pieza !== huellaPieza(p)) fallas.push('el plan de la pieza cambió después de componer')
    const plate = path.resolve(dir, p.plate)

    if (!existsSync(plate)) fallas.push(`no existe el plate \`${p.plate}\``)
    else if (h.plate !== sha(readFileSync(plate))) fallas.push('el plate cambió después de componer')
    const png = path.join(dir, 'out', `${p.id}.png`)
    const layout = path.join(dir, 'out', `${p.id}-layout.json`)

    if (!existsSync(png)) fallas.push(`falta \`out/${p.id}.png\``)
    else if (h.png !== sha(readFileSync(png))) fallas.push(`\`out/${p.id}.png\` no es el PNG que registró la composición`)
    else {
      // El tamaño ENTREGADO (tramo 8; auditoría de arquitectura, N6): el `final` del plan o, sin él, el del plate.
      const dims = dimensionesPng(readFileSync(png))
      const esperado = p.final ?? (existsSync(layout) ? [JSON.parse(readFileSync(layout, 'utf8')).canvas.width, JSON.parse(readFileSync(layout, 'utf8')).canvas.height] : null)

      if (!dims) fallas.push(`\`out/${p.id}.png\` no es un PNG legible`)
      else if (esperado && (dims[0] !== esperado[0] || dims[1] !== esperado[1])) fallas.push(`\`out/${p.id}.png\` mide ${dims.join('×')} y el plan pide ${esperado.join('×')}`)
    }

    // El texto alternativo ENTREGADO (tramo 10; auditorías de arquitectura, hallazgo 8, y de diseño, N11).
    const alt = path.join(dir, 'out', `${p.id}.alt.txt`)

    if (!h.alt) noCertificable.push(`${p.id}: el QA no trae la huella del texto alternativo (versión anterior del comando) — recompón`)
    else if (!existsSync(alt)) fallas.push(`falta \`out/${p.id}.alt.txt\``)
    else if (h.alt !== sha(readFileSync(alt))) fallas.push(`\`out/${p.id}.alt.txt\` no es el texto alternativo que registró la composición`)

    // Tramo 3: el layout también lleva huella, porque el gate recalcula las invariantes de maquetación sobre él.
    if (!h.layout) fallas.push('el QA no trae la huella del layout (versión anterior del comando)')
    else if (!existsSync(layout)) fallas.push(`falta \`out/${p.id}-layout.json\``)
    else if (h.layout !== sha(readFileSync(layout))) fallas.push(`\`out/${p.id}-layout.json\` no es el que registró la composición`)
    else {
      // Invariantes recalculadas aquí, con la misma función que usa el compositor (cta-invariantes.mjs).
      const L = JSON.parse(readFileSync(layout, 'utf8'))
      const inv = L.maquetacion?.elementos ? invariantesMaquetacion({ ancho: L.canvas.width, alto: L.canvas.height, elementos: L.maquetacion.elementos }) : ['el layout no trae los elementos de la maquetación']

      if (inv.length) fallas.push(`la maquetación no cumple — ${inv.join(' · ')}`)
      // La reserva editorial se recalcula aquí. No es un error de composición (recomponer no la arregla): es la
      // pieza la que no cabe en lo que el plan reservó.
      const reserva = L.maquetacion?.elementos ? fueraDeReserva({ elementos: L.maquetacion.elementos, reserva: p.editorialReserve }) : []

      const dibujado = (L.maquetacion?.elementos ?? []).filter(e => e.tipo !== 'firma')
      const desborde = (v, m) => (typeof m === 'number' ? v - m : 0)
      const pxReserva = dibujado.length && p.editorialReserve ? Math.round(Math.max(0, desborde(Math.max(...dibujado.map(e => e.box.right)), p.editorialReserve.maxRight), desborde(Math.max(...dibujado.map(e => e.box.bottom)), p.editorialReserve.maxBottom))) : 0

      if (reserva.length) reservasRotas.set(p.id, { reserva, px: pxReserva })
    }

    if (fallas.length) {
      console.error(`✗ ${p.id}: ${fallas.join(' · ')}. Recompón con \`pnpm foto:componer:cta ${plan} ${p.id}\`.`)
      process.exitCode = 1
    } else if (h.compositor !== comando) {
      noCertificable.push(`${p.id}: se compuso con otra versión del comando — recompón, o certifícala con \`--reproducir\` si el comando vigente produce el mismo PNG`)
    }
  }

  for (const r of qa.filter(x => conCta.has(x.id) && !x.huellas)) {
    console.error(`✗ ${r.id}: el QA no trae huellas — no hay cómo probar que describe esta pieza. Recompón.`)
    process.exitCode = 1
  }
}

// 🔴 La protección del sujeto se DECLARA en cada pieza, aunque sea para decir que no hay sujeto
// [2026-09-22, CMP-002]. La guarda existía en el compositor (`subjectProtection` → el descriptor no
// baja de `top - minClearance`) pero sólo actuaba si la pieza la declaraba, y ninguna lo hacía: el
// CTA del KV-01 quedó encima de la cabeza de Nexa con el gate verde. Un mecanismo opcional que nadie
// declara es un mecanismo apagado. `false` es una declaración válida: dice «debajo del texto no hay
// persona», y queda escrito para quien revise.
//
// Delta 2026-09-22: el compositor ahora SEGMENTA al sujeto (máscara semántica local, `@imgly/background-removal-node`)
// y aborta si una caja de texto lo toca, en dos dimensiones y sin que nadie mida nada. Esa evidencia queda en
// `qa.json` como `guardaSujeto: 'segmentacion'` y cumple esta regla por sí sola. La declaración a mano sigue
// siendo válida (y es la única protección si la segmentación no corrió: `sin-mascara`).
for (const p of piezas.filter(p => p.cta)) {
  const sp = p.subjectProtection
  const guarda = qa.find(r => r.id === p.id)?.guardaSujeto
  const segmentada = guarda === 'segmentacion'

  // 🔴 Sin máscara no hay certificación [auditoría 2026-09-23]. Un `subjectProtection` declarado a mano protege una
  // franja horizontal, no la silueta: la auditoría compuso texto sobre el pelo con esa franja en verde. Si la
  // segmentación no corrió, se recompone cuando corra; no se certifica con la declaración.
  if (!legado && guarda === 'sin-mascara') {
    console.error(`✗ ${p.id}: la segmentación del sujeto no corrió (\`guardaSujeto: sin-mascara\`). Sin máscara no se certifica: recompón cuando la segmentación esté disponible.`)
    process.exitCode = 1
    continue
  }

  // La máscara que protegió al sujeto tiene que ser de confianza: segmentada en esta corrida o leída de la caché del repo.
  // Una caché ajena (`FOTO_MASCARAS_DIR`) con una máscara en negro y metadatos coherentes componía texto sobre el pelo con
  // el gate en 0 (auditoría de arquitectura, hallazgo 2). `--reproducir` segmenta de nuevo y la resuelve.
  const mascara = qa.find(r => r.id === p.id)?.mascara

  if (!legado && segmentada && mascara?.origen !== 'fresca' && mascara?.origen !== 'cache-canonica') noCertificable.push(`${p.id}: la máscara del sujeto ${mascara ? 'salió de una caché ajena al repo (`FOTO_MASCARAS_DIR`)' : 'no dice de dónde salió (versión anterior del comando)'} — certifícala con \`--reproducir\`, que segmenta de nuevo`)
  // Una máscara vacía no protege a nadie (tramo 14; sexta certificación, O1): bloquea salvo excepción auditada. Las 178
  // máscaras de las piezas con CTA del repo marcan sujeto (la menor, 2,2 %).
  if (!legado && segmentada && mascara && mascara.cobertura === 0 && bloquea(p, 'mascara-vacia', 'la máscara no marca ningún sujeto: la guarda del texto sobre las personas no protege nada. Si la foto tiene sujeto, recompón con `--reproducir`; si no lo tiene, pide la excepción')) process.exitCode = 1
  // El gesto manuscrito no entra en ninguna guarda (sujeto, zona, contraste): decisión del operador 2026-09-23, fuera de
  // alcance por ahora. Una pieza que lo lleva no se certifica a ciegas.
  if (p.card) noCertificable.push(`${p.id}: lleva tarjeta, cuyo texto no entra en la guarda del sujeto, la zona ni la medición por voz`)
  if (p.gesture) noCertificable.push(`${p.id}: lleva gesto manuscrito, que ni el compositor ni el gate miden (sujeto, zona, contraste)`)
  // Tramo 10 (auditorías de arquitectura, hallazgos 5 y 6, y de diseño, hallazgo 5): lo que ninguna guarda mide no sale con
  // 0. Ninguna pieza con CTA del repo los usa.
  if (p.hud) noCertificable.push(`${p.id}: lleva HUD («NIVEL DE BÚSQUEDA», estrellas e íconos), que no entra en la zona segura, el layout, la medición por voz ni el texto alternativo`)
  if (p.url) noCertificable.push(`${p.id}: lleva la url de la firma, que se dibuja sin medir su contraste y fuera de la guarda del sujeto`)
  if (p.footer) noCertificable.push(`${p.id}: lleva cierre inferior (\`footer\`), que no entra en la jerarquía ni en el orden de lectura`)

  const declarada = segmentada || sp === false || (sp && typeof sp.top === 'number' && typeof sp.minClearance === 'number')

  if (!declarada) {
    console.error(
      `✗ ${p.id}: el sujeto no quedó protegido — la segmentación no corrió (\`guardaSujeto: sin-mascara\`) y falta \`subjectProtection\`. ` +
        'Revisa por qué no hubo máscara (el compositor lo avisa en la corrida) o declara ' +
        '{ "top": <px>, "minClearance": 24 } si hay una persona ' +
        'bajo el bloque de texto, o `false` si no la hay. El `top` se mide en el plate, dentro de la huella REAL ' +
        'del texto (min left…max right de `out/<id>-layout.json`), no en el ancho completo, y mirando la ' +
        'silueta: umbral de luminancia no sirve con pelo oscuro sobre fondo oscuro. Método y trampas medidas: ' +
        'docs/operations/EFEONCE_ADVERTISING_CTA_COMPOSITOR_V1.md §«Cómo medir subjectProtection».'
    )
    process.exitCode = 1
  }
}

if (process.exitCode) process.exit(1)

// Umbrales del canon (EFEONCE_ADVERTISING_THREE_VOICES_ACTION_V1 §accesibilidad).
const MIN_TEXTO = 4.5   // CTA y descriptor
const MIN_BORDE = 3.0   // borde, controles y superficie contra la escena

// 🔴 El acento del CTA es OBLIGATORIO, y este gate no lo veía [2026-09-22].
// El canon dice «color a demanda»: eso elige CUÁL color, nunca SI hay color. La corrección medida en
// «Sé la referencia» degradó la TINTA a blanco cuando el naranja no alcanzaba — y conservó
// `surface: accentSurface`. Las 8 piezas de `2026-09-22_aeo-cta-v03` lo confirman: surface es
// accentSurface en todas, sin excepción.
//
// Por qué hacía falta cerrarlo acá: el gate sólo medía contraste, y **el contraste MEJORA cuanto más
// neutro es el color**. Así que ante cada fallo, la corrección que el gate premiaba era quitar más
// acento — la métrica y la regla apuntaban en direcciones opuestas, y una pieza sin nada de color
// salía verde. Caso fuente: CMP-002, seis piezas compuestas con surface neutro y gate limpio.
const ACENTOS = new Set(['accentSurface', 'growthOnDark', 'accentInkOnLight'])

let fallos = 0

for (const r of qa) {
  if (!conCta.has(r.id)) continue
  const c = r.contraste ?? {}
  const pieza = piezas.find(p => p.id === r.id)
  // `auto` se juzga con la variante y los tokens que se DIBUJARON (tramo 10; auditoría de arquitectura, hallazgo 4): el
  // plan dice «auto» y el acento o el relleno se verificaban sobre lo declarado, no sobre lo resuelto.
  const resuelta = pieza.cta.variant === 'auto' ? r.ctaVariante : null

  if (pieza.cta.variant === 'auto' && !resuelta?.tokens) noCertificable.push(`${r.id}: el CTA es «auto» y el QA no registra la variante resuelta con sus tokens (versión anterior del comando) — recompón`)
  const variante = resuelta?.elegida ?? pieza.cta.variant
  const solid = variante === 'solid'

  // 🔴 La ausencia ES el fallo: sin esta comprobación, `solid` pasaba sin medirse.
  if (typeof c.cta !== 'number') {
    console.error(`✗ ${r.id}: falta \`contraste.cta\`. Una variante sin medir NO pasa por no tener dato.`); fallos++
  } else if (c.cta < MIN_TEXTO) {
    console.error(`✗ ${r.id}: CTA ${c.cta}:1 < ${MIN_TEXTO}:1`); fallos++
  }

  if (typeof c.descriptor === 'number' && c.descriptor < MIN_TEXTO) {
    console.error(`✗ ${r.id}: descriptor ${c.descriptor}:1 < ${MIN_TEXTO}:1`); fallos++
  }

  // 🔴 El PORTADOR del acento cambia por variante [verificado en componer-cta.mjs:638 por la sesión
  // «Ads con lenguaje fotográfico Efeonce», 2026-09-22]. En `text` NO se dibuja el rect, así que
  // `surfaceToken` es un campo INERTE y el único portador que queda es la TINTA. Validar la superficie
  // en una pieza `text` deja pasar un CTA sin ningún acento — es exactamente el caso `03-referencia`,
  // la pieza que motivó este gate.
  //
  // Y la AUSENCIA de token no es un fallo: el compositor resuelve a `growthOnDark` (lima), que es un
  // acento válido. Exigir la declaración rompía planes aprobados que dependen de ese default.
  const esText = variante === 'text'
  const campo = esText ? 'inkToken' : 'surfaceToken'
  const token = resuelta?.tokens ? resuelta.tokens[campo] : pieza.cta[campo]

  if (token && !ACENTOS.has(token) && bloquea(
    pieza, 'acento-cta',
    `\`${campo}: ${token}\` no es un acento (${[...ACENTOS].join(' · ')}). ` +
      (esText
        ? 'En la variante `text` el acento lo porta la TINTA: no hay superficie que lo sostenga.'
        : 'En `solid`/`outline` el acento lo porta la superficie; lo que se degrada por contraste es la tinta.') +
      ' Si el acento no alcanza el mínimo, se regenera el plate — no se apaga el color.'
  )) fallos++

  // Sólo el relleno puede despegarse o fundirse con el plate; es la medición que faltaba del todo.
  if (solid) {
    const s = c.cta_superficie_vs_escena

    if (typeof s !== 'number') {
      console.error(`✗ ${r.id}: variante \`solid\` sin \`cta_superficie_vs_escena\`. Nadie midió si el botón se despega del plate.`); fallos++
    } else if (s < MIN_BORDE) {
      console.error(`✗ ${r.id}: relleno vs escena ${s}:1 < ${MIN_BORDE}:1 — el botón se funde con la foto`); fallos++
    }
  }
}

const n = qa.filter(r => conCta.has(r.id)).length

for (const [id, { reserva, px }] of reservasRotas) {
  if (bloquea(piezas.find(x => x.id === id), 'reserva-editorial', `fuera de la reserva editorial — ${reserva.join(' · ')}. Acota el texto o corrige la reserva del plan`, { valor: px, sentido: 'max' })) fallos++
}

// ── Accesibilidad sobre el píxel (medida por el compositor con scripts/foto/accesibilidad.mjs) ─────────────
// BLOQUEA: cualquier voz bajo WCAG 2.2 AA según su tamaño EN PANTALLA (texto normal 4,5:1, grande 3:1) y los
// límites del CTA —relleno o borde— bajo 3:1 (1.4.11). Calibrado 2026-09-22 contra las 86 piezas que componen
// en el repo: 0 fallas, así que la regla no rompe nada aprobado.
// AVISA: APCA bajo Bronze, daltonismo bajo el umbral, texto de menos de 9 px en el teléfono y alternativa sin
// descripción de la escena. Son hallazgos de diseño que se miran: WCAG aprueba, esto no.
const LEGIBLE_PX = 9
// Piso de legibilidad del canon nuevo (decisión del operador del 2026-09-23: «desde 9 px se lee bien»): en un teléfono de
// 390 CSS px de ancho, el CTA mide al menos 11 px —el mínimo de Apple para texto que se toca— y las demás voces, 9. En una
// pieza nueva BLOQUEA (regla `legibilidad`, más abajo); en una del canon anterior queda el aviso de siempre.
const LEGIBLE_CTA_PX = 11

for (const r of qa.filter(x => conCta.has(x.id))) {
  const a = r.accesibilidad

  if (!a) {
    // En el formato actual la medición es obligatoria: su ausencia es una falla, no un aviso.
    if (legado) console.warn(`⚠ ${r.id}: el QA no trae medición de accesibilidad (compositor anterior). Recompón para certificarla.`)
    else { console.error(`✗ ${r.id}: el QA no trae la medición de accesibilidad. Una pieza sin medir no pasa.`); fallos++ }

    continue
  }

  for (const [voz, m] of Object.entries(a.voces)) {
    // La ausencia ES el fallo: una voz sin medición no pasa por no tener dato.
    if (!m) {
      console.error(`✗ ${r.id}: «${voz}» no tiene medición de accesibilidad. Una voz sin medir no pasa.`)
      fallos++
      continue
    }

    if (!m.cumpleWcag) {
      console.error(`✗ ${r.id}: «${voz}» mide ${m.wcag}:1 y necesita ${m.umbralWcag}:1 (WCAG 2.2 AA${m.cssPx == null ? ', límite no textual' : `, ${m.cssPx} px en pantalla`}).`)
      fallos++
    }

    // El CTA exige 4,5:1 a cualquier tamaño (canon: CTA y descriptor ≥ 4,5:1; auditoría de diseño N6, tramo 7). El gate no
    // le cree al umbral que trae el QA: un CTA medido como «texto grande» (3:1) no pasa.
    if (voz === 'cta' && !legado && (m.umbralWcag < MIN_TEXTO || (m.glifo && m.glifo.umbralWcag < MIN_TEXTO))) {
      console.error(`✗ ${r.id}: el CTA se midió con el umbral de texto grande (${Math.min(m.umbralWcag, m.glifo?.umbralWcag ?? Infinity)}:1): el CTA exige ${MIN_TEXTO}:1 a cualquier tamaño. Recompón con el comando vigente.`)
      fallos++
    }

    // 🔴 El TRAZO, no la caja [auditoría 2026-09-23, hallazgo 3]: en 01-fuera-916 la caja de «+ AEO» daba 4,53:1 y el
    // 1 % peor del trazo, 2,4–3,1:1 sobre el canto de un monitor. En el formato actual la medición es obligatoria.
    if (legado) continue

    if (!m.metodo) {
      console.error(`✗ ${r.id}: «${voz}» no dice cómo se midió (QA de una versión anterior del comando). Recompón.`)
      fallos++
      continue
    }

    if (m.metodo === 'pixel' && !m.glifo) {
      console.error(`✗ ${r.id}: «${voz}» no trae la medición del trazo. Recompón con el comando vigente.`)
      fallos++
    } else if (m.metodo === 'pixel' && !m.glifo.cumpleWcag) {
      console.error(
        `✗ ${r.id}: «${voz}»: el 1 % peor del trazo mide ${m.glifo.wcag}:1 y necesita ${m.glifo.umbralWcag}:1 ` +
          `(la caja da ${m.wcag}:1; ${m.glifo.pctBajoUmbral} % del trazo queda bajo el umbral). Mueve el texto, protege la zona con \`protect\` o regenera el plate.`
      )
      fallos++
    }

    // El borde del contorno como se ve en el teléfono (hallazgo 12): grosor ≥ 1 CSS px y anillo ≥ 3:1.
    if (voz === 'cta-borde' && !m.anillo) {
      console.error(`✗ ${r.id}: el borde del CTA no trae la medición del anillo en la vista de teléfono. Recompón.`)
      fallos++
    } else if (voz === 'cta-borde' && (!m.anillo.cumpleWcag || m.anillo.grosorCssPx < 1)) {
      console.error(`✗ ${r.id}: en un teléfono el borde del CTA mide ${m.anillo.grosorCssPx} CSS px y ${m.anillo.wcag}:1 (necesita ≥ 1 CSS px y ${m.anillo.umbralWcag}:1): se mezcla con la escena.`)
      fallos++
    }
  }

  const medidas = Object.entries(a.voces).filter(([, m]) => m)
  // APCA y daltonismo BLOQUEAN en el CTA —texto, borde o relleno— (decisión del operador, 2026-09-23): la acción tiene que
  // leerse también con la visión y la pantalla peores. En las demás voces siguen avisando.
  const DEL_CTA = new Set(['cta', 'cta-borde', 'cta-relleno'])

  const ctaPerceptual = medidas
    .filter(([v, m]) => DEL_CTA.has(v) && (m.cumpleApca === false || m.cumpleDaltonismo === false))
    .map(([v, m]) => [m.cumpleApca === false && `${v} APCA Lc ${Math.abs(m.apca)}/${m.umbralApca}`, m.cumpleDaltonismo === false && `${v} con daltonismo P ${m.daltonismo.protan} · D ${m.daltonismo.deutan} · T ${m.daltonismo.tritan} (necesita ${m.umbralWcag}:1)`].filter(Boolean).join(' · '))

  if (!legado && ctaPerceptual.length && bloquea(piezas.find(x => x.id === r.id), 'cta-perceptual', `el CTA no alcanza el piso perceptual — ${ctaPerceptual.join(' · ')}. Prueba \`variant: "auto"\`, otra tinta u otro acento`)) fallos++
  const apca = medidas.filter(([v, m]) => !DEL_CTA.has(v) && m.cumpleApca === false).map(([v, m]) => `${v} Lc ${Math.abs(m.apca)}/${m.umbralApca}`)
  const dalt = medidas.filter(([v, m]) => !DEL_CTA.has(v) && m.cumpleDaltonismo === false).map(([v, m]) => `${v} (P ${m.daltonismo.protan} · D ${m.daltonismo.deutan} · T ${m.daltonismo.tritan})`)
  const chicas = medidas.filter(([, m]) => m.cssPx != null && m.cssPx < LEGIBLE_PX).map(([v, m]) => `${v} ${m.cssPx} px`)

  if (apca.length) console.warn(`⚠ ${r.id}: bajo APCA Bronze — ${apca.join(' · ')}`)
  if (dalt.length) console.warn(`⚠ ${r.id}: bajo el umbral con daltonismo — ${dalt.join(' · ')}`)
  if (chicas.length && canonDe(piezas.find(x => x.id === r.id), plateDe(piezas.find(x => x.id === r.id))) !== CANON_VIGENTE) console.warn(`⚠ ${r.id}: menos de ${LEGIBLE_PX} px en pantalla (${r.anchoPantalla ?? 390} CSS px de ancho) — ${chicas.join(' · ')}. Pieza del canon anterior: queda como aviso; en una pieza nueva el piso bloquea (CTA ${LEGIBLE_CTA_PX} px, las demás voces ${LEGIBLE_PX}).`)
  if (!a.altTextEscena) console.warn(`⚠ ${r.id}: el texto alternativo trae el texto de la imagen pero no describe la escena — agrega \`altText\` al plan.`)

  // El rol del CTA en el texto alternativo lo escribe el compositor; el gate lo VERIFICA (antes sólo se confiaba en él).
  if (!legado && piezas.find(x => x.id === r.id)?.cta && !/Llamado a la acción: «/.test(a.altText ?? '')) {
    console.error(`✗ ${r.id}: el texto alternativo no anuncia el rol del CTA («Llamado a la acción: «…»»). Recompón con el comando vigente.`)
    fallos++
  }

  const copia = copiaEnEscena(piezas.find(x => x.id === r.id))

  if (copia.length) console.warn(`⚠ ${r.id}: la descripción de la escena (\`altText\`) transcribe el copy (${copia.map(c => `«${c}»`).join(', ')}): la escena se describe y el texto de la imagen se transcribe aparte.`)
  // Corchetes del CTA de texto (tramo 8): el trazo que dibuja AXIS mide menos de 1 CSS px en un teléfono. Aviso: su
  // grosor es un valor del contrato AXIS, y cambiarlo es decisión del operador.
  if (a.corchetes && (a.corchetes.grosorCssPx < 1 || (a.corchetes.wcag != null && a.corchetes.wcag < a.corchetes.umbralWcag))) console.warn(`⚠ ${r.id}: los corchetes del CTA miden ${a.corchetes.grosorCssPx} CSS px en el teléfono y ${a.corchetes.wcag ?? '—'}:1 contra la escena (piso: 1 CSS px y ${a.corchetes.umbralWcag}:1).`)
  // Lo que pasa «por poco» o gracias a una ayuda se MUESTRA (tramo 7): son decisiones de diseño que alguien mira.
  if (r.ctaVariante?.sinMargen) console.warn(`⚠ ${r.id}: la variante del CTA se eligió SIN margen (${r.ctaVariante.motivo}): pasa por poco; en otra pantalla o con compresión puede no alcanzar.`)
  if (piezas.find(x => x.id === r.id)?.placement) console.warn(`⚠ ${r.id}: declara \`placement\` (${piezas.find(x => x.id === r.id).placement.anchoCssPx} CSS px): sólo puede endurecer la medición; se midió a ${r.anchoPantalla} CSS px.`)
}

// ── EL CANON HECHO REGLA (tramo 4; auditoría 2026-09-23, hallazgos 6, 7, 8, 9 y 10) ─────────────────────────
// Lo que el canon ya pedía y nadie verificaba: zona segura de AXIS, contrato de la firma, concepto completo y la regla
// de las tres veces. Bloquean, salvo excepción auditada. Las del formato anterior del QA quedan como avisos.
const FIRMA_MIN_CONTRASTE = 4.5
const FIRMA_ANCHO_LADO_CORTO = 0.2

// Canon 2026-09-23 (tramo 11; decisiones del operador y auditoría de diseño de la tercera certificación). Calibrado contra
// las 62 piezas aprobadas únicas de la regresión, que ninguna incumple: firma entre 0,82 y 0,92 del alto; cada voz ≤ 0,44×
// el titular; descriptor ≤ 0,79× el CTA; padding del botón ≥ 0,6× y 0,35× el cuerpo.
const FIRMA_ANCHO_HORIZONTAL = 0.25 // lado corto, en 16:9 y demás horizontales
const FIRMA_ANCHO_MAX = 0.35
const PISO_FIRMA = 0.75 // la firma arranca en el cuarto inferior
const TOPE_ROL = 0.6 // ninguna voz pasa de 0,6× el titular
const AIRE_CTA = { x: 0.5, y: 0.25 } // padding mínimo del botón, en cuerpos del CTA
const TRACKING_TITULAR = [-0.035, 0.02] // em; AXIS `ideaImpact` usa −0,035
// Tramo 13 (quinta certificación, auditoría de diseño): TODAS las piezas. Calibrado contra las 132 aprobadas únicas, que
// ninguna incumple: relleno del botón 0,6–0,8× y 0,35–0,47× el cuerpo del CTA; descriptor a 0,35–0,57× del botón; CTA ≥
// 0,97× la voz de cuerpo mayor; entrada y cierre, siempre blancos; una selección sobre un objeto encierra 3,3–20 % de sujeto.
const TECHO_RELLENO_CTA = { x: 1.2, y: 0.8 } // padding máximo del botón, en cuerpos del CTA
// Distancia DIBUJADA del botón (o del texto del CTA sin botón) al descriptor, en cuerpos del CTA (tramo 14).
const TECHO_DESCRIPTOR = 1.5
// El CTA no compite con el titular (tramo 14): lo aprobado, CTA 0,20–0,44× el titular y botón 0,17–0,77× su área.
const TECHO_CTA_TITULAR = 0.5
// Techo del área por variante DIBUJADA (tramo 15; séptima, diseño H3): un botón de relleno pesa toda su área y, con el techo
// único de 1, llegaba a 0,98× la del titular. Canon: el titular es la voz dominante. Lo aprobado: relleno ≤ 0,57, contorno
// ≤ 0,77 y la caja del texto de un CTA sin botón ≤ 0,29; ninguna aprobada lo incumple.
const TECHO_BOTON_AREA = { solid: 0.7, outline: 1, text: 0.45 }
// Texto, botón y firma no se tocan (tramo 15; séptima, diseño N1): la misma holgura que ya separa una selección de lo que no
// es su destino, 0,4 % del lado corto, medida sobre lo DIBUJADO. Lo aprobado: 0,69 % como mínimo; ninguna lo incumple.
const HOLGURA_PRINCIPALES = 0.004
// En una pieza nueva, CTA, descriptor, nota y etiqueta arrancan en la columna del texto (tramo 15; séptima, diseño N2), con la
// tolerancia del eje centrado. 30 aprobadas se corren hasta 27 px (cta.x 0,08 en la familia KV; CTA de texto con fracción):
// siguen con el aviso, porque son del canon anterior.
const TOLERANCIA_COLUMNA_PX = 4
const PISO_CTA_CUERPO = 0.9 // el CTA mide al menos 0,9× la voz de cuerpo mayor (entrada, cierre, nota)
const PISO_SELECCION_SUJETO = 0.01 // fracción mínima de sujeto dentro de la caja de una selección sobre un objeto

// La tinta del cuerpo (entrada y cierre) sale de la paleta de AXIS para su fondo; el acento es del titular y del CTA.
const TINTAS_CUERPO = {
  oscuro: [axisAdvertising.color.inkOnDark, axisAdvertising.color.softOnDark].map(c => c.toLowerCase()),
  claro: [axisAdvertising.color.inkOnLight, axisAdvertising.color.mutedOnLight].map(c => c.toLowerCase())
}

// Cuánto se sale de su zona lo que se sale (px del lienzo, el peor elemento): la medida que una excepción «zona-segura»
// tiene que cubrir con `hasta`. Un elemento que el layout no trae no se puede acotar (sin medir).
const desbordeZona = r => {
  const L = JSON.parse(readFileSync(path.join(dir, 'out', `${r.id}-layout.json`), 'utf8'))
  const { width: w, height: h } = L.canvas

  return Math.round(Math.max(...r.fueraDeZona.map(id => {
    const e = L.maquetacion?.elementos?.find(x => x.id === id)

    if (!e) return Infinity
    const z = e.tipo === 'firma' && r.zonaFirma ? r.zonaFirma : r.zonaSegura

    return Math.max(0, z.x0 * w - e.box.left, e.box.right - z.x1 * w, z.y0 * h - e.box.top, e.box.bottom - z.y1 * h)
  })))
}

const NOMBRE_VOZ = { label: 'etiqueta', lead: 'entrada', closure: 'cierre', benefit: 'nota', footer: 'cierre inferior', cta: 'CTA', descriptor: 'descriptor' }

for (const r of qa.filter(x => conCta.has(x.id))) {
  const p = piezas.find(x => x.id === r.id)

  for (const z of r.zonasIgnoradas ?? []) {
    const motivo = motivoAprobador(z.aprobadoPor)

    if (!motivo && z.plate === plateDe(p)) console.warn(`⚠ ${r.id}: zona del sujeto ignorada [${z.box.join(', ')}] — ${z.reason} (aprobó ${z.aprobadoPor})`)
    else { console.error(`✗ ${r.id}: zona del sujeto ignorada [${z.box.join(', ')}] ${motivo ? `sin aprobador válido: ${motivo}` : `aprobada para otro plate${z.plate ? '' : ' (no nombra ninguno)'}: declara \`plate: "${plateDe(p)}"\``}.`); fallos++ }
  }

  if (legado) {
    if (typeof r.contraste?.logo === 'number' && r.contraste.logo < 3) console.warn(`⚠ ${r.id}: la firma mide ${r.contraste.logo}:1 contra su fondo.`)
    if (r.firmaSobreSujeto) console.warn(`⚠ ${r.id}: la firma queda sobre el sujeto (${r.firmaSobreSujeto} px de su silueta).`)
    continue
  }

  // El CANON de la pieza lo decide el registro de las aprobadas (scripts/foto/canon-anterior.json), recalculado aquí: el QA
  // no puede declararse de otro canon (tramo 11).
  const canonPieza = canonDe(p, plateDe(p))

  if (r.canon == null) noCertificable.push(`${r.id}: el QA no registra el canon de la pieza (versión anterior del comando) — recompón`)
  else if (r.canon !== canonPieza) { console.error(`✗ ${r.id}: el QA dice canon ${r.canon} y la pieza es del canon ${canonPieza} (su huella ${canonPieza === CANON_ANTERIOR ? 'está' : 'no está'} en scripts/foto/canon-anterior.json). Recompón.`); fallos++ }

  const nuevo = canonPieza === CANON_VIGENTE

  // Una pieza juzgada con el canon ANTERIOR no se certifica con un registro que difiere del commit (tramo 12).
  if (!nuevo && registroCanonAlterado()) noCertificable.push(`${r.id}: el registro del canon (scripts/foto/canon-anterior.json) tiene cambios sin commit: una pieza del canon anterior no se certifica con un registro que no está en el historial`)
  // El marco de una selección que tapa otra voz en una pieza aprobada: se muestra (en una nueva, bloquea).
  if (r.marcoSobreVoz?.length) console.warn(`⚠ ${r.id}: ${r.marcoSobreVoz.join(' · ')} (pieza del canon anterior: queda como está; en una pieza nueva bloquea).`)
  const lienzo = JSON.parse(readFileSync(path.join(dir, 'out', `${r.id}-layout.json`), 'utf8')).canvas
  const minFirma = nuevo && lienzo.width > lienzo.height * 1.2 ? FIRMA_ANCHO_HORIZONTAL : FIRMA_ANCHO_LADO_CORTO

  // Zona segura: la de AXIS como piso (feed 7,5 % × 6 %, story 10 % × 13 %).
  if (!r.zonaSegura) {
    console.error(`✗ ${r.id}: el QA no trae la zona segura verificada (versión anterior del comando). Recompón.`)
    fallos++
  } else if (r.fueraDeZona?.length && bloquea(p, 'zona-segura', `fuera de la zona segura ${r.zonaSegura.perfil} de AXIS: ${r.fueraDeZona.join(', ')}. ${r.fueraDeZona.some(id => /^(logo|url|firma-externa)$/.test(id)) ? 'La firma se mide contra la zona de AXIS estrechada por su franja (\`signatureSafeArea\`), no contra la del texto. ' : ''}${p.safeArea === 'axis' ? 'La zona ya es la de AXIS: acorta el texto, baja su tamaño o sube el bloque' : 'Declara \`safeArea: "axis"\` (o una zona más estrecha) para ubicar el texto dentro'}${p.cta?.x === 'columna' || p.align === 'center' ? '' : ', y \`cta.x: "columna"\`'}`, { valor: desbordeZona(r), sentido: 'max' })) fallos++

  // Firma: declarada siempre; contraste y tamaño del canon; nunca sobre el sujeto.
  const externa = !p.logo && (p.firma?.modo === 'externa' || (p.firma == null && typeof p.signatureY === 'number'))

  if (!p.logo && p.firma?.modo === 'sin-firma' && !salidaAprobada(p, 'pieza SIN firma', p.firma)) fallos++

  if (!p.logo && !p.firma && !externa) {
    console.error(`✗ ${r.id}: la pieza no declara firma — \`logo\`, o \`firma: { modo: "externa" | "sin-firma", razon }\` si la firma la pone otra herramienta o no lleva.`)
    fallos++
  }

  // Firma externa (la pone otra herramienta): contraste medido por el compositor sobre la pieza sin firma, con la
  // misma regla que esa herramienta; tamaño y sujeto, igual que el logo.
  if (externa) {
    const c = r.contraste?.firmaExterna
    const ancho = r.firma?.anchoLadoCorto

    if (typeof c !== 'number') { console.error(`✗ ${r.id}: la firma externa no tiene medición de contraste (versión anterior del comando). Recompón.`); fallos++ } else if (c < FIRMA_MIN_CONTRASTE && bloquea(p, 'firma-contraste', `donde va la firma externa, la mejor tinta mide ${c}:1 (canon: ≥ ${FIRMA_MIN_CONTRASTE}:1)`, { valor: c, sentido: 'min' })) fallos++
    if (typeof ancho === 'number' && ancho < minFirma - 0.005 && bloquea(p, 'firma-tamano', `la firma externa mide ${(ancho * 100).toFixed(1)} % del lado corto (canon: ${minFirma * 100} %)`, { valor: ancho, sentido: 'min' })) fallos++
    if (r.firmaSobreSujeto && bloquea(p, 'firma-sobre-sujeto', `la firma externa cae sobre el sujeto (${r.firmaSobreSujeto} px de su silueta)`, { valor: r.firmaSobreSujeto, sentido: 'max' })) fallos++
  }

  if (p.logo) {
    const c = r.contraste?.logo
    const ancho = r.firma?.anchoLadoCorto
    const trazo = r.firma?.trazo

    // El TRAZO del logo (tramo 6), como las voces: el 1 % peor de sus píxeles contra su fondo. La caja sola mezcla el
    // aire entre letras con el fondo de los trazos.
    if (!trazo) { console.error(`✗ ${r.id}: la firma no trae la medición de su trazo (versión anterior del comando). Recompón.`); fallos++ } else if (!trazo.cumpleWcag && bloquea(p, 'firma-contraste', `el 1 % peor del trazo de la firma mide ${trazo.wcag}:1 (canon: ≥ ${FIRMA_MIN_CONTRASTE}:1; ${trazo.pctBajoUmbral} % del trazo queda bajo el umbral)`, { valor: trazo.wcag, sentido: 'min' })) fallos++

    // `logo.y: "auto"` busca sólo en la BANDA DEL PIE, debajo de todo lo compuesto (auditoría de diseño N1: subía hasta
    // encima del titular). Se recalcula sobre el layout: una firma automática por encima del contenido es un error del
    // compositor, no una decisión de diseño, y no se exceptúa.
    if (r.firma?.auto && r.firma.encontrada) {
      const Lf = JSON.parse(readFileSync(path.join(dir, 'out', `${r.id}-layout.json`), 'utf8'))
      const logo = Lf.maquetacion?.elementos?.find(e => e.id === 'logo')?.box
      const contenido = Math.max(...(Lf.maquetacion?.elementos ?? []).filter(e => e.tipo !== 'firma' && e.tipo !== 'acento').map(e => e.box.bottom))

      if (!logo || logo.top < contenido) { console.error(`✗ ${r.id}: la firma automática quedó por encima del contenido (su borde superior en ${logo ? Math.round(logo.top) : '—'} px; el contenido termina en ${Math.round(contenido)} px). La búsqueda sólo puede ubicarla en la banda del pie.`); fallos++ }
    }

    if (typeof c !== 'number') { console.error(`✗ ${r.id}: la firma no tiene medición de contraste.`); fallos++ } else if (c < FIRMA_MIN_CONTRASTE && bloquea(p, 'firma-contraste', `la firma mide ${c}:1 contra su fondo (canon: ≥ ${FIRMA_MIN_CONTRASTE}:1). Prueba \`logo.y: "auto"\``, { valor: c, sentido: 'min' })) fallos++
    if (typeof ancho !== 'number') { console.error(`✗ ${r.id}: el QA no trae el tamaño de la firma. Recompón.`); fallos++ } else if (ancho < minFirma - 0.005 && bloquea(p, 'firma-tamano', `la firma mide ${(ancho * 100).toFixed(1)} % del lado corto (canon: ${minFirma * 100} %${minFirma > FIRMA_ANCHO_LADO_CORTO ? ' en los formatos horizontales' : ''})`, { valor: ancho, sentido: 'min' })) fallos++
    else if (nuevo && ancho > FIRMA_ANCHO_MAX + 0.005 && bloquea(p, 'firma-tamano', `la firma mide ${(ancho * 100).toFixed(1)} % del lado corto (canon: hasta ${FIRMA_ANCHO_MAX * 100} %)`, { valor: ancho, sentido: 'max' })) fallos++
    if (r.firmaSobreSujeto && bloquea(p, 'firma-sobre-sujeto', `la firma queda sobre el sujeto (${r.firmaSobreSujeto} px de su silueta)`, { valor: r.firmaSobreSujeto, sentido: 'max' })) fallos++
  }

  // Concepto: entrada, dominante y un cierre que remata (o `conceptoReducido` con razón); regla de las tres veces.
  if ((!p.lead || !p.after) && !p.conceptoReducido && bloquea(p, 'concepto-completo', `falta ${!p.lead ? 'la entrada' : 'el cierre que remata'}: el canon pide entrada, dominante y cierre (o \`conceptoReducido: { razon }\`)`)) fallos++
  if ((!p.lead || !p.after) && p.conceptoReducido && !salidaAprobada(p, 'concepto REDUCIDO', p.conceptoReducido)) fallos++
  if (typeof r.ratioDominanteEntrada === 'number' && r.ratioDominanteEntrada < 3 && bloquea(p, 'jerarquia', `el dominante mide ${r.ratioDominanteEntrada}× la entrada (regla de las tres veces: ≥ 3×)`, { valor: r.ratioDominanteEntrada, sentido: 'min' })) fallos++

  // El dominante es la voz MAYOR (auditoría de diseño N7, tramo 7): la regla de las tres veces sólo lo comparaba con la
  // entrada, y un cierre o un CTA más grandes que el titular pasaban. Medido 2026-09-23: 0 de 216 layouts del repo.
  const tipografia = JSON.parse(readFileSync(path.join(dir, 'out', `${r.id}-layout.json`), 'utf8')).typography ?? {}
  const mayores = Object.keys(NOMBRE_VOZ).filter(k => typeof tipografia[k] === 'number' && typeof tipografia.dominant === 'number' && tipografia[k] > tipografia.dominant)

  if (mayores.length && bloquea(p, 'dominante-mayor', `el dominante (${tipografia.dominant} px) no es la voz mayor: ${mayores.map(k => `${NOMBRE_VOZ[k]} ${tipografia[k]} px`).join(' · ')}`, { valor: +(tipografia.dominant / Math.max(...mayores.map(k => tipografia[k]))).toFixed(2), sentido: 'min' })) fallos++

  // Columna: en un bloque alineado a la izquierda, CTA, descriptor, nota y etiqueta arrancan en la columna del texto. Se mide lo
  // DIBUJADO: en un CTA de texto, el texto (tramo 15; antes se leía la variante del plan y un `auto` resuelto a texto medía
  // la caja que no se dibuja). En una pieza nueva bloquea (séptima, diseño N2: un CTA a 224 px de la columna daba 0); en las
  // aprobadas, avisa. La etiqueta con estrella no se mide: su caja empieza después de la estrella.
  const L = JSON.parse(readFileSync(path.join(dir, 'out', `${r.id}-layout.json`), 'utf8'))
  const el = id => L.maquetacion?.elementos?.find(e => e.id === id)?.box
  const varianteDibujada = r.ctaVariante?.elegida ?? p.cta.variant

  if (typeof L.columna === 'number' && !nuevo) {
    // Las aprobadas conservan el aviso tal cual era (tramo 13; mismo texto, para que la regresión no vea diferencias).
    const boton = p.cta.variant === 'text' ? el('cta') : el('cta-boton')
    const desc = el('descriptor')
    const nota = el('nota')
    const corrido = [boton && Math.abs(boton.left - L.columna) > 4 && `el CTA arranca ${Math.round(boton.left - L.columna)} px`, desc && Math.abs(desc.left - L.columna) > 4 && `el descriptor arranca ${Math.round(desc.left - L.columna)} px`, nota && Math.abs(nota.left - L.columna) > 4 && `la nota arranca ${Math.round(nota.left - L.columna)} px`, el('etiqueta') && Math.abs(el('etiqueta').left - L.columna) > 4 && `la etiqueta arranca ${Math.round(el('etiqueta').left - L.columna)} px`].filter(Boolean)

    if (corrido.length) console.warn(`⚠ ${r.id}: ${corrido.join(' y ')} fuera de la columna del texto. Usa \`cta.x: "columna"\` (y \`note.x: "columna"\`).`)
  } else if (typeof L.columna === 'number') {
    const corridos = [['el CTA', varianteDibujada === 'text' ? el('cta') : el('cta-boton')], ['el descriptor', el('descriptor')], ['la nota', el('nota')], ['la etiqueta', p.labelStar ? null : el('etiqueta')]]
      .filter(([, b]) => b && Math.abs(b.left - L.columna) > TOLERANCIA_COLUMNA_PX)
      .map(([n, b]) => [n, Math.round(b.left - L.columna)])

    const msg = `${corridos.map(([n, d]) => `${n} arranca ${d} px`).join(' y ')} fuera de la columna del texto (tolerancia: ${TOLERANCIA_COLUMNA_PX} px). Usa \`cta.x: "columna"\` (y \`note.x: "columna"\`)`

    if (corridos.length && bloquea(p, 'cta-columna', msg, { valor: Math.max(...corridos.map(([, d]) => Math.abs(d))), sentido: 'max' })) fallos++
  }

  // Texto, botón y firma no se tocan (tramo 15; séptima, diseño N1). `invariantesMaquetacion` compara con holgura 0 y
  // desigualdad estricta: dos cajas que se tocaban, o a 1–3 px, pasaban; y la caja del botón no incluye la mitad exterior del
  // trazo del contorno, que pisaba la tinta. Aquí se mide sobre lo dibujado: el botón de contorno con medio trazo por fuera, y
  // sin botón cuando el CTA es de texto.
  if (Array.isArray(L.maquetacion?.elementos)) {
    const lado = Math.min(L.canvas.width, L.canvas.height)
    const piso = lado * HOLGURA_PRINCIPALES
    const medioTrazo = varianteDibujada === 'outline' ? Math.max(2, Math.ceil(L.canvas.width / (r.anchoPantalla ?? 390))) / 2 : 0

    const dibujados = L.maquetacion.elementos
      .filter(e => ['texto', 'cta', 'firma'].includes(e.tipo) && !(e.id === 'cta-boton' && varianteDibujada === 'text'))
      .map(e => (e.id === 'cta-boton' && medioTrazo ? { ...e, box: { left: e.box.left - medioTrazo, top: e.box.top - medioTrazo, right: e.box.right + medioTrazo, bottom: e.box.bottom + medioTrazo } } : e))

    const pegados = []

    for (let i = 0; i < dibujados.length; i++) {
      for (let j = i + 1; j < dibujados.length; j++) {
        const [a, b] = [dibujados[i], dibujados[j]]

        if (a.dentroDe === b.id || b.dentroDe === a.id) continue
        const separacion = Math.max(b.box.left - a.box.right, a.box.left - b.box.right, b.box.top - a.box.bottom, a.box.top - b.box.bottom)

        if (separacion < piso) pegados.push([a.id, b.id, separacion])
      }
    }

    if (pegados.length && bloquea(p, 'holgura', `texto, botón y firma no se tocan: ${pegados.map(([a, b, s]) => `«${a}» y «${b}» a ${s.toFixed(1)} px`).join(' · ')} (piso: ${piso.toFixed(1)} px, el 0,4 % del lado corto; el botón de contorno cuenta medio trazo por fuera). Sube \`leadGap\`, \`afterGap\`, \`note.gapAfterClosure\` o \`cta.gapAfterNote\``, { valor: +Math.min(...pegados.map(([, , s]) => s)).toFixed(1), sentido: 'min' })) fallos++
  }

  // Bloque CENTRADO (todas las piezas; tramo 12, auditoría de diseño de la cuarta certificación, N4): cada voz, el botón y
  // el descriptor, centrados en el eje del bloque (±4 px). Nadie lo verificaba y el mensaje de error del esquema llevaba al
  // defecto. Medido en las 51 piezas centradas aprobadas: ninguna se sale.
  if (p.align === 'center') {
    const eje = (p.centerX ?? 0.5) * L.canvas.width
    const fuera = ['etiqueta', 'entrada', 'dominante', 'cierre-frase', 'nota', 'cta-boton', 'descriptor'].map(id => [id, el(id)]).filter(([, b]) => b && Math.abs((b.left + b.right) / 2 - eje) > 4).map(([id, b]) => `«${id}» a ${Math.round((b.left + b.right) / 2 - eje)} px`)

    if (fuera.length && bloquea(p, 'eje-centrado', `en un bloque centrado, fuera del eje: ${fuera.join(' · ')}. Usa \`cta.align: "center"\` y la nota sin \`x\``)) fallos++
  }

  // ── Tramo 13 (quinta certificación, auditoría de diseño): TODAS las piezas ──────────────────────────────────────────
  // Botón-losa (N5): el relleno tenía piso (`cta-aire`) y no techo; con 110 × 70 px el botón medía 2,5× el titular.
  const relleno = Math.max(p.cta.paddingX / (p.cta.fontSize * TECHO_RELLENO_CTA.x), p.cta.paddingY / (p.cta.fontSize * TECHO_RELLENO_CTA.y))

  if (relleno > 1 + 1e-9 && bloquea(p, 'cta-relleno', `el botón es una losa: padding ${p.cta.paddingX} × ${p.cta.paddingY} px para un CTA de ${p.cta.fontSize} px (techo: ${TECHO_RELLENO_CTA.x}× y ${TECHO_RELLENO_CTA.y}× el cuerpo; mide ${relleno.toFixed(2)}× el techo)`, { valor: +relleno.toFixed(2), sentido: 'max' })) fallos++

  // Descriptor separado de su botón (quinta, N1; sexta, H2): se mide lo DIBUJADO —del borde inferior del botón (o del texto
  // del CTA, si no hay botón) al descriptor— y no el `descriptorGap` declarado: para esquivar un cursor o su etiqueta el
  // descriptor bajaba hasta 3,9× el cuerpo del CTA. Desde el botón y no desde el texto: el relleno ya tiene su regla.
  // En un CTA de texto no hay botón dibujado: se mide desde el texto (tramo 15; séptima, arquitectura N4: se medía la caja del
  // relleno, que no se dibuja, y un descriptor a 2,25× pasaba como 1,45×).
  const baseD = varianteDibujada === 'text' ? el('cta') : el('cta-boton') ?? el('cta')
  const descD = el('descriptor')
  const distDesc = baseD && descD && typeof tipografia.cta === 'number' ? (descD.top - baseD.bottom) / tipografia.cta : null

  if (distDesc != null && distDesc > TECHO_DESCRIPTOR + 1e-9 && bloquea(p, 'descriptor-distancia', `el descriptor queda lejos de su botón: ${distDesc.toFixed(2)}× el cuerpo del CTA entre el botón y el descriptor (techo: ${TECHO_DESCRIPTOR}×). Baja \`descriptorGap\` o cambia la esquina del cursor que lo empuja`, { valor: +distDesc.toFixed(2), sentido: 'max' })) fallos++

  // CTA que compite con el titular (sexta, H3): el relleno tenía techo, pero el CTA subía hasta 0,6× el titular y el botón
  // llegaba a 1,5× su área.
  const botonT = varianteDibujada === 'text' ? el('cta') : el('cta-boton')
  const techoArea = TECHO_BOTON_AREA[varianteDibujada] ?? TECHO_BOTON_AREA.outline
  const titularT = el('dominante')
  const ratioCta = typeof tipografia.cta === 'number' && typeof tipografia.dominant === 'number' ? tipografia.cta / tipografia.dominant : null
  const ratioArea = botonT && titularT ? ((botonT.right - botonT.left) * (botonT.bottom - botonT.top)) / ((titularT.right - titularT.left) * (titularT.bottom - titularT.top)) : null
  const tamanoCta = Math.max(ratioCta != null ? ratioCta / TECHO_CTA_TITULAR : 0, ratioArea != null ? ratioArea / techoArea : 0)

  if (tamanoCta > 1 + 1e-9 && bloquea(p, 'cta-tamano', `el CTA compite con el titular: mide ${ratioCta?.toFixed(2)}× el titular${ratioArea != null ? ` y el botón ${ratioArea.toFixed(2)}× su área` : ''} (techo: ${TECHO_CTA_TITULAR}× y, para un CTA ${varianteDibujada === 'solid' ? 'de relleno' : varianteDibujada === 'text' ? 'de texto' : 'de contorno'}, ${techoArea}× el área; mide ${tamanoCta.toFixed(2)}× el techo)`, { valor: +tamanoCta.toFixed(2), sentido: 'max' })) fallos++

  // CTA más chico que el cuerpo (N2): la jerarquía por rol sólo ponía techos; con el CTA a 0,36× la nota salía sin avisos.
  const cuerpo = [['lead', p.lead], ['closure', p.after], ['benefit', p.note]].filter(([k, v]) => v && typeof tipografia[k] === 'number').map(([k]) => k)
  const mayorCuerpo = cuerpo.length ? Math.max(...cuerpo.map(k => tipografia[k])) : null

  if (mayorCuerpo && typeof tipografia.cta === 'number' && tipografia.cta < mayorCuerpo * PISO_CTA_CUERPO - 1e-9 && bloquea(p, 'cta-cuerpo', `el CTA (${tipografia.cta} px) es menor que el cuerpo: ${cuerpo.filter(k => tipografia[k] * PISO_CTA_CUERPO > tipografia.cta).map(k => `${NOMBRE_VOZ[k]} ${tipografia[k]} px`).join(' · ')} (piso: ${PISO_CTA_CUERPO}× la voz de cuerpo mayor)`, { valor: +(tipografia.cta / mayorCuerpo).toFixed(2), sentido: 'min' })) fallos++

  // Tinta del cuerpo fuera de la paleta (N4): `leadFill` y `afterFill` aceptaban cualquier #rrggbb, también el acento del CTA.
  const tintas = p.ink === 'dark' ? TINTAS_CUERPO.claro : TINTAS_CUERPO.oscuro
  const fueraDePaleta = [['entrada', p.lead && p.leadFill], ['cierre', p.after && p.afterFill]].filter(([, f]) => f && !tintas.includes(String(f).toLowerCase())).map(([v, f]) => `${v} ${f}`)

  if (fueraDePaleta.length && bloquea(p, 'paleta-voces', `tinta fuera de la paleta de AXIS para el cuerpo: ${fueraDePaleta.join(' · ')} (sobre fondo ${p.ink === 'dark' ? 'claro' : 'oscuro'}: ${tintas.join(' o ')}). El acento es del titular y del CTA`)) fallos++

  // En una pieza NUEVA, la selección sobre un objeto es una salida aprobada (sexta, H4): el gate mide que la caja encierre
  // sujeto, no que encierre el objeto que nombra; el micrófono aprobado (3,3 %) mide lo mismo que un marco que roza un borde.
  if (nuevo && p.selection?.box && !salidaAprobada(p, 'selección sobre un OBJETO (el gate no puede juzgar si encierra lo que nombra)', p.selection)) fallos++

  // Selección sobre nada (N3): el marco de un objeto se aceptaba sobre una pared vacía. «Cortar el objeto» no se puede juzgar
  // con esta máscara —una aprobada encierra sólo el 9 % de su componente; un ataque, el 24 %— y queda como deuda.
  // Sin la medición, la pieza no se certifica: un QA sin un dato que el comando vigente siempre escribe viene de una versión
  // anterior del comando o fue tocado (como el QA sin canon).
  if (p.selection?.box && r.guardaSujeto === 'segmentacion' && typeof r.seleccionSujeto !== 'number') noCertificable.push(`${r.id}: la selección no trae su medición de sujeto (\`seleccionSujeto\`): versión anterior del comando o QA tocado — recompón`)

  if (p.selection?.box && typeof r.seleccionSujeto === 'number' && r.seleccionSujeto < PISO_SELECCION_SUJETO && bloquea(p, 'seleccion-objeto', `la selección no encierra nada: el ${(r.seleccionSujeto * 100).toFixed(1)} % de su caja es sujeto (piso: ${PISO_SELECCION_SUJETO * 100} %). Pon el marco sobre el objeto que nombra`, { valor: r.seleccionSujeto, sentido: 'min' })) fallos++

  // Aire sobre los corchetes del CTA de texto (aviso): al menos media altura del CTA hasta la voz de arriba.
  if (p.cta.variant === 'text' && L.ctaMarco) {
    const arriba = Math.max(...(L.maquetacion?.elementos ?? []).filter(e => e.tipo === 'texto' && e.box.bottom <= L.ctaMarco.top + 1).map(e => e.box.bottom))
    const aire = L.ctaMarco.top - arriba

    if (Number.isFinite(aire) && aire < 0.5 * (L.typography?.cta ?? 0)) console.warn(`⚠ ${r.id}: sobre los corchetes del CTA quedan ${Math.round(aire)} px de aire (piso: media altura del CTA).`)
  }

  // ── CANON 2026-09-23 (tramo 11): sólo las piezas NUEVAS. Las aprobadas siguen con las reglas de arriba. ──────────────
  if (nuevo) {
    const elems = L.maquetacion?.elementos ?? []
    const { width: cw, height: ch } = L.canvas
    const contenidoAbajo = Math.max(...elems.filter(e => e.tipo !== 'firma' && e.tipo !== 'acento').map(e => e.box.bottom))
    const firmaEl = elems.find(e => e.id === 'logo' || e.id === 'firma-externa')

    // Firma en el pie: debajo de todo el contenido, en el cuarto inferior y fuera de las zonas `protect` (auditoría de
    // diseño, hallazgo 4: como cabecera, a media pieza o sobre un objeto protegido, el gate daba 0).
    if (firmaEl) {
      const b = firmaEl.box

      const razones = [
        b.top < contenidoAbajo - 0.5 && `queda por encima del final del contenido (arranca en ${Math.round(b.top)} px; el contenido termina en ${Math.round(contenidoAbajo)} px)`,
        // Tramo 12 (auditoría de diseño de la cuarta certificación): con `logo.y` fija quedaba a 2 px del descriptor. La misma
        // holgura que usa la búsqueda automática: 2 % del lado corto.
        b.top >= contenidoAbajo - 0.5 && b.top < contenidoAbajo + Math.min(cw, ch) * 0.02 - 0.5 && `queda pegada al contenido (${Math.round(b.top - contenidoAbajo)} px; canon: al menos ${Math.round(Math.min(cw, ch) * 0.02)} px)`,
        b.top < ch * PISO_FIRMA - 0.5 && `arranca en el ${Math.round((b.top / ch) * 100)} % del alto (canon: en el cuarto inferior, desde el ${PISO_FIRMA * 100} %)`,
        ...(p.protect ?? []).filter(z => b.left < z.box[2] * cw && b.right > z.box[0] * cw && b.top < z.box[3] * ch && b.bottom > z.box[1] * ch).map(z => `tapa la zona protegida «${z.reason}»`)
      ].filter(Boolean)

      if (razones.length && bloquea(p, 'firma-posicion', `la firma ${razones.join(' y ')}`, { valor: +(b.top / ch).toFixed(3), sentido: 'min' })) fallos++
    }

    // La firma EXTERNA la pone otra herramienta después: el PNG certificado no la lleva (auditoría de diseño, «firma
    // externa»). En el canon nuevo es una salida aprobada, como la pieza sin firma.
    if (externa && !salidaAprobada(p, 'firma EXTERNA (el PNG certificado no la lleva: la pone otra herramienta después)', p.firma)) fallos++

    // Orden de lectura (auditoría de diseño, hallazgo 2): entrada → titular → cierre → nota → CTA → descriptor.
    const orden = ['etiqueta', 'entrada', 'dominante', 'cierre-frase', 'nota', 'cta-boton', 'descriptor'].map(id => [id, elems.find(e => e.id === id)?.box]).filter(([, b]) => b)
    const fueraDeOrden = orden.slice(1).filter(([, b], i) => b.top < orden[i][1].top - 1).map(([id], i) => `«${id}» arriba de «${orden[i][0]}»`)

    if (fueraDeOrden.length && bloquea(p, 'orden-lectura', `el orden de lectura no es el del canon (entrada → titular → cierre → nota → CTA → descriptor): ${fueraDeOrden.join(' · ')}`)) fallos++

    // Jerarquía por rol, con los tamaños RESUELTOS (auditoría de diseño, hallazgo 3): ninguna voz pasa de 0,6× el
    // titular y el descriptor es menor que el CTA.
    const t = L.typography ?? {}
    const ROLES = ['label', 'lead', 'closure', 'benefit', 'footer', 'cta'].filter(k => typeof t[k] === 'number' && typeof t.dominant === 'number')
    const sobreTope = ROLES.filter(k => t[k] > t.dominant * TOPE_ROL).map(k => `${NOMBRE_VOZ[k]} ${Math.round(t[k])} px (${(t[k] / t.dominant).toFixed(2)}× el titular)`)

    if (typeof t.descriptor === 'number' && typeof t.cta === 'number' && t.descriptor >= t.cta) sobreTope.push(`descriptor ${Math.round(t.descriptor)} px ≥ CTA ${Math.round(t.cta)} px`)
    const peorRol = ROLES.length ? Math.max(...ROLES.map(k => t[k] / t.dominant)) : 0

    if (sobreTope.length && bloquea(p, 'jerarquia-rol', `la jerarquía por rol no se sostiene (cada voz ≤ ${TOPE_ROL}× el titular; el descriptor, menor que el CTA): ${sobreTope.join(' · ')}`, { valor: +peorRol.toFixed(2), sentido: 'max' })) fallos++

    // Tracking del titular (auditoría de diseño de la cuarta certificación, N3): dentro del rango del esquema, −0,05 ya
    // juntaba letras, −0,07 las fundía («Cerrarlo» → «Cerarlo») y +0,12 borraba el espacio. Rango de AXIS para el impacto,
    // con un poco de aire: −0,035…0,02 em. Las dos piezas aprobadas fuera de él (−0,07 y 0,05) siguen con su canon.
    if (typeof p.dominantTracking === 'number' && (p.dominantTracking < TRACKING_TITULAR[0] || p.dominantTracking > TRACKING_TITULAR[1]) && bloquea(p, 'tracking-titular', `el tracking del titular (${p.dominantTracking} em) está fuera de ${TRACKING_TITULAR[0]}…${TRACKING_TITULAR[1]} em: junta o separa las letras hasta que se leen otras palabras`)) fallos++

    // Aire del botón (auditoría de diseño, hallazgo 8): con padding 0 el borde cortaba las letras.
    const variante = r.ctaVariante?.elegida ?? p.cta.variant

    // Piso de legibilidad (decisión del operador del 2026-09-23): el CTA, 11 px en el teléfono; las demás voces, 9.
    const chicas = Object.entries(r.accesibilidad?.voces ?? {}).filter(([v, m]) => m?.cssPx != null && m.cssPx < (v === 'cta' ? LEGIBLE_CTA_PX : LEGIBLE_PX))

    if (chicas.length && bloquea(p, 'legibilidad', `texto chico en un teléfono (${r.anchoPantalla ?? 390} CSS px de ancho): ${chicas.map(([v, m]) => `${v} ${m.cssPx} px (piso ${v === 'cta' ? LEGIBLE_CTA_PX : LEGIBLE_PX})`).join(' · ')}. Sube el tamaño o recorta el texto; en 16:9 el titular también crece`, { valor: Math.min(...chicas.map(([, m]) => m.cssPx)), sentido: 'min' })) fallos++

    if (variante !== 'text' && (p.cta.paddingX < p.cta.fontSize * AIRE_CTA.x || p.cta.paddingY < p.cta.fontSize * AIRE_CTA.y) && bloquea(p, 'cta-aire', `el botón tiene poco aire: padding ${p.cta.paddingX} × ${p.cta.paddingY} px para un CTA de ${p.cta.fontSize} px (canon: al menos ${AIRE_CTA.x}× y ${AIRE_CTA.y}× el cuerpo)`)) fallos++
  }
}

// 🔴 Cero piezas evaluadas NO es un pase [reportado por «Ads con lenguaje fotográfico Efeonce»].
// El loop recorre el `qa.json` de la ÚLTIMA corrida del compositor: si el plan que se pasa no es el
// que se acaba de componer, no se evalúa nada y el gate bendice igual. Es el mismo bug class que este
// archivo vino a cerrar —«la ausencia ES el fallo»— un nivel más arriba.
if (n === 0) {
  console.error(
    `✗ 0 piezas evaluadas: ninguna del plan aparece en ${qaPath}. ` +
      `Corre \`pnpm foto:componer:cta ${plan}\` antes del gate — un gate vacío no es un gate verde.`
  )
  process.exit(1)
}

if (fallos) { console.error(`\n✗ ${fallos} fallo(s) en ${n} pieza(s) con CTA.`); process.exit(1) }

if (noCertificable.length) {
  console.error(`\n⊘ NO CERTIFICABLE — ${n} pieza(s) sin fallas en lo que se pudo verificar, pero el gate no puede certificarlas:`)
  for (const m of [...new Set(noCertificable)]) console.error(`  · ${m}`)
  process.exit(3)
}

// El 0 del modo rápido verifica el QA contra las huellas, no la imagen: quien reescribe el QA entero con huellas coherentes lo
// engaña. Sólo `--reproducir` certifica la imagen (tramo 10; auditoría de arquitectura, «conocido y abierto»). El mensaje lo dice.
const como = ORIGEN
  ? 'certificadas por reproducción: lo entregado es idéntico a lo que produce el comando del repo'
  : 'cumplen el canon según su QA (verificación rápida: confía en el QA; la imagen se certifica con `--reproducir`)'

console.log(`✓ ${n} pieza(s) con CTA ${como} · huellas del plan, el plate, el PNG, el layout, el texto alternativo y el comando · texto ≥${MIN_TEXTO}:1 · superficie ≥${MIN_BORDE}:1 · toda voz en WCAG 2.2 AA por su trazo, según su tamaño en pantalla · firma y zona segura del canon.`)
