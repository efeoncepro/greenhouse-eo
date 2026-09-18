import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { InsightEditionRecord } from '../stores/records'

/**
 * TASK-1848 — envío por correo: normalización del payload autorizado, rollup honesto, gates del
 * command (flag, autoridad interna, edición emitida, portal_link no disponible, destinatarios fuera
 * de la org, idempotencia) y el despacho (claim, bearer sólo en memoria, aceptado/fallido/ambiguo,
 * tipo pausado, edición retirada). El SQL real se ejercita en `delivery.live.test.ts`.
 */

vi.mock('server-only', () => ({}))
vi.mock('@/lib/observability/capture', () => ({ captureWithDomain: vi.fn() }))

const stores = vi.hoisted(() => ({
  getInsightEditionById: vi.fn(),
  getInsightReportById: vi.fn(async () => ({ title: 'Informe mensual' }))
}))

const delivery = vi.hoisted(() => ({
  resolveInsightDeliveryRecipients: vi.fn(),
  insertInsightDeliveryIntent: vi.fn(),
  findInsightDeliveryIntentByKey: vi.fn(async (): Promise<unknown> => null),
  getInsightDeliveryIntent: vi.fn(),
  listInsightDeliveryIntentsForEdition: vi.fn(async () => []),
  setInsightDeliveryIntentState: vi.fn(async () => undefined),
  insertInsightDeliveryRecipient: vi.fn(),
  listInsightDeliveryRecipients: vi.fn(async (): Promise<unknown[]> => []),
  claimInsightDeliveryRecipient: vi.fn(),
  finishInsightDeliveryRecipient: vi.fn(async () => null),
  cancelPendingInsightDeliveryRecipients: vi.fn(async () => []),
  insertInsightDeliveryEvent: vi.fn(async () => undefined),
  readInsightDeliveryTransport: vi.fn(async () => new Map()),
  readInsightDeliveryTransportForAttempt: vi.fn(async (): Promise<unknown> => null),
  requeueFailedInsightDeliveryRecipients: vi.fn(async () => []),
  getInsightDeliveryRecipient: vi.fn(),
  deriveInsightDeliveryTransportStatus: vi.fn(() => 'not_sent'),
  countAmbiguousInsightDeliveries: vi.fn()
}))

const sharing = vi.hoisted(() => ({
  insertInsightShareGrant: vi.fn(async () => ({ shareGrantId: 'ishr-9', editionId: 'insed-1', organizationId: 'org-a', expiresAt: '2026-10-18T12:00:00.000Z', downloadOutputs: [] })),
  revokeInsightShareGrant: vi.fn(async () => ({ shareGrantId: 'ishr-9' })),
  readInsightOrganizationName: vi.fn(async () => 'Berel')
}))

const email = vi.hoisted(() => ({
  claimTokenSensitiveEmailIntent: vi.fn(),
  sendEmail: vi.fn()
}))

const renderStore = vi.hoisted(() => ({ findInsightOutputsForEdition: vi.fn(async () => [{ output: 'deck_pdf', state: 'completed', outputAssetId: 'asset-1' }]) }))

vi.mock('../stores/edition-store', () => ({ getInsightEditionById: stores.getInsightEditionById }))
vi.mock('../stores/report-store', () => ({ getInsightReportById: stores.getInsightReportById }))
vi.mock('./store', () => delivery)
vi.mock('../sharing/store', () => sharing)
vi.mock('../render/store', () => renderStore)
vi.mock('@/lib/email/delivery', () => email)
vi.mock('@/lib/storage/greenhouse-assets', () => ({ downloadPrivateAsset: vi.fn(async () => ({ file: { arrayBuffer: new ArrayBuffer(8), contentType: 'application/pdf' } })) }))

const infra = vi.hoisted(() => ({ withTx: vi.fn(async (fn: (client: unknown) => Promise<unknown>) => fn({ query: vi.fn() })), pgQuery: vi.fn(), publish: vi.fn(async () => 'outbox-1') }))

vi.mock('@/lib/postgres/client', () => ({ withGreenhousePostgresTransaction: infra.withTx, runGreenhousePostgresQuery: infra.pgQuery }))
vi.mock('@/lib/sync/publish-event', () => ({ publishOutboxEvent: infra.publish }))

