# TASK-1866 — Medición del funnel de Careers por canal en GA4 vía GTM

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-011`
- Status real: `Diseño — nada implementado; Careers no carga GTM y el tag genérico clasificaría cada postulación como lead`
- Rank: `TBD`
- Domain: `growth|hr|data`
- Blocked by: `none` (la activación en Production queda gateada por la decisión de consentimiento, ver Open Questions)
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Instrumenta las rutas públicas de Careers (`greenhouse.efeoncepro.com/public/careers`, detalle y apply) con el
contenedor canónico `GTM-NGHPGRLZ` para que GA4 (propiedad `486264460`) mida el funnel por canal: vista de
vacante → inicio de postulación → postulación enviada, con la atribución de sesión que ya entregan los UTM.
Antes de instalar GTM corrige el tag genérico, que hoy convertiría cada postulación en `generate_lead`, y
limita la carga a rutas públicas sin tokens, nunca al portal autenticado.

## Why This Task Exists

El 2026-09-11 se difundieron las 4 vacantes vivas (`EO-OPN-0009`, `0061`, `0674`, `0675`) en LinkedIn vía Metricool
(`docs/operations/hiring/2026-09-11-linkedin-vacancy-distribution.md`) y no hay forma de saber qué trajo cada canal:

- Careers **no carga GTM**: ningún componente de `src/app/public/careers` ni `src/components/greenhouse/careers`
  inyecta el snippet, así que los eventos `gh_form_*` que el formulario ya empuja al `dataLayer` no salen hacia GA4.
- Los links de la campaña se publicaron **sin UTM** porque no había dónde leerlos.
- El TRACKING-PLAN ya declara `efeonce-careers-application` → `gh_form_submission_accepted` → **`generate_lead`**, y el
  trigger `CE - gh_form_submission_accepted` del contenedor **no filtra por `form_kind`** (verificado en
  `docs/reference/measurement-gtm-ga4/container-snapshot.json`). En cuanto GTM cargue en Careers, cada postulación
  contaría como un lead de venta y contaminaría el key event comercial.
- `greenhouse.efeoncepro.com` es un **host nuevo** para la medición: el registro §19.5 del Tracking Engine sólo lista
  `efeoncepro.com` y `think.efeoncepro.com`, y el mandato §19.2 exige que toda superficie de adquisición nazca
  instrumentada.
- Ningún host del ecosistema tiene consent gating real hoy (`LEARNINGS.md`, entrada 2026-07-18). Careers recibe
  candidatos de 20 países, incluida España (GDPR), y la Ley 21.719 chilena entra en vigencia el 2026-12-01.

**Decisión del operador (2026-09-11):** la medición por canal se hace **sólo en GA4 vía GTM**. Se descartó persistir
UTM/referrer en `greenhouse_hiring.hiring_application`. Consecuencia aceptada y explícita: GA4 mide la parte alta del
funnel (visitas, inicios, envíos) por canal, pero **no puede cruzarse con el desenlace** (preselección, entrevista,
oferta, contratación), porque GA4 no admite PII ni IDs de postulación. La calidad de contratación por canal no queda
medible con esta task.

## Goal

- GA4 recibe `page_view`, `gh_job_viewed`, `gh_form_started` y `gh_job_application_submitted` desde las rutas públicas
  de Careers, atribuidos por la sesión UTM, en la misma propiedad `486264460`.
- Ninguna postulación de Careers produce `generate_lead`; el key event comercial queda limpio.
- GTM nunca carga en el portal autenticado ni en rutas con token, y ningún evento lleva PII ni IDs internos.
- Las campañas de vacantes usan una convención UTM documentada que distingue canal y cuenta (perfil personal vs página de Efeonce).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_TRACKING_ENGINE_ARCHITECTURE_V1.md` — §7 Consent And Privacy Envelope, §8 Attribution
  Envelope, §19.2 mandato "toda superficie nace instrumentada", §19.5 hosts medidos.
- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md` — telemetría del renderer y allowlist browser-safe (Arch §15).
- `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md` — contrato público de Careers y privacidad del candidato.
- `docs/reference/measurement-gtm-ga4/` — `04` (convención `gh_`), `05` (shapes de la API v2), `06` (deploy y diagnostic ladder), `07` (GA4 Admin), `LEARNINGS.md`, `TRACKING-PLAN.md`.

Reglas obligatorias:

- **NUNCA** cargar GTM fuera de las rutas públicas de Careers listadas en el Detailed Spec. El portal autenticado comparte host (`greenhouse.efeoncepro.com`) y medir a colaboradores o clientes está fuera de toda base de licitud.
- **NUNCA** cargar GTM en `/public/careers/talent-profile/[token]` ni en rutas de preview/fixture: el token viaja en la ruta y `page_location` lo enviaría a Google.
- **NUNCA** PII ni valores crudos en eventos: ni email, nombre, teléfono, país declarado, mensaje, `applicationId`, `candidateFacetId` ni `identity_profile_id`. `job_id` = `public_id` público de la vacante (`EO-OPN-####`), nunca el `opening_id` interno.
- **NUNCA** mapear una postulación a `generate_lead` ni marcar key event un paso de funnel (`gh_job_viewed`, `gh_form_started`).
- **NUNCA** publicar el contenedor sin Preview/Tag Assistant y confirmación humana explícita (`propose → confirm → publish`).
- **SIEMPRE** un tag genérico con parámetros de identidad, nunca un tag por vacante.
- **SIEMPRE** registrar host, eventos y estado de tagging en §19.5 y en `TRACKING-PLAN.md`.

## Normative Docs

- `.claude/skills/greenhouse-gtm-ga4-operator/SKILL.md` — workflow gobernado de construcción, publicación y verificación.
- `docs/documentation/growth/medicion-gtm-ga4.md`
- `docs/operations/hiring/2026-09-11-linkedin-vacancy-distribution.md` — caso fuente.
- `.claude/skills/social-media-studio/efeonce/linkedin-vacancy-distribution.md` — hoy publica links sin UTM; se actualiza al cerrar esta task.
- `docs/operations/hiring/2026-08-12-revision-privacidad-contacto-careers.md` — precedente de revisión de privacidad de Careers.

## Dependencies & Impact

### Depends on

- Contenedor `GTM-NGHPGRLZ` (account `6291647045`, container `218104216`, workspace `2`) y Google tag `G-KYPPY57M14`; propiedad GA4 `486264460`.
- Service account `greenhouse-gtm-publisher@efeonce-group.iam.gserviceaccount.com` + clientes `src/lib/growth/gtm/api-client.ts` y `src/lib/growth/ga4/api-client.ts`.
- Emisor de telemetría `src/growth-forms-renderer/telemetry.ts` (`createTelemetryEmitter`, policy `gtmDataLayer` default `true`), ya usado por las dos entradas del apply: `CareersNativeGrowthFormClient.tsx` y `CareersApplyClient.tsx` (emite `gh_form_started`).
- `CAREERS_NATIVE_GROWTH_FORM_ENABLED` ON en staging y Production (ledger); el apply estándar queda como rollback con la misma telemetría.

### Blocks / Impacts

- `.claude/skills/social-media-studio/efeonce/linkedin-vacancy-distribution.md` y `docs/manual-de-uso/hr/operar-careers-publicas.md` §Difundir: pasan de "links limpios" a la convención UTM de esta task.
- `.claude/skills/greenhouse-talent-people-operator/references/inbound-recruiting-job-ad-research.md` §Measurement y `templates/job-offer-recipe.md`: el gap de atribución pasa a "medible en GA4, no cruzable con el desenlace".
- `TASK-1397` / `TASK-1398` (avisos de vacantes en Careers): sus formularios quedarán medidos en el mismo host; deben declarar su `form_kind` para no caer en `generate_lead` por error.
- `TASK-1437` (Link Hub): comparte la convención UTM de canales sociales; alinear valores.
- `TASK-1518` declara GTM/CMP como "host-owned": esta task es la dueña del host `greenhouse.efeoncepro.com` para rutas de Careers.

### Files owned

- `src/lib/hiring/public-careers/telemetry.ts` [nuevo] + test
- `src/components/greenhouse/careers/CareersGtmLoader.tsx` [nuevo]
- `src/components/greenhouse/careers/CareersJobViewTelemetry.tsx` [nuevo]
- `src/app/public/careers/page.tsx`, `src/app/public/careers/[publicId]/page.tsx`, `src/app/public/careers/[publicId]/apply/page.tsx` (montan el loader)
- `scripts/gtm/measurement-smoke.mjs` (caso Careers)
- `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md`, `LEARNINGS.md`, `container-snapshot.json`
- `docs/architecture/GREENHOUSE_TRACKING_ENGINE_ARCHITECTURE_V1.md` (§19.5)
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (fila `CAREERS_GTM_ENABLED`)
- `docs/documentation/hr/careers-publicas.md`, `docs/manual-de-uso/hr/operar-careers-publicas.md`

