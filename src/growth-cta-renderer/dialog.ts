/**
 * TASK-2045 — Growth CTA renderer: presentación `dialog` de la acción `open_growth_form`.
 *
 * Diálogo modal abierto por el visitante (NO la colocación interruptiva `popup_modal`): `<dialog>` nativo con
 * `showModal()` (inert del resto de la página, Escape y `::backdrop` por construcción), el formulario montado
 * recién al abrir (sin `gh_form_viewed` en la carga) y conservado entre cierres de la misma visita, scroll del
 * documento bloqueado con el contador compartido del agendador, retorno de foco al botón que lo abrió y hoja
 * inferior en teléfono. Mientras el formulario envía (`data-ghf-busy`) Escape y el velo no cierran.
 *
 * Contrato de diseño: docs/ui/wireframes|flows|motion/TASK-2045-growth-form-dialog-design-fidelity*.md.
 * La piel la pone el anfitrión con los tokens `--ghcta-dialog-*` y los hooks `data-ghcta-dialog-*`.
 */
import type { CtaSystemCopy } from './copy'
import { lockDocumentScroll, unlockDocumentScroll } from './meeting-action'

export const FORM_DIALOG_SHEET_QUERY = '(max-width: 760px)'
const GROWTH_FORM_DISMISS_EVENT = 'ghf:dismiss'
const SUCCESS_SELECTOR = '[data-ghf-part="success-card"], .ghf-status--success'
const FIELD_SELECTOR = '.ghf-form input:not([type="hidden"]):not([tabindex="-1"]), .ghf-form textarea, .ghf-form select'

export interface FormDialogHeader {
  eyebrow?: string
  title: string
  lead?: string
}

export interface FormDialogControllerOptions {
  doc: Document
  header: FormDialogHeader
  copy: CtaSystemCopy
  /** Monta el formulario gobernado en el slot (la primera vez que se abre). `false` = no se pudo. */
  mountForm: (slot: HTMLElement) => Promise<boolean>
}

const uid = (): string => globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)

export class FormDialogController {
  private readonly options: FormDialogControllerOptions
  private dialog: HTMLDialogElement | null = null
  private slot: HTMLElement | null = null
  private invoker: HTMLElement | null = null
  private mounted: Promise<boolean> | null = null
  private media: MediaQueryList | null = null
  private observer: MutationObserver | null = null
  private successObserver: MutationObserver | null = null
  private scrollLocked = false
  private disposed = false

  constructor(options: FormDialogControllerOptions) {
    this.options = options
  }

  get element(): HTMLDialogElement | null {
    return this.dialog
  }

  /** Abre el diálogo; monta el formulario sólo la primera vez. `false` si el formulario no se pudo montar. */
  async open(invoker: HTMLElement): Promise<boolean> {
    if (this.disposed) return false
    this.invoker = invoker
    this.ensureDialog()
    this.show()

    this.mounted ??= this.options.mountForm(this.slot!)

    const ok = await this.mounted

    if (!ok) {
      // Reintenta en la próxima apertura; esta se cierra sin colgar un diálogo vacío.
      this.mounted = null
      this.close()

      return false
    }

    this.focusFirstField()

    return true
  }

  close(): void {
    if (!this.dialog?.open) return

    try {
      this.dialog.close()
    } catch {
      this.dialog.removeAttribute('open')
      this.handleClosed()
    }
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.observer?.disconnect()
    this.successObserver?.disconnect()
    this.successObserver = null
    this.media?.removeEventListener('change', this.syncSheet)
    if (this.dialog?.open) this.close()
    this.handleClosed(false)
    this.dialog?.remove()
    this.dialog = null
    this.slot = null
    this.invoker = null
  }

  private isBusy(): boolean {
    return Boolean(this.slot?.querySelector('[data-ghf-busy]'))
  }

