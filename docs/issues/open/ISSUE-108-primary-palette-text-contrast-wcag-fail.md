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

## Solución

Decisión de **design-system / paleta** (NO parche local, NO dentro de TASK-1232/1261):

- Opción A: derivar un token de **texto-sobre-claro accesible** (p. ej. `primary.dark` o un `primaryText` dedicado ≥4.5:1) y que `GreenhouseButton` outlined + `GreenhouseBreadcrumbs` label lo usen para TEXTO, manteniendo `primary.main` para fills/bordes (≥3:1 OK).
- Opción B: oscurecer `primary.main` lo suficiente para 4.5:1 como texto Y para blanco-sobre-fill — mayor blast radius visual (cambia el brand en todo el portal).
- Requiere `design-system-governance` + sonda de contraste real + GVC sweep portal-wide + sign-off (toca la paleta aprobada TASK-1053).

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