const ENV_ON = { INSIGHTS_DELIVERY_ENABLED: 'true' } as unknown as NodeJS.ProcessEnv
const internalSubject = { userId: 'user-int', tenantType: 'efeonce_internal' as const, roleCodes: ['efeonce_account'], primaryRoleCode: 'efeonce_account', routeGroups: ['internal'], authorizedViews: [], memberId: 'mem-1' }
const opsSubject = { ...internalSubject, userId: 'user-ops', roleCodes: ['efeonce_operations'], primaryRoleCode: 'efeonce_operations' }
const executiveSubject = { userId: 'user-exec', tenantType: 'client' as const, roleCodes: ['client_executive'], primaryRoleCode: 'client_executive', routeGroups: ['client'], authorizedViews: [] }

const edition = (overrides: Partial<InsightEditionRecord> = {}): InsightEditionRecord =>
  ({
    editionId: 'insed-1', reportId: 'insr-1', organizationId: 'org-a', version: 1, audience: 'client', state: 'issued', failedPhase: null,
    request: { requestVersion: 'insight_request_v1', organizationId: 'org-a', modules: ['seo'], period: { start: '2026-08-01', endExclusive: '2026-09-01', timeZone: 'America/Santiago' }, comparison: { kind: 'none' }, audience: 'client', locale: 'es-CL', depth: 'standard', outputs: ['deck_pdf'], brand: { efeoncePackVersion: 'axis-current', clientBrandRef: null }, projectIds: [] },
    requestHash: 'h'.repeat(64), idempotencyKey: 'k', modules: ['seo'], outputs: ['deck_pdf'], periodTimeZone: 'America/Santiago', periodStartUtc: 'x', periodEndUtc: 'y',
    supersedesEditionId: null, reviewOwnerUserId: null, issuedAt: '2026-09-10T12:00:00.000Z', issuedByUserId: 'user-int', issuedHash: 'i'.repeat(64), withdrawnAt: null, createdByActorKind: 'member', createdByUserId: 'user-int', createdByMemberId: 'mem-1', createdAt: 'c', updatedAt: 'u', ...overrides
  }) as InsightEditionRecord

const moduleAssigned = () => infra.pgQuery.mockImplementation(async (sql: string) => (sql.includes('module_assignments') ? [{ status: 'active' }] : []))

const body = (overrides: Record<string, unknown> = {}) => ({
  modality: 'share_link', recipientUserIds: ['user-cli-1'], outputs: ['deck_pdf'], subject: 'Tu informe de agosto está listo', idempotencyKey: 'delivery-key-0001', ...overrides
})

const intentRecord = (overrides: Record<string, unknown> = {}) => ({
  deliveryIntentId: 'idlv-1', organizationId: 'org-a', editionId: 'insed-1', editionIssuedHash: 'i'.repeat(64), modality: 'share_link', outputs: ['deck_pdf'],
  subject: 'Tu informe de agosto está listo', message: null, shareTtlDays: 30, attachmentIrrevocableAck: false, idempotencyKey: 'delivery-key-0001',
  requestHash: 'r'.repeat(64), state: 'pending', authorizedByActorKind: 'member', authorizedByUserId: 'user-int', cancelledAt: null, cancelReason: null, createdAt: 'c', updatedAt: 'u', ...overrides
})

const recipientRecord = (overrides: Record<string, unknown> = {}) => ({
  deliveryRecipientId: 'idlr-00000000-0000-4000-8000-000000000001', deliveryIntentId: 'idlv-1', organizationId: 'org-a', editionId: 'insed-1', recipientKey: 'cliente@berel.com',
  recipientKind: 'client_user', recipientUserId: 'user-cli-1', state: 'pending', skipReason: null, attempts: 0, emailDeliveryId: null, shareGrantId: null,
  lastErrorCode: null, claimedAt: null, finishedAt: null, createdAt: 'c', ...overrides
})

