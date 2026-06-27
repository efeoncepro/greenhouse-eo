# TASK-1272 — Growth AI Visibility: Category Taxonomy + Brand Categorization Contract

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
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `EPIC-020`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|ai|data-quality|reliability`
- Blocked by: `none`
- Branch: `task/TASK-1272-growth-ai-visibility-category-taxonomy-contract`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El AEO/AI Visibility Grader necesita decir no solo si la marca aparece, sino **como la categoriza** el answer engine: industria, sector, categoria de producto/servicio, caso de uso, buyer/persona y mercado. Esta task crea una taxonomia gobernada y un contrato de clasificacion para que `categoryAssociations` no sean strings libres del LLM, sino IDs canonicos con evidencia, confianza y degradacion honesta.

## Why This Task Exists

Hoy el score ya tiene la dimension `category_ownership`, y `NormalizedFinding` ya admite `categoryAssociations`, pero el normalizer determinista las deja vacias y el hook LLM puede llenarlas como texto libre cuando se enciende. Eso alcanza para un spike, pero no para Brand Visibility ni para explicar "donde y como te categoriza" de forma comparable entre runs, industrias y reportes publicos. Sin taxonomia, "marketing", "agencia digital", "ASaaS" y "growth operating system" pueden mezclarse como etiquetas equivalentes aunque no lo sean.

## Goal

- Definir el source of truth de categorias del grader con IDs canonicos, labels, aliases, niveles y reglas de fallback.
- Normalizar `categoryAssociations` a categorias gobernadas antes de usarlas en `category_ownership`, Brand Visibility o reportes.
- Crear fixtures/evals que midan precision de categorizacion y eviten falsos positivos de industria/sector, especialmente en marcas ambiguas u homonimas.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — source-of-truth boundaries, normalization/scoring invariants, report/public-safe boundary.
- `docs/architecture/GREENHOUSE_AI_VISIBILITY_GRADER_CALIBRATION_V1.md` — postura de calibracion y limites del golden set.
- `docs/tasks/complete/TASK-1227-growth-ai-visibility-normalization-scoring-engine.md` — contrato `NormalizedFinding` y dimension `category_ownership`.
- `docs/tasks/complete/TASK-1235-growth-ai-visibility-report-builder.md` — report builder como derivacion on-read.
- `docs/tasks/to-do/TASK-1271-growth-ai-visibility-cost-efficient-prose-extraction-router.md` — extractor de prosa que podra proponer candidatos, pero no publicar categorias libres.

Reglas obligatorias:

- **NUNCA** publicar category labels libres como verdad de producto. Todo output visible debe mapear a un ID canonico o degradar a `unknown` / `needs_review`.
- **NUNCA** un LLM asigna el score ni crea categorias canonicas nuevas en runtime. El LLM puede proponer candidatos con evidencia; el mapper gobierna la clasificacion.
- **Separar niveles taxonomicos:** industria, sector, categoria de producto/servicio, caso de uso/JTBD, buyer/persona y mercado/geografia no son sinonimos.
- **Honest degradation:** si la evidencia no alcanza o la marca es ambigua, conservar `unknown`/`ambiguous` y no forzar una categoria por similitud superficial.
- **Public-safe boundary:** el reporte publico puede mostrar categorias agregadas y su base, pero no raw excerpts ni cadenas internas de razonamiento.

## Normative Docs

- `docs/epics/to-do/EPIC-020-public-ai-visibility-lead-magnet-program.md`
- `src/lib/growth/ai-visibility/normalization/contracts.ts`
- `src/lib/growth/ai-visibility/normalization/normalizer.ts`
- `src/lib/growth/ai-visibility/normalization/llm-extraction.ts`
- `src/lib/growth/ai-visibility/scoring/engine.ts`
- `src/lib/growth/ai-visibility/evals/golden-set.v1.json`
- `src/lib/growth/ai-visibility/report/builder.ts`

## Dependencies & Impact

### Depends on

- `TASK-1227` — normalized findings + scoring engine.
- `TASK-1235` / `TASK-1237` — report builder + signal enrichment.
- Current `category_ownership` scoring behavior in `src/lib/growth/ai-visibility/scoring/engine.ts`.

### Blocks / Impacts

- Enables Brand Visibility answers for "como te categoriza" without relying on free-form prose.
- Provides the governed taxonomy consumed by `TASK-1271` before category extraction is product-facing.
- Improves `TASK-1238` brand accuracy monitoring by distinguishing wrong category from mere missing category.
- Feeds future report/UI surfaces (`TASK-1241`, `TASK-1248`, `TASK-1252`) with stable category IDs and labels.

### Files owned

- `src/lib/growth/ai-visibility/taxonomy/` [nuevo]
- `src/lib/growth/ai-visibility/normalization/contracts.ts`
- `src/lib/growth/ai-visibility/normalization/normalizer.ts`
- `src/lib/growth/ai-visibility/normalization/llm-extraction.ts`
- `src/lib/growth/ai-visibility/scoring/engine.ts`
- `src/lib/growth/ai-visibility/evals/golden-set.v1.json`
- `src/lib/growth/ai-visibility/__tests__/`
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_AI_VISIBILITY_GRADER_CALIBRATION_V1.md`

