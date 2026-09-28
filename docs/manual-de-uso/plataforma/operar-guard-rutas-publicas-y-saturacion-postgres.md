# Guard de rutas públicas y saturación de PostgreSQL — manual de operación

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-09-28 por Claude (TASK-1876)
> **Ultima actualizacion:** 2026-09-28 por Claude
> **Documentacion tecnica:** [GREENHOUSE_POSTGRES_CONNECTION_POOLING_V1.md](../../architecture/GREENHOUSE_POSTGRES_CONNECTION_POOLING_V1.md) §V1.3

## Para qué sirve

Protege la instancia PostgreSQL compartida (dev, staging y producción usan la misma) de una ráfaga
de requests a rutas públicas sin sesión (`/api/public/**`). El incidente de origen es `ISSUE-174`:
64 requests concurrentes dejaron 86–99 de 97 conexiones ocupadas durante 5 minutos.

Hay tres capas, cada una independiente:

| Capa | Qué hace | Dónde vive |
|---|---|---|
| Guard en el borde | El Firewall de Vercel limita a 20 requests cada 10 s por IP en `/api/public/`. Un rechazo es un `429` que **no llega a la función ni abre conexión**. | Reglas en `src/lib/security/public-burst-guard/firewall-rules.ts`; se aplican con `pnpm security:public-burst-guard` |
| Conexiones ociosas acotadas | Las sesiones abiertas desde Vercel piden `idle_session_timeout=60s`; el resto del runtime conserva el default del rol (5 min). | `src/lib/postgres/client.ts` (llega con cada deploy) |
| Detección del pico | La señal `runtime.postgres.connection_saturation` lee el pico de 24 h de la métrica nativa de Cloud SQL, y una alerta de Cloud Monitoring avisa a Slack. | Señal en `src/lib/reliability/queries/`; alerta en Cloud Monitoring |

## Antes de empezar

- Token de Vercel: `VERCEL_TOKEN` exportado (o `vercel login`).
- `gcloud` autenticado contra `efeonce-group` con permiso para crear alertas e IAM (sólo para el paso 3 y 4).
- Aplicar reglas o crear la alerta afecta **producción** en el mismo instante: avisa a las sesiones paralelas.

## Paso a paso

### 1. Revisar el estado del guard (sólo lectura)

```bash
pnpm security:public-burst-guard
```

Imprime el plan contra el Firewall vivo. `exit 0` = sin drift; `exit 2` = hay cambios pendientes.

### 2. Aplicar las reglas

```bash
pnpm security:public-burst-guard --apply
```

Habilita el firewall si hacía falta, inserta o actualiza sólo las reglas del guard (nunca toca reglas
ajenas) y relee la configuración: falla si el readback no coincide con el archivo fuente.

Estado vigente de las reglas:

- `greenhouse-public-burst-guard-non-production` — staging y preview: **enforce** (`429`).
- `greenhouse-public-burst-guard-production` — `greenhouse.efeoncepro.com` y `greenhouse-eo.vercel.app`: **observe** (sólo registra).

### 3. Pasar producción a enforcement (cutover)

1. En Vercel → Firewall → Traffic, filtra por la regla de producción y revisa al menos 7 días: ¿alguna IP
   legítima (clientes, formularios, Grader) superó 20 req/10 s? Si sí, sube el límite en el archivo fuente
   antes de seguir.
2. Cambia `mode: 'observe'` → `mode: 'enforce'` en la regla de producción de `firewall-rules.ts`, commit.
3. `pnpm security:public-burst-guard --apply`.

### 4. Crear la alerta de conexiones (una vez)

