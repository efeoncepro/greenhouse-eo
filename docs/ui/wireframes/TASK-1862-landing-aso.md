# TASK-1862 — Landing ASO — Wireframe

## Meta

- Status: `proposed — UI ready: no`. Dirección visual pendiente de aprobación; copy en hipótesis; publicación
  atada al estado de la extensión (hoy `Proposed` → sólo fase A).
- Owner task: `TASK-1862 — Landing pública ASO`
- Visual direction mode: `repo-native-benchmark`
- Product Design asset: `docs/ui/visual-directions/TASK-1862-landing-aso-direction.md`
- Working route: `efeoncepro.com/servicios/aso/` — hipótesis hasta el Slice 1.
- Positioning: [PDR-023](../../public-site/decisions/PDR-023-landing-aso-posicionamiento.md)
- SEO/AEO: [ASO Landing SEO/AEO Brief V1](../../public-site/ASO_LANDING_SEO_AEO_BRIEF_V1.md)
- Oferta: [Search & App Visibility](../../business-models/search-visibility-360/SEARCH_APP_VISIBILITY_EXTENSION_V1.md)
- Hermanas: `/servicios/posicionamiento-seo/` (`251078`) y `/aeo-2/` (`250265`).
- Surface: WordPress/Ohio público + Elementor. No es el portal Greenhouse.
- Primitive decision: `reuse` de `ComparisonTable`, `greenhouse_social_trust`/`BrandProofAvatarGroup`,
  `GrowthFormEmbed`, `GrowthFormEditorialBriefHost` y `NativeMeetingSchedulerHost`; `new` sólo para los módulos
  semánticos propios de la página en `eo-elementor-widgets`. No se crea un primitive transversal.
- Copy source: este copy ledger, validado con `copywriting` y `greenhouse-ux-content-accessibility`. En runtime,
  el copy vive en los settings de cada instancia Elementor, no en `src/lib/copy/*`.

## Brief

- **Usuario:** quien responde por la ficha y los releases de una app de marca (growth móvil, product marketing o
  UA). A menudo llega desde un cliente SEO/AEO actual; el sponsor es el CMO o la gerencia digital.
- **Momento:** problem-aware. Sabe que su app compite en la tienda; no sabe que la tienda y los asistentes ya la
  interpretan con IA, ni que eso se conecta con su web.
- **JTBD:** "Cuando preparo un release o miro las instalaciones, quiero saber qué frena a mi app en la tienda y si
  se describe igual en todos lados, para decidir qué cambiar sin depender de una herramienta que sólo me da datos."
- **Resultado perceptible:** en el first fold entiende que esto es ASO conectado a su SEO y AEO, y tiene un
  siguiente paso proporcional.
- **Fricción que reduce:** no saber qué mide cada consola; promesas de ranking o descargas; tener que coordinar
  tres proveedores para una sola app.
- **No-goals:** guía editorial, precios, grader automático, desarrollo de apps, anuncios en tiendas, juegos.

## Information architecture

| # | Región | Trabajo | Pregunta del visitante |
|---|---|---|---|
| R0 | Masthead Ohio | Navegación global | ¿Dónde estoy? |
| R1 | Hero | Declarar categoría, promesa y siguiente paso | ¿Esto es para mi app? |
| R2 | Definición | Responder la intención definicional y la relación con el SEO | ¿Qué es exactamente? |
| R3 | Qué cambió | Mostrar que las tiendas interpretan y responden; disponibilidad real; Android primero | ¿Por qué ahora? |
| R4 | Tres lugares | Unir la tienda con SEO y AEO | ¿Qué tiene que ver con lo que ya hago? |
| R5 | Firma: la misma app en tres lugares | Hacer visible la consistencia y la priorización | ¿Qué recibo, en concreto? |
| R6 | Qué hacemos | Oferta agrupada por momento | ¿Qué me pueden resolver? |
| R7 | Medición | Qué reporta cada consola y qué no | ¿Cómo sé que funciona? |
| R8 | Límites | Lo que no se promete + para quién no es | ¿Puedo confiar? |
| R9 | Qué recibes + marcas | Prueba de método y confianza de empresa | ¿Esto es real? |
| R10 | FAQ | Objeciones | ¿Y si…? |
| R11 | Conversión | Brief de diagnóstico + reunión | ¿Cómo empiezo? |
| R12 | Divulgación | Rótulo de ilustrativos | ¿Es un caso real? |
| R13 | Footer Ohio | Navegación global | — |
| M | CTA fijo móvil | Diagnóstico persistente en 390 px entre R2 y R11 | ¿Dónde lo pido? |

## Layout skeleton

| Región | Widget / primitive | `data-capture` | Anchor | CTA |
|---|---|---|---|---|
| R1 Hero | `greenhouse_aso_hero` | `aso-hero` | `#inicio` | Diagnóstico (primario) · Reunión (secundario) |
| R2 Definición | `greenhouse_aso_definition` | `aso-definition` | `#que-es` | — |
| R3 Qué cambió | `greenhouse_aso_shift` | `aso-shift` | `#que-cambio` | — |
| R4 Tres lugares | `greenhouse_aso_surfaces` | `aso-surfaces` | `#tres-lugares` | Enlaces a SEO y AEO |
| R5 Firma | `greenhouse_aso_triptych` | `aso-triptych` | `#tu-app` | — |
| R6 Qué hacemos | `greenhouse_aso_lines` | `aso-lines` | `#que-hacemos` | Diagnóstico (enlace secundario) |
| R7 Medición | `greenhouse_aso_measurement` + `greenhouse_comparison_table` (reuse) | `aso-measurement` | `#medicion` | — |
| R8 Límites | `greenhouse_aso_boundaries` | `aso-boundaries` | `#limites` | — |
| R9 Prueba | `greenhouse_aso_proof` + `greenhouse_social_trust` (reuse) | `aso-proof` | `#que-recibes` | — |
| R10 FAQ | `greenhouse_aso_faq` | `aso-faq` | `#preguntas` | — |
| R11 Conversión | `greenhouse_aso_conversion` → `greenhouse_growth_form` + Growth CTA | `aso-conversion` | `#diagnostico` | Submit · Reunión |
| R12 Divulgación | dentro de `greenhouse_aso_conversion` | `aso-disclosure` | — | — |
| M CTA fijo móvil | dentro de `greenhouse_aso_conversion` | `aso-mobile-cta` | — | Diagnóstico |

