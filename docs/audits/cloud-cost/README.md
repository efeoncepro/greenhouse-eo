# Cloud Cost Audits

Auditorías de costo cloud (GitHub Actions, GCP, Vercel) — reproducibles, basadas en datos reales de billing.

> **Gotcha recurrente:** el billing export de GCP está en **CLP**, no USD. Dividir `cost` por `currency_conversion_rate` (~898). Sin esto, los costos parecen ~900× más altos.

| Audit | Fecha | Alcance |
|---|---|---|
| [CLOUD_COST_AUDIT_2026-05-24.md](CLOUD_COST_AUDIT_2026-05-24.md) | 2026-05-24 | GitHub Actions + GCP + Vercel. Total ~$249/mo. Oportunidades: Gemini seat $22, Artifact Registry $9-13 (TASK-932), Secret Manager $8 (tokens Frame.io muertos), Cloud SQL CUD $15. |

## Herramientas reproducibles relacionadas

- `scripts/cloud/verify-artifact-cleanup-dryrun.sh` — verificación read-only del cleanup de Artifact Registry.
- `pnpm actions:cost:audit` — reporte de costo GitHub Actions por workflow/job (TASK-931).
- Reliability signal `cloud.billing.github` (TASK-637) — costo/forecast/spike de GitHub Actions.
- `src/lib/cloud/{gcp-billing,vercel-billing,github-billing}.ts` — readers de billing por plataforma.
