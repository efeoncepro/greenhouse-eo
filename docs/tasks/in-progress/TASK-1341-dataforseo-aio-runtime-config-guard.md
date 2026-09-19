# TASK-1341 — DataForSEO AI Overview runtime config guard

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
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
- Backend impact: `integration`
- Epic: `EPIC-020`
- Status real: `code complete, rollout pendiente — ISSUE-175 recuperado; smoke AIO drenado por worker PASS (2026-09-19); falta sólo empujar el guard a develop y verlo correr en el pipeline`
- Rank: `TBD`
- Domain: `growth|ai|integrations|ops|reliability`
- Blocked by: `none`
- Branch: `develop`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cerrar el drift productivo que deja a `google_ai_overview` en `skipped:missing_secret` cuando el run async del AI Visibility Grader se ejecuta en Cloud Run `ops-worker`. El fix debe alinear la configuracion DataForSEO del worker, agregar un guard/preflight para no desplegar AIO ON sin `DATAFORSEO_API_LOGIN` + password ref, y validar con smoke real low-volume que un run nuevo ya no produce `missing_secret`.

## Why This Task Exists

En los reportes publicos recientes del lead magnet, el modo `light` solicita `google_ai_overview`, pero todas las observations de ese provider quedaron `skipped` con `error_code='missing_secret'`. Eso vuelve el run `partial` y el informe publico muestra "informe parcial" correctamente: no es un hardcode ni un bug del renderer.

La causa probable verificada es operacional: el grader async corre en `ops-worker`, no en Vercel. Vercel puede tener `DATAFORSEO_API_LOGIN`, pero si la revision viva de Cloud Run no lo tiene, `isDataForSeoConfigured()` falla y el adapter DataForSEO degrada limpio. TASK-1265 ya implemento y probo el provider en staging; falta endurecer el rollout productivo para que la configuracion real del worker no pueda quedar en drift silencioso.

## Goal

