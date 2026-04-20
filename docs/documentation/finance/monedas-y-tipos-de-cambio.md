# Monedas y Tipos de Cambio — Foundation Plataforma

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.1
> **Creado:** 2026-04-19 por Claude (TASK-475 close-out)
> **Ultima actualizacion:** 2026-04-19 por Claude (TASK-484 — plataforma de provider adapters)
> **Documentacion tecnica:**
> - Spec canónica: [GREENHOUSE_FX_CURRENCY_PLATFORM_V1](../../architecture/GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md)
> - Finance architecture: [GREENHOUSE_FINANCE_ARCHITECTURE_V1](../../architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md)
> - Sync pipelines: [GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1](../../architecture/GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1.md)
> - Tasks: [TASK-475 — Greenhouse FX & Currency Platform Foundation](../../tasks/complete/TASK-475-greenhouse-fx-currency-platform-foundation.md) · [TASK-484 — FX Provider Adapter Platform](../../tasks/in-progress/TASK-484-fx-provider-adapter-platform.md)

## Para qué sirve

Greenhouse trabaja en varios "mundos" de moneda al mismo tiempo: la contabilidad core en CLP/USD, el cotizador que vende en USD/CLP/CLF/COP/MXN/PEN, y la reportería que siempre muestra números en CLP para comparar. Este documento explica cómo la plataforma maneja ese lío sin que el Account Lead, el Finance Admin o el Controller tengan que saber de tipos de cambio — y sin que nadie se entere tarde de que cotizó con una tasa vieja.

## El problema que resuelve

Antes de esta foundation cada surface tenía su propia lista de monedas soportadas y su propia lógica de fallback cuando una tasa faltaba. El efecto práctico:

- Un AE cotizaba a Pinturas Berel en MXN y el cotizador mostraba total $0 o un total calculado con una tasa de hace 2 semanas sin decirlo.
- Finance no tenía forma rápida de responder "¿estamos cubiertos en COP hoy?" sin abrir BigQuery.
- Agregar una moneda nueva requería tocar 5 archivos distintos y esperar que nadie se olvidara de uno.

La foundation deja una sola respuesta para todas esas preguntas.

## Qué hace por ti

| Si eres... | Esto es lo que ganas |
|---|---|
| **Account Lead** | Si cotizas en una moneda sin cobertura, el cotizador te avisa antes de enviar (chip rojo "Crítico") en vez de devolver totales silenciosamente mal. |
| **Finance Admin** | Tienes una API y un contrato claro de "qué monedas están soportadas, cuáles están stale, cuáles faltan sync". Un endpoint, una respuesta. |
| **Controller** | Sabes que reportería y P&L siguen normalizados a CLP (no se contaminan con multi-currency por un bug de cotizador). Boundary declarada. |
| **Dev futuro** | Agregar una moneda nueva son 3 edits en archivos declarativos. No hay hardcodes escondidos. |

## Cómo funciona (vista de alto nivel)

### 1. Matriz de soporte por dominio

Greenhouse tiene 4 dominios de moneda. Cada uno declara qué monedas acepta:

| Dominio | Monedas soportadas | Para qué |
|---|---|---|
| `finance_core` | `CLP`, `USD` | Contabilidad transaccional (income, expense, payroll, banco, reconciliación) |
| `pricing_output` | `USD`, `CLP`, `CLF`, `COP`, `MXN`, `PEN` | Superficie comercial (quotes, PDF, email al cliente) |
| `reporting` | `CLP` | P&L, metric registry, ICO engine — todo normalizado a CLP |
| `analytics` | `CLP` | Cost intelligence, capacity economics |

Esta matriz está declarada una sola vez en `src/lib/finance/currency-domain.ts`. Si un consumer intenta usar `MXN` en `finance_core` la plataforma rechaza explícitamente — no calcula con una tasa neutral silenciosa.

### 2. Política FX por dominio

Cada dominio tiene una política FX default que responde "¿cuándo se congela la tasa?":

- `finance_core` → **`rate_at_event`** — al reconocer la transacción.
- `pricing_output` → **`rate_at_send`** — al enviar la cotización al cliente.
- `reporting` / `analytics` → **`rate_at_period_close`** — la tasa del cierre de período dicta el plano comparable.

### 3. Contrato de readiness (¿la tasa está disponible?)

Cualquier consumer que necesite saber si un par de monedas está cubierto llama a un resolver canónico y recibe un estado clasificado:

