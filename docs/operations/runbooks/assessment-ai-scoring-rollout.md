# Runbook — Rollout del scoring IA de assessments (provisional → calibrado)

> **Tipo de documento:** Runbook operativo
> **Task dueña:** `TASK-1734` (Slice 6) · **ADR:** `docs/architecture/GREENHOUSE_ASSESSMENT_AI_SCORING_RUN_DECISION_V1.md`
> **Creado:** 2026-08-16 (Claude, Slice 6 code-only)
> **Estado:** TASK-1742 autorizado para activar `global_provisional`; `exception_canary` y `calibrated_batch` siguen bloqueados por evidencia.

## Ruta provisional global — TASK-1742

`global_provisional` genera propuestas para todas las vacantes, pero no escribe `human_score`, no finaliza el assessment y no modifica score, etapa, decisión, asignación de test, email ni handoff. El resultado se sirve solo a operadores con `hiring.assessment.score` y siempre declara “No incorporada al resultado efectivo”.

Variables del ops-worker:

- `HIRING_ASSESSMENT_AI_RUN_MODE=global_provisional`
- `HIRING_ASSESSMENT_AI_RUN_ENQUEUE_ENABLED=true`
- `HIRING_ASSESSMENT_AI_ENABLED=true`
- `HIRING_ASSESSMENT_AI_EXCEPTION_POLICY_ENABLED=false`
- `HIRING_ASSESSMENT_AI_RUN_CONCURRENCY=1` durante el canary
- `HIRING_ASSESSMENT_AI_DAILY_PROVIDER_ATTEMPT_CAP=<tope aprobado>`

Variables de Vercel:

- `HIRING_ASSESSMENT_AI_RUN_MODE=global_provisional`
- `HIRING_ASSESSMENT_AI_EXCEPTION_POLICY_ENABLED=false`
- `HIRING_ASSESSMENT_AI_RUN_CONFIRM_ENABLED=false`

Activación: desplegar primero el código con flags OFF, comprobar el assessment exacto y el command dry-run, activar los valores anteriores, ejecutar el assessment exacto de Lucero y verificar que la proyección existe mientras los campos efectivos permanecen bit-for-bit. Luego se mantiene el enqueue global para nuevos envíos y el backlog se abre con `pnpm hiring:ai:provisional-backfill`, dry-run por defecto, máximo 25 por lote.

Cualquier modo superior a provisional requiere `HIRING_ASSESSMENT_AI_PROMOTION_EVIDENCE_DIGEST` válido; sin ese digest el runtime degrada mecánicamente a `global_provisional`. Una detección de prompt injection bloquea el egress; PII/protected data se redacta antes del provider; OOD/off-topic se enruta como excepción. El tope diario detiene nuevas llamadas sin perder la cola.

## Para qué sirve

Ejecutar la secuencia de promoción del run asíncrono de scoring IA por `hiring_assessment`
(spec §Production verification sequence, 7 pasos) y su rollback, sin improvisar comandos.
El resultado del scoring es **exclusivamente interno para operadores**: ningún paso de este
runbook crea, habilita ni permite una superficie de resultados hacia el candidato (prohibido
por contrato, sin flag).

## Antes de empezar

- Leer el ADR (`GREENHOUSE_ASSESSMENT_AI_SCORING_RUN_DECISION_V1.md`) — en especial D4 (placement), D6 (flags) y las Hard rules.
- Los **3 flags nuevos** (ADR D6) y su runtime owner:

| Flag | Gatea | Runtime owner (dónde se LEE) |
|---|---|---|
| `HIRING_ASSESSMENT_AI_RUN_ENQUEUE_ENABLED` | creación de runs + fan-out (proyección + drain) | **ops-worker** (`services/ops-worker/deploy.sh` es el SoT) |
| `HIRING_ASSESSMENT_AI_EXCEPTION_POLICY_ENABLED` | elegibilidad `batch_eligible` (OFF ⇒ todo es `mandatory_review`) | **ops-worker + Vercel** |
| `HIRING_ASSESSMENT_AI_RUN_CONFIRM_ENABLED` | command de confirmación de run (batch) | **Vercel** (App API) |

