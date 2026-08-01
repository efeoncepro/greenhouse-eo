# TASK-1628 — Globe Producer Credit Capacity Self-View · Motion Contract

## Meta

- Status: `ready-for-implementation`.
- Owner task: `TASK-1628 — Globe Producer Credit Capacity Self-View`.
- Related wireframe: `docs/ui/wireframes/TASK-1628-globe-producer-credit-capacity-self-view.md`.
- Related flow: `docs/ui/flows/TASK-1628-globe-producer-credit-capacity-self-view-flow.md`.
- Motion type: `microinteraction`.
- Primary primitive/library: CSS del payload Globe; sin librería nueva.
- Governing SSOT: `docs/architecture/creative-studio/GLOBE_CLIENT_MOTION_CONTRACT_V1.md`.

Este documento aplica el contrato compartido al control de créditos. No define timings, easing ni valores visuales
paralelos: todos salen de los tokens vigentes del payload React/Tailwind.

## Motion Brief

- Usuario: creative user, creative lead u operador que consulta capacidad antes de generar.
- Intención: hacer evidente la relación trigger → popover y los cambios de status sin convertir el saldo en un
  espectáculo financiero.
- Incertidumbre reducida: si el panel abrió, si el dato está refrescando y si cambió la razón de bloqueo.
- No-goals: count-up, donut desde cero, celebración de fondeo, pulsos ambientales o animar cada refresh.

## Motion Inventory

| Elemento | Trigger | Feedback | Required |
| --- | --- | --- | --- |
| Trigger de créditos | hover/focus/pressed | estados CSS tokenizados + focus visible | sí |
| Popover | open/close | transición anclada existente, opacity/transform | sí |
| Skeleton → status | read settle | reemplazo estable sin animar el número desde cero | sí |
| Cambio de reason | refresh con nuevo estado | actualización inline; `aria-live=polite` sólo al asentarse | sí |
| CTA Greenhouse | hover/focus | feedback estándar del control existente | si hay entitlement |

## Transition Specs

- Reusar la transición actual de `CreditsPopover`; no introducir otra keyframe ni duplicar el controller.
- Propiedades permitidas: `opacity` y `transform`. El layout del header no se anima.
- Timing/easing: tokens existentes del theme Tailwind v4 de Globe, derivados de `tokens.ts`.
- Un refresh no cierra/reabre el popover, no desplaza el trigger y no reproduce la entrada completa.
- El cambio de status preserva contraste en cada frame; el texto nunca se desvanece por debajo de AA.

## Reduced Motion Contract

- Detección mediante `prefers-reduced-motion: reduce` en el CSS existente.
- Open/close aplica el estado final de inmediato; focus, status, reason y CTA conservan el mismo significado.
- Skeleton no usa shimmer si el contrato global lo desactiva; permanece una forma estática con label accesible.
- No se elimina ningún control ni affordance al retirar la transición.

## Accessibility & Feedback

- Trigger con `aria-expanded`/relación al popover y label que incluye estado, no sólo cifra.
- Escape y click-away cierran; el foco vuelve al trigger.
- La llegada de un status usa `aria-live=polite` sólo después del settle; loading no anuncia ceros provisionales.
- Color nunca es la única señal: `Disponible|Bajo|Bloqueado|Parcial|Desactualizado` siempre aparece como texto.
- Error/permission permanecen estáticos, sanitizados y con retry únicamente de lectura.

## Performance Guardrails

- Cero loops ambientales, layout animation, timers de count-up o listeners nuevos por refresh.
- La transición queda acotada al floating surface y usa compositor-only properties.
- Mobile 390 px mantiene el popover dentro del viewport y no anima tamaño/posición durante reflow.

## GVC / Micro Evidence

- Scenario: `globe-producer-credit-capacity-self-view`.
- Viewports: `1440x1000` y `390x844` con `qualityProfile: premium`.
- Capturas: closed/open, keyboard focus, loading→healthy, effective-zero con ledger positivo, stale/partial y error.
- Reduced-motion: verificar apertura inmediata, foco restaurado, texto/status íntegros y ausencia de count-up.
- Browser: exclusivamente la sesión Chrome autenticada anclada al perfil indicado por el operador.
