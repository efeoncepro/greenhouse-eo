// @vitest-environment jsdom

// TASK-1738 — Contratos de UI del workbench de revisión del run de scoring IA:
// (1) ceguera de la muestra como contrato de UI verificado sobre el DOM (el DTO real del
//     reader omite `proposal`; el DOM jamás contiene score/rationale de la propuesta);
// (2) registro VERAZ de `sawProposalBeforeScoring`: resolver sin expandir envía false,
//     expandir (gesto real) y resolver envía true, y "Aceptar propuesta IA" NO existe sin
//     haber expandido (DDL-3/DDL-4);
// (3) honest provisional coverage: confirm disabled con causa visible (`aria-describedby`)
//     mientras un gate esté abierto — herencia ISSUE-159;
// (4) flag OFF honesto (confirmFlagOff) sin bloquear resoluciones ni cancel;
// (5) stale: banner + confirm bloqueado + cancel disponible;
// (6) estados terminales read-only.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react'

import { renderWithTheme } from '@/test/render'
import { hiringAssessment } from '@/lib/copy/dictionaries/es-CL/hiringAssessment'
import type { AssessmentAiReviewItem, AssessmentAiRunReview } from '@/types/hiring-assessment-ai-run'

import AssessmentAiRunWorkbench, { AssessmentAiRunEntry } from './AssessmentAiRunWorkbench'

const copy = hiringAssessment.scoringRun

const RUN_ID = 'run-1'
const DETAIL_URL = `/api/hiring/assessments/ai/scoring-runs/${RUN_ID}`

const baseRun = {
  runId: RUN_ID,
  assessmentId: 'asm-1',
  applicationId: 'app-1',
  inputDigest: 'digest-1',
  model: 'claude-sonnet-5',
  promptVersion: 'prompt.v1',
  policyVersion: 'hiring_assessment_ai_risk_policy.v1',
  status: 'awaiting_review' as const,
  statusReason: null,
  leaseOwner: null,
  leaseExpiresAt: null,
  createdBy: null,
  createdAt: '2026-08-16T12:00:00.000Z',
  updatedAt: '2026-08-16T12:05:00.000Z',
}

const mandatoryItem: AssessmentAiReviewItem = {
  runItemId: 'item-mandatory-1',
  responseId: 'resp-1',
  status: 'proposed',
  riskClass: 'mandatory_review',
  routingReasons: ['answer_too_short'],
  reasonCode: null,
  attemptCount: 1,
  resolution: null,
  sawProposalBeforeScoring: null,
  resolvedBy: null,
  resolvedAt: null,
  questionPrompt: '¿Cómo priorizas un backlog?',
  questionType: 'open_text',
  answerText: 'Respuesta corta.',
  proposal: {
    proposalId: 'prop-1',
    status: 'proposed',
    score: 68,
    rationale: 'RATIONALE-SECRETO-IA',
    perCriterion: [{ criterion: 'claridad', score: 70 }],
    provider: 'anthropic',
    model: 'claude-sonnet-5',
    promptVersion: 'prompt.v1',
    inputDigest: 'digest-item-1',
  },
}

// DTO REAL del reader para la muestra ciega sin resolver: `proposal` OMITIDO (estructural).
const blindSampleItem: AssessmentAiReviewItem = {
  runItemId: 'item-sample-1',
  responseId: 'resp-2',
  status: 'proposed',
  riskClass: 'quality_sample',
  routingReasons: ['blind_quality_sample'],
  reasonCode: null,
  attemptCount: 1,
  resolution: null,
  sawProposalBeforeScoring: null,
  resolvedBy: null,
  resolvedAt: null,
  questionPrompt: '¿Cómo comunicas un retraso?',
  questionType: 'open_text',
  answerText: 'Aviso temprano al cliente con plan de recuperación.',
  proposal: null,
}

const buildReview = (overrides?: Partial<AssessmentAiRunReview>): AssessmentAiRunReview => ({
  run: { ...baseRun },
  items: [mandatoryItem, blindSampleItem],
  coverage: {
    scoringPending: 0,
    mandatoryPending: 1,
    mandatoryResolved: 0,
    samplePending: 1,
    sampleResolved: 0,
    batchEligible: 4,
    returnedToManual: 1,
    closedWithoutProposal: 0,
    digestStale: false,
  },
  ...overrides,
})