describe('normalizeInsightDeliveryRequest', () => {
  it('exige modalidad, 1..50 personas, asunto, key; adjunto exige outputs y aceptación de irrevocabilidad', async () => {
    const { normalizeInsightDeliveryRequest } = await import('./commands')

    expect(() => normalizeInsightDeliveryRequest(body({ modality: 'fax' }))).toThrow(/modality/)
    expect(() => normalizeInsightDeliveryRequest(body({ recipientUserIds: [] }))).toThrow(/recipientUserIds/)
    expect(() => normalizeInsightDeliveryRequest(body({ subject: 'x' }))).toThrow(/subject/)
    expect(() => normalizeInsightDeliveryRequest(body({ outputs: ['web'] }))).toThrow(/outputs/)
    expect(() => normalizeInsightDeliveryRequest(body({ modality: 'attachment' }))).toThrow(/irrevocable/)
    expect(() => normalizeInsightDeliveryRequest(body({ modality: 'attachment', outputs: [], acknowledgeIrrevocableAttachment: true }))).toThrow(/al menos un output/)
    expect(normalizeInsightDeliveryRequest(body({ recipientUserIds: ['b', 'a', 'a'] }))).toMatchObject({ recipientUserIds: ['a', 'b'], shareTtlDays: 30 })
  })
})

describe('rollupInsightDeliveryIntentState', () => {
  it('ambiguo mantiene vivo; un aceptado no convierte fallidos en entregados', async () => {
    const { rollupInsightDeliveryIntentState } = await import('./contracts')

    expect(rollupInsightDeliveryIntentState(['accepted', 'ambiguous'], 'dispatching')).toBe('dispatching')
    expect(rollupInsightDeliveryIntentState(['accepted', 'failed'], 'dispatching')).toBe('partially_failed')
    expect(rollupInsightDeliveryIntentState(['failed', 'skipped'], 'dispatching')).toBe('failed')
    expect(rollupInsightDeliveryIntentState(['accepted', 'skipped'], 'dispatching')).toBe('completed')
    expect(rollupInsightDeliveryIntentState(['accepted'], 'cancelled')).toBe('cancelled')
  })

  it('correlación por intento: el primero usa el id; los reintentos, un sufijo propio', async () => {
    const { insightDeliverySourceEventId } = await import('./contracts')

    expect(insightDeliverySourceEventId('idlr-x', 1)).toBe('idlr-x')
    expect(insightDeliverySourceEventId('idlr-x', 3)).toBe('idlr-x:a3')
  })
})

