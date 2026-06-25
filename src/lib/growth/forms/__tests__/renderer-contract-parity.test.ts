/**
 * TASK-1231 — Drift guard: el espejo browser-safe del renderer portable
 * (`src/growth-forms-renderer/contract.ts`) NO debe desincronizarse de la SoT
 * (`src/lib/growth/forms/contracts.ts`, TASK-1229).
 *
 * Dirección load-bearing: lo que el server emite (canonical `RenderContract`) DEBE ser
 * consumible por el renderer (mirror `RenderContract`). Si la SoT agrega/renombra un
 * campo del `render_contract`, la asignación de tipos de abajo deja de compilar.
 */
import { describe, expect, it } from 'vitest'

import { CONTRACT_VERSION, type RenderContract as CanonicalRenderContract } from '../contracts'
import { RENDERER_CONTRACT_VERSION } from '@/growth-forms-renderer/version'
import type { RenderContract as MirrorRenderContract } from '@/growth-forms-renderer/contract'

// Compile-time assertion: el output canónico del server es asignable al espejo del
// renderer. Falla `tsc` (y el typecheck gate) si los shapes divergen.
const _assertCanonicalIsConsumable = (canonical: CanonicalRenderContract): MirrorRenderContract => canonical

describe('growth-forms-renderer · contract parity', () => {
  it('renderer contract version mirrors the SoT', () => {
    expect(RENDERER_CONTRACT_VERSION).toBe(CONTRACT_VERSION)
  })

  it('keeps the type assignment referenced (no unused) so the drift guard compiles', () => {
    expect(typeof _assertCanonicalIsConsumable).toBe('function')
  })
})
