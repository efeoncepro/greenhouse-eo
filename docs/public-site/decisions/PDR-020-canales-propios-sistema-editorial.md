# PDR-020 — Canales propios de Efeonce: un motor editorial, cinco roles de canal

> **Tipo:** Product Decision Record (sistema editorial y rol de las superficies de adquisición propias).
> **Estado:** Accepted (marco y roles) — sesión de diseño con el operador, 2026-09-10.
> **Revisión 1.1 (2026-09-10, misma sesión):** corregido el modelo de formatos — cada canal tiene
> **catálogo propio**; las franquicias tienen **canal-hogar** y satélites, no presencia universal.
> Vocero de talking head cerrado. Blog declarado multiformato (tools, webinars). Educativo de
> LinkedIn incorporado.
> **Ámbito:** Canales propios de marca Efeonce — Blog (Marketing con Manzanitas), LinkedIn, YouTube,
> Instagram, Threads y Glitch (newsletter). No cubre canales de cliente ni paid social.
> **Skills:** `content-marketing-studio`, `social-media-studio`, `copywriting`, `seo-aeo`,
> `digital-marketing`, `growth-marketing-cro`, `efeonce-agency`, `greenhouse-email`,
> `efeonce-public-site-wordpress`.
> **Por qué vive acá:** [PDR-003](PDR-003-layering-ecosistema-digital-efeonce.md) gobierna el layering del
> **ecosistema digital completo** — no sólo el sitio — y ubica social, blog y newsletter como superficies de
> **adquisición**. Este PDR es su hijo natural: baja ese layering al sistema editorial que opera esas superficies.
> **No-duplicación:** cita, no copia — [PDR-003](PDR-003-layering-ecosistema-digital-efeonce.md) (layering),
> [PDR-005](PDR-005-landing-redes-sociales-posicionamiento.md) (doctrina social y diferenciador),
> [PDR-019](PDR-019-taxonomia-editorial-canonica-blog-wordpress.md) (taxonomía editorial canónica),
> [PDR-018](PDR-018-pillar-experience-arquitectura-editorial-y-runtime.md) (Pillar/Cluster y host),
> `docs/context/09_marca-agencia.md` (masterbrand y voz), `docs/context/15_panorama-competitivo-benchmark-industria.md`
> (baseline competitivo), `TASK-1802` (Content Hub `/blog`).

## Contexto

Los canales propios de Efeonce crecieron sin un sistema editorial declarado. El inventario documental al
2026-09-10 es desigual:

| Canal | Estado documental previo a este PDR |
|---|---|
| Blog (Marketing con Manzanitas) | Gobernado: PDR-003, PDR-015, PDR-017, PDR-018, PDR-019 + TASK-1802 |
| Glitch | Existe en dos superficies: newsletter semanal y categoría raíz del blog (PDR-019) |
| LinkedIn | Sólo mecánica de plataforma en la skill. La estrategia remite a *Thought Territories T1–T5* en un doc de marca **que no está en el repo** |
| Instagram | Mecánica + `SEASONAL_CONTENT`; sin estrategia de canal propio |
| YouTube | Sólo mecánica. Sin estrategia. TASK-1802 lo espera como inventario de formato |
| Threads | Sin documentación alguna, tampoco en `social-media-studio/modules/01_PLATFORM_MECHANICS.md` |

Tres tensiones fuerzan la decisión:

1. **El portafolio estático dejó de funcionar.** La doctrina social que Efeonce ya declaró en PDR-005 §2
   sostiene autenticidad por sobre pulido y demota seguidores y likes frente a watch-time, saves y shares.
   Un carrusel de resultado final optimiza justamente la métrica que la propia doctrina declara muerta:
   es un *claim*, no una prueba.
2. **Efeonce vende capacidades que no practica en canal propio.** PDR-005 §1.1 declara que el diferenciador
   social es la *activación de conocimiento experto y voces ejecutivas*, y §4.1 lista trendjacking como módulo
   del retainer. Ninguna de las dos se ejercita hoy en los canales de la marca.
3. **La categoría no reconoce a Efeonce.** El baseline competitivo registra que los competidores dominan su
   SERP de categoría con contenido de autoridad mientras Efeonce está ausente — pese a vender AEO. El mismo
   baseline muestra que la industria se descubre por prensa gremial (ANDA 57%, DF 56%, Adlatina 45%) y **no
   por LinkedIn (2%)**: LinkedIn sirve al comprador, no al reconocimiento de categoría. Son trabajos distintos.

