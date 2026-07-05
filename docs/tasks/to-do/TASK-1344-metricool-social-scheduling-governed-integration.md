# TASK-1344 — Metricool social scheduling — integración de repo gobernada (primitive + Secret Manager)

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
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `agency`
- Blocked by: `none`
- Branch: `task/TASK-1344-metricool-social-scheduling-governed-integration`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construir un primitive de repo gobernado `src/lib/social/metricool/*` que envuelve la **API de Metricool** (key en GCP Secret Manager vía `METRICOOL_API_KEY_SECRET_REF`), para que programar/leer social sea operable **server-side** (crons, portal, Nexa, agentes headless) y no solo desde el MCP interactivo en sesión. Sigue Full API Parity: readers canónicos + command de programación gateado por capability, con `propose → confirm → execute` para writes, flag default-OFF y errores sanitizados. Habilita a la skill `social-media-studio` como consumer programático real.

## Why This Task Exists

Hoy Metricool solo es operable a través del **MCP interactivo** dentro de una sesión de chat (verificado en vivo 2026-07-05: `getBrandSettings` + `getBestTimeToPostByNetwork` OK contra la cuenta real; 10 marcas conectadas, incluidas Efeonce Group y clientes Globe SKY/Sky Perú/Sky Colombia). Eso cubre la operación *humano-en-sesión*, pero:

- **No corre headless/programado**: un cron de "publicar la cola aprobada" o un flujo Nexa `propose→confirm→execute` no puede depender de un MCP que solo existe dentro del chat.
- **La API es más completa que el MCP**: subida de media, autolists y cobertura de redes que el MCP no expone.
- **No hay contrato gobernado**: sin primitive server-side, cualquier automatización sería un cliente ad-hoc acoplado, violando Full API Parity y sin authorization fina, idempotencia, audit ni errores canónicos.

La skill `social-media-studio` ya documenta el pipeline (`efeonce/STUDIO_TOOLING.md`) y usa el MCP como "mano de ejecución" en sesión; esta task le da la **mano programática** para automatización gobernada.

## Goal

- Secreto `metricool-api-key` publicado en Secret Manager y resuelto server-side vía `METRICOOL_API_KEY_SECRET_REF` (nunca hardcodeado, nunca logueado).
- Primitive canónico `src/lib/social/metricool/*` con readers (brands, best-time, scheduled posts, analytics) y un command de programación gobernado.
- Capability `social.schedule.execute` (registry + grant a ≥1 rol real + coverage test) con write apto para `propose → confirm → execute`.
- Contrato programático declarado (Product API interna) reutilizable por UI futura, Nexa, MCP y crons — un primitive, muchos consumers.
- Flag `METRICOOL_INTEGRATION_ENABLED` default OFF; el MCP interactivo sigue siendo el camino en-sesión sin cambios.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` (base + North Star Nexa; un primitive, muchos consumers)
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md` (lanes app/ecosystem, contrato programático)
- `docs/architecture/agent-invariants/INTEGRATIONS_INFRA_AGENT_INVARIANTS.md` (observability cross-runtime, patrón de integración externa)
- `CLAUDE.md` §`Secret Manager Hygiene`, §`Canonical API error response contract`, §`Full API Parity Principle`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (registrar el flag nuevo)

Reglas obligatorias:

- **NUNCA** hardcodear la API key ni loguearla; resolver server-side vía `METRICOOL_API_KEY_SECRET_REF` con el resolver canónico de secretos (`resolveSecret` / `validateSecretFormat`).
- **NUNCA** instanciar un cliente HTTP de Metricool fuera del primitive `src/lib/social/metricool/*`; los consumers (UI/Nexa/MCP/cron) consumen readers/commands, no `fetch` directo.
- **NUNCA** ejecutar el write de programar/publicar directo desde el LLM/agente: `propose → confirm → execute`, la mutación ocurre solo en el endpoint de confirmación humana.
- **NUNCA** retornar prosa inglesa cruda al cliente: usar `canonicalErrorResponse` + extender `CanonicalErrorCode` si hace falta.
- **NUNCA** `Sentry.captureException` directo: usar `captureWithDomain(err, 'integrations', ...)` (o `agency`).
- **SIEMPRE** resolver el `brandId` de Metricool por `label` vía `listBrands()` antes de escribir — no cruzar contenido entre marcas propias y de clientes (SKY es cuenta real de cliente).

## Normative Docs

