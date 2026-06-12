// @vitest-environment jsdom

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
  })

  it('renders a traceable answer and submits from the composer', () => {
    const onSubmit = vi.fn()
    const modeOptions = [{ value: 'human' as const, label: 'Humano' }]
    const traceSteps = [{ id: 'answer', label: 'Respuesta', description: 'Con citas', metadata: '2 fuentes', state: 'active' as const }]
    const sources = [{ id: 'manual', title: 'Manual: Cómo usar Mi Desempeño' }]
    const proofTabs = [{ value: 'sources' as const, label: 'Fuentes' }]

    const { container, getAllByText, getByRole, getByText, queryByText } = renderWithTheme(
      <NexaKnowledgeAnswerSurface<'human', 'sources'>
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
        proofTab='sources'
        proofTabs={proofTabs}
        onProofTabChange={vi.fn()}
        proofTabsAriaLabel='Prueba'
        proofContent={<p>Fuente revisada</p>}
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

  it('keeps the original trace experience before a user asks a question', () => {
    const modeOptions = [{ value: 'human' as const, label: 'Humano' }]
    const traceSteps = [{ id: 'answer', label: 'Respuesta', description: 'Con citas', metadata: '2 fuentes', state: 'active' as const }]
    const sources = [{ id: 'manual', title: 'Manual: Cómo usar Mi Desempeño' }]
    const proofTabs = [{ value: 'sources' as const, label: 'Fuentes' }]

    const { container, queryByLabelText, queryByText } = renderWithTheme(
      <NexaKnowledgeAnswerSurface<'human', 'sources'>
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
        proofTab='sources'
        proofTabs={proofTabs}
        onProofTabChange={vi.fn()}
        proofTabsAriaLabel='Prueba'
        proofContent={<p>Fuente revisada</p>}
      />
    )

    expect(container.querySelector('[data-state="idle"]')).toBeInTheDocument()
    expect(container.querySelector('[data-capture="nexa-knowledge-trace-steps"]')).toBeInTheDocument()
    expect(queryByText('Respuesta verificable')).toBeInTheDocument()
    expect(queryByText('¿Cómo reviso Mi Desempeño?')).not.toBeInTheDocument()
    expect(queryByLabelText('Haz otra pregunta a Nexa')).not.toBeInTheDocument()
  })
})
