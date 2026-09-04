# TASK-1820 — Payroll Stage Preflight and Payment Readiness

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
- Backend impact: `reader`
- Epic: `EPIC-043`
- Status real: `Diseño; sin implementación ni rollout`
- Rank: `5`
- Domain: `payroll|hr|finance`
- Blocked by: `TASK-1817, TASK-1818`
- Branch: `Greenhouse develop; checkout compartido actual; sin worktrees ni cambio de branch automático`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear un reader canónico, puro y por etapa que explique si una nómina puede calcularse, aprobarse, cerrarse o preparar sus pagos. Unificar hechos y razones con los commands; conservar importes por moneda y distinguir falta de datos de una comprobación exitosa.

## Why This Task Exists

F12 demuestra que readiness puede aceptar un período sin UF resoluble aunque el cálculo dependiente Fonasa necesite topes en UF. F15 demuestra que totalBlocked no consulta la preparación real del perfil de pago. Un resultado sin bloqueos no prueba que la siguiente etapa sea ejecutable.

### Supersesión autorizada

Reemplaza [TASK-731](../complete/TASK-731-payroll-pre-close-validator.md), cerrada por supersesión documental a solicitud del operador el 2026-09-03, no por implementación. Se retira la prohibición absoluta de modificar getPayrollPeriodReadiness: corregir F12 exige que reader y command compartan el requisito real. También se retiran el chip UI y cron T-2 opcional mezclados con backend; la UI pertenece a TASK-1826 y no se crea un cron en esta tarea. La dependencia histórica TASK-729 no reemplaza las dependencias de integridad actuales.

## Goal

- Resolver la unidad U05 de EPIC-043 con una primitive canónica reusable y resultados comprobables.
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

- TASK-1817, TASK-1818: respetar las fronteras y contratos de las unidades anteriores; se permite Discovery en paralelo, no habilitar writes sobre garantías pendientes.
- TASK-1821 coordina schemas públicos; TASK-1822 y TASK-1823 integran por DTO acordado sin dependencia circular de diseño.

### Blocks / Impacts

- TASK-1822, TASK-1824, TASK-1825, TASK-1826, TASK-1827.
- TASK-940 conserva coordinación del enforcement; TASK-759f señales, TASK-898 participación documental y TASK-868 aggregate legal. No absorberlos ni cerrarlos automáticamente.

### Files owned

- `src/lib/payroll/payroll-readiness.ts`.
- `src/lib/payroll/compensation-requirements.ts`.
- `src/lib/finance/payment-orders/payroll-status-reader.ts`.
- `src/lib/finance/payment-routing/resolve-route.ts`.
- `src/app/api/hr/payroll/periods/[periodId]/readiness/route.ts`.

Ownership acotado a esta capacidad. En archivos compartidos, acordar slice con sus otras tareas y editar secuencialmente. Nuevos módulos/tests/migraciones se nombran en el plan tras Discovery, no se declaran existentes aquí.

## Current Repo State

### Already exists

- `src/lib/payroll/payroll-readiness.ts`.
- `src/lib/payroll/compensation-requirements.ts`.
- `src/lib/finance/payment-orders/payroll-status-reader.ts`.
- `src/lib/finance/payment-routing/resolve-route.ts`.
- `src/app/api/hr/payroll/periods/[periodId]/readiness/route.ts`.

### Gap

