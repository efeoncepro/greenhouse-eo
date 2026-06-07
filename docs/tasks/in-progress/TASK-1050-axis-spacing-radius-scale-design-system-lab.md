# TASK-1050 — AXIS spacing/radius scale + design system lab

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Epic: `none`
- Status real: `Implementacion iniciada`
- Rank: `TBD`
- Domain: `ui|platform|design-system`
- Blocked by: `none`
- Branch: `task/TASK-1050-axis-spacing-radius-scale-design-system-lab`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Reconciliar las laminas AXIS Figma `Gap & Padding` y `Border Radius` con el runtime Greenhouse. `Gap/Padding-N` debe mapear a `theme.spacing(N)` (`4N px`) y `Border-Radius-{xs,sm,md,lg,xl}` debe mapear a `theme.shape.customBorderRadius.*`. La task tambien agrega `xxl` y `display` como extension Greenhouse gobernada para superficies grandes (`12px` y `16px`), con ejemplo vivo de aplicacion en el lab. La task documenta el contrato en las capas correctas y crea una pagina viva interna de geometria base (`/admin/design-system/spacing` o equivalente) para que agentes y humanos vean las escalas sin copiar valores Figma/Tailwind.

## Why This Task Exists

Los nodos Figma `yyMksCoijfMaIoYplXKZaR`, `11112:12286` (`Gap & Padding`) y `11112:12362` (`Border Radius`) no son pantallas productivas ni primitives: son tablas de tokens base del design system. El runtime Greenhouse ya tiene las bases correctas en `src/@core/theme/spacing.ts` (`theme.spacing(n) = 4n px`) y `src/@core/theme/index.ts` (`customBorderRadius: xs 2, sm 4, md 6, lg 8, xl 10`), y `GREENHOUSE_DESIGN_TOKENS_V1.md` ya documenta ambos. El gap real es doble: `ui-platform/` no expone estas referencias AXIS como contrato de implementacion, no existe un lab vivo para geometry foundations, y faltan radios gobernados para superficies grandes modernas donde hoy un agente podria inventar `12px`/`16px` localmente. Esto deja espacio a que agentes copien px literales desde Figma, creen wrappers innecesarios o sobrerredondeen superficies enterprise por moda.

## Goal

- Declarar explicitamente que AXIS `Gap/Padding-N` se implementa como `theme.spacing(N)` / `sx={{ p: N }}` / `Stack spacing={N}`.
- Declarar explicitamente que AXIS `Border-Radius-{xs,sm,md,lg,xl}` se implementa como `theme.shape.customBorderRadius.{xs,sm,md,lg,xl}`.
- Agregar `theme.shape.customBorderRadius.xxl = 12` y `theme.shape.customBorderRadius.display = 16` como extension Greenhouse para superficies grandes, no como valores AXIS upstream.
- Documentar que `Border-Round` de Figma (`500px`) se implementa como `9999px` para pills/capsules o `50%` para circulos, no como literal `500px`.
- Agregar un puntero claro en `docs/architecture/ui-platform/` hacia los contratos de spacing/radius, sin duplicar el SoT visual.
- Crear `/admin/design-system/spacing` o `/admin/design-system/geometry` como museo interno de las escalas AXIS, renderizado desde `theme.spacing` y `theme.shape.customBorderRadius`.
- Incluir en el lab un ejemplo de aplicacion de `display` sobre una superficie grande realista, para que el token nazca con criterio visual y no como numero suelto.
- Mantener el cambio repo-only, additive y sin introducir primitives ni tokens paralelos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `DESIGN.md`
- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md`
- `docs/architecture/GREENHOUSE_THEME_TOKEN_CONTRACT_V1.md`
- `docs/architecture/ui-platform/README.md`
- `docs/architecture/ui-platform/STACK.md`
- `docs/architecture/ui-platform/HISTORIAL.md`
- `docs/architecture/GREENHOUSE_UI_PRIMITIVE_VARIANTS_DECISION_V1.md`

Reglas obligatorias:

- Figma es intencion, no valores literales: no copiar JSX/Tailwind generado por Figma.
- No crear una primitive nueva para spacing/radius; los contratos runtime son MUI `theme.spacing` y `theme.shape.customBorderRadius`.
- No introducir otro SoT de spacing paralelo a `src/@core/theme/spacing.ts` ni otro SoT de radius paralelo a `src/@core/theme/index.ts`.
- `xxl`/`display` deben agregarse solo en el SoT runtime (`theme.shape.customBorderRadius`) y documentarse como extension Greenhouse, no como valores importados de AXIS.
- `display` debe tener al menos un ejemplo vivo de aplicacion en el lab sobre una superficie grande; fuera de ese ejemplo, no migrar consumers de producto en esta task.
- El lab interno debe usar theme/tokens y `DESIGN_SYSTEM_LAB_TOKENS`, no hardcodes visuales route-locales.
- Si se crea una ruta nueva, debe ser alcanzable por navegacion o manifest y cumplir route reachability.
- Si la task toca UI visible, usar skills UI aplicables y GVC desktop/mobile antes de cerrar.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/LOCAL_FIRST_DEVELOPMENT_WORKFLOW_V1.md`

