# TASK-1280 — Growth AI Visibility: Public Report Model Contract (headless render unblocker)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
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

- El endpoint público del informe entrega el `ReportArtifactModel` (variant `publicWeb`) ya construido, además del DTO crudo (back-compat).
- El payload lleva un `modelVersion` estable para que Greenhouse y `efeonce-web` evolucionen seguro.
- Un test de contrato garantiza que el payload público **nunca** incluye campos internos (`engineSnapshot`, raw provider text, hallazgos privados): no-leak por construcción server-side.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_REPORT_HEADLESS_RENDER_DECISION_V1.md` — ADR raíz de esta task (contrato headless, no-leak server-side, fetch server-side, versionado).
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — §13 privacy/security, §snapshot público (TASK-1239).
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — el modelo es el contrato; UI/Nexa/efeonce-web son consumers.

Reglas obligatorias:

- **NUNCA** exponer en el payload público campos internos: `engineSnapshot`, texto crudo de providers, hallazgos privados, internals de scoring. El contrato es estrictamente el modelo `publicWeb` (que ya excluye `engineSnapshot` — sólo vive en `adminPreview`).
- **Aditivo y back-compat:** el shape actual (`{ report, asOf, expiresAt }`) se mantiene; se agrega `model` + `modelVersion`. No romper consumers existentes del DTO crudo.
- **Builder = SSOT único:** la derivación vive sólo en `modelFromPublicReport`; el endpoint no recomputa ni reimplementa la lógica. `efeonce-web` consume, no deriva.
- **Server-importable:** asegurar que `report-artifact/model.ts` (el builder) es TS puro server-importable; si arrastra dependencias de componente/React al bundle del route handler, extraer el builder puro.

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

- `src/app/api/public/growth/ai-visibility/report/[token]/route.ts` [modificar]
- `src/components/growth/ai-visibility/report-artifact/model.ts` [posible: exportar `modelVersion` / verificar pureza server-side]
- `src/components/growth/ai-visibility/report-artifact/__tests__/report-artifact-no-leak.test.tsx` [extender, o test nuevo de contrato del endpoint]

## Current Repo State

### Already exists

- Endpoint público del informe `GET /api/public/growth/ai-visibility/report/[token]` que resuelve el snapshot inmutable por token y devuelve `{ report: PublicGraderReport, asOf, expiresAt }` (TASK-1239).
- `ReportArtifactModel` + builder `modelFromPublicReport(publicReport, 'publicWeb')` en `src/components/growth/ai-visibility/report-artifact/model.ts` (TASK-1252).
- Variant `publicWeb` ya excluye `engineSnapshot` (sólo en `adminPreview`) + tests no-leak existentes (`report-artifact-no-leak.test`).
- Status reader público (`run/[handle]`, TASK-1245) y snapshot público inmutable (`report/snapshot.ts`).

### Gap

- El endpoint entrega el DTO crudo `PublicGraderReport`, no el modelo render-ready → un consumer (efeonce-web) tendría que re-derivar la lógica del builder (drift).
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
- Contrato nuevo o modificado: el mismo endpoint suma `model: ReportArtifactModel (publicWeb)` + `modelVersion: string` al payload.
- Backward compatibility: `compatible` (aditivo; los campos previos quedan intactos).
- Full API parity: el modelo es el contrato gobernado; `efeonce-web`/Nexa/MCP renderizan/operan el MISMO modelo, sin lógica paralela. Un primitive (`modelFromPublicReport`), muchos consumers.

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna (sin cambio de schema; serializa un modelo derivado de un snapshot ya persistido).
- Invariantes que no se pueden romper:
  - El payload `publicWeb` NUNCA incluye `engineSnapshot`, texto crudo de providers ni hallazgos internos de exactitud.
  - El `modelVersion` es estable; un breaking change del shape = bump de versión + render de `efeonce-web` adaptado en el mismo ciclo.
  - El endpoint NO recomputa scoring ni re-deriva el modelo: usa `modelFromPublicReport` tal cual.
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
- Sensitive data posture: `no sensitive data` en el payload `publicWeb` (no-leak por construcción); el riesgo es exposición accidental de internals → cubierto por el test de contrato.
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

### Slice 1 — Exponer el modelo render-ready + modelVersion

- Definir una constante `GROWTH_AI_VISIBILITY_PUBLIC_REPORT_MODEL_VERSION` (semver del contrato, p. ej. `1.0.0`) en un módulo server-importable (junto al builder o en `contracts.ts`).
- Extender el route handler para construir `modelFromPublicReport(snapshot.publicReport, 'publicWeb')` y devolver `{ report, model, modelVersion, asOf, expiresAt }` (back-compat: `report`/`asOf`/`expiresAt` intactos).
- Verificar que el builder es TS puro server-importable; si arrastra deps de componente, extraer el builder puro a un módulo sin React.

### Slice 2 — Test de contrato no-leak + shape

- Test que arma un snapshot público de fixture, llama el handler (o el builder + serializer) y asegura: (1) `model.variant === 'publicWeb'`, (2) `modelVersion` presente y estable, (3) el JSON serializado **no** contiene `engineSnapshot` ni claves de internals/raw provider text, (4) shape del modelo estable (snapshot test tolerante a campos opcionales).

## Out of Scope

- El render del informe en `efeonce-web` (Tailwind + blend AXIS), el form, la pantalla de status y el wiring GTM — task hermana en el repo `efeonce-web`.
- El setup del subdominio `think.efeoncepro.com` / DNS / Vercel multi-dominio.
- Cualquier cambio al scoring, a las dimensiones, al snapshot (TASK-1239) o al status reader (TASK-1245).
- Variants `clientPortal`/`attachment`/`adminPreview` (no se tocan).

## Detailed Spec

El endpoint ya resuelve el snapshot inmutable por token (`readPublicGraderReport`) y serializa el `PublicGraderReport`. El delta es **una línea de derivación** + dos campos en la respuesta:

```ts
const model = modelFromPublicReport(snapshot.publicReport, 'publicWeb')
return NextResponse.json({
  report: snapshot.publicReport,                 // back-compat
  model,                                          // nuevo: render-ready
  modelVersion: GROWTH_AI_VISIBILITY_PUBLIC_REPORT_MODEL_VERSION, // nuevo
  asOf: snapshot.asOf,
  expiresAt: snapshot.expiresAt
})
```

`efeonce-web` (server-side, Astro SSR) hace `fetch` del endpoint por token, lee `model` y lo pinta con su stack (Tailwind + blend AXIS). El `report` crudo queda por compatibilidad y para consumers que quieran el DTO. El no-leak está garantizado porque `publicWeb` se deriva del `PublicGraderReport` (ya público-safe) y excluye `engineSnapshot`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (exponer modelo) → Slice 2 (test de contrato). El test del Slice 2 valida el contrato que el Slice 1 expone; no se cierra la task sin él.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El payload público filtra internals (`engineSnapshot`/raw) por usar el variant equivocado | data quality / privacy | low | usar estrictamente `modelFromPublicReport(..., 'publicWeb')` + test de contrato no-leak (Slice 2) | test rojo / revisión de payload |
| El builder arrastra React al bundle del route handler (server-only break) | build / runtime | low | verificar pureza server-side; extraer builder puro si hace falta; build verde del route | `pnpm build` rojo en el route |
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

- [ ] `GET /api/public/growth/ai-visibility/report/[token]` devuelve `model` (variant `publicWeb`) + `modelVersion`, manteniendo `report`/`asOf`/`expiresAt` (back-compat).
- [ ] El `model` se construye con `modelFromPublicReport(..., 'publicWeb')` — el endpoint no recomputa ni reimplementa la derivación.
- [ ] El payload público **no** contiene `engineSnapshot`, texto crudo de providers ni internals (test de contrato no-leak verde).
- [ ] `modelVersion` está definido como constante estable server-importable y presente en el payload.
- [ ] El builder es server-importable sin arrastrar React al bundle del route handler (build verde).

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test` (test de contrato no-leak + focal del report-artifact)
- Fetch real del endpoint contra un snapshot `ready` (staging) → `model` + `modelVersion` + no-leak.

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado
- [ ] Delta en el ADR `GREENHOUSE_PUBLIC_REPORT_HEADLESS_RENDER_DECISION_V1.md` (open question #1 resuelta: forma de exponer el modelo)

## Follow-ups

- Task hermana en `efeoncepro/efeonce-web`: render del informe (Tailwind + blend AXIS) + form del grader + pantalla de status + wiring GTM, en `think.efeoncepro.com`.
- Capa de tokens compartida (blend AXIS + marca pública) en `efeonce-web`, reusable por todos los lead magnets del hub.

## Open Questions

1. **Forma de exponer:** `model` en el payload por defecto (recomendado, back-compat) vs `?format=model` vs endpoint `/model` paralelo. Resolver en Discovery según consumers actuales del DTO crudo.
