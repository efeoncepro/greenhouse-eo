import { describe, expect, it } from 'vitest'

import { renderClientMark } from './client-marks'

/**
 * La propiedad que protege esta pantalla no es estética: el logo de un tercero, puesto junto a la
 * pregunta «¿le das estos permisos?», es una señal de confianza. Sólo puede salir de algo que el
 * cliente no pueda declarar sobre sí mismo.
 */
describe('marca de la aplicación en el consentimiento', () => {
  it('muestra el isotipo cuando el origen del client_id CIMD es verificable', () => {
    const claude = renderClientMark({ clientId: 'https://claude.ai/.well-known/oauth-client', clientName: 'Claude' })

    expect(claude.verified).toBe(true)
    expect(claude.html).toContain('id-client-mark-brand')
    expect(claude.html).toContain('<svg')
  })

  it('NUNCA presta el isotipo a quien sólo se pone el nombre', () => {
    // Registro dinámico: el `client_name` es auto-declarado y el `client_id` no es una URL.
    const impostor = renderClientMark({ clientId: 'dcr-cualquiera', clientName: 'Claude Desktop' })

    // `verified: false` es lo que enciende el aviso de aplicación no verificada en la ficha.
    expect(impostor.verified).toBe(false)
    expect(impostor.html).not.toContain('<svg')
    expect(impostor.html).toContain('>C<')
  })

  it('no acepta un dominio que sólo TERMINE en uno verificado', () => {
    for (const clientId of [
      'https://claude.ai.evil.example/doc',
      'https://evil-claude.ai/doc',
      'https://gemini.google.com.evil.example/doc',
      'http://claude.ai/doc'
    ]) {
      const spoofed = renderClientMark({ clientId, clientName: 'Claude' })

      expect(spoofed.verified).toBe(false)
      expect(spoofed.html).not.toContain('<svg')
    }
  })

  it('degrada a monograma legible con nombres raros, sin romper el marcado', () => {
    expect(renderClientMark({ clientId: '', clientName: '«¿?» app' }).html).toContain('>A<')
    expect(renderClientMark({ clientId: '', clientName: '' }).html).toContain('>?<')
  })
})