## Dependencies & Impact

### Depends on

- Runtime actual `src/@core/theme/spacing.ts`.
- Runtime actual `src/@core/theme/index.ts` (`shape.customBorderRadius`).
- Tipos/contrato de theme si aplica: `src/components/theme/types.ts`.
- Design system interno existente bajo `/admin/design-system`.
- View gate existente `administracion.design_system` para labs internos.

### Blocks / Impacts

- Reduce drift al implementar diseños Figma que usen `Gap-*` / `Padding-*` / `Border-Radius-*`.
- Complementa las paginas internas de buttons, chips, charts, motion, typography, loaders, microinteractions, utilities y elevation.
- Puede informar futuros lint/docs guards sobre spacing off-scale o radius misuse, pero no los implementa obligatoriamente.

### Files owned

- `src/app/(dashboard)/admin/design-system/geometry/page.tsx`
- `src/@core/theme/index.ts`
- `src/components/theme/types.ts` si el shape extendido requiere declaracion tipada
- `src/views/greenhouse/admin/design-system/GeometryLabView.tsx`
- `src/views/greenhouse/admin/design-system/DesignSystemView.tsx`
- `src/views/greenhouse/admin/design-system/design-system-lab-tokens.ts`
- `src/lib/navigation/route-reachability-manifest.ts` si hace falta declarar child route
- `scripts/frontend/scenarios/design-system-geometry.scenario.ts`
- `DESIGN.md`
- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md`
- `docs/architecture/ui-platform/README.md`
- `docs/architecture/ui-platform/STACK.md`
- `docs/architecture/ui-platform/HISTORIAL.md`
- `docs/tasks/in-progress/TASK-1050-axis-spacing-radius-scale-design-system-lab.md`
- `docs/tasks/README.md`
- `docs/tasks/TASK_ID_REGISTRY.md`

## Current Repo State

### Already exists

- `src/@core/theme/spacing.ts` define `spacing: (factor: number) => \`${0.25 * factor}rem\``.
- `src/@core/theme/index.ts` define `shape.customBorderRadius = { xs: 2, sm: 4, md: 6, lg: 8, xl: 10, xxl: 12, display: 16 }`.
- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` documenta `theme.spacing(n) = 4n px` y usos canonicos.
- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` documenta border radius `xs/sm/md/lg/xl` + uso de pill.
- `DESIGN.md` incluye un resumen compacto de spacing/layout y `rounded`.
- `docs/architecture/ui-platform/README.md` declara que AXIS/tokens visuales viven fuera de UI Platform.
- `src/views/greenhouse/admin/design-system/design-system-lab-tokens.ts` centraliza tokens de chrome para labs.

### Gap

- `ui-platform/` no nombra explicitamente AXIS `Gap & Padding` / `Border Radius` ni indica los mappings a `theme.spacing(N)` y `theme.shape.customBorderRadius.*`.
- Existe `/admin/design-system/geometry` como pagina viva de spacing/radius con GVC desktop/mobile.
- La tabla AXIS Figma muestra pasos `1..16` + `25`; la documentacion actual enfatiza una subset operacional, pero no explica la diferencia entre "escala disponible" y "pasos preferidos".
- La lamina AXIS `Border Radius` esta alineada con runtime para `xs..xl`; Greenhouse ya tiene tokens gobernados `xxl/display` como extension local para radios grandes.

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

### Slice 1 — Contract reconciliation