## Current Repo State

### Already exists

- Contrato de telemetría de Growth Forms: `GTM_EVENT_NAMES` (`gh_form_viewed`, `gh_form_started`, `gh_form_submitted`, `gh_form_submission_accepted`, …) y `TELEMETRY_ALLOWED_PAYLOAD_KEYS` (incluye `form_slug`, `form_kind`, `surface_id`, `page_uri`, `referrer`, `utm_source/medium/campaign`) en `src/lib/growth/forms/contracts.ts`.
- Las dos entradas del apply ya emiten esos eventos al `dataLayer` con el mismo emisor (`src/growth-forms-renderer/telemetry.ts`); surface `public-careers-nextjs` (`src/lib/hiring/public-careers/growth-form-contract.ts`).
- Pipeline genérico publicado en `GTM-NGHPGRLZ`: trigger `CE - gh_form_submission_accepted` + tag `GA4 Event - generate_lead` (`measurementIdOverride=G-KYPPY57M14`, params `form_slug`/`form_kind`/`surface_id`), sin filtro por `form_kind`.
- Comandos de robustez: `pnpm gtm:snapshot` (`scripts/gtm/snapshot.ts`), `pnpm measurement:smoke` (`scripts/gtm/measurement-smoke.mjs`), `pnpm growth:forms-tracking-audit`.
- Layout de Careers `src/app/public/careers/layout.tsx` (sin scripts); rutas: listado, detalle, apply, `talent-profile/[token]`, `talent-profile-preview`, `editorial-preview`, fixtures.
- CSP: `src/proxy.ts` emite una política general en modo `Report-Only` con `script-src … https:`; la política estricta con nonce aplica sólo a la evaluación pública.

### Gap

- No hay snippet GTM ni Consent Mode en ninguna ruta de Greenhouse.
- No existe evento de vista de vacante; el detalle (`CareersDetailView.tsx`) es un componente de servidor sin isla de telemetría.
- El tag genérico convierte `form_kind=application` en `generate_lead`.
- GA4 no tiene custom dimensions para la vacante, y §19.5 no registra el host.
- No hay convención UTM para campañas de vacantes; los links del 2026-09-11 salieron sin UTM.

## Modular Placement Contract

- Topology impact: `public`
- Current home: `src/app/public/careers/**` + `src/components/greenhouse/careers/**` + `src/lib/hiring/public-careers/telemetry.ts`; configuración externa en el contenedor `GTM-NGHPGRLZ` y la propiedad GA4 `486264460`
- Future candidate home: `public`
- Boundary: el contrato de telemetría de Careers (`gh_job_viewed` + params allowlisted) lo consumen sólo las islas cliente de Careers; los eventos de formulario siguen siendo propiedad del contrato de Growth Forms; la configuración de GTM/GA4 se opera por `GtmApiClient`/cliente GA4, nunca a mano sin registro
- Server/browser split: el flag `CAREERS_GTM_ENABLED` se lee en el servidor y baja como prop; el snippet GTM, Consent Mode y los `dataLayer.push` corren sólo en el browser; los clientes GTM/GA4 son server-only y se usan desde scripts
- Build impact: `none` — sin dependencias nuevas; GTM se carga en runtime como script externo
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: contenedor `GTM-NGHPGRLZ` (versiones publicadas) y propiedad GA4 `486264460`; Hiring sigue siendo la verdad de las postulaciones y no cambia
- Consumidores afectados: reportes GA4 de marketing/People, `TRACKING-PLAN.md`, `measurement:smoke`
- Runtime target: `production` (rutas públicas de Careers) + `external` (GTM/GA4)

### Contract surface

