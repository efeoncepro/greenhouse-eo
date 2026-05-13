# TASK-827 Slice 6 — Audit Grep Canonical (legacy branching)

> **Generado:** 2026-05-13 durante Slice 6 implementación
> **Pattern fuente:** spec V1 §Slice 6 + greenhouse-backend audit canonical

## Grep ejecutados

```bash
rg -n "tenantType === 'client'" src/views/ src/components/
rg -n "businessLines\.includes" src/views/ src/components/
rg -n "tenant_capabilities\." src/views/ src/components/
rg -n "session\.user\.businessLines|session\?.user\?.businessLines" src/views/ src/components/
rg -n "session\.user\.serviceModules|session\?.user\?.serviceModules" src/views/ src/components/
rg -n "canSeeView\('cliente\." src/
```

## Resultados (2026-05-13)

### Callsites de `tenantType === 'client'` en surfaces UI

**0 matches** en `src/views/` ni `src/components/`. Pattern NO se usa en branching legacy
del client portal. ✓

### Callsites de `businessLines.includes`

**1 match** legítimo:

- `src/components/agency/SpaceFilters.tsx:54` — `s.businessLines.includes(sl)`
  Branching legacy en SpaceFilters por business_line del SPACE (no del session).
  Out-of-scope TASK-827 (es agency-side, no client-side composition).

### Callsites de `tenant_capabilities.*`

**0 matches** en surfaces UI. ✓

### Callsites de `session.user.businessLines` + `session.user.serviceModules`

**2 callsites** (mismo archivo, líneas 110-111):

- `src/components/layout/vertical/VerticalMenu.tsx:110-111` — `resolveCapabilityModules({businessLines, serviceModules})`
  Llamada legacy a `resolveCapabilityModules` que mapea legacy session fields a
  capability modules. **D2 decisión:** Opción B — preservado en TASK-827, migración
  vive en TASK derivada V1.1 `capability-modules-resolver-migration`.

  Marcador inline agregado en Slice 6:
  ```ts
  // TASK-827 D2 — capabilityModules legacy preservado. Migración al resolver
  // canónico (TASK-825) vive en TASK derivada V1.1
  // client-portal-allowed: legacy business_line branching pre TASK-827 V1.1 migration
  ```

### Callsites de `canSeeView('cliente.*'`

**10 callsites** en `VerticalMenu.tsx` (líneas 619-655):

- Líneas 619-625 — Primary client nav filter (`cliente.pulse`, `cliente.proyectos`,
  `cliente.ciclos`, `cliente.equipo`, `cliente.revisiones`, `cliente.analytics`,
  `cliente.campanas`)
- Línea 626 — Capability modules section gate (`cliente.modulos`)
- Líneas 653-655 — Mi Cuenta section filter (`cliente.actualizaciones`,
  `cliente.notificaciones`, `cliente.configuracion`)

**Refactor priorizado** spec V1 Slice 6: reemplazar este filter por
`clientNavItems` prop server-side via `<ClientPortalNavigation>`.

**Decisión Slice 6 — light refactor:** bloque preservado intacto. Comment block
canonical agregado encima del `if (!isInternalPortalUser)` block (líneas ~595-621
en archivo modificado) documentando:

- El path legacy y por qué se preserva (V1.0 ship)
- Que TASK derivada V1.1 hace migration full
- Que page guards Slice 4 ENFORCE gating server-side (defense in depth)
- Override marker `// client-portal-allowed:` para lint rule futura (Slice 7)

## Acciones tomadas Slice 6

| # | Acción | Status |
|---|---|---|
| 1 | Audit grep canónico ejecutado y documentado (este archivo) | ✓ |
| 2 | Inline comment D2 en `capabilityModules` legacy (líneas 109-117) | ✓ |
| 3 | Comment block canonical encima del `if (!isInternalPortalUser)` bloque (línea ~595) | ✓ |
| 4 | Override marker `// client-portal-allowed: <reason>` agregado para Slice 7 lint rule | ✓ |
| 5 | Refactor full → TASK derivada V1.1 `client-portal-vertical-menu-resolver-migration` (declarada en spec Follow-ups) | Deferred V1.1 |

## Decisión 4-pilar para deferral V1.1

- **Safety**: legacy `canSeeView` NO compromete seguridad — page guards (Slice 4)
  enforce gating real server-side. Menu mostrando items extra que el cliente no
  puede clickear es UX degraded, NO security hole. Worst case: cliente click →
  redirect con `<ModuleNotAssignedEmpty>` (cálido, recoverable).
- **Robustness**: NO romper algo que funciona. VerticalMenu es complejo (client
  component con multiple data sources, hooks, etc.). Refactor full requiere
  client→server architecture change.
- **Resilience**: ship V1.0 con resolver-based gating en page guards + legacy
  menu coexistente es resiliente. V1.1 migration no bloquea ship.
- **Scalability**: scope creep es el mayor riesgo. Slice 6 light evita explotar
  effort a Crítico.

## Cross-impact con tasks abiertas

- **TASK-828** (cascade desde lifecycle): NO impacto. Cascade materializa
  assignments en `module_assignments`, el resolver los lee. Path independiente
  del VerticalMenu legacy.
- **TASK-829** (reliability signals + backfill): NO impacto. Signals nuevos
  observan el resolver path, NO el legacy menu path.

## Spec V1.4 Follow-ups consolidados

TASK derivadas V1.1 ya registradas en spec TASK-827:

1. `client-portal-legacy-branching-sweep` — promote `no-untokenized-business-line-branching`
   lint rule warn → error post sweep + ≥30 días steady
2. `capability-modules-resolver-migration` — refactor `resolveCapabilityModules` →
   resolver canónico
3. `client-portal-pages-placeholder-materialization` — pages reales para
   placeholders declarados en VIEW_REGISTRY (creative-hub, roi-reports,
   brand-intelligence, etc.)

**Agregado Slice 6:** `client-portal-vertical-menu-resolver-migration` — refactor
full del bloque `!isInternalPortalUser` en VerticalMenu (líneas 595-680) a
`<ClientPortalNavigation>` server-side via prop.
