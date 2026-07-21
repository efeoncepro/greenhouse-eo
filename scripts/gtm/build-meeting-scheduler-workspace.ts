/**
 * TASK-1510 — Build gobernado del scheduler nativo en GTM-NGHPGRLZ.
 *
 * Crea o reutiliza un workspace descartable y construye exclusivamente borradores:
 * 10 DLVs, 2 custom-event triggers y 2 tags GA4. Verifica por GA4 Admin API
 * que el Measurement ID pertenece a la propiedad canónica, lee de vuelta todos
 * los recursos y ejecuta quick_preview. Este script deliberadamente NO solicita
 * scope publish y no contiene rutas para create_version/publish.
 *
 * Uso:
 *   pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs \
 *     scripts/gtm/build-meeting-scheduler-workspace.ts
 */
import { GoogleAuth, Impersonated } from 'google-auth-library'

import { GtmApiClient } from '../../src/lib/growth/gtm/api-client'

const SERVICE_ACCOUNT = 'greenhouse-gtm-publisher@efeonce-group.iam.gserviceaccount.com'
const ACCOUNT_ID = '6291647045'
const CONTAINER_ID = '218104216'
const PROPERTY_ID = '486264460'
const MEASUREMENT_ID = 'G-KYPPY57M14'
const WORKSPACE_PREFIX = 'task-1510-native-meeting-scheduler'

const SCOPES = [
  'https://www.googleapis.com/auth/tagmanager.edit.containers',
  'https://www.googleapis.com/auth/tagmanager.edit.containerversions',
  'https://www.googleapis.com/auth/analytics.readonly',
]

const FUNNEL_EVENT = 'gh_meeting_step_reached'
const CONFIRMATION_EVENT = 'gh_meeting_booking_confirmed'

const ALLOWED_PARAMS = [
  'meeting_step',
  'scheduler_key',
  'surface_id',
  'placement',
  'availability_state',
  'days_ahead_bucket',
  'time_of_day_bucket',
  'error_category',
  'presentation_variant',
  'activation_mode',
] as const

const STEP_TRIGGER_NAME = `CE - ${FUNNEL_EVENT}`
const CONFIRMATION_TRIGGER_NAME = `CE - ${CONFIRMATION_EVENT}`
const STEP_TAG_NAME = `GA4 event - ${FUNNEL_EVENT}`
const LEAD_TAG_NAME = 'GA4 event - meeting booking generate_lead'

type GtmResource = Record<string, unknown>
type GtmParameter = {
  type?: string
  key?: string
  value?: string
  list?: GtmParameter[]
  map?: GtmParameter[]
}

const fail = (message: string): never => {
  throw new Error(message)
}

const parameter = (resource: GtmResource, key: string): GtmParameter | undefined =>
  (resource.parameter as GtmParameter[] | undefined)?.find(item => item.key === key)

const eventParameterNames = (tag: GtmResource): string[] =>
  (parameter(tag, 'eventSettingsTable')?.list ?? []).map(item =>
    item.map?.find(entry => entry.key === 'parameter')?.value ?? '',
  )

const triggerEventName = (trigger: GtmResource): string | undefined => {
  const filters = trigger.customEventFilter as Array<{ parameter?: GtmParameter[] }> | undefined

  return filters?.[0]?.parameter?.find(item => item.key === 'arg1')?.value
}

const assertEqualSet = (actual: string[], expected: readonly string[], label: string): void => {
  const actualSorted = [...actual].sort()
  const expectedSorted = [...expected].sort()

  if (JSON.stringify(actualSorted) !== JSON.stringify(expectedSorted)) {
    fail(`${label}: esperado [${expectedSorted.join(', ')}], recibido [${actualSorted.join(', ')}]`)
  }
}