F12 demuestra que readiness puede aceptar un período sin UF resoluble aunque el cálculo dependiente Fonasa necesite topes en UF. F15 demuestra que totalBlocked no consulta la preparación real del perfil de pago. Un resultado sin bloqueos no prueba que la siguiente etapa sea ejecutable. El baseline registra snapshots, no garantiza que esas observaciones sigan vigentes: al tomar la task repetir su reproducción y comparar código/runtime antes de modificar.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/payroll/payroll-readiness.ts` y adapters actuales de portal/API/ops-worker.
- Future candidate home: `domain-package`
- Boundary: primitive Payroll server-side por etapa/recurso; API, UI, Nexa, MCP y worker sólo consumen contrato.
- Server/browser split: DTOs sin DB/secrets; stores, proveedor y autorización permanecen server-only.
- Build impact: reutilizar dependencias; si worker consume módulos adicionales, declarar inputs/runtime deps y ejecutar gates del worker.
- Extraction blocker: atomicidad de Payroll/Finance, identidad de actor y transacciones compartidas; no extraer servicio ni packages en esta task.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `reader`
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

- Migration posture: ninguna; esta unidad es read-only y no persiste snapshots de readiness. Schema de operaciones/delivery pertenece a TASK-1822/1823.
- Default state: reader validado localmente antes de exponerse; la única salida es información, sin writers nuevos.
- Backfill plan: ningún backfill real autorizado por esta task; inventario read-only, dry-run y allowlist aprobada para cualquier reparación posterior.
- Rollback path: retirar adapter/reader nuevo, conservar evidencia y devolver indisponibilidad explícita donde el check no se pueda resolver.
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

### Slice 1 — Contrato de checks y regresiones F12/F15

- Revalidar baseline y owners; fijar ADR/precondiciones y trasladar los repros necesarios a fixtures del repo.
- Entregar DTO/input/output/error y tabla de transiciones/invariantes pertinentes.

### Slice 2 — Reader por etapa y resolución de fuentes

- Implementar el DTO puro componiendo readiness, resolución histórica de indicadores y routing de perfiles.
- Compartir requisitos con el cálculo sin introducir writes; timeout/unavailable mantiene la persona y su causa. No se agrega schema ni persistencia de resultados.

### Slice 3 — Adapters de lectura y equivalencia

- Conectar readiness Product API y contrato de lectura TASK-1821; probar mismos hechos/razones para un período/version.
- Probar cero escrituras observando filas, outbox y storage antes/después; UI/Nexa/MCP se integran en sus dueñas.

### Slice 4 — Rollout y cierre

- Ejecutar matriz adversarial, smoke autorizado y verificación operativa; actualizar documentación funcional, manual y arquitectura con estado real.

## Out of Scope

- Transferir dinero, marcar pagos, enviar correo real o reparar datos por el mero registro del plan.
- Reescribir Payroll, crear otro pool/SDK/servicio o trasladar reglas al gateway.
- Diseñar UI (TASK-1826), tools MCP (TASK-1824) o acciones Nexa (TASK-1825).
- Certificar ausencia absoluta de bugs, reinterpretar F6 como sobrepago demostrado o implementar reglas legales nuevas.

## Detailed Spec

### Contrato por etapa

El DTO propuesto incluye periodId, etapa solicitada, versión/snapshot observado, checkedAt, estado global, razones estructuradas por persona y evidencia/freshness por fuente. Estados de evaluación deben distinguir ready, blocked, warning y unavailable; nombres finales se acuerdan con API Platform en TASK-1821. unavailable nunca se convierte en ready ni una lista vacía después de un catch se interpreta como todos correctos.

Cada check declara a qué etapa y régimen aplica. Calcular no exige perfil bancario; preparar pago sí evalúa la ruta canónica. Aprobar/cerrar comprueba la versión concreta y las precondiciones del ciclo. El reader no aprueba, calcula, refresca proyecciones, crea perfiles, genera PDF, ni envía avisos. Los commands vuelven a validar bajo su frontera transaccional; checkedAt no es un permiso para mutar después.

### F12 — indicadores efectivamente necesarios

Compartir la decisión sobre UF/UTM/tablas y su resolución con el cálculo, según régimen y fórmula efectiva. Probar Fonasa con topes positivos, Isapre y regímenes sin deducciones chilenas. Un override ausente puede ser válido si el resolver histórico entrega una fuente autorizada; no exigir carga manual indiscriminada. Fuente fallida, valor no finito, cero inválido o indicador incompatible con el período deben identificarse. No cambiar fórmulas legales ni inventar valores.

### F15 — preparación de pago

Componer resolve-route y el reader de órdenes por obligación, moneda, beneficiario y versión. Diferenciar profile_missing, perfil pendiente, ruta disponible, orden existente y pago conciliado. No convertir profile_missing en afirmación de imposibilidad absoluta de toda orden manual: el DTO explica el bloqueo de la vía solicitada y las alternativas permitidas. No desclasificar una orden scheduled/paid por un cambio posterior del perfil. No sumar USD y CLP en una etiqueta CLP; FX sólo desde evidencia canónica explícita.

### Coherencia y costo

Resolver fuentes por lote sin N+1. Un timeout produce resultado incompleto observable con check identificado; no puede eliminar silenciosamente una persona. Planificar presupuesto de latencia medido con roster representativo y límite de concurrencia, sin fijar un SLO inventado. Totales deben reconciliar con los elementos visibles autorizados. No cachear readiness más allá de la versión/freshness contratada.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 → 2 → 3 → 4. Contrato de razones/etapas antes del adapter; pruebas de equivalencia y ausencia de efectos antes del consumer. No existen writer, migración ni backfill de esta unidad. Coordinar requisito UF con el command canónico sin crear un gate alternativo.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un reader optimista habilita una acción inviable | Payroll | high | Fixture adversarial, precondición por versión y rollout acotado | Conflicto/unknown o resultado incompleto correlacionado |
| Nuevo adapter permite recurso ajeno | API/identidad | medium | Matriz auth/resource negativa y canary de permisos | Denegaciones o mismatch de scope |
| Portal y worker usan versiones diferentes | Operación | medium | SHA/config/migración readback en ambos | Versión de contrato no compatible |

### Feature flags / cutover

No se inventa una flag como si estuviera desplegada. Discovery debe inventariar flags reales y decidir gate de entrada o registro disabled para nueva capacidad. Si introduce flag, registrarla y probar ambos valores antes de habilitarla. Correcciones de integridad no deben tener un bypass que reactive silenciosamente el defecto.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | Revertir contrato/repros antes de habilitación, sin tocar datos | Una revisión documental | Sí |
| 2 | Retirar reader nuevo y restaurar versión compatible; mantener bloqueado el check cuya fuente no pueda verificarse, sin volver a informar ready falso | Medir en ensayo staging | Sí, no muta datos |
| 3 | Retirar adapter nuevo y mantener readiness canónico con error explícito en checks indisponibles | Medir con deploy real | Sí |
| 4 | Detener promoción y conservar evidencia del reader; informar indisponibilidad del check | Según diagnóstico documentado | Sí |

### Production verification sequence

1. Fixtures locales y pruebas negativas; si usa DB live, `pnpm test:live` serializado y sin source .env.local.
2. Staging: verificar permisos/config y ejecutar GET sobre fixture Fonasa/perfiles; cotejar con cálculo fixture sin nómina real.
3. Ensayar rollback del adapter; verificar que reader/GET no generaron cambios en tablas, outbox ni artifacts.
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

- [ ] F12: fixture Fonasa con tope positivo y UF irresoluble bloquea cálculo/preflight; control con UF histórica válida coincide con el command y honorarios no hereda el bloqueo.
- [ ] F15: perfiles missing, pending y active producen motivos distintos; totalBlocked reconcilia con entries de la etapa y no exige perfil para calcular.
- [ ] Fallo/timeout de fuente devuelve unavailable, con control exitoso; repetir GET no cambia filas, eventos, objetos ni deliveries.
- [ ] Dos monedas conservan subtotales separados; órdenes paid/reconciled mantienen su estado y selección de período no usa el último cronológico por defecto.
- [ ] TASK-940 queda delimitada como owner relacionado del enforcement: ninguna segunda política divergente ni dependencia de mayo sin revalidar.
- [ ] ADR y contrato con source of truth, acceso, idempotencia, errores, auditoría y postura de migración/rollback aprobados y coherentes con implementación.
- [ ] Runtime/readback documentado con fecha, SHA, entorno y efectos; no declarar cierre si sólo existe código o artefacto de configuración.

## Verification

- `pnpm task:lint --task TASK-1820`: template=1, legacy=0, errors=0, warnings=0.
- Ejecutar suites focales existentes `src/lib/payroll/payroll-readiness.test.ts` y `src/lib/finance/payment-orders/payroll-status-reader.test.ts` y nuevas regresiones de esta capacidad con runner Vitest vigente; registrar passed y no confundir skipped con verde.
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
