> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.12
> **Creado:** 2026-08-05 por Claude (TASK-1299 + TASK-1301)
> **Ultima actualizacion:** 2026-08-14 por Claude (TASK-1661 + follow-ups: las columnas de mercado se llenan solas, la captura es mensual y acotada con simulacro de costo previo, "Dificultad" pasa a ser **Barrera de enlaces** en niveles con "Sin dato" como estado propio, todo dato de mercado viaja con su fecha, y cada respuesta declara el país que muestra — incluida la corrección del caso Berel (ISSUE-152/153); delta previo 2026-08-09 TASK-1677 Slice 1: la clave del módulo es `seo_v2` y es la única que el runtime lee)
> **Documentacion tecnica:** [GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md)

# Modulo SEO — Search Visibility 360 (Growth)

## Que es

El modulo SEO es la mitad "buscadores clasicos" de **Search Visibility 360**: mide cómo le va a una marca en Google y otros buscadores a lo largo del tiempo — en qué posición aparece por cada keyword que importa, qué tan sano está su sitio a nivel técnico, y cómo evoluciona su perfil de enlaces. La otra mitad de Search Visibility 360 es el [AI Visibility Grader](ai-visibility-grader.md) (AEO), que mide lo mismo pero en los motores de respuesta de IA (ChatGPT, Claude, Perplexity, Gemini).

La idea central es que la visibilidad no es una foto: es una **serie de tiempo**. El valor del módulo no está en saber "hoy estás en la posición 7", sino en poder mostrar "hace tres meses estabas en la 15, hoy estás en la 7, y este competidor te está alcanzando". Por eso todo el modelo de datos está construido como mediciones append-only: cada captura se guarda y **nunca** se edita ni se borra.

Este documento describe el estado real al 2026-08-09: están construidas las capas de datos y acceso, las capturas automáticas (Search Console diaria, rankings, site audit y backlinks), **las cuatro pantallas del operador** — Resumen, Rendimiento, Keywords y Auditoría — y la superficie del cliente, ya desplegada.

> Estado de catálogo 2026-08-09: la clave del módulo es **`seo_v2`** y es la única que el runtime lee.
> La migración de TASK-1310 la creó (con los dos viewCodes de cliente, sin cambiar tiers, cupos ni
> autorización per-org) y el release del 2026-08-09 llevó a producción el código que lee sólo esa
> clave. La clave anterior `seo_v1` sigue existiendo como historia en el catálogo, pero **un
> assignment nuevo bajo `seo_v1` sería invisible para el sistema**: toda alta va con `seo_v2`.

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
| `seo_domain_overview_snapshots` | La foto de un **dominio completo** (del cliente o de un competidor): keywords ranqueadas totales, tráfico orgánico estimado, distribución del top-100 y su trayectoria mensual. Clave **sin organización**: lo que pagó una org le sirve a toda la cartera (TASK-1775). |
| `seo_url_visibility_snapshots` | Lo mismo a nivel de **página**: qué keywords ranquea una URL, subcarpeta o subdominio (propio o de un competidor) y qué páginas concentran el tráfico de un host. Una sola tabla para las cuatro clases de sujeto, con la clase declarada — no adivinada (TASK-1776). |

La separación importa porque el negocio de cada familia es distinto: la configuración responde "¿qué estamos midiendo y desde cuándo?"; las mediciones responden "¿qué pasó cada día?". Un snapshot jamás se corrige — si una captura salió mal, se degrada o se marca, pero la historia no se reescribe.

> Detalle técnico: [GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md §4](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md) (modelo de datos, decisión temporal, split PG ventana caliente / BigQuery historia larga). Migración TASK-1299 en `migrations/`.

### 2. El modelo de acceso per-org con tiers y cupos (TASK-1301)

El SEO se habilita **por organización, no por rol** (misma lección del AEO: un rol no se factura; un módulo asignado a una org sí). Tiene tres piezas:

- **Capabilities `growth.seo.*`** — 5 permisos finos: configurar targets (`target.configure`), disparar audits (`audit.run`), leer observaciones (`observation.read`), leer el reporte cliente (`report.read_client`, scope `own`) y administrar el entitlement (`entitlement.manage`, solo `EFEONCE_ADMIN` + `EFEONCE_ACCOUNT`).
- **Módulo per-org `seo_v2`** — vive en el catálogo `greenhouse_client_portal.modules`; una org tiene SEO cuando existe un assignment activo en `module_assignments`. El **tier comercial** va en `metadata_json.seo_tier`: `contracted`, `trial` o `pilot`.
- **Chokepoint único `enforceSeoRunEntitlement`** — la única puerta por la que pasa cualquier corrida que gasta dinero (DataForSEO cobra por llamada). Evalúa en cadena: ¿hay assignment? → ¿no está vencido? → ¿queda cupo de site-audits del mes? → ¿queda presupuesto USD del mes? Si algo falla, devuelve un `blockedReason` explícito (`no_entitlement` / `expired` / `quota_exhausted` / `budget_exhausted`). Es consumer-agnóstico: la misma puerta sirve para UI, Nexa, la lane `app` y la lane `ecosystem`/MCP.

Los cupos por tier salen de env-knobs con defaults sanos:

