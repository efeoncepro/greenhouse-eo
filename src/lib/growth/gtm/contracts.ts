/**
 * Google Tag Manager (GTM) — contratos del dominio.
 *
 * Un solo cliente sirve DOS modelos de conexión (misma API v2, distinto token):
 *   - Efeonce (contenedor propio) → token de service account vía `createGoogleAuth`.
 *   - Clientes (contenedores ajenos) → token per-org vía OAuth (mirror del patrón
 *     Search Console: refresh token por organización, guardado como secret).
 *
 * El token (access/refresh) NUNCA aparece en estos contratos. El cliente lo recibe
 * a través de un `GtmTokenProvider` inyectado — así el mismo `GtmApiClient` opera
 * Efeonce y clientes sin ramificar la lógica de negocio.
 */

import 'server-only'

export const GTM_API_BASE = 'https://tagmanager.googleapis.com/tagmanager/v2'

/** Scopes canónicos de la Tag Manager API v2. */
export const GTM_SCOPES = {
  /** Solo lectura: inventariar/auditar cuentas, contenedores, tags, triggers, variables. */
  readonly: 'https://www.googleapis.com/auth/tagmanager.readonly',
  /** Crear/editar tags, triggers, variables, workspaces y versiones (sin publicar). */
  editContainers: 'https://www.googleapis.com/auth/tagmanager.edit.containers',
  /** Publicar versiones a producción + gestionar environments. */
  publish: 'https://www.googleapis.com/auth/tagmanager.publish'
} as const

/** Scopes para operar Efeonce como definimos: escribir + publicar. */
export const GTM_WRITE_PUBLISH_SCOPES: string[] = [GTM_SCOPES.editContainers, GTM_SCOPES.publish]

/** Proveedor de access token. Efeonce lo resuelve por SA; clientes por OAuth per-org. */
export interface GtmTokenProvider {
  getAccessToken(): Promise<string>
}

export interface GtmAccount {
  /** ID numérico de la cuenta GTM (p.ej. "6001234567"). */
  accountId: string
  /** Nombre visible de la cuenta. */
  name: string
  /** Resource path canónico: `accounts/{accountId}`. */
  path: string
}

export interface GtmContainer {
  accountId: string
  containerId: string
  name: string
  /** Public ID visible en el snippet (p.ej. "GTM-XXXXXX"). */
  publicId: string
  /** Contextos: `web`, `amp`, `androidSdk5`, `iosSdk5`, `server`. */
  usageContext: string[]
  /** Resource path canónico: `accounts/{accountId}/containers/{containerId}`. */
  path: string
}

export interface GtmWorkspace {
  accountId: string
  containerId: string
  workspaceId: string
  name: string
  path: string
}

export interface GtmTag {
  tagId: string
  name: string
  /** Tipo del tag (p.ej. "gaawe" = GA4 event, "html" = custom HTML). */
  type: string
  path: string
}

/** Resultado de crear una versión desde un workspace (paso previo a publicar). */
export interface GtmVersionCreation {
  containerVersionId: string | null
  /** `true` si el compilador de GTM reportó error al crear la versión. */
  compilerError: boolean
}