describe('requestInsightDelivery', () => {
  const scope = { subject: internalSubject, actorOrganizationId: null, organizationId: 'org-a', editionId: 'insed-1', env: ENV_ON }

  beforeEach(() => {
    vi.clearAllMocks()
    moduleAssigned()
    stores.getInsightEditionById.mockResolvedValue(edition())
    delivery.findInsightDeliveryIntentByKey.mockResolvedValue(null)
    delivery.resolveInsightDeliveryRecipients.mockResolvedValue([{ userId: 'user-cli-1', email: 'cliente@berel.com', fullName: 'Cliente Berel', kind: 'client_user', locale: 'es-CL', undeliverable: false }])
    delivery.insertInsightDeliveryIntent.mockResolvedValue(intentRecord())
    delivery.insertInsightDeliveryRecipient.mockResolvedValue(recipientRecord())
  })

  it('flag OFF ⇒ delivery_disabled; cliente ⇒ forbidden; operations ⇒ forbidden', async () => {
    const { requestInsightDelivery } = await import('./commands')

    await expect(requestInsightDelivery({ ...scope, body: body(), env: {} as NodeJS.ProcessEnv })).rejects.toMatchObject({ code: 'delivery_disabled' })
    await expect(requestInsightDelivery({ ...scope, subject: executiveSubject, actorOrganizationId: 'org-a', body: body() })).rejects.toMatchObject({ code: 'forbidden' })
    await expect(requestInsightDelivery({ ...scope, subject: opsSubject, body: body() })).rejects.toMatchObject({ code: 'forbidden' })
  })

  it('sólo ediciones emitidas de audiencia cliente; portal_link no disponible todavía', async () => {
    const { requestInsightDelivery } = await import('./commands')

    stores.getInsightEditionById.mockResolvedValue(edition({ state: 'ready_for_review', issuedHash: null }))
    await expect(requestInsightDelivery({ ...scope, body: body() })).rejects.toMatchObject({ code: 'not_ready' })

    stores.getInsightEditionById.mockResolvedValue(edition())
    await expect(requestInsightDelivery({ ...scope, body: body({ modality: 'portal_link' }) })).rejects.toMatchObject({ code: 'not_ready' })
  })

  it('destinatario que no es persona activa de la org ⇒ 400 sin crear nada', async () => {
    const { requestInsightDelivery } = await import('./commands')

    delivery.resolveInsightDeliveryRecipients.mockResolvedValue([])
    await expect(requestInsightDelivery({ ...scope, body: body() })).rejects.toMatchObject({ code: 'invalid_request' })
    expect(delivery.insertInsightDeliveryIntent).not.toHaveBeenCalled()
  })

  it('crea intent + destinatarios + evento en una transacción; misma key y payload ⇒ idempotente; payload distinto ⇒ 409', async () => {
    const { requestInsightDelivery } = await import('./commands')
    const first = await requestInsightDelivery({ ...scope, body: body() })

    expect(first.idempotent).toBe(false)
    expect(first.delivery.recipients[0]).toMatchObject({ recipientEmailMasked: 'c***@berel.com', state: 'pending' })

    const published = JSON.stringify((infra.publish.mock.calls as unknown[][]).map(call => call[0]))

    expect(published).toContain('insights.delivery.requested')
    expect(published).not.toContain('cliente@berel.com')

    const requestHash = (delivery.insertInsightDeliveryIntent.mock.calls[0]![1] as { requestHash: string }).requestHash

    delivery.findInsightDeliveryIntentByKey.mockResolvedValue(intentRecord({ requestHash }))
    await expect(requestInsightDelivery({ ...scope, body: body() })).resolves.toMatchObject({ idempotent: true })
    await expect(requestInsightDelivery({ ...scope, body: body({ subject: 'Otro asunto distinto' }) })).rejects.toMatchObject({ code: 'idempotency_conflict' })
  })

  it('adjunto exige PDFs renderizados', async () => {
    const { requestInsightDelivery } = await import('./commands')

    renderStore.findInsightOutputsForEdition.mockResolvedValueOnce([])
    await expect(requestInsightDelivery({ ...scope, body: body({ modality: 'attachment', acknowledgeIrrevocableAttachment: true }) })).rejects.toMatchObject({ code: 'not_ready' })
  })
})

