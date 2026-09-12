# TASK-1865 — Landing Performance Marketing — Wireframe

## Meta

- Status: `proposed — UI ready: no`. Dirección visual pendiente de aprobación del owner; copy en hipótesis.
- Owner task: `TASK-1865 — Landing pública Performance Marketing`
- Visual direction mode: `repo-native-benchmark`
- Product Design asset: `docs/ui/visual-directions/TASK-1865-landing-performance-marketing-direction.md`
- Working route: `efeoncepro.com/servicios/performance-marketing/` — hipótesis hasta el Slice 1. Reemplaza a la página
  legacy `242862` (`/servicio-gestion-campanas-publicitarias/`), que pasa a 301 en el Slice 6.
- Positioning: [PDR-022](../../public-site/decisions/PDR-022-landing-performance-marketing-posicionamiento.md)
- SEO/AEO: [Performance Landing SEO/AEO Brief V1](../../public-site/PERFORMANCE_LANDING_SEO_AEO_BRIEF_V1.md) y
  [investigación de términos por país 2026-09-11](../../audits/public-site/PERFORMANCE_LANDING_KEYWORD_RESEARCH_BY_COUNTRY_2026-09-11.md)
- Oferta (canon): [ficha de Performance & Commerce Distribution](../../services/media-distribution/PERFORMANCE_COMMERCE_DISTRIBUTION_SERVICE_V1.md)
  y [decisión de oferta](../../architecture/EFEONCE_PERFORMANCE_COMMERCE_DISTRIBUTION_DECISION_V1.md).
- Surface: WordPress/Ohio público + Elementor. No es el portal Greenhouse.
- Primitive decision: `reuse` de `ComparisonTable`, `LogoMarquee`/`greenhouse_social_trust`, `GrowthFormEmbed`,
  `GrowthFormEditorialBriefHost` y `NativeMeetingSchedulerHost`; `new` sólo para los módulos semánticos propios de la
  página en `eo-elementor-widgets`. No se crea un primitive transversal.
- Copy source: este copy ledger, validado con `copywriting` y `greenhouse-ux-content-accessibility` en el Slice 2. En
  runtime, el copy vive en los settings de cada instancia Elementor, no en `src/lib/copy/*`.

## Brief

- **Usuario:**
  - Motion A: Performance Lead, E-commerce Manager o Head of Growth de una marca de consumo que ya invierte en dos o más
    canales.
  - Motion B: Demand Gen Manager o Marketing Ops de una empresa B2B con CRM.
  - Economic buyer: CMO; en B2B, con el líder comercial como co-sponsor.
- **Momento:** solution-aware. Ya tiene o tuvo una agencia de pauta, o un freelancer, o un equipo interno. Llega por
  "agencia de performance marketing", por el menú, por un enlace desde otra landing de Efeonce o por una campaña propia.
- **JTBD:** "Cuando mi inversión crece pero la eficiencia no, y cada plataforma se atribuye la misma venta, quiero una
  operación que optimice hacia ventas u oportunidades reales y me diga dónde poner el siguiente peso."
- **Resultado perceptible:** entiende en el first fold que la diferencia es qué aprende la pauta, y ve un siguiente paso
  proporcional.
- **Fricción que reduce:** comparar agencias que dicen lo mismo; promesas de ROAS; no saber si las cuentas y los datos
  quedan a su nombre; formularios que piden todo sin explicar para qué.
- **No-goals:** guía editorial de performance marketing, precios o tarifario, calculadora de ROAS, auditoría automática
  gratuita, directorio de plataformas, casos sin autorización.

## Information architecture

Orden de lectura y trabajo de cada región. Ninguna región existe si no cumple su trabajo.

| # | Región | Trabajo | Pregunta del visitante que responde |
|---|---|---|---|
| R0 | Masthead Ohio | Navegación global | ¿Dónde estoy? |
| R1 | Hero | Declarar la categoría y la diferencia | ¿Esto es para mí? |
| R2 | Definición | Responder la intención definicional, dos cápsulas | ¿Qué es y qué hace una agencia? |
| R3 | Problema | Nombrar por qué la pauta rinde menos de lo que debería | ¿Entienden mi problema? |
| R4 | Qué cambió en 2026 | Razón concreta para revisar ahora | ¿Por qué ahora? |
| R5 | Firma: cambia la señal | Hacer visible el mecanismo | ¿Qué hacen distinto, en concreto? |
| R6 | Dos formas de trabajar | Motion A y motion B | ¿Sirve para mi tipo de negocio? |
| R7 | Cinco frentes | Módulos del servicio | ¿Qué hacen exactamente? |
| R8 | Canales | Cobertura por canal con su estado | ¿Trabajan el canal que uso? |
| R9 | Cómo empezamos | Escalera de cuatro pasos | ¿Por dónde entro? |
| R10 | Posición | Comparación por tipo de proveedor | ¿En qué se diferencian? |
| R11 | Reglas del juego | Compromisos + lo que no se promete | ¿Puedo confiar? |
| R12 | Qué recibes + marcas | Entregables y confianza de empresa | ¿Esto es real? |
| R13 | FAQ | Objeciones y citabilidad | ¿Y si…? |
| R14 | Conversión | Brief + reunión | ¿Cómo empiezo? |
| R15 | Divulgación | Rótulo de ilustrativos | ¿Esto es un caso real? |
| R16 | Footer Ohio | Navegación global | — |
| D | Dock de conversión | CTA persistente entre R2 y R14 | ¿Dónde agendo? |

## Layout skeleton

| Región | Widget / primitive | `data-capture` | Anchor | CTA |
|---|---|---|---|---|
| R1 Hero | `greenhouse_performance_hero` | `performance-hero` | `#inicio` | Reunión (primario) · Diagnóstico (secundario) |
| R2 Definición | `greenhouse_performance_definition` | `performance-definition` | `#que-es` | — |
| R3 Problema | `greenhouse_performance_problem` | `performance-problem` | `#problema` | — |
| R4 Qué cambió en 2026 | `greenhouse_performance_whynow` | `performance-whynow` | `#2026` | Diagnóstico (enlace secundario) |
| R5 Firma | `greenhouse_performance_signal` | `performance-signal` | `#senal` | — |
| R6 Dos formas | `greenhouse_performance_motions` | `performance-motions` | `#como-trabajamos` | — |
| R7 Cinco frentes | `greenhouse_performance_modules` | `performance-modules` | `#que-hacemos` | — |
| R8 Canales | `greenhouse_performance_channels` | `performance-channels` | `#canales` | — |
| R9 Cómo empezamos | `greenhouse_performance_ladder` | `performance-ladder` | `#como-empezamos` | Diagnóstico (enlace secundario) |
| R10 Posición | `greenhouse_comparison_table` (reuse) | `performance-position` | `#posicion` | — |
| R11 Reglas del juego | `greenhouse_performance_operating` | `performance-operating` | `#reglas` | — |
| R12 Prueba | `greenhouse_performance_proof` + `greenhouse_social_trust` (reuse) | `performance-proof` | `#que-recibes` | — |
| R13 FAQ | `greenhouse_performance_faq` | `performance-faq` | `#preguntas` | — |
| R14 Conversión | `greenhouse_performance_conversion` → `greenhouse_growth_form` + Growth CTA | `performance-conversion` | `#conversion` | Brief (submit) · Reunión |
| R15 Divulgación | dentro de `greenhouse_performance_conversion` | `performance-disclosure` | — | — |
| D Dock | dentro de `greenhouse_performance_conversion` | `performance-dock` | — | Reunión · Diagnóstico |

## Especificación por región

### R1 — Hero

- **Desktop:** dos columnas 7/5. Izquierda: eyebrow, H1, cuerpo, fila de CTAs, micro-línea. Derecha: circuito de la
  señal. Separación mínima de 28 px bajo el masthead Ohio. Hero sobre papel: header Ohio en su variante de fondo claro, sin
  `clb__dark_section` en la primera sección.
- **Mobile:** una columna; CTAs antes del circuito; circuito vertical.
- **Circuito:** cuatro nodos en HTML dentro de un SVG inline de líneas —`hero.visual.node1` a `hero.visual.node4`— con el
  tramo de retorno rotulado `hero.visual.loop`. Es `role="img"` con `aria-labelledby` hacia un texto que describe el
  circuito completo; los nodos no son interactivos.
- **Contenido:** `hero.eyebrow`, `hero.title`, `hero.body`, `hero.primaryCta`, `hero.secondaryCta`, `hero.microline`,
  `hero.visual.*`, `hero.visual.description`.
- **Regla:** ninguna cifra, logo ni badge en el hero.

### R2 — Definición

- **Desktop:** banda de papel en una columna de lectura (~720 px) con dos pares H2 + cápsula: qué es el performance
  marketing (55 palabras) y qué hace una agencia de performance marketing (50 palabras).
