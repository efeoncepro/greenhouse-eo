# Plan — TASK-252 Admin Center Ops Copilot

## Discovery summary

- `TASK-252` sigue **bloqueada por `TASK-251`**. No corresponde iniciar implementación mientras no exista la truth layer del control plane reactivo, el contrato de backlog real ni el replay scoped/dry-run que esta task necesita consumir.
- La arquitectura vigente sí soporta el objetivo de la task una vez levantado el blocker:
  - `docs/architecture/GREENHOUSE_NEXA_AGENT_SYSTEM_V1.md` ya define evolución hacia detección proactiva, recomendaciones accionables y dispatch de notificaciones con guardrails.
  - `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md` formaliza el control plane reactivo, dominios, queue y recovery cron sobre el que debe groundedarse el copiloto.
  - `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md` y `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` exigen compatibilidad `person-first` sin romper `userId`/`memberId`/`identityProfileId`, lo que aplica directamente al dispatch de notificaciones del copiloto.
- El repo real confirma tres foundations reutilizables:
  - `src/lib/nexa/nexa-service.ts` ya implementa function calling con follow-up LLM y `runtimeContext` estructurado.
  - `src/lib/nexa/nexa-tools.ts` ya centraliza tools con gating por `routeGroups` y `roleCodes`, aunque hoy están enfocadas en Home (`check_payroll`, `get_otd`, `check_emails`, `get_capacity`, `pending_invoices`).
  - `src/lib/notifications/notification-service.ts` ya es el canal canónico para avisos in-app/email; las categorías vigentes relevantes son `ico_alert`, `capacity_warning` y `system_event`.
- `src/app/api/internal/greenhouse-agent/route.ts` y `src/lib/ai/greenhouse-agent.ts` existen, pero hoy funcionan como **prompt helper advisory** contra Vertex AI, no como runtime de tools/function calling. Sirven para guidance, no como base principal del approved-operator pattern.
- Las surfaces target existen y ya tienen affordances operativas:
  - `src/views/greenhouse/admin/AdminCenterView.tsx` ya expone cards de `Ops Health`, `Notificaciones`, `Cloud & Integrations` y gobierno admin.
  - `src/views/greenhouse/admin/AdminOpsHealthView.tsx` ya muestra KPIs, subsistemas, auditoría y panel de acciones.
  - `src/views/greenhouse/admin/AdminOperationalActionsPanel.tsx` ya resuelve el patrón manual `confirm -> POST endpoint -> feedback`, pero hoy solo para acciones globales sin scoping fino.
- Los endpoints reactivos actuales existen pero siguen demasiado gruesos para el copiloto:
  - `src/app/api/admin/ops/reactive/run/route.ts` y `src/app/api/admin/ops/replay-reactive/route.ts` hoy disparan `processReactiveEvents()` sin scope, sin `dryRun` y sin separación real entre `run current backlog` y `replay unreacted backlog`.
  - `src/app/api/internal/projections/route.ts` ya ofrece stats por handler y queue health, pero todavía no expone backlog reactivo oculto ni lag institucional.
- Discrepancias detectadas entre la task y el repo real:
  - `Files owned` incluye `src/components/greenhouse/[verificar]`, que es placeholder y debe resolverse al abrir el slice UI.
  - Las skills relevantes existen, pero sus rutas reales están en `/Users/jreye/.claude/skills/*`, no bajo el repo.
  - La task es correcta conceptualmente, pero **no ejecutable todavía** por dependencia explícita en `TASK-251`.

## Skills

- Slice 1: `greenhouse-backend`
  - definición del carril admin/internal con tools estructuradas, contratos de lectura y action gating.
- Slice 2: `greenhouse-backend`
  - contrato `suggest -> dryRun -> confirm -> execute` y policy de notificaciones no invasivas sobre `NotificationService`.
