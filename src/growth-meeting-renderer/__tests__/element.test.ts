// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'

import { ensureMeetingIconStyles } from '../element'

beforeEach(() => {
  document.head.innerHTML = ''
})

describe('meeting scheduler element assets', () => {
  it('carga una sola vez el subset Iconify/Tabler desde el host del renderer', () => {
    ensureMeetingIconStyles(document, 'https://greenhouse.example/')
    ensureMeetingIconStyles(document, 'https://greenhouse.example')

    const stylesheets = document.querySelectorAll<HTMLLinkElement>('link[data-ghm-icon-styles]')

    expect(stylesheets).toHaveLength(1)
    expect(stylesheets[0]?.href).toBe('https://greenhouse.example/growth-meetings/icons.css')
    expect(stylesheets[0]?.rel).toBe('stylesheet')
  })

  it('respeta el stylesheet inmutable que instala el loader estable', () => {
    const artifact = document.createElement('link')

    artifact.dataset.ghmIconStyles = 'artifact'
    artifact.dataset.ghmIconRelease = 'abc123'
    artifact.href = 'https://assets.example/releases/abc123/icons.css'
    document.head.append(artifact)
    ensureMeetingIconStyles(document, 'https://greenhouse.example')

    expect(document.querySelectorAll('link[data-ghm-icon-styles]')).toHaveLength(1)
    expect(artifact.href).toContain('/releases/abc123/icons.css')
  })
})
