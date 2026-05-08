import { describe, expect, it } from 'vitest'

import { getCriticalTablesMissingSignal } from './critical-tables-missing'

/**
 * TASK-838 Fase 3 — Live PG smoke test del runtime guard.
 *
 * Skip cuando no hay PG config (CI sin proxy, lint-only). Cuando aplica,
 * confirma que las tablas críticas declaradas existen efectivamente en dev DB.
 */
const hasPgConfig =
  Boolean(process.env.GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME) ||
  Boolean(process.env.GREENHOUSE_POSTGRES_HOST)

describe.skipIf(!hasPgConfig)('TASK-838 Fase 3 — critical tables live PG check', () => {
  it('all critical tables present in dev DB (steady state)', async () => {
    const signal = await getCriticalTablesMissingSignal()

    expect(signal.severity, `Critical tables missing: ${signal.summary}`).toBe('ok')
  })
})