- `.claude/skills/social-media-studio/efeonce/STUDIO_TOOLING.md` — pipeline del estudio + flujo Metricool verificado (endpoints, gotcha `dayOfWeek` 1=lunes..7=domingo, params ISO 8601 + timezone IANA).
- `.claude/skills/social-media-studio/efeonce/CLIENT_DELIVERY.md` — regla de aislamiento por marca de cliente.
- Memoria de sesión `reference_vercel_runtime_secret_accessor` — los `*_SECRET_REF` requieren grant `secretAccessor` a `greenhouse-portal@`, si no da error engañoso "not configured".

## Dependencies & Impact

### Depends on

- GCP Secret Manager (`efeonce-group`) + grant `secretAccessor` a `greenhouse-portal@` [verificar el service account exacto en runtime Vercel].
- Resolver canónico de secretos: `src/lib/secrets/*` (`resolveSecret`, `validateSecretFormat`, catálogo `FORMAT_RULES`) [verificar paths].
- Contrato de error canónico: `src/lib/api/canonical-error-response.ts` [verificar].
- Registry de capabilities + grants: `capabilities_registry` (DB) + `src/lib/entitlements/*` (catalog + runtime + coverage test) [verificar paths].

### Blocks / Impacts

- Habilita una futura task `ui-ux` de superficie social en el portal (cola/aprobación de posts) — fuera de scope acá.
- Habilita a Nexa operar la programación social por construcción (Full API Parity) una vez exista el command.
- Habilita un futuro cron "publicar cola aprobada" (seguiría el patrón outbox/ops-worker; fuera de scope).

### Files owned

