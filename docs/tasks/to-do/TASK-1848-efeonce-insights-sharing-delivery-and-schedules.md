# TASK-1848 — Efeonce Insights: acceso compartido, correo y recurrencia gobernados

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
- Backend impact: `command`
- Epic: `EPIC-045`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform|identity|ops|data`
- Blocked by: `TASK-1845, TASK-1846`
- Branch: `Greenhouse develop; sin branch dedicada ni worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construye grants por token para vistas web de ediciones emitidas, múltiples enlaces revocables, descarga controlada, delivery intents por correo centralizado y schedules. API/MCP comparten autoridad e idempotencia; ningún envío nace sólo de generar un reporte.

## Why This Task Exists

El Grader tiene un enlace activo por reporte y estado especializado; no cubre los grants independientes, el output set ni la recurrencia de Insights. Reusar su tabla o su token como OAuth ampliaría privilegios y acoplaría dominios.

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
- `docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md` §§4, 7–11 (source of truth del contrato de esta unidad).
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

- TASK-1845, TASK-1846.
- Contratos de EPIC-045 y arquitectura Insights; sources de la sección siguiente.

### Blocks / Impacts

- EPIC-045; consumers posteriores del grafo de la arquitectura §11.
- TASK-1672/1673 conservan auditoría SEO especializada; TASK-1644 conserva VisualProfile.
- Coordinación serial en manifiestos/copy/índices compartidos; no se autoriza multiagente ni cambio de branch.

### Files owned

- `docs/mcp/skills/efeonce-insights/SKILL.md` (nuevo propuesto), sólo recetas de distribución, en coordinación serial con TASK-1845.

- `src/lib/insights/{sharing,delivery,schedules}/** (nuevo propuesto)`
- `src/app/api/platform/{app,ecosystem}/insights/{shares,deliveries,schedules}/** (propuesto)`
- `src/app/api/insights/shared/** (reader público propuesto; no UI)`
- `src/lib/email/{types.ts,templates.ts} (registro/contexto Insights; presentación en TASK-1849)`
- `src/mcp/greenhouse/tool-manifest.ts (entradas sharing/delivery/schedules, serializadas)`
- `migraciones additive de grants/intents/schedules y registro consumer existente; sin cron por cliente`

## Current Repo State

### Already exists

- `src/lib/growth/ai-visibility/report/short-link.ts`.
- `src/lib/growth/ai-visibility/report/snapshot.ts`.
- `src/lib/email/delivery.ts`.
- `src/lib/email/resend-reconciliation.ts`.
- `src/lib/notifications/notification-service.ts`.

### Gap

El Grader tiene un enlace activo por reporte y estado especializado; no cubre los grants independientes, el output set ni la recurrencia de Insights. Reusar su tabla o su token como OAuth ampliaría privilegios y acoplaría dominios. Evidencia local 2026-09-08; disponibilidad live no verificada en esta planificación.

## Modular Placement Contract

- Topology impact: `api`
- Current home: `src/lib/insights/{sharing,delivery,schedules}/** (nuevo propuesto)` dentro del checkout Greenhouse.
- Future candidate home: `remain-shared`
- Boundary: dominio Insights y puertos de la arquitectura §3/7; Composer y Email mantienen sus autoridades.
- Server/browser split: DTO y presentación puros en browser; stores, secrets, authz y providers sólo server-side.
- Build impact: render/font/catalog aislados del grafo browser; sin nuevos SDK pesados en rutas web.
- Extraction blocker: contexto de organización, transacciones y release actuales; sin nuevo deployable ni paquetes anticipados.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `command`
- Source of truth afectado: ShareGrant, DeliveryIntent e InsightSchedule; referencia email_deliveries existente, no segundo ledger de transporte.
- Consumidores afectados: UI, App API, Ecosystem API/MCP y workers; reader público sólo en TASK-1848.
- Runtime target: staging, production y worker con activación autorizada por lane.

### Contract surface

- Contrato existente a respetar: arquitectura Insights y commands/readers canónicos arriba enlazados.
- Contrato nuevo o modificado: operaciones asignadas a esta task en arquitectura §7.
- Backward compatibility: additive/gated; se preservan Proposal, Grader y API de módulos.
- Full API parity: commands/readers únicos con adapters finos UI/API/MCP y manifest versionado; ninguna lógica en gateway.

### Data model and invariants

- Entidades/tablas/views afectadas: ShareGrant, DeliveryIntent e InsightSchedule; referencia email_deliveries existente, no segundo ledger de transporte.
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
- Reliability signals/logs: `insights_delivery_ambiguous` propuesta, errores canónicos y métricas por run/org sin secretos.
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

### Slice 1 — Grants y reader público

- Token >=128 bits, sólo digest, muchos grants por edición con expires/revoke/downloadPolicy. Proyección client-facing; validar org/edición/grant en cada lectura/descarga. Headers anti-index/cache/referrer y redacción de token en todas las capas.

