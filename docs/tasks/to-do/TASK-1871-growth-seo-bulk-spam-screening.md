# TASK-1871 — Growth SEO: screening masivo de toxicidad (`bulk_spam_score`)

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
- Epic: `EPIC-022`
- Status real: `Diseño`
- Rank: `sin rankear`
- Domain: `data`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Incorpora `/v3/backlinks/bulk_spam_score/live` —hasta **1.000 targets por request**, escala
0–100— como consumer del carril SEO, para **screenear** toxicidad de dominios de una pasada.
Hoy tenemos el spam score enlace-por-enlace (`TASK-1777`) y el agregado del perfil propio
(`TASK-1304`); lo que falta es la lente de volumen: puntuar mil dominios candidatos y ordenar
a quién perseguir o qué revisar. El resultado es **diagnóstico**: esta task NO habilita
generar archivos de disavow, y esa frontera es parte del contrato.

## Why This Task Exists

Auditar UN perfil y screenear MIL dominios son dos problemas con economía distinta, y hoy sólo
sabemos hacer el primero.

- `TASK-1304` compra `summary/live` por target del cliente y persiste `toxic_share` =
  `backlinks_spam_score / 100` — el promedio de los enlaces **entrantes** a ESE cliente.
- `TASK-1777` baja al detalle nominal y persiste un `backlink_spam_score` por dominio
  referente y por anchor, pero **sólo del cliente**, **sólo cuando el agregado se movió**, y a
  ~USD 0,05–0,10 por target.
- Ninguno de los dos responde la pregunta de volumen: *«acá tengo 900 dominios candidatos —
  ¿cuáles valen la pena?»*. Hoy la única forma sería 900 llamadas a `summary/live`
  (≈ USD 18–20 y 900 tasks contra el límite de 30 concurrentes), y por eso simplemente no se
  hace: **la capacidad no existe, así que la pregunta no se plantea**.

`bulk_spam_score/live` cubre ese hueco con **un request** por cada 1.000 dominios
(≈ USD 0,024 de task + USD 0,000036 por fila ⇒ **≈ USD 0,06 el request lleno**). Dos órdenes
de magnitud más barato para el mismo barrido, con la contrapartida de que un endpoint que
acepta 1.000 targets **invita a gastar de más**: por eso la pieza central de esta task no es
el endpoint sino su **condición de disparo** y su **tope**, igual que en `TASK-1777`.

Además cierra una trampa semántica abierta: el `spam_score` que devuelve este endpoint es el
del **propio dominio**, no el de sus enlaces entrantes. Confundirlo con el `backlinks_spam_score`
que ya persistimos **invierte la lectura de riesgo** —un sitio limpio con enlaces sucios y uno
sucio con enlaces limpios quedan intercambiados, y ambos números son creíbles—. Esta task
declara cuál usa, por qué, y pone el mecanismo que impide fusionarlos.

## Goal

- Un hecho de mercado nuevo, `greenhouse_growth.seo_domain_spam_snapshots`: spam score 0–100
  **por dominio**, append-only, sin `organization_id` en la clave, alimentado por
  `bulk_spam_score/live` y **explícitamente distinto** del `toxic_share` del perfil propio.
- Dos casos de uso separados, cada uno con su economía declarada: **screening de prospección**
  (diagnóstico, on-demand, tope duro) e **higiene del perfil propio** (cron, condicionado al
  drill-down que ya corrió).
- Una condición de disparo sobre agregado **ya pagado** + frescura + tope por corrida, de modo
  que una segunda pasada sobre la misma cartera cueste ≈ 0.
- Lectura gobernada (reader + lane ecosystem + tool MCP federada, sólo bindings `internal`,
  404 anti-oracle) con bandas oficiales 0–30 / 31–60 / 61–100 y degradación honesta.
