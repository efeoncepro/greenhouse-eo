# TASK-1352 / `efeoncepro.com/servicios-contratar-hubspot/` — Reposición landing "HubSpot" (Agentic Customer Platform + partnership)

## Meta

- Status: `draft`
- Owner task: `TASK-1352 — Reposicionar la landing HubSpot (/servicios-contratar-hubspot/) al mundo Agentic Customer Platform`
- Product Design asset: dirección de arte de la sección firma **"stack agéntico"** pendiente (assets con el stack IA propio — `fal.ai`/Higgsfield/Magnific/Adobe CC, ver `docs/architecture/GREENHOUSE_FAL_AI_MODEL_CATALOG_V1.md`); hasta tenerla, `UI ready: no`. Se evoluciona la página existente (id `244079`) y su "Partner Proof Module" (hero asset `EO_Hubspot_Hiro2-2.webp`, logo HubSpot `243106`). Patrón de referencia visual: landings hermanas `/servicios/posicionamiento-seo` (TASK-1343) + `/desarrollo-sitios-web` (TASK-1345).
- Intended consumers: sitio público (WordPress/Ohio, marketing lane `modern-ui`); NO el portal Greenhouse.
- Copy source: contenido de página del sitio público (NO `src/lib/copy`), validado con `greenhouse-ux-writing` + `docs/context/05_voz-tono-estilo.md`. Idioma es-LATAM neutro, tuteo, sin voseo ni chilenismos (servicio pan-hispano).
- Primitive decision: `reuse` — patrones marketing `modern-ui` (editorial header, section header, floating feature card, logo wall, comparison band, card-on-section) + `<greenhouse-form>` embebido (Growth Forms) para el diagnóstico.
- UI ready target: `no` (hasta dirección de arte del "stack agéntico" + copy final + design decision log completos).

## Brief

- Primary user: líder comercial / RevOps / marketing de una empresa mid-market o enterprise (LATAM/hispano), evaluando a quién contratar para adoptar u operar HubSpot en serio.
- User moment: solution/product-aware — llega por co-sell del PDM, HubSpot Solutions Directory, directo/marca o cross-sell; "todos los partners suenan igual" y "cambiar de CRM da miedo".
- Job to be done: entender que HubSpot hoy es una plataforma con agentes de IA (no un CRM que se enciende) y que Efeonce la **opera con software propio** (Kortex/Greenhouse), no solo la configura; dar un primer paso de bajo compromiso (diagnóstico de portal) o agendar una reunión.
- Primary decision signal: la sección firma "stack agéntico" (prueba del deployment programático, no descripción) + la prueba "Kortex en el HubSpot Marketplace" (proof verificable de tercero) + la tabla de diferenciación.
- Non-goals: no es pricing; no es self-serve del portal; no afirma un tier de partner; no reconstruye el motor de forms; no expone el portal Greenhouse.

## Layout Skeleton

