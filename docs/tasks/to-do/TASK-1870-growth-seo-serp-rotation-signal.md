# TASK-1870 — Growth SEO: rotación de URL en el SERP como señal de canibalización sin Search Console

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
- Backend impact: `reader`
- Epic: `EPIC-022`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|seo|data`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Deriva **rotación de URL en el SERP** —cuántas URLs distintas del MISMO dominio ocuparon el mejor puesto
de ese dominio a lo largo de las fechas— leyendo la tabla append-only `greenhouse_growth.seo_serp_top_results`
que `TASK-1699` ya llena a diario y a costo de proveedor **CERO**. Es la única lente de canibalización
disponible cuando **no hay Google Search Console**: competidores y prospectos, donde hoy estamos ciegos.
No compra nada, no persiste nada, no toca el detector GSC de `TASK-1700` y nace declarando su cobertura
real: la serie empieza el **2026-08-29**, así que una ventana de 30 días **todavía no existe**.

## Why This Task Exists

`TASK-1700` construyó el único predicado de canibalización del módulo (`work-queue/cannibalization.ts`) y
lo construyó bien: concentración de share sobre `seo_gsc_daily` + exclusión de marca, calibrado contra
berel.com. Pero **depende de Search Console**, y Search Console sólo existe para el dominio que el cliente
nos conectó. Sobre un competidor o un prospecto no tenemos ni una impresión: el predicado no puede
evaluarse, así que la pregunta «¿este dominio está partiendo su propia autoridad?» hoy no tiene respuesta
para nadie que no sea cliente con GSC conectado.

El dato para responderla **ya está pagado y guardado**. `seo_serp_top_results` no guarda sólo nuestra fila:
guarda TODAS las del SERP con su ranura, su dominio y su URL, una fila por ítem y por día. Eso significa que
para cualquier dominio que aparezca en las keywords que ya capturamos —el nuestro, los competidores
declarados, los candidatos de `competitor-discovery.ts`, un prospecto en evaluación— se puede reconstruir la
serie de qué URL suya ocupó su mejor puesto cada día. La rotación de esa URL a través del tiempo es la señal.

El argumento de por qué la rotación —y no «veo dos páginas mías en el mismo SERP»— es lo que hay que mirar
viene de una skill de terceros (`keyword-cannibalization-detector` de DataForSEO, documentada en
`.claude/skills/seo-aeo/references/competitor-methodologies-2026-09.md` §3): Google aplica **host-crowding**
y normalmente muestra **una sola URL por dominio por SERP**, así que una captura única **sub-detecta** por
construcción. La señal verdadera es que Google va cambiando cuál de tus páginas rankea sin dejar que ninguna
consolide. Ese argumento es del proveedor y **NO está validado con nuestros datos** — esta task lo trata como
punto de partida a calibrar, nunca como estándar (ver `## Detailed Spec` → *Honestidad sobre el método ajeno*).

La deuda que cierra no es «nos falta una métrica». Es que hoy un informe competitivo o un diagnóstico de
prospecto no puede decir nada sobre canibalización del otro lado, y el dato para decirlo lleva desde el
2026-08-29 acumulándose sin que nadie lo lea.

## Goal

- Un predicado puro y **versionado** que, dada la serie de un dominio en una keyword, devuelva
  `rotation_count`, `rotating` y un veredicto, con sus umbrales como constantes exportadas y auditables.
- Un reader canónico que derive esa señal para **cualquier dominio** presente en el top-N persistido —propio,
  competidor o prospecto— sin una sola llamada nueva al proveedor y sin escribir una fila.
- Cobertura **declarada** y degradación honesta: con menos historia que el mínimo declarado el veredicto es
  `insufficient_history`, jamás un juicio fabricado con dos puntos.
- Contrato programático gobernado desde el minuto cero (Full API Parity): lane admin + lane ecosystem
  **sólo-internal con 404 anti-oracle** + tool MCP federada, con la lente `◑ estimated` declarada por campo.
- Frontera explícita con `TASK-1700`: sobre nuestro propio dominio la autoridad sigue siendo GSC (`●` gana
  sobre `◑`); las dos señales conviven y **jamás** se promedian.

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
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` — §4.2 (serie temporal append-only), §7
  (primitives canónicos Full API Parity + el dato competitivo como sólo-internal con 404 anti-oracle), §17.3
  (reglas duras de EPIC-022: nacer extraction-ready), §18 (la cola priorizada y su predicado de canibalización)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/agent-invariants/SQL_DATE_MATH_AGENT_INVARIANTS.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- **CERO llamadas nuevas al proveedor.** Esta capacidad es un reader derivado sobre dato ya comprado. Si una
  iteración propone comprar `dataforseo_labs/google/historical_serps` para «tener más historia», la respuesta
  es **NO**: su V1 ni siquiera devuelve `url` (`docs/research/RESEARCH-011-dataforseo-ai-skills-competitive-review.md`,
  y ya lo consumimos en `rank-history-seed.ts` sólo para posiciones). Comprar historia para esta señal es un
  cambio de naturaleza que exige su propia task, su propio gasto gobernado y su propia autorización.
- **`seo_serp_top_results` es append-only ESTRICTO y acá sólo se LEE.** Trigger
  `trg_seo_serp_top_results_append_only` (`BEFORE UPDATE OR DELETE`, función
  `greenhouse_growth.block_seo_row_mutation()`) + GRANTs de sólo `SELECT, INSERT` a `greenhouse_runtime` y
  `greenhouse_app`. Esta task **no** agrega columnas, **no** agrega tablas y **no** escribe.
- **Boundary SEO ↔ AEO: NUNCA un JOIN entre tablas `seo_*` y `grader_*`.** Ningún cruce nuevo, en ninguna
  dirección, ni siquiera para «enriquecer» el veredicto. Los cruces son por `organization_id` en derived reads.
- **La lente se declara con el módulo canónico, nunca a mano.** Toda cifra nueva sale de
  `resolveSeoLens`/`seoProvenance`/`seoFigure` (`src/lib/growth/seo/lens.ts`). La fuente es
  `dataforseo_serp` → lente `◑ estimated`, **siempre**, aunque la posición observada sea exacta. Un campo
  numérico nuevo sin procedencia declarada **rompe CI** (`__tests__/lens-contract.test.ts`,
  `lens-coverage.test.ts`, `lens-surface-coverage.test.ts`).
- **`◑` y `●` jamás se promedian.** Sobre el dominio propio manda `TASK-1700` (GSC, `●`). Esta señal **no**
  corrige, no pondera y no sustituye ese veredicto; se expone al lado, con su lente, y el consumidor ve las dos.
- **Ventanas temporales con `DATE ± int`.** `capture_date >= CURRENT_DATE - $n::int`; **jamás**
  `EXTRACT(EPOCH FROM (date - date))` (gate `TASK-893`). Y si algún orden nuevo ordena por texto o pagina por
  keyset, aplican los invariantes de `TASK-1700` sobre alias que secuestran el `ORDER BY` y collation
  (`COLLATE "C"`).
- **Ausencia ≠ cero.** `rotation_count` sin historia suficiente es `null` + `insufficient_history`, nunca `0`
  ni `false`. Mismo invariante que `SeoFigureShape.magnitude`.
- **Extraction-ready (§17.3).** Ninguna FK nueva fuera del ancla org; ningún import desde otro dominio de
  Greenhouse salvo primitives transversales; los consumers entran por el reader canónico o el lane ecosystem,
  nunca por SQL directo.

## Normative Docs

- `.claude/skills/seo-aeo/references/competitor-methodologies-2026-09.md` §3 — el método ajeno completo
  (host-crowding, `rotation_count`, la matriz de veredicto, `DEEP_POS 40`, bandas 30/20, el override de intent
  por tipo de página y la economía). Leer **también** su §3.6, que dice explícitamente que la tabla de CTR del
  proveedor **no es nuestra curva** (infla el dinero en riesgo ~6×).
- `docs/tasks/complete/TASK-1699-growth-seo-persist-serp-top-n-already-paid.md` — el productor del dato.
- `docs/tasks/complete/TASK-1700-growth-seo-prioritized-work-queue-aggregate.md` — el detector GSC vigente y
  su Delta `incremental-clicks-v2`, que documenta por qué un predicado de canibalización mal calibrado le dice
  al operador «fusiona 41 URLs» sobre la query de mayor demanda del sitio.
- `docs/tasks/complete/TASK-1662-growth-seo-keyword-gap-discovery.md` — la autoría de competidor y el
  precedente de **derivar al leer en vez de persistir** (`readKeywordGap`).
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`

