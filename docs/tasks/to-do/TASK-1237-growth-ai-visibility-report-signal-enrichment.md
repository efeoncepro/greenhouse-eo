# TASK-1237 — Growth AI Visibility: Report Signal Enrichment

## Delta 2026-06-24

- TASK-1236 (complete) agregó el bloque `trend` (tendencia temporal) a `GraderReport`/`PublicGraderReport` y un módulo `report/trend.ts` + reader `getPreviousComparableScore`. **No colisiona** con esta task (campos distintos: trend vs citation-share/sentiment/position/per-engine). Al tomar 1237, partir del contrato de reporte ya con `trend` presente; los nuevos campos additivos conviven. El patrón "reducer puro sobre el score/findings + null≠0 + público-safe" de 1235/1236 es el mismo a seguir.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `command`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|ai`
- Blocked by: `TASK-1235`
- Branch: `task/TASK-1237-growth-ai-visibility-report-signal-enrichment`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Surfacear en el `grader_report` (TASK-1235) cuatro señales AEO que el sistema **ya captura pero no muestra**: citation share del sitio propio (% de respuestas que citan tu dominio), resumen de sentimiento, posición/prominencia de la marca, y un hallazgo narrativo **por-motor** ("invisible en Perplexity, presente en Gemini"). Todo derivación pura de `normalized_findings`, additive.

## Why This Task Exists

El framework de reporting AEO (skill `seo-aeo` §07) lista presence %, **citation share %**, sentimiento y posición como dimensiones del Share of Voice IA; y §04 insiste en que **cada motor es un canal distinto** (~11% de solape de fuentes). TASK-1235 ya captura los datos crudos (`citationDomains`, `sentimentLabel`, `brandRank`, `provider` por finding) pero el reporte no los surfacea: muestra calidad de fuente por tipo pero no "% que cita TU sitio", no resume sentimiento ni posición, y deja la presencia por-motor como conteo interno (`providerPresence`) sin narrativa. Son enriquecimientos de alto valor y bajo costo (reducers sobre findings ya cargados), sin nueva data ni migración.

## Goal

- **Citation share propio**: % de respuestas (findings con citas) que citan el dominio del sujeto (`subjectDomain`), distinto de la calidad de fuente por tipo.
- **Sentimiento + posición**: resumen de `sentimentLabel` (distribución/saldo) y de `brandRank` (posición promedio/mejor) en el reporte.
- **Narrativa por-motor**: convertir `providerPresence` en un finding legible por motor (presente/invisible), respetando que es internal-only por defecto (decidir exposición pública acotada en Discovery).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — §7.5 (findings), §7.7/§8.4 + §Delta 2026-06-24 TASK-1235 (contrato del reporte, defensa public-safe en 3 capas).
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md` — un primitive, muchos consumers.

Reglas obligatorias:

- Toda señal nueva se deriva SOLO de `normalized_findings` + el `subjectDomain` del perfil; ningún LLM computa la señal (determinista; el copy es plantilla).
- Mantener la honestidad `null≠0` y los gates de TASK-1235: sin evidencia de citas → citation share `null` (sin dato), no `0`.
- Public-safe intacto: el citation share es un % agregado (OK público); la presencia por-motor narrativa y los dominios crudos siguen internal-only salvo decisión explícita + leak test.
- Sin difamación: el resumen de sentimiento es factual, no editorializa sobre competidores.

## Normative Docs

- `docs/tasks/complete/TASK-1235-growth-ai-visibility-report-builder.md` — contrato `GraderReport`/`PublicGraderReport`, builder, leak test (dependencia directa).
- `docs/tasks/complete/TASK-1227-growth-ai-visibility-normalization-scoring-engine.md` — `NormalizedFinding` (citationDomains, sentimentLabel, brandRank, provider).
- Skill `seo-aeo` `modules/07_MEASUREMENT.md` (citation share, sentimiento, posición) + `modules/04_AEO_GEO.md` (cada motor un canal).

## Dependencies & Impact

### Depends on

- `TASK-1235` (complete) — `buildGraderReport`/`GraderReport`/`PublicGraderReport` + leak test.
- `TASK-1227` (complete) — `NormalizedFinding` con `citationDomains`/`sentimentLabel`/`brandRank`/`provider`; `subjectDomain` derivado en el scoring command.

### Blocks / Impacts

- Enriquece el reporte que consumen la superficie pública/sales, el admin review y el HubSpot snapshot (citation share + por-motor son ganchos de venta fuertes).

### Files owned

- `src/lib/growth/ai-visibility/report/builder.ts` — reducers nuevos + campos additivos en `GraderReport`.
- `src/lib/growth/ai-visibility/report/contracts.ts` — tipos additivos (citation share, sentiment summary, position, per-engine finding).
- `src/lib/copy/growth.ts` — copy de los nuevos findings/labels.
- `src/lib/growth/ai-visibility/__tests__/**` — tests + extensión del leak test.

