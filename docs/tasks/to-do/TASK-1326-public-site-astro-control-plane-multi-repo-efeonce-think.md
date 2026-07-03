# TASK-1326 — Public-site Astro control plane multi-repo (gobernar efeonce-think desde Greenhouse)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
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
- Domain: `platform|public-site|growth|ops`
- Blocked by: `none`
- Branch: `task/TASK-1326-public-site-astro-control-plane-multi-repo`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Generalizar el **binding + GitHub Control Plane de public-site Astro** de **single-repo** (hoy pineado a `efeonce-web`) a un **registro multi-repo**, para que Greenhouse **observe y opere** el nuevo repo satélite **`efeonce-think`** (hub de lead magnets, `think.efeoncepro.com`) desde el portal — igual que gobierna `efeonce-web`. El repo ya nació gobernado (lleva su `greenhouse.repo.json`, schema `greenhouse.externalRepo.v1`); falta el cableado del lado Greenhouse para que ese manifiesto se traduzca en observabilidad (CI/deploy) + comandos.

## Why This Task Exists

El requisito del operador (2026-07-03) es que **`efeonce-think` sea controlable desde Greenhouse**, no un repo huérfano. El patrón canónico ya existe (TASK-1167 GitHub Control Plane, TASK-1161 binding reader), pero está **acoplado a un único repo**: los tipos mismos pinean literales `owner: 'efeoncepro'`, `repo: 'efeonce-web'`, `projectId: 'prj_i52…'` — no hay forma de registrar un segundo repo sin generalizar.

Evidencia del acople single-repo:

- `PUBLIC_SITE_ASTRO_STATIC_BINDING` es **una const única** para `efeonce-web` ([public-site-astro-binding.ts](../../src/config/public-site-astro-binding.ts)).
- Los tipos pinean el repo por literal: `PublicSiteGithubRepositoryIdentity.repo: 'efeonce-web'`, `nameWithOwner: 'efeoncepro/efeonce-web'` ([github-control-plane/types.ts](../../src/lib/public-site/astro/github-control-plane/types.ts)); `PublicSiteAstroStaticBinding.repository.name: 'efeonce-web'` ([binding-types.ts](../../src/lib/public-site/astro/binding-types.ts)).
- El reader, el control plane, la route admin y las señales de reliability resuelven ese único binding.

`efeonce-think` ya tiene su lado listo: `greenhouse.repo.json` (mirror de `sky-efeonce`) con `governedBy.controlPlaneCandidate = public-site-github-control-plane.v1` + binding Vercel + surfaces. Nota: incluso `sky-efeonce` declara "integración runtime pendiente en greenhouse-eo" — esta task cierra ese gap para el patrón, empezando por `efeonce-think`.

## Goal

- Un **registro multi-repo** de superficies Astro gobernadas (keyed por repo/proyecto), sin literales pineados a un solo repo.
- `efeonce-think` registrado y **observable** desde el portal: repo state, CI/workflows, deploys Vercel, señales de reliability (CI/deploy failed) resueltas por repo.
- El GitHub Control Plane y su route admin resuelven el repo por parámetro/registro, no por const única.
- `efeonce-web` sigue funcionando idéntico (no-regresión); su binding pasa a ser una entrada del registro.
- Contrato alineado con el `greenhouse.repo.json` de cada satélite (SSOT del lado repo).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/tasks/complete/TASK-1167-public-site-github-repo-control-plane.md` — control plane vigente (single-repo).
- `docs/tasks/in-progress/TASK-1161-public-site-greenhouse-binding-reader.md` — binding reader.
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — señales de reliability (CI/deploy failed).
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` — Platform Health / lanes.

Reglas obligatorias:

- **Generalizar, no forkear:** un registro/reader multi-repo, NO copiar el módulo para `efeonce-think`. Un primitive, muchos repos gobernados (Full API Parity).
- **No-regresión de `efeonce-web`:** su comportamiento actual queda idéntico; pasa a ser la primera entrada del registro.
- **SSOT por repo = `greenhouse.repo.json`** (schema `greenhouse.externalRepo.v1`). El registro en greenhouse-eo se alinea con ese manifiesto (repo, vercel, kind, owner, surfaces), no inventa un shape paralelo.
- **Vercel scope discipline:** cualquier resolución Vercel usa el `teamId`/`teamSlug` del binding (`efeonce-7670142f`), nunca el personal.

