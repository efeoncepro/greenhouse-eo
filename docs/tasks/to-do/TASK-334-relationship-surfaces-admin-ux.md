# TASK-334 — Superficies relacionales y entry points de administración

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
- Blocked by: `TASK-333`
- Branch: `task/TASK-334-relationship-surfaces-admin-ux`
- Legacy ID: `follow-on de TASK-332 y TASK-333`
- GitHub Issue: `none`

## Delta 2026-04-11

- TASK-313 completada — modifico `MyProfileView.tsx` y `GreenhouseAdminUserDetail.tsx` con nuevos tabs y cards (SkillsCertificationsTab, ProfessionalLinksCard, AboutMeCard); la estructura de tabs del perfil ya no es la misma que cuando se creo esta task
- Impacto: el Slice 1 (superficies personales) debe considerar la nueva layout de tabs; cualquier reestructuracion de `Mi Perfil` debe preservar o integrar los componentes profesionales recien agregados

## Summary

Rediseñar las surfaces que muestran o administran relaciones humanas para consumir la semántica compartida del portal. La task aterriza esa separación en `Mi Perfil`, `Mi organización`, `People`, `Mi equipo` y entry points administrativos hacia `Jerarquía`, `Departamentos`, lanes de assignments y `Staff Augmentation`, evitando que la lógica viva solo en una tab local o en labels ambiguos como `Colegas`.

## Why This Task Exists

La necesidad ya no es “mejorar una tab”. El producto necesita que estas relaciones vivan en varias surfaces y generen sinergia entre módulos:

- una persona debe entender su estructura, sus equipos operativos y su colaboración externa
- un líder o admin debe poder saltar desde una surface de lectura a la surface correcta de administración
- `Mi equipo` no puede significar una cosa en HR, otra en profile y otra en people

Si esto se resuelve solo en `MyProfileView`, la semántica quedará hardcodeada en componentes aislados y volverá a romperse cuando otro módulo necesite la misma relación.

## Goal