- `ops-worker` queda con configuracion DataForSEO completa y durable cuando `GROWTH_AI_VISIBILITY_GOOGLE_AIO_ENABLED=true`.
- El deploy/preflight falla o alerta loud si Google AIO esta ON y falta `DATAFORSEO_API_LOGIN` o `DATAFORSEO_API_PASSWORD_SECRET_REF`.
- Un smoke real low-volume en el runtime efectivo del worker produce observations `google_ai_overview` con status aceptado (`succeeded` o `skipped:no_ai_overview_block`), nunca `skipped:missing_secret`.
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` y el runbook del grader explican que el source of truth operativo para AIO async es el worker.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md` — Delta TASK-1265, fuente DataForSEO, degradacion honesta y worker async.
- `docs/tasks/complete/TASK-1265-growth-ai-visibility-answer-engine-coverage-google-aio.md` — precedente del provider, smoke staging y hallazgo "worker, no Vercel".
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` — ledger de flags/secrets y estado de Google AIO.
- `docs/manual-de-uso/growth/ai-visibility-grader-smoke.md` — smoke low-volume del grader y DataForSEO.
- `docs/architecture/GREENHOUSE_CANONICAL_PATTERNS_V1.md` — flags default safe, rollback, reliability signals.

Reglas obligatorias:

- DataForSEO sigue siendo server-side; nunca exponer login/password al browser, al renderer Think ni a HubSpot.
- No hacer scraping directo de Google; el provider `google_ai_overview` sigue usando `src/lib/ai/dataforseo.ts`.
- `skipped:no_ai_overview_block` es una degradacion valida; `skipped:missing_secret` con AIO ON es defecto de configuracion/rollout.
- El worker es el runtime efectivo del grader async; no asumir que Vercel env corrige el run real.
- No ocultar "partial" en el reporte para maquillar missing config. El reporte debe seguir siendo honesto.

## Normative Docs

- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- `docs/manual-de-uso/growth/ai-visibility-grader-smoke.md`

## Dependencies & Impact

### Depends on

- TASK-1265 complete: adapter `google_ai_overview` y cliente `src/lib/ai/dataforseo.ts`.
- TASK-1234 async execution: runs del grader drenados por `ops-worker`.
- Secret Manager: `greenhouse-dataforseo-api-password` accesible por el service account del worker.
- GitHub Actions secret: `DATAFORSEO_API_LOGIN` inyectado por `.github/workflows/ops-worker-deploy.yml`.

### Blocks / Impacts

- Impacta la calidad de reportes publicos de TASK-1327 y el estado `partial` de nuevos runs.
- Desbloquea verificacion productiva real de cobertura Google AI Overview / AI Mode en el lead magnet.
- No bloquea el renderer Think: el renderer consume lo que el report model entrega.

### Files owned

- `services/ops-worker/deploy.sh`
- `.github/workflows/ops-worker-deploy.yml`
- `src/lib/ai/dataforseo.ts`
- `src/lib/growth/ai-visibility/providers/google-ai-overview-adapter.ts`
- `src/lib/growth/ai-visibility/__tests__/google-ai-overview-adapter.test.ts`
- `src/lib/ai/__tests__/dataforseo.test.ts`
- `scripts/growth/ai-visibility-smoke.ts`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- `docs/manual-de-uso/growth/ai-visibility-grader-smoke.md`

## Current Repo State

### Already exists

- `src/lib/ai/dataforseo.ts` resuelve `DATAFORSEO_API_LOGIN` + `DATAFORSEO_API_PASSWORD` o `DATAFORSEO_API_PASSWORD_SECRET_REF`, y expone `isDataForSeoConfigured()`.
- `src/lib/growth/ai-visibility/providers/google-ai-overview-adapter.ts` devuelve `skipped:missing_secret` cuando el flag esta ON pero DataForSEO no esta configurado.
- `src/lib/growth/ai-visibility/policy.ts` incluye `google_ai_overview` en modo `light`.
- `services/ops-worker/deploy.sh` appendea `DATAFORSEO_API_PASSWORD_SECRET_REF` siempre, pero `DATAFORSEO_API_LOGIN` solo si viene poblado en el entorno de deploy.
- `.github/workflows/ops-worker-deploy.yml` declara `DATAFORSEO_API_LOGIN: ${{ secrets.DATAFORSEO_API_LOGIN }}`.
- El runbook `docs/manual-de-uso/growth/ai-visibility-grader-smoke.md` ya documenta el smoke de Google AI Overview / DataForSEO.

### Gap

- No hay guard que impida desplegar `ops-worker` con `GROWTH_AI_VISIBILITY_GOOGLE_AIO_ENABLED=true` y `DATAFORSEO_API_LOGIN` ausente.
- No hay verificacion post-deploy automatica que compare el env real del worker contra la matriz de flags/secrets esperada.
- Produccion puede quedar en `google_ai_overview -> skipped:missing_secret` aunque Vercel tenga variables correctas.
- El informe parcial es consecuencia legitima de observations incompletas; no debe corregirse desde UI mientras el provider siga sin correr.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: Cloud Run `ops-worker` runtime env + Secret Manager refs + `greenhouse_growth.provider_observations`
- Consumidores afectados: public lead magnet report (`efeonce-think` via headless report model), admin/operator grader, client-portal grader, ops-worker drain
- Runtime target: `production` + `worker`

### Contract surface

- Contrato existente a respetar: `src/lib/ai/dataforseo.ts`, `src/lib/growth/ai-visibility/providers/google-ai-overview-adapter.ts`, `services/ops-worker/deploy.sh`, `.github/workflows/ops-worker-deploy.yml`
- Contrato nuevo o modificado: deploy/preflight guard y smoke/check operacional para DataForSEO cuando `GROWTH_AI_VISIBILITY_GOOGLE_AIO_ENABLED=true`
- Backward compatibility: `compatible` — no cambia provider id, report model, scoring ni payload publico
- Full API parity: N/A — no introduce una capability; endurece la configuracion de una integracion ya consumida por el primitive existente del grader.

### Data model and invariants

- Entidades/tablas/views afectadas: lectura/verificacion de `greenhouse_growth.provider_observations`; sin migration.
- Invariantes que no se pueden romper:
  - `google_ai_overview` con config faltante debe degradar como `skipped:missing_secret`; el guard evita que ese estado llegue a prod con flag ON, no cambia la semantica del adapter.
  - `skipped:no_ai_overview_block` sigue siendo valido y no se debe convertir a fallo.
  - Una observation `succeeded` requiere bloque AI real/citas parseadas segun TASK-1265; nunca `succeeded` vacio.
  - Secret/password nunca se persisten en PG ni se imprimen en logs.
- Tenant/space boundary: public/prospect runs no tienen tenant de portal; la frontera es server-side y public-safe. El smoke debe usar datos no sensibles y no exponer prompts/raw provider text fuera de logs internos.
- Idempotency/concurrency: smoke low-volume con `runKind='smoke'` e idempotency key si se ejecuta por endpoint; deploy guard deterministico antes de crear revision.
- Audit/outbox/history: evidence principal en `provider_observations` + logs de Cloud Run/GitHub Actions; no outbox nuevo.

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: provider sigue controlado por `GROWTH_AI_VISIBILITY_GOOGLE_AIO_ENABLED`; guard solo aplica cuando esta ON.
- Backfill plan: none — no recalcular reportes historicos en esta task.
- Rollback path: `GROWTH_AI_VISIBILITY_GOOGLE_AIO_ENABLED=false` en `ops-worker` + redeploy; nuevos runs dejan de solicitar AIO. Revert PR si el guard bloquea deploys legitimos.
- External coordination: confirmar/crear GitHub Actions secret `DATAFORSEO_API_LOGIN`, Secret Manager ref `greenhouse-dataforseo-api-password`, `secretAccessor` para service account, y rotacion del password si sigue comprometido por la provision historica.

### Security and access

- Auth/access gate: deploy via GitHub Actions/gcloud; Secret Manager con service account `greenhouse-portal@`; endpoint admin smoke requiere capability existente `growth.ai_visibility.run.execute`.
- Sensitive data posture: login/password DataForSEO son config/secrets; no imprimir valores, solo presencia/fuente (`env`, `secret_manager`, `missing`).
- Error contract: deploy guard debe fallar con mensaje accionable sin secret; runtime adapter conserva errores sanitizados y `captureWithDomain`.
- Abuse/rate-limit posture: smoke manual/CI debe ser low-volume y provider-scoped (`onlyProviders:['google_ai_overview']`) para evitar costo accidental.

### Runtime evidence

- Local checks: `pnpm test src/lib/ai/__tests__/dataforseo.test.ts src/lib/growth/ai-visibility/__tests__/google-ai-overview-adapter.test.ts`
- DB/runtime checks: `gcloud run services describe ops-worker --region ... --project efeonce-group` confirma env names; query PG read-only confirma fresh run sin `error_code='missing_secret'`.
- Integration checks: smoke real `google_ai_overview` en el runtime efectivo del worker; aceptar `succeeded` o `skipped:no_ai_overview_block`, rechazar `missing_secret`.
- Reliability signals/logs: Cloud Run logs del drain + `provider_observations.error_code`; si existe señal `growth.ai_visibility.provider_skipped_missing_secret`, revisarla o crear follow-up.
- Production verification sequence: ver `## Rollout Plan & Risk Matrix`.

