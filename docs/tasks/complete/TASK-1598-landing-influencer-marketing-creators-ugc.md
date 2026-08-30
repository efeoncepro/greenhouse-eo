# TASK-1598 — Landing pública Influencer Marketing, Creators & UGC

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `motion`
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-1598-landing-influencer-marketing-creators-ugc.md`
- Flow: `docs/ui/flows/TASK-1598-landing-influencer-marketing-creators-ugc-flow.md`
- Motion: `docs/ui/motion/TASK-1598-landing-influencer-marketing-creators-ugc-motion.md`
- Form style: `docs/ui/GROWTH_FORM_EDITORIAL_PREMIUM_BRIEF_STYLE_V1.md`
- Backend impact: `none` (reuso de Growth Forms, Growth CTA y Meetings)
- Epic: `EPIC-019`
- Domain: `public-site|growth|media-distribution`
- Blocked by: `none`
- Promotion blocked by: `none`
- Branch: `task/TASK-1598`

## Summary

Construir una landing pública que convierta Creator Influence & Content en demanda calificada. La página debe explicar
que Efeonce conecta fit de audiencia, contenido de creators/UGC, derechos, amplificación y aprendizaje; no vender una
lista de influencers ni prometer resultados no controlables.

Live route: `/servicios/agencia-de-influencers/`. La intención comercial y el slug se validaron con keyword/SERP
research para Chile, Colombia, México y Perú antes de publicar.

## Execution authorization · 2026-08-28

El operador autorizó construir la landing como página Elementor en el sitio público, usando el export aprobado de
Claude Design, conservando el header y footer globales de Efeonce y permitiendo widgets adicionales sólo si el runtime
los necesita. La construcción, publicación, canonical, indexación y promoción quedaron autorizadas y aplicadas
después de resolver los gates declarados en `Promotion blocked by`.

Fuente visual versionada: `docs/ui/sources/TASK-1598/claude-design-source-2026-08-28.zip`.

## Goal

- Capturar demanda comercial de influencer marketing, creators y UGC.
- Convertir intención alta en reunión e intención media en un brief gobernado.
- Hacer visible la diferencia entre Influencer Marketing, UGC, Partnership y Whitelisting.
- Probar el método con evidencia, rights matrix, ejemplos autorizados y medición, no con hype.
- Instrumentar el funnel landing → brief/reunión → oportunidad con los contratos existentes.

## Architecture alignment

Leer y respetar:

- `docs/public-site/decisions/PDR-016-landing-influencer-marketing-creators-ugc-posicionamiento.md`
- `docs/business-models/media-distribution/CREATOR_INFLUENCE_CONTENT_OPERATING_CONTROL_PACK_V1.md`
- `docs/business-models/media-distribution/CREATOR_INFLUENCE_CONTENT_RIGHTS_AND_USAGE_INTEGRITY_PACK_V1.md`
- `docs/services/media-distribution/CREATOR_INFLUENCE_CONTENT_SERVICE_V1.md`
- `docs/context/09_marca-agencia.md`, `docs/context/13_icp-buyer-personas-jtbd.md`, `docs/public-site/README.md`
- `docs/public-site/CREATOR_INFLUENCE_CONTENT_LANDING_SEO_AEO_BRIEF_V1.md`

Rules:

- Liderar Efeonce; no presentar Globe o Reach como marcas independientes.
- Separar audiencia, contenido, derechos, paid usage, whitelisting, exclusividad, fees y media.
- No reconstruir Growth Forms, Growth CTA, Meetings, HubSpot ni tracking.
- No usar cifras de mercado, performance o fees sin fuente, fecha y condición.
- Tuteo neutro; nunca voseo.
- El brief debe preguntar lo necesario para calificar sin convertir la landing en un formulario de procurement.

## Modular Placement Contract

- Topology impact: `public`
- Current home: sitio público WordPress/Ohio en Kinsta; página Elementor nueva bajo `/servicios/`.
- Future candidate home: `public`
- Boundary: WordPress posee la composición y consume los contratos gobernados de Growth Forms, Growth CTA y Meetings; la landing no reconstruye captura, destino, scheduler, CRM ni medición.
- Server/browser split: el navegador recibe sólo `form_key`, `surface_id`, `scheduler_key` y atributos allowlisted; destinos, mappings, secretos, disponibilidad y recibos viven server-side en Greenhouse.
- Build impact: `none` — composición Elementor page-scoped; no se modifica el plugin compartido ni se agrega un runtime paralelo.
- Extraction blocker: `none`

## Scope

### Slice 1 — Discovery y demanda

- Validar keyword, slug, mercados y canibalización.
- Ejecutar el brief SEO/AEO: SERP por `cl`, `co`, `mx`, `pe`, query fan-out, entidades, competidores y contrato técnico de indexación.
- Confirmar buyer, JTBD, objeciones y términos de búsqueda.
- Confirmar casos, assets, testimonios y ejemplos de método publicables.
- Decidir si la landing necesita un satélite editorial en Think; queda fuera de esta task.

### Slice 2 — Mensaje y conversión

- Copywriting: one thing, headline, proof, objections, FAQ y CTA.
- CRO: primera pantalla, jerarquía de acciones, fricción, trust, progressive disclosure y experiment backlog.
- Digital marketing: canal mix inicial, UTMs y mensajes por paid/organic/referral.
- Form: definir `creator-influence-brief` o nombre equivalente, campos, consentimiento, success card y destino.
- Redactar answer capsules de 40–60 palabras bajo H2/H3 con preguntas reales; no prometer rich results ni datos no verificados.

### Slice 3 — Dirección visual y wireframe

- Producir 2–3 direcciones visuales y seleccionar una.
- Mostrar el sistema `fit → contenido → derechos → distribución → aprendizaje` como experiencia.
- Usar una sección firma de assets/rights/content, sin muro genérico de cards.
- Consultar Modern Web Guidance para form, dialogs/accordions, performance y a11y; extraer intención, no copiar código.

### Slice 4 — Build público

- Implementar en WordPress/Ohio con scope page-specific según `efeonce-public-site-wordpress`.
- Reusar `<greenhouse-form>`, `<greenhouse-cta>` y `open_meeting_scheduler` cuando los contratos estén listos.
- Añadir JSON-LD `Service`, `Organization`, `FAQPage` y `BreadcrumbList` sólo con datos aprobados.
- Mantener el contenido crítico en HTML inicial, canonical autorreferente sólo tras validar slug, `index/follow` después del QA y sitemap/lastmod honestos.
- Implementar enlaces internos desde `/servicios`, `/servicios/redes-sociales/` y `/agencia-creativa/` sólo con destinos vigentes y roles no canibalizantes.
- Registrar landing reference, route ownership y tracking plan.

### Slice 5 — QA y promoción

- Capturar 1440px, 390px, teclado, reduced motion y estados del form.
- Verificar CWV, overflow, focus, schema, canonical/noindex/indexación y UTMs.
- Publicar inicialmente con estado controlado/noindex si el contrato de prueba o form aún no está validado.
- Promover sólo después de evidence review, no sólo al terminar el markup.

## Funnel and measurement

Primary conversion: `gh_meeting_booking_confirmed` server-confirmed. Secondary: submission aceptada del form de brief.
Micro-events: CTA viewed/clicked, form started, form field error, form submitted, meeting step reached, FAQ opened.

Antes de crear eventos nuevos, cargar `docs/reference/measurement-gtm-ga4/04-greenhouse-gh-event-convention.md` y
`TRACKING-PLAN.md`; reusar la familia vigente `gh_form_*`, `gh_cta_*` y `gh_meeting_*`. No mandar PII, fees, claims,
creator names ni brief completo al dataLayer.

North Star de la landing: **briefs o reuniones calificadas por visita**, no clicks o impresiones aisladas.
Guardrails: form completion rate, meeting booking rate, lead quality, spam rate, bounce/engaged visit, CWV y cero
leaks de PII.

## SEO/AEO launch contract

La página debe nacer lista para búsqueda antes de promoverse:

- title, meta description, H1, OG/Twitter metadata y excerpt alineados con la intención validada;
- HTML inicial con la propuesta, respuestas, ofertas, derechos, FAQ y CTAs; no contenido crítico sólo después de JS;
- H2/H3 como preguntas reales y answer capsules visibles de 40–60 palabras cuando la respuesta lo requiera;
- `Service` de la oferta, `Organization` de Efeonce y `BreadcrumbList` coherentes; `FAQPage` sólo si el FAQ es visible y
  válido, sin prometer que Google mostrará un rich result;
- canonical autorreferente, `index, follow`, sitemap/lastmod, robots y enlace desde `/servicios` sólo al pasar QA;
- enlaces internos con roles diferenciados respecto de `/servicios/redes-sociales/` y `/agencia-creativa/`;
- imágenes rastreables con ALT, dimensiones, caption/contexto y fallback estático;
- validación de entidad, marca, mercados y claims; ningún schema o copy debe introducir Greenhouse, Globe o Reach como
  prestadores independientes;
- verificación de URL renderizada, Rich Results/Schema validator, indexación y CWV antes del cutover.

El seguimiento de prompts IA, citation share y exactitud es un follow-up editorial/measurement posterior; no se construye
un panel nuevo ni se convierte en dependencia de esta landing.

## Acceptance criteria

- [x] Keyword, slug, canonical y mercados validados.
- [x] SERP, intent map, query fan-out, entidades, competidores y arquitectura de contenido documentados.
- [x] Landing explica las cinco capas y diferencia Influencer, UGC, Partnership y Whitelisting.
- [x] H1 y primera pantalla tienen una promesa específica y CTA dual claro.
- [x] Sólo se usan casos/assets/pruebas autorizados o rotulados como ilustrativos.
- [x] Form de brief gobernado, con consentimiento, Turnstile/política aplicable, success/error y destino definidos.
- [x] Meetings y CTA reusan contratos existentes y conservan la medición server-confirmed del scheduler.
- [x] Tracking Plan actualizado; eventos sin PII y UTMs consistentes.
- [x] JSON-LD válido y copy citable sin promesas no demostradas.
- [x] HTML crítico rastreable sin depender de interacción JS; schema sólo marca contenido visible.
- [x] Enlaces internos, sitemap, canonical y robots quedan verificados; no se promete FAQ rich result.
- [x] GVC desktop/mobile/reduced-motion/keyboard sin overflow ni errores de consola.
- [x] Performance móvil y estados degradados verificados.
- [x] Landing registry y referencia espejo `.codex`/`.claude` actualizados.
- [x] Promoción/canonical/indexación aprobada por el owner del sitio público.

## Completion evidence · 2026-08-28

- WordPress page `251627`, `publish`, parent `251077`, Elementor `builder/default`; live URL
  `https://efeoncepro.com/servicios/agencia-de-influencers/`.
