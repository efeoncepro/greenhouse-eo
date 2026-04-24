# TASK-574 — Cutover Runbook: HubSpot Greenhouse Integration Service Absorption

> **Documento operacional** — guía paso a paso para ejecutar el cutover de producción del servicio Cloud Run `hubspot-greenhouse-integration` del sibling `cesargrowth11/hubspot-bigquery` al monorepo `greenhouse-eo`. El cutover **NO es autónomo**: cada paso requiere verificación humana antes de avanzar. Este runbook se escribió el 2026-04-24 en el PR de TASK-574 pero la ejecución real se hace fuera del PR, con ventana de cutover acordada.

**Pre-requisito absoluto:** TASK-574 PR debe estar mergeado a `develop` (o a `main` si el cutover apunta a production). El workflow `.github/workflows/hubspot-greenhouse-integration-deploy.yml` queda DORMANT hasta que se ejecute manualmente via `workflow_dispatch`.

---

## 0. Ventana y comunicación

- **Ventana recomendada**: horario de baja carga (fin de semana o noche LATAM). El bridge maneja deals/quotes/webhooks — un corte corto (< 5 min) no rompe data pero sí UX si alguien crea un deal en ese instante.
- **Aviso previo**: notificar al equipo comercial 1h antes — "bridge HubSpot momentáneamente indisponible".
- **Rollback objetivo**: < 60 segundos (redirigir traffic a revisión anterior).
- **Ventana de rollback extendida**: 7 días. El sibling `cesargrowth11/hubspot-bigquery` conserva físicamente el código durante 7 días post-cutover. Slice 8 (cleanup) lo borra solo después de validación estable.

---

## 1. Pre-flight checks

### 1.1. Verificar PR mergeado

```bash
# En el monorepo, en develop actualizado
cd ~/Documents/greenhouse-eo
git pull origin develop
git log --oneline -5 | grep -i "TASK-574"
# Debe ver el merge del filter-repo + infra commits
```

### 1.2. Verificar estado actual del Cloud Run

```bash
gcloud run services describe hubspot-greenhouse-integration \
  --region us-central1 \
  --project efeonce-group \
  --format='value(status.latestReadyRevisionName, status.url, status.conditions[0].status)'
# Guardar el output — este es el ROLLBACK TARGET.
```

Anotar en una nota temporal:
```
ROLLBACK_REVISION=<la revisión que devolvió>
ROLLBACK_URL=<la URL>
ROLLBACK_TIMESTAMP=<now>
```

### 1.3. Validar secretos (no rotar — solo confirmar que existen)

```bash
for secret in hubspot-access-token greenhouse-integration-api-token hubspot-app-client-secret; do
  echo -n "$secret: "
  gcloud secrets describe "$secret" --project=efeonce-group --format='value(name)' 2>/dev/null \
    && echo "OK" \
    || echo "MISSING — abort cutover"
done
```

### 1.4. Smoke baseline pre-cutover (para poder comparar)

```bash
curl -w "health=%{http_code}\ncontract=%{http_code}\n" \
  -o /tmp/pre-health.json -s https://hubspot-greenhouse-integration-y6egnifl6a-uc.a.run.app/health && \
curl -w "contract=%{http_code}\n" \
  -o /tmp/pre-contract.json -s https://hubspot-greenhouse-integration-y6egnifl6a-uc.a.run.app/contract

cat /tmp/pre-contract.json | python3 -m json.tool | head -40
```

Si `/health` o `/contract` no responden 200 AHORA, **ABORTAR** el cutover — el servicio estaba roto antes y no es momento de migrar.

---

## 2. IAM grants para el SA de deploy (requerido antes del primer run del workflow)

El workflow `.github/workflows/hubspot-greenhouse-integration-deploy.yml` usa la SA `github-actions-deployer@efeonce-group.iam.gserviceaccount.com` via WIF. Para este servicio específico necesita 3 roles:

### 2.1. `roles/run.admin` sobre el Cloud Run service

```bash
gcloud run services add-iam-policy-binding hubspot-greenhouse-integration \
  --region us-central1 \
  --project efeonce-group \
  --member="serviceAccount:github-actions-deployer@efeonce-group.iam.gserviceaccount.com" \
  --role="roles/run.admin"
```

### 2.2. `roles/iam.serviceAccountUser` sobre el runtime SA

