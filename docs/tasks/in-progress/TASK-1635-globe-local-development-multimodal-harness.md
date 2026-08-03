# TASK-1635 — Globe Local Development Loop

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
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
- Epic: `EPIC-028`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ops|delivery|globe|tooling`
- Blocked by: `none`
- Branch: `Greenhouse develop; Globe main; sin worktrees`
- GitHub Issue: `optional`

## Summary

> ⚠️ **La tesis de esta task cambió DOS veces durante su ejecución.** Lo que vale es el
> `## Delta 2026-08-03 — la premisa era falsa` al final del archivo; el cuerpo de abajo conserva
> el razonamiento intermedio porque explica por qué se descartó, no porque siga vigente.

Ver un cambio de UI de Globe costaba construir una imagen y desplegar tres runtimes. Esta task
entrega `pnpm globe:dev`: un comando que levanta el Producer con HMR sobre el árbol React real,
sirviendo el **mismo shell que producción** con un bundle que apunta al dev server de Vite.

Los datos salen del fixture del Producer que ya existía en el repo, y opcionalmente de la API
privada real —donde el dev shell actúa como el BFF, sosteniendo la identidad server-side.

## Why This Task Exists

`apps/studio-client` ya tiene Vite (`pnpm dev`) y `apps/studio-web` ya sirve un bundle compilado —
`seam:smoke` incluso lo sirve por el shell real bajo la CSP real. Lo que **no** existe es el eslabón entre
ambos: un comando que levante Globe localmente con **HMR** sobre un shell ejecutable. `studio-web` no tiene
modo `dev`, y el bundle React se registra desde el manifest de `dist/client`, por lo que la iteración visual
queda acoplada a una recompilación completa. Tampoco existe un contrato operativo único que clasifique qué se
prueba con fixtures, qué se prueba contra un provider real y qué exige Cloud Run: las piezas existen
(`check`, `gvc:fixture`, `globe:runtime-drift`, `smoke-private-api`, `production-promotion-cli`, 10 canarios)
pero sin composición ni carriles nombrados.

Y el dolor no es sólo visual. **La generación real la ejecuta el worker**, no `studio-web`. Hoy, cambiar un
adapter de proveedor, la compilación del prompt o la resolución de ruta obliga a construir imagen y desplegar
el job **sólo para saber si sigue generando**. Levantar únicamente la UI no lo resuelve: quien responde sigue
siendo el worker desplegado con la imagen vieja. Por eso el modo local tiene que incluir **los tres procesos**,
no dos.

El despliegue actual exige SHA exacto en `main`, Cloud Build, Artifact Registry y Cloud Run. Ese control debe
seguir protegiendo el runtime, pero debe ocurrir después de una verificación local y por lote, no como mecanismo
de feedback para cada modificación.

## Goal

- **Provisionar el entorno de desarrollo de Globe**: base, buckets, identidades, secretos y presupuesto
  propios, aislados de lo desplegado y recreables desde cero.
- Correr los **tres procesos** de Globe desde el checkout —cliente con HMR, `studio-web` y worker de
  ejecución— contra ese entorno.
- Permitir **generar un asset real** (imagen, audio o video) apretando el botón en el navegador local, sin
  bypass de Producer, créditos, idempotencia, provenance, rights ni Asset Governance.
- Conservar los fixtures como modo secundario para estados difíciles de provocar y para trabajar sin red.
- Promover un slice listo mediante el despliegue de todos sus consumidores runtime: Studio/API, worker,
  derivados/governance, migraciones, flags, configuración, secretos y canarios cuando corresponda.
- Dejar evidencia honesta y comandos repetibles para distinguir `local`, `provider smoke`, `internal-only`
  y `rollout pendiente`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/README.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_CLIENT_APPLICATION_DECISION_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_CLIENT_STYLING_ENGINE_DECISION_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_FRONTEND_HOSTING_FRONT_DOOR_DECISION_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_DURABLE_PERSISTENCE_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_ASSET_GOVERNANCE_WORKER_DECISION_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_MEDIA_DERIVATIVES_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_ROUTE_BASED_MODEL_RESOLUTION_DECISION_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_ROUTE_PROMOTION_OPERATION_DECISION_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_COMMERCIAL_PROMOTION_ATTESTATION_DECISION_V1.md`
- `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`
- `docs/operations/creative-studio/LOCAL_AUTHENTICATION.md`
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`
- `docs/operations/RELEASE_CHANNELS_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- Globe sigue siendo un producto comercial; `internal-only` describe el estadio de rollout y no autoriza
  degradar seguridad, derechos, calidad ni arquitectura.
- El browser consume BFF/contratos; nunca recibe credenciales de workload, secretos de provider ni acceso
  directo a GCS, Cloud SQL o APIs de provider.
- La ruta, modelo, rate, rights policy, atestación y contrato de salida son identidades gobernadas; el harness
  no puede crear una allowlist paralela ni promover una ruta desde fixtures.
- Los comandos facturables conservan una sola `idempotencyKey` y requieren readback antes de repetir tras
  timeout o resultado ambiguo.
- Los fixtures no son evidencia de disponibilidad real. La disponibilidad real se comprueba con
  `globe.producer.fleet.list` y con canarios de Producer cuando corresponda.
- El despliegue de Globe continúa sobre `main` mediante el workflow keyless y sus gates de SHA, imagen,
  revisión, tráfico y rollback; no se agrega un bypass local de ese control.

## Normative Docs

- `docs/architecture/creative-studio/DECISIONS_INDEX.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md` (SPEC-001)
- `docs/architecture/creative-studio/PLATFORM_FOUNDATION_V1.md` (invariante 10 — Full API Parity de nacimiento)
- `docs/architecture/creative-studio/EFEONCE_GLOBE_ROUTE_CREATIVE_CONTRACT_DECISION_V1.md` (ADR-022 + Deltas b/c)
- `docs/operations/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md`
- `docs/operations/creative-studio/GLOBE_MODEL_FLEET_STATUS.md`
- `docs/operations/creative-studio/EFEONCE_GLOBE_IAC_RUNBOOK_V1.md`
- `docs/operations/creative-studio/EPIC-028_WIP_SWEEP_2026-07-30.md`
- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-1458` — fixtures/evaluations reproducibles del Model Lab; se consumen sin redefinir su contrato.
- `TASK-1460` y `TASK-1461` — capacidades reales de motion y audio ya verificadas en el Lab.
- `TASK-1469` — lifecycle y submission fence para la evidencia de recovery real.
- `TASK-1504` — expansión de capabilities del Producer y canarios multimodales.
- `TASK-1526` — feed/viewer resiliente para la verificación de outputs.
- `TASK-1528` — derivados multimedia y Range delivery para poster, thumbnail, transcode y waveform.
- `TASK-1527` — saga de promoción ADR-009 y `production-promotion-cli.mjs`; el reporte de Slice 4 es un
  **lector** sobre ella, no una noción paralela.
- `TASK-1552` — composer y selección de capacidades del Producer.
- `TASK-1556` — seam de cliente ADR-014 gate (b) (`seam-smoke-server.mjs`, manifest-como-allowlist, CSP por
  nonce, Vite en loopback). Es la restricción dura de Slice 1: el modo HMR convive con ese seam y no lo
  reemplaza.
- `TASK-1633` — contrato de operación, slots, controles y output shape del Producer.

Estas tasks no son blockers totales: el harness debe consumir lo que ya exista y marcar explícitamente las
capabilities que continúen gated o pendientes.

### Blocks / Impacts

- Impacta el flujo de desarrollo de todas las superficies de `efeonce-globe`.
- Impacta la preparación de canarios y evidencia de `TASK-1504`, `TASK-1527`, `TASK-1528`, `TASK-1552` y
  futuras integraciones de fleet.
- No cambia por sí sola la autoridad de créditos, routing, rights, governance, identidad o tenancy.

### Files owned

- `../efeonce-globe/package.json`
- `../efeonce-globe/apps/studio-client/vite.config.ts`
- `../efeonce-globe/apps/studio-client/src/**`, incluyendo `surfaces/producer/**`, para seams de desarrollo,
  fixtures y gates propios del harness; no reescribir capabilities del Producer de otras tasks.
- `../efeonce-globe/apps/studio-web/package.json`
- `../efeonce-globe/apps/studio-web/scripts/**` — hogar canónico del harness del lado servidor
  (`producer-gvc-fixture.mjs` se **extiende**, no se duplica).
- ⚠️ `../efeonce-globe/apps/studio-web/src/**` queda **explícitamente FUERA de esta task** para el modo de
  desarrollo. `src/main.ts` y `src/app.ts` son la entrada productiva que monta la CSP por nonce y el
  allowlist derivado del manifest; una rama `if (dev)` ahí convierte el modelo de seguridad productivo en
  algo condicional y es puerta de una sola vía. Sólo se toca `src/**` si un contrato exportado necesita ser
  legible desde el harness, y ese cambio se declara en la task dueña del contrato.
- `../efeonce-globe/apps/creative-runner/**` para verificar ejecución multimodal y su contrato de worker, sin
  crear un ejecutor alternativo.
- `../efeonce-globe/apps/asset-governance/**` y `../efeonce-globe/apps/media-derivatives/**` para verificar
  governance, posters, waveforms, derivados y Range cuando el output del Producer los requiera.
