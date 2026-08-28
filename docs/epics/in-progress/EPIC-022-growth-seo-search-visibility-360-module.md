# EPIC-022 — Growth SEO Module (Search Visibility 360)

## Status

- Lifecycle: `in-progress`
- Priority: `P2`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `En producción — 27 hijas complete (conteo verificado 2026-08-28), 7 crons activos`
- Rank: `TBD`
- Domain: `cross-domain`
- Owner: `Julio Reyes`

> **Corrección de estado 2026-08-26.** Este epic declaraba `Lifecycle: to-do`, `Status real: Diseño`
> y `Owner: unassigned` mientras **siete crons suyos corren en producción** (`ops-seo-rank-capture`,
> `gsc-snapshot`, `audit-enqueue`, `audit-collect`, `backlink-capture`, `keyword-market-data`,
> `keyword-discovery-drain`, declarados en `services/ops-worker/deploy.sh`) y 21 tasks hijas están
> `complete`. Un epic «en diseño» con dinero corriendo a diario en DataForSEO es la peor forma de
> drift documental: cualquiera que lo lea para decidir prioridades parte de un mapa falso.
> Origen: `docs/audits/platform/2026-08-26-openseo-competitive-teardown-growth-seo-aeo.md` §7.5.
- Branch: `epic/EPIC-022-growth-seo-search-visibility-360-module`
- GitHub Issue: `none`

## Summary

Construye el **módulo SEO de Greenhouse** dentro del dominio `growth`, hermano y complementario del **AEO Grader** (`growth.ai_visibility`). Es el lado clásico de la búsqueda — Google orgánico: rank tracking, keyword research, site audit técnico y backlinks — apalancando **DataForSEO** (ya integrado) y **Google Search Console per-org** (ya conectado, TASK-1282). Los dos motores se envuelven en una sola narrativa: **"Search Visibility 360"** — el único panel donde un cliente ve los dos internets de búsqueda (Google orgánico + motores de IA) con la misma identidad de org, el mismo evidence ledger gobernado y el mismo modelo de entitlement. La feature ancla es el **seguimiento de rendimiento y evolución de URLs/keywords en el tiempo**.

## Why This Epic Exists

Hoy Greenhouse mide si las IA te citan (AEO grader) pero **no** mide si rankeas en Google clásico ni cómo evoluciona esa visibilidad. Es media película: el CMO cliente pregunta "¿estamos ganando o perdiendo visibilidad en búsqueda?" y solo respondemos la mitad IA. El SEO no cabe en una sola task porque cruza schema nuevo (serie temporal), gobernanza de un provider pago (DataForSEO por-request), materialización recurrente (crons + reactive), entitlements per-org, readers/commands canónicos, y múltiples superficies (operador, cliente, report artifact). Es un programa multi-task con boundary duro contra el AEO y contra Payroll/Finance. La coordinación (orden de dependencias, gate de costo, boundary SEO↔AEO, secuencia backend-data → ui-ux) vive a nivel epic; la implementación real vive en las tasks hijas.

## Outcome

- Un dominio `growth.seo` con serie temporal append-only (rank/audit/backlinks) que responde "¿cómo rinde este set de URLs/keywords y cómo evoluciona?" — incluyendo la materialización que hoy le falta a GSC.
- DataForSEO ampliado de forma gobernada (allowlist cerrado de familias serp/labs/onpage/backlinks/domain) con cost-tracking y circuit breaker por familia, sin debilitar el candado actual.
- Entitlements `growth.seo.*` per-org (vía `module_assignments`, no por rol) con las 4 puertas (público/contratado/trial/operador), consistente con el modelo AEO.
- Superficies operador + cliente + report artifact que reusan el mismo primitive (Full API Parity), más el cross-link "Search Visibility 360" (SEO ↔ AEO).
- Un camino comercial: interno-first en Grupo Berel → puerta contratada → lead magnet foto.

