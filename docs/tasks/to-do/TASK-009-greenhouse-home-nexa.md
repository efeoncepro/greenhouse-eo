# CODEX TASK -- Greenhouse Home Nexa v2: Home conversacional y client-first sobre el runtime real del portal

## Estado

Baseline canonica de implementacion al 2026-03-19.

Esta version conserva la vision de producto de `CODEX_TASK_Greenhouse_Home_Nexa.md`, pero reescribe su base tecnica para alinearla con el repo vivo:
- `portalHomePath` y redirects existentes
- route groups reales del proyecto
- `dashboard` / `internal/dashboard` como superficies ya activas
- `@google/genai` ya instalado
- `Nexa` como slice incremental, no como reescritura total del portal de entrada

## Resumen

Implementar una nueva vista `Home` del portal como superficie de entrada mas guiada y conversacional para Greenhouse.

La v2 mantiene la tesis correcta del brief original:
- una entrada menos fria que el dashboard clasico
- una capa conversacional llamada `Nexa`
- accesos rapidos a modulos
- pendientes visibles
- tono de producto mas intencional

La implementacion cambia:
- `Home` no reemplaza de golpe todo el sistema de redirects
- `Home` se integra con `portalHomePath`
- `Nexa` arranca como bloque o panel acotado dentro de la vista
- la data se apoya primero en consumers y queries existentes del portal

## Decision de arquitectura

### Principios

- `Home` es una nueva superficie, no una negacion de `/dashboard` o `/internal/dashboard`
- el redirect de entrada debe seguir respetando `portalHomePath`
- `client`, `internal`, `admin`, `finance`, `hr`, `people`, `agency` siguen siendo los boundaries reales
- `Nexa` no debe introducir un runtime paralelo innecesario ni consultas ad hoc a cinco fuentes por mensaje si ya existen consumers reutilizables
- la experiencia debe ser `client-first`, con variantes posteriores para `internal/admin`

## Lo que Home + Nexa es y no es

`Home + Nexa` si es:
- una landing operacional mas guiada
- una capa de bienvenida y orientacion
- una superficie para shortcuts, pendientes y preguntas rapidas
- una oportunidad de hacer la primera pantalla mas clara y mas Greenhouse

`Home + Nexa` no es:
- un reemplazo inmediato de `Pulse`
- un reemplazo de `internal/dashboard`
- una app de chat completa
- un workflow engine
- una razon para rehacer auth, sidebar o navigation contracts

## Alineacion con la arquitectura viva

La implementacion debe respetar:
- `dashboard` sigue siendo la vista ejecutiva cliente existente
- `internal/dashboard` sigue siendo la control tower interna
- auth y autorizacion viven en guards/layouts y helpers server-side
- `portalHomePath` sigue siendo el contrato de aterrizaje por usuario/tenant
- `space_id` sigue siendo el tenant boundary

## Decision sobre redirect

La task original proponia mover todo login a `/home`.

La v2 corrige eso:
- no imponer `/home` como redirect universal
- introducir `/home` como nueva opcion valida de `portalHomePath`
- permitir rollout gradual:
  - algunos tenants o usuarios pueden seguir en `/dashboard`
  - internos pueden seguir en `/internal/dashboard`
  - clientes seleccionados pueden aterrizar en `/home`

### Regla MVP

`/home` se habilita como entrada principal del lado `client`.

Mapa recomendado de aterrizaje:
- `client` -> `/home`
- `internal` -> `/internal/dashboard`
- `finance` -> `/finance`
- `hr` -> `/hr/payroll`
- `admin` -> mantener el home especializado que mejor refleje su rol dominante hasta que exista una variante propia de `Home`

No hacer que `internal` o `admin` aterricen automaticamente en la misma composicion client-first sin una variante especifica para su contexto.

## Audiencias

### Cliente

Es la audiencia principal de `Home` v2 y su entrada por defecto deseada en el portal.

Ve:
- greeting
- Nexa
- modulos recomendados
- pendientes

### Internal / Admin

No son el foco del MVP.

Opciones validas:
- seguir usando `internal/dashboard`
- o exponer `/home` con variante especifica en fase posterior

### Finance / HR / People

No deben romper su redirect natural actual por introducir `Home`.

## Scope MVP

Incluye:
- nueva vista `/home`
- greeting rotativo
- module cards basadas en capacidades / surfaces reales
- lista corta de pendientes
- bloque `Nexa` conversacional simple
- APIs dedicadas de `home` para greeting/modules/tasks
- `Nexa` con contexto acotado y seguro
- rollout via `portalHomePath`

No incluye:
- migrar a todos los usuarios a `/home`
- reemplazar `/dashboard`
- reemplazar `/internal/dashboard`
- analytics avanzada de orden por uso real
- persistencia de historial multi-sesion
- contexto gigante armado por queries ad hoc para cada mensaje

## UI / UX

### Estructura MVP

```text
Greeting
Nexa panel
Tus modulos
Pendientes
```

### Regla de jerarquia

El home debe verse como una landing focalizada, no como dashboard plano de cards iguales.

