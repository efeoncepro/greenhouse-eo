# TASK-1886 — HubSpot services: un solo read path, command por servicio y traza del intake async

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `sync`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `crm|platform|ops|data`
- Blocked by: `none`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Converge la lectura de servicios HubSpot (`p_services`, objeto 0-162) en un solo camino: el cliente in-app directo que ya
usan el webhook y el backfill. Hoy el cron diario de red de seguridad y tres rutas admin siguen leyendo por el bridge
Cloud Run. Agrega además un command canónico por servicio, una traza legible del intake async con su señal de
reliability, un backoff corto para servicios recién creados y la higiene del parser de env que usan las herramientas.
Implementa el ADR `GREENHOUSE_HUBSPOT_SERVICE_SYNC_READ_PATH_DECISION_V1.md` (Proposed).

## Why This Task Exists

El post-mortem del alta de `SVC-HS-591725750952` (Sky Blog, 2026-09-24) dejó cinco hallazgos verificados:

1. **Dos read paths para el mismo objeto.** `hubspot_services_intake` y `scripts/services/backfill-from-hubspot.ts` leen
   HubSpot directo (`batchReadServices`). `src/lib/services/service-sync.ts` lee por el bridge
   (`getHubSpotGreenhouseCompanyServices` → `/companies/{id}/services`) y fuerza `syncStatus='synced'`. De ese segundo
   camino dependen el cron `ops-hubspot-services-sync` (06:00 diario en el ops-worker, vía
   `src/lib/cron-orchestrators/index.ts`), `src/app/api/cron/services-sync/route.ts`,
   `src/app/api/admin/ops/services-sync/route.ts`, `src/app/api/admin/integrations/hubspot/orphan-services/route.ts` y
   `src/app/api/integrations/hubspot/services/sync/route.ts`. **La red de seguridad depende del mismo servicio Python que
   se quiere retirar** (memoria del repo: el write path moderno es in-app, TASK-1230).
2. **El intake async es invisible.** La cadena webhook → `intake_requested` → `ops-outbox-publish` (`*/2`) →
   `ops-reactive-finance` (`*/5`) tiene una latencia diseñada de hasta ~7 min. No existe forma de ver «está en vuelo»,
   así que un operador o agente concluye «no llegó» y re-upsertea a mano (caso real: convergió en 83 s y el re-upsert
   fue redundante).
3. **No existe command por servicio.** Refrescar un servicio concreto desde HubSpot hoy se hace con scripts de sesión.
   Viola Full API Parity.
4. **Servicios recién creados reintentan.** 4 de los últimos 6 batches del intake fallaron el primer intento con
   `organization_unresolved` y convergieron tras 2 reintentos (~45 min). Circuito `hubspot_services_intake`:
   `failed_runs_window=7/11`. `TASK-1710` y `TASK-1432` lo listan como degradado **sin dueño**.
5. **El parser de env de las herramientas no des-escapa.** `scripts/lib/load-greenhouse-tool-env.ts` conserva `\r\n`
   literales dentro de comillas dobles, a diferencia de `@next/env`/dotenv. Un `.env.production.local` sucio produjo
   una URL del bridge con basura y un 404 HTML que se atribuyó al bridge. `normalizeBaseUrl` en
   `src/lib/integrations/hubspot-greenhouse-service.ts` sólo hace `trim()`.

## Goal

