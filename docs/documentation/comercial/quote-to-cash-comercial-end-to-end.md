# Comercial y Quote-to-Cash end-to-end

> **Tipo de documento:** Documentacion funcional
> **Version:** 1.0
> **Creado:** 2026-06-15 por Codex
> **Modulo:** Comercial / Quote-to-Cash / HubSpot / Pricing
> **Rutas principales:** `/finance/quotes`, `/finance/contracts`, `/finance/master-agreements`, `/admin/pricing-catalog`, `/admin/commercial/parties`, `/admin/commercial/product-catalog`, `/finance/intelligence/pipeline`
> **Arquitectura relacionada:** `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`, `docs/architecture/GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md`, `docs/architecture/GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md`, `docs/architecture/GREENHOUSE_COMMERCIAL_FINANCE_DOMAIN_BOUNDARY_V1.md`

## Para que sirve

Este documento explica el recorrido comercial completo: desde una organizacion prospecto o deal HubSpot hasta cotizacion, pricing, aprobacion, emision, contrato/SOW, invoice/cash y analitica comercial.

Greenhouse separa tres responsabilidades que suelen confundirse:

- **Comercial** define party, deal, pricing, cotizacion, terminos, aprobaciones y contrato.
- **Finance** materializa revenue, invoices, cash, payment orders, conciliacion y P&L.
- **HubSpot** sigue siendo CRM externo y canal de sync, no source unico para operar Greenhouse.

## Evidencia revisada

Reconciliado contra codigo y DB read-only el 2026-06-15.

Rutas y codigo revisados:

- APIs `src/app/api/commercial/**`, `src/app/api/finance/quotes/**`, `src/app/api/finance/contracts/**`, `src/app/api/admin/pricing-catalog/**`, `src/app/api/admin/commercial/**`.
- Librerias `src/lib/commercial/**`, `src/lib/finance/pricing/**`, `src/lib/finance/quote-to-cash/**`, `src/lib/hubspot/**`, `src/lib/commercial-intelligence/**`.
- Superficies `/finance/quotes`, `/finance/contracts`, `/admin/pricing-catalog`, `/admin/commercial/product-catalog`, `/admin/commercial/parties`.

DB agregada sin PII:

- `greenhouse_commercial` tiene 67 tablas.
- `quotations`: 57 filas (`draft` 43, `issued` 12, `expired` 2).
- `quotation_line_items`: 65; `quotation_versions`: 54; `quotation_audit_log`: 17.
- `contracts`: 22, todos `draft` en la muestra actual.
- `deals`: 35; `deal_pipeline_snapshots`: 35.
- `product_catalog`: 77; `product_catalog_prices`: 59; `product_sync_conflicts`: 53.
- Pricing catalog tiene `sellable_roles`, `employment_types`, `overhead_addons`, governance y audit log.
- `master_agreements` existe pero esta vacio: es capacidad target/infra, no operacion viva con registros actuales.

## Mapa funcional

| Capa | Entidades/runtime | Que hace |
|---|---|---|
| Party lifecycle | `greenhouse_core.organizations`, party search/sync/conflicts | Normaliza prospecto/oportunidad/cliente y relacion con HubSpot |
| Deals | `greenhouse_commercial.deals`, HubSpot deal sync | Mantiene forecast, stage, owner, company/deal anchors |
| Product/Pricing catalog | sellable roles, tools, overheads, services, governance | Define que se puede vender y con que costo/precio |
| Quote Builder | `quotations`, line items, versions, audit | Crea cotizaciones, simula pricing, congela IVA, versiona y emite |
| Approval by exception | approval policies/steps | Bloquea emision cuando margen/descuento requiere aprobacion |
| HubSpot quote sync | outbound projections, HubSpot bridge | Publica o actualiza quote en HubSpot cuando hay anchors suficientes |
| Contract/SOW | contracts, contract_quotes, document chain | Convierte una cotizacion emitida en contrato o SOW |
| Quote-to-Cash | materializers invoice/income/HES | Lleva el documento comercial hacia Finance sin duplicar cash |
| Commercial intelligence | pipeline, MRR/ARR, profitability | Lee snapshots para forecast y analitica, no reemplaza source of truth |

