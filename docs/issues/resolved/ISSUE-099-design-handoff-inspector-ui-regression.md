# ISSUE-099 — Design Handoff inspector no cerraba y regresión visual del cockpit

## Ambiente

local dev (`/design-system/handoff`, Turbopack + Design System Handoff)

## Detectado

2026-06-20, revisión visual del operador con screenshots.

## Síntoma

- El handoff heredaba el botón superior `Nodo Figma` del shell de Design System, aunque la pantalla ya es el flujo de handoff.
- Los chips de estado y CTAs del encabezado competían con el contenido y quedaban pegados al borde visual.
- El inspector exponía demasiados formularios abiertos, generando un scroll largo y poco profesional.
- El botón de cerrar del inspector no cerraba la lane.
- El dev overlay quedaba en `Compiling...` durante la verificación local.

## Causa raíz

- El shell compartido de Design System mostraba el affordance AXIS/Figma por ruta sin distinguir que `/design-system/handoff` no es una página de primitiva.
- La vista duplicaba acciones globales (`Nuevo nodo`, `Refrescar`) entre header y tabs, y mantenía chips de contrato como decoración de primer nivel.
- El inspector renderizaba todas las secciones expandidas en un sidecar, sin jerarquía progresiva.
- El `onClose` del `ContextualSidecar` limpiaba `selectedId`, pero el memo de `selectedEntry` re-seleccionaba el primer entry como fallback; por eso el panel se abría de nuevo.
- El `Compiling...` local fue provocado por degradación del dev server/PG pool durante renders SSR (`read ECONNRESET` y clase `Cannot use a pool after calling end on the pool`), alineado con la familia ya resuelta en `ISSUE-094`; no fue un error de JSX del cockpit.

## Impacto

La superficie de Design Handoff se veía poco enterprise, confundía la acción principal, impedía cerrar el contexto lateral y hacía poco confiable la validación visual local.

## Solución

- Se ocultó el affordance superior de Figma para `/design-system/handoff`.
- Se limpió el header: sin chips decorativos ni CTAs duplicados; `Nuevo nodo` queda como tab y `Refrescar` queda contextual en la barra del workbench.
- Se agregó inset/padding consistente al shell y al contenido del handoff.
- El inspector pasó a una estructura compacta: checklist de readiness en grid y secciones colapsables para gobernanza, planificación, owners, evidencia, trazabilidad y cierre.
- Se separó `inspectorOpen` de `selectedId` y el `onClose` ahora cierra la lane de verdad sin reactivar el fallback.
- El scenario GVC actualizó su keyboard probe al nuevo selector estable.
- La degradación `Compiling...` quedó clasificada como incidente local del dev server/PG pool y se mitigó reiniciando `pnpm dev`; `pnpm pg:doctor` confirmó conectividad/credenciales sanas.

## Verificación

- `pnpm exec eslint src/views/greenhouse/admin/design-system/DesignHandoffLaneView.tsx src/views/greenhouse/admin/design-system/DesignSystemBreadcrumbShell.tsx scripts/frontend/scenarios/design-system-handoff-primitive-governance.scenario.ts --fix`
- `pnpm exec tsc --noEmit --pretty false`
- `git diff --check`
- Revisión visual del operador confirmó que el inspector puede desaparecer y que el affordance superior de Figma ya no está en la ruta.

Nota: la recaptura GVC final quedó bloqueada por la degradación local del dev server/PG pool descrita arriba; no se encontró error de compilación TypeScript/ESLint en los archivos corregidos.

## Estado

resolved

## Relacionado

- `ISSUE-094`
- `TASK-1176`
- `TASK-1180`
- `src/views/greenhouse/admin/design-system/DesignHandoffLaneView.tsx`
- `src/views/greenhouse/admin/design-system/DesignSystemBreadcrumbShell.tsx`
- `scripts/frontend/scenarios/design-system-handoff-primitive-governance.scenario.ts`
