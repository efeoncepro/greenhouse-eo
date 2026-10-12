# TASK-2033 — Efeonce Insights: alcance de contenido por organización (medir sólo lo que Efeonce trabaja)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `migration`
- Epic: `EPIC-045`
- Status real: `Slices 1–4 code complete en develop local (sin push); migración sin aplicar y alcance de Berel sin fijar, a la espera de autorización del operador; Slices 5 y 6 pendientes`
- Rank: `TBD`
- Domain: `insights|growth`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees ni rama por task`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El informe SEO de Efeonce Insights mide la propiedad completa de Search Console de la organización. En Berel, Efeonce
trabaja sólo artículos, tutoriales, inspiración y las guías de la raíz: el 4,3 % de los clics. El resto del sitio decide
la cifra del informe y tapa el trabajo real. Esta task crea un alcance de contenido por organización (reglas de ruta),
lo aplica en los readers dueños del módulo SEO y hace que las ediciones nuevas midan, sellen y declaren ese alcance.

## Why This Task Exists

Medido el 2026-10-12 sobre `greenhouse_growth.seo_gsc_daily` de Grupo Berel (`sc-domain:berel.com`), agosto frente a
septiembre de 2026:

| Población | Clics ago | Clics sep | Cambio |
| --- | --- | --- | --- |
| Propiedad completa (lo que mide hoy el informe) | 16.390 | 14.156 | −13,6 % |
| `/articulos` + `/tutoriales` | 522 | 605 | +15,9 % |
| Resto del sitio (home, productos, colores…) | 15.868 | 13.551 | −14,6 % |

El informe dice «los clics cayeron» en un mes en que el contenido que Efeonce produce subió. La causa no es editorial:
`src/lib/efeonce-insights/adapters/seo-adapter.ts` llama a `readSeoOverviewKpisForWindow(organizationId, window)` sin
ningún filtro de página, y no existe en el repo un concepto de alcance de medición por organización. Lo mismo pasa con
los «movers» (`readSeoWindowMovers`), las visitas orgánicas de GA4 (`readGa4ChannelWindow`), el ETV del dominio
(`readDomainOverviewForTarget`), el ranking (`readRankEvolution`) y las oportunidades (`readSeoWorkQueue`).

Decisión del operador (2026-10-12): el alcance de Berel es `/articulos`, `/tutoriales`, `/inspiracion` y las guías
publicadas en la raíz (`/pintura-y-barniz-para-madera-como-elegir`, `/impermeabilizante-para-azotea-como-elegir`).

## Goal

- Una organización puede declarar qué parte de su sitio trabaja Efeonce (prefijos de ruta y rutas exactas), con
  historial append-only.
- Con alcance declarado, las ediciones nuevas de Insights miden clics, impresiones, CTR, posición, evolución semanal,
  causas del cambio, visitas orgánicas, ranking y oportunidades sólo sobre ese alcance.
- El alcance aplicado queda sellado en la evidencia de la edición y escrito en «Qué mide este informe».
- El sitio completo aparece como una única lectura de contexto, nunca como la cifra del informe.
- Lo que no se puede recortar por ruta (ETV del dominio) sale del informe con su límite declarado, sin inventar cifra.
- Una organización sin alcance declarado recibe exactamente el informe de hoy.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md` (§5 ventana y contrato de datos, §10 gates, §14 estado)
- `docs/architecture/EFEONCE_INSIGHTS_PLATFORM_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_DOMAIN_ARCHITECTURE_V1.md`
- `docs/architecture/agent-invariants/SQL_DATE_MATH_AGENT_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `.claude/rules/efeonce-insights.md` y la skill `efeonce-insights`

Reglas obligatorias:

- El recorte por ruta vive en los readers dueños de `src/lib/growth/seo/**` y `src/lib/growth/analytics-ga4/**`. El
  adapter de Insights sólo declara el alcance; nunca filtra filas de `seo_gsc_daily` ni lee tablas ajenas.
- Snapshot sellado y plan congelado son inmutables: el alcance aplica a ediciones nuevas; corregir una edición es
  `revise`, nunca un UPDATE.
- Ausente no es cero: una métrica que no se puede medir sobre el alcance es un rechazo con causa, nunca un `0` ni la
  cifra del dominio con otro nombre.
- La línea «Qué mide este informe» no la redacta el LLM y no lleva cifras (`plan-validation.ts` la rechaza).
- Todo SQL nuevo se ejercita contra PostgreSQL real antes del commit; orden y comparación de rutas en bytes.

## Normative Docs

- `docs/documentation/insights/efeonce-insights-dominio-ediciones.md`
- `docs/documentation/growth/modulo-seo-search-visibility-360.md`
- `docs/documentation/growth/conexion-search-console.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (sólo lectura: la task no introduce flag)

## Dependencies & Impact

### Depends on

- `greenhouse_growth.seo_gsc_daily` (columna `page`; `migrations/20260805171834316_task-1302-growth-seo-gsc-daily.sql`)
- `greenhouse_growth.block_seo_row_mutation()` (`migrations/20260805134439202_task-1299-growth-seo-schema.sql`)
- `src/lib/growth/seo/overview/read-overview-kpis.ts`, `src/lib/growth/seo/overview/read-window-movers.ts`
- `src/lib/growth/seo/work-queue/reader.ts`, `src/lib/growth/seo/rank-evolution-reader.ts`
- `src/lib/growth/analytics-ga4/reader.ts` (ya acepta `landingPrefix`, un solo prefijo)
- Contrato editorial v2 en producción (`INSIGHTS_EDITORIAL_V2_ENABLED` ON; TASK-1888)

### Blocks / Impacts

- `TASK-1992` (hechos nuevos del Search Visibility 360): todo hecho nuevo por URL o por página debe respetar el alcance.
- `TASK-1960` (un informe por servicio contratado): el alcance por organización es la base; el alcance por servicio
  queda para esa task.
- `TASK-1672` / `TASK-1673` (auditoría técnica SEO en Insights): los hallazgos por página deberán declarar si respetan
  el alcance.
- Ediciones recurrentes de Berel (schedule mensual): la primera ocurrencia posterior al release cambia de población.

### Files owned

- `migrations/<timestamp>_task-2033-growth-seo-content-scope.sql` (nuevo, generado con `pnpm migrate:create`)
- `src/lib/growth/seo/content-scope/` (nuevo: contrato, matcher, fragmento SQL, reader, command, tests)
- `scripts/seo/set-content-scope.ts` (nuevo)
- `src/lib/growth/seo/overview/read-overview-kpis.ts`
- `src/lib/growth/seo/overview/read-window-movers.ts`
- `src/lib/growth/seo/work-queue/reader.ts`
- `src/lib/growth/analytics-ga4/reader.ts`
- `src/lib/efeonce-insights/adapters/seo-adapter.ts`
- `src/lib/efeonce-insights/adapters/ga4-site-facts.ts`
- `src/lib/efeonce-insights/contracts/evidence.ts`
- `src/lib/efeonce-insights/editorial/editorial-v2.ts`
- `src/lib/efeonce-insights/editorial/deterministic-planner.ts`
- `src/lib/copy/insights.ts`
- `docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md`
- `docs/documentation/insights/efeonce-insights-dominio-ediciones.md`
- `docs/manual-de-uso/insights/operar-efeonce-insights-api-mcp.md`
- `.claude/skills/efeonce-insights/` y su espejo `.codex/skills/efeonce-insights/`

## Current Repo State

### Already exists

- `seo_gsc_daily` guarda una fila por `(organization_id, capture_date, query, page)`: el recorte por página no necesita
  recaptura ni backfill.
- Los readers dueños ya agregan con la fórmula canónica (posición ponderada por impresiones, CTR del período).
- `readGa4Analytics` ya filtra por un prefijo de página de entrada (`landingPrefix`).
- `readRankEvolution` devuelve la `url` que posiciona en cada punto; `seo_work_queue_items` guarda `target_url`.
- El plan v2 sella `scopeLines` desde `GH_INSIGHTS.scopeLines` (`scopeLinesFor(modules)` en `editorial-v2.ts`).
- Los hechos de referencia (`role: 'reference'`) existen: se citan, no generan hallazgos ni entran a tablas.
- Precedente de preferencia por organización con historial y command canónico: `commands/cover-preference.ts`.

### Gap

- No existe ningún modelo de alcance de contenido por organización, ni en SEO ni en Insights.
- Ningún reader dueño acepta un filtro de rutas con varias reglas.
- La evidencia no registra sobre qué población de páginas se midió.
- «Qué mide este informe» afirma «cuánto aparece la marca en Google» para toda organización.
- El ETV es una estimación del dominio y hoy entra al informe como si fuera del trabajo medido.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/growth/seo/content-scope/**` (modelo y readers) y `src/lib/efeonce-insights/adapters/**` (consumo), en el runtime del portal y del `ops-worker`
- Future candidate home: `domain-package`
- Boundary: command `setSeoContentScope` y reader `readSeoContentScope` son el único acceso al alcance; los readers SEO y GA4 reciben el alcance como parámetro; Insights lo consume por su adapter
- Server/browser split: store, reader, command y fragmento SQL server-only; contrato de reglas y matcher puros, sin I/O
- Build impact: `none`
- Extraction blocker: los readers del dominio SEO comparten el pool Postgres del portal y la tabla `seo_gsc_daily`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `migration`
- Source of truth afectado: tabla nueva `greenhouse_growth.seo_content_scope_versions`; readers `readSeoOverviewKpisForWindow`, `readSeoWindowMovers`, `readSeoWorkQueue`, `readGa4Analytics`; evidencia sellada de Insights
- Consumidores afectados: adapter SEO de Insights (portal y `ops-worker` por el tick de schedules), PDF, deck y vista web de Think por las líneas del plan; CLI del operador
- Runtime target: `local`, `staging`, `production`, `worker`

### Contract surface

- Contrato existente a respetar: `EvidenceSnapshotContentV1` y `EditorialPlanV1` (`src/lib/efeonce-insights/contracts/`), firmas actuales de los readers SEO y GA4
- Contrato nuevo o modificado: `SeoContentScopeV1` (reglas `prefix` y `exact`), reader `readSeoContentScope`, command `setSeoContentScope`, parámetro opcional `scope` en los cuatro readers, campo opcional `contentScope` en `EvidenceSourceV1`, hechos de referencia `site_total.*`, razón de rechazo `outside_content_scope`
- Backward compatibility: `compatible` — todo parámetro y campo nuevo es opcional; sin alcance declarado el resultado es idéntico al actual
- Full API parity: el alcance se escribe sólo por el command `setSeoContentScope` y se lee por `readSeoContentScope`; el primer consumer es la CLI `scripts/seo/set-content-scope.ts`; la exposición por App API, Ecosystem API y MCP con su capability queda como follow-up declarado

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.seo_content_scope_versions` (nueva); lectura de `greenhouse_growth.seo_gsc_daily` y `greenhouse_growth.seo_work_queue_items`
- Invariantes que no se pueden romper:
  - El alcance vigente de una organización es su versión de mayor número; una versión nunca se edita ni se borra.
  - Una versión con cero reglas significa «sitio completo» (equivale a no tener alcance).
  - Una ruta pertenece al alcance si es igual a una regla `exact`, igual a una regla `prefix`, o empieza por `prefix + '/'`. `/articulos-viejos` no pertenece a `/articulos`.
  - La ruta se compara sin esquema, sin host, sin query, sin fragmento y sin barra final; la comparación es por bytes y distingue mayúsculas.
  - La misma lista de reglas se aplica a la ventana actual y a la de comparación de una edición.
  - Con alcance vigente, ningún hecho `measure` del capítulo SEO mide una población mayor que el alcance.
  - La suma por página dentro del alcance es exactamente el total de clics del alcance (misma tabla, misma suma).
- Write-target allowlist: N/A — `src/lib/growth/seo` no tiene boundary test de destinos de escritura; `src/lib/efeonce-insights/boundary-domain.test.ts` debe seguir verde porque Insights no escribe la tabla nueva
- Tenant/space boundary: toda lectura y escritura lleva `organization_id`; el adapter usa el `organizationId` de la edición, nunca uno del payload
- Idempotency/concurrency: fijar las mismas reglas y la misma etiqueta que la versión vigente no escribe; la versión nueva se calcula y se inserta en una transacción con bloqueo por organización (`pg_advisory_xact_lock`), con `UNIQUE (organization_id, version)` como red
- Audit/outbox/history: la tabla es el historial (append-only, actor y motivo por versión); sin evento outbox en V1 porque no hay consumer reactivo

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: `enabled with rationale` — el comportamiento nuevo sólo se activa para una organización con una versión de alcance con reglas; ninguna la tiene hasta que el operador la fije
- Backfill plan: ninguno; `seo_gsc_daily` ya tiene `page`. El alcance de Berel se fija por CLI después del release
- Rollback path: fijar una versión sin reglas por CLI devuelve la organización al informe de sitio completo sin deploy; el código se revierte con `revert + redeploy`; la tabla puede quedar
- External coordination: ninguna variable de entorno ni secreto; avisar al operador antes de fijar el alcance de Berel y antes de revisar ediciones ya creadas

### Security and access

- Auth/access gate: V1 sólo por CLI con credenciales de operador; el reader lo consumen procesos server-side ya autorizados por los tres planos de Insights (`authz.ts`)
- Sensitive data posture: sin datos personales; rutas públicas de un sitio y una etiqueta
- Error contract: reglas inválidas se rechazan con error tipado y mensaje en español; fallas inesperadas por `captureWithDomain(err, 'growth', …)` o `'insights'` según el origen
- Abuse/rate-limit posture: ninguno adicional; máximo 50 reglas por versión y 200 caracteres por ruta para acotar el SQL

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/growth/seo/content-scope src/lib/growth/seo/overview src/lib/growth/analytics-ga4 src/lib/efeonce-insights`
- DB/runtime checks: lectura real de agosto y septiembre de 2026 de Berel con el alcance acordado; los clics por `/articulos` + `/tutoriales` deben dar 522 y 605, y la suma de «movers» por página debe coincidir con el total del alcance
- Integration checks: `scripts/insights/preview-edition.ts` sobre Berel, septiembre de 2026, con y sin alcance; consulta GA4 real filtrada por página de entrada
- Reliability signals/logs: sin señal nueva; las existentes `insights.editions.*` cubren la generación
- Production verification sequence: ver «Rollout Plan & Risk Matrix»

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
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Modelo del alcance de contenido (dominio SEO)

- Migración aditiva `greenhouse_growth.seo_content_scope_versions` con trigger de no-update y no-delete, guard anti pre-up-marker y GRANTs.
- `src/lib/growth/seo/content-scope/contracts.ts`: `SeoContentScopeV1`, validación y normalización de reglas, matcher puro `isPathInContentScope`.
- `src/lib/growth/seo/content-scope/sql.ts`: fragmento SQL parametrizado que normaliza `page` y aplica las reglas (`starts_with`, sin `LIKE`).
- `readSeoContentScope(organizationId)` y `setSeoContentScope(...)` (versión nueva, idempotente con las mismas reglas).
- CLI `scripts/seo/set-content-scope.ts` con `--dry-run` por defecto y `--apply`.

### Slice 2 — Readers dueños aceptan el alcance

- `readSeoOverviewKpisForWindow` y `readSeoWindowMovers` reciben `scope` opcional; totales, serie y «movers» se calculan sobre el alcance.
- `readSeoWorkQueue` recibe `scope` opcional y filtra por `target_url` antes de paginar.
- `readGa4Analytics` recibe `landingMatch` (varias reglas) y lo traduce a un `orGroup` de la Data API; `landingPrefix` se conserva.
- Paridad matcher TS ↔ fragmento SQL probada contra PostgreSQL real con las URLs reales de Berel.

### Slice 3 — Evidencia de Insights sobre el alcance

- El adapter SEO resuelve el alcance vigente y lo pasa a los readers en la ventana actual y en la de comparación.
- Hechos `site_total.clicks` y `site_total.impressions` de la propiedad completa con `role: 'reference'`.
- Ranking: sólo las keywords cuyo último punto de la ventana posiciona con una URL del alcance.
- ETV: no se emite con alcance vigente; rechazo `outside_content_scope` con detalle.
- `EvidenceSourceV1.contentScope` sella versión, etiqueta y reglas; `population` de cada hecho nombra el alcance.

### Slice 4 — El plan declara el alcance

- `scopeLinesFor` recibe las fuentes selladas: con alcance, la línea SEO nombra el contenido medido.
- Una lectura de contexto del capítulo SEO compara el contenido medido con el sitio completo, citando los hechos de referencia.
- Copy nuevo en `src/lib/copy/insights.ts` (línea de alcance, lectura de contexto, límite del ETV), validado con `greenhouse-ux-writing`.
- Pruebas del planner y de `plan-validation` con y sin alcance.

### Slice 5 — Berel, verificación real y documentación

- Fijar el alcance de Berel por CLI y generar la vista previa real de septiembre de 2026 con `scripts/insights/preview-edition.ts`.
- Abrir el PDF y el deck página por página.
- Documentación técnica, funcional y manual; skill `efeonce-insights` (ledger, mapa, contratos, operación, lecciones) y espejos.

### Slice 6 — Lectura del alcance por el lane ecosystem y MCP

- Recurso de lectura del alcance vigente en el lane ecosystem del módulo SEO y tool MCP `get_seo_content_scope`, con su entrada en `src/mcp/greenhouse/tool-manifest.ts` y `pnpm mcp:manifest:generate`.
- Federación en el gateway `efeonce-mcp` (sync del manifiesto, paridad, versión) bajo el scope de lectura.
- Lo exige la regla del dominio SEO: todo reader nuevo expone su tool en el mismo trabajo. Va después de Berel porque no cambia lo que mide el informe.

## Out of Scope

- UI en el portal para editar el alcance, y ESCRIBIRLO por App API, Ecosystem API o MCP con su capability (follow-up); la lectura por MCP sí es de esta task (Slice 6).
- Alcance por servicio contratado o por proyecto (`TASK-1960`).
- Capítulo AEO: la visibilidad en motores de respuesta es de la marca y las visitas desde asistentes de IA siguen midiéndose sobre el sitio completo.
- ETV recortado por ruta: no hay captura por URL; depende de `url_visibility` en `TASK-1992`.
- Re-emitir ediciones ya selladas: revisar una edición es una acción del operador, fuera de esta task.
- Cockpit SEO del portal (`/growth/seo`): sigue mostrando la propiedad completa.
- Hallazgos de auditoría técnica por página (`TASK-1672`).

## Detailed Spec

### Tabla

```sql
CREATE TABLE greenhouse_growth.seo_content_scope_versions (
  organization_id        TEXT NOT NULL REFERENCES greenhouse_core.organizations (organization_id) ON DELETE RESTRICT,
  version                INTEGER NOT NULL CHECK (version >= 1),
  label                  TEXT NOT NULL CHECK (char_length(label) BETWEEN 1 AND 120), -- el command admite hasta 60
  rules_json             JSONB NOT NULL CHECK (jsonb_typeof(rules_json) = 'array'),
  reason                 TEXT NOT NULL CHECK (char_length(reason) >= 10),
  created_by_actor_kind  TEXT NOT NULL,
  created_by_user_id     TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (organization_id, version)
);
```

Regla: `{ "kind": "prefix" | "exact", "path": "/articulos" }`. `path` empieza por `/`, no termina en `/`, no contiene
`?`, `#` ni espacios, y no es `/` (la raíz como prefijo sería el sitio completo; para eso se fijan cero reglas).

### Alcance de Berel (Grupo Berel, `org-32333527-02a8-487b-819e-6f76a761777d`)

- Etiqueta: «Artículos, tutoriales, inspiración y guías».
- `prefix`: `/articulos`, `/tutoriales`, `/inspiracion`.
- `exact`: `/pintura-y-barniz-para-madera-como-elegir`, `/impermeabilizante-para-azotea-como-elegir`.

Una guía nueva en la raíz no entra sola: hay que agregarla con una versión nueva. La skill `berel-content-production`
debe decirlo en su paso de publicación.

### Normalización de `page` en SQL

`rtrim(split_part(split_part(regexp_replace(page, '^https?://[^/]+', ''), '?', 1), '#', 1), '/')`, y pertenencia con
`path = ANY($exact) OR EXISTS (SELECT 1 FROM unnest($prefixes::text[]) AS p WHERE path = p OR starts_with(path, p || '/'))`.
Aplica a todos los hosts de la propiedad (`berel.com`, `www.berel.com`, subdominios).

### Hechos y límites con alcance vigente

| Hecho | Con alcance | Sin alcance |
| --- | --- | --- |
| `clicks`, `impressions`, `ctr`, `position`, `clicks_week.*` | sobre el alcance | propiedad completa |
| `driver.query.*`, `driver.page.*` | sobre el alcance | propiedad completa |
| `site.organic_*` (GA4) | páginas de entrada del alcance | sitio completo |
| `keywords_tracked`, `page_one_keywords` | keywords que posicionan con URL del alcance | todas las monitoreadas |
| `opportunity.*` | `target_url` dentro del alcance | toda la cola |
| `organic_etv` | no se emite; rechazo `outside_content_scope` | como hoy |
| `site_total.clicks`, `site_total.impressions` | referencia de la propiedad completa | no se emiten |

### Línea de alcance y lectura de contexto

- Línea: «Visibilidad orgánica del contenido que trabajamos: {etiqueta}, con sus clics, impresiones y posiciones en
  Google.» La etiqueta viene sellada; la frase no lleva cifras.
- Lectura de contexto: una sola frase del capítulo SEO que cita el cambio de clics del contenido medido y el del sitio
  completo, sólo cuando ambos tienen período anterior. Su redacción final la fija el Slice 4 con `greenhouse-ux-writing`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3 → Slice 4 → Slice 5.
- Slice 3 y Slice 4 se publican en el mismo release: evidencia recortada con la línea genérica «cuánto aparece la marca
  en Google» sería un informe que miente sobre su población.
- El alcance de Berel se fija (Slice 5) sólo después de que el release con los Slices 1–4 esté en producción y en el
  `ops-worker`. Fijarlo antes no rompe nada (el código viejo no lo lee), pero la verificación no sería del runtime real.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El alcance deja fuera una página que sí es trabajo de Efeonce (guía nueva en la raíz) | Insights / SEO | medium | Lectura de contexto con el sitio completo; paso en `berel-content-production`; CLI con `--dry-run` que lista las páginas con más clics fuera del alcance | no signal — emerge en la revisión de la edición antes de emitir |
| La edición de un mes compara contra un mes medido con otra población | Insights | low | La ventana de comparación se recolecta en la misma corrida con las mismas reglas selladas | prueba de adapter; `contentScope` igual en todas las fuentes de la edición |
| El fragmento SQL y el matcher TS divergen | SEO readers | low | Prueba de paridad contra PostgreSQL real con URLs reales | prueba live en `content-scope` |
| El filtro por regex vuelve lenta la lectura mensual | Postgres | low | Medir `EXPLAIN ANALYZE` sobre Berel (≈210 mil filas por mes) antes de cerrar el Slice 2 | latencia de generación de la edición |
| El `ops-worker` corre código sin el cambio y genera la ocurrencia programada con la propiedad completa | ops-worker | medium | El release incluye el deploy del `ops-worker`; verificar la revisión activa antes de fijar el alcance | edición programada sin `contentScope` en sus fuentes |
| Razón de rechazo nueva que un consumer no conoce | Think / catálogos | low | Los límites viajan como texto ya resuelto; verificar el modelo web y los catálogos en Discovery | prueba de `web-model` y visual gate |
| Cifras absolutas chicas leídas como mal resultado | Cliente | medium | La línea de alcance y la lectura de contexto explican la población | revisión humana antes de emitir |

### Feature flags / cutover

Sin flag: el comportamiento se activa por dato, organización por organización, con una versión de alcance con reglas.
Ninguna organización la tiene al hacer release. Revertir una organización es fijar una versión sin reglas por CLI; toma
efecto en la siguiente edición, sin deploy.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | `revert` del código; la tabla vacía puede quedar | 10 min | si |
| Slice 2 | `revert + redeploy`; los parámetros son opcionales y sin uso si se revierte el Slice 3 | 15 min | si |
| Slice 3 | versión sin reglas por CLI (inmediato) o `revert + redeploy` de Vercel y `ops-worker` | 5–20 min | si |
| Slice 4 | `revert + redeploy` junto con el Slice 3 | 20 min | si |
| Slice 5 | versión sin reglas por CLI; las ediciones ya selladas con alcance se corrigen con `revise` | 5 min | parcial |

### Production verification sequence

1. `pnpm migrate:up` y verificar que la tabla y su trigger existen.
2. Release de Greenhouse (Vercel y `ops-worker`); confirmar la revisión activa del `ops-worker`.
3. Vista previa de una organización sin alcance: la evidencia y el plan son iguales a los de antes del release.
4. `scripts/seo/set-content-scope.ts` en `--dry-run` para Berel; revisar las páginas fuera del alcance con más clics.
5. Con autorización del operador, `--apply` para Berel.
6. Vista previa de Berel, septiembre de 2026: clics del alcance coherentes con la medición del 2026-10-12, línea de
   alcance presente, ETV ausente con su límite, lectura de contexto presente.
7. Render real de A4 y deck de esa edición interna y revisión página por página.

### Out-of-band coordination required

- Autorización del operador para aplicar la migración en la instancia compartida y para fijar el alcance de Berel.
- Decisión del operador sobre revisar (`revise`) la edición de septiembre de Berel ya creada.
- Avisar al equipo que produce contenido de Berel: una guía nueva en la raíz requiere una versión nueva del alcance.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe `greenhouse_growth.seo_content_scope_versions`, append-only, y su migración aborta si la tabla no quedó creada.
- [ ] `setSeoContentScope` crea una versión nueva sólo cuando cambian las reglas o la etiqueta, y rechaza reglas inválidas con error tipado. (Escrito; sin ejercitar contra PostgreSQL real porque la tabla aún no existe.)
- [x] `readSeoOverviewKpisForWindow` con el alcance de Berel devuelve 522 clics en agosto de 2026 y 605 en septiembre para `/articulos` + `/tutoriales`, leídos de PostgreSQL real. (Medido 2026-10-12 con el SQL del reader; con el alcance completo acordado: 661 y 799.)
- [x] La suma de clics por página de `readSeoWindowMovers` con alcance coincide con el total de clics del alcance. (`scoped-readers.live.test.ts`, suma independiente por página en TS, las dos ventanas.)
- [x] El matcher TS y el fragmento SQL clasifican igual las URLs de una muestra real que incluye `/articulos-x`, query strings, barra final y `www`. (`content-scope.live.test.ts`: casos de borde y todas las páginas reales de la organización con más serie.)
- [x] Una organización sin alcance produce el mismo snapshot que antes del cambio (prueba de adapter sin diferencias). (Las pruebas previas del adapter pasan sin tocar sus aserciones; las llamadas a los readers son idénticas.)
- [x] Con alcance, ninguna fuente SEO de la edición queda sin `contentScope`, y la ventana de comparación usa las mismas reglas. (Prueba de adapter.)
- [x] Con alcance, `organic_etv` no aparece como hecho y sí como límite con la razón `outside_content_scope`. (Pruebas de adapter y de plan.)
- [x] Con alcance, «Qué mide este informe» nombra la etiqueta sellada y no contiene cifras. (`content-scope-plan.test.ts`.)
- [x] La lectura de contexto cita los hechos de referencia `site_total.*` y pasa `plan-validation`. (`content-scope-plan.test.ts`, con las cifras reales de Berel.)
- [ ] La vista previa real de Berel para septiembre de 2026 se abrió en PDF y deck, página por página.
- [x] `pnpm vitest run src/lib/efeonce-insights src/lib/growth/seo src/lib/growth/analytics-ga4` queda verde. (2026-10-12: 1.338 pruebas; `test:live` del alcance: 9 pasadas, ninguna saltada.)
- [ ] La tool MCP `get_seo_content_scope` existe, está en el manifiesto y federada en el gateway.
- [ ] La consulta real de GA4 de Berel filtrada por página de entrada coincide con la suma por página hecha en TS.
- [ ] La skill `efeonce-insights` y sus espejos reflejan el alcance (ledger, mapa, contratos, operación, lecciones).

## Verification

- `pnpm local:check`
- `pnpm vitest run src/lib/efeonce-insights src/lib/growth/seo src/lib/growth/analytics-ga4`
- `pnpm test` y `pnpm build` como gate de cierre
- `pnpm composer:visual-gate --catalog=insights`
- `pnpm task:lint --task TASK-2033`, `pnpm ops:lint --changed`, `pnpm docs:closure-check`
- Vista previa real de Berel con `scripts/insights/preview-edition.ts`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `.claude/skills/efeonce-insights/` actualizada y espejada a `.codex/` (`pnpm skills:mirrors`)
- [ ] `berel-content-production` indica que una guía nueva en la raíz requiere una versión nueva del alcance
- [ ] `TASK-1992`, `TASK-1960` y `TASK-1672` recibieron su delta

## Follow-ups

- Escribir el alcance por App API, Ecosystem API y MCP con capability propia y grant, y UI en el portal.
- Lente «contenido que trabajamos» en el cockpit SEO.
- Alcance por servicio contratado (`TASK-1960`).
- ETV por URL cuando exista `url_visibility` (`TASK-1992`).

## Open Questions

- ¿Entran al alcance de Berel `/consejos-para-pintar` y `/colores-de-temporada`? Hoy quedan fuera.
- ¿Las visitas desde asistentes de IA del capítulo AEO deben recortarse también a las páginas del alcance?
- ¿Se revisa la edición de septiembre de Berel ya creada o el alcance rige desde la edición de octubre?

## Delta 2026-10-12

- Slices 1–4 implementados en `develop` local, sin push. La migración `20261012145214417_task-2033-growth-seo-content-scope.sql` está escrita y **sin aplicar**: crea una tabla en la instancia compartida y espera autorización del operador. Mientras no se aplique, este código no se empuja: el adapter falla cerrado si no puede leer el alcance.
- El predicado por fila sobre `seo_gsc_daily` tardaba ~5 s por consulta en un mes real de Berel (204 mil filas). Los readers usan `gscPagesInContentScopeSql`, que clasifica una vez por página distinta: ~0,4 s y el mismo resultado exacto.
- La etiqueta admite 60 caracteres en el command (la columna, 120): se imprime dentro de la línea de alcance de la portada.
- `site_total.*` responde la pregunta `outcome` del contrato de contenido; como `measurement` rompía el gate (SEO no tiene productor de metas).
- La lectura de contexto es la última afirmación del capítulo, con rol `finding`: «Los clics de este contenido variaron +20,9 % frente al período anterior; los de todo el sitio, -13,6 %.» (cifras reales de Berel, septiembre de 2026).
- Sin verificar todavía: el filtro de GA4 contra la propiedad real (la consulta ad hoc devolvió `query_failed`, sin diagnosticar), el store contra PostgreSQL real, y el PDF y el deck reales con alcance.
