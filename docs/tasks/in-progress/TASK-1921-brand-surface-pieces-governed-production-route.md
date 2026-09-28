# TASK-1921 — Ruta productiva de las piezas de marca por superficie (Full API Parity)

## Delta 2026-09-28 — recalibración antes de ejecutar (decisiones del operador y Discovery)

Manda sobre el cuerpo cuando se contradigan.

- **Dueño de dominio (operador, 2026-09-28):** «De momento será Greenhouse; luego será Marketing Studio o Globe, aún no lo
  decido». La capability vive en Greenhouse (`src/lib/brand-surfaces/production/**`, `api/platform/app/brand-surfaces`)
  y nace **extraction-ready**: el contrato del lane y el command son la costura; el worker, la cola y el asset no
  filtran nombres de dominio hacia el caller. Mover el dueño después no cambia la forma del pedido.
- **Glitch entra en la misma ruta (operador):** una sola cola y un solo consumer sirven a La órbita (`graphic-line-deck`,
  `-stills`, `-overlays`) y a Glitch (`glitch-carousel`, `-stills`, `-overlays`); el command de Glitch reutiliza
  `planGlitchEdition` y `GlitchAssetRequest`.
- **Plates y fotos (operador):** se suben ahora por el uploader canónico (`/api/assets/private`, contexto nuevo) y el
  pedido los referencia por `assetId`; nunca por ruta. TASK-1931 agrega después el banco curado sin romper el pedido.
- **Errores:** el lane `api/platform/app` usa `ApiPlatformError` + tabla de traducción por dominio (patrón
  `insights-errors.ts`), no `canonicalErrorResponse`.
- **Piezas que la spec no nombraba:** despachador propio cableado en `/artifact-render/dispatch` del ops-worker (sin él
  la cola no se drena); el flag vive en TRES runtimes (Vercel, ops-worker, Job); la materialización de assets y los
  pintores de selección/CTA salen de `scripts/` a `src/lib` (hoy importan `scripts/creative/**`, que no entra a la
  imagen del Job); los catálogos `png-set` completan con N PNG sin PDF.
- **Fuera de esta task por dependencia:** el criterio del Delta (b) sobre `validateDeckPlan`/rastro de slots/banco
  (TASK-1929–1931 en diseño).
- **Rollout:** la task llega a *code complete, rollout pendiente*; aplicar la migración en la instancia compartida, los
  deploys, el flag ON en staging y el release de `efeonce-mcp` requieren autorización explícita.

## Delta 2026-09-27 (d) — Glitch tiene su taller local (TASK-1923)

- Los catálogos de Glitch (`glitch-carousel`, `glitch-stills`, `glitch-overlays`) y el mapper puro
  `planGlitchEdition(manifest, { narratorLicenseStatus, photoSizes })` (`src/lib/glitch-composition/`) existen; el
  taller es `pnpm glitch:compose`. La ruta productiva de Glitch (command, API, `artifact-worker`, MCP, capability) sigue
  siendo de esta task o de una nueva: el command debe reutilizar el mapper y los `GlitchAssetRequest` (foto con sus
  `fractures`, detalle de la lente), igual que el CLI; nunca una copia del plan.

## Delta 2026-09-27 (c) — documento multipágina y contrato 0.1.2 (cerrado por TASK-1927)

- El command de esta task debe aceptar también el **intent de documento** (un intent con `pages`: brochure o
  propuesta). La función pura ya existe: `planSurfaceDocument(intent, { artifactId })` en
  `src/lib/brand-surfaces/document.ts`. Valida con `resolveSurfaceDocument` de AXIS, devuelve
  `{ catalog, use, plan, assets, manifest }` (una lámina por página y la unión de assets) y, ante un solo issue, no
  devuelve plan. `planFromManifest` es el paso compartido entre pieza y documento.
- El contrato vigente es `efeonce.surface-composition` **0.1.2** (`axis-tokens` 0.3.14, `axis-ui-contracts` 0.3.12, tag
  `v0.3.14`). El plan de una pieza devuelve además `use` y `layout`.