## Dependencies & Impact

### Depends on

- `greenhouse_growth.seo_serp_top_results` (`migrations/20260828124352232_task-1699-seo-serp-top-results.sql`)
  — productor del dato, **VIVO en producción desde el 2026-08-28**, día 1 de la serie **2026-08-29**.
- `src/lib/growth/seo/serp-top-results.ts` — parser y writer de esa tabla (contrato de shape de fila).
- `src/lib/growth/seo/competitor-discovery.ts` — `readSerpTopResults` / `readSerpCompetitorCandidates`:
  patrón de lectura, umbrales versionados y gating de entitlement a copiar.
- `src/lib/growth/seo/lens.ts` — `resolveSeoLens`, `seoProvenance`, `seoFigure`, `resolveSeoAsOf`.
- `src/lib/growth/seo/entitlement.ts` — `resolveSeoEntitlement`; capability existente
  `growth.seo.observation.read`.
- `src/lib/growth/seo/flags.ts` — `isSeoModuleEnabled` (`GROWTH_SEO_ENABLED`) y
  `isSeoSerpTopResultsEnabled` (`GROWTH_SEO_SERP_TOP_RESULTS_ENABLED`, dual-runtime).
- `src/lib/api-platform/resources/ecosystem-growth-seo.ts` — `requireInternalSeoBinding` (el 404 anti-oracle real).
- `src/mcp/greenhouse/tool-manifest.ts` — SSOT de tools; una tool definida sin entrada en el manifest
  (o una entrada sin definición) **falla la construcción del servidor**.

### Blocks / Impacts

- `TASK-1700` — **NO se modifica.** Recibe un `## Delta` que registra que existe una segunda lente de
  canibalización, de naturaleza `◑`, que no participa de su score ni de su orden. Alimentar la cola con esta
  señal exigiría un `WORK_QUEUE_ORIGINS` nuevo, y ese vocabulario es cerrado: ampliarlo es una migración
  (§18.5), no un string en TS. Queda como follow-up, fuera de esta task.
- `TASK-1809` (`to-do`, share of voice competitivo por keyword set) — comparte sujeto (dominio ajeno) y fuente
  (top-N ya persistido). Recibe `## Delta`: la rotación es evidencia **derivada a costo cero** que existe antes
  de que se compre `serp_competitors`, y `TASK-1809` debe declarar en su Discovery si su captura pagada aporta
  algo que esta señal no dé ya.
- `TASK-1662` — sin cambios de contrato. La rotación se convierte en una señal más de evidencia para el
  *propose* de competidores, pero **no** declara competidores ni toca `declareCompetitors`.
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §7 + §18 — Delta documental al cerrar.
- `docs/documentation/growth/` y `docs/manual-de-uso/` — capa funcional + manual del operador.

### Files owned

