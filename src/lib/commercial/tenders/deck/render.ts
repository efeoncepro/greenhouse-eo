/**
 * Tender Deck Composer — llenado de slots + render.
 *
 * El llenado ocurre en el DOM REAL de Chromium (no con regex sobre el HTML, no con un parser
 * aparte): los slots se anclan por selector CSS, así que el navegador que renderiza es el mismo que
 * resuelve el contrato. Cero divergencia entre "lo que el filler creyó" y "lo que se pintó".
 *
 * Determinismo (la promesa de auditoría del ADR: mismos slots → mismo PDF):
 * - sin reloj ni azar en el contenido: el filler sólo escribe lo que viene en los slots;
 * - `reducedMotion` + espera de `document.fonts.ready`: el frame se captura estable, con la
 *   tipografía ya aplicada (no con el fallback de sistema, que sería un deck fuera de marca).
 *
 * ⚠️ DEUDA de determinismo: las plantillas todavía piden Poppins/Geist a Google Fonts por red, así
 * que el render NO es hermético (sin red, la tipografía cae al fallback). No se puede bloquear la
 * red hasta EMBEBER las fuentes en las plantillas — es el pendiente declarado en
 * GREENHOUSE_TENDER_DECK_COMPOSER_V1.md ("embeber fuentes para runtime self-contained"). Cuando
 * estén embebidas, bloquear `http(s)://**` acá y el render pasa a ser hermético.
 */

import path from 'node:path'

import type { Browser, Page } from 'playwright'

import type { SlideSpec, SlotContract, SlotValue, TemplateContract } from './contracts'
import { resolveFieldDirective, type FieldDirective } from './resolvers'

export interface RenderTarget {
  /** PNG por lámina (revisión visual) o PDF (el entregable). */
  kind: 'png' | 'pdf'
  outPath: string
}

/**
 * Payload que cruza al browser. Debe ser serializable (structured-clone): nada de funciones ni
 * clases — por eso el contrato se aplana a lo mínimo que el filler necesita.
 */
interface FillInstruction {
  selector: string
  type: string
  value: unknown
  /**
   * Qué hacer con cada campo de los items (sólo para arrays de objetos). Se calcula ACÁ, en Node,
   * porque los resolvers son lógica de dominio: el browser sólo ejecuta el resultado.
   */
  fieldPlan?: Record<string, FieldDirective>
}

const buildFieldPlan = (slotContract: SlotContract, value: SlotValue): Record<string, FieldDirective> | undefined => {
  const shape = slotContract.item?.shape

  if (!shape || !Array.isArray(value)) return undefined

  const plan: Record<string, FieldDirective> = {}

  // Un `kind` distinto por item podría resolver a íconos distintos; por eso el plan se calcula con
  // el valor de CADA item, no una vez para toda la lista. Se indexa por `<índice>.<campo>`.
  value.forEach((item, index) => {
    if (typeof item !== 'object' || item === null) return

    for (const [fieldName, field] of Object.entries(shape)) {
      const fieldValue = (item as Record<string, unknown>)[fieldName]

      if (fieldValue === undefined || fieldValue === null || fieldValue === '') continue

      plan[`${index}.${fieldName}`] = resolveFieldDirective(field, fieldValue)
    }
  })

  return plan
}

const buildInstructions = (slide: SlideSpec, contract: TemplateContract): FillInstruction[] => {
  const instructions: FillInstruction[] = []

  for (const [slotName, slotContract] of Object.entries(contract.slots)) {
    const value = slide.slots[slotName]

    if (value === undefined || value === null) continue

    instructions.push({
      selector: slotContract.selector,
      type: slotContract.type,
      value,
      fieldPlan: buildFieldPlan(slotContract, value)
    })
  }

  return instructions
}

/**
 * Aplica los slots al DOM. Corre DENTRO del browser (`page.evaluate`), por eso es una función
 * autocontenida sin imports.
 *
 * Reglas de escritura:
 * - `string` → `textContent` (nunca HTML: un string plano no puede inyectar markup).
 * - `rich-string` → `innerHTML`, pero **sólo** con los tags que el contrato permite (`<em>`,
 *   `<strong>`). El resto se escapa. El copy de una oferta no abre un vector de inyección.
 * - `array` → clona el primer hijo como plantilla de item y repite. Así el markup del item vive en
 *   el HTML (el diseñador lo controla), no hardcodeado en TS.
 * - `asset` → escribe `src` en el `[data-slot-field="src"]`.
 */
