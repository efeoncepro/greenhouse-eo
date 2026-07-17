/**
 * Tender Deck Composer — validación de slots contra el contrato de la plantilla.
 *
 * Dos reglas gobiernan este módulo:
 *
 * 1. **`overflow: reject` — nunca truncar.** Si el copy no cabe, el renderer NO lo corta: rechaza la
 *    lámina. Truncar en silencio el texto de una oferta contractual es peor que fallar: el evaluador
 *    lee una frase mutilada y nadie se entera. Que lo corrija un humano (o el chapter-author en el
 *    reintento).
 *
 * 2. **Una cifra sin evidencia no pasa.** `quantifiedClaimsRequireEvidenceRef` implementa el
 *    principio anti-humo del método: los datos son reales del bid o ilustrativos marcados, NUNCA
 *    fabricados. Si un slot trae una métrica sin `evidenceRef`, el deck no se compone.
 */

import type { SlotContract, SlotValue, SlotViolation, TemplateContract, SlideSpec } from './contracts'

/**
 * Validador de lámina que aporta el CATÁLOGO para una plantilla concreta (TASK-1393 Slice 2).
 * El motor no conoce la semántica de `TimelineFull` ni de ninguna otra plantilla: el catálogo
 * declara sus reglas por template y el motor las ejecuta con el mismo fail-closed.
 */
export type SlideValidator = (slide: SlideSpec) => SlotViolation[]

export type SlideValidatorMap = Record<string, SlideValidator>

export class DeckValidationError extends Error {
  readonly violations: SlotViolation[]

  constructor(violations: SlotViolation[]) {
    const detail = violations
      .map(v => `  [${v.slideId} · ${v.template} · ${v.slot}] ${v.code}: ${v.message}`)
      .join('\n')

    super(`El deck no pasa la validación de slots (${violations.length} problema(s)):\n${detail}`)
    this.name = 'DeckValidationError'
    this.violations = violations
  }
}

/**
 * Un slot **template-owned**: existe en el contrato, pero lo llena la PLANTILLA, no el autor. Es el
 * chrome fijo del deck (logo Efeonce, burbuja de URL, set de redes, datos de contacto). Marcarlos
 * `required` y además exigírselos al plan haría que cada deck tuviera que copiar —y mantener
 * sincronizado— un valor que ya vive en el HTML. El contrato los declara para ser completo; el
 * composer sólo verifica que el ancla exista.
 */
const isTemplateOwned = (type: SlotContract['type']): boolean => type.startsWith('fixed-')

const stripTags = (value: string): string => value.replace(/<[^>]*>/g, '')

/** Cuenta caracteres visibles: el markup no ocupa espacio en la lámina. */
const visibleLength = (value: string): number => stripTags(value).length

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

interface ValidateContext {
  slideId: string
  template: string
  slot: string
}

const violation = (ctx: ValidateContext, code: SlotViolation['code'], message: string): SlotViolation => ({
  slideId: ctx.slideId,
  template: ctx.template,
  slot: ctx.slot,
  code,
  message
})

const validateStringLike = (ctx: ValidateContext, contract: SlotContract, value: SlotValue): SlotViolation[] => {
  if (typeof value !== 'string') {
    return [violation(ctx, 'wrong_type', `se esperaba un ${contract.type}, llegó ${typeof value}`)]
  }

  const max = contract.constraints?.maxCharacters

  if (max !== undefined && visibleLength(value) > max) {
    return [
      violation(
        ctx,
        'too_long',
        `${visibleLength(value)} caracteres visibles excede el máximo de ${max}. ` +
          `El renderer NO trunca (overflow=reject): reescribe el copy más corto.`
      )
    ]
  }

  return []
}

const validateEnum = (ctx: ValidateContext, contract: SlotContract, value: SlotValue): SlotViolation[] => {
  if (typeof value !== 'string') {
    return [violation(ctx, 'wrong_type', `se esperaba un enum, llegó ${typeof value}`)]
  }

  // Los contratos históricos usan tanto arrays de valores como mapas clave→label. Ambos representan
  // el mismo conjunto cerrado; el renderer sólo necesita labels cuando el enum se pinta.
  const rawValues = contract.values as unknown

  const values = Array.isArray(rawValues)
    ? rawValues
    : rawValues && typeof rawValues === 'object'
      ? Object.keys(rawValues)
      : []

  if (!values.includes(value)) {
    return [violation(ctx, 'disallowed_enum', `"${value}" no está en los valores permitidos (${values.join(', ')})`)]
  }

  return []
}

