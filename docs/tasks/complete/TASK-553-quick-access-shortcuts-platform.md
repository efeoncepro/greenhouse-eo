# TASK-553 — Quick Access Shortcuts Platform

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `none`
- Branch: `task/TASK-553-quick-access-shortcuts-platform`
- Legacy ID: `follow-up de discovery sobre shortcuts estaticos en shell global`
- GitHub Issue: `none`

## Summary

Convertir el dropdown de `Accesos rápidos` del header en una capacidad real de plataforma: catálogo canónico de shortcuts, recomendados dinámicos por acceso, shortcuts pineados persistidos por usuario y un flujo funcional para `Agregar acceso`. El header y Home deben resolver shortcuts desde la misma fuente autorizada.

## Why This Task Exists

Hoy el shell global expone una affordance que parece configurable, pero no lo es:

- `ShortcutsDropdown.tsx` renderiza el botón `+` y el CTA `Agregar acceso`, pero el botón no tiene flujo real.
- `NavbarContent.tsx` vertical y horizontal inyectan arrays hardcodeados de shortcuts.
- Home ya tiene `recommendedShortcuts` dinámicos derivados de acceso/entitlements, pero el header no reutiliza esa foundation.
- No existe persistencia para shortcuts personalizados por usuario/tenant, ni una API canónica para leerlos o mutarlos.

El resultado es drift entre superficies, lógica duplicada de navegación y una UX que promete personalización sin contrato real. Para que esto sea robusto y enterprise, shortcuts visibles deben depender del modelo canónico de acceso (`views` + `entitlements`) y no de arrays locales en cliente.

## Goal

