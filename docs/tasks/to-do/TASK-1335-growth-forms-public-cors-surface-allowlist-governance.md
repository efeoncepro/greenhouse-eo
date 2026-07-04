# TASK-1335 — Growth Forms Public CORS + Surface Allowlist Governance

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `api`
- Epic: `EPIC-020`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|public-site|forms|api`
- Blocked by: `none`
- Branch: `task/TASK-1335-growth-forms-public-cors-surface-allowlist-governance`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Eliminar el allowlist hardcodeado de CORS del motor publico Growth Forms y alinear el transporte browser con el registry gobernado de host surfaces. La correccion debe habilitar de forma acotada `https://think.efeoncepro.com` para el form del AI Visibility Grader sin abrir CORS como wildcard ni duplicar autoridad fuera de `form_host_surface`.

## Why This Task Exists

TASK-1327 necesita embeber el form gobernado `fdef-ai-visibility-grader` en `think.efeoncepro.com/brand-visibility` via `<greenhouse-form>`. El render contract del form ya responde `200`, pero el browser no puede consumirlo desde Think porque `src/app/api/public/growth/forms/cors.ts` mantiene un set hardcodeado con solo `https://efeoncepro.com` y `https://www.efeoncepro.com`. Ademas, la surface `fhsf-ai-visibility-grader` nacio con `origin_allowlist_json=[]`, por lo que el submit con `surfaceId` tambien fallaria por origin no permitido. El resultado es drift entre transporte CORS y la autoridad real del motor.

## Goal

- Reemplazar el CORS hardcodeado de Growth Forms por una configuracion gobernada y auditable.
- Autorizar `https://think.efeoncepro.com` para la surface del grader sin abrir otros origins.
- Mantener doble defensa: CORS de transporte permite solo origins aprobados y el command/read contract sigue validando `surfaceId + origin + slug`.
- Dejar tests y smokes que prueben `GET`, `OPTIONS`, `POST /submit` y `POST /verify-email` para origins permitidos/no permitidos.
- Desbloquear TASK-1327 sin tocar la landing, scoring, probes, normalizer ni `executeClaimedGraderRun`.

## Delta 2026-07-04 — Arch review (arch-architect) + garantía de no romper `/aeo-2`

> Revisión con `arch-architect` (overlay Greenhouse) sobre el código y la DATA REAL (`form_host_surface`
> consultada en `greenhouse-pg-dev`). La task es correcta; estos ajustes fijan el diseño del resolver,
> **descartan una opción peligrosa** y blindan `/aeo-2`.

### Ground truth (DB real, 2026-07-04)

| Surface | status | `origin_allowlist_json` | `allowed_form_slugs_json` |
|---|---|---|---|
| `fhsf-efeonce-aeo-diagnostic` (**es la de `/aeo-2`**) | active | `[efeoncepro.com, www.efeoncepro.com]` | `[efeonce-aeo-diagnostic]` |
| `fhsf-ai-visibility-grader` (self-serve, aún sin embeber) | active | **`[]`** | `[ai-visibility-grader]` |
| `fhsf-efeonce-lead-gen-web` | active | `[efeoncepro.com, www, staging.vercel, shadow.local]` | `[efeonce-lead-gen-web]` |

**Mecánica real verificada:**

- CORS de transporte (`cors.ts`) es **puramente por `origin`, independiente de surface/form** — `/aeo-2`
  funciona porque `efeoncepro.com` está en el set hardcodeado.
- Surface-auth (`commands.ts:343`) es **CONDICIONAL a que el submit mande `surfaceId`**; si no lo manda,
  se saltan los chequeos de origin/slug de surface. `/aeo-2` usa la surface `fhsf-efeonce-aeo-diagnostic`
  que YA tiene `efeoncepro.com` → segura en ambos caminos (con o sin `surfaceId`).
- **`/aeo-2` y el grader son surfaces/forms DISTINTAS.** Sumar `think` al grader NO toca `/aeo-2`.