describe('dispatchInsightDeliveryIntent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    stores.getInsightEditionById.mockResolvedValue(edition())
    delivery.getInsightDeliveryIntent.mockResolvedValue(intentRecord())
    delivery.listInsightDeliveryRecipients.mockResolvedValue([recipientRecord()])
    delivery.resolveInsightDeliveryRecipients.mockResolvedValue([{ userId: 'user-cli-1', email: 'cliente@berel.com', fullName: 'Cliente Berel', kind: 'client_user', locale: 'es-CL', undeliverable: false }])
    delivery.claimInsightDeliveryRecipient.mockResolvedValue(recipientRecord({ state: 'claimed', attempts: 1 }))
    email.claimTokenSensitiveEmailIntent.mockImplementation(async (input: { issueCredential: (client: unknown, id: string) => Promise<unknown> }) => ({
      claimed: true,
      deliveryId: 'email-1',
      value: await input.issueCredential({ query: vi.fn() }, 'email-1')
    }))
  })

  it('flag OFF en el worker ⇒ no toca nada', async () => {
    const { dispatchInsightDeliveryIntent } = await import('./dispatch')

    expect(await dispatchInsightDeliveryIntent('idlv-1', {} as NodeJS.ProcessEnv)).toMatchObject({ skipped: 'flag_off' })
    expect(delivery.getInsightDeliveryIntent).not.toHaveBeenCalled()
  })

  it('share_link aceptado: grant en el claim del correo, bearer sólo en el contexto en memoria', async () => {
    const { dispatchInsightDeliveryIntent } = await import('./dispatch')

    email.sendEmail.mockResolvedValue({ deliveryId: 'email-1', status: 'sent', dispatchOutcome: 'accepted', resendId: 're_1' })

    const result = await dispatchInsightDeliveryIntent('idlv-1', ENV_ON)

    expect(result).toMatchObject({ accepted: 1, failed: 0, ambiguous: 0 })

    const sent = email.sendEmail.mock.calls[0]![0] as { context: { actionUrl: string }; persistence: { mode: string; deliveryIntentId: string; safeContext: Record<string, unknown> }; sourceEventId: string }

    expect(sent.context.actionUrl).toMatch(/\/insights\/r\/isg_/)
    expect(sent.persistence).toMatchObject({ mode: 'token_sensitive', deliveryIntentId: 'email-1' })
    expect(JSON.stringify(sent.persistence.safeContext)).not.toContain('isg_')
    expect(sent.sourceEventId).toBe('idlr-00000000-0000-4000-8000-000000000001')
    expect(JSON.stringify((infra.publish.mock.calls as unknown[][]).map(call => call[0]))).not.toContain('isg_')
    expect(delivery.finishInsightDeliveryRecipient).toHaveBeenCalledWith(undefined, expect.objectContaining({ state: 'accepted', shareGrantId: 'ishr-9' }))
  })

  it('rechazo definitivo del proveedor ⇒ failed y el grant se revoca; timeout ⇒ ambiguous sin revocar', async () => {
    const { dispatchInsightDeliveryIntent } = await import('./dispatch')

    email.sendEmail.mockResolvedValueOnce({ deliveryId: 'email-1', status: 'failed', dispatchOutcome: 'failed', resendId: null })
    await dispatchInsightDeliveryIntent('idlv-1', ENV_ON)
    expect(sharing.revokeInsightShareGrant).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ reason: 'delivery_failed' }))
    expect(delivery.finishInsightDeliveryRecipient).toHaveBeenLastCalledWith(undefined, expect.objectContaining({ state: 'failed' }))

    vi.clearAllMocks()
    delivery.getInsightDeliveryIntent.mockResolvedValue(intentRecord())
    delivery.listInsightDeliveryRecipients.mockResolvedValue([recipientRecord()])
    delivery.claimInsightDeliveryRecipient.mockResolvedValue(recipientRecord({ state: 'claimed', attempts: 1 }))
    delivery.resolveInsightDeliveryRecipients.mockResolvedValue([{ userId: 'user-cli-1', email: 'cliente@berel.com', fullName: null, kind: 'client_user', locale: null, undeliverable: false }])
    stores.getInsightEditionById.mockResolvedValue(edition())
    email.claimTokenSensitiveEmailIntent.mockResolvedValue({ claimed: true, deliveryId: 'email-2', value: { token: `isg_${'B'.repeat(43)}`, shareGrantId: 'ishr-10', expiresAt: '2026-10-18T12:00:00.000Z' } })
    email.sendEmail.mockRejectedValueOnce(new Error('socket hang up'))

    expect(await dispatchInsightDeliveryIntent('idlv-1', ENV_ON)).toMatchObject({ ambiguous: 1 })
    expect(sharing.revokeInsightShareGrant).not.toHaveBeenCalled()
  })

  it('ya había correo para este intento ⇒ ambiguo, no se envía otro; tipo pausado ⇒ skipped', async () => {
    const { dispatchInsightDeliveryIntent } = await import('./dispatch')

    email.claimTokenSensitiveEmailIntent.mockResolvedValueOnce({ claimed: false, deliveryId: 'email-old', value: null })
    expect(await dispatchInsightDeliveryIntent('idlv-1', ENV_ON)).toMatchObject({ ambiguous: 1 })
    expect(email.sendEmail).not.toHaveBeenCalled()

    email.claimTokenSensitiveEmailIntent.mockResolvedValueOnce({ claimed: true, deliveryId: 'email-3', value: null })
    expect(await dispatchInsightDeliveryIntent('idlv-1', ENV_ON)).toMatchObject({ skippedRecipients: 1 })
    expect(email.sendEmail).not.toHaveBeenCalled()
  })

  it('edición retirada entre el intent y el despacho ⇒ skipped edition_unavailable sin credencial', async () => {
    const { dispatchInsightDeliveryIntent } = await import('./dispatch')

    stores.getInsightEditionById.mockResolvedValue(edition({ state: 'withdrawn' }))
    expect(await dispatchInsightDeliveryIntent('idlv-1', ENV_ON)).toMatchObject({ skippedRecipients: 1 })
    expect(email.claimTokenSensitiveEmailIntent).not.toHaveBeenCalled()
    expect(delivery.finishInsightDeliveryRecipient).toHaveBeenCalledWith(undefined, expect.objectContaining({ state: 'skipped', skipReason: 'edition_unavailable' }))
  })

  it('otro dispatcher ya reclamó al destinatario ⇒ este no envía', async () => {
    const { dispatchInsightDeliveryIntent } = await import('./dispatch')

    delivery.claimInsightDeliveryRecipient.mockResolvedValue(null)
    expect(await dispatchInsightDeliveryIntent('idlv-1', ENV_ON)).toMatchObject({ accepted: 0, skippedRecipients: 0 })
    expect(email.claimTokenSensitiveEmailIntent).not.toHaveBeenCalled()
  })
})

