# RELEASE_CHANNELS_OPERATING_MODEL_V1.md

## Objetivo

Definir una regla operativa clara para lanzar capacidades de Greenhouse en canales `alpha`, `beta` y `stable`, con foco principal por módulo y con changelog client-facing separado del changelog interno del repo.

## Alcance

Este documento gobierna:

- el canal global de la plataforma Greenhouse
- el canal por módulo o feature visible
- la relación entre branch, ambiente y canal de release
- la publicación del changelog client-facing
- la forma en que agentes y personas deben documentar promociones o cambios de canal

No reemplaza:

- `changelog.md` interno del repo
- la arquitectura técnica de cada módulo
- los feature flags o la política comercial por cliente

## Principio rector

En Greenhouse, **la unidad principal de release es el módulo**, no la plataforma completa.

La plataforma puede tener un canal global para comunicar el estado general del portal, pero la fuente real de madurez debe vivir por módulo o feature visible, porque Payroll, Nexa, HRIS, Finance y Admin Center no evolucionan al mismo ritmo.

## Modelo de release

### 1. Nivel plataforma

Se permite un canal global único para Greenhouse:

- `alpha`
- `beta`
- `stable`

Este canal expresa:

- expectativa general de estabilidad
- nivel de soporte esperado del portal como conjunto
- madurez del producto en sentido amplio

No debe usarse para esconder el estado real de los módulos.

### 2. Nivel módulo

Cada módulo visible puede tener su propio canal:

- `alpha`
- `beta`
- `stable`
- `deprecated`

Ejemplos válidos:

- `Payroll` = `stable`
- `Home / Nexa` = `beta`
- `HRIS > Document Vault` = `alpha`
- `Admin Center` = `beta`

### 3. Nivel disponibilidad

El canal de release no equivale automáticamente a disponibilidad total.

Toda capacidad visible debe distinguir entre:

- `release_channel`: `alpha | beta | stable | deprecated`
- `availability_scope`: `internal | pilot | selected_tenants | general`

Ejemplos:

- `Nexa tools` puede estar en `beta` pero con `availability_scope = internal`
- `Payroll Chile` puede estar en `stable` y `availability_scope = general`

## Regla de lectura

Cuando exista diferencia entre estados:

1. para comunicar una capacidad concreta, **manda el canal del módulo**
2. para comunicar el estado general del portal, usa el canal de plataforma
3. para soporte y rollout, manda el `availability_scope`

## Módulo vs feature

No toda mejora pequeña merece canal propio.

Usar canal de release propio solo para:

- módulos completos
- submódulos visibles para usuario
- capacidades nuevas con comportamiento o UX reconocible

No usar canal propio para:

- refactors internos
- fixes invisibles para usuario
- helpers o cambios de naming sin impacto externo

Ejemplos de grano correcto:

- `Payroll official`
- `Projected Payroll`
- `Home / Nexa`
- `HRIS > Onboarding`
- `HRIS > Document Vault`
- `Admin Center`

## Mapeo operativo a ambientes

### Preview

Uso recomendado:

- trabajo en `feature/*`, `fix/*`, `hotfix/*`
- exploración interna
- validación técnica o UX temprana

Canal típico:

- `alpha`

### Staging

Uso recomendado:

- integración en `develop`
- validación compartida
- pilotos internos o grupo controlado

Canal típico:

- `beta`

### Production

Uso recomendado:

- funcionalidades soportadas o pilotos explícitamente habilitados

Canal típico:

- `stable`
- o `beta` controlada si la capacidad está detrás de flag y se comunica como tal

## Reglas de promoción

### Alpha

Una capacidad puede declararse `alpha` cuando:

- el flujo principal existe
- no rompe el runtime base
- el owner del módulo acepta feedback rápido y cambios frecuentes

### Beta

Una capacidad puede promocionarse a `beta` cuando:

- el contrato funcional principal ya está razonablemente estable
- los errores críticos conocidos quedaron resueltos o acotados
- existe observabilidad mínima o validación suficiente
- existe owner claro del módulo
- el changelog client-facing puede explicar la capacidad sin ambigüedad

### Stable

Una capacidad puede promocionarse a `stable` cuando:

- ya pasó por `beta`, salvo excepción documentada
- no tiene bugs críticos abiertos para su caso principal
- existe rollback o mitigación razonable
- permisos, copy, estados vacíos y errores visibles están cuidados
- el equipo está dispuesto a soportarla como comportamiento esperado del producto

## Owners

Cada promoción de canal debe dejar explícito:

- módulo o feature afectado
- canal anterior
- canal nuevo
- availability scope
- owner responsable
- fecha efectiva

Si no hay owner claro, la capacidad no debe promocionarse más allá de `alpha`.

## Feature flags y cohorts

Si una capacidad usa rollout controlado:

- documentar el canal del módulo
- documentar si está `internal`, `pilot`, `selected_tenants` o `general`
- no presentar como `stable` algo que solo funciona para un tenant piloto si esa limitación no está declarada

## Changelog client-facing

La fuente canónica inicial queda en:

- `docs/changelog/CLIENT_CHANGELOG.md`

