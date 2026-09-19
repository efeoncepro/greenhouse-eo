# TASK-1880 — ICO — Operational Leadership Performance Engine

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
- Rank: `EPIC-048-02`
- Domain: `data|delivery|identity`
- Blocked by: `TASK-1879`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Calcular y publicar resultados de liderazgo en ICO por líder, cuenta y período usando evidencia certificada por TASK-1879. Materializar POTD, FTR, RpA, ACC, FRM y STI con numeradores, cobertura, confianza e historia auditable; exponer un reader común para Person 360 y consumidores programáticos.

## Why This Task Exists

El ICO por miembro acredita ejecución individual. No puede usarse como evaluación de responsabilidad sobre el equipo ni premiar escasez de tareas/correcciones registradas. Se necesita una proyección separada, no cambiar métricas por persona ni promediar porcentajes entre cuentas.

## Goal

- Implementar métricas de liderazgo versionadas, explicables y reproducibles.
- Publicar snapshots diarios/mensuales con cierre revisado y correcciones auditadas.
- Servir evidencia autorizada sin acoplarla a UI ni Payroll.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- `docs/architecture/Contrato_Metricas_ICO_v1.md`
- `docs/architecture/metrics/ICO_DELIVERY_METRICS_AGENT_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_METRIC_SPEC_PATTERN_V1.md`
- `docs/architecture/GREENHOUSE_ICO_MATERIALIZER_HARDENING_V1.md`
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/agent-invariants/PAYROLL_WORKFORCE_AGENT_INVARIANTS.md`

ADR de TASK-1879 debe aceptar fronteras de cálculo/snapshot/acceso antes de schema. Especificaciones críticas nuevas siguen las 12 secciones del Metric Spec Pattern y se indexan; FTR reutiliza su fórmula vigente, no otra versión semántica con igual nombre.

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

- TASK-1879: binding temporal, universo, evidencia de captura y capacidad operacional certificados.
- TASK-900: orquestación existente. TASK-1216: reader personal y acceso reusable.
- TASK-733/734: freeze/concurrency compartidos todavía tienen trabajo pendiente; no presumir garantías inexistentes. Esta task debe probar aislamiento local y acordar integración antes del corte.

### Blocks / Impacts

- Bloquea TASK-1881 hasta DTO, policy y fixtures estables.
- No modifica métricas salariales de EPIC-009 ni reinventa signals de EPIC-006.
- No mueve ownership de materialización general; cambios compartidos mínimos y coordinados.

### Files owned

- Documentación: contrato/ADR de liderazgo referenciados en Normative Docs; TASK-1880 posee cambios de métodos en los seis specs de métricas, TASK-1879 sólo identidad/evidencia y TASK-1881 sólo consumo. Coordinar cualquier cambio de fórmula con TASK-1880.

Existentes:
- `src/lib/ico-engine/materialize-orchestrator.ts`, `materialize-tracking.ts`, `schema.ts`
- `src/lib/ico-engine/metric-registry.ts`, `metric-trust-policy.ts`
- `src/lib/people/person-activity-access.ts`
- `src/lib/api-platform/resources/people-performance-shared.ts` como patrón, no reemplazo de su respuesta.

Propuestos NUEVOS:
- `src/lib/ico-engine/leadership/{types,calculate,materialize,read,trust-policy,commands}.ts` y tests colocados.
- `src/lib/api-platform/resources/people-leadership-performance-shared.ts` y adaptadores app/ecosystem/session correspondientes.
- Migraciones versionadas, specs de métricas y runbook de materialización/cierre con nombres finales aprobados en Slice 1.
El lookup de rutas/recursos definitivos precede su creación; son destinos propuestos, no APIs existentes.

## Current Repo State

### Already exists

- `ico_engine.delivery_task_monthly_snapshots`, `metrics_by_member` en BigQuery y `greenhouse_serving.ico_member_metrics` en PG.
- `src/lib/ico-engine/{materialize,materialize-sql-builders,read-metrics}.ts`.
- `src/lib/notion-metrics/calculate-ftr.ts`, calculateRpaV2 y transiciones; windowStart no debe truncar revisiones de una entrega al inicio del mes.
- Tracking PG `greenhouse_sync.ico_materialization_runs`.
- Person Activity policy exige permisos People/ops/supervisor; ser el propio miembro NO garantiza acceso.

### Gap

No hay scorecard líder–cuenta ni lock/revisión propios. El materializador actual admite force sobre períodos locked: un freeze declarado no garantiza inmutabilidad. La respuesta nueva debe conservar evidencia/fórmula/binding de cada revisión.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/ico-engine`, API platform y orquestador/worker existentes.
- Future candidate home: `remain-shared`
- Boundary: leadership performance aggregate, commands de cierre/intervención y reader autorizado.
- Server/browser split: cálculos, consultas y policy server-only; UI recibe DTO serializable.
- Build impact: módulos compartidos y schema/tracking nuevos, sin runtime ni SDK adicional.
- Extraction blocker: transacciones, freshness y autorización compartidas; no nuevo servicio.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: migration + reader + API + materialization.
- Source of truth afectado: evidencia canónica delivery/responsibility; nuevas proyecciones ICO derivadas.
- Consumidores afectados: Person 360, app/ecosystem/MCP y CLI gobernada.
- Runtime target: staging, worker y producción interna en shadow.