- Una frontera escrita y verificada: **diagnosticar ≠ desautorizar**. Cero generación de
  disavow en este carril.

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
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` (§1.1 boundary SEO↔AEO, §7, §9, §17)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- **Familia `backlinks`, ya en el allowlist: cero familias nuevas, cero cambio de transporte.**
  Toda llamada pasa por `postDataForSeoTask` con `family: 'backlinks'`, `consumer: 'seo'` y
  `organizationId` — el ledger de gasto lo escribe el TRANSPORTE, jamás el caller.
- **Todo write provider-facing pasa por `enforceSeoRunEntitlement`** (`src/lib/growth/seo/entitlement.ts`)
  con `estimatedCostUsd` del conjunto completo, **ANTES de la primera llamada**. NUNCA
  reimplementar el gate inline. `consumesAuditAllowance: false` (el screening no consume el
  cupo de site-audits; su freno es presupuesto/expiración/tope propio).
- **Append-only.** La tabla nueva lleva el trigger genérico de `TASK-1299`: prohibido `UPDATE`.
  El INSERT usa `ON CONFLICT DO NOTHING` sólo como guardia de carrera, con pre-check de
  frescura ANTES del proveedor.
- **Tres estados, no dos** (corolario `TASK-1661`): fila ausente = nunca preguntamos · fila con
  `spam_score IS NULL` = preguntamos y el proveedor no tiene el dominio · fila con `0` = el
  proveedor afirma que está limpio. **NUNCA** escribir `0` por «no sé», ni omitir la fila
  cuando el proveedor respondió sin dato (omitirla la deja eternamente «no fresca» y se
  re-compra en cada corrida, para siempre).
- **La lente se declara con `src/lib/growth/seo/lens.ts`.** El spam score del proveedor es
  `◑ estimated`; **NUNCA** promediarlo con nada medido, **NUNCA** un `lens: 'mixed'`, y
  **NUNCA** una columna `lens` en la migración (se deriva de la fuente).
- **Dato competitivo = sólo-internal.** El spam score de un dominio de terceros no se expone a
  bindings de cliente: lane y tool con bindings `internal` y **404 anti-oracle** (un dominio
  fuera de alcance «no existe» para ese caller, no da 403).
- **Full API Parity:** la capability nace con su contrato programático gobernado (command +
  reader + lane + tool MCP federada en el MISMO PR), no como botón ni como script.
- **`rank_scale: 'one_hundred'` explícito** en cualquier llamada de la familia `backlinks` cuya
  respuesta traiga un campo `rank`. `bulk_spam_score/live` **no devuelve `rank`** (por eso no
  está en `RANK_CAPABLE_ENDPOINTS` del guard), pero si un slice agrega `bulk_ranks/live` para
  ordenar el screening por autoridad, el parámetro es obligatorio y el guard lo exige.

## Normative Docs

- `.claude/skills/dataforseo-operator/references/03-backlinks.md` — §2 tabla bulk, §3 semántica
  de `spam_score` vs `backlinks_spam_score` y bandas oficiales, §5 costo, §7 gotchas 6/9/13/14,
  §8.1 auditoría de toxicidad a escala.
- `.claude/skills/seo-aeo/modules/05_OFFPAGE_AUTHORITY.md` → §«Enlaces tóxicos y disavow —
  cuándo SÍ y (casi siempre) cuándo NO». **Decisión Efeonce 2026-09-11**, fuente de la
  frontera de alcance de esta task.
- `.claude/rules/growth-seo.md` — invariantes auto-cargados del dominio (chokepoint de
  entitlement, patrón de batch que gasta, ledger con dimensión de consumidor, federación MCP).
- `docs/tasks/complete/TASK-1777-growth-seo-backlink-profile-drilldown.md` — doctrina de la
  condición de disparo sobre el agregado ya pagado, que esta task replica.
- `docs/tasks/complete/TASK-1304-growth-seo-site-audit-backlink-snapshot.md` — el snapshot
  semanal del que cuelga el caso de higiene.
- `docs/issues/open/ISSUE-170-prospect-link-gap-colapsa-por-interseccion-and.md`.

## Dependencies & Impact

### Depends on

- `greenhouse_growth.seo_backlink_snapshots` + `seo_backlink_referring_domains` +
  `seo_backlink_drilldowns` (`migrations/20260827203319906_task-1777-seo-backlink-detail.sql`).
- `src/lib/growth/seo/entitlement.ts` → `enforceSeoRunEntitlement`, `SEO_MODULE_KEYS_READ`.
- `src/lib/ai/dataforseo.ts` → `postDataForSeoTask` (familia `backlinks` ya permitida).
- `src/lib/growth/seo/lens.ts` (vocabulario de lente) y `src/lib/growth/seo/provider-pricing.ts`
  (`BACKLINKS_TASK_SETUP_USD`, `BACKLINKS_RESULT_ROW_USD`).
- `src/lib/growth/seo/register-provider-spend.ts` (atribución del gasto por import de efecto).
- `src/mcp/greenhouse/tool-manifest.ts` + `pnpm mcp:manifest:generate` para federar la tool.

### Blocks / Impacts

- **`TASK-1777`** — dueña del detalle nominal de enlaces del cliente. Esta task **no** modifica
  sus tablas ni recalcula `toxic_share`: consume `seo_backlink_referring_domains` como INSUMO
  del caso de higiene y escribe en tabla propia. Recibe `## Delta` apuntando acá.
- **`TASK-1304`** — dueña de la captura semanal. Esta task agrega un paso **condicional** al
  mismo batch `ops-seo-backlink-capture`, **sin scheduler nuevo** (mismo patrón con el que
  `TASK-1777` se colgó ahí). Recibe `## Delta`.
- **Carril de prospección** (`src/lib/growth/seo/prospect/**`, `TASK-1709`) — consumer natural
  del caso 1: el screening puntúa los dominios que ese carril ya descubre. La integración es
  **aditiva y opt-in**: `TASK-1709` sigue cerrada y su forecast de costo no cambia salvo que
  el caller pida el screening explícito.
- **`ISSUE-170`** — el link gap del prospecto puede colapsar por intersección AND, y es
  justamente la fuente de dominios que este screening priorizaría. **Orden de trabajo
  recomendado: resolver `ISSUE-170` antes de cablear el screening al link gap**, porque
  screenear una lista colapsada produce un resultado pobre indistinguible de un prospecto sano
  — el mismo modo de falla silencioso, ahora con una segunda capa encima. No es blocker duro:
  el caso 1 acepta una lista de dominios de cualquier origen (competidor, lista comercial), y
  el link gap es sólo uno de ellos.

### Files owned

