# CODEX TASK — HRIS Fase 2A: Expense Reports (Gastos y Reembolsos)

## Delta 2026-03-31

- Mantener la alineación con el patrón real del repo:
  - tablas de acciones dedicadas por dominio, no `greenhouse_hr.approval_actions` genérica
  - notifications vía outbox granular + `src/lib/sync/projections/notifications.ts`, no wiring manual inline por módulo
- `TASK-170` endureció precisamente ese patrón en leave (`leave_request.*` + notification projection), así que esta task debe reutilizar esa convención como baseline vigente.

## Delta 2026-03-27 — Alineación arquitectónica

- **Tabla de approval**: NO existe `greenhouse_hr.approval_actions` genérica. El patrón actual es tablas dedicadas por dominio (`leave_request_actions`). Crear `greenhouse_hr.expense_report_actions` con el mismo schema (action_id, report_id, action, actor_user_id, actor_member_id, actor_name, notes, created_at).
- **Finance integration**: NO usar SQL directo para crear expense en Finance. Usar `createFinanceExpenseInPostgres()` de `src/lib/finance/postgres-store-slice2.ts` — maneja cost allocation, exchange rates, CLP conversion, audit fields, y emite `finance.expense.created` automáticamente.
- **Outbox events obligatorios**: registrar en `src/lib/sync/event-catalog.ts`:
  - Aggregate type: `expenseReport`
  - Eventos: `hr.expense_report.submitted`, `hr.expense_report.approved`, `hr.expense_report.rejected`, `hr.expense_report.reimbursed`
- **Notifications**: usar `NotificationService.dispatch()` (`src/lib/notifications/notification-service.ts`) para notificar a supervisor/finance en cada transición de estado. El pattern ya soporta canal email via Resend.
- **Cost Intelligence downstream**: expenses reembolsados entran a Cost Intelligence via el evento existente `finance.expense.created` — no requiere wiring adicional.

## Resumen

Implementar el **módulo de gastos y reembolsos** del HRIS en Greenhouse. Permite a colaboradores con contrato laboral (indefinido/plazo fijo) solicitar reembolsos de gastos con comprobantes, que pasan por un flujo de aprobación supervisor → finance y se integran con el Finance Module al momento del reembolso.

**El problema hoy:** Los reembolsos se gestionan por email y planillas. No hay trazabilidad, no hay flujo de aprobación estandarizado, y Finance registra los gastos manualmente.

**La solución:** Un módulo con dos superficies:
1. **`/my/expenses`** — Vista self-service donde el colaborador crea reportes de gastos, adjunta comprobantes y trackea el estado
2. **`/hr/expenses`** — Vista admin donde HR y Finance ven, aprueban/rechazan y marcan como reembolsados

**Reutiliza el approvals engine** existente de `greenhouse_hr` — mismo patrón de estado que leave requests, con supervisor y finance como aprobadores.

---

## Contexto del proyecto

- **Repo:** `github.com/efeoncepro/greenhouse-eo`
- **Branch de trabajo:** `feature/hris-expenses`
- **Documento rector:** `Greenhouse_HRIS_Architecture_v1.md` §4.3
- **Schema:** `greenhouse_hr`
- **Prerequisitos:** Fase 0.5 (contract types), Fase 1A (Document Vault — reutiliza GCS bucket y signed URLs)

### Documentos normativos

| Documento | Qué aporta |
|-----------|------------|
| `Greenhouse_HRIS_Architecture_v1.md` | Schema DDL §4.3, elegibilidad §5, navegación §6 |
| `CODEX_TASK_HR_Core_Module.md` | Approvals engine pattern, leave request flow |
| `CODEX_TASK_Financial_Module.md` | `fin_expenses` table, expense types, Finance integration |
| `FINANCE_DUAL_STORE_CUTOVER_V1.md` | Postgres-first writes for finance |
| `Greenhouse_Nomenclatura_Portal_v3.md` | Constantes, colores |

---

## Dependencias