```bash
gcloud alpha monitoring policies create \
  --project=efeonce-group \
  --notification-channels=projects/efeonce-group/notificationChannels/8736345518502755361 \
  --display-name='Cloud SQL greenhouse-pg-dev — conexiones > 85 (ISSUE-174)' \
  --user-labels=severity=critical,component=postgres-connections \
  --documentation='La instancia compartida (dev/staging/prod) supera 85 de 97 conexiones utilizables por 2 minutos. Revisar ráfagas en /api/public/** (Vercel Firewall → Traffic) y pg_stat_activity. Runbook: docs/manual-de-uso/plataforma/operar-guard-rutas-publicas-y-saturacion-postgres.md' \
  --condition-filter='metric.type="cloudsql.googleapis.com/database/postgresql/num_backends" AND resource.type="cloudsql_database" AND resource.labels.database_id="efeonce-group:greenhouse-pg-dev"' \
  --condition-threshold-value=85 \
  --condition-threshold-comparison=COMPARISON_GT \
  --condition-threshold-duration=120s \
  --condition-threshold-aggregations='alignment_period=60s,per_series_aligner=ALIGN_MAX,cross_series_reducer=REDUCE_SUM' \
  --condition-display-name='num_backends > 85 for 2m'
```

El umbral es alto a propósito: los picos diarios normales (septiembre 2026) van de 42 a 77.

### 5. Dar lectura de métricas a la señal (una vez)

La señal lee Cloud Monitoring con la identidad del portal, que hoy sólo puede escribir métricas:

```bash
gcloud projects add-iam-policy-binding efeonce-group \
  --member=serviceAccount:greenhouse-portal@efeonce-group.iam.gserviceaccount.com \
  --role=roles/monitoring.viewer --condition=None
```

Sin este permiso la señal sigue funcionando y marca el pico como «no disponible».

### 6. Verificar con una ráfaga controlada (sólo staging)

Sólo con las reglas aplicadas y el código desplegado en staging. Antes: mira `num_backends` en Cloud
Monitoring; **si ya está sobre 50, no sigas**. Lanza como máximo 30 requests concurrentes a una ruta
pública de staging y confirma: ~20 responden normal, el resto `429` desde el borde, y las conexiones
vuelven a la línea base en ~1 minuto (antes eran 5).

## Qué significan los estados

| Señal / respuesta | Significado |
|---|---|
| `429` en `/api/public/**` | El borde cortó una ráfaga de esa IP; la base no se tocó. |
| Señal `warning` con «Pico reciente» | En las últimas 24 h hubo ≥90 % del máximo utilizable, aunque ahora esté sano. |
| Señal `unknown` con «Detector sin conexión» | La base rechazó la conexión del detector: probablemente saturada ahora. |
| Evidencia `peak_backends_24h: no disponible` | Falta `roles/monitoring.viewer` (paso 5) o Monitoring no respondió. |

## Qué no hacer

- **NUNCA** medir límites con ráfagas concurrentes contra la instancia compartida sin ventana acordada.
- **NUNCA** bajar el `idle_session_timeout` del rol `greenhouse_app` con `ALTER ROLE`: lo comparten los
  workers de Cloud Run, que guardan trabajo de sesión (advisory lock de Nubox) en conexiones ociosas.
- **NUNCA** subir el límite para todos para dejar pasar a un consumidor server-side (Think, TASK-1875):
  se exceptúa con una condición explícita en `firewall-rules.ts`.
- **NUNCA** editar las reglas del guard a mano en el dashboard: el próximo `--apply` las pisa.

## Problemas comunes

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| `Sin token de Vercel` | Falta `VERCEL_TOKEN` | `export VERCEL_TOKEN=…` o `vercel login` |
| `El readback no converge` | Vercel normalizó un campo distinto al archivo | Compara el plan impreso y ajusta `firewall-rules.ts` |
| Usuarios legítimos reciben `429` | Límite bajo para su patrón (NAT corporativo) | Sube el límite en el archivo fuente y aplica; revisa Traffic |
| Errores `57P05` en logs de Vercel | Sesión ociosa cortada a los 60 s | Esperado: el cliente lo trata como desconexión y reintenta |

## Referencias técnicas

- Arquitectura: `docs/architecture/GREENHOUSE_POSTGRES_CONNECTION_POOLING_V1.md` §V1.3.
- Invariantes: `docs/architecture/agent-invariants/INTEGRATIONS_INFRA_AGENT_INVARIANTS.md` §PostgreSQL connection management.
- Incidente: `docs/issues/open/ISSUE-174-public-route-burst-exhausts-shared-pg-connections.md`.
- Task: `docs/tasks/in-progress/TASK-1876-public-route-connection-exhaustion-guard.md`.
