# TASK-1235 — Growth AI Visibility: Report Builder

## Delta 2026-06-24

- La ejecución async del run está **`complete` (staging operativo)** por TASK-1234 (worker Cloud Run `POST /growth/grader/drain` + enqueue/poll + persistencia incremental + recovery de huérfanos; flag `GROWTH_AI_VISIBILITY_ASYNC_EXECUTION_ENABLED` ON en staging, verificado con un run `full` real). Los runs `full` multi-provider ya completan sin timeout. El report builder consume **runs completados** (`succeeded`/`partial`) + su `grader_score`; ya no asume ejecución inline. El GET detail (`/runs/[runId]`) sirve como poll de progreso.

## Delta 2026-06-24 — Review con skills (SEO/AEO + arquitectura + product design)

Revisión de la task con tres lentes. No hay errores de contrato (alineada con §7.7/§8.4), pero estos 8 ajustes la afilan. Resuelven además las dos Open Questions.

**SEO/AEO (skill `seo-aeo`, módulos `04_AEO_GEO` + `efeonce/AI_VISIBILITY_GRADER`):**

1. **Recomendaciones PRIORIZADAS, no lista plana.** El valor del reporte es saber *qué hacer primero*. El motor §8.4 debe **ordenar** las recomendaciones por impacto (peso de la dimensión × severidad del gap, estilo RICE) y exponer el `primary_gap` + `recommended_motion` (que además alimenta el HubSpot handoff §7.8). Regla de la skill: "no entregues backlogs planos".
2. **Copy de recomendación anclado al conocimiento de la skill, no genérico.** Las plantillas es-CL del mapeo gap→acción deben fundarse en las tácticas reales de `seo-aeo` (entidad/Knowledge Graph para entity clarity; answer capsules/citabilidad para citation quality; **brand mentions ≈3× backlinks** + digital PR para AI visibility; frescura <2 meses; contenido comparativo para competitive SoV). Agregar `seo-aeo` como Normative Doc.
3. **Conciencia por-motor (canal distinto, ~11% de solape de fuentes).** El run ya tiene `provider_observations` por proveedor → el reporte interno puede surfacer presencia por-motor ("invisible en Perplexity, presente en Gemini") como finding más rico. **Decidir en Discovery**: finding adicional en V1 vs follow-up (no inflar scope).
4. **Audiencias alineadas al naming canónico.** `audience` (§7.7: public/internal_sales/client/executive) mapea a los artefactos nombrados de la skill: **AI Visibility Grader** (public lead magnet) · **AI Visibility Snapshot** (sales/HubSpot) · **Surround Discovery Audit** (pagado/estratégico). Usar ese naming en el copy/headline.

**Arquitectura (skill `arch-architect` + overlay Greenhouse):**

5. **Resuelve Open Q1 → derivar ON-READ en V1 (SSOT).** El reporte es función pura de `(run_id, score_version)`; persistir `grader_reports` crearía un 2.º SSOT con riesgo de drift contra el score. El **snapshot inmutable** (qué se le mostró al prospecto en fecha X) pertenece a la **task de superficie pública** (al emitir: snapshot de `run_id + score_version + report_version + recommendation_pack_version`), no al builder. V1 sin migración.
6. **Versionar el mapeo de recomendaciones** (`report_version` + `recommendation_pack_version`) espejando el patrón `prompt_pack_version` ya canónico del dominio → reporte reproducible y mapeo evolucionable sin romper reportes viejos.
7. **Resuelve Open Q2 → capability propia `growth.ai_visibility.report.read` (least-privilege) + grant en `runtime.ts` mismo slice** (regla capability⇒grant coverage). Razón: un audience public/client debe poder ver el reporte SIN `observation.read` (evidencia cruda de provider). Defensa-en-profundidad del public-safe en **3 capas**: (a) tipo DTO público distinto que estructuralmente NO puede cargar raw text/prompts, (b) builder que sólo lee campos seguros, (c) leak test.

