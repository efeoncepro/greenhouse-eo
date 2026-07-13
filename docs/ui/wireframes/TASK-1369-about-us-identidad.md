# TASK-1369 / Sitio público `/about-us-efeonce/` → `/nosotros` — About Us (identidad, Golden Circle)

## Meta

- Status: `draft`
- Owner task: `TASK-1369`
- Product Design asset: **pendiente** (dirección de arte del hero + sistema visual NO aprobados aún — bloquea `UI ready`). El copy/IA/estructura sí están decididos (PDR-011).
- Intended consumers: sitio público WordPress (`efeoncepro.com`), página de identidad. Consumers: prospectos mid-funnel evaluando, talento, prensa/partners, y motores SEO/AEO (entidad de marca + entidades de autor).
- Copy source: **este wireframe es el SSOT del copy** (página WordPress, no `src/lib/copy` que es del portal interno). Voz validada con `greenhouse-ux-writing` + `docs/context/05_voz-tono-estilo.md`. es-LATAM neutro, tuteo, sin voseo.
- Primitive decision: build WordPress code-custom / Ohio (mismo rail que las spokes); NO Greenhouse portal primitives. Reuse del `<greenhouse-form>` solo si se agrega newsletter/careers form gobernado.
- UI ready target: `no` (bloqueado por bios reales del equipo + dirección de arte del hero + GVC).

## Brief

- Primary user: comprador mid-market/enterprise que ya vio el pitch (Home) y valida *"¿quiénes son, por qué les creo, cómo trabajan por dentro?"*. Secundarios: talento, prensa.
- User moment: mitad de embudo (evaluación de confianza), o llegada directa/branded a "nosotros".
- Job to be done: confiar en Efeonce como partner (E-E-A-T), entender su Why y su forma de operar.
- Primary decision signal: *"esta gente piensa distinto y lo puede probar"* → agenda una reunión.
- Non-goals: NO es pitch de conversión de categoría (eso es la Home, PDR-010); NO expone el portal ni datos de cliente; NO vende un servicio puntual (eso son las spokes).

## Layout Skeleton

Arco **Golden Circle (Why → How → What)**, inside-out. Una página, scroll largo.

| Región | Bloque | Anillo | Propósito | Componente candidato | Data source |
|---|---|---|---|---|---|
| 0 | Header / nav | — | Nav global del sitio | Header Ohio global | estático |
| 1 | Hero / Manifiesto | WHY | El Why lidera (la creencia, no "se orquesta") | Hero code-custom | estático |
| 2 | Por qué existimos | WHY | La molestia fundacional (origen de la creencia) | Sección texto + KV | estático |
| 3 | Cómo pensamos (7 creencias) | WHY | El ADN narrativo; 4 al frente + 7 en desplegable | Lista + accordion | estático |
| 4 | Los 3 pilares del Why | WHY | Hace legible el Why: co-creación · educación · integralidad | 3 cards | estático |
| 5 | Un solo cerebro (4 capacidades) | HOW | Integración; capabilities descriptivas + voces "Empower your…" | Tabla/cards | estático |
| 6 | El método (Loop + ICO) | HOW | Cómo corre el sistema | Sección texto + diagrama | estático |
| 7 | Lo ves en vivo / software propio | HOW | Transparencia = prueba de co-creación | Sección + captura real | estático (captura del portal) |
| 8 | Medición honesta | HOW | El filo; growth integral, no vanity | Sección texto | estático |
| 9 | La prueba (casos) | WHAT | Casos citables con dato | Grid de casos + logos | estático |
| 10 | El equipo | WHAT | Bios reales (E-E-A-T, entidades de autor) | Grid de perfiles | **bios reales (pendiente)** |
| 11 | Cierre + CTA | WHAT | CTA suave de identidad | Sección CTA | `Agenda una reunión` (PDR-009) |
| 12 | Footer | — | Footer global | Footer Ohio global | estático |

## Copy Ledger

Copy id conceptual `publicsite.about.<sección>.<slot>` (autoría en WordPress, no `src/lib/copy`).