const validateItemShape = (
  ctx: ValidateContext,
  shape: NonNullable<NonNullable<SlotContract['item']>['shape']>,
  item: Record<string, unknown>,
  index: number,
  requireEvidence: boolean,
  pathLabel?: string
): SlotViolation[] => {
  const violations: SlotViolation[] = []
  const label = pathLabel ?? (index >= 0 ? `item ${index}` : 'el objeto')

  for (const [fieldName, field] of Object.entries(shape)) {
    const raw = item[fieldName]
    const present = raw !== undefined && raw !== null && raw !== ''

    if (field.required && !present) {
      violations.push(
        violation(ctx, 'missing_required_field', `${label} no trae el campo requerido "${fieldName}"`)
      )
      continue
    }

    if (!present) continue

    if (field.type === 'array') {
      if (!Array.isArray(raw)) {
        violations.push(
          violation(ctx, 'wrong_type', `${label}, campo "${fieldName}": se esperaba un array`)
        )
        continue
      }

      const { minItems, maxItems } = field.constraints ?? {}

      if (minItems !== undefined && raw.length < minItems) {
        violations.push(
          violation(ctx, 'too_few_items', `${label}, campo "${fieldName}": ${raw.length} items, el mínimo es ${minItems}`)
        )
      }

      if (maxItems !== undefined && raw.length > maxItems) {
        violations.push(
          violation(
            ctx,
            'too_many_items',
            `${label}, campo "${fieldName}": ${raw.length} items excede el máximo de ${maxItems}. El renderer NO recorta la lista.`
          )
        )
      }

      if (field.item?.shape) {
        raw.forEach((nestedItem, nestedIndex) => {
          if (!isPlainObject(nestedItem)) {
            violations.push(
              violation(ctx, 'wrong_type', `${label}, campo "${fieldName}"[${nestedIndex}]: se esperaba un objeto`)
            )

            return
          }

          violations.push(
            ...validateItemShape(
              ctx,
              field.item!.shape!,
              nestedItem,
              nestedIndex,
              requireEvidence,
              `${label}, campo "${fieldName}"[${nestedIndex}]`
            )
          )
        })
      }

      continue
    }

    if (field.type === 'object') {
      if (!isPlainObject(raw)) {
        violations.push(
          violation(ctx, 'wrong_type', `${label}, campo "${fieldName}": se esperaba un objeto`)
        )
        continue
      }

      if (field.shape) {
        violations.push(
          ...validateItemShape(ctx, field.shape, raw, index, requireEvidence, `${label}, campo "${fieldName}"`)
        )
      }

      continue
    }

    if (field.maxCharacters !== undefined && typeof raw === 'string' && visibleLength(raw) > field.maxCharacters) {
      violations.push(
        violation(
          ctx,
          'item_too_long',
          `${label}, campo "${fieldName}": ${visibleLength(raw)} caracteres excede ${field.maxCharacters} (overflow=reject)`
        )
      )
    }

    if (field.values && typeof raw === 'string' && !field.values.includes(raw)) {
      violations.push(
        violation(
          ctx,
          'disallowed_enum',
          `${label}, campo "${fieldName}": "${raw}" no está en los valores permitidos (${field.values.join(', ')})`
        )
      )
    }

    // Anti-fabricación: un campo puede exigir que otro venga con él (ej. `metric` exige `evidenceRef`).
    for (const dependency of field.requires ?? []) {
      const companion = item[dependency]

      if (companion === undefined || companion === null || companion === '') {
        violations.push(
          violation(
            ctx,
            'missing_evidence_ref',
            `${label}: el campo "${fieldName}" trae un dato ("${String(raw)}") pero falta "${dependency}". ` +
              `Una cifra sin su fuente no entra a una oferta: dato real del bid, o ilustrativo marcado.`
          )
        )
      }
    }
  }

  if (requireEvidence) {
    const hasMetric = typeof item.metric === 'string' && item.metric.trim() !== ''
    const hasEvidence = typeof item.evidenceRef === 'string' && item.evidenceRef.trim() !== ''

    if (hasMetric && !hasEvidence) {
      violations.push(
        violation(
          ctx,
          'missing_evidence_ref',
          `${label}: métrica "${String(item.metric)}" sin evidenceRef. Cifra sin fuente = no se compone.`
        )
      )
    }
  }

  return violations
}

const validateObject = (ctx: ValidateContext, contract: SlotContract, value: SlotValue): SlotViolation[] => {
  if (!isPlainObject(value)) {
    return [violation(ctx, 'wrong_type', `se esperaba un objeto, llegó ${typeof value}`)]
  }

  const violations: SlotViolation[] = []

  if (contract.shape) {
    violations.push(
      ...validateItemShape(
        ctx,
        contract.shape,
        value,
        -1,
        contract.constraints?.quantifiedClaimsRequireEvidenceRef === true
      )
    )
  }

  return violations
}

