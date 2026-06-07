# TASK-1016 — Organization List Enterprise Prototype

## Delta 2026-06-07 — GVC contract gates disponibles (TASK-1018 complete)

El runtime de `/agency/organizations` ya puede cerrarse con el **contrato mockup→runtime de GVC V1.5** (TASK-1018). Cuando se implemente el runtime: capturar el mockup aprobado, promover el baseline durable (`pnpm fe:capture:diff --promote` → `scripts/frontend/baselines/agency.organizations.list/`), y declarar en el scenario runtime `baseline.surfaceId` + `maxDiffRatio` + `maskSelectors` + los gates `quality.{layout,runtime,keyboard,performance,enterpriseRubric}`. Ver `GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md` Delta V1.5 + `scripts/frontend/scenarios/_README.md`. El follow-up "aplicar el contrato a este runtime" queda listado en TASK-1018 Follow-ups.

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
- Epic: `optional`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `agency|ui`
- Blocked by: `none`
- Branch: `task/TASK-1016-organization-list-enterprise-prototype`
- Legacy ID: `optional`
- GitHub Issue: `optional`

## Summary

Prototipar una version enterprise moderna del listado `/agency/organizations`, reemplazando la lectura tipo planilla por una superficie operacional de cuentas: list-detail, identidad visual rica, health/readiness por organizacion, filtros segmentados y rail contextual.

La task no implementa el runtime productivo. Produce un mockup real dentro del portal, GVC-verificado, para que el operador apruebe direccion visual antes de tocar `OrganizationListView`.

## Why This Task Exists

La vista actual contiene datos utiles, pero su lenguaje principal es una tabla plana con KPIs genericos arriba. En la captura revisada el resultado se percibe como "Excel glorificado": muchas columnas con bajo contexto, poco ritmo visual, estados comprimidos en chips, contadores `0` repetidos y ninguna lectura dominante de salud, prioridad o siguiente accion.

El problema no es que use tabla; el problema es que la tabla es el producto completo. Para una superficie enterprise de Agency, el operador necesita reconocer rapido que cuentas requieren atencion, que relacion existe con onboarding/spaces/personas, y poder entrar al Organization Workspace sin escanear una matriz seca.

## Goal

