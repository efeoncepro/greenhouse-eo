/**
 * Cliente REST de la Google Tag Manager API v2.
 *
 * `googleapis` NO es dep del repo, así que llamamos los endpoints REST con `fetch`
 * (mirror de `growth/search-console/api-client.ts`). El token lo entrega un
 * `GtmTokenProvider` inyectado — el MISMO cliente opera Efeonce (service account) y
 * clientes (OAuth per-org) sin ramificar.
 *
 * Errores se propagan tipados (`GtmApiError`) con el status HTTP para que el caller
 * distinga 403 (sin permiso DENTRO de GTM — recordar: GTM ≠ IAM) de fallos transitorios.
 * El payload crudo de Google NUNCA se devuelve al cliente: el caller lo sanitiza.
 */

import 'server-only'

import { createGoogleAuth } from '@/lib/google-credentials'

import {
  GTM_API_BASE,
  type GtmAccount,
  type GtmContainer,
  type GtmTag,
  type GtmTokenProvider,
  type GtmVersionCreation,
  type GtmWorkspace
} from './contracts'

export class GtmApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'GtmApiError'
    this.status = status
  }
}

/**
 * Token provider para el contenedor de Efeonce: resuelve el access token vía el
 * resolver canónico de credenciales Google (WIF en Vercel, SA key, o ADC local).
 * Recordá: el service account debe estar agregado como usuario DENTRO de GTM.
 */
export const efeonceGtmTokenProvider = (scopes: string[]): GtmTokenProvider => ({
  async getAccessToken() {
    const auth = createGoogleAuth({ scopes })
    const client = await auth.getClient()
    const { token } = await client.getAccessToken()

    if (!token) {
      throw new GtmApiError('No se pudo resolver un access token de Google para GTM', 401)
    }

    return token
  }
})

export class GtmApiClient {
  constructor(private readonly tokens: GtmTokenProvider) {}

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const token = await this.tokens.getAccessToken()
    const url = path.startsWith('http') ? path : `${GTM_API_BASE}/${path.replace(/^\/+/, '')}`

