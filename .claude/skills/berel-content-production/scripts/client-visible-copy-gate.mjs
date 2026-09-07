#!/usr/bin/env node

import fs from 'node:fs'

const ACTIVE_TITLE = /^#\s+.*versi[oó]n vigente para revisi[oó]n.*\{toggle="true"\}\s*$/i
const UNINDENTED_HEADING = /^#{1,6}\s+/
const TOP_LEVEL_TOGGLE = /^#\s+.*\{toggle="true"\}\s*$/i

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
    'sección de trabajo interna',
    /^\s*#{1,6}\s+(?:Research|Análisis de contenido|Brief SEO\/AEO|Verificación en la URL publicada)\b/i
  ],
  ['placeholder de callout', /\[callout\b/i],
  [
    'especificación técnica incrustada',
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
  const active = []

  for (let index = 0; index < lines.length; index += 1) {
    if (ACTIVE_TITLE.test(lines[index])) active.push(index)
  }

  const errors = []

  if (active.length !== 1) {
    errors.push(
      `Se esperaba exactamente una versión vigente titulada "Versión vigente para revisión"; se encontraron ${active.length}.`
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
    for (const [label, marker] of INTERNAL_MARKERS) {
      if (marker.test(line)) {
        errors.push(`Línea ${index + 1}: posible ${label}: ${line.trim()}`)
      }
    }
  }

  if (active.length === 1) {
    const start = active[0]
    let end = lines.length
    for (let index = start + 1; index < lines.length; index += 1) {
      if (TOP_LEVEL_TOGGLE.test(lines[index])) {
        end = index
        break
      }
    }

    for (let index = start + 1; index < end; index += 1) {
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
  const clean = [
    '# ✍️ Versión vigente para revisión {toggle="true"}',
    '',
    '\t## Metadatos propuestos',
    '\t- Title: Cómo proteger el metal del óxido',
    '\t## Cómo preparar la superficie',
    '\tRetira el polvo y la pintura suelta antes de aplicar el recubrimiento.'
  ].join('\n')
  const leaked = `${clean}\n\tMontaje CMS: cargar el tutorial en cuatro pasos.`
  const unindented = `${clean}\nEsta línea se salió del toggle.`
  const unindentedHeading = `${clean}\n## Este encabezado se salió del toggle`
  const internalPlan = `${clean}\n# 🧭 Plan editorial y SEO {toggle="true"}`

  if (inspect(clean).length !== 0) throw new Error('El caso limpio no pasó.')
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
    'PASS client-visible-copy-gate: una versión vigente, sin marcadores internos y con jerarquía preservada.\n'
  )
} catch (error) {
  process.stderr.write(`ERROR client-visible-copy-gate: ${error.message}\n`)
  process.exit(2)
}
