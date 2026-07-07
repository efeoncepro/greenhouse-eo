# TASK-1351 / `efeoncepro.com/servicios/redes-sociales` — Landing "Redes Sociales" (Social Media Management)

## Meta

- Status: `draft`
- Owner task: `TASK-1351 — Landing pública de servicio Redes Sociales (/servicios/redes-sociales)`
- Product Design asset: dirección de arte del **muro social vivo** pendiente (assets con el stack IA propio — `fal.ai`/Higgsfield/Magnific/Adobe CC, ver `docs/architecture/GREENHOUSE_FAL_AI_MODEL_CATALOG_V1.md`); hasta tenerla, `UI ready: no`. Patrón de referencia visual: landing hermana `/servicios/posicionamiento-seo` (TASK-1343) + `/desarrollo-sitios-web` (TASK-1345).
- Intended consumers: sitio público (WordPress/Ohio, marketing lane `modern-ui`); NO el portal Greenhouse.
- Copy source: contenido de página del sitio público (NO `src/lib/copy`), validado con `greenhouse-ux-writing` + `docs/context/05_voz-tono-estilo.md`. Idioma es-LATAM neutro, tuteo, sin voseo (servicio pan-LATAM, mismo alcance que la spoke SEO).
- Primitive decision: `reuse` — patrones marketing `modern-ui` (editorial header, section header, floating feature card, logo wall, card-on-section) + `<greenhouse-form>` embebido (Growth Forms) para la auditoría.
- UI ready target: `no` (hasta dirección de arte del muro social + copy final + design decision log completos).

## Brief

- Primary user: decisor de marketing / líder de equipo creativo in-house de una empresa mid-market o enterprise (ICP Globe), evaluando a quién contratar para escalar su presencia social.
- User moment: solution/product-aware — "todas las agencias de redes suenan igual"; busca una que produzca resultados de negocio y lo pueda probar.
- Job to be done: entender que Efeonce hace social del estado del arte (Community · Creators · Trendjacking · Reels · listening) con outcome medible, y dar un primer paso de bajo compromiso (auditoría) o agendar una reunión.
- Primary decision signal: la sección firma "muro social vivo" (prueba de craft, no descripción) + la banda "cómo medimos" (transparencia anti-commodity).
- Non-goals: no es pricing; no es self-serve del portal; no lidera con volumen de posts/seguidores; no reconstruye el motor de forms.

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Header | Nav Ohio nativo `header-3` variante clara heredada (sin override, sin sticky custom) | Ohio native header | Tema |
| 1 | Hero | Promesa outcome+craft+prueba + CTA dual (reunión / auditoría) + proof row | `modern-ui` hero (patrón AEO/SEO), badge flotante | Estático |
| 2 | Trust strip | Logos citables de clientes (Sky, Bresler, Berel, SSilva…) temprano para bajar barrera | Logo wall con divisores finos | Assets locales de marca |
| 3 | Stakes | El problema: "manejar redes ≠ construir marca y demanda" (commodity vs medible) | Two-card contrast band | Estático |
| 4 | Qué incluye | Los 5 bloques de capability como answer capsules: Community Management · Creators/Influencers · Trendjacking · Reels/Contenido · Social listening | Feature card grid (container-query) | Estático |
| 5 | Muro social vivo (SIGNATURE) | Show-don't-tell: mosaico animado de reels/feed/formatos reales, prueba de craft | Sección firma custom page-scoped (islands ligeras / CSS motion) | Assets art-dirigidos (stack IA propio) |
| 6 | Prueba | Casos/resultados citables (solo reales; NUNCA GEA) en ledger editorial abierto | Proof shell + ledger (patrón TASK-1343) | Casos reales publicables |
| 7 | Cómo medimos | Transparencia: presencia/engagement/output medidos, coherente con outcome Efeonce (ICO); el número que prueba que la velocidad no cuesta calidad | Operating row + signal cards | Cifras ilustrativas del modelo (declaradas) |
| 8 | Puente / cross-sell | Enlace al paraguas Agencia Creativa + servicios hermanos (SEO, desarrollo) | Card-on-section links | Estático |
| 9 | FAQ | Objeciones y queries reales (answer capsules citables) | `<details>/<summary>` accordion | Semrush `phrase_questions` CL |
| 10 | CTA final + auditoría | CTA dual: "Agenda una reunión" (HubSpot Meetings) + "Pide una auditoría de tus redes" (`<greenhouse-form>` embebido) | CTA band + `<greenhouse-form>` | Growth Forms (reuso gobernado) |

## Copy Ledger

