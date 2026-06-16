# TASK-1159 — Public Site Astro SEO Foundation + Service Landing Shell

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `primitive`
- Backend impact: `none`
- Epic: `EPIC-019`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `public-site|astro|seo|ui|marketing-ops|content`
- Blocked by: `none`
- Branch: `task/TASK-1159-public-site-astro-seo-foundation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Preparar `efeoncepro/efeonce-web` como rail Astro/Vercel ejecutable para las primeras landings reales de servicios: limpiar scaffold/demo, consolidar foundation SEO/canonical/sitemap/robots/OG, tokenizar el lenguaje visual Ohio/Figma contra marca Efeonce y construir un shell reusable de landing de servicio con microinteracciones y evidencia visual.

No hace cutover de `efeoncepro.com`, no toca WordPress/Kinsta live y no crea el control plane Greenhouse/Vercel todavía. Deja el repo Astro listo para que la siguiente task conecte Greenhouse y para que las landings de HubSpot, Desarrollo Web y servicios relacionados se produzcan por código sin Elementor.

## Why This Task Exists

`TASK-1158` aceptó Astro/Vercel como frontend público objetivo, pero el repo `efeonce-web` todavía no puede actuar como base confiable para producción: `src/pages/index.astro` es placeholder `noindex`, existen rutas internas demo (`/blocks`, `/forms-test`, `/header-sidebar-preview`, `/header-variants`, `/primitives`), el SEO foundation sigue parcialmente modelado en tasks internas del repo y no hay una experiencia de landing de servicio lista para escalar desde Greenhouse.

Si saltamos directo a "crear landing de HubSpot" sin limpiar el substrato, repetimos el problema de Elementor en otro stack: secciones one-off, SEO inconsistente y QA visual pesada. Esta task crea la base reutilizable primero.

## Goal

- Limpiar o blindar las rutas scaffold/demo de `efeonce-web` para que no puedan exponerse como contenido indexable cuando exista dominio de producción.
- Centralizar SEO helpers, metadata, canonical, JSON-LD, robots, sitemap y OG defaults para rutas core y landings.
- Mapear tokens/patrones Ohio/Figma + Brand Guideline Efeonce a una capa reusable en Astro, sin hardcodear valores page-by-page.
- Construir un shell reusable de landing de servicio con estados visuales, responsive, microinteracciones y reduced-motion.
- Dejar una ruta piloto no-cutover para servicios, lista para validar HubSpot/Desarrollo Web en tareas posteriores.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_SITE_ASTRO_RUNTIME_STRATEGY_DECISION_V1.md`
- `docs/operations/public-site-route-ownership-matrix-20260616.md`
- `docs/operations/public-site-astro-runtime-binding-20260616.json`
- `docs/epics/to-do/EPIC-019-public-website-landing-control-plane.md`
- `docs/architecture/GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_WEBSITE_LANDING_CONTROL_PLANE_ARCHITECTURE_V1.md`
- `/Users/jreye/Documents/efeonce-web/docs/architecture/EFEONCE_WEB_ARCHITECTURE_V1.md`
- `/Users/jreye/Documents/efeonce-web/docs/architecture/Brand_Guideline_Efeonce_v1_1.md`
- `/Users/jreye/Documents/efeonce-web/docs/figma-patterns.md`
- `/Users/jreye/Documents/efeonce-web/docs/content-layer.md`
- `/Users/jreye/Documents/efeonce-web/docs/tasks/to-do/TASK-011-slice-11-seo-deploy-foundation.md`
- `/Users/jreye/Documents/efeonce-web/docs/tasks/to-do/TASK-010-slice-10-landing-pages.md`

Reglas obligatorias:

