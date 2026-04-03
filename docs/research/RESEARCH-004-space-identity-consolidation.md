# RESEARCH-004 - Space Identity Consolidation

## Status

- Lifecycle: `Research Brief`
- State: `Active`
- Domain: `platform` + `admin` + `agency` + `integrations`
- Owner: `Greenhouse product / platform`

## Summary

Definir la consolidación conceptual y visible entre `tenant`, `client`, `organization` y `space` dentro de Greenhouse.

La hipótesis de este brief es que `Space` ya dejó de ser solo un rename amigable de `tenant` y hoy funciona como un objeto más robusto: un boundary operativo real para onboarding, integraciones, sincronización, observabilidad y gestión cross-module.

El problema es que la experiencia visible del portal todavía no refleja esa realidad. La UI principal de admin sigue centrada en `tenant/client`, mientras varios flujos reales ya operan sobre `space`.

Este brief existe para cerrar esa brecha antes de seguir agregando onboarding, governance o surfaces nuevas sobre una base conceptual ambigua.

## Why This Brief Exists

Hoy el portal mezcla tres capas distintas bajo el mismo lenguaje de negocio:

- `tenant` como contexto técnico o de acceso
- `client` como identidad legacy/comercial visible en muchas surfaces
- `space` como boundary operativo ya materializado en runtime

Esto produce varios síntomas:

1. no es obvio dónde onboardear un cliente nuevo
2. `/admin/tenants/[id]` mezcla governance legacy con operación nueva
3. `Notion onboarding` vive en una surface que no se siente dueña del flujo
4. `Agency Space 360` y `Admin tenant detail` compiten por ser “la ficha real”
5. la navegación usa palabras que ya no coinciden con el dominio actual

Si esta ambigüedad sigue, cada nuevo módulo corre el riesgo de:

- duplicar surfaces maestras
- abrir nuevas rutas sobre el objeto equivocado
- seguir montando onboarding y governance en una vista legacy
- consolidar deuda conceptual en vez de reducirla

## Product Thesis

`Space` deja de ser solo el nuevo nombre de `tenant` y pasa a formalizarse como la unidad operativa canónica de Greenhouse: el boundary principal para onboarding, integraciones, visibilidad y gestión cross-module, mientras `tenant` queda como término técnico de contexto y compatibilidad legacy.

Versión ejecutiva:

> Greenhouse debe tratar `Space` como el objeto principal de operación del cliente. La UX, el onboarding y las integraciones deben organizarse alrededor de `space`, no de surfaces legacy centradas en `tenant/client`.

## Baseline Verified In Repo

### 1. Admin todavía usa `client` como surface primaria

La lista de “Spaces” en admin navega por `clientId`:

- `src/views/greenhouse/admin/AdminCenterSpacesTable.tsx`

El detalle `/admin/tenants/[id]` carga por `clientId` y compone:

- capabilities
- users
- CRM
- projects
- Notion
- settings

Archivos relevantes:

- `src/views/greenhouse/GreenhouseAdminTenantDetail.tsx`
- `src/lib/admin/get-admin-tenant-detail.ts`

Conclusión:
- la surface principal sigue tratándose como ficha de cliente/tenant legacy, no como ficha de `space`

### 2. `Space` ya es objeto runtime real

El repo ya materializa `space` en Postgres y lo usa como boundary operativo:

- `greenhouse_core.spaces`
- `greenhouse_core.space_notion_sources`
- `GET/POST /api/admin/spaces`
- `Agency Space 360`

Archivos relevantes:

- `src/app/api/admin/spaces/route.ts`
- `src/lib/agency/space-360.ts`
- `src/app/(dashboard)/agency/spaces/[id]/page.tsx`
- `docs/tasks/complete/TASK-142-agency-space-360-view.md`

Conclusión:
- `space` ya no es decorativo; tiene identidad, relaciones y consumers reales

### 3. Integraciones nuevas ya dependen de `space`

La lane de Notion formalizada recientemente usa `space` como boundary operativo:

- binding canónico: `greenhouse_core.space_notion_sources`
- governance por `space`
- readiness por `space`
- snapshots/drift por `space`

Archivos relevantes:

- `src/views/greenhouse/admin/tenants/TenantNotionPanel.tsx`
- `src/lib/space-notion/notion-governance.ts`
- `docs/tasks/complete/TASK-187-notion-integration-formalization-space-onboarding-schema-governance.md`

Conclusión:
- el onboarding e integration governance ya ocurrieron conceptualmente a nivel `space`, aunque la UI siga embebida en una vista legacy de tenant

### 4. `Organization` ya existe como objeto canónico superior

El modelo 360 y los trabajos recientes de Account 360 ya empujan una lectura más clara:

- `organization` como cuenta/empresa canónica
- `space` como contexto operativo
- `client` como bridge/transición en varias superficies

Referencias:

- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `project_context.md` deltas recientes de `TASK-193`

Conclusión:
- el dominio ya no es “solo tenants”; hay una jerarquía más rica que la UI todavía no expresa bien

## Current Model vs Recommended Model

### Current visible model

