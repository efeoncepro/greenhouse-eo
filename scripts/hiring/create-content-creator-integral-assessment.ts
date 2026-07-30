/**
 * Crea de forma idempotente la versión integral del assessment de Content Creator.
 *
 * El template cubre craft, canal, SEO/AEO, software, analítica, investigación y
 * comportamiento operativo. Las preguntas nacen en `sme_review`: su activación
 * requiere aprobación humana.
 *
 * Uso:
 *   pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs scripts/hiring/create-content-creator-integral-assessment.ts
 */
import { loadGreenhouseToolEnv, applyGreenhousePostgresProfile } from '../lib/load-greenhouse-tool-env'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import {
  createQuestion,
  createTemplate,
  listQuestions,
  transitionQuestionStatus,
} from '@/lib/hiring/assessment/store'
import type { CreateQuestionInput } from '@/types/hiring-assessment'

const ACTOR = 'user-content-creator-integral-assessment-authoring'
const TEMPLATE_NAME = 'Content Creator L2 — Integral v2: Editorial, Social, SEO/AEO, Tools & Measurement'

const BRIEF =
  'Brief ficticio: Nube Clara ayuda a equipos B2B a detectar leads que se pierden entre marketing y ventas. La audiencia es una persona responsable de marketing que desconfía de sus reportes y necesita saber dónde se corta el seguimiento. El objetivo de la pieza base es conseguir solicitudes de un diagnóstico inicial.'

const rubric = (criteria: string[]) => ({
  scale: '0-100 (25 puntos por criterio; parcial permitido)',
  criteria,
})

