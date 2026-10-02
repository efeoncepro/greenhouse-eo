# Guard de rutas públicas y saturación de PostgreSQL — manual de operación

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-09-28 por Claude (TASK-1876)
> **Ultima actualizacion:** 2026-09-28 por Claude (rollout staging)
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

### 4. Alerta de conexiones (creada 2026-09-28)

Definida como código en `infra/gcp/monitoring/cloudsql-connection-saturation.alert-policy.json`
(`num_backends > 85` por 2 min → canal Slack de alertas). Vigente:
`projects/efeonce-group/alertPolicies/11425632472409123636`. Para recrearla o crearla en otro proyecto:

```bash
gcloud monitoring policies create --project=efeonce-group \
  --policy-from-file=infra/gcp/monitoring/cloudsql-connection-saturation.alert-policy.json
```

El `gcloud` instalado (560) no acepta los flags `--condition-threshold-*`: usa siempre el archivo.
Antes de crearla, `gcloud monitoring policies list` para no duplicarla. El umbral es alto a propósito:
los picos diarios normales (septiembre 2026) van de 42 a 77.

### 5. Lectura de métricas para la señal (otorgada 2026-09-28)

`greenhouse-portal@efeonce-group.iam.gserviceaccount.com` tiene `roles/monitoring.viewer`. Sin ese permiso
la señal sigue funcionando y marca el pico como «no disponible».

### 6. Verificar con una ráfaga controlada (sólo staging)

```bash
pnpm security:public-burst-guard:verify          # 30 requests (máximo)
```

El comando trae los frenos: sólo el host de staging `.vercel.app`, máximo 30 requests, **aborta si
`num_backends` supera 50 antes de disparar**, token inexistente (404 sin datos) y muestrea la métrica
6 minutos. Resultado de referencia (2026-09-28, deploy `43931ea73`): 20 × 404 del dominio + 10 × 429 del
borde; pico 26 conexiones con base 5, de vuelta a 6 al minuto siguiente (en ISSUE-174: 99 durante 5 min).
Corre una sola vez por ventana; la métrica llega con 1–3 min de retraso.

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
