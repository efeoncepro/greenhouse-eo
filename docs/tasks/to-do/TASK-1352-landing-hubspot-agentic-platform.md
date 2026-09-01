# TASK-1352 — Landing HubSpot: sistema vivo de crecimiento

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Delta 2026-09-01 — registro del avance (barrido `stale-progress`)

27 checkboxes en cero con `Status real: Avanzada`. Verificado hoy: los dos commits que la nombran
(`868167729`, `111e341d8`) son **reescritura de la propia task y del PDR-006**, mas la skill de
HubSpot Solutions Partner — no implementacion de la landing.

**Ningun criterio se tilda.** Los suyos son de proceso editorial —dossiers VoC/CRO, SEO/AEO y
claim/proof aprobados; awareness/sophistication/gran idea declaradas; 10-25 H1 evaluados; copy deck
R0-R11 con seis pasadas y revision humana; cada claim con fuente vigente y autorizacion— y no hay
registro de que ninguno se haya completado. `Avanzada` describe la definicion de la task, no su
ejecucion.

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1352-landing-hubspot-agentic-platform.md`
- Flow: `docs/ui/flows/TASK-1352-landing-hubspot-agentic-platform-flow.md`
- Motion: `docs/ui/motion/TASK-1352-landing-hubspot-agentic-platform-motion.md`
- Visual direction: `docs/ui/visual-directions/TASK-1352-hubspot-immersive-pillar-direction.md`
- Backend impact: `none`
- Epic: `EPIC-019`
- Status real: `Avanzada EN DEFINICION, NO en ejecucion (verificado 2026-09-01). Los dos commits que la nombran reescriben la task y el PDR-006; la landing no esta implementada y ningun dossier editorial (VoC/CRO, SEO/AEO, claim/proof) tiene registro de aprobacion. Ver el Delta`
- Rank: `TBD`
- Domain: `public-site`
- Blocked by: `none`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`

## Entrega incremental publicada · 2026-08-31

Por instrucción posterior del operador se implementó su export Claude Design aprobado y se publicaron las
revisiones visuales, SEO y copy en **`/servicios-contratar-hubspot/`**, página WordPress `244079`.
Son once widgets Elementor, 23 paneles SSR y formulario canónico de tres pasos. El diseño rechazado descrito
más abajo es un checkpoint anterior; no invalida la autorización posterior de este export concreto.

[Contrato y estado vigente](../../architecture/public-site/HUBSPOT_ELEMENTOR_MODULES_V1.md),
[publicación](../../audits/public-site/2026-08-30-hubspot-elementor-publication.md),
[última revisión](../../audits/public-site/2026-08-31-hubspot-industry-method-copy.md).

La landing está publicada y la revisión visual/editorial del operador terminó. La task formal permanece
`to-do` / `UI ready: no`: **no** se ejecutó la migración a `/servicios/hubspot/`, ni se certifican aquí todos
los dossiers del plan anterior, una conversión aceptada con lead real o la observación de 4–8 semanas.
Esos requisitos no autorizan nuevas mutaciones de producción por sí solos. El alcance siguiente necesita
una decisión explícita; nunca presentar la página publicada como pendiente de implementación.

## Summary

Reemplazar por completo la landing pública de servicios HubSpot y migrarla a
`/servicios/hubspot/` como pillar del hub temático. La nueva experiencia presenta a Efeonce como el partner que
conecta marketing, ventas, revenue, servicio, datos y agentes en un solo sistema de crecimiento, con entrada por
resultados y sector, una evaluación inicial sin costo como conversión primaria y una ejecución inmersiva que usa el
lenguaje cromático de HubSpot bajo la masterbrand Efeonce.

## Why This Task Exists

El resultado anterior de Claude Design fue rechazado. El problema no fue un detalle visual aislado: el brief mezclaba
una taxonomía antigua, una tesis centrada en claims y precios puntuales, decisiones visuales heredadas y parches
acumulativos. Esa combinación permitía reconstruir esencialmente la misma landing aunque los docs
visuales nuevos dijeran otra cosa.

Esta versión elimina ese brief por completo. Separa las decisiones canónicas de oferta, conversión, copy, SEO/AEO y
diseño; obliga a investigar antes de redactar; introduce un gate humano después del primer fold; y convierte cualquier
artefacto previo de Claude Design en una referencia negativa, no en un insumo reutilizable.

## Goal

- Publicar una landing nueva de extremo a extremo, no una adaptación incremental del diseño rechazado.
- Explicar la oferta HubSpot de Efeonce mediante seis familias de resultados y tres rutas sectoriales, sin reducirla a
  un Hub, un agente o una lista de features.
- Convertir visitantes con fit en solicitudes aceptadas de evaluación inicial sin costo; Meetings queda como camino
  secundario.
- Entregar copy sustentado en voz del cliente, una gran idea y prueba autorizada; ningún texto heredado se conserva por
  defecto.
- Construir una arquitectura SEO/AEO basada en intención, SERP, fan-out, pasajes recuperables, entidad y medición de
  negocio.
- Crear una experiencia disruptiva e inmersiva, reconocible en el ecosistema HubSpot y claramente propiedad de
  Efeonce, accesible y completa sin motion ni JavaScript.
- Migrar la URL antigua con redirect, canonical, sitemap, enlaces internos, medición y rollback verificables.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar, en este orden de precedencia:

1. [`HUBSPOT_OFFER_ARCHITECTURE_V2.md`](../../services/hubspot-as-a-service/HUBSPOT_OFFER_ARCHITECTURE_V2.md)
   — arquitectura vigente de oferta, familias, sectores, modos de entrega y gates de elegibilidad.
2. [`TASK-1352-hubspot-immersive-pillar-direction.md`](../../ui/visual-directions/TASK-1352-hubspot-immersive-pillar-direction.md)
   — dirección visual seleccionada y alternativas descartadas.
