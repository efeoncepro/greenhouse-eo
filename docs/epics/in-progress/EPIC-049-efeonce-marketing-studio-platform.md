# EPIC-049 — Efeonce Marketing Studio: plataforma de campañas API-first

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Status real: `Fundación en vivo (TASK-1887). Studio listo para agentes (TASK-1890) y federado en Efeonce MCP con lectura en producción (TASK-1891). Originales en GCS + worker de medios (TASK-1893) y observabilidad + restauración probada (TASK-1896) en producción desde 2026-09-26 (release Greenhouse 92002873ced9). ADR de fuente única e ingesta aceptado el 2026-09-26: Studio + GCS son la fuente; OneDrive es taller; un command y tres puertas (CLI, MCP, UI); sin espejo por Microsoft Graph. Nada de ese ADR está en runtime todavía. Siguen TASK-1892, 1894, 1895, 1897, 1898 y 1899 (métricas, command de ingesta y corte, UI, CONNECT, login y puerta MCP de escritura y aprobación).`
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
- Studio + GCS como fuente única de campañas, piezas, versiones, derechos y aprobaciones; OneDrive/SharePoint queda
  como taller del equipo. Un final existe sólo cuando entró a Studio.
- Escrituras gobernadas (idempotencia, revisión, auditoría con la persona como actor) por un solo command y tres
  puertas (CLI, MCP, UI), y corte de autoridad por campaña con fecha.
- Worker asíncrono para miniaturas/GCS, readback de Metricool y publicación programada.

## Architecture Alignment

- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_SSOT_AND_INGEST_DECISION_V1.md` (ADR `Accepted`
  2026-09-26, fuente única e ingesta; reemplaza la regla «OneDrive fuente, Studio proyección reimportable»)
- `docs/architecture/EFEONCE_STUDIO_API_FIRST_DECISION_V1.md` (ADR, delta 2026-09-25)
- `docs/architecture/marketing-studio/EFEONCE_MARKETING_STUDIO_ARCHITECTURE_V1.md`
- `docs/architecture/EFEONCE_ID_RELYING_PARTY_ENTRY_AND_CONSENT_DECISION_V1.md`
- `docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`
- `docs/operations/EFEONCE_CAMPAIGN_REGISTRY_V1.md`
- `docs/architecture/creative-studio/` (frontera con Globe)

## Decisión de fuente única e ingesta (ADR 2026-09-26)

- **Fuente:** la base `marketing_studio` (schema `studio`) es dueña de campañas, piezas, versiones, derechos,
  aprobaciones y evidencia; el bucket privado `efeonce-marketing-studio-originals` es dueño de los bytes
  (`originals/sha256/<2 primeros hex>/<sha256>`, versionado, nunca sobrescrito).
- **Taller:** OneDrive/SharePoint conserva editables y borradores; «final» nunca se infiere por carpeta.
- **Un command, tres puertas:** `createAssetVersion` (tool `studio.asset.version.create`) sirve a la CLI
  `studio:upload`, a los agentes por MCP y a la UI. Subida en dos pasos: URL firmada V4 de un objeto (reanudable para
  video grande), bytes directo a GCS, confirmación con sha256 recalculado. Ningún binario pasa por MCP ni por Vercel.
- **Aprobación humana:** una versión nueva entra pendiente de revisión; aprueba una persona o un agente con su
  identidad delegada tras `dryRun` → confirmación. Capabilities: `marketing_studio.asset.write` (subir:
  `efeonce_admin`, `efeonce_account`, `efeonce_operations`, `designer`) y `marketing_studio.campaign.approve`
  (aprobar: los tres primeros; `designer` sube pero nunca aprueba).
- **Corte:** por campaña y con fecha; después del corte, `pnpm media:ingest` sólo sirve para backfill de historia.
- **Fuera del plan:** espejo programado de SharePoint/OneDrive por Microsoft Graph.

## Child Tasks

Orden recomendado (actualizado 2026-09-26): 1890 → 1891 · 1893 en paralelo · 1896 → 1892 → 1894 → 1895 · 1899 (ambas consumen los commands de 1894) → 1897 (cuando convenga) → 1898 al final.

**Regla de paridad del programa (operador, 2026-09-25):** todo lo que se puede hacer en la UI se puede hacer por la API y, por consiguiente, por MCP — incluidas las aprobaciones. Las aprobaciones las decide una persona; un agente puede ejecutarlas con la identidad delegada de esa persona y su confirmación explícita. Ninguna capacidad nace sólo en la UI.

- `TASK-1887` — **Complete.** Fundación: repo, bases y roles, modelo de dominio, API v1, import del catálogo, renditions privadas, UI aprobada (claro/oscuro), Vercel + dominio (modo `open`). En vivo en `https://studio.efeonce.org`.
- `TASK-1890` — **Complete 2026-09-26** (manual servido en producción tras el release `0e87c7a443a2`). Studio listo para agentes: registro único de operaciones (17: 12 tools + 5 exclusiones), manifiesto con paridad, semántica, bearer de servicio, organización canónica, capability `marketing_studio.campaign.read` y manual. En producción de Studio desde `d08387f`. **Pendiente:** release de Greenhouse a producción para servir el manual `marketing-studio`.
- `TASK-1891` — **Complete 2026-09-26**: provider encendido y verificado en producción (`00061-sbc`, canary MCP real verde; la denegación en vivo a una persona sin capability queda sin ejercitar, cubierta por tests). Federación en Efeonce MCP de las 12 tools del manifiesto. Canje RFC 8693 en Greenhouse (cliente `efeonce-mcp-marketing-studio`, migrado) y gateway 1.8.0 desplegado (PR `efeonce-mcp#19`, revisión `00057-w8h`) con el flag OFF. **Pendiente:** release de Greenhouse (canje + manual) → `MARKETING_STUDIO_PROVIDER_ENABLED=true` + dispatch → `pnpm studio:canary` con token Entra humano → sesión MCP real. Regla desde aquí: toda capacidad nueva de Studio nace con su tool en el manifiesto o una exclusión con razón.
- `TASK-1892` — To-do. Métricas de marketing desde Greenhouse (Search Console, GA4, SEO) por el lane ecosystem `/api/platform/ecosystem/growth/*`, nunca por SQL. Pauta (Meta/LinkedIn) y social orgánico (Metricool) quedan en adapters propios de Studio.
- `TASK-1893` — **Complete 2026-09-26.** Almacén de originales en GCS (finales aprobados, sha256, versionado, derechos) y worker Cloud Run de medios: renditions automáticas, portadas de video, recortes y readback de Metricool. En producción: 30 versiones ingestadas por ambiente, derivados automáticos, canary de descarga verde, readback con 2 posts publicados observados. **Pendiente (Follow-ups):** 24 imágenes de CMP-002 sin sha256 en el catálogo, federación de `studio.asset.download` en el gateway, costo del primer mes.
- `TASK-1894` — To-do, re-alcanzada por el ADR del 2026-09-26. Command `createAssetVersion` y URL firmada de subida, CLI `studio:upload`, derechos mínimos al subir, commands de escritura y de aprobación con `requiresPerson` y `dryRun`, scopes de API `studio:assets:write` y `studio:write`, capabilities `marketing_studio.asset.write` y `marketing_studio.campaign.write`, corte por campaña con fecha y señal «pieza aprobada sin original en Studio».
- `TASK-1895` — To-do. Puerta UI: edición, subida, revisión y aprobación de versiones y panel de métricas, consumidora de los mismos commands de 1894 (y del digest de confirmación de 1899).
- `TASK-1896` — **Complete 2026-09-26.** Observabilidad, alertas y restauración verificada de `marketing_studio`: Sentry, uptime con email, health profundo, `studio.ops_run`, ensayo verde en producción (job 49 s) con scheduler activo, señal `platform.marketing_studio.health` y aviso Teams «EO - Admin». **Pendiente (Follow-ups):** reglas propias de Sentry (API a Workflows), error forzado, caída simulada del uptime, mensaje real a Teams, primera corrida programada del ensayo (29/09).
- `TASK-1897` — To-do. (Greenhouse) Cerrar `CONNECT` de PUBLIC en `greenhouse_app` y en las bases de Studio.
- `TASK-1899` — To-do. Puerta MCP: federa `studio.asset.upload.request`, `studio.asset.version.create`, las aprobaciones y `studio.asset.download` (Follow-up de TASK-1893) con la clase `efeonce.mcp.marketing_studio.write`, y siembra `marketing_studio.campaign.approve`. El canje de Greenhouse pide la capability exacta de cada tool (un cliente por capability, política con `requireOnPrivilegedAction = true`) y Studio revalida a la persona en `userinfo`: el actor auditado es la persona, nunca el gateway. Aprobaciones con `dryRun` → confirmación con `proposalDigest`. Bloqueada por TASK-1894.
- `TASK-1898` — To-do. Login con Efeonce ID (`auth.efeonce.org`) y cambio de `STUDIO_ACCESS_MODE` a `efeonce_id`. Última del programa por decisión del operador (2026-09-25).