- **Mobile:** igual, a ancho completo con márgenes de 20 px.
- **Contenido:** `definition.title`, `definition.capsule`, `definition.agencyTitle`, `definition.agencyCapsule`,
  `definition.lexicon`.
- **Regla:** las cápsulas responden la pregunta literal en su primera oración, tienen entre 40 y 60 palabras y son las
  mismas que usa el FAQ, para que el schema marque exactamente lo visible. No se convierte en guía.
- **Línea de léxico:** una oración bajo las cápsulas que declara los sinónimos con que cada país busca la categoría
  (paid media, publicidad digital, pauta digital, campañas pagadas). Existe porque la página es una sola para cinco
  países y ningún término funciona en todos (ver la investigación por país).

### R3 — Problema

- **Desktop:** H2 + tres columnas con icono, nombre y dos oraciones: atribución duplicada, señal equivocada, creatividad
  agotada. Cierre de una oración a ancho completo.
- **Mobile:** las tres apiladas con divisores; el cierre al final.
- **Contenido:** `problem.title`, `problem.attribution.*`, `problem.signal.*`, `problem.creative.*`, `problem.close`.
- **Regla:** ninguna estadística de mercado sin fuente; los tres problemas se describen como mecanismo, no como dato.

### R4 — Qué cambió en 2026

- **Desktop:** H2 + intro + tres bloques en fila, cada uno con fecha visible en `tabular-nums`, nombre del cambio, dos
  oraciones y fuente. Nota final sobre el alcance del diagnóstico y enlace secundario a `#conversion`.
- **Mobile:** bloques apilados, fecha primero.
- **Contenido:** `whyNow.title`, `whyNow.intro`, `whyNow.items.{meta,google,law}.{date,name,body,source}`, `whyNow.note`,
  `whyNow.cta`.
- **Regla de vigencia:** cada bloque lleva fecha. El owner revisa esta región cada trimestre; un cambio que ya no es
  relevante se retira, no se deja envejecer. Si una fuente no se puede sostener con un documento primario al publicar, se
  elimina ese bloque completo. La nota dice explícitamente que no es asesoría legal.

### R5 — Firma: cambia la señal

- **Desktop:** plano Midnight (`clb__dark_section`). Dos columnas 5/7: izquierda H2, cuerpo, control segmentado
  `Clics / Ventas` y la leyenda del estado activo; derecha la lista de cuatro campañas, cada una con nombre, descriptor y
  barra de presupuesto relativo. Al cambiar el control, la lista se reordena y las barras cambian de largo. Debajo, la
  nota B2B y el rótulo ilustrativo.
- **Mobile:** una columna: H2, cuerpo, control a ancho completo, lista, leyenda, nota y rótulo.
- **Estado inicial:** `Clics`. El cambio lo hace siempre el usuario; nunca hay autoplay ni ciclo automático.
- **Orden de la lista:**

| Posición | Estado `Clics` | Estado `Ventas` |
|---|---|---|
| 1 | Remarketing a visitantes | Búsqueda por categoría |
| 2 | Prospección con video | Búsqueda de tu marca |
| 3 | Búsqueda de tu marca | Prospección con video |
| 4 | Búsqueda por categoría | Remarketing a visitantes |

- **Sin JavaScript:** las dos listas se renderizan lado a lado, cada una con su título (`signal.noJs.clicksTitle`,
  `signal.noJs.salesTitle`), y el control no aparece.
- **Contenido:** `signal.title`, `signal.body`, `signal.toggle.*`, `signal.campaigns.{c1..c4}.{name,clicksNote,salesNote}`,
  `signal.state.{clicks,sales}.caption`, `signal.b2bNote`, `signal.label`, `signal.noJs.*`, `signal.live.*`.
- **Regla:** las barras no llevan cifras ni escala; la lista es siempre un `<ol>` en el DOM; el rótulo "Ejemplo
  ilustrativo" es visible sin interacción.

### R6 — Dos formas de trabajar

- **Desktop:** H2 + dos columnas de igual peso, Consumo y e-commerce | Marketing B2B. Cada columna con H3 y cuatro filas
  etiquetadas: para quién, qué optimizamos, canales habituales, cómo lo medimos. La columna B2B agrega la línea de CRM.
- **Mobile:** columnas apiladas, consumo primero.
- **Contenido:** `motions.title`, `motions.intro`, `motions.{commerce,b2b}.{name,for,optimizes,channels,measure}`,
  `motions.b2b.crm`, `motions.rowLabels.*`.
- **Regla:** ninguna columna se enfatiza sobre la otra; los labels de fila son visibles, no sólo iconos.

### R7 — Cinco frentes

- **Desktop:** H2 + intro + retícula de cinco ítems (3 + 2) con icono, H3 y una oración; un sexto bloque más discreto para
  incrementalidad, rotulado como avanzado.
- **Mobile:** lista vertical; incrementalidad al final.
- **Contenido:** `modules.title`, `modules.intro`, `modules.{signal,operations,commerce,creative,governance}.{name,body}`,
  `modules.advanced.{label,name,body}`.
- **Regla:** creatividad declara que la producción se cotiza aparte; nada sugiere que el fee incluye producción.

### R8 — Canales

- **Desktop:** H2 + intro + lista de ocho canales en dos columnas. Cada canal: icono de función, H3 con el nombre, una o
  dos oraciones y un chip de estado con icono y texto. Nota final sobre la propiedad de las cuentas.
- **Mobile:** lista de una columna; chip debajo del nombre.
- **Chips:** `Lo operamos` (Google, Meta, TikTok, LinkedIn, retail media) · `Con partner tecnológico` (programmatic) ·
  `Donde está disponible` (ChatGPT Ads) · `Bajo pedido` (X Ads).
- **Contenido:** `channels.title`, `channels.intro`, `channels.items.{google,meta,tiktok,linkedin,programmatic,retail,chatgpt,x}.{name,body}`,
  `channels.chips.*`, `channels.note`, `channels.asOf`.
- **Regla:** sin logos de plataformas; sin nombrar al partner programático; ChatGPT Ads lleva la fecha de vigencia
  visible y se revisa mensualmente contra el centro de ayuda de OpenAI.

### R9 — Cómo empezamos

- **Desktop:** H2 + intro + cuatro pasos en una fila numerada unida por una línea, cada uno con nombre, una oración y la
  duración en un chip. Enlace secundario al diagnóstico bajo el primer paso.
- **Mobile:** pasos en lista vertical numerada.
- **Contenido:** `ladder.title`, `ladder.intro`, `ladder.steps.{1..4}.{name,body,duration}`, `ladder.cta`.
- **Regla:** es un `<ol>`; sin precios ni bandas. Los nombres públicos se mapean 1:1 con el catálogo (ver
  `Mapeo de nombres públicos`).

### R10 — Posición

- **Desktop:** H2 + intro + `ComparisonTable` de tres columnas —Freelance o consultor, Agencia de gestión de pauta,
  Efeonce— y seis filas. La columna Efeonce se enfatiza con superficie, no con verde. Nota al pie visible.
- **Mobile:** modo card del primitive: una tarjeta por fila con los tres valores etiquetados.
- **Contenido:** `position.title`, `position.intro`, `position.caption`, `position.columns.*`, `position.rows.*`,
  `position.cells.*`, `position.cellValues`, `position.footnote`.
- **Semántica de celdas:** icono **y** texto —`Sí`, `No`, `En parte`, `Depende`—; nunca sólo un check de color.
- **Regla:** nunca un nombre de empresa. Las celdas son claims y pasan revisión legal en el Slice 2.

### R11 — Reglas del juego

- **Desktop:** dos columnas. Izquierda "Reglas del juego" con cuatro compromisos. Derecha "Lo que no te vamos a prometer"
  con tres límites. Superficie de papel; los límites no usan rojo.
- **Mobile:** apiladas, compromisos primero.
- **Contenido:** `operating.title`, `operating.items.{1..4}`, `operating.notPromised.title`,
  `operating.notPromised.{1..3}`.
- **Regla:** cada compromiso corresponde a un invariante de la decisión de oferta; si el invariante cambia, cambia el copy.

### R12 — Qué recibes y marcas

- **Desktop:** H2 + cuatro entregables mensuales en una fila, luego el carrusel de marcas con su rótulo de empresa. Slot
  opcional de un caso a la derecha de los entregables.
- **Mobile:** entregables en lista; caso debajo; carrusel a ancho completo.
- **Contenido:** `proof.title`, `proof.items.{1..4}`, `proof.trustLabel`, `proof.case.{title,body,metric,source}`.
- **Slot de caso — condicional:** se renderiza sólo si en el Slice 2 existe un caso con autorización escrita, métrica con
  fuente, período y denominador. Candidatos: Bresler (+180 % de ventas digitales) y el testimonio de Eusari que hoy muestra
  la página legacy. Sin autorización, el slot no existe; no se deja un placeholder.
