# TASK-1991 — Efeonce Insights: visibilidad en IA por motor (lugar, cita, tono, Share of Voice y plataforma citada)

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
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `reader`
- Epic: `EPIC-045`
- Status real: `Diseño; inventario de tarjetas con isotipo aprobado por el operador el 2026-10-03`
- Rank: `TBD`
- Domain: `data`
- Blocked by: `TASK-1424` (desglose por motor en el informe del Grader), `TASK-1961` (adapter AEO por mercado, mismo archivo), `TASK-1990` (plataformas citadas como canal)
- Branch: `Greenhouse develop; sin worktrees ni rama por task`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Hoy el informe de Insights trae por motor de IA sólo la mención de la marca (`mention_rate.<proveedor>`); el lugar
de la marca en la respuesta, las citas con enlace al sitio, el tono y el Share of Voice llegan como un total de todos
los motores, y los sitios más citados llegan como dominios sin plataforma. Esta task convierte esas cuatro cifras en
hechos por motor, con el isotipo de cada motor (ChatGPT, Gemini, Claude, Perplexity, AI Overview), y marca como
plataforma (YouTube, Reddit, Wikipedia, LinkedIn) a los dominios citados que lo son, para que el informe muestre el
tablero de motores aprobado el 2026-10-03.

## Why This Task Exists

