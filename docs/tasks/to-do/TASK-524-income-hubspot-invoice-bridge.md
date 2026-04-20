# TASK-524 — Income → HubSpot Invoice Bridge

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `[optional EPIC-###]`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-524-income-hubspot-invoice-bridge`
- Legacy ID: `[optional]`
- GitHub Issue: `[optional]`

## Summary

Cerrar el hueco entre quote-to-cash y HubSpot para que toda factura/`income` materializada desde Greenhouse herede los anchors CRM de la cotización y publique un bridge outbound trazable hacia HubSpot. Hoy la quote puede quedar bien anclada a `organization + company + deal + contact`, pero al convertirse en `income` esa continuidad comercial se corta.

## Why This Task Exists

El repo ya puede persistir `hubspot_company_id` y `hubspot_deal_id` en `greenhouse_finance.income` cuando el ingreso se crea/edita por API, y ya existe un bridge outbound robusto para quotations. El gap real es que la materialización desde quote-to-cash todavía inserta `income` sin esos anchors y no existe un carril canónico `finance.income.* -> HubSpot` con trazabilidad e idempotencia. Eso deja la factura fuera del hilo comercial y rompe la sincronización bidireccional que el usuario espera ver en deal, company y contacto.

## Goal

- Heredar automáticamente los anchors comerciales (`organization`, `hubspot_company_id`, `hubspot_deal_id`) desde la cotización/contrato hacia `greenhouse_finance.income`.
- Crear un bridge outbound idempotente desde `finance.income.created` / `finance.income.updated` hacia HubSpot.
- Dejar trazabilidad explícita del sync de factura/ingreso en Greenhouse para soporte, replay y auditoría.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`

Reglas obligatorias:

- `greenhouse_finance.income` sigue siendo la source of truth financiera; HubSpot recibe una proyección, no el canon.
- Los anchors HubSpot no se reconstruyen por heurística (`client_name`, `invoice_number`, free text); deben heredarse desde la cadena comercial ya anclada.
- El sync outbound debe vivir sobre outbox/proyecciones reactivas e idempotencia, no como llamada inline ad hoc desde UI o route handlers.
- Si hay migración de schema, debe versionarse junto con `src/types/db.d.ts`.

## Normative Docs

- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`
- `Handoff.md`
- `project_context.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/to-do/TASK-463-unified-quote-builder-hubspot-bidirectional.md`
- `docs/tasks/complete/TASK-486-commercial-quotation-canonical-anchor.md`
- `docs/tasks/complete/TASK-504-commercial-quotation-issued-lifecycle-approval-by-exception.md`
- `src/lib/finance/quote-to-cash/materialize-invoice-from-quotation.ts`
- `src/lib/finance/postgres-store-slice2.ts`
- `src/app/api/finance/income/route.ts`
- `src/app/api/finance/income/[id]/route.ts`

### Blocks / Impacts

- continuidad quote → invoice dentro del bridge HubSpot de Comercial
- trazabilidad operativa de `finance.income.*`
- futuras tasks de invoice/document sync y seguimiento comercial post-emisión

### Files owned

- `src/lib/finance/quote-to-cash/materialize-invoice-from-quotation.ts`
- `src/lib/finance/quote-to-cash/materialize-invoice-from-hes.ts`
- `src/lib/finance/postgres-store-slice2.ts`
- `src/app/api/finance/income/route.ts`
- `src/app/api/finance/income/[id]/route.ts`
- `src/lib/sync/projections/*`
- `src/lib/hubspot/*`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`

## Current Repo State

### Already exists

- `POST /api/finance/income` y `PUT /api/finance/income/[id]` ya aceptan y persisten `hubspotCompanyId` / `hubspotDealId`.
- `createFinanceIncomeInPostgres` y `updateFinanceIncomeInPostgres` ya publican `finance.income.created` / `finance.income.updated`.
- `materializeInvoiceFromApprovedQuotation` ya crea `greenhouse_finance.income` desde una quote emitida y publica `commercial.quotation.invoice_emitted`.
- El bridge outbound de quotations a HubSpot ya existe y usa `hubspot_deal_id` como anchor operativo.

### Gap

- `materializeInvoiceFromApprovedQuotation` todavía inserta `income` sin `hubspot_company_id` ni `hubspot_deal_id`.
- La rama enterprise/HES debe confirmarse y converger al mismo contrato de herencia de anchors.
- No existe todavía un helper/proyección canónica tipo `income -> HubSpot`.
- No hay trazabilidad explícita del último sync outbound de factura/ingreso hacia HubSpot.
- El destino exacto en HubSpot (invoice object nativo vs attachment/note en deal/company/contact vs híbrido) sigue siendo una decisión de diseño abierta.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Anchor inheritance + sync trace foundation

- Extender la materialización quote-to-cash simple y enterprise para que `greenhouse_finance.income` herede `organization_id`, `hubspot_company_id` y `hubspot_deal_id` desde la cotización/contrato anclado.
- Agregar trazabilidad runtime del sync outbound de `income` en schema financiero (campos directos en `greenhouse_finance.income` o sidecar en `greenhouse_finance`, decisión a cerrar en Discovery).
- Endurecer create/update manual de `income` para que no rompan la coherencia `organization/company/deal` cuando el ingreso venga de una quote ya anclada.

### Slice 2 — Canonical outbound bridge

- Crear helper canónico de outbound `income -> HubSpot` con contrato idempotente y reusable.
- Crear una proyección reactiva que escuche `finance.income.created` y `finance.income.updated` y delegue al helper.
- Persistir resultado de sync (`object id`, estado, timestamp, error) para soporte y replay.

### Slice 3 — Quote-to-cash convergence

- Hacer converger `materializeInvoiceFromApprovedQuotation` y la rama HES al mismo contrato de anchors/sync.
- Mantener alineado el hilo comercial quote → contract/service module → income sin reintroducir `space_id` como anchor comercial primario.
- Confirmar que la factura heredada siga asociada al mismo deal y company que la quote de origen.

### Slice 4 — Tests, docs y operación

- Agregar tests de herencia de anchors, idempotencia del outbound y trazabilidad de errores.
- Actualizar arquitectura/documentación del contrato invoice sync en Finance + Commercial.
- Dejar handoff y criterios operativos para replay/debug del sync de ingresos hacia HubSpot.

## Out of Scope

- Rehacer el bridge de quotations a HubSpot.
- Rediseñar Nubox o el carril DTE; esta task solo asegura convivencia correcta con HubSpot.
- Construir una UI grande nueva para invoice sync; solo entra una surface mínima de diagnóstico si se vuelve estrictamente necesaria.
- Sincronizar cobros/pagos/reconciliación a HubSpot.

## Detailed Spec

Contrato base mínimo que esta task debe entregar aunque el destino exacto en HubSpot siga abierto:

1. Todo `income` materializado desde una quote emitida debe persistir el mismo anchor comercial que ya usa la quote:
   - `organization_id`
   - `hubspot_company_id`
   - `hubspot_deal_id`
2. Todo outbound `income -> HubSpot` debe ser idempotente y re-ejecutable.
3. Todo outbound debe quedar trazable desde Greenhouse con estado del último intento, timestamp y error.
4. La asociación comercial mínima en HubSpot debe conservar el mismo `deal` y la misma `company`; la asociación al `contact` queda sujeta al contrato final del destino elegido.
5. La solución no debe introducir un bypass paralelo al outbox ni recalcular métricas inline fuera del contrato de Finance/Commercial.

Decisiones de diseño resueltas para este task:

1. **Destino canónico en HubSpot**
   - El espejo primario de `greenhouse_finance.income` será el objeto nativo `invoice` de HubSpot.
   - El invoice remoto debe crearse como **non-billable mirror** (`hs_invoice_billable = false`) para reflejar la factura/ingreso gestionado en Greenhouse + Nubox sin convertir HubSpot en el origin de cobranza.
   - La estrategia `note/attachment` no reemplaza al objeto invoice; queda reservada para artifacts documentales y timeline.

2. **Timing de sync**
   - En `finance.income.created` / `finance.income.updated`: crear o actualizar el invoice draft/non-billable en HubSpot para fijar identidad CRM y asociaciones.
   - En `finance.income.nubox_synced`: adjuntar PDF/XML/DTE emitido como file+note asociado al mismo invoice y también al deal/company/contact cuando existan.
   - Esto separa correctamente el mirror financiero del artifact tributario final.

3. **Asociaciones CRM**
   - `company` y `deal` son obligatorios cuando existan anchors en Greenhouse; la task debe heredar `hubspot_company_id` y `hubspot_deal_id` desde la quote/contract chain.
   - `contact` es **best-effort first-class**: si la quote origen tiene `contact_identity_profile_id` y puede resolverse a contacto HubSpot, se asocia; si no, el sync del invoice no se bloquea y debe quedar trazado como degradado.
   - No se promueve `space_id` como anchor comercial en ninguna fase.

4. **Line items**
   - Cuando existan rows en `greenhouse_finance.income_line_items`, el mirror HubSpot debe construir line items desde esa tabla.
   - Si el ingreso aún no tiene desglose persistido, el bridge crea un line item sintético único con el total del ingreso para no bloquear el invoice object.

5. **Trazabilidad**
   - La solución objetivo debe persistir, como mínimo, `hubspot_invoice_id`, `hubspot_last_synced_at`, `hubspot_sync_status` y `hubspot_sync_error` en runtime financiero o en un sidecar `greenhouse_finance` dedicado si Discovery demuestra que es mejor boundary.
   - Los artifacts documentales deben tener su propio rastro (`hubspot_artifact_note_id`, `hubspot_artifact_synced_at`, o equivalente) y no reciclar `hubspot_quote_id`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Los `income` materializados desde quote/HES persisten `hubspot_company_id` y `hubspot_deal_id` heredados de su contexto comercial upstream.
- [ ] Existe un carril canónico e idempotente `finance.income.created|updated -> HubSpot` con resultado trazable en Greenhouse.
- [ ] Greenhouse puede responder para cualquier `income` si sincronizó, cuándo fue el último intento y cuál fue el último error u objeto remoto asociado.
- [ ] La arquitectura/documentación explicita el contrato elegido de invoice sync en HubSpot sin contradecir el bridge de quotations ya vigente.

## Verification

- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test`
- validación manual en staging del flujo `quote issued -> income materialized -> outbound HubSpot trace`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] si hubo migración, se commiteó junto con `src/types/db.d.ts`

## Follow-ups

- task derivada para surfacing operativo/admin del estado de invoice sync si la trazabilidad textual no basta para soporte
- convergencia posterior con artifacts DTE/PDF si el contrato HubSpot final requiere attachment del documento emitido y no solo del ingreso materializado

## Delta 2026-04-20

- Se resuelven las open questions de diseño con el contrato recomendado para implementación:
  - objeto nativo `invoice` de HubSpot como espejo canónico del `income`
  - `hs_invoice_billable = false` para evitar acoplar la cobranza de HubSpot al flujo Greenhouse/Nubox
  - sync en dos fases: mirror financiero en `finance.income.created|updated`, artifacts tributarios en `finance.income.nubox_synced`
  - asociación a contacto `best-effort`, sin bloquear el mirror cuando solo existen company+deal
  - `income_line_items` como source primaria de detalle, con fallback a line item sintético
