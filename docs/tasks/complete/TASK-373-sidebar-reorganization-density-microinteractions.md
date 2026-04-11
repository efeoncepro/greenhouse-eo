# TASK-373 — Sidebar Reorganization: Density, Icons & Microinteractions

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Pendiente`
- Rank: `TBD`
- Domain: `ui`
- Blocked by: `none`
- Branch: `task/TASK-373-sidebar-reorganization`
- Legacy ID: —
- GitHub Issue: —

## Summary

Reorganizar el sidebar de Greenhouse para resolver 4 violaciones de densidad (secciones con >7 items flat), 6 iconos duplicados, y 3 gaps de microinteracciones (reduced-motion, hover transition, active transition). El sidebar pasa de ~40 items visibles simultaneamente a ~18 para un admin, sin cambiar rutas, permisos ni vistas.

## Why This Task Exists

La auditoria completa del sidebar (documentada en `GREENHOUSE_SIDEBAR_ARCHITECTURE_V1.md`) revela que un `efeonce_admin` ve hasta 64 items con ~40 visibles simultaneamente. Las secciones Gestion (11 items flat), Equipo (10 items flat), Finanzas > Flujo (10 items) y Admin > Gobierno (11 items) exceden el limite de 7 items flat que el mismo documento establece como regla. Ademas, `tabler-users-group` se usa en 4 contextos distintos (confuso), y el sidebar no tiene `prefers-reduced-motion` ni transiciones de hover/active (se siente inerte).

## Goal

- Reducir la densidad visual del sidebar en un ~55% para admin (de ~40 a ~18 items visibles)
- Agrupar items en collapsibles logicos dentro de Gestion, Equipo, Finanzas > Flujo, y Admin > Gobierno
- Diferenciar los 6 iconos duplicados con iconos unicos por concepto
- Agregar `prefers-reduced-motion` al sidebar CSS
- Agregar transiciones de hover (150ms) y active state (200ms)
- No cambiar ninguna ruta, view code, ni permiso — solo reorganizacion visual

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_SIDEBAR_ARCHITECTURE_V1.md` — spec baseline con inventario completo, hallazgos, y reglas
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` — sistema de permisos por vista

## Normative Docs

- `GREENHOUSE_SIDEBAR_ARCHITECTURE_V1.md` §6 (reglas de estructura), §7 (convencion de iconos), §9 (hallazgos)
- `src/components/layout/vertical/VerticalMenu.tsx` — archivo fuente del sidebar
- `src/styles/greenhouse-sidebar.css` — estilos custom del sidebar

## Dependencies & Impact

### Depends on

- Ninguna — todas las rutas, permisos y vistas ya existen.

### Blocks / Impacts

- Todos los usuarios internos del portal (cambio visual del sidebar)
- El portal cliente NO se ve afectado (su menu es independiente)
- `GREENHOUSE_SIDEBAR_ARCHITECTURE_V1.md` debe actualizarse al cerrar

### Files owned

- `src/components/layout/vertical/VerticalMenu.tsx`
- `src/styles/greenhouse-sidebar.css`
- `src/config/greenhouse-nomenclature.ts` (nuevos labels de submenus en `GH_*_NAV`)
- `docs/architecture/GREENHOUSE_SIDEBAR_ARCHITECTURE_V1.md`
- `docs/tasks/to-do/TASK-373-sidebar-reorganization-density-microinteractions.md`

## Current Repo State

### Already exists

- `VerticalMenu.tsx` con 67 rutas, 54 view codes, 5 variantes por rol
- `greenhouse-sidebar.css` con hover, focus-visible, active states (sin transitions)
- `GREENHOUSE_SIDEBAR_ARCHITECTURE_V1.md` con inventario completo y hallazgos
- Sistema de permisos de 3 capas funcionando (`routeGroups`, `authorizedViews`, `canSeeView`)
- Collapsibles ya existen en Finanzas y Admin Center (patron reutilizable)
- Chevron visibility fix ya aplicado (full white)

### Gap

- Gestion: 8 items flat (excede limite de 7)
- Equipo (full HR): 10 items flat (excede limite)
- Finanzas > Flujo: 10 items (excede limite)
- Admin > Gobierno: 11 items (excede limite)
- `tabler-users-group` duplicado en 4 contextos
- `tabler-hierarchy-2` duplicado en 2 contextos
- No hay `prefers-reduced-motion` en el sidebar
- No hay transition en hover/active states del sidebar

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Microinteracciones del sidebar CSS

Modificar `src/styles/greenhouse-sidebar.css`:

1. **`prefers-reduced-motion`:** Agregar media query que deshabilite transitions del sidebar cuando el usuario lo prefiere.
   ```css
   @media (prefers-reduced-motion: reduce) {
     .ts-vertical-nav-root,
     .ts-vertical-nav-root * {
       transition-duration: 0.01ms !important;
     }
   }
   ```

2. **Hover transition:** Agregar `transition: background-color 150ms ease-out` a `.ts-menu-button` para que el hover no sea abrupto.

3. **Active state transition:** Agregar `transition: background-color 200ms ease-out, color 200ms ease-out` para suavizar el cambio al navegar.

### Slice 2 — Reorganizar Gestion (de 11 flat a 3 flat + 2 collapsibles)

Modificar `VerticalMenu.tsx` seccion Gestion:

**Quedan flat (3 items — los mas usados):**
- Agencia (workspace)
- Spaces
- Economia

**Nuevo collapsible "Equipo y talento" (3 items):**
- Capacidad (renombrado de "Equipo" en Gestion, icon: `tabler-affiliate`)
- Talento Discovery
- Staff Augmentation

**Nuevo collapsible "Operaciones" (5 items — absorbe Estructura):**
- Delivery
- Campanas
- Organizaciones
- Servicios
- Operaciones

Agregar labels a `GH_AGENCY_NAV` en nomenclature: `teamAndTalent`, `capacity` (renombre).

### Slice 3 — Reorganizar Equipo/HR (de 10 flat a 1 flat + 3 collapsibles)

Modificar `VerticalMenu.tsx` seccion Equipo:

**Renombrar seccion:** "Equipo" → "Personas y HR"

**Queda flat (1 item):**
- Personas (icon: `tabler-address-book` — diferenciado)

**Nuevo collapsible "Nomina" (2 items):**
- Nomina mensual
- Nomina proyectada

**Nuevo collapsible "Equipo y supervision" (3 items):**
- Mi equipo
- Aprobaciones
- Departamentos

**Nuevo collapsible "Organizacion" (3 items):**
- Organigrama (absorbe Jerarquia conceptualmente — Jerarquia se mantiene como ruta pero se documenta como candidate a merge en follow-up)
- Permisos
- Asistencia

**Nota:** Las 5 variantes condicionales se mantienen. El supervisor que solo ve 3-4 items NO ve los collapsibles innecesarios — la logica condicional existente los filtra.

### Slice 4 — Reorganizar Finanzas > Flujo (de 10 a 7 + submenu)

Dentro del collapsible Finanzas, reestructurar Flujo:

**Flujo operativo (7 items — en el limite):**
- Dashboard
- Ventas
- Compras
- Clientes
- Proveedores
- Ingresos (cash-in)
- Egresos (cash-out)

**Nuevo submenu "Tesoreria" (3 items):**
- Banco
- Cuenta corriente accionista
- Posicion de caja

Agregar label `GH_FINANCE_NAV.treasury` a nomenclature.

### Slice 5 — Reorganizar Admin > Gobierno (de 11 a 2 submenus)

Dentro del collapsible Admin Center, reestructurar Gobierno:

**Submenu "Identidad y acceso" (6 items):**
- Admin Center
- Usuarios
- Roles
- Vistas
- Cuentas
- Spaces

**Submenu "Equipo y operaciones" (5 items):**
- Equipo admin
- Talent Review
- Talent Ops
- Lineas de negocio
- Instrumentos de pago

Agregar labels `GH_INTERNAL_NAV.adminIdentityAccess`, `GH_INTERNAL_NAV.adminTeamOps` a nomenclature.

### Slice 6 — Diferenciar iconos duplicados

| Contexto actual | Icono actual | Icono nuevo | Razon |
|----------------|-------------|-------------|-------|
| Gestion > Equipo (agency capacity) | `tabler-users-group` | `tabler-affiliate` | Distingue "capacidad" de "personas" |
| Equipo > Personas (people directory) | `tabler-users-group` | `tabler-address-book` | Directorio, no equipo |
| Equipo > Mi equipo (supervisor) | `tabler-users-group` | `tabler-users-group` | Mantiene — es el mas intuitivo |
| Cliente > Equipo | `tabler-users-group` | `tabler-users` | Mas simple para cliente |
| Gestion > Estructura / Equipo > Jerarquia | `tabler-hierarchy-2` (x2) | Estructura: `tabler-hierarchy-2`, Jerarquia: eliminado (merge con Organigrama) | Elimina duplicacion |
| Finanzas > Inteligencia / Cliente > Analytics | `tabler-chart-dots` (x2) | Aceptable — mismo concepto en 2 portales | Sin cambio |

## Out of Scope

- Cambiar rutas (`href`) de ningun item
- Cambiar view codes o permisos
- Modificar el portal cliente (su menu es independiente y ya esta dentro del limite)
- Fusionar las vistas de Jerarquia y Organigrama en una sola (eso es una task separada de vista, no de sidebar)
- Tocar archivos en `@core/`, `@layout/`, `@menu/`
- Implementar loading/skeleton para el menu (follow-up)
- Implementar pressed state `:active` (follow-up)
- Crear la skill `greenhouse-microinteractions-auditor` (follow-up separado)

## Detailed Spec

### Principio rector

**Solo reorganizacion visual.** El array `menuData` sigue conteniendo los mismos items con los mismos `href`, `viewCode` y condiciones. Lo unico que cambia es:
- Algunos items flat pasan a ser children de un nuevo collapsible parent
- Algunos items se reordenan dentro de su seccion
- Los iconos se diferencian
- El CSS gana transitions y reduced-motion

### Patron de collapsible

Reutilizar el mismo patron que ya existe en Finanzas y Admin Center:
```typescript
{
  label: 'Label del grupo',
  icon: 'tabler-icon',
  children: [
    { label: '...', href: '/...', ... },
    ...
  ].filter(item => canSeeView(...))
}
```

El collapsible solo aparece si tiene al menos 1 child visible despues del filtro.

### Validacion visual

Cada variante de rol debe verificarse:
1. `efeonce_admin` — ve todo reorganizado (~18 items visibles)
2. `hr_payroll` — ve Personas + 3 collapsibles HR
3. `hr_manager` / supervisor — ve solo Mi equipo + Aprobaciones (+ Organigrama condicional)
4. `finance_admin` — ve Finanzas reorganizado
5. `collaborator` — ve Mi Ficha (sin cambios)
6. Cliente — ve portal cliente (sin cambios)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Las 4 secciones que excedian el limite de 7 items ahora cumplen (Gestion, Equipo, Finanzas > Flujo, Admin > Gobierno)
- [ ] Un `efeonce_admin` ve ~18 items visibles sin expandir (antes ~40)
- [ ] Los 6 iconos duplicados estan diferenciados
- [ ] `prefers-reduced-motion` esta implementado en `greenhouse-sidebar.css`
- [ ] Hover tiene transition de 150ms ease-out
- [ ] Active state tiene transition de 200ms ease-out
- [ ] Ninguna ruta cambio
- [ ] Ningun view code cambio
- [ ] Las 5 variantes condicionales de Equipo siguen funcionando correctamente
- [ ] El portal cliente no fue tocado
- [ ] `pnpm build`, `pnpm lint` pasan sin errores
- [ ] `GREENHOUSE_SIDEBAR_ARCHITECTURE_V1.md` actualizado con la nueva estructura

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm build`
- Validacion visual manual con al menos 3 roles: admin, HR, collaborator
- Verificar reduced-motion: activar `prefers-reduced-motion` en DevTools y confirmar que transitions se deshabilitan
- Grep: ninguna ruta cambio (`href` values identicos antes y despues)

