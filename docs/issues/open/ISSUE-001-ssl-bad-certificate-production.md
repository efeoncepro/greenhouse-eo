# ISSUE-001 — SSL Bad Certificate en webhook-dispatch (production)

## Ambiente

production (`greenhouse.efeoncepro.com`)

## Detectado

- **Fecha:** 2026-03-30
- **Canal:** Slack `#greenhouse-alerts` vía `alertCronFailure('webhook-dispatch', ...)`
- **Frecuencia:** Cada ejecución del cron `webhook-dispatch` (cada 2 min)

## Síntoma

El cron `webhook-dispatch` falla en production con:

```
Error: C0B82CC5ED7F0000:error:0A000412:SSL routines:ssl3_read_bytes:ssl/tls alert bad certificate:ssl/record/rec_layer_s3.c:912:SSL alert number 42
```

El error se reporta a Slack correctamente (TASK-098 observability funciona), pero el cron no puede completar su trabajo porque no puede conectar a Postgres.

## Causa raíz

`GREENHOUSE_POSTGRES_IP_TYPE` no estaba configurado en el ambiente **production** de Vercel. Solo existía en algunos preview branches.

Sin este valor, el Cloud SQL Connector (`@google-cloud/cloud-sql-connector`) no sabe qué tipo de IP usar para la conexión. El cliente Postgres cae a conexión directa vía `GREENHOUSE_POSTGRES_HOST` (IP pública) e intenta negociar SSL, pero Cloud SQL rechaza el certificado porque espera una conexión autenticada por IAM o por Cloud SQL Connector.

### Evidencia

```
vercel env ls | grep POSTGRES_IP_TYPE
→ Solo en preview branches, NO en production
```

### Configuración corregida

```
GREENHOUSE_POSTGRES_IP_TYPE=PUBLIC  → agregado a production (2026-03-30)
```

## Impacto

- **webhook-dispatch** no puede ejecutarse → outbound webhooks no se entregan en production
- Otros crons que conectan a Postgres podrían estar afectados si usan la misma conexión
- **Staging no está afectado** — tiene `GREENHOUSE_POSTGRES_IP_TYPE` configurado correctamente
- **No hay pérdida de datos** — los outbox events se acumulan y se entregarán cuando el cron funcione

## Solución

### Paso 1 — Variable configurada (hecho)

```bash
vercel env add GREENHOUSE_POSTGRES_IP_TYPE production --value "PUBLIC" --force
```

### Paso 2 — Redeploy de production (pendiente)

La variable solo toma efecto con un nuevo deploy. Opciones:

**Opción A — Redeploy manual:**
```bash
vercel deployments ls --prod
vercel redeploy <deployment-url>
```

**Opción B — Merge develop → main:**
Un merge a `main` triggerea deploy automático a production.

### Paso 3 — Verificación

Después del redeploy:
1. Esperar ~2 min (ciclo del cron `webhook-dispatch`)
2. Verificar que `#greenhouse-alerts` deja de reportar el error
3. Verificar health endpoint:
   ```bash
   curl -s https://greenhouse.efeoncepro.com/api/internal/health | jq .postgres
   ```
4. Verificar que deliveries se procesan:
   ```sql
   SELECT status, COUNT(*) FROM greenhouse_sync.webhook_deliveries GROUP BY status;
   ```

## Estado

`open` — variable configurada, redeploy pendiente

## Relacionado

- `src/lib/postgres/client.ts` — Cloud SQL Connector initialization
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` — Vercel env vars
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md` — connection profiles
- TASK-098 (Observability) — alertCronFailure detectó y reportó correctamente
- TASK-101 (Cron Auth) — requireCronAuth no es el problema (el error es post-auth, en la conexión DB)
