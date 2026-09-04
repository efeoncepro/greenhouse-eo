# Greenhouse EO — Cloud Infrastructure (índice)

> **Version:** 2.0 · **Updated:** 2026-08-05 (TASK-1646)
> **Audience:** Platform engineers, DevOps, on-call operators, agentes
>
> Esta carpeta reemplaza al monolito `GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` (1340 líneas, 24
> deltas apilados). Cada doc temático contiene **SÓLO estado vigente**; la cronología completa
> vive en [HISTORIAL.md](HISTORIAL.md). Regla anti-monolito (ADR
> [GREENHOUSE_CLOUD_INFRASTRUCTURE_RESTRUCTURE_DECISION_V1.md](../GREENHOUSE_CLOUD_INFRASTRUCTURE_RESTRUCTURE_DECISION_V1.md)):
> **cambio vigente → doc temático; cronología → HISTORIAL; nunca un monolito que mezcle ambos.**

## Overview

Greenhouse EO corre sobre **Google Cloud Platform**, proyecto **`efeonce-group`**, con Vercel
sirviendo el frontend Next.js y las API routes. Distribución regional vigente:

| Concern | Región | Nota |
| --- | --- | --- |
| Cloud SQL (PostgreSQL) | `us-east4` (Northern Virginia) | OLTP de baja latencia |
| Cloud Run workers modernos (`ops-worker`, `commercial-cost-worker`, `ico-batch-worker`, Job `artifact-worker`) + `auth-server` (emisor `auth.efeonce.org`, EPIC-044) | `us-east4` | co-locados con Cloud SQL; `auth-server` firma con Cloud KMS HSM en la misma región |
| Cloud Run / Functions legacy (syncs Notion/HubSpot/Frame.io) | `us-central1` | capa heredada, pendiente de modernización |
| BigQuery | `US` (multi-region) | analytics + snapshots |
| Buckets GCS de assets | `US-CENTRAL1` | ver [STORAGE_BUCKETS.md](STORAGE_BUCKETS.md) |

> El monolito decía "Cloud Run → us-central1, default for serverless": eso quedó obsoleto —
> toda la capa moderna corre en `us-east4`; `us-central1` es sólo legacy (contradicción
> resuelta en TASK-1646, ver HISTORIAL).

La comunicación inter-servicio queda dentro de GCP, salvo las llamadas de Vercel a Cloud
Run/Cloud SQL y el tráfico webhook externo (Notion, HubSpot, Frame.io).

## Dónde vive cada cosa

| Tema | Doc |
|---|---|
| Topología compartida staging/producción (CANÓNICA) + workload placement + data flow | [TOPOLOGY.md](TOPOLOGY.md) |
| Cloud SQL: instancia, usuarios, footprint, access model, conectividad | [CLOUD_SQL.md](CLOUD_SQL.md) |
| BigQuery: datasets y concentración de storage | [BIGQUERY.md](BIGQUERY.md) |
| Buckets GCS: media pública / assets privados, prefixes, env mapping | [STORAGE_BUCKETS.md](STORAGE_BUCKETS.md) |
| Cloud Run: services, Functions legacy, Cloud Run **Jobs**, contratos del ops-worker | [CLOUD_RUN.md](CLOUD_RUN.md) |
| Cloud Scheduler jobs + Vercel crons + criterios de placement | [SCHEDULING.md](SCHEDULING.md) |
| Vercel: deployment, ignored build step docs-only, env vars | [VERCEL.md](VERCEL.md) |
| Secret Manager: inventario, protocolo de publicación, `*_SECRET_REF`, auth runtime GCP | [SECRETS.md](SECRETS.md) |
| CI/CD GitHub Actions + WIF: pool/provider, deployer SA, workflows, pitfalls, DR | [CICD_WIF.md](CICD_WIF.md) |
| Seguridad: gaps quick-reference (authoritative: postura V1) | [SECURITY.md](SECURITY.md) |
| **Historial completo** (los 25 `Delta` del monolito, cronológicos, con supersedes) | [HISTORIAL.md](HISTORIAL.md) |

## Modelo de fuentes de verdad

Los inventarios de estos docs declaran su **as-of** y su **source of truth**. Ante drift, gana
el SoT:

| Superficie | Source of truth |
| --- | --- |
| Cloud Scheduler jobs | `services/<worker>/deploy.sh` (declarativo, re-aplicado en cada deploy); verdad live: `gcloud scheduler jobs list` |
| Env vars / flags de workers Cloud Run | `services/<worker>/deploy.sh` (`--set-env-vars` es **destructivo**) |
| Crons Vercel | `vercel.json` |
| Workflows de deploy | `.github/workflows/*-deploy.yml` |
| Postura de seguridad | [`GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`](../GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md) |
| Estado live GCP | `gcloud` / `bq` (última auditoría live completa: 2026-04-23; re-baseline pendiente en `TASK-127`) |

## Docs relacionados

- [`GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`](../GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md) — postura de seguridad (authoritative)
- [`GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md`](../GREENHOUSE_RELEASE_CONTROL_PLANE_V1.md) — promoción develop→main
- [`agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md`](../agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md) — invariantes de agente del ops-worker
- [`GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md`](../GREENHOUSE_DATA_PLATFORM_ARCHITECTURE_V1.md) — estrategia PostgreSQL + BigQuery
- `docs/documentation/operations/postura-cloud-gcp.md` — documentación funcional
