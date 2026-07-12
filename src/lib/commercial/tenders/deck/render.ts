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

import fs from 'node:fs/promises'
import path from 'node:path'

import { PDFDocument } from 'pdf-lib'
import type { Browser, Page } from 'playwright'

import type { SlideSpec, SlotContract, SlotValue, TemplateContract } from './contracts'
import { resolveFieldDirective, type FieldDirective } from './resolvers'
import { layoutTimelineSchedule, parseTimelineSchedule } from './timeline'

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
  /** Etiquetas del `enum` (clave → copy visible). Ver `SlotContract.values`. */
  enumLabels?: Record<string, string>
  /** Campos de un slot `object` que son evidencia (`validation-only`): se validan, NUNCA se pintan. */
  skipFields?: string[]
}

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const buildFieldPlan = (
  slotContract: SlotContract,
  value: SlotValue,
  slots: Record<string, unknown>
): Record<string, FieldDirective> | undefined => {
  // Un slot `object` tiene EL MISMO contrato de campo que un item de array: puede declarar evidencia
  // (`validation-only`) y campos DERIVADOS por resolver (la escala de una barra before/after). Que el
  // filler sólo honrara eso en los arrays dejaba a los objetos como ciudadanos de segunda — y era el
  // bug que impedía componer CaseStudySplit: buscaba un ancla de texto para `barScale`, que es
  // geometría, no copy.
  const objectShape = (slotContract as unknown as { shape?: Record<string, never> }).shape

  if (slotContract.type === 'object' && objectShape && isPlainRecord(value)) {
    const plan: Record<string, FieldDirective> = {}
    const record = value as unknown as Record<string, unknown>

    for (const [fieldName, field] of Object.entries(objectShape)) {
      const fieldValue = record[fieldName]
      const derived = Boolean((field as { resolver?: string }).resolver)

      if (!derived && (fieldValue === undefined || fieldValue === null || fieldValue === '')) continue

      plan[fieldName] = resolveFieldDirective(field, fieldValue, {
        item: record,
        index: 0,
        itemCount: 1,
        slots
      })
    }

    return Object.keys(plan).length > 0 ? plan : undefined
  }

  const shape = slotContract.item?.shape

  if (!shape || !Array.isArray(value)) return undefined

  const plan: Record<string, FieldDirective> = {}

  // Un `kind` distinto por item resuelve a un ícono distinto, y la geometría de una barra depende
  // del item Y del resto de la serie. Por eso el plan se calcula por item, con contexto completo.
  value.forEach((item, index) => {
    if (typeof item !== 'object' || item === null) return

    const ctx = {
      item: item as Record<string, unknown>,
      index,
      itemCount: value.length,
      slots
    }

    for (const [fieldName, field] of Object.entries(shape)) {
      const fieldValue = (item as Record<string, unknown>)[fieldName]

      // Un resolver DERIVADO (ordinal, geometría) corre aunque el campo no venga: el número de fase
      // sale del índice, no de un dato que el autor tenga que escribir.
      const derived = Boolean(field.resolver)

      if (!derived && (fieldValue === undefined || fieldValue === null || fieldValue === '')) continue

      plan[`${index}.${fieldName}`] = resolveFieldDirective(field, fieldValue, ctx)
    }
  })

  return plan
}

/**
 * Los campos de un slot `object` marcados `validation-only` (el `evidenceRef` de un KPI). Se exigen
 * al autor —una cifra sin fuente no se compone— pero **no se pintan**: la fuente no es copy para el
 * comité, y buscarle un ancla en el HTML rompía la lámina.
 */
const validationOnlyFields = (slot: SlotContract): string[] | undefined => {
  const shape = (slot as unknown as { shape?: Record<string, { consumer?: string }> }).shape

  if (!shape) return undefined

  const skip = Object.entries(shape)
    .filter(([, field]) => field.consumer === 'validation-only')
    .map(([name]) => name)

  return skip.length > 0 ? skip : undefined
}

