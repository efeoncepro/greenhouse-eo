# TASK-1705 — Cosecha de la capacidad OnPage ya pagada (reads gratis post-crawl)

## Delta 2026-08-27

- El transporte `postDataForSeoTask` ahora **exige** `consumer` en todas sus variantes: las llamadas
  de cosecha de esta task nacen declarando `consumer: 'seo'` — cambiado por TASK-1696.
- El ledger ganó `consumer`, `cost_basis` y `price_table_version`, y su clave única pasó a seis
  columnas `NULLS NOT DISTINCT` — cambiado por TASK-1696. Nota para los pasos de verificación: el
  writer sigue ignorando costos ≤ 0 (invariante conservado), así que un endpoint gratis **no deja
  fila**; verificar costo 0 es verificar la ausencia de fila, no una fila con cero.

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
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-022`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|seo`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El site audit encola un crawl OnPage completo, paga por él, y después **lee 2 de ~13 endpoints de
esa familia**. Los reads post-crawl son **gratis durante 30 días**. Esta task cosecha cinco de los
que faltan —`microdata`, `duplicate_tags`, `links`, `redirect_chains`, `non_indexable`— y los
convierte en findings del audit. Costo incremental: **USD 0**.

Dos de ellos cierran huecos nombrados: `links` da la primera señal real de estructura de enlazado
interno (hoy la única es `is_orphan_page`), y `microdata` da la validación de **calidad** del
JSON-LD, complementaria a `TASK-1670`, que detecta su **ausencia**.

## Why This Task Exists

Hay un absurdo verificado en el repo: `src/lib/growth/seo/site-audit/queue-audit.ts:181` setea
`validate_micromarkup: true` —el enabler pagado del crawl— y su propio comentario en `:175` declara
que ese flag *"habilita el endpoint `microdata` (validación JSON-LD — insumo AEO)"*. **Ese endpoint
no se llama nunca.** El único consumo OnPage vive en `collect.ts:56-58`: `summary` y `pages`.
Estamos pagando el enabler de una capacidad que no cosechamos.

Y la brecha S9 de la auditoría del 2026-08-15: la única señal de estructura de enlazado interno del
módulo es `is_orphan_page` (`findings-map.ts:56`). Una página huérfana es el caso extremo; entre
"huérfana" y "bien enlazada" hay todo el grafo, y el endpoint `links` lo entrega **gratis**.

**Por qué ahora y no después: la ventana de 30 días.** Los reads post-crawl del proveedor son
gratuitos durante 30 días desde que la tarea completó — el propio `collect.ts` lo documenta en su
docstring. Pasado ese plazo, leer un endpoint que ya se podía leer **exige pagar el crawl otra vez**.
Cada semana que esta task no existe, un crawl entero se vence sin haber sido cosechado.

## Goal

- El ciclo de site audit cosecha `microdata`, `duplicate_tags`, `links`, `redirect_chains` y
  `non_indexable` de la misma tarea OnPage ya pagada, sin una sola llamada que cueste dinero.
- Los hallazgos entran como filas de `greenhouse_growth.seo_site_audit_findings` con su
  `issue_type` y su `severity`, por el mismo camino que los actuales.
- Existe señal de estructura de enlazado interno más allá de `is_orphan_page`.
- Existe validación de **calidad** del JSON-LD que complementa —sin duplicar— la detección de
  **ausencia** de `TASK-1670`.
- El riesgo de la ventana de 30 días queda declarado, instrumentado y con signal.

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
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` (§7 spend guard, §9, §13.3 allowlist,
  §17)
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md`
- `.claude/rules/growth-seo.md`

Reglas obligatorias:

- **Skill mandatoria `dataforseo-operator`** al tocar cualquier llamada al proveedor.
- **El ledger de gasto lo escribe el TRANSPORTE, jamás el caller.** Aunque estas lecturas cuesten
  USD 0, pasan por `postDataForSeoTask` con su `organizationId` — un read gratis igual deja fila con
  costo 0, y esa fila es la prueba de que lo llamamos.
- **Todo write provider-facing pasa por `enforceSeoRunEntitlement`.** Estas lecturas no encolan
  crawl nuevo, así que **no consumen allowance** — pero la decisión de no consumirla se declara
  explícita, no se asume.