### Contract surface

Proponer recurso `people/leadership-performance` y reader readLeadershipPerformanceForSubject, separados del default individual. Parámetros: memberId, year/month, accountScope opcional, asOf/revision cuando corresponda, paginación/cursor acotado para cuentas y evidencia. Cuenta filtrada limita la lectura autorizada, no redefine el universo materializado.
Respuesta tipada: subject, period/timezone, revision, formulaVersion, scopeVersion, portfolioManifestVersion, assignedAccountCount, measurableAccountCount, pendingAccountCount, accountResults, portfolio, sourceCoverage, freshness, exclusions y drilldown autorizado.
Mismo primitive para adaptadores session/app/ecosystem; MCP/Nexa usan recurso registrado con manifiesto/gates pertinentes. No ampliar gateways/cohort por inferencia.
Commands de lock/correct e intervención: autorización fina, idempotency key, expectedRevision, reason obligatorio, audit/outbox; no botones que mutan SQL.

### Data model and invariants

Tablas NUEVAS propuestas, reconciliar en ADR:
- BQ `ico_engine.leadership_account_period_snapshots`: leader_member_id, account_scope_id, period, revision, method_version, scope_version, counts/coverage y source_digest.
- PG `greenhouse_serving.ico_leadership_periods`: llave única leader+period+revision, lifecycle, source_watermark, computed_at, locked_at/by, supersedes_revision, digest.
- PG `greenhouse_serving.ico_leadership_account_metrics`: FK de revisión, account, metric_key, method_version, numerator/denominator/value nullable, sample/coverage, confidence, reason_codes.
- PG `greenhouse_delivery.leadership_risk_actions`: risk_instance_id, actor, action_type, occurred_at/recorded_at, evidence_ref, idempotency_key; sólo intervenciones reales. Reusar store de señales para detección/resolución si tiene historia suficiente, sin crear fuente competidora.
- Evidencia por tarea/bucket/binding se conserva en snapshot analítico particionado y versionado; decidir retention/pseudonimización explícita sin destruir trazabilidad permitida.

La revisión incluye un manifest derivado de cartera completo, con account_scope_id, intervalos, responsibility versions, binding/readiness state y source refs, incluso cuando no existe fila métrica. Persistirlo en estructura hija de ico_leadership_periods (tabla NUEVA propuesta ico_leadership_period_accounts), no mediante inner join que omita cuentas sin métricas. FK/revisión e índice subject+period+account; el número de cuentas no cambia schema.

No UPDATE de metrics_by_member ni writes a Payroll. Separar lifecycle `working|locked|superseded` de confidence `valid|low_confidence|unavailable` y freshness `fresh|stale`.
Write-target allowlists/grants nuevos en mismo PR. Índices por subject/period/revision/account y riesgo/tiempo; unicidad contra retries.
Publicación BQ→PG con run_id/source_digest y watermark coherentes: fallos dejan snapshot anterior, nunca mezcla de revisiones entre cuentas. Lock transaccional por subject+period; concurrent jobs convergen por clave/digest. No transacción distribuida ficticia: staging de revisión y publish marker sólo después de verificar ambos destinos.

### Migration, backfill and rollout

Expand-only → dual-read shadow sin reemplazar individual → materializar ventanas con evidencia suficiente → reconciliar → lectura interna.
Dry-run cuenta y período allowlisted; reejecución idempotente y presupuesto de consultas. Backfill no convierte falta de historia en 0/100.
Corrección locked crea nueva revisión aprobada y supersedes, no overwrite por force. Guardar inputs/digest propios evita depender de freeze upstream no garantizado.
Rollback: desactivar publicaciones/lectura nuevas, volver a última revisión sana y conservar hechos; ninguna Down borra intervenciones o cierres.