- `migrations/<timestamp>_task-1871-seo-domain-spam-snapshots.sql`
- `src/lib/growth/seo/backlinks/spam-screening-contracts.ts`
- `src/lib/growth/seo/backlinks/should-screen-spam.ts`
- `src/lib/growth/seo/backlinks/spam-screening.ts`
- `src/lib/growth/seo/backlinks/spam-screening-reader.ts`
- `src/lib/growth/seo/backlinks/__tests__/should-screen-spam.test.ts`
- `src/lib/growth/seo/backlinks/__tests__/spam-screening.test.ts`
- `src/lib/growth/seo/backlinks/__tests__/spam-screening-boundary.test.ts`
- `src/lib/growth/seo/flags.ts` (flag nuevo)
- `src/lib/api-platform/resources/ecosystem-growth-seo.ts` (recurso + tool)
- `src/mcp/greenhouse/tool-manifest.ts` (entrada nueva + `pnpm mcp:manifest:generate`)
- `services/ops-worker/server.ts` (paso condicional del batch existente)
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (fila del flag nuevo)
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` (sección del hecho nuevo)
- `docs/documentation/` + `docs/manual-de-uso/` (capas funcional y de operación)

## Current Repo State

### Already exists

- `src/lib/growth/seo/backlinks/capture.ts` — snapshot semanal (`summary/live` +
  `bulk_new_lost_backlinks/live`), pre-check de idempotencia, gate de costo,
  `toxic_share = backlinks_spam_score / 100`, degradación honesta `captured|partial`.
- `src/lib/growth/seo/backlinks/should-drill-down.ts` — el predicado PURO de disparo del
  drill-down; el patrón exacto que esta task replica para el screening.
- `src/lib/growth/seo/backlinks/detail-capture.ts` + `detail-reader.ts` — pase de detalle con
  veredicto persistido y reader de tres estados.
- `src/lib/growth/seo/entitlement.ts` — chokepoint único de costo per-org.
- `src/lib/growth/seo/prospect/{contracts,collect,derive,store,command}.ts` — carril de
  diagnóstico de prospecto con allowlist de cuatro endpoints y forecast de costo previo.
- `src/lib/ai/__tests__/dataforseo-backlinks-rank-scale-guard.test.ts` — guard textual que
  exige `rank_scale: 'one_hundred'` en los endpoints `backlinks` que devuelven `rank`.
- `services/ops-worker/server.ts` → `/seo/backlinks/capture-batch`, disparado por el scheduler
  `ops-seo-backlink-capture` (`0 7 * * 1`, activo).

### Gap

- Ningún consumer del repo llama `bulk_spam_score/live`: no hay forma de puntuar una lista de
  dominios arbitrarios, sólo de auditar un target del cliente.
- El spam score que hoy persistimos es **siempre** de enlaces entrantes
  (`toxic_share` del perfil; `backlink_spam_score` por dominio referente). **No existe ningún
  almacén del spam score del PROPIO dominio**, que es el que decide si perseguir un prospecto.
- El carril de prospección enumera dominios de link gap y competidores **sin ninguna señal de
  calidad**: la priorización es por `rank`, que no dice nada de toxicidad.
- No hay frontera escrita en código entre «diagnosticar toxicidad» y «generar disavow». Hoy la
  decisión vive sólo en la skill `seo-aeo`; al aterrizar el score masivo, la tentación de
  cerrar el ciclo con un archivo pasa a ser una diferencia de pocas líneas.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/growth/seo/backlinks/**` (dominio compartido), consumido por Vercel
  (lane ecosystem + reader) y por el Cloud Run `ops-worker` (`services/ops-worker/server.ts`)
- Future candidate home: `domain-package`
- Boundary: command `screenDomainSpamScores` (único escritor de
  `greenhouse_growth.seo_domain_spam_snapshots`) + reader `readDomainSpamScreening` (único
  lector expuesto). Consumers autorizados: el paso condicional del batch semanal, el carril de
  prospección, el recurso del lane ecosystem y su tool MCP. Ningún consumer llama
  `postDataForSeoTask` para este endpoint por su cuenta.
- Server/browser split: el carril entero es `server-only` (PG, proveedor, secretos). Lo único
  puro y transportable al browser es el vocabulario de bandas y el forecast de costo, que
  viven en `spam-screening-contracts.ts` sin `server-only`, igual que `provider-pricing.ts`
- Build impact: none — reusa el transporte DataForSEO existente, sin SDK nuevo ni lectura de
  filesystem
- Extraction blocker: comparte el chokepoint de entitlement y el ledger de gasto en la misma
  base PostgreSQL que el resto del módulo SEO; extraerlo exigiría mover esos dos primero

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: tabla nueva `greenhouse_growth.seo_domain_spam_snapshots`
  (hecho de mercado por dominio, append-only); proveedor `DataForSEO /v3/backlinks/bulk_spam_score/live`
- Consumidores afectados: batch semanal del `ops-worker`, carril de prospección, lane
  `api/platform/ecosystem/growth/seo`, tool MCP `get_seo_domain_spam_screening`
- Runtime target: `worker` (batch) + `production` Vercel (reader/lane) — dual-runtime

### Contract surface

- Contrato existente a respetar: `postDataForSeoTask` (`src/lib/ai/dataforseo.ts`),
  `enforceSeoRunEntitlement` (`src/lib/growth/seo/entitlement.ts`), `SeoLens`/`SeoProvenance`
  (`src/lib/growth/seo/lens.ts`), manifiesto `src/mcp/greenhouse/tool-manifest.ts`
- Contrato nuevo o modificado: command `screenDomainSpamScores(input, actor)`, predicado puro
  `shouldScreenReferringDomains`, reader `readDomainSpamScreening`, recurso del lane
  ecosystem y tool `get_seo_domain_spam_screening` (`writes: false`,
  `spendsProviderBudget: false` para la lectura; el command que gasta es un paso del batch y
  el consumer de prospección, no una tool)
- Backward compatibility: `compatible` — aditivo puro. Ninguna tabla, columna, reader ni ruta
  existente cambia de forma ni de semántica