- `src/lib/social/metricool/client.ts` — cliente HTTP server-only (nuevo)
- `src/lib/social/metricool/readers.ts` — readers canónicos (nuevo)
- `src/lib/social/metricool/commands.ts` — command de programación gobernado (nuevo)
- `src/lib/social/metricool/types.ts` — tipos del dominio (nuevo)
- `src/app/api/social/metricool/**/route.ts` — contrato programático interno (nuevo)
- `migrations/*_task-1344-metricool-schedule-capability.sql` — seed capability + audit/outbox event (nuevo)
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` — fila del flag nuevo
- `docs/documentation/agency/*` + `docs/manual-de-uso/agency/*` — capas funcional + manual
- `docs/architecture/*` — spec técnica de la integración (nueva o delta)

## Current Repo State

### Already exists

- MCP de Metricool conectado y operable en sesión (`createScheduledPost`, `getBrandSettings`, `getBestTimeToPostByNetwork`, `getScheduledPosts`, `updateScheduledPost`, `getAnalytics*`) — verificado en vivo 2026-07-05.
- Skill `social-media-studio` con overlay `STUDIO_TOOLING.md` documentando el flujo verificado.
- Patrones canónicos reutilizables: resolver de secretos, contrato de error canónico, capability registry + grant coverage test, `captureWithDomain`, flag default-OFF (`GREENHOUSE_CANONICAL_PATTERNS_V1.md`).

### Gap

- No existe `src/lib/social/**` (directorio nuevo) — confirmado: no hay código de social ni referencias a `metricool` en `src/`/`services/`.
- No hay secreto `metricool-api-key` publicado ni `METRICOOL_API_KEY_SECRET_REF` resuelto.
- No hay capability `social.schedule.execute` ni contrato programático server-side.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` (escrituras externas a cuentas sociales reales de clientes + secreto nuevo)
- Impacto principal: `integration`
- Source of truth afectado: API de Metricool (externo) + `capabilities_registry` (DB) + audit/outbox event nuevo
- Consumidores afectados: `API` interna, `MCP`, `cron` (futuro), `Nexa`, `UI` (futura)
- Runtime target: `production` (Vercel) + `staging`

### Contract surface

- Contrato existente a respetar: `src/lib/api/canonical-error-response.ts`, resolver de secretos `src/lib/secrets/*`, entitlements `src/lib/entitlements/*` [verificar paths].
- Contrato nuevo o modificado: readers `listBrands/getBestTimeToPost/listScheduledPosts/getAnalytics`; command `scheduleSocialPost`; route interna `/api/social/metricool/*` (read) + endpoint de confirmación (write).
- Backward compatibility: `gated` (flag `METRICOOL_INTEGRATION_ENABLED` default OFF; el MCP no cambia).
- Full API parity: la lógica vive en el primitive `src/lib/social/metricool/*`; UI/Nexa/MCP/cron consumen readers/command, nunca `fetch` a Metricool ad-hoc.

### Data model and invariants

- Entidades/tablas/views afectadas: `capabilities_registry` (seed de la capability), tabla/event de audit/outbox para el write (`greenhouse_sync.outbox_events` con event type nuevo) [verificar catálogo de eventos].
- Invariantes que no se pueden romper:
  - La API key nunca sale del server ni aparece en logs/errores/responses.
  - El `brandId` de destino se resuelve por `label` y se valida contra la lista real antes de todo write (aislamiento marca propia vs cliente).
  - El write se ejecuta solo en el endpoint de confirmación humana (`propose → confirm → execute`); ningún LLM/agente muta directo.
- Tenant/space boundary: la capability `social.schedule.execute` se chequea con `can(subject, ...)`; el `brandId` de Metricool se mapea explícito (no derivado de sesión) y se audita.
- Idempotency/concurrency: idempotency key por (brandId, network, contentHash, scheduledAt) para evitar doble programación en reintentos.
- Audit/outbox/history: append-only — cada programación emite un evento de audit/outbox con actor, brand, red, hora y idempotency key.

### Migration, backfill and rollout

- Migration posture: `additive` (seed de capability + grant; event type nuevo). Sin datos destructivos.
- Default state: `flag OFF` (`METRICOOL_INTEGRATION_ENABLED=false`) + capability sembrada pero sin uso hasta flip.
- Backfill plan: N/A (no hay data histórica a migrar).
- Rollback path: flag a `false` + redeploy; revert PR; la migración additive se revierte con down migration (drop del seed) si es necesario.
- External coordination: publicar `metricool-api-key` en Secret Manager + grant `secretAccessor` a `greenhouse-portal@` + declarar `METRICOOL_API_KEY_SECRET_REF` en Vercel (staging + prod) + redeploy.

### Security and access

- Auth/access gate: `session + capability social.schedule.execute` para el write; readers detrás de sesión + capability de lectura `social.read` [definir].
- Sensitive data posture: `secrets` (API key). La key es scalar crudo en Secret Manager; se pasa por `validateSecretFormat`. Sin PII de payroll/finance.
- Error contract: `canonicalErrorResponse` + `CanonicalErrorCode` extendido si hace falta (`metricool_not_configured`, `metricool_brand_not_found`, `metricool_schedule_failed`). Detalle técnico a `captureWithDomain`, nunca al cliente.
- Abuse/rate-limit posture: respetar rate limits de Metricool; idempotency key como replay guard; el write requiere confirmación humana (no batch automático sin gate).

### Runtime evidence

- Local checks: unit tests del primitive (readers parseando fixtures reales; command con idempotency; error mapping). `pnpm test` + `pnpm typecheck` + `pnpm lint`.
- DB/runtime checks: `pnpm migrate:up` en staging + verify que la capability existe en `capabilities_registry` y el grant coverage test pasa.
- Integration checks: smoke de lectura real (`listBrands` contra la cuenta) con la key resuelta desde Secret Manager en staging; **dry-run** del write (programar en una marca de prueba con fecha futura + verificar en `getScheduledPosts` + borrar), NUNCA en una cuenta de cliente.
- Reliability signals/logs: emitir señal/log en fallo de config o de escritura (`captureWithDomain(err,'integrations',...)`).
- Production verification sequence: ver §Rollout Plan.

### Acceptance criteria additions

- [ ] Source of truth (API Metricool + capability registry), contract surface (readers/command/route) y consumers están nombrados con paths reales.
- [ ] Invariantes (secreto server-only, aislamiento por brand, propose→confirm→execute), tenant/access boundary e idempotencia están explícitos.
- [ ] Migration/rollback posture es explícita y proporcional (additive + flag OFF + down migration).
- [ ] Evidencia runtime listada (smoke de lectura real + dry-run de write en marca de prueba, nunca cliente).
- [ ] Dominio sensible (secreto) con errores canónicos, sin leaks de la key, con `captureWithDomain`.

## Capability Definition of Done — Full API Parity gate

Aplica: la task **introduce** la capability `social.schedule.execute`.

- [ ] Lógica en el primitive `src/lib/social/metricool/*`, no en UI.
- [ ] Modelada como command (`scheduleSocialPost`), no click-handler.
- [ ] Read como readers canónicos; write como command con command semantics, authorization fina (capability, NO admin-coarse), idempotencia, audit/outbox, errores canónicos, observabilidad.
- [ ] Capability + grant en el MISMO PR: `capabilities_registry` seed + grant a ≥1 rol real (`efeonce_admin` + `efeonce_account`/`designer` según delivery) + coverage test verde.
- [ ] Camino programático declarado: Product API interna `/api/social/metricool/*` (+ endpoint de confirmación del write).
- [ ] Write apto para `propose → confirm → execute`; NO construir integración Nexa-específica.
- [ ] Un primitive, muchos consumers: cero lógica duplicada por consumer.
- [ ] Parity check = SÍ.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Secreto + config foundation

- Publicar `metricool-api-key` en Secret Manager (`printf %s | gcloud secrets ... --data-file=-`) + grant `secretAccessor` a `greenhouse-portal@`.
- Declarar `METRICOOL_API_KEY_SECRET_REF` en Vercel (staging + prod) + agregar regla a `FORMAT_RULES` si aplica.
- Registrar flag `METRICOOL_INTEGRATION_ENABLED` (default `false`) en `FEATURE_FLAG_STATE_LEDGER.md` (§inventario + §pendientes de acción).

### Slice 2 — Read primitive

- `src/lib/social/metricool/client.ts` (server-only, resuelve la key, base URL, manejo de errores → canónicos).
- `src/lib/social/metricool/readers.ts`: `listBrands()`, `getBestTimeToPost()`, `listScheduledPosts()`, `getAnalytics()`.
- `src/app/api/social/metricool/brands/route.ts` + `.../best-time/route.ts` + `.../scheduled/route.ts` (GET, gateados por sesión + capability de lectura, errores canónicos).
- Unit tests con fixtures reales del shape del MCP verificado (brands, best-time con `dayOfWeek` 1=lun..7=dom).

### Slice 3 — Write command gobernado + capability

- Migration additive: seed capability `social.schedule.execute` en `capabilities_registry` + grant a ≥1 rol real + event type de audit/outbox.
- `src/lib/social/metricool/commands.ts`: `scheduleSocialPost(...)` con resolución de `brandId` por label, idempotency key, audit/outbox, errores canónicos.
- Coverage test de la capability verde (`capability-grant-coverage.test.ts`).

### Slice 4 — Contrato programático del write (propose → confirm → execute)

- Endpoint de confirmación humana `/api/social/metricool/schedule/confirm` (POST) que ejecuta el command tras validar capability + payload propuesto.
- Declarar el consumo por UI/Nexa/MCP/cron (parity); dejar `UI-only por ahora` documentado como deuda con owner si la UI se difiere.
- Docs: capa funcional (`docs/documentation/agency/*`) + manual (`docs/manual-de-uso/agency/*`) + spec técnica.

## Out of Scope

- Superficie UI en el portal (cola/aprobación visual) → task `ui-ux` separada, bloqueada por esta.
- Cron "publicar cola aprobada" → task futura (patrón outbox/ops-worker, no Vercel cron async-crítico).
- Subida de media/assets a Metricool (pipeline de upload) → slice/task posterior.
- Integración de métricas sociales al Account 360 / ICO → trabajo de plataforma separado.
- Cualquier publicación real a cuentas de clientes (SKY etc.) durante esta task — solo dry-run en marca de prueba.

## Detailed Spec

- **Cliente**: `fetch` server-only con `Authorization`/`X-Mc-Auth` según el esquema de la API de Metricool [verificar header exacto en discovery]. Base URL `https://app.metricool.com/api` [verificar]. Timeout + retry acotado con idempotency.
- **Mapeo de errores**: 401/403 → `metricool_not_configured` (actionable=false); brand inexistente → `metricool_brand_not_found`; fallo de schedule → `metricool_schedule_failed`. Detalle a Sentry (`integrations`), nunca al cliente.
- **`dayOfWeek` gotcha**: normalizar 1=lunes..7=domingo al modelo interno (no confundir con JS 0=domingo) — documentado en `STUDIO_TOOLING.md`.
- **Idempotency**: `sha256(brandId|network|contentHash|scheduledAtISO)`; reintento con misma key no duplica.
- El MCP interactivo permanece intacto y sigue siendo el camino en-sesión; esta integración es el camino headless/gobernado.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (secreto + flag) → Slice 2 (read) → Slice 3 (write command + capability) → Slice 4 (endpoint confirm).
- Slice 3 NO puede shippear sin la capability + grant + coverage test en el MISMO PR.
- Ningún write real a cuenta de cliente hasta que el dry-run en marca de prueba esté verde en staging con el flag ON solo en staging.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Publicar en la marca equivocada (cruce propio/cliente, ej. SKY) | integration | medium | resolver `brandId` por label + validar contra lista real + confirmación humana | audit/outbox event con brand explícito |
| Leak de la API key en logs/errores/response | secrets | low | resolver server-only + `validateSecretFormat` + errores canónicos sin detalle | `captureWithDomain` integrations |
| Config faltante (secret ref sin grant secretAccessor) | integration | medium | health check de config + error `metricool_not_configured` claro | log/signal de config al arrancar |
| Doble programación en reintento | integration | low | idempotency key | conteo de duplicados en audit |
| Write directo por LLM sin confirmación | identity/agency | low | command solo invocable desde endpoint de confirmación humana | audit sin actor humano = alerta |

### Feature flags / cutover

- Env var `METRICOOL_INTEGRATION_ENABLED` (default `false`). Con OFF, readers/command devuelven `not_configured`/no-op y el MCP interactivo es el único camino. Flip a `true` primero en staging tras smoke, luego prod. Revert: `false` + redeploy (<5 min Vercel).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | quitar secret ref + flag OFF + redeploy | <10 min | sí |
| Slice 2 | revert PR (readers additive, sin efectos) | <10 min | sí |
| Slice 3 | down migration (drop seed capability + grant) + revert PR | <15 min | sí |
| Slice 4 | flag OFF (endpoint deja de ejecutar) + revert PR | <5 min | sí |

### Production verification sequence

1. `pnpm migrate:up` staging + verify capability existe + coverage test verde.
2. Publicar secret + grant secretAccessor + `METRICOOL_API_KEY_SECRET_REF` en staging + redeploy.
3. Flag ON solo en staging → smoke read `listBrands` real + `getBestTimeToPost`.
4. Dry-run write: programar en **marca de prueba** con fecha futura → verificar en `getScheduledPosts` → borrar. NUNCA en cuenta de cliente.
5. Repetir 2–3 en producción con flag OFF; flip a ON solo tras sign-off del operador.
6. Monitorear señales/logs de integración 7d post-prod.

### Out-of-band coordination required

- Publicar `metricool-api-key` en Secret Manager (`efeonce-group`) + grant `secretAccessor` a `greenhouse-portal@`.
- Declarar `METRICOOL_API_KEY_SECRET_REF` en Vercel (staging + prod) + redeploy.
- Sign-off del operador antes de habilitar el write en prod (afecta cuentas sociales reales, incluidas de clientes Globe).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] La API key se resuelve desde Secret Manager vía `METRICOOL_API_KEY_SECRET_REF`; `grep -r` no encuentra la key en el repo ni en logs.
- [ ] `src/lib/social/metricool/*` es el único lugar que hace `fetch` a Metricool; ningún consumer llama la API directo.
- [ ] Readers `listBrands/getBestTimeToPost/listScheduledPosts/getAnalytics` devuelven data real en staging con el flag ON.
- [ ] Capability `social.schedule.execute` existe en `capabilities_registry` con grant a ≥1 rol real y coverage test verde en el mismo PR.
- [ ] El write solo se ejecuta vía el endpoint de confirmación humana; ningún path permite que el LLM/agente escriba directo.
- [ ] Errores cruzan como `canonicalErrorResponse` (es-CL, `code`, `actionable`); ningún detalle técnico ni la key llegan al cliente.
- [ ] Dry-run de programación verificado en marca de prueba (creado → visible en `getScheduledPosts` → borrado); cero writes a cuentas de cliente.
- [ ] Flag `METRICOOL_INTEGRATION_ENABLED` default OFF y registrado en `FEATURE_FLAG_STATE_LEDGER.md`.
- [ ] Triple documentación (técnica + funcional + manual) creada/actualizada.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- Smoke de lectura real en staging (flag ON) + dry-run de write en marca de prueba.

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` sincronizado con el cierre
- [ ] `Handoff.md` actualizado con lo aplicado, verificado y pendientes de rollout
- [ ] `changelog.md` actualizado si cambió comportamiento/estructura visible
- [ ] chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `FEATURE_FLAG_STATE_LEDGER.md` refleja el estado del flag por environment
- [ ] skill `social-media-studio` (`STUDIO_TOOLING.md`) actualizada para apuntar el camino programático además del MCP

## Follow-ups

- Task `ui-ux`: superficie social en el portal (cola de contenido + aprobación) consumiendo estos readers/command.
- Task: cron "publicar cola aprobada" (patrón outbox/ops-worker).
- Task: pipeline de subida de media/assets a Metricool.
- Task: integración de métricas sociales a Account 360 / ICO.

## Open Questions

- ¿Header/esquema de auth exacto de la API de Metricool (query param `userId`+`userToken` vs header)? Resolver en Discovery contra la doc oficial.
- ¿Qué roles reales deben tener `social.schedule.execute` — `efeonce_admin` + `efeonce_account` (delivery) + `designer`? Confirmar con el operador antes del seed.
- ¿La marca de "prueba" para dry-run existe en la cuenta o hay que crear una dedicada para no tocar cuentas productivas?
