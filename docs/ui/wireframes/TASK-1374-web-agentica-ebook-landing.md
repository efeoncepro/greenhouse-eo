# TASK-1374 / Web Agéntica — Ebook Lead Magnet Landing Wireframe

## Meta

- Status: `draft`
- Owner task: `TASK-1374 — Landing pública del ebook "El fin de la web" (/web-agentica)`
- Product Design asset: PR #12 de `efeoncepro/efeonce-think` (`feat/landing-fin-desarrollo-tradicional`) como **referencia de diseño** (estructura de secciones, copy, efectos CSS), NO como código a integrar. El export trae un design system foráneo (`_ds/efeonce-design-system-*`) + fuente DM Sans que se DESCARTAN; la landing se re-autora nativa con tokens AXIS + Geist/Poppins.
- Intended consumers: decisores de marketing/growth, C-level, SEO/contenidos y producto/tech que llegan por búsqueda ("marketing con IA", "AEO", "web agéntica"), enlace social o email.
- Copy source: copy local del hub `efeonce-think` (constantes cercanas a la ruta), alineado a `docs/context/05_voz-tono-estilo.md` (es-CL tuteo) y `docs/context/09_marca-agencia.md` (marca Efeonce). El copy visible del PR se reusa como base, tokenizado.
- Primitive decision: reuse del `BaseLayout` de Think (SEO+GTM) + patrón del `BrandVisibilityFormDock` para el form gobernado `<greenhouse-form>` + secciones CSS locales re-tokenizadas. No nace primitive Greenhouse (la superficie vive en Astro público externo).
- UI ready target: `no`

## Brief

- Primary user: una persona de marketing/dirección que intuye que la IA está cambiando cómo la encuentran y quiere una guía corta y accionable.
- User moment: primer contacto con el lead magnet; quiere entender el valor del ebook y decidir si deja su correo a cambio.
- Job to be done: entender la tesis ("hay dos tipos de visitantes: personas y agentes; tu web solo sirve a uno"), ver qué trae el ebook, y descargarlo dejando datos en un form gobernado que lo envía por email.
- Primary decision signal: la página debe verse enterprise-moderna y de marca Efeonce (no un PDF glorificado ni una landing genérica), con continuidad visual con el hub Think.
- Non-goals: prometer resultados, mostrar métricas propias sin fuente, reconstruir el form fuera del contrato gobernado, entregar el ebook sin capturar el lead, usar DM Sans / el design system foráneo del export, exponer `/…/index.html`.

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Header | Identidad Efeonce/Think sin distraer del CTA. | `BaseLayout` / header local Think | Static copy |
| 1 | Hero | Vender la tesis "El fin de la web / Marketing digital + IA" y llevar al form con un CTA de scroll. | Editorial hero (eyebrow + accent-word H1 + lead + CTA) sobre grid+beams animados; el cursor grande se superpone como recorrido decorativo desktop sobre una base del arte sin cursor estático. | Static copy + asset local |
| 2 | Stats strip | Dar peso al marco con 2 interfaces, 4 niveles y 1 cambio de modelo. | Signal cards con reveal escalonado + halo de puntero no esencial. | Static copy |
| 3 | Thesis | "Tu sitio ya tiene dos tipos de visitantes. Solo estás diseñado para uno." Explicar el cambio humano→agente. | Split editorial + dos lanes semánticas (experiencia propia / ventana del agente). | Static copy |
| 4 | What's inside | "Qué vas a encontrar dentro" — los 5 actos + checklist "Lo que haces esta semana". | Ruta editorial de cinco capítulos: rail de progreso puramente decorativa, tarjetas de lectura completas y spotlight localizado solo en puntero fino. Conserva una lista ordenada, no un carrusel. | Static copy |
| 5 | Audience | Auto-calificar la decisión: no otra táctica, sino qué parte del sistema revisar primero. | Dos artículos complementarios: punto de partida y aclaración honesta; síntesis y siguiente paso visibles en cada uno. | Static copy |
| 6 | Credibility brief | Confirmar quién guía la lectura antes de pedir datos. | Banda editorial de Efeonce Think / Research brief. | Static copy |
| 7 | Form workspace | Rail editorial que explica los tres resultados de la guía + "Descarga el ebook gratis" — form gobernado (nombre, email, rol opcional). La descarga comienza al enviar. | Host Astro para la rail + `<greenhouse-form>` (patrón `BrandVisibilityFormDock`) | Greenhouse Growth Forms |
| 8 | FAQ | Resolver las objeciones que quedan antes de actuar: agentes, niveles, búsqueda, legibilidad, zero-click y solicitudes automatizadas. | Accordion `<details>` | Static copy |
| 9 | Cierre + footer | Volver a la decisión, ofrecer el CTA final y ubicar la marca/navegación útil sin competir con la captura. | Cierre editorial + footer de tres zonas y meta legal. | Static copy |

