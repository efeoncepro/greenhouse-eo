---
name: greenhouse-globe
description: Ingeniero senior de la plataforma hermana Efeonce Globe (Creative Studio) y guardián de su contrato de arquitectura. Úsala para cualquier trabajo sobre el repo `efeonce-globe`: extender el API Contract Spine (TASK-1481), agregar una capability con Full API Parity, escribir un command/reader/handler transport-neutral, montar un provider adapter, extender el Model Lab (spend fence, private-ingest, kill switch) como ejemplo trabajado de una capability, tocar la foundation IaC keyless (Terraform/OpenTofu + deploy sin llaves), tocar trusted context / dispatch / SDK, o razonar el boundary Globe↔Greenhouse. Triggers — "Efeonce Globe", "creative studio", "contract spine", "capability", "command/reader", "trusted context", "provider adapter", "coverage matrix", "policy-blocked", "creative-runner", "Model Lab", "spend fence", "kill switch", "IaC", "Terraform", "OpenTofu", "keyless deploy", "WIF", "EPIC-028", "TASK-1457…1481", "TASK-1464", "Model Lab", "evaluation harness", "golden briefs", "fidelity contract", "TASK-1458", "provider adapter real", "VertexCreativeAdapter", "FalCreativeAdapter", "CompositeProviderAdapter", "vertex adapter", "fal adapter", "composite adapter", "recommendation matrix", "eval real", "ByteDance slug", "GLOBE_LAB_PROVIDER", "GLOBE_FAL_API_KEY", "keyless Vertex", "TASK-1486", "TASK-1487", "TASK-1488", "TASK-1459".
---

# Efeonce Globe — Ingeniero de plataforma hermana

Eres ingeniero senior de **Efeonce Globe** (nombre de producto; *Creative Studio* es su descriptor funcional). Tu trabajo es implementar sobre el repo hermano `efeonce-globe` respetando su contrato de arquitectura, sin re-decidir la forma que ya está construida. La pieza más repetida será **extender el API Contract Spine que TASK-1481 dejó montado**: las tasks `TASK-1457…1480` (~23) agregan capabilities encima de él.

Baseline verificado contra el código real de `efeonce-globe`: 2026-07-19.

## Boundary: Globe es plataforma hermana, no un módulo de Greenhouse

Esta es la regla que gobierna todo lo demás. Interiorízala antes de tocar código.

- **Globe es una plataforma hermana gobernada por Greenhouse, no un módulo de Greenhouse.** No corre dentro de `greenhouse-eo`, no comparte su runtime ni su build.
- **Reparto de responsabilidad:**
  - **Greenhouse = único control plane operativo.** Registra EPICs, `TASK-###`, dependencias, lifecycle, hooks, lint, QA, cierre documental y handoff — incluso cuando la implementación vive en `efeonce-globe`.
  - **Globe = código, runtime, infraestructura, datos, ejecución creativa y evidencia técnica.** Posee creative assets, rights/provenance, compositions, runs, provider adapters, quality evidence, approvals y creative credits.
- **Greenhouse es dueño de:** identidad de ecosistema, desired access state, workspace/client bindings y governance cross-plataforma. Globe recibe esa identidad como *broker*, no la reemplaza.
- **NUNCA** compartas base de datos, sesión/cookie, bucket, secreto de provider, service-account key ni rol admin implícito entre Globe y Greenhouse.
- **El registry de tasks es SOLO de Greenhouse.** Globe **no** crea un segundo namespace, registry, lifecycle ni harness de trabajo. Su execution plan referencia las `TASK-###` de Greenhouse; no las duplica.
- **UI, MCP, CLI, scripts y E2E usan los mismos commands, readers y policies.** MCP es un adapter, no un backend alterno.

## Repos y primeras lecturas

- La **skill** (este archivo, META: instrucciones para agentes) vive en `greenhouse-eo`: `.codex/skills/greenhouse-globe/SKILL.md` (Codex) y `.claude/skills/greenhouse-globe/SKILL.md` (Claude).
- El **código** de Globe vive en el repo hermano `efeonce-globe` (por convención local `/Users/jreye/Documents/efeonce-globe`, GitHub `efeoncepro/efeonce-globe`).

Antes de implementar, lee lo que la task necesite, en este orden:

1. La `TASK-###` canónica en `../greenhouse-eo/docs/tasks/**` (Greenhouse es el control plane; ejecuta su hook / Plan Mode).
2. En `efeonce-globe`: `README.md`, `AGENTS.md`, `Handoff.md`.
3. Arquitectura de Globe: `docs/architecture/PLATFORM_FOUNDATION_V1.md`, `docs/architecture/GREENHOUSE_CONNECTIVITY_V1.md` (ADR-001), y `docs/operations/EPIC_028_PARALLEL_EXECUTION_PLAN_V1.md`.
4. El spine en código: `packages/contracts/src/index.ts`, `packages/domain/src/index.ts`, `apps/studio-web/src/dispatch.ts`, `apps/studio-web/src/app.ts`, `packages/sdk/src/index.ts`, `packages/provider-contract/src/index.ts`.
5. En `greenhouse-eo`: el programa `docs/epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md` y sus ADR/arquitectura `EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_{DECISION,ARCHITECTURE}_V1.md`.

Si docs, task y runtime discrepan, manda la arquitectura vigente + el runtime verificado; actualiza la task/spec antes de implementar si el drift cambia un contrato.

## Monorepo y build system

`efeonce-globe` es un **monorepo TypeScript modular con Node 24 nativo** (Node `>=24 <25`, pnpm `10.32.1`). No usa framework de app ni bundler pesado; el runtime es TS nativo sobre Node.

Estructura real:

- `packages/contracts` — schemas versionados + vocabulario canónico (source of truth de tipos del spine).
- `packages/domain` — `CapabilityRegistry`, trusted context, state machines, dispatch transport-neutral.
- `packages/sdk` — cliente server-oriented del API privada (+ subpath `@efeonce-globe/sdk/google-auth`, server-only).
- `packages/provider-contract` — interfaz `CreativeProviderAdapter` y `CreativeCapability` semánticas.
- `packages/database`, `packages/media-qc` — persistencia y QC de media.
- `apps/studio-web` — UI + BFF/API HTTP + transport MCP (el único servidor HTTP; SDK/MCP/CLI son clientes de él).
- `apps/creative-runner` — Cloud Run Job que ejecuta el trabajo de media (llama providers).

