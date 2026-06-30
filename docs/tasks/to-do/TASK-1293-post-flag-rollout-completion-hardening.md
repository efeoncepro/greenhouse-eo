# TASK-1293 — Post-flag-rollout completion & hardening (release 056c2dde8)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
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
- Backend impact: `integration`
- Epic: `EPIC-020`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `ops`
- Blocked by: `none`
- Branch: `task/TASK-1293-post-flag-rollout-completion-hardening`

## Summary

Cierra la deuda operativa que dejó el rollout agresivo de flags sobre el release `develop→main 056c2dde8` (2026-06-29/30), donde el operador autorizó prender en producción casi todo el catálogo de flags Growth/AEO + Kortex + Notion writebacks + PPM con riesgos aceptados. Quedaron pendientes acciones que NO son flags: rotar 3 credenciales expuestas, crear la property Notion `[GH] OTD` (sin ella el OTD writeback da error client-facing), persistir en `deploy.sh` los flags del ops-worker que hoy están sólo vía `gcloud --update-env-vars` (efímeros), forzar un build fresco para el mirror `NEXT_PUBLIC_*`, y validar la cifra del PPM (hoy ON con tasa placeholder sin validar).

## Why This Task Exists

Durante el paso a producción del 2026-06-29/30, para destrabar el lead magnet AEO y el resto del catálogo, el operador autorizó explícitamente (con riesgos aceptados) prender en prod: los 31 flags Growth/AEO, Kortex bridge (incl. `LIVE_EXECUTE`), Comparison-table, PPM, y los Notion writebacks (OTD/RPA/FTR) + attributable-lateness. Tres consecuencias quedaron abiertas y no son un flag flip:

1. **Credenciales expuestas en chat/captura** (Turnstile secret, Perplexity key, DataForSEO password) corriendo en prod sin rotar — riesgo de abuso/costo de terceros.
2. **`NOTION_OTD_WRITEBACK_ENABLED` ON sin la property `[GH] OTD`** creada en los Notion de Efeonce + Sky → el writeback da error client-facing en cada corrida.
3. **Flags del ops-worker aplicados sólo vía `gcloud`** (`CATEGORY_GUARD`, `NOTION_OTD/FTR_WRITEBACK` + per-cliente) son **efímeros**: el `deploy.sh` los declara `false`/ausentes, el próximo push a `develop` (deploy staging del worker compartido) los resetea. `CATEGORY_GUARD=false` además está documentado como gating intencional de ISSUE-110/TASK-1291 (ON bloquea el lead magnet).
4. **`NEXT_PUBLIC_NEXA_INTERACTION_LANE_ENABLED`** no surfacea client-side hasta un build fresco (se hornea en build; el redeploy reusó build).
5. **`PPM_POSITION_ENABLED` ON con tasa placeholder 0.25% sin validación contable** → publica una posición fiscal posiblemente errada como oficial.

## Goal

- Rotar y republicar las 3 credenciales expuestas, dejando los consumers verdes.
- Crear la property `[GH] OTD` en los workspaces Notion de Efeonce + Sky y verificar que el OTD writeback deja de errorar.
- Persistir de forma gobernada (en `deploy.sh`, con decisión documentada) los flags del ops-worker que el operador dejó ON, o revertirlos si la decisión es no persistirlos.
- Forzar el build fresco que surfacea el lane NEXT_PUBLIC de Nexa.
- Validar/contabilizar la tasa PPM real o apagar `PPM_POSITION_ENABLED` hasta tener la cifra confirmada.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (Deltas 2026-06-29/30 — estado live de los flags prendidos)
- `docs/architecture/agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md` (ops-worker / deploy.sh `--set-env-vars` destructivo → defaults declarativos)
- `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md` (Notion writeback `[GH] <métrica>` read-only)

Reglas obligatorias:

- **CLAUDE.md Secret Manager Hygiene** + auth resilience: rotar con `pnpm secrets:rotate` cuando aplique (verify-before-cutover); publicar scalar crudo; verificar el consumer real post-rotación.
- **NUNCA** loggear/pegar el valor crudo de una credencial; usar Secret Manager + `*_SECRET_REF`.
- Notion: el token ES el scope; el `[GH] OTD` es una select read-only, NUNCA editar fórmulas de cliente (Notion = OS, Greenhouse = motor).
- ops-worker: defaults declarativos en `deploy.sh` para que `--set-env-vars` no los borre (lección TASK-912).

## Normative Docs

- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- `docs/tasks/to-do/TASK-1291-aeo-operator-validation-gate-crosssell-reenable.md` (gating de `CATEGORY_GUARD`/operator-send por ISSUE-110)
- `docs/tasks/complete/TASK-927-notion-otd-writeback.md` [verificar] (property `[GH] OTD` + per-cliente)

## Dependencies & Impact

### Depends on

- Valores nuevos de las 3 credenciales (out-of-band: el operador genera en Cloudflare / Perplexity / DataForSEO).
- Acceso Notion a los teamspaces de Efeonce + Sky (tokens per-cliente ya registrados).

### Blocks / Impacts

- `GROWTH_AI_VISIBILITY_PERPLEXITY_ENABLED` / `GROWTH_AI_VISIBILITY_GOOGLE_AIO_ENABLED` (corren con creds expuestas hasta rotar).
- `NOTION_OTD_WRITEBACK_ENABLED` (+ `_EFEONCE`/`_SKY`) — errorea hasta la property.
- TASK-1291 (decisión de `CATEGORY_GUARD` en prod).

### Files owned

- `services/ops-worker/deploy.sh`
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- `docs/issues/` (si la exposición de credenciales se documenta como ISSUE)

## Current Repo State

### Already exists

- `deploy.sh` ya persiste `:-true`: `NOTION_RPA_WRITEBACK_ENABLED` (L284), `NOTION_DUE_DATE_CAPTURE_ENABLED` (L294), `ATTRIBUTABLE_LATENESS_OTD_ENABLED` (L303, **shadow-only — NO toca el bono**).
- `pnpm secrets:rotate` / `pnpm secrets:audit` (playbook de rotación con verify-before-cutover).
- Los flags Growth/AEO ramificados por ENV en `deploy.sh` (bloque `if ENV=staging`).

### Gap

- `deploy.sh` NO declara `NOTION_OTD_WRITEBACK_ENABLED` (+per-cliente), `NOTION_FTR_WRITEBACK_ENABLED` (+per-cliente) ni un `CATEGORY_GUARD=true` (está `false`) → los seteos vía `gcloud` (rev `ops-worker-00432-9nf`) son efímeros.
- La property `[GH] OTD` no existe en los Notion de Efeonce + Sky [verificar].
- Tasa PPM real sin capturar (placeholder 0.25% en `ppm_rate_config`).

## Backend/Data Contract

- **Source of truth:** Secret Manager (credenciales, vía `*_SECRET_REF`); `services/ops-worker/deploy.sh` (defaults declarativos de flags del worker); `greenhouse_finance.ppm_rate_config` (tasa PPM); Notion workspace (property `[GH] OTD`, read-only desde Greenhouse).
- **Contract surface:** `pnpm secrets:rotate`; `deploy.sh` (`ENV=production` / `ENV=staging`); el consumer reactivo `notion_otd_writeback`; endpoint `GET /api/finance/ppm/monthly-position`.
- **Data invariants:** las credenciales se publican como scalar crudo (sin comillas/newline); el `[GH] OTD` es select read-only (Greenhouse nunca escribe fórmulas de cliente); el PPM no se expone como oficial con tasa placeholder.
- **Tenant/access boundary:** Notion per-cliente (token = scope Efeonce vs Sky); secrets accedidos por `greenhouse-portal@` (binding ya existente).
- **Idempotency/concurrency:** rotación verify-before-cutover (revert si health falla); crear property Notion es idempotente (skip si existe); `deploy.sh` redeploy es idempotente.
- **Migration/backfill/rollback posture:** sin migración SQL. Rollback de cada credencial = republicar versión previa; rollback de flags del worker = `gcloud ... --update-env-vars <FLAG>=false` o revertir el `deploy.sh`.
- **Sensitive data/error posture:** NUNCA loggear el valor crudo de una credencial; el OTD writeback debe degradar honesto si la property falta (no error client-facing repetido).
- **Audit/signal posture:** reusar signals existentes — `growth.ai_visibility.report_email_failed` / `operator_send_failed` (provider health), writeback reliability signals; considerar documentar la exposición como ISSUE.
- **Runtime evidence:** post-rotación, verificar consumer real (un run grader con Perplexity/AIO; `/api/auth/health` para Turnstile path); un OTD writeback real sin error a Notion; `GET /api/finance/ppm/monthly-position` con `enabled:true` y cifra validada.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Rotar las 3 credenciales expuestas

