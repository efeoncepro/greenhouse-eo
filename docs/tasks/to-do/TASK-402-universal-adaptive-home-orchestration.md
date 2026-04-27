# TASK-402 — Universal Adaptive Home Orchestration

## Delta 2026-04-26

- **Absorbida parcialmente por TASK-696** (Smart Home v2 Enterprise-grade redesign).
- TASK-696 ya implementó: contrato versionado `home-snapshot.v1`, Home Block Registry declarativo, 7 bloques role-aware (`hero-ai / pulse-strip / today-inbox / closing-countdown / ai-insights-bento / recents-rail / reliability-ribbon`), composer con `withSourceTimeout`, kill switches per-block (`greenhouse_serving.home_block_flags`), pre-compute lookup (`home_pulse_snapshots`), `user_recent_items`, density toggle (`client_users.ui_density`), default-view override (`client_users.home_default_view`), opt-out a v1 (`home_v2_opt_out`), módulo `home` registrado en Reliability Control Plane, Sentry domain `home` añadido.
- **Lo que queda** de esta TASK-402 después del cierre de TASK-696:
  - **Density toggle UI** dentro del Customizer (PATCH `/api/home/preferences` ya existe — falta el control visual).
  - **Default surface override UI** en Mi Perfil/Configuración.
  - **Cron de pre-cómputo** `/api/cron/precompute-home-pulse` (la tabla y el reader existen; falta el job que la pueble).
  - **Audience-filtered routes para ⌘K** (la palette está construida — falta filtrar por entitlements del usuario).
  - **Tracking de `user_recent_items`** vía middleware/route.ts (la tabla y el reader existen; falta el writer en cada navegación).
  - **OpenAPI `HomeSnapshotV1` schema** publicado en `docs/api/GREENHOUSE_API_PLATFORM_V1.openapi.yaml`.
- Re-enfocar el scope de esta task hacia esos 6 follow-ups o cerrarla si se descomponen en tasks nuevas.

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
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `none`
- Branch: `task/TASK-402-universal-adaptive-home-orchestration`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Formalizar `/home` como la entrada principal del portal para todos los usuarios y convertir la Home en una experiencia adaptativa por audiencia, permisos y contexto. La task separa de forma explícita el concepto de startup home del concepto de permisos, para que Nexa y la primera experiencia del portal no dependan de combinaciones accidentales de `routeGroups`.

## Why This Task Exists

Greenhouse ya corrigió el drift de `/dashboard` como fallback estructural y validó que `/home` es la home moderna del portal. Sin embargo, el runtime todavía conserva una tensión arquitectónica: el startup home se sigue derivando desde `routeGroups` y eso vuelve frágil la experiencia de entrada para perfiles mixtos o administrativos.

El caso real que expuso el problema fue claro:

- `efeonce_admin` hereda múltiples superficies (`internal`, `admin`, `finance`, `hr`, `my`, etc.)
- si el startup home se resuelve con prioridad implícita de módulos, un superadmin puede terminar entrando en Payroll o Finance en lugar de en la Home principal
- eso rompe la consistencia de Nexa como puerta de entrada y hace que cada módulo compita por ser "la home real"

La solución robusta y escalable es mantener una sola puerta de entrada (`/home`) y adaptar el contenido visible dentro de esa home según audiencia, permisos, contexto operativo y foco reciente del usuario.

## Goal