- Actualizar `DESIGN.md` para declarar la regla simple: AXIS `Gap/Padding-N` = `theme.spacing(N)` = `4N px`.
- Actualizar `DESIGN.md` para declarar la regla simple: AXIS `Border-Radius-{xs,sm,md,lg,xl}` = `theme.shape.customBorderRadius.{xs,sm,md,lg,xl}` y `Border-Round` = `9999px`/`50%` segun shape.
- Actualizar `GREENHOUSE_DESIGN_TOKENS_V1.md` para incluir la referencia Figma (`fileKey yyMksCoijfMaIoYplXKZaR`, node `11112:12286`) y distinguir:
  - escala AXIS disponible: `1..16` + `25`;
  - pasos preferidos en producto: los ya documentados (`1`, `1.5`, `2`, `3`, `4`, `5`, `6`, `8`, `10`, `12`) salvo spec concreta.
- Actualizar `GREENHOUSE_DESIGN_TOKENS_V1.md` para incluir la referencia Figma `Border Radius` (`node 11112:12362`) y el criterio:
  - escala actual `2/4/6/8/10` es moderna-sobria para SaaS operacional;
  - extension Greenhouse `xxl = 12` y `display = 16` queda disponible para superficies grandes con uso intencional;
  - no usar `500px` literal; usar `9999px` para pills o `50%` para circulos;
- Agregar puntero corto en `ui-platform/README.md` o `STACK.md` hacia Design Tokens, sin duplicar tablas largas.

### Slice 2 — Runtime radius extension

- Agregar `xxl: 12` y `display: 16` a `shape.customBorderRadius` en `src/@core/theme/index.ts`.
- Actualizar la declaracion tipada correspondiente si `customBorderRadius` esta tipado fuera del theme base.
- No cambiar `theme.shape.borderRadius` default ni los valores AXIS `xs..xl`.
- Agregar test/drift guard focal si existe un patron local para validar theme tokens; si no existe, documentar la verificacion via `tsc` y lab.
- Documentar que `xxl/display` son extension Greenhouse para superficies grandes, no tokens AXIS upstream.

### Slice 3 — Geometry lab interno

- Crear `/admin/design-system/spacing` o `/admin/design-system/geometry` con gate interno igual al resto del design system. Si se elige `geometry`, debe cubrir spacing + radius; si se elige `spacing`, debe incluir una seccion radius.
- Renderizar la escala AXIS `Gap/Padding 1..16` + `25` usando `theme.spacing(n)` para barras/specimens.
- Renderizar la escala AXIS `Border-Radius xs/sm/md/lg/xl/round` usando `theme.shape.customBorderRadius` + `9999px`/`50%` para round specimens.
- Renderizar tambien `xxl` y `display` como extension Greenhouse, claramente separada de la tabla AXIS.
- Mostrar equivalencias `theme.spacing(n)`, px y uso recomendado.
- Mostrar equivalencias `theme.shape.customBorderRadius.<key>`, px y uso recomendado.
- Marcar visualmente los pasos preferidos vs disponibles sin bloquear la escala.
- Marcar visualmente `md/lg/xl` como la zona preferida para enterprise surfaces, `xxl/display` como radios de superficies grandes, y `round` como solo pills/circles.
- Incluir un ejemplo de aplicacion de `display` en una superficie grande de soporte/documentacion interna, no en una card operacional densa.
- Reusar `AxisWordmark`, `GreenhouseButton`/`GreenhouseChip` si hay controles, y `DESIGN_SYSTEM_LAB_TOKENS`.
- Evitar hardcodes de color, fontFamily, fontSize o px en copy/product UI; los valores px pueden aparecer como texto/specimen documental porque el lab documenta geometry tokens.

### Slice 4 — Navigation + reachability + GVC

- Agregar entrada desde `/admin/design-system` hacia el spacing/geometry lab.
- Declarar child route en `route-reachability-manifest.ts` solo si el link real no basta.
- Crear scenario GVC `design-system-spacing` o `design-system-geometry` con desktop + mobile.
- Capturar con `pnpm fe:capture <scenario> --env=local`, revisar frames PNG y ajustar hasta que no haya overflow/truncamiento.

### Slice 5 — Tests, docs closure and handoff

- Agregar tests focales si se introduce helper/controller para la escala.
- Ejecutar gates proporcionales.
- Sincronizar `docs/tasks/README.md`, `Handoff.md`, `changelog.md` y docs de UI Platform si la implementacion se cierra.

