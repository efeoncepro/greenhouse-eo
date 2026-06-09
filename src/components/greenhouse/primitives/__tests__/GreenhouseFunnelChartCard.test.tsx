// @vitest-environment jsdom
/* eslint-disable greenhouse/no-untokenized-copy -- fixture copy for primitive rendering assertions */

import { cleanup, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { renderWithTheme } from '@/test/render'

import GreenhouseFunnelChartCard from '../GreenhouseFunnelChartCard'
import type { GreenhouseFunnelMetric, GreenhouseFunnelStage } from '../GreenhouseFunnelChartCard'

vi.mock('@/hooks/useReducedMotion', () => ({
  default: () => true
}))

const metrics: GreenhouseFunnelMetric[] = [
  { id: 'retention', label: 'Retención', value: '29.7%', icon: 'tabler-trending-up', tone: 'success' },
  { id: 'risk', label: 'SLA en riesgo', value: '7', icon: 'tabler-alert-triangle', tone: 'warning' }
]

const stages: GreenhouseFunnelStage[] = [
  {
    id: 'briefing',
    label: 'Briefing',
    value: 64,
    icon: 'tabler-file-description',
    slaLabel: 'SLA <= 2d',
    retainedRate: 100,
    stageRole: 'intake',
    health: 'success',
    diagnostic: {
      blockers: 0,
      blockersTone: 'success',
      ownerName: 'Ana R.',
      ownerInitials: 'AR',
      freshnessLabel: '11m atrás',
      freshnessTone: 'success'
    }
  },
  {
    id: 'changes',
    label: 'Cambios',
    value: 22,
    icon: 'tabler-refresh',
    slaLabel: 'SLA <= 3d',
    retainedRate: 34.4,
    stageRole: 'rework',
    health: 'error',
    diagnostic: {
      blockers: 5,
      blockersTone: 'error',
      ownerName: 'Juan P.',
      ownerInitials: 'JP',
      freshnessLabel: '2h atrás',
      freshnessTone: 'warning'
    }
  }
]

afterEach(cleanup)

describe('GreenhouseFunnelChartCard', () => {
  it('renders the operational pipeline with accessible stage controls', () => {
    const { getAllByText, getByLabelText, getByRole, getByText, queryByText } = renderWithTheme(
      <GreenhouseFunnelChartCard
        title='CSC delivery pipeline'
        subtitle='Briefing -> Cambios'
        metrics={metrics}
        stages={stages}
        kind='cscPipeline'
        insight={{ label: 'Cambios concentra 42% del atraso', actionLabel: 'Abrir sidecar' }}
      />
    )

    expect(getByText('CSC delivery pipeline')).toBeInTheDocument()
    expect(getByRole('group', { name: /CSC delivery pipeline/i })).toBeInTheDocument()
    expect(getByRole('button', { name: /Briefing: 64, 100.0% retenido/i })).toHaveAttribute(
      'aria-pressed',
      'false'
    )
    expect(getByRole('button', { name: /Cambios: 22, 34.4% retenido/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(getByLabelText(/Consulta a Nexa sobre este funnel/i)).toBeInTheDocument()
    expect(queryByText('Consulta a Nexa sobre este funnel')).not.toBeInTheDocument()
    expect(queryByText('Foco actual: Cambios')).not.toBeInTheDocument()
    expect(getAllByText('Cambios').length).toBeGreaterThan(0)
    expect(getAllByText('Juan P.').length).toBeGreaterThan(0)
    expect(getByRole('textbox', { name: /Pregunta para Nexa/i })).toBeInTheDocument()
  })

  it('updates the selected stage when a stage is clicked', () => {
    const { getByRole, getByText } = renderWithTheme(
      <GreenhouseFunnelChartCard title='Pipeline' metrics={metrics} stages={stages} kind='cscPipeline' />
    )

    fireEvent.click(getByRole('button', { name: /Briefing: 64/i }))

    expect(getByRole('button', { name: /Briefing: 64/i })).toHaveAttribute('aria-pressed', 'true')
    expect(getByText(/Lectura de etapa: Briefing \(100.0%\)/i)).toBeInTheDocument()
  })

  it('keeps Nexa prompt ideas inside the input without duplicated suggestion chips', () => {
    const { getByRole, queryByText } = renderWithTheme(
      <GreenhouseFunnelChartCard
        title='Pipeline'
        metrics={metrics}
        stages={stages}
        kind='cscPipeline'
        insight={{ label: 'Cambios concentra 42% del atraso', actionLabel: 'Abrir sidecar' }}
      />
    )

    const prompt = getByRole('textbox', { name: /Pregunta para Nexa/i })

    expect(prompt).toHaveAttribute('placeholder', '¿Qué retrabajo pesa más?')
    expect(queryByText('Priorizar bloqueos')).not.toBeInTheDocument()
  })

  it('submits Nexa prompts with selected stage context', () => {
    const onNexaPromptSubmit = vi.fn()

    const { getByRole } = renderWithTheme(
      <GreenhouseFunnelChartCard
        title='Pipeline'
        metrics={metrics}
        stages={stages}
        kind='cscPipeline'
        onNexaPromptSubmit={onNexaPromptSubmit}
      />
    )

    fireEvent.change(getByRole('textbox', { name: /Pregunta para Nexa/i }), {
      target: { value: 'Qué hago primero' }
    })
    fireEvent.click(getByRole('button', { name: /Enviar pregunta/i }))

    expect(onNexaPromptSubmit).toHaveBeenCalledWith(
      'Qué hago primero',
      expect.objectContaining({
        stage: expect.objectContaining({ id: 'changes', roleLabel: 'Retrabajo', retained: 34.4 }),
        metrics,
        summary: expect.stringContaining('Cambios: 22')
      })
    )
  })

  it('renders an honest empty state when no stages are available', () => {
    const { getByText, queryByRole } = renderWithTheme(
      <GreenhouseFunnelChartCard title='Pipeline' metrics={metrics} stages={[]} kind='cscPipeline' />
    )

    expect(getByText('Sin etapas para graficar')).toBeInTheDocument()
    expect(queryByRole('group', { name: /Pipeline/i })).not.toBeInTheDocument()
  })

  it('sanitizes invalid stage values instead of rendering NaN', () => {
    const { getByRole } = renderWithTheme(
      <GreenhouseFunnelChartCard
        title='Pipeline'
        metrics={metrics}
        stages={[{ id: 'broken', label: 'Broken', value: Number.NaN, icon: 'tabler-alert-circle' }]}
      />
    )

    expect(getByRole('button', { name: /Broken: 0, 100.0% retenido/i })).toBeInTheDocument()
  })
})
