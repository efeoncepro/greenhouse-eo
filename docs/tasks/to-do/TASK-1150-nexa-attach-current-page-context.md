# TASK-1150 — Nexa attach current page context

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `flow`
- Backend impact: `api`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `nexa|platform|ai|ui|api|identity`
- Blocked by: `none`
- Branch: `task/TASK-1150-nexa-attach-current-page-context`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Agregar a Nexa la opcion explicita de adjuntar el contexto de la pantalla actual al turno del chat, similar al contexto que Codex recibe desde el IDE. La solucion debe reutilizar `NexaContextScope` como fuente declarativa, mostrar un affordance claro en el composer y enviar un contrato versionado y revalidado al backend de `/api/home/nexa`.

Incluye una decision de higiene previa: el adapter legacy del floating (`createFloatingAdapter` dentro de `NexaFloatingButton.tsx`) no debe recibir features nuevas como camino separado. Debe retirarse o converger al runtime canonico antes de shippear el contexto adjunto.

## Why This Task Exists

Nexa ya tiene contexto de pagina para prompts sugeridos: `NexaContextScope` declara `entityName`, `entityId`, `entityKind`, `contextKey` y `entrypoint`, y `NexaFloatingPanel` lo usa para el empty hero/data-aware prompts. Pero el POST real del mensaje a `/api/home/nexa` solo manda `prompt`, `history`, `model`, `modelMode` y `threadId`; el backend reconstruye un contexto liviano de Home desde la sesion y no recibe la pantalla donde estaba parado el usuario.

El resultado es una experiencia partida: Nexa sugiere preguntas contextualizadas, pero al enviar un prompt no tiene un "contexto adjunto" explicito de esa superficie. Ademas, `NexaFloatingButton.tsx` conserva un adapter legacy efimero detras del fallback del flag expandible; si se agregan capacidades al runtime nuevo sin consolidar ese camino, el producto queda con dos Nexas visibles con contratos distintos.

## Goal

