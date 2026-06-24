# TASK-1228 — Growth AI Visibility Discovery & Eval Spike

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `integration`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth|ai|data-quality|reliability`
- Blocked by: `none`
- Branch: `task/TASK-1228-growth-ai-visibility-discovery-eval-spike`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Spike de descubrimiento + eval que valida EMPÍRICAMENTE el modelo de medición del AI Visibility Grader ANTES de hornearlo en código. Corre un prompt pack borrador contra OpenAI/Perplexity/Gemini sobre un golden set de marcas, y produce evidencia para 5 preguntas que hoy están adivinadas: (1) ¿las 7 dimensiones discriminan marca fuerte vs débil y qué pesos emergen?; (2) ¿cuánta varianza run-to-run hay?; (3) ¿cuánto cuesta un run por modo?; (4) ¿la extracción brand-mention es viable determinista-first o necesita LLM?; (5) un prompt pack V1 + golden eval set versionados. Es precursor de `TASK-1226` (alimenta cost ceiling + prompt pack) y dependency dura de `TASK-1227` (alimenta pesos + varianza + extracción + golden set). NO construye runtime productivo, schema, UI ni HubSpot.

## Why This Task Exists

`TASK-1227` define un score determinista versionado con 7 dimensiones y pesos duros (25/15/15/15/15/10/5) y deja la golden-set eval como último slice — es decir, **diseña el score y después chequea si mide algo**. Eso viola el principio eval-driven (un modelo de medición de IA no se hornea sin baseline empírico). Tres riesgos concretos quedan sin cerrar antes de invertir en el motor: (a) los pesos pueden no discriminar marca fuerte vs débil; (b) el input (respuestas LLM) es no-determinista y cambia día a día, así que un score "determinista" puede oscilar entre runs y matar la confianza del prospecto si no hay modelo de muestreo/varianza; (c) la extracción brand-mention/rank desde prosa libre es NLP difícil y está planteada como "determinista-first con fallback LLM", supuesto no probado. Para un producto público (lead magnet GTM) además falta un techo de costo/run, que condiciona prompt count, providers y free-tier. Este spike es barato (manual/low-volume, sin runtime) y convierte esas adivinanzas en evidencia que aterriza en 1226/1227.

## Goal

- Producir un **prompt pack V1** versionado (12–20 prompts, familias de intent + tipos de fan-out, mercado es-CL) listo para que 1226/1227 lo consuman como artefacto, no lo inventen.
- Medir empíricamente, sobre un **golden set de marcas**, si las 7 dimensiones discriminan y qué **pesos** emergen (validar o revisar los del contrato).
- Cuantificar **varianza run-to-run** y **costo/run** por modo (`light`/`full`), y recomendar estrategia de muestreo (N corridas, reporte de rango/confianza) + **cost ceiling**.
- Probar la **dificultad de extracción** brand-mention/rank/competidores y recomendar determinista-first vs LLM-primary, con evidencia.
- Entregar un **golden eval set V1** (inputs + expected normalized findings) que `TASK-1227` use como baseline de regresión.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — secciones 7.5/7.6 (normalized_finding, grader_score + 7 dimensiones/pesos), 8.1 (prompt strategy), 8.2/8.2.1 (provider policy + connection contract + execution modes), 8.3 (normalization), 16 (evals/quality gates), 17 (cost model).
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_DECISION_V1.md` — ADR; el `revisit when` "primeros 50 runs no predictivos" es justo lo que este spike adelanta a fase de diseño.
- `docs/architecture/GREENHOUSE_GROWTH_DOMAIN_ARCHITECTURE_V1.md` — frontera del dominio `growth`, identifiers canónicos, data posture (PII), naming.

Reglas obligatorias:

- Spike sin runtime productivo: NO crea schema `greenhouse_growth`, NO crea API/command/reader productivo, NO escribe HubSpot, NO despliega UI. Sus outputs son docs + fixtures + un harness throwaway.
- Provider calls solo server-side / local, low-volume, gated por secret/flag manual; deben saltarse limpiamente si faltan secrets.
- Evidencia de provider es input no confiable; no se trata como verdad. El objetivo es medir comportamiento, no fijar hechos.
- No enviar PII (email/teléfono/datos personales) a providers; el prompt pack usa solo datos de marca/categoría delimitados como dato, nunca como instrucción (anti prompt-injection).
- Outputs son hipótesis calibradas, no contrato congelado: 1226/1227 los consumen y pueden refinarlos con su propia evidencia.

## Normative Docs

