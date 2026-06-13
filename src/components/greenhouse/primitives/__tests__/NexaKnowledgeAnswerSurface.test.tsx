// @vitest-environment jsdom
/* eslint-disable greenhouse/no-untokenized-copy */

import { cleanup, fireEvent } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'

import NexaKnowledgeAnswerSurface from '../NexaKnowledgeAnswerSurface'
import {
  resolveNexaKnowledgeAnswerSurfaceKind,
  resolveNexaKnowledgeAnswerSurfaceVariant
} from '../nexa-knowledge-answer-surface-controller'

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('NexaKnowledgeAnswerSurface', () => {
  it('resolves the knowledge answer trace kind to the conversation trace variant', () => {
    expect(resolveNexaKnowledgeAnswerSurfaceKind('knowledgeAnswerTrace').variant).toBe('conversationTrace')
    expect(resolveNexaKnowledgeAnswerSurfaceVariant(undefined, 'knowledgeAnswerTrace').proofPlacement).toBe('sidecar')
    expect(resolveNexaKnowledgeAnswerSurfaceKind('knowledgeToolResult').variant).toBe('toolResult')
    expect(resolveNexaKnowledgeAnswerSurfaceVariant(undefined, 'knowledgeToolResult').proofPlacement).toBe('inline')
  })

  it('renders a traceable answer and submits from the composer', () => {
    const onSubmit = vi.fn()
    const modeOptions = [{ value: 'human' as const, label: 'Humano' }]
    const traceSteps = [{ id: 'answer', label: 'Respuesta', description: 'Con citas', metadata: '2 fuentes', state: 'active' as const }]
    const sources = [{ id: 'manual', title: 'Manual: Cómo usar Mi Desempeño' }]
    const proofTabs = [{ id: 'sources' as const, label: 'Fuentes', content: <p>Fuente revisada</p> }]

    const { container, getAllByText, getByRole, getByText, queryByText } = renderWithTheme(
      <NexaKnowledgeAnswerSurface<'human'>
        kind='knowledgeAnswerTrace'
        question='¿Cómo reviso Mi Desempeño?'
        draft='Nueva pregunta'
        onDraftChange={vi.fn()}
        onSubmit={onSubmit}
        commandPlaceholder='Pregúntale a Nexa'
        followUpPlaceholder='Haz otra pregunta a Nexa'
        sendLabel='Preguntar'
        mode='human'
        modeOptions={modeOptions}
        onModeChange={vi.fn()}
        modeHelper='Modo humano'
        modeSelectorAriaLabel='Modo de respuesta'
        traceSteps={traceSteps}
        responseTitle='Respuesta verificable'
        responseThinkingLabel='Nexa está refinando la respuesta'
        responseModeLabel='Modo Humano'
        answerIntro='Respuesta con fuentes.'
        answerSteps={['Paso uno']}
        sourcesLabel='Fuentes'
        sources={sources}
        warningTitle='No consulté datos actuales'
        warningBody='Usa guías publicadas.'
        proofTitle='Prueba y trazabilidad'
        proofTabs={proofTabs}
        proofTabsAriaLabel='Prueba'
      />
    )

    expect(getByRole('region', { name: 'Respuesta trazable de Nexa para Knowledge' })).toBeInTheDocument()
    expect(getByText('¿Cómo reviso Mi Desempeño?')).toBeInTheDocument()
    expect(getAllByText('Nexa').length).toBeGreaterThan(0)
    expect(queryByText('Respuesta verificable')).not.toBeInTheDocument()
    expect(queryByText('Modo Humano')).not.toBeInTheDocument()

    const questionBubble = container.querySelector('[data-capture="nexa-knowledge-question-bubble"]')
    const assistantIdentity = container.querySelector('[data-capture="nexa-knowledge-assistant-identity"]')

    expect(questionBubble).toBeInTheDocument()
    expect(assistantIdentity).toBeInTheDocument()
    expect(questionBubble?.compareDocumentPosition(assistantIdentity as Node)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)

    fireEvent.click(getByRole('button', { name: 'Preguntar' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('keeps the Google AI Mode idle state clean before a user asks a question', () => {
    const modeOptions = [{ value: 'human' as const, label: 'Humano' }]
    const traceSteps = [{ id: 'answer', label: 'Respuesta', description: 'Con citas', metadata: '2 fuentes', state: 'active' as const }]
    const sources = [{ id: 'manual', title: 'Manual: Cómo usar Mi Desempeño' }]
    const proofTabs = [{ id: 'sources' as const, label: 'Fuentes', content: <p>Fuente revisada</p> }]

    const { container, getByLabelText, queryByLabelText, queryByText } = renderWithTheme(
      <NexaKnowledgeAnswerSurface<'human'>
        kind='knowledgeAnswerTrace'
        question='¿Cómo reviso Mi Desempeño?'
        conversationStarted={false}
        draft=''
        onDraftChange={vi.fn()}
        onSubmit={vi.fn()}
        commandPlaceholder='Pregúntale a Nexa'
        followUpPlaceholder='Haz otra pregunta a Nexa'
        sendLabel='Preguntar'
        mode='human'
        modeOptions={modeOptions}
        onModeChange={vi.fn()}
        modeHelper='Modo humano'
        modeSelectorAriaLabel='Modo de respuesta'
        traceSteps={traceSteps}
        responseTitle='Respuesta verificable'
        responseThinkingLabel='Nexa está refinando la respuesta'
        responseModeLabel='Modo Humano'
        answerIntro='Respuesta con fuentes.'
        answerSteps={['Paso uno']}
        sourcesLabel='Fuentes'
        sources={sources}
        warningTitle='No consulté datos actuales'
        warningBody='Usa guías publicadas.'
        proofTitle='Prueba y trazabilidad'
        proofTabs={proofTabs}
        proofTabsAriaLabel='Prueba'
      />
    )

    expect(container.querySelector('[data-state="idle"]')).toBeInTheDocument()
    expect(container.querySelector('[data-capture="nexa-knowledge-top-composer"]')).toBeInTheDocument()
    expect(container.querySelector('[data-capture="nexa-knowledge-trace-steps"]')).not.toBeInTheDocument()
    expect(container.querySelector('[data-capture="nexa-knowledge-conversation-lane"]')).not.toBeInTheDocument()
    expect(container.querySelector('[data-capture="nexa-knowledge-proof-panel"]')).not.toBeInTheDocument()
    expect(getByLabelText('Pregúntale a Nexa')).toBeInTheDocument()
    expect(queryByText('Respuesta verificable')).not.toBeInTheDocument()
    expect(queryByText('¿Cómo reviso Mi Desempeño?')).not.toBeInTheDocument()
    expect(queryByLabelText('Haz otra pregunta a Nexa')).not.toBeInTheDocument()
  })

  it('renders a shared evidence packet inside the proof panel', () => {
    const { getAllByText, getByText } = renderWithTheme(
      <NexaKnowledgeAnswerSurface<'human'>
        kind='knowledgeAnswerTrace'
        question='¿Qué significa Impacto?'
        draft=''
        onDraftChange={vi.fn()}
        onSubmit={vi.fn()}
        commandPlaceholder='Pregúntale a Nexa'
        followUpPlaceholder='Haz otra pregunta a Nexa'
        sendLabel='Preguntar'
        mode='human'
        modeOptions={[{ value: 'human', label: 'Humano' }]}
        onModeChange={vi.fn()}
        modeHelper='Modo humano'
        modeSelectorAriaLabel='Modo de respuesta'
        traceSteps={[]}
        responseTitle='Respuesta verificable'
        responseThinkingLabel='Nexa está refinando la respuesta'
        responseModeLabel='Modo Humano'
        answerIntro='Impacto mide contribución a objetivos clave.'
        answerSteps={['Revisa tus objetivos activos.']}
        sourcesLabel='Fuentes'
        sources={[{ id: 'manual', title: 'Manual: Métricas ICO' }]}
        warningTitle='No consulté datos actuales'
        warningBody='Usa guías publicadas.'
        proofTitle='Fuentes y trazabilidad'
        proofTabs={[{ id: 'sources', label: 'Fuentes', builtin: 'sources' }]}
        proofTabsAriaLabel='Prueba'
        evidence={{
          contractVersion: 'nexa-evidence.v1',
          kind: 'knowledge',
          sourceContractVersion: 'knowledge-search.v1',
          query: 'Impacto',
          confidence: 'high',
          freshness: 'current',
          deniedOrFilteredCount: 0,
          maxScore: 0.91,
          citedDocumentCount: 1,
          primaryFeedbackTarget: { documentId: 'doc-1', chunkId: 'chunk-1' },
          traceSteps: [
            {
              id: 'retrieval',
              label: 'Buscó 1 fragmento útil',
              description: 'Confianza de búsqueda: Alta',
              metadata: 'puntaje máx. 0.91',
              state: 'active'
            }
          ],
          sources: [
            {
              id: 'chunk-1',
              documentId: 'doc-1',
              title: 'Glosario: Métricas ICO personales',
              citationLabel: 'Glosario: Métricas ICO personales',
              headingPath: ['Impacto'],
              excerpt: 'Impacto mide la contribución al logro de objetivos clave con foco en resultados.',
              humanUrl: '/knowledge/documents/doc-1',
              freshness: 'current',
              score: 0.91
            }
          ]
        }}
      />
    )

    expect(getByText('Evidencia versionada desde knowledge-search.v1.')).toBeInTheDocument()
    expect(getAllByText('Glosario: Métricas ICO personales').length).toBeGreaterThan(0)
    expect(getByText('Buscó 1 fragmento útil')).toBeInTheDocument()
  })
})