- `SurfaceAssetRequest` tiene un tercer tipo, `file` (el logo de un cliente, SVG o PNG): el consumer del
  `artifact-worker` debe materializarlo como hace `materializeAssets` del CLI. En producción ese archivo viene de
  Account 360 (TASK-1930), no de una ruta del repo.
- El CLI ya escribe la procedencia de pieza y de documento (`efeonce.brand-surface-document.provenance.v1`, con sha del
  intent, de cada plate y de cada archivo). Lo que sigue siendo de esta task es el asset store y la ruta gobernada.
- El catálogo `graphic-line-deck` pasó de 6 a 16 plantillas (32 frames en el scope `graphic-line` del gate); la
  contraportada de brochure sin foto usa el hook de CTA (`makeCtaHook`), así que el consumer necesita los DOS pintores.

## Delta 2026-09-27 (b) — recetas del deck al flujo de producto

- Nacen TASK-1928…TASK-1932. Lo que esta task recibe de ellas: plantillas nuevas de `graphic-line-deck` (TASK-1928,
  además de las de TASK-1927), plates por `assetId` desde el banco gobernado (TASK-1931, `resolvePlateForRecipe`),
  planes validados por `validateDeckPlan` (TASK-1929) con rastro de slots de `bindDeckSlots` (TASK-1930).
- TASK-1932 delega en el command de documento de esta task la confirmación de brochure, pitch y QBR (decks sin
  `Proposal`). La tool MCP para **proponer** decks es de TASK-1932; la de esta task sigue siendo pedir y leer piezas y
  documentos, sin duplicar la propuesta.

## Delta 2026-09-27

- Lo que esta task consume ya existe (TASK-1919, local en `develop`): catálogos
  `src/lib/artifact-composer/catalogs/graphic-line-{deck,stills,overlays}/` (+ `graphic-line-shared/`; 20 recetas
  aprobadas, 22 plantillas; son **tres**, no dos: las capas de video con alfa van en `graphic-line-overlays`), mapper puro
  `planSurfacePiece(intent, { artifactId })` en `src/lib/brand-surfaces` (devuelve `{ catalog, contentType, plan,
  assets, manifest }`; errores `SurfacePieceError.code`: `recipe-not-approved`, `recipe-outside-composer`,
  `surface-issues`, `recipe-without-template`, `missing-photo`, `invalid-intent`) y el CLI local
  `pnpm brand:compose` (`scripts/brand-surfaces/compose.ts`, que materializa assets e inyecta los pintores de selección
  y CTA con `createCatalog(options)`: el consumer del `artifact-worker` tiene que hacer lo mismo).
- El contrato AXIS va en `efeonce.surface-composition` **0.1.1** (`axis-ui-contracts` 0.3.7, `axis-tokens` 0.3.8, tag
  `v0.3.8`, fijado en Greenhouse); acepta intents 0.1.0.
- Hueco que hereda esta task: el CLI deja sólo el manifest de AXIS (`<id>.surface-manifest.json`); la procedencia
  versionada (hash del intent, SHA-256 de plates) y el asset store son de aquí.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P2`
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
- Epic: `none`
- Status real: `Code complete, rollout pendiente (2026-09-28): Slices 1–6 en develop (37655fa93, push autorizado; sin promover a main). Migración aplicada. Flag BRAND_RENDER_ENABLED OFF en los tres runtimes. Falta: smoke de los seis catálogos en staging con el flag, federación de las tools en efeonce-mcp y los criterios Delta b (TASK-1929/1930/1931)`
- Rank: `TBD`
- Domain: `creative|brand|platform`
- Blocked by: `none`
- Branch: `Greenhouse develop; efeonce-mcp main; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

