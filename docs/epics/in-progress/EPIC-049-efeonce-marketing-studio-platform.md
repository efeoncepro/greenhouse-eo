# EPIC-049 — Efeonce Marketing Studio: plataforma de campañas API-first

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Fundación en vivo (TASK-1887 complete). TASK-1890 complete 2026-09-26 (manual servido en producción tras el release 0e87c7a443a2). TASK-1891: canje en producción y provider encendido en el gateway (efeonce-mcp-gateway-00061-sbc); falta el canary con token humano del cliente MCP.`
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

Orden recomendado (2026-09-25): 1890 → 1891 · 1893 en paralelo · 1896 → 1892 → 1894 → 1895 · 1899 → 1897 (cuando convenga) → 1898 al final.

**Regla de paridad del programa (operador, 2026-09-25):** todo lo que se puede hacer en la UI se puede hacer por la API y, por consiguiente, por MCP — incluidas las aprobaciones. Las aprobaciones las decide una persona; un agente puede ejecutarlas con la identidad delegada de esa persona y su confirmación explícita. Ninguna capacidad nace sólo en la UI.

- `TASK-1887` — **Complete.** Fundación: repo, bases y roles, modelo de dominio, API v1, import del catálogo, renditions privadas, UI aprobada (claro/oscuro), Vercel + dominio (modo `open`). En vivo en `https://studio.efeonce.org`.
- `TASK-1890` — **Complete 2026-09-26** (manual servido en producción tras el release `0e87c7a443a2`). Studio listo para agentes: registro único de operaciones (17: 12 tools + 5 exclusiones), manifiesto con paridad, semántica, bearer de servicio, organización canónica, capability `marketing_studio.campaign.read` y manual. En producción de Studio desde `d08387f`. **Pendiente:** release de Greenhouse a producción para servir el manual `marketing-studio`.
- `TASK-1891` — **In progress: provider encendido en producción** (`00061-sbc`, 2026-09-26); falta el canary con token humano. Federación en Efeonce MCP de las 12 tools del manifiesto. Canje RFC 8693 en Greenhouse (cliente `efeonce-mcp-marketing-studio`, migrado) y gateway 1.8.0 desplegado (PR `efeonce-mcp#19`, revisión `00057-w8h`) con el flag OFF. **Pendiente:** release de Greenhouse (canje + manual) → `MARKETING_STUDIO_PROVIDER_ENABLED=true` + dispatch → `pnpm studio:canary` con token Entra humano → sesión MCP real. Regla desde aquí: toda capacidad nueva de Studio nace con su tool en el manifiesto o una exclusión con razón.
- `TASK-1892` — To-do. Métricas de marketing desde Greenhouse (Search Console, GA4, SEO) por el lane ecosystem `/api/platform/ecosystem/growth/*`, nunca por SQL. Pauta (Meta/LinkedIn) y social orgánico (Metricool) quedan en adapters propios de Studio.
- `TASK-1893` — To-do. Almacén de originales en GCS (finales aprobados, sha256, versionado, derechos) y worker Cloud Run de medios: renditions automáticas, portadas de video, recortes y readback de Metricool.
- `TASK-1894` — To-do. Commands de escritura con idempotencia, `If-Match` y auditoría; corte de autoridad desde OneDrive.
- `TASK-1895` — To-do. UI de edición, revisión, subida de versiones y panel de métricas (consumidora de 1892–1894).
- `TASK-1896` — To-do. Observabilidad, alertas y restauración verificada de `marketing_studio`. Antes de que las escrituras lleguen a producción.
- `TASK-1897` — To-do. (Greenhouse) Cerrar `CONNECT` de PUBLIC en `greenhouse_app` y en las bases de Studio.
- `TASK-1899` — To-do. Escrituras y aprobaciones por MCP: todas las tools de clase `write` federadas con scope propio e identidad delegada de la persona (el actor auditado es la persona), `dryRun` → confirmación explícita. Bloqueada por TASK-1891 y TASK-1894.
- `TASK-1898` — To-do. Login con Efeonce ID (`auth.efeonce.org`) y cambio de `STUDIO_ACCESS_MODE` a `efeonce_id`. Última del programa por decisión del operador (2026-09-25).

## Existing Related Work

- Prototipo `OneDrive/…/15. Paid Media/ABRIR CAMPAIGN MANAGER.html` + `01. Recursos/Campaign Manager/` (generador, catálogo, LEEME).
- `docs/campaigns/` — CDR-001…011, harness de campañas.
- `docs/operations/EFEONCE_PAID_MEDIA_MANIFEST_AND_MCP_HANDOFF_V1.md`.
- Globe (`efeonce-globe`) como proveedor de assets generados.

## Exit Criteria

- [ ] `studio.efeonce.org` sirve Studio con login Efeonce ID y sin modo `open`. Progreso: en vivo en modo `open`; login = TASK-1898.
- [ ] Las campañas vigentes viven en Studio como fuente, con corte de autoridad declarado. Progreso: CMP-001..005 importadas como proyección reimportable; corte = TASK-1894.
- [ ] Toda operación de la UI tiene su endpoint `/api/v1` documentado en OpenAPI. Progreso: la UI actual (sólo lectura) ya consume operaciones del registro único con test de paridad handlers ↔ registro; queda abierto hasta que la UI de edición (TASK-1895) nazca igual.
- [ ] Efeonce MCP federa al menos las lecturas de Studio. Progreso: provider ENCENDIDO en producción desde 2026-09-26 (`efeonce-mcp-gateway-00061-sbc`); se marca con el canary con token humano (TASK-1891).
- [ ] Restauración de la base `marketing_studio` probada. Progreso: sin empezar (TASK-1896).

## Non-goals

- Reemplazar Globe en la generación o el gobierno de derechos de piezas generadas.
- Gestionar organizaciones, personas o accesos fuera de Efeonce ID / Greenhouse.
- Operar pauta en vivo (crear campañas en Meta/LinkedIn) antes de tener readback y aprobaciones gobernadas.