## Content Model (from PR #12, tokenized)

La landing toma la estructura y el copy del export como base y los aterriza a la arquitectura de Think. No inventa datos nuevos; conserva las fuentes citadas del PR.

| Sección PR (export) | Landing nativa | Regla de porting |
|---|---|---|
| Hero "Marketing digital + IA · El fin de la web" | Hero con eyebrow + H1 accent-word + lead + CTA "Descargar el ebook gratis". | Re-tokenizar color/tipografía a AXIS/Geist; conservar grid+beams como CSS local. |
| Stats (−27% / 3× / 7×) | Stat strip con fuente literal ("HubSpot, 2026", "Cyber Week 2025"). | Nunca dato sin fuente; count-up con fallback estático. |
| "Dos tipos de visitantes" | Thesis split. | Copy es-CL, sin promesa. |
| "Qué vas a encontrar dentro" (5 actos + checklist) | What's inside. | Lista honesta de contenidos del ebook. |
| "Para quién / No es para ti si…" | Auto-calificación de audiencia. | Explica la decisión que el ebook ayuda a tomar; no es una matriz estática de fit/no-fit. |
| Autor del ebook | Credibility brief antes del formulario. | Efeonce Think se presenta como guía de investigación, sin desviar la tesis hacia SEO. |
| Form (name, email, rol select) | `<greenhouse-form>` gobernado. | Campos vienen del contrato, NO se hand-autoran. |
| FAQ (5 Q) | Accordion + `FAQPage` JSON-LD. | Rich result AEO; copy del PR. |
| `onSubmit` local falso | Éxito gobernado "revisa tu email". | El form del export NO capturaba nada; se reemplaza por el submit gobernado. |

