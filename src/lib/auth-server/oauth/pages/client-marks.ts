/**
 * Marca visual de la aplicación que pide acceso, en la pantalla de consentimiento.
 *
 * POR QUÉ NO SE PINTA EL LOGO SEGÚN EL NOMBRE. El `client_name` lo declara el propio cliente al
 * registrarse, y el registro dinámico (DCR) es auto-servicio: cualquiera puede llamarse «Claude
 * Desktop». Si el logo saliera del nombre, la pantalla donde una persona decide qué permisos entrega
 * le estaría regalando la confianza de una marca ajena a quien la escriba. Por eso el logo real sólo
 * puede venir de una de dos fuentes verificables:
 *
 *   1. `client_id` registrado, contra el allowlist de abajo (clientes confidenciales que registramos
 *      nosotros con `pnpm auth-server:register-client`), o
 *   2. `logo_uri` de un documento CIMD validado — el camino que declara TASK-1835 y que exige además
 *      ampliar `img-src` por origen en la CSP de esa página. Todavía no está implementado.
 *
 * Mientras una de las dos no aplique, se pinta un monograma neutro: identifica sin suplantar.
 */

/**
 * `client_id` → marca inline. Vacío a propósito: hoy el único cliente registrado es un canary DCR
 * (`dcr-fivomSc2RQ7p0PbtsG5TGw`) y la cohorte real es TASK-1832. Cuando se registre un cliente
 * confidencial de Claude, Codex o ChatGPT, su asset curado entra acá — nunca dibujado a mano:
 * `public/images/logos/axis/` es el registro de isotipos del repo (ya tiene Claude y Gemini).
 */
const VERIFIED_CLIENT_MARKS: Readonly<Record<string, string>> = {}

/** Inicial visible del nombre; ignora comillas y símbolos para no mostrar basura. */
const initialOf = (clientName: string): string => {
  const letter = [...clientName].find(char => /\p{L}|\p{N}/u.test(char))

  return (letter ?? '?').toUpperCase()
}

/**
 * Monograma neutro. No imita ninguna marca: es una ficha del sistema con la inicial del nombre que
 * el cliente declaró, y el nombre completo va al lado en texto. Decorativo para lectores de pantalla
 * (`aria-hidden`) porque el nombre ya está escrito.
 */
const monogram = (clientName: string): string =>
  `<span class="id-client-mark" aria-hidden="true">${initialOf(clientName)}</span>`

export const renderClientMark = (input: { clientId: string; clientName: string }): string =>
  Object.hasOwn(VERIFIED_CLIENT_MARKS, input.clientId)
    ? `<span class="id-client-mark id-client-mark-brand" aria-hidden="true">${VERIFIED_CLIENT_MARKS[input.clientId]}</span>`
    : monogram(input.clientName)
