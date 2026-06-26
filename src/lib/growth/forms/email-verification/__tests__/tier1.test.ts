import { describe, expect, it } from 'vitest'

import { classifyEmailDomain } from '@/lib/growth/ai-visibility/hubspot/email-domain'

import { DISPOSABLE_EMAIL_DOMAINS, FREE_EMAIL_PROVIDERS } from '../email-domain-data'
import { classifyEmailTier1 } from '../tier1'

describe('classifyEmailTier1 — clasificación', () => {
  it('marca corporativo un dominio fuera de free/desechable', () => {
    const r = classifyEmailTier1('Juan@Acme.com')

    expect(r.syntaxValid).toBe(true)
    expect(r.isCorporate).toBe(true)
    expect(r.isFreeProvider).toBe(false)
    expect(r.isDisposable).toBe(false)
    expect(r.normalizedEmail).toBe('juan@acme.com')
  })

  it('marca free provider (gmail) como no-corporativo', () => {
    const r = classifyEmailTier1('persona@gmail.com')

    expect(r.isFreeProvider).toBe(true)
    expect(r.isCorporate).toBe(false)
  })

  it('marca desechable y NO lo confunde con free', () => {
    const r = classifyEmailTier1('throwaway@mailinator.com')

    expect(r.isDisposable).toBe(true)
    expect(r.isFreeProvider).toBe(false)
    expect(r.isCorporate).toBe(false)
  })

  it('detecta local-part role-based (independiente de corporativo)', () => {
    const r = classifyEmailTier1('info@acme.com')

    expect(r.isRoleBased).toBe(true)
    expect(r.isCorporate).toBe(true) // role-based corporativo sigue siendo corporativo
  })

  it('email inválido ⇒ todo false/null', () => {
    const r = classifyEmailTier1('no-es-email')

    expect(r.syntaxValid).toBe(false)
    expect(r.domain).toBeNull()
    expect(r.isCorporate).toBe(false)
    expect(r.normalizedEmail).toBe('')
  })
})

describe('classifyEmailTier1 — dedupeKey (normalización gmail)', () => {
  it('colapsa puntos y +alias en gmail/googlemail', () => {
    expect(classifyEmailTier1('jo.hn.doe+promos@gmail.com').dedupeKey).toBe('johndoe@gmail.com')
    expect(classifyEmailTier1('johndoe@googlemail.com').dedupeKey).toBe('johndoe@gmail.com')
  })

  it('NO toca el local-part en dominios no-gmail', () => {
    expect(classifyEmailTier1('jo.hn+x@acme.com').dedupeKey).toBe('jo.hn+x@acme.com')
  })
})

describe('classifyEmailTier1 — typo-suggest', () => {
  it('sugiere el dominio corregido para typos conocidos', () => {
    expect(classifyEmailTier1('ana@gmial.com').suggestion).toBe('ana@gmail.com')
    expect(classifyEmailTier1('luis@hotmial.com').suggestion).toBe('luis@hotmail.com')
  })

  it('no sugiere nada para un dominio corporativo desconocido', () => {
    expect(classifyEmailTier1('ana@acme.com').suggestion).toBeNull()
  })
})

describe('SSOT — dataset canónico + paridad con el clasificador HubSpot (TASK-1242)', () => {
  it('free y desechable son conjuntos disjuntos (un dominio no está en ambos)', () => {
    const overlap = [...FREE_EMAIL_PROVIDERS].filter(d => DISPOSABLE_EMAIL_DOMAINS.has(d))

    expect(overlap).toEqual([])
  })

  it('Tier1.isCorporate coincide con classifyEmailDomain.isCorporate (una sola lista)', () => {
    for (const email of ['juan@acme.com', 'a@gmail.com', 'x@mailinator.com', 'c@outlook.cl', 'z@empresa.cl']) {
      expect(classifyEmailTier1(email).isCorporate, email).toBe(classifyEmailDomain(email).isCorporate)
    }
  })
})
