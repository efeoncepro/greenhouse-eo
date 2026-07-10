/**
 * TASK-1384 Slice 4 — Aplicación del review SME del Lote 1 (registro durable del veredicto).
 *
 * Review ejecutado como PASE ADVERSARIAL INDEPENDIENTE (agente revisor distinto del autor,
 * doctrina greenhouse-talent-people-operator + guía de autoría), bajo autorización explícita
 * del operador (sesión 2026-07-10: "Resuélvelo con las skills existentes"). Veredicto:
 * 17 APPROVE · 7 REVISE (con fix) · 0 REJECT + 2 fixes editoriales de rúbrica.
 *
 * Mecánica (solo writers canónicos, append-only):
 * - APPROVE → transición sme_review→active.
 * - REVISE/editorial → sme_review→retired + createQuestion corregida → sme_review → active.
 * - +1 pregunta nueva (vendor_management × nociones, del fix de re-etiquetado).
 * Idempotente: verifica estado actual antes de cada acción.
 *
 * Uso: npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/hiring/apply-sme-review-lote1.ts [--apply]
 */
import { createQuestion, transitionQuestionStatus } from '@/lib/hiring/assessment/store'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { CreateQuestionInput } from '@/types/hiring-assessment'

const APPLY = process.argv.includes('--apply')

// Actor delegado: review por skill bajo autorización del operador (auditoría en la task).
const ACTOR = 'user-task-1384-sme-review-skill-delegated'

const rubric = (criteria: string[]): Record<string, unknown> => ({
  scale: '0-100 (25 puntos por criterio; parcial permitido)',
  criteria,
})

/** 15 aprobadas sin cambios → activar. */
const APPROVE_IDS = [
  'qst-f97392a7-d273-4e9a-bfa9-5d8db5c3fcc5', // client_relationship_comm situational scope
  'qst-7d6395e1-e9be-413f-a5e0-1da80de28c2b', // commercial_acumen situational señal
  'qst-a7dc983a-5ad2-4a20-a13a-a16e6a9ad415', // commercial_acumen single_choice cuenta estancada
  'qst-db5aafbd-489b-48e1-817a-7b6eb28d3460', // composure situational 17:40
  'qst-8176a14f-b1c1-48aa-9450-cf5ecbb88e56', // composure situational presentación
  'qst-ed10c1c7-17c2-49c3-8811-4dbce2a609e3', // copywriting asuntos
  'qst-762cd7b5-8b07-4ba0-9048-b6406dc76ae7', // copywriting titular ebook
  'qst-399356af-dc07-4aa8-aab6-efbdb4d9e55a', // delivery situational scope creep
  'qst-e5fbe3ff-8363-4d8d-889d-a5c54e1206a0', // leadership diseñador trabado
  'qst-fddc5b96-7416-4166-8016-3b6a182c3187', // leadership feedback senior
  'qst-1af308fa-ac3b-457f-9554-5c4db235b88b', // leadership cuenta heredada
  'qst-c6b819ab-4285-432f-928f-9d8fc5523115', // ownership situational medios atrasados
  'qst-9a13673d-46fe-4dc4-b8ad-11d177a0ec0c', // seo single_choice
  'qst-0dee48e9-5435-4f1d-b714-9cf373c13975', // seo multi_choice
  'qst-cca747a1-92c9-457d-a75a-da08100f0153', // vendor single_choice criterio
]

