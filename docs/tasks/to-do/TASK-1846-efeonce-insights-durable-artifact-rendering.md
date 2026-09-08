# TASK-1846 — Efeonce Insights: render durable y Artifact Worker multiconsumidor

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
- Backend impact: `integration`
- Epic: `EPIC-045`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform|ops|data`
- Blocked by: `TASK-1845`
- Branch: `Greenhouse develop; sin branch dedicada ni worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Extiende el circuito Artifact Worker para procesar Insights con jobs, assets y finalización propios, preservando Proposal. Produce outputs por target de forma durable, idempotente y recuperable; Chromium permanece fuera del proceso web.

## Why This Task Exists

El Composer es reusable, pero el worker y los render jobs importan Proposal y registran proposal_assets. Fingir que un informe es una propuesta contaminaría dominio, policy e historial.

## Goal

- Entregar el alcance de esta unidad con evidencia funcional y aislamiento por cliente.
- Conservar fuentes canónicas y paridad UI/API/MCP donde hay capacidades.
- Cerrar con runtime/rollout honesto, sin confundir documento, código y disponibilidad.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/EFEONCE_INSIGHTS_PLATFORM_DECISION_V1.md`.
- `docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md` §§3–4, 6–7, 10–11 (source of truth del contrato de esta unidad).
- `docs/architecture/GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md`.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`.
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`.

Reglas: métricas en su dueño; un snapshot por edición; acceso por org; ninguna mutación de una edición emitida.
El ADR acepta planificación, no acredita implementación. Rutas/tablas nuevas son propuestas hasta materializarse.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`.
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`.
- `docs/operations/EFEONCE_REPORT_BRAND_DELIVERY_STANDARD_V1.md`.
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`.
- `.codex/skills/efeonce-mcp-platform/SKILL.md`.

## Dependencies & Impact

### Depends on

- TASK-1845.
- Contratos de EPIC-045 y arquitectura Insights; sources de la sección siguiente.

### Blocks / Impacts

- EPIC-045; consumers posteriores del grafo de la arquitectura §11.
- TASK-1672/1673 conservan auditoría SEO especializada; TASK-1644 conserva VisualProfile.
- Coordinación serial en manifiestos/copy/índices compartidos; no se autoriza multiagente ni cambio de branch.

### Files owned

- `src/lib/insights/{render,outputs}/** (nuevo propuesto)`
- `services/artifact-worker/{main.ts,selftest.ts,Dockerfile,deploy.sh} (extensión acotada)`
- `src/lib/commercial/tenders/proposals/render-jobs.ts (adapter compatible, sin cambiar negocio Proposal)`
- `src/app/api/platform/{app,ecosystem}/insights/{runs,outputs}/** (propuesto)`
- `src/lib/artifact-composer/ (sólo primitive domain-free si la paginación lo exige; no catálogos)`
- `src/mcp/greenhouse/tool-manifest.ts (sólo entradas render Insights, serializadas)`

## Current Repo State

### Already exists

- `services/artifact-worker/main.ts`.
- `src/lib/commercial/tenders/proposals/render-jobs.ts`.
- `src/lib/artifact-composer/contracts.ts`.

### Gap