- **El transporte es POST-only.** `microdata`, `duplicate_tags`, `links`, `redirect_chains` y
  `non_indexable` son POST bajo `/v3/on_page/`, igual que `summary` y `pages`; la convención
  `task_get/$id` (GET con id en el path) **no la soporta el transporte** y el proveedor respondería
  404/405. Verificar endpoint por endpoint antes de cablear.
- **Familia `onpage` ya está en el allowlist** (`src/lib/ai/dataforseo-families.ts:57`). No se
  amplía el allowlist; no se introduce prefijo nuevo.
- **El breaker es por FAMILIA, no por operación.** Cinco polls nuevos que fallen abren el breaker de
  `onpage` y apagan también la creación de crawls. Es el riesgo principal de esta task.
- **Honest degradation.** Un endpoint que falla degrada su bloque de findings; **no** tumba el run
  ni pisa los findings que sí se cosecharon. Un run con `summary` OK y `links` caído es `degraded`
  con motivo, nunca `failed` y nunca `succeeded` silencioso.
- **Idempotencia.** El collect materializa EXACTAMENTE UNA VEZ por run, dentro de su propia
  transacción con `SELECT … FOR UPDATE SKIP LOCKED`. Los findings nuevos entran en esa misma
  transacción o no entran.

## Normative Docs

- `docs/audits/platform/2026-08-15-growth-seo-aeo-module-opportunity-audit.md` (§1.4
  `validate_micromarkup` sin cosechar, §3.1 S9, §3.3 tabla de capacidad ociosa)
- `.claude/skills/dataforseo-operator/SKILL.md` y sus `references/`
- `docs/tasks/to-do/TASK-1670-growth-site-probes-kernel-seo-audit.md` (detecta AUSENCIA de JSON-LD;
  esta task valida su CALIDAD — no se solapan, se complementan)

## Dependencies & Impact

### Depends on

- `src/lib/growth/seo/site-audit/queue-audit.ts` — ya setea `validate_micromarkup: true` (`:181`).
  Verificar si los otros cuatro endpoints requieren enablers adicionales en el `task_post`; si
  alguno los requiere, el crawl actual **no** los habilita y ese endpoint queda fuera de V1 hasta
  que un crawl nuevo salga con el enabler.
- `src/lib/growth/seo/site-audit/collect.ts` — ciclo de poll + materialización idempotente.
- `src/lib/growth/seo/site-audit/findings-map.ts` — mapa `issue_type → severity`.
- `greenhouse_growth.seo_site_audit_findings` — tabla existente (`migrations/
  20260805134439202_task-1299-growth-seo-schema.sql:128`), con `url`, `issue_type`, `severity`,
  `detail JSONB`.
- `src/lib/ai/dataforseo.ts` + `src/lib/ai/dataforseo-families.ts` — transporte y allowlist.

### Blocks / Impacts

- `TASK-1670` — complementaria. 1670 detecta que **falta** JSON-LD / que se bloquea a crawlers de
  IA; esta detecta que el JSON-LD **existe pero está mal**. Deben coexistir sin duplicar findings:
  vocabulario de `issue_type` disjunto, declarado.
- `TASK-1672` / `TASK-1673` — el artefacto de auditoría y su envío heredan findings nuevos. Un
  documento que ya se estaba diseñando cambia de contenido.
- El eje S9 de la auditoría queda cubierto parcialmente: hay señal de enlazado interno, aunque el
  grafo completo como capacidad de producto es otra task.

### Files owned

- `src/lib/growth/seo/site-audit/collect.ts`
- `src/lib/growth/seo/site-audit/findings-map.ts`
- `src/lib/growth/seo/site-audit/harvest/`
- `src/lib/growth/seo/site-audit/__tests__/`
- `src/lib/growth/seo/flags.ts`
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- `docs/documentation/` y `docs/manual-de-uso/` — delta proporcional

## Current Repo State

### Already exists

- `src/lib/growth/seo/site-audit/queue-audit.ts:43` — `ONPAGE_TASK_POST_ENDPOINT =
  '/v3/on_page/task_post'`; `:181` — `validate_micromarkup: true` con comentario en `:175` que
  declara que habilita `microdata`.
- `src/lib/growth/seo/site-audit/collect.ts:56-58` — `ONPAGE_SUMMARY_ENDPOINT` y
  `ONPAGE_PAGES_ENDPOINT`. Son los **únicos dos** endpoints OnPage consumidos.