- Elementor data hash `29027728e50874411c6bf1450fa28d3f8161d189e10e3f83123722c7e3345c04`.
- DataForSEO confirmó `agencia de influencers` como intención comercial del seed set; `influencer marketing`
  conservó intención predominantemente informacional. Volumen observado para la keyword elegida: `170` CL,
  `170` MX, `50` CO y `50` PE.
- Growth Form publicado: `efeonce-creator-influence-brief`, form key
  `d2c68012-2a6b-41d6-b3dd-4b8ccbff6ee3`, surface `fhsf-efeonce-creator-influence`; seis campos requeridos,
  consentimiento, Turnstile invisible, email corporativo y retención `730d`. La captura gobernada queda en
  Greenhouse; el destino directo HubSpot conserva el gate general del sitio público.
- Meeting canónico: surface `fhsf-efeonce-lead-gen-web`, scheduler `discovery`, sin enlaces ni copy del proveedor.
- Navegación: menu item `251638`, padre `Servicios Destacados` (`248629`), con snapshot
  `_gh_backup_before_task1598_menu_20260829T003200Z`.
- Readback live: HTTP `200`, un H1, header/footer Ohio, 12 secciones, cuatro videos `readyState=4`, imágenes rotas `0`,
  consola `0`, canonical autorreferente, robots `index, follow`, sitemap con `lastmod`, schema `Service`,
  `BreadcrumbList` y `FAQPage` válido.
