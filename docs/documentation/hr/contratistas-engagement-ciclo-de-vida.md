> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-05-31 por Claude (TASK-975)
> **Ultima actualizacion:** 2026-05-31 por Claude (TASK-975)
> **Documentacion tecnica:** [GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md)

# Engagement de Contractor — Detalle, Ciclo de Vida y Clasificación (HR)

## Para qué sirve

Es la parte del workbench HR (`/hr/contractors`) donde HR **gestiona un engagement de contractor** end-to-end: ver todos sus términos, mover su ciclo de vida (activar/pausar/cerrar/cancelar), **revisar el riesgo de clasificación laboral** y editar los términos del contrato.

Hasta antes de esto, el workbench HR solo mostraba la cola de revisión + el editor de compensación (la tarifa). Ahora HR tiene el detalle completo + los controles de ciclo de vida + la revisión de clasificación.

## Cómo se usa (desde el inspector)

1. Seleccionás un engagement en la **cola de revisión**.
2. El **inspector** (columna derecha) muestra el resumen + los **controles de ciclo de vida** (solo las transiciones válidas desde el estado actual) + dos accesos: **Ver detalle completo** y **Revisar clasificación**.

## Detalle del engagement

"Ver detalle completo" abre un panel lateral con todos los términos agrupados:

- **Términos económicos**: modelo de pago, tipo de tarifa, monto acordado, cadencia, monedas, política de bono.
- **Tributario**: responsable tributario, tasa de retención (honorarios CL), si requiere invoice / aprobación de trabajo.
- **Proveedor**: contrato del proveedor, ID del trabajador, política FX (cuando aplica, ej. Deel).
- **Fechas**: inicio y término.
- **Máquina de estados**: el estado actual + las transiciones disponibles.
- **Clasificación**: los factores de riesgo (presentes/ausentes) + el estado de riesgo.

Desde el header del detalle podés **Editar términos**.

## Ciclo de vida (estados)

| Estado | Qué significa |
|---|---|
| Borrador | Recién creado, sin activar. |
| En revisión | Pendiente de aprobación interna. |
| Activo | Vigente y operativo. |
| En pausa | Suspendido temporalmente. |
| En cierre | Iniciando el cierre. |
| Finalizado | Cerrado (terminal). |
| Cancelado | Anulado (terminal). |

La UI **solo ofrece las transiciones válidas** del estado actual. Las transiciones de cierre/pausa/cancelación piden **motivo**. Los estados terminales (finalizado/cancelado) no admiten más cambios.

> **Importante**: "Activar" **desaparece** cuando el riesgo de clasificación está **bloqueante** (requiere revisión legal o bloqueado). Primero hay que revisar la clasificación.

## Revisión de clasificación laboral (riesgo de reclasificación)

Un contractor mal modelado puede ser, en la práctica, un empleado encubierto. Greenhouse evalúa **7 factores de subordinación** (horario fijo impuesto, supervisión directa, exclusividad, dependencia económica, continuidad inmediata de relación laboral, cargo interno indistinguible, pagos recurrentes sin entregables).

"Revisar clasificación" abre un diálogo donde HR:

- marca los factores presentes (el estado de riesgo se **recalcula al instante**),
- marca **"revisado"** (un engagement sin revisar nunca queda "sin riesgo"),
- opcionalmente **escala a bloqueado** (bloqueo manual explícito),
- deja un **motivo**.

Resultados posibles: **Sin riesgo** / **Necesita revisión** / **Requiere revisión legal** / **Bloqueado**. Si un engagement activo escala a bloqueante, el sistema lo **pausa automáticamente**.

> **Separación de funciones (SoD)**: quien revisa la clasificación usa una capability distinta (`hr.contractor_classification:approve`, restringida) — idealmente una firma distinta a quien creó el engagement.

## Qué NO hace esta superficie

- No paga ni prepara payables (eso es Finanzas, `/finance/contractor-payments`).
- No crea engagements ni convierte un empleado en contractor (eso es onboarding, TASK-976).
- No toca nómina, `contract_type` ni finiquito (boundary EPIC-013).

## Quién puede entrar

Acceso al workbench: route_group `hr` o `efeonce_admin` (viewCode `equipo.contratistas`). Editar términos / mover el ciclo de vida requiere `hr.contractor_engagement:update`. Revisar clasificación requiere `hr.contractor_classification:approve` (EFEONCE_ADMIN, FINANCE_ADMIN o HR_MANAGER).

> Detalle técnico: vistas `src/views/greenhouse/contractors/{ContractorEngagementDetailDrawer,ContractorLifecycleControls,ContractorClassificationReviewDialog,ContractorEngagementTermsDrawer}.tsx`; endpoints `GET/PATCH /api/hr/contractors/[id]` (action transition|review_classification|update); helpers `transitionContractorEngagement`/`reviewContractorClassification`/`updateContractorEngagement`. Spec: [GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_CONTRACTOR_ENGAGEMENTS_PAYABLES_ARCHITECTURE_V1.md).
