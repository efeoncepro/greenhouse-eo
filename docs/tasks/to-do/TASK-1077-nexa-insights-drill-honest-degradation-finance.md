# TASK-1077 — Nexa Insights drill: degradación honesta cuando el id no resuelve (Finance 404)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Epic: `—`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `ui | delivery | finance`
- Blocked by: `none`
- Branch: `task/TASK-1077-nexa-drill-honest-degradation`
- Legacy ID: `—`

## Summary

El CTA "Abrir en Nexa →" del `NexaInsightsBlock` lleva a un `notFound()` (404) en el **Finance Dashboard**: las señales de Finanzas usan IDs `EO-FSIG-*` / `EO-FAIE-*` que el drill reader de TASK-947 (`/nexa/insights/[id]`) NO reconoce (solo resuelve `EO-AIS/AIE/AIH` de ICO/delivery). Las otras 4 superficies (Home, Espacio 360, Mi Performance, Person Activity) usan `EO-AIS-*` y el drill funciona. Fix: el block solo renderiza el drill cuando el id resuelve a un Nexa detail reconocido — degradación honesta (no mostrar un link que va a 404).

## Why This Task Exists

`NexaInsightsBlock` es compartido por 5 superficies. El drill por-insight hace `buildNexaInsightDrillHref(item.signalId ?? item.id)` → `/nexa/insights/[id]`. La página de detalle (TASK-947) resuelve el id vía `detectNexaIdKind`, que solo conoce los prefijos ICO/delivery (`EO-AIS-`, `EO-AIE-`, `EO-AIH-`). Las señales de Finanzas (`src/lib/finance/ai/finance-signal-types.ts`: `stableFinanceSignalId` → `EO-FSIG-*`, `stableFinanceEnrichmentId` → `EO-FAIE-*`) NO comparten ese esquema, y el reader de Finanzas (`src/lib/finance/ai/llm-enrichment-reader.ts` → `mapInsightItem`) **no setea `signalId`** y devuelve `id = EO-FAIE-*`. Resultado: en Finance el CTA siempre cae a `detectNexaIdKind() === 'unknown'` → `not_found` → `notFound()`.

Es **preexistente** (el viejo "Ver causa raíz" apuntaba al mismo drill roto), pero el rediseño del block (TASK-1075 follow-up) hizo del drill el CTA único + prominente de cada insight, así que el 404 ahora es más visible y debe cerrarse. Detectado al auditar los datos que pueblan el block en cada superficie.

## Goal

- En superficies cuyo insight id NO resuelve a un Nexa detail reconocido (hoy: Finance), el block NO muestra el CTA "Abrir en Nexa" (en vez de mostrar un link que da 404).
- El insight sigue mostrando todo lo demás (narrativa, severidad, "Acción sugerida", "Ver causa raíz" inline si hay rootCauseNarrative).
- En las 4 superficies con `EO-AIS-*` el drill se mantiene intacto.
- Decisión data-driven (usa el detector canónico de prefijos), se auto-corrige si Finanzas gana soporte de drill a futuro.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/tasks/complete/TASK-947-nexa-insights-detail-page-canonical.md` (contrato del drill `/nexa/insights/[id]` + `readNexaInsightDrill` + prefijos `EO-AIS/AIE/AIH` + anti-oracle `notFound()`)
- Skill `state-design` — honest degradation: NUNCA mostrar una affordance que lleva a un destino inexistente.

Reglas obligatorias:

- NO mostrar el drill CTA cuando el id no es resoluble por el detector canónico de prefijos.
- NO romper el drill de las superficies ICO/delivery (`EO-AIS-*`).
- NO hardcodear "si es Finance, ocultar" — la condición es "¿el id resuelve?" (data-driven vía `detectNexaIdKind`), no la superficie.

## Normative Docs

- `CLAUDE.md` → "Nexa AI Signals append-only event log invariants (TASK-943)" + "Nexa Insights detail page canonical invariants (TASK-947)".

## Dependencies & Impact

### Depends on

- `src/lib/ico-engine/ai/nexa-insight-drill-reader.ts` — `detectNexaIdKind` + `NEXA_ID_PREFIXES` (hoy `server-only`).
- `src/lib/ico-engine/ai/nexa-insight-href.ts` — `buildNexaInsightDrillHref` (client-safe; ya importado por el block).

### Blocks / Impacts

- `NexaInsightsBlock` (5 superficies). Cambio aditivo/condicional — no rompe ninguna.
- No bloquea ninguna task. NO incluye habilitar el drill de Finance (eso sería una task aparte que extiende TASK-947).

### Files owned

- `src/lib/ico-engine/ai/nexa-insight-href.ts` (mover/exponer `NEXA_ID_PREFIXES` + `detectNexaIdKind` client-safe, o un helper `canResolveNexaInsightDrill`)
- `src/lib/ico-engine/ai/nexa-insight-drill-reader.ts` (re-exportar desde el módulo client-safe — un solo SoT)
- `src/components/greenhouse/NexaInsightsBlock.tsx` (render condicional del drill)
- `src/components/greenhouse/NexaInsightsBlock.test.tsx` (test: drill oculto para id no-resoluble)

## Current Repo State

### Already exists

- `detectNexaIdKind` + `NEXA_ID_PREFIXES` (`nexa-insight-drill-reader.ts:67-83`, server-only).
- `buildNexaInsightDrillHref` (`nexa-insight-href.ts`, client-safe — fue extraído del reader server-only justamente para uso cliente).
- Finance reader sin `signalId` (`src/lib/finance/ai/llm-enrichment-reader.ts:17-26`).
- Finance signal id scheme `EO-FSIG-*` / `EO-FAIE-*` (`src/lib/finance/ai/finance-signal-types.ts:236-246`).

### Gap

- No hay forma client-safe de preguntar "¿este id resuelve a un Nexa detail?" — `detectNexaIdKind` vive en un módulo `server-only`, así que el block (client) no puede usarlo.
- El block renderiza el drill incondicionalmente → 404 en Finance.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Detector de prefijo client-safe (SoT único)

- Mover `NEXA_ID_PREFIXES` + `detectNexaIdKind` (o agregar `canResolveNexaInsightDrill(id): boolean`) al módulo client-safe `nexa-insight-href.ts`.
- Re-exportar desde `nexa-insight-drill-reader.ts` (server) para no duplicar el SoT (mismo patrón con que `buildNexaInsightDrillHref` fue extraído).

### Slice 2 — Render condicional del drill en el block + test

- En `InsightRow` (`NexaInsightsBlock.tsx`): renderizar el CTA "Abrir en Nexa" SOLO si `canResolveNexaInsightDrill(item.signalId ?? item.id)`.
- Test focal: con un id `EO-FAIE-*` (finance) el drill NO se renderiza; con `EO-AIS-*` SÍ. El resto del insight (narrativa, acción sugerida) se renderiza en ambos casos.

## Out of Scope

- **NO** habilitar el drill de Finanzas en `/nexa/insights/[id]` (extender `readNexaInsightDrill` + subject filter + render para `EO-FSIG/EO-FAIE`). Eso es una task derivada que amplía TASK-947 (mayor: reader finance + acceso + render). Esta task solo cierra el 404 con degradación honesta.
- **NO** tocar el esquema de IDs de finance ni el reader de finance.
- **NO** tocar el drill de las superficies ICO/delivery.

## Detailed Spec

El block ya importa `buildNexaInsightDrillHref` desde `nexa-insight-href.ts` (client-safe). Agregar al mismo módulo un helper puro:

```ts
export const canResolveNexaInsightDrill = (id: string | null | undefined): boolean =>
  detectNexaIdKind(id ?? '') !== 'unknown'