## Current Repo State

### Already exists

- `NormalizedFinding.categoryAssociations: string[]` existe y se persiste en `normalized_findings`.
- `scoreCategoryOwnership` usa `categoryAssociations.length > 0` como senal fuerte cuando hay datos de categoria.
- `enrichFindingWithLlm` puede devolver `categoryAssociations`, pero el hook esta flag-gated y hoy devuelve strings sanitizados.
- El golden set ya contiene ejemplos de asociaciones como `marketing`, `ASaaS`, `Inbound Marketing` y colisiones de entidad.

### Gap

- No existe taxonomia canonica de categorias.
- No existe mapping `raw candidate -> taxonomy id`.
- No existe separacion formal entre industria, sector, categoria, caso de uso, buyer/persona y mercado.
- `category_ownership` puede tratar cualquier string como evidencia de ownership si el hook LLM se prende.
- El reporte no puede explicar "como te categoriza" con consistencia run-over-run ni cross-industry.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `command`
- Source of truth afectado: `src/lib/growth/ai-visibility/taxonomy/` como catalogo versionado de categorias del grader.
- Consumidores afectados: normalizer, scoring, report builder, public/client report surfaces, brand accuracy monitoring, eval runner.
- Runtime target: `local|staging|worker|production`

### Contract surface

