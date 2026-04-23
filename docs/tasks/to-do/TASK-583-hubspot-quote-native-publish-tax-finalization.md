# TASK-583 — HubSpot Quote Native Publish & Tax Finalization

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `—`
- Status real: `Diseño`
- Rank: `TBD`
- Domain: `crm`
- Blocked by: `none`
- Branch: `task/TASK-583-hubspot-quote-native-publish-tax-finalization`
- Legacy ID: `—`
- GitHub Issue: `—`

## Summary

Cerrar el último gap nativo del carril `quotation -> HubSpot quote`: la quote ya nace con sender, emisor, producto, SKU y billing semantics, pero sigue quedando en `DRAFT` y sin tasa tributaria nativa HubSpot. Esta task formaliza el publish final y el tax binding nativo para que Greenhouse deje la quote publicada al terminar, sin edición manual en HubSpot.

## Why This Task Exists

`TASK-576` cerró gran parte del contrato publish-ready, pero la evidencia real en HubSpot mostró que todavía faltan dos piezas estructurales:

- la quote `39307909907` sigue en `hs_status = DRAFT`
- el line item `54542714929` tiene `tax = 555465` y `gh_tax_rate = 0.19`, pero `hs_tax_rate_group_id = null`

Es decir: Greenhouse ya está enviando metadata comercial y tributaria útil, pero no está cerrando todavía el contrato **nativo** que HubSpot usa para:

- publicar la quote (`hs_status`, `hs_quote_link`, `hs_pdf_download_link`, `hs_locked`)
- mostrar/aplicar la tasa tributaria de forma first-class (`hs_tax_rate_group_id`)

Además, la investigación confirmó un descalce de nombres de propiedad que no debe sobrevivir a la siguiente implementación:

- la frecuencia nativa correcta es `recurringbillingfrequency`
- la fecha nativa correcta es `hs_recurring_billing_start_date`
- `hs_billing_start_date` no existe
- `hs_recurring_billing_period` no es el campo UI-canonical de billing frequency

Si este follow-up no se formaliza, Greenhouse seguirá quedando en un punto intermedio: quote enriquecida pero no publicada, y con impuesto visible solo como metadata custom en vez de contrato nativo HubSpot.

## Goal

- La quote HubSpot queda publicada al terminar el push final desde Greenhouse.
- Los line items quedan ligados a una tasa tributaria nativa HubSpot resolviendo `hs_tax_rate_group_id` desde el contrato tributario canónico de Greenhouse.
- Create, update, reopen y republish convergen sobre el mismo estado final publish-ready.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_PRODUCT_CATALOG_SYNC_V1.md`
- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`

Reglas obligatorias:

- `organization_id -> hubspot_company_id` sigue siendo el anchor canónico del carril quote outbound; `space` no puede volver a ser prerequisito estructural.
- `person_360` sigue siendo el resolver canónico para personas/contactos.
- No hardcodear IDs nativos de HubSpot en código; el tax binding debe resolver la tasa desde la librería/config nativa de HubSpot por contrato canónico (`tax_code`, `tax_rate_snapshot` o mapping gobernado equivalente).
- El contrato final debe usar propiedades nativas reales de HubSpot Quotes y Line Items; metadata custom como `gh_tax_rate` es complementaria, no sustituto del contrato native publish.
- Mientras `TASK-574` no cierre, cualquier cambio en `/quotes` del bridge sigue siendo cross-repo con el sibling `/Users/jreye/Documents/hubspot-bigquery-task-563`.

## Normative Docs

- `docs/tasks/to-do/TASK-576-hubspot-quote-publish-contract-completion.md`
- `docs/tasks/complete/TASK-530-quote-tax-explicitness-chile-iva.md`
- `docs/tasks/to-do/TASK-574-absorb-hubspot-greenhouse-integration-service.md`
- `project_context.md`
- `Handoff.md`

## Dependencies & Impact

### Depends on

- `src/lib/hubspot/create-hubspot-quote.ts`
- `src/lib/hubspot/push-canonical-quote.ts`
- `src/lib/hubspot/update-hubspot-quote.ts`
- `src/lib/integrations/hubspot-greenhouse-service.ts`
- `src/lib/commercial/hubspot-contact-resolution.ts`
- `src/lib/sync/projections/quotation-hubspot-outbound.ts`
- `src/lib/finance/pricing/quotation-pricing-orchestrator.ts`
- `src/lib/finance/quotation-canonical-store.ts`
- sibling repo `/Users/jreye/Documents/hubspot-bigquery-task-563/services/hubspot_greenhouse_integration/app.py`
- sibling repo `/Users/jreye/Documents/hubspot-bigquery-task-563/services/hubspot_greenhouse_integration/hubspot_client.py`
- sibling repo `/Users/jreye/Documents/hubspot-bigquery-task-563/tests/test_hubspot_greenhouse_integration_app.py`