- `src/lib/growth/seo/serp-rotation.ts`
- `src/lib/growth/seo/serp-rotation-versions.ts`
- `src/lib/growth/seo/serp-rotation-reader.ts`
- `src/lib/growth/seo/__tests__/serp-rotation.test.ts`
- `src/lib/growth/seo/__tests__/serp-rotation-reader.test.ts`
- `src/app/api/admin/growth/seo/serp-rotation/route.ts`
- `src/app/api/platform/ecosystem/growth/seo/serp-rotation/route.ts`
- `src/lib/api-platform/resources/ecosystem-growth-seo.ts` (extensión: payload builder + route key)
- `src/lib/growth/seo/lens-surface-manifest.ts` (extensión: entrada ruta ↔ tool)
- `src/mcp/greenhouse/tool-manifest.ts` · `src/mcp/greenhouse/server.ts` · `src/mcp/greenhouse/tools.ts` ·
  `src/mcp/greenhouse/http-client.ts` (extensión: `get_seo_serp_rotation`)
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` (Delta)
- `docs/documentation/growth/rotacion-serp-canibalizacion-sin-search-console.md`
- `docs/manual-de-uso/growth/leer-rotacion-serp.md`

## Current Repo State

### Already exists

- `greenhouse_growth.seo_serp_top_results` con `(seo_target_id, keyword, engine, device, capture_date,
  rank_absolute, rank_group, item_type, result_domain, result_url, result_title, is_own_domain, source_run_id,
  captured_at)`, UNIQUE `seo_serp_top_results_slot_unique`, índices
  `seo_serp_top_results_target_date_idx (seo_target_id, capture_date DESC)` y
  `seo_serp_top_results_domain_idx (seo_target_id, result_domain, capture_date DESC)` — el segundo es
  **exactamente** el índice que esta señal necesita.
- Escritura viva y diaria desde el 2026-08-28, en la misma transacción que el snapshot de rank
  (`rank-capture-serp-top-wiring.test.ts`). Serie desde el 2026-08-29.
- `readSerpCompetitorCandidates` con el patrón entero a reusar: umbrales versionados exportados
  (`SERP_COMPETITOR_DISCOVERY_WINDOW_DAYS` 30 / `..._MIN_KEYWORDS` 3 / `..._MIN_DAYS` 5), filtro
  `item_type = 'organic'`, exclusión de `is_own_domain`, resolución de org por target, gate de entitlement,
  `captureWithDomain` y un `errorCode` cerrado.
- `PRIORITY_SCORE_CONFIGS` (`work-queue/score-versions.ts`) como forma canónica de config versionada:
  `Record` **append-only** (se agregan entradas, nunca se editan), `ACTIVE_*_VERSION`, `get*Config(version)`
  y `fingerprint*Config` determinista.
- El detector GSC completo en `work-queue/cannibalization.ts` — con su calibración medida contra berel.com,
  su predicado de marca con tolerancia a un error de tipeo y su `SEO_COMPETING_PAGE_CTE`.
- Lanes gemelos ya construidos para el dato competitivo: admin (`requireInternalTenantContext` + `can(...)` +
  `canonicalErrorResponse`) y ecosystem (`requireInternalSeoBinding` → 404 `not_found` anti-oracle).
- Señal de reliability `seo.serp_top_results.coverage`
  (`src/lib/reliability/queries/seo-serp-top-results-coverage.ts`) — un día con snapshot y sin top-N es
  pérdida irrecuperable.

### Gap

- **Nadie lee la dimensión temporal de la tabla por dominio.** `readSerpCompetitorCandidates` agrupa por
  `result_domain` para contar recurrencia, pero **descarta la URL**: nunca pregunta *qué* URL de ese dominio
  ocupó el puesto, que es justamente la variable de esta señal.
- No existe ningún predicado de canibalización aplicable a un dominio **sin** GSC. El único que hay
  (`evaluateCannibalization`) toma `mainPageImpressions`/`totalImpressions`, que sólo salen de `seo_gsc_daily`.
- La normalización de URL fusionable existe **sólo dentro del SQL de GSC** (`SEO_COMPETING_PAGE_CTE`: corta
  query-string y fragment, pela protocolo y `www`, colapsa barra final, excluye home y assets). Sobre
  `result_url` no hay nada equivalente, y sin ella `…/p/a?utm=x` y `…/p/a` cuentan como dos páginas.
- Ningún consumidor —API, MCP, Nexa— puede preguntar «¿este dominio rota sus URLs?» hoy.
- La cobertura real de la serie **no se expone en ninguna parte**: un consumidor que pida 30 días recibiría
  13 sin enterarse.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/growth/seo/serp-rotation*.ts`, leído desde Vercel (lanes admin + ecosystem, tool MCP).
  El ops-worker no participa: esta capacidad no escribe ni gasta.
- Future candidate home: `domain-package`
- Boundary: reader canónico `readSerpUrlRotation` + predicado puro `evaluateSerpRotation` con su config
  versionada. Consumers autorizados: lane admin, lane ecosystem (sólo bindings internal), tool MCP federada y
  Nexa vía ese lane. Ningún consumer consulta `seo_serp_top_results` por SQL propio. Nota Wave: la capacidad
  viaja con el dominio SEO cuando se extraiga a `wave.efeonce.org`.
- Server/browser split: PostgreSQL, entitlements y resolución de org son server-only (`import 'server-only'`
  en el reader). El predicado es un módulo PURO sin dependencias de runtime, igual que `lens.ts`, para poder
  testearse y compartirse. El browser recibe un DTO con cobertura, procedencia y `capturedAt` ya resueltos.
- Build impact: none. Sin SDK nuevo, sin filesystem input, sin entrypoint global; sólo SQL de lectura sobre un
  índice que ya existe.