## Copy Ledger

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| `think.webAgentica.landing.meta.title` | SEO | `El fin de la web: marketing + IA \| Efeonce Think` | none | Título indexable, keyword-first. |
| `think.webAgentica.landing.meta.description` | SEO | `Descarga gratis el ebook sobre la web agéntica: cómo la IA cambia quién encuentra tu marca y qué hacer esta semana.` | none | Sin garantías. |
| `think.webAgentica.landing.hero.eyebrow` | 1 | `Marketing digital + IA` | none | Categoría literal. |
| `think.webAgentica.landing.hero.title` | 1 | `El fin de la web como la conoces` | none | H1 accent-word ("fin"). |
| `think.webAgentica.landing.hero.body` | 1 | `Tu sitio ya recibe dos tipos de visitantes: personas y agentes de IA. Este ebook te muestra cómo dejar de diseñar solo para uno.` | none | Tesis en el fold. |
| `think.webAgentica.landing.hero.signal.kicker` | 1 | `Señal de transición` | none | Clasifica la evidencia sin competir con el H1. |
| `think.webAgentica.landing.hero.signal.value` | 1 | `Más de la mitad de las solicitudes web ya son automatizadas.` | `Cloudflare, 2026` | Evidencia editorial con fuente visible. |
| `think.webAgentica.landing.hero.cta` | 1 | `Descargar el ebook gratis` | none | Ancla al form. |
| `think.webAgentica.landing.hero.reassurance` | 1 | `PDF inmediato tras enviar · contenido relacionado con baja cuando quieras.` | none | Reduce incertidumbre de entrega y consentimiento. |
| `think.webAgentica.landing.hero.visualLabels` | 1 | `Interfaz humana` / `Lectura del agente` | none | Anotaciones decorativas que conectan el arte con la tesis; el significado también existe en H1/lead. |
| `think.webAgentica.landing.stats.title` | 2 | `Lo que ya está pasando` | none | Encabezado de datos. |
| `think.webAgentica.landing.stats.traffic` | 2 | `−27% · Caída del tráfico orgánico interanual` | `HubSpot, 2026` | Fuente literal obligatoria. |
| `think.webAgentica.landing.stats.aiReferral` | 2 | `3× · El tráfico referido por IA se triplicó` | none | Del PR. |
| `think.webAgentica.landing.stats.agenticSales` | 2 | `7× · Más ventas con integración agéntica` | `Cyber Week 2025` | Fuente literal. |
| `think.webAgentica.landing.thesis.title` | 3 | `Tu sitio ya tiene dos tipos de visitantes` | none | Del PR. |
| `think.webAgentica.landing.thesis.subtitle` | 3 | `Solo estás diseñado para uno` | none | Remate. |
| `think.webAgentica.landing.inside.title` | 4 | `Qué vas a encontrar dentro` | none | Sección contenidos. |
| `think.webAgentica.landing.inside.subtitle` | 4 | `Cinco actos para leer la nueva web` | none | Del PR. |
| `think.webAgentica.landing.inside.checklist` | 4 | `Incluye checklist «Lo que haces esta semana»` | none | Accionable. |
| `think.webAgentica.landing.audience.title` | 5 | `No necesitas otra táctica. Necesitas saber qué parte del sistema revisar primero.` | none | Convierte la calificación en una decisión, no en una ficha de perfil. |
| `think.webAgentica.landing.audience.body` | 5 | `Esta guía está hecha para equipos que prefieren entender el cambio antes de rediseñar su presencia, sus datos o su forma de entregar valor.` | none | Une contenido con la siguiente acción. |
| `think.webAgentica.landing.audience.yes` | 5 | `Tu punto de partida` / `Es para ti si…` | none | Card guía: decisión de inversión, presencia donde se delegan decisiones, lectura del agente y resultados consumibles. |
| `think.webAgentica.landing.audience.no` | 5 | `Una aclaración honesta` / `No es para ti todavía si…` | none | Filtra tácticas aisladas, checklist sustituto y prioridad exclusiva por clics. |
| `think.webAgentica.landing.audience.transition` | 5 | `Si te reconoces aquí, los cinco actos te dan un mapa antes de decidir qué mover esta semana.` | none | Conecta auto-calificación con el valor ya explicado; no crea un CTA competidor. |
| `think.webAgentica.landing.author.kicker` | 6 | `Efeonce Think · Research brief` | none | Credencial compacta antes de pedir el correo. |
| `think.webAgentica.landing.author.body` | 6 | `Escrito por el equipo de Efeonce para ayudar a equipos de marketing, growth y digital a leer el cambio antes de decidir qué rediseñar.` | none | Guía, no promesa de servicio ni framing SEO. |
| `think.webAgentica.landing.form.title` | 7 | `Descarga el ebook gratis` | none | Encabezado del form; los campos vienen del contrato. |
| `think.webAgentica.landing.form.body` | 7 | `Cinco actos y un checklist para entender la web agéntica y actuar esta semana. La descarga comienza al enviar.` | none | Promesa verificable de entrega inmediata; no condiciona la experiencia a una confirmación de email. |
| `think.webAgentica.landing.form.rail.kicker` | 7 | `Tu mapa de lectura` | none | Orienta la columna editorial del workspace. |
| `think.webAgentica.landing.form.rail.title` | 7 | `Una guía breve para una web que ya no tiene un solo visitante.` | none | Repite la tesis sin competir con el H1. |
| `think.webAgentica.landing.form.rail.items` | 7 | `Dos interfaces` / `Cuatro niveles` / `Checklist semanal` | none | Resume resultados concretos; no promete un diagnóstico. |
| `think.webAgentica.landing.form.rail.delivery` | 7 | `La descarga comienza al enviar.` | none | Cierra la rail con una expectativa honesta. |
| `think.webAgentica.landing.form.rolePlaceholder` | 7 | `Selecciona (opcional)` | none | Rol opcional (campo del contrato). |
| `think.webAgentica.landing.form.submit` | 7 | `Enviarme el ebook` | none | CTA del contrato. |
| `think.webAgentica.landing.form.consent` | 7 | `Al descargar aceptas recibir contenido de Efeonce. Baja cuando quieras.` | none | Consent gobernado. |
| `think.webAgentica.landing.form.loading.title` | 7 | `Preparando el formulario` | none | Skeleton. |
| `think.webAgentica.landing.form.loading.body` | 7 | `Estamos conectando con Greenhouse para cargar los campos y protecciones.` | none | Loader honesto. |
| `think.webAgentica.landing.form.degraded` | 7 | `No pudimos cargar el formulario. Recarga la página o escríbenos desde el sitio de Efeonce.` | none | Sin internals. |
| `think.webAgentica.landing.form.success.title` | 7 | `Tu descarga está lista` | none | Confirmación inline; el form ya no ocupa el espacio del estado final. |
| `think.webAgentica.landing.form.success.body` | 7 | `El PDF ya se está descargando. Si necesitas abrirlo otra vez, usa el botón mientras esta página siga abierta.` | none | Honesto: confirma la entrega inmediata, sin prometer un email no verificado. |
| `think.webAgentica.landing.form.success.redownload` | 7 | `Descargar el ebook otra vez` | none | Recuperación gated (usa el token del handoff, no un href estático). |
| `think.webAgentica.landing.form.success.bridge.kicker` | 7 | `Tu punto de partida` | none | Cross-sell secundario, subordinado a la descarga. |
| `think.webAgentica.landing.form.success.bridge.title` | 7 | `Mide el nivel 1 de tu web agéntica` | none | El grader cubre ser encontrado y entendido, no resume los cuatro niveles. |
| `think.webAgentica.landing.form.success.bridge.body` | 7 | `Descubre si ChatGPT, Perplexity y Google AI encuentran y entienden tu marca. El ebook te ayuda a avanzar desde ahí hacia acciones y capacidades.` | none | Conecta la medición con la tesis completa, sin volver a SEO/AEO. |
| `think.webAgentica.landing.form.success.bridge.cta` | 7 | `Medir mi visibilidad en IA` | href `/brand-visibility` | Cross-sell explícito hacia el grader hermano. |
| `think.webAgentica.landing.faq.title` | 8 | `Antes de actuar, aclaremos lo esencial.` | none | Capa de objeciones después de la captura, no otra promesa de tráfico. |
| `think.webAgentica.landing.faq.llms` | 8 | `Es un archivo auxiliar ... no reemplaza una decisión de producto, datos o capacidades por sí solo.` | none | Aclara `llms.txt` sin convertirlo en la tesis de la guía. |
| `think.webAgentica.landing.footer.kicker` | 9 | `Efeonce Think` | none | Contexto editorial de la marca. |
| `think.webAgentica.landing.footer.body` | 9 | `Ideas y capacidades para la web que ya están usando tus clientes.` | none | Cierre de marca concreto, sin promesa. |
| `think.webAgentica.landing.footer.explore` | 9 | `Explora la guía` | none | Navegación de recuperación a los hitos de lectura. |
| `think.webAgentica.landing.footer.signal` | 9 | `La nueva interfaz ya está abierta.` | none | Señal editorial, no dato cuantitativo. |
| `think.webAgentica.landing.form.corporateGate` | 7 | `Usa tu correo corporativo — el ebook está pensado para equipos y marcas reales.` | none | El form exige correo corporativo (bloquea free/disposable), igual que el grader. |

