import { lstatSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'

import { MetaReadError } from './client'
import { HubSpotLeadTraceClient } from './lead-trace-hubspot'
import { buildLeadTrace, type LeadTraceInput, type RemoteStageEvidence } from './lead-trace-model'
import { createLeadTraceRuntime, type LeadTraceRuntime } from './lead-trace-runtime'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const safeId = (value: unknown) => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,120}$/.test(value) && !/^(?:EAA|pat-(?:na|eu))/i.test(value) ? value : undefined
const safeCode = (value: unknown) => typeof value === 'string' && /^[a-zA-Z][a-zA-Z0-9_]{0,79}$/.test(value) ? value : undefined

function integer(value: unknown, fallback: number, maximum: number) {
  if (value === undefined) return fallback
  if (typeof value !== 'string' || !/^\d+$/.test(value) || Number(value) < 1 || Number(value) > maximum) throw new MetaReadError('invalid_trace_limit', 2)

  return Number(value)
}

function findInput(path: string, now: Date) {
  let data: unknown

  try {
    const stat = lstatSync(resolve(path))

    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 16384 || stat.mode & 0o077) throw new Error()
    data = JSON.parse(readFileSync(resolve(path), 'utf8'))
  } catch { throw new MetaReadError('private_lead_lookup_input_required', 2) }

  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new MetaReadError('invalid_lead_lookup_input', 2)
  const value = data as Record<string, unknown>

  if (Object.keys(value).some(key => !['email', 'since', 'until'].includes(key)) || typeof value.email !== 'string' ||
      value.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email.trim())) throw new MetaReadError('invalid_lead_lookup_input', 2)

  const date = (v: unknown, fallback: Date) => {
    if (v === undefined) return fallback
    if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/.test(v)) throw new MetaReadError('invalid_trace_window', 2)
    const calendar = new Date(v.slice(0, 10) + 'T12:00:00Z')

    if (!Number.isFinite(calendar.getTime()) || calendar.toISOString().slice(0, 10) !== v.slice(0, 10)) throw new MetaReadError('invalid_trace_window', 2)
    const parsed = new Date(v)

    if (!Number.isFinite(parsed.getTime())) throw new MetaReadError('invalid_trace_window', 2)

    return parsed
  }

  const to = date(value.until, now)
  const from = date(value.since, new Date(to.getTime() - 7 * 86400000))

  if (from >= to || to.getTime() - from.getTime() > 31 * 86400000 || to.getTime() > now.getTime() + 300000) throw new MetaReadError('invalid_trace_window', 2)

  return { privateEmail: value.email.trim().toLowerCase(), from, to }
}

export function leadTraceCatalog() {
  return {
    contractVersion: 'meta-lead-trace.v1', readOnly: true,
    commands: [
      { command: 'leads find', flags: ['input', 'limit'], input: '0600 JSON {email,since?,until?}; UTC dates, default seven days, maximum 31 days; returns candidate IDs only.' },
      { command: 'leads trace', flags: ['submission-id', 'event-id', 'source-only', 'pages', 'limit'], input: 'Exactly one fsub-UUID or measurement event UUID. No personal data in arguments.' },
    ],
    authentication: { source: 'canonical PostgreSQL runtime profile in a READ ONLY transaction', hubspot: 'canonical getHubSpotAccessToken; verifies Efeonce portal 48713323 before reads' },
    boundaries: ['No redispatch, form submission, CRM mutation, Meta event creation or payload decryption.',
      'An sGTM tag ACK is not Meta processing or attribution.',
      'A CRM contact can predate this form; native form history and contact existence are separate evidence.',
      'Missing projection does not prove consent denial. Email/time matches are correlation, not exact occurrence identity.'],
  }
}