- **Regla:** el carrusel no lleva texto de performance adyacente; sin contadores ni cifras sin fuente.

### R13 — FAQ

- **Desktop:** intro sticky a la izquierda sobre 900 px, acordeón nativo a la derecha. A 900 px o menos, una columna,
  intro estática y 28 px de separación.
- **Contenido:** `faq.title`, `faq.intro`, `faq.{1..14}.q`, `faq.{1..14}.a`.
- **Regla:** `<details>`/`<summary>`; cada respuesta presente en el HTML para el schema; las respuestas 1 y 2 reutilizan
  las cápsulas de R2.

### R14 — Conversión

- **Desktop:** plano Midnight (`clb__dark_section`). Dos columnas desde 761 px: intro sticky a 32 px a la izquierda; a la
  derecha la tarjeta editorial premium del brief y, fuera de la tarjeta, el bloque de reunión.
- **Mobile (≤760 px):** una columna estática: intro, tarjeta del brief, bloque de reunión.
- **Formulario `efeonce-performance-brief`:**

| # | Campo | Tipo | Req. | Autocomplete | Icono | Opciones |
|---|---|---|---|---|---|---|
| 1 | Nombre | text | sí | `name` | `ti-user` | — |
| 2 | Correo de trabajo | email | sí | `email` | `ti-mail` | gate de correo corporativo |
| 3 | Empresa | text | sí | `organization` | `ti-building` | — |
| 4 | A quién le vendes | select premium | sí | — | `ti-arrows-split` | A consumidores (e-commerce, retail o servicios) · A empresas (B2B) · A ambos |
| 5 | Dónde inviertes hoy | select premium | sí | — | `ti-speakerphone` | Google Ads · Meta Ads · TikTok Ads · LinkedIn Ads · Programmatic · Retail media · Otro canal · Todavía no invertimos |
| 6 | Inversión mensual en medios | select premium | sí | — | `ti-coins` | Menos de USD 5.000 · Entre USD 5.000 y 20.000 · Entre USD 20.000 y 80.000 · Más de USD 80.000 · Prefiero no decirlo |
| 7 | Mercados | select premium | sí | — | `ti-world` | Chile · México · Colombia · Perú · Estados Unidos · Varios países · Otro país |
| 8 | Qué necesitas resolver | select premium | sí | — | `ti-target` | Revisar lo que ya invierto · Ordenar la medición y las conversiones · Operar mis campañas cada mes · Conectar la pauta con mi CRM · Sumar un canal nuevo · Medir qué resultado causa la inversión · Todavía no lo tengo claro |
| 9 | CRM | select premium | no | — | `ti-address-book` | HubSpot · Salesforce · Otro CRM · No usamos CRM |
| 10 | Contexto | textarea, 500 caracteres | no | — | `ti-message` | — |

  + consentimiento, Turnstile invisible, retención `730d`, destino `greenhouse_only` inicial.
  - Los rangos de inversión coinciden con los umbrales de nivel del pricing pack (USD 20.000 y 80.000); el valor nunca
    sale del servidor hacia el dataLayer.
  - Los campos 4, 5 y 6 van a ancho completo porque deciden la calificación; 1 y 2, y 3 y 7, en pares cuando caben.
  - **[verificar]** si el renderer admite selección múltiple en el campo 5; si no, queda como selección única con el
    helper "Elige el canal donde inviertes más".
  - **[verificar]** si el renderer admite mostrar el campo 9 sólo cuando el 4 es B2B o ambos; si no, queda visible y
    opcional con su helper.
  - **[verificar]** iconos por opción y banderas vectoriales en mercados como metadata del renderer; si no existe, iconos
    sólo en labels. El precedente de influencers decoraba opciones con código page-scoped que no se debe copiar.

- **Bloque de reunión:** título, una línea y Growth CTA `performance-discovery-meeting`.
- **Contenido:** `conversion.title`, `conversion.body`, `form.overline`, `form.title`, `form.helper`, `form.badge`,
  `form.trust.{1,2}`, `form.fields.*`, `form.options.*`, `form.submit`, `form.pending`, `form.privacyLink`,
  `meeting.title`, `meeting.body`, `meeting.cta`.

### R15 — Divulgación

- Franja full-bleed con texto alineado a la retícula, entre la conversión y el footer.
- **Contenido:** `disclosure.body`.

### D — Dock de conversión

- Aparece al salir del hero y desaparece al entrar a R14 o al footer. Superficie Midnight contenida, máximo 1120 px,
  safe-area, reunión con relleno verde y diagnóstico transparente con contorno.
- `inert` y fuera del tab order mientras está oculto.
- **Contenido:** `dock.primary`, `dock.secondary`, `aria.dock`.

## Desktop Target

1440×1000. El first fold contiene R1 completo y el arranque de R2. Orden de lectura: eyebrow → H1 → cuerpo → CTA de
reunión → CTA de diagnóstico → micro-línea → circuito de la señal. El H1 no supera dos líneas; el cuerpo, tres. Ninguna
tabla, carrusel, video, logo o cifra en el fold. El circuito ocupa cinco de doce columnas y muestra sus cuatro nodos con el
arco de retorno. Validación adicional en 1536×911 y 890×911, los anchos donde los precedentes del sitio mostraron
regresiones de sticky y de columnas.

## Mobile Target

390×844. El first fold contiene eyebrow, H1 en ≤4 líneas, cuerpo en ≤5, el CTA de reunión a ancho completo y el enlace de
diagnóstico de 44 px. El circuito vertical queda inmediatamente debajo. Todas las retículas colapsan a una columna; la
tabla de posición pasa a modo card; el control de la firma queda a ancho completo; el FAQ y la conversión quedan
estáticos. Sin scroll horizontal de página.

## Action Hierarchy

| Nivel | Acción | Dónde aparece | Tratamiento |
|---|---|---|---|
| 1 | `Agenda una reunión` | Hero, conversión, dock | **Único relleno verde de la página**; tres instancias |
| 2 | `Pide un diagnóstico` | Hero, qué cambió en 2026, cómo empezamos, dock | Secundario transparente con contorno; lleva a `#conversion` y enfoca el primer campo |
| 3 | `Enviar mi brief` | Dentro del form | Azul Efeonce `primary`, texto blanco, ancho completo |
| 4 | Control `Clics / Ventas` | Firma | Control segmentado; no compite con los CTAs y no navega |
| 5 | Enlaces internos | Canales, definición, FAQ | Texto con subrayado y nombre por función |

Nunca dos acciones con relleno en el mismo bloque.

## Visual Fidelity Mapping

| Intención de la dirección | Implementación | Cómo se verifica |
|---|---|---|
| La señal como protagonista | Circuito en SVG inline + nodos HTML, 5 de 12 columnas en el hero | Captura de first fold; aserción de que los cuatro nodos son texto del DOM |
| El mecanismo se entiende sin leer | Control que reordena la lista | Captura de `performance-signal` en `Clics` y en `Ventas`; aserción de que el primer ítem cambia |
| Verde exclusivo del CTA de reunión | Sólo tres instancias del CTA primario | Conteo de elementos con el rol verde = 3 |
| Sin cifras inventadas | Barras sin escala; ningún contador | Aserción: ningún número en `performance-signal`, `performance-hero` ni `performance-proof` salvo fechas y numeración |
| Canales como cobertura | Lista con chips de estado, sin logos | Aserción: ningún `<img>` de marca de plataforma en `performance-channels` |
| Posición por tipo de proveedor | `ComparisonTable` con columna Efeonce enfatizada por superficie | Captura en desktop y en modo card; aserción de ausencia de nombres de empresa |
| Planos Midnight sólo en firma, conversión y dock | Clase `clb__dark_section` sólo en R5 y R14 | Revisión de capturas por región y del header dinámico de Ohio |
| Tipografía del sistema | Poppins 700 display, Geist 400/600 | Computed style de H1, H2, body, chip y CTA |

## Mapeo de nombres públicos

La página habla en español; el catálogo usa nombres en inglés. El mapeo es 1:1 y el Slice 2 lo registra en la ficha como
columna "Nombre público" para que nadie renombre servicios por su cuenta.

| Nombre en la página | Servicio del catálogo |
|---|---|
| Diagnóstico de Performance | Performance Diagnostic |
| Sprint de Activación | Growth Activation Sprint |
| Performance Gestionado | Managed Performance |
| Incrementalidad | Incrementality & Media Investment Architecture |
| Consumo y e-commerce | Motion A · Demand & Commerce |
| Marketing B2B | Motion B · B2B Pipeline |

## Copy Ledger

Borrador del 2026-09-11 con la voz de Efeonce: solution-aware, contraste más mecanismo, honestidad incómoda como prueba.
Sigue siendo **hipótesis** hasta el Slice 2: falta voice of customer primario, revisión legal de la tabla de posición y de
los hechos de 2026, y autorización de casos. Tuteo neutro, sin voseo, sin em-dash dentro de las strings.