- Contrato existente a respetar: `src/lib/growth/forms/contracts.ts` (`GTM_EVENT_NAMES`, `TELEMETRY_ALLOWED_PAYLOAD_KEYS`, `TELEMETRY_FORBIDDEN…`), `src/growth-forms-renderer/telemetry.ts`, Tracking Engine §7/§8/§19, `docs/reference/measurement-gtm-ga4/04` y `05`
- Contrato nuevo o modificado: evento `gh_job_viewed` (contrato de Careers); trigger `CE - gh_form_submission_accepted` excluye `form_kind=application`; tag nuevo `GA4 Event - gh_job_application_submitted`; GA4 Config gateado por hostname + ruta de Careers; custom dimensions de la vacante
- Backward compatibility: `compatible` — los eventos de formulario no cambian; `generate_lead` sólo pierde el caso `application`, que nunca disparó desde Careers porque GTM no carga ahí (verificar cero `generate_lead` con `form_kind=application` en GA4 antes del cambio)
- Full API parity: la configuración de medición es programática (`GtmApiClient` + cliente GA4 + `gtm:snapshot` versionado en git) y se publica con `propose → confirm → publish`; no introduce capability de negocio

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna tabla de Greenhouse; recursos externos del contenedor GTM y de la propiedad GA4
- Invariantes que no se pueden romper:
  - GTM carga sólo en listado, detalle y apply públicos de Careers; nunca en el portal, en `talent-profile/[token]`, previews ni fixtures.
  - Ningún evento lleva PII, texto libre, tokens ni IDs internos; `job_id` es siempre el `public_id` público.
  - Una postulación nunca produce `generate_lead`; se mide como `gh_job_application_submitted`.
  - `page_location` no transporta más query params que los `utm_*` allowlisted.
  - Las dos entradas del apply (Growth Form nativo y apply estándar) producen el mismo set de eventos.
  - Misma propiedad `486264460`, sin stream nuevo; sin doble `page_view`.
- Write-target allowlist: `N/A — no escribe tablas de Hiring ni de ningún dominio`
- Tenant/space boundary: tráfico público anónimo; sin sesión, sin tenant; el gate es la ruta, no un rol
- Idempotency/concurrency: cambios de GTM con fingerprint del workspace; custom dimensions idempotentes por `parameterName`; los eventos browser son at-most-once por diseño (GA4 no es ledger)
- Audit/outbox/history: historial de versiones del contenedor + `container-snapshot.json` en git tras cada publish

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `flag OFF` (`CAREERS_GTM_ENABLED`, Vercel-only, default `false`)
- Backfill plan: `N/A — la medición empieza al activar; no hay histórico que reconstruir`
- Rollback path: flag OFF + redeploy; en GTM, publicar la versión previa del contenedor
- External coordination: confirmación humana del publish; revisión de privacidad del consentimiento (`legal-privacy-ip-operator`); decisión del operador sobre key event

### Security and access

- Auth/access gate: rutas públicas; operar GTM/GA4 exige la service account y confirmación humana
- Sensitive data posture: sin PII en eventos (test de allowlist); candidatos pueden residir en la UE
- Error contract: `N/A — sin endpoints nuevos`; fallas del script GTM no rompen la página (carga no bloqueante)
- Abuse/rate-limit posture: `N/A — sin superficie de escritura nueva`

### Runtime evidence

- Local checks: tests del contrato de telemetría (allowlist/anti-PII) y de montaje (el loader existe sólo en las tres páginas permitidas)
- DB/runtime checks: `N/A — sin cambios de DB`
- Integration checks: Preview/Tag Assistant; Playwright sobre `/g/collect` en staging y Production; `scripts/ga4/realtime-events.ts 486264460`
- Reliability signals/logs: `pnpm measurement:smoke` con caso Careers; `pnpm gtm:snapshot --check` sin drift
- Production verification sequence: ver Rollout Plan

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se actualiza solo. (N/A: la task no crea tablas.)
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

### Slice 1 — Postulaciones fuera de `generate_lead` (GTM)

- En el workspace `2`, agregar al trigger `CE - gh_form_submission_accepted` la condición `form_kind` ≠ `application` (o un blocking trigger equivalente sobre el tag `GA4 Event - generate_lead`).
- Crear trigger `CE - gh_form_submission_accepted (application)` y tag `GA4 Event - gh_job_application_submitted` con los shapes de `05`, params `form_slug`, `surface_id` y `job_id` derivado del Page Path (`EO-OPN-####`).
- `GET` de vuelta, Preview, confirmación humana, `create_version` + `publish`, `pnpm gtm:snapshot`.

### Slice 2 — Contrato de eventos de Careers

