# Preguntas frecuentes del blog: diagnóstico y propuesta de bloque

> **Tipo de documento:** Análisis y propuesta (no es decisión aceptada)
> **Versión:** 1.2
> **Creado:** 2026-10-24 por Claude (sesión de refresh del blog)
> **Decisión vigente que toca:** [`CREATIVE_WORKFLOWS_FAQ_DISCLOSURE_DECISION_V1.md`](CREATIVE_WORKFLOWS_FAQ_DISCLOSURE_DECISION_V1.md) (2026-07-15)
> **Estado:** en producción desde el 2026-10-24 (plugin 0.3.0 y cuatro posts migrados; §8)

## 1. Respuesta corta

**No hay un bloque propio de preguntas frecuentes.** Hoy cada pregunta del blog es un `core/details` de Gutenberg.
Content Factory (`kind: "faq"` en
[`article-authoring.ts`](../../src/lib/public-site/content-factory/article-authoring.ts)) genera, además, un
`core/html` con el `FAQPage` en JSON-LD.

La arquitectura de datos está bien resuelta. Lo que falta es el diseño: ni Ohio ni el tema hijo tienen CSS para
`details` o `summary`, y el navegador los muestra con su estilo por defecto.

## 2. Qué hay hoy (medido en vivo, 2026-10-24)

### 2.1 Datos y contrato

| Pieza | Estado |
|---|---|
| Marcado | Un `core/details` por pregunta (`wp-block-details`), con la respuesta como bloques hijos |
| Schema | Un `core/html` con `<script type="application/ld+json">`: `FAQPage` con `@id = canonical#faq`, `url`, `inLanguage` y `mainEntity` |
| Paridad pregunta ↔ schema | El validador exige que cada `name` del schema sea un `summary` visible (`faqpage_question_not_visible`) |
| Paridad respuesta ↔ schema | Al publicar se cumple sola: el texto sale del mismo spec (`faqAnswerText`). Ninguna regla la vigila después: si alguien edita la respuesta en el editor, el schema queda desactualizado sin aviso |
| `core/html` | Permitido sólo como `FAQPage` en `ld+json`; en el registro de capacidades está como `preserve_only` |
| TOC | El H2 «Preguntas frecuentes…» es el único destino; las preguntas no entran al índice (decisión del ADR) |
| Grafo Yoast | El `FAQPage` del blog **no se conecta** al grafo de Yoast (no tiene `isPartOf` ni `mainEntityOfPage` hacia el `WebPage`/`BlogPosting`) |
| Uso | Cuatro posts con FAQ, entre ellos inbound (244765), paid media (245605) y topic clusters (245154) |

### 2.2 Cómo se ve

Capturas: `/private/tmp/claude-501/-Users-jreye-Documents-greenhouse-eo/dffd3ab3-9785-473b-bf90-28a319cc2e35/scratchpad/faq/`.

- Triángulo nativo del navegador como indicador, a la izquierda y pegado al texto.
- La pregunta va en Inter 16,4 px peso 400, igual que el párrafo, bajo un H2 de 49 px: se lee como una lista suelta,
  no como una sección.
- El `summary` mide 26 px de alto (bajo el mínimo táctil de 44 px), sin separación entre ítems ni líneas divisorias.
- El foco es el anillo de 1 px del navegador, poco visible.
- A 390 px la segunda línea de una pregunta larga vuelve al borde, bajo el triángulo, sin sangría francesa.
- Lo que sí funciona: contraste 18,2:1, teclado (Tab, Enter y Espacio abren y cierran) y semántica nativa.
- Sin verificar: modo oscuro del sitio y lectores de pantalla.

### 2.3 Lo que ya existe y se reutiliza

1. **Diseño aprobado de FAQ en la landing de inbound** (`scripts/public-website/inbound-source/Main.dc.html`,
   widget `diagnostico--faq-layout`, `inbound-landing.css`): separadores de 1 px, `summary` en flex con
   `padding: 22px 0` y `min-height: 44px`, marcador nativo oculto, botón circular de 36 px con «+» que rota 45° al
   abrir, `padding-right: 56px` y foco visible de 2 px con 3 px de separación. Está pensado para superficie oscura.
   Mete un `<h3>` dentro del `summary`, lo que probablemente tapa el rol de botón en algunos lectores (inferido, no
   medido); el blog no debe copiarlo.