- Capturas 1440/390/reduced-motion en
  `/Users/jreye/.codex/visualizations/2026/08/28/01a04a9b-9526-7f43-9fcd-439da370a0a6/`; `scrollWidth === clientWidth`
  en ambos viewports. Empty submit mostró seis errores inline y summary; meeting/FAQ abrieron con interacción.
- Laboratorio Playwright post-cache: desktop LCP `2136ms`, CLS `0.00022`; móvil 390 LCP `1280ms`, CLS `0`; cero
  long tasks observadas. No sustituye datos de campo.
- Rollback page snapshots: `_gh_backup_before_task1598_20260829T001722Z`,
  `_gh_backup_before_task1598_render_fix_20260829T002005Z` y
  `_gh_backup_before_task1598_index_20260829T002549Z`.
- No se creó una reserva ni un lead ficticio durante QA. El submit real y el evento de booking se validarán con la
  primera interacción humana; esta limitación no altera el contrato publicado de los componentes gobernados.

## Reopened · 2026-08-28 — live fidelity regression

El owner revisó el runtime publicado a 890×911 y rechazó la fidelidad del reproductor/hero. La adaptación inicial
preservó gran parte del markup, pero retiró el runtime interactivo del export: el hero no avanzaba por sus tres clips,
el control de sonido no existía, las ofertas perdieron semántica/selección, el CTA sticky desapareció, los reveals
quedaron deshabilitados y las decoraciones sociales/sticker se ocultaban o se habían eliminado. La task vuelve a
`in-progress` hasta reconstruir esos contratos con JavaScript page-scoped, conservar Growth Form/Meeting canónicos y
repetir la auditoría completa desktop/tablet/mobile/reduced-motion.

