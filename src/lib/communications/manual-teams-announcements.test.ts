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
