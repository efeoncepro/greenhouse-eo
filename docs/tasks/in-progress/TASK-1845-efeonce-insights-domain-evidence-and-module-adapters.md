# TASK-1845 — Efeonce Insights: dominio, evidencia y adaptadores SEO/AEO/ICO

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
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
- Epic: `EPIC-045`
- Status real: `Code complete + canary staging verde 2026-09-15 (develop 8844a3d5c pushed, CI/workers verdes; INSIGHTS_GENERATION_ENABLED=true sólo en staging; insights_v1 asignado a la org sintética Greenhouse Demo; ediciones EO-INS-000012/000013 creadas por app y ecosystem; gateway efeonce-mcp v1.5.0 mergeado (PR #12 cad57b31d) y desplegado (revisión 00053-dsk); scope efeonce.mcp.insights.write creado en Entra). Release develop→main APLICADO 2026-09-15 22:55Z (PR #236 → 9c0946883, manifest 9c094688309d-500ec9e7 released, run 35032358217, watchdog ok, canary prod: rutas ejecutando). INSIGHTS_GENERATION_ENABLED ON en Production (redeploy h2030d3bz, create 202 EO-INS-000014 en prod); skill servida verificada en prod + evaluación sin contexto (EO-INS-000015). Pendiente para complete: ensayo migrate:down (bloqueado al agente; delegado) y tools/list con token humano`
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

- `docs/architecture/EFEONCE_INSIGHTS_IMPLEMENTATION_RECORD_V1.md` — registro de construcción y despliegue de esta task (2026-09-15): qué se construyó, cómo, qué está desplegado dónde y qué no.

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

- [x] Capability/registry/grant en mismo PR, fine-grained auth, API/MCP, auditoría y errores equivalentes verificados. — Evidencia: migración seed + `entitlements-catalog.ts` + `runtime.ts` (Slice 1, `capability-grant-coverage.test` verde); `insights-lanes.test.ts` (misma tabla de errores en app/ecosystem); manifest MCP regenerado.
- [x] Source of truth, tenant boundary, concurrencia, migración/rollback y evidencia live de esta unidad pasan antes del cierre. — Evidencia: migración aplicada + readback y `stores.live.test.ts` contra PG real (aislamiento por org, triggers, matriz, idempotencia) verdes; canary live en staging 2026-09-15 con `INSIGHTS_GENERATION_ENABLED=true` (sección «Rollout evidence»): create 202 → `ready_for_review`, replay idempotente, 409 por payload distinto, 404 anti-oracle en org sin módulo. El ensayo de `migrate:down` queda registrado como pendiente en el criterio de rollback.

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

- [x] Cliente e interno usan el mismo catálogo/commands con autorización por acción, organización, módulos y audiencia: cliente genera sólo plantillas/evidencia permitidas de su cuenta; ser interno no concede todas las cuentas. URL/API/MCP niegan target o audience manipulados. — Evidencia: `authz.ts` + `commands.test.ts` (target ajeno = not_found, `audience=internal` rechazada al cliente, sin módulo = not_found) + `insights-lanes.test.ts` (binding org-scoped ↔ otra org 404; internal sin org 400).
- [x] Cliente ve sus solicitudes con estado redactado y ediciones elegibles; drafts internos no aparecen por compartir org. Crear y emitir son autoridades distintas; el estado ready_for_review tiene owner cuando la policy lo exige. — Evidencia: `readers/projection.ts` + test de proyección (in_progress/in_review; edición `internal` invisible al cliente); `insights.edition.issue` distinta de `create` (Operations no emite, test).
- [ ] Berel SEO/contenidos y Sky diseño/ICO se integran con EPIC-046 consumiendo readers de los productores, nunca el BFF client-portal; conservar unidad, período, frescura y proyección en snapshot/identidad de reutilización. — Parcial: adapters consumen sólo readers dueños (boundary test prohíbe `client-portal`); la integración con Berel/Sky reales exige módulo asignado + canary (pendiente, EPIC-046 P01).
- [x] Skill efeonce-insights autosuficiente para MCP, ligada a tools reales en skill-manifest y accesible por catálogo/reader autorizado; ejemplos de generación/ventana/recuperación ejecutados sin contexto previo, sin fuga de instrucciones internas. — Evidencia 2026-09-15: el lane ecosystem de PRODUCCIÓN sirve el catálogo (8 manuales, `efeonce-insights` audience internal) y el manual completo (hash del cuerpo idéntico al artefacto de `main`; nombre inexistente ⇒ 404); un agente sin ningún contexto, con sólo el manual servido, construyó el request de `create_insight_edition` que el lane aceptó (202 → `EO-INS-000015` en staging) e interpretó correctamente `generation_disabled`/`insufficient_scope`/`module_not_assigned`/conflicto/`not_found`/`not_ready`; sus 11 dudas (título/propósito, límites de ventana, forma de `comparison.custom`, paginación, `includeEvidence`, `allowPartial` con todo vacío, códigos reales) quedaron cerradas en el manual (artefacto hash `a8ef12a4f615`, test de fuga verde). El `tools/list` por sesión MCP con token humano queda como verificación de cliente (no de la skill).

