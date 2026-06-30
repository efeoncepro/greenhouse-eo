# TASK-1262 — Token de texto AA-safe para el rol `primary` (fix gobernado ISSUE-108)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `ui-ux`
- UI impact: `primitive`
- Backend impact: `none`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui|design-system`
- Blocked by: `none`
- Branch: `task/TASK-1262-primary-text-aa-token-governed-fix`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El token `primary` (`#0375db`, AXIS/Restraint TASK-1053) falla WCAG 1.4.3 4.5:1 como **texto** sobre claro (breadcrumb label, texto de botón outlined, botón solid texto-blanco, links primary), portal-wide. Se deriva un **token de texto AA-safe** para el rol `primary` desde el AXIS SoT (precedente `success.ink`, TASK-1053 Fase B) — `primary.ink` ← `axisRamp.primary[700]` (`#024c8f`, 8.63:1) — y los primitives compartidos (`GreenhouseBreadcrumbs`, `GreenhouseButton`) lo consumen para TEXTO; `primary.main` se queda para fills/bordes (≥3:1 OK). Cierra **ISSUE-108**.

## Why This Task Exists

Es un piso WCAG 2.2 AA incumplido de forma transversal (EAA enforced desde 2025-06-28). axe-core (gate a11y de TASK-1232/1261) reportó 12 violaciones `color-contrast` serias, **todas** sobre primitives compartidas, no sobre una pantalla puntual: el color `primary` se usa como color de TEXTO en breadcrumbs/botones/links de todo el portal y queda en ~3.7–4.4:1 real. No es un parche local: es una decisión de design-system sobre la paleta aprobada TASK-1053 que debe pasar por el contrato de 3 capas (DESIGN.md + V1 + mergedTheme) + drift-guard + GVC sweep + sign-off. El spec `growth-forms-admin-cockpit-a11y.spec.ts` hoy `disableRules(['color-contrast'])` con referencia a ISSUE-108 — esta task lo destraba.

## Goal

