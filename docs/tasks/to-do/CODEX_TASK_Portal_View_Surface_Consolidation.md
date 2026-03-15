# CODEX TASK — Portal View Surface Consolidation

## Resumen

Greenhouse ya no es un portal pequeño ni un starter con unas pocas pantallas. El repo hoy tiene varias familias de vistas activas:
- dashboard cliente
- capabilities
- proyectos
- sprints
- agency
- people
- payroll
- finance
- admin
- settings
- updates

El problema ya no es “falta una pantalla”, sino que algunas surfaces empiezan a competir entre sí por el mismo trabajo mental del usuario:
- dos vistas diferentes quieren ser “la ficha de una persona”
- varias rutas quieren ser “el drilldown operativo del delivery”
- algunas pantallas ya son módulos reales y otras siguen funcionando más como slices parciales, placeholders o nodos de navegación

Esta task existe para ordenar eso antes de seguir agregando UI nueva.

**No es una task de implementación inmediata.**  
Es una task de consolidación UX, jerarquía de navegación y definición de ownership entre vistas.

---

## Motivo

El portal necesita una decisión explícita sobre qué vistas:
- se mantienen como troncales
- se enriquecen
- se unifican
- se convierten en tabs o drilldowns secundarios
- o se depriorizan temporalmente

Si esto no se resuelve pronto, el riesgo no es solo visual:
- se duplica esfuerzo de frontend
- se fragmenta el modelo mental del usuario
- se repiten componentes con jerarquías distintas
- y cada nuevo módulo empieza a abrir otra ruta en vez de consolidar una surface ya existente

---

## Alineación obligatoria con arquitectura y UI system