| ID | String |
|---|---|
| `performance.landing.hero.eyebrow` | Agencia de performance marketing |
| `performance.landing.hero.title` | Performance marketing que aprende de tus ventas, no de tus clics. |
| `performance.landing.hero.body` | Operamos Google, Meta, TikTok, LinkedIn y más con una regla: cada campaña aprende de la venta o la oportunidad real, medida en tu sitio y en tu CRM. Cada mes sabes qué escalar y qué apagar. |
| `performance.landing.hero.primaryCta` | Agenda una reunión |
| `performance.landing.hero.secondaryCta` | Pide un diagnóstico |
| `performance.landing.hero.microline` | Chile, México, Colombia, Perú y Estados Unidos · Consumo, e-commerce y B2B |
| `performance.landing.hero.visual.node1` | Anuncio |
| `performance.landing.hero.visual.node2` | Visita |
| `performance.landing.hero.visual.node3` | Venta u oportunidad |
| `performance.landing.hero.visual.node4` | La plataforma aprende |
| `performance.landing.hero.visual.loop` | La señal vuelve |
| `performance.landing.hero.visual.description` | Diagrama: un anuncio lleva a una visita, la visita termina en una venta o una oportunidad, y ese resultado vuelve a la plataforma para enseñarle qué funciona. |
| `performance.landing.definition.title` | ¿Qué es el performance marketing? |
| `performance.landing.definition.capsule` | El performance marketing es la publicidad digital que se paga y se optimiza según resultados medibles: una venta, un lead calificado, una oportunidad o una descarga. Se opera en plataformas como Google, Meta, TikTok o LinkedIn, y su calidad depende de qué resultado se mide y de cuán limpia llega esa señal a la plataforma. |
| `performance.landing.definition.agencyTitle` | ¿Qué hace una agencia de performance marketing? |
| `performance.landing.definition.agencyCapsule` | Planifica, lanza y optimiza campañas pagadas para que la inversión produzca resultados de negocio. Hoy las plataformas automatizan la puja y la segmentación, así que el trabajo que marca la diferencia es otro: definir la señal correcta, probar creatividad con método, gobernar la automatización y leer qué causó cada resultado. |
| `performance.landing.definition.lexicon` | También lo vas a encontrar como paid media, publicidad digital, pauta digital o campañas pagadas. Hablamos de lo mismo: publicidad que se paga y se mide por resultados. |
| `performance.landing.problem.title` | Las plataformas ya compran solas. Optimizan lo que les enseñas. |
| `performance.landing.problem.attribution.name` | Cada plataforma se atribuye la misma venta |
| `performance.landing.problem.attribution.body` | Google, Meta y TikTok cuentan conversiones que se superponen. Sumadas, pueden dar más ventas de las que realmente tuviste. |
| `performance.landing.problem.signal.name` | La campaña aprende del resultado equivocado |
| `performance.landing.problem.signal.body` | Si aprende del clic o del formulario, gana lo que trae más clics, no lo que vende. En B2B, gana el lead que ventas descarta. |
| `performance.landing.problem.creative.name` | La creatividad se agota sin aviso |
| `performance.landing.problem.creative.body` | Los anuncios rinden menos con el uso. Si nadie mide ese desgaste, la inversión sigue yendo a piezas que ya no funcionan. |
| `performance.landing.problem.close` | Con la señal equivocada, más inversión sólo acelera el error. Por eso empezamos por lo que aprende la plataforma. |
| `performance.landing.whyNow.title` | Qué cambió en 2026 |
| `performance.landing.whyNow.intro` | Tres cambios afectan lo que miden tus campañas este año. |
| `performance.landing.whyNow.items.meta.date` | Marzo 2026 |
| `performance.landing.whyNow.items.meta.name` | Meta cambió cómo cuenta los clics |
| `performance.landing.whyNow.items.meta.body` | Sólo el clic en el enlace cuenta como clic; las interacciones pasaron a otra categoría. Tus métricas de antes ya no se comparan directo con las de ahora. |
| `performance.landing.whyNow.items.meta.source` | Fuente: Meta, actualización de atribución del 3 de marzo de 2026. |
| `performance.landing.whyNow.items.google.date` | Septiembre 2026 |
| `performance.landing.whyNow.items.google.name` | Google retira las campañas dinámicas de búsqueda |
| `performance.landing.whyNow.items.google.body` | Ya no se crean campañas nuevas de ese tipo, y en febrero de 2027 las que existen pasan a AI Max. Conviene decidir la migración antes de que ocurra sola. |
| `performance.landing.whyNow.items.google.source` | Fuente: Google Ads, anuncio del 15 de abril de 2026. |
| `performance.landing.whyNow.items.law.date` | Diciembre 2026 |
| `performance.landing.whyNow.items.law.name` | Chile tiene nueva ley de datos personales |
| `performance.landing.whyNow.items.law.body` | La Ley 21.719 rige desde el 1 de diciembre de 2026. Enviar datos de clientes a una plataforma publicitaria exige una base legal documentada. |
| `performance.landing.whyNow.items.law.source` | Fuente: Ley 21.719, publicada el 13 de diciembre de 2024. |
| `performance.landing.whyNow.note` | Revisamos los tres puntos en el diagnóstico. No es asesoría legal: dejamos identificados los flujos de datos para que los revise tu equipo legal. |
| `performance.landing.whyNow.cta` | Pide un diagnóstico |
| `performance.landing.signal.title` | Cambia la señal y cambia quién gana |
| `performance.landing.signal.body` | La misma inversión, dos formas de medir. Mira qué campaña recibe más presupuesto según lo que aprende la plataforma. |
| `performance.landing.signal.toggle.label` | Qué aprende la plataforma |
| `performance.landing.signal.toggle.clicks` | Clics |
| `performance.landing.signal.toggle.sales` | Ventas |
| `performance.landing.signal.campaigns.c1.name` | Remarketing a visitantes |
| `performance.landing.signal.campaigns.c1.clicksNote` | Muchos clics de gente que ya te conoce |
| `performance.landing.signal.campaigns.c1.salesNote` | Muchas de esas compras habrían ocurrido igual |
| `performance.landing.signal.campaigns.c2.name` | Prospección con video |
| `performance.landing.signal.campaigns.c2.clicksNote` | Mucha interacción, poca intención de compra |
| `performance.landing.signal.campaigns.c2.salesNote` | Abre demanda que otras campañas cierran |
| `performance.landing.signal.campaigns.c3.name` | Búsqueda de tu marca |
| `performance.landing.signal.campaigns.c3.clicksNote` | Clics baratos de quien ya te buscaba |
| `performance.landing.signal.campaigns.c3.salesNote` | Vende, pero protege lo que ya era tuyo |
| `performance.landing.signal.campaigns.c4.name` | Búsqueda por categoría |
| `performance.landing.signal.campaigns.c4.clicksNote` | Pocos clics y más caros |
| `performance.landing.signal.campaigns.c4.salesNote` | Trae compradores que todavía no te conocían |
| `performance.landing.signal.state.clicks.caption` | Aprendiendo de clics, gana lo que atrae más interacción, aunque venda poco. |
| `performance.landing.signal.state.sales.caption` | Aprendiendo de ventas, gana lo que trae compradores nuevos, aunque tenga menos clics. |
| `performance.landing.signal.b2bNote` | En B2B pasa lo mismo entre el formulario y la oportunidad que ventas acepta. |
| `performance.landing.signal.label` | Ejemplo ilustrativo. No corresponde a un cliente. |
| `performance.landing.signal.noJs.clicksTitle` | Si la plataforma aprende de clics |
| `performance.landing.signal.noJs.salesTitle` | Si la plataforma aprende de ventas |
| `performance.landing.signal.live.clicks` | Ordenado por clics. Primero: Remarketing a visitantes. |
| `performance.landing.signal.live.sales` | Ordenado por ventas. Primero: Búsqueda por categoría. |
| `performance.landing.motions.title` | Dos formas de trabajar, según a quién le vendes |
| `performance.landing.motions.intro` | El oficio es el mismo. Cambia qué resultado aprende la pauta y cómo se mide. |
| `performance.landing.motions.rowLabels.for` | Para quién |
| `performance.landing.motions.rowLabels.optimizes` | Qué optimizamos |
| `performance.landing.motions.rowLabels.channels` | Canales habituales |
| `performance.landing.motions.rowLabels.measure` | Cómo lo medimos |
| `performance.landing.motions.commerce.name` | Consumo y e-commerce |
| `performance.landing.motions.commerce.for` | Marcas que venden online o en tiendas y ya invierten en dos o más canales. |
| `performance.landing.motions.commerce.optimizes` | La venta, el valor de cada compra y el margen, cuando lo compartes. |
| `performance.landing.motions.commerce.channels` | Google, Meta, TikTok y retail media. |
| `performance.landing.motions.commerce.measure` | La eficiencia total de tu negocio, no el retorno que declara cada plataforma. |
| `performance.landing.motions.b2b.name` | Marketing B2B |
| `performance.landing.motions.b2b.for` | Empresas con venta consultiva y un CRM con etapas. |
| `performance.landing.motions.b2b.optimizes` | Las oportunidades que tu equipo de ventas acepta, no los formularios. |
| `performance.landing.motions.b2b.channels` | LinkedIn, búsqueda en Google y remarketing. |
| `performance.landing.motions.b2b.measure` | El costo por oportunidad y el pipeline con fuente en tu CRM. |
| `performance.landing.motions.b2b.crm` | Conectamos la pauta con HubSpot o Salesforce. |
| `performance.landing.modules.title` | Qué hacemos, en cinco frentes |
| `performance.landing.modules.intro` | La operación de campañas es sólo uno. Los otros cuatro deciden si esa operación sirve. |
| `performance.landing.modules.signal.name` | Medición y señal |
| `performance.landing.modules.signal.body` | Definimos qué resultado aprende cada campaña y verificamos que llegue completo, sin duplicados y con consentimiento. |
| `performance.landing.modules.operations.name` | Operación de medios |
| `performance.landing.modules.operations.body` | Nuestros media buyers y traffickers gestionan presupuesto, ritmo de inversión, audiencias, exclusiones y pujas en cada canal. |
| `performance.landing.modules.commerce.name` | Commerce media |
| `performance.landing.modules.commerce.body` | Tu inversión en marketplaces y cadenas, leída junto a tu catálogo, tu stock y tus ventas. |
| `performance.landing.modules.creative.name` | Creatividad de performance |
| `performance.landing.modules.creative.body` | Diseñamos qué probar y leemos qué funcionó. La producción de piezas se cotiza aparte con nuestro equipo creativo. |
| `performance.landing.modules.governance.name` | Gobierno de la automatización |
| `performance.landing.modules.governance.body` | Decidimos qué dejar en manos de la plataforma, qué controlar y cómo detectar cuándo se equivoca. |
| `performance.landing.modules.advanced.label` | Avanzado |
| `performance.landing.modules.advanced.name` | Incrementalidad |
| `performance.landing.modules.advanced.body` | Cuando hay volumen, medimos qué ventas causó la inversión con pruebas controladas. No se activa por defecto. |
| `performance.landing.channels.title` | Canales que operamos |
| `performance.landing.channels.intro` | Elegimos el mix según tu negocio, no según el canal que más nos conviene vender. |
| `performance.landing.channels.chips.direct` | Lo operamos |
| `performance.landing.channels.chips.partner` | Con partner tecnológico |
| `performance.landing.channels.chips.available` | Donde está disponible |
| `performance.landing.channels.chips.onRequest` | Bajo pedido |
| `performance.landing.channels.items.google.name` | Google Ads |
| `performance.landing.channels.items.google.body` | Búsqueda (SEM), Performance Max, Demand Gen y YouTube. Con exclusiones de marca y señal limpia, para que la automatización no compre a quien ya te buscaba. |
| `performance.landing.channels.items.meta.name` | Meta Ads: Facebook e Instagram |
| `performance.landing.channels.items.meta.body` | Anuncios en Facebook e Instagram, y anuncios que abren una conversación en WhatsApp cuando vendes por mensajería. |
| `performance.landing.channels.items.tiktok.name` | TikTok Ads |
| `performance.landing.channels.items.tiktok.body` | Cuando hay video pensado para TikTok. Sin creatividad nativa, no lo recomendamos. |
| `performance.landing.channels.items.linkedin.name` | LinkedIn Ads |
| `performance.landing.channels.items.linkedin.body` | Para B2B: llegar a cargos y empresas concretas, medido contra las oportunidades de tu CRM. |
| `performance.landing.channels.items.programmatic.name` | Programmatic |
| `performance.landing.channels.items.programmatic.body` | Display, video, audio y pantallas digitales en la vía pública, con reporte por sitio y costos declarados. |
| `performance.landing.channels.items.retail.name` | Retail media y Mercado Ads |
| `performance.landing.channels.items.retail.body` | Mercado Ads y las redes de medios de las cadenas, leídas junto a tus ventas. |
| `performance.landing.channels.items.chatgpt.name` | Anuncios en ChatGPT |
| `performance.landing.channels.items.chatgpt.body` | Bajo las respuestas de ChatGPT, en los países donde OpenAI ya los habilita. En Chile todavía no están disponibles: te dejamos listo para cuando lleguen. |
| `performance.landing.channels.items.x.name` | X Ads |
| `performance.landing.channels.items.x.body` | Cuando tu audiencia conversa ahí, con verificación de brand safety. |
| `performance.landing.channels.asOf` | Disponibilidad de canales revisada en septiembre de 2026. |
| `performance.landing.channels.note` | Tus cuentas publicitarias, tus datos y tus audiencias quedan siempre a tu nombre. |
| `performance.landing.ladder.title` | Cómo empezamos |
| `performance.landing.ladder.intro` | Cuatro pasos. Puedes entrar por el primero y decidir el siguiente con evidencia. |
| `performance.landing.ladder.steps.1.name` | Diagnóstico de Performance |
| `performance.landing.ladder.steps.1.body` | Revisamos tu inversión, tus cuentas, tu medición y tu creatividad. Te entregamos qué corregir primero y un plan de 90 días. |
| `performance.landing.ladder.steps.1.duration` | 2 a 4 semanas |
| `performance.landing.ladder.steps.2.name` | Sprint de Activación |
| `performance.landing.ladder.steps.2.body` | Ordenamos la medición y las cuentas, y lanzamos las primeras pruebas contra una línea base. |
| `performance.landing.ladder.steps.2.duration` | 8 a 12 semanas |
| `performance.landing.ladder.steps.3.name` | Performance Gestionado |
| `performance.landing.ladder.steps.3.body` | Operamos tus canales cada mes y cada trimestre te recomendamos dónde poner el siguiente peso. |
| `performance.landing.ladder.steps.3.duration` | Mensual, desde 3 meses |
| `performance.landing.ladder.steps.4.name` | Incrementalidad |
| `performance.landing.ladder.steps.4.body` | Pruebas controladas para saber qué resultado causó la inversión. |
| `performance.landing.ladder.steps.4.duration` | Cuando hay volumen |
| `performance.landing.ladder.cta` | Pide un diagnóstico |
| `performance.landing.position.title` | Qué cambia frente a otras formas de hacerlo |
| `performance.landing.position.intro` | No se trata de cuánto sabe cada uno de Google o Meta. Se trata de qué aprende tu pauta y de quién son los datos. |
| `performance.landing.position.caption` | Qué ofrece cada tipo de proveedor de performance marketing |
| `performance.landing.position.columns.freelance` | Freelance o consultor |
| `performance.landing.position.columns.agency` | Agencia de gestión de pauta |
| `performance.landing.position.columns.efeonce` | Efeonce |
| `performance.landing.position.rows.signal` | Optimiza hacia la venta o la oportunidad, no hacia el clic |
| `performance.landing.position.cells.signal` | Freelance: En parte · Agencia: En parte · Efeonce: Sí |
| `performance.landing.position.rows.crm` | Conecta la pauta con tu CRM |
| `performance.landing.position.cells.crm` | Freelance: No · Agencia: En parte · Efeonce: Sí |
| `performance.landing.position.rows.creative` | Prueba creatividad con un método y registra lo aprendido |
| `performance.landing.position.cells.creative` | Freelance: En parte · Agencia: En parte · Efeonce: Sí |
| `performance.landing.position.rows.governance` | Decide qué automatizar y qué controlar en cada plataforma |
| `performance.landing.position.cells.governance` | Freelance: En parte · Agencia: En parte · Efeonce: Sí |
| `performance.landing.position.rows.ownership` | Tus cuentas y tus datos quedan a tu nombre |
| `performance.landing.position.cells.ownership` | Freelance: Depende · Agencia: Depende · Efeonce: Sí |
| `performance.landing.position.rows.fees` | Fee separado de la inversión, sin recargos sobre medios |
| `performance.landing.position.cells.fees` | Freelance: Depende · Agencia: Depende · Efeonce: Sí |
| `performance.landing.position.cellValues` | Sí · No · En parte · Depende |
| `performance.landing.position.footnote` | Comparación por tipo de proveedor, no por empresa. Cada caso es distinto. |
| `performance.landing.operating.title` | Reglas del juego |
| `performance.landing.operating.items.1` | Tus cuentas, píxeles, audiencias y datos quedan a tu nombre. Si un día te vas, te llevas todo, incluido lo que aprendimos. |
| `performance.landing.operating.items.2` | Nuestro fee va separado de tu inversión en medios. Sin comisiones escondidas ni recargos sobre lo que pagas a las plataformas. |
| `performance.landing.operating.items.3` | Cada cambio de presupuesto lo aprueba una persona. La automatización propone; alguien del equipo decide. |
| `performance.landing.operating.items.4` | Cada mes sabes qué escalar, qué apagar y por qué. |
| `performance.landing.operating.notPromised.title` | Lo que no te vamos a prometer |
| `performance.landing.operating.notPromised.1` | Un retorno garantizado. Depende también de tu oferta, tu precio, tu stock, tu sitio y tu equipo de ventas. |
| `performance.landing.operating.notPromised.2` | Que el retorno que reporta cada plataforma sea el que causó la inversión. Te mostramos las dos lecturas. |
| `performance.landing.operating.notPromised.3` | Que un canal funcione antes de probarlo con tu señal y tu creatividad. |
| `performance.landing.proof.title` | Qué recibes cada mes |
| `performance.landing.proof.items.1` | Un reporte que cruza lo que dicen las plataformas con lo que pasó en tus ventas o en tu CRM. |
| `performance.landing.proof.items.2` | Las pruebas del mes y lo que aprendimos de cada una. |
| `performance.landing.proof.items.3` | El estado de tu medición: qué llega completo y qué no. |
| `performance.landing.proof.items.4` | Una recomendación de dónde poner el siguiente peso, con su porqué. |
| `performance.landing.proof.trustLabel` | Marcas que confían en Efeonce |
| `performance.landing.proof.case.title` | (condicional, Slice 2) Nombre del cliente con autorización |
| `performance.landing.proof.case.body` | (condicional, Slice 2) Qué se hizo, en una oración |
| `performance.landing.proof.case.metric` | (condicional, Slice 2) Métrica con período y denominador |
| `performance.landing.proof.case.source` | (condicional, Slice 2) Fuente del dato |
| `performance.landing.faq.title` | Preguntas frecuentes |
| `performance.landing.faq.intro` | Lo que suele preguntar un equipo de marketing antes de cambiar de agencia. |
| `performance.landing.faq.1.q` | ¿Qué es el performance marketing? |
| `performance.landing.faq.1.a` | (reutiliza definition.capsule) |
| `performance.landing.faq.2.q` | ¿Qué hace una agencia de performance marketing? |
| `performance.landing.faq.2.a` | (reutiliza definition.agencyCapsule) |
| `performance.landing.faq.3.q` | ¿Cuánto cuesta una agencia de performance marketing? |
| `performance.landing.faq.3.a` | Depende de cuántos canales y mercados operamos y de qué tan madura está tu medición. Cobramos un fee mensual por la operación, separado de tu inversión en medios, y el diagnóstico tiene precio cerrado. Nunca cobramos sólo un porcentaje de lo que inviertes. |
| `performance.landing.faq.4.q` | ¿Cuánto hay que invertir en publicidad digital? |
| `performance.landing.faq.4.a` | Depende del canal: cada plataforma necesita un volumen mínimo de conversiones para aprender, y LinkedIn suele pedir más inversión que Google o Meta. En el diagnóstico revisamos si tu inversión alcanza para los canales que quieres; si no alcanza, te recomendamos concentrarte en menos canales. |
| `performance.landing.faq.5.q` | ¿Las cuentas publicitarias quedan a mi nombre? |
| `performance.landing.faq.5.a` | Sí. Las cuentas, los píxeles, las audiencias y los datos están a tu nombre. Accedemos como partner y, si terminamos, te quedas con todo, incluido el historial de lo que aprendimos. |
| `performance.landing.faq.6.q` | ¿Trabajan con mi equipo interno o con mi agencia actual? |
| `performance.landing.faq.6.a` | Sí. Si ya tienes a alguien operando, podemos tomar sólo la medición, la creatividad de performance o el gobierno de la automatización y trabajar junto a tu equipo. |
| `performance.landing.faq.7.q` | ¿Hacen auditorías de Google Ads o Meta Ads? |
| `performance.landing.faq.7.a` | Sí, como parte del diagnóstico: revisamos tus cuentas, tu medición y tu creatividad, y te entregamos qué corregir primero. No es un informe automático: lo revisa una persona del equipo. |
| `performance.landing.faq.8.q` | ¿Trabajan LinkedIn Ads para B2B? |
| `performance.landing.faq.8.a` | Sí. Lo conectamos con tu CRM para que la campaña aprenda de las oportunidades que ventas acepta y no de los formularios. Lo recomendamos cuando la inversión alcanza para que la plataforma aprenda. |
| `performance.landing.faq.9.q` | ¿Compran medios programáticos? |
| `performance.landing.faq.9.a` | Sí, a través de un partner tecnológico, con reporte por sitio, listas de exclusión de sitios de baja calidad y todos los costos declarados en tu factura. |
| `performance.landing.faq.10.q` | ¿Hacen anuncios en ChatGPT? |
| `performance.landing.faq.10.a` | Sí, en los países donde OpenAI ya los habilita, como México, Brasil, Estados Unidos y España. En Chile todavía no están disponibles (septiembre de 2026); mientras tanto preparamos tus landings y tu medición para cuando lleguen. |
| `performance.landing.faq.11.q` | ¿Qué cambia con la Ley 21.719 para la publicidad digital? |
| `performance.landing.faq.11.a` | Desde el 1 de diciembre de 2026, enviar datos de clientes a una plataforma publicitaria, por ejemplo para crear audiencias o registrar conversiones, requiere una base legal documentada. En el diagnóstico identificamos esos flujos para que tu equipo legal los revise. No es asesoría legal. |
| `performance.landing.faq.12.q` | ¿Garantizan resultados? |
| `performance.landing.faq.12.a` | No. El resultado depende también de tu oferta, tu precio, tu stock, tu sitio y tu equipo de ventas. Lo que sí garantizamos es cómo trabajamos: medición verificada, pruebas con método y una recomendación clara cada mes. |
| `performance.landing.faq.13.q` | ¿Qué es Google Ads y cómo funciona? |
| `performance.landing.faq.13.a` | Google Ads es la plataforma de publicidad de Google. Muestra anuncios en el buscador y en YouTube, y cobra según clics, vistas o conversiones. Hoy su automatización decide gran parte de las pujas y los públicos, así que lo que más influye en el resultado es qué conversión le enseñas a optimizar. La publicidad en buscadores se conoce como SEM. |
| `performance.landing.faq.14.q` | ¿Qué es la pauta digital? |
| `performance.landing.faq.14.a` | La pauta digital es otra forma de llamar a la publicidad digital pagada: los anuncios en buscadores, redes sociales y otros medios digitales por los que una marca paga para llegar a su audiencia. En Colombia y Perú se dice pautar; en Chile también paid media. Cuando la pauta se optimiza según resultados medibles, hablamos de performance marketing. |
| `performance.landing.conversion.title` | Cuéntanos cómo inviertes hoy y te decimos por dónde empezar |
| `performance.landing.conversion.body` | Con lo esencial preparamos el diagnóstico y llegamos a la conversación con preguntas concretas. |
| `performance.landing.form.overline` | Brief de performance |
| `performance.landing.form.title` | Cuéntanos lo esencial |
| `performance.landing.form.helper` | Ocho datos obligatorios. Los dos opcionales nos ayudan a llegar mejor preparados. |
| `performance.landing.form.badge` | 2 minutos |
| `performance.landing.form.trust.1` | Datos protegidos |
| `performance.landing.form.trust.2` | Te responde una persona del equipo |
| `performance.landing.form.fields.name.label` | Nombre |
| `performance.landing.form.fields.name.error` | Escribe tu nombre para saber a quién responder. |
| `performance.landing.form.fields.email.label` | Correo de trabajo |
| `performance.landing.form.fields.email.placeholder` | nombre@empresa.com |
| `performance.landing.form.fields.email.error` | Escribe un correo válido, por ejemplo nombre@empresa.com. |
| `performance.landing.form.fields.email.corporateError` | Usa tu correo de trabajo para enviar el brief. |
| `performance.landing.form.fields.company.label` | Empresa |
| `performance.landing.form.fields.company.error` | Escribe el nombre de tu empresa. |
| `performance.landing.form.fields.business.label` | A quién le vendes |
| `performance.landing.form.fields.business.error` | Elige a quién le vendes. |
| `performance.landing.form.fields.channels.label` | Dónde inviertes hoy |
| `performance.landing.form.fields.channels.helper` | Elige el canal donde inviertes más. |
| `performance.landing.form.fields.channels.error` | Elige un canal o «Todavía no invertimos». |
| `performance.landing.form.fields.spend.label` | Inversión mensual en medios |
| `performance.landing.form.fields.spend.helper` | Una estimación basta, en dólares o su equivalente. |
| `performance.landing.form.fields.spend.error` | Elige un rango o «Prefiero no decirlo». |
| `performance.landing.form.fields.markets.label` | Mercados |
| `performance.landing.form.fields.markets.error` | Elige dónde vendes. |
| `performance.landing.form.fields.need.label` | Qué necesitas resolver |
| `performance.landing.form.fields.need.error` | Elige lo que más necesitas resolver. |
| `performance.landing.form.fields.crm.label` | CRM |
| `performance.landing.form.fields.crm.helper` | Si vendes a empresas, nos ayuda saber cuál usas. |
| `performance.landing.form.fields.context.label` | Contexto |
| `performance.landing.form.fields.context.helper` | Por ejemplo, un canal que dejó de rendir o un lanzamiento en camino. |
| `performance.landing.form.fields.context.error` | Máximo 500 caracteres (tienes {n}). |
| `performance.landing.form.fields.consent.error` | Necesitamos tu autorización para responderte. |
| `performance.landing.form.options.business` | A consumidores (e-commerce, retail o servicios) · A empresas (B2B) · A ambos |
| `performance.landing.form.options.channels` | Google Ads · Meta Ads · TikTok Ads · LinkedIn Ads · Programmatic · Retail media · Otro canal · Todavía no invertimos |
| `performance.landing.form.options.spend` | Menos de USD 5.000 · Entre USD 5.000 y 20.000 · Entre USD 20.000 y 80.000 · Más de USD 80.000 · Prefiero no decirlo |
| `performance.landing.form.options.markets` | Chile · México · Colombia · Perú · Estados Unidos · Varios países · Otro país |
| `performance.landing.form.options.need` | Revisar lo que ya invierto · Ordenar la medición y las conversiones · Operar mis campañas cada mes · Conectar la pauta con mi CRM · Sumar un canal nuevo · Medir qué resultado causa la inversión · Todavía no lo tengo claro |
| `performance.landing.form.options.crm` | HubSpot · Salesforce · Otro CRM · No usamos CRM |
| `performance.landing.form.submit` | Enviar mi brief |
| `performance.landing.form.pending` | Enviando… |
| `performance.landing.form.privacyLink` | Cómo usamos tus datos |
| `performance.landing.meeting.title` | ¿Prefieres conversarlo? |
| `performance.landing.meeting.body` | Una conversación con el equipo para revisar tu inversión juntos. |
| `performance.landing.meeting.cta` | Agenda una reunión |
| `performance.landing.disclosure.body` | Los ejemplos y diagramas de esta página son referenciales. No corresponden a clientes ni a resultados. |
| `performance.landing.dock.primary` | Agenda una reunión |
| `performance.landing.dock.secondary` | Pide un diagnóstico |
| `performance.landing.aria.dock` | Empezar con Efeonce |
| `performance.landing.aria.signalToggle` | Elegir qué aprende la plataforma |
| `performance.landing.aria.signalList` | Campañas ordenadas por el presupuesto que reciben |
| `performance.landing.aria.chip` | Estado del canal: {estado} |
| `performance.landing.seo.title` | Agencia de performance marketing y publicidad digital \| Efeonce |
| `performance.landing.seo.description` | Agencia de performance marketing y publicidad digital: Google Ads, Meta, TikTok y LinkedIn optimizados hacia ventas reales, con tus cuentas a tu nombre. |
| `performance.landing.og.title` | Performance marketing que aprende de tus ventas |
| `performance.landing.og.description` | Tu pauta optimiza lo que le enseñas. Te ayudamos a enseñarle a vender, con tus cuentas y tus datos a tu nombre. |