- `collect.ts` docstring — ciclo idempotente con `FOR UPDATE SKIP LOCKED`, mapeo explícito de honest
  degradation (`succeeded` / `degraded` / `failed` / no-op / `gave_up`), y la frase que sostiene esta
  task: *"los reads post-crawl del proveedor son gratis por 30 días"*.
- `src/lib/growth/seo/site-audit/findings-map.ts` — mapa con, entre otros,
  `duplicate_title_tag`, `duplicate_meta_tags`, `redirect_chain`, `has_meta_refresh_redirect`,
  `canonical_to_redirect`, `is_orphan_page`. Varios de esos `issue_type` **ya existen en el mapa** y
  hoy sólo se pueblan desde `pages`/`summary`: hay que verificar cuáles se enriquecen y cuáles se
  duplicarían.
- `greenhouse_growth.seo_site_audit_findings` — tabla con `detail JSONB`, suficiente para el payload
  de los endpoints nuevos sin migración.
- `src/lib/ai/dataforseo-families.ts:57` — familia `onpage` en el allowlist,
  `requiresOrganization: true`.
- `signal seo.audit.stuck_tasks` — vigila tareas que no completan (umbral 6h).

### Gap

- Cero llamadas a `microdata`, `duplicate_tags`, `links`, `redirect_chains`, `non_indexable`.
- No existe ninguna señal de estructura de enlazado interno más allá de `is_orphan_page`.
- No existe validación de calidad del JSON-LD (sólo detección de ausencia, y esa la trae 1670).
- No hay instrumentación de la ventana de 30 días: nada avisa que un crawl está por vencer sin
  haber sido cosechado.
- No está verificado cuáles de los cinco endpoints requieren enabler propio en el `task_post`.

## Modular Placement Contract

- Topology impact: `worker`
- Current home: `src/lib/growth/seo/site-audit/` en el portal, ejecutado desde el ciclo del
  ops-worker
- Future candidate home: `worker`
- Boundary: la cosecha se agrega al collect canónico existente; los consumidores siguen leyendo
  findings por el reader del audit (`site-audit/reader.ts`). Ningún consumer llama al proveedor
  directo
- Server/browser split: `server-only` estricto. Transporte, credenciales del proveedor y escritura
  en Postgres jamás cruzan al browser
- Build impact: none. Sin dependencias nuevas: mismo transporte, misma familia del allowlist
- Extraction blocker: la materialización de findings vive dentro de la MISMA transacción del collect
  con `FOR UPDATE SKIP LOCKED`; separar la cosecha a otro deployable rompería esa atomicidad

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: `greenhouse_growth.seo_site_audit_findings` (append por run) y
  `greenhouse_growth.seo_site_audit_runs` (status del run)
- Consumidores afectados: reader del site audit, UI de auditoría, `TASK-1672` (artefacto), MCP
  read-only, ops-worker
- Runtime target: `worker`, `staging`, `production`

### Contract surface

- Contrato existente a respetar: el ciclo async de `collect.ts` (poll idempotente + transacción
  única + honest degradation), el vocabulario de `issue_type` de `findings-map.ts`, y el allowlist
  cerrado de familias
- Contrato nuevo o modificado: cinco cosechadores bajo `site-audit/harvest/`, cada uno con su
  endpoint, su normalizador y su mapeo a `issue_type`; nuevos `issue_type` en `findings-map.ts` con
  su `severity`
- Backward compatibility: `gated`. Los findings nuevos aparecen en runs nuevos detrás de flag; los
  runs históricos no se re-cosechan