Las preguntas y respuestas del FAQ se adaptan al contenido vigente del ebook y se revisan en es-CL; la explicación de `llms.txt` conserva su rol acotado. Toda métrica conserva su fuente literal.

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | `Descarga el ebook gratis` | `Cinco actos y un checklist para entender la web agéntica y actuar esta semana. La descarga comienza al enviar.` | Submit por `<greenhouse-form>` | Default; la rail editorial explica lo que incluye sin replicar el contrato. |
| loading | `Preparando el formulario` | `Estamos conectando con Greenhouse para cargar los campos y protecciones.` | none | Skeleton rico, no spinner-only. |
| empty | `Formulario no disponible` | `El contrato del form no devolvió campos publicables.` | `Reintentar` | Raro; sin internals. |
| error | `No pudimos cargar el formulario` | `Recarga la página. Si persiste, usa el contacto público de Efeonce.` | `Reintentar` | No filtrar API/CORS. |
| denied | `Este formulario no está disponible desde este origen` | `La superficie pública aún no está autorizada para este form.` | none | Evidencia pre-launch; lo resuelve el allowlist gobernado. |
| submitting | `Enviando tu solicitud` | `Estamos validando el formulario antes de enviarte el ebook.` | none | El renderer previene doble submit. |
| success (thank-you) | `Tu descarga está lista` | `El PDF ya se está descargando. Si necesitas abrirlo otra vez, usa el botón mientras esta página siga abierta.` | `Descargar el ebook otra vez` (re-dispara la descarga tokenizada) + `Medir mi visibilidad en IA` → `/brand-visibility` | **Una sola tarjeta inline** reemplaza el form (NO overlay ni doble shell). En desktop se abre a dos columnas; en mobile se apila. El botón de recuperación es gated (usa el token del handoff); el cross-sell explica que el grader mide sólo el nivel 1. Foco al título; el panel `role=status` anuncia pero no recibe foco. |