### Acceptance criteria additions

- [x] Source of truth, contract surface and consumers are named with real paths or objects.
- [x] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [x] Migration/backfill/rollback posture is explicit and proportional to risk.
- [x] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [x] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

## Capability Definition of Done — Full API Parity gate

N/A — esta task no introduce una capability nueva ni una accion de negocio nueva. Endurece la configuracion runtime de una integracion ya consumida por el primitive gobernado del AI Visibility Grader.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Runtime drift guard

- Agregar guard/preflight en `services/ops-worker/deploy.sh` o workflow equivalente: si `GROWTH_AI_VISIBILITY_GOOGLE_AIO_ENABLED=true`, exigir `DATAFORSEO_API_LOGIN` no vacio y `DATAFORSEO_API_PASSWORD_SECRET_REF` no vacio antes de desplegar.
- El guard debe imprimir mensaje accionable sin valores secretos: que variable falta, donde se espera (`GitHub Actions secret` vs `Secret Manager ref`) y como revertir (`GOOGLE_AIO=false`).
- Cubrir el guard con test o script check si el repo ya tiene harness para deploy scripts; si no, documentar smoke manual reproducible.

### Slice 2 — Worker env verification

- Agregar/verificar un check post-deploy que lea la revision viva de `ops-worker` y confirme que los env names esperados existen cuando AIO esta ON.
- Confirmar `secretAccessor` del service account para `greenhouse-dataforseo-api-password`.
- Actualizar `FEATURE_FLAG_STATE_LEDGER` para que el estado productivo de Google AIO declare explicitamente worker env como source of truth.

