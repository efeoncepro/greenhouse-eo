# TASK-1646 — Cloud Infrastructure Doc Restructure (temáticos + HISTORIAL + router stub)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Medio`
- Effort: `Medio`
- Type: `policy`
- Execution profile: `standard`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `none`
- Epic: `none`
- Status real: `Complete (2026-08-05)`
- Rank: `TBD`
- Domain: `ops`
- Blocked by: `none`
- Branch: `develop (checkout compartido, sin worktrees)`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

`docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` (1340 líneas, 24 secciones `## Delta`
apiladas) se reestructura siguiendo el precedente UI Platform: docs temáticos con SÓLO estado
vigente bajo `docs/architecture/cloud-infrastructure/`, cronología completa en `HISTORIAL.md`,
y el archivo original convertido en router stub. Cierra el finding `architecture_doc_monolith`
de `pnpm docs:closure-check` y elimina las contradicciones entre deltas viejos y nuevos.

## Why This Task Exists

El patrón append-only del doc ya produjo una contradicción real con costo de discovery
(2026-08-05, TASK-1302): el `Delta 2026-04-15` presentaba la topología compartida
staging/producción como transitoria ("por ahora") cuando `services/ops-worker/deploy.sh` la
declara canónica. Además, los inventarios del doc (16 scheduler jobs, 13 crons Vercel, 3
workflows de deploy) están congelados en la auditoría live 2026-04-23 y contradicen el runtime
actual verificado en repo: `services/ops-worker/deploy.sh` declara 46 scheduler jobs,
`vercel.json` tiene 8 crons (ninguno de los 13 listados) y existen 7 workflows de deploy. Un
agente que lee el doc hoy obtiene un estado falso a menos que lea los 24 deltas y los reconcilie
a mano. La regla anti-monolito ya es canon del repo (ADR
`GREENHOUSE_UI_PLATFORM_RESTRUCTURE_DECISION_V1.md` + CLAUDE.md): "cambio vigente → doc
temático; cronología → HISTORIAL; nunca un monolito que mezcle ambos".

## Goal

- `docs/architecture/cloud-infrastructure/` con docs temáticos que contienen SÓLO estado vigente, re-verificado contra runtime/repo SoT (deploy.sh, vercel.json, workflows), cada uno con puntero explícito a su source of truth.
- `docs/architecture/cloud-infrastructure/HISTORIAL.md` con los 24 deltas `##` + 1 delta `###` embebido, cronológicos, sin pérdida de contenido, con anotaciones de supersede donde un delta viejo quedó contradicho.
- `GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` como router stub (mapa "dónde vive X"), mismo path para no romper referrers.
- ADR de la reestructuración + entrada en `DECISIONS_INDEX.md`; contradicciones resueltas documentadas (gana lo verificado contra runtime).
- `pnpm docs:closure-check` sin `architecture_doc_monolith` para ese path; `pnpm docs:context-check:strict` verde.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_UI_PLATFORM_RESTRUCTURE_DECISION_V1.md` (ADR precedente que esta task replica)
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md` (formato canónico del router stub)
- `docs/architecture/ui-platform/README.md` + `HISTORIAL.md` (formato canónico de índice + historial)
- `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md` (sigue siendo authoritative para postura de seguridad; los temáticos no la duplican)

Reglas obligatorias:

- Cero pérdida de contenido: lo que no encaja en ningún temático va al HISTORIAL, nunca se borra.
- Contradicción entre deltas: gana el estado verificado contra runtime/repo; el descartado queda anotado en HISTORIAL.
- El router stub conserva el path original; no se agrega contenido nuevo al stub.
- Los inventarios en temáticos declaran su as-of + source of truth (los `deploy.sh`, `vercel.json`, `gcloud`), para que el drift futuro sea detectable.

## Normative Docs

