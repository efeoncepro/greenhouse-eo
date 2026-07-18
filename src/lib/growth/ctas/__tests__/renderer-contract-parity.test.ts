import { describe, expect, it } from 'vitest'

import type {
  ArbitratedRenderResultMirror,
  CtaRenderContractMirror,
} from '@/growth-cta-renderer/contract'
import { RENDERER_CONTRACT_VERSION } from '@/growth-cta-renderer/version'

import { CTA_CONTRACT_VERSION, type ArbitratedRenderResult, type CtaRenderContract } from '../contracts'

/**
 * TASK-1340 — Parity preview↔público del render contract (calca el patrón
 * forms `renderer-contract-parity.test.ts`): el contrato CANÓNICO del server
 * (zod, TASK-1339) debe ser asignable al espejo solo-tipos del renderer. Si la
 * SoT cambia el shape, `tsc` deja de compilar acá — drift atrapado en CI.
 */

const _assertCanonicalIsConsumable = (canonical: CtaRenderContract): CtaRenderContractMirror => canonical

const _assertArbitratedIsConsumable = (canonical: ArbitratedRenderResult): ArbitratedRenderResultMirror => canonical

describe('growth-cta renderer contract parity', () => {
  it('la versión del contrato del renderer coincide con la canónica', () => {
    expect(RENDERER_CONTRACT_VERSION).toBe(CTA_CONTRACT_VERSION)
  })

  it('mantiene las funciones de asignabilidad referenciadas (compile-time guard)', () => {
    expect(typeof _assertCanonicalIsConsumable).toBe('function')
    expect(typeof _assertArbitratedIsConsumable).toBe('function')
  })
})
