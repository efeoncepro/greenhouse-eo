# Efeonce Insights — Registro de implementación y despliegue (TASK-1845)

> **Tipo de documento:** Registro de implementación y despliegue
> **Version:** 1.1
> **Creado:** 2026-09-15 por Claude
> **Ultima actualizacion:** 2026-09-18 por Claude (§8.y y filas de §10/§11: TASK-1848)
> **Documentacion tecnica:** [EFEONCE_INSIGHTS_ARCHITECTURE_V1.md](EFEONCE_INSIGHTS_ARCHITECTURE_V1.md) · ADR [EFEONCE_INSIGHTS_PLATFORM_DECISION_V1.md](EFEONCE_INSIGHTS_PLATFORM_DECISION_V1.md)
> **Task:** [TASK-1845](../tasks/in-progress/TASK-1845-efeonce-insights-domain-evidence-and-module-adapters.md) (EPIC-045)

Este documento responde dos preguntas con evidencia verificable: **cómo se construyó** la foundation de
Efeonce Insights y **qué está desplegado dónde** al 2026-09-15. Cada afirmación cita su fuente (ruta de
archivo en `greenhouse-eo` salvo que se indique otro repo, SHA de commit, o el archivo de hechos de la
sesión). Lo que no se pudo verificar en esta sesión queda marcado como «no verificado en esta sesión».
No sustituye a la arquitectura (contrato) ni al manual (operación); los complementa como registro.

---

## 1. Resumen ejecutivo

**Qué es.** Efeonce Insights convierte la evidencia de un cliente (SEO, AEO, ICO) en una **edición**
congelada y versionada para un período: un encargo (`InsightRequestV1`) produce un reporte con código
legible `EO-INS-000123`, una edición con estado, un snapshot de evidencia sellado con hash y un plan
editorial congelado con hash. Greenhouse es dueño de la biblioteca, el encargo, los permisos y el ciclo de
vida; los módulos productores siguen siendo dueños de sus métricas (`src/lib/efeonce-insights/adapters/contract.ts`,
cabecera; arquitectura §3).

**Para qué.** Que un informe a cliente nazca de hechos autorizados y trazables (unidad, población, método,
cobertura, frescura) y que ninguna cifra viva fuera de un hecho referenciado; que «ausente» nunca se
presente como cero (`contracts/evidence.ts`, `editorial/plan-validation.ts`).

**Qué está vivo hoy (2026-09-15).**

| Componente | Estado | Fuente |
|---|---|---|
| Schema `greenhouse_insights` (7 tablas, 13 triggers, 1 función generadora, 1 secuencia) | Aplicado en la única instancia Cloud SQL (dev/staging/prod comparten base) | `migrations/20260915100154428_task-1845-insights-foundation.sql`; facts file |
| Dominio `src/lib/efeonce-insights/` (5.409 líneas, 51 archivos incl. tests) | En `develop` y en `main` (release `9c094688309d`) | `find src/lib/efeonce-insights -type f \| wc -l`; PR #236 |
| 16 rutas App/Ecosystem `/api/platform/{app,ecosystem}/insights/**` | Ejecutando en staging y producción | `ca17c93da`; canaries del facts file |
| 4 tools MCP internas + skill servida `efeonce-insights` | En manifest (51 tools) | `src/mcp/greenhouse/tool-manifest.ts`; `tool-manifest.generated.json` |
| Gateway `efeonce-mcp` v1.5.0 (47 tools) con provider `greenhouse-insights` | Desplegado (rev `efeonce-mcp-gateway-00053-dsk`) | repo `efeonce-mcp` `cad57b31d`; facts file |
| Flag `INSIGHTS_GENERATION_ENABLED` | ON en staging y Production (Vercel); OFF en Preview | `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` líneas 249, 383 |
| Flags `INSIGHTS_ISSUANCE_ENABLED`, `INSIGHTS_AUTHORING_AI_ENABLED` | OFF en todos los targets | ledger líneas 250–251, 384–385 |
| Ediciones existentes | `EO-INS-000012`, `000013` (staging), `000014` (producción), todas `ready_for_review`, sobre la org sintética Greenhouse Demo | facts file; manual §Canary |

**Qué NO está vivo.** Render de outputs (deck/A4/web), emisión, IA de autoría, UI del portal, vista web
compartida, grant del scope de escritura MCP a clientes, ensayo de `migrate:down`, sesión MCP con token
humano. Detalle en §11. Estado honesto de la task: **in-progress, code complete + en producción**.

---

## 2. Cronología de construcción

Todos los commits son de `develop` en `greenhouse-eo` salvo indicación. Fechas en hora local `-03:00`
según `git log --date=iso`; los instantes de rollout van en UTC (`Z`) según el facts file.

