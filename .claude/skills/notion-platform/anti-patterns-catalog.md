# Anti-patterns canonical — Notion API + Developer Platform

> **30+ anti-patterns prohibidos**, cada uno con razón canonical + alternativa
> **Last verified**: 2026-07-18

## 1. API + Authentication

### AP-01: Hardcoded token en TS / `.env` committed
- ❌ `const token = 'secret_abc123...'`
- ❌ `.env` con `NOTION_TOKEN=secret_...` committed
- ✅ GCP Secret Manager + `resolveSecret(SECRET_REF)`
- **Por qué**: leak garantizado, no rotation, expone audit

### AP-02: PAT en path productivo automatizado
- ❌ Worker productivo o sync cron usando PAT del developer
- ✅ Internal Integration Token (bot identity estable)
- **Por qué**: PAT es user-scoped — contamina audit, revoke cuando user sale

### AP-03: Sin `Notion-Version` header
- ❌ `fetch('https://api.notion.com/...', { headers: { Authorization } })`
- ✅ `headers: { ..., 'Notion-Version': '2026-03-11' }`
- **Por qué**: 400 garantizado

### AP-04: `Notion-Version` inline múltiple
- ❌ Cada handler con su propio `'Notion-Version': '...'`
- ✅ Single constant `NOTION_VERSION_CANONICAL` en wrapper canonical
- **Por qué**: bump cross-codebase no sync

## 2. Webhooks

### AP-05: Parsear body antes de HMAC verify
- ❌ `const event = await request.json(); verifyHmac(JSON.stringify(event), ...)`
- ✅ `const raw = await request.text(); verifyHmac(raw, ...); const event = JSON.parse(raw)`
- **Por qué**: stringify puede diferir del raw (whitespace, key order) → signature mismatch

### AP-06: `===` compare de HMAC hex
- ❌ `receivedHex === expectedHex`
- ✅ `timingSafeEqual(Buffer.from(receivedHex, 'hex'), Buffer.from(expectedHex, 'hex'))`
- **Por qué**: timing attack vulnerability

### AP-07: Sin echo-loop filter en webhook handler
- ❌ Procesar todos los events sin distinguir authors
- ✅ Drop si `event.authors.every(a => a.id === OUR_INTEGRATION_USER_ID)`
- **Por qué**: Greenhouse escribe `[GH] X` → webhook dispara → recompute → infinite loop → rate limit cascade

### AP-08: Confiar payload webhook como source of truth
- ❌ `const newValue = event.data.properties['Status'].select.name`
- ✅ Re-fetch `GET /v1/pages/{id}` antes de compute
- **Por qué**: payload puede estar stale, may not contain values, aggregated events comprimen

### AP-09: Webhook handler que hace compute pesado sync
- ❌ Compute + Notion PATCH + DB write dentro del request del webhook
- ✅ Webhook → outbox emit → return 200 < 1s → reactive consumer defer
- **Por qué**: 10s budget Notion → timeout → retry → duplicación

### AP-10: Catch + return 200 cuando algo falla
- ❌ `try { ... } catch { return 200 }`
- ✅ Return appropriate status (401, 400, 500) — Notion reintentará
- **Por qué**: 200 dice "delivered ok" → Notion no reintenta → eventos perdidos

### AP-11: Skip HMAC en staging
- ❌ `if (env === 'staging') return /* skip verify */`
- ✅ Mismas rules cross-env, secrets distintos
- **Por qué**: staging es prod-shape — bypass entrena hábito malo

### AP-12: Loggear `verification_token` o signature header
- ❌ `console.log({ token: req.body.verification_token })`
- ❌ `console.log({ signature: signatureHeader })`
- ✅ NUNCA loggees — son secrets
- **Por qué**: leak en logs persistentes

## 3. Compute + Writeback

### AP-13: Crear formula property en Notion para métrica crítica ICO
- ❌ Notion property formula `if(prop("Status") == "Aprobado" && prop("Correcciones") == 0, "pass", "fail")`
- ✅ Compute en Greenhouse + writeback a `[GH] FTR` property number
- **Por qué**: formulas Notion son editables sin git, sin tests, sin observability → bug class TASK-877

### AP-14: PATCH inline en route handler Vercel
- ❌ Route handler que llama `notion.pages.update(...)` síncrono
- ✅ Route handler emite outbox → reactive consumer + Cloud Tasks defer
- **Por qué**: Notion rate limits + 5xx pueden bloquear el route handler que Greenhouse necesita responder rápido al cliente

### AP-15: Bulk PATCH asumiendo endpoint `/v1/pages/bulk` existe
- ❌ TASK-901 spec menciona endpoint NO documentado al 2026-05-17
- ✅ Sequential throttled via Cloud Tasks (Alternativa A canonical)
- **Por qué**: build-on-air si endpoint resulta no existir

### AP-16: `Promise.all([...500 requests])` sin throttling
- ❌ `await Promise.all(pages.map(p => notion.pages.update(p)))` con 500 items
- ✅ Cloud Tasks queue @ 2.5 req/sec (Alternativa A) o `p-limit(3)` para discovery only
- **Por qué**: 429 cascade + dead-letter pileup

### AP-17: Retry sin backoff o sin honor `Retry-After`
- ❌ `for { try; catch { continue } }` loop tight
- ✅ Honor `Retry-After` header + exponential backoff + jitter
- **Por qué**: empeoras rate limit penalty