## Current Repo State

### Already exists

- `NormalizedFinding` con `citationDomains[]`, `sourceTypes[]`, `sentimentLabel`, `sentimentScore`, `brandRank`, `provider`, `brandMentioned`.
- `subjectDomain` se deriva en `scoreGraderRun` (de `profile.websiteUrl`) — [verificar si llega al builder o hay que pasarlo].
- `GraderReport` (TASK-1235) con `competitiveSov`, `sourceTypeSummary`, `providerPresence` (internal), `dimensions`, defensa public-safe en 3 capas + leak test.

### Gap

- No hay "citation share del sitio propio" (% de respuestas que citan `subjectDomain`); hoy solo calidad por tipo de fuente.
- No hay resumen de sentimiento ni de posición (`brandRank`) en el reporte (el dato se captura pero no se surfacea).
- `providerPresence` es conteo crudo, no un finding narrativo por-motor.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-lite`
- Impacto principal: `command`
- Source of truth afectado: derivado de `greenhouse_growth.normalized_findings` (sin tabla nueva).
- Consumidores afectados: superficie pública/sales, admin review, HubSpot snapshot, Nexa/MCP futuros.
- Runtime target: `local` + `staging`.

### Contract surface

- Contrato existente a respetar: `GraderReport`/`PublicGraderReport`, `buildGraderReport`/`toPublicGraderReport`, leak test (3 capas).
- Contrato nuevo o modificado: campos additivos en `GraderReport` (citation share propio, sentiment summary, position summary, per-engine finding) + proyección public-safe selectiva.
- Backward compatibility: `additive` (campos nuevos; nada existente cambia de shape).
- Full API parity: reducers en el builder canónico server-side, reusados por todos los consumers; sin cómputo ad-hoc por pantalla.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_growth.normalized_findings` (solo lectura, vía `readGraderScore`).
- Invariantes que no se pueden romper:
  - Determinismo: mismos findings + `subjectDomain` → mismas señales.
  - `null≠0`: sin citas evaluables → citation share `null` (sin dato), no `0`; sin `brandRank` → posición `null`.
  - Public-safe: nunca exponer `citationDomains` crudos ni `providerPresence` al DTO público sin decisión explícita + leak test.
- Tenant/space boundary: V1 interno/pre-tenant (posture de TASK-1226/1227).
- Idempotency/concurrency: read-only puro; sin writes.
- Audit/outbox/history: none (derivado read-only).

### Migration, backfill and rollout

- Migration posture: `none` (deriva on-read de findings ya persistidos).
- Default state: `read-only` (additive; las nuevas señales internas por default, exposición pública selectiva).
- Backfill plan: N/A.
- Rollback path: revert PR.
- External coordination: N/A — repo/interno.

### Security and access

- Auth/access gate: capability `growth.ai_visibility.report.read` (existente) en el endpoint; el builder es puro.
- Sensitive data posture: citation share = % agregado (público OK); dominios crudos + por-motor narrativo = internal salvo decisión + leak test.
- Error contract: canónico; `captureWithDomain('growth', ...)`; sin raw provider/LLM errors.
- Abuse/rate-limit posture: none (read interno derivado).

### Runtime evidence

- Local checks: tests de citation share propio (incl. `null` sin citas), sentiment summary, position summary, per-engine finding; extensión del leak test (dominios crudos NO al público).
- DB/runtime checks: dry-run sobre un run real con findings con citas/sentimiento/rank (ej. EO-GRUN-00008).
- Integration checks: N/A.
- Reliability signals/logs: reusa los de scoring; sin signal nuevo.
- Production verification sequence: N/A en V1 (interno).

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumers nombrados con paths reales.
- [ ] Invariantes (`null≠0`, public-safe, determinismo) y tenant boundary explícitos.
- [ ] Migration/backfill/rollback posture explícita (none/on-read/revert PR).
- [ ] Evidencia runtime listada (tests + dry-run sobre run real + leak test extendido).
- [ ] Sin raw data leak (dominios crudos / por-motor fuera del público salvo decisión + leak test).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Citation share propio + sentiment + position

- `subjectDomain` llega al builder (pasarlo desde el command si no llega hoy).
- Citation share propio: % de findings con citas cuyo `citationDomains` incluye `subjectDomain`; `null` si no hay findings con citas.
- Sentiment summary (distribución/saldo de `sentimentLabel`) + position summary (mejor/promedio de `brandRank`), ambos `null`-honestos.
- Tests deterministas + `null≠0`.

### Slice 2 — Per-engine narrative finding + public-safe

