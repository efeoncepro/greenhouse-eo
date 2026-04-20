# TASK-485 — FX Coverage Rollout (manual_only → auto_synced)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Bajo`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD — post 24-48h de dry-run verification de TASK-484`
- Domain: `finance`
- Blocked by: `TASK-484 (merged to develop, deploy to staging required)`
- Branch: `task/TASK-485-fx-coverage-rollout`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Flipear `CURRENCY_REGISTRY[code].coverage` de `manual_only` a `auto_synced` para `CLF`, `COP`, `PEN` y `MXN` tras verificar que los 3 cron windows de TASK-484 (09:00 / 14:00 / 22:00 UTC) corren limpios en staging y que cada par se materializa sin errores en `source_sync_runs`. Cada flip es un commit mini que formaliza el contrato declarativo: la moneda tiene un provider automático confiable, no solo un adapter wireado.

## Why This Task Exists

TASK-484 entregó la plataforma: 9 provider adapters, sync orchestrator, 3 cron routes nuevas, admin endpoint, circuit breaker, tests. Todo está corriendo en develop. Pero `CURRENCY_REGISTRY[CLF/COP/MXN/PEN].coverage` sigue en `manual_only` **a propósito**, como safety net hasta verificar 24-48h de corridas exitosas en staging.

El flag `coverage` es declarativo: no gatea el pricing engine (el engine clasifica readiness por rate presence + staleness). Pero formaliza el contrato operacional — "esta moneda tiene un provider automático confiable" — que consumers downstream (admin dashboards, TASK-466 send gate, futuros readers) usarán como señal de confianza.

Sin este flip, el programa FX queda con **dos verdades distintas**:
- Runtime: rates fluyendo vía provider automático.
- Registry: dice "manual_only" (mentira operacional).

La task cierra esa brecha con evidencia verificable por moneda.

## Goal

