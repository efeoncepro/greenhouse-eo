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
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '../..')
const CONTRATO = resolve(ROOT, 'src/lib/ai/fal-capabilities.ts')
const GUIA = resolve(ROOT, 'docs/architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md')

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
const sinFecha = idsTotales.filter(id => !caps.some(c => c.id === id))

if (caps.length === 0) {
  console.error('FATAL: no se pudo leer ninguna capacidad de fal-capabilities.ts — ¿cambió el shape?')
  process.exit(1)
}

// ── 2. Cobertura: ¿la guía nombra cada capacidad?
const sinFicha = caps.filter(c => !guia.includes(c.id))

// ── 3. Frescura
const vencidas = caps
  .map(c => ({ ...c, edad: dias(c.verifiedAt) }))
  .filter(c => c.edad > VENTANAS.capacidad)

const porVencer = caps
  .map(c => ({ ...c, edad: dias(c.verifiedAt) }))
  .filter(c => c.edad > VENTANAS.precio && c.edad <= VENTANAS.capacidad)

// ── 4. Edad de la guía misma
const mGuia = guia.match(/\*\*Ultima actualizacion:\*\*\s*(\d{4}-\d{2}-\d{2})/)
const edadGuia = mGuia ? dias(mGuia[1]) : null

console.log(`\nFlota de modelos · ${caps.length}/${idsTotales.length} capacidades fechadas en ${CONTRATO.replace(ROOT + '/', '')}\n`)
console.log(`  guía canónica     ${mGuia ? `${mGuia[1]} (${edadGuia} días)` : 'SIN fecha legible'}`)
console.log(`  cobertura         ${caps.length - sinFicha.length}/${caps.length} con mención en la guía`)
console.log(`  frescura          ${vencidas.length} vencidas (>${VENTANAS.capacidad}d) · ${porVencer.length} por revalidar (>${VENTANAS.precio}d)\n`)

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

if (porVencer.length && !vencidas.length) {
  console.log(`  ⚠ por revalidar — precio y rankings pasan de ${VENTANAS.precio} días:`)
  for (const c of porVencer.slice(0, 8)) console.log(`      ${c.id.padEnd(24)} ${c.verifiedAt} (${c.edad}d)`)
  console.log('')
}

const falla = sinFicha.length > 0 || vencidas.length > 0 || sinFecha.length > 0

if (!falla) console.log('  ✓ flota cubierta y dentro de ventana\n')

console.log('  ALCANCE — este gate mide SÓLO el carril fal de `src/lib/ai/fal-capabilities.ts`.')
console.log('           NO mide el carril Higgsfield (44 capacidades) ni los modelos de `pnpm ai:image`.')
console.log('           Un verde acá NO es un verde de toda la flota.')
console.log('           Higgsfield NO se mide por el PARSER, no por falta de datos [medido 2026-09-22]:')
console.log('           sí tiene relojes (`verifiedAt` 1/44 · `estimateVerifiedAt` 44/44 · snapshot de esquemas),')
console.log('           pero declara sus capacidades con una factory posicional — `capability(id, endpoint, …)` —')
console.log('           y las regex de acá asumen objeto literal, así que dan CERO matches. Apuntar el gate a ese')
console.log('           archivo abortaría con FATAL, no daría un falso verde.\n')

if (falla && strict) {
  console.error('FATAL: la flota tiene huecos de cobertura o datos vencidos. Revalida contra el proveedor')
  console.error('       y actualiza guía + contrato en el MISMO commit (§11 de la guía canónica).')
  process.exit(1)
}