| Tier | Site-audits / mes | Presupuesto USD / mes |
|---|---|---|
| `contracted` | 8 | $50 |
| `trial` | 1 | $2 |
| `pilot` | 2 (override por org vía `metadata_json.seo_audit_runs_per_month`) | $10 |

El presupuesto consumido sale de un **registro único de gasto** (`seo_provider_spend_daily`): cada llamada que se le paga al proveedor queda anotada ahí, atribuida a la organización que la pagó. No es un contador aparte ni una estimación — es el gasto real, y es la misma fuente para cualquier corrida del módulo (rankings, auditoría, enlaces o datos de mercado).

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

La segunda captura automatica del modulo: cada madrugada (05:00 Chile), para cada organizacion con el modulo `seo_v2` asignado, el sistema le pregunta a Google (via el proveedor DataForSEO) **en que posicion exacta aparece el dominio para cada keyword trackeada** — incluyendo si el resultado trae AI Overview u otras features del buscador. Cada medicion se guarda como una fila inmutable en `seo_rank_snapshots` y se espeja automaticamente a BigQuery (`greenhouse_growth_analytics.seo_rank_history`) para conservar la historia larga.

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

## La foto de dominio y la trayectoria competitiva (TASK-1775)

Hasta esta capacidad, el módulo sólo describía **el recorte seguido**: las keywords que alguien
decidió trackear más lo que Search Console mide del propio dominio. Un dominio con 4.000 keywords
ranqueadas del que seguimos 31 se veía como un dominio de 31 keywords, y de un competidor no se
veía nada. La foto de dominio cierra ese hueco con tres corridas sobre la misma tabla:

- **La foto mensual** (`domain_rank_overview`, cron `ops-seo-domain-overview` día 16): cuántas
  keywords ranquea el dominio en total, cuánto tráfico estima el mercado, cómo se distribuye su
  top-100 y su momentum — del target **y de cada competidor declarado**.
- **La trayectoria histórica** (`historical_rank_overview`, corrida manual **una sola vez por
  sujeto** porque cuesta 10× el resto): el pasado del dominio desde 2020-10, para poder mostrarle
  a un cliente nuevo si venía subiendo o cayendo antes de llegar.
- **El screening de cartera** (`bulk_traffic_estimation`): de una lista de hasta 1.000 dominios,
  cuáles son grandes de verdad — antes de gastar en el detalle de cada uno.

Reglas de honestidad: toda cifra viaja marcada **◑ estimada** con su fecha de captura; un dominio
sin dato responde "sin datos de mercado", nunca un cero; y nada de esta tabla se mezcla con las
series medidas de Search Console. La **autoridad** de dominio para superficies sigue siendo una
sola: el `domain_rank` del snapshot de enlaces (esta capa no crea una segunda).

Se consume por el reader canónico (`readDomainOverview`), el lane ecosystem
(`/api/platform/ecosystem/growth/seo/domain-overview`) y la tool MCP `get_seo_domain_overview`.
Operación paso a paso: [Operar la foto de dominio SEO](../../manual-de-uso/growth/operar-foto-de-dominio-seo.md).

> Detalle técnico: [GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md §4.2](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md) (`seo_domain_overview_snapshots`, patrón multi-productor) y spec `docs/tasks/TASK_ID_REGISTRY.md → TASK-1775 (spec en la carpeta de su lifecycle vigente)`.

## La visibilidad por página: URL, subcarpeta y subdominio (TASK-1776)

El trabajo editorial se decide a nivel de página, y hasta esta capacidad el módulo sólo sabía
hablar de dominios y de keywords sueltas. Ahora puede responder, para **cualquier** dominio:

- **"¿Por qué keywords entra tráfico a esta página?"** — la captura por sujeto (`ranked_keywords`)
  con la clase declarada: dominio, subdominio, subcarpeta o URL exacta. Lo que Semrush vende como
  tres reportes separados acá es una sola capacidad con un resolver de sujeto.
- **"¿Qué páginas del competidor concentran su tráfico?"** y **"¿cuál de sus subdominios pesa?"** —
  colectores bajo demanda (`relevant_pages` / `subdomains`) que dejan cada página y subdominio como
  medición propia consultable.
- **Bono de cartera:** cada fila comprada trae el dato de mercado de su keyword (volumen, CPC,
  competencia) ya pagado, y el colector lo deposita en la tabla de mercado compartida con costo
  cero — una corrida sobre un cliente deja fresco mercado que otro habría tenido que comprar.

Las mismas reglas de honestidad de toda la serie: cifras **◑ estimadas** con fecha, "sin datos de
mercado" en vez de ceros, y la posición de mercado jamás se promedia con la posición medida de
Search Console. Se consume por `readUrlVisibility`/`readVisibilityConcentration`, el lane ecosystem
(`/growth/seo/url-visibility`) y la tool MCP `get_seo_url_visibility`.
Operación: [Operar la visibilidad por URL](../../manual-de-uso/growth/operar-visibilidad-por-url-seo.md).

> Detalle técnico: [GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md §4.2 y §15](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md).

## El detalle de enlaces accionable (TASK-1777)

El snapshot semanal de enlaces decía "perdiste 12 dominios referentes esta semana" — una frase con
la que un cliente no puede hacer nada. El detalle nominal agrega los **nombres**: qué dominio
enlazó, cuál se cayó (con una muestra del enlace y su texto — suficiente para escribir el correo
de recuperación) y con qué anchors te enlazan.

