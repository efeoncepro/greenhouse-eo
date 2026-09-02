# TASK-1805 — Growth SEO: foundation versionada para DataForSEO Improved ETV

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-022`
- Status real: `code complete, rollout pendiente (2026-09-02): Slices 0-6 implementados y verificados contra PG real; expand aplicado; contract parqueado; falta release con Slices 4-6, selector explícito en Vercel y readback cross-runtime`
- Rank: `1`
- Domain: `growth|seo|data|integration`
- External deadline: `2026-11-01T00:00:00Z; legacy deja de estar disponible como opt-out`
- Internal target: `foundation legacy-ready by 2026-10-15`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Versiona la metodología detrás de ETV en los siete caminos que hoy consumen ETV y gobierna las 14 familias de
endpoint confirmadas por DataForSEO. Permite coexistencia legacy/improved y evita que readers, API o MCP mezclen
fórmulas en una trayectoria. Entrega la foundation
expand-contract, la policy explícita, el evaluador interno seguro y la observabilidad cross-runtime manteniendo
legacy como selección productiva. `TASK-1806` ejecuta después el shadow, la decisión histórica y el cutover.

La task está registrada para ejecución futura. Su creación no autoriza código, migraciones, llamadas pagadas,
flags, schedulers, deploy ni cutover.

## Why This Task Exists

DataForSEO cambia el cálculo bajo el mismo campo `etv`. Greenhouse hoy omite `use_improved_etv`, guarda valores
sin versión y usa claves que impiden dos metodologías en un mismo día. El cambio puede pasar parsing y tests
mientras convierte una revisión del modelo en una aparente variación de performance SEO.

`TASK-1775`, `TASK-1776` y `TASK-1709` están completas y poseen sus capacidades originales. Reabrirlas repartiría
una transición transversal entre tres lifecycles cerrados. `TASK-1805` es la unidad dueña de policy, identidad
metodológica y compatibilidad de todos esos consumers. `TASK-1806` es la unidad dependiente de evaluación y
activación, porque gasto, tratamiento histórico y cutover requieren autorizaciones y evidencia distintas.

## Goal

- Hacer imposible que una escritura ETV productiva dependa del default del proveedor.
- Persistir y servir ETV con metodología explícita, sin mezclar series ni perder append-only.
- Entregar un evaluador interno reproducible, con fixtures/replay y dry-run, sin ejecutar gasto.
- Dejar `TASK-1806` desbloqueada para medir y activar Improved ETV sin reabrir esta foundation.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_SEO_SEARCH_VISIBILITY_360_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_DATAFORSEO_ETV_METHOD_VERSIONING_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_MCP_ARCHITECTURE_V1.md`
- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`

Reglas obligatorias:

- Metodología es parte de la identidad del hecho; `lens=estimated` no la sustituye.
- Nuevas escrituras nunca dependen de `provider_default` ni infieren método por fecha.
- El transporte DataForSEO permanece genérico; la policy es endpoint-aware y fail-closed.
- Expand se verifica antes de writers; writers antes de contract; shadow después de coexistencia real.
- Un reader sirve una metodología o falla/degrada con etiqueta; nunca construye una serie mixta.
- GSC es benchmark first-party separado; no se promedia con ETV.
- Todo gasto requiere forecast, tope USD y aprobación humana explícita.
- DataForSEO no devuelve la versión aplicada: código, config y deploy no son evidencia del método efectivo.
- Desde 2026-11-01T00:00:00Z, una configuración legacy falla antes de llamar al proveedor; `false` no es rollback.

## Normative Docs

- `docs/audits/seo/2026-09-01-dataforseo-improved-etv-impact.md`
- `docs/audits/communications/2026-09-01-dataforseo-improved-etv-provider-questions.md`
- `docs/manual-de-uso/growth/evaluar-transicion-dataforseo-improved-etv.md`
- `.codex/skills/dataforseo-operator/SKILL.md`
- `.claude/skills/dataforseo-operator/references/02-labs.md`
- `.claude/skills/dataforseo-operator/references/07-contrato-greenhouse.md`
- `.codex/skills/seo-aeo/SKILL.md`
- `.codex/skills/seo-aeo/modules/07_MEASUREMENT.md`

## Dependencies & Impact

### Depends on

- Respuesta contractual de DataForSEO para `use_improved_etv` — recibida el 2026-09-02.
- `TASK-1775`, `TASK-1776`, `TASK-1709`, `TASK-1780` y `TASK-1785` completas como foundations.
- `greenhouse_growth.seo_domain_overview_snapshots`.
- `greenhouse_growth.seo_url_visibility_snapshots`.
- `greenhouse_growth.seo_prospect_diagnostics` y sus facts.
- `src/lib/ai/dataforseo.ts` como transporte neutral.

### Blocks / Impacts

- `TASK-1806` — evaluación, decisión histórica y cutover productivo de Improved ETV.
- `TASK-1808` — categorías por dominio y mercado temático.
- `TASK-1809` — competidores SERP y share of voice por set de keywords.
- `TASK-1810` — intersección competitiva entre páginas.
- `TASK-1811` — benchmarking histórico masivo de tráfico.
- Continuidad de las series ETV después del 2026-11-01.
- Fotos/trayectoria de dominio, bulk/historical, visibilidad URL, relevant pages, subdomains y prospect diagnostic.
- Readers Growth SEO, API ecosystem/app, Nexa y MCP.
- Schedulers mensuales, ops-worker, Vercel y Platform Health.

### Files owned

- `src/lib/growth/seo/etv-methodology/**` o placement final aprobado en Plan Mode.
- `src/lib/growth/seo/domain-overview/**`
- `src/lib/growth/seo/url-visibility/**`
- `src/lib/growth/seo/prospect/**`
- `src/lib/growth/seo/lens.ts`
- `src/lib/api-platform/resources/ecosystem-growth-seo.ts`
- `src/mcp/greenhouse/tool-manifest.ts`
- `src/mcp/greenhouse/tool-manifest.generated.json`
- `src/mcp/greenhouse/server.ts`
- `src/mcp/greenhouse/tools.ts`
- `services/ops-worker/server.ts`
- `src/types/db.d.ts` sólo mediante generación canónica.
- `migrations/*_task-1805-*.sql`
- `docs/architecture/GREENHOUSE_DATAFORSEO_ETV_METHOD_VERSIONING_DECISION_V1.md`
- `docs/manual-de-uso/growth/evaluar-transicion-dataforseo-improved-etv.md`
- `docs/audits/seo/*improved-etv*`

## Current Repo State

### Already exists

- Transporte DataForSEO con allowlist/breaker/spend ledger por familia.
- Snapshots append-only de dominio y visibilidad, más diagnóstico de prospecto.
- Nueve familias Labs con caller: seis familias/siete caminos consumen ETV y tres lo ignoran explícitamente.
- Readers y proyecciones API/MCP con `lens`, source y captura, pero sin metodología.
- GSC per-org para benchmark de dominios propios.

### Gap

- No hay policy canónica ni booleano explícito en los requests ETV.
- No hay columna, constraint, uniqueness, freshness ni provenance por metodología.
- Readers pueden mezclar valores o elegir la fila incorrecta si se agrega shadow sin rediseño.
- Relevant pages/subdomains pueden cambiar membresía top-N sin que el contrato lo explique.
- Prospectos guardan `basis: etv_sum_organic`, pero no metodología ni cobertura/truncamiento suficiente.
- No hay señal cross-runtime ni runbook de cutover implementado.
- Cinco familias ETV-capable confirmadas no tienen caller: `categories_for_domain`,
  `domain_metrics_by_categories`, `serp_competitors`, `page_intersection` y
  `historical_bulk_traffic_estimation`. Permanecen `provider_supported_not_enabled` hasta que
  `TASK-1808`–`TASK-1811` habiliten únicamente su familia con consumer, costo y rollout propios.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/growth/seo/**` compartido por Next/Vercel y ops-worker, con API/MCP como consumers.
- Future candidate home: `domain-package`
- Boundary: resolver `EtvMethodologyVersion` y readers del dominio `growth.seo`; sólo adapters DataForSEO
  ETV-capable pueden solicitar método;
  UI/API/MCP consumen provenance y nunca eligen qué fórmula comprar.
- Server/browser split: provider, DB, policy y configuración son server-only; el browser recibe DTO etiquetado.
- Build impact: sin SDK nuevo; ops-worker y Vercel deben compilar el mismo contrato puro.
- Extraction blocker: schema PostgreSQL compartido, spend ledger, schedules y verificación de provider cross-runtime.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: policy ETV, snapshots/facts de `greenhouse_growth`, readers SEO y contrato DataForSEO Labs.
- Consumidores afectados: `API|MCP|Nexa|cron|worker|Vercel|reporting`
- Runtime target: `local|staging|production|worker|cron|external`

### Contract surface

- Contrato existente a respetar: `src/lib/ai/dataforseo.ts`, arquitectura SEO, schemas TASK-1775/1776/1709 y
  MCP manifest canónico.
- Contrato nuevo o modificado: `EtvMethodologyVersion`, resolver endpoint-aware, columnas/constraints, readers y
  DTO provenance formula-aware.
- Backward compatibility: `gated`; legacy permanece seleccionable y el read default no cambia durante expand.
- Full API parity: un reader/projection canónico sirve metodología a API, Nexa y MCP; compare interno es read-only
  y no dispara provider calls.

### Data model and invariants

- Entidades/tablas/views afectadas: `seo_domain_overview_snapshots`, `seo_url_visibility_snapshots`,
  `seo_prospect_diagnostics`/facts y tipos derivados.
- Invariantes que no se pueden romper:
  - append-only continúa rechazando `UPDATE` y `DELETE`;
  - mismo sujeto/mercado/fecha admite dos métodos y rechaza duplicado del mismo método;
  - source endpoint no entra a la identidad si ya existe colisión intencional entre productores del mismo método;
  - metodología del `top_keywords` es la del snapshot padre;
  - idempotencia comercial de prospecto sigue siendo una corrida por sujeto/día.
- Write-target allowlist: declarar cualquier tabla experimental nueva en el boundary del dominio, con razón; si se
  amplían tablas existentes, mantener la cobertura vigente.
- Tenant/space boundary: organization/target se resuelve por readers/entitlements vigentes; metodología no cambia
  autorización ni expone `captured_by_organization_id`.
- Idempotency/concurrency: claves incluyen método donde coexistir es válido; prospecto conserva su lock diario y
  shadow corre en evaluator interno separado.
- Audit/outbox/history: snapshots/facts append-only + señal de configured/requested/provider-effective; sin outbox nuevo salvo
  que Plan Mode demuestre un consumer reactivo real.

### Migration, backfill and rollout

- Migration posture: `additive expand -> writer/read transition -> contract`.
- Default state: selector legacy explícito, shadow y improved productivo deshabilitados.
- Backfill plan: sólo atribuir legacy cuando la evidencia lo garantice. Si ya existe ventana ambigua, usar estado
  desconocido o reconstrucción desde evidencia; nunca inferir por `capture_date`.
- Rollback path: selector a legacy sólo antes del 2026-11-01T00:00:00Z. Después, pausar capturas y servir la última
  serie comparable etiquetada; nunca presentar `false` como rollback ni borrar filas improved.
- External coordination: respuesta DataForSEO y configuración coherente Vercel/worker. El presupuesto de shadow,
  la pausa/reanudación de schedulers y la aprobación de cutover pertenecen a `TASK-1806`.

### Security and access

- Auth/access gate: gates/entitlements SEO vigentes; compare y shadow sólo operador interno.
- Sensitive data posture: sin PII nueva; subjects y GSC permanecen bajo scopes existentes.
- Error contract: `unsupported_etv_methodology`, `methodology_not_available`, `mixed_etv_methodology`,
  `etv_methodology_drift`; sanitizados mediante el patrón de error de dominio.
- Abuse/rate-limit posture: spend gate existente, allowlist de subjects, máximo de requests, dry-run obligatorio y
  circuit breaker de familia Labs.

### Runtime evidence

- Local checks: Vitest dirigidos para policy/builders/parsers/readers/prospect/lens y fixtures en las dos fórmulas.
- DB/runtime checks: migración y sanity PG mediante tooling canónico; old rows, coexistencia, duplicate rejection,
  append-only y freshness por método.
- Integration checks: Sandbox gratuito cuando el contrato lo permita, fixtures/replay y dry-run; ninguna llamada
  pagada ni canary productivo pertenece a esta task.
- Reliability signals/logs: `configured`, `requested`, `provider_effective`, `requested_at`, `policy_version`, filas
  sin método, mixed-series, drift cross-runtime, solicitud legacy posterior al corte y costo por consumer/familia.
- Production verification sequence: expand staging -> deploy legacy explícito -> readers formula-aware -> readback
  DB/API/MCP y configured/requested/provider-effective -> handoff verificable a `TASK-1806` sin cambiar el canonical method.

### Acceptance criteria additions

- [x] Source of truth, contract surface and consumers are named with real paths or objects. — `src/lib/growth/seo/etv-methodology/**`, tres tablas `greenhouse_growth`, readers/lane/MCP nombrados en el ADR §Runtime Contract.
- [x] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit. — CHECKs cerrados + consistencia evidencia↔request + UNIQUE formula-aware + guard de corte (migración `20260902221432772`); sanity 17/17 con rollback.
- [x] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio. — cero tablas nuevas: se amplían las tres existentes; el dominio no tiene allowlist de tablas (sólo familias + GRANTs), declarado en el audit de esta task.
- [x] Migration/backfill/rollback posture is explicit and proportional to risk. — expand aplicado (compatible con código viejo por DEFAULT transitorio + evidencia contractual), contract en `docs/tasks/pending-migrations/` con condición de release (ISSUE-161), Down documentado.
- [x] Runtime or DB evidence is listed for any change beyond docs/tooling. — `_sanity-task-1805-etv-schema.ts` 17/17, sanity 1775/1776 (writers+frescura+readers) verdes, readers contra PG real (berel MX legacy servido / improved → `not_available_for_method`), señal `awaiting_data`, evaluador 8/8 con ledger intacto.
- [x] Errores son canónicos y el evaluador no debilita presupuesto, entitlements ni datos sensibles. — `EtvMethodologyPolicyError` (6 códigos), `seo_etv_methodology_rejected` canónico es-CL; el evaluador es puro (sin camino al proveedor) y fail-closed por gate/allowlist/caps.

## Capability Definition of Done — Full API Parity gate

- [x] La policy y selección viven en primitives server-side, no en UI ni callsites duplicados. — `buildEtvMethodologyRequest` único; los siete callers sólo lo invocan.
- [x] Readers/projections exponen método a API, Nexa y MCP desde un solo contrato. — `etvMethodology` nace en los readers; lane y tools son passthrough.
- [x] Compare es lectura de evidencia persistida; no es un parámetro público que dispara gasto. — `etvMethodology` como input opcional del reader (compare interno); ningún lane/tool lo acepta.
- [x] MCP manifest source/generated y gateway consumidor quedan sincronizados cuando cambie el output. — manifest `8969c8d39c1f` regenerado + `efeonce-mcp` `58517f0` (commit local; deploy del gateway post-release).
- [x] Parity check = SÍ: toda superficie devuelve metodología desde el mismo reader.

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

### Slice 0 — Contrato oficial y baseline congelado

- Incorporar la respuesta oficial a la matriz endpoint/campo/boolean/default/precio/histórico.
- Resolver si filas recientes son atribuibles a legacy; declarar cualquier ventana ambigua.
- Definir la matriz de 14 familias: seis `etv_consumed`, tres `etv_ignored` y cinco
  `provider_supported_not_enabled`; no ejecutar llamadas pagadas.
- Definir cómo preservar un baseline legacy representativo antes del corte; su captura pertenece a `TASK-1806`.

### Slice 1 — Policy y configuración sin activar

- Crear enum/resolver endpoint-aware con legacy explícito y fail-closed.
- Garantizar que endpoints no ETV no reciben el flag y que transporte genérico no cambia.
- Cablear lectura idéntica en Vercel/worker y dry-run, manteniendo improved deshabilitado.

### Slice 2 — Expand de schema y provenance

- Agregar identidad metodológica, constraints/indexes y convivencia por método.
- Clasificar filas existentes sólo con evidencia segura; conservar unknown donde corresponda.
- Regenerar tipos de DB y verificar append-only/idempotencia.

### Slice 3 — Writers y freshness

- Propagar método solicitado/efectivo por domain, historical, bulk, URL, relevant pages, subdomains y prospect.
- Hacer freshness/pre-check/idempotency formula-aware sin duplicar diagnósticos comerciales.
- Declarar metodología de traffic cost, top keywords y truncamiento del prospecto.

### Slice 4 — Readers, API y MCP

- Filtrar por método antes de fecha/source/dedupe/orden y rechazar mixed-series.
- Servir provenance, available methodologies y breakpoint por el contrato canónico.
- Sincronizar MCP manifest/descripciones y consumidor gateway sin permitir selección pagada desde el caller.

### Slice 5 — Señales y contract phase

- Exponer drift Vercel/worker y configured/requested/provider-effective en health/logs.
- Quitar defaults transitorios y constraints antiguas sólo cuando todos los writers/readers estén verificados.
- Mantener selector productivo en legacy explícito.

### Slice 6 — Evaluador seguro y handoff

- Entregar fixtures/replay, dry-run, forecast y allowlist del evaluador sin llamadas pagadas.
- Producir outputs comparables por método para GSC, top-N, traffic cost, prospecto, latencia y costo por celda.
- Verificar que `TASK-1806` puede ejecutar el shadow sin modificar readers, schema ni selección canónica.

## Out of Scope

- Implementación durante la creación de esta task.
- Enviar el correo al proveedor sin autorización explícita de envío.
- Llamadas Sandbox/live o gasto sin monto máximo aprobado.
- Ejecutar el shadow pagado, decidir rebaseline/breakpoint o activar Improved ETV; pertenece a `TASK-1806`.
- Cambiar `clickstream_etv` por `etv`, combinar ambos o construir una fórmula propia.
- Reabrir `TASK-1775`, `TASK-1776`, `TASK-1709`, `TASK-1300` o `TASK-1785`.
- UI nueva; una representación visual futura requiere task `ui-ux` separada si no cabe como copy aditivo.
- Backfill histórico completo o recompra de historia.

## Detailed Spec

Vocabulario canónico y forma exacta del expand-contract están en el ADR. La traducción del adapter entre versión
interna y booleano queda definida por el contrato: `false` selecciona legacy sólo antes del corte y se ignora
después. Plan Mode debe inventariar constraints por nombre, rechazar legacy post-corte antes del request y confirmar
si el default transitorio permite atribuir filas existentes sin violar append-only.

Para prospectos, la metodología pertenece al diagnóstico/fact derivado, pero la idempotencia humana diaria no se
amplía. El shadow del prospecto usa evaluator interno y nunca crea una segunda corrida comercial.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 0 -> 1 -> 2 -> 3 -> 4 -> 5 -> 6.
- Slice 2 MUST ship before cualquier writer improved.
- Readers formula-aware MUST ship before retirar uniqueness legacy y antes de shadow persistido.
- Contract phase MUST wait hasta que Vercel y worker escriban método explícito.
- `TASK-1806` MUST wait hasta que Slice 6 cierre y esta foundation tenga evidencia DB/API/MCP cross-runtime.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Default del provider cambia en silencio | integration/data | high | booleano explícito + effective derivado | `etv_methodology_drift` |
| Filas recientes se etiquetan legacy sin certeza | migration | medium | evidencia por request/captured_at o unknown | filas en ventana ambigua |
| Dos métodos colisionan | PostgreSQL | high | unique formula-aware antes de shadow | duplicate/conflict |
| Reader mezcla meses | reader/API/MCP | high | filtro previo + mixed-series fail | `mixed_etv_methodology` |
| Top-N cambia sin explicación | relevant pages/subdomains | high | Jaccard + membership diff | salto de membresía |
| Vercel y worker divergen | cross-runtime | medium | config/parser común + health | configured/effective mismatch |
| Evaluador podría gastar por accidente | provider spend | medium | fixture/replay + dry-run fail-closed | ledger/cap breach |
| Foundation se confunde con activación | rollout | medium | selector legacy + task dependiente explícita | effective method improved |
| Config legacy cruza el corte | external contract | high | hard-stop UTC antes del request | legacy requested post-cutoff |

### Feature flags / cutover

- Nombre propuesto para Plan Mode: `GROWTH_SEO_ETV_METHODOLOGY_VERSION`, parser cerrado y valor inicial legacy.
- El evaluador usa un gate separado, default `false`, sujeto a allowlist y presupuesto. El nombre final debe seguir
  el ledger/gate vigente y no se crea hasta Slice 1; `TASK-1806` gobierna su activación.
- Configurar una env no constituye activación ni readback; ambos runtimes deben reportar valor efectivo.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 0 | documentación solamente; corregir matriz con nueva evidencia | inmediato | sí |
| 1 | flag/config permanece legacy; revert focused changes | minutos | sí |
| 2 | no borrar columnas; revert readers/writers y mantener expand inerte | minutos | sí |
| 3 | selector a legacy y detener writers con drift | minutos | sí |
| 4 | seleccionar reader legacy explícito; conservar campos aditivos | minutos | sí |
| 5 | reponer contract compatible sólo si migration policy lo permite | variable | parcial |
| 6 | mantener evaluator OFF; conservar fixtures y foundation | inmediato | sí |

### Production verification sequence

1. Verificar contrato y precio actualizados.
2. Ejecutar tests/fixtures y dry-run de cero llamadas.
3. Aplicar expand en staging y verificar constraints/old rows/append-only.
4. Desplegar ambos runtimes aún en legacy y leer configured/requested/provider-effective con evidence basis.
5. Verificar writers/readers, DB, API y MCP con legacy.
6. Ejecutar fixtures/replay y dry-run del evaluador; verificar que el ledger no registra gasto.
7. Entregar a `TASK-1806` la matriz, el forecast y el readback de foundation todavía en legacy.

### Out-of-band coordination required

- Respuesta DataForSEO incorporada; Sandbox/OpenAPI quedan como seguimiento no bloqueante.
- Confirmación de que la foundation puede cerrarse sin autorización de gasto ni cutover.
- `TASK-1806` obtiene por separado aprobación del monto USD, sujetos, tratamiento histórico y cutover.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## MCP Tools & Skills Contract

Esta task incluye como entregable obligatorio la capa de uso por agentes; no se considera completa con el
primitive, reader, API o documentación humana solamente.

- [x] Crear o actualizar las tools MCP necesarias para operar/leer esta capacidad desde el mismo primitive
  canónico. Si una tool existente cubre el caso, actualizarla sin duplicarla; si no corresponde una tool nueva,
  declarar las tools afectadas y la razón de exclusión explícita en el gateway.
- [x] Crear o actualizar la guía de uso en las skills dueñas `.codex/skills/dataforseo-operator/**` y
  `.codex/skills/seo-aeo/**`, junto con sus espejos `.claude/**`, incluyendo selección de tool, inputs,
  interpretación, metodología/provenance, costos, límites, errores y acciones prohibidas.
- [x] Mantener las copias Codex/Claude byte-idénticas y, cuando el registro de skills servidas de `TASK-1804`
  esté disponible, crear o actualizar también el recurso/manual agent-facing que el MCP entrega bajo demanda.
  No crear una skill por endpoint si la skill de dominio vigente puede ampliarse de forma clara.
- [x] Actualizar en el mismo PR el lane ecosystem, `src/mcp/greenhouse/tool-manifest.ts`, su artefacto generado,
  schema/annotations/descripción y la federación del gateway; toda tool interna queda federada o excluida con una
  razón sustantiva, nunca simplemente ausente.
- [x] Las tools read sólo leen evidencia persistida y no disparan llamadas pagadas on-read. Toda tool que escriba,
  compre o comprometa gasto usa capability fina, presupuesto, idempotencia, audit y
  `propose → confirm → execute`; nunca se agrega un write scope al cliente PKCE público compartido.
- [ ] Verificar `pnpm mcp:manifest:generate && pnpm mcp:manifest:check`, `pnpm skills:mirrors`, paridad (manifest y mirrors verdes en local; **la paridad bidireccional del gateway y los canaries allow/deny/fault sólo se leen contra el gateway desplegado, post-release**)
  bidireccional del gateway y canaries allow/deny/fault. Registro o compilación sin readback de la lane y del
  gateway no constituye cierre operativo.


## Acceptance Criteria

- [x] Contrato oficial está reflejado como 14 familias; seis familias/siete caminos consumen ETV, tres callers lo
  ignoran y cinco familias no se habilitan preventivamente.
- [x] Las cinco familias sin caller están nombradas y cada una sólo puede pasar a `etv_consumed` por su task
  dueña (`TASK-1808`–`TASK-1811`), nunca por ampliar esta foundation transversal.
- [x] Cero request productivo ETV depende de default u omisión. — siete builders con `use_improved_etv` explícito (tests de payload real).
- [x] Endpoint no compatible/config inválida falla cerrado y no recibe el flag. — `unsupported_etv_methodology` / `invalid_etv_methodology_config`; guards en `competitor-coverage` y `prospect-collect`.
- [ ] Mismo sujeto/mercado/fecha admite ambos métodos y rechaza duplicados del mismo método. — **probado en transacción con el contract aplicado (sanity 17/17) pero la coexistencia real queda cerrada hasta aplicar el contract post-release** (UNIQUE legacy conservada a propósito para el código viejo en producción).
- [x] Filas existentes y ambiguas se clasifican con evidencia, nunca sólo por fecha. — 5+8+2 filas `legacy_static_v1` + `contract_default_pre_cutoff` (cuenta pre-2026-09-01, código sin flag, capturas pre-corte); sin ventana ambigua.
- [x] Append-only e idempotencia diaria de prospecto permanecen intactos. — trigger `block_seo_row_mutation` intacto (sanity); índice diario del prospecto sin cambios.
- [x] Freshness, backfill, source priority, concentración y readers son formula-aware.
- [x] Ningún reader/API/MCP devuelve una trayectoria mixta o fallback silencioso. — filtro SQL + `assertSingleEtvMethodology` + `not_available_for_method`.
- [x] API, Nexa y MCP exponen metodología junto con lens/source/capturedAt.
- [x] Traffic cost y prospect traffic declaran metodología; prospect también cobertura/truncamiento. — traffic cost hereda la fila; `estimated_monthly_traffic.detail` con `etvMethodologyVersion/sampleRows/rowLimit/truncated`.
- [x] AIO ETV se rotula como reparto modelado entre dominios citados, nunca tráfico observado por cita. — `AI_OVERVIEW_ETV_ATTRIBUTION` en el hecho `ai_overview_citations` (`etvSummed:false`).
- [x] `clickstream_etv` permanece carril independiente y no se activa implícitamente con improved. — `include_clickstream_data:false` conservado en el histórico; ningún parser lo consume.
- [x] Evaluador entrega fixture/replay, dry-run, forecast y allowlist sin registrar gasto. — `_sanity-task-1805-etv-evaluator.ts` 8/8, ledger antes=después.
- [ ] Vercel y ops-worker demuestran el mismo método efectivo mediante request explícito, instante UTC y policy. — **mecanismo listo (señal `seo.etv_methodology.drift` + `/health` + columnas), pero el readback real exige el release desplegado en ambos runtimes: hoy la señal reporta `awaiting_data`.**
- [x] Histórico improved distingue `fully_recomputed` desde julio de 2026 y `calibrated_approximation` antes. — `etv_historical_basis` por mes en el backfill + CHECK sólo improved.
- [x] Cero request legacy sale al proveedor desde 2026-11-01T00:00:00Z. — policy lanza antes de la request (test con el instante exacto) + guard en la base para runtimes viejos.
- [x] La selección productiva permanece legacy explícita y `TASK-1806` puede activar improved sin rediseñar la foundation. — selector cerrado + evaluador con override; sin cambios de schema previstos salvo el contract ya parqueado.
- [x] Documentación funcional/técnica/manual, task/epic/registry y handoff quedan sincronizados. — ADR §Runtime Contract, manual, skills espejadas, manuales MCP, reliability doc, ledger, epic, registry, handoff, changelog.

## Verification

- `pnpm task:lint --task TASK-1805`
- Vitest dirigido a policy, siete builders/parsers, writers, freshness, readers, prospect y lens.
- Sanity PG mediante el runner seguro: old rows, coexistencia, duplicado, append-only y mixed read.
- `pnpm db:generate-types` y diff generado revisado.
- API/ecosystem contract tests y MCP output snapshots.
- `pnpm mcp:manifest:generate && pnpm mcp:manifest:check`
- `pnpm test:live` sólo para evidencia DB autorizada y sin provider spend; confirmar `passed`, no sólo ausencia de rojo.
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`
- `pnpm docs:context-check:strict` como último gate.

## Closing Protocol

- [x] `Lifecycle` y `Status real` coinciden con código, rollout y evidencia runtime. — `in-progress` + `code complete, rollout pendiente`.
- [x] El archivo está en la carpeta de lifecycle correcta.
- [x] `docs/tasks/TASK_ID_REGISTRY.md`, `docs/tasks/README.md` y `EPIC-022` están sincronizados.
- [x] El ADR y la matriz contractual incorporan la respuesta vigente del proveedor.
- [x] Las tasks completas `1775`, `1776`, `1709`, `1780` y `1785` reciben sólo deltas históricos si cambió
  su baseline; no se reabren ni pierden ownership.
- [x] Skills `.codex`/`.claude` quedan byte-idénticas y pasan sus validators.
- [x] El consumidor del manifest MCP queda sincronizado si el contrato servido cambió. — `efeonce-mcp` commit local `58517f0`; deploy post-release.
- [x] `Handoff.md` y `changelog.md` reflejan por separado código, migration, deploy, gasto y live readback.
- [x] El cierre declara `complete`, `code complete, rollout pendiente` u `operativamente bloqueado` sin presentar
  una env, un deploy o una respuesta HTTP verde como prueba de metodología servida.

## Follow-ups

- Ejecutar `TASK-1806` para shadow, decisión histórica, cutover y rollback pre-corte/safe mode post-corte.
- Ejecutar `TASK-1808`–`TASK-1811` después de la foundation y del método productivo gobernado; cada task nace
  formula-aware y no amplía el shadow de los siete caminos actuales por defecto.
- Crear task `ui-ux` sólo si la visualización de breakpoint/metodología requiere más que copy/metadata aditiva.
- Revisar una metodología v3 sólo ante nueva fórmula o identificador oficial; no ampliar el enum preventivamente.

## Delta 2026-09-02 — ownership de las cinco familias sin caller

El operador confirmó que quiere convertir las cinco familias `provider_supported_not_enabled` en capacidades
reales. Se registran cuatro unidades backend-data: categorías (`TASK-1808`, dos endpoints cohesionados), mercado
competitivo (`TASK-1809`), comparación de páginas (`TASK-1810`) e historia bulk (`TASK-1811`). Esta task conserva
ownership exclusivo de policy/schema/readers formula-aware; no compra, habilita ni opera los productos nuevos.

## Delta 2026-09-02 (2) — foundation implementada: code complete, rollout pendiente

Seis slices en `develop` (commits `7adf5ffc7` → `9477b83e7`): policy pura + matriz de 14 familias; expand
aplicado a la instancia (contract parqueado en `docs/tasks/pending-migrations/`); siete writers explícitos;
readers/lane/MCP con `etvMethodology` y `not_available_for_method`; señal `seo.etv_methodology.drift` +
`/health` + selector en `deploy.sh`; evaluador dry-run/replay/forecast/allowlist con gate OFF. Gateway
`efeonce-mcp` sincronizado en local (`58517f0`). Slice 3 salió en el release develop→main que otra sesión llevó
el mismo día (`origin/develop = e5d7675d8`); **Slices 4–6 y estos docs están sólo en local** (sin push por el
incidente de `main` en curso).

**Rollout pendiente (bloquea `complete`):** (1) release con Slices 4–6; (2) `GROWTH_SEO_ETV_METHODOLOGY_VERSION`
y `_READ_` explícitos en Vercel `Production`+`staging` (hoy ausentes = legacy explícito por policy);
(3) readback `configured=requested=provider-effective` en ambos runtimes (`/health` del worker + señal en `ok`,
no `awaiting_data`); (4) aplicar el contract post-release con sus tres condiciones; (5) deploy del gateway +
paridad/canaries. Gate local no ejecutado: `pnpm build` de producción (cuelga el equipo; correrlo antes de mover a
`complete/`). Nada de esto autoriza gasto ni cutover: `TASK-1806`.