interface RecordedPost {
  url: string
  body: Record<string, unknown>
}

let currentReview: AssessmentAiRunReview
let recordedPosts: RecordedPost[]

const stubFetch = () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)

      if (init?.method === 'POST') {
        recordedPosts.push({ url, body: JSON.parse(String(init.body)) as Record<string, unknown> })

        return Response.json({ ok: true })
      }

      if (url.startsWith(DETAIL_URL)) {
        return Response.json(currentReview)
      }

      throw new Error(`fetch no esperado: ${url}`)
    }),
  )
}

const renderWorkbench = (props?: Partial<Parameters<typeof AssessmentAiRunWorkbench>[0]>) =>
  renderWithTheme(
    <AssessmentAiRunWorkbench
      open
      runId={RUN_ID}
      copy={copy}
      confirmEnabled
      onClose={() => undefined}
      {...props}
    />,
  )

beforeEach(() => {
  currentReview = buildReview()
  recordedPosts = []
  stubFetch()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('TASK-1743 — resumen provisional operator-only', () => {
  it('muestra score, cobertura y disclaimer sin presentarlos como resultado efectivo', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({
      runs: [baseRun],
      confirmEnabled: false,
      mode: 'global_provisional',
      provisional: {
        assessmentId: 'asm-1', applicationId: 'app-1', runId: RUN_ID,
        runStatus: 'awaiting_review', mode: 'global_provisional', status: 'complete',
        overallScore: 76, incorporatedIntoEffectiveScore: false,
        coverage: { totalResponses: 12, evaluatedResponses: 12, effectiveResponses: 2, provisionalResponses: 10, pendingResponses: 0, abstainedResponses: 0, failedResponses: 0 },
        competencies: [{ competencyId: 'comp-1', competencyKey: 'client', competencyName: 'Relación con clientes', targetLevel: 'senior', weight: 20, score: 76, totalResponses: 2, evaluatedResponses: 2, provisionalResponses: 2 }],
        exceptions: [],
        provenance: { model: 'claude-sonnet-5', promptVersion: 'prompt.v2', policyVersion: 'policy.v2:global_provisional', inputDigest: 'digest-1' },
      },
    })))

    renderWithTheme(<AssessmentAiRunEntry assessmentId='asm-1' copy={copy} canScore />)

    expect(await screen.findByText(copy.provisionalTitle)).toBeTruthy()
    expect(screen.getByText(copy.operatorOnly)).toBeTruthy()
    expect(screen.getByText(copy.provisionalDisclaimer)).toBeTruthy()
    expect(screen.getByText('76')).toBeTruthy()
    expect(screen.getByText('Relación con clientes')).toBeTruthy()
    expect(document.querySelector('[data-capture="assessment-ai-coverage"]')).not.toBeNull()
  })

  it('no consulta ni dibuja la proyección sin capability', () => {
    const fetchMock = vi.fn()

    vi.stubGlobal('fetch', fetchMock)
    renderWithTheme(<AssessmentAiRunEntry assessmentId='asm-1' copy={copy} canScore={false} />)

    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.queryByText(copy.provisionalTitle)).toBeNull()
  })
})

const getBlindItem = async () => {
  await screen.findByText(copy.sampleHint)

  const node = document.querySelector('[data-capture="assessment-run-blind-item"]')

  expect(node).not.toBeNull()

  return node as HTMLElement
}

describe('TASK-1738 — ceguera de la muestra como contrato de UI', () => {
  it('el DOM del item quality_sample sin resolver NO contiene score/rationale de propuesta', async () => {
    renderWorkbench()

    const blind = await getBlindItem()
    const text = blind.textContent ?? ''

    expect(text).toContain(copy.sampleHint)
    expect(text).not.toContain('68')
    expect(text).not.toContain('RATIONALE-SECRETO-IA')
    expect(text).not.toContain(copy.revealProposal)
    expect(within(blind).queryByText(copy.resolveConfirm)).toBeNull()

    // El botón de la muestra es "Registrar mi puntaje", nunca confirmar propuesta.
    expect(within(blind).getByText(copy.resolveSample)).toBeTruthy()
  })

  it('puntuar la muestra envía overridden + sawProposalBeforeScoring=false estructural', async () => {
    renderWorkbench()

    const blind = await getBlindItem()
    const scoreInput = within(blind).getByLabelText(copy.myScoreLabel, { selector: 'input' })

    fireEvent.change(scoreInput, { target: { value: '72' } })
    fireEvent.click(within(blind).getByText(copy.resolveSample))

    await waitFor(() => expect(recordedPosts).toHaveLength(1))

    expect(recordedPosts[0].body).toMatchObject({
      action: 'resolve_item',
      runItemId: 'item-sample-1',
      resolution: 'overridden',
      finalScore: 72,
      sawProposalBeforeScoring: false,
    })
  })
})