const main = async () => {
  const auth = new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] })
  const sourceClient = await auth.getClient()

  const impersonated = new Impersonated({
    sourceClient,
    targetPrincipal: SERVICE_ACCOUNT,
    targetScopes: SCOPES,
    lifetime: 600,
  })

  const accessToken = async (): Promise<string> => {
    const { token } = await impersonated.getAccessToken()

    return token ?? fail('No se pudo mintear un token impersonando el service account')
  }

  const client = new GtmApiClient({ getAccessToken: accessToken })

  const streamsResponse = await fetch(
    `https://analyticsadmin.googleapis.com/v1beta/properties/${PROPERTY_ID}/dataStreams`,
    { headers: { Authorization: `Bearer ${await accessToken()}` } },
  )

  if (!streamsResponse.ok) fail(`GA4 dataStreams.list falló (${streamsResponse.status})`)

  const streams = (await streamsResponse.json()) as {
    dataStreams?: Array<{
      type?: string
      displayName?: string
      webStreamData?: { measurementId?: string; defaultUri?: string }
    }>
  }

  const canonicalStream = streams.dataStreams?.find(stream =>
    stream.type === 'WEB_DATA_STREAM' && stream.webStreamData?.measurementId === MEASUREMENT_ID,
  )

  const verifiedStream = canonicalStream ??
    fail(`Measurement ID ${MEASUREMENT_ID} no pertenece a properties/${PROPERTY_ID}`)

  console.log(
    `ga4: ${PROPERTY_ID} -> ${MEASUREMENT_ID} (${verifiedStream.webStreamData?.defaultUri ?? verifiedStream.displayName ?? 'web'})`,
  )

  const workspaces = await client.listWorkspaces(ACCOUNT_ID, CONTAINER_ID)
  const reusable = workspaces.find(workspace => workspace.name?.startsWith(WORKSPACE_PREFIX))

  const workspace = reusable
    ? { workspaceId: reusable.workspaceId, name: reusable.name }
    : await client.createWorkspace(ACCOUNT_ID, CONTAINER_ID, {
        name: `${WORKSPACE_PREFIX}-${Date.now()}`.slice(0, 60),
        description: 'TASK-1510 — scheduler nativo: funnel custom + booking confirmado como generate_lead.',
      })

  console.log(`workspace: ${workspace.workspaceId} (${workspace.name})${reusable ? ' [reusado]' : ''}`)

  const listResources = async (kind: 'variables' | 'triggers' | 'tags'): Promise<GtmResource[]> => {
    const response = await fetch(
      `https://www.googleapis.com/tagmanager/v2/accounts/${ACCOUNT_ID}/containers/${CONTAINER_ID}/workspaces/${workspace.workspaceId}/${kind}`,
      { headers: { Authorization: `Bearer ${await accessToken()}` } },
    )

    if (!response.ok) fail(`GTM list ${kind} falló (${response.status})`)

    const body = (await response.json()) as Record<string, unknown>
    const key = kind === 'variables' ? 'variable' : kind === 'triggers' ? 'trigger' : 'tag'

    return (body[key] as GtmResource[] | undefined) ?? []
  }

  let variables = await listResources('variables')

  for (const name of ALLOWED_PARAMS) {
    const resourceName = `DLV - ${name}`

    if (!variables.some(variable => variable.name === resourceName)) {
      await client.createVariable(ACCOUNT_ID, CONTAINER_ID, workspace.workspaceId, {
        name: resourceName,
        type: 'v',
        parameter: [
          { type: 'integer', key: 'dataLayerVersion', value: '2' },
          { type: 'boolean', key: 'setDefaultValue', value: 'false' },
          { type: 'template', key: 'name', value: name },
        ],
      })
      console.log(`variable: ${resourceName} [creada]`)
    } else {
      console.log(`variable: ${resourceName} [reusada]`)
    }
  }

  let triggers = await listResources('triggers')

  const ensureTrigger = async (name: string, eventName: string): Promise<string> => {
    const existing = triggers.find(trigger => trigger.name === name)

    if (existing) return String(existing.triggerId ?? fail(`${name}: falta triggerId`))

    const created = await client.createTrigger(ACCOUNT_ID, CONTAINER_ID, workspace.workspaceId, {
      name,
      type: 'customEvent',
      customEventFilter: [{
        type: 'equals',
        parameter: [
          { type: 'template', key: 'arg0', value: '{{_event}}' },
          { type: 'template', key: 'arg1', value: eventName },
        ],
      }],
    })

    console.log(`trigger: ${name} (${created.triggerId}) [creado]`)

    return created.triggerId
  }

  const stepTriggerId = await ensureTrigger(STEP_TRIGGER_NAME, FUNNEL_EVENT)
  const confirmationTriggerId = await ensureTrigger(CONFIRMATION_TRIGGER_NAME, CONFIRMATION_EVENT)
  let tags = await listResources('tags')

  const settings = ALLOWED_PARAMS.map(name => ({
    type: 'map',
    map: [
      { type: 'template', key: 'parameter', value: name },
      { type: 'template', key: 'parameterValue', value: `{{DLV - ${name}}}` },
    ],
  }))

  const updateTag = async (tag: GtmResource, payload: GtmResource): Promise<void> => {
    const path = typeof tag.path === 'string' ? tag.path : fail(`${String(tag.name)}: falta path para actualizar`)

    const response = await fetch(`https://www.googleapis.com/tagmanager/v2/${path}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${await accessToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...payload, fingerprint: tag.fingerprint }),
    })

    if (!response.ok) fail(`${String(tag.name)}: update falló (${response.status})`)
  }

  const stepTagPayload: GtmResource = {
    name: STEP_TAG_NAME,
    type: 'gaawe',
    parameter: [
      { type: 'boolean', key: 'sendEcommerceData', value: 'false' },
      { type: 'template', key: 'eventName', value: FUNNEL_EVENT },
      { type: 'template', key: 'measurementIdOverride', value: MEASUREMENT_ID },
      { type: 'list', key: 'eventSettingsTable', list: settings },
    ],
    firingTriggerId: [stepTriggerId],
  }

  const leadTagPayload: GtmResource = {
    name: LEAD_TAG_NAME,
    type: 'gaawe',
    parameter: [
      { type: 'boolean', key: 'sendEcommerceData', value: 'false' },
      { type: 'template', key: 'eventName', value: 'generate_lead' },
      { type: 'template', key: 'measurementIdOverride', value: MEASUREMENT_ID },
      {
        type: 'list',
        key: 'eventSettingsTable',
        list: [
          ...settings,
          {
            type: 'map',
            map: [
              { type: 'template', key: 'parameter', value: 'lead_source' },
              { type: 'template', key: 'parameterValue', value: 'meeting_booking' },
            ],
          },
        ],
      },
    ],
    firingTriggerId: [confirmationTriggerId],
  }

  const existingStepTag = tags.find(tag => tag.name === STEP_TAG_NAME)

  if (!existingStepTag) {
    await client.createTag(ACCOUNT_ID, CONTAINER_ID, workspace.workspaceId, stepTagPayload)
    console.log(`tag: ${STEP_TAG_NAME} [creado]`)
  } else if (JSON.stringify([...eventParameterNames(existingStepTag)].sort()) !== JSON.stringify([...ALLOWED_PARAMS].sort())) {
    await updateTag(existingStepTag, stepTagPayload)
    console.log(`tag: ${STEP_TAG_NAME} [actualizado]`)
  }

  const existingLeadTag = tags.find(tag => tag.name === LEAD_TAG_NAME)

  if (!existingLeadTag) {
    await client.createTag(ACCOUNT_ID, CONTAINER_ID, workspace.workspaceId, leadTagPayload)
    console.log(`tag: ${LEAD_TAG_NAME} [creado]`)
  } else if (JSON.stringify([...eventParameterNames(existingLeadTag)].sort()) !== JSON.stringify([...ALLOWED_PARAMS, 'lead_source'].sort())) {
    await updateTag(existingLeadTag, leadTagPayload)
    console.log(`tag: ${LEAD_TAG_NAME} [actualizado]`)
  }

  variables = await listResources('variables')
  triggers = await listResources('triggers')
  tags = await listResources('tags')

  for (const name of ALLOWED_PARAMS) {
    const variable = variables.find(item => item.name === `DLV - ${name}`) ?? fail(`Falta DLV - ${name}`)

    if (variable.type !== 'v' || parameter(variable, 'name')?.value !== name) {
      fail(`DLV - ${name}: shape inesperado`)
    }
  }

  const stepTrigger = triggers.find(item => item.name === STEP_TRIGGER_NAME) ?? fail(`Falta ${STEP_TRIGGER_NAME}`)
  const confirmationTrigger = triggers.find(item => item.name === CONFIRMATION_TRIGGER_NAME) ?? fail(`Falta ${CONFIRMATION_TRIGGER_NAME}`)

  if (triggerEventName(stepTrigger) !== FUNNEL_EVENT) fail(`${STEP_TRIGGER_NAME}: evento incorrecto`)
  if (triggerEventName(confirmationTrigger) !== CONFIRMATION_EVENT) fail(`${CONFIRMATION_TRIGGER_NAME}: evento incorrecto`)

  if (stepTrigger.type !== 'customEvent' || confirmationTrigger.type !== 'customEvent') {
    fail('Los triggers del scheduler deben ser customEvent')
  }

  const stepTag = tags.find(item => item.name === STEP_TAG_NAME) ?? fail(`Falta ${STEP_TAG_NAME}`)
  const leadTag = tags.find(item => item.name === LEAD_TAG_NAME) ?? fail(`Falta ${LEAD_TAG_NAME}`)

  if (stepTag.type !== 'gaawe' || parameter(stepTag, 'eventName')?.value !== FUNNEL_EVENT) {
    fail(`${STEP_TAG_NAME}: shape/eventName incorrecto`)
  }

  if (leadTag.type !== 'gaawe' || parameter(leadTag, 'eventName')?.value !== 'generate_lead') {
    fail(`${LEAD_TAG_NAME}: debe emitir exclusivamente generate_lead`)
  }

  if (parameter(stepTag, 'measurementIdOverride')?.value !== MEASUREMENT_ID ||
      parameter(leadTag, 'measurementIdOverride')?.value !== MEASUREMENT_ID) {
    fail('Los tags no apuntan al Measurement ID canónico')
  }

  assertEqualSet(
    (stepTag.firingTriggerId as string[] | undefined) ?? [],
    [String(stepTrigger.triggerId)],
    `${STEP_TAG_NAME} firingTriggerId`,
  )
  assertEqualSet(
    (leadTag.firingTriggerId as string[] | undefined) ?? [],
    [String(confirmationTrigger.triggerId)],
    `${LEAD_TAG_NAME} firingTriggerId`,
  )

  assertEqualSet(eventParameterNames(stepTag), ALLOWED_PARAMS, `${STEP_TAG_NAME} parámetros`)
  assertEqualSet(eventParameterNames(leadTag), [...ALLOWED_PARAMS, 'lead_source'], `${LEAD_TAG_NAME} parámetros`)

  const leadSource = parameter(leadTag, 'eventSettingsTable')?.list?.find(item =>
    item.map?.find(entry => entry.key === 'parameter')?.value === 'lead_source',
  )?.map?.find(entry => entry.key === 'parameterValue')?.value

  if (leadSource !== 'meeting_booking') fail(`${LEAD_TAG_NAME}: lead_source incorrecto`)

  if (tags.some(tag => parameter(tag, 'eventName')?.value === CONFIRMATION_EVENT)) {
    fail(`Prohibido reenviar ${CONFIRMATION_EVENT} como evento GA4`)
  }

  const preview = await client.quickPreview(ACCOUNT_ID, CONTAINER_ID, workspace.workspaceId)

  console.log(`readback: ${ALLOWED_PARAMS.length} DLVs + 2 triggers + 2 tags [válido]`)
  console.log(`quick_preview: compilerError=${preview.compilerError} syncOk=${preview.syncStatusOk}`)

  if (preview.compilerError || !preview.syncStatusOk) {
    fail('El workspace no compila limpio; no versionar ni publicar')
  }

  console.log('Workspace listo para revisión humana. No se creó versión y no se publicó.')
}

main().catch(error => {
  console.error('BUILD FAILED:', error instanceof Error ? error.message : error)
  process.exit(1)
})