- Un solo read path HubSpot → Greenhouse para servicios, sin consumer de lectura del bridge en el monorepo.
- Un command `syncHubSpotServiceById` y un reader `readHubSpotServiceIntakeTrace` con CLI y ruta `app` gobernada.
- Señal `commercial.service_engagement.intake_lag` registrada con steady state 0.
- Servicios recién creados convergen en el primer o segundo tick, no en ~45 min.
- Las herramientas leen `.env*.local` con la misma semántica que Next y fallan temprano ante URLs corruptas.

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
- `docs/architecture/GREENHOUSE_HUBSPOT_SERVICE_SYNC_READ_PATH_DECISION_V1.md` (ADR de esta task; pasa a `Accepted` al cerrar)
- `docs/architecture/GREENHOUSE_HUBSPOT_SERVICES_INTAKE_V1.md` (§Invariantes TASK-813/836 y §Delta 2026-09-24)
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/agent-invariants/INTEGRATIONS_INFRA_AGENT_INVARIANTS.md`

Reglas obligatorias:

- **NUNCA** sincronizar Greenhouse → HubSpot `0-162` desde esta task (sólo lectura; el back-fill `ef_*` sigue en su dueño).
- **NUNCA** matchear servicios por nombre ni borrar filas legacy; el match es por `UNIQUE hubspot_service_id`.
- **NUNCA** hardcodear `pipeline_stage`/`status`: se usa `mapHubSpotStageToLifecycle` dentro de `upsertServiceFromHubSpot`.
- **NUNCA** hacer fetch HubSpot síncrono en un route handler de webhook (TASK-813b/878).
- **SIEMPRE** escribir servicios sólo por `upsertServiceFromHubSpot` (audit + outbox existentes).
- **SIEMPRE** `captureWithDomain(err, 'integrations.hubspot', …)`, nunca Sentry directo.
- La señal nueva no se computa en cliente y usa `redactSensitive` si expone payload.

## Normative Docs

- `docs/operations/CLIENT_SERVICE_ENABLEMENT_RUNBOOK_V1.md` (consumidor: el alta de servicios depende de que el servicio exista)
- `docs/manual-de-uso/growth/asignar-modulo-seo-organizacion.md` (§Caso Sky: describe el síntoma que esta task elimina)
- Skill `hubspot-greenhouse-bridge` y skill `greenhouse-secret-hygiene` (para el slice de env)

## Dependencies & Impact

### Depends on

- `src/lib/hubspot/list-services-for-company.ts` (`listServiceIdsForCompany`, `batchReadServices`, `fetchServicesForCompany`)
- `src/lib/services/upsert-service-from-hubspot.ts` (helper canónico TASK-813a/836)
- `src/lib/sync/projections/hubspot-services-intake.ts` y `src/lib/sync/refresh-queue.ts`
- Tablas `greenhouse_sync.webhook_inbox_events`, `greenhouse_sync.outbox_events`, `greenhouse_sync.outbox_reactive_log`,
  `greenhouse_sync.projection_refresh_queue`, `greenhouse_core.services`
- Secret `hubspot-access-token` (token canónico único)

### Blocks / Impacts

- `TASK-1710` y `TASK-1432`: esta task pasa a ser dueña de la fila «`hubspot_services_intake` degradado» (Delta en ambas).
- `TASK-576`: lista `src/lib/services/service-sync.ts` entre sus archivos; coordinar si se toma en paralelo.
- `TASK-1408`: vecina (credenciales GCP en `src/lib/google-credentials.ts`), no se solapa; esta task no toca ese archivo.
- `services/hubspot_greenhouse_integration/app.py` ruta `/companies/<id>/services`: queda sin consumer en el monorepo;
  su retiro es follow-up del dueño del bridge (TASK-574 follow-up), no de esta task.
- `TASK-1852` y el runbook de habilitación: el command por servicio reemplaza los scripts de sesión.

### Files owned

- `src/lib/services/service-sync.ts`
- `src/lib/services/sync-hubspot-service-by-id.ts` [nuevo]
- `src/lib/services/hubspot-service-intake-trace.ts` [nuevo]
- `src/lib/reliability/queries/services-intake-lag.ts` [nuevo]
- `src/lib/sync/projections/hubspot-services-intake.ts` (sólo el backoff de `organization_unresolved`)
- `src/lib/integrations/hubspot-greenhouse-service.ts` (sólo `normalizeBaseUrl`)
- `scripts/lib/load-greenhouse-tool-env.ts`
- `scripts/services/sync-hubspot-service.ts` [nuevo], `scripts/services/trace-hubspot-service.ts` [nuevo]
- `scripts/ci/env-local-hygiene-gate.mjs` [nuevo, nombre verificar contra gates existentes]
- `docs/architecture/GREENHOUSE_HUBSPOT_SERVICE_SYNC_READ_PATH_DECISION_V1.md`

## Current Repo State

### Already exists

- Cliente directo con batch ≤100: `src/lib/hubspot/list-services-for-company.ts`.
- Helper canónico de escritura con lifecycle mapper y outbox `materialized`/`lifecycle_changed`:
  `src/lib/services/upsert-service-from-hubspot.ts`.
- Intake async con retry `maxRetries: 3`: `src/lib/sync/projections/hubspot-services-intake.ts`.
- Señales vecinas: `src/lib/reliability/queries/services-sync-lag.ts` (`commercial.service_engagement.sync_lag`, servicios
  sin sync > 24 h) y `src/lib/reliability/queries/services-organization-unresolved.ts`.
- Cron diario `ops-hubspot-services-sync` (06:00) en `services/ops-worker/deploy.sh:1903` → `runHubspotServicesSync` en
  `src/lib/cron-orchestrators/index.ts:236-250` → `syncAllOrganizationServices` (bridge).
- Ruta del bridge sana en producción (200); el 404 observado fue corrupción del env local.

### Gap

- `service-sync.ts:4,169-171,221` sigue leyendo por el bridge y fuerza `synced`.
- No hay command por servicio ni reader de traza; no hay señal de latencia del intake (la vecina `sync_lag` mira 24 h y
  no ve un evento atascado entre publisher y reactive).
- `organization_unresolved` en servicios nuevos usa la escalera de retry genérica.
- `load-greenhouse-tool-env.ts` no des-escapa; `normalizeBaseUrl` no valida.

## Modular Placement Contract

- Topology impact: `worker`
- Current home: `src/lib/services/**`, `src/lib/sync/projections/**`, `src/lib/reliability/queries/**` (bundle Vercel + ops-worker), `scripts/**` (tooling local)
- Future candidate home: `domain-package`
- Boundary: `syncHubSpotServiceById` (command) y `readHubSpotServiceIntakeTrace` (reader) son los primitives; consumers autorizados: rutas `api/platform/app`, cron orchestrator del ops-worker, CLIs y la projection del intake
- Server/browser split: server-only en su totalidad (`import 'server-only'`); token HubSpot y DB nunca llegan al browser
- Build impact: none (sin SDK nuevo; `fetch` nativo contra `api.hubapi.com`)
- Extraction blocker: el upsert comparte transacción/outbox con `greenhouse_core.services`; el command debe moverse junto con `upsert-service-from-hubspot.ts`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `sync`
- Source of truth afectado: HubSpot `p_services` (0-162) es la fuente; `greenhouse_core.services` es la proyección
- Consumidores afectados: cron `ops-hubspot-services-sync`, rutas admin de servicios, intake reactivo, habilitación de servicios (TASK-1852), agentes/CLI
- Runtime target: `production` (Vercel + ops-worker) y tooling local

### Contract surface

- Contrato existente a respetar: `upsertServiceFromHubSpot` (input/outbox), shape de respuesta de las 4 rutas admin/cron, `commercial.service_engagement.intake_requested v1`
- Contrato nuevo o modificado: command `syncHubSpotServiceById(hubspotServiceId, { source })`; reader `readHubSpotServiceIntakeTrace(hubspotServiceId)`; rutas `POST /api/platform/app/commercial/services/hubspot/{hubspotServiceId}/sync` y `GET …/trace` [verificar convención de path del lane app]; señal `commercial.service_engagement.intake_lag`
- Backward compatibility: `compatible` (las rutas existentes conservan su shape; cambia sólo la fuente de lectura)
- Full API parity: el command y el reader nacen con ruta `app`, CLI y consumo desde el cron; Nexa lo opera por construcción (write vía propose → confirm → execute)

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_core.services` (escritura sólo vía helper), lectura de `greenhouse_sync.webhook_inbox_events`, `outbox_events`, `outbox_reactive_log`, `projection_refresh_queue`
- Invariantes que no se pueden romper:
  - Un servicio HubSpot = una fila (`UNIQUE hubspot_service_id`).
  - Importes ausentes quedan `NULL`, nunca `0` (TASK-1852).
  - `hubspot_sync_status` refleja el mapeo real (`synced`/`unmapped`), nunca forzado a `synced`.
  - El intake nunca hace fetch síncrono dentro del webhook.
- Write-target allowlist: N/A (el dominio servicios no tiene boundary test de destinos)
- Tenant/space boundary: la organización y el space se resuelven por la asociación company del servicio (`clients.hubspot_company_id`), igual que el intake; nunca por parámetro del caller
- Idempotency/concurrency: UPSERT por `hubspot_service_id`; el command es idempotente y no emite `lifecycle_changed` sin diff
- Audit/outbox/history: reutiliza `materialized v1` y `lifecycle_changed v1` del helper; el command agrega `source` explícito

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: el cambio de read path va detrás de `HUBSPOT_SERVICES_DIRECT_READ_ENABLED` (default `false`) hasta comparar paridad
- Backfill plan: no hay backfill; el cron diario re-lee todo al activar el flag (dry-run comparativo antes)
- Rollback path: flag a `false` + redeploy (vuelve al bridge); el resto es aditivo (revert PR)
- External coordination: declarar el flag en `services/ops-worker/deploy.sh` **y** en Vercel (se lee en ambos runtimes); fila en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`

### Security and access

- Auth/access gate: rutas `app` con capability de lectura/escritura comercial existente [verificar: `commercial.engagement.read` / `commercial.engagement.declare` o crear `commercial.service.sync` con grant a `efeonce_admin` y `efeonce_account` en el mismo PR]
- Sensitive data posture: sin PII; la traza no expone headers ni `raw_body_text` del inbox (sólo ids, tipos de evento y timestamps)
- Error contract: `canonicalErrorResponse` con códigos nuevos si hacen falta (`hubspot_service_not_found`, `hubspot_service_company_unresolved`)
- Abuse/rate-limit posture: el command por servicio usa un solo `batchRead` + una asociación; sin rate limit adicional

### Runtime evidence

- Local checks: tests focales del command, reader, backoff y parser de env (caso `\r\n` literal reproducido)
- DB/runtime checks: traza real de `591725750952` y de un servicio legacy; señal `intake_lag` = 0 en producción
- Integration checks: dry-run comparativo bridge vs directo sobre todas las companies con servicios (diff = 0 salvo `syncStatus` corregido)
- Reliability signals/logs: `commercial.service_engagement.intake_lag`, `commercial.service_engagement.sync_lag`, circuito `hubspot_services_intake`
- Production verification sequence: ver `## Rollout Plan & Risk Matrix`

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se actualiza solo.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

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

### Slice 1 — Higiene de env para tooling

- `load-greenhouse-tool-env.ts` des-escapa `\n`, `\r`, `\t` dentro de comillas dobles como dotenv; comillas simples quedan literales.
- `normalizeBaseUrl` valida con `new URL()` y rechaza caracteres de control; el error nombra la variable, nunca el valor.
- Gate local `env-local-hygiene` que falla ante `\r\n` literal o whitespace residual en `.env*.local` (reporta sólo nombres).
- Tests que reproducen el caso real.

### Slice 2 — Command y reader canónicos

- `syncHubSpotServiceById`: `batchReadServices([id])` + asociación company + space + `upsertServiceFromHubSpot`.
- `readHubSpotServiceIntakeTrace`: inbox → `intake_requested` → publicado → reaccionado/cola → `hubspot_last_synced_at`, con estado derivado (`in_flight`, `converged`, `stuck`, `not_received`) y la latencia diseñada.
- Rutas `app` y CLIs `pnpm hubspot:service:sync <id>` y `pnpm hubspot:service:trace <id>`.

### Slice 3 — Convergencia del read path

- `service-sync.ts` lee con `fetchServicesForCompany` detrás de `HUBSPOT_SERVICES_DIRECT_READ_ENABLED`; deja de forzar `synced`.
- Dry-run comparativo bridge vs directo sobre todas las companies con servicios; el resultado queda en la task.
- Tras flag ON estable, retirar el import de `getHubSpotGreenhouseCompanyServices` de `service-sync.ts`.

### Slice 4 — Señal `intake_lag` y backoff corto

- Señal `commercial.service_engagement.intake_lag`: evento `intake_requested` publicado sin reacción > 10 min = warning; > 30 min = error; steady 0.
- Primer reintento de `organization_unresolved` a ~2 min en el intake; el resto de la escalera sin cambios.

### Slice 5 — Documentación y cierre del ADR

- ADR a `Accepted`, delta en la spec de intake, runbook «traza antes de re-upsertear», manual y funcional de servicios HubSpot.

## Out of Scope

- Retirar el servicio Python o su ruta `/companies/<id>/services` (follow-up del dueño del bridge).
- Cualquier escritura Greenhouse → HubSpot `0-162`.
- Cambiar la cadencia de `ops-outbox-publish` o de las lanes reactivas.
- `sync-company-by-id.ts` y el resto de lecturas de companies/contacts por el bridge.
- Credenciales GCP de `src/lib/google-credentials.ts` (TASK-1408).

## Detailed Spec

**Estados de la traza** (derivados, no persistidos):

| Estado | Condición |
|---|---|
| `not_received` | Sin fila en `webhook_inbox_events` que mencione el id |
| `in_flight` | Inbox `processed` + `intake_requested` sin `reacted_at`, dentro de la ventana diseñada |
| `stuck` | Igual que `in_flight` pero fuera de la ventana, o refresh en `dead` |
| `converged` | Reacción `materialized ≥ 1` y `hubspot_last_synced_at ≥ received_at` del último inbox |

La ventana diseñada se calcula desde las cadencias declaradas (publisher `*/2`, lane finance `*/5`) y se expone en la
respuesta; no se hardcodea en consumidores.

**Búsqueda del id en inbox y outbox:** usar el payload tipado (`payload_json->'serviceIds' ? $1` en outbox) y no
`LIKE` sobre texto; en el inbox, filtrar por `webhook_endpoint_id='webhook-hubspot-companies'` y ventana de tiempo antes
de buscar el `objectId`. Ejercitar el SQL contra PG real antes de commitear.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3 → Slice 4 → Slice 5.
- Slice 3 NO activa el flag en producción sin el dry-run comparativo registrado en la task.
- Slice 2 debe estar en producción antes de Slice 3: la traza es la herramienta para diagnosticar el cambio de read path.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El read directo mapea distinto que el bridge y cambia `linea_de_servicio`/importes | cron / servicios | medium | Dry-run comparativo + flag default OFF | `commercial.service_engagement.sync_lag`, diff del dry-run |
| Dejar de forzar `synced` saca servicios de la elegibilidad de términos/habilitación | commercial / client portal | medium | Listar en el dry-run qué filas pasarían a `unmapped` y resolverlas antes del flip | `service-engagement-engagement-kind-unmapped`, preview de habilitación |
| Rate limit HubSpot al leer todas las companies en el cron | integration | low | batch ≤100 y memo de asociaciones ya existentes | errores 429 en `captureWithDomain` |
| El des-escape cambia valores legítimos con `\n` intencional (claves PEM) | tooling | low | Test con PEM real en comillas dobles; misma semántica que dotenv | falla del gate local |
| Flag leído en un solo runtime | ops-worker / Vercel | medium | Declararlo en `deploy.sh` y Vercel en el mismo slice; verificar revisión activa | cron sigue usando el bridge (log `source`) |

### Feature flags / cutover

- `HUBSPOT_SERVICES_DIRECT_READ_ENABLED` (default `false`), leído por `service-sync.ts` en Vercel y ops-worker. Flip tras
  dry-run verde. Revert: `false` + redeploy (<10 min). Fila obligatoria en `FEATURE_FLAG_STATE_LEDGER.md`.
- Slices 1, 2 y 4 son aditivos: sin flag.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR | <10 min | si |
| Slice 2 | revert PR (rutas y CLI nuevas, sin estado) | <10 min | si |
| Slice 3 | flag a `false` + redeploy Vercel y ops-worker | <10 min | si |
| Slice 4 | revert PR (señal y parámetro de backoff) | <10 min | si |
| Slice 5 | revert docs | inmediato | si |

### Production verification sequence

1. Slice 1 local: gate verde en `.env*.local` regenerados; test del caso `\r\n`.
2. Slice 2 en staging: traza de un servicio real + command idempotente (segunda corrida sin `lifecycle_changed`).
3. Slice 2 en producción: traza de `591725750952` = `converged`.
4. Slice 3: dry-run comparativo en producción (sólo lectura) → registrar diff → flag ON en staging → cron manual → flag ON en producción → cron de 06:00 del día siguiente sin `sync_lag`.
5. Slice 4: señal visible en `/admin/ops-health` con valor 0; crear un servicio de prueba en HubSpot sandbox y verificar convergencia en el primer o segundo tick.
6. Monitor 7 días: circuito `hubspot_services_intake` sin fallos nuevos.

### Out-of-band coordination required

- Regenerar `.env.local` y `.env.production.local` con `vercel env pull` en las máquinas de los operadores (Vercel está limpio).
- Aviso a quien use las rutas admin de servicios sobre el cambio de `syncStatus` durante el flip.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `load-greenhouse-tool-env.ts` des-escapa como dotenv y un test reproduce el valor `…run.app\r\n` corregido.
- [ ] `normalizeBaseUrl` rechaza una URL con caracteres de control con un error que nombra la variable sin su valor.
- [ ] El gate de higiene de env falla ante `\r\n` literal y no imprime valores.
- [ ] `syncHubSpotServiceById` existe, es idempotente y sólo escribe vía `upsertServiceFromHubSpot`.
- [ ] `readHubSpotServiceIntakeTrace` devuelve los cuatro estados y la ventana diseñada; su SQL se ejercitó contra PG real.
- [ ] Rutas `app` y CLIs de sync y trace existen con capability y grant en el mismo PR.
- [ ] `service-sync.ts` no importa `getHubSpotGreenhouseCompanyServices` y no fuerza `syncStatus='synced'`.
- [ ] El dry-run comparativo bridge vs directo quedó registrado en la task antes del flip.
- [ ] `HUBSPOT_SERVICES_DIRECT_READ_ENABLED` está declarado en `services/ops-worker/deploy.sh`, en Vercel y en el ledger de flags.
- [ ] La señal `commercial.service_engagement.intake_lag` está registrada y reporta 0 en producción.
- [ ] El primer reintento de `organization_unresolved` ocurre en ~2 min y está cubierto por test.
- [ ] El ADR quedó `Accepted` y `DECISIONS_INDEX.md` movió su fila a decisiones vigentes.

## Verification

- `pnpm local:check`
- `pnpm test` (full) y `pnpm build` antes de cerrar (gate de cierre)
- Tests focales: `src/lib/services/**`, `src/lib/sync/projections/hubspot-services-intake.test.ts`, parser de env
- Traza real de `591725750952` en producción y dry-run comparativo
- `pnpm flags:audit --strict --no-vercel`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `TASK-1710` y `TASK-1432` marcan resuelta la fila de `hubspot_services_intake` degradado
- [ ] El dueño del bridge recibe follow-up para retirar la ruta `/companies/<id>/services`

## Follow-ups

- Retiro de la ruta de lectura de servicios del bridge Python (dueño del bridge, TASK-574 follow-up).
- Evaluar si `sync-company-by-id.ts` sigue el mismo camino (lectura de companies/contacts por el bridge).

## Open Questions

- Umbrales finales de `intake_lag` (10/30 min propuestos) y si la señal vive bajo `commercial` o `integrations`.
- Capability de las rutas nuevas: reutilizar `commercial.engagement.*` o crear `commercial.service.sync`.
- Si el command también debe reconciliar cambios de asociación company/deal en HubSpot.