### Diseño del resolver (Slice 1) — decisión de arquitectura

**Elegido (veredicto arch-architect): transporte CORS = UNIÓN de `origin_allowlist_json` de las surfaces
`active` (SoT = `form_host_surface`), cacheada in-memory con stale-on-error. SIN literal hardcodeado y
SIN env var. Una sola fuente de verdad.**

- **SoT ÚNICO = `form_host_surface`** → mata el drift (objetivo central de la task). Sumar `think` al
  grader surface lo mete automáticamente en la unión → el transporte lo permite sin literal en el route
  handler. `efeoncepro.com` sigue en la unión (viene de aeo + lead-gen) → `/aeo-2` sigue con ACAO. **Agregar
  o quitar un origin = cambio de DATA (una fila en la DB), NUNCA de código.**
- **Cache in-memory (TTL ~60-120s) + stale-on-error:** OPTIONS/GET/submit leen del cache, NUNCA bloquean
  en la DB; el preflight (sin `surfaceId`) funciona porque la unión es surface-agnóstica. Refresh lazy/async.
  Con la DB caída pero cache tibio → se sirve el last-known-good (cubre los blips reales).
- **SIN baseline hardcodeado NI env var — decisión de arquitectura, no omisión.** Se evaluó un piso de
  cold-start (literal, luego env var) y la skill lo DESCARTA: (1) el único hueco que el cache no cubre es
  "instancia serverless en frío + DB no disponible en ese instante", pero **en ese escenario el form ya
  está roto** (el submit necesita la DB para form-def/surface/persistir) → el piso cuidaría una puerta de
  un cuarto ya cerrado (NO es defensa en profundidad real, es decorado); (2) una env var = **segunda
  fuente** → reintroduce el drift que la task existe para matar (y una env var mal seteada por-environment
  es otra allowlist mal configurada); (3) es puerta de ida y vuelta → **empezar simple**, sumar el piso
  SOLO si un incidente real demuestra un caso "CORS falla pero el form sí funciona" (hoy inexistente).
  Principios: SoT único / anti-drift · defensa en profundidad solo sobre caminos que sobreviven aparte ·
  reversibilidad → menos mecanismos.

**Invariante de fallo (el corazón del cuidado con `/aeo-2`):** el resolver es **fail-CLOSED para el origin
desconocido** (unknown → sin ACAO) pero **fail-SAFE para el data source** (DB caída → piso con los origins
críticos, NUNCA unión vacía). Son dos cosas distintas; confundirlas rompería `/aeo-2`.

### Opción DESCARTADA (peligrosa) — no implementar

**"CORS surface-aware por request keyed en `surfaceId`"** (opción (b) del Slice 1 original): **RECHAZADA.**
El preflight `OPTIONS /submit` NO lleva `surfaceId` (es method+headers sobre el path) → el resolver no
podría emitir ACAO en el preflight → **rompería el submit de TODOS los origins, incluido `efeoncepro.com`
= regresión directa de `/aeo-2`.** El transporte DEBE ser surface-agnóstico (unión), y la autoridad fina
por-surface queda server-side en el command (doble defensa intacta).

### `shadow.local` / staging en la unión

La unión incluiría `shadow.local` + la URL de staging (de `fhsf-efeonce-lead-gen-web`). En prod eso emite
ACAO para esos origins — **inocuo** (`shadow.local` no es un dominio real que un browser pueda tener como
origin; la URL de staging es un host Efeonce legítimo). Aceptable porque ya son origins **gobernados** en
la DB. Opcional (no bloqueante): filtrar `*.local` del resolver de transporte en `NODE_ENV=production`.

### Slice 2 — sin riesgo para `/aeo-2`