### Blocks / Impacts

- Endurece el baseline que `TASK-574` debe absorber al monorepo sin regresión.
- Impacta el carril reactivo `quotation_hubspot_outbound` y el contrato HTTP `POST/PATCH /quotes`.
- Completa el objetivo comercial de quote publish-ready sin intervención manual en HubSpot.
- Cierra el gap entre el contrato tributario de `TASK-530` y su materialización nativa en HubSpot Quotes.

### Files owned

- `src/lib/hubspot/create-hubspot-quote.ts`
- `src/lib/hubspot/push-canonical-quote.ts`
- `src/lib/hubspot/update-hubspot-quote.ts`
- `src/lib/integrations/hubspot-greenhouse-service.ts`
- `src/lib/sync/projections/quotation-hubspot-outbound.ts`
- `src/lib/finance/pricing/**`
- `src/lib/finance/quotation-canonical-store.ts`
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- sibling repo `/Users/jreye/Documents/hubspot-bigquery-task-563/services/hubspot_greenhouse_integration/app.py`
- sibling repo `/Users/jreye/Documents/hubspot-bigquery-task-563/services/hubspot_greenhouse_integration/hubspot_client.py`
- sibling repo `/Users/jreye/Documents/hubspot-bigquery-task-563/tests/test_hubspot_greenhouse_integration_app.py`

## Current Repo State

### Already exists

- `TASK-576` ya dejó la quote outbound anclada en `organization_id`, con sender/emisor canónicos, catálogo-first y asociaciones correctas.
- El line item real `54542714929` ya tiene `hs_product_id = 34043995189`, `hs_sku = ECG-001`, `recurringbillingfrequency = monthly` y `hs_recurring_billing_start_date = 2026-04-23`.
- El line item real ya persiste `tax = 555465` y `gh_tax_rate = 0.19`.
- El portal HubSpot real ya tiene una tasa activa `IVA` de `19.0%` en su tax library.
- El bridge ya soporta create y patch de quotes como base de convergencia.

### Gap

- La quote real `39307909907` sigue en `hs_status = DRAFT`.
- `hs_quote_link`, `hs_pdf_download_link` y `hs_locked` siguen sin materializarse porque no se está ejecutando el publish nativo final.
- El line item real sigue con `hs_tax_rate_group_id = null`, por lo que la tasa impositiva nativa no queda cerrada aunque exista `tax` y `gh_tax_rate`.
- El contrato runtime todavía mezcla metadata custom útil con ausencia de finalización nativa HubSpot.
- No existe todavía una política explícita y documentada de reopen/resync/republish para quotes ya publicadas.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Native HubSpot publish contract

- Confirmar en runtime si el carril V1 sigue siendo `CUSTOMIZABLE_QUOTE_TEMPLATE` y no `CPQ_QUOTE`.
- Implementar el cierre explícito de publish de la quote usando el contrato nativo HubSpot (`hs_status`) en el momento correcto del flujo.
- Persistir y rehidratar los outputs derivados del publish (`hs_quote_link`, `hs_pdf_download_link`, `hs_locked`) como parte del estado observable de la quote outbound.

### Slice 2 — Native tax rate binding

- Resolver la tasa tributaria nativa HubSpot desde la tax library/config real del portal y mapearla desde el contrato tributario canónico de Greenhouse.
- Escribir `hs_tax_rate_group_id` en cada line item aplicable, sin hardcodear el ID como literal fijo en código.
- Mantener `gh_tax_rate` solo como metadata de auditoría/complemento, no como sustituto del binding nativo.

### Slice 3 — Reopen / update / republish convergence

- Definir e implementar el flujo soportado para quotes ya publicadas:
  - reopen a estado editable
  - resincronización de header y line items
  - republish final
- Garantizar que create y update convergen sobre el mismo estado final publish-ready, sin duplicar line items ni perder associations.

### Slice 4 — Contract hardening de propiedades nativas