El anchor del formulario es `#diagnostico`, el mismo de AEO, para que las tres hermanas compartan convención.

## Especificación por región

### R1 — Hero

- **Desktop:** dos columnas 7/5 sobre papel claro, masthead Ohio nativo en variante clara (contrato de SEO).
  Izquierda: eyebrow (`ohio_badge` outlined), H1, cuerpo, fila de CTAs, micro-línea. Derecha: tres marcos
  compactos escalonados —búsqueda, asistente, tienda— con los puntos 1 y 2 visibles y una línea que los une.
  Separación mínima de 28 px bajo el masthead.
- **Mobile:** una columna; CTAs antes de la ilustración; tira de marcos con la tienda adelante y el punto 1.
- **Contenido:** `hero.eyebrow`, `hero.title`, `hero.body`, `hero.primaryCta`, `hero.secondaryCta`,
  `hero.microline`, `hero.illustrationAlt`.
- **Regla:** ninguna cifra; ningún logo o badge de tienda; la ilustración no contiene texto crítico.

### R2 — Definición

- **Desktop:** banda de papel de una columna de lectura (~720 px). H2 como pregunta + cápsula de 40–60 palabras;
  H3 "¿Y en qué se parece al SEO?" + segunda cápsula.
- **Mobile:** igual, a ancho completo con márgenes de 20 px.
- **Contenido:** `definition.title`, `definition.capsule`, `definition.seoTitle`, `definition.seoCapsule`.
- **Regla:** es la mejor definición en español del SERP, en una sola banda. No se convierte en guía.

### R3 — Qué cambió

- **Desktop:** H2 + tres columnas con icono, título y una oración: leen tu ficha con IA; recomiendan en vez de
  listar; el descubrimiento sale de la tienda. Nota de disponibilidad a ancho completo. Sub-bloque "Por dónde
  empezar en Latinoamérica" con el dato Android, su fuente, su mes y su límite.
- **Mobile:** columnas apiladas con divisores; nota y sub-bloque al final.
- **Contenido:** `shift.title`, `shift.items[1..3].title`, `shift.items[1..3].body`, `shift.availability`,
  `shift.latam.title`, `shift.latam.body`, `shift.latam.source`.
- **Regla:** la nota de disponibilidad es obligatoria mientras alguna de las tres funciones no esté confirmada en
  CL/MX/CO/PE. Si el dato Android no se puede sostener al publicar, se elimina el sub-bloque completo.

### R4 — Tres lugares

- **Desktop:** H2 + tres tarjetas en fila, iguales en jerarquía: "En Google", "En los asistentes de IA", "En la
  tienda". Las dos primeras llevan la marca local del motor (SVG ya usados por SEO) y un enlace por función a su
  landing hermana; la tercera lleva "Estás aquí" sin enlace. Cierre de una oración.
- **Mobile:** tarjetas apiladas en el mismo orden.
- **Contenido:** `surfaces.title`, `surfaces.google.*`, `surfaces.ai.*`, `surfaces.store.*`, `surfaces.close`.
- **Enlaces:** `surfaces.google.link` → `/servicios/posicionamiento-seo/`; `surfaces.ai.link` → `/aeo-2/` (o
  `/servicios/aeo` si la migración ya ocurrió al construir).
- **Regla:** es la costura con las hermanas. En fase B los enlaces existen (salen de esta página); las hermanas no
  enlazan hacia acá hasta la fase C.

### R5 — Firma: la misma app en tres lugares

- **Desktop:** plano navy. Dos columnas 7/5: izquierda, los tres marcos grandes de la app ilustrativa con cinco
  puntos numerados repartidos entre ellos; derecha, la lista priorizada con tres ítems y chips de impacto y
  esfuerzo. Activar un punto muestra su pregunta en un panel anclado, no en un tooltip de hover.
- **Mobile:** marcos en tira horizontal con scroll-snap interno contenido (sin overflow de página); debajo, la lista
  de los cinco puntos con su pregunta siempre visible; luego la lista priorizada.
- **Contenido:** `triptych.title`, `triptych.body`, `triptych.frames[1..3].label`, `triptych.points[1..5]`,
  `triptych.listTitle`, `triptych.list[1..3]`, `triptych.label`.
- **Regla:** rótulo "Ejemplo ilustrativo" visible sin interacción. Chips cualitativos, nunca cifras. Marcos
  genéricos con etiqueta de texto, no réplicas de interfaces reales.

### R6 — Qué hacemos

- **Desktop:** H2 + intro. Cinco líneas en una retícula 3+2, cada una con H3 (nombre público), una línea de cuándo
  aplica y un párrafo de qué incluye. Línea de composición al pie y enlace secundario al diagnóstico.
- **Mobile:** líneas apiladas.
- **Contenido:** `lines.title`, `lines.intro`, `lines.items[1..5].name`, `lines.items[1..5].when`,
  `lines.items[1..5].body`, `lines.composition`, `lines.cta`.
- **Mapa nombre público ↔ línea de la extensión:**

| Nombre público | Línea | Engagement |
|---|---|---|
| Diagnóstico de visibilidad de tu app | L0 App Visibility Diagnostic | Diagnóstico |
| Base de la ficha | L1 Store Foundation | Sprint |
| Lanzamientos y nuevas versiones | L2 Launch / Release Visibility Sprint | Sprint |
| Operación mensual de la ficha | L3 Store Visibility Operations | Mensual |
| Tu app en los asistentes de IA | L4 AI App Discovery | Módulo o complemento |

- **Regla:** los nombres públicos no se editan fuera del copy ledger; la expansión (L5) no se muestra como línea.

