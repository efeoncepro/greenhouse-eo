# MINI-003 — OC debe permitir cargar respaldo después del registro para que HES lo herede

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Domain: `finance`
- Type: `mini-improvement`
- Branch: `mini/MINI-003-po-post-create-document-upload-for-hes-inheritance`
- Related Task: `none`
- Related Issue: `none`

## Summary

Hoy la HES hereda el respaldo desde la OC vinculada, pero si la OC fue creada sin documento y luego queda inmutable desde la UI, la operación queda atrapada: la HES no debe tener PDF propio y la OC no ofrece una surface para completar ese respaldo después del alta.

## Why Mini

El problema es local al workflow de Finance entre OC y HES. El backend de OC ya soporta `PUT` para actualizar `attachmentAssetId` / `attachmentUrl`, por lo que el faltante principal es una surface de edición acotada en la UI.

## Current State

- `CreatePurchaseOrderDrawer` permite subir respaldo solo al crear la OC.
- `PurchaseOrdersListView` no ofrece acción visible para completar o reemplazar el respaldo después del registro.
- `CreateHesDrawer` hereda correctamente el respaldo desde la OC, pero queda bloqueada si esa OC no tiene documento cargado.

## Proposed Change

- Agregar una acción acotada en la surface de OC para cargar o reemplazar el respaldo después del registro.
- Mantener la propiedad del PDF en la OC, no en la HES.
- Ajustar el copy del flujo HES para dejar explícito que el documento debe completarse en la OC cuando falte.

## Acceptance Criteria

- [x] Una OC ya registrada puede recibir o reemplazar su respaldo desde la UI.
- [x] La HES sigue heredando el documento desde la OC, sin convertirse en owner del PDF.
- [x] Si la OC no tiene respaldo, el flujo HES comunica claramente que el documento debe cargarse en la OC.

## Verification

- `pnpm exec vitest run src/lib/finance/purchase-order-store.test.ts`
- `pnpm lint -- src/views/greenhouse/finance/PurchaseOrdersListView.tsx src/views/greenhouse/finance/drawers/UpdatePurchaseOrderDocumentDrawer.tsx src/views/greenhouse/finance/drawers/CreateHesDrawer.tsx src/lib/finance/purchase-order-store.ts src/lib/finance/purchase-order-store.test.ts`
- `pnpm build`
- Intento de validación manual local bloqueado por Playwright MCP (`ENOENT: no such file or directory, mkdir '/.playwright-mcp'`)

## Notes

- Backend reusable ya existe:
  - `src/app/api/finance/purchase-orders/[id]/route.ts`
  - `src/lib/finance/purchase-order-store.ts`
- Surface candidata a intervenir:
  - `src/views/greenhouse/finance/PurchaseOrdersListView.tsx`
- Implementación cerrada:
  - drawer nuevo `src/views/greenhouse/finance/drawers/UpdatePurchaseOrderDocumentDrawer.tsx`
  - `PurchaseOrdersListView` ahora permite cargar o reemplazar respaldo por fila
  - `CreateHesDrawer` aclara que el respaldo debe completarse en la OC
  - `purchase-order-store` orfana el asset anterior cuando una OC reemplaza su documento para evitar arrastre de adjuntos supersedidos

## Follow-ups

- Si la edición post-registro de OC requiere drawer de detalle, acciones por fila o patrón reusable cross-module, reevaluar si sigue siendo mini-task o promover a `TASK-###`.
