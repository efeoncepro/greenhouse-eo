/**
 * Crea de forma idempotente el assessment de Content Creator L2.
 *
 * El template es reusable y las preguntas nacen en `sme_review`: la activación
 * sigue siendo una decisión humana del SME, según la guía canónica de autoría.
 *
 * Uso:
 *   pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs scripts/hiring/create-content-creator-assessment.ts
 */
import { applyGreenhousePostgresProfile, loadGreenhouseToolEnv } from '../lib/load-greenhouse-tool-env'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import {
  createQuestion,
  createTemplate,
  listQuestions,
  transitionQuestionStatus,
} from '@/lib/hiring/assessment/store'
import type { CreateQuestionInput } from '@/types/hiring-assessment'

const ACTOR = 'user-content-creator-assessment-authoring'
const TEMPLATE_NAME = 'Content Creator L2 — Editorial, SEO/AEO & Social'

const rubric = (criteria: string[]) => ({
  scale: '0-100 (25 puntos por criterio; parcial permitido)',
  criteria,
})

const QUESTIONS: CreateQuestionInput[] = [
  {
    competencyKey: 'copywriting',
    level: 'intermedio',
    type: 'open_text',
    prompt:
      'Un brief ficticio pide explicar cómo una empresa puede ordenar una idea compleja para que su audiencia la entienda y actúe. Propón un ángulo editorial, un título, una apertura de 80 a 120 palabras y un CTA final. Explica en 3 líneas qué acción quieres provocar y por qué ese CTA corresponde a ese momento del usuario.',
    rubric: rubric([
      'Encuentra una idea concreta y relevante para la audiencia, en vez de repetir el tema del brief.',
      'La apertura genera claridad o interés sin prometer más de lo que la pieza puede entregar.',
      'El CTA es específico, accionable y expresa un beneficio o siguiente paso real.',
      'Conecta el CTA con la intención y etapa del usuario; no lo agrega como un cierre decorativo.',
    ]),
  },
  {
    competencyKey: 'copywriting',
    level: 'intermedio',
    type: 'open_text',
    prompt:
      'Analiza este CTA: “Haz clic aquí para conocer más sobre nuestras soluciones”. Identifica al menos cuatro problemas y propón tres alternativas: una para una persona que todavía está explorando, una para alguien que compara opciones y una para alguien listo para avanzar. Explica qué cambia entre las tres.',
    rubric: rubric([
      'Detecta falta de valor, especificidad, contexto o siguiente paso en el CTA original.',
      'Propone alternativas diferenciadas por intención, no solo variaciones de palabras.',
      'Los CTA son claros, accionables y honestos respecto de lo que ocurrirá después.',
      'Explica la relación entre etapa del usuario, fricción y acción solicitada.',
    ]),
  },
  {
    competencyKey: 'community_management',
    level: 'intermedio',
    type: 'open_text',
    prompt:
      'Tienes la misma idea editorial del ejercicio anterior y debes convertirla en dos piezas sociales. Elige dos canales entre LinkedIn, Instagram, TikTok y newsletter. Para cada canal entrega: formato, adaptación del mensaje, CTA y una explicación breve de por qué ese canal es adecuado. No puedes reutilizar el mismo texto con cambios cosméticos.',
    rubric: rubric([
      'Elige canales por audiencia, intención, contexto de consumo y capacidad del formato, no por popularidad.',
      'Adapta el ángulo, ritmo, estructura y CTA de forma sustantiva para cada canal.',
      'Cada CTA es coherente con el nivel de intención y con la acción disponible en ese canal.',
      'Discute una alternativa descartada y explica qué cambiaría si el objetivo fuera distinto.',
    ]),
  },
  {
    competencyKey: 'community_management',
    level: 'intermedio',
    type: 'situational',
    prompt:
      'El equipo quiere publicar el mismo texto en LinkedIn, Instagram y TikTok para ahorrar tiempo. El contenido tiene una idea potente, pero todavía no hay formato ni CTA definidos. ¿Qué mantendrías igual, qué cambiarías por canal y cómo decidirías qué producir primero?',
    rubric: rubric([
      'Distingue la idea central de la ejecución y no propone copiar/pegar el mismo texto.',
      'Considera comportamiento de audiencia, formato, distribución y esfuerzo de producción.',
      'Define CTA y siguiente paso adecuados para cada canal.',
      'Prioriza con un criterio explícito de impacto, aprendizaje y capacidad disponible.',
    ]),
  },
  {
    competencyKey: 'seo',
    level: 'intermedio',
    type: 'situational',
    prompt:
      'Una pieza recibe impresiones pero pocos clics y no aparece como respuesta clara en buscadores ni asistentes de IA. El brief pide mantener una voz humana y no escribir para robots. ¿Qué revisarías primero, qué cambiarías en la pieza y cómo decidirías si el cambio funcionó? Incluye un ejemplo de título, estructura o respuesta directa.',
    rubric: rubric([
      'Distingue intención de búsqueda, claridad de respuesta, estructura y distribución; no reduce SEO/AEO a repetir keywords.',
      'Propone cambios concretos y verificables en título, encabezados, respuesta, enlaces o evidencia.',
      'Protege la utilidad y la voz humana de la pieza; evita tácticas de relleno o clickbait.',
      'Define señales de éxito y un período o comparación razonable para evaluar el cambio.',
    ]),
  },
  {
    competencyKey: 'seo',
    level: 'intermedio',
    type: 'open_text',
    prompt:
      'Recibes una pregunta frecuente de una audiencia: “¿Cómo elijo el canal correcto para distribuir una idea de contenido?”. Escribe una respuesta breve y estructurada para que pueda entenderla una persona y también recuperarla un buscador o asistente de IA. Incluye una respuesta directa, criterios de decisión y una invitación final a profundizar.',
    rubric: rubric([
      'Responde la pregunta de forma directa antes de extenderse en contexto.',
      'Organiza la información con criterios claros, lenguaje natural y estructura escaneable.',
      'Evita afirmaciones absolutas, relleno de keywords y promesas no demostrables.',
      'El cierre invita a un siguiente paso relevante sin convertir la respuesta en publicidad genérica.',
    ]),
  },
  {
    competencyKey: 'communication',
    level: 'intermedio',
    type: 'situational',
    prompt:
      'La persona responsable del proyecto quiere publicar en Instagram porque “es donde está todo el mundo”, pero tú crees que LinkedIn y newsletter son mejores para el objetivo del brief. ¿Cómo discutirías la decisión sin convertirla en una opinión personal? Redacta cómo presentarías tu recomendación y qué harías si la decisión final fuera distinta.',
    rubric: rubric([
      'Enmarca la discusión en objetivo, audiencia, evidencia y restricciones, no en preferencias personales.',
      'Presenta una recomendación clara con trade-offs y una alternativa viable.',
      'Escucha y responde a la preocupación de la otra persona sin descalificarla.',
      'Una vez tomada la decisión, ejecuta con ownership y deja registrado el aprendizaje.',
    ]),
  },
  {
    competencyKey: 'ownership',
    level: 'intermedio',
    type: 'open_text',
    prompt:
      'Publicaste una pieza que cumplió el calendario, pero el CTA era genérico y el canal elegido no generó la acción esperada. Describe qué revisarías, qué comunicarías al equipo y cómo dejarías documentado el aprendizaje para que la siguiente pieza no repita el problema.',
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
        roleHint: 'content_creator',
        modules: [
          { competencyKey: 'copywriting', targetLevel: 'intermedio', weight: 35 },
          { competencyKey: 'community_management', targetLevel: 'intermedio', weight: 25 },
          { competencyKey: 'seo', targetLevel: 'intermedio', weight: 15 },
          { competencyKey: 'communication', targetLevel: 'intermedio', weight: 10 },
          { competencyKey: 'ownership', targetLevel: 'intermedio', weight: 15 },
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

  console.log(JSON.stringify({ templateId, templateName: TEMPLATE_NAME, created, existing, questionCount: QUESTIONS.length }, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