- Slice 3: `greenhouse-dev`
  - integración en `Admin Center` / `Ops Health` sin abrir un shell paralelo ni romper patrones Vuexy/MUI del repo.
- Slice 4: `greenhouse-backend` + `greenhouse-dev`
  - auditability, permisos, response shape y tests de contract/UI.

## Subagent strategy

`sequential`

- No conviene forkear mientras `TASK-251` siga abierta, porque la principal decisión de esta lane depende del shape final del control plane reactivo.
- El valor está en mantener una sola línea de diseño entre backend tools, approval flow, notifications policy y surface UI.

## Runtime decision

**Base primaria recomendada: extender `NexaService` y el stack `src/lib/nexa/*` para un carril admin/ops.**

Justificación:

- ya existe function calling real
- ya existe contrato `runtimeContext`
- ya existe gating por roles y route groups
- ya existe patrón de tool declarations + tool execution + synthesized answer
- es más natural agregar tools de lectura, tools de acción aprobada y un tool controlado de notificación que convertir `greenhouse-agent` desde cero en runtime tool-based

Rol recomendado de `greenhouse-agent` en esta lane:

- mantenerlo como helper advisory interno o fallback de planeación/review
- no usarlo como base principal del copiloto operativo con tools y approval flow

## Checkpoint

`human`

Justificación:

- `TASK-252` es `P2` pero `Effort = Alto`
- además está bloqueada por `TASK-251`
- el plan puede quedar aprobado ahora, pero la ejecución debe esperar el cierre explícito del blocker

## Execution order

0. **Gate de desbloqueo**
   - cerrar `TASK-251` o, como mínimo, confirmar que ya existen en runtime:
     - backlog reactivo real
     - lag institucional
     - replay scoped
     - `dryRun`
     - APIs/reader canónicos listos para consumo

1. **Formalizar el contract del Ops Copilot sobre runtime admin/internal**
   - definir el shape del request/response del copiloto para `Admin Center` y `Ops Health`
   - separar respuestas de diagnóstico, acciones sugeridas y decisiones de notificación
   - fijar response fields mínimos:
     - `summary`
     - `recommendedAction`
     - `scope`
     - `riskLevel`
     - `requiresApproval`
     - `proposedPayload`
     - `notificationDecision`
     - `notificationCategory`
     - `notificationMode`
     - `notificationAudience`
     - `notificationReason`

2. **Agregar tools de lectura ops sobre la truth layer de `TASK-251`**
   - tool para backlog reactivo real
   - tool para lag / stalled reactor
   - tool para top event types / oldest-newest backlog window
   - tool para queue + failed handlers + state synthesis

3. **Agregar action tools con separación explícita entre sugerir y ejecutar**
   - `dryRun replay` scoped
   - `prepare replay payload`
   - `prepare drain payload`
   - `escalate issue draft`
   - mantener ejecución mutante detrás de confirmación humana y endpoint admin existente o endurecido

4. **Agregar soft-alert tooling sobre el sistema actual de notificaciones**
   - reutilizar `NotificationService.dispatch()`
   - restringir categorías a `ico_alert`, `capacity_warning`, `system_event`
   - aplicar metadata obligatoria (`source`, `reason`, `triggerType`, `recommendationId`)
   - aplicar dedupe/rate limit/quiet-hours policy cuando exista
   - separar `suggest notification`, `draft notification` y `dispatch notification`

5. **Integrar la surface UI en Admin**
   - elegir un panel/drawer en `AdminOpsHealthView` como primer surfacing
   - evaluar un CTA secundario o resumen compacto en `AdminCenterView`
   - reutilizar `AdminOperationalActionsPanel` para el paso de confirmación cuando convenga
   - no abrir chat full-screen paralelo

6. **Auditability, permisos y tests**
   - registrar recomendaciones y dispatches relevantes
   - asegurar gating `internal` / `admin`
   - cubrir tool contracts, approval flow y response shape de UI/API