- `src/lib/hiring/public-careers/telemetry.ts`: evento `gh_job_viewed` con params allowlisted `job_id`, `job_area`, `job_seniority`, `job_work_mode`; lista explícita de claves prohibidas; test que rechaza PII e IDs internos.
- `CareersJobViewTelemetry.tsx`: isla cliente que empuja `gh_job_viewed` una vez por carga del detalle, sólo si `window.dataLayer` existe (sin GTM no hace nada).

### Slice 3 — Carga acotada de GTM con Consent Mode v2

- `CareersGtmLoader.tsx`: define `gtag('consent','default', …)` antes de GTM y carga `GTM-NGHPGRLZ` sin bloquear render; montado sólo en listado, detalle y apply, detrás de `CAREERS_GTM_ENABLED` (default `false`, fila en el ledger en el mismo PR).
- Test que falla si el loader aparece fuera de esas tres páginas (portal, `talent-profile/[token]`, previews, fixtures).
- En GTM: GA4 Config (`G-KYPPY57M14`) gateado por hostname `greenhouse.efeoncepro.com` y ruta `^/public/careers`, excluyendo `talent-profile`, con `page_location` reescrito para conservar sólo `utm_*`.

### Slice 4 — GA4 Admin y convención UTM

- Confirmar que `G-KYPPY57M14` pertenece a la propiedad `486264460` (`properties/486264460/dataStreams`).
- Registrar custom dimensions de evento `job_id`, `job_area`, `job_seniority` (y `form_kind` si falta).
- Documentar la convención UTM de campañas de vacantes (Detailed Spec) en el manual de Careers y en el companion de LinkedIn.

### Slice 5 — Verificación, registro y documentación

- Extender `scripts/gtm/measurement-smoke.mjs` con el caso Careers: `page_view` y `gh_job_viewed` en el detalle, `gh_job_application_submitted` al enviar y **ausencia** de `generate_lead`.
- Fila del host en §19.5, fila del form corregida en `TRACKING-PLAN.md`, entrada en `LEARNINGS.md`, docs funcional/manual y actualización de los companions que hoy dicen "links limpios".

## Out of Scope

- Persistir UTM, referrer o canal en `greenhouse_hiring.hiring_application` o en cualquier tabla de Greenhouse (descartado por el operador el 2026-09-11).
- Cruzar GA4 con desenlaces de Hiring o medir calidad de contratación por canal.
- Un CMP/banner de consentimiento para todo el ecosistema (`efeoncepro.com`, `think`); si la decisión de consentimiento exige banner, se crea una task `ui-ux` aparte.
- Medir el portal autenticado, rutas con token, la evaluación pública o previews.
- Pixels de plataformas publicitarias (LinkedIn Insight Tag, Meta), server-side GTM y Measurement Protocol.
- Cambios de copy, layout o UX visibles en Careers.

## Detailed Spec

**Rutas donde carga GTM (allowlist):**

| Ruta | Página | GTM |
|---|---|---|
| `/public/careers` | listado | sí |
| `/public/careers/[publicId]` | detalle | sí + `gh_job_viewed` |
| `/public/careers/[publicId]/apply` | apply (ambas entradas) | sí |
| `/public/careers/talent-profile/[token]` | self-service tokenizado | **nunca** |
| `talent-profile-preview`, `editorial-preview`, fixtures | internas | **nunca** |

**Eventos:**

| Evento | Origen | Params | Tag GA4 | Key event |
|---|---|---|---|---|
| `page_view` | GA4 Config gateado | automáticos (sesión UTM) | Config Careers | no |
| `gh_job_viewed` | isla del detalle (nuevo) | `job_id`, `job_area`, `job_seniority`, `job_work_mode` | evento genérico | no |
| `gh_form_started` | emisor Growth Forms (ya existe) | `form_slug`, `form_kind`, `surface_id` | evento de funnel | no |
| `gh_form_submission_accepted` con `form_kind=application` | emisor Growth Forms (ya existe) | `form_slug`, `surface_id`, `job_id` (Page Path) | `gh_job_application_submitted` | decisión del operador |

**Atribución:** GA4 atribuye la sesión al UTM de la página de aterrizaje; no hace falta propagar UTM entre páginas ni
guardarlos. El `_ga` de `.efeoncepro.com` se comparte entre subdominios del mismo stream (verificar en Discovery que no
aparezca `efeoncepro.com` como referral de `greenhouse.efeoncepro.com`).