/** Retirar (defecto del review) → recrear corregida. */
const REPLACEMENTS: Array<{ retireId: string; reason: string; corrected: CreateQuestionInput }> = [
  {
    retireId: 'qst-4b429eaa-faa3-4883-8f05-01e2ca1d6cd4',
    reason: 'copia verbatim del ejemplo de la guía (vector de filtración)',
    corrected: {
      competencyKey: 'client_relationship_comm', level: 'intermedio', type: 'open_text',
      prompt: 'El cliente escribió molesto: el post de la promoción salió con un porcentaje de descuento equivocado y lleva 4 horas publicado; lo detectó su gerente comercial, no nosotros. Redacta el mensaje de respuesta que le enviarías (máximo 200 palabras).',
      rubric: rubric([
        'Reconoce el error sin excusas ni culpar a terceros',
        'Explica la corrección concreta y el plazo comprometido',
        'Propone un mecanismo específico para que no se repita',
        'Tono profesional que preserva la relación (ni defensivo ni servil)',
      ]),
    },
  },
  {
    retireId: 'qst-bc5b815f-f284-44ea-9bc0-ab395aa7eedf',
    reason: 'criterio 2 de la rúbrica era doble (divergencia entre correctores)',
    corrected: {
      competencyKey: 'client_relationship_comm', level: 'intermedio', type: 'open_text',
      prompt: 'Redacta el update semanal (máximo 150 palabras) para un cliente cuyo proyecto va con 3 días de atraso en una entrega, dos hitos completados y un riesgo nuevo detectado (dependencia de un proveedor externo).',
      rubric: rubric([
        'Lidera con el estado real (atraso incluido) sin enterrarlo al final',
        'El atraso viene acompañado de plan: qué se está haciendo y cuándo se normaliza (no solo la mala noticia)',
        'El riesgo nuevo aparece con plan de mitigación, no solo como alerta',
        'Estructura escaneable (el cliente entiende todo en 30 segundos)',
      ]),
    },
  },
  {
    retireId: 'qst-e552ff70-0908-430d-b7ce-318c40999820',
    reason: 'el prompt pedía algo que la rúbrica no puntuaba (gasto de palabras injusto)',
    corrected: {
      competencyKey: 'commercial_acumen', level: 'intermedio', type: 'open_text',
      prompt: 'Tienes una cuenta estable que factura lo mismo hace 8 meses. El cliente está conforme pero no pide más. Escribe tu plan de 90 días para crecer la cuenta: qué explorarías, con qué señales, y qué propondrías al final de los 90 días (máximo 250 palabras).',
      rubric: rubric([
        'Parte de necesidades/objetivos del cliente, no de "qué más venderle"',
        'Señales concretas y verificables (datos de uso, resultados, conversaciones), no intuición',
        'Secuencia realista de 90 días con hitos (descubrir → validar → proponer)',
        'La propuesta de valor conecta con resultado de negocio del cliente, no con features',
      ]),
    },
  },
  {
    retireId: 'qst-ad7c84cb-a913-4b2e-b8c1-6b2c5f89b704',
    reason: 'no autocontenida: puntuaba voz de marca sin declararla en el enunciado',
    corrected: {
      competencyKey: 'copywriting', level: 'intermedio', type: 'open_text',
      prompt: 'Contexto: la marca le habla de tú a su audiencia, con tono cercano y directo. Critica este CTA de landing: "Haga clic aquí para obtener más información sobre nuestros servicios integrales". Lista qué está mal (mínimo 3 problemas) y propone tu versión final.',
      rubric: rubric([
        'Identifica lo genérico/sin valor ("más información", "servicios integrales")',
        'Identifica el problema de registro/voz (formalidad rígida vs tuteo de marca)',
        'Identifica que no hay beneficio ni siguiente paso concreto',
        'Su versión es específica, accionable y en voz de marca',
      ]),
    },
  },
  {
    retireId: 'qst-83a54539-4fc3-414e-aa2d-2a5217e805e6',
    reason: 'criterio 1 no observable en el artefacto (el timing lo fijaba el escenario)',
    corrected: {
      competencyKey: 'delivery_coordination', level: 'intermedio', type: 'open_text',
      prompt: 'La entrega principal del mes se va a atrasar 4 días por una dependencia externa que falló. El cliente aún no lo sabe. Escribe el mensaje con que se lo comunicas (máximo 150 palabras).',
      rubric: rubric([
        'Abre con el hecho (atraso y magnitud) en las primeras líneas, sin enterrarlo en preámbulos',
        'Causa honesta sin excusas eternas ni culpar al proveedor como escudo',
        'Nueva fecha realista + qué se hace para protegerla',
        'Ofrece mitigación del impacto para el cliente (entrega parcial, plan alternativo)',
      ]),
    },
  },
  {
    retireId: 'qst-d7f8ea55-166c-4d71-812a-9da4b49d36f0',
    reason: 'copia verbatim del ejemplo de la guía (vector de filtración)',
    corrected: {
      competencyKey: 'ownership', level: 'intermedio', type: 'situational',
      prompt: 'Detectas que el email masivo YA aprobado por el cliente sale en 2 horas con un link roto en el CTA principal. Quien lo aprobó está en vuelo y técnicamente "no es tu tarea". ¿Qué haces, en qué orden y a quién informas?',
      rubric: rubric([
        'Actúa sin esperar al dueño formal (el riesgo no espera jerarquías)',
        'Contiene primero (detener/corregir el envío) antes de buscar responsables',
        'Comunica con transparencia a cliente/equipo lo que pasó y lo que hizo',
        'Deja aprendizaje para el sistema (por qué el link pasó las revisiones)',
      ]),
    },
  },
  {
    retireId: 'qst-59a56e7b-3bdc-4d8a-93cb-22c90bc18435',
    reason: 'nivel deshonesto: situacional de juicio aplicado etiquetado nociones → intermedio',
    corrected: {
      competencyKey: 'vendor_management', level: 'intermedio', type: 'situational',
      prompt: 'Un proveedor de producción audiovisual entrega 2 días tarde por segunda vez este trimestre, y el material vuelve a llegar con detalles que el equipo debe corregir. Es el más barato del mercado y el presupuesto está justo. ¿Cómo manejas la situación?',
      rubric: rubric([
        'Documenta el patrón con hechos (fechas, retrabajos, costo del retrabajo interno)',
        'Conversa con el proveedor con expectativas explícitas y consecuencias claras ANTES de reemplazar',
        'Evalúa el costo TOTAL (retrabajos + riesgo con cliente), no solo la tarifa',
        'Prepara alternativa (plan B) en paralelo en vez de esperar la tercera falla',
      ]),
    },
  },
  {
    retireId: 'qst-661b2a4d-6d15-4cd1-99c0-2d5b8d4d9ca0',
    reason: 'editorial: "verificable" no es observable en test escrito → especificidad',
    corrected: {
      competencyKey: 'composure_pressure', level: 'intermedio', type: 'open_text',
      prompt: 'Cuéntanos una situación real donde tuviste que sostener un compromiso con un cliente o equipo mientras todo se complicaba a la vez (plazos, recursos, cambios). Qué pasó, qué hiciste tú específicamente y cómo terminó (máximo 250 palabras).',
      rubric: rubric([
        'Situación con presión real, específica y detallada (fechas, actores, magnitudes) — STAR: contexto claro',
        'Acciones PROPIAS específicas (qué hizo él/ella, no "el equipo")',
        'Muestra regulación: priorizó y comunicó en vez de reaccionar o desaparecer',
        'Resultado honesto + aprendizaje que cambió cómo trabaja desde entonces',
      ]),
    },
  },
  {
    retireId: 'qst-ce23dade-3701-4986-abed-519a1e61086f',
    reason: 'editorial: "verificable" → específico y demostrado (inter-rater)',
    corrected: {
      competencyKey: 'ownership', level: 'intermedio', type: 'open_text',
      prompt: 'Cuéntanos una vez en que un proyecto falló o se atrasó y PARTE de la causa fue tuya. Qué pasó, qué parte fue tu responsabilidad, qué hiciste al respecto y qué cambiaste después (máximo 250 palabras).',
      rubric: rubric([
        'Reconoce responsabilidad propia específica (no "fallamos como equipo" difuso)',
        'Sin reescritura defensiva: la parte propia es sustantiva, no cosmética',
        'Acción de reparación concreta en el momento (no solo "aprendí")',
        'Cambio de sistema/hábito específico y demostrado desde entonces (memoria del Operating Code)',
      ]),
    },
  },
]