## Decisión — seis capas

### 1. Un motor editorial, no cinco estrategias

Cada canal recibe un **rol distinto dentro del bow-tie**, operando sobre un **motor editorial compartido**.
No se diseña una estrategia-universo por canal: eso multiplica el costo por cinco y garantiza que ninguno
alcance profundidad ni cadencia.

**Economía de producción — "una producción, N cortes":** una grabación, un experimento o un webinar se
concibe para su corte principal y rinde cortes adicionales en la misma sesión. Producir por canal de forma
independiente es el modo de falla que hace insostenible el calendario al tercer mes.

**Esa economía NO implica presencia universal.** Compartir producción es distinto de compartir catálogo:
cada canal tiene formatos **nativos** que nacen y mueren ahí, y sólo algunas producciones se despiezan. Un
formato que se replica a un canal donde no rinde no ahorra trabajo — lo desperdicia, y además ensucia el
canal. La regla operativa está en la capa 4.

### 2. Tres ejes ortogonales que no se mezclan

```text
TERRITORIOS (de qué hablas)  →  heredados de PDR-019
FORMATOS    (cómo lo dices)  →  las líneas de la capa 4
CANALES     (dónde vive)     →  los roles de la capa 5
```

Confundir los ejes produce listas de contenido inoperables. "Agentes" y "AEO" son territorios, no tipos de
contenido; "talking head" es un formato, no un canal.

### 3. Los territorios se heredan del blog; social no crea taxonomía propia

Los territorios editoriales de los canales propios son los de la taxonomía canónica de PDR-019 —
**AEO, Inteligencia Artificial, HubSpot, Loop Marketing, Growth, Diseño, SEO, Marketing Digital,
Inbound Marketing** — más **Novedades Efeonce** como carril institucional secundario.

- **NUNCA** crear una taxonomía social paralela. La herencia da coherencia cross-superficie sin costo y hace
  que todo el sistema apunte al mismo activo de autoridad.
- **Agentes** se trata como sub-territorio de `Inteligencia Artificial` mientras no acumule cuerpo propio.
  Promoverlo a raíz exige el protocolo de PDR-019 (slug, redirect, enlaces internos, purge, QA).
- El ataque al gap de categoría del baseline se concentra en **AEO** e **Inteligencia Artificial**, con
  método y datos propios — nunca opinión ni auto-bombo.

### 4. Catálogo propio por canal; las franquicias tienen canal-hogar

Un formato pertenece a un canal por la señal que ese canal premia, no por conveniencia de calendario.
El sistema distingue dos cosas:

**a) Formatos nativos — nacen y mueren en su canal.**

| Canal | Formatos nativos |
|---|---|
| **Instagram** | proceso y construcción real con tropiezos · talking head de tendencia · trendjacking · **estacional (la fecha vista desde el oficio)** · cultura, equipo y talento (employer brand) — **no lleva casos de éxito**: su señal es reenvío, y una métrica B2B no se manda por DM |
| **LinkedIn** | **contenido educativo** (post extenso y documento nativo) · **el corte del caso de éxito** · POV profesional que abre conversación · talking head en versión ejecutiva |
| **YouTube** | long-form del experimento completo · tutorial y how-to (demanda de búsqueda) · webinar grabado · Shorts como anzuelo al long-form |
| **Threads** | reacción rápida y trendjacking · opinión corta con criterio · hilo de aprendizaje en bruto · pregunta abierta a la audiencia |
| **Blog** | artículos y Pillars · **casos de éxito completos** (canonical) · **tools y graders** · **webinars** · ebooks y lead magnets · data studies · archivo Glitch |
| **Glitch (email)** | la edición semanal |

**b) Franquicias con canal-hogar — nacen en un canal y viajan como corte, nunca como copia.**

| Franquicia | Canal-hogar | Satélites (qué corte reciben) |
|---|---|---|
| **Behind the Build** | Instagram | LinkedIn: el aprendizaje, no el making-of · YouTube: versión larga si el build lo amerita |
| **Versus** | YouTube + Blog (data study) | Instagram: el resultado visual · LinkedIn: el veredicto y qué implica |
| **Glitch** | Glitch (email) | Blog: archivo · Threads: el gancho · LinkedIn: la lectura de una noticia |
| **Trendjacking** | Threads + Instagram | — reactivo; no se despieza a canales lentos |
| **Estacional** | Instagram | LinkedIn: el argumento profesional detrás de la metáfora, sólo cuando la disciplina es legible para un comprador (ver capa 4.4) |
| **Casos de Éxito** | Blog (canonical) | LinkedIn: el corte que circula · sales enablement: la versión en video · landings: el dato citable |
| **Educativo** | LinkedIn | Blog: la versión que responde a búsqueda (ver capa 4.1) |