describe('reconcileInsightDeliveryRecipient', () => {
  const scope = { subject: internalSubject, actorOrganizationId: null, organizationId: 'org-a', deliveryRecipientId: 'idlr-00000000-0000-4000-8000-000000000001' }

  beforeEach(() => {
    vi.clearAllMocks()
    moduleAssigned()
    delivery.getInsightDeliveryRecipient.mockResolvedValue(recipientRecord({ state: 'ambiguous', attempts: 1, shareGrantId: 'ishr-9' }))
    delivery.getInsightDeliveryIntent.mockResolvedValue(intentRecord())
  })

  it('ledger aceptado ⇒ accepted; sin fila ⇒ failed y revoca el grant; pending ⇒ unresolved salvo decisión con motivo', async () => {
    const { reconcileInsightDeliveryRecipient } = await import('./commands')

    delivery.readInsightDeliveryTransportForAttempt.mockResolvedValueOnce({ deliveryId: 'e', status: 'sent', providerStatus: null, resendId: 're_1', errorClass: null })
    expect(await reconcileInsightDeliveryRecipient(scope)).toMatchObject({ outcome: 'accepted' })

    delivery.readInsightDeliveryTransportForAttempt.mockResolvedValueOnce(null)
    expect(await reconcileInsightDeliveryRecipient(scope)).toMatchObject({ outcome: 'failed' })
    expect(sharing.revokeInsightShareGrant).toHaveBeenCalled()

    delivery.readInsightDeliveryTransportForAttempt.mockResolvedValueOnce({ deliveryId: 'e', status: 'pending', providerStatus: null, resendId: null, errorClass: null })
    expect(await reconcileInsightDeliveryRecipient(scope)).toMatchObject({ outcome: 'unresolved' })

    delivery.readInsightDeliveryTransportForAttempt.mockResolvedValueOnce({ deliveryId: 'e', status: 'pending', providerStatus: null, resendId: null, errorClass: null })
    await expect(reconcileInsightDeliveryRecipient({ ...scope, operatorDecision: 'failed', reason: 'corto' })).rejects.toMatchObject({ code: 'invalid_request' })

    delivery.readInsightDeliveryTransportForAttempt.mockResolvedValueOnce({ deliveryId: 'e', status: 'pending', providerStatus: null, resendId: null, errorClass: null })
    expect(await reconcileInsightDeliveryRecipient({ ...scope, operatorDecision: 'failed', reason: 'Resend confirma que no salió' })).toMatchObject({ outcome: 'failed' })
  })

  it('un destinatario no ambiguo no se toca', async () => {
    const { reconcileInsightDeliveryRecipient } = await import('./commands')

    delivery.getInsightDeliveryRecipient.mockResolvedValue(recipientRecord({ state: 'accepted' }))
    expect(await reconcileInsightDeliveryRecipient(scope)).toMatchObject({ outcome: 'not_ambiguous' })
    expect(delivery.finishInsightDeliveryRecipient).not.toHaveBeenCalled()
  })
})
