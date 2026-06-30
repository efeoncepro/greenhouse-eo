---
description: Paso a producción Greenhouse (develop→main) vía control plane — preflight → promoción → orquestador → approval gate → workers + Vercel + Azure → health → manifest → watchdog → flags. Conservador por diseño.
argument-hint: "[target-sha | release goal | rollback | watchdog | drift | incident/break-glass context]"
---

# Paso a producción `$ARGUMENTS`

Vas a operar el **control plane de release** de Greenhouse según `$ARGUMENTS` (puede ser un SHA objetivo, un goal de release, o un modo: `rollback` / `watchdog` / `drift` / `break-glass`). Si viene vacío, asume **release normal del HEAD verde de `develop`** y confirma el SHA conmigo antes de promover.

> **PRIMER PASO OBLIGATORIO: invocá la skill `greenhouse-production-release`** (vía la herramienta Skill). Ella es la **fuente de verdad** del flujo, las hard rules y el contrato de mantenimiento. Este command es solo el **harness de proceso + checklist de gates**: NO re-declara reglas. Si este harness contradice a la skill o a `CLAUDE.md`/`AGENTS.md`, gana la skill/`CLAUDE.md` — y avísame para corregir el command (ver "Auto-mantenimiento" al final).

> **El release es un workflow de control plane, no una secuencia de comandos de deploy ad hoc.** Conservador por defecto. La fuente de verdad del estado de producción es Postgres (`greenhouse_sync.release_manifests` + `release_state_transitions`), append-only; GitHub/Vercel/Cloud Run/Azure son evidencia y efectores, no reemplazan el manifest.

Comunicación: español neutro latinoamericano (sin voseo/modismos argentinos).

---

## Regla de oro de mutaciones externas (NO negociable)

**NUNCA** ejecutes `git push`, `gh workflow run`, approval gate, Cloud Run deploy, promoción Vercel, rollback, `vercel env add`, ni transición de estado del manifest **sin mi aprobación explícita para ESA mutación concreta**. Aprobar un paso ≠ aprobar el siguiente. Tu trabajo por defecto es **leer, diagnosticar y proponer el comando exacto**; yo lo autorizo. Lo único que corres libre es lo read-only (preflight exploratorio, `git status`, `gh run list`, `release:watchdog --json`, lecturas SQL).

## 0. Reads canónicos (leé solo lo que el modo necesita, en este orden)

- `AGENTS.md` · `CLAUDE.md` · `project_context.md` · `Handoff.md`
- **`docs/operations/FEATURE_FLAG_STATE_LEDGER.md` → `§ Pendientes de acción` — OBLIGATORIO en TODO paso a producción.** Hay features `code-complete` cuyo flag `*_ENABLED` (default OFF) debe **prenderse en prod junto a este release** (a veces + migración/ops-worker). El deploy del código NO los activa; qué prender se lee de acá, no de la memoria.
- `docs/architecture/GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md` → §"Invariantes operativos para agentes"
- `docs/operations/runbooks/production-release.md` (decision tree, batch policy, post-deploy checklist, rollback, signals)
- `.github/workflows/production-release.yml` · `src/lib/release/workflow-allowlist.ts`
- **Si el orquestador falló:** `docs/operations/PRODUCTION_RELEASE_INCIDENT_PLAYBOOK_V1.md` (OBLIGATORIO — leé el JSON de salida como diagnóstico, no chasees el gate).
- **Si rollback / watchdog / Azure / Vercel / HubSpot:** runbook + manual del watchdog + los workflows de workers/Azure (lista en la skill).

## Hard rules (resumen — la versión vinculante vive en la skill)

- Un `push:main` **NO es** un release completo. Todo commit en `main` debe quedar trackeado por un manifest → dispará el orquestador con `target_sha=<HEAD del push>` inmediatamente. Sin excepciones fuera de break-glass (ni hotfix trivial ni doc-only).
- NO aprobar gates de workers individuales como camino normal; el orquestador los corre vía `workflow_call`. NO reintroducir deploy de workers por `push:main`. NO bypassear `production-release.yml` "porque los workers ya deployaron".
- NO cherry-pick a `main` de un commit que ya existe en `develop` (SHAs duplicados, audit trail roto). Hotfix canónico: branch desde `main` → fix → PR → merge → orquestador → cherry-pick de vuelta a `develop`.
- NO mutar `release_manifests`/`release_state_transitions` por SQL crudo (usar CLIs/helpers; append-only). NO marcar `released` si el health post-release soft-falló → es `degraded`. NO `bypass_preflight` fuera de incident mode con post-mortem comprometido.
- NO disparar el orquestador **<8 min post-push a `main`** (Vercel BUILDING race). NO revertir el `cancel-in-progress` dinámico de los worker workflows a `false` literal (deadlock).

---

## Modo A — Release normal (camino canónico)

1. **Estado**: confirmá rama, remotes, worktree limpio. Confirmá que `develop` está verde (CI + Playwright smoke) y que ningún cambio local no relacionado entra. Fijá el `target_sha` (HEAD de `develop`) y confirmámelo.
2. **Batch policy**: validá contra la matriz del runbook (§2.2) que el release es **un bloque funcional coherente, reversible, con rollback explicable en una frase**. Si se describe con "también incluye…", o mezcla dominios sensibles (payroll/finance/auth/infra/migration) sin dependencia declarada → STOP, reportá y partilo.
3. **Preflight** (read-only primero):
   - exploratorio: `pnpm release:preflight --target-sha=<sha> --target-branch=main`
   - gate: `pnpm release:preflight --json --fail-on-error --output-file=<path> --target-sha=<sha> --target-branch=main`
   - cualquier `readyToDeploy=false` (degraded/unknown) **bloquea**. NO promuevas.
