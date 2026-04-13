# MINI-004 — HES debe modelarse como documento recibido del cliente, no como envío outbound

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Domain: `finance`
- Type: `mini-improvement`
- Branch: `mini/MINI-004-hes-received-workflow-semantics`
- Related Task: `none`
- Related Issue: `none`

## Summary

La UI actual de HES habla de `Enviar al cliente`, `Enviada` y `Aprobada por`, pero la operación real es la opuesta: la HES es un documento que el cliente nos entrega para respaldar la recepción del servicio. El flujo visible debe expresar recepción y validación, no envío outbound.

## Why Mini

El cambio es local al módulo HES de Finance. No requiere schema nuevo y puede resolverse reutilizando el lifecycle backend actual, ajustando semántica visible y el estado inicial que se asigna al registrar una HES desde la UI.

## Current State

- `CreateHesDrawer` crea HES con `status = 'draft'`.
- La UI muestra `Borrador` inmediatamente después de registrar, aunque el usuario interpreta `Registrar HES` como registrar una HES ya recibida.
- La acción secundaria del lifecycle dice `Enviar al cliente`, lo que contradice el proceso real.
- KPIs, filtros y badges siguen la misma semántica equivocada.

## Proposed Change

- Hacer que `Registrar HES` deje la HES en estado operativo de `recibida` usando el status backend existente `submitted`.
- Renombrar la semántica visible:
  - `submitted` -> `Recibida`
  - `approved` -> `Validada`
  - `rejected` -> `Observada`
- Ajustar CTA, helper text, toasts, columnas y KPIs para que hablen de recepción y validación.
- Documentar funcionalmente el workflow HES como evidencia recibida del cliente.

## Acceptance Criteria

- [x] Al registrar una HES desde la UI, ya no queda presentada al usuario como `Borrador`.
- [x] La UI deja de usar copy outbound como `Enviar al cliente` o `Enviada`.
- [x] El módulo HES expresa recepción y validación de forma consistente en lista, drawer y feedback.
- [x] La documentación funcional deja explícito que la HES es un respaldo recibido del cliente.

## Verification

- `pnpm exec vitest run src/lib/finance/hes-store.test.ts`
- `pnpm lint -- src/lib/finance/hes-store.ts src/lib/finance/hes-store.test.ts src/views/greenhouse/finance/HesListView.tsx src/views/greenhouse/finance/drawers/CreateHesDrawer.tsx src/app/api/finance/hes/route.ts src/app/api/finance/hes/[id]/submit/route.ts src/app/api/finance/hes/[id]/approve/route.ts src/app/api/finance/hes/[id]/reject/route.ts`
- `pnpm build`
- Validación manual de coherencia visual y semántica en `Finance > HES`

## Notes

- Contrato arquitectónico relevante:
  - `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- Surface principal:
  - `src/views/greenhouse/finance/HesListView.tsx`
  - `src/views/greenhouse/finance/drawers/CreateHesDrawer.tsx`
- Cierre implementado:
  - `createHes()` ahora nace en `submitted` para reflejar `Recibida`
  - lista, drawer y lifecycle usan semántica de recepción, validación y observación
  - doc funcional nueva en `docs/documentation/finance/hes-recepcion-y-validacion.md`
