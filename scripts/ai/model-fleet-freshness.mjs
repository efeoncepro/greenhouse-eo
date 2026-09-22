#!/usr/bin/env node
/**
 * Gate de frescura y cobertura de la flota de modelos — `pnpm models:freshness`.
 *
 * Existe porque la regla de mantenimiento de la guía canónica era PROSA: decía «actualiza en el
 * mismo commit» y nada fallaba cuando no se hacía. Un dato vencido no revienta: miente en silencio
 * y el agente elige mal el modelo, o presupuesta con un precio que ya no existe.
 *
 * Mide dos cosas distintas y las reporta por separado:
 *   1. COBERTURA — toda capacidad del contrato de código debe estar en la guía. Si el CLI puede
 *      gastar en un endpoint que la guía no menciona, la guía no sirve para decidir.
 *   2. FRESCURA  — cada `verifiedAt` contra una ventana por tipo de dato. Lo volátil vence antes.
 *
 * Sin --strict informa y sale 0 (advisory). Con --strict falla.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '../..')
const CONTRATO = resolve(ROOT, 'src/lib/ai/fal-capabilities.ts')
const GUIA = resolve(ROOT, 'docs/architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md')
const FICHAS = resolve(ROOT, 'docs/architecture/creative-studio/model-fleet/routes')

// Ventanas en días. Lo que cambia rápido vence rápido: un precio de proveedor se mueve por mes,
// una capacidad estructural (cuántas referencias acepta) dura mucho más.
const VENTANAS = { precio: 90, capacidad: 180 }

const strict = process.argv.includes('--strict')
const hoy = new Date()
const dias = iso => Math.floor((hoy - new Date(iso)) / 86400000)

const contrato = readFileSync(CONTRATO, 'utf8')
const guia = readFileSync(GUIA, 'utf8')

// ── 1. Capacidades declaradas en el contrato de código
const caps = []
const re = /id:\s*'([a-z0-9-]+)'[\s\S]{0,700}?verifiedAt:\s*'(\d{4}-\d{2}-\d{2})'/g
let m

while ((m = re.exec(contrato)) !== null) caps.push({ id: m[1], verifiedAt: m[2] })

const idsTotales = [...contrato.matchAll(/^\s+id: '([a-z0-9-]+)',/gm)].map(x => x[1])

// No toda capacidad se verifica con una corrida normal. Un entrenador de LoRA exige dataset y un
// minimo facturable de steps; un endpoint de stream en vivo no pasa por la cola. Exigirles
// `verifiedAt` seria pedir un gasto que nadie va a hacer, y un gate que pide imposibles se apaga.
const noVerificablePorNaturaleza = id =>
  /lora|train/.test(id) || new RegExp(`id: '${id}'[\\s\\S]{0,900}?unsupportedReason`).test(contrato)

const sinFechaTodas = idsTotales.filter(id => !caps.some(c => c.id === id))
const sinFecha = sinFechaTodas.filter(id => !noVerificablePorNaturaleza(id))
const exentas = sinFechaTodas.filter(noVerificablePorNaturaleza)

if (caps.length === 0) {
  console.error('FATAL: no se pudo leer ninguna capacidad de fal-capabilities.ts — ¿cambió el shape?')
  process.exit(1)
}

// ── 2. Cobertura. Desde 2026-09-22 la garantiza por construcción el inventario GENERADO
// (`pnpm models:inventory`), que emite la tabla completa desde los contratos y falla si alguien
// agrega un endpoint sin regenerarla. Acá queda el eje que no se puede generar: tener FICHA propia.
const sinFicha = caps.filter(c => !guia.includes(c.id))

// ── 3. Frescura
const vencidas = caps
  .map(c => ({ ...c, edad: dias(c.verifiedAt) }))
  .filter(c => c.edad > VENTANAS.capacidad)

const porVencer = caps
  .map(c => ({ ...c, edad: dias(c.verifiedAt) }))
  .filter(c => c.edad > VENTANAS.precio && c.edad <= VENTANAS.capacidad)

// ── 3b. Fichas de ruta: cada evidencia declara su `ttlDays`. No imponemos ventana:
// se respeta la que la ficha misma se puso, que es más exigente y ya es un compromiso escrito.
const fichas = []

try {
  for (const f of readdirSync(FICHAS).filter(n => n.endsWith('.json'))) {
    const card = JSON.parse(readFileSync(resolve(FICHAS, f), 'utf8'))
    let total = 0
    let vencida = 0

    for (const e of card.evidence ?? []) {
      if (!e?.observedAt || e.ttlDays === undefined || e.ttlDays === null) continue
      total += 1
      if (dias(e.observedAt) > e.ttlDays) vencida += 1
    }

    if (total) fichas.push({ nombre: f.replace('_ROUTE_CARD_V1.json', ''), total, vencida })
  }
} catch {
  // el directorio puede no existir en un checkout parcial: no es motivo para fallar
}

const evTotal = fichas.reduce((a, c) => a + c.total, 0)
const evVencida = fichas.reduce((a, c) => a + c.vencida, 0)

// ── 4. Edad de la guía misma
const mGuia = guia.match(/\*\*Ultima actualizacion:\*\*\s*(\d{4}-\d{2}-\d{2})/)
const edadGuia = mGuia ? dias(mGuia[1]) : null

console.log(`\nFlota de modelos · ${caps.length}/${idsTotales.length} capacidades fechadas en ${CONTRATO.replace(ROOT + '/', '')}\n`)
console.log(`  guía canónica     ${mGuia ? `${mGuia[1]} (${edadGuia} días)` : 'SIN fecha legible'}`)
console.log(`  cobertura         ${caps.length - sinFicha.length}/${caps.length} con mención en la guía`)
console.log(`  frescura          ${vencidas.length} vencidas (>${VENTANAS.capacidad}d) · ${porVencer.length} por revalidar (>${VENTANAS.precio}d)`)

if (evTotal) {
  const pct = Math.round((evVencida / evTotal) * 100)

  console.log(`  fichas de ruta    ${evVencida}/${evTotal} evidencias pasadas de SU PROPIO ttlDays (${pct}%)\n`)
} else {
  console.log('')
}

if (exentas.length) {
  console.log(`  · ${exentas.length} exentas de fecha por naturaleza (entrenadores de LoRA, stream en vivo):`)
  console.log('    no se verifican con una corrida normal, así que no se les exige `verifiedAt`.')
  console.log('')
}

if (sinFecha.length) {
  console.log('  ✗ SIN FECHA — declaradas en el contrato y sin `verifiedAt`, así que nada puede vencerlas:')
  for (const id of sinFecha) console.log(`      ${id}`)
  console.log('')
}

if (sinFicha.length) {
  console.log('  ✗ COBERTURA — el CLI puede gastar en esto y la guía no lo menciona:')
  for (const c of sinFicha) console.log(`      ${c.id}`)
  console.log('')
}

if (vencidas.length) {
  console.log(`  ✗ FRESCURA — verificadas hace más de ${VENTANAS.capacidad} días:`)
  for (const c of vencidas.sort((a, b) => b.edad - a.edad)) console.log(`      ${c.id.padEnd(24)} ${c.verifiedAt} (${c.edad}d)`)
  console.log('')
}

if (evVencida) {
  console.log('  ⚠ FICHAS DE RUTA (informativo, no bloquea) — evidencia pasada del TTL que ellas mismas declararon:')

  for (const c of fichas.filter(x => x.vencida).sort((a, b) => b.vencida - a.vencida)) {
    console.log(`      ${c.nombre.padEnd(26)} ${c.vencida}/${c.total}`)
  }

  console.log('      Su `ttlDays` dice «revalida antes de USAR», no «el documento venció»: es aviso, no fallo.')
  console.log('      Si vas a programar una ruta desde una ficha, revalídala primero contra el proveedor.')
  console.log('')
}

if (porVencer.length && !vencidas.length) {
  console.log(`  ⚠ por revalidar — precio y rankings pasan de ${VENTANAS.precio} días:`)
  for (const c of porVencer.slice(0, 8)) console.log(`      ${c.id.padEnd(24)} ${c.verifiedAt} (${c.edad}d)`)
  console.log('')
}

const falla = sinFicha.length > 0 || vencidas.length > 0 || sinFecha.length > 0

if (!falla) console.log('  ✓ flota cubierta y dentro de ventana\n')

console.log('  ALCANCE — este gate mide la FRESCURA del carril fal. El carril Higgsfield (44 capacidades)')
console.log('           no tiene ventana propia acá: declara sus capacidades con una factory posicional y')
console.log('           sólo 1 de 44 tiene `verifiedAt`. Su COBERTURA sí está cubierta desde 2026-09-22')
console.log('           por el inventario generado (`pnpm models:inventory`), que lee los dos carriles.')
console.log('           Los modelos de `pnpm ai:image` siguen fuera. Un verde acá no es un verde de todo.\n')

if (falla && strict) {
  console.error('FATAL: la flota tiene huecos de cobertura o datos vencidos. Revalida contra el proveedor')
  console.error('       y actualiza guía + contrato en el MISMO commit (§11 de la guía canónica).')
  process.exit(1)
}