| Region | Slot | Purpose | Component candidate | Data source |
|---|---|---|---|---|
| 0 | Header | Nav Ohio nativo (variante clara heredada, sin override, sin sticky custom) | Ohio native header | Tema |
| 1 | Hero | Teach-first: "HubSpot dejó de ser un CRM: hoy es una plataforma con agentes de IA" + outcome (la operamos con software propio) + CTA dual (reunión / diagnóstico) + proof row (Solutions Partner + Kortex en Marketplace) | `modern-ui` hero (patrón AEO/SEO), badge flotante | Estático (evoluciona hero existente) |
| 2 | Trust strip | Logos citables (Sky, Bresler, SSilva…) + badge "HubSpot Solutions Partner" + badge "Kortex en el HubSpot Marketplace" | Logo wall + proof badges | Assets locales de marca |
| 3 | Stakes | "Encenderla no basta": comprar licencia ≠ operar plataforma agéntica (datos limpios + arquitectura + gobierno de agentes) | Two-card contrast band | Estático |
| 4 | Las 4 capas | El recorrido de valor como answer capsules: Licencia → Implementación (deployment programático) → Operación continua (managed ops) → Inteligencia (auditoría + agente sobre el portal) | Feature card grid / stepper (container-query) | Estático |
| 5 | Stack agéntico (SIGNATURE) | Show-don't-tell del diferenciador: mapa animado Smart CRM → agentes gobernados → operación continua; el deployment programático (Kortex) visualizado | Sección firma custom page-scoped (SVG/CSS motion o island ligera) | Assets art-dirigidos (stack IA propio) |
| 6 | Diferenciación | Tabla **RevOps consultivo vs RevOps programático** (cómo se define/despliega/mantiene, trazabilidad, repetibilidad) — mecanismos concretos, sin denigrar competidores | Comparison band | Estático (PDR-006 tabla) |
| 7 | Prueba | Kortex en el HubSpot Marketplace (enlace verificable) + Solutions Partner + casos/resultados citables (solo reales; NUNCA GEA; Berel no como co-sell) | Proof shell + ledger + marketplace badge/link | Casos reales publicables + listing Marketplace |
| 8 | Puente / cross-sell | Enlace a servicios hermanos (AEO, SEO, Agencia Creativa, desarrollo) + pillar CRM en Think | Card-on-section links | Estático |
| 9 | FAQ | Objeciones reales (migración, gobierno de agentes, "¿qué tier son?", tiempos/costo, integraciones) con answer capsules | `<details>/<summary>` accordion | `phrase_questions` + objeciones de venta |
| 10 | CTA final + diagnóstico | CTA dual: "Agenda una reunión" (HubSpot Meetings) + "Solicita un diagnóstico de tu portal HubSpot" (`<greenhouse-form>` embebido) | CTA band + `<greenhouse-form>` | Growth Forms (reuso gobernado) |

## Copy Ledger

> Dirección de copy (no final — el craft lo pule `greenhouse-ux-writing` sobre `docs/context/05_voz-tono-estilo.md`). Ids de documentación, no tokens de `src/lib/copy` (sitio público). es-LATAM neutro, tuteo, sin voseo. **NUNCA** tier de partner; **NUNCA** GEA; no hardcodear pricing/roster de Breeze.

| Copy id | Region | Text | Dynamic values | Notes |
|---|---|---|---|---|
| `public-site.hubspot.hero.h1` | 1 | "HubSpot ya no es solo un CRM: incorpora agentes de IA que trabajan dentro de tus procesos." | — | H1 reencuadre sobrio (solution-aware, sin superlativos) |
| `public-site.hubspot.hero.sub` | 1 | "Aprovecharlos exige una base ordenada —datos limpios, procesos definidos, permisos claros—. Ordenamos y operamos esa base como RevOps programático." | — | Value prop (idea única = RevOps programático) |
| `public-site.hubspot.hero.cta_primary` | 1 | "Agenda una reunión" | — | → HubSpot Meetings + UTM |
| `public-site.hubspot.hero.cta_secondary` | 1 | "Solicita un diagnóstico de tu portal" | — | → ancla `#diagnostico` (form embebido) |
| `public-site.hubspot.hero.proof` | 1 | "HubSpot Solutions Partner · Kortex, nuestra app en el HubSpot Marketplace" | — | Proof row; sin tier |
| `public-site.hubspot.stakes.title` | 3 | "Comprar la licencia no es adoptar la plataforma." | — | Desactiva el "compra e implementa" |
| `public-site.hubspot.capas.licencia.title` | 4 | "Licencia: la base, bien elegida" | — | Answer capsule 40–60 palabras |
| `public-site.hubspot.capas.implementacion.title` | 4 | "Implementación: desplegada con software, no a mano" | — | Deployment programático (Kortex) |
| `public-site.hubspot.capas.ops.title` | 4 | "Operación continua: la plataforma que no se abandona post go-live" | — | Managed ops (Greenhouse) |
| `public-site.hubspot.capas.intelligence.title` | 4 | "Inteligencia: auditoría y agentes gobernados sobre tu portal" | — | CRM Intelligence (Kortex) |
| `public-site.hubspot.stack.title` | 5 | "Así desplegamos y operamos tu HubSpot." | — | Sección firma; el medio es el mensaje |
| `public-site.hubspot.diferenciacion.title` | 6 | "RevOps sobre HubSpot, hecho como software: versionado, trazable y reversible." | — | Mecanismo, no adjetivo; RevOps consultivo vs programático |
| `public-site.hubspot.prueba.marketplace` | 7 | "Kortex, nuestra plataforma, está publicada en el HubSpot Marketplace." | — | Proof verificable + link al listing |
| `public-site.hubspot.cta_final.title` | 10 | "Deja de encender HubSpot. Empieza a operarlo." | — | Cierre outcome |
| `public-site.hubspot.diagnostico.cta` | 10 | "Solicitar diagnóstico de portal" | — | Submit del `<greenhouse-form>` |