Lo que un usuario puede inferir hoy:

`tenant ~= client`

y dentro de esa ficha legacy aparecen piezas nuevas de `space`.

Resultado:
- el usuario no sabe si está viendo un cliente, una organización o un espacio operativo

### Recommended model

La propuesta recomendada es:

- `organization`
  - cuenta/empresa canónica
  - agrupa contexto comercial, memberships, stakeholders y relaciones más amplias
  - debe ser el entrypoint administrativo recomendado para gestionar la cuenta
- `space`
  - unidad operativa canónica
  - boundary principal de onboarding, integraciones, scope y gestión cross-module
  - cuelga de una `organization` como subobjeto operativo
- `client`
  - bridge legacy/comercial y key de compatibilidad mientras siga siendo necesario
- `tenant`
  - término técnico de aislamiento o access context
  - no debería seguir siendo el nombre principal del producto en la UI

### Structural clarification: `Space` vs `Space 360`

Este brief recomienda explicitar una distinción importante:

- `Space` sí debe existir como objeto canónico
- `Space 360` no debe tratarse como objeto distinto
- `Space 360` debe entenderse como una vista rica del mismo objeto `Space`

En términos de diseño:

- `Space` es la identidad
- `Space admin` es la configuración/gobernanza del objeto
- `Space 360` es la lectura operativa/completa del mismo objeto

La consecuencia es clave:

- sí se necesitan `Space` y una vista tipo `Space 360`
- no se deben modelar ni comunicar como dos entidades paralelas
- el portal debería converger a una sola historia del objeto `Space`, con vistas o tabs según contexto, no con identidades conceptuales separadas

## Design Principles

1. Un flujo nuevo no debe elegir `client/tenant` como surface primaria si el trabajo real ocurre a nivel `space`.
2. `Space` debe ser la entidad visible para onboarding operativo e integraciones.
3. `Organization` debe seguir siendo el objeto canónico superior cuando el problema sea de cuenta o relación comercial.
4. `client` puede seguir existiendo como bridge, pero no debe seguir mandando la jerarquía visible del portal.
5. `tenant` debe quedar como término técnico y no como nombre paraguas de producto.
6. No abrir una nueva surface maestra si ya existe `Space 360` como anchor operativo.
7. No seguir embebiendo onboarding nuevo dentro de `/admin/tenants/[id]` si esa surface ya se percibe como legacy/deprecada.

## UX / IA Surface Problem

El problema no es solo el modelo de datos. También es un problema de ownership de surfaces.

### Competencia actual

- `/admin/tenants/[id]`
  - se siente como ficha histórica de tenant/client
  - concentra governance antigua y parches operativos nuevos
- `/agency/spaces/[id]`
  - ya existe como `Space 360`
  - se parece más a la ficha operativa real del objeto

Esto choca con el principio ya explicitado en:

- `docs/tasks/complete/CODEX_TASK_Portal_View_Surface_Consolidation.md`

Regla relevante:
- no duplicar shells maestras para el mismo objeto

### Recomendación de surface

Si `space` es el objeto operativo principal, la arquitectura visible debería converger así:

- `Organization admin`
  - entrypoint principal para entender y gestionar la cuenta
- `Spaces`
  - child objects operativos dentro de la `organization`
- `Space onboarding`
  - flow dedicado aplicado al `space`, iniciado desde la cuenta
- `Space admin / governance`
  - surface administrativa del mismo objeto `Space`
- `Space 360`
  - vista operativa del mismo objeto `Space`

Regla recomendada:

- la cuenta se gestiona desde `Organization`
- la operación se configura en `Spaces`
- el trabajo diario ocurre en `Space 360`

## New Client / New Space Onboarding Problem

Hoy el onboarding de un cliente nuevo no es claro porque en realidad son varios pasos de objetos distintos:

1. asegurar identidad base del cliente / organización
2. crear `space`
3. activar capacidades
4. conectar integraciones como Notion
5. validar readiness

Hoy parte de eso vive en:

- `/admin/tenants/[id]`
- tab `Notion`
- botón `Crear Space`

Eso es funcional, pero no es una experiencia de onboarding diseñada como tal.

La recomendación de este brief es separar explícitamente:

- surface legacy de governance
- surface dedicada de onboarding

## Options Considered

### Opción A — Mantener todo en `/admin/tenants/[id]`

Ventajas:
- no requiere redefinir rutas principales de inmediato

Problemas:
- consolida la deuda actual
- mantiene confusión entre `client` y `space`
- deja onboarding en una surface ya percibida como rota/deprecada

Recomendación:
- no recomendada

### Opción B — Rehacer `/admin/tenants/[id]` para que sea realmente `space-first`

Ventajas:
- podría reducir duplicación

Problemas:
- la ruta sigue cargando con el nombre legacy `tenants`
- alto riesgo de refactor ambiguo: cambia todo, pero conserva una semántica vieja

Recomendación:
- posible como transición, pero no como decisión final de producto

### Opción C — Formalizar `Space` como objeto visible y separar onboarding