- `~/.claude/skills/seo-aeo/` — skill SEO+AEO/GEO (conocimiento de dominio detrás del grader): método de Share of Voice IA (`modules/07_MEASUREMENT.md`), Query Fan-Out + prompt research (`modules/04_AEO_GEO.md`), matriz de fan-out (`templates/fan-out-matrix.md`), mapeo 7-dimensiones↔módulos (`efeonce/AI_VISIBILITY_GRADER.md`). Este spike ES la versión manual de ese método de SoV.
- `docs/context/00_INDEX.md`, `docs/context/02_gtm.md`, `docs/context/03_ecosistema-producto.md` — encuadre GTM/producto antes de elegir marcas/prompts.

## Dependencies & Impact

### Depends on

- Docs de arquitectura/ADR/dominio del grader (ya aceptados, arriba).
- Acceso opcional a providers solo para el spike (local/low-volume): OpenAI Responses API con web search, Perplexity Sonar, Gemini API con Google Search grounding. Si faltan, el slice de captura se salta limpio y se documenta.

### Blocks / Impacts

- **Bloquea `TASK-1227`** (normalization + scoring): los pesos del score, el modelo de varianza/muestreo, la decisión de extracción y el golden eval set V1 deben salir de este spike antes de congelar `ai_visibility_score_v1`.
- **Informa `TASK-1226`** (provider adapter foundation): aporta el cost ceiling por modo y el prompt pack V1 que el smoke/eval harness (Slice 5 de 1226) debe usar en vez de inventar; el contract skeleton/policy/fake (Slices 1–2 de 1226) pueden avanzar en paralelo.
- Impacta el contrato de score del arch doc: si la calibración revela que los pesos/dimensiones no discriminan, este spike propone el ajuste (drift documentado).

### Files owned

Paths esperados; el agente verifica patrones reales en Discovery:

- `scripts/growth/ai-visibility-spike/**` `[verificar]` — harness throwaway (run del prompt pack, captura de evidencia bounded, parsers de prueba). Local/manual, no productivo.
- `scripts/growth/ai-visibility-spike/prompt-pack.v1.json` `[verificar]` — prompt pack V1 borrador versionado.
- `scripts/growth/ai-visibility-spike/golden-set.v1.json` `[verificar]` — golden eval set V1 (inputs + expected normalized findings) para que `TASK-1227` lo promueva a `src/lib/growth/ai-visibility/evals/**`.
- `docs/architecture/GREENHOUSE_AI_VISIBILITY_GRADER_CALIBRATION_V1.md` `[verificar]` — findings: discriminación de dimensiones, pesos recomendados, varianza, costo/run, recomendación de extracción.
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — solo si la calibración descubre drift de pesos/dimensiones (proponer update, no rewrite).

## Current Repo State

### Already exists

- Arquitectura V1 + ADR + dominio `growth` aceptados; define 7 dimensiones/pesos, prompt families, execution modes y cost concerns.
- `TASK-1226` y `TASK-1227` creadas como foundation (adapters) y motor (normalization+scoring).
- Skill `seo-aeo` con el método manual de SoV IA y la matriz de fan-out, reutilizable como base del harness.

### Gap

- No existe evidencia empírica de que las 7 dimensiones/pesos discriminen marcas reales.
- No existe medición de varianza run-to-run ni estrategia de muestreo/confianza para el score.
- No existe costo/run real por modo ni un cost ceiling para el diseño público.
- No existe prueba de la dificultad de extracción brand-mention (supuesto determinista-first sin validar).
- No existe prompt pack V1 ni golden eval set versionados.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `spike` (discovery; no productized backend).
- Impacto principal: `integration` (llamadas low-volume a providers IA durante el spike; sin integración productiva).
- Source of truth afectado: ninguno productivo. Outputs = artefactos versionados (prompt pack, golden set, calibration doc) que `TASK-1226/1227` consumen.
- Consumidores afectados: `TASK-1226` (cost ceiling + prompt pack), `TASK-1227` (pesos + varianza + extracción + golden set), arch doc (posible ajuste de pesos).
- Runtime target: `local` only; sin staging/prod, sin persistencia runtime.

### Contract surface

