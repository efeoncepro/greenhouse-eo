# Data Sources, APIs y Conexión al Runtime

Cómo se obtienen los datos de licitaciones y cómo esta skill se conecta al **módulo runtime** (RESEARCH-007). Esta skill es el método; el runtime (ingesta, tablas, bid desk) lo construyen `arch-architect` + `greenhouse-backend` sobre el research. Acá está el contrato de datos validado y las reglas para no reinventarlo.

> **Frontera:** esta skill **no** implementa la ingesta ni el schema. Declara el contrato y delega. Si te piden construir el módulo, carga `docs/research/RESEARCH-007-commercial-public-tenders-module.md` + `arch-architect` (overlay) + `greenhouse-backend`.

## API Mercado Público (Chile) — contrato validado

### Licitaciones (API v1, read-only, ticket por query param)
```
Base: https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json
Auth: query param  ticket=<ticket DCCP>
```
| Caso | Params | Nota |
|---|---|---|
| Detalle por código | `codigo=<CodigoExterno>&ticket=` | **El contrato a usar** para hidratar descripción, items, adjudicación |
| Listado del día | `ticket=` | Resumido |
| Listado por fecha | `fecha=<ddmmaaaa>&ticket=` | Formato `ddmmaaaa` |
| Activas | `estado=activas&ticket=` | Miles de registros resumidos |
| Por fecha y estado | `fecha=&estado=<publicada\|cerrada\|desierta\|adjudicada\|revocada\|suspendida\|todos>&ticket=` | |
| Por proveedor/organismo | `CodigoProveedor=` / `CodigoOrganismo=` | Códigos internos, no RUT (vía `BuscarProveedor`/`BuscarComprador`) |

Estados numéricos: `5` publicada, `6` cerrada, `7` desierta, `8` adjudicada, `18` revocada, `19` suspendida.

**Clave de arquitectura:** el **listado** solo trae `CodigoExterno`, `Nombre`, `CodigoEstado`, `FechaCierre`. Para `Descripcion` e `Items` necesitas **hidratar por `codigo`**. El screening barato usa el listado; el fit real exige hidratación (ver `bid-lifecycle-go-no-go.md`).

### Órdenes de Compra (v1)
```
Base: https://api.mercadopublico.cl/servicios/v1/publico/ordenesdecompra.json
```
Detalle por `codigo`, listado por fecha/estado/organismo/proveedor. Útil para reconstruir el downstream (adjudicación → OC) y el puente Compra Ágil → OC (sufijo `AG`).

### Compra Ágil (API v2 Beta — contrato distinto, ticket por HEADER)
```
Base: https://api2.mercadopublico.cl
Auth: header  ticket: <ticket>   (¡NO query param!)
  GET /v2/compra-agil
  GET /v2/compra-agil/{codigo}
```
- El ticket canónico existente autentica contra v2. Expone Compra Ágil como códigos `COT`, estados normalizados, documentos (metadata `id`/`nombre`), institución, productos, proveedores cotizando, montos y link con OC.
- Filtros validados: `ttl_cambio_ms`, `tamano_pagina`, `publicado_desde`/`publicado_hasta` (ISO).
- **`COT` y `RFI/RF` no entran** por `licitaciones.json` — usa este carril para Compra Ágil.

### Adjuntos (bases, anexos) — no vienen en el JSON
Los adjuntos descargables **no** están en el JSON validado. El camino validado es la **ficha pública WebForms**:
```
https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?idlicitacion=<codigo>
→ links a Attachment/VerAntecedentes.aspx?enc=...
→ descarga por postback WebForms sobre grdAttachment$...$grdIbtnView
```
- En Compra Ágil v2, el detalle expone metadata de documentos (`id`/`nombre`) pero **la descarga no tiene endpoint público documentado** (rutas probadas dan 403/401). No uses rutas internas de la SPA como contrato productivo sin autorización/sesión humana.
- **Circuit breaker** obligatorio para el parser HTML de adjuntos (frágil por naturaleza).