## Fidelity remediation evidence · 2026-08-28

- La causa raíz fue el compilador de la primera publicación: convirtió los botones del export en `span`, retiró
  handlers/bindings, eliminó el sticker remoto, aplanó los reveals y ocultó decoraciones con posición negativa bajo
  900 px. El smoke anterior confirmó assets cargados, pero no ejercitó la secuencia ni las interacciones del source.
- Se recompiló el diseño aprobado como once widgets HTML page-scoped dentro de Elementor, guardados mediante
  `Elementor\Document::save()`. El header/footer permanecen en Ohio y el Growth Form conserva su contrato.
- Hash Elementor post-fidelidad, previo al hardening SEO: `a0c446c66aad68ddba536d7094527279444e5bcf49d1bfc8af0000065371f68d`.
  Snapshot inmediato de rollback: `_gh_backup_before_task1598_fidelity_repair_20260829T022153Z`; snapshots CTA
  anteriores: `_gh_backup_before_task1598_fidelity_repair_20260829T022058Z` y
  `_gh_backup_before_task1598_fidelity_repair_20260829T021926Z`.
- El reproductor hero rota los tres clips aprobados, pinta tres barras de progreso y ofrece play/pausa y sonido. Se
  restauraron badge `con derechos`, stack social, pulgar decorativo, selección accesible de cinco ofertas, CTA sticky
  y reveals. El SVG del pulgar quedó sanitizado y embebido, SHA-256
  `f227bbf0944ae1418acec7138d6710a52d275e96cce8ca15753f327432896271`; no se conserva la URL firmada en runtime.
- Los siete botones comparten tipografía AXIS Geist 600, tamaños y variantes explícitas, borde visible, hover/active,
  foco doble y target mínimo de 44 px. En el hero, `Agenda una reunión` conserva el único fill y se expande a 390 px;
  `Cuéntanos tu campaña` es un enlace secundario transparente con target de 44 px. El sticky permanece `inert` y
  fuera del tab order mientras está oculto. Los iconos de CTA no usan disco, caja ni fondo circular.