- `scripts/check-documentation-closure.mjs` (regla `architecture_doc_monolith`: dispara con ≥8 `## Delta` + >1200 líneas; excluye `*HISTORIAL.md`)
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` (fuente a particionar)
- `services/ops-worker/deploy.sh`, `services/*/deploy.sh`, `vercel.json`, `.github/workflows/*-deploy.yml` (SoT de verificación)

### Blocks / Impacts

- Referrers vivos del doc: `CLAUDE.md`, `.claude/skills/hubspot-greenhouse-bridge/skill.md`, `.codex/skills/hubspot-greenhouse-bridge/SKILL.md`, `.codex/skills/greenhouse-secret-hygiene/SKILL.md`, `docs/operations/agent-context-router.json`, `docs/architecture/agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md`, `src/lib/reliability/signals.ts` [verificar contexto de cada referencia; el path del stub no cambia]
- Tasks activas que citan el doc (`TASK-930`, `TASK-1489`, `TASK-127`, etc.) siguen resolviendo vía el stub.

### Files owned

- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` (se convierte en stub)
- `docs/architecture/cloud-infrastructure/**` (nuevo)
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_RESTRUCTURE_DECISION_V1.md` (nuevo ADR)
- `docs/architecture/DECISIONS_INDEX.md` (entrada nueva)

## Current Repo State

### Already exists

- Monolito fuente: `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` (1340 líneas, v1.9, 24 `## Delta` + 1 `### Delta` en §7)
- Precedente completo: `docs/architecture/ui-platform/` + router stub + ADR
- Gate mecánico: `scripts/check-documentation-closure.mjs` con regla `architecture_doc_monolith` y exclusión de `*HISTORIAL.md`

### Gap

- Contenido vigente y cronología mezclados; deltas viejos contradicen a los nuevos (caso 2026-04-15 vs 2026-08-05).
- Inventarios §4/§5/§6/§11 congelados en la auditoría 2026-04-23, contradicen `vercel.json` y `deploy.sh` actuales.
- Contenido vigente que HOY sólo existe dentro de deltas (buckets GCS, protocolo de secretos, helper IAM, contrato email del worker) sin sección temática propia.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `docs/architecture/**` (documentación, sin runtime)
- Future candidate home: `remain-shared`
- Boundary: documentación de arquitectura; consumers = agentes/operadores vía router stub y `docs/architecture/cloud-infrastructure/README.md`
- Server/browser split: `n/a`
- Build impact: `none`
- Extraction blocker: `none`

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

### Slice 1 — Partición temática con estado vigente re-verificado

- Crear `docs/architecture/cloud-infrastructure/` con: `README.md` (índice + overview + regiones + mapa "dónde vive X"), `TOPOLOGY.md` (topología compartida canónica TASK-1302 + workload placement + data flow), `CLOUD_SQL.md`, `BIGQUERY.md`, `STORAGE_BUCKETS.md`, `CLOUD_RUN.md` (services + functions legacy + Jobs), `SCHEDULING.md` (Cloud Scheduler + crons Vercel + criterios de placement), `VERCEL.md`, `SECRETS.md`, `CICD_WIF.md`, `SECURITY.md` (quick-reference + puntero a la postura authoritative).
- Re-verificar inventarios contra repo SoT (`vercel.json`, `services/*/deploy.sh`, `.github/workflows/`) y declarar as-of + SoT en cada inventario.

### Slice 2 — HISTORIAL + resolución de contradicciones

- `HISTORIAL.md` con los 25 deltas cronológicos completos, sin pérdida.
- Anotar supersedes: 2026-04-15 "por ahora" (superseded por 2026-08-05), inventarios 2026-04-23 (superseded por runtime actual), tabla de candidatos a migración 2026-04-04 (ejecutada).

### Slice 3 — Router stub + ADR + índice de decisiones

- Convertir `GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` en router stub (formato UI Platform).
- Crear `GREENHOUSE_CLOUD_INFRASTRUCTURE_RESTRUCTURE_DECISION_V1.md` + entrada en `DECISIONS_INDEX.md`.

### Slice 4 — Referrers + gates + cierre documental

- Revisar referrers vivos y actualizar los que apunten a secciones internas movidas.
- `pnpm docs:closure-check` sin `architecture_doc_monolith` para el path; `pnpm docs:context-check:strict` verde.
- Registry + README de tasks + changelog + Handoff sincronizados.

## Out of Scope

- Ejecutar auditoría live contra GCP (`gcloud`/`bq`) para rebaselinear inventarios cloud completos — los temáticos declaran as-of + SoT; una re-auditoría live es trabajo aparte (ver `TASK-127`).
- Resolver los gaps de seguridad listados en el doc (exposure público, default compute SA, secrets en env plano) — son de `GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md` y sus tasks.
- Cambiar comportamiento de runtime, deploy scripts o workflows.
- Tocar `docs/architecture/ui-platform/**`.

## Detailed Spec

La partición temática y el mapeo sección→doc se derivan del contenido real del monolito:

| Contenido del monolito | Destino |
|---|---|
| §1 Overview + regiones | `README.md` (corregir región Cloud Run: workers modernos en `us-east4`; `us-central1` es legacy Functions) |
| §1.1 Workload Placement Policy | `TOPOLOGY.md` (política + criterios; el inventario 2026-04-04 de "por migrar" ya se ejecutó → HISTORIAL) |
| Delta 2026-08-05 topología canónica + Delta 2026-04-15 | `TOPOLOGY.md` (sólo la versión canónica) |
| §2 Cloud SQL | `CLOUD_SQL.md` |
| §3 BigQuery | `BIGQUERY.md` |
| Deltas 2026-03-31 buckets GCS (×4) | `STORAGE_BUCKETS.md` (estado vigente consolidado) |
| §4 Cloud Run + Jobs + deltas de workers/endpoints | `CLOUD_RUN.md` |
| §5 Scheduler + §6 crons Vercel | `SCHEDULING.md` (inventarios re-verificados contra `deploy.sh` + `vercel.json`) |
| §7 Vercel deployment + Delta 2026-07-08 ignored build | `VERCEL.md` |
| §8 Secret Manager + deltas 2026-04-09/2026-06-06/2026-03-29 (secret refs, protocolo, IAM helper, auth runtime WIF) | `SECRETS.md` |
| §9 Security notes | `SECURITY.md` (quick-reference; authoritative sigue siendo la postura V1) |
| §10 Data flow diagram | `TOPOLOGY.md` (actualizado: crons que ya no existen fuera del diagrama) |
| §11 CI/CD WIF | `CICD_WIF.md` (workflows reales: 7, no 3) |
| Los 25 deltas | `HISTORIAL.md` verbatim |

## Rollout Plan & Risk Matrix

N/A — cambio doc-only, sin impacto en runtime de producción, sin rollback operativo necesario.
Razón: la task mueve y reorganiza documentación manteniendo el path original como router stub;
ningún artefacto de runtime (código, deploy, flags, schema) cambia. El riesgo real es pérdida de
contenido documental, mitigado con la regla "nada se borra: lo que no encaja va al HISTORIAL" y
verificable por diff (todo el contenido del monolito debe existir en stub+temáticos+HISTORIAL).

### Slice ordering hard rule

- Slice 1 (temáticos) → Slice 2 (HISTORIAL) → Slice 3 (stub + ADR) → Slice 4 (referrers + gates).
- El stub (Slice 3) NUNCA se escribe antes de que temáticos + HISTORIAL existan — si se
  interrumpe la sesión a mitad, el monolito original debe seguir intacto.

### Risk matrix

N/A operationally safe — cambio documental aditivo/reorganizativo; sin sistema de runtime impactado.

### Feature flags / cutover

Sin flag — doc-only, cutover inmediato por commit.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1–4 | `git revert` del commit | <5 min | sí |

### Production verification sequence

1. `pnpm docs:closure-check` → sin `architecture_doc_monolith` para el path.
2. `pnpm docs:context-check:strict` verde.
3. Diff manual: contenido del monolito presente en temáticos o HISTORIAL (cero pérdida).

### Out-of-band coordination required

N/A — repo-only change.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] `docs/architecture/cloud-infrastructure/README.md` existe con índice + mapa "dónde vive X" y cada doc temático listado existe.
- [x] Ningún doc temático contiene secciones `## Delta` (cronología sólo en `HISTORIAL.md`).
- [x] `HISTORIAL.md` contiene los 25 deltas del monolito (24 `##` + 1 `###`), cronológicos, con anotaciones de supersede.
- [x] `GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` quedó como router stub ≤120 líneas, sin `## Delta`, con mapa hacia los temáticos.
- [x] La contradicción 2026-04-15 vs 2026-08-05 quedó resuelta: los temáticos sólo presentan la topología compartida como canónica.
- [x] Los inventarios de `SCHEDULING.md` coinciden con `vercel.json` (8 crons) y `services/ops-worker/deploy.sh` (46 jobs declarados), con as-of + SoT declarados.
- [x] `CICD_WIF.md` lista los 7 workflows de deploy reales.
- [x] ADR `GREENHOUSE_CLOUD_INFRASTRUCTURE_RESTRUCTURE_DECISION_V1.md` existe y `DECISIONS_INDEX.md` lo indexa.
- [x] `pnpm docs:closure-check` no emite `architecture_doc_monolith` para `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`.
- [x] `pnpm docs:context-check:strict` pasa.

## Verification

- `pnpm docs:closure-check`
- `pnpm docs:context-check:strict`
- Revisión manual de no-pérdida de contenido (diff monolito vs partición)
- `pnpm task:lint --task TASK-1646` + `pnpm ops:lint --changed`

## Closing Protocol

- [x] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [x] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [x] `docs/tasks/README.md` quedo sincronizado con el cierre
- [x] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [x] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [x] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [x] referrers vivos revisados (CLAUDE.md, skills, agent-context-router.json, agent-invariants)

## Follow-ups

- `TASK-127` (cloud architecture posture consolidation) sigue siendo la task para re-auditar live GCP y rebaselinear inventarios; los temáticos nuevos declaran as-of para hacer ese drift visible.
- Considerar extender `scripts/check-documentation-closure.mjs` con una regla de stub-regrowth para este router (espejo de `ui_platform_stub_regrowth`).