### Slice 3 — Provider-scoped smoke real

- Ejecutar un smoke low-volume en staging/production segun corresponda, scopeado a `onlyProviders:['google_ai_overview']` o camino equivalente, drenado por `ops-worker`.
- Validar en PG que el run nuevo tiene observations `google_ai_overview` con `status in ('succeeded','skipped')` y `error_code is distinct from 'missing_secret'`.
- Guardar evidencia operacional en `Handoff.md` y actualizar el runbook si el comando final difiere del actual.

## Out of Scope

- Agregar Anthropic/Claude al modo publico `light`. Hoy `light` excluye Anthropic por costo/latencia en `src/lib/growth/ai-visibility/policy.ts`; si producto quiere mostrar/medir Claude publicamente, crear task separada.
- Cambiar copy o UI del reporte publico, incluyendo el banner "informe parcial".
- Cambiar scoring, normalizer, report builder o `ReportArtifactModel`.
- Reprocesar/backfillear reportes historicos parciales.
- Rotar credenciales DataForSEO/Perplexity si exige ventana operacional separada; esta task puede coordinarlo o dejarlo como prerequisito explicito, pero no debe imprimir ni mover secretos en docs.

## Detailed Spec

El criterio de aceptacion funcional no es "DataForSEO siempre succeeded". Google puede no devolver AI Overview para una query real. El criterio es:

- Configuracion OK: `isDataForSeoConfigured()` seria true en el runtime del worker.
- Provider corrio: no aparece `error_code='missing_secret'`.
- Resultado honesto:
  - `succeeded` cuando DataForSEO devuelve bloque AI Mode/AI Overview con contenido parseable.
  - `skipped:no_ai_overview_block` cuando DataForSEO responde 200 pero Google no mostro bloque AI.
  - `failed` solo si hubo fallo real externo/runtime, con error sanitizado.

Query PG sugerida para evidencia (ajustar al schema real en Discovery):