### Reglas

- no mezclar con `changelog.md` interno del repo
- escribir desde la perspectiva del usuario o stakeholder
- no incluir nombres de tablas, migraciones, refactors o deuda técnica
- sí incluir:
  - nuevas capacidades visibles
  - mejoras funcionales visibles
  - correcciones relevantes
  - cambios de canal (`alpha` → `beta`, `beta` → `stable`)
  - deprecaciones o sunsets

### Formato mínimo por entrada

- `Versión`
- `Canal`
- `Fecha`
- `Disponible para`
- `Módulos`
- `Novedades`
- `Mejoras`
- `Correcciones`
- `Notas`

## Versionado recomendado

Greenhouse usa un esquema hibrido:

- **Producto y modulos visibles:** `CalVer + canal`
- **APIs publicas, SDKs o contratos tecnicos versionados:** `SemVer`

### 1. Producto y modulos visibles

Para Greenhouse, usar `CalVer`:

- `YYYY.MM-alpha.N`
- `YYYY.MM-beta.N`
- `YYYY.MM`

Ejemplos:

- `2026.03-alpha.1`
- `2026.03-beta.2`
- `2026.03`

No es obligatorio emitir una versión por cada deploy.

### 2. APIs y contratos tecnicos

Usar `SemVer` solo cuando exista un contrato tecnico que realmente lo justifique, por ejemplo:

- APIs externas o publicas
- OpenAPI versionada
- SDKs
- paquetes npm o librerias compartidas

Ejemplos:

- `Greenhouse Integrations API v1.1.0`
- `Data Node API v2.0.0`

No usar `v1.1.0` como sistema principal para comunicar la madurez del portal completo ni de modulos de producto visibles.

## Regla de uso

- Si el cambio se comunica a usuarios o stakeholders como capacidad del portal, usar `CalVer + canal`.
- Si el cambio afecta un contrato tecnico versionado, usar `SemVer`.
- Ambos sistemas pueden coexistir siempre que no describan la misma cosa.

Ejemplo valido:

- `Home / Nexa` = `2026.03-beta.1`
- `Greenhouse Integrations API` = `v1.1.0`

Ejemplo invalido:

- usar `v1.1.0` para describir la madurez general de `Payroll` o de `HRIS` como modulo visible del portal.

## Cadencia recomendada

No publicar changelog client-facing por cada merge o por cada deployment técnico.

Cadencia recomendada:

- cuando se promueve un módulo de canal
- cuando una capacidad visible entra a pilot o general
- cuando hay un lote de cambios visible para clientes

## Git tags

Los Git tags no deben replicar ciegamente el texto del changelog. Deben seguir una convención única, predecible y sin ambigüedad.

### Regla general

- no crear tags por cada deploy
- crear tags cuando exista una promoción real de release o un snapshot importante
- usar namespaces para distinguir plataforma, módulos y APIs

### 1. Tags de plataforma

Usar cuando el release represente un snapshot amplio del portal o una promoción global relevante.

Formato:

- `platform/YYYY.MM-alpha.N`
- `platform/YYYY.MM-beta.N`
- `platform/YYYY.MM`

Ejemplos:

- `platform/2026.03-beta.1`
- `platform/2026.03`

### 2. Tags de módulo

Usar cuando un módulo o submódulo visible tenga un release significativo independiente del resto del portal.

Formato:

- `<module-slug>/YYYY.MM-alpha.N`
- `<module-slug>/YYYY.MM-beta.N`
- `<module-slug>/YYYY.MM`

Ejemplos:

- `payroll/2026.03`
- `projected-payroll/2026.03-beta.1`
- `nexa/2026.03-beta.1`
- `admin-center/2026.03-beta.1`
- `hris/2026.03-alpha.1`

### 3. Tags de API o contrato técnico

Usar `SemVer` solo para contratos técnicos versionados.

Formato:

- `api/<api-slug>/vMAJOR.MINOR.PATCH`

Ejemplos:

- `api/integrations/v1.1.0`
- `api/data-node/v2.0.0`

### Regla de naming

- usar slugs en minúscula
- usar `kebab-case`
- no mezclar `platform`, módulo y API en el mismo namespace
- no usar tags genéricos como `v1.1.0` si no dejan claro de qué cosa hablan

### Cuándo crear un tag

Crear tag cuando ocurra una de estas situaciones:

- un módulo cambia de canal (`alpha -> beta`, `beta -> stable`)
- un módulo recibe una iteración visible importante (`beta.1 -> beta.2`)
- la plataforma tiene un snapshot global que vale la pena congelar
- una API o contrato técnico cambia de versión

No crear tag cuando solo hubo:

- fixes internos menores
- refactors invisibles
- cambios sin impacto visible
- deploys rutinarios sin release declarada

### Fuente de verdad

- el changelog client-facing describe el release para usuarios
- el Git tag marca el snapshot técnico del repo
- ambos deberían referenciar la misma versión cuando aplique, pero no reemplazarse entre sí

### Ejemplos válidos

- `Home / Nexa` en beta:
  - changelog: `2026.03-beta.1`
  - git tag: `nexa/2026.03-beta.1`

