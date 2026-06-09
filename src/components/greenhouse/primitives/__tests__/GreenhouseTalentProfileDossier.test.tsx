// @vitest-environment jsdom

import { cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { renderWithTheme } from '@/test/render'

import GreenhouseTalentProfileDossier, { type GreenhouseTalentProfileDossierTalent } from '../GreenhouseTalentProfileDossier'

const talent: GreenhouseTalentProfileDossierTalent = {
  id: 'diego-alejandro-perez',
  name: 'Diego Alejandro Pérez',
  initials: 'DP',
  role: 'Backend Engineer',
  space: 'Productos & Pagos',
  roleLabel: 'Software',
  roleIcon: 'tabler-code',
  roleTone: 'info',
  healthLabel: 'Estable',
  healthIcon: 'tabler-shield-check',
  healthTone: 'success',
  allocationFte: 1,
  coveragePct: 90,
  deliveryConfidence: 88,
  backupDepth: '2.1x',
  skills: ['Java', 'Spring Boot', 'Kafka'],
  certifications: ['Spring Professional'],
  languages: ['ES', 'EN'],
  currentFocus: 'Integraciones transaccionales y confiabilidad',
  lastSignal: 'Entrega estable en las últimas 4 semanas'
}

afterEach(cleanup)

describe('GreenhouseTalentProfileDossier', () => {
  it('renders the verified talent dossier contract', () => {
    const { getByLabelText, getByText } = renderWithTheme(<GreenhouseTalentProfileDossier talent={talent} />)

    expect(getByText('Dossier de talento')).toBeInTheDocument()
    expect(getByText('Diego Alejandro Pérez')).toBeInTheDocument()
    expect(getByText('Cobertura del talento')).toBeInTheDocument()
    expect(getByText('Entrega estable en las últimas 4 semanas')).toBeInTheDocument()
    expect(getByLabelText('Talento verificado por Efeonce')).toBeInTheDocument()
    expect(getByLabelText('Java')).toBeInTheDocument()
  })
})
