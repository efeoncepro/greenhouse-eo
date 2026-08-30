// @vitest-environment jsdom

import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'

import type { SeoDiscoveryRunStatus } from '@/lib/growth/seo/keyword-discovery/contracts'
import type { SeoDiscoveryRunView } from '@/lib/growth/seo/keyword-discovery/reader'

import KeywordDiscoveryWorkbench from '../KeywordDiscoveryWorkbench'
import type { KeywordDiscoveryWorkbenchProps } from '../KeywordDiscoveryWorkbench'

/**
 * TASK-1693 Slice 1 — la paginación por cursor de la lente `Descubrir`.
 *
 * Lo que se protege acá no es que aparezcan más filas: es que **paginar no pueda parecerse a
 * gastar**. Tres invariantes, cada uno con su modo de falla real:
 *
 *  1. Ninguna acción de paginación emite `POST`. Un `POST` a este endpoint encola una corrida y
 *     compromete presupuesto del proveedor; el operador creía que estaba recorriendo.
 *  2. No se duplican filas al acumular. El cursor es un OFFSET: si el largo de la lista cambió
 *     entre dos páginas, el mismo candidato vuelve. Contarlo dos veces en un canvas de
 *     comparación es peor que perderlo.
 *  3. Sobre una corrida viva la afordancia NO existe en el DOM. Paginar sobre un universo que
 *     crece devuelve filas saltadas sin que nadie lo note.
 */

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() })
}))

const candidate = (id: string, keyword: string) =>
  ({
    candidateId: id,
    keyword,
    normalizedKeyword: keyword,
    sourceEndpoint: 'keyword_suggestions',
    candidateIds: [id],
    coreKeyword: null,
    intent: null,
    searchVolume: null,
    cpcUsd: null,
    linkBarrier: null,
    capturedAt: null,
    providerLastUpdatedAt: null,
    seedKeywords: [],
    alreadyTracked: false,
    actionKind: null,
    gscImpressions: null,
    gscPosition: null
  }) as unknown as KeywordDiscoveryWorkbenchProps['candidates'][number]

/** Fixture TIPADA: el cast a `unknown` escondería justo los campos que la banda de estado lee. */
const discoveryRun = (status: SeoDiscoveryRunStatus): SeoDiscoveryRunView => ({
  runId: 'run-1',
  seoTargetId: 'target-1',
  sourceKind: 'manual',
  status,
  locationCode: '2484',
  languageCode: 'es',
  seeds: [],
  methods: [{ method: 'keyword_suggestions', resultsPerCall: 25, volumePolicy: 'all' }],
  estimatedCostUsd: 0.04,
  actualCostUsd: status === 'running' ? null : 0.04,
  providerCalls: 1,
  candidateCount: 4,
  errorCode: null,
  createdBy: 'user-1',
  requestedAt: '2026-08-01T00:00:00.000Z',
  startedAt: '2026-08-01T00:01:00.000Z',
  completedAt: status === 'running' ? null : '2026-08-01T00:05:00.000Z'
})

const baseProps = (overrides: Partial<KeywordDiscoveryWorkbenchProps> = {}): KeywordDiscoveryWorkbenchProps => ({
  organizationId: 'org-1',
  seoTargetId: 'target-1',
  selectedSpaceId: 'org-1',
  marketLabel: 'MX · es',
  canExecute: true,
  disabledReason: null,
  budgetRemainingUsd: 5,
  graderProfileId: null,
  groundedDisabledReason: 'sin perfil',
  run: discoveryRun('succeeded'),
  candidates: [candidate('c1', 'pintura industrial'), candidate('c2', 'esmalte acrilico')],
  totalCandidates: 4,
  nextCursor: '2',
  pageSize: 2,
  seedSourceAvailability: { gscQueries: 12, trackedKeywords: 4 },
  ...overrides
})

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const loadMoreButton = () => screen.queryByRole('button', { name: /candidatos más/i })

describe('KeywordDiscoveryWorkbench — paginación por cursor', () => {
  it('ofrece la afordancia con el tamaño real de la página siguiente', () => {
    renderWithTheme(<KeywordDiscoveryWorkbench {...baseProps()} />)

    // 4 en total, 2 servidos ⇒ la siguiente trae 2, y el botón lo dice.
    expect(loadMoreButton()).toHaveTextContent('Ver 2 candidatos más')
  })

  it('acumula la página siguiente SIN emitir un POST', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [candidate('c3', 'barniz marino'), candidate('c4', 'sellador')],
        nextCursor: null
      })
    })

    renderWithTheme(<KeywordDiscoveryWorkbench {...baseProps()} />)

    fireEvent.click(loadMoreButton() as HTMLElement)

    await waitFor(() => expect(screen.getAllByText('barniz marino')).toHaveLength(2))

    // Las ya leídas siguen ahí: acumular, no reemplazar.
    expect(screen.getAllByText('pintura industrial')).toHaveLength(2)

    // 🔴 El invariante que protege la factura.
    expect(fetchMock).toHaveBeenCalledTimes(1)

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit | undefined]

    expect(init?.method).toBe('GET')
    expect(String(url)).toContain('cursor=2')
    expect(String(url)).toContain('runId=run-1')
  })

  it('retira la afordancia cuando el cursor se agota', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ candidates: [candidate('c3', 'barniz marino')], nextCursor: null })
    })

    renderWithTheme(<KeywordDiscoveryWorkbench {...baseProps()} />)

    fireEvent.click(loadMoreButton() as HTMLElement)

    await waitFor(() => expect(loadMoreButton()).not.toBeInTheDocument())
  })

  it('no duplica un candidato que el cursor devolvió dos veces', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        // `c2` ya venía en la primera página: el offset se corrió bajo los pies.
        candidates: [candidate('c2', 'esmalte acrilico'), candidate('c3', 'barniz marino')],
        nextCursor: null
      })
    })

    renderWithTheme(<KeywordDiscoveryWorkbench {...baseProps()} />)

    fireEvent.click(loadMoreButton() as HTMLElement)

    await waitFor(() => expect(screen.getAllByText('barniz marino')).toHaveLength(2))

    // La tabla densa y la card list pintan cada candidato una vez cada una (se alternan por CSS,
    // ambas en el DOM). Duplicar la fila lo llevaría a cuatro.
    expect(screen.getAllByText('esmalte acrilico')).toHaveLength(2)
  })

  it('NO ofrece paginar sobre una corrida viva', () => {
    renderWithTheme(
      <KeywordDiscoveryWorkbench
        {...baseProps({
          run: discoveryRun('running')
        })}
      />
    )

    // Ausente, no deshabilitado: sobre un universo que crece el cursor saltea filas en silencio.
    expect(loadMoreButton()).not.toBeInTheDocument()
  })

  it('conserva lo cargado cuando la página siguiente falla', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'No pudimos cargar más candidatos.', code: 'internal', actionable: true })
    })

    renderWithTheme(<KeywordDiscoveryWorkbench {...baseProps()} />)

    fireEvent.click(loadMoreButton() as HTMLElement)

    // Se apunta al Alert y no a `role='status'`: la superficie ya tiene DOS regiones vivas de
    // TASK-1665 (la banda de costo del builder y el feedback del workbench). Esta task no agrega
    // una tercera, y el test no debe fingir que hay una sola.
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent(/no pudimos cargar más candidatos/i))

    expect(screen.getAllByText('pintura industrial')).toHaveLength(2)
  })
})
