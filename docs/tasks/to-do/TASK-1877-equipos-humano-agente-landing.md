# TASK-1877 — Landing transversal de equipos humano-agente

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `flow`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1877-equipos-humano-agente-landing.md`
- Flow: `docs/ui/flows/TASK-1877-equipos-humano-agente-landing-flow.md`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-047`
- Status real: `Brief y contratos iniciales registrados; diseño, copy, conversión e implementación pendientes`
- Rank: `EPIC-047-03`
- Domain: `public-site|growth|crm|content|ui|seo`
- Blocked by: `ninguno para Discovery; publicación exige proof/rights, URL, CTA y QA aprobados`
- Branch: `Greenhouse develop; checkout compartido, sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear una landing propia y neutral respecto de HubSpot/Salesforce para el servicio aprobado y probado de
transformación de equipos humano-agente. La ruta de trabajo propuesta es /servicios/equipos-humano-agente/.
Debe servir a operaciones, revenue, servicio y marketing; conectar contexto público AEO con contexto privado
autorizado sin confundirlos, y convertir conversaciones de fit en Blueprint o primer equipo según madurez.

## Why This Task Exists

La landing HubSpot publicada resuelve intención por plataforma, no explica la transformación del trabajo.
Al 2026-09-19 la ruta propuesta responde 404; /servicios/hubspot/agentes/ y /servicios/salesforce/ también
responden 404. Una página neutral evita forzar un CRM o usar el catálogo de agentes como promesa central.
El servicio está aprobado comercialmente, pero la prueba publicable, precios, ROI y disponibilidad de
capacidades por tenant siguen sujetos a verificación.

## Goal

- Hacer comprensible el trabajo compartido, la autoridad humana y la unidad de compra en el primer fold.
- Mostrar una instancia verificable o ilustrativa rotulada, con ficha de rol, handoff, excepción y resultado.
- Ofrecer rutas de entrada por proceso y buyer, incluida CMO/AEO/campañas, sin RevOps obligatorio.
- Convertir a conversación de fit con receipt real y atribución orgánica, paid, outbound y referidos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- docs/services/revenue-operations-crm/HYBRID_HUMAN_AGENT_TRANSFORMATION_V1.md — servicio y límites.
- docs/strategy/EFEONCE_AI_CONTEXT_NARRATIVE_2026Q4_2027Q3_V1.md — paraguas, rutas y claims.
- docs/strategy/EFEONCE_COMMERCIAL_FOCUS_AND_BEACHHEADS_V1.md — entradas sin quinta oferta.
- docs/architecture/GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_ARCHITECTURE_V1.md — rail público.
- docs/architecture/growth-public-forms-runtime-contract.md — captura gobernada, si se usa.
- docs/public-site/decisions/PDR-003-layering-ecosistema-digital-efeonce.md — sitio como demand capture.
- docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md — placement.

Reglas: Efeonce vende un proceso operado por personas y agentes, no bots/licencias; publicar/enviar/gastar
requiere autoridad humana. La página no dice que datos privados mejoran AEO ni que una muestra pública
autoriza al agente a usarla. HubSpot-first, Salesforce-first, híbrido o no-fit salen del discovery. Una
beta o demo no prueba elegibilidad del tenant. No hay caso, cifra, logo, ROI o tiempo garantizado sin fuente
y permiso específico. El copy y la conversión deben funcionar sin animación ni JavaScript decorativo.

## Normative Docs

- docs/commercial/campaigns/2026-q4-tu-ia-no-conoce-tu-negocio/README.md
- docs/context/00_INDEX.md
- docs/context/05_voz-tono-estilo.md
- docs/context/08_estrategia-comercial.md
- docs/public-site/README.md
- docs/epics/to-do/EPIC-047-public-site-landing-portfolio-prioritization.md
- .codex/skills/efeonce-public-site-wordpress/references/landing-workflow.md
- .codex/skills/efeonce-public-site-wordpress/references/landing-registry.md
- docs/ui/wireframes/TASK-1877-equipos-humano-agente-landing.md
- docs/ui/flows/TASK-1877-equipos-humano-agente-landing-flow.md

## Dependencies & Impact

### Depends on

- Proof pack y permisos de servicio/clientes; el método puede publicarse sin cifras si éstos faltan.
- Decisión de slug/canonical tras discovery de rutas existentes y SERP; la ruta del brief es working route.
- CTA: elegir/reusar Growth Form o Meetings existente sólo después de verificar surface, consentimiento y receipt.
- TASK-1878 prepara entradas, pero sus links no se activan antes del readback de esta URL.

### Blocks / Impacts

- TASK-1878 (Home, HubSpot y AEO) y enlaces contextuales de TASK-1403/TASK-1812.
- EPIC-047, roadmap público, landing registry, medición y campañas orgánicas/paid.

### Files owned

- docs/tasks/to-do/TASK-1877-equipos-humano-agente-landing.md
- docs/ui/wireframes/TASK-1877-equipos-humano-agente-landing.md
- docs/ui/flows/TASK-1877-equipos-humano-agente-landing-flow.md
- Página WordPress nueva, referencia de landing espejada y scripts page-scoped que el Discovery confirme.

## Current Repo State

### Already exists

- Ficha del servicio, narrativa, brief Q4, Growth Forms/Meetings y workflow público gobernado.
- Home, HubSpot y AEO publicados; Salesforce y agentes HubSpot tienen tasks propias.

### Gap

- No hay URL de servicio neutral publicada, postId, identidad de formulario, copy final ni prueba pública
  inventariada; las rutas de plataforma no pueden sustituir esta oferta.

## Modular Placement Contract

- Topology impact: `public`
- Current home: `efeoncepro.com` en WordPress/Kinsta; módulos page-scoped del runtime público cuando apliquen.
- Future candidate home: `public`
- Boundary: página de conversión consume Growth Forms/Meetings existentes; no implementa agentes ni CRM.
- Server/browser split: WordPress sirve contenido, metadata y config; browser sólo enhancement/renderer allowlisted.
- Build impact: sin nueva dependencia pesada ni bundle global por defecto.
- Extraction blocker: identidad de URL/canonical y binding de CTA antes de cualquier cambio de runtime.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: COO/VP Service, CRO/RevOps, CMO/Marketing Ops, sponsor y comité IT/Legal.
- Momento del flujo: quiere transformar un workflow, no comparar licencias.
- Resultado perceptible esperado: reconoce su job, ve límites de autoridad y sabe qué siguiente paso comprar.
- Friccion que debe reducir: hype de bots, promesas vagas y salto prematuro al proveedor.
- No-goals UX: catálogo de agentes, demo de producto, ROI calculator, recomendador automático de CRM.

### Surface & system decision

- Surface: landing nueva en /servicios/equipos-humano-agente/ (working route).
- Nav placement: `none` para portal; navegación del sitio público se decide en TASK-1878.
- Composition Shell: no aplica; runtime WordPress/Ohio.
- Primitive decision: `reuse` — secciones Elementor/Ohio existentes, Growth Form/CTA gobernados.
- Adaptive density / The Seam: no aplica al sitio público.
- Floating/Sidecar/Dialog decision: ninguno nuevo.
- Copy source: copy local de landing validado por copywriting/voz Efeonce; estados del form son del renderer.
- Access impact: `none` (página pública).

### State inventory

- Default: lectura completa de oferta, proceso y CTA.
- Loading: sólo estado del renderer de formulario si se elige.
- Empty: sin prueba publicable, método con escenario ilustrativo rotulado.
- Error: fallo de form/agenda con alternativa de contacto real.
- Degraded / partial: sin JS decorativo, contenido y enlaces legibles.
- Permission denied: no aplica a la lectura pública; consentimiento pertenece al form.
- Long content: títulos, casos y FAQ sin truncar.
- Mobile / compact: regiones apiladas, CTA visible sin tapar contenido.
- Keyboard / focus: orden de lectura y CTA coherente.
- Reduced motion: misma información; no motion nuevo obligatorio.

### Interaction contract

- Primary interaction: elegir conversación por problema, no por plataforma.
- Hover / focus / active: controles nativos y foco visible.
- Pending / disabled: renderer gobernado si hay formulario.
- Escape / click-away: sólo si se reutiliza scheduler nativo.
- Focus restore: contrato del scheduler/renderer existente.
- Latency feedback: estado real del form, nunca éxito optimista.
- Toast / alert behavior: errores y receipt del host gobernado.

### Motion & microinteractions

- Motion primitive: `none`; la propuesta inicial es estática.
- Enter / exit: none.
- Layout morph: none.
- Stagger: none.
- Timing / easing token: none.
- Reduced-motion fallback: paridad por ausencia de motion propio.
- Non-goal motion: robots, partículas, contadores y organigramas animados.

### Implementation mapping

- Route / surface: WordPress page id y slug por confirmar en Discovery.
- Primitive / variant / kind: secciones Ohio/Elementor y renderer de Growth Form existente.
- Component candidates: hero, proceso, work chart, escalera de servicio, preguntas y CTA.
- Copy source: ledger de copy de la task.
- Data reader / command: ninguno nuevo; form/meeting usa sus contratos existentes.
- API parity: no se crean acciones de negocio en JS de página.
- Access / capability: pública; conversión con surface/consentimiento.
- States to implement: default, form pending/error/success, JS-off, mobile y reduced.

### GVC scenario plan

- Scenario file: definir en Discovery antes de implementación.
- Route: working route y preview noindex, luego URL canónica.
- Viewports: 1440 y 390 px.
- Quality profile: `premium`.
- Required steps: primer fold, selección de ruta, CTA, formulario/agenda y recuperación.
- Required captures: fold, proceso, escalera, CTA, mobile y reduced.
- Required data-capture markers: definir al mapear módulos.
- Assertions: H1 único, enlaces/CTA correctos, sin casos ni claims no autorizados.
- Scroll-width checks: documentElement.scrollWidth <= clientWidth en ambos tamaños.
- Reduced-motion / focus evidence: captura y recorrido teclado.
- Review dossier: crear durante ejecución, no afirmar evidencia ahora.
- Baseline decision / surface ID: preview/postId por confirmar.

### Design decision log

- Decision: landing neutral con dos entradas por job; plataformas como mecanismos elegibles.
- Alternatives considered: convertir la landing HubSpot o crear páginas por proveedor.
- Why this pattern: intención de transformar trabajo distinta de intención por software.
- Reuse / extend / new primitive: reuse de módulos y conversión existentes.
- Open risks: proof pack, copy CMO, URL final, derechos, CTA y paid attribution.

### Visual verification

- GVC scenario: pendiente de implementación; desktop 1440 y mobile 390.
- Required captures: first fold, proceso, CTA, form states y reduced.
- Required data-capture markers: por definir en Discovery.
- Scroll-width check: obligatorio en 1440 y 390.
- Accessibility/focus checks: teclado, headings, contraste y mensajes del form.
- Before/after evidence: baseline 404 fechado 2026-09-19; después exige live readback.
- Known visual debt: no inventar.
- Visual scorecard: docs/ui/reviews/TASK-1877-equipos-humano-agente-landing.scorecard.json al ejecutar.
- Quality threshold: gate premium de la skill visual vigente.

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

### Slice 1 — Discovery y dirección

- Reconfirmar rutas, estado WordPress, intent SEO/AEO y paid/outbound, prueba disponible, claims y derechos.
- Comparar 2–3 direcciones visuales, elegir una y completar wireframe/flow/primer fold; UI ready sigue no
  hasta mapping y GVC plan completos.
- Definir URL/canonical, copy ledger, CTA/host/recovery y medición sin PII; pedir aprobación de primer fold.

### Slice 2 — Construcción en preview

- Crear página noindex en WordPress usando rail gobernado, módulos reusables y un proceso demostrable.
- Cubrir rutas COO/CRO y CMO sin bifurcación falsa; incluir cuándo no sumar agente y límites de autoridad.
- Integrar únicamente CTA/form/meeting cuyo contrato, surface y consentimiento se hayan verificado.

### Slice 3 — QA y promoción

- Validar HTML/head/schema, accesibilidad, móvil, JS-off, formulario y tracking; medir conversión por buyer/job.
- Con aprobación del operador y proof/rights, publicar, purgar cache y verificar URL/receipt/analytics live.
- Actualizar landing registry, referencia espejada, documentación funcional/manual y estado de task con evidencia.

## Out of Scope

- Implementar agentes, CRM, nuevas APIs o nuevos formularios/commands.
- Publicar precios, ROI, métricas o casos sin permiso; prometer capacidades beta o gasto PAID.
- Mutar Home, HubSpot, AEO o Salesforce: TASK-1878 y tasks de plataforma son dueñas.
- Crear una nueva SKU, un quinto beachhead o una página separada para agentes Salesforce.

## Detailed Spec

La primera pantalla vende el cambio de trabajo, no una plataforma. El ejemplo central expone entrada,
propuesta/acción acotada, revisión, excepción, corrección y resultado válido. La variante de marketing
une AEO, contexto de campaña y equipo humano-agente sin convertir datos públicos y privados en una fuente
única. La escalera comercial se presenta como opciones condicionadas por fit; nadie recibe un Blueprint
gratuito ni un primer equipo por llenar el formulario. El proveedor se decide después de validar job,
entitlements, datos y economía. El plan de ejecución fijará copy, módulos, postId y conversión exactos.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 → Slice 2 en preview noindex → QA → aprobación explícita → publicación y readback. Los
enlaces desde otras superficies sólo se activan tras confirmar URL 200/canonical y CTA.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Claim de cliente sin permiso | Sitio público | medium | Proof/rights ledger y fallback de método | Revisión Legal bloqueada |
| CTA envía lead al destino equivocado | Growth Forms/CRM | medium | Surface y receipt verificados, sin submit real de prueba no autorizado | Error de delivery/receipt |
| Canibalización entre páginas | SEO/AEO | medium | Intent/canonical y enlaces diferenciados | URLs compiten por la misma query |
| PAID a URL no viva | Ads | medium | Gate 200, form y tracking antes de campaña | 404 o ausencia de conversion path |

### Feature flags / cutover

Sin flag nuevo: preview noindex hasta aceptación; publicación y ads son decisiones separadas.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | Retirar brief/dirección no aprobados | antes de ejecución | sí |
| 2 | Restaurar snapshot Elementor y dejar preview noindex | según rail WordPress | sí |
| 3 | Retirar enlaces/pauta, restaurar snapshot y purgar cache con readback | según incidente | sí |

### Production verification sequence

1. Readback de snapshot, postId, slug y robots del preview; aprobar primer fold.
2. QA desktop/mobile/teclado/reduced/JS-off, contenido, schema y consentimiento.
3. Aprobar publicación/rights; guardar por Document::save, purgar cache y verificar anónimo.
4. Confirmar CTA, receipt y atribución; sólo después habilitar enlaces y PAID por owner.

### Out-of-band coordination required

Commercial aprueba alcance y claims; Legal/cliente autorizan casos/activos; Marketing aprueba copy y
eventual presupuesto PAID; owner de canal confirma conversion path.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] La ruta final, intención y canonical están decididos contra el inventario live; la ruta propuesta no se da por publicada.
- [ ] Wireframe y flow declarados existen y pasan sus gates; UI ready permanece no hasta direction, mapping, GVC plan y log completos.
- [ ] Se compararon alternativas visuales y se aprobó el primer fold antes del resto.
- [ ] La página distingue contexto público AEO de contexto privado autorizado y cubre marketing sin exigir RevOps.
- [ ] Explica job, rol humano, autoridad, handoff, excepción, alternativa sin agente y escalera Blueprint → primer equipo → operación.
- [ ] No presenta demo/beta/claim/caso/ROI/partnership como verificado sin evidencia y permiso.
- [ ] CTA usa contrato de form/meeting gobernado, consent/receipt real y recuperación; no crea lead al elegir ruta.
- [ ] SEO/metadata/schema corresponden al HTML visible; medición separa orgánico, paid, outbound y referido sin PII.
- [ ] Se capturó GVC premium 1440/390, teclado, JS-off y reduced; sin scroll horizontal.
- [ ] Preview, CMS save, publicación, cache purge, indexación, CTA y readback se reportan por separado.
- [ ] Landing registry/ref, docs funcional/manual y EPIC-047 se sincronizaron con el runtime realmente publicado.

## Verification

- pnpm task:lint --task TASK-1877
- pnpm ui:wireframe-check --task TASK-1877
- pnpm ui:flow-check --task TASK-1877
- pnpm ops:lint --changed
- GVC premium, HTTP/head/schema/robots/canonical, CTA y receipt live al ejecutar.

## Closing Protocol

- [ ] Lifecycle y carpeta reflejan ejecución real; criterios tildados sólo con evidencia.
- [ ] README/registry/EPIC-047 y Handoff se sincronizan; changelog sólo si cambia comportamiento público.
- [ ] Se revisan TASK-1878, TASK-1403, TASK-1812 y las rutas Home/HubSpot/AEO.

## Follow-ups

- TASK-1878 activa entradas desde páginas existentes sólo tras readback 200/CTA.
- TASK-1403 y TASK-1812 conservan las superficies por proveedor.

## Open Questions

- Slug final, form o meeting exactos, proof pack autorizado y dirección visual se deciden en Discovery.
