# EPIC-049 — Efeonce Marketing Studio: plataforma de campañas API-first

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Fundación completa y en vivo en studio.efeonce.org (TASK-1887); programa completo planificado (TASK-1890…1898); login al final`
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

Orden recomendado (2026-09-25): 1890 → 1891 · 1893 en paralelo · 1896 → 1892 → 1894 → 1895 → 1897 (cuando convenga) → 1898 al final.

- `TASK-1887` — Fundación: repo, bases y roles, modelo de dominio, API v1, import del catálogo, renditions privadas, UI aprobada (claro/oscuro), Vercel + dominio (modo `open`). Completa: en vivo en `https://studio.efeonce.org`.
- `TASK-1890` — Studio listo para agentes: manifiesto de tools con paridad, semántica, bearer de servicio, organización canónica, capability y manual servido.
- `TASK-1891` — Federación en Efeonce MCP de todas las tools del manifiesto (bloqueada por TASK-1890). Regla desde aquí: toda capacidad nueva de Studio nace con su tool en el manifiesto o una exclusión con razón.
- `TASK-1892` — Métricas de marketing desde Greenhouse (Search Console, GA4, SEO) por el lane ecosystem `/api/platform/ecosystem/growth/*`, nunca por SQL. Pauta (Meta/LinkedIn) y social orgánico (Metricool) quedan en adapters propios de Studio.
- `TASK-1893` — Almacén de originales en GCS (finales aprobados, sha256, versionado, derechos) y worker Cloud Run de medios: renditions automáticas, portadas de video, recortes y readback de Metricool.
- `TASK-1894` — Commands de escritura con idempotencia, `If-Match` y auditoría; corte de autoridad desde OneDrive.
- `TASK-1895` — UI de edición, revisión, subida de versiones y panel de métricas (consumidora de 1892–1894).
- `TASK-1896` — Observabilidad, alertas y restauración verificada de `marketing_studio`. Antes de que las escrituras lleguen a producción.
- `TASK-1897` — (Greenhouse) Cerrar `CONNECT` de PUBLIC en `greenhouse_app` y en las bases de Studio.
- `TASK-1898` — Login con Efeonce ID (`auth.efeonce.org`) y cambio de `STUDIO_ACCESS_MODE` a `efeonce_id`. Última del programa por decisión del operador (2026-09-25).

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