```bash
gcloud iam service-accounts add-iam-policy-binding \
  greenhouse-portal@efeonce-group.iam.gserviceaccount.com \
  --project efeonce-group \
  --member="serviceAccount:github-actions-deployer@efeonce-group.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"
```

(Si ya está binded para otros services, este comando es idempotente — devuelve success sin duplicar.)

### 2.3. `roles/secretmanager.secretAccessor` sobre los 3 secretos

```bash
for secret in hubspot-access-token greenhouse-integration-api-token hubspot-app-client-secret; do
  gcloud secrets add-iam-policy-binding "$secret" \
    --project efeonce-group \
    --member="serviceAccount:github-actions-deployer@efeonce-group.iam.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor"
done
```

### 2.4. Verificación IAM

```bash
gcloud run services get-iam-policy hubspot-greenhouse-integration \
  --region us-central1 \
  --project efeonce-group \
  --format='value(bindings.role,bindings.members)' \
  | grep -E "run.admin|invoker"
```

Debe mostrar al menos 2 bindings: `roles/run.admin` con el deployer SA, `roles/run.invoker` con `allUsers` (sin cambios).

---

## 3. Primer deploy desde el monorepo — `workflow_dispatch` manual

**Principio:** NO empujar a `develop`/`main` para triggerear el workflow automático. Primero correr manualmente en modo staging o directo-production-with-approval.

### 3.1. Trigger manual via GitHub UI

1. Ir a https://github.com/efeoncepro/greenhouse-eo/actions/workflows/hubspot-greenhouse-integration-deploy.yml
2. Click "Run workflow" → dropdown "Environment" → elegir `production` (porque el Cloud Run actual ya es production y lo que queremos es cutover directo, no dual).
3. Dejar `skip_tests=false` (queremos pytest validado en el primer run).
4. Click "Run workflow" verde.

### 3.2. Observar el workflow en tiempo real

El workflow corre dos jobs:

- **test** (~3-5 min): pytest sobre los 40 test functions. Espera 37/40 passing, 3 failures conocidos pre-cutover. Si fallan OTROS tests → abortar + fix antes de continuar.
- **deploy** (~10-15 min): Cloud Build → Cloud Run deploy → smoke `/health` + `/contract`.

Si `deploy` job falla en cualquier step, el servicio en producción **NO CAMBIA** — Cloud Run mantiene la revisión previa (el despliegue falla antes del traffic shift).

### 3.3. Post-deploy verification

```bash
# Nueva revisión debe ser visible
gcloud run services describe hubspot-greenhouse-integration \
  --region us-central1 \
  --project efeonce-group \
  --format='value(status.latestReadyRevisionName, status.url)'

# Smoke end-to-end con todas las 23 rutas read — cada una debe responder 200 o 401 (auth required)
SERVICE_URL="https://hubspot-greenhouse-integration-y6egnifl6a-uc.a.run.app"

for path in "/health" "/contract" "/deals/metadata" "/owners/resolve?email=test@example.com"; do
  CODE=$(curl -s -o /dev/null -w '%{http_code}' "$SERVICE_URL$path")
  echo "$path -> $CODE"
done
```

Esperado:
- `/health` → 200
- `/contract` → 200 con JSON estructura idéntica al pre-cutover
- `/deals/metadata` → 200
- `/owners/resolve?email=...` → 200 o 404

### 3.4. Smoke end-to-end con Greenhouse runtime

```bash
# Desde monorepo (requiere staging-request.mjs configurado con bypass)
pnpm staging:request POST /api/commercial/organizations/<org_id>/deals '{
  "quoteId": "<quote_id_sandbox>",
  "dealName": "TASK-574 cutover smoke",
  "actor": "jreyes@efeoncepro.com"
}'
```

Esperado: response con `status='completed'` (o `pending_approval` si monto > $50M). El deal debe aparecer en HubSpot sandbox.

Si este smoke falla → **rollback inmediato** (sección 5).

---

## 4. PR paralelo al sibling — stub README + workflow disable

Solo ejecutar si el smoke de sección 3.4 pasó.

### 4.1. Clonar + crear branch en el sibling

```bash
gh repo clone cesargrowth11/hubspot-bigquery /tmp/hbi-cutover
cd /tmp/hbi-cutover
git checkout -b chore/TASK-574-bridge-moved-to-monorepo
```

