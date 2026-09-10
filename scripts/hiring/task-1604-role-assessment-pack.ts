import type { AssessmentMethod, CreateQuestionInput, CreateTemplateInput } from '@/types/hiring-assessment'

export type BarsDimension = {
  name: string
  evidence: string
}

export type RoleQuestionSpec = CreateQuestionInput & {
  key: string
  timeboxMinutes: number
  evidenceExpected: string[]
}

export type InterviewPrompt = {
  competencyKey: string
  prompt: string
  probes: string[]
  evidenceExpected: string[]
  redFlags: string[]
}

export type RoleAssessmentPack = {
  key: 'seo_specialist_senior_v1' | 'art_director_senior_v1'
  role: string
  method: AssessmentMethod
  template: CreateTemplateInput
  materialization: 'after_sme_activation' | 'interviewer_runtime_has_no_template_binding'
  timeboxMinutes: number
  instructions: string[]
  questions: RoleQuestionSpec[]
  interviewGuide: InterviewPrompt[]
}

export type PersistedTemplateCandidate = {
  templateId: string
  roleHint: string | null
  modules: Array<{ competencyKey: string; targetLevel: string | null; weight: number }>
}

const normalizedTemplateModules = (
  modules: Array<{ competencyKey: string; targetLevel?: string | null; weight: number }>,
) =>
  modules
    .map(module => ({
      competencyKey: module.competencyKey,
      targetLevel: module.targetLevel ?? null,
      weight: Number(module.weight),
    }))
    .sort((left, right) => left.competencyKey.localeCompare(right.competencyKey))

export const resolveReusableTemplateId = (
  expected: CreateTemplateInput,
  candidates: PersistedTemplateCandidate[],
): string | null => {
  if (candidates.length === 0) return null

  const expectedModules = JSON.stringify(normalizedTemplateModules(expected.modules))

  const exact = candidates.filter(
    candidate =>
      candidate.roleHint === (expected.roleHint ?? null) &&
      JSON.stringify(normalizedTemplateModules(candidate.modules)) === expectedModules,
  )

  if (exact.length === 1) return exact[0].templateId

  if (exact.length > 1) {
    throw new Error(`${expected.name}: multiple active templates match the exact TASK-1604 contract`)
  }

  throw new Error(`${expected.name}: active template name collision with a different role hint or module contract`)
}

const barsRubric = (dimensions: BarsDimension[], redFlags: string[]) => ({
  version: 'bars.v1',
  scoring: {
    scale: '1-5 por dimensión',
    conversionTo100: { '1': 20, '2': 40, '3': 60, '4': 80, '5': 100 },
    anchors: {
      '1': 'Respuesta genérica o tácticamente riesgosa; no usa la evidencia disponible ni explicita decisiones.',
      '3': 'Respuesta viable y estructurada; usa evidencia suficiente, prioriza y reconoce límites relevantes.',
      '5': 'Respuesta sobresaliente; conecta evidencia, decisión, trade-offs, verificación y aprendizaje reusable.',
    },
    rule: 'Puntuar cada dimensión por separado antes de calcular el promedio. No compensar un riesgo crítico con buena presentación.',
  },
  dimensions,
  redFlags,
})

const SEO_MODULES: CreateTemplateInput['modules'] = [
  { competencyKey: 'seo_technical_strategy', targetLevel: 'avanzado', weight: 30 },
  { competencyKey: 'search_content_aeo', targetLevel: 'avanzado', weight: 20 },
  { competencyKey: 'search_measurement', targetLevel: 'avanzado', weight: 20 },
  { competencyKey: 'research_synthesis', targetLevel: 'avanzado', weight: 10 },
  { competencyKey: 'communication', targetLevel: 'avanzado', weight: 10 },
  { competencyKey: 'ownership', targetLevel: 'avanzado', weight: 10 },
]

