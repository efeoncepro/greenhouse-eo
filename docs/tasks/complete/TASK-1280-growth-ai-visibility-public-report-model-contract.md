# TASK-1280 — Growth AI Visibility: Public Report Model Contract (headless render unblocker)

## Delta 2026-07-01 — keystone Greenhouse del lead magnet público; absorbe el render de 1241

Auditoría 2026-07-01: esta task es **el único aporte pendiente del lado Greenhouse** para el render público del lead magnet. **TASK-1241 (página Next.js en greenhouse-eo) quedó SUPERSEDED** por el ADR de render headless (2026-06-28): el form/landing/render migran a `efeonce-web` (Astro), y este endpoint-modelo es lo que los alimenta. **Gap confirmado en código:** `GET /api/public/growth/ai-visibility/report/[token]/route.ts` hoy devuelve `{ report: snapshot.publicReport }` (DTO crudo) — todavía NO expone el `ReportArtifactModel` + `modelVersion`. Sin blockers, effort bajo → listo para implementar.

## Delta 2026-07-01 (b) — correcciones de auditoría (arch + seo-aeo + código real)

Auditoría profunda contra el código vigente (`model.ts`, `report-artifact-no-leak.test.tsx`, `contracts.ts`, `dispatch-report-email.ts`) corrigió **dos supuestos load-bearing** de esta task que estaban invertidos/incompletos y habrían roto la implementación:

1. **`engineSnapshot` NO es un leak — es el headline del lead magnet.** TASK-1252 (Delta 2026-06-27) reclasificó `engineSnapshot` (= `providerPresence`: conteos de visibilidad de la marca evaluada por motor, con logo + nombre) como **público-safe** y lo incluye en `publicWeb` **por diseño**. `baseModel` lo puebla en `publicWeb`/`clientPortal`, y el test no-leak vigente (`report-artifact-no-leak.test.tsx:73-78`) **afirma que es público en TODAS las variants**. El framing previo de esta task ("`publicWeb` excluye `engineSnapshot`; sólo vive en `adminPreview`") era **falso**: implementarlo así rompe el test o mata el valor del lead magnet. Lo internal-only real es `providerFindings` (narrativa cruda por motor) + `accuracyFindings` (YMYL "la IA se equivoca sobre ti") + raw provider text/prompts/citation URLs/reasons internos/recommendation `priority` — que estructuralmente **no existen** en `PublicGraderReport`. El no-leak es **por construcción de tipo** (capa A), no por exclusión de `engineSnapshot`.
2. **El contrato debe entregar el `header` render-ready.** El artifact se pinta con `ReportHeader { organizationName, reportDate, periodLabel }` que va **separado del modelo** (prop); el `PublicGraderReport`/modelo NO lleva el nombre de la marca. El path canónico (`dispatch-report-email.ts:120-127`) lo arma con `lead.brandName` + `formatReportDate(asOf)` + copy `periodLabel` sintetizado. Sin exponer ese header, efeonce-web no puede pintar el masthead (y un link compartido queda sin contexto de marca). → Slice 1 lo agrega.
3. **El builder ya es puro server-importable** (`model.ts` no importa React/`server-only`/MUI; sólo `scoring/config` + tipos). No hay que "extraer un builder puro"; sólo verificar build verde. `modelVersion` va en `src/lib/growth/ai-visibility/report/**` (server-safe), NO bajo `src/components/**`.
4. **Docs stale idénticas a corregir al cerrar:** `contracts.ts` (docstring de `ProviderPresence`, "INTERNAL ONLY: nunca viaja al DTO público") y el ADR `…HEADLESS_RENDER_DECISION_V1.md` (líneas 46, 86) repiten el mismo error de framing y contradicen a TASK-1252.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Bajo`
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
- Domain: `growth`
- Blocked by: `none`
- Branch: `task/TASK-1280-growth-ai-visibility-public-report-model-contract`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El endpoint público del informe (`GET /api/public/growth/ai-visibility/report/[token]`) hoy devuelve el DTO crudo `PublicGraderReport`. Esta task lo extiende (aditivo, back-compat) para exponer también el **`ReportArtifactModel` render-ready (variant `publicWeb`) + `modelVersion`**, de modo que el hub público en `efeonce-web` (`think.efeoncepro.com`) sea un render "tonto" del modelo, sin re-implementar la derivación de scoring. Es el **unblocker** del render headless de EPIC-020.

## Why This Task Exists

La decisión `GREENHOUSE_PUBLIC_REPORT_HEADLESS_RENDER_DECISION_V1.md` (2026-06-28) define que el informe en pantalla se renderiza **nativo en `efeonce-web` (Astro)** consumiendo a Greenhouse headless — no iframe (rompe GTM), no reconstruir el scoring en Astro. Para que `efeonce-web` NO re-derive niveles/severidad/gaps (lo que causaría drift), Greenhouse debe entregar el **modelo ya construido** (`modelFromPublicReport`), que es el SSOT único del builder. Hoy el endpoint entrega el DTO crudo, así que el consumidor tendría que re-derivar. Cerrar este gap es lo que destraba el frente de `efeonce-web`.

## Goal

- El endpoint público del informe entrega el `ReportArtifactModel` (variant `publicWeb`) ya construido + el `header` render-ready (`organizationName`/`reportDate`/`periodLabel`), además del DTO crudo (back-compat).
- El payload lleva un `modelVersion` estable para que Greenhouse y `efeonce-web` evolucionen seguro.
- Un test de contrato garantiza que el payload público **nunca** incluye campos internal-only (`providerFindings`/narrativa cruda por motor, `accuracyFindings`, raw provider text, prompts, citation URLs, reasons internos, recommendation `priority`): no-leak **por construcción de tipo** (el modelo deriva de `PublicGraderReport`, un tipo que estructuralmente no tiene esos campos). `engineSnapshot` (conteos de visibilidad por motor) **SÍ va** en el payload público — es el headline del lead magnet (TASK-1252), no un leak.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_REPORT_HEADLESS_RENDER_DECISION_V1.md` — ADR raíz de esta task (contrato headless, no-leak server-side, fetch server-side, versionado).
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — §13 privacy/security, §snapshot público (TASK-1239).
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — el modelo es el contrato; UI/Nexa/efeonce-web son consumers.

