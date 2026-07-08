# TASK-1369 — About Us: página de identidad (Golden Circle)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `layout`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1369-about-us-identidad.md`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-019`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `content`
- Blocked by: `bios reales del equipo + dirección de arte del hero (ver Open Questions)`
- Branch: `task/TASK-1369-about-us-identidad`

## Summary

Reconstruye la página pública `/about-us-efeonce/` (page_id 249770) como **página de identidad / E-E-A-T estructurada como Golden Circle (Why → How → What)**, comunicación inside-out. Es identidad/confianza, NO un pitch (el pitch es la Home, PDR-010). Lidera el **Why de marca** (*no te entregamos crecimiento, lo construimos contigo*) y cuenta el sistema completo (capabilities, método, software propio) **a fondo, como identidad**.

## Why This Task Exists

[PDR-010](../../public-site/decisions/PDR-010-home-es-el-pitch-agencia-se-pliega.md) movió el pitch a la Home y dejó el About Us como el **gap real**: el hogar de la identidad/ecosistema que no debe estar en el pitch. La página existente hace de nodo de confianza básico y no expresa el **Why de marca** recién articulado (Golden Circle, SSOT `docs/context/09_marca-agencia.md`). Sin esta reconstrucción, la identidad de primer nivel de Efeonce no tiene superficie pública, y el E-E-A-T (entidad de marca + entidades de autor) para SEO/AEO queda sin cubrir.

## Goal

