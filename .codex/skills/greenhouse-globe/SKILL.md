---
name: greenhouse-globe
description: Ingeniero senior de la plataforma hermana Efeonce Globe (Creative Studio) y guardián de su contrato de arquitectura. Úsala para cualquier trabajo sobre el repo `efeonce-globe`: extender el API Contract Spine (TASK-1481), agregar una capability con Full API Parity, escribir un command/reader/handler transport-neutral, montar un provider adapter, tocar trusted context / dispatch / SDK, o razonar el boundary Globe↔Greenhouse. Triggers — "Efeonce Globe", "creative studio", "contract spine", "capability", "command/reader", "trusted context", "provider adapter", "coverage matrix", "policy-blocked", "creative-runner", "EPIC-028", "TASK-1457…1481".
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

## Provider boundary

- **El primer provider call *billable* entra por el mismo seam que las surfaces posteriores:** API/SDK o conformance harness → command/reader canónico → provider adapter (`packages/provider-contract`) → runner (`apps/creative-runner`). **NUNCA** un provider SDK directo desde UI/MCP/CLI/scripts/tests.
- **Los model identifiers del provider NO entran a policy de dominio.** El dominio depende de `CreativeCapability` semánticas (`image-generate`, `video-generate`, `audio-generate`, `speech-synthesize`, …), no de nombres de modelo vendor. Ruteá por contrato de fidelidad a través de `CreativeProviderAdapter` (`providerId`, `supports`, `estimate`, `submit`, `poll`).
- **Ruteo de providers:** modelos Google-native solo directo por **Google Cloud / Vertex** (proyecto `efeonce-globe`); **Fal** solo para modelos **no-Google allowlisted**; **OpenAI** directo.
- **NUNCA** expongas una tool genérica `endpoint + arbitrary JSON` (`run_endpoint(endpoint, ...)`). Las capabilities son **semánticas** y gobernadas.
- Cada run registra model/version, inputs, operación semántica, costo de provider, tiempo, hashes de output y rights/classification. `policy-blocked` en una surface significa apagada, **no** que se puedan llamar providers desde scripts ad-hoc.

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
- **SIEMPRE** una capability nace con schema versionado + command/reader transport-neutral + trusted context + path HTTP/SDK + coverage + conformance (Full API Parity by birth).
- **SIEMPRE** el primer provider call entra por API/SDK/harness → command → adapter → runner.
- **SIEMPRE** commands mutantes llevan actor (derivado), workspace, `idempotencyKey`, `correlationId` y audit; todo run caro se estima y aprueba antes de reservar créditos; los outputs son *candidates* hasta review humano.
- **SIEMPRE** corré `pnpm check && pnpm build` en `efeonce-globe` antes de cerrar, y `pnpm install` al agregar una dep de workspace.

## Sinergias y gobierno

- **`arch-architect`** (overlay greenhouse-pinned): para forma, decisiones de dominio/schema/frontera y red-team antes de implementar.
- **`greenhouse-task-planner`**: para autorar/actualizar la `TASK-###` que gobierna el trabajo (recordá: el registry es de Greenhouse).
- **`greenhouse-documentation-governor`**: para el cierre documental proporcional (arquitectura de Globe + handoff + lifecycle de la task en Greenhouse).
- Globe está gobernado por **EPIC-028** (parallel-first: Model Lab, plataforma gobernada y validación comercial avanzan en carriles con gates distintos). Ejecutar un experimento de modelo y promover una ruta a UI/MCP son **gates separados**: parity contractual nace temprano; habilitar una surface es aparte.
