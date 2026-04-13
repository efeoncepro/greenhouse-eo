import { vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

vi.mock('server-only', () => ({}))

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