describe('TASK-1738 — registro veraz de sawProposalBeforeScoring (anti-anclaje)', () => {
  const getMandatoryItem = async () => {
    await screen.findByText(copy.mandatoryChip)

    const chip = screen.getByText(copy.mandatoryChip)

    return chip.closest('li') as HTMLElement
  }

  it('"Aceptar propuesta IA" NO existe sin expandir; abrirla no la marca resuelta y aceptar sí persiste', async () => {
    renderWorkbench()

    const item = await getMandatoryItem()

    // Sin expandir: ni caption de visto ni confirmar propuesta, y la propuesta NO está
    // en el DOM (unmountOnExit — el registro debe ser veraz: expandir = ver).
    expect(within(item).queryByText(copy.resolveConfirm)).toBeNull()
    expect(within(item).queryByText(copy.proposalSeen)).toBeNull()
    expect(item.textContent).not.toContain('RATIONALE-SECRETO-IA')
    expect(item.textContent).not.toContain('68')

    const reveal = within(item).getByText(copy.revealProposal)

    expect(reveal.closest('button')?.getAttribute('aria-expanded')).toBe('false')

    fireEvent.click(reveal)

    // Gesto real registrado: caption + confirmar propuesta disponibles.
    expect(await within(item).findByText(copy.proposalSeen)).toBeTruthy()
    expect(within(item).getByText(copy.resolveConfirm)).toBeTruthy()

    fireEvent.click(within(item).getByText(copy.resolveConfirm))

    await waitFor(() => expect(recordedPosts).toHaveLength(1))

    expect(recordedPosts[0].body).toMatchObject({
      action: 'resolve_item',
      runItemId: 'item-mandatory-1',
      resolution: 'confirmed',
      sawProposalBeforeScoring: true,
    })
  })

  it('corregir con puntaje propio SIN expandir envía sawProposalBeforeScoring=false', async () => {
    renderWorkbench()

    const item = await getMandatoryItem()
    const scoreInput = within(item).getByLabelText(copy.myScoreLabel, { selector: 'input' })

    fireEvent.change(scoreInput, { target: { value: '55' } })
    fireEvent.click(within(item).getByText(copy.resolveOverride))

    await waitFor(() => expect(recordedPosts).toHaveLength(1))

    expect(recordedPosts[0].body).toMatchObject({
      action: 'resolve_item',
      runItemId: 'item-mandatory-1',
      resolution: 'overridden',
      finalScore: 55,
      sawProposalBeforeScoring: false,
    })
  })

  it('el override exige puntaje 0-100 válido antes de habilitar la acción', async () => {
    renderWorkbench()

    const item = await getMandatoryItem()
    const overrideButton = within(item).getByText(copy.resolveOverride).closest('button') as HTMLButtonElement

    expect(overrideButton.disabled).toBe(true)

    const scoreInput = within(item).getByLabelText(copy.myScoreLabel, { selector: 'input' })

    fireEvent.change(scoreInput, { target: { value: '150' } })
    expect(await within(item).findByText(copy.scoreRangeError)).toBeTruthy()
    expect(overrideButton.disabled).toBe(true)

    fireEvent.change(scoreInput, { target: { value: '90' } })
    await waitFor(() => expect(overrideButton.disabled).toBe(false))
  })
})

