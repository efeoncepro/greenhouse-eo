# TASK-1860 — Landing Trade Marketing & BTL — Wireframe

## Meta

- Status: `proposed — UI ready: no`. Dirección visual pendiente de aprobación del owner; copy en hipótesis.
- Owner task: `TASK-1860 — Landing pública Trade Marketing & BTL`
- Visual direction mode: `repo-native-benchmark`
- Product Design asset: `docs/ui/visual-directions/TASK-1860-landing-trade-marketing-btl-direction.md`
- Working route: `efeoncepro.com/servicios/trade-marketing/` — hipótesis hasta el Slice 1.
- Positioning: [PDR-021](../../public-site/decisions/PDR-021-landing-trade-marketing-btl-posicionamiento.md)
- SEO/AEO: [Channel & Commerce Landing SEO/AEO Brief V1](../../public-site/CHANNEL_COMMERCE_LANDING_SEO_AEO_BRIEF_V1.md)
- Catálogo de servicios (canon de nombres): [`docs/services/channel-commerce/README.md`](../../services/channel-commerce/README.md)
- Surface: WordPress/Ohio público + Elementor. No es el portal Greenhouse.
- Primitive decision: `reuse` de `ComparisonTable`, `LogoMarquee`/`greenhouse_social_trust`, `GrowthFormEmbed`,
  `GrowthFormEditorialBriefHost` y `NativeMeetingSchedulerHost`; `new` sólo para los módulos semánticos propios de
  la página en `eo-elementor-widgets`. No se crea un primitive transversal.
- Copy source: este copy ledger, validado con `copywriting` y `greenhouse-ux-content-accessibility`. En runtime, el
  copy vive en los settings de cada instancia Elementor, no en `src/lib/copy/*`.

## Brief

- **Usuario:** Trade Marketing Manager, Category Manager o Jefe de Trade de una marca que vende a través de
  terceros; el economic buyer es el Gerente Comercial.
- **Momento:** solution-aware. Ya tiene o conoce agencias de terreno y plataformas de ejecución. Llega por el
  término cabeza, por referral o por un enlace de prospección.
- **JTBD:** "Cuando invierto en canal y no sé qué pasó en la tienda, quiero ver dónde está roto y en qué orden
  arreglarlo, para reasignar el próximo peso con evidencia en vez de intuición."
- **Resultado perceptible:** entiende en el first fold que esto es trade marketing que prioriza, ejecuta y
  demuestra, y que tiene un siguiente paso proporcional.
- **Fricción que reduce:** comparar a ciegas entre software y agencias; formularios largos; promesas que no se
  pueden verificar.
- **No-goals:** guía editorial de trade, directorio de promotoras, precios, radiografía gratuita, formulario de
  procurement.

## Information architecture

Orden de lectura y trabajo de cada región. Ninguna región existe si no cumple su trabajo.

| # | Región | Trabajo | Pregunta del visitante que responde |
|---|---|---|---|
| R0 | Masthead Ohio | Navegación global | ¿Dónde estoy? |
| R1 | Hero | Declarar la categoría y la promesa | ¿Esto es para mí? |
| R2 | Definición | Responder la intención definicional y desambiguar | ¿Qué es exactamente? |
| R3 | Problema | Nombrar el dolor con sus tres fuentes | ¿Entienden mi problema? |
| R4 | Posición | Ubicar a Efeonce frente a las alternativas | ¿En qué se diferencian? |
| R5 | Ciclo | Mostrar el mecanismo | ¿Cómo lo hacen? |
| R6 | Firma: góndola leída | Hacer visible la priorización | ¿Qué recibo, en concreto? |
| R7 | Trade marketing | Oferta continua agrupada | ¿Qué me pueden resolver todo el año? |
| R8 | BTL | Oferta episódica agrupada | ¿Y en los momentos clave? |
| R9 | Conexión digital | El diferenciador | ¿Por qué ustedes y no otro? |
| R10 | Responsabilidad y límites | Responsable único + lo que no se promete | ¿Puedo confiar? |
| R11 | Qué recibes + marcas | Prueba de método y confianza de empresa | ¿Esto es real? |
| R12 | FAQ | Objeciones | ¿Y si…? |
| R13 | Conversión | Brief + reunión | ¿Cómo empiezo? |
| R14 | Divulgación | Rótulo de ilustrativos | ¿Esto es un caso real? |
| R15 | Footer Ohio | Navegación global | — |
| D | Dock de conversión | CTA persistente entre R2 y R13 | ¿Dónde agendo? |

## Layout skeleton

| Región | Widget / primitive | `data-capture` | Anchor | CTA |
|---|---|---|---|---|
| R1 Hero | `greenhouse_channel_hero` | `channel-hero` | `#inicio` | Reunión (primario) · Brief (secundario) |
| R2 Definición | `greenhouse_channel_definition` | `channel-definition` | `#que-es` | — |
| R3 Problema | `greenhouse_channel_problem` | `channel-problem` | `#problema` | — |
| R4 Posición | `greenhouse_comparison_table` (reuse) | `channel-position` | `#posicion` | — |
| R5 Ciclo | `greenhouse_channel_cycle` | `channel-cycle` | `#ciclo` | — |
| R6 Firma | `greenhouse_channel_xray` | `channel-xray` | `#gondola` | — |
| R7 Trade | `greenhouse_channel_trade` | `channel-trade` | `#trade-marketing` | Brief (enlace secundario) |
| R8 BTL | `greenhouse_channel_btl` | `channel-btl` | `#btl` | Brief (enlace secundario) |
| R9 Conexión digital | `greenhouse_channel_digital` | `channel-digital` | `#digital` | Enlaces internos |
| R10 Responsabilidad | `greenhouse_channel_operating` | `channel-operating` | `#como-trabajamos` | — |
| R11 Prueba | `greenhouse_channel_proof` + `greenhouse_social_trust` (reuse) | `channel-proof` | `#que-recibes` | — |
| R12 FAQ | `greenhouse_channel_faq` | `channel-faq` | `#preguntas` | — |
| R13 Conversión | `greenhouse_channel_conversion` → `greenhouse_growth_form` + Growth CTA | `channel-conversion` | `#conversion` | Brief (submit) · Reunión |
| R14 Divulgación | dentro de `greenhouse_channel_conversion` | `channel-disclosure` | — | — |
| D Dock | dentro de `greenhouse_channel_conversion` | `channel-dock` | — | Reunión · Brief |

## Especificación por región

### R1 — Hero

- **Desktop:** dos columnas 7/5. Izquierda: eyebrow, H1, cuerpo, fila de CTAs, micro-línea. Derecha: góndola
  anotada con los puntos 1, 2 y 3 visibles. Separación mínima de 28 px bajo el masthead Ohio.
- **Mobile:** una columna; CTAs antes de la ilustración; la góndola muestra los puntos 1 y 2.
- **Contenido:** `hero.eyebrow`, `hero.title`, `hero.body`, `hero.primaryCta`, `hero.secondaryCta`,
  `hero.microline`, `hero.illustrationAlt`.
- **Regla:** ninguna cifra en el hero. La ilustración no contiene texto.

### R2 — Definición

- **Desktop:** banda de papel de una columna de lectura (~720 px) con H2 como pregunta, cápsula de 40–60 palabras
  y una segunda cápsula corta de trade vs BTL. Debajo, la línea de desvío de empleo, sólo si existe la página de
  vacantes.
- **Mobile:** igual, a ancho completo con márgenes de 20 px.
- **Contenido:** `definition.title`, `definition.capsule`, `definition.btlTitle`, `definition.btlCapsule`,
  `definition.jobsDeflection`.
- **Regla:** es la mejor definición del SERP, pero ocupa una sola banda. No se convierte en guía.

### R3 — Problema

- **Desktop:** H2 + tres columnas, cada una con icono, nombre de la fuente y una oración: sell-in, sell-out,
  ejecución. Cierre de una oración a ancho completo. Sub-bloque "Por qué ahora" con el dato laboral y su fuente.