- Convertir `providerPresence` en un finding narrativo por-motor (presente/invisible por proveedor), copy tokenizado.
- Decidir exposición pública (probable: citation share propio SÍ público; por-motor + sentimiento detalle = internal). Extender el leak test.
- Dry-run sobre un run real + leak test verde.

## Out of Scope

- UI / radar / charts (lo consume la superficie posterior).
- Tendencia temporal (TASK-1236).
- Monitoreo de exactitud/alucinación dedicado (task aparte; roza message_alignment).
- Tráfico referido por IA (GA4/analytics — otra capa, fuera del grader).
- Cambiar el cálculo del `grader_score` (las dimensiones de TASK-1227 no se tocan; esto es presentación/derivación de findings).

## Detailed Spec

Todas las señales son **reducers puros** sobre los `normalized_findings` ya cargados por `readGraderScore`, más el `subjectDomain` del perfil. Citation share propio = `findings con subjectDomain en citationDomains / findings con cualquier cita` (`null` si denominador 0). Sentiment summary = conteo por `sentimentLabel` (excluyendo `unknown`) + saldo simple. Position summary = mejor (`min`) y promedio de `brandRank` no-null. Per-engine finding = narrativa sobre `providerPresence` ("presente en {motor}" / "invisible en {motor}"). El copy de findings/labels se tokeniza en `src/lib/copy/growth.ts` (validar `greenhouse-ux-writing`). El DTO público solo recibe lo que pase el leak test; los dominios crudos y la presencia por-motor quedan internal salvo decisión explícita en Discovery.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (señales agregadas) → Slice 2 (narrativa por-motor + decisión public-safe + leak test). La proyección pública DEBE pasar el leak test extendido antes de exponer cualquier campo nuevo.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Dominios crudos de citación se filtran al público | privacy | low | citation share = solo %; dominios crudos internal + leak test extendido | leak test |
| `null` pintado como `0` (citation share / posición sin dato) | data quality | low | propagar `null` (sin dato) cuando no hay denominador | test null≠0 |
| `subjectDomain` mal normalizado → citation share inflado/0 | data quality | medium | reusar `extractCitationDomain`/normalización canónica + test con dominio real | test dry-run |
| Resumen de sentimiento editorializa sobre competidores | brand/legal | low | summary factual sobre la marca sujeto, no sobre competidores | revisión copy |

### Feature flags / cutover

- Sin flag — additive, read interno gateado por la capability existente `growth.ai_visibility.report.read`. Cutover inmediato; revert = revert PR.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (campos additivos) | <5 min | si |
| Slice 2 | revert PR (narrativa + proyección pública) | <5 min | si |

### Production verification sequence

1. Slice 1-2: tests + dry-run sobre un run real con findings con citas/sentimiento/rank + leak test.
2. Prod: fuera de scope en V1 (junto con la superficie pública posterior).

### Out-of-band coordination required

- N/A — repo/interno.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Citation share propio en el reporte: % de respuestas que citan `subjectDomain`; `null` (sin dato) si no hay findings con citas.
- [ ] Sentiment summary + position summary additivos, `null`-honestos (sin fabricar `0`).
- [ ] Finding narrativo por-motor derivado de `providerPresence` ("presente/invisible en {motor}"), copy tokenizado.
- [ ] Public-safe preservado: dominios crudos + por-motor fuera del DTO público salvo decisión explícita; leak test extendido verde.
- [ ] Copy nuevo en `src/lib/copy/growth.ts` (validado con `greenhouse-ux-writing`); sin difamación.
- [ ] Dry-run sobre un run real produce las señales coherentes con los findings.
- [ ] Sin cambio al `grader_score`, sin UI, sin migración, sin write.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- Dry-run del reporte enriquecido sobre un run real
- `pnpm docs:closure-check` al cerrar

## Closing Protocol

- [ ] `Lifecycle` sincronizado (`in-progress`/`complete`)
- [ ] archivo en la carpeta correcta
- [ ] `docs/tasks/README.md` + `TASK_ID_REGISTRY.md` sincronizados
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] arch `## Delta` si el contrato de reporte cambia (señales nuevas)
- [ ] chequeo de impacto cruzado (TASK-1235/1236 + futuras superficie pública/HubSpot)

## Follow-ups

- Detalle de "qué dominios gana el competidor" (internal, para el plan de acción) — extiende competitiveSov con fuentes por competidor.
- Monitoreo de exactitud/alucinación dedicado (¿la IA dice algo falso de la marca?) — task aparte, crítico en YMYL.

## Open Questions

1. ¿El citation share propio se expone en el DTO público (probable sí, es %)? ¿La narrativa por-motor queda internal-only en V1 (probable sí)? Decidir en Discovery con criterio public-safe + leak test.
2. ¿`subjectDomain` ya llega al builder o hay que pasarlo desde `readGraderReport`/`scoreGraderRun`? [verificar en Discovery].