- `../efeonce-globe/packages/contracts/**`, `packages/domain/**`, `packages/database/**`,
  `packages/provider-contract/**` y `packages/sdk/**` sólo como consumidores/contratos existentes del harness;
  cualquier cambio funcional en ellos requiere coordinar con su task dueña.
- `../efeonce-globe/scripts/**` para comandos, fixtures y verificadores del harness.
- `../efeonce-globe/docs/**` para evidencia técnica local y runbook de ejecución.
- `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md` sólo para documentar estado y límites al cierre.
- `docs/tasks/**` y `Handoff.md` para contrato, continuidad y cierre Greenhouse.

## Current Repo State

### Already exists

> **Verificado contra el checkout `../efeonce-globe` (`bbbc9c1`, 2026-08-03).** Esta sección es el
> inventario de arte previo, y es load-bearing: casi todo lo que abajo se llama «gap» **ya existe bajo
> otro nombre**. Lo que falta es un loop de HMR, cobertura multimodal del fixture que ya hay y una
> composición nombrada de lo existente — **no primitives nuevas**.

- `../efeonce-globe/apps/studio-client` con Vite, React, Tailwind v4, `pnpm dev` (= `vite`) y build
  manifestado (`manifest: true`, `outDir: dist/client`, `server.host: 127.0.0.1` por TASK-1556).
- `../efeonce-globe/apps/studio-web` con servidor Node nativo, `createStudioApp`, `internal_smoke`,
  `build`, `typecheck`, `test`, `start`, `start:worker`, `gvc:fixture`, y carga fail-closed del bundle
  desde `dist/client`.
- 🔴 **Seam de cliente YA EXISTE** — `apps/studio-client/scripts/seam-smoke-server.mjs`
  (`pnpm --filter @efeonce-globe/studio-client seam:smoke`, TASK-1556 / **ADR-014 gate (b)**): sirve el
  bundle **real** a través del renderer de shell **real** bajo la CSP **real** por nonce, importando de
  `dist/` para no reimplementar nada. Es el único gate que puede destapar la semántica CommonJS estricta
  de Rolldown. **En Globe «seam» ya significa esto** (la frontera bundle↔shell), no «proxy de desarrollo».
- 🔴 **Fixture del Producer YA EXISTE** — `apps/studio-web/scripts/producer-gvc-fixture.mjs` (`gvc:fixture`,
  + `producer-gvc-fixture.test.mjs`): renderiza la página real del Producer con lista de capabilities,
  candidatos y una proyección de flota que ya ejercita los tres estados honestos
  (`available | gated | blocked` + `gateReason`). Su cobertura es **centrada en imagen**.
- 🔴 **Guard de simetría entre runtimes YA EXISTE** — `scripts/globe-runtime-drift.mjs`
  (`pnpm globe:runtime-drift`, `--expect <sha>`): compara la **revisión activa** de los tres runtimes
  (API, Studio, worker job) resolviendo el digest del Job contra Artifact Registry. Compara lo que sirve
  tráfico, no lo que el workflow reportó en verde.
- 🔴 **Saga de promoción YA EXISTE** — `scripts/production-promotion-cli.mjs` (TASK-1527 / **ADR-009**):
  `start · stage · promote · activate · canary-confirm · rollback · get · history · list · stalled`,
  declarada explícitamente como *«thin client of the SAME governed commands/readers»*.
- Carril de operador y smokes, todos como clientes delgados del spine HTTP: `scripts/globe-operator-lane.mjs`,
  `globe-operator-input.mjs`, `globe-operator-response.mjs`, `scripts/smoke-private-api.mjs` (SDK +
  `gcloud print-identity-token` con impersonación; asserta el 403 no autenticado),
  `scripts/smoke-human-federation.mjs`, `scripts/globe-governed-run-diagnostic.mjs`,
  `scripts/globe-migration-status.mjs`, `scripts/allocate-internal-credits.mjs`, `scripts/evidence/`.
- Canarios de cliente ya existentes en `apps/studio-client/scripts/`: `producer-composer-canary.mjs`,
  `producer-composer-browser-canary.mjs`, `producer-feed-canary.mjs`, `producer-motion-canary.mjs`,
  `producer-concurrency-canary.mjs`, `share-board-canary.mjs`, `tailwind-engine-canary.mjs`,
  `axis-pilot-canary.mjs`, `legacy-fallback-canary.mjs`, `light-contrast-audit.mjs`.
- Gate local compuesto ya existente: `pnpm check` = `build-order-gate` + `nul-byte-gate` +
  `absolute-path-gate` + `typecheck` + `test` (que a su vez corre `producer-ui-canary`, recovery de rights
  policy, contrato de modo de operador y los gates de fuente).
- Drivers/adapters y suites para Vertex, Fal y OpenAI, y capabilities de imagen, audio y video.
- Workflows keyless de deploy para Studio/API, workers, asset governance y derivados.

### Gap

Reformulado contra el inventario anterior. El gap real es **más chico y más nítido** de lo que esta task
declaraba antes; lo que sobra se resuelve **componiendo**, no construyendo.

- **Genuinamente ausente:** no existe loop de **HMR** contra un shell ejecutable. `studio-client` tiene
  `vite` y `seam:smoke` sirve el bundle **ya compilado** — entre ambos falta el modo en que un cambio de
  React se ve sin `pnpm build`. Éste es el dolor declarado en `## Why This Task Exists` y el único gap de
  Slice 1.
- **Existe pero es parcial:** `gvc:fixture` cubre imagen; falta cobertura de **audio y video** y de los
  estados `pending`/`failed`, derivados (poster, waveform, transcode), Range y retrieval.
- **Existe pero no está compuesto:** `check`, `globe:runtime-drift`, `production-promotion-cli`,
  `smoke-private-api` y los 10 canarios no tienen un entrypoint único que los clasifique por carril ni
  emita un reporte unificado. Es un problema de **composición y nombres**, no de capacidades faltantes.
- **Genuinamente ausente:** no existe matriz que derive los consumidores runtime de un slice y obligue a
  desplegar API/Studio, workers, derivados, governance, migraciones, flags, secretos y canarios juntos.
  `globe:runtime-drift` detecta la asimetría **después**; falta el derivador **antes**.
- **Genuinamente ausente:** no hay frontera documentada que impida confundir fixture verde con provider
  disponible o rollout live.
- 🔴 **El gap raíz: Globe no tiene entorno de desarrollo.** La IaC declara **una sola** instancia
  (`google_sql_database_instance.globe` = `globe-pg`, `infra/terraform/cloud_sql.tf:20`) y un solo set de
  buckets (`private_assets`, `lab_evidence`, `library_exports`, `media_derivatives`). Los tres runtimes
  apuntan a esa misma instancia. No existe un lugar donde probar que no sea lo desplegado — de ahí que el
  ciclo de feedback sea un despliegue. **Éste es el prerequisito de todo lo demás** (Slice 0).
- ⚠️ **Consecuencia si se intenta el atajo:** apuntar un worker local a la base desplegada **no** es una
  opción. El claim de `governed_run_outbox`
  (`packages/database/src/stores/governed-run-store.ts:210-218`) toma trabajo con
  `FOR UPDATE OF o SKIP LOCKED` ordenando por `kind`, `priority` y `available_at`, **sin filtro de
  `workspace_id`**: el worker local tomaría trabajo de producción y el desplegado el del desarrollador, en
  ambas direcciones, por diseño de la consulta y no por una carrera. Con base propia el problema no existe
  —la cola es otra tabla en otra base—, así que el alcance por workspace queda como **follow-up de higiene**,
  no como bloqueante. Mismo patrón sin filtro en `asset-governance-job-store`, `media-derivative-store`,
  `asset-library-store`, `credit-reservation-expiry-store` y `production-promotion-operation-store`.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `../efeonce-globe/scripts/**`, `../efeonce-globe/package.json`, `apps/studio-client` y
  `apps/studio-web` en el checkout canónico; documentación operativa en Greenhouse.
- Future candidate home: `remain-shared`
- Nota: el harness es tooling del checkout de Globe y se queda donde está; no crea workspace nuevo en esta
  task ni lo pre-autoriza.
- Boundary: comandos locales y verificadores consumen contratos públicos existentes de Globe; el harness no
  implementa commands, readers, policies, stores ni adapters alternativos.
- Server/browser split: Vite y fixtures browser-safe pueden entrar al cliente; stores, DB, ADC, secretos,
  provider SDKs, créditos, governance y deploy helpers permanecen server-side o en scripts de operación.
- Build impact: agrega entrypoints de scripts y, si es estrictamente necesario, un seam de desarrollo; no
  agrega dependencia pesada sin justificarla ni cambia el bundle productivo por defecto.
- Extraction blocker: la generación end-to-end depende de la transacción y autoridad completas de Globe
  (identity, credits, Cloud SQL, GCS, workers y provider bindings). Por eso el entorno de desarrollo es un
  **duplicado aislado de esa topología**, no un subconjunto: replicarla a medias produce evidencia falsa.
  El modo fixtures sigue funcionando sin esos servicios, pero nunca declara evidencia live.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: contratos y workflows existentes de `efeonce-globe`, `GLOBE_RUNTIME_HANDOFF.md`
  y la evidencia de los runtimes desplegados; no se crea un ledger local paralelo.
- Consumidores afectados: Studio web, Studio client, scripts de canary, workers, Cloud Build/Cloud Run y
  operador humano.
- Runtime target: `local`, `internal-only`, `worker`, `external provider` y `production verification`.

### Contract surface