- **Mobile:** las tres fuentes apiladas con divisores; el sub-bloque al final.
- **Contenido:** `problem.title`, `problem.sellIn.*`, `problem.sellOut.*`, `problem.execution.*`,
  `problem.close`, `problem.whyNow.title`, `problem.whyNow.body`, `problem.whyNow.source`.
- **Regla:** el dato laboral lleva fuente y fecha visibles; si no se puede sostener al publicar, se elimina el
  sub-bloque completo, no se deja sin fuente.

### R4 — Posición

- **Desktop:** H2 + tabla `ComparisonTable` de tres columnas —Plataforma de ejecución, Agencia de terreno,
  Efeonce— y seis filas. La columna Efeonce se enfatiza con superficie, no con verde. Nota al pie visible.
- **Mobile:** modo card del primitive: una tarjeta por fila con los tres valores etiquetados.
- **Contenido:** `position.title`, `position.intro`, `position.columns.*`, `position.rows.*`,
  `position.footnote`.
- **Semántica de celdas:** icono **y** texto —`Sí`, `No`, `En parte`—; nunca sólo un check de color.
- **Regla:** nunca un nombre de empresa. La nota al pie declara que la comparación es por tipo de proveedor.

### R5 — Ciclo

- **Desktop:** plano Midnight. H2 + cinco pasos en una fila numerada —Estándar, Cobertura, Priorización,
  Intervención, Lectura— con una flecha de retorno de Lectura a Estándar. Nota final de validación.
- **Mobile:** cinco pasos en lista vertical numerada; la flecha de retorno se expresa como texto.
- **Contenido:** `cycle.title`, `cycle.intro`, `cycle.steps[1..5].name`, `cycle.steps[1..5].body`, `cycle.note`.
- **Regla:** el ciclo es una lista ordenada semántica (`<ol>`), no un diagrama sin texto.

### R6 — Firma: góndola leída

- **Desktop:** plano Midnight. Dos columnas 7/5: izquierda la góndola grande con seis puntos de lectura
  numerados; derecha la lista priorizada del ciclo con tres ítems y chips de impacto y costo. Al activar un punto
  se muestra su descripción en un panel anclado, no en un tooltip de hover.
- **Mobile:** la góndola arriba con los seis puntos; debajo, la lista de los seis puntos con su descripción
  siempre visible, y luego la lista priorizada.
- **Contenido:** `xray.title`, `xray.body`, `xray.points[1..6].name`, `xray.points[1..6].question`,
  `xray.listTitle`, `xray.list[1..3].item`, `xray.list[1..3].impact`, `xray.list[1..3].cost`, `xray.label`.
- **Regla:** rótulo "Ejemplo ilustrativo" visible sin interacción. Los chips son cualitativos —alto, medio,
  bajo—, nunca cifras.

### R7 — Trade marketing

- **Desktop:** H2 con el nombre de la familia + intro. Cuatro grupos en una retícula de dos por dos: Entender,
  Medir cada ciclo, Corregir, Conectar con lo digital. Cada grupo: H3, una línea, y lista de sus servicios con
  nombre canónico y una oración. Enlace secundario al brief al pie.
- **Mobile:** grupos apilados; servicios como lista compacta.
- **Contenido:** `trade.title`, `trade.intro`, `trade.groups[1..4].name`, `trade.groups[1..4].line`,
  `trade.services.T1..T13.name`, `trade.services.T1..T13.body`, `trade.cta`.
- **Regla:** los 13 servicios están en el HTML inicial. No hay tarjeta por servicio ni acordeón que los esconda.

### R8 — BTL

- **Desktop:** misma anatomía que R7 con tres grupos en tres columnas: En la tienda, Fuera de la tienda, En
  eventos. Principio de medición destacado antes de los grupos. Línea transversal de contenido al final.
- **Mobile:** grupos apilados.
- **Contenido:** `btl.title`, `btl.intro`, `btl.principle`, `btl.groups[1..3].name`, `btl.services.B1..B9.name`,
  `btl.services.B1..B9.body`, `btl.transversal`, `btl.cta`.

### R9 — Conexión digital

- **Desktop:** H2 + cuerpo + tres bloques —Retail media de la cadena, Anaquel digital, Visibilidad en IA— unidos
  por una línea que parte en la góndola. Cada bloque enlaza a su página hermana por función.
- **Mobile:** tres bloques apilados; la línea se omite.
- **Contenido:** `digital.title`, `digital.body`, `digital.items[1..3].name`, `digital.items[1..3].body`,
  `digital.items[1..3].link`.

### R10 — Responsabilidad y límites

- **Desktop:** dos columnas. Izquierda "Un solo responsable" con cuatro compromisos. Derecha "Lo que no te vamos
  a prometer" con tres límites. Superficie de papel; los límites no usan rojo.
- **Mobile:** apiladas, responsabilidad primero.
- **Contenido:** `operating.title`, `operating.items[1..4]`, `operating.notPromised.title`,
  `operating.notPromised.items[1..3]`.
- **Regla:** no se menciona cómo se estructura la ejecución ni la existencia de proveedores.

### R11 — Qué recibes y marcas

- **Desktop:** H2 + cuatro entregables del ciclo en una fila, luego el carrusel de marcas con su rótulo de
  empresa.
- **Mobile:** entregables en lista; carrusel a ancho completo.
- **Contenido:** `proof.title`, `proof.items[1..4].name`, `proof.items[1..4].body`, `proof.trustLabel`.
- **Regla:** el carrusel no lleva texto de trade adyacente. Sin testimonios ni cifras de clientes.

### R12 — FAQ

- **Desktop:** intro sticky a la izquierda sobre 900 px, acordeón nativo a la derecha. A 900 px o menos, una
  columna, intro estática y 28 px de separación.
- **Contenido:** `faq.title`, `faq.intro`, `faq.intro`, `faq.{1..9}.q`, `faq.{1..9}.a`.
- **Regla:** `<details>`/`<summary>`; cada respuesta visible en HTML para el schema.

### R13 — Conversión

- **Desktop:** plano Midnight. Dos columnas desde 761 px: intro sticky a 32 px a la izquierda; a la derecha la
  tarjeta editorial premium del brief y, fuera de la tarjeta, el bloque de reunión.
- **Mobile (≤760 px):** una columna estática: intro, tarjeta del brief, bloque de reunión.
- **Formulario `efeonce-channel-commerce-brief`:**

| # | Campo | Tipo | Req. | Autocomplete | Icono | Opciones |
|---|---|---|---|---|---|---|
| 1 | Nombre | text | sí | `name` | `ti-user` | — |
| 2 | Correo de trabajo | email | sí | `email` | `ti-mail` | gate de correo corporativo |
| 3 | Empresa | text | sí | `organization` | `ti-building` | — |
| 4 | Categoría | select premium | sí | — | `ti-category` | Alimentos y bebidas · Ferretería y mejoramiento del hogar · Cuidado personal y limpieza · Salud y farma OTC · Mascotas · Bebidas alcohólicas · Otra categoría |
| 5 | Canal principal | select premium | sí | — | `ti-building-store` | Supermercados · Canal tradicional y almacenes · Ferreterías · Farmacias · Tiendas de conveniencia · E-commerce y marketplaces · Varios canales |
| 6 | Qué necesitas resolver | select premium | sí | — | `ti-target` | Entender qué pasa en la tienda · Medir la ejecución cada ciclo · Corregir las tiendas críticas · Activar un lanzamiento o una promoción · Organizar un evento o una feria · Conectar la góndola con retail media · Todavía no lo tengo claro |
| 7 | Cobertura aproximada | select premium | no | — | `ti-map-pin` | Menos de 50 · Entre 50 y 200 · Entre 200 y 1.000 · Más de 1.000 · No lo sé (unidad en el helper) |
| 8 | Contexto | textarea, 500 caracteres | no | — | `ti-message` | — |

  + consentimiento, Turnstile invisible, retención `730d`, destino `greenhouse_only` inicial.
  **[verificar]** que el renderer soporte `ti-*` como metadata de opción o mantener iconos sólo en labels.