## Out of Scope

- Crear una primitive `GreenhouseSpacing` o `GreenhouseRadius`.
- Cambiar `src/@core/theme/spacing.ts`.
- Cambiar `theme.shape.borderRadius` default de MUI.
- Agregar radios mayores a `display` o nuevos nombres fuera de `xxl/display`.
- Migrar consumers existentes de spacing en todo el portal.
- Migrar consumers existentes de radius en todo el portal.
- Crear lint rule nueva de spacing/radius off-scale en esta task.
- Reconciliar color/tipografia/elevation; esos dominios viven en TASK-1048, TASK-1036..1044 y TASK-1049.

## Detailed Spec

La lamina Figma inspeccionada:

- URL: `https://www.figma.com/design/yyMksCoijfMaIoYplXKZaR/Design-System-%7C-Vuexy-%3E-AXIS?node-id=11112-12286&m=dev`
- Node: `11112:12286`
- Nombre: `Gap & Padding`
- Semantica: `Gap-N | Padding-N`
- Escala: `N * 4px`, con filas `1..16` y `25`.

Mapping de implementacion:

| AXIS | Greenhouse/MUI | px |
|---|---|---|
| `Gap-1` / `Padding-1` | `theme.spacing(1)` / `spacing={1}` / `p: 1` | 4 |
| `Gap-2` / `Padding-2` | `theme.spacing(2)` / `spacing={2}` / `p: 2` | 8 |
| `Gap-6` / `Padding-6` | `theme.spacing(6)` / `spacing={6}` / `p: 6` | 24 |
| `Gap-16` / `Padding-16` | `theme.spacing(16)` / `spacing={16}` / `p: 16` | 64 |
| `Gap-25` / `Padding-25` | `theme.spacing(25)` / `spacing={25}` / `p: 25` | 100 |

Los pasos no preferidos no son invalidos; solo requieren intencion clara cuando se usan en producto.

La lamina Figma de radius inspeccionada:

- URL: `https://www.figma.com/design/yyMksCoijfMaIoYplXKZaR/Design-System-%7C-Vuexy-%3E-AXIS?node-id=11112-12362&m=dev`
- Node: `11112:12362`
- Nombre: `Border Radius`
- Variables Figma: `Border Radius/border-radius-xs`, `sm`, `md`, `lg`, `xl`, `border-round`
- Valores: `2`, `4`, `6`, `8`, `10`, `500`

Mapping de implementacion:

| AXIS | Greenhouse/MUI | px |
|---|---|---|
| `Border-Radius-xs` | `theme.shape.customBorderRadius.xs` | 2 |
| `Border-Radius-sm` | `theme.shape.customBorderRadius.sm` | 4 |
| `Border-Radius-md` | `theme.shape.customBorderRadius.md` | 6 |
| `Border-Radius-lg` | `theme.shape.customBorderRadius.lg` | 8 |
| `Border-Radius-xl` | `theme.shape.customBorderRadius.xl` | 10 |
| `Border-Round` | `9999px` para pills/capsules o `50%` para circulos | full |
| `Radius-xxl` (Greenhouse extension) | `theme.shape.customBorderRadius.xxl` | 12 |
| `Radius-display` (Greenhouse extension) | `theme.shape.customBorderRadius.display` | 16 |

Decision visual: la escala `2/4/6/8/10` no es antigua; es moderna-sobria y adecuada para UI operacional enterprise. `xxl` (`12px`) y `display` (`16px`) nacen como extension Greenhouse para superficies grandes y deben mostrarse con un ejemplo vivo de aplicacion; no deben usarse para redondear indiscriminadamente cards densas, tablas, inputs o menus.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (docs contract) -> Slice 2 (runtime radius extension) -> Slice 3 (lab) -> Slice 4 (reachability/GVC) -> Slice 5 (closure).
- No crear lab sin actualizar el contrato documental; el lab debe ser reflejo del contrato, no otro SoT.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Crear un SoT paralelo de spacing | UI / design-system | low | Mantener `theme.spacing` como unico runtime; docs y lab solo explican/renderizan | review docs + tests focales si hay helper |
| Crear un SoT paralelo de radius | UI / design-system | low | Mantener `theme.shape.customBorderRadius` como unico runtime; docs y lab explican/renderizan desde ese objeto | review docs + tests focales si hay helper |
| Rutas internas huerfanas | UI / navigation | low | Link real desde `/admin/design-system` + `route-reachability-gate --strict` | route reachability gate |
| Lab copia valores Figma/Tailwind y driftea | UI / design-system | medium | Renderizar desde theme; GVC + scanner focal de hardcodes | lint/design lint/GVC |
| Sobrerredondear UI operacional por moda | UI / product | medium | Documentar `xxl/display` como superficie grande, no default operacional; ejemplo acotado en lab | GVC + enterprise review |
| Mobile overflow en tabla de spacing/radius | UI | medium | GVC desktop/mobile + layout responsive | GVC `quality.layout` |