- Full API parity: la capability nace con command + reader + lane + tool federada en el mismo
  PR. La lectura es apta para `propose → confirm → execute` si mañana se expone un disparo
  manual: el LLM propone la lista de dominios, el humano confirma, el endpoint de confirmación
  ejecuta el command. Ninguna superficie escribe lógica de screening propia

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.seo_domain_spam_snapshots` (nueva);
  lectura de `greenhouse_growth.seo_backlink_referring_domains`,
  `greenhouse_growth.seo_backlink_drilldowns`, `greenhouse_growth.seo_targets`
- Invariantes que no se pueden romper:
  - **`spam_score` de esta tabla es el del PROPIO dominio** (`target_spam_score` semantics del
    proveedor), **NUNCA** el `backlinks_spam_score` agregado de los enlaces entrantes.
    Confundirlos invierte la lectura de riesgo. **NUNCA** escribir uno en la columna del otro
    ni promediarlos ni derivar uno del otro.
  - **`toxic_share` de `seo_backlink_snapshots` no se recalcula, no se sobrescribe y no se
    alimenta desde acá.** Miden cosas distintas: «qué tan sucio es este sitio» vs «de qué
    barrio vienen los enlaces que recibe».
  - Clave única `(normalized_domain, capture_date)`, **sin `organization_id`**: el hecho es del
    dominio, no del cliente que pagó por mirarlo. `captured_by_organization_id` existe **sólo**
    para atribución de gasto y **NUNCA** se expone en un DTO.
  - Tres estados del dato: fila ausente / `spam_score IS NULL` / `spam_score = 0`. **NUNCA**
    colapsarlos.
  - Bandas oficiales 0–30 bajo · 31–60 medio · 61–100 alto: **se derivan en lectura**, no se
    persisten (constante por score; una columna `band` sólo podría divergir).
  - Append-only: trigger genérico de `TASK-1299`. Prohibido `UPDATE`; prohibido `DELETE` para
    «limpiar» una corrida.
  - **Este carril no genera, no exporta y no nombra un archivo de disavow.**
- Write-target allowlist: el módulo `growth/seo` no tiene hoy un boundary test de destinos de
  escritura equivalente al de `src/lib/hiring/boundary-domain.test.ts`. Se declara el
  equivalente acotado en `spam-screening-boundary.test.ts`: el único destino de escritura del
  carril es `greenhouse_growth.seo_domain_spam_snapshots`, y el test falla si el código del
  carril contiene un `INSERT`/`UPDATE`/`DELETE` contra cualquier otra tabla
- Tenant/space boundary: la ESCRITURA se atribuye a la organización que pagó
  (`captured_by_organization_id`, derivado server-side del target o del caller del carril de
  prospección, jamás del request). La LECTURA es sólo-internal: bindings `internal` en el lane,
  404 anti-oracle para cualquier otro
- Idempotency/concurrency: pre-check de **frescura** (no de existencia) antes del proveedor —
  `SPAM_SCORE_FRESHNESS_DAYS`, default 90 — porque el spam score de un dominio se mueve lento y
  re-comprarlo dentro de la ventana es gasto puro. Un dominio fresco se sirve de base a costo
  cero. `ON CONFLICT (normalized_domain, capture_date) DO NOTHING` como guardia de carrera.
  Un solo request cubre hasta 1.000 dominios, así que la concurrencia real es baja
- Audit/outbox/history: la tabla ES el log (append-only). Evento de outbox
  `growth.seo.domain_spam_screening.captured` con `{screenedDomains, freshReused, purchased,
  providerCostUsd, actor}`. El gasto queda en `seo_provider_spend_daily` vía el transporte

### Migration, backfill and rollout

- Migration posture: `additive` — una tabla nueva con su trigger append-only y sus GRANTs.
  Marker `-- Up Migration` + bloque `DO $$ … RAISE EXCEPTION` que aborta si la tabla no quedó
  creada (anti pre-up-marker bug)
- Default state: `flag OFF` — `GROWTH_SEO_SPAM_SCREENING_ENABLED`, default `false`,
  subordinado a `GROWTH_SEO_ENABLED`, **dual-runtime** (Vercel + `ops-worker`)
- Backfill plan: sin backfill. El screening histórico no existe y fabricarlo sería comprar
  1.000 dominios «por si acaso» — justo lo que la task existe para evitar. La primera corrida
  real siembra la base
- Rollback path: flag a `false` + redeploy (el paso del batch queda inerte y el reader devuelve
  `screening_disabled`); revert del PR si hace falta; la migración tiene `Down` con
  `DROP TABLE IF EXISTS` y la tabla no tiene dependientes
- External coordination: declarar el flag en `services/ops-worker/deploy.sh`
  (`--set-env-vars` es destructivo: sin la declaración desaparece en el próximo deploy, en
  silencio) **y además** aplicarlo en vivo con `gcloud run services update … --update-env-vars`;
  registrar la fila en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`. **Sin scheduler nuevo**

### Security and access

- Auth/access gate: escritura por actor de sistema (batch) o por el carril de prospección, ambos
  detrás de `enforceSeoRunEntitlement`. Lectura por el lane ecosystem con bindings `internal`
  (`efeonce.mcp.read`); la ruta app equivalente exige la capability del módulo SEO
- Sensitive data posture: sin PII. El dato es **competitivo**: el spam score de un dominio de
  terceros no se expone a bindings de cliente
- Error contract: `canonicalErrorResponse` en cualquier ruta; `captureWithDomain(err, 'growth', …)`
  para observabilidad; jamás el error crudo del proveedor al cliente
- Abuse/rate-limit posture: **tope duro por corrida** (`SPAM_SCREENING_MAX_TARGETS_PER_RUN`,
  1.000 = límite del proveedor; `SPAM_SCREENING_MAX_REQUESTS_PER_RUN`, default 1) + forecast de
  costo validado contra el gate ANTES de la primera llamada + breaker del transporte. El
  endpoint acepta 1.000 targets: sin tope, un caller distraído compra la cartera entera

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/growth/seo/backlinks` (predicado puro, parser, tope,
  frescura, boundary) + `pnpm vitest run src/lib/ai/__tests__/dataforseo-backlinks-rank-scale-guard.test.ts`
  + `pnpm mcp:manifest:check`
- DB/runtime checks: `pnpm pg:connect:shell` → verificar tabla, trigger append-only, GRANTs y
  el `UNIQUE`; un `UPDATE` de prueba debe fallar por el trigger
- Integration checks: una corrida real acotada del command con **una lista corta y declarada**
  de dominios contra el proveedor, comparando el `cost` devuelto con el forecast; segunda
  corrida inmediata sobre la misma lista debe costar **USD 0** por frescura
- Reliability signals/logs: `growth.seo.spam_screening.*` en el log del `ops-worker`;
  el gasto observable en `seo_provider_spend_daily` con `consumer='seo'`, `family='backlinks'`
- Production verification sequence: ver `### Production verification sequence` en Zone 3

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] El único destino de escritura del carril queda declarado y verificado en
      `spam-screening-boundary.test.ts`, en el mismo PR.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

- [ ] **Lógica en el primitive, no en la UI.** Todo vive en `src/lib/growth/seo/backlinks/**`.
- [ ] **Modelada como command + reader**, no como click-handler ni script ad hoc.
- [ ] **Read** = `readDomainSpamScreening`; **write** = `screenDomainSpamScores` con entitlement,
      idempotencia por frescura, outbox, errores canónicos y observabilidad.
