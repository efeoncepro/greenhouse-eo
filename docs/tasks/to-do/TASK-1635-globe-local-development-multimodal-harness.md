# TASK-1635 — Globe Local Development, Multimodal Harness and Deployable Promotion Flow

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
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

Globe necesita un flujo local-first que permita desarrollar el Producer completo —composer, selección de ruta,
feed, viewer, playback, BFF y workers de ejecución/governance— y sus capacidades multimodales sin recompilar y
desplegar a Cloud Run después de cada cambio. La task crea un harness local integrado para `studio-client`,
`studio-web`, contratos, fixtures y estados de imagen/audio/video, y un camino explícito para validar providers
reales y promover el lote completo a los runtimes que correspondan.

El resultado no es un simulador que sustituye producción: separa evidencia local, smoke real de provider y
verificación internal-only, manteniendo créditos, governance, IAM, Cloud SQL, GCS, workers, flags, secretos,
migraciones, canarios y rollback dentro del cierre de despliegue cuando apliquen.

## Why This Task Exists

`apps/studio-client` ya tiene Vite (`pnpm dev`) y `apps/studio-web` ya sirve un bundle compilado —
`seam:smoke` incluso lo sirve por el shell real bajo la CSP real. Lo que **no** existe es el eslabón entre
ambos: un comando que levante Globe localmente con **HMR** sobre un shell ejecutable. `studio-web` no tiene
modo `dev`, y el bundle React se registra desde el manifest de `dist/client`, por lo que la iteración visual
queda acoplada a una recompilación completa. Tampoco existe un contrato operativo único que clasifique qué se
prueba con fixtures, qué se prueba contra un provider real y qué exige Cloud Run: las piezas existen
(`check`, `gvc:fixture`, `globe:runtime-drift`, `smoke-private-api`, `production-promotion-cli`, 10 canarios)
pero sin composición ni carriles nombrados.

El despliegue actual exige SHA exacto en `main`, Cloud Build, Artifact Registry y Cloud Run. Ese control debe
seguir protegiendo el runtime, pero debe ocurrir después de una verificación local y por lote, no como mecanismo
de feedback para cada modificación.

## Goal

- Permitir desarrollar y revisar localmente las superficies de Globe con HMR y un shell/BFF ejecutable.
- Probar de forma reproducible las capabilities existentes de imagen, audio y video con fixtures completos,
  incluyendo estados terminales, errores, governance, feed, viewer y playback.
- Permitir smoke tests reales y acotados de providers sin bypass de Producer, créditos, idempotencia,
  provenance, rights ni Asset Governance.
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
- Extraction blocker: el smoke end-to-end depende de la transacción y autoridad compartidas de Globe
  (identity, credits, Cloud SQL, GCS, workers y provider bindings); el modo local de UI debe poder funcionar
  sin esos servicios, pero no puede declarar evidencia live sin ellos.

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
- Tenant/space boundary: local usa un workspace sintético explícito y no puede aparentar identidad cliente;
  provider smoke/internal usa el workspace interno y la identidad/capability que ya gobierna Globe.
- Idempotency/concurrency: provider smoke conserva una clave por canary lógico, serializa la prueba por ruta y
  reconcilia por reader antes de reintentar; los comandos locales no crean reservas reales.
- Audit/outbox/history: fixtures y verify local dejan reporte local; provider smoke/internal usa audit, outbox,
  run/attempt y señales canónicas del runtime real.

### Migration, backfill and rollout

- Migration posture: `none` para el harness; migrations existentes sólo se ejecutan mediante el procedimiento
  del runtime consumidor y nunca desde `globe:dev`.
- Default state: fixtures/local habilitados; provider smoke explícito y con budget; flags de producción sin
  cambios; cualquier nuevo seam de desarrollo default-OFF fuera de local.
- Backfill plan: `N/A — no backfill`; si una capability requiere backfill, queda fuera del smoke local y se
  incorpora como prerequisito de la task dueña.