Las respuestas 1 y 2 del FAQ reutilizan las cápsulas de R2 para que el schema marque exactamente lo visible. Las strings
marcadas como condicionales no se publican sin el caso autorizado.

### Regla terminológica

**Cada término nombra una cosa distinta; nunca dos nombres para lo mismo dentro de un bloque.**

| Término | Qué nombra | Dónde se usa |
|---|---|---|
| **pauta** | La inversión publicitaria y su operación, en conjunto | Titulares y cuerpo; es el término del mercado chileno |
| **campaña** | La unidad operativa dentro de una plataforma | Firma, canales, FAQ |
| **anuncio** | La pieza que ve la persona | Problema, circuito |
| **señal** | El resultado que la plataforma recibe para aprender | Hero, firma, módulos; nunca "dato" ni "evento" en copy visible |
| **plataforma** | Google, Meta, TikTok, LinkedIn y demás, como actor que aprende | Cuerpo; "algoritmo" no se usa en copy visible |
| **automatización** | Las funciones que la plataforma decide sola | Módulos, reglas del juego |
| **inversión en medios** | Lo que el cliente paga a las plataformas | Reglas del juego, FAQ, formulario |
| **fee** | Lo que cobra Efeonce | Reglas del juego, FAQ |
| **oportunidad** | La etapa del CRM que ventas acepta | Motion B, firma, FAQ; nunca "lead calificado" en titulares |
| **publicidad digital · paid media · pauta digital** | Nombres de la categoría con que busca cada país | Title, línea de léxico de R2 y FAQ 14; en el cuerpo se usa pauta |
| **media buyers y traffickers** | El rol del operador (Chile y Perú) | Sólo en el módulo de operación, siempre juntos |