Reglas obligatorias:

- **NUNCA** exponer en el payload público campos internal-only: `providerFindings` (narrativa cruda por motor), `accuracyFindings` (YMYL "la IA se equivoca sobre ti"), raw provider text, prompts, citation URLs, reasons internos de dimensión, recommendation `priority`, `engineSnapshot` de internals de scoring. Estos **no existen** en `PublicGraderReport` → el no-leak es por construcción de tipo (capa A), reforzado por el test de contrato (capa C).
- **`engineSnapshot` (visibilidad por motor) SÍ es público** y va en el payload `publicWeb` — es el headline del lead magnet (TASK-1252, Delta 2026-06-27). NO removerlo ni tratarlo como leak. Lo internal-only es la NARRATIVA cruda (`providerFindings`), no los conteos.
- **Aditivo y back-compat:** el shape actual (`{ report, asOf, expiresAt }`) se mantiene; se agrega `model` + `modelVersion` + `header`. No romper consumers existentes del DTO crudo.
- **Builder = SSOT único:** la derivación vive sólo en `modelFromPublicReport`; el endpoint no recomputa ni reimplementa la lógica. `efeonce-web` consume, no deriva. El `header` también se arma con la primitive canónica ya usada por el email (`lead.brandName` + `formatReportDate(asOf)` + `periodLabel`), no reinventado en el route.
- **Server-importable (ya cumplido):** `report-artifact/model.ts` ya es TS puro (sólo importa `scoring/config` + tipos; sin React/`server-only`/MUI) → importable desde el route handler sin arrastrar React. NO hace falta extraer un builder nuevo; sólo confirmar build verde del route. `modelVersion` se define en `src/lib/growth/ai-visibility/report/**` (server-safe), no bajo `src/components/**`.