TASK-1919 deja las piezas de «La órbita» por superficie como dos catálogos del Artifact Composer y un comando local.
Esta task les da ruta productiva gobernada: un command en `src/lib` que encola el render de una pieza desde un intent
validado por AXIS, un endpoint en `api/platform/app/**` con capability propia y grant a un rol real, un consumer nuevo
del Job `artifact-worker`, el asset versionado con procedencia y una tool MCP federada, todo detrás de un flag
registrado en el ledger.

## Why This Task Exists

Sin esta task, producir una pieza de marca por superficie depende de que alguien corra `pnpm brand:compose` en su
equipo: no hay autorización fina, no queda un asset versionado con procedencia, un agente no puede pedirla por MCP y
Nexa no puede operarla. Eso viola Full API Parity: la capability existe sólo como herramienta local. El
`artifact-worker` ya despacha consumers por un registro tipado (Proposal, Insights), así que el camino correcto es un
consumer más, no un servicio nuevo.

## Goal

- Una persona o agente autorizado pide una pieza por superficie con un intent y recibe un asset versionado con
  procedencia, sin correr nada en local.
- Un solo primitive (el command) alimenta endpoint, tool MCP y, por construcción, a Nexa.
- El render corre sólo en el Job `artifact-worker`, apagado por flag hasta completar la verificación en staging.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` (lane `api/platform/app`)
- `docs/architecture/GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_ARTIFACT_RENDER_PIPELINE_V1.md` (Job `artifact-worker`, registro de consumers)
- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md`
- `docs/operations/brand-graphic-line/EFEONCE_SURFACE_COMPOSITION_V1.md`

Reglas obligatorias:

- El render corre sólo en el Job `artifact-worker`; nunca Chromium en Vercel ni en `ops-worker`.
- El worker es la composition root: el consumer vive en `services/artifact-worker/consumers/` y el dominio no importa
  de `services/`.
- Capability nueva ⇒ grant a ≥1 rol real de `src/config/role-codes.ts` en el mismo PR
  (`capability-grant-coverage.test.ts`); nunca `roleCodes.includes(...)` inline.
- El intent se valida con el mapper de TASK-1919 (que usa el contrato AXIS) antes de encolar; una receta no aprobada
  se rechaza en el command, nunca en el worker.
- El flag se lee en más de un runtime: se declara en `services/artifact-worker/deploy.sh` y en Vercel, y se registra
  en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` en el mismo PR.
- Tool MCP nueva = cinco piezas en `efeonce-mcp` (tool, scope, manifest, tests, release); federar es parte de listo.

## Normative Docs

- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- `docs/operations/runbooks/production-release.md`
- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md` (para la pregunta abierta de dueño)
- `docs/tasks/in-progress/TASK-1919-graphic-line-surfaces-artifact-composer.md`

## Dependencies & Impact

### Depends on

- `TASK-1919`: mapper `src/lib/brand-surfaces/`, catálogos `graphic-line-deck` y `graphic-line-stills`, fondo
  transparente en el motor.
- `services/artifact-worker/consumer-contract.ts` (`RenderConsumer`, `RenderJobView`, `RenderedArtifact`) y
  `consumers/{index,insights,proposal}.ts`.
- `src/lib/entitlements/runtime.ts`, `src/config/entitlements-catalog.ts`, `capabilities_registry`.
- Repositorio `efeonce-mcp` (`src/providers/**`, manifiestos generados).

### Blocks / Impacts

- Consumidores futuros: Marketing Studio (EPIC-049) si el operador lo nombra dueño; Nexa por construcción.
- `artifact-worker` es un Job compartido con Proposal e Insights: un consumer nuevo no puede degradar a los otros.
- Release control plane: el deploy del worker ya está en `RELEASE_DEPLOY_WORKFLOWS`; no se agrega workflow nuevo.

### Files owned