| Dependencia | Estado | Impacto si no está |
|---|---|---|
| Fase 0.5 (contract types) | Prerequisito | Elegibilidad por `contract_type` |
| Fase 1A (Document Vault) | Prerequisito | Reutiliza GCS bucket y `gcs-signed-urls.ts` |
| `greenhouse_hr` schema | Existe | Tablas van aquí |
| `greenhouse_finance.expenses` table | Existe | Link de reembolso crea registro aquí |
| Approvals engine (`approval_actions`) | Existe | Se reutiliza para el flujo de aprobación |

---

## PARTE A: Schema PostgreSQL

Según `Greenhouse_HRIS_Architecture_v1.md` §4.3 — 3 tablas: `expense_categories`, `expense_reports`, `expense_items`. DDL ya definido en el documento de arquitectura. Crear tal cual.

### A1. Seed data — Categorías de gasto

```sql
INSERT INTO greenhouse_hr.expense_categories (category_id, category_name, description, requires_receipt, max_amount, sort_order) VALUES
  ('transporte', 'Transporte', 'Taxi, Uber, estacionamiento, peajes', TRUE, 100000, 1),
  ('alimentacion', 'Alimentación', 'Comidas de trabajo, coffee meetings con clientes', TRUE, 50000, 2),
  ('software', 'Software y suscripciones', 'Licencias, herramientas, servicios digitales', TRUE, NULL, 3),
  ('equipamiento', 'Equipamiento', 'Periféricos, accesorios de oficina home-office', TRUE, 500000, 4),
  ('capacitacion', 'Capacitación', 'Cursos, talleres, conferencias', TRUE, NULL, 5),
  ('comunicaciones', 'Comunicaciones', 'Telefonía, internet (excedente por trabajo remoto)', TRUE, 30000, 6),
  ('representacion', 'Representación', 'Regalos a clientes, eventos corporativos', TRUE, 200000, 7),
  ('otro', 'Otro', 'Gastos no clasificados — requiere justificación detallada', TRUE, NULL, 8);
```

---

## PARTE B: API Routes

### B1. Categorías (config)

| Endpoint | Method | Auth |
|---|---|---|
| `GET /api/hr/expenses/categories` | GET | Any authenticated |
| `POST /api/hr/expenses/categories` | POST | `hr`, `admin` |
| `PATCH /api/hr/expenses/categories/[categoryId]` | PATCH | `hr`, `admin` |

### B2. Reports (CRUD + workflow)

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `GET /api/hr/expenses/reports` | GET | `collaborator` (own), `hr`/`finance`/`admin` (all) | List with filters |
| `POST /api/hr/expenses/reports` | POST | `collaborator` | Create draft report |
| `GET /api/hr/expenses/reports/[reportId]` | GET | Owner, `hr`, `finance`, `admin` | Detail with items |
| `PATCH /api/hr/expenses/reports/[reportId]` | PATCH | Owner (only if draft) | Update title, period |
| `POST /api/hr/expenses/reports/[reportId]/submit` | POST | Owner | Submit for approval (draft → pending_supervisor) |
| `POST /api/hr/expenses/reports/[reportId]/approve` | POST | Supervisor or Finance | Approve at current level |
| `POST /api/hr/expenses/reports/[reportId]/reject` | POST | Supervisor or Finance | Reject with reason |
| `POST /api/hr/expenses/reports/[reportId]/reimburse` | POST | `finance_admin`, `admin` | Mark as reimbursed → creates finance record |
| `DELETE /api/hr/expenses/reports/[reportId]` | DELETE | Owner (only if draft) | Delete draft |
| `GET /api/hr/expenses/reports/my` | GET | `collaborator` | My reports |

### B3. Items (within report)

| Endpoint | Method | Auth |
|---|---|---|
| `POST /api/hr/expenses/reports/[reportId]/items` | POST | Owner (only if draft) |
| `PATCH /api/hr/expenses/reports/[reportId]/items/[itemId]` | PATCH | Owner (only if draft) |
| `DELETE /api/hr/expenses/reports/[reportId]/items/[itemId]` | DELETE | Owner (only if draft) |
| `POST /api/hr/expenses/reports/[reportId]/items/[itemId]/receipt-url` | POST | Owner | Signed URL for receipt upload |