### Security and access

Reusar PeopleActivitySubject y anti-IDOR, luego intersectar scopes autorizados con portfolio requerido. Responsabilidad no concede permisos. Clientes externos denegados, incluso con memberId válido.
Una intersección parcial se rotula partialScope y no se presenta como cartera completa; no filtrar existencia de cuentas prohibidas en errores. Auditoría de acceso a evidencia.
Daniela sólo ve self/team si entitlement lo permite; si falta, diseñar grant mínimo y test, no dar People global. Revocados/expirados no autorizan.
Sin salaries, costos ni motivos privados de leave. Errores canónicos sanitizados, límites de rango/página y rate limits por transport.

### Runtime evidence

Tests de fórmula con valores esperados, autorizaciones app/ecosystem/session, concurrencia real de publicación, PG roles, BQ/PG reconcile y reintentos.
Señales propuestas: leadership.materialization_failed, leadership.source_stale, leadership.snapshot_drift, leadership.lock_conflict, leadership.insufficient_coverage.
Readback productivo verifica resultados por cuenta y suma contra fixtures/evidencia; deploy verde no prueba cálculo.

### Acceptance criteria additions

- [ ] Tablas/allowlists, source of truth, invariantes y parity documentados/probados.
- [ ] Migration, dry-run, rollback y backfill reconciliados sin tocar Payroll.
- [ ] Errores sanitizados, audit y señales observables con evidencia runtime.

### Capability Definition of Done

- [ ] Primitive único de lectura y commands; registry/capability + grant real + tests en mismo PR.
- [ ] Paridad app/ecosystem/session y consumidores declarados; write con propose → confirm → execute.
- [ ] Commands lock/correct/intervention no dependen de UI para autorización, validación ni audit.

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

### Slice 1 — Contratos y métodos

Revisar y aceptar los specs de POTD/ACC/FRM/STI y extensión FTR §14 y contexto LEADERSHIP_RPA_V1 ya publicados en diseño, sin recrearlos ni duplicar fórmulas. Definir DTO, policy, sample minimums/config versionada y fixtures de aceptación con owner. No fijar metas/ponderaciones arbitrarias.

### Slice 2 — Proyección y cálculos

Migración expand-only, cálculo puro, materialización account/portfolio y lineage. Extender tracking de materializadores, no ejecutar cron paralelo por defecto. Implementar publish marker, locking e idempotencia antes de activar.

### Slice 3 — Reader, acciones y cierre

Reader y paridad, commands de intervención y lock/correct con revisión humana, autorización y errores. Catálogo de acciones: acknowledge, assign, unblock, escalate, resolve con evidencia; no todas prueban resolución.

### Slice 4 — Shadow y operación

Canary inicial con las cuentas del piloto, más pruebas de alta de quinta cuenta y dos líderes. El alcance productivo es la cartera dinámica de cada líder, no el canary. Daily refresh, weekly review, monthly lock y quarterly STI. Documentar dos/tres meses shadow, baseline y comparabilidad. Aprobación de Producto/Ops para consumo operativo; sin nueva política salarial.

## Out of Scope

UI/JSX, redefinir OTD/RpA/FTR individual, promedio de KPIs como score sintético, ranking de personas, payroll/bonos y ampliación a clientes externos.

## Detailed Spec

### Dynamic portfolio materialization and API

Consumir exclusivamente el manifest de TASK-1879 para cualquier leader_member_id. Descubrir también nuevos líderes con responsabilidad elegible mediante query completa; no mantener roster de Daniela ni lista fija de subjects/cuentas. Un líder sin cuentas en el período emite empty, no resultado perfecto.
Cada run congela manifestVersion/asOf antes de procesar lotes; el alta/revocación durante el run invalida publicación o queda visible como scope pending hasta siguiente revisión, nunca produce una cartera mezclada. Reconciliación incluye nuevas cuentas sin source/snapshot. El snapshot previo se puede mostrar como stale/previousScope, nunca como cartera actual completa.
Distinguir: assignedAccountCount (cuentas del manifest), measurableAccountCount POR MÉTRICA, pendingAccountCount POR RAZÓN, y cuentas legítimamente sin tareas. El porcentaje de cuentas con datos no es cobertura de tareas: si falta una fuente no conocemos su volumen, taskCoverage debe ser null/unknown, no 100%.
El rollup sobre datos conocidos se rotula observedSubset y partial cuando falta evidencia; conservar numerador/denominador observados sin imputación ni renormalización como nota completa. No convertir una cuenta no medible en eligible=0. Minimums se aplican por métrica/cuenta y portfolio, no como gate “tienen datos las cuatro”.
Paginación/orden/filtros son del detalle: el agregado server-side abarca TODO el scope autorizado seleccionado, nunca sólo la página. DTO distingue fullPortfolio, authorizedSubset y filteredSubset; totales, nombres, agregados y metadata no revelan cuentas fuera de permisos. No enviar un agregado completo si permite inferir datos de cuentas prohibidas.
Nuevas cuentas de fuentes soportadas se incorporan en el siguiente ciclo tras asignación, sin código/deploy; estados pending_source, disabled_source, insufficient_history y unsupported_source siguen visibles en el manifest autorizado.

