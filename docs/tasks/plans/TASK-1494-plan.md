# Plan — TASK-1494 Globe Reference Intelligence / Style DNA

## Discovery summary

- El repo real contradice gran parte de `Current Repo State`: ya existen
  `packages/contracts/src/reference-intelligence.ts`, `packages/domain/src/reference-intelligence.ts`,
  `packages/database/src/stores/reference-intelligence-store.ts` y la migración
  `packages/database/migrations/0009_reference_intelligence_style_dna.sql`.
- Ya están implementados `ReferenceProfileV1`, command/reader del spine, cache por
  `(workspace_id, reference_sha256, analysis_model_version)`, leases de concurrencia, estilos versionados,
  materialización server-side, conditioning en el path de generación, recomendación auto-route read-only y
  hechos separados de ruta recomendada/seleccionada/ejecutada.
- El gap reproducible es el Delta 2026-07-22: `apps/studio-web/src/app.ts` registra Reference Intelligence con
  sólo el store. No existe ninguna implementación de `ReferenceAssetIdentityPort` ni
  `ReferenceAnalysisExecutorPort`; por eso `globe.lab.reference.analyze` siempre degrada a
  `dependency_unavailable` y la librería Style DNA queda vacía.
- TASK-1467 ya entrega el source of truth de assets (`AssetProvenanceStorePort`) y el private-ingest
  content-addressed (`InputResolverPort`). No se creará un índice de assets paralelo.
- `sharp` no existe hoy en el workspace. Se justifica incorporarlo sólo en `creative-runner` para decodificar
  formatos de imagen de forma server-only; el agrupamiento de color será propio, fijo y determinista.
- `REFERENCE_INTELLIGENCE_COVERAGE.ui` ya es `available` por la promoción posterior de TASK-1505. La expectativa
  original `ui: policy-blocked` está stale y no se revertirá; el command seguirá fail-closed si los adapters o el
  proveedor no están configurados.
- No hay colisión de archivos con los cambios locales de TASK-1505 salvo el riesgo compartido de
  `apps/studio-web`; los archivos actualmente modificados por TASK-1505 se preservarán y no se editarán.

## Solution quality assessment

- Causa raíz: composición incompleta del runtime, no falta de UI ni de persistencia.
- Primitive canónica: mantener `registerReferenceIntelligenceCapabilities` y sus ports; implementar adapters
  sobre `AssetProvenanceStorePort`, `InputResolverPort`, `SpendFencePort` y el provider adapter existente.
- No se introducirá un endpoint, store, provider SDK o payload browser paralelo.

## Access model

- `routeGroups` / `views` / startup policy: no cambian.
- Capability: conserva `GLOBE_LAB_EXPERIMENT_CAPABILITY` y trusted workspace derivado server-side.
- Tenant boundary: toda resolución comienza con `context.workspaceId`; asset/profile desconocido y cross-workspace
  colapsan a `not_found` sin confirmar existencia.

## Architecture decision

- ADR existente: la ADR de Efeonce Globe y SPEC de Model Lab ya fijan Full API Parity, private-ingest, provider
  seam, spend fence y boundary Globe↔Greenhouse.
- No se requiere ADR nueva: se completa el wiring previsto por TASK-1494 sin cambiar source of truth, topología,
  auth, schema público ni provider ownership.
- Decisión del Open Question: extender `CreativeProviderAdapter` con una operación opcional y tipada de análisis,
  en vez de inventar un provider client/carril fuera de `packages/provider-contract`. El executor del runner es
  quien resuelve bytes, calcula paleta y aplica kill switch/fence; el adapter sólo produce evidencia semántica
  saneada.
- Conditioning: mantener la compilación textual provider-neutral existente; no fingir soporte de parámetros
  nativos no verificados.

## Backend/data contract

- Source of truth: `AssetProvenanceStorePort` para identidad/derechos, `reference_profiles` para el perfil y
  `reference_analysis_claims` para exclusión/idempotencia.
- Contract surface: contratos existentes `ReferenceProfileV1`, `ReferenceAnalysisExecutorPort`, command
  `globe.lab.reference.analyze` y reader `globe.lab.reference.profile.get`; extensión server-internal y aditiva del
  provider seam.
- Invariantes: bytes nunca cruzan wire/log; asset debe ser imagen activa, limpia, elegible y con derechos
  utilizables; scores y strength en `[0,1]`; pesos de paleta suman 1; cache tenant-scoped; mismo input/model version
  no vuelve a reservar gasto; errores upstream se sanitizan.
- Concurrencia: se conserva el lease SQL previo al análisis y el unique key por workspace/hash/model version.
- Migración: ninguna nueva prevista; `0009` ya es aditiva y suficiente. Verificar tests/readback de store.
- Rollback: retirar wiring/extensión y mantener perfiles existentes legibles; kill switch del Lab corta cualquier
  análisis. Sin backfill.
- Rollout: local code-complete; `GLOBE_LAB_PROVIDER=fake` o adapter ausente falla cerrado. Canary real/billable y
  promoción de runtime quedan pendientes de autorización humana separada.

