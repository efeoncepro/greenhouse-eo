# Greenhouse EO — Cloud Infrastructure Reference (reestructurado)

> **Version:** 2.0 · **Updated:** 2026-08-05
> **⚠️ Este doc se dividió.** El monolito (1340 líneas, 24 secciones `## Delta` apiladas que
> mezclaban estado vigente con cronología — y ya habían producido contradicciones reales, ver
> TASK-1302) se reestructuró en docs temáticos de **estado vigente** + un **HISTORIAL**
> cronológico, bajo:
>
> ### → [`docs/architecture/cloud-infrastructure/`](./cloud-infrastructure/README.md) ← empieza por el README (índice + mapa "dónde vive X")
>
> Este archivo queda como **router** para no romper las referencias existentes. No agregar
> contenido nuevo acá — cambio vigente va al doc temático; cronología, a
> `cloud-infrastructure/HISTORIAL.md`.

## Dónde está cada cosa ahora

| Tema (sección del monolito) | Doc |
|---|---|
| Overview + regiones (§1) + mapa de la carpeta | [cloud-infrastructure/README.md](./cloud-infrastructure/README.md) |
| Topología compartida staging/prod CANÓNICA + Workload Placement Policy (§1.1) + data flow (§10) | [cloud-infrastructure/TOPOLOGY.md](./cloud-infrastructure/TOPOLOGY.md) |
| Cloud SQL (§2) | [cloud-infrastructure/CLOUD_SQL.md](./cloud-infrastructure/CLOUD_SQL.md) |
| BigQuery datasets (§3) | [cloud-infrastructure/BIGQUERY.md](./cloud-infrastructure/BIGQUERY.md) |
| Buckets GCS media/assets (antes sólo en deltas 2026-03-31) | [cloud-infrastructure/STORAGE_BUCKETS.md](./cloud-infrastructure/STORAGE_BUCKETS.md) |
| Cloud Run services + Functions legacy + Cloud Run **Jobs** + contratos del ops-worker (§4, ex "§4.9") | [cloud-infrastructure/CLOUD_RUN.md](./cloud-infrastructure/CLOUD_RUN.md) |
| Cloud Scheduler jobs + Vercel crons (§5 + §6) | [cloud-infrastructure/SCHEDULING.md](./cloud-infrastructure/SCHEDULING.md) |
| Vercel deployment + ignored build step docs-only + env vars (§7) | [cloud-infrastructure/VERCEL.md](./cloud-infrastructure/VERCEL.md) |
| Secret Manager + protocolo de publicación + `*_SECRET_REF` + auth runtime GCP (§8) | [cloud-infrastructure/SECRETS.md](./cloud-infrastructure/SECRETS.md) |
| Security quick-reference (§9; authoritative: postura V1) | [cloud-infrastructure/SECURITY.md](./cloud-infrastructure/SECURITY.md) |
| CI/CD GitHub Actions + WIF (§11) | [cloud-infrastructure/CICD_WIF.md](./cloud-infrastructure/CICD_WIF.md) |
| **Historial completo** (los 25 `Delta` + snapshots de inventario superseded) | [cloud-infrastructure/HISTORIAL.md](./cloud-infrastructure/HISTORIAL.md) |

**ADR de la reestructuración:** [GREENHOUSE_CLOUD_INFRASTRUCTURE_RESTRUCTURE_DECISION_V1.md](./GREENHOUSE_CLOUD_INFRASTRUCTURE_RESTRUCTURE_DECISION_V1.md).
**Postura de seguridad (authoritative):** [GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md](./GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md).
