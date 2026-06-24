# TASK-1238 — Growth AI Visibility: Brand Accuracy / Hallucination Monitoring

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
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
- Branch: `task/TASK-1238-growth-ai-visibility-brand-accuracy-monitoring`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Detectar y surfacear cuándo los answer engines dicen cosas **factualmente falsas** de la marca (categoría equivocada, servicios mal atribuidos, colisión de entidad, afirmaciones incorrectas) — no sólo si la marca está ausente o se habla negativo. "No basta aparecer; importa que la IA diga la verdad" (skill `seo-aeo` §07 Parte C). Crítico en YMYL (clientes Globe: bancos/aerolíneas). El score sigue determinista; la verdad-vs-alucinación escala a revisión humana.

## Why This Task Exists

El grader hoy mide **presencia** (ai_visibility), **claridad de entidad** (entity_clarity) y **drift de mensaje** (message_alignment, posicionamiento desviado). Ninguna mide **exactitud factual**: la IA puede afirmar con confianza que la marca está en otra categoría, ofrece servicios que no ofrece, o confundirla con otra empresa. Eso es una **alucinación de marca** y es un riesgo reputacional real, máximo en YMYL. La evidencia parcial ya existe (`messageDriftClaims`, `categoryAssociations`, `brandMentioned='ambiguous'`) pero no hay un detector que la contraste contra la **verdad declarada** de la marca ni una escalación de seguridad para "la IA dice algo falso".

## Goal

- Definir la **verdad de marca** (ground truth) desde el perfil declarado y un contrato `AccuracyFinding` (afirmación de la IA ↔ contradicción con la verdad declarada).
- Detector determinista-first de inexactitudes (category mismatch + contradicción de hechos declarados), con extracción LLM-asistida de afirmaciones SOLO como evidencia (flag existente), NUNCA asignando score.
- Surfacear las inexactitudes en el reporte + **escalar a `review_required`** las probables alucinaciones (seguridad YMYL), con su reliability signal.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — §7.5 (findings), §7.6 (score determinista), §8 (recommendation/gates), §Delta TASK-1227/1235/1237.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — un primitive, muchos consumers.

Reglas obligatorias (invariantes duros del dominio):

- **NINGÚN LLM asigna el score.** El LLM puede EXTRAER afirmaciones (evidencia), pero el veredicto de inexactitud que afecta números es determinista, y "alucinación" definitiva escala a **revisión humana** (`review_required`), nunca a precisión falsa auto-publicada.
- La verdad de marca se deriva de datos **declarados** (perfil), no de inferencia libre. Sin verdad declarada suficiente → degradar honesto (no inventar inexactitud).
- Public-safe: no exponer raw provider text ni afirmaciones difamatorias; el detalle de evidencia es interno.
- Recomputable/determinista: misma evidencia + misma verdad declarada → mismo set de inexactitudes.

## Normative Docs

- `docs/tasks/complete/TASK-1227-growth-ai-visibility-normalization-scoring-engine.md` — `NormalizedFinding` (messageDriftClaims/categoryAssociations/brandMentioned), `resolveScoreStatus` + `RISKY_REVIEW_TERMS` (gate review_required), scoring engine.
- `docs/tasks/complete/TASK-1237-growth-ai-visibility-report-signal-enrichment.md` — patrón de enriquecimiento del reporte (reducers puros sobre findings) — esta task es su continuación natural.
- Skill `seo-aeo` `modules/07_MEASUREMENT.md` §Parte C (monitoreo de exactitud/alucinación) + `modules/03_EEAT_ENTITY.md` (entidad/Knowledge Graph como corrección).

## Dependencies & Impact

### Depends on

- `TASK-1227` (complete) — `NormalizedFinding`, normalización, review-gates, scoring.
- `greenhouse_growth.grader_profiles` (verdad declarada: `brand_name`, `category`, `competitors_declared`, `website_url`) — confirmado en PG.
- `enrichFindingWithLlm` (`src/lib/growth/ai-visibility/normalization/llm-extraction.ts`) + flag `GROWTH_AI_VISIBILITY_LLM_EXTRACTION_ENABLED` (default OFF) — hook de extracción de afirmaciones.

### Blocks / Impacts

