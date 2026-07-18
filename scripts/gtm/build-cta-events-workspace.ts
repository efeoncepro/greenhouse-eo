/**
 * TASK-1340 — Build gobernado de la familia `greenhouse_cta_*` en GTM-NGHPGRLZ.
 *
 * Crea en un WORKSPACE descartable (no toca el sitio): 7 DLVs + 6 triggers CE +
 * 6 GA4 Event tags (shapes verificados doc 05; `measurementIdOverride` =
 * G-KYPPY57M14). Con `--publish` compila (quick_preview, assert
 * compilerError=false) → create_version → publish. Sin el flag, se detiene tras
 * el preview (propose→confirm→execute: el publish es la única mutación live).
 *
 * Spec: TRACKING-PLAN §CTAs (fila ai-visibility-report-followup). Regla doc 04:
 * identidad por parámetro (cta_id/cta_slug/cta_location…), ningún click es key
 * event; la conversión sigue siendo `generate_lead` del form (sin doble conteo).
 *
 * Uso: npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/gtm/build-cta-events-workspace.ts [--publish]
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

const CTA_EVENTS = [
  'greenhouse_cta_viewed',
  'greenhouse_cta_clicked',
  'greenhouse_cta_dismissed',
  'greenhouse_cta_form_opened',
  'greenhouse_cta_form_submitted',
  'greenhouse_cta_error',
] as const

const CTA_PARAMS = ['cta_id', 'cta_slug', 'cta_location', 'placement', 'variant_id', 'form_slug', 'campaign_slug'] as const

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
  const reusable = existingWorkspaces.find(ws => ws.name?.startsWith('task-1340-cta-events'))

  const workspace = reusable
    ? { workspaceId: reusable.workspaceId, name: reusable.name ?? '', path: '' }
    : await client.createWorkspace(ACCOUNT_ID, CONTAINER_ID, {
        name: `task-1340-cta-events-${Date.now()}`.slice(0, 60),
        description: 'TASK-1340 — familia greenhouse_cta_* (renderer CTA) → GA4. Spec: TRACKING-PLAN §CTAs.',
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
  const existingTags = new Set((await rawList('tags')).map(t => String(t.name)))

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

    if (existingTags.has(`GA4 event - ${eventName}`)) {
      console.log(`tag: GA4 event - ${eventName} [ya existe]`)
      continue
    }

    const tag = await client.createTag(ACCOUNT_ID, CONTAINER_ID, workspace.workspaceId, {
      name: `GA4 event - ${eventName}`,
      type: 'gaawe',
      parameter: [
        { type: 'boolean', key: 'sendEcommerceData', value: 'false' },
        { type: 'template', key: 'eventName', value: eventName },
        { type: 'template', key: 'measurementIdOverride', value: MEASUREMENT_ID },
        {
          type: 'list',
          key: 'eventSettingsTable',
          list: CTA_PARAMS.map(param => ({
            type: 'map',
            map: [
              { type: 'template', key: 'parameter', value: param },
              { type: 'template', key: 'parameterValue', value: `{{DLV - ${param}}}` },
            ],
          })),
        },
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
    name: 'TASK-1340 greenhouse_cta_* events',
    notes: 'Familia greenhouse_cta_* del renderer CTA → GA4 (6 tags + 6 triggers + 7 DLVs). TRACKING-PLAN §CTAs.',
  })

  if (!version.containerVersionId || version.compilerError) {
    console.error('ABORT: create_version falló o compilerError.')
    process.exit(1)
  }

  console.log(`versión creada: ${version.containerVersionId}`)

  await client.publishVersion(ACCOUNT_ID, CONTAINER_ID, version.containerVersionId)
  console.log(`PUBLICADO: versión ${version.containerVersionId} live en GTM-NGHPGRLZ.`)
  process.exit(0)
}

main().catch(error => {
  console.error('BUILD FAILED:', error instanceof Error ? error.message : error)
  process.exit(1)
})
