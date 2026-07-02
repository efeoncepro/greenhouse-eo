# TASK-1300 — Growth SEO: DataForSEO Family Registry

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-022`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|integrations|ai`
- Blocked by: `none`
- Branch: `task/TASK-1300-growth-seo-dataforseo-family-registry`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Amplía el cliente DataForSEO canónico `src/lib/ai/dataforseo.ts` — que hoy hard-codea `normalizeEndpoint()` a `/v3/serp/` y lanza para cualquier otro endpoint — a un **registry declarativo de familias** (allowlist cerrado de 5: `serp`, `labs`, `backlinks`, `onpage`, `domain`). Un solo cliente con **familias como config** (no un cliente por familia): transporte compartido + gate de familia + instrumentación por familia. Agrega `postDataForSeoTask({ family, endpoint, tasks })` genérico, preservando `postDataForSeoSerpLiveAdvanced` intacto (backward compat AEO). Suma **circuit breaker por familia** + **cost-tracking por familia** (persiste `provider_cost` por call e incrementa un contador event-sourced `seo_provider_spend_daily` per-org para el quota enforcement de TASK-1301) + honest degradation. Es infra de cliente, no capability. Bloquea todo lo provider-facing del módulo SEO (rank capture, site audit, backlinks).

## Why This Task Exists

El módulo SEO (EPIC-022) necesita pegarle a 4 familias de DataForSEO que hoy el cliente candado rechaza: Labs (keyword research, ranked keywords, competitors), OnPage (site audit), Backlinks (perfil de enlaces) y Domain Analytics — además del `serp` que el AEO ya usa. La solución robusta no es duplicar el cliente por familia (drift de auth/cost/retry) ni abrir `normalizeEndpoint` a un prefijo libre suministrado por el caller (amplía el candado = riesgo de seguridad, `EPIC-022 §13.3`). Es parametrizar el cliente a un **allowlist cerrado y nombrado**, con instrumentación por familia para que (a) un Backlinks roto no hunda el cron de rank tracking, (b) el gasto DataForSEO — riesgo #1 de escalabilidad del módulo (`EPIC-022 §13.1`) — sea observable y presupuestable por-org, y (c) el secreto compartido con el AEO quede aislado por breakers/budgets por familia (`EPIC-022 §13.4`). Esta task fija esa infra antes de que 1303/1304 escriban cualquier cron de captura.

## Goal

- `normalizeEndpoint(endpoint, family)` table-driven contra un registry `DATAFORSEO_FAMILIES` (5 familias, allowlist cerrado), reemplazando el hard-code `/v3/serp/`.
- `postDataForSeoTask({ family, endpoint, tasks })` genérico sobre el transporte compartido, con `postDataForSeoSerpLiveAdvanced` reusándolo sin cambio de contrato observable (AEO no se rompe).
- Circuit breaker **por familia** (un fallo persistente de una familia abre solo esa familia) + cost-tracking **por familia** (`provider_cost` por call + contador `seo_provider_spend_daily` per-org event-sourced).
- Honest degradation: distinguir "call ejecutó y devolvió 0 tasks" de "call falló"; nunca fabricar resultado.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` — §6 (DataForSEO governance: registry de familias, un cliente familias como config, breaker por familia, cost por familia, honest degradation, OnPage task-based async) + §13 (riesgos: costo #1, ampliar el candado, secreto compartido).
- `docs/architecture/agent-invariants/INTEGRATIONS_INFRA_AGENT_INVARIANTS.md` — patrón adapter/port para providers externos, `captureWithDomain` en vez de `Sentry.captureException` directo.
- CLAUDE.md §"AI image generation + LLM providers" — no crear un cliente/SDK paralelo dentro de un módulo de dominio; extender el cliente canónico de `src/lib/ai/`.
- `EPIC-022 §1.2` — reusar el cliente DataForSEO, nunca forkear.

Reglas obligatorias:

- **Allowlist cerrado, nunca prefijo libre.** Las 5 familias son un enum nombrado en el registry. `normalizeEndpoint` valida `endpoint` contra el prefijo de la familia declarada; **NUNCA** aceptar un prefijo arbitrario suministrado por el caller (amplía el candado — `EPIC-022 §13.3`).
- **Un cliente, familias como config.** No crear un archivo/cliente por familia. Transporte + auth + resolveSecret compartidos; la familia es un parámetro que selecciona prefijo + breaker + bucket de costo.
- **Aislamiento por familia.** Breaker y budget se llevan por familia para que SERP-AI (AEO) quede aislado de Labs/OnPage/Backlinks/Domain (SEO) aunque compartan credenciales (`EPIC-022 §13.4`).
- **Backward compat AEO.** `postDataForSeoSerpLiveAdvanced` + `runDataForSeoGoogleAiModeSerp` conservan su firma y comportamiento observable; el AEO no debe cambiar.
- **Honest degradation.** Un call que ejecutó y devolvió `tasks: []` (`ok: true`) ≠ uno que falló (`ok: false`). Nunca fabricar tasks ni costo.
- **Observabilidad canónica.** Errores del cliente vía `captureWithDomain(err, 'integrations'...)`, NUNCA `Sentry.captureException` directo (regla infra).

## Normative Docs

- `src/lib/ai/dataforseo.ts` — cliente actual (candado `/v3/serp/` en `normalizeEndpoint` línea ~66; `postDataForSeoSerpLiveAdvanced` línea ~82) [archivo a ampliar].
- `src/lib/secrets/secret-manager.ts` — `resolveSecret` (auth ya resuelta por el cliente, no tocar el patrón).
- `src/lib/observability/capture.ts` — `captureWithDomain` [patrón de error].
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md §6` — costos DataForSEO verificados (Labs ~$0.0001/item + ~$0.01/task; OnPage crawl $0.000125/pág, JS $0.00125, Lighthouse $0.00425; Backlinks $0.02/req + $0.00003/fila).
- `migrations/20260628203847129_task-1282-search-console-connections.sql` — patrón additive del dominio growth (marker + DO-block + GRANTs) [referencia para la tabla de cost-tracking].

