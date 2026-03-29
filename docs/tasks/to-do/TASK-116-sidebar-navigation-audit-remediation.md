# TASK-116 — Sidebar Navigation Audit & Remediation

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Bajo-Medio`
- Status real: `Auditoría completada, implementación pendiente`
- Rank: `43`
- Domain: `layout / ux`
- Assigned to: **Claude**

## Summary

Auditoría UX + UX Writing del sidebar vertical (`VerticalMenu.tsx`). Identifica 10 hallazgos de arquitectura de información y 10 problemas de copy. Define 3 prioridades de remediación con acciones concretas.

## Why This Task Exists

El sidebar creció orgánicamente con cada módulo nuevo. Un usuario interno maxed-out (admin + hr + finance + my) ve ~38 items sin jerarquía clara. Los problemas principales:

- **Cognitive overload**: Gestión (9 items flat) + Admin (9 items) + Mi Ficha (7 items) no caben en un viewport sin scroll
- **Spanglish**: "Cloud & Integrations", "Ops Health", "Command Center" mezclan inglés en un sidebar español
- **Inconsistencia estructural**: Gestión es section flat, Finanzas es submenu, Mi Ficha es section flat — sin regla documentada
- **`/home` (Nexa) invisible**: no tiene entrada en el sidebar; el usuario no puede volver a Nexa después de navegar
- **Duplicidades**: "Equipo" y "Spaces" aparecen en 2 secciones con significado distinto pero mismo label

## Architecture Alignment

- `src/components/layout/vertical/VerticalMenu.tsx` — archivo principal
- `src/config/greenhouse-nomenclature.ts` — labels y subtitles centralizados
- `docs/architecture/Greenhouse_Nomenclatura_Portal_v3.md` — nomenclatura canónica
- `docs/ui/GREENHOUSE_UI_ORCHESTRATION_V1.md` — orquestación de surfaces

## Dependencies & Impact

### Depends on

- Nada — el sidebar es self-contained

### Impacts to

- `src/components/layout/vertical/VerticalMenu.tsx`
- `src/config/greenhouse-nomenclature.ts`
- Percepción general del portal (el sidebar es lo primero que ve el usuario)
- TASK-115 Slice C (Nexa floating) — si se implementa el FAB, la urgencia de R2 baja

### Files owned

- `src/components/layout/vertical/VerticalMenu.tsx`
- `src/config/greenhouse-nomenclature.ts` (labels/subtitles del sidebar)
- `docs/tasks/to-do/TASK-116-sidebar-navigation-audit-remediation.md`

## Auditoría: Hallazgos de arquitectura de información

### H1 — Cognitive overload para internal user maxed-out (Alta)

Un usuario con todos los roles ve ~38 items. El sidebar no cabe en viewport estándar (1080px) sin scroll. Gestión (9 flat) y Admin (9 en submenu) son los peores ofensores.

### H2 — Inconsistencia section vs submenu (Media)

| Sección | Patrón actual | Items |
|---------|--------------|-------|
| Gestión | Section flat | 9 |
| Equipo | Section flat | 2-6 |
| Finanzas | Submenu colapsable | 6 |
| Admin Center | Submenu colapsable | 9 |
| Mi Ficha | Section flat | 7 |

No hay regla documentada de cuándo usar cada patrón.

### H3 — `/home` (Nexa) ausente del sidebar (Media)

La página principal del portal no tiene entrada en el sidebar. El usuario que navega a otra ruta no puede volver a Nexa sin escribir la URL manualmente.

### H4 — Redundancia "Equipo" en Gestión vs section Equipo (Media)

- Gestión > **Equipo** — Capacidad y dedicación (`/agency/team`)
- Section **Equipo** > Personas — Vista operativa (`/people`)

"Equipo" aparece 2 veces, diferente propósito, mismo label en collapsed mode.

### H5 — Redundancia "Spaces" en Gestión vs Admin (Media)

- Gestión > **Spaces** — Clientes y salud operativa (`/agency/spaces`)
- Admin > **Spaces** — Spaces, acceso y gobierno (`/admin/tenants`)

Mismo label, diferente ruta y propósito.

### H6 — Admin Center landing redundante como hijo (Baja)

El submenu "Admin Center" tiene como primer hijo "Admin Center → `/admin`". El parent del submenu ya dice "Admin Center" y debería navegar a `/admin` directamente.

### H7 — "Nómina Proyectada" hardcodeada (Baja)

Label y subtitle están inline en VerticalMenu.tsx en vez de usar `GH_HR_NAV`. Rompe el patrón de nomenclatura centralizada.

### H8 — Section header "MI FICHA" en ALL CAPS (Baja)

Única section header en uppercase. Las demás usan sentence case.

### H9 — Icon reuse `tabler-users-group` (Baja)

Gestión > Equipo y section Equipo > Personas usan `tabler-users-group`. En collapsed mode son indistinguibles.

### H10 — Sin separación "operación" vs "infraestructura" en Gestión (Media)

Gestión mezcla surfaces de negocio (Agencia, Spaces, Economía, Delivery) con surfaces de plataforma (Operaciones, Organizaciones, Servicios). Un PM y un SRE ven la misma lista plana.

## Auditoría: Hallazgos de UX Writing

### C1 — Spanglish: postura táctica (Info — decisión de diseño)

**El equipo Efeonce habla en Spanglish técnico de forma natural.** Los términos ingleses que acortan labels o son jerga universal de industria se mantienen intencionalmente. Solo se corrige cuando la mezcla es accidental o el resultado es opaco.

**Mantener (Spanglish táctico válido):**
- "Cloud & Integrations" — nombre de la surface, universalmente entendido
- "Ops Health" — conciso, distinguible
- "Command Center" — más corto que "Centro de mando operativo"
- "Delivery" — nadie dice "Entregas" internamente
- "ICO, sprints y producción" — ICO y sprints son la jerga real

**Corregir (mezcla accidental, no táctica):**
- "Salud del platform" → "Platform health" o "Salud de la plataforma" — mezcla a medias
- "Outbox, proyecciones y freshness del serving" → demasiado técnico como subtitle, no por el inglés sino por la opacidad. Algo como "Events, proyecciones y freshness" es igual de corto y más claro

### C2 — Subtitle de Ops Health demasiado opaco (Media)

"Outbox, proyecciones y freshness del serving" — incluso para el equipo técnico, "outbox" y "serving" son implementación interna. El subtitle debería usar jerga que el equipo ya comparte, no nombres de tablas PG.

### C3 — Redundancia label/subtitle "Proyectos" (Media)

"Proyectos / Proyectos activos" — el subtitle repite el label con un adjetivo.

### C5 — Redundancia label/subtitle "Conciliación" (Media)

"Conciliación / Conciliación bancaria" — mismo patrón redundante.

### C6 — Tono inconsistente en subtitles de Gestión (Media)

Mezcla "Command Center" (inglés), "P&L y rentabilidad" (finance), "ICO, sprints y producción" (jerga). No hay registro uniforme.

### C7 — "MI FICHA" en uppercase (Baja)

Rompe sentence case. Debería ser "Mi ficha".

### C8 — Subtitles de Mi Ficha escuetos (Baja)

"Liquidaciones", "Vacaciones y días" — podrían dar un poco más de contexto.

### C9 — Tildes faltantes en nomenclature.ts (Baja)

"Operacion" sin tilde en algunos valores. Verificar todo el archivo.

### C10 — "Herramientas IA" consistente (Info)

Label y subtitle son consistentes. No hay acción. Documentar como OK.

## Propuesta de copy corregido

### Admin nav

| Hoy | Label propuesto | Subtitle propuesto |
|-----|----------------|--------------------|
| Cloud & Integrations / Syncs, webhooks, auth y runtime operativo | Cloud & Integrations (mantener) | Syncs, credenciales y health de conectores |
| Ops Health / Outbox, proyecciones y freshness del serving | Ops Health (mantener) | Events, proyecciones y freshness |
| Admin Center / Gobernanza institucional del portal | Admin Center (mantener) | Gobierno y configuración del portal |

### Gestión nav

| Hoy subtitle | Subtitle propuesto |
|--------------|--------------------|
| Command Center | Command Center (mantener — Spanglish táctico) |
| ICO, sprints y producción | ICO, sprints y producción (mantener — jerga real) |
| Salud del platform | Platform health (completar hacia un lado u otro) |

### Redundancias

| Hoy | Label / Subtitle propuesto |
|-----|---------------------------|
| Proyectos / Proyectos activos | Proyectos / Seguimiento y estado |
| Conciliación / Conciliación bancaria | Conciliación / Cruces bancarios y ajustes |

### Desambiguación de duplicados

| Hoy | Propuesta |
|-----|-----------|
| Gestión > Equipo | **Capacidad** — Carga y dedicación del equipo |
| Gestión > Spaces | Spaces (sin cambio — contexto operativo es claro) |
| Admin > Spaces | **Gobierno de Spaces** — Acceso y configuración del portal |

### Section headers y Mi Ficha

| Hoy | Propuesta |
|-----|-----------|
| MI FICHA | Mi ficha |
| Mi Nómina / Liquidaciones | Mi Nómina / Liquidaciones y compensación |
| Mis Permisos / Vacaciones y días | Mis Permisos / Saldos y solicitudes |
| Mi Desempeño / Métricas ICO | Mi Desempeño / OTD, productividad y entregas |

## Propuestas estructurales

### R1 — Convertir Gestión en submenu colapsable

9 items flat es el principal driver de overload. Como submenu colapsable, libera ~200px verticales. El parent "Gestión" navega a `/agency` (landing). Trade-off: +1 click, pero compensa con sidebar legible.

### R2 — Agregar `/home` como primer item del sidebar (internal user)

```
🌟 Inicio          → /home       (icon: tabler-sparkles)
📊 Torre de control → /dashboard  (icon: tabler-layout-dashboard)
```

Diferencia clara entre Nexa (Inicio) y el dashboard operativo (Torre de control). Si TASK-115 Slice C (Nexa floating) se implementa primero, esta urgencia baja.

### R3 — Eliminar hijo "Admin Center" redundante dentro del submenu

El parent del submenu ya dice "Admin Center" y es clickable → `/admin`. El hijo duplicado es ruido. Reduce submenu de 9 a 8 items.

### R4 — Convertir Mi Ficha en submenu colapsable

7 items flat al final del sidebar empujan todo hacia abajo. Como submenu colapsable, queda accesible sin expandir siempre. El parent "Mi ficha" navega a `/my`.

### R5 — Documentar regla de section vs submenu

| Patrón | Cuándo usar |
|--------|-------------|
| Flat item | 1 item sin hijos |
| Section | 2-4 items del mismo dominio, siempre visibles |
| Submenu colapsable | 5+ items, o items que no son flujo principal diario |

### R6 — Icon differentiation fix

| Hoy (ambos `tabler-users-group`) | Propuesta |
|----------------------------------|-----------|
| Gestión > Equipo (→ Capacidad) | `tabler-chart-dots` o `tabler-gauge` |
| Equipo section > Personas | `tabler-users-group` (mantener) |

## Scope

### Slice 1 — Copy fixes (sin cambio estructural)

- Corregir mezclas accidentales: "Salud del platform" → "Platform health"
- Reducir opacidad: "Outbox, proyecciones y freshness del serving" → "Events, proyecciones y freshness"
- Normalizar "MI FICHA" → "Mi ficha"
- Corregir subtitles redundantes (Proyectos, Conciliación)
- Centralizar "Nómina Proyectada" en `GH_HR_NAV`
- Corregir tildes faltantes
- Desambiguar labels duplicados (Equipo → Capacidad, Admin Spaces → Gobierno de Spaces)

**Esfuerzo:** ~30 min. Sin riesgo de regresión.

### Slice 2 — Cambios estructurales

- Agregar `/home` como "Inicio" con `tabler-sparkles`
- Convertir Gestión a submenu colapsable
- Convertir Mi Ficha a submenu colapsable
- Eliminar hijo "Admin Center" redundante
- Fix icon duplicado

**Esfuerzo:** ~1 hora. Riesgo bajo (solo cambia estructura del menu array, no rutas).

### Slice 3 — Documentación y reglas

- Documentar regla section/submenu
- Documentar regla de agrupación interna para submenus >6 items
- Agregar a CLAUDE.md o UI orchestration doc

**Esfuerzo:** ~20 min.

## Out of Scope

- Cambios de rutas o páginas (solo sidebar navigation)
- Nuevo diseño visual del sidebar (colores, ancho, tipografía)
- Sidebar para mobile/responsive (funciona con breakpoint detection existente)
- Capability registry changes

## Acceptance Criteria

### Slice 1
- [ ] Spanglish táctico validado: mezclas accidentales corregidas, jerga intencional mantenida
- [ ] Todos los labels centralizados en `greenhouse-nomenclature.ts`
- [ ] Section headers en sentence case
- [ ] Subtitles no redundantes con sus labels
- [ ] Labels duplicados desambiguados

### Slice 2
- [ ] `/home` accesible desde sidebar como "Inicio"
- [ ] Gestión y Mi Ficha son submenus colapsables
- [ ] Hijo "Admin Center" redundante eliminado
- [ ] Icons no se repiten en items visibles simultáneamente

### Slice 3
- [ ] Regla section/submenu documentada
- [ ] Regla de agrupación interna documentada

## Verification

- Visual: expandir/colapsar cada submenu, verificar en collapsed mode
- `pnpm build` pasa sin errores
- Ningún label hardcodeado en VerticalMenu.tsx (todos desde nomenclature)
