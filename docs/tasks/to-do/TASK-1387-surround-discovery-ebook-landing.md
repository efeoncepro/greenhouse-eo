# TASK-1387 — Surround Discovery Ebook Landing: Discovery System in Think

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-1387-surround-discovery-ebook-landing.md`
- Flow: `docs/ui/flows/TASK-1387-surround-discovery-ebook-landing-flow.md`
- Motion: `docs/ui/motion/TASK-1387-surround-discovery-ebook-landing-motion.md`
- Backend impact: `none`
- Epic: `EPIC-019`
- Status real: `Diseño listo — bloqueada por TASK-1386 published form + runtime evidence`
- Rank: `TBD`
- Domain: `content|ui`
- Blocked by: `TASK-1386`
- Branch: `task/TASK-1387-surround-discovery-ebook-landing`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construir en Think la landing indexable y gated del ebook **Surround Discovery™**. La página explica que SEO, AEO, video, social y marketplaces son superficies de un mismo sistema de descubrimiento; el grader y las landings SEO/AEO son puertas especializadas dentro de ese mapa, no ofertas desconectadas.

## Why This Task Exists

Efeonce ya tiene una landing SEO, una landing AEO y el AI Visibility Grader, pero hoy no existe una superficie que enseñe su relación sistémica. El ebook Surround Discovery contiene el marco que cierra el circuito. Sin una landing propia se desperdicia un activo de demanda/educación y se deja al visitante decidir entre tácticas aisladas sin entender dónde empieza el descubrimiento.

## Goal

- Ofrecer el ebook por una landing Astro nativa de Think, con una tesis clara: competir por descubrimiento, no por una posición aislada.
- Explicar con precisión las cinco superficies y S⁴, sin convertir `SOLVE` en una metodología separada ni prometer resultados garantizados.
- Consumir el Growth Form de TASK-1386 sin duplicar fields, consentimiento, validación, captcha o entrega; medir la adquisición mediante contratos GTM/GA4 existentes.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `docs/think/README.md`
- `docs/think/architecture-ui-patterns.md`
- `docs/reference/ebook-lead-magnet-playbook.md`
- `docs/public-site/decisions/PDR-003-layering-ecosistema-digital-efeonce.md`
- `docs/context/05_voz-tono-estilo.md`
- `docs/context/06_glosario-metricas.md`

Reglas obligatorias:

- Think es la superficie de demand-gen y nurturing; el sitio público convierte demanda de servicio. Esta landing es editorial/gated, no una página comercial WordPress.
- Reusar `BaseLayout`, tokens de `src/lib/report-tokens.ts`, el renderer `<greenhouse-form>` y patrones de `/brand-visibility`/`/web-agentica`; no importar el diseño literal del PDF ni crear un form local.
- Beneficio antes de sigla: explicar el sistema antes de profundizar en Surround Discovery™, S⁴ o AEO.
- Usar sólo afirmaciones comprobables en la página; el ebook puede enseñar el método, pero la landing no garantiza ranking, citas ni ventas.
- La landing debe conservar contenido completo y funcional sin motion, sin hover y a 390 px; ningún contenido crítico se esconde en un carrusel, tooltip o visual decorativo.

## Normative Docs

- `docs/think/brand-visibility-landing.md`
- `docs/ui/wireframes/aeo-service-surround-discovery-section.md`
- `docs/tasks/in-progress/TASK-1374-web-agentica-ebook-landing.md`
- `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md`
- `.codex/skills/astro/SKILL.md`
- `.codex/skills/seo-aeo/SKILL.md`

## Dependencies & Impact

### Depends on

- TASK-1386: `form_key`, surface, asset delivery and browser-surface evidence.
- `/Users/jreye/Documents/efeonce-think/src/layouts/BaseLayout.astro`
- `/Users/jreye/Documents/efeonce-think/src/pages/brand-visibility/index.astro`
- `/Users/jreye/Documents/efeonce-think/src/pages/web-agentica/index.astro`
- Ebook verificado: `Surround Discovery_Final.pdf`, 61 páginas; SEO, AEO, Video Discovery, Social Discovery, Marketplace Optimization y S⁴.

### Blocks / Impacts

- Añade un nodo editorial de Think que enlaza de forma contextual hacia el grader, SEO y AEO sin competir con sus objetivos propios.
- Habilita distribución content-led, newsletter y campañas con UTMs; no modifica las landings hermanas en este alcance.

### Files owned

- `/Users/jreye/Documents/efeonce-think/src/pages/surround-discovery/index.astro` (ruta propuesta; confirmar el slug final antes de registrar canonical).
- `/Users/jreye/Documents/efeonce-think/src/components/SurroundDiscoveryFormDock.astro` o extensión mínima de un patrón existente.
- `/Users/jreye/Documents/efeonce-think/src/styles/**` sólo si el repositorio establece un home local equivalente.
- `docs/ui/wireframes/TASK-1387-surround-discovery-ebook-landing.md`
- `docs/ui/flows/TASK-1387-surround-discovery-ebook-landing-flow.md`
- `docs/ui/motion/TASK-1387-surround-discovery-ebook-landing-motion.md`

## Current Repo State

### Already exists

- Think publica el AI Visibility Grader y `/web-agentica`; ambos validan el patrón Astro + `BaseLayout` + Growth Form gobernado.
- El grader mide una lectura específica de visibilidad en motores de respuesta; SEO y AEO tienen sus propias superficies de servicio.
- El ebook y su asset privado ya existen, pero no la página, el route canonical, el host/form ni el copy de Surround Discovery.

### Gap

- No hay una narrativa que enseñe que las cinco superficies operan como sistema y que muestre el ciclo `SENSE → SHAPE → SURFACE → SOLVE`.
- No hay una captura instrumentada y accesible que entregue este ebook sin convertirlo en una landing genérica de "SEO + IA".

## Modular Placement Contract

- Topology impact: `public`
- Current home: `efeonce-think` Astro, con la capability de captura en Greenhouse Growth Forms.
- Future candidate home: `public`
- Boundary: Think compone contenido, presentación y navegación; Growth Forms posee campos, submit, PII, consent, captcha y asset delivery.
- Server/browser split: metadata/JSON-LD y markup se resuelven en Astro; cualquier browser script sólo reacciona a eventos allowlisted del renderer y nunca importa secretos, DB o SDKs.
- Build impact: assets WebP/SVG locales optimizados; no new animation runtime, no PDF en el repo y no input de filesystem del PDF.
- Extraction blocker: la página ya vive en el build unit público Think; la entrega depende del API/asset private contract de Greenhouse.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: decisor/a de marketing, growth o dirección que llega desde búsqueda, una landing SEO/AEO, el grader, contenido o campaña.
- Momento del flujo: reconoce que la búsqueda está fragmentada pero aún no sabe cómo ordenar canales y activos.
- Resultado perceptible esperado: entiende el mapa de cinco superficies, identifica S⁴ como ciclo operativo y descarga el ebook sin abandonar la página ni exponerse a un formulario improvisado.
- Fricción que debe reducir: la falsa elección SEO versus AEO, jerga de metodologías y ansiedad por dejar datos sin saber qué recibe.
- No-goals UX: dashboard, auditoría interactiva, calculadora de score, reunión forzada, carrusel de canales, promesa de ranking o copia literal del PDF.

### Surface & system decision

- Surface: Think, ruta pública indexable `/surround-discovery` propuesta y su canonical equivalente.
- Composition Shell: `no aplica` — landing editorial Astro; no es una nueva superficie de portal Greenhouse.
- Primitive decision: `reuse` — `BaseLayout`, `<greenhouse-form>` y patrón de form dock; secciones editoriales route-locales, no primitive de portal.
- Adaptive density / The Seam: `no aplica` — no se introducen cards de portal ni regiones adaptativas; el grid editorial colapsa a una sola columna móvil.
- Floating/Sidecar/Dialog decision: no aplica; FAQ usa disclosure nativo y los CTAs navegan/scroll, sin overlays.
- Copy source: copy local de Think, alineado a `docs/context/05_voz-tono-estilo.md`; los campos/consent del form vienen del render contract.
- Access impact: `none`; contenido público con controls anti-abuso heredados del form.

### State inventory

- Default: hero, mapa de superficies, S⁴, contenido del ebook, proof/relación con herramientas hermanas, form y FAQ visibles.
- Loading: dock con skeleton y texto honesto mientras el renderer obtiene el contract.
- Empty: `Formulario no disponible` si el contract no devuelve campos publicables, con retry/contacto público.
- Error: copy sanitizado del renderer y recuperación; nunca exponer CORS, bucket, token o stack trace.
- Degraded / partial: si `download_url` falta luego de accepted, success card confirma aceptación sin decir que la descarga comenzó y ofrece recuperación clara; se registra como defecto de TASK-1386.
- Permission denied: origin/surface no autorizada no debe salir a producción; la UI muestra estado honesto sólo en evidencia prelaunch.
- Long content: cinco superficies y S⁴ en semántica vertical, con navegación de ancla opcional no bloqueante.
- Mobile / compact: 390px en columna única, CTA visible, targets ≥44px y ningún overflow.
- Keyboard / focus: skip link; CTA y `<details>` nativos; después de success/error foco al heading del estado.
- Reduced motion: contenido y mapa visibles sin animación; ningún significado depende de entrada, conexión o hover.

### Interaction contract

- Primary interaction: CTA hero desplaza al dock; submit pertenece al renderer; success dispara download gated a partir de `download_url` y permite recuperación.
- Hover / focus / active: superficies y pasos S⁴ pueden reforzar borde/tono sólo como feedback; se leen completos sin hover y tienen focus visible cuando sean links.
- Pending / disabled: renderer posee pending y evita doble submit; el host no crea un segundo botón ni spinner competidor.
- Escape / click-away: no aplica; no existen modals, dialogs ni popovers.
- Focus restore: en navegación por ancla el browser mantiene contexto; luego de submit el host enfoca el heading de confirmación/error sin focalizar el live region completo.
- Latency feedback: skeleton al cargar y estado textual durante submit; no progreso falso ni porcentaje estimado.
- Toast / alert behavior: no toast global; estados inline y `aria-live=polite` del renderer/host.

### Motion & microinteractions

- Motion primitive: `CSS`
- Enter / exit: reveal corto de secciones al entrar en viewport; form success es swap calmado, no celebración.
- Layout morph: ninguno; grids responden por CSS sin animar width/height.
- Stagger: sólo los cinco nodos de superficie y cuatro pasos S⁴, breve y sin ocultar contenido cuando JS no corre.
- Timing / easing token: usar variables/tokens existentes de Think; `160–280ms ease-out` para feedback y no introducir valores crudos repetidos.
- Reduced-motion fallback: render inmediato, sin orbitas, parallax, conteos, auto-scroll ni stagger.
- Non-goal motion: no GSAP, Lottie, canvas, cursor fake, scroll-jacking, pulsos que simulen telemetría ni movimiento que sugiera resultados reales.

### Implementation mapping

- Route / surface: `src/pages/surround-discovery/index.astro` en Think; confirmar canonical, sitemap y `llms.txt` durante Discovery.
- Primitive / variant / kind: `BaseLayout`; renderer `<greenhouse-form form-key="<TASK-1386>" surface="<TASK-1386>">`; `<details>` FAQ.
- Component candidates: `SurroundDiscoveryMap`, `SurroundDiscoveryCycle`, `SurroundDiscoveryFormDock` route-locales sólo si reducen complejidad de la page; no construir un design system paralelo.
- Copy source: constants tipadas cercanas a la ruta; `EBOOK_FORMS` es dueño exclusivo de copy/fields del contrato form.
- Data reader / command: none in Think; form contract/API de Greenhouse, browser-safe.
- API parity: Think no tiene endpoint propio de submit; es client del primitive gobernado.
- Access / capability: public; CORS/surface/captcha son responsabilidad de TASK-1386.
- States to implement: ready/loading/empty/error/denied/success/degraded, responsive and reduced-motion definidos arriba.

### GVC scenario plan

- Scenario file: añadir scenario declarativo Think o verifier Playwright con nombre `surround-discovery-ebook-landing` en su repositorio.
- Route: `/surround-discovery` local y producción.
- Viewports: 1440 y 390; reduced-motion al menos en 1440 o 390 según el path más expresivo.
- Required steps: hero → CTA scroll → cinco superficies → S⁴ → dock loading/ready → FAQ → success/error controlado y bridge al grader.
- Required captures: hero desktop/mobile, mapa en estado estático, S⁴, dock ready, dock success, FAQ/final, reduced-motion.
- Required `data-capture` markers: `surround-discovery-landing`, `surround-discovery-hero`, `surround-discovery-surfaces`, `surround-discovery-cycle`, `surround-discovery-form`, `surround-discovery-faq`, `surround-discovery-final`.
- Assertions: H1 único; form real por `form_key`; CTA hero llega al dock; download flow no depende de URL pública; headings/FAQ/JSON-LD no duplican datos; no console/page errors.
- Scroll-width checks: `document.documentElement.scrollWidth === document.documentElement.clientWidth` a 1440 y 390.
- Reduced-motion / focus evidence: nodos estáticos con `prefers-reduced-motion`; foco success/error y controles keyboard inspeccionados.

### Design decision log

- Decision: mapa editorial con la marca al centro y cinco superficies alrededor, seguido por el ciclo S⁴; el valor se entiende antes de pedir el correo.
- Alternatives considered: landing de ebook genérica; dashboard mock; cinco cards independientes sin sistema; mezclar la oferta comercial en el hero.
- Why this pattern: hace visible la relación entre SEO, AEO, grader y las otras superficies sin confundir el ebook con una landing de servicio ni fabricar datos.
- Reuse / extend / new primitive: reusar Think/Growth Forms; componentes editoriales locales solamente.
- Open risks: slug/canonical aún propuesto; datos de performance o casos no deben entrar sin fuente verificable; email/HubSpot no se promete antes de TASK-1386 rollout evidence.

### Visual verification

- GVC scenario: `surround-discovery-ebook-landing`.
- Viewports: desktop 1440, mobile 390 y reduced motion.
- Required captures: definidos en GVC scenario plan.
- Required `data-capture` markers: definidos en GVC scenario plan.
- Scroll-width check: ambos viewports, truth source `scrollWidth`.
- Accessibility/focus checks: orden H1→H2, details keyboard, focus success/error, contrast y target size.
- Before/after evidence: referencia = PDF Surround Discovery y patrones Think existentes; no se persigue pixel parity del PDF.
- Known visual debt: ninguna aceptada; si falta asset propietario, degradar a diagrama CSS/SVG semántico antes que usar stock art.

<!-- ZONE 2 — PLAN MODE: no llenar al crear -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Foundation editorial + SEO/AEO

- Crear la ruta nativa, `BaseLayout`, title/description/canonical/OG y JSON-LD limitado a entidades visibles (`WebPage`, `Book`, `FAQPage` sólo si el FAQ exacto queda visible).
- Escribir la narrativa por niveles: problema de descubrimiento fragmentado → cinco superficies → ciclo S⁴ → contenido del ebook → captura.
- Definir enlace contextual al grader, SEO y AEO sin redirecciones opacas ni competir con el CTA principal de descarga.

### Slice 2 — Mapa, método y contenido legible

- Implementar el mapa visual de cinco superficies con alternativa textual/semántica equivalente.
- Implementar S⁴ con sus sentidos precisos: SENSE (señales/intención), SHAPE (activos/calibración de marca), SURFACE (distribución multi-superficie), SOLVE (impacto y retroalimentación adaptativa).
- Usar el PDF como fuente de temas; no copiar páginas largas ni introducir claims no verificados.

### Slice 3 — Captura y handoff

- Montar el `<greenhouse-form>` publicado por TASK-1386 con host card/rail editorial; no crear inputs locales.
- Escuchar sólo el evento allowlisted de accepted para iniciar `download_url`, gestionar focus y pintar una recovery action tokenizada.
- Mantener un único puente post-descarga al grader; no prometer email/HubSpot si no están verificados.

### Slice 4 — Medición, QA y rollout

- Confirmar `generate_lead` genérico, añadir/registrar CTAs medibles según la taxonomía si su primitive existe, y conservar UTM campaign value en el browser-safe allowlist.
- Ejecutar GVC/verifier desktop+mobile+reduced-motion, browser smoke real de Turnstile/CORS, audit SEO de ruta y evidencia de no overflow.
- Desplegar según workflow de Think; documentar release/evidence y no declarar live con download o captura simulados.

## Out of Scope

- Publicar/configurar el Growth Form, bucket, email delivery, HubSpot mapping, Turnstile o GTM container (TASK-1386 / controles existentes).
- Rediseñar las landings SEO, AEO, grader o el PDF.
- Cambiar el scoring del grader, el marco de cinco niveles de AI Visibility o presentar S⁴ como una alternativa al framework de visibilidad en IA.
- Producir imágenes generativas nuevas sin un brief/asset aprobado; el sistema visual debe nacer de diagramación y activos de marca disponibles.

## Detailed Spec

### Narrative hierarchy and copy constraints

1. **Hero:** el problema es que la intención se fragmentó; el H1 trabaja sobre descubrimiento, no sobre un keyword de SEO ni una promesa de "ser inevitable" sin mecanismo.
2. **Reframe:** SEO/AEO no se descartan; son dos superficies/disciplinas necesarias dentro de un sistema mayor.
3. **Five surfaces:** SEO, AEO, Video Discovery, Social Discovery y Marketplace Optimization. Cada superficie responde a una pregunta del comprador, no es una lista de servicios.
4. **S⁴:** presenta un loop: escuchar la intención, construir activos, distribuirlos y conectar la respuesta con negocio/aprendizaje. `SOLVE` es la cuarta etapa de Surround Discovery™.
5. **Value exchange:** el ebook explica el mapa; el form pide los datos estándar y entrega PDF inmediato tras aceptación.
6. **Bridge:** el grader responde “¿cómo te ven hoy los motores de respuesta?”; no pretende evaluar las cinco superficies ni reemplazar el ebook.

### SEO/AEO contract

- Un H1, contenido answer-first visible y párrafos autónomos que expliquen el método sin esconder la definición en un gráfico.
- Metadata orientada a la guía, no a un servicio de agencia; canonical sin slash/index conflict y sitemap/robots acorde al runtime Think.
- `FAQPage` sólo para preguntas visibles, sin ratings, fechas, precios, autores o claims no presentes.
- No usar `llms.txt` como sustituto de contenido visible ni como claim de optimización.

## Rollout Plan & Risk Matrix

| Riesgo | Mitigación | Gate |
| --- | --- | --- |
| Landing visualmente bonita pero sin captura real | TASK-1386 entrega `form_key` y browser smoke antes del release | submit/asset access reales |
| Sobrepromesa SEO/AEO | copy ledger y review contra framework/ebook | no guarantees, claims con fuente |
| Mapa ilegible o decorativo en mobile | alternativa textual + 390px GVC | headings, touch targets, scroll-width |
| Motion reduce accesibilidad o LCP | CSS-only, progressive enhancement y reduced motion | GVC + performance/browser review |
| Métrica inconexa | form genérico `generate_lead`; CTAs con `cta_id/location` | tracking plan + `/g/collect` evidence |

- Rollback path: revertir el deployment Think a la versión anterior y deprecar/desactivar el form si el issue es de captura; no borrar assets/submissions.
- External coordination: release de Think, flags/renderer/runtime de Greenhouse y posible publish GTM sólo con confirmación humana si no cubre el pipeline genérico.

## Verification

- `pnpm type-check` y `pnpm build` dentro de `/Users/jreye/Documents/efeonce-think`.
- GVC/verifier de Think para 1440, 390 y reduced-motion con checks de `scrollWidth`.
- GET de render contract por `form_key`, browser submit real desde Think, accepted event, `generate_lead` y asset access.
- Revisión manual de JSON-LD, canonical, robots, copy/claims, focus, consent y recovery.

<!-- ZONE 4 — ACCEPTANCE & HANDOFF -->

## Acceptance Criteria

- [ ] Se declara `Execution profile: ui-ux`, `UI impact: flow`, wireframe, flow y motion existentes; `pnpm ui:wireframe-check`, `ui:flow-check`, `ui:motion-check` y `ui:readiness-check` pasan para TASK-1387.
- [ ] La ruta explica las cinco superficies y S⁴ con terminología correcta; `SOLVE` nunca se presenta como metodología separada.
- [ ] `BaseLayout`, tokens Think y `<greenhouse-form>` se reutilizan; no hay inputs/consent/captcha/submit locales ni URL pública del PDF.
- [ ] Default, loading, empty, error, denied, success, degraded, teclado, mobile y reduced-motion tienen comportamiento explícito.
- [ ] El CTA principal descarga el ebook tras submit aceptado; el bridge post-éxito al grader no desplaza la entrega prometida.
- [ ] SEO/AEO técnico es visible y honesto: H1/canonical/metadata/JSON-LD/FAQ sin datos inventados.
- [ ] GVC desktop 1440, mobile 390 y reduced motion fueron revisados; scroll horizontal de página es cero y no hay errores de consola/app.
- [ ] Medición registra y verifica el lead; ningún evento contiene PII, token o URL privada.

## Handoff Notes

- Requiere de TASK-1386: `form_key`, `surface`, title/body final del success contract y evidencia de descargable en producción.
- Si falta la evidencia runtime, el estado correcto es `code complete, rollout pendiente`; no declarar la landing live por el mero hecho de que la composición se vea lista.

## Closing Protocol

1. Guardar el route/canonical final, capturas GVC y evidencia de navegador real en la task y Handoff.md.
2. Sincronizar `TRACKING-PLAN.md`, la guía de ebooks y changelog cuando la landing esté realmente disponible.
3. Ejecutar `pnpm docs:closure-check` y mover a `complete/` sólo tras verificar metadata, captura, descarga, medición y rollback de la release.
