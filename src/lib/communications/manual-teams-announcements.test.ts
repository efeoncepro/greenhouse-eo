import { describe, expect, it } from 'vitest'

import {
  listManualTeamsAnnouncementDestinations,
  previewManualTeamsAnnouncement
} from './manual-teams-announcements'

describe('manual-teams-announcements', () => {
  it('exposes the registered manual destinations', () => {
    expect(listManualTeamsAnnouncementDestinations()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'eo-team',
          label: 'EO Team'
        })
      ])
    )
  })

  it('builds a normalized preview card for a valid announcement', () => {
    const preview = previewManualTeamsAnnouncement({
      destinationKey: 'eo-team',
      title: '  Abril listo  ',
      paragraphs: [' Primer párrafo. ', '', 'Segundo párrafo.  '],
      ctaUrl: 'https://www.notion.so/example',
      ctaLabel: 'Ver informe'
    })

    expect(preview.title).toBe('Abril listo')
    expect(preview.paragraphs).toEqual(['Primer párrafo.', 'Segundo párrafo.'])
    expect(preview.card.actions?.[0]).toEqual({
      type: 'Action.OpenUrl',
      title: 'Ver informe',
      url: 'https://www.notion.so/example'
    })
    expect(preview.channel.recipient_chat_id).toBe('19:1e085e8a02d24cc7a0244490e5d00fb0@thread.v2')
    expect(preview.fingerprint).toHaveLength(24)
  })

  it('maps channel-kind destinations (EO - Admin) to team_id + channel_id correctly', () => {
    const preview = previewManualTeamsAnnouncement({
      destinationKey: 'production-release-alerts',
      title: 'Worker revision drift',
      paragraphs: ['1 worker con revision drift confirmado.'],
      ctaUrl: 'https://github.com/efeoncepro/greenhouse-eo/actions/runs/123',
      ctaLabel: 'Ver run en GitHub'
    })

    expect(preview.channel.recipient_kind).toBe('channel')
    expect(preview.channel.team_id).toBe('aae47836-8e59-4d9a-bce5-37d12978a1ad')
    expect(preview.channel.channel_id).toBe('19:19UgRoht3Vmw0qgzfC71rKlOpHtfEI4Qz1jVdWMGqXE1@thread.tacv2')
    expect(preview.channel.recipient_chat_id).toBeNull()
    expect(preview.channel.bot_app_id).toBe('a1397477-4aae-4f16-a0a2-a213cb1b00b2')
  })

  it('rejects non-https links', () => {
    expect(() =>
      previewManualTeamsAnnouncement({
        destinationKey: 'eo-team',
        title: 'Abril listo',
        paragraphs: ['Contenido'],
        ctaUrl: 'http://inseguro.test',
        ctaLabel: 'Ver informe'
      })
    ).toThrow(/https URL/)
  })
})
