# TASK-1812 — Landing pública de servicios Salesforce: universo conectado

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
- UI ready: `yes`
- Wireframe: `docs/ui/wireframes/TASK-1812-salesforce-services-landing.md`
- Flow: `docs/ui/flows/TASK-1812-salesforce-services-landing-flow.md`
- Motion: `docs/ui/motion/TASK-1812-salesforce-services-landing-motion.md`
- Backend impact: `none`
- Epic: `EPIC-019`
- Status real: `Oferta canónica, dirección, wireframe, flow y motion listos; discovery, copy final, implementación y publicación no iniciados`
- Rank: `32`
- Domain: `public-site|crm|content|growth|ui|seo`
- Blocked by: `none para iniciar Discovery; publicar exige rights/partnership readback, first-fold approval, CTA binding y QA`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Crear la landing pública de servicios Salesforce de Efeonce alrededor de una idea: transformar clouds, datos,
equipos y agentes en una operación conectada, adoptada y medible. La experiencia aprovecha el reconocimiento
visual de Salesforce con un universo original de nubes y agentes, mientras Efeonce conserva la jerarquía de guía,
integrador y operador.

Atiende dos momentos —organizaciones con Salesforce instalado y equipos que lo evalúan— y los lleva a un único
diagnóstico comercial gobernado. Incluye copy, first fold, narrativa, motion, SEO/AEO, conversión, medición,
accesibilidad, derechos, WordPress/Elementor y readback público.

## Why This Task Exists

La práctica Salesforce ya tiene un mapa de productos y una oferta por outcomes/lifecycle, pero no una superficie
pública para comprender o contratar esa capacidad. El comprador llega por fragmentación, baja trazabilidad,
automatizaciones aisladas, adopción débil o una decisión de plataforma; un catálogo de clouds no resuelve eso.

La oportunidad observada en SGS confirma el patrón sin convertirse en prueba pública: una base desarrollada puede
seguir necesitando trazabilidad, información centralizada, workflows y agentes. La landing debe hablarle a ese
installed base y al comité evaluador. Ningún nombre, dato o necesidad del prospecto se publica sin autorización.

## Goal

- Hacer comprensible en menos de diez segundos qué problema resuelve Efeonce sobre Salesforce y para quién.
- Presentar las cuatro fases y seis solution lanes canónicas por outcomes, sin confundir productos.
- Aprovechar el equity de Salesforce con un universo original, legalmente seguro y liderado por Efeonce.
- Convertir installed base y evaluación en intake/reunión con contexto y receipt real.
- Cerrar SEO/AEO, medición, performance, accesibilidad, reduced motion, rollback y verificación pública.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/context/00_INDEX.md`
- `docs/context/05_voz-tono-estilo.md`
- `docs/context/08_estrategia-comercial.md`
- `docs/context/09_marca-agencia.md`
- `docs/context/13_icp-buyer-personas-jtbd.md`
- `docs/services/salesforce/README.md`
- `docs/services/salesforce/EFEONCE_SALESFORCE_SERVICE_OFFER_ARCHITECTURE_V1.md`
- `docs/services/salesforce/SALESFORCE_PRODUCT_AND_OFFERING_MAP_V1.md`
- `docs/operations/EFEONCE_PARTNERSHIP_REGISTRY_V1.md`
- `docs/business-models/EFEONCE_PRODUCT_SERVICE_OPERATING_MODEL_V1.md`
- `docs/public-site/README.md`
- `docs/public-site/decisions/PDR-003-layering-ecosistema-digital-efeonce.md`
- `docs/architecture/GREENHOUSE_PUBLIC_SITE_ASTRO_RUNTIME_STRATEGY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/agent-invariants/PUBLIC_SITE_KINSTA_ACCESS_AGENT_INVARIANTS.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- La oferta se comunica por problemas, outcomes y lifecycle; el mapa de productos sólo enruta precisión técnica.
- Salesforce CRM, Marketing Cloud Engagement y Marketing Cloud Next son contratos distintos; MCE no está muerto
  y Next no es un reemplazo automático.