- No ejecutar DNS, dominio production en Vercel, Kinsta, WordPress, Search Console ni contenido live desde esta task.
- No usar `landing.efeoncepro.com` como carril SEO primario. Las rutas se diseñan para `https://efeoncepro.com/...`, aunque se validen en local/preview.
- Todo preview/deploy que no sea apex production debe ser `noindex` o estar protegido de indexación.
- Rutas demo/scaffold no pueden entrar en sitemap ni quedar indexables.
- Las secciones deben nacer como foundation reusable de `efeonce-web`, no como una landing hardcodeada aislada.
- Los tokens visuales deben mapear Brand Guideline/Figma a la capa existente (`src/styles/global.css`, UI primitives, layouts), no copiar HEX/px arbitrarios por página.
- HubSpot forms/tracking usan los contracts/env existentes; si falta integración real se documenta como follow-up, no se improvisan secrets.

## Normative Docs

- `docs/context/00_INDEX.md`
- `docs/context/08_estrategia-comercial.md`
- `docs/context/14_modelo-negocio-asaas.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/GREENHOUSE_OPERATING_LOOP_V1.md`
- `/Users/jreye/Documents/efeonce-web/AGENTS.md`
- `/Users/jreye/Documents/efeonce-web/docs/operations/DELIVERY_WORKFLOW.md`

## Dependencies & Impact

### Depends on

- `TASK-1158` complete: runtime direction accepted.
- External repo `/Users/jreye/Documents/efeonce-web` on branch `develop`, remote `git@github.com:efeoncepro/efeonce-web.git`.
- Existing `efeonce-web` foundation:
  - `/Users/jreye/Documents/efeonce-web/astro.config.mjs`
  - `/Users/jreye/Documents/efeonce-web/src/layouts/BaseLayout.astro`
  - `/Users/jreye/Documents/efeonce-web/src/layouts/LandingLayout.astro`
  - `/Users/jreye/Documents/efeonce-web/src/components/blocks/*.astro`
  - `/Users/jreye/Documents/efeonce-web/src/components/ui/*.astro`
  - `/Users/jreye/Documents/efeonce-web/src/components/interactive/HubSpotForm.tsx`
  - `/Users/jreye/Documents/efeonce-web/src/styles/global.css`
  - `/Users/jreye/Documents/efeonce-web/src/lib/content.ts`
  - `/Users/jreye/Documents/efeonce-web/src/lib/wordpress.ts`
  - `/Users/jreye/Documents/efeonce-web/e2e/smoke.spec.ts`

### Blocks / Impacts

- Primera landing de servicio HubSpot en Astro.
- Primera landing de servicio Desarrollo Web en Astro.
- Greenhouse Astro/Vercel binding reader MVP.
- Front-door/cutover task para `efeoncepro.com`.
- `EPIC-019` route parity y SEO preflight.

### Files owned

- `/Users/jreye/Documents/efeonce-web/src/pages/index.astro`
- `/Users/jreye/Documents/efeonce-web/src/pages/blocks.astro`
- `/Users/jreye/Documents/efeonce-web/src/pages/forms-test.astro`
- `/Users/jreye/Documents/efeonce-web/src/pages/header-sidebar-preview.astro`
- `/Users/jreye/Documents/efeonce-web/src/pages/header-variants.astro`
- `/Users/jreye/Documents/efeonce-web/src/pages/primitives.astro`
- `/Users/jreye/Documents/efeonce-web/src/pages/servicios/[slug].astro` `[verificar/crear]`
- `/Users/jreye/Documents/efeonce-web/src/layouts/BaseLayout.astro`
- `/Users/jreye/Documents/efeonce-web/src/layouts/LandingLayout.astro`
- `/Users/jreye/Documents/efeonce-web/src/components/blocks/*.astro`
- `/Users/jreye/Documents/efeonce-web/src/components/ui/*.astro`
- `/Users/jreye/Documents/efeonce-web/src/components/landing/*.astro` `[verificar/crear]`
- `/Users/jreye/Documents/efeonce-web/src/lib/seo.ts` `[verificar/crear]`
- `/Users/jreye/Documents/efeonce-web/src/lib/service-landings.ts` `[verificar/crear]`
- `/Users/jreye/Documents/efeonce-web/src/styles/global.css`
- `/Users/jreye/Documents/efeonce-web/public/robots.txt`
- `/Users/jreye/Documents/efeonce-web/public/og-default.png` `[verificar/crear]`
- `/Users/jreye/Documents/efeonce-web/astro.config.mjs`
- `/Users/jreye/Documents/efeonce-web/e2e/*.spec.ts`
- `scripts/frontend/scenarios/public-site-astro-foundation.scenario.ts` `[verificar/crear si GVC se ejecuta desde greenhouse-eo]`
- `docs/tasks/in-progress/TASK-1159-public-site-astro-seo-foundation-service-landing-shell.md`
- `docs/tasks/README.md`
- `docs/tasks/TASK_ID_REGISTRY.md`
- `docs/epics/to-do/EPIC-019-public-website-landing-control-plane.md`
- `Handoff.md`
- `changelog.md`

