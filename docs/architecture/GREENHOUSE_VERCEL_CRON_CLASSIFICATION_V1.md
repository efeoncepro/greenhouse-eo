# GREENHOUSE_VERCEL_CRON_CLASSIFICATION_V1

> **Tipo de documento:** Spec arquitectónica canónica
> **Versión:** 1.0
> **Creado:** 2026-05-03 por TASK-775
> **Última actualización:** 2026-05-03 por TASK-775
> **Tasks relacionadas:** TASK-262 (absorbida por TASK-773), TASK-258 + TASK-259 (absorbidas por TASK-775), TASK-773 (outbox publisher cutover), TASK-775 (este doc)

## Por qué existe esta spec

El incidente Figma del 2026-05-03 ("pago Figma no rebajaba TC Santander Corp en staging") reveló una **clase de bugs invisibles**: cualquier cron Vercel que toque path async-critical **no se ejecuta en staging** (Vercel custom environments NO ejecutan crons; solo Production). El pipeline de outbox quedaba colgado en `pending` para siempre, y el operador en QA creía que la app funcionaba porque "el endpoint API responde 200".

TASK-773 cerró el caso `outbox-publish` puntual. TASK-775 escala el patrón a **toda decisión "dónde vive un cron"** mediante 3 categorías canónicas + helper de migración + reliability signal + lint gate.

## Las 3 categorías canónicas

Cada cron del portal Greenhouse pertenece a exactamente UNA de estas categorías:

### `async_critical`

Definición: cron cuya ejecución **alimenta o consume** un pipeline async (outbox, projection, materializer, sync downstream) que el portal usa en múltiples ambientes para QA/dev/operación.

Características:
- Si NO se ejecuta, el flow downstream se rompe silenciosamente.
- Operadores y QA dependen de que corra en staging (no solo prod).
- Requiere reliability signal automático que detecte caída.
- Su falla genera "el contract API funciona pero el side effect calla" — la peor clase de bug.

**Hosting canónico**: Cloud Scheduler + ops-worker. NO Vercel cron.

Ejemplos:
- `outbox-publish` (mover events PG → BQ raw)
- `outbox-react-*` (consumir events para projections)
- `email-deliverability-monitor` (emitir alerts de delivery)
- `nubox-balance-sync` (proyectar balances Nubox a PG con outbox event)
- `sync-conformed*` (Notion conformed pipeline)
- `entra-profile-sync` (avatars + identity link)
- `entra-webhook-renew` (Microsoft webhook subscriptions)
- `webhook-dispatch` (outbound webhooks)
- `email-delivery-retry` (retry envíos fallidos)
- `hubspot-*-sync` (CRM sync)
- `nubox-sync*` (Nubox financials)
- `reconciliation-auto-match` (finance ops)

### `prod_only`

Definición: cron cuya ejecución solo importa en producción real, y cuya ausencia en staging NO afecta QA.

Características:
- Tiene side effects en producción que NO tienen sentido replicar en staging (e.g., compliance, GDPR cleanup, FX rates externos pública).
- Operadores QA NO dependen de su ejecución para validar features.
- Sin operador esperando ver el resultado en staging.

**Hosting canónico**: Vercel cron (legítimo). No requiere Cloud Scheduler.

Ejemplos:
- `email-data-retention` (limpieza GDPR semanal — solo aplica en prod por privacy)
- `sync-previred` (Chile previred — tabla compartida prod-only)
- `fx-sync-latam` (rates externos públicos — staging puede usar snapshot)
- `economic-indicators/sync` (indicadores macro Chile — públicos)

### `tooling`

Definición: cron utilitario para developers, QA, monitoreo o sanity checks. No tiene side effects en datos operacionales.

Características:
- Su salida es para humanos (logs, alertas, dashboards) o para tests.
- No alimenta projections downstream ni emite outbox events.
- Si falla, nadie pierde datos — pierde insight temporal.

**Hosting canónico**: Vercel cron (legítimo). Cloud Scheduler también acepta pero no es necesario.

Ejemplos:
- `reliability-synthetic` (synthetic monitor)
- `notion-delivery-data-quality` (data quality probes — read-only)
- `ico-member-sync` (sync de read-only metrics)
- `ico-materialize` (legacy — moved to `ico-materialize-daily` Cloud Scheduler; el endpoint Vercel queda como fallback `tooling`)

---

## Decision tree para nuevo cron