### R7 — Medición

- **Desktop:** H2 + intro + `ComparisonTable` de tres columnas —Qué se ve · App Store Connect · Play Console— y
  cinco filas. Debajo, "Tres cosas que leemos con cuidado" en tres notas numeradas.
- **Mobile:** modo card del primitive: una tarjeta por fila con los dos valores etiquetados; notas apiladas.
- **Contenido:** `measurement.title`, `measurement.intro`, `measurement.columns.*`, `measurement.rows.*`,
  `measurement.notesTitle`, `measurement.notes[1..3]`.
- **Semántica de celdas:** texto completo, nunca sólo un icono.
- **Regla:** la fila "Lo que viene de la IA" dice "No se puede separar" en ambas columnas.

### R8 — Límites

- **Desktop:** dos columnas sobre papel. Izquierda "Lo que no te vamos a prometer" (cuatro ítems). Derecha "No es
  para ti si…" (cuatro ítems). Los límites no usan rojo.
- **Mobile:** apiladas, promesas primero.
- **Contenido:** `boundaries.notPromised.title`, `boundaries.notPromised.items[1..4]`, `boundaries.notFor.title`,
  `boundaries.notFor.items[1..4]`.

### R9 — Qué recibes y marcas

- **Desktop:** H2 + cuatro entregables en una fila, luego `BrandProofAvatarGroup`/carrusel con rótulo de empresa.
- **Mobile:** entregables en lista; carrusel a ancho completo.
- **Contenido:** `proof.title`, `proof.items[1..4]`, `proof.trustLabel`.
- **Regla:** sin testimonios, cifras de clientes ni texto de apps adyacente al carrusel.

### R10 — FAQ

- **Desktop:** intro sticky a la izquierda sobre 900 px; acordeón nativo a la derecha. A 900 px o menos, una
  columna, intro estática y 28 px de separación.
- **Contenido:** `faq.title`, `faq.intro`, `faq.items[1..9].question`, `faq.items[1..9].answer`.
- **Orden visible:** 1, 2, 9, 3, 4, 5, 6, 7, 8. La pregunta sobre app marketing va junto a las de definición; su ID
  es `faq.9` para no renumerar las demás.
- **Regla:** `<details>`/`<summary>`; cada respuesta en HTML para el `FAQPage`. Las respuestas 1 y 2 reutilizan las
  cápsulas de R2.

### R11 — Conversión

- **Desktop:** plano navy. Dos columnas desde 761 px: intro sticky a la izquierda (patrón de lane sticky de SEO,
  sin `class="site-content"` en ancestros); a la derecha la tarjeta editorial premium del brief y, fuera de la
  tarjeta, el bloque de reunión.
- **Mobile (≤760 px):** una columna estática: intro, tarjeta, reunión.
- **Formulario `efeonce-aso-diagnostic`:**

| # | Campo | Tipo | Req. | Autocomplete | Opciones / validación |
|---|---|---|---|---|---|
| 1 | Nombre completo | text | sí | `name` | `namePolicy.split_full_name` como AEO |
| 2 | Correo de trabajo | email | sí | `email` | gate de correo corporativo |
| 3 | Empresa | text | sí | `organization` | — |
| 4 | Enlace de tu app | text + `inputMode=url` + `validator=url`, máx. 200 | sí | `url` | Ficha de App Store o de Google Play |
| 5 | Plataformas | select premium | sí | — | iOS · Android · Ambas |
| 6 | Qué necesitas | select premium | sí | — | Lanzar o relanzar la app · Mejorar la ficha y su conversión · Crecer en las búsquedas de la tienda · Coordinar la app con nuestro SEO y AEO · Revisar cómo nos describen los asistentes de IA · Todavía no lo tengo claro |
| 7 | Mercado principal | select premium | no | — | Chile · México · Colombia · Perú · Varios países · Otro |
| 8 | Acceso a las consolas | select premium | no | — | Sí, a App Store Connect y Play Console · Sólo a una · No, o no lo sé |
| 9 | Próxima versión | select premium | no | — | Este mes · En uno a tres meses · Más adelante · No hay fecha |
| 10 | Contexto | textarea, 500 caracteres | no | — | — |

  + consentimiento, Turnstile invisible, retención `730d`, destino `greenhouse_only` inicial.
  **[verificar]** que el campo 4 siga el patrón de `website` del form SEO (`type=text` + `inputMode=url`).

- **Bloque de reunión:** título, una línea y Growth CTA `aso-discovery-meeting`. Si la surface no está enlazada,
  el CTA es un enlace a `/contacto/`.
- **Contenido:** `conversion.title`, `conversion.body`, `form.overline`, `form.title`, `form.helper`, `form.badge`,
  `form.trust[1..2]`, `form.fields.*`, `form.submit`, `form.privacyLink`, `meeting.title`, `meeting.body`,
  `meeting.cta`.

### R12 — Divulgación

- Franja entre la conversión y el footer. **Contenido:** `disclosure.body`.

### M — CTA fijo móvil

- Sólo ≤760 px. Aparece al salir del hero y se oculta al entrar a `#diagnostico` o al footer, para no tapar
  campos ni consentimiento (contrato `.mcta` de SEO). Deja espacio para el color switcher de Ohio.
- `inert` y fuera del tab order mientras está oculto. **Contenido:** `mobileCta.label`.

## Desktop Target

1440×1000. El first fold contiene R1 completo y el arranque de R2. Orden de lectura: eyebrow → H1 → cuerpo → CTA
de diagnóstico → reunión → micro-línea → marcos. H1 en ≤2 líneas; cuerpo en ≤3. Ningún carrusel, tabla, video ni
logo de tienda en el fold. Los marcos ocupan cinco de doce columnas con dos puntos visibles. Validación adicional
en 1536×911 y 890×911, los anchos donde las hermanas mostraron regresiones de sticky y columnas.

## Mobile Target