const validateArray = (ctx: ValidateContext, contract: SlotContract, value: SlotValue): SlotViolation[] => {
  if (!Array.isArray(value)) {
    return [violation(ctx, 'wrong_type', `se esperaba un array, llegó ${typeof value}`)]
  }

  const violations: SlotViolation[] = []
  const { minItems, maxItems, maxCharactersPerItem, quantifiedClaimsRequireEvidenceRef } = contract.constraints ?? {}

  if (minItems !== undefined && value.length < minItems) {
    violations.push(violation(ctx, 'too_few_items', `${value.length} items, el mínimo es ${minItems}`))
  }

  if (maxItems !== undefined && value.length > maxItems) {
    violations.push(
      violation(
        ctx,
        'too_many_items',
        `${value.length} items excede el máximo de ${maxItems}. El renderer NO recorta la lista: quita items o divide la lámina.`
      )
    )
  }

  value.forEach((item, index) => {
    if (typeof item === 'string') {
      if (maxCharactersPerItem !== undefined && visibleLength(item) > maxCharactersPerItem) {
        violations.push(
          violation(
            ctx,
            'item_too_long',
            `item ${index}: ${visibleLength(item)} caracteres excede ${maxCharactersPerItem} (overflow=reject)`
          )
        )
      }

      return
    }

    if (isPlainObject(item) && contract.item?.shape) {
      violations.push(
        ...validateItemShape(ctx, contract.item.shape, item, index, quantifiedClaimsRequireEvidenceRef === true)
      )
    }
  })

  return violations
}

/** Valida los slots de UNA lámina contra el contrato de su plantilla. Función pura. */
export const validateSlide = (
  slide: SlideSpec,
  contract: TemplateContract,
  slideValidators?: SlideValidatorMap
): SlotViolation[] => {
  const violations: SlotViolation[] = []

  for (const slotName of Object.keys(slide.slots)) {
    if (!contract.slots[slotName]) {
      violations.push({
        slideId: slide.slideId,
        template: slide.template,
        slot: slotName,
        code: 'unknown_slot',
        message:
          `la plantilla "${slide.template}" no declara el slot "${slotName}". ` +
          `El renderer sólo llena slots declarados: no agrega copy ni composición libre.`
      })
    }
  }

  for (const [slotName, contractSlot] of Object.entries(contract.slots)) {
    const ctx: ValidateContext = { slideId: slide.slideId, template: slide.template, slot: slotName }
    const value = slide.slots[slotName]
    const present = value !== undefined && value !== null && value !== ''

    if (!present) {
      // Los slots `fixed-*` son **chrome que la plantilla posee** (logo Efeonce, burbuja de URL, set
      // de redes, datos de contacto): el contrato los marca `agentMayOverride: false` justamente
      // porque NO son del autor. Exigírselos al plan obligaría a copiar en cada deck un valor que ya
      // vive en la plantilla — y a mantenerlo sincronizado en N planes. Se declaran para que el
      // contrato sea completo, no para que alguien los escriba.
      if (contractSlot.required && !isTemplateOwned(contractSlot.type)) {
        violations.push(violation(ctx, 'missing_required', `el slot "${slotName}" es requerido y no vino`))
      }

      continue
    }

    switch (contractSlot.type) {
      case 'string':
      case 'rich-string':
        violations.push(...validateStringLike(ctx, contractSlot, value))
        break

      case 'array':
      case 'paired-array':
        violations.push(...validateArray(ctx, contractSlot, value))
        break

      case 'enum':
        violations.push(...validateEnum(ctx, contractSlot, value))
        break

      case 'object':
        violations.push(...validateObject(ctx, contractSlot, value))
        break

      default:
        // asset / asset-ref / fixed-asset: la forma la valida el resolver de assets.
        break
    }
  }

  // Reglas por-plantilla del CATÁLOGO (ej. el schedule de TimelineFull en deck-axis). El motor las
  // ejecuta pero no las conoce: semántica de plantilla = dato del catálogo, no código del motor.
  const catalogValidator = slideValidators?.[slide.template]

  if (catalogValidator) {
    violations.push(...catalogValidator(slide))
  }

  return violations
}

/** Valida el deck completo. Si devuelve algo, NO se compone: se reporta y lo arregla un humano. */
export const validateDeck = (
  slides: SlideSpec[],
  contracts: Map<string, TemplateContract>,
  slideValidators?: SlideValidatorMap
): SlotViolation[] => {
  const violations: SlotViolation[] = []

  for (const slide of slides) {
    const contract = contracts.get(slide.template)

    if (!contract) {
      violations.push({
        slideId: slide.slideId,
        template: slide.template,
        slot: '(plantilla)',
        code: 'unknown_slot',
        message: `no existe contrato de slots para la plantilla "${slide.template}"`
      })

      continue
    }

    violations.push(...validateSlide(slide, contract, slideValidators))
  }

  return violations
}
