import { writeFileSync, readFileSync, existsSync } from 'node:fs'

import assert from 'node:assert/strict'

import { GoogleAuth, Impersonated } from 'google-auth-library'

import { GtmApiClient } from '../../src/lib/growth/gtm/api-client'

const base = 'accounts/6291647045/containers/218104216',
  out = '.captures/2026-10-20-blog-growth-form/gtm-state.json'

async function main() {
  const source = await new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/cloud-platform'] }).getClient()

  const auth = new Impersonated({
    sourceClient: source,
    targetPrincipal: 'greenhouse-gtm-publisher@efeonce-group.iam.gserviceaccount.com',
    targetScopes: [
      'https://www.googleapis.com/auth/tagmanager.edit.containers',
      'https://www.googleapis.com/auth/tagmanager.edit.containerversions',
      'https://www.googleapis.com/auth/tagmanager.publish',
      'https://www.googleapis.com/auth/analytics.readonly'
    ],
    lifetime: 600
  })

  const token = async () => {
    const r = await auth.getAccessToken()

    if (!r.token) throw Error('No token')

return r.token
  }

  const client = new GtmApiClient({ getAccessToken: token })

  const req = async (path: string, method = 'GET', body?: unknown) => {
    const r = await fetch('https://www.googleapis.com/tagmanager/v2/' + path, {
      method,
      headers: { Authorization: `Bearer ${await token()}`, 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {})
    })

    if (!r.ok) throw Error(`GTM ${method} ${r.status} ${await r.text()}`)

return r.json() as Promise<any>
  }

  const live = await req(base + '/versions:live')

  const streams = (await fetch('https://analyticsadmin.googleapis.com/v1beta/properties/486264460/dataStreams', {
    headers: { Authorization: `Bearer ${await token()}` }
  }).then(r => r.json())) as any

  assert(streams.dataStreams?.some((s: any) => s.webStreamData?.measurementId === 'G-KYPPY57M14'))
  const save = (s: any) => writeFileSync(out, JSON.stringify(s, null, 2))

  const state: any = existsSync(out)
    ? JSON.parse(readFileSync(out, 'utf8'))
    : { baselineVersion: live.containerVersionId }

  if (process.argv.includes('--publish')) {
    assert(state.previewOk && state.versionId, 'Freeze and verify first')

    if (live.containerVersionId === state.versionId) {
      console.log('Already live')

return
    }

    assert.equal(live.containerVersionId, state.baselineVersion, 'Concurrent live drift')
    await client.publishVersion('6291647045', '218104216', state.versionId)
    const check = await req(base + '/versions:live')

    assert.equal(check.containerVersionId, state.versionId)
    state.publishedAt = new Date().toISOString()
    save(state)
    console.log(JSON.stringify(state))

return
  }

  if (process.argv.includes('--freeze')) {
    assert(state.previewOk && state.workspaceId)
    assert.equal(live.containerVersionId, state.baselineVersion)

    if (!state.versionId) {
      const v = await client.createVersion('6291647045', '218104216', state.workspaceId, {
        name: 'Blog Glitch subscription sign_up 2026-10-20',
        notes: 'Subscription accepted -> sign_up; exclude subscribe from generate_lead. No Ads/Meta changes.'
      })

      assert(!v.compilerError && v.containerVersionId)
      state.versionId = v.containerVersionId
      save(state)
    }

    console.log(JSON.stringify(state))

return
  }

  const lead = live.tag.find((t: any) => t.name === 'GA4 Event - generate_lead')

  assert(lead)
  const trigger = live.trigger.find((t: any) => lead.firingTriggerId.includes(t.triggerId))

  assert.equal(trigger.name, 'CE - gh_form_submission_accepted')
  console.log(
    JSON.stringify({
      baseline: live.containerVersionId,
      leadTag: lead.tagId,
      trigger: trigger.triggerId,
      proposal: 'One new sign_up tag/trigger; exclude subscribe from existing trigger'
    })
  )
  if (!process.argv.includes('--build')) return

  if (!state.workspaceId) {
    const w = await client.createWorkspace('6291647045', '218104216', {
      name: 'blog-glitch-subscription-20261020',
      description: 'Authorized blog subscription measurement'
    })

    state.workspaceId = w.workspaceId
    save(state)
  }

  assert.equal(live.containerVersionId, state.baselineVersion)
  const wp = base + '/workspaces/' + state.workspaceId

  const eq = (neg = false) => ({
    type: 'equals',
    parameter: [
      { type: 'template', key: 'arg0', value: '{{DLV - form_kind}}' },
      { type: 'template', key: 'arg1', value: 'subscribe' },
      ...(neg ? [{ type: 'boolean', key: 'negate', value: 'true' }] : [])
    ]
  })

  const old = await req(wp + '/triggers/' + trigger.triggerId)

  if (!(old.filter ?? []).some((f: any) => f.parameter?.some((p: any) => p.value === 'subscribe'))) {
    old.filter = [...(old.filter ?? []), eq(true)]
    await req(wp + '/triggers/' + trigger.triggerId, 'PUT', old)
  }

  const ts = (await req(wp + '/triggers')).trigger ?? []
  let st = ts.find((t: any) => t.name === 'CE - Growth Forms subscription accepted')

  if (!st)
    st = await client.createTrigger('6291647045', '218104216', state.workspaceId, {
      name: 'CE - Growth Forms subscription accepted',
      type: 'customEvent',
      customEventFilter: trigger.customEventFilter,
      filter: [...(trigger.filter ?? []), eq()]
    })
  const tags = (await req(wp + '/tags')).tag ?? []

  if (!tags.some((t: any) => t.name === 'GA4 Event - sign_up')) {
    const tag = structuredClone(lead)

    for (const k of ['accountId', 'containerId', 'workspaceId', 'tagId', 'path', 'fingerprint', 'tagManagerUrl'])
      delete tag[k]
    tag.name = 'GA4 Event - sign_up'
    tag.firingTriggerId = [st.triggerId]
    tag.parameter.find((p: any) => p.key === 'eventName').value = 'sign_up'
    await client.createTag('6291647045', '218104216', state.workspaceId, tag)
  }

  const preview = await client.quickPreview('6291647045', '218104216', state.workspaceId)

  assert(!preview.compilerError && preview.syncStatusOk)
  const status = await req(wp + '/status')

  state.changes = status.workspaceChange?.map((c: any) => ({
    changeStatus: c.changeStatus,
    name: c.tag?.name ?? c.trigger?.name ?? c.variable?.name
  }))
  assert.equal(state.changes.length, 3)
  state.previewOk = true
  state.subscriptionTriggerId = st.triggerId
  save(state)
  console.log(JSON.stringify(state))
}

main().catch(e => {
  console.error(e.message)
  process.exitCode = 1
})