390×844. El first fold contiene eyebrow, H1 en ≤4 líneas, cuerpo en ≤5, el CTA de diagnóstico a ancho completo y
la reunión de 44 px. La tira de marcos queda inmediatamente debajo. Todas las retículas colapsan a una columna; la
tabla de medición pasa a modo card; FAQ y conversión quedan estáticos. Sin scroll horizontal de página.

## Action Hierarchy

| Nivel | Acción | Dónde aparece | Tratamiento |
|---|---|---|---|
| 1 | `Pide el diagnóstico de tu app` | Hero, R6, CTA fijo móvil | **Único relleno de la página fuera del form**: gradiente azul de las hermanas; lleva a `#diagnostico` y enfoca el primer campo |
| 2 | `Agenda una reunión` | Hero, conversión | Secundario transparente con contorno |
| 3 | `Pedir el diagnóstico` | Submit del form | Primario del renderer, ancho completo |
| 4 | Enlaces a SEO y AEO | R4, FAQ | Texto subrayado con nombre por función |
| 5 | Abrir un punto | Firma | Botón circular numerado; no compite con los CTAs |

Nunca dos acciones con relleno en el mismo bloque.

## Visual Fidelity Mapping

| Intención | Implementación | Cómo se verifica |
|---|---|---|
| Familia de SEO y AEO | Tracking `-0.045em` en títulos, eyebrows `ohio_badge`, masthead nativo claro, gradiente del CTA | Computed style de H1/H2 y CTA contra `251078` y `250265` |
| La misma app en tres lugares | Tres marcos con puntos numerados y líneas de unión | Capturas de `aso-hero` y `aso-triptych` |
| Consistencia → decisión | Lista priorizada siempre en DOM | Aserción de `<ol>` en `aso-triptych` |
| Sin cifras inventadas | Chips cualitativos | Ningún número en `aso-triptych` salvo la numeración |
| Sin marcas de tiendas como decoración | Nombres en texto; iconos genéricos | Aserción: cero badges de descarga y cero `ti-brand-apple` |
| Medición honesta | `ComparisonTable` + tres notas | Captura de `aso-measurement` en desktop y modo card |
| Costura con las hermanas | R4 con dos enlaces por función | Aserción de `href` a SEO y AEO en `aso-surfaces` |
| Navy sólo en firma y conversión | Variante de fondo por widget | Revisión de capturas por región |

## Copy Ledger

Todo el copy es **hipótesis** hasta el Slice 2. Tuteo neutro, sin voseo, sin chilenismos (sirve a los cuatro
mercados). Los nombres públicos de las líneas son canon de este ledger.

