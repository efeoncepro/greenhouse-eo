# TASK-581 — Cutover de un tirón + sibling retirement + docs (EPIC-005)

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-005`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `infra / ops`
- Blocked by: `TASK-577`, `TASK-578`, `TASK-579`, `TASK-580`, `TASK-582` (todos deben estar cerrados)
- Branch: `task/TASK-581-notion-sync-cutover-and-sibling-retirement`
- Legacy ID: `—`
- GitHub Issue: `—`

## Summary

Ejecutar el cutover atómico del flujo Notion↔HubSpot desde el sibling `cesargrowth11/notion-hubspot-sync` hacia los orchestrators de Greenhouse (TASK-579 forward + TASK-580 reverse), incluyendo staging validation profunda + production cutover + 48h rollback window + retirement del sibling + actualización exhaustiva de docs + agent rules. Sin ventana paralelo de 2 semanas. Rollback path preserved 48h post-cutover por si aparece regresión.

## Why This Task Exists

- EPIC-005 decidió cutover de un tirón, no paralelo largo. Requiere este task para orquestar la transición atómica.
- Los 5 child tasks anteriores dejaron Greenhouse capaz de reemplazar al sibling end-to-end. Falta el acto de switch + retirement sanitario.
- Docs + AGENTS + CLAUDE + REPO_ECOSYSTEM necesitan actualización en el mismo PR que el cutover para que ningún agente nuevo siga dirigiéndose al sibling como source of truth.

## Goal

- Staging validation profunda: ≥1 ciclo completo simulado + parity check vs último output del sibling.
- Production cutover: deploy Greenhouse orchestrators + pausar Cloud Scheduler jobs del sibling en la misma ventana.
- 48h rollback window con Cloud Functions del sibling vivas pero sin schedule.
- Post-48h sin regresión: retirement (delete Cloud Functions + BQ datasets + stub README en sibling).
- Docs nuevas: `docs/documentation/delivery/orquestacion-commercial-delivery.md`.
- Docs actualizadas: `GREENHOUSE_REPO_ECOSYSTEM_V1.md`, `GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`, `GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`, `AGENTS.md`, `CLAUDE.md`, `.codex/` equivalentes.
- Handoff.md + changelog.md registran la transición.

## Architecture Alignment

- `docs/epics/to-do/EPIC-005-greenhouse-commercial-delivery-orchestrator.md`
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`

Reglas obligatorias:

- **Cutover atómico**: la misma ventana de 60-120 min: deploy Greenhouse + pausar scheduler sibling. Dos commits pueden ser (uno en greenhouse-eo + uno en sibling) pero ejecución alineada.
- **48h observability window**: monitoring activo — Sentry, Cloud Logging ops-worker, webhook hit rate, canonical divergence metrics.
- **Rollback: un comando**. `gcloud scheduler jobs resume` + redeploy Cloud Function si hubo DELETE accidental (no debería haber DELETE antes de 48h).
- **Sibling code NOT deleted antes de 48h**. Solo schedulers pausados.
- **Post-48h retirement es un PR separado** en el sibling (`stub README` + borrado de Cloud Functions + datasets BQ) que se mergea después del monitoring window.

## Normative Docs

- Todos los TASK-577 a TASK-580 + TASK-582 cerrados.
- `docs/epics/to-do/EPIC-005-greenhouse-commercial-delivery-orchestrator.md` — Validation / Definition of Done

## Dependencies & Impact

### Depends on

- `TASK-577`, `TASK-578`, `TASK-579`, `TASK-580`, `TASK-582` todas cerradas y deployadas a staging validated.
- Acceso admin Cloud Scheduler + Cloud Functions + BQ en GCP `efeonce-group`.
- Acceso read/write al sibling `cesargrowth11/notion-hubspot-sync`.

### Blocks / Impacts

- Último milestone de EPIC-005. Post-cutover, el epic cierra.
- Impacta operaciones: durante 60-120 min de la ventana de cutover, hay riesgo de eventos perdidos. Comunicar al equipo antes.

### Files owned

En `greenhouse-eo`:

- `docs/documentation/delivery/orquestacion-commercial-delivery.md` (nueva)
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md` (update sección 3 + quick-ref)
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` (update tablas de Cloud Functions + schedulers)
- `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md` (ya cubierto en TASK-577; confirm)
- `AGENTS.md` + `CLAUDE.md` + `.codex/` equivalentes + `project_context.md`
- `Handoff.md`, `changelog.md`