**Reglas del despiece:**

- **NUNCA** replicar una pieza a un canal cuya señal no la premia. Un carrusel no es contenido de Threads;
  una noticia de texto no es contenido de Instagram; un hilo en bruto no es contenido de LinkedIn.
- Un satélite recibe **un corte con trabajo propio**, no un re-post. Si el corte no aporta nada distinto del
  original, el satélite no se hace.
- Trendjacking **no se despieza**: su valor es la ventana temporal, y un canal lento la pierde.

**El formato transversal — talking head** (*face-to-camera*, en B2B *executive-led video*): es la única
producción que rinde corte en cuatro canales desde una sola grabación (Instagram, LinkedIn, YouTube Shorts,
y gancho en Threads). Es la expresión del diferenciador de PDR-005 §1.1 y ya tiene capability de producción:
el paquete `Executive / Interview Capture` de **Run & Gun Studio**.

**Voces — el modo de producción:** quién da la cara. **Decidido: el vocero es Julio Reyes** (CEO). El formato
construye reconocimiento facial y sólo rinde con recurrencia de la misma cara; un segundo vocero se incorpora
como decisión explícita, no por disponibilidad de agenda.

### 4.1 Educativo LinkedIn → Blog: corte, nunca copia

El contenido educativo nace en **LinkedIn** — es donde está el comprador y donde el dwell paga — y se
consolida en el **blog**, que es el activo canónico (URL, schema, citabilidad IA).

- **NUNCA** publicar en el blog el mismo texto del post de LinkedIn. Un post optimizado para dwell en feed y
  un artículo que responde a una búsqueda son piezas distintas: el blog necesita la versión answer-first, con
  la pregunta real como entrada, estructura citable y enlaces internos al territorio.
- La versión del blog es la que hereda el territorio de PDR-019 y la que `seo-aeo` gobierna.
- Si el tema no da para una versión de blog con trabajo propio, se queda sólo en LinkedIn. Un artículo que
  existe únicamente para reciclar un post degrada el activo.

### 4.3 Casos de Éxito: un activo de tres profundidades, con compuerta de cliente

El caso de éxito no es un formato social: es un **activo comercial** que existe en tres profundidades, cada
una con su superficie y su trabajo.

| Profundidad | Dónde vive | Trabajo | Ya decidido en |
|---|---|---|---|
| **El dato citable** — una línea con métrica | bloque de prueba de cada landing de servicio | conversión | PDR-004 §4, PDR-005 §4 |
| **El caso completo** — la narrativa con método | **Blog** (canonical, vía Content Factory) | consideración → decisión | briefs ANAM (`HUBSPOT_*_ANAM_CASE_STUDY_BRIEF_V1.md`) |
| **El corte que circula** — el aprendizaje, no el trofeo | **LinkedIn** | prueba ante el comprador | este PDR |

**Reglas:**

- **El canonical es el blog.** Un caso necesita URL estable, schema y citabilidad; un post de LinkedIn no la
  da. LinkedIn recibe el corte, no el original.
- **El caso se cuenta como método, no como trofeo.** Doctrina ya establecida en los briefs ANAM: el titular
  de trabajo es *"Un dashboard no arregla un proceso comercial: cómo construimos paneles confiables en HubSpot
  para ANAM"*, no "caso de éxito ANAM". El lector se lleva el método aunque nunca contrate.
- **Cada caso se ata a un servicio del catálogo** (`docs/services/`) que prueba. Un caso que no prueba una
  oferta concreta es una anécdota.
- **Compuerta de cliente — la diferencia dura con toda otra franquicia.** Los briefs ANAM nacen en estado
  `private` y declaran que *no autorizan publicación automática*. La cadencia de esta franquicia **no la fija
  el calendario editorial: la fija la aprobación del cliente**. **NUNCA** comprometer un caso en el calendario
  antes de tener la autorización, ni publicar métricas de cliente sin ella.