- Full API parity: la cosecha vive en `src/lib/growth/seo/site-audit/**` y se expone por el reader
  canónico ya existente; ningún consumer nuevo llama al proveedor. Si el reader cambia de shape, su
  tool MCP se actualiza en el MISMO PR

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.seo_site_audit_findings`,
  `greenhouse_growth.seo_site_audit_runs`
- Invariantes que no se pueden romper:
  - `Costo cero`: ninguna llamada de esta task encola crawl nuevo. Si un endpoint resultara pagado,
    queda fuera de V1 hasta declararlo con su fila de presupuesto
  - `El ledger lo escribe el transporte`: se llama con `organizationId`; una fila con costo 0 es la
    prueba de la llamada, y su ausencia sería la fuga de §1.2 de la auditoría en espejo
  - `Una materialización por run`: los findings nuevos entran en la MISMA transacción del collect
  - `Degradación honesta`: endpoint caído degrada su bloque, nunca tumba el run ni borra lo cosechado
  - `Sin duplicar findings`: el vocabulario de `issue_type` de los cosechadores nuevos es **disjunto**
    del que ya pueblan `pages`/`summary`, o enriquece el mismo `issue_type` sin emitir una segunda
    fila para la misma URL
  - `Sin solape con TASK-1670`: 1670 dice "falta JSON-LD"; esta dice "el JSON-LD que hay está mal".
    Dos `issue_type` distintos, declarados
- Tenant/space boundary: `organizationId` derivado del `seo_target_id` del run vía
  `src/lib/growth/seo/resolve-target.ts`; **nunca** SQL inline con `ORDER BY created_at DESC LIMIT 1`
- Idempotency/concurrency: heredada de `collect.ts` — claim con `FOR UPDATE SKIP LOCKED`, y el run
  sale de `running` dentro de la misma transacción, así que dos collects concurrentes no
  materializan dos veces
- Audit/outbox/history: el evento de outbox del collect se mantiene; se enriquece con el conteo por
  bloque cosechado. Los findings son append por run, nunca UPDATE

### Migration, backfill and rollout

- Migration posture: `none`. `detail JSONB` absorbe el payload nuevo y `issue_type` es TEXT libre
  con `severity` bajo CHECK — no hace falta DDL
- Default state: `flag OFF` por bloque cosechado. Cada endpoint se prende por separado para que uno
  que falle no arrastre a los otros cuatro
- Backfill plan: **ninguno, y es una decisión, no un olvido.** Los crawls con más de 30 días ya
  perdieron la ventana: re-cosecharlos exigiría pagar el crawl de nuevo. Los crawls dentro de la
  ventana se cosechan sólo si se declara explícitamente y con costo verificado en 0
- Rollback path: `flag off` por bloque + `revert PR`. Los findings ya escritos quedan; son hechos
  del run, no configuración
- External coordination: verificar con el proveedor (vía la skill `dataforseo-operator` y sus
  references) qué enablers exige cada endpoint en el `task_post`, **antes** de cablear

### Security and access

- Auth/access gate: el ciclo corre en el ops-worker con su service account; el reader expone los
  findings bajo la capability del dominio growth ya existente
- Sensitive data posture: `no sensitive data`. Metadatos técnicos de páginas públicas del sitio del
  cliente
- Error contract: `captureWithDomain` con dominio growth; nada de `Sentry.captureException` directo.
  En la frontera HTTP, `canonicalErrorResponse`. El error del proveedor jamás viaja crudo al cliente
- Abuse/rate-limit posture: **el breaker es por familia**. Cinco polls nuevos multiplican la
  superficie de fallo de `onpage` y pueden apagar la creación de crawls. Mitigación: cada bloque
  detrás de su propio flag, techo de reintentos por bloque, y el fallo de un bloque no reintenta en
  el mismo ciclo

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/growth/seo/site-audit` con fixtures reales de respuesta del
  proveedor por endpoint
- DB/runtime checks: contra PG vía `pnpm pg:connect:shell` — verificar filas nuevas en
  `seo_site_audit_findings` con los `issue_type` nuevos, y que el conteo por run no duplicó las
  URLs que ya tenían finding
- Integration checks: llamada real a cada endpoint sobre una tarea OnPage **dentro** de la ventana
  de 30 días, verificando en `seo_provider_spend_daily` que la fila registró **costo 0**
- Reliability signals/logs: signal nueva de ventana — crawls completados hace más de N días sin
  cosecha registrada. Steady = 0. Reusa el patrón de `seo.audit.stuck_tasks`
- Production verification sequence: ver abajo

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] **Lógica en el primitive, no en la UI.** La cosecha vive en
      `src/lib/growth/seo/site-audit/harvest/**`.
- [ ] **Modelada como parte del ciclo del run**, no como click-handler.
- [ ] **Read expuesto por el reader canónico del audit** ya existente; si su shape cambia, su tool
      MCP se actualiza en el MISMO PR.