Idea:
- mantener compatibilidad con `/admin/tenants/*`
- consolidar `space` como objeto primario
- crear surface dedicada para onboarding
- converger gradualmente a rutas y nomenclatura alineadas con `space`

Ventajas:
- reduce ambigüedad conceptual
- da un home claro al onboarding
- alinea la UX con el runtime real
- permite migración gradual

Recomendación:
- opción recomendada

## Recommended Direction

### Decisión estructural

Greenhouse debe formalizar `Space` como unidad operativa canónica visible del cliente.

### Decisión de navegación

La surface administrativa primaria debe entrar por `Organization`, y desde ahí exponer los `Spaces` como subobjetos operativos sobre los que se ejecuta onboarding, integración y configuración.

### Decisión de UX

El onboarding de nuevas cuentas/espacios no debe seguir viviendo como un tab dentro de `/admin/tenants/[id]`.

### Decisión de surface

`Space 360` debe tratarse como una vista del objeto `Space`, no como un objeto paralelo ni como una segunda identidad del mismo dominio.

### Decisión de transición

`/admin/tenants/*` puede mantenerse como carril de compatibilidad y governance legacy mientras se migra a una arquitectura `space-first`.

## Candidate Future Surface Model

Este brief no fija rutas definitivas, pero sí recomienda el patrón:

- `Organization`
  - cuenta canónica y entrypoint admin principal
- `Organization > Spaces`
  - lista de subobjetos operativos
- `Space`
  - objeto operativo visible y hijo de `organization`
- `Space onboarding`
  - flujo dedicado del `space`, iniciado desde la cuenta
- `Space admin`
  - governance y configuración del `space`
- `Space 360`
  - vista operativa del mismo `space`

Ejemplo de aterrizaje posible:

- `/admin/spaces/new`
- `/admin/accounts/[organizationId]`
- `/admin/accounts/[organizationId]/spaces/[spaceId]/onboarding`
- `/admin/spaces/[id]`
- `/agency/spaces/[id]`

Manteniendo redirects o compatibilidad desde:

- `/admin/tenants`
- `/admin/tenants/[id]`

## Open Questions

- [ ] ¿`/admin/tenants` debe converger a `/admin/spaces`, o mantenerse como alias permanente?
- [ ] ¿La creación de `Organization` debe ser parte del onboarding visible o seguir resolviéndose automáticamente cuando existe `client` base?
- [ ] ¿La surface admin principal del objeto `Space` debe vivir en `admin` o el detalle operativo de `agency/spaces/[id]` debe absorber más governance?
- [ ] ¿Qué partes de `/admin/tenants/[id]` sobreviven como governance real y cuáles deben migrarse?
- [ ] ¿`Capabilities` deben seguir asociadas primariamente a `client`, o ya corresponde modelarlas y exponerlas como configuración del `space`?
- [ ] ¿La navegación lateral debe renombrar “Spaces / Tenants” para evitar drift de lenguaje?

## What “Ready For Task” Looks Like

Este brief estará listo para bajar a task(s) cuando exista acuerdo explícito en:

- [ ] tesis arquitectónica: `space` como unidad operativa canónica visible
- [ ] ownership de surfaces:
  - qué surface es la maestra de `space`
  - qué surface queda como legacy
- [ ] decisión sobre onboarding:
  - nueva route dedicada
  - alcance del flujo
- [ ] alcance de transición:
  - qué se migra ahora
  - qué queda como compatibilidad

## Proposed Task Breakdown

Este research no debería bajar a una sola task grande. La recomendación es separarlo en lanes.

### Task A — Space identity formalization

Objetivo:
- formalizar en arquitectura y nomenclatura que `space` es la unidad operativa visible

Entregables:
- docs de arquitectura
- decisiones de naming
- criterios de compatibilidad legacy

### Task B — Space onboarding surface

Objetivo:
- crear una surface dedicada para onboarding de un nuevo `space`

Entregables:
- route dedicada
- flujo paso a paso
- reuse de APIs existentes (`POST /api/admin/spaces`, Notion register, readiness)

### Task C — Admin tenant legacy decomposition

Objetivo:
- decidir qué queda en `/admin/tenants/[id]`
- sacar de ahí todo lo que hoy corresponde a onboarding o a surface primaria de `space`

Entregables:
- surface más acotada
- redirects o CTAs hacia la surface correcta

### Task D — Navigation and naming alignment

Objetivo:
- alinear sidebar, labels, breadcrumbs y links con la decisión `space-first`

Entregables:
- nomenclatura consistente
- eliminación de lenguaje ambiguo donde corresponda

## Validation Criteria

- [ ] Un operador nuevo puede responder sin ambigüedad dónde onboardear un cliente/space nuevo
- [ ] Un admin puede explicar la diferencia entre `organization`, `space` y `client` sin recurrir al código
- [ ] Las integraciones nuevas toman `space` como boundary principal visible
- [ ] No existen dos surfaces maestras compitiendo por ser “la ficha real” del mismo objeto operativo
- [ ] `/admin/tenants/[id]` deja de ser el lugar por default para meter nuevos flujos estructurales

## Resulting Tasks

- TBD
