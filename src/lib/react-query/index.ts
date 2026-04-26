/**
 * TASK-513 — Public surface of the Greenhouse react-query layer.
 *
 * Consumers should import from this module:
 *
 *   import { qk } from '@/lib/react-query'
 *
 * NOT from './keys' or other internal paths. Keeping the entrypoint
 * collapsed to one module makes it trivial to grep for adoption later
 * and to add helpers (mutation invalidators, prefetch utilities, etc.)
 * without breaking call sites.
 */

export { qk, queryKeys, type QuotesListFilters } from './keys'