- El intro de conversión queda sticky a 32 px junto al formulario desde 761 px; en 760 px o menos se apila antes del
  formulario y vuelve a `position: static`.
- El intro del FAQ conserva sticky sólo sobre 900 px, cuando el acordeón cabe a su lado. A 900 px o menos se apila,
  queda estático y mantiene 28 px de separación para impedir superposición durante el scroll.
- El form final muestra un enlace humano de privacidad, elimina ayudas redundantes de las parejas de campos y
  presenta selects con indicador tonal propio. El bloque de reunión usa el CTA gobernado
  `influencer-discovery-meeting`, que ejecuta `open_meeting_scheduler` sobre
  `fhsf-efeonce-lead-gen-web` / `discovery` en task surface nativa; el host no contiene enlaces HubSpot.
- Gate durable: `pnpm public-website:verify-influencer-landing-fidelity`. Pasó live post-cache en 1536×911,
  1440×1000, 890×911 y 390×844, además de reduced motion: el kicker y el reproductor conservan al menos 28 px
  bajo el masthead Ohio, secuencia 1→2→3, controles, ofertas por teclado, Growth Form registrado y montado con
  siete bloques de campo + submit, Growth CTA y scheduler nativo canónicos, seis videos únicos, sticker 2048 px,
  social stack dentro del viewport, CTA sticky, iconos sin círculos,
  layout sticky de conversión en 1536/1440/890, apilado estático en 390, FAQ sin intersección y estático en 890/390,
  cero bindings sin compilar, cero errores de consola y `scrollWidth === clientWidth`.
- Capturas inspeccionadas:
  `.captures/task1598-influencer-fidelity-2026-08-29T01-53-31-450Z/`.
- La regresión del formulario vacío se corrigió cargando el renderer canónico
  `https://greenhouse.efeoncepro.com/growth-forms/renderer-latest.js` además del loader del meeting. El host conserva
  un fallback honesto mientras el custom element no monta; el gate ahora falla si sólo existe la etiqueta vacía.
- El host del form se elevó a dirección editorial premium sin alterar el contrato: header + trust chrome, seis iconos
  lineales, controles de 56 px/16 px, focus/autofill/error reforzados, selects tonales, consentimiento tonal, enlace
  humano de privacidad y submit full-width.
  Scorecard: `docs/ui/reviews/TASK-1598-influencer-growth-form-premium-2026-08-28.md` (`PASS`, `4.68/5`). Capturas:
  `.captures/task1598-influencer-fidelity-2026-08-29T02-22-01-382Z/` y
  `.captures/task1598-form-premium-live-2026-08-29T0206Z/`.
- No se creó lead ni reserva ficticia durante esta remediación.

## SEO/AEO hardening evidence · 2026-08-29

- Se publicó el paquete SEO final: title `Agencia de influencers y UGC para marcas | Efeonce`, description de 147
  caracteres, focus keyphrase `agencia de influencers`, canonical autorreferente, `index, follow`, excerpt y metadata
  Open Graph/Twitter diferenciada.
- La imagen social dedicada es el attachment `251693`, PNG `1200×630`, con SHA-256
  `7d26ce8bdc3b88e6dea95276fff8ded4212a88fcb27cff8888bdcd09506493aa`; no reemplaza `_thumbnail_id` ni el hero Ohio.
- Yoast conserva `WebPage`, `BreadcrumbList`, `WebSite` y `Organization`; el schema page-scoped añade únicamente
  `Service` con cinco ofertas y `FAQPage` con las seis respuestas visibles. `provider` referencia el `@id` canónico y
  no existe un breadcrumb duplicado.
- El menú conserva `Influencer Marketing` bajo `Soluciones → Servicios Destacados`, inmediatamente después de
  `Redes Sociales`. No se añadió otra columna o taxonomía de navegación.
