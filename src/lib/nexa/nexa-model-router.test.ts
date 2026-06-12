import { describe, expect, it } from 'vitest'

import { classifyNexaIntent, nexaProviderFailoverChain, routeNexaProviderKey } from './nexa-model-router'

describe('classifyNexaIntent', () => {
  it('clasifica como operativo lo que tiene tool dedicado en vivo', () => {
    expect(classifyNexaIntent('¿Cómo va la nómina este mes?')).toBe('operational')
    expect(classifyNexaIntent('Muéstrame el OTD')).toBe('operational')
    expect(classifyNexaIntent('¿Cuántas facturas por cobrar hay?')).toBe('operational')
  })

  it('clasifica como conocimiento las preguntas de proceso/política/definición', () => {
    expect(classifyNexaIntent('¿Cómo se configura un nuevo cliente?')).toBe('knowledge')
    expect(classifyNexaIntent('¿Qué es el ICO?')).toBe('knowledge')
    expect(classifyNexaIntent('¿Cuál es la política de vacaciones?')).toBe('knowledge')
    expect(classifyNexaIntent('Explícame el procedimiento de cierre')).toBe('knowledge')
  })

  it('operativo gana sobre conocimiento cuando ambos aparecen', () => {
    expect(classifyNexaIntent('¿Cómo se calcula la nómina?')).toBe('operational')
  })

  it('cae a general para texto vacío o conversacional', () => {
    expect(classifyNexaIntent('')).toBe('general')
    expect(classifyNexaIntent('   ')).toBe('general')
    expect(classifyNexaIntent('Hola, buenos días')).toBe('general')
  })
})

describe('routeNexaProviderKey', () => {
  it('elige Anthropic solo para conocimiento con retrieval activo', () => {
    expect(routeNexaProviderKey({ intent: 'knowledge', knowledgeRetrievalEnabled: true })).toBe('anthropic')
  })

  it('mantiene Gemini para conocimiento si el retrieval está apagado', () => {
    expect(routeNexaProviderKey({ intent: 'knowledge', knowledgeRetrievalEnabled: false })).toBe('google')
  })

  it('mantiene Gemini para operativo y general', () => {
    expect(routeNexaProviderKey({ intent: 'operational', knowledgeRetrievalEnabled: true })).toBe('google')
    expect(routeNexaProviderKey({ intent: 'general', knowledgeRetrievalEnabled: true })).toBe('google')
  })
})

describe('nexaProviderFailoverChain', () => {
  it('pone el primario primero y el otro como respaldo', () => {
    expect(nexaProviderFailoverChain('anthropic')).toEqual(['anthropic', 'google'])
    expect(nexaProviderFailoverChain('google')).toEqual(['google', 'anthropic'])
  })
})
