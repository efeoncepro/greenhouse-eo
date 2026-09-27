#!/usr/bin/env node
/**
 * Índice humano del catálogo de recetas por lámina del deck Efeonce «La órbita».
 *
 * Lee `docs/operations/brand-graphic-line/deck-recipes/EFEONCE_DECK_SLIDE_RECIPES_V1.json`
 * (esquema `efeonce.deck-slide-recipes.v1`), lo valida y reescribe el bloque generado del README de la misma
 * carpeta, entre los marcadores `<!-- deck-recipes-index:start -->` y `<!-- deck-recipes-index:end -->`.
 *
 * Falla (salida 1) si el JSON no se puede leer, si no cumple el esquema mínimo o si una referencia de
 * `preferInstead` / `pairsWith` apunta a un id que no existe (salvo las familias de AXIS declaradas en
 * `axisRecipeFamilies`, que viven fuera del catálogo).
 *
 * Uso:
 *   pnpm brand:deck-recipes            # valida y reescribe el índice
 *   pnpm brand:deck-recipes -- --check # valida y falla si el índice escrito no coincide (no escribe)
 *   node scripts/creative/deck-recipes/render-index.mjs --json <copia.json> --readme <copia.md>  # pruebas
 *
 * Sin dependencias: Node ESM puro. Salida determinística (sin fechas de corrida) para que el diff sólo cambie
 * cuando cambia el catálogo.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const folder = resolve(repo, 'docs/operations/brand-graphic-line/deck-recipes')

const argValue = flag => {
  const at = process.argv.indexOf(flag)

  return at === -1 ? undefined : process.argv[at + 1]
}

// `--json` y `--readme` sólo existen para probar el script contra copias; el uso normal no los pasa.
const jsonPath = resolve(argValue('--json') ?? resolve(folder, 'EFEONCE_DECK_SLIDE_RECIPES_V1.json'))
const readmePath = resolve(argValue('--readme') ?? resolve(folder, 'README.md'))

// Qué receta tiene plantilla: lo dice el catálogo del Artifact Composer, no el README (TASK-1928).
const deckCatalog = resolve(repo, 'src/lib/artifact-composer/catalogs/graphic-line-deck')
const mapPath = resolve(argValue('--map') ?? resolve(deckCatalog, 'recipe-map.json'))
const registryPath = resolve(argValue('--registry') ?? resolve(deckCatalog, 'registry.json'))

const START = '<!-- deck-recipes-index:start -->'
const END = '<!-- deck-recipes-index:end -->'
const SCHEMA = 'efeonce.deck-slide-recipes.v1'

const FAMILIES = [
  ['cover', 'Portadas'],
  ['close', 'Contraportadas'],
  ['section', 'Secciones'],
  ['about', 'Quiénes somos, equipo y stack'],
  ['content', 'Contenido'],
  ['method', 'Método'],
  ['proof', 'Prueba'],
  ['proposal-service', 'Propuesta por línea de servicio'],
  ['pricing', 'Cotización'],
  ['next-steps', 'Próximos pasos'],
  ['breather', 'Respiro']
]

const DOCUMENTS = [
  ['proposal', 'Propuesta'],
  ['brochure', 'Brochure'],
  ['pitch', 'Pitch'],
  ['qbr', 'QBR']
]

const SURFACES = new Set(['dark', 'paper', 'photo-bleed', 'split-paper-photo', 'cine'])
const STATUSES = new Set(['approved', 'option', 'pending', 'rejected'])
const RELATIONS = new Set(['cover↔close', 'sequence', 'variant'])

const SLOT_TYPES = new Set([
  'text',
  'richText',
  'number',
  'metric',
  'list',
  'image',
  'logo',
  'person',
  'money',
  'date',
  'enum',
  'section'
])

const SELECTION_KINDS = new Set(['none', 'collaborator', 'local-cta', 'multi'])
const KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const rel = path => relative(repo, path)

const fail = errors => {
  console.error(`✗ Catálogo de recetas del deck inválido (${errors.length} error${errors.length === 1 ? '' : 'es'}):`)
  for (const error of errors) console.error(`  - ${error}`)
  process.exit(1)
}

// 1. Leer y parsear.
let raw

try {
  raw = readFileSync(jsonPath, 'utf8')
} catch (error) {
  fail([`no se pudo leer ${rel(jsonPath)}: ${error.message}`])
}

let catalog

try {
  catalog = JSON.parse(raw)
} catch (error) {
  fail([`${rel(jsonPath)} no es JSON válido: ${error.message}`])
}

// 2. Validar.
const errors = []
const isNonEmptyString = value => typeof value === 'string' && value.trim().length > 0

const isStringList = value =>
  Array.isArray(value) && value.length > 0 && value.every(item => isNonEmptyString(item))

if (catalog?.schema !== SCHEMA) errors.push(`schema debe ser «${SCHEMA}» (vino «${catalog?.schema}»)`)
if (!isNonEmptyString(catalog?.version)) errors.push('falta version')

const axisFamilies =
  catalog?.axisRecipeFamilies && typeof catalog.axisRecipeFamilies === 'object' ? catalog.axisRecipeFamilies : {}

const recipes = Array.isArray(catalog?.recipes) ? catalog.recipes : null

if (!recipes) {
  errors.push('recipes debe ser un arreglo')
  fail(errors)
}

if (catalog.count !== recipes.length) {
  errors.push(`count dice ${catalog.count} y hay ${recipes.length} recetas`)
}

const familyIds = new Set(FAMILIES.map(([id]) => id))
const documentIds = new Set(DOCUMENTS.map(([id]) => id))
const ids = new Set()

recipes.forEach((recipe, index) => {
  const where = `recipes[${index}]${isNonEmptyString(recipe?.id) ? ` (${recipe.id})` : ''}`

  if (!isNonEmptyString(recipe?.id) || !KEBAB.test(recipe.id)) {
    errors.push(`${where}: id ausente o no kebab-case`)
  } else if (ids.has(recipe.id)) {
    errors.push(`${where}: id repetido`)
  } else if (Object.hasOwn(axisFamilies, recipe.id)) {
    errors.push(`${where}: el id choca con una familia de AXIS declarada en axisRecipeFamilies`)
  } else {
    ids.add(recipe.id)
  }

  for (const field of ['name', 'board', 'communicates']) {
    if (!isNonEmptyString(recipe?.[field])) errors.push(`${where}: falta ${field}`)
  }

  if (!familyIds.has(recipe?.family)) errors.push(`${where}: family desconocida «${recipe?.family}»`)
  if (!SURFACES.has(recipe?.surface)) errors.push(`${where}: surface desconocida «${recipe?.surface}»`)
  if (!STATUSES.has(recipe?.status)) errors.push(`${where}: status desconocido «${recipe?.status}»`)

  if (!Array.isArray(recipe?.documents) || recipe.documents.length === 0) {
    errors.push(`${where}: documents vacío`)
  } else {
    for (const document of recipe.documents) {
      if (!documentIds.has(document)) errors.push(`${where}: documento desconocido «${document}»`)
    }
  }

  if (!isStringList(recipe?.useWhen)) errors.push(`${where}: useWhen debe tener al menos una frase`)
  if (!isStringList(recipe?.avoidWhen)) errors.push(`${where}: avoidWhen debe tener al menos una frase`)
  if (!Array.isArray(recipe?.fixed)) errors.push(`${where}: fixed debe ser un arreglo`)
  if (!Array.isArray(recipe?.rules)) errors.push(`${where}: rules debe ser un arreglo`)

  if (recipe?.selection && !SELECTION_KINDS.has(recipe.selection.kind)) {
    errors.push(`${where}: selection.kind desconocido «${recipe.selection.kind}»`)
  }

  if (!Array.isArray(recipe?.slots) || recipe.slots.length === 0) {
    errors.push(`${where}: slots vacío`)
  } else {
    const slotNames = new Set()

    recipe.slots.forEach((slot, slotIndex) => {
      const slotWhere = `${where}.slots[${slotIndex}]`

      if (!isNonEmptyString(slot?.name)) errors.push(`${slotWhere}: falta name`)
      else if (slotNames.has(slot.name)) errors.push(`${slotWhere}: slot «${slot.name}» repetido`)
      else slotNames.add(slot.name)

      if (!SLOT_TYPES.has(slot?.type)) errors.push(`${slotWhere}: type desconocido «${slot?.type}»`)
      if (typeof slot?.required !== 'boolean') errors.push(`${slotWhere}: required debe ser booleano`)

      if (slot?.maxChars !== undefined && !(Number.isInteger(slot.maxChars) && slot.maxChars > 0)) {
        errors.push(`${slotWhere}: maxChars debe ser un entero positivo`)
      }
    })
  }

  if (!Array.isArray(recipe?.preferInstead)) errors.push(`${where}: preferInstead debe ser un arreglo`)
  if (!Array.isArray(recipe?.pairsWith)) errors.push(`${where}: pairsWith debe ser un arreglo`)
})

// Las referencias se validan después de conocer todos los ids.
const known = id => ids.has(id) || Object.hasOwn(axisFamilies, id)

for (const recipe of recipes) {
  if (!isNonEmptyString(recipe?.id)) continue

  for (const [field, list] of [
    ['preferInstead', recipe.preferInstead],
    ['pairsWith', recipe.pairsWith]
  ]) {
    if (!Array.isArray(list)) continue

    for (const entry of list) {
      if (!isNonEmptyString(entry?.recipe)) {
        errors.push(`${recipe.id}.${field}: entrada sin recipe`)
        continue
      }

      if (entry.recipe === recipe.id) errors.push(`${recipe.id}.${field}: se referencia a sí misma`)

      if (!known(entry.recipe)) {
        errors.push(`${recipe.id}.${field}: «${entry.recipe}» no existe en el catálogo ni en axisRecipeFamilies`)
      }

      if (field === 'preferInstead' && !isNonEmptyString(entry.when)) {
        errors.push(`${recipe.id}.preferInstead → ${entry.recipe}: falta when`)
      }

      if (field === 'pairsWith' && !RELATIONS.has(entry.relation)) {
        errors.push(`${recipe.id}.pairsWith → ${entry.recipe}: relation desconocida «${entry.relation}»`)
      }
    }
  }
}

// La plantilla de cada receta: `recipe-map.json` nombra el contentType y `registry.json` confirma que existe.
let templateOf = () => null

try {
  const map = JSON.parse(readFileSync(mapPath, 'utf8'))
  const registry = JSON.parse(readFileSync(registryPath, 'utf8'))
  const selector = registry?.selector?.map ?? {}

  for (const [id, entry] of Object.entries(map?.recipes ?? {})) {
    if (!ids.has(id)) errors.push(`recipe-map: «${id}» no existe en el catálogo de recetas`)

    if (entry?.contentType && !Object.hasOwn(selector, entry.contentType)) {
      errors.push(`recipe-map: ${id} apunta a ${entry.contentType}, que no está en registry.json`)
    }

    if (entry?.example) {
      try {
        readFileSync(resolve(repo, entry.example.replace(/#page=\d+$/, '')))
      } catch {
        errors.push(`recipe-map: el ejemplo de ${id} no existe (${entry.example})`)
      }
    }
  }

  templateOf = id => {
    const entry = map?.recipes?.[id]

    return entry?.contentType && Object.hasOwn(selector, entry.contentType) ? entry.contentType : null
  }
} catch (error) {
  errors.push(`no se pudo leer el mapa de plantillas (${rel(mapPath)} o ${rel(registryPath)}): ${error.message}`)
}

if (errors.length > 0) fail(errors)

// 3. Renderizar.
const cell = value =>
  String(value ?? '')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\|/g, '\\|')
    .trim()

const code = value => `\`${value}\``

const slotSummary = slots => {
  const required = slots.filter(slot => slot.required)
  const optional = slots.length - required.length

  const parts = required.map(slot =>
    Number.isInteger(slot.maxChars) ? `${code(slot.name)} ≤${slot.maxChars}` : code(slot.name)
  )

  if (optional > 0) parts.push(`(+${optional} opcional${optional === 1 ? '' : 'es'})`)

  return parts.join(', ')
}

const alternatives = recipe =>
  recipe.preferInstead.length === 0
    ? '—'
    : recipe.preferInstead
        .map(entry => (Object.hasOwn(axisFamilies, entry.recipe) ? `${code(entry.recipe)} (AXIS)` : code(entry.recipe)))
        .join(', ')

const statusLabel = recipe => (recipe.status === 'approved' ? '' : ` **[${recipe.status}]**`)

const lines = []

lines.push(START)
lines.push('')
lines.push(
  `<!-- Generado por scripts/creative/deck-recipes/render-index.mjs desde EFEONCE_DECK_SLIDE_RECIPES_V1.json. No editar a mano: corre «pnpm brand:deck-recipes». -->`
)
lines.push('')
lines.push(
  `Catálogo \`${catalog.schema}\` versión ${catalog.version} · ${recipes.length} recetas · aprobado el ${catalog.approvedAt ?? '—'} por ${catalog.approvedBy ?? '—'}.`
)
const templated = recipes.filter(recipe => templateOf(recipe.id)).length

lines.push(
  `**${templated} de ${recipes.length}** recetas tienen plantilla en el Artifact Composer y se componen con \`pnpm brand:compose\` (columna «Plantilla», leída de \`graphic-line-deck/registry.json\`). Las demás todavía no.`
)
lines.push('')
lines.push('### Recetas por familia y documento')
lines.push('')
lines.push(`| Familia | ${DOCUMENTS.map(([, label]) => label).join(' | ')} | Total |`)
lines.push(`|---|${DOCUMENTS.map(() => '---:').join('|')}|---:|`)

for (const [familyId, label] of FAMILIES) {
  const inFamily = recipes.filter(recipe => recipe.family === familyId)

  if (inFamily.length === 0) continue

  const counts = DOCUMENTS.map(([documentId]) => {
    const count = inFamily.filter(recipe => recipe.documents.includes(documentId)).length

    return count === 0 ? '—' : String(count)
  })

  lines.push(`| ${label} (${code(familyId)}) | ${counts.join(' | ')} | ${inFamily.length} |`)
}

lines.push('')
lines.push(
  '«Cuándo sí» y «cuándo no» muestran el primer criterio de la receta; los demás, el «cuándo» de cada alternativa, los pares, los elementos fijos, la foto y el prompt de composición están en el JSON. «Slots clave» lista los obligatorios con su largo máximo medido (`≤N` caracteres).'
)

for (const [familyId, label] of FAMILIES) {
  const inFamily = recipes.filter(recipe => recipe.family === familyId)

  if (inFamily.length === 0) continue

  lines.push('')
  lines.push(`### ${label} · ${code(familyId)} (${inFamily.length})`)
  lines.push('')
  lines.push('| id | Nombre | Plantilla | Documentos | Cuándo sí | Cuándo no | Alternativa | Slots clave |')
  lines.push('|---|---|---|---|---|---|---|---|')

  for (const recipe of inFamily) {
    lines.push(
      `| ${code(recipe.id)} | ${cell(recipe.name)}${statusLabel(recipe)} | ${templateOf(recipe.id) ? code(templateOf(recipe.id)) : '—'} | ${recipe.documents.join(', ')} | ${cell(recipe.useWhen[0])} | ${cell(recipe.avoidWhen[0])} | ${alternatives(recipe)} | ${slotSummary(recipe.slots)} |`
    )
  }
}

const axisEntries = Object.entries(axisFamilies)

if (axisEntries.length > 0) {
  lines.push('')
  lines.push('### Familias de AXIS citadas como alternativa (fuera del catálogo)')
  lines.push('')
  lines.push('| id | Qué es |')
  lines.push('|---|---|')

  for (const [id, description] of axisEntries) lines.push(`| ${code(id)} | ${cell(description)} |`)
}

lines.push('')
lines.push(END)

const block = lines.join('\n')

// 4. Escribir o comprobar.
let readme

try {
  readme = readFileSync(readmePath, 'utf8')
} catch (error) {
  fail([`no se pudo leer ${rel(readmePath)}: ${error.message}`])
}

const startAt = readme.indexOf(START)
const endAt = readme.indexOf(END)

if (startAt === -1 || endAt === -1 || endAt < startAt) {
  fail([`${rel(readmePath)} no tiene los marcadores ${START} … ${END}`])
}

const next = readme.slice(0, startAt) + block + readme.slice(endAt + END.length)
const checkOnly = process.argv.includes('--check')

if (checkOnly) {
  if (next !== readme) {
    fail([`el índice de ${rel(readmePath)} está desactualizado: corre «pnpm brand:deck-recipes»`])
  }

  console.log(`✓ ${recipes.length} recetas válidas; índice de ${rel(readmePath)} al día.`)
  process.exit(0)
}

if (next !== readme) writeFileSync(readmePath, next)

console.log(
  `✓ ${recipes.length} recetas válidas (${FAMILIES.filter(([id]) => recipes.some(recipe => recipe.family === id)).length} familias); índice ${next === readme ? 'sin cambios' : 'reescrito'} en ${rel(readmePath)}.`
)