- Proponer y prototipar un layout enterprise para `/agency/organizations`.
- Mantener densidad operacional, pero con jerarquia visual clara y lectura dominante en el first fold.
- Usar el stack real Greenhouse/Vuexy/MUI, copy canonica y mock data tipada.
- Dejar un prototipo aprobado que pueda convertirse luego en runtime con copy-and-patch y GVC diff.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `project_context.md`
- `Handoff.md`
- `DESIGN.md`
- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/ui/GREENHOUSE_UI_ORCHESTRATION_V1.md`
- `docs/ui/GREENHOUSE_MODERN_UI_UX_BASELINE_V1.md`
- `docs/ui/GREENHOUSE_VUEXY_COMPONENT_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_ORGANIZATION_WORKSPACE_PROJECTION_V1.md`

Reglas obligatorias:

- Construir el prototipo como ruta real del portal bajo `/mockup/`, no HTML externo.
- No tocar el runtime productivo de `/agency/organizations` en esta task.
- No inventar datos operativos como si fueran reales; usar mock data rotulada y typed fixtures.
- No crear un sistema visual paralelo: respetar `DESIGN.md`, Vuexy/MUI wrappers y primitives Greenhouse.
- La propuesta debe preservar accesibilidad, keyboard focus, estados empty/loading/partial/degraded y reduced motion.
- Cualquier ruta nueva debe ser mockup o alcanzable por el contrato TASK-982; las rutas `/mockup/` quedan excluidas del gate, pero deben seguir siendo navegables desde la URL.
- Copy visible reutilizable debe vivir en `src/lib/copy/*` si el prototipo promueve textos compartidos; copy estrictamente mock puede vivir localmente con comentario claro.

## Normative Docs

- `docs/manual-de-uso/plataforma/captura-visual-playwright.md`
- `docs/architecture/GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md`
- `docs/tasks/to-do/TASK-999-organization-brand-asset-enrichment.md`
- `docs/tasks/complete/TASK-612-shared-organization-workspace-shell-convergence.md`

## Design + Product Recommendation

Brief confirmado desde Product Design:

- Surface: `/agency/organizations`, listado de organizaciones internas de Greenhouse.
- Fuente visual: captura actual del runtime staging y contrato Greenhouse/Vuexy.
- Interactividad esperada: prototipo navegable con controles funcionales sobre mock data; no backend real.

Direccion recomendada:

1. **Cambiar de "tabla con KPIs" a "Organization Operations Workbench".**
   - Header compacto con titulo, search global, CTA contextual y filtros segmentados.
   - Summary strip con 4 senales accionables: cuentas activas, onboarding en curso/bloqueado, cuentas sin Space, cobertura de personas.
   - Nada de hero marketing ni cards decorativas.

2. **Adoptar un patron list-detail.**
   - Izquierda: lista densa de organizaciones con avatar/logo fallback, nombre, public ID, pais, estado, chips de onboarding/space/personas y last activity.
   - Derecha: rail contextual de la organizacion seleccionada con resumen, readiness, relaciones clave, CTA a Organization Workspace y timeline corto.
   - La tabla completa puede vivir como modo alternativo "Matriz" para comparacion masiva, no como unico modo.

3. **Usar agrupacion operacional, no columnas planas.**
   - Segmented control: `Todas`, `En onboarding`, `Sin Space`, `Sin equipo`, `Bloqueadas`, `Clientes activos`.
   - Filtros como chips/menu: pais, lifecycle, industria, source.
   - Orden por `requiere atencion` antes que alfabetico cuando el filtro sea operacional.

4. **Enriquecer identidad sin esperar TASK-999.**
   - Usar avatar con iniciales/logos mock, respetando que TASK-999 sera el SSOT real de brand assets.
   - En el prototipo, mostrar como se veria una organizacion con logo y otra con fallback.

5. **Mostrar health honesta por fila.**
   - `Onboarding`: draft / en curso / bloqueado / sin caso.
   - `Spaces`: 0 como riesgo si la organizacion es cliente activo; no renderizar todos los ceros como badges identicos.
   - `Personas`: distinguir "sin personas" vs "sin datos" vs cantidad real.
   - `Data quality`: pequena marca de source/provenance cuando aplique.

6. **Microinteracciones enterprise.**
   - Row selection con crossfade del rail contextual.
   - Hover/focus visible en filas y CTAs.
   - Skeleton loading estable.
   - Empty state orientado a accion.
   - No animacion decorativa ni bounces.

## Dependencies & Impact

### Depends on

- `src/app/(dashboard)/agency/organizations/page.tsx`
- `src/views/greenhouse/organizations/OrganizationListView.tsx`
- `src/app/api/organizations/route.ts`
- `src/lib/account-360/organization-store.ts`
- `src/views/greenhouse/organizations/types.ts`
- `src/components/greenhouse/organization-workspace/OrganizationWorkspaceShell.tsx`
- `src/components/greenhouse/primitives/`
- `src/lib/copy/agency.ts`

### Blocks / Impacts

- Futuro runtime polish de `/agency/organizations`.
- Potencial consumer visual de `TASK-999` cuando existan logos reales.
- Discovery UX para `TASK-1013` onboarding status dentro del listado.

### Files owned

- `src/app/(dashboard)/agency/organizations/mockup/page.tsx`
- `src/views/greenhouse/organizations/mockup/OrganizationListEnterpriseMockupView.tsx`
- `src/views/greenhouse/organizations/mockup/organization-list-enterprise-mock-data.ts`
- `scripts/frontend/scenarios/organization-list-enterprise-mockup.scenario.ts`
- `src/lib/copy/agency.ts` `[solo si el prototipo promueve copy reutilizable]`
- `docs/tasks/to-do/TASK-1016-organization-list-enterprise-prototype.md`

## Current Repo State

### Already exists

- La ruta productiva `/agency/organizations` renderiza `OrganizationListView`.
- `OrganizationListView` usa TanStack Table, `HorizontalWithSubtitle`, `CustomChip`, `CustomTextField` y consume `/api/organizations`.
- La API `/api/organizations` ya pagina/busca y agrega `onboardingStatus` flag-gated cuando Client Lifecycle esta habilitado.
- `Organization Workspace Shell` existe como destino rico para el detalle de una cuenta.
- `TASK-999` define el futuro flujo real de logos/brand assets; hoy el listado debe mantener fallback.

### Gap

- La vista productiva no ofrece una lectura dominante de operacion o riesgo.
- KPIs arriba no priorizan accion ni calidad de datos.
- La tabla repite muchos `0`/`—` sin explicar impacto.
- No hay rail contextual, modo cards/list-detail, filtros segmentados ni estados visuales enterprise.
- No existe prototipo aprobado para guiar una futura implementacion runtime sin freehand.

## Approved Mockup Contract — Hard Rules for Runtime Implementation

> **Regla de oro:** el mockup aprobado ya resolvio la direccion visual. La implementacion runtime futura debe **cablear datos reales y acciones reales sobre este diseno**, no redisenar la superficie.

Artefactos aprobados:

- Ruta mockup aprobada: `/agency/organizations/mockup`
- View aprobada: `src/views/greenhouse/organizations/mockup/OrganizationListEnterpriseMockupView.tsx`
- Mock data de referencia: `src/views/greenhouse/organizations/mockup/organization-list-enterprise-mock-data.ts`
- Scenario GVC canonico: `scripts/frontend/scenarios/organization-list-enterprise-mockup.scenario.ts`
- Captura final aprobada: `.captures/2026-06-05T10-40-50_organization-list-enterprise-mockup`
- Dossier final: `.captures/2026-06-05T10-40-50_organization-list-enterprise-mockup/review-dossier.md`
- Commit de infraestructura GVC/axe: `829b1466a`

### Runtime adoption hard rules

- **NO redisenar.** No cambiar layout, jerarquia, densidad, composicion, cromatica, radios, ritmo, microcopy principal, patron list-detail, summary strip, filtros segmentados, rail contextual ni matrix mode salvo que el operador apruebe explicitamente una nueva captura GVC.
- **NO volver a tabla plana como default.** La tabla/matriz queda como modo secundario; la experiencia default es Organization Operations Workbench list-detail.
- **NO introducir un patron visual paralelo.** La implementacion debe ser copy-and-patch del mockup aprobado hacia `OrganizationListView` o su reemplazo runtime, reutilizando MUI/Vuexy/Greenhouse primitives existentes.
- **NO inventar datos reales.** Si un campo del mockup no existe en `/api/organizations` o en readers canonicos, cablear estado honesto `unknown`/`not_available`, derivar desde source of truth existente, o abrir subtask/API contract. Nunca fabricar readiness, last activity, data quality, logos ni relationship counts.
- **NO mover logica de negocio al JSX.** La UI runtime debe consumir DTO/readers/commands canonicos. Si se requiere enriquecer `/api/organizations`, hacerlo con contrato server-side, tenant-safe, paginado y testeado.
- **NO hardcodear copy reusable nuevo.** Labels, aria-labels, empty states, CTAs y estados productivos deben vivir en `src/lib/copy/agency.ts` o capa canonica equivalente. Copy estrictamente local de mockup no se promueve sin tokenizar.
- **NO tocar `TASK-999`.** Logos reales y brand asset enrichment siguen siendo responsabilidad de `TASK-999`; la adopcion runtime puede usar fallback de iniciales o `logoUrl` solo si ya existe un contrato canonico.
- **NO degradar mobile.** Mobile debe mantener lectura operacional, filtros usables, row selection y matrix accesible. No aceptar scroll horizontal como unica experiencia default.
- **NO saltarse accesibilidad.** El runtime debe preservar foco visible, labels, `aria-controls` validos, progressbar con nombre, regiones scrollables focusables y contraste WCAG AA automatizado.
- **NO remover microinteracciones enterprise.** Mantener selection feedback, rail crossfade reduced-motion-aware, hover/focus states y layout estable. Se puede simplificar solo por performance medida y con captura before/after.
- **NO cerrar la task de implementacion con "se ve parecido".** Debe existir GVC diff/evidencia runtime contra el mockup aprobado y revision visual humana de frames.

### What the implementation agent should do

- Cablear search, filtros, seleccion, summary strip, rows, rail contextual y matrix mode con datos reales disponibles.
- Reutilizar la estructura visual del mockup como blueprint exacto.
- Identificar campo por campo:
  - dato ya disponible en `/api/organizations` o reader canonico;
  - dato derivable server-side sin N+1;
  - dato faltante que requiere follow-up/API contract;
  - dato que debe quedar oculto o degradado honestamente.
- Mantener la ruta mockup viva hasta que runtime tenga paridad visual verificada; no borrar el mockup antes del cierre runtime.
- Ejecutar GVC en loop sobre mockup y runtime, comparar frames y ajustar solo para paridad/bugs.

### Required runtime adoption gates

- `pnpm lint`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm design:lint`
- `pnpm fe:capture organization-list-enterprise-mockup --env=local`
- Nuevo scenario runtime para `/agency/organizations` o `pnpm fe:capture --route=/agency/organizations --env=local --hold=3000`
- `pnpm fe:capture:review <runtime-capture-dir>`
- Axe/accessibility gate: el scenario runtime debe activar `quality.accessibility` o tener test Playwright con `@axe-core/playwright` sobre el contenedor de la surface.
- Revision manual de frames desktop + mobile antes de commit final.

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

### Slice 1 — Route-local enterprise mockup

- Crear `/agency/organizations/mockup` como ruta de dashboard con mock data tipada.
- Construir `OrganizationListEnterpriseMockupView` con layout list-detail:
  - workbench header compacto;
  - summary strip de senales;
  - segmented control de filtros;
  - organization list con seleccion;
  - rail contextual de cuenta seleccionada;
  - modo alternativo `Matriz` o tab secundaria para comparacion tabular compacta.
- Usar wrappers/primitives existentes antes de crear componentes nuevos.
- Incluir estados: loading skeleton, empty, filtered empty, partial/degraded data y selected row.

### Slice 2 — Interaction and microcopy polish

- Hacer funcionales en mock data: busqueda, filtros segmentados, seleccion de fila, cambio list/matrix, acciones no destructivas.
- Extraer o localizar copy segun corresponda:
  - copy compartible a `src/lib/copy/agency.ts`;
  - copy estrictamente mock local cerca de la view.
- Agregar labels/aria claros para tabs, filtros, search y links.
- Agregar microinteracciones reduced-motion-aware: row focus, rail crossfade, skeleton estable.

### Slice 3 — GVC loop and design review evidence

- Crear scenario GVC `organization-list-enterprise-mockup`.
- Capturar desktop y mobile con `pnpm fe:capture`.
- Leer los frames PNG y ajustar hasta que:
  - no haya overlap;
  - el first fold muestre lectura dominante;
  - mobile preserve acciones y seleccion sin tabla rota;
  - estados y copy se vean enterprise.
- Generar dossier con `pnpm fe:capture:review`.

### Slice 4 — Handoff for runtime adoption

- Documentar en la task o handoff del slice:
  - componentes que se podrian promover a runtime;
  - que datos reales faltan o ya existen;
  - como convertir el mockup a `OrganizationListView` sin re-interpretar el diseño.
- Dejar explicito si la implementacion futura requiere ampliar `/api/organizations` o solo reordenar DTO existente.

## Out of Scope

- Implementar el rediseño en `/agency/organizations` productivo.
- Cambiar `/api/organizations` productivo, schema, capabilities o permisos.
- Resolver logos reales de organizaciones; eso vive en `TASK-999`.
- Agregar endpoints, migrations o flags.
- Cambiar `Organization Workspace Shell` o detail pages.

## Detailed Spec

### Layout target

El prototipo debe sentirse como una herramienta operacional, no como una landing ni un dashboard decorativo:

- **Top band**: titulo `Organizaciones`, count real mock, search, accion primaria o link a alta cliente si aplica, filtros principales.
- **Signal strip**: 4 metric cards compactas, con al menos una señal de riesgo/atencion. No repetir solo totales.
- **Main workbench**:
  - 60/40 desktop: lista izquierda, rail derecho;
  - mobile: lista primero, rail como sheet/accordion o panel debajo;
  - rows con altura estable, avatar, nombre, ID, status, pais, onboarding, spaces/personas y risk marker.
- **Context rail**:
  - identidad de la cuenta seleccionada;
  - readiness mini checklist;
  - relationships: spaces, personas, onboarding;
  - CTA a Organization Workspace;
  - acciones secundarias tonal, no dos primary contained.
- **Matrix mode**:
  - tabla compacta para comparacion masiva, con sticky-ish header si el stack local lo permite;
  - no reemplaza la lista como default.

### Visual constraints

- Cards con radio <= 8px.
- No nested cards.
- No gradientes/orbs/decoracion abstracta.
- No hero.
- No fuentes ni colores fuera de `DESIGN.md`.
- Logos/avatars mock deben ser assets o iniciales; no dibujar marcas falsas complejas.
- Iconos: usar Tabler/Vuexy existentes o lucide solo si el repo ya lo usa en esa zona.

### Data model for mock

Mock item minimo:

```ts
type OrganizationEnterpriseMock = {
  organizationId: string
  publicId: string
  name: string
  legalName?: string
  countryCode?: string
  lifecycle: 'active_client' | 'opportunity' | 'prospect' | 'inactive'
  status: 'active' | 'inactive' | 'churned'
  onboarding?: 'draft' | 'in_progress' | 'blocked' | 'complete' | null
  spaceCount: number
  peopleCount: number
  industry?: string
  source: 'hubspot' | 'manual' | 'wizard'
  lastActivityLabel: string
  risk: 'none' | 'attention' | 'blocked'
}
```

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (mockup shell + typed data) MUST ship before interaction polish.
- Slice 2 (interactions + copy) MUST ship before GVC review.
- Slice 3 (GVC loop) MUST finish before any runtime adoption task is proposed as implementation-ready.
- Slice 4 (handoff) MUST not claim product runtime changed.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| El prototipo se interpreta como runtime listo | UI / ops | medium | ruta `/mockup/`, copy/handoff explicito, no tocar `OrganizationListView` | no signal — revision de task/handoff |
| Se inventan KPIs que no existen en API real | UI / data | medium | marcar datos mock, listar DTOs reales faltantes en Slice 4 | no signal — GVC/handoff |
| La propuesta duplica TASK-999 logos | UI / identity | low | usar avatares/fallback mock y declarar TASK-999 como SSOT futuro | no signal — task dependency |
| Mobile degrada a tabla horizontal inutil | UI / accessibility | medium | GVC mobile obligatorio y rail responsive | GVC finding |
| Copy visible queda hardcodeada reusable | UI / copy | medium | revisar `src/lib/copy/agency.ts` y mover copy compartida | lint/copy review |

### Feature flags / cutover

Sin flags. Es una ruta mockup aditiva sin impacto productivo.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revertir archivos de mockup | <15 min | si |
| Slice 2 | Revertir view/copy local del mockup | <15 min | si |
| Slice 3 | Eliminar scenario/captures generadas quedan gitignored | <10 min | si |
| Slice 4 | Revertir handoff/docs del prototipo | <10 min | si |

### Production verification sequence

N/A — prototipo local/staging mockup only, sin rollout productivo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe `/agency/organizations/mockup` como ruta real del portal con mock data tipada.
- [ ] El prototipo usa list-detail como experiencia default y conserva matrix/table como modo secundario.
- [ ] Search, filtros segmentados, seleccion y cambio de modo funcionan sobre mock data.
- [ ] Estados loading, empty, filtered empty y partial/degraded estan representados.
- [ ] Desktop y mobile quedan verificados con GVC y frames revisados.
- [ ] El handoff explica como adoptar el diseño en `OrganizationListView` sin reinterpretarlo.
- [ ] No se tocan APIs, schema, flags ni runtime productivo del listado.

## Verification

- `pnpm task:lint --task TASK-1016`
- `pnpm lint`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm design:lint`
- `pnpm route-reachability-gate --strict`
- `pnpm fe:capture organization-list-enterprise-mockup --env=local`
- `pnpm fe:capture:review organization-list-enterprise-mockup`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado con decision visual, GVC path y limites del prototipo
- [ ] `changelog.md` quedo actualizado solo si la task termina cambiando una convencion visible o reusable
- [ ] se ejecuto `greenhouse-documentation-governor` si el prototipo promueve un patron reusable o modifica docs/UI platform

## Follow-ups

- Runtime implementation task para convertir el mockup aprobado en `/agency/organizations`.
- Evaluar si el rail contextual debe reutilizar parte de `OrganizationWorkspaceShell` o permanecer como preview local.
- Integrar logos reales cuando `TASK-999` cierre o exponga `logoUrl` canonico.