## Current Repo State

### Already exists

- `efeonce-web` está en `/Users/jreye/Documents/efeonce-web`, branch `develop`, con Astro `^6.1.5`, Vercel adapter `^10.0.4`, React islands y sitemap integration.
- `astro.config.mjs` ya declara `site: 'https://efeoncepro.com'`, `@astrojs/sitemap`, Vercel image optimization y env fields para WordPress, HubSpot, GA4 y Vercel autodeploy.
- `src/layouts/BaseLayout.astro`, `LandingLayout.astro`, `PageLayout.astro` y blocks/UI primitives existen.
- `src/components/interactive/HubSpotForm.tsx` existe como island.
- `src/lib/content.ts` y `src/lib/wordpress.ts` ya encapsulan el content layer.
- `docs/tasks/to-do/TASK-011-slice-11-seo-deploy-foundation.md` ya describe SEO helpers pendientes.
- `docs/tasks/to-do/TASK-010-slice-10-landing-pages.md` ya describe landings dinámicas históricas, pero orientadas a ACF Flexible Content y no a la nueva dirección Greenhouse-coded-first.

### Gap

- `src/pages/index.astro` todavía es placeholder `noindex`; no hay home/landing foundation pública real.
- Rutas demo (`/blocks`, `/forms-test`, `/header-sidebar-preview`, `/header-variants`, `/primitives`) existen como páginas bajo `src/pages/` y deben eliminarse, mover a docs/lab no indexable o bloquearse explícitamente antes de producción.
- No existe `src/lib/seo.ts` como helper central confirmado.
- No existe ruta reusable `servicios/[slug]` ni shell de landing de servicio listo para HubSpot/Desarrollo Web.
- No hay GVC scenario Greenhouse para validar el Astro foundation.
- No hay evidencia Lighthouse/SEO/GVC que permita avanzar hacia cutover.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-platform`
- Usuario / rol: operador Efeonce/Greenhouse, marketing lead, diseñador y agente Codex/Claude que necesita crear landings de servicios rápido y con consistencia.
- Momento del flujo: producción y revisión de una landing de servicio antes de publicarla bajo `efeoncepro.com`.
- Resultado perceptible esperado: una landing coded-first con jerarquía clara, secciones escaneables, CTAs visibles, HubSpot-ready, microinteracciones sutiles al hacer scroll y responsive sin bordes pegados ni exceso de aire.
- Friccion que debe reducir: dependencia de Elementor para layout, retoques manuales de spacing, SEO inconsistente, rutas demo expuestas y QA visual sin scenario.
- No-goals UX: no construir una UI de administración Greenhouse, no clonar exactamente Ohio/Elementor, no crear un page builder libre, no publicar en producción.

### Surface & system decision

- Surface: sitio público Astro `efeonce-web`, rutas futuras `efeoncepro.com/servicios/...`.
- Composition Shell: `no aplica` — el patrón Composition Shell es del portal Greenhouse/Next; en Astro se usa `LandingLayout`/`BaseLayout` como shell público.
- Primitive decision: `extend` — extender los blocks/UI existentes de `efeonce-web` (`Hero`, `FeatureRow`, `ServiceGrid`, `Stats`, `FAQ`, `CTABanner`, `Container`, `Section`, `Button`, `Heading`) y crear solo wrappers/patterns de landing si la composición se repite.
- Adaptive density / The Seam: `aplica por principio` — las secciones/cards deben responder a su propio ancho con CSS/container patterns cuando corresponda; no se acepta overflow horizontal de página.
- Floating/Sidecar/Dialog decision: no aplica en V1; forms HubSpot se embeben como sección/island.
- Copy source: `local one-off` en `efeonce-web` para copy piloto; copy reusable definitivo debe migrar a future Greenhouse Public Site content/source model.
- Access impact: `none` en Greenhouse; los previews Astro deben ser noindex/protegidos si salen a Vercel.

### State inventory

- Default: landing visible con hero, prueba social/partners, propuesta de valor, proceso, casos/servicios, FAQ y CTA.
- Loading: HubSpot island puede mostrar skeleton/fallback si el script tarda.
- Empty: si una landing no existe, 404 honesto sin filtrar internals.
- Error: form/third-party failure debe degradar con CTA alternativo o contacto.
- Degraded / partial: si HubSpot env vars faltan, renderizar fallback explícito no-indexable o CTA simple en preview.
- Permission denied: no aplica para público; preview protegido queda fuera de esta task.
- Long content: secciones deben mantener ritmo y anchors; sin bloques pegados a bordes.
- Mobile / compact: hero, cards, CTAs y forms deben apilar sin horizontal scroll a 390px.
- Keyboard / focus: nav, CTAs, accordions y form fallback deben tener focus visible.
- Reduced motion: scroll reveals/microinteracciones deben apagarse o simplificarse con `prefers-reduced-motion`.

### Interaction contract

- Primary interaction: CTA hacia asesoría/formulario HubSpot y navegación por secciones.
- Hover / focus / active: botones/cards/links con feedback visible y tokenizado.
- Pending / disabled: HubSpot loading/fallback cubierto.
- Escape / click-away: no aplica salvo que se agregue menú mobile; si se toca, usar comportamiento accesible existente.
- Focus restore: si se toca mobile menu, conservar/restaurar foco.
- Latency feedback: HubSpot island no debe dejar bloque vacío.
- Toast / alert behavior: no aplica; errores visibles inline.

### Motion & microinteractions

- Motion primitive: `CSS|framer layout` según lo ya existente en `efeonce-web`; no introducir GSAP en esta task.
- Enter / exit: section reveal sutil en scroll o entrance inicial, si existe helper reutilizable.
- Layout morph: no requerido.
- Stagger: permitido en cards/feature rows si no afecta LCP.
- Timing / easing token: usar tokens/clases existentes en `src/styles/global.css`; si faltan, añadir tokens mínimos documentados.
- Reduced-motion fallback: todas las animaciones deben respetar `prefers-reduced-motion`.
- Non-goal motion: nada de efectos pesados, parallax agresivo o JS global innecesario.

### Visual verification

- GVC scenario: `public-site-astro-foundation` o captura `pnpm fe:capture --route=http://localhost:4321/... --env=local` desde `greenhouse-eo`; si GVC no soporta el target externo, usar Playwright e2e con screenshots y documentar la limitación.
- Viewports: desktop 1440px y mobile 390px/iPhone.
- Required captures: home/foundation, ruta de servicio piloto, sección de cards, FAQ, CTA/form.
- Required `data-capture` markers: `public-site-hero`, `public-site-service-shell`, `public-site-seo-cta`, `public-site-faq`, `public-site-form`.
- Scroll-width check: medir `scrollWidth === clientWidth` en desktop y 390px.
- Accessibility/focus checks: foco visible en CTAs/nav/FAQ; headings jerárquicos; landmarks básicos.
- Before/after evidence: antes con placeholder/demo routes; después con shell limpio y captures.
- Known visual debt: contenido final de cada servicio puede quedar como piloto; la calidad de copy definitivo se cierra en la task de landing específica.

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