- Contrato existente a respetar: dimensiones/pesos y `ProviderObservation`/`NormalizedFinding` semantics del arch doc (este spike los EJERCITA y, si hace falta, propone ajuste basado en evidencia).
- Contrato nuevo o modificado: ninguno productivo. Produce un **schema de golden eval set** (inputs + expected findings) que `TASK-1227` adopta, y un **prompt pack V1 schema** que 1226/1227 consumen.
- Backward compatibility: `not applicable` — no hay runtime que romper.
- Full API parity: N/A — spike no expone endpoints. Los hallazgos alimentan los primitives server-side que 1226/1227 sí construyen con parity.

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna (sin DB). Fixtures en disco bajo `scripts/growth/ai-visibility-spike/`.
- Invariantes que no se pueden romper:
  - Evidencia de provider = input medido, no verdad; los findings esperados del golden set se curan por humano, no se auto-aceptan del LLM.
  - El golden set preserva `unknown` donde la evidencia es insuficiente (no se inventan rankings/competidores).
  - Pesos recomendados deben venir con evidencia (discriminación observada), no con opinión.
  - Raw provider text no se commitea sin acotar; solo excerpts bounded + métricas. Nada de secrets en repo.
- Tenant/space boundary: marcas del golden set son públicas/propias; sin datos de clientes Greenhouse productivos.
- Idempotency/concurrency: el harness debe poder re-correr un prompt N veces (es justo el experimento de varianza); cada corrida etiquetada por timestamp/seed para trazar.
- Audit/outbox/history: N/A — spike local. El golden set y la calibración quedan versionados en git como trazo.

### Migration, backfill and rollout

- Migration posture: `none` — sin schema.
- Default state: N/A — sin flags productivos; el harness usa keys locales manualmente.
- Backfill plan: N/A.
- Rollback path: revert PR (docs/fixtures/scripts only); sin estado productivo que revertir.
- External coordination: provisionar keys de provider SOLO en entorno local para el spike (`OPENAI_API_KEY`, `PERPLEXITY_API_KEY`, `GEMINI_API_KEY`); NO en Vercel/GCP, NO como requisito de cierre si se documenta el skip.

### Security and access

- Auth/access gate: spike local; sin endpoint expuesto.
- Sensitive data posture: NO enviar PII a providers; marcas/categoría solo. Keys solo en env local, nunca commiteadas; el harness lee de env, no de archivo trackeado.
- Error contract: el harness degrada honesto (provider caído → marca skip + sigue), no inventa datos.
- Abuse/rate-limit posture: low-volume por diseño (golden set acotado + caps de prompts/providers); el experimento de varianza limita N por prompt.

### Runtime evidence

- Local checks: el harness corre con keys presentes y se salta limpio sin ellas; parsers de extracción tienen tests sobre la evidencia capturada.
- DB/runtime checks: N/A (sin DB).
- Integration checks: corrida low-volume real por provider, documentando costo/latencia/citations observadas.
- Reliability signals/logs: N/A productivo; el harness loggea intento/skip/costo localmente para el reporte.
- Production verification sequence: N/A — sin producción.

### Acceptance criteria additions

- [ ] Outputs (prompt pack, golden set, calibration doc) con paths reales y versionados.
- [ ] Invariantes de evidencia≠verdad, `unknown` preservado y no-PII-a-providers explícitos en el harness/fixtures.
- [ ] Posture de migración/rollback (none/revert) declarada.
- [ ] Evidencia de las corridas reales (costo/varianza) registrada en el doc, o skip documentado si faltan secrets.
- [ ] Sin secrets ni raw payloads sin acotar en el repo.

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

### Slice 1 — Prompt pack V1 borrador + mapa de fan-out

- Producir `prompt-pack.v1.json` con 12–20 prompts es-CL, cada uno etiquetado por familia de intent (awareness/problem-aware/consideration/comparison/trust/purchase-intent/local/enterprise/risk-reputation, per arch §8.1) y tipo de Query Fan-Out (relacionada/comparativa/implícita/reciente).
- Definir el golden brand set: Efeonce + 2–3 competidores + 2 marcas neutras + 1 cliente Globe (per arch §16), con su perfil mínimo (marca/web/país/categoría/competidores declarados).
- Reutilizar `seo-aeo/templates/fan-out-matrix.md` como herramienta de diseño del pack.

### Slice 2 — Harness de corrida multi-provider + captura de evidencia bounded

- `scripts/growth/ai-visibility-spike/run.mjs` que corre el prompt pack contra OpenAI/Perplexity/Gemini para el golden set, low-volume, gated por secret/flag manual, skippable sin keys.
- Capturar `ProviderObservation`-like (status/excerpt bounded/citations/usage/latency) a fixtures locales; raw completo gitignored, excerpts bounded commiteables.
- Degradación honesta: provider caído → skip + continúa, nunca inventa.

### Slice 3 — Discriminación de dimensiones + calibración de pesos

- Sobre la evidencia capturada, evaluar manualmente (humano-en-el-loop) si las 7 dimensiones separan marca fuerte vs débil.
- Recomendar pesos (validar 25/15/15/15/15/10/5 o proponer revisión) con evidencia de discriminación.
- Escribir la sección de calibración en `GREENHOUSE_AI_VISIBILITY_GRADER_CALIBRATION_V1.md`.

