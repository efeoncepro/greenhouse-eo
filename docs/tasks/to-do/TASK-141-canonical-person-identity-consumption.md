# TASK-141 - Canonical Person Identity Consumption

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Medio`
- Status real: `Diseño`
- Rank: `56`
- Domain: `identity / platform / access`

## Summary

Institucionalizar en Greenhouse una regla canónica de consumo de identidad humana: la raíz de las superficies de lectura, administración, preview, recipients y resolución cross-module debe ser la persona canónica, no `client_user`.

Esta task no existe para cambiar una sola pantalla. Existe para dejar explícito cómo debe funcionar el objeto persona en el producto y cómo deben consumirlo los módulos cuando necesiten representar un humano, resolver un destinatario o previsualizar acceso.

## Why This Task Exists

La arquitectura ya empuja una lectura `person-first`, pero el repo todavía muestra drift en consumers reales:

- `/admin/views` arma su preview desde una base `client_user-first`
- notifications ya mostró problemas cuando resolvía humanos desde `client_user` en vez de persona
- algunos contratos todavía mezclan:
  - identidad humana
  - faceta operativa
  - principal de acceso al portal

Eso produce ambigüedad funcional:

- una persona puede existir canónicamente y no aparecer donde debería
- un módulo puede tratar al login como si fuera la persona
- nuevos consumers pueden nacer sobre el modelo equivocado aunque la arquitectura diga otra cosa

La task existe para volver canónica y reusable la regla correcta.

## Goal

- documentar y cerrar el contrato institucional del objeto persona en Greenhouse
- dejar explícita la jerarquía:
  - `identity_profile` / persona canónica
  - `member` / faceta operativa
  - `client_user` / principal o capacidad de acceso portal
- definir reglas de consumo por tipo de surface
- identificar consumers que todavía leen identidad humana desde `client_user`
- dejar una estrategia de migración segura y gradual

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_INTERNAL_IDENTITY_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`

Reglas obligatorias:

- la persona humana no debe modelarse con `client_user` como raíz
- `client_user` puede seguir existiendo como principal de acceso y sesión
- `member` no reemplaza a persona; expresa una faceta operativa
- ningún módulo nuevo debe nacer `client_user-first` cuando el problema real sea representar o resolver un humano
- donde un consumer siga siendo `userId`-scoped por diseño, eso debe quedar explícito y justificado

## Dependencies & Impact

### Depends on

- arquitectura 360 e identidad vigente
- `TASK-134` - notification identity model hardening
- `TASK-136` - gobernanza de vistas cerrada

### Impacts to

- notifications
- `/admin/views`
- futuras surfaces admin/person/people
- recipient resolution
- preview resolution
- cualquier consumer que hoy trate `client_user` como identidad humana raíz

### Files owned

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_INTERNAL_IDENTITY_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `project_context.md`
- `Handoff.md`
- `docs/tasks/to-do/TASK-140-admin-views-person-first-preview.md`
- `docs/tasks/to-do/TASK-134-notification-identity-model-hardening.md`

## Current Repo State

### Ya existe

- arquitectura que empuja persona canónica como raíz
- `identity_profile` como capa de identidad humana
- `member` como faceta fuerte para lo operativo
- `client_user` como principal de acceso y sesión
- notifications ya tiene parte del carril `person-first`
- `/admin/views` ya tiene la necesidad visible de esta corrección

### Gap actual

- falta una policy institucional simple y reusable
- no todos los consumers saben cuándo usar persona, `member` o `client_user`
- algunas surfaces ya muestran el drift al usuario
- los límites de lo que seguirá siendo `userId`-scoped no están suficientemente formalizados

## Scope

### Slice 1 - Contrato canónico del objeto persona

- describir la entidad humana canónica en lenguaje de producto y arquitectura
- definir qué representa cada capa:
  - persona
  - `member`
  - `client_user`
- dejar reglas de precedencia y resolución

### Slice 2 - Reglas de consumo por tipo de surface

- definir cuándo una surface debe partir desde persona
- definir cuándo corresponde partir desde `member`
- definir cuándo sí corresponde consumir `client_user`
- dejar explícitos los casos que siguen siendo `userId`-scoped

### Slice 3 - Inventario de drift actual

- listar consumers actuales que nacen desde `client_user-first`
- clasificarlos por severidad:
  - conceptual
  - funcional
  - tolerable transicional

### Slice 4 - Estrategia de cutover

- definir cómo migrar consumers sin romper compatibilidad
- explicitar qué carriles deben salir como follow-on específicos
- formalizar `TASK-140` como consumer follow-on de `/admin/views`
- alinear el framing de notifications con `TASK-134`

## Out of Scope

- reimplementar en esta misma task todos los consumers afectados
- rediseñar el modelo completo de auth
- eliminar `client_user`
- crear una nueva entidad si el modelo actual ya permite resolver persona canónica

## Acceptance Criteria

- [ ] existe una definición institucional clara del objeto persona canónico en Greenhouse
- [ ] queda explícita la diferencia entre persona, `member` y `client_user`
- [ ] hay reglas concretas de cuándo cada consumer debe usar cada entidad
- [ ] quedan identificados los consumers con drift actual
- [ ] `TASK-140` y `TASK-134` quedan claramente posicionadas como follow-ons o carriles dependientes de esta política

## Verification

- validación documental del contrato en arquitectura + task
- consistencia con:
  - `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `docs/architecture/GREENHOUSE_INTERNAL_IDENTITY_V1.md`
  - `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- revisión manual de que la task permita derivar implementaciones concretas sin ambigüedad

## Open Questions

- el nombre de la entidad canónica visible al equipo de producto debería seguir siendo `identity_profile` o conviene hablar simplemente de `persona` en surfaces y docs operativas
- qué surfaces deberían migrarse primero después de cerrar esta task:
  - notifications
  - `/admin/views`
  - people/admin surfaces relacionadas

## Follow-ups

- `TASK-140` - cutover del preview de `/admin/views`
- `TASK-134` - cierre institucional del recipient model en notifications