En sibling `cesargrowth11/notion-hubspot-sync`:

- `README.md` (stub apuntando a `efeoncepro/greenhouse-eo` + fecha de cutover)
- `deploy.sh` (header comentado: "DEPRECATED — replaced by Greenhouse orchestrators 2026-MM-DD")
- `main.py` + `hubspot-notion-sync/` (dejar intacto 48h; borrar en PR separado post-window)

## Current Repo State

### Already exists post-prerequisites

- Greenhouse orchestrators (forward TASK-579 + reverse TASK-580) live en staging + production, deployados pero sin tráfico real (o con tráfico paralelo si el usuario quiere validation previa).
- Notion Write Bridge (TASK-577) live.
- Mapping Registry (TASK-578) live con seed completo.
- Monthly Project Admin Surface (TASK-582) live.
- Sibling sigue corriendo sus 2 Cloud Functions + 2 schedulers.

### Gap

- Cutover not executed. Sibling sigue siendo source of truth del write flow.
- Docs aún dicen que el sibling es source of truth.
- Agents siguen recibiendo la instrucción de "consultar el repo hermano para cambios del bridge".

## Scope

### Slice 1 — Staging validation profunda

Pre-cutover gate obligatorio:

- Durante ≥24h previas al cutover production, correr Greenhouse orchestrators en staging con tráfico real de staging HubSpot sandbox + Notion staging.
- Parity check: comparar eventos procesados por sibling staging vs orchestrator staging durante una ventana de 24h. Diff ≤ 5% es pasa; > 5% requiere fix antes de prod cutover.
- Específicamente validar:
  - Deals creados/actualizados en HubSpot sandbox reflejan en Notion staging via Greenhouse
  - Tasks editados en Notion staging reflejan en HubSpot sandbox via Greenhouse
  - Monthly project auto-provisioning preview funciona
  - Back-pressure prevention: no hay loops detectados
- Logs del orchestrator muestran 0 dead letters sostenidos.

### Slice 2 — Communication + schedule

- Anuncio al equipo 48h antes del cutover (via email + Slack + Handoff entry).
- Ventana de cutover: 60-120 min, idealmente horario bajo uso (ej. 06:00 CLT martes).
- Runbook del cutover documentado antes del día D.
- Rollback checklist con comandos exactos.

### Slice 3 — Production cutover

Orden de ejecución en la ventana:

1. **T-10 min**: staging smoke final.
2. **T=0**: merge PR en `greenhouse-eo` con:
   - Orchestrator flags flipped a `production` mode (si existe kill switch).
   - Docs actualizadas (REPO_ECOSYSTEM, AGENTS, CLAUDE, .codex, project_context).
3. **T+5**: pausar sibling Cloud Scheduler jobs:
   ```bash
   gcloud scheduler jobs pause notion-hubspot-reverse-poll --location=us-central1
   gcloud scheduler jobs pause hubspot-notion-deal-poll --location=us-central1
   ```
4. **T+10**: smoke manual production:
   - Editar un deal real en HubSpot + verificar projection a Notion vía Greenhouse
   - Editar un task real en Notion + verificar projection a HubSpot vía Greenhouse
   - Confirmar ausencia de tráfico en los endpoints Cloud Functions del sibling (Cloud Run logs muestran silent)
5. **T+30**: commit en sibling con header DEPRECATED + stub README.
6. **T+60**: validación con operaciones — que un human-user edite y confirme lo ve reflejado.

### Slice 4 — 48h rollback window monitoring

- Dashboard Sentry + Cloud Logging filtrado a `ops-worker` + `hubspot-greenhouse-integration` + `commercial-delivery-forward-projector` + `delivery-to-commercial-reverse-projector`.
- Alert rules:
  - Dead letter count > 5 en 1h
  - Reverse projection failure rate > 2% sobre 100 eventos
  - Canonical divergence detected (forward projection escribe a Notion pero reverse no re-ingresa esa edit dentro de 5 min — señal de back-pressure roto)
- Si alerta crítica: rollback = `gcloud scheduler jobs resume` + kill switch Greenhouse orchestrators (flag off) + investigar en calma.