- Contrato existente a respetar: `../efeonce-globe/package.json`, scripts existentes, `apps/studio-web/src/main.ts`,
  `apps/studio-client/vite.config.ts`, `apps/studio-web/src/app.ts`, contratos en `../efeonce-globe/packages/contracts`
  y workflows `.github/workflows/deploy-*.yml`.
- Contrato nuevo o modificado: comandos `globe:dev`, `globe:verify`, `globe:provider-smoke` y
  `globe:internal-verify`, además del contrato de fixtures y del reporte de promoción por runtime.
- Backward compatibility: `gated`; producción conserva el bundle compilado, el workflow keyless y sus flags.
- Full API parity: `N/A — no introduce capability de negocio`; el harness sólo consume primitives existentes y
  debe rechazar cualquier implementación de lógica de negocio en scripts o componentes.

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna migración nueva por defecto; cuando una capability dependiente
  exija migración existente, la matriz de rollout debe nombrar esa migración y su verify correspondiente.
- Invariantes que no se pueden romper:
  - fixtures nunca alteran Cloud SQL, ledger, GCS privado, rights, governance ni disponibilidad live;
  - una generación real conserva workspace, ruta, atestación, policy, correlation e idempotency exactos;
  - retry/readback nunca crea segundo attempt, submit, reservation, settlement ni cobro;
  - output válido se verifica por bytes/MIME/hash y no por extensión o fixture metadata;
  - cualquier config/flag/secreto usado por un consumidor runtime se verifica en ese consumidor, no sólo localmente.
- Tenant/space boundary: el entorno de desarrollo tiene su **propio workspace**, clasificado con un `kind` sin
  privilegio para que la promoción quede denegada por construcción (ADR-010). No puede aparentar identidad
  cliente ni compartir workspace con lo desplegado.
- Idempotency/concurrency: una clave por generación lógica, con verificación del **efecto** y no de la
  presencia; readback por reader antes de reintentar. En el entorno de desarrollo las reservas **sí son
  reales** —hay gasto real— y por eso el tope diario del workspace es parte del provisioning, no un extra.
- Audit/outbox/history: la generación en el entorno de desarrollo usa audit, outbox, run/attempt y señales
  canónicas **de ese entorno**; el modo fixtures deja reporte local. Ningún rastro de desarrollo entra a las
  tablas ni a los buckets desplegados.

### Migration, backfill and rollout

- Migration posture: `infra` — la task **provisiona un entorno nuevo** (instancia Cloud SQL, buckets, SAs,
  IAM). No modifica el schema de Globe: corre las **mismas** migraciones existentes contra la base de
  desarrollo. Un schema de desarrollo que diverja del productivo invalida la evidencia, así que la única vía
  de creación es el runner de migraciones vigente.
- Default state: el entorno de desarrollo no existe hasta que alguien lo provisiona explícitamente; `globe:dev`
  falla al arrancar si apunta a la instancia o buckets productivos; flags de producción sin cambios.
- Backfill plan: `N/A — no backfill`; si una capability requiere backfill, queda fuera del smoke local y se
  incorpora como prerequisito de la task dueña.
- Rollback path: detener el proceso local; revertir el seam o apagar el flag de desarrollo; para rollout,
  usar rollback de revisión del workflow y revertir flags/configuración según el runbook, nunca limpiar SQL a mano.
- External coordination: el provisioning exige `tofu/terraform apply` sobre el proyecto de Globe, IAM,
  usuarios IAM de base de datos y Secret Manager accessors propios. **Costo recurrente acotado** por decisión
  del operador: sin instancia nueva; queda el almacenamiento de los buckets y el gasto de proveedor con tope
  diario. Todo eso es out-of-band y precede a Slice 1.
  Para el rollout: provider budget/terms, Cloud Build, Cloud Run services/jobs, migraciones productivas y
  canarios conservan su coordinación y evidencia explícita.

### Security and access

- Auth/access gate: sesión humana/BFF y OAuth/PKCE existentes; ADC sólo para smoke autorizado; nunca tokens
  crudos, service-account JSON ni claves en `.env`, fixtures o logs.
- Sensitive data posture: secretos/provider credentials y datos de assets quedan fuera de fixtures; outputs
  reales usan storage/policies existentes y no se copian a artefactos locales sin autorización.
- Error contract: códigos curados y reportes sanitizados; no mensajes upstream, cuerpos, URLs firmadas,
  stacks, tokens ni secretos.
- Abuse/rate-limit posture: budget por provider smoke, allowlist de rutas/workspace, una clave idempotente,
  circuit/readback y bloqueo por defecto para gasto no explícitamente solicitado.

### Runtime evidence

- Local checks: `pnpm globe:dev`, `pnpm globe:verify`, suites de `studio-client`/`studio-web`, build-order,
  typecheck, lint y canarios de fixtures.
- DB/runtime checks: migraciones y `pnpm pg:doctor` sólo en el runtime requerido; readbacks de run, attempt,
  credit decision, output, governance y feed sin SQL manual.
- Integration checks: provider smoke image/audio/video, validación de bytes/MIME/hash, governance y canary UI
  desde Producer autenticado cuando el modelo/ruta ya esté promovido.
- Reliability signals/logs: señales y códigos existentes de Globe; el reporte nuevo debe conservar correlation,
  route, workspace, run/attempt, idempotency y estado de cada verificación sin secretos.
- Production verification sequence: local fixture verify → local build/contract verify → provider smoke real
  internal-only → deploy de todos los consumidores del slice → migration/config/secret verify → canary humano
  Producer → readback/recovery → rollback rehearsal o evidencia de rollback disponible.

### Acceptance criteria additions

- [ ] Source of truth, contratos consumidos y consumidores runtime están nombrados con paths reales.
- [ ] Las fronteras de workspace, identidad, gasto, idempotencia y concurrencia están implementadas y probadas.
- [ ] La task no introduce migración, ledger, auth, provider adapter ni policy paralela.
- [ ] El reporte de promoción identifica cada consumidor runtime y su evidencia, o declara por qué no aplica.
- [ ] No se imprimen secretos, tokens, cuerpos upstream, URLs firmadas ni errores raw.

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

### Slice 0 — Provisionar el entorno de desarrollo de Globe (BLOQUEA todo lo demás)

Un entorno propio, aislado de lo desplegado, y **desechable**: si se ensucia, se bota y se levanta de nuevo
corriendo migraciones. Ése es el criterio de calidad del slice.

- **Base de datos propia dentro de la instancia existente `globe-pg`** (decisión del operador 2026-08-03:
  se evita el costo de una instancia adicional). Como el aislamiento deja de ser físico, **tiene que ser real
  por permisos**, no por convención:
  - IAM database user de desarrollo con `GRANT` **sólo** sobre la base de desarrollo y `REVOKE CONNECT` sobre
    la base productiva. El punto no es que no deba tocarla: es que **no puede**.
  - Simétrico: los usuarios de runtime productivo sin acceso a la base de desarrollo.
  - `CONNECTION LIMIT` por rol y `statement_timeout` en el rol de desarrollo, para que una consulta o una
    migración pesada no ahogue una instancia que es `db-g1-small` y ahora sirve a dos inquilinos.
  - **Nunca se restaura la instancia por un problema de desarrollo.** El PITR y los backups son de instancia,
    así que restaurar arrastraría producción. La base de desarrollo se **recrea** (drop → create → migrate),
    que además es el criterio de calidad del slice.
- **Buckets propios** para los cuatro usos (`private_assets`, `lab_evidence`, `library_exports`,
  `media_derivatives`), con `public_access_prevention = enforced` igual que los productivos. Éstos **sí** van
  separados aunque se comparta la instancia: un bucket vacío no cuesta —se paga el almacenamiento, no la
  existencia—, así que compartirlos no ahorra nada y mezclaría assets de desarrollo con evidencia real. El
  entorno de desarrollo es más barato y más chico, **nunca más laxo**.
- **Service accounts e IAM propios**, espejo de los productivos. El modo local corre **por impersonación**
  (patrón ya usado por `smoke-private-api.mjs`), nunca con el ADC crudo del operador: probar con permisos de
  más hace creer que algo funciona cuando en producción falla por IAM.
- **Workspace de desarrollo con su propio `dailyCapCredits`.** El fence de doble tope ya existe por workspace;
  sólo hay que apuntarlo. Clasificarlo por el mapa deploy-governed que ya existe
  (`GLOBE_WORKSPACE_KIND_CLASSIFICATIONS`) con un `kind` sin privilegio, de modo que el techo de derechos de
  ADR-010 **deniegue su promoción por construcción**, sin código nuevo.
- **Credenciales de proveedor separadas** cuando el proveedor lo permita; cuando no, el aislamiento es por
  presupuesto y workspace, y eso se declara explícito en vez de suponerse.
- Terraform + runbook para **crear y destruir** la base de desarrollo, sus buckets, SAs e IAM —nunca la
  instancia, que es compartida— y comando de migraciones contra esa base.
- **Condición de retiro documentada:** si la contención sobre `globe-pg` se vuelve observable (latencia,
  conexiones agotadas, CPU), la salida es promover el entorno a instancia propia. Se registra como decisión
  con dueño y condición, no como estado permanente asumido.
- ⚠️ Al tocar la clasificación: `WorkspaceKindV1` es hoy un **union type**
  (`packages/domain/src/commercial-promotion-lane.ts:40`) con una copia literal en
  `ConfigWorkspaceKindResolver`. Convertirlo a array `as const` + test de cobertura en ambas direcciones
  (regla R1) y derivar la copia (regla R2).