## Normative Docs

- `docs/architecture/GREENHOUSE_PUBLIC_REPORT_HEADLESS_RENDER_DECISION_V1.md`

## Dependencies & Impact

### Depends on

- `src/app/api/public/growth/ai-visibility/report/[token]/route.ts` — endpoint existente (TASK-1239).
- `src/components/growth/ai-visibility/report-artifact/model.ts` — `ReportArtifactModel` + `modelFromPublicReport` (existentes).
- `src/lib/growth/ai-visibility/report/snapshot.ts` — `readPublicGraderReport` (existente).

### Blocks / Impacts

- **Desbloquea** el render del informe en `efeonce-web` (`think.efeoncepro.com`) — task hermana en el repo `efeoncepro/efeonce-web` (render Tailwind + blend AXIS + form + status + GTM), gestionada en ese repo.
- Consistente con TASK-1239 (snapshot público) y TASK-1245 (status reader); no los modifica.

### Files owned

- `src/app/api/public/growth/ai-visibility/report/[token]/route.ts` [modificar: agregar `model` + `modelVersion` + `header`]
- `src/lib/growth/ai-visibility/report/**` [agregar: constante `GROWTH_AI_VISIBILITY_PUBLIC_REPORT_MODEL_VERSION` server-safe (en `contracts.ts` o `model-version.ts`)]
- `src/lib/growth/ai-visibility/report/snapshot.ts` [posible: exponer `brandName` junto al snapshot para armar el `header`, o resolverlo por `runId` en el route]
- `src/components/growth/ai-visibility/report-artifact/model.ts` [sólo verificar pureza server-side — ya cumple; NO extraer builder]
- `src/app/api/public/growth/ai-visibility/report/[token]/__tests__/route-contract.test.ts` [nuevo: test de contrato del payload del endpoint — no-leak + shape + presencia de `engineSnapshot`/`header`]
- `src/lib/growth/ai-visibility/report/contracts.ts` [al cerrar: corregir docstring stale de `ProviderPresence` ("INTERNAL ONLY") que contradice TASK-1252]

## Current Repo State

### Already exists

- Endpoint público del informe `GET /api/public/growth/ai-visibility/report/[token]` que resuelve el snapshot inmutable por token y devuelve `{ report: PublicGraderReport, asOf, expiresAt }` (TASK-1239).
- `ReportArtifactModel` + builder `modelFromPublicReport(publicReport, 'publicWeb')` en `src/components/growth/ai-visibility/report-artifact/model.ts` (TASK-1252).
- Variant `publicWeb` ya excluye `engineSnapshot` (sólo en `adminPreview`) + tests no-leak existentes (`report-artifact-no-leak.test`).
- Status reader público (`run/[handle]`, TASK-1245) y snapshot público inmutable (`report/snapshot.ts`).

### Gap

- El endpoint entrega el DTO crudo `PublicGraderReport`, no el modelo render-ready → un consumer (efeonce-web) tendría que re-derivar la lógica del builder (drift).
- **El payload no lleva el `header` (`organizationName`/`reportDate`/`periodLabel`)** que el artifact necesita para el masthead. El nombre de la marca NO está en `PublicGraderReport` (vive en el run/lead/`grader_profiles.brand_name`); el `periodLabel` es copy sintetizado por Greenhouse (`dispatch-report-email.ts`). Sin exponerlo, efeonce-web no puede pintar el encabezado ni tener contexto de marca en un link compartido.
- No hay `modelVersion` en el contrato → los dos repos no tienen forma estable de versionar el shape.
- No hay test de contrato a nivel del payload del endpoint que garantice no-leak del modelo serializado.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `api`
- Source of truth afectado: el snapshot público inmutable (`readPublicGraderReport`) + el builder `modelFromPublicReport` (SSOT del modelo render-ready)
- Consumidores afectados: `efeonce-web` (render headless del hub público) + cualquier consumer futuro del informe público (Nexa/MCP por parity)
- Runtime target: `production` (endpoint público, sin sesión)

