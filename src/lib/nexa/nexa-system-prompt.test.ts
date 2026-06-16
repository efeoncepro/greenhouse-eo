import { describe, expect, it } from 'vitest'

import type { HomeSnapshot } from '@/types/home'

import {
  NEXA_PROMPT_GOVERNANCE,
  NEXA_SYSTEM_PROMPT_V1_VERSION,
  NEXA_SYSTEM_PROMPT_V2_VERSION,
  buildNexaSystemPromptV1,
  buildNexaSystemPromptV2
} from './nexa-system-prompt'

const baseContext = (overrides: Partial<HomeSnapshot> = {}): HomeSnapshot =>
  ({
    user: { firstName: 'Julio', lastName: 'Reyes', role: 'efeonce_admin' },
    modules: [{ title: 'Agencia' }, { title: 'Finanzas' }],
    tasks: [{ id: 't1' }, { id: 't2' }],
    financeStatus: null,
    ...overrides
  }) as unknown as HomeSnapshot

const FIXED_NOW = new Date('2026-06-14T12:00:00-04:00')

describe('buildNexaSystemPromptV1 (byte-equivalente, rollback)', () => {
  it('arranca con la identidad y reglas base históricas', () => {
    const prompt = buildNexaSystemPromptV1(baseContext(), { knowledgeEnabled: false })

    expect(prompt.startsWith('Eres Nexa, el asistente inteligente de Greenhouse.')).toBe(true)
    expect(prompt).toContain('Tu misión es ayudar a navegar la operación real del portal')
    expect(prompt).toContain('Mantén las respuestas breves para que quepan bien en el panel de Home.')
    expect(prompt).toContain('Recuerda: Eres parte de Efeonce Group')
    expect(prompt).toContain('- Nombre: Julio Reyes')
    expect(prompt).toContain('- Módulos disponibles: Agencia, Finanzas')
  })

  it('incluye las reglas de knowledge solo cuando está habilitado', () => {
    expect(buildNexaSystemPromptV1(baseContext(), { knowledgeEnabled: false })).not.toContain(
      'REGLAS DE BASE DE CONOCIMIENTO'
    )
    const withKnowledge = buildNexaSystemPromptV1(baseContext(), { knowledgeEnabled: true })

    expect(withKnowledge).toContain('REGLAS DE BASE DE CONOCIMIENTO (tool search_knowledge)')
    expect(withKnowledge).toContain('NO agregues una lista de "Fuentes:" al final')
  })

  it('incluye la señal financiera solo cuando hay financeStatus', () => {
    expect(buildNexaSystemPromptV1(baseContext(), { knowledgeEnabled: false })).not.toContain(
      'SEÑAL FINANCIERA DISPONIBLE'
    )

    const withFinance = buildNexaSystemPromptV1(
      baseContext({
        financeStatus: {
          periodLabel: 'Mayo 2026',
          closureStatus: 'provisional',
          readinessPct: 80,
          latestMarginPct: 22,
          latestMarginPeriodLabel: 'Abril 2026'
        }
      } as unknown as Partial<HomeSnapshot>),
      { knowledgeEnabled: false }
    )

    expect(withFinance).toContain('SEÑAL FINANCIERA DISPONIBLE')
    expect(withFinance).toContain('- Período: Mayo 2026')
  })
})