const SEO_QUESTIONS: RoleQuestionSpec[] = [
  {
    key: 'seo-technical-diagnosis',
    competencyKey: 'seo_technical_strategy',
    level: 'avanzado',
    type: 'situational',
    timeboxMinutes: 10,
    prompt:
      'Caso ficticio. Un sitio B2B de 18.000 URLs perdió 34% de clics orgánicos no-branded en seis semanas. Hubo una migración parcial de plantillas, aumentaron las URLs “Descubierta: actualmente sin indexar”, el sitemap incluye filtros y el equipo atribuye todo a una actualización de Google. Diseña un plan de diagnóstico para las primeras 48 horas. Ordena tus cinco primeras comprobaciones, indica qué evidencia buscarías, qué hipótesis podría confirmar o descartar cada una y qué cambio evitarías hacer todavía.',
    evidenceExpected: [
      'Separa síntomas, hipótesis y hechos.',
      'Prioriza por impacto, reversibilidad y costo de información.',
      'Incluye rastreo/indexación, migración, arquitectura y comportamiento de búsqueda.',
      'Define qué no cambiaría sin evidencia.',
    ],
    rubric: barsRubric(
      [
        { name: 'Diagnóstico causal', evidence: 'Distingue migración, cobertura, demanda/algoritmo y problemas técnicos sin asumir una única causa.' },
        { name: 'Priorización', evidence: 'Ordena comprobaciones por valor informativo, impacto y riesgo.' },
        { name: 'Instrumentación', evidence: 'Nombra fuentes, cortes y comparaciones suficientes para aceptar o refutar hipótesis.' },
        { name: 'Control de riesgo', evidence: 'Evita cambios masivos antes de aislar la causa y propone verificación reversible.' },
      ],
      ['Atribuye la caída a Google sin investigar.', 'Propone desindexar, redirigir o reescribir masivamente como primer paso.'],
    ),
  },
  {
    key: 'seo-technical-prioritization',
    competencyKey: 'seo_technical_strategy',
    level: 'avanzado',
    type: 'open_text',
    timeboxMinutes: 8,
    prompt:
      'En el mismo caso ficticio encuentras cuatro hallazgos: 4.000 URLs de filtros rastreables sin valor, canonical cruzado en 12 plantillas de alto tráfico, LCP móvil lento en todo el sitio y 160 enlaces internos rotos. Tienes capacidad de desarrollo para una sola intervención esta semana. Elige una, explica por qué gana, qué información falta para confirmar la prioridad y define un criterio de éxito y uno de rollback. Máximo 300 palabras.',
    evidenceExpected: ['Compara alcance, impacto y riesgo.', 'Evita decidir sólo por volumen.', 'Define éxito y rollback observables.'],
    rubric: barsRubric(
      [
        { name: 'Criterio de prioridad', evidence: 'Combina impacto sobre URLs/queries valiosas, severidad, confianza y esfuerzo.' },
        { name: 'Uso de incertidumbre', evidence: 'Declara qué dato faltante podría cambiar la decisión.' },
        { name: 'Plan verificable', evidence: 'Formula señal de éxito, ventana de observación y rollback.' },
      ],
      ['Elige por cantidad de URLs sin considerar valor.', 'Promete recuperación de rankings como resultado garantizado.'],
    ),
  },
  {
    key: 'seo-aeo-content-architecture',
    competencyKey: 'search_content_aeo',
    level: 'avanzado',
    type: 'situational',
    timeboxMinutes: 9,
    prompt:
      'Caso ficticio. Una empresa de software quiere ser la referencia para “cómo conciliar marketing y ventas”, pero hoy tiene cinco artículos solapados, una landing comercial y opiniones sin fuente. Propón una arquitectura de búsqueda y contenido que sirva tanto a personas como a motores y asistentes de IA. Incluye intención, entidades/subpreguntas, decisión de consolidar o separar, evidencia necesaria, enlaces internos, datos estructurados sólo cuando correspondan y siguiente paso de negocio.',
    evidenceExpected: ['Modela intención y entidades.', 'Resuelve canibalización con criterio.', 'Distingue estructura, evidencia y schema.', 'Conecta utilidad con siguiente paso.'],
    rubric: barsRubric(
      [
        { name: 'Modelo de necesidad', evidence: 'Representa intención, subpreguntas y entidades relevantes sin reducirlo a keywords.' },
        { name: 'Arquitectura', evidence: 'Define roles de página, consolidación y enlaces con una lógica verificable.' },
        { name: 'Citabilidad y evidencia', evidence: 'Identifica claims, fuentes, autoría/actualización y bloques autocontenidos útiles.' },
        { name: 'Integridad técnica', evidence: 'Usa structured data sólo cuando representa contenido real y evita tácticas manipulativas.' },
      ],
      ['Confunde AEO con repetir preguntas.', 'Propone schema o claims que la página no puede demostrar.'],
    ),
  },
  {
    key: 'seo-aeo-serp-critique',
    competencyKey: 'search_content_aeo',
    level: 'avanzado',
    type: 'open_text',
    timeboxMinutes: 7,
    prompt:
      'Una página abre con 450 palabras de marca antes de responder, presenta una cifra sin fuente, usa seis H2 casi idénticos y cierra con “Contáctanos”. Reescribe únicamente el esquema de la primera pantalla y la jerarquía de secciones. Explica qué conservarías, qué eliminarías y cómo comprobarías que la mejora responde mejor a la intención sin medir éxito sólo por posición. Máximo 250 palabras.',
    evidenceExpected: ['Respuesta directa y jerarquía clara.', 'Tratamiento explícito del claim sin fuente.', 'Medición más amplia que ranking.'],
    rubric: barsRubric(
      [
        { name: 'Utilidad inicial', evidence: 'Pone una respuesta clara y específica antes del discurso de marca.' },
        { name: 'Jerarquía informativa', evidence: 'Organiza subpreguntas sin duplicación y conduce a una decisión.' },
        { name: 'Evidencia', evidence: 'Retira, califica o respalda la cifra; no la maquilla.' },
        { name: 'Validación', evidence: 'Combina comportamiento, visibilidad, calidad y conversión apropiada.' },
      ],
      ['Mantiene el claim sin fuente.', 'Optimiza únicamente densidad o posición.'],
    ),
  },
  {
    key: 'seo-measurement-plan',
    competencyKey: 'search_measurement',
    level: 'avanzado',
    type: 'situational',
    timeboxMinutes: 9,
    prompt:
      'Caso ficticio. Tras publicar un hub, las impresiones suben 40%, los clics 8%, las sesiones orgánicas GA4 3% y los leads atribuidos bajan 5%. Diseña un plan de lectura antes de declarar éxito o fracaso. Incluye definiciones, segmentaciones, problemas de medición, ventana temporal, comparación o control razonable y la decisión que tomarías bajo tres posibles resultados.',
    evidenceExpected: ['Reconcilia fuentes y definiciones.', 'Segmenta intención/brand/dispositivo/landing.', 'Evita atribución causal automática.', 'Predefine decisiones.'],
    rubric: barsRubric(
      [
        { name: 'Lectura de métricas', evidence: 'Distingue exposición, visita, calidad y outcome; no promedia señales incompatibles.' },
        { name: 'Calidad del dato', evidence: 'Revisa cobertura, tracking, atribución, estacionalidad y cambios de mix.' },
        { name: 'Diseño de evaluación', evidence: 'Propone cortes, baseline y ventana suficientes para reducir explicaciones alternativas.' },
        { name: 'Decisión', evidence: 'Conecta escenarios de evidencia con mantener, corregir o detener.' },
      ],
      ['Declara éxito por impresiones.', 'Atribuye leads a SEO sin revisar medición ni mix.'],
    ),
  },
  {
    key: 'seo-measurement-experiment',
    competencyKey: 'search_measurement',
    level: 'avanzado',
    type: 'open_text',
    timeboxMinutes: 7,
    prompt:
      'Tienes diez páginas comparables y capacidad para mejorar sólo cinco. Diseña un experimento práctico para evaluar una nueva estructura de respuesta inicial y enlaces internos. Define unidad de análisis, selección de páginas, métricas primarias/secundarias, guardrails, duración mínima, factores de confusión y qué conclusión no permitirían los datos. Máximo 300 palabras.',
    evidenceExpected: ['Diseño comparable y factible.', 'Métrica primaria coherente.', 'Guardrails y límites causales.'],
    rubric: barsRubric(
      [
        { name: 'Diseño', evidence: 'Construye comparación razonable y evita elegir tratamiento por resultado esperado.' },
        { name: 'Métricas', evidence: 'Predefine resultado primario, secundarios y señales de daño.' },
        { name: 'Inferencia', evidence: 'Explicita confusores, potencia limitada y conclusiones no soportadas.' },
      ],
      ['Cambia todas las páginas a la vez.', 'Selecciona sólo las páginas con mejor tendencia previa.'],
    ),
  },
  {
    key: 'seo-research-synthesis',
    competencyKey: 'research_synthesis',
    level: 'avanzado',
    type: 'open_text',
    timeboxMinutes: 6,
    prompt:
      'Para una recomendación SEO recibes: documentación oficial que describe una limitación, un estudio de proveedor con muestra no declarada, tres casos internos con resultados mixtos y una opinión viral. En máximo 220 palabras, ordena la evidencia, explica qué afirmarías hoy, qué no afirmarías y qué prueba adicional reduciría más la incertidumbre.',
    evidenceExpected: ['Jerarquiza fuentes por pertinencia y calidad.', 'Separa observación de causalidad.', 'Formula una prueba informativa.'],
    rubric: barsRubric(
      [
        { name: 'Evaluación de fuentes', evidence: 'Pondera autoridad, método, muestra, proximidad al caso y conflictos de interés.' },
        { name: 'Síntesis honesta', evidence: 'Expresa grado de confianza y no convierte evidencia mixta en certeza.' },
        { name: 'Próxima evidencia', evidence: 'Propone la verificación con mayor valor informativo.' },
      ],
      ['Trata popularidad como validez.', 'Presenta correlación o casos aislados como regla universal.'],
    ),
  },
  {
    key: 'seo-executive-communication',
    competencyKey: 'communication',
    level: 'avanzado',
    type: 'situational',
    timeboxMinutes: 6,
    prompt:
      'Debes explicar a una dirección no técnica que el tráfico bajó, pero la evidencia todavía no permite atribuirlo a la migración. Redacta un update de máximo 180 palabras con: hecho confirmado, incertidumbre, impacto, acción inmediata, decisión que necesitas y próxima fecha de evidencia. No uses jerga sin explicarla.',
    evidenceExpected: ['Mensaje ejecutivo y accionable.', 'Incertidumbre explícita.', 'Petición/decisión concreta.'],
    rubric: barsRubric(
      [
        { name: 'Claridad ejecutiva', evidence: 'Abre con el estado y su impacto; cada detalle cambia una decisión.' },
        { name: 'Honestidad', evidence: 'Distingue hecho, hipótesis y nivel de confianza.' },
        { name: 'Acción', evidence: 'Define owner, decisión o siguiente punto de control.' },
      ],
      ['Oculta incertidumbre.', 'Usa jerga como sustituto de explicación o promete recuperación.'],
    ),
  },
  {
    key: 'seo-incident-ownership',
    competencyKey: 'ownership',
    level: 'avanzado',
    type: 'situational',
    timeboxMinutes: 7,
    prompt:
      'Una recomendación tuya se implementó y 600 páginas valiosas quedaron con noindex durante 36 horas. Describe qué haces en los primeros 30 minutos, durante el día y después de estabilizar. Incluye comunicación, contención, verificación, registro y cambio sistémico para evitar repetición. No busques culpables.',
    evidenceExpected: ['Contiene antes de explicar.', 'Comunica con hechos y cadencia.', 'Verifica recuperación.', 'Crea prevención sistémica.'],
    rubric: barsRubric(
      [
        { name: 'Respuesta al incidente', evidence: 'Prioriza contención reversible, alcance y preservación de evidencia.' },
        { name: 'Responsabilidad', evidence: 'Asume su contribución, coordina y comunica sin culpar ni ocultar.' },
        { name: 'Recuperación', evidence: 'Define comprobaciones técnicas y de negocio posteriores.' },
        { name: 'Aprendizaje sistémico', evidence: 'Cambia QA, revisión, alertas o rollout; no se limita a “tener más cuidado”.' },
      ],
      ['Oculta el incidente.', 'Cambia varias cosas sin preservar evidencia o propone sólo capacitación.'],
    ),
  },
]