## Skills

- `greenhouse-globe`: boundary, Full API Parity, provider seam, private-ingest y gates de cierre.
- `software-architect-2026`: audit brownfield, tenant isolation, fallo/degradación y decisión del seam.
- `greenhouse-task-execution-hook`: preflight y lifecycle de TASK-1494.
- `greenhouse-task-planner`: sólo consistencia del artefacto task/plan; no dirige la implementación.

## Subagent strategy

`sequential` — no autorizado `--subagents`; además, los cambios de provider contract, runner y wiring son
causalmente dependientes. No se crearán subagentes.

## Execution order

1. Ejecutar baseline `pnpm check && pnpm build` en `efeonce-globe` y registrar cualquier error preexistente.
2. Implementar el adapter tenant-safe de identidad de referencia sobre `AssetProvenanceStorePort`, con negativos
   cross-workspace, lifecycle/scan/rights/media y sin exponer storage handles.
3. Extender el provider seam tipado para análisis semántico; implementar el carril Vertex sobre el transport
   keyless ya existente, con schema/output estrictos y sin body crudo.
4. Implementar `ReferenceAnalysisExecutor` en `creative-runner`: resolver bytes por `InputResolverPort`, extraer
   paleta determinista local con versión explícita, aplicar kill switch + estimate/reserve/settle/release y devolver
   evidencia saneada.
5. Cablear ambos adapters en `studio-web` usando el mismo asset store, input resolver, spend fence y provider
   seleccionado; mantener inyección de dobles para tests y fail-closed en fake/misconfiguración.
6. Ampliar tests de contracts/domain/runner/provider/app para cache sin re-gasto, determinismo, errores canónicos,
   cross-workspace, conditioning/materialización y registro real del command/reader. Registrar todo test nuevo en
   el script manual de su package.
7. Ejecutar `pnpm check && pnpm build`; correr task/ops/QA/docs gates en Greenhouse.
8. Sincronizar SPEC Model Lab/Producer, documentación funcional, manual operativo, task, changelog y Handoff.

## Files to create

- `../efeonce-globe/apps/creative-runner/src/reference-analysis.ts`
- `../efeonce-globe/apps/creative-runner/src/reference-analysis.test.ts`
- `../efeonce-globe/apps/studio-web/src/reference-intelligence-adapters.ts`
- `../efeonce-globe/apps/studio-web/src/reference-intelligence-adapters.test.ts`

## Files to modify

- `../efeonce-globe/packages/provider-contract/src/index.ts` — operación/tipos server-internal de análisis.
- `../efeonce-globe/apps/creative-runner/src/vertex-adapter.ts` y test — evidencia semántica por transport keyless.
- `../efeonce-globe/apps/creative-runner/src/index.ts` — exports del executor.
- `../efeonce-globe/apps/creative-runner/package.json` + `pnpm-lock.yaml` — dependencia server-only `sharp` y test.
- `../efeonce-globe/apps/studio-web/src/app.ts` y tests focales — DI/wiring productivo.
- Documentos canónicos de Greenhouse de TASK-1494 y Creative Studio, sin crear docs gobernantes en Globe.

## Files to delete

- Ninguno.

## Risk flags

- Una nueva llamada Vertex puede ser billable: todos los tests usarán transports falsos; no se ejecutará canary
  real ni se cambiarán flags/env/deploy.
- `sharp` agrega binario nativo al build de `creative-runner`; el build Docker/workspace debe probarse.
- La API de análisis debe ser opcional para no romper Fal/Veo/Omni/Fake; adapter ausente significa
  `dependency_unavailable`, nunca evidencia inventada.
- El checkout compartido conserva cambios no relacionados de TASK-1505; no se hará branch switch, commit, push,
  deploy, migración viva ni edición de sus archivos modificados.

## Open questions resolved

- Seam: operación tipada opcional dentro de `CreativeProviderAdapter`, no segundo provider client.
- Paleta: `sharp` sólo para decode/normalización; histograma/clustering estable propio, versionado y determinista.
- Conditioning: instrucción textual provider-neutral existente; params nativos quedan para una ruta verificada.
- Runtime canary: la aprobación posterior permitió desplegar y probar negativos live; el positivo no puede
  ejecutarse sin un asset gobernado elegible y permanece operativamente bloqueado, sin saltar readiness/rights.

## Execution result — 2026-07-22

- Los cuatro slices y el wiring de Studio se implementaron según el plan; no se usaron subagentes. En la
  continuación autorizada se pusheó sólo TASK-1494 y se aplicó el rollout internal canónico.
- `pnpm check && pnpm build` PASS en Globe; commit `a5e128935577`, CI, migración y deploys canónicos PASS.
- Audit final
  [`TASK-1494-qa-release-audit-2026-07-22.md`](../../audits/TASK-1494-qa-release-audit-2026-07-22.md) =
  `BLOCK` para cierre operativo positivo por falta de un asset gobernado elegible.
- Lifecycle: `complete`; código y despliegue internal completos; canary positivo operativamente bloqueado.
