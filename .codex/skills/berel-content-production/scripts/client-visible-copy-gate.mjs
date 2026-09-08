#!/usr/bin/env node

import fs from 'node:fs'

const PRODUCTION_TOGGLE =
  /^#\s+(?:(?:✍\uFE0F?|🔁)\s*)?(?:versi[oó]n vigente(?: para revisi[oó]n)?|reescritura|art[ií]culo v\d+|tutorial)\b.*\{toggle="true"\}\s*$/iu
const UNINDENTED_HEADING = /^#{1,6}\s+/
const TOP_LEVEL_TOGGLE = /^#\s+.*\{toggle="true"\}\s*$/i
const DOCUMENT_BOUNDARY = /^<\/(?:content|page)>\s*$/i
const IMAGE_CALLOUT_START = /^\s*<callout\b[^>]*icon="🖼️"[^>]*>\s*$/i
const STEP_PHOTO_CALLOUT_START = /^\s*<callout\b[^>]*icon="📸"[^>]*>\s*$/i
const CALLOUT_END = /^\s*<\/callout>\s*$/i
const NESTED_TABLE_START = /^\t+<table\b[^>]*>\s*$/i
const TABLE_END = /^\s*<\/table>\s*$/i

const INTERNAL_MARKERS = [
  ['procedencia interna', /\b(?:callout de )?procedencia\b|esta versi[oó]n sale de/i],
  ['ubicación operativa', /\bd[oó]nde vive\b/i],
  ['regla SEO interna', /\bregla SEO\b/i],
  ['montaje CMS', /\bmontaje CMS\b|\bnota(?:s)? (?:de |para )?(?:carga|montaje)\b/i],
  ['instrucción para Dev', /\bschema para Dev\b|\bnotas? para Dev\b|\bpendiente para Dev\b/i],
  ['nota de adaptación', /\bnota de adaptaci[oó]n\b|\badaptaci[oó]n para hierro\/acero\b/i],
  ['selección pendiente', /\bselecci[oó]n pendiente\b/i],
  ['pendiente de publicación', /\bpendientes? antes de publicar\b|\bpendiente de confirmaci[oó]n\b/i],
  ['control interno', /\bcontrol de correcci[oó]n\b|\bcontrol (?:interno|de QA)\b/i],
  ['instrucción de no publicar', /\bno cargar(?:lo|la|los|las)? al CMS\b|\bno publicar\b/i],
  ['lenguaje de fuente interna', /\bla ficha declara\b|\bquien maquete\b/i],
  [
    'artefacto de trabajo interno',
    /\banálisis SEO\/AEO\b|\bplan editorial y SEO\b|\bbrief de origen\b|\bhandoff al CMS\b/i
  ],
  [
    'metadata de planificación dentro del artículo',
    /^\s*-\s+\*\*(?:Keyword principal|Intenci[oó]n|Delimitaci[oó]n de cluster):\*\*/i
  ],
  [
    'instrucción de control de publicación',
    /\bcapturas? (?:deben|se deben) (?:revisar|actualizar)[^.]*antes de publicar\b/i
  ],
  [
    'sección de trabajo interna',
    /^\s*#{1,6}\s+(?:Research|Análisis de contenido|Brief SEO\/AEO|Verificación en la URL publicada)\b/i
  ],
  ['placeholder de callout', /\[callout\b/i],
  [
    'campo técnico fuera de una ficha visual contextual',
    /\bALT:\s*["'«]|\bloading=["']lazy["']|\blazy:\s*(?:s[ií]|no)\b|\b\d{3,4}\s*[x×]\s*\d{3,4}\s*px\b/i
  ]
]

const INCOMPLETE_READ_MARKERS = [
  /\bcontent truncated\b/i,
  /\btruncated output\b/i,
  /\bunknown blocks?\b/i,
  /\bhas_more\s*[:=]\s*true\b/i
]

function inspect(text) {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const productionToggles = []

  for (let index = 0; index < lines.length; index += 1) {
    if (PRODUCTION_TOGGLE.test(lines[index])) productionToggles.push(index)
  }

  const errors = []

  if (productionToggles.length === 0) {
    errors.push('No se encontró una zona de producción vigente para revisar.')
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    for (const marker of INCOMPLETE_READ_MARKERS) {
      if (marker.test(line)) {
        errors.push(`Línea ${index + 1}: la lectura parece incompleta o contiene bloques desconocidos.`)
        break
      }
    }
  }

  if (productionToggles.length > 0) {
    const start = productionToggles.at(-1)
    let end = lines.length
    for (let index = start + 1; index < lines.length; index += 1) {
      if (TOP_LEVEL_TOGGLE.test(lines[index]) || DOCUMENT_BOUNDARY.test(lines[index])) {
        end = index
        break
      }
    }

    const imageSpecLines = new Set()
    const structuralExemptLines = new Set()
    const specsByNumber = new Map()
    for (let index = start + 1; index < end; index += 1) {
      if (!IMAGE_CALLOUT_START.test(lines[index])) continue
      const blockStart = index
      while (index < end && !CALLOUT_END.test(lines[index])) index += 1
      if (index >= end) {
        errors.push(`Línea ${blockStart + 1}: ficha visual sin cierre de callout.`)
        break
      }
      const blockEnd = index
      const block = lines.slice(blockStart, blockEnd + 1).join('\n')
      for (let cursor = blockStart; cursor <= blockEnd; cursor += 1) imageSpecLines.add(cursor)
      const number = block.match(/\bBanner\s+(?:N)?([1-4])\b/i)?.[1]
      if (!number) continue
      const existing = specsByNumber.get(number) ?? []
      existing.push({ block, line: blockStart + 1 })
      specsByNumber.set(number, existing)
    }

    for (let index = start + 1; index < end; index += 1) {
      if (!STEP_PHOTO_CALLOUT_START.test(lines[index])) continue
      const blockStart = index
      while (index < end && !CALLOUT_END.test(lines[index])) index += 1
      if (index >= end) {
        errors.push(`Línea ${blockStart + 1}: ficha de foto de paso sin cierre de callout.`)
        break
      }
      const blockEnd = index
      const block = lines.slice(blockStart, blockEnd + 1).join('\n')
      if (!/\*\*Foto del paso\s+\d+:/i.test(block) || !/\*\*Spec:\*\*/i.test(block)) continue
      const required = [
        ['Archivo', /\barchivo\b/i],
        ['ALT', /\bALT:\*\*|\bALT:/i],
        ['Formato 1:1', /\b1:1\b/i],
        ['Medida 500 × 500 px', /\b500\s*[x×]\s*500\s*px\b/i],
        ['Carga diferida', /\bloading=["']lazy["']/i]
      ]
      let complete = true
      for (const [field, marker] of required) {
        if (!marker.test(block)) {
          complete = false
          errors.push(`Línea ${blockStart + 1}: Foto del paso incompleta; no declara ${field}.`)
        }
      }
      if (complete) {
        for (let cursor = blockStart; cursor <= blockEnd; cursor += 1) imageSpecLines.add(cursor)
      }
    }

    for (let index = start + 1; index < end; index += 1) {
      if (!NESTED_TABLE_START.test(lines[index])) continue
      const tableStart = index
      while (index < end && !TABLE_END.test(lines[index])) index += 1
      if (index >= end) {
        errors.push(`Línea ${tableStart + 1}: tabla sin cierre dentro de la zona vigente.`)
        break
      }
      for (let cursor = tableStart; cursor <= index; cursor += 1) structuralExemptLines.add(cursor)
    }

    for (const number of ['1', '2', '3', '4']) {
      const specs = specsByNumber.get(number) ?? []
      if (specs.length !== 1) {
        errors.push(`La zona vigente debe contener exactamente una ficha Banner N${number}; se encontraron ${specs.length}.`)
        continue
      }
      const [{ block, line }] = specs
      const required = [
        ['ALT', /\bALT(?:\s+exacto|\s*\(exacto\))?\b/i],
        ['Archivo', /\bArchivo\b/i],
        ['Posición o Ubicación', /\b(?:Posici[oó]n|Ubicaci[oó]n)\b/i],
        ['Formato', /\bFormato\b|\b\d{3,4}\s*[x×]\s*\d{3,4}\s*px\b/i]
      ]
      for (const [field, marker] of required) {
        if (!marker.test(block)) errors.push(`Línea ${line}: Banner N${number} no declara ${field}.`)
      }
    }

    for (let index = start + 1; index < end; index += 1) {
      if (imageSpecLines.has(index)) continue
      const line = lines[index]
      for (const [label, marker] of INTERNAL_MARKERS) {
        if (marker.test(line)) errors.push(`Línea ${index + 1}: posible ${label}: ${line.trim()}`)
      }
    }

    for (let index = start + 1; index < end; index += 1) {
      if (structuralExemptLines.has(index)) continue
      if (lines[index].trim() !== '' && !lines[index].startsWith('\t')) {
        const detail = UNINDENTED_HEADING.test(lines[index])
          ? 'un encabezado hijo perdió el tabulador'
          : 'el contenido perdió el tabulador'
        errors.push(`Línea ${index + 1}: ${detail} y quedó fuera del toggle de la versión vigente.`)
      }
    }
  }

  return errors
}

function selfTest() {
  const spec = number => [
    '\t<callout icon="🖼️" color="gray_bg">',
    `\t\t**Banner N${number} — pieza contextual**`,
    '\t\t**Formato:** 1408 × 768 px · WebP',
    `\t\t**ALT exacto:** Imagen contextual ${number}`,
    `\t\t**Archivo:** imagen-contextual-${number}.webp`,
    '\t\t**Posición:** después de la sección correspondiente.',
    '\t</callout>'
  ]
  const cleanLines = [
    '# ✍️ Versión vigente para revisión {toggle="true"}',
    '',
    '\t## Metadatos propuestos',
    '\t- Title: Cómo proteger el metal del óxido',
    '\t## Cómo preparar la superficie',
    '\tRetira el polvo y la pintura suelta antes de aplicar el recubrimiento.',
    '\t<table header-row="true">',
    '<tr>',
    '<td>Paso</td>',
    '<td>Acción</td>',
    '</tr>',
    '<tr>',
    '<td>1</td>',
    '<td>Preparar</td>',
    '</tr>',
    '\t</table>',
    ...spec(1),
    ...spec(2),
    ...spec(3),
    ...spec(4),
    ...[1, 2, 3, 4].flatMap(number => [
      '\t<callout icon="📸" color="gray_bg">',
      `\t\t**Foto del paso ${number}:** acción correspondiente al paso.`,
      `\t\t**Spec:** archivo \`paso-${number}.webp\` · 1:1 de 500 × 500 px · menos de 200 KB · con \`loading="lazy"\` · **ALT:** "Foto del paso ${number}".`,
      '\t</callout>'
    ])
  ]
  const clean = cleanLines.join('\n')
  const wrapped = `<page>\n<content>\n${clean}\n</content>\n</page>`
  const leaked = `${clean}\n\tMontaje CMS: cargar el tutorial en cuatro pasos.`
  const unindented = `${clean}\nEsta línea se salió del toggle.`
  const unindentedHeading = `${clean}\n## Este encabezado se salió del toggle`
  const internalPlan = `${clean}\n\t## Análisis SEO/AEO`
  const planningMetadata = `${clean}\n\t- **Keyword principal:** pintar metal`
  const looseTechnical = `${clean}\n\tALT: "Especificación suelta que no pertenece a una ficha visual"`
  const evidencePlan = [
    '# 🧭 Plan editorial y SEO {toggle="true"}',
    '\t## Research y fuentes',
    '\tDónde vive: evidencia del Content Hub.',
    '\tLimitación verificada: falta confirmar un dato de CMS antes de publicar.',
    '\tPendiente trazable: owner y siguiente paso registrados.',
    clean
  ].join('\n')
  const missingSpec = cleanLines.filter(line => !line.includes('contextual-4') && !line.includes('contextual 4')).join('\n')
  const missingPosition = clean.replace(
    '\t\t**Posición:** después de la sección correspondiente.\n\t</callout>',
    '\t\t**Lugar:** después de la sección correspondiente.\n\t</callout>'
  )

  if (inspect(clean).length !== 0) throw new Error('El caso limpio no pasó.')
  if (inspect(wrapped).length !== 0) throw new Error('El export completo de Notion no pasó.')
  if (inspect(evidencePlan).length !== 0) {
    throw new Error('El toggle de evidencia legítimo contaminó el gate editorial.')
  }
  if (!inspect(leaked).some(error => error.includes('montaje CMS'))) {
    throw new Error('El caso con nota interna no falló.')
  }
  if (!inspect(unindented).some(error => error.includes('perdió el tabulador'))) {
    throw new Error('El caso con jerarquía rota no falló.')
  }
  if (!inspect(unindentedHeading).some(error => error.includes('encabezado hijo perdió'))) {
    throw new Error('El caso con encabezado expulsado del toggle no falló.')
  }
  if (!inspect(internalPlan).some(error => error.includes('artefacto de trabajo interno'))) {
    throw new Error('El caso con plan interno visible no falló.')
  }
  if (!inspect(planningMetadata).some(error => error.includes('metadata de planificación'))) {
    throw new Error('El caso con metadata de planificación dentro del artículo no falló.')
  }
  if (!inspect(looseTechnical).some(error => error.includes('campo técnico fuera de una ficha visual contextual'))) {
    throw new Error('El caso con especificación técnica suelta no falló.')
  }
  if (!inspect(missingSpec).some(error => error.includes('Banner N4'))) {
    throw new Error('El caso sin una ficha visual no falló.')
  }
  if (!inspect(missingPosition).some(error => error.includes('Posición o Ubicación'))) {
    throw new Error('El caso con ficha incompleta no falló.')
  }

  process.stdout.write('PASS client-visible-copy-gate self-test\n')
}

function readInput(path) {
  if (path) return fs.readFileSync(path, 'utf8')
  if (!process.stdin.isTTY) return fs.readFileSync(0, 'utf8')
  throw new Error('Uso: node scripts/client-visible-copy-gate.mjs <export.md> o entrada por stdin.')
}

if (process.argv.includes('--self-test')) {
  selfTest()
  process.exit(0)
}

try {
  const path = process.argv.slice(2).find(argument => !argument.startsWith('--'))
  const errors = inspect(readInput(path))
  if (errors.length > 0) {
    process.stderr.write(`FAIL client-visible-copy-gate (${errors.length})\n- ${errors.join('\n- ')}\n`)
    process.exit(1)
  }
  process.stdout.write(
    'PASS client-visible-copy-gate: toggle editorial vigente sin notas internas, N1–N4 contextuales y jerarquía preservada.\n'
  )
} catch (error) {
  process.stderr.write(`ERROR client-visible-copy-gate: ${error.message}\n`)
  process.exit(2)
}