```sql
select
  run_id,
  provider,
  status,
  error_code,
  created_at
from greenhouse_growth.provider_observations
where provider = 'google_ai_overview'
  and created_at >= now() - interval '2 hours'
order by created_at desc;
```

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (guard de deploy) -> Slice 2 (worker env verification) -> Slice 3 (smoke real).
- No ejecutar smoke productivo hasta que el guard y la verificacion de env del worker esten listos.
- Si falta `DATAFORSEO_API_LOGIN`, elegir entre poblar el secret de GitHub Actions o mantener `GROWTH_AI_VISIBILITY_GOOGLE_AIO_ENABLED=false`; no desplegar un estado intermedio con flag ON.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Deploy productivo queda bloqueado por secret ausente | ops-worker deploy | medium | Mensaje accionable + opcion de revertir `GROWTH_AI_VISIBILITY_GOOGLE_AIO_ENABLED=false` | GitHub Actions failure en deploy |
| Smoke real consume costo inesperado | DataForSEO billing | low | Provider-scoped, low-volume, 1 run, sin batch/backfill | cost en `provider_observations.usage` / DataForSEO dashboard |
| Se confunde Vercel env con runtime real | release/ops | medium | Post-deploy check sobre Cloud Run revision viva; docs ledger actualizados | `missing_secret` reaparece en observations |
| Secret value se filtra en logs | security | low | Nunca imprimir valores, solo presencia/nombre de env/ref | revision de logs Actions/Cloud Run |

### Feature flags / cutover

- `GROWTH_AI_VISIBILITY_GOOGLE_AIO_ENABLED` controla el provider. Revert inmediato: setearlo `false` en `ops-worker` y redeploy.
- `DATAFORSEO_API_LOGIN` y `DATAFORSEO_API_PASSWORD_SECRET_REF` no son flags; son prerequisitos de integracion cuando el flag esta ON.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR o set `GROWTH_AI_VISIBILITY_GOOGLE_AIO_ENABLED=false` para no activar guard | <10 min | si |
| Slice 2 | revert check post-deploy; no toca runtime del provider | <10 min | si |
| Slice 3 | detener smoke; no hay backfill ni mutacion masiva | inmediato | si |

### Production verification sequence

1. Confirmar `DATAFORSEO_API_LOGIN` existe como GitHub Actions secret y no se imprime.
2. Confirmar `greenhouse-dataforseo-api-password` existe en Secret Manager y el service account del worker tiene `secretAccessor`.
3. Deploy `ops-worker` con guard activo.
4. `gcloud run services describe ops-worker ...` confirma que la revision viva expone `GROWTH_AI_VISIBILITY_GOOGLE_AIO_ENABLED`, `DATAFORSEO_API_LOGIN` y `DATAFORSEO_API_PASSWORD_SECRET_REF` cuando AIO esta ON.
5. Ejecutar smoke `google_ai_overview` low-volume drenado por worker.
6. Query PG confirma fresh observations sin `missing_secret`.
7. Abrir un reporte publico nuevo y confirmar que `gate.status` solo queda `partial` por causas reales distintas a config missing.

### Out-of-band coordination required

