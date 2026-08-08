# Plan — TASK-1310 SEO cliente + report artifact + quadrant 360

## Discovery summary

- Hook ejecutado y aprobado: `pnpm codex:task-hook TASK-1310 --json`.
- Checkout compartido: `develop`; no se crea worktree ni branch aislada.
- El worktree ya contiene cambios de contexto y tareas relacionadas ajenos a esta implementación. Se
  preservan; los archivos de TASK-1310 se mantienen bajo `docs/tasks/in-progress/`.
- Dependencias satisfechas: `TASK-1305` aporta `readSeoAeoGap` y `classifyQuadrant`; `TASK-1307` aporta
  el patrón de evolución con Y invertido y el stack ECharts lazy; `TASK-1252` aporta `ReportArtifactModel`
  y sus adapters; `TASK-1301` aporta `resolveSeoEntitlement` y capabilities SEO.
- Gap confirmado: no existe `readRankSnapshotLatest`; el resumen debe derivar la última observación desde
  `readRankEvolution` o desde un reader existente, sin abrir una segunda fuente.
- Gap confirmado: no existen rutas cliente SEO, view client-facing, adapter `modelFromSeoReport`, copy
  `GH_GROWTH_SEO_CLIENT`, escenarios GVC ni la dirección visual dedicada.
- Archivos canónicos encontrados: `/aeo` y `AiVisibilityClientReportView` como referencia de acceso y
  `masterDetail`; `src/components/growth/ai-visibility/report-artifact/model.ts` como SSOT de modelo;
  `docs/ui/wireframes/TASK-1310...`, su flow y el master flow EPIC-022.
- Discrepancia corregida en el wireframe: la referencia inexistente `readRankSnapshotLatest` se reemplaza
  por una derivación explícita desde `readRankEvolution`/reader existente.
- Dirección aprobada para ejecución: se construyen las tres direcciones como una familia coherente:
  Evidence Narrative en el dashboard, Visibility Map en el quadrant y Trust Report Artifact en el
  informe. Ver `docs/ui/visual-directions/TASK-1310...direction.md`.
- Solution quality assessment: la causa raíz del gap no es falta de datos ni un endpoint nuevo; es ausencia
  de adapters de cliente que compongan contratos ya disponibles. La solución es aditiva y respetuosa de
  boundaries: readers server-side → DTO client-safe → views/adapters; no se parchea AEO ni se recalcula el
  cruce SEO×AEO en la UI.

## Execution checkpoint — 2026-08-08

- Código completo en local para las tres direcciones aprobadas: dashboard Evidence Narrative, quadrant
  Visibility Map y report Trust Report Artifact. El report web/print consume el mismo `ReportArtifactModel`
  mediante `modelFromSeoReport`; no se creó scoring ni endpoint paralelo.
- Grupo Berel ya tiene `seo_v1` activo y assignment contratado. Se verificó el tenant client-scoped con una
  identidad dedicada de revisión y las dos rutas directas; el gate efectivo es
  `growth.seo.report.read_client` + scope `own`, no el capability de observación interna.
- Capturas GVC canónicas locales, desktop + mobile, con datos reales: `.captures/2026-08-08T09-15-23_growth-seo-client`,
  `.captures/2026-08-08T09-16-33_growth-seo-report` y `.captures/2026-08-08T09-17-46_growth-seo-report-print`.
  Se corrigieron contrastes/roles ARIA de las superficies y el layout de la tabla 360; el contenido desktop
  queda sin findings axe. Warnings restantes pertenecen al shell global mobile y están declarados en la task.
- Lint focal, 28 tests focales, `task:lint` y reachability pasan. GCloud/ADC y proxy PostgreSQL fueron
  renovados/verificados. No se ejecuta build completo en este checkout por el guard de recursos.
- Estado de handoff: `code complete, rollout pendiente`; faltan staging capture, baseline diff y promoción
  develop→main. No se creó worktree ni se hizo push/deploy.

## Access model

- `routeGroups`: agregar `/growth/seo` y `/growth/seo/report` bajo `client`; registrar ambos en
  `route-reachability-manifest.ts` como deep-links client-scoped.