## Normative Docs

- `greenhouse.repo.json` de `efeonce-think` (repo `efeoncepro/efeonce-think`) — manifiesto del satélite a registrar.
- `greenhouse.repo.json` de `sky-efeonce` — precedente del schema.

## Dependencies & Impact

### Depends on

- TASK-1167 (control plane) + TASK-1161 (binding reader) — foundation a generalizar.
- `efeonce-think` con `greenhouse.repo.json` (ya committeado) + proyecto Vercel `efeonce-think` (`prj_F4gvS8jmWjvdJ8cTwM6k60R1XydV`, team `team_gmNiF4YCHmc1wqsHUTCvqjmN`) — ya existe (TASK-1325 Slice 1).

### Blocks / Impacts

- TASK-1325 (hub) — esta task es su follow-up de gobierno (lo hace operable desde el portal, no solo desplegado).
- Follow-up UI: selector de repo en la surface admin de public-site (ui-ux, fuera de scope aquí).
- `sky-efeonce` y futuros satélites: heredan el registro multi-repo por construcción.

### Files owned

- `src/config/public-site-astro-binding.ts` (const única → registro keyed)
- `src/lib/public-site/astro/binding-types.ts` (des-pinear literales de repo)
- `src/lib/public-site/astro/binding-reader.ts`
- `src/lib/public-site/astro/github-control-plane/types.ts` (des-pinear `owner`/`repo`/`nameWithOwner`)
- `src/lib/public-site/astro/github-control-plane/reader.ts`
- `src/lib/public-site/astro/github-control-plane/composer.ts`
- `src/lib/public-site/astro/github-control-plane/commands/{adapter,client}.ts`
- `src/app/api/admin/public-site/github-control-plane/route.ts`
- `src/lib/reliability/queries/public-site-astro-ci-failed.ts`
- `src/lib/reliability/queries/public-site-astro-deploy-failed.ts`
- `docs/operations/public-site-astro-runtime-binding-*.json` (manifest)

## Current Repo State

### Already exists

- Binding + control plane + reader + señales de reliability + route admin — **funcionando para `efeonce-web`** (single-repo).
- `greenhouse.repo.json` de `efeonce-think` con binding Vercel + surfaces.
- Proyecto Vercel `efeonce-think` en el team correcto + GitHub conectado (auto-deploy).

### Gap

- El binding y los tipos del control plane **pinean literales** de `efeonce-web` — no admiten un segundo repo.
- No hay resolución por `repoKey`/registro en reader, control plane, route admin ni señales.
- `efeonce-think` no aparece en ninguna surface de observabilidad de Greenhouse.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `api`
- Source of truth afectado: registro de superficies Astro gobernadas (config `public-site-astro-binding.ts`) + `greenhouse.repo.json` por repo
- Consumidores afectados: control plane reader, route admin `/api/admin/public-site/github-control-plane`, señales de reliability, (futuro) surface admin UI, Nexa/MCP por parity
- Runtime target: `production` (observabilidad) + `external` (GitHub/Vercel APIs por repo)

### Contract surface

- Contrato existente a respetar: `public-site-astro-binding.v1`, `public-site-github-control-plane.v1` (versionar si el shape cambia de single→registry).
- Contrato nuevo o modificado: binding pasa de const única a **registro keyed por repo**; reader/route aceptan `repoKey` (default `efeonce-web` para back-compat).
- Backward compatibility: `gated`/`compatible` — `efeonce-web` sigue resolviéndose igual (default). Bump de versión de contrato si el payload expone la lista de repos.
- Full API parity: el registro es el primitive; UI admin / Nexa / MCP lo consumen — no lógica paralela por repo.

### Data model and invariants