const ART_MODULES: CreateTemplateInput['modules'] = [
  { competencyKey: 'art_direction', targetLevel: 'avanzado', weight: 25 },
  { competencyKey: 'visual_systems', targetLevel: 'avanzado', weight: 25 },
  { competencyKey: 'creative_production', targetLevel: 'avanzado', weight: 20 },
  { competencyKey: 'leadership', targetLevel: 'avanzado', weight: 10 },
  { competencyKey: 'communication', targetLevel: 'avanzado', weight: 10 },
  { competencyKey: 'ownership', targetLevel: 'avanzado', weight: 10 },
]

const ART_INTERVIEW_GUIDE: InterviewPrompt[] = [
  {
    competencyKey: 'art_direction',
    prompt: 'Elige un caso de tu portfolio donde la primera solución no fuera evidente. Reconstruye el brief, la tensión estratégica, los territorios descartados, la decisión visual y tu contribución exacta.',
    probes: ['¿Qué evidencia cambió tu dirección?', '¿Qué parte ejecutaste tú?', '¿Qué habrías hecho distinto con más o menos presupuesto?'],
    evidenceExpected: ['Idea visual conectada con estrategia.', 'Autoría delimitada.', 'Alternativas y trade-offs explícitos.'],
    redFlags: ['Describe sólo estilo o gusto.', 'Se atribuye trabajo de equipo sin delimitar contribución.'],
  },
  {
    competencyKey: 'visual_systems',
    prompt: 'Muestra un sistema que haya debido sobrevivir a varios formatos. Explica sus invariantes, grados de libertad y cómo evitaste que las adaptaciones perdieran la idea.',
    probes: ['¿Qué regla rompiste y por qué?', '¿Cómo funcionó en móvil, motion o producción rápida?', '¿Qué documentaste para otros?'],
    evidenceExpected: ['Reglas reproducibles.', 'Adaptación real multiformato.', 'Coherencia sin rigidez.'],
    redFlags: ['Confunde sistema con un set de plantillas.', 'No puede explicar decisiones fuera de la pieza hero.'],
  },
  {
    competencyKey: 'creative_production',
    prompt: 'Revisa un artefacto ficticio entregado en entrevista con jerarquía débil, contraste insuficiente, imágenes de procedencia incierta y adaptación vertical incompleta. Prioriza el feedback como si el equipo tuviera cuatro horas para cerrar.',
    probes: ['¿Qué bloquea salida?', '¿Qué delegas y qué ejecutas tú?', '¿Cómo verificas derechos y QA?', '¿Qué no cambiarías en este plazo?'],
    evidenceExpected: ['Prioridad por riesgo e impacto.', 'Feedback accionable.', 'Handoff y QA.', 'Trazabilidad de derechos/AI.'],
    redFlags: ['Rediseña todo por preferencia.', 'Ignora accesibilidad, procedencia o capacidad.'],
  },
  {
    competencyKey: 'leadership',
    prompt: 'Cuéntanos una situación en que una persona diseñadora defendía una solución técnicamente sólida pero desconectada del brief. ¿Cómo diste feedback, qué decisión tomaste y qué aprendió el sistema?',
    probes: ['¿Cómo preservaste autonomía?', '¿Qué evidencia usaste?', '¿Cómo calibraste la calidad después?'],
    evidenceExpected: ['Feedback específico y respetuoso.', 'Decisión clara.', 'Mejora de criterio, no sólo corrección de pieza.'],
    redFlags: ['Sustituye dirección por control.', 'Habla de “talento” sin conductas observables.'],
  },
  {
    competencyKey: 'communication',
    prompt: 'Explica una decisión visual compleja como si la presentaras a una persona cliente que prefiere otra opción. Haz primero la recomendación, luego evidencia, trade-offs y espacio real de decisión.',
    probes: ['¿Qué parte es principio y cuál preferencia?', '¿Qué harías si se elige la alternativa?', '¿Cómo documentas el acuerdo?'],
    evidenceExpected: ['Recomendación comprensible.', 'Distingue criterio de gusto.', 'Gestiona desacuerdo sin ceder integridad.'],
    redFlags: ['Descalifica al cliente.', 'Usa jerga estética para cerrar la discusión.'],
  },
  {
    competencyKey: 'ownership',
    prompt: 'Describe una entrega donde la calidad final quedó por debajo de tu estándar. Explica qué señales viste, qué hiciste antes y después de la salida, y qué cambiaste para no depender de heroísmo la próxima vez.',
    probes: ['¿Qué responsabilidad fue tuya?', '¿Qué métrica o evidencia confirmó la mejora?', '¿Qué guardrail quedó instalado?'],
    evidenceExpected: ['Responsabilidad explícita.', 'Recuperación proporcional.', 'Cambio de proceso verificable.'],
    redFlags: ['Culpa sólo a producción o al cliente.', 'El aprendizaje se limita a trabajar más horas.'],
  },
]