- **Sólo casos citables.** Inventario con métrica real al 2026-09: Sky (+127% tráfico orgánico), Bresler
  (+180% ventas digitales), Pinturas Berel (retainer SEO+AEO), ANAM (dos casos HubSpot en desarrollo
  editorial). Si no hay resultado citable, se usan cifras ilustrativas del modelo **declarándolo** — nunca
  se infla ni se inventa (PDR-004, PDR-005).
- **No hay superficie `/casos` en el sitio y este PDR no la crea.** Hoy los casos viven como bloque de prueba
  en landings y como pieza editorial en el blog. Si se decide un índice agregador, es decisión de producto
  aparte y depende del inventario de la decisión pendiente 2.

### 4.4 Estacional: la fecha cultural vista desde el oficio

**Decisión (2026-09-10): se conserva como línea propia y permanente**, no como compromiso previo con
vencimiento. Su razón de existir es **marca**: conecta a Efeonce con el calendario cultural de sus mercados
(Chile, Perú, Colombia, México, Estados Unidos) hablando en el idioma de su propio oficio.

Lo que la salva del post genérico de efeméride es que **cada fecha se cuenta como una demostración de una
disciplina de la casa**, no como saludo. El plan vigente lo hace en las 13 piezas: Halloween es un envase que
pierde personalidad hasta desaparecer por imitación (branding); el Día de la Usabilidad son fricciones
digitales como obstáculos físicos (UX); el Óscar es retirar una taza o una luz para cambiar una escena
(dirección de arte); el Día de la Poesía es un párrafo que pierde palabras hasta revelar un poema
(copywriting); el Carnaval es una retícula editorial que empieza a bailar (diseño editorial).

| Atributo | Valor |
|---|---|
| **Canal-hogar** | Instagram — es craft y cultura, y la pieza es visual antes que argumental |
| **Satélite** | LinkedIn, **sólo** cuando la disciplina de la metáfora es legible para un comprador |
| **Qué recibe el satélite** | **el argumento profesional detrás de la metáfora**, desarrollado — nunca el mismo post con otro caption |
| **Métrica** | sends + saves (que la pieza se reenvíe). **Nunca seguidores ni volumen de posts** |
| **Trabajo** | afinidad de marca por demostración de oficio |

**Relación con Trendjacking:** son la misma familia — cultura — con **economía de producción opuesta**.
Estacional se planifica con meses de anticipación sobre fechas conocidas; Trendjacking no se puede planificar
y vive en una ventana de horas. Se complementan: una llena el calendario predecible, la otra aprovecha lo
impredecible. **NUNCA fusionarlas en una sola línea**: tienen cadencia, aprobación y riesgo distintos.

**Reglas:**

- **NUNCA un saludo.** Si la pieza no demuestra una disciplina de la casa, no es de esta línea y no se publica.
  El estándar es el del plan vigente: una metáfora que sólo Efeonce podría firmar.
- **NUNCA publicar la misma pieza en Instagram y LinkedIn con caption distinto.** LinkedIn recibe el
  argumento desarrollado o no recibe nada.
- **El plan 2026–2027 sigue vigente** (`docs/audits/social/EFEONCE_SEASONAL_CONTENT_PLAN_2026_2027.md`):
  13 piezas, 5 mercados, con adaptación en inglés para Estados Unidos en Super Bowl y Óscar. Pendiente
  operativo heredado de ese plan: la conciliación tarea/calendario de MET-2339–2342.
- El nombre operativo de la línea es **Estacional**; el equipo la opera hoy como "efemérides".

### 4.2 El blog es multiformato, no un feed de artículos