La regla de oro es de costo: **el detalle sólo se compra donde el agregado se movió**. Cada semana
el sistema evalúa el snapshot y deja un veredicto: si el perfil estuvo estable, no se gasta nada y
eso queda registrado como afirmación positiva ("no pasó nada"), distinta de "no sabemos qué pasó"
(un intento fallido, que enciende una alerta). Las tres lecturas posibles nunca se confunden.

Trae además una lectura nueva: la **sobre-optimización de anchors** — si el 60% de tus enlaces
llegan con el mismo texto exacto, eso parece manipulación aunque los dominios sean impecables. Es
una métrica separada de la toxicidad por spam score (miden cosas distintas, con remedios
distintos) y viaja ya calculada a todas las superficies.

Se consume por `readBacklinkDetail`, el lane ecosystem (`/growth/seo/backlink-detail`) y la tool
MCP `get_seo_backlink_detail`.
Operación: [Operar el perfil de enlaces SEO](../../manual-de-uso/growth/operar-perfil-de-enlaces-seo.md).

> Detalle técnico: [GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md §4.2](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md) (tablas hijas del snapshot + condición de disparo).

## Que NO existe todavia

Lo siguiente aún no está construido (las series que ya se llenan: Search Console live; rankings live desde el 2026-08-06). **Sí existen ya** — además del schema y el modelo de acceso — el cruce SEO ↔ AEO (`readSeoAeoGap` + matriz quadrant 360, TASK-1305) y la **operación por MCP live en producción desde el 2026-08-06** (TASK-1645, que partió con 3 tools read-only): hoy el MCP interno de Greenhouse sirve **19 tools SEO** — inventario vigente y estado de despliegue en el [manual del MCP](../../manual-de-uso/plataforma/mcp-greenhouse-read-only.md) §8 — con **13 federadas al gateway público `mcp.efeonce.org`** (TASK-1647). La lectura funcional completa de esa capacidad está en [Search Visibility 360 por MCP](search-visibility-360-por-mcp.md). Pendiente:

| Falta | Task que lo trae |
|---|---|
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

**El alcance vive en la cabecera** — Space, período (28, 90, 180 días o 12 meses) y
dispositivo — y aplica a todo lo que se ve debajo. El dispositivo no es un filtro de
presentación: la búsqueda en móvil y en escritorio devuelve resultados distintos, así que
cambiarlo cambia **qué se consultó**, no cómo se dibuja.

Sobre esa base, la pantalla agrega cuatro ayudas de lectura:

- **Tus grupos.** Si el equipo ya configuró grupos de keywords en el seguimiento de ese
  Space, aparecen como botones al comparar por keyword: un clic arma la comparación
  completa. No son grupos inferidos por el sistema — son los que alguien configuró, y si
  el grupo excede el tope de 8 el botón lo advierte.
- **Lectura del período.** Un recuadro que interpreta los cuatro indicadores **juntos** y
  nombra qué explica el movimiento: cayó la demanda de esas búsquedas (y no el ranking);
  el resultado de búsqueda está capturando el clic aunque la posición se mantenga (el
  patrón típico de las respuestas con IA); o la ganancia/pérdida de posición explica el
  cambio de clics. Aparece **sólo cuando el patrón es inequívoco**: con señales mezcladas,
  o sin período anterior comparable, no dice nada — un diagnóstico ambiguo es peor que
  ninguno.
- **Granularidad diaria o semanal.** En rangos largos la serie arranca en semanal porque
  un punto por día se vuelve una nube ilegible; el operador vuelve a diario cuando
  necesita el detalle fino. En semanal los volúmenes se suman, y posición y CTR promedian
  **sólo los días medidos**.
- **Contexto sobre el gráfico.** Rombos que marcan los días con AI Overview en la búsqueda,
  y bandas de color que marcan actualizaciones **confirmadas** del algoritmo de Google —
  para distinguir "se movió todo el mercado" de "se movió mi sitio". El registro de
  actualizaciones es curado y manual: sólo entra lo confirmado por Google, nunca un rumor
  de terceros.

Los marcadores de AI Overview tienen su propia regla de honestidad, y es la más fácil de
leer de más: **sólo existen en la serie ◑ (la medición del proveedor externo, que observa
la página de resultados)**. Search Console no informa ese dato, así que la **ausencia de
rombos no significa ausencia de IA — significa que esa fuente no lo mide**. La leyenda
● Medido / ◑ Estimado vive junto al gráfico, al lado de las series que describe.

> Detalle tecnico: `SeoPerformanceView` + `readSeoPerformance`/`readSeoPerformanceCatalog`
> (`src/lib/growth/seo/performance/**`). Mismo reader para UI, Nexa y las MCP tools
> `get_seo_performance` / `get_seo_performance_catalog` (parity en el mismo PR). El chart
> es el primer consumer de **ECharts** (lazy por ruta — la decisión de librería del módulo).
> Lectura cruzada en `performance/derive-insight.ts` (pura y testeada) y registro curado de
> updates en `algorithm-updates.ts`. Manual del operador:
> [`usar-pantalla-rendimiento-seo.md`](../../manual-de-uso/growth/usar-pantalla-rendimiento-seo.md).

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