**Product design (estados honestos + viz-ready + conversión):**

8. **Shape del DTO para sus consumidores.** Cada gate (`insufficient_data`/`review_required`/`partial`) carga **razón renderizable + próximo paso**, no sólo un status string. Las 7 dimensiones salen **viz-ready** (por dimensión: score + label + severidad de gap + recomendación) para el radar/bar futuro. El DTO público sigue la **estructura de conversión** del arch §7.7 (headline = gap dominante, 3-5 findings, top competidores, resumen de tipos de fuente, próximos pasos, **disclaimer "muestreado y asistido por IA, sin garantías" como campo del contrato**, no sólo texto de flujo). Validar copy con `greenhouse-ux-writing`.

> **4 pilares (arch overlay):** *Safety* — public DTO sin raw/PII + gates heredados + copy plantilla sin difamación. *Robustness* — determinista (mismo score+versiones → mismo reporte); dimensión sin evidencia → excluida, no fabricada. *Resilience* — signal opcional `report_build_failed` + degradación honesta. *Scalability* — derivación on-read O(1) sobre score persistido, sin contención.

## Delta 2026-06-24 — Review product design (5 lentes: dataviz · state-design · info-architecture · ux-writing · a11y)

La task es backend (`UI impact: none`), pero el reporte ES el dato que las superficies futuras (lead magnet público, AI Visibility Snapshot en HubSpot, admin review) renderizan. Estos 6 requisitos **a nivel de contrato del DTO** hacen que ese producto futuro nazca bien — sin meter UI en esta task. Forman parte del Backend/Data Contract (afinan el §"Data model and invariants" y el shape del DTO del Slice 2).

**P-1 — `null` ≠ `0` (dataviz + state-design): cada dimensión es un `SourceResult<T>`.** El DTO expone por dimensión `{ key, score: number | null, status: 'ok' | 'empty' | 'degraded', reason? }` (patrón canónico Greenhouse `SourceResult<T>`). **AI Visibility 0/100 = gap real medido** (`status: ok, score: 0`); una dimensión **sin evidencia** = `status: empty` (excluida del promedio, "sin evidencia"), **NUNCA** `score: 0`. La superficie nunca debe poder pintar `null` como `0`.

**P-2 — viz-ready chart-agnostic (dataviz).** Por dimensión: `{ label, score 0-100, max: 100, severity }`; la superficie elige radar (overview) o **bar (precisión — perceptualmente más fuerte, C&M)**. Competitive SoV como **lista comparable** (marca + competidores con conteo de presencia), no pie. Source-type summary categórico. Headline con forma de KPI (métrica + valor + frame). `severity` es **valor nombrado** (`critico|atencion|optimo|sin_dato`), nunca un color — la superficie lo mapea a token AXIS + encoding secundario.

**P-3 — gate states con razón + próxima acción (state-design).** `insufficient_data` / `review_required` / `partial` cada uno carga `{ reason, nextAction }` renderizable, **no sólo un enum** — la superficie pinta el estado vacío/locked/degradado con anatomía (título + razón + CTA), nunca un blanco. El status del run (`partial`) se propaga al reporte con disclosure.

**P-4 — narrativa answer-first por mental model del prospecto (info-architecture).** Estructura: **headline (gap dominante) → 3-5 findings → plan de acción priorizado → dimensiones/evidencia como detalle**. NO un volcado de los 7 scores (eso es la capa de evidencia, no el lead). `audience` = niveles de **disclosure progresivo** (public = scent acotado + top moves; internal = plan completo). Metadata de procedencia como campos del contrato (`as_of_date`, `prompt_pack_version`, `providers_sampled`, `prompt_count`, `score_version`) para orientación + el disclaimer.