- Agentforce se une a datos, proceso, guardrails, adopción y medición; nunca es un robot mágico.
- Operar y vender son modos separados. Consulting Partner no implica Cloud Reseller ni un badge vigente.
- Efeonce lidera marca, relación y CTA. Salesforce se usa referencialmente; assets oficiales exigen autorización.
- WordPress/Kinsta sigue como runtime. Elementor usa `Document::save(elements, settings)`, snapshot/hash y ownership
  guards; nunca escritura directa de `_elementor_data`.
- La work page permanece `noindex` hasta aprobar copy, rights, metadata, responsive, CTA y cutover.
- No se publican logos, casos, métricas, certificaciones, tiers o screenshots sin source, owner y derechos.

## Normative Docs

- `.codex/skills/salesforce-crm-practice/SKILL.md`
- `.codex/skills/salesforce-marketing-cloud-engagement/SKILL.md`
- `.codex/skills/salesforce-marketing-cloud-next/SKILL.md`
- `.codex/skills/copywriting/SKILL.md`
- `.codex/skills/greenhouse-ai-design-studio/SKILL.md`
- `.codex/skills/greenhouse-ux-content-accessibility/SKILL.md`
- `.codex/skills/growth-marketing-cro/SKILL.md`
- `.codex/skills/seo-aeo/SKILL.md`
- `.codex/skills/greenhouse-microinteractions-auditor/SKILL.md`
- `.codex/skills/efeonce-public-site-wordpress/SKILL.md`
- `.codex/skills/efeonce-public-site-wordpress/references/landing-workflow.md`
- `.codex/skills/efeonce-public-site-wordpress/references/landing-registry.md`
- `.codex/skills/greenhouse-ai-creative-rights-governance/SKILL.md`
- `docs/architecture/growth-public-forms-runtime-contract.md`
- `docs/reference/measurement-gtm-ga4/04-greenhouse-gh-event-convention.md`
- `docs/ui/visual-directions/TASK-1812-salesforce-services-landing.md`
- `docs/ui/wireframes/TASK-1812-salesforce-services-landing.md`
- `docs/ui/flows/TASK-1812-salesforce-services-landing-flow.md`
- `docs/ui/motion/TASK-1812-salesforce-services-landing-motion.md`

## Dependencies & Impact

### Depends on

- Oferta canónica, mapa de productos y estado de partnership citados arriba.
- Readback contractual y de reglas de marca Salesforce antes de cualquier asset o claim Tier B.
- VoC, casos, proof y capability ledger con autorización y owner.
- Runtime WordPress/Ohio/Elementor y hosts Growth Forms/Meetings ya gobernados.
- Research SEO para intent, slug, H1, titles, canonical, links y canibalización con TASK-1404.

### Blocks / Impacts

- Nueva superficie Salesforce bajo `/servicios` y futuras piezas comerciales que citen su canon.
- Navegación, tracking plan y landing registry después de confirmar identity/postId.
- TASK-1404 conserva la comparación HubSpot vs Salesforce; esta task no duplica su intención.

### Files owned

- `docs/tasks/to-do/TASK-1812-salesforce-services-landing.md`
- `docs/ui/visual-directions/TASK-1812-salesforce-services-landing.md`
- `docs/ui/wireframes/TASK-1812-salesforce-services-landing.md`
- `docs/ui/flows/TASK-1812-salesforce-services-landing-flow.md`
- `docs/ui/motion/TASK-1812-salesforce-services-landing-motion.md`
- Referencia y registry bajo `.codex/skills/efeonce-public-site-wordpress/references/` y espejo Claude, tras confirmar runtime.
- Módulos/assets page-scoped en `../efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets/`.
- Configurador/verificador/rollback TASK-1812 bajo `scripts/public-website/`, si el patrón vigente lo requiere.

Home, menú, hosts Growth y TASK-1404 son superficies coordinadas, no ownership exclusivo.

## Current Repo State

### Already exists

- Oferta canónica por lifecycle/outcomes y mapa separado de CRM, MCE y MC Next.
- Registry de partnerships con evidencia histórica y falta de readback vigente explícita.
- Runtime público, workflow Elementor, hosts Growth y patrón GVC/rollback.
- Dirección `Universo conectado`, wireframe, flow y motion de esta task.

### Gap