### Slice 1 — Scaffold and route hygiene

- Auditar `src/pages/` en `efeonce-web` y clasificar cada ruta como production candidate, internal showcase, diagnostic, API o legacy.
- Eliminar, mover o bloquear rutas demo (`blocks`, `forms-test`, `header-sidebar-preview`, `header-variants`, `primitives`) para que no entren en sitemap ni queden indexables.
- Mantener cualquier ruta interna necesaria solo si queda noindex/protegida y documentada.
- Actualizar README/HANDOFF de `efeonce-web` con el estado real post-limpieza.

### Slice 2 — SEO foundation

- Crear o completar `src/lib/seo.ts` con helpers tipados para metadata, canonical, Open Graph/Twitter, Organization/WebPage/Breadcrumb/FAQ JSON-LD y fallback desde Yoast cuando aplique.
- Integrar `BaseLayout.astro` con props SEO y `jsonLd`.
- Ajustar `astro.config.mjs`, `public/robots.txt` y sitemap para excluir rutas internas y emitir URLs canónicas de `https://efeoncepro.com`.
- Crear `public/og-default.png` o alternativa raster real 1200x630 si no existe.
- Agregar tests unitarios para helpers SEO.

### Slice 3 — Brand/token and landing pattern foundation

- Revisar `src/styles/global.css`, UI primitives y blocks contra Brand Guideline v1.1 + `docs/figma-patterns.md`.
- Consolidar tokens mínimos para tipografía, color, spacing, radius y motion del sitio público sin copiar valores crudos por sección.
- Ajustar `LandingLayout`/blocks para que secciones full-bleed y contenedores tengan márgenes profesionales en desktop/mobile.
- Preservar visual richness: scroll reveals/microinteracciones sutiles, hover/focus, reduced motion.

