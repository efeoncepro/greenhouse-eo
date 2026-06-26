# TASK-1254 — Growth Forms Email Verification Service + Corporate Gate

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `integration`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `data`
- Blocked by: `TASK-1253`
- Branch: `task/TASK-1254-growth-forms-email-verification-corporate-gate`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construye un servicio de **verificación de email** que permite gatear el submit de un formulario growth a "correo corporativo Y verificado" (deliverable). Diseño local-first: **Tier 1 gratis y síncrono** (sintaxis + clasificación free/desechable + rol + typo-suggest) y **Tier 2 con provider pago** (deliverability/MX, abstraído tras un puerto, cacheado por hash con TTL, rate-limit). Expone un **endpoint público debounced** que el cliente consume para habilitar/deshabilitar el submit; `submitForm` re-corre la verificación (autoridad real) y una **capa async en el dispatcher** profundiza y marca la calidad del lead. Política configurable por formulario.

## Why This Task Exists

Hoy no existe ningún blocklist de dominios ni verificación de email en el repo — solo el `EMAIL_RE` sintáctico del renderer. El negocio (norte del cotizador: "que no cotice cualquiera con gmail") necesita gatear leads a correo corporativo real. Pero "no-gmail" y "correo real" son dos cosas distintas: el primero es clasificación de dominio (barata, síncrona); el segundo es verificación de deliverability (red, flaky, con costo por call). Sin un diseño de dos tiers + caching + provider abstraction, esto se vuelve caro, lento y frágil. Y sin autoridad server-side, el gate del botón es teatro: un POST directo lo salta.

## Goal

- **Provider abstraction** (puerto/adapter) para verificación de email, secreto server-side vía `*_SECRET_REF`, swappable.
- **Endpoint público debounced** `POST /api/public/growth/forms/[formSlug]/verify-email` que el cliente NUNCA bypasea hacia el provider.
- **Tier 1 local gratis** (sintaxis, free/desechable, rol, typo-suggest) + **Tier 2 provider pago** (deliverability/MX) gateado por Tier 1, cacheado por hash de email con TTL, rate-limit por IP.
- **Autoridad server**: `submitForm` re-corre la verificación (cache hit) y rechaza si la política del form exige corporativo+deliverable y no se cumple.
- **Capa async** en el dispatcher que profundiza y marca la calidad del lead.
- **Política por formulario** (warn / block-en-campo / solo-etiquetar) — el operador decide; default configurable.

**Full API Parity (nace gobernado):** `verifyEmail` es un servicio canónico en `src/lib/**` (no lógica en el handler ni en el cliente); el endpoint público, `submitForm`, el dispatcher, Nexa y MCP lo consumen igual. La **política de email por form** se escribe vía el command gobernado de form-definition (no estado UI-local), por lo que cualquier consumer — incluido Nexa vía `propose → confirm → execute` — puede configurarla. Un primitive, muchos consumers.

## Goal narrativo de política (decisión del operador)

El operador eligió: en el campo, que la validación ya rechace o que el submit no se habilite si no es correo corporativo (gate duro a nivel de campo, no solo warn al enviar), con un mecanismo de detección + servicio que valide la validez del mail. Esta task implementa el backend de ese gate; la habilitación/deshabilitación visible del botón es **TASK-1256**.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` — la capa async de deliverability va por el dispatcher, no inline
- `docs/architecture/agent-invariants/INTEGRATIONS_INFRA_AGENT_INVARIANTS.md` — patrón puerto/adapter (ZapSign-style), nunca llamar al provider directo desde un handler

Reglas obligatorias:

- El cliente **NUNCA** llama al provider de verificación; solo al endpoint público de Greenhouse (el secreto vive server-only).
- **Tier 1 antes de Tier 2 siempre**: no gastar call pago si el dominio ya es free/desechable o la sintaxis falla.
- Cache obligatorio por hash de email (TTL) para no re-facturar; rate-limit por IP reusando el abuse-guard del motor.
- El gate del botón es UX; **la autoridad es `submitForm`** (re-verifica, cache hit). Parity.
- Deliverability profunda (catch-all, etc.) va **async** en el dispatcher, nunca bloquea al usuario.
- `captureWithDomain(err, 'growth', ...)`; errores client-facing canónicos; nunca exponer respuesta cruda del provider.

## Normative Docs

- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md` (bus canónico si la capa async usa outbox)
- `CLAUDE.md` §"Secret Manager Hygiene" + §"Integraciones/infra cross-runtime"

