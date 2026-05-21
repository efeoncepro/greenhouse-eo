# Runbook — RpA V2 Demo Pipeline Activation (TASK-913 live activation)

> **Owner**: Greenhouse operator HR/Delivery (canonical maintainer demo teamspace).
> **Última actualización**: 2026-05-19 — Slice 4 closing + pre-wiring infraestructura.

## Estado actual (post-pre-wiring 2026-05-19)

✅ **Pre-wired por Greenhouse agent** (NO requiere acción operador):

| Item | Status | Detalle |
|---|---|---|
| Property `RpA` (number) en Tareas DB demo | ✅ Creada | Notion teamspace Demo Greenhouse data source `36339c2f-efe7-81a6-980c-000b0056bba8` (renombrada desde `[GH] RpA v2` 2026-05-20 — sandbox demo sin formula legacy con la que colisionar; productivo conserva `[GH] RpA v2`) |
| GCP secret `notion-integration-token-greenhouse-metrics-demo` | ✅ Container creado | `efeonce-group` project, replication automatic, sin version aún |
| IAM binding `roles/secretmanager.secretAccessor` | ✅ Otorgado | SA `greenhouse-portal@efeonce-group.iam.gserviceaccount.com` |
| Vercel env `NOTION_METRICS_DEMO_TOKEN_SECRET_REF` | ✅ Set (3 envs) | Production + Preview (develop) + Development |
| ops-worker Cloud Run env var wiring | ✅ Declarado en deploy.sh | Próximo deploy lo aplica automático |
| Writeback projection degradación honest | ✅ Hardened | `NotionDemoClientUnavailableError` → skip sin attempt_count burn / sin Sentry spam |

🚧 **Pendiente operador** (acciones UI-only que requieren acceso humano):

1. Crear Notion integration `Greenhouse Metrics Demo` (workspace owner-only en Notion Developer Portal)
2. Subir el token al GCP secret pre-creado
3. Crear Notion webhook subscription apuntando a endpoint demo
4. (Opcional) Smoke test live: editar status de una tarea demo y verificar PATCH

---

## Paso 1 — Crear Notion integration `Greenhouse Metrics Demo`

**Por qué**: token físicamente separado del productive `NOTION_TOKEN` con permisos SOLO sobre el teamspace Demo Greenhouse. Defense in depth canonical TASK-910 — demo NUNCA toca Efeonce/Sky productivos.

**Pasos**:

1. Abrir https://www.notion.so/profile/integrations (workspace owner del workspace Efeonce).
2. Click **"New integration"** → tipo **"Internal"**.
3. Configurar:
   - **Name**: `Greenhouse Metrics Demo`
   - **Associated workspace**: workspace Efeonce
   - **Capabilities**: marcar SOLO `Read content` + `Update content` + `Read user information without email addresses`
   - **NO** marcar `Read comments` ni `Insert content` ni capabilities que no sean estrictamente necesarias
4. Click **"Submit"** → copiar el **Internal Integration Secret** (formato `secret_xxxxxxxxxxxxxxxxxxxx`). **NO compartir ni committear** — se sube directo al GCP secret en el siguiente paso.
5. **Connect al teamspace Demo Greenhouse**:
   - Abrir el teamspace https://www.notion.so/36339c2fefe7814ca0f50042863dbb5a en Notion
   - Click `···` → **"Connections"** → **"Add connection"** → seleccionar `Greenhouse Metrics Demo`
   - Aceptar el modal
   - Repetir para las 3 databases del teamspace (Tareas, Proyectos, Sprints) si la conexión no es transitiva
6. **Verificar** que el integration NO tenga acceso a databases productive (Efeonce/Sky). En la UI de la integration, en **"Granted Resources"** debe aparecer SOLO Demo Greenhouse.

> ⚠️ **Hard rule canonical** (CLAUDE.md TASK-913): integration token demo DEBE estar restricted a teamspace Demo Greenhouse. NUNCA otorgar acceso a databases Efeonce/Sky.

## Paso 2 — Subir el token al GCP secret pre-creado

**Por qué**: el secret container `notion-integration-token-greenhouse-metrics-demo` ya existe (creado 2026-05-19 con IAM bindings). Solo falta agregar la version con el token.

**Comando canonical** (per CLAUDE.md "Secret Manager Hygiene" — `printf %s` evita newline trailing):

```bash
printf %s "<INTEGRATION_TOKEN_DEL_PASO_1>" | \
  gcloud secrets versions add notion-integration-token-greenhouse-metrics-demo \
    --project=efeonce-group \
    --data-file=-
```

**Verificación**:

```bash
gcloud secrets versions access latest \
  --secret=notion-integration-token-greenhouse-metrics-demo \
  --project=efeonce-group | head -c 30
# Esperado: prefijo `secret_xxxxx...` (truncado a 30 chars para no leak)
```

**Re-deploy ops-worker** para que recoja el nuevo IAM binding + token:

```bash
gh workflow run ops-worker-deploy.yml --ref develop
```

## Paso 3 — Crear Notion webhook subscription demo

**Por qué**: el handler `/api/webhooks/notion-tasks-demo` está deployed + HMAC validation activa, pero Notion no enviará events hasta que se cree la subscription.

**Pasos**:

1. Abrir https://www.notion.so/profile/integrations → click sobre `Greenhouse Metrics Demo`
2. Tab **"Webhooks"** → click **"Create a subscription"**
3. Configurar:
   - **Webhook URL**: `https://greenhouse.efeoncepro.com/api/webhooks/notion-tasks-demo`
   - **Description**: `TASK-913 Demo RpA V2 — Notion task status transitions sobre teamspace Demo Greenhouse`
   - **Filter events**: marcar SOLO `page.properties_updated` (capturar cambios de status) y opcionalmente `page.created` (V2 forward-compat)