| ID | String |
|---|---|
| `aso.landing.hero.eyebrow` | ASO · Posicionamiento de apps |
| `aso.landing.hero.title` | ASO: que tu app se encuentre en la tienda y se entienda igual en todos lados. |
| `aso.landing.hero.titleAlt` | Tu app, encontrada en App Store y Google Play, y bien descrita en Google y en la IA. |
| `aso.landing.hero.body` | Trabajamos tu ficha en App Store y Google Play y la conectamos con tu web y con lo que dicen los asistentes de IA, para que la misma app se describa igual en todas partes. Lo medimos en tus consolas, no en un tablero nuestro. |
| `aso.landing.hero.primaryCta` | Pide el diagnóstico de tu app |
| `aso.landing.hero.secondaryCta` | Agenda una reunión |
| `aso.landing.hero.microline` | App Store y Google Play · Chile, México, Colombia y Perú · Conectado a tu SEO y AEO |
| `aso.landing.hero.illustrationAlt` | Ilustración de una misma app vista en tres lugares: un resultado de búsqueda, la respuesta de un asistente y la ficha de una tienda, con puntos numerados que marcan dónde se describe distinto. |
| `aso.landing.definition.title` | ¿Qué es el ASO? |
| `aso.landing.definition.capsule` | El ASO (App Store Optimization) es el trabajo de hacer que una app aparezca en las búsquedas de App Store y Google Play y que, al llegar a su ficha, la gente la instale. Se trabaja la metadata, los creativos, las reseñas y las fichas alternativas, y se mide con las consolas de cada tienda. |
| `aso.landing.definition.seoTitle` | ¿Y en qué se parece al SEO? |
| `aso.landing.definition.seoCapsule` | Es el mismo oficio en otra superficie: entender cómo busca la gente, describir bien lo que ofreces y ganarte la confianza de quien decide. La diferencia es que cada tienda tiene sus propias reglas, sus propios campos y su propia medición, y ahora también interpreta tu ficha con inteligencia artificial. |
| `aso.landing.shift.title` | Las tiendas ya no solo buscan: interpretan y responden |
| `aso.landing.shift.items.1.title` | Leen tu ficha con IA |
| `aso.landing.shift.items.1.body` | App Store genera etiquetas con inteligencia artificial a partir de tu metadata, y Google Play ya responde preguntas sobre una app antes de instalarla. |
| `aso.landing.shift.items.2.title` | Recomiendan en vez de listar |
| `aso.landing.shift.items.2.body` | Las recomendaciones personalizadas explican por qué te sugieren una app. El ranking deja de ser igual para todos. |
| `aso.landing.shift.items.3.title` | El descubrimiento sale de la tienda |
| `aso.landing.shift.items.3.body` | Siri, Spotlight y Gemini ya encuentran apps y sus acciones sin pasar por la tienda. |
| `aso.landing.shift.availability` | Varias de estas funciones todavía están solo en Estados Unidos o en inglés. En el diagnóstico te decimos cuáles están activas en tu país. |
| `aso.landing.shift.latam.title` | Por dónde empezar en Latinoamérica |
| `aso.landing.shift.latam.body` | En Chile, México, Colombia y Perú, entre el 66% y el 82% del tráfico web móvil viene de Android. Por eso casi siempre empezamos por Google Play. |
| `aso.landing.shift.latam.source` | Fuente: StatCounter, agosto de 2026. Mide tráfico web, no teléfonos instalados. |
| `aso.landing.surfaces.title` | Tu app se decide en tres lugares |
| `aso.landing.surfaces.google.title` | En Google |
| `aso.landing.surfaces.google.body` | La página de tu app en tu web y tu ficha, que Google también indexa. |
| `aso.landing.surfaces.google.link` | Cómo trabajamos el SEO |
| `aso.landing.surfaces.ai.title` | En los asistentes de IA |
| `aso.landing.surfaces.ai.body` | Lo que ChatGPT, Gemini y Perplexity responden cuando alguien pregunta qué app usar. |
| `aso.landing.surfaces.ai.link` | Cómo trabajamos el AEO |
| `aso.landing.surfaces.store.title` | En la tienda |
| `aso.landing.surfaces.store.body` | Tu ficha en App Store y Google Play: dónde apareces y si convence. |
| `aso.landing.surfaces.store.here` | Estás aquí |
| `aso.landing.surfaces.close` | Si cada lugar dice algo distinto, los asistentes pueden describir mal tu app. Cuidamos que los tres cuenten lo mismo. |
| `aso.landing.triptych.title` | La misma app, contada en tres lugares |
| `aso.landing.triptych.body` | Revisamos cinco cosas en cada lugar. Lo que importa es qué arreglas primero. |
| `aso.landing.triptych.frames.1` | Resultado de búsqueda |
| `aso.landing.triptych.frames.2` | Respuesta de un asistente |
| `aso.landing.triptych.frames.3` | Ficha de la tienda |
| `aso.landing.triptych.points.1` | Nombre — ¿Se llama igual en la web, en la ficha y en la respuesta? |
| `aso.landing.triptych.points.2` | Propuesta — ¿Dice lo mismo que hace en los tres lugares? |
| `aso.landing.triptych.points.3` | Categoría — ¿La tienda y los asistentes la ubican donde corresponde? |
| `aso.landing.triptych.points.4` | Funciones y precio — ¿Alguien menciona algo que ya no existe? |
| `aso.landing.triptych.points.5` | Reseñas — ¿Lo que dicen los usuarios contradice lo que promete la ficha? |
| `aso.landing.triptych.listTitle` | Lista priorizada |
| `aso.landing.triptych.list.1` | Precio antiguo en la respuesta del asistente · Impacto alto · Esfuerzo bajo |
| `aso.landing.triptych.list.2` | Propuesta distinta entre la web y la ficha · Impacto alto · Esfuerzo medio |
| `aso.landing.triptych.list.3` | Categoría secundaria mal elegida en la tienda · Impacto medio · Esfuerzo bajo |
| `aso.landing.triptych.label` | Ejemplo ilustrativo. No corresponde a un cliente. |
| `aso.landing.lines.title` | Qué hacemos, según dónde estés |
| `aso.landing.lines.intro` | Empezamos donde está tu app hoy y crecemos contigo. |
| `aso.landing.lines.items.1.name` | Diagnóstico de visibilidad de tu app |
| `aso.landing.lines.items.1.when` | Para saber dónde estás. |
| `aso.landing.lines.items.1.body` | La línea base por fuente, plataforma y país, y la lista de lo que conviene arreglar primero. Con acceso a tus consolas es medición; sin acceso, una estimación con fecha. |
| `aso.landing.lines.items.2.name` | Base de la ficha |
| `aso.landing.lines.items.2.when` | Para dejar la ficha bien hecha una vez. |
| `aso.landing.lines.items.2.body` | Metadata por tienda e idioma, fichas alternativas por intención de búsqueda, orden y textos de las capturas, solicitud de reseñas y un enlace medible desde tu web. |
| `aso.landing.lines.items.3.name` | Lanzamientos y nuevas versiones |
| `aso.landing.lines.items.3.when` | Para un lanzamiento que no puede salir mal. |
| `aso.landing.lines.items.3.body` | Tu ficha, tus eventos dentro de la app y tu web alineados para el lanzamiento, con una lectura a los 30 días. |
| `aso.landing.lines.items.4.name` | Operación mensual de la ficha |
| `aso.landing.lines.items.4.when` | Para que cada versión sume. |
| `aso.landing.lines.items.4.body` | Ajustes en cada versión, experimentos cuando hay tráfico suficiente, respuesta a reseñas y un informe mensual por fuente de instalación. |
| `aso.landing.lines.items.5.name` | Tu app en los asistentes de IA |
| `aso.landing.lines.items.5.when` | Para que te recomienden bien. |
| `aso.landing.lines.items.5.body` | Revisamos cómo te describen ChatGPT, Gemini y Perplexity cuando alguien pregunta por tu categoría, y especificamos qué acciones de tu app conviene mostrar a Siri y Spotlight. |
| `aso.landing.lines.composition` | Si además necesitas anuncios en las tiendas, producción de capturas y video o medición dentro de la app, lo sumamos con los equipos de Efeonce que hacen eso. |
| `aso.landing.lines.cta` | Pide el diagnóstico de tu app |
| `aso.landing.measurement.title` | Lo medimos en tus consolas, no en un tablero nuestro |
| `aso.landing.measurement.intro` | App Store Connect y Play Console dicen mucho, pero no lo mismo. Así los leemos. |
| `aso.landing.measurement.columns.what` | Qué se ve |
| `aso.landing.measurement.columns.apple` | App Store Connect |
| `aso.landing.measurement.columns.google` | Play Console |
| `aso.landing.measurement.rows.sources` | De dónde llegan las instalaciones — Búsqueda, navegación, otras apps y la web · Búsqueda de tu marca, exploración, Google, anuncios y enlaces |
| `aso.landing.measurement.rows.terms` | Qué buscó la gente — Sin desglose por término en la analítica de fuentes · Sí, por término de búsqueda |
| `aso.landing.measurement.rows.conversion` | Cuánto convence tu ficha — Conversión sobre impresiones · Conversión de la ficha comparada con apps parecidas |
| `aso.landing.measurement.rows.experiments` | Qué cambio funcionó — Experimentos de la ficha · Experimentos de la ficha |
| `aso.landing.measurement.rows.ai` | Lo que viene de la IA — No se puede separar · No se puede separar |
| `aso.landing.measurement.notesTitle` | Tres cosas que leemos con cuidado |
| `aso.landing.measurement.notes.1` | En Google Play, "búsqueda" solo cuenta a quienes buscaron tu marca. Las búsquedas por categoría aparecen como exploración. |
| `aso.landing.measurement.notes.2` | En App Store, la búsqueda incluye las descargas que llegan por anuncios. |
| `aso.landing.measurement.notes.3` | En iPhone, un clic desde tu web solo cuenta como visita web si viene de Safari. |
| `aso.landing.boundaries.notPromised.title` | Lo que no te vamos a prometer |
| `aso.landing.boundaries.notPromised.1` | Un puesto en el ranking de la tienda. Nadie controla ese algoritmo. |
| `aso.landing.boundaries.notPromised.2` | Más descargas o más estrellas. Dependen de tu producto, tu precio y tu categoría. Te mostramos qué frena tu ficha y lo trabajamos. |
| `aso.landing.boundaries.notPromised.3` | Instalaciones que vengan de la IA. Hoy ninguna tienda las mide por separado. |
| `aso.landing.boundaries.notPromised.4` | Reseñas o instalaciones compradas. Nunca: las tiendas pueden sancionar tu cuenta por lo que hace un tercero en tu nombre. |
| `aso.landing.boundaries.notFor.title` | No es para ti si… |
| `aso.landing.boundaries.notFor.1` | Tu app es un juego. Es otro oficio y te conviene un especialista. |
| `aso.landing.boundaries.notFor.2` | Tu app es interna o se instala por administración de dispositivos. |
| `aso.landing.boundaries.notFor.3` | Tu ficha casi no tiene visitas. Empieza por la base, no por una operación mensual. |
| `aso.landing.boundaries.notFor.4` | Casi todas tus instalaciones vienen de anuncios. Tu palanca es la conversión de la ficha para esas campañas. |
| `aso.landing.proof.title` | Qué recibes |
| `aso.landing.proof.items.1` | La línea base por fuente, plataforma y país, con la fecha y el origen de cada dato. |
| `aso.landing.proof.items.2` | La lista priorizada de lo que conviene cambiar en tu ficha y en tu web. |
| `aso.landing.proof.items.3` | El resultado de cada experimento, con su nivel de confianza. |
| `aso.landing.proof.items.4` | Cómo te describen los asistentes de IA, con la fecha de cada consulta. |
| `aso.landing.proof.trustLabel` | Marcas que confían en Efeonce |
| `aso.landing.faq.title` | Preguntas frecuentes |
| `aso.landing.faq.intro` | Lo que casi siempre nos preguntan antes de empezar. |
| `aso.landing.faq.1.q` | ¿Qué es el ASO? |
| `aso.landing.faq.2.q` | ¿En qué se diferencia el ASO del SEO? |
| `aso.landing.faq.3.q` | ¿Necesitan acceso a App Store Connect y Play Console? |
| `aso.landing.faq.3.a` | Para medir, sí: con acceso de marketing o de gestión de la app vemos tus datos reales. Sin acceso podemos hacer un diagnóstico, pero lo que te entreguemos será una estimación con fecha. |
| `aso.landing.faq.4.q` | ¿Sirve si ya invierto en Apple Ads o en campañas de apps? |
| `aso.landing.faq.4.a` | Sí. Tus anuncios llegan a una ficha mejor preparada y las fichas alternativas se pueden usar en tus campañas. La inversión en anuncios la gestiona el equipo de medios de Efeonce o el tuyo. |
| `aso.landing.faq.5.q` | ¿ChatGPT o Gemini recomiendan apps? |
| `aso.landing.faq.5.a` | Sí, y cada vez más. Lo que todavía no existe es una forma de medir cuántas instalaciones vienen de esas recomendaciones. Por eso medimos si te mencionan y cómo te describen, no instalaciones. |
| `aso.landing.faq.6.q` | ¿Pueden garantizar el primer lugar o más descargas? |
| `aso.landing.faq.6.a` | No. Nadie controla el algoritmo de las tiendas. Lo que sí hacemos es mostrarte qué frena tu ficha, trabajarlo y medir el resultado en tus consolas. |
| `aso.landing.faq.7.q` | ¿Trabajan con apps de juegos? |
| `aso.landing.faq.7.a` | No. El ASO de juegos depende de otras palancas y te conviene un especialista. |
| `aso.landing.faq.8.q` | ¿Cómo se cobra? |
| `aso.landing.faq.8.a` | Por alcance: cuántas apps, plataformas y países, más la capacidad mensual de trabajo. Nunca por keyword, por captura ni por reseña respondida. |
| `aso.landing.faq.9.q` | ¿El ASO es lo mismo que app marketing? |
| `aso.landing.faq.9.a` | No. El app marketing incluye todo lo que hace crecer una app: anuncios, campañas, correos y notificaciones. El ASO es la parte que ocurre en la tienda y en las búsquedas: que tu app aparezca y que su ficha convenza. Si también necesitas anuncios, los sumamos con el equipo de medios de Efeonce. |
| `aso.landing.conversion.title` | Cuéntanos de tu app |
| `aso.landing.conversion.body` | Con el enlace de tu ficha y lo esencial, te decimos por dónde conviene empezar y qué necesitamos revisar. |
| `aso.landing.form.overline` | Diagnóstico de tu app |
| `aso.landing.form.title` | Lo esencial de tu app |
| `aso.landing.form.helper` | Seis preguntas obligatorias. Las demás nos ayudan a llegar mejor preparados. |
| `aso.landing.form.badge` | 3 minutos |
| `aso.landing.form.trust.1` | Datos protegidos |
| `aso.landing.form.trust.2` | Respuesta con contexto |
| `aso.landing.form.fields.appUrl.label` | Enlace de tu app |
| `aso.landing.form.fields.appUrl.helper` | La ficha de App Store o de Google Play. |
| `aso.landing.form.submit` | Pedir el diagnóstico |
| `aso.landing.form.privacyLink` | Cómo usamos tus datos |
| `aso.landing.meeting.title` | ¿Prefieres conversarlo? |
| `aso.landing.meeting.body` | Agenda una conversación con el equipo y revisamos tu app juntos. |
| `aso.landing.meeting.cta` | Agenda una reunión |
| `aso.landing.disclosure.body` | Las ilustraciones y los ejemplos de esta página son referenciales. No corresponden a clientes ni a resultados. |
| `aso.landing.mobileCta.label` | Pide el diagnóstico de tu app |