- [ ] **Capability + grant**: reusa la del dominio growth; declararlo explícito.
- [ ] **Camino programático declarado:** reader canónico + MCP read-only existente.
- [ ] **Sin write de negocio nuevo**: el único write es la materialización de findings del propio
      ciclo. Declararlo, no omitirlo.
- [ ] **Un primitive, muchos consumers:** UI, artefacto, MCP y ops-worker leen los MISMOS findings.
- [ ] **Parity check = SÍ.**

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

### Slice 1 — Verificación de enablers y costo, contra el proveedor real

- Confirmar, endpoint por endpoint, que `microdata`, `duplicate_tags`, `links`, `redirect_chains` y
  `non_indexable` son POST bajo `/v3/on_page/` y que el transporte actual los soporta.
- Confirmar qué enablers exige cada uno en el `task_post` y si el crawl vigente ya los lleva. El que
  requiera un enabler ausente **queda fuera de V1** y se documenta.
- Confirmar contra la respuesta real que el costo es **0** dentro de la ventana.
- Entregable: documento corto de verificación en la task + fixtures de respuesta reales.

### Slice 2 — Cosechadores + `issue_type`, con vocabulario disjunto

- `site-audit/harvest/` con un cosechador por endpoint: llamada, normalización, mapeo a
  `issue_type` + `severity`, y `detail` JSONB con la evidencia.
- Ampliación de `findings-map.ts` declarando qué `issue_type` son nuevos y cuáles enriquecen uno
  existente sin duplicar fila.
- Vocabulario explícitamente disjunto del de `TASK-1670`: ausencia de JSON-LD vs calidad del JSON-LD.
- Cada bloque detrás de su propio flag, default OFF.

### Slice 2b — Cosechador `domain_info`: los checks sitewide que ya recibimos y tiramos

- `parseOnPageSummary` (`src/lib/growth/seo/site-audit/collect.ts:94-115`) lee hoy sólo
  `crawl_progress`, `crawl_status.pages_crawled`, `page_metrics.onpage_score` y
  `extended_crawl_status`. **`summary.domain_info` llega en la misma respuesta y se descarta entero.**
- Materializar sus `checks` sitewide como hallazgos de **sitio**: `test_page_not_found` (soft-404),
  `test_https_redirect`, `test_www_redirect`, `test_canonicalization`, `test_directory_browsing`, y
  la expiración del certificado SSL.
- **Costo incremental cero**: no agrega una llamada al proveedor, sólo deja de tirar campos del
  payload que ya se pagó. Es exactamente la doctrina de esta task.
- `issue_type` **disjuntos de `TASK-1670`**, que trae sus propios hallazgos de sitio por fetch propio.
  Coordinar el vocabulario antes de escribir: dos motores no pueden emitir el mismo `issue_type`.
- Estos hallazgos son de sitio, no de página, así que heredan el eje de alcance y la superficie de
  `TASK-1671`. Verificar que el `priorityScore` —que divide por esfuerzo y multiplica por páginas
  afectadas— no se les aplique con un `?? 1` implícito.

### Slice 3 — Integración al ciclo, con degradación honesta

- Los cosechadores corren dentro de la MISMA transacción del collect, después de `summary`/`pages`.
- Un bloque que falla degrada el run a `degraded` con motivo en el detalle; **nunca** `failed` ni
  `succeeded` silencioso, y nunca borra lo que sí se cosechó.
- Techo de reintentos por bloque para no abrir el breaker de la familia `onpage`.
- El evento de outbox se enriquece con el conteo por bloque.

### Slice 4 — Signal de ventana + documentación

- Signal de reliability: crawls completados hace más de N días sin cosecha registrada. Steady = 0.
- Delta en `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` documentando qué endpoints OnPage se cosechan
  y por qué la ventana de 30 días es un riesgo operativo, no un detalle.