- El master `HIRING_ASSESSMENT_AI_ENABLED` **ya está ON en Vercel Production** (2026-07-16) pero **NO gatea confirm/reject ni el rollback** (Delta punto 4). En el **ops-worker** quedó declarado con default **OFF** en `deploy.sh` (segundo gate del drain): el paso de shadow lo prende ahí.
- Prender un flag es **multi-runtime**: en Cloud Run se declara en `deploy.sh` (SoT — `--set-env-vars` es destructivo y borra lo out-of-band) **y además** se aplica en vivo con `--update-env-vars`. En Vercel, `vercel env add` + redeploy (las env no calientan solas).
- Identificadores fijos: proyecto `efeonce-group`, región `us-east4`, servicio `ops-worker`, SA `greenhouse-portal@efeonce-group.iam.gserviceaccount.com`, Vercel scope `efeonce-7670142f`.
- Verificar estado live ANTES de tocar nada (nunca confiar en docs):

```bash
# Vercel (los 3 flags nuevos + master)
vercel env ls --scope efeonce-7670142f | grep HIRING_ASSESSMENT_AI

# ops-worker (revisión ACTIVA, no el deploy.sh)
gcloud run services describe ops-worker --region=us-east4 --project=efeonce-group \
  --format='value(spec.template.spec.containers[0].env)' | tr ';' '\n' | grep HIRING_ASSESSMENT_AI
```

## Secuencia de rollout (7 pasos de la spec)

### Paso 1 — ADR/policy aceptados + verificación de runtime real

- Confirmar ADR con la autorización ejecutiva registrada (CEO 2026-08-16) y provider terms/DPA revisados (actividad Legal/Privacy ya autorizada, no firma nueva).
- Correr la verificación live de flags de arriba y corregir el ledger si hay drift.

### Paso 2 — Migración en staging + deploy con flags OFF + camino manual intacto

- Migraciones del run aggregate ya aplicadas y verificadas contra PG real (Slice 1, 2026-08-16). Para un environment fresco: `pnpm pg:connect:migrate`.
- Deploy del ops-worker con los defaults OFF de `deploy.sh` (crea además el scheduler `ops-assessment-ai-drain` **PAUSADO**):

```bash
bash services/ops-worker/deploy.sh
```

- Verificar bit-for-bit que el camino manual sigue vivo: un score humano directo por Application 360 aplica y finaliza sin tocar ningún run.
- Verificar señales en steady: las 5 señales `hiring.assessment_ai.*` en `/admin/operations` deben reportar `ok` (cero actividad).

### Paso 3 — Eval de promoción (BLOQUEANTE)

```bash
pnpm hiring:ai:promotion-eval -- --dataset <dataset-humano-real>
pnpm hiring:ai:promotion-gate
```

- El gate hace exit 1 con dataset sintético, sin doble rating humano + adjudicación, o con cualquier blocker métrico. **El gold set es trabajo de Talent en curso; ningún agente lo fabrica.** No hay paso 4 sin gate verde.

### Paso 4 — Shadow: enqueue/scoring SOLO con assessments sintéticos

1. Editar `services/ops-worker/deploy.sh` (SoT): `HIRING_ASSESSMENT_AI_RUN_ENQUEUE_ENABLED:-true` y `HIRING_ASSESSMENT_AI_ENABLED:-true`; commit + deploy (`bash services/ops-worker/deploy.sh` — el flip resume el scheduler automáticamente).
2. Aplicar en vivo para efecto inmediato (además del SoT, nunca en su lugar):

