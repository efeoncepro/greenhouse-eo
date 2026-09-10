# PDR-020 — Canales propios de Efeonce: un motor editorial, cinco roles de canal

> **Tipo:** Product Decision Record (sistema editorial y rol de las superficies de adquisición propias).
> **Estado:** Accepted (marco y roles) — sesión de diseño con el operador, 2026-09-10.
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

Regla dura: **una producción, N cortes.** Una pieza se concibe para su corte principal y se despieza a los
demás canales en la misma sesión de producción. Producir por canal de forma independiente es el modo de falla
que hace insostenible el calendario al tercer mes.

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

### 4. Cinco líneas de contenido, un formato transversal, un modo de producción

**Las líneas** (franquicias recurrentes con nombre; la recurrencia construye el hábito de audiencia):

| Línea | Qué es | Trabajo en el bow-tie |
|---|---|---|
| **Behind the Build** | cómo se construyó de verdad, con los tropiezos incluidos | autoridad por evidencia |
| **Versus** | mismo brief en N modelos: qué salió, qué costó, cuál falló | utilidad guardable |
| **Glitch** | la lectura de la semana; el gancho social empuja a la newsletter | audiencia propia |
| **Trendjacking** | reactivo, sin slot fijo en el calendario | relevancia cultural |
| **La Prueba** | caso con número real y citable | demanda |

**El formato transversal — talking head** (*face-to-camera*, en B2B *executive-led video*): atraviesa las cinco
líneas y no es una línea aparte. Es la expresión natural del diferenciador declarado en PDR-005 §1.1 y ya tiene
capability de producción: el paquete `Executive / Interview Capture` de **Run & Gun Studio**.

**El modo de producción — Voces:** quién da la cara atraviesa todas las líneas. No es un formato ni una línea;
es una decisión de casting que aplica a cada pieza.

### 5. Rol por canal

Las señales de plataforma se citan **as-of 2026-07** desde `social-media-studio/modules/01_PLATFORM_MECHANICS.md`
y se reverifican contra su `SOURCES.md` antes de usarlas como argumento. Este PDR fija **roles**, no cifras.

| Canal | Rol | Señal que manda *(as-of 2026-07)* | Formatos que le tocan |
|---|---|---|---|
| **Blog** | el **activo**: URL canónica, schema, citabilidad IA | orgánico + citación | Pillars, Versus como data study, archivo Glitch |
| **LinkedIn** | el **comprador** | dwell ≥61s; comentario con sustancia ≫ like | texto denso, documento nativo, talking head, La Prueba |
| **YouTube** | la **profundidad** y el segundo buscador | watch time, session engagement | long-form (Versus completo, casos); Shorts como anzuelo |
| **Instagram** | el **craft y la cultura** | sends + saves (followers = señal débil) | Behind the Build, proceso, talento, talking head |
| **Threads** | la **conversación viva** | conversación y respuesta rápida | Trendjacking, opinión corta, gancho a Glitch |
| **Glitch (email)** | la **propiedad**: todo converge acá | suscripciones, CTR | la lectura de la semana |

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

| # | Decisión | Bloquea |
|---|---|---|
| 1 | **Quién es la cara** (vocero fijo de talking head) | toda la línea de video |
| 2 | **Dónde vive canónicamente un video** (YouTube o blog) | `TASK-1802` y la apertura de YouTube |
| 3 | **Cuántos territorios se abren** — la recomendación es **dos** (AEO + Inteligencia Artificial/Agentes) | calendario y cadencia |
| 4 | **Secuencia de apertura de canales** — no simultánea | plan de producción |
| 5 | **Cadencia comprometida por línea** contra capacidad real del equipo | sostenibilidad del sistema |
| 6 | **Naming visible** Think / Marketing con Manzanitas | heredada de `TASK-1802` |

Recomendación de arranque registrada en sesión: partir con **Behind the Build + Versus + Glitch**, e incorporar
Trendjacking y La Prueba cuando las tres primeras tengan cadencia sostenida.

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