- Verificar 24-48h de corridas exitosas en staging para CLF, COP, PEN y MXN (MXN bloqueado hasta que `BANXICO_SIE_TOKEN` esté publicado en Secret Manager + Vercel env).
- Flipear `coverage` a `auto_synced` **una moneda por vez** con evidencia (run IDs + smoke test snippet) en el commit message.
- Dejar la realidad declarativa del registry alineada con la realidad operativa del pipeline.
- Actualizar docs (spec + functional) para reflejar `auto_synced` post-flip.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1.md`
- `docs/tasks/complete/TASK-475-greenhouse-fx-currency-platform-foundation.md`
- `docs/tasks/in-progress/TASK-484-fx-provider-adapter-platform.md`
- `CLAUDE.md` §Secret Manager Hygiene (para el token)

Reglas obligatorias:

- **Un flip por commit** — cada moneda en su propio commit con mensaje que cite `runId` de evidencia y paste del smoke test que validó el estado `supported`.
- **Orden: CLF → COP → PEN → MXN** — CLF primero por menor riesgo (solo lee indicator table), MXN último porque depende del secret humano.
- **Verificar evidencia en `source_sync_runs`** antes de cada flip: al menos 2 corridas consecutivas exitosas (`status = 'succeeded'`) para la moneda, sin `fx_sync.all_providers_failed` outbox events intermedios.
- **No flipear en lote** — si el primer flip expone un bug, paramos inmediatamente sin arrastrar a las otras 3.
- **`BANXICO_SIE_TOKEN` publicado con higiene scalar crudo** (sin comillas, sin `\n`, sin whitespace residual) vía `printf %s "$VALOR" | gcloud secrets versions add`.
- **El secret se publica UNA vez** — si ya existe y es correcto, no crear versión nueva.

## Normative Docs

- `docs/documentation/finance/monedas-y-tipos-de-cambio.md` — contrato funcional, debe actualizarse al final

## Dependencies & Impact

### Depends on

- TASK-484 (mergeada a develop, Vercel auto-deploy a staging)
- Primer ciclo completo de los 3 crons nuevos (09/14/22 UTC del día siguiente al deploy)
- Humano Efeonce registra + publica `BANXICO_SIE_TOKEN` (independiente, solo bloquea Slice 5)

### Blocks / Impacts

- `TASK-466` (multi-currency quote output): aunque el pricing engine deja de emitir `fx_fallback` en cuanto hay rate fresco (readiness no lee coverage), el send gate client-facing de TASK-466 SÍ puede querer leer `coverage === 'auto_synced'` como gate de "safe to send". Post-flip, TASK-466 tiene ese señal limpio.
- Admin UI futuro (`GET /api/admin/fx/health` opcional) va a mostrar estado real.

### Files owned

- `src/lib/finance/currency-registry.ts` (4 ediciones de 1 línea cada una)
- `docs/architecture/GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md` (rollout status table)
- `docs/documentation/finance/monedas-y-tipos-de-cambio.md` (tabla de cobertura)
- `Handoff.md`, `changelog.md`, `docs/tasks/README.md`

## Current Repo State

### Already exists

- `CURRENCY_REGISTRY.{CLP,USD}` ya tienen `coverage: 'auto_synced'` (pre-TASK-484).
- `CURRENCY_REGISTRY.{CLF,COP,MXN,PEN}` tienen `providers.{primary,fallbacks,historical?}` wireados pero `coverage: 'manual_only'`.
- Cron routes + adapter chain + orchestrator funcionando en develop.
- `source_sync_runs` recibe rows de `source_system = 'fx_sync_orchestrator'`.
- `POST /api/admin/fx/sync-pair` disponible para smoke test manual.
- `GET /api/finance/exchange-rates/readiness` devuelve el state correcto (TASK-475).

### Gap

- **Cero observabilidad acumulada** — la tarea existe para cubrir el gap temporal entre "plataforma merged" y "confianza producción".
- No hay evidencia aún de que Banxico SIE funciona sin token (solo Frankfurter responderá hasta que el token exista).
- No hay smoke test automatizado que corra cada flip como regresión — la verificación es manual por ahora.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Verification window (pasivo, observacional, ~24-48h)

- Confirmar que Vercel deployó TASK-484 a staging sin errores (build manifest contiene `/api/cron/fx-sync-latam` + `/api/admin/fx/sync-pair`).
- Esperar al primer disparo de cada window:
  - 09:00 UTC → COP
  - 14:00 UTC → PEN
  - 22:00 UTC → MXN (Banxico fallará sin token → Frankfurter responderá)
- Verificación post-cron (query SQL vía `pnpm staging:request` o admin endpoint):
  ```sql
  SELECT sync_run_id, status, notes, finished_at
  FROM greenhouse_sync.source_sync_runs
  WHERE source_system = 'fx_sync_orchestrator'
    AND finished_at > NOW() - INTERVAL '25 hours'
  ORDER BY finished_at DESC;
  ```
- Verificación funcional:
  ```
  pnpm staging:request GET "/api/finance/exchange-rates/readiness?from=USD&to=COP&domain=pricing_output"
  pnpm staging:request GET "/api/finance/exchange-rates/readiness?from=USD&to=PEN&domain=pricing_output"
  pnpm staging:request GET "/api/finance/exchange-rates/readiness?from=USD&to=MXN&domain=pricing_output"
  pnpm staging:request GET "/api/finance/exchange-rates/readiness?from=CLP&to=CLF&domain=pricing_output"
  ```
  Esperado: `state: 'supported'` o `supported_but_stale` (depende de si la moneda ya tuvo cron fire). `unsupported` o `temporarily_unavailable` son señal de bug.
- Verificar outbox: no hay events `finance.fx_sync.all_providers_failed` para pares esperados; events `finance.fx_sync.provider_fallback` son info (ej. Banxico → Frankfurter pre-token).
- Registrar resultados en la task con run IDs + timestamps. Si algo falla → diagnosticar antes de seguir (circuit breaker, schema, provider offline).

### Slice 2 — Flip CLF

- Pre-req: 2 smoke tests exitosos de `CLF` contra `/readiness` + 1 corrida exitosa del reader `clf_from_indicators` (verificada via `source_sync_runs` o admin endpoint).
- Edit 1 línea:
  ```diff
   CLF: {
     ...
  -  coverage: 'manual_only',
  +  coverage: 'auto_synced',
     ...
   }
  ```
- Commit message: incluir run ID + snippet del readiness response como evidencia.
- Push directo a `develop` (registry-only change, bajo riesgo).
- Smoke test post-push: `/readiness?from=CLP&to=CLF&domain=pricing_output` debe seguir devolviendo `supported` con `composedViaUsd: false`.

### Slice 3 — Flip COP

- Pre-req: 2 corridas de 09:00 UTC exitosas en `source_sync_runs`, rate fresco en `exchange_rates` para `USD→COP`.
- Edit 1 línea (misma que Slice 2).
- Commit + push develop.
- Smoke test post-push.

### Slice 4 — Flip PEN

- Pre-req: 2 corridas de 14:00 UTC exitosas, rate fresco `USD→PEN`.
- Edit 1 línea.
- Commit + push develop.
- Smoke test post-push.

### Slice 5 — Provisión `BANXICO_SIE_TOKEN` (externa, no bloquea Slices 2-4)

- **Out of scope para agente.** Humano de Efeonce:
  1. Registra cuenta gratis en https://www.banxico.org.mx/SieAPIRest/service/v1/token (auto-emite un token permanente de 64 chars).
  2. Publica en GCP Secret Manager con higiene scalar cruda:
     ```bash
     printf %s "$TOKEN" | gcloud secrets versions add banxico-sie-token --data-file=-
     ```
  3. Añade env var `BANXICO_SIE_TOKEN_SECRET_REF` en Vercel (staging + production) apuntando al secret, con el patrón `*_SECRET_REF` del repo.
- Documentar quién registró + fecha en `Handoff.md`.

### Slice 6 — Flip MXN

- Pre-req: Slice 5 completada + 2 corridas de 22:00 UTC con `providerUsed === 'banxico_sie'` (no `frankfurter` pre-token).
- Edit 1 línea.
- Commit + push develop.
- Smoke test post-push.

### Slice 7 — Docs finales + cierre

- Actualizar `docs/architecture/GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md` — rollout status table con fechas de flip reales por moneda.
- Actualizar `docs/documentation/finance/monedas-y-tipos-de-cambio.md` — quitar asteriscos `*` y nota de "coverage pending flip" de la tabla de cobertura. Bump a v1.2.
- `Handoff.md` + `changelog.md` con cierre formal.
- `Lifecycle: complete`, mover archivo a `docs/tasks/complete/`, actualizar `docs/tasks/README.md`.

## Out of Scope

- Agregar providers nuevos o modificar adapters (eso es TASK-484 ya cerrada).
- Admin UI `GET /api/admin/fx/health` dashboard para operadores (nice-to-have, tarea futura).
- Automatización del flip vía endpoint admin (hoy es commit manual, intencionalmente — git es la fuente de verdad del registry).
- Migrar `getLatestExchangeRate` / `resolveExchangeRateToClp` legacy de `src/lib/finance/shared.ts` al orchestrator (refactor separado post-rollout si se decide).
- Backfill histórico de CLF/COP/MXN/PEN — eso se corre con `scripts/backfill-fx-rates.ts` como ejercicio separado si Finance lo pide.

## Detailed Spec

### Evidence block template para cada commit de flip

Cada commit que flipea una moneda debe incluir en su body:

```
Evidence:
- Registry entry: CURRENCY_REGISTRY.<CODE>
- source_sync_runs (2 most recent):
  - run_id=fx-<uuid>, status=succeeded, finished_at=<ISO>, provider=<code>
  - run_id=fx-<uuid>, status=succeeded, finished_at=<ISO>, provider=<code>