### Slice 4 — Service landing shell

- Crear una ruta reusable para servicios (`src/pages/servicios/[slug].astro` o ruta equivalente aprobada en Plan Mode).
- Crear `src/lib/service-landings.ts` o equivalente con datos piloto tipados para al menos una landing de servicio no-cutover.
- Componer el shell con blocks existentes: hero, value props, metodología/proceso, proof/partners, tools, FAQ, CTA/form.
- Incluir HubSpot-ready section usando `HubSpotForm.tsx` o fallback explícito si faltan env vars.
- Asegurar que la ruta usa canonical futuro `https://efeoncepro.com/...` pero no se publica como producción desde esta task.

### Slice 5 — Visual, SEO and release evidence

- Ejecutar `npm run lint`, `npm run format:check`, `npm run type-check`, `npm run test:unit`, `npm run build` en `efeonce-web`.
- Ejecutar Playwright/GVC desktop + mobile sobre home/foundation y ruta piloto.
- Medir `scrollWidth === clientWidth` en desktop y mobile 390px.
- Correr Lighthouse local/preview para SEO/performance/accessibility en home y ruta piloto; documentar scores y gaps.
- Documentar en `Handoff.md` de ambos repos lo validado, lo no ejecutado y el siguiente paso.

## Out of Scope

- No cambiar DNS ni apuntar `efeoncepro.com` a Vercel.
- No configurar dominio production en Vercel.
- No tocar WordPress/Kinsta live, WP admin, cache, plugins, posts, pages ni Elementor.
- No crear Greenhouse Public Site UI ni commands/readers para GitHub/Vercel; eso queda como follow-up backend-data.
- No migrar blog completo ni implementar headless blog final.
- No crear todas las landings finales de servicios; esta task deja shell/piloto reusable.
- No reemplazar el content source definitivo ni eliminar la necesidad de revisión humana de copy/SEO.