- Eleva el grader de "¿apareces?" a "¿la IA dice la verdad de ti?" — diferenciador en YMYL para el pitch Globe.
- Alimenta el reporte (TASK-1235/1237) + el admin evidence review (revisar alucinaciones marcadas).

### Files owned

- `src/lib/growth/ai-visibility/accuracy/**` — verdad de marca + detector + contrato `AccuracyFinding` (puro).
- `src/lib/growth/ai-visibility/report/**` — surface de inexactitudes en el reporte (si Plan Mode decide enrichment-style).
- `src/lib/growth/ai-visibility/review-gates/**` — escalación `review_required` por alucinación probable.
- `src/lib/reliability/queries/growth-ai-visibility-*.ts` — signal de accuracy/review.
- `src/lib/copy/growth.ts` — copy es-CL de los hallazgos de exactitud.
- `src/lib/growth/ai-visibility/__tests__/**` — tests.
- `migrations/` — SOLO si Discovery decide persistir `service_description` en `grader_profiles` (additive).

## Current Repo State

### Already exists

- `NormalizedFinding` con `categoryAssociations`, `messageDriftClaims`, `brandMentioned` (incl. `ambiguous` = colisión de entidad), `sentimentLabel`.
- `grader_profiles` con verdad declarada parcial: `brand_name`, `category`, `competitors_declared`, `website_url`.
- `resolveScoreStatus` + `RISKY_REVIEW_TERMS` (review-gates/gates.ts) — ya escala lenguaje riesgoso a `review_required`.
- `enrichFindingWithLlm` (flag OFF) — hook de extracción LLM aislado.
- Reliability signal `growth.ai_visibility.report_review_required_rate` (scoring-signals.ts) — base para el de accuracy.

### Gap

- No existe una "verdad de marca" canónica ni un contrato `AccuracyFinding`.
- No hay detector que contraste afirmaciones de la IA contra la verdad declarada.
- `grader_profiles` NO persiste una descripción de producto/servicio (§9.2 input público) → la verdad declarada es limitada a categoría/competidores/identidad. [verificar si conviene agregarla]
- No hay escalación específica "alucinación de marca" ni signal de exactitud.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `command` (detector + escalación).
- Source of truth afectado: derivado de `normalized_findings` + `grader_profiles` (verdad declarada); opcional additive `grader_profiles.service_description`.
- Consumidores afectados: reporte (TASK-1235/1237), admin evidence review, futuros HubSpot/Nexa.
- Runtime target: `local` + `staging`.

### Contract surface