| # | Hito | Commit / evidencia | Fecha-hora | Contenido verificado |
|---|---|---|---|---|
| 1 | Intake: TASK-1845 a `in-progress`, discovery cerrada contra checkout y PG real | `93c4ca711` | 2026-09-15 06:52 | Sólo docs: task, README, registry, Handoff. |
| 2 | **Slice 1 — contrato y persistencia** | `e6e8a5dfe` | 07:21 | Migración (692 líneas), `contracts/**`, `edition-state-machine.ts`, `errors.ts`, `request-hash.ts`, `events.ts`, `stores/**`, boundary test, catálogo de entitlements + grants, event-catalog, data source `insights.editions`, `db.d.ts`. 30 archivos, +3.072/−3. Verificación declarada: vitest focal 15, live test de stores en tx revertida, typecheck 0. |
| 3 | **Slice 2 — adapters, ventanas y plan editorial** | `a21e424fa` | 07:34 | `window.ts`, `adapters/**` (contract, registry, seo, aeo, ico, collect-evidence), `editorial/**`, `flags.ts`, `readSeoOverviewKpisForWindow` en el dueño SEO, dominio `insights` en `capture.ts`, 3 flags en el ledger. 20 archivos, +1.946/−1. Verificación declarada: vitest focal 39/39. |
| 4 | **Slice 3 — commands y paridad App/Ecosystem/MCP** | `ca17c93da` | 07:59 | `authz.ts`, `catalog.ts`, `commands/**`, `readers/**`, `ports.ts`, 16 rutas, `resources/{app,ecosystem}-insights.ts` + `insights-errors.ts`, MCP (manifest 51, server, tools, http-client), reliability (registry, incident-mapping, overview, señales). 43 archivos, +2.319/−4. Verificación declarada: vitest focal 842/842. |
| 5 | **Slice 4 — skill, docs y evidencia de cierre** | `12f985d8a` | 08:06 | Skill servida `docs/mcp/skills/efeonce-insights/SKILL.md`, skill local espejada `.claude`/`.codex`, arquitectura §14, EVENT_CATALOG, doc funcional, manual, deltas TASK-1846…1849, fix de `CLIENT_PORTAL_DATA_SOURCE_VALUES` (17 → 21). Verificación declarada: `pnpm test` completo 14.123 passed / 2 failed corregidos y re-ejecutados. |
| 6 | Decisión: vista web compartida se renderiza en `efeonce-think` | `035bb74e6` | 08:38 | Delta ADR 2026-09-15, DECISIONS_INDEX, arquitectura §3/§6/§8/§11/§14, TASK-1848/1849, EPIC-045, `docs/think`. Sin código. |
| 7 | TASK-1875 creada (render en Think) + master UI flow EPIC-045 | `61896e8f7` | 08:52 | Task + wireframe/flow/motion; siguiente ID libre TASK-1876. |
| 8 | Integración del WIP ajeno TASK-1801 (landing de contacto, Codex) | `8844a3d5c` | 17:04 | 340 archivos; `eslint --fix` para destrabar pre-push. **No es construcción de esta task**, sólo integración; viajó en el mismo release. |
| 9 | Push a `develop` + **staging**: flag ON, módulo asignado, canaries app/ecosystem, paridad del scope | `0a05c8dc8` | 17:28 | `scripts/insights/assign-insights-module.ts`, `efeonce.mcp.insights.write` en `src/lib/auth-server/oauth/scopes.ts` + snapshot del test, ledger (staging ON), task, Handoff, changelog. |
| 10 | **Federación en el gateway** `efeonce-mcp` | repo `efeonce-mcp`: PR #12 → `main` `cad57b31d`; deploy run `35027446001` (21:46Z); registro docs `c966c5c` | 21:46Z | 17 archivos, +973/−19: provider, config, tool-policy, parity, mcp.ts, surface, baseline 43 → 47 tools, versión 1.4.0 → 1.5.0, canary, 2 tests nuevos. |
| 11 | **Entra**: scope `efeonce.mcp.insights.write` creado en la app recurso «Efeonce MCP Resource» | `9e5f8a779` (docs) | 18:55 | Readback 6 → 7 scopes, cliente PKCE compartido intacto. Ejecutado por Codex (`az rest`). |
| 12 | Ledger de flags: flip en Production ligado al release | `dce8266d5` | 19:00 | 1 línea; también forzó rebuild de staging tras un merge canónico docs-only (gotcha #11). |
| 13 | **Release a producción**: PR #236 → `main` `9c094688309d345b9780b563968ecd1c5c96afd4` | `59282f845` (docs); orquestador run `35032358217` | dispatch 22:43:24Z → `released` 22:55:13Z | Manifest `9c094688309d-500ec9e7-3f22-4229-b152-e70a197ee1af`; un solo intento; dos gates Production aprobados; Vercel `greenhouse-e8i8fkqbd` READY; watchdog `ok`, 5/5 workers synced. |
| 14 | **Flag Production ON** + canary prod | `1d2797798` | ~23:10Z | `vercel env add INSIGHTS_GENERATION_ENABLED production` + `vercel redeploy` (Codex) → `greenhouse-h2030d3bz` Ready; create 202 → `EO-INS-000014`. HEAD de `develop` = `1d2797798`, pushed. |

Squash en `main`: «release: Efeonce Insights foundation (TASK-1845), landing de contacto (TASK-1801), scope
insights.write y docs (#236)» (`git log -1 9c094688309d`). Tiempo agente E2E del release: ~62 min
(`docs/operations/PRODUCTION_RELEASE_TIMING_LEDGER.md` línea 78).

---

## 3. Inventario del dominio `src/lib/efeonce-insights/`

Recorrido con `find` + lectura de cada archivo. Líneas según `wc -l` al HEAD `1d2797798`.

### 3.1 Contratos browser-safe (`contracts/`, 450 líneas)

| Archivo | Responsabilidad | Exports principales | Invariantes |
|---|---|---|---|
| `contracts/request.ts` (80) | DTO del encargo `InsightRequestV1` | `INSIGHT_REQUEST_VERSION='insight_request_v1'`, `INSIGHT_MODULES` (seo/aeo/ico), `INSIGHT_OUTPUTS` (deck_pdf/report_pdf/web), `INSIGHT_AUDIENCES`, `INSIGHT_DEPTHS`, `INSIGHT_LOCALES`, `INSIGHT_COMPARISON_KINDS`, tipos `InsightPeriodV1`, `InsightComparisonV1`, `InsightBrandV1`, `InsightPolicyV1`, guards `isInsightModule/Output/Audience` | El actor NUNCA viaja en el payload. `clientBrandRef` es referencia versionada, nunca upload libre. |
| `contracts/states.ts` (36) | Vocabularios de estado | `INSIGHT_EDITION_STATES` (8), `INSIGHT_FAILED_PHASES` (3), `INSIGHT_ACTOR_KINDS` (member/client_user/system/cli), `InsightActor` | Paridad con los CHECK de DB. |
| `contracts/evidence.ts` (127) | Ledger de hechos y snapshot | `EVIDENCE_UNITS` (9), `EVIDENCE_GRANULARITIES` (day/week/month/period), `EVIDENCE_COVERAGE_KINDS`, `EVIDENCE_OBSERVATION_KINDS` (observed/estimated), `EVIDENCE_REJECTION_REASONS` (9), `EvidenceFactV1`, `EvidenceRejectionV1`, `EvidenceSourceV1`, `EvidenceSnapshotContentV1` | Ausente ≠ cero: la ausencia es un `EvidenceRejectionV1`. |
| `contracts/chart-spec.ts` (114) | `ChartSpecV1` (contrato de DATOS del gráfico) + validación estructural | `CHART_FAMILIES` (7), `CHART_RELATIONS` (5), `validateChartSpec` | Barras nacen en 0; pie/donut una sola serie; scatter dos series pareadas; todo `factId` debe existir. La librería visual llega en TASK-1847. |
| `contracts/plan.ts` (71) | `EditorialPlanV1` | `PLAN_AUTHORING_MODES` (deterministic/ai_bounded), `PlanClaimV1`, `PlanChapterV1`, `PlanActionV1`, `PlanAuthoringProvenanceV1` | Cada cifra referencia `factIds`; `ownerRef` sólo si existe. |
| `contracts/retention.ts` (12) | Clases de retención | `INSIGHT_RETENTION_CLASSES` (3 × 1095 días) | Paridad con `insight_retention_classes`. |
| `contracts/index.ts` (10) | Barrel | re-exports | Sin DB, secretos ni providers (guard en `boundary-domain.test.ts`). |

### 3.2 Núcleo del dominio

| Archivo | Responsabilidad | Exports principales | Invariantes |
|---|---|---|---|
| `window.ts` (238) | Ventanas `[start,endExclusive)` en zona IANA | `parseCivilDate`, `civilMidnightToUtc` (dos pasadas para DST), `resolveCivilWindow`, `resolveInsightWindows`, `MAX_INSIGHT_WINDOW_DAYS=400`, `subtractCivilYear` | Detalle en §5.1. Browser-safe (sólo `Intl`). |
| `edition-state-machine.ts` (93) | Guard de aplicación, espejo exacto de la matriz DB | `INSIGHT_EDITION_TRANSITION_MATRIX`, `INSIGHT_EDITION_HUMAN_GATE_TRANSITIONS` (4), `TERMINAL_INSIGHT_EDITION_STATES=['withdrawn']`, `CLIENT_VISIBLE_EDITION_STATES`, `assertValidInsightEditionTransition`, `recoveryPhaseForTransition`, `listInsightEditionTransitions` | El test de paridad parsea la migración. |
| `errors.ts` (140) | 15 códigos tipados con status | `InsightsError` + subclases; `isInsightsError` | Tabla completa en §5.5. Nunca evidencia en el mensaje. |
| `request-hash.ts` (33) | Hash canónico | `canonicalJson` (claves ordenadas recursivo, arrays en orden, omite `undefined`), `sha256Hex`, `hashCanonical` | Usado para `request_hash`, `snapshot_hash`, `plan_hash`, `issued_hash`. |
| `flags.ts` (17) | 3 flags env | `isInsightsGenerationEnabled`, `isInsightsIssuanceEnabled`, `isInsightsAuthoringAiEnabled` | `=== 'true'`; no interpreta `NODE_ENV`. |
| `events.ts` (105) | 5 eventos outbox v1 | `publishInsightReportCreated`, `publishInsightEditionCreated`, `publishInsightEditionStateTransitioned`, `publishInsightEvidenceSealed`, `publishInsightEditionIssued` | Se publican dentro de la misma tx; payloads redactados. |
| `authz.ts` (118) | Tres planos, una puerta | `INSIGHTS_MODULE_KEY='insights_v1'`, `resolveInsightsModuleEntitlement`, `actorFromSubject`, `assertInsightsAccess`, `assertAudienceAllowed` | SQL directo a `module_assignments` (client-portal es hoja del DAG y no puede importarse). |
| `catalog.ts` (109) | Catálogo elegible por actor/org | `getInsightsCatalog` | SEO requiere `seo_v2`/`seo_v1`; AEO `ai_visibility_v1`; ICO spaces activos. `renderableOutputs: []`. |
| `ports.ts` (47) | Puertos a unidades posteriores | `InsightOutputsPort`, `getInsightOutputsPort`, `setInsightOutputsPort`, `insightSharePort={implemented:false}` | Default lanza `InsightsNotReadyError` (TASK-1846 registra la implementación). |

### 3.3 Adapters (`adapters/`, 630 líneas + tests)

| Archivo | Responsabilidad | Exports principales | Invariantes |
|---|---|---|---|
| `adapters/contract.ts` (48) | Puerto `ModuleReportAdapterV1` | `AdapterDescriptor`, `AdapterCollectInput`, `windowKey`, `factId` (`<module>.<metricId>.<start>_<end>[.<dim>]`), `evidenceWindow` | Cero componentes visuales; consume readers dueños. |
| `adapters/registry.ts` (38) | Registry lazy por módulo | `registerInsightAdapter`, `unregisterInsightAdapter`, `hasInsightAdapter`, `resolveInsightAdapter`, `listRegisteredInsightModules` | Un cuarto adapter entra sin tocar el orquestador. |
| `adapters/collect-evidence.ts` (59) | Orquestador | `collectInsightEvidence` | Adapter que lanza ⇒ rechazo `no_data` del módulo (degradación), no caída; `factId` duplicado ⇒ throw. |
| `adapters/seo-adapter.ts` (247) | SEO (GSC + rank + ETV) | `seoReportAdapter`, `SEO_ADAPTER_VERSION='seo_report_adapter_v1'` | Readers: `readSeoOverviewKpisForWindow`, `readRankEvolution`, `readDomainOverviewForTarget`, `resolveUnambiguousSeoTarget`; `isSeoModuleEnabled()` OFF ⇒ `module_disabled`. |
| `adapters/aeo-adapter.ts` (103) | AEO (grader) | `aeoReportAdapter`, `AEO_ADAPTER_VERSION` | Sólo un run con `provenance.asOfDate` dentro de la ventana; respeta `review_required`/`insufficient_data`. |
| `adapters/ico-adapter.ts` (135) | ICO (RpA/OTD por space y mes) | `icoReportAdapter`, `ICO_ADAPTER_VERSION`, `listOrganizationSpaces` | Exige meses completos; hereda supresión de RpA; OTD con numerador/denominador; nunca promedia promedios. |

### 3.4 Editorial (`editorial/`, 472 líneas + tests)

| Archivo | Responsabilidad | Exports principales | Invariantes |
|---|---|---|---|
| `editorial/format.ts` (86) | Formato determinista por unidad y locale | `formatFactValue`, `formatDeltaPercent`, `allowedNumbersForFacts`, `extractNumberTokens` | Única forma de escribir un número en el plan. |
| `editorial/deterministic-planner.ts` (149) | Plan factual sin modelo | `buildDeterministicPlan` | Claims con `factIds`, charts `bar`/`bar_grouped` con baseline 0, tablas, `limits` desde rechazos, `methodology` desde fuentes. |
| `editorial/plan-validation.ts` (71) | Plan ⊆ snapshot | `validateEditorialPlan` → `PlanViolation[]` (`unknown_fact`, `unreferenced_number`, `chart`, `empty_claim`) | Rechaza cualquier cifra no derivada de un hecho referenciado. |
| `editorial/ai-authoring.ts` (120) | IA acotada (Gemini) | `authorPlanWithBoundedAi`, `INSIGHTS_AUTHORING_PROMPT_VERSION='insights-authoring-v1'` | Cliente canónico `generateStructuredGemini`; temperatura 0; `MAX_OUTPUT_TOKENS=2048`; `MAX_REPAIRS=1`; fallback determinista. |
| `editorial/author-plan.ts` (46) | Punto de entrada | `authorEditorialPlan` | Determinista siempre; IA sólo con flag; un plan determinista inválido es bug (`evidence_rejected`). |

### 3.5 Commands, readers y stores

| Archivo | Responsabilidad | Exports principales | Invariantes |
|---|---|---|---|
| `commands/validate-request.ts` (142) | Validación del encargo sin zod | `validateInsightRequest` | Defaults y límites en §5.1. `organizationId` distinto al autorizado ⇒ `invalid_request`. |
| `commands/create-edition.ts` (152) | `createEdition` / `reviseEdition` | `createInsightEdition`, `reviseInsightEdition` | Flag → authz → validate → idempotencia → tx (report + edición + outbox) → generación tras el commit. `revise` = versión nueva; una retirada no se revisa. |
| `commands/generation.ts` (194) | Pipeline por fases | `runInsightGeneration` | Detalle en §7. |
| `commands/lifecycle.ts` (107) | `issue` / `withdraw` / `recover` | `issueInsightEdition`, `withdrawInsightEdition`, `recoverInsightEdition` | `issue`: flag + capability `issue` + `ready_for_review` + outputs validados por puerto + `issued_hash`. `withdraw` exige capability `issue`. `recover` exige `review` y estado `failed`. |
| `commands/index.ts` (4) | Barrel | — | — |
| `readers/index.ts` (92) | Readers canónicos | `readInsightsCatalog`, `readInsightReports`, `readInsightReport`, `readInsightEditions`, `readInsightEdition` | Cada reader revalida `assertInsightsAccess(need:'read')`. |
| `readers/projection.ts` (119) | Proyección por audiencia | `projectEdition`, `projectReport`, `projectSnapshot`, `projectPlan`, `isEditionVisibleTo`, `canViewEvidence`, `CLIENT_STATUS` | Detalle en §5.3. |
| `stores/db.ts` (35) | Acceso a datos | `runInsightsQuery`, `toIso` | Compone con `PoolClient` opcional; nunca `new Pool()`. |
| `stores/records.ts` (100) | Records server-side | `InsightReportRecord`, `InsightEditionRecord`, `InsightEditionTransitionRecord`, `EvidenceSnapshotRecord`, `EditorialPlanRecord` | Nunca se devuelven crudos a UI. |
| `stores/report-store.ts` (143) | Reportes | `insertInsightReport`, `lockInsightReport` (`FOR UPDATE`), `getInsightReportById`, `getInsightReportByCode`, `listInsightReports` | El código lo asigna la DB por DEFAULT. |
| `stores/edition-store.ts` (370) | Ediciones + transiciones | `insertInsightEdition` (versión = `MAX+1` bajo lock del reporte), `findInsightEditionByIdempotencyKey`, `getInsightEditionById`, `listInsightEditions` (límite 200, orden `created_at DESC, edition_id COLLATE "C"`), `transitionInsightEditionState`, `listInsightEditionTransitions` | `transition…` es idempotente si el estado ya es el destino; gate humano exige actor persona con `userId`; `failed` sólo desde fase recuperable. |
| `stores/snapshot-store.ts` (133) | Snapshots | `upsertInsightEvidenceSnapshot` (sólo si no sellado), `sealInsightEvidenceSnapshot` (hash canónico + `sealed_at`), `getInsightEvidenceSnapshotByEdition` | `as_of_min/max` derivados de `freshness.asOf` y `sources.asOf`. |
| `stores/plan-store.ts` (123) | Planes | `upsertInsightEditorialPlan` (sólo si no congelado y mismo snapshot), `freezeInsightEditorialPlan`, `getInsightEditorialPlanByEdition` | — |
| `stores/index.ts` (5) | Barrel | — | — |

### 3.6 Tests del dominio (conteo con `grep -cE '^\s*(it|test)\('`)

| Archivo | Casos | Qué cubre |
|---|---|---|
| `__tests__/edition-state-matrix-parity.test.ts` | 3 | Transiciones sembradas = matriz TS; gates humanos; el DO block exige 14 filas. |
| `adapters/adapters.test.ts` | 10 | GSC/rank/ETV con readers mockeados; `unsupported_window`, `no_data`, `not_connected`, `module_disabled`, `method_mismatch`, `insufficient_data`; AEO run fuera de ventana; RpA suppressed; OTD sin denominador. |
| `adapters/registry.test.ts` | 3 | Registro lazy; cuarto adapter fixture; módulo sin adapter ⇒ rechazo. |
| `boundary-domain.test.ts` | 3 | Write allowlist; imports prohibidos; contracts browser-safe. |
| `commands/commands.test.ts` | 9 | Flag OFF; Account crea y llega a `ready_for_review` con owner; idempotencia/conflicto; cliente sólo su org y nunca `internal`; módulo sin evidencia bloquea salvo `allowPartial`; issue flag/forbidden/not_ready; issue con outputs validados y hash; withdraw/recover; proyección por audiencia. |
| `edition-state-machine.test.ts` | 5 | 8 estados, camino feliz, emitida no vuelve, recover por fase, gates. |
| `editorial/editorial.test.ts` | 7 | Planner, validación, formato, flag OFF, reescritura válida, doble violación ⇒ determinista, proveedor caído ⇒ fallback. |
| `request-hash.test.ts` | 2 | Orden de claves/`undefined`; sha256 hex. |
| `stores/stores.live.test.ts` | 1 (live, `describe.runIf(hasLiveDb)`) | Contra PG real en tx revertida: ownership, inmutabilidad, matriz, idempotencia, código sin truncado. |
| `window.test.ts` | 6 | DST Santiago, mes completo vs 30 días, rango arbitrario, `previous_year` y 29-feb, parcial, rechazos. |
| **Subtotal dominio** | **49** (48 unit + 1 live) | |
| `src/lib/api-platform/resources/insights-lanes.test.ts` | 5 | Lanes app (cliente/interno) y ecosystem (org-scoped/internal); traducción de errores. |

---

## 4. Modelo de datos — schema `greenhouse_insights`

Fuente: `migrations/20260915100154428_task-1845-insights-foundation.sql` (692 líneas; `-- Up Migration`
línea 1, `-- Down Migration` línea 654). `search_path` a `public, greenhouse_core, greenhouse_insights`.
Owner del schema y de todo objeto: `greenhouse_ops`; `USAGE` a `greenhouse_runtime`, `greenhouse_app`,
`greenhouse_migrator_user`.

### 4.1 Tablas

| Tabla | PK / UK / FK | Columnas clave | CHECK | Triggers y qué protegen |
|---|---|---|---|---|
| `insight_retention_classes` | PK `retention_class` | `retention_days`, `applies_to`, `notes`, `effective_from` | `retention_days > 0` | — (sólo lectura para runtime) |
| `insight_reports` | PK `report_id` (`insr-<uuid>`); UK `report_code`; FK `organization_id → greenhouse_core.organizations`; FK `created_by_member_id → members ON DELETE SET NULL`; idx `(organization_id, created_at DESC)` | `report_code` DEFAULT `next_insight_report_code()`, `purpose`, `title`, `status` (active/archived), `created_by_actor_kind`, `created_by_user_id` | `report_code ~ '^EO-INS-[0-9]{6,}$'`; `purpose`/`title` ≥ 3 chars; actor persona ⇒ `created_by_user_id NOT NULL` | `trg_insight_reports_immutable_fields` (BEFORE UPDATE: id, código, org, created_* inmutables); `trg_insight_reports_no_delete` (BEFORE DELETE: append-only) |
| `insight_edition_state_matrix` | PK `(from_state, to_state)` | `requires_human_gate` | — | — (dato de la matriz; §4.2) |
| `insight_editions` | PK `edition_id` (`insed-<uuid>`); FK `report_id`, `organization_id`, `supersedes_edition_id` (self), `created_by_member_id`; UK `(report_id, version)`; **UNIQUE parcial** `(organization_id, idempotency_key) WHERE idempotency_key IS NOT NULL`; idx `(org, state, created_at DESC)`, `(report_id, version DESC)` | `version ≥ 1`, `audience`, `state` (8), `failed_phase` (3), `request_json`, `request_hash`, `idempotency_key`, `modules[]`, `outputs[]`, `period_time_zone`, `period_start_utc`, `period_end_utc`, `review_owner_user_id`, `issued_at/by/hash`, `withdrawn_at` | `request_hash ~ '^[0-9a-f]{64}$'`; `idempotency_key` 8–200; `cardinality(modules) ≥ 1`, `cardinality(outputs) ≥ 1`; `period_end_utc > period_start_utc`; `(state='failed') = (failed_phase IS NOT NULL)`; `issued_at`/`issued_by_user_id`/`issued_hash` van juntos; `state='issued' ⇒ issued_at NOT NULL`; `(state='withdrawn') = (withdrawn_at IS NOT NULL)` | `trg_insight_editions_org_matches_report` (BEFORE INSERT: org de la edición = org del reporte; `supersedes` del mismo reporte); `trg_insight_editions_immutable_fields` (BEFORE UPDATE: identidad, encargo, ventana, `created_*` inmutables; `issued_*` se escribe una vez; emitida sólo → issued/withdrawn y no muta owner/fase; withdrawn terminal; setea `updated_at`); `trg_insight_editions_state_transition` (BEFORE UPDATE OF state: consulta la matriz); `trg_insight_editions_no_delete` |
| `insight_edition_transitions` | PK `transition_id` uuid; FK `edition_id`, `organization_id`, `actor_member_id`; idx `(edition_id, created_at)` | `from_state`, `to_state`, `requires_human_gate`, `actor_kind`, `actor_user_id`, `reason`, `metadata_json` | estados ∈ 8; `reason` ≥ 5 chars; gate humano ⇒ actor persona con `actor_user_id` | `trg_…_no_update`, `trg_…_no_delete` (append-only; corregir = fila nueva con `metadata_json.correction_of`) |
| `insight_evidence_snapshots` | PK `snapshot_id` (`inssn-<uuid>`); **UK `edition_id`** (un snapshot por edición); FK `organization_id`, `retention_class` (DEFAULT `evidence_snapshot`); idx `(org, sealed_at DESC)` | `facts_json`, `sources_json`, `rejections_json`, `as_of_min/max`, `snapshot_hash`, `sealed_at` | `(sealed_at IS NULL) = (snapshot_hash IS NULL)`; los tres JSON son arrays | `trg_insight_snapshots_immutable_when_sealed` (identidad inmutable; sellado ⇒ ningún UPDATE); `trg_insight_snapshots_no_delete` |
| `insight_editorial_plans` | PK `plan_id` (`inspl-<uuid>`); **UK `edition_id`**; FK `organization_id`, `snapshot_id`, `retention_class` (DEFAULT `editorial_plan`) | `plan_json`, `plan_hash`, `authoring_mode`, `model_id`, `prompt_version`, `model_usage_json`, `frozen_at` | `(frozen_at IS NULL) = (plan_hash IS NULL)`; provenance: `deterministic` ⇒ sin modelo/prompt, `ai_bounded` ⇒ ambos NOT NULL; `plan_json` es objeto | `trg_insight_plans_immutable_when_frozen`; `trg_insight_plans_no_delete`; `trg_insight_plans_snapshot_pairing` (BEFORE INSERT: el snapshot existe, es de la misma edición/org y **está sellado**) |

Total: 7 tablas, 13 triggers, 10 funciones (1 generadora + 9 `assert_*`), 1 secuencia, 6 índices
(conteo manual sobre la migración; coincide con el mensaje de `e6e8a5dfe`: «7 tablas, 13 triggers»).

### 4.2 Matriz de 14 transiciones (seed líneas 163–178; espejo TS en `edition-state-machine.ts`)

| from → to | Gate humano | Notas |
|---|---|---|
| draft → collecting | no | inicio de generación |
| draft → withdrawn | **sí** | retirar antes de generar |
| collecting → composing | no | snapshot sellado |
| collecting → failed | no | fase recuperable |
| composing → validating | no | plan congelado |
| composing → failed | no | fase recuperable |
| validating → ready_for_review | no | plan ⊆ snapshot, módulos con evidencia |
| validating → failed | no | fase recuperable |
| ready_for_review → issued | **sí** | emisión (además: flag + capability `issue` + outputs validados) |
| ready_for_review → withdrawn | **sí** | |
| failed → collecting | no | recover por fase |
| failed → composing | no | recover por fase |
| failed → validating | no | recover por fase |
| issued → withdrawn | **sí** | una emitida sólo se retira |

`withdrawn` es el único estado terminal. No existe transición hacia `draft` ni de `issued` a ninguna
fase (`edition-state-machine.test.ts` «una edición emitida no vuelve al ciclo»). El test de paridad
(`__tests__/edition-state-matrix-parity.test.ts`) parsea el bloque del seed y exige exactamente 14 filas.

### 4.3 Función `next_insight_report_code()` y por qué `GREATEST(6, length)`

```sql
n bigint := nextval('greenhouse_insights.insight_report_code_seq');
RETURN 'EO-INS-' || lpad(n::text, GREATEST(6, length(n::text)), '0');
```

`lpad(x, N, '0')` **recorta** cuando `x` supera `N` caracteres (bug class ISSUE-172: un id secuencial
`lpad(…, 5, '0')` colisiona pasado 99 999). Con `GREATEST(6, length(n))` el código crece a 7+ dígitos sin
truncar (`EO-INS-1234567`) y conserva el padding para valores cortos (`EO-INS-000007`). Es un solo
`nextval` por llamada (sin `MAX+1`), asignado por DEFAULT de la columna, con `UNIQUE` como última
defensa. El DO block de la migración prueba ambos casos (`probe_long`, `probe_short`).

### 4.4 Clases de retención (seed líneas 76–83)

| Clase | Días | Aplica a | Nota |
|---|---|---|---|
| `edition_request` | 1095 | `insight_editions.request_json` | 3 años desde la creación |
| `evidence_snapshot` | 1095 | `insight_evidence_snapshots` | 3 años desde el sellado; nunca PII operativa |
| `editorial_plan` | 1095 | `insight_editorial_plans` | 3 años desde el congelado; sin chain-of-thought |

`ON CONFLICT DO UPDATE` (re-ejecutable). El cleanup verificable es follow-up operativo; hoy no hay job de
purga (no verificado en esta sesión un job que las consuma).

### 4.5 Seeds de módulo y capabilities

- **Módulo client-portal** `insights_v1` en `greenhouse_client_portal.modules` (líneas 559–571):
  `display_label` «Efeonce Insights (informes por edición: deck, A4 y web)», `display_label_client`
  «Insights», `applicability_scope='cross'`, `tier='addon'`, `view_codes=[]`, `capabilities=[]`,
  `data_sources=['insights.editions']`, `pricing_kind='addon_fixed'`; `ON CONFLICT DO NOTHING`.
- **Capabilities** en `greenhouse_core.capabilities_registry` (líneas 577–593), `ON CONFLICT DO UPDATE`
  y `deprecated_at = NULL`:

| Capability | Acciones | Scopes | Descripción (resumen) |
|---|---|---|---|
| `insights.report.read` | read | own, organization, tenant | Leer catálogo, reportes, ediciones, snapshots y planes |
| `insights.edition.create` | create | own, organization, tenant | Validar encargo y crear/revisar; no emite |
| `insights.edition.review` | update | organization, tenant | Preparar/revisar y recuperar fases fallidas (interno) |
| `insights.edition.issue` | approve | own, organization, tenant | Gate humano de emisión y retiro |

### 4.6 Guard anti pre-up-marker (líneas 598–636)

Aborta con `RAISE EXCEPTION 'TASK-1845 anti pre-up-marker check: faltan objetos:…'` si falta el schema,
alguna de las 7 tablas, la función, si la matriz no tiene 14 filas, si no hay 3 clases de retención, si no
hay 4 capabilities vigentes, si falta el módulo `insights_v1`, o si el generador trunca/no rellena.

### 4.7 Grants (líneas 643–652)

| Objeto | `greenhouse_runtime` | `greenhouse_migrator_user` |
|---|---|---|
| secuencia + función | USAGE / EXECUTE | USAGE / EXECUTE (también `greenhouse_app`) |
| `insight_retention_classes`, `insight_edition_state_matrix` | SELECT | S/I/U/D |
| `insight_reports`, `insight_editions`, `insight_evidence_snapshots`, `insight_editorial_plans` | SELECT, INSERT, UPDATE (sin DELETE; los triggers cierran lo demás) | S/I/U/D |
| `insight_edition_transitions` | SELECT, INSERT (sin UPDATE/DELETE) | S/I/U/D |

### 4.8 Down (líneas 654–692): ensayado el 2026-09-16 tras dos hallazgos

> **Delta 2026-09-15 (ensayo de rollback con Codex):** el Down original falló con `module_assignments_module_key_fkey` porque la organización sintética tiene `insights_v1` asignado; node-pg-migrate revirtió la transacción entera y la base quedó intacta. Un segundo intento mostró que retirar las asignaciones exige borrar `module_assignment_events`, append-only por gobernanza. Decisión: la sección Down (nunca ejecutada; el Up no cambia) ya no toca catálogo, asignaciones ni auditoría del módulo; retira el schema y depreca las capabilities, y el Up re-siembra capabilities y deja el módulo, así que down/up vuelve al estado vigente. Tercer intento 2026-09-16 00:24–00:25:31Z con este Down: `migrate:down` OK (schema ausente, fila de `pgmigrations` ausente, módulo/asignación/auditoría intactos, 4 capabilities deprecadas), `migrate:up` OK (7 tablas, 14 transiciones, 13 triggers, 4 capabilities vivas, secuencia reiniciada); las 4 ediciones sintéticas previas se perdieron por diseño y los canaries posteriores crearon `EO-INS-000002` (staging) y `EO-INS-000003` (producción). Aclaración de vocabulario: todas las ediciones de esta task son SINTÉTICAS (org sandbox «Greenhouse Demo»); «producción» nombra el runtime que las generó, no la naturaleza del dato.

El Down hace únicamente undo: 13 `DROP TRIGGER IF EXISTS`, 7 `DROP TABLE IF EXISTS` (en orden de
dependencias), 10 `DROP FUNCTION IF EXISTS`, `DROP SEQUENCE`, `DROP SCHEMA` (sin CASCADE), marca las 4
capabilities con `deprecated_at = NOW()` (no las borra) y hace `DELETE` del módulo `insights_v1`. El propio
archivo advierte: «Con ediciones emitidas, forward-fix: este down existe para entornos sin datos reales».

**No se ha ensayado** (facts file: pendiente para `complete`) porque hay **una sola instancia Cloud SQL**
compartida por dev/staging/prod (`.claude/rules/migrations.md`); un `migrate:down` real destruiría las
ediciones `EO-INS-000012/13/14` y alteraría `pgmigrations.run_on`. El ensayo válido exige conservar el
`run_on` original y las ediciones intactas (task §Rollout evidence, línea 298), lo que implica un
entorno aislado o un procedimiento todavía no definido. Estado: **no ejecutado**.

Tipos Kysely regenerados: `src/types/db.d.ts` líneas 13883–13889 (`GreenhouseInsights*`, +112 líneas en
`e6e8a5dfe`).

---

## 5. Contratos

### 5.1 `InsightRequestV1` — campos, validación y defaults

Fuente: `contracts/request.ts`, `commands/validate-request.ts`, `window.ts`.

| Campo | Tipo / enum | Obligatorio | Default | Validación |
|---|---|---|---|---|
| `requestVersion` | `'insight_request_v1'` | no | se fija | si viene, debe ser exacto |
| `organizationId` | string | no | la autorizada | si viene y difiere de la org autorizada ⇒ `invalid_request` («intento de target») |
| `projectIds` | string[] | no | `[]` | cada item 1–200 chars; no-lista ⇒ `invalid_request` |
| `modules` | `seo` \| `aeo` \| `ico` [] | **sí** | — | lista no vacía; se deduplica |
| `outputs` | `deck_pdf` \| `report_pdf` \| `web` [] | **sí** | — | lista no vacía; se deduplica |
| `audience` | `client` \| `internal` | no | `client` | debe estar en `allowedAudiences` del grant (cliente: sólo `client`) |
| `locale` | `es-CL` \| `en-US` | no | `es-CL` | enum |
| `depth` | `executive` \| `standard` \| `detailed` | no | `standard` | enum |
| `period.start`, `period.endExclusive` | `YYYY-MM-DD` | **sí** | — | fecha civil válida (`parseCivilDate`); `end > start` |
| `period.timeZone` | IANA | no | `America/Santiago` | 3–64 chars; validada con `Intl.DateTimeFormat` |
| `comparison.kind` | `none` \| `previous_period` \| `previous_year` \| `custom` | no | `previous_period` | `custom` exige `start`/`endExclusive` y **no puede solaparse** con el período |
| `brand.efeoncePackVersion` | string | no | `axis-current` | 1–64 |
| `brand.clientBrandRef` | string \| null | no | `null` | 1–200 |
| `policy.allowPartial` | boolean | no | `undefined` | sólo `=== true` cuenta |
| `idempotencyKey` | string | no | — | **8–200** chars |
| `title` | string | no | `Insights <módulos> <start>–<end>` (al crear reporte) | 3–200 |
| `purpose` | string | no | «Edición generada desde el encargo» | 3–500 |

**Ventana** (`window.ts`):

- `[start, endExclusive)` resuelta en la zona IANA y almacenada en UTC (`civilMidnightToUtc` con **dos
  pasadas** para corregir DST; test mide Santiago `-04`/`-03`).
- **Máximo 400 días** (`MAX_INSIGHT_WINDOW_DAYS`) ⇒ `invalid_window`.
- **No futuro**: `startUtc >= now` ⇒ `invalid_window`. Si `endUtc > now` la ventana se etiqueta
  `partial: true` (no se rechaza).
- `wholeMonths` cuando ambos extremos caen el día 1; `months` lista `YYYY-MM`.
- Comparación `previous_period`: para meses completos, el mismo número de meses anteriores («un mes
  anterior a agosto es julio, no 30 días antes»); para rangos arbitrarios, el mismo largo en días
  inmediatamente anterior. `previous_year`: mismas fechas civiles un año antes; 29-feb → 28-feb si el año
  anterior no es bisiesto. `custom`: se rechaza el solape.

### 5.2 Respuesta de `create` (lane app y ecosystem)

`{ data: { report, edition, idempotent, generation }, status }` donde `generation` es
`{ outcome: 'ready_for_review' | 'failed', failedPhase, failureCode } | null` (`null` en replay
idempotente o `deferGeneration`). `status` es `202` para una edición nueva y `200` cuando
`idempotent: true` (`resources/app-insights.ts` línea 140, `ecosystem-insights.ts` línea 283); ambos
runners honran `result.status` (`core/app-auth.ts` línea 344, `core/commands.ts` línea 55).

> Verificado 2026-09-15 23:30Z contra staging: un replay resuelto por la idempotencia de dominio (misma
> `idempotencyKey` en el cuerpo, mismo encargo) responde **HTTP 200** con la misma edición e
> `idempotent: true` y `generation: null`; el primer create responde **202**. Un replay con la misma
> `Idempotency-Key` de lane (header, lane ecosystem) devuelve la respuesta cacheada original (202,
> `idempotent: false`), que es el comportamiento de la lane, no del command.

### 5.3 Proyección por audiencia (`readers/projection.ts`)

| Aspecto | Cliente (`viewer='client'`) | Interno (`viewer='internal'`) |
|---|---|---|
| Ediciones visibles | sólo `audience='client'` | todas |
| `status` | redactado: draft/collecting/composing/validating → `in_progress`; ready_for_review → `in_review`; issued → `issued`; failed → `needs_attention`; withdrawn → `withdrawn` | estado real |
| `failedPhase`, `reviewOwnerUserId` | omitidos | presentes |
| `evidence` / `plan` (`?include=evidence`) | sólo si la edición está **`issued`** (`canViewEvidence`) | siempre |
| Provenance del plan (`authoringMode`, `modelId`, `promptVersion`) | omitida | presente |
| `history` (transiciones) | `null` | lista redactada (id, from, to, gate, actorKind, reason, createdAt) |
| Filtro `audience=internal` en listado | ignorado en silencio (fuerza `client`) | respetado |
| `outputsAvailable` | `[]` (hasta TASK-1846) | `[]` |

### 5.4 Idempotencia

- Dominio: UNIQUE parcial `(organization_id, idempotency_key)` + `request_hash` = `hashCanonical` del
  encargo **sin** `idempotencyKey` (`create-edition.ts` `stripIdempotency`). Misma key + mismo hash ⇒
  devuelve la edición existente con `idempotent: true` y `generation: null`; misma key + hash distinto ⇒
  `InsightsIdempotencyConflictError` (409 `idempotency_conflict`).
- Lane ecosystem: además `Idempotency-Key` de transporte + audit de ejecución por `(principal, key)`
  (`core/commands.ts`); el gateway deriva `insights-create-<idempotencyKey>` del encargo
  (`efeonce-mcp/src/providers/greenhouse-insights.ts`).
- Transiciones: `transitionInsightEditionState` es idempotente si el estado ya es el destino (devuelve la
  última transición registrada con `idempotent: true`).

### 5.5 Errores canónicos (`errors.ts` → `resources/insights-errors.ts`)

| Código de dominio | HTTP | `errorCode` API Platform | Cuándo |
|---|---|---|---|
| `invalid_request` | 400 | `bad_request` | shape/enum inválido; `organizationId` ajeno en payload |
| `invalid_window` | 400 | `bad_request` | fecha inválida, `end ≤ start`, > 400 días, futuro, zona inválida, custom solapado |
| `forbidden` | 403 | `forbidden` | sin capability; audiencia no permitida |
| `human_gate_required` | 403 | `forbidden` | transición con gate sin actor persona |
| `not_found` | 404 | `not_found` | org sin módulo / cliente apuntando a otra org (anti-oracle); reporte/edición inexistente |
| `unsupported_window`, `insufficient_data`, `method_mismatch`, `evidence_rejected` | 422 | `bad_request` | evidencia/plan (en generación quedan en `failureCode`, no como HTTP) |
| `not_ready` | 409 | `bad_request` | issue sin outputs validados; revisar una retirada; snapshot/plan no congelado |
| `invalid_transition` | 409 | `bad_request` | transición fuera de la matriz |
| `idempotency_conflict` | 409 | `idempotency_conflict` | misma key, payload distinto |
| `generation_disabled` | 503 | `service_unavailable` | `INSIGHTS_GENERATION_ENABLED` ≠ `true` |
| `issuance_disabled` | 503 | `service_unavailable` | `INSIGHTS_ISSUANCE_ENABLED` ≠ `true` |
| `quota_exceeded` | 429 | `rate_limited` | declarado; ningún emisor en el dominio hoy |
| (no `InsightsError`) | 500 | `internal_error` | capturado con `captureWithDomain(err,'insights')` |

Además del lane: `scope_not_allowed` 403 (binding no interno intentando escribir, o scope no org ni
internal), `bad_request` 400 (interno sin `organizationId`), `idempotency_in_progress` 409.

### 5.6 Eventos outbox (`events.ts`; nombres en `src/lib/sync/event-catalog.ts` líneas 606–610)

| Evento | Aggregate | Payload (v1, redactado) | Cuándo |
|---|---|---|---|
| `insights.report.created` | `insight_report` | reportId, reportCode, organizationId, actorKind | al crear un reporte nuevo (no en `revise`) |
| `insights.edition.created` | `insight_edition` | editionId, reportId, organizationId, editionVersion, audience, modules, outputs, periodStart/EndUtc, requestHash, supersedesEditionId, actorKind | en la misma tx de la inserción |
| `insights.edition.state_transitioned` | `insight_edition` | editionId, reportId, organizationId, fromState, toState, requiresHumanGate, actorKind, transitionId | en cada transición no idempotente |
| `insights.evidence.sealed` | `insight_edition` | snapshotId, editionId, organizationId, snapshotHash, factCount, rejectionCount, asOfMax | al sellar en `collecting` |
| `insights.edition.issued` | `insight_edition` | editionId, reportId, organizationId, editionVersion, issuedHash, actorKind | al emitir (hoy inalcanzable) |

Nunca hechos, evidencia, narrativa, prompts ni bearer. Se publican con `publishOutboxEvent(event, client)`
dentro de la misma transacción.

### 5.7 Señales de reliability y observabilidad

- `src/lib/reliability/queries/insights-edition-signals.ts`: `insights.editions.failed_recent`
  (`data_quality`; ediciones `failed` con `updated_at` en 7 días; warning ≥1, error ≥5) y
  `insights.editions.stuck_generation` (`lag`; ediciones en collecting/composing/validating sin
  `updated_at` hace > 30 min; warning ≥1, error ≥3). Steady = 0. Cableadas en
  `get-reliability-overview.ts` (líneas 185, 702, 1287, 1996–1999).
- Módulo `insights` en `src/lib/reliability/registry.ts` (líneas 656–680: rutas, dependencias,
  `filesOwned`, `incidentDomainTag: 'insights'`), `incident-mapping.ts` (keywords línea 142, prioridad 17
  línea 175), `src/types/reliability.ts` línea 472.
- `CaptureDomain` `'insights'` en `src/lib/observability/capture.ts` línea 73; usado en
  `collect-evidence.ts`, `generation.ts`, `ai-authoring.ts`, `insights-errors.ts`, señales.
- Client portal: data source `insights.editions` en `dto/reader-meta.ts` línea 50 y
  `data-sources/parity.ts` línea 175 (cardinalidad 21 tras el fix de `12f985d8a`).
- Reader agregado en el dueño SEO: `readSeoOverviewKpisForWindow(organizationId, {from, toExclusive})` en
  `src/lib/growth/seo/overview/read-overview-kpis.ts` (misma agregación: posición ponderada por
  impresiones, CTR del período; devuelve `servedFrom/servedTo/coveredDays`; módulo OFF ⇒ vacío).

---

## 6. Autorización y flags

### 6.1 Tres planos, una puerta (`authz.ts`)

1. **Capability por acción** (`can(subject, capability, action, scope)`): `read`→`insights.report.read`,
   `create`→`insights.edition.create`, `review`→`insights.edition.review`/`update`,
   `issue`→`insights.edition.issue`/`approve`. Cliente evalúa scope `own`; interno `tenant`.
2. **Target por actor**: cliente ⇒ `actorOrganizationId` (derivada de sesión) debe ser igual al target o
   se responde `not_found` (404, **anti-oracle**: no se distingue «no existe» de «no es tuya»). Interno ⇒
   el target se revalida en cada command.
3. **Entitlement per-ORG**: `module_assignments` con `module_key='insights_v1'`, `effective_to IS NULL`,
   `status IN ('active','pilot')`, no expirado. Sin módulo ⇒ `not_found` (404) también para internos.

`allowedAudiences`: interno `['client','internal']`, cliente `['client']`; `assertAudienceAllowed`
rechaza `internal` a un cliente (403 `forbidden`).

### 6.2 Grants reales por rol (`src/lib/entitlements/runtime.ts` líneas 3087–3143)

| Rol | read | create | review | issue | Scope |
|---|---|---|---|---|---|
| `efeonce_admin`, `efeonce_account` | ✓ | ✓ | ✓ | ✓ | tenant |
| `efeonce_operations` | ✓ | ✓ | ✓ | — | tenant |
| Cualquier `tenantType='client'` (`client_executive`, `client_manager`, `client_specialist`) | ✓ | — | — | — | own |
| `client_executive`, `client_manager` (adicional) | | ✓ | — | — | own |

Consecuencias verificadas en código: un cliente **no** puede `recover` (exige `review`) ni `issue`/`withdraw`
(exigen `issue`); `efeonce_operations` no emite ni retira. Catálogo TS: `src/config/entitlements-catalog.ts`
líneas 2441–2444 (módulo `insights`, `defaultScope: 'tenant'`). En el lane ecosystem el binding org-scoped
se modela como `CLIENT_SPECIALIST` (sólo lectura) y el interno como `EFEONCE_ACCOUNT` (crea/revisa/recupera;
nunca emite porque el actor no es persona y el lane no expone `issue`/`withdraw`).

### 6.3 Flags (`flags.ts`; ledger `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`)

| Flag | Gatea | Sin él | Runtime lector | Estado 2026-09-15 |
|---|---|---|---|---|
| `INSIGHTS_GENERATION_ENABLED` | `createInsightEdition` / `reviseInsightEdition` (primera línea del command) | 503 `generation_disabled` | **Vercel** únicamente (`grep` en `src/` y `services/`: sólo `flags.ts`; task línea 297) | ON staging + Production; OFF Preview |
| `INSIGHTS_ISSUANCE_ENABLED` | `issueInsightEdition` | 503 `issuance_disabled` | Vercel | OFF en todos |
| `INSIGHTS_AUTHORING_AI_ENABLED` | `authorEditorialPlan` → IA acotada | plan determinista | Vercel | OFF en todos |

Los tres son independientes; el default es OFF (`=== 'true'`). Los workers Cloud Run no leen ninguno.

---

## 7. Pipeline de generación (`commands/generation.ts`)

Corre **después del commit** de `createInsightEdition` (síncrono en el request; `deferGeneration` lo
omite para que TASK-1846 lo mueva al worker). Cada fase es una transacción propia (estado + historial +
outbox), con actor `system`.

| Fase | Transición | Qué hace | Falla ⇒ |
|---|---|---|---|
| `collecting` | draft → collecting | `resolveInsightWindows` sobre el encargo; `collectInsightEvidence` (adapters por módulo del registry; un adapter que lanza se registra como rechazo `no_data`, no cae la edición; `factId` duplicado ⇒ throw); `upsertInsightEvidenceSnapshot` + `sealInsightEvidenceSnapshot` (hash canónico) + evento `insights.evidence.sealed` | `failed` + `failedPhase='collecting'` |
| `composing` | collecting → composing | exige snapshot sellado; `authorEditorialPlan` (determinista siempre, validado; IA sólo con flag y validada, con fallback); `upsertInsightEditorialPlan` + `freezeInsightEditorialPlan` (hash canónico) | `failed` + `'composing'` |
| `validating` | composing → validating | módulos del encargo sin ningún hecho ⇒ `evidence_rejected` salvo `policy.allowPartial === true`; `validateEditorialPlan(plan, snapshot)` sin violaciones (plan ⊆ snapshot); resuelve `reviewOwnerUserId` = `createdByUserId` si `createdByActorKind === 'member'`, si no `null` | `failed` + `'validating'` |
| — | validating → ready_for_review | `patch.reviewOwnerUserId` | — |

Fallo: `failureCode` = código `InsightsError` o `'unexpected'` (capturado con `captureWithDomain`);
historial redactado (arrays → conteo; sólo escalares). `recoverInsightEdition` reanuda **desde la fase
fallida** sin rehacer las anteriores (snapshot sellado y plan congelado se conservan; `upsert` rechaza
reemplazar un snapshot sellado o un plan congelado).

**Adapters sobre readers dueños** (nunca SQL propio sobre tablas del productor; guard en
`boundary-domain.test.ts`):

| Módulo | Readers consumidos | Hechos | Rechazos declarados |
|---|---|---|---|
| SEO | `readSeoOverviewKpisForWindow` (GSC: clicks, impressions, ctr, position ponderada), `readRankEvolution` (selección del último punto dentro de la ventana por keyword: `keywords_tracked`, `page_one_keywords ≤10`), `readDomainOverviewForTarget` (ETV mensual, `observation='estimated'`, método `dataforseo_etv/<version>`), `resolveUnambiguousSeoTarget`, `isSeoModuleEnabled` | por ventana actual y comparación, con `comparisonFactId` enlazado (ETV por posición en la ventana: agosto ↔ julio) | `module_disabled`, `not_connected`, `target_ambiguous`, `no_data`, `unsupported_window` (rank sin puntos; ETV fuera de meses completos), `method_mismatch`, `insufficient_data` |
| AEO | `readClientGraderReport` (`ClientGraderReportError`) | `overall_score`, `dimension.<key>`, `presence.<provider>` (num/den) sólo si `provenance.asOfDate ∈ [start,end)` | `not_connected`, `no_data`, `unsupported_window` (último run fuera de ventana; nunca se proyecta como histórico), `insufficient_data`, `review_required` (del gate del grader) |
| ICO | `listOrganizationSpaces` (SQL propio a `greenhouse_core.spaces`, lectura), `readSpaceMetrics(spaceId, year, month)` | `rpa` (hereda `dataStatus`; `low_confidence` ⇒ cobertura parcial) y `otd` (numerador `onTimeTasks`, denominador `onTime+lateDrop+overdue`) por space y mes; comparable por space sólo si la comparación tiene un mes | `not_connected` (sin spaces), `unsupported_window` (no meses completos, sin llamar al reader), `no_data` (sin snapshot), `suppressed` (RpA), `insufficient_data` (OTD sin denominador) |

**Planner determinista** (`deterministic-planner.ts`): un capítulo por módulo con claims
`«<label>: <valor> (período anterior <prev>, variación <delta>).»` (+ «Período parcial…», «Valor
estimado…»), un chart por unidad (`bar_grouped` si hay comparables, baseline 0, equivalente tabular por
`factId`), una tabla resumen, `limits` por rechazo, `methodology` por fuente, `references` por hecho.
Hallazgo conocido: `plan.limits` repite «ico: sin datos.» por cada rechazo (dedupe → TASK-1846).

**IA acotada** (`ai-authoring.ts`): sólo reescribe el texto de cada claim; prompt con `locale` + claims;
schema JSON estricto; temperatura 0; hasta 1 reparación; cualquier violación de cifras ⇒ se conserva la
versión determinista y `provenance.mode='deterministic'` con `aiFallbackReason`. Hoy OFF.

**Emisión** (`lifecycle.ts`): `getInsightOutputsPort().assertOutputsValidated(edition)`; el puerto por
defecto lanza `not_ready` («el render durable (TASK-1846) aún no está conectado»). Si estuviera conectado:
`issued_hash = hashCanonical({requestHash, snapshotHash, planHash, outputs})`, transición con gate humano
(actor persona con `userId`), eventos `state_transitioned` + `issued`.

---

## 8. Superficies

### 8.1 Rutas API Platform (16; `ca17c93da`)

| Ruta | Verbo | Lane | Autoridad | Notas |
|---|---|---|---|---|
| `/api/platform/app/insights/catalog` | GET | app | sesión (cookie/bearer first-party); interno declara `organizationId` (400 si falta), cliente usa la de su tenant | `readInsightsCatalog` |
| `/api/platform/app/insights/reports` | GET | app | ídem | paginado |
| `/api/platform/app/insights/reports/[reportId]` | GET | app | ídem | reporte + ediciones visibles |
| `/api/platform/app/insights/editions` | GET / POST | app | GET read; POST `runAppCommandRoute` (idempotencia de lane) | POST 202 / 200 idempotente; body `{organizationId?, request}` o el encargo plano |
| `/api/platform/app/insights/editions/[editionId]` | GET | app | read | `?include=evidence` |
| `…/editions/[editionId]/revise` | POST | app | `create` | versión nueva |
| `…/editions/[editionId]/issue` | POST | app | `issue` + flag + gate humano | hoy 409 `not_ready` (o 503 `issuance_disabled` con flag OFF; el flag se evalúa primero) |
| `…/editions/[editionId]/withdraw` | POST | app | `issue` | `reason` ≥ 5 chars o fallback |
| `…/editions/[editionId]/recover` | POST | app | `review` | 202 con `generation` |
| `/api/platform/ecosystem/insights/catalog` | GET | ecosystem | consumer token + `externalScopeType`/`externalScopeId`; binding org-scoped ⇒ su org (otra ⇒ 404); binding `internal` ⇒ `organizationId` requerido | |
| `/api/platform/ecosystem/insights/reports` | GET | ecosystem | ídem | |
| `/api/platform/ecosystem/insights/reports/[reportId]` | GET | ecosystem | ídem | |
| `/api/platform/ecosystem/insights/editions` | GET / POST | ecosystem | POST sólo binding `internal` (`scope_not_allowed` si org-scoped); `runEcosystemCommandRoute` con `Idempotency-Key` | |
| `/api/platform/ecosystem/insights/editions/[editionId]` | GET | ecosystem | read | `?include=evidence` |
| `…/editions/[editionId]/revise` | POST | ecosystem | binding `internal` | |
| `…/editions/[editionId]/recover` | POST | ecosystem | binding `internal` | |

El lane ecosystem **no expone** `issue` ni `withdraw` (ningún binding emite). Todas las rutas son thin
adapters (`export const dynamic = 'force-dynamic'`) sobre `resources/{app,ecosystem}-insights.ts`, con la
misma tabla de errores (`insights-errors.ts`).

### 8.2 MCP interno de Greenhouse (`src/mcp/greenhouse/`)

| Tool | `domain` | `writes` | `spendsProviderBudget` | Llama a |
|---|---|---|---|---|
| `get_insights_catalog` | insights | false | false | `GET /api/platform/ecosystem/insights/catalog` |
| `list_insight_editions` | insights | false | false | `GET …/editions` (reportId, state, page, pageSize) |
| `get_insight_edition` | insights | false | false | `GET …/editions/:id` (`include=evidence`) |
| `create_insight_edition` | insights | **true** | false | `POST …/editions` (`{organizationId, request}`) |

`tool-manifest.ts` líneas 403–431 (nuevo dominio `'insights'` en `GreenhouseMcpToolDomain`, línea 40);
`server.ts` líneas 860–924 (descripciones largas orientadas a agente); `tools.ts` líneas 651–693
(handlers con resumen textual); `http-client.ts` líneas 694–722. Artefacto `tool-manifest.generated.json`:
**51 tools**, `manifestHash 4089283477991d676a30c4123e1c5c55e54f392d1c530d38d425a64555d525ac`.
Skill servida: `skill-manifest.ts` líneas 148–156 (`efeonce-insights`, `audience: 'internal'`,
`appliesTo` las 4 tools); artefacto `skill-catalog.generated.json` (entrada línea 123, `contentHash
a0b8df36…`). Test de fuga: la skill servida no contiene TASK ids, rutas de repo, UUIDs ni org ids
(regla del facts file; verificado por lectura de `docs/mcp/skills/efeonce-insights/SKILL.md`). Skill local
`.claude/skills/efeonce-insights/SKILL.md` es byte-idéntica a `.codex/…` (`cmp` en esta sesión: idéntica).

### 8.3 Gateway federado `efeonce-mcp` (repo hermano, `main` `cad57b31d`; docs `c966c5c`)

| Pieza | Archivo | Detalle |
|---|---|---|
| Provider | `src/providers/greenhouse-insights.ts` (176 líneas) | `createGreenhouseInsightsProvider(config: GreenhouseSeoConfig)`; cabalga la misma lane, identidad de servicio y flag (`GREENHOUSE_SEO_PROVIDER_ENABLED`) del provider SEO; `externalScopeType='other'`, `externalScopeId='efeonce-mcp-gateway'`; timeout 20 s; `contractVersion 'task-1845-v1'`; errores mapeados por status (404 `not_found`, 403 `forbidden`, 400/422 `invalid_request`, 409 `conflict`, 429 `rate_limited`, 503 `policy_blocked`) conservando `laneCode` (`details.code`); `createEdition` envía `idempotency-key: insights-create-<idempotencyKey|uuid>` |
| Scope de escritura | `src/config.ts` línea 60 | `INSIGHTS_WRITE_SCOPE = 'efeonce.mcp.insights.write'` (clase propia por blast-radius; nunca se cablea al cliente PKCE compartido) |
| Políticas de autoridad nativa | `src/auth/tool-policy.ts` líneas 89–100 | las 4 tools `unsupported(...)` con razón `insights_native_policy_missing` (sólo issuer Entra; la autoridad nativa v2 de TASK-1844 no delega Insights) ⇒ fail-closed para autoridad nativa/v2 |
| Paridad | `src/providers/greenhouse-seo-tool-parity.ts` líneas 691–724 | `GREENHOUSE_INSIGHTS_TOOLS` y `GREENHOUSE_INSIGHTS_WRITE_TOOLS` derivadas del manifest (`domain==='insights'`, `writes`); 4 entradas en `EXPECTED_GREENHOUSE_PLATFORM_TOOLS` |
| Registro | `src/mcp.ts` líneas 283–460 | 3 lecturas con scope base `efeonce.mcp.read`; `create_insight_edition` exige `INSIGHTS_WRITE_SCOPE` en `auth.scopes` o responde `insufficient_scope` (línea 448); mensajes de error orientados a agente (anti-oracle, `policy_blocked: generation_disabled — do not retry`) |
| Superficie | `src/surface.ts` (`greenhouseInsights: maximalProvider`), `surface-baseline.json` | `version 1.5.0`, **47 tools**, `manifestHash` idéntico al de Greenhouse, `surfaceHash 99dcd009…` |
| Versión | `package.json` | `1.5.0` (aditivo 1.4.0 → 1.5.0) |
| Canary | `scripts/greenhouse-insights-canary.mjs` (74 líneas) | provider REAL (`dist`) con la service identity: catalog / list / edition (`--edition`) + deny (`--deny <org>` ⇒ espera `not_found`); **nunca crea** |
| Tests | `test/greenhouse-insights.test.ts` (5), `test/greenhouse-insights-mcp.test.ts` (5), +1 en `authorized-tools`, +1 en parity | `pnpm check` = format + typecheck + test + build; 184/184 (facts file) |

Deploy: run `35027446001` success 2026-09-15 21:46Z; revisión Cloud Run `efeonce-mcp-gateway-00053-dsk`
al 100 % del tráfico, imagen `gateway@sha256:5776558…`, `Ready=True`; front door PRM
`/.well-known/oauth-protected-resource` 200, `/health` 200, `/mcp` 401 sin token (`efeonce-mcp/README.md`
líneas 82–83; facts file). `GIT_SHA` no viaja como env var en este servicio.

### 8.4 Entra

Scope `efeonce.mcp.insights.write` creado 2026-09-15 en la app recurso «Efeonce MCP Resource» (appId
`c5363215-b9a6-4bf1-bb1c-e61963b37dac`, tipo Admin, id `e1a577d7-cea6-402d-9bcf-fa781acf568f`); readback 7
scopes con los 6 previos intactos; el cliente PKCE compartido no se tocó. **Ningún cliente porta el scope**
⇒ `create_insight_edition` por el gateway responde `insufficient_scope` hasta un consentimiento/grant
gobernado (facts file; `9e5f8a779`). Paridad en Greenhouse: `src/lib/auth-server/oauth/scopes.ts` línea 44
(`EFEONCE_MCP_WRITE_SCOPES`) + snapshot en `scopes.test.ts` línea 23. El gateway declara 8 clases de
scope (read, globe.read, hiring.read, globe.credits.funding.ensure, seo.write, identity.write,
client_services.write, insights.write).

---

### 8.x Superficies agregadas por TASK-1846 (2026-09-16)

| Superficie | Ruta / tool | Notas |
|---|---|---|
| App lane | `POST/GET /api/platform/app/insights/editions/{editionId}/render` · `GET /api/platform/app/insights/render-runs/{renderRunId}` · `POST …/retry` · `POST …/cancel` | 202 al encolar, 200 idempotente; misma tabla de errores (`insights-errors.ts`) + `render_disabled`/`render_rejected` |
| Ecosystem lane | mismas rutas bajo `/api/platform/ecosystem/insights/**` | bindings org-scoped sólo leen; escribir exige binding interno |
| MCP | `request_insight_render`, `get_insight_render_run`, `retry_insight_render`, `cancel_insight_render` | manifiesto 55 tools; las tres de escritura en la clase `writes` del gateway (federación en `efeonce-mcp` pendiente) |
| Dominio | `src/lib/efeonce-insights/render/{contracts,store,commands,readers,outputs-port,deck-mapper,plan-limits}.ts` | store compone con `InsightsDbClient` (testeable en rollback) |
| Worker | `services/artifact-worker/{consumer-contract.ts,consumers/*}` + `main.ts` por registry | Proposal = adapter compatible; `INSIGHTS_RENDER_ENABLED` en `deploy.sh` (default `false` al escribirse; **delta 2026-09-16: default `true`** en el `deploy.sh` del Job y del `ops-worker`, ambos únicos para staging y producción) |

### 8.y Superficies agregadas por TASK-1848 (2026-09-18)

Fuente: [TASK-1848](../tasks/in-progress/TASK-1848-efeonce-insights-sharing-delivery-and-schedules.md) y arquitectura §14.6.

| Superficie | Ruta / tool | Notas |
|---|---|---|
| Enlaces compartidos | tabla `insight_share_grants` (`ishr-`), token `isg_` + 32 bytes base64url, en DB sólo `token_digest` sha256 | sólo ediciones emitidas; TTL 1–90 días (default 30); máx 20 enlaces activos por edición (429 `quota_exceeded`); revocación única (410); retirar la edición revoca sus enlaces; access log append-only `insight_share_access_events`; capability `insights.share.manage` |
| Lector público (Think) | `GET /api/public/insights/shared/[token]` → `InsightWebModelV1` (`modelVersion '1.0'`) · `GET …/outputs/[output]` | 404 desconocido/expirado/flag OFF/org suspendida/módulo ausente; 410 revocado/retirado; 429 rate limit (IP 300/60 s, grant 60/20); `private, no-store`, noindex, no-referrer, CSP. El render en `efeonce-think` es TASK-1875 |
| Envío por correo | intents/recipients/events (`idlv-`, `idlr-`); EmailTypes `insights_edition_delivery` y `insights_edition_delivery_attachment` (sembrados apagados); projection `insights_delivery_dispatch` en `ops-worker` | aceptado ≠ entregado; `ambiguous` = señal de reliability; `portal_link` ⇒ `not_ready` hasta TASK-1849; capability `insights.delivery.send` (interna) |
| Recurrencia | schedules + ocurrencias; Cloud Scheduler `ops-insights-schedules-tick` (`20 * * * *`) → `ops-worker` `/insights/schedules/tick` | V1 = borrador + render y se detiene en revisión humana (`draft_for_review`); pausa automática por `authority_revoked`/`module_unavailable`; capability `insights.schedule.manage` (interna) |
| Lanes | App `/api/platform/app/insights/**` (shares, deliveries con cancel/retry/reconcile, schedules con activate/pause/retire); Ecosystem (shares crear/listar/revocar; deliveries y schedules sólo lectura) | errores 503 `sharing_disabled\|delivery_disabled\|schedules_disabled`, 429 `quota_exceeded`, 409 `not_ready` |
| MCP interno | `create_insight_share`, `list_insight_shares`, `revoke_insight_share`, `list_insight_deliveries`, `get_insight_delivery`, `list_insight_schedules`, `get_insight_schedule` | manifiesto 62 tools, hash `9fc46c8d90d3` |
| Gateway `efeonce-mcp` | v1.7.0 (PR #16 `4c9d7c44`, deploy `35351850324`, revisión `00055-gk6` al 100 %) | provider `greenhouse-insights` contrato `task-1848-v1`; 51 → 58 tools; crear/revocar enlace exigen `efeonce.mcp.insights.write` (fail-closed); envío y recurrencia no existen por MCP |
| Migraciones | 4 (share grants, delivery intents, skip reason edition, schedules) | aplicadas en la instancia única |

## 9. Verificación realizada

| Capa | Evidencia | Fuente |
|---|---|---|
| Unit del dominio | 48 casos en 9 archivos (§3.6) + 5 de lanes; Slice 3 declaró «vitest focal 842/842» (incluye `src/mcp`) | commits `e6e8a5dfe`, `a21e424fa`, `ca17c93da` |
| Live contra PG real | `stores.live.test.ts` (tx revertida; «passed, no skipped»); live parity de data sources; SQL nuevo de authz/catálogo/señales y `readSeoOverviewKpisForWindow` (agosto 2026, 31/31 días) ejercitados contra PG | mensajes de `e6e8a5dfe`, `a21e424fa`, `ca17c93da` |
| Suite completa | `pnpm test` 14.123 passed / 2 failed → corregidos y re-ejecutados (guard de `CLIENT_PORTAL_DATA_SOURCE_VALUES`) | `12f985d8a` |
| Typecheck / lint | `pnpm typecheck` 0 errores y eslint limpio declarados en cada slice; `local:check` en pre-push | mensajes de commits; hooks |
| Build de producción | Vercel Production build del release (`greenhouse-e8i8fkqbd` READY) y redeploy `greenhouse-h2030d3bz` | facts file. Un `pnpm build` local **no verificado en esta sesión** |
| Gates documentales | `task:lint` 0/0, `docs:context-check:strict` 0/0, `skills:mirrors` OK, `mcp:manifest:check`, `mcp:skills:check`, `ops:lint` 0 | `12f985d8a`, `0a05c8dc8`, `61896e8f7` |
| Canary staging — lane app | persona `agent-client@…` (`client_executive`): catálogo 200 (seo/aeo `module_not_assigned`, ico disponible); create 202 → `EO-INS-000012` / `insed-43025fc1…` `ready_for_review`; replay 200 `idempotent: true`; 409 `idempotency_conflict` con `depth` distinto; `evidence`/`plan` `null` para el cliente | task líneas 288–290; facts file |
| Canary staging — lane ecosystem | consumer `EO-SPK-0004` (binding interno): catálogo/lista/detalle con evidencia (snapshot `inssn-9ee4349b…`, 0 hechos, 4 rechazos `no_data`, plan congelado con `limits`, 4 transiciones); create 202 → `EO-INS-000013`; org sin módulo (Agent.ai) 404 | task línea 291 |
| Canary del gateway contra staging | provider real: catalog ✓ list ✓ edition ✓ deny ✓ | task línea 292 |
| Release | run `35032358217` (un intento; `bypass_preflight_reason` con hechos: migración ya aplicada, `auth_access` = paridad de scopes); dos gates Production aprobados; manifest `released` 22:55:13Z; smoke en `main` producido (run `35030816814`); watchdog `aggregateSeverity=ok`, 5/5 workers synced; Azure `no_infra_diff`; `/api/auth/health` 200 | timing ledger línea 78; facts file |
| Canary producción (pre-flag) | lane ecosystem: catálogo 200, deny 404, lista 200 (2 ediciones de staging: misma instancia), create 503 `generation_disabled` | task línea 296 |
| Canary producción (post-flag) | create 202 → `EO-INS-000014` / `insed-45963bf4…` `ready_for_review`; replay con la misma `Idempotency-Key` de lane devuelve la misma edición (cacheada); health 200 | task línea 297; facts file |
| Señales | `insights.editions.*` ejercitadas contra PG real, ambas `ok` | `ca17c93da` |

Limitación honesta: la evidencia de los canaries tiene **0 hechos** (la org sintética no tiene snapshots ICO
en 2026-07/08); se ejercitó el camino «sin datos declarados», no el de un cliente con datos reales
(arquitectura §14.3).

---

## 10. Matriz «qué está desplegado dónde»

| Runtime / lugar | Componente | Estado | Evidencia |
|---|---|---|---|
| Cloud SQL `greenhouse-pg-dev` (única instancia dev/staging/prod) | schema `greenhouse_insights` + seeds (módulo, 4 capabilities, matriz, retención) | **Aplicado** 2026-09-15 10:06Z; readback 7 tablas / 13 triggers | facts file; `e6e8a5dfe` |
| Cloud SQL | assignment `insights_v1` a org sintética Greenhouse Demo `org-6c09b3a7-cbab-48a9-869e-61d03d1c6291` (assignment `cpma-805e1a0c…`) | Activo | task línea 289 |
| Cloud SQL | ediciones `EO-INS-000012`, `EO-INS-000013`, `EO-INS-000014` (`ready_for_review`) | Existen (visibles desde staging y producción por ser la misma instancia) | facts file; task línea 296 |
| Vercel `staging` (`develop`) | código de TASK-1845 + `INSIGHTS_GENERATION_ENABLED=true` | Vivo desde ~20:00Z (redeploy `greenhouse-b80oa2ilb`) | task línea 288; ledger línea 383 |
| Vercel `Production` (`main`) | release `9c094688309d` (`greenhouse-e8i8fkqbd`) + flag ON (`greenhouse-h2030d3bz`) | Vivo desde 22:55Z (código) y ~23:10Z (flag) | facts file; ledger línea 249 |
| Vercel `Preview` | código sí (ramas); flags OFF | Sin canary | ledger línea 383 |
| Cloud Run `ops-worker`, `auth-server` | retienen `0a05c8dc8267` (diff de árbol docs-only respecto de `9c094688309d`; skip legítimo change-gated) | No leen ningún flag de Insights; no ejecutan código del dominio | facts file; timing ledger |
| Cloud Run otros workers (5/5 synced según watchdog) | — | Sin código de Insights | facts file |
| Cloud Run `efeonce-mcp-gateway` | v1.5.0, provider `greenhouse-insights`, 47 tools | Rev `00053-dsk` al 100 % | `efeonce-mcp/README.md`; facts file |
| Entra (tenant Efeonce) | scope `efeonce.mcp.insights.write` en «Efeonce MCP Resource» | Creado; sin clientes que lo porten | facts file |
| Greenhouse manifest/skills MCP | 51 tools + skill `efeonce-insights` | En `develop` y `main` | artefactos generados |
| Vercel `staging` + `ops-worker` (TASK-1848, 2026-09-18) | `INSIGHTS_SHARING/DELIVERY/SCHEDULES/ISSUANCE_ENABLED=true` en staging; `ops-worker` con DELIVERY/SCHEDULES/GENERATION | Canary sintético completo (`EO-INS-000015`); el operador confirmó la llegada de los dos correos | TASK-1848 Delta 2026-09-18 |
| Vercel `Production` (TASK-1848) | release `bda1cf2cd938` (PR #238, orquestador `35349506106`, `released` 13:41Z) | Código vivo, **flags OFF** (sharing/delivery/schedules/emisión) hasta TASK-1875; canary: crear enlace ⇒ 503 `sharing_disabled`, token inexistente ⇒ 404, sin token ⇒ 401 | TASK-1848 Delta 2026-09-18 |
| Cloud Run `efeonce-mcp-gateway` (TASK-1848) | v1.7.0, 58 tools | Rev `00055-gk6` al 100 %; canary del provider contra producción verde | TASK-1848 Delta 2026-09-18 |
| Ledgers | `FEATURE_FLAG_STATE_LEDGER.md` (3 filas + snapshot), `PRODUCTION_RELEASE_TIMING_LEDGER.md` (fila del release) | Al día | líneas 249–251, 383–385; línea 78 |

---

## 11. Lo que NO está (honesto)

| Ausencia | Detalle | Dueño |
|---|---|---|
| Outputs PDF/deck/web | **Actualizado 2026-09-16 (TASK-1846):** `InsightOutputsPort` conectado; `renderableOutputs: ['deck_pdf']`; motor + lanes + MCP en código, **sin deploy y con `INSIGHTS_RENDER_ENABLED` OFF** (*delta 2026-09-16: ya desplegado — release `917491fd02e4`, Job `artifact-worker` integrado al release control plane y render ON en Vercel staging/Production, Job y `ops-worker`*); `report_pdf`/`web` siguen sin catálogo | TASK-1846 (rollout), TASK-1847 (A4/charts), TASK-1848 (web/descarga) |
| Emisión | `INSIGHTS_ISSUANCE_ENABLED` OFF; el puerto (real desde 2026-09-16) responde `not_ready` mientras falte un output `completed` de la misma audiencia; `insights.edition.issued` nunca se ha publicado | rollout de TASK-1846 + policy EPIC-046 P01 |
| IA de autoría | `INSIGHTS_AUTHORING_AI_ENABLED` OFF; todos los planes existentes son `deterministic` | medir costo/tokens en staging antes |
| UI del portal (biblioteca, encargo, revisión) | no existe; sólo API/MCP | TASK-1849 |
| Vista web compartida | resolver `InsightWebModelV1` + proxy **existen desde TASK-1848 (en producción con flag OFF, 2026-09-18)**; el render en Think no tiene código | TASK-1875 |
| Share/delivery/schedules | **Actualizado 2026-09-18:** construidos y en producción con flags OFF (release `bda1cf2cd938`, §8.y); faltan in-app/Teams, `portal_link`, recordatorios/preferencias/baja y ISSUE-174 → TASK-1876 | TASK-1849, TASK-1875, TASK-1876, TASK-690–693 |
| Grant del scope `insights.write` a clientes MCP | `create_insight_edition` por el gateway ⇒ `insufficient_scope` | consentimiento/grant gobernado |
| Ensayo de `migrate:down` | ejecutado 2026-09-16 00:24–00:25Z con el Down definitivo (down OK, readback, up OK, readback; canaries posteriores `EO-INS-000002` staging / `EO-INS-000003` producción) | cerrado (§4.8) |
| Sesión MCP con token humano | `tools/list` desde un cliente real (evidencia de 47 tools + skill) no obtenida | pendiente para `complete` |
| Dedupe de `plan.limits` | resuelto en el RENDER (`render/plan-limits.ts`, 2026-09-16); el plan congelado conserva un límite por rechazo a propósito | cerrado |
| Clientes reales (Berel/Sky) | ninguna org real tiene `insights_v1`; sólo la sintética | EPIC-046 |
| Job de retención | clases declaradas (1095 días); sin cleanup verificable | follow-up operativo |
| Owner de revisión para encargos de cliente | `reviewOwnerUserId = null` cuando el creador no es `member` | policy EPIC-046 P01 |
| Generación asíncrona | la GENERACIÓN sigue síncrona; el RENDER sí es asíncrono (cola + worker, 2026-09-16) | evaluar tras TASK-1847 |

---

## 12. Cómo operar, verificar y revertir

Comandos exactos (todos desde la raíz de `greenhouse-eo` salvo indicación).

**Asignar el módulo a una organización** (dry-run por defecto; pasa por `enableClientPortalModule`):

```bash
npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/insights/assign-insights-module.ts --org=<organization_id>
npx tsx --require ./scripts/lib/server-only-shim.cjs scripts/insights/assign-insights-module.ts --org=<organization_id> --reason="..." --apply
```

**Leer flags por target** (la verdad live es Vercel; el ledger es el SSOT humano):

```bash
vercel env ls                                   # con .vercel/project.json = prj_d9v6gihlDq4k1EXazPvzWhSU0qbl
vercel env pull --environment=production        # verifica el valor efectivo
pnpm flags:audit --strict --no-vercel           # ledger vs código
```

Trampa verificada dos veces: un env var nuevo no lo ve una deployment construida antes; tras
`vercel env add` hace falta `vercel redeploy` del target.

**Canary de contrato por lane ecosystem** (staging con `pnpm staging:request`, que maneja bypass + auth;
producción con el token del consumer del gateway en `Authorization`, nunca pegado en docs):

```bash
pnpm staging:request "/api/platform/ecosystem/insights/catalog?externalScopeType=<tipo>&externalScopeId=<id>&organizationId=<org>"
pnpm staging:request POST "/api/platform/ecosystem/insights/editions?externalScopeType=<tipo>&externalScopeId=<id>" \
  '{"organizationId":"<org>","request":{"modules":["ico"],"period":{"start":"2026-08-01","endExclusive":"2026-09-01","timeZone":"America/Santiago"},"comparison":{"kind":"previous_period"},"audience":"client","outputs":["report_pdf"],"idempotencyKey":"insights-canary-<org>-2026-08"}}'
pnpm staging:request "/api/platform/ecosystem/insights/editions/<editionId>?include=evidence&externalScopeType=<tipo>&externalScopeId=<id>&organizationId=<org>"
```

Esperado: catálogo 200 · create 202 `ready_for_review` · replay misma edición · `depth` distinto con la
misma key 409 · org sin módulo 404. (`Idempotency-Key` de lane: agregar el header en el POST.)

**Canary del gateway** (repo `efeonce-mcp`, tras `pnpm build`; sólo lectura):

```bash
GREENHOUSE_ECOSYSTEM_API_URL=https://<greenhouse-env> \
GREENHOUSE_ECOSYSTEM_TOKEN=$(gcloud secrets versions access latest --secret=efeonce-mcp-gateway-greenhouse-token --project=efeonce-group) \
GREENHOUSE_ECOSYSTEM_VERCEL_BYPASS_SECRET=<solo staging> \
node scripts/greenhouse-insights-canary.mjs <orgConModulo> --deny <orgSinModulo> --edition <editionId>
```

**Regenerar y validar artefactos MCP** (obligatorio al tocar tools o la skill servida):

```bash
pnpm mcp:manifest:generate && pnpm mcp:manifest:check
pnpm mcp:skills:generate && pnpm mcp:skills:check
pnpm skills:mirrors
```

**Tests del dominio:**

```bash
pnpm vitest run --project unit src/lib/efeonce-insights src/lib/api-platform/resources/insights-lanes.test.ts src/mcp
pnpm test:live src/lib/efeonce-insights      # requiere proxy PG (pnpm pg:connect); leer "passed", no "skipped"
pnpm typecheck
```

**Señales:** `insights.editions.failed_recent` y `insights.editions.stuck_generation` en el overview de
reliability (módulo `insights`); ambas deben estar en `ok` (steady 0).

**Revertir:**

1. Apagar generación (primer y suficiente freno): `vercel env rm INSIGHTS_GENERATION_ENABLED <target>` o
   ponerlo en `false` + `vercel redeploy` del target; actualizar el ledger. Las rutas siguen existiendo y
   responden 503 `generation_disabled`; las lecturas siguen funcionando.
2. Revertir el código: revert del PR #236 en `main` vía release control plane (skill
   `greenhouse-production-release`; NUNCA push directo a `main`). El PR también contiene TASK-1801 y el
   scope `insights.write`: revertirlo entero afecta la landing de contacto y la paridad de scopes con el
   gateway v1.5.0.
3. `pnpm migrate:down` **sólo en un entorno sin datos reales**: en la instancia compartida destruiría
   `EO-INS-000012/13/14`, marcaría las capabilities como deprecated y borraría el módulo `insights_v1`.
   Con ediciones emitidas en el futuro, forward-fix (§4.8).
4. Gateway: revertir PR #12 en `efeonce-mcp` y bajar `surface-baseline.json`; el scope en Entra puede
   quedar sin clientes (no rompe nada mientras nadie lo porte).

---

## 13. Referencias

- Arquitectura: [EFEONCE_INSIGHTS_ARCHITECTURE_V1.md](EFEONCE_INSIGHTS_ARCHITECTURE_V1.md) (§4 modelo,
  §5 datos/ventana, §6 plan, §7 API/MCP/authz, §14 estado e invariantes).
- ADR: [EFEONCE_INSIGHTS_PLATFORM_DECISION_V1.md](EFEONCE_INSIGHTS_PLATFORM_DECISION_V1.md) (Accepted;
  delta 2026-09-15 «foundation en producción» y «vista web en Think»); [DECISIONS_INDEX.md](DECISIONS_INDEX.md).
- Eventos: [GREENHOUSE_EVENT_CATALOG_V1.md](GREENHOUSE_EVENT_CATALOG_V1.md) (`insights.*`).
- Doc funcional: [docs/documentation/insights/efeonce-insights-dominio-ediciones.md](../documentation/insights/efeonce-insights-dominio-ediciones.md).
- Manual: [docs/manual-de-uso/insights/operar-efeonce-insights-api-mcp.md](../manual-de-uso/insights/operar-efeonce-insights-api-mcp.md).
- Task: [TASK-1845](../tasks/in-progress/TASK-1845-efeonce-insights-domain-evidence-and-module-adapters.md)
  (§Rollout evidence 2026-09-15); dependientes TASK-1846, 1847, 1848, 1849, 1875 en `docs/tasks/to-do/`.
- Epic: [EPIC-045](../epics/to-do/EPIC-045-efeonce-insights-multiformat-intelligence.md); master UI flow
  [docs/ui/flows/EPIC-045-efeonce-insights-UI-FLOW.md](../ui/flows/EPIC-045-efeonce-insights-UI-FLOW.md).
- Skills: local `.claude/skills/efeonce-insights/SKILL.md` (= `.codex/…`); servida
  `docs/mcp/skills/efeonce-insights/SKILL.md`; `efeonce-mcp-platform` para federación.
- Ledgers: [FEATURE_FLAG_STATE_LEDGER.md](../operations/FEATURE_FLAG_STATE_LEDGER.md) (líneas 249–251,
  383–385, 646); [PRODUCTION_RELEASE_TIMING_LEDGER.md](../operations/PRODUCTION_RELEASE_TIMING_LEDGER.md)
  (línea 78).
- Gateway: repo `efeonce-mcp` `main` `cad57b31d` (PR #12) y `c966c5c` (docs); `README.md` líneas 82–83;
  [EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md](EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md);
  [docs/operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md](../operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md).
- Invariantes transversales aplicados: ISSUE-172 (`lpad` recorta) en
  [SQL_DATE_MATH_AGENT_INVARIANTS.md](agent-invariants/SQL_DATE_MATH_AGENT_INVARIANTS.md); migraciones en
  `.claude/rules/migrations.md` (una sola base compartida; código primero).
- Archivo de hechos de la sesión (fuente prevalente para cifras de rollout): `/tmp/task1845-session-facts.md`
  (efímero; su contenido está reflejado en la task, la arquitectura §14 y los ledgers).