La FAQ 8 y cualquier mención de precio o gratuidad dependen de la decisión D2 de la extensión y de la aprobación
comercial: si no están resueltas al Slice 2, la pregunta 8 se retira.

## State Copy

| Estado | Copy visible | Recuperación |
|---|---|---|
| ready | Formulario montado con sus diez campos y el submit. | — |
| loading | "Cargando el formulario…". Nunca un bloque vacío. | Si no monta en el tiempo del renderer, pasa a `partial`. |
| empty | "Completa los campos marcados para continuar." + resumen de errores enfocable. | Foco al resumen; cada error enlaza a su campo. |
| invalid URL | "Pega el enlace de tu app en App Store o en Google Play." | Foco al campo; valor conservado. |
| partial | "El formulario no pudo cargar. Puedes agendar una reunión y lo revisamos contigo." | Reunión en el mismo bloque; enlace a `/contacto/`. |
| error | "No pudimos enviar tu solicitud. Revisa los campos marcados o inténtalo de nuevo." | Conserva los valores; reintento sin recargar. |
| denied | "Usa tu correo de trabajo para pedir el diagnóstico." · Verificación fallida: "No pudimos verificar el envío. Inténtalo de nuevo o agenda una reunión." | Foco al correo; reunión como alternativa. |
| success | Success card gobernada: "Recibimos tu solicitud. Revisamos tu app con contexto antes de contactarte." | Sin promesa de plazo; reunión opcional. |
| meeting unavailable | Recuperación nativa del scheduler: navegación de mes y "Reintentar". | Sin enlaces ni copy del proveedor. |
| meeting not promoted | El CTA de reunión enlaza a `/contacto/`. | Se activa al enlazar la surface. |
| no-js | Todo el contenido visible; los CTAs de reunión enlazan a `/contacto/`. | El brief no monta; el contenido crítico no depende de él. |
| reduced motion | Mismo contenido y mismos estados, sin reveals ni transiciones. | — |

