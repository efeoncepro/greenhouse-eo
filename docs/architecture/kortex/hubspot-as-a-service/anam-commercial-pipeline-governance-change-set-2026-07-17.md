# ANAM — Commercial pipeline governance change set — 2026-07-17

> **Portal:** HubSpot ANAM `19893546`
> **Estado:** ejecutado y leído de vuelta el 2026-07-17; automatizaciones de tareas quedan como slice controlado pendiente
> **Alcance:** configuración prospectiva; sin backfill ni movimiento masivo de Deals
> **Exclusión explícita:** `Radar 0%` y sus diez Deals no cambian; la precalificación pertenece al objeto Lead

## Objetivo

Convertir los pipelines de Deal desde un inventario de estados hacia un proceso gobernado: entrada desde Lead,
propiedades requeridas al avanzar, Company primaria desde creación, cierre con contexto comercial suficiente,
renovaciones vinculadas conceptualmente a Service y tareas operativas en nuevos movimientos de etapa.

## Change set aprobado

### Formulario de creación de Deal

- mantener los campos globales obligatorios vigentes;
- hacer obligatoria la asociación con una Company, que HubSpot asigna como primaria al crear;
- desactivar la fecha de cierre automática a 60 días; la fecha seguirá siendo obligatoria y deberá ser elegida;
- retirar lógica condicional redundante o mal ubicada del formulario cuando su control pase a stage properties;
- no hacer backfill de Deals existentes.

### Crecimiento — `636797559`

Los IDs de etapa y sus probabilidades permanecen. `Radar 0%` queda intacto.

| Etapa | Stage properties prospectivas |
|---|---|
| Potencial 10% | Sin `monto_original`; la oportunidad ya proviene de un Lead calificado. |
| Calificado 30% | `Paso siguiente` requerido. |
| Interesado 50% | `Paso siguiente` requerido; retirar `Tipo de ingreso` condicional porque ya es globalmente obligatorio. |
| Hot 85% | `Paso siguiente` y `Monto original` requeridos. |
| Cierre ganado 100% | `Países de ejecución`, `Monto original` y `Variación vs. cotizado` requeridos; `Región` visible pero opcional para Chile. Retirar `Resultado de retencion`. |
| Cierre perdido 0% | `Motivo de cierres perdidos` requerido. |
| Desestimado o Desierto | `Motivo de cierres perdidos` requerido. |

Se limita la creación ordinaria de nuevos Deals de Crecimiento a `Potencial 10%`. Superadmins y procesos
gobernados conservan sus excepciones documentadas; no se activa una prohibición general de saltar o retroceder.

### Fidelización/Renovaciones — `636594526`

Los mismos stage IDs se renombran para representar el proceso de renovación sin mover registros:

| Stage ID | Actual | Nuevo label | Probabilidad |
|---:|---|---|---:|
| `939530919` | Potencial 10% | Por revisar | 10% |
| `939530920` | Calificado 30% | Elegibilidad confirmada | 30% |
| `939530921` | Intereado | Contacto iniciado | 50% |
| `1003604760` | Hot 85% | Propuesta en negociación | 85% |
| `939530924` | Cierre ganado | Renovado | Won 100% |
| `939530925` | Cierre perdido | No renovado | Lost 0% |
| `1003604761` | Desestimado o Desierto | No aplica / Desestimado | Lost 0% |

| Etapa nueva | Stage properties prospectivas |
|---|---|
| Por revisar | `Paso siguiente` requerido. |
| Elegibilidad confirmada | `Paso siguiente` requerido. |
| Contacto iniciado | `Paso siguiente` requerido. |
| Propuesta en negociación | `Paso siguiente` requerido. |
| Renovado | `Países de ejecución` requerido; la revisión de Service anterior/sucesor se materializa como tarea humana hasta disponer del materializador idempotente. |
| No renovado | `Motivo de cierres perdidos` requerido. |
| No aplica / Desestimado | `Motivo de cierres perdidos` requerido. |

La creación ordinaria se limita a `Por revisar`. Pipeline membership no autoriza sobrescribir hechos históricos ni
calcular Retención: el movimiento económico permanece derivado desde Services comparables.

### Automatizaciones prospectivas

