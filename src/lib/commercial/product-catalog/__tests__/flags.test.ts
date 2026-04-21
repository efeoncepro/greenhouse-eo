import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  AUTO_MATERIALIZABLE_SOURCE_KINDS,
  isAutoMaterializableSourceKind,
  isProductSyncEnabled,
  isProductSyncOverheadsEnabled,
  isProductSyncRolesEnabled,
  isProductSyncServicesEnabled,
  isProductSyncToolsEnabled
} from '../flags'

const ORIGINAL_ENV = { ...process.env }

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

describe('flag helpers default to disabled', () => {
  it('returns false for every source when no env override is set', () => {
    delete process.env.GREENHOUSE_PRODUCT_SYNC_ROLES
    delete process.env.GREENHOUSE_PRODUCT_SYNC_TOOLS
    delete process.env.GREENHOUSE_PRODUCT_SYNC_OVERHEADS
    delete process.env.GREENHOUSE_PRODUCT_SYNC_SERVICES

    expect(isProductSyncRolesEnabled()).toBe(false)
    expect(isProductSyncToolsEnabled()).toBe(false)
    expect(isProductSyncOverheadsEnabled()).toBe(false)
    expect(isProductSyncServicesEnabled()).toBe(false)
  })

  it.each(['true', '1', 'yes', 'on', 'TRUE', '  true  '])('treats "%s" as enabled', value => {
    process.env.GREENHOUSE_PRODUCT_SYNC_ROLES = value
    expect(isProductSyncRolesEnabled()).toBe(true)
  })

  it('treats any other value as disabled', () => {
    process.env.GREENHOUSE_PRODUCT_SYNC_ROLES = 'false'
    expect(isProductSyncRolesEnabled()).toBe(false)

    process.env.GREENHOUSE_PRODUCT_SYNC_ROLES = 'maybe'
    expect(isProductSyncRolesEnabled()).toBe(false)
  })
})

describe('isProductSyncEnabled dispatcher', () => {
  it('dispatches to the correct per-source flag', () => {
    process.env.GREENHOUSE_PRODUCT_SYNC_ROLES = 'true'
    process.env.GREENHOUSE_PRODUCT_SYNC_TOOLS = 'false'
    process.env.GREENHOUSE_PRODUCT_SYNC_OVERHEADS = 'false'
    process.env.GREENHOUSE_PRODUCT_SYNC_SERVICES = 'true'

    expect(isProductSyncEnabled('sellable_role')).toBe(true)
    expect(isProductSyncEnabled('tool')).toBe(false)
    expect(isProductSyncEnabled('overhead_addon')).toBe(false)
    expect(isProductSyncEnabled('service')).toBe(true)
  })
})

describe('isAutoMaterializableSourceKind', () => {
  it('recognises the 4 auto-materializable kinds', () => {
    expect(isAutoMaterializableSourceKind('sellable_role')).toBe(true)
    expect(isAutoMaterializableSourceKind('tool')).toBe(true)
    expect(isAutoMaterializableSourceKind('overhead_addon')).toBe(true)
    expect(isAutoMaterializableSourceKind('service')).toBe(true)
  })

  it('excludes manual, hubspot_imported, and sellable_role_variant', () => {
    expect(isAutoMaterializableSourceKind('manual')).toBe(false)
    expect(isAutoMaterializableSourceKind('hubspot_imported')).toBe(false)
    expect(isAutoMaterializableSourceKind('sellable_role_variant')).toBe(false)
    expect(isAutoMaterializableSourceKind('bogus')).toBe(false)
  })

  it('exports the 4-element canonical list', () => {
    expect(AUTO_MATERIALIZABLE_SOURCE_KINDS).toEqual([
      'sellable_role',
      'tool',
      'overhead_addon',
      'service'
    ])
  })
})