Sumar `https://think.efeoncepro.com` SOLO a `fhsf-ai-visibility-grader.origin_allowlist_json` (hoy `[]`).
**NO tocar `fhsf-efeonce-aeo-diagnostic` ni `fhsf-efeonce-lead-gen-web`.** Migración/seed additive
idempotente (append, no replace). Con esto el grader queda con `[think]` → entra a la unión de transporte
Y habilita la surface-auth del submit del grader (por si Think manda `surfaceId`).

### Evidencia obligatoria de no-regresión `/aeo-2`

Además del curl matrix: **smoke real de submit de `/aeo-2`** post-cambio (o test que ejercite el path con
`origin=efeoncepro.com` sin `surfaceId` y con `surfaceId=fhsf-efeonce-aeo-diagnostic`) → ambos deben seguir
recibiendo ACAO y NO devolver `surface_unauthorized`. Un curl `-i` que confirme ACAO no basta: verificar
que un submit legítimo sigue `accepted`/`captcha_failed` (fail por captcha, NO por CORS/surface).

### 4-pilar

- **Safety:** nunca wildcard; unknown → sin ACAO; la autoridad fina por-surface sigue server-side (doble defensa).
- **Robustness:** piso fail-safe garantiza `/aeo-2` ante DB caída; cache stale-on-error; preflight surface-agnóstico.
- **Resilience:** DB down → degradación honesta (piso con críticos; `think` temporalmente ausente, no `/aeo-2`).
- **Scalability:** cache in-memory → sin lectura DB por-request en el hot path público; nuevas surfaces entran solas.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/growth-public-forms-runtime-contract.md`
- `docs/architecture/GREENHOUSE_PUBLIC_REPORT_HEADLESS_RENDER_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`

Reglas obligatorias:

- No usar `Access-Control-Allow-Origin: *` para APIs publicas de submit/render contract.
- No dejar el set de origins como literal local no gobernado dentro del route handler.
- CORS no reemplaza la validacion de surface: el motor debe seguir validando `surfaceId`, `origin`, `allowed_form_slugs_json`, form publicado, consent, Turnstile, server validation, rate-limit y destination plan server-only.
- El browser nunca recibe destination mapping, HubSpot GUIDs, property names, secretos ni datos server-only.
- `think.efeoncepro.com` queda autorizado solo para la surface/form del AI Visibility Grader que lo necesita.

## Normative Docs

- `docs/tasks/to-do/TASK-1327-public-lead-magnet-landing-form-embed.md`
- `docs/tasks/complete/TASK-1297-growth-forms-stable-identity-render-copy.md`
- `docs/tasks/complete/TASK-1298-aeo-greenhouse-form-wordpress-migration.md`
- `docs/manual-de-uso/growth/incrustar-formulario-wordpress-astro.md`
- `docs/manual-de-uso/growth/operar-motor-formularios.md`

## Dependencies & Impact

### Depends on

- `TASK-1229` Growth Forms public API foundation.
- `TASK-1297` stable `form-key` identity and render contract.
- `TASK-1251` grader intake convergence over Growth Forms.
- Runtime surface `fhsf-ai-visibility-grader` and form `fdef-ai-visibility-grader`.

### Blocks / Impacts

- Blocks `TASK-1327` until `https://think.efeoncepro.com` can load and submit `<greenhouse-form>`.
- Impacts all public Growth Forms route handlers that emit CORS headers.
- Impacts the documented public host allowlist for Growth Forms.
- Must not regress `/aeo-2/` on `https://efeoncepro.com`.

### Files owned

- `src/app/api/public/growth/forms/cors.ts`
- `src/app/api/public/growth/forms/[formSlug]/route.ts`
- `src/app/api/public/growth/forms/[formSlug]/submit/route.ts`
- `src/app/api/public/growth/forms/[formSlug]/verify-email/route.ts`
- `src/lib/growth/forms/readers.ts`
- `src/lib/growth/forms/commands.ts`
- `migrations/*task-1335*` or governed data script for `form_host_surface`
- `docs/architecture/growth-public-forms-runtime-contract.md`
- `docs/manual-de-uso/growth/incrustar-formulario-wordpress-astro.md`
- `docs/tasks/to-do/TASK-1327-public-lead-magnet-landing-form-embed.md`

