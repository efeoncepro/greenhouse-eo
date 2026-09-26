#!/usr/bin/env node
/**
 * Inventario generado de la flota — `pnpm models:inventory` / `--write`.
 *
 * Existe para cerrar una CLASE, no cinco casos. El gate de frescura encontró capacidades que el CLI
 * puede ejecutar y la guía no menciona; arreglarlas a mano las cierra hoy y las reabre en cuanto
 * alguien agregue un endpoint. La sección de inventario de la guía se GENERA desde los contratos de
 * código, así que una capacidad nueva aparece documentada por construcción o el check falla.
 *
 *   pnpm models:inventory          verifica que la sección esté al día (no escribe)
 *   pnpm models:inventory --write  la regenera dentro de la guía
 *
 * Cubre los DOS carriles, incluido el de Higgsfield, que declara sus capacidades con una factory
 * posicional y por eso el gate de frescura no podía leerlo.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(import.meta.dirname, '../..')
const FAL = resolve(ROOT, 'src/lib/ai/fal-capabilities.ts')
const HF = resolve(ROOT, 'src/lib/ai/higgsfield-capabilities.ts')
const GUIA = resolve(ROOT, 'docs/architecture/GREENHOUSE_AI_MEDIA_MODEL_SELECTION_GUIDE_V1.md')

const INI = '<!-- INVENTARIO-GENERADO:INICIO -->'
const FIN = '<!-- INVENTARIO-GENERADO:FIN -->'

const escribir = process.argv.includes('--write')

// ── Carril fal: objetos literales
const fal = []
const falSrc = readFileSync(FAL, 'utf8')
const reFal = /\{\s*\n\s+id: '([a-z0-9-]+)',\s*\n\s+slug: '([^']+)',\s*\n\s+kind: '([a-z-]+)',\s*\n\s+operation: '([a-z0-9-]+)'/g
let m

while ((m = reFal.exec(falSrc)) !== null) {
  const bloque = falSrc.slice(m.index, m.index + 1200)
  const v = bloque.match(/verifiedAt: '(\d{4}-\d{2}-\d{2})'/)

  fal.push({ id: m[1], slug: m[2], kind: m[3], op: m[4], verificado: v ? v[1] : null, carril: 'fal' })
}

// ── Carril Higgsfield: factory posicional `capability(id, endpoint, label, kind, operation, {...})`
const hf = []
const hfSrc = readFileSync(HF, 'utf8')
const reHf = /capability\(\s*'([a-z0-9-]+)',\s*'([^']+)',\s*'[^']*',\s*'([a-z]+)',\s*'([a-z0-9-]+)'/g

while ((m = reHf.exec(hfSrc)) !== null) {
  const bloque = hfSrc.slice(m.index, m.index + 700)
  const v = bloque.match(/verifiedAt: '(\d{4}-\d{2}-\d{2})'/)

  hf.push({ id: m[1], slug: m[2], kind: m[3], op: m[4], verificado: v ? v[1] : null, carril: 'higgsfield' })
}

if (!fal.length || !hf.length) {
  console.error(`FATAL: el parser no leyó un carril (fal=${fal.length}, higgsfield=${hf.length}). ¿Cambió el shape?`)
  process.exit(1)
}

const todas = [...fal, ...hf]
const fila = c => `| \`${c.id}\` | \`${c.slug}\` | ${c.kind} | ${c.op} | ${c.verificado ?? '—'} |`
const seccion = grupo => grupo.sort((a, b) => a.id.localeCompare(b.id)).map(fila).join('\n')

const hoy = new Date().toISOString().slice(0, 10)

const bloque = `${INI}
<!-- NO EDITAR A MANO: lo regenera \`pnpm models:inventory --write\` desde los contratos de código. -->

> **Inventario generado el ${hoy}** desde \`src/lib/ai/fal-capabilities.ts\` y
> \`src/lib/ai/higgsfield-capabilities.ts\`. Es la lista COMPLETA de lo que \`pnpm ai:fal\` puede ejecutar
> —y por tanto de lo que puede **gastar**—. Si un id aparece acá y no tiene ficha en §5, la ficha es la que
> falta. La columna «verificado» es la fecha de una generación real nuestra; \`—\` significa que **nadie la
> ha corrido**, no que no funcione.

**Carril fal · ${fal.length} capacidades** (${fal.filter(c => c.verificado).length} con corrida real)

| id | slug | tipo | operación | verificado |
|---|---|---|---|---|
${seccion(fal)}

**Carril Higgsfield · ${hf.length} capacidades** (${hf.filter(c => c.verificado).length} con corrida real)

| id | slug | tipo | operación | verificado |
|---|---|---|---|---|
${seccion(hf)}

${FIN}`

const guia = readFileSync(GUIA, 'utf8')
const i = guia.indexOf(INI)
const j = guia.indexOf(FIN)

if (i === -1 || j === -1) {
  if (!escribir) {
    console.error(`FATAL: la guía no tiene los marcadores de inventario.\n       Corre \`pnpm models:inventory --write\` para crearlos.`)
    process.exit(1)
  }

  // Se inserta antes de la sección de mantenimiento, que es donde se va a buscar.
  const ancla = '## 11. Regla de mantenimiento'
  const k = guia.indexOf(ancla)

  if (k === -1) {
    console.error('FATAL: no encuentro dónde insertar el inventario (falta §11).')
    process.exit(1)
  }

  writeFileSync(GUIA, guia.slice(0, k) + bloque + '\n\n---\n\n' + guia.slice(k))
  console.log(`✓ inventario CREADO en la guía · ${todas.length} capacidades (${fal.length} fal + ${hf.length} higgsfield)`)
  process.exit(0)
}

const actual = guia.slice(i, j + FIN.length)
// La fecha de generación no cuenta como drift: lo que importa son las filas.
const filas = t => t.split('\n').filter(l => l.startsWith('| `')).join('\n')

if (filas(actual) === filas(bloque)) {
  console.log(`✓ inventario al día · ${todas.length} capacidades (${fal.length} fal + ${hf.length} higgsfield)`)
  process.exit(0)
}

if (!escribir) {
  console.error(`✗ el inventario de la guía NO coincide con los contratos de código.`)
  console.error(`  Hay capacidades ejecutables sin documentar, o documentadas que ya no existen.`)
  console.error(`  Corre: pnpm models:inventory --write`)
  process.exit(1)
}

writeFileSync(GUIA, guia.slice(0, i) + bloque + guia.slice(j + FIN.length))
console.log(`✓ inventario ACTUALIZADO · ${todas.length} capacidades (${fal.length} fal + ${hf.length} higgsfield)`)