```

(con `NEXA_ID_PREFIXES` + `detectNexaIdKind` movidos a ese módulo, re-exportados desde el reader server-only para mantener un único SoT).

En `InsightRow`:

```tsx
const drillHref = buildNexaInsightDrillHref(item.signalId ?? item.id)
const showDrill = canResolveNexaInsightDrill(item.signalId ?? item.id)
…
{showDrill && (
  <Box>{/* CTA "Abrir en Nexa" */}</Box>
)}
```

Finance (`item.id = EO-FAIE-*`, sin `signalId`) → `showDrill = false` → sin CTA. ICO/delivery (`EO-AIS-*`) → `showDrill = true` → CTA intacto.

## Rollout Plan & Risk Matrix

N/A — additive UI change, no production runtime impact, no rollback needed. Cambio puramente de presentación en un componente cliente (render condicional de un link), sin migraciones, sin flags, sin mutación de estado. Rollback = revert del PR + redeploy.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Ocultar el drill por error en una superficie ICO/delivery (regresión) | UI | low | Test focal: `EO-AIS-*` → drill visible; `EO-FAIE-*` → oculto. GVC de Home/Space360/MyPerformance | no signal — visible en GVC + test |

### Feature flags / cutover

Sin flag — additive, immediate cutover (cambio de presentación seguro).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR + redeploy | <5 min | sí |
| Slice 2 | revert PR + redeploy | <5 min | sí |

### Production verification sequence

1. `pnpm test src/components/greenhouse/NexaInsightsBlock.test.tsx` verde.
2. GVC del Finance Dashboard (nexa block) → el CTA "Abrir en Nexa" NO aparece en los insights de finance; el insight muestra narrativa + acción sugerida.
3. GVC de Home / Mi Performance → el CTA sigue presente y resuelve.

### Out-of-band coordination required

N/A — repo-only change.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El CTA "Abrir en Nexa" NO se renderiza para un insight cuyo `signalId ?? id` no resuelve por `detectNexaIdKind` (caso finance `EO-FAIE-*`).
- [ ] El CTA SÍ se renderiza para `EO-AIS-*` (ICO/delivery) — sin regresión en Home/Space360/MyPerformance/PersonActivity.
- [ ] `NEXA_ID_PREFIXES` + `detectNexaIdKind` tienen un único SoT (módulo client-safe `nexa-insight-href.ts`, re-exportado por el reader server-only).
- [ ] El insight de finance sigue mostrando narrativa + severidad + "Acción sugerida" (no se rompe nada más).
- [ ] Test focal anti-regresión verde.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/components/greenhouse/NexaInsightsBlock.test.tsx`
- GVC del Finance Dashboard + Home (nexa block): drill ausente en finance, presente en ICO/delivery.

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado si cambia comportamiento visible
- [ ] chequeo de impacto cruzado (TASK-947, TASK-1075)
- [ ] (opcional) abrir follow-up para habilitar el drill de Finanzas en `/nexa/insights/[id]` si el operador lo quiere

## Follow-ups

- Follow-up mayor (separado): extender TASK-947 (`readNexaInsightDrill` + subject filter + render) para resolver señales de Finanzas (`EO-FSIG-*` / `EO-FAIE-*`) y habilitar el drill en el Finance Dashboard. Requiere reader finance + acceso (route_group finance) + render del detalle. Solo si el operador quiere drill de finance.

## Open Questions

- ¿El operador prefiere (a) ocultar el drill en Finance (esta task) o (b) directamente habilitar el drill de finance (follow-up mayor)? Default: (a) ahora, (b) como follow-up opcional.