- [x] Report/edition/snapshot se persisten con ownership por org, código único bajo concurrencia y snapshots sellados inmutables; corrección crea una versión nueva. — Evidencia: migración (secuencia + `GREATEST`, triggers de inmutabilidad, versión bajo lock) + `stores.live.test.ts` contra PG real.
- [x] Los tres adapters producen hechos con evidencia, unidad, población, cobertura, asOf y metodología; no duplican fórmulas de SEO/AEO/ICO. — Evidencia: `adapters.test.ts`; la agregación GSC por ventana se agregó en el dueño (`readSeoOverviewKpisForWindow`), no en el adapter.
- [x] Ventanas DST, mes anterior, año bisiesto, comparaciones incompatibles, nulo/cero, RpA suppressed y OTD con denominador tienen pruebas funcionales; unsupported_window no se convierte en dato actual. — Evidencia: `window.test.ts` (Santiago -04/-03, mes anterior, 29-feb, custom solapado) + `adapters.test.ts` (AEO fuera de ventana ⇒ unsupported_window, RpA suppressed, OTD sin denominador, no_data ≠ 0).
- [x] Cambiar el módulo se resuelve por registry/adapter; un cuarto adapter de fixture se integra sin editar el orquestador ni Composer. — Evidencia: `registry.test.ts` (fixture consumido por `collectInsightEvidence`).
- [x] Plan determinista y autoría IA bounded prueban que ninguna cifra cambia; salidas del modelo no emiten ni envían, y replay usa narrativa congelada. — Evidencia: `editorial.test.ts` (cifra alterada ⇒ fallback determinista tras una reparación; provenance modelo/prompt); plan congelado con hash en DB.
- [x] Idempotency key repetida devuelve la misma edición; payload distinto da conflicto; eventos y estado son atómicos. — Evidencia: `commands.test.ts` + UNIQUE parcial en DB + outbox en la misma tx (`publishOutboxEvent(event, client)`).
- [ ] API interna, App/Ecosystem y MCP ejercitan allow/deny y misma semántica; base-only read no permite crear ni emitir. — Parcial: `insights-lanes.test.ts` (app + ecosystem con mocks) y, en staging real 2026-09-15, app (persona `agent-client`, 200 catálogo / 202 create / 200 idempotente / 409 conflicto) y ecosystem (consumer del gateway: catálogo, lista, detalle con evidencia, 202 create, 404 deny) con la misma tabla de errores; el provider REAL del gateway (`dist`, `scripts/greenhouse-insights-canary.mjs`) pasó contra staging. Gateway desplegado 2026-09-15 (revisión `00053-dsk`) y scope en Entra; manual servido verificado en producción por el lane; **falta** un `tools/list` por sesión MCP con token humano (login interactivo; verificación de cliente).
- [x] Retención, allowlist, errores sanitizados y señales de calidad/autoría quedan registrados; metadata/prompt no filtran contenido interno. — Evidencia: `insight_retention_classes` (1095 d), `boundary-domain.test.ts`, `insights-errors.ts` (raw ⇒ `internal_error` sin mensaje), historial redactado (`redact()` en generation), señales `insights.editions.*` (`ok` en PG real).
- [ ] Migración/readback, pruebas live serializadas cuando corresponda, flags y rollback se verifican antes de activación; issue permanece bloqueado sin outputs validados. — Parcial: migración aplicada + readback, `test:live` verde, flags registrados (generación ON sólo en staging desde 2026-09-15; emisión e IA OFF), activación por lane verificada en staging, `issue` bloqueado por puerto (test); **falta** ensayo de rollback (`migrate:down` no ejecutado en la instancia compartida: una sola instancia dev/staging/prod).

