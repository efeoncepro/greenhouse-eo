# TASK-1846 — Efeonce Insights: render durable y Artifact Worker multiconsumidor

## Delta 2026-09-15

- Existe el puerto `InsightOutputsPort` (`src/lib/efeonce-insights/ports.ts`, `setInsightOutputsPort`) que `issueInsightEdition` invoca antes de emitir: hoy falla cerrado (`not_ready`). El pipeline por fases vive en `commands/generation.ts` (síncrono tras el commit); snapshot sellado y plan congelado en `greenhouse_insights.insight_evidence_snapshots`/`insight_editorial_plans`. Eventos `insights.edition.created`/`insights.evidence.sealed` ya se publican. — cerrado/preparado por TASK-1845
- **Rollout 2026-09-15 (TASK-1845):** el puerto de outputs y el pipeline por fases ya corren **en producción** con `INSIGHTS_GENERATION_ENABLED=true` en staging y producción (emisión e IA OFF); ediciones `EO-INS-000012/13` (staging) y `EO-INS-000014` (runtime de producción) quedaron `ready_for_review` — **todas sobre la organización sandbox `Greenhouse Demo` (`org-6c09b3a7…`), ninguna con dato de cliente**; «producción» es el runtime que las generó, no la naturaleza del dato. El gateway `efeonce-mcp` 1.5.0 federa las 4 tools (47 tools, 8 clases de scope) y el scope `efeonce.mcp.insights.write` existe en Entra (sin cliente que lo porte ⇒ `insufficient_scope` al crear). Detalle: arquitectura §14. Al conectar `InsightOutputsPort`, esta task hereda un runtime vivo: cualquier cambio en `issue` se prueba contra ediciones ya persistidas, y `INSIGHTS_ISSUANCE_ENABLED` sigue OFF hasta que el render valide outputs. El worker debe declarar su propia lectura de los flags en el ledger (hoy sólo Vercel los lee).
- **Deuda heredada del canary:** `plan.limits` repite «ico: sin datos.» una vez por cada rechazo `no_data` del snapshot; **esta task debe deduplicar `plan.limits`** (mismo texto ⇒ una entrada) antes de que un límite llegue a un PDF. — hallazgo del canary de TASK-1845
- Desbloqueada de TASK-1845 (2026-09-15): la foundation de Efeonce Insights está en producción (release `9c094688309d`, generación ON en Vercel, gateway v1.5.0 federado, scope en Entra); TASK-1845 sigue `in-progress` sólo por dos evidencias de cierre (ensayo `migrate:down` y sesión MCP con token humano) que no condicionan este trabajo. — cerrado por rollout de TASK-1845

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
- Backend impact: `integration`
- Epic: `EPIC-045`
- Status real: `code complete, rollout pendiente (2026-09-16). Motor conectado por las dos puntas: requestInsightRender + InsightOutputsPort real; lanes app/ecosystem y 4 tools MCP; benchmark local ejecutado. Falta: deploy del worker, flag ON en Vercel y Cloud Run, canary, federacion en efeonce-mcp; report_pdf/web dependen de 1847/1848.`
- Rank: `TBD`
- Domain: `platform|ops|data`
- Blocked by: `none`
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

## Discovery Findings — 2026-09-15

Auditoría read-only sobre el runtime real. Cada ítem cita dónde se verificó.

### 1. No existe lease ni fencing — y esta task introduce el riesgo que su acceptance describe

`claimNextRenderJobForExecution` (`render-jobs.ts:674`) hace un claim atómico con `FOR UPDATE SKIP LOCKED` +
`state='running'` + evento. Es correcto contra claims concurrentes. Pero **no hay `lease_expires_at`, ni fencing
token, ni heartbeat** en el store ni en la migración (grep sobre `lease|fencing|fence_token|heartbeat`: cero
coincidencias), y `markRenderJobCompleted` (`render-jobs.ts:541`) sólo valida `expectFromStates: ['running']`
— no comprueba que quien finaliza siga siendo el dueño del claim.

Consecuencia hoy: **no hay doble ejecución** (nada re-reclama), pero un worker que muere con el job en `running`
lo deja colgado para siempre. `listExpiredQueuedRenderJobs` (`render-jobs.ts:720`) sólo cubre `queued` con
deadline vencido, nunca `running` estancado. Es una brecha latente de Proposal, no de Insights.

Consecuencia de diseño: el criterio *"dos workers y un lease vencido no crean dos outputs finales; fencing impide
finalización vieja"* describe un hazard que **aparece cuando esta task agrega reclamo por lease** — hoy no puede
ocurrir porque nada re-reclama. El Scope ya agrupa "claim/lease/fencing" en el Slice 2, y esta auditoría confirma
que esa agrupación es **load-bearing, no estilística**: separar el lease del fencing durante la implementación
abriría una ventana de doble finalización que hoy no existe. No dividir ese ítem del Slice 2.

