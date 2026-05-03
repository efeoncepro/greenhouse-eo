# Reclasificar pagos por categoría económica

## Para qué sirve

Cuando el clasificador automático de Greenhouse no logra clasificar un pago con confianza suficiente (porque el bank reconciler defaulteó a `expense_type='supplier'` y no hay RUT, email o nombre que matche `members` ni `known_payroll_vendors` ni `known_regulators`), la fila se enruta a una **manual queue**. El operador (Finance Admin o Efeonce Admin) la resuelve manualmente eligiendo la categoría correcta.

Esto **NO modifica** la categoría fiscal/SII (`expense_type`) — solo la dimensión analítica `economic_category` que alimenta KPIs/ICO/dashboards.

## Antes de empezar

- Necesitas una de estas roles: `FINANCE_ADMIN` o `EFEONCE_ADMIN`.
- Capability granular requerida:
  - Para expenses: `finance.expenses.reclassify_economic_category`
  - Para income: `finance.income.reclassify_economic_category`
- Si no la tienes, pídela al admin del tenant. Es least-privilege.

## Paso a paso

### Reclasificar un solo pago

**Vía endpoint admin (mientras la UI dialog se entrega como follow-up):**

```bash
pnpm staging:request PATCH /api/admin/finance/expenses/exp-pay-XXXX/economic-category \
  '{"economicCategory": "labor_cost_external", "reason": "pago a Daniela España via Global66 — clasificado como supplier por bank reconciler default"}'
```

**Body fields:**

- `economicCategory` (obligatorio): valor del enum canónico. Ver lista completa abajo.
- `reason` (obligatorio, mínimo 10 caracteres): explicación humana para audit trail.
- `bulkContext` (opcional): si el cambio es parte de una corrección masiva, ID del lote.

**Response esperada:**

```json
{
  "ok": true,
  "result": {
    "changed": true,
    "expenseId": "exp-pay-XXXX",
    "previousCategory": "vendor_cost_saas",
    "category": "labor_cost_external"
  },
  "eventId": "evt-uuid-xxxx"
}
```

Si la categoría es la misma que ya tiene la fila, retorna `changed: false` sin tocar nada (idempotente).

### Reclasificar múltiples pagos (bulk)

Por ahora sin endpoint dedicado de bulk; ejecutar el endpoint single per-row con el mismo `bulkContext` (ej. `bulkContext: "abril-2026-payroll-mis-classification-fix"`). El audit log preserva el contexto y permite filtrar luego en el log.

### Para income

Mismo patrón que expense, pero contra `/api/admin/finance/income/{id}/economic-category` y usando los 8 valores de income enum.

## Qué significan las categorías

### Para expense (11 valores)

| Categoría | Cuándo aplica |
|---|---|
| `labor_cost_internal` | Nómina chilena de colaboradores ECG (Luis, Humberly) — pago directo o a Previred/AFP/Mutual de un trabajador ECG. |
| `labor_cost_external` | Nómina internacional via Deel/Remote/Velocity Global; transferencias directas a contractors/colaboradores fuera de Chile (Daniela España, Andrés Colombia, Melkin Nicaragua); FX fees asociados a esos envíos. |
| `vendor_cost_saas` | Suscripciones SaaS (Adobe, Vercel, Notion, Anthropic Claude.ai, OpenAI, GitHub, ElevenLabs). |
| `vendor_cost_professional_services` | Servicios profesionales contratados (Beeconta, contadora externa, asesoría legal, consultoría). |
| `regulatory_payment` | Cotizaciones previsionales (Previred, AFP, Mutual de Seguridad, FONASA, Isapre); aportes regulatorios; pagos a Dirección del Trabajo, TGR. |
| `tax` | IVA, F29, retenciones SII directas, otros tributos. |
| `financial_cost` | Intereses de créditos, cuotas de préstamos, fees de factoring. |
| `bank_fee_real` | Comisiones bancarias operativas reales: mantención de cuenta, comisión de transferencia local. **NO** confundir con FX fees de payroll internacional (ese va a `labor_cost_external`). |
| `overhead` | Costos generales no atribuibles a una categoría arriba (ej. Vercel hosting si no clasificas como SaaS). |
| `financial_settlement` | Settlements internos placeholder (futuras intercompany_transfer, loan_principal). |
| `other` | Fallback explícito; emite alerta reliability si count > 0 — operador debería resolver. |

