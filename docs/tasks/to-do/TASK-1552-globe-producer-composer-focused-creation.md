# TASK-1552 — Globe Producer Composer Focused Creation

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `layout`
- UI ready: `no`
- Wireframe: `docs/ui/wireframes/TASK-1552-globe-producer-composer-focused-creation.md`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `EPIC-028`
- Status real: `Dirección definida; pendiente de implementación y evidencia visual`
- Rank: `TBD`
- Domain: `creative|ui|product`
- Blocked by: `none`
- Branch: `task/TASK-1552-globe-producer-composer-focused-creation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Recomponer el composer de Globe Producer para que una sola intención creativa domine el first fold: `prompt → dirección → output shape → generar`. Las capacidades avanzadas permanecen disponibles mediante progressive disclosure, sin duplicar el costo ni contradecir `TASK-1532`.

## Why This Task Exists

El composer actual intenta ser prompt editor, selector de modelos, panel de presets, laboratorio de seed, superficie de governance y panel de referencias simultáneamente. El resultado es una jerarquía débil, demasiados contenedores y una acción primaria poco concluyente. La solución es de composición y exposición progresiva, no de eliminación de capacidades.

## Goal

- Hacer del prompt la entrada dominante del Producer.
- Reducir la competencia visual entre sugerencias, presets, referencias, seed, modelo y governance.
- Mantener Imagen, Video y Audio como modos de un solo producto con controles específicos por modalidad.
- Integrar el CTA y los estados de `TASK-1532` sin añadir una línea de costo duplicada ni ocultar créditos.
- Entregar una recomposición premium verificable en desktop 1440 px y mobile 390 px.

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md`
- `docs/ui/visual-directions/TASK-1505-globe-creative-producer-approved-direction.md`
- `docs/tasks/in-progress/TASK-1505-globe-creative-producer-surface.md`
- `docs/tasks/to-do/TASK-1531-globe-creative-prompt-studio-experience.md`
- `docs/tasks/to-do/TASK-1532-globe-one-click-generate-automatic-estimate.md`
- `.codex/skills/greenhouse-ai-design-studio/SKILL.md`
- `.codex/skills/greenhouse-product-ui-architect/SKILL.md`

Reglas obligatorias:

- Reusar el lenguaje visual y el loop aprobado de Globe Producer, materializado en **componentes tipados del payload ADR-014** (esta task es el Slice 3 del strangler); no crear un sistema UI paralelo ni un cuarto bloque `:root` de tokens.
- El navegador no calcula costos, balance, policy, provenance ni provider metadata.
- El catálogo, estimate, prepare/generate, provenance y capabilities siguen siendo server-authoritative.
- El costo continúa visible en el CTA según `TASK-1532`; se elimina sólo la ceremonia de cálculo manual.
- Las capacidades aún gated aparecen con estados honestos y no como controles ejecutables falsos.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md`
- `docs/ui/visual-directions/TASK-1552-globe-producer-composer-focused-creation.md`
- `docs/ui/wireframes/TASK-1552-globe-producer-composer-focused-creation.md`

## Dependencies & Impact

### Depends on

- `TASK-1505` — Producer surface y patrones existentes.
- `TASK-1531` — Creative Prompt Studio, si su propuesta se integra en el composer.
- `TASK-1532` — CTA único y estimate automático.
- `TASK-1494` — Style DNA/Reference Intelligence cuando la UI exponga esas affordances.

### Blocks / Impacts

- Mejora el first fold y la exposición de capacidades del Producer sin modificar contratos backend.
- Debe coordinar ownership de archivos con `TASK-1505`, `TASK-1531` y `TASK-1532` antes de implementación.
- No bloquea la librería, viewer ni las rutas de promoción; consume sus estados existentes.

### Files owned

- `../efeonce-globe/apps/studio-web/src/producer-ui.ts`
- `../efeonce-globe/apps/studio-web/src/producer-controller.ts`
- `../efeonce-globe/apps/studio-web/src/producer-copy.ts`
- `../efeonce-globe/apps/studio-web/scripts/producer-gvc-fixture.mjs`
- `docs/ui/visual-directions/TASK-1552-globe-producer-composer-focused-creation.md`
- `docs/ui/wireframes/TASK-1552-globe-producer-composer-focused-creation.md`

## Current Repo State

### Already exists

- Producer Console con modos Image/Video/Audio, prompt, references, presets, Style DNA, seed, route/model, output shape y feed.
- Estimate server-side y CTA contract de `TASK-1532`.
- Creative Prompt Studio propuesto en `TASK-1531`.
- GVC premium para desktop/mobile y patrones de estados honestos.

### Gap

- El composer abre demasiadas capacidades simultáneamente.
- La modalidad aparece duplicada dentro y fuera del composer.
- Sugerencias y presets forman una pared de chips sin jerarquía.
- Seed, modelo y governance compiten con la intención creativa.
- Referencias no disponibles pueden ocupar espacio dominante.
- La composición no distingue con suficiente claridad entre creación rápida y configuración avanzada.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `../efeonce-globe/apps/studio-web` Producer Console
- Future candidate home: `remain-shared`
- Boundary: UI consumer over existing Producer catalog, estimate, run, provenance and prompt contracts
- Server/browser split: browser owns presentation, disclosure and focus; Globe readers/commands own catalog, estimate, policy, access, provenance and generation
- Build impact: existing Globe Studio Web UI/CSS/tests/GVC only; no new dependency, package or runtime
- Extraction blocker: same-origin session/BFF, Producer state and current Globe pattern registry

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: operador creativo autenticado de Globe Producer.
- Momento del flujo: antes de generar una pieza Image, Video o Audio.
- Resultado perceptible esperado: entender qué crear, ajustar lo mínimo necesario y generar sin navegar un panel técnico.
- Fricción que debe reducir: densidad, duplicación, jerarquía débil y controles avanzados expuestos demasiado pronto.
- No-goals UX: ocultar capacidades, ocultar créditos, rediseñar todo el feed o convertir el composer en chat.

### Surface & system decision

- Surface: `/producer`, Producer Console/composer.
- Composition Shell: `no aplica` — la superficie pertenece al shell/pattern propio de Globe y el cambio es una extensión local del composer existente.
- Primitive decision: `extend` — Producer Console/composer y CTA existentes; no crear primitive paralela.
- Adaptive density / The Seam: `aplica` — el composer debe recomponerse a 390 px sin compresión ni overflow.
- Floating/Sidecar/Dialog decision: conservar el lane existente; advanced settings pueden usar el patrón Globe vigente sólo si superan el fold.
- Copy source: `../efeonce-globe/apps/studio-client/src/copy/index.ts` — este slice **absorbe** `producer-copy.ts` **moviéndolo** (studio-web depende de studio-client: el copy viaja en esa dirección y nunca de vuelta). Duplicarlo abre dos fuentes de verdad cuyo drift es invisible hasta que una etiqueta queda vieja.
- Access impact: `entitlements` existentes; sin cambio de autorización.

### State inventory

- Default: prompt vacío, dirección compacta, output shape mínimo y ajustes avanzados cerrados.
- Loading: estados de estimate/prepare/run de `TASK-1532` dentro del mismo CTA.
- Empty: prompt vacío con orientación breve, sin pared de sugerencias.
- Error: mensaje canónico y recovery contextual.
- Degraded / partial: catálogo, references o capabilities no disponibles se muestran como gated/partial honestos.
- Permission denied: estado de capability sin raw error ni control ejecutable.
- Long content: prompt y labels envuelven sin romper el layout.
- Mobile / compact: columna única, CTA 44 px, disclosures usables y cero overflow.
- Keyboard / focus: focus visible; disclosure y CTA no roban foco; focus restore determinista.
- Reduced motion: estados y disclosure conservan significado sin transición espacial.

### Interaction contract

- Primary interaction: prompt → dirección/formato → CTA único `Generar`.
- Hover / focus / active: estados equivalentes en pointer, teclado y touch.
- Pending / disabled: sólo disabled por input/capability inválidos o command activo; estimate stale sigue resolviéndose por `TASK-1532`.
- Escape / click-away: no aplica al composer base; si advanced settings usan sheet, reutilizar contrato Globe existente.
- Focus restore: vuelve al control que abrió/cerró disclosure; el CTA conserva foco durante estimate/prepare/run.
- Latency feedback: reutiliza estados textuales de `TASK-1532`; no porcentajes inventados.
- Toast / alert behavior: errores persistentes en el bloque de ejecución; no depender sólo de toast.

### Motion & microinteractions

- Motion primitive: `none` para esta task; se conserva motion existente y no se añade core nuevo.
- Enter / exit: disclosure puede aparecer con comportamiento instantáneo o token existente.
- Layout morph: no introducir morph paralelo.
- Stagger: none.
- Timing / easing token: existing Globe tokens only if the implementation reuses existing disclosure behavior.
- Reduced-motion fallback: estado final inmediato y texto equivalente.
- Non-goal motion: parallax, loops, confetti, progreso ficticio o animaciones que retrasen control.

### Implementation mapping

- Route / surface: `/producer` en `../efeonce-globe/apps/studio-web`.
- Primitive / variant / kind: existing Producer Console/composer; variant `focusedCreation` sólo si el registry Globe ya usa variants equivalentes.
- Component candidates: componentes tipados del composer en el payload ADR-014 (PromptField, DirectionPicker, OutputShape, AdvancedDisclosure, GenerateCta), módulo de copy y tokens del SSOT. `producer-client.ts` se conserva como transporte (ADR-014: el transporte se porta antes que el render).
- Copy source: `producer-copy.ts`.
- Data reader / command: existing catalog, estimate, provenance, prepare/generate and prompt proposal contracts.
- API parity: no browser-side business logic; no endpoint/reader/command nuevo.
- Access / capability: current Globe capabilities/grants.
- States to implement: default, prompt entered, advanced open/closed, gated modality, no references, ready/stale estimate, estimating, preparing, running, invalid and error.

### GVC scenario plan

- Scenario file: `../efeonce-globe/apps/studio-web/scripts/producer-gvc-fixture.mjs` plus existing Producer scenario.
- Route: `/producer?gvc=task-1552-focused-composer`.
- Viewports: `1440×1000`, `390×844`.
- Quality profile: `premium`.
- Required steps: Image/Video/Audio, prompt, direction, output shape, advanced disclosure, no-reference route, stale estimate, one-click generate, keyboard and reduced motion.
- Required captures: first fold, advanced closed/open, modality variants, gated/invalid and ready/stale CTA.
- Required `data-capture` markers: `producer-composer`, `producer-prompt`, `producer-direction`, `producer-output-shape`, `producer-advanced-settings`, `producer-generate-primary`.
- Assertions: exactly one primary CTA; no manual estimate button; no duplicated cost line; no dominant empty references panel; no provider slug/vendor cost/margin; no horizontal overflow.
- Scroll-width checks: `document.documentElement.scrollWidth === document.documentElement.clientWidth` desktop and 390 px.
- Reduced-motion / focus evidence: disclosure, CTA state changes and keyboard navigation.
- Review dossier: `.captures/<run>/review/`.
- Baseline decision / surface ID: `globe.creative-producer-surface` after first-fold acceptance.

### Design decision log

- Decision: Focus + Context sidecar with progressive disclosure.
- Alternatives considered: technical compact composer; centered modal composer.
- Why this pattern: mantiene el loop aprobado de Producer y reduce competencia visual sin eliminar capacidades.
- Reuse / extend / new primitive: extend existing Globe Producer patterns; no parallel primitive/system.
- Open risks: coordinación de ownership con 1505/1531/1532 y composición de advanced settings en mobile.

### Visual verification

- GVC scenario: `task-1552-focused-composer`.
- Viewports: 1440×1000 and 390×844.
- Required captures: first fold, each modality, advanced disclosure, gated/invalid, CTA states.
- Required `data-capture` markers: all markers listed above.
- Scroll-width check: page and open surfaces must have no horizontal overflow.
- Accessibility/focus checks: labels, keyboard disclosure, visible focus, live states, reduced motion and 44 px targets.
- Before/after evidence: current Producer screenshot and focused-composer capture.
- Known visual debt: none accepted in first fold; gated capability styling may remain task-owned by backend/runtime owners.
- Visual scorecard: `docs/ui/reviews/TASK-1552-globe-producer-composer-focused-creation.scorecard.json`.
- Quality threshold: `average >= 4.5; floor >= 4; hierarchy/surface economy/visual impact/generic-template resistance >= 4.5`.

## Scope

### Slice 1 — First-fold composer hierarchy

- Remove duplicated modality/title chrome inside the composer.
- Make prompt, direction and output shape the dominant creation path.
- Replace the suggestion chip wall with compact direction choices.
- Preserve the existing CTA and route/model semantics while reducing visual competition.

### Slice 2 — Progressive disclosure and modality recomposition

- Group model, seed, Style DNA, references and governance-related controls under appropriate advanced/contextual disclosures.
- Render only modality-relevant controls for Image, Video and Audio.
- Keep unavailable references/capabilities honest without dominant empty panels.
- Ensure advanced settings remain keyboard-accessible and usable at 390 px.

### Slice 3 — Execution states and visual verification

- Integrate the `TASK-1532` CTA states without a second estimate button or duplicated cost line.
- Add/align stable capture markers and fixture states.
- Capture, inspect and score desktop/mobile first fold and key states.

## Out of Scope

- Changes to estimate, credit, balance, hard-cap, prepare, execute or spend contracts.
- Hiding credits or exposing vendor cost/margin.
- New API, reader, command, schema, migration, provider integration or capability.
- Full feed, viewer, collections, batch, review or share redesign.
- Crear el token SSOT / design system de Globe — entregado por `TASK-1556` Slices 2-3 (`apps/studio-client/src/{tokens/tokens.ts,copy/index.ts,gates/design-contract.test.ts}`, `eslint.config.js`); esta task lo consume. Tampoco crea primitives Greenhouse.
- Replacing the approved `TASK-1505` baseline; this task refines its composition.

## Detailed Spec

The selected direction is documented in `docs/ui/visual-directions/TASK-1552-globe-producer-composer-focused-creation.md` and the layout/state contract in `docs/ui/wireframes/TASK-1552-globe-producer-composer-focused-creation.md`.

The implementation must preserve the following product loop:

```text
prompt → direction → output shape → optional advanced settings → Generar · créditos → feed/viewer
```

The visible cost contract is owned by `TASK-1532`: the CTA shows `Generar · {credits} créditos` when current, otherwise transitions through the canonical estimating/preparing/running states. No separate estimate line or manual estimate action is introduced by this task.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 MUST establish the first-fold hierarchy before Slice 2 exposes advanced disclosures.
- Slice 2 MUST preserve modality/capability truth before Slice 3 captures evidence.
- Slice 3 MUST pass desktop/mobile visual review before the task is considered code complete.

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---:|---|---|
| Advanced settings disappear or become inaccessible | UI | medium | Preserve existing controls, keyboard tests and marker-based GVC | missing control in state inventory or failed focus capture |
| New composition contradicts approved Producer baseline | UI | medium | Source/direction review against TASK-1505 before implementation | scorecard fidelity or hierarchy below threshold |
| Cost is duplicated or hidden | UI | low | Reuse TASK-1532 CTA contract and explicit DOM assertion | extra cost line or missing credits in ready CTA |
| Gated capability appears executable | UI/runtime | medium | Server-backed capability states and fixture assertions | enabled control without positive capability evidence |

### Feature flags / cutover

Sin flag nueva — cambio aditivo de composición sobre una superficie internal-only. Rollback mediante revert del cambio UI o restauración del layout previo; no muta datos ni contratos.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---:|---|
| 1 | Revert de render/CSS/copy del composer y restauración del bloque anterior | <30 min | sí |
| 2 | Desactivar disclosures mediante revert, manteniendo contratos y estados existentes | <30 min | sí |
| 3 | Revert markers/fixture/captures; no afecta runtime de generación | <15 min | sí |

### Production verification sequence

1. Ejecutar checks focales y validar task/wireframe/readiness.
2. Capturar fixture local en 1440×1000 y 390×844.
3. Revisar first fold, estados CTA, teclado, reduced motion y scroll width.
4. Verificar integración de `TASK-1532` sin estimate button duplicado.
5. Promover sólo después de scorecard premium y revisión humana del runtime internal-only.

### Out-of-band coordination required

N/A — repo-only task/documentation plus UI changes in the Globe runtime owned by the linked implementation task; no cloud, billing, provider or access mutation.

## Acceptance Criteria

- [ ] Se mantiene `Execution profile: ui-ux`, `UI impact: layout`, `UI ready: no` hasta completar mapping, GVC plan y decision log; al pasar a `yes`, `pnpm task:lint --task TASK-1552` queda en cero findings.
- [ ] Existe `docs/ui/wireframes/TASK-1552-globe-producer-composer-focused-creation.md` y pasa `pnpm ui:wireframe-check --task TASK-1552`.
- [ ] El composer tiene una sola jerarquía primaria: prompt → dirección/output shape → CTA Generate.
- [ ] No existe selector/título de modalidad duplicado dentro del composer.
- [ ] Modelo, seed, Style DNA, referencias y controles avanzados permanecen accesibles mediante progressive disclosure o estado contextual honesto.
- [ ] Imagen, Video y Audio muestran sólo los controles relevantes para su modalidad y no presentan capacidades gated como activas.
- [ ] El CTA reutiliza `TASK-1532`: no hay botón manual `Calcular costo`, no se duplica la línea de costo y el estimate vigente aparece dentro del CTA.
- [ ] El prompt, disclosures, CTA y estados son operables por teclado, tienen focus visible, targets táctiles de 44 px y equivalencia reduced-motion.
- [ ] GVC premium captura 1440×1000 y 390×844, con first fold, estados clave y evidencia revisada en dossier.
- [ ] `scrollWidth === clientWidth` en desktop y mobile, incluyendo disclosures abiertos.
- [ ] La evidencia visual alcanza el scorecard definido: promedio ≥4.5, ninguna dimensión <4, jerarquía/economía/impacto/resistencia a template ≥4.5.

## Verification

- `pnpm task:lint --task TASK-1552`
- `pnpm ui:wireframe-check --task TASK-1552`
- `pnpm ui:readiness-check --task TASK-1552`
- Checks/test/build focales de `../efeonce-globe/apps/studio-web`
- `pnpm fe:capture <scenario> --env=staging` cuando el scenario esté disponible
- `pnpm fe:capture:review <capture-dir>`
- `pnpm ui:quality --task TASK-1552`
- Revisión manual desktop/mobile, teclado, reduced motion y no overflow

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real.
- [ ] El archivo vive en la carpeta correcta.
- [ ] `docs/tasks/README.md` quedó sincronizado con el cierre.
- [ ] `Handoff.md` quedó actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes.
- [ ] `changelog.md` quedó actualizado si cambió comportamiento, estructura o protocolo visible.
- [ ] Se ejecutó chequeo de impacto cruzado sobre TASK-1505, TASK-1531 y TASK-1532.
- [ ] Se archivó el dossier visual y scorecard premium.

## Follow-ups

- Si la evolución hacia `Creative Suite` requiere IA común entre Producer y Workbench, coordinar con `TASK-1523`.
- Si los advanced settings necesitan un patrón reusable de Globe, evaluar su ownership con `TASK-1485`.

## Open Questions

- Confirmar durante Discovery si el disclosure de ajustes avanzados puede permanecer inline en 390 px o debe usar el sheet existente de Globe; no bloquea la dirección, pero sí la implementación final.