## Accessibility Contract

- Heading order: un solo `h1` en el hero; secciones con `h2` ordenados; FAQ usa `<details>/<summary>` nativo; cards con `h3` solo si anidan en sección.
- Aria: región del form etiquetada por `Descarga el ebook gratis`; loader/success/degraded en live region polite.
- Focus: foco inicial default; skip link del layout alcanza main; tras success/error, foco al heading del estado. El panel live no lleva `tabindex`, evitando un ring de foco de área completa.
- Color-independent: todos los estados con etiqueta de texto; el estado no se expresa solo por color.
- Reduced motion: grid drift, beams, spotlight y count-ups colapsan a estático con el mismo significado.
- Targets: CTA y summary del FAQ ≥44px; contraste AA verificado en el naranja de acento sobre navy.

## Implementation Mapping

- Route / surface: `efeonce-think` ruta `/web-agentica` (`think.efeoncepro.com/web-agentica`), pública e indexable. Canónica sin `/index.html`, sin redirect (respeta `trailingSlash:'never'`).
- Primitives: Think `BaseLayout` (title/description/canonical/robots/OG/JSON-LD/GTM/favicon); patrón `BrandVisibilityFormDock` para el form host; secciones CSS locales.
- Component candidates: Astro page `src/pages/web-agentica/index.astro`; componente local `src/components/WebAgenticaFormDock.astro` (o reuso parametrizado del dock existente) que hospeda el `<greenhouse-form>` del ebook + estados; secciones presentacionales locales solo si no duplican el renderer.
- Copy source: módulo de copy local de la ruta; no dispersar strings reusables en el markup.
- Data reader / command: ninguno en Think. El submit y la entrega del ebook los gobierna Greenhouse (Growth Forms + fulfillment de email). Think no valida ni entrega.
- API parity: sin endpoint local de submit, sin validación local, sin consent/Turnstile local. El único write path es el renderer gobernado.
- Access / capability: página pública sin auth.
- Descartes explícitos del export: `support.js`, `image-slot.js`, `_ds/efeonce-design-system-*/**` (incl. DM Sans), y el redirect `src/pages/fin-desarrollo-tradicional.astro`. Los assets `ebook-hero.png`/logos se optimizan vía `astro:assets`.
- GVC markers: `web-agentica-landing`, `web-agentica-hero`, `web-agentica-stats`, `web-agentica-thesis`, `web-agentica-inside`, `web-agentica-audience`, `web-agentica-form`, `web-agentica-form-loader`, `web-agentica-faq`, `web-agentica-footer`.