### B4. Approval flow

```
[Collaborator creates draft]
  → draft
    → [Submit] → pending_supervisor
      → [Supervisor approves] → pending_finance
        → [Finance approves] → approved
          → [Finance reimburses] → reimbursed ✓
        → [Finance rejects] → rejected ✗
      → [Supervisor rejects] → rejected ✗
    → [Collaborator deletes] → (hard delete, only drafts)

[If reports_to = NULL]
  → [Submit] → pending_finance (skip supervisor)
```

Each action creates a row in `greenhouse_hr.approval_actions` with `request_type = 'expense_report'`.

### B5. Finance integration

When an expense report reaches `reimbursed` status:
1. Create a record in `greenhouse_finance.expenses` with:
   - `expense_type = 'reimbursement'`
   - `description = 'Reembolso: {report.title}'`
   - `total_amount = report.total_amount`
   - `member_id = report.member_id`
   - `payment_status = 'paid'`
   - `payment_date = NOW()`
2. Store the `finance_record_id` back in `expense_reports.finance_record_id`

---

## PARTE C: Vistas UI

### C1. `/my/expenses` — Mis gastos (self-service)

```
┌──────────────────────────────────────────────────────────┐
│  Header: "Mis gastos" + botón "Nuevo reporte"              │
├──────────────────────────────────────────────────────────┤
│  Stats: [Total pendiente: $45.000] [Reembolsado YTD: $230K]│
├──────────────────────────────────────────────────────────┤
│  Tabla de reportes:                                        │
│  | Período | Título | Monto | Items | Estado | Fecha      │
│  | Mar 2026| Taxi + comida | $32.000 | 3 | Pendiente sup.│
│  | Feb 2026| Software | $89.000 | 1 | Reembolsado ✓      │
└──────────────────────────────────────────────────────────┘
```

**Crear reporte flow:** Drawer → título + período → guardado como draft → agregar items (categoría, monto, fecha, descripción, comprobante) → submit.

**Cada item tiene upload de comprobante** usando signed URLs (reutiliza `gcs-signed-urls.ts` de Document Vault). El archivo se guarda en `gs://greenhouse-documents/receipts/{report_id}/{item_id}/{file_name}`.

### C2. `/hr/expenses` — Gastos y reembolsos (admin)

```
┌──────────────────────────────────────────────────────────┐
│  Header: "Gastos y reembolsos"                             │
├──────────────────────────────────────────────────────────┤
│  Stats: [Pendientes aprobación: 4] [Aprobados sin pagar: 2]│
│  [Reembolsado este mes: $450K] [Total YTD: $2.1M]         │
├──────────────────────────────────────────────────────────┤
│  Tabs: [Pendientes] [Aprobados] [Historial]                │
├──────────────────────────────────────────────────────────┤
│  Tabla con filtros por persona, período, categoría, estado │
└──────────────────────────────────────────────────────────┘
```

**Tab Pendientes:** Reportes en `pending_supervisor` o `pending_finance`. Acciones inline: aprobar, rechazar (con motivo).

**Acción "Marcar como reembolsado":** Solo para `finance_admin`. Crea el registro en Finance Module automáticamente.

### C3. Aprobaciones — Extensión del badge

El item "Aprobaciones" en el sidebar HR ya tiene un badge con pending count. Extender el count para incluir expense reports pendientes además de leave requests:

```typescript
const pendingCount = pendingLeaveRequests + pendingExpenseReports
```

---

## PARTE D: Elegibilidad

Solo colaboradores con `contract_type IN ('indefinido', 'plazo_fijo')` ven `/my/expenses`. Honorarios y contractors gestionan sus gastos por fuera (vía Deel o por su cuenta). EOR podría tener acceso en el futuro, pero no en MVP.

```typescript
function canAccessExpenses(member: Member): boolean {
  return ['indefinido', 'plazo_fijo'].includes(member.contract_type)
}
```

Esta misma función controla la visibilidad del item "Mis gastos" en el sidebar.