### Para income (8 valores)

| Categoría | Cuándo aplica |
|---|---|
| `service_revenue` | Default razonable; ingresos por servicios facturados a clientes. |
| `client_reimbursement` | Reembolso de cliente por gasto pre-aprobado (CCA o adelantos). |
| `factoring_proceeds` | Anticipos de factoring (TASK-571 settlement contract). |
| `partner_payout_offset` | Cuando un partner cobra directo al cliente y nos transfiere nuestra parte. |
| `internal_transfer_in` | Transferencias internas entre cuentas Greenhouse. |
| `tax_refund` | Devolución SII / IVA refund. |
| `financial_income` | Intereses ganados, rendimientos de inversiones. |
| `other` | Fallback. |

## Qué no hacer

- ❌ **NUNCA** modifiques `expense_type` legacy directamente para "fix" un KPI Nómina mal-clasificado. `expense_type` es fiscal/SII y blast radius enorme. Usa `economic_category` que es ortogonal.
- ❌ **NUNCA** reclasifiques en bulk sin `bulkContext` que documente el motivo. El audit trail necesita contexto.
- ❌ **NUNCA** uses `reason` corto o genérico ("fix"). El endpoint rechaza < 10 chars; pero igual escribe algo útil para auditoría futura.
- ❌ **NO bypass** el endpoint con UPDATE SQL directo — eso evita el audit log + outbox event y CHECK trigger anti-bypass va a rechazar valores inválidos.
- ❌ **NO uses** valores fuera del enum canónico (CHECK constraint los rechaza).

## Problemas comunes

### "403 forbidden"

No tienes la capability granular requerida. Pide al admin del tenant que te asigne `finance.expenses.reclassify_economic_category` (o income equivalente).

### "404 expense not found"

El `expense_id` no existe o fue archivado. Verifica el ID en la query directa:

```sql
SELECT expense_id, expense_type, economic_category
FROM greenhouse_finance.expenses
WHERE expense_id = 'exp-pay-XXXX';
```

### "400 validation_error: economicCategory invalido"

Estás pasando un valor fuera del enum canónico. Lista válida en la sección "Qué significan las categorías" arriba. Asegúrate de usar exactamente los strings (snake_case, lowercase).

### "200 ok pero changed: false"

La fila ya tenía esa categoría. Idempotente — sin cambio ni evento. Verifica si querías otra categoría.

### Manual queue tiene cientos de filas pendientes

Backfill inicial detectó muchas filas low-confidence (típicamente Nubox imports con `expense_type='supplier'` sin metadata). Resolver en bulk con `bulkContext` documentado. Una vez vacía, una migration follow-up hará `VALIDATE CONSTRAINT expenses_economic_category_required_after_cutover` atomic post-cleanup.

### El reclassify funcionó pero el KPI no se actualiza

Verifica que el endpoint que muestra el KPI ya consume `byEconomicCategory` (TASK-768 Slice 8). Si está leyendo el shape legacy `payrollClp/supplierClp/fiscalClp` (que mapea desde economic_category con un cast), espera el próximo build/deploy. El backend ya está consistente.

## Referencias técnicas

- [Documentación funcional: Categoría económica de pagos](../../documentation/finance/categoria-economica-de-pagos.md)
- [Spec arquitectónica: GREENHOUSE_FINANCE_ARCHITECTURE_V1.md Delta 2026-05-03](../../architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md)
- [Spec de tarea: TASK-768](../../tasks/complete/TASK-768-finance-expense-economic-category-dimension.md)
- [Resolver canónico TS](../../../src/lib/finance/economic-category/resolver.ts)
- [Endpoint expenses](../../../src/app/api/admin/finance/expenses/[id]/economic-category/route.ts)
- [Endpoint income](../../../src/app/api/admin/finance/income/[id]/economic-category/route.ts)
- [Backfill script](../../../scripts/finance/backfill-economic-category.ts)