### Slice 1 — Los tres procesos corriendo contra el entorno de desarrollo

- Implementar `globe:dev` levantando los **tres procesos**: `studio-client` con HMR, `studio-web` local
  (shell + BFF + dispatch) y el **worker de ejecución** local, todos desde el checkout.
- Apuntar los tres al entorno de Slice 0 —nunca a `globe-pg` ni a los buckets desplegados— con un guardarraíl
  que **falla al arrancar** si la configuración apunta a la instancia o los buckets productivos.
- El shell de desarrollo vive **fuera** de la entrada productiva (invariante 1 del Detailed Spec) y reusa el
  renderer real igual que `seam-smoke-server.mjs`; el bundle manifestado de producción queda intacto.
- Agregar el gate mecánico que rompe el build si `apps/studio-web/src/main.ts` o `src/app.ts` alcanza el
  módulo de desarrollo, en el **mismo commit** que introduce el modo.
- Documentar puertos, health check, auth/local session, variables permitidas, límites y diagnóstico de fallos,
  y la diferencia con `seam:smoke` (bundle compilado bajo CSP real) — los dos coexisten y prueban cosas
  distintas.

### Slice 2 — Generación real end-to-end en el entorno de desarrollo

Es el corazón de la task: apretar generar en el navegador local y obtener un asset real, con el código local
ejecutando las tres capas y todo el rastro cayendo en el entorno de desarrollo.

- Cerrar el circuito completo: composer → estimate → reserva en el fence → submit → ejecución por el
  **worker local** → provider real → ingest al bucket de desarrollo → governance/provenance → feed → viewer
  → playback, sin ningún bypass.
- Cubrir imagen, audio y video. La matriz de rutas elegibles se **deriva de `globe.producer.fleet.list`**
  (invariante 4), nunca de una lista literal: una ruta recién promovida entra a cobertura sin editar scripts.
- Validar el resultado por bytes, MIME, hash, output shape, governance, rights, feed/viewer y **cobro único**;
  readback-first, prohibido el `execute` ciego después de un timeout.
- Verificar el **efecto** de la clave de idempotencia, no su presencia: que exista no prueba que el handler la
  honre.
- Exponer `globe:provider-smoke` como la versión no interactiva del mismo circuito —**cliente delgado del
  spine**, mismo patrón que `smoke-private-api.mjs` / `globe-operator-lane.mjs` /
  `production-promotion-cli.mjs`— para correrlo en lote o desde CI sin abrir el navegador.

### Slice 3 — Fixtures como modo secundario

Los fixtures dejan de ser el propósito y pasan a cubrir lo que la generación real no da barato: estados
difíciles de provocar y trabajo sin red.

- **Extender `apps/studio-web/scripts/producer-gvc-fixture.mjs`** (no crear un segundo fixture) a audio y
  video, con outputs gobernados, estados pending/completed/failed, governance, rights, feed, viewer, poster,
  waveform, Range y retrieval. La proyección de flota y las rutas se **derivan** de `PRODUCER_ROUTE_CATALOG`
  y de los contratos publicados (invariante 4); el `FLEET_AVAILABILITY` literal actual se convierte en
  derivación con overrides explícitos por caso.
- Montar esos fixtures en los puntos reales del Producer, sin implementar un flujo paralelo.
- Añadir canarios locales para desktop/390px cuando la superficie sea visible, reduced motion, ausencia de
  scroll horizontal, MIME/hash y reconciliación de resultados.
- Exponer `globe:verify` como gate local reproducible, sin gasto ni mutación de runtime real. **`globe:verify`
  invoca `pnpm check` y los canarios existentes**; no re-deriva typecheck, tests ni gates de fuente. Si
  `globe:verify` y `check` pueden divergir, el diseño está mal: hay un solo gate local y `globe:verify` es su
  nombre compuesto.
- Regla de honestidad: un fixture verde **nunca** es evidencia de que una ruta genere. Esa evidencia es
  Slice 2.

### Slice 4 — Documentación operativa del entorno y handoff

- Runbook del entorno de desarrollo: crear, destruir, migrar, conectar los tres procesos, presupuesto, límites,
  secretos, auth por impersonación, recuperación y troubleshooting.
- Registrar la decisión de instancia compartida con su dueño y su condición de retiro.
- Actualizar Greenhouse `Handoff.md` y `GLOBE_RUNTIME_HANDOFF.md` con el entorno y sus fronteras, sin declarar
  disponibles rutas que sólo tienen fixtures.

> **La promoción desplegable se movió a `TASK-1636`** (partición 2026-08-03). Esta task entrega el entorno de
> desarrollo y el loop de generación real; el despliegue por lote del slice verificado —`globe:internal-verify`,
> reporte de consumidores, simetría de runtimes y canario humano— es su continuación natural pero tiene otro
> blast radius y otra coordinación.

## Out of Scope

- Sustituir Cloud Run, Cloud SQL, GCS, Secret Manager, IAM, Cloud Build o el release control plane.
- Crear un backend local paralelo, un segundo ledger, una segunda identidad o una allowlist de providers propia.
- Promover modelos, alterar atestaciones/rights o habilitar clientes externos desde el harness.
- Emular completamente providers, governance, workers o almacenamiento y tratar esa emulación como evidencia live.
- Migrar Globe a Vercel/Next.js o cambiar la decisión vigente de hosting.
- Resolver capabilities de Producer que pertenecen a `TASK-1504`, `TASK-1552`, `TASK-1633` u otra task dueña.
- **El despliegue por lote y su verificación** (`globe:internal-verify`, reporte de consumidores runtime,
  simetría de imagen/revisión, canario humano internal-only, rollback baseline) — se movió a `TASK-1636`.
- Crear una instancia Cloud SQL adicional: por decisión del operador (2026-08-03) el entorno de desarrollo
  vive como base separada dentro de `globe-pg`, con aislamiento por permisos.

## Detailed Spec

El diseño debe mantener cuatro carriles con nombres y reportes separados:

```text
local fixture       → cero gasto, cero mutación real
local contract      → build/typecheck/lint/tests/canarios
provider smoke      → provider real, workspace/budget/idempotencia explícitos
internal verify     → Cloud Run + workers + DB/GCS/governance + canary humano
```

`globe:dev` no puede habilitar por accidente provider real ni importar secretos al browser. `globe:provider-smoke`
no puede ejecutar un `execute` nuevo después de timeout sin readback. `globe:internal-verify` debe detenerse si
la imagen, driver, secret accessor, worker, migración, flag o policy no es simétrica entre consumidores.

### Composición sobre lo existente (ningún carril nace vacío)

Cada carril **envuelve** arte previo verificado. Un comando nuevo que reimplemente cualquiera de estas piezas
es un defecto de diseño, no una decisión de alcance:

| Carril | Compone | Agrega esta task |
|---|---|---|
| `local contract` | `pnpm check` (build-order · nul-byte · absolute-path · typecheck · test) + los 10 canarios de `studio-client` + `seam:smoke` | nada nuevo: **`globe:verify` invoca `check`**, no lo reemplaza ni lo re-deriva |
| `local fixture` | `apps/studio-web/scripts/producer-gvc-fixture.mjs` (`gvc:fixture`) | cobertura **audio/video**, estados `pending`/`failed`, derivados (poster · waveform · transcode · Range) y retrieval |
| `provider smoke` | `scripts/smoke-private-api.mjs` + SDK + `globe-operator-lane.mjs` (patrón de cliente delgado ya canonizado) | selección de modalidad/ruta, budget, readback-first y validación por bytes/MIME/hash |
| `internal verify` | `scripts/globe-runtime-drift.mjs` (`--expect <sha>`) + `globe-migration-status.mjs` + `production-promotion-cli.mjs` | el **derivador de consumidores** del slice, que hoy no existe, y el reporte unificado |

### Invariantes duros del harness

1. **El modo de desarrollo no vive dentro de la entrada productiva.** HMR se sirve desde `studio-client`
   (Vite) y desde un shell de desarrollo propio del harness; **NUNCA** desde una rama `if (dev)` en
   `apps/studio-web/src/main.ts` o `src/app.ts`. Razón estructural, no estilística: el manifest de Vite es el
   **allowlist** de lo servible (`src/node/index.ts`: *«serving whatever is in this folder would trade that
   property for a path-traversal surface»*) y la CSP por nonce es la política productiva. Un servidor de
   desarrollo sirve módulos fuera del manifest bajo otra política — legítimo en local, catastrófico si
   alguna vez es alcanzable en Cloud Run. La barrera es **mecánica**, no disciplinaria: un test que rompe el
   build si el entrypoint productivo importa el módulo de desarrollo. Un chequeo de `NODE_ENV` en runtime no
   basta (patrón B2: la red de seguridad que funciona esconde el defecto que contiene).
2. **Nombre reservado.** En Globe «seam» **ya** designa el seam de cliente de ADR-014 gate (b)
   (`seam-smoke-server.mjs`). El modo HMR de esta task **NO** puede llamarse «seam»: cuando un eje nuevo se
   superpone a un vocabulario existente, el modo de falla no es un conflicto detectable sino **precedencia
   silenciosa** (overlay G6). Nombre a usar: `dev shell` / `globe:dev`.