## Dependencies & Impact

### Depends on

- `src/lib/ai/dataforseo.ts` existente (cliente + `resolveDataForSeoCredentials` + `readCost`).
- Schema `greenhouse_growth` existente (para `seo_provider_spend_daily`) [creado por TASK-1226; la tabla de spend la crea esta task].

### Blocks / Impacts

- Bloquea `TASK-1303` (rank capture usa `postDataForSeoTask` familia `serp`/`labs`), `TASK-1304` (site audit familia `onpage` + backlinks familia `backlinks`).
- Habilita el quota enforcement de `TASK-1301` (`enforceSeoRunEntitlement` lee el contador `seo_provider_spend_daily`).
- Impacta el AEO existente solo por reuso del transporte compartido — sin cambio de contrato (verificar con test de no-regresión).

### Files owned

- `src/lib/ai/dataforseo.ts` [modificado — registry + `postDataForSeoTask` + breaker + cost hook]
- `src/lib/ai/dataforseo-families.ts` [nuevo — registry `DATAFORSEO_FAMILIES` + tipos] [verificar si se prefiere inline en `dataforseo.ts`]
- `src/lib/ai/__tests__/dataforseo-families.test.ts` [nuevo]
- `src/lib/growth/seo/provider-spend.ts` [nuevo — writer del contador event-sourced] [verificar path bajo `src/lib/growth/seo/`]
- `migrations/<ts>_task-1300-seo-provider-spend-daily.sql` [nuevo — tabla de cost-tracking]
- `src/types/db.d.ts` [regenerado — additive]

## Current Repo State

### Already exists

- Cliente DataForSEO canónico `src/lib/ai/dataforseo.ts` con Basic auth, `resolveSecret`, `readCost`, `postDataForSeoSerpLiveAdvanced` y helper `runDataForSeoGoogleAiModeSerp` (consumidos por el AEO grader).
- `normalizeEndpoint` con candado hard-code a `/v3/serp/` (lanza para cualquier otro prefijo).
- Schema `greenhouse_growth` (dominio growth, convención append-only + FK a org canónica).

### Gap

- El cliente solo acepta `/v3/serp/` → imposible pegarle a Labs/OnPage/Backlinks/Domain.
- No hay breaker ni cost-tracking por familia → un provider roto puede cascadear y el gasto no es observable/presupuestable per-org.
- No existe tabla ni contador de spend per-org que el chokepoint de costo (TASK-1301) pueda leer.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: cliente DataForSEO `src/lib/ai/dataforseo.ts` (transporte + registry de familias) + nueva tabla `greenhouse_growth.seo_provider_spend_daily` (contador de gasto event-sourced per-org).
- Consumidores afectados: crons de captura SEO (TASK-1303/1304), chokepoint de costo (TASK-1301), AEO grader existente (reuso del transporte).
- Runtime target: `staging|production|worker` (el cliente corre en ops-worker para OnPage async y en route/cron para el resto).

