/**
 * Marca visual de la aplicación que pide acceso, en la pantalla de consentimiento.
 *
 * POR QUÉ NO SE PINTA EL LOGO SEGÚN EL NOMBRE. El `client_name` lo declara el propio cliente al
 * registrarse, y el registro dinámico (DCR) es auto-servicio: cualquiera puede llamarse «Claude
 * Desktop». Si el logo saliera del nombre, la pantalla donde una persona decide qué permisos entrega
 * le estaría regalando la confianza de una marca ajena a quien la escriba.
 *
 * DE DÓNDE SÍ PUEDE SALIR. En CIMD el `client_id` ES una URL https y el emisor va a buscar el
 * documento de metadata a ese origen (`looksLikeCimdClientId`, `resolveCimdClient`). Servir ese
 * documento exige controlar el dominio, así que el ORIGEN del `client_id` es prueba de propiedad —
 * no una declaración. Ésa es la llave del allowlist de abajo. Un `client_id` de DCR (`dcr-…`) no es
 * una URL y nunca entra acá.
 *
 * Los assets salen del registro curado del repo (`public/images/logos/axis/`), embebidos por
 * `pnpm auth-server:brand-assets:generate`. NUNCA se redibuja una marca ajena a mano.
 */
import { CLIENT_MARK_CLAUDE_SVG, CLIENT_MARK_GEMINI_SVG, CLIENT_MARK_GPT_SVG } from './efeonce-isotipo.generated'

/**
 * Origen verificado del `client_id` CIMD → marca inline.
 *
 * Cada origen se lista de forma EXACTA, nunca por sufijo de dominio: `endsWith('.google.com')`
 * dejaría entrar a `evil-google.com` y a cualquier subdominio tomado. Falta Copilot: no hay isotipo
 * suyo en `public/images/logos/axis/` ni en el registro de marcas, y no se dibuja de memoria.
 */
const VERIFIED_CLIENT_MARKS: Readonly<Record<string, string>> = {
  'https://claude.ai': CLIENT_MARK_CLAUDE_SVG,
  'https://claude.com': CLIENT_MARK_CLAUDE_SVG,
  'https://chatgpt.com': CLIENT_MARK_GPT_SVG,
  'https://openai.com': CLIENT_MARK_GPT_SVG,
  'https://platform.openai.com': CLIENT_MARK_GPT_SVG,
  'https://gemini.google.com': CLIENT_MARK_GEMINI_SVG
}

/** Origen sólo cuando el `client_id` es una URL https absoluta; cualquier otra forma no califica. */
const verifiedOriginOf = (clientId: string): string | null => {
  if (!clientId.startsWith('https://')) return null

  try {
    return new URL(clientId).origin
  } catch {
    return null
  }
}

/** Inicial visible del nombre; ignora comillas y símbolos para no mostrar basura. */
const initialOf = (clientName: string): string => {
  const letter = [...clientName].find(char => /\p{L}|\p{N}/u.test(char))

  return (letter ?? '?').toUpperCase()
}

export const renderClientMark = (input: { clientId: string; clientName: string }): string => {
  const origin = verifiedOriginOf(input.clientId)
  const mark = origin && Object.hasOwn(VERIFIED_CLIENT_MARKS, origin) ? VERIFIED_CLIENT_MARKS[origin] : null

  // Decorativo en ambos casos (`aria-hidden`): el nombre de la aplicación ya va escrito al lado.
  return mark
    ? `<span class="id-client-mark id-client-mark-brand" aria-hidden="true">${mark}</span>`
    : `<span class="id-client-mark" aria-hidden="true">${initialOf(input.clientName)}</span>`
}