### 4.2. Reemplazar el contenido de `services/hubspot_greenhouse_integration/` por un stub README

```bash
# Backup (por si acaso; se borra en Slice 8)
mv services/hubspot_greenhouse_integration services/hubspot_greenhouse_integration.PRE-TASK-574.DELETE-AFTER-7-DAYS

mkdir -p services/hubspot_greenhouse_integration

cat > services/hubspot_greenhouse_integration/README.md <<'EOF'
# HubSpot Greenhouse Integration Service — MOVED

> **Este servicio se movió el 2026-04-24 a `efeoncepro/greenhouse-eo`** bajo
> `services/hubspot_greenhouse_integration/` como parte de TASK-574.
>
> Toda la historia git fue preservada via `git filter-repo`. El mismo Cloud Run
> service en `us-central1` sigue sirviendo la URL pública
> `https://hubspot-greenhouse-integration-y6egnifl6a-uc.a.run.app` — solo cambió
> el repo de origen del código.
>
> Este sibling (`cesargrowth11/hubspot-bigquery`) conserva ahora:
> - `main.py` — Cloud Function HubSpot → BigQuery (`hubspot-bq-sync`)
> - `greenhouse_bridge.py` — bridge capabilities batch (parte del BQ sync)
> - `hsproject.json` + `src/app/` — HubSpot Developer Platform app v2025.2
> - scripts ops contra portal HubSpot

Para cualquier cambio al write bridge + webhooks Cloud Run, abrir PR en:
`efeoncepro/greenhouse-eo/services/hubspot_greenhouse_integration/`

Deploy automatizado:
`.github/workflows/hubspot-greenhouse-integration-deploy.yml` en el monorepo.

Backup físico del código viejo: `services/hubspot_greenhouse_integration.PRE-TASK-574.DELETE-AFTER-7-DAYS/` — será eliminado 2026-05-01 si no hubo regresión.
EOF
```

### 4.3. Deshabilitar cualquier GitHub Action o script root de deploy del servicio

Buscar en el sibling:

```bash
grep -rln "hubspot-greenhouse-integration\|services/hubspot_greenhouse_integration" .github/workflows/ 2>/dev/null
grep -n "services/hubspot_greenhouse_integration" deploy.sh 2>/dev/null
```

Si algo aparece, editar (no borrar) con un comentario explícito:

```yaml
# DISABLED 2026-04-24 — service moved to efeoncepro/greenhouse-eo (TASK-574).
# See services/hubspot_greenhouse_integration/README.md for the new location.
# Re-enable ONLY if rolling back TASK-574 within the 7-day window.
on:
  # push:
  #   branches: [main]
  #   paths:
  #     - 'services/hubspot_greenhouse_integration/**'
  workflow_dispatch: {}  # keeps it manual-dispatch only, never auto-triggered
```

### 4.4. Commit + PR + merge

```bash
git add -A
git commit -m "chore(TASK-574): mark hubspot-greenhouse-integration as moved to monorepo

See efeoncepro/greenhouse-eo/services/hubspot_greenhouse_integration/ for
the new canonical location. This sibling now owns only the HubSpot→BigQuery
ingestion pipeline and the HubSpot Developer Platform app config.

7-day rollback window: 2026-04-24 to 2026-05-01. After that, cleanup PR
removes the backup directory.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"

git push -u origin chore/TASK-574-bridge-moved-to-monorepo

gh pr create \
  --title "chore(TASK-574): mark hubspot-greenhouse-integration as moved to monorepo" \
  --body "Stub README + deploy workflow disabled. Service now lives in efeoncepro/greenhouse-eo/services/hubspot_greenhouse_integration/." \
  --base main
```

Merge el PR después de que el smoke del monorepo (sección 3.4) haya validado que el servicio responde desde la nueva revisión.

---

## 5. Rollback procedure

Si en cualquier punto después del deploy del monorepo hay regresión:

### 5.1. Rollback instantáneo del Cloud Run

```bash
# ROLLBACK_REVISION es el valor anotado en la sección 1.2 (pre-flight).
gcloud run services update-traffic hubspot-greenhouse-integration \
  --region us-central1 \
  --project efeonce-group \
  --to-revisions="${ROLLBACK_REVISION}=100"