2. **Patrón de bloque `efeoncepro/glitch-drop`** en el plugin `efeonce-editorial-blocks` v0.2.0
   (`~/Documents/efeonce-public-site-runtime/wp-content/plugins/efeonce-editorial-blocks/`): bloque dinámico
   apiVersion 3, sin build, con `block.json`, `index.js`, `render.php` y `style.css`. Tiene despliegue gobernado
   (`build-blog-v3-content-model-package.cjs` y `deploy-blog-v3-content-model-package.php`): rutas permitidas,
   sha256, guarda `previousSha256`, respaldo tar y limpieza de opcache. Content Factory lo valida en
   `gutenberg-glitch-drop.ts`.
3. **Grafo de schema del plugin**: `class-eo-schema-pieces.php` ya engancha piezas al grafo de Yoast con
   `wpseo_schema_graph_pieces`.
4. **AXIS**: no hay patrón editorial de FAQ. Sólo existe el contrato de producto `efeonce.disclosure`, candidato,
   y un `Disclosure` de React con chevron, `aria-expanded` y movimiento reducido. Sirve de referencia de
   comportamiento, no de componente.

## 3. Cómo debería verse y comportarse

La FAQ del blog cumple dos funciones: que el lector encuentre su pregunta de un vistazo y que los motores de
respuesta encuentren pares pregunta/respuesta limpios. El diseño sirve a la primera; el marcado, a la segunda.

### 3.1 Diseño (superficie clara del blog)

| Decisión | Valor propuesto | Por qué |
|---|---|---|
| Contenedor | Sin tarjeta; líneas de 1 px arriba de la primera pregunta y debajo de cada una | La sección es parte del artículo; una tarjeta la vuelve un widget y suma card-on-card |
| Pregunta | Poppins 600, ~18–20 px, interlineado 1,35 | Escala intermedia entre el H2 (49 px) y el párrafo; Poppins es la voz funcional de La órbita |
| Fila | `min-height: 44px`, padding vertical 18–20 px | Objetivo táctil y ritmo de lectura |
| Indicador | Un solo «+» en círculo de 32–36 px a la derecha, que rota 45° al abrir; marcador nativo oculto | Coherente con la landing aprobada y fácil de recorrer con la vista; a la derecha no compite con el texto |
| Sangría | La pregunta reserva el ancho del indicador (`padding-right`); el texto largo se alinea consigo mismo | Resuelve el desborde a 390 px |
| Respuesta | Mismo cuerpo del artículo, `max-width` de lectura, 4–8 px bajo la pregunta y 20–24 px de cierre | No es otra voz, es la continuación del texto |
| Estado abierto | La pregunta abierta toma el acento azure de la marca; el «+» se llena | Un solo cambio claro, sin sombras |
| Hover | Subrayado o cambio sutil del indicador; nunca fondo de fila | Evita el aspecto de tabla de administración |
| Foco | `:focus-visible` con contorno de 2 px y separación de 3 px, color de acento | Visible en teclado, invisible con mouse |
| Movimiento | Rotación del «+» ~160 ms; apertura del contenido con `::details-content` y `interpolate-size` donde exista, sin animación donde no | Mejora progresiva; con `prefers-reduced-motion` sólo cambia el estado |
| Modo oscuro | Tokens para línea, texto, acento e indicador bajo `[data-theme="dark"]` del sitio | El blog tiene interruptor Light/Dark |
| Primera pregunta | Cerrada por defecto; abierta sólo si el spec lo pide | La respuesta queda en el DOM igual (motores y Ctrl+F), y la lista se lee completa de un vistazo |
| Ancla por pregunta | `id` estable desde un slug de la pregunta; al abrir con `#ancla` se expande | Permite enlazar a una respuesta concreta desde otros posts o desde ventas |

### 3.2 Accesibilidad (reglas, no preferencias)

