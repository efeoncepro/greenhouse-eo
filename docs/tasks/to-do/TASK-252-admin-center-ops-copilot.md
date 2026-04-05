# TASK-252 — Admin Center Ops Copilot

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `2`
- Domain: `ops`
- Blocked by: `TASK-251`
- Branch: `task/TASK-252-admin-center-ops-copilot`
- Legacy ID: `none`
- GitHub Issue: `[TASK-252] Admin Center Ops Copilot`

## Summary

Agregar un copiloto IA en `Admin Center` y `Ops Health` para leer backlog real, explicar degradaciones, priorizar acciones, preparar replays scoped bajo aprobación humana y emitir avisos no invasivos usando el sistema de notificaciones ya existente cuando detecte una o varias situaciones críticas. La task reutiliza el runtime actual de Nexa, `greenhouse-agent` y `NotificationService`, pero no les da autonomía operativa completa: la IA asesora, prepara acciones y puede escalar hallazgos con alertas controladas; el control plane determinístico sigue siendo la fuente de verdad.

## Why This Task Exists

Después de `TASK-251`, Greenhouse tendrá por fin una lectura determinística del backlog reactivo real, el lag del reactor y las acciones de replay/drain con scope explícito.

Ese baseline resuelve la visibilidad y el control seguro. Lo que sigue faltando es una capa operativa que reduzca tiempo cognitivo para el equipo interno:

- traducir métricas técnicas a un diagnóstico entendible
- priorizar qué backlog importa más
- preparar payloads seguros para acciones manuales
- explicar impacto esperado antes de ejecutar
- emitir avisos no invasivos cuando aparezca una condición crítica o un patrón combinado que merezca atención temprana

Hoy el repo ya tiene dos foundations que se pueden reutilizar:

- `NexaService` con tools y function calling para Home
- `greenhouse-agent` interno/admin para respuestas guiadas con contexto de superficie
- `NotificationService` y categorías ya vigentes (`ico_alert`, `capacity_warning`, `system_event`) para avisos controlados y auditables

Pero ninguna de las dos surfaces hoy vive dentro de `Admin Center` ni entiende el control plane reactivo como dominio operativo de primera clase.

Esta task cierra esa brecha: un `Ops Copilot` usable por operadores internos, acoplado a métricas reales y con guardrails enterprise.

## Goal