- Derivar `primary.ink` (texto-sobre-claro AA, mode-aware) desde el AXIS SoT, sin hex nuevo (reusa `axisRamp.primary[700]` `#024c8f`).
- `GreenhouseBreadcrumbs` label no-current + `GreenhouseButton` outlined (texto) + links primary consumen `primary.ink` para TEXTO; `primary.main` queda solo para fills/bordes.
- Resolver el eje "blanco sobre fill `primary`" del botón solid (subir el fill a un step con margen, p.ej. `primary[700]`), con sign-off visual.
- Re-correr el gate a11y SIN `disableRules(['color-contrast'])` → verde; GVC sweep portal-wide sin regresión; cerrar ISSUE-108.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` (§color + §sub-valores semánticos curados)
- `DESIGN.md` (contrato agente-facing, 3-layer parity)
- `docs/issues/open/ISSUE-108-primary-palette-text-contrast-wcag-fail.md` (plan gobernado decidido)
- `docs/tasks/complete/TASK-1053-*` + `project_axis_palette_adoption` (paleta Restraint aprobada — autoridad del `primary`)

Reglas obligatorias:

- **Camino canónico = Opción A (token de texto AA-safe), NO oscurecer `primary.main`** (Opción B = blast radius de marca, descartada en ISSUE-108).
- Es el **precedente `success.ink`** (TASK-1053 Fase B) aplicado al rol `primary`: SoT runtime-agnóstico `axisSemanticSubValues` (`@/lib/design-tokens/semantic-sub-values`) → re-export `@core/theme/axis-semantic` → `greenhouseSemanticTokens(mode)` → `mergedTheme`. NO inventar un token paralelo ni override en `mergedTheme` fuera del SoT.
- 3-layer parity en el MISMO PR: `mergedTheme.ts` (runtime) + `GREENHOUSE_DESIGN_TOKENS_V1.md` + `DESIGN.md`. `pnpm design:lint` 0/0.
- NUNCA hex inline en JSX: los primitives consumen `theme.*` / `greenhouseSemantic.primary.*`.
- NUNCA tocar `src/@core/theme/*` (Vuexy core). Extender, no forkear.
- Verificar contraste en `light` **y** `darkSemi` para cada valor nuevo (ink + darkFg).

## Normative Docs

- `.claude/skills/design-system-governance` (SKILL — 6-step protocol de token nuevo)
- `tests/e2e/smoke/growth-forms-admin-cockpit-a11y.spec.ts` (consumidor del `disableRules` a destrabar)
- `src/@core/theme/axis-tokens.ts` (`axisRamp.primary` — los steps + contraste)
- `src/components/theme/greenhouse-semantic-tokens.ts` (factory mode-aware, espejo a extender)

## Dependencies & Impact

### Depends on

- AXIS SoT `axisRamp.primary` (`src/@core/theme/axis-tokens.ts`) — ya trae `primary[700]=#024c8f` (8.63:1) y `[800]=#023c70` (11.15:1). Sin migración.
- Patrón `greenhouseSemantic` / `axisSemanticSubValues` (TASK-1053 Fase B) — la maquinaria mode-aware ya existe; esta task la extiende al rol `primary`.

### Blocks / Impacts

- Cierra **ISSUE-108** (contraste paleta `primary` portal-wide).
- Desbloquea quitar `disableRules(['color-contrast'])` de `growth-forms-admin-cockpit-a11y.spec.ts`.
- Impacta visualmente TODO breadcrumb no-current, botón outlined/solid `primary` y links primary del portal (blast radius controlado — solo el COLOR de texto/fill cambia, no la estructura).

### Files owned

- `src/lib/design-tokens/semantic-sub-values.ts` (agregar sub-valores `primary` — `[verificar]` shape exacto)
- `src/@core/theme/axis-semantic.ts` (re-export — `[verificar]`)
- `src/components/theme/greenhouse-semantic-tokens.ts` (factory mode-aware)
- `src/components/theme/mergedTheme.ts` (montaje runtime)
- `src/components/greenhouse/primitives/GreenhouseBreadcrumbs.tsx`
- `src/components/greenhouse/primitives/GreenhouseButton.tsx` (`[verificar]` path/nombre exacto)
- `DESIGN.md`, `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md`
- `src/components/theme/__tests__/axis-semantic-contrast.test.ts` + `greenhouse-semantic-drift.test.ts` (drift-guard — `[verificar]` paths)
- `tests/e2e/smoke/growth-forms-admin-cockpit-a11y.spec.ts` (quitar el `disableRules`)
- `docs/issues/open/ISSUE-108-*.md` → `resolved/`

## Current Repo State

### Already exists

- `axisRamp.primary` con los steps oscuros (`700=#024c8f`, `800=#023c70`) — contraste AA/AAA ya verificado (texto sobre blanco 8.63 / 11.15).
- Maquinaria `greenhouseSemantic[role].{ink,tint,border,darkFg,tonalText,...}` mode-aware (TASK-1053 Fase B) — precedente directo (`success.ink=#11703f`).
- Gate a11y `growth-forms-admin-cockpit-a11y.spec.ts` que hoy desactiva `color-contrast` referenciando ISSUE-108.

### Gap

- El rol `primary`/marca NO tiene token de texto AA-safe (a diferencia de `{info,success,warning,error}` que sí lo tienen desde Fase B).
- `GreenhouseBreadcrumbs` label + `GreenhouseButton` outlined usan `primary.main` como color de TEXTO (3.69–4.13:1).
- El botón solid `primary` usa texto blanco sobre fill `#0375db` (4.39:1 real) — eje de contraste distinto, sin resolver.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-platform`
- Usuario / rol: TODOS los usuarios del portal (interno + cliente) — es un piso de accesibilidad transversal.
- Momento del flujo: cualquier breadcrumb, botón outlined/solid primary o link primary en cualquier pantalla.
- Resultado perceptible esperado: el texto en color de marca cumple 4.5:1; legibilidad mejor sin cambiar la identidad (mismo hue, step más oscuro).
- Friccion que debe reducir: texto de baja legibilidad para baja visión / pantallas con brillo / forced-colors; barrera WCAG 2.2 AA (EAA).
- No-goals UX: NO rediseñar los primitives ni su estructura; NO cambiar el `primary.main` de marca para fills/bordes; NO tocar dark mode más allá del `darkFg` AA.

### Surface & system decision

- Surface: primitives compartidos (`GreenhouseBreadcrumbs`, `GreenhouseButton`) — portal-wide.
- Composition Shell: `no aplica` — es token + consumo de primitive, no layout.
- Primitive decision: `extend` — extender el token-set semántico al rol `primary` + ajustar el consumo de color en 2 primitives existentes; NO nace primitive nueva.
- Adaptive density / The Seam: `no aplica`.
- Floating/Sidecar/Dialog decision: N/A.
- Copy source: N/A (no toca copy).
- Access impact: `none`.

### State inventory

- Default: texto/botón/link primary con contraste AA.
- Loading: N/A (sin cambio de estado).
- Empty: N/A.
- Error: N/A.
- Degraded / partial: N/A.
- Permission denied: N/A.
- Long content: N/A.
- Mobile / compact: el contraste aplica igual; verificar en 390px.
- Keyboard / focus: focus-visible de los primitives debe seguir AA en forced-colors.
- Reduced motion: N/A (sin motion).

### Interaction contract

- Primary interaction: sin cambio (mismos clicks/links); solo cambia el color resuelto del texto/fill.
- Hover / focus / active: el hover `#0b79dc` (más claro) NO debe usarse como color de texto sobre claro — verificar que el hover de texto también clave AA (o usar el ink en hover de texto).
- Pending / disabled: sin cambio.
- Escape / click-away: N/A.
- Focus restore: N/A.
- Latency feedback: N/A.
- Toast / alert behavior: N/A.

### Motion & microinteractions

- Motion primitive: `none`.
- Enter / exit / Layout morph / Stagger: N/A.
- Timing / easing token: N/A.
- Reduced-motion fallback: N/A.
- Non-goal motion: N/A.

### Visual verification

- GVC scenario: sweep portal-wide de superficies representativas con breadcrumbs + botones primary (no solo el cockpit) — p.ej. `growth-forms-admin-cockpit` + 2-3 rutas con breadcrumb/botón outlined/solid primary visibles.
- Viewports: desktop 1440 + mobile 390.
- Required captures: breadcrumb (label no-current), botón outlined primary, botón solid primary, link primary — antes/después.
- Required `data-capture` markers: reusar los existentes de las superficies elegidas.
- Scroll-width check: desktop + mobile 390 (no debería cambiar — solo color).
- Accessibility/focus checks: sonda de contraste real (axe / WebAIM) sobre los 4 casos → ≥4.5:1; `growth-forms-admin-cockpit-a11y.spec.ts` SIN `disableRules(['color-contrast'])` → verde.
- Before/after evidence: sí (captura de los 4 casos antes/después).
- Known visual debt: el botón solid puede verse un poco más oscuro (step 700) — confirmar con sign-off visual.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Token `primary.ink` AA-safe (3-layer parity + drift-guard)

- Agregar los sub-valores del rol `primary` al SoT runtime-agnóstico (`axisSemanticSubValues`): `ink` ← `axisRamp.primary[700]` (`#024c8f`), `darkFg` AA sobre charcoal, `tint`/`border`/`tonalText` mode-aware espejo de los semánticos.
- Propagar por la cadena: re-export `@core/theme/axis-semantic` → `greenhouseSemanticTokens(mode)` → `mergedTheme`.
- Actualizar `GREENHOUSE_DESIGN_TOKENS_V1.md` (§color) + `DESIGN.md` (variante). `pnpm design:lint` 0/0.
- Extender `axis-semantic-contrast.test.ts`: asertar `primary.ink` ≥4.5:1 sobre blanco (light) + `primary.darkFg` ≥4.5:1 sobre charcoal (dark).

### Slice 2 — Consumo en primitives (texto-sobre-claro)

- `GreenhouseBreadcrumbs` label no-current usa `greenhouseSemantic.primary.tonalText`/`ink` para TEXTO (no `primary.main`).
- `GreenhouseButton` outlined `tone='primary'`: texto desde `primary.ink`; borde puede seguir en `primary.main`.
- Links primary (si los hay como helper compartido): mismo token.
- Verificar hover de texto: que no caiga a `#0b79dc` sobre claro.

### Slice 3 — Botón solid (blanco-sobre-fill) + cierre del gate

- `GreenhouseButton` solid `tone='primary'`: subir el fill a `primary[700]` (`#024c8f`, blanco 8.63:1) — o el step con margen que apruebe el sign-off visual. Eje de contraste distinto al texto-sobre-claro.
- Quitar `disableRules(['color-contrast'])` de `growth-forms-admin-cockpit-a11y.spec.ts` → re-correr → verde.
- Sonda de contraste real (axe/WebAIM) sobre los 4 casos + GVC sweep portal-wide before/after.
- Mover ISSUE-108 `open/` → `resolved/` + actualizar `docs/issues/README.md`.

## Out of Scope

- Oscurecer `primary.main` como token de marca (Opción B descartada).
- Re-paleta de cualquier otro rol semántico (ya resuelto en Fase B).
- Rediseño estructural de `GreenhouseBreadcrumbs`/`GreenhouseButton`.
- Cambios de copy.
- Multi-brand / per-tenant primary (V1.5, no aplica).

## Detailed Spec

ISSUE-108 (sección "Solución — plan gobernado") tiene el detalle: la tabla de contraste por step AXIS, la distinción de los 2 ejes (texto-sobre-claro vs blanco-sobre-fill) y el protocolo de 6 pasos del skill `design-system-governance`. No duplicar acá — leer el issue + la skill. `primary.ink = axisRamp.primary[700] = #024c8f` (texto sobre blanco 8.63:1, blanco sobre fill 8.63:1).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (token + drift-guard) → Slice 2 (consumo texto) → Slice 3 (solid fill + cierre del gate). El gate a11y solo se destraba en Slice 3, después de que ambos ejes de contraste estén cubiertos.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Regresión visual de marca (texto/botón más oscuro percibido como "otro color") | UI / design-system | medium | mismo hue (step del mismo ramp), GVC sweep before/after + sign-off del operador antes de cerrar | revisión visual GVC |
| Otro consumer usa `primary.main` como texto fuera de los 2 primitives | UI | medium | grep portal-wide de `primary.main` usado como `color`/texto; documentar los hallazgos; el gate axe (sin disableRules) los captura | axe `color-contrast` en specs a11y |
| Drift 3-capas (token en runtime pero no en DESIGN.md/V1) | design-system | low | `pnpm design:lint` 0/0 + `axis-semantic-contrast.test.ts` + `greenhouse-semantic-drift.test.ts` en el mismo PR | CI design-contract gate (TASK-764) |
| `darkSemi` no AA con el nuevo `darkFg` | UI / dark mode | low | asertar contraste en ambos modos en el drift-guard | test contrast |

### Feature flags / cutover

Sin flag — cambio de token + consumo de primitive, additive en el sentido de no romper API. Cutover inmediato vía merge + redeploy. Revert: revert PR (<5 min). Razón: no hay state runtime ni datos; el riesgo es puramente visual y se cubre con GVC + sign-off antes del merge.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (token nuevo, nadie lo consume aún) | <5 min | si |
| Slice 2 | revert del consumo en los 2 primitives (vuelve a `primary.main`) | <5 min | si |
| Slice 3 | revert del solid fill + re-añadir `disableRules` si urge | <5 min | si |

### Production verification sequence

1. `pnpm design:lint` 0/0 + drift-guards verdes en local.
2. `growth-forms-admin-cockpit-a11y.spec.ts` sin `disableRules` → verde en local.
3. GVC sweep desktop+mobile de las superficies elegidas → mirar frames → sign-off del operador.
4. Merge → staging → sonda de contraste real (axe/WebAIM) sobre los 4 casos en el deploy.
5. Prod vía release control plane (cambio visual, no runtime) tras sign-off.

### Out-of-band coordination required

- Sign-off visual del operador antes del cierre (toca la paleta aprobada TASK-1053). N/A externo (repo-only).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `primary.ink` (y `darkFg`) derivado del AXIS SoT (`axisRamp.primary[700]`), montado por la cadena `axisSemanticSubValues → axis-semantic → greenhouseSemanticTokens → mergedTheme` (sin override ad-hoc, sin hex nuevo).
- [ ] 3-layer parity en el mismo PR: `mergedTheme` + `GREENHOUSE_DESIGN_TOKENS_V1.md` + `DESIGN.md`; `pnpm design:lint` 0 errores / 0 warnings.
- [ ] `GreenhouseBreadcrumbs` label no-current + `GreenhouseButton` outlined (texto) consumen `primary.ink` (no `primary.main`); `primary.main` queda en fills/bordes.
- [ ] Botón solid `primary` resuelto (fill con blanco ≥4.5:1) con sign-off visual.
- [ ] Sonda de contraste real (axe/WebAIM) sobre breadcrumb + outlined + solid + link primary → todos ≥4.5:1 (light) y AA en `darkSemi`.
- [ ] `tests/e2e/smoke/growth-forms-admin-cockpit-a11y.spec.ts` SIN `disableRules(['color-contrast'])` → verde.
- [ ] `axis-semantic-contrast.test.ts` extendido asertando `primary.ink`/`darkFg` AA; drift-guard verde.
- [ ] GVC desktop+mobile (sweep portal-wide, no solo el cockpit) capturado y mirado, sin regresión visual ni scroll horizontal nuevo.
- [ ] ISSUE-108 movido a `resolved/` + `docs/issues/README.md` actualizado.

## Verification

- `pnpm design:lint`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` (incl. drift-guards de contraste/semantic)
- `pnpm fe:capture <scenarios> --env=local|staging` (sweep) + sonda de contraste real
- `tests/e2e/smoke/growth-forms-admin-cockpit-a11y.spec.ts` sin `disableRules`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] ISSUE-108 cerrado (movido a `resolved/`) + spec a11y sin `disableRules(['color-contrast'])`.

## Follow-ups

- Auditar otros consumers que usen `primary.main` como color de texto fuera de los 2 primitives (lint rule candidata: `no-primary-main-as-text`).
- Evaluar si el mismo patrón ink aplica a otros roles de marca (secondary) si emergen casos de texto.

## Open Questions

- ¿El botón solid sube a `primary[700]` (#024c8f) o a un step intermedio que apruebe el sign-off visual? Decisión visual del operador en Slice 3.