- Readiness smoke test:
  GET /api/finance/exchange-rates/readiness?from=USD&to=<CODE>&domain=pricing_output
  → state: supported
  → rate: <N>, rateDateResolved: <ISO>, source: <provider>, ageDays: <N>
- No finance.fx_sync.all_providers_failed events in outbox for this pair in the last 48h
```

### Rollback plan

Si después de un flip aparece un bug (ej. pricing engine rompe en staging):
1. Revertir el commit de flip (`git revert <sha>`).
2. Push a develop.
3. Documentar el fallo en el spec de TASK-485 + abrir issue derivada si requiere fix en TASK-484.

El rollback es trivial porque cada flip es 1 línea.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Al menos 24h de corridas documentadas en `source_sync_runs` con `source_system = 'fx_sync_orchestrator'` antes del primer flip
- [ ] `CURRENCY_REGISTRY.CLF.coverage = 'auto_synced'` con commit que cita evidencia
- [ ] `CURRENCY_REGISTRY.COP.coverage = 'auto_synced'` con commit que cita evidencia
- [ ] `CURRENCY_REGISTRY.PEN.coverage = 'auto_synced'` con commit que cita evidencia
- [ ] `BANXICO_SIE_TOKEN` publicado en Secret Manager con higiene cruda + referenciado desde Vercel env
- [ ] `CURRENCY_REGISTRY.MXN.coverage = 'auto_synced'` con commit que cita evidencia de Banxico SIE (no Frankfurter) como provider activo
- [ ] Docs arquitectura + funcional + Handoff + changelog sincronizados con el estado final
- [ ] Smoke test final: las 6 monedas del `pricing_output` domain devuelven `state: 'supported'` en readiness endpoint
- [ ] `pricing engine` ya no emite `fx_fallback` con severity `critical` para ningún par USD↔{CLF/COP/MXN/PEN} en condiciones normales de operación

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit` (solo para confirmar que los registry edits compilan — trivial)
- No se corren `pnpm build` ni `pnpm test` por cada slice — son cambios declarativos 1 línea, sin riesgo de romper tipos o tests (los tests de TASK-484 mockean el registry).
- Smoke test obligatorio por slice:
  - `pnpm staging:request GET /api/finance/exchange-rates/readiness?from=X&to=Y&domain=pricing_output`
  - Response `state: 'supported'` tras flip

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado con fechas de flip por moneda + provisión del secret
- [ ] `changelog.md` quedo actualizado (entry final cubriendo los 4 flips + provisión del secret)
- [ ] docs arquitectura + funcional actualizadas con `auto_synced` final
- [ ] impacto cruzado sobre `TASK-466` documentado (send gate puede leer `coverage === 'auto_synced'` como señal de confianza)

## Follow-ups

- Admin UI `GET /api/admin/fx/health` que expone coverage + últimas corridas + circuit breaker state por par (nice-to-have).
- Alerting Sentry sobre outbox `finance.fx_sync.all_providers_failed` — configurar cuando el volumen de tráfico lo justifique.
- Refactor de `getLatestExchangeRate` legacy en `src/lib/finance/shared.ts` para consumir el orchestrator, una vez que el rollout demuestre estabilidad.
- Backfill histórico de 90 días por moneda (runbook con `scripts/backfill-fx-rates.ts`) si Finance lo pide para analytics.

## Open Questions

- ¿El registro de `BANXICO_SIE_TOKEN` lo hace el CTO con su cuenta personal de Efeonce, o se crea una cuenta compartida `banxico-sie@efeonce.org`? Preferencia: cuenta compartida para evitar dependencia en una persona específica.
- ¿Hay un SLA declarado por Efeonce sobre la frescura FX (ej. "la tasa nunca puede tener > 3 días para envío client-facing")? Si sí, formalizarlo en la spec de FX Platform V1.
