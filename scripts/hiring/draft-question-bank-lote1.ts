/**
 * TASK-1384 Slice 3 — Drafting del Lote 1 (Account Manager L2), work-sample-first.
 *
 * Crea los borradores vía el writer canónico (`createQuestion` → nacen `draft`) y los
 * transiciona a `sme_review` (cola del experto). NUNCA activa nada: la activación es del
 * SME humano (guía: docs/documentation/hr/assessment-question-authoring-guide.md).
 * Idempotente: si ya existe una pregunta de la misma competencia con el mismo prompt, la salta.
 *
 * Autoría: agente con la doctrina de `greenhouse-talent-people-operator` como SME-proxy de
 * BORRADOR (el flag de drafting IA de 1361 sigue OFF; este es el camino manual del task).
 *
 * Uso (proxy 127.0.0.1:15432):
 *   npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/hiring/draft-question-bank-lote1.ts [--apply]
 */
import { createQuestion, transitionQuestionStatus } from '@/lib/hiring/assessment/store'
import { runGreenhousePostgresQuery } from '@/lib/postgres/client'
import type { CreateQuestionInput } from '@/types/hiring-assessment'

const APPLY = process.argv.includes('--apply')
const ACTOR = 'user-task-1384-drafting'

const rubric = (criteria: string[]): Record<string, unknown> => ({
  scale: '0-100 (25 puntos por criterio; parcial permitido)',
  criteria,
})