No se usan en copy visible: ROAS, CPA, CPL, "growth", "escalar exponencialmente", "maximizar tu inversión", "resultados
garantizados".

## State Copy

| Estado | Copy visible | Recuperación |
|---|---|---|
| ready | Formulario montado con sus diez campos, el consentimiento y el submit "Enviar mi brief". | — |
| loading | Estado de carga del renderer: "Cargando el formulario…". Nunca un bloque vacío. | Si no monta en el tiempo del renderer, pasa a `partial`. |
| empty | "Completa los campos marcados para continuar." + resumen de errores enfocable. | Foco al resumen; cada error enlaza a su campo. |
| partial | "El formulario no pudo cargar. Agenda una reunión y lo revisamos contigo." | CTA de reunión visible en el mismo bloque; enlace a `/contacto/`. |
| error | "No pudimos enviar tu brief. Revisa los campos marcados o inténtalo de nuevo." | Conserva los valores escritos; reintento sin recargar. |
| denied | "Usa tu correo de trabajo para enviar el brief." · Verificación fallida: "No pudimos verificar el envío. Inténtalo de nuevo o agenda una reunión." | Foco al campo de correo; reunión como alternativa. |
| success | Success card gobernada: "Recibimos tu brief. Lo revisamos antes de contactarte, para llegar a la conversación con lo que ya nos contaste." | Sin promesa de plazo; CTA de reunión opcional. |
| meeting unavailable | Recuperación nativa del scheduler: navegación de mes y "Reintentar". | Sin enlaces ni copy del proveedor. |
| signal no-js | Las dos listas lado a lado con sus títulos, sin control. | — |
| no-js | Todo el contenido visible; los CTAs de reunión enlazan a `/contacto/`. | El brief no monta; el contenido crítico no depende de él. |
| reduced motion | Mismo contenido y mismos estados, sin reveals, reordenamiento animado ni trazos. | — |