### 2. El worker es un Cloud Run Job, no un servicio

`services/artifact-worker/main.ts` — una ejecución = un artefacto (`tasks=1`, `parallelism=1`, `max-retries=0`);
el retry es del dominio, no de Cloud Run. El dispatcher sólo hace `jobs.run` sin overrides (evita el permiso
`run.jobs.runWithOverrides`) y el worker elige por claim. Cualquier diseño de cola para Insights hereda esa forma.

### 3. Puntos de acoplamiento a Proposal, enumerados

En `main.ts`: import de `attachProposalAsset`; import del store completo `proposals/render-jobs`;
`ownerAggregateType: 'proposal_deliverable'` y `ownerAggregateId: job.proposalId`; `captureWithDomain(…, 'commercial', …)`;
`isArtifactRenderJobsEnabled()` como flag único; `CATALOGS` con un solo catálogo. Son seis costuras, todas
reemplazables por un registry de consumers tipado — no hay lógica de negocio Proposal dentro del render.

### 4. Lo que ya está resuelto y no hay que reinventar

State machine (`queued|dispatched|running|completed|failed|dead_letter`), taxonomía de `RenderJobFailureCode`,
dead-letter por intentos agotados o fallo no reintentable, prioridad por deadline con aging, tabla de eventos
append-only, drift check byte a byte del manifest. El Slice 1 es generalización, no diseño nuevo.

### 5. Decisiones abiertas para el checkpoint

- **Alcance del lease/fencing**: ¿sólo Insights, o se corrige también Proposal? Corregir ambos cierra una brecha
  real pero amplía el blast radius de una task que declara "preservar Proposal".
- **`plan.limits` duplicado**: el dedupe está asignado acá (arquitectura §14.3); confirmar si entra como slice
  propio o como parte del Slice 1.

## Design Decision — alcance del lease/fencing (2026-09-16)

Decidido con `arch-architect` (4 pilares + reversibilidad×blast radius) y `efeonce-insights`.
Delegado por el operador; queda registrado acá porque cambia el orden de los slices.

**Decisión: opción B — mecanismo compartido, additive, con el reclaim de Proposal APAGADO tras flag.**

Rechazadas: (A) sólo Insights — deja dos semánticas de recuperación sobre el mismo motor "generalizado" y
conserva en Proposal el job que queda colgado en `running` para siempre; (C) arreglar Proposal activamente en
esta task — contradice su acceptance y no tiene presupuesto de regresión acá.

### Cómo se reconcilia con "keep Proposal untouched"

El hand-off de 1845 y el routing de la skill dicen *keep Proposal untouched in the Artifact Worker*. Se cumple:
lo intocado es el **comportamiento** (Proposal no reclama, no vence lease, no cambia su máquina de estados ni
sus outputs). El **código** sí pasa a ser compartido, que es lo que la propia task autoriza en `Files owned`
(«`render-jobs.ts` (adapter compatible, sin cambiar negocio Proposal)»). Sin esa lectura, "untouched" y
"adapter compatible" se contradicen.

### Cuadrante (reversibilidad × blast radius)

Columnas nullable additive sobre una tabla con evidencia emitida, en la instancia única que sirve producción:
**two-way door × blast radius medio ⇒ MOVE WITH CARE** — rollout escalonado, flag y plan de reversibilidad.
Eso es exactamente la opción B; no es una preferencia de estilo, es el cuadrante.

### Consecuencia dura sobre el orden

`lease` y `fencing` entran **en el mismo slice (2)**, nunca separados: el lease habilita el reclamo y el reclamo
abre la ventana de doble finalización que hoy no existe. El Scope ya los agrupaba; esta decisión lo confirma y
prohíbe dividirlos.

### 4 pilares

- **Safety** — el fence token es el gate: finalizar exige `WHERE fence_token = <el mío>`; un worker viejo pierde
  sin efecto. Blast radius si falla: una edición con dos PDFs finales, contenida por org. Riesgo residual
  aceptado: un worker particionado puede subir bytes al asset store antes de perder el fence; esos assets quedan
  huérfanos y los limpia la reconciliación del Slice 3, no el fencing.
- **Robustness** — claim atómico ya existente (`FOR UPDATE SKIP LOCKED`) + `fence_token` monotónico + CHECK de
  transición; finalización idempotente por `(run, output_target)`. Se prueban dos workers concurrentes y un lease
  vencido, no sólo el happy path.
- **Resilience** — dead letter ya existe por intentos agotados; falta el huérfano en `running`, que es el hueco
  real de hoy. Señal nueva `insights_render_orphaned` (steady=0) y reconciliación idempotente.
