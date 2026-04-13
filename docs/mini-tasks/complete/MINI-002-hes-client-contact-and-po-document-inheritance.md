# MINI-002 — HES debe usar contacto vinculado al cliente y heredar respaldo desde la OC

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Domain: `finance`
- Type: `mini-improvement`
- Branch: `mini/MINI-002-hes-client-contact-and-po-document-inheritance`
- Related Task: `none`
- Related Issue: `none`

## Summary

El drawer de HES debía alinearse con el flujo nuevo de OC para mejorar calidad de datos: contacto y email ya no debían capturarse como texto libre por defecto, sino desde la lista de contactos asociados al cliente seleccionado. Además, la HES no debía pedir un adjunto propio; si existe una OC vinculada con respaldo cargado, ese documento debía heredarse de forma automática.

## Why Mini

El cambio es local al módulo Finance y no abre contratos nuevos de API ni schema. Reutiliza surfaces y endpoints ya existentes del flujo de OC, con impacto acotado al drawer de HES y a un helper compartido de UI.

## Current State

- `CreateHesDrawer` usaba `Contacto del cliente` y `Email contacto` como campos abiertos.
- `CreateHesDrawer` exponía `URL del documento (PDF)` como campo editable.
- La lógica para cargar contactos asociados al cliente ya existía en el drawer de OC, pero estaba duplicada y local a esa surface.

## Proposed Change

- Extraer la carga de contactos asociados al cliente a un helper compartido para Finance drawers.
- Reusar ese carril en HES con el mismo patrón de OC:
  - selector de contacto vinculado
  - email autocompletado
  - fallback manual explícito solo cuando haga falta
- Quitar el campo editable de documento en HES.
- Cuando la HES tenga una OC vinculada con respaldo, heredar `attachmentUrl` de la OC y mostrar ese estado en la UI.

## Acceptance Criteria

- [x] El drawer de HES carga contactos asociados solo al cliente seleccionado.
- [x] El contacto principal se elige desde un desplegable/autocomplete y el email se completa desde ese contacto.
- [x] La HES deja de mostrar un campo editable para `URL del documento (PDF)`.
- [x] Si la OC vinculada tiene respaldo, la HES hereda ese documento en vez de pedir uno nuevo.
- [x] La lógica de contactos queda reutilizable entre OC y HES, no duplicada en dos implementaciones separadas.

## Verification

- `pnpm lint -- src/views/greenhouse/finance/drawers/financeClientContacts.ts src/views/greenhouse/finance/drawers/CreatePurchaseOrderDrawer.tsx src/views/greenhouse/finance/drawers/CreateHesDrawer.tsx`
- `pnpm build`

## Notes

- Paths tocados:
  - `src/views/greenhouse/finance/drawers/CreateHesDrawer.tsx`
  - `src/views/greenhouse/finance/drawers/CreatePurchaseOrderDrawer.tsx`
  - `src/views/greenhouse/finance/drawers/financeClientContacts.ts`
- La herencia del respaldo usa la data existente de la OC vinculada; no crea un lane nuevo de adjuntos para HES.

## Follow-ups

- Si más drawers de Finance necesitan el mismo patrón de contacto asociado al cliente, promover el helper a una capa reusable más explícita dentro del módulo.
