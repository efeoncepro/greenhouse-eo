/**
 * TASK-991 Slice 1 — tests para deriveOrganizationType (SSOT de derivación de tipo)
 * + isCanonicalOrganizationWriteEnabled (flag shadow).
 */
import { afterEach, describe, expect, it } from 'vitest'

import { deriveOrganizationType, isCanonicalOrganizationWriteEnabled } from './organization-type'

describe('deriveOrganizationType — TASK-991', () => {
  it('active_client ⇒ client', () => {
    expect(deriveOrganizationType({ lifecycleStage: 'active_client' })).toBe('client')
  })

  it('provider_only ⇒ supplier', () => {
    expect(deriveOrganizationType({ lifecycleStage: 'provider_only' })).toBe('supplier')
  })

  it('prospect (sin rol) ⇒ other', () => {
    expect(deriveOrganizationType({ lifecycleStage: 'prospect' })).toBe('other')
  })

  it('opportunity (sin rol) ⇒ other', () => {
    expect(deriveOrganizationType({ lifecycleStage: 'opportunity' })).toBe('other')
  })

  it('sin lifecycle ni roles ⇒ other', () => {
    expect(deriveOrganizationType({})).toBe('other')
  })

  it('hasClientRole ⇒ client (independiente del lifecycle)', () => {
    expect(deriveOrganizationType({ hasClientRole: true })).toBe('client')
  })

  it('hasSupplierRole ⇒ supplier', () => {
    expect(deriveOrganizationType({ hasSupplierRole: true })).toBe('supplier')
  })

  it('cliente + proveedor ⇒ both', () => {
    expect(deriveOrganizationType({ hasClientRole: true, hasSupplierRole: true })).toBe('both')
  })

  it('active_client + hasSupplierRole ⇒ both', () => {
    expect(deriveOrganizationType({ lifecycleStage: 'active_client', hasSupplierRole: true })).toBe(
      'both'
    )
  })

  // Merge sobre tipo existente (reemplaza promoteToClientCapableType)
  it('merge: supplier existente + rol cliente ⇒ both', () => {
    expect(deriveOrganizationType({ hasClientRole: true, currentType: 'supplier' })).toBe('both')
  })

  it('merge: other existente + rol cliente ⇒ client', () => {
    expect(deriveOrganizationType({ hasClientRole: true, currentType: 'other' })).toBe('client')
  })

  it('merge: client existente + rol proveedor ⇒ both', () => {
    expect(deriveOrganizationType({ hasSupplierRole: true, currentType: 'client' })).toBe('both')
  })

  it('merge: both existente se mantiene both', () => {
    expect(deriveOrganizationType({ hasClientRole: true, currentType: 'both' })).toBe('both')
  })

  it('idempotente: supplier existente + rol proveedor ⇒ supplier', () => {
    expect(deriveOrganizationType({ hasSupplierRole: true, currentType: 'supplier' })).toBe(
      'supplier'
    )
  })

  it('NUNCA produce active_client+other (el bug de Berel): active_client siempre ⇒ client/both', () => {
    expect(deriveOrganizationType({ lifecycleStage: 'active_client', currentType: 'other' })).toBe(
      'client'
    )
  })
})

describe('isCanonicalOrganizationWriteEnabled — kill-switch (default ON)', () => {
  const original = process.env.CLIENT_BIRTH_CANONICAL_WRITE_ENABLED

  afterEach(() => {
    if (original === undefined) delete process.env.CLIENT_BIRTH_CANONICAL_WRITE_ENABLED
    else process.env.CLIENT_BIRTH_CANONICAL_WRITE_ENABLED = original
  })

  it('default (unset) ⇒ true (kill-switch, escritura correcta por defecto)', () => {
    delete process.env.CLIENT_BIRTH_CANONICAL_WRITE_ENABLED
    expect(isCanonicalOrganizationWriteEnabled()).toBe(true)
  })

  it("'true' ⇒ true", () => {
    process.env.CLIENT_BIRTH_CANONICAL_WRITE_ENABLED = 'true'
    expect(isCanonicalOrganizationWriteEnabled()).toBe(true)
  })

  it("'false' ⇒ false (apagado de emergencia)", () => {
    process.env.CLIENT_BIRTH_CANONICAL_WRITE_ENABLED = 'false'
    expect(isCanonicalOrganizationWriteEnabled()).toBe(false)
  })
})
