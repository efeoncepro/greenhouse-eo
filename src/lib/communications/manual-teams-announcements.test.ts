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

  it('builds a real Adaptive Card mention with Entra object id', () => {
    const preview = previewManualTeamsAnnouncement({
      destinationKey: 'eo-team',
      title: 'Bienvenida al equipo',
      paragraphs: ['Hoy le damos la bienvenida a Maria Fernanda.'],
      mentions: [
        {
          text: 'Maria Fernanda',
          id: '6a6bcc6d-95a6-4a6b-be3f-536ea2b79e9c',
          name: 'Maria Fernanda Gonzalez'
        }
      ]
    })

    expect(preview.ctaUrl).toBeNull()
    expect(preview.ctaLabel).toBeNull()
    expect(preview.card.version).toBe('1.0')
    expect(preview.card.actions).toBeUndefined()
    expect(preview.card.body[1]).toEqual(
      expect.objectContaining({
        text: 'Hoy le damos la bienvenida a <at>Maria Fernanda</at>.'
      })
    )
    expect(preview.card.msteams?.entities).toEqual([
      {
        type: 'mention',
        text: '<at>Maria Fernanda</at>',
        mentioned: {
          id: '6a6bcc6d-95a6-4a6b-be3f-536ea2b79e9c',
          name: 'Maria Fernanda Gonzalez'
        }
      }
    ])
  })

  it('rejects 29-prefixed aad ids for Adaptive Card mentions', () => {
    expect(() =>
      previewManualTeamsAnnouncement({
        destinationKey: 'eo-team',
        title: 'Bienvenida',
        paragraphs: ['Hola Julio Reyes'],
        mentions: [
          {
            text: 'Julio Reyes',
            id: '29:71acd85d-15a6-4eb6-953d-125370032e93',
            name: 'Julio Reyes Rangel'
          }
        ]
      })
    ).toThrow(/not '29:<aadObjectId>'/)
  })

  it('rejects mentions that do not appear in the card text', () => {
    expect(() =>
      previewManualTeamsAnnouncement({
        destinationKey: 'eo-team',
        title: 'Bienvenida',
        paragraphs: ['Hola equipo'],
        mentions: [
          {
            text: 'Maria Fernanda',
            id: '6a6bcc6d-95a6-4a6b-be3f-536ea2b79e9c'
          }
        ]
      })
    ).toThrow(/was not found/)
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