### Slice 5 — Post-48h retirement (sibling cleanup)

PR separado en `cesargrowth11/notion-hubspot-sync`:

- Borrar físicamente `main.py` + `hubspot-notion-sync/` + `deploy.sh` + `requirements.txt` + `tests/` etc.
- Dejar solo:
  - `README.md` stub: "Moved to efeoncepro/greenhouse-eo EPIC-005 on YYYY-MM-DD. This repo is archived."
  - `LICENSE` (si existe).
- Borrar Cloud Functions:
  ```bash
  gcloud functions delete notion-hubspot-reverse-sync --region=us-central1
  gcloud functions delete hubspot-notion-deal-sync --region=us-central1
  ```
- Borrar Cloud Scheduler jobs permanentemente:
  ```bash
  gcloud scheduler jobs delete notion-hubspot-reverse-poll --location=us-central1
  gcloud scheduler jobs delete hubspot-notion-deal-poll --location=us-central1
  ```
- Borrar BQ datasets o renombrar a `*_archived`:
  ```bash
  bq rm -r -f notion_hubspot_reverse_sync
  bq rm -r -f hubspot_notion_sync
  ```
  Alternativa más segura: export + archive a GCS antes de borrar.
- Mantener staging datasets 1 mes más como safety (borrar tras mes sin issues).

### Slice 6 — Docs update (en el PR del cutover)

- `docs/documentation/delivery/orquestacion-commercial-delivery.md` nueva: explicación funcional del orchestrator end-to-end, incluyendo:
  - Cómo funciona (forward + reverse + reconciliation + full-sync)
  - Conflict resolution policy state-machine
  - Mapping Registry governance
  - Monthly project admin surface
  - Cómo debuggear (Cloud Logging + Sentry + outbox inspection)
  - FAQ operacional
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md` sección 3 re-escrita: sibling `notion-hubspot-sync` declarado ARCHIVED + quick-reference table apunta el flow a `greenhouse-eo`.
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`: elimina tables de Cloud Functions + schedulers del sibling; agrega las del orchestrator.
- `AGENTS.md` + `CLAUDE.md` + `.codex/` equivalentes: remove referencias al sibling como fuente, agregan el orchestrator como source.
- `project_context.md`: update summary del stack integraciones.

### Slice 7 — Handoff + changelog

- `Handoff.md` entry fecha del cutover + revisión deployada + smoke ejecutado + métricas de 48h window.
- `changelog.md` entry con el impacto operativo.

## Out of Scope

- Archivar el repo GitHub del sibling. Sigue vivo pero con stub README — decisión del owner GitHub si lo archive formalmente más adelante.
- Decommissionar la HubSpot Developer Platform app del sibling (`hsproject.json` 2025.2). Esa app todavía la usa el BQ ingestion del sibling — cubierto por TASK-575 si querés upgradearla.
- Borrar los BigQuery datasets del sibling inmediatamente. 30 días de safety window post-cutover antes del borrado definitivo.

## Detailed Spec

### Runbook completo del cutover

Archivar en `scripts/runbooks/epic-005-cutover.md` como parte de esta task, con:

- Pre-flight checklist (staging validation, team comms, rollback commands prepared)
- Ventana T-10 a T+60 con comandos exactos
- Rollback procedure (gcloud scheduler resume + flags off + Sentry alert config)
- Post-window cleanup steps (día +2)

### Rollback command reference

```bash
# En caso de regresión crítica durante la ventana de 48h:
gcloud scheduler jobs resume notion-hubspot-reverse-poll --location=us-central1
gcloud scheduler jobs resume hubspot-notion-deal-poll --location=us-central1

# Kill switch Greenhouse orchestrators (env var flip + redeploy):
gcloud run services update ops-worker --region=us-central1 \
  --update-env-vars=COMMERCIAL_DELIVERY_ORCHESTRATOR_ENABLED=false

# Verificar que sibling retomó el flow:
gcloud scheduler jobs list --location=us-central1 | grep notion-hubspot
# Ambos deben estar en ENABLED.
```

## Acceptance Criteria