### History, comparison and bounded scaling

Persistir vigencia por cuenta/leader; salidas no reescriben locked. Correcciones de responsabilidad backdated generan propuesta de revisión auditada, nunca recomputación automática de meses cerrados.
STI separa evolución de cohort comparable de cambio de composición (cuentas nuevas/retiradas, intervalos/mix); muestra scopeChanged y métricas no comparables cuando corresponda. No confundir ingreso de una cuenta fácil con mejora del equipo.
La política de rollout es aparte de membresía. Canary allowlist es temporal y DB/config gobernada; registrar owner y condición de retiro: canary reconciliado + acceso/rollback aprobados. Release general procesa todas las carteras elegibles; onboarding no exige añadir un ID a una lista de deploy. Mientras siga canary, cuentas fuera de él se marcan not_enabled_for_rollout, no ausencia de responsabilidad.
Lectura paginada y cálculos set-based/batches con budgets, índices y tracking por run/leader/period; evitar query por cuenta/tarea. Fallo de una fuente produce coverage parcial, no bloqueo infinito ni borrado del resto. Medir 1/5/51/201 cuentas y dos líderes; declarar límites y latencia medida antes de activar, sin prometer escala ilimitada.
Pruebas de contrato: quinto cliente sin datos → habilitación gobernada → cobertura parcial → métrica válida; cambio 4→5 a mitad del mes; >pageSize; dos líderes; multi-space; fuente compartida; revocación; cambios durante publicación y rebuild del manifest.

### Metric definitions and fixtures

Definiciones, cálculos y casos numéricos son los specs de Normative Docs. Implementar sus fixtures como tests de comportamiento; ningún valor de test fija una meta laboral. POTD/FTR/RpA conservan dependencias canónicas; ACC/FRM son familias y STI vector, no scores sintéticos.

### Time and universe

Períodos de negocio America/Santiago con límites [start,end), conversiones UTC y DST probadas; period_end+1 day es inicio de conciliación, NO lock automático.
Usar snapshot/asOf común para cuentas; tasas no incluyen vencimientos futuros como éxito. Mostrar futureDue separado. Tareas multi-asignadas/cross-project se deduplican por identidad de fuente. Cambios de cuenta/due-date/leader siguen policy congelada de TASK-1879.
FTR entre entregas completadas; reabiertas/canceladas y múltiples ciclos deben seguir fórmula canónica con ciclo/evento identificable, no recuento arbitrario.

### Trust and review

Config versionada por métrica: minSample, minCoverage, freshnessBudget, SLA/calendario (FRM), baselineWindow y effective date. Valores requieren calibración y aprobación, no hardcodear 90%/24h por intuición.
Emitir resultado diagnóstico parcial junto a confidence y motivos, bloquear comparaciones/conclusiones cuando faltan cuentas o historia. No renormalizar cartera excluyendo silenciosamente cuentas malas/desconocidas. Portfolio publicado incluye cobertura del universo total; datos desconocidos no se imputan.
Cierre: reconciliar cobertura, universo, excepciones y source watermark; reviewer distinto del sujeto para lock de evaluación, auditoría de excepción. Cierres provisionales/degradados pueden conservar evidencia, pero no afirmarse confiables.
Revisión semanal registra decisiones reales; no crea mensajes Teams automáticos ni cuenta actividad del chat como rendimiento.

### Cadence