4. Notion mostrará un **verification token** — copiarlo. Este es el HMAC signing secret canonical.
5. **Subir el signing secret al GCP secret canonical**:

```bash
printf %s "<NOTION_VERIFICATION_TOKEN>" | \
  gcloud secrets versions add notion-webhook-signing-secret-demo \
    --project=efeonce-group \
    --data-file=-
```

   > Si el secret `notion-webhook-signing-secret-demo` NO existe aún, crearlo primero:
   >
   > ```bash
   > gcloud secrets create notion-webhook-signing-secret-demo \
   >   --project=efeonce-group \
   >   --replication-policy=automatic \
   >   --labels=task=task-910,domain=delivery,scope=demo
   > gcloud secrets add-iam-policy-binding notion-webhook-signing-secret-demo \
   >   --member='serviceAccount:greenhouse-portal@efeonce-group.iam.gserviceaccount.com' \
   >   --role='roles/secretmanager.secretAccessor' \
   >   --project=efeonce-group
   > # Set Vercel env var (canonical hygiene):
   > printf %s "notion-webhook-signing-secret-demo" | \
   >   vercel env add NOTION_DEMO_WEBHOOK_SIGNING_SECRET_REF production --force --scope efeonce-7670142f
   > ```

6. Volver a la UI de Notion webhooks → completar verification → click **"Verify subscription"**. Notion enviará un test event que el handler validará via HMAC y devolverá 200 OK.
7. Estado esperado: subscription **"Active"** en la UI Notion.

## Paso 4 — Smoke test live (opcional pero recomendado)

**Verificar pipeline end-to-end**:

1. Abrir una tarea cualquiera del demo teamspace (e.g. crear una task "Test RpA V2" con status `Sin empezar`).
2. Cambiar status: `Sin empezar` → `En curso` → `Listo para revisión` → `Cambios solicitados` (esta última transition canonical dispara una corrección RpA = 1).
3. Esperar ~5 min (Cloud Scheduler ops-reactive-process cron tick).
4. Verificar en la tarea Notion que la property `RpA` ahora muestra `1` (escrito por el writeback projection).
5. Repetir transiciones `Listo para revisión` → `Cambios solicitados` para confirmar que el contador incrementa (RpA = 2, 3, ...).

**Observabilidad canonical post-activación**:

- `/admin/operations` Reliability Control Plane → subsystem `delivery` → signals:
  - `notion.metrics.shadow_paridad_rpa_demo` → severity ok cuando hay activity
  - `notion.metrics.echo_loop_detected_demo` → steady ok (count=0)
  - `notion.metrics.webhook_signature_failures_demo` → steady ok (count=0)
  - `notion.metrics.writeback_dead_letter_demo` → steady ok (count=0)
  - `notion.metrics.writeback_lag_demo` → steady ok (count=0)
  - `notion.metrics.demo_teamspace_drift` → steady ok (schema aligned canonical V1)
- Reliability signal CRITICAL `payroll.bonus.demo_member_contamination` → steady ok (count=0). Si alguna vez > 0 = bug en defense in depth — escalar immediate.

## Rollback canonical (si algo sale mal)

**Kill switch sin code change** (vía env var override):

```bash
# Apaga writeback demo (degradación honest — projection skip silente)
vercel env rm NOTION_METRICS_DEMO_TOKEN_SECRET_REF production --yes --scope efeonce-7670142f
vercel env rm NOTION_METRICS_DEMO_TOKEN_SECRET_REF preview --yes --scope efeonce-7670142f
vercel env rm NOTION_METRICS_DEMO_TOKEN_SECRET_REF development --yes --scope efeonce-7670142f
```

Sin el env var, `isDemoNotionWritebackConfigured()` → false, projection skipea con `:skipped:unconfigured`. Re-activar = re-set env vars + redeploy.

**Pause webhook subscription en Notion** (UI):

- https://www.notion.so/profile/integrations → `Greenhouse Metrics Demo` → tab Webhooks → toggle off la subscription

**Limpiar snapshots demo persistidos** (no afecta production):

```sql
-- Append-only triggers permiten DELETE de demo snapshots, pero verificar count antes
SELECT COUNT(*) FROM greenhouse_delivery.task_rpa_demo_snapshots WHERE workspace_id = 'demo';
-- DELETE FROM greenhouse_delivery.task_rpa_demo_snapshots WHERE workspace_id = 'demo';
```

> ⚠️ **NO** correr este DELETE en producción sin first verify que es demo data — la tabla físicamente separada CHECK constraint workspace_id='demo' es defense in depth, pero confirmar.

## Cross-refs canonical

- **Spec TASK-913**: `docs/tasks/complete/TASK-913-rpa-v2-demo-pipeline-end-to-end.md`
- **ADR Strangler**: `docs/architecture/GREENHOUSE_RPA_V2_STRANGLER_MIGRATION_V1.md`
- **TASK-910 demo teamspace foundation**: `docs/tasks/complete/TASK-910-notion-demo-teamspace-migration-sandbox.md`
- **TASK-910 governance doc**: `docs/operations/notion-demo-teamspace-governance.md`
- **CLAUDE.md hard rules**: sección "RpA V2 Demo Pipeline End-to-End invariants (TASK-913, desde 2026-05-19)"
- **AGENTS.md mirror**: sección "RpA V2 Demo Pipeline End-to-End (TASK-913, desde 2026-05-19)"
