# SEO Editorial Prioritization Operating Model V1

> **Tipo de documento:** Modelo operativo (proceso repetible, agnóstico al cliente).
> **Versión:** 1.4 · **Fecha:** 2026-09-02.
> **Ámbito:** cómo Efeonce ejecuta un research de SEO/AEO y una priorización editorial para un cliente
> con blog activo, de punta a punta: insumos, carriles, intake del sistema editorial, secuencia,
> criterio de descarte, producción de briefs, entrega, atomización y distribución, verificación y
> medición.
> **No gobierna:** el **oficio** (doctrina de striking distance, trampas de Search Console, citabilidad
> AEO, schema, Query Fan-Out) — eso vive en la skill `seo-aeo`, módulos
> [`02_SEO_CONTENT.md`](../../.codex/skills/seo-aeo/modules/02_SEO_CONTENT.md) y
> [`07_MEASUREMENT.md`](../../.codex/skills/seo-aeo/modules/07_MEASUREMENT.md). Tampoco gobierna
> **pricing ni la venta** del servicio (skill `seo-aeo-practice`), ni el **contrato técnico** del módulo
> SEO de Greenhouse ([`GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`](../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md)).
> **Camino primario:** el Carril A de este modelo **está implementado y es operable hoy** en el portal
> (`/admin/growth/seo/keywords`). El proceso manual descrito acá es el **fallback**, no el método por
> defecto — ver §1.1.
> **Caso fuente:** [`BEREL_SEO_DIAGNOSTIC_2026-08-25.md`](../audits/seo/BEREL_SEO_DIAGNOSTIC_2026-08-25.md).

---

## 1. Para qué sirve y cuándo se usa

Este modelo se aplica cuando hay que **decidir sobre qué escribir** para un cliente que ya tiene blog
activo, y la decisión debe poder defenderse frente al cliente con evidencia, no con criterio editorial.

Disparadores típicos:

- el cliente pide el calendario editorial del próximo ciclo y hay que elegir entre temas candidatos;
- el blog publica de forma sostenida pero el tráfico orgánico no-marca no crece;
- se quiere pasar de "artículos aislados" a clústeres temáticos con arquitectura;
- entra un cliente nuevo con historia de contenido y hay que decidir qué se empuja y qué se crea.

No se aplica cuando el cliente no tiene sitio publicado, cuando el mandato es exclusivamente técnico
(crawl/index, Core Web Vitals) o cuando el entregable es una sola pieza suelta sin decisión de cartera.
Para eso están el módulo 01 de la skill y el runbook de blogpost punta a punta
([`AGENTIC_BLOGPOST_END_TO_END_RUNBOOK_V1.md`](public-site-content-factory/AGENTIC_BLOGPOST_END_TO_END_RUNBOOK_V1.md)).

Salida esperada del modelo: **dos backlogs priorizados** (empujar y crear), un set de briefs listos para
producción, y una línea base medida contra la cual evaluar el resultado.

### 1.1 Dos caminos, y el primario es el producto

**Camino primario — correr la superficie del portal.** El Carril A de este modelo no es una receta
pendiente de implementar: está construido de punta a punta en Greenhouse y es operable hoy. La superficie
de operador es **`/admin/growth/seo/keywords`** (TASK-1308, `complete`), y el score que calcula es el
mismo que define este documento: clics incrementales, con la canibalización tratada como
**consolidación** y no como optimización. Lo primero que se hace al abrir un ciclo editorial es
**conectar la propiedad del cliente y leer esa pantalla** (detalle del cableado en §2.1).

**Camino de fallback — el proceso manual de este documento.** Se usa cuando:

- el cliente **no está en el portal** todavía (sin organización, sin propiedad conectada, sin el módulo
  habilitado para su cuenta);
- hace falta un **corte que la superficie no cubre** — por ejemplo agrupar por tema/espacio en vez de por
  consulta, o cruzar contra el inventario de contenido y el catálogo de producto, que la pantalla no
  conoce;
- se está **auditando** el resultado del motor y hay que reproducir el cálculo a mano.

**Advertencia operativa (la que este caso destapó): el motor puede existir y estar sin usar para una
cuenta.** El módulo SEO se habilita por organización —flag de módulo más entitlement— así que "la
capacidad existe" y "la capacidad está encendida para este cliente" son dos hechos distintos. En el caso
fuente se reimplementó a mano un score que el reader canónico ya calculaba. **Regla: antes de construir
un análisis a mano, verificar si la capacidad ya está en el portal** para esa cuenta; si existe pero está
apagada, el trabajo correcto es habilitarla, no reimplementarla.

---

## 2. Los insumos y su jerarquía de confianza

Todo el research se apoya en cuatro clases de insumo. **No tienen el mismo peso** y el documento final
debe dejar visible cuál sostiene cada afirmación.

| Nivel | Insumo | Naturaleza | Para qué sirve | Límite |
|---|---|---|---|---|
| 1 | **Search Console del cliente** | MEDIDO | qué consultas ya traen impresiones/clics al sitio, en qué posición, con qué página | solo ve lo que el sitio YA capta; ventana corta al inicio |
| 2 | **Herramienta de terceros** (Semrush u otra) | ESTIMADO | volumen de demanda que el cliente no captura, autoridad, perfil competitivo | volumen modelado, agrupaciones por bucket, pares singular/plural |
| 3 | **SERP en vivo** | UNA FOTO | quién ocupa el resultado hoy, qué formato gana, si hay AI Overview | volátil, personalizada, no serie temporal |
| 4 | **Documentación interna previa** (propuestas, pitches, hub de contenidos) | PUEDE ESTAR VENCIDA | qué se prometió, qué se decidió, qué quedó sin ejecutar | describe el día que se escribió, no el runtime de hoy |

**Regla de honestidad (dura):** nunca presentar una estimación como medición. Un volumen de herramienta
es demanda *estimada*; una impresión de Search Console es demanda *observada*. Cuando ambas conviven en
la misma tabla, se rotulan por separado. Cuando la conclusión depende de la estimación, se dice.

**Marcado de evidencia, y su viaje al entregable.** La jerarquía de la tabla se opera con un vocabulario
cerrado de cinco marcas — **MEDIDO · OBSERVADO · ESTIMADO · INFERIDO · REPORTADO** — y ese marcado **no se
queda en el research: viaja al brief, dato por dato**. Un dato REPORTADO (lo afirmó alguien) o INFERIDO (lo
dedujimos nosotros) nunca se presenta como verificado en la pieza que el cliente va a leer. Corolario
directo: la sección de límites del brief **transcribe los huecos del research sin maquillar** — qué no se
pudo medir, qué herramienta quedó sin cuota y qué queda condicionado a un dato que todavía no llegó. Un
hueco declarado es entregable honesto; un hueco tapado es un pasivo. Se verifica en el cierre (§10.8).

**Regla de vigencia:** la documentación interna se lee como **historia de la estrategia**, no como
estado. En el caso fuente, la serie por espacios ya estaba propuesta en un pitch anterior y diagnosticada
en una propuesta estratégica; llevaba meses sin ejecutarse. Un documento describe el día en que se
escribió — el sitio y el buscador se movieron desde entonces. Todo dato interno que se cite en el
entregable debe re-verificarse contra el runtime.

### 2.1 De dónde sale el dato medido en Greenhouse

El acceso a Search Console del cliente es **operador-mediado** y se conecta con el flujo documentado en
[`docs/documentation/growth/conexion-search-console.md`](../documentation/growth/conexion-search-console.md)
(manual: [`conectar-search-console.md`](../manual-de-uso/growth/conectar-search-console.md)). Es solo
lectura: Greenhouse nunca escribe en la propiedad del cliente.

- Lectura puntual: reader canónico `readSearchConsoleAnalytics`
  ([`src/lib/growth/search-console/reader.ts`](../../src/lib/growth/search-console/reader.ts)).
- Serie diaria persistida: `greenhouse_growth.seo_gsc_daily`
  (materializador en [`src/lib/growth/seo/gsc-daily-materializer.ts`](../../src/lib/growth/seo/gsc-daily-materializer.ts);
  operación en [`operar-serie-search-console.md`](../manual-de-uso/growth/operar-serie-search-console.md)).
- **Carril A — completo y operable.** No es solo un reader: es superficie de punta a punta.
  - **UI de operador: `/admin/growth/seo/keywords`** (TASK-1308, `complete`). Página en
    [`src/app/(dashboard)/admin/growth/seo/keywords/page.tsx`](<../../src/app/(dashboard)/admin/growth/seo/keywords/page.tsx>);
    vistas `KeywordOpportunitiesView`, `KeywordOpportunityTable`, `KeywordOpportunityMap` y
    `KeywordOpportunityVerdict` en
    [`src/views/greenhouse/admin/growth/seo/keywords/`](../../src/views/greenhouse/admin/growth/seo/keywords/).
    Manual: [`seguir-keywords-oportunidades-seo.md`](../manual-de-uso/growth/seguir-keywords-oportunidades-seo.md).
  - **Reader canónico:** `readKeywordOpportunities` (TASK-1302) en
    [`keyword-opportunities-reader.ts`](../../src/lib/growth/seo/keyword-opportunities-reader.ts) — calcula
    el score en clics incrementales y marca las oportunidades **canibalizadas**, que piden consolidar (no
    optimizar). El SQL está exportado como `SEO_KEYWORD_OPPORTUNITIES_SQL` para que el sanity live
    ejercite exactamente la misma consulta que corre en producción.
  - **Ruta ecosystem (parity programática):**
    [`src/app/api/platform/ecosystem/growth/seo/keyword-opportunities/route.ts`](../../src/app/api/platform/ecosystem/growth/seo/keyword-opportunities/route.ts).