| Copy id | Región | Text | Dynamic values | Notes |
|---|---|---|---|---|
| `about.hero.eyebrow` | 1 | Agencia de crecimiento integrada | — | reusa eyebrow vivo |
| `about.hero.h1` | 1 | No te entregamos crecimiento. Lo construimos contigo. | — | **el Why lidera** (no "se orquesta") |
| `about.hero.sub` | 1 | Y te dejamos más capaz de sostenerlo. Porque el crecimiento no nace de los números —nace de cómo trabajamos juntos. | — | — |
| `about.hero.claim` | 1 | El crecimiento real no se compra por partes. Se orquesta. | — | claim secundario (es el How hecho frase) |
| `about.why.h2` | 2 | Nacimos molestos con una cuenta que no cerraba. | — | founding hook |
| `about.why.body` | 2 | Una marca contrata cinco agencias. Una hace el brand. Otra los ads. Otra la web. Otra el CRM. Cada una cobra; ninguna se habla. Y el dueño paga la factura de una orquesta sin director. El dinero no se pierde en malas ideas —se pierde en el silencio entre proveedores. Fundamos Efeonce para poner al director. | — | anáfora + metáfora director |
| `about.beliefs.h2` | 3 | Creemos siete cosas que a la industria le incomodan. | — | — |
| `about.beliefs.1` | 3 | El marketing sin sistema es caro por accidente. No por falta de ideas. | — | — |
| `about.beliefs.2` | 3 | La integración de verdad es operativa, no organizacional. Estar bajo un mismo logo no es integrarse. | — | — |
| `about.beliefs.3` | 3 | Las vanity metrics son un pacto de silencio. No lo firmamos. | — | — |
| `about.beliefs.4` | 3 | La IA sin gobierno no ordena el caos: lo acelera. | — | — |
| `about.beliefs.5` | 3 | La creatividad que no se mide, no se defiende. | — | — |
| `about.beliefs.6` | 3 | El funnel se jubiló: la gente circula, no hace fila. | — | — |
| `about.beliefs.7` | 3 | La transparencia no es un lujo que cobramos aparte. Es el piso. | — | — |
| `about.pillars.h2` | 4 | Por eso trabajamos así. | — | bridge a los 3 pilares |
| `about.pillars.cocreacion` | 4 | **Co-creación.** No recibes entregables: operas con nosotros, en vivo. | — | prueba: el login |
| `about.pillars.educacion` | 4 | **Educación.** Un experto que no te enseña, te vuelve dependiente. Preferimos hacerte mejor. | — | prueba: Think + frameworks |
| `about.pillars.integralidad` | 4 | **Integralidad.** El crecimiento no nace del gráfico que sube; nace de la relación que compone, ciclo a ciclo. | — | prueba: Loop |
| `about.brain.h2` | 5 | Cuatro capacidades. Un solo cerebro. | — | bloque elegido por el operador |
| `about.brain.intro` | 5 | No trabajan en paralelo: trabajan conectadas al mismo contexto. Lo que aprende una, lo usa la siguiente —sin reenviar, sin copiar y pegar. | — | "un cerebro" |
| `about.brain.cap1` | 5 | Diseño y creatividad — *Empower your Brand* — Identidad, contenido full-funnel, producción. | — | capability, no sub-marca |
| `about.brain.cap2` | 5 | Estrategia y crecimiento — *Empower your Growth* — GTM, CRM/RevOps, SEO/AEO, analytics. Orquesta. | — | — |
| `about.brain.cap3` | 5 | Medios y amplificación — *Empower your Voice* — Pauta ATL + digital, PR, influencers. | — | — |
| `about.brain.cap4` | 5 | Infraestructura y medición — *Empower your Engine* — Web performance, tracking, la ingeniería que hace todo medible. | — | — |
| `about.brain.remate` | 5 | Y todo apunta a lo mismo: *Empower your Growth*. Las otras tres capacidades existen para eso. | — | — |
| `about.metodo.h2` | 6 | El crecimiento no es un golpe de suerte. Es un método que corre. | — | — |
| `about.metodo.body` | 6 | Loop Marketing convierte tu marketing en un ciclo —Express, Tailor, Amplify, Evolve— donde ningún trimestre arranca de cero. Debajo corre ICO: mide cada pieza en vivo, cuenta las rondas de revisión, marca dónde se atasca. La capa de inteligencia operativa que casi ninguna agencia en LATAM tiene. Porque medir la creatividad no la mata: la defiende. | — | Loop/ICO con altura |
| `about.envivo.h2` | 7 | No tenemos un portal. Construimos el software que opera tu marketing. | — | antítesis |
| `about.envivo.body` | 7 | Greenhouse, Kortex y Verk son plataformas propias donde el servicio se ejecuta y se vuelve visible. Por eso la transparencia es el piso y no un extra: te damos login a tu operación, no un PDF el viernes. Ves el avance, el estado, el impacto. En vivo. | — | tricolon; captura real del portal |
| `about.medicion.h2` | 8 | Si no lo podemos medir, no te lo vendemos como resultado. | — | filo |
| `about.medicion.body` | 8 | Nada de "mejora significativa" ni de gráficos que suben sin decir de qué. Atribución conectada a tu pipeline: cuánto revenue habilitó cada peso. Las vanity metrics son un pacto de silencio entre agencia y cliente. Nosotros no lo firmamos. | — | — |
| `about.prueba.h2` | 9 | Diez años. Cuatro países. Marcas que no perdonan. | — | — |
| `about.prueba.body` | 9 | +120 empresas · HubSpot Solutions Partner. Sky: +127% de tráfico orgánico frente a LATAM Airlines. Bresler: +180% en ventas digitales. Berel nos adjudicó su retainer de SEO y AEO por licitación. Cuentas ancla que renuevan año tras año —no campaña tras campaña. | +120, +127%, +180% | solo casos citables;|
| `about.equipo.h2` | 10 | Detrás del sistema, la gente que lo opera. | — | — |
| `about.equipo.body` | 10 | *(bios reales de liderazgo + equipo — pendiente de input)* | nombre, rol, bio, foto por persona | **bloqueante E-E-A-T** |
| `about.cierre.h2` | 11 | El crecimiento se orquesta. Hablemos de orquestar el tuyo. | — | callback al claim |
| `about.cierre.cta1` | 11 | Agenda una reunión | — | mecanismo PDR-009 |
| `about.cierre.cta2` | 11 | Únete al equipo | — | → careers |