## Closing Protocol

- [ ] Actualizar `GREENHOUSE_SIDEBAR_ARCHITECTURE_V1.md` con la estructura reorganizada (secciones §3, §4, §9)
- [ ] Actualizar `Handoff.md`
- [ ] Ejecutar chequeo de impacto cruzado: verificar que TASK-321 (Space 360 polish) y otras tasks UI no asumen la estructura antigua del sidebar

## Follow-ups

- Fusionar vistas Jerarquia + Organigrama en una sola vista con tabs (reduce 1 item mas)
- Implementar loading/skeleton para el sidebar durante carga de sesion
- Implementar pressed state `:active` con feedback visual
- Resolver 3 paginas huerfanas (`/admin/responsibilities`, `/admin/scim-tenant-mappings`, `/agency/capacity`)
- Migrar labels hardcodeados ("Finanzas", "Mi Ficha", etc.) a `GH_*_NAV` en nomenclature (coordinado con TASK-265)
- Crear skill `greenhouse-microinteractions-auditor` para Claude Code

## Open Questions

- El collapsible "Organizacion" bajo HR agrupa Organigrama + Permisos + Asistencia — son conceptos algo distintos. Alternativa: separar Permisos + Asistencia en su propio collapsible "Asistencia y permisos". Evaluar durante implementacion.
- Jerarquia se mantiene como ruta separada en esta task pero se documenta como candidata a merge con Organigrama. Confirmar si el usuario quiere la ruta viva o eliminada.