- **Bloque de reunión:** título, una línea y Growth CTA `channel-commerce-discovery-meeting`.
- **Contenido:** `conversion.title`, `conversion.body`, `form.overline`, `form.title`, `form.helper`,
  `form.badge`, `form.trust[1..2]`, `form.fields.*`, `form.submit`, `form.privacyLink`, `meeting.title`,
  `meeting.body`, `meeting.cta`.

### R14 — Divulgación

- Franja full-bleed con texto alineado a la retícula, entre la conversión y el footer.
- **Contenido:** `disclosure.body`.

### D — Dock de conversión

- Aparece al salir del hero y desaparece al entrar a R13 o al footer. Superficie Midnight contenida, máximo
  1120 px, safe-area, reunión con relleno verde y brief transparente con contorno.
- `inert` y fuera del tab order mientras está oculto.
- **Contenido:** `dock.primary`, `dock.secondary`.

## Desktop Target

1440×1000. El first fold contiene R1 completo y el arranque de R2. Orden de lectura: eyebrow → H1 → cuerpo →
CTA de reunión → CTA de brief → micro-línea → góndola. El H1 no supera dos líneas; el cuerpo, tres. Ninguna tabla,
carrusel o video en el fold. La góndola ocupa cinco de doce columnas y muestra tres puntos de lectura. Validación
adicional en 1536×911 y 890×911, porque son los anchos donde los precedentes del sitio mostraron regresiones de
sticky y de columnas.

## Mobile Target

390×844. El first fold contiene eyebrow, H1 en ≤4 líneas, cuerpo en ≤5, el CTA de reunión a ancho completo y el
enlace de brief de 44 px. La góndola queda inmediatamente debajo con dos puntos. Todas las retículas colapsan a
una columna; la tabla de posición pasa a modo card; el FAQ y la conversión quedan estáticos. Sin scroll horizontal
de página.

## Action Hierarchy

| Nivel | Acción | Dónde aparece | Tratamiento |
|---|---|---|---|
| 1 | `Agenda una reunión` | Hero, conversión, dock | **Único relleno verde de la página** |
| 2 | `Cuéntanos tu canal` | Hero, trade, BTL, dock | Secundario transparente con contorno; lleva a `#conversion` y enfoca el primer campo |
| 3 | `Enviar mi brief` | Dentro del form | Azul Efeonce `primary`, texto blanco, ancho completo |
| 4 | Enlaces internos | Conexión digital, definición | Texto con subrayado y nombre por función |
| 5 | Abrir punto de lectura | Firma | Botón circular numerado; no compite con los CTAs |

Nunca dos acciones con relleno en el mismo bloque.

## Visual Fidelity Mapping

| Intención de la dirección | Implementación | Cómo se verifica |
|---|---|---|
| Góndola protagonista | Ilustración propia, 5 de 12 columnas en hero y 7 de 12 en firma | Captura de first fold y de `channel-xray` |
| Verde exclusivo del CTA de reunión | Sólo tres instancias del CTA primario | Conteo de elementos con el rol verde = 3 |
| Posición en el medio | `ComparisonTable` con columna Efeonce enfatizada por superficie | Captura de `channel-position` en desktop y en modo card |
| Mecanismo visible | Ciclo como `<ol>` + firma con lista priorizada siempre en DOM | Aserción de `<ol>` en `channel-cycle` y `channel-xray` |
| Sin cifras inventadas | Chips cualitativos | Aserción: ningún número en `channel-xray` salvo la numeración de puntos |
| Planos Midnight sólo en mecanismo, firma, conversión y dock | Variante de fondo por widget | Revisión de capturas por región |
| Tipografía del sistema | Poppins 700 display, Geist 400/600 | Computed style de H1, H2, body y CTA |

## Copy Ledger

Revisado con `copywriting` y `greenhouse-ux-writing` el 2026-09-10 (ver **Copy Review 2026-09-10**). Sigue siendo
**hipótesis** hasta el Slice 2: falta voice of customer primario y revisión legal. Tuteo neutro, sin voseo. Los
nombres de servicio son canon del catálogo y no se editan aquí. Las celdas de la tabla de posición son **claims** y
pasan por revisión legal antes de publicar.

