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
    /^\s*#{1,6}\s+(?:[📚🔎🧪⚙️🛠️📌✅]\uFE0F?\s*)?(?:Research|Análisis de contenido|Brief SEO\/AEO|Verificación en la URL publicada|Fuentes(?: y referencias)?|Referencias(?: internas)?|Control de QA|QA(?: editorial)?|CMS(?: y publicación)?|Handoff(?: al CMS)?|Datos operativos|Implementación CMS|Schema|Ruta (?:CMS|Drupal)|Conteo de palabras)\b/i
  ],
  [
    'campo operativo dentro de la narrativa',
    /^\s*(?:[-*]\s*)?(?:\*\*)?(?:Autor|Conteo de palabras|Word count|Fuentes|Referencias|CMS|Schema|Ruta(?: (?:CMS|Drupal))?|Nodo Drupal|Estado de QA|QA(?: status)?|Fecha de carga|Fecha de publicación)(?::\*\*|\*\*:|:)\s*/i
  ],
  ['enlace interno de Notion expuesto al lector', /https?:\/\/(?:www\.)?(?:app\.)?notion\.(?:com|so)\//i],
  [
    'razonamiento o instrucción del agente',
    /\b(?:nota interna|razonamiento del agente|como agente|opté por|decidimos (?:mantener|cambiar|ajustar)|se decidió (?:mantener|cambiar|ajustar)|comentario del cliente|feedback del cliente|solicitud del cliente|el cliente (?:pidió|solicitó|indicó|aprobó|rechazó)|para revisión del cliente|este párrafo (?:se|lo)|hay que (?:corregir|ajustar|validar) este texto)\b/i
  ],
  ['pendiente editorial interno', /\b(?:TODO|FIXME)\b|\bpendiente de (?:validar|revisar|corregir|reescribir)\b/i],
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

const ADJACENT_DUPLICATE = /\b([\p{L}]{3,})\s+\1\b/iu
const FUSED_DUPLICATE = /\b([\p{L}]{4,})\1\b/iu

function findBannerNumber(block) {
  return (
    block.match(/\b(?:Banner|Imagen|Pieza)\s+(?:N(?:[.°º]\s*)?)?([1-4])\b/iu)?.[1] ??
    block.match(/(?:^|\n)\s*(?:\t+)?(?:\*\*)?N(?:[.°º]\s*)?([1-4])\b/mu)?.[1]
  )
}

function findStepPhotoNumber(block) {
  return block.match(/\bFoto\s+del\s+paso\s+(?:N(?:[.°º]\s*)?)?(\d+)\b/iu)?.[1]
}

function validateVisualSpec(block, line, label, { stepPhoto = false } = {}) {
  const required = [
    ['Archivo', /\b(?:nombre de )?archivo\b/iu],
    ['ALT', /\b(?:ALT|texto alternativo)(?:\s+exacto|\s*\(exacto\))?\b/iu],
    ['Dimensiones', /\b\d{2,4}\s*[x×]\s*\d{2,4}\s*px\b/iu],
    [
      'Posición o Ubicación',
      stepPhoto
        ? /\bFoto\s+del\s+paso\s+(?:N(?:[.°º]\s*)?)?\d+\b|\b(?:Posici[oó]n|Ubicaci[oó]n)\b/iu
        : /\b(?:Posici[oó]n|Ubicaci[oó]n)\b|\b(?:antes|despu[eé]s|junto|debajo|encima) de\b/iu
    ]
  ]
  const missing = []
  for (const [field, marker] of required) {
    if (!marker.test(block)) missing.push(field)
  }
  return missing.map(field => `Línea ${line}: ${label} no declara ${field}.`)
}

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
  if (productionToggles.length > 1) {
    errors.push(
      `Se encontraron ${productionToggles.length} zonas candidatas a producción vigente; debe quedar exactamente una y las demás deben rotularse como históricas.`
    )
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
    const stepSpecsByNumber = new Map()
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
      const number = findBannerNumber(block)
      if (!number) continue
      for (let cursor = blockStart; cursor <= blockEnd; cursor += 1) imageSpecLines.add(cursor)
      const existing = specsByNumber.get(number) ?? []
      existing.push({ block, line: blockStart + 1 })
      specsByNumber.set(number, existing)
    }

    for (let index = start + 1; index < end; index += 1) {
      if (!STEP_PHOTO_CALLOUT_START.test(lines[index]) && !IMAGE_CALLOUT_START.test(lines[index])) continue
      const blockStart = index
      while (index < end && !CALLOUT_END.test(lines[index])) index += 1
      if (index >= end) {
        errors.push(`Línea ${blockStart + 1}: ficha de foto de paso sin cierre de callout.`)
        break
      }
      const blockEnd = index
      const block = lines.slice(blockStart, blockEnd + 1).join('\n')
      const number = findStepPhotoNumber(block)
      if (!number) continue
      for (let cursor = blockStart; cursor <= blockEnd; cursor += 1) imageSpecLines.add(cursor)
      errors.push(...validateVisualSpec(block, blockStart + 1, `Foto del paso N${number}`, { stepPhoto: true }))
      const existing = stepSpecsByNumber.get(number) ?? []
      existing.push({ block, line: blockStart + 1 })
      stepSpecsByNumber.set(number, existing)
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

    const hasBannerSpecs = [...specsByNumber.values()].some(specs => specs.length > 0)
    const activeSpecsByNumber = hasBannerSpecs ? specsByNumber : stepSpecsByNumber
    const activeSpecLabel = hasBannerSpecs ? 'Banner' : 'Foto del paso'
    for (const number of ['1', '2', '3', '4']) {
      const specs = activeSpecsByNumber.get(number) ?? []
      if (specs.length !== 1) {
        errors.push(
          `La zona vigente debe contener exactamente una ficha ${activeSpecLabel} N${number}; se encontraron ${specs.length}.`
        )
        continue
      }
      const [{ block, line }] = specs
      if (hasBannerSpecs) errors.push(...validateVisualSpec(block, line, `${activeSpecLabel} N${number}`))
    }

    for (let index = start + 1; index < end; index += 1) {
      const line = lines[index]
      for (const [label, marker] of INTERNAL_MARKERS) {
        if (imageSpecLines.has(index) && label === 'campo técnico fuera de una ficha visual contextual') continue
        if (marker.test(line)) errors.push(`Línea ${index + 1}: posible ${label}: ${line.trim()}`)
      }
      const adjacentDuplicate = line.match(ADJACENT_DUPLICATE)?.[0]
      if (adjacentDuplicate) {
        errors.push(`Línea ${index + 1}: duplicación adyacente evidente: ${adjacentDuplicate}`)
      }
      const fusedDuplicate = line.match(FUSED_DUPLICATE)?.[0]
      if (fusedDuplicate) {
        errors.push(`Línea ${index + 1}: duplicación fusionada evidente: ${fusedDuplicate}`)
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
  const historicalVisualLabels = [
    '# ✍️ Versión vigente para revisión {toggle="true"}',
    '\t## Preparación de la superficie',
    '\tLimpia y seca la superficie antes de comenzar.',
    ...[1, 2, 3, 4].flatMap(number => [
      '\t<callout icon="🖼️" color="gray_bg">',
      `\t\t**N${number} — pieza contextual ya producida**`,
      '\t\t**Dimensiones:** 1408 x 768 px · WebP',
      `\t\t**Texto alternativo:** Aplicación contextual ${number}`,
      `\t\t**Nombre de archivo:** aplicacion-contextual-${number}.webp`,
      '\t\t**Ubicación contextual:** después del apartado correspondiente.',
      '\t</callout>'
    ])
  ].join('\n')
  const photosOnly = [
    '# Tutorial {toggle="true"}',
    '\t## Cómo aplicar el producto',
    '\tSigue los pasos en orden y respeta el tiempo de secado.',
    ...[1, 2, 3, 4].flatMap(number => [
      '\t<callout icon="📸" color="gray_bg">',
      `\t\t**Foto del paso N${number}:** acción correspondiente a este paso.`,
      `\t\t**Archivo:** paso-${number}.webp · **Dimensiones:** 500 × 500 px · **ALT:** "Foto del paso ${number}".`,
      '\t</callout>'
    ])
  ].join('\n')
  const wrapped = `<page>\n<content>\n${clean}\n</content>\n</page>`
  const leaked = `${clean}\n\tMontaje CMS: cargar el tutorial en cuatro pasos.`
  const notionLink = `${clean}\n\tConsulta la [fuente](https://app.notion.com/p/efeonce/documento-interno) para más información.`
  const notionLinkInVisualSpec = clean.replace(
    '\t\t**Posición:** después de la sección correspondiente.',
    '\t\t**Posición:** después de la [referencia interna](https://app.notion.com/p/efeonce/spec-interna).'
  )
  const operationalSection = `${clean}\n\t## Fuentes y referencias`
  const operationalFields = [
    '- **Fuentes:** fichas y referencias',
    '- **QA:** aprobado internamente',
    '- **CMS:** Drupal',
    '- **Conteo de palabras:** 1,200',
    '- **Autor:** agente editorial',
    '- **Schema:** Article',
    '- **Ruta:** /ruta-interna'
  ].map(field => `${clean}\n\t${field}`)
  const agentReasoning = `${clean}\n\tEl cliente pidió cambiar este párrafo y se decidió mantener la estructura.`
  const adjacentDuplicate = `${clean}\n\tAplica una segunda segunda capa cuando seque.`
  const fusedDuplicate = `${clean}\n\tAplica una segundasegunda capa cuando seque.`
  const multipleCurrentZones = `${clean}\n# Reescritura {toggle="true"}\n\tTexto alternativo.`
  const unindented = `${clean}\nEsta línea se salió del toggle.`
  const unindentedHeading = `${clean}\n## Este encabezado se salió del toggle`
  const internalPlan = `${clean}\n\t## Análisis SEO/AEO`
  const planningMetadata = `${clean}\n\t- **Keyword principal:** pintar metal`
  const looseTechnical = `${clean}\n\tALT: "Especificación suelta que no pertenece a una ficha visual"`
  const evidencePlan = [
    '# 🧭 Plan editorial y SEO {toggle="true"}',
    '\t## Research y fuentes',
    '\tDónde vive: evidencia del Content Hub.',
    '\t[Fuente interna](https://app.notion.com/p/efeonce/evidencia) conservada para trazabilidad.',
    '\tLimitación verificada: falta confirmar un dato de CMS antes de publicar.',
    '\tPendiente trazable: owner y siguiente paso registrados.',
    clean
  ].join('\n')
  const missingSpec = cleanLines
    .filter(line => !line.includes('contextual-4') && !line.includes('contextual 4'))
    .join('\n')
  const missingPosition = clean.replace(
    '\t\t**Posición:** después de la sección correspondiente.\n\t</callout>',
    '\t\t**Lugar:** pieza contextual.\n\t</callout>'
  )

  if (inspect(clean).length !== 0) throw new Error('El caso limpio no pasó.')
  if (inspect(wrapped).length !== 0) throw new Error('El export completo de Notion no pasó.')
  if (inspect(historicalVisualLabels).length !== 0) {
    throw new Error('Las etiquetas visuales históricas N1–N4 no pasaron.')
  }
  if (inspect(photosOnly).length !== 0) {
    throw new Error('Las fichas contextuales Foto del paso N no pasaron.')
  }
  if (inspect(evidencePlan).length !== 0) {
    throw new Error('El toggle de evidencia legítimo contaminó el gate editorial.')
  }
  if (!inspect(leaked).some(error => error.includes('montaje CMS'))) {
    throw new Error('El caso con nota interna no falló.')
  }
  if (!inspect(notionLink).some(error => error.includes('enlace interno de Notion'))) {
    throw new Error('El caso con enlace interno de Notion no falló.')
  }
  if (!inspect(notionLinkInVisualSpec).some(error => error.includes('enlace interno de Notion'))) {
    throw new Error('El enlace interno de Notion dentro de una ficha visual no falló.')
  }
  if (!inspect(operationalSection).some(error => error.includes('sección de trabajo interna'))) {
    throw new Error('El caso con sección operativa no falló.')
  }
  for (const operationalField of operationalFields) {
    if (!inspect(operationalField).some(error => error.includes('campo operativo'))) {
      throw new Error(`El caso con campo operativo no falló: ${operationalField.split('\n').at(-1)}`)
    }
  }
  if (!inspect(agentReasoning).some(error => error.includes('razonamiento o instrucción del agente'))) {
    throw new Error('El caso con razonamiento del agente no falló.')
  }
  if (!inspect(adjacentDuplicate).some(error => error.includes('duplicación adyacente'))) {
    throw new Error('El caso con palabras adyacentes duplicadas no falló.')
  }
  if (!inspect(fusedDuplicate).some(error => error.includes('duplicación fusionada'))) {
    throw new Error('El caso con palabra fusionada duplicada no falló.')
  }
  if (!inspect(multipleCurrentZones).some(error => error.includes('zonas candidatas'))) {
    throw new Error('El caso con más de una zona editorial candidata no falló.')
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
