# Ops Worker — Crons Reactivos en Cloud Run

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-06-17 por agente (TASK-254)
> **Ultima actualizacion:** 2026-06-17 por agente (TASK-254)
> **Documentacion tecnica:** [GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md](../../architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md) (§4.9, §5)

---

## Que es el ops-worker

El **ops-worker** es un servicio que corre en Google Cloud Run y se encarga de procesar los eventos reactivos del portal Greenhouse. Antes, estos procesos corrian como cron jobs dentro de Vercel, pero se migraron a Cloud Run para mayor durabilidad y tiempo de ejecucion.

El servicio procesa tres tipos de trabajo:

| Trabajo | Que hace | Cada cuanto corre |
|---|---|---|
| **Reactive Process** | Procesa el backlog completo de eventos reactivos del outbox (todas las domains) | Cada 5 minutos |
| **Reactive Process Delivery** | Procesa solo los eventos reactivos del dominio `delivery` | Cada 5 minutos (desplazado 2 min) |
| **Reactive Recover** | Recupera proyecciones huerfanas que quedaron pendientes en la cola de refresh | Cada 15 minutos |

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

Todos los endpoints POST aceptan un body JSON con `batchSize` (tamaño del lote).

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

## Que paso con los cron de Vercel

Los 3 crons originales fueron removidos de `vercel.json`. Las rutas API de Vercel (`/api/cron/outbox-react`, `/api/cron/outbox-react-delivery`, `/api/cron/projection-recovery`) **siguen existiendo** como endpoints manuales de fallback, pero ya no estan programados automaticamente.

---

## Problema conocido: ESM/CJS

El ops-worker reutiliza codigo de `src/lib/` del portal. Parte de ese codigo importa `next-auth` indirectamente, lo cual falla en Node 22 con ESM porque `next-auth` es CJS. La solucion es un conjunto de "shims" (stubs vacios) que el build (esbuild) sustituye en tiempo de compilacion. El worker nunca usa autenticacion, asi que los shims son seguros.

Este patron debe replicarse en cualquier servicio Cloud Run futuro que reutilice `src/lib/` sin necesitar NextAuth.

> Detalle tecnico: [GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md](../../architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md) §4.9 — ESM/CJS shim pattern