- No existe landing Salesforce registrada ni identidad WordPress/postId/canonical confirmados.
- No existe VoC/keyword/claim ledger suficiente para congelar copy final y slug.
- No existe inventario autorizado de casos, logos, badges, screenshots o personajes.
- No está probado el binding exacto del CTA; no hay implementación, tracking, GVC, readback ni publicación.

## Modular Placement Contract

- Topology impact: `public`
- Current home: `efeoncepro.com` en WordPress/Kinsta y `../efeonce-public-site-runtime/wp-content/plugins/eo-elementor-widgets/`.
- Future candidate home: `public`
- Boundary: WordPress compone contenido y consume hosts Growth existentes; Salesforce, DB, secrets y partnership state nunca viven en browser.
- Server/browser split: PHP/WordPress resuelve contenido, metadata/schema y config; JS mejora selección/motion y consume host allowlisted.
- Build impact: módulos/assets page-scoped; sin SDK Salesforce, motor de animación o dependencia pesada nueva por defecto.
- Extraction blocker: ownership de ruta/canonical, compatibilidad de módulos y conversión antes de cualquier migración del rail.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: sponsor ejecutivo, Revenue/Service/Marketing Ops y CRM/Salesforce owner.
- Momento del flujo: installed base fragmentado o evaluación de plataforma.
- Resultado perceptible esperado: comprende el sistema Efeonce, reconoce su necesidad y avanza con contexto.
- Friccion que debe reducir: catálogo de clouds, hype de agentes, claims ambiguos y CTA genérica.
- No-goals UX: quiz, price calculator, demo, portal o recomendador de licencias.

### Surface & system decision

- Surface: landing pública WordPress/Elementor, primero como work page `noindex`.
- Nav placement: `none` — no agrega destino Greenhouse; Ohio gobierna el rail público.
- Composition Shell: `no aplica` — no es portal Greenhouse.
- Primitive decision: `extend` módulos públicos; `one-off` sólo para Cloud Navigator si existe gap.
- Adaptive density / The Seam: `no aplica` — contrato portal, no WordPress.
- Floating/Sidecar/Dialog decision: conversión inline; dialog sólo si el host lo exige.
- Copy source: `local one-off`; el host conserva su microcopy SSOT.
- Access impact: `none` — página pública allowlisted.

### State inventory

- Default: HTML, H1 y CTA visibles antes de JS.
- Loading: sólo media/host real, con dimensiones y status.
- Empty: omitir proof no autorizado y mostrar método real.
- Error: enhancement fail-safe; host preserva input y ofrece recovery.
- Degraded / partial: media/motion no eliminan argumento; estado partner stale retira claim.
- Permission denied: challenge antiabuso con recuperación.
- Long content: nombres de productos, FAQ y claims no rompen layout.
- Mobile / compact: capítulos verticales y cero overflow.
- Keyboard / focus: selector, lanes, FAQ y host operables; foco visible/restaurado.
- Reduced motion: mapa estático y cambios instantáneos con significado completo.

### Interaction contract

- Primary interaction: elegir contexto, explorar una capacidad y abrir intake/reunión.
- Hover / focus / active: affordance con labels persistentes y state no dependiente de color.
- Pending / disabled: sólo host real; duplicate submit bloqueado.
- Escape / click-away: sólo dialog real, sin pérdida silenciosa.
- Focus restore: CTA de origen o heading de receipt.
- Latency feedback: status textual sólo para request real.
- Toast / alert behavior: errors y receipt inline; nunca confirmación toast-only.

### Motion & microinteractions

- Motion primitive: `CSS` + IntersectionObserver; wrapper gobernado sólo para firmas justificadas.
- Enter / exit: enhancement desde contenido visible.
- Layout morph: ninguno global; crossfade/transform local y latest-input-wins.
- Stagger: acotado a Navigator/Journey, una vez.
- Timing / easing token: `feedback|transition|reveal|narrative`, page-scoped.
- Reduced-motion fallback: mapa completo, capítulos verticales y state swap inmediato.
- Non-goal motion: loop, parallax, scroll hijack, horizontal journey, confetti o counter.

### Implementation mapping

