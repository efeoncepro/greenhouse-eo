# TASK-1821 — Payroll Canonical Commands and Governed API

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
- Backend impact: `api`
- Epic: `EPIC-043`
- Status real: `Diseño; sin implementación ni rollout`
- Rank: `6`
- Domain: `payroll|hr|finance`
- Blocked by: `TASK-1816, TASK-1817, TASK-1818, TASK-1819`
- Branch: `Greenhouse develop; checkout compartido actual; sin worktrees ni cambio de branch automático`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Consolidar operaciones Payroll en commands/readers server-side gobernados y adapters Product/API Platform equivalentes. Exigir autorización por recurso, versión esperada, intención idempotente y resultados verificables; exponer el contrato que consumirán workers, Nexa y MCP.

## Why This Task Exists

Las rutas existentes no equivalen a commands completos. Approve mantiene validaciones y transición inline; invocar postgres-store directamente perdería guardas. La auditoría encontró Product API amplia pero sin lane Payroll app/ecosystem, y atomicidad/idempotencia no se deducen de tener un wrapper API.

### Supersesión autorizada

Reemplaza [TASK-1214](../complete/TASK-1214-payroll-full-api-parity-capability-governance.md), cerrada por supersesión documental a solicitud del operador el 2026-09-03, no por implementación. Se retiran el conteo histórico de 24 rutas y dos capabilities como inventario vigente, la premisa de core ya delgado, y la idea de que agregar can() y canonicalErrorResponse completa parity. El inventario actual se reconstruye por capacidad y consumer; se incorporan concurrencia, readback, documentos y acceso delegado sin duplicar los owners de esos motores.

## Goal

- Resolver la unidad U06 de EPIC-043 con una primitive canónica reusable y resultados comprobables.
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

- TASK-1816, TASK-1817, TASK-1818, TASK-1819: respetar las fronteras y contratos de las unidades anteriores; se permite Discovery en paralelo, no habilitar writes sobre garantías pendientes.
- TASK-1821 coordina schemas públicos; TASK-1822 y TASK-1823 integran por DTO acordado sin dependencia circular de diseño.

### Blocks / Impacts

- TASK-1822, TASK-1823, TASK-1824, TASK-1825, TASK-1826, TASK-1827.
- TASK-940 conserva coordinación del enforcement; TASK-759f señales, TASK-898 participación documental y TASK-868 aggregate legal. No absorberlos ni cerrarlos automáticamente.

### Files owned

- `src/lib/payroll/`.
- `src/lib/api-platform/core/commands.ts`.
- `src/lib/api-platform/core/idempotency.ts`.
- `src/lib/api-platform/core/app-auth.ts`.
- `src/lib/api-platform/core/errors.ts`.
- `src/app/api/hr/payroll/periods/[periodId]/approve/route.ts`.
- `src/app/api/hr/payroll/entries/[entryId]/route.ts`.

Ownership acotado a esta capacidad. En archivos compartidos, acordar slice con sus otras tareas y editar secuencialmente. Nuevos módulos/tests/migraciones se nombran en el plan tras Discovery, no se declaran existentes aquí.

## Current Repo State

### Already exists

- `src/lib/payroll/`.
- `src/lib/api-platform/core/commands.ts`.
- `src/lib/api-platform/core/idempotency.ts`.
- `src/lib/api-platform/core/app-auth.ts`.
- `src/lib/api-platform/core/errors.ts`.
- `src/app/api/hr/payroll/periods/[periodId]/approve/route.ts`.
- `src/app/api/hr/payroll/entries/[entryId]/route.ts`.

### Gap

Las rutas existentes no equivalen a commands completos. Approve mantiene validaciones y transición inline; invocar postgres-store directamente perdería guardas. La auditoría encontró Product API amplia pero sin lane Payroll app/ecosystem, y atomicidad/idempotencia no se deducen de tener un wrapper API. El baseline registra snapshots, no garantiza que esas observaciones sigan vigentes: al tomar la task repetir su reproducción y comparar código/runtime antes de modificar.

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
- Impacto principal: `api`
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

### Inventario de capacidad, no de botones

Crear matriz ejecutable: lectura de períodos/personas/compensaciones, preflight, cálculo, aprobación, cierre/exportación, ajustes/aprobar/revertir, reapertura y vista previa, promoción de proyección, artifacts y entregas. Para cada fila declarar command/reader real, schema, audiencia, recurso, permiso, intención, precondiciones, efecto, resultado, auditoría, Product API, app/ecosystem y exclusión justificada. Docs/env/flag no acreditan exposición runtime.

