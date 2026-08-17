// TASK-1740 — Fixture canónica del contrato editorial para el renderer de TASK-1741.
//
// Representa una vacante publicada COMPLETA bajo el contrato nuevo: bloque estructurado
// v2 + países elegibles + compensación estructurada. El renderer de TASK-1741 debe poder
// construir toda su jerarquía editorial desde este shape sin heurísticas nuevas, y debe
// degradar al fallback de prosa cuando `content` sea null (ver `legacyOpeningFixture`).
//
// Sólo para tests/desarrollo: ningún dato de este archivo es una vacante real.

import type { PublicOpeningPayload } from '@/types/hiring'

export const editorialOpeningFixture: PublicOpeningPayload = {
  publicId: 'EO-OPN-FIXTURE-EDITORIAL',
  title: 'Content Creator — Editorial, SEO/AEO & Social',
  summary: 'Crea contenido editorial con evidencia para marcas reales.',
  description: 'Sobre el rol\n\nProducir piezas pillar con QA editorial.\n\nResponsabilidades\n- Redactar\n- Editar',
  requirements: 'Redacción nativa en español\nSEO on-page',
  niceToHave: 'AEO/GEO',
  locationMode: 'LATAM',
  workMode: 'remote',
  hiringRegion: 'LATAM',
  city: null,
  country: null,
  officeLocation: null,
  area: 'Marketing',
  skillTags: ['SEO', 'Contenido', 'Social', 'Editorial'],
  compensationBand: null,
  employmentMode: 'Jornada completa',
  seniority: 'Semi-senior',
  processNotes: null,
  applyUrl: null,
  publishedAt: '2026-08-17T12:00:00.000Z',
  content: {
    version: 2,
    promise: 'Vas a operar el motor editorial de Efeonce con autonomía real y evidencia, no volumen.',
    intro:
      'El problema concreto: las marcas necesitan contenido que un motor de respuesta pueda citar. Tu trabajo es producirlo con método, QA y métricas.',
    outcomes: [
      'Publicar 8 piezas al mes con QA editorial completo',
      'Subir el tráfico orgánico calificado de los clientes asignados',
      'Dejar un playbook reusable de atomización por canal'
    ],
    workItems: [
      'Investigar y redactar piezas pillar con claim ledger',
      'Operar el calendario editorial y su distribución',
      'Colaborar con SEO/AEO en briefs y auditorías de citabilidad',
      'Documentar decisiones y aprendizajes para reutilizarlos en la siguiente entrega'
    ],
    essentials: [
      'Redacción nativa en español',
      'SEO on-page',
      'Método de research verificable',
      'Criterio para editar y defender decisiones editoriales'
    ],
    preferred: ['Experiencia en agencia o equipos con múltiples marcas'],
    learnables: ['AEO/GEO', 'Métricas de contenido', 'Distribución social B2B'],
    evidenceAsk: 'Portafolio con 3 piezas publicadas y el contexto de decisión de cada una.',
    workModel:
      'En Chile, la vinculación se formaliza mediante contrato laboral local. En los demás países habilitados, usamos una vinculación internacional directa con Efeonce y pago directo.',
    collaboration: {
      team: 'Creative, SEO/AEO y cuentas',
      reportsTo: 'Content Lead',
      language: 'Español; inglés profesional para fuentes',
      timezoneOverlap: '4 horas con GMT-4',
      workingRhythm: 'Trabajo asíncrono con una sincronización semanal'
    },
    process: {
      steps: [
        { title: 'Screening', body: 'Revisamos experiencia, disponibilidad y evidencia existente.' },
        { title: 'Muestra de trabajo pagada', body: 'Evaluamos el trabajo con un brief acotado y remunerado.' },
        { title: 'Entrevista estructurada final', body: 'Profundizamos en decisiones, colaboración y expectativas.' }
      ],
      expectedTiming: 'El proceso completo suele tomar entre 2 y 3 semanas.',
      responseCommitment: 'Te comunicamos la decisión final, avances o no.',
      accommodationPath: 'Puedes solicitar una adaptación del proceso en cualquier etapa.'
    },
    benefits: ['Encuentro presencial anual del equipo Creative, sujeto a planificación.'],
    compensation: { currency: 'USD', minValue: 1100, maxValue: 1300, unitText: 'MONTH' },
    additionalSections: [
      {
        title: 'Primeros 90 días',
        format: 'milestones',
        intro: 'El onboarding prioriza contexto, práctica acompañada y autonomía progresiva.',
        items: ['Conocer el sistema editorial', 'Publicar con acompañamiento', 'Operar una entrega completa']
      },
      {
        title: 'Contexto del portafolio',
        format: 'narrative',
        intro: 'Valoramos el razonamiento detrás de la pieza tanto como su acabado final.',
        items: []
      }
    ]
  },
  remoteEligibleCountries: ['CL', 'CO', 'MX', 'PE']
}

/** Vacante legacy sin bloque estructurado: el renderer debe degradar a la prosa. */
export const legacyOpeningFixture: PublicOpeningPayload = {
  ...editorialOpeningFixture,
  publicId: 'EO-OPN-FIXTURE-LEGACY',
  content: null,
  remoteEligibleCountries: [],
  compensationBand: 'USD 1.100–1.300 mensuales, según experiencia y país de contratación'
}