/** Nueva (cubre el slot nociones de vendor_management tras el re-etiquetado). */
const NEW_QUESTIONS: CreateQuestionInput[] = [
  {
    competencyKey: 'vendor_management', level: 'nociones', type: 'single_choice',
    prompt: '¿Qué debe quedar acordado por escrito ANTES de encargar el primer trabajo a un proveedor nuevo?',
    options: [
      { id: 'a', label: 'Solo el precio y la forma de pago' },
      { id: 'b', label: 'Entregables, plazos, criterio de aceptación y qué pasa si incumple' },
      { id: 'c', label: 'La disponibilidad inmediata para partir esta semana' },
      { id: 'd', label: 'Una buena relación personal con el contacto comercial' },
    ],
    answerKey: { correct: 'b', reason: 'Sin entregables/plazos/aceptación acordados no hay forma objetiva de gestionar el incumplimiento. a es necesario pero insuficiente; c y d no protegen la entrega.' },
  },
]

const getStatus = async (questionId: string): Promise<string | null> => {
  const rows = await runGreenhousePostgresQuery<{ status: string }>(
    `SELECT status FROM greenhouse_hiring.hiring_question WHERE question_id = $1`,
    [questionId],
  )

  return rows[0]?.status ?? null
}

const main = async () => {
  console.log(`[sme-review-lote1] APPLY=${APPLY} · approve=${APPROVE_IDS.length} replace=${REPLACEMENTS.length} new=${NEW_QUESTIONS.length}`)

  for (const id of APPROVE_IDS) {
    const status = await getStatus(id)

    if (status === 'active') continue

    if (status !== 'sme_review') {
      console.warn(`  ! ${id} en estado inesperado: ${status} (skip)`)
      continue
    }

    console.log(`  ✓ activar ${id}`)
    if (APPLY) await transitionQuestionStatus(id, 'active', ACTOR)
  }

  // 1º retirar TODO lo defectuoso; 2º construir el set de dedupe; 3º recrear.
  // (Lección del primer run: 5 correcciones conservaban el prompt original y el set
  // construido ANTES del retiro las saltaba, dejando la celda sin contenido.)
  for (const { retireId, reason } of REPLACEMENTS) {
    const status = await getStatus(retireId)

    if (status === 'sme_review') {
      console.log(`  ↻ retirar ${retireId} (${reason})`)
      if (APPLY) await transitionQuestionStatus(retireId, 'retired', ACTOR)
    }
  }

  const existing = await runGreenhousePostgresQuery<{ key: string; prompt: string }>(
    `SELECT comp.key, q.prompt FROM greenhouse_hiring.hiring_question q
     JOIN greenhouse_hiring.hiring_competency comp ON comp.competency_id = q.competency_id
     WHERE q.status IN ('sme_review', 'active')`,
  )

  const seen = new Set(existing.map((r) => `${r.key}::${r.prompt}`))

  for (const { corrected } of REPLACEMENTS) {
    if (!seen.has(`${corrected.competencyKey}::${corrected.prompt}`)) {
      console.log(`  + recrear corregida: ${corrected.competencyKey} × ${corrected.level}`)

      if (APPLY) {
        const q = await createQuestion(corrected, ACTOR)

        await transitionQuestionStatus(q.questionId, 'sme_review', ACTOR)
        await transitionQuestionStatus(q.questionId, 'active', ACTOR)
      }
    }
  }

  for (const nq of NEW_QUESTIONS) {
    if (seen.has(`${nq.competencyKey}::${nq.prompt}`)) continue
    console.log(`  + nueva: ${nq.competencyKey} × ${nq.level}`)

    if (APPLY) {
      const q = await createQuestion(nq, ACTOR)

      await transitionQuestionStatus(q.questionId, 'sme_review', ACTOR)
      await transitionQuestionStatus(q.questionId, 'active', ACTOR)
    }
  }

  console.log('[sme-review-lote1] done')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('[sme-review-lote1] fatal:', error)
    process.exit(1)
  })