| ID | String |
|---|---|
| `channelCommerce.landing.hero.eyebrow` | Trade marketing y BTL |
| `channelCommerce.landing.hero.title` | Trade marketing que te dice qué corregir primero. Y lo corrige. |
| `channelCommerce.landing.hero.body` | Revisamos tu ejecución tienda por tienda y corregimos primero lo que más pesa en tu venta. Cada hallazgo con su foto, cruzado con lo que inviertes en la red de medios de cada cadena. |
| `channelCommerce.landing.hero.primaryCta` | Agenda una reunión |
| `channelCommerce.landing.hero.secondaryCta` | Cuéntanos tu canal |
| `channelCommerce.landing.hero.microline` | Chile · Canal moderno y tradicional · Un solo responsable |
| `channelCommerce.landing.hero.illustrationAlt` | Ilustración de una góndola de supermercado con puntos numerados que señalan qué se revisa en cada tienda. |
| `channelCommerce.landing.definition.title` | ¿Qué es el trade marketing? |
| `channelCommerce.landing.definition.capsule` | El trade marketing es la disciplina que asegura que tu producto esté disponible, visible y bien ejecutado donde el comprador decide: la góndola del supermercado, la farmacia, el almacén o la ficha de un retailer. Abarca surtido, precio, exhibición, material, promociones y activaciones, y se mide por cómo se ejecuta en cada punto de venta. |
| `channelCommerce.landing.definition.btlTitle` | ¿Y en qué se diferencia del BTL? |
| `channelCommerce.landing.definition.btlCapsule` | El BTL agrupa las acciones que ocurren en momentos puntuales: una degustación, una activación en sala, un roadshow, un pop-up o una feria. El trade marketing sostiene la ejecución todo el año; el BTL la acelera cuando importa. |
| `channelCommerce.landing.definition.jobsDeflection` | ¿Buscas trabajar en trade marketing? Revisa nuestras vacantes. |
| `channelCommerce.landing.problem.title` | Sabes lo que le vendes al distribuidor. No sabes qué pasó en la góndola. |
| `channelCommerce.landing.problem.sellIn.name` | Lo que le vendes al canal |
| `channelCommerce.landing.problem.sellIn.body` | Vive en tu ERP y llega a tiempo. Es la única parte que controlas. |
| `channelCommerce.landing.problem.sellOut.name` | Lo que compra la gente |
| `channelCommerce.landing.problem.sellOut.body` | Llega en planillas de cada cadena y distribuidor, cada una con su formato y su atraso. |
| `channelCommerce.landing.problem.execution.name` | Lo que pasó en la góndola |
| `channelCommerce.landing.problem.execution.body` | Te llega en otro reporte, que describe lo que pasó pero no te dice qué corregir primero. |
| `channelCommerce.landing.problem.close` | Con tres reportes que no se cruzan, cuando la venta cae en una cadena no hay cómo saber si fue quiebre, precio o ejecución. Y la próxima inversión se decide a ojo. |
| `channelCommerce.landing.problem.whyNow.title` | Por qué ahora |
| `channelCommerce.landing.problem.whyNow.body` | Desde el 26 de abril de 2026 la jornada laboral en Chile es de 42 horas, y en 2028 bajará a 40, sin reducción de sueldo. El costo por hora de cada visita a tienda sube por ley, y cada visita tiene que justificarse. |
| `channelCommerce.landing.problem.whyNow.source` | Fuente: Ley 21.561. |
| `channelCommerce.landing.position.title` | Ni un tablero más ni otro equipo de terreno |
| `channelCommerce.landing.position.intro` | Una plataforma te avisa qué está mal. Una agencia va a la tienda. Falta quien responda por las dos cosas. |
| `channelCommerce.landing.position.caption` | Qué hace cada tipo de proveedor de trade marketing |
| `channelCommerce.landing.position.columns.platform` | Una plataforma de ejecución |
| `channelCommerce.landing.position.columns.agency` | Una agencia de terreno |
| `channelCommerce.landing.position.columns.efeonce` | Efeonce |
| `channelCommerce.landing.position.rows.detect` | Detecta problemas de ejecución |
| `channelCommerce.landing.position.cells.detect` | Plataforma: Sí · Agencia: En parte · Efeonce: Sí |
| `channelCommerce.landing.position.rows.prioritize` | Ordena qué corregir primero |
| `channelCommerce.landing.position.cells.prioritize` | Plataforma: Sí · Agencia: En parte · Efeonce: Sí |
| `channelCommerce.landing.position.rows.execute` | Corrige en la tienda |
| `channelCommerce.landing.position.cells.execute` | Plataforma: No · Agencia: Sí · Efeonce: Sí |
| `channelCommerce.landing.position.rows.prove` | Demuestra el antes y el después |
| `channelCommerce.landing.position.cells.prove` | Plataforma: En parte · Agencia: En parte · Efeonce: Sí |
| `channelCommerce.landing.position.rows.digital` | Lo cruza con la red de medios de cada cadena |
| `channelCommerce.landing.position.cells.digital` | Plataforma: No · Agencia: No · Efeonce: Sí |
| `channelCommerce.landing.position.rows.owner` | Responde por el resultado |
| `channelCommerce.landing.position.cells.owner` | Plataforma: No · Agencia: En parte · Efeonce: Sí |
| `channelCommerce.landing.position.cellValues` | Sí · No · En parte |
| `channelCommerce.landing.position.footnote` | Comparación por tipo de proveedor, no por empresa. Cada caso es distinto. |
| `channelCommerce.landing.cycle.title` | Un ciclo que empieza donde terminó el anterior |
| `channelCommerce.landing.cycle.intro` | Cinco pasos. El último alimenta al primero. |
| `channelCommerce.landing.cycle.steps.1.name` | Estándar |
| `channelCommerce.landing.cycle.steps.1.body` | Definimos cómo debe verse tu categoría en la góndola, por canal y formato. |
| `channelCommerce.landing.cycle.steps.2.name` | Cobertura |
| `channelCommerce.landing.cycle.steps.2.body` | Revisamos los puntos de venta del ciclo, con foto de cada hallazgo. |
| `channelCommerce.landing.cycle.steps.3.name` | Priorización |
| `channelCommerce.landing.cycle.steps.3.body` | Ordenamos lo que está mal por impacto en tu venta y costo de corregirlo. |
| `channelCommerce.landing.cycle.steps.4.name` | Intervención |
| `channelCommerce.landing.cycle.steps.4.body` | Corregimos en tienda donde la evidencia lo justifica. |
| `channelCommerce.landing.cycle.steps.5.name` | Lectura |
| `channelCommerce.landing.cycle.steps.5.body` | Comparamos con el ciclo anterior y ajustamos el estándar del siguiente. |
| `channelCommerce.landing.cycle.note` | Un dato que no validamos no llega a tu reporte. |
| `channelCommerce.landing.xray.title` | Así se lee una góndola |
| `channelCommerce.landing.xray.body` | Seis cosas se revisan en cada tienda. Lo que importa es qué haces con ellas. |
| `channelCommerce.landing.xray.points.1.name` | Disponibilidad |
| `channelCommerce.landing.xray.points.1.question` | ¿Está tu producto o hay quiebre? |
| `channelCommerce.landing.xray.points.2.name` | Precio |
| `channelCommerce.landing.xray.points.2.question` | ¿Coincide con tu precio de referencia? |
| `channelCommerce.landing.xray.points.3.name` | Frentes |
| `channelCommerce.landing.xray.points.3.question` | ¿Cuánto espacio ocupas en tu categoría? |
| `channelCommerce.landing.xray.points.4.name` | Material |
| `channelCommerce.landing.xray.points.4.question` | ¿Está instalado y se ve? |
| `channelCommerce.landing.xray.points.5.name` | Exhibición adicional |
| `channelCommerce.landing.xray.points.5.question` | ¿La cabecera o la isla que pagaste sigue ahí? |
| `channelCommerce.landing.xray.points.6.name` | Competencia |
| `channelCommerce.landing.xray.points.6.question` | ¿Qué está haciendo la marca de al lado? |
| `channelCommerce.landing.xray.listTitle` | Qué corregir primero en este ciclo |
| `channelCommerce.landing.xray.chip.impact` | Impacto |
| `channelCommerce.landing.xray.chip.cost` | Costo |
| `channelCommerce.landing.xray.list.1.item` | Quiebre del producto foco en tiendas de alta rotación |
| `channelCommerce.landing.xray.list.1.impact` | Alto |
| `channelCommerce.landing.xray.list.1.cost` | Bajo |
| `channelCommerce.landing.xray.list.2.item` | Cabecera pagada que ya no está instalada |
| `channelCommerce.landing.xray.list.2.impact` | Alto |
| `channelCommerce.landing.xray.list.2.cost` | Medio |
| `channelCommerce.landing.xray.list.3.item` | Precio distinto al de referencia en una cadena |
| `channelCommerce.landing.xray.list.3.impact` | Medio |
| `channelCommerce.landing.xray.list.3.cost` | Bajo |
| `channelCommerce.landing.xray.label` | Ejemplo ilustrativo. No corresponde a un cliente. |
| `channelCommerce.landing.trade.title` | Trade marketing |
| `channelCommerce.landing.trade.intro` | Lo que pasa en la góndola todo el año. |
| `channelCommerce.landing.trade.groups.understand.name` | Entender |
| `channelCommerce.landing.trade.groups.understand.line` | Antes de invertir o de medir. |
| `channelCommerce.landing.trade.groups.measure.name` | Medir cada ciclo |
| `channelCommerce.landing.trade.groups.measure.line` | Siempre contra el mismo estándar. |
| `channelCommerce.landing.trade.groups.correct.name` | Corregir |
| `channelCommerce.landing.trade.groups.correct.line` | Donde la evidencia lo justifica. |
| `channelCommerce.landing.trade.groups.connect.name` | Conectar con lo digital |
| `channelCommerce.landing.trade.groups.connect.line` | La góndola y la inversión digital, en el mismo reporte. |
| `channelCommerce.landing.trade.services.T1.name` | Diagnóstico de Ejecución de Canal |
| `channelCommerce.landing.trade.services.T1.body` | Qué se puede medir de tu canal, qué está mal hoy en una muestra real y en qué orden corregirlo. |
| `channelCommerce.landing.trade.services.T2.name` | Auditoría de Inversión de Canal |
| `channelCommerce.landing.trade.services.T2.body` | Qué parte de tu presupuesto de canal no tiene cómo demostrar retorno. |
| `channelCommerce.landing.trade.services.T9.name` | Estándar de Tienda Perfecta |
| `channelCommerce.landing.trade.services.T9.body` | Qué significa bien ejecutado en tu categoría, por canal y formato, antes de salir a medir. |
| `channelCommerce.landing.trade.services.T10.name` | Arquitectura de Distribución y Cobertura |
| `channelCommerce.landing.trade.services.T10.body` | Dónde estás, dónde no estás y qué vale cada punto de venta que falta. |
| `channelCommerce.landing.trade.services.T3.name` | Cobertura Auditada |
| `channelCommerce.landing.trade.services.T3.body` | El estado de cada tienda y la lista de qué corregir primero, cada ciclo. |
| `channelCommerce.landing.trade.services.T5.name` | Orquestación de Terreno |
| `channelCommerce.landing.trade.services.T5.body` | Tus proveedores actuales, medidos contra el mismo estándar y en un solo reporte. |
| `channelCommerce.landing.trade.services.T11.name` | Integración de Datos de Canal |
| `channelCommerce.landing.trade.services.T11.body` | Lo que vendes, lo que se vendió y lo que pasó en la góndola, leídos en un solo lugar. |
| `channelCommerce.landing.trade.services.T4.name` | Equipo de Terreno Gestionado |
| `channelCommerce.landing.trade.services.T4.body` | Las tiendas críticas corregidas, con foto del antes y el después. |
| `channelCommerce.landing.trade.services.T8.name` | Diseño y Medición de Promociones |
| `channelCommerce.landing.trade.services.T8.body` | Si la promoción vendió de más o sólo adelantó compras y se comió el margen. |
| `channelCommerce.landing.trade.services.T12.name` | Capacitación de Fuerza de Venta del Canal |
| `channelCommerce.landing.trade.services.T12.body` | Que quien vende tu producto sin trabajar para ti sepa venderlo, y que se note en su tienda. |
| `channelCommerce.landing.trade.services.T13.name` | Gestión de Categoría |
| `channelCommerce.landing.trade.services.T13.body` | Una propuesta de cómo ordenar tu categoría completa, en el idioma del comprador de la cadena. |
| `channelCommerce.landing.trade.services.T6.name` | Anaquel Digital y Visibilidad en IA |
| `channelCommerce.landing.trade.services.T6.body` | Cómo se ve tu producto en la ficha de cada retailer y si los asistentes de IA lo recomiendan. |
| `channelCommerce.landing.trade.services.T7.name` | Retail Media y Commerce |
| `channelCommerce.landing.trade.services.T7.body` | Tu inversión en la red de medios de cada cadena, leída junto a lo que pasa en sus tiendas. |
| `channelCommerce.landing.trade.cta` | Cuéntanos tu canal |
| `channelCommerce.landing.btl.title` | BTL |
| `channelCommerce.landing.btl.intro` | Lo que pasa en los momentos que importan. |
| `channelCommerce.landing.btl.principle` | Cada activación sale a terreno con su medición ya definida. |
| `channelCommerce.landing.btl.groups.inStore.name` | En la tienda |
| `channelCommerce.landing.btl.groups.outside.name` | Fuera de la tienda |
| `channelCommerce.landing.btl.groups.events.name` | En eventos |
| `channelCommerce.landing.btl.services.B1.name` | Activaciones en Sala Medidas |
| `channelCommerce.landing.btl.services.B1.body` | Degustación, demo o sampling en tienda, comparado contra tiendas donde no se activó. |
| `channelCommerce.landing.btl.services.B2.name` | Promotoría e Impulso |
| `channelCommerce.landing.btl.services.B2.body` | Venta asistida en tienda, medida en conversión y no en horas cubiertas. |
| `channelCommerce.landing.btl.services.B3.name` | Visual Merchandising y Exhibiciones Adicionales |
| `channelCommerce.landing.btl.services.B3.body` | Exhibiciones bien instaladas y verificadas mientras dura lo que pagaste. |
| `channelCommerce.landing.btl.services.B4.name` | Roadshow y Tour de Marca |
| `channelCommerce.landing.btl.services.B4.body` | Una gira leída ciudad por ciudad, para saber dónde volver. |
| `channelCommerce.landing.btl.services.B5.name` | Street Marketing y Sampling Masivo |
| `channelCommerce.landing.btl.services.B5.body` | Entrega masiva fuera de la tienda, con registro de dónde, cuándo y a quién. |
| `channelCommerce.landing.btl.services.B6.name` | Pop-up y Espacios Efímeros |
| `channelCommerce.landing.btl.services.B6.body` | Un espacio temporal con objetivo comercial y métrica acordada antes de abrir. |
| `channelCommerce.landing.btl.services.B7.name` | Activación de Patrocinios |
| `channelCommerce.landing.btl.services.B7.body` | Que el patrocinio que ya pagaste rinda más que un logo, empezando por los derechos que no estás usando. |
| `channelCommerce.landing.btl.services.B8.name` | Ferias y Exposiciones |
| `channelCommerce.landing.btl.services.B8.body` | Que la feria termine en oportunidades de venta y no en una caja de tarjetas. |
| `channelCommerce.landing.btl.services.B9.name` | Encuentros de Canal |
| `channelCommerce.landing.btl.services.B9.body` | La convención de distribuidores o el lanzamiento a tu fuerza de venta, con compromisos y seguimiento. |
| `channelCommerce.landing.btl.transversal` | Contenido y Material de Canal: fichas, catálogos, contenido para cada retailer y kits para distribuidores, producidos como sistema y no campaña por campaña. |
| `channelCommerce.landing.btl.cta` | Cuéntanos tu canal |
| `channelCommerce.landing.digital.title` | Tu góndola y tu inversión digital, en el mismo reporte |
| `channelCommerce.landing.digital.body` | Si inviertes en la red de medios de una cadena, tiene sentido saber qué pasaba en su góndola esa misma semana. Cruzamos las dos cosas. |
| `channelCommerce.landing.digital.items.retailMedia.name` | Red de medios de la cadena |
| `channelCommerce.landing.digital.items.retailMedia.body` | Lo que inviertes en sus pantallas y su sitio, leído con lo que pasa en sus tiendas. |
| `channelCommerce.landing.digital.items.retailMedia.link` | Cómo gestionamos paid media y retail media |
| `channelCommerce.landing.digital.items.shelf.name` | Anaquel digital |
| `channelCommerce.landing.digital.items.shelf.body` | Cómo se ve tu producto en la ficha de cada retailer. |
| `channelCommerce.landing.digital.items.shelf.link` | Cómo trabajamos el posicionamiento SEO |
| `channelCommerce.landing.digital.items.ai.name` | Visibilidad en IA |
| `channelCommerce.landing.digital.items.ai.body` | Si los asistentes de IA recomiendan tu producto cuando alguien pregunta por tu categoría. |
| `channelCommerce.landing.digital.items.ai.link` | Cómo trabajamos la visibilidad en IA |
| `channelCommerce.landing.operating.title` | Un solo responsable |
| `channelCommerce.landing.operating.items.1` | Definimos el plan del ciclo y el estándar contra el que se mide. |
| `channelCommerce.landing.operating.items.2` | Dirigimos la operación en terreno. |
| `channelCommerce.landing.operating.items.3` | Validamos cada dato antes de mostrártelo. |
| `channelCommerce.landing.operating.items.4` | Respondemos si algo falla. |
| `channelCommerce.landing.operating.notPromised.title` | Lo que no te vamos a prometer |
| `channelCommerce.landing.operating.notPromised.1` | Que suba tu venta. Depende de tu precio, tu surtido, tu negociación con la cadena y la demanda. Lo que sí hacemos es mostrarte qué está mal y corregirlo. |
| `channelCommerce.landing.operating.notPromised.2` | Cobertura nacional antes de armar el plan de tu cuenta. |
| `channelCommerce.landing.operating.notPromised.3` | Datos que no medimos. Si no llegamos a una tienda, aparece como no medida. |
| `channelCommerce.landing.proof.title` | Qué recibes en cada ciclo |
| `channelCommerce.landing.proof.items.1` | Un puntaje por tienda y por cadena, que siempre dice sobre cuántas tiendas se calculó. |
| `channelCommerce.landing.proof.items.2` | La lista de qué corregir primero, ordenada por impacto y costo. |
| `channelCommerce.landing.proof.items.3` | Una foto de cada hallazgo, con su tienda y su fecha. |
| `channelCommerce.landing.proof.items.4` | La lectura del ciclo, con lo que conviene ajustar en el siguiente. |
| `channelCommerce.landing.proof.trustLabel` | Marcas que confían en Efeonce |
| `channelCommerce.landing.faq.title` | Preguntas frecuentes |
| `channelCommerce.landing.faq.intro` | Lo que suele preguntar un equipo de trade antes de empezar. |
| `channelCommerce.landing.faq.1.q` | ¿Qué es el trade marketing? |
| `channelCommerce.landing.faq.1.a` | (reutiliza definition.capsule) |
| `channelCommerce.landing.faq.2.q` | ¿Qué diferencia hay entre trade marketing y BTL? |
| `channelCommerce.landing.faq.2.a` | (reutiliza definition.btlCapsule) |
| `channelCommerce.landing.faq.3.q` | ¿Trabajan con la agencia de terreno que ya tengo? |
| `channelCommerce.landing.faq.3.a` | Sí. Ponemos a tus proveedores actuales a medir contra el mismo estándar y consolidamos su información, sin reemplazarlos. |
| `channelCommerce.landing.faq.4.q` | Ya uso una plataforma de ejecución. ¿Me sirve igual? |
| `channelCommerce.landing.faq.4.a` | Sí. Tomamos sus alertas, las ordenamos con criterio de negocio, corregimos en tienda y cerramos el ciclo. Aprovechas lo que ya pagaste. |
| `channelCommerce.landing.faq.5.q` | ¿Esto reemplaza el reporte que armo cada mes? |
| `channelCommerce.landing.faq.5.a` | Te lo entrega armado: el puntaje de cada tienda, la lista de qué corregir y la foto de cada hallazgo, listos para tu reunión de ciclo. |
| `channelCommerce.landing.faq.6.q` | ¿Garantizan que va a subir la venta? |
| `channelCommerce.landing.faq.6.a` | No. La venta depende de tu precio, tu surtido, tu negociación con la cadena y la demanda. Lo que sí hacemos es mostrarte qué está mal, corregirlo y demostrar que quedó corregido. |
| `channelCommerce.landing.faq.7.q` | ¿En qué canales y zonas trabajan? |
| `channelCommerce.landing.faq.7.a` | En Chile, en supermercados y canal tradicional, ferreterías, farmacias, tiendas de conveniencia y e-commerce. La cobertura de cada cuenta se define en su plan. |
| `channelCommerce.landing.faq.8.q` | ¿Cómo se cobra? |
| `channelCommerce.landing.faq.8.a` | El diagnóstico tiene precio cerrado. La cobertura se cobra por puntos de venta revisados en cada ciclo y la corrección en tienda, por capacidad mensual. Nunca por hora ni como porcentaje de tu inversión. |
| `channelCommerce.landing.faq.9.q` | ¿Qué necesitan de nosotros para empezar? |
| `channelCommerce.landing.faq.9.a` | Tu surtido objetivo, el precio de referencia, el planograma si existe, las autorizaciones de las cadenas y una persona responsable de tu lado. |
| `channelCommerce.landing.conversion.title` | Cuéntanos tu canal y te decimos por dónde empezar |
| `channelCommerce.landing.conversion.body` | Con lo esencial te proponemos un primer paso y lo que necesitamos revisar. |
| `channelCommerce.landing.form.overline` | Brief de canal |
| `channelCommerce.landing.form.title` | Cuéntanos lo esencial |
| `channelCommerce.landing.form.helper` | Seis datos obligatorios. Los dos opcionales nos ayudan a llegar mejor preparados. |
| `channelCommerce.landing.form.badge` | 2 minutos |
| `channelCommerce.landing.form.trust.1` | Datos protegidos |
| `channelCommerce.landing.form.trust.2` | Te responde una persona del equipo |
| `channelCommerce.landing.form.fields.name.label` | Nombre |
| `channelCommerce.landing.form.fields.name.error` | Escribe tu nombre para saber a quién responder. |
| `channelCommerce.landing.form.fields.email.label` | Correo de trabajo |
| `channelCommerce.landing.form.fields.email.placeholder` | nombre@empresa.cl |
| `channelCommerce.landing.form.fields.email.error` | Escribe un correo válido, por ejemplo nombre@empresa.cl. |
| `channelCommerce.landing.form.fields.company.label` | Empresa |
| `channelCommerce.landing.form.fields.company.error` | Escribe el nombre de tu empresa. |
| `channelCommerce.landing.form.fields.category.label` | Categoría |
| `channelCommerce.landing.form.fields.category.error` | Elige la categoría de tu producto. |
| `channelCommerce.landing.form.fields.channel.label` | Canal principal |
| `channelCommerce.landing.form.fields.channel.helper` | Donde más se vende tu producto. |
| `channelCommerce.landing.form.fields.channel.error` | Elige el canal donde más vendes. |
| `channelCommerce.landing.form.fields.need.label` | Qué necesitas resolver |
| `channelCommerce.landing.form.fields.need.error` | Elige lo que más necesitas resolver. |
| `channelCommerce.landing.form.fields.coverage.label` | Cobertura aproximada |
| `channelCommerce.landing.form.fields.coverage.helper` | Puntos de venta donde está tu producto. Una estimación basta. |
| `channelCommerce.landing.form.fields.context.label` | Contexto |
| `channelCommerce.landing.form.fields.context.helper` | Por ejemplo, una cadena donde cayó la venta o un lanzamiento en camino. |
| `channelCommerce.landing.form.fields.context.error` | Máximo 500 caracteres (tienes {n}). |
| `channelCommerce.landing.form.fields.email.corporateError` | Usa tu correo de trabajo para enviar el brief. |
| `channelCommerce.landing.form.fields.consent.error` | Necesitamos tu autorización para responderte. |
| `channelCommerce.landing.form.options.category` | Alimentos y bebidas · Ferretería y mejoramiento del hogar · Cuidado personal y limpieza · Salud y farma OTC · Mascotas · Bebidas alcohólicas · Otra categoría |
| `channelCommerce.landing.form.options.channel` | Supermercados · Canal tradicional y almacenes · Ferreterías · Farmacias · Tiendas de conveniencia · E-commerce y marketplaces · Varios canales |
| `channelCommerce.landing.form.options.need` | Entender qué pasa en la tienda · Medir la ejecución cada ciclo · Corregir las tiendas críticas · Activar un lanzamiento o una promoción · Organizar un evento o una feria · Conectar la góndola con retail media · Todavía no lo tengo claro |
| `channelCommerce.landing.form.options.coverage` | Menos de 50 · Entre 50 y 200 · Entre 200 y 1.000 · Más de 1.000 · No lo sé |
| `channelCommerce.landing.form.submit` | Enviar mi brief |
| `channelCommerce.landing.form.pending` | Enviando… |
| `channelCommerce.landing.form.privacyLink` | Cómo usamos tus datos |
| `channelCommerce.landing.meeting.title` | ¿Prefieres conversarlo? |
| `channelCommerce.landing.meeting.body` | Una conversación con el equipo para revisar tu canal juntos. |
| `channelCommerce.landing.meeting.cta` | Agenda una reunión |
| `channelCommerce.landing.disclosure.body` | Las ilustraciones y los ejemplos de esta página son referenciales. No corresponden a clientes ni a resultados. |
| `channelCommerce.landing.dock.primary` | Agenda una reunión |
| `channelCommerce.landing.dock.secondary` | Cuéntanos tu canal |
| `channelCommerce.landing.aria.xrayPoint` | Punto {n}: {nombre} |
| `channelCommerce.landing.aria.dock` | Empezar con Efeonce |
| `channelCommerce.landing.seo.title` | Agencia de trade marketing y BTL en Chile \| Efeonce |
| `channelCommerce.landing.seo.description` | Trade marketing y BTL con evidencia tienda por tienda: te decimos qué corregir primero, lo corregimos y lo cruzamos con tu inversión digital. |
| `channelCommerce.landing.og.title` | Trade marketing que te dice qué corregir primero |
| `channelCommerce.landing.og.description` | Tienda por tienda, con foto de cada hallazgo y cruzado con lo que inviertes en la red de medios de cada cadena. |