> Dirección de copy (no final — el craft lo pule `greenhouse-ux-writing` sobre `docs/context/05_voz-tono-estilo.md`). Ids de documentación, no tokens de `src/lib/copy` (sitio público). es-LATAM neutro, tuteo, sin voseo.

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| `public-site.redes-sociales.hero.h1` | 1 | "Redes que construyen marca y demanda —no solo llenan el feed." | — | H1 outcome-led; trabaja "agencia de redes sociales" / "gestión de redes sociales" en title/meta |
| `public-site.redes-sociales.hero.sub` | 1 | "Contenido que la gente sí quiere ver —reels, creators, trendjacking— con el número que prueba que funciona." | — | Craft moderno + prueba |
| `public-site.redes-sociales.hero.cta_primary` | 1 | "Agenda una reunión" | — | → HubSpot Meetings + UTM |
| `public-site.redes-sociales.hero.cta_secondary` | 1 | "Pide una auditoría de tus redes" | — | → ancla `#auditoria` (form embebido) |
| `public-site.redes-sociales.stakes.title` | 3 | "Postear todos los días no es una estrategia." | — | Desactiva el commodity |
| `public-site.redes-sociales.incluye.community.title` | 4 | "Community management que suma alcance" | — | Answer capsule 40–60 palabras |
| `public-site.redes-sociales.incluye.creators.title` | 4 | "Creadores e influencers que sí mueven la aguja" | — | Micro/nano; performance, no fee plano |
| `public-site.redes-sociales.incluye.trendjacking.title` | 4 | "Trendjacking con criterio de marca" | — | Oportunidad sin riesgo de marca |
| `public-site.redes-sociales.incluye.contenido.title` | 4 | "Reels y contenido que la gente guarda y comparte" | — | Watch-time/saves/shares, no likes |
| `public-site.redes-sociales.incluye.listening.title` | 4 | "Social listening y social search" | — | Estás donde tu cliente descubre |
| `public-site.redes-sociales.muro.title` | 5 | "Así se ve cuando lo hacemos nosotros." | — | Sección firma; el medio es el mensaje |
| `public-site.redes-sociales.medimos.title` | 7 | "Lo que no se mide, no se mejora. Y te lo mostramos." | — | Transparencia anti-commodity |
| `public-site.redes-sociales.cta_final.title` | 10 | "Escalá tu presencia social sin sumar headcount." | — | Cierre outcome |
| `public-site.redes-sociales.auditoria.cta` | 10 | "Solicitar auditoría de redes" | — | Submit del `<greenhouse-form>` |

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | — | Página renderizada, CTAs activos | Reunión / auditoría | Estado default |
| loading | — | Sin loading de página (SSR/estático); el form tiene su propio loading | — | Owned por el renderer |
| empty | — | N/A (contenido curado) | — | — |
| partial | "El formulario no cargó" | Fallback link al agendamiento/mailto con UTM | "Escríbenos" | El CTA nunca muere si el embed no carga |
| error | — | Error del form → Success/Error Card del renderer (TASK-1320) | Reintentar (owned por renderer) | — |
| denied | — | N/A (pública) | — | — |

## Accessibility Contract

- Heading order: un solo `<h1>` (hero); `<h2>` por región (stakes, incluye, muro, prueba, medimos, puente, faq, cta); `<h3>` para los 5 bloques de capability y los ítems de FAQ.
- Chart/table alternatives: la banda "cómo medimos" no usa charts complejos; cualquier número va como texto con label, no solo color.
- Aria labels: CTAs con label explícito; el muro social vivo lleva `role="img"`/`aria-label` descriptivo si es decorativo, o alt real por asset; FAQ con `<summary>` semántico.
- Focus notes: orden top→bottom; CTAs, `<summary>` de FAQ y campos del form alcanzables por teclado; focus ring visible (contraste AA).
- Color-independent state labels: estados del form (éxito/error) con texto + ícono, no solo color; contraste AA en hero, bandas oscuras y microtextos.

## Implementation Mapping