El blog aloja artículos, **tools/graders**, **webinars**, ebooks, data studies, casos y el archivo Glitch.
Esto es exactamente el inventario que `TASK-1802` declara como bloqueante (*"inventario canónico de Tools,
Videos y Webinars"*). Cada pieza no-artículo necesita canonical URL, owner, tipo, tema, fecha, imagen, estado
y freshness antes de definir su reader o registro. **Formato ≠ categoría:** los formatos son un eje de
navegación distinto de los territorios de PDR-019 y no se mezclan en la misma taxonomía.

### 5. Rol por canal

Las señales de plataforma se citan **as-of 2026-07** desde `social-media-studio/modules/01_PLATFORM_MECHANICS.md`
y se reverifican contra su `SOURCES.md` antes de usarlas como argumento. Este PDR fija **roles**, no cifras.

| Canal | Rol | Señal que manda *(as-of 2026-07)* | Por qué ese catálogo |
|---|---|---|---|
| **Blog** | el **activo**: URL canónica, schema, citabilidad IA | orgánico + citación | es lo único que permanece y se cita; aloja lo que necesita URL estable |
| **LinkedIn** | el **comprador** | dwell ≥61s; comentario con sustancia ≫ like | el texto extenso y el documento nativo son los que pagan dwell |
| **YouTube** | la **profundidad** y el segundo buscador | watch time, session engagement | único canal con demanda real de long-form y de búsqueda de tutorial |
| **Instagram** | el **craft y la cultura** | sends + saves (followers = señal débil) | el proceso visual y el tropiezo son lo reenviable |
| **Threads** | la **conversación viva** | conversación y respuesta rápida | costo de producción casi nulo; premia la ventana temporal |
| **Glitch (email)** | la **propiedad** | suscripciones, CTR | es el único canal que no depende de un algoritmo ajeno |

El catálogo de cada canal está en la capa 4. **El rol explica el catálogo; el catálogo no se copia entre canales.**

### 6. Glitch es una franquicia cross-superficie, nunca una marca social nueva

Glitch ya vive como newsletter semanal y como categoría raíz del blog (PDR-019). Su extensión a social es un
**rail adicional de la misma franquicia**: el átomo social es el gancho, la edición email es el producto y el
post de blog es el archivo. Un Glitch que nace y muere en una red social convierte un activo propio en alcance
arrendado.

## Reglas duras

1. **Toda pieza de proceso deja un aprendizaje transferible.** Filtro: *¿qué se lleva quien nunca nos va a
   contratar?* Sin eso, Behind the Build es auto-bombo con estética de transparencia.
2. **Los tropiezos son obligatorios, no decorativos.** Un proceso donde todo sale bien a la primera se lee
   como guion y anula la credibilidad del resto.
3. **La noticia es el pretexto; el método es el producto.** Aplica a Glitch y a Trendjacking. Una pieza que
   termina donde termina la noticia es un noticiero más y compite por volumen, no por criterio.
4. **Hook en menos de 2 segundos, sin excepción.** Ninguna intro, logo ni presentación antes del hook. Crítico
   en talking head, donde perder al lector en los primeros segundos colapsa la distribución.
5. **Ninguna línea nace sin métrica declarada**, y ninguna se mide por seguidores ni por volumen de posts.
6. **Trendjacking tiene presupuesto de tiempo, no de slots.** Exige ventana definida en horas, aprobador único
   sin comité y lista de temas prohibidos escrita *antes*. Como es capability vendida (PDR-005 §4.1), un
   trendjack fallido en canal propio opera como anti-caso comercial.
7. **Talking head exige vocero fijo.** El formato construye reconocimiento facial y sólo rinde con recurrencia
   de la misma cara. Rotar vocero por pieza es pagar el costo sin obtener el activo.
8. **Se abre de a poco.** Un calendario que no se sostiene es deuda, no plan.

## Consecuencias

- **Cruce con `TASK-1802`:** el Content Hub `/blog` está bloqueado por *"inventario canónico de Tools, Videos
  y Webinars"*. Abrir YouTube **genera ese inventario**, pero exige decidir **antes de producir** si el
  canonical de un video es YouTube o el blog. Producir primero y ordenar después es deuda editorial garantizada.
- **El naming visible sigue pendiente** (Think vs Marketing con Manzanitas, declarado en TASK-1802). Abrir
  canales sin resolverlo obliga a renombrar en seis lugares después.
- **Threads queda como experimento con criterio de salida**, no como compromiso de cadencia: sin documentación
  previa en el repo y siendo la plataforma más volátil del set, se abre con ventana y condición de cierre
  escritas. Su mecánica debe incorporarse a `01_PLATFORM_MECHANICS.md` cuando exista evidencia propia.
- **La estrategia de LinkedIn queda huérfana de fuente.** Los *Thought Territories T1–T5* citados en
  `docs/context/09_marca-agencia.md` remiten a un doc de marca ausente del repo. Hasta reponerlo o reemplazarlo,
  los territorios de LinkedIn son los de PDR-019, no los T1–T5.
- **Medición:** analítica nativa por red vía Metricool MCP resolviendo `brandId` con `getBrandSettings` antes
  de cualquier operación; programar y publicar siguen la doctrina `propose → confirm → execute` con
  confirmación humana explícita.
- **Hand-offs:** ejecución por red y calendario → `social-media-studio`; atomización y medición
  contenido→pipeline → `content-marketing-studio`; craft de hooks, guiones y captions → `copywriting`;
  citabilidad y aparición en motores → `seo-aeo`; captura de lead → `growth-marketing-cro` +
  `greenhouse-growth-forms`; runtime de Glitch → `greenhouse-email`; publicación owned →
  `efeonce-public-site-wordpress`.
- Este PDR **no autoriza** producción, contratación de crew, apertura de cuentas ni cambios en el sitio. La
  ejecución se baja a TASK bajo el EPIC que corresponda.

## Decisiones pendientes (bloquean la ejecución, no el marco)

**Cerrada en esta sesión:** el vocero de talking head es **Julio Reyes** (CEO). Ver capa 4, *Voces*.

| # | Decisión | Bloquea |
|---|---|---|
| 1 | **Dónde vive canónicamente un video** (YouTube o blog) | `TASK-1802` y la apertura de YouTube |
| 2 | **Inventario de tools y webinars del blog** — canonical URL, owner, tipo, tema, fecha, estado, freshness | `TASK-1802` (bloqueante declarado) |
| 3 | **Cuántos territorios se abren** — la recomendación es **dos** (AEO + Inteligencia Artificial/Agentes) | calendario y cadencia |
| 4 | **Secuencia de apertura de canales** — no simultánea | plan de producción |
| 5 | **Cadencia comprometida por canal** contra capacidad real del equipo | sostenibilidad del sistema |
| 6 | **Naming visible** Think / Marketing con Manzanitas | heredada de `TASK-1802` |


Recomendación de arranque registrada en sesión: partir por **Instagram (proceso + talking head)**,
**LinkedIn (educativo + su corte al blog)** y **Glitch**, e incorporar YouTube y Threads cuando esos tres
tengan cadencia sostenida. YouTube depende además de la decisión 1.

## Alternativas descartadas

- **Una estrategia independiente por canal** — multiplica el costo de producción por cinco y ninguno alcanza
  profundidad; es el modo de falla que este PDR existe para evitar.
- **Taxonomía editorial propia para social** — fractura la coherencia con PDR-019 y desconecta social del
  activo de autoridad del blog.
- **Mantener el portafolio estático como formato principal de Instagram** — optimiza la métrica de vanidad que
  la propia doctrina de PDR-005 §2 declara demotada.
- **Glitch como marca social nueva** — convierte un activo owned en alcance arrendado y fractura una franquicia
  que ya opera en dos superficies.
- **Abrir los cinco canales el mismo mes** — garantiza que ninguno alcance cadencia.
- **Tratar el plan estacional como compromiso previo con vencimiento** — descartado 2026-09-10: su trabajo es
  marca y sus piezas demuestran oficio, no saludan una fecha; entra al catálogo como línea permanente.
- **Fusionar Estacional con Trendjacking** — misma familia cultural, pero economía de producción opuesta
  (meses de planificación vs ventana de horas) y distinto régimen de aprobación.
- **Un catálogo de formatos común a todos los canales** — descartado en la revisión 1.1: confunde economía de
  producción con catálogo, replica piezas a canales cuya señal no las premia y ensucia cada canal con formatos
  que no le pertenecen.
- **Publicar en el blog el mismo texto del post educativo de LinkedIn** — canibaliza el activo y desperdicia
  la única superficie que se cita; el blog recibe una versión answer-first con trabajo propio.
- **Tratar "agentes" y "AEO" como tipos de contenido** — confunde territorio con formato y produce un
  calendario inoperable.
- **Promover "Agentes" a categoría raíz de inmediato** — sin cuerpo editorial acumulado, dispara el protocolo
  de migración de URL de PDR-019 sin beneficio.

## No-goals

- No define paid social ni presupuesto de medios: eso es `digital-marketing`.
- No define la operación social de clientes: este PDR cubre canales de marca Efeonce.
- No fija cifras de plataforma como verdad; las señales se citan con `as-of` y se reverifican.
- No reemplaza PDR-005: aquella gobierna la **landing del servicio**, ésta los **canales propios**.
- No autoriza publicar, programar ni contratar. `propose → confirm → execute` sigue vigente.
- No promete resultados sociales ni inventa casos: La Prueba sólo usa métricas citables.