Además: el alta del módulo `seo_v2` a una organización sigue siendo un **paso operativo manual** — ver el manual [Asignar el módulo SEO a una organización](../../manual-de-uso/growth/asignar-modulo-seo-organizacion.md).

Sobre el interruptor general `GROWTH_SEO_ENABLED`: está **encendido desde el 2026-08-05** y es **multi-runtime** — lo leen dos procesos distintos con su propia copia de la variable: el trabajador de fondo (`ops-worker`, para la captura diaria de Search Console) y el portal en Vercel (para el lane que sirve las consultas por MCP). Encenderlo en un solo runtime deja el otro camino muerto. Desde el 2026-08-06 está en `true` en Vercel Production. Encenderlo no gasta presupuesto: la captura de Search Console es gratis y las consultas por MCP son de lectura. Las corridas que **sí** cuestan dinero (rankings, site audit, backlinks) siguen exigiendo el assignment `seo_v2` de la organización y pasan por el chokepoint de cupos y presupuesto.

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

**De donde sale el dato, y las dos lentes que nunca se mezclan.** Casi todo lo que se ve esta
**medido por Search Console**: son las impresiones y posiciones reales de la busqueda del propio
cliente. Es la lente **medida**.

Desde el 2026-08-13 hay ademas una segunda lente, **estimada**: el **volumen de busqueda** y la
**barrera de enlaces** del mercado. Son las dos columnas que antes se mostraban siempre vacias;
ahora **se llenan solas cuando hay dato capturado**. La lente medida dice "asi te fue a ti"; la
estimada dice "asi de grande es el mercado", y el modulo no las promedia nunca.

Cada una contesta una pregunta que la otra no puede. Para una keyword donde el cliente **ya**
aparece en Google, Search Console alcanza y es mejor insumo que cualquier promedio: son sus clics e
impresiones reales. Pero para una keyword donde **no** aparece —justo las que quiere conquistar—
Search Console no entrega nada: cero impresiones, sin posicion. El volumen de mercado es la unica
forma de contestar *¿vale la pena?* y *¿que tan cuesta arriba es?*. Sin eso se aceptaban objetivos
a ciegas.

**La captura cuesta dinero, y por eso esta acotada.** Preguntarle al proveedor por una keyword se
paga, asi que el modulo pregunta lo menos posible:

- **Corre una vez al mes.** El proveedor refresca su dato mensualmente; consultarlo mas seguido
  seria pagar varias veces por el mismo numero.
- **Solo sobre las keywords que el cliente ya tiene en seguimiento.** El set monitoreado tiene
  techo, asi que el gasto es predecible. Traer datos de mercado para toda oportunidad detectada es
  una lista abierta que crece con el sitio, y es una decision posterior.
- **Hay un simulacro previo.** Antes de gastar un peso se puede pedir el ensayo: dice cuantas
  keywords consultaria y cuanto costaria, sin llamar al proveedor.
- **Costo real medido:** alrededor de **dos centavos de dolar por cliente al mes**. Repetir la
  corrida el mismo ciclo no vuelve a cobrar.

**"Barrera de enlaces", no "Dificultad".** La columna cambio de nombre y de forma: se muestra en
**niveles — Baja / Media / Alta**, nunca como numero. La razon es funcional: el numero del proveedor
mide **una sola cosa** —que tan atrincherado esta el top-10 por enlaces de otros sitios— y en
mercados de habla hispana da 0 muy seguido, incluso para keywords con cientos de miles de busquedas
al mes. Mostrado como "Dificultad: 0" se leeria como "facilisimo", que es falso. El nivel dice lo que
la metrica realmente mide: **"Baja" significa "aca se compite con contenido y autoridad, no con
enlaces"** — una oportunidad, no una trivialidad.

Y **"Sin dato" no es "Baja"**. Una keyword que no consultamos aparece como "Sin dato", con su propia
etiqueta: pintarla como barrera baja afirmaria una oportunidad que nadie midio.

Tres reglas de honestidad mas que esas columnas no negocian:

- **Todo dato de mercado viaja con su fecha de captura.** Un volumen sin fecha envejece en silencio
  y se sigue leyendo como vigente para siempre.
- **Nunca se promedia ni se mezcla con Search Console.** Son dos lentes distintas: una es medida
  (lo que le paso al cliente), la otra estimada (lo que pasa en el mercado).
- **Vacio nunca significa cero.** "No lo consultamos" y "nadie busca eso" son hechos distintos, y el
  modulo los distingue. Lo que **nunca** aparece es un `0` inventado.

Mientras el enriquecimiento este apagado para una organizacion, esas dos columnas simplemente no se
muestran y la ausencia se declara una vez, con palabras, al pie del mapa — una columna que no puede
traer datos no gana su ancho. La priorizacion no lo necesita: la demanda ya esta medida, y los ejes
del mapa jamas dependieron de ese dato.