### Slice 4 — Varianza run-to-run + costo/run

- Correr un subconjunto del prompt pack N=3–5 veces por provider; medir el swing del finding/score por dimensión.
- Recomendar estrategia de muestreo (N corridas, reporte de rango/confianza en vez de punto) y la implicación para el framing "determinista" (aggregation determinista sobre evidencia muestreada).
- Medir costo/run por modo (`light` 1–2 providers / `full` 3) y recomendar un **cost ceiling** para el diseño público. Documentar en el calibration doc.

### Slice 5 — Probe de extracción brand-mention + golden eval set V1

- Probar extracción determinista (parse de prosa) vs extracción LLM sobre la evidencia capturada para brand-mention/rank/competidores/sentiment.
- Recomendar determinista-first vs LLM-primary (con costo/precisión observados) para `TASK-1227`.
- Curar y versionar `golden-set.v1.json` (inputs + expected normalized findings, con `unknown` donde corresponde) como baseline de regresión para `TASK-1227`.

## Out of Scope

- Provider adapters productivos / contract skeleton / policy resolver (eso es `TASK-1226`).
- Schema `greenhouse_growth`, persistencia, readers/commands productivos.
- Scoring engine productivo, normalizer productivo (eso es `TASK-1227`).
- Public landing/form/report, admin UI.
- HubSpot properties/sync/handoff.
- Nexa/MCP exposure.
- Provisioning de secrets en Vercel/GCP como requisito de cierre.

## Detailed Spec

### Golden brand set (criterio)

Mínimo viable para discriminar: 1 marca fuerte conocida en su categoría, 1 débil/nueva, 2–3 competidores directos de Efeonce, 2 neutras fuera del nicho (control), 1 cliente Globe (caso real internacional). El objetivo es que las dimensiones separen visiblemente fuerte vs débil; si no separan, el peso/dimensión está mal definido.

### Prompt pack V1 (forma)

Mirror de arch §8.1. Cada prompt: `{ id, family, fanOutType, intentStage, locale, market, text }`. El `text` interpola marca/categoría como **dato delimitado** (no instrucción). 12–20 prompts; arranca chico, no universo genérico.

### Golden eval set V1 (forma)

Por cada `(prompt, brand, provider)` curado: `{ input, expectedFinding }` donde `expectedFinding` sigue el shape `NormalizedFinding` de `TASK-1227` (brandMentioned/brandRank/competitorsMentioned/sentiment/citationDomains/sourceTypes/commercialIntentMatch/confidence), con `unknown` donde la evidencia no alcanza. Curado por humano, no auto-derivado del LLM.

### Qué decide este spike (entradas a 1226/1227)

- Pesos recomendados de `ai_visibility_score_v1` (→ 1227 Slice 3).
- Estrategia de muestreo + framing de confianza/varianza (→ 1227 Slices 4–5 + arch §15).
- Determinista-first vs LLM-primary para extracción (→ 1227 Slice 2).
- Cost ceiling por modo + prompt count viable (→ 1226 provider policy/caps + arch §17).
- Prompt pack V1 + golden set (→ 1226 smoke Slice 5 + 1227 evals Slice 5).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (prompt pack + golden set) → Slice 2 (harness + captura) → Slice 3 (discriminación/pesos) → Slice 4 (varianza/costo) → Slice 5 (extracción + golden eval set).
- Slice 2 requiere Slice 1 (necesita el pack y el brand set).
- Slices 3–5 consumen la evidencia capturada en Slice 2; si Slice 2 se salta por falta de secrets, 3–5 se documentan como "pendiente de captura real" y el spike cierra como `parcial` (no `complete`) hasta correr la captura.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Costo de providers durante el spike | integrations.ai / cost | medium | golden set acotado, low-volume, caps de prompts/providers, N de varianza limitado, corrida manual | costo/run registrado en el doc; abortar si excede presupuesto del spike |
| Secrets de provider filtrados a repo/logs | security | low | keys solo en env local, harness lee de env, raw payloads gitignored, solo excerpts bounded commiteados | revisión de `git status`/grep de keys antes de commit |
| PII enviada a providers | privacy | low | prompt pack usa solo marca/categoría; sin email/teléfono; review del pack | review humano del prompt pack pre-corrida |
| Conclusión de pesos sobre evidencia insuficiente | data quality / public trust | medium | brand set con fuerte/débil/control explícitos; preservar `unknown`; documentar tamaño de muestra y su límite | calibration doc declara confianza/limitación de la muestra |
| El spike se trata como contrato congelado | process | low | declarar outputs como hipótesis calibradas que 1226/1227 pueden refinar | Delta en 1226/1227 referencia este spike como input, no como verdad final |