## Current Repo State

### Already exists

- Public renderer bundle: `https://greenhouse.efeoncepro.com/growth-forms/renderer-latest.js`.
- Public forms API family under `src/app/api/public/growth/forms/**`.
- Stable form key support for `<greenhouse-form form-key="...">`.
- Surface registry in `greenhouse_growth.form_host_surface`.
- Grader form: `fdef-ai-visibility-grader`, `formKey=69cd5269-5f97-4d32-99c4-0b23f41aa2f5`, surface `fhsf-ai-visibility-grader`.

### Gap

- `src/app/api/public/growth/forms/cors.ts` hardcodes `https://efeoncepro.com` and `https://www.efeoncepro.com`.
- `Origin: https://think.efeoncepro.com` gets a `200` render contract but no `Access-Control-Allow-Origin`, so browser fetch fails.
- `OPTIONS /submit` for `Origin: https://think.efeoncepro.com` returns `204` without ACAO.
- `fhsf-ai-visibility-grader` has no origin allowlist for Think, so submit authorization would fail even after transport CORS is fixed.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `api`
- Source of truth afectado: `greenhouse_growth.form_host_surface` + public Growth Forms route CORS helper
- Consumidores afectados: `greenhouse-form` renderer, WordPress public site, Think Astro hub, future public-site hosts
- Runtime target: `staging|production`

### Contract surface

- Contrato existente a respetar: `GET /api/public/growth/forms/[formRef]`, `POST /api/public/growth/forms/[formRef]/submit`, `POST /api/public/growth/forms/[formRef]/verify-email`, `OPTIONS` preflight
- Contrato nuevo o modificado: governed CORS origin resolution for public Growth Forms
- Backward compatibility: `compatible`
- Full API parity: public surfaces consume the same Growth Forms API and renderer; no landing-specific bridge or submit endpoint is introduced.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.form_host_surface`
- Invariantes que no se pueden romper:
  - CORS transport can be permissive only for governed public origins; never wildcard for submit APIs.
  - Surface authorization remains enforced server-side by origin + slug + surface.
  - A disallowed origin may receive a server response, but the browser must not receive ACAO and submit must still return `surface_unauthorized` if called server-side with that origin.
  - Existing AEO `/aeo-2/` origin `https://efeoncepro.com` remains authorized.
- Tenant/space boundary: public anonymous surface; no tenant is derived from browser input.
- Idempotency/concurrency: no mutating business state except optional additive surface allowlist migration/seed; submit idempotency remains owned by `submitForm`.
- Audit/outbox/history: no new business event; document the host allowlist change and rely on migration history or governed script output.

### Migration, backfill and rollout

- Migration posture: `additive|seed`
- Default state: fail-closed for unknown origins.
- Backfill plan: update only `fhsf-ai-visibility-grader` to include `https://think.efeoncepro.com`; do not broaden other surfaces unless explicitly required.
- Rollback path: remove the origin from the governed allowlist and redeploy/revert the CORS resolver.
- External coordination: Vercel redeploy for code changes; production verification with `curl` and browser smoke from Think.

### Security and access

- Auth/access gate: public anonymous API with form/surface/origin authorization, Turnstile and rate-limits.
- Sensitive data posture: PII can be submitted through the form; CORS must not expose submit APIs to arbitrary origins.
- Error contract: keep canonical JSON outcomes; no raw errors; route errors go through `captureWithDomain`.
- Abuse/rate-limit posture: existing Growth Forms rate-limit/Turnstile path remains unchanged.

### Runtime evidence