## Rollout evidence 2026-09-15 (staging)

- `develop` `8844a3d5c` pushed (incluye Slices 1–4, docs y el WIP ajeno de TASK-1801); CI, Playwright smoke y los 5 deploys de workers/auth-server en `success`.
- Vercel `greenhouse-eo`: `INSIGHTS_GENERATION_ENABLED=true` creado sólo en el environment `staging`; redeploy `greenhouse-b80oa2ilb` (la deployment previa respondía `generation_disabled` porque nació antes del env var).
- Módulo `insights_v1` asignado a la org sintética `Greenhouse Demo` (`org-6c09b3a7-cbab-48a9-869e-61d03d1c6291`, dueña de `spc-agent-client-sandbox`) vía `scripts/insights/assign-insights-module.ts --apply` (command canónico `enableClientPortalModule`, assignment `cpma-805e1a0c…`).
- App lane (persona `agent-client@…`, `client_executive`): `GET /api/platform/app/insights/catalog` 200 (seo/aeo `module_not_assigned`, ico disponible); `POST /editions` 202 → `EO-INS-000012` / `insed-43025fc1…` en `ready_for_review` (draft→collecting→composing→validating→ready_for_review); mismo payload → 200 `idempotent: true`; misma key con `depth` distinto → 409 `idempotency_conflict`; evidencia/plan `null` para el cliente (sólo en ediciones emitidas, por diseño).
- Ecosystem lane (consumer `EO-SPK-0004`, binding interno): catálogo, lista (1 edición), detalle con evidencia (snapshot sellado `inssn-9ee4349b…`, 0 hechos, 4 rechazos `no_data` — sin snapshot ICO de esa org en 2026-07/08 —, plan determinista congelado con `limits` visibles), `POST /editions` 202 → `EO-INS-000013`; org sin módulo → 404 anti-oracle.
- Gateway `efeonce-mcp` (rama `feat/task-1845-insights-federation`, `a37d526`, v1.5.0, 47 tools, `pnpm check` 184/184): `scripts/greenhouse-insights-canary.mjs` con el provider REAL contra staging: catalog ✓ list ✓ edition ✓ deny ✓.
- Hallazgo menor: `plan.limits` repite «ico: sin datos.» por cada rechazo (4 líneas iguales); dedupe cosmético para TASK-1846.
- Gateway desplegado 2026-09-15 (Codex ejecutó push/PR/merge/dispatch; PR #12 → `cad57b31d`; run `35027446001` success; revisión `efeonce-mcp-gateway-00053-dsk` con 100 % del tráfico, imagen `sha256:5776558…`, `Ready=True`; front door PRM 200 / `/health` 200 / `/mcp` 401). Scope `efeonce.mcp.insights.write` creado en la app recurso de Entra (id `e1a577d7-…`, Admin; readback: 7 scopes, los 6 previos con ids intactos; cliente PKCE compartido intacto).
- Release a producción 2026-09-15: PR #236 → `main` `9c094688309d345b9780b563968ecd1c5c96afd4`; orquestador `35032358217` un solo run sin retry (`bypass_preflight_reason` con hechos: migración ya aplicada, `auth_access` = paridad de scopes); manifest `9c094688309d-500ec9e7-3f22-4229-b152-e70a197ee1af` → `released` 22:55:13Z; Vercel Production `greenhouse-e8i8fkqbd` READY; watchdog `aggregateSeverity=ok`, 5/5 workers synced; ops-worker y auth-server retienen `0a05c8dc8267` con diff de árbol docs-only (skip legítimo); Azure `no_infra_diff`; `/api/auth/health` 200.
- Canary de contrato en producción (lane ecosystem, consumer del gateway): catálogo 200 (ico disponible), org sin módulo 404, lista 200 (2 ediciones de staging: misma instancia), create 503 `generation_disabled` — las rutas nuevas ejecutan; sólo falta el flag.
- Flag en Production 2026-09-15 ~23:10Z (ejecutado por Codex: `vercel env add INSIGHTS_GENERATION_ENABLED production` + `vercel redeploy`): valor `true` leído con `vercel env pull --environment=production`; redeploy `greenhouse-h2030d3bz` Ready; canary por el lane ecosystem en producción: create 202 → `EO-INS-000014` / `insed-45963bf4…` `ready_for_review`; replay con la misma `idempotency-key` de lane devuelve la misma edición (respuesta cacheada por la lane, por eso `idempotent:false` repetido); `/api/auth/health` 200. Runtime único del flag: Vercel (`grep` en `src/` y `services/`: sólo `flags.ts`).
- Manual servido verificado en producción 2026-09-15 (~23:40Z): catálogo 8 manuales / manual `efeonce-insights` idéntico al artefacto de `main` / 404 en nombre inexistente; evaluación con agente sin contexto → request válido (202, `EO-INS-000015` en staging); manual ampliado en develop con los huecos detectados.
- Ensayo de rollback (Codex, 2026-09-15 ~23:50Z, secuencia `pg:connect` → `migrate:status` → `migrate:down` → `migrate:up`): el Down llegó hasta `DELETE FROM greenhouse_client_portal.modules` y falló con `module_assignments_module_key_fkey` (la org sintética tiene `insights_v1` asignado); node-pg-migrate revirtió la transacción completa y la base quedó intacta (readback: `run_on` original, 4 ediciones, matriz 14, 13 triggers). **Hallazgos reales del ensayo (dos intentos):** (1) el Down borraba el módulo con asignaciones vigentes (FK); (2) borrar asignaciones exige borrar `module_assignment_events`, que es append-only por gobernanza. Decisión final en la sección Down (nunca ejecutada; el Up no cambia): el rollback no toca catálogo, asignaciones ni auditoría del módulo; retira el schema y depreca las capabilities, y el Up re-siembra capabilities y deja el módulo (`DO NOTHING`), así que down/up vuelve al estado vigente sin reasignar nada. Falta repetir el ensayo con este Down.
- Pendiente para `complete`: repetir `migrate:down` + `migrate:up` con el Down definitivo (bloqueado al agente por el clasificador; Codex/operador) + readback; y, como verificación de cliente, un `tools/list` por sesión MCP con token humano.

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

## Delta 2026-09-15 — implementación (Claude, develop, sin push)

Slices 1–4 implementados y commiteados en `develop` (`e6e8a5dfe`, `a21e424fa`, `ca17c93da` + docs).
Decisiones de ejecución registradas: schema `greenhouse_insights` (prefijo canónico; marca en código
`EO-INS-…`, módulo `insights_v1`, skill `efeonce-insights`); path `src/lib/efeonce-insights/` (evita
colisión con Nexa Insights); `catalog` es reader del dominio bajo el mismo lane (no ruta aparte);
`ChartSpecV1` nace aquí como contrato de datos (librería visual en TASK-1847); agregación GSC por
ventana añadida en el dueño (`readSeoOverviewKpisForWindow`); generación por fases síncrona tras el
commit (TASK-1846 la mueve al worker); ecosystem lane: binding org-scoped sólo lee, internal crea,
ningún binding emite. Estado real: **code complete, rollout pendiente** (ver Status real y criterios
sin tildar). Drift ajeno observado: 3 capabilities `identity.internal_access.*` en TS sin seed en DB
(parity live rojo preexistente, no tocado). **Decisión posterior del operador (mismo día):** la vista web
compartida se renderiza en `efeonce-think` desde `InsightWebModelV1` (ADR delta 2026-09-15; TASK-1848/1849);
no cambia el alcance de esta task.

## Delta 2026-09-09 — dos poblaciones autenticadas, EPIC-046

El operador confirma autogestión cliente y gestión de colaboradores internos como alcance Insights.
Esta task conserva el núcleo: catálogo elegible, autoridad por actor/target/acción, proyección de
audiencia y generación gobernada. Ver arquitectura §7.1. P01/P02 del portal coordinan servicios y
fuentes; no nace otro command ni se toma como backend una proyección BFF. Los criterios anteriores
son exigibles en la implementación; siguen sin verificar y no activan módulos o writes.

## Follow-ups

PPTX/DOCX y gráficos adicionales se evalúan por demanda; no crear tasks preventivas. Los gaps dentro de esta
unidad se resuelven en sus slices. TASK-1672/1673 conservan la integración especializada SEO.

## Open Questions

Sin preguntas que bloqueen el registro. Confirmar límites, rutas y mapping propuestos en Discovery contra
código/runtime; no inventar disponibilidad. Antes de implementar, /goal explícito y codex:task-hook.
