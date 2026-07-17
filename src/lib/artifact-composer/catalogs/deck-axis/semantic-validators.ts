/**
 * Catálogo `deck-axis` — validadores SEMÁNTICOS versionados (TASK-1393 Slice 2).
 *
 * El motor valida FORMA (contratos de slots); estas reglas validan SENTIDO — invariantes entre
 * campos que una lámina de propuesta no puede violar aunque cada slot pase su contrato. El motor
 * las ejecuta fail-closed pero no las conoce: pricing, staffing o cobertura son semántica del deck.
 *
 * Deterministas por contrato: reciben el plan + snapshot del catálogo. NUNCA consultan DB, red ni
 * el reloj — las reglas que dependan de datos de `Proposal` (montos vs Quote, evidencia versionada)
 * se evalúan AGUAS ARRIBA con sus referencias congeladas (TASK-1392), no dentro del render.
 *
 * Versionado: subir la versión de un validador al cambiar su regla — el `ResolvedCompositionManifest`
 * registra qué versión aprobó el plan, y un replay debe poder explicar por qué era elegible.
 */

import type { CatalogSemanticValidator, CatalogSemanticViolation } from '../../catalog'

const asRecords = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => typeof item === 'object' && item !== null) : []

const normalizeAmount = (value: unknown): string => String(value ?? '').replace(/\s/g, '')

/**
 * `pricing-integrity` — exactamente UNA opción propuesta, y el monto héroe ES el de la propuesta.
 *
 * Dos planes marcados "el propuesto" fue un bug real (el tono del blueprint contagiando items); y
 * un monto héroe que no coincide con la opción propuesta es la versión pricing de una cifra sin
 * fuente: el comité lee dos números distintos para la misma oferta.
 */
const pricingIntegrity: CatalogSemanticValidator = {
  name: 'pricing-integrity',
  version: '1.0.0',
  validate: plan => {
    const violations: CatalogSemanticViolation[] = []

    for (const slide of plan.slides) {
      if (slide.template !== 'PricingFull') continue

      const options = asRecords(slide.slots.pricingOptions)
      const proposed = options.filter(option => option.isProposed === true || option.isProposed === 'true')

      if (proposed.length !== 1) {
        violations.push({
          code: 'pricing_single_proposed',
          slideId: slide.slideId,
          message: `PricingFull exige exactamente UNA opción con isProposed=true; hay ${proposed.length}.`
        })
        continue
      }

      const summary = slide.slots.summary as Record<string, unknown> | undefined
      const heroAmount = normalizeAmount(summary?.amount)
      const proposedAmount = normalizeAmount(proposed[0]!.amount)

      if (heroAmount && proposedAmount && heroAmount !== proposedAmount) {
        violations.push({
          code: 'pricing_hero_mismatch',
          slideId: slide.slideId,
          message:
            `el monto héroe (${String(summary?.amount)}) no coincide con la opción propuesta ` +
            `(${String(proposed[0]!.amount)}). Un comité leyendo dos números distintos para la misma ` +
            `oferta es la versión pricing de una cifra sin fuente.`
        })
      }
    }

    return violations
  }
}

/**
 * `team-dedication-derivable` — la dedicación de cada rol debe ser un porcentaje derivable
 * (0 < x ≤ 100). Un "50%" es un dato del que el evaluador deriva FTE; un "medio tiempo" o un "50"
 * sin unidad no es verificable y un ">100%" es imposible.
 */
const teamDedicationDerivable: CatalogSemanticValidator = {
  name: 'team-dedication-derivable',
  version: '1.0.0',
  validate: plan => {
    const violations: CatalogSemanticViolation[] = []

    for (const slide of plan.slides) {
      if (slide.template !== 'TeamSplit') continue

      for (const member of asRecords(slide.slots.members)) {
        const dedication = String(member.dedication ?? '')
        const match = dedication.match(/^(\d+(?:[.,]\d+)?)\s*%$/)
        const pct = match ? Number.parseFloat(match[1]!.replace(',', '.')) : NaN

        if (!match || !(pct > 0 && pct <= 100)) {
          violations.push({
            code: 'team_dedication_not_derivable',
            slideId: slide.slideId,
            message:
              `la dedicación "${dedication}" del rol "${String(member.role ?? '?')}" no es un ` +
              `porcentaje derivable (esperado "NN%", 0 < NN ≤ 100). El FTE del squad debe poder ` +
              `derivarse del dato, no estimarse a ojo.`
          })
        }
      }
    }

    return violations
  }
}

