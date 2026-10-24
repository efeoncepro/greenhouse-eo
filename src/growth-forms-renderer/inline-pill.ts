/**
 * TASK-2054 — Vista de la presentación `inline_pill` (contrato de TASK-2053).
 *
 * Reproduce el formulario en línea del canvas aprobado de la portada del blog v3 (`.gxs`): un botón
 * píldora que se estira en el campo de correo con su botón de envío, muestra el loader de la órbita
 * al enviar, confirma con relleno y check y queda en un estado final más angosto. La vista sólo
 * construye el DOM una vez y cambia de estado con `data-ghf-inline-state` (las transiciones CSS
 * necesitan los mismos nodos); el envío, la validación, el consentimiento, el captcha y la
 * telemetría son los del formulario estándar y los orquesta `FormRenderer`.
 *
 * Valores = tokens `--ghf-inline-*` (styles.ts) con el default del canvas; el anfitrión declara el
 * tono. Hooks estables = `data-ghf-part="inline-*"`.
 */

export type InlinePillState = 'idle' | 'open' | 'loading' | 'success' | 'done'

export interface InlinePillLabels {
  openLabel: string
  submitLabel: string
  successLabel: string
  doneLabel: string
  emailLabel: string
  note?: string
  formAriaLabel: string
}

export interface InlinePillRefs {
  wrap: HTMLElement
  pill: HTMLElement
  openButton: HTMLButtonElement
  form: HTMLFormElement
  input: HTMLInputElement
  sendButton: HTMLButtonElement
  ok: HTMLElement
  successText: HTMLElement
  doneText: HTMLElement
  note: HTMLElement | null
  error: HTMLElement
  errorText: HTMLElement
  retryButton: HTMLButtonElement
  honeypot: HTMLInputElement
}

const SVG_NS = 'http://www.w3.org/2000/svg'

const svgEl = (doc: Document, tag: string, attrs: Record<string, string>): SVGElement => {
  const node = doc.createElementNS(SVG_NS, tag)

  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v)

  return node
}

const htmlEl = <K extends keyof HTMLElementTagNameMap>(
  doc: Document,
  tag: K,
  attrs: Record<string, string> = {},
  text?: string
): HTMLElementTagNameMap[K] => {
  const node = doc.createElement(tag)

  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v)
  if (text !== undefined) node.textContent = text

  return node
}

/** Logo que reemplaza la palabra final de un rótulo (TASK-2056): `src` lo declara el anfitrión. */
export interface InlinePillLabelLogo {
  src: string
  text: string
}

/** Valida el logo que declara el anfitrión: URL https o relativa a la raíz (nunca `//host`, `data:` ni otro esquema). */
export const resolveInlineLabelLogo = (src: string | null, text: string | null): InlinePillLabelLogo | undefined => {
  const s = (src ?? '').trim()
  const t = (text ?? '').trim()

  if (!s || !t || !/^(https:\/\/|\/(?!\/))/.test(s)) return undefined

  return { src: s, text: t }
}

/**
 * Una copia del rótulo: texto plano o, con logo y si el rótulo termina en su palabra, el texto previo + el logo.
 * El logo de la copia visible lleva la palabra como `alt` (el nombre accesible sigue completo); la decorativa, vacío.
 */
const rollCopy = (doc: Document, label: string, decorative: boolean, logo?: InlinePillLabelLogo): HTMLElement => {
  const copy = htmlEl(doc, 'span', decorative ? { 'aria-hidden': 'true' } : {})

  if (!logo || !label.endsWith(logo.text)) {
    copy.textContent = label

    return copy
  }

  copy.appendChild(doc.createTextNode(label.slice(0, label.length - logo.text.length)))
  copy.appendChild(htmlEl(doc, 'img', { class: 'ghf-inline-logo', src: logo.src, alt: decorative ? '' : logo.text, 'data-ghf-part': 'inline-logo' }))

  return copy
}

/** Texto que «rueda» al pasar el puntero (botón AXIS): dos copias, la segunda decorativa. */
const roll = (doc: Document, label: string, logo?: InlinePillLabelLogo): HTMLElement => {
  const outer = htmlEl(doc, 'span', { class: 'ghf-inline-roll' })
  const inner = htmlEl(doc, 'span', { class: 'ghf-inline-roll-in' })

  inner.appendChild(rollCopy(doc, label, false, logo))
  inner.appendChild(rollCopy(doc, label, true, logo))
  outer.appendChild(inner)

  return outer
}

/** Flecha AXIS: trazo punteado que se completa y cabeza que avanza. */
const arrow = (doc: Document): SVGElement => {
  const svg = svgEl(doc, 'svg', { class: 'ghf-inline-arrow', width: '20', height: '20', viewBox: '0 0 24 24', 'aria-hidden': 'true' })

  const g = svgEl(doc, 'g', {
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round'
  })

  g.appendChild(svgEl(doc, 'path', { class: 'ghf-inline-arrow-stem', pathLength: '1', d: 'M19 12H5' }))
  g.appendChild(svgEl(doc, 'path', { class: 'ghf-inline-arrow-head', d: 'M14 7l5 5l-5 5' }))
  svg.appendChild(g)

  return svg
}