describe('buildNexaSystemPromptV2 (modular + voz + response modes)', () => {
  const v2 = (knowledgeEnabled: boolean) =>
    buildNexaSystemPromptV2(baseContext(), { knowledgeEnabled, now: FIXED_NOW })

  it('refleja la realidad de plataforma y la fecha runtime', () => {
    const prompt = v2(true)

    expect(prompt).toContain('Knowledge Center')
    expect(prompt).toContain('Tools operativos en vivo')
    expect(prompt).toMatch(/Hoy es .* \(America\/Santiago\)/)
  })

  it('encoda el contrato de voz Efeonce (sin jugueton, datos primero, tuteo, emoji gobernado)', () => {
    const prompt = v2(true)

    expect(prompt).toContain('CONTRATO DE VOZ (Efeonce)')
    expect(prompt).toContain('NO jugueton')
    expect(prompt).toContain('Tratamiento "tú" siempre')
    expect(prompt).toContain('superlativos vacíos')
    expect(prompt).toContain('🍏')
    expect(prompt).toContain('MODOS DE RESPUESTA')
  })

  it('política de knowledge: sintetizar, [n] inline, sin "Fuentes:", sin Markdown crudo', () => {
    const prompt = v2(true)

    expect(prompt).toContain('SINTETIZA a través de la evidencia')
    expect(prompt).toContain('NO escribas una lista de "Fuentes:"')
    expect(prompt).toContain('NUNCA muestres marcadores de Markdown estructural crudos')
  })

  it('refuerza el cierre de validación humana en temas sensibles (TASK-1140 gate K6)', () => {
    const prompt = v2(true)

    expect(prompt).toContain('TEMAS SENSIBLES')
    expect(prompt).toContain('tu respuesta NO está completa sin una línea FINAL')
    expect(prompt).toContain('AUNQUE la guía sea clara y tengas evidencia fuerte')
  })

  it('incluye la política de estructura/formato de respuesta (TASK-1138)', () => {
    const prompt = v2(true)

    expect(prompt).toContain('ESTRUCTURA DE LA RESPUESTA')
    expect(prompt).toContain('Viñetas (-) para enumeraciones')
    expect(prompt).toContain('**Negrita** en el dato o concepto clave')
    expect(prompt).toContain('No uses headers (#, ##)')
  })

  it('omite la política de knowledge cuando el retrieval está apagado', () => {
    expect(v2(false)).not.toContain('POLÍTICA DE RESPUESTA DESDE KNOWLEDGE')
  })

  it('es determinista con un `now` fijo', () => {
    expect(v2(true)).toBe(v2(true))
  })
})

describe('golden snapshot del prompt completo (TASK-1126)', () => {
  // Golden determinista del prompt ENTERO (no anclas/substrings): cualquier cambio de texto
  // aparece en el diff del .snap committeado y exige revisión consciente. Para el prompt activo
  // (V2) ese cambio además debe venir con bump de versión + entrada de changelog (lo exige el
  // doc-gate `pnpm nexa:doc-gate --changed`). V1 se snapshotea como red de rollback byte-equivalente.
  it('V2 completo (activo) es estable byte-a-byte', () => {
    const prompt = buildNexaSystemPromptV2(baseContext(), { knowledgeEnabled: true, now: FIXED_NOW })

    expect(prompt).toMatchSnapshot()
  })

  it('V1 completo (rollback byte-equivalente) es estable byte-a-byte', () => {
    const prompt = buildNexaSystemPromptV1(baseContext(), { knowledgeEnabled: true })

    expect(prompt).toMatchSnapshot()
  })
})

describe('versiones de prompt', () => {
  it('expone versiones estables para governance', () => {
    expect(NEXA_SYSTEM_PROMPT_V1_VERSION).toBe('nexa-system-prompt.v1')
    expect(NEXA_SYSTEM_PROMPT_V2_VERSION).toBe('nexa-system-prompt.v2.2.0')
  })
})

describe('governance del prompt (TASK-1124)', () => {
  it('apunta a la versión activa y al rollback correctos', () => {
    expect(NEXA_PROMPT_GOVERNANCE.activeVersion).toBe(NEXA_SYSTEM_PROMPT_V2_VERSION)
    expect(NEXA_PROMPT_GOVERNANCE.rollbackVersion).toBe(NEXA_SYSTEM_PROMPT_V1_VERSION)
    expect(NEXA_PROMPT_GOVERNANCE.activationFlag).toBe('NEXA_SYSTEM_PROMPT_V2_ENABLED')
  })

  it('declara las 4 clases de cambio con su trigger de versión', () => {
    expect(Object.keys(NEXA_PROMPT_GOVERNANCE.changeClasses).sort()).toEqual([
      'editorial',
      'policy',
      'structural',
      'voice'
    ])
  })

  it('el changelog incluye la versión activa como entrada más reciente', () => {
    expect(NEXA_PROMPT_GOVERNANCE.changelog[0]?.version).toBe(NEXA_PROMPT_GOVERNANCE.activeVersion)
  })
})