const QUESTIONS: CreateQuestionInput[] = [
  {
    competencyKey: 'copywriting',
    level: 'intermedio',
    type: 'open_text',
    prompt: `${BRIEF} Propón una gran idea editorial, un título, una apertura de 80 a 120 palabras y un CTA final. Explica qué acción quieres provocar y por qué ese CTA corresponde al nivel de intención de la audiencia.`,
    rubric: rubric([
      'Encuentra una idea concreta para el problema de la audiencia, en vez de repetir la descripción de la empresa.',
      'El título y la apertura son claros, específicos y sostienen una sola promesa.',
      'El CTA es accionable, expresa el valor del siguiente paso y no usa una promesa no demostrada.',
      'Conecta el CTA con la intención del usuario; no lo agrega como un cierre decorativo.',
    ]),
  },
  {
    competencyKey: 'copywriting',
    level: 'intermedio',
    type: 'open_text',
    prompt: `${BRIEF} Analiza este CTA: “Haz clic aquí para conocer más sobre nuestras soluciones”. Identifica al menos cuatro problemas y propón tres alternativas: una para alguien que explora el problema, una que compara opciones y una para alguien listo para avanzar. Explica qué cambia entre ellas.`,
    rubric: rubric([
      'Detecta falta de valor, especificidad, contexto o siguiente paso en el CTA original.',
      'Propone alternativas diferenciadas por intención, no solo variaciones de palabras.',
      'Los CTA son claros, accionables y honestos respecto de lo que ocurrirá después.',
      'Explica la relación entre etapa del usuario, fricción y acción solicitada.',
    ]),
  },
  {
    competencyKey: 'social_channel_strategy',
    level: 'intermedio',
    type: 'open_text',
    prompt: `${BRIEF} Elige dos canales entre LinkedIn, Instagram, TikTok y newsletter para distribuir esta idea. Para cada uno entrega formato, adaptación del mensaje, CTA y razón de elección. No puedes reutilizar el mismo texto con cambios cosméticos. Explica también qué canal dejarías fuera y por qué.`,
    rubric: rubric([
      'Elige canales por audiencia, intención, contexto de consumo y capacidad del formato, no por popularidad.',
      'Adapta ángulo, ritmo, estructura y CTA de forma sustantiva para cada canal.',
      'Cada CTA corresponde a la acción disponible y al nivel de intención del canal.',
      'Defiende la exclusión de un canal con trade-offs explícitos y job-related.',
    ]),
  },
  {
    competencyKey: 'social_channel_strategy',
    level: 'intermedio',
    type: 'situational',
    prompt: `${BRIEF} El equipo quiere publicar el mismo texto en LinkedIn, Instagram y TikTok para ahorrar tiempo. La idea es válida, pero todavía no hay formato ni CTA definidos. ¿Qué mantendrías igual, qué cambiarías por canal y cómo decidirías qué producir primero con capacidad limitada?`,
    rubric: rubric([
      'Distingue la idea central de la ejecución y rechaza el copy-paste como estrategia.',
      'Considera audiencia, formato, distribución, esfuerzo y aprendizaje esperado.',
      'Define un CTA y un siguiente paso adecuados para cada canal elegido.',
      'Prioriza con un criterio explícito de impacto, aprendizaje y capacidad disponible.',
    ]),
  },
  {
    competencyKey: 'seo',
    level: 'intermedio',
    type: 'situational',
    prompt: `${BRIEF} La pregunta de búsqueda es “¿cómo detectar leads perdidos entre marketing y ventas?”. Diseña la respuesta de una pieza para SEO/AEO: respuesta directa inicial, estructura de secciones, evidencia que necesitarías y CTA. Explica cómo medirías visibilidad, clics y utilidad sin escribir para robots.`,
    rubric: rubric([
      'Responde la intención de búsqueda de forma directa y útil antes de extender el contexto.',
      'Usa una estructura escaneable y autocontenida, adecuada para recuperación y citabilidad.',
      'Distingue afirmaciones que requieren evidencia de recomendaciones editoriales.',
      'Conecta el CTA y la medición con la intención, no solo con posiciones o keywords.',
    ]),
  },
  {
    competencyKey: 'seo',
    level: 'intermedio',
    type: 'single_choice',
    prompt: 'Una pieza quiere aparecer como respuesta a una pregunta concreta y también ganar clics orgánicos. ¿Qué enfoque inicial es más sólido?',
    options: [
      { id: 'a', label: 'Repetir la keyword exacta en cada encabezado y párrafo para aumentar densidad.' },
      { id: 'b', label: 'Responder primero con claridad, estructurar subpreguntas relacionadas, respaldar claims y ofrecer un siguiente paso relevante.' },
      { id: 'c', label: 'Escribir una introducción extensa y dejar la respuesta principal para el final para aumentar el tiempo en página.' },
      { id: 'd', label: 'Usar una lista de términos populares aunque no correspondan al problema de la audiencia.' },
    ],
    answerKey: { correct: 'b', reason: 'La respuesta combina intención, estructura recuperable, evidencia y acción relevante; las otras opciones priorizan tácticas débiles o desconectadas del usuario.' },
  },
  {
    competencyKey: 'tool_fluency',
    level: 'intermedio',
    type: 'open_text',
    prompt: `${BRIEF} Describe cómo convertirías el brief en un flujo de producción ejecutable usando las herramientas que realmente dominas. Incluye estructura del brief, calendario, estados, revisión, aprobación, publicación y documentación. Nombra herramientas concretas de CMS, gestión de proyectos, publicación social, analítica o IA; para al menos dos, explica una operación que hayas realizado y qué evidencia o resultado revisarías.`,
    rubric: rubric([
      'Presenta un flujo completo, con entradas, responsables, estados, aprobaciones y salida publicada.',
      'Demuestra uso práctico de software mediante operaciones concretas, no solo una lista de marcas.',
      'Asigna cada herramienta a una función y reconoce límites, dependencias o riesgos de automatización.',
      'Incluye controles de calidad, trazabilidad, permisos y documentación de aprendizajes.',
    ]),
  },
  {
    competencyKey: 'content_analytics',
    level: 'intermedio',
    type: 'situational',
    prompt: 'Una semana de contenido tuvo estos resultados: el artículo recibió muchas impresiones y pocos clics; el carrusel tuvo menos alcance y muchas guardadas; el video tuvo mucho alcance y casi ninguna visita al sitio. ¿Qué hipótesis plantearías, qué revisarías antes de concluir y qué experimento harías la semana siguiente?',
    rubric: rubric([
      'Distingue métricas de distribución, interacción e intención; no declara ganador por una sola cifra.',
      'Formula hipótesis conectadas con formato, audiencia, mensaje, CTA y canal.',
      'Identifica datos adicionales necesarios antes de atribuir causalidad.',
      'Propone un experimento comparable con una decisión clara según el resultado.',
    ]),
  },
  {
    competencyKey: 'research_synthesis',
    level: 'intermedio',
    type: 'open_text',
    prompt: `${BRIEF} Recibes una entrevista de 30 minutos, tres enlaces externos y un export de preguntas de búsqueda. En máximo 250 palabras, explica cómo separarías hechos, opiniones, señales de audiencia y una tesis editorial defendible antes de escribir. Incluye qué verificarías y qué información pedirías si todavía no puedes sostener un claim.`,
    rubric: rubric([
      'Distingue evidencia, interpretación, opinión y vacío de información.',
      'Propone un método concreto para evaluar fuentes y encontrar una tesis.',
      'Formula preguntas de aclaración que mejoran la decisión editorial.',
      'Evita publicar afirmaciones que no puede respaldar y explicita sus límites.',
    ]),
  },
  {
    competencyKey: 'communication',
    level: 'intermedio',
    type: 'situational',
    prompt: `${BRIEF} La persona responsable del proyecto quiere publicar en Instagram porque “es donde está todo el mundo”, pero tú crees que LinkedIn y newsletter son mejores para el objetivo. ¿Cómo presentarías tu recomendación con evidencia y trade-offs? ¿Qué harías si la decisión final fuera distinta?`,
    rubric: rubric([
      'Enmarca la discusión en objetivo, audiencia, evidencia y restricciones, no en preferencias personales.',
      'Presenta una recomendación clara con trade-offs y una alternativa viable.',
      'Escucha y responde a la preocupación de la otra persona sin descalificarla.',
      'Ejecuta la decisión final con ownership y deja registrado el aprendizaje.',
    ]),
  },
  {
    competencyKey: 'ownership',
    level: 'intermedio',
    type: 'open_text',
    prompt: `${BRIEF} Publicaste una pieza que cumplió el calendario, pero el CTA era genérico y el canal elegido no produjo la acción esperada. Describe qué revisarías, qué comunicarías al equipo y cómo dejarías documentado el aprendizaje para que la siguiente pieza no repita el problema.`,
    rubric: rubric([
      'Reconoce el problema concreto sin esconderlo detrás de métricas vanidosas o culpar al canal.',
      'Propone una revisión con evidencia: contenido, CTA, audiencia, canal y objetivo.',
      'Comunica el estado y propone una corrección concreta, no solo una explicación retrospectiva.',
      'Deja una regla, criterio o recurso reutilizable que mejore el sistema de trabajo.',
    ]),
  },
]