- **`supported`** → hay tasa, está fresca, se puede snapshot.
- **`supported_but_stale`** → hay tasa pero es más vieja que el umbral del dominio (7 días para pricing, 31 para reporting). Usable con aviso.
- **`unsupported`** → el par no está declarado para este dominio. Hard deny.
- **`temporarily_unavailable`** → el par sí está declarado pero no hay tasa cargada (sync automático falló, moneda sin provider, backfill pendiente). Acción: Finance Admin sube tasa manual.

El resolver **nunca explota** con error cuando falta una tasa. Siempre devuelve un estado y el consumer decide: bloquear envío, mostrar aviso, o permitir con override.

### 4. Registro de monedas

Cada moneda está declarada con su política operativa en `currency-registry.ts`. TASK-484 extendió el registry con `providers: { primary, fallbacks[], historical? }` — cada par tiene ahora una cadena de adapters ordenados (no un string único):

| Moneda | Cobertura (hoy) | Provider primario | Fallbacks | Sync cadence |
|---|---|---|---|---|
| `CLP` | `auto_synced` | Mindicador | OpenER | diario 23:05 UTC |
| `USD` | `auto_synced` | Mindicador | OpenER | diario 23:05 UTC |
| `CLF` | `manual_only`* | `clf_from_indicators` (lee UF de `economic_indicators`) | — | on-demand |
| `COP` | `manual_only`* | Socrata TRM (Banco República de Colombia) | Fawaz Ahmed CDN | diario 09:00 UTC (tras flip) |
| `MXN` | `manual_only`* | Banxico SIE FIX (SF43718) | Frankfurter → Fawaz Ahmed | diario 22:00 UTC (tras flip) |
| `PEN` | `manual_only`* | apis.net.pe SUNAT SBS | BCRP → Fawaz Ahmed | diario 14:00 UTC (tras flip) |

*Los adapters ya están wireados post-TASK-484 y las cron routes corriendo; lo que falta es flipear `coverage` a `auto_synced` en el registry. Eso queda para un **PR separado** después de 24–48h de dry-run verificado en staging. Hasta entonces el pricing engine sigue emitiendo `fx_fallback — Crítico` para esas monedas aunque la tasa ya se esté poblando.

**Qué significa "manual_only"**: la moneda está soportada comercialmente (se puede elegir en el cotizador). Finance Admin puede cargar tasas manuales cuando se necesitan. El cotizador avisa al AE que el par no está auto-cubierto — aun cuando el sync automático ya esté corriendo en background, porque hasta el flip el contrato declara que no es confiable para producción.

### 5. Cómo opera el sync diario (TASK-484)

Hay 4 ventanas de cron que mantienen el registro de tasas fresco, cada una calibrada al horario en que la fuente oficial publica:

| Hora UTC | Qué sincroniza | Por qué esa hora |
|---|---|---|
| 09:00 UTC | USD↔COP (+ refresh CLF como efecto) | El Banco República de Colombia publica la TRM del día muy temprano en Colombia; 09:00 UTC garantiza tener la tasa del día hábil en curso. |
| 14:00 UTC | USD↔PEN | SUNAT publica la tasa SBS venta durante la mañana en Perú; 14:00 UTC (9:00 hora peruana) captura la publicación fresca. |
| 22:00 UTC | USD↔MXN | Banxico publica la tasa FIX durante la jornada mexicana pero estabiliza al cierre; 22:00 UTC es la ventana segura. |
| 23:05 UTC | USD↔CLP | Ventana existente de `economic-indicators`; no se tocó. Mindicador publica tarde en el día chileno. |

Cada cron ejecuta el orchestrator `syncCurrencyPair()`: consulta el registry, intenta el provider primario, si falla (timeout, 5xx, validación) baja al siguiente fallback, y persiste con un solo transaction PG+outbox. Si toda la cadena falla emite un evento `finance.fx_sync.all_providers_failed` al outbox para que se pueda alertar.

### 6. Runbook — cuando un par falla

Si el pricing engine muestra `fx_fallback` persistente o Finance sospecha que una moneda no se está sincronizando:

**Paso 1 — revisar las corridas recientes**

```sql
SELECT *
FROM greenhouse_sync.source_sync_runs
WHERE source_system = 'fx_sync_orchestrator'
  AND started_at >= NOW() - INTERVAL '24 hours'
ORDER BY started_at DESC
LIMIT 50;
```

Cada fila trae el par (`from_currency`, `to_currency`), la fecha objetivo, el provider que resolvió (o la lista de providers intentados si falló), y el estado.