- **Scalability** — el claim es O(log n) con índice por `(state, deadline, created_at)`; la cuota por org y el
  fairness con Proposal entran en el Slice 3 para que una org no monopolice el Job.

### Trampa de deploy que hereda esta task

`services/artifact-worker/deploy.sh` usa `--set-env-vars`, que es **destructivo**, y
`deploy-contract.test.ts:53` ya lo custodia para `ARTIFACT_RENDER_JOBS_ENABLED`. `INSIGHTS_RENDER_ENABLED` debe
declararse en `deploy.sh` **y** sumarse a ese test en el mismo slice; si sólo se aplica en vivo con
`--update-env-vars`, el próximo deploy lo borra en silencio. No es hipotético: le pasó a
`GROWTH_EBOOK_EMAIL_DELIVERY_ENABLED` (revisión 00473).

### Decisión menor cerrada

El dedupe de `plan.limits` va en el **renderer**, no en el planner: los planes se congelan e inmutabilizan y su
contenido alimenta el `issued_hash`, así que arreglar en el planner no limpia los ya congelados y sí cambia el
hash para entradas idénticas. Entra en el Slice 1. Que el planner emita duplicados
([`deterministic-planner.ts:145`](../../../src/lib/efeonce-insights/editorial/deterministic-planner.ts)) queda
como apunte para el dueño del planner, fuera de esta task.

### Decisiones de la segunda pasada (2026-09-16)

- **Mapper V1 en el dominio, no en el catálogo:** `render/deck-mapper.ts` traduce el plan congelado a láminas
  `deck-axis` con el vocabulario que existe; TASK-1847 lo reemplaza por catálogos propios. Sin él, el puerto de
  outputs no podía conectarse de verdad y `issue` seguía bloqueado por una razón falsa.
- **No se emite `CoverFull`:** su `proposalKind` imprime «Propuesta Técnica»/«Capacitación HubSpot» en un informe.
- **El hash del manifest es del composer** (`manifest-hash.ts`, domain-free; `render-jobs.ts` re-exporta): con dos
  consumers tiene que ser UNA función o el drift check del worker daría falsos positivos.
- **`INSIGHTS_RENDER_ENABLED` se lee en dos runtimes** (Vercel para encolar, worker para reclamar); el ledger lo dice.
- **`src/lib/efeonce-insights/render/`** y no `src/lib/insights/` (propuesto en la spec): el dominio real ya vive ahí.

### Deliberadamente NO decidido

Cuándo se prende el reclaim de Proposal. Esta task deja el mecanismo y el flag apagado; encenderlo es una
decisión con su propia evidencia de regresión y no se toma acá.

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

