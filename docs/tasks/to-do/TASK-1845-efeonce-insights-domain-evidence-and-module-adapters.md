# TASK-1845 — Efeonce Insights: dominio, evidencia y adaptadores SEO/AEO/ICO

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
- Domain: `platform|data`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin branch dedicada ni worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construye el aggregate Insights y sus ediciones, snapshots y plan editorial; integra SEO, AEO e ICO (RpA/OTD) mediante readers canónicos. API y MCP comparten commands, permisos e idempotencia. Define una sola evidencia para deck, informe vertical y web.

## Why This Task Exists

Los modelos por módulo no ofrecen un encargo transversal reproducible por ventana, versión y audiencia. El report builder AEO existente es un productor de evidencia, no el dominio de entregas de todos los módulos.

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
- `docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md` §§1–5, 7, 10–12 (source of truth del contrato de esta unidad).
- `docs/architecture/GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md`.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`.
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`.

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`.
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`.
- `docs/architecture/GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md`.
- `docs/architecture/GREENHOUSE_DATAFORSEO_ETV_METHOD_VERSIONING_DECISION_V1.md`.

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

- none.
- Contratos de EPIC-045 y arquitectura Insights; sources de la sección siguiente.

### Blocks / Impacts

- EPIC-045; consumers posteriores del grafo de la arquitectura §11.
- TASK-1672/1673 conservan auditoría SEO especializada; TASK-1644 conserva VisualProfile.
- Coordinación serial en manifiestos/copy/índices compartidos; no se autoriza multiagente ni cambio de branch.

### Files owned

- `docs/mcp/skills/efeonce-insights/SKILL.md` (nuevo propuesto) y `src/mcp/greenhouse/skill-manifest.ts`; contenido operativo y registro.

- `src/lib/insights/{contracts,commands,readers,stores,adapters,editorial}/** (nuevo propuesto)`
- `src/app/api/platform/{app,ecosystem}/insights/{reports,editions,catalog}/** (rutas propuestas)`
- `src/mcp/greenhouse/tool-manifest.ts (sólo entradas núcleo Insights; edición serializada)`
- `migraciones nuevas del núcleo Insights por runner canónico; ruta exacta en Discovery`

## Current Repo State

### Already exists

- `src/lib/growth/ai-visibility/report/command.ts`.
- `src/components/growth/seo/report-artifact/model.ts`.
- `src/lib/ico-engine/read-metrics.ts`.
- `src/mcp/greenhouse/tool-manifest.ts`.

### Gap

Los modelos por módulo no ofrecen un encargo transversal reproducible por ventana, versión y audiencia. El report builder AEO existente es un productor de evidencia, no el dominio de entregas de todos los módulos. Evidencia local 2026-09-08; disponibilidad live no verificada en esta planificación.

## Modular Placement Contract

- Topology impact: `api`
- Current home: `src/lib/insights/{contracts,commands,readers,stores,adapters,editorial}/** (nuevo propuesto)` dentro del checkout Greenhouse.
- Future candidate home: `remain-shared`
- Boundary: dominio Insights y puertos de la arquitectura §3/7; Composer y Email mantienen sus autoridades.
- Server/browser split: DTO y presentación puros en browser; stores, secrets, authz y providers sólo server-side.
- Build impact: render/font/catalog aislados del grafo browser; sin nuevos SDK pesados en rutas web.
- Extraction blocker: contexto de organización, transacciones y release actuales; sin nuevo deployable ni paquetes anticipados.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `command`
- Source of truth afectado: InsightReport, InsightEdition, EvidenceSnapshot y EditorialPlan; nombres DDL exactos se fijan antes de migrar.
- Consumidores afectados: UI, App API, Ecosystem API/MCP y workers; reader público sólo en TASK-1848.
- Runtime target: staging, production y worker con activación autorizada por lane.

### Contract surface

- Contrato existente a respetar: arquitectura Insights y commands/readers canónicos arriba enlazados.
- Contrato nuevo o modificado: operaciones asignadas a esta task en arquitectura §7.
- Backward compatibility: additive/gated; se preservan Proposal, Grader y API de módulos.
- Full API parity: commands/readers únicos con adapters finos UI/API/MCP y manifest versionado; ninguna lógica en gateway.

### Data model and invariants

- Entidades/tablas/views afectadas: InsightReport, InsightEdition, EvidenceSnapshot y EditorialPlan; nombres DDL exactos se fijan antes de migrar.
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
- Reliability signals/logs: `insights_evidence_rejected` propuesta, errores canónicos y métricas por run/org sin secretos.
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

### Slice 1 — Contrato y persistencia