- Corregir cualquier mapping todavía degradado hacia nombres no canónicos y documentar explícitamente los campos nativos que gobiernan:
  - billing frequency: `recurringbillingfrequency`
  - billing start date: `hs_recurring_billing_start_date`
  - tax rate: `hs_tax_rate_group_id`
  - publish status: `hs_status`
- Asegurar que el bridge y Greenhouse comparten el mismo vocabulario de propiedades para evitar drift silencioso.

### Slice 5 — Smoke real + docs operativas

- Ejecutar smoke real sobre una quote nueva o reprocesada hasta dejarla publicada y con tasa impositiva nativa visible en HubSpot.
- Actualizar arquitectura y handoff con la política final de publish/republish.
- Dejar runbook claro para validar tax library, publish status y links públicos sin depender de inspección manual informal.

## Out of Scope

- Migrar este carril a `CPQ_QUOTE`; el target V1 de esta task es cerrar el publish nativo del carril actual.
- Rediseñar Quote Builder o agregar surface UI nueva fuera de errores/observabilidad mínimos.
- Reabrir el modelado tributario general de quotations ya definido por `TASK-530`.
- Absorber el sibling repo al monorepo; eso sigue en `TASK-574`.

## Detailed Spec

Esta task debe formalizar cuatro contratos nativos y no mezclar niveles:

1. **Native publish**
   - la quote se crea/edita en modo mutable
   - al final del carril, Greenhouse ejecuta el publish nativo vía `hs_status`
   - el estado final esperado ya no es `DRAFT`

2. **Native tax**
   - `tax` y `gh_tax_rate` pueden seguir existiendo
   - pero la tasa visible y publishable debe cerrar también `hs_tax_rate_group_id`
   - la resolución del tax group debe salir de un mapping gobernado o lookup nativo, no de un magic number en código

3. **Native billing semantics**
   - el contrato debe usar nombres reales de HubSpot, no aliases inventados
   - `recurringbillingfrequency` y `hs_recurring_billing_start_date` son la referencia operativa real para este carril

4. **Convergence lifecycle**
   - una quote publicada no puede quedar como callejón sin salida
   - el sistema debe poder reabrir, resincronizar y republicar sin intervención manual

La definición de done de esta task no es “la API responde 200”, sino:

- quote publicada
- links públicos generados
- line items con tasa nativa cerrada
- smoke real exitoso

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Una quote outbound creada desde Greenhouse deja de terminar en `DRAFT` y queda publicada en HubSpot usando el contrato nativo soportado por el carril actual.
- [ ] Los line items publicados quedan con `hs_tax_rate_group_id` resuelto desde la tax library/config nativa de HubSpot, además del monto/tasa de auditoría ya enviados por Greenhouse.
- [ ] Create, update y republish convergen sin edición manual posterior en HubSpot y sin pérdida de asociaciones ni duplicación de line items.
- [ ] La documentación del repo deja explícita la diferencia entre metadata custom (`gh_tax_rate`) y finalización nativa (`hs_tax_rate_group_id`, `hs_status`).

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm test`
- `python3 -m unittest tests.test_hubspot_greenhouse_integration_app` en el sibling repo
- smoke real validando quote no-`DRAFT`, `hs_quote_link` materializado y tax rate nativo visible en HubSpot

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedó sincronizado con el cierre
- [ ] `Handoff.md` quedó actualizado con la política final de publish/republish
- [ ] `changelog.md` quedó actualizado si cambió el comportamiento runtime del quote outbound
- [ ] se ejecutó chequeo de impacto cruzado sobre `TASK-574`, `TASK-575` y `TASK-576`
- [ ] se documentó el método canónico para resolver tax groups HubSpot por ambiente sin hardcodear IDs

## Follow-ups

- Si HubSpot obliga diferencias materiales entre `CUSTOMIZABLE_QUOTE_TEMPLATE` y `CPQ_QUOTE`, abrir una task separada para migración de template type en vez de mezclarla aquí.
- Si la tax library no puede resolverse de forma portable por API/config existente, abrir follow-up de governance/admin config para tax group mapping multi-ambiente.

## Open Questions

- ¿La política V1 queda estandarizada en `APPROVAL_NOT_NEEDED` para publish automático, o existe algún tenant/workflow que requiera `PENDING_APPROVAL` y deba modelarse explícitamente?
- ¿El mapping `Greenhouse tax code -> HubSpot tax rate group` vive como lookup API-time o requiere tabla de configuración gobernada dentro de Greenhouse?