/** Loader de la órbita (el mismo del sistema de botones del canvas). */
const orbitSpinner = (doc: Document): SVGElement => {
  const svg = svgEl(doc, 'svg', { class: 'ghf-inline-spin', viewBox: '0 0 24 24', 'aria-hidden': 'true' })

  svg.appendChild(svgEl(doc, 'circle', { cx: '12', cy: '12', r: '8', fill: 'none', stroke: 'currentColor', 'stroke-width': '1', opacity: '0.22' }))
  const g = svgEl(doc, 'g', {})

  g.appendChild(
    svgEl(doc, 'path', {
      d: 'M 5.871644455048177 6.857699122507684 A 8 8 0 0 1 12 4',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '1.6',
      'stroke-linecap': 'round'
    })
  )
  g.appendChild(svgEl(doc, 'circle', { cx: '12', cy: '4', r: '3.5', fill: 'currentColor', opacity: '0.13' }))
  g.appendChild(svgEl(doc, 'circle', { cx: '12', cy: '4', r: '2', fill: 'currentColor' }))
  svg.appendChild(g)

  return svg
}

const check = (doc: Document): SVGElement => {
  const svg = svgEl(doc, 'svg', { class: 'ghf-inline-check', width: '22', height: '22', viewBox: '0 0 24 24', 'aria-hidden': 'true' })

  svg.appendChild(
    svgEl(doc, 'path', {
      pathLength: '1',
      d: 'M5 12.5l4.5 4.5l9.5 -10',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '2.2',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round'
    })
  )

  return svg
}

export interface BuildInlinePillOptions {
  doc: Document
  instanceId: string
  kind: 'subscribe' | 'event'
  labels: InlinePillLabels
  /** TASK-2056 — Logo en el rótulo del botón de apertura (sólo ahí: envío y estados siguen en texto). */
  labelLogo?: InlinePillLabelLogo
  placeholder?: string
  autocomplete?: string
  /** Construye el texto de la nota (puede traer el enlace a la política); sin él, texto plano. */
  buildNote?: (note: string) => HTMLElement
  retryLabel: string
}

export const buildInlinePill = (opts: BuildInlinePillOptions): InlinePillRefs => {
  const { doc, instanceId, labels } = opts
  const inputId = `${instanceId}-inline-email`
  const errorId = `${instanceId}-inline-error`
  const noteId = `${instanceId}-inline-note`

  const wrap = htmlEl(doc, 'div', { class: 'ghf-inline', 'data-ghf-part': 'inline', 'data-ghf-inline-kind': opts.kind })
  const pill = htmlEl(doc, 'div', { class: 'ghf-inline-pill', 'data-ghf-part': 'inline-pill', 'data-ghf-inline-state': 'idle' })

  const openButton = htmlEl(doc, 'button', {
    type: 'button',
    class: 'ghf-inline-open',
    'data-ghf-part': 'inline-open',
    'aria-expanded': 'false',
    'aria-controls': inputId
  })

  openButton.appendChild(roll(doc, labels.openLabel, opts.labelLogo))
  openButton.appendChild(arrow(doc))

  // `data-hs-do-not-collect` antes de insertar el nodo (HubSpot lo evalúa al descubrirlo): la entrega
  // a HubSpot es del destino gobernado, igual que en el formulario estándar.
  const form = htmlEl(doc, 'form', {
    class: 'ghf-inline-form',
    novalidate: 'novalidate',
    'data-hs-do-not-collect': 'true',
    'aria-label': labels.formAriaLabel,
    'aria-hidden': 'true'
  })

  form.appendChild(htmlEl(doc, 'label', { for: inputId, class: 'ghf-sr-only' }, labels.emailLabel))

  const input = htmlEl(doc, 'input', {
    id: inputId,
    class: 'ghf-inline-input',
    type: 'email',
    name: 'email',
    required: 'required',
    autocomplete: opts.autocomplete ?? 'email',
    inputmode: 'email',
    spellcheck: 'false',
    tabindex: '-1',
    'data-ghf-part': 'inline-input',
    'aria-describedby': labels.note ? noteId : errorId
  })

  if (opts.placeholder) input.setAttribute('placeholder', opts.placeholder)
  form.appendChild(input)

  const honey = htmlEl(doc, 'div', { class: 'ghf-honeypot', 'aria-hidden': 'true' })

  const honeypot = htmlEl(doc, 'input', {
    type: 'text',
    name: `${instanceId}_url_optional`,
    tabindex: '-1',
    autocomplete: 'new-password',
    readonly: 'readonly',
    'data-lpignore': 'true',
    'data-1p-ignore': 'true',
    'data-bwignore': 'true'
  })

  honey.appendChild(honeypot)
  form.appendChild(honey)

  const sendButton = htmlEl(doc, 'button', {
    type: 'submit',
    class: 'ghf-inline-send',
    'data-ghf-part': 'inline-send',
    'aria-busy': 'false',
    tabindex: '-1'
  })

  const sendContent = htmlEl(doc, 'span', { class: 'ghf-inline-send-content' })

  sendContent.appendChild(roll(doc, labels.submitLabel))
  sendContent.appendChild(arrow(doc))
  sendButton.appendChild(sendContent)
  sendButton.appendChild(orbitSpinner(doc))
  form.appendChild(sendButton)

  const ok = htmlEl(doc, 'div', { class: 'ghf-inline-ok', 'data-ghf-part': 'inline-ok', role: 'status', 'aria-live': 'polite', tabindex: '-1' })

  ok.appendChild(check(doc))
  const msg = htmlEl(doc, 'span', { class: 'ghf-inline-msg' })
  const successText = htmlEl(doc, 'span', { class: 'ghf-inline-t1' }, '')
  const doneText = htmlEl(doc, 'span', { class: 'ghf-inline-t2' }, '')

  msg.appendChild(successText)
  msg.appendChild(doneText)
  ok.appendChild(msg)

  pill.appendChild(openButton)
  pill.appendChild(form)
  pill.appendChild(ok)
  wrap.appendChild(pill)

  const error = htmlEl(doc, 'div', { class: 'ghf-inline-error', id: errorId, 'data-ghf-part': 'inline-error', hidden: 'hidden' })
  const errorText = htmlEl(doc, 'p', { class: 'ghf-inline-error-text', role: 'alert' })
  const retryButton = htmlEl(doc, 'button', { type: 'button', class: 'ghf-inline-retry', 'data-ghf-part': 'inline-retry', hidden: 'hidden' }, opts.retryLabel)

  error.appendChild(errorText)
  error.appendChild(retryButton)
  wrap.appendChild(error)

  let note: HTMLElement | null = null

  if (labels.note) {
    note = htmlEl(doc, 'p', { class: 'ghf-inline-note', id: noteId, 'data-ghf-part': 'inline-note', 'aria-hidden': 'true' })
    note.appendChild(opts.buildNote ? opts.buildNote(labels.note) : doc.createTextNode(labels.note))
    wrap.appendChild(note)
  }

  return { wrap, pill, openButton, form, input, sendButton, ok, successText, doneText, note, error, errorText, retryButton, honeypot }
}