3. [`TASK-1352-landing-hubspot-agentic-platform.md`](../../ui/wireframes/TASK-1352-landing-hubspot-agentic-platform.md),
   [`flow`](../../ui/flows/TASK-1352-landing-hubspot-agentic-platform-flow.md) y
   [`motion`](../../ui/motion/TASK-1352-landing-hubspot-agentic-platform-motion.md) — estructura, estados y
   comportamiento aprobados.
4. Los dossiers de research, copy, claims y SEO/AEO que se producen en Slice 1–3 de esta task.
5. PDR-013 y la spec del hub únicamente para ruta, migración y relación pillar/cluster. Los PDR o specs anteriores
   no pueden reintroducir copy, claims, taxonomías o decisiones visuales incompatibles con los puntos 1–4.

### Reset obligatorio de ejecución

- El resultado anterior de Claude Design, sus mockups, prompts, snippets y composición son un **baseline negativo**.
  No se copian, refinan ni usan como punto de partida.
- El contenido anterior de `TASK-1352` quedó **totalmente reemplazado**. No existen deltas acumulativos que deban
  reconciliarse.
- Quedan descartadas como arquitectura visible principal: el mapa rígido `dolor → Hub`, el catálogo de Hubs, el
  “universo de agentes”, el command center genérico de revenue, robots/partículas/orbitas y una hero gobernada por
  descuentos, waivers o cifras puntuales.
- Ninguna pieza de copy heredada está aprobada. Se puede recuperar una idea sólo si vuelve a ganar mediante research,
  evidencia, craft y revisión humana.
- Ninguna cifra, tier, badge, caso, disponibilidad, precio o denominación de producto se considera vigente por estar en
  un doc histórico; se verifica contra la fuente autorizada al ejecutar y antes de publicar.

### Skills obligatorias durante la ejecución

- `greenhouse-task-planner` — plan, slices, gates y cierre.
- `copywriting` — proceso completo `research → big idea → framework → draft → craft/edit → voz`; cargar módulos 01,
  02, 03, 05, 06, 07, 08 y 09.
- `seo-aeo` — diagnóstico técnico, intención, contenido, E-E-A-T/entidad, AEO/GEO por motor, medición y playbooks;
  cargar módulos 01, 02, 03, 04, 07 y 08.
- `growth-marketing-cro` — research de conversión, hipótesis, fricción, priorización y medición.
- `greenhouse-ai-design-studio` — dirección y control visual antes de implementar UI.
- `greenhouse-ux-content-accessibility` — contenido funcional, jerarquía, estados y accesibilidad.
- `efeonce-brand-studio` y `efeonce-public-site-wordpress` — arquitectura de marca y mutación gobernada del sitio.
- `greenhouse-growth-forms`, `greenhouse-growth-meetings` y `greenhouse-gtm-ga4-operator` — conversión y tracking.
- `greenhouse-browser-diagnostics`, `greenhouse-microinteractions-auditor` y `greenhouse-qa-release-auditor` —
  verificación visual, interacción y cierre.

Reglas obligatorias:

- Las seis familias visibles usan exactamente estos nombres:
  `Marketing, Content & AEO`; `Sales & AI Pipeline`; `Revenue Lifecycle`;
  `Service, Customer Success & Delivery`; `Data, Integration & CRM Intelligence`;
  `Agent Hub & Agentic Operations`.
- Las tres rutas sectoriales iniciales son: servicios profesionales y B2B; SaaS y tecnología; manufactura y
  distribución.
- Customer Agent es un caso de uso dentro de una oferta más amplia de agentes; no es la categoría que gobierna la
  landing. Agent Hub/Agent Builder no reemplaza los Hubs. Contracts pertenece al ciclo de revenue. Projects y
  Services participan en delivery y customer success.
- La evaluación inicial sin costo califica fit, alcance y cotización. No promete automáticamente auditoría, score,
  informe o blueprint. Un blueprint pagado sólo se ofrece cuando deja un artefacto autónomo y reutilizable.
- Smart CRM, Hubs, workspaces, agentes, objetos y módulos explican mecanismos elegibles; no son la navegación
  editorial principal.
- Cada capability se presenta con sus gates reales: disponibilidad, release, portal/tier, seats, créditos, permisos,
  datos, integración y readback cuando correspondan.
- Efeonce es la masterbrand; HubSpot es plataforma y partner ecosystem. La página no imita el trade dress de
  hubspot.com ni aparenta ser una propiedad oficial de HubSpot.

## Normative Docs