- Local checks: focal tests for CORS resolver + route behavior.
- DB/runtime checks: read-only query or migration verification showing `fhsf-ai-visibility-grader` allows `https://think.efeoncepro.com`.
- Integration checks:
  - `curl -i -H 'Origin: https://think.efeoncepro.com' GET /api/public/growth/forms/69cd5269-...?...` includes ACAO.
  - `curl -i -X OPTIONS -H 'Origin: https://think.efeoncepro.com' .../submit` includes ACAO and allowed methods.
  - disallowed origin does not receive ACAO.
  - AEO origin still receives ACAO.
- Reliability signals/logs: no new signal required; unexpected route failures captured under `growth_forms_public_*`.
- Production verification sequence: after deploy, run the curl matrix above, then TASK-1327 can verify the actual `<greenhouse-form>` in browser.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] N/A — no new business capability. This task hardens the transport/access contract for an existing capability.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Governed CORS resolver

- Replace the hardcoded origin set in `src/app/api/public/growth/forms/cors.ts` with the governed resolver
  **decidido en el Delta 2026-07-04**: transporte CORS = UNIÓN de `origin_allowlist_json` de surfaces
  `active` (SoT `form_host_surface`), cacheada in-memory (TTL ~60-120s, stale-on-error). **SIN literal
  hardcodeado y SIN env var** (una sola fuente = la DB). Agregar/quitar un origin = cambio de DATA, nunca
  de código. (El piso de cold-start se evaluó y se descartó — ver Delta: sería decorado + segunda fuente.)
- **NO implementar** la opción "surface-aware CORS por request keyed en `surfaceId`" (rompe el preflight
  `OPTIONS` que no lleva `surfaceId` → regresión de `/aeo-2`). Ver Delta.
- Invariante: **fail-CLOSED para origin desconocido**, **fail-SAFE para el data source** (DB down → piso, nunca unión vacía).
- Preserve `Vary: Origin` and existing allowed methods/headers.
- Add tests for allowed and disallowed origins + **test/curl de regresión de `/aeo-2` (`efeoncepro.com` sigue con ACAO)**.

### Slice 2 — Think host authorization for grader surface

- Migración/seed additive **idempotente**: **APPEND** `https://think.efeoncepro.com` a
  `fhsf-ai-visibility-grader.origin_allowlist_json` (hoy `[]`). **NO tocar** `fhsf-efeonce-aeo-diagnostic`
  (la surface de `/aeo-2`) ni `fhsf-efeonce-lead-gen-web`. Nunca `replace` del array — solo append sin duplicar.
- Keep `allowed_form_slugs_json` limited to `ai-visibility-grader`.
- Verify that `GET` render contract and `POST /submit` authorization agree for the same origin.
- Preserve `/aeo-2/` behavior for `https://efeoncepro.com` (surface intacta + piso de transporte).

### Slice 3 — Runtime proof and docs

- Update architecture/manual docs with the new CORS governance rule.
- Update TASK-1327 dependency notes so the landing does not carry this platform concern.
- Run focal tests and curl matrix for allowed/disallowed origins.

## Out of Scope

- Building `think.efeoncepro.com/brand-visibility` landing.
- Changing the `<greenhouse-form>` renderer visual treatment.
- Changing field schema, consent copy, Turnstile behavior, submit validation or destinations.
- Changing AI Visibility scoring, probes, normalizer, report model, worker execution or `executeClaimedGraderRun`.
- Opening CORS for arbitrary Astro/WordPress hosts.

## Detailed Spec

Current observed drift:

```sh
curl -i -H 'Origin: https://think.efeoncepro.com' \
  'https://greenhouse.efeoncepro.com/api/public/growth/forms/69cd5269-5f97-4d32-99c4-0b23f41aa2f5?surfaceId=fhsf-ai-visibility-grader'
```

returns `200` JSON but no `Access-Control-Allow-Origin`.

```sh
curl -i -X OPTIONS \
  -H 'Origin: https://think.efeoncepro.com' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: content-type' \
  'https://greenhouse.efeoncepro.com/api/public/growth/forms/69cd5269-5f97-4d32-99c4-0b23f41aa2f5/submit'
```

