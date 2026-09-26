# ADR — Un solo read path HubSpot → Greenhouse para servicios (p_services 0-162) y trazabilidad del intake async

> **Estado:** `Proposed` (2026-09-24) · **Dueño:** Platform / Integraciones · **Skill:** `arch-architect` (+ `hubspot-greenhouse-bridge`)
> **Origen:** post-mortem del alta del servicio «Sky Airline - Blog SEO/AEO» (`SVC-HS-591725750952`, TASK-1852 Delta 2026-09-24).
> **Relacionados:** `GREENHOUSE_HUBSPOT_SERVICES_INTAKE_V1.md` (§Invariantes TASK-813/836), `GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`,
> `GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`, `agent-invariants/INTEGRATIONS_INFRA_AGENT_INVARIANTS.md`, memoria `reference-hubspot-write-path-in-app-not-bridge`.

## 1. Decisión (resumen)

1. **Un solo read path para servicios HubSpot:** todo consumer que lea `p_services` (webhook intake, backfill, cron
   `services-sync`, endpoints admin `ops/services-sync`, `orphan-services`, `integrations/hubspot/services/sync`) usa el
   cliente in-app directo (`src/lib/hubspot/list-services-for-company.ts`: `listServiceIdsForCompany` + `batchReadServices`)
   y el helper canónico `upsertServiceFromHubSpot`. `service-sync.ts` deja de llamar al bridge Cloud Run
   (`getHubSpotGreenhouseCompanyServices` → `/companies/{id}/services`). El bridge Python queda sólo para los contratos
   legacy de escritura y para `sync-company-by-id` hasta que TASK-1230 los absorba.
2. **Un command canónico por servicio:** `syncHubSpotServiceById(hubspotServiceId, {source})` en `src/lib/services/`,
   expuesto como CLI (`pnpm hubspot:service:sync <id>`) y como tool MCP interna de lectura+refresh. Es lo que hoy se hace
   con scripts de una sesión; deja de ser ad hoc.
3. **Trazabilidad del intake async como reader canónico:** `readHubSpotServiceIntakeTrace(hubspotServiceId)` compone la
   cadena `webhook_inbox_events → outbox_events(intake_requested) → projection_refresh_queue/outbox_reactive_log →
   services.hubspot_last_synced_at` y expone la **latencia diseñada** (publisher `*/2` + lane finance `*/5` ⇒ p95 ≈ 7 min).
   CLI `pnpm hubspot:service:trace <id>` + señal de reliability `commercial.service_engagement.intake_lag` (evento
   `published` sin `reacted_at` > 10 min ⇒ warning; > 30 min ⇒ error).
4. **Higiene de env para tooling:** `scripts/lib/load-greenhouse-tool-env.ts` debe des-escapar `\n`/`\r` dentro de comillas
   dobles igual que `@next/env`/dotenv, y todo `*_BASE_URL` se valida con `new URL()` + rechazo de caracteres de control
   (fail-fast con el nombre de la variable). Gate: `pnpm env:lint` (o extensión del gate de Secret Manager Hygiene) sobre
   `.env*.local` locales: literal `\r\n` o whitespace residual en un valor = error.

## 2. Contexto y evidencia (2026-09-25T00:23–00:31Z)

