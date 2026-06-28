/**
 * TASK-1282 — Growth Search Console connection · barrel público.
 *
 * Superficie programática del dominio (Full API Parity): commands gobernados +
 * reader canónico + contratos. Consumers (route admin v1, UI follow-up, Nexa/MCP,
 * grader/medición) importan desde acá, NUNCA reimplementan SQL ni el OAuth.
 */

export {
  startSearchConsoleConnection,
  completeSearchConsoleConnection,
  disconnectSearchConsoleProperty,
  type StartSearchConsoleConnectionInput,
  type StartSearchConsoleConnectionResult
} from './command'

export {
  getSearchConsoleConnection
} from './connection-store'

export { readSearchConsoleAnalytics } from './reader'

export {
  SEARCH_CONSOLE_SCOPE,
  type SearchConsoleConnection,
  type SearchConsoleConnectionStatus,
  type SearchConsoleCommandResult,
  type SearchConsoleAnalyticsParams,
  type SearchConsoleAnalyticsResult,
  type SearchConsoleAnalyticsRow,
  type SearchConsoleAnalyticsDimension
} from './contracts'

export { isSearchConsoleEnabled, GROWTH_SEARCH_CONSOLE_FLAG } from './flags'
