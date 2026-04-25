# TASK-638 — Reliability AI Observer (Gemini watcher loop)

## Status

- Lifecycle: `complete`
- Priority: `P3`
- Impact: `Medio`
- Effort: `Medio`
- Type: `implementation`
- Epic: `EPIC-007`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none` (TASK-600/635 ya cerraron contracts y persistencia).
- Branch: `task/TASK-638-reliability-ai-observer`

## Summary

Capa AI que observa el `Reliability Control Plane` cada N min, lee la salida normalizada de `/api/admin/reliability`, sanitiza PII potencial en titles/locations, le pasa a Gemini Flash un prompt determinista para producir resumen ejecutivo + observaciones por módulo, y persiste el output deduplicado por fingerprint. La IA enriquece la lectura — NUNCA reemplaza las reglas determinísticas (rules-first sigue dominando: synthetic, sentry correlator, smoke lane, etc.).

## Why This Task Exists

EPIC-007 cerró todas las child tasks (TASK-600/586/632/633/599/634/635). El contrato existe, los datos están normalizados, los boundaries están en `ready`. Falta una sola capa: alguien que lea el conjunto completo y diga "el portal está sano, excepto X module degradado por Y razón, probable causa Z". Hoy un operador tiene que abrir Admin Center y leer 4 módulos × N señales × evidence array para inferir contexto. La IA hace ese trabajo en una línea + observaciones puntuales por módulo, persistiendo el output como una señal más (`kind=ai_summary`) — coherente con el resto del Reliability Control Plane.

## Goal

- Reader narrativo + prompt builder + sanitización PII (sin LLM), output JSON.
- Cron Vercel `/api/cron/reliability-ai-watch` cada 60 min con Gemini Flash + dedup fingerprint.
- Tabla `greenhouse_ai.reliability_ai_observations` (sweep_id, module_key, severity, fingerprint, summary, recommended_action, observed_at).
- Adapter `buildAiSummarySignals` emite `kind=ai_summary` por módulo.
- Card "AI Watcher" en Admin Center: 1 línea de resumen + observaciones por módulo.
- Kill switch `RELIABILITY_AI_OBSERVER_ENABLED` (opt-in).

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_AI_TOOLS_ARCHITECTURE_V1.md`
- `.claude/skills/gcp-vertex-ai/`

Reglas obligatorias:

- IA enriquece, NO reemplaza reglas determinísticas.
- Sanitización PII obligatoria antes del prompt (emails, IDs > 24 chars, UUIDs en titles).
- Cuando AI falla → degradación honesta (señal `awaiting_data`), no elimina otras señales.
- Fingerprint dedupe evita spam: solo persiste si cambió la severidad agregada o algún módulo subió/bajó.
- Kill switch opt-in via `RELIABILITY_AI_OBSERVER_ENABLED=true` (default OFF — costo cero hasta activación explícita).

## Scope

### Slice 1 — Schema + persistence

- Migration `greenhouse_ai.reliability_ai_observations`: sweep_id PK (`EO-RAI-<uuid8>`), module_key, severity, fingerprint, summary, recommended_action, observed_at, model.
- Helper `recordAiObservation()`.

### Slice 2 — Sanitización PII + prompt builder

- `src/lib/reliability/ai/sanitize.ts`: redacta emails, IDs largos, UUIDs.
- `src/lib/reliability/ai/build-prompt.ts`: toma `ReliabilityOverview` y produce el system + user prompt.

### Slice 3 — Host: ops-worker + Cloud Scheduler (NO Vercel cron)

**Decisión auditada**: el AI Observer NO corre en Vercel cron. Razones:

1. Gemini llamada + Cloud SQL connector + DB writes pueden rozar el cap 60s del plan Pro en peor caso.
2. Gemini corre nativo via WIF en Cloud Run (sin gestionar ADC en Vercel envs).
3. Cloud Logging captura prompt + response para auditoría reproducible.
4. Cloud Scheduler retries automáticos sin escribir código de resiliencia.
5. ops-worker ya corre 3 jobs Scheduler — agregar uno es overhead trivial.

Implementación:

- Lógica del runner en `src/lib/reliability/ai/runner.ts` (importable + testeable, sin acoplamiento a host).
- Endpoint `POST /reliability-ai-watch` en `services/ops-worker/` (Cloud Run service ya existente, esbuild bundling).
- Cloud Scheduler job manual setup post-deploy (`gcloud scheduler jobs create http ops-reliability-ai-watch --schedule="0 */1 * * *"` con OIDC token).
- Vercel queda como UI consumer: lee `reliability_ai_observations` y rinde `ai_summary` signal.

### Slice 4 — Adapter + UI surface

- `buildAiSummarySignals(observations)` → `kind=ai_summary` por módulo.
- Card "AI Watcher" en `AdminCenterView`: resumen ejecutivo + observación por módulo (con badge "AI" para distinguir de reglas).

### Slice 5 — Out of Scope V1

- Routing automático Slack/email (follow-up).
- LLM proponiendo acciones reversibles fuera de "abrir issue / sugerir fix" (sin auto-execute).
- Historico cross-CI (V1 solo persiste última observación por módulo).

## Acceptance Criteria

- [ ] migración crea `greenhouse_ai.reliability_ai_observations`.
- [ ] sanitización PII testada con casos sintéticos (emails, UUIDs, IDs largos).
- [ ] prompt builder produce JSON estable (sin diff entre runs idénticos).
- [ ] cron dedupea por fingerprint (no escribe si nada cambió).
- [ ] kill switch `RELIABILITY_AI_OBSERVER_ENABLED=false` salta la corrida.
- [ ] señal `kind=ai_summary` aparece en `/api/admin/reliability` cuando hay observaciones recientes.
- [ ] Admin Center muestra card "AI Watcher" cuando hay datos; card oculta cuando no.

## Verification

- `pnpm lint` ✅
- `pnpm exec tsc --noEmit --pretty false` ✅
- `pnpm test src/lib/reliability/ai/**` ✅
- `pnpm build` ✅
- inspección manual del cron con `pnpm staging:request POST /api/cron/reliability-ai-watch` (cuando `RELIABILITY_AI_OBSERVER_ENABLED=true`).

## Closing Protocol

- [ ] `Lifecycle` sincronizado
- [ ] archivo en carpeta correcta
- [ ] `docs/tasks/README.md` actualizado
- [ ] `Handoff.md` + `changelog.md` actualizados
- [ ] `GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md` actualizado con sección "AI Observer"
- [ ] kill-switch documentada en spec V1

## Follow-ups

- Routing automático Slack/email (TASK separada).
- LLM-assisted incident correlator override (mejora TASK-634 cuando >20% uncorrelated).
- Histórico de observaciones para training de mejores prompts.
- Multi-model fallback (Anthropic Claude si Gemini falla).
- AI propone abrir tasks en `docs/tasks/to-do/` cuando detecta gaps repetidos.