Las respuestas 1 y 2 del FAQ reutilizan las cápsulas de R2 para que el schema marque exactamente lo visible.

### Regla terminológica

**Cada término nombra una cosa distinta; nunca dos nombres para lo mismo dentro de un bloque.** No se fuerza un único
término para el local: en Chile `tienda` y `góndola` son de uso común y `sala` es jerga del trade.

| Término | Qué nombra | Dónde se usa |
|---|---|---|
| **tienda** | El local | Default del copy: hero, cuerpo, BTL, FAQ y opciones del form. Lo entiende todo el comité |
| **góndola** | El mueble donde está el producto | Cuando se habla de lo que se ve y se ejecuta en él: quiebre, frentes, precio, la firma y la conexión digital |
| **sala** | El piso de venta, en jerga del operador | Sólo donde calza el idioma del trade ("activación en sala") y en el nombre canónico de B1 |
| **punto de venta** | La unidad de medida | Cobertura, puntaje, conteos y cobro |
| **corregir** | La intervención | Verbo único; reemplaza a arreglar e intervenir |
| **red de medios de la cadena** | Retail media en lectura plana | Cuerpo; `retail media` queda en nombres de servicio y opciones |

Los nombres canónicos del catálogo se respetan tal cual (`Estándar de Tienda Perfecta`, `Activaciones en Sala Medidas`).