### Contract surface

- Contrato existente a respetar: firma y comportamiento observable de `postDataForSeoSerpLiveAdvanced`, `runDataForSeoGoogleAiModeSerp`, `checkDataForSeoConnection`, `isDataForSeoConfigured` (AEO depende de ellos).
- Contrato nuevo o modificado: `DATAFORSEO_FAMILIES` (registry allowlist), `normalizeEndpoint(endpoint, family)` (firma nueva — pasa a table-driven), `postDataForSeoTask({ family, endpoint, tasks, timeoutMs? })` (helper genérico), breaker por familia, hook de cost-tracking + tabla `seo_provider_spend_daily`.
- Backward compatibility: `gated` para lo nuevo (familias SEO detrás del uso de 1303/1304); `compatible` para el AEO (el `serp` sigue funcionando idéntico; `postDataForSeoSerpLiveAdvanced` delega en el nuevo transporte con familia `serp`).
- Full API parity: `N/A — no capability` (es infra de cliente reusable, no una capability gobernada; los primitives que la consumen — commands de captura — nacen en 1303/1304 y ahí se aplica parity).

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.seo_provider_spend_daily` (nueva: `organization_id` FK, `family`, `spend_date` DATE, `call_count`, `provider_cost_usd`, `updated_at`; UNIQUE(`organization_id`, `family`, `spend_date`)).
- Invariantes que no se pueden romper:
  - Familia ∈ allowlist cerrado `{serp, labs, backlinks, onpage, domain}`; nunca un prefijo arbitrario del caller.
  - `normalizeEndpoint` solo acepta un `endpoint` cuyo prefijo coincida con el de la `family` declarada; en mismatch, lanza.
  - Un breaker abierto de una familia NO bloquea otra familia (aislamiento SERP-AI ↔ SEO).
  - Cost-tracking event-sourced: cada call con `cost != null` incrementa `call_count` + acumula `provider_cost_usd` en la fila del día (UPSERT idempotente por UNIQUE); nunca sobrescribe con un total recalculado (append semantics).
  - Honest degradation: `ok: false` en fallo real; nunca fabricar `tasks`/`cost`.
- Tenant/space boundary: el contador es per-org; `organization_id` se pasa explícito por el caller (cron/command), derivado server-side del target SEO. El cliente de transporte es org-agnóstico (recibe el `organization_id` solo para el cost hook cuando aplica).
- Idempotency/concurrency: UPSERT del spend por `ON CONFLICT (organization_id, family, spend_date)` con incrementos atómicos (`call_count = call_count + 1`, `provider_cost_usd = provider_cost_usd + EXCLUDED`). El breaker es in-memory por proceso (best-effort; el budget persistido es la defensa dura).
- Audit/outbox/history: el contador diario ES el ledger de gasto (event-sourced, append-per-day). Sin outbox en esta task (el mirror BQ del gasto, si aplica, lo decide 1303).

### Migration, backfill and rollout

- Migration posture: `additive` (1 tabla `seo_provider_spend_daily` + índices + GRANTs; marker + DO-block).
- Default state: `read-only`/`disabled` — el registry existe pero las familias SEO no se ejercen hasta que 1303/1304 llamen `postDataForSeoTask`; el AEO sigue en `serp`. Gate de feature: `GROWTH_SEO_ENABLED` (default OFF) en los consumers, no en el cliente.
- Backfill plan: N/A (contador nace vacío; sin datos legacy de gasto SEO).
- Rollback path: revert PR (restaura `normalizeEndpoint` hard-code) + reverse migration (DROP `seo_provider_spend_daily`, sin filas prod). El AEO no depende de lo nuevo, así que el revert es seguro.
- External coordination: ninguna nueva — reusa `DATAFORSEO_API_LOGIN` + `DATAFORSEO_API_PASSWORD`/`_SECRET_REF` ya provisionados. Verificar que la cuenta DataForSEO tenga habilitadas las familias Labs/OnPage/Backlinks/Domain [verificar plan de la cuenta].

### Security and access

- Auth/access gate: N/A a nivel cliente de transporte (auth Basic ya resuelta por `resolveDataForSeoCredentials`). El gate de acceso de negocio (quién puede disparar un run) vive en las capabilities de TASK-1301.
- Sensitive data posture: sin PII. El único secreto es la password DataForSEO, ya resuelta vía `resolveSecret` (nunca hard-code, nunca loggear). No exponer el endpoint crudo con auth en logs.
- Error contract: fallo de call → `ok: false` + `captureWithDomain(err, 'integrations', { extra: { family, endpoint } })`; nunca `Sentry.captureException` directo ni prosa cruda al caller.
- Abuse/rate-limit posture: circuit breaker por familia (abre tras N fallos consecutivos, half-open con backoff) + el contador de gasto que alimenta el quota cap de 1301. El cap duro de costo per-org lo aplica `enforceSeoRunEntitlement` (TASK-1301) leyendo este contador.

### Runtime evidence

- Local checks: `pnpm typecheck` + `pnpm lint` + `pnpm test src/lib/ai` verdes; test de no-regresión AEO (el `serp` sigue idéntico).
- DB/runtime checks: `pnpm migrate:up` + SELECT contra `information_schema` de que `seo_provider_spend_daily` + UNIQUE + GRANTs existen; smoke del UPSERT de spend (dos calls de la misma org/familia/día incrementan `call_count`).
- Integration checks: smoke real por familia contra DataForSEO (una call barata por familia — p. ej. Labs `search_volume` de 1 keyword) confirmando `normalizeEndpoint` acepta el prefijo correcto y rechaza el mismatch; verificar el `provider_cost` retornado.
- Reliability signals/logs: N/A en esta task (el signal `seo.provider.cost_over_budget` lo materializa 1303 leyendo el contador; acá solo se persiste el dato).
- Production verification sequence: ver §Production verification sequence.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

`N/A — no capability`. Esta task es **infra de cliente de integración** (transporte DataForSEO parametrizado por familia + tabla de cost-tracking). No introduce ni modifica una capability de negocio: no gatea una acción, no muta estado de dominio, no expone una superficie operable. Los primitives gobernados que la consumen — los commands de captura de rank/audit/backlinks (`TASK-1303`/`TASK-1304`) y el chokepoint de costo (`TASK-1301`) — nacen con su contrato de capability y su parity ahí. Deuda declarada: el cliente y el contador de spend no son operables por ningún consumer de negocio hasta que esas tasks aterricen; se secuencian en EPIC-022.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Family registry + `normalizeEndpoint` parametrizado + `postDataForSeoTask`

- Definir `DATAFORSEO_FAMILIES` (registry declarativo): `serp` `/v3/serp/`, `labs` `/v3/dataforseo_labs/`, `backlinks` `/v3/backlinks/`, `onpage` `/v3/on_page/`, `domain` `/v3/domain_analytics/`. Tipo `DataForSeoFamily` derivado de las keys.
- Reescribir `normalizeEndpoint(endpoint, family)` a table-driven: valida que `endpoint` empiece con el prefijo de `family`; lanza si mismatch o familia desconocida. NUNCA prefijo libre del caller.
- Agregar `postDataForSeoTask({ family, endpoint, tasks, timeoutMs? })` genérico sobre el transporte compartido (extraer el fetch+auth actual de `postDataForSeoSerpLiveAdvanced` a un helper interno reutilizable).
- Reimplementar `postDataForSeoSerpLiveAdvanced` como delegación a `postDataForSeoTask({ family: 'serp', ... })` sin cambiar su firma ni su shape de retorno. Test de no-regresión AEO.
- Tests: allowlist (cada familia acepta su prefijo, rechaza el ajeno), mismatch lanza, `serp` backward-compat.

### Slice 2 — Breaker + cost-tracking por familia + honest degradation

- Circuit breaker in-memory **por familia** (estado `closed|open|half-open`, umbral de fallos consecutivos + cooldown). Un breaker abierto de una familia deja pasar las demás. `postDataForSeoTask` consulta el breaker antes de llamar y lo actualiza según el resultado.
- Migración additive `seo_provider_spend_daily` (org FK, family, spend_date DATE, call_count, provider_cost_usd, updated_at; UNIQUE de idempotencia) + marker + DO-block + GRANTs. Regenerar `db.d.ts`.
- Writer `recordSeoProviderSpend({ organizationId, family, cost })` con UPSERT idempotente por `(organization_id, family, spend_date)` (incrementos atómicos). `postDataForSeoTask` lo invoca tras un call exitoso con `cost != null` cuando el caller pasa `organizationId`.
- Honest degradation explícita: mapear fallo de call/breaker abierto a `ok: false` sin fabricar `tasks`/`cost`; `captureWithDomain(err, 'integrations', ...)`.
- Tests: breaker aísla familias, UPSERT incrementa, degradación no fabrica.

## Out of Scope

- Schema de snapshots/config SEO (`seo_targets`, `seo_rank_snapshots`, etc.) — TASK-1299.
- Capabilities `growth.seo.*` + `enforceSeoRunEntitlement` + quota cap enforcement — TASK-1301 (esta task solo PERSISTE el contador que el chokepoint lee).
- Crons de captura, readers, reactive BQ mirror, reliability signals — TASK-1303/1304.
- Cualquier UI — TASK-1306–1310.
- Cambiar el flujo del AEO grader (solo se preserva su contrato por reuso del transporte).

## Detailed Spec

Ver el contrato canónico en `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md §6`. Decisiones duras: **un cliente, familias como config** (transporte + auth compartidos; la familia selecciona prefijo + breaker + bucket de costo). El allowlist es **cerrado y nombrado** (5 familias) — `normalizeEndpoint(endpoint, family)` valida el prefijo contra la familia declarada y NUNCA acepta un prefijo arbitrario del caller (mitiga "ampliar el candado", §13.3). El **breaker por familia** aísla SERP-AI (AEO) de Labs/OnPage/Backlinks/Domain (SEO) aunque compartan credenciales (§13.4). El **cost-tracking por familia** persiste `provider_cost` por call e incrementa `seo_provider_spend_daily` per-org (event-sourced, UPSERT idempotente por día) — es el dato que `enforceSeoRunEntitlement` (TASK-1301) consume como gate de costo (§13.1, riesgo #1). **Honest degradation:** un call que ejecutó y devolvió 0 tasks (`ok: true`) es distinto de uno que falló (`ok: false`); nunca fabricar snapshot/costo (§6). OnPage es task-based async (POST crea task, se poll-ea) → su orquestación vive en ops-worker (TASK-1304), no en un route handler; esta task solo provee el transporte de la familia `onpage`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (registry + `postDataForSeoTask` + preservación AEO) puede shippear independiente y es el prerequisito de todo. Slice 2 (breaker + cost-tracking + migración) construye encima. Orden estricto Slice 1 → Slice 2. La migración de `seo_provider_spend_daily` va en Slice 2 (el registry no la necesita).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Refactor de `normalizeEndpoint`/transporte rompe el AEO (serp) | growth/AEO | medium | delegación `postDataForSeoSerpLiveAdvanced → postDataForSeoTask({family:'serp'})` sin cambio de firma + test de no-regresión AEO obligatorio | `pnpm test` AEO rojo |
| Ampliar el candado (prefijo libre del caller) | seguridad | medium | allowlist cerrado de 5 familias nombradas; `normalizeEndpoint` valida prefijo vs familia declarada; nunca acepta string arbitrario | code review + test de mismatch |
| Secreto compartido: un provider roto cascadea al AEO | seguridad/resiliencia | medium | circuit breaker POR familia + budget por familia; breaker abierto de una familia no toca otra | breaker abierto observable en logs |
| Costo DataForSEO se dispara sin visibilidad (riesgo #1) | growth ($) | high | cost-tracking por familia en `seo_provider_spend_daily`; alimenta el quota cap de 1301; consumers gateados por `GROWTH_SEO_ENABLED` OFF | contador de spend + signal `seo.provider.cost_over_budget` (1303) |
| Marker invertido → tabla nunca creada | data | medium | marker `-- Up Migration` exacto + DO-block RAISE EXCEPTION | migración falla loud |
| UPSERT de spend con race sobrescribe en vez de acumular | data | low | incrementos atómicos `call_count = call_count + 1` en el `ON CONFLICT`, no total recalculado | smoke de doble-call |

### Feature flags / cutover

- El cliente ampliado no tiene flag propio (infra). Las familias SEO se ejercen solo cuando 1303/1304 lo llamen, y esos consumers están detrás de `GROWTH_SEO_ENABLED` (default OFF) + fila en `FEATURE_FLAG_STATE_LEDGER.md`. El AEO (`serp`) sigue vivo sin flag.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (restaura `normalizeEndpoint` hard-code + `postDataForSeoSerpLiveAdvanced` original) | <10 min | si (AEO no depende de lo nuevo) |
| Slice 2 | revert PR + reverse migration (DROP `seo_provider_spend_daily`, sin filas prod) | <10 min | si |

### Production verification sequence

1. `pnpm migrate:up` en staging → DO-block confirma `seo_provider_spend_daily` + UNIQUE + GRANTs.
2. Smoke AEO de no-regresión: correr un `runDataForSeoGoogleAiModeSerp` real y confirmar shape idéntico (family `serp` sigue funcionando).
3. Smoke por familia: una call barata a Labs (`/v3/dataforseo_labs/...`) vía `postDataForSeoTask({family:'labs', ...})` → confirmar 200 + `provider_cost` capturado + fila incrementada en `seo_provider_spend_daily`.
4. Verificar mismatch: `postDataForSeoTask({family:'labs', endpoint:'/v3/serp/...'})` lanza (candado por familia sostiene).
5. Prod vía release control plane (additive) cuando el módulo se secuencie; el AEO no requiere coordinación out-of-band.

### Out-of-band coordination required

- Confirmar que la cuenta DataForSEO tiene habilitadas las 4 familias nuevas (Labs/OnPage/Backlinks/Domain) [verificar plan de la cuenta con el operador]. Sin eso, los smokes por familia fallarán con 402/403 del provider — no es un bug del cliente.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `DATAFORSEO_FAMILIES` define las 5 familias (`serp`, `labs`, `backlinks`, `onpage`, `domain`) como allowlist cerrado; `normalizeEndpoint(endpoint, family)` es table-driven y rechaza prefijo ajeno a la familia + familia desconocida.
- [ ] `postDataForSeoTask({ family, endpoint, tasks })` genérico existe sobre el transporte compartido; NO hay un cliente por familia.
- [ ] `postDataForSeoSerpLiveAdvanced` conserva firma y shape de retorno; el AEO (`runDataForSeoGoogleAiModeSerp`) pasa un test de no-regresión.
- [ ] `normalizeEndpoint` NUNCA acepta un prefijo arbitrario del caller (test de mismatch verde).
- [ ] Circuit breaker por familia: un breaker abierto de una familia deja pasar las demás (test de aislamiento verde).
- [ ] Cost-tracking por familia: cada call exitoso con `cost != null` persiste en `seo_provider_spend_daily` vía UPSERT idempotente por `(organization_id, family, spend_date)` con incrementos atómicos.
- [ ] Honest degradation: fallo real → `ok: false` sin fabricar `tasks`/`cost`; error vía `captureWithDomain`, no `Sentry.captureException` directo.
- [ ] Migración additive con marker `-- Up Migration` + DO-block; Down solo DROP; GRANT read/write a `greenhouse_runtime`, ownership `greenhouse_ops`.
- [ ] `db.d.ts` regenerado; `pnpm typecheck` + `pnpm lint` + `pnpm test src/lib/ai` verdes.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` (incluye test de no-regresión AEO + tests de familias/breaker/cost)
- `pnpm migrate:up` en staging + verificación SQL contra `information_schema`/`pg_constraint` (`seo_provider_spend_daily` + UNIQUE + GRANTs) + smoke del UPSERT.
- Smoke real por familia contra DataForSEO (Labs barato) confirmando prefijo aceptado + `provider_cost` capturado.

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (TASK-1301 lee el contador `seo_provider_spend_daily`; TASK-1303/1304 consumen `postDataForSeoTask`)
- [ ] documentación técnica (arquitectura del dominio SEO §6 refleja la implementación real del registry/breaker/cost)

## Follow-ups

- `TASK-1301` — `enforceSeoRunEntitlement` con quota cap por-org que lee `seo_provider_spend_daily`.
- `TASK-1303` — rank capture command usa `postDataForSeoTask` (familia `serp`/`labs`) + materializa el signal `seo.provider.cost_over_budget`.
- `TASK-1304` — site audit (familia `onpage`, task-based async en ops-worker) + backlinks (familia `backlinks`).
- Evaluar si el breaker debe persistir su estado (hoy in-memory por proceso) cuando el volumen de crons lo justifique.

## Open Questions

1. ¿El registry `DATAFORSEO_FAMILIES` vive inline en `dataforseo.ts` o en un módulo aparte `dataforseo-families.ts`? Propuesta: módulo aparte para reuso limpio por consumers; confirmar en Discovery.
2. ¿El writer del contador vive en `src/lib/growth/seo/provider-spend.ts` o en `src/lib/ai/`? Propuesta: `src/lib/growth/seo/` (es dato de dominio growth, no del cliente genérico) y el cliente lo invoca vía callback/hook opcional. [verificar]
3. ¿La cuenta DataForSEO tiene habilitadas Labs/OnPage/Backlinks/Domain hoy? Resolver con el operador antes del smoke por familia.