### Slice 2 — Entrega durable

- Intent con autoridad ligada a versión/destinatarios/outputs, EmailType y seed disabled, clasificación sensible, sendEmail y tracking de enlaces deshabilitado. Dedupe antes de crear grants; persistencia de bearer sólo cifrada/efímera si necesaria para retry. Reconciliación antes de reenviar un timeout ambiguo.

### Slice 3 — Schedules y paridad

- Schedule con ventana/zona/lateness/catch-up y autorización revocable. Ocurrencia única, generación draft por defecto, autoemit/send sólo por autorización durable explícita; no nuevo cron por cliente. Commands App/Ecosystem/MCP y adapters para TASK-1673.

### Slice 4 — Conformance y rollout

- Matriz acceso dos orgs, revoke/expiry/inflight, descargas, retiradas, rate limit y no-leak. Doble tick/doble envío/fallo provider, prueba sobre inbox sintético autorizado, webhook/reconciliación y rollback por lane.

- Extender el manual efeonce-insights de TASK-1845 con recetas verificadas de grants, revoke/expiry, descargas, envío, retries y schedules; una sola fuente y edición serializada. No enseñar que leer autoriza enviar.

## Out of Scope

- Métricas nuevas o fórmulas duplicadas, refresh facturable automático, PPTX/DOCX, editor libre y migración general del Grader.
- Otras unidades de EPIC-045 y perfiles visuales de TASK-1644; no cambios ajenos ni nuevas ramas/worktrees.

## Detailed Spec

El contrato exigible está en `docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md` §§4, 7–11. Esta task materializa sólo su ownership.
ShareGrant, DeliveryIntent e InsightSchedule; referencia email_deliveries existente, no segundo ledger de transporte.
Nuevos paths son propuestas explícitas; confirmar los puntos de integración en Discovery y registrar cambios materiales.
La compactación en cinco unidades no elimina pruebas ni autoriza omitir un módulo/formato por conveniencia.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 → Slice 2 → Slice 3 → Slice 4. No activar el consumer antes de su contrato y pruebas.
Respetar Blocked by; sólo preparación documental puede anteceder dependencias.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Token se filtra o reintento envía dos veces | Insights | medium | Digest/redacción/no-store + authorization/dedupe + reconciliación canónica | insights_delivery_ambiguous (propuesta) |
| Fuga entre clientes o evidencia interna | Access | medium | Allowlist, org boundary y pruebas negativas | insights_access_denied (propuesta) |

### Feature flags / cutover

INSIGHTS_SHARING_ENABLED, INSIGHTS_DELIVERY_ENABLED e INSIGHTS_SCHEDULES_ENABLED propuestos default false; EmailType config disabled por separado. Registrar flags/env/DB policy con dueño y consumidores reales; no interpretar NODE_ENV como entorno.

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

- [ ] Manual operativo incluye y prueba aprobación por versión/destinatario, revocación, retry ambiguo, accepted frente a delivered y pausa de schedule; fixtures sanitizados y negativos de permiso/tenant por MCP.

- [ ] Dos grants activos de una edición se revocan individualmente; token desconocido/expirado/revocado no revela identidad ni datos del cliente.
- [ ] Sólo digest persistido; tests de logs/outbox/analytics/referrer/HTML verifican ausencia de bearer fuera de respuesta autorizada y del carril cifrado efímero.
- [ ] Revocación corta siguiente acceso y descarga sin caché/CDN/storage bypass; archivo ya descargado se declara irrevocable.
- [ ] Token no autoriza biblioteca, otra edición, otro tenant, más módulos ni OAuth/MCP; organización suspendida o edición retirada falla cerrada.
- [ ] requestDelivery requiere capability interna y aprobación ligada a payload; cliente puede compartir enlace pero no usar Efeonce como relay arbitrario.
- [ ] Email usa sendEmail, email_deliveries, type/config y context resolver canónicos; accepted/delivered/bounced/failed son distintos y apertura no identifica persona.
- [ ] Dedupe, timeout ambiguo, reintento y webhook duplicado no provocan otro correo sin reconciliación; retiro pausa intents pendientes.
- [ ] Schedule resuelve período cerrado/zona/consolidación, doble tick produce una ocurrencia, catch-up acotado y revoke de autoridad lo pausa.
- [ ] API/MCP ejercitan mismos permisos y errores; write scopes por consentimiento preciso, sin ampliar cliente base-only.
- [ ] Retención/cleanup y rate limits verificados; rollout por sharing/delivery/schedules con gates OFF, inbox sintético autorizado y rollback ejercitado; integración SEO especializada sigue en TASK-1673.

## Verification

- `pnpm task:lint --task TASK-1848`: template=1, legacy=0, errors=0, warnings=0.
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