- `pnpm public-website:verify-influencer-seo-package` pasó contra producción; el gate de fidelidad volvió a pasar en
  1536/1440/890/390 y reduced motion después del resave Elementor. La página está publicada y elegible para indexación;
  no se afirma indexación efectiva sin Search Console.
- Hash Elementor posterior al hardening SEO, previo al refinamiento visual:
  `580f4f604dd1e6ef911b397568fd9575f2117db01c6793d02dc98162bb4ac2f9`.
  Rollback: `_gh_backup_before_task1598_seo_20260829T024347Z`. Auditoría:
  `docs/audits/public-site/2026-08-29-influencer-landing-seo-aeo-readback.md`.

## Visual refinement evidence · 2026-08-29

- El benchmark live contra `/servicios/redes-sociales/` y `/servicios/desarrollo-web/` confirmó una dirección
  editorial continua: se extendieron las superficies existentes y se rechazó sumar cards decorativas o un runtime
  paralelo.
- La banda bajo el hero organiza tres pruebas en un rail de confianza y normaliza cuatro marcas; en 760 px o menos se
  apila con divisores. `#mecanismo` usa un fondo Midnight de cuatro capas con retícula y anillos de baja intensidad.
- Los destinos de assets usan seis iconos monocromos: Instagram, dos TikTok, Meta, ecommerce y email. El campo de
  activación reemplazó el sparkle por un megáfono; la ayuda y el contador del objetivo quedan en la misma fila, 8 px
  bajo el textarea.
- Hash Elementor final: `1263574659f2d9cec139d3c8d11cf15a78bf8023b8894589ac1356395b1f6c57`. Rollback:
  `_gh_backup_before_task1598_visual_refinement_20260829T105059Z`.
- El gate live extendido pasó en 1536/1440/890/390 y reduced motion, incluyendo geometría responsive del rail, cuatro
  capas del mecanismo, set exacto de iconos, ausencia de discos, icono semántico y proximidad del contador. Capturas:
  `.captures/task1598-influencer-fidelity-2026-08-29T11-00-28-401Z/`. El gate SEO/AEO volvió a pasar sin drift de
  metadata, schema, menú o sitemap. No se creó lead ni reserva.

## Sticky conversion dock · 2026-08-29

- El CTA fijo dejó de ser una franja azul de ancho completo: es un dock Midnight contenido de máximo 1120 px, con
  borde, acento superior, sombra controlada, safe-area y radio 22/18 px. En móvil reduce el chrome para conservar
  área útil sin perder targets de 48 px.
- Se mantiene una sola acción sólida: `Agenda una reunión` conserva fill verde. `Cuéntanos tu campaña` es secundaria,
  transparente con contorno blanco e icono `arrow-up-right`; no se reintrodujeron círculos detrás de iconos.
- Hash Elementor final: `f89834a27c2727e4a680b5c50241b2b43baed5e6b0bc66d33b61eb09eda40df2`. Rollback inmediato:
  `_gh_backup_before_task1598_sticky_dock_20260829T110607Z`.
- Fidelidad live verde en 1536/1440/890/390 y reduced motion, incluida geometría del dock, clipping, safe-area,
  contraste de jerarquía, icono, form, scheduler, FAQ y overflow. Capturas:
  `.captures/task1598-influencer-fidelity-2026-08-29T11-08-21-257Z/`. SEO/AEO continuó verde; no se envió brief ni
  se creó reserva.

## Premium semantic selects · 2026-08-29

- El Growth Form publicó v2 `fver-9c4f447b-a233-46db-b3f3-42c6fce5f9d2` con
  `style_variant=diagnostic_premium`; v1 `fver-a0325d8e-c2c9-479c-9c25-b1c89d47186e` quedó deprecada. El helper
  idempotente `growth:forms:activate-influencer-premium-selects` clonó y preservó campos, copy, validación,
  Turnstile, consentimiento, políticas y un destino.