- `Payroll official` estable:
  - changelog: `2026.03`
  - git tag: `payroll/2026.03`

- `Greenhouse Integrations API`:
  - changelog técnico o API docs: `v1.1.0`
  - git tag: `api/integrations/v1.1.0`

### Comandos recomendados

Tags anotados:

```bash
git tag -a platform/2026.03-beta.1 -m "Platform beta release 2026.03-beta.1"
git tag -a payroll/2026.03 -m "Payroll stable release 2026.03"
git tag -a api/integrations/v1.1.0 -m "Integrations API v1.1.0"
```

Push explícito:

```bash
git push origin platform/2026.03-beta.1
git push origin payroll/2026.03
git push origin api/integrations/v1.1.0
```

### Regla para agentes

Un agente no debe crear ni empujar tags por defecto.

Solo hacerlo cuando:

- el usuario lo pida explícitamente, o
- el trabajo esté cerrando un release declarado de plataforma, módulo o API

Si un agente prepara documentación de release pero no crea el tag, debe dejar:

- el nombre sugerido del tag
- el canal
- el scope (`platform`, módulo o API)
- y el changelog asociado

### Regla de higiene antes de taguear

No crear tags de release sobre un working tree sucio si el objetivo es que el tag represente el estado documentado del release.

Orden recomendado:

1. cerrar documentación y runtime del release
2. crear commit limpio
3. crear tag anotado sobre ese commit
4. pushear el tag explícitamente

## Baseline inicial sugerida — 2026-03-29

Esta matriz es una propuesta operativa inicial basada en el estado actual del codebase y el backlog.

No implica que todos estos tags deban crearse de inmediato. Sirve como referencia para:

- canal recomendado
- versión sugerida
- namespace de tag esperado

| Scope | Canal propuesto | Version propuesta | Tag sugerido |
|---|---|---|---|
| Platform | `beta` | `2026.03-beta.1` | `platform/2026.03-beta.1` |
| Auth & Access | `stable` | `2026.03` | `auth/2026.03` |
| Organizations / Agency base | `stable` | `2026.03` | `organizations/2026.03` |
| People 360 | `beta` | `2026.03-beta.1` | `people/2026.03-beta.1` |
| Payroll official | `stable` | `2026.03` | `payroll/2026.03` |
| Projected Payroll | `beta` | `2026.03-beta.1` | `projected-payroll/2026.03-beta.1` |
| Finance runtime | `beta` | `2026.03-beta.1` | `finance/2026.03-beta.1` |
| Admin Team | `beta` | `2026.03-beta.1` | `admin-team/2026.03-beta.1` |
| Admin Center | `beta` | `2026.03-beta.1` | `admin-center/2026.03-beta.1` |
| Ops Health | `beta` | `2026.03-beta.1` | `ops-health/2026.03-beta.1` |
| Cloud & Integrations | `beta` | `2026.03-beta.1` | `cloud-integrations/2026.03-beta.1` |
| Home / Nexa | `beta` | `2026.03-beta.1` | `nexa/2026.03-beta.1` |
| Email Delivery admin surface | `beta` | `2026.03-beta.1` | `email-delivery/2026.03-beta.1` |
| HRIS | `alpha` | `2026.03-alpha.1` | `hris/2026.03-alpha.1` |
| Staff Augmentation | `alpha` | `2026.03-alpha.1` | `staff-augmentation/2026.03-alpha.1` |
| Cost Intelligence | `alpha` | `2026.03-alpha.1` | `cost-intelligence/2026.03-alpha.1` |
| ICO AI / Embedded Intelligence | `alpha` | `2026.03-alpha.1` | `ico-ai/2026.03-alpha.1` |

### Notas de lectura de la baseline

- `stable` no implica necesariamente que todo el dominio esté terminado; implica que el caso principal ya es soportable y comunicable.
- `beta` indica capacidad visible con runtime real, pero todavía sujeta a ajustes relevantes.
- `alpha` indica capacidad con framing fuerte, foundations parciales o implementación no cerrada para uso general.
- features internas o slices muy finos no deberían taguearse por separado salvo que evolucionen como producto casi autónomo.

## Deprecated y sunset

Cuando una capacidad deje de ser el camino recomendado:

- marcar `deprecated`
- documentar fecha o ventana de retiro si aplica
- indicar reemplazo recomendado
- incluirlo en el changelog client-facing si afecta uso real

## Workflow para agentes

Cuando un agente toque una capacidad visible y cambie su madurez o disponibilidad:

1. actualizar la fuente canónica de release si el cambio altera el canal o la disponibilidad
2. actualizar `docs/changelog/CLIENT_CHANGELOG.md` si hay cambio client-facing real
3. actualizar `changelog.md` interno con el cambio operativo
4. dejar nota breve en `Handoff.md`

Si el trabajo solo cambia implementación interna y no altera la experiencia o disponibilidad, no actualizar el changelog client-facing.

## Regla de documentación

La política canónica vive aquí.

Los demás documentos solo deben dejar:

- referencia corta a este documento
- delta breve si cambia el workflow