- Filas en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` con runtime declarado (**ops-worker**, no
  Vercel).
- Documentación funcional + manual proporcionales.

## Delta 2026-08-26 (2) — el motivo de parada del crawl, que hoy es un proxy que miente

El reporte **sí** declara que describe una muestra —`SiteAuditView.tsx:440,566` lo hace desde
`TASK-1309`, que está `complete`— pero descansa en el proxy `report.run.crawledPages === crawlPageCap`.
Ese proxy falla en las dos direcciones: **falso positivo** en un sitio de exactamente 100 páginas, y
**falso negativo** cuando el crawl para por presupuesto, por error del proveedor o por cualquier
motivo que no sea el tope.

`collect.ts:104-110` no lee `crawl_status.crawl_stop_reason` ni `pages_in_queue`, y `:296` persiste
sólo `crawled_pages`. Los dos campos llegan en la misma respuesta que ya se paga — misma doctrina que
el resto de esta task.

Barrido verificado: `crawl_stop_reason`, `pages_in_queue`, `crawlPageCap` y
`SITE_AUDIT_MAX_CRAWL_PAGES` no aparecen en **ninguna** task viva ni completa.

- Persistir ambos campos en `seo_site_audit_runs` (migración aditiva) y exponerlos en el reader.
- ⚠️ **La mitad de UI no es de esta task.** Reemplazar el proxy en `SiteAuditView.tsx` toca un archivo
  que posee `TASK-1671`, que además está rediseñando esa superficie. Va como task `ui-ux` posterior,
  **después** de 1671, o se le reescribe el render de KPIs a quien lo está rehaciendo.
- Y es bloqueante moral de `TASK-1672`/`1673`: un documento firmado y compartido con el cliente que
  no declara con precisión que describe una muestra es peor que no tener documento.

Origen: `docs/audits/platform/2026-08-26-openseo-competitive-teardown-growth-seo-aeo.md` §3.7.

## Out of Scope

- **Encolar crawls nuevos, cambiar la frecuencia del audit o subir el techo de páginas crawleadas.**
  Eso sí cuesta y es otra decisión.
- **Ampliar el allowlist de familias DataForSEO.** `onpage` ya está; no se toca
  `dataforseo-families.ts`.
- **Lighthouse / Core Web Vitals.** El propio registry documenta que el transporte no soporta su
  convención GET (`dataforseo-families.ts`, límite conocido #1), y la auditoría lo declara fuera de
  alcance (§6).
- **Backfill de crawls históricos.** Los que pasaron los 30 días ya no se pueden cosechar gratis.
- **El grafo de enlazado interno como capacidad de producto** (visualización, PageRank interno,
  recomendación de enlaces). Acá se cosecha la señal; explotarla es otra task.
- **La detección de bloqueo a crawlers de IA y la ausencia de JSON-LD.** Es `TASK-1670`, y esta task
  no la absorbe ni la duplica.
- **Cualquier cara de cliente.** Findings al reader; la superficie es de `TASK-1672`.

## Detailed Spec

### Los cinco endpoints y qué desbloquea cada uno

| Endpoint | Qué trae | Por qué importa |
|---|---|---|
| `microdata` | validación del micromarkup declarado | **Calidad** del JSON-LD. El enabler ya está pagado (`queue-audit.ts:181`) y jamás se cosechó. Complementa la detección de **ausencia** de `TASK-1670` |
| `duplicate_tags` | títulos y metas duplicados a nivel sitio | La canibalización que hoy se detecta por otra vía, ahora con la evidencia del crawl |
| `links` | grafo de enlaces internos | **S9**: hoy la única señal es `is_orphan_page`. Entre huérfana y bien enlazada está todo el grafo |
| `redirect_chains` | cadenas de redirect | `redirect_chain` ya existe en `findings-map.ts:44` pero se puebla por otra vía; acá se enriquece con la cadena completa |
| `non_indexable` | páginas no indexables y su motivo | El motivo es lo que falta: "noindex" y "bloqueada por robots" son problemas distintos |

### La ventana de 30 días, dicha en claro

Los reads post-crawl son gratuitos durante 30 días desde que la tarea OnPage completó. Es la razón
por la que esta task cuesta USD 0 **y** la razón por la que se degrada sola si nadie la ejecuta:

- Un crawl no cosechado dentro de la ventana no se puede cosechar después sin **pagar el crawl otra
  vez**.
- Por eso el Slice 4 no es opcional: sin la signal de ventana, la pérdida es silenciosa y sólo se
  descubre cuando alguien pide un dato que ya no está.
- Y por eso la cosecha vive **dentro del ciclo del collect**, no en un job aparte: el momento en que
  el crawl completó es exactamente el momento en que la ventana se abre.

### Por qué esto NO es un solape con TASK-1670

1670 pregunta *"¿este sitio tiene JSON-LD y deja pasar a los crawlers de IA?"* usando **probes
propios**. Esta pregunta *"¿el JSON-LD que el crawl ya vio está bien formado y es válido?"* usando
**el crawl ya pagado**. Fuentes distintas, preguntas distintas, `issue_type` distintos. El
vocabulario disjunto se declara en `findings-map.ts` y se verifica con un test que falla si los dos
conjuntos se intersectan.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- **Slice 1 (verificación contra el proveedor real) DEBE cerrar antes de escribir un solo
  cosechador.** Cablear un endpoint que exige un enabler ausente en el `task_post` produce fallos
  que abren el breaker de la familia `onpage` y apagan la creación de crawls — un costo real por una
  suposición.
- Slice 1 → Slice 2 (cosechadores, flags OFF) → Slice 3 (integración al ciclo) → Slice 4 (signal +
  docs).
- Los cinco bloques se prenden **de a uno**, con al menos un ciclo de observación entre cada flip.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un endpoint falla repetido y abre el breaker de la familia `onpage`, apagando también la creación de crawls | integración DataForSEO / site audit | **high** | Flag por bloque; techo de reintentos por bloque; el fallo no reintenta en el mismo ciclo; flips de a uno | breaker de `onpage` abierto; `seo.audit.stuck_tasks` |
| Un endpoint resulta pagado y no gratis | finance / spend | medium | Slice 1 verifica el costo real contra la respuesta antes de cablear; si cuesta, queda fuera de V1 | fila con costo > 0 en `seo_provider_spend_daily` |
| Se duplican findings con los que ya pueblan `pages`/`summary` o con `TASK-1670` | data quality / artefacto al cliente | medium | Vocabulario de `issue_type` disjunto declarado + test que falla si los conjuntos se intersectan | conteo de findings por run que salta sin explicación |
| Un bloque caído tumba el run entero y se pierde lo que sí se cosechó | site audit | medium | Degradación honesta por bloque dentro de la misma transacción; `degraded` con motivo | runs `degraded` con detalle por bloque |
| La ventana de 30 días vence sin cosecha y la pérdida es silenciosa | data / costo | **high** | Signal de ventana con steady = 0 (Slice 4) | signal de crawls vencidos sin cosechar |
| El flag se prende en Vercel y el ciclo corre en el ops-worker, así que no pasa nada | ops / rollout | medium | Mapear con `grep -rn` dónde se lee cada flag; declararlo en `services/ops-worker/deploy.sh` **y** aplicarlo en vivo; fila en el ledger con runtime | el bloque no produce findings tras el flip |

### Feature flags / cutover

- Un flag por bloque cosechado, default OFF, leído en el **ops-worker**.
- ⚠️ Prender un flag acá es multi-runtime: el ciclo del site audit corre en el ops-worker, **no** en
  Vercel. Declarar el flag en `services/ops-worker/deploy.sh` (los `deploy.sh` usan
  `--set-env-vars`, que es destructivo y borra toda var agregada out-of-band) **y además** aplicarlo
  en vivo con `gcloud run services update … --update-env-vars`. Hacer sólo lo segundo hace que el
  flag desaparezca en el próximo deploy, en silencio.
- Verificar en la **revisión activa** y ejercitar un ciclo real antes de declarar el flip hecho.
- Fila obligatoria por flag en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` con el runtime
  declarado.
