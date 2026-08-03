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

`apps/studio-client` ya tiene Vite y `apps/studio-web` ya puede servir un bundle compilado, pero no existe un
comando que levante Globe localmente con HMR, shell/BFF y runtime de desarrollo. `studio-web` sólo tiene `build`
y `start`; el bundle React se carga desde `dist/client`, por lo que la iteración visual queda acoplada a una
recompilación. Tampoco existe un contrato operativo único que indique qué se prueba con fixtures, qué se prueba
contra un provider real y qué exige Cloud Run.

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

- `docs/operations/creative-studio/AXIS_PRIVATE_PACKAGE_CONSUMPTION_RUNBOOK_V1.md`
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
- `TASK-1552` — composer y selección de capacidades del Producer.
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
- `../efeonce-globe/apps/studio-web/src/main.ts`
- `../efeonce-globe/apps/studio-web/src/**`, incluyendo BFF, rutas, runtime y bridges del Producer, sólo para
  el seam local de bundle/proxy/configuración y pruebas del runtime; no duplicar commands/readers.
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

- `../efeonce-globe/apps/studio-client` con Vite, React, Tailwind v4, `pnpm dev` y build manifestado.
- `../efeonce-globe/apps/studio-web` con servidor Node nativo, `createStudioApp`, `internal_smoke`, `start`
  y carga fail-closed del bundle desde `dist/client`.
- Stores en memoria y doubles de `createStudioApp` cubiertos por suites focales.
- Drivers/adapters y suites para Vertex, Fal, OpenAI y capabilities de imagen, audio y video.
- Scripts de canary, operator lane, diagnóstico, build-order gate y smoke de federation.
- Workflows keyless de deploy para Studio/API, workers, asset governance y derivados.

### Gap

- No hay `globe:dev` que integre Vite HMR con `studio-web`.
- No hay perfil reproducible de fixtures multimodales consumible desde el Producer local.
- No hay comando único que clasifique y ejecute `globe:verify`, `globe:provider-smoke` y
  `globe:internal-verify` con límites y evidencia.
- No hay matriz de capabilities y dependencias runtime que obligue a desplegar API/Studio, workers,
  derivados, governance, migraciones, flags, secretos/configuración y canarios cuando el slice lo requiera.
- No hay una frontera documentada que impida confundir fixture verde con provider disponible o rollout live.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `../efeonce-globe/scripts/**`, `../efeonce-globe/package.json`, `apps/studio-client` y
  `apps/studio-web` en el checkout canónico; documentación operativa en Greenhouse.
- Future candidate home: `tooling`/`remain-shared`, sin crear un workspace nuevo en esta task.
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

## Scope

### Slice 1 — Local integrated Producer runtime

- Implementar `globe:dev` para levantar `studio-client` con HMR, el Producer completo y `studio-web` local en
  un perfil explícito.
- Permitir iterar localmente sobre composer, selector/routing, feed, viewer, playback, estados de generación,
  recuperación visual y bridges BFF sin desplegar cada cambio.
- Permitir que el shell local consuma el bundle/dev server de forma segura sólo en desarrollo, manteniendo
  el bundle manifestado de producción intacto.
- Documentar puertos, health check, auth/local session, variables permitidas, límites y diagnóstico de fallos.

### Slice 2 — Producer multimodal fixture and capability harness

- Crear fixtures browser-safe y server-side para imagen, audio y video con outputs gobernados, estados
  pending/completed/failed, governance, rights, feed, viewer, poster, waveform, Range y retrieval.
- Montar esos fixtures en los puntos reales del Producer para comprobar que composer → submit → pending →
  completion/failure → feed → viewer/playback conserva el contrato, sin implementar un flujo paralelo.
- Añadir canarios locales para desktop/390px cuando la superficie sea visible, reduced motion, ausencia de
  scroll horizontal, MIME/hash y reconciliación de resultados.
- Exponer `globe:verify` como gate local reproducible, sin gasto ni mutación de runtime real.

### Slice 3 — Real provider smoke lane

- Implementar `globe:provider-smoke` sobre la autoridad existente, con selección explícita de modalidad/ruta,
  workspace, budget, idempotency key y modo readback-first.
- Cubrir al menos una ruta real de imagen, una de audio y una de video sólo cuando cada una esté available,
  atestada, configurada y soportada por su worker/driver simétrico.
- Validar resultado real por bytes, MIME, hash, output shape, governance, rights, feed/viewer y cobro único.

### Slice 4 — Deployable promotion bundle

- Implementar `globe:internal-verify` y un reporte de promoción que derive los consumidores del slice:
  Studio/API, producer worker, creative runner, asset governance, media derivatives, jobs, migrations,
  flags, env/secrets, IAM/configuración, observabilidad y canarios.
- Verificar que el workflow keyless despliegue la imagen correcta desde `main`, con SHA/digest/revisión/tráfico
  exactos y baseline de rollback.
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

- Definir durante Zone 2 si el provider smoke real se ejecutará desde CLI local contra la autoridad internal-only,
  desde una UI local con proxy same-origin o desde un workflow keyless; no se autoriza decidirlo por bypass.
- Confirmar durante discovery qué capabilities de audio y video están actualmente `available` y cuáles sólo
  tienen integración de Lab o permanecen gated.