El Composer es reusable, pero el worker y los render jobs importan Proposal y registran proposal_assets. Fingir que un informe es una propuesta contaminaría dominio, policy e historial. Evidencia local 2026-09-08; disponibilidad live no verificada en esta planificación.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/insights/{render,outputs}/** (nuevo propuesto)` dentro del checkout Greenhouse.
- Future candidate home: `remain-shared`
- Boundary: dominio Insights y puertos de la arquitectura §3/7; Composer y Email mantienen sus autoridades.
- Server/browser split: DTO y presentación puros en browser; stores, secrets, authz y providers sólo server-side.
- Build impact: render/font/catalog aislados del grafo browser; sin nuevos SDK pesados en rutas web.
- Extraction blocker: contexto de organización, transacciones y release actuales; sin nuevo deployable ni paquetes anticipados.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: RenderRun, InsightOutput y vínculos asset; jobs históricos Proposal se preservan.
- Consumidores afectados: UI, App API, Ecosystem API/MCP y workers; reader público sólo en TASK-1848.
- Runtime target: staging, production y worker con activación autorizada por lane.

### Contract surface

- Contrato existente a respetar: arquitectura Insights y commands/readers canónicos arriba enlazados.
- Contrato nuevo o modificado: operaciones asignadas a esta task en arquitectura §7.
- Backward compatibility: additive/gated; se preservan Proposal, Grader y API de módulos.
- Full API parity: commands/readers únicos con adapters finos UI/API/MCP y manifest versionado; ninguna lógica en gateway.

### Data model and invariants

- Entidades/tablas/views afectadas: RenderRun, InsightOutput y vínculos asset; jobs históricos Proposal se preservan.
- Invariantes que no se pueden romper: ownership por org; edición inmutable; ausente distinto de cero; state/event atómicos.
- Write-target allowlist: registrar cada store nuevo en el boundary del dominio en el mismo PR; sin SQL directo desde UI/worker.
- Tenant/space boundary: actor autenticado + org/space permitidos; nunca confiar en org del payload sin autorización.
- Idempotency/concurrency: unique keys por operación/payload; lease/fencing en ejecución; retry no duplica efectos.
- Audit/outbox/history: historial append-only redactado y outbox transaccional; no bearer ni evidencia interna en logs.

### Migration, backfill and rollout

- Migration posture: additive por runner canónico, con readback; no tocar historia de módulos.
- Default state: gates OFF; despliegue de código no habilita el producto.
- Backfill plan: ninguno masivo; fixtures sintéticos identificados y cleanup. Si se descubre necesidad, dry-run y plan antes de apply.
- Rollback path: suspender lane, conservar datos y revert de consumidor compatible; jamás borrar evidencia emitida.
- External coordination: release/env/worker/manifest por dueño; no nuevos remitentes ni ampliación del cliente público OAuth.

### Security and access

- Auth/access gate: views + capability + entitlement por org; token shared únicamente proyección acotada de TASK-1848.
- Sensitive data posture: allowlist client-facing, assets privados, token sólo en canal autorizado; no PII irrelevante.
- Error contract: códigos del dominio por errores canónicos y captureWithDomain; sin raw errors.
- Abuse/rate-limit posture: cuotas por org, rate limit y retry budget, autorización revocable.

### Runtime evidence

- Local checks: pruebas funcionales de contrato y negativos; no tests de forma textual como sustituto.
- DB/runtime checks: migration/readback y `pnpm test:live` serializado cuando aplica; no source .env.local.
- Integration checks: staging y canary sintético de lanes de esta task; ningún cliente como tester técnico.
- Reliability signals/logs: `insights_render_orphaned` propuesta, errores canónicos y métricas por run/org sin secretos.
- Production verification sequence: sección Rollout de esta task; release por control plane y autorización propia.

### Acceptance criteria additions

- [ ] Capability/registry/grant en mismo PR, fine-grained auth, API/MCP, auditoría y errores equivalentes verificados.
- [ ] Source of truth, tenant boundary, concurrencia, migración/rollback y evidencia live de esta unidad pasan antes del cierre.

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

### Slice 1 — Adapter y jobs compatibles

- Introducir consumer tipado para Insights con su cola/state/outputs y mantener reader/command Proposal compatible. No migrar historial de propuestas ni escribir SQL desde el worker; state + outbox atómicos.

### Slice 2 — Ejecución y almacenamiento

- Claim/lease/fencing, manifest fijado, assets privados org-scoped y finalización idempotente. request/retry/cancel por commands y API/MCP. Resolver páginas variables a través del catálogo; primitive genérica sólo si la prueba de A4 la requiere.

### Slice 3 — Recuperación y límites

- Resolver retry de un output sin repetir los exitosos, crash tras upload, cancelación, timeout, dead letter y reconciliación de huérfanos. Límite por org y fairness con Proposal; no detener el publisher del outbox.

### Slice 4 — Benchmark y activación

- Ejecutar matriz 15/25 slides, 10/30 páginas, tres runs por caso y ráfaga cinco jobs. Medir duración/RSS/costo/queue age y fijar límites antes de activar; validar regresión Proposal y rollback.

## Out of Scope

- Métricas nuevas o fórmulas duplicadas, refresh facturable automático, PPTX/DOCX, editor libre y migración general del Grader.
- Otras unidades de EPIC-045 y perfiles visuales de TASK-1644; no cambios ajenos ni nuevas ramas/worktrees.

## Detailed Spec

El contrato exigible está en `docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md` §§3–4, 6–7, 10–11. Esta task materializa sólo su ownership.
RenderRun, InsightOutput y vínculos asset; jobs históricos Proposal se preservan.
Nuevos paths son propuestas explícitas; confirmar los puntos de integración en Discovery y registrar cambios materiales.
La compactación en cinco unidades no elimina pruebas ni autoriza omitir un módulo/formato por conveniencia.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 → Slice 2 → Slice 3 → Slice 4. No activar el consumer antes de su contrato y pruebas.
Respetar Blocked by; sólo preparación documental puede anteceder dependencias.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un nuevo consumer rompe propuestas o deja outputs huérfanos | Insights | medium | Adapter compatible + replay/fencing + regresión Proposal + kill switch separado | insights_render_orphaned (propuesta) |
| Fuga entre clientes o evidencia interna | Access | medium | Allowlist, org boundary y pruebas negativas | insights_access_denied (propuesta) |

### Feature flags / cutover

INSIGHTS_RENDER_ENABLED propuesto default false; no sustituye ARTIFACT_RENDER_JOBS_ENABLED ni habilita Proposal implícitamente. Registrar flags/env/DB policy con dueño y consumidores reales; no interpretar NODE_ENV como entorno.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | Deshabilitar lane o versión de consumer y revert compatible; conservar snapshots/outputs ya emitidos | medir en staging | sí para código; no retira copias descargadas |
| 2 | Deshabilitar lane o versión de consumer y revert compatible; conservar snapshots/outputs ya emitidos | medir en staging | sí para código; no retira copias descargadas |
| 3 | Deshabilitar lane o versión de consumer y revert compatible; conservar snapshots/outputs ya emitidos | medir en staging | sí para código; no retira copias descargadas |
| 4 | Deshabilitar lane o versión de consumer y revert compatible; conservar snapshots/outputs ya emitidos | medir en staging | sí para código; no retira copias descargadas |

### Production verification sequence

1. Local: contratos, fixtures y gates focales antes de gastar CI/cloud.
2. Staging: schema/flags/worker readback cuando aplica; canary sintético dos orgs y fallo parcial.
3. Verificar recovery y rollback; documentar evidencia y activar sólo por release autorizado.
4. Producción: comprobar SHA/config/commands/readers/outputs del lane; no inferir desde documentos.
5. Cohorte cliente consentida sólo después de certificación técnica; actualizar acceptance/status con evidencia real.

### Out-of-band coordination required

Release, activación externa y correo real tienen autorización propia; esta creación documental no los ejecuta.
No solicitar otra cuenta, secreto ni acción del cliente para pruebas técnicas.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Insights produce assets ligados a edición/org, nunca a Proposal ni proposal_deliverable; Proposal existente conserva sus jobs/outputs sin pérdida.
- [ ] Worker no consulta ni calcula métricas; verifica manifest, catálogos, fuentes y assets fijados y rechaza manifest_drift.
- [ ] Dos workers y un lease vencido no crean dos outputs finales; fencing impide finalización vieja; crash tras upload se reconcilia.
- [ ] Fallar report_pdf conserva deck_pdf exitoso; retry no duplica; cancelación impide iniciar trabajo restante y tiene estado terminal honesto.
- [ ] Límites, cuotas, queue age, retry budget, dead letter y señales de recuperación están operativos y aislados por org.
- [ ] Los tres targets se contabilizan por edición; PDF usa Composer y web conserva el modelo congelado, sin screenshot como web.
- [ ] API/MCP request/get/retry/cancel pasan policy, idempotencia y error parity; no esperan la generación en request-response.
- [ ] Benchmark adjunta resultados observados y límites efectivos; prueba competencia de cola con Proposal y budgets de memoria/tiempo.
- [ ] Staging y producción autorizada muestran render→asset privado→readback; rollback corta Insights y preserva Proposal; gates worker/build y secretos verificados.

## Verification

- `pnpm worker:build-contract-gate` y `pnpm worker:runtime-deps-gate`; deploy inputs de ambos consumers incluidos.
- Regresión de `services/artifact-worker/selftest.ts` y Composer; comandos exactos según scripts vigentes.

- `pnpm task:lint --task TASK-1846`: template=1, legacy=0, errors=0, warnings=0.
- `pnpm qa:gates --changed` durante implementación; lint/typecheck y tests focales por diff.
- `pnpm test:live` cuando hay SQL/runtime, serializado; allow/deny e idempotencia por API/MCP.
- Verificar runtime por capa; no usar guardas textuales para certificar comportamiento.
- `pnpm docs:closure-check` y, después de toda edición de contexto, `pnpm docs:context-check:strict`.

## Closing Protocol

- [ ] Lifecycle, carpeta, Status real y acceptance actualizados con evidencia; sin rollout no se declara complete.
- [ ] TASK_ID_REGISTRY, README y EPIC-045 sincronizados; remover blockers obsoletos en dependientes.
- [ ] Arquitectura técnica, documentación funcional y manual/runbook actualizados proporcionalmente.
- [ ] Handoff/changelog y contratos UI/API/MCP reflejan disponibilidad real.
- [ ] Regresiones, señales, rollback y gates documentales pasan; no commit/push/deploy automático.

## Follow-ups

PPTX/DOCX y gráficos adicionales se evalúan por demanda; no crear tasks preventivas. Los gaps dentro de esta
unidad se resuelven en sus slices. TASK-1672/1673 conservan la integración especializada SEO.

## Open Questions

Sin preguntas que bloqueen el registro. Confirmar límites, rutas y mapping propuestos en Discovery contra
código/runtime; no inventar disponibilidad. Antes de implementar, /goal explícito y codex:task-hook.