3. **El smoke real es cliente delgado del spine, jamás un segundo dispatch.** `globe:provider-smoke` consume
   el SDK/HTTP igual que `smoke-private-api.mjs`, `globe-operator-lane.mjs` y `production-promotion-cli.mjs`;
   **NUNCA** importa handlers de `packages/domain` ni reconstruye una fase localmente (SPEC-001: el
   `CapabilityRegistry` es el único hogar transport-neutral y el SDK es cliente, nunca segundo SSOT).
4. **Lo que representa LA LISTA se deriva; lo que representa UN CASO queda literal** (regla R2). La matriz de
   rutas del smoke se **deriva de `globe.producer.fleet.list`**, y los fixtures de contrato se derivan de
   `PRODUCER_ROUTE_CATALOG` / `packages/contracts` — nunca de una lista literal en el script. Sin esto, una
   ruta promovida sale de cobertura **en silencio** y un cambio de contrato deja el fixture verde. Ésta es la
   única mitigación honesta del riesgo «fixture verde, canary rojo»: que un cambio de contrato **rompa la
   compilación del fixture**. Un candidato o un caso de uso concreto sí puede quedar literal a propósito.
5. **El reporte de promoción es un lector sobre la saga de ADR-009, no una segunda noción de promoción.**
   Deriva de `production-promotion-cli.mjs` / los readers de la operación; **NUNCA** declara promovida una
   ruta ni fabrica evidencia. Promoción ≠ entrega sigue vigente.

El reporte de promoción debe ser machine-readable y humano, incluir commit/SHA, modalidad, routeId, workspace,
environment, correlation, run/attempt, idempotency, imagen/digest/revisión, evidencia de governance y resultado
de rollback. Los reportes locales no deben contener secretos, bytes privados innecesarios ni credenciales.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- **Slice 0 MUST precede todo.** Sin entorno propio, cualquier proceso local apuntado a la base desplegada
  toma trabajo de producción: el claim de la cola no filtra por workspace. No hay atajo aceptable.
- Slice 1 MUST precede Slice 2: la generación real necesita los tres procesos corriendo contra el entorno.
- Slice 2 MUST precede Slice 4 para cada ruta: sólo se despliega lo que ya generó de verdad en desarrollo.
- Slice 3 puede ir en paralelo a Slice 2; los fixtures no son prerequisito de la generación real, y tratarlos
  como tal reintroduce la confusión que esta task existe para eliminar.
- Slice 4 MUST verify every runtime consumer before any flag flip or migration apply.
- Slice 5 puede documentarse en paralelo, pero el cierre final exige evidencia de Slices 0–4 y handoff
  actualizado.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---:|---|---|
| 🔴 Un proceso local apunta a la base/buckets desplegados y toma trabajo de producción | Cloud SQL/worker | **high** si no se hace Slice 0 | entorno propio (Slice 0) + guardarraíl que falla al arrancar si la config apunta a `globe-pg` o a los buckets productivos | run de producción ejecutado por un worker sin revisión desplegada |
| El schema de desarrollo diverge del productivo y la evidencia se vuelve falsa | Cloud SQL | medium | única vía de creación es el runner de migraciones vigente; verificación de paridad de schema | migración aplicada en un entorno y no en el otro |
| 🔴 Trabajo de desarrollo degrada la instancia compartida `globe-pg` (`db-g1-small`, ahora con dos inquilinos) | Cloud SQL | medium | `CONNECTION LIMIT` por rol + `statement_timeout` en el rol de desarrollo; condición de retiro hacia instancia propia | latencia o conexiones agotadas en el runtime productivo |
| Una migración o un `DROP` de desarrollo apunta a la base productiva | Cloud SQL | medium | el usuario de desarrollo **no puede conectarse** a la base productiva (`REVOKE CONNECT`), probado rojo | conexión denegada esperada que deja de fallar |
| El gasto del entorno de desarrollo se dispara sin techo | provider/credits | medium | `dailyCapCredits` propio del workspace de desarrollo, fail-closed | tope diario alcanzado / reservas sostenidas |
| HMR diverge del bundle que Cloud Run sirve | UI/build | high | canary de seam, build manifestado obligatorio y `globe:verify` | hash servido distinto al artefacto |
| Smoke real se repite después de timeout y cobra dos veces | lifecycle/credits | medium | readback-first, idempotency única y bloqueo de retry ciego | attempts o settlements duplicados |
| API despliega sin worker/secret/config compatible | Cloud Run/worker | medium | matriz de consumidores y simetría de deploy | route binding/driver/secret accessor mismatch |
| Fixture oculta un defecto de bytes, MIME o governance | media/governance | medium | validación por bytes/hash y smoke real separado | output fixture verde, canary real fallido |
| Proxy/local auth expone token o sesión al browser | identity/security | low | same-origin/BFF, redacción, revisión de headers y no raw token | token en network/log/fixture |

### Feature flags / cutover

- `globe:dev` y fixtures son opt-in por comando y no cambian flags productivos.
- Provider smoke requiere un modo explícito, ruta allowlisted, workspace interno y budget confirmado.
- Cualquier seam de dev debe ser inalcanzable cuando `NODE_ENV`/runtime no sea local y no puede modificar el
  comportamiento productivo del bundle.
- Rollout de código/flags/migraciones/secrets sigue los workflows y runbooks existentes; el harness no autoriza
  un `tofu apply`, un cambio de IAM ni un flip externo automáticamente.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---:|---|
| 0 | `terraform destroy` de la base de desarrollo, sus buckets, SAs e IAM. **Nunca restaurar la instancia** — el PITR es compartido y arrastraría producción; la base se recrea | <30 min | sí |
| 1 | detener `globe:dev` y revertir el módulo de desarrollo; producción continúa usando bundle compilado | <5 min | sí |
| 2 | detener el loop, reconciliar por readers y cerrar budget/circuit; nunca repetir execute a ciegas. El rastro queda en el entorno de desarrollo, que es desechable | <30 min | sí, con recuperación gobernada |
| 3 | deshabilitar fixtures/canarios nuevos o revertir scripts; no toca runtime live | <5 min | sí |
| 4 | corregir runbook/Handoff y repetir evidencia; no se declara cierre hasta consistencia documental | <1 día | sí |

### Production verification sequence

> El despliegue por lote y su verificación viven en `TASK-1636`. Esta secuencia termina cuando el cambio está
> probado en el entorno de desarrollo.

1. Provisionar (o recrear) el entorno de desarrollo y aplicar migraciones con el runner vigente.
2. Verificar las dos denegaciones cruzadas de conexión y el guardarraíl de arranque de `globe:dev`.
3. Ejecutar `globe:verify` con fixtures image/audio/video: cero gasto, cero mutación.
4. Ejecutar build-order, typecheck, lint, tests y canarios del cliente/Studio.
5. Levantar los tres procesos y generar de verdad una ruta por modalidad, dentro del tope diario.
6. Leer run/attempt/output/credits/governance/feed y comprobar cobro único, bytes/MIME/hash y recovery.
7. Confirmar que **ninguna** tabla ni bucket productivo recibió rastro del trabajo de desarrollo.
8. Documentar evidencia y estado honesto; detenerse ante cualquier mismatch.

### Out-of-band coordination required

- Confirmación humana del workspace y budget para cada provider smoke real.
- Acceso/impersonación ADC y OAuth/PKCE local cuando se pruebe identidad real.
- Secret Manager/IAM/accessors y configuración por cada consumidor runtime.
- Cloud SQL migrations, GCS buckets, Cloud Run services/jobs, Cloud Build y workflows de promoción.
- Revisión Legal/rights cuando una ruta nueva requiera atestación o policy distinta.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe un entorno de desarrollo de Globe con base propia dentro de `globe-pg`, buckets, service
  accounts, IAM y workspace propios, creable y destruible desde Terraform, con su schema creado por el runner
  de migraciones vigente.
- [ ] **El usuario de desarrollo no puede conectarse a la base productiva** y el runtime productivo no puede
  conectarse a la de desarrollo; ambas denegaciones se prueban en rojo. Éste es el control que reemplaza al
  aislamiento físico: sin él, la instancia compartida es sólo una convención.
- [ ] El rol de desarrollo tiene `CONNECTION LIMIT` y `statement_timeout`, y la condición de retiro hacia
  instancia propia queda registrada con dueño.
- [ ] `globe:dev` levanta los **tres procesos** (cliente con HMR, `studio-web`, worker) y **falla al arrancar**
  si la configuración apunta a la base productiva o a cualquier bucket productivo; se prueba rojo.
- [ ] Un cambio en el composer, en el BFF o en un adapter de proveedor se prueba sin construir imagen ni
  desplegar.
- [ ] Una generación real de imagen, audio y video sale desde el navegador local, ejecutada por el worker
  local, y todo su rastro (run, attempt, asset, provenance, ledger) queda en el entorno de desarrollo y en
  **ninguna** tabla o bucket desplegado; se verifica leyendo ambos lados.
- [ ] Cada generación conserva una sola idempotency key —verificada por su **efecto**, no por su presencia—,
  usa readback-first y demuestra ausencia de doble attempt, submit, settlement o cobro.
- [ ] El resultado real se valida por bytes, MIME, hash, output shape, governance, rights, feed/viewer y
  playback según modalidad, sin confiar en extensión ni metadata declarada.
- [ ] El workspace de desarrollo tiene tope diario propio y su promoción está denegada por clasificación.
- [ ] Si una modalidad continúa gated, se declara con razón canónica y **no** se usa un fixture como sustituto.
- [ ] Fixtures cubren imagen, audio y video (output, pending, failed, governance, rights, feed, viewer, poster,
  waveform, playback, retrieval) donde la capability exista, y `globe:verify` demuestra cero gasto y cero
  mutación.