## Existing Related Work

- Prototipo `OneDrive/…/15. Paid Media/ABRIR CAMPAIGN MANAGER.html` + `01. Recursos/Campaign Manager/` (generador, catálogo, LEEME).
- `docs/campaigns/` — CDR-001…011, harness de campañas.
- `docs/operations/EFEONCE_PAID_MEDIA_MANIFEST_AND_MCP_HANDOFF_V1.md`.
- Globe (`efeonce-globe`) como proveedor de assets generados.

## Exit Criteria

- [ ] `studio.efeonce.org` sirve Studio con login Efeonce ID y sin modo `open`. Progreso: en vivo en modo `open`; login = TASK-1898.
- [ ] Las campañas vigentes viven en Studio como fuente, con corte de autoridad declarado por campaña y con fecha, y sus finales nuevos entran sólo por las puertas del ADR (CLI, MCP o UI sobre `createAssetVersion`). Progreso: CMP-001..005 importadas como proyección reimportable; command y corte = TASK-1894; puerta MCP = TASK-1899; puerta UI = TASK-1895.
- [ ] Un agente sube un final y una persona lo aprueba desde MCP con la persona como actor auditado (TASK-1899).
- [ ] La señal «pieza aprobada sin original en Studio» está en cero para toda campaña cortada, o cada caso tiene dueño (TASK-1894).
- [ ] Toda operación de la UI tiene su endpoint `/api/v1` documentado en OpenAPI. Progreso: la UI actual (sólo lectura) ya consume operaciones del registro único con test de paridad handlers ↔ registro; queda abierto hasta que la UI de edición (TASK-1895) nazca igual.
- [x] Efeonce MCP federa al menos las lecturas de Studio: 12 tools `studio.*` en producción desde 2026-09-26 (`efeonce-mcp-gateway-00061-sbc`), con canary MCP real verde (TASK-1891).
- [x] Restauración de la base `marketing_studio` probada: ensayo lógico en Cloud Run contra producción `succeeded` el 2026-09-26 (paridad de 18 tablas, restore 2 s, job 49 s, base temporal eliminada), falla forzada probada en staging y ensayo mensual programado (TASK-1896).

## Non-goals

- Reemplazar Globe en la generación o el gobierno de derechos de piezas generadas.
- Gestionar organizaciones, personas o accesos fuera de Efeonce ID / Greenhouse.
- Operar pauta en vivo (crear campañas en Meta/LinkedIn) antes de tener readback y aprobaciones gobernadas.
- Espejar SharePoint/OneDrive con Microsoft Graph (delta queries programadas) como fuente o como proceso de ingesta. Una lectura por Graph sólo sirve para backfill o reconciliación puntual.
- Inferir que una pieza es final por la carpeta en que está.
