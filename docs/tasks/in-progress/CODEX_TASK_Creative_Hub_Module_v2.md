# CODEX TASK — Creative Hub: Runtime Gap Closure (v2)

## Resumen

Esta task no parte desde cero. `Creative Hub` ya existe en runtime como capability dentro del framework genérico de `Capabilities`, pero todavía no está realmente cerrado respecto del alcance que declaraba el brief original.

Ruta activa:
- `/capabilities/creative-hub`

Backend y composición activa:
- `GET /api/capabilities/creative-hub/data`
- `src/config/capability-registry.ts`
- `src/lib/capability-queries/creative-hub.ts`
- `src/lib/capability-queries/shared.ts`
- `src/lib/capability-queries/helpers.ts`

Objetivo de esta v2:
- cerrar los gaps reales entre el brief original y la implementación runtime
- mantener `Creative Hub` alineado con el modelo de capabilities y con Greenhouse 360
- evitar inventar una identidad paralela de capability, cliente, proyecto o asset

## Estado real del módulo

### Ya implementado

- `Creative Hub` existe como capability surface dentro del framework genérico de `Capabilities`
- el módulo ya tiene:
  - registry entry
  - route dinámica
  - endpoint de datos
  - query builder server-side
- runtime actual ya expone:
  - cards creativas base
  - sección `Revenue Enabled`
  - sección `Creative Supply Chain`
- el módulo consume read models compartidos sobre:
  - `greenhouse.clients`
  - `notion_ops.tareas`
  - `notion_ops.proyectos`

### Gap operativo actual

`Creative Hub` no debería seguir considerándose “complete” como brief ejecutado tal cual por estas razones:

1. La regla de activación runtime no coincide con la arquitectura ni con la task original
- el brief pedía activación con al menos uno de:
  - `agencia_creativa`
  - `produccion_audiovisual`
  - `social_media_content`
- runtime hoy deja el módulo visible por `businessLine = globe` o por match parcial de servicio

2. La capa `Brand Intelligence` no está realmente implementada
- el brief original la definía como una de las 3 capas estructurales del módulo
- runtime hoy no registra ni alimenta esa capa como sección real

3. El `CSC Pipeline Tracker` actual es aproximado, no canónico
- el brief proponía `fase_csc` explícita o derivada y un pipeline por fase
- runtime hoy usa heurísticas sobre snapshots agregados (`queued`, `review`, `blocked`, etc.) para simular fases CSC

4. Algunas métricas y alerts siguen siendo proxies
- `stuck assets` no sale todavía de assets/fases reales con aging real por fase
- varias métricas siguen basadas en aproximaciones útiles para UI, pero no en el modelo de datos que prometía el brief

## Alineación obligatoria con arquitectura