- Rotar Turnstile secret (Cloudflare → Rotate Secret Key) → `vercel env add TURNSTILE_SECRET production` + redeploy; verificar el intake público acepta un token válido.
- Rotar Perplexity key → nueva versión de `greenhouse-perplexity-api-key` en Secret Manager; verificar un run grader real con Perplexity.
- Rotar DataForSEO password → nueva versión del secret DataForSEO; verificar un run con Google AI Overview.

### Slice 2 — Property Notion `[GH] OTD` + verificación del writeback

- Crear la select read-only `[GH] OTD` en los Notion de Efeonce + Sky (token per-cliente).
- Ejecutar un writeback real (o `gcloud` smoke del job `ops-otd-writeback`) y verificar PATCH OK, sin error client-facing.

### Slice 3 — Persistir (o revertir) flags del ops-worker en `deploy.sh`

- Decisión gobernada por flag, documentada en el comentario del `deploy.sh`:
  - `NOTION_OTD_WRITEBACK_ENABLED` (+ `_EFEONCE`/`_SKY`) y `NOTION_FTR_WRITEBACK_ENABLED` (+per-cliente): declarar `:-true` (mirror del patrón RPA L284) **sólo después de la property (Slice 2)**.
  - `CATEGORY_GUARD`: persistir `true` SÓLO si el operador confirma override del gating de ISSUE-110/TASK-1291; si no, dejar `false` y revertir el seteo `gcloud` efímero.
- Redeploy del worker y verificar `gcloud run services describe ops-worker` refleja los valores.

### Slice 4 — Build fresco NEXT_PUBLIC + validación PPM

- Forzar un build fresco para que `NEXT_PUBLIC_NEXA_INTERACTION_LANE_ENABLED` surfacee client-side (push o redeploy sin build cache).
- Validar la tasa PPM real con contabilidad; actualizar `ppm_rate_config` o apagar `PPM_POSITION_ENABLED` hasta tener la cifra confirmada.

## Out of Scope

- No re-evalúa la decisión de prender Kortex `LIVE_EXECUTE` ni los demás flags Growth/AEO ya ON (fueron autorización explícita del operador).
- No implementa el cutover del bono de OTD imputable (M3, TASK futura gated).
- No toca el scoring del grader ni el motor de prompts (EPIC-021 cerrado).
- No crea la UI de ningún flag.

## Detailed Spec

Ver el ledger (`docs/operations/FEATURE_FLAG_STATE_LEDGER.md`, Deltas 2026-06-29/30) para el estado exacto de cada flag y el redeploy `greenhouse-psl47zug8`. La revisión live del worker es `ops-worker-00432-9nf`.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 2 (property `[GH] OTD`) **DEBE** cerrar antes de persistir `NOTION_OTD_WRITEBACK` en Slice 3 (sin property, persistir el writeback = error client-facing permanente).
- Slice 1 (rotar creds) es independiente y puede correr en paralelo.
- Slice 3 `CATEGORY_GUARD` requiere confirmación del operador (gating ISSUE-110) antes de tocar el default.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Rotación rompe el consumer (key mal publicada) | integration/secrets | medium | verify-before-cutover (`pnpm secrets:rotate`), revert a versión previa | `growth.ai_visibility.*_failed`, `/api/auth/health` |
| OTD writeback errorea sin la property | sync (Notion cliente) | high | crear property ANTES de persistir el flag; degradación honesta | writeback reliability signal |
| `CATEGORY_GUARD=true` bloquea el lead magnet | growth | medium | confirmar override operador; default `false` si no | `growth.ai_visibility.profile_category_unresolved` |
| PPM publica cifra errada como oficial | finance/fiscal | high | validación contable o apagar el flag hasta confirmar | revisión manual del F29 |
| Credencial expuesta abusada antes de rotar | secrets | medium | rotar ASAP; documentar como ISSUE | costo/uso anómalo del provider |