const fillDom = (instructions: FillInstruction[]): string[] => {
  const problems: string[] = []

  const ALLOWED_TAGS = ['EM', 'STRONG', 'BR', 'SPAN']

  const sanitize = (html: string): string => {
    const container = document.createElement('div')

    container.innerHTML = html

    const walk = (node: Element) => {
      for (const child of Array.from(node.children)) {
        if (!ALLOWED_TAGS.includes(child.tagName)) {
          child.replaceWith(...Array.from(child.childNodes))
          continue
        }

        for (const attr of Array.from(child.attributes)) {
          // Un tag permitido no trae atributos: nada de `onclick`, `style`, `href`.
          child.removeAttribute(attr.name)
        }

        walk(child)
      }
    }

    walk(container)

    return container.innerHTML
  }

  for (const instruction of instructions) {
    const el = document.querySelector(instruction.selector)

    if (!el) {
      problems.push(`selector sin match en el DOM: ${instruction.selector}`)
      continue
    }

    const { type, value } = instruction

    if (type === 'string') {
      el.textContent = String(value)
      continue
    }

    if (type === 'rich-string') {
      el.innerHTML = sanitize(String(value))
      continue
    }

    if (type === 'asset' || type === 'asset-ref' || type === 'fixed-asset') {
      const src =
        typeof value === 'string' ? value : value && typeof value === 'object' ? (value as any).src : undefined

      if (!src) {
        problems.push(`asset sin src: ${instruction.selector}`)
        continue
      }

      const target = (el.querySelector('[data-slot-field="src"]') as HTMLImageElement | null) ?? (el as HTMLImageElement)

      target.setAttribute('src', String(src))
      continue
    }

    if (type === 'object') {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        problems.push(`${instruction.selector}: se esperaba un objeto`)
        continue
      }

      for (const [fieldName, fieldValue] of Object.entries(value as Record<string, unknown>)) {
        if (fieldValue === undefined || fieldValue === null || fieldValue === '') continue

        const field = el.querySelector(`[data-slot-field="${fieldName}"]`)

        if (!field) {
          problems.push(
            `${instruction.selector}: el campo "${fieldName}" no tiene [data-slot-field="${fieldName}"] ` +
              `en el HTML. Sin ancla, quedaría el valor de ejemplo del prototipo (un KPI falso en la lámina).`
          )

          continue
        }

        field.innerHTML = sanitize(String(fieldValue))
      }

      continue
    }

    if (type === 'array' || type === 'paired-array') {
      const items = Array.isArray(value) ? value : []

      // El slot y el CONTENEDOR DE REPETICIÓN pueden no ser el mismo nodo: una tabla tiene un
      // encabezado fijo (`.matrix-head`) y sólo las filas se repiten. Sin esta distinción, el filler
      // clonaría el encabezado como si fuera un item. `[data-slot-items]` marca dónde van los items;
      // si no está, se repite sobre el propio slot (el caso simple: una lista).
      const host = (el.querySelector('[data-slot-items]') as Element | null) ?? el
      const itemTemplate = host.firstElementChild

      if (!itemTemplate) {
        problems.push(`el slot array "${instruction.selector}" no tiene un item-template en el HTML`)
        continue
      }

      // El markup del item lo define el HTML (lo controla el diseñador). Acá sólo se clona y se llena.
      const blueprint = itemTemplate.cloneNode(true) as Element

      host.innerHTML = ''

      for (const item of items) {
        const node = blueprint.cloneNode(true) as Element

        if (typeof item === 'string') {
          const field = node.querySelector('[data-slot-field]') ?? node

          field.innerHTML = sanitize(item)
        } else if (item && typeof item === 'object') {
          const index = items.indexOf(item)

          for (const [fieldName, fieldValue] of Object.entries(item as Record<string, unknown>)) {
            if (fieldValue === undefined || fieldValue === null || fieldValue === '') continue

            const directive = instruction.fieldPlan?.[`${index}.${fieldName}`] ?? { mode: 'text' }

            // `validation-only` (ej. evidenceRef): se exige, pero NUNCA se pinta. Es munición
            // interna — la fuente de una cifra no es copy para el comité.
            if (directive.mode === 'skip') continue

            if (directive.mode === 'apply') {
              for (const effect of directive.effects) {
                const target = effect.selector === ':self' ? node : node.querySelector(effect.selector)

                if (!target) {
                  problems.push(
                    `${instruction.selector} item ${index}: el resolver de "${fieldName}" apunta a ` +
                      `"${effect.selector}", que no existe en el item del HTML.`
                  )

                  continue
                }

                if (effect.attr && effect.value !== undefined) {
                  target.setAttribute(effect.attr, effect.value)
                }

                // El tono es excluyente. Se limpia el grupo SIEMPRE (aunque no venga un tono nuevo):
                // el blueprint puede traer la clase del item destacado, y sin esta limpieza TODOS los
                // items salen marcados como "el propuesto" — que en la lámina económica es una
                // afirmación falsa sobre cuál plan se está ofreciendo.
                for (const other of effect.toneGroup ?? []) {
                  target.classList.remove(other)
                }

                if (effect.toneClass) {
                  target.classList.add(effect.toneClass)
                }
              }

              continue
            }

            const field = node.querySelector(`[data-slot-field="${fieldName}"]`)

            if (!field) {
              // ⚠️ Fallo RUIDOSO a propósito. Si el campo no tiene ancla en el HTML, el item se
              // renderizaría con el COPY DE EJEMPLO del blueprint — un deck que sale al cliente con
              // el relleno del prototipo y nadie se entera. Es el peor fallo posible acá.
              problems.push(
                `${instruction.selector} item ${index}: el campo "${fieldName}" no tiene ` +
                  `[data-slot-field="${fieldName}"] en el HTML de la plantilla. ` +
                  `Sin ancla, quedaría el contenido de ejemplo del prototipo.`
              )

              continue
            }

            // Un campo puede CONTENER a otro (`<p field="label">Base <span field="status">…</span></p>`).
            // Escribirlo con innerHTML borraría al hijo anotado y el status desaparecería. Cuando eso
            // pasa, sólo se reemplazan los nodos de TEXTO propios y los hijos anotados quedan intactos.
            const nested = field.querySelector('[data-slot-field]')

            if (nested) {
              for (const child of Array.from(field.childNodes)) {
                if (child.nodeType === Node.TEXT_NODE) child.remove()
              }

              field.insertBefore(document.createTextNode(String(fieldValue) + ' '), field.firstChild)
              continue
            }

            field.innerHTML = sanitize(String(fieldValue))
          }

          // Un campo opcional que no vino se ELIMINA del DOM (no se deja el placeholder del blueprint).
          for (const field of Array.from(node.querySelectorAll('[data-slot-field]'))) {
            const name = field.getAttribute('data-slot-field')!
            const provided = (item as Record<string, unknown>)[name]

            if (provided === undefined || provided === null || provided === '') {
              field.remove()
            }
          }
        }

        host.appendChild(node)
      }

      continue
    }

    // ⚠️ Guard de raíz. Un tipo de slot que este filler no sabe llenar NO puede pasar de largo: la
    // lámina saldría con el contenido de ejemplo del prototipo y el deck llegaría al cliente con
    // datos falsos, en silencio. Es el peor fallo del composer, y ya ocurrió dos veces durante F1
    // (arrays sin ancla, y `object` no implementado → un KPI "3/3" cuando el dato era "4/4").
    problems.push(
      `${instruction.selector}: el tipo de slot "${type}" no está implementado en el filler. ` +
        `No se compone: la lámina quedaría con el contenido de ejemplo de la plantilla.`
    )
  }

  return problems
}

