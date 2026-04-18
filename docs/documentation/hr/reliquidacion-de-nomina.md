# Reliquidacion de Nomina

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-04-15 por Julio Reyes + Claude
> **Ultima actualizacion:** 2026-04-15 por Julio Reyes + Claude
> **Documentacion tecnica:** [GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md)

---

## Que es la reliquidacion

La reliquidacion es el proceso de **corregir una nomina que ya fue exportada y pagada**. Sucede cuando despues de cerrar un mes se detecta un error en el calculo, un bono retroactivo que no se incluyo, o una correccion contractual que afecta la remuneracion.

Antes de esta funcionalidad, corregir una nomina exportada requeria trabajo manual fuera del sistema. Ahora Greenhouse permite reabrir el periodo, corregir las entradas, y re-exportar — manteniendo un registro completo de que cambio, quien lo cambio, y por que.

---

## Conceptos clave

### Periodo de nomina

Cada mes tiene un periodo de nomina que pasa por estos estados:

```
borrador → calculado → aprobado → exportado → [reliquidado]
```

Un periodo **exportado** es un periodo cerrado: ya se generaron los archivos de pago (Previred, PDFs) y se enviaron a los colaboradores. En operacion normal, un periodo exportado no se toca mas.

La reliquidacion agrega una transicion extra: **exportado → reabierto** (reopened). Esto permite volver a editar las entradas de ese periodo.

### Entrada de nomina (payroll entry)

Cada colaborador tiene una entrada por periodo. La entrada contiene el desglose de haberes, descuentos, bruto y liquido.

Cuando se reliquida, la entrada original **no se borra ni se modifica**. En su lugar se crea una **version nueva**:

| Concepto | Version 1 (original) | Version 2 (reliquidada) |
|---|---|---|
| Estado | Archivada (is_active = false) | Activa (is_active = true) |
| Visible en exportaciones | No | Si |
| Editable | No | Si (mientras el periodo este reabierto) |

La version 1 queda como registro historico inmutable. La version 2 es la que se usa para todo: exportaciones, correos, finanzas.

### Ventana de reapertura

No se puede reabrir una nomina indefinidamente. Existe una **ventana de 45 dias** desde la fecha de exportacion. Despues de esa ventana, el sistema no permite la reapertura.

Ejemplo: si la nomina de Marzo 2026 se exporto el 5 de abril de 2026, se puede reabrir hasta el 20 de mayo de 2026.

### Auditoria de reapertura

Cada reapertura genera un **registro de auditoria inmutable** que captura:

- Quien reabrio (usuario)
- Cuando se reabrio (fecha/hora)
- Por que se reabrio (razon seleccionada + detalle opcional)
- Estado al momento de reabrir (snapshot de datos Previred si aplica)

Este registro no se puede editar ni borrar. Es la evidencia de que la reapertura fue intencional y justificada.

---

## Como funciona paso a paso

### Paso 1 — Identificar que la nomina necesita correccion

El operador detecta un error en una nomina ya exportada. Puede ser:

- **Error de calculo** — un monto se calculo mal
- **Bono retroactivo** — se otorgo un bono que no estaba en la nomina original
- **Correccion contractual** — cambio en condiciones que afecta retroactivamente
- **Otro** — cualquier otra razon (requiere detalle escrito obligatorio)

### Paso 2 — Reabrir el periodo

En la vista de nominas (Nominas > Historial), el operador:

1. Selecciona el periodo exportado que necesita correccion
2. Hace clic en **"Reabrir para Reliquidar"**
3. El sistema muestra un dialogo de confirmacion que indica:
   - Cuantos dias quedan en la ventana de reapertura
   - Que la accion generara un registro de auditoria
4. El operador selecciona la razon de reapertura
5. Confirma

El periodo pasa de estado **exportado** a **reabierto**.

> Si la ventana de 45 dias ya paso, el boton no aparece y el sistema muestra un mensaje indicando que la ventana expiro.

### Paso 3 — Editar las entradas que necesitan correccion

Con el periodo reabierto, el operador puede editar cualquier entrada de nomina. El flujo es identico al de un periodo en estado "calculado":

1. Abrir la entrada del colaborador afectado
2. Modificar los montos necesarios (haberes, bonos, descuentos)
3. Guardar

Al guardar, el sistema automaticamente:

- Marca la entrada original (v1) como **archivada**
- Crea una nueva entrada (v2) con los valores corregidos
- Vincula v1 → v2 para trazabilidad
- Calcula los **deltas** (diferencias) entre v1 y v2

El operador puede ver ambas versiones en el historial de versiones de cada entrada.

### Paso 4 — Verificar y re-exportar

Una vez corregidas todas las entradas necesarias:

1. Revisar los montos actualizados en el resumen del periodo
2. Marcar el periodo como "calculado" nuevamente
3. Aprobar
4. Exportar

La exportacion genera archivos nuevos que **solo incluyen las entradas activas** (v2 para los corregidos, v1 para los que no cambiaron). Las entradas archivadas no aparecen en ningun archivo de exportacion.

### Paso 5 — Impacto en Finanzas (automatico)

Cuando una entrada se reliquida, el sistema automaticamente:

1. Detecta la diferencia (delta) entre la version original y la corregida
2. Crea un **ajuste contable** en el modulo de Finanzas
3. Este ajuste refleja solo la diferencia — no duplica el gasto completo

Ejemplo:
- V1 original: liquido = $1.500.000
- V2 corregida: liquido = $1.650.000
- Delta: +$150.000 → se registra como ajuste en Finanzas

El ajuste usa el **monto liquido** (no el bruto) porque en Chile los descuentos de seguridad social son de cargo del trabajador — el costo real para la empresa es el liquido mas las cotizaciones patronales. El delta refleja la diferencia en ese costo real.

Este proceso es completamente automatico via el sistema reactivo de eventos de Greenhouse.

---

## Que se ve en la interfaz

### Badge de reliquidacion

Las entradas que fueron reliquidadas muestran un **indicador visual** ("v2 — reliquidada") junto al nombre del colaborador. Esto permite identificar rapidamente cuales entradas fueron corregidas vs cuales son originales.

### Historial de versiones

Cada entrada tiene un panel lateral de **historial de versiones** que muestra:

- Todas las versiones (v1, v2, ...) en orden cronologico
- El estado de cada version (activa o archivada)
- Los montos bruto y liquido de cada version
- La fecha de creacion de cada version
- Link para descargar el PDF de cada version

### Dialogo de reapertura

Al hacer clic en "Reabrir para Reliquidar", aparece un dialogo que muestra:

- Estado actual del periodo
- Dias restantes en la ventana de reapertura
- Selector de razon (error de calculo, bono retroactivo, correccion contractual, otro)
- Campo de detalle (obligatorio si la razon es "otro")
- Advertencia de que la accion genera auditoria inmutable

### Periodo reabierto en la lista

Un periodo reabierto aparece con un indicador especial en la lista de periodos. Tiene **prioridad maxima** en la vista de trabajo — si hay un periodo reabierto, aparece primero en la lista de periodos activos, por encima del mes operativo actual.

---

## Reglas de negocio

| Regla | Descripcion |
|---|---|
| Ventana de reapertura | 45 dias desde la fecha de exportacion. Configurable en el futuro via Policy Engine (TASK-414) |
| Quien puede reabrir | Solo usuarios con rol `efeonce_admin` |
| Razones validas | `error_calculo`, `bono_retroactivo`, `correccion_contractual`, `otro` |
| Detalle obligatorio | Si la razon es `otro`, el campo de detalle es obligatorio |
| Una version activa por colaborador | El sistema garantiza que solo hay una entrada activa por (periodo, colaborador) en todo momento |
| Auditoria inmutable | El registro de reapertura no se puede editar ni borrar despues de creado |
| Exportacion limpia | Los archivos de exportacion solo incluyen entradas activas — las archivadas no aparecen |
| Delta a Finanzas | El ajuste contable usa el monto liquido (net), no el bruto (gross) |
| Idempotencia del delta | El ajuste contable se genera una sola vez por reliquidacion — si se reprocesa, no se duplica |

---

## Flujo completo (diagrama)