const buildInstructions = (slide: SlideSpec, contract: TemplateContract): FillInstruction[] => {
  const instructions: FillInstruction[] = []

  for (const [slotName, slotContract] of Object.entries(contract.slots)) {
    const value = slide.slots[slotName]

    if (value === undefined || value === null) continue

    // Evidencia: se valida, NUNCA se pinta. Sin esto, el `sourceRef` de QuoteSplit se escribía sobre
    // el nodo `[data-slot='mode']` —que es la lámina entera— y la borraba.
    if (slotContract.consumer === 'validation-only') continue

    // Chrome **template-owned** (`fixed-asset`, `fixed-social-set`, `fixed-contact-set`): el logo, la
    // burbuja de URL, el set de redes, el ícono de una lista. Lo posee la PLANTILLA y ya vive en su
    // HTML: el composer no lo escribe ni se lo pide al plan. La regla vale para los TRES o no vale
    // para ninguno — `DualListSplit.tipIcon` ni siquiera declara un selector, justamente porque nunca
    // fue del autor.
    if (slotContract.type.startsWith('fixed-')) continue

    instructions.push({
      selector: slotContract.selector,
      type: slotContract.type,
      value,
      fieldPlan: buildFieldPlan(slotContract, value, slide.slots as Record<string, unknown>),
      enumLabels: slotContract.values,
      skipFields: validationOnlyFields(slotContract)
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

    if (type === 'enum') {
      // El plan declara la CLAVE; la lámina muestra la ETIQUETA del contrato. Una clave fuera del
      // conjunto ABORTA: si cayera a texto crudo, la portada de una oferta diría "combined".
      const labels = instruction.enumLabels

      if (!labels) {
        problems.push(`${instruction.selector}: slot enum sin "values" en el contrato`)
        continue
      }

      const label = labels[String(value)]

      if (label === undefined) {
        problems.push(
          `${instruction.selector}: "${String(value)}" no es un valor válido del enum (${Object.keys(labels).join(', ')})`
        )
        continue
      }

      el.textContent = label
      continue
    }

    if (type === 'rich-string') {
      el.innerHTML = sanitize(String(value))
      continue
    }

    if (type === 'asset' || type === 'asset-ref') {
      const src =
        typeof value === 'string' ? value : value && typeof value === 'object' ? (value as any).src : undefined

      if (!src) {
        problems.push(`asset sin src: ${instruction.selector}`)
        continue
      }

      const target =
        (el.querySelector('[data-slot-field="src"]') as HTMLImageElement | null) ?? (el as HTMLImageElement)

      target.setAttribute('src', String(src))
      continue
    }

    if (type === 'object') {
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        problems.push(`${instruction.selector}: se esperaba un objeto`)
        continue
      }

      // Se recorre el PLAN además del objeto: un campo DERIVADO (la escala de la barra before/after)
      // no tiene valor propio —se calcula—, así que iterar sólo el objeto lo dejaría fuera. Es la
      // misma regla que ya regía en los arrays: **objeto y array honran el mismo contrato de campo**.
      const record = value as Record<string, unknown>
      const fieldNames = new Set([...Object.keys(record), ...Object.keys(instruction.fieldPlan ?? {})])

      for (const fieldName of fieldNames) {
        const fieldValue = record[fieldName]
        const directive = instruction.fieldPlan?.[fieldName] ?? { mode: 'text' as const }

        // Evidencia dentro de un objeto (el `evidenceRef` de un KPI): se exige, pero NUNCA se pinta.
        // La fuente de una cifra no tiene por qué existir en el HTML — no es copy para el comité.
        if (directive.mode === 'skip') continue

        if (directive.mode === 'text' && (fieldValue === undefined || fieldValue === null || fieldValue === '')) {
          continue
        }

        if (directive.mode === 'apply') {
          for (const effect of directive.effects) {
            const target = effect.selector === ':self' ? el : el.querySelector(effect.selector)

            if (!target) {
              problems.push(
                `${instruction.selector}: el resolver de "${fieldName}" apunta a "${effect.selector}", que no existe en el HTML.`
              )

              continue
            }

            if (effect.attr) target.setAttribute(effect.attr, String(effect.value))
            if (effect.styleProp) (target as HTMLElement).style.setProperty(effect.styleProp, String(effect.styleValue))
            if (effect.toneGroup) for (const cls of effect.toneGroup) target.classList.remove(cls)
            if (effect.toneClass) target.classList.add(effect.toneClass)
            if (effect.asText) target.textContent = String(effect.value)
          }

          continue
        }

        const field = el.querySelector(`[data-slot-field="${fieldName}"]`)

        if (!field) {
          problems.push(
            `${instruction.selector}: el campo "${fieldName}" no tiene [data-slot-field="${fieldName}"] ` +
              `en el HTML. Sin ancla, quedaría el valor de ejemplo del prototipo (un KPI falso en la lámina).`
          )

          continue
        }

        // Un campo con valor ARRAY dentro de un objeto (los `paragraphs` de una columna) es una LISTA
        // REPETIDA, no un texto: su ancla es el CONTENEDOR y su primer hijo es el blueprint del item.
        // Pasarlo por `String(array)` —lo que hacía antes— aplanaba los `<p>` del diseñador en un
        // solo bloque y dejaba las comas del join a la vista. Es la misma semántica de un slot array:
        // el markup del item vive en el HTML.
        if (Array.isArray(fieldValue)) {
          const blueprint = field.firstElementChild

          if (!blueprint) {
            problems.push(
              `${instruction.selector}: el campo "${fieldName}" es una lista, pero su ancla no tiene un item-template en el HTML.`
            )

            continue
          }

          const itemTemplate = blueprint.cloneNode(true) as Element

          field.innerHTML = ''

          for (const entry of fieldValue) {
            const node = itemTemplate.cloneNode(true) as Element

            node.innerHTML = sanitize(String(entry))
            field.appendChild(node)
          }

          continue
        }

        field.innerHTML = sanitize(String(fieldValue))
      }

      continue
    }

    if (type === 'paired-array') {
      // Una comparación son DOS columnas con markup DISTINTO (a la izquierda el ícono del contraste,
      // a la derecha el check de la propuesta). Por eso no alcanza con un array: hacen falta DOS
      // blueprints, y cada item aporta su lado. Los hosts se declaran en el HTML con
      // `[data-slot-items="left"|"right"]` — así el diseñador controla el markup de cada lado y el
      // filler sólo empareja.
      const items = Array.isArray(value) ? value : []
      const root = el.closest('[data-template]') ?? document

      const leftHost = (root.querySelector('[data-slot-items="left"]') as Element | null) ?? el
      const rightHost = root.querySelector('[data-slot-items="right"]') as Element | null

      if (!rightHost) {
        problems.push(
          `el slot paired-array "${instruction.selector}" no declara su columna derecha: falta [data-slot-items="right"] en el HTML`
        )
        continue
      }

      const sides: { host: Element; key: 'left' | 'right' }[] = [
        { host: leftHost, key: 'left' },
        { host: rightHost, key: 'right' }
      ]

      let broken = false

      for (const { host, key } of sides) {
        const itemTemplate = host.firstElementChild

        if (!itemTemplate) {
          problems.push(`el slot paired-array "${instruction.selector}" no tiene item-template en la columna ${key}`)
          broken = true
          continue
        }

        const blueprint = itemTemplate.cloneNode(true) as Element

        host.innerHTML = ''

        for (const item of items) {
          const side = (item as Record<string, unknown>)?.[key]

          if (!side || typeof side !== 'object') {
            problems.push(`el item del paired-array "${instruction.selector}" no trae su lado "${key}"`)
            broken = true
            continue
          }

          const node = blueprint.cloneNode(true) as Element

          for (const [fieldName, fieldValue] of Object.entries(side as Record<string, unknown>)) {
            const field = node.querySelector(`[data-slot-field="${fieldName}"]`)

            if (!field) {
              problems.push(
                `[${instruction.selector}] columna ${key}: el campo "${fieldName}" no tiene [data-slot-field="${fieldName}"] en el HTML. Sin ancla, quedaría el contenido de ejemplo del prototipo.`
              )
              broken = true
              continue
            }

            field.innerHTML = sanitize(String(fieldValue))
          }

          host.appendChild(node)
        }
      }

      if (broken) continue

      continue
    }

    if (type === 'array') {
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
          const record = item as Record<string, unknown>

          // Se recorre el PLAN, no los campos del item: los resolvers derivados (el ordinal de una
          // fase, la altura de una barra) no tienen valor propio en el item — se calculan desde el
          // índice o desde la serie. Iterar el item los dejaría fuera.
          const planned = Object.keys(instruction.fieldPlan ?? {})
            .filter(key => key.startsWith(`${index}.`))
            .map(key => key.slice(String(index).length + 1))

          const fieldNames = new Set([...Object.keys(record), ...planned])

          for (const fieldName of fieldNames) {
            const fieldValue = record[fieldName]
            const directive = instruction.fieldPlan?.[`${index}.${fieldName}`] ?? { mode: 'text' }

            // Un campo sin valor y sin resolver no se escribe (lo limpia el barrido de abajo).
            if (directive.mode === 'text' && (fieldValue === undefined || fieldValue === null || fieldValue === '')) {
              continue
            }

            // `validation-only` (ej. evidenceRef): se exige, pero NUNCA se pinta. Es munición
            // interna — la fuente de una cifra no es copy para el comité.
            if (directive.mode === 'skip') continue

            if (directive.mode === 'apply') {
              for (const effect of directive.effects) {
                const target =
                  effect.selector === ':self'
                    ? node
                    : effect.selector === ':field'
                      ? // El nodo del propio campo. Escribir texto en `:self` (la raíz del item)
                        // borraría todos los hijos y con ellos las anclas del resto de los campos.
                        node.querySelector(`[data-slot-field="${fieldName}"]`)
                      : node.querySelector(effect.selector)

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

                // Geometría: la barra se DERIVA del dato (ver el comentario en resolvers.ts —
                // una barra que no se recalcula es fabricación gráfica).
                if (effect.styleProp && effect.styleValue !== undefined) {
                  ;(target as HTMLElement).style.setProperty(effect.styleProp, effect.styleValue)
                }

                if (effect.asText && effect.value !== undefined) {
                  target.textContent = effect.value
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
          //
          // ⚠️ Pero un campo **DERIVADO** (el ordinal de un paso, la escala de una barra) tampoco
          // "viene" del autor —lo escribe el resolver— y borrarlo destruye chrome legítimo. Es lo que
          // hacía desaparecer los números de `ProcessStepsFull`: el resolver escribía "01", y el
          // barrido inmediatamente le quitaba el nodo.
          //
          // La regla correcta: **un campo está provisto si lo dio el AUTOR o si lo derivó un
          // RESOLVER.** Vale para cualquier plantilla con chrome derivado, no sólo ésta.
          for (const field of Array.from(node.querySelectorAll('[data-slot-field]'))) {
            const name = field.getAttribute('data-slot-field')!
            const authored = (item as Record<string, unknown>)[name]
            const derived = instruction.fieldPlan?.[`${index}.${name}`] !== undefined

            if (derived) continue

            if (authored === undefined || authored === null || authored === '') {
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
 * TimelineFull owns a second, derived lane: the vertical connector for each milestone. It cannot be
 * an authored slot, because then labels, diamonds and connectors could disagree. The layout compiler
 * emits all three from the same schedule after the regular array filler has created the milestone DOM.
 */
const applyTimelineLayout = async (page: Page, slide: SlideSpec): Promise<void> => {
  if (slide.template !== 'TimelineFull') return

  const parsed = parseTimelineSchedule(slide.slots)

  if (!parsed.schedule) {
    throw new SlotFillError(
      slide.slideId,
      parsed.issues.map(issue => `[${issue.slot}] ${issue.message}`)
    )
  }

  const layout = layoutTimelineSchedule(parsed.schedule)

  const problem = await page.evaluate(({ unitWidth, milestonePositions }) => {
    const root = document.querySelector<HTMLElement>('[data-template="TimelineFull"]')
    const connectorHost = root?.querySelector<HTMLElement>('.vlines')
    const milestoneNodes = root ? Array.from(root.querySelectorAll<HTMLElement>('.mstone')) : []

    if (!root || !connectorHost) return 'TimelineFull no declara el canvas o el host .vlines requerido por el layout.'

    if (milestoneNodes.length !== milestonePositions.length) {
      return `TimelineFull tiene ${milestoneNodes.length} marcadores para ${milestonePositions.length} hitos; no se puede garantizar su correspondencia.`
    }

    root.style.setProperty('--m', unitWidth)
    milestoneNodes.forEach((milestone, index) => milestone.style.setProperty('left', milestonePositions[index]!))
    connectorHost.replaceChildren(
      ...milestonePositions.map(left => {
        const connector = document.createElement('div')

        connector.className = 'vline'
        connector.style.left = left
        connector.setAttribute('aria-hidden', 'true')

        return connector
      })
    )

    return null
  }, layout)

  if (problem) throw new SlotFillError(slide.slideId, [problem])
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

  await applyTimelineLayout(page, slide)

  // Las fuentes pueden re-layoutear tras escribir el copy: esperar de nuevo evita capturar un frame
  // con el fallback de sistema (un deck con la tipografía equivocada es un deck fuera de marca).
  await page.evaluate(() => document.fonts.ready)
}

/**
 * Ensambla las láminas en UN PDF de N páginas — el entregable real de una oferta.
 *
 * Cada lámina se imprime por el MISMO camino ya probado (`page.pdf()`, una página, tamaño exacto del
 * canvas) y después se mergean los documentos con `pdf-lib`.
 *
 * Se descartó la alternativa de embeber las láminas en un solo HTML: cada plantilla es un documento
 * completo con su propio CSS (todas definen `.slide`, `.brand`, `.eyebrow`…), así que concatenarlas
 * haría que los estilos de una pisen a los de otra. Aislarlas con iframes funcionaría, pero deja la
 * impresión a merced de cómo Chromium pagina iframes y de que las fuentes de cada frame estén listas
 * a tiempo. Imprimir + mergear no tiene ninguno de esos modos de falla.
 */
export const mergeSlidePdfs = async (slidePdfPaths: string[], outPath: string): Promise<void> => {
  const deck = await PDFDocument.create()

  for (const slidePath of slidePdfPaths) {
    const bytes = await fs.readFile(slidePath)
    const slideDoc = await PDFDocument.load(bytes)
    const pages = await deck.copyPages(slideDoc, slideDoc.getPageIndices())

    for (const page of pages) {
      deck.addPage(page)
    }
  }

  await fs.writeFile(outPath, await deck.save())
}

export interface ClippedSlot {
  slot: string
  /** Px que el nodo se sale del lienzo, por borde. */
  overflowRight: number
  overflowBottom: number
  /** Px que el texto se sale de su PROPIA caja (recorte interno). */
  textOverflowX: number
  textOverflowY: number
  excerpt: string
}

export class SlideGeometryError extends Error {
  constructor(
    readonly slideId: string,
    readonly clipped: ClippedSlot[]
  ) {
    super(
      `La lámina "${slideId}" no cabe en su lienzo: ${clipped.length} slot(s) quedan recortados. ` +
        `El renderer NO amputa copy (overflow=reject).\n` +
        clipped
          .map(c => {
            const where = [
              c.overflowRight > 0 ? `${c.overflowRight}px fuera del borde derecho` : '',
              c.overflowBottom > 0 ? `${c.overflowBottom}px fuera del borde inferior` : '',
              c.textOverflowX > 0 ? `${c.textOverflowX}px de texto fuera de su caja (horizontal)` : '',
              c.textOverflowY > 0 ? `${c.textOverflowY}px de texto fuera de su caja (vertical)` : ''
            ]
              .filter(Boolean)
              .join(', ')

            return `  - slot "${c.slot}": ${where} — «${c.excerpt}»`
          })
          .join('\n') +
        `\nAcorta el copy, o corrige la geometría de la plantilla si el contrato dice que ese largo cabe.`
    )
    this.name = 'SlideGeometryError'
  }
}

/**
 * Verifica que lo que el contrato llenó QUEPA de verdad.
 *
 * La validación de `validate.ts` cuenta caracteres contra `maxCharacters` — pero un contrato puede
 * mentir: la lámina `FourPillarsFull` declaraba `thesis: max 150` mientras su grid (columnas en `%`
 * + `gap`, que los porcentajes no descuentan) dejaba la última columna 20px fuera del lienzo. Con
 * `.slide { overflow:hidden }` el resultado no era un error: era un PDF con una palabra guillotinada
 * que parecía correcto. Esa es la bug class que este guard cierra — el copy pasa validación y la
 * lámina igual miente.
 *
 * Sólo se auditan los nodos del contrato (`data-slot` / `data-slot-field`): los elementos
 * decorativos (glows, paneles a sangre, el burbujeo de la URL) se salen del lienzo A PROPÓSITO, y
 * auditarlos daría falsos positivos.
 */
export const assertSlideFitsCanvas = async (
  page: Page,
  slide: SlideSpec,
  contract: TemplateContract
): Promise<void> => {
  const clipped = await page.evaluate(
    ({ width, height }) => {
      // 2px: absorbe el redondeo sub-pixel del layout. Una palabra amputada nunca mide 2px.
      const TOLERANCE = 2
      const found: ClippedSlot[] = []

      const clipsContent = (el: Element): boolean => {
        const style = getComputedStyle(el)

        return style.overflowX !== 'visible' || style.overflowY !== 'visible'
      }

      document.querySelectorAll('[data-slot], [data-slot-field]').forEach(node => {
        const el = node as HTMLElement
        const rect = el.getBoundingClientRect()

        if (rect.width === 0 || rect.height === 0) return

        // La ventana donde el nodo es REALMENTE visible: el lienzo, recortado además por cada
        // ancestro que clipee (`.slide{overflow:hidden}`, paneles, tarjetas…). Un texto que se sale
        // de su propia caja pero cuyo box NO clipea (`overflow:visible`) se pinta entero: eso no es
        // un recorte, es cómo se comportan los descendientes tipográficos. Sólo miente lo que
        // desaparece.
        let clipLeft = 0
        let clipTop = 0
        let clipRight = width
        let clipBottom = height

        for (let a = el.parentElement; a; a = a.parentElement) {
          if (!clipsContent(a)) continue

          const ancestor = a.getBoundingClientRect()

          clipLeft = Math.max(clipLeft, ancestor.left)
          clipTop = Math.max(clipTop, ancestor.top)
          clipRight = Math.min(clipRight, ancestor.right)
          clipBottom = Math.min(clipBottom, ancestor.bottom)
        }

        const overflowRight = Math.round(rect.right - clipRight)
        const overflowBottom = Math.round(rect.bottom - clipBottom)

        // Recorte interno: sólo cuenta si la PROPIA caja clipea su contenido.
        const selfClips = clipsContent(el)
        const textOverflowX = selfClips ? Math.round(el.scrollWidth - el.clientWidth) : 0
        const textOverflowY = selfClips ? Math.round(el.scrollHeight - el.clientHeight) : 0

        const escapes =
          overflowRight > TOLERANCE ||
          overflowBottom > TOLERANCE ||
          textOverflowX > TOLERANCE ||
          textOverflowY > TOLERANCE ||
          rect.left < clipLeft - TOLERANCE ||
          rect.top < clipTop - TOLERANCE

        if (!escapes) return

        found.push({
          slot: el.getAttribute('data-slot') ?? el.getAttribute('data-slot-field') ?? el.tagName.toLowerCase(),
          overflowRight: Math.max(0, overflowRight),
          overflowBottom: Math.max(0, overflowBottom),
          textOverflowX: Math.max(0, textOverflowX),
          textOverflowY: Math.max(0, textOverflowY),
          excerpt: (el.textContent ?? '').trim().slice(0, 60)
        })
      })

      return found
    },
    { width: contract.viewport.width, height: contract.viewport.height }
  )

  if (clipped.length > 0) {
    throw new SlideGeometryError(slide.slideId, clipped)
  }
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

    // Antes de imprimir NADA: si el copy no cabe, se rechaza. Un PDF con una palabra cortada es
    // peor que un fallo — se ve terminado, y nadie lo revisa dos veces.
    await assertSlideFitsCanvas(page, slide, contract)

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
