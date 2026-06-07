# Greenhouse UI Platform — View Governance

> Parte de **Greenhouse UI Platform**. Índice + mapa "dónde vive X": [README.md](./README.md).
> Estado **vigente** (spec actual). Historial cronológico (deltas datados): [HISTORIAL.md](./HISTORIAL.md).
> Autoridad final = runtime; si este doc difiere del código, gana el runtime y este doc se actualiza (modelo 3 capas, ver `design-system-governance`).
> Arquitectura de gobernanza de vistas (route groups + authorizedViews + entitlements).

---

## View Governance Architecture

### Objetivo

Separar:
- navegación broad por `routeGroups`
- autorización fina de superficies por `view_code`

La UI debe ayudar a responder tres preguntas:
1. qué ve un rol hoy
2. qué override tiene un usuario
3. qué terminará viendo realmente esa sesión

### Modelo UI canónico

`/admin/views` debe conservar estas capas:
- **hero + KPIs**
  - registrar cobertura
  - exponer drift entre persistido y fallback
- **matrix por rol**
  - editar `granted/revoked`
  - mostrar origen `persisted` vs `hardcoded_fallback`
- **preview por usuario**
  - baseline visible por rol
  - grants extra por override
  - revokes efectivos
  - auditoría reciente
- **roadmap / follow-on**
  - dejar explícito qué parte del modelo sigue transicional

### Tokens semánticos

Convención operativa para la UI:
- `success`
  - concesión activa
  - grant extra
- `warning`
  - cambio pendiente
  - override activo
- `error`
  - revoke efectivo
  - fallback que aún debe modelarse mejor
- `info`
  - baseline persistido o lectura neutra

### Reglas de UX para matrix y preview

1. La matrix no debe presentarse como pared indiferenciada de checks.
2. Debe existir foco explícito para:
   - cambios pendientes
   - fallback heredado
   - impacto efectivo por usuario
3. El preview debe distinguir siempre:
   - baseline por rol
   - override grant
   - override revoke
4. La auditoría visible debe convivir con la edición; no debe quedar escondida fuera del flujo.
5. Si una vista sigue dependiendo de fallback hardcoded, la UI debe hacerlo visible.

### Regla de implementación

Cuando nazca una nueva superficie gobernable:
- agregar `view_code` en `src/lib/admin/view-access-catalog.ts`
- alinear menú si corresponde
- agregar guard page-level o layout-level
- reflejarla automáticamente en `/admin/views`

No abrir nuevas pantallas visibles relevantes sin decidir al menos una de estas dos posturas:
- `tiene view_code propio`
- `queda explícitamente fuera del modelo porque es una ruta base transversal`

### Regla Design System

Las rutas internas bajo `/admin/design-system/**` reutilizan `administracion.design_system` salvo que exista una razón de acceso nueva y explícita.

Cuando se agregue un token, primitive, patrón o lab nuevo:
- debe aparecer en el catálogo canónico `/admin/design-system`
- debe tener link real hacia su ruta interna
- debe quedar declarado en `route-reachability-manifest.ts`
- debe contar con GVC si la surface es visual/repetible
- debe enlazar su contrato en `ui-platform/*`, `DESIGN.md`, la arquitectura de tokens o un ADR según corresponda

### Excepción documentada actual

`/home` queda explícitamente fuera del modelo de `view_code`.

Razón de plataforma:
- es el landing base de internos vía `portalHomePath`
- funciona como shell de arranque para Nexa, quick access y tareas
- su contenido ya se restringe indirectamente por:
  - módulos resueltos
  - notificaciones visibles
  - rutas destino posteriores

Eso significa:
- no debe aparecer en `/admin/views` como vista gobernable por ahora
- no debe bloquearse con `hasAuthorizedViewCode()` mientras siga siendo la entrada transversal segura de la sesión interna
