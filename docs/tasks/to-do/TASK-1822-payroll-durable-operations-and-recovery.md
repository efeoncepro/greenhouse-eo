# TASK-1822 — Payroll Durable Operations and Recovery

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `EPIC-043`
- Status real: `Diseño; sin implementación ni rollout`
- Rank: `7`
- Domain: `payroll|hr|finance`
- Blocked by: `TASK-1819, TASK-1820, TASK-1821`
- Branch: `Greenhouse develop; checkout compartido actual; sin worktrees ni cambio de branch automático`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construir una operación Payroll persistente y recuperable que componga commands canónicos, publique estado por etapa/persona/artifact y sobreviva a desconexión, timeout y reinicio del worker. El estado financiero sigue perteneciendo a Payroll/Finance; la operación registra ejecución y evidencia.

## Why This Task Exists

Un chat o request puede expirar mientras el cálculo/exportación/documentación ya tuvo efectos. Hoy no se ha acreditado una operación Payroll durable que permita consultar resultado por etapa y reanudar únicamente lo pendiente. Reejecutar toda la secuencia desde memoria del agente amplifica fallos parciales.

## Goal

- Resolver la unidad U07 de EPIC-043 con una primitive canónica reusable y resultados comprobables.
- Preservar identidad, régimen, moneda, versión e historia al integrar consumers.
- Cerrar con regresiones, evidencia operativa y límites explícitos; el registro de esta task no autoriza operaciones reales.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`.
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`.
- `docs/architecture/agent-invariants/PAYROLL_WORKFORCE_AGENT_INVARIANTS.md`.
- `docs/architecture/agent-invariants/PAYROLL_LEGAL_DOCS_AGENT_INVARIANTS.md`.

Reglas obligatorias: commands/readers canónicos antes de adapters; usar DB/auth/outbox existentes; ninguna lógica de nómina en LLM ni gateway. Identificar/proponer ADR acotado antes de cambiar schema, autorización, contratos o semántica financiera. No aceptar el ADR por crear esta task.

## Normative Docs

- `docs/epics/to-do/EPIC-043-payroll-reliability-and-agentic-api-parity.md`.
- `docs/audits/payroll/PAYROLL_RELIABILITY_API_PARITY_PROGRAM_BASELINE_2026-09-03.md`.
- `docs/tasks/TASK_PROCESS.md` y `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`.
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`.
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`.
- Skills `greenhouse-payroll-auditor`, `software-architect-2026`, `greenhouse-qa-release-auditor`; añadir skill de email/secret hygiene al operar proveedor/runtime.

## Dependencies & Impact

### Depends on

- TASK-1819, TASK-1820, TASK-1821: respetar las fronteras y contratos de las unidades anteriores; se permite Discovery en paralelo, no habilitar writes sobre garantías pendientes.
- TASK-1821 coordina schemas públicos; TASK-1822 y TASK-1823 integran por DTO acordado sin dependencia circular de diseño.

### Blocks / Impacts

- TASK-1824, TASK-1825, TASK-1826, TASK-1827.
- TASK-940 conserva coordinación del enforcement; TASK-759f señales, TASK-898 participación documental y TASK-868 aggregate legal. No absorberlos ni cerrarlos automáticamente.

### Files owned

- `src/lib/payroll/`.
- `src/lib/api-platform/core/commands.ts`.
- `src/lib/api-platform/core/idempotency.ts`.
- `src/lib/sync/projections/payroll-receipts.ts`.
- `services/ops-worker/server.ts`.
- `services/ops-worker/cron-handler-wrapper.ts`.

Ownership acotado a esta capacidad. En archivos compartidos, acordar slice con sus otras tareas y editar secuencialmente. Nuevos módulos/tests/migraciones se nombran en el plan tras Discovery, no se declaran existentes aquí.

## Current Repo State

### Already exists

- `src/lib/payroll/`.
- `src/lib/api-platform/core/commands.ts`.
- `src/lib/api-platform/core/idempotency.ts`.
- `src/lib/sync/projections/payroll-receipts.ts`.
- `services/ops-worker/server.ts`.
- `services/ops-worker/cron-handler-wrapper.ts`.

### Gap