### Feature flags / cutover

- Sin flag — cambio aditivo de docs + lab interno. Cutover inmediato al merge.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR/docs hunk | <5 min | si |
| Slice 2 | remover `xxl/display` del shape y tipos | <5 min | si |
| Slice 3 | remover ruta/view/link | <5 min | si |
| Slice 4 | remover scenario/link/manifest hunk | <5 min | si |
| Slice 5 | revert docs closure | <5 min | si |

### Production verification sequence

1. Local docs + lint checks verdes.
2. Dev server local.
3. GVC `design-system-spacing` o `design-system-geometry` desktop/mobile.
4. `pnpm route-reachability-gate --strict`.
5. `pnpm design:lint`.
6. Staging smoke visual si el cambio se despliega con otros labs internos.

### Out-of-band coordination required

- N/A — repo-only change. Figma no requiere writeback; el nodo es referencia de lectura.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `DESIGN.md` y `GREENHOUSE_DESIGN_TOKENS_V1.md` declaran AXIS `Gap/Padding-N` -> `theme.spacing(N)` con referencia Figma.
- [x] `DESIGN.md` y `GREENHOUSE_DESIGN_TOKENS_V1.md` declaran AXIS `Border-Radius-*` -> `theme.shape.customBorderRadius.*` con referencia Figma.
- [x] `theme.shape.customBorderRadius.xxl = 12` y `theme.shape.customBorderRadius.display = 16` existen como extension Greenhouse documentada y tipada.
- [x] `ui-platform/` incluye un puntero claro hacia los contratos de spacing/radius sin duplicar el SoT visual.
- [x] `/admin/design-system/geometry` existe, es interno, alcanzable y renderiza `Gap/Padding 1..16 + 25` desde `theme.spacing`.
- [x] La misma pagina renderiza `Border-Radius xs/sm/md/lg/xl/round` desde `theme.shape.customBorderRadius` + `9999px`/`50%`.
- [x] La misma pagina renderiza `xxl/display` como extension Greenhouse separada de AXIS e incluye un ejemplo de aplicacion de `display` en una superficie grande.
- [x] La pagina distingue pasos preferidos vs disponibles sin prohibir la escala AXIS.
- [x] La pagina explica que la escala radius actual es moderna-sobria, y que `xxl/display` es para superficies grandes, no para densificar cards operacionales.
- [x] GVC desktop/mobile revisado sin overflow/truncamiento.
- [x] No se crea primitive ni token runtime paralelo de spacing/radius.

## Verification

- `pnpm ops:lint --changed`
- `pnpm task:lint --task TASK-1050`
- `pnpm design:lint`
- `pnpm route-reachability-gate --strict`
- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm fe:capture design-system-spacing --env=local` o `pnpm fe:capture design-system-geometry --env=local`

## Closing Protocol

- [ ] `Lifecycle` sincronizado con estado real
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `docs/tasks/TASK_ID_REGISTRY.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] `docs:closure-check` sin hallazgos materiales

## Follow-ups

- Evaluar lint/docs guard para detectar spacing/radius off-scale solo si aparece drift repetido; no promoverlo en esta task.
- Evaluar migraciones puntuales de consumers a `xxl/display` solo cuando una superficie real las justifique y pase GVC/enterprise review.

## Open Questions

- Ninguna bloqueante. La decision de diseño queda: `Gap/Padding-N` se implementa con `theme.spacing(N)`, `Border-Radius-*` con `theme.shape.customBorderRadius.*`, `xxl/display` se agregan como extension Greenhouse para superficies grandes, y ninguno requiere primitive nueva.