- Hacer visible la separación entre estructura, equipos operativos y capacidad extendida en surfaces humanas clave
- Agregar entry points claros hacia las superficies de administración correspondientes
- Eliminar labels ambiguos o locales que hoy ocultan semántica distinta detrás de la misma palabra

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_PERSON_COMPLETE_360_V1.md`
- `docs/architecture/GREENHOUSE_PORTAL_VIEWS_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`

Reglas obligatorias:

- Ninguna surface UI debe recalcular la semántica relacional por su cuenta; debe consumir readers compartidos
- Reutilizar nomenclatura y copy shared; no hardcodear labels divergentes por pantalla
- Los entry points administrativos deben apuntar a módulos reales ya existentes antes de abrir mutaciones nuevas
- `capacidad extendida` debe integrarse como colaboración operativa y enlazar con la lane Staff Augmentation, no como nodo estructural
- `Mi Perfil` no es el único consumer; la experiencia debe aterrizar también en People, workspaces y directorios internos

## Normative Docs

- `docs/documentation/hr/jerarquia-reporte-supervisoria.md`
- `docs/tasks/to-do/TASK-331-hierarchy-view-ux-redesign.md`

## Dependencies & Impact

### Depends on

- `TASK-332`
- `TASK-333`
- `src/views/greenhouse/my/MyProfileView.tsx`
- `src/views/greenhouse/my/my-profile/tabs/TeamsTab.tsx`
- `src/views/greenhouse/my/my-profile/tabs/ConnectionsTab.tsx`
- `src/views/greenhouse/my/MyOrganizationView.tsx`
- `src/views/greenhouse/hr-core/SupervisorWorkspaceView.tsx`
- `src/views/greenhouse/people/PersonTabs.tsx`
- `src/views/greenhouse/hr-core/HrOrgChartView.tsx`
- `src/config/greenhouse-nomenclature.ts`
- `src/components/layout/vertical/VerticalMenu.tsx`

### Blocks / Impacts

- `/my/profile`
- `/my/organization`
- `/people`
- `/hr/team`
- `/hr/org-chart`
- navegación y copy compartida
- posible coordinación con `TASK-313` y otros follow-ons que ya tocan `/my/profile`

### Files owned

- `src/views/greenhouse/my/MyProfileView.tsx`
- `src/views/greenhouse/my/my-profile/tabs/TeamsTab.tsx`
- `src/views/greenhouse/my/my-profile/tabs/ConnectionsTab.tsx`
- `src/views/greenhouse/my/MyOrganizationView.tsx`
- `src/views/greenhouse/hr-core/SupervisorWorkspaceView.tsx`
- `src/views/greenhouse/people/PersonTabs.tsx`
- `src/views/greenhouse/hr-core/HrOrgChartView.tsx`
- `src/config/greenhouse-nomenclature.ts`
- `src/components/layout/vertical/VerticalMenu.tsx`

## Current Repo State

### Already exists

- `Mi Perfil` ya tiene shell enterprise y tabs, pero hoy mezcla:
  - `assignments` como `Equipos`
  - directorio org como `Colegas`
- `Mi organización` ya muestra un directorio org-wide
- `Mi equipo` ya existe como workspace supervisor
- `Org Chart`, `Jerarquía` y `Departamentos` ya existen como surfaces HR
- `Staff Augmentation` ya existe como módulo operativo independiente

### Gap

- Las surfaces no comparten una misma lectura relacional
- No hay entry points claros para pasar de una surface humana a la lane administrativa correcta
- `Equipos`, `Colegas` y `Mi equipo` siguen significando cosas distintas según la pantalla
- La capacidad extendida no está integrada como colaboración visible y administrable de forma consistente

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

### Slice 1 — Superficies personales y de directorio

- Reestructurar `Mi Perfil` para que no reduzca todo a `Equipos` y `Colegas`
- Reestructurar `Mi organización` para diferenciar directorio org, cercanía estructural y colaboración operativa cuando aplique
- Alinear labels y CTAs con la semántica de `TASK-332`

### Slice 2 — Workspaces y detail views con entry points administrativos

- Aterrizar la nueva lectura en `People` y `Mi equipo`
- Agregar entry points claros hacia:
  - `HR > Jerarquía`
  - `HR > Departamentos`
  - lanes de assignments / roster operativo existentes
  - `Agency > Staff Augmentation`
- Asegurar que la administración viva en surfaces especializadas y no escondida dentro del profile

### Slice 3 — Navegación, nomenclatura y coherencia cross-module

- Unificar labels relacionales en `greenhouse-nomenclature`
- Revisar navegación o accesos rápidos donde haga falta descubrir mejor las surfaces administrativas
- Ajustar `Org Chart` y otras surfaces lectoras si necesitan enlaces o metadata contextual para no quedar aisladas

## Out of Scope

- Crear un staffing engine nuevo o modificar `TASK-157`
- Reabrir las mutaciones base de jerarquía/departamentos
- Rediseñar por completo `/hr/hierarchy` fuera del alcance de `TASK-331`
- Crear un módulo nuevo de colaboración externa separado de `Staff Augmentation`

## Detailed Spec

La experiencia final debe permitir al menos estos recorridos:

- persona → entender su lugar estructural
- persona → ver con qué equipos/cuentas trabaja
- persona → ver con qué capacidad extendida externa colabora
- líder/admin → saltar desde una surface de lectura al módulo correcto de administración

La UI no debe resolver esto como un único grid de `colegas` ni como un único card de `equipo`.

## Acceptance Criteria

- [ ] `Mi Perfil` ya no mezcla estructura, equipos operativos y red humana bajo labels ambiguos
- [ ] `Mi organización`, `People` y `Mi equipo` consumen la semántica relacional compartida
- [ ] Existen entry points visibles hacia las surfaces administrativas correctas
- [ ] La capacidad extendida queda visible como colaboración operativa y enlazada a su lane administrativa real
- [ ] Labels y copy compartidos quedan unificados en la capa de nomenclatura

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- Validación manual en:
  - `/my/profile`
  - `/my/organization`
  - `/people`
  - `/hr/team`
  - `/hr/org-chart`

## Closing Protocol

- [ ] Actualizar documentación funcional si cambia el comportamiento visible de profile o workspaces
- [ ] Revisar colisión con tasks activas que ya toquen `/my/profile`

## Follow-ups

- Si aparece una necesidad real de administración operativa no cubierta por los módulos existentes, abrir una task separada en vez de mezclarla aquí

## Open Questions

- ¿Conviene que `Mi Perfil` tenga una tab específica de `Estructura` o basta con mover esa lectura al encabezado/resumen?
- ¿Qué parte de la red humana debe ser visible a perfiles no-admin sin exponer información estructural sensible?
