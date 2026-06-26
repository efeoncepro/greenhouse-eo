# ISSUE-108 — El color `primary` falla contraste WCAG 4.5:1 como texto (breadcrumb / botón outlined / links) portal-wide

## Ambiente

staging + production (es el runtime de la paleta, no un ambiente puntual)

## Detectado

2026-06-26 — axe-core (Playwright) corriendo el gate a11y del Growth Forms Admin Cockpit (TASK-1232 #4 / TASK-1261). axe reportó 12 violaciones `color-contrast` serias **todas** sobre primitives compartidas, no sobre el cockpit.

## Síntoma

Texto en color `primary` (≈ `#0375db` / hover `#0b79dc`) sobre fondo claro falla el mínimo WCAG 1.4.3 de **4.5:1** para texto normal:

- `GreenhouseBreadcrumbs` label no-current (usa `theme.palette.primary.main` como color de texto) → **4.11:1**.
- `GreenhouseButton variant='outlined' tone='primary'` (texto primary sobre blanco) → **3.69:1 / 4.13:1**.
- `GreenhouseButton variant='solid' tone='primary'` (texto **blanco** sobre fill primary) → **4.39:1** (el fill no es lo bastante oscuro para blanco a tamaño normal).

## Causa raíz

La paleta `primary` vigente (overhaul Restraint, TASK-1053) tiene un `primary.main` cuyo contraste como **texto** sobre claro queda en ~3.7–4.4:1 — pasa el umbral de 3:1 (componentes UI / large text) pero **NO** el 4.5:1 de texto normal. Los primitives compartidos (`GreenhouseBreadcrumbs`, `GreenhouseButton`) lo usan como color de texto / como fill bajo texto blanco.

## Impacto

**Portal-wide.** Afecta todo breadcrumb no-current, todo botón outlined/solid `primary` y links primary del portal — no es específico del cockpit. Es un piso WCAG 2.2 AA (EAA enforced) incumplido de forma transversal.

## Solución — plan gobernado (design-system-governance, 2026-06-26)

**Camino canónico = Opción A, y NO es un patrón nuevo: es el precedente `success.ink` (TASK-1053 Fase B) aplicado al rol `primary`/marca.** Cuando `warning.main`/`#2E7D32` fallaban como texto, la solución gobernada NO fue oscurecer la marca — fue derivar un **token de texto AA-safe** del AXIS SoT (`success.ink = #11703f`, `theme.greenhouseSemantic[role].{ink,tonalText}` mode-aware). `primary` necesita exactamente eso. **Opción B (oscurecer `primary.main`) descartada:** blast radius de marca portal-wide sobre la paleta aprobada TASK-1053, e innecesario teniendo el ramp.

**El AXIS SoT ya trae los steps con margen** (`axisRamp.primary` en `src/@core/theme/axis-tokens.ts`, cero hex nuevo) — contraste verificado:

| Step | Texto sobre blanco | Blanco sobre fill | Rol propuesto |
|---|---|---|---|
| `primary.500` `#0375db` (hoy) | 4.59:1 (borde; axe real 3.69–4.39 con hover/opacity/overlay) | 4.59:1 | **solo fills/bordes** (UI ≥3:1 OK) |
| `primary.700` `#024c8f` | **8.63:1** ✅ | **8.63:1** ✅ | **texto-sobre-claro + fill bajo texto blanco** |
| `primary.800` `#023c70` | 11.15:1 | 11.15:1 | alternativa más oscura |

**Dos ejes de contraste distintos (NO confundir):**

1. **Texto `primary` sobre claro** (breadcrumb label, texto de botón outlined, links primary): nuevo token AA-safe `primary.ink`/`greenhouseSemantic.primary.tonalText` derivado de `axisRamp.primary[700]` (#024c8f, 8.63:1, mode-aware con su `darkFg`). `GreenhouseBreadcrumbs` label + `GreenhouseButton` outlined consumen ESTE para texto; `primary.main` (#0375db) se queda para fills/bordes.
2. **Texto blanco sobre fill `primary`** (botón solid): el fill #0375db da 4.59:1 puro pero el render real cae a 4.39:1 → subir el fill del botón solid a `primary[700]` (#024c8f, blanco 8.63:1). Es un oscurecimiento **acotado al fill del botón** (no al token de marca) → requiere sign-off visual (GVC).

**Protocolo de ejecución (6 pasos del skill, en el mismo PR):** (1) agregar `primary.ink`/sub-valores al SoT runtime-agnóstico `axisSemanticSubValues` (`@/lib/design-tokens/semantic-sub-values`) + re-export `@core/theme/axis-semantic` → `greenhouseSemanticTokens(mode)` → `mergedTheme`; (2) V1 §color + DESIGN.md (3-layer parity); (3) consumir en `GreenhouseBreadcrumbs` + `GreenhouseButton` (outlined-text + solid-fill); (4) extender el drift-guard (`axis-semantic-contrast.test.ts` asertando `primary.ink` ≥4.5:1 light + darkFg ≥4.5:1 dark, espejo de success); (5) **sonda de contraste real** + re-correr `tests/e2e/smoke/growth-forms-admin-cockpit-a11y.spec.ts` **sin** el `disableRules(['color-contrast'])` → verde; (6) **GVC sweep portal-wide** (no solo el cockpit — breadcrumbs/botones primary en superficies representativas) sin regresión visual. `pnpm design:lint` 0/0.

**Vehículo:** es trabajo design-system-wide con blast radius controlado (toca primitives compartidas + paleta TASK-1053) → **TASK-1262** (`docs/tasks/to-do/TASK-1262-primary-text-aa-token-governed-fix.md`, creada 2026-06-26). El cierre de este issue (→ `resolved/`) es el Slice 3 de esa task. Pendiente de tomar + sign-off visual del operador.

## Verificación

- Sonda de contraste (axe / WebAIM) sobre breadcrumb + botón outlined + botón solid → ≥4.5:1.
- Re-correr `tests/e2e/smoke/growth-forms-admin-cockpit-a11y.spec.ts` **sin** el `disableRules(['color-contrast'])` → verde.
- GVC sweep de superficies representativas (no solo el cockpit) sin regresión visual.

## Estado

open

## Relacionado

- Detectado cerrando **TASK-1232** (gate a11y #4) y **TASK-1261**. El gate #4 del cockpit cubre la a11y **estructural** (nested-interactive, nombres, foco) — verde; el contraste de paleta se trackea acá.
- Toca **TASK-1053** (Restraint palette) + `project_axis_palette_adoption`.
- `tests/e2e/smoke/growth-forms-admin-cockpit-a11y.spec.ts` desactiva `color-contrast` con referencia a este ISSUE.
- Primitives: `src/components/greenhouse/primitives/GreenhouseBreadcrumbs.tsx`, `GreenhouseButton`.