| Hecho | Evidencia |
|---|---|
| El webhook **sí llegó y sí se procesó**, dos veces | `webhook_inbox_events` `wh-inbox-07c0231b…` (creation + 11 propertyChange, 00:23:17.467Z, `processed` en 124 ms) y `wh-inbox-5e7d4536…` (`propertyChange ef_start_date`, 00:28:44.842Z, `processed` en 174 ms). Vercel: `POST /api/webhooks/hubspot-companies 200` a las mismas horas. |
| El intake es **async por diseño** y convergió en 83 s | outbox `intake_requested` 00:28:45.009 → `ops-outbox-publish` (`*/2`) lo publicó 00:30:03.161 → `ops-reactive-finance` (`*/5`) lo consumió 00:30:07.601 (`materialized=1/1`). `services.start_date` ya era `2026-09-24` a las 00:30:07.597. |
| El «re-upsert manual» fue **redundante**, no correctivo | Mi poll de 60 s terminó ~00:30:10 y el upsert manual corrió 00:30:14 (7 s después del intake). Idempotente por `UNIQUE hubspot_service_id`; dejó un segundo evento `materialized` (`outbox-a259e897…`, `source=sky-blog-enablement-2026-09-24`). |
| El 404 del bridge fue **corrupción del env LOCAL**, no del bridge | `.env.production.local` (2026-04-10, `vercel env pull`) tiene `HUBSPOT_GREENHOUSE_INTEGRATION_BASE_URL="https://…run.app\r\n"` con **backslash-r-backslash-n literales** dentro de las comillas; `normalizeBaseUrl` sólo hace `trim()` y quita `/` finales ⇒ URL `…run.app\r\n/companies/…` ⇒ Flask 404 HTML. El valor en **Vercel Production está limpio** (`vercel env pull` fresco: termina en `run.app"`). El bridge desplegado responde 200 en `/companies/30825221458/services` y `/services/591725750952`. Misma corrupción local en `NEXTAUTH_SECRET` y `NEXTAUTH_URL` de `.env.local`. |
| Dos parsers, dos comportamientos | `load-greenhouse-tool-env.ts` (parser propio) conserva los backslashes; `@next/env` (dotenv) expande `\n` en comillas dobles a saltos reales que `trim()` sí quita ⇒ `pnpm dev` funciona y el tooling falla. |
| Dos read paths para el mismo objeto | Webhook intake y backfill leen HubSpot directo (`batchReadServices`); `service-sync.ts` (cron `services-sync`, `admin/ops/services-sync`, `orphan-services`, `integrations/hubspot/services/sync`) lee vía bridge `/companies/{id}/services`, que además **fuerza `syncStatus='synced'`** («bridge enriquecido», comentario en `service-sync.ts:169-171`). |
| Fragilidad real del intake para servicios nuevos | 4 de los últimos 6 batches de intake (2026-07-28 ×2, 08-14, 09-23) fallaron el primer intento con `organization_unresolved` y convergieron tras 2 reintentos (~45 min). Sky convergió a la primera porque el conector creó objeto y asociaciones en una sola llamada. Estado del circuito `hubspot_services_intake`: `closed`, `failed_runs_window=7/11`. |

## 3. Alternativas rechazadas

- **Mantener el bridge como read path y arreglar el env local:** arregla el síntoma de una máquina; deja dos verdades para
  el mismo objeto y un servicio Python que sigue siendo dependencia de lectura pese a ADR TASK-1230.
- **Acortar los crons (`*/1`) para bajar la latencia del intake:** más costo y contención en la única base; la latencia
  no era el problema — la ausencia de trazabilidad sí.
- **Sync síncrono en el webhook:** ya se rechazó en TASK-813b/878 (timeout 5 s de HubSpot ⇒ retries ⇒ carreras).
- **Reemplazar el parser propio por dotenv sin gate:** corrige un caso; sin `env:lint` el próximo `vercel env pull` con un
  valor sucio vuelve a fallar en silencio.

## 4. Scoring 4 pilares

