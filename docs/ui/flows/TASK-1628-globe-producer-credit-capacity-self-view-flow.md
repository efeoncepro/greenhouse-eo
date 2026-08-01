# TASK-1628 — Globe Producer Credit Capacity Self-View Flow

## Primary flow

1. Producer resuelve la sesión/workspace y solicita `CreditCapacitySelfStatusV1` por su BFF.
2. El header renderiza estado + `effectiveAvailable`; loading/partial nunca inventan cero.
3. El usuario abre el popover con mouse o teclado.
4. El popover descompone período, spent/held/cap, funding, ledger y daily fence.
5. Si existe blocker, muestra reason + recommended action tipadas.
6. En el rollout interno, el CTA navega a Greenhouse `/admin/globe/credits` sin transportar authority;
   Greenhouse revalida sesión/entitlement al entrar y muestra su estado de acceso canónico.
7. Escape/click-away cierra y restaura foco al trigger.

## Degraded and recovery

- `partial|stale`: conserva el último dato identificado como stale y muestra freshness; nunca estado healthy.
- `unknown`: no muestra denominador ni porcentaje inventado.
- error de read: retry sólo vuelve a leer self-status; no dispara command ni generación.
- denied: explica el límite sin revelar otros workspaces o detalles administrativos.

## Authority boundary

- Producer no fondea, no propone y no confirma.
- El deep link no transporta tokens, montos firmados ni authority; Greenhouse revalida sesión/entitlement.
- El mismo snapshot de TASK-1482 alimenta self-status y administración, con proyecciones distintas por audience.

## Focus and responsive contract

- Trigger, popover y CTA recorren orden de foco lógico.
- Escape y click-away restauran foco.
- A 390 px el popover permanece dentro del viewport y la página no adquiere scroll horizontal.
- Reduced motion elimina transición sin ocultar feedback de loading/status.