El inventario aprobado (tablero `Cifras-Canal-Inventario` del canvas
<https://claude.ai/artifact/9q7nThMhdphN5j8f3K3cbB>) clasifica cinco cifras AEO como «existe, no llega a Insights»:

- **Lugar en la respuesta:** `brandRank` existe por respuesta y motor en `NormalizedFinding`
  (`src/lib/growth/ai-visibility/normalization/contracts.ts`); el informe sólo lo resume en `PositionSummary` total
  (`src/lib/growth/ai-visibility/report/contracts.ts`) y el adapter AEO no lo emite.
- **Cita con enlace al sitio:** `citationDomains` por respuesta; el adapter emite `citation_share` total.
- **Tono positivo:** `sentimentLabel` por respuesta; el adapter emite `sentiment.<tono>` total.
- **Share of Voice:** `competitorsMentioned` por respuesta; el adapter emite `sov.*` total.
- **Plataforma citada:** `cited_source.<n>` ya trae el dominio y los motores que lo citan
  (`CitationSourceDomain.engines`), pero no su plataforma.

El dueño del desglose por motor es el informe del Grader: TASK-1424 lo construye en el builder para Share of Voice y
recibe en su Delta 2026-10-03 el mismo desglose para lugar, cita y tono. Esta task es el consumidor de Insights: no
recalcula nada que el Grader no entregue.

## Goal

- El adapter AEO emite por motor: lugar promedio, % de respuestas que enlazan al sitio, % de respuestas en tono
  positivo y Share of Voice, cada uno con `channelId` del motor, numerador y denominador, y comparación con el período
  anterior cuando existe.
- Los dominios citados que son plataforma llevan su `channelId` (vía `channelForDomain` de TASK-1990).
- Con varios mercados (TASK-1961) cada hecho por motor es también por país; nunca un promedio entre países.
- El contrato de contenido reconoce cada hecho nuevo y sube de versión.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_INSIGHTS_ARCHITECTURE_V1.md` (§2 reutilización, §15 contrato de contenido)
- `docs/architecture/EFEONCE_INSIGHTS_CHART_SELECTION_CRITERIA_V1.md` (§5.1 dirección declarada: el lugar en la
  respuesta es «menor es mejor»)
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` (proyecciones leak-safe del informe)
- `.claude/rules/efeonce-insights.md` y la skill `efeonce-insights`

Reglas obligatorias:

- El adapter consume sólo `readClientGraderReport` (o el reader por mercado de TASK-1961); nunca findings crudos ni
  `providerFindings`, que son internos.
- Un motor sin respuestas evaluables en la ventana no produce hecho: se declara rechazo con causa, nunca 0 %.
- Share of Voice por motor usa la misma definición que el total vigente (menciones contra menciones, TASK-1959); sin
  competidores con menciones en ese motor, no hay hecho.
- El lugar en la respuesta es un promedio de las respuestas donde la marca aparece rankeada; declara el número de
  respuestas rankeadas como denominador y su dirección «menor es mejor».
- Ningún hecho promedia mercados.

## Normative Docs

- `docs/tasks/to-do/TASK-1424-aeo-sov-per-engine-model-foundation.md` (dueña del desglose por motor en el informe)
- `docs/tasks/to-do/TASK-1961-efeonce-insights-aeo-per-market.md`
- `docs/tasks/to-do/TASK-1959-aeo-grader-competitive-sov-scoring-fix.md`
- `docs/tasks/in-progress/TASK-1962-efeonce-insights-report-content-contract.md`

## Dependencies & Impact

### Depends on

- `TASK-1424`: `ClientGraderReport` con desglose por motor (Share of Voice y, por su Delta 2026-10-03, lugar, cita y
  tono).
- `TASK-1961`: adapter AEO v3 con dimensión de mercado (`src/lib/efeonce-insights/adapters/aeo-adapter.ts`).
- `TASK-1990`: `channelForDomain` y plataformas en `INSIGHT_CHANNEL_IDS`.

### Blocks / Impacts

- `TASK-1996`: el tablero de motores con isotipo se verifica con datos reales de esta task.
- `TASK-1903`: el agente redactor recibe hechos por motor para su lectura.
- `TASK-1958`: la jerarquía apta para cliente muestra el tablero de motores.

### Files owned

- `src/lib/efeonce-insights/adapters/aeo-adapter.ts` (después de TASK-1961)
- `src/lib/efeonce-insights/adapters/adapters.test.ts`
- `src/lib/efeonce-insights/presentation/content-contract.ts` (reglas y versión)
- `src/lib/efeonce-insights/editorial/criterion-figures.ts` (tablero de motores)
- `src/lib/copy/insights.ts` (nombres y contexto de las cifras por motor)

## Current Repo State

### Already exists

- Hechos AEO actuales en `src/lib/efeonce-insights/adapters/aeo-adapter.ts`: `overall_score`, `dimension.*`,
  `mention_rate.<proveedor>` con `channelId`, `share_of_model`, `sov.brand`/`sov.<competidor>`, `citation_share`,
  `cited_source.<n>` (dominio, clasificación y rango), `source_type.<tipo>` y `sentiment.<tono>`.
- `channelForAeoProvider` (proveedor del Grader → canal) en `src/lib/efeonce-insights/contracts/channels.ts`.
- `PositionSummary`, `CitationInsight`, `SentimentSummary`, `CompetitiveShareOfVoice` y `CitationSourceDomain.engines`
  en `src/lib/growth/ai-visibility/report/contracts.ts`.
- Reglas `CONTENT_METRIC_RULES` y `CONTENT_CONTRACT_VERSION = 'content_contract_v4'` en
  `src/lib/efeonce-insights/presentation/content-contract.ts`.

### Gap

- El informe del Grader no entrega lugar, cita, tono ni Share of Voice por motor (TASK-1424).
- El adapter no emite esos hechos, ni el lugar promedio en total.
- Los dominios citados no llevan plataforma.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `src/lib/efeonce-insights/adapters/aeo-adapter.ts` y editorial del planner, en el runtime del portal y del ops-worker
- Future candidate home: `domain-package`
- Boundary: el informe cliente del Grader (`readClientGraderReport` o el reader por mercado) es la única fuente; Insights mapea a hechos y el planner arma el tablero
- Server/browser split: adapter server-only; contrato de contenido y planner sin I/O
- Build impact: `none`
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `reader`
- Source of truth afectado: `informe cliente del AI Visibility Grader por run y mercado (greenhouse_growth.grader_runs y findings normalizados, vía reader dueño)`
- Consumidores afectados: `plan editorial, modelo web (Think), PDF/deck, lanes y MCP de Insights, agente redactor`
- Runtime target: `Vercel + ops-worker (generación y recurrencias) + Job artifact-worker (render)`

### Contract surface

- Contrato existente a respetar: `EvidenceFactV1`, `aeo_report_adapter` (versión vigente tras TASK-1961), `ClientGraderReport`
- Contrato nuevo o modificado: hechos `rank.<proveedor>`, `citation_rate.<proveedor>`, `sentiment_positive.<proveedor>`, `sov_engine.<proveedor>`, `rank` total y `channelId` de plataforma en `cited_source.<n>`; nombres finales se fijan en Discovery con la misma raíz en el contrato de contenido
- Backward compatibility: `compatible` — hechos aditivos; snapshots sellados no cambian
- Full API parity: `los hechos viajan por el contrato de evidencia; lanes y MCP los exponen sin endpoint nuevo`

### Data model and invariants

- Entidades/tablas/views afectadas: `ninguna tabla nueva; lectura del informe del Grader`
- Invariantes que no se pueden romper:
  - cada hecho por motor cita su run (`evidenceRef`) y su mercado;
  - un motor sin respuestas evaluables no produce hecho (rechazo con causa);
  - el lugar promedio sólo cuenta respuestas rankeadas y declara su denominador;
  - Share of Voice por motor y total usan la misma definición;
  - ningún promedio entre mercados ni entre motores se presenta como cifra de un motor.
- Write-target allowlist: `N/A — sólo lectura`
- Tenant/space boundary: `perfil del Grader de la organización autorizada por Insights`
- Idempotency/concurrency: `determinista sobre los runs seleccionados por ventana`
- Audit/outbox/history: `sin eventos nuevos; el snapshot sellado es el registro`

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `enabled with rationale — aditivo detrás de INSIGHTS_EDITORIAL_V2_ENABLED; ediciones nuevas`
- Backfill plan: `ninguno`
- Rollback path: `revert + redeploy`
- External coordination: `release del Grader con TASK-1424 antes o junto con esta task`

### Security and access

- Auth/access gate: `sin cambio`
- Sensitive data posture: `sin narrativa cruda por motor; sólo conteos ya público-safe del informe cliente`
- Error contract: `rechazos del adapter con causa; captureWithDomain(err, 'insights', …)`
- Abuse/rate-limit posture: `N/A — sin superficie nueva`

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/efeonce-insights src/lib/growth/ai-visibility`
- DB/runtime checks: `preview-edition --editorial-v2 --plan-only` de Berel (un mercado) y Sky (siete mercados)
- Integration checks: `tablero de motores en el plan con canal por celda y context`
- Reliability signals/logs: `rechazos por motor en rejections del snapshot`
- Production verification sequence: `ver Rollout Plan & Risk Matrix`

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se completa al final. Esta task no crea tablas.
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
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Hechos por motor

- Lugar promedio (total y por motor), % de respuestas con enlace al sitio, % en tono positivo y Share of Voice por
  motor, desde el desglose del informe (TASK-1424), con `channelId`, numerador, denominador y comparación.
- Rechazo con causa para el motor sin respuestas evaluables.

### Slice 2 — Plataforma citada

- `cited_source.<n>` lleva `channelId` cuando `channelForDomain` reconoce la plataforma; hecho de conteo por
  plataforma (`cited_platform.<plataforma>`) con los motores que la citan.

### Slice 3 — Contrato de contenido, planner y verificación

- Reglas nuevas en `CONTENT_METRIC_RULES` (lugar, cita y tono → `outcome`; Share of Voice por motor → `competition`;
  plataforma citada → `drivers`), veredictos sin cambio de pregunta y `CONTENT_CONTRACT_VERSION` subido.
- `criterion-figures.ts`: tablero de motores (canal por celda) por indicador, sin repetir la mención en dos figuras.
- Vista previa real de Berel y Sky con el resumen de tableros.

## Out of Scope

- Calcular el desglose por motor en el Grader (TASK-1424) o cambiar la fórmula del Share of Voice (TASK-1959).
- Dimensión de mercado (TASK-1961).
- Render del isotipo (TASK-1996).

## Detailed Spec

| Cifra (tablero) | Hecho | Unidad | Dirección | `context` |
|---|---|---|---|---|
| Mención de la marca | `mention_rate.<proveedor>` (existe) | % | más es mejor | «de las respuestas menciona la marca» |
| Lugar en la respuesta | `rank.<proveedor>` | posición | menor es mejor | «lugar promedio cuando aparece» |
| Cita con enlace al sitio | `citation_rate.<proveedor>` | % | más es mejor | «de las respuestas enlaza al sitio» |
| Tono positivo | `sentiment_positive.<proveedor>` | % | más es mejor | «de las respuestas en buen tono» |
| Share of Voice | `sov_engine.<proveedor>` | % | más es mejor | «de las menciones de la categoría» |
| Plataforma citada | `cited_platform.<plataforma>` | citas | sin dirección | «citas a esa plataforma» |

Copy final validado con `greenhouse-ux-writing` antes de escribir `GH_INSIGHTS`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- TASK-1424 y TASK-1961 en develop antes de Slice 1. Slice 1 → Slice 2 → Slice 3.
- El contrato de contenido se actualiza en el mismo commit que el hecho que lo necesita (gate `expectContentContract`).

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Porcentaje sobre una base de 1–2 respuestas | data / lectura | high | denominador visible y umbral mínimo declarado en el planner | lectura de la vista previa |
| Share of Voice por motor con definición distinta al total | data | medium | depender del builder de TASK-1424 alineado con TASK-1959 | test de consistencia por motor |
| Promedio implícito entre mercados | plan / render | medium | hechos por mercado y gate de TASK-1961 | tests del adapter |
| Hecho emitido sin regla de contenido | contrato | low | `expectContentContract` en `adapters.test.ts` | test rojo |

### Feature flags / cutover

- Sin flag propio: aditivo detrás de `INSIGHTS_EDITORIAL_V2_ENABLED` (ON).

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert; vuelven los totales | < 15 min | si |
| Slice 2 | revert; dominios sin plataforma | < 15 min | si |
| Slice 3 | revert de reglas y planner | < 15 min | si |

### Production verification sequence

1. Local: vista previa de Berel y Sky.
2. Staging: edición interna; el operador revisa el tablero de motores.
3. Producción por el control plane; edición interna revisada antes de compartir.

### Out-of-band coordination required

- Release del Grader con TASK-1424.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El adapter AEO emite lugar promedio, cita con enlace, tono positivo y Share of Voice por motor con `channelId`, numerador y denominador (test con fixture de tres motores).
- [ ] Un motor sin respuestas evaluables no produce hecho y deja un rechazo con causa (test).
- [ ] `rank.*` declara dirección «menor es mejor» y cuenta sólo respuestas rankeadas (test).
- [ ] Los dominios youtube.com, reddit.com y wikipedia.org citados llevan su `channelId` de plataforma (test).
- [ ] Con siete mercados, cada hecho por motor lleva su mercado y ninguna cifra promedia países (test).
- [ ] `CONTENT_CONTRACT_VERSION` sube y `content-contract.test.ts` y `adapters.test.ts` pasan.
- [ ] La vista previa de Sky o Berel muestra el tablero de motores con canal por celda; el resumen queda en la task.

## Verification

- `pnpm typecheck`
- `pnpm vitest run src/lib/efeonce-insights src/lib/growth/ai-visibility`
- `pnpm test` (suite completa al cierre)
- `scripts/insights/preview-edition.ts --editorial-v2` con Berel y Sky
- `pnpm task:lint --task TASK-1991`, `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Skill `efeonce-insights` actualizada y espejada a `.codex/`.

## Follow-ups

- Umbral mínimo de respuestas por motor para mostrar un porcentaje: si el operador lo quiere distinto por indicador,
  se declara en el criterio de selección.

## Open Questions

- ¿Lugar en la respuesta se muestra si la marca aparece rankeada en menos de 3 respuestas de un motor? Propuesta: no;
  queda el hallazgo con el conteo.