- [~] **Parcial** — `requestInsightRender`/retry/cancel revalidan los tres planos + audiencia (un cliente no encarga outputs de un draft interno: 404 anti-oracle; test `render/commands.test.ts`). La reutilización de outputs es por `(org, edición, target, audiencia)`: un job cliente nunca reutiliza bytes de un draft interno (UNIQUE + `findInsightOutputsForEdition` por audiencia, live test). **No verificado en runtime real** (worker sin desplegar). — Autogestión cliente y gestión interna de arquitectura §7.1 revalidan autoridad al ejecutar; reutilización/idempotencia de outputs conserva audiencia y proyección. Un job cliente nunca reutiliza bytes de un draft interno aunque coincidan org y período (integración EPIC-046).
- [x] Insights produce assets ligados a edición/org, nunca a Proposal ni proposal_deliverable; Proposal existente conserva sus jobs/outputs sin pérdida. — contexto `insight_output` colgando de `edition_id` (`consumers/insights.ts`); Proposal delega en sus mismos commands y sus 11 tests de contrato siguen verdes; `pnpm test` completo de un peer con estos cambios: 14164 verdes.
- [x] Worker no consulta ni calcula métricas; verifica manifest, catálogos, fuentes y assets fijados y rechaza manifest_drift. — el drift check byte a byte quedó intacto en `main.ts`; el consumer sólo persiste bytes. Un `report_pdf` con catálogo no empaquetado falla honesto como `manifest_drift`.
- [~] **Parcial** — fencing PROBADO contra PG real (`render.live.test.ts`): A reclama fence 1, vence el lease, B reclama fence 2, la finalización de A se rechaza sin escribir, B finaliza; un solo output final. **El crash tras upload se DETECTA** (señal `insights.render.orphaned_output`) pero **no se reconcilia solo**: las filas sin lease requieren decisión humana a propósito, porque reclamarlas podría producir dos finalizaciones. Los assets subidos por un worker que perdió el fence quedan huérfanos en el store (riesgo residual declarado en la decisión).
- [x] Fallar report_pdf conserva deck_pdf exitoso; retry no duplica; cancelación impide iniciar trabajo restante y tiene estado terminal honesto. — probado contra PG real: el retry re-encola sólo el fallido reusando su fila (una sola fila por target), el completado no se toca, y la cancelación deja `stillRunning` sin mentir y no declara el run cancelado mientras algo corra.
- [~] **Parcial** — cuota por organización en el claim, dead letter, señal de huérfanos steady 0. Benchmark LOCAL del Slice 4 ejecutado (abajo); **queue age y retry budget en Cloud Run NO medidos** (worker sin desplegar). Límite efectivo propuesto: `maxPdfMb` 20 se sostiene (25 láminas = 12,6 MB); cuota por org = 2 hasta medir en Cloud Run.
- [~] **Parcial** — `deck_pdf` se contabiliza por edición vía el Composer con manifest sellado y drift check; **`report_pdf` y `web` se rechazan al encargar** (`render_rejected`, nunca se encolan): el catálogo A4 es TASK-1847 y el modelo web es TASK-1848.
- [x] API/MCP request/get/retry/cancel pasan policy, idempotencia y error parity; no esperan la generación en request-response. — lanes app + ecosystem (`…/editions/{id}/render`, `…/render-runs/{id}[/retry|/cancel]`), misma tabla de errores + `render_disabled`/`render_rejected`; 4 tools MCP (manifiesto 55, `mcp:manifest:check` al día); 202 al encolar / 200 idempotente; tests de paridad en `insights-lanes.test.ts`. **Federación en `efeonce-mcp` pendiente** (autorización).
- [~] **Parcial (LOCAL, no Cloud Run)** — matriz ejecutada el 2026-09-16 con el catálogo real vía `pnpm deck:compose` (plan SKY recortado), secuencial, `/usr/bin/time -l`: **15 láminas** 4,44–4,72 s, RSS máx 300–328 MB, PDF 5,4 MB; **25 láminas** 7,07–7,42 s, RSS máx 355–365 MB, PDF 12,6 MB; **ráfaga 5×15** back-to-back 23,3 s totales (4,58–4,72 s cada una, sin degradación). Páginas A4 10/30: **no medible** (el catálogo A4 no existe, TASK-1847). Competencia de cola con Proposal y budgets de Cloud Run: **no medidos** (worker sin desplegar; el Job es `parallelism=1`).
- [ ] **NO ejecutado** — exige autorización explícita del operador para desplegar el worker, prender `INSIGHTS_RENDER_ENABLED` en **dos runtimes** (Vercel + artifact-worker) y correr canary. Sin eso el estado honesto es `code complete, rollout pendiente`.

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
- [ ] Actualizar la skill viva `efeonce-insights` (`references/program-ledger.md`, `architecture-map.md`, `contracts.md`, `operations.md`, `lessons.md`) y espejar a `.codex/` con `pnpm skills:mirrors` verde — contrato de EPIC-045; sin esto la task no pasa a complete.

## Follow-ups

PPTX/DOCX y gráficos adicionales se evalúan por demanda; no crear tasks preventivas. Los gaps dentro de esta
unidad se resuelven en sus slices. TASK-1672/1673 conservan la integración especializada SEO.

## Open Questions

Sin preguntas que bloqueen el registro. Confirmar límites, rutas y mapping propuestos en Discovery contra
código/runtime; no inventar disponibilidad. Antes de implementar, /goal explícito y codex:task-hook.

## Nota operativa — ensayo de rollback de TASK-1845 (2026-09-16 00:24–00:25Z)

`greenhouse-eo-96` ejecutó el ensayo `migrate:down` + `migrate:up` de la migración de 1845 sobre la instancia
compartida `efeonce-group:us-east4:greenhouse-pg-dev`, con autorización explícita del operador en su sesión.
Verificado por esta sesión después del hecho: schema recreado con sus 7 tablas; **una sola** asignación de
`insights_v1`, hacia `org-6c09b3a7-cbab-48a9-869e-61d03d1c6291` (`Greenhouse Demo`, sandbox) — ninguna
organización real tenía el módulo, así que la ventana sin schema no pudo romper una generación de cliente.
La secuencia de códigos volvió a `EO-INS-000001`.

Límite honesto: el contenido previo al `down` ya no es verificable de forma independiente; lo comprobado es el
estado posterior y la asignación única, esta última corroborada también por la salida que el operador pegó antes
del ensayo. Para 1846 importa una cosa: **`greenhouse-pg-dev` sirve producción pese al nombre** (CLAUDE.md,
ISSUE-161), así que cualquier `down` de las migraciones de esta task es destructivo sobre producción y necesita
la misma autorización explícita.