Daily: encadenar al ciclo ICO tras freshness de fuentes; actualizar working, mostrar updatedAt.
Weekly: owner operativo revisa todas las cuentas de la cartera resuelta para la semana, altas/bajas, backlog, ownership/capacidad y acciones.
Monthly: día siguiente al cierre → conciliación → aprobación/lock. Si upstream tarda, estado pending_reconciliation.
Quarterly: STI sólo tres meses locked comparables contra baseline aprobado.
Shadow: mínimo dos cierres para calibración. STI completo exige tres meses actuales más baseline comparable de tres meses; seis meses si no hay historia certificada. Calendario real es evidencia, no simulación que cierre aceptación.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

TASK-1879 → 1 → 2 → 3 → 4 → consumo productivo TASK-1881. UI puede planificarse con DTO fixtures, no afirmar rendimiento real antes de canary.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Falta de datos parece perfección | ICO | high | trust/coverage separado + null | insufficient_coverage |
| BQ y PG divergen | data | medium | publish marker/digest y snapshot anterior | snapshot_drift |
| Concurrent force altera cierre | ICO | medium | revisión inmutable/CAS y guard local | lock_conflict |
| Fuga de cuenta o datos HR | API | medium | scope/policy/redaction en primitive | access-denied audit |
| Historial/mix altera STI | analytics | high | comparable baseline/method/version | non_comparable reason |

### Feature flags / cutover

Propuestos NUEVOS: leadership materialization y leadership read, default OFF, más allowlist de scopes del canary. Naming final y owners se registran en catálogo canónico. No cambiar flags actuales del ICO individual; flag no sustituye autorización.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | Retener propuesta sin promoción | inmediato | sí |
| 2 | Pausar publisher; conservar última revisión | objetivo 15 min, ensayar | sí |
| 3 | Revocar lectura nueva y pausar commands; audit intacto | objetivo 15 min, ensayar | compensatorio |
| 4 | Volver a shadow/read OFF, conservar cierres | objetivo 15 min, ensayar | sí, sin borrar evidencia |

### Production verification sequence

Migración/grants staging → unit/contract/concurrency → BQ/PG parity → fail/retry/rollback → canary allowlisted interno → daily/weekly readback → dos cierres reales para calibración y trimestre actual más baseline comparable para STI → revisar activación. Ninguna secuencia ejecutada en esta planificación.

### Out-of-band coordination required

Ops valida métodos/calendario y revisa cierre; owner de ICO coordina TASK-733/734. HR/Finance confirma que shadow no altera compensación. Fuentes degradadas impiden declarar éxito, no se descargan al usuario sin agotar checks seguros.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Delta — contratos de acciones, disputas y policy (diseño)

Extender el modelo propuesto de leadership_risk_actions para actionId, owner, dueAt, hypothesis, verificationWindow, reviewer y outcome; preferir eventos append-only de transición vinculados al sistema de trabajo existente, no un task manager nuevo. El catálogo físico final se aprueba antes de migración.

Persistencia adicional propuesta en el mismo dominio: solicitudes/decisiones de corrección vinculadas a snapshotRevision y evidencia; policy versionada con vigencia, mínimos/metas/calendario, approvedBy/At y constancia de comunicación. Nombres de tablas/DDL pendientes de verificación de reuso, no existentes por este texto. Source evidence permanece en delivery; no duplicar conversaciones privadas.

Primitives server-side propuestos: record/update intervention, submit verification, request correction, review correction y publish measurement policy; reader común sirve historial/estado. Todos con entitlements/scope, separación autor-reviewer, idempotencia, CAS de revisión, audit y errores canónicos. Exponer por API parity, no endpoints exclusivos de click. Publicar policy no activa bono ni amplía permisos de cuentas. Evaluación requiere todos los gates de §11; policy con vigencia ya iniciada no altera metas retroactivamente.

Migración additive y permisos mínimos; down sólo para estructuras vacías si es seguro. Una vez hay evidencia append-only, rollback deshabilita commands/evaluación y conserva lectura/historial; no borra solicitudes/acciones. Conservar compatibilidad del ICO individual y demostrar que sus snapshots/consumidores no cambian.

## Delta — RpA y protocolo de liderazgo ICO (2026-09-19)

Implementar el contexto ICO RpA conforme LEADERSHIP_RPA_V1: cohorte compartida FTR, sumas/counts exactos, distribución, percentiles definidos y señales abiertas separadas. Persistir lineage/versiones/coverage, resolver límites inclusivos del helper frente al período semiabierto y probar reaperturas/duplicados/transferencias. No cambiar helper individual ni recalcular en DTO/UI.

## Acceptance Criteria

