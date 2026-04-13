# MINI-001 — OC debe seleccionar contacto desde lista asociada al cliente

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Domain: `finance`
- Type: `mini-improvement`
- Branch: `mini/MINI-001-po-client-contact-selector`
- Related Task: `none`
- Related Issue: `none`

## Summary

El drawer de creación de OC hoy captura `Nombre contacto` y `Email contacto` como texto libre. Para evitar typos, duplicados y drift de datos, el flujo debería priorizar una selección desde los contactos ya asociados al cliente.

## Why Mini

Es un ajuste puntual de UX y data quality sobre una surface acotada. No hay un incidente de runtime confirmado y, en principio, no debería requerir arquitectura nueva ni rollout grande.

## Current State

- `src/views/greenhouse/finance/drawers/CreatePurchaseOrderDrawer.tsx` renderiza `Nombre contacto` y `Email contacto` como campos abiertos.
- La creación `POST /api/finance/purchase-orders` persiste `contactName` y `contactEmail` como snapshot libre.
- El dominio finance ya expone contactos asociados al cliente en la vista de detalle y en readers que priorizan memberships de organización sobre `finance_contacts` legacy.

## Proposed Change

- Reemplazar el ingreso libre principal por un selector/autocomplete de contactos filtrado por el cliente elegido.
- Autocompletar `email` a partir del contacto seleccionado y guardar el snapshot actual al crear la OC.
- Mantener un fallback manual controlado (`No encuentro el contacto`) para no bloquear operación.

## Acceptance Criteria

- [x] Al seleccionar cliente, el drawer ofrece contactos asociados a ese cliente como camino principal.
- [x] Al seleccionar contacto, nombre y email quedan consistentes sin tipeo manual obligatorio.
- [x] Sigue existiendo una salida manual explícita para excepciones.

## Verification

- Validación manual del drawer de OC en Finance.
- Smoke check de creación de OC con contacto sugerido y con fallback manual.
- `pnpm lint -- src/views/greenhouse/finance/drawers/CreatePurchaseOrderDrawer.tsx`
- `pnpm build`

## Notes

- Surface actual:
  - `src/views/greenhouse/finance/drawers/CreatePurchaseOrderDrawer.tsx`
  - `src/app/api/finance/purchase-orders/route.ts`
- Referencias de contactos ya presentes en finance:
  - `src/views/greenhouse/finance/ClientDetailView.tsx`
  - `src/app/api/finance/clients/[id]/route.ts`
- Implementación aplicada:
  - el drawer ahora intenta cargar primero memberships de la organización asociada al cliente
  - si existen memberships tipo `billing` / `contact` / `client_contact`, prioriza esas
  - si no existen contactos financieros explícitos, cae a miembros de esa misma organización con email
  - si tampoco hay memberships útiles, usa el snapshot client-specific de `financeContacts` legacy
  - el flujo manual sigue disponible mediante `No encuentro el contacto`

## Follow-ups

- Si el selector requiere reader reusable cross-surface o contrato nuevo de contactos financieros, promover a `TASK-###`.