## GVC Scenario Plan

- Scenario file: capture local de Think (`scripts/capture.mjs /web-agentica web-agentica-landing`) — GVC de greenhouse-eo no apunta al repo externo; se usa el capturador propio de Think.
- Route: `/web-agentica` en Think local y staging/prod tras deploy.
- Viewports: desktop 1440, laptop 1280, mobile 390.
- Required steps: cargar página, confirmar meta indexable + canonical sin `/index.html`, capturar hero settled, esperar `<greenhouse-form>`, verificar fold con tesis + CTA, capturar loader/ready del form, recorrer stats → tesis → actos → audience → credibility brief → form → FAQ, probar hover de cards de audiencia en puntero fino y capturar reduced-motion.
- Required captures: hero desktop, stats, audience desktop/hover, author+form, form loader, form ready, success, full page desktop, hero mobile, audience mobile, form mobile, full page mobile.
- Required `data-capture` markers: los 10 listados arriba.
- Assertions: sin scores/promesas falsas, sin campos locales fuera del `<greenhouse-form>`, script carga desde Greenhouse, ruta indexable, sin DM Sans ni `_ds/` foráneo, sin overflow horizontal.
- Scroll-width checks: `scrollWidth <= clientWidth` en 1440 y 390.
- Accessibility/focus checks: teclado alcanza CTA, form y summaries del FAQ; foco visible; sin saltos de heading.
- Reduced-motion evidence: captura con `prefers-reduced-motion: reduce` probando que stats/beams/grid quedan legibles sin animación.

## Design Decision Log