- `src/lib/brand-surfaces/commands/**` [verificar] nombre final según el dueño de dominio
- `src/lib/brand-surfaces/store/**` [verificar]
- `src/app/api/platform/app/brand-surfaces/**` [verificar] prefijo según el dueño de dominio
- `services/artifact-worker/consumers/brand-surfaces.ts`
- `services/artifact-worker/consumers/index.ts`
- `services/artifact-worker/deploy.sh` (declaración del flag)
- `migrations/<timestamp>_task-1921-brand-surface-render-jobs.sql` (si el plan confirma tabla propia)
- `src/config/entitlements-catalog.ts` y `src/lib/entitlements/runtime.ts` (capability y grant)
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- `efeonce-mcp/src/providers/**` (tool, scope, manifest, tests)
- docs técnica, funcional y manual de la capability

## Current Repo State

### Already exists

- Job `artifact-worker` con registro tipado de consumers (`consumer-contract.ts`, `consumers/proposal.ts`,
  `consumers/insights.ts` con su mapa `CATALOGS`), flag propio por consumer (`isEnabled()`), claim atómico por dominio
  y dominio de observabilidad propio.
- Lane `src/app/api/platform/app/**` con dominios existentes (insights, hiring, commercial, etc.).
- Catálogo de entitlements y guard de cobertura capability ⇒ grant.
- Gateway `efeonce-mcp` con providers federados y manifiestos generados.

### Gap

- No existe command, store ni cola de render para piezas de marca por superficie.
- No existe endpoint ni capability; nadie puede pedir una pieza sin correr el CLI local.
- El `artifact-worker` no conoce los catálogos de TASK-1919.
- No hay tool MCP ni flag.
- No está decidido el dueño de dominio (pregunta abierta).

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: command y store en `src/lib/brand-surfaces/`; endpoint en `src/app/api/platform/app/**`; consumer en
  `services/artifact-worker/consumers/`; tool en el repositorio `efeonce-mcp`
- Future candidate home: `worker`
- Boundary: el command de encolado (nombre propuesto `requestBrandSurfaceRender`, fijado en el plan) es el único escritor; endpoint, tool MCP y Nexa
  lo consumen; el consumer del worker sólo lee el manifiesto persistido y adjunta el asset por el command de cierre
- Server/browser split: `sólo server — command, store, credenciales y render nunca llegan al browser`
- Build impact: `el consumer suma los dos catálogos al bundle del Job artifact-worker; Vercel sólo importa tipos y la entrada /pure`
- Extraction blocker: `la cola y el asset viven en el PostgreSQL compartido; el Job comparte imagen y despliegue con Proposal e Insights`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `api`
- Source of truth afectado: contrato AXIS `efeonce.surface-composition` (valores y recetas); cola y assets de render
  de piezas de marca en PostgreSQL (tabla nueva o reutilizada, a decidir en el plan) y archivos en el bucket de
  assets del composer [verificar]
- Consumidores afectados: endpoint `api/platform/app`, tool MCP federada, Nexa por construcción, Job `artifact-worker`
- Runtime target: `staging` y `production` (Vercel + Cloud Run Job `artifact-worker`)

### Contract surface

- Contrato existente a respetar: `RenderConsumer`/`RenderJobView`/`RenderedArtifact`
  (`services/artifact-worker/consumer-contract.ts`), mapper de TASK-1919, `canonicalErrorResponse`, contrato del lane
  `api/platform/app`
- Contrato nuevo o modificado: command de encolado y command de cierre con asset; reader de estado y descarga;
  `POST`/`GET` en `api/platform/app/<dominio>/brand-surfaces/**`; tool MCP de pedir y leer pieza
- Backward compatibility: `gated` — detrás del flag, apagado por defecto; Proposal e Insights no cambian
- Full API parity: UI futura, endpoint, MCP y Nexa llaman al mismo command; el worker no tiene lógica de negocio

### Data model and invariants

- Entidades/tablas/views afectadas: tabla de jobs de render de piezas de marca (nueva, additive) o reutilización de
  una cola existente si el plan lo justifica; asset versionado