### AP-18: Sin audit trail de writeback
- ❌ PATCH → response 200 → no log
- ✅ Persist `notion_metrics_writeback_log` row antes y después
- **Por qué**: imposible auditar drift, debug, o recovery

### AP-19: Inline RpA calculation
- ❌ `const rpa = correcciones / numAssets` en consumer downstream
- ✅ Solo `calculateRpa(taskId)` canonical helper
- **Por qué**: lint rule `greenhouse/no-inline-rpa-calculation` lo bloquea — drift garantizado sino

## 4. Observability

### AP-20: `Sentry.captureException()` directo
- ❌ `Sentry.captureException(err)` en code path Notion
- ✅ `captureWithDomain(err, 'integrations.notion', { tags: { source: '...', stage: '...' } })`
- **Por qué**: sin domain tag, signal per-module rollup invisible

### AP-21: Loggear payload completo webhook
- ❌ `console.log({ payload: webhookBody })`
- ✅ `console.log({ event_id, type, page_id })` + redact rest
- **Por qué**: PII property values possibles + audit log noise

### AP-22: Sin reliability signal para failure modes
- ❌ Reactive consumer falla silente → operador no se entera
- ✅ Signal `notion.metrics.<path>_dead_letter` wire-up
- **Por qué**: invisible failures = bug class TASK-877 mode

## 5. Operational

### AP-23: Skip pre-flight para Workers production use
- ❌ Deploy Worker a path productivo sin validar Beta status + sandbox limits + Sentry gap
- ✅ Workers solo para discovery/non-critical hasta GA + investigation gaps closed
- **Por qué**: Beta = liability sin SLA, observability gap = ceguera

### AP-24: Cross-env secret reuse
- ❌ Mismo `notion-integration-token` para prod + staging + demo
- ✅ Token per env, secret per tenant
- **Por qué**: blast radius en caso de leak, audit confusion

### AP-25: Borrar formula legacy pre-90d post-flip
- ❌ Post TASK-901 S6 verde día 7 → eliminar formula `RpA` Notion
- ✅ Mantener mínimo 90 días post-flip + 0 alerts + HR/Finance sign-off escrito
- **Por qué**: rollback ventana cerrada irreversible

## 6. Schema / Versioning

### AP-26: `/v1/databases/{id}/query` para code nuevo
- ❌ Endpoint legacy deprecated desde 2025-09-03
- ✅ `/v1/data_sources/{id}/query` canonical
- **Por qué**: deprecation eventual + features nuevas solo en canonical

### AP-27: Bump `Notion-Version` en producción sin shadow mode
- ❌ Update constant + deploy directo
- ✅ Shadow mode 7+ días + tests anti-regresión + audit ADR
- **Por qué**: breaking changes posibles (mira 2026-03-11 changelog)

### AP-28: Asumir property name estable cross-tenant
- ❌ Hardcode `'Status'` para todos los tenants
- ✅ Check aliases en Discovery (Efeonce `Status` vs Sky `Estado`)
- **Por qué**: tenants pueden personalizar nombres

## 7. Work management + Enhanced Markdown

### AP-29: Inferir teamspace por prefijo de ID
- ❌ Parsear los primeros caracteres de un page/data source ID para decidir cliente o autorización
- ✅ Resolver alias → `space_id` → registry → scoped token + exact data source ID
- **Por qué**: los IDs son opacos y el prefijo no expresa ownership

### AP-30: Redescubrir schema y destino en cada delegación
- ❌ Buscar databases y adivinar properties en cada conversación
- ✅ Registry persistido con property IDs, tipos, readiness y schema fingerprint
- **Por qué**: desperdicia tokens, añade latencia y permite writes inconsistentes

### AP-31: Crear subtarea como subpage
- ❌ Anidar una página visualmente dentro del body de otra
- ✅ Page del mismo Tasks data source con self-relation parent/children
- **Por qué**: subpage no conserva query, properties ni progreso recursivo gobernado

### AP-32: Interpolar Enhanced Markdown manualmente
- ❌ Concatenar callouts, XML y contenido del usuario desde el agente
- ✅ DTO validado → renderer cerrado → linter → payload
- **Por qué**: tabs, escaping e inyección producen bodies inválidos o ambiguos

### AP-33: Usar `last_edited_time` como avance
- ❌ Reportar que una tarea avanzó porque fue editada
- ✅ Comparar status/result/DoD gobernados contra el ledger observado
- **Por qué**: una edición puede ser cosmética o ajena al progreso

### AP-34: Marcar completada sin resultado
- ❌ Status terminal con body/evidencia vacíos
- ✅ Estado `completion_incomplete` hasta cumplir resultado y evidencia exigida
- **Por qué**: el status por sí solo no demuestra que el entregable existe

### AP-35: Elegir silenciosamente un destino ambiguo
- ❌ Default global persistente para todas las conversaciones
- ✅ Inferir solo con evidencia unívoca; si quedan varios spaces, preguntar una vez
- **Por qué**: una operación válida en el workspace equivocado sigue siendo pérdida de integridad

## 8. Cross-refs

Todos los anti-patterns están cross-referenced con:
- `api-reference/*` — endpoint canonical
- `patterns-canonical/*` — pattern correcto
- `developer-platform-2026/*` — capabilities relevantes
- `greenhouse-runtime/*` — runtime specifics
- `decision-frameworks/*` — decision frameworks que aplican

Cualquier anti-pattern detectado durante code review debe ser fix + commit con referencia a este catálogo.