- [ ] **Capability + grant en el MISMO PR** si el disparo manual se expone; si el carril sólo
      corre por sistema y prospección, declararlo explícito y no inventar una capability muerta.
- [ ] **Camino programático declarado:** lane `api/platform/ecosystem/growth/seo` + tool MCP
      federada vía `tool-manifest.ts` + `pnpm mcp:manifest:generate`.
- [ ] **Write apto para `propose → confirm → execute`**: el LLM propone la lista de dominios,
      el humano confirma, el endpoint de confirmación ejecuta. Cero integración Nexa-específica.
- [ ] **Un primitive, muchos consumers:** batch, prospección, lane y tool consumen lo mismo.
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

### Slice 1 — Hecho de mercado, contratos y predicado puro (sin código capaz de gastar)

- Migración `task-1871-seo-domain-spam-snapshots`: tabla + trigger append-only de `TASK-1299` +
  `UNIQUE (normalized_domain, capture_date)` + GRANTs a `greenhouse_runtime` + bloque `DO`
  anti pre-up-marker.
- `spam-screening-contracts.ts` (módulo PURO, sin `server-only`): endpoint canónico, topes,
  ventana de frescura, vocabulario de bandas `low|medium|high` derivado del score, forecast de
  costo y el tipo del resultado con procedencia (`◑ estimated`).
- `should-screen-spam.ts`: predicado PURO (sin red, sin DB, sin reloj) de la condición de
  disparo del caso de higiene, con su test. **Va antes que cualquier código capaz de gastar.**
- `pnpm db:generate-types` y commit de los tipos junto a la migración.

### Slice 2 — Command de screening (el único escritor)

- `spam-screening.ts` → `screenDomainSpamScores({ domains, capturedByOrganizationId, reason }, actor)`:
  normaliza y deduplica dominios, aplica topes, resuelve frescura contra la tabla (separa
  `fresh` de `toPurchase`), corta si no queda nada que comprar (**cero llamadas**), calcula el
  forecast, pasa por `enforceSeoRunEntitlement`, arma **un** request por cada ≤1.000 dominios,
  parsea, persiste con los tres estados, publica el evento de outbox y devuelve el desglose
  `{screened, freshReused, purchased, missingAtProvider, providerCostUsd}`.
- `spam-screening-boundary.test.ts`: el carril no escribe en ninguna otra tabla y la palabra
  `disavow` no aparece en su código.

### Slice 3 — Caso 2, higiene del perfil propio (paso condicional del batch semanal)

- Paso nuevo en `/seo/backlinks/capture-batch` del `ops-worker`, **detrás de
  `GROWTH_SEO_SPAM_SCREENING_ENABLED` y subordinado al flag del módulo**, sin scheduler nuevo.
- Corre **sólo** sobre los dominios referentes del último snapshot con drill-down `drilled`
  que aún no fueron screeneados: si el perfil no se movió, no hubo drill-down, no hay filas
  nuevas y el screening no corre. La condición de disparo va sobre agregado **ya pagado**.
- Declaración del flag en `services/ops-worker/deploy.sh` + fila en el ledger de flags.

### Slice 4 — Caso 1, screening de prospección (on-demand, diagnóstico)

- Entrada opt-in en el carril de prospección para puntuar una lista explícita de dominios
  candidatos (referring domains de un competidor, link gap, lista comercial) con tope duro y
  forecast mostrado ANTES de gastar.
- El resultado **ordena la persecución**; no emite veredicto de salud, no certifica, no
  produce disavow. Sin lista explícita no hay screening: nunca se infiere del sujeto.

### Slice 5 — Lectura gobernada (reader + lane + tool MCP federada)

- `spam-screening-reader.ts` → `readDomainSpamScreening`: bandas derivadas, procedencia
  `◑ estimated` en lista por campo, y estados honestos `available` ·
  `never_screened` · `screening_disabled`.
- Recurso en `src/lib/api-platform/resources/ecosystem-growth-seo.ts`, bindings `internal`,
  404 anti-oracle.
- Entrada en `src/mcp/greenhouse/tool-manifest.ts` (`get_seo_domain_spam_screening`,
  `writes: false`, `spendsProviderBudget: false`) + `pnpm mcp:manifest:generate` + federación
  en el gateway (`pnpm greenhouse:manifest:sync`).
- Triple documentación: arquitectura (§ del hecho nuevo), funcional y manual de uso.

## Out of Scope

- 🔴 **Generar, exportar, previsualizar o nombrar un archivo de disavow.** Decisión Efeonce
  2026-09-11 (`.claude/skills/seo-aeo/modules/05_OFFPAGE_AUTHORITY.md`): no construimos un
  generador automático, y un informe de toxicidad **no es por sí solo** motivo para entregar
  uno. Los tres casos donde sí corresponde —acción manual confirmada en Search Console,
  historial declarado de compra de enlaces, spam entrante masivo que el cliente puede fechar—
  **se declaran, no se detectan por un score**. Diagnosticar ≠ desautorizar.
- Cualquier familia DataForSEO fuera de `backlinks`, y cualquier endpoint `backlinks` distinto
  de `bulk_spam_score/live` (un `bulk_ranks/live` para ordenar por autoridad es una decisión
  aparte y arrastra el guard de `rank_scale`).
- Recalcular, sobrescribir o «mejorar» `toxic_share` de `seo_backlink_snapshots`, o tocar las
  tablas de `TASK-1777`.
- Superficie visible: esta task no crea ni modifica ninguna ruta de UI. Quien quiera pintar el
  semáforo abre una task `ui-ux` propia.
- Resolver `ISSUE-170`. Se declara como orden de trabajo recomendado, no se arregla acá.
- Backfill histórico de spam scores.
- Un scheduler propio de Cloud Scheduler.

## Detailed Spec

### 1. Qué spam score es éste, y por qué importa tanto

