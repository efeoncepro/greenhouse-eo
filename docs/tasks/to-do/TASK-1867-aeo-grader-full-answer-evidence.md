# TASK-1867 — AEO Grader: evidencia completa de cada respuesta (medir sobre el texto íntegro, no sobre 600 caracteres)

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
- Backend impact: `migration`
- Epic: `EPIC-020`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `growth`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

El AI Visibility / AEO Grader mide la presencia de marcas y competidores sobre **los primeros 600 caracteres** de cada
respuesta de los motores de IA: es lo único que persiste. Una marca nombrada más abajo en una respuesta larga no
existe para el score, el share of voice ni la extracción de tono. Esta task persiste el texto íntegro de cada
respuesta como evidencia, hace que la normalización y la extracción trabajen sobre él y versiona el score para que
nunca se compare una medición de 600 caracteres con una de texto completo.

## Why This Task Exists

Medido el 2026-09-11 en el primer panel competitivo real (SKY frente a LATAM, JetSMART, Avianca y Gol, runs
`EO-GRUN-00050`…`00054`, 300 observaciones):

1. **Todas las respuestas quedaron recortadas.** Consulta 2026-09-11 sobre las 300 observaciones: 255 miden exactamente
   600 caracteres, las 45 restantes entre 593 y 599 y ninguna queda por debajo; es decir, ninguna respuesta cupo entera. El tope es `GROWTH_AI_VISIBILITY_EXCERPT_MAX = 600`
   (`src/lib/growth/ai-visibility/contracts.ts:210`), aplicado por `boundedExcerpt`
   (`src/lib/growth/ai-visibility/observation.ts:22`) en los dos adapters que producen texto:
   `providers/web-search-adapter.ts:140` (OpenAI, Anthropic, Perplexity, Gemini) y
   `providers/google-ai-overview-adapter.ts:496`.
2. **El texto completo existe y se descarta.** El adapter calcula `answerTextHash` sobre el texto completo
   (`web-search-adapter.ts:139`) y lo tira: `rawEvidencePointer` queda `null` (`web-search-adapter.ts:144`). El contrato
   (`contracts.ts:186-187`) ya decía que ese puntero debía apuntar al payload completo en almacenamiento; nunca se
   implementó. Consulta 2026-09-11: `raw_evidence_pointer` nulo en las 300 observaciones.
3. **Todo lo que se mide depende del extracto.** El normalizer cuenta marca y competidores sobre `answerExcerpt`
   (`normalization/normalizer.ts:104,166`) y la extracción de prosa con LLM también
   (`normalization/llm-extraction.ts:39`). Resultado en el caso Sky: Gol 0% y Avianca 6% de presencia en respuestas
   de descubrimiento; con listas largas, esas cifras pueden estar subcontadas y no hay forma de recontarlas.
4. **Ya se usa en venta.** Los informes se entregan a clientes y prospectos (caso Sky, 2026-09-11). El límite hoy se
   declara como advertencia en cada entrega; no debería existir.

## Goal

