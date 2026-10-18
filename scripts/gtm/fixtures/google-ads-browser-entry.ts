/** Local browser verification only. Never imported by an application bundle. */
import { FormRenderer } from '../../../src/growth-forms-renderer/renderer'
import { MeetingRenderer } from '../../../src/growth-meeting-renderer/renderer'
import { createMeetingApiClient } from '../../../src/growth-meeting-renderer/api-client'
import { staticContractFixture } from '../../../src/growth-forms-renderer/fixtures'

declare global {
  interface Window {
    mountAdsSmoke: (kind: 'form' | 'meeting') => Promise<void>
  }
}

window.mountAdsSmoke = async kind => {
  const root = document.querySelector<HTMLElement>('main')!

  if (kind === 'form') {
    const contract = staticContractFixture()

    contract.form.formKind = 'contact'

    const renderer = new FormRenderer({
      root,
      contract,
      api: {
        baseUrl: location.origin,
        slug: 'ads-smoke',
        surfaceId: 'wordpress-public'
      },
      doc: document
    })

    renderer.mount()

    return
  }

  const renderer = new MeetingRenderer(root, {
    api: createMeetingApiClient(location.origin),
    // Test-only CAPTCHA port. No Cloudflare or booking provider is contacted.
    turnstile: { mount: () => ({ execute: async () => 'local-test-token', reset() {}, destroy() {} }) },
    surfaceId: 'wordpress-public',
    schedulerKey: 'efeonce-discovery-30',
    requestedTimezone: 'America/Santiago',
    dataLayerEnabled: true,
    now: () => new Date('2026-07-21T12:00:00.000Z'),
    telemetryBase: {
      scheduler_key: 'efeonce-discovery-30',
      surface_id: 'wordpress-public',
      placement: 'contact_scheduler',
      renderer_version: 'smoke',
      contract_version: 'growth-meeting-scheduler.v1'
    }
  })

  await renderer.load()
}
