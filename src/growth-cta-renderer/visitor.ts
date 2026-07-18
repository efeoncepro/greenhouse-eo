/**
 * TASK-1429 — Growth CTA renderer: identidad pseudónima del visitante (browser side).
 *
 * Contraparte browser del visitor state de TASK-1428 (arch §11/§16.2). El renderer
 * genera keys OPACAS (UUID random, cero fingerprinting) y las envía por headers al
 * render GET y en el body del ingest; el server las hashea con salt propio y decide
 * suppression — el browser JAMÁS reconstruye ventanas.
 *
 * Consent-awareness (privacy-first, espejo de la regla server):
 *  - `sessionKey` (sessionStorage, por pestaña): SIEMPRE — es la base del fallback
 *    conservador de sesión; efímero, no persiste al cerrar el browser.
 *  - `visitorKey` (localStorage, durable): SOLO si el host declara
 *    `consent-state="granted"` (punto de integración CMP). Sin consent, el id
 *    durable NUNCA se crea — el server además lo ignoraría (doble guard).
 *
 * Guard local de dismiss (defensa en profundidad, NO autoridad): tras un dismiss
 * del interruptivo, sessionStorage evita re-aperturas en la MISMA sesión aunque el
 * server esté en shadow. La autoridad de suppression sigue siendo server-side.
 */

const SESSION_KEY_STORAGE = 'ghc_session'
const VISITOR_KEY_STORAGE = 'ghc_visitor'
const DISMISS_GUARD_PREFIX = 'ghc_dismissed:'

export type CtaConsentStateMirror = 'granted' | 'denied' | 'unknown'

export interface CtaVisitorIdentity {
  visitorKey: string | null
  sessionKey: string | null
  consentState: CtaConsentStateMirror
  consentSource: string
}

const randomKey = (): string => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  } catch {
    // sin crypto: fallback abajo
  }

  return `ghc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`
}

const readOrCreate = (storage: Storage, key: string): string | null => {
  try {
    const existing = storage.getItem(key)

    if (existing) return existing

    const created = randomKey()

    storage.setItem(key, created)

    return created
  } catch {
    // storage bloqueado (privacy mode / iframe): sin identidad, el server aplica
    // el fallback conservador (interruptivos suprimidos).
    return null
  }
}

export const parseConsentState = (raw: string | null): CtaConsentStateMirror =>
  raw === 'granted' || raw === 'denied' ? raw : 'unknown'

/**
 * Resuelve la identidad del visitante según el consent declarado por el host.
 * `consentState` viene del atributo `consent-state` del element (CMP del host);
 * `consentSource` del atributo `consent-source` (default `none`).
 */
export const resolveVisitorIdentity = (input: {
  consentState: CtaConsentStateMirror
  consentSource: string | null
}): CtaVisitorIdentity => {
  const sessionKey =
    typeof sessionStorage !== 'undefined' ? readOrCreate(sessionStorage, SESSION_KEY_STORAGE) : null

  const visitorKey =
    input.consentState === 'granted' && typeof localStorage !== 'undefined'
      ? readOrCreate(localStorage, VISITOR_KEY_STORAGE)
      : null

  return {
    visitorKey,
    sessionKey,
    consentState: input.consentState,
    consentSource: input.consentSource ?? 'none',
  }
}

/** ¿El visitante ya descartó este CTA en ESTA sesión? (guard local, no autoridad). */
export const isLocallyDismissed = (ctaId: string): boolean => {
  try {
    return typeof sessionStorage !== 'undefined' && sessionStorage.getItem(`${DISMISS_GUARD_PREFIX}${ctaId}`) === '1'
  } catch {
    return false
  }
}

/** Marca el dismiss local ANTES de cualquier salida visual (nunca depende de animación). */
export const markLocallyDismissed = (ctaId: string): void => {
  try {
    if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(`${DISMISS_GUARD_PREFIX}${ctaId}`, '1')
  } catch {
    // storage bloqueado: el server-side suppression sigue siendo la autoridad
  }
}