## Dependencies & Impact

### Depends on

- **TASK-1253** — el validador `corporate_email` vive en el validator registry; este servicio lo alimenta.
- `src/lib/growth/forms/commands.ts` (`submitForm`), `dispatch.ts` (capa async), abuse-guard/rate-limit existente.
- Provider externo de verificación de email (ZeroBounce / Kickbox / NeverBounce / Abstract — a elegir; ver Open Questions) + secreto GCP `*_SECRET_REF`.

### Blocks / Impacts

- **TASK-1256** (UI) — el submit-gating consume el endpoint `verify-email`.
- Dispatcher de destinos (HubSpot) — el lead lleva ahora flags de calidad/verificación.
- **TASK-1246** (lanzamiento público del Grader / lead magnet) — **fuertemente recomendado** al cutover (no hard-block): mejora calidad de lead desde el día uno. Si su rollout apura, 1246 puede lanzar con política `warn` y subir a `block_field` post-launch.

### Files owned

- `src/lib/growth/forms/email-verification/` (NUEVO — puerto + adapters + Tier 1 local + cache + orquestador)
- `src/lib/growth/forms/email-verification/disposable-domains.ts` o tabla seed (NUEVO — lista free/desechable)
- `src/app/api/public/growth/forms/[formSlug]/verify-email/route.ts` (NUEVO endpoint público)
- `src/lib/growth/forms/commands.ts` (`submitForm` re-verifica según política)
- `src/lib/growth/forms/dispatch.ts` (capa async deliverability + marca de calidad)
- `src/lib/growth/forms/contracts.ts` (política de email por form + flags de calidad del lead)
- `migrations/` (tabla cache de verificación + columnas de calidad en `form_submission`)
- `src/lib/reliability/queries/` (signals provider error + rejection rate)
- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md` (delta)

## Current Repo State

### Already exists

- `submitForm` con honeypot, captcha, rate-limit, dedupe (`commands.ts`).
- `dispatch.ts` (delivery async a destinos), abuse-guard/captcha cores en growth.
- `EMAIL_RE` sintáctico en el renderer (insuficiente para corporativo/real).

### Gap

- No existe ningún blocklist de dominios free/desechables en `src/lib/**`.
- No existe verificación de deliverability/MX ni provider abstraction.
- No existe endpoint de verificación; el gate corporativo no tiene mecanismo.
- `form_submission` no tiene columnas de calidad/verificación del lead.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` (integración externa con costo + endpoint público + gate de negocio)
- Impacto principal: `integration`
- Source of truth afectado: servicio de verificación + cache + política de email por form
- Consumidores afectados: `submitForm (autoridad), renderer/TASK-1256 (gate UX), dispatcher (calidad lead)`
- Runtime target: `production` (endpoint público + provider externo) + `worker` (capa async)

### Contract surface

- Contrato existente a respetar: `greenhouse-growth-public-forms.v1`, validator registry de TASK-1253
- Contrato nuevo o modificado: `POST /verify-email` → `{ syntaxValid, isCorporate, isDisposable, isRoleBased, deliverable, suggestion, reasonCode }`; política de email en la definición del form
- Backward compatibility: `gated` — forms sin política de email se comportan como hoy (sin gate)
- Full API parity: el servicio de verificación es el primitive; endpoint público, submitForm, dispatcher y futuro Nexa lo consumen igual

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.email_verification_cache` (NUEVO), `greenhouse_growth.form_submission` (columnas de calidad)
- Invariantes que no se pueden romper:
  - El cliente nunca recibe ni el secreto ni la respuesta cruda del provider
  - Tier 2 (pago) **solo** se invoca si Tier 1 pasa
  - El gate del submit lo decide `submitForm` server-side, no el cliente
  - Cache key = hash del email normalizado (de TASK-1253), nunca el email crudo
- Tenant/space boundary: política de email por form/surface
- Idempotency/concurrency: cache con TTL evita re-call; `SELECT ... ON CONFLICT` para el upsert de cache
- Audit/outbox/history: la capa async usa outbox/reactive (no MERGE inline); marca de calidad append-only en el lead

### Migration, backfill and rollout

- Migration posture: `additive` (tabla cache nueva + columnas de calidad nullable con default)
- Default state: `flag OFF` — `GROWTH_FORMS_EMAIL_VERIFICATION_ENABLED` default `false`; el gate corporativo se activa por form solo tras smoke
- Backfill plan: `none` (forward-only)
- Rollback path: `flag off` + `revert PR`; la tabla cache queda inerte
- External coordination: alta del provider de verificación + publicar secreto en GCP Secret Manager + grant `secretAccessor` a `greenhouse-portal@` (ver memoria `reference_vercel_runtime_secret_accessor`)

### Security and access

- Auth/access gate: endpoint público con rate-limit + abuse-guard; sin sesión
- Sensitive data posture: `PII` (email); cache guarda hash + veredicto, no el email crudo cuando sea posible
- Error contract: `canonicalErrorResponse` + `reasonCode`; nunca exponer error/payload del provider; `captureWithDomain`
- Abuse/rate-limit posture: rate-limit por IP + circuit breaker al provider (si el provider cae, degradar a Tier 1 y marcar `deliverable=unknown`, no bloquear el form entero)

### Runtime evidence

- Local checks: `pnpm test` (Tier 1 clasificación, typo-suggest, orquestador Tier1→Tier2, cache hit/miss, circuit breaker)
- DB/runtime checks: verify tabla cache + columnas calidad vía `information_schema`; smoke del endpoint con email corporativo/gmail/desechable
- Integration checks: smoke real contra el provider (sandbox) con un email conocido; verificar grant `secretAccessor`
- Reliability signals/logs: `growth.forms.email_provider_error_rate`, `growth.forms.email_rejection_rate`, `growth.forms.email_verification_cache_hit_rate`
- Production verification sequence: ver Rollout

### Acceptance criteria additions

- [ ] Provider abstraído tras puerto; secreto server-only; cliente nunca lo toca.
- [ ] Tier 2 solo tras Tier 1; cache por hash con TTL; rate-limit.
- [ ] `submitForm` es la autoridad del gate; POST directo con gmail a un form block-corporativo → rechazo canónico.
- [ ] Circuit breaker: provider caído degrada a Tier 1, no rompe el form.
- [ ] Signals de provider error / rejection / cache-hit registradas.

## Capability Definition of Done — Full API Parity gate

- [ ] Lógica de verificación en `src/lib/growth/forms/email-verification/`, no en el handler ni en el cliente.
- [ ] Modelada como servicio/recurso (`verifyEmail`), no como click-handler.
- [ ] Read (verify) como recurso canónico; el gate (write decision) en `submitForm` con authz pública + errores canónicos + observabilidad.
- [ ] Capability: la **política de email por form** es configuración gobernada (parte del form definition capability, TASK-1232/1256). Declarar en Plan.
- [ ] Camino programático: endpoint público + submitForm + dispatcher + futuro Nexa; un primitive.
- [ ] Un primitive, muchos consumers.
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

### Slice 1 — Tier 1 local (gratis, síncrono)

- `email-verification/` con clasificación de dominio: free/desechable (lista seed `disposable-domains.ts` o tabla), rol (`info@`, `noreply@`), corporativo vs personal, typo-suggest (`gmial→gmail`), normalización gmail (puntos / `+`) para dedup.
- Validador `corporate_email` en el registry de TASK-1253 alimentado por Tier 1.

### Slice 2 — Provider abstraction + Tier 2 + cache

- Puerto `EmailVerificationProvider` + adapter del provider elegido; secreto vía `*_SECRET_REF`.
- Orquestador Tier1→Tier2 (Tier 2 solo si Tier 1 pasa) + tabla `email_verification_cache` (hash + veredicto + TTL) + circuit breaker.

### Slice 3 — Endpoint público debounced + autoridad en submitForm

- `POST /api/public/growth/forms/[formSlug]/verify-email` (rate-limited) → veredicto para el cliente.
- `submitForm` re-corre la verificación (cache hit) y aplica la política del form (block/warn/etiquetar); rechazo canónico si block + no cumple.
- Flag `GROWTH_FORMS_EMAIL_VERIFICATION_ENABLED` (default OFF).

### Slice 4 — Capa async de deliverability + calidad del lead

- En `dispatch.ts`: verificación profunda async (vía outbox/reactive) que marca la calidad del lead (`verified|suspect|unknown`) post-aceptación, sin bloquear.
- Columnas de calidad en `form_submission` + signals.

## Out of Scope

- Habilitar/deshabilitar el botón submit en el renderer + UX del estado verificando → **TASK-1256**.
- Validación de tipo/RUT/url (eso es el registry de TASK-1253).
- Cifrado del email at-rest → **TASK-1255**.
- Implementar más de un provider adapter (uno es suficiente; el puerto deja la puerta abierta).

## Detailed Spec

Veredicto arch-architect: local-first, provider-gated, cacheado. Tier 1 resuelve "corporativo" gratis para la mayoría; Tier 2 (pago) solo para deliverability y solo si Tier 1 pasa, cacheado por hash con TTL + rate-limit + circuit breaker. Gate = UX en cliente, autoridad en `submitForm`. Deliverability profunda async en dispatcher. Provider abstraído (swappable). Política por form: `block_field` (rechaza en validación de campo / no habilita submit), `warn` (deja enviar, marca suspect), `tag_only` (nunca bloquea, solo clasifica). El operador eligió gate duro a nivel de campo como comportamiento objetivo para los forms que lo requieran (ej. cotizador).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (Tier 1) → Slice 2 (provider + cache) → Slice 3 (endpoint + autoridad) → Slice 4 (async).
- Slice 3 NO shippea sin Slice 2 (circuit breaker), o un provider caído rompe todos los forms.
- Slice 4 puede correr en paralelo con Slice 3 una vez cerrado Slice 2.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Gate corporativo mal calibrado mata conversión en silencio | growth | high | Signal de rejection rate + default OFF + política por form + arranque en `warn` antes de `block` | `growth.forms.email_rejection_rate` (spike) |
| Provider de verificación cae / timeout | integration | medium | Circuit breaker → degrada a Tier 1, `deliverable=unknown`, no bloquea | `growth.forms.email_provider_error_rate` |
| Costo del provider se dispara (abuse del endpoint público) | integration / cost | medium | Tier1-first + cache TTL + rate-limit por IP + cap diario | `growth.forms.email_verification_cache_hit_rate` (bajo = fuga) |
| Secreto del provider mal publicado (sin secretAccessor) | secrets | medium | Verify grant a `greenhouse-portal@`; smoke con `vercel logs` | error "not configured" en logs |
| Email crudo en cache/logs | identity/PII | low | Cache por hash; `redactSensitive` en logs | no signal — review |

### Feature flags / cutover

- `GROWTH_FORMS_EMAIL_VERIFICATION_ENABLED` (default `false`). Política por form (`block_field|warn|tag_only`) en la definición del form. Cutover gradual: activar en `warn` primero, observar rejection rate, subir a `block_field` donde el negocio lo pida. Revert: flag OFF + redeploy. Registrar en `FEATURE_FLAG_STATE_LEDGER.md`.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (additive) | <5 min | sí |
| Slice 2 | revert PR; cache queda inerte | <5 min | sí |
| Slice 3 | flag OFF + redeploy | <5 min | sí |
| Slice 4 | flag OFF; dispatcher vuelve a comportamiento actual | <5 min | sí |

### Production verification sequence

1. `pnpm migrate:up` staging (cache + columnas calidad) + verify `information_schema`.
2. Publicar secreto provider en GCP + verify `secretAccessor` a `greenhouse-portal@`.
3. Deploy staging flag=OFF + verify forms no cambian.
4. Flip flag=ON staging, política `warn`: email gmail → warn + suspect; corporativo → verified.
5. Subir un form a `block_field` staging: POST directo con gmail → rechazo canónico; corporativo deliverable → 200.
6. Forzar timeout del provider (sandbox) → verify circuit breaker degrada a Tier 1, form sigue vivo.
7. Repetir 3-6 en prod con cooldown 24h; monitor signals 7d.

### Out-of-band coordination required

- Alta + facturación del provider de verificación; publicar secreto GCP + grant `secretAccessor`; decisión de negocio sobre qué forms van a `block_field` vs `warn`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `POST /verify-email` devuelve `{ syntaxValid, isCorporate, isDisposable, isRoleBased, deliverable, suggestion, reasonCode }` sin exponer el provider.
- [ ] Tier 2 no se invoca si Tier 1 falla (verificado con métrica/log).
- [ ] Un form con política `block_field`: POST directo con gmail → rechazo canónico es-CL desde `submitForm`.
- [ ] Provider caído → circuit breaker → Tier 1 + `deliverable=unknown` + form operativo.
- [ ] Cache hit en submit posterior del mismo email (no re-factura).
- [ ] El lead persiste con flag de calidad (`verified|suspect|unknown`).
- [ ] Signals de provider error / rejection / cache-hit visibles en `/admin/operations`.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- smoke real provider (sandbox) + curl al endpoint + curl directo a submit con gmail

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (TASK-1253/1255/1256)
- [ ] fila del flag agregada a `FEATURE_FLAG_STATE_LEDGER.md`
- [ ] signals registradas en el reliability registry

## Follow-ups

- **Lista comprensiva de GRATIS/públicos: HECHA (2026-06-26).** `comprehensive-free-domains.ts` (server-only, 4.462 dominios, willwhite/freemail MIT) + regen tool `scripts/growth/regenerate-free-email-domains.mjs`. La autoridad server (orquestador) la consulta además de la lista corta browser-safe → cubre el long-tail ("etc y similares"). Verificado live en staging. Follow-up: cron de refresh del regen tool (hoy es manual).
- **Lista de DESECHABLES comprensiva (88k) — diferida a propósito.** La lista comunitaria de temporales (88.173 dominios, agresiva/autogenerada) NO se vendorizó: riesgo de falso positivo bloqueando un prospecto enterprise real (peor error para Efeonce que dejar pasar un temporal). Si se quiere subir cobertura de desechables, evaluar una fuente curada de menor FP o el provider Tier 2. Hoy se cubren los desechables conocidos (baseline).
- Lead scoring / enriquecimiento de compañía desde el dominio del email.

## Open Questions

- ¿Qué provider de verificación? (ZeroBounce / Kickbox / NeverBounce / Abstract — costo por call, cobertura LATAM, sandbox). Decisión de negocio antes de Slice 2. **→ Resuelta (2026-06-26):** el operador pidió "lo más económico y efectivo". Decisión: la arquitectura económica es **Tier1-first** (Tier 1 local resuelve "no-gmail/no-desechable" gratis para ~90% del valor; Tier 2 pago solo si Tier 1 pasa, cacheado). El puerto queda **swappable** y se documenta **Abstract API** como primer adapter recomendado (free tier + MX/disposable, el más barato). El alta del provider + secreto + adapter real queda **diferido** (out-of-band) — hoy corre el adapter **noop** (`deliverable:'unknown'`).
- ¿La lista de desechables vive como tabla seed (refrescable por cron) o módulo vendored? Recomendación: tabla seed + refresh. **→ Resuelta (2026-06-26):** **módulo vendored browser-safe** (`email-verification/email-domain-data.ts`) — Tier 1 debe ser isomórfico (lo bundlea el renderer; una tabla PG no sirve sync al cliente). El refresh dinámico (cron desde tabla) queda como follow-up (mergea sobre el baseline vendored).

## Progreso 2026-06-26 — code complete (scaffold sin provider), rollout pendiente

Implementado local-first en `develop` (sin push), gated OFF. Estado: **`code complete, rollout pendiente`** (NO `complete`).

**Hecho y verificado:**

- **Slice 1** (commit `a20f99dd1`): dataset canónico browser-safe (`email-domain-data.ts`: free/desechable/role/typo) + `tier1.ts` (`classifyEmailTier1`: sintaxis, normalización gmail dots/`+`, isCorporate/isDisposable/isRoleBased, typo-suggest) + validador `corporate_email` en el registry canónico (`reasonCode` `email_not_corporate`/`email_disposable`; `type:email` sigue default `email_syntax` → opt-in) + **consolidación SSOT** de `ai-visibility/hubspot/email-domain.ts` (TASK-1242) al dataset compartido (una sola lista) + copy es-CL/en-US en el renderer + guard de pureza eslint extendido. Renderer hereda paridad por construcción.
- **Slice 2-3** (commit `1e945d4ce`): migración additive `email_verification_cache` (hash + veredicto + TTL, NUNCA email crudo) + `form_submission.email_quality/email_domain_class` (aplicada a dev, `db.d.ts` regenerado, DO-block anti pre-up-marker) + puerto `EmailVerificationProvider` + **noop adapter** + orquestador `verifyEmail` (Tier1-first → Tier2 solo si corporativo + provider listo → cache → circuit breaker, no-throwing) + cache-store (SQL ejercitado vs PG real) + rate-limit per-IP best-effort + endpoint público `POST /verify-email` (gated, 404 OFF) + gate de política en `submitForm` (`block_field`/`warn`/`tag_only`) + `emailPolicy` en `validation_schema_json` + flag `GROWTH_FORMS_EMAIL_VERIFICATION_ENABLED` (default OFF).
- **Slice 4** (commit `42f579016`): el `block_field` persiste un rejected submission (reason_class, sin PII) → rechazo observable + 2 reliability signals desde data real (`growth.forms.email_rejection_rate` + `email_suspect_lead_rate`), wired en `get-reliability-overview`.
- **Gates:** `pnpm test` full **8126 passed** / 0 fail · `pnpm build` **exit 0** (boundary server-only→client limpio) · `pnpm typecheck` limpio · lint limpio · smoke PG real del cache + del signal reader.

**Pendiente de rollout (out-of-band, NO bloquea el scaffold):**

1. ~~Flag ON en staging + verificar el endpoint live.~~ **HECHO (2026-06-26):** `vercel env add GROWTH_FORMS_EMAIL_VERIFICATION_ENABLED=true` al env `staging` + push develop + redeploy + **smoke live verde** contra el deployment (`ana@acme.com`→corporate pasa; `gmail`→`email_not_corporate`/suspect; `mailinator`→`email_disposable`/suspect; typo-suggest `gmial→gmail`). El endpoint `verify-email` exige AMBOS flags (master `PUBLIC_API` + email) — defense in depth.
2. **Activar la `emailPolicy` por form** (`validation_schema_json.emailPolicy`). **Modo decidido = `block_field`** (gate duro a nivel de campo, la decisión documentada del operador en §"Goal narrativo de política"). **Confirmado por el operador 2026-06-26:** Efeonce atiende **Enterprise + empresa mid-market** (NO freelancers ni Pymes/SMB) → bloquear correos no corporativos está **alineado con el ICP, no es riesgo de conversión** (no hay leads legítimos con gmail/personal). El campo de email del lead form es `email`. La activación en un form real debe pasar por el **flujo gobernado de autoría** (TASK-1256 crea una nueva versión publicada con la política — NO hand-patch del `validation_schema_json` de una versión publicada in-place). La capability + Tier 1 ya están live en staging; el gate `block_field` está verificado end-to-end contra PG real (gmail/desechable → `invalid`).
3. **Tier 2 (provider pago) — OPCIONAL, no requerido para el norte.** El "que no cotice cualquiera con gmail" lo cumple Tier 1 (gratis) que ya está rolled out. El provider de deliverability (Abstract API u otro) es un enhancement: requiere alta de cuenta + secreto GCP + grant `secretAccessor` + adapter real en `resolveVerificationProvider()` + live smoke contra el provider antes de confiarlo. Hoy corre el adapter noop (`deliverable:'unknown'`). NO escribí un adapter especulativo sin poder verificarlo contra la API real (evita shipping de integración no verificada).
4. **Prod — diferido por diseño al cutover de forms (TASK-1258),** mismo patrón que `GROWTH_FORMS_SERVER_VALIDATION_ENABLED`: el master `GROWTH_FORMS_PUBLIC_API_ENABLED` está OFF en prod y el endpoint exige ambos flags → flipear el email gate solo en prod hoy es 404/no-op y no smoke-verificable; debe nacer ON junto con el primer submit prod.
5. Follow-up signals `email_provider_error_rate` + `email_verification_cache_hit_rate` (requieren contadores de runtime; con noop serían data engañosa — deliberadamente NO emitidos).

**Rollout staging: COMPLETO y verificado live.** La task permanece en `in-progress/` porque el prod flip está delegado al cutover de TASK-1258 (no hay código/verificación pendiente en 1254 mismo) — mismo posicionamiento que su hermana TASK-1253.