const DRAFTS: CreateQuestionInput[] = [
  // ── client_relationship_comm × intermedio (core, 3) ──
  {
    competencyKey: 'client_relationship_comm', level: 'intermedio', type: 'open_text',
    prompt: 'El cliente escribió molesto: la campaña salió publicada con un error en el precio y lo detectó él, no nosotros. Redacta el mensaje de respuesta que le enviarías (máximo 200 palabras).',
    rubric: rubric([
      'Reconoce el error sin excusas ni culpar a terceros',
      'Explica la corrección concreta y el plazo comprometido',
      'Propone un mecanismo específico para que no se repita',
      'Tono profesional que preserva la relación (ni defensivo ni servil)',
    ]),
  },
  {
    competencyKey: 'client_relationship_comm', level: 'intermedio', type: 'open_text',
    prompt: 'Redacta el update semanal (máximo 150 palabras) para un cliente cuyo proyecto va con 3 días de atraso en una entrega, dos hitos completados y un riesgo nuevo detectado (dependencia de un proveedor externo).',
    rubric: rubric([
      'Lidera con el estado real (atraso incluido) sin enterrarlo al final',
      'Contexto accionable: qué significa el atraso para el cliente y qué se está haciendo',
      'El riesgo nuevo aparece con plan de mitigación, no solo como alerta',
      'Estructura escaneable (el cliente entiende todo en 30 segundos)',
    ]),
  },
  {
    competencyKey: 'client_relationship_comm', level: 'intermedio', type: 'situational',
    prompt: 'En una reunión, el cliente pide "algo pequeño" que en realidad implica una semana de trabajo del equipo de diseño y no está en el alcance. El tono es amistoso y esperan un sí. ¿Qué respondes en el momento y qué haces después de la reunión?',
    rubric: rubric([
      'No compromete en el momento algo que no puede dimensionar (sin decir "no" en seco)',
      'Valida la necesidad de negocio detrás del pedido antes de hablar de esfuerzo',
      'Después: dimensiona con el equipo y vuelve con opciones/trade-offs por escrito',
      'Protege la relación Y el alcance (no elige uno a costa del otro)',
    ]),
  },

  // ── commercial_acumen × intermedio (core, 3) ──
  {
    competencyKey: 'commercial_acumen', level: 'intermedio', type: 'open_text',
    prompt: 'Tienes una cuenta estable que factura lo mismo hace 8 meses. El cliente está conforme pero no pide más. Escribe tu plan de 90 días para crecer la cuenta (máximo 250 palabras): qué explorarías, con qué señales, y cómo lo presentarías.',
    rubric: rubric([
      'Parte de necesidades/objetivos del cliente, no de "qué más venderle"',
      'Señales concretas y verificables (datos de uso, resultados, conversaciones), no intuición',
      'Secuencia realista de 90 días con hitos (descubrir → validar → proponer)',
      'La propuesta de valor conecta con resultado de negocio del cliente, no con features',
    ]),
  },
  {
    competencyKey: 'commercial_acumen', level: 'intermedio', type: 'situational',
    prompt: 'En la reunión mensual, el cliente menciona al pasar que "el próximo trimestre lanzan una línea nueva y el equipo interno está sobrepasado". Nadie más lo nota. ¿Qué haces con esa señal, cuándo y cómo?',
    rubric: rubric([
      'Reconoce la señal como oportunidad comercial legítima (dolor + timing)',
      'Indaga primero (preguntas en la misma reunión o follow-up) antes de proponer',
      'Involucra a quien corresponde internamente (comercial/estrategia) sin apropiarse solo',
      'Propone en términos del problema del cliente, con siguiente paso concreto',
    ]),
  },
  {
    competencyKey: 'commercial_acumen', level: 'intermedio', type: 'single_choice',
    prompt: 'Una cuenta factura $2M/mes con margen sano y cero quejas, pero no responde a propuestas de crecimiento hace 6 meses. ¿Cuál es la lectura MÁS correcta del estado de esa cuenta?',
    options: [
      { id: 'a', label: 'Cuenta sana: mientras facture estable y sin quejas, no hay que tocarla' },
      { id: 'b', label: 'Cuenta en riesgo silencioso: sin conversación de futuro, la relación es transaccional y vulnerable a competencia' },
      { id: 'c', label: 'Cuenta madura: alcanzó su techo natural y hay que enfocarse en otras' },
      { id: 'd', label: 'Cuenta problema: hay que escalar a dirección la falta de respuesta' },
    ],
    answerKey: { correct: 'b', reason: 'La ausencia de conversación de futuro es señal de relación transaccional: estable hoy, vulnerable mañana. a/c normalizan la señal; d escala sin diagnóstico.' },
  },

  // ── copywriting × intermedio (core, 3) ──
  {
    competencyKey: 'copywriting', level: 'intermedio', type: 'open_text',
    prompt: 'Asunto actual de un email de campaña: "Nuestra empresa tiene el agrado de presentarle su nueva plataforma de gestión de beneficios para colaboradores". Tasa de apertura: 8%. Reescríbelo en 3 variantes (máx. 60 caracteres cada una) y explica en una línea por qué cada una debería abrir mejor.',
    rubric: rubric([
      'Las variantes lideran con el beneficio/curiosidad del lector, no con la empresa',
      'Respetan el límite y son honestas (sin clickbait que el contenido no cumple)',
      'Las 3 exploran ángulos distintos (no la misma idea con sinónimos)',
      'Las justificaciones nombran el mecanismo (especificidad, curiosidad, urgencia legítima…)',
    ]),
  },
  {
    competencyKey: 'copywriting', level: 'intermedio', type: 'open_text',
    prompt: 'Critica este CTA de landing: "Haga clic aquí para obtener más información sobre nuestros servicios integrales". Lista qué está mal (mínimo 3 problemas) y propone tu versión final.',
    rubric: rubric([
      'Identifica lo genérico/sin valor ("más información", "servicios integrales")',
      'Identifica el problema de registro/voz (formalidad rígida vs tuteo de marca)',
      'Identifica que no hay beneficio ni siguiente paso concreto',
      'Su versión es específica, accionable y en voz de marca',
    ]),
  },
  {
    competencyKey: 'copywriting', level: 'intermedio', type: 'single_choice',
    prompt: '¿Cuál de estos titulares para un ebook B2B sobre webs con IA es MÁS efectivo para un gerente de marketing sin equipo técnico?',
    options: [
      { id: 'a', label: '"Arquitecturas headless y agentes conversacionales: el stack del futuro"' },
      { id: 'b', label: '"Tu web puede atender clientes mientras duermes: guía sin tecnicismos"' },
      { id: 'c', label: '"Descarga nuestro ebook sobre inteligencia artificial aplicada"' },
      { id: 'd', label: '"10 tendencias de IA que todo profesional debería conocer en 2026"' },
    ],
    answerKey: { correct: 'b', reason: 'Habla el lenguaje del lector (beneficio concreto + "sin tecnicismos" remueve la fricción). a es jerga técnica, c es genérico sin beneficio, d es listicle sin especificidad de audiencia.' },
  },

  // ── composure_pressure × intermedio (core actitudinal, 3) ──
  {
    competencyKey: 'composure_pressure', level: 'intermedio', type: 'situational',
    prompt: 'Son las 17:40. Un cliente exige por teléfono un cambio "para hoy" en una pieza ya aprobada, y al mismo tiempo el equipo te avisa que la campaña de OTRO cliente tiene un error en producción visible al público. Tienes capacidad para atender una sola cosa a la vez. ¿Qué haces, en qué orden y qué le dices a cada parte?',
    rubric: rubric([
      'Prioriza por impacto real (error público en producción > cambio sobre pieza aprobada)',
      'Comunica a AMBAS partes de inmediato con expectativas honestas (nadie queda en silencio)',
      'No promete lo que no puede cumplir para bajar la presión del momento',
      'Cierra el ciclo: verifica la resolución y deja registro de lo acordado',
    ]),
  },
  {
    competencyKey: 'composure_pressure', level: 'intermedio', type: 'open_text',
    prompt: 'Cuéntanos una situación real donde tuviste que sostener un compromiso con un cliente o equipo mientras todo se complicaba a la vez (plazos, recursos, cambios). Qué pasó, qué hiciste tú específicamente y cómo terminó (máximo 250 palabras).',
    rubric: rubric([
      'Situación con presión real y verificable (no genérica ni hipotética) — STAR: contexto claro',
      'Acciones PROPIAS específicas (qué hizo él/ella, no "el equipo")',
      'Muestra regulación: priorizó y comunicó en vez de reaccionar o desaparecer',
      'Resultado honesto + aprendizaje que cambió cómo trabaja desde entonces',
    ]),
  },
  {
    competencyKey: 'composure_pressure', level: 'intermedio', type: 'situational',
    prompt: 'En una presentación, el cliente interrumpe y descalifica el trabajo del equipo con dureza frente a todos ("esto no sirve, perdimos el mes"). Parte del feedback es injusto, parte tiene razón. ¿Qué haces en los siguientes 5 minutos?',
    rubric: rubric([
      'No responde defensivamente ni deja que la tensión escale en la sala',
      'Separa lo válido de lo injusto SIN litigarlo en caliente frente a todos',
      'Protege al equipo (no los culpa en la sala) y toma la responsabilidad de canalizar',
      'Convierte el momento en siguiente paso concreto (revisión punto por punto con plazo)',
    ]),
  },

  // ── leadership × intermedio (core, 3) ──
  {
    competencyKey: 'leadership', level: 'intermedio', type: 'situational',
    prompt: 'Un diseñador del equipo lleva 2 días trabado con una pieza: lo que entrega no es lo que el cliente pidió, y el plazo es pasado mañana. Está frustrado y a la defensiva. Tú no diseñas. ¿Cómo destrabas la situación?',
    rubric: rubric([
      'Diagnostica ANTES de actuar (¿brief confuso, skill, contexto, motivación?)',
      'Reencuadra el problema con el brief/ejemplos del cliente en vez de criticar las entregas',
      'Decide con criterio de plazo (par de apoyo, descomponer, re-negociar alcance) sin hacerlo él/ella',
      'Cuida a la persona: feedback sobre el trabajo, no sobre su valía; frustración atendida',
    ]),
  },
  {
    competencyKey: 'leadership', level: 'intermedio', type: 'open_text',
    prompt: 'Debes decirle a alguien de tu equipo —senior y talentoso— que el cliente pidió que no vuelva a presentar en las reuniones por cómo comunica (interrumpe, se extiende, no lee la sala). Escribe cómo abrirías esa conversación (las primeras 5-8 frases que dirías).',
    rubric: rubric([
      'Directo y temprano (no entierra el mensaje en rodeos ni sándwich artificial)',
      'Hechos observables, no etiquetas de personalidad ("interrumpiste 3 veces" vs "eres intenso")',
      'Separa el valor de la persona del comportamiento a cambiar',
      'Abre trabajo conjunto (plan concreto para recuperar el espacio) en vez de solo sentenciar',
    ]),
  },
  {
    competencyKey: 'leadership', level: 'intermedio', type: 'situational',
    prompt: 'Heredas la coordinación de una cuenta donde el equipo anterior trabajaba con urgencias constantes: todos apagan incendios, nadie sabe qué es prioritario y el cliente pide directo a cada persona. ¿Cuáles son tus primeras 3 acciones la primera semana y por qué esas?',
    rubric: rubric([
      'Observa/escucha antes de reorganizar (diagnóstico con el equipo y el cliente)',
      'Instala UN canal/ritmo de priorización (el caos actual es estructural, no de esfuerzo)',
      'Acuerda con el cliente el punto de entrada único sin cortar la relación con el equipo',
      'Secuencia realista: estabilizar primero, optimizar después (no refundación en semana 1)',
    ]),
  },

  // ── ownership × intermedio (core actitudinal, 3) ──
  {
    competencyKey: 'ownership', level: 'intermedio', type: 'situational',
    prompt: 'Detectas que una pieza YA aprobada por el cliente tiene un dato desactualizado. Se publica en 2 horas. Quien la aprobó no responde y técnicamente "no es tu tarea". ¿Qué haces, en qué orden y a quién informas?',
    rubric: rubric([
      'Actúa sin esperar al dueño formal (el riesgo no espera jerarquías)',
      'Contiene primero (detener/corregir la publicación) antes de buscar responsables',
      'Comunica con transparencia a cliente/equipo lo que pasó y lo que hizo',
      'Deja aprendizaje para el sistema (por qué el dato pasó las revisiones)',
    ]),
  },
  {
    competencyKey: 'ownership', level: 'intermedio', type: 'open_text',
    prompt: 'Cuéntanos una vez en que un proyecto falló o se atrasó y PARTE de la causa fue tuya. Qué pasó, qué parte fue tu responsabilidad, qué hiciste al respecto y qué cambiaste después (máximo 250 palabras).',
    rubric: rubric([
      'Reconoce responsabilidad propia específica (no "fallamos como equipo" difuso)',
      'Sin reescritura defensiva: la parte propia es sustantiva, no cosmética',
      'Acción de reparación concreta en el momento (no solo "aprendí")',
      'Cambio de sistema/hábito verificable desde entonces (memoria del Operating Code)',
    ]),
  },
  {
    competencyKey: 'ownership', level: 'intermedio', type: 'situational',
    prompt: 'Terminaste tu parte de la campaña a tiempo. La del equipo de medios va atrasada y el lanzamiento (del que tú eres la cara ante el cliente) está en riesgo. Su jefatura dice "lo tenemos controlado" pero los avances no lo muestran. ¿Qué haces?',
    rubric: rubric([
      'No se refugia en "mi parte está lista": el resultado ante el cliente es suyo',
      'Verifica con datos (avances reales) en vez de aceptar o desconfiar por default',
      'Escala con evidencia y propuesta (no queja), ofreciendo ayuda concreta',
      'Prepara comunicación honesta al cliente por si el riesgo se materializa',
    ]),
  },

  // ── seo × nociones (soporte, 2) ──
  {
    competencyKey: 'seo', level: 'nociones', type: 'single_choice',
    prompt: 'El cliente pregunta por qué su página de "software de facturación para pymes" no aparece en Google si "la web es preciosa". Como Account Manager, ¿cuál es la explicación MÁS probable que deberías validar primero con el equipo SEO?',
    options: [
      { id: 'a', label: 'El diseño de la página no le gusta al algoritmo de Google' },
      { id: 'b', label: 'La página no responde a la intención de búsqueda ni usa el lenguaje con que las pymes buscan' },
      { id: 'c', label: 'Falta pagar la publicidad de Google para aparecer en resultados' },
      { id: 'd', label: 'Google demora 2 años en indexar sitios nuevos' },
    ],
    answerKey: { correct: 'b', reason: 'Contenido vs intención de búsqueda es el fundamento. a confunde diseño con relevancia, c confunde SEO con SEM, d es falso.' },
  },
  {
    competencyKey: 'seo', level: 'nociones', type: 'multi_choice',
    prompt: 'De esta lista, ¿cuáles son señales que SÍ influyen directamente en el posicionamiento orgánico de una página? (selecciona todas las correctas)',
    options: [
      { id: 'a', label: 'Que el contenido responda la pregunta que el usuario buscó' },
      { id: 'b', label: 'La cantidad de seguidores de la marca en Instagram' },
      { id: 'c', label: 'Que otros sitios relevantes enlacen a la página' },
      { id: 'd', label: 'Que la página cargue rápido y funcione bien en móvil' },
      { id: 'e', label: 'Usar la palabra clave la mayor cantidad de veces posible' },
    ],
    answerKey: { correct: ['a', 'c', 'd'], reason: 'Relevancia, autoridad (enlaces) y experiencia de página son los fundamentos. b no es factor directo; e es keyword stuffing (penalizable).' },
  },

  // ── vendor_management × nociones (soporte, 2) ──
  {
    competencyKey: 'vendor_management', level: 'nociones', type: 'situational',
    prompt: 'Un proveedor de producción audiovisual entrega 2 días tarde por segunda vez este trimestre, y el material vuelve a llegar con detalles que el equipo debe corregir. Es el más barato del mercado y el presupuesto está justo. ¿Cómo manejas la situación?',
    rubric: rubric([
      'Documenta el patrón con hechos (fechas, retrabajos, costo del retrabajo interno)',
      'Conversa con el proveedor con expectativas explícitas y consecuencias claras ANTES de reemplazar',
      'Evalúa el costo TOTAL (retrabajos + riesgo con cliente), no solo la tarifa',
      'Prepara alternativa (plan B) en paralelo en vez de esperar la tercera falla',
    ]),
  },
  {
    competencyKey: 'vendor_management', level: 'nociones', type: 'single_choice',
    prompt: 'Vas a contratar un proveedor nuevo para un servicio recurrente. ¿Cuál de estos criterios es el MENOS confiable como base de decisión?',
    options: [
      { id: 'a', label: 'Referencias verificables de clientes con necesidades similares' },
      { id: 'b', label: 'Una prueba pagada pequeña antes del contrato grande' },
      { id: 'c', label: 'La calidad de su presentación comercial y lo convincente del vendedor' },
      { id: 'd', label: 'Claridad de su propuesta en plazos, entregables y qué pasa si incumple' },
    ],
    answerKey: { correct: 'c', reason: 'La habilidad de vender no predice la capacidad de entregar. a, b y d son evidencia verificable de desempeño real.' },
  },

  // ── delivery_coordination × intermedio (soporte, 2) ──
  {
    competencyKey: 'delivery_coordination', level: 'intermedio', type: 'situational',
    prompt: 'A mitad del ciclo, el cliente ya agregó 3 pedidos "pequeños" que el equipo absorbió sin ajustar nada. Hoy el diseñador te dice que no llega con la entrega principal del ciclo. ¿Qué haces con el ciclo actual y qué cambias para el siguiente?',
    rubric: rubric([
      'Re-prioriza el ciclo actual CON el cliente (qué entra, qué sale) en vez de exprimir al equipo',
      'Nombra la causa raíz: absorción silenciosa de alcance, no lentitud del diseñador',
      'Instala mecanismo para el futuro (todo pedido nuevo pasa por priorización visible)',
      'Comunica el ajuste al cliente con opciones, no con excusas',
    ]),
  },
  {
    competencyKey: 'delivery_coordination', level: 'intermedio', type: 'open_text',
    prompt: 'La entrega principal del mes se va a atrasar 4 días por una dependencia externa que falló. El cliente aún no lo sabe. Escribe el mensaje con que se lo comunicas (máximo 150 palabras).',
    rubric: rubric([
      'Comunica apenas se sabe (no espera a que el atraso sea inocultable)',
      'Causa honesta sin excusas eternas ni culpar al proveedor como escudo',
      'Nueva fecha realista + qué se hace para protegerla',
      'Ofrece mitigación del impacto para el cliente (entrega parcial, plan alternativo)',
    ]),
  },
]