### Feature flags / cutover

- Todos reversibles via `vercel env rm` / `gcloud ... --update-env-vars <FLAG>=false` + redeploy (<5 min). `PPM_POSITION_ENABLED` apagable instantáneo si la cifra no valida.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | republicar versión previa del secret + redeploy | <10 min | si |
| Slice 2 | el writeback degrada honesto; borrar la property si fuese necesario | <10 min | si |
| Slice 3 | `gcloud ... --update-env-vars <FLAG>=false` o revert del `deploy.sh` | <5 min | si |
| Slice 4 | `vercel env rm PPM_POSITION_ENABLED production` + redeploy | <5 min | si |

### Production verification sequence

1. Slice 1: rotar cada credencial → verificar consumer real (run grader / health) antes de la siguiente.
2. Slice 2: crear property en staging-equivalente (mismo Notion live) → smoke writeback → verificar PATCH sin error.
3. Slice 3: editar `deploy.sh` → push develop (deploy staging worker) → `gcloud run services describe` verifica valores → confirmar OTD no errorea.
4. Slice 4: build fresco → verificar el lane aparece client-side; validar PPM con contabilidad antes de dejar el flag ON.

### Out-of-band coordination required

- Operador genera las 3 credenciales nuevas (Cloudflare / Perplexity / DataForSEO).
- Contabilidad confirma la tasa PPM real.
- Confirmación del operador sobre el override de `CATEGORY_GUARD` (gating ISSUE-110/TASK-1291).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Las 3 credenciales fueron rotadas, republicadas en Secret Manager/Vercel, y su consumer real verificado verde.
- [ ] La property `[GH] OTD` existe en los Notion de Efeonce + Sky y un writeback real corre sin error client-facing.
- [ ] Los flags del ops-worker quedaron persistidos en `deploy.sh` (o revertidos), con la decisión documentada en el comentario; `gcloud run services describe ops-worker` refleja el estado.
- [ ] `NEXT_PUBLIC_NEXA_INTERACTION_LANE_ENABLED` surfacea client-side tras build fresco.
- [ ] `PPM_POSITION_ENABLED` quedó con tasa validada por contabilidad o apagado hasta confirmarla.
- [ ] El ledger `FEATURE_FLAG_STATE_LEDGER.md` quedó sincronizado con el estado final.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- Verificación runtime: run grader real (Perplexity + AIO) post-rotación; OTD writeback real; `GET /api/finance/ppm/monthly-position`.

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` sincronizado con el cierre
- [ ] `Handoff.md` actualizado
- [ ] `changelog.md` actualizado si cambió comportamiento visible
- [ ] chequeo de impacto cruzado (TASK-1291, TASK-927)
- [ ] ledger `FEATURE_FLAG_STATE_LEDGER.md` actualizado con el estado final

## Follow-ups

- Considerar documentar la exposición de credenciales (Turnstile/Perplexity/DataForSEO) como ISSUE para trazabilidad.
- Revisar si el ops-worker compartido staging+prod debería separarse (los flags de prod dependen del último deploy, dominado por pushes a develop).

## Open Questions

- ¿`CATEGORY_GUARD` queda ON en prod (override de ISSUE-110) o se revierte a `false` hasta TASK-1291?
- ¿Los Notion writebacks OTD/FTR se quieren persistir para ambos clientes (Efeonce + Sky) o sólo uno?