const findTemplate = async () => {
  const rows = await runGreenhousePostgresQuery<{ template_id: string }>(
    `SELECT template_id FROM greenhouse_hiring.hiring_assessment_template WHERE name = $1 LIMIT 1`,
    [TEMPLATE_NAME],
  )

  return rows[0]?.template_id ?? null
}

const main = async () => {
  loadGreenhouseToolEnv()
  applyGreenhousePostgresProfile('runtime')

  let templateId = await findTemplate()

  if (!templateId) {
    const template = await createTemplate(
      {
        name: TEMPLATE_NAME,
        roleHint: 'content_creator_integral_v2_taxonomy',
        modules: [
          { competencyKey: 'copywriting', targetLevel: 'intermedio', weight: 20 },
          { competencyKey: 'social_channel_strategy', targetLevel: 'intermedio', weight: 15 },
          { competencyKey: 'seo', targetLevel: 'intermedio', weight: 15 },
          { competencyKey: 'tool_fluency', targetLevel: 'intermedio', weight: 15 },
          { competencyKey: 'content_analytics', targetLevel: 'intermedio', weight: 10 },
          { competencyKey: 'research_synthesis', targetLevel: 'intermedio', weight: 10 },
          { competencyKey: 'communication', targetLevel: 'intermedio', weight: 5 },
          { competencyKey: 'ownership', targetLevel: 'intermedio', weight: 10 },
        ],
      },
      ACTOR,
    )

    templateId = template.templateId
  }

  const created: string[] = []
  const existing: string[] = []

  for (const input of QUESTIONS) {
    const matches = await listQuestions({ competencyKey: input.competencyKey, limit: 200 })
    const current = matches.find((question) => question.prompt === input.prompt)

    if (current) {
      existing.push(current.questionId)
      continue
    }

    const question = await createQuestion(input, ACTOR)

    await transitionQuestionStatus(question.questionId, 'sme_review', ACTOR)
    created.push(question.questionId)
  }

  const desiredPrompts = new Set(QUESTIONS.map((input) => input.prompt))

  const authoredQuestions = (await listQuestions({ limit: 200 })).filter(
    (question) => question.createdBy === ACTOR && question.status !== 'retired',
  )

  for (const question of authoredQuestions) {
    if (!desiredPrompts.has(question.prompt)) {
      await transitionQuestionStatus(question.questionId, 'retired', ACTOR)
    }
  }

  console.log(JSON.stringify({ templateId, templateName: TEMPLATE_NAME, created, existing, questionCount: QUESTIONS.length }, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