- `views` / `viewCode`: registrar la superficie cliente y el report en `view-access-catalog.ts` con rutas y
  labels separados de `administracion.growth_seo`; la pantalla no debe heredar un permiso admin.
- `entitlements`: dashboard y report requieren `growth.seo.report.read_client`, ambos con
  scope `own` y tenant client. `growth.seo.observation.read` queda reservado al cockpit
  operador. El resolver de
  `module_assignment=active` es per-organización; nunca usar el rol como sustituto.
- `startup policy`: no cambia. `requireServerSession` y `requireClientTenantContext` permanecen en las
  pages server; una sesión sin tenant o sin assignment recibe locked/permission denied honesto.
- Decisión de diseño: el menú cliente conserva una única entrada o deep-link de SEO según el catálogo actual;
  el report y el quadrant se alcanzan por inline-link/section navigator, sin duplicar nav.

## Architecture decision

- ADR existente: arquitectura SEO `GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1`, CompositionShell y
  `ReportArtifactModel`/AEO report artifact.
- ADR nuevo/propuesto: no requerido. La task consume contratos aceptados, no cambia source of truth,
  schema, auth, API externa ni UI platform compartida.
- Status requerido antes de implementar: los contratos existentes permanecen `Accepted`; el adapter SEO es
  una extensión local y no modifica el modelo compartido.

## Backend/data contract

- Source of truth: `readRankEvolution(seoTargetId, options)` y `readSeoAeoGap(seoTargetId, options)`;
  el model compartido del artifact es el contrato de render. No hay migración ni nuevo endpoint.
- Boundary: readers, tenant binding, capability y entitlement en server; las vistas reciben DTOs
  client-safe. `readSeoAeoGap` conserva SEO y AEO como lentes ortogonales y propaga `no_seo_data`/
  `no_aeo_data` como estados, nunca como cero.
- Nuevo contrato puro: `modelFromSeoReport(seoReportDto, variant)` en el módulo de modelo; sin IO, JSX,
  provider SDK ni scoring alternativo. Los adapters web/print consumen el mismo model.
- Derivación del resumen: latest/summary se obtiene de la última muestra disponible en
  `readRankEvolution`; no se crea `readRankSnapshotLatest` paralelo.
- Access: todos los readers se invocan solo después de resolver tenant, assignment y capability; el target
  se liga a la organización server-side.
- Rollback: cambios aditivos; retirar las nuevas rutas/adapters/scenarios devuelve el runtime al estado
  previo sin migración ni backfill.
- Runtime evidence: tests focales de adapters/readers, typecheck/lint, GVC desktop/mobile y revisión de
  disclosure/scroll width.

## Skills

- `greenhouse-ai-design-studio`: dirección, mapping de primitives/tokens, estados, responsive y scorecard.
- `greenhouse-product-ui-architect`: composición, variants/kinds, `CompositionShell` y límites de
  primitive.
- `greenhouse-portal-ui-implementer`: pages server, routeGroup client, tenant/capability guard y vista
  portal.
- `greenhouse-vuexy-ui-expert`: composición MUI/Vuexy compatible con la base existente.
- `greenhouse-ux-content-accessibility`: copy es-CL, estados honestos, labels, focus y reduced motion.
- `greenhouse-browser-diagnostics`: captura GVC y evidencia visual responsive.
- `greenhouse-qa-release-auditor`: gates proporcionales y scorecard final.
- `greenhouse-documentation-governor`: cierre de task, Handoff y contexto.

## Subagent strategy

`sequential`.

El usuario no autorizó subagentes y los slices comparten rutas, copy, access registry, model y evidencia
visual. El agente principal mantiene una sola línea de criterio y evita colisiones en el checkout compartido.

## Execution order

1. Persistir dirección visual, corregir el mapping del wireframe y mantener task/registry/Handoff honestos.
2. Ejecutar baseline `pnpm lint` y `pnpm exec tsc --noEmit --pretty false`; registrar errores preexistentes
   sin arreglar archivos ajenos.
3. Crear copy cliente SEO y registrar rutas/view codes/route reachability, preservando el patrón de `/aeo`.
4. Crear el page server de `/growth/seo`: sesión, tenant, entitlement, capability, resolución de target y
   estados locked/empty/error antes de render.
