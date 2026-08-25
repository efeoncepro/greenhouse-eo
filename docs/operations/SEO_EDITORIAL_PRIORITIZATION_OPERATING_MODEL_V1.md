# SEO Editorial Prioritization Operating Model V1

> **Tipo de documento:** Modelo operativo (proceso repetible, agnóstico al cliente).
> **Versión:** 1.0 · **Fecha:** 2026-08-25.
> **Ámbito:** cómo Efeonce ejecuta un research de SEO/AEO y una priorización editorial para un cliente
> con blog activo, de punta a punta: insumos, carriles, intake del sistema editorial, secuencia,
> criterio de descarte, producción de briefs, entrega, verificación y medición.
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

---

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
   pronóstico, escribir un claim que no esté en ficha.
5. **Una pasada de verificación adversarial al final, por un agente distinto al que escribió.** El
   verificador no revisa su propio trabajo y su encargo es refutar, no confirmar.

### Dos lecciones operativas

- **Los agentes reportan de buena fe la causa que les da el mensaje de error de la herramienta.** Hay que
  verificarla. En el caso fuente, al agotarse la cuota de unidades de API, el proveedor respondía que *el
  plan no incluye acceso*; tres subagentes lo reportaron como límite de plan porque copiaron el mensaje.
  Regla: si el mismo reporte funcionó antes en la misma sesión, es cuota, no plan.
- **Una flota en paralelo puede agotar la cuota de la API a mitad del trabajo.** Los reportes caros
  (relacionadas, preguntas) se cobran por línea devuelta. Cuando la cuota es el cuello de botella,
  **reintentar en serie**, no relanzar la flota.

> Contexto de fondo: una flota parcial es una falla silenciosa — un lote que termina "completo" con
> agentes caídos adentro se ve igual que un lote sano. Contar salidas, no confiar en el estado agregado.

---

## 8. La entrega — depositar los briefs en el sistema del cliente

Contrato de alcance y de seguridad. **El paso a paso concreto vive en el runbook**
[`producir-serie-de-briefs-seo.md`](../manual-de-uso/growth/producir-serie-de-briefs-seo.md) (en
publicación al momento de escribir este modelo); acá van solo las reglas que no dependen del sistema.

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
   del §9. No es un trámite: en el caso fuente esa pasada encontró defectos reales en **todas** las
   piezas, incluidos claims de producto no respaldados por ficha y afirmaciones de SERP que declaraban
   más posiciones de las que enumeraban.

La forma de cada brief —secciones, orden, nivel de detalle— sale de la plantilla de la skill `seo-aeo`,
[`templates/content-brief-aeo.md`](../../.codex/skills/seo-aeo/templates/content-brief-aeo.md). Este
documento no la duplica.

---

## 9. Verificación y cierre

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

Cierre documental: el diagnóstico del cliente vive en `docs/audits/seo/` (una auditoría documenta el
estado observado en una fecha y no se asume vigente por existir — ver
[`docs/audits/README.md`](../audits/README.md)); los cambios de proceso vuelven a este modelo operativo;
la doctrina nueva que emerja va a la skill `seo-aeo`, no acá.

---

## 10. Cómo se mide el resultado

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

## 11. Antipatrones

Ocho errores de método observados y corregidos en el caso fuente, más una novena regla de plataforma que
el mismo caso destapó. Se enuncian como reglas del modelo.

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
- **Producción y entrega de la serie:** runbook
  [`producir-serie-de-briefs-seo.md`](../manual-de-uso/growth/producir-serie-de-briefs-seo.md)
  (en publicación al momento de escribir este modelo) · plantilla de brief
  [`templates/content-brief-aeo.md`](../../.codex/skills/seo-aeo/templates/content-brief-aeo.md).
- **Producción de la pieza:**
  [`AGENTIC_BLOGPOST_END_TO_END_RUNBOOK_V1.md`](public-site-content-factory/AGENTIC_BLOGPOST_END_TO_END_RUNBOOK_V1.md).
- **Calidad de solución transversal:** [`SOLUTION_QUALITY_OPERATING_MODEL_V1.md`](SOLUTION_QUALITY_OPERATING_MODEL_V1.md).