- Confirmar/actualizar GitHub Actions secret `DATAFORSEO_API_LOGIN`.
- Confirmar Secret Manager ref `greenhouse-dataforseo-api-password` y permisos IAM.
- Decidir si se rota el password DataForSEO antes o durante el rollout por el riesgo historico documentado en `FEATURE_FLAG_STATE_LEDGER.md`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `ops-worker` no puede desplegar con `GROWTH_AI_VISIBILITY_GOOGLE_AIO_ENABLED=true` y DataForSEO login/password ref ausentes sin fallar loud. — Sin tildar: el guard está probado localmente (el deploy real sin login falla antes de Cloud Build), pero el commit `54610ae96` no está en `origin/develop`; falta push autorizado y ver el workflow `ops-worker-deploy` ejecutarlo.
- [x] La revision viva de Cloud Run `ops-worker` muestra los env names DataForSEO esperados cuando AIO esta ON.
- [x] Smoke real low-volume de `google_ai_overview` drenado por worker crea observations sin `error_code='missing_secret'`. — Run `grun-61619c42-9d77-4f71-a9f7-b546e815544c` (EO-GRUN-00055), 6/6 `succeeded`, `status_code=20000`, USD 0,024; PG confirma 0 `missing_secret` desde 2026-07-05.
- [x] `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` y `docs/manual-de-uso/growth/ai-visibility-grader-smoke.md` quedan sincronizados con la verdad worker-vs-Vercel.
- [x] No se cambia UI/reporte/scoring ni se oculta el estado `partial`.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/lib/ai/__tests__/dataforseo.test.ts src/lib/growth/ai-visibility/__tests__/google-ai-overview-adapter.test.ts`
- `gcloud run services describe ops-worker --project efeonce-group --region <region>` (ajustar region real) para env names.
- `pnpm growth:ai-visibility:smoke` o endpoint admin con `onlyProviders:['google_ai_overview']` segun runbook.
- Query read-only en PG sobre `greenhouse_growth.provider_observations` para confirmar no `missing_secret`.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre TASK-1265, TASK-1327 y el ledger de flags
- [ ] evidencia runtime del worker + PG quedo pegada en `Handoff.md` o en el Delta de la task

## Follow-ups

- Product decision separada: si el roster publico muestra Claude, decidir si `light` debe incluir Anthropic o si el copy/roster debe explicar que Claude se reserva para diagnosticos completos.
- Si el smoke detecta `no_ai_overview_block` sistematico, evaluar prompt/query pack especifico para AI Search (sin cambiar esta task de config).

## Open Questions

- Resuelta 2026-09-19: la recuperación usa la credencial vigente; rotación separada, sin cambiar secretos ni IAM.


## Audit / Plan — 2026-09-19, ISSUE-175

- Operador: «Corrígelo», precedido de «Avanza todo sin preguntarme». Ejecución sin checkpoint adicional de goal; checkout compartido `develop`, sin worktrees ni subagentes. WIP de HubSpot y TASK-1877 excluido.
- Runtime verificado: login ausente en `ops-worker-00697-59f`; login local funcional y secret GitHub presente. El alcance incluye ahora SEO/discovery además de AIO, pues comparten cliente y configuración.
- Reuso: cliente DataForSEO, runner discovery, gate/spend canónicos y deploy existente. Sin schema, flags nuevos, grants, rotación ni cambio de UI.
- Canon: cloud governance, cloud security posture, OPS_RELIABILITY_AGENT_INVARIANTS y arquitectura SEO. Corrección del contrato de despliegue existente; sin nueva decisión de topología/SSOT.
- Plan: (1) guard local probado y error tipado; (2) restauración env sobre imagen desplegada y comparación del resto de config; (3) preview + canary discovery propio en worker, presupuesto máximo USD 0.07 (preview conservador USD 0.0612); (4) evidencia, docs y gates. Smoke AIO separado sólo si puede realizarse sin ampliar alcance/costo.
- No-regresión: credenciales configuradas conservan transporte y spend; flags deshabilitados permiten despliegue sin DataForSEO. Falla de configuración no abre breaker ni finge requests pagadas.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `services/ops-worker`, `src/lib/ai/dataforseo.ts`, `src/lib/growth/seo/keyword-discovery`.
- Future candidate home: `remain-shared`.
- Boundary: cliente proveedor canónico; deploy/check del worker; runner de discovery.
- Server/browser split: configuración y secretos sólo server/tooling; sin imports al browser.
- Build impact: sin dependencias nuevas; helper de despliegue en `services/ops-worker`.
- Extraction blocker: credenciales/runtime y gate/spend del dominio SEO.


## Evidencia / estado al 2026-09-19

[ISSUE-175 resuelto](../../issues/resolved/ISSUE-175-dataforseo-worker-login-missing.md): revisión `ops-worker-00698-9m9`, mismo digest y GIT_SHA que 00697, únicamente login restaurado. Canary discovery `seokdr-43c277a6-b109-4110-9693-c280f2344846` por scheduler: `succeeded`, 10 candidatos, USD 0.0132; ledger reconciliado (8 → 9 llamadas; USD 0.1080 → 0.1212). No se vuelven a encolar las tres corridas originales.

Implementación en develop: `services/ops-worker/dataforseo-config.mjs` valida antes de build y lee todas las revisiones que reciben tráfico; workflow ejecuta el check incluso si salta el deploy. Ambos consumers (SEO y AIO) exigen login/ref. `DataForSeoConfigurationError` distingue configuración ausente; discovery interrumpe el batch, conserva cualquier resultado/costo previo y no cuenta una llamada que nunca salió.

59 tests focales verdes, incluidos 5 de deploy/config en el runner normal de Vitest. La prueba de regresión ejecuta el deploy real sin login y comprueba que falla antes de Cloud Build; no afirma strings del script como sustituto del comportamiento. Gates de build inputs, runtime deps y cobertura de rutas verdes.

AC guard: implementado/probado en develop, casilla abierta hasta integrar código y verificar el pipeline. AC smoke AIO: pendiente; la verificación Labs confirma credenciales/transporte/ledger desde worker, no el adapter AIO ni sus observaciones. Sin push ni promoción de código en esta recuperación. No declarar complete.


### Cierre QA del slice

- `pnpm exec tsc --noEmit --incremental --pretty false` y ESLint sobre los siete archivos JS/TS propios: PASS. 59 tests de seis suites: PASS.

- `task:lint --task TASK-1341`: 0 errores/advertencias. `ops:lint --changed`: 0 errores; 14 advertencias preexistentes de paridad epic/children fuera del alcance.
- `worker:build-contract-gate`, `worker:runtime-deps-gate`, `worker:deploy-path-gate`: PASS; este último bundlea realmente los cinco workers (ops-worker: 1547 archivos).
- `skills:mirrors`, `git diff --check`, `bash -n services/ops-worker/deploy.sh`: PASS.
- Arquitectura/ADR: se conserva la decisión SEO §1.2 de cliente/ledger compartidos y el contrato de configuración propia de cada runtime (cloud governance + OPS_RELIABILITY_AGENT_INVARIANTS); no cambia source of truth, IAM, workflow_call, EXPECTED_SHA, GIT_SHA ni manifest de release.
- Documentación: issue, task, manuales, arquitectura, ledger, context/handoff/changelog y skills espejo sincronizados. La advertencia `architecture_doc_monolith` ya existía en la arquitectura SEO; se editó un contrato en §1.2, sin añadir una sección Delta ni hacer un refactor ajeno.
- No se corrió build Next.js ni suite completa: no cambió UI ni runtime desplegado de código; tsc, lint focal, tests del transporte/consumers y los bundles del gate de workers cubren el cambio local. No se ejecutó un release ni se infiere publicación del guard local.

### Smoke AIO (Slice 3) — 2026-09-19

- Runtime: `ops-worker-00698-9m9` (100 % del tráfico) con `GROWTH_AI_VISIBILITY_GOOGLE_AIO_ENABLED=true`, `DATAFORSEO_API_LOGIN` presente y `DATAFORSEO_API_PASSWORD_SECRET_REF=greenhouse-dataforseo-api-password` (sólo se leyó presencia, nunca valores).
- Run: `pnpm staging:request POST /api/admin/growth/ai-visibility/runs` con `mode=light`, `runKind=smoke`, `onlyProviders:["google_ai_overview"]`, `idempotencyKey=task-1341-aio-smoke-2026-09-19` → HTTP 202, encolado; el worker lo tomó a las 16:25:05Z y terminó `succeeded` a las 16:26:03Z.
- Resultado: 6/6 observaciones `google_ai_overview` `succeeded`, `usage.dataforseo_status_code=20000`, endpoint `/v3/serp/google/ai_mode/live/advanced`, USD 0,004 cada una (USD 0,024 total, techo 0,50), citas 5/4/2/4/6/4.
- PG read-only: en las últimas 2 h sólo hay esas 6 filas (`succeeded`, `error_code` nulo). Histórico de `missing_secret` para el provider: 12 filas, la última el 2026-07-05; ninguna después.
- Queda abierto sólo el AC del guard: requiere push a `develop` y una corrida del workflow que lo ejecute. No se hizo push en esta sesión.