5. Crear `SeoClientDashboardView` con `masterDetail`, veredicto Evidence Narrative, resumen y navegación
   de secciones.
6. Crear evolución con ECharts lazy, derivada de `readRankEvolution`, Y invertido, labels, tooltip
   accesible y fallback de no-data/error/reduced-motion.
7. Crear quadrant 360 con `readSeoAeoGap` + `classifyQuadrant`, ejes ortogonales, labels textuales,
   cross-link `/aeo`, `sin_dato` y degradación sin AEO.
8. Crear adapter `modelFromSeoReport` y render adapters web/print SEO aditivos; reusar el runtime de
   report artifact y no duplicar scoring/charts del AEO.
9. Crear page server `/growth/seo/report` con capability propia, disclosure client-safe y estados de
   report no disponible/error.
10. Agregar escenarios GVC desktop/mobile para dashboard, evolución, quadrant, report, locked y empty;
    añadir markers y assertions de focus, `role=img`, no overflow y reduced motion.
11. Ejecutar tests focales, lint, typecheck, `pnpm qa:gates --changed`, readiness, captures y scorecard
    visual; ajustar únicamente archivos de la task o registrar deuda concreta.
12. Cerrar docs, task lifecycle, Handoff y context checks con estado honesto; no push/deploy/release.

## Files to create

- `docs/ui/visual-directions/TASK-1310-growth-seo-client-dashboard-report-artifact-direction.md`
- `docs/tasks/plans/TASK-1310-plan.md`
- `src/app/(dashboard)/growth/seo/page.tsx`
- `src/app/(dashboard)/growth/seo/report/page.tsx`
- `src/views/greenhouse/growth/seo/client/SeoClientDashboardView.tsx`
- `src/views/greenhouse/growth/seo/client/SeoRankEvolutionChart.tsx`
- `src/views/greenhouse/growth/seo/client/SeoAeoQuadrant.tsx`
- `src/components/growth/seo/report-artifact/**`
- escenarios GVC `growth-seo-client` y `growth-seo-report` según DSL existente

## Files to modify

- `docs/ui/wireframes/TASK-1310-growth-seo-client-dashboard-report-artifact.md` — mapping corregido y
  referencia a la dirección seleccionada.
- `docs/tasks/in-progress/TASK-1310-growth-seo-client-dashboard-report-artifact.md` — acceptance,
  dirección y evidencia de implementación.
- `src/lib/copy/growth.ts` — `GH_GROWTH_SEO_CLIENT`.
- `src/lib/admin/view-access-catalog.ts` — view codes client-scoped.
- `src/lib/navigation/route-reachability-manifest.ts` — deep-links y child routes.
- `docs/tasks/README.md`, `docs/tasks/TASK_ID_REGISTRY.md`, `Handoff.md` — lifecycle y handoff.

## Files to delete

- Ninguno previsto.

## Risk flags

- El contrato de `ReportArtifactModel` es compartido: el adapter SEO debe ser aditivo y sus tipos no deben
  filtrar campos internos.
- La UI no debe convertir `null`, `no_aeo_data` o `no_seo_data` en cero o éxito visual.
- Hay cambios locales ajenos en el worktree; se deben conservar y no hacer resets amplios.
- Los escenarios GVC pueden requerir fixtures/staging con org asignada; si el runtime no expone una fixture
  segura, se documenta la limitación y no se inventa evidencia live.
- La visual debe mantener la dirección premium sin valores literales en clases ni un sistema de estilos
  paralelo.

## Open questions

- Resueltas por esta decisión: se implementan las opciones 1, 2 y 3, cada una en su superficie natural
  (`/growth/seo`, `Quadrant 360`, `/growth/seo/report`). No se requiere otra selección visual antes de
  implementar.
- Pendiente técnico no bloqueante: confirmar el viewCode exacto del catálogo client-facing durante el slice
  de access registry y conservar nomenclatura existente si ya hay un alias canónico.
- Pendiente operativo: confirmar disponibilidad de fixture GVC client con `module_assignment=active`; si no
  existe, validar los estados locked/empty localmente y dejar la captura live explícitamente pendiente.

## Checkpoint humano

TASK-1310 es `Effort: Alto`; este plan requiere aprobación humana antes de escribir código de producto.