## State Copy

Página mayormente estática de contenido; los estados relevantes son del bloque equipo y de formularios embebidos.

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | — | render completo del arco | Agenda una reunión | estado normal |
| loading | — | n/a (contenido estático server-rendered) | — | sin fetch cliente crítico |
| empty | Equipo aún no publicado | Si las bios no están cargadas, el bloque equipo se **oculta** (no se muestra vacío ni con placeholders) | — | anti-humo: no inventar personas |
| partial | — | si solo hay bios de liderazgo, mostrar solo esas; no rellenar con genéricos | — | E-E-A-T: solo reales |
| error | No pudimos cargar esta sección | Si un embed (captura del portal / form) falla, degradar a texto, no romper la página | Reintentar | honesto |
| denied | — | n/a (página pública) | — | — |

## Accessibility Contract

- Heading order: un solo `h1` (hero Why); cada bloque abre con `h2`; los 3 pilares y capacidades con `h3`. Sin saltos de nivel.
- Chart/table alternatives: el "diagrama" de Loop y la tabla de capacidades tienen equivalente en texto (lista); la captura del portal lleva `alt` descriptivo real (no decorativo).
- Aria labels: accordion de las 7 creencias con `aria-expanded`; CTAs con label explícito ("Agenda una reunión con Efeonce").
- Focus notes: orden de foco sigue el DOM (Why→How→What); accordion operable por teclado; CTA visible en foco.
- Color-independent state labels: los estados (equipo oculto, error de embed) no dependen de color; texto explícito.

## Implementation Mapping