- Cada observación exitosa persiste su texto íntegro, verificable contra `answer_text_hash`.
- Normalización (presencia, competidores, rank) y extracción de prosa operan sobre el texto íntegro.
- Score nuevo `ai_visibility_score_v3`: la tendencia nunca compara v3 con v2 y los informes declaran la versión.
- `answer_excerpt` sigue existiendo acotado para UI, informes y MCP (contenido de terceros no confiable).
- Retención definida para el texto íntegro.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — §7.4 (`provider_observation`),
  §7.5–7.6, §8.3 (normalización), §14.2–14.3 (datos y prompt injection), §17 (costo), Delta 2026-09-11.
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`

Reglas obligatorias:

- **Evidencia append-only:** el texto íntegro se escribe una vez por observación y no se edita.
- **El score no mezcla ventanas:** todo cambio de ventana de medición es cambio de `score_version`.
- **El texto íntegro no sale del backend:** UI, informes, correo y MCP siguen recibiendo el extracto acotado.
- **Nunca puntuar a mano desde Vercel:** la extracción de prosa corre en el `ops-worker`.

## Normative Docs

- `docs/manual-de-uso/growth/ai-visibility-grader-smoke.md` § "Panel competitivo multi-marca" (límites vigentes)
- `docs/documentation/growth/ai-visibility-grader.md` § "Límites conocidos"
- CLAUDE.md § "Database — Migration markers"

## Dependencies & Impact

### Depends on

- `TASK-1226` / `TASK-1227` / `TASK-1390` (complete) — adapters, normalizer y score v2.

### Blocks / Impacts

- `TASK-1861` — su tool de evidencia sigue devolviendo el extracto acotado; el análisis cruzado del panel (Delta d) se
  calcula sobre el texto íntegro.
- `TASK-1863` — la foto de matching por run y los alias se aplican sobre el texto íntegro.
- `TASK-1717` — la superficie de consumidor también persiste su texto íntegro.
- Informes y tendencias existentes: quedan en v2, marcados no comparables con v3.

### Files owned

- `migrations/<timestamp>_task-1867-grader-observation-bodies.sql` (vía `pnpm migrate:create`)
- `src/lib/growth/ai-visibility/observation.ts`
- `src/lib/growth/ai-visibility/providers/{web-search-adapter,google-ai-overview-adapter,observation-builders}.ts`
- `src/lib/growth/ai-visibility/store.ts` (persistencia y lectura del texto íntegro)
- `src/lib/growth/ai-visibility/normalization/{normalizer,llm-extraction}.ts`
- `src/lib/growth/ai-visibility/scoring/config.ts` (`AI_VISIBILITY_SCORE_VERSION`)
- `src/lib/reliability/queries/growth-ai-visibility-observation-body-coverage.ts` (nuevo)

## Current Repo State

### Already exists

- Hash del texto completo (`answer_text_hash`) y columna `raw_evidence_pointer` en `greenhouse_growth.provider_observations`
  (columnas verificadas en `information_schema` el 2026-09-11).
- Tendencia que ya marca `incomparable` entre versiones de score (`report/trend.ts`).

### Gap

- Ningún lugar guarda el texto íntegro; el puntero nunca se escribe.
- Normalizer y extracción leen sólo el extracto.
- No hay versión de score que distinga la ventana de medición.

## Modular Placement Contract

- Topology impact: `worker`
- Current home: `src/lib/growth/ai-visibility/**`; la ejecución y la normalización corren en el `ops-worker`.
- Future candidate home: `domain-package`
- Boundary: adapters producen `{answerExcerpt, answerTextHash, answerBody}`; `insertProviderObservations` (`store.ts:604`) escribe el cuerpo;
  normalizer y extracción consumen `readObservationBody(observationId)` con fallback explícito al extracto en runs legados.
- Server/browser split: íntegramente server-only; el texto íntegro nunca llega al browser.
- Build impact: none
- Extraction blocker: el store vive en el PostgreSQL compartido y la normalización en el worker.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical` (cambia la fuente de verdad de lo que se mide y la versión del score; datos de
  terceros en volumen; afecta informes que se entregan a clientes).
- Impacto principal: `migration`
- Source of truth afectado: `greenhouse_growth.provider_observations` + tabla nueva de cuerpos; `grader_scores.score_version`.
- Consumidores afectados: normalizer y extracción (`ops-worker`), scoring, informes, tendencias, MCP (TASK-1861).
- Runtime target: `staging` → `production` (Vercel + `ops-worker`).

### Contract surface

- Contrato existente a respetar: `GrowthAiVisibilityProviderObservation` (`contracts.ts:186-210`), `NormalizationContext`,
  `PersistedGraderScore`.
- Contrato nuevo o modificado: tabla `greenhouse_growth.grader_observation_bodies` (`observation_id` PK/FK, `answer_text`,
  `bytes`, `sha256` igual a `answer_text_hash`, `created_at`, `expires_at`); `raw_evidence_pointer` =
  `pg:grader_observation_bodies/<observation_id>`; `AI_VISIBILITY_SCORE_VERSION = 'ai_visibility_score_v3'`.
- Backward compatibility: `compatible` para lectores (el extracto sigue igual); `gated` para el scoring (flag).
- Full API parity: sin superficie nueva; los readers existentes devuelven la versión del score.

### Data model and invariants

- Entidades/tablas/views afectadas: `provider_observations` (escritura del puntero), `grader_observation_bodies` (nueva),
  `normalized_findings`, `grader_scores`.
- Invariantes que no se pueden romper:
  - `sha256(answer_text) = answer_text_hash` (se verifica al escribir; si no coincide, no se guarda y se captura).
  - Un score v3 sólo se calcula con cuerpos presentes para todas las observaciones exitosas del run; si falta alguno,
    el run se puntúa v2 y lo declara (nunca v3 parcial).
  - La tendencia no compara v3 con v2.
  - El texto íntegro no aparece en ningún DTO público, cliente ni MCP.
- Write-target allowlist: `N/A — el dominio growth/ai-visibility no tiene boundary test de destinos de escritura [verificar]; si existe, declarar grader_observation_bodies en el mismo PR`.
- Tenant/space boundary: cuerpo ligado a la observación y ésta al run; mismo acceso que las observaciones (interno).
- Idempotency/concurrency: `INSERT … ON CONFLICT (observation_id) DO NOTHING`; la persistencia incremental por
  observación se mantiene.
- Audit/outbox/history: sin eventos nuevos; señal de cobertura.

### Migration, backfill and rollout

- Migration posture: `additive` (tabla nueva + índice por `expires_at`, bloque `DO` de verificación).
- Default state: escritura de cuerpos ON al desplegar (aditiva); scoring v3 detrás de `GROWTH_AI_VISIBILITY_FULL_BODY_SCORING_ENABLED` (OFF).
- Backfill plan: no hay backfill posible (el texto de runs viejos no existe); los runs existentes quedan en v2.
- Rollback path: flag OFF → vuelve a v2 sobre el extracto; la tabla puede quedar (datos inertes) o eliminarse en `-- Down Migration`.
- External coordination: redeploy del `ops-worker` (el flag se lee ahí; declararlo en `services/ops-worker/deploy.sh`).

### Security and access

- Auth/access gate: sin rutas nuevas; lectura sólo desde el dominio.
- Sensitive data posture: texto generado por terceros sobre marcas públicas; sin PII esperada. Se trata como contenido
  no confiable (nunca se interpreta como instrucciones) y se retiene con vencimiento (propuesto 180 días, ver Open Questions).
- Error contract: fallos de escritura del cuerpo → `captureWithDomain(err,'growth',…)` y el run sigue (degrada a v2).
- Abuse/rate-limit posture: tamaño máximo por cuerpo (propuesto 64 KB, truncado explícito y marcado `truncated: true`).

### Runtime evidence

- Local checks: tests de hash, fallback, versión y no-fuga del cuerpo en DTOs.
- DB/runtime checks: migración verificada; un run `full` en staging con 60 cuerpos y puntero escrito en las 60 observaciones.
- Integration checks: re-correr el panel Sky (mismo set) en staging y comparar presencias v2 vs v3 por marca.
- Reliability signals/logs: `growth.ai_visibility.observation_body_coverage` (observaciones exitosas sin cuerpo; steady 0).
- Production verification sequence: ver `## Rollout Plan & Risk Matrix`.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio (donde exista boundary test), en el mismo PR: es un control de frontera deliberado, no un inventario que se actualiza solo.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

### Capability Definition of Done — Full API Parity gate

- [ ] `N/A — no capability`: cambia cómo se captura y mide la evidencia dentro del motor; no agrega acciones de negocio.

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

### Slice 1 — Persistir el texto íntegro

- Migración `task-1867-grader-observation-bodies` (tabla, FK, índice por `expires_at`, `DO` de verificación).
- Adapters devuelven `answerBody` (texto íntegro, tope 64 KB con marca de truncado); `insertProviderObservations` escribe el
  cuerpo y el puntero en la misma transacción que la observación; verificación de hash.
- Señal `observation_body_coverage`.

### Slice 2 — Medir sobre el texto íntegro (v3)

- Normalizer y extracción de prosa leen el cuerpo cuando el flag está ON y el run tiene cuerpos completos; si no, extracto
  y v2 declarado.
- `AI_VISIBILITY_SCORE_VERSION` v3 detrás del flag; los informes muestran la versión.
- Presupuesto de tokens de la extracción de prosa: medir el aumento de costo por run y ajustar si supera el techo del modo.

### Slice 3 — Retención y verificación

- Job de purga de cuerpos vencidos (worker, idempotente).
- Re-correr el panel Sky en staging con el mismo set y documentar la diferencia v2 vs v3 por marca.

## Out of Scope

- Exponer el texto íntegro en UI, informes, correo o MCP.
- Recontar runs antiguos (no hay texto).
- Cambiar pesos o fórmulas de las dimensiones.

## Detailed Spec

- `boundedExcerpt` se mantiene para `answer_excerpt`; el cuerpo es un campo aparte.
- Lectura: `readObservationBodies(runId)` en una sola consulta para el normalizer (evita N+1).
- Extracción de prosa: si el cuerpo supera el presupuesto del modelo, se particiona por párrafos y se agregan resultados;
  nunca se recorta en silencio.
- Comparabilidad: la tendencia usa `score_version`; un run v3 frente a un v2 anterior → `incomparable`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (persistencia) antes de Slice 2: sin cuerpos completos no puede existir v3.
- Slice 2 detrás del flag hasta que la señal de cobertura esté en 0 durante al menos 3 runs reales en staging.
- Slice 3 después de Slice 2.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Comparar scores v3 con v2 en un informe o tendencia | Scoring | medium | Versión obligatoria en DTO; tendencia `incomparable` | tests de tendencia |
| Aumento de costo de la extracción de prosa | Gasto LLM | medium | Medir por run; partición; techo del modo | `cost_budget_used` |
| Fuga del texto íntegro a superficies públicas | Datos / AI safety | low | Test de no-fuga en DTOs públicos, cliente y MCP | test |
| Crecimiento de la tabla | DB | low | Tope por cuerpo + retención con purga | tamaño de tabla en `pg:doctor` |
| Worker sin el código nuevo | ops-worker | medium | Deploy coordinado; flag leído en el worker | `observation_body_coverage` |

### Feature flags / cutover

- `GROWTH_AI_VISIBILITY_FULL_BODY_SCORING_ENABLED` (default `false`, runtime `ops-worker` y Vercel): activa medir sobre el
  texto íntegro y puntuar v3. Revert: `false` + redeploy. Fila en el ledger en el mismo PR.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | Revert PR; tabla inerte o `-- Down Migration` | < 30 min | sí |
| Slice 2 | Flag OFF + redeploy del worker | < 15 min | sí |
| Slice 3 | Pausar el job de purga | < 10 min | sí |

### Production verification sequence

1. Migración + verificación de la tabla.
2. Deploy con flag OFF: un run `full` en staging con cuerpos escritos en las 60 observaciones y hash verificado.
3. Flag ON en staging: re-correr el panel Sky, comparar presencias v2 vs v3, revisar costo de extracción.
4. Producción por el release control plane con flag OFF; luego ON tras 3 runs con cobertura 100%.

### Out-of-band coordination required

- Redeploy del `ops-worker` y declaración del flag en su `deploy.sh`.
- Comunicar a quienes entregan informes que v3 no es comparable con v2 (informe con versión visible).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Un run `full` nuevo guarda el texto íntegro de las 60 observaciones exitosas y `raw_evidence_pointer` deja de ser nulo.
- [ ] `sha256(answer_text) = answer_text_hash` en todos los cuerpos guardados (consulta de verificación).
- [ ] Con el flag ON, presencia, competidores y prosa se calculan sobre el texto íntegro y el score queda `ai_visibility_score_v3`.
- [ ] Un run con algún cuerpo faltante se puntúa v2 y lo declara (test).
- [ ] La tendencia marca `incomparable` entre v3 y v2 (test).
- [ ] Ningún DTO público, cliente ni MCP contiene el texto íntegro (test).
- [ ] La señal `observation_body_coverage` está cableada y en 0 en staging.
- [ ] El panel Sky re-corrido en staging documenta la diferencia v2 vs v3 por marca.
- [ ] Docs de límites (runbook, doc funcional, skills `seo-aeo`/`seo-aeo-practice`) actualizados: el límite de 600 caracteres queda retirado.

## Verification

- `pnpm local:check`
- `pnpm test`
- `pnpm migration-marker-gate` + `pnpm migrate:up` con verificación en `information_schema`
- `pnpm task:lint --task TASK-1867`
- Run `full` en staging + consulta de cobertura de cuerpos

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas

- [ ] Fila del flag en `FEATURE_FLAG_STATE_LEDGER.md`.

## Follow-ups

- Exponer al operador, en la vista interna, la marca del cuerpo truncado cuando supere el tope.

## Delta 2026-09-11

- Task creada a pedido del operador tras medir el límite en el panel competitivo de Sky (`EO-GRUN-00050`…`00054`).

## Open Questions

1. **Dónde vive el texto íntegro.** Propuesto: tabla PostgreSQL aparte (volumen bajo, ~300 KB por run, y consultable
   para el análisis cruzado). Alternativa: bucket privado con puntero, como sugería el contrato original. Decidir con
   `arch-architect` antes del Slice 1.
2. **Retención.** Propuesto: 180 días. ¿Se requiere más para tendencias o auditorías con clientes?
