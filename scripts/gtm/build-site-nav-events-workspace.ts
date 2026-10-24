/**
 * TASK-2042 — Build gobernado de los eventos del menú global de efeoncepro.com (`gh_site_nav_*`) en GTM-NGHPGRLZ.
 *
 * Crea en un WORKSPACE descartable (no toca el sitio): DLVs `panel` y `line` (los `target*` ya existen desde
 * TASK-2043) + 3 triggers CE + 3 GA4 Event tags (shapes del doc 05; `measurementIdOverride` = G-KYPPY57M14). Con
 * `--publish` compila (quick_preview, assert compilerError=false) → create_version → publish → snapshot. Sin el flag
 * se detiene tras el preview (propose→confirm→execute: el publish es la única mutación live).
 *
 * Los empuja `ohio-child/assets/js/site-nav-host.js`: `gh_site_nav_opened` (`panel`), `gh_site_nav_line_viewed`
 * (`line`) y `gh_site_nav_clicked` (`target_type`, `target`, `target_label`, `target_url`; el CTA llega con
 * `target_type: cta` y `target: menu_header|menu_mega|menu_onepage`). Un tag que ya existe con otros parámetros se
 * actualiza en el workspace (PUT con su fingerprint), así una corrida nueva lleva el container al mapa de arriba. Ninguno es key event: el agendador mide por `greenhouse_cta_*` con
 * `cta_location: site_nav` y la conversión es `generate_lead`. Spec: TRACKING-PLAN fila `site-nav-discovery-meeting`.
 *
 * Uso: npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/gtm/build-site-nav-events-workspace.ts [--publish]
 */
import { GoogleAuth, Impersonated } from 'google-auth-library'

import { GtmApiClient } from '../../src/lib/growth/gtm/api-client'

const SA = 'greenhouse-gtm-publisher@efeonce-group.iam.gserviceaccount.com'
const ACCOUNT_ID = '6291647045'
const CONTAINER_ID = '218104216'
const MEASUREMENT_ID = 'G-KYPPY57M14'

const SCOPES = [
  'https://www.googleapis.com/auth/tagmanager.edit.containers',
  'https://www.googleapis.com/auth/tagmanager.edit.containerversions',
  'https://www.googleapis.com/auth/tagmanager.publish',
]

// Cada evento lleva sólo sus parámetros: un parámetro ausente no se envía vacío a GA4.
const EVENT_PARAMS: Record<string, readonly string[]> = {
  gh_site_nav_opened: ['panel'],
  gh_site_nav_line_viewed: ['line'],
  gh_site_nav_clicked: ['target_type', 'target', 'target_label', 'target_url'],
}

const CTA_EVENTS = Object.keys(EVENT_PARAMS)

const CTA_PARAMS = [...new Set(Object.values(EVENT_PARAMS).flat())]

