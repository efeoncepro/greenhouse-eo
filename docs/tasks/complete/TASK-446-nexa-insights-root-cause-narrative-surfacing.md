# TASK-446 — Nexa Insights Root Cause Narrative Surfacing (Insights Quick Win)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Bajo`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `QUICK-WIN-INSIGHTS`
- Domain: `agency`
- Blocked by: `none`
- Branch: `task/TASK-446-nexa-insights-root-cause-narrative-surfacing`
- Legacy ID: `none`
- GitHub Issue: `[optional]`

## Summary

El LLM ya genera `rootCauseNarrative` (narrativa causal distinta a `explanationSummary`) y se persiste en `ico_signal_enrichments.root_cause_narrative`, pero el serving layer lo excluye del SELECT y el tipo `NexaInsightItem` ni siquiera lo declara. Esta task extiende el contrato UI end-to-end para surfacear la narrativa causal como sección expandible en cada insight card, con mentions parseadas, y la suma al digest semanal. Es trabajo de backend → UI completo que ya fue pagado en tokens — solo falta exponerlo.

## Why This Task Exists

Auditoría reciente confirmó:

- Prompt diferencia explícitamente ambos campos ([llm-types.ts:112-114](src/lib/ico-engine/ai/llm-types.ts#L112-L114)):
  - `explanationSummary` → resume la señal y el riesgo operativo
  - `rootCauseNarrative` → explica la causa probable usando solo la evidencia visible
- Tablas canónicas: `greenhouse_serving.ico_ai_signal_enrichments` y `greenhouse_serving.finance_ai_signal_enrichments` — ambas tienen la columna `root_cause_narrative TEXT NULL` y ambas son ignoradas en los SELECTs
- Reader ICO ([llm-enrichment-reader.ts](src/lib/ico-engine/ai/llm-enrichment-reader.ts)): 5 funciones excluyen el campo — `readAgencyAiLlmSummary` (92-167), `readOrganizationAiLlmEnrichments` (260-280), `readTopAiLlmEnrichments` (282-320), `readMemberAiLlmSummary` (322-403), `readSpaceAiLlmSummary` (405-486)
- Reader Finance ([finance/ai/llm-enrichment-reader.ts](src/lib/finance/ai/llm-enrichment-reader.ts)) línea 29-72: también excluye el campo
- Weekly digest ([build-weekly-digest.ts:217-230](src/lib/nexa/digest/build-weekly-digest.ts#L217-L230)) SELECT propio que excluye el campo
- Type `NexaInsightItem` ([NexaInsightsBlock.tsx:25-32](src/components/greenhouse/NexaInsightsBlock.tsx#L25-L32)) no declara el campo

Consecuencia: el operador ve "qué pasó" y "qué hacer" pero no "por qué pasó". Para análisis de causa raíz (core del valor de Nexa) el insight queda truncado. Además se están pagando tokens de LLM por data que nadie ve.

## Goal

- `NexaInsightItem` incluye `rootCauseNarrative?: string | null`
- Serving queries (member, space, finance) seleccionan `root_cause_narrative`
- Insight card renderiza la narrativa causal como sección colapsable (toggle "Ver causa raíz" / "Ocultar")
- Narrativa pasa por `NexaMentionText` (o el futuro markdown mention-aware) como el resto
- Weekly digest email incluye la narrativa como bloque secundario cuando existe
- Toggle de colapso con localStorage `nexa.insights.rootCause.expanded` (preferencia persistente)
- Telemetría de expand/collapse (solo si TASK-441 está live)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`

Reglas obligatorias:

- No cambiar el prompt del LLM — el campo ya se genera
- No romper el layout actual: narrativa es opcional, colapsada por default, nunca empuja la card a más alto del fold
- Respetar `line-clamp` y densidad Vuexy
- El campo puede venir `null` en enrichments antiguos — degradar gracefully (no renderizar sección)

## Normative Docs

- `docs/tasks/complete/TASK-240-nexa-insights-entity-mentions.md`
- `docs/tasks/to-do/TASK-441-nexa-mentions-resolver-allowlist-sanitization.md`

## Dependencies & Impact

### Depends on

- Ningún blocker. TASK-441 no es requerida; cuando se merge, el campo se sanitiza/resuelve automáticamente
- `ico_signal_enrichments.root_cause_narrative` — columna ya existe

### Blocks / Impacts

- TASK-242 (Space 360 insights) y TASK-243 (Person 360 insights) surfaces se benefician automáticamente
- Weekly digest (TASK-246 cerrada) recibe la extensión opt-in
- Daily briefing (TASK-439) podrá incluir la narrativa causal como justificación

### Files owned

- `src/components/greenhouse/NexaInsightsBlock.tsx` — modificar tipo + render
- `src/components/greenhouse/NexaInsightRootCauseSection.tsx` — nuevo (colapsable reutilizable)
- `src/lib/ico-engine/ai/llm-enrichment-reader.ts` — modificar las 5 funciones SELECT
- `src/lib/finance/ai/llm-enrichment-reader.ts` — modificar SELECT finance
- `src/lib/nexa/digest/build-weekly-digest.ts` — incluir narrativa en SELECT + narrative parts
- `src/lib/nexa/digest/types.ts` — extender WeeklyDigestInsight con rootCauseNarrative opcional
- `src/emails/templates/WeeklyExecutiveDigestEmail.tsx` — render condicional del bloque causa raíz

## Current Repo State

### Already exists

- Campo `root_cause_narrative` en schema ([ico_signal_enrichments](migrations/)) y en el output del LLM
- Prompt ya instruye al modelo a generar narrativa distinta
- `NexaMentionText` listo para parsear mentions en la narrativa
- `NexaInsightsBlock` usado en Home, Space 360 OverviewTab, Person 360 ActivityTab, Finance Dashboard

### Gap

- Serving queries no seleccionan el campo
- Tipo `NexaInsightItem` no lo declara
- Ningún surface lo renderiza
- Digest email no lo considera
- No hay componente de colapso reutilizable

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Contrato de datos

- Extender `NexaInsightItem` con `rootCauseNarrative?: string | null`
- Actualizar `llm-enrichment-reader.ts`: agregar `root_cause_narrative` a los SELECTs de member, space y el equivalente finance
- Verificar mappers que convierten row PG → item: pasan el campo hacia la UI
- `pnpm db:generate-types` (si aplica cambio de tipos)

### Slice 2 — Componente colapsable

- `NexaInsightRootCauseSection`:
  - Props: `{ narrative: string; insightId: string }`
  - Toggle state con persistencia via `localStorage` key `nexa.insights.rootCause.expanded.{insightId}` o flag global `nexa.insights.rootCause.all`
  - Colapsa por default, línea de summary tipo "Ver causa raíz ↓"
  - Expandido: usa `NexaMentionText` con `variant='body2'`, margin superior `mt-2`, fondo `action.hover` sutil
  - Accesibilidad: `aria-expanded`, `aria-controls`

### Slice 3 — Integración en InsightCard

- Renderizar `<NexaInsightRootCauseSection>` solo si `rootCauseNarrative` está presente y no vacío
- Ubicación: entre `explanation` y `recommendedAction` — jerarquía natural (qué → por qué → qué hacer)

### Slice 4 — Weekly digest

- `build-weekly-digest.ts`: incluir `rootCauseNarrative` como `narrative[]` part adicional con label `Causa probable`
- `WeeklyExecutiveDigestEmail.tsx`: render condicional del nuevo part
- Mantener compatibilidad con digests pasados (el field es opcional)

### Slice 5 — Telemetría (condicional TASK-441)

- Si el hook `trackMentionEvent`/`trackInsightAction` existe: emitir `insight.rootCause.expand` y `insight.rootCause.collapse`
- Si no existe: no-op + TODO

## Out of Scope

- Reverse index / filter por mención — TASK-448
- Hover preview cards sobre chips — TASK-447
- Pin / dismiss / share — TASK-449
- Cambios al prompt del LLM — ya funciona

## Detailed Spec

### Ubicación visual en InsightCard

```
┌─────────────────────────────────────────────┐
│ [severity] FTR% Sky Airlines                │
│                                             │
│ El FTR% de [Sky Airlines] cayó a 69.6%      │  ← explanation
│ en marzo, 8.4 puntos bajo el target.        │
│                                             │
│ ▸ Ver causa raíz                            │  ← collapsible
│                                             │
│ ─────────────────────────────────────────── │
│ → Revisar entregas de [Andrés Carlosama]    │  ← recommendedAction
│                                             │
└─────────────────────────────────────────────┘
```

Expandido:

```
┌─────────────────────────────────────────────┐
│ ...                                         │
│ ▾ Ocultar causa raíz                        │
│   [Andrés Carlosama] contribuye 53% de la   │
│   desviación en el proyecto [Campaña Q1],   │
│   con FTR 61.2% vs 74.5% del equipo...      │
│ ─────────────────────────────────────────── │
│ ...                                         │
└─────────────────────────────────────────────┘
```

### Fallback

- `rootCauseNarrative === null | ''` → sección no se renderiza, no hay toggle
- Enrichments antiguos sin el campo siguen renderizando igual que hoy

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `NexaInsightItem` incluye `rootCauseNarrative`
- [ ] Serving layer (member, space, finance) selecciona el campo
- [ ] Section colapsable renderiza mentions via parser
- [ ] Persistencia de preferencia expand/collapse vía localStorage
- [ ] ARIA `aria-expanded` correcto
- [ ] Weekly digest email incluye narrativa cuando existe
- [ ] Fallback graceful cuando campo es null/vacío
- [ ] `pnpm lint`, `pnpm tsc --noEmit`, `pnpm test`, `pnpm build` sin errores
- [ ] Screenshots antes/después en `Handoff.md`

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- `pnpm build`
- Manual: `/home` → Insights con enrichments recientes → verificar sección colapsable
- Manual: `/agency/spaces/[id]` → tab Overview → ídem
- Manual: `/people/[memberId]` → tab Activity → ídem
- Manual: enviar digest semanal preview → verificar que incluye narrativa
- Query SQL: confirmar que el SELECT incluye `root_cause_narrative` en logs

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado con screenshots
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado sobre TASK-246, TASK-242, TASK-243, TASK-439, TASK-440, TASK-447
- [ ] `docs/architecture/Greenhouse_ICO_Engine_v1.md` delta documentando que ambas narrativas están ahora expuestas

## Follow-ups

- Slide-in sheet con el detalle completo de root cause (cuando la narrativa sea > N caracteres)
- Breadcrumb visual de causa raíz: entidad → métrica → evidencia
- Integrar con TASK-437 (cross-domain causality) una vez live

## Open Questions

- ¿Persistencia por insight o global? Propuesta: global toggle en settings del usuario + override por insight.