## Accessibility Contract

- Un solo H1. H2 por región; H3 por canal, módulo, paso y columna de motion. Sin saltos de nivel.
- Landmarks: `<main>` para el cuerpo; el header y el footer son de Ohio.
- `lang="es-CL"` heredado del sitio.
- **Circuito del hero:** `role="img"` con `aria-labelledby` hacia `hero.visual.description`; los nodos son texto, no
  imágenes; el SVG de líneas es `aria-hidden="true"`.
- **Control de la firma:** `role="radiogroup"` con dos `role="radio"` (`aria-checked`), etiqueta
  `aria.signalToggle`; flechas izquierda y derecha cambian de opción; Espacio selecciona. La lista es un `<ol>` con
  `aria-label` `aria.signalList`. Al cambiar de estado, una región `aria-live="polite"` anuncia
  `signal.live.clicks` o `signal.live.sales`. El foco se queda en el control.
- **Barras de la firma:** decorativas (`aria-hidden="true"`); el orden y la nota de cada campaña llevan el significado.
- **Chips de canal:** icono decorativo + texto visible; el chip completo tiene nombre accesible `aria.chip`.
- Tabla de posición con `<table>`, `<caption>`, `<th scope="col">` y `<th scope="row">`; cada celda con texto, no sólo un
  icono.
- FAQ con `<details>`/`<summary>`; nada depende de hover.
- Formulario: labels visibles sobre el control, errores locales con `aria-describedby`, resumen enfocable,
  `autocomplete`, targets ≥44 px y selects premium con el contrato combobox/listbox del renderer.
- CTAs con verbo específico y nombre accesible único. El dock oculto es `inert`.
- Contraste AA en texto, chips, nodos del circuito y estados de la firma, sobre papel y sobre Midnight; foco doble
  visible en ambos planos.
- Fechas de R4 en texto (`<time datetime>`), no sólo en formato visual.
- `prefers-reduced-motion` elimina reveals, trazos, desplazamiento de la señal y reordenamiento animado sin quitar
  contenido ni estado.