## Flujo end-to-end

1. La organizacion nace o se adopta desde HubSpot/Greenhouse.
2. Party lifecycle clasifica prospecto, oportunidad, cliente activo, inactivo o churned.
3. El deal se sincroniza o se crea desde el contexto de la cotizacion si la governance lo permite.
4. El operador crea la cotizacion desde `/finance/quotes/new`.
5. El builder resuelve catalogo, roles, herramientas, overheads, moneda, impuestos y margen.
6. La simulacion de pricing calcula total neto, IVA, total, margen y warnings.
7. La cotizacion se guarda como draft y versiona cambios relevantes.
8. Al emitir, Greenhouse evalua approval by exception.
9. Si no hay excepcion, pasa a `issued`; si hay excepcion, pasa a approval y luego a `issued` o `approval_rejected`.
10. La cotizacion emitida puede generar PDF, link publico y sync HubSpot.
11. Quote-to-cash puede convertir la cotizacion en contrato, invoice/income o documento downstream segun el flujo.
12. Finance registra cobros, caja, banco y conciliacion; Comercial no concilia cartolas.

## Que hace automatico Greenhouse

- Resuelve party/organization y contactos cuando existen anchors.
- Simula pricing desde catalogo y governance.
- Calcula IVA y congela snapshots tributarios en la cotizacion.
- Versiona cotizaciones y guarda audit log.
- Evalua approvals por margen/descuento.
- Emite eventos comerciales (`commercial.quotation.*`, deal/product sync, etc.).
- Sincroniza hacia HubSpot por proyecciones cuando hay company/deal/contact validos.
- Materializa snapshots de pipeline/rentabilidad.

## Que hace el operador

- Selecciona organizacion, contacto y deal correcto.
- Decide line items, cantidades, periodo, terminos y descuentos.
- Revisa warnings de pricing/margen.
- Solicita o responde aprobaciones cuando aplica.
- Emite la cotizacion oficial.
- Revisa sync conflicts con HubSpot/product catalog.
- Convierte o vincula la cotizacion a contrato/SOW cuando el negocio se cierra.

## Fronteras importantes

- `draft` no es oferta oficial; `issued` si.
- PDF/link/share no reemplazan el estado documental de emision.
- HubSpot refleja y sincroniza, pero Greenhouse mantiene el contrato operacional local.
- El precio del cliente debe estar visible como line item; no se deben esconder markups como costos invisibles.
- Contrato/SOW no significa cobro recibido.
- Quote-to-cash no debe crear revenue/cash duplicado si ya existe documento financiero derivado.
- `master_agreements` existe como infraestructura, pero sin registros actuales en DB; Nexa no debe afirmar que hay MSAs operativos activos.

## Preguntas que Nexa debe responder

- Como creo una cotizacion?
- Que diferencia hay entre draft, issued y approval_rejected?
- Cuando una cotizacion requiere aprobacion?
- Que hace automatico el pricing engine?
- Como se sincroniza una cotizacion con HubSpot?
- Que pasa despues de emitir una cotizacion?
- Que diferencia hay entre cotizacion, contrato, invoice e ingreso?
- Como reviso conflictos de catalogo de productos?
- Que no debo tocar manualmente en HubSpot?

## Documentacion relacionada

- `docs/documentation/finance/cotizador.md`
- `docs/documentation/finance/cotizaciones-gobernanza.md`
- `docs/documentation/finance/quote-to-cash-atomico.md`
- `docs/documentation/finance/contratos-comerciales.md`
- `docs/documentation/finance/pricing-comercial.md`
- `docs/documentation/admin-center/catalogo-productos-fullsync.md`
- `docs/documentation/admin-center/commercial-parties.md`
- `docs/documentation/comercial/surfaces-comerciales-sobre-rutas-finance.md`
