# artifact-worker — Cloud Run Job de render de artefactos

> **TASK-1391** · Primer Cloud Run **Job** del ecosistema (frontera autorizada 2026-07-12 por
> excepción documentada de EPIC-027 — ver `GREENHOUSE_BUILD_UNIT_DECOMPOSITION_DECISION_V1.md`).

Renderiza artefactos del **Artifact Composer** (catálogo `deck-axis` hoy) a partir de filas de
`greenhouse_commercial.proposal_render_jobs`. Una ejecución = **un** artefacto (`tasks=1`,
`parallelism=1`, `max-retries=0` — el retry es del dominio, no de Cloud Run). No expone HTTP.

## Flujo

```
requestProposalRender (Vercel/CLI/agente confirmado)   ← gates fail-closed al encolar
  → proposal_render_jobs (queued)
  → dispatcher (ops-worker /artifact-render/dispatch, Cloud Scheduler cada 2 min)
      · prioridad deadline + aging · vencidos no compiten · pospuestos logueados
  → Jobs API run (override RENDER_JOB_ID)
  → ESTE JOB: claim → drift check del manifest → composeArtifact (geometría + missing_asset
      + font_fallback + blank_slide + filler fail-closed) → constraints del RFP →
      asset store privado (proposal_deliverable) + proposal_assets → completed/failed + outbox
```

## Reglas duras

- **NUNCA** renderiza un plan mutable: solo el `ResolvedCompositionManifest` del job. Si el
  manifest re-resuelto contra el catálogo local difiere del hash encolado → `manifest_drift`.
- **NUNCA** corre en `ops-worker`/Vercel (bloquearía el publisher del outbox).
- El PDF emitido **NO es PDF/UA** (Chromium print-to-PDF no taguea): un requisito de
  accesibilidad en el RFP rechaza el render **al encolar** — este Job es la 2.ª línea.
- Peso/páginas: contra las **constraints fijadas en el job**, nunca un default re-leído.
- Imagen base `mcr.microsoft.com/playwright:v1.59.1` **pinneada** a la versión de
  `@playwright/test` del repo — otro Chromium = otro píxel = otro artefacto.
- Runtime **tsx sobre el árbol fuente** (sin bundle): los paths module-relative del catálogo
  resuelven idéntico al CLI local (`pnpm deck:compose`). No cambiar a esbuild sin resolver la
  reubicación de templates/fuentes/assets.

## Flag (multi-runtime — ledger: `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`)

`ARTIFACT_RENDER_JOBS_ENABLED` — default **false**. Se lee en 3 runtimes:

| Runtime | Efecto con flag OFF |
|---|---|
| Vercel (enqueue `requestProposalRender`) | rechaza con `flag_disabled` |
| ops-worker (dispatcher) | no despacha (skip logueado) |
| este Job | registra `flag OFF — skip` y sale 0 |

**SoT en Cloud Run = `deploy.sh`** (`--set-env-vars` es destructivo). Prenderlo:
declararlo en el deploy.sh del runtime + aplicar en vivo + verificar la revisión activa.

## Operación

```bash
# Deploy (staging)
ENV=staging bash services/artifact-worker/deploy.sh

# Smoke manual de un job encolado
gcloud run jobs execute artifact-worker --project=efeonce-group --region=us-east4 \
  --update-env-vars=RENDER_JOB_ID=prnd-… --wait

# Estado/diagnóstico
gcloud run jobs executions list --job=artifact-worker --project=efeonce-group --region=us-east4
# El estado de negocio vive en proposal_render_jobs (+ historial proposal_render_job_events)
```

Fallos gobernados (el Job sale 0; el código queda en `failure_code`): `audience_violation` ·
`accessibility_unsupported` · `semantic_rejected` · `size_rejected` · `geometry_rejected` ·
`font_fallback_detected` · `missing_asset` · `blank_slide` · `manifest_drift` · `render_error` ·
`timeout` · `dispatch_error`. Un exit ≠ 0 es un fallo NO gobernado (bug del worker): Sentry
`domain=commercial`, tag `source=artifact_worker`.