returns `204` but no `Access-Control-Allow-Origin`.

The final implementation must make that origin work only because it is governed, not because a new local literal was appended to a route helper.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (CORS resolver) -> Slice 2 (surface allowlist) -> Slice 3 (runtime proof/docs).
- TASK-1327 may start implementation only after Slice 1 and Slice 2 have runtime evidence in the target environment used by Think.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| CORS opens submit APIs to an unintended origin | growth/forms/api | medium | fail-closed resolver, negative tests, no wildcard | browser can submit from disallowed origin |
| Preflight cannot know surface-specific allowlist | growth/forms/api | medium | use governed transport allowlist plus command-level surface authorization, or require surfaceId query only if renderer supports it | OPTIONS missing ACAO for approved host |
| AEO `/aeo-2/` regresses | public-site/forms | low | preserve `efeoncepro.com` in governed allowlist and add curl regression | AEO renderer load/submit fails |
| Surface DB and transport allowlist drift again | growth/forms/platform | medium | document SoT, tests, and runtime contract; avoid local literals in route helper | GET returns contract but browser blocks |

### Feature flags / cutover

- No new feature flag by default. Change is additive and fail-closed.
- If Discovery finds the resolver needs broader transport config, the config must be environment-scoped and documented before production cutover.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert resolver change or restore previous config | <10 min + redeploy | si |
| Slice 2 | Remove `https://think.efeoncepro.com` from the governed allowlist | <10 min + deploy/migration rollback if needed | si |
| Slice 3 | Revert docs/task dependency updates | <5 min | si |

### Production verification sequence

1. Verify `GET` render contract from `Origin: https://think.efeoncepro.com` includes `Access-Control-Allow-Origin: https://think.efeoncepro.com`.
2. Verify `OPTIONS` preflight for `/submit` and `/verify-email` includes ACAO and expected methods.
3. Verify `Origin: https://evil.example` does not receive ACAO.
4. Verify `Origin: https://efeoncepro.com` still receives ACAO.
5. Verify server-side submit without a valid Turnstile token still fails closed as `captcha_failed`, not as CORS/surface drift.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Public Forms CORS is no longer governed by an unversioned local hardcoded set inside the route helper.
- [ ] `https://think.efeoncepro.com` is authorized for the AI Visibility Grader form/surface in the governed source.
- [ ] `GET /api/public/growth/forms/69cd5269-5f97-4d32-99c4-0b23f41aa2f5?surfaceId=fhsf-ai-visibility-grader` returns ACAO for `Origin: https://think.efeoncepro.com`.
- [ ] `OPTIONS` preflight for `/submit` and `/verify-email` returns ACAO for `Origin: https://think.efeoncepro.com`.
- [ ] Disallowed origins do not receive ACAO and cannot pass surface authorization.
- [ ] `https://efeoncepro.com` remains authorized for the existing AEO WordPress renderer.
- [ ] Tests cover allowed/disallowed CORS behavior and surface authorization alignment.
- [ ] TASK-1327 is updated to depend on this platform fix instead of carrying the CORS workaround.

## Verification

- `pnpm test` focal for Growth Forms public CORS/routes.
- `pnpm typecheck` or relevant local check for changed files.
- Curl matrix from the production/staging target environment.
- `pnpm task:lint --task TASK-1335`.
- `pnpm ops:lint --changed`.

## Closing Protocol

- [ ] `Lifecycle` synchronized with real status.
- [ ] File moved to the correct lifecycle folder.
- [ ] `docs/tasks/README.md` synchronized.
- [ ] `docs/tasks/TASK_ID_REGISTRY.md` synchronized.
- [ ] `docs/architecture/growth-public-forms-runtime-contract.md` updated.
- [ ] `Handoff.md` updated with runtime evidence and any production rollout caveat.
- [ ] Cross-impact checked against TASK-1327, TASK-1298 and TASK-1321.