```text
                  ┌─────────────────────────┐
                  │  ¿El cron alimenta o    │
                  │  consume un pipeline    │
                  │  async (outbox, sync,   │
                  │  projection, etc.)?     │
                  └─────────┬───────────────┘
                            │
                  ┌─────────┴────────┐
                  │ SÍ               │ NO
                  ▼                  ▼
     ┌────────────────────┐    ┌──────────────────────┐
     │ ¿QA depende de que │    │ ¿La salida es para   │
     │ corra en staging?  │    │ humanos o tests?     │
     └─────────┬──────────┘    │ (logs, dashboards,   │
               │               │  monitoring)         │
       ┌───────┴────────┐      └──────┬───────────────┘
       │ SÍ             │ NO          │
       ▼                ▼             │
                                      ▼
  async_critical    prod_only      tooling
  (Cloud Sched)     (Vercel)       (Vercel ok)
```

**Regla de oro**: en duda → `async_critical`. Es la opción más segura — Cloud Scheduler funciona en cualquier environment y el costo extra es mínimo.

---

## Inventario actual (post-TASK-775)

| Cron path | Categoría | Hosting | Cloud Scheduler equivalent |
|---|---|---|---|
| `/api/cron/outbox-publish` | `async_critical` | Cloud Scheduler | `ops-outbox-publish` (TASK-773) |
| `/api/cron/outbox-react*` (7) | `async_critical` | Cloud Scheduler | `ops-reactive-{organization,delivery,notifications,cost-intelligence,people,finance}` (TASK-254) |
| `/api/cron/sync-conformed` | `async_critical` | Cloud Scheduler | `ops-notion-conformed-sync` |
| `/api/cron/sync-conformed-recovery` | `async_critical` | Cloud Scheduler | `ops-notion-conformed-recovery` (TASK-775 Slice 7) |
| `/api/cron/email-deliverability-monitor` | `async_critical` | Cloud Scheduler | `ops-email-deliverability-monitor` (TASK-775 Slice 2) |
| `/api/cron/nubox-balance-sync` | `async_critical` | Cloud Scheduler | `ops-nubox-balance-sync` (TASK-775 Slice 3) |
| `/api/cron/entra-profile-sync` | `async_critical` | Cloud Scheduler | `ops-entra-profile-sync` (TASK-775 Slice 7) |
| `/api/cron/entra-webhook-renew` | `async_critical` | Cloud Scheduler | `ops-entra-webhook-renew` (TASK-775 Slice 7) |
| `/api/cron/webhook-dispatch` | `async_critical` | Cloud Scheduler | `ops-webhook-dispatch` (TASK-775 Slice 7) |
| `/api/cron/email-delivery-retry` | `async_critical` | Cloud Scheduler | `ops-email-delivery-retry` (TASK-775 Slice 7) |
| `/api/cron/hubspot-companies-sync` | `async_critical` | Cloud Scheduler | `ops-hubspot-companies-sync*` (TASK-775 Slice 7) |
| `/api/cron/hubspot-deals-sync` | `async_critical` | Cloud Scheduler | `ops-hubspot-deals-sync` (TASK-775 Slice 7) |
| `/api/cron/hubspot-products-sync` | `async_critical` | Cloud Scheduler | `ops-hubspot-products-sync` (TASK-775 Slice 7) |
| `/api/cron/hubspot-quotes-sync` | `async_critical` | Cloud Scheduler | `ops-hubspot-quotes-sync` (TASK-775 Slice 7) |
| `/api/cron/hubspot-company-lifecycle-sync` | `async_critical` | Cloud Scheduler | `ops-hubspot-company-lifecycle-sync` (TASK-775 Slice 7) |
| `/api/cron/nubox-sync` | `async_critical` | Cloud Scheduler | `ops-nubox-sync` (TASK-775 Slice 7) |
| `/api/cron/nubox-quotes-hot-sync` | `async_critical` | Cloud Scheduler | `ops-nubox-quotes-hot-sync` (TASK-775 Slice 7) |
| `/api/cron/reconciliation-auto-match` | `async_critical` | Cloud Scheduler | `ops-reconciliation-auto-match` (TASK-775 Slice 7) |
| `/api/cron/quotation-lifecycle` | `async_critical` (duplicado) | Cloud Scheduler | `ops-quotation-lifecycle` (eliminar Vercel duplicado) |
| `/api/cron/ico-materialize` | `tooling` (legacy duplicado) | Cloud Scheduler | `ico-materialize-daily` (eliminar Vercel duplicado) |
| `/api/cron/email-data-retention` | `prod_only` | Vercel | — |
| `/api/cron/sync-previred` | `prod_only` | Vercel | — |
| `/api/cron/fx-sync-latam` (3 windows) | `prod_only` | Vercel | — |
| `/api/cron/economic-indicators/sync` (finance) | `prod_only` | Vercel | — |
| `/api/cron/reliability-synthetic` | `tooling` | Vercel | — |
| `/api/cron/notion-delivery-data-quality` | `tooling` | Vercel | — |
| `/api/cron/ico-member-sync` | `tooling` | Vercel | — |