- Página `/about-us-efeonce/` (→ sugerido `/nosotros`) reconstruida como Golden Circle Why→How→What, con el copy del wireframe.
- Identidad "a fondo" (capabilities descriptivas — NUNCA sub-marcas; método Loop/ICO; software propio) contada como identidad, no como pitch ni catálogo.
- E-E-A-T real: entity capsule + JSON-LD `Organization` + `Person` (liderazgo).
- CTA suave de identidad ("Agenda una reunión" transversal PDR-009 + "Únete al equipo").

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/public-site/decisions/PDR-011-about-us-identidad-golden-circle.md` (decisión canónica de esta página)
- `docs/public-site/decisions/PDR-010-home-es-el-pitch-agencia-se-pliega.md` (About Us ≠ pitch)
- `docs/context/09_marca-agencia.md` → §El Golden Circle de Efeonce (SSOT del Why)
- `docs/context/05_voz-tono-estilo.md` (voz) · `01_quienes-somos.md` · `10_experiencia-cliente.md`

Reglas obligatorias:

- **Capabilities, no sub-marcas:** NUNCA nombrar Globe/Reach/Wave como marcas/proveedores; describir por función. Los "Empower your…" son la voz de cada capability, no taglines de sub-marca.
- **Nunca el Why sin su mecanismo** (regla anti-humo del Golden Circle): "co-creación/integralidad/partner" siempre encadenadas a su prueba (login, grader, número, ciclo).
- **Solo casos citables** (Sky/Bresler/Berel/SSilva). NUNCA GEA.
- es-LATAM neutro, tuteo, sin voseo; `hreflang`-ready. Voz validada con `greenhouse-ux-writing`.

## Normative Docs

- `docs/ui/wireframes/TASK-1369-about-us-identidad.md` (SSOT del copy + estructura + estados + a11y + GVC)
- `docs/public-site/decisions/PDR-008-...` (masterbrand/capabilities) · `PDR-002` (IA)

## Dependencies & Impact

### Depends on

- **Bios reales del equipo** (nombres, roles, fotos, bios de liderazgo/equipo) — bloqueante E-E-A-T.
- **Dirección de arte del hero + Product Design direction** — no aprobada aún (bloquea `UI ready: yes`).
- Mecanismo transversal "Agenda una reunión" (PDR-009 / `TASK-1366`).

### Blocks / Impacts

- Complementa la Home (`TASK-1358` reorientada, PDR-010): About Us enlaza desde el ruteo de la Home.

### Files owned

- Página WordPress `/about-us-efeonce/` (page_id 249770) — build via `efeonce-public-site-wordpress`.
- `docs/ui/wireframes/TASK-1369-about-us-identidad.md`
- `docs/public-site/decisions/PDR-011-about-us-identidad-golden-circle.md`

## Current Repo State

### Already exists

- Página `/about-us-efeonce/` (249770) con semilla *"El crecimiento real no se compra por partes. Se orquesta."* + eyebrow *"Agencia de crecimiento integrada"*.
- El Why documentado (SSOT `09_marca-agencia.md`); copy final en el wireframe.

### Gap

- La página no expresa el Golden Circle / Why; hace de nodo de confianza básico.
- Faltan bios reales del equipo y la dirección de arte del hero.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: comprador mid-market/enterprise en evaluación de confianza; secundarios talento/prensa.
- Momento del flujo: mitad de embudo (post-pitch) o llegada branded a "nosotros".
- Resultado perceptible esperado: *"esta gente piensa distinto y lo puede probar"* → agenda una reunión.
- Friccion que debe reducir: desconfianza en tercerizar / "todas las agencias suenan igual".
- No-goals UX: no es pitch de categoría (Home); no expone portal/datos de cliente.

### Surface & system decision

- Surface: página pública WordPress (`efeoncepro.com/about-us-efeonce/` → sugerido `/nosotros`).
- Composition Shell: `no aplica` — es sitio público WordPress/Ohio, no el portal Greenhouse.
- Primitive decision: `reuse` — rail WordPress code-custom / Ohio de las spokes; sin portal primitives.
- Adaptive density / The Seam: `no aplica` (sitio público).
- Floating/Sidecar/Dialog decision: n/a (página de scroll; accordion para las 7 creencias).
- Copy source: `local one-off` — WordPress, SSOT = el wireframe (no `src/lib/copy`, que es del portal). Voz `greenhouse-ux-writing` + `05_voz`.
- Access impact: `none` (pública).

### State inventory

- Default: render completo del arco Golden Circle.
- Loading: n/a (contenido estático server-rendered).
- Empty: bloque equipo **oculto** si no hay bios (no placeholders, no inventar personas).
- Error: embed (captura del portal / form) que falle degrada a texto, no rompe la página.
- Degraded / partial: solo bios de liderazgo si el resto no está.
- Permission denied: n/a (pública).
- Long content: página de scroll larga; secciones con `data-capture` para GVC.
- Mobile / compact: reflow de tabla de capacidades a cards; sin scroll horizontal.
- Keyboard / focus: accordion de creencias operable por teclado.
- Reduced motion: si se agrega scroll-reveal (fuera de scope actual), respeta `prefers-reduced-motion`.

### Interaction contract

- Primary interaction: scroll + CTA "Agenda una reunión".
- Hover / focus / active: CTAs y accordion con estados visibles.
- Pending / disabled: n/a.
- Escape / click-away: accordion cierra con teclado.
- Focus restore: n/a.
- Latency feedback: n/a (estático).
- Toast / alert behavior: n/a.

### Motion & microinteractions

- Motion primitive: `none` en este scope. Motion (scroll-reveal, hero animado) queda **deferido** a la dirección de arte del hero — se evaluará como follow-up con su contrato de Motion si aplica.
- Enter / exit: n/a en scope actual.
- Reduced-motion fallback: obligatorio si se agrega motion en el follow-up.
- Non-goal motion: nada de motion decorativo que retrase la lectura del Why.

### Implementation mapping

- Route / surface: `/about-us-efeonce/` (249770) → sugerido `/nosotros` + 301.
- Primitive / variant / kind: secciones landing WordPress/Ohio (hero, texto+KV, accordion, cards, grids, CTA).
- Component candidates: hero code-custom; accordion Ohio; grid de equipo; imagen optimizada de captura real del portal (no iframe).
- Copy source: wireframe (SSOT).
- Data reader / command: estático salvo bios (fuente a definir: ACF/CMS del sitio).
- API parity: n/a (contenido público; CTA usa mecanismo transversal de reunión).
- Access / capability: pública.
- States to implement: default + empty(equipo oculto) + error(embed degrada).

### GVC scenario plan

- Scenario file: `scripts/frontend/scenarios/about-us.yaml` (nuevo) o captura por ruta con scroll por `data-capture`.
- Route: `/nosotros` (o `/about-us-efeonce/`) en staging del sitio público.
- Viewports: desktop 1440 + mobile 390.
- Required steps: cargar → scroll por cada `data-capture` → capturar.
- Required captures: hero, creencias, pilares, un-cerebro, en-vivo, casos, equipo, cierre.
- Required `data-capture` markers: `about-hero/why/beliefs/pillars/brain/metodo/envivo/medicion/prueba/equipo/cierre`.
- Assertions: `h1` = el Why (no "se orquesta"); capacidades sin nombres de sub-marca; sin "GEA"; sin scroll horizontal.
- Scroll-width checks: `scrollWidth <= viewport` desktop + mobile.
- Reduced-motion / focus evidence: heading order un solo h1; accordion por teclado.

### Design decision log

- Decision: About Us = identidad estructurada como Golden Circle (Why→How→What); el Why lidera el hero.
- Alternatives considered: About Us como 2º pitch (descartado, duplica Home); liderar con "se orquesta" (descartado, es How); nombrar unidades como sub-marcas (descartado, PDR-008); metáfora "cuatro sombreros" (descartada por el operador) → "un solo cerebro".
- Why this pattern: identidad/E-E-A-T; Sinek inside-out — la creencia llega primero.
- Reuse / extend / new primitive: reuse del rail WordPress/Ohio; CTA reusa el mecanismo transversal (PDR-009).
- Open risks: art direction del hero no aprobada; bios reales pendientes; riesgo de que el copy suelte el Why sin su mecanismo (regla anti-humo).

### Visual verification

- GVC scenario: `about-us` (por crear).
- Viewports: desktop 1440 + mobile 390.
- Required captures: las 11 secciones.
- Required `data-capture` markers: los 11 de arriba.
- Scroll-width check: sí, ambos viewports.
- Accessibility/focus checks: heading order, accordion por teclado.
- Before/after evidence: captura de la página actual vs la reconstruida.
- Known visual debt: hero sin dirección de arte hasta el follow-up.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Estructura + copy (Why→How→What)

- Construir las 11 secciones del wireframe en WordPress con el copy exacto del Copy Ledger.
- `data-capture` por sección; heading order (un solo h1 = el Why).

### Slice 2 — E-E-A-T + entidad

- Entity capsule + JSON-LD `Organization` (`foundingDate`, `areaServed` CL/CO/MX/PE, HubSpot Partner) + `Person` por líder.
- Bloque equipo con bios reales (cuando lleguen); empty state = ocultar si faltan.

### Slice 3 — CTA + captura real + SEO preflight

- CTA "Agenda una reunión" (mecanismo PDR-009) + "Únete al equipo".
- Imagen optimizada de captura real del portal en el bloque "lo ves en vivo".
- Reslug `/nosotros` + 301; registrar en route-ownership matrix; SEO preflight; GVC desktop+mobile.

## Out of Scope

- La Home / el pitch (TASK-1358, PDR-010).
- Motion/hero animado (follow-up con dirección de arte + contrato de Motion).
- Cualquier dato del portal en vivo (la captura es imagen estática, no iframe).
- Reconstruir el grader (nodo compartido, se enlaza).

## Detailed Spec

Ver `docs/ui/wireframes/TASK-1369-about-us-identidad.md` (copy ledger completo, layout skeleton, estados, a11y, implementation mapping, GVC). No duplicar aquí.

## Rollout Plan & Risk Matrix

Página de contenido público (WordPress), aditiva. Riesgo runtime bajo; el riesgo real es de marca/SEO (mismatch de intención o pérdida de equity en el reslug).

### Slice ordering hard rule

- Slice 1 (estructura+copy) → Slice 2 (E-E-A-T) → Slice 3 (CTA + reslug/301 + preflight). El reslug/301 va **al final**, tras validar copy y estructura, para no mover equity antes de tiempo.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Reslug `/nosotros` pierde equity del `/about-us-efeonce/` | SEO / public-site | medium | 301 correcto + registrar en route-ownership matrix + SEO preflight | caída de tráfico/posición del brand SERP |
| Copy suelta "co-creación/integralidad" sin su mecanismo | marca | medium | regla anti-humo del Golden Circle; revisión `greenhouse-ux-writing` | lectura de humo en review |
| Bios inventadas o GEA como caso | E-E-A-T / marca | low | empty state = ocultar equipo; solo casos citables | review + GVC assertion "sin GEA" |
| Nombrar unidades como sub-marcas | marca | low | regla dura PDR-008; GVC assertion | review + GVC |

### Feature flags / cutover

- Sin flag — página de contenido público. Se publica en WordPress; revert = despublicar/restaurar revisión anterior. El 301 se activa solo en Slice 3.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | restaurar revisión anterior de la página en WordPress | <5 min | sí |
| Slice 2 | remover JSON-LD/bios de la revisión | <5 min | sí |
| Slice 3 | revertir 301 + restaurar slug `/about-us-efeonce/` | <15 min | sí |

### Production verification sequence

1. Build en borrador WordPress + preview privado; revisar copy vs wireframe (sin GEA, sin sub-marcas).
2. GVC desktop+mobile en staging del sitio; verificar assertions (h1=Why, sin scroll horizontal).
3. Publicar; verificar JSON-LD válido (`Organization`+`Person`) con test de datos estructurados.
4. Aplicar reslug `/nosotros` + 301; verificar redirect 301 y brand SERP.
5. Monitorear tráfico/posición del brand SERP post-cutover.

### Out-of-band coordination required

- **Input humano:** bios reales del equipo + fotos + dirección de arte del hero.
- Publicación en WordPress + SEO preflight (crawl inventory, canonical, HubSpot IDs/UTM del CTA).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] La página está estructurada como Golden Circle Why→How→What; el `h1` es el Why (no "se orquesta").
- [ ] Todo el copy visible coincide con el Copy Ledger del wireframe; es-LATAM neutro, sin voseo.
- [ ] Las capacidades se describen por función; NO aparecen Globe/Reach/Wave como sub-marcas.
- [ ] "Co-creación/integralidad/partner" aparecen siempre con su mecanismo al lado (regla anti-humo).
- [ ] Solo casos citables (Sky/Bresler/Berel/SSilva); NO aparece GEA (GVC assertion).
- [ ] Bloque equipo con bios reales; si faltan, el bloque se oculta (no placeholders).
- [ ] JSON-LD `Organization` + `Person` válidos; entity capsule presente.
- [ ] Sin scroll horizontal de página en desktop ni mobile 390px.
- [ ] `UI ready` permanece `no` hasta bios reales + dirección de arte aprobada + GVC; si pasa a `yes`, `pnpm task:lint --task TASK-1369` sin findings.
- [ ] GVC desktop + mobile capturado y mirado.

## Verification

- `pnpm task:lint --task TASK-1369`
- `pnpm ui:wireframe-check --task TASK-1369`
- `pnpm fe:capture about-us --env=staging` (desktop+mobile) — mirar los frames
- Test de datos estructurados (JSON-LD) + verificación de 301
- Revisión de copy con `greenhouse-ux-writing`

## Closing Protocol

- [ ] `Lifecycle` sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado si cambió comportamiento visible
- [ ] chequeo de impacto cruzado (TASK-1358 Home / PDR-010)
- [ ] route-ownership matrix actualizado con el reslug/301

## Follow-ups

- Dirección de arte del hero + contrato de Motion (si se agrega scroll-reveal/hero animado) → task de motion.
- Confirmar reslug `/nosotros` vs mantener `/about-us-efeonce/`.

## Open Questions

- ¿Reslug a `/nosotros` (con 301) o mantener `/about-us-efeonce/`? (PDR-011 sugiere `/nosotros`.)
- ¿Fuente de las bios del equipo (ACF/CMS del sitio) y quién las provee?
- ¿La dirección de arte del hero la lidera Product Design con el stack IA propio (como PDR-004)?
