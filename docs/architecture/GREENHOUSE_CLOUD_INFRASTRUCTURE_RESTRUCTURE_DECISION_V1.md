# ADR — Reestructuración del doc Cloud Infrastructure (temáticos + HISTORIAL + router stub)

> **Status:** Accepted · 2026-08-05
> **Task:** `TASK-1646` · **Precedente replicado:** [GREENHOUSE_UI_PLATFORM_RESTRUCTURE_DECISION_V1.md](GREENHOUSE_UI_PLATFORM_RESTRUCTURE_DECISION_V1.md)
> **Owner documental:** `docs/architecture/cloud-infrastructure/`

## Contexto

`GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` llegó a 1340 líneas con **24 secciones `## Delta`**
apiladas (más 1 `### Delta` embebido). El problema no era el largo: el doc mezclaba **contrato
vigente** con **cronología**, así que un agente debía leer los 24 deltas para saber qué es
cierto hoy — y algunos deltas viejos contradecían a los nuevos. El gate `pnpm docs:closure-check`
lo marcaba con `architecture_doc_monolith`.

Costo real ya pagado (2026-08-05, TASK-1302): el `Delta 2026-04-15` presentaba la topología
compartida staging/producción como transitoria ("por ahora") cuando `services/ops-worker/deploy.sh`
la declara **canónica**; hubo que descubrirlo contra runtime y agregar un delta de supersede a
mano. Además, los inventarios del doc quedaron congelados en la auditoría live 2026-04-23 y
contradecían el runtime actual.

## Decisión

Replicar el patrón UI Platform:

1. **Docs temáticos de estado vigente** en `docs/architecture/cloud-infrastructure/`:
   `README` (índice + overview) · `TOPOLOGY` · `CLOUD_SQL` · `BIGQUERY` · `STORAGE_BUCKETS` ·
   `CLOUD_RUN` · `SCHEDULING` · `VERCEL` · `SECRETS` · `CICD_WIF` · `SECURITY`.
2. **`HISTORIAL.md`** append-only con los 25 deltas verbatim + los snapshots de inventario
   superseded (cero pérdida: lo que no encaja en un temático va al HISTORIAL, nunca se borra).
3. **Router stub** en el path original `GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` para no romper
   referrers (≈120 archivos citan ese path; la mayoría son tasks históricas).
4. Los inventarios de los temáticos declaran **as-of + source of truth** (`deploy.sh`,
   `vercel.json`, `.github/workflows/`, `gcloud`) para que el drift futuro sea detectable en
   vez de silencioso.

## Contradicciones resueltas al separar (gana lo verificado contra runtime/repo)

| Delta/sección descartada | Estado vigente adoptado | Evidencia |
|---|---|---|
| Delta 2026-04-15: topología compartida "por ahora" (transitoria) | Topología compartida **canónica** (TOPOLOGY.md §1) | `services/ops-worker/deploy.sh` §Environment (verbatim) + TASK-1302 |
| §5: "16 Cloud Scheduler jobs" (auditoría 2026-04-23) | 46 jobs del ops-worker + 2 commercial-cost + 4 ico-batch (SCHEDULING.md) | `services/*/deploy.sh` leídos 2026-08-05 |
| §6: "13 crons Vercel activos" (outbox-publish, webhook-dispatch, etc.) | 8 crons en `vercel.json`; el path async crítico vive en Cloud Scheduler | `vercel.json` leído 2026-08-05; TASK-773/775 |
| §1: "Cloud Run → us-central1, default for serverless" | Workers modernos en `us-east4`; `us-central1` sólo legacy | Tablas de §4 del propio monolito + deploy scripts |
| §1.1: inventario "procesos por migrar" (2026-04-04) y §6 "próximos candidatos" | Todas las migraciones ejecutadas (TASK-241/254/258/259/260/261/262/773/775) | scheduler jobs presentes en `deploy.sh` |
| §11.1: "deploys automatizados: ops-worker, ico-batch, commercial-cost" (3) | 7 workflows de deploy (5 GCP + 2 Azure) | `.github/workflows/*-deploy.yml` |

Cada descarte quedó anotado con `⚠️ Superseded` en `cloud-infrastructure/HISTORIAL.md`.

## Reglas derivadas

- **Cambio vigente → doc temático; cronología → HISTORIAL; nunca un monolito que mezcle
  ambos.** (Misma regla anti-monolito del ADR UI Platform, ya en CLAUDE.md.)
- El router stub no acumula contenido nuevo.
- Un inventario sin as-of + SoT declarados no entra a un doc temático.
- La postura de seguridad sigue teniendo un único authoritative:
  `GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md` (`cloud-infrastructure/SECURITY.md` es
  quick-reference).

## Consecuencias

- `pnpm docs:closure-check` deja de emitir `architecture_doc_monolith` para el path (la regla
  excluye `*HISTORIAL.md` por diseño).
- Los ~120 referrers históricos siguen resolviendo vía el stub; los referrers vivos con anclas
  a secciones internas (`§4.9`, `§5`) se actualizaron a los docs temáticos.
- La re-auditoría live completa de GCP (rebaseline de inventarios) sigue siendo trabajo de
  `TASK-127`; esta reestructura sólo re-verificó lo verificable desde el repo.
