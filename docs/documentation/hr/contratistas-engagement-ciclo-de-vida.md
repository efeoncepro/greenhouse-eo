> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.2
> **Creado:** 2026-05-31 por Claude (TASK-975)
> **Ultima actualizacion:** 2026-06-01 por Claude (TASK-984 — drawer de cierre operable en el workbench)
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

## Cierre del contractor (TASK-797)

Cerrar un contractor es un **flujo propio — NUNCA un finiquito laboral**. No usa "Calcular finiquito", no aplica causales DT, no toca el offboarding de empleados dependientes ni reactiva relaciones.

El cierre tiene **dos pasos** (sobre el ciclo de vida del engagement):

1. **Iniciar cierre** → el engagement pasa a **"En cierre"** (winding-down). Desde ahí **no se aceptan nuevas work submissions**, pero los payables de trabajo ya aprobado sí se liquidan.
2. **Ejecutar cierre** → el engagement queda **"Finalizado"**. Está **gateado por un checklist (readiness)**.

**El checklist (readiness)** muestra los **bloqueadores** antes de cerrar:

| Bloqueador | Qué significa |
|---|---|
| Work submissions abiertas | Hay trabajo sin resolver (borrador/enviado/en disputa/aprobado). |
| Payables abiertos | Hay pagos sin liquidar. |
| Falta ref de terminación del provider | Solo para carril EOR/plataforma (Deel/Remote/Oyster). |
| Riesgo de clasificación bloqueante | Hay revisión legal pendiente. |

Todos los bloqueadores son **reconocibles (acknowledge)**: el operador puede cerrar de todas formas **declarando una razón** (queda auditado). Sin reconocerlos, el cierre final queda bloqueado.

Además aparece un **recordatorio de access offboarding** (cuando el contractor tiene usuario del portal): el cierre **no desactiva accesos** — eso es un proceso aparte.

**Invoices post-cierre**: tras "Finalizado", **no se crean nuevos pagos** salvo que se habilite explícitamente la política "permitir invoices post-cierre" (decisión auditada). Un engagement **cancelado** nunca permite pagos.

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