- Contrato existente a respetar: `NormalizedFinding`, `PersistedGraderScore`, `resolveScoreStatus`, contrato de reporte (`GraderReport`/`PublicGraderReport`).
- Contrato nuevo o modificado: `BrandTruth` + `AccuracyFinding` + (decisión Plan Mode) campo de accuracy en el reporte y/o input al gate `review_required`.
- Backward compatibility: `additive`.
- Full API parity: detector server-side reusable por todos los consumers; el reporte lo surfacea, no recomputa.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.normalized_findings` + `grader_profiles` (lectura); opcional ALTER additive `grader_profiles`.
- Invariantes que no se pueden romper:
  - **El LLM NO asigna score**; extrae afirmaciones (evidencia). El veredicto numérico es determinista; "alucinación" definitiva → `review_required` humano.
  - Verdad declarada como base; sin verdad suficiente → degradar honesto (no fabricar inexactitud).
  - Determinismo: misma evidencia + verdad → mismo set de `AccuracyFinding`.
  - `null≠0` y public-safe heredados de TASK-1235/1237.
- Tenant/space boundary: V1 interno/pre-tenant.
- Idempotency/concurrency: detector puro read-only; la escalación reusa el path idempotente del score.
- Audit/outbox/history: ninguno nuevo (reusa el ledger de score/findings).

### Migration, backfill and rollout

- Migration posture: `none` en V1; `additive` SOLO si Discovery decide persistir `service_description` (columna nullable + regenerar `db.d.ts`).
- Default state: detector detrás del comportamiento existente; LLM extraction sigue `flag OFF`. Sin auto-publicación de "alucinación".
- Backfill plan: N/A (recomputable on-read).
- Rollback path: revert PR; columna additive sin uso si se agregó.
- External coordination: N/A — repo/interno.

### Security and access

- Auth/access gate: capability `growth.ai_visibility.report.read` / `observation.read` existentes en los endpoints; el detector es server-side puro.
- Sensitive data posture: sin raw provider text al público; copy sin difamación; YMYL → conservador (preferir `review_required` sobre afirmar).
- Error contract: canónico; `captureWithDomain('growth', ...)`.
- Abuse/rate-limit posture: none (derivación interna).

### Runtime evidence

- Local checks: tests de detección de category mismatch, contradicción de hecho declarado, colisión de entidad, escalación `review_required`, determinismo, degradación honesta sin verdad.
- DB/runtime checks: dry-run sobre un run real (ej. EO-GRUN-00008) — inexactitudes coherentes con la evidencia.
- Integration checks: si se ejercita el hook LLM, smoke aislado (flag local).
- Reliability signals/logs: signal `growth.ai_visibility.brand_accuracy_review_required` (o extensión del de review_required), steady=0.
- Production verification sequence: N/A en V1 (interno; prod junto con superficie pública posterior).

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumers nombrados con paths reales.
- [ ] Invariante "ningún LLM asigna score" explícito + escalación humana para alucinación.
- [ ] Migration/backfill/rollback posture explícita (none/additive condicional).
- [ ] Evidencia runtime listada (tests + dry-run real).
- [ ] YMYL conservador: sin afirmar alucinación sin verdad declarada; sin raw/difamación.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Brand truth + AccuracyFinding contract

- `BrandTruth` derivada del perfil declarado (`brand_name`, `category`, `competitors_declared`, `website_url`).
- Contrato `AccuracyFinding` (tipo de inexactitud: `category_mismatch` | `misattribution` | `entity_collision` | `unverifiable_claim`; severidad; evidencia interna).
- Tests del contrato + de la derivación de la verdad.

### Slice 2 — Detector determinista + LLM-assisted evidence + surface

- Detector puro: category mismatch (`categoryAssociations` vs `profile.category`), contradicción de hechos declarados, colisión de entidad (`brandMentioned='ambiguous'`).
- Extracción LLM-asistida de afirmaciones SOLO como candidatos (flag existente OFF por defecto); el score sigue determinista.
- Surface de las inexactitudes en el reporte (extender `message_alignment` o sección/finding `brand_accuracy` separado — **decisión de Plan Mode, OQ#1**). Copy es-CL tokenizado.

### Slice 3 — review_required escalation + signal + dry-run

- Escalar a `review_required` las alucinaciones probables (extiende `resolveScoreStatus`/gates), conservador YMYL.
- Reliability signal de accuracy/review (steady=0) + wire-up.
- Dry-run sobre un run real + leak test (sin raw/difamación al público).

## Out of Scope

- UI / visualización del monitoreo (superficie posterior).
- Corrección automática de fuentes (publicar la verdad en Wikipedia/schema) — es acción del plan, no del detector.
- Tráfico referido por IA / analytics (otra capa, fuera del grader).
- Recalibrar los pesos del `grader_score` v1 ni agregar una 8.ª dimensión al score numérico salvo que Plan Mode lo justifique como `score_version` nueva.
- HubSpot handoff / Nexa exposure.

## Detailed Spec

El monitor de exactitud contrasta lo que la IA **afirma** de la marca contra la **verdad declarada** del perfil. Determinista-first: una `categoryAssociation` que contradice `profile.category`, una afirmación en `messageDriftClaims` que contradice un hecho declarado, o `brandMentioned='ambiguous'` (colisión de entidad) generan un `AccuracyFinding`. La extracción de afirmaciones libres usa el hook LLM existente (flag OFF) SOLO como evidencia; el score nunca lo asigna un LLM. Las alucinaciones probables escalan a `review_required` (humano), coherente con el gate existente y la postura conservadora YMYL — preferir "requiere revisión" antes que afirmar/negar. La verdad declarada hoy es limitada (categoría/competidores/identidad); persistir `service_description` (§9.2) es una decisión de Discovery (OQ#2). La corrección (publicar la verdad en fuentes que la IA consume) es del recommendation engine, no de este detector.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (verdad + contrato) → Slice 2 (detector + surface) → Slice 3 (escalación + signal). La escalación `review_required` (Slice 3) DEBE existir antes de declarar la task completa: detectar sin escalar deja el riesgo YMYL sin gate.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Falso positivo de "alucinación" daña confianza | data quality / trust | medium | determinista-first + verdad declarada estricta + escalar a review humano, no afirmar | `brand_accuracy_review_required` |
| LLM asigna juicio de exactitud al score | architecture invariant | low | LLM sólo extrae evidencia; score determinista; veredicto final humano | test "score sin LLM" |
| Verdad declarada insuficiente → inexactitud inventada | data quality | medium | degradar honesto si falta verdad; no marcar sin base declarada | test degradación |
| Lenguaje difamatorio sobre marca/competidor | legal/brand (YMYL) | low | copy plantilla + review_required hereda; sin raw al público | leak test |

### Feature flags / cutover

- Sin flag nuevo para el detector determinista (additive, gateado por capability existente). La extracción LLM sigue detrás de `GROWTH_AI_VISIBILITY_LLM_EXTRACTION_ENABLED` (default OFF). Revert: revert PR.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (contrato/verdad) | <5 min | si |
| Slice 2 | revert PR (detector/surface); columna additive sin uso si se agregó | <10 min | si |
| Slice 3 | revert PR (gate/signal); el gate vuelve al comportamiento previo | <5 min | si |

### Production verification sequence

1. Slice 1-3: tests + dry-run sobre un run real (inexactitudes + escalación coherentes).
2. Prod: fuera de scope en V1 (junto con superficie pública/admin review posterior).

### Out-of-band coordination required

- N/A — repo/interno. (La definición de "verdad de marca" más rica, si se persiste `service_description`, puede requerir input de producto — anotar en Plan Mode.)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `BrandTruth` (verdad declarada) + contrato `AccuracyFinding` definidos y testeados.
- [ ] Detector determinista-first marca category mismatch / contradicción de hecho declarado / colisión de entidad, recomputable.
- [ ] La extracción LLM (si se usa) aporta SOLO evidencia; el score sigue determinista (test que lo prueba).
- [ ] Alucinaciones probables escalan a `review_required` (conservador YMYL), no a precisión falsa.
- [ ] Sin verdad declarada suficiente → degradación honesta (no se inventa inexactitud).
- [ ] Inexactitudes surfaceadas en el reporte con copy tokenizado (`src/lib/copy/growth.ts`), sin difamación; público sin raw evidence.
- [ ] Reliability signal de accuracy/review en steady=0; dry-run real coherente.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- Dry-run del detector sobre un run real
- `pnpm docs:closure-check` al cerrar

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress`/`complete`)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] arch `## Delta` (dimensión/detector de exactitud) + `RELIABILITY_CONTROL_PLANE` Delta por el signal nuevo
- [ ] chequeo de impacto cruzado (TASK-1235/1237 + futuras superficie pública/admin review)

