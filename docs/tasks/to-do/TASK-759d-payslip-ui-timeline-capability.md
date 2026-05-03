# TASK-759d — Payslip UI Timeline + Capability `finance.payslip.resend`

> **Status**: to-do
> **Lifecycle**: to-do
> **Owner**: TBD
> **Created**: 2026-05-01
> **Parent**: TASK-759
> **Dependencies**: TASK-759 V1 + 759b + 759c (deliveries timeline data)

## Scope

### Surface 1 — Payment Order drawer (nueva sección)

`/finance/payment-orders` → Order drawer → nueva sección "Comunicaciones a colaboradores":
- Tabla con 1 row por colaborador employee_net_pay en la orden
- Columnas: Colaborador | Promesa | Pago | Compensación | Estado actual
- Cada celda: timestamp + chip de estado (✓ enviado / ⚠ fallido / — pendiente / ⊘ skipped)
- Botón "Reenviar manualmente" por row, gated por `finance.payslip.resend`
- Click en row expande detail con timeline completo + Resend message ids con link al dashboard

### Surface 2 — Obligation drawer extension (V1 base ya creó card simple)

Extender la card "Recibo de nómina" actual con timeline completo (no solo el último delivery):
- Lista cronológica de TODOS los `payslip_deliveries` de la entry
- Cada item: icon + kind + timestamp + status + delivery_id (cliqueable)
- Footer: botón "Reenviar" (capability gated)

### Capability nueva

`finance.payslip.resend` declarada en `src/config/entitlements-catalog.ts`:
- Asignada a roles: `finance_admin`, `efeonce_admin`
- NO asignada a `finance_analyst` (read-only)
- Gate-ea el endpoint `/api/admin/finance/payment-orders/[orderId]/resend-payslips` (hoy solo está bajo `requireFinanceTenantContext`)

### Auditoría

Cada uso del botón "Reenviar manualmente" debe:
- Loggear `actor_user_id` en el row de delivery
- Publicar evento outbox `finance.payslip.manual_resend_triggered` con `{actorUserId, entryId, orderId, force}`
- Sentry breadcrumb con `domain='hr.payroll.payslip_delivery'`

## Out of scope

- Editar template del email — V3 (cuando emerja necesidad de personalización)
- Re-trigger del committed promise por su lado — el endpoint actual solo cubre `payment_paid` / `manual_resend`. V3 si se necesita.

## Estimación

~3h. Reusa el endpoint `/resend-payslips` ya existente, solo agrega capability check + UI surfaces.
