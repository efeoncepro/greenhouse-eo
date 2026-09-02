/**
 * ISSUE-167 — Foco y salida por teclado de una superficie revelada in-place.
 *
 * ## Por qué existe
 *
 * Antes de esta primitive el comportamiento estaba TRES veces y distinto:
 * `slide-in.ts` guardaba focus-return y escuchaba `Escape` a nivel del shell,
 * `meeting-action.ts` tenía su propia gestión de foco con heading `tabindex=-1`,
 * y el path del form (`action.ts` + `renderer.ts`) **no tenía ninguna** — el foco
 * quedaba en `body` y `Escape` no cerraba. Medido en producción el 2026-09-01.
 *
 * La causa raíz no era el form: era que el foco y la salida por teclado se habían
 * modelado como propiedad del **placement** (slide-in) en vez de como propiedad de
 * **"hay una superficie revelada por activación del usuario"**. Por eso el
 * `embedded` no las heredaba. Esta primitive las modela donde corresponde, y
 * cualquier acción futura las obtiene por construcción en vez de reimplementarlas.
 *
 * ## Contrato
 *
 * Es un **disclosure, no un modal**: no atrapa el foco, no declara `aria-modal`,
 * no oscurece la página. Tab sigue el orden natural del documento hacia el resto
 * del host. Eso es deliberado — el CTA vive incrustado en páginas ajenas.
 *
 * 🔴 **`Escape` se escucha en el contenedor, NUNCA en el documento.** Un CTA
 * incrustado en el sitio de un cliente no puede secuestrarle el `Escape` a su
 * página. Escuchar en el contenedor es seguro justamente porque `enter()` mete el
 * foco adentro: el evento burbujea desde donde está el foco. Si el foco no está
 * adentro, el visitante no está en esta superficie y `Escape` no le pertenece.
 */

/** Selector de lo enfocable por teclado, sin los que están explícitamente fuera del orden. */
const FOCUSABLE_SELECTOR = [
  'input:not([type="hidden"]):not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

export interface DisclosureFocusOptions {
  doc: Document
  /** El contenedor revelado. `Escape` se escucha acá, jamás en el documento. */
  container: HTMLElement
  /** A dónde vuelve el foco al cerrar — típicamente el control que abrió. */
  returnTo: Element | null
  /** Qué hacer cuando el visitante pide salir. Si se omite, `Escape` no hace nada. */
  onExit?: () => void
}

export interface DisclosureFocusHandle {
  /**
   * Mueve el foco al contenido revelado. Idempotente y tolerante a contenido que
   * todavía no montó: si no encuentra nada enfocable, enfoca el contenedor con
   * `tabindex=-1` para que el lector de pantalla igual anuncie el cambio.
   */
  enter: () => void
  /** Quita el listener y devuelve el foco al trigger si sigue conectado. */
  release: () => void
}

const firstFocusable = (container: HTMLElement): HTMLElement | null =>
  container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)

/**
 * Cablea foco + salida por teclado sobre una superficie revelada in-place.
 * El caller decide CUÁNDO entrar (`enter()`) y cuándo soltar (`release()`).
 */
export const attachDisclosureFocus = ({
  doc,
  container,
  returnTo,
  onExit,
}: DisclosureFocusOptions): DisclosureFocusHandle => {
  let released = false

  const onKeydown = (event: Event): void => {
    const key = (event as KeyboardEvent).key

    if (key !== 'Escape' || released || !onExit) return

    // No se llama `preventDefault`: si el host tiene su propio manejo de Escape,
    // que lo reciba también. Salir de este disclosure no es exclusivo.
    onExit()
  }

  container.addEventListener('keydown', onKeydown)

  const enter = (): void => {
    if (released) return

    const target = firstFocusable(container)

    if (target) {
      target.focus()

      return
    }

    // Sin nada enfocable dentro (contenido async que todavía no montó, o una
    // superficie puramente informativa): el contenedor toma el foco para que el
    // cambio se anuncie. `-1` lo deja fuera del orden de Tab, como debe ser.
    if (!container.hasAttribute('tabindex')) container.tabIndex = -1
    container.focus()
  }

  const release = (): void => {
    if (released) return
    released = true
    container.removeEventListener('keydown', onKeydown)

    const active = doc.activeElement

    // Solo se devuelve el foco si el visitante estaba DENTRO de la superficie que
    // se cierra. Si se había ido a otra parte de la página, moverlo sería robarle
    // el lugar — el mismo criterio que ya aplicaba `slide-in`.
    if (!(active && container.contains(active))) return

    if (returnTo instanceof HTMLElement && returnTo.isConnected && typeof returnTo.focus === 'function') {
      returnTo.focus()

      return
    }

    ;(active as HTMLElement).blur?.()
  }

  return { enter, release }
}