- [ ] Staging validation 24h pasada con diff ≤ 5% vs sibling.
- [ ] Comunicación al equipo 48h antes.
- [ ] Runbook `scripts/runbooks/epic-005-cutover.md` publicado antes del cutover.
- [ ] Production cutover ejecutado en ventana 60-120 min.
- [ ] Sibling schedulers pausados (no delete) en ventana de cutover.
- [ ] Smoke post-cutover ok: edit deal HubSpot + edit task Notion ambos reflejan via Greenhouse.
- [ ] 48h monitoring sin alertas críticas.
- [ ] Post-48h: PR separado en sibling con stub README + Cloud Functions borradas + BQ datasets archivados.
- [ ] `docs/documentation/delivery/orquestacion-commercial-delivery.md` publicada.
- [ ] `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md` declara sibling ARCHIVED.
- [ ] `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` refleja nueva topología.
- [ ] `AGENTS.md`, `CLAUDE.md`, `.codex/` equivalentes, `project_context.md` actualizados.
- [ ] `Handoff.md` + `changelog.md` registran la transición.
- [ ] EPIC-005 cierra: archivo movido a `docs/epics/complete/`, `EPIC_ID_REGISTRY.md` y `docs/epics/README.md` sincronizados.

## Verification

- `gcloud scheduler jobs list --location=us-central1` muestra sibling jobs PAUSED durante 48h.
- Post-retirement: `gcloud functions list --regions=us-central1 | grep notion-hubspot` devuelve vacío.
- Notion audit log muestra solo la integration `Greenhouse Commercial-Delivery Orchestrator` escribiendo; la de `notion-bigquery` sigue activa read-only.
- HubSpot logs muestran writes desde el bridge absorbido solamente (no del sibling Cloud Function).

## Closing Protocol

- [ ] `Lifecycle` sincronizado + archivo en carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] EPIC-005 completo — archivo movido a `docs/epics/complete/`
- [ ] `Handoff.md` + `changelog.md` cierre del epic
- [ ] Chequeo cruzado cerrado sobre TASK-574 (si aún no cerrada pre-cutover, coordinar; TASK-574 puede ser pre-requisito previo)

## Follow-ups

- Archivar repo sibling en GitHub (decisión del owner).
- Decommissionar hsproject.json v2025.2 del sibling si se quiere (no bloquea porque ya está retired; coordinar con TASK-575).
- Post-mortem del EPIC-005 post 30 días: ¿la estrategia híbrida cumplió reliability targets? ¿Se puede eliminar reconciliation polling?

## Delta 2026-04-29

Decision operativa tomada antes del cutover formal: el sibling **`cesargrowth11/notion-hubspot-sync`** (`https://github.com/cesargrowth11/notion-hubspot-sync`) queda congelado como runtime legacy porque la implementacion actual no se considera suficientemente robusta. La absorcion se hara despues sobre Greenhouse como orquestador canonico; no se implementara una nueva ronda de fixes dentro del sibling.

Estado runtime verificado el 2026-04-29: se pausaron exclusivamente los Cloud Scheduler jobs de ese repo en `efeonce-group/us-central1`:

- `notion-hubspot-reverse-poll` — `PAUSED`
- `hubspot-notion-deal-poll` — `PAUSED`
- `notion-hubspot-reverse-poll-staging` — `PAUSED`
- `hubspot-notion-deal-poll-staging` — `PAUSED`

No se pausaron schedulers de `notion-bigquery`, `hubspot-bigquery`, `ops-worker`, Greenhouse ni otros servicios.

Implicacion para esta task:

- Slice 4 ya no debe asumir que el sibling sigue corriendo hasta T+5; el estado base puede ser "schedulers ya pausados desde 2026-04-29".
- El parity check debe usar logs/BigQuery/historial previo del sibling o una reactivacion manual temporal y controlada, nunca un resume permanente.
- El rollback command `gcloud scheduler jobs resume ...` debe tratarse como accion excepcional aprobada por el owner, porque reactivar el sibling tambien reactiva el comportamiento legacy que se decidio congelar.
- Actualizar el runbook de cutover para distinguir claramente entre "pre-freeze 2026-04-29" y "cutover/retirement definitivo".

## Open Questions

- Ventana exacta del cutover (día y hora). Decisión operativa al momento de agendar.
- Coordinación con TASK-574 cierre: si TASK-574 aún no cerró al momento del cutover de EPIC-005, hay riesgo de dos cutovers cerca — preferible TASK-574 cerrada antes para no mezclar fuentes de regresión.