- Ningún encabezado (`h3`, `h4`) dentro del `summary`. La jerarquía la da el H2 de la sección.
- `details`/`summary` nativos: no se reemplazan por `div` + JS ni se agrega `role="button"`.
- La respuesta nunca se oculta con `display:none` fuera del mecanismo nativo, para que «buscar en la página» la
  encuentre (Chrome abre el `details` al encontrar coincidencias).
- `name` compartido (acordeón exclusivo) **no**: el lector debe poder abrir varias y comparar.
- Contraste ≥ 4,5:1 del texto y ≥ 3:1 del indicador y el foco, medidos en claro y oscuro.

### 3.3 Schema

- Un único `FAQPage` por página, con `@id = canonical#faq`.
- Conectado al grafo de Yoast: `isPartOf` → `WebPage` y `mainEntityOfPage` o `about`, según cómo esté armado el
  grafo del post. Así deja de ser una isla.
- Responde con el texto visible, sin enlaces ni formato.
- **No se promete rich result.** Google restringió los resultados de FAQ en 2023 y, según
  `.claude/skills/seo-aeo/SOURCES.md`, los retiró el 2026-05-07. El valor hoy es la recuperación por motores de
  respuesta y la claridad semántica. TASK-1402 y TASK-1404 todavía piden una prueba de Rich Results: hay que
  corregir ese criterio.

## 4. Las dos rutas

### Opción A — Estilo del bloque nativo (barato, mantiene el ADR)

Registrar un estilo de bloque `is-style-efeonce-faq` para `core/details` desde `efeonce-editorial-blocks`, con su CSS
acotado. Content Factory lo emite en `kind: "faq"` (`className` en el bloque).

- **Cambia:** un `register_block_style` + un CSS en el plugin; una línea en el serializador; las rutas permitidas del
  paquete de despliegue incluyen el CSS nuevo.
- **No cambia:** el marcado, el schema, el validador ni el TOC.
- **Migración:** volver a emitir los cuatro posts con su guarda habitual (snapshot, hash, readback), o aplicar el CSS
  a `.single-post .entry-content .wp-block-details` sin tocar los posts. Lo segundo alcanza también a un
  `core/details` que no sea FAQ; por eso conviene el estilo.
- **Límites:** el schema sigue en un `core/html` aparte, conectado al grafo sólo si además se agrega la pieza PHP
  (que puede hacerse igual, leyendo el `core/html` o el spec). El editor de WordPress muestra el bloque como
  `details` genérico.
- **Esfuerzo estimado:** medio día con QA.

### Opción B — Bloque dinámico `efeoncepro/faq` (robusto, reabre el ADR)

Bloque nuevo con el patrón de glitch-drop: el contenido se guarda como atributos y `render.php` produce el HTML y el
schema desde la misma fuente.

- **Modelo:** atributos `items: [{ id, question, answer }]` (la respuesta como HTML restringido a párrafo, lista,
  enlace y énfasis), `headingId` opcional y `openFirst`.
- **Render:** `render.php` arma los `details` con el diseño de §3.1 y **registra** el par pregunta/respuesta en un
  colector de la petición. Una pieza `wpseo_schema_graph_pieces` (en `class-eo-schema-pieces.php`) emite el
  `FAQPage` dentro del grafo de Yoast, conectado. **El schema deja de vivir en `core/html`**: deja de haber una
  segunda fuente que pueda desactualizarse.
- **Editor:** `index.js` con lista de pares editables (agregar, quitar, reordenar) y vista previa con el mismo CSS.
- **Content Factory:** `kind: "faq"` emite el bloque nuevo; validador propio en la línea de
  `gutenberg-glitch-drop.ts` (pares completos, ids únicos, sólo HTML permitido, largo de respuesta, sin
  `core/html` FAQ suelto en el mismo post). La paridad deja de validarse porque ya no hay dos fuentes.
- **Despliegue:** amplía las rutas permitidas del paquete a `src/faq/`, con el mismo `previousSha256` y respaldo.
- **Migración:** reescribir los cuatro posts con guardas, uno por uno, comparando el HTML visible y el schema antes y
  después. Mantener el fallback: si el plugin se desactiva, el bloque dinámico no renderiza; hay que decidir si
  `save` guarda un `details` estático de respaldo (recomendado).