### Regla por audience

La composicion `max-width` conversacional encaja especialmente bien en cliente.

Para audiencias internas, si se implementa despues, conviene otra variante mas ancha y mas operativa.

## Nexa en v2

### Decision de producto

`Nexa` sigue existiendo como asistente del portal.

Pero en el MVP:
- no tiene que dominar toda la pantalla
- no tiene que ser el unico centro de gravedad del home
- puede vivir como panel principal encima de modulos y pendientes

### Decision tecnica

- `@google/genai` ya existe en el repo
- `Nexa` puede correr en API route del portal
- usar streaming cuando sea viable
- fallback a respuesta completa si streaming falla

### Contexto MVP

No construir el contexto con un fan-out arbitrario de queries crudas por mensaje si ya existe una capa reutilizable.

Preferencia:
1. consumers y helpers existentes del portal
2. semantic endpoints ya disponibles
3. queries nuevas solo donde falte una pieza clara

### Contexto sugerido en MVP

- `spaceId`
- `spaceName`
- nombre del usuario
- 3 a 5 proyectos visibles
- resumen corto del ciclo activo si existe
- 3 a 5 pendientes
- 2 o 3 metricas visibles de alto nivel si ya existen via consumers estables

### Regla de seguridad

- nunca aceptar `space_id` desde el request body
- resolverlo desde sesion / tenant context
- no responder con data fuera del scope del usuario

## API surface MVP

- `GET /api/home/greeting-context`
- `GET /api/home/modules`
- `GET /api/home/tasks`
- `POST /api/home/nexa`

Reglas:
- helpers server-side de tenant context
- sin `middleware.ts`
- filtrado por scope del usuario
- degradacion elegante si una fuente no responde

## Module cards

La task original acierta en mostrar accesos rapidos, pero la v2 cambia el criterio:

- basarse en surfaces reales del portal
- respetar capabilities y route groups existentes
- no asumir modulos que todavia no sean contratos UI estables

### Cliente

Base razonable:
- Pulse
- Proyectos
- Ciclos
- Updates
- capabilities activas

### Internal/Admin

Fase posterior:
- no mezclar a la fuerza `Pulse Global`, `HR`, `Finanzas` y otros modulos en una sola version client-first sin diseno especifico

## Pendientes

La idea es correcta, pero el MVP debe priorizar una fuente simple y confiable.

Preferencia:
- tareas visibles que requieren atencion dentro del scope del usuario
- maximo 5
- status y CTA claros

Evitar:
- una definicion demasiado ambiciosa de “pendiente” que mezcle demasiadas logicas de negocio en la primera salida

## Integracion con surfaces existentes

La v2 no degrada:
- `/dashboard`
- `/internal/dashboard`
- sidebar
- `portalHomePath`

La introduccion correcta es:
- mantener `/home` como ruta nueva
- reemplazar el redirect stub existente
- habilitar el uso por configuracion gradual

## File structure sugerida

```text
src/app/(dashboard)/home/page.tsx
src/views/greenhouse/home/*
src/app/api/home/*
src/lib/nexa/*
src/config/greenhouse-home-greetings.ts
src/config/greenhouse-home-suggestions.ts
src/types/home.ts
```

Regla:
- reutilizar `src/components/greenhouse/*` para primitives compartidos
- no inventar componentes genericos dentro de `views` si sirven fuera de Home

## Fases recomendadas

### Fase 1

- reemplazar redirect stub de `/home`
- greeting rotativo
- module cards
- pendientes
- layout client-first

### Fase 2

- `Nexa` con chat simple
- contexto acotado
- streaming + fallback
- suggestion chips

### Fase 3

- rollout via `portalHomePath`
- variantes por audience
- mejores metas dinamicos
- orden por uso real

### Fase 4

- historial persistente opcional
- enrichment conversacional mas profundo
- posible convergencia con otras superficies AI internas si tiene sentido

## Regla operativa final

Esta `v2` conserva la intuicion correcta:
- Greenhouse si necesita una entrada mas guiada y con mas personalidad

Pero corrige la estrategia:
- primero un `Home` solido y client-first
- luego `Nexa` incremental
- sin romper redirects, dashboards y contracts que ya existen

Ante conflicto, prevalecen:
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/tasks/to-do/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `project_context.md`
- `AGENTS.md`

---

## Dependencies & Impact

- **Depende de:**
  - Auth y tenant context del portal (ya implementado)
  - `portalHomePath` redirect mechanism (ya implementado)
  - `@google/genai` (ya instalado)
  - Capabilities y route groups existentes
- **Impacta a:**
  - Ninguna otra task directamente — `/home` es una nueva superficie aditiva
- **Archivos owned:**
  - `src/app/(dashboard)/home/page.tsx`
  - `src/views/greenhouse/home/*`
  - `src/app/api/home/*`
  - `src/lib/nexa/*`
  - `src/config/greenhouse-home-greetings.ts`
  - `src/config/greenhouse-home-suggestions.ts`
  - `src/types/home.ts`