export const SEO_SPECIALIST_SENIOR_PACK: RoleAssessmentPack = {
  key: 'seo_specialist_senior_v1',
  role: 'SEO Specialist Senior',
  method: 'candidate_test',
  template: {
    name: 'SEO Specialist Senior v1 — Diagnóstico, Search/AEO y Medición',
    roleHint: 'seo_specialist_senior_v1',
    modules: SEO_MODULES,
  },
  materialization: 'after_sme_activation',
  timeboxMinutes: 75,
  instructions: [
    'El caso es ficticio y no produce trabajo utilizable para Efeonce ni para un cliente.',
    'Puedes consultar documentación, buscadores y herramientas de AI; declara cuáles usaste y cómo verificaste sus aportes.',
    'Se evalúa la calidad del razonamiento, las decisiones, la evidencia y los límites, no la extensión ni la coincidencia con una respuesta única.',
    'La entrevista posterior puede pedirte defender o cambiar una decisión con nueva evidencia.',
  ],
  questions: SEO_QUESTIONS,
  interviewGuide: [],
}

export const ART_DIRECTOR_SENIOR_PACK: RoleAssessmentPack = {
  key: 'art_director_senior_v1',
  role: 'Director(a) de Arte Senior',
  method: 'interviewer_scorecard',
  template: {
    name: 'Director(a) de Arte Senior v1 — Portfolio, sistema y producción',
    roleHint: 'art_director_senior_v1_interviewer_scorecard',
    modules: ART_MODULES,
  },
  materialization: 'interviewer_runtime_has_no_template_binding',
  timeboxMinutes: 75,
  instructions: [
    'La evidencia principal es trabajo previo y una conversación guiada; no se solicita una pieza nueva para uso comercial.',
    'La persona candidata puede anonimizar clientes, datos y material confidencial.',
    'Cada evaluador puntúa antes de ver la síntesis de otros evaluadores y separa autoría, craft, proceso y resultado.',
    'La decisión final integra scorecard y contexto humano; nunca se automatiza por un promedio.',
  ],
  questions: [],
  interviewGuide: ART_INTERVIEW_GUIDE,
}