### Contract surface

- Contrato existente a respetar: `GET /api/public/growth/ai-visibility/report/[token]` → `{ report: PublicGraderReport, asOf, expiresAt }` (no romper).
- Contrato nuevo o modificado: el mismo endpoint suma `model: ReportArtifactModel (publicWeb)` + `modelVersion: string` + `header: { organizationName, reportDate, periodLabel }` al payload.
- Backward compatibility: `compatible` (aditivo; los campos previos quedan intactos).
- Full API parity: el modelo es el contrato gobernado; `efeonce-web`/Nexa/MCP renderizan/operan el MISMO modelo, sin lógica paralela. Un primitive (`modelFromPublicReport`), muchos consumers.

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna (sin cambio de schema; serializa un modelo derivado de un snapshot ya persistido).
- Invariantes que no se pueden romper:
  - El payload `publicWeb` NUNCA incluye `providerFindings` (narrativa cruda por motor), `accuracyFindings`, texto crudo de providers, prompts, citation URLs, reasons internos ni recommendation `priority`. (`engineSnapshot`/`providerPresence` SÍ va — es público-safe, headline del lead magnet.)
  - El `modelVersion` es estable; un breaking change del shape = bump de versión + render de `efeonce-web` adaptado en el mismo ciclo.
  - El endpoint NO recomputa scoring ni re-deriva el modelo: usa `modelFromPublicReport(..., 'publicWeb')` tal cual, y arma el `header` con la primitive canónica ya usada por el email.
- Tenant/space boundary: dominio público sin sesión; el `reportToken` (256 bits, no enumerable) ES la autenticación. Token expirado/inexistente → 404 indistinto (no filtra existencia).
- Idempotency/concurrency: read-only sobre snapshot inmutable; sin escritura. Naturalmente idempotente.
- Audit/outbox/history: N/A (read-only). El snapshot ya es append-only/inmutable (TASK-1239).

### Migration, backfill and rollout

- Migration posture: `none` (sin DB).
- Default state: `enabled with rationale` — cambio aditivo de serialización; no requiere flag (es más JSON en una respuesta read-only token-gated). Si se prefiere graduar, exponer el modelo detrás de `?format=model` (back-compat por defecto).
- Backfill plan: N/A.
- Rollback path: `revert PR + redeploy` (<5 min vía Vercel). Sin estado mutado.
- External coordination: N/A — repo-only change. (La task hermana de `efeonce-web` consume este contrato; coordinación de versión vía `modelVersion`.)

### Security and access

- Auth/access gate: `reportToken` no enumerable (256 bits) — sin sesión, sin capability (superficie pública).
- Sensitive data posture: `no sensitive data` en el payload `publicWeb` (no-leak por construcción de tipo); el riesgo es exposición accidental de internals (`providerFindings`/`accuracyFindings`/raw) → cubierto por el test de contrato. El `header.organizationName` (marca propia que el usuario declaró en el form) NO es dato sensible; el token no enumerable acota su exposición.
- Error contract: errores sanitizados (`captureWithDomain(err, 'growth', ...)`), nunca raw al cliente (patrón ya presente en el route handler).
- Abuse/rate-limit posture: rate-limit proporcional por IP ya existe (`checkPublicReadAllowed`); se mantiene.

### Runtime evidence