## Copy Review 2026-09-10

Framework: **solution-aware** (el lector ya conoce agencias y plataformas), contraste + mecanismo único (BAB/FAB).
Voz institucional Efeonce, tono landing: conciso y con filo. Creencias que tensiona: #7 (transparencia como mínimo)
y #3 (métricas sin decisión). Pasadas aplicadas: estructura, claridad, concisión, ritmo, prueba y voz, anti AI-slop.

**Voice of customer.** No hubo entrevistas. Proxy usado: avisos de empleo de Jefe de Trade Marketing en Chile, donde
el operador describe su trabajo con sus palabras: "correcta ejecución en sala", "levantar información en terreno"
sobre precios, promociones, exhibiciones y competencia, y "elaborar reportes mensuales". Fuentes: Chiletrabajos
(Jefe Trade Marketing, Responsable de Trade Marketing) y BeBee (Jefe de Trade Marketing), `as-of 2026-09`. El
proxy mejora el vocabulario pero **no reemplaza** entrevistas: queda pendiente para el Slice 2.

| # | Hallazgo | Regla | Cambio |
|---|---|---|---|
| 1 | Copy escrito sin voice of customer | Research antes de escribir | Vocabulario del operador (terreno, reporte mensual, ejecución) y FAQ nueva sobre el reporte mensual |
| 2 | Arreglar, corregir e intervenir usados para lo mismo | Mismo término para el mismo concepto | `corregir` como verbo único |
| 3 | La alternativa de H1 era el mejor contraste de la página, pero no cabía como H1 por SEO | Cada titular en su superficie | Pasó a ser el título de la sección de problema |
| 4 | "Tres reportes que no se hablan" nombraba el concepto en vez de prometer | Antipatrón 6.b | Reemplazado por el contraste sell-in / sala |
| 5 | El cuerpo del hero repetía el H1 | El lead gana el siguiente párrafo | Mecanismo, prueba (foto) y diferenciador digital |
| 6 | Claims de mercado sin prueba: "casi nadie cierra el ciclo", "semanas de atraso", "nadie puede decirte" | Prueba antes que hype | Reescritos sin afirmación de mercado |
| 7 | Las celdas de la tabla de posición, el copy más cargado de claims, no estaban en el ledger | Todo claim visible es revisable | Seis filas con valores `Sí`, `No`, `En parte`, marcadas para revisión legal |
| 8 | Faltaban 22 descripciones de servicio, labels, ayudas y errores del form, intro del FAQ, caption, aria, SEO y OG | Copy completo antes de construir | Agregados |
| 9 | 13 em-dash dentro de strings | Tell de AI-slop | Cero; nombre y cuerpo separados en IDs distintos |
| 10 | "El BTL son las acciones" | Concordancia | "El BTL agrupa las acciones" |
| 11 | El helper decía "Seis preguntas" con ocho campos | Exactitud | "Seis datos obligatorios. Los dos opcionales…" |
| 12 | Jerga: "denominador", "evidencia verificable" | Especificidad sobre abstracción | "sobre cuántas salas se calculó", "foto de cada hallazgo" |
| 13 | Opciones de "qué necesitas resolver" sin estructura paralela | Consistencia | Todas empiezan con verbo |
| 14 | Cobertura con unidad sólo en la primera opción | Consistencia | Unidad en el helper, opciones numéricas |
| 15 | "Respuesta con contexto" y success card "con contexto" eran vagos | Beneficio concreto | "Te responde una persona del equipo"; success card con beneficio explícito |
| 16 | Grupo "Intervenir" | Verbo único | "Corregir" |
| 17 | H1, title y OG casi iguales | Cada superficie hace un trabajo | Title resuelve intent; OG gana la lectura compartida |
| 18 | **Corrección del owner:** la primera versión de esta revisión convirtió "ejecución en sala" en regla y eliminó `tienda` y restringió `góndola`. En Chile ambas son de uso común | La señal de un proxy no es una regla; el owner conoce el mercado | Regla por cosa nombrada: tienda (local), góndola (mueble), sala (jerga), punto de venta (unidad) |