- `docs/public-site/decisions/PDR-013-hub-hubspot-pillar-cluster-arquitectura.md`
- `docs/public-site/HUBSPOT_HUB_LANDINGS_SPEC.md`
- `docs/context/02_gtm.md`
- `docs/context/05_voz-tono-estilo.md`
- `docs/context/13_icp-buyer-personas-jtbd.md`
- `.codex/skills/efeonce-public-site-wordpress/references/landings/hubspot-services.md`
- `.codex/skills/hubspot-solutions-partner/SOURCES.md`
- `.codex/skills/hubspot-solutions-partner/modules/01_PRODUCTO_2026.md`
- `.codex/skills/hubspot-solutions-partner/modules/10_DISCOVERY_SCOPING.md`
- `.codex/skills/hubspot-solutions-partner/modules/13_AGENTES.md`
- `.codex/skills/hubspot-solutions-partner/modules/14_NARRATIVA_AGENTICA_Y_MOTION_2026.md`
- `.codex/skills/hubspot-solutions-partner/modules/15_SOLUCIONES_POR_INDUSTRIA.md`
- `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md`
- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`

## Dependencies & Impact

### Depends on

- Oferta V2 y documentación sectorial vigente.
- Acceso autorizado al WordPress público, página viva y mecanismo de snapshot/rollback.
- Acceso a evidencia de ventas/VoC, Search Console, GA4 y fuentes de claims; la ausencia se registra como límite, no
  se rellena con supuestos.
- Identidad canónica del formulario y enlace de Meetings que se reutilizarán.
- Assets oficiales/autorizados de Efeonce y HubSpot, incluida confirmación vigente de cualquier badge de partner.

### Blocks / Impacts

- Clusters HubSpot asociados a TASK-1401…1404 y sus enlaces bidireccionales.
- Navegación, sitemap, canonical y redirect desde `/servicios-contratar-hubspot/`.
- Tracking de adquisición, formulario, Meetings y atribución a HubSpot/GA4.
- Mensaje comercial, discovery y calificación de la práctica HubSpot.

### Files owned

- `docs/tasks/to-do/TASK-1352-landing-hubspot-agentic-platform.md`
- `docs/ui/visual-directions/TASK-1352-hubspot-immersive-pillar-direction.md`
- `docs/ui/wireframes/TASK-1352-landing-hubspot-agentic-platform.md`
- `docs/ui/flows/TASK-1352-landing-hubspot-agentic-platform-flow.md`
- `docs/ui/motion/TASK-1352-landing-hubspot-agentic-platform-motion.md`
- `docs/audits/public-site/TASK-1352-hubspot-voc-copy-dossier.md` `[crear]`
- `docs/audits/seo/TASK-1352-hubspot-seo-aeo-intent-dossier.md` `[crear]`
- `docs/audits/public-site/TASK-1352-hubspot-claim-proof-ledger.md` `[crear]`
- `.codex/skills/efeonce-public-site-wordpress/references/landings/hubspot-services.md` `[actualizar al cierre]`
- `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md` `[entrada focal]`
- Página WordPress y configuración de redirect/canonical correspondientes `[mutación gobernada; no archivo local]`

## Current Repo State

### Already exists

- La página WordPress actual y su identidad operacional están registradas en el reference de la skill pública.
- La arquitectura de oferta V2 define seis familias, modos de entrega, maturity y tres sectores iniciales.
- Dirección visual, wireframe, flow y motion nuevos describen la experiencia “Sistema vivo de crecimiento”.
- El sitio ya dispone de contratos gobernados para formularios, Meetings y GTM/GA4; esta task los consume.
- PDR-013 define el rol pillar y la migración hacia `/servicios/hubspot/`.

### Gap

- No existe todavía un dossier focal de VoC/CRO ni uno de intención/SEO/AEO para esta landing.
- No existe un claim/proof ledger aprobado que separe `verified`, `needs verification`, `not publishable` y
  `authorized for public use`.
- H1, metadata, sistema de mensajes y copy completo aún no están aprobados; son hipótesis por investigar.
- Falta resolver el identificador del formulario, Meetings URL, inventario de assets y prueba pública disponible.
- La landing nueva no está implementada, previsualizada, publicada ni verificada live.

## Modular Placement Contract

- Topology impact: `public`
- Current home: `WordPress público de Efeonce; página HubSpot registrada por efeonce-public-site-wordpress`
- Future candidate home: `public`
- Boundary: `landing editorial consume formulario, Meetings, tracking y contenido autorizado; no crea lógica CRM`
- Server/browser split: `HTML semántico y copy crítico servidos; JS sólo mejora interacción y motion; no contiene secretos ni lógica de negocio`
- Build impact: `none en Greenhouse; mutación page-scoped en WordPress y assets optimizados`
- Extraction blocker: `routing/canonical/redirect y renderer WordPress/Ohio vigentes`

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: líder de marketing, ventas, revenue, servicio u operaciones que evalúa HubSpot o necesita ordenar un
  portal existente.
- Momento del flujo: exploración comercial con conciencia de problema o solución; puede llegar por marca, servicio,
  comparación, módulo, agente o sector.
- Resultado perceptible esperado: entender en menos de un scroll que Efeonce conecta el ciclo completo, reconocer la
  ruta relevante y saber qué ocurrirá al solicitar la evaluación.
- Fricción que debe reducir: sobrecarga de productos, promesas vagas de IA, ansiedad de implementación, temor a
  lock-in, dudas de fit, costos ocultos y ausencia de prueba.
- No-goals UX: catálogo exhaustivo, clon de HubSpot, dashboard falso, espectáculo de IA, navegación por organigrama
  interno, dos CTA primarios o contenido crítico oculto tras interacción.

### Surface & system decision

- Surface: `landing pública WordPress /servicios/hubspot/`
- Nav placement: `none` — reusa header/footer públicos; no agrega destino al portal Greenhouse.
- Composition Shell: `no aplica` — superficie pública WordPress, no aplicación autenticada.
- Primitive decision: `extend` — reusar bloques Ohio y patrones públicos; extender con un atlas page-scoped y
  trayectorias conectadas, sin crear primitive compartida hasta probar repetición.
- Adaptive density / The Seam: `aplica` — el atlas debe pasar de composición espacial a secuencia legible en 390 px.
- Floating/Sidecar/Dialog decision: el formulario puede abrir en la affordance gobernada existente sólo si preserva
  foco, Escape y retorno; la información de oferta nunca depende de un modal.
- Copy source: `local one-off` — copy editorial de landing; labels reutilizables del formulario permanecen en su
  fuente canónica.
- Access impact: `none`

### State inventory

- Default: hero, prueba, atlas, rutas sectoriales, proceso, elegibilidad, FAQ y CTA final completos.
- Loading: sólo para form/Meetings embebido; skeleton estable sin mover el layout.
- Empty: si falta prueba o asset autorizado, el bloque se elimina limpiamente; nunca queda placeholder.
- Error: el formulario conserva campos, explica el error en lenguaje humano y ofrece Meetings/contacto secundario.
- Degraded / partial: sin JS, motion, asset de partner o embed externo, el HTML y los enlaces siguen completos.
- Permission denied: no aplica a contenido; si un embed bloquea cookies/consentimiento, mostrar enlace alternativo.
- Long content: headings y anclas mantienen escaneo; no truncar respuesta, prueba ni limitación.
- Mobile / compact: una trayectoria por vez, orden DOM idéntico al narrativo, touch targets y CTA sin solapamiento.
- Keyboard / focus: skip link, orden lógico, foco visible, controles semánticos y restore tras cerrar formulario.
- Reduced motion: estado final inmediato; sin pérdida de contexto, información ni affordance.

### Interaction contract

- Primary interaction: solicitar evaluación inicial sin costo desde CTA consistente hacia el mismo form gobernado.
- Hover / focus / active: refuerzan relación entre familia, outcome y evidencia; color nunca es la única señal.
- Pending / disabled: submit bloqueado sólo durante envío; estado textual y `aria-live` sin cambiar el CTA por spinner
  indeterminado.
- Escape / click-away: cierra surface no destructiva y restaura foco; nunca descarta datos sin advertencia.
- Focus restore: al CTA que abrió la surface.
- Latency feedback: confirmación inmediata de recepción y estado final del contrato del formulario.
- Toast / alert behavior: inline para validación; confirmación persistente y accionable tras aceptación.

### Motion & microinteractions

- Motion primitive: `CSS` — GSAP sólo si una transición causal no puede resolverse de forma más ligera y después de
  presupuesto/performance review.
- Enter / exit: revelado por bloques y conexiones que explican causalidad; contenido visible sin esperar animación.
- Layout morph: no desplaza contenido editorial; sólo conecta visualmente familias y capas.
- Stagger: corto, interrumpible y limitado a elementos del mismo grupo.
- Timing / easing token: valores page-scoped definidos en el motion contract, no literales improvisados.
- Reduced-motion fallback: sin transición; render del estado final.
- Non-goal motion: autoplay, scroll hijacking, partículas, órbitas, robots, cursor custom, texto con parallax,
  contadores animados, sonido o 3D ornamental.

### Implementation mapping

- Route / surface: página WordPress actual migrada a `/servicios/hubspot/`.
- Primitive / variant / kind: bloques Ohio heredados + atlas inmersivo one-off page-scoped.
- Component candidates: hero, proof rail, outcome atlas, sector lens, delivery modes, eligibility gates, FAQ,
  evaluation CTA y form/Meetings gobernados.
- Copy source: dossier y copy deck aprobados en Slice 2; no texto del diseño rechazado.
- Data reader / command: `n/a`; la página consume el contrato existente de form/Meetings.
- API parity: reusar capacidades server-side existentes; no duplicar submit, CRM write ni scheduler.
- Access / capability: público; consentimiento, tracking y embed según contratos vigentes.
- States to implement: default, loading form, validation, accepted, rejected/error, embed blocked, no-JS, mobile,
  reduced motion y missing authorized asset.

### GVC scenario plan

- Scenario file: `docs/ui/gvc-scenarios/TASK-1352-hubspot-landing.yaml` `[crear si el runner vigente usa YAML]`
- Route: preview estable de `/servicios/hubspot/` y URL live después del cutover.
- Viewports: `1440x1100`, `1024x900`, `390x844`.
- Quality profile: `premium`
- Required steps: cargar desde frío; recorrer R0–R11; activar familias/sectores; abrir/cerrar form; probar submit vacío;
  simular error; recorrer teclado; bloquear JS; activar reduced motion; verificar redirect live.
- Required captures: first fold, atlas, sector lens, delivery/elegibilidad, FAQ, CTA/form, error y success.
- Required `data-capture` markers: `hubspot-hero`, `hubspot-proof`, `hubspot-atlas`, `hubspot-sectors`,
  `hubspot-delivery`, `hubspot-eligibility`, `hubspot-faq`, `hubspot-conversion`.
- Assertions: un H1; CTA primaria consistente; todas las familias/sectores; form sin envío vacío; enlaces cluster sólo a
  URLs publicadas; canonical y JSON-LD correctos.
- Scroll-width checks: `document.documentElement.scrollWidth === document.documentElement.clientWidth` en los tres
  viewports.
- Reduced-motion / focus evidence: capturas/trace con orden de tab, foco visible, Escape/restore y estado final sin
  motion.
- Review dossier: `docs/ui/reviews/TASK-1352-hubspot-landing/` `[crear]`
- Baseline decision / surface ID: diseño anterior = baseline rechazado; comparación de regresión sólo contra el
  first fold aceptado de Slice 4.

### Design decision log

- Decision: `Sistema vivo de crecimiento`, un sistema espacial continuo donde seis trayectorias de resultado
  convergen en Smart CRM/datos y progresan a evaluación.
- Alternatives considered: command center de revenue; universo de agentes; catálogo modular; refinamiento del diseño
  anterior.
- Why this pattern: comunica integración sin privilegiar un departamento, vuelve funcional el color HubSpot y permite
  rutas por intención y sector sin card soup.
- Reuse / extend / new primitive: `extend` local; sólo promover si otra landing demuestra la misma necesidad.
- Open risks: assets/tier, contraste de paleta autorizada, densidad mobile, performance de motion, prueba disponible y
  posible colisión de intención con clusters.

### Visual verification

- GVC scenario: escenario focal definido arriba.
- Viewports: desktop 1440, tablet 1024, mobile 390.
- Required captures: todos los markers y estados; first fold con y sin motion.
- Required `data-capture` markers: los ocho markers del scenario plan.
- Scroll-width check: igualdad estricta en cada viewport.
- Accessibility/focus checks: WCAG AA, teclado completo, focus restore, headings, landmarks, labels, error association,
  touch targets y reduced motion.
- Before/after evidence: el “before” sólo documenta problemas; no gobierna fidelidad. El “after” se compara con la
  dirección seleccionada y el first fold aceptado.
- Known visual debt: ninguna deuda se acepta sin owner, impacto y follow-up explícito.
- Visual scorecard: `docs/ui/reviews/TASK-1352-hubspot-landing.scorecard.json`
- Quality threshold: `average >= 4.5; every dimension >= 4; hierarchy, surface economy, visual impact, source fidelity and generic-template resistance >= 4.5`

## Copywriting Operating Contract

### Research e intake obligatorios

- Declarar audiencia primaria, buying group, nivel de awareness y sofisticación antes de elegir framework.
- Recolectar VoC literal de notas de discovery, oportunidades ganadas/perdidas, preguntas comerciales, tickets,
  búsquedas internas, queries y objeciones. Etiquetar fuente, fecha, rol y permiso de uso.
- Construir un ledger con dolores, resultados deseados, disparadores, alternativas, objeciones, lenguaje literal y
  pruebas disponibles. Separar observación, inferencia e hipótesis.
- Auditar la landing viva y competidores con LIFT/MECLABS/Fogg; priorizar problemas por impacto, evidencia y esfuerzo,
  no por gusto estético.

### Estrategia y entregables

- Definir **una gran idea** que explique el valor de la landing completa. No fijarla antes del research.
- Elegir un framework de copy según awareness/sophistication; si es híbrido, documentar qué función cumple cada
  tramo y evitar ensamblar fórmulas mecánicamente.
- Crear una message house: promesa principal, tres soportes, prueba, objeciones, límites y CTA.
- Producir 10–25 variantes de H1 y registrar la selección con criterios de claridad, especificidad, relevancia,
  diferenciación, credibilidad y encaje con intención.
- H1, SEO title, OG title, slug y subhead comparten la misma tesis, pero cada uno cumple su trabajo específico.
- Redactar un copy deck completo R0–R11 con headline, body, CTA, proof, objections, microcopy, estados del form,
  alt/aria y variantes mobile cuando la longitud lo exija.
- Cada CTA usa `verbo + valor`. Los reductores de ansiedad cercanos sólo se publican si son factuales.
- Ejecutar seis pasadas editoriales: estructura, claridad, especificidad, prueba, voz y lectura en voz alta. Cerrar con
  revisión humana y registro de cambios; remover clichés, grandilocuencia, paralelismos repetitivos y “AI slop”.

### Voz, ética y prueba

- Español LATAM neutro, tuteo, institucional y directo; nunca voseo ni traducción literal de copy anglosajón.
- Prueba antes que hype: demostrar mecanismo, alcance y límites; no fabricar urgencia, escasez, autoridad o
  testimonios.
- Todo claim se vincula a fuente, fecha, estado de verificación, autorización pública y ubicación de uso.
- Si falta prueba, reescribir como mecanismo verificable, anonimizar con autorización o eliminar. No rellenar con
  métricas de industria presentadas como resultado propio.
- El copy es hipótesis hasta que el dossier VoC y el claim/proof ledger cierren; el diseño no puede congelarlo antes.

## SEO/AEO Operating Contract

### Diagnóstico antes de prescripción

- Documentar motores objetivo, país/idioma, tipo de sitio, objetivo comercial, estado de migración, recursos y acceso
  disponible a GSC, GA4, HubSpot, logs y herramientas de investigación.
- Capturar baseline de ambas URLs antes del cutover: queries, páginas, impresiones, clicks, CTR, posición ponderada,
  conversiones, backlinks, indexación, canonical, sitemap, enlaces y CWV. `Sin acceso`, `sin dato` y `cero` son estados
  distintos.
- Verificar la SERP real por intención; no decidir por una keyword aislada ni por nombres de slugs.
- Separar dos carriles: optimizar demanda existente observable y cubrir demanda nueva del cluster. La ausencia en GSC
  no invalida una oportunidad greenfield.

### Intención, contenido y AEO

- Construir mapa `intención → pregunta/subquery → pasaje → familia/sector → CTA → cluster`.
- Versionar un fan-out de 8–15 preguntas plausibles y un panel de 20–50 prompts sólo si existe capacidad real de
  medirlo con cadencia estable.
- Un H2 responde una pregunta o afirmación concreta del fan-out. El primer pasaje debe ser autocontenido y extraíble;
  la longitud responde a claridad, no a una cuota falsa de palabras.
- Usar definiciones, listas, tablas, datos y citas sólo cuando mejoren exactitud y extracción. No prometer lifts de
  citación por aplicar un formato.
- Distinguir motores: Google AI Overviews/AI Mode, ChatGPT Search, Perplexity, Gemini y Copilot tienen señales y
  fuentes distintas. No afirmar que se “optimiza para la IA” en abstracto.
- El HTML servido contiene tesis, oferta, límites, respuestas y evidencia; el contenido crítico no depende de JS.
- `llms.txt` no es requisito de esta landing y no se prioriza sobre contenido, entidad, indexación o frescura.

### Técnica, entidad y schema

- Implementar redirect 301 uno-a-uno, canonical nueva, sitemap actualizado, enlaces internos y verificación de robots/
  noindex. No crear cadenas, soft redirects ni dos URLs indexables equivalentes.
- Mantener Organization/entity consistency: nombre Efeonce, relación con HubSpot, URLs, perfiles `sameAs`, contacto,
  prueba y autoría cuando corresponda.
- JSON-LD se deriva de la misma verdad visible. Sólo tipos/propiedades elegibles y validados; no duplicar ni escapar
  dos veces el payload.
- Presupuestar CWV y peso: imagen hero optimizada, fonts controladas, motion progresivo y embeds diferidos sin romper
  interacción.
- Los enlaces al pillar y clusters son bidireccionales y descriptivos; no enlazar como live una URL que no está
  publicada.

### Medición y priorización

- Priorizar iniciativas con RICE y evidencia; no entregar un backlog plano de “mejoras SEO”.
- Norte de negocio: evaluaciones iniciales aceptadas y oportunidades/cotizaciones atribuibles, no sesiones ni clicks.
- SEO: impresiones, clicks, CTR, posición ponderada, indexación, CWV y conversión por landing/query.
- AEO, sólo con panel reproducible: presence, citation share, SoV vs. competidores, exactitud, atribución correcta y
  conversión de referrals IA. No confundir presencia con autoría del concepto.
- GSC reciente tiene latencia; no interpretar D-1 vacío como caída. Agregaciones de posición usan ponderación por
  impresiones y los totales evitan inflación de sitelinks de marca.
- Establecer baseline prepublicación, checkpoint semanal las primeras cuatro semanas y evaluación a 4–8 semanas. No
  declarar causalidad si volumen, estacionalidad o diseño de medición no la sostienen.

## Conversion Contract

- Conversión primaria: **solicitud aceptada de evaluación inicial sin costo**.
- Denominador principal: sesiones elegibles de la landing; numerador: evento canónico de form aceptado una sola vez.
- Conversión secundaria: reunión agendada/realizada mediante Meetings, reportada por separado.
- CTA principal consistente: misma promesa y mismo destino en hero, atlas, proceso y cierre.
- El form debe pedir sólo lo necesario para fit y contacto; cualquier campo adicional se justifica por uso real.
- Guardrails: completitud, validación/error, abandono, spam/rechazo, lead calificado, reunión realizada, oportunidad y
  cotización. Click, apertura, scroll o inicio de form no son leads.
- Si el tráfico no permite un experimento con MDE/sample size razonable, usar research cualitativo y cambios de alta
  confianza; no presentar un before/after observacional como A/B test.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Discovery, baseline y evidencia

- Tomar snapshot técnico/visual de la landing viva y registrar identidad, renderer, contenido, assets, forms,
  Meetings, tracking, canonical, indexación, backlinks y enlaces internos.
- Crear el dossier VoC/CRO y el dossier SEO/AEO con intake completo, SERP/intención, fan-out, cluster, baseline y
  límites de datos.
- Crear el claim/proof ledger y el asset/token ledger con fuente, fecha, autorización y estado.
- Resolver o elevar los open questions de formulario, Meetings, badge/tier, casos y permisos antes de escribir copy.

### Slice 2 — Estrategia y producción de copy

- Declarar awareness, sophistication, gran idea, framework y message house desde la evidencia de Slice 1.
- Generar y evaluar 10–25 H1; seleccionar H1, subhead, title, OG y slug como sistema coherente.
- Redactar copy deck completo R0–R11, microcopy, FAQ, estados y versiones compactas; enlazar cada claim al ledger.
- Ejecutar craft/edit, revisión de voz y aprobación humana. No diseñar sobre lorem ipsum ni copy heredado.

### Slice 3 — Arquitectura SEO/AEO y medición

- Cerrar mapa de intención/fan-out, headings, pasajes autocontenidos, enlazado pillar/cluster y metadata.
- Diseñar redirect/canonical/sitemap, schema/entity, CWV budget y protocolo de indexación.
- Registrar CTA/form/eventos y dimensiones en el tracking plan; definir baseline y tablero de 4–8 semanas.
- Priorizar pendientes con RICE y bloquear los que no tengan evidencia o owner.

### Slice 4 — First-fold prototype y gate humano

- Implementar únicamente header heredado, hero, CTA, proof rail e inicio del atlas con tokens/assets autorizados.
- Capturar desktop 1440, tablet 1024, mobile 390, teclado, no-JS y reduced motion.
- Registrar decisión explícita `ACCEPT FIRST FOLD` o `REVISE`. No implementar R3–R11 hasta obtener `ACCEPT`.
- Si recibe `REVISE`, cambiar dirección/composición/copy en el first fold; no continuar por inercia.

### Slice 5 — Implementación completa R0–R11

- Construir la secuencia aprobada del wireframe y motion contract con HTML semántico, CSS page-scoped y progressive
  enhancement.
- Integrar las seis familias, tres rutas sectoriales, delivery, elegibilidad, prueba, FAQ y CTA final.
- Reusar form y Meetings gobernados, con estados completos y sin duplicar lógica de negocio.
- Optimizar assets, tipografía, contraste, layout mobile y budgets de performance.

### Slice 6 — Preview, QA y corrección

- Guardar mediante el writer canónico de WordPress, purgar caché de preview y ejecutar GVC premium completo.
- Revisar fidelity, template resistance, responsive, teclado, focus, reduced motion, no-JS, formularios, links,
  metadata, schema y performance.
- Corregir hasta superar scorecard y gates; una build verde no sustituye inspección visual.

### Slice 7 — Cutover, readback y observación

- Tomar snapshot final recuperable, publicar la nueva ruta, activar redirect 301 y purgar cachés.
- Verificar desde fuera del editor: URL vieja, URL nueva, canonical, sitemap, robots, HTML, JSON-LD, assets, form,
  Meetings, eventos, consent y responsive live.
- Solicitar/confirmar indexación según contrato vigente y monitorear señales técnicas/conversión durante 4–8 semanas.
- Actualizar reference operacional, task, README, handoff y changelog con estado real y evidencia.

## Out of Scope

- Construir un nuevo grader, CRM writer, formulario, scheduler, backend, API o agente.
- Publicar los clusters TASK-1401…1404 dentro de esta task.
- Reestructurar el header/footer global, theme Ohio o design system completo.
- Inventar pricing, descuentos, certificaciones, casos, SLAs, disponibilidad o métricas.
- Prometer un diagnóstico/blueprint gratuito como entregable estándar.
- Añadir video, 3D, partículas, scroll hijacking, audio, custom cursor o motion ornamental.
- Optimizar simultáneamente todas las páginas HubSpot o ejecutar una campaña paid/outbound.

## Detailed Spec

### Arquitectura narrativa R0–R11

| Región | Trabajo narrativo | Contenido mínimo | Acción |
|---|---|---|---|
| R0 | Orientación | header público heredado + ancla contextual | navegar |
| R1 | Tesis | H1, subhead, CTA primaria, alternativa Meetings | solicitar evaluación |
| R2 | Confianza | prueba autorizada o mecanismo verificable; sin logos de relleno | validar credibilidad |
| R3 | Sistema | atlas de seis familias conectadas | reconocer necesidad |
| R4 | Profundidad | outcomes, mecanismos y gates por familia | explorar sin catálogo |
| R5 | Sector | tres lentes con JTBD, proceso y ejemplo elegible | elegir contexto |
| R6 | Cómo trabajamos | evaluar → diseñar/blueprint → implementar → operar/evolucionar | entender compromiso |
| R7 | Oferta | evaluación gratuita vs. blueprint pagado, con frontera explícita | reducir ansiedad |
| R8 | Elegibilidad | cuándo sí, cuándo no, prerrequisitos y riesgos | autocalificar fit |
| R9 | Prueba | caso, evidencia o delivery trace autorizado | creer con evidencia |
| R10 | Respuestas | FAQ basada en queries/objeciones reales con pasajes autocontenidos | resolver dudas |
| R11 | Conversión | recap, CTA primaria, privacy/anxiety reducers factuales | enviar solicitud |

### Sistema cromático y assets

- Extraer colores de fuentes oficiales/autorizadas vigentes y registrarlos como `fuente + fecha + asset + valor + rol`.
- Convertir valores exactos en tokens CSS page-scoped: campo/base Efeonce; conexión/acción HubSpot; señales por familia;
  superficies, texto, focus, éxito, alerta y error.
- El coral/naranja HubSpot funciona como energía/conexión/acción, no como pintura indiscriminada. Los colores de apoyo
  diferencian trayectorias sólo si conservan contraste y significado redundante.
- No recolorear, deformar, recortar ni combinar logos. Si el asset o permiso no es verificable, usar texto factual y
  masterbrand Efeonce.
- Máximo tres planos de profundidad. Todos los frames deben ser legibles estáticamente y mantener WCAG AA.

### Claim/proof ledger

Cada entrada contiene:

- `claim_id`, texto propuesto, tipo (`efeonce|hubspot|industry|case|partner-status`).
- fuente primaria, URL/ruta, fecha de verificación y owner.
- estado `verified|needs-verification|not-publishable`.
- autorización pública `yes|no|conditional` y condiciones.
- región/variant donde aparece y fecha de próxima revisión si es volátil.

### SEO/AEO dossier

Debe incluir intake, baseline, competidores SERP, intents, query set, fan-out, panel de prompts si aplica, mapa
pillar/cluster, riesgo de canibalización, title/H1/slug candidates, headings, passages, internal links, schema, entity,
migration checklist, CWV budget, RICE y measurement plan. Cada hallazgo distingue `medido`, `fuente externa`,
`inferencia` e `hipótesis`.

### Copy dossier y copy deck

Debe incluir fuentes VoC, awareness/sophistication, message house, gran idea, framework, headline bank, rationale,
copy R0–R11, objections, CTA system, microcopy, states, claim mappings, seis pasadas de edición y sign-off humano.
El headline final no se inserta en esta task antes de cerrar ese proceso.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3 → Slice 4.
- Slice 4 requiere `ACCEPT FIRST FOLD` antes de Slice 5; sin aceptación se itera Slice 4.
- Slice 5 → Slice 6 → Slice 7.
- No se publica ni activa redirect antes de cerrar QA de preview y snapshot recuperable.
- Tracking, canonical, schema y redirect se consideran parte del producto; no son follow-up opcional.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Regenerar el diseño rechazado | UI/copy | medium | reset explícito, research-first y first-fold gate | composición/copy coincide con baseline negativo |
| Claims o assets no autorizados | marca/legal | medium | ledger + fuente primaria + sign-off | entrada sin estado/permiso/fecha |
| Oferta volátil o capability no elegible | HubSpot/comercial | high | gates por release/tier/seat/créditos/readback | copy absoluto o feature no disponible |
| Pérdida orgánica por migración | SEO/routing | medium | baseline, 301 uno-a-uno, canonical, sitemap y monitoreo | 404, cadena, canonical antigua, caída de indexación |
| Canibalización pillar/cluster | SEO/content | medium | intención única, links bidireccionales y dossier SERP | dos páginas compiten por la misma tesis/query |
| Fricción o doble conteo de conversión | forms/GA4/HubSpot | medium | evento aceptado canónico + readback | clicks reportados como leads o dos eventos por submit |
| Inmersión degrada accesibilidad/performance | UI/CWV | medium | progressive enhancement, budgets, reduced motion y GVC | overflow, bajo contraste, INP/LCP regresivo |
| Badge/tier queda desactualizado | partner compliance | medium | verificación prepublish + review date | partner portal contradice la landing |
| Cutover rompe página pública | WordPress/release | low | snapshot, preview, writer canónico, rollback ensayado | HTML incompleto, cache stale o redirect erróneo |

### Feature flags / cutover

Sin feature flag de aplicación: la superficie vive en WordPress. El rollout usa revisión/snapshot del documento,
preview no indexable, publicación controlada y redirect activado sólo después del smoke de la URL nueva. El first-fold
gate funciona como control de diseño antes de invertir en el resto de la página.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1–3 | revertir sólo dossiers/copy no publicados | <30 min | sí |
| 4 | restaurar revisión del prototype/descartar draft | <30 min | sí |
| 5–6 | restaurar snapshot WordPress previo y purgar preview cache | <60 min | sí |
| 7 | restaurar snapshot, desactivar redirect nuevo, reponer canonical/ruta anterior y purgar Kinsta | <60 min | sí, con monitoreo SEO |

### Production verification sequence

1. Validar dossiers, ledgers y sign-offs; detener si hay claim/asset público sin autorización.
2. Validar preview R0–R11 con GVC premium, no-JS, teclado, reduced motion y scorecard.
3. Validar form/Meetings y eventos en entorno permitido sin contaminar métricas productivas.
4. Capturar snapshot recuperable e identidad exacta de página/redirect.
5. Publicar la URL nueva sin activar todavía enlaces que dependan de clusters no publicados.
6. Verificar 200, canonical, HTML, metadata, schema, sitemap, robots y assets en la URL nueva.
7. Activar 301 desde la URL antigua y verificar status final, ausencia de cadena y destino exacto.
8. Ejecutar form aceptado controlado y readback de evento/lead según permisos; verificar que no se duplica.
9. Capturar GVC live 1440/1024/390 y revisar manualmente todos los estados críticos.
10. Monitorear indexación, CWV, errores, conversión y exactitud durante 4–8 semanas.

### Out-of-band coordination required

- Confirmación comercial/partner de tier, badge, casos y permiso de uso público.
- Owner de WordPress/Kinsta para cutover y rollback si la sesión gobernada no está disponible.
- Owner de Growth/CRM para formulario, Meetings, eventos y lead readback.
- Owner SEO para baseline, sitemap/indexación y seguimiento 4–8 semanas.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] La implementación no reutiliza el mockup/composición/copy rechazado salvo como evidencia negativa documentada.
- [ ] Existen y están aprobados los dossiers VoC/CRO, SEO/AEO y claim/proof antes de congelar copy o layout.
- [ ] Se declararon awareness, sophistication, gran idea y framework; existen 10–25 H1 evaluados y rationale final.
- [ ] El copy deck R0–R11 pasó seis pasadas editoriales, voz Efeonce, revisión humana y mapping completo al ledger.
- [ ] Ningún claim, cifra, badge, tier, caso, asset o capability público carece de fuente vigente y autorización.
- [ ] La landing muestra exactamente las seis familias y tres sectores canónicos sin convertir productos en taxonomía
  principal.
- [ ] Customer Agent aparece sólo como caso de uso; Agent Hub, Contracts, Projects, Services y módulos IA se ubican en
  su familia y con gates de elegibilidad.
- [ ] La conversión primaria en toda la página es solicitar evaluación inicial sin costo; Meetings es secundaria y el
  blueprint pagado tiene frontera explícita.
- [ ] El primer fold fue capturado en 1440/1024/390 y tiene registro humano `ACCEPT FIRST FOLD` anterior a R3–R11.
- [ ] La dirección visual usa tokens page-scoped derivados de fuentes autorizadas; Efeonce conserva masterbrand y la
  página no imita el trade dress de HubSpot.
- [ ] La experiencia mantiene contenido, orden, CTA y prueba con no-JS y reduced motion; no contiene motion no-goal.
- [ ] El HTML servido contiene headings, respuestas, oferta, límites y prueba; JSON-LD coincide con la verdad visible.
- [ ] Redirect 301, canonical, sitemap, robots, enlaces internos e indexación pasan verificación pre/post cutover.
- [ ] Form y Meetings reutilizan contratos gobernados; submit vacío falla correctamente y un submit aceptado genera un
  solo evento/lead verificable.
- [ ] Tracking distingue click, inicio, accepted submission, meeting y oportunidad; clicks no se reportan como leads.
- [ ] GVC premium pasa desktop/tablet/mobile, teclado, focus, error, success, no-JS y reduced motion.
- [ ] No existe overflow horizontal en 1440, 1024 ni 390 px.
- [ ] El scorecard cumple `average >= 4.5`, todas las dimensiones `>= 4` y jerarquía, economía de superficies,
  impacto visual, fidelidad y resistencia a plantilla genérica `>= 4.5`.
- [ ] Existe baseline y plan de observación SEO/conversión de 4–8 semanas con owner y cadencia.

## Verification

- `pnpm task:lint --task TASK-1352`
- `pnpm ui:wireframe-check --task TASK-1352`
- `pnpm ui:flow-check --task TASK-1352`
- `pnpm ui:motion-check --task TASK-1352`
- `pnpm ui:readiness-check --task TASK-1352`
- `pnpm ops:lint --changed`
- `pnpm qa:gates --changed`
- `pnpm docs:closure-check`
- `pnpm docs:context-check:strict` como último gate documental.
- GVC premium en preview y live con los viewports/estados del contrato.
- Inspección HTTP/HTML de URL antigua/nueva, redirect, canonical, robots, sitemap, metadata y JSON-LD.
- Readback real del formulario/evento/lead y Meetings según permisos vigentes.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedó sincronizado con el cierre
- [ ] `Handoff.md` quedó actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedó actualizado si cambió comportamiento, estructura o protocolo visible
- [ ] se ejecutó chequeo de impacto cruzado sobre TASK-1401…1404, PDR-013, spec del hub y tracking plan
- [ ] el reference operacional de la landing contiene identidad, URL, snapshot, form, tracking y rollback vigentes
- [ ] cualquier follow-up tiene task/owner explícito; no se cierra como “pendiente del operador” si existe verificación
  disponible para el agente

## Follow-ups

- TASK-1401…1404 — clusters del hub HubSpot, cada uno con intención propia y enlaces bidireccionales cuando estén live.
- Iteración CRO posterior sólo con baseline, volumen y método de medición suficientes.
- Promover el atlas a primitive compartida sólo si una segunda superficie prueba el mismo patrón y se aprueba su
  contrato de plataforma.

## Open Questions

- `[verificar en Slice 1]` ¿Cuál es la identidad canónica del formulario y qué campos mínimos necesita calificación?
- `[verificar en Slice 1]` ¿Cuál Meetings URL y owner corresponden a la práctica HubSpot?
- `[verificar en Slice 1]` ¿Qué tier/badge/asset de partner está vigente y autorizado el día de publicación?
- `[verificar en Slice 1]` ¿Qué casos, citas o métricas tienen fuente, permiso y relación vigente para uso público?
- `[verificar en Slice 1]` ¿Qué URLs de clusters están publicadas al cutover y pueden recibir enlaces visibles?
