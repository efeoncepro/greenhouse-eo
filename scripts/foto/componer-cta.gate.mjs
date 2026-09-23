// `pnpm foto:cta:gate <plan.json>` — verifica los mínimos de accesibilidad del CTA sobre el QA ya emitido.
//
// Existe porque el hueco que cierra NO se veía: en variante `solid` el compositor marcaba `skipContrast`
// y la clave `contraste.cta` nunca se escribía, así que el QA salía limpio **porque el dato no existía**,
// no porque hubiera pasado. Un gate que sólo mira las claves presentes no puede detectar una ausencia:
// por eso éste EXIGE la clave y falla si falta.
import { readFileSync, existsSync, statSync } from 'node:fs'
import path from 'node:path'

import { huellaComando, huellaPieza, rutaQa, sha } from './cta-integridad.mjs'

const plan = process.argv[2]

if (!plan) { console.error('uso: pnpm foto:cta:gate <plan.json>'); process.exit(2) }

const dir = path.dirname(path.resolve(plan))
const qaPlan = rutaQa(path.join(dir, 'out'), plan)
const qaLegado = path.join(dir, 'out', 'qa.json')

// QA POR PLAN, con huellas [2026-09-23]. El formato anterior (`out/qa.json` compartido por todos los planes de la
// carpeta, sin huellas) se sigue leyendo para no dejar a nadie sin gate, pero NO certifica: no hay cómo probar que
// sus números describen este plan, este plate y este PNG.
const legado = !existsSync(qaPlan)
const qaPath = legado ? qaLegado : qaPlan

if (!existsSync(qaPath)) { console.error(`✗ no existe ${qaPlan}. Corre \`pnpm foto:componer:cta ${plan}\` primero.`); process.exit(1) }

if (legado) {
  console.warn(`⚠ ${qaLegado} es del formato anterior (compartido y sin huellas): este gate no puede certificarlo. Recompón con \`pnpm foto:componer:cta ${plan}\` para certificar.`)

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
if (!legado) {
  const comando = huellaComando()

  for (const p of piezas.filter(p => p.cta)) {
    const h = qa.find(r => r.id === p.id)?.huellas

    if (!h) continue
    const fallas = []

    if (h.pieza !== huellaPieza(p)) fallas.push('el plan de la pieza cambió después de componer')
    const plate = path.resolve(dir, p.plate)

    if (!existsSync(plate)) fallas.push(`no existe el plate \`${p.plate}\``)
    else if (h.plate !== sha(readFileSync(plate))) fallas.push('el plate cambió después de componer')
    const png = path.join(dir, 'out', `${p.id}.png`)

    if (!existsSync(png)) fallas.push(`falta \`out/${p.id}.png\``)
    else if (h.png !== sha(readFileSync(png))) fallas.push(`\`out/${p.id}.png\` no es el PNG que registró la composición`)

    if (fallas.length) {
      console.error(`✗ ${p.id}: ${fallas.join(' · ')}. Recompón con \`pnpm foto:componer:cta ${plan} ${p.id}\`.`)
      process.exitCode = 1
    } else if (h.compositor !== comando) {
      console.warn(`⚠ ${p.id}: se compuso con otra versión del comando. Recompón para certificarla con la vigente.`)
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
  const solid = pieza.cta.variant === 'solid'

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
  const esText = pieza.cta.variant === 'text'
  const campo = esText ? 'inkToken' : 'surfaceToken'
  const token = pieza.cta[campo]

  if (token && !ACENTOS.has(token)) {
    console.error(
      `✗ ${r.id}: \`${campo}: ${token}\` no es un acento (${[...ACENTOS].join(' · ')}). ` +
        (esText
          ? 'En la variante `text` el acento lo porta la TINTA: no hay superficie que lo sostenga.'
          : 'En `solid`/`outline` el acento lo porta la superficie; lo que se degrada por contraste es la tinta.') +
        ' Si el acento no alcanza el mínimo, se regenera el plate — no se apaga el color.'
    ); fallos++
  }

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

// ── Accesibilidad sobre el píxel (medida por el compositor con scripts/foto/accesibilidad.mjs) ─────────────
// BLOQUEA: cualquier voz bajo WCAG 2.2 AA según su tamaño EN PANTALLA (texto normal 4,5:1, grande 3:1) y los
// límites del CTA —relleno o borde— bajo 3:1 (1.4.11). Calibrado 2026-09-22 contra las 86 piezas que componen
// en el repo: 0 fallas, así que la regla no rompe nada aprobado.
// AVISA: APCA bajo Bronze, daltonismo bajo el umbral, texto de menos de 9 px en el teléfono y alternativa sin
// descripción de la escena. Son hallazgos de diseño que se miran: WCAG aprueba, esto no.
const LEGIBLE_PX = 9

for (const r of qa.filter(x => conCta.has(x.id))) {
  const a = r.accesibilidad

  if (!a) {
    console.warn(`⚠ ${r.id}: el QA no trae medición de accesibilidad (compositor anterior). Recompón para certificarla.`)
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
  }

  const medidas = Object.entries(a.voces).filter(([, m]) => m)
  const apca = medidas.filter(([, m]) => m.cumpleApca === false).map(([v, m]) => `${v} Lc ${Math.abs(m.apca)}/${m.umbralApca}`)
  const dalt = medidas.filter(([, m]) => m.cumpleDaltonismo === false).map(([v, m]) => `${v} (P ${m.daltonismo.protan} · D ${m.daltonismo.deutan} · T ${m.daltonismo.tritan})`)
  const chicas = medidas.filter(([, m]) => m.cssPx != null && m.cssPx < LEGIBLE_PX).map(([v, m]) => `${v} ${m.cssPx} px`)

  if (apca.length) console.warn(`⚠ ${r.id}: bajo APCA Bronze — ${apca.join(' · ')}`)
  if (dalt.length) console.warn(`⚠ ${r.id}: bajo el umbral con daltonismo — ${dalt.join(' · ')}`)
  if (chicas.length) console.warn(`⚠ ${r.id}: menos de ${LEGIBLE_PX} px en un teléfono (390 px de ancho) — ${chicas.join(' · ')}`)
  if (!a.altTextEscena) console.warn(`⚠ ${r.id}: el texto alternativo trae el texto de la imagen pero no describe la escena — agrega \`altText\` al plan.`)
}

// Avisos (no fallan): se leen antes de aprobar, porque el número solo no alcanza para decidir.
for (const r of qa.filter(x => conCta.has(x.id))) {
  // La firma es un logotipo: la norma de contraste no la exige, pero una firma que no se lee no firma.
  if (typeof r.contraste?.logo === 'number' && r.contraste.logo < 3) {
    console.warn(`⚠ ${r.id}: la firma mide ${r.contraste.logo}:1 contra su fondo — mira si se lee o muévela (\`logo.y\`).`)
  }

  if (r.firmaSobreSujeto) console.warn(`⚠ ${r.id}: la firma queda sobre el sujeto (${r.firmaSobreSujeto} px de su silueta).`)
  for (const z of r.zonasIgnoradas ?? []) console.warn(`⚠ ${r.id}: zona del sujeto ignorada [${z.box.join(', ')}] — ${z.reason}`)
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
console.log(`✓ ${n} pieza(s) con CTA cumplen los mínimos (texto ≥${MIN_TEXTO}:1 · superficie ≥${MIN_BORDE}:1 · toda voz en WCAG 2.2 AA según su tamaño en pantalla).`)