4. **Promoción a `main`** (mutación → pedí aprobación): PR/merge aprobado del SHA exacto. El orquestador espera que `target_sha` ya exista en `main`. Vercel auto-deploya production en el push; el orquestador espera ese deployment READY.
5. **Dispatch del orquestador** (mutación → pedí aprobación; respetá el ≥8 min post-push):
   ```bash
   gh workflow run production-release.yml --ref main \
     -f target_sha=<40-char-sha> -f force_infra_deploy=false
   ```
6. **Approval gate** (mutación → pedí aprobación): aprobá el gate del environment `Production` del **`Production Release Orchestrator`**, NO runs de workers sueltos ni runs stale (>24h → cancelá primero con `gh run cancel <id>`).
7. **Observá el orquestador completo**: preflight → record-started → approval-gate → 4 workers (`workflow_call`) → Azure gated → Vercel READY → `/api/auth/health` → transición de manifest a `released` | `degraded`.
8. **Watchdog** (read-only por ahora; el workflow está manual-only hasta TASK-920): `pnpm release:watchdog --json` → esperá `drift_count=0` y `4/4 workers synced`.
9. **Verificá Cloud Run `GIT_SHA`** de los servicios mapeados cuando aplique: `ops-worker`, `commercial-cost-worker`, `ico-batch-worker` (us-east4), `hubspot-greenhouse-integration` (us-central1).
10. **Post-deploy checklist** (runbook §4): Vercel production Ready · workers Ready · Sentry sin errors nuevos `release:<sha>` · smoke real (login, `/finance/cash-out`, `/agency/operations`, `/admin/operations`) · signals `Platform Release` OK.
11. **Flags pendientes de este release** (mutación → pedí aprobación por flag): releé `FEATURE_FLAG_STATE_LEDGER.md` → `§ Pendientes de acción`. Por cada flag gated a este release: `vercel env add <FLAG>=true Production` (+ `gcloud run services update ops-worker --update-env-vars …` si corre en el worker) + redeploy + smoke del flujo en prod + actualizá la fila del ledger (snapshot por environment). Si un flag requería su migración en prod, confirmá que entró por este release antes de prenderlo. **El deploy del código no prende nada.**

## Modo B — Rollback

Solo si post-deploy falla. Capability `platform.release.rollback` (EFEONCE_ADMIN). Decision tree del runbook §7 (CRÍTICO=rollback inmediato · DEGRADED=forward-fix <2h · MENOR=forward-fix próximo ciclo). Identificá el `release_id` + `previous_*` del manifest, **dry-run primero** con `pnpm release:rollback … --dry-run`, revisá el plan, y solo con mi aprobación corré el apply. Azure NO tiene rollback automático: `az deployment group what-if` obligatorio antes de cualquier reapply de Bicep. Anotá en `Handoff.md` con razón + trigger de post-mortem.

## Modo C — Watchdog / Drift recovery

`pnpm release:watchdog --json`. Si reporta `platform.release.worker_revision_drift`, **no adivines**: leé el último manifest (SQL de lectura), compará `GIT_SHA` de cada servicio mapeado, clasificá la causa (orquestador incompleto / deploy directo / push parcial / manifest stale / fallo Cloud Run) y **preferí un re-intento fresco del orquestador** para el SHA verificado. Worker dispatch individual solo como break-glass aprobado. NO edites el manifest por SQL. Re-corré watchdog y documentá en `Handoff.md`.

## Modo D — Break-glass

Solo con incidente productivo activo y orquestación normal bloqueada. Requiere: aprobación explícita mía + razón en lenguaje claro + target SHA + servicio(s) afectado(s) + plan de rollback/forward-fix + plan de verificación + nota en `Handoff.md`. Aun en break-glass, reusá workflows y CLIs existentes antes de comandos cloud directos.

---

## Cierre y reporte

Reportá siempre (contrato de la skill): target SHA · estado de rama/remote · si se corrió el orquestador · workflow run id(s) · `release_id` + estado final del manifest · URL/dominio del deployment Vercel production · `GIT_SHA` de los servicios Cloud Run mapeados · resultado del watchdog · **qué NO se validó** · flags prendidos + fila del ledger actualizada · cualquier doc/skill actualizada.

**Documentación** (governor): si el flujo crítico cambió (workflow YAML, contrato `workflow_call`, state machine, mapeo Vercel/Cloud Run, semántica del watchdog, gating Azure/WIF), actualizá en el mismo change set todas las fuentes del **Skill Maintenance Contract** (ambas skills Codex+Claude, control plane spec, runbook, manuales, `workflow-allowlist.ts`, `AGENTS.md`, `CLAUDE.md`, `project_context.md`, `Handoff.md`, `changelog.md`).

---

## Auto-mantenimiento de este command

Si durante el release notás que este harness referencia un comando/gate/path/CLI **desactualizado** respecto a la skill / `CLAUDE.md` / runbook / `package.json`, **flaggéalo al final** y propené el edit a `.claude/commands/release.md`. La skill `greenhouse-production-release` es la autoridad; este command la sirve, no la sustituye.