- Contrato existente a respetar: `NormalizedFinding`, `scoreGraderRun`, `PublicGraderReport`, golden eval V1.
- Contrato nuevo o modificado: `CategoryTaxonomy`, `CategoryTaxonomyNode`, `CategoryAssociation`, mapper de candidatos, version de taxonomia.
- Backward compatibility: `gated` — mantener compatibilidad con strings existentes mientras se introduce el contrato nuevo; no recomputar historico a ciegas.
- Full API parity: la categorizacion vive en primitives server-side de normalization/scoring; UI/Nexa/MCP consumen readers/reportes, no clasifican por su cuenta.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.normalized_findings` (derivacion recomputable); sin tabla nueva por defecto.
- Invariantes que no se pueden romper:
  - Una categoria visible debe tener ID canonico, nivel, label y version de taxonomia.
  - Un candidato no mapeado no cuenta como category ownership fuerte.
  - Industria, sector, categoria, caso de uso, buyer/persona y mercado se modelan como dimensiones distintas.
  - `unknown` / `needs_review` son resultados validos, no errores.
- Tenant/space boundary: scoring corre server-side; no expone raw excerpts ni prompt text al DTO publico.
- Idempotency/concurrency: misma evidencia + misma version de taxonomia + misma version de extractor debe producir el mismo mapping o fallback.
- Audit/outbox/history: no outbox nuevo; si se persiste version/provenance de taxonomia, debe ser additive y documentado antes de cutover.

### Migration, backfill and rollout

- Migration posture: `none` inicialmente. Si se cambia el shape persistido de `category_associations`, usar migracion additive o compat layer.
- Default state: `shadow/read-only` hasta que golden eval y leak tests pasen.
- Backfill plan: no backfill automatico. Re-score allowlisted para fixtures/runs de evaluacion.
- Rollback path: desactivar uso de taxonomia por flag/config, volver a conservar strings como internal-only o revert PR.
- External coordination: N/A para V1; no provider externo nuevo.

### Security and access

- Auth/access gate: hereda `scoreGraderRun` y readers existentes.
- Sensitive data posture: sin PII; excerpts tratados como datos no confiables.
- Error contract: errores sanitizados con `captureWithDomain('growth')`; fallback determinista sin raw data.
- Abuse/rate-limit posture: N/A directo; no agrega llamadas externas. Si se combina con LLM extraction, hereda budget/circuit breaker de `TASK-1271`.

### Runtime evidence

- Local checks: unit tests de catalogo, mapper, fallback, normalizer/scoring y golden eval.
- DB/runtime checks: re-score local/staging de runs fixture y comparacion de `category_ownership` antes/despues.
- Integration checks: N/A si el catalogo es repo-only; shadow con `TASK-1271` si el mapper consume candidatos LLM.
- Reliability signals/logs: `category_taxonomy_unmapped_candidate`, `category_taxonomy_ambiguous_candidate`, `category_taxonomy_mapping_error` o logs estructurados equivalentes.
- Production verification sequence: shadow staging -> eval gates -> report leak test -> habilitar uso en scoring/report -> monitoreo de unmapped/ambiguous.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

N/A — no nueva capability de negocio. La task modifica primitives internos de normalization/scoring/report que ya alimentan los readers y consumers existentes.

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

### Slice 1 — Taxonomy source of truth + contract types

- Crear `src/lib/growth/ai-visibility/taxonomy/` con catalogo versionado, tipos y validador.
- Definir niveles iniciales:
  - `industry` — macro industria: tecnologia, salud, educacion, servicios profesionales, retail, finanzas, manufactura, energia, gobierno, etc.
  - `sector` — subdivision operativa: martech, fintech, healthtech, public sector, professional services, B2B SaaS, etc.
  - `product_service_category` — categoria concreta de oferta: CRM, agencia digital, growth operating system, consultoria HubSpot, desarrollo web, etc.
  - `use_case` — JTBD/caso de uso: lead generation, revenue operations, customer service automation, AEO readiness, etc.
  - `buyer_persona` — decision maker o usuario: CMO, RevOps, founder, operations leader, IT, agency owner.
  - `market` — geografia/segmento: Chile, LatAm, global, enterprise, mid-market.
- Incluir aliases/sinonimos, labels es/en, ejemplos, parent/child cuando aplique y estado `active|deprecated|internal`.

### Slice 2 — Candidate mapper + normalization integration

- Implementar mapper determinista `mapCategoryCandidateToTaxonomy` con normalizacion de texto, aliases y confianza.
- Adaptar `categoryAssociations` para guardar/transportar categorias gobernadas o una compat layer documentada si el campo persistido sigue siendo `string[]`.
- Asegurar que candidatos no mapeados queden como `unknown`/`needs_review` y no alimenten `category_ownership` fuerte.
- Integrar con `llm-extraction.ts` para que el provider pueda devolver candidatos raw, pero el dominio publique solo mapping gobernado.

### Slice 3 — Scoring, report and eval hardening

- Ajustar `scoreCategoryOwnership` para distinguir categoria canonica vs string legacy/free-form.
- Extender golden fixtures con marcas de varias industrias/sectores, casos de uso y marcas ambiguas.
- Agregar eval de:
  - precision de industria/sector/categoria.
  - falsos positivos por homonimos o tono general.
  - preservacion de `unknown` cuando no hay evidencia.
  - estabilidad run-over-run con la misma version de taxonomia.
- Actualizar report builder para exponer categorias agregadas public-safe cuando existan.

## Out of Scope

- UI/render visual de las categorias en el artifact report (consumer de `TASK-1252`, `TASK-1241`, `TASK-1248`).
- Backfill masivo de runs historicos.
- Recalibrar pesos de `ai_visibility_score_v1`.
- Crear categorias automaticamente desde LLM en runtime.
- Usar taxonomias externas pagadas o APIs de enriquecimiento empresarial en V1.

## Detailed Spec

La taxonomia debe ser pequena, versionada y gobernada por repo al inicio. El shape recomendado:

```ts
type CategoryTaxonomyLevel =
  | 'industry'
  | 'sector'
  | 'product_service_category'
  | 'use_case'
  | 'buyer_persona'
  | 'market'