/**
 * Aplica un estado. Accesibilidad como en el canvas: el botón de apertura sale del orden de foco y
 * del árbol accesible mientras el campo está abierto, y el formulario sólo es alcanzable abierto.
 */
export const applyInlinePillState = (refs: InlinePillRefs, state: InlinePillState): void => {
  const formReachable = state === 'open' || state === 'loading'
  const idle = state === 'idle'

  refs.pill.setAttribute('data-ghf-inline-state', state)
  refs.openButton.setAttribute('aria-expanded', idle ? 'false' : 'true')
  refs.openButton.setAttribute('tabindex', idle ? '0' : '-1')
  refs.openButton.setAttribute('aria-hidden', idle ? 'false' : 'true')
  refs.form.setAttribute('aria-hidden', formReachable ? 'false' : 'true')
  refs.input.setAttribute('tabindex', formReachable ? '0' : '-1')
  refs.sendButton.setAttribute('tabindex', formReachable ? '0' : '-1')
  refs.sendButton.setAttribute('aria-busy', state === 'loading' ? 'true' : 'false')
  refs.input.readOnly = state === 'loading'
  refs.note?.setAttribute('aria-hidden', formReachable ? 'false' : 'true')
}

/**
 * Muestra u oculta el mensaje bajo la píldora. `fieldInvalid` (default) marca el campo como inválido;
 * un error de red o del servidor no lo es. «Reintentar» sólo cuando reintentar puede resolverlo.
 */
export const setInlinePillError = (
  refs: InlinePillRefs,
  message: string | null,
  options: { retry?: boolean; fieldInvalid?: boolean } = {}
): void => {
  const restingDescription = refs.note?.id ?? refs.error.id

  if (!message) {
    refs.error.hidden = true
    refs.errorText.textContent = ''
    refs.retryButton.hidden = true
    refs.input.removeAttribute('aria-invalid')
    refs.input.setAttribute('aria-describedby', restingDescription)
    refs.pill.removeAttribute('data-ghf-inline-invalid')

    return
  }

  const fieldInvalid = options.fieldInvalid !== false

  refs.errorText.textContent = message
  refs.error.hidden = false
  refs.retryButton.hidden = !options.retry
  refs.input.setAttribute('aria-describedby', refs.note ? `${refs.error.id} ${refs.note.id}` : refs.error.id)

  if (fieldInvalid) {
    refs.input.setAttribute('aria-invalid', 'true')
    refs.pill.setAttribute('data-ghf-inline-invalid', 'true')
  } else {
    refs.input.removeAttribute('aria-invalid')
    refs.pill.removeAttribute('data-ghf-inline-invalid')
  }
}
