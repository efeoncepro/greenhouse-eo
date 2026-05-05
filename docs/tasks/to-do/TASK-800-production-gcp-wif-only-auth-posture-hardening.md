# TASK-800 — Production GCP WIF-Only Auth Posture Hardening

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ops`
- Blocked by: `none`
- Branch: `task/TASK-800-production-gcp-wif-only-auth-posture-hardening`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cerrar la postura transicional de autenticacion GCP en Production: pasar el portal de modo mixto `WIF + service account key fallback` a modo `WIF-only`, con canary sin trafico, validacion real de consumidores GCP y retiro seguro de la llave estatica.

El objetivo es que `GET /api/internal/health` deje de reportar `overallStatus=degraded` por auth posture mixta sin introducir riesgo de outage en Cloud SQL, BigQuery, Secret Manager, GCS o Vertex AI.

## Why This Task Exists

Production esta operativo, pero mantiene una excepcion heredada: `GCP_AUTH_PREFERENCE` y `GOOGLE_APPLICATION_CREDENTIALS_JSON` permiten fallback a service account key aunque WIF ya esta configurado. Esa excepcion fue util para recuperar incidentes previos de Cloud SQL/BigQuery, pero hoy deja una llave estatica viva en un entorno que deberia operar con tokens efimeros.

Quitar la variable directamente en Production seria fragil: el runtime Vercel debe probar WIF real, con token OIDC real, contra los consumidores que importan. Esta task formaliza un corte controlado, reversible y auditable.

## Goal

- Validar un deployment production canary sin trafico usando `GCP_AUTH_PREFERENCE=wif` y sin `GOOGLE_APPLICATION_CREDENTIALS_JSON(_BASE64)`.
- Confirmar que Postgres Cloud SQL Connector, BigQuery, Secret Manager y storage/AI consumers siguen sanos con WIF-only.
- Cortar Production real a WIF-only solo despues de la validacion canary.
- Retirar o deshabilitar la service account key en GCP despues de observar que ya no se usa.
- Actualizar health/docs para que el steady state esperado sea `auth.mode=wif`, `selectedSource=wif`, `serviceAccountKeyConfigured=false`, `overallStatus=ok`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- No borrar ni rotar llaves GCP antes de validar WIF-only en un deployment real de Vercel sin trafico.
- No exponer valores de secretos, service account keys, OIDC tokens ni payloads crudos en logs/docs/chat.
- No usar `GOOGLE_APPLICATION_CREDENTIALS_JSON` como fallback silencioso despues del corte production.
- Si el canary falla, no promover ni modificar el dominio productivo; documentar el consumidor fallido y mantener production actual.
- Si se retira una key en GCP, verificar primero que ningun entorno requerido la consume y dejar rollback operacional claro.

## Normative Docs

- `AGENTS.md`
- `project_context.md`
- `Handoff.md`
- `docs/tasks/TASK_PROCESS.md`
- `.github/DEPLOY.md`

## Dependencies & Impact

### Depends on

- `src/lib/google-credentials.ts`
- `src/lib/cloud/gcp-auth.ts`
- `src/lib/cloud/health.ts`
- `src/lib/postgres/client.ts`
- `src/lib/bigquery.ts`
- `src/lib/secrets/secret-manager.ts`
- `src/lib/storage/greenhouse-media.ts`
- `src/lib/ai/google-genai.ts`
- Vercel project `greenhouse-eo` in scope `efeonce-7670142f`
- GCP project `efeonce-group`
- Service account `greenhouse-portal@efeonce-group.iam.gserviceaccount.com`
- Vercel Production env vars:
  - `GCP_AUTH_PREFERENCE`
  - `GCP_WORKLOAD_IDENTITY_PROVIDER`
  - `GCP_SERVICE_ACCOUNT_EMAIL`
  - `GCP_PROJECT`
  - `GOOGLE_APPLICATION_CREDENTIALS_JSON`
  - `GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64`

### Blocks / Impacts

- Production `/api/internal/health`.
- Admin Cloud/Ops Health posture.
- Cloud SQL access from Vercel production.
- BigQuery access from Vercel production.
- Secret Manager backed secrets in production.
- Private/public assets through GCS.
- Vertex AI / Google GenAI flows if enabled in production.

### Files owned

- `src/lib/google-credentials.ts`
- `src/lib/cloud/gcp-auth.ts`
- `src/lib/cloud/health.ts`
- `src/lib/cloud/gcp-auth.test.ts`
- `src/lib/google-credentials.test.ts`
- `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md`
- `project_context.md`
- `Handoff.md`
- `changelog.md`

## Current Repo State

### Already exists

- `src/lib/google-credentials.ts` supports `wif`, `service_account_key` and `ambient_adc`.
- `src/lib/cloud/gcp-auth.ts` detects `mode='mixed'` when WIF and static key coexist.
- `GET /api/internal/health` rolls up non-OK cloud posture checks into `overallStatus=degraded`.
- Production currently reports Postgres and BigQuery OK, but degraded due to mixed GCP auth posture.
- Vercel Production has WIF env vars and also `GOOGLE_APPLICATION_CREDENTIALS_JSON`.
- Cloud Run workers already deploy through GitHub Actions WIF and are not the primary blocker for this portal runtime cutover.

### Gap

- No controlled canary procedure exists for WIF-only production portal runtime.
- Production still has service account key fallback configured.
- The static key lifecycle in GCP has not been retired after validating WIF-only.
- There is no explicit guardrail preventing Production from drifting back to `mixed` without documented exception.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Discovery + WIF-only canary plan

- Confirmar Production env actual en Vercel sin imprimir valores secretos.
- Confirmar GCP WIF provider, service account impersonation y permisos efectivos de `greenhouse-portal`.
- Identificar user-managed keys activas del service account sin exponer material secreto.
- Definir rollback exacto: env vars a restaurar, deployment anterior y comandos de promotion/rollback.

### Slice 2 — Production canary without traffic

- Crear deployment production sin trafico con `vercel --prod --skip-domain` o flujo equivalente.
- Forzar en el deployment canary:
  - `GCP_AUTH_PREFERENCE=wif`
  - `GOOGLE_APPLICATION_CREDENTIALS_JSON` ausente o vacio
  - `GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64` ausente o vacio
- No mover `greenhouse.efeoncepro.com` durante este slice.

### Slice 3 — Real consumer validation

- Validar en el canary:
  - `/api/internal/health` HTTP 200.
  - `overallStatus=ok`.
  - `auth.mode=wif`.
  - `selectedSource=wif`.
  - `serviceAccountKeyConfigured=false`.
  - Postgres/Cloud SQL OK.
  - BigQuery OK.
  - Secret Manager backed refs OK.
- Validar rutas o probes representativos para GCS private/public assets y Google GenAI/Vertex AI si estan habilitados.
- Revisar logs 5xx/error del canary antes de cualquier promotion.

### Slice 4 — Production cutover

- Actualizar Vercel Production env para dejar WIF como unica fuente GCP.
- Remover `GOOGLE_APPLICATION_CREDENTIALS_JSON` y `GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64` de Production si existen.
- Redeploy/promotion controlada de `main`.
- Validar dominio real `greenhouse.efeoncepro.com` con los mismos checks del canary.
- Mantener rollback listo hasta completar soak inicial.

### Slice 5 — Static key retirement + guardrail

- Confirmar en GCP que la key estatica ya no se usa por Production.
- Deshabilitar o eliminar la key siguiendo el camino mas seguro disponible para user-managed service account keys.
- Documentar key id afectada sin exponer material secreto.
- Agregar guardrail operativo para que Production `mixed` sea warning/fail accionable o excepcion documentada, segun corresponda al contrato real del repo.

### Slice 6 — Docs + handoff

- Actualizar arquitectura cloud/security con el nuevo steady state.
- Actualizar `project_context.md` si cambia el contrato multi-agente de env/runtime.
- Actualizar `Handoff.md` con comandos, deployment URLs, verificaciones y riesgo residual.
- Actualizar `changelog.md` si cambia protocolo operacional o health behavior.

## Out of Scope

- Migrar todos los secretos legacy a Secret Manager.
- Separar infraestructura staging/production de Cloud SQL.
- Cambiar Cloud Run workers que ya usan WIF por GitHub Actions.
- Cambiar providers OAuth, NextAuth o SCIM.
- Eliminar todos los env fallbacks legacy del repo; esta task solo cierra Production GCP auth posture del portal.
- Rotar `NEXTAUTH_SECRET`, PostgreSQL password o webhook signing secrets.

## Detailed Spec

### Expected steady state

En Production, `GET /api/internal/health` debe reportar:

- `overallStatus=ok`
- `checks[].name='postgres'` con `ok=true`
- `checks[].name='bigquery'` con `ok=true`
- GCP auth posture:
  - `mode='wif'`
  - `selectedSource='wif'`
  - `workloadIdentityConfigured=true`
  - `serviceAccountKeyConfigured=false`
  - `serviceAccountEmailConfigured=true`
  - `providerConfigured=true`

### Cutover safety

El agente que implemente debe tratar esto como cambio sensible de production:

- Primero canary sin trafico.
- Luego validation.
- Luego cutover.
- Luego soak.
- Solo despues retirar key en GCP.

Si cualquier consumidor GCP falla en canary:

- No tocar el dominio productivo.
- No borrar la key.
- Documentar el consumidor fallido, stack/log redacted y decision de rollback/no-op.

### Security notes

- No imprimir valores de `GOOGLE_APPLICATION_CREDENTIALS_JSON`.
- No exportar tokens OIDC a archivos persistentes.
- No crear nuevas service account keys como workaround.
- No dejar `GCP_AUTH_PREFERENCE=service_account_key` en Production salvo excepcion temporal con owner, fecha de expiracion y task/issue asociada.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe evidencia de canary production sin trafico ejecutando WIF-only.
- [ ] Canary valida Postgres, BigQuery, Secret Manager y GCP auth posture sin service account key.
- [ ] Production real queda en `auth.mode=wif`, `selectedSource=wif`, `serviceAccountKeyConfigured=false`.
- [ ] `GET https://greenhouse.efeoncepro.com/api/internal/health` responde HTTP 200 con `overallStatus=ok`.
- [ ] Vercel Production ya no tiene `GOOGLE_APPLICATION_CREDENTIALS_JSON` ni `GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64`.
- [ ] La service account key estatica queda deshabilitada/eliminada o documentada como excepcion temporal con owner y fecha de retiro.
- [ ] Rollback queda documentado y probado al menos como procedimiento.
- [ ] No se imprimieron ni commitearon secretos.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/lib/google-credentials.test.ts src/lib/cloud/gcp-auth.test.ts`
- `vercel inspect <canary-deployment> --scope efeonce-7670142f`
- `vercel logs <canary-deployment> --scope efeonce-7670142f --status-code 500 --no-follow`
- `curl -sS <canary-url>/api/internal/health`
- `curl -sS https://greenhouse.efeoncepro.com/api/internal/health`
- `gcloud iam service-accounts keys list --iam-account greenhouse-portal@efeonce-group.iam.gserviceaccount.com --project efeonce-group`
- `gcloud run services describe ops-worker --project=efeonce-group --region=us-east4` solo como sanity de que workers siguen Ready si el corte coincide con deploys.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `project_context.md` y arquitectura cloud quedaron alineados al nuevo contrato WIF-only
- [ ] se registro cualquier excepcion temporal de key/fallback con owner y fecha de retiro

## Follow-ups

- Evaluar task separada para migrar env fallbacks legacy restantes a Secret Manager donde aplique.
- Evaluar enforcement CI/ops que alerte si Production vuelve a `mode='mixed'`.
- Evaluar limpieza de user-managed keys no usadas en otras service accounts de `efeonce-group`.

## Open Questions

No bloqueantes para crear la task:

- La implementacion debe decidir si el retiro final de la key sera `disable` primero o `delete` directo, segun capacidades reales de `gcloud iam service-accounts keys` y politica GCP vigente.
- La implementacion debe decidir si el guardrail de `mixed` queda solo en health/reliability o tambien en un script `gcp:doctor`/CI.