## Accessibility Contract

- Un solo H1. H2 por región; H3 por línea de servicio, por item de R3 y por tarjeta de R4. Sin saltos de nivel.
- Landmarks: `<main>` para el cuerpo; header y footer son de Ohio.
- `lang="es"` heredado del sitio **[verificar]** el valor exacto.
- Puntos de la firma como `<button>` con nombre accesible —"Punto 1: Nombre"—, `aria-expanded` y `aria-controls`.
  Enter y Espacio alternan; Escape cierra y devuelve el foco.
- Los cinco puntos y la lista priorizada existen siempre en el DOM como `<ol>`; la ilustración es complementaria,
  con ALT descriptivo. La tira móvil de marcos es un región con nombre y scroll interno sin overflow de página.
- Tabla de medición con `<table>`, `<caption>`, `<th scope="col">` y `<th scope="row">`; celdas con texto.
- FAQ con `<details>`/`<summary>`; nada depende de hover.
- Formulario: labels visibles sobre el control, errores con `aria-describedby`, resumen enfocable, `autocomplete`,
  targets ≥44 px y selects premium con el contrato combobox/listbox del renderer.
- CTAs con verbo específico y nombre accesible único. El CTA fijo móvil oculto es `inert`.
- Marcas de motores con `role="img"` y `aria-label`; iconos decorativos con `aria-hidden="true"`.
- Contraste AA en texto, en los puntos sobre la ilustración y en chips sobre navy; foco doble visible.
- `prefers-reduced-motion` elimina reveals, trazos y scroll suave sin quitar contenido ni estado.

## Implementation Mapping

- **Runtime:** `efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets` — **[verificar]** la ruta del
  checkout local antes de construir.
- **Módulos nuevos:** `greenhouse_aso_{hero,definition,shift,surfaces,triptych,lines,measurement,boundaries,proof,faq,conversion}`,
  once widgets con base `EO_Aso_Base`, schemas en `includes/aso/schemas/`, familia `asoModule.v1`, siguiendo el
  patrón de `EO_Content_Marketing_Base`. **[verificar]** la convención exacta.
- **Reuso:** `greenhouse_comparison_table` dentro de R7; `greenhouse_social_trust` en R9; `greenhouse_growth_form`
  como host del brief en R11; Growth CTA para la reunión; SVG locales de Google, GPT y Perplexity en R4.
- **Estilos:** `assets/css/aso.css` con raíz `.gh-aso-landing`; marker de página `task-1862-aso-landing-v1`; sin
  selectores globales ni overrides de Ohio fuera de la página; guardas de full-bleed y overflow como las de SEO.
- **Comportamiento:** `assets/js/aso.js` para puntos, CTA fijo móvil, reveals y foco al primer campo; mejora
  progresiva sobre HTML servido por PHP.
- **SEO:** `includes/aso/seo.php`, activo sólo con `_eo_aso_enabled=1`; añade `Service` y `FAQPage` sin duplicar
  Yoast. Robots por fase.
- **Growth Form:** `efeonce-aso-diagnostic`, `style_variant=diagnostic_premium`, surface nueva
  `fhsf-efeonce-aso-diagnostic`, publicada por el lifecycle gobernado con un helper idempotente en `scripts/growth/`
  siguiendo `growth:forms:activate-influencer-premium-selects`. Kind **[verificar]** contra el enum del motor.
