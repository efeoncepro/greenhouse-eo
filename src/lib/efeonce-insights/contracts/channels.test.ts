/**
 * TASK-1990 — el vocabulario de canales de Insights es el de AXIS. La comparación se hace contra el paquete instalado
 * (`AXIS_PLATFORM_ASSETS` de `@efeoncepro/axis-brand-assets`, el mismo que copia los isotipos a los catálogos), no
 * contra una lista escrita a mano: si AXIS suma o retira una plataforma, este test lo dice en el próximo bump.
 */

import { AXIS_PLATFORM_ASSETS } from '@efeoncepro/axis-brand-assets'
import { describe, expect, it } from 'vitest'

import { GH_INSIGHTS } from '@/lib/copy/insights'

import { channelForDomain, INSIGHT_CHANNEL_IDS } from './channels'

describe('vocabulario de canales', () => {
  it('es exactamente el de las plataformas de AXIS', () => {
    const axis = [...new Set(AXIS_PLATFORM_ASSETS.map(asset => asset.platform))].sort()

    expect([...INSIGHT_CHANNEL_IDS].sort()).toEqual(axis)
  })

  it('cada canal tiene nombre visible en el copy', () => {
    for (const id of INSIGHT_CHANNEL_IDS) expect(GH_INSIGHTS.channels[id], id).toBeTruthy()
  })
})

describe('channelForDomain', () => {
  it('mapea los dominios que identifican a su plataforma, con o sin subdominio, esquema o ruta', () => {
    expect(channelForDomain('youtube.com')).toBe('youtube')
    expect(channelForDomain('https://www.youtube.com/watch?v=x')).toBe('youtube')
    expect(channelForDomain('reddit.com')).toBe('reddit')
    expect(channelForDomain('es.wikipedia.org')).toBe('wikipedia')
    expect(channelForDomain('linkedin.com')).toBe('linkedin')
    expect(channelForDomain('instagram.com')).toBe('instagram')
    expect(channelForDomain('tiktok.com')).toBe('tiktok')
    expect(channelForDomain('facebook.com')).toBe('meta')
  })

  it('cualquier otro dominio queda sin canal (también los que sólo se parecen)', () => {
    expect(channelForDomain('berel.com.mx')).toBeUndefined()
    expect(channelForDomain('notyoutube.com')).toBeUndefined()
    expect(channelForDomain('wikipedia.org.example.com')).toBeUndefined()
    expect(channelForDomain('')).toBeUndefined()
  })
})