## Detailed Spec

La implementación debe resolver como mínimo:

- El sitio Astro no expone rutas demo internas en sitemap ni indexación.
- La página base deja de ser un placeholder sin valor; si todavía no es home final, debe estar claramente no-cutover y noindex en preview.
- Cada ruta pública candidate tiene `<title>`, meta description, canonical, OG/Twitter y JSON-LD cuando aplique.
- `robots.txt` referencia sitemap absoluto y excluye rutas internas.
- Sitemap generado no contiene routes demo.
- Las landings de servicio tienen una estructura reusable y testeable, no una página estática aislada.
- Las microinteracciones al bajar no aplanan la experiencia: deben existir pero ser ligeras, accesibles y desactivables con reduced motion.
- Las cards/secciones no se pegan a los bordes ni abusan de márgenes gigantes; el ritmo debe verificarse con captura desktop/mobile.
- La task no depende de que el dominio principal ya apunte a Vercel.

## Rollout Plan & Risk Matrix

Esta task opera en `efeonce-web` y no cambia producción. El rollout real es preview/local. El cutover se mantiene bloqueado por tareas futuras de route parity, Search Console, DNS/front-door y aprobación humana.

### Slice ordering hard rule

- Slice 1 (route hygiene) MUST happen before Slice 2 final sitemap/robots validation.
- Slice 2 (SEO foundation) MUST happen before Slice 4 creates service candidate routes.
- Slice 3 (token/pattern foundation) MUST happen before Slice 4 locks the shell.
- Slice 5 cannot close until Slices 1-4 are validated in local/preview.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Rutas demo quedan indexables al conectar dominio | SEO / public-site | medium | Excluir de sitemap, noindex/proteger o eliminar; test de sitemap | Sitemap contiene `/blocks`, `/forms-test`, `/primitives` |
| Shell reusable nace como landing hardcodeada | UI / content ops | medium | Datos tipados + componentes/patterns reusables + acceptance criteria de reuse | Nueva landing requiere copiar página entera |
| SEO helpers duplican logic por página | SEO / dx | medium | `src/lib/seo.ts` centralizado + tests | Meta/canonical escritos inline en múltiples pages |
| Microinteracciones degradan performance/LCP | performance / UX | medium | CSS/framer ligero, reduced-motion, Lighthouse | Lighthouse performance < 90 o long tasks por JS innecesario |
| HubSpot/form queda roto en preview | conversion / CRM | low | Fallback visible + smoke de env vars + documentar faltantes | Form container vacío o error de consola |

### Feature flags / cutover

- Sin feature flag en producción porque no hay producción ni cutover.
- Previews deben permanecer noindex/protegidos hasta que una task futura apruebe launch readiness.
- Cutover a `efeoncepro.com` requiere task futura explícita con route matrix, Search Console, redirects, sitemap, HubSpot attribution y aprobación humana.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revertir commit de route hygiene en `efeonce-web` | < 10 min | si |
| Slice 2 | Revertir `seo.ts`/layout/sitemap/robots changes | < 15 min | si |
| Slice 3 | Revertir token/layout pattern commit | < 20 min | si |
| Slice 4 | Revertir ruta `servicios/[slug]` y datos piloto | < 10 min | si |
| Slice 5 | No aplica, evidencia/documentación | N/A | si |

### Production verification sequence

1. Validar local en `efeonce-web`: lint, format, type-check, unit tests y build.
2. Levantar `npm run dev` o `npm run preview` y capturar desktop/mobile.
3. Verificar sitemap/robots generados en `dist/client`.
4. Verificar que rutas demo no existan o no sean indexables.
5. Correr Lighthouse local/preview.
6. Registrar evidencia en handoff. Stop: no promotion a production ni DNS.

### Out-of-band coordination required

