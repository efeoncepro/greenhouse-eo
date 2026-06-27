# TASK-1269 — Growth AI Visibility: Fix-It Artifacts (JSON-LD / llms.txt / Briefs as Deliverables)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `command`
- Epic: `EPIC-020`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|ai|reliability`
- Blocked by: `TASK-1266`
- Branch: `task/TASK-1269-growth-ai-visibility-fix-it-artifacts`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El grader hoy diagnostica pero no entrega nada que el prospecto pueda *aplicar*. Esta task agrega un command gobernado que genera **artefactos fix-it public-safe** a partir del report + los findings de probe (TASK-1266): el `Organization` JSON-LD que falta, un `llms.txt` starter, un content brief AEO-ready. Cierra el loop diagnóstico → acción concreta y sube fuerte la conversión del lead magnet.

## Why This Task Exists

La skill `seo-aeo` *genera* JSON-LD, llms.txt y briefs como artefactos. El grader los recomienda pero no los produce — el prospecto recibe "te falta structured data" sin el snippet listo para pegar. Entregar un artefacto inicial concreto (derivado de lo que el probe detectó ausente) es altísimo valor percibido + bajo costo, y convierte el informe de "reporte" a "herramienta". Es además un diferenciador de retención: el prospecto vuelve por más artefactos.

## Goal

- Command `generateFixItArtifacts(reportSnapshot)` que produce artefactos public-safe deterministas desde el report + probe findings (qué falta según TASK-1266).
- Artefactos v1: `Organization`/`Service` JSON-LD, `llms.txt` starter, content brief AEO-ready por gap prioritario.
- Modelado como capability gobernada (Full API Parity): consumible por el email/página (EPIC-020), Nexa y MCP, sin lógica de pantalla.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — §7.7 report artifact, §11 programmatic contract, §13 privacy/security.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — command gobernado, un primitive muchos consumers.
- `docs/tasks/to-do/TASK-1266-growth-ai-visibility-site-readiness-probe-layer.md` — probe findings (qué falta).
- `docs/tasks/complete/TASK-1235-growth-ai-visibility-report-builder.md` — report como source.
- Skill `seo-aeo` — `templates/` (jsonld, llms-txt, briefs) + `04_AEO_GEO`.

Reglas obligatorias:

- **Generación determinista por defecto** (templates parametrizados desde el report + probe findings), NO LLM. Si se quiere variante LLM-asistida, va detrás del boundary gobernado (`propose → confirm → execute`; el LLM nunca publica directo) y detrás de flag — pero v1 es determinista.
- **Public-safe boundary:** los artefactos no pueden contener raw provider text, accuracy findings, internal reasons ni reclamos de ranking garantizado. Heredan el contrato leak-proof del `PublicGraderReport`.
- **Command gobernado, no click handler:** la generación vive en `src/lib/**` como command reusable; el email/página/Nexa/MCP lo consumen. Capability `report.fix_it.generate` + grant a ≥1 rol real en el mismo PR.
- **No mutar el sitio del prospecto:** los artefactos son entregables para que *él* los aplique; el grader NUNCA escribe en el dominio analizado.

## Normative Docs

- `docs/epics/to-do/EPIC-020-public-ai-visibility-lead-magnet-program.md`
- `src/lib/growth/ai-visibility/report/contracts.ts`
- `src/config/entitlements-catalog.ts` + `src/lib/entitlements/runtime.ts` (capability + grant)

## Dependencies & Impact

### Depends on

- `TASK-1266` — probe findings (qué structured data / llms.txt / robots falta).
- `TASK-1235` — report builder como source de los gaps.

### Blocks / Impacts

- Lo consume `TASK-1250` (email con adjunto) y `TASK-1241` (página) como entregable de valor.
- Sube conversión del lead magnet de EPIC-020.

### Files owned

- `src/lib/growth/ai-visibility/fix-it/` [nuevo: command + generators + templates]
- `src/lib/growth/ai-visibility/fix-it/contracts.ts` [nuevo: artefacto public-safe]
- `src/config/entitlements-catalog.ts` [extender: capability]
- `src/lib/entitlements/runtime.ts` [extender: grant]
- `src/app/api/.../fix-it/route.ts` [endpoint gobernado — verificar lane]
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` [si se gatea]

## Current Repo State

### Already exists

- Report builder + `PublicGraderReport` leak-proof (TASK-1235).
- Recommendation engine (6 motions) en el report (TASK-1235).
- Probe findings de structured data / llms.txt / robots (TASK-1266, dependencia).

### Gap

- Cero generación de artefactos: el prospecto recibe diagnóstico sin entregable aplicable.
- No hay capability ni command para "generar fix-it artifacts".

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `command`
- Source of truth afectado: nuevo command de generación (deriva del report + probe findings)
- Consumidores afectados: email delivery (TASK-1250), página pública (TASK-1241), Nexa, MCP
- Runtime target: `staging|production`

### Contract surface

- Contrato existente a respetar: `PublicGraderReport` leak-proof, recommendation engine, probe findings (TASK-1266).
- Contrato nuevo o modificado: command `generateFixItArtifacts` + capability `report.fix_it.generate` + endpoint gobernado + tipo de artefacto public-safe.
- Backward compatibility: `gated` (capability nueva; nada existente cambia).
- Full API parity: command canónico server-side; UI/Nexa/MCP lo consumen por construcción; write LLM (si lo hay) por `propose→confirm→execute`.

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna nueva si los artefactos se derivan on-demand; opcional cache append-only por report token [verificar].
- Invariantes que no se pueden romper:
  - Artefactos public-safe: sin raw provider text / accuracy findings / internal reasons / claims de ranking garantizado.
  - Generación v1 determinista (templates); LLM solo detrás de boundary gobernado + flag.
  - El grader NUNCA escribe en el dominio del prospecto.
  - Capability + grant en el MISMO PR (coverage test TASK-873/935).
- Tenant/space boundary: público sin sesión consume artefactos public-safe vía token; el command gobernado valida capability para surfaces internas.
- Idempotency/concurrency: generación determinista desde el snapshot inmutable → mismo report = mismo artefacto.
- Audit/outbox/history: log de generación si aplica; sin mutación de SoT externa.

### Migration, backfill and rollout

- Migration posture: `none` (derivación on-demand) — `additive` si se cachea el artefacto [verificar].
- Default state: `flag OFF` (`GROWTH_AI_VISIBILITY_FIX_IT_ENABLED`) hasta validar copy/legal de los artefactos.
- Backfill plan: N/A.
- Rollback path: flag OFF + redeploy.
- External coordination: revisión de copy de los artefactos (es-CL / en-US) con `greenhouse-ux-writing` + legal si el brief hace claims.

### Security and access

- Auth/access gate: capability `report.fix_it.generate` para surfaces internas; público vía token del report.
- Sensitive data posture: sin PII; artefactos derivados de datos public-safe del report.
- Error contract: errores sanitizados (`captureWithDomain`); sin raw provider error.
- Abuse/rate-limit posture: hereda el rate-limit del read del report; cap de generación por token.

### Runtime evidence

- Local checks: `pnpm test` de cada generator + leak test del artefacto + capability-grant-coverage test.
- DB/runtime checks: generar artefactos de un report real + validar JSON-LD contra schema.org + llms.txt bien formado.
- Integration checks: N/A (determinista) salvo variante LLM (smoke del boundary gobernado).
- Reliability signals/logs: opcional signal de generación fallida.
- Production verification sequence: shadow staging → generar para un report de prueba → validar artefactos → flip flag → smoke.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Command + capability + JSON-LD generator

- `generateFixItArtifacts(reportSnapshot)` + capability `report.fix_it.generate` + grant a ≥1 rol real (mismo PR) + coverage test.
- Generator determinista de `Organization`/`Service` JSON-LD desde el report + probe findings; leak test public-safe.

### Slice 2 — llms.txt + content brief generators

- Generator de `llms.txt` starter + content brief AEO-ready por gap prioritario, desde las recomendaciones del report.
- Endpoint gobernado + flag `GROWTH_AI_VISIBILITY_FIX_IT_ENABLED` + fila en `FEATURE_FLAG_STATE_LEDGER.md`.

## Out of Scope

- Aplicar los artefactos en el sitio del prospecto (solo se entregan).
- Render/empaquetado visual en el email/página (TASK-1250 / TASK-1241 / TASK-1252).
- Variante LLM-asistida de generación (follow-up detrás de boundary gobernado).

## Detailed Spec

El command toma un report snapshot (public-safe) + los probe findings de TASK-1266 (qué structured data/llms.txt/robots falta) y produce una lista de artefactos `{ kind, filename, mimeType, content, public_safe: true }`. v1 es determinista: el `Organization` JSON-LD se rellena con brand/website/category del profile; el `llms.txt` se arma desde el sitemap/estructura detectada; el content brief se deriva del primaryGap + recommendedMotion. Nada de esto necesita LLM — son templates parametrizados (los de la skill `seo-aeo`). El boundary public-safe es el mismo que el `PublicGraderReport`: el leak test se extiende al contenido de los artefactos.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Requiere TASK-1266 (probe findings) para saber qué falta. Slice 1 (command+capability+JSON-LD) → Slice 2 (llms.txt+brief). Capability+grant en el mismo PR del Slice 1.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Artefacto filtra dato internal | privacy/security | medium | public-safe boundary + leak test del contenido | leak test rojo |
| Capability sin grant (build roto) | identity | medium | grant + coverage test en el mismo PR | capability-grant-coverage test |
| JSON-LD inválido / brief con claim falso | data quality/legal | medium | validar contra schema.org + revisión copy/legal de claims | validación de artefacto |
| Generación LLM no gobernada (si se agrega) | safety | low | v1 determinista; LLM solo `propose→confirm→execute` + flag | N/A v1 |

### Feature flags / cutover

- `GROWTH_AI_VISIBILITY_FIX_IT_ENABLED` (default `false`) hasta validar copy/legal. Flip tras revisión. Revert: flag OFF + redeploy. <5 min.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | flag OFF / revert PR (capability additive) | <5 min | si |
| Slice 2 | flag OFF / revert PR | <5 min | si |

### Production verification sequence

1. Generar artefactos para un report de prueba en staging.
2. Validar JSON-LD contra schema.org + llms.txt bien formado + leak test verde.
3. Revisión copy/legal de los artefactos (claims).
4. Flip flag prod + smoke.

### Out-of-band coordination required

- Revisión de copy (`greenhouse-ux-writing`, es-CL/en-US) + legal de cualquier claim en los briefs.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `generateFixItArtifacts` es un command server-side reusable (no lógica de pantalla) con capability `report.fix_it.generate` + grant + coverage test en el mismo PR.
- [ ] Genera `Organization`/`Service` JSON-LD válido contra schema.org desde el report + probe findings.
- [ ] Genera `llms.txt` starter + content brief AEO-ready por gap prioritario.
- [ ] Artefactos public-safe: leak test del contenido verde; cero raw provider text / internal reasons / claims de ranking garantizado.
- [ ] Generación v1 determinista (sin LLM); cualquier variante LLM queda detrás del boundary gobernado + flag.
- [ ] Fila por flag en `FEATURE_FLAG_STATE_LEDGER.md`.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- Generar artefactos de un report real en staging + validación schema.org + leak test

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` sincronizado
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado
- [ ] chequeo de impacto cruzado (TASK-1266 findings, TASK-1250 email, TASK-1241 página)
- [ ] `FEATURE_FLAG_STATE_LEDGER.md` actualizado

## Follow-ups

- Variante LLM-asistida (briefs más ricos) detrás de `propose→confirm→execute` + flag.
- Artefactos extra: FAQPage JSON-LD, robots.txt patch sugerido, schema de producto.

## Open Questions

1. ¿Los artefactos se cachean (tabla append-only por report token) o se derivan on-demand siempre? Propuesta: on-demand v1 (determinista, barato); cachear solo si el costo/latencia lo justifica.