Un chat o request puede expirar mientras el cálculo/exportación/documentación ya tuvo efectos. Hoy no se ha acreditado una operación Payroll durable que permita consultar resultado por etapa y reanudar únicamente lo pendiente. Reejecutar toda la secuencia desde memoria del agente amplifica fallos parciales. El baseline registra snapshots, no garantiza que esas observaciones sigan vigentes: al tomar la task repetir su reproducción y comparar código/runtime antes de modificar.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/payroll/` y adapters actuales de portal/API/ops-worker.
- Future candidate home: `domain-package`
- Boundary: primitive Payroll server-side por etapa/recurso; API, UI, Nexa, MCP y worker sólo consumen contrato.
- Server/browser split: DTOs sin DB/secrets; stores, proveedor y autorización permanecen server-only.
- Build impact: reutilizar dependencias; si worker consume módulos adicionales, declarar inputs/runtime deps y ejecutar gates del worker.
- Extraction blocker: atomicidad de Payroll/Finance, identidad de actor y transacciones compartidas; no extraer servicio ni packages en esta task.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `command`
- Source of truth afectado: primitives/stores Payroll y Finance referenciados en Files owned; operación/delivery no sustituye entradas financieras.
- Consumidores afectados: portal/API, ops-worker y futuros adapters Nexa/MCP.
- Runtime target: local, staging, production y worker cuando consume la capacidad.

### Contract surface

- Contrato existente a respetar: `src/types/payroll.ts`, `src/lib/payroll/` y API Platform.
- Contrato nuevo o modificado: contrato por etapa descrito en Detailed Spec; nombres finales/versionado quedan fijados en ADR/plan antes de implementación.
- Backward compatibility: migración compatible o gated con adapters previos verificados; no retirar acceso/semántica silenciosamente.
- Full API parity: reader/command único con autorización en todos los entrypoints; no endpoint que reproduzca un click ni store expuesto.

### Data model and invariants

- Entidades/tablas/views afectadas: períodos/entries y sus versiones, obligaciones/perfiles o artifacts/deliveries según alcance; confirmar nombres SQL en schema/store antes de migrar.
- Invariantes: período/persona/moneda/versión siempre explícitos; aprobación y efectos pertenecen a una versión; no confundir exported, paid, reconciled o delivered.
- Write-target allowlist: inventariar destinos existentes en el plan; prohibido escribir Finance/identidad desde un reader o agregar destinos sin boundary documentado.
- Tenant/space boundary: derivado de sesión/grant y recurso real; period/entry/member relacionados comprobados, nunca scope confiado del body.
- Idempotency/concurrency: reader puro; cada write declara intención, digest, versión esperada y control concurrente; unknown externo exige reconciliación.
- Audit/outbox/history: conservar actor, operación, versión, causa y referencias append-only cuando aplica; logs sin datos salariales ni correo completo.

### Migration, backfill and rollout

- Migration posture: reader sin schema nuevo por defecto; si operaciones/delivery exige persistencia nueva, sólo aditiva tras ADR y prueba de compatibilidad.
- Default state: primero validación local/lecturas; writes nuevos sin habilitar hasta cerrar precondiciones.
- Backfill plan: ningún backfill real autorizado por esta task; inventario read-only, dry-run y allowlist aprobada para cualquier reparación posterior.
- Rollback path: retirar entrada nueva/consumer y conservar evidencia; no borrar intentos, artifacts, aprobaciones u obligaciones ya comprometidas.
- External coordination: HR/Finance para criterios y recipients de prueba; identidad/email/worker conservan sus owners.

### Security and access

- Auth/access gate: sesión o identidad delegada canónica + capability + resource authorization revalidada al ejecutar/reanudar.
- Sensitive data posture: salarios/PII privados, minimización en DTO/logs, enlaces autorizados y sin tokens expuestos.
- Error contract: códigos canónicos, estado retryable/unknown honesto y captura por dominio; nunca raw SQL/provider errors hacia agente.
- Abuse/rate-limit posture: límites por actor/recurso en writes y batch, dedupe estable y backoff; reads sin fan-out ilimitado.

### Runtime evidence

- Local checks: pruebas de comportamiento y controles negativos del Acceptance Criteria; trasladar repro de auditoría al repo.
- DB/runtime checks: DB local con fixtures aisladas, luego readback de migración/grants/config/runtime real pertinente.
- Integration checks: requests equivalentes portal/API y prueba controlada de worker/proveedor sólo con autorización y destinatarios fixture.
- Reliability signals/logs: reutilizar captura/correlación; identificar señal existente o propuesta con owner antes de crear otra.
- Production verification sequence: sección de rollout; no cerrar con build verde, docs, skipped tests o respuesta 2xx.

### Acceptance criteria additions

- [ ] Source of truth y destinos reales verificados; consumers y límites de acceso documentados.
- [ ] Contrato, concurrencia, errores, auditoría y rollout probados con efectos observados, no guardas de texto.
- [ ] Migración/backfill/rollback definidos y verificados o ausencia justificada por el diff real.

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

### Slice 1 — Contrato y regresiones ejecutables

- Revalidar baseline y owners; fijar ADR/precondiciones y trasladar los repros necesarios a fixtures del repo.
- Entregar DTO/input/output/error y tabla de transiciones/invariantes pertinentes.

### Slice 2 — Primitive y persistencia

- Implementar Detailed Spec dentro de los homes canónicos, con fallos parciales y controles concurrentes.
- Si hay schema, migración compatible y rollback probado antes de writers.

### Slice 3 — Adapters y recuperación

- Conectar Product/API/worker que correspondan sin duplicar reglas y preservar consumers actuales.
- Instrumentar resultado por recurso/etapa y readback; Nexa/MCP/UI se integran en sus tareas dueñas.

### Slice 4 — Rollout y cierre

- Ejecutar matriz adversarial, smoke autorizado y verificación operativa; actualizar documentación funcional, manual y arquitectura con estado real.

## Out of Scope

- Transferir dinero, marcar pagos, enviar correo real o reparar datos por el mero registro del plan.
- Reescribir Payroll, crear otro pool/SDK/servicio o trasladar reglas al gateway.
- Diseñar UI (TASK-1826), tools MCP (TASK-1824) o acciones Nexa (TASK-1825).
- Certificar ausencia absoluta de bugs, reinterpretar F6 como sobrepago demostrado o implementar reglas legales nuevas.

## Detailed Spec

### ADR y esquema propuestos

Antes de migrar, comparar reutilizar infraestructura de command/outbox/projection existente frente a un aggregate mínimo de operación; documentar atomicidad, lease y audit en ADR. No se afirma que exista una tabla payroll_operations ni se impone crearla sin Discovery. Si se necesita schema: migración aditiva, claves únicas de intención/etapa/versión, historial de intentos y política de retención; no duplicar nómina dentro del job.

### Estado y plan persistente

Contrato conceptual: operationId, actor/grant reference seguro, período, versión esperada, intención y digest del plan autorizado, etapas solicitadas, estado, progreso, referencias de resultados y errores sanitizados. Etapas distinguen pending/running/succeeded/failed/blocked/unknown/cancelled cuando corresponda; vocabulario final se alinea con primitives existentes. Progreso no usa porcentaje que asuma éxito de todos los destinatarios.

El plan es explícito: calcular no ejecuta aprobar/pagar/enviar por inferencia. Barreras de aprobación pausan hasta confirmación válida. La autorización se revalida antes de cada efecto sensible y después de reanudar; cambio de versión/destinatarios invalida consentimiento. Revocación bloquea lo pendiente sin borrar efectos anteriores.

### Concurrencia, checkpoints y recuperación

Lease por etapa con fencing o control equivalente, compare-and-set y contención por versión/período. El worker usa commands TASK-1821 y claves de intención estables; el checkpoint no sustituye idempotencia del efecto. Probar caída antes del efecto, después de commit antes de checkpoint, después de aceptación externa y antes de ack. Recuperación reconcilia el readback del dominio/proveedor; unknown no se convierte en failed y reenviado a ciegas.

Retry selectivo de persona/etapa/artifact, preservando éxitos previos y límite/backoff. Cancelar sólo evita trabajo futuro: no desexporta, no borra obligaciones ni revierte un correo. Una operación terminal parcial mantiene causas, responsabilidades y siguiente acción. Operación exitosa significa todas las etapas solicitadas alcanzaron su criterio, sin afirmar etapas no pedidas.

### Runtime

No ejecutar lote largo inline en Vercel ni mantenerlo vivo con promesas sin await. Determinar adapter apropiado en ops-worker según workload placement; no crear otro servicio arbitrario. Reader de status y comando de resume/cancel deben tener resource authorization equivalente al trigger. TASK-1823 integra PDF/delivery con este protocolo, pero no bloquea el diseño inicial en un ciclo de dependencias: congelar DTO de checkpoint primero y completar integración después.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 → 2 → 3 → 4. Schema compatible debe existir antes del writer; readback/error contract antes de habilitar consumer. Dependencias del Status bloquean la habilitación funcional, no la preparación de fixtures. Cambios compartidos se integran secuencialmente.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un retry tras crash duplica un efecto confirmado | Payroll | high | Fixture adversarial, precondición por versión y rollout acotado | Conflicto/unknown o resultado incompleto correlacionado |
| Nuevo adapter permite recurso ajeno | API/identidad | medium | Matriz auth/resource negativa y canary de permisos | Denegaciones o mismatch de scope |
| Portal y worker usan versiones diferentes | Operación | medium | SHA/config/migración readback en ambos | Versión de contrato no compatible |

### Feature flags / cutover

No se inventa una flag como si estuviera desplegada. Discovery debe inventariar flags reales y decidir gate de entrada o registro disabled para nueva capacidad. Si introduce flag, registrarla y probar ambos valores antes de habilitarla. Correcciones de integridad no deben tener un bypass que reactive silenciosamente el defecto.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | Revertir contrato/repros antes de habilitación, sin tocar datos | Una revisión documental | Sí |
| 2 | Deshabilitar writer nuevo y conservar schema aditivo/historia; reconciliar efectos existentes | Medir en ensayo staging | Parcial si hubo efectos |
| 3 | Deshabilitar adapter nuevo y volver a consumer compatible validado | Medir con deploy real | Sí para entrada; no deshace efectos |
| 4 | Detener rollout, preservar evidence/unknown y ejecutar recovery autorizada | Según diagnóstico documentado | Parcial |

### Production verification sequence

1. Fixtures locales y pruebas negativas; si usa DB live, `pnpm test:live` serializado y sin source .env.local.
2. Staging: verificar schema, capabilities, config e imagen; ejecutar escenario controlado por versión.
3. Ensayar rollback/corte de entrada y readback de efectos conservados antes del apply productivo.
4. Producción: lecturas de salud/precondiciones y canary autorizado; nunca inferir deploy desde Handoff.
5. Registrar estado por etapa y reconciliar resultados; si falta entrega/provider/grant, declarar code complete, rollout pendiente.

### Out-of-band coordination required

Confirmar owners HR/Finance/identidad/worker y alcance del smoke; envíos requieren destinatarios de prueba y autorización explícita. Esta tarea no concede grants ni autoriza transferencias. OAuth Codex/Claude es TASK-1813 y la delegación compartida es TASK-1631.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] ADR identifica qué infraestructura se reutiliza, schema nuevo si necesario y frontera transaccional sin motor de nómina paralelo.
- [ ] Dos workers reclamando la misma etapa producen un solo efecto; takeover tras lease expirado no acepta escritura del worker antiguo.
- [ ] Desconectar chat/request y reiniciar worker conserva operationId, resultados y progreso; status permite retomar sin historial del chat.
- [ ] Crash después de commit antes de checkpoint se resuelve mediante readback, sin duplicar obligaciones; aceptación externa incierta queda unknown hasta reconciliar.
- [ ] Retry de fallo parcial ejecuta sólo pendientes; cancelación/revocación no revierte éxitos ni continúa efectos sensibles.
- [ ] Cambio de período/versión/destinatarios invalida autorización previa; etapas no solicitadas no se ejecutan.
- [ ] Manifest de worker, dependencias y esquema desplegados tienen readback, con operación fixture autorizada y recuperación observada.
- [ ] ADR y contrato con source of truth, acceso, idempotencia, errores, auditoría y postura de migración/rollback aprobados y coherentes con implementación.
- [ ] Runtime/readback documentado con fecha, SHA, entorno y efectos; no declarar cierre si sólo existe código o artefacto de configuración.

## Verification

- `pnpm task:lint --task TASK-1822`: template=1, legacy=0, errors=0, warnings=0.
- Ejecutar suites focales existentes `src/lib/api-platform/core/commands.test.ts` y `services/ops-worker/cron-handler-wrapper.test.ts` y nuevas regresiones de esta capacidad con runner Vitest vigente; registrar passed y no confundir skipped con verde.
- `pnpm qa:gates --changed`; gates de worker si cambia build/imports.
- Readback de DB/operación/artefacto/proveedor según scope; prueba con IO simulado se identifica como tal.
- `pnpm docs:closure-check` y, como último gate tras cambios de contexto, `pnpm docs:context-check:strict`.

## Closing Protocol

- [ ] Lifecycle/carpeta corresponden al estado real; Status real y AC reflejan evidencia, no sólo prosa de Delta.
- [ ] Registry, README y EPIC-043 muestran dependencias y avance sin cerrar tareas relacionadas automáticamente.
- [ ] Handoff/changelog y documentación funcional, manual y arquitectura actualizados según impacto.
- [ ] Chequeo cruzado sobre owners relacionados completado; archivos compartidos conciliados sin sobrescribir WIP.
- [ ] Rollout, recuperación y límites restantes documentados; código completo no equivale a operación comprobada.

## Follow-ups

- Las integraciones consumidoras se ejecutan en las tareas Blocks / Impacts; no crear duplicados.
- Si emerge reparación histórica, conservar dry-run y pedir autorización específica antes de mutar.

## Open Questions

- ADR debe fijar nombres finales, transacción/versionado y esquema mínimo tras Discovery; no son capacidades disponibles hoy.
- Confirmar runtime/config actuales y permisos efectivos al iniciar; snapshots del 2026-09-03 no son verificación permanente.