`bulk_spam_score/live` devuelve, por target, un `spam_score` 0–100 que mide **el nivel de spam
del propio dominio** (18 señales del proveedor: largo del nombre, ratio de enlaces externos
sobre internos, HTTP vs HTTPS, etc.; para un dominio se promedia el score de sus páginas). Es
el mismo número que en `summary/live` vive anidado como `items[0].info.target_spam_score`.

**No es** `backlinks_spam_score`, que es el promedio agregado de los enlaces que **llegan** al
target y es lo que ya persistimos como `toxic_share`. Los dos son 0–100, los dos son creíbles,
y confundirlos intercambia exactamente los dos casos que interesan: el sitio limpio con enlaces
sucios y el sitio sucio con enlaces limpios.

Esta task usa el **primero** porque la pregunta que resuelve es *«¿vale la pena perseguir a
este dominio / revisar este vecino?»*, y eso depende de cómo es ÉL, no de quién lo enlaza.

Calibración publicada por el proveedor para leer la escala: Stack Overflow 3, Apple 5, CNN 19,
Forbes 20, BBC 31, IBM 33. **Un 31 no es un sitio malo**: las bandas oficiales son 0–30 bajo,
31–60 medio, 61–100 alto, y el screening ordena, no condena.

### 2. Esquema

```sql
CREATE TABLE IF NOT EXISTS greenhouse_growth.seo_domain_spam_snapshots (
  domain_spam_snapshot_id     TEXT PRIMARY KEY DEFAULT ('seodss-' || gen_random_uuid()::text),

  normalized_domain           TEXT NOT NULL CHECK (length(normalized_domain) BETWEEN 1 AND 255),
  domain                      TEXT NOT NULL CHECK (length(domain) BETWEEN 1 AND 255),

  -- Spam score del PROPIO dominio (0-100). NULL = preguntamos y el proveedor no lo tiene.
  -- 0 = el proveedor afirma que esta limpio. Son estados distintos: NUNCA colapsarlos.
  spam_score                  NUMERIC(5, 2)
    CHECK (spam_score IS NULL OR (spam_score >= 0 AND spam_score <= 100)),

  capture_date                DATE NOT NULL,

  -- Vocabulario cerrado: un endpoint nuevo debe romper el INSERT, no colarse invisible.
  source_endpoint             TEXT NOT NULL DEFAULT 'bulk_spam_score'
    CHECK (source_endpoint IN ('bulk_spam_score')),

  -- Por que se compro: audita la politica de gasto, no clasifica el dominio.
  screening_reason            TEXT NOT NULL
    CHECK (screening_reason IN ('referring_domain_hygiene', 'prospect_screening')),

  -- Atribucion de gasto UNICAMENTE. NUNCA se expone en un DTO ni entra en la clave.
  captured_by_organization_id TEXT NOT NULL,
  provider_cost               NUMERIC(12, 4) NOT NULL DEFAULT 0 CHECK (provider_cost >= 0),

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT seo_domain_spam_snapshots_unique UNIQUE (normalized_domain, capture_date)
);
```

Sin columna `band` (se deriva del score) y sin columna `lens` (se deriva de la fuente). La
clave **no** lleva organización: el spam score de `ejemplo.cl` es el mismo para todos, y
duplicarlo por cliente sería pagar dos veces el mismo hecho.

### 3. La condición de disparo del caso de higiene

Mismo esqueleto que `shouldDrillDownBacklinks`, predicado PURO y testeado antes de que exista
código capaz de gastar:

- drill-down con `outcome != 'drilled'` → **no screenear**. Si no hubo detalle, no hay dominios
  referentes nuevos que puntuar; screenear «por si acaso» convierte un perfil estable en gasto.
- drill-down `drilled` cuyos dominios referentes ya fueron screeneados dentro de la ventana de
  frescura → **no screenear** (`skipped_fresh`), que es información, no un hueco.
- drill-down `drilled` con al menos un dominio referente sin screening fresco → **screenear
  sólo esos**, nunca la lista completa.

El tope se aplica **después** del predicado: si los dominios elegibles superan
`SPAM_SCREENING_MAX_TARGETS_PER_RUN`, se toman los de mayor `backlinks_to_target` primero y el
resto espera a la siguiente corrida. Truncar es preferible a comprar de más, y queda declarado
en el resultado (`truncated: true`), nunca en silencio.

### 4. Economía

| Concepto | Valor |
|---|---|
| Task setup (familia `backlinks`) | USD 0,024 por request |
| Fila devuelta | USD 0,000036 |
| Request lleno (1.000 dominios) | **≈ USD 0,06** |
| Equivalente vía `summary/live` | ≈ USD 20 y 1.000 tasks |
| Ventana de frescura | 90 días (`SPAM_SCORE_FRESHNESS_DAYS`) |
| Tope por corrida | 1.000 targets / 1 request (`SPAM_SCREENING_MAX_*_PER_RUN`) |

El forecast se calcula con las constantes de `provider-pricing.ts` y se valida contra
`enforceSeoRunEntitlement` **antes de la primera llamada**. El costo real de la corrida sale
del campo `cost` del proveedor y lo registra el transporte en el ledger.

### 5. Lo que el reader NO devuelve

Sin veredicto de salud, sin score compuesto, sin benchmark de mercado, sin «acción
recomendada». Devuelve el score, su banda, la fecha de captura y su lente `◑`. La decisión de
perseguir, revisar o ignorar es humana — y la de desautorizar no pertenece a este carril.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- **Slice 1 (migración + contratos + predicado puro) → Slice 2 (command que gasta).** El
  predicado y el forecast existen y están testeados **antes** de que exista una línea capaz de
  llamar al proveedor. Invertirlo es exactamente cómo se filtra presupuesto.
- **Slice 2 → Slice 3** y **Slice 2 → Slice 4**: los dos casos de uso son consumers del mismo
  command; ninguno llama al proveedor por su cuenta.
- **Slice 3 y Slice 4 pueden correr en paralelo** una vez cerrado el 2.
- **Slice 5 (lectura) puede empezar tras el 2**, pero no se federa la tool hasta que exista al
  menos una corrida real que leer: federar una tool que siempre devuelve vacío entrena al
  agente a desconfiar del dominio entero.