export const TASK_1604_ROLE_ASSESSMENT_PACKS = [SEO_SPECIALIST_SENIOR_PACK, ART_DIRECTOR_SENIOR_PACK] as const

export const validateTask1604RoleAssessmentPacks = (): void => {
  const competencyKeys = new Set<string>()

  for (const pack of TASK_1604_ROLE_ASSESSMENT_PACKS) {
    const weight = pack.template.modules.reduce((sum, competencyModule) => sum + competencyModule.weight, 0)

    if (weight !== 100) throw new Error(`${pack.key}: template weights must sum 100, got ${weight}`)

    if (pack.timeboxMinutes < 30 || pack.timeboxMinutes > 90) {
      throw new Error(`${pack.key}: timebox must be between 30 and 90 minutes`)
    }

    for (const competencyModule of pack.template.modules) {
      if (competencyKeys.has(`${pack.key}:${competencyModule.competencyKey}`)) {
        throw new Error(`${pack.key}: duplicate module ${competencyModule.competencyKey}`)
      }

      competencyKeys.add(`${pack.key}:${competencyModule.competencyKey}`)
    }

    if (pack.method === 'candidate_test') {
      const questionMinutes = pack.questions.reduce((sum, question) => sum + question.timeboxMinutes, 0)

      if (questionMinutes > pack.timeboxMinutes) {
        throw new Error(`${pack.key}: question timeboxes exceed the assessment timebox`)
      }

      for (const competencyModule of pack.template.modules) {
        const required = competencyModule.weight >= 20 ? 2 : 1

        const coverage = pack.questions.filter(
          question =>
            question.competencyKey === competencyModule.competencyKey &&
            question.level === competencyModule.targetLevel,
        ).length

        if (coverage < required) {
          throw new Error(
            `${pack.key}: ${competencyModule.competencyKey} requires ${required} authored questions, got ${coverage}`,
          )
        }
      }
    }

    if (pack.method === 'interviewer_scorecard') {
      const covered = new Set(pack.interviewGuide.map(item => item.competencyKey))

      for (const competencyModule of pack.template.modules) {
        if (!covered.has(competencyModule.competencyKey)) {
          throw new Error(`${pack.key}: missing interview prompt for ${competencyModule.competencyKey}`)
        }
      }
    }
  }
}