export class SlotFillError extends Error {
  constructor(slideId: string, problems: string[]) {
    super(`No se pudo llenar la lámina "${slideId}":\n  - ${problems.join('\n  - ')}`)
    this.name = 'SlotFillError'
  }
}

/**
 * Llena una lámina y devuelve el HTML resultante (útil para snapshot/debug), dejando la página
 * lista para capturar.
 */
export const fillSlide = async (
  page: Page,
  templateHtmlPath: string,
  slide: SlideSpec,
  contract: TemplateContract
): Promise<void> => {
  // esbuild/tsx compila las funciones con `keepNames`, que las envuelve en un helper `__name`.
  // Ese helper existe en el bundle de Node, NO dentro del browser — y `page.evaluate` serializa la
  // función ya transformada. Sin este shim, cualquier filler revienta con "__name is not defined".
  await page.addInitScript(() => {
    ;(globalThis as unknown as { __name: <T>(fn: T) => T }).__name = fn => fn
  })

  // `file://` + assets relativos: el HTML resuelve sus propios SVG/PNG desde el dir de la plantilla.
  await page.goto(`file://${path.resolve(templateHtmlPath)}`, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)

  const problems = await page.evaluate(fillDom, buildInstructions(slide, contract))

  if (problems.length > 0) {
    throw new SlotFillError(slide.slideId, problems)
  }

  // Las fuentes pueden re-layoutear tras escribir el copy: esperar de nuevo evita capturar un frame
  // con el fallback de sistema (un deck con la tipografía equivocada es un deck fuera de marca).
  await page.evaluate(() => document.fonts.ready)
}

export const renderSlide = async (
  browser: Browser,
  templateHtmlPath: string,
  slide: SlideSpec,
  contract: TemplateContract,
  target: RenderTarget
): Promise<void> => {
  const page = await browser.newPage({
    viewport: contract.viewport,
    deviceScaleFactor: 1,
    reducedMotion: 'reduce'
  })

  try {
    await fillSlide(page, templateHtmlPath, slide, contract)

    if (target.kind === 'png') {
      await page.screenshot({ path: target.outPath })
    } else {
      await page.pdf({
        path: target.outPath,
        width: `${contract.viewport.width}px`,
        height: `${contract.viewport.height}px`,
        printBackground: true,
        pageRanges: '1'
      })
    }
  } finally {
    await page.close()
  }
}