Antes de ejecutar esta task, revisar como mínimo:
- `AGENTS.md`
- `project_context.md`
- `Handoff.md`
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V1.md`
- `docs/architecture/Greenhouse_Nomenclatura_Portal_v3.md`
- `docs/ui/GREENHOUSE_UI_ORCHESTRATION_V1.md`
- `docs/ui/GREENHOUSE_VUEXY_COMPONENT_CATALOG_V1.md`

Reglas obligatorias:
- no abrir nuevas rutas solo porque un módulo ganó backend
- no duplicar shells de detalle si ya existe una surface maestra para ese objeto
- no usar una vista placeholder o derivada como si fuera producto maduro
- no fragmentar un mismo trabajo de usuario entre múltiples pantallas hermanas si puede resolverse con tabs o drilldowns
- no mezclar client surfaces, internal surfaces y admin surfaces sin un boundary claro

---

## Skills recomendadas para ejecutar esta task

Esta task debe abordarse usando como criterio operativo:
- `greenhouse-ui-orchestrator`
- `greenhouse-vuexy-ui-expert`

Motivo:
- ambas skills ya existen en este repo y sirven para normalizar la solicitud, mapear familias de patrones y revisar si una pantalla merece vivir como ruta propia, tab, subpanel o detalle

---

## Inventario actual de surfaces

### Cliente

- `/dashboard`
- `/capabilities/[moduleId]`
- `/proyectos`
- `/proyectos/[id]`
- `/sprints`
- `/sprints/[id]`
- `/settings`
- `/updates`

### Interno / agencia

- `/internal/dashboard`
- `/agency`
- `/agency/spaces`
- `/agency/capacity`
- `/people`
- `/people/[memberId]`
- `/hr/payroll`
- `/hr/payroll/member/[memberId]`
- `/finance`
- `/finance/*`

### Admin

- `/admin/tenants`
- `/admin/tenants/[id]`
- `/admin/users`
- `/admin/users/[id]`
- `/admin/roles`

---

## Lectura UX actual

### 1. Surfaces que hoy sí se sienten troncales y bien orientadas

Estas vistas sí tienen sentido como pilares del portal:
- `Dashboard`
- `Finance`
- `People`
- `Admin`
- `Capabilities`

Lectura:
- tienen trabajo claro
- tienen identidad de módulo
- tienen suficiente peso de producto como para vivir como rutas propias

### 2. Surfaces que hoy compiten por la misma intención

#### People vs Payroll member detail

Hoy existen dos historias posibles para una persona:
- `/people/[memberId]`
- `/hr/payroll/member/[memberId]`

Problema:
- ambas pueden sentirse como “la ficha del colaborador”
- eso fragmenta la lectura del objeto canónico `Collaborator`

Dirección sugerida:
- `People` debería ser la shell maestra del colaborador
- `Payroll` debería ser una vista o tab especializada dentro de esa historia, no una ficha paralela

#### Dashboard vs Projects vs Sprints vs parte de Capabilities

Hoy estas vistas comparten demasiado territorio mental:
- `dashboard` resume delivery
- `projects` baja a proyectos
- `sprints` baja a ciclos
- `capabilities` baja a módulos de operación

Problema:
- el usuario puede sentir que entra a cuatro puertas distintas para entender la misma operación

Dirección sugerida:
- tratarlas como una sola familia de “delivery workspace”
- decidir con claridad qué queda como landing, qué queda como drilldown y qué queda como tab

#### Agency Pulse vs Agency Spaces vs Agency Capacity

Las tres rutas hacen sentido por contenido, pero como familia todavía se sienten demasiado separadas.

Problema:
- parecen tres productos paralelos más que un workspace único

Dirección sugerida:
- mantener las tres lecturas
- pero reorganizarlas como una experiencia única con navegación secundaria o tabs

### 3. Surfaces que hoy se sienten incompletas o transicionales

#### Updates

`/updates` hoy no justifica vivir sola si sigue siendo empty state.

Dirección sugerida:
- o se convierte en un feed real
- o se reabsorbe dentro de otra surface hasta que tenga contenido

#### Settings

`/settings` sí tiene sentido como categoría, pero la pantalla actual todavía se siente más cerca de placeholder que de configuración madura.

Dirección sugerida:
- mantener la ruta
- enriquecerla con configuración real de cuenta, identidad y notificaciones

#### About / Home

Si solo redirigen, no deben tratarse como surfaces del producto.

Dirección sugerida:
- considerarlas deuda de routing, no vistas activas

---

## Recomendación UX documentada

### Mantener como surfaces troncales

- `Dashboard`
- `Finance`
- `People`
- `Admin`
- `Capabilities`
- `HR/Payroll` como módulo, no necesariamente como ficha maestra de persona

### Unificar o reagrupar

- `People` + detalle individual de `Payroll`
- `Projects` + `Sprints` + drilldowns de delivery relacionados
- `Agency Pulse` + `Agency Spaces` + `Agency Capacity`

### Enriquecer

- `People`
- `Finance`
- `Settings`
- `Sprints` si se decide mantenerla como ruta fuerte

### Depriorizar o reabsorber temporalmente

- `Updates` si sigue sin contenido real
- `about`
- `home`

---

## Objetivo de esta task

Dejar una decisión explícita de arquitectura UX para las vistas del portal:

1. Qué rutas son producto troncal
2. Qué rutas son drilldowns o subniveles
3. Qué rutas deberían convertirse en tabs internas
4. Qué rutas deberían degradarse a redirect o surface secundaria
5. Qué objetos del sistema tienen una shell maestra

---

## Entregables esperados

### A. Mapa de surfaces vigente

Una matriz clara con columnas como:
- surface
- audiencia
- intención principal
- estado actual
- keep / unify / enrich / deprioritize
- observaciones de ownership

### B. Propuesta de navegación consolidada

No como código todavía, sino como definición UX:
- qué queda en primer nivel
- qué pasa a segundo nivel
- qué vive como tab
- qué queda solo como detalle profundo

### C. Definición de shells maestras por objeto

Como mínimo:
- cliente
- colaborador
- tenant / space
- proyecto
- sprint
- capability

### D. Reglas de no proliferación de vistas

Antes de crear una pantalla nueva, responder:
- ¿esto merece ruta propia?
- ¿esto ya existe dentro de otra shell?
- ¿esto es una tab o una vista completa?
- ¿esto es producto real o placeholder?

---

## Preguntas que esta task debe resolver

1. ¿`People` debe ser la ficha maestra del colaborador?
2. ¿`Payroll member detail` debe sobrevivir como ruta separada?
3. ¿`Projects` y `Sprints` merecen autonomía o deben caer bajo una familia de delivery?
4. ¿`Agency` debe seguir como tres rutas o consolidarse como workspace?
5. ¿`Updates` merece seguir existiendo si no tiene feed real?
6. ¿Qué rutas actuales son reales y cuáles siguen siendo transicionales?

---

## Criterios de aceptación

- existe una recomendación documentada, explícita y accionable sobre las surfaces del portal
- queda definido qué vistas se mantienen, cuáles se unifican y cuáles se enriquecen
- queda definido qué vistas no deben seguir creciendo como rutas separadas
- la recomendación respeta arquitectura, nomenclatura y ownership por módulo
- no se hacen cambios de código en esta task sin aprobación posterior

---

## Fuera de alcance

- rediseñar visualmente todo el portal en esta misma task
- implementar navegación nueva en esta misma task
- mover rutas o borrar vistas sin una decisión posterior aprobada
- introducir nuevos módulos o nuevas rutas para “resolver” la fragmentación

---

## Siguiente paso recomendado

Una vez aprobada esta lectura, crear una fase siguiente más concreta:
- `v2` o task hija de implementación

Esa fase ya sí debería:
- proponer el mapa final de navegación
- definir redirects
- convertir ciertas vistas en tabs
- y ajustar shells maestras por objeto

Pero este documento debe cerrarse primero como criterio rector, no como implementación apresurada.