- Rollback path: detener el proceso local; revertir el seam o apagar el flag de desarrollo; para rollout,
  usar rollback de revisión del workflow y revertir flags/configuración según el runbook, nunca limpiar SQL a mano.
- External coordination: provider budget/terms, Secret Manager accessors, OAuth redirect local si se necesita,
  Cloud Build, Cloud Run services/jobs, Cloud SQL migrations, GCS buckets y canarios requieren coordinación y
  evidencia explícita antes del rollout.

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

### Slice 1 — Local integrated Producer runtime

- Implementar `globe:dev` para levantar `studio-client` con HMR, el Producer completo y `studio-web` local en
  un perfil explícito.
- Permitir iterar localmente sobre composer, selector/routing, feed, viewer, playback, estados de generación,
  recuperación visual y bridges BFF sin desplegar cada cambio.
- El shell de desarrollo vive **fuera** de la entrada productiva (invariante 1 del Detailed Spec) y reusa el
  renderer real igual que `seam-smoke-server.mjs`; el bundle manifestado de producción queda intacto.
- Agregar el gate mecánico que rompe el build si `apps/studio-web/src/main.ts` o `src/app.ts` alcanza el
  módulo de desarrollo, en el **mismo commit** que introduce el modo.
- Documentar puertos, health check, auth/local session, variables permitidas, límites y diagnóstico de fallos,
  y la diferencia con `seam:smoke` (bundle compilado bajo CSP real) — los dos coexisten y prueban cosas
  distintas.

### Slice 2 — Producer multimodal fixture and capability harness

- **Extender `apps/studio-web/scripts/producer-gvc-fixture.mjs`** (no crear un segundo fixture) a audio y
  video, con outputs gobernados, estados pending/completed/failed, governance, rights, feed, viewer, poster,
  waveform, Range y retrieval. La proyección de flota y las rutas se **derivan** de `PRODUCER_ROUTE_CATALOG`
  y de los contratos publicados (invariante 4); el `FLEET_AVAILABILITY` literal actual se convierte en
  derivación con overrides explícitos por caso.
- Montar esos fixtures en los puntos reales del Producer para comprobar que composer → submit → pending →
  completion/failure → feed → viewer/playback conserva el contrato, sin implementar un flujo paralelo.
- Añadir canarios locales para desktop/390px cuando la superficie sea visible, reduced motion, ausencia de
  scroll horizontal, MIME/hash y reconciliación de resultados.
- Exponer `globe:verify` como gate local reproducible, sin gasto ni mutación de runtime real. **`globe:verify`
  invoca `pnpm check` y los canarios existentes**; no re-deriva typecheck, tests ni gates de fuente. Si
  `globe:verify` y `check` pueden divergir, el diseño está mal: hay un solo gate local y `globe:verify` es su
  nombre compuesto.

### Slice 3 — Real provider smoke lane

- Implementar `globe:provider-smoke` **como cliente delgado del spine** (mismo patrón que
  `smoke-private-api.mjs` / `globe-operator-lane.mjs` / `production-promotion-cli.mjs`), con selección
  explícita de modalidad/ruta, workspace, budget, idempotency key y modo readback-first.
- Cubrir al menos una ruta real de imagen, una de audio y una de video sólo cuando cada una esté available,
  atestada, configurada y soportada por su worker/driver simétrico. La matriz de rutas elegibles se **deriva
  de `globe.producer.fleet.list`** (invariante 4), nunca de una lista literal: si una ruta se promueve o se
  bloquea, la cobertura del smoke lo refleja sin editar el script.
- Validar resultado real por bytes, MIME, hash, output shape, governance, rights, feed/viewer y cobro único.

### Slice 4 — Deployable promotion bundle

- Implementar `globe:internal-verify` y un reporte de promoción que derive los consumidores del slice:
  Studio/API, producer worker, creative runner, asset governance, media derivatives, jobs, migrations,
  flags, env/secrets, IAM/configuración, observabilidad y canarios.
