// `pnpm foto:cta:gate <plan.json>` — verifica los mínimos de accesibilidad del CTA sobre el QA ya emitido.
//
// Existe porque el hueco que cierra NO se veía: en variante `solid` el compositor marcaba `skipContrast`
// y la clave `contraste.cta` nunca se escribía, así que el QA salía limpio **porque el dato no existía**,
// no porque hubiera pasado. Un gate que sólo mira las claves presentes no puede detectar una ausencia:
// por eso éste EXIGE la clave y falla si falta.
import { readFileSync, existsSync, statSync } from 'node:fs'
import path from 'node:path'

const plan = process.argv[2]

if (!plan) { console.error('uso: pnpm foto:cta:gate <plan.json>'); process.exit(2) }

const dir = path.dirname(path.resolve(plan))
const qaPath = path.join(dir, 'out', 'qa.json')

if (!existsSync(qaPath)) { console.error(`✗ no existe ${qaPath}. Corre \`pnpm foto:componer:cta ${plan}\` primero.`); process.exit(1) }

// 🔴 Una salida más vieja que el plan NO es la salida del plan [2026-09-22, CMP-002].
// El compositor aborta a mitad de corrida cuando una pieza viola `subjectProtection`, y deja el
// `qa.json` de la corrida ANTERIOR intacto. El gate lo leía y daba verde sobre números que ya no
// describían el plan: vio pasar el set completo mientras el compositor estaba en rojo.
if (statSync(qaPath).mtimeMs < statSync(path.resolve(plan)).mtimeMs) {
  console.error(
    `✗ ${qaPath} es anterior al plan: la última composición no terminó o no se corrió. ` +
      `Corre \`pnpm foto:componer:cta ${plan}\` y resuelve su error antes del gate.`
  )
  process.exit(1)
}

const piezas = JSON.parse(readFileSync(path.resolve(plan), 'utf8'))
const qa = JSON.parse(readFileSync(qaPath, 'utf8'))
const conCta = new Set(piezas.filter(p => p.cta).map(p => p.id))

// 🔴 La protección del sujeto se DECLARA en cada pieza, aunque sea para decir que no hay sujeto
// [2026-09-22, CMP-002]. La guarda existía en el compositor (`subjectProtection` → el descriptor no
// baja de `top - minClearance`) pero sólo actuaba si la pieza la declaraba, y ninguna lo hacía: el
// CTA del KV-01 quedó encima de la cabeza de Nexa con el gate verde. Un mecanismo opcional que nadie
// declara es un mecanismo apagado. `false` es una declaración válida: dice «debajo del texto no hay
// persona», y queda escrito para quien revise.
for (const p of piezas.filter(p => p.cta)) {
  const sp = p.subjectProtection
  const declarada = sp === false || (sp && typeof sp.top === 'number' && typeof sp.minClearance === 'number')

  if (!declarada) {
    console.error(
      `✗ ${p.id}: falta \`subjectProtection\`. Declara { "top": <px donde empieza la cabeza en el plate>, ` +
        '"minClearance": 24 } si hay una persona bajo el bloque de texto, o `false` si no la hay.'
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
console.log(`✓ ${n} pieza(s) con CTA cumplen los mínimos (texto ≥${MIN_TEXTO}:1 · superficie ≥${MIN_BORDE}:1).`)
