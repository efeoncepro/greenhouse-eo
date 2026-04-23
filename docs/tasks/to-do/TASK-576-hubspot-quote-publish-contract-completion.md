# TASK-576 — HubSpot Quote Publish Contract Completion

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
- Branch: `task/TASK-576-hubspot-quote-publish-contract-completion`
- Legacy ID: `—`
- GitHub Issue: `—`

## Summary

Cerrar el gap restante del carril `quotation -> HubSpot quote`: hoy Greenhouse ya crea y asocia la cotización al `deal/company/contact`, pero la quote nace incompleta para publish en HubSpot. Faltan remitente y empresa emisora, y los line items están naciendo como líneas ad hoc sin binding robusto al catálogo sincronizado (`hubspot_product_id` / SKU / campos comerciales), por lo que HubSpot deja la quote en borrador y obliga edición manual.

## Why This Task Exists

El problema actual ya no es “crear la quote”; ese hueco quedó cerrado al reanclar el outbound en `organization_id` y corregir las asociaciones `default`. El problema real que queda es **completar el contrato de publicación**:

- la quote se crea, pero HubSpot la deja en borrador porque no recibe `sender` ni `sender company` válidos
- los line items no están reutilizando el catálogo comercial sincronizado con HubSpot; se crean como line items mínimos con nombre, cantidad y precio
- por eso se pierden campos críticos visibles en HubSpot Quote Editor:
  - `Ref.` / SKU
  - frecuencia de facturación
  - fecha de inicio de facturación
  - tasa impositiva (IVA 19%)
  - cualquier otro metadato derivado del producto/order item canonico

Si este contrato se resuelve con parches campo-a-campo, el flujo seguirá rompiéndose cada vez que el catálogo o el modelo tributario cambien. La solución correcta debe ser **catálogo-first y publish-ready**: una quote solo debe publicarse cuando Greenhouse pueda reconstruir en HubSpot exactamente la información comercial ya modelada en su quotation y en el product catalog sincronizado.

## Goal

- Las cotizaciones creadas desde Greenhouse nacen en HubSpot con `sender` y `sender company` resueltos canónicamente desde Greenhouse.
- Los line items de la quote se derivan del catálogo sincronizado (`greenhouse_commercial.product_catalog` + `hubspot_product_id` / SKU) o fallan de forma explícita cuando no exista binding válido.
- Los campos de publish de HubSpot Quote Editor (`Ref`, billing frequency, billing start, impuesto, etc.) quedan materializados desde los contratos canónicos de quotation/product catalog, sin edición manual posterior.

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

- La ancla canónica del outbound de quotes es `organization_id`, no `space_id`.
- `person_360` es la resolución canónica para contactos y personas; si hay conflicto, debe primar el facet CRM.
- Los line items de HubSpot quote no se deben construir como líneas “mínimas” si Greenhouse ya tiene binding de producto; se debe reutilizar el catálogo sincronizado antes de crear estructuras ad hoc.
- El IVA y demás metadatos de pricing deben salir del contrato tributario/documental de la quotation (`tax_code`, snapshots, billing semantics), no de heurísticas UI.
- Mientras `TASK-574` no cierre, los cambios del servicio `hubspot-greenhouse-integration` siguen viviendo en el repo hermano `cesargrowth11/hubspot-bigquery`.

## Normative Docs

- `docs/tasks/complete/TASK-463-unified-quote-builder-hubspot-bidirectional.md`
- `docs/tasks/complete/TASK-530-quote-tax-explicitness-chile-iva.md`
- `docs/tasks/complete/TASK-563-product-catalog-hubspot-outbound.md`
- `docs/tasks/to-do/TASK-574-absorb-hubspot-greenhouse-integration-service.md`
- `docs/tasks/to-do/TASK-575-hubspot-developer-platform-2026-upgrade.md`

## Dependencies & Impact

### Depends on

- `src/lib/hubspot/create-hubspot-quote.ts`
- `src/lib/hubspot/push-canonical-quote.ts`
- `src/lib/hubspot/update-hubspot-quote.ts`
- `src/lib/integrations/hubspot-greenhouse-service.ts`
- `src/lib/commercial/hubspot-contact-resolution.ts`
- `src/lib/sync/projections/quotation-hubspot-outbound.ts`
- `src/lib/services/service-store.ts`
- `src/lib/services/service-sync.ts`
- `src/lib/sync/projections/product-hubspot-outbound.ts`
- `services/hubspot_greenhouse_integration/app.py` in sibling repo `/Users/jreye/Documents/hubspot-bigquery-task-563`
- `services/hubspot_greenhouse_integration/hubspot_client.py` in sibling repo `/Users/jreye/Documents/hubspot-bigquery-task-563`
- `tests/test_hubspot_greenhouse_integration_app.py` in sibling repo `/Users/jreye/Documents/hubspot-bigquery-task-563`

### Blocks / Impacts