- Invariantes que no se pueden romper:
  - Ningún intent con issues AXIS ni receta no aprobada llega a la cola.
  - El manifiesto persistido al encolar es inmutable; el worker renderiza exactamente ese manifiesto.
  - Un asset nunca se sobreescribe: una re-generación es una versión nueva con su procedencia (versiones AXIS, receta,
    hash del intent, SHA-256 de plates, id de job, actor).
  - Un consumer apagado nunca reclama jobs; encender este consumer no enciende a Proposal ni a Insights.
- Write-target allowlist: declarar la tabla nueva en el allowlist de destinos del dominio si el dominio dueño tiene
  boundary test; si no lo tiene, dejar la justificación en la migración
- Tenant/space boundary: `ownerOrgId` del job = organización del actor (Efeonce para marca propia); el command rechaza
  un `organizationId` que el actor no puede operar
- Idempotency/concurrency: clave de idempotencia = hash del intent + plates + versiones AXIS por organización; el
  mismo pedido devuelve el job existente; claim atómico del worker (`FOR UPDATE SKIP LOCKED` o el patrón vigente)
- Audit/outbox/history: evento outbox al encolar y al cerrar (catálogo de eventos) y transiciones append-only del job

### Migration, backfill and rollout

- Migration posture: `additive` (tabla nueva con bloque DO anti pre-up-marker) si el plan confirma tabla propia
- Default state: `flag OFF` en todos los runtimes
- Backfill plan: sin backfill; no hay datos previos
- Rollback path: flag OFF en Vercel y en el Job (vía `deploy.sh` + `gcloud run jobs update`), revert PR; la tabla
  additive puede quedar
- External coordination: release del `efeonce-mcp` con la tool nueva; deploy del Job `artifact-worker` por el release
  control plane; alta del scope MCP si se crea uno nuevo

### Security and access

- Auth/access gate: capability nueva (propuesta `brand.surface_piece.render`, acción `create`/`read`) con grant a
  `efeonce_admin` y `designer` [verificar] roles finales; token MCP con scope de escritura propio
- Sensitive data posture: sin PII; fotos de marca propia; los plates suben por el uploader canónico de assets, nunca
  como ruta local
- Error contract: `canonicalErrorResponse` con códigos nuevos en `CanonicalErrorCode` (intent inválido, receta no
  aprobada, flag apagado); issues AXIS saneados; `captureWithDomain` con dominio propio
- Abuse/rate-limit posture: idempotencia por hash; tope de jobs en cola por organización [verificar] patrón de Insights

### Runtime evidence

- Local checks: tests del command (intent inválido, receta no aprobada, idempotencia), del consumer con catálogo real,
  cobertura capability ⇒ grant, tests de la tool en `efeonce-mcp`
- DB/runtime checks: migración aplicada y verificada contra `information_schema`; un job de staging recorre
  encolado → claim → render → asset
- Integration checks: `pnpm staging:request POST /api/platform/app/...` con intent de ejemplo; llamada real a la tool
  MCP en staging
- Reliability signals/logs: señal de jobs atascados del consumer (patrón de Insights) y logs del Job con su dominio
- Production verification sequence: ver `## Rollout Plan & Risk Matrix`

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se actualiza solo.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

### Capability Definition of Done — Full API Parity gate

- [ ] **Lógica en el primitive, no en la UI.** La regla vive en `src/lib/**` (command/reader).
- [ ] **Modelada como aggregate/recurso/command, no como click-handler.**
- [ ] **Read** como reader canónico; **write** como command con authorization fina, idempotencia, audit/outbox,
      errores canónicos y observabilidad.
- [ ] **Capability + grant en el MISMO PR** con coverage test.
- [ ] **Camino programático declarado:** `api/platform/app` + tool MCP federada.
- [ ] **Write apto para `propose → confirm → execute`**, sin integración específica de Nexa.
- [ ] **Un primitive, muchos consumers:** cero lógica duplicada entre endpoint, MCP y worker.
- [ ] **Parity check = SÍ.**

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

### Slice 1 — Dueño de dominio y persistencia

