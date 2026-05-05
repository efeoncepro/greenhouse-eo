# TASK-440 — Nexa Insights Project Label Resolution

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete` (closed 2026-05-05 — `entity-display-resolution.{ts,test.ts}` shipped via 8ebb28e6 + 99d4deb7)
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `En implementacion`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-440-nexa-project-label-resolution`
- Legacy ID: —
- GitHub Issue: —

## Summary

Corrige la exposición de IDs técnicos de proyecto en Nexa Insights y crea una capa canónica de resolución de labels para entidades usadas por los enrichments AI. El objetivo no es solo reemplazar UUIDs en texto, sino garantizar que Nexa reciba y renderice nombres humanos estables para proyectos en Home, Space 360, Person 360 y futuras surfaces Nexa.

## Why This Task Exists

Hoy Nexa ya tiene soporte de mentions y el prompt ya instruye explícitamente "usar nombres y nunca IDs técnicos". Aun así, en algunos insights aparece el `project_source_id` o UUID crudo porque el contexto que se inyecta al LLM no logra resolver el proyecto a un nombre visible.

La causa observada en repo es estructural:

- `src/lib/ico-engine/ai/resolve-signal-context.ts` resuelve proyectos solo por `greenhouse_delivery.projects.project_record_id`
- `src/lib/ico-engine/ai/materialize-ai-signals.ts` materializa señales de proyecto usando `project_source_id` como `dimension_id` y `dimension_label`
- `src/lib/ico-engine/ai/llm-provider.ts` cae a `projectId` cuando no encuentra `projectName`
- `src/components/greenhouse/NexaMentionText.tsx` renderiza la etiqueta tal cual llega; no corrige labels malos

Resultado: el UI no es la raíz del problema. Solo refleja una narrativa ya enriquecida con un label incorrecto.

## Goal