- Entidades afectadas: config TS (registro) + manifiestos `greenhouse.repo.json` (en cada repo satélite). Sin tablas nuevas (a confirmar en Discovery si el estado observado se persiste).
- Invariantes:
  - `efeonce-web` mantiene comportamiento idéntico (no-regresión) como primera entrada del registro.
  - Todo repo del registro se alinea 1:1 con su `greenhouse.repo.json` (repo, vercel projectId/teamId, kind, surfaces).
  - Resolución Vercel siempre con `teamId` del binding (`efeonce-7670142f`), nunca personal.
- Tenant/space boundary: N/A (superficies públicas; acceso admin-gated para observarlas).
- Idempotency/concurrency: N/A (reads); los comandos del control plane conservan su semántica actual.
- Audit/outbox/history: conservar la posture actual del control plane; si emite comandos, mantener su audit.

### Migration, backfill and rollout

- Migration posture: `none` (config + tipos; confirmar en Discovery si hay estado persistido).
- Default state: `enabled with rationale` — additivo; `efeonce-web` por default, `efeonce-think` se agrega como segunda entrada.
- Backfill plan: N/A.
- Rollback path: `revert PR + redeploy`.
- External coordination: lecturas a GitHub/Vercel APIs del repo/proyecto `efeonce-think` (ya autenticadas vía `gh`/Vercel token del team).

### Security and access

- Auth/access gate: la route admin conserva su gate actual (admin). No ampliar exposición.
- Sensitive data posture: `no sensitive data` (estado público de repo/deploy). No exponer tokens.
- Error contract: canonical + `captureWithDomain` (dominio ops/platform), como el control plane actual.
- Abuse/rate-limit posture: conservar la actual (llamadas a GitHub/Vercel con degradación honesta por fuente).

### Runtime evidence

- Local checks: `pnpm test` sobre los tests del control plane/binding (`reader.test.ts`, `composer.test.ts`, `commands/adapter.test.ts`, `binding-reader.test.ts`, `route.test.ts`) — deben pasar con `efeonce-web` + cubrir `efeonce-think`.
- DB/runtime checks: N/A (o verify de estado persistido si Discovery lo encuentra).
- Integration checks: resolver el estado de `efeonce-think` (repo + workflows + deploy Vercel) contra las APIs reales y confirmar que el reader lo compone sin degradar.
- Reliability signals/logs: `public-site-astro-ci-failed` / `public-site-astro-deploy-failed` resueltos por repo, incluyendo `efeonce-think`.
- Production verification sequence: ver §Rollout.

### Acceptance criteria additions

- [ ] Source of truth (registro multi-repo + `greenhouse.repo.json`), contract surface y consumers nombrados con paths reales.
- [ ] Invariante de no-regresión de `efeonce-web` explícito y verificado por tests.
- [ ] Rollback = revert PR + redeploy.
- [ ] Evidencia runtime: estado de `efeonce-think` observable (repo/CI/deploy) sin degradar.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Registro multi-repo (tipos + config)

- Des-pinear los literales de repo en `binding-types.ts` y `github-control-plane/types.ts` (de `'efeonce-web'` a genérico).
- Convertir `PUBLIC_SITE_ASTRO_STATIC_BINDING` en un **registro keyed por repo** (`efeonce-web` + `efeonce-think`), alineado con cada `greenhouse.repo.json`.
- Mantener un default (`efeonce-web`) para back-compat de callers actuales.

### Slice 2 — Reader / control plane / route resueltos por repoKey

- `binding-reader`, `github-control-plane/reader`, `composer`, `commands/{adapter,client}` y la route admin aceptan/resuelven `repoKey` (default `efeonce-web`).
- Componer el estado de `efeonce-think` (repo + branches + workflows + runs + deploy) sin degradar por el repo extra.

### Slice 3 — Señales de reliability por repo

- `public-site-astro-ci-failed` y `public-site-astro-deploy-failed` resueltas por repo, incluyendo `efeonce-think`.
- Verificar rollup de severidad y que `efeonce-web` no cambia su señal.

## Out of Scope