**P-5 — "nunca un número sin contexto" + tono + copy layer (ux-writing).** Cada finding = `[severidad nombrada] + métrica + contexto comparativo (vs competidores / umbral) + verbo de acción`. Headline factual, **no alarmista** ("Invisible en descubrimiento por IA: 0/100", no "¡Estás perdiendo clientes!"). **Sin difamación** de competidores. El copy de recomendaciones/headline/gate-states/disclaimer es **plantilla es-CL reusable → se autora en `src/lib/copy/<domain>.ts`** (no inline), validado con `greenhouse-ux-writing`. El `recommendation_pack` (P-6 del delta anterior) es versionado y su copy vive en la capa de copy.

**P-6 — público ⇒ piso WCAG 2.2 AA, contrato estructurado (a11y).** El reporte es lead magnet público (EAA en vigor): el DTO debe ser **estructurado/tabular** para que la superficie derive **table-fallback + alternativa de texto** de los charts sin recomputar. `severity` nombrada (no color-only). **Label plain-language + explainer de 1 línea por dimensión** (a11y cognitiva, sin jerga): `Entity Clarity` → "¿La IA entiende quién eres y qué vendes?". El contrato carga el label humano + explainer, no sólo la `key` técnica.

> **Nota de scope:** todo lo anterior es shape del contrato (backend) — NO agrega UI a TASK-1235. Las decisiones de render (radar vs bar, layout, tokens, GVC) son de la task de superficie pública posterior. Pero el contrato debe **habilitarlas por construcción**: estructurado, honesto (`null`≠`0`), priorizado, con copy tokenizado y metadata de procedencia.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `command`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|ai|reliability`
- Blocked by: `TASK-1227`
- Branch: `task/TASK-1235-growth-ai-visibility-report-builder`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construir el artefacto `grader_report` (aggregate §7.7 del arch): a partir del `grader_score` + `normalized_findings`, generar un reporte versionado con narrativa de gaps + recomendaciones accionables (§8.4), separando output **public-safe** del **internal**. NO crea UI, no es público, no escribe HubSpot — es el primitive de reporte que las superficies posteriores consumen.

## Why This Task Exists

TASK-1227 dejó el `grader_score` (7 dimensiones, determinista) pero un score crudo no es un entregable: el valor comercial del grader (ADR) es el **reporte** que muestra al prospecto sus gaps + qué hacer (pre-pitch artifact). Sin este primitive, la superficie pública, el admin review y el HubSpot handoff no tienen qué mostrar/enviar. El arch ya define `grader_report` (§7.7) + el recommendation engine (§8.4, gap→recomendación); falta materializarlo como primitive server-side gobernado, public-safe.

## Goal

- Materializar `grader_report` versionado derivado de score + findings (recomputable, sin LLM en el score).
- Mapear gaps por dimensión a recomendaciones accionables (§8.4) de forma determinista/explicable.
- Separar el DTO public-safe (sin raw provider text/prompts) del internal completo; respetar `insufficient_data`/`review_required` (no emitir reporte definitivo sin gate).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — §7.7 (`grader_report`), §8.4 (recommendation engine), §Delta 2026-06-24 (invariantes scoring), runtime contract (público bounded + safe, sin guarantees).
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — un primitive, muchos consumers.
- `docs/architecture/GREENHOUSE_GROWTH_DOMAIN_ARCHITECTURE_V1.md`.

Reglas obligatorias:

- El reporte se deriva SOLO de `grader_score` + `normalized_findings` versionados; ningún LLM asigna score ni inventa gaps/recomendaciones (mapeo determinista; el copy puede ser plantilla).
- Public-safe NUNCA incluye raw provider text, prompts completos ni excerpts sensibles.
- Si el score es `insufficient_data`/`review_required`, el reporte refleja ese estado (no precisión falsa, no auto-release).
- Competencia permitida pero sin lenguaje difamatorio; preservar citas/evidencia.

## Normative Docs

- `docs/tasks/complete/TASK-1227-growth-ai-visibility-normalization-scoring-engine.md` — score + findings + DTO + gates (dependencia directa).
- `docs/tasks/complete/TASK-1226-growth-ai-visibility-provider-adapter-foundation.md` — schema `greenhouse_growth`.

## Dependencies & Impact

### Depends on

- `TASK-1227` (complete) — `grader_score`, `normalized_findings`, `toPublicSafeScore`, review gates.
- `TASK-1226` (complete) — schema `greenhouse_growth`.

### Blocks / Impacts

- Bloquea la superficie pública/report del grader (qué se muestra/envía).
- Bloquea el HubSpot handoff (`primary_gap`, `recommended_motion` salen del reporte).
- Habilita el admin evidence review (revisar/aprobar reportes `review_required`).

### Files owned

- `src/lib/growth/ai-visibility/report/**` — builder + recommendation mapping + DTO public/internal.
- `src/lib/growth/ai-visibility/__tests__/**` — tests.
- migrations/ — `greenhouse_growth.grader_reports` si se persiste (additive); o derivar on-read en V1 (decidir en Discovery).
- `src/app/api/admin/growth/ai-visibility/runs/[runId]/report/**` — endpoint admin interno (read), opcional.

## Current Repo State

### Already exists

- `grader_score` (7 dims con reasons/evidenceCount/confidence) + `normalized_findings` + `toPublicSafeScore` + review gates (`scoreStatus`/`reviewReasons`).
- Recommendation table conceptual en el arch §8.4 (gap→acción), aún no materializada.

### Gap

- No existe `grader_report` ni el mapeo gap→recomendación en código.
- No hay separación report-level public/internal (existe a nivel score, falta a nivel reporte narrativo).
- No hay tabla `grader_reports` (si se decide persistir).

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `command` (derivación de reporte).
- Source of truth afectado: derivado de score+findings; opcional `greenhouse_growth.grader_reports`.
- Consumidores afectados: superficie pública/report, admin review, HubSpot handoff, Nexa/MCP futuros.
- Runtime target: `local` + `staging`; público fuera de scope.

### Contract surface

- Contrato existente: `grader_score`/`PersistedGraderScore`, `normalized_findings`, gates.
- Contrato nuevo: `GraderReport` (audience public/internal_sales/client/executive del §7.7) + recommendation mapping + DTO public/internal.
- Backward compatibility: `additive`; nada público consume hasta tasks posteriores.
- Full API parity: builder server-side reusable por todos los consumers.

### Data model and invariants

- `grader_report` deriva de `(run_id, score_version)`; recomputable → mismo reporte para mismo score+report_version.
- Recomendaciones deterministas (mapeo gap→acción §8.4); el copy es plantilla, no generación libre.
- `insufficient_data`/`review_required` se propagan al reporte; público bounded.
- Public-safe sin raw text; internal con detalle + evidencia.

### Migration, backfill and rollout

- Migration posture: `additive` si se persiste `grader_reports`; `none` si V1 deriva on-read (preferir on-read si el score ya está persistido y el reporte es puro derivado — decidir en Discovery).
- Default state: gated; sin auto-release público.
- Rollback path: revert PR; tabla additive sin uso o reverse migration.
- External coordination: N/A (repo/interno).

### Security and access

- Auth/access gate: read interno con capability `growth.ai_visibility.observation.read` (existente) o nueva `growth.ai_visibility.report.read` si se requiere granularidad (decidir + grant en runtime.ts mismo slice).
- Sensitive data posture: public DTO sin raw; copy sin afirmaciones difamatorias.
- Error contract: canónico; sin raw provider/LLM errors.

### Runtime evidence

- Local checks: tests de mapeo gap→recomendación, determinismo del reporte, propagación de gates, leak test public DTO.
- DB/runtime checks: si persiste, migration verify; dry-run sobre runs de fixtures/1227.
- Reliability signals: reusar los de scoring; opcional `growth.ai_visibility.report_build_failed`.

### Acceptance criteria additions

- [ ] `GraderReport` derivado de score+findings, recomputable y versionado.
- [ ] Recomendaciones deterministas mapeadas desde gaps (§8.4).
- [ ] Public DTO sin raw provider text/prompts; gates propagados.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — GraderReport contract + recommendation mapping

- Definir `GraderReport` V1 (report_version) + el mapeo determinista gap→recomendación (§8.4: low entity clarity, low category ownership, weak citation quality, competitors dominate, message drift, weak revenue intent).
- Tests de mapeo + determinismo (mismo score → mismo reporte).

### Slice 2 — Report builder + DTO public/internal

- Builder server-side desde `(run_id, score_version)` → `GraderReport` (narrativa de gaps + recomendaciones + headline).
- DTO public-safe (sin raw) vs internal (con evidencia/reasons); propagar `insufficient_data`/`review_required`.
- Persistencia `grader_reports` SOLO si Discovery decide (preferir on-read si es puro derivado).

### Slice 3 — Endpoint interno + signals + dry-run

- Endpoint admin read `GET /runs/[runId]/report` (capability) que delega en el builder, o incluir el reporte en el GET detail existente.
- Dry-run sobre runs de 1226/1227 (ej. EO-GRUN-00007 → reporte con AI Visibility gap dominante).
- Leak test public DTO + signals.

## Out of Scope

- UI / report visual / página pública / tokenización del reporte.
- HubSpot handoff (task aparte).
- Ejecución async de runs (TASK-1234).
- Generación de copy por LLM (el copy es plantilla determinista en V1).
- Nexa/MCP exposure.

## Detailed Spec

El reporte es **derivación pura** del score+findings ya persistidos (TASK-1227). Decisión de Discovery: **persistir `grader_reports` o derivar on-read**. Preferir on-read en V1 (el score ya es persistido y versionado; el reporte es función pura de él) salvo que se necesite snapshot inmutable para el público. El recommendation engine es un mapeo determinista dimensión-con-gap → acción (tabla §8.4); el copy es plantilla es-CL (validar con `greenhouse-ux-writing` si hay texto visible reusable). El headline usa el hallazgo dominante (ej. "Invisible en descubrimiento: AI Visibility 0/100").

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (contract + mapping) → Slice 2 (builder + DTO) → Slice 3 (endpoint + signals). El public DTO (Slice 2) DEBE existir antes de cualquier endpoint que lo exponga (Slice 3).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Raw provider text se filtra al public DTO | privacy/security | low | DTO público derivado de campos seguros + leak test | leak test |
| Reporte sobre-confiado sin cobertura | data quality / trust | medium | propagar insufficient_data/review_required al reporte; no headline definitivo | reusa scoring signals |
| Lenguaje difamatorio sobre competidores | legal/brand | low | copy plantilla + review_required hereda del score | `report_review_required_rate` |
| Recompute produce reporte distinto | reliability | low | reporte = función pura de score+report_version + tests | test determinismo |

### Feature flags / cutover

- Sin flag nuevo si es read interno derivado (additive). Si se persiste o expone, gatear por capability + (opcional) flag `GROWTH_AI_VISIBILITY_REPORT_ENABLED` default OFF. Revert: revert PR.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (contract/mapping) | <5 min | si |
| Slice 2 | revert PR; tabla additive sin uso si se persistió | <10 min | si |
| Slice 3 | revert endpoint / flag OFF | <5 min | si |

### Production verification sequence

1. Slice 1-2: tests + dry-run sobre runs reales de 1226/1227 (reporte coherente con el score).
2. Slice 3: endpoint interno en staging + leak test public DTO.
3. Prod: fuera de scope (junto con superficie pública posterior).

### Out-of-band coordination required

- N/A — repo/interno. (Legal/privacy del copy público se valida en la task de superficie pública.)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `GraderReport` V1 versionado (`report_version` + `recommendation_pack_version`), derivado on-read de score+findings, recomputable. — `report/contracts.ts` + `builder.ts`; test determinismo verde.
- [x] Recomendaciones deterministas mapeadas desde gaps por dimensión (§8.4) **y priorizadas** (peso × severidad → `primary_gap`/`recommended_motion`), fundadas en la skill `seo-aeo`. — `recommendations.ts` (6 drivers, RICE-ish); dry-run primaryGap=low_category_ownership.
- [x] DTO public-safe sin raw provider text/prompts (tipo distinto + builder safe-fields + leak test); internal con evidencia; capability propia `report.read` + grant. — `PublicGraderReport` + `report-public-leak.test.ts`; capability + grant `runtime.ts` (guard coverage verde).
- [x] `insufficient_data`/`review_required`/`partial` propagados con **razón + próxima acción** renderizables (sin precisión falsa ni auto-release). — `report.gate` + copy `GH_GROWTH_AI_VISIBILITY.gate`; test gates.
- [x] Cada dimensión es `SourceResult<T>` honesto: **`score: null` (sin evidencia) ≠ `score: 0` (gap real)**; severidad nombrada (no color); label plain-language + explainer; metadata de procedencia presente. — `ReportDimension` (status ok/empty + severity nombrada + explainer) + `provenance`; test null≠0.
- [x] Copy de recomendaciones/headline/gate/disclaimer tokenizado en `src/lib/copy/*` (no inline), validado con `greenhouse-ux-writing`; sin difamación. — `src/lib/copy/growth.ts`.
- [x] Dry-run sobre un run real produce un reporte coherente con el score. — EO-GRUN-00008: headline "AI Visibility 0/100" critico, gate=partial, overall 26.4.
- [x] Sin UI pública, HubSpot write ni Nexa/MCP en esta task.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- Dry-run del builder sobre un run real de 1226/1227
- `pnpm docs:closure-check` al cerrar

## Closing Protocol

- [x] `Lifecycle` sincronizado (`complete`)
- [x] archivo en la carpeta correcta (`complete/`)
- [x] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [x] `Handoff.md` + `changelog.md` actualizados
- [x] arch `## Delta 2026-06-24 — TASK-1235` (afina §7.7/§8.4: on-read, versionado, SourceResult, 6 drivers)
- [x] chequeo de impacto cruzado (TASK-1227/1234 + futuras superficie pública/HubSpot — sin cambio de estado en to-do; el reporte desbloquea esas tasks como estaba previsto)

## Follow-ups

- Superficie pública + tokenización del reporte (lead magnet).
- HubSpot handoff (primary_gap/recommended_motion desde el reporte).
- Admin evidence review surface.
- Generación de copy asistida por LLM (si se quiere narrativa más rica que plantilla).

## Open Questions

1. ~~¿Persistir `grader_reports` o derivar on-read?~~ **Resuelta (review 2026-06-24) → ON-READ en V1** (reporte = función pura de `(run_id, score_version, report_version, recommendation_pack_version)`; SSOT limpio, sin migración). El snapshot inmutable es de la task de superficie pública. Confirmar en Discovery sólo si emerge una razón fuerte de snapshot temprano.
2. ~~¿Capability propia o reusar `observation.read`?~~ **Resuelta (review 2026-06-24) → capability propia `growth.ai_visibility.report.read`** (least-privilege: ver el reporte sin la evidencia cruda de provider) + grant en `runtime.ts` mismo slice.
3. ~~¿El reporte interno surfacea presencia **por-motor** en V1?~~ **Resuelta (Discovery 2026-06-24) → SÍ en V1, INTERNAL-ONLY** (`providerPresence` por proveedor: resolved + present, derivación pura de `findings.provider`). No infla scope (es un reducer) y nunca viaja al DTO público. Verificado en dry-run (EO-GRUN-00008: gemini resolved 6/present 1, openai/perplexity 0).