Las acciones se disparan sólo en futuros movimientos de etapa y se asignan al owner del Deal:

- Crecimiento / Calificado: tarea para definir actividad y ratificar próximo paso;
- Crecimiento / Hot: tarea para actualizar propuesta, línea/productos y fecha de cierre;
- Crecimiento / Ganado: tarea para validar Company, líneas adjudicadas y readiness de Service;
- Renovaciones / Por revisar: tarea para validar Service de origen, vigencia y elegibilidad;
- Renovaciones / Contacto iniciado: tarea para registrar actividad y próximo paso;
- Renovaciones / Propuesta en negociación: tarea para actualizar propuesta y fecha de cierre;
- Renovaciones / Renovado: tarea para validar lineage Service anterior/sucesor y valores comparables;
- Renovaciones / No renovado: tarea para validar motivo y tratamiento de churn.

No se activa el workflow antiguo que asigna `Venta nueva` por pipeline. No hay enrolamiento/backfill masivo.

Estas tareas no se publicaron en este change set. El editor de pipeline las materializa como workflows separados;
su alta exige owner, vencimiento, notificación y prueba de entrada futura por etapa. Crear las ocho acciones sin
ese contrato habría introducido una ola operativa difícil de distinguir de tareas reales. Quedan diseñadas y
approval-gated como el siguiente slice, sin afectar la validez de las compuertas ya activas.

## Evidencia de ejecución live

| Control | Readback del portal `19893546` |
|---|---|
| Formulario de Deal | Asociación con Company marcada obligatoria; guardado confirmado por HubSpot. |
| Fecha de cierre | Automatización de fecha predeterminada a 60 días desactivada. La fecha sigue siendo campo requerido. |
| Growth stage logic | `Calificado`, `Interesado`, `Hot`, `Cierre ganado`, `Cierre perdido` y `Desestimado` muestran una regla de lógica; `Potencial` y `Radar 0%` no muestran regla. |
| Growth creación | Regla activa; única etapa permitida y predeterminada: `Potencial 10%`. `Radar 0%` no quedó seleccionado. |
| Renovación labels | Los siete labels nuevos quedaron guardados sobre los mismos stage IDs y probabilidades. |
| Renovación stage logic | Las siete etapas muestran una regla de lógica, con requiredness según las tablas anteriores. |
| Renovación creación | Regla activa; única etapa permitida y predeterminada: `Por revisar`. |
| Reglas no activadas | Omitir etapas, retroceder, restringir edición y aprobación continúan desactivadas. |
| Registros históricos | No hubo movimiento, backfill ni edición masiva de Deals. Las reglas actúan al crear o cambiar etapa. |
| Workflows heredados | `1805870398` y `1805693705` permanecen desactivados y no deben activarse. |

## Readiness y rollback

- snapshot: inventario live del 2026-07-17 con dos pipelines, cero reglas globales y stage logic vigente;
- rollback de labels: restaurar labels anteriores sobre los mismos IDs;
- rollback de requiredness: retirar la propiedad de la etapa o desmarcar `Required`;
- rollback de creación: desactivar la regla que limita la etapa inicial;
- rollback de automatización: apagar la acción/workflow prospectivo; las tareas ya creadas no se borran
  automáticamente;
- los 1.241 Deals existentes no se mueven ni se completan automáticamente.

## Gates de aceptación

1. readback de labels, probabilities y stage IDs;
2. cada etapa muestra exactamente las propiedades definidas y requiredness correcta;
3. Company es obligatoria al crear manualmente un Deal;
4. fecha de cierre automática queda apagada;
5. creación ordinaria sólo permite la primera etapa aprobada de cada pipeline;
6. automatizaciones de tareas permanecen pendientes de un slice controlado; no se creó una ola histórica;
7. `Radar 0%` y sus diez Deals conservan configuración y etapa;
8. workflows heredados que asignan `Venta nueva` continúan desactivados.

## Resultado del gate

Gates 1–5, 7 y 8: **PASS live**. Gate 6: **PASS de seguridad / rollout pendiente**; no se publicaron tareas sin
contrato operativo. El estado global es **CONDITIONAL PASS**: el gobierno de captura y avance está live, mientras
las ocho tareas de acompañamiento siguen diseñadas pero no activas.