7. **Cierre documental**
   - actualizar `Handoff.md`
   - actualizar `project_context.md` si el copiloto interno pasa a baseline institucional
   - revisar si hay que dejar nota funcional en documentación interna

## Files to create

- `docs/tasks/plans/TASK-252-plan.md`
- `src/lib/nexa/tools/operations/get-reactive-backlog.ts`
- `src/lib/nexa/tools/operations/get-reactive-lag.ts`
- `src/lib/nexa/tools/operations/prepare-reactive-replay.ts`
- `src/lib/nexa/tools/actions/dispatch-ops-notification.ts`
- `src/components/greenhouse/admin/OpsCopilotDrawer.tsx`
- `src/components/greenhouse/admin/OpsCopilotSummaryCard.tsx`
- `src/lib/nexa/tools/operations/*.test.ts`
- `src/components/greenhouse/admin/OpsCopilotDrawer.test.tsx`

## Files to modify

- `src/lib/nexa/nexa-contract.ts`
  - ampliar tool names y response shape para diagnóstico ops + decisions de notificación.
- `src/lib/nexa/nexa-tools.ts`
  - registrar tools admin/ops y gating por surface/route group.
- `src/lib/nexa/nexa-service.ts`
  - soportar nuevo carril admin/ops, prompts y synthesis sobre tools del control plane.
- `src/app/api/internal/greenhouse-agent/route.ts`
  - opcionalmente exponer surface metadata o puente advisory, sin convertirlo en runtime principal.
- `src/lib/ai/greenhouse-agent.ts`
  - mantener alineación de guidance con la nueva capability si sigue usándose como helper complementario.
- `src/views/greenhouse/admin/AdminOpsHealthView.tsx`
  - integrar primer surface del copiloto y resumen del estado operativo.
- `src/views/greenhouse/admin/AdminCenterView.tsx`
  - agregar entrada compacta o CTA hacia el copiloto ops.
- `src/views/greenhouse/admin/AdminOperationalActionsPanel.tsx`
  - evaluar reuse para approval flow de acciones y confirmación de avisos.
- `src/lib/notifications/notification-service.ts`
  - solo si hace falta un wrapper/metadata helper; evitar cambiar su contrato base sin necesidad.
- `src/config/notification-categories.ts`
  - no tocar salvo que la política demuestre que falta una categoría y eso merezca decisión separada.

## Files to delete

- Ninguno esperado.

## Risk flags

- Ejecutar `TASK-252` antes de cerrar `TASK-251` produciría un copiloto sobre telemetría incompleta.
- Hay riesgo de duplicar runtimes si se intenta mezclar `greenhouse-agent` y `NexaService` como bases equivalentes; la lane debe elegir una sola base principal.
- Las notificaciones IA pueden degradarse en ruido operativo si no salen con severidad mínima, dedupe, rate limit y audience válida.
- `AdminOperationalActionsPanel` hoy asume acciones globales simples; puede requerir un wrapper más rico para payload preview, `dryRun` y aprobación.
- `src/app/api/admin/ops/reactive/run/route.ts` y `src/app/api/admin/ops/replay-reactive/route.ts` hoy son demasiado parecidas; esta lane depende de que `TASK-251` las separe semánticamente primero.

## Open questions

- Si el primer surfacing debe vivir solo en `AdminOpsHealthView` o también en `AdminCenterView` desde la primera iteración.
- Si las notificaciones no invasivas pueden auto-despacharse para ciertos severities o si el baseline debe arrancar en `draft/suggest` solamente.
- Si la auditoría del copiloto vive como logs ligeros del runtime actual o si terminará derivando una lane específica de persistence.

## Recommendation before implementation

- No mover `TASK-252` a implementación hasta que `TASK-251` cierre o entregue explícitamente las APIs/readers que esta task necesita.
- Cuando eso ocurra, este plan queda listo para aprobación humana y arranque de slices sin rediseño adicional.