```
Operador detecta error en nomina exportada
        │
        ▼
┌────────────────────┐
│ Reabrir periodo    │  ← requiere efeonce_admin + ventana de 45 dias
│ Seleccionar razon  │  ← genera registro de auditoria inmutable
└────────────────────┘
        │
        ▼
┌────────────────────┐
│ Editar entradas    │  ← v1 se archiva, v2 se crea automaticamente
│ afectadas          │  ← delta (v2 - v1) se calcula automaticamente
└────────────────────┘
        │
        ▼
┌────────────────────┐
│ Recalcular         │  ← sistema consolida cambios
│ Aprobar            │  ← flujo normal de aprobacion
│ Re-exportar        │  ← solo entradas activas (v2 + originales sin cambio)
└────────────────────┘
        │
        ▼
┌────────────────────┐
│ Finanzas recibe    │  ← automatico via sistema reactivo
│ delta contable     │  ← solo la diferencia, no el total
└────────────────────┘
        │
        ▼
┌────────────────────┐
│ Colaboradores      │  ← re-envio de liquidaciones corregidas
│ reciben correo     │  ← con PDFs actualizados (solo v2)
│ actualizado        │
└────────────────────┘
```

---

## Preguntas frecuentes

### Se puede reliquidar mas de una vez el mismo periodo?

Si, pero cada reapertura crea un nuevo registro de auditoria y un nuevo ciclo de versiones. La version 2 pasaria a ser archivada y se crearia una version 3.

### Que pasa con los archivos ya enviados (PDFs, Previred)?

Los archivos originales quedan en el sistema como registro historico. La re-exportacion genera archivos nuevos que reemplazan funcionalmente a los anteriores.

### Que pasa si quiero reabrir un periodo cuya ventana de 45 dias ya paso?

El sistema no permite la reapertura. En el futuro, TASK-414 (Policy Engine) podria agregar la capacidad de extender o anular la ventana bajo autorizacion especial.

### Como se que una entrada fue reliquidada?

El badge "v2 — reliquidada" aparece junto al nombre del colaborador. Ademas, el historial de versiones muestra todas las versiones con sus montos y fechas.

### La reliquidacion afecta los calculos de Previred?

Si, en la medida en que los montos cambien. La re-exportacion genera nuevos archivos de Previred con los montos corregidos.

### Quien puede ver el registro de auditoria de reapertura?

Cualquier usuario con acceso al modulo de nominas puede ver el registro de auditoria. Solo usuarios `efeonce_admin` pueden crear nuevas reaperturas.

---

## Archivos tecnicos de referencia

Para desarrolladores que necesiten entender la implementacion tecnica:

> **Migraciones de base de datos:**
> - `migrations/20260415182419195_payroll-reliquidation-foundation.sql` — schema base
> - `migrations/20260415192102665_finance-expenses-reopen-audit-link.sql` — link a finanzas
> - `migrations/20260415210956965_payroll-supersede-fk-deferrable.sql` — constraint transaccional
> - `migrations/20260415215940253_finance-expenses-payroll-dedupe-invariant.sql` — invariante de deduplicacion

> **Logica de negocio:**
> - `src/lib/payroll/reopen-period.ts` — reapertura transaccional
> - `src/lib/payroll/supersede-entry.ts` — versionamiento v1→v2
> - `src/lib/payroll/reopen-guards.ts` — validaciones de ventana y razon
> - `src/lib/payroll/period-lifecycle.ts` — transiciones de estado
> - `src/lib/payroll/current-payroll-period.ts` — priorizacion de periodos activos

> **Integracion con Finanzas:**
> - `src/lib/finance/apply-payroll-reliquidation-delta.ts` — creacion del ajuste contable
> - `src/lib/sync/projections/payroll-reliquidation-delta.ts` — proyeccion reactiva

> **Interfaz de usuario:**
> - `src/views/greenhouse/payroll/ReopenPeriodDialog.tsx` — dialogo de reapertura
> - `src/views/greenhouse/payroll/ReliquidationBadge.tsx` — indicador visual
> - `src/views/greenhouse/payroll/EntryVersionHistoryDrawer.tsx` — historial de versiones

> **Endpoints API:**
> - `POST /api/hr/payroll/periods/[periodId]/reopen` — reabrir periodo
> - `GET /api/hr/payroll/periods/[periodId]/reopen-preview` — preview de reapertura
> - `GET /api/hr/payroll/entries/[entryId]/versions` — historial de versiones

> **Documentacion tecnica:**
> - [GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md)
> - [GREENHOUSE_EVENT_CATALOG_V1.md](../../architecture/GREENHOUSE_EVENT_CATALOG_V1.md)
> - [GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V2.md](../../architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V2.md)
