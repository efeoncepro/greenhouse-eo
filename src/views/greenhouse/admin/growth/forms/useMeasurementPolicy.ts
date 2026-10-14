'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { MEASUREMENT_ORIGINS, measurementPolicyConfigSchema, validateMeasurementMapping, type MeasurementPolicyConfig, type MeasurementPolicyMutation, type MeasurementPolicyRevision, type MeasurementPolicySource } from '@/lib/growth/measurement/policy-contract'

import { executePolicyRequest, measurementScopeKey as scopeKey, PolicyClientError, readMeasurementCatalog, type MeasurementCatalog, type PolicyRequest } from './measurement-policy-client'

const configForSource = (source: MeasurementPolicySource, prior?: MeasurementPolicyConfig): MeasurementPolicyConfig => ({
  purpose: 'commercial_lead', sourceVersion: source.sourceVersion,
  origins: MEASUREMENT_ORIGINS.filter(origin => source.origins.includes(origin) && (!prior || prior.origins.includes(origin))),
  destinations: prior?.destinations ?? [],
  mapping: prior ? Object.fromEntries(Object.entries(prior.mapping).filter(([target, key]) => source.fields.some(field => field.key === key && field.type === (target === 'email' ? 'email' : target === 'phone' ? 'tel' : 'text')))) : {},
})

export function useMeasurementPolicy(preferredFormSlug?: string, initialCatalog?: MeasurementCatalog) {
  const [catalog, setCatalog] = useState<MeasurementCatalog|null>(initialCatalog ?? null)
  const [selected, setSelected] = useState('')
  const [revisionId, setRevisionId] = useState<string|null>(null)
  const [config, setConfig] = useState<MeasurementPolicyConfig|null>(null)
  const [editing, setEditing] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [pendingSource, setPendingSource] = useState<string|null>(null)
  const [issue, setIssue] = useState<PolicyClientError|null>(null)
  const [verified, setVerified] = useState(false)
  const [busy, setBusy] = useState(false)
  const [unresolved, setUnresolved] = useState(false)
  const pending = useRef<PolicyRequest|null>(null)
  const busyRef = useRef(false)
  const preferred = useRef(preferredFormSlug)

  preferred.current = preferredFormSlug

  const select = useCallback((key: string, data: MeasurementCatalog) => {
    const source = data.sources.find(s => scopeKey(s.scope) === key)
    const latest = data.policies.filter(p => scopeKey(p.scope) === key).sort((a,b) => b.revision-a.revision)[0]

    setSelected(key); setRevisionId(latest?.revisionId ?? null)
    setConfig(latest?.config ?? (source ? configForSource(source) : null))
    setEditing(!latest && data.permissions.author); setDirty(false); setPendingSource(null); setIssue(null); setVerified(false)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    const load = async () => {
      try {
        const data = initialCatalog ?? await readMeasurementCatalog(fetch, controller.signal)

        if (!active) return
        setCatalog(data)
        const source = data.sources.find(s => s.formSlug === preferred.current) ?? data.sources[0]

        select(source ? scopeKey(source.scope) : '', data)
      } catch (error) {
        if (active) setIssue(error instanceof PolicyClientError ? error : new PolicyClientError('unavailable'))
      }
    }

    void load()

    return () => { active = false; controller.abort() }
  }, [initialCatalog, select])

  const requestSource = useCallback((key: string) => {
    if (!catalog || busyRef.current || pending.current || key === selected) return

    if (dirty) { setPendingSource(key);

return }

    select(key, catalog)
  }, [catalog, dirty, select, selected])

  const previousPreferred = useRef(preferredFormSlug)

  useEffect(() => {
    if (previousPreferred.current === preferredFormSlug || !catalog) return
    previousPreferred.current = preferredFormSlug
    const source = catalog.sources.find(s => s.formSlug === preferredFormSlug)

    if (source) requestSource(scopeKey(source.scope))
  }, [catalog, preferredFormSlug, requestSource])

  const source = catalog?.sources.find(s => scopeKey(s.scope) === selected)
  const revisions = catalog?.policies.filter(p => scopeKey(p.scope) === selected).sort((a,b) => b.revision-a.revision) ?? []
  const revision = revisions.find(p => p.revisionId === revisionId)
  const published = revisions.find(p => p.state === 'published' && p.publishedRevisionId === p.revisionId)
  const expectedPublishedRevisionId = revisions[0]?.publishedRevisionId ?? null

  const blockers = source && config ? [...new Set([
    ...validateMeasurementMapping(config, source),
    ...(!measurementPolicyConfigSchema.safeParse(config).success ? [!config.mapping.email && !config.mapping.phone ? 'identity_mapping_required' : 'configuration_invalid'] : []),
  ])] : source ? source.blockingReasons : ['source_unavailable']

  const update = (next: MeasurementPolicyConfig) => { setConfig(next); setDirty(true); setVerified(false); setIssue(null) }

  const edit = () => {
    if (!source || !catalog?.permissions.author || pending.current) return
    setConfig(configForSource(source, revision?.config)); setEditing(true); setDirty(false); setIssue(null); setVerified(false)
  }

  const cancelEdit = () => { if (catalog) select(selected,catalog) }

  const reload = async () => {
    if (busyRef.current || pending.current) return
    busyRef.current = true; setBusy(true)

    try {
      const data = await readMeasurementCatalog()

      setCatalog(data); setIssue(null); setVerified(false)
      // Retain unsaved values while refreshing the authoritative head for CAS.
      if (!editing) select(selected || (data.sources[0] ? scopeKey(data.sources[0].scope) : ''), data)
    } catch (error) { setIssue(error instanceof PolicyClientError ? error : new PolicyClientError('unavailable')) }
    finally { busyRef.current = false; setBusy(false) }
  }

  const execute = async (mutation?: MeasurementPolicyMutation) => {
    if (busyRef.current) return
    if (!pending.current && !mutation) return
    if (!pending.current) pending.current = { mutation: mutation! }
    busyRef.current = true; setBusy(true); setUnresolved(true); setIssue(null); setVerified(false)

    try {
      const result = await executePolicyRequest(pending.current)

      pending.current = null; setUnresolved(false); setCatalog(result.catalog)
      select(selected, result.catalog); setRevisionId(result.revision.revisionId); setConfig(result.revision.config)
      setEditing(false); setVerified(true)
    } catch (error) {
      const failure = error instanceof PolicyClientError ? error : new PolicyClientError('unavailable')

      setIssue(failure)
      if (failure.kind !== 'unavailable') { pending.current = null; setUnresolved(false) }
    } finally { busyRef.current = false; setBusy(false) }
  }

  const command = (action: 'draft'|'review'|'publish'|'disable', target: MeasurementPolicyRevision|undefined = revision) => {
    if (!catalog || pending.current || busyRef.current) return

    if (action === 'draft') {
      if (!source || !config || !catalog.permissions.author || blockers.length) return
      void execute({ action, scope: source.scope, config, expectedPublishedRevisionId, idempotencyKey: crypto.randomUUID() })
    } else if (target && (action === 'review' ? catalog.permissions.author : catalog.permissions[action])) {
      void execute({ action, policyId: target.policyId, revisionId: target.revisionId, expectedPublishedRevisionId, idempotencyKey: crypto.randomUUID() })
    }
  }

  return { catalog, selected, source, revision, published, config, editing, dirty, pendingSource, issue, verified, busy, unresolved, blockers,
    update, edit, cancelEdit, reload, command, requestSource, retry: () => { void execute() },
    discardSource: () => { if (catalog && pendingSource) select(pendingSource, catalog) }, keepSource: () => setPendingSource(null) }
}