- Verificar que el workflow keyless despliegue la imagen correcta desde `main`, con SHA/digest/revisión/tráfico
  exactos y baseline de rollback, **invocando `scripts/globe-runtime-drift.mjs --expect <sha>`** en vez de
  reimplementar la comparación de revisión activa.
- El reporte de promoción es un **lector** sobre la saga de ADR-009 (`production-promotion-cli.mjs` y sus
  readers), nunca una segunda noción de promoción ni una fuente de evidencia propia (invariante 5).
- Ejecutar un lote real internal-only y documentar qué quedó `complete`, `code complete, rollout pendiente`
  u `operativamente bloqueado`.

### Slice 5 — Operating documentation and handoff

- Actualizar runbook técnico de Globe con el flujo local-first → provider smoke → internal verify → promotion.
- Registrar límites, costos, secretos, auth, recovery, rollback, evidencia y troubleshooting.
- Actualizar Greenhouse Handoff y la matriz de capabilities sin declarar disponibles las rutas que sólo tienen
  fixtures.

## Out of Scope

- Sustituir Cloud Run, Cloud SQL, GCS, Secret Manager, IAM, Cloud Build o el release control plane.
- Crear un backend local paralelo, un segundo ledger, una segunda identidad o una allowlist de providers propia.
- Promover modelos, alterar atestaciones/rights o habilitar clientes externos desde el harness.
- Emular completamente providers, governance, workers o almacenamiento y tratar esa emulación como evidencia live.
- Migrar Globe a Vercel/Next.js o cambiar la decisión vigente de hosting.
- Resolver capabilities de Producer que pertenecen a `TASK-1504`, `TASK-1552`, `TASK-1633` u otra task dueña.

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

- Slice 1 MUST precede Slice 2: los fixtures necesitan el shell local integrado.
- Slice 2 MUST precede Slice 3: primero se prueba el flujo multimodal sin gasto y se valida la forma de salida.
- Slice 3 MUST precede Slice 4 para cada ruta real: provider, binding, policy, worker y canary deben estar listos.
- Slice 4 MUST verify every runtime consumer before any flag flip or migration apply.
- Slice 5 puede documentarse en paralelo, pero el cierre final exige evidencia de Slices 1–4 y handoff actualizado.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---:|---|---|
| El modo local dispara provider real o gasto por configuración heredada | provider/credits | medium | perfiles explícitos, default fixtures, allowlist y budget fail-closed | provider submit inesperado / reservation local |
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
| 1 | detener `globe:dev` y revertir el seam local; producción continúa usando bundle compilado | <5 min | sí |
| 2 | deshabilitar fixtures/canarios nuevos o revertir scripts; no toca runtime live | <5 min | sí |
| 3 | detener lane, reconciliar por readers y cerrar budget/circuit; nunca repetir execute a ciegas | <30 min | sí, con recuperación gobernada |
| 4 | usar baseline de rollback del workflow, revertir flags/config y restaurar revisión; migrations sólo con rollback aprobado por su task dueña | <30 min inicial | parcial, según consumidor |
| 5 | corregir runbook/Handoff y repetir evidencia; no se declara cierre hasta consistencia documental | <1 día | sí |

### Production verification sequence

1. Ejecutar `globe:verify` local con fixtures image/audio/video y verificar cero gasto/mutación real.
2. Ejecutar build-order, typecheck, lint, tests y canarios del cliente/Studio.
3. Preparar la lista de consumidores del slice y verificar image/digest/config/secret/IAM/worker/migration.
4. Ejecutar provider smoke real sólo en internal-only, con ruta available, budget e idempotency explícitos.
5. Leer run/attempt/output/credits/governance/feed y comprobar cobro único, bytes/MIME/hash y recovery.
6. Construir y desplegar desde `main` los servicios/workers/jobs que correspondan mediante workflows keyless.
7. Verificar SHA, digest, revisión Ready, tráfico, flags, migrations, secrets, accessors y señales.
8. Ejecutar canario humano desde Producer autenticado para cada modalidad/ruta exigida.
9. Ejecutar readback/recovery y confirmar que no hay segundo submit, attempt, settlement ni cobro.
10. Documentar evidencia, rollback disponible y estado honesto; detenerse ante cualquier mismatch.

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