## Architecture Alignment

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — el motor hermano (AEO); boundary + patrones de dominio `growth`.
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md` — integración per-cliente (el token ES el scope) + outbox/reactive.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — read/write como primitive gobernado.
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md` — capability + grant + module_assignments per-org.
- `docs/architecture/GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md` — PostgreSQL first (ventana caliente) + BigQuery (historia).
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` — reliability signals de los paths async.

## Child Tasks

> **Barrido de `Blocked by` — 2026-08-08.** Los siete blockers que las hijas citaban (`TASK-1299`,
> `1303`, `1304`, `1305`, `1306`, `1307`, `1267`) **están todos completos**, pero nadie actualizó los
> campos al cerrarlos. El backlog se leía como bloqueado sin estarlo: cualquiera que lo mirara
> concluía que había que esperar algo. Corregidos en `1309`, `1311`, `1312`, `1313`, `1314`, `1315`
> y `1651`, más cuatro rutas que apuntaban a `to-do/`/`in-progress/` de tasks ya movidas a
> `complete/` (un link roto en Normative Docs deja al agente sin poder leer su referencia).
>
> Estado real: **de las 15 abiertas, 11 se pueden tomar ya**; las 4 restantes esperan sólo a otras
> abiertas (`1313`←1311+1312 · `1314`←1312+1313 · `1316`←1315 · `1317`←1315+1316), más `1660`←1659
> del carril de objetivos. `TASK-1310` (dashboard cliente) ya está **in-progress**.
>
> **Actualización 2026-08-13:** `TASK-1661` quedó **complete** y con eso `1662` y `1664` dejaron de
> estar bloqueadas (`Blocked by: none` en ambas).
>
> **Actualización 2026-08-14:** `TASK-1659` quedó **complete**, así que `1660` (lente Objetivos)
> también queda `Blocked by: none`. Con eso el carril de objetivos ya no espera backend: sólo falta
> su superficie.
>
> ⚠️ Al cerrar una task, revisar quién la citaba como blocker. Un `Blocked by` obsoleto es fricción
> inventada, y no hay gate que lo detecte.


- `TASK-1299` — schema `growth.seo` (targets, keyword_sets, competitors, snapshots append-only) — bloqueador fundacional.
- `TASK-1300` — DataForSEO family registry (ampliar allowlist + breaker + cost por familia) — bloquea todo lo provider-facing.
- `TASK-1301` — capabilities `growth.seo.*` + entitlement per-org + chokepoint `enforceSeoRunEntitlement`.
- `TASK-1302` — [planificada] GSC daily snapshot materializer + `readKeywordOpportunities` (quick win, reusa TASK-1282).
- `TASK-1303` — [**complete 2026-08-06**, en producción] rank capture command + `readRankEvolution` + Cloud Scheduler + reactive BQ mirror. Release `fcee5ab9f7ce` (manifest released); scheduler `ops-seo-rank-capture` diario 05:00 CLT ACTIVO; serie día-1 de Berel con 31 keywords; señal `seo.rank.capture_lag` en Growth Health; 4.ª MCP tool `get_seo_rank_evolution` viva en el MCP interno de producción (federación al gateway = TASK-1653).
- `TASK-1304` — [planificada] site audit (queue+poll OnPage) + backlink snapshot.

### Carril de keywords OBJETIVO (creado 2026-08-07 al cuestionar TASK-1308)

> 🔴 **El módulo responde TRES preguntas, no una.** Hasta ahora sólo tenía superficie la primera.
>
> | Pregunta | Fuente | Estado |
> |---|---|---|
> | ¿Qué empujo de lo que ya tengo? | GSC medido | **construida** (TASK-1308) |
> | ¿Dónde quiere estar el cliente? | **declarado por humano** | `TASK-1659` (**complete 2026-08-14**, el eje ya existe en el command) + `TASK-1660` (superficie) |
> | ¿Qué me pierdo entero? | competencia + Labs | `TASK-1661` + `TASK-1662` |
>
> La segunda es la que ancla comercialmente a las otras dos, porque es el compromiso con el cliente
> y el material del QBR. Y **Search Console es estructuralmente ciego** a las dos últimas: sin top
> ~100 no hay impresiones, así que esas búsquedas no existen en los datos del cliente. Por eso el
> dato de mercado deja de ser "enriquecimiento" y pasa a ser dependencia dura del carril
> aspiracional: es la única forma de contestar *¿vale la pena?* y *¿cuánto cuesta?* antes de
> aceptar un objetivo.

- `TASK-1659` — [**complete 2026-08-14**, backend-data] modelo de **intención** en el set monitoreado: objetivo declarado vs oportunidad detectada, con autoría. `source` (TASK-1308) es procedencia, no intención. Append-only: cambiar la intención cierra y abre, nunca `UPDATE` — outcome propio `intent_changed`, que **no consume cupo** del techo. `intent` (`target` | `opportunity`) **sin default**: quien no declara escribe `NULL` y no existe un tercer valor "desconocido"; `intentDeclaredBy` separa a quien asumió el compromiso de quien ejecutó el INSERT. Migración `20260814221022082`. Parity en las 3 lanes (app · ecosystem · MCP `track_seo_keywords`) con vocabulario validado en cada frontera; **sin capability, scope ni flags nuevos**. **Desbloquea `1660`.**
- `TASK-1660` — [planificada, ui-ux] lente **Objetivos** sobre `/admin/growth/seo/keywords` — extiende el **nodo S3** del master UI flow. Full API Parity al revés: `trackKeywords` **ya** acepta keywords que el cliente no rankea y no tiene botón, y desde `TASK-1659` acepta además la **intención declarada**. **`Blocked by: none`** desde el cierre de `TASK-1659` (2026-08-14).
- `TASK-1661` — [**complete 2026-08-13**, backend-data] volumen y **barrera de enlaces** por keyword. Trae el dato de mercado desde DataForSEO Labs (`keyword_overview`) a la tabla append-only `seo_keyword_market_data`, con país, idioma y `captured_at` en la clave; `readKeywordOpportunities` deja de cablear `market: 'unavailable'` y la tabla de `TASK-1308` muestra las columnas **sin cambio de código en la UI**. Captura **mensual** (el proveedor refresca una vez al mes), acotada al set monitoreado, con dry-run de costo previo. Costo real medido: **USD ~0.02/org/mes**. Tool MCP `get_seo_keyword_market_data` + federación al gateway en el mismo cierre. **Desbloquea `1660`/`1662`/`1664`.**
- `TASK-1662` — [planificada, backend-data] **keyword gap**: qué gana la competencia donde el cliente es invisible. La superficie va aparte. **`Blocked by: none`** desde el cierre de `TASK-1661` (2026-08-13). Escribe en la **misma** tabla de mercado — es multi-productor por diseño, nunca un segundo almacén.

### Carril de discovery y acción diaria (creado 2026-08-08)

> Este carril cierra el loop operativo que faltaba entre una hipótesis humana y una medición AEO. No
> reemplaza el carril de objetivos ni convierte una sugerencia en gasto recurrente automáticamente.
> Cada etapa conserva procedencia, mercado, costo, estado y autoría de la decisión.

- `TASK-1664` — [creada, backend-data/integration, backend-critical] **keyword discovery, seed
  expansion y enrichment de mercado**. Recibe hasta 10 seeds manuales o derivadas de GSC/set/dominio,
  ejecuta sólo endpoints Labs permitidos (`keyword_suggestions`, `related_keywords`, `keyword_ideas`,
  `keywords_for_site`, `keyword_overview`), muestra preview de costo antes de gastar, materializa una
  corrida bounded en `ops-worker`, deduplica y expone candidates con volumen/dificultad/intent,
  procedencia y as-of. No crea `seo_keyword_set_members`, no hace keyword gap (`1662`) y no llama
  `ai_optimization` (`1651`). **`Blocked by: none`** desde el cierre de `TASK-1661` (2026-08-13);
  **in-progress** desde entonces. Escribe en la **misma** tabla de mercado que `1661` y `1662`.
- `TASK-1666` — [creada, backend-data/integration, backend-critical] **puente SEO → grounded queries
  AEO**. Toma hasta 20 candidates seleccionados, valida ownership y contexto, y crea un draft en el
  `grader_prompt_sets` existente mediante el authoring AEO canónico. Conserva source refs de corrida y
  candidate, trata keywords como datos no confiables, respeta no-leading/vocabulario cerrado y nunca
  aprueba, activa ni ejecuta el grader en la misma operación. Blocked by `TASK-1664`.
- `TASK-1665` — [creada, ui-ux] **workbench diario Descubrir** dentro de la ruta existente
  `/admin/growth/seo/keywords`. Es la tercera lente de S3: builder de seeds/métodos/mercado, preview y
  confirmación de costo, estados async, tabla responsive y drawer de decisión. Expone explícitamente
  `Declarar objetivo`, `Seguir oportunidad`, `Preparar grounded queries`, `Descartar` y `Ver
  trayectoria`, con confirmación, outcome por candidato y sin provider logic en UI. Blocked by
  `TASK-1664` y `TASK-1666`.
- `TASK-1667` — [creada, backend-data/integration, backend-critical] **SEO Editorial Work Item y
  handoff a Content Factory**. Convierte una decisión explícita sobre candidate/oportunidad en un
  aggregate editorial con provenance, evidence refs, `ContentFactoryBrief.v1`, idempotencia y
  lifecycle `brief_ready → draft_requested → draft_private`. Reutiliza planners/validators/bridge
  existentes, no escribe WordPress desde SEO, no publica, no auto-trackea y no crea FK SEO↔AEO.
  Blocked by `TASK-1664`; la grounded query de `TASK-1666` es referencia opcional.
- `TASK-1668` — [creada, backend-data/integration, backend-critical] **QA editorial, publicación
  observada, outcomes e iteración**. Conecta draft privado con QA determinista/humano, approval packet,
  `published_unverified`, readback/QA live, ventanas de GSC/rank/AEO/GA4/HubSpot y
  `insufficient_data` honesto. Registra evidencia/outcomes append-only y abre la siguiente acción sin
  auto-publish ni atribución causal inventada. Blocked by `TASK-1667`.
- `TASK-1669` — [creada, backend-data/integration, backend-critical] **agentes e IA para el plan
  diario SEO**. Orquesta `seo_researcher`, `editorial_planner` y `qa_measurement` sobre los readers
  canónicos; devuelve recomendaciones estructuradas con refs, freshness, costo, fallback y
  `requiresHumanApproval=true`; expone el mismo primitive a Nexa/app/ecosystem/MCP. No llama
  DataForSEO/WordPress/AEO directamente ni ejecuta writes. Blocked by `TASK-1664`, `TASK-1667` y
  `TASK-1668`.

### Plataforma del módulo

- `TASK-1655` — [en curso] Historical Data Platform del módulo SEO (semilla histórica de rank vía `historical_serps`).
- `TASK-1677` — [**complete**, backend-data] Cierre de la fase **contract** del cutover `seo_v1 → seo_v2`; la ventana expand/contract dejó de estar abierta. Se lista acá para cerrar el denominador del epic (lo declaraba en su campo `Epic:` y no figuraba en esta lista).
- `TASK-1690` — [creada 2026-08-13, backend-data] **La superficie cliente sirve a la POBLACIÓN, no al tenant con historia.** La página decide si hay datos con GSC y calcula el KPI principal con rank snapshots: una organización con Search Console conectado y captura de rank sin correr —el día 1 de todo cliente nuevo— ve el KPI en "sin dato" con el Quadrant poblado debajo. Invisible hasta hoy porque la superficie tiene UNA organización cliente y tiene ambas fuentes. Expone la cobertura por fuente en el contrato + familia de fixtures por estado + guard anti-reincidencia. Sin migración. Sale del cierre de `TASK-1310`.
- `TASK-1691` — [creada 2026-08-13, ui-ux] **Declarar la lente estimada y su fecha de captura en la tabla de oportunidades.** Cierra `ISSUE-154`: cuando `market === 'available'` la pantalla renderiza Volumen y Barrera de enlaces **sin leyenda de origen y sin `capturedAt`** — la nota `● Medido · Search Console` sólo aparece en el caso `'unavailable'`. El §8 del master flow pide leyenda persistente y as-of explícito para lo estimado; el as-of ya viaja en el contrato programático, sólo falta la superficie.
- `TASK-1658` — [**code complete 2026-08-27, rollout pendiente**, backend-data] drift de federación MCP + punto ciego del guard de paridad: el drift había crecido de 3 a 8 tools mientras esperaba. Ejecutada: guard de paridad **bidireccional** en el gateway (espejo `GREENHOUSE_SEO_TOOL_INVENTORY` + paridad de schema + annotations, probado ROJO contra el drift real: 29 findings) + federación de las 8 (inventario 21 = 16 lecturas + 5 escrituras; `run_seo_prospect_diagnostic` como 4.º write bajo `efeonce.mcp.seo.write`, fail-closed hasta TASK-1631) + cierre de 9 divergencias de schema vivas (`intent` de TASK-1659 y `market` en 5 lecturas, entre otras) + canary de las 21. 4 commits locales en `efeonce-mcp` sin push; deploy del gateway post-release develop→main (`tools/list` 13→21). El espejo es interino hasta `TASK-1780`.

- `TASK-1305` — [planificada] `readSeoAeoGap` derived read cross-módulo (report layer).
- `TASK-1306` — [**complete 2026-08-06**, ui-ux] SEO Overview operador `/admin/growth/seo` — **la primera superficie visible del módulo (nodo S1 del master UI flow)**. Guard de 3 puertas (viewCode `administracion.growth_seo` + capability `growth.seo.observation.read` + `module_assignment` per-org), sección local "Search Visibility" con el conmutador a las hermanas, 4 KPIs norte (posición con semántica invertida), curva de visibilidad en 2 charts apilados y sidebar salud/movers/cruce AEO que degrada por región. MCP tool `get_seo_overview_kpis` + lane `/api/platform/ecosystem/growth/seo/overview-kpis` en el mismo PR. **Code complete en `develop`; promoción a `main` pendiente** (mientras viva sólo en `develop`, `syncViewRegistry` de producción vuelve a apagar el viewCode recién sembrado).
- `TASK-1307` — [**complete 2026-08-07**, ui-ux] ★ Rank & URL performance over time `/admin/growth/seo/performance` — nodo S2, la pantalla ancla. Comparación de hasta 8 URLs o keywords con eje de posición invertido declarado en palabras, cobertura explícita ("N de M días con medición"), huecos que cortan la línea en vez de rellenarse con cero, y la fuente nombrada (◑ exacta de mercado vs ● medida de Search Console, nunca promediadas). Primer consumer de **ECharts** del repo — la decisión de librería del módulo. Su tab quedó habilitada; la spec vive en `docs/tasks/complete/`.
- `TASK-1308` — [**complete 2026-08-07**, ui-ux + command] Keyword opportunities `/admin/growth/seo/keywords` — **nodo S3 del master UI flow**. Nació declarada `Backend impact: none` y terminó construyendo el command que la spec daba por hecho: **`trackKeywords` no existía** (`seo_keyword_sets`/`_members` sólo las escribían dos scripts de seed), y su reverso `untrackKeywords` tampoco. Seguir una keyword es un **compromiso de gasto diferido** —el rank capture diario paga al proveedor por cada keyword vigente, todos los días— así que el command nace con techo gobernado por target (`capacity_exceeded` explícito, nunca silencio), entitlement per-org y **outcome por keyword**, que es lo único que distingue "agregué 3" de "rebotaron 40 contra el techo". La UI: banda de veredicto que es leyenda y filtro a la vez, mapa **medido** (posición × impresiones; el encoding del wireframe —dificultad × volumen × intención— no tiene fuente y no la tendrá: el dato de mercado será columna y filtro, nunca eje), tabla con `DataTableShell` + transformación a cards en 390px, export CSV del subconjunto filtrado, filtros en la URL y drill a Rendimiento. Lane `app` + lane `ecosystem` + 2 tools MCP (`track_seo_keywords`/`untrack_seo_keywords`) en el mismo PR con **scope propio de escritura** `efeonce.mcp.seo.write` — un binding cliente lee sus oportunidades pero no hace crecer su propia factura. **Pendiente de rollout, no de código:** el scope existe en Entra pero no está cableado a ningún cliente y el commit de federación del gateway sigue sin publicar → las 2 tools responden `insufficient_scope` (fail-closed por diseño).
- `TASK-1309` — [**COMPLETE 2026-08-08**, ui-ux] Site audit `/admin/growth/seo/audit` — **nodo S4**, la cuarta tab: con ella el conmutador de "Search Visibility" queda completo. Salud con frescura explícita, issues como **lista priorizada** (no tabla plana) ordenada por severidad ▸ alcance × valor de búsqueda ÷ esfuerzo, drill `?issueGroup=` con las URLs, y "Correr auditoría" gobernada. Tres correcciones de honestidad que salieron de mirar la pantalla: el conteo de páginas declara cuándo es **el techo del crawl** y no el sitio; los checks de performance declaran que son **laboratorio** (Google rankea con campo); y el puntaje explica su alcance, porque "95 de salud" junto a "519 issues" se lee como contradicción cuando en realidad no miden lo mismo (el puntaje es del proveedor, el conteo es de nuestro catálogo). **Cerrada 2026-08-08**: el gap de viewCodes de TASK-1310 lo cerró su migración de catálogo, y el gate completo quedó verde — `pnpm test` 10377/0, `pnpm build` de producción, `ui:quality` PASS 4.63, reachability 0 huérfanas. **Con ella el conmutador de Search Visibility queda completo: las 4 tabs del operador navegan.**
- `TASK-1670` — [creada 2026-08-08, backend-data/integration] **Hallazgos de sitio en el audit: crawlers de IA, JSON-LD y sitemap.** El audit es passthrough de OnPage y no ve tres cosas de Capa 1. Los tres probes ya existen probados en el grader (`TASK-1266`), pero **no se mueven**: la primera versión de la task proponía extraer el sustrato y la medición la desmintió — `contracts`/`safe-fetch`/`html` los consumen **23 archivos** del probe layer, así que mover era re-apuntar la fundación de un motor con 643 tests a cambio de ubicación. En su lugar AEO declara una **superficie pública** (un archivo nuevo, cero ediciones) y el collect la consume como hallazgos de **sitio**, detrás de flag. Cierra el punto ciego más caro: hoy un sitio que bloquea `OAI-SearchBot`/`PerplexityBot`/`ClaudeBot` puntúa 95/100 y se presenta como sano (−23,1% de tráfico medido, Rutgers/Wharton dic-2025). Prerequisito del entregable descargable de la auditoría: un artefacto con nuestro nombre no debe declarar sano un sitio invisible para la IA. Fuera de alcance `core_web_vitals` (Lighthouse = laboratorio) y `llms-txt` (ROI marginal). Follow-up sin fecha y sin task: si algún día se reorganiza, el hogar del sustrato compartido es el paraguas **`search-visibility/`** —SEO y AEO como sus dos motores— no un genérico; merece su propio ADR. *(Superado por `TASK-1697`, 2026-08-27: el sustrato SÍ se extrajo — `git mv` de `safe-fetch`/`html`/`contracts` a `src/lib/growth/site-substrate/` con re-export shims, ningún consumer AEO cambió y `probes/**` quedó privado tras la rule `greenhouse/growth-substrate-boundary`. Esta task quedó desbloqueada y consume el barrel `@/lib/growth/site-substrate` — ver los Deltas 2026-08-15/27 en su spec.)*
- `TASK-1672` — [creada 2026-08-08, ui-ux/layout] **Artefacto de la auditoría técnica (web + print).** El diagnóstico deja de morir en la pantalla. El escenario real no es que el cliente arregle: **reenvía a una agencia**, seamos nosotros u otra — y eso define dos lectores, quien DECIDE (magnitud y urgencia) y quien EJECUTA (la lista y el orden). Se resuelve con **un documento de dos densidades**, no con dos documentos que se desincronizan: portada ejecutiva de una plana + detalle completo, reusando `ReportArtifactModel` de TASK-1310 con su `variant`. Los hallazgos de SITIO van antes que la lista porque la invalidan. Y la procedencia viaja CON el dato: en pantalla es contexto, en un PDF reenviado es lo único que impide que atribuyan a nuestro juicio lo que mide el proveedor. Client-safe por construcción. Blocked by `TASK-1670`.
- `TASK-1673` — [creada 2026-08-08, backend-data/command] **Compartir y enviar el informe.** Enlace con código corto, caducidad, **revocación** y tracking de apertura, más envío por correo del operador. **Enlace por defecto, adjunto como opción declarada**: el repo ya divide adjunto para registros inmutables (cotización, comprobante) y enlace para diagnósticos vivos (informe AEO), y el audit tiene contrato de frescura que un PDF congela — queda vigente para siempre en un inbox ajeno. 🔴 El cliente NO envía desde nuestro dominio: genera y reenvía desde su inbox, que llega mejor a su agencia y no arriesga la reputación de envío con la que mandamos facturas. Enviar ≠ ver. Blocked by `TASK-1672`.
- **`TASK-1674` [RESERVADA, sin escribir] — la 4.ª sección del portal cliente.** El cliente ya tiene su navegador de 3 secciones (`Resumen · Evolución · Quadrant`, TASK-1310) y la auditoría entra ahí como **cuarta**, espejando las 4 tabs del operador: la misma estructura mental de los dos lados, con distinta profundidad. Se descartó una ruta cliente paralela (`/growth/seo/audit-report`) — sería fragmentar su portal para reflejar nuestro organigrama. Y se descartó **fusionar** la auditoría dentro del informe de 1310, por dos costos concretos: las frescuras no coinciden (el audit corre semanal, la serie de Search Console diaria, y un documento con dos as-of deshace justo lo que 1309 corrigió) y reenviar la lista técnica a una agencia obligaría a compartir de paso la posición competitiva del cliente, que ese trabajo no necesita. **NO se agrega a TASK-1310**: a esa task le queda rollout (migración + staging), no construcción, y una sección nueva le reinicia la verificación en la última milla. Se escribe cuando `TASK-1672` esté en ejecución y la forma del documento esté decidida.
- `TASK-1310` — [**COMPLETE 2026-08-12**, ui-ux] Cliente + Report Artifact `/growth/seo` + quadrant 360 — **nodos S5/S6/S7**. Navegador cliente de 3 secciones (`Resumen · Evolución · Quadrant`), informe web + `?print=1` sobre el `ReportArtifactModel` compartido, y el cruce recíproco SEO↔AEO. **Con ella la pata UI/Nexa del exit criterion de parity queda cerrada: el módulo tiene sus dos caras, operador y cliente.** El cierre desmintió su propio scorecard —estaba en BLOCK 2.29 juzgando capturas de 9 horas antes del commit que ejecutó los lotes premium— y verificó las 3 superficies × 2 viewports con **sesión de cliente real de la organización contratada**: `qualityFindings` vacío en todas y los 4 gates UI en verde (`ui:quality` PASS 4.52). Dos defectos corregidos en el camino, ambos invisibles para los gates y visibles al mirar el frame: el informe web anunciaba "Aún no hay una posición media para leer" con la posición impresa al lado, y el FAB global "volver arriba" no tenía nombre accesible (`button-name` *critical*, en TODAS las rutas del portal). `UI ready: yes`. Promoción `develop → main` pendiente.
- `TASK-1311` — [planificada, backend-data] AEO citation attribution URL-level + grounded queries (reader/rollup sobre las citas que el grader YA captura).
- `TASK-1312` — [planificada, backend-data] Topic Cluster como entidad de primera clase (`seo_topic_clusters`) + rollup SEO+AEO.
- `TASK-1313` — [planificada, backend-data] Unified Page/Cluster Visibility 360 read (`readPageVisibility360`/`readClusterVisibility360`).
- `TASK-1314` — [planificada, backend-data] Pillar-cluster health / topical authority (score + huecos; compone rank/audit/citation, no captura nueva).
- `TASK-1315` — [planificada, backend-data] E-E-A-T signal extraction (entity + author + trust) — capa de autor + probes de trust, reusando entity probes (KG/Wikidata/Reddit) + json-ld.
- `TASK-1316` — [planificada, backend-data] E-E-A-T rater (rúbrica 4 pilares, YMYL-aware) — assessment LLM reusando brand-intelligence + evals/accuracy, con confianza calibrada (anti falso-0).
- `TASK-1317` — [planificada, backend-data] E-E-A-T scorecard reader + integración (`readEeatScorecard`; alimenta topical authority 1314 + el 360; medido vs evaluado).
- `TASK-1645` — [**complete 2026-08-06**, backend-data] **Ecosystem lane + MCP tools** (`/api/platform/ecosystem/growth/seo/*` vía `runEcosystemReadRoute` + 3 tools read-only en `src/mcp/greenhouse/**`, espejo TASK-1086). Materializa el mandato parity+MCP (delta 2026-08-05). **LIVE en producción** con `GROWTH_SEO_ENABLED` ON en Vercel Production.
- `TASK-1647` — [**complete 2026-08-06**, backend-data/integration] **Federación del provider Greenhouse-SEO en el gateway MCP** (`mcp.efeonce.org`, skill `efeonce-mcp-platform`). Adapter delgado sobre el lane de 1645, 3 tools bajo scope base `efeonce.mcp.read`, canaries antes de discovery. **Habilitado en producción** (revisión `efeonce-mcp-gateway-00012-dkj`); smoke autenticado por el front door devolvió el `domainQuadrant=riesgo` real de Berel.
- `TASK-1426` — [reconciliada 2026-08-05, backend-data] **Search Console multi-property + URL Inspection + post-publish discovery.** Declaraba `Epic: EPIC-022` en su cabecera pero no estaba en esta lista (su única traza era la mención en la Ola D). Extiende la conexión GSC de una propiedad única por organización a un contrato multi-property canónico.
- `TASK-1651` — [creada 2026-08-06, backend-data/integration, backend-critical] **Familia `ai_optimization` (DataForSEO) + fundación SoV de marca en LLMs per-org.** Amplía el allowlist con `/v3/ai_optimization/` (familia + CHECK del spend ledger + parity test en el mismo PR) y funda la captura batch de LLM Mentions (base longitudinal del proveedor: ChatGPT US/EN + Google AI Overview) hacia snapshots append-only per-org, con readers + MCP tools en el mismo PR. Lente ◑ complementaria del SoV per-engine del grader (TASK-1424, EPIC-020) — nunca fusionadas. Blocked by TASK-1303. Investigación fuente: skill `dataforseo-operator` (references/08, as-of 2026-08-06).
- `TASK-1653` — [creada 2026-08-06, backend-data/integration] **Federar `get_seo_rank_evolution` al gateway `mcp.efeonce.org` + guard de paridad de tools SEO** (repo hermano `efeonce-mcp`; patrón exacto de las 3 tools de TASK-1647). El guard compara el inventario de tools SEO del MCP interno contra el allowlist del gateway y falla loud cuando divergen (el allowlist explícito se conserva; el guard convierte el olvido silencioso en divergencia visible). Su blocker (TASK-1303 en producción) quedó cumplido el mismo 2026-08-06.

### Endurecimiento de la lente `Descubrir` (creado 2026-08-15, auditoría post-cierre de TASK-1665)

> Las cuatro se agrupan en un cierre único: ninguna cambia el día del operador por separado, y juntas
> sí — 50 candidatos pasan a ser 500 navegables, con seeds de GSC (demanda medida, costo cero de
> proveedor), sin filas duplicadas, con la barrera correcta y con las cuatro decisiones dejando
> rastro. Orden interno: `1694 → 1691 → 1693`, porque las tres tocan el mismo camino de lectura y
> `src/lib/copy/growth.ts`; en paralelo producirían tres encodings de la misma columna.

- `TASK-1692` — [creada 2026-08-15, backend-data] **Writers del ledger de decisiones de discovery.**
  De los 5 `action_kind` del enum sólo `dismissed` tiene writer, así que un tercio del modelo de
  estados es inalcanzable y el guard del bridge promete una re-selección que nadie puede escribir. El
  hecho lo escribe el **primitive** en su propia transacción, no cada consumer. **Bloquea a
  `TASK-1700`**: su principio es el que la cola debe obedecer para no crear un segundo libro de
  decisiones sobre los mismos hechos.
- `TASK-1693` — [creada 2026-08-15, ui-ux] **Paginación por cursor + las fuentes de seed no
  cableadas.** El reader pagina y devuelve `nextCursor`; la page lo descarta. Y de las cinco fuentes
  que el primitive soporta sólo `manual` está cableada — la de Search Console, la de mejor oficio
  (demanda medida, resolución sin costo de proveedor), existe con copy escrito y sin consumidor.
- `TASK-1694` — [creada 2026-08-15, backend-data] **Contrato de candidatos: barrera filtrable, una
  fila por keyword, política de inclusión declarada.** La API mantiene `maxDifficulty` sobre la KD
  cruda que `ISSUE-152` declaró engañosa y no expone filtro por barrera de enlaces; el dedupe por
  método deja la misma keyword en dos filas con dos CTAs de gasto; y dos de los cuatro métodos
  filtran el volumen cero en el proveedor y los otros dos no. **Bloqueo duro de `TASK-1700`** y
  subida a P1: es la única defensa contra que la cola persista duplicados con la barrera engañosa en
  filas append-only.
- `TASK-1695` — [creada 2026-08-15, backend-data] **Cobertura y registro del autor grounded.** El
  techo de 20 candidatos del bridge es aritméticamente incompatible con su propia regla de 12–16
  preguntas, y el system prompt base está en voseo rioplatense pidiendo salida es-CL — riesgo de
  exactitud, no cosmético.

### Instrumentación, sustrato y autoridad de orden (creado 2026-08-15, auditoría de oportunidad)

> Detalle, evidencia y secuencia completa en el **Delta 2026-08-15** al final de este documento y en
> `docs/audits/platform/2026-08-15-growth-seo-aeo-module-opportunity-audit.md`.

- `TASK-1696` — [creada 2026-08-15, **complete 2026-08-27**, backend-data] Ledger con dimensión de
  consumidor + gate USD per-org del grader. **P0.** Desbloquea todo lo que gaste.
  ✅ **Complete, `code complete, rollout pendiente`:** `seo_provider_spend_daily` ganó `consumer`
  (`seo` | `aeo`), `cost_basis` (`invoiced` | `estimated`) y `price_table_version` acoplado por
  CHECK, con clave única de **seis** columnas y `NULLS NOT DISTINCT` — **un solo ledger**, lo que se
  separa es el resolver de presupuesto; el grader AEO dejó de comprarle a DataForSEO fuera del
  ledger (`postDataForSeoTask` exige `consumer` y el adapter de AI Mode migró del wrapper congelado
  al transporte canónico, con la organización derivada del perfil); nació `resolveAeoBudget`
  (presupuesto en dólares per-org, las dos monedas separadas, restando la porción DataForSEO del
  estimado para no contarla dos veces); entraron tres señales
  —`growth.dataforseo.spend_ledger_drift`, `growth.ai_visibility.observation_yield` y
  `seo.provider.cost_over_budget`, esta última citada como mitigación por **nueve** tasks sin existir
  en código—; y el camino programático es el lane
  `/api/platform/ecosystem/growth/seo/provider-spend` + la tool MCP `get_seo_provider_spend`.
  🔴 **Rollout pendiente:** el gate **nace en shadow** —`GROWTH_AI_VISIBILITY_BUDGET_GATE_ENABLED` y
  `GROWTH_AI_VISIBILITY_BUDGET_GATE_ENFORCED` **ambos OFF**, en los dos runtimes (Vercel +
  `ops-worker`)—: calcula, registra y emite señal, pero no bloquea. El flip a enforce es decisión del
  operador después de un ciclo mensual de medición, porque el camino público del lead magnet comparte
  el motor del grader. La federación de la tool en `mcp.efeonce.org` va **después** del release que
  lleve el lane a `main`, nunca antes.
- `TASK-1697` — [creada 2026-08-15, backend-data] `growth/site-substrate` + lint rule cross-domain
  (mitad A). ✅ **Complete y desplegada (2026-08-27):** el sustrato vive en
  `src/lib/growth/site-substrate/` (barrel `@/lib/growth/site-substrate`: `createSiteFetcher`,
  `html.ts`, `robots-policy.ts`; los paths/nombres `Probe*` sobreviven como re-export shims) y
  `ai-visibility/probes/**` quedó privado tras la lint rule `greenhouse/growth-substrate-boundary`
  (`error`, cero exenciones). Desbloqueó `TASK-1670`, `TASK-1701` y `TASK-1709`; la mitad B (rule
  universal + barrel AEO) viaja en `TASK-1713`.
- `TASK-1698` — [creada 2026-08-15, backend-data] Posicionamiento declarado (`●`) / observado (`◑`)
  para `message_alignment`. **P0.** Bloquea a `TASK-1672`.
- `TASK-1699` — [creada 2026-08-15, backend-data] Persistir el top-N del SERP que ya se paga. **P0**,
  único trabajo con costo de demora irrecuperable.
- `TASK-1700` — [creada 2026-08-15, backend-data] Cola priorizada como aggregate persistido con score
  versionado. **P0.** Llega **antes** que `TASK-1669`.
- `TASK-1701` — [creada 2026-08-15, backend-data] `analyzeUrlContent`: hechos por URL, cero score.
- `TASK-1702` — [creada 2026-08-15, backend-data] Señales deterministas de citabilidad +
  recomendación anclada a URL.
- `TASK-1703` — [creada 2026-08-15, backend-data] Router cheap-first del eje herramienta, y el
  contrato herramienta/cobertura.
- `TASK-1704` — [creada 2026-08-15, backend-data] Cadencia y muestreo declarados: AIO no diario,
  N≥3 donde la calibración lo exige.
- `TASK-1705` — [creada 2026-08-15, backend-data] Cosecha de la capacidad OnPage ya pagada (USD 0).
- `TASK-1706` — [creada 2026-08-15, backend-data] El alta de keyword es un compromiso de gasto.
- `TASK-1707` — [creada 2026-08-15, backend-data] Rollout del re-grade recurrente multi-runtime.
- `TASK-1708` — [creada 2026-08-15, backend-data] Estacionalidad: la serie de 12 meses que ya viene
  en `keyword_info`.
- `TASK-1709` — [creada 2026-08-15, **complete 2026-08-27**, backend-data] Carril de diagnóstico
  de prospecto SEO. El modelo de entitlement ganó el **tier `prospect`** (cuarto miembro de
  `SeoTier`, el único que NO sale de `module_assignments`): tope duro POR DIAGNÓSTICO
  (`min(ceiling default 1,00, restante mensual de Efeonce)`) + tope diario por actor. El gasto de
  adquisición queda como **línea propia** en el mismo ledger (`seo_provider_spend_daily`, atribuido
  a `EO-ORG-0007`): el margen por org del epic sigue medible porque prospección y servicio no se
  mezclan. Estrenó además el colector de competidores (`competitors_domain` + `backlinks/competitors`
  + `domain_intersection`) que `TASK-1662` consumirá.
- `TASK-1775` — [creada 2026-08-26, backend-data] **Foto de dominio + trayectoria competitiva.** El
  sujeto que el módulo no sabe describir: hoy los KPIs sólo cubren el recorte seguido. `labs`
  (`domain_rank_overview` mensual · `historical_rank_overview` una vez por sujeto, cuesta 10× ·
  `bulk_traffic_estimation` para screening). Replica el patrón multi-productor de `TASK-1661`.
- `TASK-1776` — [creada 2026-08-26, backend-data] **Visibilidad por URL / subdominio / subcarpeta.**
  Una capacidad con resolver de sujeto, no tres módulos. Tercer productor de la tabla de mercado: el
  `keyword_info` de `ranked_keywords` viene inline y ya pagado. Cierra el lado ◑ de `TASK-1313`.
- `TASK-1777` — [creada 2026-08-26, backend-data] **Detalle nominal del perfil de enlaces.** Hijas
  por FK del snapshot de `TASK-1304`; el drill-down corre SÓLO donde el `new_lost_delta` ya
  persistido indica movimiento. Sin scheduler nuevo.
- `TASK-1671` — [creada 2026-08-15, ui-ux] **Superficie de los hallazgos de sitio.** Estaba
  reservada desde el 2026-08-11 y la resolución de secuencia la destapó como **el bloqueante real**:
  `TASK-1670` nace con flag OFF y no se prende hasta que esta esté desplegada. Habilita el flip y es
  precondición de que `TASK-1672` publique artefacto.
- `TASK-1713` — [creada 2026-08-15, backend-data] **Lint rule universal cross-dominio + barrel AEO.**
  Mitad B de la partición de `TASK-1697`. 30 deep imports medidos, 18 fuera del par conocido.
  `Blocked by: TASK-1695` (bloqueo invertido).
- `TASK-1284` — [**adoptada 2026-08-15**, backend-data] **GA4 multi-tenant como señal per-org.**
  Estaba huérfana (`Epic: none`) y es la única vía a dos cosas que el epic promete: el puente
  «clics → leads» y la medición del **referral real** de `chatgpt.com`/`perplexity.ai` — o sea, lo
  único que prueba que la citación en IA trae gente. Bloquea de hecho la tercera parte de
  `TASK-1668` (las ventanas de outcome GA4/HubSpot): o se adopta, o ese loop de negocio se declara
  explícitamente parcial. `src/lib/growth/ga4/` ya tiene cliente con token provider inyectable y el
  patrón per-org ya corre en producción en Search Console.

## Existing Related Work

- `growth.ai_visibility` (AEO grader, EPIC-020/EPIC-021) — motor hermano; el SEO reusa sus patrones de dominio, entitlement y report artifact (TASK-1252).
- `TASK-1282` — Search Console multi-tenant connection (per-org OAuth + reader de Search Analytics); base de las señales GSC. Live en staging (Grupo Berel conectado).
- `src/lib/ai/dataforseo.ts` — cliente DataForSEO existente (hoy candado a `/v3/serp/`), usado por el AEO AI Overview provider.

## Exit Criteria

- [ ] `growth.seo` existe como dominio con serie temporal append-only + readers/commands canónicos, boundary duro contra AEO (cross-ref por `organization_id`, cero merge de tablas) y contra Payroll/Finance (cero writes).
- [ ] DataForSEO ampliado con allowlist cerrado de familias + cost-tracking + circuit breaker por familia; el candado no quedó debilitado a prefijo libre.
- [ ] Entitlements `growth.seo.*` per-org con las 4 puertas + coverage test; ningún acceso derivado por rol.
- [ ] La pantalla estrella (evolución de URLs/keywords en el tiempo) entrega valor con datos reales de Berel, con honestidad medido (GSC) vs estimado (DataForSEO).
- [ ] Gate de costo DataForSEO per-org operativo (quota cap + signal `seo.provider.cost_over_budget`).
  *Parcial desde `TASK-1696` (2026-08-27): la señal ya existe y el gate de dólares per-org del grader
  está implementado, pero **nace en shadow** —calcula, registra y emite, no bloquea— con sus dos
  flags OFF. Este criterio **no cierra** hasta que el enforce esté prendido y verificado en los dos
  runtimes (Vercel + `ops-worker`).*
- [ ] Documentación triple (técnica/funcional/manual) del módulo + flag `GROWTH_SEO_ENABLED` en el Feature Flag Ledger.
- [ ] El discovery diario permite expandir seeds y enriquecer candidates mediante corridas Live de
  DataForSEO Labs con preview de costo, límite por corrida, `ops-worker`, ledger atribuido a la org,
  estados parciales y degradación honesta; una corrida no puede crear tracking automáticamente.
- [ ] La superficie S3 `Descubrir` permite revisar y decidir candidates sin ruta ni menú paralelo,
  distingue GSC medido (`●`) de Labs estimado (`◑`) y mantiene las acciones de objetivo, tracking,
  descarte y grounded query explícitas y auditables.
- [ ] SEO puede preparar un draft de grounded queries desde candidates seleccionados reutilizando el
  prompt store/lifecycle AEO existente, con provenance `run/candidate/context`, vocabulario cerrado,
  protección contra prompt injection y revisión obligatoria antes de `active`; no existe un segundo
  prompt store ni un JOIN SQL SEO↔AEO.
- [ ] Una decisión SEO seleccionada puede convertirse en un `SEO Editorial Work Item` con provenance,
  brief válido y handoff a draft/private de Content Factory; el camino no publica ni modifica una
  fuente pública directamente.
- [ ] El work item puede pasar por QA, aprobación humana, publicación observada, verificación live,
  outcome por ventana e iteración; la evidencia es append-only y distingue `measured`, `estimated`,
  `declared`, `derived` y `unavailable`.
- [ ] El módulo ofrece un plan diario advisory con los roles `seo_researcher`, `editorial_planner` y
  `qa_measurement`, fallback determinista, límites de costo/llamadas, telemetry redactada y
  recomendaciones siempre sujetas a `propose → confirm → execute`.
- [ ] **Full API Parity + MCP verificados como consumers reales (mandato del operador 2026-08-05):** los readers canónicos sirven UI + Nexa + lane ecosystem (`api/platform/ecosystem/growth/seo/*`) + MCP tools (`TASK-1645`) sin lógica duplicada; el epic NO cierra con el módulo UI-only aunque todos los demás criterios pasen. La superficie MCP incluye disponibilidad vía el gateway `mcp.efeonce.org` (provider federado en TASK-1626) o task dedicada de federación creada con dueño. Writes de agente declarados vía governed action loop (follow-up explícito, no deuda oculta).

## Non-goals

- Reemplazar el AEO grader ni fusionar su scoring con el SEO (son ejes complementarios; se cruzan por org, no se promedian).
- Cualquier write/mutación de Payroll, Finance, compensación o finiquito desde este dominio.
- Scraping directo de Google/SERP (toda SERP/backlink/audit sale por la API DataForSEO server-side).
- Vender Greenhouse/SEO como producto standalone (rompe la doctrina ASaaS; el SEO es capacidad del servicio + puerta contratada).
- URL Inspection API de GSC (segunda fuente, follow-up posterior).

## Delta 2026-07-01

Epic autorado desde una planificación con 4 lentes (arquitectura, SEO, product design, comercial). Se reservan las 3 tasks fundacionales backend-data (`TASK-1299/1300/1301`); las tasks 1302–1310 quedan planificadas en `## Child Tasks` y se autoran a continuación conforme se secuencia el programa. Camino de máximo valor / mínimo costo declarado: `TASK-1302 → TASK-1306 → TASK-1307` (dashboard temporal casi sin gasto DataForSEO, GSC ya conectado).

## Delta 2026-07-02 — extensión granularidad URL / Topic Cluster

Se suma el bloque **"Search Visibility 360 granular"** (nivel página + topic cluster, no solo marca): para una landing o cluster, análisis unificado de keywords · avg position · clicks · **grounded queries que la cita la IA** · citation share · cuadrante 360 a ese nivel. Hallazgo clave al aterrizar el diseño: **el grader YA captura las citas con URL** (`GrowthAiVisibilityCitation` + `buildCitations` + el adapter AI-mode parsea `references`/`links`/`sources`), así que la extensión es reader/atribución + entidad cluster + read unificado, NO nueva captura. 3 tasks nuevas: `TASK-1311` (citation attribution URL-level), `TASK-1312` (topic cluster entity), `TASK-1313` (`readPageVisibility360`/`readClusterVisibility360`). Boundary §1.1 intacto (derived read con join `org+url/cluster`, sin merge de tablas). Consumer UI granular = follow-up ui-ux posterior. Detalle: `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §15.

## Delta 2026-07-02 (cont.) — pillar page + topical authority

El topic cluster gana estructura **pillar + supporting**: la pillar page es el hub del tema, donde SEO clásico y AEO convergen (debe rankear el head term *y* ser la fuente que la IA cita como autoridad). Dos piezas: (1) **delta a `TASK-1312`** — `role` (`pillar`|`supporting`) en el member + único pillar activo por cluster (índice único parcial); (2) **`TASK-1314`** — pillar-cluster health / topical authority: reader que compone cobertura (keyword gap) + estructura (internal linking del audit 1304) + rendimiento (rank 1303) + el twist AEO (¿la pillar es la citada? 1311) → topical authority score + huecos. Compone readers, cero captura nueva, boundary §1.1 intacto. Detalle: `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §15.1.

## Delta 2026-07-02 (cont. 2) — E-E-A-T como capa de entidad/calidad conectiva

E-E-A-T (Experience · Expertise · Authoritativeness · Trustworthiness) es el "por qué" debajo de rankear (SEO) Y de ser citado (AEO), y el multiplicador del topical authority. Hallazgo al aterrizar el diseño: **~70% de la materia prima ya existe en el probe layer del grader** (eje `entity` KG/Wikidata/Reddit-UGC de TASK-1267 + `json-ld` structural + `brand-intelligence` LLM del contenido del sitio). Gap = capa de autor + rúbrica/rater 4 pilares (YMYL-aware) + señales de trust explícitas. **Vive cerca del grader** (extiende su eje entity), el módulo SEO la **consume** (un primitive, dos consumers). Regla dura: E-E-A-T es un **assessment**, no un dial — medido (●) vs evaluado (◑), calibración anti falso-0 (lección EPIC-021), reusa evals/accuracy. 3 tasks: `TASK-1315/1316/1317`. Detalle: `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §16.

## Delta 2026-07-26 — Madurez de producto-servicio y readiness comercial

Este epic no debe cerrarse sólo porque existan schema, readers, crons y pantallas. Search Visibility 360 es una
capability productizada de Wave operada por Efeonce; debe cerrar el ciclo **diagnóstico → acción → implementación →
verificación → renovación** y servir al alcance comercial mid-market y enterprise.

### Madurez actual

| Capa | Estado | Qué significa |
|---|---|---|
| AEO engine | `diagnostic_ready` | El motor brand-aware, reportes, probes y evidencia permiten diagnosticar visibilidad IA. |
| AEO comercial | `commercially_partial` | Grader/Radiografía existen; cockpit operador, entrada pública y loop completo siguen pendientes. |
| SEO architecture | `design_complete` | El bounded context, datos, providers, boundaries y secuencia están definidos. |
| SEO runtime | `not_started_as_epic` | EPIC-022 sigue en diseño; TASK-1299 es el bloqueador fundacional. |
| Search Visibility 360 | `validation_only` | La narrativa SEO+AEO está definida, pero no hay aún evidencia suficiente de repetibilidad, WTP, margen o renovación. |

> **Nota 2026-08-27 (`TASK-1696`) sobre el ítem `margen`.** El **costo variable por organización**
> —lo que cuesta servir a un cliente en gasto de proveedor— pasa a ser **computable**:
> `seo_provider_spend_daily` distingue quién consumió (`seo` | `aeo`) y con qué base de costo
> (facturado | estimado), y el reader canónico `readSeoProviderSpendByConsumer` lo entrega cortado
> por ambos ejes sin colapsar las dos monedas en un total único. **Computable no es medido:** el
> margen por cliente sigue sin construirse y la evidencia que este gate exige sigue pendiente. Lo que
> cambió es que ya no falta el dato de costo del lado del proveedor.

### Gaps de producto-servicio que el programa debe cerrar

1. **Action loop:** cada finding debe poder convertirse en prioridad, responsable, tarea, aprobación, implementación y
   verificación; el módulo no puede ser sólo un dashboard.
2. **Content/delivery loop:** `gap → brief → producción Globe cuando corresponda → aprobación → publicación →
   indexación → medición`, manteniendo Wave como owner de Search Visibility 360.
3. **Business measurement:** conectar GSC/GA4/HubSpot y la evidencia del cliente con leads, conversiones, pipeline y
   revenue influence; rankings, clicks, SoV y citaciones no son automáticamente outcomes.
4. **Customer success:** instrumentar baseline/after, cadence, sponsor, health, renewal trigger, expansion trigger y
   límites de atribución.
5. **Enterprise operations:** multi-site, multi-brand, multi-market, permisos, seguridad, DPA, procurement, SLA,
   exportación, retención y continuidad de proveedores.
6. **Provider/ecosystem governance:** definir RACI, pass-through, subcontratistas, liability, incident response,
   sustitución y exit assistance para Globe, Reach, plataformas y terceros.

### Alcance de cliente

Efeonce atiende **mid-market y enterprise**. SMB queda fuera del ICP de este epic salvo una decisión explícita
posterior. El diseño debe separar:

| Segmento | Requisitos mínimos adicionales |
|---|---|
| Mid-market | onboarding simple, diagnostic de bajo esfuerzo, reporting ejecutivo, configuración acotada y cadence clara |
| Enterprise | jerarquía multi-site/marca/mercado, stakeholders y procurement complejos, seguridad/DPA, roles, SLA, auditoría y exportación |

El ICP estratégico, el ICP de oportunidad y el ICP de delivery son objetos distintos. Una cuenta puede tener fit
comercial y ser inoperable por falta de datos, approvals, governance, proveedores o margen.

### Readiness gates del epic

Además de los exit criteria técnicos, el epic requiere estos gates antes de elevar el estado del modelo:

| Gate | Verdict requerido | Evidencia mínima |
|---|---|---|
| Diagnostic | `diagnostic_ready` | trigger, buyer/problem owner, baseline, decision question y siguiente compromiso |
| Commercial qualification | `commercially_qualified` | buying group, economic buyer, criteria/process, paper process, champion y next step bilateral |
| Implementation | `implementation_ready` | scope, acceptance, RACI, dependencia del cliente y capacidad/margen por fase |
| Managed operation | `managed_operation_ready` | counterpart, backlog, cadence, health, first value y economics recurrentes |
| Renewal/expansion | `renewal_ready` / `expansion_ready` | evidencia aceptada por cliente, sponsor, trigger, capacidad y nuevo scope |
| Enterprise | `enterprise_ready` | procurement, seguridad, datos, IP, SLA, continuidad y multi-entity governance cerrados |

Los verdicts por fase son independientes: calificar un diagnostic no califica automáticamente implementation, Managed
Operation, ecosystem providers ni renewal.

### No autoriza todavía

Este delta no autoriza vender Search Visibility 360 como producto autónomo, afirmar PMF/ARR/NRR, prometer rankings o
revenue, ni publicar pricing. Mantiene las reglas del modelo canónico y del [Customer Model Integrity Pack](../../business-models/search-visibility-360/SEARCH_VISIBILITY_360_CUSTOMER_MODEL_INTEGRITY_PACK_V1.md).

### Secuencia de entrega recomendada

- **Ola A — AEO wedge:** cerrar cockpit operador, entrada pública, binding cliente, regrade, fix-it y SoV por motor.
- **Ola B — SEO mínimo valuable:** `TASK-1299 → TASK-1300 → TASK-1301 → TASK-1302 → TASK-1306 → TASK-1307`, empezando por GSC para minimizar costo DataForSEO.
- **Ola C — 360 operativo:** `TASK-1303 → TASK-1304 → TASK-1305 → TASK-1311 → TASK-1313`.
- **Ola D — authority/enterprise:** `TASK-1312 → TASK-1314 → TASK-1315 → TASK-1316 → TASK-1317 → TASK-1426`, más los contratos de delivery, contenido, revenue y procurement correspondientes.
- **Ola E — discovery/action diario:** `TASK-1664 → TASK-1666 → TASK-1665`; después, `TASK-1662`
  puede reutilizar la forma de candidate sin mezclar su análisis competitivo. `TASK-1311` consume la
  provenance AEO una vez que existan drafts/runs aprobados; `TASK-1310` sólo consume candidates que
  tengan una decisión explícita.

La definición de cierre del epic debe incluir evidencia técnica **y** evidencia de cliente, delivery, economics,
adopción y renovación. La fuente transversal para esa evaluación es `efeonce-customer-model-operator`; GTM,
Commercial, Pricing, Finance, Legal y Operations conservan sus decisiones propias.

## Delta 2026-08-05 — Arranque de ejecución + mandato Full API Parity / MCP

- **`TASK-1299` (schema fundacional) en ejecución:** migración `20260805134439202_task-1299-growth-seo-schema.sql` aplicada en `greenhouse-pg-dev` — 8 tablas `seo_*` (config + serie temporal append-only), UNIQUEs de idempotencia, triggers `block_seo_row_mutation`, GRANTs least-privilege, `db.d.ts` regenerado, smoke live anti-mutation verificado. El bloqueador fundacional dejó de serlo.
- **Mandato del operador (directiva de sesión 2026-08-05):** todo lo que el módulo SEO construya **nace Full API Parity y usable por MCP**. Materialización: exit criterion nuevo (parity+MCP verificados como consumers reales), child task `TASK-1645` (lane ecosystem + MCP tools, espejo `TASK-1086` de Knowledge) y DoD reforzado en `TASK-1301` (capability ⇒ el chokepoint sirve a TODOS los lanes, nunca un gate paralelo por consumer). Los writes de agente se declaran vía governed action loop como follow-up explícito.

## Delta 2026-08-05 (b) — Destino Wave declarado: nace en Greenhouse, se habilita en `wave.efeonce.org`

Directiva del operador: Search Visibility 360 nace en greenhouse-eo (la plataforma vigente) y eventualmente se
habilita como producto en `wave.efeonce.org` (consistente con `EPIC-037`: Wave = casa del producto; Greenhouse =
administrador, no runtime de largo plazo). Implicación para TODAS las child tasks: nacer **extraction-ready** según
`GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §17 (inventario del seam, FK org como único acople deliberado, reglas
duras de imports/FKs/consumers). La extracción física NO se autoriza desde este epic mientras `EPIC-027` esté
activo; es programa posterior de Wave.

## Delta 2026-08-05 (c) — Prioridad MCP-first (directiva del operador)

Operar las herramientas SEO **por MCP es la prioridad más alta del módulo**; la UI es necesaria pero va después.
Re-priorización: `TASK-1301`, `TASK-1302` y `TASK-1645` suben a **P1**; `TASK-1645` se desbloquea de 1303 y sale
con el primer reader (GSC). Los readers posteriores (1303/1305) registran su MCP tool **en su propio PR**
(parity-at-birth incremental). Ola B re-ordenada: `1301 → 1302 → 1645 (lane+tools V1) → 1300 → 1303 (+tool rank)
→ UI 1306/1307`. La UI no bloquea ninguna entrega MCP.

## Delta 2026-08-05 (d) — Sinergia SEO↔AEO adelantada al camino crítico (directiva del operador)

El operador exige que las sinergias directas con el AEO **ocurran** — no son un nice-to-have de Ola C.
Con `seo_gsc_daily` materializándose en vivo (TASK-1302 rollout 2026-08-05) y `grader_scores` en producción,
el cruce ya es computable HOY. `TASK-1305` (`readSeoAeoGap` + matriz quadrant 360) sube P3→P1, se desbloquea
de TASK-1303 (V1 = GSC medido × grader; rank snapshots enriquecen después) y entra a la Ola B:
**1301 → 1302 → 1305 → 1645**, para que el tool MCP `get_seo_visibility_360` nazca con el cruce real.
Las sinergias posteriores (1311 citation attribution URL, 1313 unified read, 1314 topical authority,
1315-17 E-E-A-T sobre probes del grader) siguen su secuencia, pero el quadrant 360 no espera.

## Delta 2026-08-05 (e) — Cierre del día

El día cerró con **seis tasks ejecutadas**: `TASK-1299` (schema) · `TASK-1301` (capabilities + entitlement
per-org `seo_v1` + chokepoint `enforceSeoRunEntitlement`) · `TASK-1300` (DataForSEO family registry + ledger de
gasto como fuente única) · `TASK-1302` (GSC daily materializer + `readKeywordOpportunities`, **rollout live**) ·
`TASK-1305` (`readSeoAeoGap` + quadrant 360; primer cruce real: Berel #1.75 orgánico × AEO 44.5 → `riesgo`),
todas `complete`, más `TASK-1645` **code-complete** (lane ecosystem
`/api/platform/ecosystem/growth/seo/{keyword-opportunities,visibility-360,entitlement}` + 3 MCP tools
`get_seo_keyword_opportunities` / `get_seo_visibility_360` / `get_seo_entitlement`). Los mandatos quedaron
amarrados: MCP-first, todo reader futuro expone su MCP tool en el mismo PR (criterio de aceptación en
`TASK-1303`/`1304`/`1311`/`1312`/`1313`/`1314`/`1317`) y destino Wave en la arquitectura §17. Efeonce quedó
provisionada **own-brand** (dogfooding) sobre `EO-ORG-0007`: 4 perfiles grader con lente AEO ligada (SKY ya la
tenía), assignment `seo_v1` `contracted`/`own_brand`, target `efeoncepro.com`; `visibility-360` responde
`no_seo_data` honesto hasta conectar GSC (script: `scripts/growth/provision-efeonce-own-brand-seo.ts`).
**Para operar falta el cutover:** `GROWTH_SEO_ENABLED` en Vercel + smoke e2e HTTP con binding real (cierre de
1645) · `TASK-1647` (federación del provider en `mcp.efeonce.org`, adapter delgado con canaries antes de
discovery) · conexión GSC per-org de `efeoncepro.com` al destrabar `TASK-1282`/`1283`.

**Cierre nocturno (misma fecha):** `TASK-1647` quedó **code-complete** — provider `greenhouse-seo` + 3 tools
en `efeonce-mcp` (main, `a53b77f`+`4870e90`, fail-closed default OFF) con canary e2e **verificado por HTTPS
real** (gateway → lane staging → readers → PG: Berel `riesgo`/50 keywords/AEO 44.5, entitlement Efeonce 8/$50 +
`no_seo_data` honesto, deny anti-oracle 404). `GROWTH_SEO_ENABLED=true` aplicado en Vercel **staging** +
redeploy; Berel provisionada Fase 0 (`cpma-berel-seo-contracted` + `seot-berel-fase0`). Único bloqueo:
greenhouse PROD sin el lane (release develop→main); secuencia de cierre en `TASK-1647`.

## Delta 2026-08-06 — cutover MCP-first a producción cerrado

`TASK-1645` y `TASK-1647` pasan a **complete**. El camino MCP-first del módulo SEO está **vivo en
producción**, en este orden y con verificación por capa:

1. Release `develop→main` `70e912056273d0a30e2aa8dacc2f4e62076e3b44`
   (`release_id=70e912056273-03c36b47-eb75-469c-886f-51c691cd7c34`, run `31058032196`), manifest
   `released`, watchdog `drift_count=0`. Incluye las 5 migraciones SEO (1299/1301×2/1302/1300).
2. `GROWTH_SEO_ENABLED=true` en Vercel Production + redeploy `dpl_GyGkdEQQTk65qkCs1S3TEH6Jquy9`
   (multi-runtime: el mismo flag ya estaba ON en el `ops-worker` para el materializer GSC).
3. Canary del provider contra `https://greenhouse.efeoncepro.com`: **Berel `domainQuadrant=riesgo`,
   50 keywords, AEO 44.5**; Efeonce `hasModule=true tier=contracted` con `no_seo_data` honesto;
   deny anti-oracle `404`.
4. Provider habilitado en el gateway: revisión `efeonce-mcp-gateway-00012-dkj` `Ready=True`, token
   por **secret ref** de Cloud Run. Front door: health 200, protected-resource metadata 200,
   `POST /mcp` anónimo 401 con challenge OAuth.
5. **Smoke MCP autenticado por `mcp.efeonce.org` verde** (token Entra real, scope base
   `efeonce.mcp.read`): `get_seo_entitlement` 200 · `get_seo_visibility_360` 200 con
   **`domainQuadrant=riesgo`** · deny anti-oracle cerrado. Preguntar por MCP por la visibilidad 360
   de Berel devuelve el quadrant real.

**Efecto en el exit criterion parity+MCP:** la superficie MCP deja de ser "task creada con dueño" y
pasa a ser **disponibilidad real en `mcp.efeonce.org`**. El criterio sigue abierto sólo por la pata
de UI/Nexa (`TASK-1310` y siguientes): el módulo no es UI-only, pero tampoco tiene aún su superficie
visible. Pendiente operativo: conexión GSC per-org de `efeoncepro.com` (`TASK-1282`/`1283`).

## Delta 2026-08-07 — el módulo deja de ser headless: nace la primera superficie (S1)

`TASK-1306` quedó **complete** y con ella el módulo SEO tiene su **primera cara visible**:
`/admin/growth/seo`, el nodo **S1** del master UI flow. Hasta ayer el epic era MCP-first
puro (readers + lane ecosystem + gateway) y la pata "UI/Nexa" del exit criterion de parity
seguía **completamente** abierta; hoy queda abierta **sólo por el cliente y el report
artifact** (`TASK-1310`) y por las tres hermanas operador (`1307`/`1308`/`1309`).

**Lo que cambia para las hermanas** (esto es lo importante del delta, porque les ahorra
trabajo o les corrige un supuesto):

1. **El shell ya existe y es compartido.** `SeoSearchVisibilityTabs`
   (`src/views/greenhouse/admin/growth/seo/overview/`) es el conmutador de la sección local
   "Search Visibility". Los tabs **navegan** (`next/link` a rutas hermanas), no conmutan
   paneles en memoria; las tres pendientes están declaradas con `available: false` y un
   `title` que dice por qué. **Activar una hermana es quitar esa línea, no refactorizar el
   conmutador.**
2. **El viewCode `administracion.growth_seo` es compartido por las 4 rutas.** Ya está
   sembrado (migración `20260806223132770`), en `view-access-catalog.ts` y con grants a
   `efeonce_admin` + `ai_tooling_admin`. `1307`/`1308`/`1309` son **child routes del MISMO
   viewCode**: NO siembran uno nuevo, NO agregan ítem de menú (el único href es
   `/admin/growth/seo` en `VerticalMenu`), pero **SÍ** deben declararse en
   `route-reachability-manifest.ts` con `parent: '/admin/growth/seo'`, `via: 'tab'` y
   `reason` — el gate de alcanzabilidad no perdona una `page.tsx` huérfana.
3. **`readRankSnapshotLatest` NO EXISTE.** Lo citaban la arquitectura §7, el master UI flow
   §1 y las specs de `1306`/`1307` como si fuera un reader entregado por `TASK-1303`. Esa
   task sólo dejó `readRankEvolution`. Los movers WoW del sidebar de 1306 se **derivan** de
   la serie de evolución. La referencia queda corregida en los docs; no propagarla.
4. **La decisión ECharts vs ApexCharts SIGUE ABIERTA.** `TASK-1306` **no instaló ninguna
   librería nueva** (usó ApexCharts + Recharts, ya presentes) y **no prejuzga** el Slice 0
   de `TASK-1307`, que sigue siendo el dueño de esa decisión para el stack de alto impacto
   del módulo.
5. **Bug latente descubierto y ya mitigado:** con `cssVariables: true`, `theme.palette.*`
   devuelve `var(--mui-palette-*)` y ApexCharts revienta con
   `Cannot read properties of null (reading '1')` — sin pintar nada y sin error visible.
   El helper `resolveApexColor` (`src/libs/styles/`) es obligatorio para cualquier chart
   Apex que tome color del theme. Afecta a `1307`/`1308`/`1309` si usan Apex, y a los ~32
   consumidores Apex del repo (candidato a task propia).

**Rollout:** `code complete, promoción pendiente`. `GROWTH_SEO_ENABLED` ya está ON en
Vercel Production (rollout de 1302/1645), así que el control de exposición real es el
viewCode + el `module_assignment` per-org. ⚠️ Mientras 1306 viva sólo en `develop`,
producción **vuelve a apagar el viewCode** en cada corrida de `syncViewRegistry` (desactiva
todo viewCode ausente del catálogo TS del código **en ejecución**, y la base Cloud SQL es
única y compartida por dev/staging/prod). Se estabiliza al promover a `main`.

## Delta 2026-08-07 (b) — el cockpit operador queda en 3 de 4: S2 y S3 aterrizan

**Delta 2026-08-08:** `TASK-1307` (S2), `TASK-1308` (S3) y `TASK-1309` (S4) están **complete**, así
que las **cuatro** tabs de "Search Visibility" navegan y el conmutador del operador queda cerrado. La
pata UI/Nexa del exit criterion de parity queda abierta ahora sólo por el cliente + report artifact
(`TASK-1310`), que está construido y pendiente de la ronda premium y de que su ítem sea alcanzable por
nav (`TASK-1675`).

**Lo que este delta corrige para quien siga (1309 / 1310):**

1. **La decisión de librería del módulo está tomada: ECharts.** `TASK-1307` la resolvió en su
   Slice 0 (era el dueño de la decisión según el delta anterior) y `TASK-1308` la reusó vía
   `AppECharts` + `resolveChartColor`. Una hermana nueva **no vuelve a abrir la discusión** ni
   mete una segunda librería para una sola pantalla.
2. **Un command que la spec daba por construido no existía.** `TASK-1308` declaró
   `Backend impact: none` porque su spec citaba `trackKeywords` como entregado por `TASK-1303`,
   marcado `[verificar]`. **No lo había construido nadie.** El patrón se repite en este epic
   (ver `readRankSnapshotLatest` en el delta anterior): un `[verificar]` en una spec no es una
   dependencia satisfecha. Antes de declarar `Backend impact: none`, verificar el símbolo en el
   código, no en la prosa de otra task.
3. **El dato de mercado sigue sin aterrizar, y la UI ya está diseñada para que eso no importe.**
   `readKeywordOpportunities` devuelve `searchVolume: null`, `difficulty: null`,
   `market: 'unavailable'` (`TASK-1300` amplió el allowlist pero el enriquecimiento Labs no
   corre). El mapa de S3 usa ejes **medidos** (posición × impresiones de Search Console), que es
   además lo metodológicamente correcto: priorizar por volumen estimado de un tercero teniendo
   el GSC propio está listado como error en la skill `seo-aeo`. Cuando el enriquecimiento llegue
   será **columna y filtro, nunca eje** — no se reescribe la pantalla.
4. **Escribir por MCP exige scope propio.** Las 2 tools de escritura de S3
   (`track_seo_keywords` / `untrack_seo_keywords`) van bajo `efeonce.mcp.seo.write`, no bajo el
   `efeonce.mcp.read` de las lecturas, y el lane ecosystem sólo las acepta desde bindings
   `internal`: un binding cliente lee sus oportunidades pero no hace crecer su propia factura.
   🔴 El guard de paridad del gateway **no las habría visto**: su regex se ató a `get_seo_*`
   cuando todas las tools eran lecturas. Se amplió al dominio. **Toda tool de escritura futura
   del módulo hereda este patrón.**

**Pendiente de rollout (no de código):** el scope `efeonce.mcp.seo.write` existe en Entra
(`17f923ad-537a-4c2f-ab5b-2a14ed650183`, round-trip verificado — los 3 scopes de Globe intactos)
pero **no está cableado a ningún cliente** y no debe cablearse al PKCE compartido; más el commit
de federación del gateway (`efeonce-mcp`) sin publicar. Hasta entonces las 2 tools responden
`insufficient_scope`: fail-closed por diseño. Y sigue en pie el bloqueo del delta anterior —
mientras las pantallas vivan sólo en `develop`, `syncViewRegistry` de producción vuelve a apagar
el viewCode compartido.

## Delta 2026-08-08 — nace el carril diario discovery → decisión → grounded query

La revisión del uso cotidiano del módulo mostró un hueco distinto al de los dashboards: el operador
necesita partir de una seed, encontrar términos vecinos, consultar tamaño/dificultad/intención de
mercado, descartar ruido y decidir qué merece tracking o una pregunta AEO. Ese trabajo no debe vivir
en una planilla ni en un render que pague DataForSEO sin control. Se crean tres tasks encadenadas:

1. **`TASK-1664` — primitive server-side de discovery.** La corrida acepta seeds manuales, queries de
   GSC, keywords monitoreadas, dominio propio o combinación; permite únicamente los endpoints Labs
   declarados en la task; calcula un costo conservador antes de la confirmación; ejecuta en
   `ops-worker`; persiste runs/candidates/actions append-only; aplica límites de seeds, métodos,
   candidates, enriquecimientos y llamadas; registra spend por org; expone reader/app/Nexa/ecosystem/
   MCP; y queda separada de `trackKeywords`. El mercado estimado nunca reemplaza la señal GSC medida.
2. **`TASK-1666` — bridge SEO↔AEO.** Una selección de candidates se transforma en un draft del prompt
   store AEO existente, no en una nueva entidad SEO. La entrada de keywords se inyecta como contexto
   de datos no confiable; el authoring canónico decide el texto natural y los tags cerrados. Cada draft
   guarda refs de `run`, `candidate` y hash de contexto; la aprobación y activación permanecen en el
   lifecycle AEO.
3. **`TASK-1665` — workbench S3.** La UI vive en `/admin/growth/seo/keywords`, reutiliza el shell y
   añade la lente `Descubrir`. Hace visible preview → confirmación → async → resultados → decisión;
   ofrece `Declarar objetivo`, `Seguir oportunidad`, `Preparar grounded queries`, `Descartar` y
   `Ver trayectoria`; transforma tabla a lista/card en 390 px; y confirma cada acción con outcome por
   candidate. No incluye llamadas provider-facing ni crea una ruta paralela.

El orden contractual es `1664 → 1666 → 1665`: el workbench puede diseñarse y maquetarse durante la
ejecución de `1666`, pero no se considera integrado hasta que el command de grounded draft y sus
pruebas de paridad existan. Este carril no duplica `TASK-1662` (gap competitivo), `TASK-1651`
(`ai_optimization`/LLM Mentions), `TASK-1311` (atribución de citas) ni `TASK-1308` (oportunidades GSC).

## Delta 2026-08-08 — se cierra la costura editorial y se agrega IA advisory

La auditoría del flujo cotidiano confirmó que `1664 → 1666 → 1665` resolvía discovery y decisión,
pero todavía dejaba la acción editorial, el aprendizaje posterior y la coordinación diaria fuera del
producto. Se agregan tres tasks sin duplicar la lane de keywords:

```text
1664 discovery/candidates
   ├─ 1666 grounded-query draft opcional
   └─ 1665 workbench S3 y decisión humana
          ↓
       1667 SEO Editorial Work Item
          ↓
       Content Factory draft/private
          ↓
       1668 QA → aprobación humana → publicación observada → outcome → iteración
          ↓
       1669 plan diario advisory (researcher → planner → QA/measurement)
```

- `TASK-1667` es el dueño de la identidad de continuidad `candidate → brief → draft privado`. No
  extiende SEO hacia WordPress con SQL ni convierte `ContentFactoryBrief.v1` en un contrato paralelo.
- `TASK-1668` es el dueño de la evidencia editorial/post-publication. Cada fuente (`GSC`, `rank`,
  `Labs`, `AEO`, `GA4`, `HubSpot`) conserva su realidad, as-of y cobertura; `no_data` no es cero y
  `HTTP 200` no prueba indexación.
- `TASK-1669` es el dueño del plan de agentes e IA. Los tres roles sólo leen primitives, devuelven
  recomendaciones estructuradas y usan fallback cuando no hay datos/modelo; todos los writes siguen
  `propose → confirm → execute`.

El orden de implementación queda:

1. `TASK-1664` → `TASK-1666` → núcleo `TASK-1665`.
2. `TASK-1667` para el handoff editorial.
3. `TASK-1668` para QA/outcome/iteración.
4. `TASK-1669` para coordinación advisory sobre los readers anteriores.
5. Extensión de `TASK-1665` para mostrar work items, outcomes y plan diario cuando cada contract esté
   disponible; la UI no puede inventar esos estados ni bloquear el núcleo de discovery.

El epic no se considera “crear y optimizar” completo por tener candidates o drafts: debe poder
explicar qué se decidió, qué se produjo, qué se verificó, qué resultado se observó y cuál es el
siguiente paso permitido.

## Delta 2026-08-12 — la cara cliente cierra, y con ella la pata UI del exit criterion

`TASK-1310` queda **complete**. El módulo SEO tiene ahora sus dos caras: las 4 tabs del operador
(`1306`/`1307`/`1308`/`1309`) y el portal del cliente (`/growth/seo` + `/growth/seo/report`). El exit
criterion de Full API Parity queda cubierto en su pata visible; lo que sigue abierto del epic es
capacidad nueva, no la superficie.

**Lo que este cierre le enseña a las tasks que vienen:**

1. 🔴 **Un scorecard es una foto con fecha, no un estado.** El de 1310 decía BLOCK 2.29 y era
   correcto para las capturas de las 10:25 del 08-08 — pero el commit de las 19:29 ejecutó los lotes
   premium y nadie volvió a medir. Cuatro días después el veredicto vigente describía una UI que ya no
   existía. **Ante una task con auditoría abierta, medir antes de rehacer.**
2. **Los gates no ven contradicciones de contenido.** El informe cliente anunciaba "Aún no hay una
   posición media para leer" con `#13.3` impreso al lado, con `exitCode 0` y axe limpio. Salió mirando
   el frame. El patrón que lo causó vale para todo el epic: **tres renders del mismo modelo derivando
   cada uno su propia regla**. El veredicto ahora se deriva una vez y los tres lo consumen.
3. **Un scenario atado a una copy se rompe cuando la copy mejora.** El del informe buscaba el botón
   por el texto que la propia auditoría había mandado a renombrar. Los scenarios de este epic apuntan a
   `data-capture`, no a strings.
4. **La persona agente importa tanto como la ruta.** Verificar una superficie client-gated con la
   persona equivocada produce la card de bloqueo y se lee como defecto de producto. Cada organización
   contratada necesita su persona cliente; la de Berel ya existe en `greenhouse_serving.session_360`.

**Hallazgo de población que el epic debería resolver antes de sumar el segundo cliente:** la
superficie cliente tiene hoy **una sola organización**. `connection.state` se decide con GSC pero el
Resumen deriva de rank snapshots, así que un tenant con Search Console conectado y captura de rank
sin correr —**el día 1 de todo cliente nuevo**— renderiza el KPI principal en "sin dato" con el
Quadrant poblado debajo. Con N=1 nadie lo delata. Merece task propia: fixtures por estado de la
población y la decisión de fuente del Resumen.

## Delta 2026-08-13/14 — el dato de mercado aterriza: `TASK-1661` complete y el carril aspiracional se destraba

`TASK-1661` queda **complete**. Con ella el módulo deja de responder sólo *"¿qué empujo de lo que ya
tengo?"*: `readKeywordOpportunities` ya no cablea `market: 'unavailable'`, y la tabla de `TASK-1308`
muestra volumen y barrera de enlaces **sin una línea de cambio en la UI** — el contrato
`number | null` que 1308 dejó previsto se llenó solo. La captura es **mensual** (el proveedor
refresca una vez al mes; consultarlo más seguido es pagar varias veces por el mismo número), acotada
al set monitoreado, con **dry-run de costo antes de gastar**. Costo real medido: **USD ~0.02 por
organización al mes**.

**Efecto en el backlog:** `TASK-1662` (keyword gap) y `TASK-1664` (keyword discovery) quedan
**`Blocked by: none`**; `1664` está in-progress. `TASK-1660` (lente Objetivos) recupera su insumo:
sin volumen no se puede aceptar un objetivo declarado sin saber *¿vale la pena?* y *¿qué tan cuesta
arriba es?*.

**Lo que este cierre le enseña a las tasks que vienen:**

1. 🔴 **La tabla de mercado nace multi-productor, y eso es una decisión de schema, no un accidente.**
   `seo_keyword_market_data` tiene clave `(normalized_keyword, location_code, language_code,
   captured_at)` y **NO** lleva FK a `seo_keyword_set_members` ni a `seo_targets`: el volumen es un
   hecho de *(keyword, país, idioma, as-of)*, y una keyword candidata todavía no es de nadie.
   `1664` y `1662` escriben en **la misma tabla** el `keyword_info` que ya viene pagado en sus
   respuestas de discovery. **Ninguna de las dos crea un segundo almacén de datos de mercado** ni un
   segundo transporte: el reader existente proyecta ambos orígenes y la UI no los distingue por tabla.
2. **Un dato que el proveedor no tiene también se escribe.** El smoke real destapó una **fuga de
   costo**: la primera versión no escribía fila cuando el proveedor no tenía la keyword, así que el
   pre-check de frescura nunca las veía y **se re-compraban en cada corrida, para siempre**. El
   modelo correcto son **tres estados**: fila ausente = nunca preguntamos · fila con `NULL` =
   preguntamos y el proveedor no tiene · `0` = demanda cero real. Ningún test con mocks podía
   atraparlo: vivía en la interacción entre el pre-check y una respuesta real que no incluye todas
   las keywords pedidas. **Todo enriquecimiento pago futuro hereda esta regla.**
3. **Una métrica del proveedor no se muestra cruda sólo porque llegó.** `keyword_difficulty` mide
   **una sola cosa** —qué tan atrincherado está el top-10 por enlaces— y colapsa a `0` en SERPs
   es-LATAM: `pintura` (135.000 búsquedas/mes en MX) y `pintura para piso` caían **ambas** en el
   mismo cajón con perfiles de top-10 opuestos. La columna se renombró **"Barrera de enlaces"**, se
   muestra en **niveles** y se **deriva del perfil real del top-10** (`avg_backlinks_info`, que venía
   gratis en cada respuesta ya pagada y se descartaba), ponderando la **diversidad de dominios
   referentes** y no el conteo de enlaces. La derivación vive **server-side, una sola vez**: si la
   regla viviera en la UI, cada superficie tendría su versión. Y `unknown` es estado propio, pintado
   **"Sin dato"** y jamás "Baja" — un hueco presentado como barrera baja afirma una oportunidad que
   nadie midió.
4. **El país dejó de ser implícito, y costó un año de serie descubrirlo.** `ISSUE-152`: el target de
   Berel medía **Chile** para una marca **mexicana** (30 búsquedas/mes de su propia marca en CL vs
   49.500 en MX) — 238 snapshots, USD ~1 pagado, y **nada en el tablero lo delataba** porque la serie
   se veía poblada y sana. Se corrigió con **target nuevo para México + pausa del de Chile**, jamás
   un cambio de `location_code` in-place: eso habría mezclado dos mercados bajo una misma serie sin
   marcador. `ISSUE-153` cerró la causa sistémica: el lane elegía mercado con un `LIMIT 1`
   silencioso; ahora **toda respuesta declara el país que sirve** y, con varios sin elegir, lo dice
   en vez de escoger callado. **Toda superficie multi-mercado del epic hereda este contrato.**

**Rollout:** worker con `GROWTH_SEO_KEYWORD_MARKET_DATA_ENABLED=true` y scheduler
`ops-seo-keyword-market-data` activo (ambos declarativos en `deploy.sh`); la tool federada
`get_seo_keyword_market_data` existe en el gateway y su exposición en producción viaja con el
próximo release `develop → main`.

## Delta 2026-08-15 — auditoría de oportunidad: el epic mide bien y actúa poco, y el backlog lo perpetúa

Siete análisis independientes con skills especializadas (oficio SEO, AEO/GEO, capacidad DataForSEO,
valor comercial, motor propio, arquitectura y economía medida contra la base real) sobre EPIC-021 +
EPIC-022. Documento consolidado:
**`docs/audits/platform/2026-08-15-growth-seo-aeo-module-opportunity-audit.md`**.

### El diagnóstico, con números

**El presupuesto no es la restricción activa. La instrumentación sí.** Contra USD 50/mes por cliente
autorizados, el consumo real medido es **~USD 4,51 de DataForSEO + ~USD 3 de grader**: el **15%**.
Pero entre el **15% y el 25%** de lo que sí se gasta **no se ve**.

Y el balance del backlog contradice el propio Outcome de este epic ("el módulo no puede ser sólo un
dashboard"). De las **25** tasks abiertas del dominio (*conteo corregido 2026-08-15: la primera versión decía 28,
y sus partes sumaban 27 con porcentajes que daban 96%*): **56% MEDIR · 24% MOSTRAR · 20% ACTUAR**.
De las cinco de ACTUAR, tres (`1667`→`1668`→`1669`) son `Effort: Alto` y forman **una cadena
estrictamente serial que no entrega nada intermedio**, mientras las de medir corren en paralelo.
El conjunto exacto: MEDIR = 1311·1312·1313·1314·1315·1316·1317·1426·1651·1655·1662·1670·1694·1695 ·
MOSTRAR = 1658·1660·1672·1690·1691·1693 · ACTUAR = 1667·1668·1669·1673·1692.
Había **siete tasks** para una segunda capa de medición (`1311`…`1317`, todas P3 y todas
`UI impact: none` — *matiz corregido: sí declaran consumers entre ellas; lo que ninguna declara es un
consumer **visible con ID de task**, todas dicen «follow-up ui-ux posterior» sin reservarlo*) y
**cero** para las siete palancas de mejor retorno que la auditoría cuantificó.

Síntoma concreto: el único lugar del producto donde le hablamos de acción al cliente —el bloque
"Qué revisar ahora" de `/growth/seo`— son **tres frases fijas de copy** que no leen un solo dato de
ese cliente.

### Tres defectos confirmados en producción (no son oportunidades)

1. **`message_alignment` se calcula contra un posicionamiento que nunca se entrega al modelo.** 10
   puntos del score client-facing salen de que el modelo infiera cuál es el "posicionamiento real".
   El dato existe cacheado en `brand_intelligence.whatTheBrandDoes`. → `TASK-1698`.
2. **El grader le compra a DataForSEO fuera del ledger** declarado como fuente única, y su
   "presupuesto" cuenta corridas × USD 0,50 en vez de dólares: una org contratada puede gastar
   USD 17,60/mes sin ningún gate. → `TASK-1696`. ✅ *Cerrado en código el 2026-08-27: el grader compra
   dentro del ledger con `consumer='aeo'` y existe `resolveAeoBudget`, el presupuesto en dólares
   per-org. **El gate todavía no bloquea** — nace en shadow con sus dos flags OFF; prenderlo es
   rollout, no código.*
3. **14 deep imports (7 rutas) `growth/seo` → `ai-visibility`** contra una regla declarada en §17.3 de la
   arquitectura del módulo, sin ninguna lint rule que lo vea. → `TASK-1697`.

Y un **incidente**: un run terminado sin score mostró "El informe se está preparando… vuelve en unos
minutos" **durante 15 días a Grupo Berel**. Estaba enterrado como Slice 1 de `TASK-1425` (P2,
bloqueada). Se extrajo a **`ISSUE-155`**.

### La regla motor propio vs proveedor (directiva del operador)

**El motor propio gana los empates y gana donde alcanza; el proveedor gana donde mide mejor de
verdad.** Prohibido elegir por inercia hacia cualquier lado.

- **Comprar siempre:** posición SERP, volumen/dificultad/clickstream, backlinks de terceros, AI
  Overviews (Google no expone API), crawl a escala, parseo de contenido, Core Web Vitals de campo.
- **Construir siempre:** juicio de citabilidad por URL, exactitud de lo que la IA dice de la marca,
  percepción en los cuatro chatbots. **No existe producto que lo venda.**
- **Y el hallazgo que reconcilia ambos:** el proveedor **no compite con el motor propio, lo
  abarata**. Parsear 100 URLs cuesta USD 0,015 y ahorra hasta USD 2,80 de tokens — retorno 28×–187×.
  Regla operativa: *nunca le mandes a un modelo un byte que un parseo de USD 0,00015 podía haber
  comprimido.*

**Distinción que se graba como contrato** (`TASK-1703`): el **eje herramienta** (extracción, juicio
interno) sí se abarata cambiando de modelo; el **eje cobertura** (qué motores se observan) NO — el
92% del gasto del grader es OpenAI + Anthropic y eso es cobertura: cambiarlo es dejar de medir dos
de los cinco motores mientras el número del reporte se ve igual de sano. La cobertura sólo se
abarata por cadencia y muestreo (`TASK-1704`).

### Decisiones de arquitectura adoptadas

- **No hay "motor de medición canónico".** Dominios separados para siempre; se extrae un primitive
  mucho más chico: `growth/site-substrate` (fetcher SSRF + parseo). **Regla: se comparte cómo se
  OBTIENE la evidencia; nunca cómo se JUZGA.** Fusionar los scoring es una puerta de una sola
  dirección — recalibrar SEO invalidaría reportes AEO ya entregados.
- **La cola priorizada es un aggregate persistido**, no un reader en vivo, y su score son **clics
  incrementales sobre la curva de CTR del propio sitio** — una unidad que el cliente puede verificar
  en su propio Search Console. ⚠️ *Corregido 2026-08-15: la primera redacción decía «la única unidad»
  y sugería que ninguna otra herramienta puede hacerlo. **Es falso**: Semrush, Ahrefs, SEOClarity,
  Conductor y BrightEdge conectan Search Console y varias ya muestran quick wins con ganancia
  proyectada. Lo diferenciable NO es la métrica —eso es table stakes— sino (a) que la curva de CTR
  sale del **propio sitio** y no de una tabla de industria, lo que absorbe la depresión por AI
  Overviews de ese vertical, y (b) que el **mismo score ordena cuatro orígenes distintos**, incluido
  el gap AEO, dentro de la plataforma donde además viven la decisión, la acción y su resultado. Una
  herramienta entrega una lista; no registra que la decidiste, quién, ni qué pasó después.*
  **Prohibido ordenar por volumen estimado cuando
  existe demanda medida**: es el invariante ●/◑ aplicado al ORDENAMIENTO, no sólo a la
  visualización.
- **La cola llega antes que `TASK-1669`.** Es el modo de falla #1: dos ordenamientos que discrepan y
  un operador que ve un #1 en la pantalla y otro en el plan del día.

### Carril nuevo — Instrumentación, sustrato y autoridad de orden (creado 2026-08-15)

- `TASK-1696` — ledger con dimensión de consumidor + gate USD per-org del grader. **P0.** Nace en
  shadow. Desbloquea todo lo que gaste. ✅ **complete 2026-08-27**, `code complete, rollout
  pendiente`: la plomería está viva (dimensión de consumidor + base de costo en un solo ledger,
  `resolveAeoBudget`, tres señales, lane + tool MCP) y el gate sigue **en shadow**, con sus dos flags
  OFF en los dos runtimes.
- `TASK-1697` — `growth/site-substrate` + barrel de dominio AEO + lint rule cross-domain. **P0.**
- `TASK-1698` — posicionamiento declarado (`●`) / observado (`◑`) para `message_alignment`. **P0.**
- `TASK-1699` — persistir el top-N del SERP que ya se paga. **P0.** *Único trabajo del plan con
  costo de demora irrecuperable: el SERP de ayer sólo se recompra.*
- `TASK-1700` — cola priorizada como aggregate persistido con score versionado. **P0.**
- `TASK-1701` — `analyzeUrlContent`: hechos por URL, cero score.
- `TASK-1702` — señales deterministas de citabilidad + recomendación anclada a URL.
- `TASK-1703` — router cheap-first del eje herramienta (y el contrato herramienta/cobertura).
- `TASK-1704` — cadencia y muestreo declarados: AIO no diario, N≥3 donde la calibración lo exige.
- `TASK-1705` — cosecha de la capacidad OnPage ya pagada (USD 0, gratis 30 días post-crawl).
- `TASK-1706` — el alta de keyword es un compromiso de gasto.
- `TASK-1707` — rollout del re-grade recurrente multi-runtime.
- `TASK-1708` — estacionalidad: la serie de 12 meses que ya viene en `keyword_info`.
- `TASK-1709` — carril de diagnóstico de prospecto SEO. *100 diagnósticos ≈ USD 50.*

### Tasks congeladas, con disparador nombrado (ninguna se mata)

> **Corrección 2026-08-15:** el argumento hablaba de «7 tasks congeladas» incluyendo a `TASK-1311`.
> **`TASK-1311` NO está congelada: fue ampliada** (alcance sube a URLs de terceros) y sigue P3 con
> `Blocked by: none`. Las congeladas son **6** —`1312`-`1317`— más `TASK-1281`, que es de EPIC-020 y
> entró al conteo por coincidencia numérica.
>
> 🔴 **Y el caso de `1311` es el opuesto al que contaba el argumento:** `TASK-1667` (P1) declara en su
> contrato el campo **no-nullable** `categoryAnswerPages` producido por `1311`, la pone en Out of
> Scope y **no la lista como blocker**. O `1667` entrega ese array siempre vacío —campo decorativo— o
> está bloqueada de hecho por una P3. `1311` no necesita descongelarse: **necesita subir de prioridad,
> o `1667` debe declarar ese campo degradable.** Lo mismo con `targetUrl`, producido por `TASK-1702`.

| Tasks | Razón | Disparador para descongelar |
|---|---|---|
| `TASK-1281` | Su premisa está superada: Core Web Vitals se resuelve con CrUX gratis (campo) contra headless propio (lab, caro y peor) | Que la mitad **WebMCP**, que no tiene sustituto gratis, se demuestre necesaria sola |
| `TASK-1315`/`1316`/`1317` | `1316` es un assessment LLM que **produce score**, y choca con el invariante adoptado (lo que puntúa es determinista). Cadena de 3 bloqueos en serie, toda P3, sin consumer visible | `TASK-1702` en producción **y** re-escritura con los pilares como juicio `◑` que no mueve ningún número |
| `TASK-1312`/`1313`/`1314` | El cluster **declarado** traslada el cuello de botella humano a la capa de cluster: con 8 cuentas esa curación no ocurre nunca, y `1314` —donde está el valor— queda bloqueada detrás de ella. La mitad barata (agrupación derivada) se extrae al contrato de candidatos y a la cola | Cierre del carril editorial con volumen real de work items |

### Contratos a declarar antes de escribir código

Cinco son puertas de una sola dirección: `priority_score_version` + `score_breakdown_json` en el
**primer** slice de la cola · vocabulario cerrado de `origin` (CHECK) + `evidence_ref` opaca ·
`consumer` + `cost_basis` + `price_table_version` en el ledger · `analyzeUrlContent` emite hechos y
cero score · la carta de `site-substrate` (no importa `growth/*`, no persiste nada). Los tres
restantes: contra qué posicionamiento juzga `message_alignment` y su marca de procedencia · política
de bump de versión del cerebro AEO (**hay tres bumps en vuelo**: `1698`, `1695`, `1703`, y cada uno
invalida el golden set) · la distinción eje-cobertura / eje-herramienta.

### Higiene documental que sale de la auditoría

`docs/context/06_glosario-metricas.md:77,224` declara **Otterly.ai** —la herramienta de un
competidor— como *fuente de verdad* del AEO Citation Rate, y ese contrato de métricas viaja a
propuestas y SOWs. Retirarlo cuesta cero. **Y el margen de Berel: el bloqueo estaba MAL DECLARADO** (corregido 2026-08-15 tras verificación
contra la base real). No falta construir nada: la capa V0 está **viva y fresca** —
`client_labor_cost_allocation`, `member_capacity_economics` (materializada el 2026-08-15 14:02),
`client_economics`, su reader y el write path de asignaciones en `/agency/team`—. La prueba: en el
mismo período, **Sky Airline rinde 59,97% de margen bruto con 3,00 FTE** y Berel rinde labor 0 porque
**tiene cero filas en `client_team_assignments`**. Falta escribir 3-4 filas desde una UI que ya
existe: **1-2 horas de captura operativa, no una task**.

Y la decisión de precio **ni siquiera lo necesita**: el punto de quiebre del piso de 45% está en
**1,93 FTE dedicados**, unas 11× la huella de entrega observada (con overhead a full absorption,
0,98 FTE, todavía 5,7×). **La decisión es robusta a un error de 5× en la estimación**, así que
desagregar y cobrar la línea AEO (+31% de ingreso sobre la cuenta contra USD 4,9 de costo
incremental) **está desbloqueado hoy**.

⚠️ **Trampa al capturar:** la VIEW prorratea por FTE y excluye los assignments a Efeonce del
denominador. Agregarle Berel a alguien que hoy tiene Sky 1,0 sube su `total_fte` y **baja
artificialmente el costo laboral de Sky ~17%**. No es un bug: es la aritmética del modelo. Hay que
recomputar y comunicar **ambos clientes juntos**, o alguien va a leer "Sky mejoró" y estará leyendo
humo.

### Acción operativa pendiente — captura de FTE de Berel (NO es una task)

**Qué:** declarar 3-4 asignaciones de personas a Grupo Berel
(`cli-0863869c-eaac-4630-9bd0-af283c56f7fb`) desde `/agency/team` → `AssignMemberDrawer`
(`POST /api/admin/team/assignments`, UI y write path ya existentes).

**Por qué no es una task:** no hay nada que construir. El motor corre, está fresco, y produce el
margen de Sky en el mismo período. Falta el insumo, no la maquinaria.

**Quién:** cuenta/delivery de Berel declara el FTE por persona; Finance verifica el recompute.
**Insumo para decidir el FTE:** el reparto real de tareas de julio 2026 en `greenhouse_delivery.tasks`
(274 tareas de Berel desde junio; en julio Daniela 53 de sus 497, Julio Reyes 8 de 12, María Fernanda
1 de 36) traducido con `fte_hours_guide`. **No** hay captura de horas en el sistema y no debe
construirse: el modelo canónico pide **FTE declarado**, no horas.
**Esfuerzo:** 1-2 horas. **Sin código.**

**El recompute se dispara solo:** `assignment.created` / `assignment.updated` / `assignment.removed`
ya están en `CLIENT_ECONOMICS_TRIGGER_EVENTS` (`src/lib/sync/projections/client-economics.ts:155-161`)
y la lane reactiva `ops-reactive-cost-intelligence` corre cada 10 min. No hace falta llamar ningún
cron a mano.

🔴 **Comunicar Sky en el mismo movimiento** (ver la trampa del denominador arriba).

⚠️ **Y leer el resultado con el asterisco de `ISSUE-157`:** el margen que salga es **bruto sin
absorción de overhead**, porque la distribución está en cero desde mayo. El umbral real del piso de
45% no es 1,93 FTE sino ~0,98 con overhead al último nivel conocido.

### Lo que la auditoría NO autoriza

No cambia el estado `validation_only` del epic ni su `Non-goal` de venderlo como producto autónomo.
No autoriza fusionar scores SEO y AEO en un número único: **la ortogonalidad es lo que se vende**
—rankear #1 sin ser citado es la señal, no el ruido—. No autoriza prometer comparativa competitiva
(`seo_competitors` sigue sin consumidores), tendencia de citación IA (**no** porque el re-grade esté
pausado —**no lo está**, `deploy.sh` lo declara `true` en ambos entornos— sino porque falta el
command que inscribe perfiles: `recurring_regrade_enabled` no tiene writer), ni atribución de
ingresos a citación en IA (no existe el modelo).