- Consolidar `/home` como entrypoint universal del portal para perfiles administrativos y mixtos
- Separar en el runtime el concepto de startup policy del concepto de permisos / superficies autorizadas
- Rediseñar la Home para que renderice bloques, shortcuts, KPIs y CTAs relevantes según audiencia sin fragmentar la puerta de entrada

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PORTAL_VIEWS_V1.md`
- `docs/architecture/Greenhouse_Nomenclatura_Portal_v3.md`

Reglas obligatorias:

- `/home` debe seguir siendo la ruta canónica de Home; no reintroducir `/dashboard` como fallback estructural
- `routeGroups` y `authorizedViews` no deben reutilizarse como único criterio para decidir el startup home
- la Home universal debe ser tenant-safe y respetar `space_id` y los límites de visibilidad actuales
- las métricas operativas deben seguir consumiéndose desde los snapshots/API ya existentes; no recalcular inline en la vista

## Normative Docs

- `project_context.md`
- `Handoff.md`
- `docs/tasks/complete/TASK-400-portal-home-contract-governance-entrypoint-cutover.md`
- `docs/tasks/complete/TASK-285-client-role-differentiation.md`

## Dependencies & Impact

### Depends on

- `src/app/page.tsx`
- `src/app/auth/landing/page.tsx`
- `src/app/(dashboard)/home/page.tsx`
- `src/views/greenhouse/home/HomeView.tsx`
- `src/lib/tenant/resolve-portal-home-path.ts`
- `src/lib/tenant/access.ts`
- `src/lib/auth.ts`
- `src/lib/home/get-home-snapshot.ts`
- `src/app/api/home/snapshot/route.ts`
- `src/app/api/home/nexa/route.ts`

### Blocks / Impacts

- startup routing autenticado del portal
- diseño y jerarquía de Nexa como entrypoint universal
- `TASK-285`, porque la diferenciación de roles cliente debe reflejarse dentro de la Home universal
- navegación shell y CTAs principales hacia HR, Finance, My, Agency y Client Portal

### Files owned

- `src/lib/tenant/resolve-portal-home-path.ts`
- `src/lib/tenant/access.ts`
- `src/lib/auth.ts`
- `src/app/page.tsx`
- `src/app/auth/landing/page.tsx`
- `src/app/(dashboard)/home/page.tsx`
- `src/views/greenhouse/home/HomeView.tsx`
- `src/views/greenhouse/home/components/*`
- `src/lib/home/get-home-snapshot.ts`
- `src/app/api/home/snapshot/route.ts`
- `src/app/api/home/nexa/route.ts`
- `src/components/layout/vertical/VerticalMenu.tsx`
- `src/components/layout/shared/UserDropdown.tsx`
- `docs/architecture/GREENHOUSE_PORTAL_VIEWS_V1.md`
- `docs/documentation/[verificar]`

## Current Repo State

### Already exists

- `/home` ya existe como Home moderna y renderiza Nexa vía `src/views/greenhouse/home/HomeView.tsx`
- `resolvePortalHomePath()` ya concentra aliases legacy y defaults especializados en `src/lib/tenant/resolve-portal-home-path.ts`
- `src/app/page.tsx` y `src/app/auth/landing/page.tsx` ya redirigen a `session.user.portalHomePath`
- `src/lib/home/get-home-snapshot.ts` y `/api/home/snapshot` ya entregan una base de datos para construir la Home
- `NexaFloatingButton` ya reconoce `/home` como superficie inline y se oculta allí

### Gap

- el startup home sigue demasiado acoplado a `routeGroups`, lo que vuelve frágil la entrada de perfiles mixtos
- la Home existe, pero todavía no funciona como orquestador universal por audiencia; hoy convive con workspaces que también operan como entrypoints
- no existe una policy explícita y persistible de startup intent (`universal_home`, `finance_workspace`, etc.)
- la diferenciación de audiencias dentro de `/home` todavía no está formalizada para admin/internal, client, HR, finance, collaborator y perfiles mixtos

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

### Slice 1 — Startup policy desacoplada de permisos

- modelar una policy explícita de startup home separada de `routeGroups`
- definir reglas estables para:
  - perfiles administrativos / mixtos -> `/home`
  - perfiles puros HR -> `/hr/payroll`
  - perfiles puros Finance -> `/finance`
  - perfiles puros My -> `/my`
  - clientes -> `/home` con variantes de contenido según rol
- dejar el resolver listo para soportar future keys semánticas de startup home sin depender de rutas raw

### Slice 2 — Home universal adaptativa por audiencia

- evolucionar `HomeView` para renderizar bloques, shortcuts y prioridades distintas según audiencia
- mantener una misma shell de Nexa y jerarquía principal, con contenido adaptativo para:
  - admin / internal
  - HR
  - Finance
  - collaborator
  - client executive / manager / specialist
- asegurar que la Home no duplique innecesariamente workspaces completos; debe orquestar, no reemplazar módulos

### Slice 3 — Continuidad y accesos recomendados

- definir cómo la Home sugiere o prioriza el "siguiente workspace" (`Continuar en Payroll`, `Ir a Finanzas`, etc.)
- evaluar si hace falta una noción explícita de `lastWorkspacePath` o preferencia reciente
- alinear navegación shell y dropdown para que `/home` sea la primera referencia conceptual del portal

### Slice 4 — Contrato documental y funcional

- actualizar arquitectura y documentación funcional para declarar `/home` como entrada universal
- dejar explícita la relación entre Home universal, workspaces especializados y diferenciación de roles cliente
- documentar cualquier nueva policy key o contrato persistido

## Out of Scope

- reescribir por completo todos los módulos HR, Finance, My o Agency
- rediseñar visualmente cada workspace especializado
- eliminar `/dashboard` como compat route si sigue siendo necesaria para deep links legacy
- redefinir el sistema completo de roles y route groups fuera de lo estrictamente necesario para el startup contract

## Detailed Spec

La Home universal debe tratarse como una superficie de orquestación, no como un módulo competidor de HR, Finance o My.

Principios de diseño:

1. **Una sola puerta de entrada**
   - `/home` es el entrypoint universal del portal
   - los workspaces especializados siguen existiendo como destinos operativos

2. **Adaptación interna, no fragmentación de rutas**
   - el usuario no cambia de "home" según permiso; cambia el contenido visible dentro de la Home
   - las variantes deben resolverse en el runtime de snapshot + UI composition

3. **Separación de contratos**
   - `authorizedViews`: qué puede abrir el usuario
   - `startupPolicy`: dónde debe aterrizar
   - `lastWorkspacePath`: continuidad opcional del trabajo reciente

4. **Nexa como constante**
   - Nexa debe seguir siendo la entrada común de la experiencia moderna
   - la parte variable es el contexto, los shortcuts, los KPIs y los CTA principales

5. **Escalabilidad futura**
   - el diseño debe soportar nuevas superficies o combinaciones de roles sin tener que rehacer la lógica de startup
   - si se crea persistencia adicional para startup policy, debe poder mapearse por key semántica y no solo por ruta

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `/home` queda formalizado como startup home universal para perfiles administrativos y mixtos
- [ ] la Home renderiza contenido diferenciado por audiencia sin crear rutas home paralelas
- [ ] HR, Finance y My siguen operando como workspaces especializados con CTA/contexto desde la Home
- [ ] el startup contract deja de depender de precedencias accidentales de `routeGroups`
- [ ] la documentación viva deja explícito el rol de `/home` como entrada universal
- [ ] `TASK-285` queda compatible con la Home universal adaptativa

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- login manual con superadmin, HR puro, finance puro, collaborator y client role
- verificación visual/manual de `/home` y de los CTA principales hacia workspaces especializados

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] arquitectura y documentación funcional de Home quedaron sincronizadas con la implementación real

## Follow-ups

- evaluar si `startupPolicy` debe persistirse como key semántica además de la ruta efectiva
- evaluar una capa explícita de `lastWorkspacePath` o continuidad de sesión reciente
- reconciliar la implementación final con cualquier expansión pendiente de `TASK-285`

## Open Questions

- ¿la Home universal debe adaptarse solo por permisos/rol o también por signals recientes de uso?
- ¿el colaborador puro debe entrar siempre a `/my` o también converger a `/home` en una fase posterior?
