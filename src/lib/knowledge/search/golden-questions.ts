/**
 * TASK-1083 Slice 3 — Golden questions (fixtures TS versionadas, pure).
 *
 * El set de evaluación de retrieval vive en el repo (revisable, corre en CI vía el
 * structural test; el eval harness real corre contra el corpus con PG). Cada caso
 * declara la expectativa: fuente correcta, fuente equivocada (mustNotReturn),
 * no-answer honesto y escalación sensible (agentic excluye agent_excluded/restricted).
 *
 * Matchean por substring de título (estable) — no por anchor frágil. Anclados al
 * corpus piloto TASK-1082 (11 docs). El approver del set por dominio quedó diferido
 * por TASK-1080; este set cubre los 11 docs ingeridos como baseline.
 */

import type { KnowledgeSearchConfidence, KnowledgeSearchMode } from './types'

export interface KnowledgeGoldenQuestion {
  id: string
  description: string
  query: string
  mode: KnowledgeSearchMode
  /** Algún chunk retornado tiene este substring en el título (case-insensitive). */
  expectAnyTitleIncludes?: string
  /** Ningún chunk retornado tiene este substring (wrong-source / agent_excluded). */
  mustNotReturnTitleIncludes?: string
  /** confidence === 'none' y cero chunks (no-answer honesto). */
  expectNoAnswer?: boolean
  /** confidence >= este nivel. */
  expectMinConfidence?: KnowledgeSearchConfidence
  /** deniedOrFilteredCount >= n (escalación sensible en modo agentic). */
  expectDeniedAtLeast?: number
  /**
   * Wrong-source / rerank: el PRIMER chunk (top tras el rerank) tiene este substring en el
   * título. Regresión real del rerank — el doc correcto debe ganarle a un distractor genérico
   * que matcheó por ruido del cuerpo (TASK-1127).
   */
  expectFirstTitleIncludes?: string
  /**
   * Cross-document synthesis: el packet trae al menos N documentos DISTINTOS (por `documentId`).
   * Regresión de la diversidad del rerank — una respuesta que requiere cruzar ≥2 manuales no
   * debe quedar monopolizada por un solo documento (TASK-1127).
   */
  expectDistinctDocumentsAtLeast?: number
}

export const KNOWLEDGE_CONFIDENCE_RANK: Record<KnowledgeSearchConfidence, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3
}