- [ ] `TASK-1635` tiene comandos documentados y ejecutables para `globe:dev`, `globe:verify`,
  `globe:provider-smoke` y `globe:internal-verify`.
- [ ] `globe:dev` levanta `studio-client` con HMR y `studio-web` local sin desplegar ni recompilar manualmente
  después de cada cambio visual.
- [ ] El shell productivo continúa cargando el bundle manifestado compilado y el seam de desarrollo falla
  cerrado fuera del perfil local.
- [ ] Fixtures cubren imagen, audio y video, incluyendo output, pending, failed, governance, rights, feed,
  viewer, poster, waveform, playback y retrieval donde la capability exista.
- [ ] `globe:verify` demuestra cero gasto, cero mutation de Cloud SQL/GCS/ledger y cero provider submit.
- [ ] Existe al menos un provider smoke real de imagen, audio y video cuando cada ruta cumpla sus gates; si una
  modalidad continúa gated, el reporte lo declara con razón canónica y no usa fixture como sustituto.
- [ ] Cada provider smoke conserva una sola idempotency key, usa readback-first y demuestra ausencia de doble
  attempt, submit, settlement o cobro.
- [ ] El smoke real valida bytes, MIME, hash, output shape, governance, rights, feed/viewer y playback según
  modalidad, sin confiar sólo en extensión o metadata declarada.
- [ ] El reporte de promoción lista todos los consumidores runtime afectados y evidencia API/Studio, workers,
  jobs, derivatives/governance, migrations, flags, env/secrets, IAM, observability, canary y rollback.
- [ ] El deploy real usa el SHA exacto de `main`, imagen/digest/revisión/tráfico verificados y baseline de rollback;
  no introduce bypass de GitHub, Cloud Build o Cloud Run.
- [ ] El lote desplegado queda verificado internal-only con canarios autenticados y readbacks; no se declara
  comercial/external readiness.
- [ ] No se imprimen ni almacenan tokens, secretos, service-account JSON, URLs firmadas, cuerpos upstream,
  stacks ni raw errors en fixtures, reportes o logs.
- [ ] Existe un test que **rompe el build** si la entrada productiva (`apps/studio-web/src/main.ts`,
  `src/app.ts`) alcanza el módulo del shell de desarrollo; se prueba rojo en ambas direcciones.
- [ ] Ningún comando del harness reimplementa arte previo: `globe:verify` invoca `pnpm check`,
  `globe:internal-verify` invoca `globe-runtime-drift`, el smoke usa el SDK y el reporte de promoción lee la
  saga de ADR-009. Un grep demuestra que no hay import de handlers de `packages/domain` desde `scripts/**`.
- [ ] Las rutas del smoke y la proyección de flota de los fixtures se **derivan** del lector/catálogo; un
  cambio de contrato rompe la compilación del fixture en vez de dejarlo verde.
- [ ] `pnpm task:lint --task TASK-1635`, `pnpm ops:lint --changed` y los gates proporcionales de Globe pasan.
- [ ] Greenhouse `Handoff.md`, `GLOBE_RUNTIME_HANDOFF.md`, README de tasks y evidencia técnica quedan sincronizados.

## Verification

- `pnpm task:lint --task TASK-1635`
- `pnpm ops:lint --changed`
- En Globe: `pnpm check`, `pnpm build`, suites focales de `studio-client` y `studio-web`.
- En Globe: `pnpm globe:verify` con fixtures image/audio/video.
- Provider smoke real image/audio/video con budget y workspace autorizados.
- `globe:internal-verify` y workflows keyless de cada consumidor runtime aplicable.
- Canario humano Producer + readback de run/attempt/output/credits/governance/feed/viewer.
- Verificación de rollback/revisión baseline proporcional al lote desplegado.

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