type CategoryTaxonomyNode = {
  id: string
  level: CategoryTaxonomyLevel
  label: { es: string; en: string }
  aliases: string[]
  parentIds: string[]
  examples: string[]
  status: 'active' | 'deprecated' | 'internal'
}
```

El mapper recibe candidatos del normalizer/LLM como datos no confiables y devuelve asociaciones gobernadas con `taxonomyVersion`, `nodeId`, `level`, `confidence`, `evidenceSource` y `mappingStatus`. Para compatibilidad, si `category_associations` sigue como `string[]`, guardar labels canonicos mientras se agrega metadata interna en memoria o se planifica una migracion additive; no romper lectores existentes sin plan.

Brand Visibility debe poder responder:

- "Te ubica en estas categorias canonicas".
- "Confunde tu industria/sector con X".
- "Te asocia a casos de uso A/B".
- "No hay evidencia suficiente para categorizarte".

Todo eso debe provenir de categorias gobernadas, no de una frase libre del proveedor.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (catalogo + tipos) -> Slice 2 (mapper + normalization) -> Slice 3 (scoring/report/eval). Slice 3 no puede usar categorias en scoring/report hasta que Slice 2 distinga canonical vs fallback.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---:|---|---|
| Clasificar una marca en industria equivocada | data quality/report | medium | `unknown` conservador, eval de homonimos, review_required cuando confianza baja | `category_taxonomy_ambiguous_candidate` |
| Romper compatibilidad con `categoryAssociations: string[]` | scoring/report | medium | compat layer o migracion additive; tests de readers actuales | tests de report/scoring rojos |
| Taxonomia demasiado rigida para nuevas industrias | product/data | medium | `needs_review`, aliases versionados, proceso de extension por PR | alto ratio unmapped |
| Falsa precision en reporte publico | public report | medium | mostrar confianza/base y no raw excerpts; leak test | leak test rojo |

### Feature flags / cutover

- V1 puede nacer shadow: mapear candidatos y loggear unmapped/ambiguous sin cambiar scoring hasta pasar eval.
- Cutover a scoring/report debe ser additive y reversible por flag/config o revert PR.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---:|---|
| Slice 1 | revert PR de catalogo/tipos | <5 min | si |
| Slice 2 | flag/config para no usar mapper; fallback legacy internal-only | <10 min | si |
| Slice 3 | desactivar uso en scoring/report o revert PR | <10 min | si |

### Production verification sequence

1. Ejecutar unit tests + golden eval local.
2. Re-score allowlisted en staging con taxonomy shadow.
3. Revisar ratio de mapped/unmapped/ambiguous.
4. Validar leak test de `PublicGraderReport`.
5. Encender uso en scoring/report solo si el ratio de falsos positivos queda dentro del umbral documentado.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSURE
     "Como se prueba y como se cierra?"
     ═══════════════════════════════════════════════════════════ -->

## Verification

### Required checks

- `pnpm test -- src/lib/growth/ai-visibility`
- `pnpm task:lint --task TASK-1272`
- `pnpm ops:lint --changed`

### Runtime / manual checks

- Re-score local/staging de al menos un run con marca correctamente categorizada y uno ambiguo.
- Confirmar que `category_ownership` no aumenta por strings libres no mapeados.
- Confirmar que el reporte publico no filtra raw excerpts ni candidatos internos.

### Evidence to attach on close

- Diff de catalogo/tipos.
- Resultado de golden eval con precision por nivel taxonomico.
- Ejemplo de output para categoria correcta, categoria desconocida y categoria ambigua.
- Resultado de leak test.

## Acceptance Criteria

- [ ] Existe un source of truth versionado para categorias del grader bajo `src/lib/growth/ai-visibility/taxonomy/`.
- [ ] La taxonomia separa industria, sector, categoria de producto/servicio, caso de uso, buyer/persona y mercado.
- [ ] `categoryAssociations` product-facing se alimenta solo de categorias canonicas o degrada a `unknown` / `needs_review`.
- [ ] El LLM/prose extractor no puede publicar categorias libres como verdad de producto.
- [ ] `scoreCategoryOwnership` distingue evidencia canonica de strings legacy/free-form.
- [ ] Golden/eval fixtures cubren marcas de multiples industrias y al menos un caso ambiguo/homonimo.
- [ ] `PublicGraderReport` no expone raw excerpts ni candidatos internos.
- [ ] Rollback y shadow/cutover quedan documentados en la task/arquitectura aplicable.

## Handoff Notes

- Esta task resuelve el gap de "como te categoriza" para Brand Visibility.
- El gap de "donde te citan" ya vive en `TASK-1268` mediante desglose por dominios de cita.
- `TASK-1271` puede resolver sentiment/prose extraction y costo de proveedores, pero debe consumir esta taxonomia antes de usar category associations como verdad visible.

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado.
- [ ] El archivo vive en la carpeta correcta.
- [ ] `docs/tasks/README.md` sincronizado.
- [ ] `docs/tasks/TASK_ID_REGISTRY.md` sincronizado.
- [ ] `Handoff.md` actualizado si la ejecucion cambia estado operativo o deja rollout pendiente.