- **NO** el selector de repo en la UI admin del portal — follow-up `ui-ux` separado.
- **NO** emitir comandos nuevos (deploy triggers, etc.) más allá de generalizar los existentes; nuevas capabilities de comando = task aparte.
- **NO** tocar el render del informe ni el pipeline del grader (TASK-1325/1280).
- **NO** migrar `sky-efeonce` en esta task (se beneficia del registro, pero su registro es follow-up).

## Detailed Spec

El cambio es un **strangler additivo**: el binding único se convierte en la primera entrada de un registro keyed; los consumers pasan de leer la const a resolver por `repoKey`. Los literales de tipo (`owner: 'efeoncepro'`, `repo: 'efeonce-web'`, `nameWithOwner`, `projectId`) se generalizan a `string` acotado o unión de claves del registro. Cada entrada del registro se hidrata desde/valida contra el `greenhouse.repo.json` del repo (repo, `vercel.projectId`/`teamId`, `kind`, `owner`, `surfaces`).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- **Slice 1 (tipos+registro) → Slice 2 (resolución por repoKey) → Slice 3 (señales).** No tocar consumers antes de generalizar los tipos, o se rompe el build de `efeonce-web`.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Regresión de `efeonce-web` al des-pinear tipos | public-site / platform | medium | Default `efeonce-web` + tests existentes verdes antes de agregar `efeonce-think` | `public-site-astro-*` signals + route.test |
| Reader degrada por el repo extra (rate/404) | ops / reliability | low | Degradación honesta por fuente ya existe; test con `efeonce-think` real | señales CI/deploy failed |
| Drift entre registro TS y `greenhouse.repo.json` | platform | medium | Alinear/validar contra el manifiesto; test de consistencia | emerge en logs |

### Feature flags / cutover

- Sin flag — additivo. `efeonce-think` aparece como segunda entrada; `efeonce-web` default sin cambio. Revert = revert PR.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR | <5 min | sí |
| Slice 2 | revert PR + redeploy | <5 min | sí |
| Slice 3 | revert PR + redeploy | <5 min | sí |

### Production verification sequence

1. Slice 1: build + tests del módulo verdes con `efeonce-web` intacto.
2. Slice 2: resolver estado de `efeonce-think` contra GitHub/Vercel reales → repo/CI/deploy visibles sin degradar; `efeonce-web` idéntico.
3. Slice 3: señales de reliability muestran ambos repos; `efeonce-web` sin cambio de severidad.

### Out-of-band coordination required

- N/A — repo-only change (lee GitHub/Vercel del team ya autenticado).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El binding es un registro multi-repo; los tipos ya no pinean `'efeonce-web'` por literal.
- [ ] `efeonce-think` está registrado, alineado con su `greenhouse.repo.json`, y su estado (repo/CI/deploy) es observable vía el control plane.
- [ ] `efeonce-web` mantiene comportamiento idéntico (tests verdes, señales sin cambio).
- [ ] Reader/route/composer/commands resuelven por `repoKey` con default `efeonce-web`.
- [ ] Señales `public-site-astro-ci-failed` / `public-site-astro-deploy-failed` cubren `efeonce-think`.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test` (focal: `public-site/astro/**`, `reliability/queries/public-site-astro-*`)
- Verificación runtime: componer el estado de `efeonce-think` contra GitHub/Vercel reales.

## Closing Protocol

- [ ] `Lifecycle` sincronizado con el estado real
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado si cambia comportamiento observable del control plane
- [ ] chequeo de impacto cruzado sobre TASK-1325 (gobierno) y TASK-1161/1167
- [ ] `greenhouse.repo.json` de `efeonce-think` alineado con el registro final

## Follow-ups

- Surface admin UI: selector de repo en la vista de public-site control plane (ui-ux).
- Registrar `sky-efeonce` en el registro multi-repo (reusa esta foundation).
- Comandos nuevos del control plane sobre satélites (deploy trigger gobernado) si el operador lo pide.

## Open Questions

- **¿El estado observado se persiste** (tabla) o es read-through en vivo a GitHub/Vercel? (Discovery contra el reader actual.)
- **Clave del registro:** ¿`repoKey` = nombre del repo (`efeonce-think`) o un slug de surface? Alinear con `greenhouse.repo.json`.
