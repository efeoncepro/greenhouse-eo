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
 * ✅ HERMÉTICO desde TASK-1393 (esta cabecera declaraba lo contrario hasta 2026-07-12 — el
 * comentario quedó stale y contradecía al código; corregido). Hoy: las fuentes salen del font pack
 * LOCAL del brand pack (OFL + checksums), `fillSlide` **aborta la red** (`page.route(/^https?:/)`)
 * y **falla cerrado** si una `FontFace` no cargó. Un deck jamás sale con tipografía de fallback.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

import { PDFArray, PDFDict, PDFDocument, PDFName, PDFNumber, PDFString } from 'pdf-lib'
import { chromium, type Browser, type Page } from 'playwright'

import type { CatalogLayoutHook } from './catalog'
import type {
  DeckPlan,
  SlideSpec,
  SlotContract,
  SlotFieldContract,
  SlotValue,
  TemplateContract
} from './contracts'
import { assertAllImagesResolved, assertNoFontFallback, assertSlideHasInk } from './quality-gates'
import { resolveFieldDirective, type FieldDirective, type ResolverRegistry } from './resolver-contract'

/**
 * Lo que el render necesita del CATÁLOGO (TASK-1393 Slice 2): su tabla de resolvers y sus hooks de
 * layout derivado por plantilla. El motor no conoce `stat-goal-icon` ni `TimelineFull` — ejecuta lo
 * que la superficie declara.
 */
export interface CatalogRenderRuntime {
  resolvers: ResolverRegistry
  layoutHooks?: Record<string, CatalogLayoutHook>
}

/**
 * Launch canónico del Chromium del composer — DETERMINISTA por contrato.
 *
 * Un `chromium.launch()` desnudo rasteriza `backdrop-filter`/blends en GPU, y la GPU puede variar
 * subpíxeles entre corridas del MISMO commit (medido 2026-07-12: 3 píxeles de antialiasing en
 * `HighlightWave`, zona del wave-frame con `backdrop-filter: blur(20px)`). Eso rompe la promesa de
 * auditoría del ADR (mismos slots → mismo artefacto) y haría mentir a un gate de 0 píxeles.
 *
 * Rasterización por software + perfil de color fijo + sin texto LCD = el mismo píxel en cada corrida.
 * TODO consumer que renderice láminas (composeDeck, el gate visual, un worker futuro) DEBE lanzar el
 * browser por acá — un launch paralelo con otros flags produce otro píxel y invalida el baseline.
 */
export const launchComposerBrowser = (): Promise<Browser> =>
  chromium.launch({
    // `--no-sandbox`: el worker corre como root dentro del contenedor (Cloud Run/Cloud Build) y
    // Chromium se niega a arrancar con sandbox en ese caso. Es un flag de AISLAMIENTO DE PROCESO,
    // no de rasterización — no toca un píxel (verificado: visual gate a 0 px con el flag puesto).
    // Va SIEMPRE (uniforme local/contenedor): un launch que dependa del ambiente sería la clase
    // exacta de no-determinismo que este helper existe para eliminar.
    args: [
      '--disable-gpu',
      '--force-color-profile=srgb',
      '--disable-lcd-text',
      '--disable-partial-raster',
      '--no-sandbox'
    ]
  })

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
  /** Blueprint de item y chrome fijo declarados por el contrato de colección. */
  itemSelector?: string
  fixedChildren?: string[]
}

const isPlainRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const buildFieldPlan = (
  slotContract: SlotContract,
  value: SlotValue,
  slots: Record<string, unknown>,
  resolvers: ResolverRegistry
): Record<string, FieldDirective> | undefined => {
  const joinFieldPath = (...parts: Array<string | number | undefined>): string =>
    parts.filter(part => part !== undefined && String(part) !== '').join('.')

  const addFieldPlan = (
    plan: Record<string, FieldDirective>,
    pathPrefix: string,
    shape: Record<string, SlotFieldContract>,
    item: Record<string, unknown>,
    index: number,
    itemCount: number
  ) => {
    const ctx = { item, index, itemCount, slots }

    for (const [fieldName, field] of Object.entries(shape)) {
      const fieldValue = item[fieldName]

      if (field.type === 'array' && Array.isArray(fieldValue) && field.item?.shape) {
        fieldValue.forEach((nested, nestedIndex) => {
          if (!isPlainRecord(nested)) return

          addFieldPlan(
            plan,
            joinFieldPath(pathPrefix, fieldName, nestedIndex),
            field.item!.shape!,
            nested,
            nestedIndex,
            fieldValue.length
          )
        })

        continue
      }

      // Un resolver DERIVADO (ordinal, geometría) corre aunque el campo no venga: el número de fase
      // sale del índice, no de un dato que el autor tenga que escribir.
      const derived = Boolean(field.resolver) || field.consumer === 'resolver-only'

      if (!derived && (fieldValue === undefined || fieldValue === null || fieldValue === '')) continue

      plan[joinFieldPath(pathPrefix, fieldName)] = resolveFieldDirective(
        resolvers,
        field,
        fieldValue,
        ctx
      )
    }
  }

  // Un slot `object` tiene EL MISMO contrato de campo que un item de array: puede declarar evidencia
  // (`validation-only`) y campos DERIVADOS por resolver (la escala de una barra before/after). Que el
  // filler sólo honrara eso en los arrays dejaba a los objetos como ciudadanos de segunda — y era el
  // bug que impedía componer CaseStudySplit: buscaba un ancla de texto para `barScale`, que es
  // geometría, no copy.
  const objectShape = (slotContract as unknown as { shape?: Record<string, never> }).shape

  if (slotContract.type === 'object' && objectShape && isPlainRecord(value)) {
    const plan: Record<string, FieldDirective> = {}
    const record = value as unknown as Record<string, unknown>

    addFieldPlan(plan, '', objectShape, record, 0, 1)

    return Object.keys(plan).length > 0 ? plan : undefined
  }

  const shape = slotContract.item?.shape

  if (!shape || !Array.isArray(value)) return undefined

  const plan: Record<string, FieldDirective> = {}

  // Un `kind` distinto por item resuelve a un ícono distinto, y la geometría de una barra depende
  // del item Y del resto de la serie. Por eso el plan se calcula por item, con contexto completo.
  value.forEach((item, index) => {
    if (typeof item !== 'object' || item === null) return

    addFieldPlan(plan, String(index), shape, item as Record<string, unknown>, index, value.length)
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

const buildInstructions = (
  slide: SlideSpec,
  contract: TemplateContract,
  resolvers: ResolverRegistry
): FillInstruction[] => {
  const instructions: FillInstruction[] = []

  for (const [slotName, slotContract] of Object.entries(contract.slots)) {
    const value = slide.slots[slotName]

    if (value === undefined || value === null) {
      // 🔴 Slot OPCIONAL no provisto → se LIMPIA su nodo. Sin esto, el copy de EJEMPLO del
      // prototipo se imprime tal cual — y los prototipos están escritos contra un cliente real
      // («Propuesta técnica · SKY» en el footer de la agenda): la siguiente licitación que omita
      // ese slot le entregaría a SU comité el nombre de OTRO cliente. Es la misma bug class que
      // el filler ya cerraba para campos de item («quedaría el contenido de ejemplo del
      // prototipo»), pero a nivel de slot top-level.
      if (slotContract.consumer === 'validation-only' || slotContract.type.startsWith('fixed-')) continue

      instructions.push({ selector: slotContract.selector, type: 'absent-optional', value: null })
      continue
    }

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
      fieldPlan: buildFieldPlan(slotContract, value, slide.slots as Record<string, unknown>, resolvers),
      enumLabels: slotContract.values,
      skipFields: validationOnlyFields(slotContract),
      itemSelector: slotContract.itemSelector,
      fixedChildren: slotContract.fixedChildren
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

  const ALLOWED_TAGS = ['EM', 'STRONG', 'BR', 'SPAN', 'A']

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
          // Un tag permitido no trae atributos: nada de `onclick`, `style`, `class`.
          // Única excepción: `href` en <a>, y sólo hacia https:// o un ancla interna.
          // Chromium lo imprime como anotación /Link — es lo que hace clickeable el PDF
          // (la Radiografía y el informe del grader viven en la web; ése es su valor).
          if (child.tagName === 'A' && attr.name === 'href') {
            const href = attr.value.trim()

            if (href.startsWith('https://') || href.startsWith('#')) continue
          }

          child.removeAttribute(attr.name)
        }

        walk(child)
      }
    }

    walk(container)

    return container.innerHTML
  }

  const directFieldAnchors = (node: Element): Element[] =>
    Array.from(node.querySelectorAll('[data-slot-field]')).filter(field => {
      const parentField = field.parentElement?.closest('[data-slot-field]')

      return parentField === null
    })

  const applyDirective = (
    scope: Element,
    fieldName: string,
    directive: FieldDirective,
    selectorLabel: string
  ): boolean => {
    let ok = true

    if (directive.mode !== 'apply') return ok

    for (const effect of directive.effects) {
      const target =
        effect.selector === ':self'
          ? scope
          : effect.selector === ':field'
            ? scope.querySelector(`[data-slot-field="${fieldName}"]`)
            : scope.querySelector(effect.selector)

      if (!target) {
        problems.push(
          `${selectorLabel}: el resolver de "${fieldName}" apunta a "${effect.selector}", que no existe en el item del HTML.`
        )
        ok = false
        continue
      }

      if (effect.attr && effect.value !== undefined) {
        target.setAttribute(effect.attr, effect.value)
      }

      if (effect.remove) {
        target.remove()
        continue
      }

      if (effect.styleProp && effect.styleValue !== undefined) {
        ;(target as HTMLElement).style.setProperty(effect.styleProp, effect.styleValue)
      }

      if (effect.asText && effect.value !== undefined) {
        target.textContent = effect.value
      }

      for (const other of effect.toneGroup ?? []) {
        target.classList.remove(other)
      }

      if (effect.toneClass) {
        target.classList.add(effect.toneClass)
      }
    }

    return ok
  }

  function fillArrayHost(
    host: Element,
    entries: unknown[],
    instruction: FillInstruction,
    pathPrefix: string,
    selectorLabel: string
  ) {
    const itemHost = (host.querySelector('[data-slot-items]') as Element | null) ?? host
    const itemTemplate = itemHost.firstElementChild

    if (!itemTemplate) {
      problems.push(`${selectorLabel}: el campo array "${pathPrefix}" no tiene item-template en el HTML.`)

      return
    }

    const blueprint = itemTemplate.cloneNode(true) as Element

    itemHost.innerHTML = ''

    entries.forEach((entry, nestedIndex) => {
      const node = blueprint.cloneNode(true) as Element

      if (typeof entry === 'string') {
        const field = node.querySelector('[data-slot-field]') ?? node

        field.innerHTML = sanitize(entry)
      } else if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
        fillRecordFields(
          node,
          entry as Record<string, unknown>,
          instruction,
          `${pathPrefix}.${nestedIndex}`,
          selectorLabel
        )
      } else {
        problems.push(`${selectorLabel}: el campo array "${pathPrefix}" trae un item no soportado.`)
      }

      itemHost.appendChild(node)
    })
  }

  function fillRecordFields(
    node: Element,
    record: Record<string, unknown>,
    instruction: FillInstruction,
    pathPrefix: string,
    selectorLabel: string
  ) {
    const plannedPrefix = pathPrefix ? `${pathPrefix}.` : ''

    const planned = Object.keys(instruction.fieldPlan ?? {})
      .filter(key => key.startsWith(plannedPrefix))
      .map(key => key.slice(plannedPrefix.length).split('.')[0])

    const fieldNames = new Set([...Object.keys(record), ...planned])

    for (const fieldName of fieldNames) {
      const fieldValue = record[fieldName]
      const pathKey = pathPrefix ? `${pathPrefix}.${fieldName}` : fieldName
      const directive = instruction.fieldPlan?.[pathKey] ?? { mode: 'text' as const }

      if (directive.mode === 'skip') continue

      if (directive.mode === 'text' && (fieldValue === undefined || fieldValue === null || fieldValue === '')) {
        continue
      }

      if (directive.mode === 'apply') {
        applyDirective(node, fieldName, directive, selectorLabel)
        continue
      }

      const field = node.querySelector(`[data-slot-field="${fieldName}"]`)

      if (!field) {
        problems.push(
          `${selectorLabel}: el campo "${fieldName}" no tiene [data-slot-field="${fieldName}"] en el HTML. ` +
            `Sin ancla, quedaría el contenido de ejemplo del prototipo.`
        )
        continue
      }

      if (Array.isArray(fieldValue)) {
        fillArrayHost(field, fieldValue, instruction, pathKey, selectorLabel)
        continue
      }

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

    for (const field of directFieldAnchors(node)) {
      const name = field.getAttribute('data-slot-field')!
      const authored = record[name]
      const fieldPath = pathPrefix ? `${pathPrefix}.${name}` : name

      const derived = Object.keys(instruction.fieldPlan ?? {}).some(
        key => key === fieldPath || key.startsWith(`${fieldPath}.`)
      )

      if (derived) continue

      if (authored === undefined || authored === null || authored === '') {
        field.remove()
      }
    }
  }

  for (const instruction of instructions) {
    const el = document.querySelector(instruction.selector)

    // Un slot opcional AUSENTE con nodo ausente no es un problema: el prototipo puede no pintarlo.
    if (!el && instruction.type === 'absent-optional') continue

    if (!el) {
      problems.push(`selector sin match en el DOM: ${instruction.selector}`)
      continue
    }

    const { type, value } = instruction

    // Slot opcional NO provisto: el copy de ejemplo del prototipo NO puede llegar al PDF.
    if (type === 'absent-optional') {
      if (el.tagName === 'IMG') {
        el.remove()
        continue
      }

      // Si el nodo envuelve OTRO slot declarado, arrasarlo destruiría slots vivos: se limpian sólo
      // los nodos de texto propios (mismo trato que un campo con hijo anotado).
      if (el.querySelector('[data-slot]')) {
        for (const child of Array.from(el.childNodes)) {
          if (child.nodeType === Node.TEXT_NODE) child.remove()
        }

        continue
      }

      el.innerHTML = ''
      continue
    }

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

      fillRecordFields(el, value as Record<string, unknown>, instruction, '', instruction.selector)
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
      const itemTemplate = instruction.itemSelector ? el.querySelector(instruction.itemSelector) : host.firstElementChild

      if (!itemTemplate) {
        const detail = instruction.itemSelector
          ? `no encuentra el itemSelector "${instruction.itemSelector}" declarado por el contrato`
          : 'no tiene un item-template en el HTML'

        problems.push(`el slot array "${instruction.selector}" ${detail}`)
        continue
      }

      // El markup del item lo define el HTML (lo controla el diseñador). Acá sólo se clona y se llena.
      const blueprint = itemTemplate.cloneNode(true) as Element
      const fixedChildren: Element[] = []

      for (const selector of instruction.fixedChildren ?? []) {
        const fixed = host.querySelector(selector)

        if (!fixed) {
          problems.push(
            `el slot array "${instruction.selector}" declara el fixedChild "${selector}", pero no existe dentro del host.`
          )
          continue
        }

        fixedChildren.push(fixed.cloneNode(true) as Element)
      }

      if (problems.length > 0) continue

      host.innerHTML = ''
      host.append(...fixedChildren)

      items.forEach((item, index) => {
        const node = blueprint.cloneNode(true) as Element

        if (typeof item === 'string') {
          const field = node.querySelector('[data-slot-field]') ?? node

          field.innerHTML = sanitize(item)
        } else if (item && typeof item === 'object' && !Array.isArray(item)) {
          fillRecordFields(
            node,
            item as Record<string, unknown>,
            instruction,
            String(index),
            `${instruction.selector} item ${index}`
          )
        } else {
          problems.push(`el slot array "${instruction.selector}" trae un item no soportado.`)
        }

        host.appendChild(node)
      })

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
 * lista para capturar. Los resolvers y los hooks de layout derivado (ej. los conectores del
 * timeline en deck-axis) los aporta el CATÁLOGO vía `runtime`.
 */
export const fillSlide = async (
  page: Page,
  templateHtmlPath: string,
  slide: SlideSpec,
  contract: TemplateContract,
  runtime: CatalogRenderRuntime,
  deckPlan?: DeckPlan
): Promise<void> => {
  // esbuild/tsx compila las funciones con `keepNames`, que las envuelve en un helper `__name`.
  // Ese helper existe en el bundle de Node, NO dentro del browser — y `page.evaluate` serializa la
  // función ya transformada. Sin este shim, cualquier filler revienta con "__name is not defined".
  await page.addInitScript(() => {
    ;(globalThis as unknown as { __name: <T>(fn: T) => T }).__name = fn => fn
  })

  // RENDER HERMÉTICO (TASK-1393 Slice 4): el catálogo es autocontenido (assets + fuentes locales
  // del brand pack), así que TODA salida a la red se bloquea. Una plantilla que pida algo por
  // http(s) —una fuente de Google, un asset remoto— no degrada en silencio: su recurso falla y el
  // assert de fuentes de abajo (o el frame) lo delata. Mismos slots → mismo artefacto, sin red.
  await page.route(/^https?:\/\//, route => route.abort())

  // `file://` + assets relativos: el HTML resuelve sus propios SVG/PNG desde el dir de la plantilla.
  await page.goto(`file://${path.resolve(templateHtmlPath)}`, { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)

  const problems = await page.evaluate(fillDom, buildInstructions(slide, contract, runtime.resolvers))

  if (problems.length > 0) {
    throw new SlotFillError(slide.slideId, problems)
  }

  // Layout derivado post-fill del catálogo (los conectores de TimelineFull no pueden ser un slot
  // autorado: labels, rombos y conectores deben salir del MISMO schedule o podrían discrepar).
  await runtime.layoutHooks?.[slide.template]?.(page, slide, deckPlan)

  // Las fuentes pueden re-layoutear tras escribir el copy: esperar de nuevo evita capturar un frame
  // con el fallback de sistema (un deck con la tipografía equivocada es un deck fuera de marca).
  await page.evaluate(() => document.fonts.ready)

  // FAIL-CLOSED tipográfico: una fuente declarada que no carga (archivo ausente, red bloqueada)
  // queda en status 'error' — y un PDF que degradó a fallback tipográfico PARECE terminado. No se
  // emite: se aborta con el detalle. (Las faces 'unloaded' no usadas por la lámina son legítimas.)
  const brokenFonts = await page.evaluate(() =>
    [...document.fonts]
      .filter(face => face.status === 'error')
      .map(face => `${face.family} ${face.weight} ${face.style}`)
  )

  if (brokenFonts.length > 0) {
    throw new SlotFillError(
      slide.slideId,
      brokenFonts.map(font => `fuente declarada que NO cargó (el render no degrada a fallback): ${font}`)
    )
  }
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
/**
 * Sentinel de link INTERNO del deck (lo emite el resolver `chapter-anchor` del catálogo): Chromium
 * sólo imprime anotaciones para URLs absolutas, así que el salto de agenda viaja como URI y el merge
 * lo convierte en GoTo a la página real. Si el `slideId` no existe en el plan, la anotación se
 * DESCARTA — el sentinel jamás puede llegar al PDF entregado.
 */
const INTERNAL_LINK_SENTINEL = 'https://deck.internal/'

export const mergeSlidePdfs = async (
  slidePdfPaths: string[],
  outPath: string,
  slideIds: string[] = []
): Promise<void> => {
  const deck = await PDFDocument.create()

  // ⚠️ `copyPages` DESCARTA las anotaciones (medido: un slide con /URI llega al merge con 0).
  // Los enlaces del deck son su valor probatorio —la Radiografía y el informe del grader viven en
  // la web para que el comité los verifique solo—, así que se re-crean a mano en DOS pasadas:
  // primero se agregan TODAS las páginas (un GoTo de la agenda necesita el ref de una página que
  // aún no existe al copiar la lámina 2), después se materializan las anotaciones.
  const pending: { pageIndex: number; uri: string; rect: number[] }[] = []

  for (const [slideIndex, slidePath] of slidePdfPaths.entries()) {
    const bytes = await fs.readFile(slidePath)
    const slideDoc = await PDFDocument.load(bytes)
    const pages = await deck.copyPages(slideDoc, slideDoc.getPageIndices())

    for (const [index, page] of pages.entries()) {
      deck.addPage(page)

      const sourceAnnots = slideDoc.getPage(index).node.Annots()

      if (!sourceAnnots) continue

      for (let i = 0; i < sourceAnnots.size(); i++) {
        const annot = sourceAnnots.lookup(i)

        if (!(annot instanceof PDFDict)) continue
        if (annot.lookup(PDFName.of('Subtype')) !== PDFName.of('Link')) continue

        const action = annot.lookup(PDFName.of('A'))

        if (!(action instanceof PDFDict)) continue
        if (action.lookup(PDFName.of('S')) !== PDFName.of('URI')) continue

        const uri = action.lookup(PDFName.of('URI'))
        const rect = annot.lookup(PDFName.of('Rect'))

        if (!(uri instanceof PDFString) || !(rect instanceof PDFArray)) continue
        if (!uri.decodeText().startsWith('https://')) continue

        pending.push({
          pageIndex: slideIndex,
          uri: uri.decodeText(),
          rect: rect.asArray().map(value => (value instanceof PDFNumber ? value.asNumber() : 0))
        })
      }
    }
  }

  // Segunda pasada: URI externo se porta tal cual; el sentinel interno se convierte en GoTo a la
  // página del `slideId` (índice en el plan = índice de página: cada lámina es UNA página).
  const annotsByPage = new Map<number, ReturnType<typeof deck.context.register>[]>()

  for (const { pageIndex, uri, rect } of pending) {
    let ref

    if (uri.startsWith(INTERNAL_LINK_SENTINEL)) {
      const targetId = uri.slice(INTERNAL_LINK_SENTINEL.length)
      const targetIndex = slideIds.indexOf(targetId)

      // Fail-closed: sin destino real no hay anotación — un sentinel nunca se entrega como URL.
      if (targetIndex < 0 || targetIndex >= deck.getPageCount()) continue

      ref = deck.context.register(
        deck.context.obj({
          Type: 'Annot',
          Subtype: 'Link',
          Rect: rect,
          Border: [0, 0, 0],
          A: { Type: 'Action', S: 'GoTo', D: deck.context.obj([deck.getPage(targetIndex).ref, 'Fit']) }
        })
      )
    } else {
      ref = deck.context.register(
        deck.context.obj({
          Type: 'Annot',
          Subtype: 'Link',
          Rect: rect,
          Border: [0, 0, 0],
          A: { Type: 'Action', S: 'URI', URI: PDFString.of(uri) }
        })
      )
    }

    const refs = annotsByPage.get(pageIndex) ?? []

    refs.push(ref)
    annotsByPage.set(pageIndex, refs)
  }

  for (const [pageIndex, refs] of annotsByPage) {
    deck.getPage(pageIndex).node.set(PDFName.of('Annots'), deck.context.obj(refs))
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
  target: RenderTarget,
  runtime: CatalogRenderRuntime,
  deckPlan?: DeckPlan
): Promise<void> => {
  const page = await browser.newPage({
    viewport: contract.viewport,
    deviceScaleFactor: 1,
    reducedMotion: 'reduce'
  })

  try {
    await fillSlide(page, templateHtmlPath, slide, contract, runtime, deckPlan)

    // Antes de imprimir NADA: si el copy no cabe, se rechaza. Un PDF con una palabra cortada es
    // peor que un fallo — se ve terminado, y nadie lo revisa dos veces.
    await assertSlideFitsCanvas(page, slide, contract)

    // Quality gates mecánicos (TASK-1391 · 1b): en régimen nadie mira cada render — estos
    // detectores reemplazan el "mirar los frames". Gates de publicación, no advertencias.
    await assertAllImagesResolved(page, slide.slideId)
    await assertNoFontFallback(page, slide.slideId)

    if (target.kind === 'png') {
      const buffer = await page.screenshot({ path: target.outPath })

      assertSlideHasInk(buffer, slide.slideId)
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