- **Carril B** tiene el hecho de mercado en `greenhouse_growth.seo_keyword_market_data`
  (ver [`modulo-seo-search-visibility-360.md`](../documentation/growth/modulo-seo-search-visibility-360.md)),
  y la superficie distingue explícitamente un **objetivo** (demanda que el cliente no capta) de una
  **oportunidad** (demanda que ya capta y se está empujando) — la misma separación de carriles del §3.

**Verificar antes de citar.** Estas rutas y nombres cambian con el módulo. Antes de referenciarlas en un
entregable de cliente, confirmar que existen y que el reader sigue siendo el canónico. Si la ventana
disponible es corta —en el caso fuente eran 23 días desde el arranque de la serie— **se declara como
límite explícito**: con esa ventana no se lee estacionalidad, no hay interanual y no se puede separar tendencia de
ruido. Cuando falte historia, el backfill histórico tiene su propio manual
([`backfill-historico-gsc.md`](../manual-de-uso/growth/backfill-historico-gsc.md)).

### 2.2 El camino a la herramienta interna — y qué parte ya existe

**La dependencia de la herramienta de terceros (nivel 2) es transitoria.** El módulo SEO de
Greenhouse tiene proveedor propio —**DataForSEO**, con transporte único, allowlist cerrado de
familias y ledger de gasto canónico ([`src/lib/ai/dataforseo.ts`](../../src/lib/ai/dataforseo.ts),
familias en [`dataforseo-families.ts`](../../src/lib/ai/dataforseo-families.ts))— y ya cubre buena
parte de las preguntas del research. Lo que sigue es el mapa honesto de qué está construido y qué
no, para decidir caso a caso en vez de asumir en cualquiera de las dos direcciones.

Lo que existe hoy bajo [`src/lib/growth/seo/`](../../src/lib/growth/seo/):

- **Hecho de mercado por keyword** — `keyword-market-data.ts` + `keyword-market-data-batch.ts`:
  volumen, dificultad, CPC, intención, `core_keyword` y barrera de enlaces del top-10, con frescura
  mensual y pre-check que evita volver a comprar lo vigente.
- **Descubrimiento de candidatas** — `keyword-discovery/`: expansión de semillas por cuatro métodos
  (`keyword_suggestions`, `related_keywords`, `keyword_ideas`, `keywords_for_site`). Descubrir no es
  seguir: la promoción a keyword seguida es un command posterior y explícito.
- **Perfil de enlaces del dominio propio** — `backlinks/`: serie semanal con dominios de referencia,
  backlinks totales, `domain_rank` en escala 0–100 y un proxy de toxicidad.
- **Posición propia en el tiempo** — `rank-capture.ts`, `rank-capture-batch.ts` y
  `rank-evolution-reader.ts`: la SERP del cliente medida día a día, append-only.
- **Cockpit y rendimiento** — `overview/` (KPIs y serie de visibilidad) y `performance/`.
- **Auditoría técnica del sitio** — `site-audit/` (crawl on-page).
- **Control de costo por proveedor** — `provider-pricing.ts` y `provider-spend.ts` más el gate de
  entitlement: el gasto se estima y se frena **antes** de la llamada, atribuido a la organización.
- **Dato medido propio** — `gsc-daily-materializer.ts`, `gsc-backfill.ts` y
  `keyword-opportunities-reader.ts` (§2.1).

Dos nombres que engañan, y conviene decirlos antes de la tabla:

- **`gap/` no es el gap de keywords contra competidores.** Es el cruce SEO×AEO del quadrant 360
  ([`read-seo-aeo-gap.ts`](../../src/lib/growth/seo/gap/read-seo-aeo-gap.ts)): rankeas pero no te
  citan, te citan pero no rankeas. El gap competitivo de keywords (`domain_intersection`) figura como
  **pendiente** en la arquitectura del módulo.
- **El mercado es una dimensión explícita, no un supuesto.** Cada target declara su par
  `(país, idioma)` y el read path se niega a elegir callado cuando hay varios
  ([`resolve-target.ts`](../../src/lib/growth/seo/resolve-target.ts)). Es el equivalente interno de
  fijar la base regional de la herramienta externa (§5.1).

#### Tabla de correspondencia

Para cada pregunta del research (§5.1): qué reporte externo la contesta hoy y qué capacidad interna
la contesta o la contestaría.

| Pregunta del research | Reporte externo (caso fuente) | Capacidad interna | Estado |
|---|---|---|---|
| ¿Cuánta autoridad y cuántos enlaces tiene **el dominio propio**? | `domain_rank` · `backlinks_overview` | `backlinks/capture.ts` + `backlinks/reader.ts` — serie semanal de dominios de referencia, backlinks, `domain_rank` 0–100 y toxicidad | **ya cubierto internamente** |
| ¿Cuánta autoridad tiene **un competidor**? | los mismos dos, sobre otro dominio | ninguna: el capture cuelga de `seo_targets` —el dominio de la organización cliente— y no existe la noción de dominio competidor; abrir un target por competidor mezclaría la serie del cliente y su presupuesto | **sin cobertura interna todavía** |
| ¿Contra quién se compite de verdad? | `domain_organic_organic` | los competidores hoy se **declaran** en el perfil AEO (`competitorsDeclared`, `src/lib/growth/ai-visibility/`); no se derivan del solapamiento orgánico | **sin cobertura interna todavía** |
| ¿Qué páginas **propias** cargan el peso del tráfico? | `domain_organic_unique` | `seo_gsc_daily` + `performance/read-performance.ts` — y es **medido**, no estimado: mejor insumo que el externo | **ya cubierto internamente** |
| ¿Qué tipo de contenido gana enlaces en la categoría? | `backlinks_pages` | el snapshot guarda el perfil agregado del dominio y el delta new/lost, no el desglose por página; y no alcanza dominios ajenos | **sin cobertura interna todavía** |
| ¿Dónde hay demanda que el cliente no captura? (Carril B) | `domain_domains` con sintaxis de gap | `domain_intersection` es el productor #4 de la tabla de mercado desde TASK-1662 (implementada 2026-08-28): competidores declarados con autoría (`seo_competitors`), cobertura con run ledger y gap derivado al leer (`readKeywordGap`, `content_gap` vs `ranks_worse` con exclusión por GSC medido) | **cubierto internamente** (encendido operativo con el primer deploy del worker post-release) |
| ¿Cuánto vale una lista concreta de keywords? | `phrase_these` | `keyword-market-data.ts` + `keyword-market-data-batch.ts` (`keyword_overview`: volumen, dificultad, CPC, intención, barrera de enlaces) | **ya cubierto internamente** |
| ¿Cuál es el universo semántico y las variantes del tema? | `phrase_related` · `phrase_fullsearch` | `keyword-discovery/` con `related_keywords`, `keyword_suggestions` y `keyword_ideas` | **ya cubierto internamente** |
| ¿Cuáles son las preguntas del mapa de Query Fan-Out? | `phrase_questions` | discovery devuelve long-tail con volumen, pero su enum de métodos está cerrado y **ninguno corta por forma interrogativa**: el mapa hay que armarlo a mano sobre la salida | **parcialmente cubierto** |
| ¿Quién ocupa el SERP de la consulta que pienso atacar? | `phrase_organic` | el módulo **sí paga la SERP** (`rank-capture.ts` llama `/v3/serp/google/organic/live/advanced`), pero el parser persiste solo la posición del dominio propio, su URL y los tipos de features presentes: los dominios del resto del top se descartan | **parcialmente cubierto** (el dato se compra y no se guarda) |
| ¿Cómo evoluciona la posición propia día a día? | no se corrió en el caso fuente | `rank-capture*.ts` + `rank-evolution-reader.ts` — serie append-only por keyword × motor × dispositivo | **ya cubierto internamente** (la interna cubre más que el uso externo) |

#### La regla de decisión

**Cuando la capacidad interna cubre la pregunta, se usa la interna.** No por preferencia de
plataforma: porque el dato queda **versionado** (append-only, con su `as-of`), **auditable por el
cliente** desde su propia superficie, con **costo controlado y atribuido** a su organización antes de
gastarlo, y **sin depender de la cuota compartida de un tercero** que se agota a mitad del trabajo
(§7). La herramienta externa queda para lo que la interna no cubre todavía.

**Y cada uso de la herramienta externa es una señal de backlog de producto.** Si un research vuelve a
apoyarse en el mismo reporte externo ciclo tras ciclo, eso no es una preferencia metodológica: es una
capacidad faltante con demanda demostrada. Se registra como tal —igual que el antipatrón 9 del §12
registra el caso inverso, reimplementar a mano lo que el portal ya tiene—.

---

### 2.3 Cobertura temática orientada al negocio antes de minar

La cantidad de artículos por categoría describe presencia editorial, no prioridad, demanda ni autoridad.
Primero definir qué decisiones del comprador y usuario puede resolver legítimamente la marca. Clasificar
una categoría principal por cuerpo e intención; espacio, superficie, producto y formato son ejes aparte.

La matriz de research cruza categoría, problema, superficie/exposición y decisión. Cada celda declara
cubierto / parcial / nuevo candidato / fuera de foco / bloqueado técnico, con página y sección propia.
Leer también borradores futuros: una pieza desarrollada, una entrega y una publicación son hechos distintos.

