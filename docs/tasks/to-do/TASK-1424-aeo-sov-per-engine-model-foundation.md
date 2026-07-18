# TASK-1424 — AEO: Share of Voice per-motor en el ReportArtifactModel (foundation)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `reader`
- Epic: `EPIC-020`
- Status real: `Definida`
- Rank: `TBD`
- Domain: `growth`
- Blocked by: `none`
- Branch: `task/TASK-1424-aeo-sov-per-engine-model-foundation`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Extender la derivación del reporte AEO con **share of voice POR MOTOR** (marca vs competidores por
provider: OpenAI/ChatGPT, Anthropic/Claude, Perplexity, Gemini/AI Overviews) como campo aditivo del
contrato — hoy `competitiveSov` es un agregado único cross-motor. La data ya existe:
`NormalizedFinding.provider` + `brandMentioned` + `competitorsMentioned` permiten agrupar la MISMA
derivación de `buildCompetitiveSov` por provider. El campo viaja leak-safe a `ClientGraderReport` y
al `ReportArtifactModel` (SSOT TASK-1252) para que TODOS los renders (cliente, operador, PDF, email)
puedan consumirlo. Consumer visible = TASK-1425 (panel del mockup aprobado de TASK-1276).

## Why This Task Exists

El mockup aprobado de la vista operador (Claude Design "AEO Operator View", Región 7 "Cómo te ve
cada motor") muestra SoV desglosado por motor — el gancho de venta del cross-sell (~11% de solape de
citas entre motores hace que el agregado único esconda la historia real por canal). En la
implementación de TASK-1276 se degradó honesto (solo agregado + presencia por motor) porque el
modelo no trae el desglose. Esta task cierra esa brecha en la capa correcta: el modelo compartido,
no un cálculo forkeado en una vista.

## Goal

- `CompetitiveShareOfVoice` gana un desglose per-provider aditivo (o campo hermano
  `competitiveSovByEngine`) derivado en `buildCompetitiveSov`/builder — misma semántica de conteo
  que el agregado (findings con `brandMentioned==='yes'` vs `competitorsMentioned`), agrupada por
  `finding.provider`.
- El campo se proyecta leak-safe a `ClientGraderReport` (y al DTO público si el render público lo
  consume) y pasa al `ReportArtifactModel` sin forkear scoring.