## State Copy

| State | Title | Body | CTA / recovery | Notes |
|---|---|---|---|---|
| ready | — | Página renderizada, CTAs activos, "stack agéntico" animándose | Reunión / diagnóstico | Estado default |
| loading | — | Sin loading de página (SSR/estático); el form tiene su propio loading | — | Owned por el renderer |
| empty | — | N/A (contenido curado) | — | — |
| partial | "El formulario no cargó" | Fallback link al agendamiento/mailto con UTM | "Escríbenos" | El CTA nunca muere si el embed no carga (CORS probable gap) |
| error | — | Error del form → Success/Error Card del renderer (TASK-1320) | Reintentar (owned por renderer) | — |
| denied | — | N/A (pública) | — | — |

## Accessibility Contract

- Heading order: un solo `<h1>` (hero); `<h2>` por región (stakes, capas, stack, diferenciación, prueba, puente, faq, cta); `<h3>` para las 4 capas y los ítems de FAQ.
- Chart/table alternatives: la tabla de diferenciación es tabla semántica (no imagen); el "stack agéntico" lleva alt/`aria-label` descriptivo o descripción textual paralela (el flujo Smart CRM → agentes → ops se entiende sin ver la animación).
- Aria labels: CTAs con label explícito; el badge/enlace de Marketplace con label ("Ver Kortex en el HubSpot Marketplace"); FAQ con `<summary>` semántico.
- Focus notes: orden top→bottom; CTAs, `<summary>` de FAQ y campos del form alcanzables por teclado; focus ring visible (contraste AA).
- Color-independent state labels: estados del form (éxito/error) con texto + ícono, no solo color; contraste AA en hero, bandas oscuras y microtextos.

## Implementation Mapping

- Route / surface: `efeoncepro.com/servicios-contratar-hubspot/` (reposición de la página id `244079`; WordPress/Ohio, `template default`, header nativo, sin `elementor_canvas`; misma URL/canonical).
- Primitives: patrones marketing `modern-ui` (NO Design System del portal) + `<greenhouse-form>` embebido.
- Variants / kinds: N/A (sitio público, no primitives del portal).
- Component candidates: secciones Elementor/Ohio (evolucionar las existentes, incl. Partner Proof Module) + CSS page-scoped + una sección firma "stack agéntico" (SVG/CSS motion o island ligera) + `<greenhouse-form>` para el diagnóstico.
- Copy source: contenido de página pública (validado `greenhouse-ux-writing` + context pack 05); es-LATAM neutro.
- Data reader / command: ninguno nuevo. La captura de lead reusa el submit gobernado de Growth Forms; el agendamiento reusa HubSpot Meetings. Full API Parity por reuso — la landing es cliente.
- API parity: satisfecho por reuso (Growth Forms renderer + pipeline; HubSpot Meetings). No se crea backend nuevo; el form `efeonce-hubspot-portal-audit` es una **config de form instance** del contrato gobernado existente (como `efeonce-seo-diagnostic` en TASK-1343), con HubSpot delivery `disabled` hasta cutover.
- Access / capability: pública, sin capability.
- Runtime consumers: navegador del visitante; el submit va al pipeline de Growth Forms.
- Print/email/PDF considerations: N/A (no hay PDF en esta superficie; el follow-up del lead lo maneja HubSpot/Growth Forms).
- GVC markers: `hero`, `trust`, `stakes`, `capas`, `stack-agentico`, `diferenciacion`, `prueba`, `puente`, `faq`, `cta-final`, `diagnostico`.

## GVC Scenario Plan

