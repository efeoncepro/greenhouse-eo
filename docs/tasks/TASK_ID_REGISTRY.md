# TASK_ID_REGISTRY.md

## Objetivo
Registro canonico de asignacion de IDs `TASK-###` para evitar colisiones y renumeraciones del backlog.

## Reglas

- `TASK-###` es estable y no se recicla
- el orden de ejecucion actual vive en `Rank`, no en el ID
- una task legacy puede recibir un `TASK-###` operativo sin renombrar todavia su archivo
- no renumerar el registro cuando cambie la prioridad del backlog

## Bootstrap inicial del backlog activo

Este bloque inicial cubre:

- la lane actualmente `in-progress`
- las siguientes 9 lanes abiertas mas prioritarias del backlog

| Task ID | Lifecycle actual | Rank operativo | Legacy ID / brief actual | Archivo actual |
| --- | --- | --- | --- | --- |
| `TASK-001` | `in-progress` | 1 | `CODEX_TASK_HR_Payroll_Operational_Hardening_v1` | `docs/tasks/in-progress/CODEX_TASK_HR_Payroll_Operational_Hardening_v1.md` |
| `TASK-002` | `to-do` | 2 | `CODEX_TASK_Tenant_Notion_Mapping` | `docs/tasks/to-do/CODEX_TASK_Tenant_Notion_Mapping.md` |
| `TASK-003` | `to-do` | 3 | `CODEX_TASK_Invoice_Payment_Ledger_Correction_v1` | `docs/tasks/to-do/CODEX_TASK_Invoice_Payment_Ledger_Correction_v1.md` |
| `TASK-004` | `to-do` | 4 | `CODEX_TASK_Finance_Dashboard_Calculation_Correction_v1` | `docs/tasks/to-do/CODEX_TASK_Finance_Dashboard_Calculation_Correction_v1.md` |
| `TASK-005` | `to-do` | 5 | `CODEX_TASK_HR_Payroll_Attendance_Leave_Work_Entries_v1` | `docs/tasks/to-do/CODEX_TASK_HR_Payroll_Attendance_Leave_Work_Entries_v1.md` |
| `TASK-006` | `to-do` | 6 | `CODEX_TASK_Webhook_Infrastructure_MVP_v1` | `docs/tasks/to-do/CODEX_TASK_Webhook_Infrastructure_MVP_v1.md` |
| `TASK-007` | `to-do` | 7 | `CODEX_TASK_Lint_Debt_Burn_Down_v1` | `docs/tasks/to-do/CODEX_TASK_Lint_Debt_Burn_Down_v1.md` |
| `TASK-008` | `to-do` | 8 | `CODEX_TASK_Team_Identity_Capacity_System_v2` | `docs/tasks/to-do/CODEX_TASK_Team_Identity_Capacity_System_v2.md` |
| `TASK-009` | `to-do` | 9 | `CODEX_TASK_Greenhouse_Home_Nexa_v2` | `docs/tasks/to-do/CODEX_TASK_Greenhouse_Home_Nexa_v2.md` |
| `TASK-010` | `to-do` | 10 | `CODEX_TASK_Organization_Economics_Dashboard_v1` | `docs/tasks/to-do/CODEX_TASK_Organization_Economics_Dashboard_v1.md` |

## Siguiente ID disponible

- `TASK-011`

## Regla de asignacion desde aqui

Al crear una task nueva o bootstrapear una legacy adicional:

1. tomar el siguiente ID disponible
2. agregarlo a este registro
3. reflejarlo en la task markdown
4. usarlo en el issue `[TASK-###] ...`
5. usarlo en el GitHub Project como `Task ID`
