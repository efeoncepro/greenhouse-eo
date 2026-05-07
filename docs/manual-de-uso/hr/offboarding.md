# Offboarding

> **Tipo de documento:** Manual de uso
> **Version:** 1.1
> **Creado:** 2026-05-04 por Codex
> **Ultima actualizacion:** 2026-05-07 por Codex
> **Modulo:** HR / Workforce
> **Ruta en portal:** `/hr/offboarding`
> **Documentacion relacionada:** [Offboarding laboral y contractual](../../documentation/hr/offboarding.md), [GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_WORKFORCE_OFFBOARDING_ARCHITECTURE_V1.md)

## Para que sirve

La vista `Offboarding` permite abrir y operar casos de salida laboral o contractual sin confundirlos con desactivaciones de acceso.

## Antes de empezar

- Necesitas acceso a la vista `equipo.offboarding`.
- Para crear o avanzar casos necesitas capability `hr.offboarding_case`.
- Debes conocer la causal, la fecha efectiva de salida y el ultimo dia trabajado antes de programar o ejecutar.

## Crear un caso manual

1. Entra a `Personas y HR > Supervision > Offboarding`.
2. En `Abrir caso manual`, selecciona el colaborador.
3. Elige la causal.
4. Completa `Salida efectiva` y `Ultimo dia`.
5. Agrega notas si hay contexto operativo o legal relevante.
6. Haz clic en `Crear`.

El caso queda con lane resuelta automaticamente. Si corresponde a payroll interno Chile, Greenhouse marca que requiere cierre de payroll y reconciliacion de leave. Desde ese caso puedes calcular el finiquito, aprobar el settlement y avanzar el documento formal en el carril `Finiquito`.

## Revisar contratos proximos o vencidos

Usa `Revisar contratos` para abrir casos `needs_review` cuando hay `contractEndDate` proximo o vencido.

Ese boton no ejecuta offboarding, no desactiva usuarios y no fija una fecha de termino laboral. Solo abre una revision para que HR confirme si la relacion termina, se renueva o cambia.

## Avanzar estados

La tabla de casos activos muestra la accion disponible:

- `Aprobar`: valida una salida con fecha efectiva.
- `Programar`: requiere ultimo dia trabajado.
- `Ejecutar`: marca el caso como ejecutado.

Si el ultimo dia trabajado cae despues de la salida efectiva, debes registrar una razon explicita antes de avanzar. Esa excepcion queda auditada.

## Desde People 360

En la ficha HR de una persona, Greenhouse muestra:

- fecha de ingreso
- fin de contrato si existe
- salida efectiva si hay caso activo
- ultimo dia trabajado si hay caso activo
- estado de offboarding
- historial de relaciones persona ↔ entidad legal cuando existe

Si no hay caso activo, el CTA `Iniciar offboarding` abre la vista con el colaborador preseleccionado.

Si una persona paso de dependiente a contractor/honorarios, People 360 debe mostrar ambas etapas por separado: la relacion laboral cerrada y la relacion contractor u honorarios activa. No uses ese historial como instruccion de pago: los pagos contractor se operan por el flujo contractor/payables futuro, no por finiquito ni por ajuste de nomina.

## Finiquito

Cuando el caso corresponde a renuncia Chile dependiente con payroll interno, Payroll puede calcular el final settlement desde el caso aprobado o agendado.

El calculo exige capability `hr.final_settlement`, usa `effective_date` y `last_working_day`, y queda separado de la nomina mensual. Si el settlement ya fue aprobado y necesita cambio, se cancela con razon auditable y se recalcula una nueva version.

## Que no hacer

- No uses `Desactivar` como sustituto de salida laboral.
- No uses `contractEndDate` como fecha efectiva de salida sin abrir caso.
- No emitas documento formal desde esta vista; eso pertenece a la lane documental posterior.
- No cierres un caso si faltan handoffs, assets, permisos o aprobaciones criticas.

## Problemas comunes

### El sistema dice que ya existe un caso activo

Revisa la tabla de casos activos o la ficha People 360. Solo puede existir un caso activo por relacion laboral o, como fallback, por colaborador.

### La accion de programar falla

Confirma que el caso tenga `Salida efectiva` y `Ultimo dia`. El ultimo dia no puede ser posterior a la salida efectiva salvo que exista una razon explicita.

### SCIM desactivo a alguien y aparecio un caso identity-only

Es esperado. SCIM es una senal de identidad, no una decision laboral. HR debe revisar si corresponde abrir o completar un offboarding laboral real.

## Referencias tecnicas

- `greenhouse_hr.work_relationship_offboarding_cases`
- `greenhouse_hr.work_relationship_offboarding_case_events`
- `src/lib/workforce/offboarding/**`
- `/api/hr/offboarding/cases`