**Se mantuvo a propósito:** "Ni un tablero más ni otro equipo de terreno" (titular por negación, aceptable porque
nombra las dos alternativas que el lector ya conoce), "Un dato que no validamos no llega a tu reporte" y la sección
"Lo que no te vamos a prometer": son la voz de honestidad incómoda y la única prueba disponible sin casos.

**Pendiente:** entrevistas de VoC, revisión legal de las celdas y del dato laboral, y aprobación del H1 por el owner.

## State Copy

| Estado | Copy visible | Recuperación |
|---|---|---|
| ready | Formulario montado con sus ocho campos, el consentimiento y el submit "Enviar mi brief". | — |
| loading | Estado de carga del renderer: "Cargando el formulario…". Nunca un bloque vacío. | Si no monta en el tiempo del renderer, pasa a `partial`. |
| empty | "Completa los campos marcados para continuar." + resumen de errores enfocable. | Foco al resumen; cada error enlaza a su campo. |
| partial | "El formulario no pudo cargar. Agenda una reunión y lo revisamos contigo." | CTA de reunión visible en el mismo bloque; enlace a `/contacto/`. |
| error | "No pudimos enviar tu brief. Revisa los campos marcados o inténtalo de nuevo." | Conserva los valores escritos; reintento sin recargar. |
| denied | "Usa tu correo de trabajo para enviar el brief." · Verificación fallida: "No pudimos verificar el envío. Inténtalo de nuevo o agenda una reunión." | Foco al campo de correo; reunión como alternativa. |
| success | Success card gobernada: "Recibimos tu brief. Lo revisamos antes de contactarte, para no preguntarte lo que ya nos contaste." | Sin promesa de plazo; CTA de reunión opcional. |
| meeting unavailable | Recuperación nativa del scheduler: navegación de mes y "Reintentar". | Sin enlaces ni copy del proveedor. |
| no-js | Todo el contenido visible; los CTAs de reunión enlazan a `/contacto/`. | El brief no monta; el contenido crítico no depende de él. |
| reduced motion | Mismo contenido y mismos estados, sin reveals ni transiciones. | — |

## Accessibility Contract

- Un solo H1. H2 por región; H3 por grupo de servicios y por paso del ciclo. Sin saltos de nivel.
- Landmarks: `<main>` para el cuerpo; el header y el footer son de Ohio.
- `lang="es-CL"` heredado del sitio.
- Puntos de lectura como `<button>` con nombre accesible —"Punto 1: Disponibilidad"—, `aria-expanded` y
  `aria-controls` hacia su panel. Enter y Espacio alternan; Escape cierra y devuelve el foco al botón.
- La lista de los seis puntos y la lista priorizada existen siempre en el DOM como `<ol>`; la ilustración es
  complementaria, con ALT descriptivo.
- Tabla de posición con `<table>`, `<caption>`, `<th scope="col">` y `<th scope="row">`; cada celda con texto,
  no sólo un icono.
- FAQ con `<details>`/`<summary>`; nada depende de hover.
- Formulario: labels visibles sobre el control, errores locales asociados con `aria-describedby`, resumen
  enfocable, `autocomplete`, targets ≥44 px y selects premium con el contrato combobox/listbox del renderer.
- CTAs con verbo específico y nombre accesible único. El dock oculto es `inert`.
- Contraste AA en texto y en los puntos sobre la ilustración; foco doble visible sobre papel y sobre Midnight.
- Iconos decorativos con `aria-hidden="true"`.
- `prefers-reduced-motion` elimina reveals, pulsos y scroll suave sin quitar contenido ni estado.