- Resolver con el operador la pregunta abierta de dueño (Marketing Studio vs dominio interno de marca) y fijar
  prefijos de ruta, capability y dominio de observabilidad.
- Migración additive de la cola de jobs y del asset versionado (si el plan confirma tabla propia), con bloque DO de
  verificación y tipos regenerados.

### Slice 2 — Command, reader y capability

- Command de encolado: valida con el mapper de TASK-1919, calcula clave de idempotencia, persiste manifiesto
  inmutable, emite outbox.
- Command de cierre: adjunta el asset como versión nueva con procedencia.
- Reader de estado y descarga.
- Capability en `capabilities_registry` + `entitlements-catalog.ts` y grant a ≥1 rol real en `runtime.ts`, con
  coverage test.

### Slice 3 — Endpoint `api/platform/app`

- `POST` para pedir la pieza y `GET` para estado y asset, con `canonicalErrorResponse` y códigos nuevos.
- Gate del flag en el endpoint.

### Slice 4 — Consumer del `artifact-worker`

- `services/artifact-worker/consumers/brand-surfaces.ts` que implementa `RenderConsumer` con su mapa `CATALOGS`
  (`graphic-line-deck`, `graphic-line-stills`), flag propio, claim atómico y dominio de observabilidad propio.
- Alta en `consumers/index.ts`; flag declarado en `services/artifact-worker/deploy.sh`.

### Slice 5 — Tool MCP federada

- En `efeonce-mcp`: tool de pedir y leer pieza, scope, manifiesto regenerado, tests y release.

### Slice 6 — Flag, ledger y documentación

