import 'server-only'

/**
 * TASK-1773 Slice 5 — el guard que impide que la clase vuelva.
 *
 * El hueco que originó esta task no fue que faltara una ruta: fue que **nadie se hizo la pregunta**. Las
 * cuatro tasks del eje de desenlace entregaron una capability operable sólo desde el portal, y ninguna
 * declaró la parity como pendiente — tampoco la auditoría que las revisó.
 *
 * Este manifiesto convierte esa pregunta en un paso obligatorio. Toda capability `hiring.*` que el código
 * chequee con `can()` tiene que aparecer acá con su estado. Agregar una capability nueva sin declararlo
 * rompe el test — que es exactamente lo que no pasó en agosto.
 *
 * **No declara si algo DEBE federarse.** Declara que alguien lo pensó y dejó escrito el porqué. Un
 * `deliberately-internal` con razón honesta es tan válido como un `federated`; lo inaceptable es el
 * silencio.
 *
 * ⚠️ **Sólo capabilities, nunca scopes delegados.** `hiring.candidate.review.read` NO va acá: es un scope
 * OAuth que se verifica con `oauthCapabilities.includes(...)`, no una capability de `can()`. Son dos
 * planos de autorización distintos y mezclarlos es el error que el propio guard destapó al escribirlo.
 * La ruta de review ya queda cubierta por `hiring.application.read`.
 */

export type HiringCapabilityParityStatus =
  /** Tiene superficie en el lane `app`. `evidence` apunta al archivo de ruta que lo prueba. */
  | 'federated'
  /** Se decidió NO federarla. `reason` explica por qué, y es lo que se audita. */
  | 'deliberately-internal'
  /** Falta carril y se sabe. `reason` nombra la task dueña o el bloqueo. */
  | 'pending'

export interface HiringCapabilityParityEntry {
  capability: string
  status: HiringCapabilityParityStatus
  /** Ruta del lane `app` que la expone. Obligatorio en `federated`, y el test verifica que exista. */
  evidence?: string
  reason?: string
}

export const HIRING_CAPABILITY_PARITY_MANIFEST: readonly HiringCapabilityParityEntry[] = [
  // ── Federadas ────────────────────────────────────────────────────────────────────────────────────
  {
    capability: 'hiring.application.decide',
    status: 'federated',
    evidence: 'src/app/api/platform/app/hiring/applications/[applicationId]/decision/confirm/route.ts',
    reason: 'TASK-1773. Confirmar exige sesión humana: el scope de escritura delegado no existe (TASK-1631).',
  },
  {
    capability: 'hiring.application.read',
    status: 'federated',
    evidence: 'src/app/api/platform/app/hiring/applications/review/route.ts',
  },
  {
    capability: 'hiring.talent_pool.read',
    status: 'federated',
    evidence: 'src/app/api/platform/app/hiring/talent-pool/route.ts',
  },
  {
    capability: 'hiring.talent_pool.invite',
    status: 'federated',
    evidence: 'src/app/api/platform/app/hiring/talent-pool/[id]/invite/confirm/route.ts',
  },
  {
    capability: 'hiring.talent_pool.manage',
    status: 'federated',
    evidence: 'src/app/api/platform/app/hiring/talent-pool/[id]/availability/route.ts',
  },

  // ── Deliberadamente internas ─────────────────────────────────────────────────────────────────────
  {
    capability: 'hiring.opening.capacity.confirm',
    status: 'deliberately-internal',
    reason:
      'TASK-1762 (2026-08-23): el cierre MASIVO por capacidad no se federa. Su gate es una confirmación ' +
      'humana contra un digest fresco, y bajo el AI Act la selección es alto riesgo con supervisión ' +
      'obligatoria. Un agente puede leer el preview de la cohorte y el status del run; no dispararlos.',
  },
  {
    capability: 'hiring.candidate.reveal_identity',
    status: 'deliberately-internal',
    reason:
      'Revelar un documento de identidad exige capability + razón + auditoría por acceso humano. Federarlo ' +
      'convertiría una revelación auditada en una llamada de programa.',
  },
  {
    capability: 'hiring.assessment.reveal_access_link',
    status: 'deliberately-internal',
    reason:
      'El enlace seguro se revela UNA vez a un humano tras verificar identidad. Un carril programático ' +
      'vaciaría de sentido esa verificación.',
  },
  {
    capability: 'hiring.candidate.correct_display',
    status: 'deliberately-internal',
    reason:
      'TASK-1736: corregir el nombre de una persona pasa por allowlist humana revisada línea por línea. ' +
      'No es una operación que un agente deba poder disparar.',
  },

  // ── Pendientes declaradas ────────────────────────────────────────────────────────────────────────
  { capability: 'hiring.activation.review', status: 'pending', reason: 'Sin carril. Candidata al barrido del follow-up de TASK-1773.' },
  { capability: 'hiring.application.annotate', status: 'pending', reason: 'Expediente de evaluación (TASK-1735) es internal-only por diseño; falta declarar si eso es definitivo.' },
  { capability: 'hiring.application.write', status: 'pending', reason: 'Mover de etapa desde un agente tiene implicancias propias; declarado fuera de alcance en TASK-1773.' },
  { capability: 'hiring.assessment.ai_assist', status: 'pending', reason: 'Sin carril.' },
  { capability: 'hiring.assessment.author', status: 'pending', reason: 'Sin carril.' },
  { capability: 'hiring.assessment.fairness_read', status: 'pending', reason: 'Sin carril. Evidencia AI Act: federarla exige decidir quién puede leerla.' },
  { capability: 'hiring.assessment.grant_accommodation', status: 'pending', reason: 'Sin carril.' },
  { capability: 'hiring.assessment.read', status: 'pending', reason: 'Sin carril.' },
  { capability: 'hiring.assessment.recover_access_email', status: 'pending', reason: 'Sin carril. Hermana de `reveal_access_link`, que sí es deliberadamente interna.' },
  { capability: 'hiring.assessment.score', status: 'pending', reason: 'Sin carril.' },
  { capability: 'hiring.demand.read', status: 'pending', reason: 'Sin carril.' },
  { capability: 'hiring.demand.write', status: 'pending', reason: 'Sin carril.' },
  { capability: 'hiring.handoff.approve', status: 'pending', reason: 'Sin carril. TASK-1721 lo coordina como saga; su federación va con esa task.' },
  { capability: 'hiring.opening.ai_assist', status: 'pending', reason: 'Sin carril.' },
  { capability: 'hiring.opening.capacity.read', status: 'pending', reason: 'TASK-1762 declara que el preview y el status SÍ se exponen como lectura; falta construirlo.' },
  { capability: 'hiring.opening.publish', status: 'pending', reason: 'Publicar una vacante es efecto externo; declarar si se federa exige decisión propia.' },
  { capability: 'hiring.opening.read', status: 'pending', reason: 'Sin carril.' },
  { capability: 'hiring.opening.write', status: 'pending', reason: 'Sin carril.' },
]
