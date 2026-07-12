/**
 * Tender Deck Composer — selector de plantilla.
 *
 * ⚠️ ESTE MÓDULO NO PUEDE LLAMAR A UN LLM. Es un lookup determinista sobre `registry.json`
 * (1 content-type → 1 plantilla). Meter un modelo acá convertiría una función pura en una fuente de
 * no-determinismo, y rompería la promesa de auditoría del deck ("mismos slots → mismo PDF").
 * ADR: GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md §5-ter.
 *
 * El juicio (qué capítulos, qué contar) vive AGUAS ARRIBA, en el orquestador y los chapter-authors.
 * Cuando ellos ya decidieron "esto es un cronograma", elegir `TimelineFull` no es una decisión: es
 * una tabla.
 */

import type { ContentType, TemplateName } from './contracts'

export interface DeckRegistry {
  version: string
  canvas: { width: number; height: number }
  contentTypeTaxonomy: string[]
  templates: RegistryTemplate[]
  selector: {
    map: Record<ContentType, TemplateName>
    disambiguation?: Record<string, string>
    rules?: string[]
  }
}

export interface RegistryTemplate {
  name: TemplateName
  kind: string
  contentTypes: ContentType[]
  prototype: string
  slotsRef?: string
  status?: string
}

export class UnknownContentTypeError extends Error {
  readonly contentType: string

  constructor(contentType: string, known: string[]) {
    // El mensaje es la regla, no un lamento: un content-type que no calza NO se improvisa.
    super(
      `El content-type "${contentType}" no existe en la taxonomía del deck. ` +
        `NO se improvisa un layout: esto significa que falta una plantilla en el catálogo (abrir gap). ` +
        `Content-types válidos: ${known.join(', ')}`
    )
    this.name = 'UnknownContentTypeError'
    this.contentType = contentType
  }
}

/**
 * Resuelve la plantilla para un tipo de contenido.
 *
 * Lanza si no calza — deliberadamente. El fallback silencioso a "alguna plantilla parecida" es
 * justo el comportamiento que produce un deck incoherente.
 */
export const selectTemplate = (registry: DeckRegistry, contentType: ContentType): TemplateName => {
  const template = registry.selector.map[contentType]

  if (!template) {
    throw new UnknownContentTypeError(contentType, Object.keys(registry.selector.map))
  }

  return template
}

export const findTemplate = (registry: DeckRegistry, name: TemplateName): RegistryTemplate | undefined =>
  registry.templates.find(template => template.name === name)

/**
 * Verifica el cierre referencial del registry: cada content-type mapea a una plantilla que existe, y
 * cada plantilla declara los content-types que el mapa le asigna.
 *
 * Es un guard de integridad del SoT, no un test: si el registry se corrompe (una plantilla renombrada,
 * un content-type huérfano), el composer debe negarse a componer en vez de producir un deck con huecos.
 */
export const auditRegistry = (registry: DeckRegistry): string[] => {
  const problems: string[] = []
  const byName = new Map(registry.templates.map(template => [template.name, template]))
  const taxonomy = new Set(registry.contentTypeTaxonomy)

  for (const [contentType, templateName] of Object.entries(registry.selector.map)) {
    if (!byName.has(templateName)) {
      problems.push(`selector.map["${contentType}"] apunta a la plantilla inexistente "${templateName}"`)
      continue
    }

    if (!taxonomy.has(contentType)) {
      problems.push(`selector.map["${contentType}"] no está en contentTypeTaxonomy`)
    }

    const template = byName.get(templateName)!

    if (!template.contentTypes.includes(contentType)) {
      problems.push(
        `la plantilla "${templateName}" no declara el content-type "${contentType}" que el selector le asigna`
      )
    }
  }

  for (const contentType of taxonomy) {
    if (!registry.selector.map[contentType]) {
      problems.push(`el content-type "${contentType}" está en la taxonomía pero no tiene plantilla en selector.map`)
    }
  }

  return problems
}
