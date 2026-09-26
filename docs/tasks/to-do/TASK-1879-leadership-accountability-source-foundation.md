# TASK-1879 — Operational Leadership — Accountability and Source Foundation

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `migration`
- Epic: `EPIC-048`
- Status real: `Diseño — planificación creada; sin implementación ni verificación runtime`
- Rank: `EPIC-048-01`
- Domain: `data|delivery|identity`
- Blocked by: `none`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Establecer un resolver de cartera dinámica para cualquier líder y todas las cuentas bajo su responsabilidad operativa durante el período evaluado. SKY, Berel, Motogas y Efeonce interno son sólo el piloto inicial, nunca una lista de producción ni un límite de cardinalidad. Reusar los registros de responsabilidad, fuentes Notion y asignaciones existentes; cerrar gaps de cobertura antes de calcular resultados del equipo.

## Why This Task Exists

La cantidad de tareas propias de una líder no representa el resultado operativo de su cartera. Además, la captura de transiciones está limitada por código a Efeonce/SKY, el reader actual de responsabilidades filtra estado vigente y la capacidad comercial excluye asignaciones internas. Un score sobre esos datos sin validación podría parecer excelente por falta de evidencia.

## Goal

- Producir un binding auditable líder–cuenta–vigencia y una matriz de cobertura de toda la cartera resuelta, incluidas cuentas aún no medibles.
- Capturar evidencia faltante de forma gobernada, sin inventar historia.
- Entregar a TASK-1880 un contrato de universo, temporalidad, capacidad y acceso reproducible.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- `docs/architecture/metrics/ICO_DELIVERY_METRICS_AGENT_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`
- `docs/architecture/agent-invariants/PAYROLL_WORKFORCE_AGENT_INVARIANTS.md`

ADR de liderazgo ya redactado (Proposed, Normative Docs): atribución temporal, evidencia, snapshot y acceso. Revisar/aceptar antes de schema; escribirlo no lo convierte en Accepted. Conservar PostgreSQL como autoridad de bindings/fuentes; BigQuery como proyección analítica, no nuevo registro maestro.

## Normative Docs

- `docs/architecture/GREENHOUSE_OPERATIONAL_LEADERSHIP_MEASUREMENT_V1.md` — contrato funcional/técnico compartido, In design.
- `docs/architecture/GREENHOUSE_OPERATIONAL_LEADERSHIP_MEASUREMENT_DECISION_V1.md` — ADR Proposed, aceptación pendiente antes de implementación.
- `docs/architecture/metrics/POTD_V1.md`, `FTR_V1.md` (§14), `LEADERSHIP_RPA_V1.md`, `ACC_V1.md`, `FRM_V1.md`, `STI_V1.md` — definiciones únicas (todos bajo docs/architecture/metrics).

- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- `docs/context/00_INDEX.md`
- `docs/epics/to-do/EPIC-048-operational-leadership-performance-ico-person-360.md`

Prioridad/esfuerzo inferidos: P1/Alto por impacto en medición y evidencia sensible. Sólo se registra planificación el 2026-09-19; ninguna autorización de deploy, cambio salarial o implementación se desprende de este archivo.

El protocolo del contrato compartido §11 es normativo: diseño resuelto, activación y evidencia runtime pendientes. Mantener estado to-do; ninguna casilla de implementación se satisface con documentación.

## Dependencies & Impact

### Depends on

- Specs de métricas y ADR de liderazgo en Normative Docs: fuente única de fórmulas/temporalidad; no redefinirlas dentro de la task.

- Registro de TASK-227 y hardening TASK-247, ambos complete; reutilizar CRUD/primary semantics.
- TASK-912 conserva la captura base Notion; coordinar únicamente expansión gobernada/cobertura. TASK-921 conserva captura de cambios de fecha.
- `src/lib/ico-engine/enable-client-ico-sync.ts` y proyección outbox existente.

### Blocks / Impacts