Capilaridad no significa una URL por keyword ni agotar un top-N del proveedor. Cada intención debe tener
hogar canónico, satélites distintos y enlaces entrantes/salientes. Separar artículo nuevo, ampliación,
consolidación, FAQ y ficha comercial. Minería y métricas no autorizan cambios de calendario o tracking.

Presupuestar el conjunto de lotes antes de comprar, conservar procedencia y límites. PAA observada,
consulta de research propuesta y prompt observado en un LLM nunca se rotulan como lo mismo.
RICE requiere alcance y esfuerzo defendibles; si faltan, declarar prioridad estratégica provisional.

Overlay Berel: [estrategia y baseline](BEREL_EDITORIAL_COVERAGE_STRATEGY_V1.md).
Oficio de adquisición: dataforseo-operator, referencia 09-editorial-mining.md.

## 3. Los DOS CARRILES y por qué no se mezclan

La priorización editorial produce **dos backlogs separados**, con insumo, confianza, esfuerzo y horizonte
distintos. Mezclarlos es el error estructural más caro del proceso.

Esta separación **ya está cableada en el producto**: el Carril A es lo que produce
`/admin/growth/seo/keywords`, y el Carril B se apoya en el dato de mercado del mismo módulo (§2.1). La
tabla siguiente describe la lógica del motor, no una receta a ejecutar a mano.

| | **Carril A — empujar / consolidar** | **Carril B — crear** |
|---|---|---|
| Pregunta que responde | ¿qué página que ya rankea empujo? | ¿dónde hay demanda que el cliente no captura? |
| Insumo | Search Console (MEDIDO) | volumen de terceros + gap competitivo (ESTIMADO) |
| Confianza | alta | media |
| Esfuerzo | bajo (editar, consolidar, enlazar) | alto (pieza nueva completa) |
| Horizonte | rinde antes | apuesta estructural |
| Sub-modos | *empujar* (una sola página compitiendo) · *consolidar* (varias páginas del propio sitio compitiendo entre sí) | greenfield · refuerzo de señal existente |

La distinción **empujar vs consolidar** dentro del Carril A no es cosmética: cuando la misma consulta
tracciona varias páginas del cliente, la acción correcta es unificar o redirigir, no optimizar cada una.
Es otro trabajo, con otro entregable. El reader canónico ya marca esas filas como canibalizadas, así que
la distinción llega hecha desde la superficie — no hay que derivarla a mano.

### El error a evitar (razonamiento circular)

**Usar impresiones de Search Console para descartar temas nuevos es circular.** El backlog de striking
distance filtra páginas que **ya** rankean; un tema sin contenido no puede aparecer ahí por construcción.
Search Console responde "¿qué empujo?"; el volumen de terceros responde "¿dónde hay demanda que no
tengo?". Son carriles distintos y **no se sustituyen**. Descartar un tema greenfield porque "tiene pocas
impresiones" es descartarlo por no existir.

Corolario del mismo error: **la posición de Search Console con pocas impresiones no es interpretable.**
Cuando un tema con volumen estimado alto muestra decenas de impresiones, el diagnóstico correcto es la
**brecha volumen-vs-impresiones**, no la posición — es muestra insuficiente, no ranking real. La variable
que discrimina es si existe o no una página que efectivamente rankee.

> El método detallado de cada carril (umbrales de striking distance, cómo se lee un SERP, cómo se arma un
> clúster) vive en la skill `seo-aeo` módulo
> [`02_SEO_CONTENT.md`](../../.codex/skills/seo-aeo/modules/02_SEO_CONTENT.md). Este documento define la
> separación de carriles y el orden de ejecución, no la doctrina.

---

## 4. El sistema editorial del cliente — intake

Antes de proponer nada hay que entender **dónde vive el calendario editorial del cliente y quién lo
controla**. Este paso es intake, no research: condiciona qué se puede proponer, y descubrirlo tarde
obliga a rehacer la priorización completa.

### 4.1 Identificar el sistema y quién dicta el calendario

Dos preguntas, en este orden:

1. **¿Dónde vive el calendario?** Notion, una hoja de cálculo, el CMS, el propio WordPress. El sistema
   determina el formato del entregable, el mecanismo de escritura y quién tiene permiso de escribir.
2. **¿Quién lo dicta — la agencia o el cliente?** No es lo mismo proponer sobre un calendario propio que
   sobre uno ajeno. Cuando lo dicta el cliente, hay además un **eje editorial** que él ya fijó, y ese eje
   manda: en el caso fuente el eje era producto + temporalidad, no clúster temático, lo que dejaba fuera
   de plano cualquier propuesta armada como serie temática pura. Eso hay que descubrirlo **antes** de
   construir el backlog, no al presentarlo.

Salida: nombre del sistema, dueño del calendario, eje editorial vigente y quién autoriza cambios.

### 4.2 Leer el inventario de piezas ya planificadas, no solo las publicadas

**Un slot vacío en el calendario del cliente es la unidad de trabajo real.** Proponer temas sin slot es
proponer al aire: no hay fecha, no hay responsable y no hay lugar donde depositar el brief.

El inventario del intake tiene entonces dos capas, y son distintas de la del §5 (que inventaría lo
**publicado** para no proponer lo que ya existe):

- **planificado** — slots comprometidos, con fecha y tema asignado: define cuántas piezas caben y cuándo;
- **libre** — slots sin tema: es la capacidad real del ciclo, y el tamaño del backlog se ajusta a ella.

### 4.3 Revisar la higiene del sistema

El sistema editorial se audita como cualquier otro runtime, porque sus defectos se propagan al
entregable. Qué buscar:

- **relaciones que apuntan a bases equivocadas** — en el caso fuente, las relaciones estratégicas del hub
  del cliente apuntaban a las bases internas de la agencia, y ninguna fila del cliente las usaba;
- **tipos declarados y sin usar** — un tipo de contenido que existe en el esquema pero que ninguna fila
  adopta;
- **plantillas sin llenar** — estructuras creadas y abandonadas a medias;
- **URLs registradas que ya no resuelven** — en el caso fuente, seis enlaces del hub apuntaban a soft 404.

Cada hallazgo se reporta como defecto del sistema, con su corrección propuesta. No se corrige de oficio:
el sistema es del cliente (ver §8).

### 4.4 Buscar la historia

Casi siempre existe una propuesta, un pitch o un diagnóstico anterior que **ya describió el problema**.
Encontrarlo tiene dos beneficios: evita rediagnosticar desde cero y da munición para la conversación
—"esto ya se propuso y no se ejecutó, y estas fueron las razones"—. En el caso fuente la serie temática
estaba propuesta en un pitch previo y la canibalización estaba diagnosticada en una propuesta
estratégica; no se había ejecutado porque era un upsell, porque el calendario lo dictaba el cliente con
otro eje, y porque la infraestructura del sistema quedó vacía.

Ese material se lee con la **regla de vigencia del §2**: es historia de la estrategia, no estado. Todo
dato que se recicle se re-verifica contra el runtime.

---

## 5. La secuencia del research

Siete pasos, en orden. Cada uno tiene una salida verificable; ninguno se declara hecho sin ella.

| # | Paso | Salida esperada |
|---|---|---|
| 1 | **Entender el negocio y el catálogo** | inventario de líneas/SKU/servicios del cliente y a qué necesidad responde cada uno |
| 2 | **Panorama competitivo y de autoridad** | tabla comparativa de autoridad y tráfico; cómo organiza el líder su contenido informacional; qué tipo de página gana enlaces en la categoría |
| 3 | **Inventariar TODO el contenido existente del cliente** (lo **publicado**; los slots planificados salen del §4.2) | lista completa de URLs de contenido, con grupos canibalizados y patrones de URL fuera de convención |
| 4 | **Verificar respaldo de producto de cada tema candidato** | por tema: producto que lo resuelve + claim textual de ficha, o marca de descarte |
| 5 | **Medir línea base en Search Console** | por tema: impresiones, clics, queries distintas y posición ponderada en la ventana disponible |
| 6 | **Construir los dos backlogs** | Carril A **leído de `/admin/growth/seo/keywords`** (o reconstruido a mano solo en fallback, §1.1); Carril B priorizado por demanda × gap × respaldo |
| 7 | **Briefs** | una pieza por slot, con plantilla idéntica y límites declarados |

### El paso que más veces se salta: el 3

**Cruzar cada tema candidato contra el inventario real del sitio.** Proponer algo que ya existe es el
desperdicio más común del proceso, y no se detecta desde el buscador: se detecta recorriendo el sitio.
Ese cruce produce tres hallazgos distintos, y cada uno cambia la decisión:

1. **El tema ya existe y funciona** → sale del Carril B y entra al A (empujar), o se descarta del ciclo.
2. **El tema ya existe varias veces** → el entregable es consolidación, no una pieza nueva.
3. **El tema no es alcanzable** → existe la URL pero nadie llega a ella.

El tercer hallazgo obliga a inventariar la **arquitectura**, no solo las URLs. En el caso fuente el
inventario reveló que los artículos del cliente no se listaban en ninguna URL del sitio, que rutas
inexistentes devolvían HTTP 200 (un chequeo por status code no las detecta), y que el enlazado editorial
apuntaba a una ruta bloqueada por `robots.txt`. Ninguno de esos defectos aparece en una herramienta de
keywords. Un tema con demanda publicado sobre una arquitectura que no lo expone no es una oportunidad:
es trabajo que se pierde.