**Convención UTM para campañas de vacantes:**

| Parámetro | Valor | Ejemplo |
|---|---|---|
| `utm_source` | red de origen | `linkedin`, `facebook` |
| `utm_medium` | tipo de canal | `social` (orgánico), `paid_social` (pagado) |
| `utm_campaign` | campaña por mes | `careers-2026-09` |
| `utm_content` | cuenta o pieza | `perfil-julio`, `pagina-efeonce`, `grupo-<slug>` |

Minúsculas, sin espacios ni tildes, sin datos personales. Nunca en `utm_term` ni en ningún parámetro un nombre o email.

**Consent Mode v2:** `ad_storage`, `ad_user_data` y `ad_personalization` quedan siempre `denied` en Careers (no hay
publicidad). `analytics_storage` sale de la decisión de Open Questions; el código lo recibe como configuración, no
como literal repartido.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (sacar postulaciones de `generate_lead`) **MUST** publicarse antes de que el flag de Slice 3 se active en cualquier ambiente con tráfico real: sin él, cada postulación contamina el key event comercial.
- Slice 2 → Slice 3 (el loader monta la isla de vista).
- Slice 4 puede correr en paralelo con Slice 2–3.
- Slice 5 cierra: el smoke y los registros se escriben contra el runtime real, no antes.
- La activación de `CAREERS_GTM_ENABLED` en Production exige la decisión de consentimiento resuelta.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| GTM carga en el portal autenticado y mide a colaboradores/clientes | UI / identity | medium | loader montado sólo en 3 páginas + test de montaje + GA4 Config gateado por ruta | test rojo en CI; `page_view` con rutas no-Careers en GA4 |
| Token de `talent-profile/[token]` llega a GA4 en `page_location` | privacidad | medium | ruta excluida del loader y del Config + reescritura de `page_location` | smoke que falla si `/g/collect` lleva `talent-profile` |
| Postulaciones cuentan como `generate_lead` | GA4 / reporting comercial | high sin Slice 1 | ordering rule + smoke que exige ausencia de `generate_lead` | `generate_lead` con `form_kind=application` > 0 |
| PII en parámetros de evento | privacidad | low | allowlist + test anti-PII; `job_id` público | test rojo; revisión del `/g/collect` |
| Consentimiento insuficiente para candidatos de UE/Chile | legal | medium | flag OFF en Production hasta la decisión; Consent Mode v2 con defaults declarados | revisión `legal-privacy-ip-operator` |
| Doble `page_view` o measurement ID equivocado | GA4 | low | confirmar stream por Admin API; un solo Config gateado | realtime con `page_view` duplicado |
| Script de GTM degrada la carga del apply | UI / performance | low | carga no bloqueante (`afterInteractive`) y medición de Web Vitals antes/después | LCP/INP del detalle y apply |
| CSP bloquea `googletagmanager.com` o `/g/collect` | runtime | low | verificar `src/proxy.ts` en Discovery [verificar]; hoy la general es report-only con `script-src https:` | violaciones CSP en consola |

### Feature flags / cutover