- Bloquea TASK-1880 y, transitivamente, TASK-1881.
- TASK-1663 es operating mode organización × módulo, no liderazgo persona × cuenta: no se activa ni duplica.
- La ampliación de captura comparte archivos con TASK-912; comparar su estado/diff antes de editar.

### Files owned

- Documentación: contrato/ADR de liderazgo referenciados en Normative Docs; TASK-1880 posee cambios de métodos en los seis specs de métricas, TASK-1879 sólo identidad/evidencia y TASK-1881 sólo consumo. Coordinar cualquier cambio de fórmula con TASK-1880.

Existentes, cambios acotados al contrato:
- `src/lib/operational-responsibility/readers.ts`, `src/lib/operational-responsibility/store.ts`
- `src/lib/notion-metrics/notion-productive-workspaces.ts`
- `src/lib/sync/projections/notion-status-transition-capture.ts`
- `src/lib/sync/projections/notion-due-date-change-capture.ts`
- `src/lib/ico-engine/enable-client-ico-sync.ts`

Propuestos NUEVOS, verificar naming final antes de implementar:
- `src/lib/ico-engine/leadership/scope.ts`, `source-coverage.ts`, `operational-capacity.ts` y tests colocados.
- Migración versionada en el directorio canónico indicado por DATABASE_TOOLING; no reservar número ahora.
- ADR, matriz de cobertura y runbook de replay/rollback con ubicación canónica a decidir en Slice 1.

## Current Repo State

### Already exists

- `greenhouse_core.operational_responsibilities`: scope, responsibility_type, primary y effective_from/to; el reader vigente no reconstruye historia.
- `greenhouse_core.client_team_assignments`: fechas, miembro, cuenta y asignación FTE; `src/lib/person-360/facets/assignments.ts` no garantiza equipo histórico en todos sus queries.
- `greenhouse_core.space_notion_sources`, enableClientIcoSync y outbox a BQ.
- `greenhouse_delivery.task_status_transitions`, `task_due_date_changes`, `task_ftr_snapshots`.
- `src/lib/member-capacity-economics/store.ts` y `src/lib/agency/team-capacity-store.ts`; el último excluye asignaciones comerciales internas.

### Gap

