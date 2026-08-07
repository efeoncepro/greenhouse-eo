> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.6
> **Creado:** 2026-08-05 por Claude (TASK-1299 + TASK-1301)
> **Ultima actualizacion:** 2026-08-07 por Claude (TASK-1308 pantalla de Oportunidades de keywords: verificada contra la pantalla construida y sacada de la lista de pendientes)
> **Documentacion tecnica:** [GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md)

# Modulo SEO — Search Visibility 360 (Growth)

## Que es

El modulo SEO es la mitad "buscadores clasicos" de **Search Visibility 360**: mide cómo le va a una marca en Google y otros buscadores a lo largo del tiempo — en qué posición aparece por cada keyword que importa, qué tan sano está su sitio a nivel técnico, y cómo evoluciona su perfil de enlaces. La otra mitad de Search Visibility 360 es el [AI Visibility Grader](ai-visibility-grader.md) (AEO), que mide lo mismo pero en los motores de respuesta de IA (ChatGPT, Claude, Perplexity, Gemini).

La idea central es que la visibilidad no es una foto: es una **serie de tiempo**. El valor del módulo no está en saber "hoy estás en la posición 7", sino en poder mostrar "hace tres meses estabas en la 15, hoy estás en la 7, y este competidor te está alcanzando". Por eso todo el modelo de datos está construido como mediciones append-only: cada captura se guarda y **nunca** se edita ni se borra.

Este documento describe el estado real al 2026-08-05: están construidas las tres primeras capas (modelo de datos, modelo de acceso y la primera captura automática — la serie diaria de Google Search Console). Las capturas pagadas (rankings, site audit, backlinks) y toda la UI llegan en las tasks siguientes de `EPIC-022`.

## Que existe hoy

### 1. El modelo de datos de serie temporal (TASK-1299)

El schema `greenhouse_growth` guarda dos familias de tablas con reglas distintas:

**Configuración** (qué se mide — mutable, con membresía versionada):

| Tabla | Qué guarda |
|---|---|
| `seo_targets` | Qué dominio trackea cada organización, con mercado (país + idioma). |
| `seo_keyword_sets` | Grupos nombrados de keywords por target (ej. "Marca", "Producto X"). |
| `seo_keyword_set_members` | Las keywords de cada grupo, con tags y vigencia `effective_from`/`effective_to`. Una keyword que deja de trackearse **se cierra con fecha, nunca se borra** — así la historia sigue siendo interpretable. |
| `seo_competitors` | Dominios competidores por target, con la misma disciplina de vigencia. |

**Mediciones** (qué se midió — append-only, inmutables, con triggers que rechazan UPDATE/DELETE):

| Tabla | Qué guarda |
|---|---|
| `seo_rank_snapshots` | Una fila por keyword × motor × dispositivo × fecha de captura: posición, URL que rankea, features del SERP, tráfico estimado y costo del proveedor. |
| `seo_site_audit_runs` | Una fila por crawl técnico del sitio (health score, páginas crawleadas, estado `running/succeeded/degraded/failed`). |
| `seo_site_audit_findings` | Los hallazgos de cada crawl (URL, tipo de problema, severidad `critical/warning/notice`). |
| `seo_backlink_snapshots` | Snapshot semanal del perfil de enlaces (dominios referentes, total de backlinks, domain rank, share tóxico). |

La separación importa porque el negocio de cada familia es distinto: la configuración responde "¿qué estamos midiendo y desde cuándo?"; las mediciones responden "¿qué pasó cada día?". Un snapshot jamás se corrige — si una captura salió mal, se degrada o se marca, pero la historia no se reescribe.

> Detalle técnico: [GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md §4](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md) (modelo de datos, decisión temporal, split PG ventana caliente / BigQuery historia larga). Migración TASK-1299 en `migrations/`.

### 2. El modelo de acceso per-org con tiers y cupos (TASK-1301)

El SEO se habilita **por organización, no por rol** (misma lección del AEO: un rol no se factura; un módulo asignado a una org sí). Tiene tres piezas:

- **Capabilities `growth.seo.*`** — 5 permisos finos: configurar targets (`target.configure`), disparar audits (`audit.run`), leer observaciones (`observation.read`), leer el reporte cliente (`report.read_client`, scope `own`) y administrar el entitlement (`entitlement.manage`, solo `EFEONCE_ADMIN` + `EFEONCE_ACCOUNT`).
- **Módulo per-org `seo_v1`** — vive en el catálogo `greenhouse_client_portal.modules`; una org tiene SEO cuando existe un assignment activo en `module_assignments`. El **tier comercial** va en `metadata_json.seo_tier`: `contracted`, `trial` o `pilot`.
- **Chokepoint único `enforceSeoRunEntitlement`** — la única puerta por la que pasa cualquier corrida que gasta dinero (DataForSEO cobra por llamada). Evalúa en cadena: ¿hay assignment? → ¿no está vencido? → ¿queda cupo de site-audits del mes? → ¿queda presupuesto USD del mes? Si algo falla, devuelve un `blockedReason` explícito (`no_entitlement` / `expired` / `quota_exhausted` / `budget_exhausted`). Es consumer-agnóstico: la misma puerta sirve para UI, Nexa, la lane `app` y la lane `ecosystem`/MCP.

Los cupos por tier salen de env-knobs con defaults sanos:

| Tier | Site-audits / mes | Presupuesto USD / mes |
|---|---|---|
| `contracted` | 8 | $50 |
| `trial` | 1 | $2 |
| `pilot` | 2 (override por org vía `metadata_json.seo_audit_runs_per_month`) | $10 |

El presupuesto consumido se calcula sumando el `provider_cost` de los snapshots del mes — o sea, el gasto real registrado en la serie temporal, no un contador aparte (eso cambia de fuente cuando exista `seo_provider_spend_daily` en TASK-1300).

> Detalle técnico: [GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md §9](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md) (entitlements) · chokepoint en [`src/lib/growth/seo/entitlement.ts`](../../../src/lib/growth/seo/entitlement.ts) · sanity live [`scripts/growth/_sanity-seo-entitlement.ts`](../../../scripts/growth/_sanity-seo-entitlement.ts).

### 3. La serie propia de Search Console (TASK-1302)

Hasta ahora, ver los datos de Google Search Console significaba **preguntarle a Google en el momento**. Eso tiene dos problemas de fondo: Google solo conserva 16 meses de historia, y no se puede comparar "hoy contra hace un año" si nadie guardó ese año. Search Visibility 360 vende serie de tiempo, así que depender de la memoria de Google era una promesa que no se podía cumplir.

TASK-1302 convierte esa consulta en vivo en una **serie propia de Greenhouse**: todos los días se guarda una foto de qué consultas trajeron clics e impresiones y a qué página llegaron, y esa foto ya no se pierde cuando Google la olvida. La foto se guarda por organización (la marca), no por configuración de SEO — el dato es de la marca y sobrevive a cualquier cambio en qué keywords se están trackeando.

**Cómo corre.** Una vez al día, a las 9:00 de Santiago, un trabajo programado recorre todas las organizaciones que tienen su Search Console conectada y guarda lo que Google publicó. No usa presupuesto de proveedor: los datos de Search Console son gratis y vienen de la propia propiedad del cliente.

**Los cuatro comportamientos que hay que entender:**

1. **Se materializa una ventana móvil de 5 días, no "ayer".** Medido en vivo: Google **no publica el día anterior** — si se le pregunta por D-1 responde sin datos, y recién D-2 trae información. Además Google consolida sus propias métricas con alrededor de 48 horas de retraso, así que volver a capturar un día reciente **corrige** los números en vez de duplicarlos. Un trabajo que apuntara solo a "ayer" habría escrito un día vacío cada vez, para siempre, reportando éxito. Re-ejecutar es seguro por diseño.
2. **Un día sin datos no se inventa.** Si Google responde sin filas, no se escribe nada. Un día vacío y un día que falló son **estados distintos y visibles**; nunca aparecen ceros fantasma que después alguien lea como "ese día no hubo tráfico".
3. **Si una organización falla, las demás siguen capturando.** Un token revocado de un cliente no puede frenar la captura del resto: esa serie no se puede reconstruir después, porque la ventana de Google se cierra. La organización que falla queda registrada como tal y se reintenta al día siguiente.
4. **Sin conexión activa, la organización se salta.** No es un error silencioso: es una degradación explícita con motivo (`no conectado`, `token no sano`, `consulta falló`).