**Resumen**: 16 `async_critical` migrados/migrando + 7 `prod_only`/`tooling` legítimos en Vercel + 2 duplicados a eliminar.

---

## Reglas duras anti-regresión

### 1. NUNCA agregar `async_critical` a `vercel.json`

Cualquier nuevo cron `async_critical` debe nacer directo en `services/ops-worker/deploy.sh` con su Cloud Scheduler job. La lint rule `greenhouse/no-vercel-cron-for-async-critical` (TASK-775 Slice 6) bloquea en CI las entradas Vercel con paths matching patterns canónicos:

- `/api/cron/outbox*`
- `/api/cron/sync-*`
- `/api/cron/*-publish`
- `/api/cron/webhook-*`
- `/api/cron/hubspot-*`
- `/api/cron/entra-*`
- `/api/cron/nubox-*`
- `/api/cron/*-monitor` (típicamente emisores de outbox)

### 2. Override block legítimo solo con justificación

Si un cron matchea el pattern pero es legítimo `prod_only` (ej. una integración externa que solo tiene contract en producción), agregar comentario JSON adyacente:

```jsonc
{
  "crons": [
    // platform-cron-allowed: foo-sync requires production-only API key
    { "path": "/api/cron/foo-sync", "schedule": "..." }
  ]
}
```

### 3. Reliability signal `platform.cron.staging_drift` siempre activo

Detecta automáticamente:
- Crons `async_critical` en `vercel.json` sin equivalent Cloud Scheduler (drift "olvidé migrar")
- Crons Cloud Scheduler sin equivalent Vercel `route.ts` fallback (drift "eliminé fallback")
- Diferencias de schedule entre los 2 hosts

Steady state = 0. Severity = error si drift > 0. Visible en `/admin/operations`.

### 4. Cuando emerja un cron nuevo

1. Aplicar decision tree → categorizar como `async_critical`, `prod_only`, o `tooling`.
2. Si `async_critical`:
   - Crear handler en `services/ops-worker/server.ts` (importar lógica existente, NO reimplementar)
   - Agregar `upsert_scheduler_job` en `services/ops-worker/deploy.sh`
   - NO agregar entry en `vercel.json` (la lint rule lo bloquea)
3. Si `prod_only` o `tooling`:
   - Agregar entry en `vercel.json` con override comment si matchea pattern async-critical
4. Actualizar este documento (tabla del Inventario) con la nueva entrada.

---

## Helper canónico de migración

`services/ops-worker/cron-handler-wrapper.ts` provee un wrapper opcional que reduce boilerplate al migrar crons. Patrón canónico:

```typescript
// Antes (Vercel route.ts):
export async function GET(request: Request) {
  const auth = await requireCronAuth(request)
  if (auth.errorResponse) return auth.errorResponse

  try {
    const result = await mySpecificLogic()
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    await alertCronFailure('my-cron', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

// Después (ops-worker handler):
const handleMyCron = wrapCronHandler({
  name: 'my-cron',
  domain: 'sync',  // categoría captureWithDomain
  run: async (body) => mySpecificLogic(body)
})

// Dispatcher:
if (method === 'POST' && path === '/my-cron') {
  await handleMyCron(req, res)
}
```

El wrapper centraliza:
- `readBody` parsing
- `captureWithDomain` con tag canónico
- `console.log` start/end con `runId` + duración
- `json()` response shape consistente
- 502 con error sanitizado en failure

Reusar siempre que la lógica del cron sea 1-step. Para crons multi-step (ej. `nubox-sync` con 3 fases), usar el patrón `handleNotionConformedSync` (handler ad-hoc con orquestación inline).

---

## Referencias

- TASK-262 (absorbida) → `docs/tasks/complete/TASK-262-migrate-outbox-publish-to-ops-worker.md`
- TASK-773 (publisher canónico) → `docs/tasks/complete/TASK-773-outbox-publisher-cloud-scheduler-cutover.md`
- TASK-775 (este programa) → `docs/tasks/in-progress/TASK-775-vercel-cron-async-critical-migration-platform.md`
- Cloud Run `ops-worker` → `services/ops-worker/server.ts` + `services/ops-worker/deploy.sh`
- Reliability signal → `src/lib/reliability/queries/cron-staging-drift.ts` (TASK-775 Slice 5)
- Lint gate → `scripts/ci/vercel-cron-async-critical-gate.mjs` (TASK-775 Slice 6)