- `CAREERS_GTM_ENABLED` (Vercel-only, default `false`): controla el montaje del loader. Se activa primero en staging; en Production sólo con Slice 1 publicado y la decisión de consentimiento resuelta. Revert: `false` + redeploy, <10 min. Fila en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` en el mismo PR.
- GTM no tiene flag: el control es la versión publicada del contenedor (revert = publicar la versión anterior).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Publicar la versión previa del contenedor + `gtm:snapshot` | <10 min | sí |
| Slice 2 | Revert PR (la isla no emite sin GTM) | <10 min | sí |
| Slice 3 | `CAREERS_GTM_ENABLED=false` + redeploy; revert del Config en GTM | <10 min | sí |
| Slice 4 | Archivar custom dimensions (GA4 no las borra) | <5 min | parcial |
| Slice 5 | Revert de docs/smoke | <5 min | sí |

### Production verification sequence

1. Publicar Slice 1 y verificar en Preview que un `gh_form_submission_accepted` con `form_kind=application` produce `gh_job_application_submitted` y no `generate_lead`, y que un form de lead sigue produciendo `generate_lead`.
2. Deploy a staging con el flag OFF: verificar que ninguna página carga GTM.
3. Flag ON en staging: Playwright sobre `/g/collect` en listado, detalle y apply (con UTM de prueba); verificar ausencia de GTM en `talent-profile/[token]` y en una ruta del portal.
4. Resolver la decisión de consentimiento y registrar la revisión de privacidad.
5. Flag ON en Production + redeploy; enviar una postulación de prueba sobre una vacante de prueba no pública o con `data_origin` sintético según el contrato de Hiring, nunca como candidato real; verificar en `realtime-events` y `measurement:smoke`.
6. `pnpm gtm:snapshot --check` sin drift; monitorear 7 días que `generate_lead` no reciba postulaciones.

### Out-of-band coordination required

- Confirmación humana del operador antes de cada publish del contenedor.
- Revisión de privacidad del consentimiento (Legal/Privacy) antes de activar en Production.
- Decisión del operador sobre si `gh_job_application_submitted` es key event.
- Aviso a quien opere reportes de leads: `generate_lead` deja de incluir postulaciones (hoy no las incluía en la práctica).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] En Preview, un `gh_form_submission_accepted` con `form_kind=application` dispara `gh_job_application_submitted` y no dispara `generate_lead`; un form de lead sigue disparando `generate_lead`.
- [ ] El loader de GTM se monta sólo en listado, detalle y apply de Careers, y un test falla si aparece en otra ruta.
- [ ] Con el flag ON, `/g/collect` muestra `page_view` y `gh_job_viewed` en el detalle y `gh_job_application_submitted` al enviar, desde las dos entradas del apply.
- [ ] `talent-profile/[token]` y una ruta del portal no emiten ninguna request a `googletagmanager.com` ni a `/g/collect`.
- [ ] Ningún parámetro de evento contiene email, nombre, teléfono, texto libre, tokens ni IDs internos (test de allowlist verde + inspección del `/g/collect`).
- [ ] `page_location` enviado a GA4 no contiene query params distintos de `utm_*`.
- [ ] Una visita con `utm_source=linkedin&utm_medium=social&utm_campaign=careers-2026-09` aparece atribuida a esa sesión en GA4 realtime.
- [ ] `job_id`, `job_area` y `job_seniority` quedan registradas como custom dimensions en la propiedad `486264460`.
- [ ] §19.5 lista `greenhouse.efeoncepro.com` (sólo rutas de Careers) y `TRACKING-PLAN.md` refleja el mapeo `gh_job_application_submitted`.
- [ ] `CAREERS_GTM_ENABLED` tiene fila en el ledger con su estado por ambiente.
- [ ] `pnpm measurement:smoke` incluye el caso Careers y pasa; `pnpm gtm:snapshot --check` sin drift.

## Verification

- `pnpm local:check`
- `pnpm test src/lib/hiring/public-careers src/components/greenhouse/careers`
- `pnpm test` (suite completa al cerrar)
- Preview/Tag Assistant + Playwright `/g/collect` en staging y Production
- `tsx scripts/ga4/realtime-events.ts 486264460`
- `pnpm measurement:smoke` · `pnpm gtm:snapshot --check`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Los companions de LinkedIn y el manual de Careers pasaron de "links limpios" a la convención UTM
- [ ] La skill de talento dejó de describir la atribución por canal como no medible y explica el límite real (GA4 sin cruce con desenlace)

## Follow-ups

- Si la decisión de consentimiento exige banner: task `ui-ux` para un CMP del host público de Greenhouse (y evaluar el mismo patrón para `efeoncepro.com` y `think`).
- Si más adelante se necesita calidad de contratación por canal: reabrir la opción descartada (persistir el canal en la postulación) como task `backend-data` propia.

## Open Questions

- **Consentimiento de `analytics_storage` en Careers.** Opciones: (a) `denied` por defecto con banner (requiere la task de CMP primero), (b) `denied` sin banner, con pings sin cookies y datos modelados, (c) `granted` con aviso, como operan hoy `efeoncepro.com` y `think` (LEARNINGS lo registra como brecha). Decide el operador con revisión de Legal/Privacy; bloquea sólo la activación en Production.
- **¿`gh_job_application_submitted` es key event?** Es una conversión real de reclutamiento, pero GA4 limita los key events y los reportes comerciales los leen. Default: no, hasta decisión del operador.
- **Valores de `utm_content`.** Confirmar los nombres de cuentas y grupos antes de la próxima campaña.