**Qué se puede leer con esa serie.** Sobre estos datos vive el primer reader del módulo: las **oportunidades de "distancia corta"** (striking distance) — las consultas donde la marca ya aparece pero un poco más abajo de donde convierte. Dos cosas lo hacen distinto de una lista genérica:

- **El score se expresa en clics incrementales estimados**, no en un puntaje abstracto. Y se calcula con la **curva de CTR de la propia organización** — cuánto suele hacer clic la gente en *ese* sitio en cada posición — no con una tabla de industria. Eso importa porque los AI Overviews de Google están cambiando cuánto tráfico deja cada posición, y ese efecto real ya está adentro del número.
- **Las oportunidades marcadas como "canibalizadas"** (la misma consulta traccionando más de una página del sitio) piden una acción **distinta**: consolidar — unificar o redirigir esas páginas — no optimizarlas. No es una variante del mismo consejo; es otro trabajo.

**Estado live (2026-08-05):** la serie está corriendo con datos reales. Primera marca capturada: `sc-domain:berel.com`, con 26.192 filas guardadas cubriendo 4 días y 375 consultas identificadas en distancia corta.

**Cómo se opera y dónde se ve.** La operación de la serie (verificar la corrida, re-materializar un día puntual, revertir) sigue siendo por línea de comandos y logs: el paso a paso está en el manual [Operar la serie diaria de Search Console](../../manual-de-uso/growth/operar-serie-search-console.md). Lo que la serie produce ya tiene pantalla: el cockpit **Resumen** (TASK-1306) y **Oportunidades de keywords** (TASK-1308, más abajo), que es la superficie de este reader.

> Detalle técnico: [GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md) · materializador y batch en [`src/lib/growth/seo/`](../../../src/lib/growth/seo/) · reader de oportunidades en [`src/lib/growth/seo/keyword-opportunities-reader.ts`](../../../src/lib/growth/seo/keyword-opportunities-reader.ts) · la conexión de origen es la de [Conexion a Google Search Console](conexion-search-console.md).

### 4. La captura diaria de rankings y su serie de evolucion (TASK-1303 — ACTIVA en produccion)

La segunda captura automatica del modulo: cada madrugada (05:00 Chile), para cada organizacion con el modulo `seo_v1` asignado, el sistema le pregunta a Google (via el proveedor DataForSEO) **en que posicion exacta aparece el dominio para cada keyword trackeada** — incluyendo si el resultado trae AI Overview u otras features del buscador. Cada medicion se guarda como una fila inmutable en `seo_rank_snapshots` y se espeja automaticamente a BigQuery (`greenhouse_growth_analytics.seo_rank_history`) para conservar la historia larga.

Piezas clave, en lenguaje simple:

- **Esta captura cuesta dinero** (cada consulta a DataForSEO se paga, ~USD 0.01 por keyword al dia). Por eso pasa SIEMPRE por el control de presupuesto por organizacion antes de gastar, y ademas re-verifica el presupuesto cada 10 consultas dentro de una misma corrida — si el presupuesto del mes se agota a mitad de la corrida, el resto se frena y queda registrado como frenado, no como error misterioso.
- **Repetir la corrida el mismo dia no gasta de nuevo**: lo ya capturado hoy se detecta antes de consultar al proveedor.
- **Una keyword donde el dominio no aparece igualmente se registra** (posicion vacia): "no rankeo hoy" es un dato de la serie, no un error.
- **El reader de evolucion** (`readRankEvolution`) devuelve la pelicula: por keyword, la lista de fechas con posicion y URL. Rangos de hasta 6 meses salen de la base operativa; rangos mas largos, de la historia en BigQuery. Esta serie es la de mercado (posicion exacta) y **nunca se mezcla ni promedia** con la serie de Search Console (posicion promediada del propio dominio) — son fuentes distintas que se leen juntas recien en la capa de reporte.
- **Ya se puede consultar por MCP**: la tool `get_seo_rank_evolution` quedo registrada en el mismo PR (mandato parity), junto a las tres de TASK-1645.