#### El competidor más peligroso suele ser una pieza propia reciente

Al validar un **ángulo** —no un tema, un ángulo— el reflejo es mirar competidores. Antes de eso hay que
**barrer las piezas propias del cliente de los últimos tres meses y comparar conceptos, no keywords**: un
H2 y una palabra del cuerpo bastan para que el territorio ya esté ocupado por la casa. Una comparación por
keyword no lo detecta, porque la pieza vecina puede estar sosteniendo el concepto sin usar el término. En
el caso fuente, el concepto central del racional ya era keyword de una pieza propia publicada cinco
semanas antes.

Cuando el solapamiento existe, la salida no es cambiar de tema: es **buscar el eje del material fuente que
nadie ocupó** —ni el cliente ni el mercado— y **convertir la pieza vecina en destino de enlace, no en
competidora**. Queda una pieza nueva con ángulo propio más un enlace interno que refuerza la que ya
existe, en vez de dos páginas del mismo sitio disputándose la misma consulta: es el caso *consolidar* del
§3, prevenido antes de nacer.

#### El gate de canibalización se corre sobre el CONTENIDO, y es obligatorio

**Ningún tema se propone sin este chequeo, y el chequeo no se hace sobre slugs.** Barrer el inventario
por patrón de URL y concluir "territorio libre" es el mismo antipatrón que barrer una carpeta por
patrón de nombre (§12.10): responde por el nombre de la pieza, no por lo que dice su cuerpo.

Qué encuentra un barrido de contenido que uno de slug no puede ver:

- **Temas cubiertos y dispersos.** Media docena de piezas con el mismo H2 y sin hogar canónico: el
  territorio ya está ocupado por la casa y además está desordenado. La salida es **consolidar** (§3),
  no publicar una séptima pieza.
- **El objeto citable que ya está publicado.** En el caso fuente, la tabla que se iba a proponer como
  "objeto citable inexistente" ya estaba publicada verbatim en una pieza propia.

Cómo se corre, en tres pasos:

1. **Leer el cuerpo** de las piezas adyacentes — no su título, no su URL.
2. **Contar términos del concepto**, no del slug, en el corpus completo.
3. **Declarar qué sinónimos se probaron.** Concluir una ausencia desde un solo eje de búsqueda no vale.

Corolario que paga solo: contar términos del concepto en **todo** el corpus revela **huecos de
vocabulario** que ningún keyword tool muestra — palabras centrales del territorio del cliente con
**cero** menciones después de años publicando sobre ese territorio. Eso es materia prima de Carril B
con evidencia propia, no una corazonada.

### 5.1 El toolkit del research — qué se corre y para qué

Cuando el research corre por el camino de fallback (§1.1), el nivel 2 de los insumos se obtiene con
una herramienta de terceros. Acá queda la secuencia real ejecutada en el caso fuente con el MCP de
Semrush. **Los nombres de reporte pertenecen a esa herramienta y cambian si se cambia de proveedor;
el orden de las preguntas, no.** Lo que la capacidad interna de Greenhouse ya cubre de esta lista
—y lo que todavía no— está en la tabla de correspondencia del §2.2.

**Flujo obligatorio de la herramienta, en este orden:** *discovery tool → `get_report_schema` →
`execute_report`*. Nunca se llama `execute_report` a ciegas: el esquema declara los parámetros
válidos y evita quemar cuota en llamadas mal formadas. Y **la base regional se declara explícita en
cada llamada** (en el caso fuente, `mx`): un reporte corrido contra la base por defecto responde
sobre otro mercado, y ese error no se ve en la salida.

Los reportes, agrupados por la pregunta que contestan:

**1. Dimensionar al competidor y a uno mismo** — `domain_rank` (Authority Score, keywords orgánicas,
tráfico, valor) y `backlinks_overview` (dominios de referencia, backlinks, authority). Es el marco de
toda la priorización, no un adorno de contexto: en el caso fuente el cliente estaba **18 puntos de
Authority Score debajo del líder de categoría** (39 contra 57), y de ahí sale la conclusión
estratégica —no va a ganar por autoridad, tiene que ganar por profundidad—. Sin este paso el backlog
se arma como si el sitio pudiera competir de igual a igual. Alimenta el paso 2 de la secuencia.

**2. Descubrir contra quién se compite de verdad** — `domain_organic_organic`: competidores por
solapamiento real de keywords, no por la lista que el cliente tiene en la cabeza. Casi siempre
corrige la lista declarada.

**3. Ver qué páginas cargan el peso** — `domain_organic_unique` (páginas por tráfico) y
`backlinks_pages` (páginas por dominios de referencia). No son el mismo reporte con otro orden: el
segundo contesta algo que el primero no puede, **qué tipo de contenido gana enlaces en esa
categoría**, y eso decide formato, no solo tema.

**4. Encontrar la demanda no capturada** — `domain_domains` con la sintaxis de gap: keywords donde
rankea uno o varios competidores y el cliente no. Es la materia prima del **Carril B** (§3).

**5. Dimensionar un tema candidato** — `phrase_these` para métricas en lote de una lista concreta,
`phrase_related` para el universo semántico del tema y `phrase_fullsearch` para variantes exactas. El
descuento de las variantes que son la misma demanda se hace acá, al leer, no al presentar (§10.6).

**6. Construir el mapa de Query Fan-Out** — `phrase_questions`: las consultas en forma de pregunta,
con su volumen. Son la materia prima **literal** de los H2 del brief: se usan como pregunta, no
parafraseadas.

**7. Verificar la intención antes de comprometerse** — `phrase_organic`, para ver quién ocupa el SERP
de la consulta que se piensa atacar. Es el paso que evita comprometer un slot con una consulta cuya
intención no era la supuesta: en el caso fuente confirmó dos trampas de intención (SERP de diseño
gráfico y de referencia educativa, no de hogar) y, corrido sobre la consulta correcta, destapó que se
había descartado mal una familia entera de temas por haber leído el SERP de una consulta prima
(§12.5).

Dos advertencias gobiernan todo este toolkit. Ya están escritas en otra parte del modelo y acá solo
se referencian:

- **Los reportes pesados se cobran por línea devuelta** —relacionadas y preguntas, 40 unidades por
  línea en el caso fuente— y **ante cuota se reintenta en serie, no se relanza la flota**: §7,
  "Tres lecciones operativas", y §12.8.
- **El SERP que devuelven estos reportes es una foto, no una serie temporal** (§2, nivel 3). Sirve
  para decidir intención y formato hoy; no sirve como línea base ni como medición de resultado —eso
  sale del dato medido (§11)—.

### 5.2 Cuando la pieza es un hito anual de marca

Algunos clientes tienen una pieza que no es un artículo más: es un **hito anual de marca** —el color del
año, el informe anual, un ranking, un premio—. Se reconoce porque tiene ediciones anteriores, porque el
mercado publica su equivalente en la misma temporada y porque el cliente la usa como ancla de campaña.
Esa pieza exige cuatro análisis que un artículo normal no necesita, y los cuatro son del research, no de
la redacción.

1. **La cadencia propia del cliente.** Cuándo publicó sus ediciones anteriores. El dato duro sale del
   `datePublished` del JSON-LD de esas páginas, no de la fecha visible del artículo — que muchas veces es
   la de la última edición en el CMS.
2. **La cadencia del mercado.** Cuándo publica cada competidor y cada referente, **con fuente primaria**:
   el dateline del comunicado, no la fecha de la nota que lo cubre. La nota puede ser semanas posterior y
   corre toda la ventana hacia adelante.
3. **La ventana.** Con las dos cadencias sobre la mesa se elige la fecha. Publicar **entre el competidor
   directo y el referente global** maximiza la probabilidad de ser una fuente **ya existente** cuando el
   mercado arme sus compilados — que es el momento en que la categoría gana enlaces.
4. **El claim perecedero.** Un hito anual casi siempre habilita un claim del tipo "primera marca de X en
   anunciar Y". Es verdad **hoy**, y la regla es dura: **todo claim perecedero se documenta con su
   condición de caducidad y una tarea de retiro con fecha**. El retiro alcanza tres lugares — la pieza
   publicada, el material de PR y **los assets ya distribuidos** (§9.2 cuando los publica un tercero). Un
   claim que caduca sin retirarse deja de ser diferenciador y pasa a ser un pasivo.

La fecha de un hito anual es además un **bloqueante de decisión, no un detalle de calendario**: si el
cliente la mueve fuera de la ventana, el claim diferenciador puede dejar de ser verdad y la pieza cambia
de ángulo. Eso se escala al operador **antes** de escribir el brief, con las dos opciones y su
consecuencia editorial explícita (§4.1 — el calendario lo dicta el cliente).

#### 5.2.1 El hito anual no es una pieza de calendario: es un clúster que compone

Cuando el cliente tiene una **entidad propia que vuelve cada año** —el color del año, el informe
anual, un ranking, un premio, un índice—, ese territorio no es "un artículo estacional más": es un
**clúster que compone autoridad ciclo tras ciclo**, y ningún competidor puede disputárselo, porque la
entidad es suya. Es el principio #1 del oficio: **los motores razonan por entidades, no por
keywords** (`seo-aeo`).

**El error a nombrar, porque se cometió:** clasificar el territorio de la entidad como *"masa de
calendario, difícil de convertir en autoridad"* y descartarlo. Es exactamente al revés — **ahí vive
la gravedad de marca del cliente**. Una pieza de calendario se consume y muere; una edición de la
entidad hereda la autoridad de todas las anteriores, siempre que esté encadenada.