- Cero cambio de comportamiento para consumers existentes (campo aditivo; agregado intacto).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` (report builder +
  leak-safe projections + disclosure matrix)
- `docs/ui/flows/EPIC-020-AEO-PROGRAM-UI-FLOW.md` (regla de oro: un modelo, cuatro renders — el
  desglose vive en el modelo, NUNCA calculado en una vista)
- `docs/tasks/complete/TASK-1252-growth-ai-visibility-report-artifact-design-system.md`
  (`ReportArtifactModel` SSOT + variants de disclosure)

Reglas obligatorias:

- NO forkear la derivación en vistas/consumers: una sola fuente en el builder.
- Disclosure público-safe: el desglose per-motor usa los MISMOS datos ya público-safe del agregado
  (`providerPresence` ya viaja al público); NUNCA exponer narrativa cruda por provider
  (`providerFindings` sigue internal-only).
- Honest degradation: motor sin findings ⇒ ausente o `mentions: 0` explícito — nunca inventar
  porcentajes; el render decide cómo mostrar "sin datos de este motor".

## Normative Docs

- `src/lib/growth/ai-visibility/report/builder.ts` (`buildCompetitiveSov`, :242)
- `src/lib/growth/ai-visibility/report/contracts.ts` (`CompetitiveShareOfVoice`, :181;
  `ClientGraderReport`, :561)
- `src/lib/growth/ai-visibility/normalization/contracts.ts` (`NormalizedFinding.provider`, :98)
- `src/components/growth/ai-visibility/report-artifact/model.ts` (`ReportArtifactModel`)

## Dependencies & Impact

### Depends on

- Nada bloqueante: `NormalizedFinding.provider` + `competitorsMentioned` ya existen y pueblan los
  runs reales (verificado 2026-07-17 en discovery de TASK-1276).

### Blocks / Impacts

- **TASK-1425** (render del panel per-motor) — bloqueada por esta foundation.
- Renders PDF/email/print (TASK-1273/1250): NO se tocan acá; podrán consumir el campo después.

### Files owned

- `src/lib/growth/ai-visibility/report/builder.ts` (derivación aditiva)
- `src/lib/growth/ai-visibility/report/contracts.ts` (tipo aditivo + projections leak-safe)
- `src/components/growth/ai-visibility/report-artifact/model.ts` (passthrough al modelo)
- Tests focales de builder/model (`src/lib/growth/ai-visibility/__tests__/**` `[verificar]` nombre
  exacto del spec de builder)

## Current Repo State

### Already exists

- `buildCompetitiveSov(findings)` agrega cross-motor (`brandMentions` + `competitors[]`).
- `NormalizedFinding` trae `provider`, `brandMentioned`, `competitorsMentioned` por finding.
- `providerPresence` per-motor (conteos present/resolved) ya viaja público-safe.

### Gap

- Ningún contrato expone marca-vs-competidores POR provider; el render per-motor del mockup
  aprobado no puede alimentarse sin forkear cálculo en la vista.

## Backend/Data Contract

- Backend rigor: `backend-lite` — derivación pura en memoria sobre findings ya cargados; sin DB,
  sin migración, sin API route nueva, sin secreto, sin side effects.
- Source of truth: `NormalizedFinding[]` del run (ya cargados por `buildGraderReport`); la
  derivación vive SOLO en el builder.
- Contract surface: `GraderReport`/`ClientGraderReport`/DTO público (campo aditivo) +
  `ReportArtifactModel` (passthrough). Sin route nueva: los readers existentes
  (`readGraderReport`, `readClientGraderReport`, `readOperatorScopedAeoReport`) lo transportan
  por construcción.
- Data invariants: (1) suma per-motor consistente con el método del agregado (mismo predicado de
  conteo); (2) motor sin findings ⇒ sin fila o counts 0 explícitos, NUNCA porcentaje fabricado;
  (3) providers = union de providers presentes en findings del run (no hardcodear la lista);
  (4) orden determinista (provider asc, competidores por mentions desc + nombre asc, espejo del
  agregado).
- Tenant/access boundary: sin cambios — el campo viaja dentro de reportes ya gateados
  (client-scoped / operator-scoped / token público).
- Idempotency/concurrency: n/a (derivación pura).
- Migration/backfill/rollback: n/a — aditivo en memoria; los runs históricos lo derivan on-read.
  Rollback = revert PR.
- Sensitive data/errores: nombres de competidores ya son público-safe en el agregado actual; no se
  agrega superficie nueva de PII/narrativa cruda.
- Audit/signal: n/a (sin write path).
- Runtime evidence: además de tests focales, ejercitar el builder contra un run REAL (Sky Airlines
  vía `readOperatorScopedAeoReport` con proxy local o staging) y verificar que el desglose suma
  coherente con el agregado — los mocks no prueban la data real (gate TASK-893 en espíritu).

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/growth/ai-visibility/report/` (builder + contratos) + `src/components/growth/ai-visibility/report-artifact/model.ts`
- Future candidate home: `remain-shared`
- Boundary: la derivación per-motor vive SOLO en el builder del report; contratos/model transportan el campo aditivo y los consumers (views/PDF/email) solo leen — nadie recalcula SoV fuera del builder.
- Server/browser split: builder server-only; contratos y `ReportArtifactModel` son types/derivados serializables browser-safe (sin cambio del split actual).
- Build impact: nulo — sin dependencias nuevas.
- Extraction blocker: ninguno — derivación pura dentro del dominio existente.


<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Contrato + derivación en el builder

- Tipo aditivo (p.ej. `EngineShareOfVoice { provider, brandMentions, competitors: CompetitorPresence[] }[]`)
  en `contracts.ts`; derivación en `buildCompetitiveSov`/builder agrupando por `finding.provider`.
- Tests focales: agrupación correcta, consistencia con el agregado, motor sin findings, orden
  determinista, run sin findings.

### Slice 2 — Projections leak-safe + ReportArtifactModel

- Passthrough en `toClientGraderReport` (+ DTO público si aplica al render público `[verificar]`
  si el público lo consumirá ahora o queda internal/cliente-only por disclosure) y en
  `modelFromClientReport`/`modelFromInternalReport`.
- Test de no-leak: el campo no arrastra narrativa cruda ni campos internal-only.

### Slice 3 — Evidencia con run real + cierre

- Ejercitar contra un run real (Sky/Berel) y registrar la evidencia (agregado vs suma per-motor).
- Gates + docs (Delta en la arquitectura del grader §report + impacto cruzado a TASK-1425).

## Out of Scope

- Cualquier render visible (TASK-1425).
- Cambios al PDF/email/print (podrán consumir el campo en follow-ups propios).
- Cambios de scoring, prompts o normalización.

## Detailed Spec

La derivación espeja `buildCompetitiveSov` con un `Map<provider, {brand, Map<competitor, n>}>` en
una sola pasada sobre `findings`. El shape final debe ser serializable, determinista y consistente
con `CompetitorPresence` existente. La decisión fina de shape (campo anidado en
`CompetitiveShareOfVoice.byEngine` vs campo hermano top-level) se toma en Plan Mode mirando qué
minimiza el blast en consumers tipados existentes.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → 2 → 3 estrictamente: el modelo no puede exponer un campo que el builder aún no deriva.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Divergencia agregado vs per-motor | growth/report | low | test de consistencia (suma per-motor vs agregado con mismo predicado) | test focal rojo |
| Leak de datos internal-only | disclosure | low | passthrough SOLO de counts/nombres ya público-safe + test no-leak | test no-leak |
| Blast en consumers tipados del SoV | ui/pdf | low | campo ADITIVO (no cambiar el shape existente) + `pnpm test` full | tsc/test |

### Feature flags / cutover

- Sin flag: campo aditivo inerte hasta que un render lo consuma (TASK-1425).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1-2 | revert PR | <5 min | sí |
| 3 | n/a (evidencia/docs) | — | sí |

### Production verification sequence

1. `pnpm test` full + build.
2. Evidencia con run real (proxy local o staging) de que el desglose se deriva y suma coherente.
3. El release a prod viaja con el siguiente batch normal (campo inerte sin consumer).

### Out-of-band coordination required

- N/A — repo-only.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El contrato expone SoV per-motor aditivo (provider + brandMentions + competitors) derivado
      en el builder — cero cálculo en vistas.
- [ ] Consistencia probada: mismo predicado de conteo que el agregado; suma coherente en un run
      REAL (no solo mocks).
- [ ] Leak-safe: `ClientGraderReport`/model no ganan narrativa cruda ni campos internal-only
      (test de no-leak verde).
- [ ] Motor sin findings degrada honesto (sin porcentajes fabricados).
- [ ] Consumers existentes sin cambio de comportamiento (`pnpm test` full verde).
- [ ] `ReportArtifactModel` transporta el campo en `clientPortal` y `adminPreview`.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- Ejercicio con run real (Sky/Berel) vía reader operador + evidencia registrada en la task.

## Closing Protocol

- [ ] `Lifecycle` sincronizado + archivo en carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] Delta en `GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` (§report contracts)
- [ ] Chequeo de impacto cruzado (TASK-1425 desbloqueada; nota a TASK-1273/1250 como consumers
      potenciales)

## Follow-ups

- TASK-1425 (render del panel per-motor en el workbench — mockup aprobado TASK-1276).
- Evaluar consumir el desglose en PDF (TASK-1273) y email (TASK-1250).

## Open Questions

- ¿El DTO público (`PublicGraderReport`) también expone el desglose ahora, o queda
  cliente/operador-only en esta iteración? Resolver en Plan Mode contra la disclosure matrix
  (los datos base ya son público-safe; la decisión es de producto, no técnica).