- [ ] Existe un test que **rompe el build** si la entrada productiva (`apps/studio-web/src/main.ts`,
  `src/app.ts`) alcanza el módulo del shell de desarrollo; se prueba rojo en ambas direcciones.
- [ ] Ningún comando del harness reimplementa arte previo: `globe:verify` invoca `pnpm check` y el loop usa el
  SDK. Un grep demuestra que no hay import de handlers de `packages/domain` desde `scripts/**`.
- [ ] Las rutas y la proyección de flota se **derivan** del lector/catálogo; un cambio de contrato rompe la
  compilación del fixture en vez de dejarlo verde.
- [ ] No se imprimen ni almacenan tokens, secretos, service-account JSON, URLs firmadas, cuerpos upstream,
  stacks ni raw errors en fixtures, reportes o logs.
- [ ] `pnpm task:lint --task TASK-1635`, `pnpm ops:lint --changed` y los gates proporcionales de Globe pasan.
- [ ] Greenhouse `Handoff.md`, `GLOBE_RUNTIME_HANDOFF.md`, README de tasks y evidencia técnica quedan sincronizados.

## Verification

- `pnpm task:lint --task TASK-1635`
- `pnpm ops:lint --changed`
- En Globe: `pnpm check`, `pnpm build`, suites focales de `studio-client` y `studio-web`.
- En Globe: `pnpm globe:verify` con fixtures image/audio/video.
- Generación real image/audio/video en el entorno de desarrollo, dentro del tope diario.
- Denegación cruzada de conexión (dev↛prod y prod↛dev) probada en rojo.
- Readback de run/attempt/output/credits/governance/feed/viewer en el entorno de desarrollo.
- Confirmación de que ninguna tabla ni bucket productivo recibió rastro.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real.
- [ ] El archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`).
- [ ] `docs/tasks/README.md` quedó sincronizado con el cierre.
- [ ] `Handoff.md` quedó actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes.
- [ ] `changelog.md` quedó actualizado si cambió comportamiento, estructura o protocolo visible.
- [ ] Se ejecutó chequeo de impacto cruzado sobre las tasks dueñas de Producer, fleet, lifecycle, governance,
  derivatives y deployment.
- [ ] La matriz local/provider/internal/deployable conserva evidencia y estados honestos.

## Follow-ups

- Derivar tareas específicas si el harness descubre una capability de Globe sin adapter, worker, governance,
  derivative o contrato de salida completo.
- Derivar una task de emulación adicional sólo si una dependencia externa demuestra ser el cuello de botella y
  la emulación puede conservar una frontera honesta frente a evidencia live.
- Revisitar el alcance cuando Globe deje `internal-only` y exista un runtime comercial separado.

## Open Questions

> Las dos preguntas originales quedaron **cerradas por evidencia** en la auditoría del 2026-08-03 (ver Delta
> al final). Se conservan con su resolución para que nadie las reabra por defecto.

- ~~Definir si el provider smoke real se ejecuta desde CLI local, desde una UI local con proxy same-origin o
  desde un workflow keyless.~~ **CERRADA: CLI local, cliente delgado del spine.** SPEC-001 fija el
  `CapabilityRegistry` como único hogar transport-neutral y al SDK como cliente, nunca segundo SSOT; los tres
  clientes que ya existen (`smoke-private-api.mjs`, `globe-operator-lane.mjs`, `production-promotion-cli.mjs`)
  ya implementan ese patrón. La UI local con proxy exigiría que el navegador alcance la API IAM-privada, lo
  que obliga al proxy a sostener un ID token: eso es un camino de credencial dentro de una herramienta de
  desarrollo y contradice la regla de que el browser nunca recibe credenciales de workload.
- ~~Confirmar qué capabilities de audio y video están `available`.~~ **CERRADA: es un dato leído, no un
  descubrimiento.** El SSOT es `globe.producer.fleet.list` + `GLOBE_MODEL_FLEET_STATUS.md`; el barrido
  `EPIC-028_WIP_SWEEP_2026-07-30.md` mide **10 rutas operativas en producción gobernada** (imagen, motion,
  video, audio y voz), 3 bloqueadas por terceros y 1 sólo-Lab. La matriz del smoke **deriva** de ese lector
  (invariante 4), así que la pregunta no vuelve a plantearse: se responde sola en cada corrida.

- **Abierta y real:** ¿el harness reporta como **señal de confiabilidad** de Globe la deriva
  fixture↔contrato, o basta con que el fixture derivado rompa la compilación? La segunda es más barata y ya
  está decidida como mitigación; la primera sólo se justifica si aparece un caso donde el contrato cambia sin
  romper el fixture.

## Delta 2026-08-03 — auditoría arquitectónica (`arch-architect` + overlay Globe)

Auditada contra el checkout real de `../efeonce-globe` (`bbbc9c1`), no contra la descripción de la task. Seis
hallazgos, cinco aplicados en este archivo y uno abierto como decisión del operador.

### H1 (bloqueante, aplicado) — el inventario de arte previo estaba mal y autorizaba primitives paralelas

La task declaraba como «gap» cinco cosas que **ya existen bajo otro nombre**: el seam de cliente
(`seam-smoke-server.mjs`), el fixture del Producer (`producer-gvc-fixture.mjs`), el guard de simetría entre
runtimes (`globe-runtime-drift.mjs`), la saga de promoción (`production-promotion-cli.mjs`) y el gate local
compuesto (`pnpm check`). Escrito así, el alcance autorizaba construir un segundo seam, un segundo fixture, un
segundo comparador de revisiones y un segundo gate local. `## Current Repo State` fue reescrita con paths
reales y el gap quedó reformulado: **el gap genuino es HMR, cobertura multimodal del fixture existente, el
derivador de consumidores y la frontera documentada** — el resto es composición.

### H2 (bloqueante, aplicado) — colisión de vocabulario: «seam»

En Globe «seam» ya designa la frontera bundle↔shell de ADR-014 gate (b). La task lo usaba para «proxy de
desarrollo». Cuando un eje nuevo se superpone a un vocabulario existente el modo de falla no es un conflicto
detectable sino **precedencia silenciosa** (overlay G6): dos personas leen «seam», entienden cosas distintas y
ningún error existe para observarlo. Renombrado a `dev shell` / `globe:dev`, con los dos declarados como
coexistentes y probando cosas distintas.

### H3 (bloqueante, aplicado) — el modo de desarrollo no puede vivir en la entrada productiva

`Files owned` autorizaba tocar `apps/studio-web/src/**` «sólo para el seam local de bundle/proxy». Ahí viven la
CSP por nonce y el allowlist derivado del manifest de Vite —`src/node/index.ts` es explícito: servir el
directorio en vez del manifest cambiaría el allowlist por una superficie de path traversal. Una rama `if (dev)`
convierte el modelo de seguridad productivo en condicional: puerta de una sola vía. `src/**` salió del alcance
para el modo dev, y la mitigación es **mecánica** (test que rompe el build), no un `NODE_ENV` en runtime —
patrón B2: la red de seguridad que funciona es exactamente lo que esconde el defecto que contiene.

### H4 (mayor, aplicado) — `globe:verify` competía con `pnpm check`

Dos nombres para el gate local es deriva garantizada. `globe:verify` quedó definido como **nombre compuesto que
invoca `check`**, no como gate alternativo.

### H5 (mayor, aplicado) — la única mitigación honesta de «fixture verde, canary rojo» es la derivación

La matriz de riesgo mitigaba con «validación por bytes/hash y smoke real separado». Insuficiente: eso detecta
el problema **después de gastar**. La mitigación estructural es la regla R2 — lo que representa LA LISTA se
deriva (rutas del smoke desde `globe.producer.fleet.list`, fixtures desde `PRODUCER_ROUTE_CATALOG` y
`packages/contracts`), lo que representa UN CASO queda literal. Así un cambio de contrato **rompe la
compilación del fixture** en vez de dejarlo verde, y una ruta recién promovida entra a cobertura sin editar
ningún script. El `FLEET_AVAILABILITY` literal de 17 rutas del fixture actual pasa a derivación con overrides
explícitos.

### H6 (abierto — decisión del operador) — la task empaqueta cuatro blast radii distintos

| Slices | Blast radius | Puerta |
|---|---|---|
| 1 + 2 (dev shell, fixtures) | cero: tooling local, no toca runtime | dos vías, revert < 5 min |
| 3 (provider smoke) | créditos y workspace interno: **gasto real** | dos vías con recuperación gobernada |
| 4 (internal verify + promoción) | plataforma: orquestación de deploy productivo | toca el control de una sola vía |

Empaquetadas bajo un `P0` único, la ganancia rápida y sin riesgo — el loop de HMR, que es **el dolor declarado
en `## Why This Task Exists`** — queda detrás de lo más lento y más caro de verificar. La recomendación es
partir: **Slices 1–2 se quedan en `TASK-1635`** (entregable en días, reversible, sin coordinación externa) y
**Slices 3–5 se mueven a una task hermana** con su propia coordinación out-of-band (budget, ADC, Secret
Manager, Cloud Build, canario humano). No se ejecuta la partición sin decisión explícita del operador: cambia
el plan de trabajo, no sólo el documento.

### Correcciones documentales detectadas

