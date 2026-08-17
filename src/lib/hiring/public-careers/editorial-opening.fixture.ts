// TASK-1740 — Fixture canónica del contrato editorial para el renderer de TASK-1741.
//
// Representa una vacante publicada COMPLETA bajo el contrato nuevo: bloque estructurado
// v1 + países elegibles + compensación estructurada. El renderer de TASK-1741 debe poder
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
  seniority: 'Intermedio',
  processNotes: null,
  applyUrl: null,
  publishedAt: '2026-08-17T12:00:00.000Z',
  content: {
    version: 1,
    promise: 'Vas a operar el motor editorial de Efeonce con autonomía real y evidencia, no volumen.',
    intro:
      'El problema concreto: las marcas necesitan contenido que un motor de respuesta pueda citar. Tu trabajo es producirlo con método, QA y métricas.',
    outcomes: [
      'Publicar 8 piezas al mes con QA editorial completo',
      'Subir el tráfico orgánico calificado de los clientes asignados',
      'Dejar un playbook reusable de atomización por canal',
    ],
    workItems: [
      'Investigar y redactar piezas pillar con claim ledger',
      'Operar el calendario editorial y su distribución',
      'Colaborar con SEO/AEO en briefs y auditorías de citabilidad',
    ],
    essentials: ['Redacción nativa en español', 'SEO on-page', 'Método de research verificable'],
    learnables: ['AEO/GEO', 'Métricas de contenido', 'Distribución social B2B'],
    evidenceAsk: 'Portafolio con 3 piezas publicadas y el contexto de decisión de cada una.',
    remoteModel: '100% remoto con overlap de 4 horas con GMT-4; rituales async y una sync semanal.',
    processSteps: ['Screening', 'Muestra de trabajo pagada', 'Entrevista estructurada final'],
    benefits: ['15 días hábiles de vacaciones remuneradas', 'Presupuesto anual de formación'],
    compensation: { currency: 'USD', minValue: 1100, maxValue: 1300, unitText: 'MONTH' },
  },
  remoteEligibleCountries: ['CL', 'CO', 'MX', 'PE'],
}

/** Vacante legacy sin bloque estructurado: el renderer debe degradar a la prosa. */
export const legacyOpeningFixture: PublicOpeningPayload = {
  ...editorialOpeningFixture,
  publicId: 'EO-OPN-FIXTURE-LEGACY',
  content: null,
  remoteEligibleCountries: [],
  compensationBand: 'USD 1.100–1.300 mensuales, según experiencia y país de contratación',
}