- Extraction blocker: PostgreSQL compartido y el runtime de entitlements per-org impiden despliegue
  independiente inmediato; la FK al ancla org sigue siendo el único acople deliberado.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader`
- Source of truth afectado: `greenhouse_growth.seo_serp_top_results` (sólo lectura); la interpretación vive en
  la config versionada `serp-rotation-v1`, que es SSOT de los umbrales.
- Consumidores afectados: API admin, lane ecosystem (sólo bindings internal), tool MCP federada, Nexa.
- Runtime target: `production` (Vercel). El ops-worker no se toca.

### Contract surface

- Contrato existente a respetar: `src/lib/growth/seo/lens.ts` (`SeoProvenance`/`SeoFigure`),
  `src/lib/api-platform/resources/ecosystem-growth-seo.ts` (`requireInternalSeoBinding`),
  `src/mcp/greenhouse/tool-manifest.ts`, `src/lib/growth/seo/lens-surface-manifest.ts`,
  `src/lib/api/canonical-error-response.ts`.
- Contrato nuevo o modificado: reader `readSerpUrlRotation`; predicado `evaluateSerpRotation`; rutas
  `GET /api/admin/growth/seo/serp-rotation` y `GET /api/platform/ecosystem/growth/seo/serp-rotation`;
  tool MCP `get_seo_serp_rotation`.
- Backward compatibility: `compatible` — todo es aditivo; ningún contrato vigente cambia de forma. El único
  cambio sobre archivos existentes son entradas nuevas en manifiestos (manifest MCP, lens-surface, route keys).
- Full API parity: la capability nace con su contrato gobernado. La regla vive en `src/lib/growth/seo/**`
  (predicado + reader), **no** en un route handler ni en un componente; los cuatro consumers (admin, ecosystem,
  MCP, Nexa) consumen el MISMO primitive. Es una capacidad **read-only**: no hay write, así que no hay loop
  `propose → confirm → execute` que construir. Cuando la rotación se use como evidencia para *proponer* un
  competidor, el *execute* sigue siendo el `declareCompetitors` existente de `TASK-1662`.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.seo_serp_top_results` (SELECT),
  `greenhouse_growth.seo_targets` (SELECT, resolución de org). **Ninguna tabla nueva, ninguna migración.**
- Invariantes que no se pueden romper:
  - La tabla es **append-only estricta** y esta task sólo la lee: cero INSERT, cero UPDATE, cero DELETE.
  - **La señal se DERIVA al leer, nunca se persiste.** Persistirla la congela y envejece sin señal — mismo
    razonamiento por el que `readKeywordGap` no persiste el gap (`TASK-1662`).
  - `rotation_count` cuenta URLs **distintas tras normalizar** que ocuparon el **mejor puesto del dominio** en
    cada fecha; `rotating = rotation_count >= 2`. Una URL que aparece en el SERP pero nunca es la mejor del
    dominio **no** suma rotación (sí entra al inventario de páginas).
  - Sólo `item_type = 'organic'`. Una cita en PAA, un video o un local pack no son la URL que rankea.
  - El **mejor puesto** se resuelve por `COALESCE(rank_group, rank_absolute)` mínimo dentro de
    `(dominio, keyword, capture_date)`, coherente con `competitor-discovery.ts`.
  - Normalización de URL a `host + path`: se cortan query-string y fragment, se pela protocolo (case-insensitive)
    y `www`, se colapsa la barra final. **Orden importa** — es la misma secuencia que `SEO_COMPETING_PAGE_CTE`
    ya acertó; invertirla hace que `dominio.com/?utm=x` no se reconozca como home.
  - **Ausencia ≠ cero:** sin historia suficiente, `rotationCount` es `null` y el veredicto
    `insufficient_history`. Jamás `0`, jamás `harmless overlap` por falta de datos.
  - **La cobertura se declara siempre**, se haya alcanzado o no la ventana pedida: `windowRequestedDays`,
    `windowEffectiveDays`, `snapshotsObserved`, `firstCaptureDate`, `lastCaptureDate`.
  - Lente `◑ estimated` con fuente `dataforseo_serp` en **todas** las cifras del DTO. No existe `lens: 'mixed'`.
  - **Ningún JOIN a `grader_*`** ni a ningún schema fuera de `greenhouse_growth`.
- Write-target allowlist: `N/A` — la task no escribe en ninguna tabla. Sin destino de escritura no hay
  frontera de escritura que declarar.
- Tenant/space boundary: el `seoTargetId` resuelve `organization_id` vía `greenhouse_growth.seo_targets`
  (patrón `loadTargetOrganization`); sobre esa org se evalúa `resolveSeoEntitlement`. En el lane ecosystem,
  además, `requireInternalSeoBinding` exige binding `internal` **sin** `organizationId` y devuelve **404**
  `not_found` (anti-oracle) a cualquier otro scope: el dato competitivo **NUNCA** es client-facing (§7).
- Idempotency/concurrency: read-only y puro; la misma entrada produce la misma salida. Sin transacción, sin
  lock, sin retry. La única variable en el tiempo es qué días existen en la tabla, y eso se declara en
  `coverage`.
- Audit/outbox/history: **ninguno, y es deliberado** — mismo argumento que `TASK-1699`: la tabla ES el
  histórico y la señal se consulta a demanda. Un outbox aquí emitiría un evento por cada lectura.

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `read-only`, gateado por los flags ya vigentes `GROWTH_SEO_ENABLED` +
  `GROWTH_SEO_SERP_TOP_RESULTS_ENABLED` (ambos **ya ON** en Vercel `Production`). **No se declara un flag
  nuevo**: el flag existente gobierna exactamente el dato que esta capacidad lee, y un flag por reader
  multiplica estado sin agregar control. Si el revisor prefiere cutover propio, se declara antes de Slice 3 y
  se registra la fila en `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` en el MISMO PR.
- Backfill plan: `N/A` — no hay dato que rellenar. La historia es la que hay y **no se puede fabricar**: el
  SERP del 2026-08-28 no se recompra. La cobertura crece sola, un día por día.
- Rollback path: revert del PR. Sin migración que revertir, sin estado que reparar, sin fila escrita.
- External coordination: `N/A` — repo-only, sin secrets, sin env vars nuevas, sin provider config. Si se
  agrega la tool MCP, el gateway `mcp.efeonce.org` debe recargar su superficie federada (procedimiento
  existente `TASK-1843`), que es despliegue, no coordinación humana externa.

### Security and access

- Auth/access gate: admin → `requireInternalTenantContext` + `can(subject, 'growth.seo.observation.read', …)`
  (capability **existente**, ya grantada; esta task **no** crea capability nueva, así que no aplica el gate
  de grant coverage de `TASK-873/935`). Ecosystem → token de lane + `requireInternalSeoBinding`.
  Ambos, además, `resolveSeoEntitlement` sobre la org del target.
- Sensitive data posture: sin PII. El contenido es competitivo y **confidencial hacia el cliente**: revela qué
  sabemos de sus competidores y cómo lo medimos. Por eso el lane es sólo-internal con 404 anti-oracle y no 403.
- Error contract: `canonicalErrorResponse` en el lane admin con el `ERROR_CODE_MAP` del dominio; `errorCode`
  cerrado en el reader (`disabled | target_not_found | no_entitlement | query_failed`);
  `captureWithDomain(error, 'growth', …)` para observabilidad — **nunca** `Sentry.captureException` directo ni
  detalle técnico en el cuerpo de respuesta.
- Abuse/rate-limit posture: hereda el del lane. La query es un SELECT agregado sobre un índice existente
  (`seo_serp_top_results_domain_idx`) con ventana acotada y tope de filas declarado (`truncated`/`hasMore`),
  igual que `readSerpTopResults`.

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/growth/seo` (incluye los dos test files nuevos y **debe** dejar verdes
  `serp-top-results.test.ts`, `competitor-discovery.test.ts`, `lens-contract.test.ts`, `lens-coverage.test.ts`,
  `lens-surface-coverage.test.ts`), `pnpm vitest run src/lib/api-platform/resources/ecosystem-growth-seo.test.ts`,
  `pnpm mcp:manifest:check`, `pnpm local:check`.
- DB/runtime checks: script sanity contra PG real vía `pnpm pg:connect` sobre un target con serie viva
  (`seot-berel-mx`), comparando el resultado del reader con un conteo manual de URLs distintas por dominio y
  fecha. **Read-only puro**: la tabla no acepta mutación, así que no hay residuo posible.
- Integration checks: canary del lane ecosystem contra **producción** con token consumer y binding internal
  (`externalScopeType`/`externalScopeId` o responde 400), verificando `ok:true` — no `disabled`; y el caso
  negativo: binding org-scoped → **404**, no 403, no 200.
- Reliability signals/logs: se reusa `seo.serp_top_results.coverage` como ancla de frescura del insumo. **No
  se agrega señal nueva**: un reader derivado sin escritura no tiene estado que pueda quedar rancio por sí
  mismo; lo que puede quedar rancio es el insumo, y esa señal ya existe. Errores del reader por
  `captureWithDomain` con `tags.source = 'seo_serp_rotation_reader'`.
- Production verification sequence: ver `### Production verification sequence` en Zone 3.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] No hay tabla nueva: el allowlist de destinos de escritura del dominio queda intacto y la task lo declara
      explícitamente en vez de dejarlo implícito.
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

### Slice 1 — Predicado puro + config versionada

- `src/lib/growth/seo/serp-rotation-versions.ts`: `SerpRotationConfig` + `SERP_ROTATION_CONFIGS` como
  `Record` **append-only** (`as const satisfies`), `ACTIVE_SERP_ROTATION_VERSION = 'serp-rotation-v1'`,
  `getSerpRotationConfig(version?)` y `fingerprintSerpRotationConfig(config)` determinista. Espejo exacto
  del patrón de `work-queue/score-versions.ts`.
- Cada umbral del método ajeno entra como campo de la config y **cada uno lleva su comentario de
  procedencia**: de dónde salió, que **no está calibrado con nuestros datos**, y qué mediría una calibración.
- `src/lib/growth/seo/serp-rotation.ts` (módulo PURO, sin `server-only`): `normalizeSerpUrl`,
  `evaluateSerpRotation(input, config)` y los tipos del veredicto.
- `src/lib/growth/seo/__tests__/serp-rotation.test.ts`: rotación con 1/2/N URLs; el caso «aparece pero nunca
  es la mejor»; variantes de URL que deben colapsar (`http`/`https`, `www`, barra final, `?utm=`, `#ancla`);
  `insufficient_history` con menos snapshots que el mínimo; ausencia devolviendo `null` y no `0`; y un test de
  **fingerprint congelado** por versión, que rompe si alguien edita `serp-rotation-v1` en vez de agregar `v2`.

### Slice 2 — Reader canónico sobre la tabla append-only

- `src/lib/growth/seo/serp-rotation-reader.ts` con `import 'server-only'`: `readSerpUrlRotation(seoTargetId,
  options)`. Options: `domain?` (uno, varios, o ausente = todos los del top-N), `keyword?`, `from?`/`to?`,
  `windowDays?`, `includeOwnDomain?` (default `true` — a diferencia de `competitor-discovery`, acá el dominio
  propio **sí** interesa, aunque sobre él mande GSC), `version?`, `limit?`, `env?`.
- Un solo SELECT agregado que apoya en `seo_serp_top_results_domain_idx`, resuelve el mejor puesto por
  `(dominio, keyword, capture_date)` y devuelve la serie; la normalización de URL y el veredicto se aplican en
  TS con el predicado puro de Slice 1 — SQL trae hechos, TS juzga.
- DTO con `coverage` declarada, `provenance: SeoProvenance[]` (fuente `dataforseo_serp`, sección por campo),
  `asOf` vía `resolveSeoAsOf`, `truncated` explícito y `errorCode` cerrado. Gate de flags + entitlement +
  `captureWithDomain` copiando `competitor-discovery.ts`.
- `src/lib/growth/seo/__tests__/serp-rotation-reader.test.ts`: gating (`disabled`, `target_not_found`,
  `no_entitlement`), cobertura declarada cuando la ventana pedida excede la serie, `insufficient_history`
  propagado, y cobertura de procedencia por campo.

### Slice 3 — Lanes gobernados + tool MCP federada

- `GET /api/admin/growth/seo/serp-rotation` con `requireInternalTenantContext` + `can(...,
  'growth.seo.observation.read', ...)` + `canonicalErrorResponse`.
- `GET /api/platform/ecosystem/growth/seo/serp-rotation` vía `runEcosystemReadRoute`, con payload builder
  `getEcosystemSeoSerpRotationPayload` detrás de `requireInternalSeoBinding` (404 anti-oracle) y route key
  `platform.ecosystem.growth.seo.serp_rotation`.
- Tool MCP `get_seo_serp_rotation`: entrada en `tool-manifest.ts` (`domain: 'seo'`, `writes: false`,
  `spendsProviderBudget: false`) **+** definición en `server.ts` **+** handler en `tools.ts` **+** llamada en
  `http-client.ts`. Las cuatro piezas o el servidor no construye. La descripción declara, en su prosa: dato
  competitivo **sólo-internal, jamás client-facing**; lente `◑`; y que sobre el dominio propio la autoridad es
  Search Console.
- Entrada nueva en `lens-surface-manifest.ts` mapeando ruta ↔ tool con su procedencia.

### Slice 4 — Evidencia runtime y registro de calibración

- Script sanity contra PG real (patrón `_sanity-task-1662-keyword-gap.ts`) sobre un target con serie viva:
  comparar el veredicto del reader con el conteo manual, y **reportar la cobertura real del día en que se
  corre** (cuántos snapshots existen de verdad).
- Canary del lane ecosystem contra producción: caso positivo (binding internal → `ok:true`) y caso negativo
  (binding org-scoped → **404**).
- `docs/audits/seo/SERP_ROTATION_CALIBRATION_<fecha>.md`: la primera medición real de la señal sobre los
  dominios que ya tenemos, con la distribución de `rotation_count` observada y una recomendación explícita de
  si los umbrales heredados sirven, se ajustan o se descartan. Ese documento es lo que convierte `v1` de
  «heredado» en «medido», y es el insumo de un eventual `serp-rotation-v2`.
- Triple documentación: Delta en la arquitectura (§7 + §18), doc funcional y manual de uso.

## Out of Scope

- **Comprar historia.** Nada de `historical_serps` (su V1 no devuelve `url`), nada de SERP adicionales, nada
  de aumentar `depth`. Cualquier llamada nueva al proveedor es otra task, con su gasto gobernado.
- **La economía del método ajeno** (`clicks_at_risk`, `value_at_risk`, `priority_score`, max-normalización,
  piso `0.15`). Requiere la curva de CTR propia del sitio; la tabla del proveedor infla el dinero en riesgo
  ~6× (§3.6). Y para nuestro propio dominio esa priorización **ya existe** en `TASK-1700`. Follow-up.
- **Modificar `work-queue/cannibalization.ts` o el score de la cola.** El detector GSC no se toca, no se
  pondera y no se «mejora» con esta señal.
- **Agregar un `WORK_QUEUE_ORIGINS` nuevo.** Vocabulario cerrado: ampliarlo es una migración (§18.5).
- **Declarar competidores.** El *execute* sigue siendo `declareCompetitors` con confirmación humana.
- **Cualquier UI.** Sin ruta visible, sin componente, sin GVC.
- **El override de intención por tipo de página** (§3.5) y la clasificación commercial/informational. Depende
  de una etiqueta de intent que el reader no tiene y de heurísticas de slug sin validar. Follow-up separado.
- **Persistir la señal, materializarla o emitir outbox.** Se deriva al leer, siempre.
- **Retención o archivo de `seo_serp_top_results`.** Sigue sin política, con el disparador ya declarado por
  `TASK-1699` (5M filas o 500 ms). Esta task agrega una query de lectura que debe medirse contra ese umbral,
  no cambiar la política.

## Detailed Spec

### La señal, en una frase

Para un `(dominio, keyword)` y una ventana de fechas: por cada fecha se toma la URL de ese dominio con el
mejor puesto orgánico; `rotation_count` es cuántas URLs **distintas tras normalizar** aparecen en esa
secuencia. `rotating = rotation_count >= 2`.

Dos URLs alternándose en el puesto alto están partiendo la autoridad **ahora**. Una sola URL sosteniendo su
puesto, aunque el dominio tenga diez páginas más abajo, no es una pelea: es un ganador estable con cola.

### Por qué el mejor puesto del dominio y no todas sus páginas

Por **host-crowding**: Google normalmente muestra una sola URL por dominio por SERP. Contar «páginas del
dominio vistas en el SERP» reproduce el defecto que `TASK-1700` ya corrigió en su `incremental-clicks-v2`
—contar páginas confunde marca con canibalización— y además sub-detecta, porque el SERP casi nunca muestra
dos. La secuencia temporal del **ganador** es la variable que sí se mueve.

Las demás páginas del dominio no se descartan: entran al inventario del DTO (`pages[]` con su mejor posición
observada) porque la recomendación tiene que poder **nombrar las páginas específicas con su posición**. Pero
no suman rotación.

### Honestidad sobre el método ajeno (obligatoria, no opcional)

El método viene de `keyword-cannibalization-detector` de DataForSEO. **Ninguna de sus constantes está
validada contra nuestros datos.** La task las adopta como punto de partida declarado y las trata como
hipótesis a calibrar:

| Constante ajena | Valor heredado | Qué falta para que sea nuestra |
|---|---|---|
| `DEEP_POS` | 40 | Medir si bajo esa posición nuestras keywords todavía producen clics en nuestros mercados |
| `BAND.COMMERCIAL` / `BAND.INFORMATIONAL` | 30 / 20 | Requiere la etiqueta de intent, que este reader no tiene → fuera de V1 |
| `SOFT_INTENT` + override por tipo de página | 0.80 | Fuera de V1 (ver Out of Scope) |
| `severity` (1.0 / 0.55 / 0.10) | del proveedor | Sólo importa si se computa la economía → fuera de V1 |
| `CTR_TABLE` | 28,1 % en pos. 1 | **Se descarta.** Nuestras dos mediciones propias dan 4,25 % / 4,72 % |

Por eso V1 reduce la matriz a lo que el dato **hoy** soporta: `rotation_count`, `rotating`, `bestPosition`,
el corte de profundidad, y `insufficient_history`. Las bandas por intención quedan declaradas en la config
como campos presentes **y desactivados**, para que un `v2` las encienda sin reescribir el predicado.

🔴 Regla de escritura para el agente que implemente: **cada número heredado lleva su comentario diciendo que
es heredado.** Un umbral sin procedencia, dentro de seis meses, se lee como un estándar medido.

### La cobertura, que es el corazón de la honestidad de esta señal

La serie empieza el **2026-08-29** (día 1, `TASK-1699` en producción desde el 2026-08-28). Al **2026-09-11**
hay ~13 días. **Una ventana de 30 días no existe todavía**, y `SERP_COMPETITOR_DISCOVERY_WINDOW_DAYS = 30` es
el default de su vecino: copiarlo sin más produciría un reader que dice «30 días» y mide 13.

El reader devuelve **siempre**:

```
coverage: {
  windowRequestedDays,     // lo que el caller pidió
  windowEffectiveDays,     // lo que la serie realmente cubre
  snapshotsObserved,       // fechas distintas con al menos una fila del dominio
  firstCaptureDate,        // null si no hay ninguna
  lastCaptureDate,
  sufficient               // snapshotsObserved >= minSnapshots de la config
}
```

Y cuando `sufficient` es falso, el veredicto es `insufficient_history` — **no** `harmless overlap`, que es un
juicio, y no `rotating: false`, que es una afirmación. `rotationCount` es `null`. Un `false` con dos puntos de
serie le dice al operador «este dominio está sano» cuando lo honesto es «todavía no puedo saberlo».

`minSnapshots` de `serp-rotation-v1` se declara en la config, y su valor inicial debe elegirse **midiendo**
en Slice 4, no en el diseño. La razón está en §3.1 del método: una sola captura sub-detecta por construcción,
así que el mínimo tiene que ser lo bastante alto para que la ausencia de rotación signifique algo.

### Forma del veredicto (V1)

```
insufficient_history   // snapshots < minSnapshots  → rotationCount null
single_page            // el dominio sólo tuvo una URL en toda la serie
too_deep               // bestPosition > deepPosition → no hay clics que pelear
rotating               // rotation_count >= 2 y bestPosition <= deepPosition
stable_winner          // una URL sostiene el puesto; hay más páginas pero no rotan
```

Cada veredicto es un corte **absoluto**, nunca un sumando: es la misma disciplina que `TASK-1700` aplica a su
banda y que la skill `seo-aeo` exige para hallazgos de crawler.

### La query (forma, no literal)

Un SELECT sobre `seo_serp_top_results` filtrando `item_type = 'organic'`, `result_domain IS NOT NULL` y la
ventana con `capture_date >= CURRENT_DATE - $n::int` (**DATE ± int**; jamás `EXTRACT(EPOCH …)`, gate
`TASK-893`), que por `(result_domain, keyword, capture_date)` devuelve la fila de menor
`COALESCE(rank_group, rank_absolute)` junto a su `result_url`. Se apoya en
`seo_serp_top_results_domain_idx (seo_target_id, result_domain, capture_date DESC)`.

⚠️ Si el resultado se ordena o pagina, aplican los dos invariantes de orden de `TASK-1700`: **nunca** aliasear
una expresión con el nombre de la columna por la que se ordena (el `ORDER BY` resuelve nombres de SALIDA
primero y termina ordenando texto, en silencio), y si hay keyset, forzar bytes con `COLLATE "C"` a ambos lados.

La normalización de URL y el veredicto se aplican en TS: el SQL trae hechos, el predicado juzga, y el
predicado es testeable sin base de datos.

### Frontera con el detector de `TASK-1700` (la regla que no se negocia)

| | `TASK-1700` (vigente) | `TASK-1870` (esta) |
|---|---|---|
| Fuente | `seo_gsc_daily` | `seo_serp_top_results` |
| Lente | `●` measured | `◑` estimated |
| Sujeto | sólo dominios con GSC conectado | **cualquier** dominio del top-N |
| Señal | concentración de share + exclusión de marca | rotación de la URL ganadora |
| Ordena trabajo | **sí** — es la autoridad de orden | **no** |

Sobre el dominio propio, con GSC disponible, **manda `TASK-1700`**. Esta señal es complemento para lo que GSC
no ve. Los dos veredictos pueden exponerse juntos, cada uno con su lente; **jamás se promedian, jamás se
combinan en un score único, y esta señal jamás sobreescribe al detector medido.**

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (predicado puro + config versionada) → Slice 2 (reader) → Slice 3 (lanes + MCP) → Slice 4 (evidencia
  + calibración).
- **Slice 1 DEBE cerrar antes que Slice 2.** Si el reader nace con el juicio embebido en SQL, el predicado deja
  de ser testeable sin base y los umbrales dejan de ser auditables — es exactamente el defecto que
  `TASK-1700` documenta cuando un predicado vive partido entre SQL y TS y las dos copias se separan en silencio.
- **Slice 3 NO puede empezar sin el `coverage` de Slice 2 completo.** Publicar un lane que sirva veredictos
  sin declarar cobertura expone una afirmación que el dato no sostiene, y un consumidor agéntico la leerá como
  hecho.
- Slice 4 es cierre obligatorio, no opcional: sin la medición real, `serp-rotation-v1` sigue siendo un
  conjunto de constantes ajenas con nuestro nombre encima.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un consumidor lee `rotating: false` sobre 3 días de serie y concluye «sano» | API / MCP / Nexa | high | `insufficient_history` como veredicto de primera clase + `coverage` obligatorio en el DTO + `rotationCount: null` en vez de `0` | Revisión del DTO en el canary de Slice 4; el test de reader exige el campo |
| Los umbrales heredados (DEEP_POS 40) no aplican a nuestros mercados es-LATAM | Calidad del veredicto | medium | Config versionada append-only + documento de calibración obligatorio en Slice 4 + cada constante comentada como heredada | Distribución de `rotation_count` en el informe de calibración |
| La señal `◑` se mezcla con el detector `●` de la cola | Orden del trabajo SEO | medium | Prohibición explícita en Architecture Alignment; la señal no emite `priority_score`; no se agrega `WORK_QUEUE_ORIGINS` | `lens-contract.test.ts` / `lens-coverage.test.ts` rompen si una cifra queda sin procedencia |
| El dato competitivo se filtra a un binding de cliente | Lane ecosystem / confidencialidad | low | `requireInternalSeoBinding` → 404 anti-oracle (no 403); test de lane con binding org-scoped; prosa explícita en la tool MCP | Caso negativo del canary: binding org-scoped debe dar 404 |
| La query agregada degrada al crecer la tabla | PostgreSQL (Vercel pool) | low | Usa `seo_serp_top_results_domain_idx` ya existente; ventana acotada; tope declarado en `truncated` | Disparador de retención ya declarado por `TASK-1699` (5M filas o 500 ms); medir en Slice 4 |
| Alguien edita `serp-rotation-v1` en vez de agregar `v2` | Comparabilidad histórica | medium | `SERP_ROTATION_CONFIGS` append-only + test de fingerprint congelado por versión | El test de fingerprint falla en CI |
| Tool MCP declarada sin entrada en el manifest (o al revés) | Superficie MCP | low | El servidor **no construye** si falta cualquiera de las dos; `pnpm mcp:manifest:check` como gate | Falla de construcción del servidor MCP en CI |
| La escritura del insumo se apaga y la señal envejece en silencio | ops-worker | low | Señal existente `seo.serp_top_results.coverage`; `coverage.lastCaptureDate` en el DTO deja el envejecimiento visible al consumidor | `seo.serp_top_results.coverage` |

### Feature flags / cutover

**Sin flag nuevo — additive, read-only, sin escritura ni gasto.** La capacidad queda gobernada por los dos
flags ya vigentes y ya ON en Vercel `Production`:

- `GROWTH_SEO_ENABLED` — kill switch del módulo.
- `GROWTH_SEO_SERP_TOP_RESULTS_ENABLED` — gatea exactamente el dato que esta capacidad lee (dual-runtime:
  ops-worker escribe, Vercel lee). Si está OFF, el reader devuelve `errorCode: 'disabled'` sin tocar la base.

Razón de no agregar uno: un flag por reader multiplica estado de rollout sin agregar control — el interruptor
que importa (¿existe el dato?) ya existe, y el de arriba ya apaga todo. ⚠️ Si durante la implementación se
decide igual declarar `GROWTH_SEO_SERP_ROTATION_ENABLED`, entonces es obligatorio: fila en
`docs/operations/FEATURE_FLAG_STATE_LEDGER.md` **en el mismo PR** (el gate `pnpm docs:closure-check` corre
`feature-flags-audit --strict` y falla si falta) y mapear dónde se LEE con
`grep -rn "<FLAG>" src/ services/` antes de prenderlo — lo async vive en el ops-worker, no en Vercel.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 — predicado + config | `git revert` del PR. Módulos nuevos sin consumers; nada los importa todavía. | < 5 min | sí |
| Slice 2 — reader | `git revert`. Read-only, sin fila escrita, sin estado que reparar. | < 5 min | sí |
| Slice 3 — lanes + MCP | `git revert` + redeploy Vercel; recarga de superficie del gateway MCP para retirar la tool. Alternativa inmediata sin deploy: `GROWTH_SEO_SERP_TOP_RESULTS_ENABLED=false` deja el reader en `disabled` — ⚠️ pero **también apaga la escritura diaria en el ops-worker y cada día apagado pierde el top-N de ese día para siempre**, así que sólo se usa si el problema es del dato, nunca para apagar este reader. | < 15 min | sí |
| Slice 4 — evidencia + docs | `git revert` de los docs. Sin efecto de runtime. | < 5 min | sí |

### Production verification sequence

1. `pnpm vitest run src/lib/growth/seo` verde, **incluidos** los tests vecinos de `TASK-1699`/`TASK-1662` y
   los tres de lente. Un rojo ahí es regresión, no «test ajeno».
2. `pnpm vitest run src/lib/api-platform/resources/ecosystem-growth-seo.test.ts` + `pnpm mcp:manifest:check`
   + `pnpm local:check` verdes.
3. Sanity contra PG real (`pnpm pg:connect`) sobre un target con serie viva: el veredicto del reader coincide
   con el conteo manual de URLs distintas por dominio y fecha, y la `coverage` reportada coincide con los días
   que la tabla realmente tiene. Read-only; sin residuo posible.
4. Deploy a `Production` por el release control plane (`greenhouse-production-release`). Antes del dispatch,
   verificar que no haya otro release en vuelo (`gh run list --workflow production-release.yml`).
5. Canary del lane ecosystem contra producción, **ambos casos**: binding internal con `organizationId` →
   `ok:true` (no `disabled`); binding org-scoped → **404**, no 403 y no 200.
6. Tool MCP `get_seo_serp_rotation` respondiendo desde `mcp.efeonce.org` tras la recarga de superficie del
   gateway, con la versión del servidor verificada contra la revisión activa.
7. Correr la calibración de Slice 4 y publicar `docs/audits/seo/SERP_ROTATION_CALIBRATION_<fecha>.md` con la
   cobertura real del día en que se corrió.

### Out-of-band coordination required

`N/A — repo-only change.` Sin secrets, sin env vars nuevas, sin configuración de proveedor, sin cambios en
Azure/HubSpot/Notion/GCP. La única acción fuera del código es la recarga de la superficie federada del gateway
MCP (`mcp.efeonce.org`) para que la tool nueva cruce, que es despliegue por el procedimiento existente y no
coordinación humana externa.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `evaluateSerpRotation` es un módulo **puro** (sin `server-only`, sin acceso a base) y se testea sin PostgreSQL.
- [ ] `SERP_ROTATION_CONFIGS` existe como `Record` append-only con `ACTIVE_SERP_ROTATION_VERSION`,
      `getSerpRotationConfig` y `fingerprintSerpRotationConfig`, y un test congela el fingerprint de
      `serp-rotation-v1` (editar la versión rompe CI en vez de mover veredictos históricos en silencio).
- [ ] Cada constante heredada del método ajeno lleva, en el código, un comentario que declara su origen y que
      **no está calibrada** con nuestros datos.
- [ ] `rotation_count` cuenta URLs distintas **tras normalizar** que ocuparon el **mejor puesto orgánico del
      dominio** por fecha; `rotating = rotation_count >= 2`; una URL que nunca fue la mejor **no** suma rotación.
- [ ] La normalización colapsa `http`/`https`, con y sin `www`, barra final, query-string y fragment — con un
      test por cada variante.
- [ ] Con menos snapshots que el mínimo de la config, el veredicto es `insufficient_history` y `rotationCount`
      es `null` (**nunca** `0`, **nunca** `rotating: false`).
- [ ] El DTO devuelve **siempre** `coverage` con `windowRequestedDays`, `windowEffectiveDays`,
      `snapshotsObserved`, `firstCaptureDate`, `lastCaptureDate` y `sufficient`, existan o no datos.
- [ ] Toda cifra del DTO tiene procedencia derivada de `seoProvenance`/`seoFigure` con fuente
      `dataforseo_serp` y lente `estimated`; `lens-contract.test.ts`, `lens-coverage.test.ts` y
      `lens-surface-coverage.test.ts` quedan verdes.
- [ ] El reader funciona sobre **cualquier** dominio del top-N —propio, competidor declarado, candidato o
      prospecto— sin requerir Search Console.
- [ ] Cero llamadas nuevas al proveedor: el diff no toca `buildSerpTask`, no agrega familias al allowlist de
      DataForSEO y no registra gasto.
- [ ] Cero escrituras: el diff no contiene `INSERT`/`UPDATE`/`DELETE` sobre `greenhouse_growth.*`, ni
      migración nueva, ni tabla nueva.
- [ ] Cero JOIN entre tablas `seo_*` y `grader_*`.
- [ ] `work-queue/cannibalization.ts`, `priority-score.ts` y `score-versions.ts` quedan **sin modificar**, y
      `pnpm vitest run src/lib/growth/seo/work-queue` sigue verde.
- [ ] El lane ecosystem responde `ok:true` a un binding internal y **404** (no 403, no 200) a un binding
      org-scoped, con test que lo fija.
- [ ] La tool MCP `get_seo_serp_rotation` tiene entrada en `tool-manifest.ts`, definición en `server.ts`,
      handler en `tools.ts`, llamada en `http-client.ts` y entrada en `lens-surface-manifest.ts`;
      `pnpm mcp:manifest:check` verde.
- [ ] La task **no** crea capability nueva: usa `growth.seo.observation.read` ya grantada, y lo declara.
- [ ] Existe evidencia de una corrida real contra PostgreSQL de producción, con la cobertura observada del día
      registrada en `docs/audits/seo/SERP_ROTATION_CALIBRATION_<fecha>.md`.
- [ ] Las tres capas documentales quedan cerradas: Delta de arquitectura (§7 + §18), doc funcional y manual de uso.
- [ ] `TASK-1700` y `TASK-1809` reciben su `## Delta` con fecha.

## Verification

- `pnpm vitest run src/lib/growth/seo`
- `pnpm vitest run src/lib/growth/seo/work-queue` (no-regresión del detector GSC)
- `pnpm vitest run src/lib/api-platform/resources/ecosystem-growth-seo.test.ts`
- `pnpm mcp:manifest:check`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm local:check`
- `pnpm test` (suite completa) + `pnpm build` como gate final antes de mover a `complete/`
- Sanity contra PG real vía `pnpm pg:connect` (read-only)
- Canary del lane ecosystem contra producción: caso positivo (internal → `ok:true`) y negativo (org-scoped → 404)

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `TASK-1700` recibió `## Delta` declarando que existe una segunda lente de canibalización `◑` que **no**
      participa de su score ni de su orden
- [ ] `TASK-1809` recibió `## Delta` declarando qué evidencia de rotación existe ya a costo cero antes de
      comprar `serp_competitors`
- [ ] `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` registró la capacidad en §7 y la frontera
      con el detector GSC en §18
- [ ] `EPIC-022` registró la task en su programa con su estado real

## Follow-ups

- **Economía de la canibalización sin GSC** (`clicks_at_risk` / `value_at_risk`) usando la **curva de CTR
  propia del sitio**, nunca la tabla del proveedor. Sólo tiene sentido después de la calibración de Slice 4.
- **Intención efectiva y override por tipo de página** (§3.5 del método ajeno): permitiría encender las bandas
  30/20 que `serp-rotation-v1` deja declaradas y desactivadas. Exige una fuente de intent y heurísticas de
  tipo de página validadas.
- **Origen nuevo en la cola** (`WORK_QUEUE_ORIGINS`) para que la rotación proponga trabajo sobre dominios sin
  GSC. Es una migración de vocabulario cerrado (§18.5) y una decisión de orden, no una extensión de reader.
- **Recomendación accionable por combinación de tipos de página** (§3.7: «don't default to merge+301»), que
  nombra las páginas específicas con su posición en vez de un genérico.
- **Rotación como factor de evidencia en el *propose* de competidores** (`competitor-discovery.ts`): un
  dominio que rota fuerte en nuestras keywords es una señal distinta de uno que sostiene una URL.
- **Política de retención de `seo_serp_top_results`**: esta task agrega un lector agregado más; medir su
  latencia contra el disparador ya declarado por `TASK-1699` (5M filas o 500 ms).

## Open Questions

- **`minSnapshots` de `serp-rotation-v1` no se puede elegir en el diseño.** Debe salir de medir en Slice 4
  cuántos días de serie hacen que «no roté» signifique algo, dado que una sola captura sub-detecta por
  construcción. Hasta entonces se implementa como campo de la config con un valor conservador y explícitamente
  provisional.
- **¿La ventana por defecto acompaña a la serie o se fija en 30 días?** Copiar
  `SERP_COMPETITOR_DISCOVERY_WINDOW_DAYS = 30` sin más produce un reader que dice 30 y mide 13. Propuesta:
  default 30 con `windowEffectiveDays` declarado, que es honesto y no cambia cuando la serie madure; el riesgo
  es que un consumidor lea el 30 y no el efectivo. Resolver en Plan Mode.
- **¿El dominio propio entra por defecto?** Propuesta: `includeOwnDomain: true`, porque el valor de comparar
  las dos lentes sobre el mismo sujeto es real — con la prohibición dura de promediarlas ya escrita. Confirmar
  con el owner del módulo.