- Route / surface: work page `noindex`; slug/postId/canonical se congelan en Slice 1.
- Primitive / variant / kind: Ohio chrome, módulos Elementor y host Growth existente.
- Component candidates: hero/Navigator, routes, frictions, journey, lanes, Marketing Cloud, agent missions, lifecycle, method, proof, fit, FAQ y conversion.
- Copy source: ledger task + controles Elementor; functional host copy permanece canónico.
- Data reader / command: ninguno nuevo; Growth Form/Meeting command existente.
- API parity: browser no escribe CRM ni simula receipt.
- Access / capability: pública; sin credenciales, datos internos o claims contractuales inferidos.
- States to implement: default/loading/empty/error/degraded/denied/mobile/keyboard/reduced y host states.

### GVC scenario plan

- Scenario file: nuevo `TASK-1812-public-salesforce-services`.
- Route: work page `noindex`, luego canonical aprobada.
- Viewports: 1440×1000, 1280×900, 390×844 y spot 2048.
- Quality profile: `premium`
- Required steps: first paint, rutas, journey/lanes/agents, lifecycle, FAQ, host states, Back/reload, resize, JS-off y reduced motion.
- Required captures: hero natural/settled, contextos, journey, lifecycle, proof, conversion, mobile y reduced-static.
- Required `data-capture` markers: `hero|routes|frictions|journey|lanes|marketing-cloud|agents|lifecycle|method|proof|fit|faq|conversion`.
- Assertions: copy/schema parity, canonical/robots, rights-safe assets, no accidental submit, server receipt y consola limpia.
- Scroll-width checks: `scrollWidth === clientWidth` en cada viewport/estado.
- Reduced-motion / focus evidence: desktop/mobile reduced, keyboard trace, focus restore y contrast.
- Review dossier: `docs/ui/reviews/TASK-1812-salesforce-services-landing/`.
- Baseline decision / surface ID: required después de first-fold approval y work-page identity.

### Design decision log

- Decision: `Universo conectado`; dos rutas convergen en un diagnóstico.
- Alternatives considered: Cloud Atlas, Agent Mission Control, catálogo de clouds y página estática.
- Why this pattern: usa el equity de Salesforce sin perder ownership Efeonce y muestra causalidad.
- Reuse / extend / new primitive: chrome/hosts reused, módulos extended, Navigator one-off; sin primitive global preventivo.
- Open risks: rights/partner readback, VoC/proof, slug, CTA, performance e inventario motion.

### Visual verification

- GVC scenario: público TASK-1812.
- Viewports: 1440 / 1280 / 390 / spot 2048.
- Required captures: first fold, firmas, route states, proof, conversion, mobile y reduced.
- Required `data-capture` markers: los del scenario plan.
- Scroll-width check: sí, por estado.
- Accessibility/focus checks: headings, alternativas DOM, contrast, teclado, aria y focus restore.
- Before/after evidence: baseline work page frente a candidata aprobada.
- Known visual debt: ninguna de jerarquía, mobile, derechos, conversión o interacción se difiere como polish.
- Visual scorecard: `docs/ui/reviews/TASK-1812-salesforce-services-landing.scorecard.json`
- Quality threshold: `average >= 4.5; no dimension <4; hierarchy/surface economy/visual impact/fidelity/template resistance >=4.5`

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

### Slice 1 — Discovery comercial, SEO, rights y runtime

- Auditar Home, `/servicios`, TASK-1404, navegación, canonicals, páginas CRM, WordPress y plugin público.
- Ejecutar VoC y research de intent/canibalización; separar hechos, inferencias e hipótesis.
- Congelar ICP/JTBD, claims/proof/capability ledgers, product accuracy y exclusions.
- Verificar partnership/reglas Salesforce; clasificar assets Tier A/Tier B con provenance y derechos.
- Seleccionar slug, work page/postId, CTA/host, módulos, hashes, snapshot y rollback.

### Slice 2 — Copy architecture y first fold

- Crear headline bank y elegir H1/SEO/OG diferenciados contra VoC, claridad y anti-sameness.
- Completar copy ledger R1–R14 con una big idea y una promesa por sección.
- Implementar sólo first fold `noindex`, contenido sin JS y Cloud Navigator original.
- Capturar desktop/mobile/reduced y esperar `ACCEPT FIRST FOLD` del operador.

