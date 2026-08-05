# Cloud Infrastructure — Buckets GCS (media pública + assets privados)

> **Estado vigente** · Updated: 2026-08-05 (TASK-1646) · Cronología: [HISTORIAL.md](HISTORIAL.md)
> Decisión de topología: TASK-173 (2026-03-31); provisioning y cutover verificados 2026-03-31.

## Topología provisionada (en uso)

| Bucket | Rol |
| --- | --- |
| `efeonce-group-greenhouse-public-media-dev` | media pública · development |
| `efeonce-group-greenhouse-public-media-staging` | media pública · staging + preview (develop) |
| `efeonce-group-greenhouse-public-media-prod` | media pública · production |
| `efeonce-group-greenhouse-private-assets-dev` | assets privados · development |
| `efeonce-group-greenhouse-private-assets-staging` | assets privados · staging + preview (develop) |
| `efeonce-group-greenhouse-private-assets-prod` | assets privados · production |

Configuración aplicada:

- Location `US-CENTRAL1`, storage class `STANDARD`
- `uniform bucket-level access = true`
- Buckets privados: `publicAccessPrevention = enforced` (lectura anónima → `401`, verificado)
- Buckets públicos: lectura anónima controlada (`roles/storage.objectViewer` para `allUsers`)
- `greenhouse-portal@efeonce-group.iam.gserviceaccount.com` con `roles/storage.objectAdmin`
  bucket-level

## Reglas de uso

- **`public media`** sirve logos, avatars y assets visuales de baja sensibilidad.
- **`private assets`** sirve adjuntos operativos, documentos HR, receipts, payroll PDFs y
  respaldos.
- La separación por módulo vive primero en **prefixes y metadata**, no en proliferación de
  buckets. Prefixes base aprobados para `private assets`: `leave/`, `hr-documents/`,
  `expense-reports/`, `payroll-receipts/`, `payroll-exports/`, `providers/`, `tooling/`.
- **No apuntar capacidades documentales privadas nuevas al bucket legacy**
  `${GCP_PROJECT}-greenhouse-media` — es baseline transicional, no destino por defecto.

## Env vars canónicas (Vercel, alineadas por entorno)

| Variable | Rol |
| --- | --- |
| `GREENHOUSE_PUBLIC_MEDIA_BUCKET` | carril canónico de media pública |
| `GREENHOUSE_PRIVATE_ASSETS_BUCKET` | carril canónico de adjuntos privados |
| `GREENHOUSE_MEDIA_BUCKET` | **sólo fallback legacy** para surfaces públicas aún no cortadas |

Mapping efectivo: `development → *-dev`, `staging → *-staging`, `production → *-prod`,
`preview (develop) → *-staging`. En este proyecto `Preview` no se asume como entorno shared
puro: la presencia de env vars branch-scoped obliga a fijar como mínimo `preview (develop)`.

`src/lib/storage/greenhouse-media.ts` prioriza `GREENHOUSE_PUBLIC_MEDIA_BUCKET` y sólo cae a
`GREENHOUSE_MEDIA_BUCKET` como fallback legacy.

## Bootstrap PostgreSQL de la foundation shared-assets

- `scripts/setup-postgres-shared-assets.sql` + `scripts/setup-postgres-shared-assets.ts`
- Comando: `pnpm setup:postgres:shared-assets`
- El DDL quedó aplicado en `greenhouse-pg-dev / greenhouse_app`;
  `greenhouse_sync.schema_migrations` registra `shared-assets-platform-v1`;
  `greenhouse_migrator_user` puede reejecutarlo sin depender de `postgres`.
- Regla: no reintroducir ownership drift en tablas shared que bloquee la reejecución con
  `migrator`.