    const response = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers
      },
      cache: 'no-store'
    })

    if (!response.ok) {
      throw new GtmApiError(`GTM ${init?.method ?? 'GET'} ${path} failed (${response.status})`, response.status)
    }

    // 204 (p.ej. delete) no trae cuerpo.
    return (response.status === 204 ? undefined : await response.json()) as T
  }

  // ---- Lectura (inventario / verificación) ------------------------------------

  async listAccounts(): Promise<GtmAccount[]> {
    const body = await this.request<{
      account?: Array<{ accountId?: string; name?: string; path?: string }>
    }>('accounts')

    return (body.account ?? [])
      .filter((a): a is { accountId: string; name?: string; path?: string } => typeof a.accountId === 'string')
      .map(a => ({ accountId: a.accountId, name: a.name ?? '', path: a.path ?? `accounts/${a.accountId}` }))
  }

  async listContainers(accountId: string): Promise<GtmContainer[]> {
    const body = await this.request<{
      container?: Array<{
        accountId?: string
        containerId?: string
        name?: string
        publicId?: string
        usageContext?: string[]
        path?: string
      }>
    }>(`accounts/${accountId}/containers`)

    return (body.container ?? [])
      .filter(
        (c): c is { accountId: string; containerId: string; name?: string; publicId?: string; usageContext?: string[]; path?: string } =>
          typeof c.accountId === 'string' && typeof c.containerId === 'string'
      )
      .map(c => ({
        accountId: c.accountId,
        containerId: c.containerId,
        name: c.name ?? '',
        publicId: c.publicId ?? '',
        usageContext: c.usageContext ?? [],
        path: c.path ?? `accounts/${c.accountId}/containers/${c.containerId}`
      }))
  }

  async listWorkspaces(accountId: string, containerId: string): Promise<GtmWorkspace[]> {
    const body = await this.request<{
      workspace?: Array<{ accountId?: string; containerId?: string; workspaceId?: string; name?: string; path?: string }>
    }>(`accounts/${accountId}/containers/${containerId}/workspaces`)

    return (body.workspace ?? [])
      .filter((w): w is { accountId?: string; containerId?: string; workspaceId: string; name?: string; path?: string } => typeof w.workspaceId === 'string')
      .map(w => ({
        accountId,
        containerId,
        workspaceId: w.workspaceId,
        name: w.name ?? '',
        path: w.path ?? `accounts/${accountId}/containers/${containerId}/workspaces/${w.workspaceId}`
      }))
  }

  async listTags(accountId: string, containerId: string, workspaceId: string): Promise<GtmTag[]> {
    const body = await this.request<{
      tag?: Array<{ tagId?: string; name?: string; type?: string; path?: string }>
    }>(`accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/tags`)

    return (body.tag ?? [])
      .filter((t): t is { tagId: string; name?: string; type?: string; path?: string } => typeof t.tagId === 'string')
      .map(t => ({ tagId: t.tagId, name: t.name ?? '', type: t.type ?? '', path: t.path ?? '' }))
  }

  // ---- Escritura + publicación ------------------------------------------------
  // Estas operaciones cambian producción. Bajo la doctrina Full API Parity / acción
  // gobernada, un agente NUNCA las ejecuta directo: van detrás de propose→confirm→execute.

  /** Crea un tag en un workspace (borrador; no publica). Requiere scope edit.containers. */
  async createTag(
    accountId: string,
    containerId: string,
    workspaceId: string,
    tag: Record<string, unknown>
  ): Promise<GtmTag> {
    const body = await this.request<{ tagId?: string; name?: string; type?: string; path?: string }>(
      `accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/tags`,
      { method: 'POST', body: JSON.stringify(tag) }
    )

    return { tagId: body.tagId ?? '', name: body.name ?? '', type: body.type ?? '', path: body.path ?? '' }
  }

  /** Congela un workspace en una versión inmutable (paso previo a publicar). */
  async createVersion(
    accountId: string,
    containerId: string,
    workspaceId: string,
    options: { name?: string; notes?: string } = {}
  ): Promise<GtmVersionCreation> {
    const body = await this.request<{
      containerVersion?: { containerVersionId?: string }
      compilerError?: boolean
    }>(`accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}:create_version`, {
      method: 'POST',
      body: JSON.stringify({ name: options.name, notes: options.notes })
    })

    return {
      containerVersionId: body.containerVersion?.containerVersionId ?? null,
      compilerError: Boolean(body.compilerError)
    }
  }

  /** Publica una versión a producción. Requiere scope publish. */
  async publishVersion(accountId: string, containerId: string, versionId: string): Promise<void> {
    await this.request<unknown>(
      `accounts/${accountId}/containers/${containerId}/versions/${versionId}:publish`,
      { method: 'POST' }
    )
  }

  // ---- Build helpers (workspace-scoped, no publican) --------------------------
  // Orden canónico al construir un tag: createWorkspace → createVariable(s) →
  // createTrigger → createTag(firingTriggerId) → quickPreview (assert compilerError=false)
  // → createVersion → [confirmación humana] → publishVersion. Shapes: doc 05.

  /** Crea un workspace nuevo (feature-branch descartable). Requiere edit.containers. */
  async createWorkspace(
    accountId: string,
    containerId: string,
    options: { name: string; description?: string }
  ): Promise<{ workspaceId: string; path: string; name: string }> {
    const body = await this.request<{ workspaceId?: string; path?: string; name?: string }>(
      `accounts/${accountId}/containers/${containerId}/workspaces`,
      { method: 'POST', body: JSON.stringify(options) }
    )

    return { workspaceId: body.workspaceId ?? '', path: body.path ?? '', name: body.name ?? '' }
  }

  /** Crea una variable en un workspace (borrador). Requiere edit.containers. */
  async createVariable(
    accountId: string,
    containerId: string,
    workspaceId: string,
    variable: Record<string, unknown>
  ): Promise<{ variableId: string; name: string; type: string; path: string }> {
    const body = await this.request<{ variableId?: string; name?: string; type?: string; path?: string }>(
      `accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/variables`,
      { method: 'POST', body: JSON.stringify(variable) }
    )

    return { variableId: body.variableId ?? '', name: body.name ?? '', type: body.type ?? '', path: body.path ?? '' }
  }

  /** Crea un trigger en un workspace (borrador). Requiere edit.containers. */
  async createTrigger(
    accountId: string,
    containerId: string,
    workspaceId: string,
    trigger: Record<string, unknown>
  ): Promise<{ triggerId: string; name: string; type: string; path: string }> {
    const body = await this.request<{ triggerId?: string; name?: string; type?: string; path?: string }>(
      `accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}/triggers`,
      { method: 'POST', body: JSON.stringify(trigger) }
    )

    return { triggerId: body.triggerId ?? '', name: body.name ?? '', type: body.type ?? '', path: body.path ?? '' }
  }

  /**
   * Compila el workspace SIN versionar ni publicar. `compilerError=true` = NO versionar.
   * Requiere scope `edit.containerversions` (NO basta edit.containers — ver LEARNINGS §2).
   */
  async quickPreview(
    accountId: string,
    containerId: string,
    workspaceId: string
  ): Promise<{ compilerError: boolean; syncStatusOk: boolean }> {
    const body = await this.request<{
      compilerError?: boolean
      syncStatus?: { mergeConflict?: boolean; syncError?: boolean }
    }>(`accounts/${accountId}/containers/${containerId}/workspaces/${workspaceId}:quick_preview`, {
      method: 'POST',
      body: JSON.stringify({})
    })

    return {
      compilerError: Boolean(body.compilerError),
      syncStatusOk: !body.syncStatus?.mergeConflict && !body.syncStatus?.syncError
    }
  }

  /**
   * Versión LIVE del contenedor. Usar SIEMPRE post-publish para confirmar que no se cayó
   * nada (ver LEARNINGS §3). Devuelve los nombres de tags/triggers/variables live.
   */
  async getLiveVersion(
    accountId: string,
    containerId: string
  ): Promise<{ versionId: string; name: string; tagNames: string[]; triggerNames: string[]; variableNames: string[] }> {
    const body = await this.request<{
      containerVersionId?: string
      name?: string
      tag?: Array<{ name?: string }>
      trigger?: Array<{ name?: string }>
      variable?: Array<{ name?: string }>
    }>(`accounts/${accountId}/containers/${containerId}/versions:live`)

    return {
      versionId: body.containerVersionId ?? '',
      name: body.name ?? '',
      tagNames: (body.tag ?? []).map(t => t.name ?? ''),
      triggerNames: (body.trigger ?? []).map(t => t.name ?? ''),
      variableNames: (body.variable ?? []).map(v => v.name ?? '')
    }
  }
}

/** Fábrica para el contenedor de Efeonce (service account). */
export const createEfeonceGtmClient = (scopes: string[]): GtmApiClient =>
  new GtmApiClient(efeonceGtmTokenProvider(scopes))