**El kit reutilizable del ciclo.** La cadencia es **relativa al anuncio**, no a un mes fijo del
calendario, y se replica igual cada año:

| Momento | Pieza | Para qué |
|---|---|---|
| `D-30` | arreglar o reservar el **slug destino** | la ficha nace en una URL estable; renombrarla después rompe el encadenado y deja soft 404 (§5.4) |
| `D+0` | **ficha ancla** de la edición nueva | el objeto canónico de la entidad ese año |
| `D+2` | **aplicación profesional** | traduce la entidad al trabajo de quien la usa |
| `D+30` | **satélite de espíritu, anclado a estacionalidad** (§5.5) | el eslabón que casi ningún ciclo hace bien — y el que produce capilaridad |
| `D+75` | paleta o desarrollo mayor | profundidad del territorio |
| `D+150` | tendencia cultural | ensancha el territorio más allá del producto |
| `D+240` | segundo desarrollo | sostiene el ciclo hasta la edición siguiente |

**Bidireccionalidad obligatoria.** Cada pieza del kit enlaza a la ficha ancla, y la ficha ancla
enlaza de vuelta a cada satélite. Y hay un enlace que casi nunca existe y es justamente el que
compone: **la ficha del año N enlaza a la del año N−1, y la del año N−1 a la del N**. Sin ese
eslabón no hay clúster, hay ediciones sueltas con el mismo nombre, cada una arrancando de cero.
Cuando la medición del §5.4 devuelve la ficha de la entidad con **cero entrantes y cero salientes
editoriales**, el diagnóstico es ese: la entidad está huérfana en su propio sitio.

### 5.3 El pre-emptor de tesis no está en el mapa competitivo

Quien gana la **tesis** puede no ser competidor de categoría: una agencia de tendencias, un medio, un
forecaster. El mapa competitivo del paso 2 no lo va a mostrar, porque no compite por las mismas keywords
ni vende lo mismo. Falta entonces una búsqueda explícita: **¿alguien publicó ya este mismo concepto, con
el mismo mecanismo, antes que nosotros?** — el mismo *concepto*, no la misma keyword.

Si la respuesta es sí, se derivan tres consecuencias y las tres se escriben en el brief:

1. **El cliente no puede presentar el concepto como hallazgo propio.** Se dice en el brief, para que nadie
   redacte una primicia que no lo es.
2. **Ganar la tesis no es ganar el SERP.** Hay que verificar si el pre-emptor **compite en búsqueda**: una
   landing de captura de menos de cien palabras y sin datos estructurados gana la narrativa y no gana el
   buscador. La conclusión editorial es distinta según cuál de las dos cosas pasó, y la diferencia se mide,
   no se supone.
3. **Aparece un riesgo nuevo que hay que medir: que un motor de respuesta atribuya el concepto a la marca
   equivocada.** Deja de ser una preocupación difusa y entra como **métrica AEO explícita** del ciclo
   (§11).

### 5.4 El grafo de enlaces internos se mide sobre el cuerpo editorial, no sobre el total

El enlazado interno es **precondición de autoridad**: sin él, una pieza nueva rinde menos que arreglar
una que ya existe, y por eso el grafo se mide **antes** de decidir el ciclo. **Pero el conteo bruto
miente.**

**La trampa, verificada:** un módulo global —pie de página, carrusel de "relacionados", bloque de
plantilla— inyecta los mismos destinos en **todas** las páginas del sitio. Ese enlace no es señal
editorial: es mobiliario. En el caso fuente infló el conteo **~2,6×** y fabricó "hubs" que no
existían.

**Método correcto: descartar todo enlace que aparezca en más de la mitad de las páginas** —eso es
chrome— y medir solo el enlazado del cuerpo. Las métricas que quedan son cuatro:

- enlaces editoriales **por pieza**;
- **porcentaje de piezas sin ningún entrante** editorial;
- porcentaje sin saliente, y máximo de salientes por pieza;
- **porcentaje del enlazado editorial que apunta a soft 404** — el residuo típico de un cambio de
  slugs que nadie propagó a los enlaces.

La corrección cambia el diagnóstico entero, no lo matiza: en el caso fuente 112 enlaces "totales"
eran **43 editoriales**, un "72% sin entrantes" era **86%**, y de tres "sumideros" solo **uno** era
real — los otros dos eran destinos cableados en la plantilla.

**Y la consecuencia operativa es la opuesta a la que sugiere el conteo bruto.** A un destino cableado
en la plantilla **no se le dan más salidas: se le quitan entradas**. La corrección es reemplazar la
terna fija del módulo global por un **módulo contextual dirigido por el mapa de clúster**, para que
el enlace vuelva a ser señal. Es un hallazgo del sistema del cliente: se **reporta con su corrección
propuesta, no se corrige de oficio** (§4.3 y §8.2).

### 5.5 La estacionalidad tiene que ser vinculante, no una efeméride genérica

Una fecha con volumen no es, por sí sola, una oportunidad. **La estacionalidad sirve a la autoridad
solo si ata con la marca Y con el concepto de la pieza.** Test de vínculo, en este orden:

1. ¿el ritual **es** el concepto de la pieza, o solo coincide en el mes?
2. ¿su paleta, su materia o su práctica son las del producto del cliente?
3. ¿hay **demanda medida**, con SERP verificado?
4. ¿queda hueco después de leer el contenido propio (gate de canibalización, §5)?

**Preferir el marco reutilizable sobre la efeméride puntual.** Una pieza atada a una fecha **caduca**
y hay que rehacerla cada año; un **marco de temporada** se recicla, se actualiza y acumula — y es lo
que produce capilaridad. Entre "qué hacer el día X" y "cómo se prepara la casa para la temporada", la
segunda es la que compone. Es también la que alimenta el eslabón `D+30` del kit anual (§5.2.1).

⚠️ **Volumen alto con vínculo débil es una trampa, no una oportunidad.** Un ritual muy buscado puede
tener SERP de receta, de trámite de gobierno o de retail: territorio ajeno donde el cliente no tiene
por qué ganar. Se verifica el SERP de **la consulta que se piensa atacar**, siempre (antipatrones 5
y 12).

---

## 6. El criterio de respaldo de producto

**Un tema con demanda pero sin producto del cliente que lo resuelva genera tráfico que no convierte.**
La demanda es condición necesaria, no suficiente.

Dos reglas duras:

1. **Si el fabricante no lo declara en ficha, no se escribe el claim.** La ficha es la fuente; el claim
   se cita textual. En el caso fuente, "resistencia al salpiqueo al aplicar" se reportó como
   "resistencia a manchas" — son cosas distintas y el claim falso llegó a un brief de cliente. Del mismo
   modo, un producto acrílico no se describe como epóxico, y un anticorrosivo declarado para hierro y
   acero no se generaliza a "todo metal".
2. **Si el catálogo no cubre el tema, el tema se pasa al cliente como señal de PRODUCTO, no se convierte
   en artículo.** Es información comercial valiosa —hay demanda que la marca no puede atender— y se
   entrega como tal, en el canal de negocio, no como slot editorial.