- Revert: flag a OFF. Los findings ya escritos quedan, porque son hechos del run.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 — verificación | Sin runtime impact; es evidencia documental | inmediato | si |
| Slice 2 — cosechadores | `git revert`; nacen con flag OFF, así que no corren | <10 min | si |
| Slice 3 — integración al ciclo | Flags a OFF en el ops-worker + verificar en la revisión activa; luego `git revert` | <20 min | parcial (los findings escritos quedan) |
| Slice 4 — signal + docs | `git revert` del registro de la signal | <10 min | si |

### Production verification sequence

1. Slice 1 cerrado con fixtures reales y costo verificado en 0 por endpoint.
2. `pnpm local:check` y `pnpm vitest run src/lib/growth/seo/site-audit` verdes.
3. Staging con todos los bloques OFF: verificar que el ciclo del audit no cambió su comportamiento.
4. Staging, bloque `microdata` ON: correr un ciclo real sobre una tarea dentro de la ventana;
   verificar findings nuevos en `seo_site_audit_findings` y **costo 0** en
   `seo_provider_spend_daily`.
5. Repetir 4 para `duplicate_tags`, `links`, `redirect_chains`, `non_indexable`, de a uno, con un
   ciclo de observación entre cada uno.
6. Verificar que el breaker de `onpage` no se abrió y que la creación de crawls sigue normal.
7. Producción con el mismo orden y cooldown de 24 h entre bloques.
8. Monitorear la signal de ventana y el breaker durante 7 días.