> Detalle tecnico: `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §7
> (`readKeywordMarketData`, derivacion de la barrera de enlaces) · operacion paso a paso:
> `docs/manual-de-uso/growth/operar-datos-de-mercado-keywords.md`

**"Seguir" cuesta plata, y la pantalla lo dice antes del clic.** Seguir una keyword la agrega al set
monitoreado, y desde ahi su posicion se mide **todos los dias** con un proveedor externo que se cobra por
consulta. Por eso: la accion solo aparece para quien tiene el permiso de configurar el target (ver el mapa
y hacer crecer la factura son dos permisos distintos), el cupo del set se muestra siempre, y al llegar al
tope el boton se deshabilita explicando por que en vez de fallar al enviarlo. Si una keyword ya estaba
seguida, volver a seguirla no hace nada ni cuesta nada.

**Una keyword seguida puede decir por que esta ahi.** Un **objetivo** es un compromiso acordado con
el cliente; una **oportunidad** es demanda que el sitio ya capta y se esta empujando. La diferencia
importa para leer la posicion: un objetivo en la 60 no es un fracaso, es la distancia que falta, y
promediarlo con las oportunidades ensucia cualquier lectura agregada. "Seguir" desde el mapa declara
`oportunidad` —que es literalmente lo que el operador esta haciendo ahi—; declarar un objetivo es
otra accion. Las keywords que ya estaban seguidas antes de que existiera esta distincion **quedan sin
intencion declarada**, no marcadas como oportunidad: nadie las clasifico, y decir lo contrario habria
inflado el conteo. Cambiar la intencion conserva la historia (queda registrado desde cuando es
objetivo) y no consume cupo del set.

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

### El país deja de estar implícito: cada respuesta declara qué mercado muestra (2026-08-13)

Efeonce opera en Chile, México, Colombia y Perú, y **el volumen de una keyword en Chile no es el de
México**. Hasta ahora eso era un supuesto silencioso: si una organización tenía más de un mercado
configurado, el sistema mostraba uno **sin decir cuál**.

Ahora toda respuesta del módulo **declara el país que está mostrando**, y cuando hay varios sin uno
elegido, lo dice en vez de escoger callado. La diferencia no es cosmética: un número correcto para
un país es un número equivocado para otro, y sin la etiqueta nadie puede darse cuenta.

**El caso que lo destapó.** Verificando la captura de datos de mercado se descubrió que el cliente
Berel —una marca **mexicana**— estaba configurado midiendo **Chile**. La evidencia fue inmediata: su
propio nombre de marca tiene 30 búsquedas al mes en Chile y 49.500 en México. Eran **casi un año de
mediciones de posición contra el país equivocado**, y nada en el tablero lo delataba: la serie se veía
poblada y sana.

**Cómo se corrigió, y por qué así.** Se creó un target nuevo para México y se pausó el de Chile,
**sin borrar el histórico**. Cambiar el país "en su lugar" habría dejado un año de mediciones
chilenas colgando de una configuración que dice México — dos mercados mezclados bajo una misma serie
sin ninguna marca que lo delate, que es peor que el problema original. Con dos configuraciones
separadas, la serie vieja sigue explicando lo que se midió y se pagó entonces, y la nueva empieza
limpia en el mercado correcto.

> Detalle técnico: `docs/issues/resolved/ISSUE-152-seo-target-berel-mercado-chile-marca-mexicana.md`
> (el caso y su cutover) y `ISSUE-153` (la elección silenciosa de mercado, corregida).

### Auditoria del sitio: que esta roto y que conviene arreglar primero (TASK-1309, 2026-08-08)

La cuarta y ultima pantalla del modulo (`Growth > SEO > Auditoria`) muestra la **salud tecnica** del
sitio de un cliente: cuantos problemas encontro el ultimo crawl, de que gravedad, y en que orden
conviene atacarlos. Es donde el equipo diagnostica el sitio antes de proponer trabajo.

**Que se ve**

| Elemento | Que dice |
|---|---|
| Salud del sitio | Un puntaje de 0 a 100 en un arco, con el número siempre escrito. Verde sobre 80, ámbar sobre 50, rojo abajo. Si el crawl no alcanzó a calcularlo dice **"Pendiente"** — un 0 se leería como "sitio pésimo", que es otra cosa. Debajo, **qué mide ese puntaje** (ver "Las tres cosas que la pantalla aclara"). |
| Movimiento desde el crawl anterior | Al lado de la salud y de los issues: "+2,4 desde el crawl del 3 de agosto", "12 issues menos". El módulo entero se vende como serie de tiempo, y esta pantalla mostraba un punto. Si es el primer crawl **lo dice** — dejar el hueco vacío sería ambiguo entre "no cambió" y "no hay con qué comparar". Sólo compara contra crawls **terminados**: contra uno fallido o en vuelo el número sería inventado. |
| Ultimo crawl | En la cabecera, en palabras ("hace 3 dias"). Dice cuanto confiar en todo lo demas. Pasadas dos semanas aparece un aviso: el diagnostico ya no es reciente. |
| Criticos · Atencion · Menores | El volumen por gravedad, en una **banda cuyo ancho es el reparto**: son partes de un mismo total, y para eso la respuesta es longitud, no tres números sueltos que pesan visualmente igual. Cada segmento **filtra la lista** al apretarlo. El segmento en cero no se atenúa: "0 críticos" es la mejor noticia de la pantalla. |
| Paginas revisadas | Cuántas páginas alcanzó a mirar el crawl. **Sale de la banda a propósito** — no es una severidad, y mezclarla ahí invitaba a compararla con lo que no es comparable. Cuando choca el techo del crawl, la cifra lo dice (ver abajo). |
| Issues priorizados | Una **lista**, no una tabla ordenable. El orden ES la respuesta a "que ataco primero", asi que no se esconde detras de un control que haya que descubrir. Cada fila: gravedad (icono + palabra + color), nombre del problema en español, cuantas paginas afecta y cuanto esfuerzo estimamos. |
| El orden de la lista | Primero **todo lo crítico**, sin excepción. Dentro de cada nivel compiten **tres** cosas: cuántas páginas toca, **cuánto mueve la aguja en búsqueda** y cuánto cuesta resolverlo. Así 400 imágenes sin texto alternativo nunca entierran un error de servidor — y la higiene que toca todo el sitio tampoco encabeza su nivel sólo por ser ancha (ver abajo). |
| Esfuerzo | Rapido / Medio / Alto. Es **juicio nuestro, no un dato del crawl**, y la pantalla lo dice con esas palabras. Existe porque la gravedad sola no responde la pregunta: 300 imagenes sin `alt` y una caida de servidor no se atacan igual aunque compartan volumen. |
| Ver → | Abre el grupo en la misma pantalla y lista las URLs afectadas. Se puede compartir el enlace y el boton "atras" del navegador funciona. |
| Copiar | En el grupo abierto. Se lleva **todas** las URLs del grupo —no sólo las que la tabla alcanza a mostrar— como texto que pega igual de bien en un documento que en una planilla. El diagnóstico es material de conversación de propuesta y hasta acá terminaba en copiar noventa URLs a mano. Si el navegador bloquea el portapapeles, lo dice: fallar en silencio dejaría a la persona creyendo que copió. |

**Las tres cosas que la pantalla aclara, porque callarlas produce una conclusión falsa**

Las tres salieron de mirar la pantalla con datos reales, y son la misma clase de problema: dos cifras
verdaderas puestas juntas sin decir qué mide cada una llevan a creer algo que no es.

| Lo que se aclara | Por qué |
|---|---|
| **"Páginas revisadas" dice cuándo es el tope del crawl y no el sitio** | El crawl revisa hasta 100 páginas. Grupo Berel devolvió exactamente 100 — ese número redondo no era el tamaño del sitio, era el crawl chocando su límite. Si el sitio tuviera 3.000 páginas estaríamos diagnosticando el 3% y titulándolo "Salud del sitio: 95". Cuando el conteo iguala el tope, la cifra lo dice y la pantalla explica que la salud describe **esa muestra**, no el sitio entero. |
| **Los checks de velocidad declaran que son de laboratorio** | "Tiempo de carga alto" y sus tres hermanos se miden en un banco de pruebas. Google **no rankea con eso**: rankea con datos de campo, de visitas reales, los que llegan por Search Console. Sin decirlo, alguien podría leer esa fila y prometerle a un cliente una mejora de posiciones sobre la métrica equivocada. Es la misma separación que el resto del módulo hace entre ● medido y ◑ estimado. |
| **El puntaje explica su alcance** | "95 de salud" al lado de "519 issues" se lee como contradicción — fue la primera pregunta al ver la pantalla, y un cliente va a preguntar lo mismo. No miden lo mismo: **el puntaje lo calcula el proveedor** con su propia ponderación y sus ~65 verificaciones, y **el conteo sale de nuestro catálogo curado de 34**. Un sitio sin críticos puede acumular muchos issues menores y seguir puntuando alto, porque el puntaje pesa sobre todo lo que rompe la indexación. No es un error: es que cada cifra responde otra pregunta, y reconciliarlo es obligación de la pantalla, no del que la lee. |

**Por qué el orden mira el valor de búsqueda y no sólo el volumen**

La gravedad dice **qué tan roto** está algo; el valor de búsqueda dice **cuánto importa arreglarlo**.
No son lo mismo, y dentro de un mismo nivel de gravedad conviven higiene cosmética y señales reales.
Con sólo volumen y esfuerzo, en Berel el primer aviso menor era "Sin favicon · 91 páginas" por encima
de "Imágenes sin texto alternativo · 50 páginas": la trivia que toca todo el sitio ganaba por ancho.
Un favicon afecta cómo se ve la marca en el resultado; un texto alternativo ausente afecta la búsqueda
de imágenes y la accesibilidad. Lo de bajo valor **se hunde pero se sigue listando** — esconderlo
sería la otra forma de mentir sobre el diagnóstico.

**Los estados, que no se mezclan**

| Situacion | Que muestra |
|---|---|
| Nunca se audito | "Sin auditoria reciente" + el boton para correrla. Nunca ceros. |
| Crawl en curso | "Auditoria en curso". Todavia no hay hallazgos, y eso se dice — no se pinta una lista vacia. |
| Termino sin problemas | "Sin issues detectados". Es una **buena noticia**, no un error, y se ve distinto de un crawl fallido. |
| Termino a medias | Aviso de que el crawl quedo incompleto. Lo que se ve es real, pero no es el sitio entero. |
| Fallo | "La auditoria fallo", con la opcion de reintentar. |
| Sin sitio configurado | Explica que primero hay que crear el sitio del Space. Es otro camino, no el mismo vacio. |

**Correr una auditoria** cuesta dinero (le pagamos al proveedor por cada crawl), asi que esta detras
de un permiso propio: quien puede *leer* el diagnostico no necesariamente puede *correrlo*. Ademas hay
dos frenos automaticos: si ya hay un crawl en vuelo o ya se corrio uno hoy para ese sitio, el sistema
lo dice en vez de gastar dos veces por lo mismo.

**Lo que esta auditoría todavía NO revisa** (y por eso no alcanza para declarar un sitio listo para
la IA): si el `robots.txt` **bloquea a los rastreadores de IA**, si al sitio le **falta** el marcado
de datos estructurados (hoy sólo detecta errores en el marcado que ya existe), si hay conflicto entre
`noindex` y el bloqueo de robots, y la salud del mapa del sitio. Es el punto ciego más caro del módulo:
un sitio que le cierra la puerta a los rastreadores de IA queda fuera de las respuestas de ChatGPT,
Perplexity y compañía, y hoy esta pantalla lo declararía sano con 95 de 100. Lo cierra **TASK-1670**,
que reutiliza las verificaciones ya probadas del motor AEO en vez de escribirlas de nuevo.

> Paso a paso para operarla: [Auditoria del sitio — leer la salud tecnica y priorizar](../../manual-de-uso/growth/usar-auditoria-sitio-seo.md).
>
> Detalle tecnico: `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §6/§7 (reader
> `readSiteAuditReport`, command `queueSiteAudit`) y §10.6 (los contratos de esta superficie). Codigo:
> `src/views/greenhouse/admin/growth/seo/audit/`, `src/app/api/admin/growth/seo/audit/run/`.
> El mismo command lo operan la UI, Nexa y el lane MCP — y la comparación contra el crawl anterior se
> calcula **dentro del reader canónico**, así que le llega a los tres sin inventar un contrato aparte.