### Cuota y resiliencia
- La API documenta **límite diario** — respeta el budget de cuota en el plan de hidratación.
- Contrato de reliability (del research): `source_sync_runs`, `source_sync_watermarks`, `source_payloads` (raw para debug), retry/backoff por fuente, checksums de ZIP/CSV/documentos, DLQ para filas/documentos no parseables, canarios (licitación conocida, OC conocida, COT esperado).

## Secreto / ticket

- El ticket DCCP vive como secreto canónico (patrón `greenhouse-mercado-publico-ticket`). Resolver server-side vía `*_SECRET_REF`; nunca hardcodear. (Ver reglas de Secret Manager Hygiene del repo + `greenhouse-secret-hygiene`.)

## POC existente (no reinventar)

`scripts/research/mercadopublico-poc/`:
- `match_licitaciones.py` — matcher comercial POC (Python).
- `keywords.yaml` — familias de servicio → BU (agencia_creativa, produccion_audiovisual, social_media_content, performance_paid_media, seo_aeo…) con keywords.
- Hallazgos en `docs/research/TASK-673-findings.md`: word-boundary obligatorio, evitar acrónimos cortos/keywords amplias, nombre < bases técnicas, señales no canónicas como `signals`.
- Next step del research: converger a TypeScript en `src/lib/integrations/mercado-publico/tenders.ts`.

## Conexión al modelo canónico 360 (no crear identidades paralelas)

La oportunidad **extiende** el modelo canónico, no crea uno paralelo:

```
public_opportunity (comprador → organization/account)
   → deal (HubSpot / commercial)
      → quote
         → SOW
            → delivery
```

- El **comprador público** mapea a `organization/account` cuando aplique.
- Objeto interno amplio: `public_procurement_opportunity` con `opportunity_kind` (no solo "licitación") + `external_procedure_code` (`Tipo`) + `external_codigo_tipo` (`CodigoTipo`) + `procedure_family` (tabla de mapping versionada, no derivar del prefijo).
- Tablas candidatas del research: `greenhouse_commercial.public_tenders*` (opportunities, documents, decisions, links). **El schema lo diseña `arch-architect`, no esta skill.**

## Integración con el ecosistema Greenhouse

| Sistema | Rol |
|---|---|
| **Commercial / Deals** | Oportunidad aprobada → deal/quote draft (`commercial-expert` + `hubspot-greenhouse-bridge`) |
| **Organizations** | Comprador público → account/organization canónico |
| **Assets/Documents** | Adjuntos externos + documentos internos curados |
| **Teams Notifications** | Alertas de alto fit, cierre cercano, cambio documental, decisión pendiente (`greenhouse-teams-message-operator`) |
| **Reliability / Ops Health** | Freshness, parser health, cuota, DLQ (`greenhouse-cron-sync-ops`) |
| **Identity/Access** | Surface `comercial.licitaciones_publicas` + capabilities finas (entitlements) |
| **Finance/Pricing** | Aprobación de pricing/margen al transformarse en quote |

## Datos de LATAM (radar por país)

Patrón replicable del caso Chile (ver `latam-portales-matriz.md`):
- **Colombia (SECOP):** datos abiertos vía `datos.gov.co` (Socrata) — API consultable.
- **Brasil (PNCP):** API pública de contrataciones bajo Lei 14.133.
- Otros: web-first, madurez variable — verificar endpoints vigentes antes de asumir API.

## MCP y herramientas

- **Legal Data Hunter** (MCP, requiere autorización en sesión) — útil para investigar marco legal/normativo. Si no está autorizado en la sesión, dilo; no lo asumas conectado.
- **HubSpot** (MCP/bridge) — pipeline y deals.
- **Notion** — bid desk / ficha de oportunidad.
- Verificación runtime de endpoints/ticket: `pnpm staging:request` o script del POC contra la API real (respetando cuota).

## Hand-off

- Construir el módulo (schema, ingesta, reliability) → `arch-architect` (overlay) + `greenhouse-backend` sobre RESEARCH-007.
- Secreto/ticket → `greenhouse-secret-hygiene`.
- Notificaciones/crons → `greenhouse-teams-message-operator` + `greenhouse-cron-sync-ops`.
- Matriz LATAM → `latam-portales-matriz.md`.