function aggregate(evidence: RemoteStageEvidence[], stage: 'formSubmission' | 'contact'): RemoteStageEvidence {
  if (!evidence.length) return { status: 'not_checked', correlation: 'none', safeErrorCode: 'hubspot_target_unavailable' }
  if (evidence.length === 1) return evidence[0]
  const status = evidence.every(v => v.status === 'confirmed') ? 'confirmed' : evidence.every(v => v.status === 'correlated') ? 'correlated' : 'partial'

  if (stage === 'formSubmission' && status === 'confirmed') {
    const source = evidence[0].matchedSubmissionId

    if (!source || evidence.some(v => v.correlation !== 'exact_uuid' || v.matchedSubmissionId !== source)) {
      return { status: 'ambiguous', correlation: 'none' }
    }
    // Different destinations have different native IDs; retain those in the individual checks.

    return { status: 'confirmed', correlation: 'exact_uuid', matchedSubmissionId: source }
  }

  return { status, correlation: status === 'confirmed' ? 'identity' : 'none' }
}

export async function runLeadTraceCommand(argv: string[], dependencies: { runtime?: LeadTraceRuntime; hubspot?: HubSpotLeadTraceClient; now?: Date } = {}) {
  let runtime: LeadTraceRuntime | undefined
  let owned = false
  // Dependency libraries may log database/provider errors. The operator adapter never forwards their raw arguments.
  const originalConsole = { info: console.info, warn: console.warn, error: console.error, log: console.log }
  let maskedDiagnostics = false

  try {
    let parsed: ReturnType<typeof parseArgs>

    try { parsed = parseArgs({ args: argv, strict: true, allowPositionals: true, options: {
      'submission-id': { type: 'string' }, 'event-id': { type: 'string' }, input: { type: 'string' },
      'source-only': { type: 'boolean' }, pages: { type: 'string' }, limit: { type: 'string' },
    } }) } catch { throw new MetaReadError('invalid_lead_trace_arguments', 2) }

    const command = parsed.positionals.join(' ')
    const values = parsed.values
    const now = dependencies.now ?? new Date()
    let query: LeadTraceInput['query'] | undefined
    let lookup: ReturnType<typeof findInput> | undefined
    const pages = integer(values.pages, 3, 10)
    const limit = integer(values.limit, command === 'leads find' ? 10 : 50, command === 'leads find' ? 20 : 50)

    if (command === 'leads find') {
      if (typeof values.input !== 'string' || Object.keys(values).some(k => !['input', 'limit'].includes(k))) throw new MetaReadError('lead_find_requires_private_input', 2)
      lookup = findInput(values.input, now)
    } else if (command === 'leads trace') {
      if (values.input || Number(Boolean(values['submission-id'])) + Number(Boolean(values['event-id'])) !== 1) throw new MetaReadError('one_lead_selector_required', 2)
      const kind = values['submission-id'] ? 'submission' : 'event'
      const id = String(values['submission-id'] ?? values['event-id'])

      if (!(kind === 'event' ? uuid.test(id) : id.startsWith('fsub-') && uuid.test(id.slice(5)))) throw new MetaReadError('invalid_lead_selector', 2)
      if (values['source-only'] && (values.pages || values.limit)) throw new MetaReadError('source_only_has_no_provider_pagination', 2)
      query = { kind, id }
    } else throw new MetaReadError('unknown_lead_trace_command', 2)

    if (!dependencies.runtime) {
      maskedDiagnostics = true
      const safeLog = () => undefined

      console.info = safeLog; console.warn = safeLog; console.error = safeLog; console.log = safeLog
      owned = true
    }

    runtime = dependencies.runtime ?? await createLeadTraceRuntime()

    if (lookup) {
      const found = await runtime.find({ ...lookup, limit })

      return { exitCode: found.hasMore ? 6 : 0, output: { ok: true, command, data: { candidates: found.candidates.map(candidate => {
          const c = candidate as Record<string, unknown>

          return { submissionId: safeId(c.submission_id), formId: safeId(c.form_id), formVersionId: safeId(c.form_version_id), surfaceId: safeId(c.surface_id), status: safeCode(c.status),
            ...(c.created_at instanceof Date && Number.isFinite(c.created_at.getTime()) ? { createdAt: c.created_at.toISOString() } : typeof c.created_at === 'string' && Number.isFinite(Date.parse(c.created_at)) ? { createdAt: new Date(c.created_at).toISOString() } : {}) }
        }), pagination: { complete: !found.hasMore, hasMore: found.hasMore, limit } },
        notes: ['No candidate was selected automatically. Use its exact submission ID to trace one occurrence.', 'A missing candidate is not proof of a browser failure; this search covers persisted Forms submissions in the stated window.'], query: { since: lookup.from.toISOString(), until: lookup.to.toISOString(), selector: 'private_email' } } }
    }

    const snapshot = await runtime.read(query!)
    const input: LeadTraceInput = snapshot?.metadata ?? { query: query!, source: null, conversion: null, deliveries: [], hubspotAttempts: [] }
    const checks: Array<{ destinationId?: string; formSubmission: RemoteStageEvidence; contact: RemoteStageEvidence; nativeForm?: { candidateIds: string[]; matchedCount?: number; httpStatus?: number; pagination?: { complete: boolean; pages: number; hasMore: boolean } }; contactRecord?: { contactId?: string; createdAt?: string; updatedAt?: string; createdBeforeSubmission?: boolean; httpStatus?: number } }> = []

    if (input.source && !values['source-only']) {
      const client = dependencies.hubspot ?? new HubSpotLeadTraceClient({ tokenProvider: () => runtime!.tokenProvider() })

      for (const target of (snapshot?.privateHubspotTargets ?? []).slice(0, 5)) {
        if (target.portalId !== '48713323') {
          checks.push({ destinationId: safeId(target.destinationId), formSubmission: { status: 'unavailable', safeErrorCode: 'hubspot_portal_out_of_scope' }, contact: { status: 'not_checked' } })
          continue
        }

        const [form, contact] = await Promise.allSettled([
          client.findFormSubmission({ formGuid: target.formGuid, nativeSubmissionId: target.nativeSubmissionId, occurrenceMarker: target.occurrenceMarker, email: target.privateEmail, fromMs: target.fromMs, toMs: target.toMs, maxPages: pages, pageSize: limit }),
          target.privateEmail ? client.lookupContact(target.privateEmail) : Promise.resolve({ status: 'unavailable', safeErrorCode: 'contact_identity_unavailable' }),
        ])

        const f = form.status === 'fulfilled' ? form.value : { status: 'unavailable', safeErrorCode: 'hubspot_form_read_unavailable' }
        const c = contact.status === 'fulfilled' ? contact.value : { status: 'unavailable', safeErrorCode: 'hubspot_contact_read_unavailable' }
        const statuses: Record<string, RemoteStageEvidence['status']> = { exact_submission: 'confirmed', candidate: 'correlated', ambiguous: 'ambiguous', not_found: 'not_found', partial: 'partial', denied: 'unavailable', unavailable: 'unavailable' }

        const contactId = safeId('contactId' in c ? c.contactId : undefined)
        const validDate = (value: unknown) => typeof value === 'string' && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : undefined
        const createdAt = validDate('createdAt' in c ? c.createdAt : undefined)
        const sourceAt = input.source.created_at instanceof Date ? input.source.created_at.getTime() : Date.parse(String(input.source.created_at))
        const updatedAt = validDate('updatedAt' in c ? c.updatedAt : undefined)

        checks.push({ destinationId: safeId(target.destinationId),
          nativeForm: { ...('error' in f && f.error?.httpStatus !== undefined ? { httpStatus: f.error.httpStatus } : {}), candidateIds: 'candidateIds' in f && Array.isArray(f.candidateIds) ? f.candidateIds.map(safeId).filter((id): id is string => Boolean(id)).slice(0, 500) : [],
            ...('matchedCount' in f && typeof f.matchedCount === 'number' ? { matchedCount: f.matchedCount } : {}),
            ...('pagination' in f ? { pagination: { complete: f.pagination.complete === true, pages: f.pagination.pages, hasMore: f.pagination.hasMore === true } } : {}) },
          contactRecord: { ...('error' in c && c.error?.httpStatus !== undefined ? { httpStatus: c.error.httpStatus } : {}), ...(contactId ? { contactId } : {}), ...(createdAt ? { createdAt } : {}), ...(updatedAt ? { updatedAt } : {}),
            ...(createdAt && Number.isFinite(sourceAt) ? { createdBeforeSubmission: Date.parse(createdAt) < sourceAt } : {}) },
          formSubmission: { status: statuses[f.status] ?? 'unavailable', correlation: f.status === 'exact_submission' ? 'exact_uuid' : f.status === 'candidate' ? 'time_email_fields' : 'none',
            ...(f.status === 'exact_submission' && (target.occurrenceMarker?.value === input.source.submission_id || target.nativeSubmissionId) ? {
              matchedSubmissionId: input.source.submission_id,
              ...(safeId('conversionId' in f ? f.conversionId : undefined) ? { nativeSubmissionId: safeId('conversionId' in f ? f.conversionId : undefined) } : {}),
            } : {}),
            ...(safeCode(f.safeErrorCode) ? { safeErrorCode: safeCode(f.safeErrorCode) } : {}) },
          contact: { status: c.status === 'found' && 'emailMatches' in c && c.emailMatches === true && contactId ? 'confirmed' : c.status === 'not_found' ? 'not_found' : 'unavailable', correlation: 'identity',
            ...(safeCode(c.safeErrorCode) ? { safeErrorCode: safeCode(c.safeErrorCode) } : {}) },
        })
      }

      input.remoteHubspot = { formSubmission: aggregate(checks.map(v => v.formSubmission), 'formSubmission'), contact: aggregate(checks.map(v => v.contact), 'contact') }
    }

    const report = buildLeadTrace(input)

    const expectedDestinations = [...new Set(input.hubspotAttempts.filter(row => row.provider === 'hubspot' && row.adapter_version !== 'fake-v1')
      .map(row => safeId(row.destination_id) ?? 'unknown_destination'))]

    const checkedDestinations = new Set(checks.map(row => row.destinationId))
    const uncheckedDestinations = expectedDestinations.filter(id => !checkedDestinations.has(id))

    const incomplete = !input.source || !values['source-only'] && (!checks.length || uncheckedDestinations.length > 0 ||
      [report.hubspot.remoteForm, report.hubspot.remoteContact, ...checks.flatMap(v => [v.formSubmission, v.contact])]
        .some(e => ['partial', 'unavailable', 'ambiguous', 'not_checked'].includes(e.status)) || (snapshot?.privateHubspotTargets.length ?? 0) > 5)

    return { exitCode: incomplete ? 6 : 0, output: { ok: true, command, data: report, hubspotVerification: checks, coverage: { sourceOnly: Boolean(values['source-only']), complete: !incomplete, uncheckedHubspotDestinations: values['source-only'] ? [] : uncheckedDestinations },
      notes: ['Evidence describes this exact persisted occurrence. No dispatch, CRM mutation or conversion was sent.', 'Native form records matched by email and time remain correlated; an existing CRM contact does not establish that this submission created it.', 'Meta processing and attribution require evidence beyond the stored sGTM tag ACK.'] } }
  } catch (error) {
    const safe = error instanceof MetaReadError ? error : new MetaReadError('lead_trace_source_unavailable', 5)

    return { exitCode: safe.exitCode, output: { ok: false, error: { code: safe.code } } }
  } finally {
    if (owned) { try { await runtime?.close() } catch { /* No provider or database detail leaves the operator boundary. */ } }
    if (maskedDiagnostics) Object.assign(console, originalConsole)
  }
}