### La superficie del cliente: su propia lectura de búsqueda (TASK-1310, 2026-08-08)

Las cuatro pantallas anteriores son del equipo de Efeonce. Ésta es **del cliente**: entra a su
portal y ve su propia lectura de visibilidad, sin datos de nadie más y sin la densidad del
cockpit interno.

**Qué ve** (`Inicio > SEO`, ruta `/growth/seo`), en un navegador de tres secciones:

| Sección | Qué responde |
|---|---|
| **Resumen** | Cómo le va en búsqueda hoy: la lectura dominante en una frase, la métrica principal y las señales que la acompañan. |
| **Evolución** | Cómo se movió en el tiempo, con la **cobertura declarada** — cuántos días del período tienen medición de verdad. Un hueco corta la línea; nunca se rellena con cero. |
| **Quadrant** | El cruce con AEO: dónde está su marca en el eje de búsqueda clásica contra el de motores de respuesta. |

Y un **informe** (`/growth/seo/report`) que puede imprimir o guardar como PDF.

**Lo que NO ve, por construcción:** costos de proveedor, cupos, tier comercial ni datos de otras
organizaciones. El informe se arma sobre el mismo contrato compartido de reportes que el AEO, con
una variante que distingue "portal del cliente" de "adjunto", y hay un test que falla si algo
interno se filtra.