```bash
gcloud run services update ops-worker --region=us-east4 --project=efeonce-group \
  --update-env-vars HIRING_ASSESSMENT_AI_RUN_ENQUEUE_ENABLED=true,HIRING_ASSESSMENT_AI_ENABLED=true

gcloud scheduler jobs resume ops-assessment-ai-drain --location=us-east4 --project=efeonce-group
```

3. Someter un assessment **sintético** (persona agente; nunca candidato real) y verificar: un run único por digest, items enumerados, drain propone/abstiene, replay del evento NO duplica.

```bash
# Tick manual del drain sin esperar el cron
gcloud scheduler jobs run ops-assessment-ai-drain --location=us-east4 --project=efeonce-group

# Logs del drain
gcloud run services logs read ops-worker --region=us-east4 --project=efeonce-group --limit=50 \
  | grep assessment-ai
```

4. `EXCEPTION_POLICY` y `RUN_CONFIRM` siguen **OFF**: todo item cae `mandatory_review` y no existe confirm de run.

### Paso 5 — Ejercicio sintético de excepciones, muestra, confirm y rollback

1. Prender `HIRING_ASSESSMENT_AI_RUN_CONFIRM_ENABLED` **solo en staging Vercel**:

```bash
vercel env add HIRING_ASSESSMENT_AI_RUN_CONFIRM_ENABLED staging --scope efeonce-7670142f   # valor: true
# Redeploy de staging para calentar la env
```

2. Con aplicaciones sintéticas: resolver `mandatory_review` uno a uno (evidencia anti-anclaje `sawProposalBeforeScoring`), completar la muestra ciega, confirmar el run y verificar manifest append-only + rollup canónico.
3. Ensayar el rollback completo (sección siguiente) y verificar residual CERO.
4. Probes anti-leak: `GET/POST /api/public/assessment/[token]`, emails de lifecycle y DTOs candidate/client **no** contienen score/result/rationale/confianza/estado de revisión (suite Slice 5 + probe manual).

### Paso 6 — Canary: UN template/opening allowlisted con owner de Talent nombrado

- Solo tras pasos 3-5 en verde. Un solo template/opening, owner de Talent **nombrado** (pendiente de asignación por el CEO), cooldown y revisión de TODOS los items del canary.
- Cero automatización de stage/decisión/email; la confirmación sigue siendo humana con manifest.
- Vigilar diariamente las señales (sección siguiente) durante el cooldown.

### Paso 7 — Promoción gradual de la exception policy

- Prender `HIRING_ASSESSMENT_AI_EXCEPTION_POLICY_ENABLED` (ops-worker por `deploy.sh` + `--update-env-vars`; Vercel por `vercel env add`) **solo** si `override_delta`, `abstention_rate`, `provider_failure_rate`, `run_backlog_stuck` y `orphan_reconciliation` siguen verdes y la calibración del Slice 3 está vigente para el template.
- Cualquier gate en rojo ⇒ volver a confirmación totalmente manual (policy OFF) y revisar la policy/eval antes de reintentar.
- Actualizar `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` en cada flip (fila + snapshot).

## Verificación por señales

Dashboard: `/admin/operations` (módulo **Hiring / ATS**). Readers: `src/lib/reliability/queries/hiring-assessment-ai-run-signals.ts`.

| Señal | Steady | Alerta significa |
|---|---|---|
| `hiring.assessment_ai.run_backlog_stuck` | 0 | scheduler caído / drain fallando (warning >0; error si el más viejo >120 min) |
| `hiring.assessment_ai.provider_failure_rate` | 0 | items `failed` en 24h por modelo (warning 1-3; error >3) — quedan fail-closed en cola manual |
| `hiring.assessment_ai.abstention_rate` | informativa | advisory (máx. warning): >30% con n≥5 = calibración, no incidente |
| `hiring.assessment_ai.override_delta` | informativa | humano discrepa de la IA: warning >25% (n≥5), error >50% (n≥10) ⇒ congelar rollout |
| `hiring.assessment_ai.orphan_reconciliation` | 0 | huérfanas sin reconciliar (warning 1-5; error >5) ⇒ correr reconcile |