### Extracción sin pérdida de reglas

Mover orquestación inline de approve/entries/adjustments a primitives conservando límites KPI, participación, coherencia cross-record, estado del período y actor. Adapters validan transporte y derivan contexto autorizado; no reciben actor ni tenant confiables del body. Store es implementación interna, no una herramienta ejecutable. TASK-1816/1817 conservan cálculo/ajustes; coordinar integración secuencial de archivos compartidos. TASK-1819 conserva obligaciones y deltas, TASK-1823 genera/envía documentos.

### Versión, intención y resultado

Cada mutación define expectedVersion (o equivalencia contractual), clave idempotente scoped a actor/tenant/capacidad/recurso y digest del payload. Misma intención+payload devuelve resultado anterior; misma clave con payload distinto es conflicto; versión cambiada requiere nueva revisión. Definir duración/retención del registro y comportamiento concurrente/in-progress; no prometer exactly-once externo por usar core/idempotency. El core actual declara TTL de 24 horas y permite reintentar tras failed: probar expiración, cleanup y fallo después del efecto. La deduplicación financiera/documental debe sobrevivir a esa ventana mediante su identidad de dominio; no tratar una intención vieja como efecto nuevo sin reconciliar. Publicación y registro de efecto siguen los límites transaccionales de TASK-1816/1819.

Respuestas devuelven identifiers y versión committed, estado, warnings y referencias para readback. Un 202 sólo acepta trabajo; un 200 no prueba PDF, entrega o pago. Errores canónicos distinguen validation, unauthorized/forbidden, not found anti-oracle, conflict/stale, unavailable, retryable y outcome_unknown sin raw SQL/PII.

### Gobernanza de acceso

Derivar actor humano/delegado y ámbito desde mecanismos existentes. Verificar revocación/expiración al ejecutar, resource ownership de periodId/memberId/entryId/adjustmentId, y gates adicionales para lectura salarial. Comparar acceso antes/después con roles operativos HR/Finance/admin/self-service para no retirar acceso válido involuntariamente. Separar leer nómina propia de administrar el lote. No ampliar grants del cliente público compartido; TASK-1631/658 y decisión de identidad gobiernan la lane delegada de TASK-1824.

La confirmación sensible referencia acciones exactas, período, versión, moneda y conjunto de destinatarios cuando aplique; cambiar cualquiera invalida esa confirmación. El contrato permite cálculo sin interpretar una petición como autorización implícita para pagar/enviar. El LLM no determina reglas de cálculo ni autoriza recursos.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 → 2 → 3 → 4. Schema compatible debe existir antes del writer; readback/error contract antes de habilitar consumer. Dependencias del Status bloquean la habilitación funcional, no la preparación de fixtures. Cambios compartidos se integran secuencialmente.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| La extracción omite una guarda o rompe acceso operativo | Payroll | high | Fixture adversarial, precondición por versión y rollout acotado | Conflicto/unknown o resultado incompleto correlacionado |
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

- [ ] Inventario capability×consumer cubre todas las rutas Payroll auditadas y admin/Finance relacionadas, con exclusiones razonadas y dueño; ninguna capacidad queda declarada parity por contar endpoints.
- [ ] Product API y API Platform ejecutan la misma primitive y producen estado/errores equivalentes en fixtures con actores permitidos y denegados.
- [ ] Repetición concurrente de intención no duplica efecto; payload distinto con misma clave y expectedVersion obsoleta producen conflicto verificable.
- [ ] Matriz HR/Finance/admin/self-service/delegado prueba recursos cruzados, grant revocado/expirado y preservación de acceso operativo; ningún body puede suplantar actor.
- [ ] Approval/adjustment command conserva guardas KPI, participación, cross-record y F13; no publica store como sustituto.
- [ ] OpenAPI/contratos/docs y readback de la lane desplegada prueban versión/estado; crear schema no certifica gateway disponible.
- [ ] ADR y contrato con source of truth, acceso, idempotencia, errores, auditoría y postura de migración/rollback aprobados y coherentes con implementación.
- [ ] Runtime/readback documentado con fecha, SHA, entorno y efectos; no declarar cierre si sólo existe código o artefacto de configuración.

## Verification

- `pnpm task:lint --task TASK-1821`: template=1, legacy=0, errors=0, warnings=0.
- Ejecutar suites focales existentes `src/lib/api-platform/core/commands.test.ts` y `src/lib/payroll/period-lifecycle.test.ts` y nuevas regresiones de esta capacidad con runner Vitest vigente; registrar passed y no confundir skipped con verde.
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