**Cómo se habilita.** No es por rol: es **por organización**. Un cliente ve SEO cuando su Space
tiene el módulo asignado, y sólo alcanza su propia lectura. Si no lo tiene, la pantalla lo dice con
palabras ("SEO no está activo en tu plan") y ofrece hablar con su equipo de Efeonce — nunca un
tablero vacío que se lea como "no tienes visibilidad".

> ⚠️ **Estado al 2026-08-08: construida y con su catálogo aplicado; falta la verificación con
> sesión de cliente.** El código está publicado en `develop` y desplegado a staging, y la migración
> de catálogo **ya se aplicó**: el módulo `seo_v2` existe con los dos viewCodes de cliente y las dos
> organizaciones habilitadas. Falta entrar con una sesión de cliente real y confirmar que el menú
> compone SEO. La ronda premium de la auditoría visual sigue abierta.
>
> Paso a paso para operarla: [Habilitar y verificar el portal SEO del cliente](../../manual-de-uso/growth/habilitar-portal-seo-cliente.md).
>
> Detalle técnico: `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md` §10.7 (cutover del
> catálogo). Código: `src/views/greenhouse/growth/seo/client/`,
> `src/components/growth/seo/report-artifact/`.

### Descubrir keywords nuevas: de una idea a candidatos con datos (TASK-1664, 2026-08-14)

Hasta acá el módulo contestaba qué empujar de lo que **ya aparece** en Search Console. Lo que no
contestaba era cómo pasar de una hipótesis ("¿habrá demanda para pintura para piso?") a un conjunto
priorizado de términos sin salir a otra herramienta. El **keyword discovery** cierra ese hueco:

- El operador (o un agente, con confirmación humana) pide una **corrida** con hasta 10 seeds —
  escritas a mano, tomadas de las consultas reales de Search Console, del set monitoreado o del
  dominio propio — y elige los métodos de expansión del proveedor (sugerencias long-tail,
  relacionadas, ideas de categoría, keywords del sitio).
- **Antes de gastar un peso ve el costo estimado con su fórmula** y el saldo disponible. La corrida
  se encola y corre después en el worker; cada respuesta del proveedor deja **candidatos** con su
  procedencia (qué seed, qué método, qué posición) y su dato de mercado (volumen, intención,
  barrera de enlaces) en la misma tabla de mercado que ya alimenta las oportunidades — el dato que
  viene incluido en la respuesta **no se vuelve a comprar** después.
