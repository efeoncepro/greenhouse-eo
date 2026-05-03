# TASK-755 — Payment Profiles Ops Advanced (Bulk approve + Diff viewer + Splits + Threshold routing)

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Alto`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno (depende de feedback de uso real)`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-749`
- Branch: `task/TASK-755-payment-profiles-ops-advanced`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cuatro extensiones de Ops avanzadas que solo deben implementarse después
de tener feedback de uso real de V1: bulk approve queue real (no fila por
fila), profile diff viewer entre versiones, support para splits
multi-payment-method por currency (e.g. 70% Wise + 30% PayPal), y routing
por amount threshold (>$1000 → wire; menor → wise).

## Why This Task Exists

V1 estableció el modelo dual-surface y resolvió el 80% de los casos. Las
4 features de esta task quedan **como reactivas**: solo se justifican si
emergen incidentes operativos concretos. No deben construirse en
abstracto porque cada una requiere decisiones de UX que dependen de
patrones de uso reales:

1. **Bulk approve real**: ¿criterio por moneda? ¿por space? ¿por antigüedad?
   ¿por provider? Sin uso real es adivinanza.
2. **Diff viewer**: útil cuando un perfil supersede a otro y el operator
   quiere ver qué cambió sin hacer query a la base.
3. **Splits multi-method**: caso real reportado por Andrés ("70% Global66,
   30% PayPal"). Validar si más colaboradores lo piden antes de invertir.
4. **Threshold routing**: caso reportado por finance ("transferencias >
   $1000 USD por wire, no por Wise"). Validar frecuencia.

## Goal

- Bulk approve queue con filtros por moneda/space/provider/antigüedad y motivo común
- Diff viewer side-by-side entre dos versiones del perfil (active vs superseded)
- Splits por currency: declarar 1 perfil con N rutas y porcentajes
- Routing rules por amount threshold (provider/method override según monto)

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`

Reglas obligatorias:

- Splits deben sumar 100% — validar en helper antes de save
- Threshold rules deben tener el rango cubierto sin gap (resolver fail-fast si amount cae fuera de todos los rangos definidos)
- Diff viewer es read-only — no edita en lugar (edit = crear nueva versión)
- Bulk approve respeta maker-checker individual (cada row chequea created_by ≠ approver), no se puede bulk-aprobar perfiles propios

## Dependencies & Impact

### Depends on

- `TASK-749` V1 estable + ~1-2 meses de uso real
- Idealmente después de TASK-752 (V2 Foundation) para tener supplier/tax authorities en el universo

### Blocks / Impacts

- Reduce tiempo operativo para finance team (bulk approve)
- Habilita casos de uso multi-currency complejos (splits)

### Files owned

- `migrations/<timestamp>_task-755-payment-profile-routing-rules.sql`
- `src/lib/finance/beneficiary-payment-profiles/splits.ts`
- `src/lib/finance/beneficiary-payment-profiles/threshold-rules.ts`
- `src/lib/finance/beneficiary-payment-profiles/bulk-approve.ts`
- `src/views/greenhouse/finance/payment-profiles/BulkApproveDialog.tsx`
- `src/views/greenhouse/finance/payment-profiles/ProfileDiffViewer.tsx`

## Scope

### Slice 1 — Bulk approve

- Endpoint `POST /api/admin/finance/payment-profiles/bulk-approve` con body `{profileIds: [...], reason: string}`
- Helper que itera con maker-checker per row (skipping self-approvals con error claro)
- UI BulkApproveDialog en surface ops: filtros (currency, space, provider, días en cola), checkbox por row, motivo común, contador de "X aprobables, Y bloqueados por self-approval"

### Slice 2 — Diff viewer

- Endpoint `GET /api/admin/finance/payment-profiles/[id]/diff?against=[supersededId]` retorna both rows + computed delta
- UI ProfileDiffViewer modal con dos columnas (anterior vs actual) + highlights en campos cambiados
- Linkeado desde audit log entry `superseded`

### Slice 3 — Splits

- Migration: nueva tabla `payment_profile_splits` con FK al profile + provider_slug + payment_method + percentage
- CHECK constraint que percentages suman exactamente 100 por profile_id
- Helper `splitProfileForAmount({profile, amount})` retorna `Array<{providerSlug, method, amount}>` reparteado
- Resolver detecta si profile tiene splits y devuelve ruta multi-leg
- UI Create/Edit: opcional "Dividir entre N rutas" → form dinámico con percentages

### Slice 4 — Threshold routing

- Schema: agregar `routing_rules_json` al profile con shape `[{minAmount, maxAmount, providerSlug, paymentMethod}]`
- Resolver lee `routing_rules_json` antes del default — si encuentra rango que matchea el amount, usa esa ruta
- UI Create/Edit: panel "Reglas por monto" opcional con N rangos
- Test: amount $500 en profile con regla [{>1000: wire}, {default: wise}] → resolver retorna wise

## Out of Scope

- Envío automático del split (eso es V4 con integraciones API a banks)
- Routing por país/zona horaria (no hay caso reportado)
- Approval workflows multi-checker (solo maker-checker simple)

## Acceptance Criteria

- [ ] Bulk approve aprueba 5+ perfiles en una llamada respetando maker-checker individual
- [ ] Diff viewer muestra delta entre 2 versiones de un mismo profile chain
- [ ] Crear perfil con splits 70/30 y resolver retorna 2 legs reparteado
- [ ] Threshold routing escoge wire o wise según amount

## Verification

- `pnpm vitest run src/lib/finance/beneficiary-payment-profiles src/lib/finance/payment-routing`
- `pnpm build`
- Smoke: bulk approve queue real con datos de staging

## Closing Protocol

- [ ] Lifecycle, archivo, README, Handoff, changelog
- [ ] Validar que TASK-750 y TASK-751 absorben el shape multi-leg sin cambios
