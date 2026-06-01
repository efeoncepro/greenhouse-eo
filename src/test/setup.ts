import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'

import { server } from '@/mocks/node'

vi.mock('server-only', () => ({}))

// React Testing Library no registra su auto-cleanup porque `globals` no está
// activo en vitest.config. Sin cleanup, cada componente montado en un test
// jsdom queda montado para siempre: se acumulan árboles React que nunca se
// desmontan y cuyo trabajo diferido (el scheduler de React 19 agenda flushes vía
// `setImmediate`) puede dispararse DESPUÉS de que jsdom destruye `window` o ya en
// un archivo de entorno `node` → `ReferenceError: window is not defined` flaky en
// cualquier test que corra en esa ventana. Desmontar tras cada test cancela ese
// trabajo agendado y aísla el DOM entre tests. El guard `document` lo hace no-op
// en los tests de entorno `node` (que nunca renderizan).
afterEach(() => {
  if (typeof document !== 'undefined') {
    cleanup()
  }
})

// MSW: one node server shared across every Vitest suite. Handlers come from
// `src/mocks/handlers.ts`; per-test overrides go through `server.use(...)`.
// `onUnhandledRequest: 'warn'` keeps legacy `vi.stubGlobal('fetch', ...)` tests
// working (MSW stays silent when the global has been stubbed locally) while
// still flagging new drift. Migrated tests should remove their local stubs and
// rely on handlers; brand-new tests should always go through MSW.
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' })
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

// react-pdf → pdfjs-dist eagerly references the browser global DOMMatrix at
// module load. jsdom does not ship it, so any test that transitively imports
// CertificatePreviewDialog via the @/components/greenhouse barrel explodes
// before the test body runs. Mocking react-pdf as no-op components avoids
// loading pdfjs entirely in the test environment.
vi.mock('react-pdf', () => ({
  Document: ({ children }: { children?: React.ReactNode }) => children ?? null,
  Page: () => null,
  pdfjs: { GlobalWorkerOptions: {}, version: 'test' }
}))