**Paso 2 — forzar un re-sync puntual**

```bash
POST /api/admin/fx/sync-pair
Content-Type: application/json

{
  "fromCurrency": "USD",
  "toCurrency": "MXN",
  "rateDate": "2026-04-19",
  "dryRun": false
}
```

Requiere rol con `canAdministerPricingCatalog`. **`dryRun` por defecto es `true`** — hay que explicitar `false` para que escriba. La respuesta trae el `runId` para correlacionar con `source_sync_runs`.

`overrideProviderCode` opcional permite saltarse el primario y usar directamente un fallback específico cuando se sabe que el primario está caído (ej: `"overrideProviderCode": "frankfurter"` para USD↔MXN).

**Paso 3 — cargar tasa manual cuando todos los providers están caídos**

Si el orchestrator lleva horas fallando y hay envíos client-facing pendientes, Finance Admin puede upsertar una tasa manual usando el helper existente `upsertExchangeRates` (o el admin endpoint cuando caiga la UI de Finance). La tasa manual se persiste con `source = 'manual'` y queda visible en el readiness resolver igual que cualquier otra.

**Paso 4 — si el problema es `BANXICO_SIE_TOKEN`**

El adapter `banxico_sie` requiere el token. Si no está publicado en Secret Manager o quedó malformado, el primario fallará y MXN sincronizará por `frankfurter` → `fawaz_ahmed`. Eso es degradado pero funcional. Revisar `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md` §Secret Hygiene antes de rotar.

### 7. Cómo agregar una moneda nueva (post TASK-484)

El diseño escala: agregar una moneda con provider existente son ~3 edits declarativos; con provider nuevo, un archivo adicional.

1. **Declarar la moneda** — append el código a `CURRENCIES_ALL` en [`src/lib/finance/currency-domain.ts`](../../../src/lib/finance/currency-domain.ts).
2. **Sumarla al dominio** — agregar al array de `CURRENCY_DOMAIN_SUPPORT[pricing_output]` (u otro dominio si aplica).
3. **Entry en el registry** — agregar la entrada en `CURRENCY_REGISTRY` con `providers: { primary, fallbacks: [...], historical? }` apuntando a los códigos de adapters existentes. `coverage` inicial: `manual_only` hasta verificar en staging.
4. **Si necesita provider nuevo** — crear `src/lib/finance/fx/providers/<name>.ts` implementando el contrato `FxProviderAdapter` (fetchLatest + fetchHistorical + supports + code) y registrarlo en `src/lib/finance/fx/provider-index.ts`.
5. **Sumar al cron** — agregar el par al array `WINDOW_CURRENCIES` del window correspondiente en `/api/cron/fx-sync-latam/route.ts` (o crear un window nuevo si el horario no calza con los 3 existentes).
6. **Verificar 24–48h** — monitorear `source_sync_runs` con `FX_SYNC_DRY_RUN=true` en staging; cuando pase limpio, flipear `coverage` a `auto_synced` en un PR separado.

## Situaciones típicas

### El cotizador me avisa "fx_fallback — Crítico"

El pricing engine emitió un aviso estructurado porque algo faltó. Hay 4 razones posibles:

1. **Modelo comercial desconocido** — el valor que llegó no está en el catálogo (`on_going`, `on_demand`, `hybrid`, `license_consulting`). Solución: elige uno válido del dropdown del rail.
2. **Factor país desconocido** — idem con `country_pricing_factors`. Solución: elige uno válido.
3. **Moneda output sin cobertura FX** — estás cotizando en una moneda `manual_only` (ej. MXN) y no hay tasa manual cargada. Solución: pedir a Finance Admin que suba la tasa vía API, o cambiar el output a una moneda con cobertura.
4. **Tasa stale** — la tasa existe pero es más vieja que el umbral (7 días para pricing). Solución: re-disparar sync o pedir refresh manual.

El panel de avisos del builder (derecha, debajo de Addons) los muestra ordenados por severidad. Críticos en rojo → bloquean envío. Warnings en amarillo → permiten envío pero con aviso visible. Info en azul → transparencia (ej. "la tasa se derivó vía USD").

### Quiero vender en una moneda nueva (ej. BRL)

Flujo operativo:

1. Dev agrega `BRL` a los 3 archivos declarativos (`CURRENCIES_ALL`, `CURRENCY_DOMAIN_SUPPORT[pricing_output]`, `CURRENCY_REGISTRY`) con cobertura inicial `manual_only`.
2. Se mergea + deploya (cambio de 3 líneas).
3. Finance Admin carga la primera tasa manual vía API:
   ```
   POST /api/finance/exchange-rates/sync  # o endpoint de upsert directo
   ```
4. El cotizador empieza a aceptar BRL como output. El pricing engine mostrará `temporarily_unavailable` si pasan más días que el umbral sin tasas nuevas.
5. Cuando el volumen lo justifique, dev implementa un provider automático y flipea cobertura a `auto_synced`.

### Necesito saber si USD→CLP está fresco hoy

Endpoint canónico:

```
GET /api/finance/exchange-rates/readiness?from=USD&to=CLP&domain=pricing_output
```

Respuesta:

```json
{
  "fromCurrency": "USD",
  "toCurrency": "CLP",
  "state": "supported",
  "rate": 886.32,
  "rateDateResolved": "2026-04-19",
  "source": "mindicador",
  "ageDays": 0,
  "stalenessThresholdDays": 7,
  "composedViaUsd": false,
  "message": "Tasa USD→CLP disponible (hace 0 días)."
}
```

Para sends client-facing hay un threshold más estricto (`CLIENT_FACING_STALENESS_THRESHOLD_DAYS = 3`). El pricing engine sigue aceptando hasta 7 días; la UI del "Enviar" debe comparar ella misma contra el threshold estricto y avisar antes de disparar.

## Lo que esta foundation NO hace

Deliberadamente (post TASK-484):

- No expande `FinanceCurrency` de `CLP | USD` — expandir contabilidad transaccional es una migración dedicada, no una edición de enum.
- No migra `operational_pl`, `member_capacity_economics`, payroll ni cost intelligence a nuevas monedas. Siguen CLP-normalized (o CLP+USD en payroll) hasta que una task futura lo haga explícitamente.
- No implementa el selector de output currency client-facing ni el snapshot a `quotations.exchange_rates` en el envío — eso es `TASK-466`, que consume esta foundation.
- **No flipea el `coverage` de CLF/COP/MXN/PEN a `auto_synced` en este merge.** Los providers automáticos **sí están wireados y corriendo** gracias a TASK-484 (9 adapters + orchestrator + 3 cron nuevas). Lo que queda pendiente es la promoción de `manual_only → auto_synced`, que se hace en un PR separado después de 24–48h de dry-run verificado. Hasta ese flip, el pricing engine sigue emitiendo `fx_fallback` warnings para esas monedas en producción aunque las tasas ya estén apareciendo en PG.
- No resuelve formatting locale-aware — eso es `TASK-429`.

> **Detalle técnico:** el contrato completo (chains de resolución, signatures, tests, adapter platform) vive en [GREENHOUSE_FX_CURRENCY_PLATFORM_V1](../../architecture/GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md). El código fuente canónico:
> - Foundation (TASK-475):
>   - [`src/lib/finance/currency-domain.ts`](../../../src/lib/finance/currency-domain.ts)
>   - [`src/lib/finance/currency-registry.ts`](../../../src/lib/finance/currency-registry.ts)
>   - [`src/lib/finance/fx-readiness.ts`](../../../src/lib/finance/fx-readiness.ts)
>   - [`src/app/api/finance/exchange-rates/readiness/route.ts`](../../../src/app/api/finance/exchange-rates/readiness/route.ts)
> - Adapter platform (TASK-484):
>   - [`src/lib/finance/fx/sync-orchestrator.ts`](../../../src/lib/finance/fx/sync-orchestrator.ts)
>   - [`src/lib/finance/fx/circuit-breaker.ts`](../../../src/lib/finance/fx/circuit-breaker.ts)
>   - [`src/lib/finance/fx/provider-adapter.ts`](../../../src/lib/finance/fx/provider-adapter.ts)
>   - [`src/lib/finance/fx/provider-index.ts`](../../../src/lib/finance/fx/provider-index.ts)
>   - [`src/lib/finance/fx/providers/`](../../../src/lib/finance/fx/providers/) — 9 adapters
>   - [`src/app/api/cron/fx-sync-latam/route.ts`](../../../src/app/api/cron/fx-sync-latam/route.ts)
>   - [`src/app/api/admin/fx/sync-pair/route.ts`](../../../src/app/api/admin/fx/sync-pair/route.ts)
>   - [`scripts/backfill-fx-rates.ts`](../../../scripts/backfill-fx-rates.ts)