- **Esfuerzo estimado:** 2 a 3 días con editor, validador, migración, Playwright y GVC.

### Comparación

| Criterio | A · estilo | B · bloque |
|---|---|---|
| UI/UX de §3.1 | Sí | Sí |
| Respuesta y schema desde una sola fuente | No (dos fuentes; la paridad se cumple sólo vía Content Factory) | Sí |
| Schema en el grafo de Yoast | Con trabajo aparte | Incluido |
| Editores humanos escriben FAQ cómodos | No | Sí |
| Ancla y apertura por `#hash` | Con JS pequeño en el plugin | Incluido |
| Riesgo si el plugin cae | Bajo (queda `details` nativo sin estilo) | Medio, mitigado con `save` estático |
| ADR 2026-07-15 | Se mantiene | Se enmienda («no crear todavía» salvo autoría humana) |

## 5. Recomendación

**A ahora, B cuando haya autoría humana de FAQ.** A entrega todo el diseño de §3 y la accesibilidad en medio día,
sin tocar el contrato que ya funciona. Junto con A conviene hacer dos piezas baratas que no dependen de B:

1. Conectar el `FAQPage` al grafo de Yoast (`isPartOf`), y
2. Agregar al validador de Content Factory una revisión de paridad de respuesta entre el post vivo y su spec, que
   avise si alguien editó en WordPress.

B se justifica cuando editores sin Content Factory necesiten escribir FAQ, o cuando el blog tenga muchas más que
cuatro. En ese momento se enmienda el ADR de 2026-07-15 y se migra con las guardas de §4.

## 6. Cierre (para cualquiera de las dos)

- Playwright a 1440 y 390 px, claro y oscuro: cerrado, primera abierta, todas abiertas y foco por teclado.
- Medición de contraste del texto, el indicador y el foco en los dos temas.
- `prefers-reduced-motion` y JS apagado: el contenido sigue accesible.
- Readback del schema en vivo: un solo `FAQPage`, conectado, con preguntas idénticas a los `summary`.
- Prueba con VoiceOver: la pregunta se anuncia como botón con estado expandido/contraído.
- Kinsta purgado y QA en los cuatro posts.

## 7. Lo construido (2026-10-24)

El operador eligió la opción A y pidió que el schema fuera automático. Se resolvió así: **las preguntas visibles son la
única fuente**. El plugin lee los bloques en cada visita y arma el schema; nadie escribe ni mantiene un JSON-LD aparte.

| Pieza | Dónde | Qué hace |
|---|---|---|
| Estilo «Pregunta frecuente» | `efeonce-editorial-blocks` 0.3.0, `includes/faq/` (repo `efeonce-public-site-runtime`, commit `e2bd1e4`) | `register_block_style('core/details', 'efeonce-faq')` + `faq.css` (claro, `.dark-scheme`, foco, movimiento reducido, `::details-content` donde existe) |
| Ancla por pregunta | `render_block_core/details` | `id="faq-<slug>"` (o el ancla propia del bloque); `faq.js` abre la pregunta de un enlace `#faq-…` |
| Schema automático | `wpseo_schema_graph_pieces` + `wpseo_schema_webpage` | El `WebPage` de Yoast suma `FAQPage` y `mainEntity`; un `Question` por bloque, respuesta = texto visible |
| Guarda de transición | `EO_Faq::has_inline_faqpage` | Un post con FAQPage pegado lo conserva y no recibe nodos generados: nunca dos FAQPage |
| Apagado | opción `eo_faq_schema_enabled` = 0 | Quita el schema generado; el estilo sigue |
| Content Factory | `article-authoring.ts` | `kind: "faq"` emite el estilo siempre; `schema.source` es `plugin` por defecto desde el despliegue (sin JSON-LD en el contenido) e `inline` sólo si se pide; rechaza preguntas repetidas |
| Despliegue | `deploy-blog-v3-content-model-package.php` | Allowlist ampliada a `includes/faq/` |

**Verificado:**