- Impacta el flujo de `quotation_hubspot_outbound`
- Impacta el contrato `POST /quotes` y probablemente `PATCH /quotes/{id}`
- Impacta la calidad del catálogo comercial sincronizado con HubSpot y su reuso downstream
- Desbloquea una publicación de cotizaciones HubSpot sin edición manual en el Quote Editor
- Define un contrato que `TASK-574` y `TASK-575` deben preservar explícitamente: cualquier absorción del servicio o upgrade de plataforma que toque `/quotes` debe considerar este carril como regression baseline, no como follow-up implícito.

### Files owned

- `src/lib/hubspot/create-hubspot-quote.ts`
- `src/lib/hubspot/push-canonical-quote.ts`
- `src/lib/hubspot/update-hubspot-quote.ts`
- `src/lib/integrations/hubspot-greenhouse-service.ts`
- `src/lib/commercial/hubspot-contact-resolution.ts`
- `src/lib/finance/pricing/**`
- `src/lib/services/**`
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/documentation/finance/crear-deal-desde-quote-builder.md`
- sibling repo: `services/hubspot_greenhouse_integration/app.py`
- sibling repo: `services/hubspot_greenhouse_integration/hubspot_client.py`
- sibling repo: `tests/test_hubspot_greenhouse_integration_app.py`

## Current Repo State

### Already exists

- `quotation_hubspot_outbound` ya crea quotes HubSpot desde `organization -> hubspot_company_id` y las asocia a `deal/company/contact`.
- `src/lib/commercial/hubspot-contact-resolution.ts` ya resuelve contactos HubSpot con precedencia canónica.
- `greenhouse_commercial.quotations` ya persiste `hubspot_deal_id`, `hubspot_quote_id`, `contact_identity_profile_id`, `tax_code`, `tax_rate_snapshot`, `tax_amount_snapshot`, `tax_snapshot_json`, `tax_snapshot_frozen_at`.
- `greenhouse_commercial.product_catalog` ya existe como catálogo comercial sincronizado con HubSpot y expone `hubspot_product_id`.
- El servicio hermano ya tiene `POST /quotes`, `GET /companies/{companyId}/quotes` y `GET /quotes/{quoteId}/line-items`.
- El servicio hermano ya corrige asociaciones `default` para quotes, deals, companies, contacts y line items.

### Gap

- `createHubSpotQuote()` solo envía `title`, `expirationDate`, idioma/locale, asociaciones y line items mínimos; no resuelve ni manda `sender` real ni `sender company`.
- `POST /quotes` en el servicio hermano crea line items ad hoc con `name`, `quantity`, `price`, `description`; no reutiliza producto existente ni campos comerciales extendidos.
- No hay binding explícito `quotation line item -> product_catalog -> hubspot_product_id -> HubSpot quote line item payload`.
- El create path actual no materializa `Ref/SKU`, `billing frequency`, `billing start date`, `tax rate`, ni otras propiedades necesarias para que la quote quede publish-ready en HubSpot.
- El update path de quote sigue siendo MVP/stub (`update_not_supported`) y no garantiza convergencia si la cotización canónica cambia después del create.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Discovery del contrato quote publish end-to-end

- Auditar el shape real de `greenhouse_commercial.quotations` + `quotation_line_items` para confirmar qué campos comerciales, tributarios y de recurrencia ya están disponibles.
- Auditar el `POST /quotes` del servicio hermano y contrastarlo con los requerimientos reales del HubSpot Quote Editor.
- Confirmar cómo se mapea hoy `product_catalog -> hubspot_product_id` y si existe ya un camino robusto para reutilizar productos/campos del catálogo en el quote create path.
- Confirmar la fuente canónica de:
  - remitente de la quote
  - empresa emisora (`Efeonce`)
  - frecuencia de facturación
  - fecha de inicio de facturación
  - IVA / tax rate
- Documentar qué parte del problema vive en `greenhouse-eo` y qué parte vive todavía en el sibling repo mientras `TASK-574` no cierre.

### Slice 2 — Sender + issuing company contract

- Resolver el `sender` de la quote desde el actor que crea/emite la cotización en Greenhouse, con mapping canónico hacia el shape que HubSpot espera (`firstName`, `lastName`, `email`, [campos adicionales si aplica]).
- Resolver la empresa emisora desde Greenhouse como source of truth explícita, no hardcodeada en payloads dispersos.
- Endurecer el create path para que una quote que no tenga `sender` / `sender company` válidos falle con error explícito o quede marcada como `publish_incomplete`, pero no se considere cerrada silenciosamente.

### Slice 3 — Catalog-bound quote line items

- Diseñar e implementar el binding canónico `quotation_line_item -> product_catalog -> hubspot_product_id` o equivalente HubSpot-native para que el create path deje de fabricar line items mínimos.
- Si una línea no puede ligarse al catálogo sincronizado, definir un comportamiento explícito y auditable:
  - bloquear create
  - o degradar con flag/error canónico documentado
  - pero no silent fallback ad hoc
- Materializar en el payload/create path de HubSpot los campos comerciales que hoy faltan en el Quote Editor:
  - `Ref.` / SKU
  - billing frequency
  - billing start date
  - tax rate / IVA 19%
  - cualquier otro campo necesario para publish-ready

### Slice 4 — Quote update convergence

- Implementar o cerrar el update path para quotes ya creadas (`PATCH /quotes/{id}` o equivalente) de modo que Greenhouse pueda reconciliar una quote ya existente sin obligar a editarla manualmente en HubSpot.
- Asegurar idempotencia y no duplicación de line items / productos asociados.
- Dejar cobertura para create + update con el mismo contrato publish-ready.

### Slice 5 — Observabilidad, docs y smoke real

- Exponer errores canónicos legibles para `sender_missing`, `issuing_company_missing`, `catalog_binding_missing`, `quote_publish_incomplete` o equivalentes.
- Actualizar arquitectura y documentación funcional para dejar explícito que el outbound de quotes es `organization-first` y `catalog-first`.
- Ejecutar smoke real creando o reprocesando una cotización hasta dejarla publish-ready en HubSpot sin edición manual.

## Out of Scope

- Absorber el servicio `hubspot-greenhouse-integration` al monorepo completo; eso sigue en `TASK-574`.
- Upgrade de la HubSpot Developer Platform a `2026.03`; eso sigue en `TASK-575`.
- Rediseñar la UI de Quote Builder; esta task cierra contrato backend/integración y solo toca UI si hace falta surfacing mínimo de errores/blockers.
- Cambiar el modelo tributario de quotations fuera de lo ya definido por `TASK-530`.

## Detailed Spec

La tarea debe cerrar estos cuatro contratos, en este orden:

1. **Quote publish identity contract**
   - quién emite
   - desde qué empresa
   - con qué datos mínimos publishables en HubSpot

2. **Quote line item binding contract**
   - una quote en HubSpot no debe nacer con líneas “huérfanas” si Greenhouse ya tiene un catálogo sincronizado
   - el binding debe preferir `product_catalog` / `hubspot_product_id`
   - el SKU/ref visible en HubSpot debe derivarse del mismo contrato, no de un campo manual desconectado

3. **Commercial semantics contract**
   - billing frequency, start date y tax rate deben derivarse del modelo canónico de quotation/line item
   - no se aceptan defaults silenciosos como `Pago único` si la línea o el servicio real no es one-time

4. **Convergence contract**
   - create y update deben producir el mismo estado final esperado en HubSpot
   - una quote publicada desde Greenhouse no debe requerir abrir el editor HubSpot para completarla manualmente

El agente que tome la task debe confirmar si la mejor implementación técnica en HubSpot es:

- reutilizar productos ya sincronizados y crear quote line items basados en esos productos
- o seguir creando line items propios, pero enriquecidos con todos los campos canónicos requeridos

Si HubSpot impone una combinación híbrida, el plan debe explicitarla con evidencia de contrato/API, no por suposición.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Una cotización creada desde Greenhouse llega a HubSpot con remitente y empresa emisora completos, sin quedar trabada en borrador por ausencia de esos datos.
- [ ] Los line items de la quote ya no nacen como líneas mínimas huérfanas cuando existe binding canónico al catálogo sincronizado; `Ref/SKU` y demás campos comerciales visibles quedan materializados correctamente.
- [ ] Billing frequency, billing start date e IVA 19% (o tax contract equivalente) quedan resueltos desde el contrato canónico de quotation/catalog y se reflejan en HubSpot Quote Editor.
- [ ] El flujo create/update converge al mismo estado publish-ready en HubSpot sin edición manual posterior.
- [ ] Existe smoke real documentado sobre una quote creada o reprocesada que confirme publish readiness en HubSpot.

## Verification

- `pnpm lint`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm test`
- `python3 -m unittest tests.test_hubspot_greenhouse_integration_app`
- Validación manual live en HubSpot Quote Editor sobre una cotización creada/reprocesada desde Greenhouse

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedó sincronizado con el cierre
- [ ] `Handoff.md` quedó actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedó actualizado si cambió comportamiento, estructura o protocolo visible
- [ ] se ejecutó chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] quedó documentado explícitamente si el cambio se implementó en el sibling repo o ya en el monorepo, según el estado real de `TASK-574`

## Follow-ups

- Si durante la implementación se confirma que HubSpot requiere quote templates o configuración adicional de publish, abrir task derivada específica para templates/settings en vez de mezclarla silenciosamente aquí.
- Si el mejor fix técnico depende de absorber antes el servicio al monorepo, re-evaluar secuencia con `TASK-574`.

## Open Questions

- ¿El publish-ready final debe apoyarse en productos HubSpot ya sincronizados, en line items enriquecidos, o en una combinación híbrida exigida por la API/CPQ de HubSpot?
- ¿La empresa emisora debe salir de una config global Efeonce o de un contrato tenant-aware explícito dentro de Greenhouse?