- Requiere acceso al repo externo `efeoncepro/efeonce-web` y eventualmente push a su `develop`.
- No requiere credenciales nuevas.
- No requiere WordPress/Kinsta.
- No requiere Vercel production domain.
- Puede requerir confirmación posterior de marketing para copy final de landings, fuera de esta task.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `Execution profile: ui-ux` y `UI impact: primitive` reflejan el alcance real.
- [ ] Rutas demo/scaffold de `efeonce-web` quedan eliminadas, movidas o noindex/protegidas, y no aparecen en sitemap.
- [ ] `src/lib/seo.ts` o helper equivalente centraliza metadata, canonical, OG/Twitter y JSON-LD.
- [ ] `BaseLayout.astro` consume el contrato SEO sin duplicar boilerplate por página.
- [ ] `robots.txt` y sitemap usan URL absoluta `https://efeoncepro.com` y excluyen rutas internas.
- [ ] Existe raster OG default (`public/og-default.png` o equivalente) apto para redes.
- [ ] Tokens/patrones de marca se ajustan en capa reusable; no hay hardcode page-by-page de HEX/px/font family para el shell.
- [ ] Existe shell reusable de landing de servicio basado en blocks/layouts existentes, no una página aislada.
- [ ] Estados HubSpot/form loading/error/fallback quedan cubiertos o explícitamente fuera de scope con follow-up.
- [ ] Motion/microinteracciones tienen fallback de reduced motion.
- [ ] GVC o Playwright visual desktop + mobile fue capturado y revisado.
- [ ] Se midió que no existe scroll horizontal de página en desktop ni mobile 390px.
- [ ] Lighthouse SEO/performance/accessibility fue ejecutado en home/foundation y ruta piloto, con gaps documentados.
- [ ] No se ejecutó DNS, Vercel production domain, WordPress/Kinsta live ni Search Console cutover.

## Verification

En `/Users/jreye/Documents/efeonce-web`:

- `npm run lint`
- `npm run format:check`
- `npm run type-check`
- `npm run test:unit`
- `npm run build`
- `npm run test:e2e` si el e2e smoke cubre las rutas nuevas o se actualiza para cubrirlas
- Inspección de `dist/client/sitemap-index.xml` y `dist/client/sitemap-0.xml`
- Inspección de `dist/client/robots.txt`
- Lighthouse local/preview para home/foundation y ruta piloto

En `/Users/jreye/Documents/greenhouse-eo` si se agrega scenario GVC:

- `pnpm fe:capture public-site-astro-foundation --env=local`
- `pnpm fe:capture:review public-site-astro-foundation`
- `pnpm ops:lint --changed`
- `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `efeonce-web/HANDOFF.md` quedo actualizado con commit, evidencia y no-cutover posture
- [ ] `docs/epics/to-do/EPIC-019-public-website-landing-control-plane.md` quedo sincronizado si cambia el mapa del epic

## Follow-ups

- TASK-1160 candidato: Greenhouse Astro/Vercel binding reader MVP (`backend-data`, `Backend impact: integration`) para leer repo/deploy/route state desde Greenhouse.
- TASK-1161 candidato: Public Site first service landing, HubSpot services.
- TASK-1162 candidato: Public Site first service landing, Desarrollo Web.
- TASK futura: front-door/cutover readiness con DNS/Vercel/Search Console/redirects.

## Open Questions

- ¿La ruta de servicios final será `/servicios/<slug>` o conservará slugs actuales tipo `/servicio-marketing-de-contenidos/` para paridad SEO? Plan Mode debe decidirlo contra la route matrix antes de implementar.
- ¿El primer piloto de contenido debe ser HubSpot, Desarrollo Web o Marketing de Contenidos? Esta task puede usar datos piloto, pero el copy final requiere task específica.
- ¿Los assets reales vendrán desde WordPress Media, repo `public/` o Figma export gobernado? Resolver solo lo mínimo para no bloquear el shell.
