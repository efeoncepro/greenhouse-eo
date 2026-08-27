# Auditoría acotada — vacaciones por aniversario para contractors Deel

> **Fecha:** 2026-08-25
> **Alcance:** Melkin Hernandez y Andrés Carlosama
> **Estado:** evidencia documentada; conciliación de política y runtime pendiente

## Decisión

Este caso **no crea una política global**. Registra una instrucción operativa aprobada para dos personas y la compara con el contrato funcional y el runtime observado. La conciliación final requiere una decisión conjunta de People, Payroll y Legal antes de cambiar cálculos, saldos o comunicaciones generales.

## Hechos verificados

| Persona | `hire_date` canónica | Clasificación actual | Saldo observado 2026 | Comunicación aprobada |
| --- | --- | --- | --- | --- |
| Melkin Hernandez | `2025-07-15` | `contractor` · `international` · `deel` | 15 disponibles · 0 usados · 0 reservados | 15 días remunerados disponibles desde su primer aniversario |
| Andrés Carlosama | `2025-11-11` | `contractor` · `international` · `deel` | 15 disponibles · 0 usados · 0 reservados | 15 días remunerados al cumplir su primer aniversario |

Las fechas se escribieron por la ruta canónica de HR Profile, `PATCH /api/hr/core/members/[memberId]/profile`, y se verificaron en `greenhouse.team_members.hire_date` y `greenhouse_core.members.hire_date`. Una fecha de compensación (`effective_from`), la creación del registro o la fecha de sincronización **no sustituyen** `hire_date`.

## Drift detectado

Hay tres contratos distintos que hoy no coinciden:

1. **Runtime Leave:** el resolver selecciona la política global fija de 15 días y ambos perfiles ya muestran 15, incluido Andrés antes de su aniversario.
2. **Comunicación operativa aprobada para este caso:** los 15 días se vincularon al primer aniversario de cada persona.
3. **Carta global de beneficios para candidatos:** declara 15 días hábiles remunerados al año, prorrateados durante el primer y último año, más progresión por antigüedad.

Además, la política derivada para proveedor externo puede quedar eclipsada por la política global debido al orden de resolución. Por ello, el saldo visible no demuestra por sí solo cuál es el derecho contractual aplicable.

## Comunicación 1:1

Nexa envió Adaptive Cards individuales mediante TeamBot, sin menciones y con identidad Entra revalidada inmediatamente antes del envío:

- Melkin: `teams-manual-02aba8bc-aa07-4f1f-b1af-79e1351b1f4d`
- Andrés: `teams-manual-44d172d3-d870-42ae-80dc-451d8bcbd4a6`

Ambas ejecuciones quedaron `succeeded` en `greenhouse_sync.source_sync_runs`. Ese estado prueba aceptación por el transporte y registro de auditoría; **no** equivale a confirmación de lectura ni de renderizado por parte del destinatario.

## Regla operativa hasta resolver el drift

Antes de comunicar o aprobar vacaciones de un contractor/EOR:

1. verificar `hire_date` en BigQuery y PostgreSQL;
2. confirmar `contract_type`, `pay_regime` y `payroll_via`;
3. identificar la política realmente seleccionada y el saldo materializado;
4. contrastar contrato/acuerdo, proveedor y carta de beneficios aplicable;
5. separar una instrucción individual de una política reusable;
6. escalar cualquier discrepancia antes de ajustar saldo o prometer un derecho general.

Cambiar `hire_date` no recalcula ni corrige automáticamente el saldo existente.

## Resolución pendiente y dueño

People, Payroll y Legal deben decidir cuál es el contrato deseado para contractors Deel: prorrateo desde el ingreso, disponibilidad al aniversario, gestión externa por proveedor u otra regla explícita. Después corresponde:

- corregir la precedencia del resolver y/o la materialización de saldos;
- reconciliar saldos ya visibles;
- alinear carta de beneficios, acuerdos y comunicación;
- agregar pruebas por régimen y primer aniversario.

No se propone ADR todavía: esta auditoría documenta una contradicción, pero no acepta una nueva decisión arquitectónica ni de política.