- Resolver nombres de proyecto de forma canónica y multi-fuente antes del enrichment LLM.
- Evitar que Nexa renderice IDs técnicos cuando exista un nombre humano resoluble.
- Dejar un patrón reusable para futuras entidades Nexa y para surfaces actuales y futuras.

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
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md`
- `docs/architecture/GREENHOUSE_MENTION_SYSTEM_V1.md`

Reglas obligatorias:

- Los textos visibles de Nexa no pueden exponer IDs técnicos de proyecto si existe nombre resoluble en el modelo canónico o en una fuente autorizada.
- La resolución de labels debe ocurrir en backend, antes o durante el enrichment, no delegarse al componente visual.
- Toda resolución debe respetar tenant isolation por `space_id`.
- La solución debe soportar tanto IDs canónicos como source IDs (`project_record_id`, `project_source_id` u otros equivalentes reales del modelo).
- Si una entidad no se puede resolver, la degradación debe ser humana (`este proyecto`) y no técnica (`33339c2f-...`).

## Normative Docs

- `src/lib/ico-engine/ai/resolve-signal-context.ts`
- `src/lib/ico-engine/ai/llm-provider.ts`
- `src/lib/ico-engine/ai/materialize-ai-signals.ts`
- `src/lib/ico-engine/ai/llm-enrichment-worker.ts`
- `src/components/greenhouse/NexaMentionText.tsx`

## Dependencies & Impact

### Depends on

- `docs/tasks/complete/TASK-239-nexa-advisory-prompt-enrichment-metric-glossary.md`
- `docs/tasks/complete/TASK-240-nexa-insights-entity-mentions.md`
- `docs/tasks/complete/TASK-242-nexa-insights-space-360.md`
- `docs/tasks/complete/TASK-243-nexa-insights-person-360.md`
- `docs/tasks/complete/TASK-244-nexa-insights-home-dashboard.md`

### Blocks / Impacts

- Mejora la calidad narrativa de Home, Space 360 y Person 360 donde ya vive `NexaInsightsBlock`.
- Reduce riesgo de copiar patrones frágiles en `TASK-432`, `TASK-435`, `TASK-436` y `TASK-439`.
- Deja una base escalable para otras entidades mencionables que hoy o mañana puedan caer a IDs técnicos.

### Files owned

- `src/lib/ico-engine/ai/resolve-signal-context.ts`
- `src/lib/ico-engine/ai/llm-provider.ts`
- `src/lib/ico-engine/ai/materialize-ai-signals.ts`
- `src/lib/ico-engine/ai/llm-enrichment-worker.ts`
- `src/components/greenhouse/NexaMentionText.tsx`
- `docs/architecture/GREENHOUSE_MENTION_SYSTEM_V1.md`
- `docs/architecture/GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md`

## Current Repo State

### Already exists

- El prompt de Nexa ya instruye usar nombres humanos y formato de mentions (`src/lib/ico-engine/ai/llm-types.ts`).
- Existe parsing/render de mentions para `member`, `space` y `project` (`src/components/greenhouse/NexaMentionText.tsx`).
- Existe batch context resolver para spaces, miembros y proyectos (`src/lib/ico-engine/ai/resolve-signal-context.ts`).
- Nexa Insights ya está integrado en Home, Space 360 y Person 360.

### Gap

- La resolución actual de proyectos no cubre el identificador que realmente viaja en las señales AI.
- La materialización de señales propaga `project_source_id` como label visible.
- El enrichment usa fallback a ID técnico.
- No existe una defensa posterior que sanee output con IDs cuando el contexto resoluble sí existe.
- No existe protocolo claro para re-enriquecer insights recientes afectados.

## Audit Corrections — 2026-04-17

- El schema snapshot baseline no es suficiente como source of truth para esta lane: la foto operativa real de `greenhouse_serving.ico_ai_signals` y `greenhouse_serving.ico_ai_signal_enrichments` vive en:
  - `migrations/20260404113502039_task-118-ico-ai-signals.sql`
  - `migrations/20260404123559856_task-232-ico-llm-enrichments.sql`
  - `src/types/db.d.ts`
- La precedencia real de identidad visible para proyecto en el repo no es solo "tabla o vista a definir":
  1. ID canónico Greenhouse: `greenhouse_delivery.projects.project_record_id`
  2. Source ID operativo que hoy viaja por ICO/Nexa: `project_source_id`, que en runtime se alinea con `greenhouse_delivery.projects.notion_project_id`
  3. El nombre visible primario de runtime es `greenhouse_delivery.projects.project_name`
- La corrección de labels no debe recaer en `NexaMentionText`; la defensa posterior de narrativa debe ocurrir en backend antes de persistir enrichments.
- El replay scoped no parte desde cero: el worker `materializeAiLlmEnrichments({ periodYear, periodMonth, spaceId? })` ya permite regeneración por período o por `space_id`. Lo que esta task debe dejar es el runbook/contrato operativo para usarlo sin backfill indiscriminado.

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

### Slice 1 — Contract discovery de identidad de proyecto

- Auditar qué IDs reales usan las señales ICO/Nexa para proyectos en `signals`, `enrichments` y materialización.
- Confirmar tabla o vista canónica para nombre visible de proyecto y su relación con `space_id`.
- Documentar precedencia de resolución: `canonical id` -> `source id` -> aliases válidos.

### Slice 2 — Resolver canónico de labels para proyecto

- Extender o extraer la resolución de contexto para que proyectos se puedan resolver por múltiples llaves válidas.
- Batch lookup con `space_id` como constraint obligatorio.
- El resolver debe devolver al menos: `entityId`, `displayLabel`, `matchedBy`, `spaceId`.

### Slice 3 — Hardening del enrichment Nexa

- Dejar de pasar `projectId` como `projectName` fallback cuando el lookup falla.
- Ajustar el prompt/context payload para que el LLM use el nombre resuelto o degrade a frase genérica, nunca a UUID crudo.
- Corregir la materialización/root-cause generation para que `dimension_label` de proyecto no sea un source ID si el nombre es resoluble en ese punto.

### Slice 4 — Defensa posterior de narrativa / mentions

- Agregar una validación o sanitización de salida para detectar labels de proyecto con forma de ID técnico y reemplazarlos por label resuelto cuando exista contexto.
- Si no hay resolución, reemplazar por narrativa neutra (`este proyecto`) en vez de mostrar el ID.
- Mantener compatibilidad con el formato de mentions existente.

### Slice 5 — Replay / corrección de enrichments recientes

- Definir un camino operativo para regenerar o re-enriquecer insights recientes afectados sin editar texto a mano.
- El replay debe ser scoped por período o por surface para evitar backfills indiscriminados.

### Slice 6 — Tests y documentación

- Tests unitarios del resolver y del hardening de payload/sanitización.
- Actualizar arquitectura de mention system y Nexa Insights con el contrato de resolución de labels.

## Out of Scope

- Reescribir el motor completo de prompts Nexa.
- Hacer clickeables todos los mentions de proyecto si la ruta final todavía depende de contexto no resuelto.
- Resolver cualquier problema distinto de labels humanos vs IDs técnicos en Finance/Payroll/otros dominios, salvo que se descubra reutilización directa del mismo helper.

## Detailed Spec

La implementación debe privilegiar una capa reusable de "entity display resolution" y no un reemplazo textual disperso.

Patrón recomendado:

1. Resolver entidades en batch antes del enrichment.
2. Entregar al LLM `projectName` solo si es humano y confiable.
3. Prohibir fallback directo `projectName = projectId` para IDs con apariencia técnica.
4. Validar el texto enriquecido antes de persistirlo:
   - si aparece `@[uuid-like](project:uuid-like)` y existe label resuelto, sustituir el label visible
   - si aparece `proyecto <uuid-like>` y no existe label, degradar a `este proyecto`
5. Persistir suficiente metadata para auditoría (`matchedBy`, `source`, o equivalente si el diseño lo justifica)

La solución ideal deja abierta la extensión futura a otras entidades Nexa, por ejemplo campañas, servicios o clientes, sin rehacer el pipeline.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Los insights nuevos no muestran UUIDs o source IDs de proyecto cuando existe nombre resoluble.
- [ ] El resolver soporta al menos el identificador canónico y el source identifier usado hoy por ICO signals.
- [ ] La degradación por proyecto no resuelto nunca expone IDs técnicos en narrativa visible.
- [ ] Home, Space 360 y Person 360 renderizan el label corregido sin regresión visual en `NexaInsightsBlock`.
- [ ] Existe mecanismo documentado para replay/re-enrichment de insights recientes afectados.
- [ ] `pnpm build`, `pnpm lint` y los tests relevantes pasan.

## Verification

- `pnpm lint`
- `pnpm build`
- `pnpm test`
- Validación manual/staging en Home, Space 360 y Person 360 con al menos un insight de proyecto previamente afectado

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] `docs/architecture/GREENHOUSE_MENTION_SYSTEM_V1.md` y `docs/architecture/GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md` quedaron actualizados

## Follow-ups

- Evaluar si la capa de resolución debe moverse a un helper compartido Nexa cross-domain en vez de vivir solo bajo ICO.
- Evaluar deep-link estable para mentions de proyecto una vez que exista contrato de routing suficiente.

## Open Questions

- ¿La fuente más confiable para `project_name` visible debe ser `greenhouse_delivery.projects`, una proyección conformed, o ambas con precedencia?
- ¿Qué ventana de replay se considera suficiente al cerrar la task: mes actual, últimos 30 días o solo insights visibles activos?