- El flag se prende **después** de la corrida acotada del `### Production verification sequence`,
  nunca junto con el merge.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un caller screenea la cartera entera «por si acaso» y quema presupuesto del cliente | finance (budget SEO per-org) | medium | Tope duro por corrida + forecast validado contra `enforceSeoRunEntitlement` ANTES de la primera llamada + predicado de disparo sobre agregado ya pagado + frescura de 90 días | `budget_exhausted` del gate; `seo_provider_spend_daily` con `consumer='seo'`, `family='backlinks'` |
| Se escribe el `spam_score` del dominio en la columna del `backlinks_spam_score` (o al revés) e **invierte la lectura de riesgo** | data (contrato de toxicidad) | medium | Tabla propia con sujeto explícito (el dominio) + `spam-screening-boundary.test.ts` que prohíbe escribir en las tablas de `TASK-1777` + comentario de invariante en la migración | No hay señal runtime: el número queda plausible. El mecanismo es el test de frontera, no un monitor |
| Repetir la corrida sobre la misma lista vuelve a comprar todo | finance | medium | Pre-check de **frescura** (no de existencia) + persistir la fila incluso cuando el proveedor no tiene el dominio (`NULL`), para que no quede eternamente «no fresca» | Segunda corrida con `purchased > 0` sobre lista sin cambios |
| El screening se usa para producir un disavow | data / cliente | low | Fuera de alcance declarado + guarda textual en el test de frontera + reader sin veredicto ni acción recomendada. ⚠️ Guarda **textual**: afirma que el verbo no existe en el carril, no que nadie lo haga a mano. El verificador real es la revisión humana | Ninguna automática — es una frontera de política |
| El flag se prende sólo en Vercel y el paso del batch queda muerto | cron / ops-worker | medium | El flag es dual-runtime y se declara en `services/ops-worker/deploy.sh` **además** de aplicarse en vivo; fila en el ledger con el runtime nombrado | Corrida semanal sin filas nuevas y sin error |
| El screening prioriza sobre una lista de link gap colapsada por `ISSUE-170` | data | medium | Orden de trabajo recomendado: `ISSUE-170` antes de cablear al link gap. El caso 1 acepta listas de cualquier origen, así que no bloquea | Resultado pobre indistinguible de un prospecto sano — por eso el orden importa |
| Un `bulk_ranks/live` agregado después queda en escala 0–1000 | data | low | Fuera de alcance en esta task; si se agrega, el guard `dataforseo-backlinks-rank-scale-guard.test.ts` lo pone rojo | Build rojo del guard |

### Feature flags / cutover

- **`GROWTH_SEO_SPAM_SCREENING_ENABLED`** — default `false`, subordinado a `GROWTH_SEO_ENABLED`.
  **Dual-runtime**: lo lee el `ops-worker` (paso del batch, Slice 3) y Vercel (reader/lane,
  Slice 5). Declararlo en `services/ops-worker/deploy.sh` (`--set-env-vars` es destructivo:
  aplicarlo sólo con `--update-env-vars` lo borra en el próximo deploy, en silencio) y
  aplicarlo además en vivo con `gcloud run services update … --update-env-vars` para efecto
  inmediato. Verificar en la **revisión activa**, no en el script.