- Materializar ID opaco/código legible único, report/edition/evidence/plan y relaciones por org; migrations additive, stores canónicos, grants/views y write allowlist. Registrar retención efectiva por clase antes de emitir.

### Slice 2 — Adaptadores y autoría

- Implementar adaptadores SEO/AEO/ICO y el ledger de hechos con corte, unidad, población, cobertura/método. Resolver ventanas [start,end), comparaciones/DST y suppression. Plan editorial acotado con IA opcional, fallback factual y referencias; no refresh facturable.

### Slice 3 — Commands y paridad

- Catalog/validate/create/revise/get/list/issue por commands. Dejar puertos de outputs/share sin implementarlos; emisión exige outputs validados y aprobación ligada a hash. App/Ecosystem/MCP con misma policy y errores; manifest/sync por contrato del gateway.

### Slice 4 — Verificación y rollout

- Pruebas con datos sintéticos de dos organizaciones y readers reales en integración autorizada; límites explícitos de cobertura y aprobación. Registrar canary API/MCP, rollback y manual funcional.

- Crear el manual operativo canónico efeonce-insights y su registro MCP conforme arquitectura §13; recetas verificadas de discovery, ventanas, evidencia, formatos y commands. Declarar versiones/audience/appliesTo y routing; publicar únicamente capacidades construidas.

## Out of Scope

- Métricas nuevas o fórmulas duplicadas, refresh facturable automático, PPTX/DOCX, editor libre y migración general del Grader.
- Otras unidades de EPIC-045 y perfiles visuales de TASK-1644; no cambios ajenos ni nuevas ramas/worktrees.

## Detailed Spec

El contrato exigible está en `docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md` §§1–5, 7, 10–12. Esta task materializa sólo su ownership.
InsightReport, InsightEdition, EvidenceSnapshot y EditorialPlan; nombres DDL exactos se fijan antes de migrar.
Nuevos paths son propuestas explícitas; confirmar los puntos de integración en Discovery y registrar cambios materiales.
La compactación en cinco unidades no elimina pruebas ni autoriza omitir un módulo/formato por conveniencia.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 → Slice 2 → Slice 3 → Slice 4. No activar el consumer antes de su contrato y pruebas.
Respetar Blocked by; sólo preparación documental puede anteceder dependencias.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Datos de cohortes distintas parecen comparables | Insights | medium | Adapter rechaza método/grano incompatible; fixture de frontera temporal | insights_evidence_rejected (propuesta) |
| Fuga entre clientes o evidencia interna | Access | medium | Allowlist, org boundary y pruebas negativas | insights_access_denied (propuesta) |

### Feature flags / cutover

INSIGHTS_GENERATION_ENABLED e INSIGHTS_ISSUANCE_ENABLED propuestos, default false; cada runtime declara su lectura. Registrar flags/env/DB policy con dueño y consumidores reales; no interpretar NODE_ENV como entorno.

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

- [ ] Skill efeonce-insights autosuficiente para MCP, ligada a tools reales en skill-manifest y accesible por catálogo/reader autorizado; ejemplos de generación/ventana/recuperación ejecutados sin contexto previo, sin fuga de instrucciones internas.

- [ ] Report/edition/snapshot se persisten con ownership por org, código único bajo concurrencia y snapshots sellados inmutables; corrección crea una versión nueva.
- [ ] Los tres adapters producen hechos con evidencia, unidad, población, cobertura, asOf y metodología; no duplican fórmulas de SEO/AEO/ICO.
- [ ] Ventanas DST, mes anterior, año bisiesto, comparaciones incompatibles, nulo/cero, RpA suppressed y OTD con denominador tienen pruebas funcionales; unsupported_window no se convierte en dato actual.
- [ ] Cambiar el módulo se resuelve por registry/adapter; un cuarto adapter de fixture se integra sin editar el orquestador ni Composer.
- [ ] Plan determinista y autoría IA bounded prueban que ninguna cifra cambia; salidas del modelo no emiten ni envían, y replay usa narrativa congelada.
- [ ] Idempotency key repetida devuelve la misma edición; payload distinto da conflicto; eventos y estado son atómicos.
- [ ] API interna, App/Ecosystem y MCP ejercitan allow/deny y misma semántica; base-only read no permite crear ni emitir.
- [ ] Retención, allowlist, errores sanitizados y señales de calidad/autoría quedan registrados; metadata/prompt no filtran contenido interno.
- [ ] Migración/readback, pruebas live serializadas cuando corresponda, flags y rollback se verifican antes de activación; issue permanece bloqueado sin outputs validados.

## Verification

- `pnpm task:lint --task TASK-1845`: template=1, legacy=0, errors=0, warnings=0.
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