- **Growth CTA:** `aso-discovery-meeting`, `open_meeting_scheduler` sobre `fhsf-efeonce-lead-gen-web` / `discovery`.
- **Tracking:** fila nueva en `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md`; `gh_form_*`, `gh_cta_*`,
  `gh_meeting_*`; key event `generate_lead` desde `gh_form_submission_accepted`.
- **Verificadores nuevos:** `pnpm public-website:verify-aso-landing-fidelity` y
  `pnpm public-website:verify-aso-seo-package`, con la anatomía de los de influencers.
- **Hermanas (sólo fase C):** una línea en el puente SEO→AEO de `251078` y la pregunta 15 en la FAQ de `250265`
  con `schema3` sincronizado; ambas con snapshot y sus gates.
- **Menú (sólo fase C):** ítem `ASO` bajo `Visibilidad`, después de AEO, con snapshot previo.

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/public-servicios-aso.scenario.ts`.
- Route: preview en fase A; `/servicios/aso/` `noindex` en fase B. **[verificar]** cómo apunta GVC al host
  público; los precedentes públicos se verificaron con gates Playwright dedicados.
- Viewports: 1536×911, 1440×1000, 890×911 y 390×844.
- Quality profile: `premium`, con `keyboard.enabled`, probes de teclado y `reducedMotionCheck`.
- Markers: `aso-hero`, `aso-definition`, `aso-shift`, `aso-surfaces`, `aso-triptych`, `aso-lines`,
  `aso-measurement`, `aso-boundaries`, `aso-proof`, `aso-faq`, `aso-conversion`, `aso-disclosure`,
  `aso-mobile-cta`.
- Capturas: first fold por viewport; firma con un punto cerrado y uno abierto; tabla de medición en desktop y
  modo card; FAQ abierto; form listo; submit vacío con resumen; enlace de app inválido; select abierto; CTA fijo
  móvil visible y oculto en `#diagnostico`; diálogo del scheduler abierto sin reservar (o fallback); full page;
  comparación lado a lado del first fold con SEO y AEO.
- Assertions: un H1 con `ASO` y `app`; `scrollWidth === clientWidth` en cada viewport; form montado con diez
  campos; CTA de reunión abre el scheduler nativo o enlaza a `/contacto/`; un solo relleno por bloque; `<ol>` en la
  firma; ningún número en la firma salvo la numeración; cero badges de descarga y cero `ti-brand-apple`; enlaces a
  SEO y AEO en `aso-surfaces`; fuente de StatCounter visible; robots `noindex` en fase B; consola sin errores
  propios.
- Keyboard probes: tab al CTA primario; abrir y cerrar un punto con Enter y Escape; abrir un `<details>`; recorrer
  los campos; confirmar que el CTA fijo oculto no recibe foco.
- Review dossier: `pnpm fe:capture:review public-servicios-aso`.
- Baseline decision: surface ID `public-servicios-aso`; baseline nueva en la primera captura aprobada.
- Scorecard: `docs/ui/reviews/TASK-1862-landing-aso.scorecard.json`.

## Design Decision Log

| Decisión | Alternativas | Por qué |
|---|---|---|
| Dirección A, una app en tres lugares | B tablero de ASO · C teléfonos en vitrina | Hace visible el diferencial —consistencia tienda/web/IA— sin datos inventados y conecta con SEO y AEO |
| Página de expansión y citabilidad, no de captura | Optimizar para `aso` | La demanda comercial en español es ~20/mes y `aso` es mayoritariamente médico o de marcas |
| Slug `/servicios/aso/` | `/servicios/posicionamiento-de-apps/` · `/servicios/app-store-optimization/` | Término de la categoría, paralelo a `/servicios/aeo`; las alternativas tienen 0–20 búsquedas |
| Diagnóstico como CTA primario | Reunión como primario | Misma convención que las hermanas; baja el compromiso |
| Sin "gratis" | Copiar "diagnóstico gratis" de AEO | D2 abierta en la extensión |
| Anchor `#diagnostico` | `#grader` de SEO · `#conversion` | Compartido con AEO; SEO usa `#grader` por historia, no por convención |
| R4 "tres lugares" con enlaces | Mencionar SEO/AEO sólo en la FAQ | Es la costura pedida con las hermanas |
| Tabla de medición con advertencias | Omitir la medición · prometer atribución | En ASO la medición existe y es el argumento; las advertencias son la prueba de rigor |
| Nota de disponibilidad en R3 | Presentar las funciones de IA como activas | Varias son sólo EE. UU. o inglés |
| Sin badges ni logo de Apple | Badges de descarga como decoración | Son para promocionar una app propia; usarlos en un servicio arriesga uso indebido de marca |
| Módulos semánticos | HTML compilado desde Claude Design como SEO | Conserva interactividad y contrato; la kinship se logra con tokens y patrones, no con el método de build |
| CTA fijo sólo móvil | Dock desktop como 1860 | Kinship con SEO y menos motion |
| Publicación por fases | Publicar al construir | La oferta está en `Proposed`; precedente `TASK-1859` |

Riesgos abiertos: dirección y copy sin aprobar; segunda fuente de demanda; disponibilidad de funciones de IA en el
país; guías de marca de Apple y Google; D1/D2; binding del scheduler; targeting de GVC al host público.

## Acceptance Checklist

- [ ] Dirección visual aprobada o reemplazada por un source versionado.
- [ ] Copy ledger aprobado, sin voseo, sin claims prohibidos por PDR-023.
- [ ] Un H1 con `ASO` y `app`; contenido crítico en el HTML inicial.
- [ ] R4 enlaza a SEO y AEO por función.
- [ ] Firma con rótulo ilustrativo y listas siempre en DOM.
- [ ] Tabla de medición con las tres advertencias.
- [ ] Sin badges ni logo de Apple.
- [ ] Formulario con los estados ready, loading, empty, invalid URL, partial, error, denied y success verificados.
- [ ] Sin scroll horizontal en 1536, 1440, 890 y 390.
- [ ] Reduced motion y teclado verificados.