- Fila obligatoria en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` con el runtime nombrado,
  en el mismo PR (`pnpm docs:closure-check` falla si falta).
- Revert: flag a `false` + redeploy. Tiempo: < 5 min en Vercel, < 5 min en Cloud Run.
- Sin scheduler nuevo: el paso cuelga de `ops-seo-backlink-capture` (`0 7 * * 1`, activo).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | `pnpm migrate:down` (tabla nueva sin dependientes) o simplemente dejarla: aditiva e inerte sin código que la escriba | < 5 min | sí |
| Slice 2 | Revert del PR. El command no tiene callers hasta el Slice 3 | < 10 min | sí |
| Slice 3 | Flag a `false` en el `ops-worker` + redeploy: el paso queda inerte y el batch semanal sigue igual que hoy | < 5 min | sí |
| Slice 4 | Flag a `false` en Vercel; el carril de prospección vuelve a su forecast previo (la entrada es opt-in) | < 5 min | sí |
| Slice 5 | Retirar la entrada del manifiesto + `pnpm mcp:manifest:generate` + `pnpm greenhouse:manifest:sync`; el reader queda sin consumers | < 15 min | sí |

Ningún slice muta estado preexistente: no hay migración destructiva, no hay backfill y ninguna
fila de otra tabla se toca. El rollback más caro es de-federar una tool.

### Production verification sequence

1. `pnpm migrate:up` en la instancia compartida + verificar por `information_schema` que la
   tabla, el `UNIQUE` y el trigger append-only existen; un `UPDATE` de prueba debe fallar.
2. Deploy con el flag en `false` en **ambos** runtimes + verificar que el batch semanal corre
   idéntico a hoy (mismos `captured`/`partial`, cero filas nuevas).
3. Prender el flag **sólo en el `ops-worker`** y correr el batch en `dryRun` (o con
   `maxTargets` acotado) con la **misma identidad OIDC que usa Cloud Scheduler**, no un `curl`
   aproximado: verificar que el predicado decide bien y que el forecast coincide con el `cost`
   devuelto por el proveedor.
4. Correr una segunda vez de inmediato sobre la misma lista: debe costar **USD 0** por
   frescura. Si compra otra vez, el pre-check está roto y el flag vuelve a `false`.
5. Inspeccionar las filas persistidas **una por una** sobre una muestra corta: bandas
   coherentes con la calibración publicada, `NULL` donde el proveedor no tiene el dominio, y
   `toxic_share` del snapshot del cliente **sin tocar**.
6. Prender el flag en Vercel y verificar el lane con un binding `internal` + un binding no
   autorizado (debe dar **404**, no 403).
7. Federar la tool y verificar que aparece en el gateway con el guard bidireccional verde.
8. Monitorear `seo_provider_spend_daily` durante dos ciclos semanales: el gasto del screening
   debe ser marginal frente al del snapshot.

### Out-of-band coordination required

- Declarar el flag en `services/ops-worker/deploy.sh` y aplicarlo en vivo en Cloud Run
  (dos pasos, no uno).
- Federación de la tool en el repo `efeonce-mcp` (`pnpm greenhouse:manifest:sync`), fuera de
  este repo.
- Avisar al operador SEO antes de prender: el screening no cambia ningún número existente, pero
  agrega una señal nueva a la priorización y conviene que sepa de dónde salió.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `greenhouse_growth.seo_domain_spam_snapshots` existe con `UNIQUE (normalized_domain, capture_date)`,
      trigger append-only y GRANTs; un `UPDATE` contra ella falla.
- [ ] La tabla **no** tiene `organization_id` en su clave única y `captured_by_organization_id`
      no aparece en ningún DTO expuesto.
- [ ] El carril persiste los tres estados: fila ausente, `spam_score IS NULL` cuando el
      proveedor no tiene el dominio, y `0` cuando el proveedor afirma que está limpio.
- [ ] `shouldScreenReferringDomains` es un predicado puro (sin red, sin DB, sin reloj), está
      testeado y **su test existe antes del código que gasta**.
- [ ] `screenDomainSpamScores` es el **único** escritor de la tabla, llama `postDataForSeoTask`
      con `family: 'backlinks'`, `consumer: 'seo'` y `organizationId`, y pasa por
      `enforceSeoRunEntitlement` con el forecast del conjunto ANTES de la primera llamada.
- [ ] Una corrida sobre una lista cuyos dominios ya están frescos hace **cero** llamadas al
      proveedor y devuelve `providerCostUsd: 0`.
- [ ] Los topes (`SPAM_SCREENING_MAX_TARGETS_PER_RUN`, `SPAM_SCREENING_MAX_REQUESTS_PER_RUN`)
      se aplican y el truncamiento se reporta en el resultado, nunca en silencio.
- [ ] El caso de higiene corre **sólo** sobre dominios referentes de un drill-down `drilled` no
      screeneado; con el perfil estable no hace ninguna llamada.
- [ ] El caso de prospección exige lista explícita de dominios: nunca la infiere del sujeto.
- [ ] `toxic_share` de `seo_backlink_snapshots` no se lee para escribir acá, no se recalcula y
      no se sobrescribe; ninguna tabla de `TASK-1777` se muta.
- [ ] `spam-screening-boundary.test.ts` falla si el carril escribe en otra tabla, y falla si
      aparece la palabra `disavow` en su código.
- [ ] El reader deriva las bandas 0–30 / 31–60 / 61–100 del score, declara lente `◑ estimated`
      con procedencia por campo y distingue `available` de `never_screened` y de
      `screening_disabled`.
- [ ] El lane expone el recurso sólo a bindings `internal` y responde **404** (no 403) a
      cualquier otro.
- [ ] La tool está en `src/mcp/greenhouse/tool-manifest.ts` con sus dos banderas, se regeneró
      el manifiesto y quedó federada en el gateway con el guard bidireccional verde.
- [ ] `GROWTH_SEO_SPAM_SCREENING_ENABLED` está declarado en `services/ops-worker/deploy.sh`,
      aplicado en la revisión activa y registrado en `FEATURE_FLAG_STATE_LEDGER.md` con su runtime.
- [ ] Ninguna familia DataForSEO nueva se agregó al allowlist y ningún endpoint `backlinks`
      distinto de `bulk_spam_score/live` entró en el carril.
- [ ] Existe evidencia de una corrida real acotada con el `cost` del proveedor comparado contra
      el forecast.
- [ ] Las tres capas documentales (arquitectura, funcional, manual de uso) quedaron escritas.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm vitest run src/lib/growth/seo/backlinks`
- `pnpm vitest run src/lib/ai/__tests__/dataforseo-backlinks-rank-scale-guard.test.ts`
- `pnpm mcp:manifest:check`
- `pnpm local:check`
- `pnpm test` (suite completa) + `pnpm build` como gate de cierre, según
  `docs/operations/TASK_CLOSING_QUALITY_GATE_V1.md`
- `pnpm pg:connect:shell` — verificación de tabla, `UNIQUE`, trigger y GRANTs
- Corrida real acotada del command contra el proveedor, con evidencia del `cost` devuelto y de
  la segunda corrida a costo cero

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `## Delta` agregado en `TASK-1777` y `TASK-1304` declarando el hecho nuevo y que sus
      tablas no cambian
- [ ] `.claude/rules/growth-seo.md` y `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` documentan el
      hecho de mercado nuevo y la frontera «diagnosticar ≠ desautorizar»
- [ ] la skill `dataforseo-operator` recibe el estado de runtime del endpoint (as-of), igual
      que lo recibió `TASK-1777`

## Follow-ups

- Resolver `ISSUE-170` antes de cablear el screening al link gap del prospecto.
- Evaluar `bulk_ranks/live` (con `rank_scale: 'one_hundred'` obligatorio) para cruzar autoridad
  con toxicidad en la misma pasada — decisión aparte, con su propio forecast.
- Superficie visible del semáforo de toxicidad: task `ui-ux` propia, si el operador la pide.
- Calibrar `SPAM_SCORE_FRESHNESS_DAYS` con datos reales tras dos ciclos: 90 días es una
  hipótesis conservadora, no una medición.

## Open Questions

- ¿El caso de prospección debe exponerse como disparo manual con capability propia, o alcanza
  con que corra dentro del carril de prospecto? Decide el operador SEO: una capability sin
  superficie que la use es una capability muerta.
- ¿El screening de higiene debe cubrir también los dominios `lost` del drill-down (los que se
  cayeron), o sólo `present`/`new`? Argumento a favor: un dominio tóxico que se cayó explica
  por qué se cayó. Argumento en contra: es gasto sobre algo que ya no enlaza.