const main = async () => {
  console.log(`[draft-lote1] ${DRAFTS.length} borradores work-sample-first · mode=${APPLY ? 'APPLY' : 'DRY-RUN'}`)

  const existing = await runGreenhousePostgresQuery<{ key: string; prompt: string }>(
    `SELECT comp.key, q.prompt FROM greenhouse_hiring.hiring_question q
     JOIN greenhouse_hiring.hiring_competency comp ON comp.competency_id = q.competency_id`,
  )

  const seen = new Set(existing.map((r) => `${r.key}::${r.prompt}`))
  let created = 0
  let skipped = 0

  for (const draft of DRAFTS) {
    if (seen.has(`${draft.competencyKey}::${draft.prompt}`)) {
      skipped += 1
      continue
    }

    console.log(`  + ${draft.competencyKey} × ${draft.level} × ${draft.type}: ${draft.prompt.slice(0, 70)}…`)

    if (APPLY) {
      const question = await createQuestion(draft, ACTOR)

      await transitionQuestionStatus(question.questionId, 'sme_review', ACTOR)
      created += 1
    }
  }

  console.log(`[draft-lote1] ${APPLY ? `creados=${created} (en sme_review)` : 'dry-run'} · ya existían=${skipped}`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('[draft-lote1] fatal:', error)
    process.exit(1)
  })