En el caso fuente, dos temas con demanda limpia y SERP flojo se descartaron exactamente por esto:
`pintura para azulejos` (4.400 estimadas/mes, SERP sin ninguna marca del país) y `chukum`
(18.100 + 1.900 en `acabado chukum`, la página informacional #1 del líder de categoría). Ambos se
pasaron como señal de producto.

### 6.1 La capa que gana enlaces es la que solo el cliente puede escribir

El respaldo de producto no solo evita tráfico que no convierte: **es la materia prima de la única capa que
gana enlaces de forma replicable**. Por eso, cuando el research identifica la página que concentra los
dominios de referencia de la categoría (§5.1, reporte 3), la pregunta correcta no es *cuál* gana enlaces
sino **por qué**.

- Si los gana por **profundidad de fuente primaria** —un dato propietario, una cifra con su unidad, un
  consejo honesto que puede frenar una venta—, ese es el motor y es replicable: el cliente lo puede
  escribir porque es dueño del dato.
- Si los gana por **músculo que el cliente no tiene** —un evento físico, PR sostenido, una publicación
  impresa—, copiar el formato no reproduce el resultado. Se descarta como modelo y se dice por qué, en vez
  de dejar en el brief una aspiración que nadie puede ejecutar.

**Y el activo propietario más desaprovechado suele estar en el catálogo, no en el laboratorio.** Un
nombre propio del cliente que carga significado cultural —un color, un modelo, una línea bautizada con
el nombre de un objeto o una práctica cotidiana— es un dato que **ningún competidor puede publicar**, y
casi nunca está contado. Antes de pedir un dato nuevo, inventariar los nombres propios que el cliente
ya tiene. ⚠️ Y verificar que **un mismo código no aparezca con dos nombres** en piezas distintas: eso
disuelve la entidad justo donde debería concentrarse.

**El claim de producto bloquea el H2, no solo la frase.** La regla 1 de este capítulo se aplica también a
la estructura: *si la ficha no lo declara literalmente, el H2 no se escribe*. No se rellena con lógica de
oficio ("todo producto de esta familia se comporta así") ni con la ficha de otra marca; una palabra cambia
el claim. Un H2 que depende de un dato que el cliente todavía no entregó queda **condicionado y nominado
como tal** en el brief, con el dato faltante identificado y su dueño — no se redacta a la espera de que
aparezca.

**Y se separa lo que el brief PROPONE de lo que la ficha DECLARA.** Cuando el brief propone una
aplicación editorial junto al dato del fabricante —qué producto para qué uso, qué color en qué muro—,
las dos cosas terminan conviviendo en la misma tabla y se confunden con facilidad. La columna de la
propuesta se rotula **"propuesto"**, explícito. Sin ese rótulo, la pieza publica como especificación
del fabricante algo que decidió quien escribió el brief. La forma exacta está en
[`SEO_CONTENT_BRIEF_STRUCTURE_V1.md`](SEO_CONTENT_BRIEF_STRUCTURE_V1.md) §8.

**El `unbrand test` puede fallar de forma legítima.** El método de utilidad citable exige que el objeto
siga sirviendo sin logo ni CTA. Pero cuando el objeto **es la entidad de marca** —un léxico
propietario, una nomenclatura, un índice con nombre—, quitarle la marca lo vacía: el gate falla **por
construcción**. La lectura correcta no es "arreglarlo" ni marcarlo verde para que cuadre: es que la
pieza **construye entidad, no utilidad neutra**, y por lo tanto **se mide distinto** (§11). Declararlo
fallado y explicar por qué es más honesto —y más útil para quien redacta— que forzar el verde.

**Y hay que declarar si el estándar propuesto es paridad o mejora.** Antes de presentar una capa como
hueco a tapar, revisar si la edición anterior del propio cliente la tenía. Si no la tenía, no se está
corrigiendo una carencia: se está **subiendo el estándar propio**. Decirlo cambia la conversación con el
cliente —de reproche a propuesta— y cambia contra qué se compara el resultado.

### 6.2 Si se cae el porqué de una pieza, se reabre la decisión

Un tema entra al backlog por una razón concreta: demanda medida, hueco competitivo, potencial de
enlace, respaldo de producto. **Cuando el research mata esa razón, la pieza vuelve a cero — no a otro
ángulo.**

El error a evitar es el reflejo de salvarla: se propuso un tema por volumen y potencial de enlace, el
chequeo mató ese ángulo, y en vez de preguntarse **si la pieza seguía teniendo sentido** se le buscó un
ángulo nuevo para conservar el slot. Eso **es** publicar por publicar, con un racional nuevo puesto
encima. La pregunta correcta cuando muere el porqué es *¿esta pieza todavía debe existir?*, y la
respuesta puede ser **no**: el slot se llena con otra cosa del backlog, que para eso está priorizado.

**Y hay una razón de descarte que no es de SEO.** Si el tema le habla a **un comprador distinto** del
resto del blog, la decisión es **comercial**, no editorial: puede ser una apuesta deliberada del
cliente o una desviación de foco, y quien tiene ese dato es él. **Si no lo tienes, dilo y escálalo; no
lo asumas en ninguna de las dos direcciones.** Se trata como la señal de producto del §6: se entrega
en el canal de negocio, no se resuelve dentro del calendario editorial.

---

## 7. Producción de briefs con subagentes

Patrón que funcionó y se adopta como estándar del modelo:

1. **Un dossier de hechos verificados como insumo único compartido.** Se escribe una vez, antes de
   repartir trabajo, y contiene solo hechos con su fuente. Regla explícita dentro del dossier: *no
   agregar cifras que no estén aquí; si algo falta, declararlo como no verificado*. Es el mecanismo que
   impide que cada agente invente su propia versión de los números.
2. **Un agente por brief.** El paralelismo es por pieza, no por sección de una pieza.
3. **Plantilla idéntica obligatoria.** Mismas secciones, mismo orden, para todos los briefs de la serie
   (en el caso fuente, cinco briefs con once secciones cada uno). La comparabilidad entre piezas es
   parte del entregable.
4. **Guardrails anti-sobredeclaración explícitos en el encargo.** No basta con que el dossier sea
   correcto: el encargo debe prohibir de forma nominal las formas de exagerar — sumar volúmenes de
   variantes como demanda limpia, declarar más posiciones de las que se enumeran, convertir un techo en
   pronóstico, escribir un claim que no esté en ficha, **transcribir el research dentro del brief en
   vez de enlazarlo** (§8).
5. **Una pasada de verificación adversarial al final, por un agente distinto al que escribió.** El
   verificador no revisa su propio trabajo y su encargo es refutar, no confirmar.

### Tres lecciones operativas

- **Los agentes reportan de buena fe la causa que les da el mensaje de error de la herramienta.** Hay que
  verificarla. En el caso fuente, al agotarse la cuota de unidades de API, el proveedor respondía que *el
  plan no incluye acceso*; tres subagentes lo reportaron como límite de plan porque copiaron el mensaje.
  Regla: si el mismo reporte funcionó antes en la misma sesión, es cuota, no plan.
- **Una flota en paralelo puede agotar la cuota de la API a mitad del trabajo.** Los reportes caros
  (relacionadas, preguntas) se cobran por línea devuelta. Cuando la cuota es el cuello de botella,
  **reintentar en serie**, no relanzar la flota.
- **Un agente que no entrega no es un agente que entregó vacío.** En el caso fuente un agente construyó
  tablas completas **atribuyéndolas a subagentes que nunca entregaron reporte**, y después se autocorrigió
  retirando alrededor de una docena de afirmaciones. Tres defensas, en este orden: (a) **exigir el marcado
  de evidencia por afirmación** (§2), que obliga a declarar de dónde salió cada fila y hace visible la que
  no tiene origen; (b) **contar las salidas recibidas** contra las encargadas antes de integrar nada (la
  nota de abajo); (c) cuando un agente **corrige la premisa del encargo**, verificarlo tú mismo antes de
  aceptarlo o de rechazarlo — en ese mismo caso, dos agentes reemplazaron las tablas inventadas con dato
  observado, el resultado contradecía la premisa que el orquestador les había dado, y el resultado era el
  bueno.

> Contexto de fondo: una flota parcial es una falla silenciosa — un lote que termina "completo" con
> agentes caídos adentro se ve igual que un lote sano. Contar salidas, no confiar en el estado agregado.

---

## 8. La entrega — depositar los briefs en el sistema del cliente

Contrato de alcance y de seguridad. **El paso a paso concreto vive en el runbook**
[`producir-serie-de-briefs-seo.md`](../manual-de-uso/growth/producir-serie-de-briefs-seo.md); acá van
solo las reglas que no dependen del sistema — incluida la **verificación mecánica** del depósito, que en
ese runbook es una lista de conteos y no un juicio a ojo.

1. **La unidad de entrega es el slot, no el documento suelto.** Un brief entregado es un brief
   depositado en el slot que le corresponde dentro del sistema del cliente, con su fecha y su ubicación.
   Un documento excelente que vive fuera del calendario no está entregado.

2. **Regla dura de alcance: no se renombra ni se cambian propiedades del sistema del cliente sin
   autorización explícita del operador.** El contenido se **agrega**; el **estado del board** —nombres,
   estatus, fechas, asignaciones, tipos— es decisión del cliente o del operador de cuenta. Los defectos
   de higiene detectados en el §4.3 se **reportan**, no se corrigen de oficio.

3. **Concurrencia.** Si varios agentes escriben en el mismo sistema: **nunca dos sobre la misma página al
   mismo tiempo**, y las escrituras de **propiedades se hacen después** de que terminen las de contenido.
   El orden importa porque una escritura de propiedad sobre una página que todavía está recibiendo
   contenido puede perderse o pisar el estado.

4. **Convenciones del sistema del cliente.** Antes de escribir hay que leer **cómo usa el cliente sus
   propios campos**. En el caso fuente, el campo de resumen ya tenía una convención establecida para
   guardar la justificación SEO de la pieza, y se respetó en lugar de inventar un formato nuevo. Adoptar
   la convención existente es parte del entregable; imponer la propia es deuda para quien opere después.

5. **Verificación adversarial de cierre.** Un agente **distinto al que escribió** revisa estructura,
   consistencia de cifras entre piezas de la serie y coherencia de las reglas comunes, con el checklist
   del §10. No es un trámite: en el caso fuente esa pasada encontró defectos reales en **todas** las
   piezas, incluidos claims de producto no respaldados por ficha y afirmaciones de SERP que declaraban
   más posiciones de las que enumeraban.

La forma de cada brief —qué bloques, en qué orden y con qué techo de extensión— vive en
[`SEO_CONTENT_BRIEF_STRUCTURE_V1.md`](SEO_CONTENT_BRIEF_STRUCTURE_V1.md), que fija además la frontera
que este proceso rompió una vez: **el brief cita la conclusión y enlaza la evidencia, no la
transcribe**, con techo duro de 12.000 caracteres. El dossier del §7 es el anexo, nunca el brief. El
checklist de oficio de citabilidad que se llena **dentro** de sus bloques de estructura y
descubribilidad es la plantilla de la skill `seo-aeo`,
[`templates/content-brief-aeo.md`](../../.codex/skills/seo-aeo/templates/content-brief-aeo.md). Este
documento no duplica ninguna de las dos.

---

## 9. Atomización y distribución

El entregable no termina en el artículo. Cuando el ciclo incluye **piezas derivadas** —posts, carruseles,
banners, video corto— la atomización es parte del brief y tiene sus propias reglas. Ninguna de las tres es
una decisión de diseño: dos salen del intake (la convención del cliente y quién opera el canal) y una del
research (que una plataforma sea superficie de búsqueda).

### 9.1 La convención de assets se deriva del cliente, nunca se inventa

Antes de escribir un plan de atomización hay que **inventariar los entregables reales del cliente** de los
ciclos anteriores y derivar de ahí su **convención de nombres y sus slots**. El plan se escribe en el
vocabulario del cliente, no en uno propio: un plan con nombres nuevos obliga a traducir a quien produce, y
se abandona en el primer ciclo.

Reglas del inventario:

- **Un grep de patrón de nombre no es un inventario** (§12.10). Se barre **por carpeta y por extensión**,
  no por patrón de nombre: si la convención cambió, un regex anclado a la vieja devuelve cero para el
  período que ya migró y concluye una ausencia que no existe.
- **Detectar la degradación de la convención**, que casi siempre está y casi nunca está reportada: un
  código de slot que desaparece, el conteo de piezas por ciclo que baja, dos o tres convenciones
  conviviendo el mismo mes, slots que se encogen mientras otros crecen. Es un hallazgo del intake y se
  trata como los del §4.3 — **se reporta, no se corrige de oficio**, y con la cautela del §12.13 antes de
  llevarlo al cliente.
- **Cada pieza derivada se amarra a la sección del brief de donde sale su contenido.** Sin esa ancla,
  diseño inventa el mensaje y la pieza derivada deja de decir lo que dice el artículo.
- **Un slot condicionado a un dato no verificado se condiciona igual que su H2** (§6.1). Si el H2 no se
  escribe hasta que llegue la ficha, la pieza derivada de ese H2 tampoco: se declara condicionada, con el
  dato faltante nombrado.

### 9.2 Cuando el canal lo opera un tercero: el modelo de handoff

Un canal puede existir y **no operarlo Efeonce**: lo publica otra agencia, o el propio equipo del cliente.
En ese caso el entregable **no es una parrilla, es un paquete de insumo**, y esa diferencia tiene cuatro
consecuencias que se declaran por escrito antes de comprometer nada.

- **Tabla campo por campo de lo que sí es responsabilidad propia:** imagen, título, descripción, URL de
  destino, texto alternativo, tablero o categoría sugerida y fecha **sugerida**. Sugerida, no comprometida
  — la fecha efectiva la decide quien publica.
- **No se promete cobertura de publicación.** El objetivo propio medible es la **cobertura de insumo
  entregado**; cuántas de esas piezas llegaron a publicarse no está bajo control propio y no puede ser el
  KPI del servicio.
- **La medición no es nativa.** Hay dos caminos y solo dos: pedirle el reporte a quien publica, o inferir
  por tráfico de referencia hacia la URL de destino. **Se declara cuál de los dos antes de comprometer la
  métrica**, porque miden cosas distintas y ninguno se improvisa a posteriori.
- **El retiro de un claim perecedero (§5.2) hay que comunicárselo a quien publica**, que tiene copy vivo
  con ese claim adentro. Esa comunicación es **un entregable con fecha y destinatario**, no un
  recordatorio.

### 9.3 Una red social puede ser una superficie de búsqueda

Si al leer el SERP del vertical (§5.1, reporte 7) aparece una plataforma —Pinterest, YouTube, Reddit—
ocupando **varias posiciones de la primera página**, esa plataforma deja de ser "un canal social" y pasa a
ser **una segunda superficie de búsqueda**. Es un hallazgo del research, no una decisión de social media, y
cambia cómo se escribe la pieza derivada:

- el **título y la descripción** en esa plataforma se escriben con **la consulta**, no con el nombre de la
  campaña;
- el **destino** es la URL canónica del artículo, no una landing paralela;
- el **tablero o playlist** se organiza por **tema perenne**, no por año, porque la superficie sigue
  devolviendo esa pieza ciclos después.

---

## 10. Verificación y cierre

Checklist obligatorio antes de dar por cerrada la serie; es el que ejecuta la pasada adversarial del
§8.5. Se corre sobre el set completo, no pieza por pieza.

1. **Consistencia de cifras entre piezas de la misma serie.** El mismo tema no puede tener dos líneas
   base distintas en dos briefs. La ventana, el filtro marca/no-marca y la unidad de agregación son los
   mismos para toda la serie.
2. **Ninguna afirmación de SERP declara más posiciones de las que enumera.** Si el texto dice "top 10"
   debe haber diez dominios distintos listados. Cuando un mismo dominio ocupa varias posiciones, se dice
   así — normalmente el dato real refuerza la conclusión en lugar de debilitarla.
3. **Todo claim de producto está en ficha**, citado textual, con la unidad y el idioma de la ficha.
4. **La línea base y los KPI están anclados al dato medido, no al estimado.** El volumen de terceros
   puede justificar por qué se eligió el tema; no puede ser la meta contra la que se evalúa.
5. **Los techos no se presentan como pronósticos.** Un "si todas subieran a posición 3" es un techo
   aritmético y se rotula como tal.
6. **Las agregaciones no están infladas.** Pares singular/plural que son la misma demanda se descuentan;
   valores idénticos repetidos que huelen a agrupación por bucket de la fuente se señalan.
7. **Cada dato interno citado fue re-verificado** contra el sitio o el runtime, no contra el documento
   que lo afirmaba.
8. **Cada dato del brief lleva su marca de evidencia** (§2) y la sección de límites transcribe los huecos
   del research **sin maquillar**: qué no se pudo medir, qué herramienta quedó sin cuota y qué H2 o pieza
   derivada queda condicionada a un dato que todavía no llegó. Un dato REPORTADO o INFERIDO presentado sin
   su marca es un hallazgo, aunque sea correcto.

Cierre documental: el diagnóstico del cliente vive en `docs/audits/seo/` (una auditoría documenta el
estado observado en una fecha y no se asume vigente por existir — ver
[`docs/audits/README.md`](../audits/README.md)); los cambios de proceso vuelven a este modelo operativo;
la doctrina nueva que emerja va a la skill `seo-aeo`, no acá.

---

## 11. Cómo se mide el resultado

Tres reglas de medición. La instrumentación y el detalle metodológico están en el módulo
[`07_MEASUREMENT.md`](../../.codex/skills/seo-aeo/modules/07_MEASUREMENT.md).

1. **El score es en clics incrementales, con la curva de CTR del propio sitio — así lo calcula el
   motor.** No es una fórmula a implementar en un script: es la que ya corre en
   [`keyword-opportunities-reader.ts`](../../src/lib/growth/seo/keyword-opportunities-reader.ts),
   `impresiones × (CTR_esperado_en_objetivo − CTR_actual)`, con `CTR_esperado` tomado del CTR observado
   del propio sitio en la posición meta. Se describe acá para poder entenderla y auditarla; para
   ejecutarla se lee la superficie. Usar la curva propia y no un benchmark de
   industria absorbe las condiciones reales del vertical sin tener que estimarlas: en el caso fuente el
   CTR propio de posición 1 era 4,25% frente a un benchmark de industria de 28-40%, porque AI Overviews y
   galerías se comen el clic. Con el benchmark, todo el backlog habría quedado sobrevalorado ~7×.

2. **A 60 días se evalúa dirección, no magnitud, cuando la línea base es baja.** Con ventana corta y
   pocos clics de partida, la variación absoluta es ruido. Lo que se evalúa es el signo y la consistencia:
   la posición ponderada mejora, las impresiones suben, el conteo de queries crece. La magnitud se
   discute cuando haya serie suficiente para separar tendencia de estacionalidad.

3. **El conteo de queries distintas es el detector de canibalización.** Si suben las impresiones pero
   **no** sube el número de queries distintas, el artículo no abrió terreno nuevo: reasignó tráfico de
   otras páginas del propio sitio. Es un resultado neutro o negativo disfrazado de crecimiento, y se
   reporta como tal.

**Métrica AEO cuando hubo un pre-emptor de tesis.** Si el research encontró que alguien publicó el mismo
concepto antes (§5.3), la medición del ciclo incorpora una pregunta extra: **¿a qué marca le atribuyen el
concepto los motores de respuesta?** No basta con que la pieza rankee — que un motor atribuya el concepto a
la marca equivocada es un resultado negativo que ninguna métrica de posición muestra. Se mide preguntándole
a los motores por el concepto y registrando la marca citada, con la misma disciplina de ventana y `as-of`
que el resto de la medición.

**Métrica cuando la pieza construye entidad de marca.** Si el objeto citable **es** la entidad —y por
eso el `unbrand test` falló por construcción (§6.1)—, el KPI no son los backlinks al objeto: son las
**menciones y las citas del léxico propietario**, que para visibilidad en motores de respuesta pesan del
orden de **3× más** que un backlink (`seo-aeo` #3). Se declara así en el brief, con la misma disciplina
de ventana y `as-of`. Cambiar la métrica no es bajar la vara: es medir lo que la pieza efectivamente
mueve.

**Unidad de agregación.** Para striking distance la unidad correcta es el par `(query, página)`. Sumar
impresiones por query **infla**, porque una búsqueda donde aparecen varias páginas del sitio genera una
fila por página: en el caso fuente una consulta de marca aparecía con 300 páginas y sumaba 86.282
impresiones. En temas no-marca la inflación medida fue 1,0x-1,1x, dentro del ruido — pero el sesgo
existe, y afecta a los agregados por tema y al cálculo de la curva de CTR, que debe computarse solo sobre
filas no-marca.

**Defender por conteo de posiciones, no por volumen agregado.** Cuando una pieza sostiene muchas
consultas en top 3, el caso se defiende por el número de posiciones ganadas; la suma de volúmenes de
esas consultas incluye variantes que son la misma demanda y no es una cifra limpia.

---

## 12. Antipatrones

Dieciocho reglas: los ocho errores de método observados y corregidos en el primer ciclo del caso fuente
(1 a 8), la regla de plataforma que ese mismo caso destapó (9), cuatro errores de método del ciclo
siguiente (10 a 13) y cinco del ciclo de autoridad temática y entidad (14 a 18). Se enuncian como reglas
del modelo.

1. **No se usan impresiones de Search Console para juzgar contenido nuevo.** Es razonamiento circular:
   striking distance filtra páginas que ya rankean, y un tema sin contenido no puede aparecer ahí por
   construcción.
2. **No se interpreta la posición de Search Console con pocas impresiones.** Con muestra insuficiente el
   diagnóstico correcto es la brecha volumen-vs-impresiones, no el ranking. Lo que discrimina es si
   existe una página que realmente rankee.
3. **No se suman impresiones por consulta cuando hay varias páginas del sitio en el resultado.** Cada
   par `(consulta, página)` genera una fila; sumar por consulta infla. Para striking distance el par es
   la unidad correcta.
4. **No se presenta la suma bruta de un clúster de terceros como demanda limpia.** Se descuentan los
   pares singular/plural que son la misma demanda y se señalan los valores idénticos repetidos que
   indican agrupación por bucket de la fuente. Es el punto exacto donde el cliente va a preguntar.
5. **No se descarta una familia de temas leyendo el SERP del eje equivocado.** Dos consultas cercanas
   pueden tener intención distinta: una puede ser de referencia o diseño gráfico y la otra, comercial.
   Se lee el SERP de la consulta que se piensa atacar, no de su prima.
6. **No se etiqueta "top 10" una lista con menos de diez dominios.** Cuando un mismo dominio ocupa varias
   posiciones, se dice cuántas. El dato real suele reforzar la conclusión.
7. **No se parafrasea un claim de ficha.** Se cita textual, con su unidad y su idioma. Dos claims
   parecidos no son el mismo claim, y el falso llega al cliente.
8. **No se acepta la causa que declara el mensaje de error de una herramienta sin verificarla.** Un
   límite de cuota puede presentarse como límite de plan; si el mismo reporte funcionó antes en la sesión,
   es cuota. Ante cuota, reintentar en serie, no relanzar la flota.
9. **No se reimplementa a mano una capacidad que el portal ya tiene.** Antes de construir un análisis
   manual se verifica si la capacidad existe en Greenhouse **y si está encendida para esa cuenta** — son
   dos hechos distintos. Un motor que existe y nadie usó para el cliente se ve, desde el research, igual
   que un motor que no existe. En el caso fuente se recalculó a mano un score que el reader canónico ya
   producía.
10. **Un grep de patrón de nombre no es un inventario.** Un regex anclado a la convención vieja devuelve
    cero para el período que ya migró a otra, y la conclusión "los entregables desaparecieron" resulta
    falsa: existían, con otro nombre y otra extensión. **Para concluir una ausencia hay que cambiar el eje
    de búsqueda —carpeta, extensión, fecha— y nombrar explícitamente dónde no se miró.** Su variante en
    contenido es la misma trampa con otra piel: **un barrido por patrón de slug no prueba que un tema
    esté libre.** La canibalización se verifica leyendo el cuerpo y contando términos del concepto (§5,
    gate de canibalización).
11. **El peso en caracteres no mide la calidad de una sección.** Llamar "flaca" a una capa del entregable
    porque ocupa poco del documento confunde formato con cobertura: una checklist y una tabla son el
    formato más denso que existe. **Se mide cobertura de decisiones, no volumen de texto.**
12. **Una dificultad sospechosamente baja se verifica en el SERP antes de fijarse como objetivo.** Puede
    ser demanda de referencia —códigos, muestrarios, nomenclatura— y no demanda del tema. Hasta
    verificarla, la keyword entra al backlog como **oportunidad condicionada**, nunca como objetivo
    comprometido. Es el vecino del antipatrón 5: allá se lee el SERP del eje equivocado, acá se cree una
    métrica sin leer ningún SERP.
13. **Un hallazgo de inventario local no es una acusación de proceso.** Una carpeta vacía o cruzada puede
    ser sincronización de almacenamiento, no un incumplimiento de entrega. **Se reverifica con el equipo
    dueño antes de reportarlo al cliente**, y se redacta como observación con su incertidumbre declarada,
    no como conclusión.
14. **Cuando muere el porqué de una pieza, no se le busca otro ángulo.** La razón por la que un tema
    entró al backlog es parte de la decisión: si el research la mata, la pieza vuelve a cero y el slot
    se reabre. Salvarla con un ángulo nuevo es publicar por publicar con un racional puesto encima. Y si
    el tema le habla a otro comprador, la decisión es **comercial**: se escala, no se asume (§6.2).
15. **El concepto no es el titular.** Un titular **promete**; el concepto solo **nombra**. Poner la
    etiqueta del ángulo en el lugar del título —y apilarle modificadores que no agregan nada— produce un
    nombre que describe el trabajo interno en vez de convocar al lector.
16. **No se mete taxonomía interna en el nombre visible.** "Nodo consolidador —", "Pillar —",
    "Satélite 3" son etiquetas de arquitectura: van en el bloque de arquitectura del brief, nunca en el
    título que ve el cliente ni en el que verá el lector.
17. **No se repite el mismo titular en las cuatro superficies.** H1, SEO title, OG y slug comparten
    tesis y hacen trabajos distintos; el slug no intenta ser headline (`copywriting/03` §6).
18. **No se des-escapa el HTML de un sitio moderno para leerlo.** Dos lecturas falsas salen de ahí, y
    las dos parecen hallazgos:
    - **Schema fantasma.** El payload de una app React/Next trae objetos propios de la aplicación con
      su propio `@type`; al des-escapar aparecen como si fueran datos estructurados. En el caso fuente
      se "encontró" un `@type` inválido nueve veces por página cuando en el HTML crudo había **cero**.
      Se extrae **solo** `<script type="application/ld+json">`, **sin des-escapar**. Y se distingue
      **inválido → retirar** de **ausente (cero bloques) → agregar**: piden acciones opuestas.
    - **Conteos de palabras inflados ~3×**, porque el payload duplica el contenido. Se cuenta sobre el
      `<main>` renderizado.

---

## Referencias

- **Oficio SEO/AEO:** skill `seo-aeo` —
  [`02_SEO_CONTENT.md`](../../.codex/skills/seo-aeo/modules/02_SEO_CONTENT.md) (contenido, clústeres,
  striking distance) ·
  [`07_MEASUREMENT.md`](../../.codex/skills/seo-aeo/modules/07_MEASUREMENT.md) (medición, GSC, Share of
  Voice) · [`ANTIPATTERNS.md`](../../.codex/skills/seo-aeo/ANTIPATTERNS.md).
- **Pricing y venta del servicio:** skill `seo-aeo-practice`.
- **Caso fuente:** [`docs/audits/seo/BEREL_SEO_DIAGNOSTIC_2026-08-25.md`](../audits/seo/BEREL_SEO_DIAGNOSTIC_2026-08-25.md)
  (en publicación al momento de escribir este modelo; es el destino canónico del diagnóstico).
- **Plataforma (camino primario, §1.1):** superficie de operador `/admin/growth/seo/keywords`
  ([vistas](../../src/views/greenhouse/admin/growth/seo/keywords/) ·
  [reader](../../src/lib/growth/seo/keyword-opportunities-reader.ts) ·
  [ruta ecosystem](../../src/app/api/platform/ecosystem/growth/seo/keyword-opportunities/route.ts) ·
  [TASK-1308](../tasks/complete/TASK-1308-growth-seo-keyword-opportunities-ui.md)).
- **Plataforma (runtime del dato):**
  [`GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`](../architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md) ·
  [`modulo-seo-search-visibility-360.md`](../documentation/growth/modulo-seo-search-visibility-360.md) ·
  [`conexion-search-console.md`](../documentation/growth/conexion-search-console.md) ·
  [`operar-serie-search-console.md`](../manual-de-uso/growth/operar-serie-search-console.md) ·
  [`seguir-keywords-oportunidades-seo.md`](../manual-de-uso/growth/seguir-keywords-oportunidades-seo.md).
- **Estructura del brief (forma, techo y frontera con el dossier):**
  [`SEO_CONTENT_BRIEF_STRUCTURE_V1.md`](SEO_CONTENT_BRIEF_STRUCTURE_V1.md).
- **Producción y entrega de la serie:** runbook
  [`producir-serie-de-briefs-seo.md`](../manual-de-uso/growth/producir-serie-de-briefs-seo.md)
  (verificación mecánica del depósito, indentación de toggles y tablas, inventario de assets del
  cliente) · plantilla de brief
  [`templates/content-brief-aeo.md`](../../.codex/skills/seo-aeo/templates/content-brief-aeo.md).
- **Producción de la pieza:**
  [`AGENTIC_BLOGPOST_END_TO_END_RUNBOOK_V1.md`](public-site-content-factory/AGENTIC_BLOGPOST_END_TO_END_RUNBOOK_V1.md).
- **Calidad de solución transversal:** [`SOLUTION_QUALITY_OPERATING_MODEL_V1.md`](SOLUTION_QUALITY_OPERATING_MODEL_V1.md).