- Permitir que el usuario adjunte/desadjunte el contexto de la pantalla actual desde el composer de Nexa.
- Transportar ese contexto como contrato estructurado, acotado y versionado hacia `/api/home/nexa`.
- Revalidar server-side el contexto adjunto antes de inyectarlo en el turno; el cliente solo aporta una pista, nunca autoridad.
- Inyectar el contexto en `NexaService`/system prompt como contexto de turno, sin convertirlo en datos operativos no verificados.
- Retirar o converger el adapter legacy del floating para que el chat global tenga un solo runtime/conducto de mensajes.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_NEXA_ARCHITECTURE_V1.md`
- `docs/architecture/nexa-intelligence/README.md`
- `docs/architecture/nexa-intelligence/behavior/behavior-and-routing.md`
- `docs/architecture/nexa-intelligence/experience/suggested-prompts.md`
- `docs/architecture/nexa-intelligence/experience/conversational-experience.md`
- `docs/architecture/nexa-intelligence/technical/data-contracts.md`
- `docs/architecture/ui-platform/CONVERSATIONAL_EXPERIENCE.md`
- `docs/architecture/ui-platform/PRIMITIVES.md`
- `DESIGN.md`

Reglas obligatorias:

- El contexto adjunto es estructurado y allowlisted; no se envia DOM, texto arbitrario de pantalla, tablas completas ni datos sensibles crudos.
- El backend revalida cualquier `entityId`/`entityKind` enviado por el cliente contra la sesion, route groups, views y readers canonicos disponibles.
- El contexto adjunto orienta la respuesta; los datos operativos vivos siguen saliendo de tools/readers, no de un prompt inflado.
- No crear un chat nuevo por dominio ni un endpoint paralelo; extender el backend compartido `/api/home/nexa`.
- No agregar capacidades nuevas al adapter legacy del floating como camino divergente.

## Normative Docs

- `.codex/skills/greenhouse-nexa-conversational/SKILL.md`
- `docs/tasks/TASK_UI_UX_ADDENDUM.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/tasks/in-progress/TASK-1078-nexa-floating-chat-expandable-persisted.md`
- `docs/tasks/complete/TASK-1134-nexa-chat-auto-router-model-selection-truth.md`
- `docs/tasks/complete/TASK-1129-nexa-prompt-turn-telemetry.md`

## Dependencies & Impact

### Depends on

- `src/lib/nexa/nexa-page-context.tsx` — fuente cliente existente para `NexaContextScope` y `useNexaPageContext`.
- `src/lib/nexa/suggested-prompts.ts` — shape actual `NexaPageContextValue` y resolver por ruta/contexto.
- `src/views/greenhouse/nexa/floating-chat/NexaFloatingPanel.tsx` — panel vivo del floating expandible, lee `pageContext`.
- `src/lib/nexa/use-nexa-runtime.ts` — adapter canonico persistente que postea a `/api/home/nexa`.
- `src/app/api/home/nexa/route.ts` — endpoint compartido del chat.
- `src/lib/nexa/nexa-service.ts` — orquestador provider-agnostico.
- `src/lib/nexa/nexa-system-prompt.ts` — builder versionado del prompt.
- `src/components/greenhouse/NexaFloatingButton.tsx` — FAB global que conserva el fallback legacy `createFloatingAdapter`.

### Blocks / Impacts

- Mejora el puente futuro de `TASK-1118` ("Seguir con Nexa" cross-route con contexto transferido).
- Reduce deuda de `TASK-1078` al cerrar el camino legacy efimero del floating.
- Impacta todas las rutas dashboard donde el FAB global aparece, excepto `/home` donde el floating se oculta.
- Afecta la capa de documentacion/gate de Nexa Intelligence; cualquier cambio de contrato debe actualizar docs de capa y pasar `pnpm nexa:doc-gate --changed`.

### Files owned

- `src/lib/nexa/nexa-page-context.tsx`
- `src/lib/nexa/suggested-prompts.ts`
- `src/lib/nexa/use-nexa-runtime.ts`
- `src/lib/nexa/nexa-contract.ts`
- `src/lib/nexa/nexa-service.ts`
- `src/lib/nexa/nexa-system-prompt.ts`
- `src/app/api/home/nexa/route.ts`
- `src/components/greenhouse/NexaFloatingButton.tsx`
- `src/views/greenhouse/nexa/floating-chat/NexaFloatingPanel.tsx`
- `src/views/greenhouse/home/components/NexaThread.tsx`
- `src/components/greenhouse/primitives/NexaComposer.tsx`
- `src/components/greenhouse/primitives/nexa-composer-controller.ts`
- `src/lib/copy/nexa.ts`
- `docs/architecture/nexa-intelligence/**`
- `scripts/frontend/scenarios/nexa-*.scenario.ts`

## Current Repo State

### Already exists

- `NexaContextScope` permite que paginas declaren contexto liviano y se limpia en unmount.
- El dashboard layout envuelve paginas + FAB con `NexaContextProvider`.
- `/my`, `/finance`, `OrganizationWorkspaceShell`, `OrganizationEnterpriseWorkspaceRuntime` y `/knowledge` ya declaran contexto parcial.
- `NexaFloatingPanel` resuelve `promptContext` y `heroPrompts` desde `pageContext`.
- `useNexaPersistentRuntime` es el adapter canonico para Home/floating expandible: persiste `threadId`, suggestions y modelo.
- `/api/home/nexa` ya arma `runtimeContext` confiable desde sesion (`userId`, `clientId`, `routeGroups`, `organizationId`, `memberId`, etc.).
- `NexaFloatingButton.tsx` conserva `createFloatingAdapter` y `panelContent` legacy detras del fallback de `NEXA_FLOATING_EXPANDABLE_ENABLED`.

### Gap

- El request del chat no transporta `pageContext` ni `pathname`.
- El backend no tiene contrato `attachedContext`/`turnContext`, ni revalidacion por entidad/superficie.
- El system prompt solo recibe "CONTEXTO DEL USUARIO" y contexto Home-lite; no recibe "CONTEXTO ADJUNTO DE LA PANTALLA".
- El composer no tiene affordance para incluir/excluir contexto ni feedback de que se adjuntara.
- El adapter legacy del floating puede seguir respondiendo sin historial/contexto si el flag se apaga o si un entorno drifted queda en fallback.

## UI/UX Contract

### Experience brief

- UI rigor: `ui-standard`
- Usuario / rol: usuarios internos y clientes con acceso al chat flotante de Nexa.
- Momento del flujo: usuario esta en una ruta de producto y abre Nexa para preguntar "sobre esto" sin re-explicar la entidad/superficie.
- Resultado perceptible esperado: el composer muestra un chip/control claro de contexto, por ejemplo `Contexto: Cliente · Berel`, con estado on/off y tooltip breve.
- Friccion que debe reducir: repetir manualmente "estoy en la cuenta X / dashboard Y / facet Z" antes de preguntar.
- No-goals UX: no convertir el composer en un panel de configuracion, no adjuntar todo el contenido visible, no ocultar el origen del contexto.

### Surface & system decision

- Surface: chat flotante global de Nexa y cualquier montaje de `NexaThread` que consuma el runtime canonico.
- Composition Shell: `no aplica` — es una affordance dentro del chat/composer existente, no una nueva composicion de regiones.
- Primitive decision: `extend` — extender `NexaComposer`/`ChatComposer` con un action/chip contextual; no crear un composer paralelo.
- Adaptive density / The Seam: `no aplica` — control compacto dentro del composer, sin card adaptable nueva.
- Floating/Sidecar/Dialog decision: floating existente; no crear drawer/modal para seleccionar contexto en V1.
- Copy source: `src/lib/copy/nexa.ts`.
- Access impact: `none` en UI; el backend decide si el contexto se acepta o degrada.

### State inventory

- Default: contexto disponible y activado/desactivado segun decision de producto del plan.
- Loading: no aplica para declarar el contexto base; si hay enrich/revalidation async, mostrar estado discreto o no bloquear.
- Empty: si no hay `NexaContextScope`, mostrar sin chip o chip `Sin contexto de pagina` solo si ayuda.
- Error: si el contexto no puede revalidarse, Nexa responde sin contexto adjunto y registra degradacion; no bloquear el envio.
- Degraded / partial: contexto label-only aceptado, datos enriquecidos omitidos.
- Permission denied: si el usuario no puede ver la entidad, el server ignora el contexto y no revela existencia.
- Long content: labels truncados con tooltip, sin ensanchar el composer.
- Mobile / compact: chip debe caber sin tapar input/send; puede plegarse a icono+tooltip.
- Keyboard / focus: toggle accesible por teclado, foco visible, aria-label canonico.
- Reduced motion: sin motion requerida; cualquier transicion debe tener fallback.

### Interaction contract

- Primary interaction: toggle "incluir contexto de esta pagina" antes de enviar.
- Hover / focus / active: tooltip o aria description con texto breve; estado activo distinguible.
- Pending / disabled: disabled si no hay contexto declarativo.
- Escape / click-away: no aplica salvo tooltip/menu; no debe cerrar todo el panel por accidente.
- Focus restore: si el control abre tooltip/menu, foco vuelve al control/composer.
- Latency feedback: el envio no debe esperar readers pesados del cliente; revalidation ocurre server-side.
- Toast / alert behavior: no toast en happy path; errores degradan silenciosa y honestamente.

### Motion & microinteractions

- Motion primitive: `CSS`
- Enter / exit: aparicion discreta del chip cuando hay contexto.
- Layout morph: none.
- Stagger: none.
- Timing / easing token: theme transitions shortest/shorter si aplica.
- Reduced-motion fallback: sin transformaciones; cambio de estado inmediato.
- Non-goal motion: no glow nuevo ni animaciones de marca para el chip.

### Visual verification

- GVC scenario: agregar/actualizar scenario para chat flotante con contexto disponible y sin contexto.
- Viewports: desktop y mobile 390px.
- Required captures: composer con contexto activo, contexto desactivado, label largo truncado, mobile compact.
- Required `data-capture` markers: `nexa-floating-panel`, `nexa-composer`, y marcador nuevo para el control de contexto.
- Scroll-width check: medir `scrollWidth <= clientWidth` en desktop y mobile 390px.
- Accessibility/focus checks: tab order del toggle, aria-label, foco visible, send sigue accesible.
- Before/after evidence: captura antes/despues del composer.
- Known visual debt: el home legacy embebido puede quedar fuera si `TASK-1133` lo retira antes; si sigue vivo, validar que no se rompa.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `api`
- Source of truth afectado: `POST /api/home/nexa` + `NexaService.generateResponse` + contrato cliente `NexaPageContextValue`.
- Consumidores afectados: UI de Nexa, providers LLM indirectamente, docs/gates de Nexa Intelligence.
- Runtime target: `local|staging|production`

### Contract surface

- Contrato existente a respetar: `src/app/api/home/nexa/route.ts`, `src/lib/nexa/nexa-contract.ts`, `src/lib/nexa/use-nexa-runtime.ts`.
- Contrato nuevo o modificado: `nexa-turn-attached-context.v1` (nombre final validado en Plan Mode) transportado como `attachedContext`/`turnContext` en el request.
- Backward compatibility: `compatible` — clientes sin contexto siguen funcionando igual.
- Full API parity: UI envia un contrato programatico al endpoint compartido; no se agregan botones que solo cambien prompt text local ni endpoint ad hoc por dominio.

### Data model and invariants

- Entidades/tablas/views afectadas: `none` en V1; no migration por defecto.
- Invariantes que no se pueden romper:
  - El cliente nunca autoriza acceso a una entidad por mandar `entityId`.
  - Un contexto rechazado no revela si la entidad existe.
  - El contexto adjunto no reemplaza tools para datos vivos ni Knowledge para guias/procesos.
- Tenant/space boundary: derivado desde `getServerAuthSession()` y `runtimeContext`; cualquier entidad enviada debe validarse contra sesion/routeGroups/readers existentes.
- Idempotency/concurrency: no aplica a writes; el contexto es snapshot por turno.
- Audit/outbox/history: no outbox. Si se decide persistir metadata del contexto, debe ser aditivo y documentado en Plan Mode; V1 preferida es efimera por turno.

### Migration, backfill and rollout

- Migration posture: `none`.
- Default state: compatible y additive; si el plan considera riesgo UX, agregar flag `NEXA_ATTACHED_PAGE_CONTEXT_ENABLED` default OFF.
- Backfill plan: none.
- Rollback path: flag off si existe, o revert PR; sin data repair.
- External coordination: Vercel env/redeploy solo si se introduce flag; no integraciones externas.

### Security and access

- Auth/access gate: sesion de `/api/home/nexa`; revalidacion por route groups/views/entitlements/readers existentes.
- Sensitive data posture: potencial PII/finance/payroll por nombres de entidad; payload allowlisted y sin metricas/montos crudos.
- Error contract: usar errores canonicos existentes; no devolver raw errors; `captureWithDomain('home'|'nexa')` segun patron vigente.
- Abuse/rate-limit posture: no nuevo write; mantener presupuesto de payload y truncado defensivo.

### Runtime evidence

- Local checks: tests focales para builder/validator del contexto, adapter request body y endpoint backward-compatible.
- DB/runtime checks: no DB en V1; smoke local/staging para enviar con contexto y sin contexto.
- Integration checks: provider real via QA/manual local/staging si flags de Nexa disponibles.
- Reliability signals/logs: no signal obligatorio en V1; si se agrega degradacion observable, documentar en Nexa Intelligence.
- Production verification sequence: staging GVC + smoke de chat con contexto en `/finance`, `/my` y organización; production solo tras confirmacion.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Floating legacy adapter consolidation

- Verificar el estado real de `NEXA_FLOATING_EXPANDABLE_ENABLED`/`NEXT_PUBLIC_NEXA_FLOATING_EXPANDABLE_ENABLED` y el uso actual de `panelContent` legacy.
- Retirar `createFloatingAdapter` + `panelContent` legacy si el panel expandible ya es el unico camino operativo, o converger el fallback para que use el runtime canonico y el mismo contrato de request.
- Criterio duro: no implementar contexto adjunto en un adapter mientras otro sigue enviando un payload distinto a `/api/home/nexa`.

### Slice 2 — Attached context contract

- Definir un contrato puro y versionado para el contexto adjunto del turno (`nexa-turn-attached-context.v1` o nombre final), client-safe y server-safe.
- Extender `NexaPageContextValue` solo con campos allowlisted que las paginas puedan declarar de forma segura (`contextKey`, `entityKind`, `entityId`, `entityName`, `entrypoint`, `pathname`, `activeFacet` si aplica).
- Agregar builder/normalizer que transforme `pageContext + pathname + promptContext` en snapshot acotado, con truncado defensivo y sin datos crudos.
- Tests unitarios del normalizer: sin contexto, label largo, entityId ausente, payload malformado, contexto desactivado.

### Slice 3 — Composer affordance

- Extender `ChatComposer`/`NexaComposer` para mostrar un control accesible de incluir/excluir contexto cuando exista contexto declarativo.
- Copy en `src/lib/copy/nexa.ts`; no literales JSX reutilizables.
- Mantener mobile compacto, foco visible y send/stop accesibles.
- Pasar el estado del toggle al runtime canonico sin acoplar `NexaComposer` a server-only code.

### Slice 4 — Request transport + server revalidation

- Extender `useNexaPersistentRuntime` para enviar `attachedContext` en el POST junto con `prompt`, `history`, `modelMode` y `threadId`.
- Extender `/api/home/nexa` para aceptar el contrato, validarlo en shape y revalidar lo sensible contra la sesion.
- Degradar a `null` si el contexto no es valido o no esta permitido, sin revelar existencia ni bloquear el turno.
- Mantener backward compatibility para requests sin `attachedContext`.

### Slice 5 — Prompt/runtime integration

- Extender `NexaService.generateResponse` para recibir el contexto adjunto validado.
- Inyectar una seccion breve "CONTEXTO ADJUNTO DE LA PANTALLA" en el system prompt o en un bloque de turno equivalente, respetando versionado/golden snapshots si toca `nexa-system-prompt.ts`.
- Reglas en prompt: usar contexto como orientacion, no como estado operativo vivo; si se necesita dato vivo, usar tool.
- Actualizar Nexa Intelligence docs + `manifest.json` si el gate lo exige.

### Slice 6 — Verification, GVC and docs

- Tests focales del adapter, endpoint y prompt/context builder.
- GVC desktop/mobile del floating con contexto activo/desactivado.
- Smoke local/staging: preguntar desde `/finance`, `/my` y una organization workspace; verificar que Nexa entiende la superficie sin que el usuario la repita.
- `pnpm nexa:doc-gate --changed`, `pnpm task:lint --task TASK-1150`, `pnpm ops:lint --changed`.

## Out of Scope

- Capturar DOM o texto arbitrario de la pantalla.
- Persistir metadata del contexto en DB como requisito de V1; si se necesita para historial visual, crear follow-up o justificar migration en Plan Mode.
- Crear tools operativos nuevos para cada dominio.
- Resolver `TASK-1118` cross-route composition; esta task solo deja un contrato reutilizable por ese puente.
- Rediseñar completo del chat o moverlo a sidecar C (`TASK-1079`).
- Mantener el adapter legacy como camino con capacidades divergentes.

## Detailed Spec

### Contrato propuesto

```ts
interface NexaTurnAttachedContextV1 {
  contractVersion: 'nexa-turn-attached-context.v1'
  source: 'current_page'
  enabled: boolean
  pathname: string
  contextKey: 'general' | 'finance' | 'client' | 'payroll' | 'personal'
  label: string
  entity?: {
    kind: 'organization' | 'member' | 'finance_scope'
    id: string
    name?: string
  }
  entrypoint?: 'agency' | 'finance'
  activeFacet?: string
}
```

El shape final se decide en Plan Mode, pero debe preservar estas propiedades:

- versionado explicito;
- payload pequeno;
- datos allowlisted;
- degradacion a `null`;
- revalidacion server-side;
- compatible con futuro `TASK-1118` y con el modelo de Nexa Moment (`context + evidence + permission + intent + next step`).

### Decision sobre floating legacy

El adapter legacy en `src/components/greenhouse/NexaFloatingButton.tsx` existe porque `TASK-1078` dejo el panel expandible detras de flag. El Handoff indica que el flag fue encendido en entornos; por lo tanto, el camino legacy ya no debe recibir nuevas capacidades.

Decision operativa de esta task:

- Preferido: eliminar `createFloatingAdapter`, el `useLocalRuntime` efimero y `panelContent` fallback, dejando `NexaFloatingPanel` como unico panel del FAB.
- Alternativa aceptable si se requiere rollback del flag: hacer que el fallback use el mismo adapter canonico/contrato que `useNexaPersistentRuntime`, sin duplicar request body.
- No aceptable: agregar `attachedContext` solo a `useNexaPersistentRuntime` y dejar `createFloatingAdapter` enviando payload viejo.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (legacy adapter consolidation) debe completarse antes de Slice 3/4.
- Slice 2 (contrato puro) debe completarse antes de UI/backend integration.
- Slice 4 (server revalidation) debe existir antes de encender cualquier UI que envie contexto.
- Slice 5 (prompt integration) debe shippear con docs/golden/doc-gate si toca prompt.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Contexto de entidad no autorizada induce respuesta sobre cuenta/persona ajena | identity/api | medium | server revalidation + anti-oracle degrade to null | logs/captureWithDomain, tests permission denied |
| Payload de contexto filtra datos sensibles | nexa/security | medium | allowlist estricta, truncado, sin metricas/montos crudos | test snapshots del payload |
| Dos adapters del floating quedan con comportamiento distinto | UI/API | medium | Slice 1 bloqueante: retirar/converger legacy | GVC/runtime smoke en rutas con flag on/off si aplica |
| Prompt se vuelve demasiado largo o confunde tools vs contexto | ai/runtime | low | seccion breve + regla "contexto orienta, tools verifican" + QA focal | QA manual/staging |
| Chip del composer rompe layout mobile | UI | medium | GVC mobile 390 + scrollWidth check | GVC finding / scrollWidth > clientWidth |

### Feature flags / cutover

- Preferido: sin flag nuevo si el contexto adjunto es opt-in por UI y backward-compatible.
- Si Plan Mode detecta riesgo de rollout, agregar `NEXA_ATTACHED_PAGE_CONTEXT_ENABLED` y mirror `NEXT_PUBLIC_NEXA_ATTACHED_PAGE_CONTEXT_ENABLED`, default OFF, con server-side defense in depth.
- Revert: apagar flag o revertir PR; sin migration/data repair.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR o reactivar fallback solo si se dejo detras de flag | <30 min | si |
| Slice 2 | revert contrato puro | <15 min | si |
| Slice 3 | ocultar control por flag/copy or revert UI | <15 min | si |
| Slice 4 | ignorar `attachedContext` server-side | <15 min | si |
| Slice 5 | remover inyeccion de contexto/prompt via revert o flag | <30 min | si |
| Slice 6 | no aplica | N/A | si |

### Production verification sequence

1. Local: tests focales + GVC desktop/mobile.
2. Staging: abrir Nexa en `/finance`, `/my` y organization workspace; enviar pregunta contextual con chip activo y verificar respuesta.
3. Staging: repetir con chip apagado; Nexa no debe asumir contexto de pagina.
4. Staging: probar payload manipulado o entidad no autorizada via test/route; debe degradar sin revelar existencia.
5. Production: deploy con flag OFF si existe; smoke sin contexto.
6. Production: activar flag si existe; smoke con usuario autorizado; monitorear errores `home`/`nexa`.

### Out-of-band coordination required

- N/A — repo-only salvo que se introduzca flag de Vercel, en cuyo caso requiere set env + redeploy.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — ACCEPTANCE & CLOSURE
     "Como compruebo que termine y que actualizo?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `NexaFloatingButton.tsx` no conserva un adapter legacy divergente para el panel flotante, o el fallback usa el mismo contrato canonico que el panel nuevo.
- [ ] Existe un contrato versionado para contexto adjunto del turno y esta documentado en Nexa Intelligence.
- [ ] El composer muestra un control accesible para incluir/excluir contexto cuando la pagina declara `NexaContextScope`.
- [ ] El request de `useNexaPersistentRuntime` envia contexto solo cuando corresponde y mantiene backward compatibility.
- [ ] `/api/home/nexa` valida shape y revalida permisos/entidad antes de pasar contexto a `NexaService`.
- [ ] Un contexto no autorizado o malformado degrada a `null` sin bloquear el turno ni revelar existencia.
- [ ] El system prompt/runtime usa el contexto como orientacion de turno y conserva la regla de usar tools/readers para datos vivos.
- [ ] Copy visible vive en `src/lib/copy/nexa.ts`.
- [ ] GVC desktop + mobile muestra composer con contexto activo/desactivado y sin scroll horizontal de pagina.
- [ ] `pnpm nexa:doc-gate --changed` pasa si se tocan dominios Nexa.

## Verification

- `pnpm task:lint --task TASK-1150`
- `pnpm ops:lint --changed`
- `pnpm exec eslint src/lib/nexa src/app/api/home/nexa src/views/greenhouse/nexa src/views/greenhouse/home/components/NexaThread.tsx src/components/greenhouse/NexaFloatingButton.tsx`
- `pnpm vitest run src/lib/nexa src/app/api/home/nexa`
- `pnpm tsc --noEmit`
- `pnpm nexa:doc-gate --changed`
- `pnpm fe:capture <scenario-nexa-context> --env=local` desktop + mobile
- Playwright/GVC scroll-width check desktop + mobile 390px

## Closing Protocol

- Mover el archivo a `docs/tasks/complete/` y cambiar `Lifecycle: complete`.
- Sincronizar `docs/tasks/README.md` y `docs/tasks/TASK_ID_REGISTRY.md`.
- Actualizar `Handoff.md` con decision final sobre el adapter legacy y evidencia de runtime.
- Invocar `greenhouse-qa-release-auditor` si el cambio se implementa en runtime.
- Invocar `greenhouse-documentation-governor` y correr `pnpm docs:closure-check`.

## Follow-ups

- Persistir metadata de contexto por mensaje si se decide que el historial debe mostrar el chip despues de reload.
- Usar el contrato de contexto adjunto como input del puente cross-route de `TASK-1118`.
- Agregar resolvers de contexto mas ricos por facet solo cuando existan readers canonicos y permisos claros.