- `AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md` estaba citado bajo `docs/operations/creative-studio/`; su
  ruta real es `docs/operations/`. Corregido.
- ⚠️ `docs/operations/creative-studio/LOCAL_AUTHENTICATION.md` está **stale**: declara *«No Globe Cloud Run
  service or service account has been provisioned. Therefore no live identity-token smoke is possible yet»*,
  contradicho por los tres runtimes que `globe-runtime-drift.mjs` consulta y por `smoke-private-api.mjs`, que
  ya hace exactamente ese smoke. La task lo cita como doc a respetar, así que induciría a error. **Actualizarlo
  es parte del cierre de Slice 5.**
- `TASK-1527` y `TASK-1556` estaban ausentes de `Depends on` pese a ser las dueñas de dos piezas que esta task
  compone. Agregadas.

### 4-Pillar Score

**Safety** — Qué puede salir mal: que el modo local alcance un provider real, o que el shell de desarrollo
quede alcanzable en Cloud Run bajo una política distinta a la productiva. Gates: perfiles explícitos, budget
fail-closed, workspace sintético en local, y el aislamiento estructural de H3 verificado por test.
Blast radius si falla: gasto en el workspace interno (acotado por el fence de doble tope) o, en el peor caso de
H3, degradación del modelo CSP/allowlist del Studio productivo — de ahí que la barrera sea mecánica.
Riesgo residual aceptado: el smoke real gasta dinero por diseño; se acota, no se elimina.

**Robustness** — Idempotencia: una sola clave por canario lógico, con **verificación del efecto** y no de la
presencia (que exista no prueba que el handler la honre). Atomicidad: no la introduce esta task; la hereda del
fence `reserve → settle | release`. Protección de carrera: serialización por ruta en el smoke. Cobertura de
invariantes: derivación de vocabularios (R2) + test de aislamiento del dev shell + `pnpm check` como gate único.

**Resilience** — Reintentos: readback-first, prohibido el `execute` ciego post-timeout; hereda el techo por
clase de error de ISSUE-135. Rastro: audit/outbox reales para el carril de provider; reporte local para los
carriles locales, sin ledger paralelo. Recuperación: `globe-runtime-drift --expect <sha>` como detector de
asimetría y el rollback de revisión del workflow como camino. Degradación honesta: los cuatro carriles se
reportan por separado, que es precisamente lo que impide que un fixture verde se lea como rollout live.

**Scalability** — No es una superficie de tráfico; escala por **número de rutas**, y ahí la derivación es lo que
lo hace lineal: 10 rutas hoy y 25 mañana no cambian el script. Costo a 10x: lineal en el carril de smoke
(gasto real por ruta), sub-lineal en los carriles locales. El punto de contención real es humano — el canario
autenticado por modalidad —, no computacional.

## Delta 2026-08-03 — corrección de tesis: la app es la desplegada; falta el ENTORNO de desarrollo

Dirección del operador, en sus palabras: *«no quiero que la app sea mi entorno de desarrollo local, la app es
la que está desplegada en el servicio; lo que necesito es tener un entorno de desarrollo habilitado con todo
para poder desarrollar más rápido y probar lo desarrollado»*.

La versión previa de esta task —y el primer borrador de mi propia auditoría— apuntaba el runtime local a la
Cloud SQL, los buckets y la cola **desplegados**. Eso no es un entorno de desarrollo: es operar la app
productiva desde una máquina de escritorio. Corregido.

### Lo que cambió

| Antes | Ahora |
|---|---|
| Fixtures como propósito; generación real como fase ceremonial aparte | Generación real como loop diario; fixtures como modo secundario |
| Runtime local contra los servicios desplegados | Runtime local contra un **entorno de desarrollo propio** |
| Slice 0 = filtrar la cola por workspace (bloqueante) | Slice 0 = **provisionar el entorno**; el filtro pasa a follow-up de higiene |
| Sólo UI + BFF en local | **Los tres procesos**, incluido el worker: la generación la ejecuta él |

### Por qué el entorno propio resuelve más de lo que cuesta

El bloqueante que había encontrado —el claim de `governed_run_outbox` no filtra por `workspace_id`, así que un
worker local robaría trabajo de producción y viceversa— **se disuelve solo**: con base propia, la cola es otra
tabla en otra base. Lo que era un cambio en el corazón del runtime gobernado pasa a ser higiene diferible. El
aislamiento por infraestructura resultó más barato y más seguro que el aislamiento por filtro.

### Lo que sí cuesta

Una instancia Cloud SQL adicional, cuatro buckets, service accounts propios y el gasto de proveedor del
entorno. Es costo recurrente y requiere aprobación explícita. La alternativa —una base extra dentro de
`globe-pg`— ahorra ese costo pero deja producción expuesta a una migración pesada o a un `DROP` mal apuntado,
y mezcla backups, PITR y deletion protection. **El aislamiento vale más que el ahorro**, y por eso la task
pide instancia separada, sin PITR ni deletion protection, del tamaño mínimo que aguante.

### Lo que NO cambió

La app desplegada sigue siendo la app. El entorno de desarrollo no la toca: distinta base, distintos buckets,
distinta cola, distinto presupuesto, promoción denegada por clasificación. El despliegue conserva íntegros sus
gates de SHA, imagen, revisión, tráfico y rollback. Y el schema del entorno de desarrollo se crea **con las
mismas migraciones**: un schema que diverge convierte toda la evidencia local en ficción.

## Delta 2026-08-03 — ejecución: Slices 0a y 0d cerrados, apply pendiente

Commiteado en Globe `main`, local, sin push: **`864ce68`** (Slice 0a) y **`f1b8e6e`** (Slice 0d).

### Entregado y verificado

| Pieza | Archivo | Evidencia |
|---|---|---|
| Entorno de desarrollo | `infra/terraform/development_environment.tf` | `tofu validate` OK · plan **OFF = `No changes`** · plan **ON = 43 add / 0 change / 0 destroy** |
| Aislamiento por permisos | `scripts/bootstrap-development.sql` | auto-verificación con `RAISE EXCEPTION` antes de revocar `PUBLIC` |
| Auditoría del aislamiento | `scripts/verify-development-isolation.sql` | ambas denegaciones cruzadas + `PUBLIC` + techos |
| Guardarraíl del modo local | `scripts/globe-dev-guard.{mjs,test.mjs}` | 8/8 · **rojo probado en 2 direcciones** |
| Aislamiento del dev shell | `scripts/development-shell-isolation-gate.mjs` | 67 fuentes · **rojo probado en 2 direcciones** |
| Migraciones al entorno dev | `.github/workflows/migrate-internal.yml` | input `target` acotado, default `production` |

Los dos gates quedaron registrados en `pnpm check`; el test del guardarraíl, enumerado en el script `test` de
la raíz (en este repo un test no enumerado nunca corre).

### Dos defectos que encontró la verificación, no la revisión

1. **El plan con el entorno APAGADO proponía `4 to add`.** El `for_each` de los accessors de proveedor dependía
   sólo de `development_provider_secrets_shared` (default `true`), no del flag del entorno: concedía
   `secretAccessor` sobre las tres credenciales de proveedor productivas a un service account inexistente. Un
   binding IAM huérfano que, el día que alguien creara ese SA, le entregaba las llaves. Es el bug class que esta
   misma task documenta —un flag declarado que no gobierna lo que dice gobernar— y sólo apareció **leyendo el
   plan**.
2. **El workflow de migraciones habría fallado en su primer uso.** Cloud SQL usa IAM database authentication, así
   que la SA impersonada **es** el usuario de Postgres: declarar `globe-dev-migrator` mientras se impersona
   `globe-deployer` no conecta. Y no se arregla dándole al deployer acceso a la base de desarrollo, porque el
   bootstrap se lo revoca a propósito. Se cerró resolviendo la SA desde el mismo input y agregando el binding WIF
   + `cloudsql.client` a las dos identidades de desarrollo.

### Hallazgo de discovery que la spec no declaraba

**En las 49 migraciones no existe un solo `GRANT CONNECT`**: los usuarios productivos conectan por el default de
`PUBLIC`, o sea su acceso a producción es **implícito**. Por eso el orden de `bootstrap-development.sql` es
load-bearing y está escrito en el propio archivo: la sección que hace explícito el CONNECT productivo corre
**antes** de la que revoca `PUBLIC`. Al revés, los tres runtimes productivos pierden su base.

Segundo hallazgo: `readStudioRuntimeConfig` lanza `globe_environment_not_internal_smoke` para cualquier valor
distinto, así que el modo local **reusa `internal_smoke`** — inventar `GLOBE_ENVIRONMENT=development` no bootea.

### Bloqueado (requiere al operador)

`tofu apply` de los 43 recursos · valores de los 11 secretos de firma out-of-band · correr el bootstrap y su
verificación por el proxy. Después de eso: migrar la base dev (`target=development`), Slice 1 (`globe:dev` con
los tres procesos) y Slice 2 (generación real).

### Decisión abierta

Credenciales de proveedor: el HCL hoy las comparte con producción (`development_provider_secrets_shared = true`,
aislamiento por workspace + tope diario). Separarlas exige cuentas de proveedor propias.

## Delta 2026-08-03 — cero claves nuevas: los secretos se juzgan por autoridad

Instrucción del operador: *no crear más claves, usar las existentes de Globe*. Globe `9d44091`.

