# DOCUMENTATION_OPERATING_MODEL_V1.md

## Objetivo
Reducir duplicacion documental sin perder continuidad, trazabilidad ni contexto para producto, UI y deploy.

## Regla base
Cada cambio debe documentarse, pero no cada documento debe repetir la historia completa.

## Estructura canonica

### 1. Documento maestro
- `GREENHOUSE_ARCHITECTURE_V1.md`
- Aqui viven principios, decisiones estables, fases y contratos de producto.
- No registrar aqui el detalle de cada turno.

### 2. Contexto operativo
- `project_context.md`
- Aqui vive el estado actual del repo, stack, rutas, librerias activas, deploy y restricciones.
- Debe responder: que existe hoy, que se usa hoy, que sigue pendiente hoy.

### 3. Continuidad de turno
- `Handoff.md`
- Aqui solo deben quedar:
  - objetivo del turno
  - cambios aplicados
  - validacion
  - riesgos o pendientes
- Formato corto. No duplicar arquitectura.

### 4. Registro de cambios
- `changelog.md`
- Solo cambios de comportamiento, estructura o workflow.
- Una o pocas lineas por cambio real.

### 5. Guias especializadas
- Docs tematicas como:
  - `GREENHOUSE_EXECUTIVE_UI_SYSTEM_V1.md`
  - `SKY_TENANT_EXECUTIVE_SLICE_V1.md`
- Deben contener contrato y decisiones de su dominio, no repetir contexto general del repo.

## Regla de compresion

Cuando un cambio toque varios documentos:
- escribir el detalle completo una sola vez en el documento canonico correcto
- en los otros documentos dejar solo el delta y una referencia al documento canonico

## Plantilla minima por cambio

### README
- una linea de estado si cambia stack, enfoque o referencia principal

### project_context
- que tecnologia o libreria se activo
- donde vive
- para que se usara

### Handoff
- que se hizo
- que se valido
- que queda pendiente

### changelog
- una linea de impacto

## Regla para UI y librerias

Para cambios de UI, charts, iconos o assets:
- dejar la regla visual o de seleccion en la doc especializada o skill correspondiente
- dejar en `project_context.md` solo la fuente de verdad de librerias y wrappers activos
- no repetir listas largas de componentes en todos los documentos

## Regla para tokens

La documentacion debe:
- maximizar referencias cortas
- minimizar texto duplicado
- evitar explicar el mismo cambio con redacciones distintas en 4 archivos

Si un documento ya tiene suficiente contexto y otro solo necesita continuidad, enlazar o mencionar, no reescribir.