- [ ] Protocolo §11.3–11.6: commands de acciones distinguen ejecución de efectividad, reviewer independiente, evidencia por caso y estados inconclusive/ineffective; no nuevo motor de tareas ni KPI de actividad.
- [ ] Corrección/disputa con separación autor-revisor, revocación de permisos, idempotencia y audit; antes/después de lock genera el estado/revisión correcto sin autoaprobación ni sobrescritura.
- [ ] Policy/calendario/metas versionados prospectivamente y gate de readiness: sin baseline/calibración/formación/titulares aprobados no se activa evaluación; fixtures de captura, suplencia, tradeoff y controversia de §11.6 pasan.


- [ ] Implementar el contexto ICO RpA conforme LEADERSHIP_RPA_V1: cohorte compartida FTR, sumas/counts exactos, distribución, percentiles definidos y señales abiertas separadas. Persistir lineage/versiones/coverage, resolver límites inclusivos del helper frente al período semiabierto y probar reaperturas/duplicados/transferencias. No cambiar helper individual ni recalcular en DTO/UI.


- [ ] Métodos, estados y casos edge se ajustan a specs canónicos/ADR de Normative Docs; aprobación del ADR y calibración pendientes se registran sin confundir documentación con implementación.

- [ ] Quinta cuenta y nuevo líder se descubren desde responsabilidades sin código/deploy; estados de onboarding y retirada del canary documentados/probados.
- [ ] Manifest incluye cuentas sin métricas; counts/readiness por métrica y taskCoverage desconocida no se fabrican ni se confunden con cobertura de cuentas.
- [ ] 51/201 cuentas, paginación y filtros preservan el agregado completo autorizado; tests no revelan totales ni métricas de scopes prohibidos.
- [ ] Cambio de cartera durante un run no mezcla versiones; altas/bajas/backdated mantienen cierres, y STI separa cambio de composición de mejora real.

- [ ] Specs/versiones aprobadas, fórmulas canónicas reutilizadas y fixtures numéricos pasan.
- [ ] DTO diferencia lifecycle/confidence/freshness, expone numeradores/muestra/cobertura y no inventa 0/100.
- [ ] Cuenta interna y tareas sin owner en universo; suma de cuentas reconciliada y sin duplicados.
- [ ] Historial FTR completo; fuente incompleta nunca habilita evaluación plena.
- [ ] Lock/corrección/publish soportan concurrencia y replay conservando revisión previa y audit.
- [ ] App/ecosystem/session comparten primitive con scope, permisos revocados y anti-IDOR probados.
- [ ] FRM no infiere acciones; STI no compara métodos/scopes no equivalentes.
- [ ] Daily/weekly/monthly/quarterly documentados y shadow real registrado; no cierre por simulación.
- [ ] Payroll y métricas individuales intactos, rollback ensayado, readback productivo registrado.

## Verification

Plan futuro: tests de cálculo/concurrencia/contract/access, `pnpm typecheck`, `pnpm lint`, `pnpm test:live` serializado, reconciliación BQ/PG por source digest. Tests de comportamiento, no asserts del texto SQL. Registrar outputs passed, no skipped. Si manifiesto MCP cambia: `pnpm mcp:manifest:check`; gates worker si toca build compartido. QA, task lint y docs closure al cierre.

## Closing Protocol

- [ ] Lifecycle y carpeta reflejan ejecución y verificación reales; no cerrar por código solamente.
- [ ] Sincronizar README, registry y progreso/acceptance del EPIC-048.
- [ ] Actualizar Handoff.md y changelog cuando exista cambio de comportamiento; registrar evidencia, pendientes y owners.
- [ ] Ejecutar chequeo de impacto cruzado con las tasks citadas; preservar trabajo ajeno.
- [ ] Manuales, observabilidad, rollback y readback runtime disponibles antes de complete.

## Follow-ups

La política prospectiva de compensación exige solicitud independiente de HR/Finance. Este programa no recalcula bonos, no aplica consecuencias salariales y no modifica Payroll.


## Delta 2026-09-19 — Universo dinámico

El materializador recibe el manifest completo de responsabilidades, no la lista piloto ni sólo cuentas con datos. API, snapshots, comparabilidad y rollout distinguen cartera, medición disponible y acceso. Sólo planificación.

## Open Questions

Antes del primer release: mínimos de muestra/cobertura, SLA y calendario de riesgo, baseline y retention; owner Ops/Producto los aprueba tras evidencia de TASK-1879. No son pesos de bono.