- Los dos selects usan el combobox/listbox accesible del renderer. El host no duplica estado ni selección: sólo
  aporta 11 marcas semánticas page-scoped —CL/CO/MX/PE, región/ubicación y creator/UGC/partnership/pauta/estrategia—.
- El gate abre ambos listbox en 1536/1440/890/390, exige 6+5 opciones, `aria-expanded`, overlay, teclado, targets
  ≥46 px, texto oscuro seleccionado, marcas visibles y ausencia de overflow. Capturas:
  `.captures/task1598-influencer-fidelity-2026-08-29T11-19-13-501Z/`.
- Hash Elementor final: `f4ff2abf522d7cf1ff1c787f805ae4e11793a4d6527aeed4bf89b51bbfa56ebc`. Rollback visual:
  `_gh_backup_before_task1598_premium_select_icons_20260829T111651Z` y
  `_gh_backup_before_task1598_premium_submit_width_20260829T111903Z`; rollback del contrato: republicar v1 y
  deprecar v2. SEO/AEO pasó sin drift; no se creó lead ni reserva.

## Shared social trust marquee · 2026-08-29

- El rail estático de cuatro logos se retiró del HTML page-scoped. Las tres señales de operación regional se
  preservaron y, como sibling Elementor independiente, se reutilizó el widget canónico `greenhouse_social_trust`
  desde la landing `/servicios/redes-sociales/`; no se copió su markup ni se creó otro primitive.
- El módulo sirve `logoMarquee.v2`, label `Marcas que confían`, nombre accesible `Marcas que confían en Efeonce` y
  tres sets equivalentes de siete marcas monocromáticas. El shell reutiliza `gh-im-elementor-shell` para no heredar
  padding/overflow del contenedor Elementor.
- Hash Elementor final: `f8181a2f7dbdd28a462d30874f21d234592e95dc32de07bb41b9c1f677b88c5a`. Rollback:
  `_gh_backup_before_task1598_social_trust_marquee_20260829T112706Z` y
  `_gh_backup_before_task1598_social_trust_shell_20260829T112922Z`.
- Fidelidad live verde en 1536/1440/890/390 y reduced motion; el gate exige un solo módulo, 3×7 logos equivalentes,
  label/schema/nombre accesible, monocromía y cero overflow. Capturas:
  `.captures/task1598-influencer-fidelity-2026-08-29T11-29-33-710Z/`. SEO/AEO continuó verde; no se envió brief ni
  se creó reserva.

## Typography, rights and responsive closure · 2026-08-29

- La divulgación IA posterior al FAQ dejó de heredar el máximo de 1240 px: usa fondo full-bleed con contenido
  alineado a la retícula. El gate prueba sus bordes exactos y ausencia de overflow en 1536/1440/1414/890/390.
- El header del brief reemplazó sparkle por documento. Su jerarquía canónica es overline Geist 600/12 px, título
  Poppins 700/1.2, explicación y trust Geist 400, labels/submit Geist 600, ayudas/contador Geist 400 e inputs ≥16 px;
  se retiró el peso no canónico 650.
- `#firma` conserva ventanas `12 meses`, `90 días` y `6 meses`, pero elimina fechas futuras artificiales. Las acompaña
  con condiciones estables y verificables en la propia narrativa: `Publicación del creator`, `Pauta autorizada` y
  `Canales de la marca`. Kicker y chips usan superficie blanca al 8% sobre Midnight; el verde queda sólo en el icono.
- `ofertas-brief` adopta el lenguaje secundario del dock sobre blanco: superficie blanca, contorno navy, sombra leve
  e icono `arrow-up-right`; no compite con la reunión primaria.
- Hash Elementor final: `64a567e36e212e19d0f447c2de8ab40fabcfcdfcb5c98b42dffd5e39058701f2`. Rollback:
  `_gh_backup_before_task1598_typography_rights_20260829T113812Z`. Fidelidad live y SEO/AEO verdes; capturas:
  `.captures/task1598-influencer-fidelity-2026-08-29T11-40-22-681Z/`. No se envió brief ni se creó reserva.

## Premium select icon cleanup · 2026-08-29

