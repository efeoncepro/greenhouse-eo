import { financeHandlers } from './handlers/finance'
import { hrHandlers } from './handlers/hr'
import { peopleHandlers } from './handlers/people'

/**
 * Canonical MSW handler registry.
 *
 * Each domain exposes its own array so new modules can be grafted in without
 * touching cross-domain files. Tests should import `handlers` only when they
 * need the full defaults, and should prefer `server.use(...)` for per-test
 * overrides over editing these arrays.
 */
export const handlers = [...financeHandlers, ...hrHandlers, ...peopleHandlers]

export { financeHandlers, hrHandlers, peopleHandlers }