Esta task debe revisarse contra:
- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_SERVICE_MODULES_V1.md`
- `docs/architecture/Greenhouse_Capabilities_Architecture_v1.md`

Reglas obligatorias:
- `Creative Hub` sigue siendo capability surface, no objeto producto canónico nuevo
- el objeto canónico producto/capability sigue viviendo en:
  - `greenhouse.service_modules`
  - `greenhouse.client_service_modules`
- el módulo debe seguir anclado al cliente canónico:
  - `greenhouse.clients.client_id`
- no crear identidades locales nuevas para:
  - proyectos
  - sprints
  - assets
  - pipeline phases
- los read models deben salir de datos compartidos o extensiones justificadas, no de tablas silo solo para `Creative Hub`

Resultado del contraste 2026-03-14:
- el módulo sí está alineado estructuralmente con arquitectura
- pero no está completo respecto del alcance funcional de su brief histórico
- por eso el brief original pasa a ser referencia histórica y esta `v2` queda como task activa

## Complementos backend ya cerrados en esta v2

Estos ajustes ya quedaron listos para que Claude implemente frontend sobre contrato real:

- activación de `Capabilities` corregida:
  - si un módulo define `requiredBusinessLines` y `requiredServiceModules`, runtime ahora exige ambos gates
  - `Creative Hub` ya no se activa solo por pertenecer a `globe`
- registry actualizado:
  - `Creative Hub` ya acepta activación por:
    - `agencia_creativa`
    - `produccion_audiovisual`
    - `social_media_content`
  - se agregaron cards reales para `Brand Intelligence`
- query builder actualizado:
  - `src/lib/capability-queries/creative-hub-runtime.ts` construye un snapshot detallado de tareas creativas
  - si `fase_csc` existe en `notion_ops.tareas`, se usa
  - si no existe, runtime la deriva server-side de forma determinística a partir de `estado`, revisión abierta y señales de producción
- `Brand Intelligence` ya sale en el payload de `/api/capabilities/creative-hub/data` con:
  - `brand-header`
  - `creative-brand-kpis`
  - `creative-rpa-trend`
- `CSC Pipeline Tracker` ya no sale de buckets agregados:
  - `csc-pipeline`
  - `csc-metrics`
  - `stuck-assets`
  ahora se calculan desde tareas individuales con fase y aging real
- `Revenue Enabled` quedó endurecido para usar cierres/tareas reales cuando la data existe, con fallback al snapshot agregado cuando no existe base suficiente

Handoff backend para frontend:
- Claude no necesita inventar `Brand Intelligence`; la sección ya llega en `module.cards` + `cardData`
- Claude debe asumir que `metrics-row` mostrará `Proximamente` cuando el backend entregue `value: null`
- Claude puede renderizar `creative-rpa-trend` como `chart-bar` usando el contrato genérico existente
- si una cuenta no tiene suficiente data creativa, el backend ya devuelve empty states compatibles con el render actual

## Alcance v2

### A. Corregir la activación del módulo

El gating runtime debe responder a contratación real del servicio, no solo a pertenecer a `globe`.

Resultado esperado:
- `Creative Hub` solo se activa cuando el cliente tenga al menos uno de:
  - `agencia_creativa`
  - `produccion_audiovisual`
  - `social_media_content`
- el resolver no debe dejar visible el módulo solo por `businessLine`

### B. Implementar la capa Brand Intelligence real

La segunda capa del módulo debe existir como sección visible y con contrato real, no solo como intención del brief.

Resultado esperado:
- registry con sección `Brand Intelligence`
- cards reales para:
  - `First Time Right`
  - `Brand Consistency`
  - `Knowledge Base` o un placeholder explícito controlado
  - `RpA Trend`
- si alguna métrica todavía no tiene fuente real, exponerla como `comingSoon` de forma honesta en el contrato server-side

### C. Reemplazar el CSC heurístico por modelo de fase explícito

El tracker de pipeline debe dejar de inferir fases con repartos artificiales sobre agregados.

Resultado esperado:
- definir `fase_csc` como campo explícito o derivado de manera determinística
- si no existe aún en Notion, resolverlo server-side con una regla versionada y visible
- construir `csc-pipeline`, `csc-metrics` y `stuck-assets` desde esa fase real

Regla:
- no crear una identidad paralela de asset
- puede usarse un read model derivado o una view, pero no un silo nuevo sin ancla clara

### D. Endurecer métricas y alerts para lectura operativa real

Las métricas deben seguir siendo ejecutivas, pero con mejores anclas de datos.

Resultado esperado:
- `stuck-assets` calculado desde aging real por item/fase
- `bottleneck` basado en fase real y no solo en buckets agregados
- `Revenue Enabled` y `Brand Intelligence` deben distinguir claramente:
  - métricas reales
  - métricas estimadas
  - métricas `comingSoon`

## Criterios de aceptación

- `Creative Hub` deja de activarse para clientes `globe` sin servicio creativo contratado
- la capa `Brand Intelligence` existe realmente en registry + payload server-side
- el pipeline CSC usa una fase explícita o una derivación determinística documentada
- `stuck-assets` y `bottleneck` dejan de depender solo de heurísticas de proyecto agregado
- el módulo sigue viviendo dentro de `Capabilities` sin crear un objeto canónico paralelo
- `pnpm exec eslint` pasa sobre archivos tocados

## Archivos objetivo probables

- `src/config/capability-registry.ts`
- `src/lib/capabilities/resolve-capabilities.ts`
- `src/lib/capability-queries/creative-hub.ts`
- `src/lib/capability-queries/shared.ts`
- `src/lib/capability-queries/helpers.ts`
- `src/types/capabilities.ts`

## Fuera de alcance

- crear un route group nuevo fuera de `Capabilities`
- convertir `Creative Hub` en un maestro de producto paralelo
- duplicar identidades de cliente, proyecto o asset
- rehacer toda la arquitectura de capabilities