### Slice 3 — Narrativa, flow y motion

- Construir módulos R2–R12 y conversion R13 como piezas adaptables, no HTML monolítico.
- Implementar contextos, journey, lanes, MCE/Next/coexistencia, agent missions y lifecycle.
- Integrar proof autorizado o método; nunca logos/casos/placeholders no aprobados.
- Implementar motion con cleanup, latest-input-wins, DOM alternatives, mobile y reduced motion.

### Slice 4 — Conversión, SEO/AEO y medición

- Integrar Growth Form/Meeting aprobado sin fork de CRM ni success optimista.
- Verificar invalid/pending/denied/error/success y receipt server-side sin lead accidental en QA.
- Implementar metadata, canonical, robots y schema sólo en paridad con HTML visible.
- Medir selection, CTA, form start y receipt por separado, sin PII.

### Slice 5 — Rollout, readback y continuidad

- Publicar sólo con snapshot/hash, rights, first fold, SEO, CTA y QA aprobados.
- Purgar cache y verificar público: HTML/head/schema, desktop/mobile, keyboard, JS-off y reduced.
- Registrar landing/reference y actualizar task/epic/manuales con evidencia real.
- Separar código, CMS save, publicación, cache purge y live readback.

## Out of Scope

- Crear la presentación completa; podrá reutilizar este canon en una task separada.
- Implementar Salesforce para un cliente específico o recomendar/comprar/revender licencias.
- Publicar precios, certificaciones, tier, badges o partnership status sin contrato propio.
- Crear assessment, portal, calculadora, CRM command, integración runtime o formulario nuevo.
- Publicar información o necesidades de SGS derivadas de Outlook sin autorización.
- Rediseñar Home, hub, TASK-1404 o navegación global más allá del enlace mínimo.
- Copiar assets, personajes, screenshots, trade dress o animaciones oficiales.

## Detailed Spec

```text
Audience: sponsor ejecutivo y líderes Revenue/Service/Marketing/CRM Ops.
Situation A: Salesforce existe, pero procesos, datos, equipos o clouds no trabajan como sistema.
Situation B: la organización evalúa Salesforce y necesita arquitectura antes de acumular deuda.
Promise: una operación Salesforce conectada, adoptada, gobernada y medible.
Mechanism: Diagnose & Architect → Implement & Integrate → Activate & Adopt → Operate & Evolve.
Lanes: Revenue & Sales Ops; Customer Service Ops; Marketing & Lifecycle; Data/Identity/Consent;
Agentforce & Automation; Experience/Integration/Analytics.
Conversion: diagnóstico contextual, no auditoría automática ni propuesta garantizada.
No-claims: todas las clouds; partner/reseller vigente; ROI garantizado; reemplazo automático MCE→Next;
agentes autónomos sin guardrails; transformación 360.
```

Cada región debe responder: problema, mecanismo/proof y siguiente acción. La palabra Salesforce es descriptiva y
menos prominente que Efeonce. Assets oficiales y claims partner permanecen fuera salvo evidencia archivada. Las
nubes/agentes originales pasan revisión humana de similitud, provenance y derechos; si fallan, se reemplazan por
abstracciones geométricas sin perder contenido.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → `ACCEPT FIRST FOLD` → Slice 3 → Slice 4 → Slice 5.
- Ningún Tier B/claim partner entra a Slice 2 sin rights/readback.
- No publish, indexación, menú ni canonical antes de Slice 4 y QA verde de Slice 5.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| falsa afiliación/uso de marca | rights/UI | medium | Tier A + readback Tier B | asset sin evidence id |
| Efeonce desaparece | brand/UI | medium | hierarchy score + checkpoint | Salesforce domina H1/CTA |
| catálogo sin outcome | content/CRO | medium | lifecycle contract | cards sin mecanismo |
| producto MCE/Next incorrecto | content/SEO | medium | product map + review | replacement claim |
| motion afecta CWV/a11y | UI | medium | static-first + reduced | CLS/INP/overflow |
| submit falso/lead QA | growth/CRM | low | host + server receipt | conversion sin receipt |
| canibalización | SEO | medium | research + noindex | intent solapado TASK-1404 |

### Feature flags / cutover