| Pilar | Evaluación |
|---|---|
| **Safety** | Reads con el token canónico único (`hubspot-access-token`, server-only), sin nuevo secreto; el command por servicio es idempotente y sólo escribe vía `upsertServiceFromHubSpot` (audit/outbox existentes). `env:lint` nunca imprime valores: reporta nombre + clase de defecto. Blast radius del cambio: paths de lectura de servicios; el write bridge no se toca. |
| **Robustness** | Un solo helper de lectura ⇒ un solo mapeo de propiedades y un solo normalizador de importes (NULL, nunca 0). `new URL()` fail-fast elimina la clase «URL con control chars». El command por id reutiliza `UNIQUE hubspot_service_id`. Para `organization_unresolved` en servicios recién creados: backoff corto inicial (1–2 min) antes de la escalera de 15/30/45 min, porque la asociación suele aparecer segundos después. |
| **Resilience** | Trace reader + señal `intake_lag` cierran el hueco de observabilidad que provocó la intervención manual; dead-letter y circuito ya existen. Runbook: «no re-upsertear a mano antes de la ventana diseñada; usar `hubspot:service:trace`». |
| **Scalability** | `batchReadServices` ya es batch (≤100/req); quitar el hop Python reduce latencia y una dependencia de despliegue. La señal lee tablas indexadas por `status`/`occurred_at`; sin tablas nuevas. |

## 5. Dependencias e impacto

- **Depende de:** `list-services-for-company.ts`, `upsert-service-from-hubspot.ts`, registry de proyecciones, reliability
  registry (`GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`), gate de hygiene existente (`greenhouse-secret-hygiene`).
- **Impacta:** `service-sync.ts` y sus 4 rutas/cron; `services/hubspot_greenhouse_integration` (ruta `/companies/{id}/services`
  pasa a no tener consumer en el monorepo → candidata a retiro en TASK-574 follow-up); `docs/manual-de-uso/…/servicios-hubspot`
  (nuevo runbook de trace); `INTEGRATIONS_INFRA_AGENT_INVARIANTS.md` (regla nueva).
- **Full API Parity:** el command por servicio y el trace nacen con contrato (CLI + tool MCP interna + ruta `app`), no como script.

## 6. Roadmap por slices — task dueña: [`TASK-1886`](../tasks/to-do/TASK-1886-hubspot-service-sync-single-read-path-and-intake-trace.md) (`backend-data`)

1. **S0 — Higiene:** `env:lint` + des-escape en `load-greenhouse-tool-env.ts` + `new URL()` en `normalizeBaseUrl` (con test que
   reproduce `\r\n` literal). Regenerar `.env.production.local` con `vercel env pull` (Vercel está limpio).
2. **S1 — Convergencia de lectura:** `service-sync.ts` → cliente directo; test de paridad de mapeo contra el backfill; retirar
   el import de `getHubSpotGreenhouseCompanyServices`.
3. **S2 — Command + trace:** `syncHubSpotServiceById` y `readHubSpotServiceIntakeTrace` + CLIs + tool MCP interna; señal
   `commercial.service_engagement.intake_lag` registrada en el reliability registry con `steady=0`.
4. **S3 — Backoff corto para `organization_unresolved`** en el intake (primer retry a 2 min) + documentación de la latencia
   diseñada en la spec y en el runbook de habilitación de servicios.

## 7. Reglas duras (para agentes)

- **NUNCA** leer `p_services` por el bridge Cloud Run desde código nuevo; el read path es el cliente in-app directo.
- **NUNCA** re-upsertear a mano un servicio «porque el webhook no llegó» sin antes leer la traza inbox → outbox → reactive:
  la ventana diseñada del intake async es de hasta ~7 min.
- **NUNCA** dar por corrupto un servicio remoto por un 404 HTML sin verificar los bytes de la `*_BASE_URL` local (`od -c`).
- **SIEMPRE** que un tooling lea `.env*.local`, des-escapar como dotenv y validar URLs; un valor con `\r\n` literal es error, no dato.

## 8. No decidido

- Si el bridge Python se retira completo (TASK-1230 pendiente) o sólo pierde las rutas de lectura de servicios.
- Umbrales finales de `intake_lag` (10/30 min propuestos) y si la señal vive en `commercial` o `integrations`.
- Si el command por servicio también debe reconciliar asociaciones company/deal cuando cambian en HubSpot.