## Rollback (secuencia del ADR — NUNCA "apagar el master")

Orden estricto: **confirm OFF → enqueue OFF → drain/cancel/reconcile → readback de cola manual.**

```bash
# 1. Confirm OFF (Vercel; por environment donde estuviera ON) + redeploy
vercel env rm HIRING_ASSESSMENT_AI_RUN_CONFIRM_ENABLED production --scope efeonce-7670142f

# 2. Enqueue OFF (ops-worker): deploy.sh (SoT) de vuelta a :-false + commit, y en vivo:
gcloud run services update ops-worker --region=us-east4 --project=efeonce-group \
  --update-env-vars HIRING_ASSESSMENT_AI_RUN_ENQUEUE_ENABLED=false
gcloud scheduler jobs pause ops-assessment-ai-drain --location=us-east4 --project=efeonce-group

# 3. Drain gobernado: cancel ordenado + reconcile + prueba de residual cero
pnpm hiring:ai:run-rollback              # dry-run primero: qué se cancelaría
pnpm hiring:ai:run-rollback -- --apply   # ejecuta; exit 1 si queda residual

# 4. Readback: señales run_backlog_stuck y orphan_reconciliation en ok/steady=0,
#    y la cola manual de Application 360 muestra todas las respuestas pendientes.
```

- `resolve_item` / `cancel_run` / `reconcile` **no** se gatean por flag: drenar la cola humana es posible en todo estado.
- El rollback nunca borra: cancel/reconcile son transiciones auditadas append-only; las proposals quedan como evidencia.

## Qué NO hacer

- NO prender ningún flag sin el paso previo del runbook en verde (el gate del Paso 3 es bloqueante).
- NO prender un flag solo con `--update-env-vars` (el próximo deploy lo borra en silencio): el SoT es `deploy.sh`.
- NO ejecutar rollback "apagando" `HIRING_ASSESSMENT_AI_ENABLED` (no gatea confirm/reject y rompería el AI assist individual que ya está en producción).
- NO cerrar huérfanas ni runs con `DELETE`/SQL manual — siempre `pnpm hiring:ai:run-rollback` o `reconcileAssessmentAiScoringRuns`.
- NO crear ninguna superficie de resultados para el candidato, con o sin flag.

## Problemas comunes

- **`run_backlog_stuck` en warning con flags ON** → el scheduler está pausado o el drain devuelve `skipped`: verificar `gcloud scheduler jobs describe ops-assessment-ai-drain` y los DOS flags del drain en la revisión activa del ops-worker.
- **Drain responde `skipped: assessment_ai_disabled`** → falta el master `HIRING_ASSESSMENT_AI_ENABLED=true` en el ops-worker (es runtime-independiente del ON de Vercel).
- **`orphan_reconciliation` crece** → alguien aplicó scores por el carril manual con proposals abiertas (esperado); correr el reconcile — es idempotente.
- **Confirm de run devuelve 409 `run_stale`** → answers/rubric/modelo/prompt/policy cambiaron después de las propuestas: el run exige propuestas nuevas; no hay override.

## Referencias

- Spec: `docs/tasks/in-progress/TASK-1734-assessment-ai-scale-operator-exception-review.md` (§Rollout Plan, §Production verification sequence)
- ADR: `docs/architecture/GREENHOUSE_ASSESSMENT_AI_SCORING_RUN_DECISION_V1.md`
- Ledger de flags: `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- Rollback primitive: `src/lib/hiring/assessment/ai/scoring-run/rollback.ts` · CLI: `scripts/hiring/assessment-ai-run-rollback.{mjs,ts}`
- Señales: `src/lib/reliability/queries/hiring-assessment-ai-run-signals.ts`