- Local checks: test de contrato no-leak del payload (`model` no incluye campos internos; `modelVersion` presente) + `pnpm typecheck`.
- DB/runtime checks: fetch real del endpoint contra un snapshot `ready` → verificar `model` poblado + shape esperado + ausencia de internals.
- Integration checks: confirmar que `modelFromPublicReport` es server-importable en el route handler sin arrastrar React al bundle (build verde del route).
- Reliability signals/logs: N/A nuevo (read path; los errores van a Sentry `domain=growth`).
- Production verification sequence: deploy → fetch del endpoint con un token real `ready` → confirmar `model` + `modelVersion` + no-leak.

### Acceptance criteria additions

- [x] Source of truth, contract surface and consumers are named with real paths or objects.
- [x] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [x] Migration/backfill/rollback posture is explicit and proportional to risk.
- [x] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [x] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (no llenar al crear la task)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Exponer el modelo render-ready + modelVersion + header

- Definir una constante `GROWTH_AI_VISIBILITY_PUBLIC_REPORT_MODEL_VERSION` (semver del contrato, p. ej. `1.0.0`) en un módulo server-safe bajo `src/lib/growth/ai-visibility/report/**` (`contracts.ts` o `model-version.ts` nuevo) — NO bajo `src/components/**`.
- Extender el route handler para: (a) construir `modelFromPublicReport(snapshot.publicReport, 'publicWeb')`; (b) armar el `header` (`organizationName` = `brandName` del run/lead; `reportDate` = `formatReportDate(asOf)`; `periodLabel` = copy canónico) reutilizando la primitive que ya usa `dispatch-report-email.ts` (no reinventar copy); (c) devolver `{ report, model, modelVersion, header, asOf, expiresAt }` (back-compat: `report`/`asOf`/`expiresAt` intactos).
- Resolver `brandName`: exponerlo desde `readPublicGraderReport` (join a `grader_profiles`/lead por `runId`) o un reader acotado. Read-only, público-safe (es la marca que el propio usuario declaró).
- Confirmar que el builder importa limpio en el route (build verde del route; ya es TS puro sin React) — no extraer builder.

### Slice 2 — Test de contrato no-leak + shape

- Test a nivel del **payload del endpoint** (arma snapshot de fixture, llama al handler o al serializer) que asegura:
  1. `model.variant === 'publicWeb'` y `modelVersion` presente + estable.
  2. `header` presente con `organizationName`/`reportDate`/`periodLabel` no vacíos.
  3. El JSON serializado **no** contiene `providerFindings`, `accuracyFindings`, raw provider text/prompts/citation URLs, reasons internos ni recommendation `priority` (reutilizar/extender el set `INTERNAL_LEAK_STRINGS` del test no-leak vigente).
  4. **Presencia (sanity):** el payload SÍ incluye `engineSnapshot`/`providerPresence` (headline del lead magnet — un test que exija su ausencia sería un bug).
  5. Shape del modelo estable (snapshot test tolerante a campos opcionales).

## Out of Scope

- El render del informe en `efeonce-web` (Tailwind + blend AXIS), el form, la pantalla de status y el wiring GTM — task hermana en el repo `efeonce-web`.
- El setup del subdominio `think.efeoncepro.com` / DNS / Vercel multi-dominio.
- Cualquier cambio al scoring, a las dimensiones, al snapshot (TASK-1239) o al status reader (TASK-1245).
- Variants `clientPortal`/`attachment`/`adminPreview` (no se tocan).

## Detailed Spec

El endpoint ya resuelve el snapshot inmutable por token (`readPublicGraderReport`) y serializa el `PublicGraderReport`. El delta es **una línea de derivación** + dos campos en la respuesta:

```ts
const model = modelFromPublicReport(snapshot.publicReport, 'publicWeb')
const reportDate = formatReportDate(snapshot.asOf)
return NextResponse.json({
  report: snapshot.publicReport,                 // back-compat (DTO crudo público-safe)
  model,                                          // nuevo: render-ready (incluye engineSnapshot público)
  modelVersion: GROWTH_AI_VISIBILITY_PUBLIC_REPORT_MODEL_VERSION, // nuevo
  header: {                                       // nuevo: masthead render-ready
    organizationName: snapshot.brandName,         // resuelto por runId (público: marca declarada)
    reportDate,
    periodLabel: `Diagnóstico al ${reportDate}`   // copy canónico (mismo que el email)
  },
  asOf: snapshot.asOf,
  expiresAt: snapshot.expiresAt
})
```

`efeonce-web` (server-side, Astro SSR) hace `fetch` del endpoint por token, lee `model` + `header` y lo pinta con su stack (Tailwind + blend AXIS). El `report` crudo queda por compatibilidad y para consumers que quieran el DTO. El no-leak está garantizado **por construcción de tipo**: `publicWeb` deriva del `PublicGraderReport`, que estructuralmente no tiene `providerFindings`/`accuracyFindings`/raw provider text. `engineSnapshot` (conteos de visibilidad por motor) SÍ va en el payload — es el headline público del lead magnet (TASK-1252), no un leak.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (exponer modelo) → Slice 2 (test de contrato). El test del Slice 2 valida el contrato que el Slice 1 expone; no se cierra la task sin él.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El payload público filtra internals (`providerFindings`/`accuracyFindings`/raw) por usar el variant equivocado | data quality / privacy | low | usar estrictamente `modelFromPublicReport(..., 'publicWeb')` (input = `PublicGraderReport`, tipo sin esos campos) + test de contrato no-leak (Slice 2) | test rojo / revisión de payload |
| Alguien "arregla" un falso leak quitando `engineSnapshot` del payload público y mata el headline del lead magnet | product / regresión | med | doc + test de presencia (Slice 2 punto 4): `engineSnapshot` es público por diseño (TASK-1252); nunca removerlo | masthead/"visibilidad por motor" vacío en efeonce-web |
| El builder arrastra React al bundle del route handler (server-only break) | build / runtime | low | ya es TS puro (sin React/`server-only`/MUI); sólo confirmar build verde del route | `pnpm build` rojo en el route |
| Consumer existente del DTO crudo se rompe | api compat | low | cambio aditivo (campos previos intactos); back-compat verificado | typecheck / consumers existentes |

### Feature flags / cutover

- Sin flag — cambio aditivo de serialización, immediate cutover. (Opción de graduar con `?format=model` si se prefiere; default back-compat.)

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR + redeploy | <5 min | si |
| Slice 2 | revert PR (test additive) | <5 min | si |

### Production verification sequence

1. Deploy con el cambio aditivo.
2. `fetch` del endpoint con un `reportToken` real en estado `ready` → confirmar `model` poblado + `modelVersion` + `report` intacto.
3. Inspección del payload: ausencia de `engineSnapshot`/internals.

### Out-of-band coordination required

- N/A — repo-only change. La task hermana de `efeonce-web` se alinea por `modelVersion`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `GET /api/public/growth/ai-visibility/report/[token]` devuelve `model` (variant `publicWeb`) + `modelVersion` + `header`, manteniendo `report`/`asOf`/`expiresAt` (back-compat). — `route.ts`
- [x] El `model` se construye con `modelFromPublicReport(..., 'publicWeb')` — el endpoint no recomputa ni reimplementa la derivación; el `header` reutiliza la primitive canónica (`buildReportHeader`, SSOT compartido con email/operador).
- [x] El payload público **no** contiene `providerFindings`, `accuracyFindings`, texto crudo de providers, prompts, citation URLs, reasons internos ni recommendation `priority` (test de contrato no-leak verde — `route-contract.test.ts`).
- [x] El payload público **sí** incluye `engineSnapshot`/`providerPresence` (headline público) y `header` con `organizationName`/`reportDate`/`periodLabel` no vacíos.
- [x] `modelVersion` está definido como constante estable server-safe en `src/lib/growth/ai-visibility/report/contracts.ts` (`GROWTH_AI_VISIBILITY_PUBLIC_REPORT_MODEL_VERSION = '1.0.0'`) y presente en el payload.
- [x] El builder es server-importable sin arrastrar React al bundle del route handler (`pnpm build` verde) — sin extraer builder nuevo (ya era puro).
- [x] Docstring stale de `ProviderPresence` en `contracts.ts` y el ADR corregidos para reflejar que `engineSnapshot` es público-safe (TASK-1252).