**Estado real (2026-08-06):** la captura esta **ACTIVA en produccion**. El cron nacio pausado a proposito (el costo del proveedor es el riesgo #1 del programa) y se habilito el mismo 2026-08-06 tras verificar la cadena completa con dinero real: smoke E2E con Berel (captura → gate de costo → ledger → mirror BigQuery → reader). El scheduler corre todos los dias a las 05:00 de Santiago, y la primera serie real ya existe: **Berel con 31 keywords** — la marca en #1 y "pintura para alberca" en #2 **con AI Overview presente** en el SERP. La señal `seo.rank.capture_lag` en `/admin/operations` vigila que la serie siga corriendo (warning si un target elegible deja de capturarse). El paso a paso para operar, verificar y revertir esta en el manual [Operar la captura diaria de rankings](../../manual-de-uso/growth/operar-captura-rankings-seo.md).

> Detalle tecnico: command y batch en [`src/lib/growth/seo/rank-capture.ts`](../../../src/lib/growth/seo/rank-capture.ts) y [`rank-capture-batch.ts`](../../../src/lib/growth/seo/rank-capture-batch.ts) · reader en [`rank-evolution-reader.ts`](../../../src/lib/growth/seo/rank-evolution-reader.ts) · mirror en [`rank-history-bq-mirror.ts`](../../../src/lib/growth/seo/rank-history-bq-mirror.ts) · arquitectura §8 de [GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md).

## El site audit tecnico y el perfil de enlaces (TASK-1304)

Las otras dos preguntas del modulo — "¿qué está roto técnicamente?" y "¿qué te
enlaza?" — se responden con dos capturas semanales:

- **Site audit (OnPage)**: un crawl del sitio del cliente que produce un puntaje de
  salud (0–100), el conteo de páginas crawleadas y una lista de hallazgos agrupados por
  severidad (críticos, advertencias, avisos): páginas rotas, canonicals mal apuntados,
  títulos/descripciones faltantes o duplicados, datos estructurados con errores, etc.
  Como el crawl puede tardar de minutos a horas, funciona en **dos fases**: un proceso
  encola el crawl (lunes de madrugada) y otro pasa cada 30 minutos preguntando si
  terminó; cuando termina, guarda el resultado exactamente una vez. Un audit que
  termina **sin hallazgos** significa "sitio técnicamente limpio" — nunca se confunde
  con un crawl que falló.
- **Snapshot de backlinks**: una foto semanal del perfil de enlaces — cuántos dominios
  enlazan al sitio, cuántos enlaces en total, el rank del dominio en escala 0–100
  (comparable con el DR/DA de otras suites), qué proporción del perfil es tóxica y
  cuántos enlaces se ganaron/perdieron en los últimos 30 días.

Ambas corridas cuestan dinero del proveedor y pasan por el mismo chokepoint de cupos y
presupuesto; el site audit además consume el **cupo mensual de audits** del tier. Los
resultados se consultan con los readers `readSiteAuditReport` y `readBacklinkProfile`,
por MCP (`get_seo_site_audit_report`, `get_seo_backlink_profile`) y — cuando llegue
TASK-1309 — en la UI del portal. La señal `seo.audit.stuck_tasks` en `/admin/operations`
vigila que ningún crawl quede colgado.

**Estado real (2026-08-06):** código completo y verificado con un smoke real
(crawl acotado + snapshot de backlinks con dinero real), pero los tres schedulers
**nacen pausados** hasta el rollout. El paso a paso está en el manual
[Operar el site audit y los backlinks](../../manual-de-uso/growth/operar-site-audit-backlinks-seo.md).

> Detalle tecnico: commands y readers en [`src/lib/growth/seo/site-audit/`](../../../src/lib/growth/seo/site-audit/) y [`backlinks/`](../../../src/lib/growth/seo/backlinks/) · handlers y schedulers en `services/ops-worker/` · arquitectura §6–§8 de [GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md).


## 5. El cockpit Overview: la primera pantalla del modulo (TASK-1306)

`/admin/growth/seo` es la puerta de entrada operador del modulo y la casa de la seccion
local **Search Visibility** (pestañas Resumen · Rendimiento · Keywords · Auditoria).
Responde una sola pregunta: **¿como esta la salud de busqueda de este Space y que necesita
atencion hoy?**

**Que muestra**

| Zona | Que responde |
|---|---|
| Selector de Space + chip de frescura | Sobre que cliente miras y hasta que dia llegan los datos medidos |
| Leyenda medido / estimado | De donde sale cada numero |
| 4 KPIs norte | Clics, impresiones, posicion promedio y CTR del periodo |
| Evolucion de visibilidad | Como se movieron los clics y la posicion en el tiempo |
| Salud del sitio | Puntaje tecnico de la ultima auditoria + hallazgos por severidad |
| Movimientos de la semana | Keywords que subieron o bajaron 5 posiciones o mas |
| Rankean pero la IA no las cita | Donde apareces en Google pero no en respuestas de IA |

**Quien la ve.** Hacen falta tres cosas a la vez: un rol con la vista habilitada
(`efeonce_admin` o `ai_tooling_admin`), el permiso `growth.seo.observation.read`, y que el
Space tenga el modulo SEO contratado. Si falta lo tercero, el Space no aparece en el
selector. Con el modulo apagado por flag, la ruta directamente no existe (404).

**Las reglas de honestidad que codifica**

- **La posicion funciona al reves.** Pasar de la posicion 8 a la 3 es mejorar: la flecha
  hacia abajo se pinta **verde** y el texto lo dice; no se deja al color.
- **Sin Search Console no hay panel.** Se muestra un aviso accionable, nunca ceros: un
  cero significa "medimos y dio cero", cuando la verdad es "no medimos".
- **Medido no es estimado.** Search Console es dato real del sitio; el proveedor externo
  es estimacion de mercado. Se marcan distinto y **nunca se promedian**.
- **Si falta un dato, dice que falta y por que.** Cada tarjeta del panel derecho degrada
  por separado: si la auditoria no responde, esa tarjeta dice "Pendiente: ..." y las
  otras dos siguen funcionando.
- **Si no hay con que comparar, no se inventa la comparacion.** Un Space recien conectado
  no muestra flechas de variacion porque no existe un periodo anterior con datos.
- **SEO y AEO nunca se funden.** Rankear primero y no ser citado por la IA es una señal de
  negocio, no un error a reconciliar en un puntaje unico.

**Que NO hace.** No edita keywords ni configuracion, no dispara analisis nuevos (relee lo
guardado, sin gastar presupuesto de proveedor), no muestra dos Spaces a la vez, y no es la
pelicula por URL (esa es la pestaña **Rendimiento**, TASK-1307, todavia en construccion —
las pestañas hermanas aparecen deshabilitadas hasta que existan).

> Detalle tecnico: la surface es consumidora de solo lectura de los readers gobernados de
> `src/lib/growth/seo/**`. El mismo calculo de KPIs lo consumen Nexa y el lane MCP
> (`get_seo_overview_kpis`) por construccion — no hay una segunda implementacion.

## Que NO existe todavia

Lo siguiente aún no está construido (las series que ya se llenan: Search Console live; rankings live desde el 2026-08-06). **Sí existen ya** — además del schema y el modelo de acceso — el cruce SEO ↔ AEO (`readSeoAeoGap` + matriz quadrant 360, TASK-1305) y la **operación por MCP live en producción desde el 2026-08-06**: lane ecosystem + 3 tools read-only (`get_seo_entitlement`, `get_seo_keyword_opportunities`, `get_seo_visibility_360`) en el MCP interno de Greenhouse (TASK-1645, ver el [manual del MCP](../../manual-de-uso/plataforma/mcp-greenhouse-read-only.md) §8) **y federadas al gateway público `mcp.efeonce.org`** (TASK-1647). La lectura funcional completa de esa capacidad está en [Search Visibility 360 por MCP](search-visibility-360-por-mcp.md). Pendiente:

| Falta | Task que lo trae |
|---|---|
| Site audit (UI) | TASK-1309 |
| Superficie cliente + Report Artifact + quadrant 360 | TASK-1310 |
| Semilla histórica de posiciones (DataForSEO Labs) + export nativo GSC→BQ por cliente | TASK-1655 (Slices 4-5) |

### La pantalla ancla: Rendimiento en el tiempo (TASK-1307, 2026-08-07)

`/admin/growth/seo/performance` (tab **Rendimiento** de Search Visibility) es la película
que justifica el módulo: eliges hasta 8 URLs o keywords y ves cómo evolucionan lado a
lado. El gráfico usa el estándar de los rank trackers — **el eje de posición va invertido
(1 arriba = mejor)** y lo dice con palabras, no solo con la geometría — con la meta top-3
dibujada, zoom temporal y el valor final de cada serie pegado a su línea. Cada serie se
distingue por color **y forma** (tipo de línea + símbolo), para que la comparación
sobreviva al daltonismo y a una impresión en blanco y negro.

Tres reglas de honestidad que la pantalla no negocia:

- **La cobertura se declara**: "N de M días con medición · desde–hasta" junto al título.
  Un período pedido de 90 días con 31 medidos se dice, no se disimula.
- **Los huecos son huecos**: un día sin medición corta la línea; jamás se rellena con un
  cero (la posición 0 no existe y "0 clics" afirmaría algo que no se midió).
- **La fuente se nombra**: posición exacta de mercado (◑ DataForSEO) o posición promedio
  medida (● Search Console). Si la serie exacta es más joven que la medida (la captura de
  rankings recién empieza), la pantalla sirve la medida y lo declara — nunca las promedia.
- La selección vive en la URL (`?keywords=`/`?urls=`): el enlace se comparte y la otra
  persona ve exactamente la misma comparación.

> Detalle tecnico: `SeoPerformanceView` + `readSeoPerformance`/`readSeoPerformanceCatalog`
> (`src/lib/growth/seo/performance/**`). Mismo reader para UI, Nexa y las MCP tools
> `get_seo_performance` / `get_seo_performance_catalog` (parity en el mismo PR). El chart
> es el primer consumer de **ECharts** (lazy por ruta — la decisión de librería del módulo).

### El histórico de verdad: BigQuery como memoria larga (TASK-1655, 2026-08-07)

El módulo nació capturando solo "hoy", y una pantalla de evolución con 5 días no se le
puede presentar a un cliente. Desde el 2026-08-07 el historial de Search Console vive en
BigQuery (`seo_gsc_history`): el batch diario espeja cada día capturado, y un backfill
por API trae hasta 16 meses de pasado por organización (gratis — la API de Google no
cobra). PostgreSQL conserva solo la ventana operativa reciente: meses de historia en la
base transaccional la engordarían sin necesidad (5 días ya pesaban 27 MB). Las pantallas
eligen sola la fuente: si la base operativa no cubre el período pedido, leen el histórico.

> Detalle tecnico: mirror + backfill en `src/lib/growth/seo/gsc-history-bq-mirror.ts` /
> `gsc-backfill.ts`; runbook del backfill en
> [`backfill-historico-gsc.md`](../../manual-de-uso/growth/backfill-historico-gsc.md);
> delta de arquitectura en `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §4.

Además: el alta del módulo `seo_v1` a una organización sigue siendo un **paso operativo manual** — ver el manual [Asignar el módulo SEO a una organización](../../manual-de-uso/growth/asignar-modulo-seo-organizacion.md).

Sobre el interruptor general `GROWTH_SEO_ENABLED`: está **encendido desde el 2026-08-05** y es **multi-runtime** — lo leen dos procesos distintos con su propia copia de la variable: el trabajador de fondo (`ops-worker`, para la captura diaria de Search Console) y el portal en Vercel (para el lane que sirve las consultas por MCP). Encenderlo en un solo runtime deja el otro camino muerto. Desde el 2026-08-06 está en `true` en Vercel Production. Encenderlo no gasta presupuesto: la captura de Search Console es gratis y las consultas por MCP son de lectura. Las corridas que **sí** cuestan dinero (rankings, site audit, backlinks) siguen exigiendo el assignment `seo_v1` de la organización y pasan por el chokepoint de cupos y presupuesto.

### Oportunidades de keywords: donde crecer en busqueda (TASK-1308, 2026-08-07)

La tercera pantalla del modulo (`Growth > SEO > Keywords`) responde una sola pregunta: **que keyword
persigo primero**. Muestra las busquedas donde el sitio ya aparece entre las posiciones 8 y 20 — ya
existe pagina y ya existe relevancia, falta el empujon — y las ordena por los clics adicionales que
ganaria cada una si subiera.

**Que se ve**

| Elemento | Que dice |
|---|---|
| Banda de veredicto | Lo primero de la pantalla: el hallazgo dominante en una frase redactada desde el reparto real ("42 de 50 keywords compiten contra tu propio sitio") y los clics totales que estan sobre la mesa. Si ningun grupo domina, describe el conjunto en vez de inventar una conclusion. |
| Los tres segmentos de esa banda | Son la leyenda del mapa **y** el filtro por accion, en un solo objeto. Su ancho es proporcional al conteo, para que un reparto de 42 · 6 · 2 se vea sin leer los numeros. |
| Mapa de oportunidad | Cada burbuja es una keyword. Mas a la izquierda, mas cerca de la primera plana. Mas arriba, mas gente la busca. Mas grande, mas clics ganarias. Se puede plegar: la primera vez se quiere el mapa, la decima ya se sabe que se busca y se quiere la lista. |
| Zona sombreada "Primera plana" | Las posiciones 8 a 10. Marca un **hecho posicional, no una accion**: dentro caen tambien keywords canibalizadas, que se consolidan. |
| Forma y color | La accion recomendada, que no es la misma para todas (ver abajo). La forma existe para que la lectura sobreviva al daltonismo y al monocromo; la misma etiqueta va en texto en la tabla. |
| Tabla | Los valores exactos de cada keyword, la pagina que rankea hoy (abrible) y la columna **Seguimiento**. Ordenada por ganancia estimada, reordenable por columna y paginada de a 25. |

**Tres acciones, no tres severidades.** El modulo no clasifica las keywords por "que tan buenas son"
sino por **que hay que hacer con ellas**, porque son trabajos distintos:

- **Empujar (fruta madura)** — posicion 10 o mejor. Ya estas en la primera plana, falta subir dentro de ella.
- **Empujar (a un paso)** — posicion 11 a 20. La segunda plana; llegar a la primera es el salto de mayor retorno.
- **Consolidar** — mas de una pagina tuya compite por esa busqueda y se diluyen entre si. **No se optimiza:
  se consolida** (unificar, redirigir, canonical o diferenciar la intencion). Es otro trabajo, con otro dueño.

**De donde sale el dato, y que todavia no esta.** Todo lo que se ve esta **medido por Search Console**:
son las impresiones y posiciones reales de la busqueda del propio cliente. El enriquecimiento externo
de *volumen* y *dificultad de mercado* aun no esta habilitado, y mientras eso sea cierto esas dos
columnas **no se muestran**: la ausencia se declara una vez, con palabras, al pie del mapa — una
columna que no puede traer datos no gana su ancho, y repetir "sin dato" cien veces ahogaba los numeros
que la tabla existe para mostrar. Lo que **nunca** aparece es un `0`, que afirmaria que nadie busca eso.
Cuando el enriquecimiento aterrice, las columnas vuelven solas sin reescribir la pantalla. La
priorizacion no lo necesita: la demanda ya esta medida, y los ejes del mapa jamas dependieron de ese dato.

**"Seguir" cuesta plata, y la pantalla lo dice antes del clic.** Seguir una keyword la agrega al set
monitoreado, y desde ahi su posicion se mide **todos los dias** con un proveedor externo que se cobra por
consulta. Por eso: la accion solo aparece para quien tiene el permiso de configurar el target (ver el mapa
y hacer crecer la factura son dos permisos distintos), el cupo del set se muestra siempre, y al llegar al
tope el boton se deshabilita explicando por que en vez de fallar al enviarlo. Si una keyword ya estaba
seguida, volver a seguirla no hace nada ni cuesta nada.

**Y se puede deshacer.** Dejar de seguir saca la keyword del ciclo diario y libera cupo al
instante. No borra nada: la medicion historica se conserva y lo que se cierra es la ventana
de seguimiento. Se puede volver a seguir despues, pero empieza una ventana NUEVA — los dias
que estuvo fuera no se recuperan. Por eso no sirve para "pausar" algo que piensas reanudar
pronto. Tras dejar de seguir hay unos segundos para deshacer.

**Lo que ves se puede sacar del portal.** El export en CSV baja el subconjunto filtrado —
para el ticket, el SOW o el mail al cliente — y los filtros viajan en la URL, asi que la
pantalla se puede compartir ya filtrada. Un click en la keyword lleva a Rendimiento con su
serie aislada.

**Quien puede hacer que.** Ver el mapa pide `growth.seo.observation.read`; seguir o dejar de seguir pide
ademas `growth.seo.target.configure`. Sin la segunda, la columna de seguimiento y las casillas de
seleccion **no se renderizan** — un analista lee el mapa completo sin poder hacer crecer la factura.

> Paso a paso para operarla: [Oportunidades de Keywords — leer el mapa y seguir keywords](../../manual-de-uso/growth/seguir-keywords-oportunidades-seo.md).
>
> Detalle tecnico: `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §7 (commands `trackKeywords` / `untrackKeywords`)
> y §10.4 (encoding del mapa). Codigo: `src/lib/growth/seo/track-keywords.ts`,
> `src/views/greenhouse/admin/growth/seo/keywords/`. Mismos commands para la UI, el lane `app`,
> el lane `ecosystem` y las tools MCP `track_seo_keywords` / `untrack_seo_keywords` (estas ultimas
> fail-closed hasta que el scope `efeonce.mcp.seo.write` quede cableado a un cliente).

## Relacion con el AI Visibility Grader (motores hermanos)

SEO y AEO son los dos motores de **Search Visibility 360** y se diseñaron como espejo deliberado:

- **Mismo patrón de acceso:** módulo per-org (`seo_v1` / `ai_visibility_v1`) + capabilities con el mismo grano + `entitlement.manage` restringido a los mismos roles.
- **Mismo proveedor compartido:** DataForSEO, con familias de endpoints aisladas por circuit breaker para que un problema en el carril SEO no hunda el carril AEO (ni viceversa).
- **Métricas espejo:** el SoV orgánico del SEO (share of visibility en Google) es el reflejo del SoV IA del grader (share of voice en answer engines). La lectura conjunta — "¿dónde te ve Google y dónde te ven las IA?" — es el derived read `readSeoAeoGap` (TASK-1305).

Lo que **no** comparten: datos. Cada motor tiene sus tablas y su frontera; los cruces se hacen por `organization_id` en reads derivados, nunca con FKs entre schemas.

> Detalle técnico: [GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md §2](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md) (complementariedad SEO ↔ AEO) · [ai-visibility-grader.md](ai-visibility-grader.md) (doc funcional del motor hermano).

## Destino: Wave

Por decisión del operador (2026-08-05), Search Visibility 360 **nace dentro de greenhouse-eo pero su casa de largo plazo es Wave** (`wave.efeonce.org`, `EPIC-037`): Wave será el runtime del producto y Greenhouse quedará como administrador (orgs, acceso, entitlements, handoffs comerciales). Por eso todo el trabajo de `EPIC-022` nace **extraction-ready**:

- El schema `greenhouse_growth.seo_*` es una unidad autocontenida: su único acople deliberado es la FK de `seo_targets` a la organización canónica, y ese intercambio (FK dura hoy → identidad federada en la extracción) es el paso 1 conocido del runbook, no deuda oculta.
- El dominio `src/lib/growth/seo/**` no importa de otros dominios de Greenhouse (solo primitives transversales), para que el grafo se pueda cortar con el seam.
- La lane `ecosystem` será el contrato sister-platform que sobrevive la extracción: tras el cutover, Greenhouse consumirá SEO desde Wave por esa misma API.

Mientras `EPIC-027` (desacople build-runtime) esté activo, ninguna task de EPIC-022 crea deployables por anticipado — la extracción física es un programa posterior con sus propias tasks.

> Detalle técnico: [GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md §17](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md) (placement, inventario del seam, reglas duras extraction-ready).