- Decision: re-autorar la landing del PR #12 como página Astro nativa en `/web-agentica`, con `BaseLayout` (SEO+GTM), tokens AXIS/Geist, efectos CSS portados y form gobernado que entrega el ebook por email; NO mergear el export crudo.
- Alternatives considered: (a) mergear el PR tal cual — rechazado: sin SEO/GTM, form muerto, design system foráneo, URL con `/index.html`; (b) mergear con parches mínimos — rechazado: deja DM Sans + `_ds/` foráneo como deuda visible; (c) iframe del export — rechazado: peor SEO y sin marca.
- Why this pattern: la página existe para SEO + captación; su valor depende de `<head>` correcto, marca Efeonce y un form que realmente capte el lead y entregue el ebook. El export no cumple ninguno de los tres.
- Reuse / extend / new primitive: reuse `BaseLayout` + patrón form dock; no nace primitive Greenhouse.
- Decisión (thank-you post-descarga): **una sola tarjeta inline** reemplaza el form (el área muta a una conclusión), NO overlay/modal ni card exterior redundante. Alternativas rechazadas: overlay full-screen (pesado, focus-trap, anti-restraint 2026) y route change (rompe contexto/SEO). La entrega es inmediata y el usuario necesita confirmación, recuperación gated y una continuación útil. El grader se conserva como cross-sell secundario, pero se presenta con precisión como medición del nivel 1 (ser encontrado y entendido), no como sustituto del framework de cuatro niveles del ebook. En desktop el estado final usa dos columnas para no dejar una tarjeta de captura estrecha y aislada; en mobile se apila. La tarjeta no promete email hasta que ese delivery tenga evidencia independiente. El focus ring se reserva para el título programáticamente enfocado; `role=status`/`aria-live` anuncia el panel sin volverlo focalizable. El success_card gobernado del form es el baseline; la landing pinta el estado post-submit con el token.
- Decisión (workspace de conversión, 2026-07-10): el estado `ready` pasa de una tarjeta de form genérica a una composición de dos zonas: una rail editorial con resultados concretos del ebook y una zona de captura que consume el renderer sin modificar campos, consentimiento, validación ni submit. La rail se apila antes del form en móvil; no hay wizard, progreso falso, confetti ni hover que cargue significado. El host sólo aplica tokens `--ghf-*` y densidad; toda semántica e interacción de los controles continúa siendo del renderer gobernado.
- Decisión (dirección del hero, 2026-07-10): la evidencia pasa de una píldora genérica a un ledger editorial con índice, etiqueta y fuente; el CTA recibe una promesa concreta de entrega inmediata y los contenidos del ebook quedan como proof compacto. El arte existente se reencuadra y se anota visualmente como experiencia humana / lectura del agente, sin afirmar que el asset sea el nuevo cover. La navegación de recorrido se revela al iniciar scroll sólo con motion habilitado; sin JavaScript, en móvil o con `prefers-reduced-motion`, permanece visible y navegable.
- Decisión (cursor del hero, 2026-07-10): el cursor grande no queda congelado en la imagen. Se extrae de forma mecánica sobre su transparencia original y se monta como una capa SVG alineada al arte: entrada desde el borde inferior, recorrido hacia la interfaz, clic teal y salida invisible antes de reiniciar. Es sólo una metáfora de interacción humana, por lo que no recibe semántica ni eventos. En móvil y reduced-motion se suprime para preservar la composición estática y la prioridad del CTA.
- Decisión (ritmo del cursor, 2026-07-10): el recorrido visible no debe ser una demo lenta. El loop de 5,8 s simula una inspección breve: barrido continuo, sobrepaso y corrección una sola vez, halo anclado a la punta real y clic corto. No hay seguimiento del mouse, trail ni interacción falsa; el retorno se hace fuera de vista.
- Decisión (ruta de actos, 2026-07-10): los cinco actos no se convierten en tabs, wizard ni carrusel — no existe una acción o contenido diferido que justifique un control interactivo. Se conserva el `<ol>` completo y cada card expone su título y síntesis sin hover. La sensación de recorrido viene de una rail visual conectada, un pulso de progreso al entrar la sección y una elevación/spotlight no esencial sobre puntero fino. Móvil apila los capítulos como lectura lineal; reduced-motion conserva rail y jerarquía, sin recorrido ni elevación.
- Decisión (vitalidad editorial): se elimina el recuadro inclinado detrás del arte del hero; competía con la propia imagen. Las señales usan un halo de puntero puramente decorativo y reveal escalonado; la tesis gana dos lanes explícitas que materializan las dos interfaces; el footer se convierte en un cierre editorial de tres zonas. Ninguna de estas capas depende de hover, JavaScript o motion para comunicar significado; reduced motion muestra el estado final.
- Decisión (audiencia y arco, 2026-07-10): la auto-calificación deja de ser dos recuadros equivalentes. El primer artículo explica el punto de partida y el marco que entrega el ebook; el segundo usa una exclusión honesta sin crear una zona vacía. Ambos conservan toda la información sin hover y se apilan en móvil. El orden editorial queda: evidencia → problema → mapa → auto-calificación → credencial Efeonce → captura → objeciones → cierre. La credencial va antes del formulario para que Efeonce sea guía antes de pedir datos; se retira el framing de SEO del copy de autor y `llms.txt` se mantiene como detalle auxiliar, no como la promesa del ebook.
- Decisión (política de email): **solo correo corporativo** (bloquea free/disposable), igual que el grader — el ebook es para equipos/marcas reales; el gate lo aplica el contrato gobernado del form (`emailPolicy`), no la landing.
- Open risks: el **form instance del ebook (form_key) + el fulfillment de email + el ebook PDF** no existen todavía (dependencia backend-data en greenhouse-eo, TASK-1375); el origin `think.efeoncepro.com` debe estar autorizado en el allowlist gobernado para este form.
- Follow-up: si el fulfillment del ebook no está listo, los slices 1–2 (scaffold + port visual) igual proceden; el slice del form embed queda bloqueado hasta la foundation.

## Acceptance Checklist

- [x] Todas las strings visibles están en el copy ledger.
- [x] Los valores con fuente (stats) declaran su fuente literal.
- [x] Estados loading/empty/error/degraded/success explícitos.
- [x] Ningún copy implica garantía ni dato sin fuente.
- [x] El FAQ tiene alternativa semántica (`<details>`), no solo motion.
- [x] Implementation mapping nombra primitive, copy source, contrato de datos y ruta.
- [x] GVC scenario plan es específico para el capturador de Think.
- [x] Design decision log explica reuse/rechazos antes de escribir JSX.