No existe contrato certificado para responsabilidad histórica, cobertura completa de correcciones, inicio asignable/owner ni capacidad operacional que incluya Efeonce. Los nombres del piloto no son bindings runtime verificados ni definen el universo del producto. La pertenencia debe descubrirse desde responsabilidades; la disponibilidad de una fuente no decide si una cuenta pertenece a la cartera.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/operational-responsibility`, `src/lib/sync/projections`, `src/lib/ico-engine`; portal y ops-worker existentes.
- Future candidate home: `remain-shared`
- Boundary: resolver temporal y evidence readers; commands existentes siguen siendo writers de fuente.
- Server/browser split: DB, Notion y credenciales sólo server-side; entrega DTO mínimo.
- Build impact: sin SDK ni servicio nuevo; cambios compartidos con ops-worker requieren sus gates de build inputs y runtime dependencies.
- Extraction blocker: transacciones/outbox y autorización común; no extracción en esta task.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: migration + sync + reader.
- Source of truth afectado: tablas existentes de responsabilidades, assignments y sources; historial de delivery append-only.
- Consumidores afectados: materializador de TASK-1880; sin pantalla nueva.
- Runtime target: staging → producción interna y worker existente, sólo tras aprobación de ejecución.

### Contract surface

Agregar resolver temporal paginado completo: sujeto, scope, intervalo, asOf, evidencia/versiones, conflictos y razones de no evaluabilidad. No usar el límite implícito de 50 responsabilidades.
Mantener readers actuales compatibles; extender commands de responsabilidad/source cuando sea necesario para publicar cambios auditables atómicamente.
Full API parity: lógica en primitives de src/lib; commands modificados conservan autorización fina, idempotencia, audit/outbox y transporte app/ecosystem/CLI, no SQL desde UI.

### Data model and invariants

Tablas NUEVAS propuestas, sujetas al ADR y búsqueda final de reuso:
- `greenhouse_core.operational_responsibility_versions`: version_id, responsibility_id, effective_from/to, recorded_at, actor, before/after, source_event_id único. Companion histórico del registry, no segunda autoridad.
- `greenhouse_delivery.task_assignment_events`: task_source_id, workspace_id, source_event_id único, previous/new owner, assignable state, occurred_at nullable, observed_at, source_quality. No afirmar fecha exacta cuando sólo existe observación.
- `greenhouse_delivery.source_metric_coverage`: source/space/metric, coverage_start/end, capture_mode, completeness, gap_reason, reconciled_at, evidence_ref y versión. Cobertura del pipeline no prueba historia de cada tarea; exponer ambas.

Write-target allowlist: incluir explícitamente tablas nuevas en guards de dominio existentes en el MISMO PR, con justificación; comprobar también grants de roles PostgreSQL.
Tenant/space: identidad de fuente validada server-side contra registry; nunca aceptar space_id del webhook como autoridad.
Idempotency/concurrency: evento proveedor + handler + source como clave; inserción/versión/outbox en transacción; replays y eventos tardíos no reescriben historia ni demueven primaries sin guardar before-state.
Invariantes: sólo una atribución primaria por cuenta/instante según ADR; conflictos producen no evaluable. Los miembros se resuelven temporalmente, no por jerarquía actual.

### Migration, backfill and rollout

Expand-only, índices para source/task/tiempo y member/scope/vigencia. Migración primero, readers después, captura allowlisted por fuente.
Backfill dry-run con conteos/checksum → lotes limitados → reconciliación. Sembrar estado actual con observed_at, nunca inferir effective_from o cero correcciones del pasado. Si no hay eventos históricos fiables, declarar coverage_start y unavailable.
No aplicar Down destructivo sobre eventos append-only; rollback desactiva writers y preserva evidencia. Ensayar compensaciones para backfill incorrecto antes de apply.

### Security and access

Reusar sesión/capability y checks People/organization; responsabilidad no concede acceso por sí misma.
No exportar salario/costo desde capacity economics; sólo capacidad operacional autorizada. Errores canónicos sanitizados, captureWithDomain; no raw payload en logs.
Replay guard, cuotas/backoff Notion y breaker existentes. Expansión de fuentes requiere binding validado, no wildcard ni demos.

### Runtime evidence

Tests deterministas de vigencias, límites, eventos duplicados/fuera de orden y scope; migration test por rol; replay webhook y lectura DB en staging.
Matriz por cuenta: source ID, scope ID, cobertura por campo/evento, primera fecha fiable, lag, gaps, responsable y evidencia redacted.
Señales propuestas: leadership.source_coverage_gap, leadership.scope_conflict, leadership.capture_lag; registrar en sistema canónico, sin nuevo monitor paralelo.
Producción: lectura de bindings + reconciliación de eventos + replay idempotente controlado; logs sin secretos.

### Acceptance criteria additions

- [ ] Sources, invariantes, boundaries y write allowlists verificados con tests.
- [ ] Migración/backfill/rollback ensayados; evidencia real por fuente sin historia inventada.
- [ ] Errores, auditoría, señales y consumidores programáticos verificados.

### Capability Definition of Done

- [ ] Cada command tocado vive en primitive, tiene capability + grant real en el mismo PR y coverage test.
- [ ] App/ecosystem/CLI operan el mismo contrato; writes admiten propose → confirm → execute.
- [ ] No duplicar lógica por UI, Nexa, worker o transporte.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — ADR y matriz certificada

Entregar ADR y contrato de resolución dinámica para cualquier líder/período: autoridad de asignación, normalización de cuenta, historial, conflictos y evidencia de cobertura. Validar read-only el piloto de Daniela sin convertirlo en filtro. Entregar fixtures de 0/1/4/5/51/201 cuentas y dos líderes. La lista finita del canary sólo controla activación inicial de fuentes, no membresía de cartera.

### Slice 2 — Temporalidad y capacidad operacional

Agregar historial/versionado necesario y resolver asOf con intersección de vigencias. Crear DTO operacional reutilizando base de capacidad: demanda interna incluida, resto de compromisos de cada miembro cuenta para disponibilidad sin filtrar nombres de otras cuentas.

### Slice 3 — Captura y cobertura

Extender sources productivas desde registry validado, sin listas estáticas por nombre. Capturar owner/assignable cuando exista evidencia y completar trazabilidad de status/due-date. Documentar pérdida posible de estados intermedios en refetch; reconciliar, no certificar por source_quality='canonical' solamente.

### Slice 4 — Migración, replay y entrega

Dry-run/backfill conservador, pruebas multi-cuenta y canary. Entregar contrato y fixtures a TASK-1880; datos no disponibles siguen explícitos.

El resolver de sujetos también descubre líderes históricos con hechos atribuibles del período. Fixture: A revisa en agosto, sale el 1 de septiembre y la entrega cierra en septiembre; A conserva atribución histórica, B gestión actual. No contar esa cuenta como asignación operativa actual de A. Ausencia de permisos actuales suprime lectura histórica, no reescribe atribución.

Capacidad cross-account requiere el resumen explícitamente autorizado de ACC_V1; sin grant no emitir capacidad libre basada sólo en compromisos visibles. Probar C40/Dvisible20/Doculta30: autorizado125%, no autorizado sin valor, nunca50% disponible.

## Out of Scope

Fórmulas/materializador/UI de liderazgo, política de bono, cambiar capacidad comercial global, rehacer responsabilidad genérica, activar operating mode de TASK-1663, configurar cuentas no autorizadas.

## Detailed Spec

### Dynamic portfolio contract — obligatorio

La fuente de pertenencia es `operational_responsibilities`, no una lista del piloto, un grant de acceso, `client_team_assignments`, reporting_lines, presencia de tareas ni `sync_enabled`.
Resolver tres planos independientes: (1) responsabilidad del líder, (2) participación/capacidad del equipo, (3) permiso del observador. Un diseñador compartido con otra cuenta no extiende la responsabilidad del líder.

V1 usa responsabilidades explícitas de delivery/operaciones por cuenta/space con vigencia. La política versionada define tipos elegibles y precedencia si hay delivery_lead y operations_lead en el mismo scope; no fusionar ambos como dos créditos primarios. Otros tipos (account_lead, approval_delegate) no se suman por conveniencia.
La regla funciona para cualquier memberId autorizado, no sólo Daniela. Ser jefa de operaciones no implica automáticamente toda la agencia.

Para operationalPortfolio, por cada responsabilidad con intervalo que intersecta [periodStart,periodEnd), resolver `account_scope_id` estable, intervalos efectivos, source responsibility IDs/version y motivo de inclusión. En período abierto cortar elegibilidad en asOf; una asignación con inicio futuro se informa como scheduled, no aporta resultados actuales. Materialización histórica usa historia, incluso de asignaciones hoy inactivas. Altas, bajas y reingresos se conservan como intervalos disjuntos; active actual nunca borra historia.
Distinguir organización comercial, cuenta/unidad operativa y space: definir en ADR cómo se normalizan aliases y múltiples spaces a cuenta, evitar duplicar tareas/sources. Una cuenta puede tener cero o varias fuentes. Scope project no se amplía a cuenta completa; scope sin mapping queda unresolved con alerta, no desaparece.

Resolver el manifest compuesto operativo + metricAttribution por período/asOf según contrato compartido §3: lista completa de cuentas/intervalos y cuentas con atribución histórica (membershipReason separado), versión/digest, conflictos, bindingStatus y references de fuente. No persistir una segunda lista manual de cuentas por persona. Un snapshot derivado y versionado sí preserva el resultado histórico.
Enumeración completa con orden estable/cursor (no truncar a 50/200); snapshot consistente durante paginación. Procesamiento por lotes, queries set-based e índices por member/scope/vigencia. Publicar límites/mediciones de performance en ejecución, nunca llamar “sin límite” al runtime.

### Onboarding, changes and source readiness

Asignar o revocar responsabilidad mediante commands canónicos actualiza el universo al siguiente ciclo ICO exitoso, sin editar código/config de despliegue ni redeploy para una cuenta del modelo/fuente ya soportados. Outbox invalida/agenda el scope afectado; reconciliación periódica desde SoT recupera evento perdido. Efectos futuros empiezan al effective_from, no al recorded_at.
Alta de cuenta, asignación de líder, permisos y habilitación de fuente son operaciones separadas. Una cuenta nueva sin fuente o con sync OFF aparece como pending_source/disabled_source; captura parcial aparece como insufficient_history. No concede permisos, compra acceso ni activa integración automáticamente.
Eliminar una fuente no elimina la cuenta; baja de cuenta/responsabilidad cierra vigencia y conserva cierres. Reasignar A→B no cambia meses locked ni atribuye a B el tramo previo. Corrección histórica requiere revisión explícita de TASK-1880.
Configurar nuevas fuentes Notion soportadas vía registry/commands existentes, no añadir una rama por marca, un enum de workspace, migración/seed por cliente ni lista hardcodeada en jobs. Sustituir el resolver estático Efeonce/SKY por resolución desde fuente registrada y validada, conservando rechazo de demo y aislamiento por tenant; no abrir la suscripción indiscriminadamente. Proveedor o esquema no soportado queda unsupported_source visible; necesita trabajo de adapter, no una falsa promesa de ingestión universal.
Herencia “todas las cuentas de la agencia” NO activada en V1. Si se aprueba después: scope organizacional inequívoco, pertenencia temporal, exclusiones y precedencia explícitas, evaluación del aumento de alcance; nunca un wildcard derivado del cargo o de permisos.

### Scale and change acceptance matrix

| Caso | Resultado obligatorio |
|---|---|
| 0 cuentas | empty portfolio, diferente de cuentas sin datos |
| Quinta cuenta asignada | manifest la incluye en próximo ciclo sin código/deploy; medición según vigencia/readiness |
| Quinta cuenta sin fuente | visible como no medible; no score perfecto ni desaparición |
| 51 y 201 cuentas | enumeración exacta sin truncado, duplicados ni consultas por fila |
| Dos líderes/equipo compartido | carteras independientes; tarea ajena del colaborador no amplía alcance |
| Baja/reingreso/cambio a mitad de mes | intervalos trazables, sin atribución retroactiva ni solapamiento silencioso |
| Dos sources/spaces/roles del mismo scope | normalización y deduplicación por regla explícita, o conflicto no evaluable |
| Evento de asignación perdido/replay | reconciliación converge; retry no duplica membresía |
| Scope agregado sin política | no expansión implícita; unresolved visible al operador autorizado |

### Attribution policy propuesta para aprobación

Universo por cuenta = tareas de delivery elegibles, incluidas sin owner. Un task_source_id/workspace no se cuenta dos veces por múltiples relaciones de proyecto.
Responsabilidad efectiva en [from,to); resolver día/hora/zone de límites explícitamente. Recomendación: POTD por lead vigente al compromiso de vencimiento congelado; FTR/RpA por lead de la primera entrega elegible; ACC/FRM por lead al corte/detección. Conservar binding usado; cambios posteriores no transfieren retroactivamente resultados.
Cambio de fecha/cuenta/lead exige historial; sin él, no reconstruir precisión ficticia. Acuerdo del owner del negocio es gate de Slice 1; no hardcodear nombres. Co-leads secundarios consultan contexto sin duplicar rollup, salvo decisión explícita versionada.
Contribución individual de Daniela sigue en ICO individual; sus entregas pueden formar parte del universo de resultados del equipo UNA vez, nunca generar crédito personal extra.

### Capacity and assignable contract

Definir estados asignables, canceladas/demos/subtareas excluidas, inicio asignable y primary owner interno válido. Owner válido y capacidad suficiente son dimensiones separadas: no convertir FTE en porcentaje de cobertura.
Capacidad disponible considera jornada efectiva, leave y compromisos con fechas, sin divulgar motivos médicos ni economía personal. No inferir horas por número de tareas, ni null=0. Si faltan estimaciones, mostrar FTE comprometida y límites, no utilización fabricada.
El change log de responsable registra actor/origen/tiempo y reason de corrección; acciones nuevas no fabrican fecha de asignación histórica.

### Delivery to calculation

Contrato tipado con account scope, leader, responsibility version, team interval, source IDs, coverage por métrica/campo, timezone, asOf y exclusiones. Tests de cambio a mitad de mes, reingreso, lead sin binding, >50 scopes, fuente demo, cuenta interna, equipo compartido y leave parcial.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

1 → 2 → 3 → 4. ADR aceptado antes de schema. No habilitar cálculo confiable hasta matriz reconciliada.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Refetch pierde correcciones intermedias | sync | high | coverage conservadora/reconciliación | source_coverage_gap |
| Primary actual altera historia | identity/data | high | before-state versionado/asOf | scope_conflict |
| Cuenta interna queda fuera | capacity | medium | reader operacional separado + fixture | diferencias de reconciliación |
| Replay duplica evidencia | DB | medium | unique/transaction/retry | duplicate/replay counters |

### Feature flags / cutover

Proponer control de captura por source, default OFF para nuevas fuentes; reusar sync_enabled donde semántica coincida. No apagar captura base Efeonce/SKY al revertir liderazgo. No flags/runtime modificados por esta planificación.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | Mantener ADR Proposed si no aprobado | inmediato | sí |
| 2 | Desactivar nuevo reader; conservar historial | objetivo 15 min, ensayar | sí, sin borrar evidencia |
| 3 | Desactivar sólo sources nuevas y drenar/reintentar outbox | objetivo 15 min, ensayar | parcial: hechos conservados |
| 4 | Invalidación auditada del lote, no DELETE de hechos | ensayar antes de apply | compensatorio |

### Production verification sequence

Staging schemas/grants → fixtures multi-cuenta → replay duplicado → rollback ensayo → fuentes allowlisted en producción → lectura real de bindings/coverage → vigilar lag/gaps 7 días. Stop si pierde eventos base o cambia métricas individuales.

### Out-of-band coordination required

Owner operativo confirma cuentas/vigencias y catálogo asignable; responsable Notion confirma acceso de integración/capture. HR valida capacidad sin exponer datos privados. Sin esas evidencias la task sigue abierta, no se inventan permisos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Delta — captura y responsabilidad efectiva (diseño)

Resolver roles de captura y suplencia desde asignaciones/bindings gobernados, no listas de nombres. Exponer en el contrato de evidencia sourceEventId/ref, occurredAt/recordedAt, actor, asset/cycle, cobertura/watermark y gap reasons. Historia de delegación conserva scope y [from,to), aprobador y motivo; no derivarla de permisos o vacaciones. Proponer campos aditivos sólo donde el schema actual no los represente y certificar unicidad antes de la migración.

Conciliación diaria registra gaps por fuente y casos, sin crear eventos correctivos artificiales. Sólo evidencia validada recupera confianza. Audit/readers respetan acceso al origen; referencias privadas no se exponen por estar en un indicador agregado. Propietarios nombrados y suplentes son gate operativo de activación, no seed de Daniela.

## Delta — RpA y protocolo de liderazgo ICO (2026-09-19)

Para RpA/FTR, certificar identidad source/workspace/task y ciclo, primera revisión cliente, cobertura histórica y deduplicación por evento conforme LEADERSHIP_RPA_V1. Una transición existente no certifica captura completa; fuentes ambiguas/incompletas conservan cuenta y estado no evaluable.

## Acceptance Criteria

- [ ] Revisión adversarial EPIC-048: cumplir doble manifest operativo/histórico, reapertura sin duplicación, unidad coverageRatio y dependencias por hito según contrato/specs; evidencia de los casos de su dominio registrada, no sólo texto.


- [ ] Protocolo §11.1–11.2: captura con responsable/contacto y suplente, ocurrido vs registrado, referencia autorizada y conciliación diaria; feedback sin transición no produce cero confiable.
- [ ] Suplencia/ausencia/transferencia mixta conservan cohorte histórica y exponen responsabilidad efectiva; conflicto bloquea evaluación, sin ocultar trabajo ni ampliar acceso.


- [ ] Para RpA/FTR, certificar identidad source/workspace/task y ciclo, primera revisión cliente, cobertura histórica y deduplicación por evento conforme LEADERSHIP_RPA_V1. Una transición existente no certifica captura completa; fuentes ambiguas/incompletas conservan cuenta y estado no evaluable.


- [ ] Métodos, estados y casos edge se ajustan a specs canónicos/ADR de Normative Docs; aprobación del ADR y calibración pendientes se registran sin confundir documentación con implementación.

- [ ] Matriz de escala/cambios completa probada: quinta cuenta por command sin código/deploy, 51/201 cuentas sin truncado, dos líderes y recuperación de evento perdido.
- [ ] Pertenencia independiente de fuente/permisos/equipo; cuenta sin datos visible, sin autorizar ni activar integraciones por asignación.
- [ ] Manifest temporal conserva altas/bajas/reingresos, mapping multi-space y conflictos; herencia organizacional no se infiere.

- [ ] ADR aceptado y resolver líder/período devuelve toda la cartera de responsabilidad, sin nombres, IDs de piloto o cardinalidad fija en lógica; piloto real validado por separado.
- [ ] Historia reproducible asOf; reasignaciones no reatribuyen períodos anteriores.
- [ ] Captura conserva event-time vs observed-time; gaps y falta de historia no equivalen a cero.
- [ ] Efeonce interno incluido en capacidad operacional sin cambiar economics comercial.
- [ ] Deduplicación, outbox atómico, paginación, conflictos y grants probados.
- [ ] Pruebas de aislamiento entre cuentas y redacción de Payroll/capacidad de terceros.
- [ ] Dry-run, apply controlado, rollback y readback documentados; TASK-1880 recibe fixtures/contrato.

## Verification

Plan futuro: unit/integration tests focales, `pnpm typecheck`, `pnpm lint`, migraciones con tooling canónico y `pnpm test:live` para evidencia DB serializada (nunca source .env.local). Si afecta worker: build-contract/runtime-deps gates. Cierre: task lint, QA y docs closure; no se ejecutan implementaciones con esta planificación.

## Closing Protocol

- [ ] Lifecycle y carpeta reflejan ejecución y verificación reales; no cerrar por código solamente.
- [ ] Sincronizar README, registry y progreso/acceptance del EPIC-048.
- [ ] Actualizar Handoff.md y changelog cuando exista cambio de comportamiento; registrar evidencia, pendientes y owners.
- [ ] Ejecutar chequeo de impacto cruzado con las tasks citadas; preservar trabajo ajeno.
- [ ] Manuales, observabilidad, rollback y readback runtime disponibles antes de complete.

## Follow-ups

La política prospectiva de compensación exige solicitud independiente de HR/Finance. Este programa no recalcula bonos, no aplica consecuencias salariales y no modifica Payroll.


## Delta 2026-09-19 — Cartera dinámica

Corrección solicitada por el operador: el piloto no define el universo. La foundation entrega descubrimiento continuo por responsabilidad/vigencia, contrato de manifest y onboarding sin cambios de código. Sólo planificación; ADR sigue pendiente de aprobación en ejecución.

## Open Questions

Gate de Slice 1: aprobar instante de atribución por métrica, mapping canónico de cuenta y suficiencia del historial. Política V1: responsabilidades explícitas por cuenta/space; una responsabilidad de organización/departamento no hereda cuentas sin política expresa aceptada en el ADR. Son decisiones explícitas pendientes, no defaults aplicados en producción.