  private ensureDialog(): void {
    if (this.dialog) return

    const { doc, header, copy } = this.options
    const titleId = `ghc-form-dialog-title-${uid()}`
    const leadId = `ghc-form-dialog-lead-${uid()}`
    const dialog = doc.createElement('dialog')
    const card = doc.createElement('div')
    const close = doc.createElement('button')
    const head = doc.createElement('header')
    const title = doc.createElement('h2')
    const slot = doc.createElement('div')

    dialog.className = 'ghc-form-surface'
    dialog.setAttribute('aria-labelledby', titleId)
    dialog.setAttribute('data-capture', 'growth-cta-dialog')
    card.className = 'ghc-form-dialog-card'

    close.type = 'button'
    close.className = 'ghc-form-dialog-close'
    close.setAttribute('aria-label', copy.formDialogCloseAria)
    close.setAttribute('data-ghcta-dialog-close', '')
    // Glifo estático (sin copy del contrato): una X de dos trazos.
    close.innerHTML = '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12"/><path d="M18 6L6 18"/></svg>'
    close.addEventListener('click', () => this.close())

    head.className = 'ghc-form-dialog-header'

    if (header.eyebrow) {
      const eyebrow = doc.createElement('p')

      eyebrow.className = 'ghc-form-dialog-eyebrow'
      eyebrow.setAttribute('data-ghcta-dialog-eyebrow', '')
      eyebrow.textContent = header.eyebrow
      head.appendChild(eyebrow)
    }

    title.id = titleId
    title.className = 'ghc-form-dialog-title'
    title.tabIndex = -1
    title.setAttribute('data-ghcta-dialog-title', '')
    title.textContent = header.title
    head.appendChild(title)

    if (header.lead) {
      const lead = doc.createElement('p')

      lead.id = leadId
      lead.className = 'ghc-form-dialog-lead'
      lead.setAttribute('data-ghcta-dialog-lead', '')
      lead.textContent = header.lead
      head.appendChild(lead)
      dialog.setAttribute('aria-describedby', leadId)
    }

    slot.className = 'ghc-form-dialog-stage'
    slot.setAttribute('data-capture', 'growth-form')
    slot.addEventListener(GROWTH_FORM_DISMISS_EVENT, () => this.close())
    // Con el éxito a la vista, el encabezado del diálogo se retira (la tarjeta de éxito es el contenido).
    this.successObserver = new MutationObserver(() => this.syncSuccess())
    this.successObserver.observe(slot, { childList: true, subtree: true })
    card.append(close, head, slot)
    dialog.appendChild(card)

    dialog.addEventListener('cancel', event => {
      event.preventDefault()
      if (!this.isBusy()) this.close()
    })
    // Clic en el velo: el target es el propio <dialog> (la tarjeta lo cubre en el resto).
    dialog.addEventListener('click', event => {
      if (event.target === dialog && !this.isBusy()) this.close()
    })
    dialog.addEventListener('close', () => this.handleClosed())
    doc.body.appendChild(dialog)

    this.dialog = dialog
    this.slot = slot
    this.media = doc.defaultView?.matchMedia?.(FORM_DIALOG_SHEET_QUERY) ?? null
    this.media?.addEventListener('change', this.syncSheet)
    this.syncSheet()
  }

  private show(): void {
    if (!this.dialog || this.dialog.open) return

    try {
      this.dialog.showModal()
    } catch {
      this.dialog.setAttribute('open', '')
    }

    if (!this.scrollLocked) {
      lockDocumentScroll(this.options.doc)
      this.scrollLocked = true
    }

    // Mientras el contrato carga, el foco espera en el título (nombre accesible del diálogo).
    this.dialog.querySelector<HTMLElement>('.ghc-form-dialog-title')?.focus()
  }

  /** Foco al primer campo cuando el formulario está listo (puede llegar después del montaje). */
  private focusFirstField(): void {
    const slot = this.slot

    if (!slot || !this.dialog?.open) return

    const tryFocus = (): boolean => {
      const field = slot.querySelector<HTMLElement>(FIELD_SELECTOR)

      if (!field) return false

      // Si el visitante ya movió el foco dentro del diálogo, no se lo quitamos.
      const active = this.options.doc.activeElement

      if (active && slot.contains(active)) return true

      field.focus()

      return true
    }

    if (tryFocus()) return

    this.observer?.disconnect()
    this.observer = new MutationObserver(() => {
      if (!this.dialog?.open || tryFocus()) {
        this.observer?.disconnect()
        this.observer = null
      }
    })
    this.observer.observe(slot, { childList: true, subtree: true })
  }

  private syncSuccess(): void {
    const success = Boolean(this.slot?.querySelector(SUCCESS_SELECTOR))

    this.dialog?.toggleAttribute('data-success', success)
  }

  private readonly syncSheet = (): void => {
    this.dialog?.toggleAttribute('data-sheet', this.media?.matches ?? false)
  }

  private handleClosed(restoreFocus = true): void {
    this.observer?.disconnect()
    this.observer = null

    if (this.scrollLocked) {
      unlockDocumentScroll(this.options.doc)
      this.scrollLocked = false
    }

    if (restoreFocus && this.invoker?.isConnected) this.invoker.focus()
  }
}