- Route / surface: `efeoncepro.com/servicios/redes-sociales` (WordPress/Ohio, `template default`, header nativo `header-3`, sin `elementor_canvas`).
- Primitives: patrones marketing `modern-ui` (NO Design System del portal) + `<greenhouse-form>` embebido.
- Variants / kinds: N/A (sitio público, no primitives del portal).
- Component candidates: secciones Elementor/Ohio + CSS page-scoped + una sección firma "muro social vivo" (islands ligeras o CSS motion) + `<greenhouse-form>` para la auditoría.
- Copy source: contenido de página pública (validado `greenhouse-ux-writing` + context pack 05); es-LATAM neutro.
- Data reader / command: ninguno nuevo. La captura de lead reusa el submit gobernado de Growth Forms; el agendamiento reusa HubSpot Meetings. Full API Parity por reuso — la landing es cliente.
- API parity: satisfecho por reuso (Growth Forms renderer + pipeline; HubSpot Meetings). No se crea backend nuevo; el form `efeonce-social-audit` es una **config de form instance** del contrato gobernado existente (como `efeonce-seo-diagnostic` en TASK-1343), con HubSpot delivery `disabled` hasta cutover.
- Access / capability: pública, sin capability.
- Runtime consumers: navegador del visitante; el submit va al pipeline de Growth Forms.
- Print/email/PDF considerations: N/A (no hay PDF en esta superficie; el follow-up del lead lo maneja HubSpot/Growth Forms).
- GVC markers: `hero`, `trust`, `stakes`, `incluye`, `muro-social`, `prueba`, `medimos`, `puente`, `faq`, `cta-final`, `auditoria`.

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/public-servicios-redes-sociales.capture.txt` `[verificar/crear]`
- Route: URL pública del preview (WordPress staging).
- Viewports: desktop 1440 + mobile 390.
- Required steps: cargar; scroll por todas las regiones; disparar el muro social vivo (que la animación entre); abrir 1 FAQ; enfocar el CTA/auditoría.
- Required captures: full-page desktop + mobile; frame por región; muro social en movimiento; FAQ abierto; form de auditoría montado; captura reduced-motion.
- Required `data-capture` markers: `hero`, `trust`, `stakes`, `incluye`, `muro-social`, `prueba`, `medimos`, `puente`, `faq`, `cta-final`, `auditoria`.
- Assertions: sin scroll horizontal (1440 y 390); un solo `<h1>`; CTA reunión + CTA auditoría accionables (o fallback visible); el muro social se anima en default y queda estático bajo reduced-motion.
- Scroll-width checks: `scrollWidth <= clientWidth` en ambos viewports.
- Accessibility/focus checks: focus ring visible en CTAs y `<summary>`; contraste AA en hero, bandas oscuras y microtextos.
- Reduced-motion evidence: captura con `prefers-reduced-motion: reduce` — el muro social muestra el contenido estático (frames), sin loops.

## Design Decision Log

- Decision: spoke de conversión propia `/servicios/redes-sociales` sobre el head term comercial "agencia de redes sociales" (Semrush CL 170) + cluster "gestión de redes sociales"; build spoke Ohio con **una** sección firma "muro social vivo"; oferta de dos escalones (reunión + auditoría). Ver PDR-005.
- Alternatives considered: build code-custom completo (más pesado; se concentra el craft en la sección firma); Elementor estándar sin firma (contradice el mensaje social/creativo); slug en inglés `/servicios/social-media` (peor fit de búsqueda CL/LATAM); ancla dentro de `/agencia-creativa` (menos superficie SEO); lead magnet self-serve nuevo (producto aparte) — todos descartados en PDR-005.
- Why this pattern: `modern-ui` marketing lane + doctrina social 2026 (autenticidad, social search, community como alcance, micro/nano creadores, watch-time/saves sobre likes) + Command of the Message + copywriting solution-aware. El muro social vivo hace el show-don't-tell propio de un servicio de social.
- Reuse / extend / new primitive: reuse (patrones marketing + Growth Forms + HubSpot Meetings). La única pieza nueva es la sección firma page-scoped (no primitive del portal).
- Open risks: dirección de arte del muro social pendiente (bloquea `UI ready: yes`); resultados sociales citables por confirmar (si no hay, cifras ilustrativas declaradas); estado del hub `/servicios` y CORS del form para el origin `/servicios/*` (a verificar en Discovery); riesgo "AI slop" en los assets.
- Follow-up: guía pillar "community manager" (Semrush CL 4.400, job/how-to) en Think como autoridad top-of-funnel (TASK aparte, eje EPIC-020).

## Acceptance Checklist

- [ ] All visible strings are in the copy ledger (dirección) y se validan con `greenhouse-ux-writing` antes de implementar.
- [ ] Dynamic values are named and bounded (no hay valores dinámicos en esta superficie; los números de "cómo medimos" son ilustrativos declarados).
- [ ] Partial/degraded states are explicit (fallback link si el form no carga).
- [ ] No copy implies a guarantee when data is estimated (cifras de "cómo medimos" declaradas como ilustrativas; sin cifras inventadas de resultados).
- [ ] Charts have table/text alternatives (los números van como texto con label).
- [ ] State and aria copy is ready for implementation.
- [ ] Implementation mapping names primitive, copy source, data contract and route/surface.
- [ ] GVC scenario plan is specific enough for `pnpm fe:capture` or a new scenario file.
- [ ] Design decision log explains reuse/extend/new before JSX starts.