## Implementation Mapping

- **Runtime:** `efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets` — **[verificar]** la ruta del
  checkout local antes de construir.
- **Módulos semánticos nuevos:** `greenhouse_channel_{hero,definition,problem,cycle,xray,trade,btl,digital,operating,proof,faq,conversion}`,
  doce widgets, cada uno en su contenedor Elementor, siguiendo el patrón de `EO_Content_Marketing_Base`: base
  `EO_Channel_Commerce_Base`, schemas en `includes/channel-commerce/schemas/`, familia `channelCommerceModule.v1`.
  **[verificar]** la convención exacta contra el módulo de Content Marketing.
- **Reuso:** `greenhouse_comparison_table` para R4; `greenhouse_social_trust` para R11; `greenhouse_growth_form`
  como host del brief dentro de R13; Growth CTA para la reunión.
- **Estilos:** `assets/css/channel-commerce.css` con raíz `.gh-channel`; sin selectores globales ni overrides de
  Ohio fuera de la página.
- **Comportamiento:** `assets/js/channel-commerce.js` para puntos de lectura, dock y sincronización de anchors;
  mejora progresiva sobre HTML servido por PHP.
- **SEO:** `includes/channel-commerce/seo.php`, activo sólo con el marker `_eo_channel_commerce_enabled=1`;
  añade `Service` y `FAQPage` sin duplicar Yoast.
- **Growth Form:** `efeonce-channel-commerce-brief`, kind `quote_request`, `style_variant=diagnostic_premium`,
  surface nueva `fhsf-efeonce-channel-commerce`, publicada por el lifecycle gobernado del motor. Helper idempotente
  nuevo en `scripts/growth/` siguiendo el patrón de `growth:forms:activate-influencer-premium-selects`.
- **Growth CTA:** `channel-commerce-discovery-meeting`, acción `open_meeting_scheduler`, sobre
  `fhsf-efeonce-lead-gen-web` / scheduler `discovery`.
- **Tracking:** fila nueva en `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md`; familias `gh_form_*`,
  `gh_cta_*`, `gh_meeting_*`; key event `generate_lead` desde `gh_form_submission_accepted`.
- **Verificadores nuevos:** `pnpm public-website:verify-channel-commerce-landing-fidelity` y
  `pnpm public-website:verify-channel-commerce-seo-package`, con la anatomía de los gates de influencers.
- **Menú:** ítem nuevo `Trade Marketing & BTL` en `Soluciones → Crecimiento Multicanal`, después de Content
  Marketing, con snapshot previo.

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/public-servicios-trade-marketing.scenario.ts`.
- Route: `/servicios/trade-marketing/` en `efeoncepro.com`. **[verificar]** cómo apunta GVC al host público: el
  resolver de entornos sólo conoce hosts de Greenhouse; los precedentes públicos se verificaron con gates
  Playwright dedicados.
- Viewports: 1536×911, 1440×1000 (desktop), 890×911 (tablet) y 390×844 (mobile).
- Quality profile: `premium`, con `keyboard.enabled`, probes de teclado y `reducedMotionCheck`.
- Markers: `channel-hero`, `channel-definition`, `channel-problem`, `channel-position`, `channel-cycle`,
  `channel-xray`, `channel-trade`, `channel-btl`, `channel-digital`, `channel-operating`, `channel-proof`,
  `channel-faq`, `channel-conversion`, `channel-disclosure`, `channel-dock`.
- Capturas: first fold por viewport; firma con un punto cerrado y un punto abierto; tabla de posición en desktop y
  en modo card; FAQ abierto; formulario listo; submit vacío con resumen de errores; select abierto; dock visible;
  diálogo del scheduler abierto sin reservar; full page.
- Assertions: un H1; `scrollWidth === clientWidth` en cada viewport (scroll-width check); formulario montado con
  ocho campos y submit; el CTA de reunión abre el scheduler nativo; exactamente tres instancias del rol verde;
  `<ol>` presente en ciclo y firma; ningún número salvo la numeración en la firma; consola sin errores propios.
- Keyboard probes: tab al CTA primario; abrir y cerrar un punto de lectura con Enter y Escape; abrir un `<details>`
  del FAQ; recorrer los campos del form; confirmar que el dock oculto no recibe foco.
- Review dossier: `pnpm fe:capture:review public-servicios-trade-marketing`.
- Baseline decision: surface ID `public-servicios-trade-marketing`; baseline nueva en la primera captura aprobada
  por el owner.
- Scorecard: `docs/ui/reviews/TASK-1860-landing-trade-marketing-btl.scorecard.json`.

## Design Decision Log

| Decisión | Alternativas consideradas | Por qué |
|---|---|---|
| Dirección A, góndola leída | B tablero de canal · C campo en movimiento | Única que representa la posición en el medio sin datos inventados ni fotografía de terreno |
| Slug `/servicios/trade-marketing/` | `/servicios/agencia-de-trade-marketing/` | El modificador comercial tiene ~10 búsquedas; el término cabeza ~880 |
| Cápsula de definición arriba | Omitirla por ser comercial | El SERP es informativo: la mejor definición es la puerta de entrada y la base de citabilidad |
| Desvío de empleo | Ignorar el tráfico laboral | Reduce rebote y spam del form sin esconder la página |
| 23 servicios agrupados en 7 grupos | Muro de tarjetas · acordeones que esconden | Legibilidad y SEO: todo en el HTML inicial, sin card soup |
| Tabla por tipo de proveedor | Nombrar competidores · omitir la comparación | La comparación es el argumento; nombrar empresas es riesgo legal y está prohibido |
| No mencionar proveedores ni subcontratación | Transparencia de estructura en la página | Decisión del owner: la estructura es interna y se declara sólo ante procurement o por ley |
| Sección de lo que no se promete | Omitirla | Sin casos, la honestidad verificable es la prueba disponible |
| Sin radiografía gratuita como CTA | Lead magnet de radiografía | Cada radiografía cuesta misiones reales y la capacidad no está dimensionada |
| Sin campo de presupuesto | Pedir presupuesto indicativo | La inversión de trade es sensible; la cobertura califica igual y reduce abandono |
| Ilustración propia | Stock o IA de sala con personas | Evita prueba falsa y el comparison set de agencias de terreno |
| Sin scroll pinning en la firma | Firma anclada con scroll | El precedente de Content Marketing muestra el costo en viewports bajos |
| Módulos semánticos | Widgets HTML page-scoped | El precedente de influencers perdió interactividad al compilar HTML; los semánticos conservan el contrato |
| Verde sólo en la reunión | Verde en ambos CTAs | Una sola acción dominante por bloque |
| Carrusel de marcas con rótulo de empresa | Omitirlo · rotularlo como clientes de trade | Confianza real sin sugerir casos de la línea |
| Cada término para su cosa: tienda, góndola, sala y punto de venta; corregir como verbo único | Forzar un solo término para el local | Corrección del owner: en Chile tienda y góndola son de uso común; sala es jerga del trade |

Riesgos abiertos: dirección visual sin aprobar; copy sin validación de voz de cliente; segunda fuente de demanda
pendiente; soporte de iconos por opción en el renderer sin confirmar; targeting de GVC al host público.

## Acceptance Checklist

- [ ] Dirección visual aprobada o reemplazada por un source versionado.
- [ ] Copy ledger aprobado, sin voseo, con los nombres canónicos del catálogo.
- [ ] Un H1 con `trade marketing`; los 23 servicios en el HTML inicial.
- [ ] Tabla de posición sin nombres de empresa y con nota visible.
- [ ] Firma con rótulo ilustrativo y listas siempre en DOM.
- [ ] Formulario con los estados ready, loading, empty, partial, error, denied y success verificados.
- [ ] Verde sólo en los CTAs de reunión.
- [ ] Sin scroll horizontal en 1536, 1440, 890 y 390.
- [ ] Reduced motion y teclado verificados.