---

## PARTE E: File structure

```
src/
├── app/
│   └── [lang]/
│       └── (dashboard)/
│           ├── my/
│           │   └── expenses/
│           │       └── page.tsx
│           └── hr/
│               └── expenses/
│                   └── page.tsx
├── app/
│   └── api/
│       └── hr/
│           └── expenses/
│               ├── categories/
│               │   ├── route.ts
│               │   └── [categoryId]/
│               │       └── route.ts
│               ├── reports/
│               │   ├── route.ts
│               │   ├── my/
│               │   │   └── route.ts
│               │   └── [reportId]/
│               │       ├── route.ts
│               │       ├── submit/
│               │       │   └── route.ts
│               │       ├── approve/
│               │       │   └── route.ts
│               │       ├── reject/
│               │       │   └── route.ts
│               │       ├── reimburse/
│               │       │   └── route.ts
│               │       └── items/
│               │           ├── route.ts
│               │           └── [itemId]/
│               │               ├── route.ts
│               │               └── receipt-url/
│               │                   └── route.ts
├── views/
│   └── greenhouse/
│       └── hr-expenses/
│           ├── MyExpensesView.tsx
│           ├── ExpensesDashboardView.tsx
│           ├── ExpenseReportDrawer.tsx
│           ├── ExpenseItemRow.tsx
│           ├── ExpenseApprovalActions.tsx
│           └── ExpenseReportDetail.tsx
├── lib/
│   └── hr-expenses/
│       ├── queries.ts
│       ├── approval-flow.ts
│       ├── finance-integration.ts       # Creates finance record on reimburse
│       └── eligibility.ts
└── types/
    └── hr-expenses.ts
```

---

## PARTE F: Orden de ejecución

### Fase 1: Infraestructura
1. Crear 3 tablas PostgreSQL
2. Insertar seed categorías
3. Crear TypeScript types

### Fase 2: APIs — Categories + Reports CRUD
4-9. Categories CRUD, Reports CRUD, Items CRUD

### Fase 3: APIs — Approval flow
10-13. Submit, approve, reject, reimburse

### Fase 4: Finance integration
14. `finance-integration.ts` — crear registro en `greenhouse_finance.expenses` on reimburse

### Fase 5: UI
15-17. Self-service view, admin view, aprobaciones badge update

---

## Criterios de aceptación

- [ ] 3 tablas creadas, seed categorías insertadas
- [ ] Collaborator puede crear report draft, agregar items con receipts, y submit
- [ ] Approval flow: pending_supervisor → pending_finance → approved → reimbursed
- [ ] Supervisor solo ve reports de sus reportes directos
- [ ] Finance ve todos los reports
- [ ] Receipt upload usa signed URLs (mismo bucket que Document Vault)
- [ ] `reports_to = NULL` → skip supervisor, va directo a finance
- [ ] Report no editable después de submit (solo drafts son editables)
- [ ] Reembolso crea registro en `greenhouse_finance.expenses` automáticamente
- [ ] Badge de "Aprobaciones" incluye expenses pendientes
- [ ] Solo `contract_type IN ('indefinido', 'plazo_fijo')` ven el módulo

## Lo que NO incluye

- Aprobación automática bajo cierto monto
- Integración con tarjetas corporativas
- Cálculo de IVA automático desde comprobante
- OCR de boletas/facturas
- Multi-moneda por item (todo en CLP para MVP)

## Notas para el agente

- **Reutiliza `approval_actions` de HR Core.** Mismo patrón, nuevo `request_type = 'expense_report'`.
- **Reutiliza `gcs-signed-urls.ts` de Document Vault.** Los receipts van al mismo bucket, subfolder diferente.
- **El `finance_record_id` link es unidirectional.** Expense report → finance expense. No al revés.
- **`total_amount` se recalcula server-side** al agregar/modificar/eliminar items. Nunca confiar en el monto enviado por el client.
- **Branch naming:** `feature/hris-expenses`.

---

*Efeonce Greenhouse™ · Efeonce Group · Marzo 2026*
