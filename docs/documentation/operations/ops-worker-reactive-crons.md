# Ops Worker — Crons Reactivos y Materializacion en Cloud Run

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.1
> **Creado:** 2026-06-17 por agente (TASK-254)
> **Ultima actualizacion:** 2026-04-07 por agente (TASK-279)
> **Documentacion tecnica:** [GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md](../../architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md) (§4.9, §5)

---

## Que es el ops-worker

El **ops-worker** es un servicio que corre en Google Cloud Run y se encarga de procesar los eventos reactivos del portal Greenhouse. Antes, estos procesos corrian como cron jobs dentro de Vercel, pero se migraron a Cloud Run para mayor durabilidad y tiempo de ejecucion.

El servicio procesa cuatro tipos de trabajo:

| Trabajo | Que hace | Cada cuanto corre |
|---|---|---|
| **Reactive Process** | Procesa el backlog completo de eventos reactivos del outbox (todas las domains) | Cada 5 minutos |
| **Reactive Process Delivery** | Procesa solo los eventos reactivos del dominio `delivery` | Cada 5 minutos (desplazado 2 min) |
| **Reactive Recover** | Recupera proyecciones huerfanas que quedaron pendientes en la cola de refresh | Cada 15 minutos |
| **Cost Attribution Materialize** | Materializa la atribucion de costos laborales comerciales por periodo y recomputa snapshots de economics de clientes | Bajo demanda (manual o via reactive projection) |

---

## Como funciona

1. **Cloud Scheduler** dispara una solicitud HTTP al servicio cada cierto tiempo segun la tabla de arriba.
2. El **ops-worker** recibe la solicitud, procesa un lote de eventos (por defecto 50) y responde con el resultado.
3. Cada corrida queda registrada en la tabla `source_sync_runs` con estado `succeeded` o `failed`, lo que permite auditar desde Admin Center.

---

## Donde se ve en el portal

En **Admin Center > Ops Health**, el subsistema **Reactive Worker** muestra:

- Fecha de la ultima corrida exitosa
- Estado de la ultima corrida (`succeeded` / `failed`)
- Señal de freshness (si las corridas estan al dia o hay atraso)

---

## Endpoints del servicio

| Metodo | Ruta | Proposito |
|---|---|---|
| GET | `/health` | Health check basico |
| POST | `/reactive/process` | Procesa backlog reactivo completo |
| POST | `/reactive/process-domain` | Procesa backlog de un dominio especifico |
| POST | `/reactive/recover` | Recupera proyecciones huerfanas |
| POST | `/cost-attribution/materialize` | Materializa cost attribution + client economics |

Los endpoints reactivos aceptan un body JSON con `batchSize` (tamaño del lote).

El endpoint `/cost-attribution/materialize` acepta:
- `{ year, month }` — materializa un periodo especifico
- `{}` (sin parametros) — materializa todos los periodos con datos
- `{ recomputeEconomics: false }` — omite la recomputacion de `client_economics` despues de materializar

---

## Configuracion operativa

| Parametro | Valor |
|---|---|
| **Region** | `us-east4` (junto a la base de datos) |
| **Memoria** | 1 GiB |
| **CPU** | 1 |
| **Timeout** | 300 segundos (5 minutos) |
| **Instancias maximas** | 2 |
| **Concurrencia** | 1 (una request a la vez por instancia) |
| **Autenticacion** | IAM + OIDC (no acepta requests sin autenticar) |
| **Timezone** | `America/Santiago` |

---

## Por que la materializacion de costos corre aqui

La vista `client_labor_cost_allocation` combina 3 CTEs + un LATERAL JOIN + conversion de moneda via `exchange_rates`. Esta consulta excede el timeout de 10s de Vercel serverless en cold-starts. La solucion arquitectural: el ops-worker materializa los resultados en la tabla `greenhouse_serving.commercial_cost_attribution` y Vercel solo lee de la tabla materializada.

Cuando un evento financiero (factura, gasto, asignacion, nomina) dispara la proyeccion reactiva `commercial_cost_attribution`, el ops-worker:

1. Ejecuta la VIEW compleja y escribe el resultado atomicamente (purge + insert en transaccion)
2. Publica un evento outbox `accounting.commercial_cost_attribution.materialized`
3. Opcionalmente recomputa los snapshots de `client_economics` con los nuevos costos

> Detalle tecnico: [GREENHOUSE_FINANCE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md) — commercial cost attribution pipeline

---

## Que paso con los cron de Vercel

Los 3 crons originales fueron removidos de `vercel.json`. Las rutas API de Vercel (`/api/cron/outbox-react`, `/api/cron/outbox-react-delivery`, `/api/cron/projection-recovery`) **siguen existiendo** como endpoints manuales de fallback, pero ya no estan programados automaticamente.

---

## Problema conocido: ESM/CJS

El ops-worker reutiliza codigo de `src/lib/` del portal. Parte de ese codigo importa `next-auth` indirectamente, lo cual falla en Node 22 con ESM porque `next-auth` es CJS. La solucion es un conjunto de "shims" (stubs vacios) que el build (esbuild) sustituye en tiempo de compilacion. El worker nunca usa autenticacion, asi que los shims son seguros.

Este patron debe replicarse en cualquier servicio Cloud Run futuro que reutilice `src/lib/` sin necesitar NextAuth.

> Detalle tecnico: [GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md](../../architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md) §4.9 — ESM/CJS shim pattern
