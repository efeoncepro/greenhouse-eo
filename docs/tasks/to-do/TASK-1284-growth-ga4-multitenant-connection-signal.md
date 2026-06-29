# TASK-1284 — Growth GA4 (Google Analytics 4) multi-tenant connection + grader signal

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Alto`
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
- Domain: `data`
- Blocked by: `none`
- Branch: `task/TASK-1284-growth-ga4-multitenant-connection-signal`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Conectar Greenhouse a la **Google Analytics Data API (GA4)** de cada cliente como nueva
fuente de señal del Growth AI Visibility Grader. Replica el dominio hermano
`src/lib/growth/search-console/**` (TASK-1282): OAuth 3-legged read-only con refresh token
del operador en Secret Manager, conexión por `organization_id` en PG, reader "una primitive,
muchos consumers" con honest degradation. El valor de señal: aislar **tráfico atribuible a
motores de IA** (referrals de `chatgpt.com`, `perplexity.ai`, `gemini.google.com`, etc.) y
sessions/conversions de Organic Search — el eje que hoy le falta al grader para cerrar el loop
"¿la visibilidad en IA se traduce en tráfico/conversión real?".

## Why This Task Exists

El AI Visibility Grader mide presencia en motores de IA (Share of Voice, citations, probes
structural/agentic/entity) pero **no tiene ninguna señal de tráfico real**. No puede responder
si esa visibilidad genera visitas o conversiones. GA4 es la fuente canónica de ese dato y cada
cliente ya lo tiene. La integración Search Console (TASK-1282) ya resolvió el patrón duro
—OAuth multi-tenant de Google, property-picker estilo Semrush, token de operador en Secret
Manager, binding por `organization_id`— así que GA4 es **extender ese patrón con un scope y un
reader nuevo**, no construir desde cero. Sin esta señal, el grader queda ciego al outcome.

## Goal

- Una org puede conectar su property GA4 vía OAuth read-only y el binding queda anclado a
  `organization_id` (UNIQUE), con el refresh token SOLO en Secret Manager (nunca en PG).
- Existe un reader canónico `readGa4Analytics(orgId, params)` con honest degradation
  (`token_unhealthy`/`disabled`/`not_connected`), consumible por grader, Nexa y UI.
- El reader expone segmentación de **tráfico atribuible a AI Search** (referrals de motores de
  IA) además de sessions/users/conversions por canal.
- La señal GA4 se cablea al run/report del grader detrás de flag default OFF, sin romper runs
  existentes cuando la org no tiene GA4 conectado.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/tasks/in-progress/TASK-1282-growth-search-console-multitenant-connection.md` (patrón a espejar)

Reglas obligatorias:

- **Espejar el dominio hermano, NO meter GA4 dentro de `ai-visibility/`.** La integración vive
  en `src/lib/growth/analytics-ga4/**` (paralelo a `src/lib/growth/search-console/**`); el grader
  la consume como señal.
- **El refresh token NUNCA toca PG.** Va a Secret Manager; la fila de PG solo guarda
  `token_secret_ref` (mirror de `search_console_connections`). Nunca loggear el token.
- **OAuth de usuario (3-legged), NO service account.** `google-credentials.ts` (WIF/ADC) no sirve
  para acceder a la property de un tercero; usar `OAuth2Client` de `google-auth-library` + refresh.
- **Scope read-only:** `https://www.googleapis.com/auth/analytics.readonly`. Nada de write.
- **Bridge canónico = `organization_id`.** El join entre property GA4 y un run del grader es
  `grader_profiles.organization_id` (TASK-1243) ↔ `ga4_connections.organization_id`.
- **Capability + grant en el mismo PR** (TASK-873/935 coverage test): `growth.ga4.connect`.
- **Flag default OFF + registrar en el ledger** (gate `pnpm docs:closure-check`).
- **Honest degradation:** `invalid_grant`/401/403 → marca conexión `revoked` + retorna
  `token_unhealthy`; nunca inventar filas ni mostrar 0 como dato real.

## Normative Docs

- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` — registrar `GROWTH_GA4_ENABLED`
- `docs/operations/GREENHOUSE_OPERATING_LOOP_V1.md` — ciclo de cierre

## Dependencies & Impact

### Depends on

- `greenhouse_core.organizations(organization_id)` — FK ancla (ya existe)
- `greenhouse_growth.grader_profiles.organization_id` — bridge org↔run (TASK-1243, ya existe)
- `google-auth-library` (`^10.6.1`, ya en `package.json`) — OAuth dance
- Patrón TASK-1282 `src/lib/growth/search-console/**` (referencia viva)
- OAuth client GCP nuevo (consent screen GA4) + secrets `GOOGLE_GA4_OAUTH_CLIENT_ID/SECRET` —
  coordinación out-of-band (ver Rollout)

### Blocks / Impacts

- Follow-up `ui-ux`: panel property-picker GA4 en client lifecycle (mirror de
  `SearchConsoleConnectionPanel.tsx`) — se crea como task aparte (ver Follow-ups)
- Follow-up: render del eje "tráfico real / AI-attributed traffic" en el report del grader
- Grader run-engine / report: nueva señal opcional

### Files owned

- `src/lib/growth/analytics-ga4/` (dominio nuevo completo)
- `src/app/api/admin/growth/analytics-ga4/**` (rutas OAuth + picker)
- `migrations/*-task-1284-ga4-connections.sql`
- `migrations/*-task-1284-ga4-capability.sql`
- `src/config/entitlements-catalog.ts` (agregar capability — archivo compartido)
- `src/lib/entitlements/runtime.ts` (grant — archivo compartido)
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (fila del flag — archivo compartido)
- Punto de cableado de señal en el run-engine/report del grader `[verificar]
  src/lib/growth/ai-visibility/run-engine.ts` / `report/`

## Current Repo State

### Already exists

- `src/lib/growth/search-console/**` — patrón multi-tenant OAuth completo a espejar:
  `oauth-client.ts`, `api-client.ts`, `command.ts`, `connection-store.ts`, `state-store.ts`,
  `secret-naming.ts`, `reader.ts`, `contracts.ts`, `flags.ts`, `index.ts` + `__tests__/`
- `src/app/api/admin/growth/search-console/**` — rutas `oauth/start`, `oauth/callback`, `sites`,
  `select-property`, `disconnect` (plantilla de las rutas GA4)
- `src/views/greenhouse/agency/clients/SearchConsoleConnectionPanel.tsx` + el picker en
  `src/app/(dashboard)/agency/clients/[organizationId]/lifecycle/page.tsx` (mirror del UI follow-up)
- `greenhouse_growth.grader_profiles.organization_id` (TASK-1243) — bridge org↔run
- `google-auth-library` ya instalado; `resolveSecret`/`resolveSecretByRef`/`createOrAddSecretVersion`
  ya existen (helpers de secrets)
- `src/lib/reliability/queries/growth-search-console-token-health.ts` — patrón de signal de salud
  de token a espejar para GA4

### Gap

- No existe `src/lib/growth/analytics-ga4/**` ni tabla `ga4_connections`
- El grader no tiene ninguna señal de tráfico real / atribución a motores de IA
- No existe capability `growth.ga4.connect` ni flag `GROWTH_GA4_ENABLED`
- No existe el OAuth client GCP de GA4 (consent screen + secrets) — gestión out-of-band

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `greenhouse_growth.ga4_connections` (nuevo) + Secret Manager (token) +
  reader `readGa4Analytics`
- Consumidores afectados: `grader run-engine/report (server), Nexa (reader), UI follow-up (picker)`
- Runtime target: `staging → production` (Vercel routes + secrets), reads desde GA4 Data API REST

### Contract surface

- Contrato existente a respetar: `src/lib/growth/search-console/index.ts` (barrel pattern),
  `grader_profiles.organization_id` bridge, canonical error contract, entitlements `can()`
- Contrato nuevo o modificado: dominio `analytics-ga4` (commands + reader + contracts), rutas
  `api/admin/growth/analytics-ga4/*`, capability `growth.ga4.connect`, evento/señal de salud token
- Backward compatibility: `gated` (flag default OFF; runs sin GA4 conectado siguen idénticos)
- Full API parity: el reader `readGa4Analytics` es la primitive única; grader/Nexa/UI la consumen.
  Connect/select/disconnect son commands gobernados (no click-handlers). Nexa puede leer GA4 de una
  org por construcción; el connect es write gobernado capability-gated.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.ga4_connections` (nueva),
  `greenhouse_growth.ga4_oauth_states` (nueva, anti-CSRF single-use)
- Invariantes que no se pueden romper:
  - `ga4_connections.organization_id` es UNIQUE (1 org ↔ 1 property GA4) y FK a `organizations`
  - El refresh token vive SOLO en Secret Manager; PG guarda `token_secret_ref`, nunca el token
  - `status` CHECK `active|revoked|expired|pending`; `invalid_grant`/401/403 → `revoked`
  - El reader nunca lee token de PG: refresca un access token por llamada desde el refresh token
  - El OAuth state es single-use, org-anchored server-side, consumido atómico (`FOR UPDATE`)
- Tenant/space boundary: rutas dual-gate `requireInternalTenantContext` (clientes excluidos) +
  `can(tenant, 'growth.ga4.connect', 'execute', 'tenant')`; `organization_id` deriva del contexto
- Idempotency/concurrency: connect = UPSERT por `organization_id`; state consume atómico; reads
  son stateless (sin escritura salvo update de `status`/`last_error_code` en degradación)
- Audit/outbox/history: reusar el patrón de SC (timestamps + `connected_by_user_id` +
  `last_error_code`); señal de reliability de salud de token (mirror SC token-health)

### Migration, backfill and rollout

- Migration posture: `additive` (2 tablas nuevas + seed de capability; sin tocar tablas existentes)
- Default state: `flag OFF` (`GROWTH_GA4_ENABLED` default false → `oauth/start` y reader resuelven
  `disabled`)
- Backfill plan: `none` (no hay data previa que migrar)
- Rollback path: flag OFF + revert PR; migración additive reversible vía Down (DROP de las 2 tablas
  nuevas, sin pérdida de data productiva)
- External coordination: crear OAuth client GA4 en GCP (consent screen + verification),
  publicar secrets `GOOGLE_GA4_OAUTH_CLIENT_ID(_SECRET_REF)` + `..._CLIENT_SECRET(_SECRET_REF)`,
  grant IAM secret-write a `greenhouse-portal@` sobre prefijo `ga4-token-*`, redeploy

### Security and access

- Auth/access gate: `session + capability growth.ga4.connect + internal tenant` (clientes excluidos
  del connect); reads por reader server-only
- Sensitive data posture: `secrets` (refresh token Google) — resolución server-side por
  `*_SECRET_REF`, nunca en cliente, nunca en logs, nunca en contracts
- Error contract: `canonicalErrorResponse` + `captureWithDomain` (domain growth/integrations);
  GA4 API errors tipados (`Ga4ApiError`), nunca prose cruda al cliente
- Abuse/rate-limit posture: reads server-side gateados por capability; GA4 Data API tiene quotas
  propias — manejar 429 con honest degradation, no retry agresivo

### Runtime evidence

- Local checks: `pnpm test` focal del dominio (`flags.test.ts`, `reader.test.ts`,
  `connection-store` UPSERT, state single-use) + `pnpm lint` + `pnpm typecheck`
- DB/runtime checks: `pnpm migrate:up` en staging + verify tablas/CHECK/UNIQUE con
  `information_schema` (bloque DO en la migración); smoke del OAuth round-trip con cuenta de prueba
- Integration checks: connect real contra una property GA4 de prueba (cuenta Efeonce) → `sites.list`
  equivalente (GA4 Admin API `accountSummaries`) → `select-property` → `runReport` read OK
- Reliability signals/logs: señal de salud de token GA4 (mirror
  `growth-search-console-token-health.ts`); logs `captureWithDomain`
- Production verification sequence: ver Rollout Plan

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumers nombrados con paths reales
- [ ] Invariantes de data, tenant boundary e idempotencia explícitos
- [ ] Migration/backfill/rollback posture explícito y proporcional
- [ ] Evidencia runtime/DB listada para cada cambio más allá de docs
- [ ] Dominio sensible (secrets Google) con errores canónicos, señal de salud y sin leak de token

## Capability Definition of Done — Full API Parity gate

- [ ] Lógica en el primitive `src/lib/growth/analytics-ga4/**`, no en UI
- [ ] Modelada como command/reader (connect/select/disconnect + `readGa4Analytics`), no click-handler
- [ ] Read = reader canónico; write = commands con authz fina, errores canónicos, observabilidad
- [ ] Capability `growth.ga4.connect` + grant a ≥1 rol real + coverage test en el MISMO PR
- [ ] Camino programático declarado (rutas `api/admin/growth/analytics-ga4/*` + reader server-side)
- [ ] Reader apto para consumo por Nexa por construcción; connect gobernado capability-gated
- [ ] Un primitive, muchos consumers (grader/Nexa/UI) sin lógica duplicada
- [ ] Parity check = SÍ

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Schema + capability + flag (foundation)

- Migración `ga4_connections` (UNIQUE `organization_id` FK, `property_id`, `scopes[]`,
  `status` CHECK, `token_secret_ref`, `connected_by_user_id`, audit ts, `last_error_code`) +
  `ga4_oauth_states` (hash, org-anchored, TTL, `consumed_at`) — con bloque DO de verificación
- Capability `growth.ga4.connect` en `entitlements-catalog.ts` + grant en `runtime.ts` +
  coverage test verde
- Flag `GROWTH_GA4_ENABLED` (default OFF) en `src/lib/growth/analytics-ga4/flags.ts` + fila en
  `FEATURE_FLAG_STATE_LEDGER.md`

### Slice 2 — OAuth core + commands + stores

- `contracts.ts` (types + `GA4_SCOPE` analytics.readonly + state TTL; token nunca en contracts)
- `oauth-client.ts` (`OAuth2Client`: `resolveGa4OAuthConfig`, `buildConsentUrl`
  access_type=offline+prompt=consent, `exchangeCodeForTokens`, `refreshAccessToken`)
- `secret-naming.ts` (`buildGa4SecretId(org)` + `buildOperatorGa4SecretId(userId)`)
- `connection-store.ts` (UPSERT por org), `state-store.ts` (single-use atómico)
- `command.ts` (`startGa4Connection`, `completeGa4Connection`, `listGa4PropertiesForOrg`,
  `selectGa4Property`, `disconnectGa4Property`) + `index.ts` barrel

### Slice 3 — API routes

- `api/admin/growth/analytics-ga4/oauth/start/route.ts` (GET → consent URL)
- `.../oauth/callback/route.ts` (GET → exchange + upsert pending)
- `.../properties/route.ts` (GET → dropdown de properties GA4 de la cuenta del operador)
- `.../select-property/route.ts` (POST → bind property a org → active)
- `.../disconnect/route.ts` (POST → revoke)

### Slice 4 — Reader canónico + señal AI-attributed

- `api-client.ts` (REST fetch a GA4 Data API: `runReport`; GA4 Admin API `accountSummaries` para
  el dropdown; `Ga4ApiError` tipado)
- `reader.ts` (`readGa4Analytics(orgId, params)`: sessions/users/conversions por canal +
  segmento **AI-attributed traffic** por `sessionSource`/referrer matching motores de IA) con
  honest degradation
- Señal de reliability de salud de token (mirror SC) + tests

### Slice 5 — Cableado de señal en el grader

- Punto de integración opcional en el run-engine/report del grader: si la org tiene GA4 `active`,
  adjuntar la señal de tráfico real al run/report; si no, skip controlado (sin romper el run)
- Gateado por `GROWTH_GA4_ENABLED` + presencia de conexión activa

## Out of Scope

- **UI del property-picker GA4** (panel en client lifecycle) → follow-up `ui-ux` dedicado
- **Render del eje "tráfico real" en el report visible del grader** → follow-up `ui-ux`
- BigQuery export nativo de GA4 (eventos crudos) — esta task usa la Data API REST, no el export BQ
- Universal Analytics (deprecado) — solo GA4
- Atribución avanzada / data-driven attribution modeling — solo segmentación por source/referrer
- Multi-property por org (1 org ↔ 1 property en V1, igual que SC)

## Detailed Spec

Espejo 1:1 del dominio `src/lib/growth/search-console/**` (TASK-1282). Diferencias materiales:

| Aspecto | Search Console | GA4 (esta task) |
|---|---|---|
| Scope OAuth | `webmasters.readonly` | `analytics.readonly` |
| Dropdown source | `sites.list` (GSC API) | GA4 Admin API `accountSummaries` (properties) |
| Read endpoint | `searchAnalytics.query` | GA4 Data API `properties.runReport` |
| Binding | `site_url` | `property_id` (formato `properties/{id}`) |
| Tabla | `search_console_connections` | `ga4_connections` |
| Flag | `GROWTH_SEARCH_CONSOLE_ENABLED` | `GROWTH_GA4_ENABLED` |
| Capability | `growth.search_console.connect` | `growth.ga4.connect` |
| Secret naming | `ga4-...`→ usar `ga4-token-operator-<userId>` | idem |

**Señal AI-attributed (valor diferencial):** en `runReport`, dimensión `sessionSource` /
`sessionSourceMedium`; clasificar como AI-attributed los referrers de motores de IA
(`chatgpt.com`, `perplexity.ai`, `gemini.google.com`, `claude.ai`, `copilot.microsoft.com`, etc.).
Mantener la lista de hosts de IA como constante versionada en `contracts.ts` (extensible).

`googleapis` NO es dependencia del repo — usar `fetch` a los endpoints REST con `Bearer` access
token (igual que `api-client.ts` de SC). `OAuth2Client` solo para el OAuth dance + refresh.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (schema+capability+flag) → Slice 2 (OAuth+commands) → Slice 3 (routes) → Slice 4 (reader)
- Slice 5 (cableado al grader) MUST ship DESPUÉS de Slice 4 (reader estable) y queda detrás del flag
- La capability (Slice 1) DEBE shippear con su grant + coverage test en el mismo PR (gate CI)
- No prender `GROWTH_GA4_ENABLED` en prod hasta OAuth client verificado + secrets + IAM grant

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Refresh token leak a PG/logs | secrets | medium | token solo en Secret Manager; lint no-token-in-pg; review | grep en review + captureWithDomain sin token |
| Consent screen GA4 no verificado bloquea prod | integration | medium | flag OFF en prod hasta verificación Google; staging primero | `oauth/start` retorna disabled |
| GA4 Data API quota 429 | integration | medium | honest degradation, no retry agresivo, cache corto | `token_unhealthy`/rate-limit en logs |
| Run del grader rompe si GA4 falla | grader/run-engine | low | señal opcional + skip controlado; flag gate | run sigue `succeeded` sin señal GA4 |
| IAM secret-write faltante a `ga4-token-*` | identity/secrets | medium | grant explícito pre-flip; verify en staging | `createOrAddSecretVersion` 403 |
| Property equivocada bindeada a org | data | low | UNIQUE org + confirm en select-property; audit `connected_by` | revisión de fila + last_error |

### Feature flags / cutover

- `GROWTH_GA4_ENABLED` (default OFF). OFF → `oauth/start` y reader resuelven `disabled`/skip.
  Flip a ON en staging tras smoke verde; en prod solo tras OAuth client verificado + secrets + IAM.
  Revert: env var a OFF + redeploy (<5 min vía Vercel). Registrar en el ledger.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | `pnpm migrate:down` (DROP 2 tablas nuevas) + revert PR | <10 min | sí (additive) |
| Slice 2 | revert PR (código nuevo, sin estado productivo) | <5 min | sí |
| Slice 3 | revert PR + rutas gateadas por flag | <5 min | sí |
| Slice 4 | revert PR; reader solo lee | <5 min | sí |
| Slice 5 | flag OFF (skip de la señal) o revert PR | <5 min | sí |

### Production verification sequence

1. `pnpm migrate:up` staging + verify tablas/CHECK/UNIQUE (`information_schema` / bloque DO).
2. Deploy code staging con flag OFF + verify rutas existentes intactas.
3. Publicar secrets OAuth GA4 + IAM grant `ga4-token-*` en staging.
4. Flip flag ON staging + connect real contra property GA4 de prueba (cuenta Efeonce) →
   verify select-property → `runReport` read OK → reader retorna data + segmento AI-attributed.
5. Verify honest degradation: revocar token de prueba → conexión `revoked` + `token_unhealthy`.
6. Repetir 1-5 en producción con cooldown 24h; flag ON prod solo tras consent screen verificado.
7. Monitorear señal de salud de token 7d post-prod.

### Out-of-band coordination required

- Crear OAuth client GA4 en GCP console (consent screen + scopes + verification de Google).
- Publicar secrets `GOOGLE_GA4_OAUTH_CLIENT_ID(_SECRET_REF)` + `..._CLIENT_SECRET(_SECRET_REF)`
  + opcional `GOOGLE_GA4_OAUTH_REDIRECT_URI`.
- IAM: grant secret-write a `greenhouse-portal@` sobre prefijo `ga4-token-*`.
- Cada cliente debe consentir el acceso a su property GA4 (o el operador, según el modelo
  operator-token de SC) — coordinación comercial/onboarding.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Una org puede conectar su property GA4 vía OAuth read-only; binding UNIQUE por `organization_id`
- [ ] El refresh token vive SOLO en Secret Manager; la fila PG guarda `token_secret_ref`, nunca el token
- [ ] `readGa4Analytics(orgId, params)` retorna sessions/users/conversions por canal + segmento
      AI-attributed, con honest degradation (`disabled`/`not_connected`/`token_unhealthy`)
- [ ] Capability `growth.ga4.connect` existe en registry + catalog + grant a ≥1 rol real;
      coverage test verde
- [ ] Flag `GROWTH_GA4_ENABLED` default OFF; con OFF, rutas y reader resuelven disabled sin crash;
      fila en `FEATURE_FLAG_STATE_LEDGER.md`
- [ ] La señal GA4 se adjunta al run/report del grader solo si la org tiene conexión activa + flag ON;
      runs sin GA4 quedan idénticos
- [ ] Rutas dual-gate (internal tenant + capability); clientes excluidos del connect
- [ ] Migración additive verificada en staging (tablas/CHECK/UNIQUE existen); rollback `migrate:down` OK

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` (full suite — incluye coverage test de capability)
- `pnpm build`
- `pnpm migrate:up` en staging + verify schema
- Connect real contra property GA4 de prueba (integration smoke)

## Closing Protocol

- [ ] `Lifecycle` sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta (`to-do/` → `in-progress/` → `complete/`)
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (TASK-1282, grader run-engine/report)
- [ ] `FEATURE_FLAG_STATE_LEDGER.md` con la fila del flag (gate `docs:closure-check`)
- [ ] documentación triple proporcional (técnica + funcional + manual) del nuevo connector

## Follow-ups

- **TASK ui-ux** — Panel property-picker GA4 en client lifecycle (mirror de
  `SearchConsoleConnectionPanel.tsx`) + estados connect/active/revoked
- **TASK ui-ux** — Render del eje "tráfico real / AI-attributed traffic" en el report del grader
- Evaluar export nativo GA4→BigQuery como segunda fuente (histórico/joins) si la Data API REST
  se queda corta en volumen o se necesitan joins con data interna

## Open Questions

- ¿Modelo de credencial: token de operador reusable (como terminó SC) o token per-cliente? Confirmar
  con el patrón vivo de TASK-1282 al tomar la task (`[verificar]` el flujo final del property-picker).
- ¿La lista de hosts de motores de IA para el segmento AI-attributed se comparte con los probes
  `entity` (TASK-1267) o se mantiene independiente en `analytics-ga4/contracts.ts`?
- ¿La señal GA4 entra al scoring del grader o solo se muestra como contexto (no afecta el score)?
  Decisión de producto a confirmar antes del Slice 5.