- Un candidato es una **sugerencia, no un compromiso**: descubrirlo no lo agrega al set monitoreado
  ni gasta de forma recurrente. Seguirlo es una decisión posterior y explícita (el mismo "Seguir"
  de oportunidades), y cada decisión (descartar, seleccionar, promover) queda registrada con autor
  y fecha.
- Repetir la misma pregunta no paga dos veces: el mismo intent devuelve la corrida existente.

Estado operativo: **encendido desde el 2026-08-14** (verificación real previa: una corrida live
costó USD 0.013 y dejó 10 candidatos con mercado; el operador autorizó el rollout el mismo día).
No hay corridas automáticas: el sistema sólo gasta cuando alguien encola una corrida que ya pasó
el preview de costo y el gate de presupuesto.

> Detalle técnico: [`GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md)
> §7 (primitives) y §8 (drain + costos) · runbook
> [`operar-keyword-discovery-seo.md`](../../manual-de-uso/growth/operar-keyword-discovery-seo.md)

#### La lente `Descubrir`: la cara visible del descubrimiento (TASK-1665, 2026-08-14)

El motor anterior ya existía sin pantalla: se operaba por API, Nexa o MCP. La lente `Descubrir`
—tercera vista de `Growth > SEO > Keywords`, seleccionada con `?view=discovery`, **sin ruta ni menú
nuevos**— lo pone frente al operador sin ablandar ninguna de sus consecuencias:

- **El costo se ve antes de gastarse.** La banda de costo responde qué se enviará, cuántas llamadas,
  cuánto cuesta como máximo y qué pasa después. El estimado es el peor caso a propósito; si la
  corrida sale más barata, esa diferencia no es crédito reutilizable.
- **Dos lentes de dato que nunca se promedian.** `◑` es estimación mensual del mercado publicitario
  (proveedor) y `●` es medición propia de Search Console. Viven en columnas separadas, cada cifra
  viaja con su marcador y su fecha, y la ausencia se nombra (`Sin dato de mercado`, `Sin medición
  propia`) en vez de rellenarse con un cero que se leería como "no hay demanda".
- **"Barrera de enlaces", nunca "dificultad".** Se muestra el nivel derivado del perfil real de
  enlaces del top 10, no el índice crudo del proveedor —que colapsa a 0 en SERPs en español de
  LATAM y se leería como "trivial"—. `Baja` no significa fácil, y `Sin dato` jamás se pinta `Baja`.
- **Cinco decisiones explícitas por candidato**, cada una contra su command canónico y con
  confirmación: declarar objetivo, seguir como oportunidad, preparar un borrador de consultas AEO,
  descartar (registro append-only, no borrado) y ver trayectoria (sólo lectura). Ninguna es
  automática y ninguna se pinta antes de que el command confirme.
- **Ver y gastar son dos permisos.** Con `growth.seo.observation.read` se lee todo; sin
  `growth.seo.target.configure` los botones de gasto **no se renderizan** — no aparecen apagados.
  Preparar consultas AEO exige además la capability AEO y un perfil del Space.
- **El resultado se dice por término.** Un lote que rebota por cupo responde con la pantalla en
  verde y el mensaje `No se agregó «X»: el seguimiento llegó a su cupo`. No hay "Listo" genérico que
  esconda una keyword que nadie está midiendo.

> Paso a paso para operarla:
> [`descubrir-keywords-seo.md`](../../manual-de-uso/growth/descubrir-keywords-seo.md)

### Del descubrimiento SEO a las preguntas de IA: el puente grounded (TASK-1666, 2026-08-14)

Una keyword de Google y una pregunta a un motor de IA son cosas distintas: copiar la keyword como
prompt sesga la medición AEO. El puente grounded resuelve el cruce sin mezclar los motores:

- El operador selecciona hasta 20 candidatos de una corrida de discovery y pide una propuesta de
  **grounded queries**. El sistema usa las keywords como **tema de investigación** (dato, no
  instrucción) y la identidad de marca ya autorizada del perfil AEO para redactar preguntas
  naturales — verificado con una autoría real: 15 preguntas, cero copias literales, y las de
  descubrimiento jamás nombran la marca.
- El resultado es siempre un **borrador** del set de prompts AEO existente, con la trazabilidad
  completa (qué corrida, qué candidatos, qué contexto exacto — como referencias opacas, nunca la
  keyword en logs). Aprobarlo y activarlo sigue siendo el flujo AEO de siempre, con revisión
  humana; el puente no aprueba, no activa y no ejecuta mediciones.
- Si la autoría con IA no está disponible, el borrador se crea con la base genérica del arquetipo
  y **lo dice**: esas preguntas no son específicas de las keywords hasta regenerar con la autoría
  activa. Repetir la misma selección devuelve el mismo borrador sin costo extra.

> Detalle técnico: [`GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`](../../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md)
> §7 · runbook [`preparar-grounded-queries-desde-seo.md`](../../manual-de-uso/growth/preparar-grounded-queries-desde-seo.md)

## Relacion con el AI Visibility Grader (motores hermanos)

SEO y AEO son los dos motores de **Search Visibility 360** y se diseñaron como espejo deliberado:

- **Mismo patrón de acceso:** módulo per-org (`seo_v2` / `ai_visibility_v1`) + capabilities con el mismo grano + `entitlement.manage` restringido a los mismos roles.
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