### Feature flags / cutover

Sin flags productivos — additive, sin cutover. El harness usa keys de provider locales manualmente; si faltan, salta. No introduce estado productivo.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR (prompt pack/brand set, fixtures only) | <5 min | si |
| Slice 2 | revert PR (harness + fixtures); sin estado productivo | <5 min | si |
| Slice 3 | revert sección del calibration doc | <5 min | si |
| Slice 4 | revert sección del calibration doc | <5 min | si |
| Slice 5 | revert golden set + recomendación de extracción | <5 min | si |

### Production verification sequence

N/A — spike local sin producción. La "verificación" es: el calibration doc tiene cifras reales (o skip documentado), el golden set es schema-válido y curado, y los pesos recomendados vienen con evidencia. Producción del grader queda fuera (1226/1227 y tasks posteriores).

### Out-of-band coordination required

- Provisionar keys de provider SOLO en entorno local del agente para el spike (OpenAI/Perplexity/Gemini). NO en Vercel/GCP.
- Si no hay keys, el spike puede cerrar `parcial` con el prompt pack + golden set + diseño del harness, y dejar la captura/calibración real como follow-up cuando haya keys. Documentar el skip.
- Sin cambios en HubSpot, public-site, ni legal/privacy (no ship público).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Existe `prompt-pack.v1.json` con 12–20 prompts etiquetados por familia de intent + tipo de fan-out, mercado es-CL, e interpolación de marca como dato delimitado.
- [ ] Existe el golden brand set definido (fuerte/débil/competidores/neutras/Globe) con perfil mínimo.
- [ ] Existe el harness `scripts/growth/ai-visibility-spike/run.mjs` que corre multi-provider low-volume y se salta limpio sin secrets.
- [ ] El calibration doc declara si las 7 dimensiones discriminan y recomienda pesos con evidencia (validados o revisados).
- [ ] El calibration doc reporta varianza run-to-run + estrategia de muestreo/confianza recomendada + framing de determinismo ajustado.
- [ ] El calibration doc reporta costo/run por modo y recomienda un cost ceiling.
- [ ] El doc recomienda determinista-first vs LLM-primary para extracción, con evidencia observada.
- [ ] Existe `golden-set.v1.json` curado (inputs + expected findings, `unknown` donde aplica) listo para `TASK-1227`.
- [ ] Sin secrets ni raw payloads sin acotar en el repo; no se envió PII a providers.
- [ ] Si faltaron secrets, el cierre es `parcial` con el skip documentado, no `complete`.

## Verification

- `pnpm task:lint --task TASK-1228`
- `pnpm ops:lint --changed`
- `pnpm lint`
- `pnpm typecheck`
- Tests focales de los parsers de extracción del harness (si se implementan en TS).
- Corrida real low-volume del harness por provider con keys locales (o skip documentado).
- `git status` / grep de keys antes de cualquier commit (no secrets, no raw payload sin acotar).
- `pnpm docs:closure-check` al cerrar si se actualiza arquitectura/handoff.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete`/`parcial` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `docs/tasks/TASK_ID_REGISTRY.md` quedo sincronizado si cambia el estado
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre `TASK-1226` y `TASK-1227` (propagar pesos/cost ceiling/extracción/golden set a sus specs)
- [ ] los hallazgos (pesos, varianza, costo, extracción) quedaron propagados a `TASK-1227` (y cost ceiling a `TASK-1226`) como inputs concretos, no como referencia vaga

## Follow-ups

- `TASK-1227` adopta el golden set V1 en `src/lib/growth/ai-visibility/evals/**` y congela `ai_visibility_score_v1` con los pesos calibrados.
- `TASK-1226` usa el cost ceiling + prompt pack V1 en su provider policy/caps y smoke harness.
- Si la calibración revela drift de pesos/dimensiones, proponer update al arch doc del grader.
- Eval regression automation (prompt pack eval) como task posterior, una vez el motor exista.

## Open Questions

1. ¿El golden set V1 debe incluir un cliente Globe real (datos de marca pública) o usar una marca enterprise neutra como proxy para evitar exponer relación comercial?
2. ¿La corrida de varianza usa el mismo prompt repetido N veces, o también varía phrasing para medir sensibilidad al wording (dos experimentos distintos)?
3. ¿El cost ceiling se fija por run público o por presupuesto diario/mensual agregado (condiciona el diseño del free-tier en tasks posteriores)?