## Follow-ups

- Corrección guiada: recomendaciones específicas para corregir la fuente que la IA consume (schema/Wikipedia/perfil) cuando hay alucinación — extiende el recommendation engine §8.4.
- Persistir `service_description` para una verdad de marca más rica (si Discovery no lo incluye en V1).

## Open Questions

1. **¿Extender la dimensión `message_alignment` o crear un detector/sección `brand_accuracy` separado?** `message_alignment` mide *posicionamiento desviado* (drift); exactitud mide *hecho falso* — son conceptualmente distintos. Agregar una 8.ª dimensión al score v1 recalibra pesos (→ `score_version` nuevo, costoso). Propuesta para Plan Mode: **NO** nueva dimensión en el score v1; un detector/finding de accuracy que alimenta el reporte (estilo TASK-1237) + escala a `review_required`, sin tocar los números del score. Confirmar en Discovery.
2. **¿Verdad de marca más rica?** Hoy `grader_profiles` sólo tiene `category`/`competitors_declared`/`brand_name`/`website_url`. La descripción de producto/servicio (§9.2 input público) NO se persiste. ¿V1 acepta verdad limitada (categoría/identidad) o agrega `service_description` (migración additive)? Decidir en Discovery según el valor/costo.
3. **¿Cobertura del determinista-first vs LLM en V1?** El determinista cubre category mismatch + colisión de entidad; las afirmaciones libres falsas requieren el hook LLM (flag OFF). ¿V1 entrega sólo determinista (sin depender del flag) y deja el LLM-assisted como evidencia opcional? Probable sí (no bloquear V1 en el flag).