- Permitir que `Admin Center` y `Ops Health` expliquen backlog, lag y acciones recomendadas usando IA grounded en datos reales del control plane.
- Preparar acciones como replay scoped o drain `dryRun` con payload explícito y aprobación humana.
- Permitir que la IA use el sistema de notificaciones existente para avisos no invasivos sobre alertas críticas puntuales o agrupadas, con guardrails explícitos.
- Mantener separación estricta entre asesoría IA y mutación operativa real.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_NEXA_AGENT_SYSTEM_V1.md`
- `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`

Reglas obligatorias:

- La IA nunca reemplaza la métrica determinística del control plane; solo la interpreta y la opera bajo guardrails.
- Ninguna acción mutante puede auto-ejecutarse sin confirmación humana explícita.
- El copiloto debe reutilizar runtimes existentes (`NexaService` o `greenhouse-agent`) antes de abrir un tercer agente paralelo.
- El dispatch de avisos debe reutilizar `NotificationService` y categorías existentes; no abrir un canal paralelo ni inventar categorías nuevas sin task específica.
- El copiloto no puede aceptar `space_id`, scopes críticos o targets operativos directos desde el prompt sin validación server-side.
- Toda acción sugerida por IA debe quedar auditada como sugerencia o ejecución aprobada.
- Toda notificación disparada por IA debe ser no invasiva, rate-limited, deduplicada y trazable como evento originado por el copiloto.

## Normative Docs

- `docs/tasks/to-do/TASK-251-reactive-control-plane-backlog-observability-replay.md`
- `docs/issues/open/ISSUE-009-reactive-event-backlog-can-accumulate-without-ops-visibility.md`
- `docs/operations/ISSUE_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-251` — truth layer, replay scoped, lag y guardrails del control plane reactivo
- `src/app/api/internal/greenhouse-agent/route.ts`
- `src/lib/ai/greenhouse-agent.ts`
- `src/app/api/home/nexa/route.ts`
- `src/lib/nexa/nexa-service.ts`
- `src/lib/nexa/nexa-tools.ts`
- `src/lib/nexa/nexa-contract.ts`
- `src/lib/notifications/notification-service.ts`
- `src/config/notification-categories.ts`
- `src/views/greenhouse/admin/AdminCenterView.tsx`
- `src/views/greenhouse/admin/AdminOpsHealthView.tsx`

### Blocks / Impacts

- `Admin Center` y `Ops Health` como surfaces operativas accionables para equipo interno
- Follow-ons futuros de agentes por dominio ops/finance/hr
- Runbooks internos, handoffs e incident response con IA grounded

### Files owned

- `src/app/api/internal/greenhouse-agent/route.ts`
- `src/lib/ai/greenhouse-agent.ts`
- `src/lib/nexa/nexa-service.ts`
- `src/lib/nexa/nexa-tools.ts`
- `src/lib/nexa/nexa-contract.ts`
- `src/lib/notifications/notification-service.ts`
- `src/config/notification-categories.ts`
- `src/views/greenhouse/admin/AdminCenterView.tsx`
- `src/views/greenhouse/admin/AdminOpsHealthView.tsx`
- `src/components/greenhouse/[verificar]`
- `docs/tasks/to-do/TASK-252-admin-center-ops-copilot.md`

## Current Repo State

### Already exists

- `greenhouse-agent` ya expone un runtime interno/admin para respuestas guiadas por prompt con modos `plan`, `pair`, `review` e `implement`
- `NexaService` ya soporta function calling con tools reales y contexto de runtime para Home
- `Admin Center` y `Ops Health` ya muestran KPIs, alertas y acciones manuales para el control plane
- `TASK-251` ya define la foundation determinística necesaria para backlog reactivo real, lag y replay scoped

### Gap

- no existe copiloto IA dentro de `Admin Center` ni `Ops Health`
- la IA actual no conoce ni opera el control plane reactivo como dominio especializado
- no existe un patrón institucional de “suggest → dryRun → confirm → execute” para acciones operativas derivadas por IA
- no existe un patrón institucional de “detect → summarize → notify softly” para avisos operativos no invasivos originados por IA
- no hay audit trail explícito para recomendaciones IA dentro de surfaces internas de operación

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

### Slice 1 — Ops Copilot read tools and prompt grounding

- Agregar tools o readers IA específicos del control plane reactivo: backlog real, lag, top event types, degraded handlers, queue backlog y recommended next action
- Groundear el prompt con métricas reales de `TASK-251` y contexto de surface (`Admin Center` vs `Ops Health`)
- Responder preguntas operativas tipo “qué está atascado”, “qué conviene correr”, “qué cambió en últimas 24h”

### Slice 2 — Suggested actions with human approval

- Modelar un contrato IA de acciones sugeridas: replay scoped, run `dryRun`, requeue, publish, o escalar issue
- Mostrar impacto esperado, scope, riesgos y payload antes de ejecutar
- Requerir confirmación humana explícita antes de disparar cualquier endpoint mutante

### Slice 3 — Non-invasive critical notifications

- Reutilizar `NotificationService.dispatch()` para avisos no invasivos cuando el copiloto detecte una alerta crítica puntual o un conjunto de señales que eleven el riesgo operativo
- Restringir la IA a categorías existentes y compatibles con la surface (`ico_alert`, `capacity_warning`, `system_event`) o justificar explícitamente cualquier extensión futura
- Aplicar guardrails de dedupe, rate limit, severidad mínima, audience válida y metadata de auditoría (`source`, `reason`, `triggerType`, `recommendationId`)
- Permitir modos como `draft notification` o `suggest notification` cuando la política requiera aprobación humana previa incluso para el aviso

### Slice 4 — Admin Center / Ops Health integration

- Integrar un panel o drawer de `Ops Copilot` en `Admin Center` y/o `Ops Health`
- Reutilizar patrones UI existentes del repo en vez de abrir un shell paralelo de chat full-screen
- Permitir preguntas guiadas, quick prompts y resumen automático del estado operativo actual

### Slice 5 — Auditability and guardrails

- Persistir o al menos registrar recomendaciones/acciones IA relevantes para handoff y auditoría operativa
- Persistir o registrar también avisos IA emitidos o sugeridos, incluyendo si fueron auto-despachados dentro de política o aprobados manualmente
- Asegurar permisos solo para `internal` / `admin`
- Cubrir con tests el contrato de tools, approval flow y shape de respuesta del copiloto

## Out of Scope

- Dar autonomía total a la IA para ejecutar acciones sin confirmación humana
- Reemplazar Home Nexa o convertir `Admin Center` en un chat generalista sin foco operativo
- Orquestación multi-agent completa tipo ADK/Cloud Run en esta misma lane
- Automatización proactiva full-autonomous de remediaciones runtime

## Detailed Spec

El patrón enterprise esperado es:

1. **Deterministic layer**
   - métricas reales del control plane desde `TASK-251`

2. **Advisor layer**
     - IA resume, explica, prioriza, propone acciones y decide si corresponde sugerir o emitir un aviso no invasivo

3. **Approved operator layer**
   - la IA genera payloads y planes de acción, pero la ejecución mutante requiere aprobación humana explícita

4. **Soft-alert layer**
     - para ciertos casos críticos, la IA puede reutilizar el sistema actual de notificaciones para avisos discretos y trazables, sin reemplazar incident management ni ejecutar remediaciones

La task debe evaluar en Discovery cuál runtime conviene como base primaria:

- extender `NexaService` y su function calling para un carril admin/ops, o
- extender `greenhouse-agent` para incorporar tools operativas estructuradas

Regla: no abrir dos copilotos distintos para la misma surface sin justificación fuerte.

Las acciones IA deben responder con una estructura al menos equivalente a:

- `summary`
- `recommendedAction`
- `scope`
- `riskLevel`
- `requiresApproval`
- `proposedPayload`

Si la respuesta del copiloto recomienda o ejecuta un aviso, debe incluir además campos equivalentes a:

- `notificationDecision`
- `notificationCategory`
- `notificationMode` (`none` | `draft` | `dispatch`)
- `notificationAudience`
- `notificationReason`

Si la acción es mutante, el copiloto no debe llamar el endpoint final en el mismo paso que genera la recomendación. Debe existir separación explícita entre sugerir y ejecutar.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] existe un copiloto IA operativo dentro de `Admin Center` y/o `Ops Health` grounded en métricas reales del control plane reactivo
- [ ] el copiloto puede explicar backlog, lag y prioridades sin inventar datos fuera del runtime
- [ ] el copiloto puede proponer acciones scoped con `requiresApproval = true` antes de cualquier mutación real
- [ ] el copiloto puede sugerir o despachar avisos no invasivos usando el sistema actual de notificaciones solo cuando se cumplan reglas explícitas de severidad, rate limit y categoría
- [ ] las acciones mutantes solo están disponibles para usuarios `internal` / `admin`
- [ ] existe cobertura automatizada del contrato de tools o del approval flow principal

## Verification

- `pnpm exec eslint src/lib/ai src/lib/nexa src/app/api/internal src/views/greenhouse/admin src/components/greenhouse`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm exec vitest run src/lib/nexa/**/*.test.ts src/views/greenhouse/admin/**/*.test.tsx src/app/api/internal/**/*.test.ts`
- validación manual en `Admin Center` y/o `Ops Health` con al menos una pregunta diagnóstica y una acción sugerida que requiera aprobación

## Closing Protocol

- [ ] Actualizar `Handoff.md` con el patrón operativo final: advisor-only o advisor + approved operator
- [ ] Actualizar `project_context.md` si el portal adopta formalmente un copiloto IA interno para operaciones
- [ ] Revisar si `docs/documentation/README.md` o la documentación funcional interna requieren una nota sobre el nuevo copiloto

## Follow-ups

- Si la experiencia de `Ops Copilot` demuestra valor, derivar un task posterior para especializar tools por dominio (`ops`, `finance`, `hr`) sobre el mismo runtime
- Si los avisos IA muestran utilidad operativa real, derivar una policy task para umbrales, bundling y quiet hours por audiencia
- Si el approval flow requiere persistencia rica, derivar una lane de audit trail o drafts operativos dedicada

## Open Questions

- Si el runtime base debe ser `NexaService` con function calling o `greenhouse-agent` con tools nuevas para admin/internal
- Si el surfacing inicial debe vivir solo en `Ops Health` o también en el landing de `Admin Center`
- Qué situaciones permiten `dispatch` directo de aviso no invasivo y cuáles deben quedarse en `draft` o `suggested` hasta aprobación humana