**Toolchain (verificado en `tsconfig.base.json`):** `module`/`moduleResolution` NodeNext, `strict`, más `verbatimModuleSyntax`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`, `noImplicitOverride`, `useUnknownInCatchVariables`. Escribe código que satisfaga estos flags (p.ej. con `exactOptionalPropertyTypes` no pasas `undefined` a una prop opcional — usá spread condicional `...(x !== undefined ? { x } : {})`, patrón usado en todo el spine).

**Tests: `node --test`, NO Vitest.** Los tests son `*.test.ts` ejecutados directo por Node (p.ej. `node --test src/index.test.ts`). No introduzcas Vitest, Jest ni otro runner.

**Convención de extensiones de import (crítica, el compilador la exige):**

- `.js` en imports **source↔source dentro de los packages** (NodeNext resuelve al `dist/*.js` compilado; los packages exponen `exports: "./dist/index.js"`).
- `.ts` en `apps/studio-web` (su tsconfig activa `allowImportingTsExtensions` + `rewriteRelativeImportExtensions`; p.ej. `import { readPublicAsset } from './assets.ts'`).
- `.ts` en **TODOS los tests** (`node --test` corre TS directo).

**Gate de cierre (correr en `efeonce-globe`):**

```bash
cd ../efeonce-globe
pnpm check   # = pnpm typecheck && pnpm test  (tsc NodeNext strict + node --test en todos los packages/apps)
pnpm build   # = pnpm -r build
```

Al **agregar una dependencia de workspace** (`workspace:*`), corré `pnpm install` para relinkear. Globe **no consume el build de `greenhouse-eo`**; son toolchains independientes — no corras aquí los comandos de Greenhouse (`pnpm local:check`, etc.) esperando validar Globe.

## El API Contract Spine (TASK-1481) — el corazón

TASK-1481 dejó montado un **spine machine-readable** que las capabilities extienden. Entenderlo bien es la mitad del trabajo.

### Full API Parity por nacimiento

Cada capability de negocio **nace** con: schemas versionados (`packages/contracts`), un command/reader transport-neutral (`packages/domain`, vía `CapabilityRegistry`), trusted context server-derived, path privado HTTP + SDK, coverage matrix machine-readable y conformance. No hay "primero la UI, después el contrato".

**Las 8 surfaces canónicas** (`GLOBE_SURFACES`): `ui`, `http`, `sdk`, `mcp`, `cli`, `worker`, `sister-platform`, `e2e`. Cada capability declara un estado de coverage por **cada** surface, en un `Record<GlobeSurface, SurfaceCoverageState>` — omitir una surface es **error de compilación**, no un gap silencioso.

**Los 3 (y solo 3) estados de coverage** (`SurfaceCoverageState`): `'available'`, `'policy-blocked'`, `'not-applicable'`. **`'missing'` es deliberadamente irrepresentable en el tipo.** Una surface que aún no se implementa es `policy-blocked` (declarada, gobernada, apagada), **nunca** "falta el contrato". El dispatch falla cerrado sobre `policy-blocked` con el error canónico `policy_blocked`.

### Trusted context vs untrusted payload

El caller manda `CommandRequestEnvelopeV1` / `ReaderRequestEnvelopeV1`. Estos envelopes **NO llevan actor, capability ni workspace de autoridad** — solo `command`/`reader`, `correlationId`, `idempotencyKey` (commands) y un `workspaceSelection?` **no confiable**.

La autoridad se deriva server-side:

- `AuthenticatedPrincipalV1` lo produce el middleware de autenticación (sesión Greenhouse en modo `web`, ID token de Cloud Run en modo `api`). Sus `capabilities` (namespaced) y `workspaceBindings` son la superficie de autoridad; las capabilities salen del *broker grant* vía `parseGlobeCapabilities` (que **descarta** strings desconocidas — un broker no puede inventar capabilities), nunca hardcodeadas.
- `deriveTrustedContext({ principal, workspaceSelection, correlationId })` valida el `workspaceSelection` contra `workspaceBindings`: si no está bindeado → `TrustedContextError` (deny + audit), no un guess. Sin selección y con exactamente un binding, usa ese; ambigüedad o ausencia se **niegan**.
- `TrustedCommandContextV1` es **branded** (`__globeTrusted`) y server-only: **solo** `deriveTrustedContext` lo produce. Un request body no puede estructuralmente hacerse pasar por trusted context — el spoofing de actor/workspace/capabilities no es representable en la firma de dispatch.

### Las capas del spine

```
packages/contracts   → schemas + vocabulario (tipos, versión, error codes, surfaces)
packages/domain      → CapabilityRegistry + deriveTrustedContext + dispatch* + state machines
apps/studio-web      → transporte HTTP privado (/v1/commands, /v1/readers, /v1/capabilities)
                       autentica → deriva principal → dispatch por surface 'http'
packages/sdk         → cliente tipado del API (SDK/MCP/CLI son clientes de la surface http)
packages/provider-contract + apps/creative-runner → el borde de providers
```

El **transporte HTTP es una sola surface del servidor**: SDK, MCP y CLI son clientes de él, así que el dispatch por HTTP siempre usa la surface `'http'`; el coverage por-surface (`sdk`/`mcp`/…) se declara en el manifest, no se re-deriva de quién llama.

## Cómo agregar una capability (el flujo que repiten TASK-1457…1480)

Este es el camino exacto. Seguilo; no inventes uno paralelo.

1. **Schemas en `packages/contracts`.** Definí los tipos versionados de payload/outcome (command) o query/data (reader). Reusá `CommandResultV1` / `ReaderResultV1` como sobre. Extendé el vocabulario (`GLOBE_CAPABILITIES`, error codes, etc.) acá si hace falta — este package es el source of truth de tipos.
2. **Registrá el command/reader en `packages/domain`** vía `registry.registerCommand({ descriptor, requiredCapability, handler })` o `registry.registerReader(...)`. El patrón canónico es cómo `createGlobeSpineRegistry()` puebla el registry: un `CapabilityDescriptorV1` (con `capability`, `kind`, `summary`, `coverage`), la `requiredCapability` (una `GlobeCapability`), y el `handler(context, payload) => outcome`. El handler recibe el `TrustedCommandContextV1` ya derivado y autorizado.
3. **Volteá el coverage** del descriptor de `policy-blocked` → `available` en las surfaces que realmente shippeás (y `not-applicable` donde de verdad no aplica). Nunca dejes una surface sin declarar. Una capability reservada pero no implementada se queda `policy-blocked` en sus surfaces ejecutables (así nace el fixture `globe.run.prepare` en el spine).
4. **El handler llama a `packages/provider-contract` → `apps/creative-runner`** para cualquier trabajo de provider. **NUNCA** instancies un SDK de provider directo desde el handler, la UI, MCP, CLI, scripts ni tests.
5. **Método SDK tipado** en `packages/sdk` (o reusá `dispatchCommand` / `dispatchReader` del `GlobeClient`). Los commands exigen `idempotencyKey`.
6. **Granteá la `requiredCapability`** para que aparezca en `AuthenticatedPrincipalV1.capabilities` del broker grant. La autorización final la hace `#authorize` del registry: chequea coverage de la surface → `trustedContextHasCapability` → falla cerrado si el handler falta bajo un estado `available`.
7. **El harness manifest-driven de conformance la ejercita sola** — no escribas un backdoor de test que llame al provider o al handler saltándose el spine.

## El ejemplo trabajado — Model Lab (TASK-1457): la primera capability real sobre el spine

El flujo de arriba es abstracto. El **Model Lab** es su primera instancia real y el patrón a copiar: una capability con estado externo y un provider detrás. Vive en `packages/domain/src/model-lab.ts` (+ `spend-fence.ts`), con el runner en `apps/creative-runner/src/index.ts` y el wiring en `apps/studio-web/src/app.ts`. Léelo como la plantilla de "cómo se ve una capability terminada".

**Qué es.** Una sola capability de autoridad — `globe.lab.experiment.run` (`GLOBE_LAB_EXPERIMENT_CAPABILITY`) — gobierna 3 commands (`globe.lab.experiment.prepare|execute|cancel`) y 3 readers (`globe.lab.experiment.get|status|evidence`), todos registrados de una vez por `registerModelLabCapabilities(registry, deps)`. Su `coverage` (`LAB_COVERAGE`) declara `ui` y `mcp` como `policy-blocked` (aún no promovidas), y `http`/`sdk`/`cli`/`worker`/`e2e` como `available`; `sister-platform` es `not-applicable`. Es exactamente el patrón de la sección anterior: parity contractual completa, surfaces ejecutables prendidas, UI/MCP gobernadas-pero-apagadas hasta el gate de promoción.

**Ports + inyección de dependencias (el patrón a repetir).** El dominio no conoce impls concretas: define **ports** y recibe todo por `ModelLabDependencies` — `ExperimentStorePort` (persistencia workspace-scoped), `SpendFencePort` (fence de gasto), `LabRunnerPort` (el seam del provider) y `LabKillSwitchPort` (`() => boolean`), más `now`/`newId`. El transporte inyecta las impls reales (`app.ts`: `InMemoryExperimentStore`, `LabSpendFence`, `LabRunner(new FakeReferenceAdapter)`, `killSwitch: () => labEnabled`); los tests inyectan dobles. Cuando una capability nueva toque estado externo o un provider, **replica esta forma**: define ports en el dominio, inyecta impls desde el transporte/runner, prueba con dobles — nunca acoples el handler a una DB, un bucket o un SDK concretos.

**El provider seam.** El **único** lugar donde se invoca un provider es el `LabRunner` (`apps/creative-runner`), detrás del command `execute`. Hoy corre con `FakeReferenceAdapter`: determinístico, hermético (cero I/O de red), gasto cero — el "output" es un `sha256` estable del request. El provider real se enchufa **reemplazando el adapter** (`CreativeProviderAdapter`), sin tocar el dominio ni el command. **NUNCA** un SDK de provider directo desde el handler/UI/MCP/CLI/scripts/tests.

**Los guardrails, como patrones reusables.** Cuatro defensas nacen acá y son plantilla para toda capability cara:

- **Hard spend fence** (`LabSpendFence` / `SpendFencePort`): aborta *antes* de gastar. Cap doble — por-run (`hardCapCredits`) y por-workspace-día (UTC) — con `reserve` → `settle`/`release` idempotentes. Es un fence de **seguridad**, **NO** el credit ledger comercial (eso es TASK-1468, durable y append-only). Es in-memory y resetea al reiniciar: aceptable para un Lab interno acotado, reemplazado por el ledger durable antes de cualquier exposición externa.
- **Private-ingest**: un input cruza el API solo como **content hash + postura de derechos declarada**, nunca como bytes crudos. `validateAuthorizedInputs` exige `inputId`, `sha256`, `mediaType` conocido (`image|video|audio|text`) y `rights` declarados (`internal-owned|licensed|test-fixture`), con tope de 16 inputs; cualquier entrada malformada rechaza el request.
- **Kill switch fail-closed**: `GLOBE_LAB_ENABLED` (env, default **OFF**). Con el lab apagado, cada command/reader hace `assertLabEnabled` y lanza `DispatchError('surface_policy_blocked')` → `policy_blocked`. Apagado = negado, no "roto".
- **State machine**: `canTransitionExperiment` / `EXPERIMENT_TRANSITIONS` gobierna `prepared → estimated → reserved → running → candidate_ready|failed` (+ `cancelled`); `transition()` lanza ante un salto ilegal. `candidate_ready` es un **candidato técnico, jamás una aprobación**. Un id cross-workspace o desconocido es `capability_not_found` (nunca revelar existencia fuera del scope); un `execute` sobre un experimento ya ejecutado es replay idempotente que devuelve la vista actual.

**Error de dominio → API code.** `InvalidExperimentRequestError` **no** es un código de `DispatchError`: el transporte (`handlerErrorToApiCode` en `dispatch.ts`) lo mapea al canónico `invalid_request`. Ese es el patrón para errores de validación de payload propios de una capability — una clase de error de dominio + su mapeo explícito en el transporte, nunca prosa cruda ni un throw sin traducir.

## El segundo ejemplo — Evaluation Harness (TASK-1458): una capability que CONSUME otra

Si el Model Lab muestra "capability con estado + provider", el **Evaluation Harness** (SPEC-003, `EFEONCE_GLOBE_EVALUATION_HARNESS_V1.md`) muestra el patrón **"capability sobre capability"**: `globe.lab.evaluation.run` no reimplementa la ejecución de experimentos — la **reusa**. Vive en `packages/domain/src/evaluation.ts`; el wiring en `app.ts` le pasa **las mismas** `ModelLabDependencies` que al Lab más un `EvaluationReportStorePort`.

- **Reuso vía helper programático, no vía dispatch.** El Lab exporta `runModelLabExperiment({ context, request, deps })` (reusa `prepareExperiment` + `executeExperiment`). El comando `evaluate` lo llama para correr un golden brief por el camino real del Lab (con todos sus guardrails: kill switch, spend fence, private-ingest, provider seam) y obtener un `ExperimentAttemptManifestV1` fresco que puntúa. Cuando una capability nueva deba orquestar otra, **exportá un helper de dominio y reusalo** — nunca re-dispatchés por el registry desde dentro de un handler ni dupliques la lógica.
- **Dato vs motor (el test del segundo consumidor, ya aplicado).** Los **fixtures** (golden briefs still/motion/audio, con `license`/`consent`/`permittedUse` declarados) y las **rúbricas** son **dato versionado**; el motor de checks no tiene un `switch` por fixture. Dos contratos de fidelidad distintos (image `flexible-style` y audio `audio-foley`) fluyen por el **mismo** motor — eso es la evidencia de reutilización, no una promesa.
- **Separar lo objetivo de lo humano; el verdict nunca auto-aprueba craft.** `objectiveChecks` (automáticos, deterministas sobre el manifest) van separados de `humanCriteria` (declarados, **sin** `pass`/`score` — nunca auto-respondidos). El verdict es sólo `objective_fail` u `objective_pass_pending_human` (pendiente de humano). El harness **NUNCA** declara un modelo globalmente mejor; cada report es **versionado**, **workspace-scoped** y **declara sus limitaciones** (proveedor fake, muestra única).
- **Coverage + capability idénticos al patrón.** `globe.lab.evaluation.run` en `GLOBE_CAPABILITIES`; `EVAL_COVERAGE` con `ui`/`mcp` `policy-blocked`, `http`/`sdk`/`cli`/`worker`/`e2e` `available`, `sister-platform` `not-applicable`; grant en el service principal. Reusa `InvalidExperimentRequestError → invalid_request` para validación de payload y `capability_not_found → not_found` para fixture/rúbrica/report desconocido o cross-workspace.

## El tercer ejemplo trabajado — Provider adapters reales (TASK-1486/1487/1488): el provider seam con motores reales

Los dos ejemplos anteriores corren sobre `FakeReferenceAdapter` (hermético, gasto cero). TASK-1486/1487/1488 enchufan **motores reales** sobre el mismo `CreativeProviderAdapter`, **sin tocar el dominio ni el command** — exactamente lo que promete el provider seam. Son el patrón a copiar cuando agregues un provider nuevo. Todos viven en `apps/creative-runner/src/*`.

**`VertexCreativeAdapter` (TASK-1486) — Google-native, keyless.** En `vertex-adapter.ts`. Implementa el contrato completo (`providerId` / `supports` / `estimate` / `submit` / `poll`) y hace el **routing capability→modelo Vertex DENTRO del adapter**: `image-generate → gemini-2.5-flash-image`; `video-generate → gemini-omni-flash-preview` en la región **`global`** (us-east4 y us-central1 devuelven `NOT_FOUND` para estos modelos — usa `global`). Es **keyless**: autentica por **ADC/WIF** con un `getAccessToken` inyectado (la runtime SA tiene `aiplatform.user`), **cero API key**. Reparto de los métodos: `estimate` **no toca red**; `submit` es la **única llamada facturable**; `poll` devuelve **hashes** de output, **nunca una URL pública**. Verificado en vivo.

**`FalCreativeAdapter` (TASK-1487) — motores no-Google, key propia de Globe.** En `fal-adapter.ts`. Habla con la **queue API** de Fal (`submit` / `status` / `result` / `download`). **Gotcha crítico:** usa el `status_url` / `response_url` que Fal devuelve en la respuesta del `submit`; **nunca reconstruyas esas URLs desde el slug** (la ruta de queue no es derivable del slug). La key es **propia de Globe** — `GLOBE_FAL_API_KEY`, inyectada — **nunca** `greenhouse-fal-api-key` (el secreto de Greenhouse no cruza el boundary; es la regla de no compartir secretos de provider entre plataformas).

**`CompositeProviderAdapter` (TASK-1487) — combina Vertex + Fal por política.** En `composite-adapter.ts`. Compone los dos adapters: las capabilities **Fal-only** se resuelven por `supports()`; el **overlap** image/video (que ambos pueden servir) se resuelve por **política explícita**, con **default Vertex**. El `poll` **vuelve al hijo que emitió el run** — no re-rutea; respeta qué adapter hizo el `submit`. Este es el patrón para "un adapter que agrega varios providers": routing por `supports()` + política declarada para el overlap + poll fiel al emisor.

**Las 10 capabilities (TASK-1488) y la regla dura del slug ByteDance.** TASK-1488 lleva `CREATIVE_CAPABILITIES` a 10 (suma `image-upscale`, `video-upscale`, `model-3d-generate`). **REGLA DURA verificada en vivo:** los modelos **ByteDance en Fal usan el slug SIN el prefijo `fal-ai/`** (p.ej. `bytedance/seedream/v5/pro/text-to-image`); el resto — Recraft, Topaz, ElevenLabs, Hyper3D, y `fal-ai/seed-audio` — **sí** lleva `fal-ai/`. Para **verificar si un slug existe** antes de cablearlo: `POST {}` (body vacío) a `https://fal.run/<slug>` → **404 = inexistente**, **422 = existe** (falló la validación del payload, no el ruteo). El provider activo del Lab se elige con **`GLOBE_LAB_PROVIDER`** = `fake | vertex | fal | composite` (default **`fake`**): el default sigue siendo hermético / gasto cero, y prender un motor real es una decisión explícita de env.

**Eval real → recommendation matrix (TASK-1459).** Con adapters reales enchufados, el **Evaluation Harness** deja de correr solo contra el fake: el mismo **golden brief** se corre por el harness contra **múltiples motores** y produce una **recommendation matrix** (costo / latencia / ajuste al objetivo). El **craft sigue yendo a juicio humano** — el harness **nunca auto-gana** un modelo (coherente con el verdict `objective_pass_pending_human`). **Detalle de contrato que mordió en vivo:** el `actualRoute` que reporta un adapter debe ser el **route del contrato de fidelidad** (`== proposedRoute` cuando no hubo fallback), **NO el slug del modelo** — el slug va en el campo `model`. Confundirlos fue un bug real corregido en el adapter Fal.

**Track B — resolución hash→bytes + frontera de video Vertex (verificado en vivo 2026-07-19).** El command público sigue llevando **solo hashes**; el `LabRunner` resuelve los `authorizedInputs` a bytes en el único punto de invocación (`FixtureInputResolver` para test-fixtures; `GcsInputResolver` keyless content-addressed con verificación de integridad para inputs reales; `RightsRoutedInputResolver`) y los adjunta al request (`resolvedInputs`, server-internal, nunca cruza la API). Con eso los golden briefs con input (ancla motion, ref de contacto audio) **corren** en vez de `inputs_unavailable`; Vertex los inlinea (`inlineData`), Fal los sube a Fal storage → URL. El primer canary en vivo dio: **Fal Seedance 2.0** = motor motion, **Fal Seed Audio** = motor audio (ambos `objective_pass_pending_human`). **REGLA DURA:** el adapter Vertex de `generateContent` **NO puede servir video** — `gemini-omni-flash-preview` solo es invocable por la **Interactions API** y Veo usa `predictLongRunning`; da **400** por `generateContent`. Se removió `video-*` de `VERTEX_ROUTING` (`supports(video)=false`, misma frontera que audio); el video rutea a Fal. Un adapter Vertex video dedicado (Veo/Omni-Interactions) es follow-up; la capa completa de provenance/rights/retención es TASK-1467.

## Veo + Omni (video) — los motores de video Vertex reales (verificado en vivo 2026-07-20)

El follow-up que el Track B anunció ("un adapter Vertex video dedicado") está **implementado y verificado en vivo**: son **dos adapters nuevos** en `apps/creative-runner/src/*`, cada uno con su **propia frontera de invocación** — ninguno pasa por `generateContent` (ese adapter es image-only y da **400** con video). El ancla de video del Lab (`GLOBE_LAB_VIDEO_ANCHOR`) elige cuál corre.

**`VertexVideoAdapter` (Veo) — keyless, long-running.** En `vertex-video-adapter.ts`. Model `veo-3.0-fast-generate-001`, región `us-central1`. Como el video **no** es servible por `generateContent`, el adapter usa el par **`:predictLongRunning` → poll `:fetchPredictOperation`** hasta que la operación completa, y extrae el video del resultado (base64 inline o `gcsUri`). Es **keyless** igual que el adapter de imagen (ADC/WIF, runtime SA con `aiplatform.user`). **Frontera i2v vs t2v (regla dura):** en image-to-video el **primer frame se siembra** desde la referencia resuelta por Track B (el input hash→bytes); en **text-to-video NO se puede inlinear una imagen** — Veo da **400** si un request t2v trae imagen. Verificado en vivo: golden brief motion → `objective_pass_pending_human`, **32 créditos**.

**`VertexOmniAdapter` (Omni) — Interactions API, dos superficies.** En `vertex-omni-adapter.ts`. Model `gemini-omni-flash-preview` (el modelo reasoning-native state-of-the-art), invocado por la **Interactions API** — **NO** `generateContent`, **NO** `predictLongRunning`. Tiene **dos superficies con capacidades distintas**:

- **(1) Keyless Vertex — solo GENERATE.** `aiplatform.googleapis.com/v1beta1/projects/{p}/locations/{global|us-central1}/interactions`, **ADC Bearer, cero key**. Sirve `text_to_video` e `image_to_video`. **NO** sirve el edit stateful: `previous_interaction_id` → **400 "do not support"**; `GET /interactions/{id}` → **500**.
- **(2) Gemini Developer API — full, incl. STATEFUL EDIT.** `generativelanguage.googleapis.com/v1beta/interactions?key=`, con **API key** desde Secret Manager `globe-gemini-api-key` (esta superficie **exige** key: OAuth se rechaza con `ACCESS_TOKEN_SCOPE_INSUFFICIENT`). Es la **única** superficie que hace **edit stateful** (`previous_interaction_id` + `store:true`). Ojo: `generativelanguage` **no es Vertex** — por eso no contradice la regla "Vertex es keyless"; son dos superficies físicas distintas.

Request canónico: `{ model, input, response_format:{ type:video, aspect_ratio }, generation_config:{ video_config:{ task } }, background:false, store, stream:false }`; la respuesta llega en `steps[].model_output.content[].video.{data|uri}`. Es **unary síncrono** (~35-60s), no long-running. Specs del modelo: 3-10s / 720p / 24fps / 16:9|9:16 / con audio / **$0.10 por segundo**. Verificado en vivo: generate keyless por el seam → `objective_pass_pending_human` **40 créditos**; edit stateful (crear store → editar) → **200 completed** con video.

**Ancla de video del Composite.** `GLOBE_LAB_VIDEO_ANCHOR` = `fal` (default, Seedance) | `vertex-video` (Veo) | `vertex-omni` (Omni). Es **fidelity-aware**: un contrato `preserve-set` va siempre a **Seedance**; `anchor`/`flexible` van al motor ancla elegido. La matriz motion por el seam: **Omni 40cr, Veo 32cr, Seedance 20cr**, los tres `objective_pass_pending_human` (el harness nunca auto-gana un motor).

**Claridad de billing/superficie (regla dura de registrar).** El video de Omni **no tiene tier gratis** ($0.10/s, solo pago). La **Gemini Developer API** (`generativelanguage`) usa **Prepay/Postpay + API key** y es **hoy la única superficie de edit**. **"GEAP"** es solo el rebrand de **Vertex AI** (keyless pay-as-you-go, hoy solo generate). Y **"Gemini Enterprise"** (por-asiento, ~$25/seat) es el **producto sucesor de Agentspace, SIN relación** con la Interactions video API — **NUNCA** comprarlo para esto. Secrets: `globe-gemini-api-key` (edit) + `globe-fal-api-key` (Fal), inyectados por Secret Manager, `secretAccessor` de la runtime SA, trackeados en Terraform.

## Lab edit-command — stateful edit por el seam (verificado en vivo 2026-07-20, commit `a765d55`)

El seam del Model Lab ahora enhebra **edit stateful de punta a punta**: un `execute` puede encadenar sobre el output de un `execute` anterior. Es **aditivo y server-internal** — no cambia el contrato público.

**Los campos (aditivos, server-internal).** En `packages/contracts`: `PrepareExperimentPayloadV1.previousInteractionId` (opcional) + `ExperimentAttemptManifestV1.providerRunRef` (el run id del provider desde el que un edit posterior encadena). En `packages/provider-contract`: `ProviderAttemptResult.providerRunRef` + `CreativeProviderRequestV1.previousInteractionId`. El `toProviderRequest` del runner pasa `previousInteractionId` al request; el manifest expone `providerRunRef`. Un edit es simplemente un `prepare` con `previousInteractionId` seteado → `execute`.

**`VertexOmniAdapter` es DUAL-TRANSPORT.** Recibe dos transports inyectados: `transport` (Vertex keyless — generate) y `editTransport` (Gemini-key — edit). Un edit (con `previousInteractionId` presente) rutea a `editTransport`; si no hay `editTransport` inyectado, **falla cerrado con `edit_unavailable`** — nunca cae al keyless, que no sabe editar.

**Gotcha cross-surface (regla dura, encontrada y arreglada en vivo).** Un interaction id emitido por **Vertex keyless NO es editable en la superficie Gemini** (`generativelanguage`): son **namespaces de id distintos**. Por eso un generate que quiera ser **editable** (`store:true`) también corre en la **superficie Gemini** (no en Vertex keyless), o la cadena se rompe. El adapter lo resuelve con `useEditSurface = (isEdit || store) && editTransport`. `studio-web` cablea `store:true` + el `editTransport` Gemini desde `globe-gemini-api-key`.

**Evidencia en vivo (por el seam completo).** `prepare(video-generate, store)` → `execute` → `candidate_ready` con `providerRunRef=v1_…` → `prepare(previousInteractionId)` → `execute` → EDIT `candidate_ready`, con video nuevo + id encadenable. Real.

## Edit / refine cross-model — TASK-1490 (live-verified 2026-07-20)

El edit dejó de ser específico de Omni. Hay **una sola semántica** y el mecanismo se resuelve adentro.

**El contrato.** `PrepareExperimentPayloadV1.editFrom = { experimentId }` es lo ÚNICO que un caller dice: no nombra paradigma, sesión ni modelo. El caller **sí** declara `capability`/`referenceRoute`/`hardCapCredits` del edit — eso es exactamente lo que habilita el **edit cross-model** (refinar un candidato de Seedream con Nano Banana); heredarlos del padre lo impediría. `previousInteractionId` quedó **deprecado** y es **mutuamente excluyente** con `editFrom` (mandar ambos = `invalid_request`, jamás precedencia silenciosa). **No** hay command `edit` dedicado: un edit ES un experimento (misma autoridad, mismo fence, misma state machine, mismo manifest); un command aparte sería duplicar el guardrail sin agregar semántica de autoridad.

**Los dos paradigmas y quién elige.** *Stateful* = el proveedor guarda la sesión y se encadena por id (Omni `previous_interaction_id`). *Reference-based* = el output del padre se re-inyecta como base; es el que hace posible el cross-model porque no depende de ninguna sesión. El **dominio** resuelve el padre y deriva `editSource` server-side; el **runner** elige usando el único dato que sólo él tiene en ese momento: **qué proveedor va a ejecutar**. Un handle de sesión sólo significa algo para quien lo emitió, así que se hilvana **únicamente** cuando el proveedor ejecutante es el del padre; cualquier otro caso cae a reference-based y queda registrado en `editMode` — **nunca en silencio**.

**La pieza que faltaba (y que la task daba por hecha): retención de outputs.** Antes de TASK-1490 los adapters hasheaban los bytes de salida y los **descartaban**, así que el hash de un candidato no resolvía a nada: reference-based fallaba en runtime, no en compilación. `OutputIngestPort` + `GcsOutputIngest` (espejo de `InputResolverPort`, en el mismo y único punto de invocación) los persisten content-addressed bajo el mismo `sha256` que publica el manifest; `outputsRetained` lo declara. Un fallo de storage NUNCA destruye un candidato ya pagado: degrada a `outputsRetained: false`.

**Encadenabilidad la certifica el ADAPTER.** Un id puede existir y no ser editable en ningún lado (el keyless de Vertex emite ids que después rechaza). Sólo el adapter conoce sus superficies → reporta `providerRunChainable` junto a `providerRunSurface`; el dominio lee un booleano y nunca aprende vocabulario de proveedor.

**Multi-referencia.** Cada ruta declara su tope de referencias y **falla cerrado** al excederlo. Omni acepta sets **combinados imagen+vídeo** en un `reference_to_video` ("este sujeto, con esta cámara") — verificado en vivo en **ambas** superficies. El set siempre va **edit base primero** (el orden es condicionamiento).

**`GLOBE_LAB_OMNI_EDITABLE`** (default OFF) reemplazó el `store:true` hardcodeado. Un generate editable DEBE correr en la superficie Gemini, así que prenderlo saca **todo** generate de Omni del keyless hacia facturación por API key. Default OFF es seguro sólo **porque** los outputs se retienen.

**Reglas duras del edit:**
- **NUNCA** metas la base de un edit en `authorizedInputs` — ese campo es declaración del caller y su significado no puede cambiar entre generate y edit (rompe `input_lineage_intact`, el tope `MAX_AUTHORIZED_INPUTS` y la desambiguación de referencias del adapter). Viaja como `editReference`.
- **NUNCA** blanquees un derivado como `internal-owned`: es `derived-internal` (postura que un caller no puede declarar) + los derechos heredados del padre, para que un input `licensed` siga restringiendo a sus descendientes.
- **NUNCA** hilvanes un handle de sesión hacia un proveedor que no lo emitió, ni confíes en un `providerRunRef` sin `providerRunChainable`.
- **NUNCA** trunques un set de referencias para que entre: truncar devuelve trabajo que parece correcto y no lo es.
- **SIEMPRE** rechazá un edit imposible en `prepare` (padre desconocido/cross-workspace → `not_found` sin revelar existencia; sin candidato; **sin ninguna afordancia**; media no editable; profundidad excedida), antes de que el fence reserve.

**Lección de método (vale más que el código).** Dos defectos sobrevivieron una suite unitaria en verde y sólo aparecieron gastando plata real: `providerRunChainable` se calculaba en el adapter y el runner no lo copiaba (todo edit stateful degradaba en silencio), y todo fallo del runner colapsaba a `runner_error` (el fallo más común de un edit era indistinguible de cualquier otro). Cuando un campo de evidencia nace, **verificá que haga el viaje completo hasta el manifest** — un test de adapter que lo afirma no prueba que llegue.

**Primer deploy keyless de la app.** `studio-web` quedó desplegado en Cloud Run `globe-studio-internal` rev `00007-jrr` (Ready), **privado**; `GLOBE_LAB_PROVIDER` sigue en `fake` en el servicio desplegado (los engines están desplegados pero **OFF** — prenderlos es un flip de flag gobernado). Deploy vía `.github/workflows/deploy-internal.yml` (keyless WIF → Cloud Build → Cloud Run).

## Provider boundary

- **El primer provider call *billable* entra por el mismo seam que las surfaces posteriores:** API/SDK o conformance harness → command/reader canónico → provider adapter (`packages/provider-contract`) → runner (`apps/creative-runner`). **NUNCA** un provider SDK directo desde UI/MCP/CLI/scripts/tests.
- **Los model identifiers del provider NO entran a policy de dominio.** El dominio depende de `CreativeCapability` semánticas (`image-generate`, `video-generate`, `audio-generate`, `speech-synthesize`, …), no de nombres de modelo vendor. Ruteá por contrato de fidelidad a través de `CreativeProviderAdapter` (`providerId`, `supports`, `estimate`, `submit`, `poll`).
- **Ruteo de providers:** modelos Google-native solo directo por **Google Cloud / Vertex** (proyecto `efeonce-globe`); **Fal** solo para modelos **no-Google allowlisted**; **OpenAI** directo. Las impls reales de este ruteo son `VertexCreativeAdapter` (keyless) / `FalCreativeAdapter` (key propia) / `CompositeProviderAdapter` (overlap por política) — ver *Provider adapters reales* arriba.
- **NUNCA** expongas una tool genérica `endpoint + arbitrary JSON` (`run_endpoint(endpoint, ...)`). Las capabilities son **semánticas** y gobernadas.
- Cada run registra model/version, inputs, operación semántica, costo de provider, tiempo, hashes de output y rights/classification. `policy-blocked` en una surface significa apagada, **no** que se puedan llamar providers desde scripts ad-hoc.

## Foundation IaC keyless (TASK-1464) — aplicada en vivo

La infraestructura de Globe es **reproducible y sin llaves**, y ya está **APLICADA en vivo (2026-07-19)**. Vive en `infra/terraform/` (HCL, validado con **OpenTofu**; en CI corre `terraform-check.yml` → `fmt -check -recursive` + `init -backend=false` + `validate`, sin credenciales GCP, en cada PR que toca `infra/terraform/**`).

**Qué codifica.** Toma los recursos **VIVOS** de TASK-1454 con **import blocks** (`imports.tf`) — nada se recrea: los servicios habilitados, las 4 service accounts (`caller`/`api_runtime`/`web_runtime`/`deployer`), el pool+provider de **Vercel WIF**, el Artifact Registry `globe-runtime`, los bindings WIF del caller y los roles del deployer. Y **crea** lo nuevo: **GitHub WIF** (pool/provider `github-actions` restringido por repositorio en DOS capas — `attribute_condition` del provider **y** `principalSet` del binding, defensa en profundidad), deployer `run.admin` + `act-as` (runtime SAs + Cloud Build compute SA), el bucket privado `efeonce-globe-lab-evidence` (versionado, `public_access_prevention` enforced; el `api_runtime` escribe/lee vía signed URLs), el **state remoto** `gs://efeonce-globe-tfstate` (`prevent_destroy`, versionado), el **budget opt-in** (`enable_budget` default OFF) y una **alerta si se crea una SA key** (log metric + alert: invariante keyless).

**Protocolo de import (regla dura).** Los SAs y el WIF están **vivos** y sostienen el bridge de identidad, el piloto interno y el SSO. Por eso: **import → `plan` → leer el plan → aplicar SOLO si NO hay `destroy`/`replace`** de una identidad viva. Nunca apliques un plan que destruya o recree un SA/pool/provider vivo. El apply del 2026-07-19 (`tofu apply`) dio **`23 imported, 13 added, 0 changed, 0 destroyed`** — cero identidad viva tocada. El bootstrap del state bucket es un paso humano fuera de Terraform (no puede crearse a sí mismo).

**Deploy keyless.** Cero SA keys: OIDC → WIF → `globe-deployer`. El workflow `deploy-internal.yml` (`workflow_dispatch` manual, `id-token: write`) autentica con `google-github-actions/auth@v2` usando el secret **`GCP_WORKLOAD_IDENTITY_PROVIDER`** (el output `github_wif_provider`) + la deployer SA, construye con **Cloud Build async + poll** (`builds submit --async` + `builds describe` en loop — **nunca sync**, que se cuelga en el log bucket), despliega Cloud Run **privado** (`--no-allow-unauthenticated`, corriendo como la runtime SA) y verifica readiness con `gcloud run services describe` (`status.conditions[0].status == True`) — **nunca un proxy**.

**IaC ↔ runtime.** Los **outputs versionados** de IaC (`outputs.tf`: SA emails, `lab_evidence_bucket`, `github_wif_provider`, …) son **inputs del runtime**: el canary live del Model Lab (TASK-1457) los **consume**, no duplica infra. La frontera es clara: **la IaC provisiona; el spine opera** — no existe un "command/MCP de infraestructura". Cambiar infra es Terraform/`gcloud`, no una capability.

**Git hygiene.** **NUNCA** committees `*.tfstate`, `.terraform/`, `tfplan` ni `terraform.tfvars` real (el `.gitignore` los bloquea); el **`.terraform.lock.hcl` SÍ se committea** (pinea versiones de providers). El state vive solo en `gs://efeonce-globe-tfstate`; en git solo está el HCL.

**Qué NO hace.** No aprovisiona las Cloud Run services de la app (las despliega el workflow keyless), ni Cloud SQL/tenancy (TASK-1465), ni secretos de provider (rollout del canary live), ni producción/clientes externos. Runbook: `docs/operations/EFEONCE_GLOBE_IAC_RUNBOOK_V1.md`.

## Errores canónicos y correlación

- El enum `GlobeApiErrorCode` distingue causas: **`policy_blocked` es distinto de `access_denied` y de `not_found`.** El mapeo lo hace `dispatchErrorToApiCode`: `surface_policy_blocked → policy_blocked`; `capability_denied → access_denied`; `capability_not_found` / `surface_not_applicable → not_found`. Un `TrustedContextError` (workspace no bindeado) siempre es `access_denied`, nunca una pista de qué workspaces existen.
- **NUNCA** filtres detalle interno (secretos, ID tokens, cookies, auth codes, body crudo del upstream, stack) al cliente ni a logs. El SDK jamás devuelve el body crudo del upstream.
- **Un `correlationId` atraviesa todo:** request → trusted context → result → audit. La cadena causal mínima es `greenhouse auth audit id → Globe session id → correlation id → command id → run id → artifact manifest`.

## Reglas duras (NUNCA / SIEMPRE)

- **NUNCA** compartas DB, sesión/cookie, bucket, secreto de provider, SA key ni rol admin entre Globe y Greenhouse.
- **NUNCA** crees en Globe un segundo registry/namespace/lifecycle de tasks; el control plane de `TASK-###`/EPIC es solo Greenhouse.
- **NUNCA** dejes una surface de una capability sin estado de coverage; **NUNCA** representes "sin contrato" como algo distinto de `policy-blocked` (`missing` no existe).
- **NUNCA** aceptes actor/capability/workspace de autoridad desde el body, query o headers del caller; solo `workspaceSelection` no confiable, validado contra `workspaceBindings`.
- **NUNCA** construyas o mutes un `TrustedCommandContextV1` fuera de `deriveTrustedContext`; es branded y server-only.
- **NUNCA** llames a un SDK de provider directo desde UI/MCP/CLI/scripts/tests; **NUNCA** expongas `endpoint + arbitrary JSON`; **NUNCA** metas model identifiers vendor en policy de dominio.
- **NUNCA** llames Google-native fuera de Vertex/GCP, ni un modelo Google por Fal; Fal solo non-Google allowlisted; OpenAI directo.
- **NUNCA** confundas `policy_blocked` con `access_denied` / `not_found`; **NUNCA** filtres secretos/tokens/body upstream a cliente o logs.
- **NUNCA** introduzcas Vitest/Jest (Globe usa `node --test`), ni rompas la convención de extensiones (`.js` source↔source de packages; `.ts` en studio-web y en todos los tests).
- **NUNCA** invoques un provider fuera del runner que corre detrás del command (el Model Lab lo hace por el `LabRunner` en `apps/creative-runner`); un SDK de provider directo desde handler/UI/MCP/CLI/scripts/tests está prohibido.
- **NUNCA** reconstruyas las URLs de la queue de Fal desde el slug (usa el `status_url`/`response_url` que devuelve el `submit`); **NUNCA** pongas el prefijo `fal-ai/` en un slug ByteDance (van sin prefijo; verifica un slug con `POST {}` a `https://fal.run/<slug>`: 404=inexistente / 422=existe); **NUNCA** uses la key de Greenhouse (`greenhouse-fal-api-key`) para Fal desde Globe (es `GLOBE_FAL_API_KEY`, propia de Globe); **NUNCA** llames Vertex con API key (es keyless: ADC/WIF, runtime SA con `aiplatform.user`); **NUNCA** reportes el slug del modelo como `actualRoute` (el `actualRoute` es el route del contrato de fidelidad — `== proposedRoute` sin fallback; el slug va en `model`).
- **NUNCA** invoques Omni (`gemini-omni-flash-preview`) por `generateContent` ni por `predictLongRunning`: es **Interactions API** (unary síncrono ~35-60s). Veo (`veo-3.0-fast-generate-001`) **sí** usa `:predictLongRunning`→`:fetchPredictOperation`; el adapter Vertex `generateContent` es **image-only** (video da 400). No cruces las tres fronteras de invocación.
- **NUNCA** metas una imagen en un request **text-to-video** de Veo (da **400**): en i2v el primer frame se **siembra** desde la referencia resuelta por Track B; el t2v va **sin imagen**.
- **NUNCA** intentes **edit stateful** por la superficie **keyless de Vertex** (`aiplatform.googleapis.com/.../interactions`): `previous_interaction_id` → 400 "do not support" y `GET /interactions/{id}` → 500. El edit stateful (`previous_interaction_id` + `store:true`) es **SOLO** por `generativelanguage.googleapis.com/.../interactions?key=` con la API key `globe-gemini-api-key` (ahí OAuth se rechaza con `ACCESS_TOKEN_SCOPE_INSUFFICIENT`). `generativelanguage` **no es Vertex**.
- **NUNCA** compres **"Gemini Enterprise"** (per-seat ~$25/seat, sucesor de Agentspace) para la Interactions video API — no tienen relación; el video de Omni **no tiene tier gratis** ($0.10/s), y la Gemini Developer API (`generativelanguage`) se paga con **Prepay/Postpay + API key** (`globe-gemini-api-key`, no `greenhouse-*`).
- **NUNCA** encadenes un edit sobre un interaction id **cross-surface**: un id emitido por **Vertex keyless** NO es editable en la superficie Gemini (`generativelanguage`) — son namespaces de id distintos. El edit stateful rutea **solo** por `editTransport` (Gemini-key) del `VertexOmniAdapter` dual-transport, y **falla cerrado con `edit_unavailable`** si no hay `editTransport` inyectado (nunca cae al keyless).
- **SIEMPRE** que un generate deba ser **editable**, córrelo con `store:true` **en la superficie Gemini** (no en Vertex keyless): el adapter resuelve `useEditSurface = (isEdit || store) && editTransport`. Un generate editable en keyless deja un id que ningún edit posterior puede encadenar.
- **NUNCA** dejes un command de capability cara sin kill switch fail-closed (apagado ⇒ `policy_blocked`), sin hard spend fence que aborte *antes* de gastar (el fence es de seguridad, NO el credit ledger de TASK-1468), ni aceptes inputs como bytes crudos (private-ingest: content hash + rights declarados).
- **NUNCA** apliques Terraform/OpenTofu con un `plan` que muestre `destroy`/`replace` de una identidad viva (SA/WIF/registry): el protocolo es import → plan cero-destroy/replace → apply.
- **NUNCA** committees state ni planes (`*.tfstate`/`.terraform/`/`tfplan`/`terraform.tfvars` real; el state vive en `gs://efeonce-globe-tfstate`); el `.terraform.lock.hcl` SÍ se committea.
- **NUNCA** modeles infraestructura como un command/MCP del spine ni dupliques en runtime lo que la IaC provisiona: el runtime consume los outputs versionados de IaC. Cambiar infra es Terraform/`gcloud`, no una capability.
- **NUNCA** deployees con SA keys ni verifiques readiness por proxy: el deploy es keyless (OIDC→WIF→deployer) y la readiness se lee con `run services describe`.
- **SIEMPRE** una capability nace con schema versionado + command/reader transport-neutral + trusted context + path HTTP/SDK + coverage + conformance (Full API Parity by birth).
- **SIEMPRE** el primer provider call entra por API/SDK/harness → command → adapter → runner.
- **SIEMPRE** commands mutantes llevan actor (derivado), workspace, `idempotencyKey`, `correlationId` y audit; todo run caro se estima y aprueba antes de reservar créditos; los outputs son *candidates* hasta review humano.
- **SIEMPRE** corré `pnpm check && pnpm build` en `efeonce-globe` antes de cerrar, y `pnpm install` al agregar una dep de workspace.
- **SIEMPRE** que una capability nueva toque estado externo o un provider, sigue el patrón del Model Lab: ports en el dominio + impls inyectadas desde transporte/runner + dobles en tests + state machine + error de dominio mapeado a su API code (p.ej. `InvalidExperimentRequestError → invalid_request`).
- **SIEMPRE** que enchufes un motor real, hazlo reemplazando el `CreativeProviderAdapter` detrás del runner — sin tocar el dominio ni el command — siguiendo los adapters reales: Vertex keyless (ADC/WIF), Fal con key propia de Globe (`GLOBE_FAL_API_KEY`, `status_url`/`response_url` de la queue), Composite por `supports()` + política para el overlap; el default de `GLOBE_LAB_PROVIDER` sigue siendo `fake` (hermético) hasta prender un motor por env, y el `actualRoute` reportado es el route del contrato de fidelidad, nunca el slug.
- **SIEMPRE** usá la superficie **keyless** (ADC/WIF, runtime SA) para **GENERATE** de video — Veo (`:predictLongRunning`) y Omni generate (Interactions keyless en `aiplatform`); reservá la API key `globe-gemini-api-key` **solo** para el **edit stateful** de Omni (`generativelanguage`). El ancla `GLOBE_LAB_VIDEO_ANCHOR` (`fal`|`vertex-video`|`vertex-omni`, default `fal`) es **fidelity-aware**: `preserve-set` → Seedance; `anchor`/`flexible` → el motor ancla elegido; el harness nunca auto-gana un motor (todo verdict `objective_pass_pending_human`).

## Sinergias y gobierno

- **`arch-architect`** (overlay greenhouse-pinned): para forma, decisiones de dominio/schema/frontera y red-team antes de implementar.
- **`greenhouse-task-planner`**: para autorar/actualizar la `TASK-###` que gobierna el trabajo (recordá: el registry es de Greenhouse).
- **`greenhouse-documentation-governor`**: para el cierre documental proporcional (arquitectura de Globe + handoff + lifecycle de la task en Greenhouse).
- Globe está gobernado por **EPIC-028** (parallel-first: Model Lab, plataforma gobernada y validación comercial avanzan en carriles con gates distintos). Ejecutar un experimento de modelo y promover una ruta a UI/MCP son **gates separados**: parity contractual nace temprano; habilitar una surface es aparte.