- Route / surface: `/about-us-efeonce/` (page_id 249770) → sugerido reslug `/nosotros` con 301. Confirmar en Discovery.
- Primitives: WordPress code-custom / Ohio (rail de las spokes). NO portal primitives.
- Variants / kinds: secciones de landing (hero, texto+KV, accordion, cards, grid de casos, grid de equipo, CTA).
- Component candidates: hero code-custom; accordion Ohio para las 7 creencias; grid de equipo; embed de captura real del portal (imagen optimizada, no iframe del portal).
- Copy source: este wireframe (SSOT); autoría en WordPress; voz `greenhouse-ux-writing` + `05_voz`.
- Data reader / command: estático salvo bios de equipo (fuente a definir: ACF/CMS del sitio). Sin readers del portal.
- API parity: n/a (página de contenido público; el CTA usa el mecanismo transversal de reunión, PDR-009).
- Access / capability: pública. Sin gating.
- Runtime consumers: navegador + crawlers SEO/AEO.
- Print/email/PDF considerations: n/a.
- GVC markers: `data-capture` por sección (`about-hero`, `about-why`, `about-beliefs`, `about-pillars`, `about-brain`, `about-metodo`, `about-envivo`, `about-medicion`, `about-prueba`, `about-equipo`, `about-cierre`).
- SEO/AEO: JSON-LD `Organization` (fundación, `foundingDate`, `areaServed` CL/CO/MX/PE, `award`/`memberOf` HubSpot Partner) + `Person` por miembro del liderazgo (entidades de autor). Entity capsule citable en el hero/intro.

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/about-us.yaml` (nuevo) — o captura por ruta con scroll por `data-capture`.
- Route: `/nosotros` (o `/about-us-efeonce/`) en staging del sitio público.
- Viewports: desktop (1440) + mobile (390).
- Required steps: cargar → scroll por cada `data-capture` → capturar sección.
- Required captures: hero, 7 creencias (accordion abierto/cerrado), 3 pilares, un-cerebro, en-vivo (captura del portal legible), casos, equipo.
- Required `data-capture` markers: los 11 de arriba.
- Assertions: `h1` = el Why (no "se orquesta"); las capacidades NO nombran Globe/Reach/Wave como sub-marcas; sin scroll horizontal de página.
- Scroll-width checks: `document.scrollingElement.scrollWidth <= viewport` en ambos viewports.
- Accessibility/focus checks: heading order un solo h1; accordion operable por teclado.
- Reduced-motion evidence: si hay scroll-reveal, respeta `prefers-reduced-motion` (capturar con RM on).

## Design Decision Log

- Decision: estructurar el About Us como **Golden Circle (Why→How→What)** inside-out; el Why lidera el hero (no "se orquesta", que es el How).
- Alternatives considered: (a) About Us como segundo pitch — descartado (duplica la Home, PDR-010); (b) liderar con "se orquesta" — descartado (es How, no Why, Sinek); (c) nombrar las unidades como sub-marcas — descartado (PDR-008: capabilities, no sub-marcas); (d) metáfora "cuatro sombreros" para las capacidades — descartada por el operador (era andamio de comprensión, no el copy más punchy) → "un solo cerebro".
- Why this pattern: es identidad/E-E-A-T; el Golden Circle hace que la creencia (lo que la gente compra, Sinek) llegue primero y lo tangible cierre como consecuencia.
- Reuse / extend / new primitive: reuse del rail WordPress/Ohio de las spokes; el CTA reusa el mecanismo transversal de reunión (PDR-009). Sin primitive nueva.
- Open risks: (1) dirección de arte del hero no aprobada; (2) bios reales del equipo pendientes; (3) "co-creación/integralidad" pueden leerse a humo si el build las suelta sin su mecanismo (regla anti-humo del Golden Circle).
- Follow-up: aprobar arte del hero + contrato de motion; cargar bios reales; confirmar reslug `/nosotros` + 301; scenario GVC.

## Acceptance Checklist

- [x] All visible strings are in the copy ledger.
- [x] Dynamic values are named and bounded (+120, +127%, +180%; bios por persona).
- [x] Partial/degraded states are explicit (equipo oculto si no hay bios; embed degrada a texto).
- [x] No copy implies a guarantee when data is estimated (casos citables reales;).
- [x] Charts have table/text alternatives (Loop/capacidades tienen equivalente en lista).
- [x] State and aria copy is ready for implementation.
- [x] Implementation mapping names primitive, copy source, data contract and route/surface.
- [x] GVC scenario plan is specific enough for `pnpm fe:capture` or a new scenario file.
- [x] Design decision log explains reuse/extend/new before JSX starts.