## Implementation Mapping

- **Runtime:** `efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets` — **[verificar]** la ruta del
  checkout local antes de construir.
- **Módulos semánticos nuevos:** `greenhouse_performance_{hero,definition,problem,whynow,signal,motions,modules,channels,ladder,operating,proof,faq,conversion}`,
  trece widgets, cada uno en su contenedor Elementor, siguiendo el patrón de `EO_Content_Marketing_Base`: base
  `EO_Performance_Base`, schemas en `includes/performance/schemas/`, familia `performanceModule.v1`. **[verificar]** la
  convención exacta contra el módulo de Content Marketing y, si ya existe, contra el de Channel & Commerce (`TASK-1860`).
- **Reuso:** `greenhouse_comparison_table` para R10; `greenhouse_social_trust` para R12; `greenhouse_growth_form` como
  host del brief dentro de R14; Growth CTA para la reunión.
- **Estilos:** `assets/css/performance.css` con raíz `.gh-performance`; sin selectores globales ni overrides de Ohio
  fuera de la página. Bandas oscuras con `clb__dark_section` nativo de Ohio.
- **Comportamiento:** `assets/js/performance.js` para el control de la firma (radiogroup, reordenamiento con FLIP,
  región live), el dock y la sincronización de anchors; mejora progresiva sobre HTML servido por PHP que ya contiene las
  dos listas.
- **SEO:** `includes/performance/seo.php`, activo sólo con el marker `_eo_performance_enabled=1`; añade `Service` y
  `FAQPage` sin duplicar Yoast.
- **Growth Form:** `efeonce-performance-brief`, kind `quote_request`, `style_variant=diagnostic_premium`, surface nueva
  `fhsf-efeonce-performance`, publicada por el lifecycle gobernado del motor. Helper idempotente nuevo en
  `scripts/growth/` siguiendo el patrón de `growth:forms:activate-influencer-premium-selects`.
- **Growth CTA:** `performance-discovery-meeting`, acción `open_meeting_scheduler`, sobre `fhsf-efeonce-lead-gen-web` /
  scheduler `discovery`.
- **Tracking:** fila nueva en `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md`; familias `gh_form_*`, `gh_cta_*`,
  `gh_meeting_*`; key event `generate_lead` desde `gh_form_submission_accepted`. El control de la firma no emite
  eventos en V1.
- **Verificadores nuevos:** `pnpm public-website:verify-performance-landing-fidelity`,
  `pnpm public-website:verify-performance-seo-package` y `pnpm public-website:verify-performance-legacy-redirect`, con la
  anatomía de los gates de influencers.
- **Legacy:** página `242862` con snapshot previo; 301 por la API de redirects de Yoast SEO Premium, sin escribir la
  opción cruda; la página pasa a `private` sin borrarse.
- **Menú:** se reapunta el ítem existente `Performance Marketing` a la página nueva; no se crea un ítem nuevo.
  **[verificar]** el ID del ítem y su grupo en el menú primario `61`.

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/public-servicios-performance-marketing.scenario.ts`.
- Route: `/servicios/performance-marketing/` en `efeoncepro.com`. **[verificar]** cómo apunta GVC al host público: el
  resolver de entornos sólo conoce hosts de Greenhouse; los precedentes públicos se verificaron con gates Playwright
  dedicados.
- Viewports: 1536×911, 1440×1000 (desktop), 890×911 (tablet) y 390×844 (mobile).
- Quality profile: `premium`, con `keyboard.enabled`, probes de teclado y `reducedMotionCheck`.
- Markers: `performance-hero`, `performance-definition`, `performance-problem`, `performance-whynow`,
  `performance-signal`, `performance-motions`, `performance-modules`, `performance-channels`, `performance-ladder`,
  `performance-position`, `performance-operating`, `performance-proof`, `performance-faq`, `performance-conversion`,
  `performance-disclosure`, `performance-dock`.
- Capturas: first fold por viewport; firma en `Clics` y en `Ventas`; tabla de posición en desktop y en modo card;
  canales con sus cuatro chips; FAQ abierto; formulario listo; submit vacío con resumen de errores; select abierto; dock
  visible; diálogo del scheduler abierto sin reservar; full page; la URL legacy tras el 301.
- Assertions: un H1; `scrollWidth === clientWidth` en cada viewport (scroll-width check); formulario montado con diez
  campos y submit; el CTA de reunión abre el scheduler nativo; exactamente tres instancias del rol verde; `<ol>` presente
  en firma y escalera; el primer ítem de la firma cambia al cambiar el control; ningún número en hero, firma y prueba
  salvo fechas y numeración; ningún logo de plataforma en canales; consola sin errores propios; la URL legacy responde 301
  hacia la nueva.
- Keyboard probes: tab al CTA primario; cambiar la firma con flechas; abrir un `<details>` del FAQ; recorrer los campos
  del form; confirmar que el dock oculto no recibe foco.
- Review dossier: `pnpm fe:capture:review public-servicios-performance-marketing`.
- Baseline decision: surface ID `public-servicios-performance-marketing`; baseline nueva en la primera captura aprobada
  por el owner.
- Scorecard: `docs/ui/reviews/TASK-1865-landing-performance-marketing.scorecard.json`.

## Design Decision Log

| Decisión | Alternativas consideradas | Por qué |
|---|---|---|
| Dirección A, la señal | B tablero de resultados · C muro de plataformas | Única que muestra el diferenciador sin cifras inventadas ni logos de terceros |
| Página nueva en `/servicios/performance-marketing/` + 301 desde la legacy | Reconstruir sobre `/servicio-gestion-campanas-publicitarias/` | Alinea con la arquitectura `/servicios/*` de PDR-002; la legacy no rankea ninguna keyword del cluster, así que el riesgo de equidad es bajo. El Slice 1 puede revertir la decisión si los backlinks lo justifican |
| Reapuntar el ítem de menú existente | Crear un ítem nuevo | Evita duplicados y conserva la posición en el menú |
| Firma interactiva `Clics / Ventas` | Diagrama estático · animación automática | La interacción hace que el visitante vea el mecanismo; sin autoplay para no mover contenido sin intención |
| Barras sin cifras | Porcentajes ilustrativos | Cualquier número se lee como resultado; la posición y el largo bastan |
| Iconos de función, sin logos | Logos de plataformas | Evita leerse como badges de partner y depender de guías de marca de terceros |
| Sin nombrar al partner programático | Mencionarlo | La relación no está firmada; la decisión de oferta prohíbe comunicarla antes |
| Región "Qué cambió en 2026" con fecha y fuente | Omitirla · dejarla en el FAQ | Es la razón concreta para actuar ahora; con fecha visible no envejece en silencio |
| Rango de inversión obligatorio con "Prefiero no decirlo" | Omitirlo · pedir un monto | Define el nivel de servicio sin forzar un dato sensible |
| Tabla por tipo de proveedor | Nombrar competidores · omitir la comparación | La comparación es el argumento; nombrar empresas es riesgo legal |
| Sección de lo que no se promete | Omitirla | Sin casos autorizados, la honestidad verificable es la prueba disponible |
| Slot de caso condicional | Reusar los testimonios de la legacy sin revisar | Un caso sin autorización ni fuente es un claim no verificable |
| Nombres públicos en español mapeados 1:1 | Nombres en inglés del catálogo | El comprador lee en español; el mapeo evita que la página renombre servicios |
| Módulos semánticos | Widgets HTML page-scoped | El precedente de influencers perdió interactividad al compilar HTML |
| Verde sólo en la reunión | Verde en ambos CTAs | Una sola acción dominante por bloque |

Riesgos abiertos: dirección visual sin aprobar; copy sin validación de voz de cliente; segunda fuente de demanda
pendiente; estado real de Google Partners; soporte del renderer para selección múltiple, campos condicionales e iconos
por opción; targeting de GVC al host público; convivencia con el módulo base de `TASK-1860` si ambas se construyen a la
vez.

## Acceptance Checklist

- [ ] Dirección visual aprobada o reemplazada por un source versionado.
- [ ] Copy ledger aprobado, sin voseo, con los nombres públicos mapeados al catálogo.
- [ ] Un H1 con `performance marketing`; las dos cápsulas con 40 a 60 palabras.
- [ ] Firma que cambia de ganador al cambiar la señal, con rótulo ilustrativo y listas siempre en el DOM.
- [ ] Tabla de posición sin nombres de empresa y con nota visible.
- [ ] Ningún número sin fuente, contador, logo de plataforma ni badge de partner.
- [ ] Formulario con los estados ready, loading, empty, partial, error, denied y success verificados.
- [ ] Verde sólo en los CTAs de reunión.
- [ ] La URL legacy responde 301 a la nueva y el menú apunta a la nueva.
- [ ] Sin scroll horizontal en 1536, 1440, 890 y 390.
- [ ] Reduced motion y teclado verificados.