const main = async () => {
  const publish = process.argv.includes('--publish')

  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] })
  const source = await auth.getClient()

  const impersonated = new Impersonated({
    sourceClient: source,
    targetPrincipal: SA,
    targetScopes: SCOPES,
    lifetime: 600,
  })

  const client = new GtmApiClient({
    async getAccessToken() {
      const { token } = await impersonated.getAccessToken()

      if (!token) throw new Error('sin token impersonado')

      return token
    },
  })

  // Reusar el workspace de un run previo (idempotencia) o crear uno nuevo.
  const existingWorkspaces = await client.listWorkspaces(ACCOUNT_ID, CONTAINER_ID)
  const reusable = existingWorkspaces.find(ws => ws.name?.startsWith('task-2042-site-nav'))

  const workspace = reusable
    ? { workspaceId: reusable.workspaceId, name: reusable.name ?? '', path: '' }
    : await client.createWorkspace(ACCOUNT_ID, CONTAINER_ID, {
        name: `task-2042-site-nav-${Date.now()}`.slice(0, 60),
        description: 'TASK-2042 — gh_site_nav_* (menú global) → GA4. Spec: TRACKING-PLAN fila site-nav-discovery-meeting.',
      })

  console.log(`workspace: ${workspace.workspaceId} (${workspace.name})${reusable ? ' [reusado]' : ''}`)

  // Inventario existente (el workspace hereda el container): crear solo lo que falta.
  const token = await client

  const rawList = async (kind: 'variables' | 'triggers' | 'tags'): Promise<Array<Record<string, unknown>>> => {
    const { token: accessToken } = await impersonated.getAccessToken()

    const res = await fetch(
      `https://www.googleapis.com/tagmanager/v2/accounts/${ACCOUNT_ID}/containers/${CONTAINER_ID}/workspaces/${workspace.workspaceId}/${kind}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )

    if (!res.ok) throw new Error(`list ${kind} failed (${res.status})`)
    const body = (await res.json()) as Record<string, unknown>

    return (body[kind === 'variables' ? 'variable' : kind === 'triggers' ? 'trigger' : 'tag'] as Array<Record<string, unknown>>) ?? []
  }

  void token
  const existingVariables = new Set((await rawList('variables')).map(v => String(v.name)))
  const existingTriggers = new Map((await rawList('triggers')).map(t => [String(t.name), String(t.triggerId)]))
  const existingTags = new Map((await rawList('tags')).map(t => [String(t.name), t]))

  for (const param of CTA_PARAMS) {
    if (existingVariables.has(`DLV - ${param}`)) {
      console.log(`variable: DLV - ${param} [ya existe]`)
      continue
    }

    const variable = await client.createVariable(ACCOUNT_ID, CONTAINER_ID, workspace.workspaceId, {
      name: `DLV - ${param}`,
      type: 'v',
      parameter: [
        { type: 'integer', key: 'dataLayerVersion', value: '2' },
        { type: 'boolean', key: 'setDefaultValue', value: 'false' },
        { type: 'template', key: 'name', value: param },
      ],
    })

    console.log(`variable: ${variable.name} (${variable.variableId})`)
  }

  for (const eventName of CTA_EVENTS) {
    let triggerId = existingTriggers.get(`CE - ${eventName}`)

    if (!triggerId) {
      const trigger = await client.createTrigger(ACCOUNT_ID, CONTAINER_ID, workspace.workspaceId, {
      name: `CE - ${eventName}`,
      type: 'customEvent',
      customEventFilter: [
        {
          type: 'equals',
          parameter: [
            { type: 'template', key: 'arg0', value: '{{_event}}' },
            { type: 'template', key: 'arg1', value: eventName },
          ],
        },
      ],
      })

      triggerId = trigger.triggerId
    }

    const eventSettingsTable = {
      type: 'list',
      key: 'eventSettingsTable',
      list: EVENT_PARAMS[eventName].map(param => ({
        type: 'map',
        map: [
          { type: 'template', key: 'parameter', value: param },
          { type: 'template', key: 'parameterValue', value: `{{DLV - ${param}}}` },
        ],
      })),
    }

    const existingTag = existingTags.get(`GA4 event - ${eventName}`) as
      | { tagId: string; parameter: Array<{ key: string }> }
      | undefined

    if (existingTag) {
      const current = existingTag.parameter.find(param => param.key === 'eventSettingsTable')

      if (JSON.stringify(current) === JSON.stringify(eventSettingsTable)) {
        console.log(`tag: GA4 event - ${eventName} [ya existe]`)
        continue
      }

      const { token: accessToken } = await impersonated.getAccessToken()

      const res = await fetch(
        `https://www.googleapis.com/tagmanager/v2/accounts/${ACCOUNT_ID}/containers/${CONTAINER_ID}/workspaces/${workspace.workspaceId}/tags/${existingTag.tagId}`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...existingTag,
            parameter: [...existingTag.parameter.filter(param => param.key !== 'eventSettingsTable'), eventSettingsTable],
          }),
        },
      )

      if (!res.ok) throw new Error(`update tag ${eventName} failed (${res.status})`)
      console.log(`tag: GA4 event - ${eventName} [actualizado: ${EVENT_PARAMS[eventName].join(', ')}]`)
      continue
    }

    const tag = await client.createTag(ACCOUNT_ID, CONTAINER_ID, workspace.workspaceId, {
      name: `GA4 event - ${eventName}`,
      type: 'gaawe',
      parameter: [
        { type: 'boolean', key: 'sendEcommerceData', value: 'false' },
        { type: 'template', key: 'eventName', value: eventName },
        { type: 'template', key: 'measurementIdOverride', value: MEASUREMENT_ID },
        eventSettingsTable,
      ],
      firingTriggerId: [triggerId],
    })

    console.log(`trigger+tag: ${eventName} (trigger ${triggerId}, tag ${tag.tagId})`)
  }

  const preview = await client.quickPreview(ACCOUNT_ID, CONTAINER_ID, workspace.workspaceId)

  console.log(`quick_preview: compilerError=${preview.compilerError} syncOk=${preview.syncStatusOk}`)

  if (preview.compilerError || !preview.syncStatusOk) {
    console.error('ABORT: el workspace no compila limpio — NO versionar.')
    process.exit(1)
  }

  if (!publish) {
    console.log('Workspace listo (sin publicar). Re-ejecutar con --publish para versión+publish.')
    process.exit(0)
  }

  const version = await client.createVersion(ACCOUNT_ID, CONTAINER_ID, workspace.workspaceId, {
    name: 'TASK-2042 gh_site_nav_* events (label + url)',
    notes: 'Menú global → GA4: gh_site_nav_clicked suma target_label y target_url (DLVs del dock). TRACKING-PLAN fila site-nav-discovery-meeting.',
  })

  if (!version.containerVersionId || version.compilerError) {
    console.error('ABORT: create_version falló o compilerError.')
    process.exit(1)
  }

  console.log(`versión creada: ${version.containerVersionId}`)

  await client.publishVersion(ACCOUNT_ID, CONTAINER_ID, version.containerVersionId)
  console.log(`PUBLICADO: versión ${version.containerVersionId} live en GTM-NGHPGRLZ.`)

  // Publicar sin dejar el snapshot al día es exactamente el drift que vigila `gtm-drift.yml`:
  // se escribe aquí mismo y queda para commitear junto con este cambio.
  const { writeLiveSnapshots } = await import('./snapshot')

  await writeLiveSnapshots()
  console.log('Snapshots GTM actualizados: commitea docs/reference/measurement-gtm-ga4/*-snapshot.json.')
  process.exit(0)
}

main().catch(error => {
  console.error('BUILD FAILED:', error instanceof Error ? error.message : error)
  process.exit(1)
})