```

Tiempo total: < 30 segundos. El servicio vuelve al estado pre-cutover.

### 5.2. Validar rollback

```bash
curl -w "\nhealth=%{http_code}\n" \
  -s https://hubspot-greenhouse-integration-y6egnifl6a-uc.a.run.app/health | head
```

Debe responder 200 con el shape idéntico al pre-cutover guardado en `/tmp/pre-health.json`.

### 5.3. Investigar la regresión sin presión

Con rollback activo, el equipo tiene todo el tiempo del mundo para:
- Revisar Cloud Logging del deploy fallido.
- Fixear el bug en el monorepo.
- Re-correr `workflow_dispatch` cuando esté listo.

### 5.4. Si rollback del Cloud Run no basta (corrupción de secret / IAM)

Plan B: re-deployar desde el sibling usando el código backup físico:

```bash
cd /tmp/hbi-cutover
git checkout main  # antes del merge del PR de stub
mv services/hubspot_greenhouse_integration.PRE-TASK-574.DELETE-AFTER-7-DAYS services/hubspot_greenhouse_integration
# Correr el deploy.sh original del sibling (manual)
bash services/hubspot_greenhouse_integration/deploy.sh
```

Esto restaura el estado pre-cutover 100% (código, deploy mechanism, IAM).

---

## 6. Post-cutover validation (24h después)

### 6.1. Sanity smokes

- `curl` de las 16 rutas GET public → 200 o 404 expected
- Webhook real de HubSpot sandbox → debe llegar a `POST /webhooks/hubspot` → propagar a `/api/integrations/v1/hubspot/sync-capabilities` en Vercel → ver row en `source_sync_runs` o logs

### 6.2. Cloud Logging scan

```bash
gcloud logging read \
  'resource.type="cloud_run_revision" AND resource.labels.service_name="hubspot-greenhouse-integration" AND severity>="ERROR"' \
  --project efeonce-group \
  --freshness=24h \
  --limit=50 \
  --format=json | python3 -m json.tool | less
```

Si hay errores nuevos post-cutover que no estaban pre → investigar.

### 6.3. Métrica comparativa

Cloud Monitoring dashboard (o query manual de métricas):

- Request rate: pre vs post 24h — debería ser comparable
- Error rate: debería ser < 1% como pre-cutover
- Latency p95: no debe subir más de 10%
- Cold-start count: puede subir temporalmente por las nuevas revisiones + warmup

---

## 7. Slice 8 — Cleanup (2026-05-01, +7 días del cutover)

Solo si NO hubo regresión durante la ventana.

```bash
cd /tmp/hbi-cutover
git pull origin main
git checkout -b chore/TASK-574-cleanup-old-code

# Borrar físicamente el backup
rm -rf services/hubspot_greenhouse_integration.PRE-TASK-574.DELETE-AFTER-7-DAYS

git add -A
git commit -m "chore(TASK-574): delete pre-cutover backup (7-day window elapsed)

Service has run successfully from efeoncepro/greenhouse-eo for 7 days.
Removing the physical backup. Git history still preserves it via tags
and commit history if needed."

git push -u origin chore/TASK-574-cleanup-old-code
gh pr create --title "chore(TASK-574): delete pre-cutover backup (7-day window elapsed)" --base main
```

Merge y listo. TASK-574 cierra oficialmente.

---

## 8. Artefactos operativos

Durante cutover, llevar un doc vivo con:

- Timestamp exacto de cada paso
- Revisión anterior (rollback target)
- Revisión nueva del monorepo
- Output del smoke pre-cutover
- Output del smoke post-cutover
- Cualquier anomalía observada

Al cierre, ese doc se archiva en `docs/operations/cutover-reports/task-574-YYYY-MM-DD.md` para evidencia de audit.

---

## 9. Contactos / escalación

- **On-call Cloud operativo:** jreyes@efeoncepro.com (owner del proyecto GCP `efeonce-group`).
- **On-call HubSpot portal admin:** (cesargrowth11, owner del sibling).
- **Runbook este archivo:** `docs/operations/TASK-574-cutover-runbook.md` (mantenido por TASK-574 closing agent).
- **Spec canónica de TASK-574:** `docs/tasks/in-progress/TASK-574-absorb-hubspot-greenhouse-integration-service.md`.