- Se eliminó el pseudo-elemento del host que dibujaba un segundo caret sobre cada combobox. El trigger conserva
  únicamente `.ghf-select-icon`, propiedad del renderer, y el padding lo alinea a 19 px del borde sin rail inset.
- Las 11 marcas de mercado/activación preservan su semántica, pero sustituyen el bloque azul sólido por una
  superficie tonal al 10% con pictograma navy. Campos, opciones, validación, teclado, Turnstile y telemetría no
  cambiaron.
- El gate ahora exige dos triggers con exactamente un caret, ausencia de `ghf-field::after`, posición al borde y
  fondos de opción no sólidos. Pasó live en 1536/1440/1414/890/390 y reduced motion; capturas:
  `.captures/task1598-influencer-fidelity-2026-08-29T12-06-14-474Z/`.
- Hash Elementor final: `a30c289549da86dd02f50d8b2232a908235bed7092d3a0375389a4c1a1307634`. Rollback:
  `_gh_backup_before_task1598_select_icon_cleanup_20260829T122700Z`. No se envió brief ni se creó reserva.

## Submit palette + country flags · 2026-08-29

- El submit del Growth Form deja el teal heredado por el renderer y usa el azul Efeonce `primary` con texto blanco,
  borde `primary-dark`, hover/focus/disabled coherentes y ancho completo. Se conserva como acción del brief, sin
  competir con el CTA de reunión verde de la landing.
- Chile, Colombia, México y Perú sustituyen siglas por SVG circulares de `circle-flags`; las banderas aparecen en
  las opciones y persisten junto al valor seleccionado. Su centrado vertical es explícito, usan outline nítido sin
  sombra difusa y tamaños ópticos de 28 px en lista y 26 px en el trigger. Regional y Otro mercado mantienen
  globo/ubicación.
- El gate fija color/contraste del submit, las cuatro banderas, persistencia del valor, un caret, teclado/ARIA y
  overflow en 1536/1440/1414/890/390 y reduced motion. Evidencia:
  `.captures/task1598-influencer-fidelity-2026-08-29T12-26-32-586Z/`.
- Hash Elementor final: `353bac5d3d7491cb77f337296e5ab0bace14a18e99055d449ea25134217e52a5`. Rollback inmediato:
  `_gh_backup_before_task1598_flag_optical_refine_20260829T132000Z`; snapshot anterior:
  `_gh_backup_before_task1598_submit_market_flags_20260829T125000Z`. No se envió brief ni se creó reserva.

## Out of scope

- Construir marketplace o base pública de influencers.
- Contratos legales finales o country overlays; viven en Legal/IP y requieren abogado local.
- Crear un nuevo motor de forms, CTA, scheduler, CRM, dashboard o pipeline.
- Prometer una auditoría/brief que delivery no pueda ejecutar.
- Crear la guía editorial Think en esta task.

## Verification

- `pnpm task:lint --task TASK-1598`
- `pnpm ui:wireframe-check --task TASK-1598`
- `pnpm ui:flow-check --task TASK-1598`
- `pnpm ui:motion-check --task TASK-1598`
- `pnpm docs:closure-check`
- SEO/AEO: revisar [Landing SEO/AEO Brief V1](../../public-site/CREATOR_INFLUENCE_CONTENT_LANDING_SEO_AEO_BRIEF_V1.md), validar SERP/keyword por mercado y verificar el contrato técnico antes de publicar.
- Captura GVC pública 1440/390 + reduced-motion + teclado.
- Smoke de form/meeting separado de la revisión visual; no crear bookings reales sin aprobación.

## Follow-ups

- Crear primer caso público con permiso y evidencia.
- Validar una campaña piloto como proof asset.
- Diseñar el satélite editorial de Think si la demanda informacional lo justifica.
- Crear versión localizada por mercado sólo después de evidencia de demanda y delivery.
- Crear un registro periódico de prompts IA para medir presencia, citas y exactitud después del lanzamiento; no forma parte del runtime de esta landing.
