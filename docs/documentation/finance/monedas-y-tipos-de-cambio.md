# Monedas y Tipos de Cambio — Foundation Plataforma

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-04-19 por Claude (TASK-475 close-out)
> **Ultima actualizacion:** 2026-04-19 por Claude
> **Documentacion tecnica:**
> - Spec canónica: [GREENHOUSE_FX_CURRENCY_PLATFORM_V1](../../architecture/GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md)
> - Finance architecture: [GREENHOUSE_FINANCE_ARCHITECTURE_V1](../../architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md)
> - Sync pipelines: [GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1](../../architecture/GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1.md)
> - Task: [TASK-475 — Greenhouse FX & Currency Platform Foundation](../../tasks/complete/TASK-475-greenhouse-fx-currency-platform-foundation.md)

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

Cada moneda está declarada con su política operativa en `currency-registry.ts`:

| Moneda | Cobertura | Provider | Sync | Fallback permitido |
|---|---|---|---|---|
| `CLP` | `auto_synced` | Mindicador | diario | `inverse`, `usd_composition` |
| `USD` | `auto_synced` | Mindicador + OpenER fallback | diario | `inverse`, `usd_composition` |
| `CLF` | `manual_only` | — | manual | `inverse`, `usd_composition` |
| `COP` | `manual_only` | — | manual | `usd_composition` |
| `MXN` | `manual_only` | — | manual | `usd_composition` |
| `PEN` | `manual_only` | — | manual | `usd_composition` |

**Qué significa "manual_only"**: la moneda está soportada comercialmente (se puede elegir en el cotizador) pero el sync automático no existe todavía. Finance Admin carga tasas manuales cuando se necesitan. El cotizador avisa al AE que el par no está auto-cubierto.

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

Deliberadamente:

- No expande `FinanceCurrency` de `CLP | USD` — expandir contabilidad transaccional es una migración dedicada, no una edición de enum.
- No migra `operational_pl`, `member_capacity_economics`, payroll ni cost intelligence a nuevas monedas. Siguen CLP-normalized (o CLP+USD en payroll) hasta que una task futura lo haga explícitamente.
- No implementa el selector de output currency client-facing ni el snapshot a `quotations.exchange_rates` en el envío — eso es `TASK-466`, que consume esta foundation.
- No implementa providers automáticos para COP/MXN/PEN — se declararon como `manual_only` hasta que el negocio justifique automatización.
- No resuelve formatting locale-aware — eso es `TASK-429`.

> **Detalle técnico:** el contrato completo (chains de resolución, signatures, tests) vive en [GREENHOUSE_FX_CURRENCY_PLATFORM_V1](../../architecture/GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md). El código fuente canónico:
> - [`src/lib/finance/currency-domain.ts`](../../../src/lib/finance/currency-domain.ts)
> - [`src/lib/finance/currency-registry.ts`](../../../src/lib/finance/currency-registry.ts)
> - [`src/lib/finance/fx-readiness.ts`](../../../src/lib/finance/fx-readiness.ts)
> - [`src/app/api/finance/exchange-rates/readiness/route.ts`](../../../src/app/api/finance/exchange-rates/readiness/route.ts)