- 21 pruebas puras (`php tests/eo-faq.test.php`).
- 36 comprobaciones E2E en WordPress Playground con Yoast real (`tests/playground/run-eo-faq.sh` +
  `node tests/playground/eo-faq.e2e.mjs`): cinco preguntas con estilo y ancla, un único `FAQPage`, cinco `Question`
  en orden, respuestas idénticas al texto visible, `@id` igual al ancla, el `Article` sigue apuntando a la página, y el
  post con JSON-LD pegado queda intacto.
- 136 pruebas de Content Factory.
- El CSS inyectado sólo en un navegador local sobre el post vivo de inbound, a 1280 y 390 px, en claro y oscuro
  (Ohio real): se ve como la maqueta aprobada. Contraste del azul de pregunta abierta: 4,59:1 sobre blanco y 8,68:1
  en oscuro.

**Sin verificar:** el editor de WordPress con el estilo (se registra igual que cualquier estilo de bloque), VoiceOver y
el despliegue real.

**Para salir a producción** (requiere aprobación): desplegar el plugin 0.3.0 con el paquete gobernado, reescribir los
cuatro posts con `schema.source: "plugin"` (sale el `core/html`, entra el estilo) con snapshot y guardas, cambiar el
default de Content Factory a `plugin` y hacer QA en vivo del grafo y la vista.

## 8. En producción (2026-10-24)

**Plugin.** `efeonce-editorial-blocks` 0.3.0 quedó en vivo a las 13:42 UTC dentro del despliegue que hizo la sesión de
la portada del blog (runtime `970986a`, que contiene `e2bd1e4`). Los hashes vivos de `efeonce-editorial-blocks.php` e
`includes/faq/*` coinciden con el commit y el estilo quedó registrado. No hice un segundo despliegue. El paquete
completo habría llevado además su `class-eo-home-adapter.php`, que entonces no estaba en vivo: no se armó.

**Migración.** Se hizo con `scripts/public-website/blog-faq-migrate-to-plugin-schema.php`, previa coordinación con
esa sesión, que no tenía nada en vuelo sobre estos posts. El script:

- corre primero en modo de prueba (dry run) y luego aplica con guarda de `post_modified_gmt` y sha256;
- hace ediciones textuales locales, sin volver a serializar el contenido;
- exige paridad de preguntas y respuestas entre el schema pegado y el que arma el plugin.

| Post | Preguntas | Snapshot de rollback |
|---|---|---|
| 244765 inbound | 5 | `_gh_faq_migration_244765_20261024_134500` |
| 245154 topic clusters | 5 | `_gh_faq_migration_245154_20261024_134501` |
| 245605 paid media | 5 (el sexto desplegable no es FAQ y no se tocó) | `_gh_faq_migration_245605_20261024_134502` |
| 251363 Creative Workflows | 4 | `_gh_faq_migration_251363_20261024_134503` |

Paridad exacta en los cuatro, sin avisos sobre título, slug, fecha, autor, términos ni metas; caché de Kinsta purgada.

**QA en vivo.** En los cuatro posts responde 200, sin errores de PHP ni de JS:

- un único nodo `FAQPage`, que es el `WebPage` de Yoast (`WebPage`, `ItemPage`, `FAQPage`);
- un `Question` por pregunta visible, con su texto idéntico al del `summary`, en orden, con `@id` igual al ancla, y
  `mainEntity` completo;
- el `Article` sigue apuntando a la página;
- CSS y JS cargados.

En el navegador, a 1280 y 390 px, y en claro y oscuro (sólo inbound):

- pregunta de 74 px de alto, en DM Sans, de 19 px en escritorio y 17 px en el celular, sin scroll horizontal;
- un enlace `#faq-…` abre la pregunta y la deja a la vista;
- Enter abre la pregunta y el foco se ve.

`pnpm public-website:blog-home verify` sigue verde.

**Content Factory.** `schema.source` es `plugin` por defecto: un post nuevo ya no lleva JSON-LD pegado.

**Pendiente:** lectura con VoiceOver; revisar el estilo dentro del editor de WordPress. Un editor puede elegir
«Pregunta frecuente» en cualquier desplegable, y eso basta para que entre al schema.