**Medido antes de cablearlo, y el resultado convierte la restricción en una mejora.**
`readSecret` (`apps/studio-web/src/app.ts:1146`) devuelve `undefined` cuando un secreto falta —no
lanza— y cada firmante se construye como `secreto ? crearFirmante(secreto) : undefined`. Un
secreto ausente **no rompe el arranque: deja su capability sin autoridad de firma**, que ya es
fail-closed y está implementado.

Así que los 11 contenedores de secreto que el HCL creaba eran innecesarios. El runtime de
desarrollo lee un subconjunto **enumerado** de los productivos —los de **acceso**— y los tres que
confieren **autoridad** quedan fuera de su alcance:

| Secreto | Qué firmaría | Estado en desarrollo |
|---|---|---|
| `globe-credit-approval-secret` | aprobaciones de crédito | **denegado** — podría aprobar gasto productivo |
| `globe-model-rights-attestation-secret` | derechos comerciales | **denegado** — sostiene responsabilidad legal |
| `globe-model-readiness-attestation-secret` | readiness de modelo | **denegado** |
| `globe-producer-grant-secret` · `globe-media-ticket-secret` | acceso al output propio | legible: el gateway re-autoriza cada request |
| `globe-ui-delegation-secret` · `globe-ui-csrf-secret` · `globe-private-ingest-handle-secret` | sesión y referencias del BFF | legible |
| `globe-fal-api-key` · `globe-gemini-api-key` · `globe-openai-api-key` · `globe-fal-voice-map` | proveedores | legible: aislamiento por workspace + tope diario |

Es un control **más fuerte** que el diseño anterior, donde desarrollo tenía claves propias para
todo. Y cierra la decisión que estaba abierta sobre credenciales de proveedor: se comparten, y el
guardarraíl declara por qué es aceptable — ninguno de los legibles es bearer autosuficiente.

**El guardarraíl pasa a juzgar por autoridad, no por nombre**, con dos capas que conviven a
propósito: el denylist da el mensaje preciso cuando alguien intenta justo lo peligroso; el
allowlist es lo que hace que la **próxima** clave de autoridad —la que todavía no existe— también
se rechace. Un test nuevo exige que las dos listas sean **disjuntas**: el guardarraíl no puede
confiar en sus propias listas más de lo que confía en el entorno. Probado en rojo.

**Plan: de 43 a 26 `to add`, 0 change, 0 destroy. Cero contenedores de secreto nuevos** — los 9
recursos de Secret Manager son accessors sobre secretos existentes.

**Verificación:** `pnpm check` **exit=0** (1539 tests, 0 fail) · guardarraíl 9/9 · plan OFF sigue
en `No changes`.

## Delta 2026-08-03 — la premisa era falsa: no hacía falta un entorno de base de datos

**Éste es el estado vigente de la task.** Todo lo anterior sobre "el entorno de desarrollo de
Globe" describe un camino que se recorrió y se descartó; se conserva porque explica el descarte.

### La pregunta que lo desarmó

El operador preguntó, a mitad de ejecución: *«¿para qué necesitas una base de datos aparte para
desarrollar Globe, si lo que quiero es evolucionar Globe?»*

No hacía falta. **Globe ya separa los datos por `workspace_id`**, y el tope de gasto también es
por workspace. Desarrollar dentro de un workspace de pruebas ya deja el trabajo separado, con un
mecanismo que la plataforma tiene desde siempre. Una base aparte sólo aporta cuando el cambio
modifica el **schema** — y para el composer, el feed, el viewer, los adapters o los prompts, que
es la mayoría del trabajo, no aporta nada y cuesta infraestructura.

La lección de método, que vale más que el código: **se construyó infraestructura antes de
preguntar qué clase de cambios se iban a hacer.** El dolor declarado en `## Why This Task Exists`
era el ciclo de feedback, y el ciclo de feedback no necesitaba una base.

### Lo que sí se entregó

`pnpm globe:dev` (`scripts/globe-dev.mjs`, Globe `68c4b99` · `c8767d0` · `ee8872f`): levanta Vite
con HMR y sirve el **mismo shell que producción** (`renderShell` importado de `dist/`, igual que
`seam-smoke-server.mjs`) con un bundle que apunta al dev server. Los datos salen del fixture que
ya existía (`gvc:fixture`), levantado **dentro del mismo proceso** en vez de coordinar otro.

Verificado en navegador real, no por código de respuesta: el Producer renderiza completo y con
estilos —composer, modalidades, créditos, sugerencias, costo estimado— y **el HMR se probó de
punta a punta**: se editó un string de copy, el texto nuevo apareció y el viejo desapareció **sin
recarga**; restaurado el archivo, volvió el original.

### Dos defectos que sólo se veían MIRANDO LA PANTALLA

Ninguno de los dos aparece en un test, un lint o un código de respuesta HTTP.

1. **Pantalla negra con la consola del navegador limpia.** React montaba, el punto de montaje
   quedaba vacío, cero errores. La causa salía por la salida del dev server:
   `@vitejs/plugin-react can't detect preamble` — el plugin transforma cada componente asumiendo
   que el documento instaló el runtime de Fast Refresh, un script que Vite inyecta en SU
   `index.html`, y acá el documento lo sirve el shell real de Globe.
2. **Contenido correcto, cero estilos.** En CSP, **declarar un nonce hace que el navegador ignore
   `'unsafe-inline'`** para esa directiva — es la regla que vuelve seguros los nonces. Vite
   inyecta el CSS por JavaScript en desarrollo, así que quedaban bloqueados en silencio. En
   producción no aplica: ahí el CSS viaja como `<link nonce>` del bundle compilado.

### Lo que quedó del camino descartado, porque sirve igual

- **`packages/database` acepta un Postgres local** además del connector de Cloud SQL. Antes la
  capa de datos **no se podía ejercitar sin nube**: el connector estaba instanciado
  incondicionalmente. El guard rechaza todo host que no sea loopback, para que el modo no se use
  como atajo a la instancia gobernada. 7 tests.
- **`scripts/globe-dev-database.mjs`** levanta ese Postgres en la versión **exacta** de producción
  (16; el de Homebrew de la máquina es 18, y dos majors de diferencia mueven los errores hacia
  producción). Queda listo para el día que un cambio toque el schema.
- Los 4 buckets de desarrollo, los dos guardarraíles y el gate de aislamiento del dev shell.

### Lo que se revirtió

La base `globe_dev` creada en Cloud SQL fue **destruida** (estaba vacía); la instancia y la base
productiva nunca se tocaron. El input `target` del workflow de migraciones volvió a su forma
original. Del HCL se podaron la base, los usuarios SQL y el service account migrador.

### Pendiente, con su bloqueo nombrado

**Datos reales en el loop.** El cableado está hecho: con `GLOBE_DEV_API` apuntando a la API
privada, el dev shell mintea un ID token por impersonación y lo inyecta server-side —el patrón del
BFF, el mismo de `smoke-private-api.mjs`. **Bloqueado por IAM**: el usuario operador no tiene
`roles/iam.serviceAccountTokenCreator` sobre `greenhouse-globe-caller`, así que no puede mintear
el token. Otorgarlo es una decisión: ese principal carga `globe.lab.experiment.run`, o sea
autoridad de gasto.

## Delta 2026-08-03 (cierre de sesión) — modo live cerrado; qué falta para `complete`

Con el binding de IAM aplicado (Globe `786ee19`, por sesión Codex), el modo de datos reales quedó
funcionando y **verificado en pantalla**: el Producer local muestra las 19 piezas reales del
workspace interno con prompt, modelo, créditos y estado.

```bash
GLOBE_DEV_API=https://globe-api-internal-a6odmgzpvq-tl.a.run.app pnpm globe:dev
```

### El defecto que faltaba, y es arquitectónico

`GET /v1/session` contra la API privada responde **404**: ese endpoint vive en el BFF, no en la
API. Globe tiene dos carriles que no son intercambiables — humano (browser → BFF → API) y workload
(cliente → API con ID token) — y el cliente React consulta `/v1/session` al arrancar para saber
quién es. Con el proxy apuntando directo a la API, ese llamado daba 404 y la UI reportaba «Tu
sesión expiró»: **un síntoma que acusa a la sesión cuando lo que pasó es que se le pidió a la API
algo que nunca fue suyo.** Como el dev shell actúa de BFF, ahora provee lo que el BFF provee.

Regla general: **cuando un proxy reemplaza una capa, hereda su contrato completo**, no sólo el
tramo que uno recordaba.

### Diferencia declarada del carril workload

`globe.credits.capacity.self.get` → **403** (`balance.get` → 200). Las capabilities `*.self.*`
piden un «yo» que un service account no tiene. El síntoma es el contador de créditos del header en
`—`, y la UI **degrada bien**. Deliberadamente no se rellena derivándolo de `balance.get`: un dato
plausible haría que la pantalla mienta sobre qué carril la sirve.

### Qué falta para mover a `complete`

- **Una generación real desde el Producer local.** Es el criterio de Slice 2 y **no se ejecutó**:
  gasta créditos reales (~10 para una imagen) y eso exige decisión explícita del operador, no una
  autorización general de sesión.
- **Fixtures multimodales de audio y video** (Slice 3). Su valor bajó mucho ahora que el modo live
  funciona: el fixture quedó como el camino sin credenciales, no como la fuente principal.

Hasta que exista esa generación verificada, el estado honesto de la generación end-to-end es
`code complete, rollout pendiente` — el camino está cableado y leído, no ejercido.