Sin flag de producto: la work page `noindex` es el gate reversible. Cutover exige aprobación explícita,
canonical/robots, CTA real y readback. Revert: snapshot Elementor/settings/Yoast/menu, purge y navegación fresca.

### Rollback plan per slice

- Slice 1: documental; revertir sólo archivos propios.
- Slice 2: restaurar snapshot/hash de work page; permanece `noindex`.
- Slice 3: desactivar enhancement o restaurar snapshot; HTML natural queda funcional.
- Slice 4: retirar binding/metadata candidata; no borrar receipts.
- Slice 5: restaurar snapshot/navigation/canonical, purgar Kinsta y realizar live readback.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSURE
     "Como demuestro que termino de verdad?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Discovery documenta route/postId, runtime, SEO intent, VoC, claims, proof, capability y rights ledgers.
- [ ] La oferta visible respeta cuatro fases y seis solution lanes.
- [ ] CRM, MCE y MC Next se nombran con precisión; coexistencia y límites son explícitos.
- [ ] Efeonce lidera H1, narrativa y CTA; Salesforce es plataforma referencial.
- [ ] Ningún asset, badge, precio, caso o partnership claim aparece sin evidencia/derechos.
- [ ] First fold se aprueba antes de implementar el resto.
- [ ] Elegir contexto nunca crea lead; form/meeting usa receipt server-side y sin PII en analytics.
- [ ] Metadata/schema coincide con HTML visible y no canibaliza TASK-1404.
- [ ] Desktop 1440/1280, mobile 390, keyboard, JS-off y reduced pasan sin overflow.
- [ ] Motion conserva significado/focus/contrast y no degrada CWV materialmente.
- [ ] Registry/ref, snapshot, rollback, purge y live readback quedan documentados.
- [ ] Código, CMS save, publicación, indexación y runtime verification se reportan separados.

## Verification

```bash
pnpm task:lint --task TASK-1812
pnpm ui:wireframe-check --task TASK-1812
pnpm ui:flow-check --task TASK-1812
pnpm ui:motion-check --task TASK-1812
pnpm ui:readiness-check --task TASK-1812
pnpm ops:lint --changed
pnpm qa:gates --changed
pnpm docs:closure-check
pnpm docs:context-check:strict
```

Runtime: GVC premium, screenshot review humano, axe/keyboard, console/network, overflow, reduced-motion,
HTML/head/schema/canonical/robots, host receipt real, cache purge y navegación anónima fresca. Build o save no
equivale a publicación ni readback.

## Completion Evidence

- Commits: `none — task creada, implementación no iniciada`
- Push/release: `none`
- CMS save/publication: `none`
- GVC dossier/scorecard: `pending execution`
- Runtime readback: `pending execution`
- Rights/partnership evidence: `pending Discovery`

## Closing Protocol

- [ ] `Lifecycle` y carpeta reflejan el estado real.
- [ ] `docs/tasks/README.md`, registry, EPIC-019, Handoff y changelog quedan sincronizados donde corresponda.
- [ ] Se ejecuta chequeo de impacto cruzado con TASK-1404, Home, `/servicios` y hosts Growth.
- [ ] Landing registry/ref y mirrors `.codex/.claude` reflejan identity, módulos, forms, guards y rollback.
- [ ] El cierre declara por separado commit, push, deploy, CMS save, cache purge, index eligibility, receipt y live readback.
- [ ] Ningún acceptance criterion se marca sin evidencia proporcional y ruta verificable.

## Follow-ups

- La presentación comercial Salesforce reutiliza este canon en una task separada, sin bifurcar claims ni oferta.
- Si Discovery encuentra una capability reusable faltante en Growth Forms/Meetings, crear task `backend-data` dependiente.
- Si Cloud Navigator demuestra reuso real en tres superficies, evaluar primitive público compartido; no pre-crearlo.

## Open Questions

- ¿Qué slug e intención ganan después del research: `/servicios/salesforce/` u otra variante?
- ¿Qué casos, artefactos, logos o badges tienen autorización pública verificable?
- ¿El siguiente paso comercial será diagnóstico, assessment acotado o reunión consultiva?
- ¿Qué estado contractual Salesforce puede afirmarse públicamente en la fecha de publicación?
