import { describe, expect, it } from 'vitest'

import { resolvePlan } from '@/lib/artifact-composer'
import { deckAxisCatalog } from '@/lib/artifact-composer/catalogs/deck-axis'

import { confirmChapter, hashChapterFacts } from '../chapter-author'
import { diagnosticoChapterAuthor, type DiagnosticoFraming } from '../diagnostico-chapter-author'
import { deriveDiagnosticoFacts, type DiagnosticoSource } from '../diagnostico-facts'
import skySnapshot from './fixtures/grader-report-sky-grun-00046.json'

/**
 * TASK-1415 Slice 5 — el loop integrado: confirm → composer.
 *
 * Las láminas que emite el confirm humano atraviesan el camino REAL del composer
 * (`resolvePlan`: selector de plantilla + validación de forma + semántica del catálogo,
 * fail-closed) y producen un `ResolvedCompositionManifest`. Es la prueba de que el output del
 * motor ES un plan canónico componible — el selector asigna StatSplit/MaturityLadderFull; el
 * author jamás los nombró. (El render con Chromium es la corrida live del script sanity, no CI.)
 */

const SOURCE: DiagnosticoSource = {
  runPublicId: 'EO-GRUN-00046',
  brandName: 'SKY Airline',
  publicReportUrl:
    'https://think.efeoncepro.com/brand-visibility/r/grt-9892e5684c394557a63f8171926871c26d3278216daf42a2a8100951ccb5537f',
  report: skySnapshot as unknown as DiagnosticoSource['report'],
  operatorFacts: [
    {
      factId: 'goal.organic-traffic',
      label: 'Visitas orgánicas mensuales del blog',
      value: '~40.000',
      evidenceRef: 'Semrush · database CL · 2026-07-11'
    }
  ]
}

const GOLDEN_FRAMING: DiagnosticoFraming = {
  eyebrow: 'EL DIAGNÓSTICO',
  title: 'La IA <em>conoce</em> a SKY. Pero su contenido <em>no está</em> en la respuesta',
  narrative: [
    'Medimos la marca antes de escribir esta propuesta, con el mismo instrumento con el que vamos a operar: nuestro AI Visibility Grader, sobre los cinco motores de respuesta, 35 respuestas resueltas.',
    'La conversación sobre viajes la alimentan fuentes de terceros — <strong>la citabilidad del contenido propio es 0%</strong>. El informe está publicado: <a href="https://think.efeoncepro.com/brand-visibility/r/grt-9892e5684c394557a63f8171926871c26d3278216daf42a2a8100951ccb5537f">puede recorrerlo entero</a>.'
  ],
  outcomesEyebrow: 'LO QUE MEDIMOS',
  outcomesTitle: 'Tres hechos, antes de proponer nada',
  goals: [
    {
      factId: 'goal.citability',
      kind: 'citability',
      title: 'Contenido propio citado',
      body: 'De las <strong>254 citas</strong> del estudio, ninguna es contenido editorial de SKY. Responden Trustpilot, Wikipedia e Instagram.'
    },
    {
      factId: 'goal.sov-gap',
      kind: 'growth',
      title: 'LATAM domina la categoría',
      body: 'LATAM se menciona <strong>16 veces</strong> y JetSMART 9. La conversación de categoría tiene dueño, y no es SKY.'
    },
    {
      factId: 'goal.organic-traffic',
      kind: 'visibility',
      title: 'El blog ya trae tráfico',
      body: 'Visitas orgánicas al mes, con páginas <strong>a un paso del top 3</strong>. No partimos de cero: partimos de un activo desaprovechado.'
    }
  ],
  ladderSectionLabel: 'DÓNDE ESTÁ SKY HOY',
  ladderTitle: 'Dos peldaños <em>firmes</em>. Tres por construir.',
  rungBodies: [
    { levelId: 'found', body: 'Aparece en menos de la mitad de las respuestas de descubrimiento de la categoría.' },
    { levelId: 'readable', body: 'La IA sabe quién es SKY y se apoya en fuentes creíbles. Fortaleza a defender.' },
    { levelId: 'correct', body: 'Cuando la IA habla de SKY, no usa su narrativa. Se corrige con contenido propio.' },
    { levelId: 'actionable', body: 'La capa técnica ausente, medida: un agente de IA no puede operar con su sitio.' },
    { levelId: 'intrinsic', body: 'SKY ya es opción por defecto dentro de la categoría. Su otra fortaleza.' }
  ],
  readout: {
    title: 'Por eso el alcance',
    body: 'La escalera es acumulativa: un peldaño no subido bloquea los de arriba. El servicio ataca los tres críticos, empezando por el primero.'
  }
}

describe('diagnostico → composer (loop integrado, camino real de resolvePlan)', () => {
  it('las láminas confirmadas resuelven un manifest: el selector asigna la plantilla, no el author', async () => {
    const facts = deriveDiagnosticoFacts(SOURCE)

    const { slides } = confirmChapter(diagnosticoChapterAuthor, {
      proposal: { chapterId: 'diagnostico', facts, framing: GOLDEN_FRAMING },
      trace: { factsHash: hashChapterFacts(facts), model: 'eval', proposedAt: '2026-07-16T00:00:00Z' },
      actor: { kind: 'member', memberId: 'member-eval' }
    })

    const manifest = await resolvePlan(deckAxisCatalog, {
      artifactId: 'task-1415-diagnostico-integration',
      slides
    })

    const templates = manifest.slides.map(slide => ({ slideId: slide.slideId, template: slide.template }))

    expect(templates).toEqual([
      { slideId: 'diagnostico', template: 'StatSplit' },
      { slideId: 'escalera', template: 'MaturityLadderFull' }
    ])
  })
})
