# Operar Comercial y Quote-to-Cash

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-06-15 por Codex
> **Modulo:** Comercial / Quote-to-Cash
> **Rutas:** `/finance/quotes`, `/finance/contracts`, `/admin/pricing-catalog`, `/admin/commercial/parties`, `/admin/commercial/product-catalog`
> **Documentacion relacionada:** `docs/documentation/comercial/quote-to-cash-comercial-end-to-end.md`

## Antes de empezar

Define que estas operando:

| Necesitas | Ruta inicial |
|---|---|
| Crear cotizacion | `/finance/quotes/new` |
| Revisar cotizaciones | `/finance/quotes` |
| Administrar catalogo/pricing | `/admin/pricing-catalog` |
| Resolver productos HubSpot | `/admin/commercial/product-sync-conflicts` |
| Revisar party lifecycle | `/admin/commercial/parties` |
| Crear o revisar contrato/SOW | `/finance/contracts` |

## Crear una cotizacion

1. Abre `/finance/quotes/new`.
2. Selecciona la organizacion/party correcta.
3. Confirma contacto y deal HubSpot si aplica.
4. Agrega line items desde catalogo o manuales permitidos.
5. Revisa moneda, cantidad, periodo, tipo de contratacion y terminos.
6. Espera la simulacion de pricing.
7. Revisa total neto, IVA, total, margen y warnings.
8. Guarda como draft si todavia falta revision.
9. Emite solo cuando el documento esta listo para compartir como oferta oficial.

## Si la cotizacion queda en aprobacion

1. Revisa el motivo: margen, descuento, governance o policy.
2. No intentes saltar la aprobacion editando el estado.
3. Espera decision del aprobador o ajusta la cotizacion.
4. Si se aprueba, Greenhouse la emite.
5. Si se rechaza, queda `approval_rejected`; debes corregir o crear nueva version segun corresponda.

## Sincronizar con HubSpot

1. Verifica que la organization tenga `hubspot_company_id`.
2. Verifica deal y contacto si el flujo lo requiere.
3. Emite la cotizacion.
4. Revisa estado de sync en la vista o logs disponibles.
5. Si hay conflicto de producto, resuelvelo en `/admin/commercial/product-sync-conflicts`.

No crees manualmente otra quote en HubSpot para "arreglar" una sync fallida. Eso rompe anchors.

## Pasar de cotizacion a contrato o cash

1. Confirma que la cotizacion esta `issued`.
2. Si hay contrato/SOW, crea o vincula en `/finance/contracts`.
3. Usa el document chain para revisar PDFs, versiones y anchors.
4. Para invoice/income, usa el flujo quote-to-cash correspondiente.
5. Finance debe controlar ingreso, cobro, caja, banco y conciliacion.

## Que no hacer

- No tratar `draft` como oferta oficial.
- No editar HubSpot como source principal si Greenhouse ya tiene quote canonica.
- No crear ingresos duplicados cuando quote-to-cash ya materializo documento financiero.
- No esconder costos o addons cobrados al cliente.
- No cambiar pricing governance sin audit/aprobacion.
- No prometer que emitir cotizacion registra cobro.

## Problemas comunes

### No aparece el deal

Revisa sync HubSpot y `deal-creation-context`. Puede faltar company binding, contacto u owner.

### El pricing no calcula

Revisa catalogo, employment type, moneda, periodos y line items. Si falta SKU o governance, resuelve en Pricing Catalog.

### HubSpot no refleja la cotizacion

Revisa anchors company/deal/contact y conflictos de producto. No dupliques a mano.

### El cliente acepto, pero no hay ingreso

Cotizacion aceptada/emitida no es cash. Usa contrato/quote-to-cash y luego Finance para cobro/conciliacion.
