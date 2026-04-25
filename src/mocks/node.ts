import { setupServer } from 'msw/node'

import { handlers } from './handlers'

/**
 * Node-side MSW server used by Vitest.
 *
 * Lifecycle (listen/close/resetHandlers) is wired in `src/test/setup.ts` so
 * every test suite gets the same defaults. Tests extend the contract via
 * `server.use(http.get(...))` inside a specific test or `beforeEach`.
 */
export const server = setupServer(...handlers)