### Out-of-band coordination required

- Verificación contra la documentación vigente del proveedor (vía la skill `dataforseo-operator` y
  sus `references/`) de los enablers y el costo de cada endpoint. Es el Slice 1 y es previo a
  cualquier código.
- Configuración de los flags en el ops-worker: `services/ops-worker/deploy.sh` + `gcloud run
  services update`, con verificación en la revisión activa.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El ciclo del site audit cosecha `microdata`, `duplicate_tags`, `links`, `redirect_chains` y
      `non_indexable` de la MISMA tarea OnPage ya pagada (o documenta cuál quedó fuera de V1 y por
      qué enabler).
- [ ] Verificado contra `seo_provider_spend_daily`: cada llamada de cosecha registró fila con
      **costo 0**. Ninguna llamada de esta task encoló crawl nuevo.
- [ ] `validate_micromarkup: true` (`queue-audit.ts:181`) deja de ser un enabler pagado sin cosechar:
      el endpoint `microdata` se llama y produce findings.
- [ ] Existe al menos una señal de estructura de enlazado interno distinta de `is_orphan_page`.
- [ ] El vocabulario de `issue_type` de esta task es **disjunto** del de `TASK-1670` y no duplica los
      que ya pueblan `pages`/`summary`; hay un test que falla si los conjuntos se intersectan.
- [ ] Un endpoint caído degrada su bloque y el run queda `degraded` con motivo; los findings de los
      bloques que sí funcionaron quedan escritos.
- [ ] Los findings nuevos entran en la MISMA transacción del collect; dos ciclos concurrentes no
      materializan dos veces (verificado por test sobre el claim `FOR UPDATE SKIP LOCKED`).
- [ ] Existe signal de reliability para la ventana de 30 días (crawls completados sin cosechar),
      con steady = 0.
- [ ] Cada flag tiene su fila en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` con **ops-worker**
      declarado como runtime, y está en `services/ops-worker/deploy.sh`.
- [ ] El breaker de la familia `onpage` no se abrió durante la verificación en staging ni en los
      primeros 7 días de producción.

## Verification

- `pnpm local:check`
- `pnpm vitest run src/lib/growth/seo/site-audit`
- `pnpm test` (suite completa, gate de cierre)
- `pnpm build` (producción, gate de cierre — pedir autorización al operador antes de correrlo)
- `pnpm pg:connect:shell` — verificar filas nuevas en `seo_site_audit_findings` y costo 0 en
  `seo_provider_spend_daily`
- Ciclo real del site audit en staging, bloque por bloque
- `pnpm docs:closure-check` y `pnpm flags:audit --strict --no-vercel`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] `TASK-1670` actualizada con la frontera declarada: ausencia de JSON-LD (1670) vs calidad del
      JSON-LD (esta task), con los `issue_type` de cada una.
- [ ] `TASK-1672` notificada: el artefacto de auditoría hereda findings nuevos.

## Follow-ups

- Explotar el grafo de enlazado interno como capacidad de producto (recomendación de enlaces
  internos, detección de clusters mal conectados). Hoy sólo se cosecha la señal.
- Evaluar los ~6 endpoints OnPage restantes que siguen sin leerse, con el mismo criterio de costo 0.
- `dataforseo_labs/ranked_keywords` con `item_types: ai_overview_reference` (USD 0,132/target/
  corrida, 1% de lo que cuesta el rank capture): responde en qué keywords el AI Overview nos cita.
  Es otra familia y otra task.

## Open Questions

- ¿`links` se cosecha entero o acotado a las URLs que ya tienen finding? El grafo completo de un
  sitio grande puede ser mucha fila para `seo_site_audit_findings`. Propuesta V1: acotado, con el
  criterio declarado, y el grafo completo como follow-up con su propia tabla.
- ¿Qué umbral N usa la signal de ventana? Propuesta: alertar a los 20 días para dejar 10 de margen
  operativo antes de que la ventana de 30 se cierre.
