# EPIC-049 — Efeonce Marketing Studio: plataforma de campañas API-first

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Fundación en ejecución (TASK-1887)`
- Rank: `TBD`
- Domain: `cross-domain`
- Owner: `Julio Reyes`
- Branch: `Greenhouse develop (docs) · efeonce-marketing-studio main (código)`
- GitHub Issue: `none`

## Summary

Convierte el Campaign Manager local (HTML en OneDrive, prototipo de Codex aprobado por el operador el
2026-09-25) en **Efeonce Marketing Studio**, `studio.efeonce.org`: el sistema de registro de campañas con
brief, conceptos, assets, copys, configuraciones de anuncio, plan de medios, calendario, revisión y
publicación. Next.js en Vercel con la API `/api/v1` en el mismo deployment y el dominio sin framework;
Postgres en la instancia existente con base propia; repo propio `efeoncepro/efeonce-marketing-studio`.

## Why This Epic Exists

El trabajo de campaña está repartido en tres lugares que no se hablan: CDR y tasks en este repo, briefs y
assets en OneDrive, y un HTML autogenerado que no se actualiza solo (al 2026-09-25 sólo conocía CMP-001 y
CMP-002, con CMP-003 a CMP-005 ya decididos). No hay colaboración, versión, acceso remoto ni un contrato que
Efeonce MCP o un agente puedan consumir. Resolverlo cruza repo nuevo, datos, infraestructura GCP/Vercel,
identidad (Efeonce ID), UI e integraciones (Metricool, plataformas de pauta, Globe): no cabe en una task.

## Outcome

- Studio vivo en `studio.efeonce.org` con las cinco campañas importadas y legibles por web y API.
- Contrato OpenAPI v1 versionado, consumido por la web, CLI y (después) Efeonce MCP.
- Login con `auth.efeonce.org` y organización derivada del actor.
- Escrituras gobernadas (idempotencia, revisión, auditoría) y corte de autoridad desde OneDrive.
- Worker asíncrono para miniaturas/GCS, readback de Metricool y publicación programada.

## Architecture Alignment

- `docs/architecture/EFEONCE_STUDIO_API_FIRST_DECISION_V1.md` (ADR, delta 2026-09-25)
- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md`
- `docs/architecture/EFEONCE_ID_RELYING_PARTY_ENTRY_AND_CONSENT_DECISION_V1.md`
- `docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`
- `docs/operations/EFEONCE_CAMPAIGN_REGISTRY_V1.md`
- `docs/architecture/creative-studio/` (frontera con Globe)

## Child Tasks

- `TASK-1887` — Fundación: repo, bases y roles, modelo de dominio, API v1 de lectura, import del catálogo, Vercel + dominio (modo acceso `open`).
- _Por crear_ — Login con Efeonce ID (`auth.efeonce.org`) y cambio de `STUDIO_ACCESS_MODE` a `efeonce_id`.
- _Por crear_ — UI de Studio (ui-ux) sobre la API: campañas, espacio de campaña, biblioteca, calendario unificado paid + orgánico, plan de medios. Referencia: prototipo HTML.
- _Por crear_ — Commands de escritura (campaña, asset/versión, copy, revisión/aprobación) con idempotencia, `If-Match` y auditoría; corte de autoridad desde OneDrive.
- _Por crear_ — Worker Cloud Run: subida a GCS, miniaturas y derivados, readback Metricool.
- _Por crear_ — Adapter Efeonce MCP sobre `/api/v1` (lectura primero).
- _Por crear_ — Observabilidad (Sentry, alertas, restauración verificada).

## Existing Related Work

- Prototipo `OneDrive/…/15. Paid Media/ABRIR CAMPAIGN MANAGER.html` + `01. Recursos/Campaign Manager/` (generador, catálogo, LEEME).
- `docs/campaigns/` — CDR-001…011, harness de campañas.
- `docs/operations/EFEONCE_PAID_MEDIA_MANIFEST_AND_MCP_HANDOFF_V1.md`.
- Globe (`efeonce-globe`) como proveedor de assets generados.

## Exit Criteria

- [ ] `studio.efeonce.org` sirve Studio con login Efeonce ID y sin modo `open`.
- [ ] Las campañas vigentes viven en Studio como fuente, con corte de autoridad declarado.
- [ ] Toda operación de la UI tiene su endpoint `/api/v1` documentado en OpenAPI.
- [ ] Efeonce MCP federa al menos las lecturas de Studio.
- [ ] Restauración de la base `marketing_studio` probada.

## Non-goals

- Reemplazar Globe en la generación o el gobierno de derechos de piezas generadas.
- Gestionar organizaciones, personas o accesos fuera de Efeonce ID / Greenhouse.
- Operar pauta en vivo (crear campañas en Meta/LinkedIn) antes de tener readback y aprobaciones gobernadas.