- Reemplazar shortcuts hardcodeados del header por un resolver canónico basado en acceso real.
- Introducir shortcuts personalizados persistidos por usuario/tenant sin romper la capa de recomendados dinámicos.
- Convertir el botón `+` en un flujo real de personalización con validación server-side.
- Reutilizar el mismo contrato/resolver entre Home y el shell global.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`

Reglas obligatorias:

- El dropdown del header no puede decidir visibilidad desde arrays hardcodeados en cliente; debe derivarse de `roleCodes + routeGroups + authorizedViews + entitlements`.
- Esta task debe explicitar y respetar ambos planos del access model:
  - `views` / `authorizedViews` / `view_code` como surface visible
  - `entitlements` / `module + capability + action + scope` como autorización fina
- Home y shell global deben compartir un resolver canónico de shortcuts; no se permite drift entre `recommendedShortcuts` de Home y shortcuts del navbar.
- La personalización debe persistirse server-side y revalidarse en cada lectura contra el access model vigente.
- Si un shortcut deja de ser válido por cambio de permisos o surface, la degradación debe ser limpia: no mostrarlo, no permitir repinearlo y dejar espacio para cleanup.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `project_context.md`
- `Handoff.md`

## Dependencies & Impact

### Depends on

- `src/components/layout/shared/ShortcutsDropdown.tsx`
- `src/components/layout/vertical/NavbarContent.tsx`
- `src/components/layout/horizontal/NavbarContent.tsx`
- `src/lib/home/build-home-entitlements-context.ts`
- `src/lib/home/get-home-snapshot.ts`
- `src/app/api/home/snapshot/route.ts`
- `src/views/greenhouse/home/components/RecommendedShortcuts.tsx`
- `src/types/home.ts`
- `src/lib/entitlements/runtime.ts`
- `src/config/entitlements-catalog.ts`
- `src/lib/admin/view-access-catalog.ts`

### Blocks / Impacts

- shell global / navbar del portal
- Home / Pulse y cualquier surface que consuma shortcuts adaptativos
- consistencia entre `recommendedShortcuts`, startup policy y surfaces visibles
- futura personalización de navegación por usuario

### Files owned

- `src/components/layout/shared/ShortcutsDropdown.tsx`
- `src/components/layout/vertical/NavbarContent.tsx`
- `src/components/layout/horizontal/NavbarContent.tsx`
- `src/lib/home/build-home-entitlements-context.ts`
- `src/lib/home/get-home-snapshot.ts`
- `src/app/api/home/snapshot/route.ts`
- `src/views/greenhouse/home/components/RecommendedShortcuts.tsx`
- `src/types/home.ts`
- `src/lib/admin/view-access-catalog.ts`
- `src/app/api/[me-shortcuts-path-a-validar]/[route]`
- `migrations/[quick-access-shortcuts-foundation].sql`

## Current Repo State

### Already exists

- `ShortcutsDropdown.tsx` ya renderiza la UI base del popover con el título `Accesos rápidos`.
- `NavbarContent.tsx` vertical y horizontal consumen `ShortcutsDropdown`, pero le pasan arrays hardcodeados.
- `buildHomeEntitlementsContext()` ya resuelve `recommendedShortcuts` y `accessContext` para Home.
- `RecommendedShortcuts.tsx` ya renderiza shortcuts dinámicos en Home.
- La sesión y el runtime ya exponen señales como `roleCodes`, `routeGroups`, `authorizedViews` y `portalHomePath`.
- Existe catálogo de views/admin access en `src/lib/admin/view-access-catalog.ts`.

### Gap

- el header no reutiliza la foundation dinámica de Home
- el botón `+` no tiene flujo real
- no existe persistencia de shortcuts personalizados por usuario
- no existe una API canónica para listar/pinear/reordenar shortcuts del usuario actual
- no existe una capa canónica que combine `recommended + available + pinned`

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

### Slice 1 — Shortcut catalog + canonical resolver

- Formalizar un catálogo canónico de shortcuts reutilizable entre Home y header.
- Extender el contrato de `src/types/home.ts` para distinguir `recommended`, `available` y `pinned`.
- Crear un resolver compartido que combine shortcuts recomendados por audience/acceso, shortcuts disponibles por visibilidad efectiva y shortcuts pineados por usuario.
- Eliminar el hardcode actual de shortcuts en ambos `NavbarContent`.

### Slice 2 — Persistence + API for pinned shortcuts

- Crear persistencia para shortcuts pineados por usuario y tenant/space.
- Exponer endpoints canónicos del usuario actual para listar, pinear/despinear y reordenar shortcuts.
- Validar server-side que un shortcut siga siendo visible/autorizado antes de persistirlo.

### Slice 3 — Header dropdown activation

- Conectar `ShortcutsDropdown` a datos dinámicos reales.
- Convertir el botón `+` en un selector funcional de shortcuts disponibles.
- Mostrar sólo shortcuts elegibles para ese usuario, excluyendo los ya pineados o no autorizados.
- Degradar correctamente cuando el usuario no tenga personalizados todavía.

### Slice 4 — Home + shell convergence + cleanup

- Hacer que Home y header compartan el mismo resolver canónico.
- Remover la lógica legacy hardcodeada del shell.
- Definir cleanup/invalidation para shortcuts que queden obsoletos tras cambios de permisos.
- Documentar el contrato de plataforma y la estrategia de rollout.

## Out of Scope

- rediseñar por completo el header global o el layout shell
- construir un sistema genérico de favoritos para cualquier entidad del producto
- rehacer startup policy o el modelo completo de entitlements
- sincronización offline o cross-device avanzada fuera del mismo usuario/tenant
- analytics de adopción avanzados antes de cerrar la capa base de persistencia

## Detailed Spec

La feature debe operar con 3 capas explícitas:

1. **Recommended shortcuts**
   - derivadas por audience, módulos activos, startup policy o acceso efectivo
   - no persistidas por usuario

2. **Available shortcuts**
   - catálogo filtrado por acceso efectivo del usuario
   - fuente para el flujo `Agregar acceso`

3. **Pinned shortcuts**
   - persistidas por usuario/tenant
   - ordenables y revalidadas server-side

La resolución de acceso debe combinar, como mínimo:

- `routeGroups`
- `authorizedViews`
- módulos/entitlements visibles
- catálogo canónico de rutas/shortcuts

La persistencia debería preferir una tabla dedicada en PostgreSQL dentro del dominio canónico de identity/access, con al menos:

- `user_id`
- `space_id` o dimensión tenant equivalente
- `shortcut_key`
- `display_order`
- timestamps de auditoría

El flujo UX debe cumplir:

- el `+` sólo aparece como acción activa si existen shortcuts elegibles para agregar
- si no existen elegibles, debe explicarse; no dejar un CTA muerto
- el dropdown sigue siendo útil aun si falla la persistencia: fallback mínimo = `recommendedShortcuts`
- la interacción debe respetar las reglas de popovers/floating/navigation del UI platform

Los endpoints deben ser del usuario actual, no admin APIs genéricas. La seguridad es obligatoria:

- el cliente nunca decide lo autorizado
- el servidor revalida pin/unpin/reorder
- shortcuts inválidos por permisos o surface drift se omiten y quedan aptos para cleanup

## Acceptance Criteria

- [ ] el header ya no usa arrays hardcodeados de shortcuts en `NavbarContent`
- [ ] `ShortcutsDropdown` consume datos dinámicos basados en acceso real
- [ ] el botón `+` abre un flujo real de agregar shortcut y deja de ser una affordance muerta
- [ ] existen shortcuts pineados persistidos server-side por usuario/tenant
- [ ] Home y header comparten el mismo resolver canónico de shortcuts
- [ ] shortcuts inválidos por cambio de permisos no se muestran ni pueden persistirse

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit`
- `pnpm test`
- validación manual desktop/mobile del dropdown de shortcuts
- validación manual con al menos 2 perfiles (`efeonce_admin` y un perfil acotado tipo finance/collaborator)

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] la documentacion de acceso/navegacion deja explícita la distinción `views` vs `entitlements`

## Follow-ups

- analytics de adopción/ranking de shortcuts
- presets de shortcuts administrables desde Admin Center
- extensión del mismo contrato a otras superficies adaptativas del portal

## Open Questions

- ¿La persistencia debe cerrar sobre `user_id + space_id` o una dimensión tenant distinta?
- ¿El catálogo canónico de shortcuts debe derivar de `view-access-catalog` o vivir en un registry propio con bridge a `view_code`?
- ¿Conviene gatear el rollout con feature flag hasta validar perfiles de cliente reales?