- Fila del flag en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` con sus runtimes y fila en «Pendientes de acción».
- Triple documentación: técnica (arquitectura del composer/render pipeline), funcional y manual de uso.

## Out of Scope

- Cambios de plantillas o recetas (TASK-1919 y aprobaciones del operador).
- UI visible en el portal para pedir piezas (task `ui-ux` aparte si se decide).
- Video o animación en el worker.
- Publicación en canales (redes, pantallas DOOH): esta task entrega el asset, no lo publica.

## Detailed Spec

- **Forma del pedido**: `{ intent, plates: [{ slotId, assetId }], organizationId }`; los plates se referencian por
  asset ya subido por el uploader canónico, nunca por ruta.
- **Vista del worker**: `RenderJobView.catalogName` ∈ {`graphic-line-deck`, `graphic-line-stills`};
  `outputTarget` sale del catálogo; el manifiesto lo trae `getManifest(jobId)`.
- **Procedencia del asset**: versiones AXIS instaladas en el Job, receta, hash del intent, SHA-256 de cada plate,
  `jobId`, actor (persona o agente con su token), fecha.
- **Flag** (nombre propuesto `BRAND_SURFACES_RENDER_ENABLED`): se lee en el endpoint (Vercel) y en `isEnabled()` del
  consumer (Job). Apagarlo en uno solo no alcanza para detener el flujo; ambos se operan juntos.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3 y Slice 4 (paralelo) → Slice 5 → Slice 6.
- Slice 2 (capability + grant) MUST ship antes que el Slice 3: sin grant el endpoint no tiene quién lo pueda usar y
  el coverage test rompe.
- Slice 4 MUST desplegarse con el flag OFF en el Job antes de encender el endpoint en cualquier ambiente.
- Slice 5 no se libera hasta que el endpoint esté verificado en staging.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El consumer nuevo degrada o bloquea a Proposal/Insights en el Job compartido | artifact-worker | medium | flag propio apagado; claim por dominio; smoke de los tres consumers en staging antes de prod | señal de jobs atascados por consumer; logs del Job |
| El flag queda encendido en Vercel y apagado en el Job (o al revés) | release / cron | medium | declarar en `deploy.sh` + `--update-env-vars`; verificar la revisión activa; fila en el ledger con ambos runtimes | jobs `queued` que no avanzan |
| Capability sin grant rompe el build | entitlements | low | grant en el mismo PR; `capability-grant-coverage.test.ts` | CI rojo |
| La migración queda registrada sin ejecutar el SQL | migración | low | marker `-- Up Migration` + bloque DO con `RAISE EXCEPTION` | `pnpm migrate:up` falla o verificación en `information_schema` |
| La tool MCP se libera con contrato distinto al endpoint | MCP | medium | tests de paridad del manifiesto; smoke real en staging | `mcp:manifest:check` rojo |
| Un pedido repetido genera renders duplicados | cola de render | low | clave de idempotencia por organización | conteo de jobs por hash |

### Feature flags / cutover

- `BRAND_SURFACES_RENDER_ENABLED` (nombre propuesto), default `false` en Vercel (Production, staging, Preview) y en el
  Job `artifact-worker`. Encendido en staging tras smoke; en producción sólo con aprobación del operador y por el
  release control plane. Revert: `false` en ambos runtimes (Vercel env + `deploy.sh` y `gcloud run jobs update`);
  tiempo de revert menor a 10 minutos.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | la tabla additive puede quedar; si hace falta, migración `down` verificada en staging | minutos | si |
| Slice 2 | revert PR (capability y grant salen juntos) | minutos | si |
| Slice 3 | flag OFF en Vercel + redeploy | < 10 min | si |
| Slice 4 | flag OFF en el Job vía `deploy.sh` + update; revert del consumer en el siguiente release | < 10 min | si |
| Slice 5 | release anterior del `efeonce-mcp` | minutos | si |
| Slice 6 | revert de docs y fila del ledger al estado real | minutos | si |

### Production verification sequence

1. `pnpm migrate:up` en la instancia compartida + verificación de la tabla y sus constraints.
2. Deploy del Job a staging con flag OFF: Proposal e Insights renderizan igual (smoke de ambos).
3. Flag ON en staging (Vercel + Job): `pnpm staging:request POST` con un intent de ejemplo por catálogo; el job
   recorre encolado → claim → render → asset con procedencia.
4. Pedido con receta no aprobada: rechazo canónico, sin job en cola.
5. Tool MCP en staging contra el mismo endpoint.
6. Producción por el release control plane con flag OFF; encender sólo con aprobación del operador y repetir 3–5.
7. Vigilar la señal de jobs atascados y los logs del Job durante 7 días.

### Out-of-band coordination required

- Release del repositorio `efeonce-mcp` y alta del scope si se crea uno nuevo.
- Decisión del operador sobre el dueño de dominio antes del Slice 1.
- Promoción a producción por el release control plane (skill `greenhouse-production-release`), sin pushes a `develop`
  durante un release en vuelo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] El dueño de dominio quedó decidido por el operador y registrado en la task.
      — Evidencia: Delta 2026-09-28 (Greenhouse por ahora; luego Marketing Studio o Globe).
- [x] Un intent inválido o con receta no aprobada se rechaza en el command con código canónico y no crea job.
      — Evidencia: `__tests__/commands.test.ts` (`invalid_request`, `render_rejected` y `missing_source` sin escribir).
- [x] Dos pedidos idénticos de la misma organización devuelven el mismo job.
      — Evidencia: `commands.test.ts` (misma clave de idempotencia; el existente vuelve sin crear) + índice único
      (`organization_id`, `idempotency_key`) aplicado en la base.
- [x] La capability existe en `capabilities_registry` y en `entitlements-catalog.ts`, con grant a ≥1 rol real y
      coverage test verde.
      — Evidencia: seed de la migración `20260928052624397` verificado en la base; grant DESIGNER ∪ EFEONCE_ADMIN en
      `runtime.ts`; `pnpm test` completo verde (1871 archivos) el 2026-09-28.
- [ ] El endpoint `api/platform/app/**` responde con `canonicalErrorResponse` en todos sus errores.
      — Sin tildar: el lane `api/platform/*` usa su propio contrato (`ApiPlatformError` + tabla del dominio en
      `brand-render-errors.ts`, probada), no `canonicalErrorResponse`. Es la convención del lane; el criterio quedó
      mal redactado y requiere confirmación del operador.
- [ ] El consumer del `artifact-worker` renderiza ambos catálogos en staging y adjunta un asset versionado con
      procedencia completa.
      — Sin tildar: consumer probado con mocks (`consumers/brand-render.test.ts`); falta smoke real en staging con el
      flag prendido (autorización aparte).
- [ ] Con el flag OFF, el consumer no reclama jobs y el endpoint rechaza pedidos.
      — Parcial: con tests (`commands.test.ts` → `render_disabled`; `dispatch.test.ts` → no despacha). Falta
      verificarlo contra el runtime desplegado.
- [ ] Proposal e Insights renderizan igual en staging con el consumer nuevo desplegado.
      — Sin tildar: falta el canary en staging después del deploy de develop (37655fa93).
- [ ] La tool MCP está federada (tool, scope, manifiesto, tests, release) y opera contra staging.
      — Parcial: tools y lane ecosystem en Greenhouse (`mcp:manifest:check` verde, 67 tools). Falta la federación
      en `efeonce-mcp` (otro repo, requiere decisión del operador) y operarla contra staging.
- [x] El flag tiene fila en `FEATURE_FLAG_STATE_LEDGER.md` con sus dos runtimes y `pnpm docs:closure-check` pasa.
      — Evidencia: filas con los TRES runtimes (Vercel, ops-worker, Job); `docs:closure-check` exit 0 el 2026-09-28.
- [x] Documentación técnica, funcional y manual de uso publicadas.
      — Evidencia: §10 de `GREENHOUSE_ARTIFACT_RENDER_PIPELINE_V1.md`, filas del catálogo de eventos,
      `documentation/creative/render-gobernado-piezas-de-marca.md`, `manual-de-uso/creative/pedir-render-de-piezas-de-marca.md`.
- [ ] (Delta 2026-09-27 b) El command de documento acepta un plan validado por `validateDeckPlan` (TASK-1929) con rastro de slots (TASK-1930) y plates por `assetId` del banco (TASK-1931), y rechaza plates referenciados por ruta local.
      — Parcial: las fuentes sólo entran por `assetId` (una ruta local nunca se lee). `validateDeckPlan` y el rastro de
      slots dependen de TASK-1929/1930, en curso.
- [x] (Delta 2026-09-27 b) Esta task no expone una tool MCP para proponer planes de deck (es de TASK-1932); su tool pide y lee piezas y documentos.
      — Evidencia: tools `request_brand_render`, `get_brand_render_request`, `list_brand_render_requests`.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` (completo al cerrar) y `pnpm build`
- `pnpm migrate:status` y verificación de la tabla
- `pnpm mcp:manifest:check`
- `pnpm staging:request` contra el endpoint
- Smoke del Job `artifact-worker` en staging con los tres consumers

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] el ledger de flags refleja el estado real de cada runtime al cerrar
- [ ] si el flag queda OFF en producción, el cierre dice `code complete, rollout pendiente`

## Follow-ups

- UI en el portal para pedir y revisar piezas (task `ui-ux` consumidora de esta).
- Plantillas para recetas que el operador apruebe después (paleta DOOH, pDOOH).

## Open Questions

- **Dueño de dominio (para el operador):** ¿estas piezas pertenecen a Efeonce Marketing Studio (EPIC-049,
  `studio.*`, repo `efeonce-marketing-studio`) o a un dominio interno de marca en Greenhouse? De la respuesta dependen
  el prefijo de la ruta, el nombre de la capability, el scope MCP y quién opera la cola. Si es Marketing Studio, la
  escritura pasa por su registro de operaciones y su canje de autoridad; si es interno, vive en `src/lib/brand-surfaces/`.
- ¿Tabla de cola propia o reutilización de una cola existente del composer? Se decide en el plan con el patrón de
  Insights como referencia.