describe('TASK-1738 — honest provisional coverage (gates del confirm)', () => {
  it('confirm disabled con causas visibles via aria-describedby mientras hay gates abiertos', async () => {
    renderWorkbench()

    await screen.findByText(copy.confirmTitle)

    const confirmButton = screen.getByText(copy.confirmRun).closest('button') as HTMLButtonElement

    expect(confirmButton.disabled).toBe(true)
    expect(confirmButton.getAttribute('aria-describedby')).toBe('assessment-run-confirm-gates')

    const gates = document.getElementById('assessment-run-confirm-gates') as HTMLElement

    expect(gates.textContent).toContain('Faltan 1 excepciones por resolver.')
    expect(gates.textContent).toContain('Falta puntuar 1 de la muestra ciega.')
  })

  it('la cobertura muestra pendientes, devoluciones y cierres — nunca un run parcial como completo', async () => {
    renderWorkbench()

    await screen.findByText(copy.confirmTitle)

    const coverage = document.querySelector('[data-capture="assessment-run-coverage"]') as HTMLElement

    expect(coverage.textContent).toContain('Excepciones: 0 de 1 resueltas')
    expect(coverage.textContent).toContain('Muestra ciega: 0 de 1 puntuadas')
    expect(coverage.textContent).toContain('1 devueltas a corrección manual')
  })
})

describe('TASK-1738 — flag OFF honesto y stale', () => {
  it('flag OFF: alert confirmFlagOff + confirm no operativo; resolver items sigue disponible', async () => {
    currentReview = buildReview({
      coverage: { ...buildReview().coverage, mandatoryPending: 0, samplePending: 0 },
    })

    renderWorkbench({ confirmEnabled: false })

    await screen.findByText(copy.confirmTitle)

    expect(screen.getByText(copy.confirmFlagOff)).toBeTruthy()

    const confirmButton = screen.getByText(copy.confirmRun).closest('button') as HTMLButtonElement

    expect(confirmButton.disabled).toBe(true)
    expect(confirmButton.getAttribute('aria-describedby')).toBe('assessment-run-confirm-flag-off')

    // Resolver items y cancelar siguen operables (DDL-5).
    expect(screen.getByText(copy.resolveSample)).toBeTruthy()

    const cancelButton = screen.getByText(copy.cancelRun).closest('button') as HTMLButtonElement

    expect(cancelButton.disabled).toBe(false)
  })

  it('digestStale: banner + confirm bloqueado con gateStale + cancel disponible', async () => {
    currentReview = buildReview({
      coverage: { ...buildReview().coverage, mandatoryPending: 0, samplePending: 0, digestStale: true },
    })

    renderWorkbench()

    await screen.findByText(copy.confirmTitle)

    expect(screen.getByText(copy.staleBanner)).toBeTruthy()

    const confirmButton = screen.getByText(copy.confirmRun).closest('button') as HTMLButtonElement

    expect(confirmButton.disabled).toBe(true)
    expect(document.getElementById('assessment-run-confirm-gates')?.textContent).toContain(copy.gateStale)

    const cancelButton = screen.getByText(copy.cancelRun).closest('button') as HTMLButtonElement

    expect(cancelButton.disabled).toBe(false)
  })
})

describe('TASK-1738 — estados terminales read-only', () => {
  it('run cancelado: mensaje terminal con razón + sin región de confirmación ni resoluciones', async () => {
    currentReview = buildReview({
      run: { ...baseRun, status: 'cancelled', statusReason: 'operator_cancelled' },
      items: [],
      coverage: {
        ...buildReview().coverage,
        mandatoryPending: 0,
        samplePending: 0,
        batchEligible: 0,
        closedWithoutProposal: 2,
      },
    })

    renderWorkbench()

    await screen.findByText('Run cancelado (operator_cancelled). Las respuestas siguen en la cola manual.')

    expect(screen.queryByText(copy.confirmRun)).toBeNull()
    expect(screen.queryByText(copy.resolveSample)).toBeNull()
  })

  it('run fallido: statusReason visible + promesa de que nada se pierde', async () => {
    currentReview = buildReview({
      run: { ...baseRun, status: 'failed', statusReason: 'run_cost_cap_exceeded' },
      items: [],
    })

    renderWorkbench()

    await screen.findByText(
      'El run falló: run_cost_cap_exceeded. Ninguna respuesta se pierde: siguen en la cola manual.',
    )

    expect(screen.queryByText(copy.confirmRun)).toBeNull()
  })
})