/**
 * `requirements-coverage` — cada requisito de la matriz de cumplimiento lleva estado Y evidencia
 * no vacíos. Una fila sin estado no es "pendiente": es una matriz que no responde lo que el
 * comité pregunta; y un estado sin evidencia es un claim sin sustento.
 */
const requirementsCoverage: CatalogSemanticValidator = {
  name: 'requirements-coverage',
  version: '1.0.0',
  validate: plan => {
    const violations: CatalogSemanticViolation[] = []

    for (const slide of plan.slides) {
      if (slide.template !== 'RequirementsTableFull') continue

      asRecords(slide.slots.requirements).forEach((requirement, index) => {
        const status = String(requirement.status ?? '').trim()
        const evidence = String(requirement.evidence ?? '').trim()

        if (!status || !evidence) {
          violations.push({
            code: 'requirement_uncovered',
            slideId: slide.slideId,
            message:
              `el requisito #${index + 1} ("${String(requirement.requirement ?? '?').slice(0, 48)}…") ` +
              `no declara ${!status ? 'estado' : 'evidencia'}. La cobertura debe ser trazable fila por fila.`
          })
        }
      })
    }

    return violations
  }
}

/**
 * `template-content-compatibility` — cada lámina usa EXACTAMENTE la plantilla que el selector del
 * catálogo deriva de su contentType. Es la misma regla que `TemplateAuthorityError` en el motor,
 * declarada además como invariante del catálogo: el manifest registra que se verificó.
 */
const templateContentCompatibility: CatalogSemanticValidator = {
  name: 'template-content-compatibility',
  version: '1.0.0',
  validate: (plan, snapshot) => {
    const violations: CatalogSemanticViolation[] = []

    for (const slide of plan.slides) {
      const expected = snapshot.registry.selector.map[slide.contentType]

      if (!expected) {
        violations.push({
          code: 'unknown_content_type',
          slideId: slide.slideId,
          message: `el contentType "${slide.contentType}" no existe en el selector del catálogo.`
        })
      } else if (expected !== slide.template) {
        violations.push({
          code: 'template_incompatible',
          slideId: slide.slideId,
          message: `contentType "${slide.contentType}" resuelve a "${expected}", no a "${slide.template}".`
        })
      }
    }

    return violations
  }
}

/**
 * `testimonials-sourced` — un testimonio es una cita de un TERCERO real: exige atribución nombrada y
 * una fuente verificable. Es la misma raíz anti-fabricación de `QuoteSplit` en modo testimonial: sin
 * persona nombrada y sin enlace de fuente, la lámina viste una frase con la autoridad de un
 * testimonio de cliente sin que el comité pueda comprobarla. La forma (2 citas, campos requeridos)
 * la cubre el contrato de slots; esto valida el SENTIDO: quién lo dijo, y dónde se puede verificar.
 */
const testimonialsSourced: CatalogSemanticValidator = {
  name: 'testimonials-sourced',
  version: '1.0.0',
  validate: plan => {
    const violations: CatalogSemanticViolation[] = []

    for (const slide of plan.slides) {
      if (slide.template !== 'TestimonialsFull') continue

      const proofLink = String(slide.slots.proofLink ?? '')

      if (!/href=["']https?:\/\/[^"']+["']/i.test(proofLink)) {
        violations.push({
          code: 'testimonial_source_missing',
          slideId: slide.slideId,
          message:
            'TestimonialsFull exige un proofLink con href absoluto: es la fuente verificable de las ' +
            'citas. Un testimonio de un tercero sin fuente comprobable no se publica en una oferta.'
        })
      }

      asRecords(slide.slots.testimonials).forEach((testimonial, index) => {
        const who = String(testimonial.who ?? '').trim()
        const quote = String(testimonial.quote ?? '').trim()

        if (!who || /^(un|una|el|la)\s+(cliente|persona|usuari|equipo)\b/i.test(who)) {
          violations.push({
            code: 'testimonial_unattributed',
            slideId: slide.slideId,
            message:
              `el testimonio #${index + 1} no está atribuido a una persona nombrada ` +
              `("${who || '—'}"); un genérico como "un cliente" es rechazo.`
          })
        }

        if (!quote) {
          violations.push({
            code: 'testimonial_empty',
            slideId: slide.slideId,
            message: `el testimonio #${index + 1} no trae cita: un testimonio vacío no prueba nada.`
          })
        }
      })
    }

    return violations
  }
}

export const deckAxisSemanticValidators: CatalogSemanticValidator[] = [
  templateContentCompatibility,
  pricingIntegrity,
  teamDedicationDerivable,
  requirementsCoverage,
  testimonialsSourced
]