- Scenario file: `scripts/frontend/scenarios/public-servicios-contratar-hubspot.capture.txt` `[verificar/crear]`
- Route: URL pública del preview (WordPress staging).
- Viewports: desktop 1440 + mobile 390.
- Required steps: capturar la versión previa (before); cargar la reposicionada; scroll por todas las regiones; disparar el "stack agéntico"; abrir 1 FAQ; enfocar el CTA/diagnóstico.
- Required captures: full-page desktop + mobile; frame por región; "stack agéntico" en movimiento (2+ frames); FAQ abierto; form de diagnóstico montado; captura reduced-motion; before/after.
- Required `data-capture` markers: `hero`, `trust`, `stakes`, `capas`, `stack-agentico`, `diferenciacion`, `prueba`, `puente`, `faq`, `cta-final`, `diagnostico`.
- Assertions: sin scroll horizontal (1440 y 390); un solo `<h1>`; CTA reunión + CTA diagnóstico accionables (o fallback visible); el "stack agéntico" se anima en default y queda estático bajo reduced-motion; canonical preservado.
- Scroll-width checks: `scrollWidth <= clientWidth` en ambos viewports.
- Accessibility/focus checks: focus ring visible en CTAs y `<summary>`; contraste AA en hero, bandas oscuras y microtextos.
- Reduced-motion evidence: captura con `prefers-reduced-motion: reduce` — el "stack agéntico" muestra el diagrama estático, sin loops.

## Design Decision Log

- Decision: reposicionar la página existente `/servicios-contratar-hubspot/` (misma URL, sin 301) al relato Agentic Customer Platform; arco de las 4 capas; diferenciador Kortex (validado + en Marketplace); build spoke Ohio con **una** sección firma "stack agéntico"; oferta de dos escalones (reunión + diagnóstico). Ver PDR-006.
- Alternatives considered: spoke nueva `/servicios/hubspot` + 301 (sin upside de demanda, riesgo SEO, fragmenta equity); ángulo SEO keyword-led (la demanda de partner es mínima en todo el bloque hispano); liderar con "Somos Solutions Partner" (commodity, sin tier defendible); catálogo de agentes Breeze (historia de HubSpot, pricing volátil); consultora RevOps pura (concede el wedge de software propio); build code-custom completo (más pesado) — todos descartados en PDR-006.
- Why this pattern: `modern-ui` marketing lane + Challenger (teach-first: el cambio de categoría) + Command of the Message (anclar a outcomes) + JOLT (reducir el miedo a elegir mal / migración fallida). El "stack agéntico" hace el show-don't-tell del deployment programático que ningún competidor de la región replica.
- Reuse / extend / new primitive: reuse (patrones marketing + Growth Forms + HubSpot Meetings; evolucionar el Partner Proof Module existente). La única pieza nueva es la sección firma "stack agéntico" page-scoped (no primitive del portal).
- Open risks: art direction del "stack agéntico" pendiente (bloquea `UI ready: yes`); casos HubSpot/CRM citables por confirmar; CORS del form para `/servicios-contratar-hubspot/*` (probable gap); volatilidad de datos Breeze; URL del listing de Kortex Marketplace; riesgo "AI slop"; entregable operativo del "diagnóstico de portal" por definir.
- Follow-up: pillar de categoría "CRM/Agentic CRM" en Think (Semrush pan-hispano: `crm`/`hubspot` masivos) como autoridad top-of-funnel (TASK aparte, eje EPIC-020).

## Acceptance Checklist

- [ ] All visible strings are in the copy ledger (dirección) y se validan con `greenhouse-ux-writing` antes de implementar.
- [ ] Dynamic values are named and bounded (no hay valores dinámicos; sin cifras de Breeze hardcodeadas; números del modelo declarados ilustrativos).
- [ ] Partial/degraded states are explicit (fallback link si el form no carga / CORS).
- [ ] No copy implies a guarantee when data is estimated (sin tier de partner; sin resultados inventados; sin sobre-claim de la integración interna Kortex).
- [ ] Charts have table/text alternatives (la tabla de diferenciación es semántica; el "stack agéntico" tiene descripción textual paralela).
- [ ] State and aria copy is ready for implementation.
- [ ] Implementation mapping names primitive, copy source, data contract and route/surface.
- [ ] GVC scenario plan is specific enough for `pnpm fe:capture` or a new scenario file (incluye before/after).
- [ ] Design decision log explains reuse/extend/new before JSX starts.