export const KNOWLEDGE_GOLDEN_QUESTIONS: KnowledgeGoldenQuestion[] = [
  // ── Fuente correcta (human) ───────────────────────────────────────────────
  {
    id: 'payroll-period-human',
    description: 'Humano: el doc de períodos de nómina (agent_excluded) SÍ es visible.',
    query: '¿cómo creo un período de nómina?',
    mode: 'human',
    expectAnyTitleIncludes: 'nómina',
    expectMinConfidence: 'medium'
  },
  {
    id: 'efeonce-greenhouse-nexa',
    description: 'Fuente correcta: diferencia entre Efeonce, Greenhouse y Nexa.',
    query: '¿cuál es la diferencia entre Efeonce, Greenhouse y Nexa?',
    mode: 'human',
    expectAnyTitleIncludes: 'Diferencia',
    expectMinConfidence: 'medium'
  },
  {
    id: 'notion-client-connect',
    description: 'Fuente correcta: conectar el Notion de un cliente.',
    query: '¿cómo conecto el Notion de un cliente?',
    mode: 'human',
    expectAnyTitleIncludes: 'Notion',
    expectMinConfidence: 'medium'
  },
  {
    id: 'roles-access',
    description: 'Fuente correcta: roles y acceso básicos.',
    query: '¿qué roles y accesos existen en Greenhouse?',
    mode: 'human',
    expectAnyTitleIncludes: 'Roles y acceso',
    expectMinConfidence: 'medium'
  },
  {
    id: 'shortcuts',
    description: 'Fuente correcta: accesos rápidos / atajos.',
    query: '¿cómo uso los accesos rápidos?',
    mode: 'human',
    expectAnyTitleIncludes: 'Accesos rápidos',
    expectMinConfidence: 'medium'
  },

  // ── Fuente correcta (agentic) ─────────────────────────────────────────────
  {
    id: 'ico-glossary-agentic',
    description: 'Agentic: el glosario ICO (agent_allowed) responde RpA/OTD/FTR.',
    query: '¿qué significan RpA, OTD y FTR?',
    mode: 'agentic',
    expectAnyTitleIncludes: 'Glosario ICO',
    expectMinConfidence: 'medium'
  },

  // ── Escalación sensible: agentic filtra el MANUAL legacy agent_excluded ────
  // TASK-1140 (operador, opción A): payroll ahora ES citable en agentic — el doc
  // FUNCIONAL `payroll-periodos-de-nomina-funcional` (agent_allowed) se retorna,
  // mientras el MANUAL legacy `periodos-de-nomina` (agent_excluded, sin tocar) se
  // filtra → deniedOrFilteredCount >= 1. Reemplaza la aserción obsoleta
  // "agentic nunca retorna nómina" (que asumía payroll totalmente excluido).
  {
    id: 'payroll-period-agentic-functional-allowed',
    description: 'Agentic: el doc funcional de nómina (agent_allowed) SÍ se retorna; el manual legacy (agent_excluded) se filtra.',
    query: '¿cómo creo y calculo un período de nómina?',
    mode: 'agentic',
    expectAnyTitleIncludes: 'Períodos de nómina',
    expectDeniedAtLeast: 1
  },

  // ── Wrong-source guard ────────────────────────────────────────────────────
  {
    id: 'ico-not-payroll',
    description: 'Wrong-source: una pregunta de métricas ICO no debe citar el doc de nómina.',
    query: '¿qué métricas operativas mide el motor ICO?',
    mode: 'human',
    expectAnyTitleIncludes: 'ICO',
    mustNotReturnTitleIncludes: 'nómina'
  },

  // ── No-answer honesto (off-corpus) ────────────────────────────────────────
  {
    id: 'no-answer-astronomia-saturno',
    description: 'No-answer: pregunta fuera del corpus operativo → confidence none.',
    query: 'cuántos anillos tiene el planeta Saturno',
    mode: 'human',
    expectNoAnswer: true
  },
  {
    id: 'no-answer-astronomy',
    description: 'No-answer: pregunta fuera del corpus operativo → confidence none.',
    query: 'cuántas lunas tiene el planeta Júpiter',
    mode: 'human',
    expectNoAnswer: true
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TASK-1140 — cobertura por dominio del paquete de manuales operativos. Modo
  // `agentic` (la ruta de Nexa); todos los manuales nuevos son agent_allowed →
  // recuperables. `expectAnyTitleIncludes` ancla a un substring del TÍTULO del
  // doc del dominio correcto (no por path). Donde hay riesgo de cruce de dominio
  // (finance↔payroll), un guard `mustNotReturnTitleIncludes`.
  // ─────────────────────────────────────────────────────────────────────────

  // ── Finance ───────────────────────────────────────────────────────────────
  {
    id: 'finance-ingreso',
    description: 'Finance: registrar un ingreso → fuente Finance, NO nómina.',
    query: '¿cómo registro un ingreso en Finance?',
    mode: 'agentic',
    expectAnyTitleIncludes: 'ingresos, egresos',
    mustNotReturnTitleIncludes: 'Finiquitos',
    expectMinConfidence: 'low'
  },
  {
    id: 'finance-orden-de-pago',
    description: 'Finance: cuándo usar una orden de pago.',
    query: '¿cuándo uso una orden de pago en vez de registrar un pago directo?',
    mode: 'agentic',
    expectAnyTitleIncludes: 'Órdenes de pago',
    expectMinConfidence: 'low'
  },
  {
    id: 'finance-conciliacion',
    description: 'Finance: cómo funciona la conciliación bancaria.',
    query: '¿cómo funciona la conciliación bancaria?',
    mode: 'agentic',
    expectAnyTitleIncludes: 'Conciliación bancaria',
    expectMinConfidence: 'low'
  },
  {
    id: 'finance-instrumento',
    description: 'Finance: registrar un instrumento bancario.',
    query: '¿cómo registro un instrumento bancario en Banco?',
    mode: 'agentic',
    expectAnyTitleIncludes: 'Instrumentos de pago',
    expectMinConfidence: 'low'
  },
  {
    id: 'finance-pnl',
    description: 'Finance: cómo llegan los costos al P&L operativo.',
    query: '¿cómo llegan los costos al P&L operativo?',
    mode: 'agentic',
    expectAnyTitleIncludes: 'Distribución de costos',
    expectMinConfidence: 'low'
  },

  // ── People / Workforce / Payroll / Contractors ────────────────────────────
  {
    id: 'workforce-habilitar',
    description: 'Workforce: habilitar un colaborador en Workforce Activation.',
    query: '¿cómo habilito un colaborador en Workforce Activation?',
    mode: 'agentic',
    expectAnyTitleIncludes: 'Workforce Activation',
    expectMinConfidence: 'low'
  },
  {
    id: 'payroll-honorarios',
    description: 'Payroll: honorarios no lleva AFP/salud/cesantía → fuente Payroll.',
    query: '¿por qué honorarios no tiene AFP, salud ni cesantía?',
    mode: 'agentic',
    expectAnyTitleIncludes: 'Payroll',
    expectMinConfidence: 'low'
  },
  {
    id: 'contractor-pago',
    description: 'Contractors: aprobar una entrega no paga automáticamente.',
    query: '¿aprobar una entrega de contractor lo paga automáticamente?',
    mode: 'agentic',
    expectAnyTitleIncludes: 'Contractors',
    expectMinConfidence: 'low'
  },
  {
    id: 'payroll-finiquito',
    description: 'Payroll: cuándo corresponde un finiquito.',
    query: '¿cuándo corresponde un finiquito?',
    mode: 'agentic',
    expectAnyTitleIncludes: 'Finiquitos',
    expectMinConfidence: 'low'
  },

  // ── Comercial / Quote-to-Cash ─────────────────────────────────────────────
  {
    id: 'commercial-cotizacion',
    description: 'Comercial: crear una cotización → Quote-to-Cash, NO caja/finance.',
    query: '¿cómo creo una cotización comercial?',
    mode: 'agentic',
    expectAnyTitleIncludes: 'Quote-to-Cash',
    expectMinConfidence: 'low'
  },
  {
    id: 'commercial-catalogo',
    description: 'Comercial: source of truth del catálogo de servicios.',
    query: '¿HubSpot es el source of truth del catálogo de servicios?',
    mode: 'agentic',
    expectAnyTitleIncludes: 'Servicios y engagements',
    expectMinConfidence: 'low'
  },

  // ── Agency / Delivery / Account 360 ───────────────────────────────────────
  {
    id: 'agency-account-360',
    description: 'Agency: cómo leer Account 360.',
    query: '¿cómo leo el Account 360 de una cuenta?',
    mode: 'agentic',
    expectAnyTitleIncludes: 'Account 360',
    expectMinConfidence: 'low'
  },
  {
    id: 'agency-faceta-degradada',
    description: 'Agency: qué significa una faceta degradada en Account 360.',
    query: '¿qué significa una faceta degradada en Account 360?',
    mode: 'agentic',
    expectAnyTitleIncludes: 'Account 360',
    expectMinConfidence: 'low'
  },

  // ── Identity / Access / Admin Center ──────────────────────────────────────
  {
    id: 'identity-scim',
    description: 'Identity: cómo funciona SCIM con Entra.',
    query: '¿cómo funciona SCIM con Entra?',
    mode: 'agentic',
    expectAnyTitleIncludes: 'SCIM',
    expectMinConfidence: 'low'
  },
  {
    id: 'identity-rol-vs-permission-set',
    description: 'Identity: rol vs permission set → fuente Identity/Access.',
    query: '¿un rol y un permission set son lo mismo?',
    mode: 'agentic',
    expectAnyTitleIncludes: 'Identity, Access',
    expectMinConfidence: 'low'
  },

  // ── Personas / My Space ───────────────────────────────────────────────────
  {
    id: 'personas-mi-recibo',
    description: 'Personas: ver mi recibo / actualizar mi perfil de pago.',
    query: '¿cómo veo mi recibo o actualizo mi perfil de pago?',
    mode: 'agentic',
    expectAnyTitleIncludes: 'Mi Espacio',
    expectMinConfidence: 'low'
  },
  {
    id: 'personas-otra-persona',
    description: 'Personas: My Space no muestra datos de otra persona.',
    query: '¿por qué desde Mi Espacio no puedo ver datos de otra persona?',
    mode: 'agentic',
    expectAnyTitleIncludes: 'Mi Espacio',
    expectMinConfidence: 'low'
  },

  // ── Public Site / Content Factory ─────────────────────────────────────────
  {
    id: 'public-site-inspeccionar',
    description: 'Public Site: inspeccionar un post.',
    query: '¿cómo inspecciono un post del Public Site?',
    mode: 'agentic',
    expectAnyTitleIncludes: 'Public Site',
    expectMinConfidence: 'low'
  },
  {
    id: 'public-site-publicar',
    description: 'Public Site: postura read-only/draft-only ante "publicar".',
    query: '¿puede Nexa publicar el sitio público?',
    mode: 'agentic',
    expectAnyTitleIncludes: 'Public Site',
    expectMinConfidence: 'low'
  },

  // ── UI Platform / Design System ───────────────────────────────────────────
  {
    id: 'ui-platform-composition-shell',
    description: 'UI Platform: cuándo usar Composition Shell o una primitive.',
    query: '¿cuándo uso el Composition Shell o una primitive para una pantalla nueva?',
    mode: 'agentic',
    expectAnyTitleIncludes: 'UI Platform',
    expectMinConfidence: 'low'
  },
  {
    id: 'ui-platform-figma-tokens',
    description: 'UI Platform: usar tokens del Design System, no copiar HEX de Figma.',
    query: '¿debo usar tokens del Design System o puedo copiar colores HEX de Figma directo?',
    mode: 'agentic',
    expectAnyTitleIncludes: 'Design System',
    expectMinConfidence: 'low'
  },

  // ── Portal Cliente / Customer Experience ──────────────────────────────────
  {
    id: 'client-portal-que-ve',
    description: 'Portal Cliente: qué ve un cliente.',
    query: '¿qué ve un cliente en el Portal Cliente?',
    mode: 'agentic',
    expectAnyTitleIncludes: 'Portal Cliente',
    expectMinConfidence: 'low'
  },
  {
    id: 'client-portal-zero-state',
    description: 'Portal Cliente: zero-state no es un error.',
    query: '¿un zero-state es un error en el Portal Cliente?',
    mode: 'agentic',
    expectAnyTitleIncludes: 'Portal Cliente',
    expectMinConfidence: 'low'
  },

  // ── Integraciones / Sync ──────────────────────────────────────────────────
  {
    id: 'integrations-salud',
    description: 'Integraciones: cómo saber si una integración está sana.',
    query: '¿cómo sé si una integración está sana?',
    mode: 'agentic',
    expectAnyTitleIncludes: 'Integraciones y Sync',
    expectMinConfidence: 'low'
  },
  {
    id: 'integrations-triggered',
    description: 'Integraciones: triggered no significa sync terminada.',
    query: '¿triggered significa que la sync terminó?',
    mode: 'agentic',
    expectAnyTitleIncludes: 'Integraciones y Sync',
    expectMinConfidence: 'low'
  },

  // ── Comunicaciones / Notificaciones ───────────────────────────────────────
  {
    id: 'communications-email-fallo',
    description: 'Comunicaciones: cómo revisar si un email falló.',
    query: '¿cómo reviso si un email falló?',
    mode: 'agentic',
    expectAnyTitleIncludes: 'Comunicaciones',
    expectMinConfidence: 'low'
  },
  {
    id: 'communications-teambot',
    description: 'Comunicaciones: TeamBot no es Nexa conversacional.',
    query: '¿TeamBot puede conversar como Nexa?',
    mode: 'agentic',
    expectAnyTitleIncludes: 'Comunicaciones',
    expectMinConfidence: 'low'
  },

  // ── AI Tooling / Content / Assets ─────────────────────────────────────────
  {
    id: 'ai-tooling-registrar',
    description: 'AI Tooling: registrar una herramienta de IA.',
    query: '¿cómo registro una herramienta de IA?',
    mode: 'agentic',
    expectAnyTitleIncludes: 'AI Tooling',
    expectMinConfidence: 'low'
  },
  {
    id: 'ai-tooling-wallet',
    description: 'AI Tooling: wallet de créditos no es caja ni factura.',
    query: '¿el wallet de créditos de IA es caja o factura?',
    mode: 'agentic',
    expectAnyTitleIncludes: 'AI Tooling',
    expectMinConfidence: 'low'
  },

  // ── Admin Center ──────────────────────────────────────────────────────────
  {
    id: 'admin-center-administra',
    description: 'Admin Center: qué administra.',
    query: '¿qué administra el Admin Center?',
    mode: 'agentic',
    expectAnyTitleIncludes: 'Admin Center',
    expectMinConfidence: 'low'
  },

  // ─────────────────────────────────────────────────────────────────────────
  // TASK-1127 — baseline de evaluación para el retrieval (desbloquea TASK-1136).
  // Dos clases que el set anterior no cubría: WRONG-SOURCE (el rerank debe poner el
  // doc específico PRIMERO, no un end-to-end genérico que matcheó por ruido) y
  // CROSS-DOCUMENT (una respuesta que cruza ≥2 manuales debe traer ≥2 docs distintos).
  // ─────────────────────────────────────────────────────────────────────────

  // ── Wrong-source (rerank: el específico gana al genérico) ─────────────────
  {
    id: 'wrong-source-conciliacion',
    description: 'Wrong-source: un doc específico de conciliación debe rankear primero, no el end-to-end genérico de Finance.',
    query: '¿cuáles son los pasos de la conciliación bancaria?',
    mode: 'human',
    // El rerank debe poner un doc de conciliación (específico) primero, no "Operación de
    // Finance end-to-end" (genérico que menciona conciliación de paso). Substring del tema,
    // no un título exacto — varios docs de conciliación son respuesta válida.
    expectFirstTitleIncludes: 'onciliación',
    expectMinConfidence: 'medium'
  },
  {
    id: 'wrong-source-finiquito',
    description: 'Wrong-source: un finiquito específico debe ganarle al People/Workforce/Payroll end-to-end.',
    query: '¿cómo se calcula y emite un finiquito en Chile?',
    mode: 'human',
    expectFirstTitleIncludes: 'Finiquitos',
    expectMinConfidence: 'medium'
  },
  {
    id: 'wrong-source-reliquidacion',
    description: 'Wrong-source: una reliquidación específica debe ganarle al People/Workforce/Payroll end-to-end genérico.',
    query: '¿cómo hago una reliquidación de nómina?',
    mode: 'human',
    expectFirstTitleIncludes: 'Reliquidación',
    expectMinConfidence: 'medium'
  },

  // ── Cross-document synthesis (≥2 documentos distintos) ────────────────────
  {
    id: 'cross-doc-contractor-pago',
    description: 'Cross-doc: el pago de un contractor cruza HR (engagement) + Finance (pago) → ≥2 docs distintos.',
    query: '¿cómo se paga a un contractor desde el engagement hasta que el banco se rebaja?',
    mode: 'agentic',
    expectDistinctDocumentsAtLeast: 2,
    expectMinConfidence: 'low'
  },
  {
    id: 'cross-doc-ingreso-pnl',
    description: 'Cross-doc: registrar un ingreso + cómo llega al P&L cruza ≥2 manuales de Finance.',
    query: '¿cómo registro un ingreso y cómo se refleja después en el P&L operativo?',
    mode: 'agentic',
    expectDistinctDocumentsAtLeast: 2,
    expectMinConfidence: 'low'
  }
]
