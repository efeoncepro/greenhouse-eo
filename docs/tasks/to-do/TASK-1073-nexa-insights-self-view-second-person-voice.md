# TASK-1073 — Nexa Insights self-view second-person voice (per-audience voice rendering)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ico|nexa|delivery|content|ui`
- Blocked by: `none`
- Branch: `task/TASK-1073-nexa-insights-self-view-second-person-voice`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

En `/my/performance` ("Mi Desempeño"), las narrativas de Nexa Insights le hablan al colaborador en **tercera persona** ("La métrica OTD% de Daniela Ferreira… no está logrando completar sus tareas") aunque la persona que las lee **es** el sujeto del análisis. La narrativa se genera una sola vez en tercera persona y se reutiliza verbatim en todas las superficies. Esta task agrega un **rendering en segunda persona (tuteo es-CL)** generado por el mismo LLM en la misma llamada estructurada, y hace que la vista personal lo seleccione — con **fallback honesto** a la tercera persona cuando la variante no existe. El texto canónico (tercera persona) no cambia: sigue siendo el SSOT para Agencia/Space/Person 360.

## Why This Task Exists

La narrativa de enrichment (`ico_ai_signal_enrichments`) es **signal-anchored y append-only** (TASK-943): se materializa una vez por señal/período y la consumen sin transformación todas las superficies — Agencia ([readAgencyAiLlmSummary](src/lib/ico-engine/ai/llm-enrichment-reader.ts#L248)), Space ([readSpaceAiLlmSummary](src/lib/ico-engine/ai/llm-enrichment-reader.ts#L842)) y la vista personal ([readMemberAiLlmSummary](src/lib/ico-engine/ai/llm-enrichment-reader.ts#L718) → [my-performance/dto.ts](src/lib/my-performance/dto.ts)). El prompt ([llm-types.ts](src/lib/ico-engine/ai/llm-types.ts) reglas de narrativa) instruye al modelo a usar el **nombre del miembro** y escribe en tercera persona — correcto para un observador externo (manager mirando a un colaborador), pero ajeno cuando el lector es el propio sujeto.

No existe ningún paso que reescriba la voz por audiencia: `mentionSafeMode` (TASK-1027) solo controla el **acceso a los links** de las menciones, no los pronombres. La causa raíz es **diseño del enrichment**, no del render.

**Por qué NO un adapter determinístico (regex pronoun-swap):** en es-CL la transformación tercera→segunda persona requiere conjugación verbal (*está→estás*, *logra→logras*), posesivos (*sus→tus*) y colapsar la mención del sujeto. Un string-replace produce gramática rota (*"Tú no está logrando sus tareas"*) — viola "clarity over cleverness" del contrato de UX writing. La transformación de persona en español **es una tarea de lenguaje** → la hace el LLM, no un regex.

## Goal

- El LLM emite **ambas voces** (tercera persona canónica + segunda persona tuteo es-CL) en una sola llamada estructurada del enrichment worker, ancladas al mismo registro de enrichment (mismo `signal_id`/fingerprint).
- La vista personal `/my/performance` muestra la **segunda persona** cuando el lector es el sujeto; toda otra superficie (Agencia, Space, Person 360) sigue mostrando la **tercera persona** intacta.
- **Fallback honesto**: si la variante en segunda persona falta (señal vieja sin re-enriquecer), la vista personal cae a la tercera persona — nunca string vacío ni gramática rota.
- El texto canónico de tercera persona sigue siendo el SSOT; la segunda persona es un rendering, no una verdad paralela.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ICO_MATERIALIZER_HARDENING_V1.md` (Delta 2026-05-28 — Nexa AI Signals append-only event log invariants)
- `docs/architecture/GREENHOUSE_DELIVERY_METRICS_OWNERSHIP_BOUNDARY_V1.md` (Notion = OS / Greenhouse = motor)
- ADR/precedente del patrón **SSOT semántico + adapter por medio/audiencia**: typography/color (`GREENHOUSE_DESIGN_TOKENS_V1.md` §9 — "PDF/email = un SSOT semántico + adapter por medio"). Acá la dimensión del adapter es **audiencia** (observador vs sujeto).

Reglas obligatorias (skills `greenhouse-ico` + `arch-architect` + `greenhouse-ux-writing`):

- **NUNCA** transformar persona con regex/string-replace — es tarea del LLM (voz es-CL correcta, tuteo).
- **NUNCA** seleccionar la 2da persona fuera del gate self-view (lector === sujeto del insight). Agencia/Space/Person 360-de-manager siempre 3ra persona.
- **SIEMPRE** fallback honesto a 3ra persona si la variante falta — degradación honesta (regla ICO #8), nunca string vacío ni roto.
- **SIEMPRE** ambas voces en el MISMO structured output, ancladas al mismo fingerprint (no dos llamadas, no dos sources of truth que puedan driftear).
- El texto canónico (3ra persona) es el SSOT; la 2da persona es un rendering derivado generado atómicamente.
- **NUNCA** `Sentry.captureException()` directo en code paths ICO — usar `captureWithDomain(err, 'integrations.notion'|'delivery', ...)`.
- Append-only / forward-only: regenera en el próximo run de enrichment (signal-anchored TASK-943); NO backfill destructivo de períodos cerrados.
- Tono es-CL tuteo, sentence case, sin Spanglish; validar copy con `greenhouse-ux-writing` antes de cerrar.

## Normative Docs

- `~/.claude/skills/greenhouse-ico/SKILL.md` + `conceptual-framework/boundary-notion-os-vs-greenhouse-engine.md`
- Investigación de causa raíz: ver Detailed Spec abajo (flujo enrichment → reader → render confirmado en repo).

## Dependencies & Impact

### Depends on

- Tabla `greenhouse_serving.ico_ai_signal_enrichments` (migración `migrations/20260404123559856_task-232-ico-llm-enrichments.sql`).
- Enrichment worker [src/lib/ico-engine/ai/llm-enrichment-worker.ts](src/lib/ico-engine/ai/llm-enrichment-worker.ts) + structured output types [src/lib/ico-engine/ai/llm-types.ts](src/lib/ico-engine/ai/llm-types.ts) + provider [src/lib/ico-engine/ai/llm-provider.ts](src/lib/ico-engine/ai/llm-provider.ts).
- Reader [src/lib/ico-engine/ai/llm-enrichment-reader.ts](src/lib/ico-engine/ai/llm-enrichment-reader.ts) (`readMemberAiLlmSummary`).
- TASK-943 (append-only enrichment event log — invariante forward-only).

### Blocks / Impacts

- **TASK-1027** (My Performance rich self-service activity runtime) — misma superficie `/my/performance`. TASK-1073 puede shippear independiente (la vista actual ya renderiza `NexaInsightsBlock` con `mentionSafeMode`), pero el copy en segunda persona enriquece el resultado de TASK-1027. Coordinar el `voice` param si TASK-1027 refactoriza el DTO.
- **TASK-947** (`/nexa/insights/[id]` detail page) — la página de detalle canónica sigue en **voz observador (3ra persona)** en V1 de esta task (es cross-surface). Self-view voice en el drill page = follow-up.
- Agencia / Space / Person 360 — **sin cambio** (siguen leyendo el texto canónico 3ra persona).

### Files owned

- `migrations/<nueva>_task-1073-enrichment-self-view-voice.sql` (columnas nullable additivas)
- `src/lib/ico-engine/ai/llm-types.ts` (structured output + reglas de prompt)
- `src/lib/ico-engine/ai/llm-enrichment-worker.ts` (emisión + persistencia ambas voces)
- `src/lib/ico-engine/ai/llm-enrichment-reader.ts` (selección por voz + fallback)
- `src/lib/my-performance/dto.ts` (pasar `voice: 'self'`)
- `src/lib/reliability/queries/nexa-insights-self-view-voice-coverage.ts` (signal, opcional Slice 4)
- `src/lib/reliability/get-reliability-overview.ts` (wire-up signal)
- Tests focales asociados + `docs/` de cierre (documentation governor)

## Current Repo State

### Already exists

- Enrichment pipeline completo: worker emite `explanationSummary` / `rootCauseNarrative` / `recommendedAction` (3ra persona) → persiste en `greenhouse_serving.ico_ai_signal_enrichments` (cols `explanation_summary` / `root_cause_narrative` / `recommended_action`).
- 3 readers por superficie (`readMemberAiLlmSummary` / `readAgencyAiLlmSummary` / `readSpaceAiLlmSummary`) que devuelven los campos verbatim.
- `NexaInsightsBlock` + `NexaMentionText` con `mentionSafeMode` (TASK-1027) — controla acceso a links de menciones, NO pronombres.
- `/my/performance` renderiza `NexaInsightsBlock` vía `my-performance/dto.ts`.

### Gap

- El enrichment se genera SOLO en 3ra persona; no hay rendering en 2da persona.
- No hay parámetro de **voz por audiencia** en los readers — toda superficie devuelve el mismo texto.
- No hay gate que distinga "lector === sujeto" para elegir voz (el `mentionSafeMode` solo cubre acceso a links).
- `[verificar]` si el worker tiene un path `ensure-infrastructure` (ALTER TABLE en código) que deba espejar las columnas nuevas además de la migración.
- `[verificar]` si la tabla `greenhouse_serving.ico_ai_signal_enrichment_history` (TASK-914) debe cargar también las columnas self-view o queda forensic solo con 3ra persona (recomendado: history queda 3ra persona V1).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Structured output + worker: emitir ambas voces

- Migración: agregar columnas **nullable additivas** a `greenhouse_serving.ico_ai_signal_enrichments`: `explanation_summary_self_view`, `root_cause_narrative_self_view`, `recommended_action_self_view` (TEXT NULL). Marker `-- Up Migration` correcto + DO block de verificación post-DDL.
- `[verificar]` mirror en el ensure-infrastructure del worker si existe.
- `llm-types.ts`: extender el structured output schema con los 3 campos self-view + extender las reglas de narrativa del prompt: *"Generá además una versión en segunda persona (tuteo es-CL) dirigida al colaborador como 'tú': no lo nombres, usá 'tus tareas/tu métrica'; mantené las menciones de OTRAS entidades (proyectos, otros miembros). NO traduzcas literal — reescribí la voz."*
- `llm-enrichment-worker.ts`: persistir las 6 columnas (3 canónicas + 3 self-view) en el mismo INSERT/append. Append-only / forward-only: regenera al próximo run.

### Slice 2 — Selección por voz en el reader + DTO personal

- `readMemberAiLlmSummary`: agregar parámetro explícito `voice: 'self' | 'observer'` (default `'observer'`). Con `'self'` selecciona la columna `*_self_view` cuando NO es null; **fallback** a la columna canónica 3ra persona cuando es null.
- `my-performance/dto.ts`: invocar con `voice: 'self'`. Cualquier consumo manager-facing de `readMemberAiLlmSummary` (Person 360 de un manager) pasa `voice: 'observer'` o usa el default.
- Confirmar que `readAgencyAiLlmSummary` / `readSpaceAiLlmSummary` NO cambian (siempre observador).

### Slice 3 — Render + menciones en self-view

- Verificar que `NexaInsightsBlock` + `NexaMentionText` con `mentionSafeMode` renderizan correctamente la 2da persona: la mención del propio sujeto NO debe aparecer (el LLM no lo nombra); las menciones de otras entidades siguen como chips.
- QA visual con GVC (`pnpm fe:capture --route=/my/performance --env=staging`) leyendo el frame — confirmar voz tuteo + sin "Daniela" en su propia narrativa + menciones de proyectos/otros intactas.

### Slice 4 — (opcional) Signal de cobertura + tests

- Signal `nexa.insights.self_view_voice_missing` (kind `data_quality`, moduleKey `delivery`, severity warning, steady=0 una vez que el forward-enrichment converge): cuenta enrichments member-scoped del período actual con `root_cause_narrative_self_view IS NULL`. Es métrica de cobertura, no bug class — light.
- Tests focales: worker emite ambas voces; reader `voice:'self'` selecciona self-view + fallback a 3ra cuando null; reader `voice:'observer'` nunca devuelve self-view; regla de prompt presente.

## Out of Scope

- **NO** backfill destructivo de enrichments de períodos cerrados — forward-only (regenera signal-anchored TASK-943). El fallback cubre las señales viejas.
- **NO** self-view voice en `/nexa/insights/[id]` (drill page, TASK-947) — queda observador en V1; follow-up.
- **NO** tocar el texto canónico 3ra persona ni los readers de Agencia/Space.
- **NO** adapter determinístico/regex de pronombres (rechazado por diseño).
- **NO** segunda llamada LLM separada — ambas voces en una sola structured output call.
- **NO** columnas self-view en `ico_ai_signal_enrichment_history` (forensic queda 3ra persona V1, salvo que `[verificar]` indique lo contrario).
- **NO** cambio en `mentionSafeMode` ni en el contrato de acceso a links de menciones.

## Detailed Spec

**Patrón canónico:** un registro de enrichment con **dos renderings de voz** generados atómicamente — NO dos sources of truth. Mismo shape que el SSOT-semántico-+-adapter-por-medio de design tokens (web/PDF/email), pero la dimensión del adapter acá es **audiencia**.

```text
LLM structured output (1 call)
 ├─ explanationSummary / rootCauseNarrative / recommendedAction        ← 3ra persona (canónico, SSOT)
 └─ explanationSummarySelfView / rootCauseNarrativeSelfView /          ← 2da persona (tuteo es-CL, rendering)
    recommendedActionSelfView
        │ persistido atómicamente, mismo signal_id/fingerprint (TASK-943 append-only)
        ▼
greenhouse_serving.ico_ai_signal_enrichments  (+3 columnas nullable)
        │
        ├─ readAgencyAiLlmSummary / readSpaceAiLlmSummary  → 3ra persona (sin cambio)
        └─ readMemberAiLlmSummary(voice)
              ├─ voice='observer' (default) → 3ra persona
              └─ voice='self'  → 2da persona si NOT NULL · else FALLBACK 3ra persona
                    │
                    ▼  my-performance/dto.ts (voice:'self') → NexaInsightsBlock (mentionSafeMode)
```

Separación canónica: **generación** (ambas voces) vive en el worker + prompt; **selección** (qué rendering mostrar) vive en el reader/DTO gated por self-view. Nunca en el componente cliente.

## Rollout Plan & Risk Matrix

Cambio **aditivo** sobre el pipeline LLM enrichment (que está bajo migración Strangler activa). Columnas nullable + structured output extendido + selección con fallback honesto. Sin flag obligatorio (additive), pero se recomienda un flag de selección para revert instantáneo del comportamiento de la vista personal.

### Slice ordering hard rule

- Slice 1 (columnas + worker emite ambas voces) **DEBE** shippear antes que Slice 2 (selección). Sin las columnas pobladas, Slice 2 siempre cae al fallback (inocuo, pero la feature no se ve).
- Slice 2 (reader/DTO) → Slice 3 (render/QA). Slice 4 (signal/tests) puede correr en paralelo una vez que Slice 1 cerró.
- El fallback honesto hace que cualquier orden sea **safe** (worst case = comportamiento de hoy, 3ra persona). No hay ventana de UI rota.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Variante 2da persona se filtra a superficie manager (Agencia/Space/Person 360) | UI / contenido | low | `voice` param explícito default `'observer'`; solo `my-performance/dto.ts` pasa `'self'`; readers de Agencia/Space no tocan las cols self-view | QA + test anti-regresión |
| LLM emite 2da persona gramaticalmente pobre o nombra al sujeto | contenido | medium | regla de prompt explícita + QA es-CL con `greenhouse-ux-writing` sobre artefacto real antes de flip | revisión humana de muestras |
| Costo extra de output tokens × volumen de señales | ICO / costo | low | medir output token delta en staging antes de prod; es marginal (mismo call) | logs de costo enrichment |
| Señales viejas sin self-view muestran 3ra persona en vista personal | UI | medium (esperado) | fallback honesto = comportamiento de hoy; forward-only converge; signal de cobertura opcional | `nexa.insights.self_view_voice_missing` |
| Drift entre 3ra y 2da persona (dos textos distintos) | datos | low | ambas en el MISMO structured output, mismo fingerprint, generadas atómicamente — no pueden driftear | N/A por construcción |

### Feature flags / cutover

- Recomendado: flag de selección `NEXA_SELF_VIEW_VOICE_ENABLED` (default `false`) que gatea si `readMemberAiLlmSummary(voice:'self')` elige la columna self-view. Con `false` → siempre 3ra persona (parity bit-for-bit con hoy). Flip a `true` post-QA es-CL verde en staging. Revert: flag a `false` + redeploy (<5 min Vercel).
- La emisión de ambas voces en el worker (Slice 1) NO necesita flag — es additive, solo puebla columnas nuevas que nadie lee hasta el flip.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | columnas nullable additivas — dejar sin uso; opcional down migration (DROP COLUMN). Worker: revert PR + redeploy | <10 min | sí |
| Slice 2 | flag `NEXA_SELF_VIEW_VOICE_ENABLED=false` → vista personal vuelve a 3ra persona | <5 min | sí (instant via flag) |
| Slice 3 | revert PR de render | <10 min | sí |
| Slice 4 | signal/tests son additive — revert PR | <10 min | sí |

### Production verification sequence

1. `pnpm migrate:up` en staging + verify las 3 columnas existen nullable.
2. Deploy worker (Slice 1) a staging + correr un enrichment forzado sobre una señal real + verify las cols `*_self_view` quedan pobladas con tuteo es-CL correcto (NO nombra al sujeto).
3. QA es-CL de las muestras con `greenhouse-ux-writing` (gramática, tuteo, menciones de otras entidades intactas).
4. Flag `NEXA_SELF_VIEW_VOICE_ENABLED=true` en staging + GVC `/my/performance` con el agente collaborator (`agent-collaborator@…`) que tenga señales propias + leer el frame → confirmar 2da persona.
5. Verify que Agencia/Space/Person 360 de un manager siguen mostrando 3ra persona (no regresión).
6. Prod: deploy worker + migración + flag `true` post-smoke. Monitorear signal de cobertura (si Slice 4) hasta steady=0.

### Out-of-band coordination required

- Ninguna integración externa. El worker corre en su pipeline ICO normal (Cloud Run / cron). No requiere coordinación con Notion/HubSpot/Teams.
- Coordinar con **TASK-1027** si está en vuelo sobre `/my/performance` (mismo DTO).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — ACCEPTANCE & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] La tabla `greenhouse_serving.ico_ai_signal_enrichments` tiene las 3 columnas `*_self_view` nullable; migración con marker correcto + DO block de verificación.
- [ ] El enrichment worker emite las 6 columnas (3 canónicas + 3 self-view) en una sola llamada estructurada; la 2da persona es tuteo es-CL, no nombra al sujeto, conserva menciones de otras entidades.
- [ ] `readMemberAiLlmSummary` acepta `voice: 'self' | 'observer'` (default `'observer'`); con `'self'` selecciona self-view cuando NOT NULL y cae a 3ra persona cuando NULL.
- [ ] `readAgencyAiLlmSummary` y `readSpaceAiLlmSummary` devuelven SIEMPRE 3ra persona (sin cambio verificado por test).
- [ ] `/my/performance` muestra la narrativa en 2da persona cuando hay variante; el texto canónico 3ra persona queda intacto para las otras superficies.
- [ ] Con la variante ausente (señal vieja), `/my/performance` muestra 3ra persona — nunca string vacío ni gramática rota.
- [ ] Flag `NEXA_SELF_VIEW_VOICE_ENABLED` controla la selección; default `false` = parity bit-for-bit con hoy.
- [ ] GVC `/my/performance` capturado + leído confirmando voz tuteo + ausencia de auto-mención + menciones de proyectos/otros intactas.
- [ ] Copy validado con `greenhouse-ux-writing` (es-CL tuteo, sentence case, sin Spanglish).

## Verification

```bash
pnpm local:check        # lint + tsc
pnpm test src/lib/ico-engine/ai src/lib/my-performance src/lib/reliability
pnpm migrate:status     # confirmar migración aplicada
pnpm fe:capture --route=/my/performance --env=staging --hold=3000   # GVC self-view
```

- Smoke real con persona agente `agent-collaborator@greenhouse.efeonce.org` que tenga señales propias del período.
- Verificación cross-superficie: Agencia/Space/Person 360 sin regresión (3ra persona).

## Closing Protocol

- Mover `Lifecycle` a `complete` + archivo a `docs/tasks/complete/` + sincronizar `docs/tasks/README.md`.
- Invocar `greenhouse-documentation-governor`: actualizar `GREENHOUSE_ICO_MATERIALIZER_HARDENING_V1.md` (Delta voice rendering), CLAUDE.md (invariante self-view voice si emerge regla dura), changelog, Handoff.
- `pnpm test` (full) + `pnpm build` antes del cierre (gate canónico).
- Si toca workers Cloud Run (`src/lib/ico-engine/**` consumido por ico-batch-worker), verificar el deploy workflow post-push.

## Follow-ups

- Self-view voice en `/nexa/insights/[id]` (drill page TASK-947) cuando el lector sea el sujeto.
- Decidir si `ico_ai_signal_enrichment_history` (TASK-914) carga columnas self-view (forensic) o queda 3ra persona.
- Evaluar backfill opt-in de señales recientes si el negocio quiere voz personal retroactiva (respeta append-only).
- Extender el rendering self-view a futuras superficies personales (Mi Delivery, Mi Nómina insights) reusando el mismo `voice` param.
