# TASK-1259 — WordPress Greenhouse Form Selector + Embed UX

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
- Backend impact: `none`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|public-site|wordpress|ui`
- Blocked by: `TASK-1258`
- Branch: `task/TASK-1259-wordpress-greenhouse-form-selector-embed-ux`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construye la experiencia de seleccion e insercion de Growth Forms en WordPress/Elementor/Gutenberg, usando Greenhouse como source of truth. Replica lo valioso del plugin HubSpot: el editor del sitio no escribe IDs a mano; elige un form publicado, ve estado/surface y el host genera un embed fino del renderer portable.

## Why This Task Exists

El plugin HubSpot gana adopcion porque se integra donde trabaja el editor: shortcode, block, Elementor widget y admin remoto. Greenhouse ya tiene renderer portable, pero si obligamos a pegar snippets manualmente, cada pagina queda fragil y dificil de auditar. Necesitamos un selector propio que haga que WordPress sea un host adapter ergonomico, no una fuente paralela de forms.

## Goal

- Crear un selector WordPress/Elementor/Gutenberg para forms publicados de Greenhouse.
- Insertar/mantener embeds `<greenhouse-form>` o wrapper equivalente sin escribir `formId`/`formSlug` a mano.
- Mostrar estados relevantes: publicado/no publicado, version, destination readiness, surface id, ultima verificacion.
- Mantener la UI del editor como cliente puro del contract de **TASK-1258** y del motor Growth Forms.
- Validar con evidencia visual/editorial que el usuario puede insertar, editar y renderizar un form sin tocar HubSpot.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md`
- `docs/manual-de-uso/growth/incrustar-formulario-wordpress-astro.md`
- `docs/documentation/growth/motor-formularios-publicos.md`
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`

Reglas obligatorias:

- El editor WordPress no autoriza ni modifica definitions; solo selecciona forms publicados y registra surfaces.
- El widget/block/shortcode no contiene logica de validacion, condiciones, destinos ni tracking avanzado.
- No copiar codigo del plugin HubSpot; usar su modelo de integracion como referencia de UX.
- El plugin HubSpot `leadin` queda **read-only**: no patch, no fork, no override, no monkey patch.
- Copy visible reutilizable debe venir de la capa canonica o quedar documentado para canonizacion.
- Cualquier UI visible requiere evidencia GVC/browser y scroll-width check desktop/mobile donde aplique.

## Normative Docs

- `.codex/skills/greenhouse-product-ui-architect/SKILL.md`
- `.codex/skills/greenhouse-portal-ui-implementer/SKILL.md`
- `.codex/skills/efeonce-public-site-wordpress/SKILL.md`
- `.codex/skills/greenhouse-browser-diagnostics/SKILL.md`

## Dependencies & Impact

### Depends on

- `TASK-1258` HubSpot Embed Inventory + Greenhouse Forms Migration Control Plane.
- `TASK-1231` Growth Forms Portable Renderer + Host Surfaces.
- `TASK-1232` Growth Forms Admin Cockpit + First Migration.
- Runtime WordPress/Elementor plugin surface de Efeonce (verificar repo/runtime durante Plan).

### Blocks / Impacts

- Migracion progresiva de paginas Efeonce desde embeds HubSpot a Growth Forms.
- Operacion editorial del sitio publico WordPress.
- Futuro motor de tracking propio, porque el embed debe emitir eventos estables sin asumir HubSpot.

### Files owned

- `src/growth-forms-renderer/**`
- `src/lib/growth/forms/contracts.ts`
- `docs/manual-de-uso/growth/incrustar-formulario-wordpress-astro.md`
- `docs/documentation/growth/motor-formularios-publicos.md`
- `scripts/frontend/scenarios/**` si se crea escenario GVC para preview/host smoke
- Runtime WordPress Efeonce `eo-elementor-widgets` / block / shortcode files (path exacto a verificar en Plan)

## Current Repo State

### Already exists

- Renderer portable `<greenhouse-form>` y API publica de render/submit.
- Arquitectura para host surfaces WordPress/Astro.
- Admin cockpit Growth Forms en progreso.
- Scripts public-site para inspeccion/deploy dry-run.

### Gap

- No existe selector editorial propio para insertar Growth Forms desde WordPress.
- No existe widget/block Greenhouse con estado de form/version/surface/destination.
- El editor debe conocer IDs o snippets manuales, lo que rompe auditabilidad y aumenta errores.

## UI/UX Contract

### Experience brief

- UI rigor: `product-flow`
- Usuario / rol: editor/implementador del sitio Efeonce, operador Growth.
- Momento del flujo: insertar o editar un formulario en una pagina WordPress/Elementor/Gutenberg.
- Resultado perceptible esperado: elegir un form publicado de Greenhouse, insertarlo, verlo renderizado y entender si esta listo para recibir leads.
- Friccion que debe reducir: copiar snippets, buscar form IDs en HubSpot, perder destination readiness o romper embed al editar contenido.
- No-goals UX: construir un form builder completo dentro de WordPress; WordPress no edita definitions.

### Surface & system decision

- Surface: WordPress editor widget/block/shortcode UI + preview frontend.
- Composition Shell: `no aplica` en WordPress runtime; si se agrega preview/admin dentro de Greenhouse, usar Composition Shell.
- Primitive decision: `reuse` renderer portable `<greenhouse-form>`; el selector WordPress es host adapter, no primitive Greenhouse nueva.
- Adaptive density / The Seam: `aplica` al preview del form en contenedores variables.
- Floating/Sidecar/Dialog decision: selector puede usar modal/popup nativo del editor solo si respeta foco; no crear sistema paralelo.
- Copy source: labels y estados de sistema deben canonizarse en docs/copy del motor si tambien aparecen en Greenhouse.
- Access impact: editor WordPress autenticado; public preview sin sesion usa API publica de render.
- Iframe decision: no por defecto; solo fallback documentado para host hostil.

### State inventory

- Default: selector con lista de forms publicados.
- Loading: consultando catalogo de forms/surfaces.
- Empty: no hay forms publicados o API no habilitada.
- Error: Greenhouse API no disponible, credencial/surface no valida.
- Degraded / partial: form existe pero destination no esta listo o la version no esta publicada.
- Permission denied: usuario WordPress sin permiso de insertar/editar widgets.
- Long content: lista de forms amplia, nombres largos, paginas con multiples embeds.
- Mobile / compact: preview publico sin scroll horizontal a 390px.
- Keyboard / focus: busqueda, seleccion, guardar y cancelar navegables por teclado.
- Reduced motion: sin dependencia de motion para comprender estado.

### Interaction contract

- Primary interaction: buscar form -> seleccionar version publicada -> asignar/confirmar surface -> insertar embed.
- Hover / focus / active: estados visibles y accesibles.
- Pending / disabled: guardar bloqueado solo mientras se consulta/aplica; no bloquear por estados informativos si el command permite draft.
- Escape / click-away: cerrar selector sin perder configuracion guardada.
- Focus restore: volver al trigger/editor despues de cerrar selector.
- Latency feedback: skeleton o loading inline, no spinner de pagina completa.
- Toast / alert behavior: usar feedback nativo del editor; errores persistentes junto al campo/selector.
- Measurement interaction: embed debe seguir emitiendo eventos browser-safe existentes del renderer; tracking propio queda fuera.

### Motion & microinteractions

- Motion primitive: `CSS`/nativo del editor; no GSAP.
- Enter / exit: minimo, consistente con WordPress/Elementor.
- Layout morph: N/A.
- Stagger: N/A.
- Timing / easing token: usar tokens si la UI vive en Greenhouse; runtime WordPress puede usar CSS vars publicas.
- Reduced-motion fallback: instant.
- Non-goal motion: animaciones decorativas.

### Visual verification

- GVC scenario: crear o extender scenario para preview Greenhouse/host si el flujo queda repetible; para WordPress editor, usar browser diagnostics/Playwright con artifacts bajo `.captures/`.
- Viewports: desktop editor, desktop public preview, mobile 390px public preview.
- Required captures: selector default, empty/error, form inserted, public render, validation/success si aplica.
- Required `data-capture` markers: form root, selector root si esta bajo control Greenhouse, public preview container.
- Scroll-width check: obligatorio en public preview desktop y mobile 390px.
- Accessibility/focus checks: tab order en selector, labels, focus restore, no trap accidental.
- Measurement checks: eventos existentes del renderer llegan sin PII cruda.
- Before/after evidence: comparar pagina HubSpot embed vs Greenhouse embed si TASK-1258 provee piloto.
- Known visual debt: WordPress/Elementor CSS puede interferir; adapter debe aislar solo lo necesario via CSS vars, no reset global.

### Forms-UX floor

- El renderer ya debe cumplir el piso de forms de `TASK-1231`/`TASK-1256`; esta task no reimplementa campos.
- El selector debe evitar IDs manuales: form name, version, slug y readiness visibles.
- Estados de error deben explicar que hacer, no mostrar payload tecnico.
- Si el form no esta publicado, el editor puede mostrarlo como no insertable o advertencia segun contract.

### A11y floor

- Selector operable por teclado.
- Labels programaticos para busqueda/lista/acciones.
- Focus visible y restore despues de cerrar modal/popup.
- Public render mantiene labels/errors del renderer, no los pisa con CSS host.
- Verificar reflow/scroll a 390px y zoom cuando sea viable.

### Token + CSS portable

- No hardcodear colores/typography si se toca UI Greenhouse.
- En WordPress, usar CSS custom properties del renderer y clases namespaced.
- No resetear estilos globales del sitio.
- Mantener compatibilidad dark/section background cuando el host lo permita.

### Copy

- Copy del form viene del `render_contract`.
- Copy de selector/editor debe quedar en una tabla local/canonica documentada; no literals dispersos.
- Error copy: accionable, es-CL, sin tecnicismos de HubSpot/Greenhouse internos.

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

### Slice 1 — Editor contract + catalog read

- Definir el DTO que el selector consume: forms publicados, version, slug, display name, destination readiness, allowed surfaces.
- Reusar reader/API de `TASK-1258`/`TASK-1232`; no crear endpoint WordPress-only ad hoc.

### Slice 2 — WordPress shortcode/block selector

- Crear o extender shortcode/block para insertar Growth Forms desde un selector.
- Persistir solo referencia estable (`formSlug`, version/surface segun contract), no snapshots de campos.
- Soportar edicion de un embed existente sin perder configuracion.

### Slice 3 — Elementor widget parity

- Crear o extender widget Elementor equivalente al bloque/shortcode.
- Mostrar preview honesto: loading, no publicado, destination no listo, render publico.
- Evitar que Elementor duplique scripts del renderer.

### Slice 4 — Evidence + docs

- Capturas editor/public preview.
- Manual de uso actualizado para insertar/migrar un form.
- Smoke de pagina piloto heredada de `TASK-1258` cuando exista.

## Out of Scope

- Inventario/migration apply backend → **TASK-1258**.
- Motor propio de tracking Greenhouse.
- Form builder dentro de WordPress.
- Cambios al adapter HubSpot secure submit salvo wiring necesario ya expuesto por contracts existentes.
- Desinstalar o reemplazar globalmente el plugin HubSpot `leadin`.
- Modificar el plugin HubSpot `leadin` o cualquier archivo de ese plugin.

## Detailed Spec

La experiencia objetivo debe sentirse como una version Greenhouse del flujo HubSpot: el editor abre el widget/block, busca un form publicado, ve si esta listo, lo inserta y el frontend monta el renderer portable. La diferencia arquitectonica es clave: el plugin HubSpot delega casi todo a scripts remotos de HubSpot; Greenhouse debe delegar al motor propio versionado. Por eso el widget solo guarda referencias y surface metadata. La UI nunca debe permitir editar campos, validaciones o destinos desde WordPress; para eso existe el cockpit Greenhouse.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (contract) -> Slice 2 (shortcode/block) -> Slice 3 (Elementor widget) -> Slice 4 (evidence/docs).
- Slice 3 puede avanzar en paralelo con Slice 2 solo despues de cerrar el DTO de Slice 1.
- Ningun editor visual shippea si no puede renderizar el mismo `<greenhouse-form>` que el shortcode.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Editor guarda snapshots obsoletos del form | wordpress / growth | medium | persistir referencias/versiones, no field schema | mismatch de version en preview |
| Elementor duplica scripts o monta dos forms | wordpress / public-site | medium | singleton loader + detector de duplicate root | console error / double submit |
| UI permite insertar form no publicado | growth | medium | readiness visible + command/reader bloquea segun contract | public render 404/unpublished |
| CSS del host rompe el renderer | public-site / ui | medium | CSS vars namespaced + GVC/public preview | scroll-width/visual regression |
| Tracking se acopla a HubSpot/dataLayer antes de definir motor propio | analytics | high | eventos existentes browser-safe; tracking own-engine fuera de scope | review de PR |

### Feature flags / cutover

- Reusar flags de public API/renderer existentes.
- Si se necesita habilitar el selector gradualmente, usar flag runtime/plugin config default OFF.
- Cutover por editor/page, no global.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert contract/UI consumer; no content mutation | <5 min | si |
| Slice 2 | desactivar block/shortcode nuevo; contenido existente conserva markup previo | <10 min | si |
| Slice 3 | desactivar widget Elementor nuevo | <10 min | si |
| Slice 4 | docs/artifacts only | <5 min | si |

### Production verification sequence

1. Verificar catalogo de forms publicados en staging.
2. Insertar form en pagina staging via shortcode/block.
3. Insertar el mismo form via Elementor widget.
4. Capturar public preview desktop/mobile, medir `scrollWidth <= clientWidth`.
5. Submit test y verificar Greenhouse ledger + destination attempt.
6. Repetir piloto en prod solo despues de `TASK-1258` apply/dry-run aprobado.

### Out-of-band coordination required

- Acceso/editor staging WordPress/Elementor.
- Aprobacion del operador para activar selector en sitio productivo.
- Coordinacion con quien este ejecutando `TASK-1232`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Selector lista solo forms publicados/insertables segun contrato Greenhouse.
- [ ] Editor inserta/edita embed sin escribir IDs manualmente.
- [ ] Shortcode/block y Elementor widget renderizan el mismo form/version.
- [ ] Public preview carga `<greenhouse-form>` una sola vez y no duplica scripts.
- [ ] Estados empty/error/unpublished/destination-not-ready son visibles y accionables.
- [ ] GVC/browser evidence cubre desktop/mobile y scroll-width.
- [ ] Tracking propio queda fuera de scope y no se introduce dependencia nueva a HubSpot tracking.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm ops:lint --changed`
- Browser diagnostics / Playwright para editor WordPress cuando GVC no cubra editor autenticado
- `pnpm fe:capture --route=<pagina-piloto> --env=staging` o scenario dedicado si aplica
- Submit smoke contra pagina piloto y verificacion de ledger/destination attempt

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado si cambia UX/runtime visible
- [ ] chequeo de impacto cruzado sobre `TASK-1231`, `TASK-1232`, `TASK-1258`
- [ ] manual de uso WordPress/Astro actualizado con el nuevo flujo
- [ ] evidencia visual referenciada en Handoff

## Follow-ups

- Task/ADR para motor propio de tracking Greenhouse.
- Posible migracion Astro del mismo selector/embed si el sitio deja WordPress.

## Open Questions

- ¿Selector vive primero como Elementor widget, Gutenberg block o ambos en la misma entrega?
- ¿El catalogo se consulta directo desde Greenhouse API o via proxy/plugin server-side de WordPress para controlar auth/caching?