## Verification

- ✅ `pnpm local:check` (lint + tsc) verde.
- ✅ `pnpm test` (full) 8630 passed / 0 failed.
- ✅ `pnpm build` (Turbopack) exit 0 — route importa el builder sin arrastrar React.
- ✅ `pnpm pg:doctor` healthy.
- ⏳ Fetch real del endpoint contra un snapshot `ready` (staging) → pendiente de deploy (local-first, sin push). Cambio aditivo sin flag/migración: funciona al desplegar.

## Closing Protocol

- [x] `Lifecycle` del markdown sincronizado (`in-progress` → `complete`)
- [x] el archivo vive en la carpeta correcta (`complete/`)
- [x] `docs/tasks/README.md` sincronizado (In Progress → Complete)
- [x] `Handoff.md` actualizado
- [x] `changelog.md` actualizado
- [x] chequeo de impacto cruzado (TASK-1246 + TASK-1241)
- [x] Delta en el ADR `GREENHOUSE_PUBLIC_REPORT_HEADLESS_RENDER_DECISION_V1.md`: OQ#1 resuelta + hard rules/framing recalibrados (engineSnapshot público + header) + Delta 2026-07-01.
- [x] Docstring stale de `ProviderPresence` en `contracts.ts` corregido.

## Follow-ups

- Task hermana en `efeoncepro/efeonce-web`: render del informe (Tailwind + blend AXIS) + form del grader + pantalla de status + wiring GTM, en `think.efeoncepro.com`.
- Capa de tokens compartida (blend AXIS + marca pública) en `efeonce-web`, reusable por todos los lead magnets del hub.

## Open Questions

1. **Forma de exponer:** `model` en el payload por defecto (recomendado, back-compat) vs `?format=model` vs endpoint `/model` paralelo. Resolver en Discovery según consumers actuales del DTO crudo. (Hoy el único consumer real del DTO crudo es efeonce-web —aún no construido— + los paths internos de email/operator que usan el builder directo, no el endpoint; el default aditivo es seguro.)
2. **`header` en el payload vs dentro del `model`:** ✅ **RESUELTO (2026-07-01): top-level `header`.** Se expone como campo hermano de `model`/`report`, no plegado dentro del `ReportArtifactModel`. Razón: el modelo lo consumen idéntico email/PDF/portal cliente; plegar `header` adentro cambiaría su shape para todos. Como campo aparte no toca ningún consumer existente y efeonce-web lee dos campos en vez de uno (menor blast-radius).
3. **Exposición de `engineSnapshot` (arch pillar Safety):** ✅ **RESUELTO (2026-07-01): público por diseño, sin gate.** Los conteos de presencia por motor son hechos observables sobre una marca pública, pedidos y autorizados por el propio usuario sobre su propia marca, servidos por token no-enumerable → **no hay superficie de privacidad**. El boundary del código (TASK-1252 + tests) es correcto: conteos = público (headline del lead magnet), narrativa cruda `providerFindings` + `accuracyFindings` (YMYL/reputacional) = internal-only. No requiere confirmación del operador.
4. **Re-home del builder a `src/lib/**` (diferido):** `model.ts` es el contrato SSOT gobernado pero vive bajo `src/components/**` por historia (TASK-1252). Funciona server-importable tal cual; una limpieza de layering (mover el modelo puro a `src/lib/growth/ai-visibility/report/`) es deseable pero fuera de scope de esta task — abrir follow-up si molesta.
