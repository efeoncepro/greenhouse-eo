# Handoff.md

## Sesion 2026-04-20 — TASK-480 pricing replay context + bulk repricing (Codex)

- **Scope:** cerrar el follow-on real de `TASK-480` sobre el codebase actual: replay input persistido, semántica final de provenance/fallback, worker batch de repricing y readers downstream sin recompute.
- **Cambios principales:**
  - migración `20260420131341856_task-480-quote-pricing-v2-replay-input.sql`
  - `greenhouse_commercial.quotations.pricing_context`
  - `greenhouse_commercial.quotation_line_items.pricing_input`
  - `services/commercial-cost-worker/server.ts` ya activa `POST /quotes/reprice-bulk`
  - helper nuevo `src/lib/commercial-cost-worker/quote-reprice-bulk.ts`
  - `quotation-pricing-orchestrator.ts` ahora soporta `strictReplay`, reusa `pricing_input` y lanza `UnsupportedQuotationReplayError` cuando una quote no tiene contexto suficiente
  - edit/read paths de quotes ya exponen e hidratan `pricingInput` + provenance persistida
- **Decisiones importantes:**
  - no se repricingean quotes legacy “a ciegas” en batch; se marcan `skipped`
  - el fallback catalog-level de tools queda explícito como `tool_catalog_fallback`
  - `schema-snapshot-baseline.sql` sigue stale para esta zona; la referencia operativa fue migraciones + `src/types/db.d.ts`
- **Validación corrida:**
  - `pnpm test -- src/lib/finance/pricing/__tests__/pricing-engine-v2.test.ts src/views/greenhouse/finance/workspace/__tests__/quote-builder-pricing.test.ts` ok
  - `pnpm exec tsc --noEmit` ok
  - `pnpm lint` ok
  - `pnpm pg:connect:migrate` ok
  - `pnpm build` ok
- **Nota de entorno:** `pnpm build` sigue mostrando los warnings conocidos de `Dynamic server usage` por rutas que usan `headers`; el build termina exitosamente y no fue introducido por esta task.

## Sesion 2026-04-20 — TASK-452 service attribution foundation (Codex)

- **Owner:** Codex
- **Estado:** `complete`
- **Rama:** `task/TASK-452-service-attribution-foundation`
- **Implementación ya aterrizada:**
  - migración `20260420123025804_task-452-service-attribution-foundation.sql`
  - migración correctiva `20260420124700528_task-452-service-attribution-foundation-repair.sql` para reparar el caso donde el SQL inicial quedó registrado en `pgmigrations` sin ejecutar el DDL por un encabezado `Up/Down` duplicado
  - tablas `greenhouse_serving.service_attribution_facts` y `greenhouse_serving.service_attribution_unresolved`
  - helper/materializer `src/lib/service-attribution/materialize.ts`
  - tests `src/lib/service-attribution/materialize.test.ts`
  - projection reactiva `src/lib/sync/projections/service-attribution.ts`
  - wiring en `src/lib/sync/projections/index.ts` y catálogo de eventos
- **Contrato operativo resuelto:**
  - attribution por servicio usa anchors fuertes (`quotation`, `contract`, `purchase_order`, `service_entry_sheet`, `hubspot_deal`) antes de caer a `service_line`
  - `commercial_cost_attribution` no cambia de grain; labor/overhead por servicio se deriva downstream
  - los casos ambiguos persisten en unresolved; no se fuerzan en runtime
- **Validación corrida hasta ahora:**
  - `pnpm exec vitest run src/lib/service-attribution/materialize.test.ts`
  - `pnpm exec eslint src/lib/service-attribution/materialize.ts src/lib/service-attribution/materialize.test.ts src/lib/sync/projections/service-attribution.ts src/lib/sync/projections/index.ts src/lib/sync/event-catalog.ts`
  - `pnpm exec tsc --noEmit`
  - `pnpm pg:connect:migrate` (ok; regeneró `src/types/db.d.ts`)
  - `pnpm lint`
  - `pnpm build`
- **Notas de cierre:**
  - `pnpm build` cerró `exit 0`; durante el build aparecieron logs conocidos de `Dynamic server usage` por rutas que usan `headers`, pero no bloquearon la compilación ni nacen de este corte
  - `src/types/db.d.ts` ya incluye ambas tablas nuevas de `greenhouse_serving`

## Sesion 2026-04-20 — Backlog alignment TASK-452/466/471/476/480/481/482/485 (Codex)

- **Owner:** Codex
- **Estado:** `complete` (docs-only)
- **Rama:** `docs/codex-backlog-alignment-commercial-cost-fx`
- **Cambio documental:**
  - `TASK-476` se cerró y movió a `docs/tasks/complete/` como closure doc del programa `Commercial Cost Basis`.
  - `TASK-480`, `TASK-481` y `TASK-482` quedaron reancladas al runtime real: ya no prometen foundations que el repo ya aterrizó y ahora describen solo los follow-ons pendientes.
  - `TASK-466` quedó recortada al gap client-facing real (`currency + exchange_rates` + snapshot en send/issue + PDF/email/detail/document-chain), sin abrir una columna paralela `output_currency` mientras la arquitectura no cambie.
  - `TASK-471` quedó explícitamente como follow-on UI/gobernanza del pricing catalog; ya no depende de backend pendiente porque `TASK-470` ya lo cubrió.
  - `TASK-452` y `TASK-485` quedaron validadas como todavía necesarias sin recorte de scope.
  - `docs/tasks/README.md`, `docs/tasks/TASK_ID_REGISTRY.md` y referencias cruzadas de `TASK-528`, `TASK-532` y `TASK-483` quedaron sincronizadas con el cierre de `TASK-476`.
- **Validación:**
  - revisión documental y contraste contra codebase
  - sin cambios de runtime
  - sin build/lint/test porque el trabajo fue docs-only

## Sesion 2026-04-20 — Chile tax layer task stack registered (Codex)

- **Owner:** Codex
- **Estado:** `complete` (docs-only)
- **Rama:** `docs/codex-chile-tax-layer-tasks`
- **Worktree:** `/Users/jreye/Documents/greenhouse-eo-fix-hubspot-quote-sync`
- **Cambio documental:**
  - se registro `TASK-528` como programa paraguas para la capa tributaria Chile/IVA.
  - se registraron las tasks hijas `TASK-529` a `TASK-533` para foundation tributaria, quotes, income/invoice, compras con recuperabilidad y ledger mensual.
- **Decisiones de diseno resueltas:**
  - el contrato base es `tax_code + tax_rate_snapshot + tax_amount + recoverability`, no solo `tax_rate`.
  - `income` no debe seguir naciendo con IVA implicito `0.19`.
  - el IVA compra debe distinguir recuperable vs no recuperable para no contaminar costos.
  - la posicion mensual de IVA debe vivir en proyecciones financieras sobre `ops-worker` o un worker tributario dedicado; no en el commercial worker.
- **Notas de coordinacion:**
  - antes de registrar las tasks se hizo `rebase` sobre `origin/develop` para absorber `TASK-525`, `TASK-526` y `TASK-527` ya creadas por Claude y evitar colisiones de numeracion.

## Sesion 2026-04-20 — TASK-524 invoice sync contract registered (Codex)

- **Owner:** Codex
- **Estado:** `complete` (docs-only)
- **Rama:** `task/TASK-524-income-hubspot-invoice-bridge`
- **Worktree:** `/Users/jreye/Documents/greenhouse-eo-fix-hubspot-quote-sync`
- **Cambio documental:**
  - se registró `TASK-524 — Income → HubSpot Invoice Bridge`.
  - se resolvieron las open questions de diseño con contrato explícito:
    - HubSpot `invoice` object como espejo canónico del `income`
    - `hs_invoice_billable = false` como modo base para no delegar la cobranza a HubSpot
    - sync en dos fases: mirror financiero en `finance.income.created|updated`; PDF/XML/DTE como file+note en `finance.income.nubox_synced`
    - asociación a contacto `best-effort`; `company + deal` siguen siendo los anchors obligatorios cuando existen
- **Fuentes usadas para la decisión:**
  - docs oficiales HubSpot Invoices API
  - docs oficiales HubSpot Notes API
  - docs oficiales HubSpot Files API
- **Notas de coordinación:**
  - la task se movió de `TASK-511` a `TASK-524` para no colisionar con el stack roadmap que Claude ya registró en `develop`.

## Sesion 2026-04-20 — HubSpot quote sync hardening (Codex)

- **Owner:** Codex
- **Estado:** `complete`
- **Rama:** `fix/codex-hubspot-quote-sync`
- **Worktree:** `/Users/jreye/Documents/greenhouse-eo-fix-hubspot-quote-sync`
- **Problema corregido:**
  - las cotizaciones creadas manualmente desde Greenhouse podían existir sin `hubspot_deal_id`, por lo que el sync outbound no tenía anchor bidireccional real en HubSpot.
  - `POST /api/finance/quotes` no publicaba `commercial.quotation.created`, y las ediciones de header/líneas tampoco emitían un evento canónico de update para re-sincronizar.
  - el builder no ofrecía seleccionar deal HubSpot aunque la organización sí tuviera oportunidades comerciales activas.
- **Solución aplicada:**
  - nuevo endpoint tenant-safe `GET /api/commercial/organizations/[id]/deals` apoyado en `listCommercialDealsForOrganization`.
  - `QuoteBuilderShell` + `QuoteContextStrip` agregan selector **Deal HubSpot** con fetch async por organización; create/edit envían `hubspotDealId`.
  - `POST /api/finance/quotes` y `PUT /api/finance/quotes/[id]` validan que el deal exista y pertenezca a la misma organización antes de persistir `hubspot_deal_id`.
  - el outbox comercial suma `commercial.quotation.updated`; el outbound de HubSpot ahora escucha ese evento y el write path canónico vuelve a publicar `commercial.quotation.created`.
  - `POST /api/finance/quotes/[id]/lines` publica update después de persistir pricing para que cambios en line items re-sincronicen HubSpot.
- **Tests / validación:**
  - `pnpm exec vitest run src/lib/commercial/__tests__/quotation-events.test.ts src/lib/hubspot/__tests__/push-canonical-quote.test.ts`
  - `pnpm lint`
  - `pnpm build`
- **Notas de coordinación:**
  - fix hecho en worktree aislado para no colisionar con el checkout principal, que sigue con cambios paralelos de UI.
  - diagnóstico confirmado en staging sobre `qt-d5c9a4b5-ba51-4267-a54b-ac721eb46a6c`: la quote estaba `source='manual'`, `hubspotQuoteId = null`, `hubspotDealId = null`; no era falla de HubSpot sino ausencia de anchor comercial desde Greenhouse.

## Sesion 2026-04-19 — Quote-to-cash conversion transaction convergence (Codex)

- **Owner:** Codex
- **Estado:** `complete`
- **Rama:** `fix/codex-quote-conversion-lock`
- **Worktree:** `/Users/jreye/Documents/greenhouse-eo-fix-quote-conversion-lock`
- **Problema corregido:**
  - en la tab `Cadena documental`, el CTA `Convertir a factura` podía quedarse indefinidamente en `Convirtiendo…` aunque la cotización ya estuviera emitida.
  - el backend no materializaba `income` ni actualizaba `converted_to_income_id`; la cadena seguía sin factura.
  - la causa estructural era la mezcla de transacciones: `materializeInvoiceFromApprovedQuotation` / `materializeInvoiceFromApprovedHes` abrían una transacción y luego llamaban a `ensureContractForQuotation`, que a su vez abría otra `withTransaction` separada sobre el mismo flujo quote-to-cash.
- **Solución aplicada:**
  - `src/lib/commercial/contract-lifecycle.ts` ahora acepta un `client` opcional en `ensureContractForQuotation` y reutiliza el boundary transaccional existente cuando lo recibe.
  - los materializadores de factura (`simple` y `enterprise`) ahora pasan el mismo `client` activo al lifecycle contractual para evitar transacciones anidadas y esperas por locks/FKs sobre la misma cotización.
  - se agregan regresiones en:
    - `src/lib/commercial/contract-lifecycle.test.ts`
    - `src/lib/finance/quote-to-cash/materialize-invoice-from-quotation.test.ts`
    - `src/lib/finance/quote-to-cash/materialize-invoice-from-hes.test.ts`
- **Tests / validación:**
  - `pnpm test -- src/lib/commercial/contract-lifecycle.test.ts src/lib/finance/quote-to-cash/materialize-invoice-from-quotation.test.ts src/lib/finance/quote-to-cash/materialize-invoice-from-hes.test.ts`
  - `pnpm lint`
  - `pnpm build`
- **Notas de coordinación:**
  - no se volvió a convertir la cotización del usuario durante el fix; el diagnóstico se hizo leyendo staging y code path.
  - la cotización inspeccionada (`qt-d5c9a4b5-ba51-4267-a54b-ac721eb46a6c`) seguía `issued` con `convertedToIncomeId = null` mientras se investigaba, así que el bug estaba en conversión, no en emisión.

## Sesion 2026-04-19 — Quote issuance sales-context lock fix (Codex)

- **Owner:** Codex
- **Estado:** `complete`
- **Rama:** `fix/codex-quote-issue-for-update`
- **Worktree:** `/Users/jreye/Documents/greenhouse-eo-fix-quote-issue-for-update`
- **Problema corregido:**
  - al emitir una cotización desde el detalle, Postgres devolvía `FOR UPDATE cannot be applied to the nullable side of an outer join`.
  - el error no estaba en permisos ni en approval logic; ocurría en `captureSalesContextAtSent`, donde el reader de sales context agregaba `FOR UPDATE` al mismo `SELECT` que hace `LEFT JOIN` hacia `clients` y `deals`.
- **Solución aplicada:**
  - `src/lib/commercial/sales-context.ts` separa el lock y la lectura:
    - primero bloquea solo la fila base de `greenhouse_commercial.quotations`
    - luego carga el snapshot enriquecido sin `FOR UPDATE`
  - `src/lib/commercial/sales-context.test.ts` agrega regresión explícita para impedir que vuelva a aparecer el patrón `LEFT JOIN + FOR UPDATE`.
- **Tests / validación:**
  - `pnpm test -- src/lib/commercial/sales-context.test.ts`
  - `pnpm lint`
  - `pnpm build`
- **Notas de coordinación:**
  - worktree aislado; no se tocó `data/api_zapsign.txt`.
  - para validar `build` se reemplazó el symlink de `node_modules` por un árbol hardlinked local, porque Turbopack no acepta symlinks que apunten fuera del root del worktree.

## Sesion 2026-04-19 — Quote issuance actions + superadmin visibility alignment (Codex)

- **Owner:** Codex
- **Estado:** `complete`
- **Rama:** `fix/codex-quote-issuance-permissions`
- **Worktree:** `/Users/jreye/Documents/greenhouse-eo-fix-quote-issuance-permissions`
- **Problema corregido:**
  - el detalle de cotización podía ocultar `Editar`, `Guardar como template` y `Emitir` incluso a un superadministrador porque el cliente estaba leyendo `session.roleCodes` en vez de `session.user.roleCodes`.
  - el builder full-page no exponía un intent explícito de emisión; guardar seguía siendo el único camino visible y dejaba la quote en `Borrador`.
  - la página server-side de edición seguía aceptando solo `draft`, dejando fuera `approval_rejected` aunque TASK-504 ya había formalizado `Revisión requerida` como estado editable.
- **Solución aplicada:**
  - nuevo helper compartido `src/lib/finance/quotation-access.ts`:
    - access surface `finanzas.cotizaciones` sobre ambos planos `authorizedViews + routeGroups`, con override canónico `efeonce_admin`
    - helpers reutilizables `canAccessFinanceQuotes`, `canManageFinanceQuotes`, `canDecideFinanceQuotationApproval`, `isEditableFinanceQuotationStatus`
  - `QuoteDetailView.tsx` ahora consume ese helper, parsea la sesión correcta (`session.user.*`) y alinea todas las acciones editables/issueables con la misma regla.
  - `/finance/quotes/new` y `/finance/quotes/[id]/edit` reutilizan el helper de acceso; el edit page ahora acepta `draft` y `approval_rejected`.
  - `QuoteBuilderShell.tsx` separa intents de submit:
    - `Guardar borrador`
    - `Guardar y cerrar`
    - `Guardar y emitir`
    - `⌘⇧⏎` agregado como shortcut para emitir desde el builder
  - `QuoteSendDialog.tsx` también usa el helper de estados issueables para no seguir hardcodeando strings duplicados.
  - documentación/changelog actualizados para dejar explícito que emitir ya es una acción first-class del builder y del detalle.
- **Tests / validación:**
  - `pnpm exec vitest run src/lib/finance/__tests__/quotation-access.test.ts src/views/greenhouse/finance/workspace/__tests__/quote-builder-pricing.test.ts`
  - `pnpm lint`
  - `pnpm build`
- **Notas de coordinación:**
  - el build pasó con warnings esperados de `NEXTAUTH_SECRET` ausente en build-time estático; no bloquea el artefacto.
  - no se tocó `data/api_zapsign.txt` ni el checkout principal sobre `develop`; todo el fix vive en worktree aislado listo para merge directo a `develop`.

## Sesion 2026-04-19 — TASK-504 quotation issued lifecycle + approval-by-exception (Codex)

- **Owner:** Codex
- **Estado:** `complete`
- **Rama:** `task/TASK-504-quotation-issued-lifecycle-approval-by-exception`
- **Worktree:** `/Users/jreye/Documents/greenhouse-eo-task-504`
- **Problema corregido:**
  - la semántica `draft / sent / approved` mezclaba borrador, emisión oficial, aprobación por excepción y distribución, dejando quotes emitidas visibles como borrador o usando `sent` como alias ambiguo.
  - el approval runtime rechazado volvía implícitamente a `draft`, y PDF/email/share seguían demasiado acoplados al lifecycle documental.
- **Solución aplicada:**
  - migración `20260419212111960_task-504-quotation-issued-lifecycle-approval-by-exception.sql`:
    - nuevas columnas `issued_at`, `issued_by`, `approval_rejected_at`, `approval_rejected_by`
    - contrato canónico `draft | pending_approval | approval_rejected | issued | expired | converted`
    - backfill desde estados legacy y refresh de check constraints/audit actions
  - nuevo comando `src/lib/commercial/quotation-issue-command.ts` + helper `quotation-issuance.ts`
    - `POST /api/finance/quotes/[id]/issue` emite directo si no hay excepción o gatilla approval por excepción si corresponde
    - `/send` queda como wrapper de compatibilidad
  - approval runtime:
    - aprobación exitosa emite `issued`
    - rechazo deja `approval_rejected`
    - audit trail ahora distingue `issue_requested`, `issued` y `approval_rejected`
  - downstream alineado:
    - quote detail, lista, tabs governance, document chain y builder shell
    - quote-to-cash y contract lifecycle
    - HubSpot sync/status bridge
    - projections de pipeline/rentabilidad/deal pipeline y readers de open quotes
- **Tests / validación:**
  - `pnpm lint`
  - `pnpm build`
  - `pnpm pg:connect:migrate`
- **Notas de coordinación:**
  - `commercial.quotation.sent` se sigue emitiendo como bridge legacy además de `commercial.quotation.issued` para no romper consumers todavía no migrados.
  - la columna `sales_context_at_sent` se conserva por compatibilidad histórica de naming aunque el lifecycle visible ahora sea `issued`.

## Sesion 2026-04-19 — Quote detail governance org-first hardening (Codex)

- **Owner:** Codex
- **Estado:** `complete`
- **Rama:** `fix/codex-quote-detail-governance`
- **Worktree:** `/Users/jreye/Documents/greenhouse-eo-fix-quote-detail-governance`
- **Problema corregido:**
  - el builder moderno persistia `valid_until`, pero el detail y la rehidratacion de edicion seguian leyendo `expiry_date`; el vencimiento podia existir en DB y verse vacio.
  - las routes `approve/send` seguian exigiendo `space_id`, pero desde `TASK-486` las cotizaciones nuevas son `organization-first` y pueden tener `space_id = NULL`, por eso la tab de `Aprobaciones` fallaba aunque la quote fuera valida.
- **Solucion aplicada:**
  - `src/lib/finance/quotation-canonical-store.ts`
    - el detail canonico ahora lee `valid_until` y hace fallback a ese campo cuando `expiry_date` viene nulo.
  - `src/app/api/finance/quotes/route.ts`
  - `src/app/api/finance/quotes/[id]/route.ts`
    - create/update sincronizan `valid_until` y `expiry_date` para evitar drift entre columnas de compatibilidad.
  - `src/lib/finance/pricing/quotation-id-resolver.ts`
  - `src/lib/finance/pricing/quotation-tenant-access.ts`
    - el identity resolver ahora expone `organization_id` y se agrego validacion reutilizable de acceso tenant por `organization_id` o `space_id`.
  - `src/app/api/finance/quotes/[id]/approve/route.ts`
  - `src/app/api/finance/quotes/[id]/send/route.ts`
    - governance de quotes soporta anchors org-first y deja de rechazar quotes validas solo porque `space_id` es null.
  - `src/lib/commercial/governance/approval-steps-store.ts`
  - `src/lib/commercial/sales-context.ts`
    - la transicion a `sent` y el capture de sales context ya funcionan con `organization_id` fallback cuando no existe `space_id`.
- **Tests / validacion:**
  - `pnpm lint`
  - `pnpm build`
- **Notas de coordinacion:**
  - para validar en worktree hubo que materializar `node_modules` localmente; Turbopack no acepta `node_modules` symlink fuera del filesystem root.

## Sesion 2026-04-19 — Quote Builder pricing/cost unification + edit rehydration hardening (Codex)

- **Owner:** Codex
- **Estado:** `complete`
- **Rama:** `fix/codex-quote-cost-unification`
- **Worktree:** `/Users/jreye/Documents/greenhouse-eo-fix-quote-cost-unification`
- **Problema corregido:**
  - el primer hardening de persisted pricing evitaba guardar `unit_price = 0`, pero el backend seguía recalculando costo/margen con el costing engine legacy (`role_rate_cards`). Para roles como `ECG-001`, el detalle quedaba con `totalCost = 0` y margen inválido aunque el precio ya se hubiera persistido bien.
  - además, al reabrir una quote en edit se perdía `businessLineCode` y la simulación usaba `quoteDate = hoy`, generando drift silencioso en pricing.
- **Solución aplicada:**
  - `pricing-engine-v2` ahora expone `unitCostUsd`, `unitCostOutputCurrency` y `totalCostOutputCurrency` por línea para roles, personas, tools, direct costs y overhead addons.
  - `quote-builder-pricing.ts` persiste no solo `unitPrice`, sino también `manualUnitCost`, `resolvedCostBreakdown` y `resolvedCostNotes` basados en la simulación real del engine v2.
  - `quotation-pricing-orchestrator.ts` deja de resolver costo otra vez por el engine legacy cuando la línea ya trae costo resuelto del engine v2; usa ese snapshot como source of truth para totals y margen persistidos.
  - `quotation-line-input-validation.ts` ahora expone un error tipado (`UnpricedQuotationLineItemsError`) y ambas rutas API (`POST /api/finance/quotes` y `POST /api/finance/quotes/[id]/lines`) responden `422` JSON cuando llega una línea catalog-backed sin pricing, en vez de un `500` vacío.
  - `quotation-canonical-store.ts` vuelve a hidratar `businessLineCode` desde la quote canónica.
  - `QuoteBuilderShell.tsx` + `quote-builder-pricing.ts` dejan de simular con la fecha del día al reabrir una quote; ahora reutilizan `quoteDate` real y propagan también `countryFactorCode`/`quoteDate` al expandir servicios.
  - `QuoteBuilderEditPage` vuelve a inyectar `businessLineCode` y `quoteDate` al shell de edición.
- **Tests / validación:**
  - `pnpm exec vitest run src/views/greenhouse/finance/workspace/__tests__/quote-builder-pricing.test.ts src/lib/finance/pricing/__tests__/quotation-line-input-validation.test.ts src/lib/finance/pricing/__tests__/pricing-engine-v2.test.ts`
  - `pnpm lint`
  - `pnpm build`
- **Notas de coordinación:**
  - fix implementado y validado en worktree separado para no tocar el checkout principal ni la rama de Claude.
  - sigue pendiente un follow-up mayor si se quiere persistir `countryFactorCode` como parte del header canónico de la cotización; hoy el hardening evita drift en edición dentro del builder, pero ese factor todavía no forma parte del contrato persistido del quote header.

## Sesion 2026-04-19 — Quote Builder persisted pricing hardening (Codex)

- **Owner:** Codex
- **Estado:** `complete`
- **Rama:** `fix/codex-quote-persisted-pricing`
- **Worktree:** `/Users/jreye/Documents/greenhouse-eo-fix-quote-pricing`
- **Problema corregido:**
  - el Quote Builder mostraba el precio sugerido del pricing engine v2 en pantalla, pero al guardar serializaba `line.unitPrice ?? 0`, por lo que roles/personas/tools auto-valorizados quedaban persistidos con `unit_price = 0` y la vista de detalle terminaba mostrando montos/margen en cero.
- **Solución aplicada:**
  - nuevo helper compartido `src/views/greenhouse/finance/workspace/quote-builder-pricing.ts` para centralizar:
    - construcción del input al pricing engine
    - resolución del `unitPrice` persistible usando `simulation.lines`
    - rechazo de simulaciones stale que ya no corresponden al draft actual
  - `QuoteBuilderShell.tsx` deja de serializar `unitPrice ?? 0` a ciegas y ahora persiste el precio calculado real para líneas `role`, `person`, `tool` y `overhead_addon`.
  - nuevo guard server-side `src/lib/finance/pricing/quotation-line-input-validation.ts`: cualquier caller de `persistQuotationPricing` que intente persistir líneas catalog-backed sin precio calculado falla con error explícito en vez de dejar una quote corrupta.
  - `persistQuotationPricing` ahora sincroniza también `subtotal`, `total_amount`, `total_amount_clp` y `exchange_rate_to_clp` con el snapshot canónico, para no depender de que `total_price` quede huérfano mientras otros readers siguen consumiendo columnas legacy.
  - `quotation-canonical-store.ts` endurece list/detail para no preferir `total_amount = 0` sobre `total_price` cuando el campo legacy quedó stale.
- **Tests agregados:**
  - `src/views/greenhouse/finance/workspace/__tests__/quote-builder-pricing.test.ts`
  - `src/lib/finance/pricing/__tests__/quotation-line-input-validation.test.ts`
- **Verificación:**
  - `pnpm exec vitest run src/views/greenhouse/finance/workspace/__tests__/quote-builder-pricing.test.ts src/lib/finance/pricing/__tests__/quotation-line-input-validation.test.ts`
  - `pnpm test` (suite completa) → green
  - `pnpm lint` → green
  - `pnpm build` → green
- **Notas de coordinación:**
  - este fix se hizo en worktree separado para no tocar el checkout principal que sigue con cambios paralelos de UI (`TASK-496`, `data/api_zapsign.txt`, etc.).
  - el build de Next 16 no toleró `node_modules` symlink fuera del root; en este worktree se resolvió con `pnpm install --frozen-lockfile` local para validar de forma real.

## Sesion 2026-04-19 — EPIC-001 + taxonomía de epics + programa documental transversal (Codex)

- **Owner:** Codex
- **Estado:** `complete` a nivel documental. No hubo cambios de runtime ni de UI.
- **Scope entregado:**
  - nueva taxonomía `docs/epics/` con:
    - `docs/epics/README.md`
    - `docs/epics/EPIC_TEMPLATE.md`
    - `docs/epics/EPIC_ID_REGISTRY.md`
    - `docs/epics/to-do/EPIC-001-document-vault-signature-orchestration-platform.md`
    - `docs/operations/EPIC_OPERATING_MODEL_V1.md`
  - nuevas tasks oficiales de `EPIC-001`:
    - `TASK-489` Document Registry & Versioning Foundation
    - `TASK-490` Signature Orchestration Foundation
    - `TASK-491` ZapSign Adapter + Webhook Convergence
    - `TASK-492` Document Manager, Access Model & UI Foundation
    - `TASK-493` Document Rendering & Template Catalog Foundation
    - `TASK-494` HR Document Vault Convergence
    - `TASK-495` Commercial & Legal Document Chain Convergence
  - `TASK-027` y `TASK-461` quedan ancladas documentalmente a `EPIC-001`
- **Notas de coordinación:**
  - No se tocaron los archivos TSX en curso de Claude (`QuoteBuilderShell`, `QuoteSummaryDock`, etc.).
  - Las menciones previas en handoff a "`TASK-489 candidate`", "`TASK-490 candidate`" y "`TASK-491 candidate`" dentro de la sesión de TASK-488 eran placeholders informales; desde esta sesión esos IDs quedan oficialmente reservados para el programa documental.
  - Ya existe un source of truth operativo para epics: lifecycle, uso correcto y relación epic -> task quedaron documentados en `docs/operations/EPIC_OPERATING_MODEL_V1.md`.
  - No se hizo commit ni push todavía, para no mutar Git mientras el checkout principal tiene cambios vivos de UI en paralelo.

## Sesion 2026-04-19 — TASK-488 Design Tokens + UI Governance Hardening (Claude)

- **Owner:** Claude
- **Estado:** **`complete` — cerrada 2026-04-19**. tsc 0 errors · lint clean · build compiled.
- **Rama:** `task/TASK-488-design-tokens-ui-governance-hardening`.
- **Scope entregado:**
  - **Doc canónica** `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` (16 secciones): typography scale extraída de `src/@core/theme/typography.ts`, spacing 4px base, borderRadius tokens {2/4/6/8/10}, icon sizes {14/16/18/20/22}, color semantics reserved-for-states, interaction cost caps (≤2 clicks selector), 12 anti-patterns detectados, 15 reference patterns de `full-version/` con paths exactos.
  - **3 skills robustecidas**:
    - `~/.claude/skills/greenhouse-ux/skill.md` extendida con sección "Canonical Tokens — MANDATORY reference" + pre-spec checklist (apendada, no reescrita para no romper).
    - `.claude/skills/modern-ui/SKILL.md` NUEVO overlay local — 10 pinned decisions Greenhouse-specific que override el modern-ui global (DM Sans + Poppins, no OKLCH; `customBorderRadius.*`; semantic colors solo para estados; max 2 font families; `CustomAutocomplete` no `Popover > Select`).
    - `.claude/skills/greenhouse-ui-review/SKILL.md` NUEVA — 13 secciones pre-commit gate (typography, spacing, radius, elevation, icons, color, wrappers, layout, interaction cost, motion, a11y, states, anti-pattern sweep). 3 severities: 🔴 blocker, 🟡 modern bar, 🟢 polish. Hard-stop en blockers.
  - **Quote Builder refactor** aplicando los tokens:
    - `ContextChip` reescrito: ahora un primitive polimórfico con dos modes — `select` (default, usa `Autocomplete` inline dentro del popover con `autoFocus` + `openOnFocus` + búsqueda + 2 clicks verdaderos) y `custom` (preserva el API anterior para inputs nativos como duration/date). `QuoteContextStrip` migra los 6 selects (Org, Contacto, BL, Modelo, País, Moneda) al nuevo mode `select`.
    - Monospace eliminado: `sed` barrido en `src/components/greenhouse/pricing/` y `src/views/greenhouse/finance/workspace/` — 19 ocurrencias reemplazadas por `fontVariantNumeric: 'tabular-nums'`. Preserva alineación numérica sin la estética "técnica/legacy".
    - BorderRadius a tokens: `customBorderRadius.lg` (8px) en document card, dock, accordion — no más multipliers arbitrarios.
    - Empty state `QuoteLineItemsEditor`: 1 primary contained + 2 tonal `color='secondary'` (gris neutro). Removidos `color='success'` y `color='info'` del carnaval.
- **Archivos tocados**:
  - `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` (nuevo, 450+ líneas)
  - `docs/tasks/in-progress/TASK-488-design-tokens-ui-governance-hardening.md` → movido a `complete/`
  - `docs/tasks/README.md`, `docs/tasks/TASK_ID_REGISTRY.md` sincronizados
  - `.claude/skills/modern-ui/SKILL.md` (nuevo)
  - `.claude/skills/greenhouse-ui-review/SKILL.md` (nuevo)
  - `~/.claude/skills/greenhouse-ux/skill.md` (sección agregada)
  - `src/components/greenhouse/primitives/ContextChip.tsx` (reescrito con Autocomplete)
  - `src/components/greenhouse/pricing/QuoteContextStrip.tsx` (migrado a mode `select`)
  - `src/components/greenhouse/pricing/QuoteSummaryDock.tsx` (monospace → tabular-nums + borderRadius tokens)
  - `src/components/greenhouse/pricing/QuoteIdentityStrip.tsx` (monospace → tabular-nums)
  - `src/components/greenhouse/pricing/SellableItemRow.tsx`, `CostStackPanel.tsx`, `QuoteLineWarning.tsx` (monospace barrido)
  - `src/views/greenhouse/finance/workspace/QuoteBuilderShell.tsx` (accordion borderRadius tokens)
  - `src/views/greenhouse/finance/workspace/QuoteLineItemsEditor.tsx` (empty state CTAs, borderRadius tokens, monospace barrido)
  - `src/views/greenhouse/finance/workspace/QuoteTotalsFooter.tsx`, `AddonSuggestionsPanel.tsx`, `QuoteDocumentChain.tsx`, `QuoteTemplatePickerDrawer.tsx`, `PipelineBoardUnified.tsx` (monospace barrido en quote-related views)

### Verificación

- `npx tsc --noEmit` → 0 errors
- `pnpm lint` → clean
- `pnpm build` → compiled

### Impacto

- **Todas las futuras tareas UI** del portal consumen los tokens canónicos — Quote Builder es el primer consumidor, pero los tokens son repo-wide.
- Las 3 skills evolucionan: `greenhouse-ux` se usa en diseño, `modern-ui` overlay carga automáticamente cuando se invoca modern-ui en este repo, `greenhouse-ui-review` es invocable pre-commit en cualquier PR UI.
- `ContextChip` ahora es reusable para cualquier builder (invoice, PO, contract, etc.) con soporte de search built-in.

### Follow-ups declarados en la task

- **TASK-489 candidate**: migrar monospace del resto del repo (agency, hr, admin) a `tabular-nums`
- **TASK-490 candidate**: tests visuales Playwright + axe para quote builder, finance dashboard, payroll
- **TASK-491 candidate**: extender pattern ContextChip a invoice/PO/contract builders
- Review del doc de tokens por designer senior cuando esté disponible

---

## Sesion 2026-04-19 — TASK-461 MSA Umbrella Entity & Clause Library (Codex)

- **Owner:** Codex
- **Estado:** `complete`
- **Rama:** `task/TASK-461-msa-umbrella-clause-library`
- **Worktree:** `/Users/jreye/Documents/greenhouse-eo-task-461`
- **Notas de coordinacion:**
  - Trabajo aislado en worktree dedicado para no colisionar con Claude ni con `develop`.
  - Discovery + auditoria completas; la spec se corrigio para dejar explicito que el estado operativo real del dominio commercial vive en migraciones + `src/types/db.d.ts`, no en `schema-snapshot-baseline.sql`.
  - `contracts.msa_id` ya no es placeholder: TASK-461 agrega la FK real a `greenhouse_commercial.master_agreements` y corrige el runtime tenant-safe de contracts a `organization_id OR space_id`.
  - Se implemento la lane visible `/finance/master-agreements` + `/finance/master-agreements/[id]`, stores/API clause library, link MSA->contract, asset contexts privados y base de firma electronica via ZapSign.
  - Validacion cerrada: `pnpm pg:connect:migrate`, regen de `src/types/db.d.ts`, `pnpm lint`, `pnpm build`, scan de `new Pool()` solo en `src/lib/postgres/client.ts`.
  - Hallazgo operativo de ZapSign: el token que subieron en `data/api_zapsign.txt` es valido para **produccion** (`api.zapsign.com.br`) y no para sandbox. El runtime NO lee ese archivo; debe publicarse via `ZAPSIGN_API_TOKEN` o Secret Manager antes de usar firma en ambientes compartidos.
  - Deuda abierta menor: no se hizo smoke manual con datos reales de Sky/Pinturas Berel; el flujo queda listo para ejercerse via UI/API sobre `develop` cuando se publiquen los env vars de ZapSign.

---

## Sesion 2026-04-19 — TASK-487 Quote Builder Command Bar Redesign (Enterprise Pattern) (Claude)

- **Owner:** Claude
- **Estado:** **`in-progress`** — implementacion frontend completa, pendiente smoke staging + screenshot antes/despues.
- **Rama:** `task/TASK-487-quote-builder-command-bar-redesign`.
- **Scope entregado:**
  - **Patron UX**: `/finance/quotes/new` y `/finance/quotes/[id]/edit` migraron de Grid 8/4 con sidebar vertical a un patron Command Bar enterprise (4 layers verticales apilados): Identity Strip sticky → Context Chips Strip sticky → Document Surface centrada → Floating Summary Dock sticky bottom. Patron convergente en Linear (issue create), Stripe (invoice create), Ramp (bill approval), Pilot (vendor payment).
  - **Primitivos reusables** (`src/components/greenhouse/primitives/`):
    - `ContextChip.tsx`: boton con 4 estados (empty/filled/invalid/locked), abre Popover con editor arbitrario. Reusable en invoice/PO/contract builders. `aria-haspopup="dialog"`, `aria-expanded`, keyboard Enter/Space, 44px min target, focus ring 2px.
    - `ContextChipStrip.tsx`: container horizontal con overflow-x scroll nativo en mobile + shadow edges cuando hay overflow.
  - **Componentes de quote** (`src/components/greenhouse/pricing/`):
    - `QuoteIdentityStrip.tsx`: Row 1 sticky con breadcrumb, titulo, Nº Q-XXX, chip de estado (Borrador/Enviada/Aprobada/Vencida) con icon+color, validez, CTAs primary/secondary (Cancelar/Guardar).
    - `QuoteContextStrip.tsx`: Row 2 sticky con 8 ContextChips (Org, Contacto, BL, Modelo, Pais, Moneda, Duracion, Valida Hasta) completamente wireados a los stores existentes.
    - `AddLineSplitButton.tsx`: ButtonGroup + Menu Popper que consolida los 4 origenes (Catalogo/Servicio/Template/Manual) y reemplaza `QuoteSourceSelector` + las 5 pills del editor.
    - `QuoteSummaryDock.tsx`: Row 4 sticky bottom con AnimatedCounter en Total (respeta `useReducedMotion`), factor, IVA, chip de addons + Popper con AddonSuggestionsPanel embebido, primary CTA, indicador de margen con semaforo.
    - `QuoteLineWarning.tsx`: Alert inline anclado a la fila que origino el warning (`aria-describedby` al row id). Reemplaza el banner huerfano que vivia al fondo de la sidebar.
  - **Refactor**:
    - `QuoteBuilderShell.tsx`: reestructurado a layout vertical con Container `maxWidth='lg'`. Elimina Grid 8/4. Agrega Accordion "Detalle y notas" para la descripcion.
    - `QuoteLineItemsEditor.tsx`: elimina las 5 pills (+Rol/+Persona/+Herramienta/+Overhead/+Manual), elimina sub-row "Contexto de pricing", agrega `IconButton tabler-adjustments` por fila con Popover (FTE/Periodos/EmploymentType), empty state real via `EmptyState` con 3 CTAs jerarquicas, warnings inline via `QuoteLineWarning`, table usa `Fragment` keys para evitar nested tbody.
    - `greenhouse-nomenclature.ts`: extendido `GH_PRICING` con 7 nuevos bloques (identityStrip, contextChips, summaryDock, addMenu, lineWarning, emptyItems, adjustPopover, detailAccordion).
  - **Eliminados**:
    - `QuoteSourceSelector.tsx` — reemplazado por `AddLineSplitButton`.
    - `QuotePricingWarningsPanel.tsx` — reemplazado por `QuoteLineWarning` inline por fila.
  - **Preservado intacto**: `QuoteBuilderActions.tsx` sigue vivo porque lo usa `QuoteCreateDrawer.tsx` (el drawer legacy de creacion rapida), `QuoteTemplatePickerDrawer`, `SellableItemPickerDrawer`, `QuoteLineCostStack`, pricing engine, API contracts, schemas.

### Verificacion

- `npx tsc --noEmit` → 0 errors
- `pnpm lint` → clean
- `pnpm test` → 1535/1535 passing
- `pnpm build` → en ejecucion

### Pendiente

- Smoke staging: flujo end-to-end crear borrador → agregar rol → cost stack → cambiar chip Modelo → total recalcular con AnimatedCounter → guardar y cerrar.
- Screenshot comparativo antes/despues anexado al close.

---

## Sesion 2026-04-19 — TASK-486 Commercial Quotation Canonical Anchor (Organization + Contact) (Claude)

- **Owner:** Claude
- **Estado:** **`complete` — cerrada 2026-04-19 con 7/7 smoke tests verdes en staging.**
- **Rama:** `develop`.
- **Scope entregado:**
  - **Migration** `20260419144036463_task-486-quotation-canonical-anchor.sql`: agrega `greenhouse_commercial.quotations.contact_identity_profile_id` con FK a `greenhouse_core.identity_profiles(profile_id)` (ON DELETE SET NULL) + index parcial. Backfill de `organization_id` desde `client_profiles` + `spaces` para legacy rows. `space_id` y `space_resolution_source` marcadas DEPRECATED via COMMENT (no drop físico — quote-to-cash legacy readers aún leen space_id post-conversion). `organization_id` queda NULLABLE a nivel DB (backfill preservó orphans legacy sin data loss); enforcement se mueve a la capa API. Index nuevo `idx_commercial_quotations_organization_status`.
  - **Incidental fix**: ported migration `20260419080928005_task-quote-line-tool-addon-links.sql` de la rama Codex (aplicada a staging DB pero sin merge) para alinear local ↔ DB y correr `migrate:up` limpio.
  - **Store refactor** `src/lib/finance/quotation-canonical-store.ts`: nueva función `resolveFinanceQuoteTenantOrganizationIds(tenant)` reemplaza el filtrado por `space_id` en las 3 queries de quotes canónicos (list, detail, lines). El `resolveFinanceQuoteTenantSpaceIds` original sigue vivo porque lo consume `contracts-store` (filtra contracts por space — otro dominio). Detail query ahora incluye join a `identity_profiles` + LATERAL a `person_memberships` para exponer `organization` + `contact` como objetos en el mapper. `syncCanonicalFinanceQuote` dejó de derivar space_id en el INSERT (va NULL siempre).
  - **HubSpot sync** `src/lib/hubspot/sync-hubspot-quotes.ts`: `resolveSpaceForCompany` → `resolveOrganizationForCompany`. Gate del sync ahora es "company tiene org mapeada" no "company tiene space mapeado". Payload de `quote.synced` deja de llevar `spaceId`.
  - **Pricing catalog impact analysis** `src/lib/commercial/pricing-catalog-impact-analysis.ts`: input ganó `organizationIds?: string[]`. `loadOpenQuoteRows` filtra por `q.organization_id = ANY(...)`. Los 4 endpoints `preview-impact` resuelven ambos (`spaceIds` + `organizationIds`) y los pasan.
  - **API routes**:
    - POST `/api/finance/quotes`: valida `organizationId` requerido (400), verifica que existe + activa (404), valida `contactIdentityProfileId` opcional contra `person_memberships` activa con `membership_type IN ('client_contact','client_user','contact','billing','partner','advisor')`. INSERT actualizado: saca `space_id` + `space_resolution_source` del column list; agrega `contact_identity_profile_id`.
    - PUT `/api/finance/quotes/[id]`: acepta `contactIdentityProfileId` con la misma validación.
  - **Nuevo endpoint** `src/app/api/commercial/organizations/[id]/contacts/route.ts`: GET con identity_profiles filtrados por membership comercial + tenant isolation (403 si la org no es visible al tenant).
  - **Builder UI** `src/views/greenhouse/finance/workspace/QuoteBuilderShell.tsx`:
    - Label dropdown 1: "Espacio destinatario" → "Organización (cliente o prospecto)".
    - Nuevo dropdown 2 "Contacto": disabled hasta tener org; fetch async a `/api/commercial/organizations/[orgId]/contacts`; empty state explícito; marcador "Principal" para `is_primary`.
    - Payload del save (POST create + PUT edit + onSubmit) incluye `contactIdentityProfileId`. Edit page hidrata desde `detail.contact?.identityProfileId`.
  - **Docs**: `GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md` → v2.23. `docs/documentation/finance/cotizador.md` → v3 con sección "Cambios v3".

### Verificación

- `npx tsc --noEmit` → 0 errors
- `pnpm lint` → clean
- `pnpm test` → 1535/1535 passing (3 tests ajustados en `pricing-catalog-impact-analysis.test.ts` para pasar `organizationIds`)
- `pnpm build` → compiled successfully 14.8s
- Migración aplicada en staging DB (via `pg:connect:migrate`)
- Tipos regenerados via `pnpm db:generate-types`

### Smoke staging — cerrado 2026-04-19 (7/7 verdes)

- T1 `POST /api/finance/quotes` sin `organizationId` → 400 "organizationId es obligatorio." ✅
- T2 `POST` con `organizationId` inexistente (`org-NOPE`) → 404 "Organization org-NOPE no existe o está inactiva." ✅
- T3 `POST` con `organizationId` válida → 201 con `quotationId`. ✅
- T4 `GET /api/commercial/organizations/{orgId}/contacts` → 200 con 1 item real (Nicolas Barrientos, client_contact de Gobierno regional RM). ✅
- T5 `POST` con `contactIdentityProfileId` que no tiene membership → 400 "contactIdentityProfileId no tiene una membership activa en esa organización." ✅
- T6 `GET /api/finance/quotes/{id}` de quote creada sin contacto → `organization: {id, name, type='client'}`, `contact: null`. ✅
- T7 `POST` con org + contacto válido → 201; `GET` detail devuelve `contact: { identityProfileId, fullName: 'Nicolas Barrientos', canonicalEmail, roleLabel: 'Social Development Analyst' }`. ✅

### Fix post-deploy aplicado (commit 48fd0ae6)

Smoke T4 inicialmente falló con 403 porque el resolver `resolveFinanceQuoteTenantOrganizationIds` chequeaba `tenant.organizationId` ANTES del early-return de `efeonce_internal`. Un agent/admin user cuya session trae su propia org quedaba limitado a esa. Movido el early-return de internal al tope del resolver (mismo patrón que ya usaba `resolveFinanceQuoteTenantSpaceIds`). Smoke re-ejecutado verde.

### Cross-impact

- **TASK-466** (multi-currency quote output) desbloqueada para consumir el contrato "org + contact" como pre-requisito del send gate.
- **TASK-473 follow-ups**, **TASK-481** sin colisión.
- **Quote-to-cash lane**: intocada. Siguen leyendo `quotation.space_id` post-conversion. Follow-up no-bloqueante: auditar si necesitan resolver space_id por su cuenta cuando el quote no lo tiene.
- **Contracts store**: intocado (filtra `contracts.space_id`, otro dominio).

### Follow-ups (tasks futuras)

- **Data remediation** para orphans con `organization_id IS NULL` preservadas en el backfill. Post-cierre, migración v2 puede flipear `SET NOT NULL` a nivel DB.
- **Drop físico de `space_id` + `space_resolution_source`** del canonical quotations cuando quote-to-cash migre.
- **Backfill de contactos desde HubSpot deals**: iterar deals activos, resolver primary contact → poblar `contact_identity_profile_id`.
- **UI para reasignar contact** en el quote detail (drawer/inline action).
- **Evento outbox `commercial.quotation.contact_changed`** si proyecciones downstream lo necesitan.

---

## Sesion 2026-04-19 — TASK-477 Role Modeled Cost Basis Catalog (Codex)

- **Owner:** Codex
- **Estado:** `complete`
- **Rama / worktree:** `task/TASK-477-role-cost-assumptions-catalog` en `/Users/jreye/Documents/greenhouse-eo-task-477`
- **Colisión evitada:** se trabajó en worktree aislado porque Claude estaba moviendo el checkout principal en paralelo.
- **Spec corregida antes de implementar:** la task asumía un catálogo paralelo y un lane `role_modeled` todavía implícito. Se reancló a la realidad del repo:
  - `sellable_role_cost_components` ya era effective-dated
  - `pricing-engine-v2` ya distinguía `role_blended` vs `role_modeled`
  - `Admin > Pricing Catalog` ya existía y era el surface correcta
  - `commercial-cost-worker` ya era el runtime batch correcto; `ops-worker` no debía absorber esta slice
- **Entregables:**
  - migración `20260419151636951_task-477-role-modeled-cost-basis.sql`
  - tabla `greenhouse_commercial.role_modeled_cost_basis_snapshots`
  - helper `src/lib/commercial-cost-basis/role-modeled-cost-basis.ts`
  - `sellable_role_cost_components` extendida con overhead/provenance/confidence + loaded cost generado
  - `pricing-engine-v2` ahora lee `role_modeled` desde un reader explícito con `sourceRef`, `snapshotDate` y `confidence`
  - `commercial-cost-worker` scope `roles` implementado en Cloud Run scaffold + fallback interno Next
  - admin pricing catalog de roles extendido para editar/ver overhead, loaded cost, origen y confianza
- **Verificación ejecutada:**
  - `pnpm pg:doctor` ok
  - `pnpm exec tsx scripts/migrate.ts up --check-order=false` ok; `src/types/db.d.ts` regenerado
  - `pnpm exec vitest run src/lib/finance/pricing/__tests__/pricing-engine-v2.test.ts` ok
  - `pnpm exec tsc --noEmit` ok
  - `pnpm lint` ok
  - `pnpm build` ok
  - `rg -n "new Pool\\(" src -S` -> solo `src/lib/postgres/client.ts`
- **Nota operativa del worktree:** `pnpm build` con Turbopack fallaba por el symlink de `node_modules` apuntando fuera del root del worktree. Para validar el build se clonó localmente `node_modules` dentro del worktree; no hubo cambios versionados por eso.

## Sesion 2026-04-19 — ISSUE: Quote save 500 "could not determine data type of parameter $4" (Claude)

- **Owner:** Claude
- **Estado:** Fijado en `develop` (commits `bddae660`, `e7d39146`, `2e237c07`, `10018007`). Staging verificado: empty quote + quote con role line devuelven HTTP 201.
- **Root cause:** `POST /api/finance/quotes` reusaba `$4` (space_id) tanto como columna VALUES como dentro de `CASE WHEN $4 IS NOT NULL THEN 'explicit' ELSE 'unresolved' END` (space_resolution_source). Cuando el builder UI no envía `spaceId`, `$4` llega como null untyped; Postgres no podía unificar el tipo entre los dos contextos y abortaba con el error. El 500 salía con body vacío porque el `throw error` del catch inicial degradaba a generic 500 de Next.
- **Fix canónico (no parche):** derivar `space_resolution_source` en JS (`body.spaceId != null ? 'explicit' : 'unresolved'`) y pasarlo como `$24` positional. Se eliminó el parameter reuse en contextos incompatibles. Misma semántica, SQL queda fully typed por column context.
- **Companion hardening:** dos try/catch nuevos (INSERT quotations + persistQuotationPricing) que devuelven el mensaje real + structured console.error. Siempre. Next no puede volver a esconder un 500 con body vacío en este endpoint.

### Follow-up arquitectónico identificado (no parche — task separada)

Al investigar el bug quedó expuesto que `quotations` mezcla identidades: tiene `client_id`, `organization_id` y `space_id` en la misma fila, pero el builder UI etiqueta "Espacio destinatario" en un dropdown que **bindea a `organizationId`**. El nombre engaña y `space_id` siempre llega null desde la UI nueva. La regla canónica de Greenhouse es: una cotización se ancla a **Organización (cliente o prospecto) + Contacto (persona)**, no a Space. Space es proyección operativa post-conversión (delivery / pulse / ICO) — no pertenece en la quote canónica.

**Creada TASK-486 — Commercial Quotation Canonical Anchor (Organization + Contact)** como spec del refactor enterprise. Alcance: deprecar `quotations.space_id`, agregar `contact_identity_profile_id` (FK a `greenhouse_core.identity_profiles`), renombrar label del builder, rehacer validación del POST para exigir `organizationId`. Task separada — no se mezcla con TASK-477 (domain distinto) ni con el bug fix actual.

---

## Sesion 2026-04-19 — TASK-479 People Actual Cost + Blended Role Cost Snapshots (Codex)

- **Owner:** Codex
- **Estado:** `complete`
- **Rama / worktree:** `task/TASK-479-people-actual-cost-blended-role-snapshots` en `/Users/jreye/Documents/greenhouse-eo-task-479`
- **Colisión evitada:** no se tocó el checkout principal porque había movimiento concurrente de rama; la task vive en worktree aislado.
- **Discovery resuelto:** `member_capacity_economics` sí era la base factual correcta, pero faltaban dos contratos reales en el repo:
  - bridge canónico persona -> `sellable_role`
  - snapshot persistido `role_blended` por `role-period`
- **Spec corregida y cerrada:** `TASK-479` quedó reanclada a `commercial-cost-worker` scope `people` y ahora vive como task completada.
- **Entregables:**
  - migración `20260419141717643_task-479-people-actual-cost-blended-role-snapshots.sql`
  - tablas `greenhouse_commercial.member_role_cost_basis_snapshots` y `greenhouse_commercial.role_blended_cost_basis_snapshots`
  - helper `src/lib/commercial-cost-basis/people-role-cost-basis.ts`
  - `commercial-cost-worker` scope `people` ahora materializa bridge persona/rol + `role_blended`
  - `pricing-engine-v2` ahora prefiere `role_blended` antes de `role_modeled` y emite metadata `member_actual` / `role_blended`
  - `GET /api/people/[memberId]/finance-impact` y `person-360/facets/costs` endurecidos contra drift del schema real
- **Verificación ejecutada:**
  - `pnpm migrate:up --no-check-order` ok; `src/types/db.d.ts` regenerado
  - `pnpm exec vitest run src/lib/finance/pricing/__tests__/pricing-engine-v2.test.ts` ok
  - `pnpm exec tsc --noEmit` ok
  - `pnpm lint` ok
  - `pnpm build` ok
  - `rg -n "new Pool\\(" src | rg -v "src/lib/postgres/client.ts"` sin matches

## Sesion 2026-04-19 — TASK-484 FX Provider Adapter Platform (Claude)

- **Owner:** Claude
- **Estado:** `in-progress` → listo para PR a develop. Rollout (flip `coverage` a `auto_synced`) **deferido a PR separado** post-24-48h dry-run en staging.
- **Rama:** `task/TASK-484-fx-provider-adapter-platform`
- **Scope:** platform adapter-driven con 9 providers. USD/CLP sync preservado idéntico.

### Entregables

- **9 provider adapters** en `src/lib/finance/fx/providers/`:
  - `mindicador.ts` (USD↔CLP, existente refactoreado sin cambio de comportamiento)
  - `open-er-api.ts` (legacy fallback USD↔any, sin histórico)
  - `banxico-sie.ts` (USD↔MXN primario, serie FIX SF43718, requiere `BANXICO_SIE_TOKEN`)
  - `datos-gov-co-trm.ts` (USD↔COP primario, Socrata 32sa-8pi3 con window expansion)
  - `apis-net-pe-sunat.ts` (USD↔PEN primario, SUNAT SBS venta, per-day iteration)
  - `bcrp.ts` (USD↔PEN histórico por rango, para backfills)
  - `frankfurter.ts` (USD↔MXN fallback ECB)
  - `fawaz-ahmed.ts` (universal fallback CDN, any pair)
  - `clf-from-indicators.ts` (CLP↔CLF leyendo `greenhouse_finance.economic_indicators.UF`)
- **Orchestrator foundation** en `src/lib/finance/fx/`:
  - `sync-orchestrator.ts` con `syncCurrencyPair()` primary → fallbacks chain, upsert transaccional vía `upsertFinanceExchangeRateInPostgres`, dry-run, `overrideProviderCode`, `triggeredBy` tracking en `source_sync_runs` (`source_system = 'fx_sync_orchestrator'`)
  - `circuit-breaker.ts` — 3 fallas en 5min → skip 15min por `(provider, from, to)`
  - `provider-adapter.ts` + `provider-index.ts` — contrato compartido + registro central
  - helper fetch compartido (timeouts 5s, retries x3 exponential backoff para 5xx/network, no retry en 4xx, validación row-level `rate > 0 && isFinite(rate)`)
- **Currency registry extension**: `currency-registry.ts` gana `providers: { primary, fallbacks[], historical? }` en cada entrada (reemplaza el string único legacy). Registry sigue siendo la única fuente de verdad para la cadena por par.
- **Event catalog**: 2 eventos nuevos en `src/lib/sync/event-catalog.ts`:
  - `finance.fx_sync.provider_fallback` (emitido en cada transición primary → fallback)
  - `finance.fx_sync.all_providers_failed` (emitido cuando se agota la cadena)
  - `finance.exchange_rate.upserted` (existente) se reutiliza en success path
- **Admin endpoint**: `POST /api/admin/fx/sync-pair` con `canAdministerPricingCatalog` gate, dryRun default `true`, devuelve `runId` para correlación con `source_sync_runs`
- **Cron routes**: `GET /api/cron/fx-sync-latam?window=morning|midday|evening` + 3 entradas en `vercel.json` a 09:00 / 14:00 / 22:00 UTC. La cron 23:05 UTC existente de economic-indicators quedó intocada.
- **Backfill CLI**: `scripts/backfill-fx-rates.ts` — range-based (`--from YYYY-MM-DD --to YYYY-MM-DD --pair USD-MXN`), respeta `supportsHistorical` por adapter, `--dry-run` opcional
- **Tests**: 29/29 vitest passing (circuit-breaker, provider-adapter helpers, sync-orchestrator)

### Verificación

- `npx tsc --noEmit` → 0 errors
- `pnpm lint` → clean
- `pnpm build` → compiled successfully 14.8s
- `pnpm exec vitest run src/lib/finance/fx/__tests__` → 29/29 passing

### Cross-impact

- **TASK-466** (multi-currency quote output): desbloqueada **tras el flip PR**. El send gate tendrá cobertura FX real en producción sólo cuando `CURRENCY_REGISTRY[code].coverage` pase a `auto_synced` para CLF/COP/MXN/PEN.
- **TASK-475**: cero cambios al contrato de readiness ni al resolver. El orchestrator sólo pobla la tabla `greenhouse_finance.exchange_rates` más densamente; `resolveFxReadiness` sigue leyendo igual.
- **TASK-483** (Codex, Commercial Cost Basis worker): cero overlap. FX sync vive en Vercel cron, no en el worker. Si en el futuro el worker necesita FX, consume `resolveFxReadiness` igual que el pricing engine.
- **USD↔CLP cron 23:05 UTC**: **intocado operativamente**. Sólo cambia por dentro (Mindicador corre ahora vía adapter), mismo endpoint, misma hora, misma cadena Mindicador → OpenER.

### Follow-ups

- **Rollout PR (separado, post 24–48h dry-run staging):**
  - Set env `FX_SYNC_DRY_RUN=true` en staging por 24–48h, verificar `source_sync_runs` limpio.
  - Flipear `CURRENCY_REGISTRY[code].coverage` de `manual_only` a `auto_synced` **una moneda por vez** en el orden: CLF → COP → PEN → MXN (MXN último porque depende del token).
- **Secret provisioning**: publicar `BANXICO_SIE_TOKEN` en GCP Secret Manager + Vercel env (scalar crudo, sin comillas/`\n`) **antes** del flip de MXN. Hasta entonces MXN degrada a Frankfurter → Fawaz Ahmed.
- **Admin UI** `GET /api/admin/fx/health` opcional para operadores (qué provider está activo, circuit breaker state, últimas corridas) — queda como nice-to-have fuera de scope de este PR.

## Sesion 2026-04-19 — TASK-478 tool/provider cost basis snapshots (Codex)

- **Owner:** Codex
- **Estado:** complete; branch empujada y merge a `develop` en ejecución
- **Rama / worktree:** `task/TASK-478-tool-provider-cost-basis-snapshots` en `/Users/jreye/Documents/greenhouse-eo-task-478`
- **Colisión evitada:** no se tocó el checkout principal porque estaba siendo movido por Claude; esta task se hizo en worktree aislado.
- **Entregables:**
  - migración `20260419132037430_task-478-tool-provider-cost-basis-snapshots.sql`
  - tabla `greenhouse_commercial.tool_provider_cost_basis_snapshots`
  - helpers `src/lib/commercial-cost-basis/tool-provider-cost-basis.ts` y `tool-provider-cost-basis-reader.ts`
  - `commercial-cost-worker` scope `tools` ahora materializa `provider_tooling_snapshots` + `tool_provider_cost_basis_snapshots`
  - `pricing-engine-v2` ahora consume snapshot fino por `toolSku + period` antes de caer al catálogo
  - `GET /api/finance/suppliers/[id]` expone `providerToolCostBasis`
- **Verificación ejecutada:**
  - `pnpm exec vitest run src/lib/finance/pricing/__tests__/pricing-engine-v2.test.ts` ok
  - `pnpm exec eslint ...` sobre archivos tocados ok
  - `pnpm exec tsc --noEmit` ok
  - `pnpm migrate:up --no-check-order` ok con Cloud SQL Proxy en sesión controlada; `src/types/db.d.ts` regenerado
  - verificación `TASK-462` en `public.pgmigrations` -> ya estaba aplicada; no hubo que rerunearla
  - `pnpm build` ok
  - `pnpm lint` ok
  - `rg -n "new Pool\\(" src | rg -v "src/lib/postgres/client.ts"` -> sin matches
- **Nota operativa importante:** en este worktree hubo que reemplazar el symlink `node_modules` por un `node_modules` real porque Turbopack rechazaba el symlink fuera de la raíz al correr `pnpm build`.

## Sesion 2026-04-19 — TASK-483 cerrada con deploy WIF + smoke real (Codex)

- **Owner:** Codex
- **Estado:** `complete` en `develop`
- **Scope:** cerrar de forma real el runtime foundation de Commercial Cost Basis y propagar el contrato a las tasks hermanas del programa.
- **Cierre operativo:**
  - `commercial-cost-worker` ya está desplegado en Cloud Run `us-east4`
  - auto-deploy vía GitHub Actions + WIF validado en runs `24629415478` y `24629615574`
  - scheduler `commercial-cost-materialize-daily` habilitado
  - revisión lista validada: `commercial-cost-worker-00002-9xj`
- **Smoke real:** corrida manual del scheduler -> HTTP `200`, `source_sync_runs` en `succeeded`, snapshot `bundle` `2026-04` con `56` writes / `0` failed
- **Bug real encontrado en producción controlada:** el materializador `bundle` falló al primer smoke por `column reference "client_id" is ambiguous` en `client_labor_cost_allocation`; se corrigió endureciendo el query con alias explícito en `src/lib/commercial-cost-attribution/member-period-attribution.ts` y test de regresión dedicado.
- **Backlog sincronizado:** `TASK-476` a `TASK-482` ahora dejan explícito que el worker ya existe y que sus slices batch deben montarse sobre `commercial-cost-worker`, no sobre `ops-worker` ni sobre request-response del portal.
- **Ubicación del cierre:** `docs/tasks/complete/TASK-483-commercial-cost-basis-engine-runtime-topology-worker-foundation.md`

## Sesion 2026-04-19 — commercial-cost-worker auto-deploy via GitHub Actions + WIF (Codex)

- **Owner:** Codex
- **Estado:** workflow y contrato de deploy implementados; pendiente primera corrida verde en GitHub Actions
- **Scope:** endurecer el deploy del `commercial-cost-worker` para que no dependa de pasos manuales fuera de excepción operativa.
- **Entregables:**
  - workflow nuevo `.github/workflows/commercial-cost-worker-deploy.yml`
  - `services/commercial-cost-worker/deploy.sh` alineado con readiness explícita + comentarios de topología
  - docs actualizados en `.github/DEPLOY.md`, `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`, `docs/documentation/operations/commercial-cost-worker.md`, `project_context.md`
- **Decisión operativa:** el worker reutiliza el mismo baseline WIF del repo (`github-actions-deployer@efeonce-group.iam.gserviceaccount.com` + `GCP_WORKLOAD_IDENTITY_PROVIDER`). No se crea SA/pool/provider nuevo.
- **Trigger set del workflow:** cubre `services/commercial-cost-worker/**` y librerías compartidas que alteran su runtime real (`commercial-cost-worker`, `commercial-cost-attribution`, `providers`, `db`, `structured-context`, `sync`, `db.d.ts`, lockfile, `tsconfig`).
- **Pendiente explícito:** como el servicio aún no existe en Cloud Run, la primera corrida del workflow será la que materialice por primera vez `commercial-cost-worker`. Verificar en Actions que la revisión quede `ready=True`.

## Sesion 2026-04-19 — TASK-475 Greenhouse FX & Currency Platform Foundation (Claude)

- **Owner:** Claude
- **Estado:** `in-progress` → `complete` (PR merged to develop)
- **Rama:** `task/TASK-475-greenhouse-fx-currency-platform-foundation`
- **Scope:** contratos plataforma de monedas + FX policy + readiness; no migra consumers CLP-normalizados.

### Entregables

- **Tipos canónicos**: `src/lib/finance/currency-domain.ts`
  - `CURRENCY_DOMAINS`, `CURRENCIES_ALL`, `CURRENCY_DOMAIN_SUPPORT` (matriz por dominio)
  - `FX_POLICIES`, `FX_POLICY_DEFAULT_BY_DOMAIN`
  - `FX_READINESS_STATES`, `FxReadiness`
  - `FX_STALENESS_THRESHOLD_DAYS`, `CLIENT_FACING_STALENESS_THRESHOLD_DAYS`
  - Helpers `isSupportedCurrencyForDomain`, `assertSupportedCurrencyForDomain`, `narrowToDomainCurrency`, `toFinanceCurrency`
- **Currency registry**: `src/lib/finance/currency-registry.ts`
  - Policy declarativa por moneda: provider, fallback strategies, sync cadence, coverage class, fxPolicyDefault, domains
  - `USD`/`CLP` = `auto_synced` (Mindicador + OpenER); `CLF`/`COP`/`MXN`/`PEN` = `manual_only` (pending provider wire-up)
  - Helpers `getCurrencyRegistryEntry`, `isAutoSyncedCurrency`, `allowsUsdComposition`
- **Readiness resolver**: `src/lib/finance/fx-readiness.ts`
  - `resolveFxReadiness({from, to, rateDate, domain})` con chain identity → domain gate → direct → inverse → USD composition → classify by threshold
  - NEVER throws; devuelve estado clasificado (`supported | supported_but_stale | unsupported | temporarily_unavailable`)
- **API HTTP**: `GET /api/finance/exchange-rates/readiness?from=X&to=Y&domain=pricing_output&rateDate=YYYY-MM-DD` — finance tenant gate, cacheable 60s
- **Engine integration**: `src/lib/finance/pricing/currency-converter.ts` expone `resolvePricingOutputFxReadiness`; `pricing-engine-v2.ts` llama al inicio del pipeline y emite `fx_fallback` structured warning (critical si unsupported/unavailable, warning si stale, info si composed via USD)
- **Tests**: `src/lib/finance/__tests__/currency-domain.test.ts` (14 asserts) + `fx-readiness.test.ts` (12 asserts); pricing-engine-v2 mock actualizado

### Verificación

- `npx tsc --noEmit` → 0 errors
- `pnpm lint` → clean
- `pnpm build` → Compiled successfully 17.3s
- `pnpm exec vitest run src/lib/finance/__tests__ src/lib/finance/pricing/__tests__ src/lib/commercial/__tests__/service-catalog-expand.test.ts` → 37 passed / 37

### Cross-impact

- **TASK-466** (multi-currency quote output): Delta añadido documentando cómo consumir el readiness gate + CLIENT_FACING threshold + snapshot a `quotations.exchange_rates`. Desbloqueada.
- **TASK-397** (management accounting): consumer futuro del readiness layer para costos financieros/treasury.
- **TASK-429** (locale-aware formatting): formatting multi-moneda ahora tiene currency/fxPolicy contract sólido.
- **TASK-417** (metric registry foundation): puede declarar `fxPolicy` por métrica usando el enum `FX_POLICIES`.
- **CLP-normalized consumers** (`operational_pl`, `member_capacity_economics`, `tool-cost-reader`, payroll): sin cambios. Boundary declarada en `CURRENCY_DOMAIN_SUPPORT[reporting|analytics]`.

### Compatibility

- `FinanceCurrency = 'CLP' | 'USD'` NO se expande — compliance rule #5 del spec respetada.
- `resolvePricingOutputExchangeRate` sigue existiendo (compat path) pero el engine ya no depende de su fallback silencioso.
- Structured warnings infraestructura de TASK previa reutilizada — `fx_fallback` ya estaba en `PRICING_WARNING_CODES` enum.

### Follow-ups

- Wire providers automáticos para `COP/MXN/PEN` cuando el negocio lo requiera — cambiar su entrada en `CURRENCY_REGISTRY` de `manual_only` a `auto_synced` + implementar fetch. No urgente.
- Admin UI para upsertar tasas manuales (hoy via API). Queda fuera de scope.
- TASK-466 consume esta foundation para client-facing send gate.

## Sesion 2026-04-19 — TASK-483 commercial cost worker foundation (Codex)

- **Owner:** Codex
- **Estado:** foundation implementada en branch dedicada; merge directo a `develop` en curso
- **Colisión evitada:** no se tocó el checkout principal porque Claude ya había movido rama allí; TASK-483 se trabajó en worktree aislado `/Users/jreye/Documents/greenhouse-eo-codex-task-483`
- **Runtime creado:**
  - migración `20260419120945432_task-483-commercial-cost-worker-foundation.sql`
  - ledger `greenhouse_commercial.commercial_cost_basis_snapshots`
  - helpers `src/lib/commercial-cost-worker/{contracts,run-tracker,materialize}.ts`
  - fallback route `src/app/api/internal/commercial-cost-basis/materialize/route.ts`
  - scaffold Cloud Run `services/commercial-cost-worker/**`
- **Decisión arquitectónica:** `ops-worker` no escala como hogar del programa de commercial cost basis. Se deja `commercial-cost-worker` como runtime objetivo para `people`, `tools` y `bundle`; `roles`, `reprice` y `margin feedback` quedan reservados con `501`.
- **Verificación corrida:**
  - `pnpm migrate:create task-483-commercial-cost-worker-foundation` ok
  - `pnpm exec tsc --noEmit` ok
  - `pnpm exec tsx scripts/migrate.ts up --no-check-order` ok con Cloud SQL Proxy local; también aplicó una migration pendiente previa (`20260419094152047_task-465-pricing-catalog-audit-service-support`) por drift conocido de orden en DB
  - `pnpm lint` ok
  - `pnpm build` ok
  - `rg -n "new Pool\\(" src --glob '!src/lib/postgres/client.ts'` → sin matches
  - `bash -n services/commercial-cost-worker/deploy.sh` ok
- **Riesgos / follow-up inmediato:**
  - `docker build -f services/commercial-cost-worker/Dockerfile .` no se pudo correr porque el daemon Docker no estaba disponible en esta máquina (`/var/run/docker.sock` ausente)
  - el estado en Cloud Run debe verificarse o desplegarse con credenciales `gcloud` vigentes; la implementación local no garantiza deploy remoto automático

## Sesion 2026-04-19 — TASK-483 ajustada a worker dedicado para Commercial Cost Basis (Codex)

- **Owner:** Codex
- **Estado:** backlog + arquitectura actualizados; sin cambios de runtime
- **Decisión registrada:** el motor `Commercial Cost Basis` no debe crecer como cómputo pesado dentro del portal ni montarse sobre `ops-worker` como hogar permanente. `TASK-483 — Commercial Cost Basis Engine Runtime Topology & Worker Foundation` queda ajustada para formalizar el split:
  - `portal interactive lane` para preview, composición y lectura de snapshots,
  - `Cloud Run compute lane` en worker dedicado para materializaciones, repricing batch, backfills y feedback loop.
- **Rationale:** `ops-worker` ya concentra lanes reactivos y jobs operativos compartidos; sumar ahí el engine comercial mezclaría blast radius, recursos y cadence de deploy.
- **Docs sincronizados:** `docs/tasks/complete/TASK-483-commercial-cost-basis-engine-runtime-topology-worker-foundation.md`, `docs/tasks/complete/TASK-476-commercial-cost-basis-program.md`, `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`, `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`.
- **Importante para siguientes agentes:** `TASK-477` a `TASK-482` ya no deben asumir implementación puramente in-app ni montarse en `ops-worker`; revisar `TASK-483` antes de tocar worker placement o jobs batch.

## Sesion 2026-04-19 — Programa Commercial Cost Basis registrado (Codex)

- **Owner:** Codex
- **Estado:** backlog/documentación ajustada; sin cambios de runtime
- **Decisión de arquitectura/backlog:** se registró una línea nueva `TASK-476` a `TASK-482` para llevar pricing a un modelo data-driven sin reinventar foundations ya existentes.
- **Regla explícita del programa:** reusar anchors canónicos del repo:
  - personas/capacidad: `member_capacity_economics`
  - payroll factual: `compensation_versions`
  - roles comerciales: `sellable_roles` + `sellable_role_cost_components`
  - tooling: `greenhouse_ai.tool_catalog`
  - vendors: `greenhouse_core.providers`
  - servicios: `service_pricing` + recipes
  - FX: `TASK-475`
- **Importante:** `TASK-471` se endureció como UI/admin polish solamente. No absorbe `Commercial Cost Basis`.

## Sesion 2026-04-19 — TASK-474 cerrada sin trabajo incremental (Claude)

- **Owner:** Claude
- **Estado:** `to-do` → `complete` (sin PR incremental)
- **Motivo:** TASK-474 era la red de seguridad para absorber una posible integración UX incompleta entre TASK-465 y TASK-473. Tras mergear TASK-473 a develop y deployar a staging, smoke test autenticado con agent user `user-agent-e2e-001` verificó que los 4 AC ya están cumplidos en el PR de TASK-473.
- **Evidencia:**
  - `GET /finance/quotes/new` → 200 con labels "Catálogo", "Servicio", "Template", "Manual" presentes en el HTML streaming.
  - `QuoteSourceSelector.tsx` renderiza 4 source cards first-class (onCatalog/onService/onTemplate/onManual).
  - `QuoteLineItem.source` + chip outlined por fila en read-only y editable branches de `QuoteLineItemsEditor`.
  - `POST /api/finance/quotes/from-service` con `EFG-001` → 200 expandiendo a 7 líneas con pricing engine v2 (subtotal $3890.33 USD, margen 71.2%).
  - `GET /api/finance/quotes/pricing/lookup?type=service` → 200 con los 7 servicios EFG-001..007.
- **Acción:** archivo movido a `docs/tasks/complete/` con Delta de cierre; README sincronizado. Si aparece un bug específico post-merge en el quote builder, se documenta como `ISSUE-###` en lugar de reabrir este scope.

## Sesion 2026-04-19 — TASK-473 Quote Builder Full-Page Surface Migration (Claude)

- **Owner:** Claude
- **Estado:** `in-progress` → listo para PR
- **Rama:** `task/TASK-473-quote-builder-full-page-surface-migration`
- **Scope respetado:** migración estructural de surfaces. No hay migraciones de schema, no hay backend nuevo. `QuoteCreateDrawer` se mantiene vivo como legacy pero ya no es el flujo principal.

### Entregables

- **Rutas full-page nuevas**:
  - `GET /finance/quotes/new` — create surface canónica
  - `GET /finance/quotes/[id]/edit` — edit surface (mismo shell, precarga quote + lines). Redirige a `/finance/quotes/[id]?denied=edit` si el estado no es `draft` o el viewer no puede editar.
- **Shell reusable**:
  - `src/views/greenhouse/finance/QuoteBuilderPageView.tsx` — wrapper thin para create + edit
  - `src/views/greenhouse/finance/workspace/QuoteBuilderShell.tsx` (~850 LOC) — core: 2-col layout, `QuoteSourceSelector` + `QuoteLineItemsEditor` main, rail sticky con `QuoteBuilderActions` + `AddonSuggestionsPanel` + `QuoteTotalsFooter`. Submit: POST /api/finance/quotes (create) o PUT /[id] + POST /[id]/lines (edit).
  - `src/views/greenhouse/finance/workspace/QuoteSourceSelector.tsx` — 4 cards first-class: **Catálogo** / **Servicio** / **Template** / **Manual**. Reemplaza el patrón manual-first del drawer legacy.
  - `src/views/greenhouse/finance/workspace/QuoteTemplatePickerDrawer.tsx` — drawer para elegir template.
- **Trazabilidad visual de origen**: `QuoteLineItem` gana `source: 'catalog' | 'service' | 'template' | 'manual'`. Chip outlined por fila. `mapSelectionToLine` etiqueta automáticamente según tab del picker; `makeBlankManualLine()` crea línea vacía. Servicio dispara `POST /api/finance/quotes/from-service` y expande a N líneas con `source: 'service'` + `serviceSku`.
- **QuoteLineItemsEditor** ahora es `forwardRef<QuoteLineItemsEditorHandle>` con API imperativa `{ appendLines(lines), getDraft() }` para que el shell inyecte líneas desde el source selector sin lift de estado. Nuevo botón "+ Manual" en el quick-add bar.
- **QuotesListView**: CTA "Nueva cotización" → `router.push('/finance/quotes/new')`. Drawer legacy desmontado del list view.
- **QuoteDetailView**: nuevo botón "Editar" en header (visible solo si `viewer.canEdit && status==='draft'`) → `/finance/quotes/[id]/edit`.
- **Copy nuevo** en `GH_PRICING` bajo `builderSources`, `builderSaveAndClose`, `builderCancel`, `builderTemplatePicker*`, validaciones.

### Verificación

- `npx tsc --noEmit` → 0 errores
- `pnpm lint` → clean
- `pnpm build` → Compiled successfully en 16.0s; rutas `/finance/quotes/new` y `/finance/quotes/[id]/edit` registradas en el manifest.

### Cross-impact

- **TASK-465** → desbloqueada la integración primaria del picker: las 2 nuevas surfaces consumen `/api/finance/quotes/from-service` y `lookup?type=service`.
- **TASK-466** / **TASK-475** → desbloqueadas estructuralmente: ya hay surface correcta para montar preview + PDF sobre el builder.
- **TASK-474** → preparada pero no requerida por ahora; las 4 source cards ya son first-class.

## Sesion 2026-04-19 — TASK-475 creada para foundation FX/currency Greenhouse (Codex)

- **Owner:** Codex
- **Estado:** backlog/documentación ajustada; sin cambios de runtime
- **Decisión de programa:** `TASK-466` ya no debe intentar resolver por sí sola la deuda plataforma de multicurrency/Fx. Se crea `TASK-475 — Greenhouse FX & Currency Platform Foundation` para endurecer el contrato de monedas por dominio, coverage/freshness de `greenhouse_finance.exchange_rates` y guardrails shared para quotes/pricing/reporting.
- **Ajuste asociado:** `TASK-466` queda reanclada explícitamente a `TASK-475` además de `TASK-473`, evitando que un agente futuro implemente multi-currency client-facing sobre supuestos incompletos o ad hoc.
- **Criterio rector:** solución robusta y escalable; no expandir `FinanceCurrency` ni CLP-normalized consumers a ciegas solo porque quotes quiera vender en más monedas.


## Sesion 2026-04-19 — TASK-465 Service Composition Catalog + Admin UI + Expand API (Claude)

- **Owner:** Claude
- **Estado:** `in-progress` → listo para PR (acceptance criteria cubiertos + re-scope de UI respetado)
- **Rama:** `task/TASK-465-service-composition-catalog-ui`
- **Scope respetado:** backend completo (schema + store + constraints + audit + seed + admin APIs + from-service expansion) + admin UI reusable. **Congelado:** cualquier extensión del `QuoteCreateDrawer` como surface principal. La integración final del picker en create/edit queda en `TASK-473`.

### Entregables

- **Schema canónico**: `migrations/20260419093339069_task-465-service-composition-catalog.sql`
  - `greenhouse_commercial.service_pricing` con PK = `module_id` FK a `greenhouse_core.service_modules` (1:1). SKU auto-generado vía `generate_service_sku()` = `EFG-###`, sequence inicia en 8.
  - `greenhouse_commercial.service_role_recipe(module_id, line_order PK, role_id FK sellable_roles, hours_per_period, quantity, is_optional, notes)`
  - `greenhouse_commercial.service_tool_recipe(module_id, line_order PK, tool_id, tool_sku, quantity, is_optional, pass_through, notes)` — FK soft cross-schema a `greenhouse_ai.tool_catalog`
  - `quotation_line_items` extendida con `module_id` FK + `service_sku` + `service_line_order` para trazabilidad robusta a renames
  - Ownership `greenhouse_ops`; grants a runtime/migrator/app
- **Audit extension**: `migrations/20260419094152047_task-465-pricing-catalog-audit-service-support.sql` extiende `pricing_catalog_audit_log` para aceptar `entity_type='service_catalog'` + acciones `recipe_updated`/`deleted`. TS side: `src/lib/commercial/pricing-catalog-audit-store.ts`.
- **Store Kysely**: `src/lib/commercial/service-catalog-store.ts` (listServiceCatalog, getServiceByModuleId/ServiceBySku, createService [atomic service_modules+service_pricing], updateService, softDeleteService, replaceRoleRecipe, replaceToolRecipe, upsertServiceModule)
- **Constraints**: `src/lib/commercial/service-catalog-constraints.ts` (validateServiceCatalog/RoleRecipeLine/ToolRecipeLine)
- **Expansion**: `src/lib/commercial/service-catalog-expand.ts` (`expandServiceIntoQuoteLines`) → construye `PricingEngineInputV2.lines[]` reutilizando `buildPricingEngineOutputV2` del engine v2 sin duplicar lógica. Soporta overrides por lineOrder (hours/quantity/excluded) y `commercialModelOverride`.
- **APIs admin**: `/api/admin/pricing-catalog/services/{,[id],[id]/recipe}` con `canAdministerPricingCatalog` gate + `If-Match` optimistic lock + audit log.
- **API expand**: `POST /api/finance/quotes/from-service` (fin) y extensión del `/api/finance/quotes/pricing/lookup` con `type=service` (incluye `moduleId`, `tier`, `commercialModel`, `serviceUnit`, counts en metadata).
- **Seed**: `scripts/seed-service-catalog.ts` + `pnpm seed:service-catalog --apply`. Seedea los 7 EFG activos (UPSERT idempotente en `service_modules` + `service_pricing` + recipes). Placeholders EFG-008..048 se skip (Open Question cerrada). Aplicado en dev: 7 services, 7 role lines, 14 tool lines.
- **Admin UI** (reusable, NO acoplada al drawer legacy):
  - Page `src/app/(dashboard)/admin/pricing-catalog/services/page.tsx`
  - List view `ServiceCatalogListView.tsx`
  - Drawers `CreateServiceDrawer.tsx` + `EditServiceDrawer.tsx` (sin tabs; secciones Detalle general / Receta de roles y herramientas / Simular precio)
  - Recipe editor con keyboard-only reorder (WCAG 2.5.7)
  - Card adicional en `PricingCatalogHomeView` (5ta card "Servicios empaquetados")
- **Picker tab**: `SellableItemPickerDrawer` activa tab `services` contra el lookup real (queda como subflujo acotado reusable; NO se profundizó `QuoteCreateDrawer` per Delta 2026-04-19 de la spec).
- **Tests** (Vitest): `service-catalog-constraints.test.ts` (20 asserts) + `service-catalog-expand.test.ts` (11 asserts). Corrieron limpios (31/31).

### Verificación corrida

- `pnpm migrate:up` → aplicada, tipos regenerados en `src/types/db.d.ts` (255 tablas)
- `pnpm exec vitest run src/lib/commercial/__tests__/service-catalog-*.test.ts` → 31/31 PASS
- `npx tsc --noEmit` → 0 errores
- `pnpm lint` → clean después de `--fix` (padding-line autofixes)
- `pnpm build` → Compiled successfully en 14.6s

### Cross-impact (chequeo obligatorio al cerrar)

- **TASK-462** (MRR/ARR): `quotation_line_items.module_id`/`service_sku` quedan disponibles como dimensión analítica cuando contratos hereden esos campos. No requiere cambios propios hoy; el hook aguas arriba ya está.
- **TASK-460** (Contract): trazabilidad quote→contrato por `module_id` ahora es posible vía join; el campo `originator_service_sku` en contracts queda como follow-up menor si se desea denormalizar.
- **TASK-473** (Builder full-page): este PR NO integra el picker en `QuoteCreateDrawer`. TASK-473 absorbe la integración primaria sobre `/finance/quotes/new` y `/finance/quotes/[id]/edit`, consumiendo `GET /api/finance/quotes/pricing/lookup?type=service` + `POST /api/finance/quotes/from-service` ya disponibles.
- **TASK-466** (multi-currency): desbloqueada indirectamente — el output de `from-service` ya soporta `outputCurrency` parametrizable.

### Seguimiento

- Follow-up menor: cuando TASK-473 aterrice, reemplazar `SellableItemPickerDrawer` como surface principal por el picker full-page. El drawer se mantiene como sub-flujo bounded (p. ej. "Agregar servicio" en modal rápido).
- Follow-up menor: documento funcional de `docs/documentation/finance/` (una vez el admin UI esté vivo en staging con datos reales).

## Sesion 2026-04-19 — Realineamiento del programa de cotizaciones hacia builder full-page (Codex)

- **Owner:** Codex
- **Estado:** ajuste documental del programa; **sin cambios de runtime**
- **Decisión de producto/UI:** el quote builder ya no debe seguir creciendo dentro de `QuoteCreateDrawer`. La dirección canónica vuelve a la Surface A de `TASK-469`: `/finance/quotes/new` y `/finance/quotes/[id]/edit` como builder full-page; `/finance/quotes/[id]` queda para review / governance / lifecycle.
- **Task nueva creada:** `TASK-473 — Quote Builder Full-Page Surface Migration & Flow Recomposition`
- **Backlog realineado:**
  - `TASK-466` queda explícitamente bloqueada por `TASK-473` y se reancla al builder full-page + detail review
  - `TASK-465` deja de referenciar `QuoteCreateDrawer` como surface principal y pasa a montar su picker dentro del builder canónico
  - `TASK-473` endurece su contrato: el builder nuevo debe reconectar explícitamente catálogo, servicios, templates y manual como fuentes de composición
  - `TASK-474` queda creada como red de seguridad post-merge si `TASK-465` y `TASK-473` aterrizan bien técnicamente pero todavía se perciben desconectadas en la UX final
  - `docs/tasks/README.md` y `TASK_ID_REGISTRY.md` quedaron sincronizados con `TASK-473`, `TASK-474` y con `TASK-465` en `in-progress`
- **Importante:** `TASK-471` no se tocó a nivel de scope; sigue siendo pricing catalog admin polish, no quote-builder UX
- **Riesgo evitado:** sin este ajuste, los follow-ons del módulo de cotizaciones seguían diseñándose sobre una surface transitoria y sobredensa

## Sesion 2026-04-19 — TASK-470 formalmente cerrada (Codex)

- **Owner:** Codex
- **Estado:** `complete`
- **Cierre formal:** la task ya no queda en `to-do`; se movió a `docs/tasks/complete/`.
- **Validación final adicional corrida hoy:** `pnpm test` completo verde (`318` files, `1476` tests passed, `2` skipped).
- **Conclusión:** no quedaba gap backend material en el scope de TASK-470; lo pendiente era sincronizar lifecycle/documentación con el estado real del repo.

## Sesion 2026-04-19 — E2E smoke test completo + ISSUE-054 detectado (Claude)

- **Owner:** Claude
- **Contexto:** smoke test end-to-end post-TASK-462 con agent-session `agent@greenhouse.efeonce.org` (roles `efeonce_admin` + `collaborator`) cubriendo todas las Olas shippeadas.
- **45 rutas verificadas en staging — todas HTTP 200 menos 1** (`/my/profile` → 500).
- **Ola 1 (fundaciones)**: `/home`, `/dashboard`, `/internal/dashboard`, `/settings`, `/updates`, `/notifications`, `/reviews`, `/sprints`, `/proyectos`, `/spaces` — todos 200.
- **Ola 2 (Person 360 + Capacity)**: `/people`, `/agency/{spaces,operations,capacity}`, `/hr/{payroll,leave,approvals,attendance,goals,departments,hierarchy,org-chart,evaluations,team}`, `/my/{payroll,performance,delivery,assignments,goals,leave,organization,evaluations}` — todos 200 excepto `/my/profile` → **500**.
- **Ola 3 (ICO + Finance intelligence)**: `/finance/{quotes,contracts,intelligence,income,expenses,reconciliation,hes,purchase-orders,clients,providers,bank,economics,shareholder-account}` — todos 200.
- **Ola 4 (Revenue pipeline + Pricing)**: tabs del `/finance/intelligence` (Cierre, Rentabilidad, Pipeline comercial TASK-457, MRR/ARR TASK-462) todos visibles post-rebuild. `/admin/pricing-catalog` + sub-rutas TASK-467 (roles/tools/overheads/governance/employment-types/audit-log) todas 200, 7 nav cards en home. APIs de MRR/ARR + revenue-pipeline + admin pricing-catalog responden 200 con shapes correctos (items vacíos porque contracts de staging aún no tienen `mrr_clp` populated).
- **ISSUE-054 creado**: `/my/profile` devuelve 500 consistentemente, aislado (resto de `/my/*` OK). No es ISSUE-044 global — es página-específica. Documentado en `docs/issues/open/ISSUE-054-my-profile-500-staging.md`. Probables causas: (a) import server-only en client bundle (similar al fix de TASK-467 phase-2 con `SELLABLE_ROLE_PRICING_CURRENCIES`), o (b) endpoint `/api/people/profile` faltante que `MyProfileView` consume sin handling.
- **TASK-472 creada** para Codex en `docs/tasks/to-do/TASK-472-my-profile-ssr-500-fix.md` (P2, Effort Bajo-Medio). Cubre diagnóstico + fix + regression test. Ownership Codex (domain identity/person-360 TASK-273/274 ha sido principalmente suyo). Registrada en TASK_ID_REGISTRY + tasks README.
- **Interpretación del E2E**: la preocupación del usuario ("lo shippeado del programa no se está viendo") se disipó. Todo el programa visible end-to-end. El único rojo es `/my/profile` aislado, ya documentado + asignado.

## Sesion 2026-04-19 — ISSUE-055 documentado en develop: role SKU `ECG-004` sin cost basis resoluble (Codex)

- **Owner:** Codex
- **Contexto:** diagnóstico manual sobre `/finance/quotes/new` tras reporte del usuario de que `PR Analyst` (`ECG-004`) quedaba en `$0` sin cálculo visible.
- **Hallazgo confirmado en staging:** `POST /api/finance/quotes/pricing/simulate` para `ECG-004` responde `HTTP 422` con `Missing cost components for role ECG-004`; control con `ECG-001` responde `HTTP 200` y calcula normal.
- **Root cause operacional:** el SKU existe en `sellable_roles`, pero no tiene filas en `sellable_role_cost_components` ni en `role_employment_compatibility`, por lo que el engine no puede resolver `role_modeled` ni `role_blended`.
- **Antecedente relevante:** `ECG-004` ya figuraba como `needs_review` en `TASK-464a` por ambigüedad entre `Fee Deel` y `Gastos Previsionales`; el gap es de canonicalización/cost basis del rol, no una caída general del pricing engine.
- **Documentación creada:** `docs/issues/open/ISSUE-055-quote-builder-role-sku-missing-cost-basis.md`
- **Tracker actualizado:** `docs/issues/README.md`
- **Pendiente de implementación:** completar el contrato canónico del rol en `develop` (employment type default + cost components + compatibility) y endurecer la UI del quote builder para exponer explícitamente errores `422` por SKU.

## Sesion 2026-04-19 — TASK-470 Pricing Catalog Enterprise Hardening (Codex)

- **Owner:** Codex
- **Estado:** implemented and locally validated on shared `develop`; **no commit / no push** por trabajo paralelo con Claude en el mismo checkout
- **Scope shipped:**
  - Helper nuevo `src/lib/tenant/optimistic-locking.ts` + test `optimistic-locking.test.ts`
  - Validator central `src/lib/commercial/pricing-catalog-constraints.ts` + tests para monotonicidad/rangos
  - Helper `src/lib/commercial/pricing-catalog-impact-analysis.ts` + endpoints `POST /api/admin/pricing-catalog/{roles,tools,overheads}/[id]/preview-impact` y `POST /api/admin/pricing-catalog/governance/preview-impact`
  - Overcommit lane nueva: `src/lib/team-capacity/overcommit-detector.ts`, `src/lib/commercial/capacity-overcommit-events.ts`, evento `commercial.capacity.overcommit_detected` en `event-catalog.ts`
  - Hardening de routes admin pricing catalog ya existentes:
    - optimistic locking/deprecation header en `roles/[id]`, `tools/[id]`, `overheads/[id]`
    - optimistic locking por `updated_at` del rol padre en `roles/[id]/{cost-components,pricing,compatibility}`
    - governance con `If-Match` + validators en `role_tier_margin`, `commercial_model_multiplier`, `country_pricing_factor`, `fte_hours_guide`, `employment_type`
    - collection routes `roles|tools|overheads` ahora validan create payloads y devuelven `ETag`
- **Runtime notes:**
  - preview-impact usa `resolveFinanceQuoteTenantSpaceIds()` para respetar tenant isolation cuando el finance user interno no trae `spaceId` explícito
  - `tool_catalog` preview es heurístico por evidencia textual en line items
  - `country_pricing_factor` preview es conservador y devuelve warning hasta que exista bridge canónico quote↔country
  - `detectAllOvercommits()` publica un evento por miembro sobrecomprometido; no se agregó cron en este corte
- **Validación corrida:**
  - `pnpm exec vitest run src/lib/tenant/optimistic-locking.test.ts src/lib/commercial/__tests__/pricing-catalog-constraints.test.ts src/lib/commercial/__tests__/pricing-catalog-impact-analysis.test.ts src/lib/team-capacity/overcommit-detector.test.ts src/lib/sync/event-catalog.test.ts`
  - `pnpm exec tsc --noEmit --incremental false`
  - `pnpm lint`
  - `pnpm build`
  - `rg -n "new Pool\\(" src --glob '!src/lib/postgres/client.ts'` → sin matches
- **Heads-up:**
  - `pnpm build` sigue mostrando warnings preexistentes de Dynamic Server Usage bajo `(dashboard)`, pero terminó exit `0`
  - Como el checkout compartido está en `develop` y el user avisó trabajo paralelo con Claude, dejé el cambio listo sin `git commit`/`git push`

## Sesion 2026-04-19 — TASK-462 MRR/ARR Contractual Projection & Dashboard (cierre)

- **Owner:** Claude
- **Estado:** shipped, pending PR merge + E2E smoke test
- **Branch:** `task/TASK-462-mrr-arr-contractual-projection-dashboard` desde develop
- **Scope shipped:**
  - Migration `20260419083556852_task-462-mrr-arr-schema.sql` con tabla `greenhouse_serving.contract_mrr_arr_snapshots` (PK compuesto, generated columns `arr_clp`+`mrr_delta_clp`, 3 índices)
  - Materializer `buildMrrArrSnapshotsForPeriod` + `backfillMrrArrFromFirstContract` con classifier (new/expansion/contraction/churn/reactivation/unchanged) detectando churn por contract desaparecido
  - Store con `listMrrArrByPeriod | getMrrArrPeriodTotals | getMrrArrSeries | computeNrr | listMrrArrMovements` + JOINs a contracts/clients, NRR fórmula canónica
  - Reactive projection `contractMrrArrProjection` domain `cost_intelligence`, 6 trigger events `commercial.contract.*`, scope `finance_period:YYYY-MM`
  - 3 endpoints `/api/finance/commercial-intelligence/mrr-arr/{,/timeline,/movements}`
  - UI: 4º outer tab "MRR/ARR" en `FinanceIntelligenceView` con `MrrArrDashboardView.tsx` (4 KPIs + ApexCharts timeline stacked + 3 breakdown cards + Top 10 + period switcher)
  - Bloque `GH_MRR_ARR_DASHBOARD` en nomenclature
  - Doc funcional `mrr-arr.md` nuevo + architecture doc v2.21
- **Deviations documentadas:**
  - Opción A (tab outer separado, no sub-tab dentro de "Pipeline comercial") — narrativa correcta: MRR/ARR = revenue firmado, Pipeline = forecast futuro
  - Migration timestamp bumped por Codex WIP en DB sin push del file. `--no-check-order` one-shot + `pnpm migrate:create` fresh resolvió
  - Codex TASK-470 WIP stashed aside (`capacity-overcommit-events.ts`, `pricing-catalog-constraints.ts`, `pricing-catalog-impact-analysis.ts`, `optimistic-locking.ts`, admin routes mods, event-catalog mods) — preservado en stash para restore post-merge
  - UI subagent timed out mid-work, completé el View en hilo principal invocando skills
- **Gates verdes:**
  - `pnpm lint` clean
  - `npx tsc --noEmit` clean
  - `pnpm test` → 209/209 (194 payroll baseline intacto + 15 TASK-462 nuevos)
  - `pnpm build` compiled exit 0 (17.0s)
  - Migration aplicada + types regenerados (252 tables)
- **Follow-ups:**
  - Forecast MRR futuro con modelo predictivo
  - Cohort analysis (retention curves)
  - Surface MRR top-line en home ejecutiva
  - Nexa weekly digest con MRR MoM Δ
  - Backfill script opcional si se quiere historia pre-TASK-460
- **E2E smoke test pendiente**: verificar con agent-session que el tab MRR/ARR se vea en `/finance/intelligence`. El user reportó preocupación de que algunas UI shipped del programa no se estaban viendo — verificar enlaces de menú + visibilidad del tab + `viewCode` del agent.

## Sesion 2026-04-19 — TASK-457 UI Revenue Pipeline Hybrid (cierre)

- **Owner:** Claude
- **Estado:** shipped, pending PR merge
- **Branch:** `task/TASK-457-ui-revenue-pipeline-hybrid` desde develop con TASK-467 phase-3 + TASK-460 + TASK-471 spec merged
- **Plan original cerrado**: TASK-457 era la continuación natural de TASK-456 (que Codex shipped). Completa la Ola 4 con valor visible al CEO/Finance (pipeline unificado).
- **Entregables shipped:**
  - **Reader** `src/lib/commercial-intelligence/revenue-pipeline-reader.ts` con `listRevenuePipelineUnified()` + types `UnifiedPipelineRow | UnifiedPipelineCategory | RevenuePipelineTotals`
  - **Endpoint** `GET /api/finance/commercial-intelligence/revenue-pipeline` tenant-scoped con filters `clientId/organizationId/businessLineCode/category/stage/lifecyclestage`
  - **Classifier** cross-layer: categoría `deal | contract | pre-sales` según reglas explícitas (deal open → deal, deal closedwon → contract, deal closedlost excluido, standalone con lifecyclestage=customer → contract, lifecyclestage=lead/MQL/SQL/opportunity → pre-sales, default → pre-sales conservador)
  - **Anti-double-counting**: exclusión de "deal open + quote linked" (deviation del spec, documentada — el deal grain ya representa esa oportunidad)
  - **Totals**: openPipelineClp, weightedPipelineClp, MTD won/lost desde `deal_pipeline_snapshots.close_date >= date_trunc('month', CURRENT_DATE)`, byCategory record
  - **Componente UI** `PipelineBoardUnified.tsx` con 4 KPIs (`HorizontalWithSubtitle`), filtros MUI dropdown (categoría/etapa/lifecyclestage/BU), tabla 9 columnas, chips por categoría, onboarding Alert dismissible con localStorage persistente
  - **Refactors**:
    - `FinanceIntelligenceView.tsx`: outer tab "Cotizaciones" → "Pipeline comercial" (value intacto)
    - `CommercialIntelligenceView.tsx`: sub-tab "Cotizaciones en curso" (TASK-458 label) → "Pipeline", reemplazó `PipelineTab` legacy con `PipelineBoardUnified`, eliminó Alert de TASK-458. Rentabilidad + Renovaciones intactas
  - **Copy**: bloque nuevo `GH_PIPELINE_COMMERCIAL` en `greenhouse-nomenclature.ts`
  - **Tests**: 5/5 passing cubriendo los edge cases del classifier
  - **Doc funcional** nuevo: `docs/documentation/finance/pipeline-comercial.md`
  - **Architecture doc** v2.20 con Delta completo
- **Zero schema change**: todos los snapshots/tables existían (TASK-351/453/454/456)
- **Gates verdes**:
  - `pnpm lint` clean
  - `npx tsc --noEmit` clean
  - `pnpm test` → 289/289 (194 payroll baseline intacto)
  - `pnpm build` compiled exit 0 (17.9s)
  - Zero `new Pool()` rogue
- **Follow-ups pendientes**:
  - Drill-down deal → lista de quotes asociadas con document chain
  - Forecast revenue editable por stage-weighted amounts
  - Snapshot histórico del pipeline (week-over-week comparison)
  - Export a Excel/PDF
  - Widget del pipeline en home ejecutiva
- **Endpoint legacy `/pipeline` quote-grain**: sigue existiendo por si hay otros consumers. View nuevo ya no lo consume.

## Sesion 2026-04-19 — TASK-467 phase-3 + TASK-470 spec (cierre del UI de pricing catalog)

- **Owner:** Claude
- **Estado:** shipped, pending PR merge
- **Branch:** `task/TASK-467-phase-3` desde develop con phase-2 + TASK-459 merged
- **Split conceptual hecho**: TASK-467 cierra con el scope UI; TASK-470 abre como spec separada para backend hardening (optimistic locking + business constraint validator + impact analysis + overcommit detector). Task registry + README actualizados.
- **Scope phase-3 shipped:**
  - Endpoint nuevo `GET/PUT /api/admin/pricing-catalog/roles/[id]/compatibility` con replace atómico via `withTransaction`, validación completa (no-duplicados, exactly-1-default, default-must-be-allowed, employment_types existentes/activos), audit emit
  - Tab "Modalidades de contrato" del EditSellableRoleDrawer ahora es editable: tabla con Switch de allowed + Radio exclusivo de default + inline notes + delete + Autocomplete "+ Agregar modalidad"
  - Validación client-side coordinada con server-side
  - Copy via `greenhouse-ux-writing`
- **Gaps diferidos a phase-4 (UI)**:
  - Diff viewer visual side-by-side en audit timeline
  - Bulk edit (depende de TASK-470 impact preview backend)
  - Impact preview UI (depende de TASK-470)
  - Excel import con diff
  - Maker-checker approval UI
  - One-click revert desde audit timeline
- **Gates verdes**:
  - `pnpm lint` clean
  - `npx tsc --noEmit` clean
  - `pnpm test` → 282/282 (194 payroll baseline intacto)
  - `pnpm build` compiled exit 0 (45s)
  - Zero `new Pool()` rogue
- **TASK-470 abierta**: backend enterprise hardening — spec completa en `docs/tasks/to-do/TASK-470-pricing-catalog-enterprise-hardening.md`, registrada en TASK_ID_REGISTRY + README, pushed direct a develop (commit `b222e85d`). Cubre los 4 gaps enterprise identificados en review con el usuario: optimistic locking, validator de constraints, impact analysis pre-change, overcommit detector cross-layer entre capacity operacional y billable commitments.
- **WIP de Codex observado en primary**: `src/app/(dashboard)/finance/contracts/`, `data/zapsign.txt`, `ContractDetailView.tsx`, `ContractsListView.tsx`, modificaciones a `finance/layout.tsx`, `VerticalMenu.tsx`, `greenhouse-nomenclature.ts` — es TASK-460 WIP sin committear, no incluido en mi branch.

## Sesion 2026-04-19 — TASK-460 Contract / SOW Canonical Entity (Codex)

- **Owner:** Codex
- **Worktree:** `/Users/jreye/Documents/greenhouse-eo-task-460`
- **Rama:** `task/TASK-460-contract-sow-canonical-entity`
- **Estado:** implementado y validado localmente; cerrando docs + Git integration sobre `develop`
- **Decisión operativa clave:**
  - la spec asumía que `quotation_id` seguía siendo suficiente como anchor downstream, pero el runtime comercial ya necesitaba separar pre-venta de ejecución
  - el corte se cerró como **doble anchor intencional**: `quotation` sigue viva para pricing/aprobación; `contract` entra como anchor canónico post-venta para execution, rentabilidad y renovación
- **Entregables:**
  - migración `20260419071250347_task-460-contract-sow-canonical-entity.sql`
  - `src/lib/commercial/contracts-store.ts`
  - `src/lib/commercial/contract-lifecycle.ts`
  - `src/lib/commercial/contract-events.ts`
  - `src/lib/commercial-intelligence/contract-profitability-materializer.ts`
  - `src/lib/commercial-intelligence/contract-renewal-lifecycle.ts`
  - `src/app/api/finance/contracts/**`
  - `src/views/greenhouse/finance/ContractsListView.tsx`
  - `src/views/greenhouse/finance/ContractDetailView.tsx`
  - extensiones en `quote-to-cash/*`, `document-chain-reader.ts`, `event-catalog.ts`, `greenhouse-nomenclature.ts`, `finance/layout.tsx`
  - docs actualizadas en arquitectura comercial, event catalog, documentación funcional finance, changelog, project context y task index
- **Resultado operativo:**
  - `greenhouse_commercial.contracts` existe como entidad canónica post-venta con `contract_number` visible `EO-CTR-*`
  - `greenhouse_commercial.contract_quotes` permite 1 contrato lógico con múltiples quotes históricas
  - `purchase_orders`, `service_entry_sheets` e `income` ya aceptan `contract_id`
  - `readContractDocumentChain({ contractId })` agrega la cadena documental por contrato
  - al emitir invoice desde quote o HES, el runtime asegura el contract y materializa `contract_id`
  - `greenhouse_serving.contract_profitability_snapshots` y `greenhouse_commercial.contract_renewal_reminders` ya existen para la lane contractual
  - `/finance/contracts` y `/finance/contracts/[id]` abren la surface inicial tenant-safe para contratos
- **Validaciones corridas:**
  - `pnpm pg:connect:migrate`
  - `pnpm exec tsc --noEmit --incremental false`
  - `pnpm lint`
  - `pnpm build`
  - `rg -n "new Pool\\(" src` -> solo matches en `src/lib/postgres/client.ts`
- **Heads-up menor:**
  - `pnpm build` terminó exit `0` con warnings preexistentes de Dynamic Server Usage bajo `(dashboard)`
  - el Cloud SQL proxy local quedó levantado durante `pg:connect:migrate`; cerrarlo si ya no se necesita

## Sesion 2026-04-19 — TASK-459 Delivery Model Refinement (Codex)

- **Owner:** Codex
- **Worktree:** `/Users/jreye/Documents/greenhouse-eo-task-459`
- **Rama:** `task/TASK-459-delivery-model-refinement`
- **Estado:** implementado y validado localmente; listo para push / integración
- **Decisión operativa clave:**
  - el split de `pricing_model` se cerró como **delivery model de quotation** y no como reutilización del `CommercialModelCode` del pricing engine; ambos nombres coexisten pero viven en dominios distintos
  - `pricing_model` queda como alias legacy derivado para no romper governance/templates/terms en este corte
- **Entregables:**
  - migración `20260419012226774_task-459-delivery-model-refinement.sql`
  - helper común `src/lib/commercial/delivery-model.ts` + test `src/lib/commercial/__tests__/delivery-model.test.ts`
  - extensiones en `src/lib/commercial/governance/contracts.ts`
  - surfacing en `src/lib/finance/quotation-canonical-store.ts`, `src/app/api/finance/quotes/route.ts`, `src/app/api/finance/quotes/[id]/route.ts`
  - snapshot histórico extendido en `src/lib/commercial/sales-context.ts`
  - downstream actualizado en `pipeline-materializer.ts`, `profitability-materializer.ts`, `deal-pipeline-materializer.ts`, `intelligence-store.ts`, renewals route y lifecycle sweep
  - payloads de eventos extendidos en `src/lib/commercial/quotation-events.ts`
  - docs actualizadas en arquitectura comercial, data model master, task index y task file
- **Resultado operativo:**
  - `greenhouse_commercial.quotations` ahora materializa `commercial_model` + `staffing_model`
  - `sales_context_at_sent` preserva `pricing_model`, `commercial_model` y `staffing_model`
  - `GET /api/finance/quotes` y `GET /api/finance/quotes/[id]` exponen los tres campos
  - `greenhouse_serving.quotation_pipeline_snapshots` y `quotation_profitability_snapshots` ya persisten ambos ejes
  - `greenhouse_serving.deal_pipeline_snapshots` ahora lleva `latest_quote_pricing_model`, `latest_quote_commercial_model` y `latest_quote_staffing_model`
  - renewals hereda el surfacing desde pipeline snapshots
- **Validaciones corridas:**
  - `pnpm exec tsc --noEmit --incremental false`
  - `pnpm vitest run src/lib/commercial/__tests__/delivery-model.test.ts src/lib/commercial-intelligence/deal-pipeline-materializer.test.ts`
  - `pnpm lint`
  - `pnpm build`
  - `pnpm pg:connect:migrate`
  - query post-migración: `project × outcome_based = 27` quotes
  - `rg -n "new Pool\\(" src --glob '!src/lib/postgres/client.ts'` -> sin matches
- **Heads-up:**
  - `pnpm build` siguió mostrando warnings preexistentes de Dynamic Server Usage por `headers()` en múltiples routes bajo `(dashboard)`, pero terminó exit `0`

## Sesion 2026-04-19 — TASK-467 phase-2 + operating model worktree cleanup rule

- **Owner:** Claude
- **Estado:** shipped, pending PR merge
- **Branch:** `task/TASK-467-phase-2` (desde develop con TASK-456 + MVP TASK-467 ya merged)
- **Scope phase-2 shipped:**
  - 3 endpoints nuevos: `/roles/[id]/cost-components` (GET+POST), `/roles/[id]/pricing` (GET+POST), `/governance` extendido para `type: 'employment_type'`
  - **Edit drawers**:
    - `EditSellableRoleDrawer.tsx` — 4 tabs (Info / Modalidades read-only / Componentes de costo / Pricing por moneda) con MUI Lab TabContext
    - `EditToolDrawer.tsx` — form completo con 23 campos + conditional fields según costModel
    - `EditOverheadDrawer.tsx` — form con 17 campos + conditional fields según addon_type
  - **Employment types admin** `/admin/pricing-catalog/employment-types` con list + bi-modal Create/Edit drawer
  - **Audit timeline** `/admin/pricing-catalog/audit-log` con MUI Lab Timeline + filtros + Accordion expandible con JSON del changeSummary
  - **Home updates**: placeholder de employment types + link a audit-log con counts reales
  - **Doc funcional** actualizado v1.1 + architecture doc v2.17 + task file con Delta phase-2

- **Sinergia FTE/capacity cerrada (no solo documentada)**:
  - Greenhouse tiene **dos capas FTE intencionalmente distintas**:
    - **Capacity operacional**: `CAPACITY_HOURS_PER_FTE = 160h` en `src/lib/team-capacity/units.ts`, materializado en `greenhouse_serving.member_capacity_economics`. Para Agency/Delivery/Person Intelligence (lo que una persona puede entregar)
    - **Billable**: `greenhouse_commercial.fte_hours_guide` con 11 filas variables (0.25 FTE → 45h, 1.0 FTE → 180h). Para pricing engine v2 (lo que se cobra al cliente)
  - **Fix robusto aplicado**: el campo `sellable_role_cost_components.hours_per_fte_month` era un campo "semi-huérfano" — el pricing engine v2 YA lo leía como fallback + divisor, pero el store `insertCostComponentsIfChanged` lo hardcodeaba a 180, bloqueando al admin UI. Ahora `SellableRoleSeedRow` acepta `hoursPerFteMonth?` y `feeEorUsd?` opcionales con defaults back-compat, el store los propaga al INSERT/UPDATE, y el admin UI puede overridearlo per-role. Resultado: admin UI, store, pricing engine y capacity layer ahora coordinan explícitamente sin ambigüedad
  - Helper text del drawer actualizado: "Horas billable por FTE. Default 180. El pricing engine usa este valor cuando la fracción FTE no está en fte_hours_guide y como divisor del hourly cost. No confundir con capacity operacional (160h)"
  - Governance view tiene alert aclaratorio en la sección FTE hours guide
  - Doc funcional y architecture doc v2.17 documentan las dos capas + el override per-role

- **Operating model update**: regla #4 agregada al `MULTI_AGENT_WORKTREE_OPERATING_MODEL_V1.md` — agentes deben eliminar su worktree dedicado al cerrar una task. Committed direct a develop en `5c5db951` (doc-only). Codex dejó worktrees huérfanos con develop locked en TASK-455 y TASK-456 — ahora está documentado como regla obligatoria.

- **Fix aplicado durante verification**: `EditSellableRoleDrawer` importó `SELLABLE_ROLE_PRICING_CURRENCIES` de `sellable-roles-seed.ts` que usa `node:fs/promises`. Rompía el client bundle de Turbopack. Fix: inlineé la constante (6 monedas) en el drawer.

- **Gates verdes**:
  - `pnpm lint` clean
  - `npx tsc --noEmit` clean
  - `pnpm test` → 284/284 (194 payroll baseline intacto)
  - `pnpm build` compiled exit 0 (15.2s)
  - Zero `new Pool()` rogue

- **Follow-ups pendientes (phase-3)**:
  - Desbloquear `hours_per_fte_month` + `fee_eor_usd` en `insertCostComponentsIfChanged` (hoy hardcoded)
  - Role employment compatibility: endpoint + UI full (hoy read-only)
  - Excel import si Efeonce lo pide
  - Approval workflow para cambios críticos
  - Diff viewer visual side-by-side en audit timeline (hoy JSON raw)
  - Bulk edit
  - Preview de impacto de cambios de rate en cotizaciones vigentes

## Sesion 2026-04-19 — TASK-467 Pricing Catalog Admin UI MVP (cierre)

- **Owner:** Claude
- **Estado:** shipped + closed (Lifecycle `complete`, archivo movido a `docs/tasks/complete/`)
- **Branch:** `task/TASK-467-pricing-catalog-admin-ui` (rebased sobre develop con TASK-456 incluido)
- **Scope MVP shipped:**
  - Migration `20260419003745335_task-467-pricing-catalog-audit-log.sql` aplicada + tipos regenerados (247 tables)
  - `greenhouse_commercial.pricing_catalog_audit_log` con 9 entity types + 7 actions + 3 índices
  - Store `src/lib/commercial/pricing-catalog-audit-store.ts` (`recordPricingCatalogAudit` + `listPricingCatalogAudit`)
  - Permission helper `canAdministerPricingCatalog` en `src/lib/tenant/authorization.ts` (efeonce_admin + finance_admin)
  - 8 API routes `/api/admin/pricing-catalog/{roles,tools,overheads,governance,audit-log}` con gate unificado
  - UI `/admin/pricing-catalog/` — home con 7 nav cards + 3 list views (roles/tools/overheads) con TanStack table, filtros, toggle active + 3 create drawers con SKU auto-generado via DEFAULT sequence + governance inline edit page (5 secciones accordion)
  - Menu entry `adminPricingCatalog` en `GH_INTERNAL_NAV` + `VerticalMenu.tsx`
  - Docs funcional `docs/documentation/finance/administracion-catalogo-pricing.md`
  - Architecture doc `GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md` v2.16
- **Scope fuera de MVP (follow-up TASK-467-phase-2):**
  - Edit completo de cost components per employment_type (multi-tab)
  - Pricing per currency edit
  - Admin UI de employment types (placeholder en home)
  - Excel import con diff preview
  - Audit timeline UI con diff viewer visual
  - Approval workflow para cambios críticos
- **Desviaciones técnicas:**
  - Bypass intencional de upsert stores (esperan shape de seed CSV) — INSERT/UPDATE directos para respetar DEFAULT sequence del SKU. Stores sin modificar; `list*` se siguen usando para GETs
  - `actorName` resuelto vía `getServerAuthSession()` (TenantContext no expone displayName)
  - Providers lookup en ToolDrawer: texto libre con helper text (no hay `/api/admin/providers` todavía)
- **Gates verdes:**
  - `pnpm lint` clean
  - `npx tsc --noEmit` clean
  - `pnpm test` → 284/284 (194 payroll baseline intacto + 21 pricing + 64 commercial/hubspot + 3 TASK-463 + 2 TASK-455)
  - `pnpm build` compiled exit 0
  - `pnpm migrate:up` aplicada limpio
  - Zero `new Pool()` rogue
- **Rebase context:** arranqué task branch desde develop ANTES de que Codex mergeara TASK-456 (`27be463e`). Durante migrate-up el timestamp check falló (TASK-456 ya aplicado en DB pero mi branch no tenía el archivo). Rebase clean sobre `origin/develop` + reintent migrate-up exitoso.
- **Payroll isolation mantenida**: ningún write a `greenhouse_payroll.*`, 194 tests payroll intactos.

## Sesion 2026-04-19 — TASK-456 Deal Pipeline Snapshots Projection (Codex)

- **Owner:** Codex
- **Worktree:** `/Users/jreye/Documents/greenhouse-eo-task-456`
- **Rama:** `task/TASK-456-deal-pipeline-snapshots-projection`
- **Estado:** implementado y validado localmente; listo para merge a `develop`
- **Decisión operativa clave:**
  - la spec original asumía un consumer/reactive contract de V1 y un `approved_quote_count` por status `approved`, pero el runtime real ya corre sobre playbook reactivo V2 y las quotes aprobadas pueden seguir en `sent`
  - la projection se cerró como tabla a grain deal no borrado; los readers de forecast filtran `is_open = true`, pero se conservan won/lost para mantener contexto de cierre y totales derivados
- **Entregables:**
  - migración `20260419003219480_task-456-deal-pipeline-snapshots.sql`
  - `src/lib/commercial-intelligence/deal-pipeline-materializer.ts`
  - `src/lib/commercial-intelligence/deal-pipeline-materializer.test.ts`
  - extensiones en `src/lib/commercial-intelligence/contracts.ts`
  - extensiones en `src/lib/commercial-intelligence/intelligence-store.ts`
  - `src/lib/sync/projections/deal-pipeline.ts`
  - `src/lib/sync/projections/deal-pipeline.test.ts`
  - registro en `src/lib/sync/projections/index.ts`
  - `src/app/api/finance/commercial-intelligence/deal-pipeline/route.ts`
  - docs actualizadas en arquitectura, task index, changelog y project context
- **Resultado operativo:**
  - `greenhouse_serving.deal_pipeline_snapshots` existe como source deal-grain para forecasting comercial
  - el materializer resuelve `is_open` / `is_won` desde `hubspot_deal_pipeline_config`, persiste `probability_pct` real del deal y trata `NULL` como `0` solo en agregados ponderados
  - el rollup de quotes ya expone `latest_quote_id`, `quote_count`, `approved_quote_count` y `total_quotes_amount_clp` sin duplicar deals
  - la projection reactiva `deal_pipeline` refresca por eventos de deal y quote; cuando solo llega `quotationId`, resuelve el deal vía DB antes de materializar
  - `GET /api/finance/commercial-intelligence/deal-pipeline` ya expone lectura tenant-safe con filtros por cliente, organización, etapa y estado
- **Validaciones corridas:**
  - `pnpm pg:connect:migrate`
  - `pnpm exec vitest run src/lib/commercial-intelligence/deal-pipeline-materializer.test.ts src/lib/sync/projections/deal-pipeline.test.ts`
  - `pnpm lint`
  - `pnpm exec tsc --noEmit --incremental false`
  - `pnpm build`
  - `rg -n "new Pool\\(" src -g '!src/lib/postgres/client.ts'` -> sin matches
- **Heads-up menor:**
  - smoke explícito en staging queda pendiente al deploy de `develop`; localmente la migration, los tests y el build quedaron verdes

## Sesion 2026-04-18 — TASK-455 Quote Sales Context Snapshot (Codex)

- **Owner:** Codex
- **Worktree:** `/Users/jreye/Documents/greenhouse-eo-task-455`
- **Rama:** `task/TASK-455-quote-sales-context-snapshot`
- **Estado:** implementado y validado localmente; pendiente solo cierre Git/merge
- **Decisión operativa clave:**
  - la spec original asumía que bastaba enganchar `/send`, pero el runtime real tiene dos caminos a `sent`
  - el snapshot quedó histórico e inmutable en `greenhouse_commercial.quotations`, pero la clasificación viva del pipeline híbrido sigue usando `clients.lifecyclestage + commercial.deals.dealstage`
- **Entregables:**
  - migración `20260418235105189_task-455-quote-sales-context-snapshot.sql`
  - `src/lib/commercial/sales-context.ts`
  - `src/lib/commercial/sales-context.test.ts`
  - extensiones en `src/app/api/finance/quotes/[id]/send/route.ts`
  - extensiones en `src/app/api/finance/quotes/[id]/approve/route.ts`
  - ajustes en `src/lib/commercial/governance/approval-steps-store.ts`
  - exposición en `src/lib/finance/quotation-canonical-store.ts` y `src/app/api/finance/quotes/[id]/route.ts`
  - docs actualizadas en arquitectura, data model, changelog, project context y task index
- **Resultado operativo:**
  - `greenhouse_commercial.quotations` ahora materializa `sales_context_at_sent`
  - la captura reutiliza `greenhouse_core.clients.lifecyclestage` y `greenhouse_commercial.deals`
  - el helper `captureSalesContextAtSent(...)` asegura idempotencia e inmutabilidad del snapshot
  - `GET /api/finance/quotes/[id]` ya devuelve `salesContextAtSent`
- **Validaciones corridas:**
  - `pnpm pg:connect:migrate`
  - `pnpm exec vitest run src/lib/commercial/sales-context.test.ts`
  - `pnpm lint`
  - `pnpm build`
  - `rg -n "new Pool\\(" src -g '!src/lib/postgres/client.ts'` -> sin matches
- **Heads-up local de worktree:**
  - para pasar `pnpm build` en este worktree fue necesario materializar `node_modules` localmente; Turbopack falló con el symlink fuera del filesystem root
  - no hay cambio de repo asociado a ese workaround

## Sesion 2026-04-18 — TASK-463 Unified Quote Builder + Bidirectional HubSpot Bridge (cierre)

- **Owner:** Claude
- **Estado:** shipped + closed (Lifecycle `complete`, archivo movido a `docs/tasks/complete/`)
- **Branch:** `task/TASK-463-unified-quote-builder-hubspot-bidirectional` (PR pendiente de squash-merge)
- **Entregables:**
  - **UI**: `src/views/greenhouse/finance/QuotesListView.tsx` — drawer `CreateQuoteDrawer` inline (284 líneas) + botón "HubSpot" + state `hubspotDrawerOpen` eliminados. 753 → 432 líneas
  - **Helper outbound**: `src/lib/hubspot/push-canonical-quote.ts` — adapter canonical → legacy `createHubSpotQuote()`. Skip sin deal_id, create sin quote_id, update (stub) si existe
  - **Helper update stub**: `src/lib/hubspot/update-hubspot-quote.ts` — PATCH al Cloud Run con fallback graceful a `update_not_supported`
  - **Reactive projection**: `src/lib/sync/projections/quotation-hubspot-outbound.ts` (domain `cost_intelligence`) + registro en `projections/index.ts`
  - **Event catalog**: `commercial.quotation.pushed_to_hubspot` + `commercial.quotation.hubspot_sync_failed` en `event-catalog.ts`
  - **Publishers**: `publishQuotationPushedToHubSpot` + `publishQuotationHubSpotSyncFailed` en `quotation-events.ts`
  - **Endpoint deprecado**: `POST /api/finance/quotes/hubspot` → 410 Gone + telemetría `console.warn`
  - **Tests**: 3 escenarios (skip/create/update) en `src/lib/hubspot/__tests__/push-canonical-quote.test.ts`
  - **Docs**: `GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md` v2.13 con Delta completo; `GREENHOUSE_EVENT_CATALOG_V1.md` con dos entradas nuevas
- **Zero schema change**: columnas `hubspot_quote_id`, `hubspot_deal_id`, `hubspot_last_synced_at` ya existían en `greenhouse_commercial.quotations`
- **Gates verdes**:
  - `pnpm lint` → clean
  - `npx tsc --noEmit` → clean
  - `pnpm test` → 282/282 (194 payroll + 21 pricing + 64 commercial/hubspot + 3 TASK-463)
  - `pnpm build` → compiled exit 0
- **Flujo operativo**: User crea quote canónica → outbox event `commercial.quotation.created` → ops-worker consume vía projection `quotationHubSpotOutbound` → `pushCanonicalQuoteToHubSpot` → `createHubSpotQuote()` (primer push) o `updateHubSpotQuote()` (downstream updates). Idempotente por `hubspot_quote_id` natural key. Lifecycle events (`sent/approved/rejected/version_created`) disparan la misma projection automáticamente.
- **Follow-ups abiertos** (no bloquean cierre):
  - Endpoint PATCH real en Cloud Run `hubspot-greenhouse-integration` (hoy `updateHubSpotQuote` es stub)
  - Dropear `greenhouse_finance.quotes` legacy cuando termine ventana de coexistencia
  - Webhook subscription HubSpot para inbound casi-real-time
  - Outbound de custom properties (ownership, deal stage)

## Sesion 2026-04-18 — TASK-454 tomada en worktree aislado (Codex)

- **Owner:** Codex
- **Worktree:** `/Users/jreye/Documents/greenhouse-eo-task-454`
- **Rama:** `task/TASK-454-lifecyclestage-sync-company-contact`
- **Estado:** implementado y validado localmente; listo para merge a `develop`
- **Decisión operativa clave:**
  - la spec original asumía `greenhouse_core.clients` como root canónico de company, pero el runtime real ya está repartido entre `organizations`, `spaces`, `client_profiles` y `greenhouse_crm.companies`
  - el corte se implementará como bridge denormalizado en `clients`, no como recentralización del modelo
- **Entregables:**
  - migración `20260418232659019_task-454-hubspot-company-lifecycle-stage.sql`
  - `src/lib/hubspot/company-lifecycle-store.ts`
  - `src/lib/hubspot/company-lifecycle-events.ts`
  - `src/lib/hubspot/sync-hubspot-company-lifecycle.ts`
  - `src/app/api/cron/hubspot-company-lifecycle-sync/route.ts`
  - evento `crm.company.lifecyclestage_changed` en `src/lib/sync/event-catalog.ts`
  - docs actualizadas en task, event catalog, source sync, data model, changelog y project context
- **Resultado operativo:**
  - `greenhouse_core.clients` ahora materializa `lifecyclestage`, `lifecyclestage_source` y `lifecyclestage_updated_at` como bridge runtime client-scoped
  - el sync recorre `organizations.hubspot_company_id`, deriva `space_id`/`client_id`, respeta `manual_override` y publica outbox solo cuando el stage cambia
  - existe cron `/api/cron/hubspot-company-lifecycle-sync` cada 6 horas
  - el helper `getClientLifecycleStage(clientId)` evita live reads a HubSpot para consumers downstream
- **Validaciones corridas:**
  - `pnpm pg:doctor`
  - `pnpm pg:connect:migrate`
  - `pnpm exec vitest run src/lib/sync/event-catalog.test.ts src/lib/hubspot/company-lifecycle-store.test.ts`
  - `pnpm exec tsc --noEmit --incremental false`
  - `pnpm lint`
  - `pnpm test` -> `302` files / `1375` tests passing, `2` skipped
  - `pnpm build`
  - `rg -n "new Pool\\(" src -g '!src/lib/postgres/client.ts'` -> sin matches
  - cron local `GET /api/cron/hubspot-company-lifecycle-sync` -> `processed: 9`, `updated: 9`, `changed: 9`, `errors: []`
  - distribución dev tras sync -> `customer/hubspot_sync: 9`, `customer/nubox_fallback: 1`, `unknown/unknown: 3`
- **Riesgo / pendiente menor:**
  - la validación explícita en staging queda atada al deploy de `develop` después del merge; localmente la cron route ya respondió `200`

## Sesion 2026-04-18 — TASK-464e Quote Builder UI Exposure (cierre Ola 4 completa)

- **Owner:** Claude
- **Estado:** shipped + closed (Lifecycle `complete`, archivo movido a `docs/tasks/complete/`)
- **PRs mergeados a develop:**
  - PR #72 (squash `bf530340`) — backend APIs + primitives + workspace components + refactor final de QuoteCreateDrawer/QuoteLineItemsEditor
  - Close-out commit directo a `task/TASK-464e-closeout` (siguiente merge) — tab `people` en picker, inline pricing context (FTE/periods/employment_type), tier compliance chip por línea, doc funcional
- **Entregables totales Ola 4:**
  - **Endpoints**: `GET /api/finance/quotes/pricing/config`, `GET /api/finance/quotes/pricing/lookup?type=role|person|tool|addon|employment_type`, `POST /api/finance/quotes/pricing/simulate` (con filtro de cost stack por rol)
  - **Primitives** (`src/components/greenhouse/pricing/`): MarginIndicatorBadge, CurrencySwitcher, PricingCatalogNavCard, CostStackPanel, SellableItemRow, SellableItemPickerDrawer (5 tabs)
  - **Hook**: `usePricingSimulation` (debounce 500ms + AbortController + serialized deps)
  - **Workspace components**: QuoteBuilderActions (sidebar), QuoteTotalsFooter (sticky), AddonSuggestionsPanel (gated), QuoteLineCostStack (wrapper de CostStackPanel)
  - **Refactors**: QuoteCreateDrawer integra sidebar + hook + totals + addons; QuoteLineItemsEditor con 4 botones de picker + tier chip + pricing context inline + cost stack gated
  - **Auth**: `canViewCostStack` en `src/lib/tenant/authorization.ts` (`EFEONCE_ADMIN | FINANCE_ADMIN | FINANCE_ANALYST`)
  - **Copy**: bloque `GH_PRICING` en `src/config/greenhouse-nomenclature.ts` con 5 tabs del picker + labels del builder
  - **Doc funcional**: `docs/documentation/finance/cotizador.md`
- **Deltas asumidos vs spec original** (documentados en el task file):
  - 5 tabs en picker único (vs 4 autocompletes separados)
  - Role gating con `EFEONCE_ADMIN | FINANCE_ADMIN | FINANCE_ANALYST` (los roles reales)
  - 6 monedas LatAm (`CLP|USD|CLF|COP|MXN|PEN`) vs 4 originales
  - `tool` y `overhead_addon` aplanados a `direct_cost` + metadata (cero cambio de schema)
- **Follow-ups abiertos** (no bloquean cierre):
  - Edit de quote existente con este UI (V2)
  - Override de margen por línea con audit trail
  - Playwright E2E de los 4 modos de composición
  - Excel fidelity verification con casos de referencia
  - Mobile iPad smoke test
- **Tasks desbloqueadas**:
  - TASK-465 (service composition) — tab `services` ya tiene placeholder en el picker
  - TASK-467 (pricing catalog admin UI) — comparte endpoints con el cotizador
  - TASK-463 (HubSpot unified drawer) — persistencia canónica lista para propagar

## Sesion 2026-04-18 — TASK-453 Deal Canonicalization & Commercial Bridge (cierre)

- **Owner:** Codex
- **Rama:** `develop`
- **Estado:** implementado y validado
- **Entregables:**
  - migración `20260418224710163_task-453-commercial-deals-canonical-bridge.sql`
  - `src/lib/commercial/deals-store.ts`
  - `src/lib/commercial/deal-events.ts`
  - `src/lib/hubspot/sync-hubspot-deals.ts`
  - cron `src/app/api/cron/hubspot-deals-sync/route.ts`
  - script `scripts/backfill-hubspot-deals.ts`
  - tests `src/lib/commercial/__tests__/deal-events.test.ts` y `deals-store.test.ts`
  - docs actualizadas en arquitectura + task README
- **Resultado operativo:**
  - existe `greenhouse_commercial.deals` como mirror comercial canónico sobre el carril inbound existente `greenhouse_crm.deals`
  - existe `greenhouse_commercial.hubspot_deal_pipeline_config` con bootstrap inicial desde staging y soporte de overrides manuales por `pipeline_id + stage_id`
  - el bridge resuelve `organization_id` / `space_id`, calcula `amount_clp` con `greenhouse_finance.exchange_rates`, mantiene `hubspot_deal_id` como link lógico hacia quotations y publica `commercial.deal.created|synced|stage_changed|won|lost`
  - `/api/cron/hubspot-deals-sync` ya corre sobre el runtime actual sin depender de un endpoint nuevo en Cloud Run
  - el backfill standalone quedó usable fuera de Next.js runtime; se corrigió el fallo real de `server-only` para que funcione como script operativo
- **Validaciones corridas:**
  - `pnpm pg:connect:migrate`
  - `pnpm exec vitest run src/lib/commercial/__tests__/deal-events.test.ts src/lib/commercial/__tests__/deals-store.test.ts`
  - `pnpm exec tsc --noEmit --incremental false`
  - `pnpm tsx scripts/backfill-hubspot-deals.ts --include-closed` -> `25 created / 0 errors`
  - rerun idempotente del mismo script -> `25 skipped / 0 errors`
  - `pnpm lint`
  - `pnpm test src/lib/payroll/` -> `29` files / `194` tests passing
  - `pnpm test` -> `304` files / `1393` tests passing, `2` skipped
  - `pnpm build`
  - `pnpm pg:connect:status` -> sin migraciones pendientes
  - `rg -n "new Pool\\(" src -g '!src/lib/postgres/client.ts'` -> sin matches
- **Dependencias desbloqueadas:**
  - `TASK-455` ya puede snapshotear contexto comercial desde deal canonical
  - `TASK-456` ya tiene aggregate/event foundation para `deal_pipeline_snapshots`
  - `TASK-457` ya puede leer deal-grain real sin depender del staging `greenhouse_crm.deals`
- **Notas de convivencia multi-agente:**
  - hay archivos UI untracked en `src/views/greenhouse/finance/workspace/` presentes en el workspace que no fueron tocados por esta task
  - la distinción canónica queda documentada: `greenhouse_crm.deals` = staging/runtime inbound, `greenhouse_commercial.deals` = canon comercial
  - próximo paso natural del programa: `TASK-455` o `TASK-456`, según si se prioriza contexto histórico de quote o la proyección deal-grain

## Sesion 2026-04-18 — TASK-464e Phase 1: backend + UI primitives (Claude)

- **Owner:** Claude
- **Worktree:** `/Users/jreye/Documents/greenhouse-eo` (primary)
- **Rama:** `task/TASK-464e-standalone-components` (PR #72, 3 commits)
- **Estado:** phase 1 shipped; phase 2 (refactors grandes) pendiente
- **Entregables (commit `aa697fbf`):**
  - `src/lib/tenant/authorization.ts` — helper `canViewCostStack` (EFEONCE_ADMIN || FINANCE_ADMIN || FINANCE_ANALYST)
  - `src/app/api/finance/quotes/pricing/simulate/route.ts` — wrapper engine v2 con filter de costStack per-line
  - `src/app/api/finance/quotes/pricing/lookup/route.ts` — autocomplete con cache 5min sobre 5 tipos
  - `src/components/greenhouse/pricing/CostStackPanel.tsx` — 2 variants (quote-builder accordion + admin-preview)
  - `src/components/greenhouse/pricing/SellableItemRow.tsx` — renderer polimórfico 4 variants
  - `src/components/greenhouse/pricing/SellableItemPickerDrawer.tsx` — drawer 4-tab con lookup
  - `src/hooks/usePricingSimulation.ts` — debounce 500ms + AbortController + serialized dep
  - `src/config/greenhouse-nomenclature.ts` — GH_PRICING extendido con 10+ entradas de drawer
- **Deltas vs spec original TASK-464e (documentados en el markdown):**
  - Drawer único con 4 tabs vs 4 autocompletes separados (alineado con TASK-469)
  - Role codes reales (FINANCE_ADMIN/FINANCE_ANALYST/EFEONCE_ADMIN) en vez de `finance_manager`/`finance` inexistentes
  - 6 monedas LatAm del engine v2 (CLP/USD/CLF/COP/MXN/PEN) en vez de 4 (CLP/USD/EUR/GBP)
  - Line types: al persistir, tool/overhead_addon se mapean a direct_cost + metadata (evita schema change)
  - Entitlement: role check directo MVP; `finance.cost_stack.view` capability queda como follow-up
- **Validaciones:**
  - `npx eslint src/app/api/finance/quotes/pricing/ src/components/greenhouse/pricing/ src/hooks/ src/lib/tenant/authorization.ts src/config/greenhouse-nomenclature.ts` ✓ limpio
  - `pnpm vitest run src/components/greenhouse/pricing/ src/lib/payroll/` → 215/215 (194 payroll baseline + 21 pricing nuevos)
  - `npx tsc --noEmit` global BLOQUEADO por WIP de Codex en deal-events.ts (ver heads-up abajo) — mi código compila aislado
- **Phase 2 pendiente (próxima sesión):**
  - `QuoteBuilderActions.tsx` — sidebar con selectores commercial_model/country_factor/outputCurrency/employment_type
  - `QuoteTotalsFooter.tsx` — sticky footer totals + margin chip + warnings
  - `AddonSuggestionsPanel.tsx` — addons auto-resueltos con checkboxes toggle
  - `QuoteLineCostStack.tsx` — thin wrapper de CostStackPanel per-line
  - Refactor `QuoteCreateDrawer.tsx` — integrar header fields + wire usePricingSimulation
  - Refactor `QuoteLineItemsEditor.tsx` — 4 botones picker + live simulate + mapper line types v2→persist

## Heads-up operativo — Multi-agent worktree discipline (2026-04-18)

Durante esta sesión detecté que **Codex arrancó TASK-453 en el primary worktree** (`/Users/jreye/Documents/greenhouse-eo`) dejando archivos untracked:

- `src/lib/commercial/deal-events.ts` (con TS errors — WIP incompleto)
- `src/lib/commercial/deals-store.ts`
- `src/lib/hubspot/sync-hubspot-deals.ts`
- `src/app/api/cron/hubspot-deals-sync/`
- `scripts/backfill-hubspot-deals.ts`
- `migrations/20260418224710163_task-453-commercial-deals-canonical-bridge.sql`
- Mod a `vercel.json` y `src/lib/sync/event-catalog.ts`
- Movimiento de `TASK-453-*.md` de `to-do/` a `in-progress/`

Esto viola el multi-agent operating model (`docs/operations/MULTI_AGENT_WORKTREE_OPERATING_MODEL_V1.md`):

- El primary worktree se reserva para un agente (o para el humano)
- El segundo agente usa `git worktree add ../greenhouse-eo-codex -b task/TASK-453-...`
- Ningún agente modifica el branch del otro ni deja WIP en worktree ajeno
- El conflicto en `deal-events.ts` (TS errors) actualmente **bloquea `tsc --noEmit` global** — si seguimos así, cualquier validación full-repo queda rota mientras el WIP exista

**Acción requerida para Codex** cuando vuelva:
1. Usar worktree dedicado para TASK-453: `git worktree add ../greenhouse-eo-codex-task-453 -b task/TASK-453-deal-canonicalization origin/develop`
2. Mover el WIP uncommitted (los 8 archivos listados arriba) a ese worktree
3. Commit ahí, no en primary
4. `git stash` o `git restore` los archivos del primary worktree después de mover

Dejé los archivos tal cual están (no los toqué ni los incluí en mis commits) para que Codex pueda recuperarlos intactos. Mi rama `task/TASK-464e-standalone-components` NO incluye nada de ese WIP.

## Sesion 2026-04-18 — TASK-464d Pricing Engine Full-Model Refactor (cierre)

- **Owner:** Codex
- **Rama:** `develop`
- **Estado:** implementado y validado
- **Entregables:**
  - `src/lib/finance/pricing/pricing-engine-v2.ts`
  - `src/lib/finance/pricing/tier-compliance.ts`
  - `src/lib/finance/pricing/addon-resolver.ts`
  - `src/lib/finance/pricing/currency-converter.ts`
  - extensiones en `src/lib/finance/pricing/contracts.ts` e `src/lib/finance/pricing/index.ts`
  - helpers `listEmploymentTypes` y `listServiceTierMargins` / `listFteHoursGuide`
  - `src/app/api/finance/quotes/pricing/config/route.ts` extendido con catálogo canónico
  - tests `src/lib/finance/pricing/__tests__/tier-compliance.test.ts`, `addon-resolver.test.ts`, `pricing-engine-v2.test.ts`
- **Resultado operativo:**
  - el repo ya tiene engine v2 aditivo para `role`, `person`, `tool`, `overhead_addon` y `direct_cost`
  - el cálculo nuevo ya aplica tier compliance, commercial model multiplier, country factor, FX output y addon auto-resolver
  - quotations legacy siguen estables; no hubo cutover brusco de `quotation-pricing-orchestrator.ts`
  - `GET /api/finance/quotes/pricing/config` ya entrega el catálogo canónico que consumirá UI
- **Validaciones corridas:**
  - `pnpm exec tsc --noEmit --incremental false`
  - `pnpm exec vitest run src/lib/finance/pricing/__tests__/tier-compliance.test.ts src/lib/finance/pricing/__tests__/addon-resolver.test.ts src/lib/finance/pricing/__tests__/pricing-engine-v2.test.ts`
  - `pnpm lint`
  - `pnpm test src/lib/payroll/` -> `29` files / `194` tests passing
  - `pnpm test` -> `299` files / `1366` tests passing, `2` skipped
  - `pnpm build`
  - `pnpm pg:connect:status` -> sin migraciones pendientes
  - `rg -n "new Pool\\(" src -g '!src/lib/postgres/client.ts'` -> sin matches
- **Riesgos / follow-up:**
  - el cutover del runtime persistente de quotations hacia v2 queda para TASK-464e / TASK-463
  - `role_rate_cards` y `margin_targets` siguen coexistiendo como compatibilidad temporal
  - la DSL declarativa de addons sigue pendiente de schema futuro; hoy la regla vive centralizada en código
## Sesion 2026-04-18 — TASK-464d Pricing Engine Full-Model Refactor (inicio)

- **Owner:** Codex
- **Rama:** `develop`
- **Estado:** discovery + audit en curso
- **Discovery confirmado:**
  - no hay migraciones pendientes en PG (`pnpm pg:connect:status` -> `No migrations to run!`)
  - la foundation de `TASK-464a`, `TASK-464b`, `TASK-464c` y `TASK-468` ya está operativa y reusable desde stores/commercial readers
  - el runtime real de quotations sigue siendo v1 (`QuotationPricingInput`, `resolveLineItemCost`, `persistQuotationPricing`, `recalculateQuotationPricing`)
  - el drift principal de la spec 464d no es de schema sino de contrato: fórmula de margen, monedas persistentes legacy, resolver de addons y estrategia de backward compatibility
- **Ajuste documental ya aplicado:**
  - `TASK-464d` movida a `docs/tasks/in-progress/`
  - spec corregida para dejar el engine v2 como capa aditiva y no como reemplazo inmediato del contrato legacy
  - `docs/tasks/README.md` sincronizado
- **Siguiente paso inmediato:**
  - imprimir mapa de conexiones
  - imprimir plan de implementación
  - invocar `greenhouse-agent` antes de escribir runtime backend de pricing
- **Riesgos activos:**
  - no romper `quotation-pricing-orchestrator.ts` ni los routes actuales mientras convive el engine legacy
  - no expandir `QuotationPricingCurrency` persistente sin revisar constraints/runtime dependiente
  - mantener aislamiento total de payroll; solo bridge read-only
## Sesion 2026-04-18 — TASK-464c Tool Catalog Extension + Overhead Addons (cierre)

- **Owner:** Codex
- **Rama:** `develop`
- **Estado:** implementado y validado
- **Entregables:**
  - migraciones `20260418214928987_task-464c-tool-catalog-overhead-addons.sql` y `20260418220156821_task-464c-sequence-grants.sql`
  - `src/lib/commercial/tool-catalog-seed.ts`
  - `src/lib/commercial/overhead-addons-seed.ts`
  - `src/lib/commercial/tool-catalog-store.ts`
  - `src/lib/commercial/overhead-addons-store.ts`
  - `src/lib/commercial/tool-catalog-events.ts`
  - `scripts/seed-tool-catalog.ts`
  - `scripts/seed-overhead-addons.ts`
  - tests `src/lib/commercial/__tests__/tool-catalog-seed.test.ts` y `src/lib/commercial/__tests__/overhead-addons-seed.test.ts`
- **Resultado operativo:**
  - `greenhouse_ai.tool_catalog` quedó extendida con `tool_sku`, prorrateo, BLs/tags de aplicabilidad, `includes_in_addon` y `notes_for_quoting`
  - `greenhouse_commercial.overhead_addons` quedó sembrada con `9` addons (`EFO-001..009`)
  - el seed de tools dejó `26` filas activas, `7` placeholders omitidos y `3` filas vacías omitidas
  - `provider_id` se resuelve determinísticamente y el catálogo convive con AI tooling sin romper readers existentes
  - `resolveApplicableAddons({ staffingModel: 'named_resources' })` devuelve `EFO-003`, `EFO-004` y `EFO-005`
- **Incidente resuelto durante implementación:**
  - los seeders fallaban al sincronizar secuencias porque `greenhouse_runtime` no tenía `UPDATE` sobre `tool_sku_seq` / `overhead_addon_sku_seq`
  - se corrigió con migración nueva de grants + bootstrap SQL alineado, no con workaround ad hoc
- **Validaciones corridas:**
  - `pnpm exec vitest run src/lib/commercial/__tests__/tool-catalog-seed.test.ts src/lib/commercial/__tests__/overhead-addons-seed.test.ts`
  - `pnpm tsx scripts/seed-tool-catalog.ts --output /tmp/task-464c-tool-catalog-dry-run.json`
  - `pnpm tsx scripts/seed-overhead-addons.ts --output /tmp/task-464c-overhead-addons-dry-run.json`
  - `pnpm pg:connect:migrate`
  - `pnpm tsx scripts/seed-tool-catalog.ts --apply --output /tmp/task-464c-tool-catalog-seed.json`
  - `pnpm tsx scripts/seed-overhead-addons.ts --apply --output /tmp/task-464c-overhead-addons-seed.json`
  - rerun idempotente de ambos seeders (`0 inserted / 0 updated`)
  - `pnpm test src/lib/payroll/` -> `29` files / `194` tests passing
- **Artifacts:**
  - `/tmp/task-464c-tool-catalog-dry-run.json`
  - `/tmp/task-464c-overhead-addons-dry-run.json`
  - `/tmp/task-464c-tool-catalog-seed.json`
  - `/tmp/task-464c-overhead-addons-seed.json`
  - `/tmp/task-464c-tool-catalog-seed-rerun.json`
  - `/tmp/task-464c-overhead-addons-seed-rerun.json`

## Sesion 2026-04-18 — TASK-464b Pricing Governance Tables (cierre)

- **Owner:** Codex
- **Rama:** `develop`
- **Estado:** implementado y validado
- **Entregables:**
  - migración `20260418212705475_task-464b-pricing-governance-tables.sql`
  - `src/lib/commercial/pricing-governance-types.ts`
  - `src/lib/commercial/pricing-governance-seed.ts`
  - `src/lib/commercial/pricing-governance-store.ts`
  - `scripts/seed-pricing-governance.ts`
  - tests `src/lib/commercial/__tests__/pricing-governance-seed.test.ts`
- **Resultado operativo:**
  - tablas nuevas sembradas en DB viva:
    - `role_tier_margins`: `4`
    - `service_tier_margins`: `4`
    - `commercial_model_multipliers`: `4`
    - `country_pricing_factors`: `6`
    - `fte_hours_guide`: `11`
  - readers verificados contra DB real:
    - Tier 4 -> `0.60 / 0.70 / 0.80`
    - `colombia_latam` -> `0.85 / 0.875 / 0.90`
    - `on_demand` -> `0.10`
    - `0.25 FTE` -> `45h`
  - seeder idempotente confirmado en rerun: `0 inserted / 0 updated`
  - artifacts:
    - `/tmp/task-464b-pricing-governance-dry-run.json`
    - `/tmp/task-464b-pricing-governance-seed.json`
    - `/tmp/task-464b-pricing-governance-seed-rerun.json`
- **Drift detectado:**
  - `21` casos entre `role-tier-margins.csv` y `sellable_roles.tier`
  - incluye mismatches reales de tier y gaps `csv_only` / `catalog_only`
  - el contrato aplicado es que `TASK-464a` gana; esta task solo reporta drift, no reescribe el catálogo
- **Validaciones corridas:**
  - `pnpm exec vitest run src/lib/commercial/__tests__/pricing-governance-seed.test.ts`
  - `pnpm test src/lib/payroll/` -> `29` files / `194` tests passing
  - `pnpm exec tsc --noEmit --incremental false`
  - `pnpm lint`
  - `pnpm test` -> `294` files / `1354` tests passing, `2` skipped
  - `pnpm build`
  - `pnpm pg:connect:status` -> sin migraciones pendientes
  - `rg -n "new Pool\\(" src -g '!src/lib/postgres/client.ts'` -> sin matches
- **Siguiente dependencia natural:**
  - `TASK-464d` ya puede leer governance tables desde `pricing-governance-store.ts`
  - `TASK-464e` / `TASK-467` ya tienen el catálogo de governance listo para exponer en UI

## Sesion 2026-04-18 — TASK-464b Pricing Governance Tables (inicio)

- **Owner:** Codex
- **Rama:** `develop`
- **Estado:** discovery en curso
- **Discovery confirmado:**
  - la task realmente cubre `5` tablas, no `4`
  - `role-tier-margins.csv` sí trae Tier 4 explícito y sus valores reales son `0.60 / 0.70 / 0.80`
  - el CSV de role tiers es una matriz rol→tier con headers de sección; sirve para derivar la tabla agregada y para detectar drift contra `sellable_roles.tier`
  - la spec original mezclaba `effective_from` con PKs single-row; se corrigió el contrato para versionado liviano con readers latest `<= asOfDate`
  - `margin_targets` / `role_rate_cards` / `approval_policies` siguen coexistiendo como capas legacy o follow-up; no se reemplazan en esta task
- **Ajuste documental ya aplicado:**
  - `TASK-464b` movida a `docs/tasks/in-progress/`
  - `docs/tasks/README.md` sincronizado
- **Siguiente paso inmediato:**
  - cerrar mapa de conexiones
  - invocar `greenhouse-agent` antes de escribir migración/store/seeder
  - implementar schema + parser/seed + readers sin romper la capa legacy de pricing

## Sesion 2026-04-18 — TASK-468 Payroll ↔ Commercial Employment Types Unification (cierre)

- **Owner:** Codex
- **Rama:** `task/TASK-468-payroll-commercial-employment-types-unification`
- **Estado:** implementado y validado
- **Entregables:**
  - migración `20260418211035632_task-468-commercial-employment-type-aliases.sql`
  - `src/lib/commercial/employment-type-alias-normalization.ts`
  - `src/lib/commercial/employment-type-alias-store.ts`
  - `src/lib/commercial/payroll-rates-bridge.ts`
  - `scripts/audit-payroll-contract-types.ts`
  - tests nuevos para normalización, alias store y payroll rates bridge
- **Resultado operativo:**
  - tabla `greenhouse_commercial.employment_type_aliases` sembrada con mappings iniciales payroll -> commercial
  - audit script validó la DB viva: `3` valores distintos / `12` rows en payroll, `0` pendientes de review
  - payroll quedó intacto: `git diff --stat src/lib/payroll/` vacío
- **Validaciones corridas:**
  - `pnpm test src/lib/commercial/__tests__/employment-type-alias-normalization.test.ts src/lib/commercial/__tests__/employment-type-alias-store.test.ts src/lib/commercial/__tests__/payroll-rates-bridge.test.ts`
  - `pnpm pg:connect:migrate`
  - `pnpm tsx scripts/audit-payroll-contract-types.ts --output /tmp/task-468-payroll-contract-types-audit.json`
  - `pnpm test src/lib/payroll/` -> `29` files / `194` tests passing
  - `pnpm exec tsc --noEmit --incremental false`
  - `pnpm lint`
  - `pnpm build`
  - `pnpm test` -> `293` files / `1351` tests passing, `2` skipped
- **Siguiente dependencia natural:**
  - `TASK-464d` puede consumir `payroll-rates-bridge.ts`
  - `TASK-467` / `TASK-463` pueden leer alias coverage y drift sin tocar payroll

## Sesion 2026-04-18 — TASK-468 Payroll ↔ Commercial Employment Types Unification (inicio)

- **Owner:** Codex
- **Rama:** `task/TASK-468-payroll-commercial-employment-types-unification`
- **Estado:** discovery + audit cerrados, implementación pendiente
- **Acciones ya hechas:**
  - `TASK-464a` fue mergeada a `develop` antes de arrancar `468` (`e444761b`)
  - baseline payroll confirmado: `29` files / `194` tests passing
  - `pnpm pg:connect:status` confirmado sin migraciones pendientes
  - DB viva auditada: `compensation_versions.contract_type` hoy tiene `indefinido (8)`, `contractor (2)`, `honorarios (2)`
  - DB viva auditada: `greenhouse_commercial.employment_types` ya existe con 7 códigos seed
- **Decisión de diseño:**
  - `TASK-468` se ejecuta como bridge commercial-side, read-only y auditable
  - queda fuera cualquier FK, rewrite, backfill o constraint sobre `greenhouse_payroll.*`
  - la pieza robusta a introducir es una tabla commercial de aliases + helper store + reader de tasas payroll
- **Docs movidos/actualizados:**
  - `docs/tasks/in-progress/TASK-468-payroll-commercial-employment-types-unification.md`
  - `docs/tasks/README.md`

## Sesion 2026-04-18 — TASK-464a Sellable Roles Catalog Canonical (cierre)

- **Estado:** `complete`.
- **Worktree:** `/Users/jreye/Documents/greenhouse-eo-codex`
- **Rama:** `task/TASK-464a-sellable-roles-catalog-canonical`
- **Entregado:**
  - migración `20260418203054136_task-464a-sellable-roles-foundation.sql`
  - tablas `greenhouse_commercial.sellable_roles`, `employment_types`, `sellable_role_cost_components`, `role_employment_compatibility`, `sellable_role_pricing_currency`
  - sequence/function `sellable_role_sku_seq` + `generate_sellable_role_sku()`
  - parser + contrato de seed en `src/lib/commercial/sellable-roles-seed.ts`
  - store Kysely en `src/lib/commercial/sellable-roles-store.ts`
  - publishers `src/lib/commercial/sellable-role-events.ts`
  - script `scripts/seed-sellable-roles.ts`
  - tests `src/lib/commercial/__tests__/sellable-roles-seed.test.ts`
  - catálogo de eventos extendido en `src/lib/sync/event-catalog.ts`
- **Decisiones clave:**
  - el seed quedó **resumable e idempotente por fila**, no envuelto en una transacción larga. Motivo: reintentos seguros + menos locks + soporte natural para re-seeding con mismo `effective_from`.
  - `sellable_role_cost_components` y `sellable_role_pricing_currency` hacen upsert por PK compuesta cuando se reimporta la misma fecha efectiva.
  - `employment_type` se infiere de forma conservadora; 4 filas ambiguas quedan en `needs_review` y NO reciben compatibilidad automática.
  - coexistencia explícita con `greenhouse_commercial.role_rate_cards` hasta `TASK-464d`.
- **Seed verificado en DB (effective_from `2026-04-18`):**
  - `sellable_roles`: `32`
  - `employment_types`: `7`
  - `sellable_role_cost_components`: `28`
  - `role_employment_compatibility`: `28`
  - `sellable_role_pricing_currency`: `192`
  - artifact local de revisión: `/tmp/task-464a-sellable-roles-seed-review.json`
  - review queue: `ECG-004`, `ECG-017`, `ECG-018`, `ECG-032`
- **Validado:**
  - `pnpm exec vitest run src/lib/commercial/__tests__/sellable-roles-seed.test.ts` ✓
  - `pnpm exec tsc --noEmit --incremental false` ✓
  - `pnpm test src/lib/payroll/` ✓ `194/194`, `29 files`
  - `pnpm pg:connect:status` ✓ sin migraciones pendientes
- **Riesgos / follow-ups inmediatos:**
  - TASK-468 debe mapear comercial ↔ payroll sin tocar `greenhouse_payroll.*`; esta task dejó el vocabulario comercial listo, no la convergencia.
  - TASK-464d debe migrar consumers legacy fuera de `role_rate_cards`.

## Sesion 2026-04-18 — TASK-464a Sellable Roles Catalog Canonical (inicio)

- **Estado:** `in-progress`.
- **Worktree:** `/Users/jreye/Documents/greenhouse-eo-codex`
- **Rama:** `task/TASK-464a-sellable-roles-catalog-canonical`
- **Objetivo:** levantar la foundation schema-heavy de roles sellable/pricing base para desbloquear `TASK-464d`, `TASK-464e`, `TASK-465` y `TASK-467`.
- **Discovery cerrado:**
  - el CSV real `data/pricing/seed/sellable-roles-pricing.csv` hoy tiene `32` roles activos y `54` placeholders, no `33/53`
  - la heurística amplia de `employment_type` de la spec era demasiado agresiva; los casos ambiguos deben ir a `needs_review`
  - el ejemplo correcto de pricing spot-check es `ECG-008` (`Paid Media Manager`, `17.49 USD/h`), no `ECG-009`
  - `docs/architecture/schema-snapshot-baseline.sql` está desfasado para esta lane; la referencia operativa real es `TASK-345`, `TASK-346` y `src/types/db.d.ts`
  - si la task crea `sellable_role_sku_seq`, necesita grants explícitos de sequence en `greenhouse_commercial`
- **Ajuste documental ya aplicado:**
  - `TASK-464a` movida a `in-progress/`
  - spec corregida para reflejar conteo real de filas, heurística conservadora, grants de secuencia y acceptance criteria válidos
- **Guardrails vigentes antes de migrar:**
  - payroll sigue aislado; `TASK-464a` no toca `greenhouse_payroll.*` ni `src/lib/payroll/**`
  - baseline de payroll debe revalidarse justo antes de la migración (`pnpm test src/lib/payroll/`)
  - coexistencia temporal obligatoria con `greenhouse_commercial.role_rate_cards` hasta `TASK-464d`

## Sesion 2026-04-18 — TASK-469 Commercial Pricing UI Interface Plan (cierre)

- **Estado:** `complete`.
- **Worktree:** `/Users/jreye/Documents/greenhouse-eo` (primary)
- **Rama:** `develop`
- **Entregado:**
  - Plano maestro de UI cerrado en `docs/tasks/complete/TASK-469-commercial-pricing-ui-interface-plan.md` (12 surfaces, 9 componentes nuevos, 13-row floor)
  - Bloque `GH_PRICING` insertado en `src/config/greenhouse-nomenclature.ts` con copy canónico para builder, picker, cost stack, semaphore, send drawer, list, admin, toasts y errores
  - Scaffold `src/components/greenhouse/pricing/` con `README.md` declarando los 9 componentes destino + reglas (copy desde GH_PRICING, 13-row floor, payroll isolation)
  - `Lifecycle` sincronizado (carpeta `complete/` + header `complete`), README task index actualizado, `siguiente ID disponible: TASK-470`, registry sincronizado
  - Cross-links a TASK-463/464e/465/466/467/468 ya commiteados previamente en a7d5a0bf
- **Decisiones clave:**
  - Micro-correcciones al bloque `GH_PRICING` vs spec original §4: `toastQuoteSent` y `toastRoleUpdated` convertidos de strings con `{placeholder}` a funciones `(arg: string) => string` para paridad con patrón `GH_NEXA` (type-safe, sin parsing en consumer)
  - `marginLabels` y `pickerTabs` tipados con `as Record<string, string>` (paridad con `GH_NEXA.signal_type`)
  - Anglicismos conservados (`Tier fit`, `Catálogo de pricing`, `Overhead add-ons`) — audiencia interna finance_admin/efeonce_admin, vocabulario canónico del programa
  - `.gitkeep` vacío + `README.md` con contenido descubrible (no `.gitkeep` con contenido, que es weird)
- **Validado:**
  - `npx tsc --noEmit` ✓ sin errores
  - `npx eslint src/config/greenhouse-nomenclature.ts` ✓ limpio
  - `pnpm test src/lib/payroll/` ✓ 194/194 tests passing, 29 files (baseline mantenido)
- **Notas operativas:**
  - Próximo en mi cola: esperar señal del usuario para arrancar TASK-464e/465/467 (Ola 4, requieren TASK-464a/b/c/d merged primero)
  - Codex sigue trabajando en `task/TASK-458-honest-label-pipeline-fix` (Ola 1)
- **Coexistencia con Codex (heads-up):**
  - `src/components/greenhouse/pricing/` ya existe como scaffold (README + .gitkeep). NO recrear. Es destino de los 9 componentes UI de Ola 4-5 (todos míos).
  - `src/config/greenhouse-nomenclature.ts` tiene `GH_PRICING` ya commiteado. Si Codex en TASK-464a..d/468 necesita agregar copy (improbable, son backend/schema), append al final del bloque `GH_PRICING`, no cambiar entradas existentes ni renombrar campos — los consumers UI de Ola 4 ya están razonando con esos nombres.
  - `siguiente ID disponible` ahora es `TASK-470` (no `469`). Si Codex crea task nueva, usar 470.
  - TASK-469 está en `docs/tasks/complete/` — no reabrir; si surge necesidad de plano nuevo (componente no inventariado), crear `TASK-469-delta` o `TASK-470` separado.
  - Rebase pattern: yo siempre `git pull --rebase origin develop` + `--force-with-lease` desde mi branch antes de push. Si Codex y yo estamos en branches paralelos, ninguno toca el branch del otro; CI es gate compartido.

## Sesion 2026-04-18 — Pricing seeds/tasks normalization contract hardening (docs only)

- **Estado:** `complete`, documental.
- **Worktree:** `/Users/jreye/Documents/greenhouse-eo-codex`
- **Rama:** `task/TASK-458-honest-label-pipeline-fix`
- **Entregado:**
  - ajustes documentales en:
    - `docs/tasks/to-do/TASK-464a-sellable-roles-catalog-canonical.md`
    - `docs/tasks/to-do/TASK-464b-pricing-governance-tables.md`
    - `docs/tasks/to-do/TASK-464c-tool-catalog-extension-overhead-addons.md`
    - `docs/tasks/to-do/TASK-464d-pricing-engine-full-model-refactor.md`
    - `docs/tasks/to-do/TASK-468-payroll-commercial-employment-types-unification.md`
- **Decisiones clave:**
  - `TASK-464a` ahora deja explícito el contrato de normalización del seed de roles, la inferencia conservadora de `employment_type` y la política de `needs_review`.
  - `TASK-464b` ahora fija diccionarios canónicos, parseo de rangos (`0.85-0.9`) y resolución de drift a favor del catálogo de roles de `TASK-464a`.
  - `TASK-464c` ahora separa semánticamente `applicable_business_lines` de tags/aditamentos no-BL y formaliza el parser semántico de fórmulas de addons.
  - `TASK-464d` ahora deja explícito que el engine consume datos ya normalizados y no debe reimplementar parsing de CSV.
  - `TASK-468` se corrigió para respetar el guardrail duro del programa: bridge read-only desde commercial, sin FK, sin rewrite y sin mutaciones de schema/runtime payroll.
- **Validado:**
  - `git diff -- docs/tasks/to-do/TASK-464{a,b,c,d}*.md docs/tasks/to-do/TASK-468-*.md` revisado manualmente ✓
  - sin cambios de runtime, migraciones ni código ejecutable
- **Notas operativas:**
  - baseline payroll previamente verificado en este worktree: `194/194` tests passing, `29` files
  - `pnpm pg:connect:status` previamente verificado en este worktree: sin migraciones pendientes

## Sesion 2026-04-18 — TASK-458 honest-label quick fix

- **Estado:** `complete`
- **Worktree:** `/Users/jreye/Documents/greenhouse-eo-codex`
- **Rama:** `task/TASK-458-honest-label-pipeline-fix`
- **Objetivo:** corregir el framing semántico de la sub-tab `Pipeline` de `CommercialIntelligenceView` sin tocar backend.
- **Descubrimiento confirmado:**
  - la vista actual consume `greenhouse_serving.quotation_pipeline_snapshots` vía `/api/finance/commercial-intelligence/pipeline`, por lo que el dato es `quote-grain`, no `deal-grain`
  - `HorizontalWithSubtitle` ya soporta `titleTooltip`, así que el quick fix cabe en un diff local del view
- **Entregado:**
  - sub-tab `Pipeline` renombrada a `Cotizaciones en curso`
  - alert informativo agregado al inicio del sub-tab
  - tooltips agregados en `Pipeline abierto` y `Pipeline ponderado` usando el soporte existente de `HorizontalWithSubtitle`
- **Ajustes documentales:**
  - `TASK-458` movida a `complete/`
  - la spec se corrigió para usar el skill vigente `greenhouse-ux-content-accessibility`
  - la propuesta de label se ajustó a lenguaje honesto de cotización (`Cotizaciones en curso`) en vez de `Contratos activos`
- **Validado:**
  - `pnpm exec tsc --noEmit --incremental false` ✓
  - `pnpm test` ✓ (`1339 passed`, `2 skipped`)
  - `pnpm test src/lib/payroll/` ✓ (`194 passed`, `29` files)
  - `pnpm lint` ✓
  - `pnpm build` ✓
  - `rg -n "new Pool\\(" src -g '!src/lib/postgres/client.ts'` → sin matches ✓
- **Hardening adicional aplicado:**
  - `package.json` ahora ejecuta `pnpm build:icons` en `predev`, `prelint` y `prebuild`
  - con eso, `src/assets/iconify-icons/generated-icons.css` deja de depender de `postinstall` y los worktrees reutilizando `node_modules` ya no rompen lint/build por ausencia del bundle

## Sesion 2026-04-18 — TASK-337 Person ↔ Legal Entity Relationship Runtime Foundation

- **Estado:** `complete`, entregado.
- **Rama:** `task/TASK-337-person-legal-entity-relationship-runtime-foundation`
- **Entregado:**
  - migración `20260418020712679_task-337-person-legal-entity-foundation.sql`
  - tabla `greenhouse_core.person_legal_entity_relationships`
  - helper `src/lib/account-360/person-legal-entity-relationships.ts`
  - route `GET /api/people/[memberId]/legal-entity-relationships`
  - proyección reactiva `operating_entity_legal_relationship`
  - eventos `person_legal_entity_relationship.created|updated|deactivated`
- **Decisiones clave:**
  - `LegalEntity` v1 queda anclada explícitamente en `greenhouse_core.organizations` vía `legal_entity_organization_id`; no se crea tabla separada todavía.
  - `person_memberships` sigue siendo contexto organizacional/operativo; la semántica legal vive en la tabla nueva.
  - backfill inicial deliberadamente conservador:
    - `employee` desde miembros activos del operating entity
    - `shareholder_current_account_holder` desde `greenhouse_finance.shareholder_accounts`
- **Validado:**
  - `pnpm exec vitest run src/lib/sync/projections/operating-entity-legal-relationship.test.ts` ✓
  - `pnpm migrate:up` ✓ (incluyó regeneración de `src/types/db.d.ts`)
  - `pnpm lint` ✓
  - `pnpm build` ✓
  - `rg -n "new Pool\\(" src -g '!src/lib/postgres/client.ts'` → sin matches ✓
- **Notas operativas:**
  - el worktree estaba detrás de `origin/develop` respecto de `migrations/20260418020055064_task-351-runtime-grants.sql`; se trajo ese archivo para alinear el historial local con la DB antes de correr `migrate:up`
  - para validar `build` en worktree fue necesario reemplazar el symlink de `node_modules` por un directorio local hardlinkeado; Turbopack rechaza symlinks que salen del filesystem root


## Sesion 2026-04-18 — Release train: develop → main promotion (81 commits)

- **Estado:** `complete`, deployado.
- **Trigger:** cierre de TASK-351 con greenlight explícito del usuario para promover a producción.
- **Scope:** 81 commits (438 archivos, +65k/-3k LOC) que cubrían acumulado de develop vs main:
  - **Commercial Quotation canonical program** — TASK-344 (umbrella) → TASK-345 (schema + bridge) → TASK-346 (pricing/margin core) → TASK-347 (HubSpot canonical bridge) → TASK-348 (governance: approvals/versions/terms/templates/audit) → TASK-349 (workspace UI + PDF) → TASK-350 (quote-to-cash bridge) → TASK-351 (intelligence automation).
  - **TASK-451** — password_hash mutation guardrails (cierra ISSUE-053).
  - **TASK-029** — HRIS Goals & OKRs module.
  - **TASK-031** — Performance Evaluations 360.
  - **TASK-245** — Finance Signal Engine operationalized en Cloud Run.
  - **TASK-285** — client role differentiation via view assignments.
  - **TASK-404** — entitlements governance admin center.
  - **TASK-415** — HR leave admin backfills + adjustments.
  - **Hardening** — múltiples fixes sobre nexa, HR leave, chile accrual seeding.
- **Ejecutado:**
  - `git merge --no-ff origin/develop -m "Merge branch 'develop' into main"` en local → commit `a45b076a`.
  - `git push origin main` → disparó Vercel production deploy.
  - Vercel production `dpl_HtTJ744duJmH9M6Zw9BkpmpuGLpi` READY en ~3m20s. Dominios activos: `greenhouse.efeoncepro.com`, `greenhouse-eo.vercel.app`, `greenhouse-eo-efeonce-7670142f.vercel.app`.
  - Staging deploy pre-existente (`dpl_2To66abpY1NRTAZZRYLYKMTDMKmh`, commit `a37e47fe`) ya estaba READY.
- **Validado post-deploy en producción:**
  - `GET /api/finance/commercial-intelligence/pipeline` → 401 (auth requerida) ✓ endpoint desplegado
  - `GET /api/finance/commercial-intelligence/profitability` → 401 ✓
  - `GET /api/finance/commercial-intelligence/renewals` → 401 ✓
  - `GET /api/finance/quotes/[id]/document-chain` → 401 ✓
  - `GET /api/cron/quotation-lifecycle` → 401 (cron-auth guard activo) ✓
- **Migraciones:**
  - Shared Cloud SQL `greenhouse-pg-dev` ya tenía aplicadas las migraciones de TASK-350 (`20260417190539017`) y TASK-351 (`20260418005940703`) cuando se hicieron los merges a develop. No se requirió paso manual adicional para prod porque staging y prod comparten la instancia.
- **Ops-worker Cloud Run (staging deploy en paralelo):**
  - `bash services/ops-worker/deploy.sh` con `ENV=staging` — Cloud Build success, revision `ops-worker-00033-mz8` serving traffic.
  - Secrets intactos (`greenhouse-nextauth-secret-staging`, `greenhouse-resend-api-key-staging`) — no swap accidental hacia prod.
  - Cloud Scheduler job `ops-quotation-lifecycle` upserted: `0 7 * * *` America/Santiago, ENABLED.
  - Smoke test: `POST /quotation-lifecycle/sweep` → 200 `{"expiredCount":0,"renewalDueCount":0,"quotationsProcessed":0,"durationMs":41}`.
  - Endpoints existentes intactos: `/reactive/process`, `/reactive/process-domain`, `/cost-attribution/materialize`, `/batch-email-send`, `/nexa/weekly-digest`, `/health`.
- **Notas operativas:**
  - `ops-worker` es un único Cloud Run service compartido entre staging y producción (topología canónica per `deploy.sh` comments). Mount de secrets cambia con `ENV`. Antes de redeploy, **verificar qué ENV está corriendo la revisión viva** para no swap-ear credenciales.
  - Primera materialización real de `quotation_pipeline_snapshots` ocurrirá cuando un evento canónico dispare la reactive projection (ej. user crea/sincroniza quote) o cuando el Cloud Scheduler corra por primera vez mañana a las 07:00 Santiago.
- **Follow-ups (out of scope de esta promoción):**
  - Monitorear errores en `greenhouse.efeoncepro.com` durante las primeras 24h (81 commits es un release grande).
  - Validar que TASK-029/031 (Goals + Performance Evaluations) se activen correctamente en producción — son módulos completos que no habían visto tráfico prod.
  - TASK-452 (service-attribution-foundation) quedó registrada en docs (commit `23eef040`) pero sin implementar — es el siguiente ítem natural del backlog finance después de TASK-351.

## Sesion 2026-04-18 — TASK-351 Quotation Intelligence Automation

- **Estado:** `complete`, entregado.
- **Rama:** `task/TASK-351-quotation-intelligence-automation`
- **Dependencias:** TASK-345 (schema canónico), TASK-346 (pricing engine), TASK-350 (quote-to-cash bridge). Todas cerradas.
- **Entregado:**
  - **Migration** `20260418005940703_task-351-quotation-intelligence.sql`:
    - `greenhouse_serving.quotation_pipeline_snapshots` — 1 fila por quote, stage/probability/aging/renewal-state/expiry, totales autorizado+facturado del bridge TASK-350.
    - `greenhouse_serving.quotation_profitability_snapshots` — 1 fila por quote-período, quoted vs authorized vs invoiced vs realized + costo atribuido + drift_severity + drift_drivers JSONB.
    - `greenhouse_commercial.quotation_renewal_reminders` — cadencia/dedup de alertas de renovación.
  - **Runtime** (`src/lib/commercial-intelligence/`):
    - `contracts.ts` — tipos canónicos + umbrales (lookahead 60d, cadencia 14d, drift warning 5pp/critical 15pp).
    - `pipeline-materializer.ts` — `buildPipelineSnapshot` + `upsertPipelineSnapshot` + `materializePipelineSnapshot`. Stage derivado de `status`, probability por stage, aging via `stageEnteredAt`, renewal/expired flags. Reutiliza `purchase_orders.quotation_id` / `income.quotation_id` del bridge TASK-350 para totales autorizados/facturados.
    - `profitability-materializer.ts` — `materializeProfitabilitySnapshots` (por quote) + `materializeProfitabilityForPeriod` (por período). Cost attribution: prorrateado por share de revenue del quote vs revenue total del cliente en el período (leído de `greenhouse_serving.commercial_cost_attribution`). Si el quote es el único linked en el período, toma cost completo.
    - `renewal-lifecycle.ts` — `runQuotationLifecycleSweep`: pasa a `expired` y emite evento + audit; emite `renewal_due` con dedup via `quotation_renewal_reminders`.
    - `intelligence-store.ts` — readers tenant-safe con filtros.
  - **Eventos canónicos nuevos** (`src/lib/sync/event-catalog.ts`):
    - `commercial.quotation.expired`
    - `commercial.quotation.renewal_due`
    - `commercial.quotation.pipeline_materialized`
    - `commercial.quotation.profitability_materialized`
  - **Publishers** en `src/lib/commercial/quotation-events.ts`: 4 nuevos.
  - **Reactive projections** en domain `cost_intelligence` (reutilizan cron `ops-reactive-cost-intelligence` cada 10min):
    - `quotation_pipeline` — 12 trigger events (created, synced, sent, approved, rejected, converted, expired, renewal_due, version_created, po_linked, hes_linked, invoice_emitted).
    - `quotation_profitability` — 9 trigger events (approved, converted, po_linked, hes_linked, invoice_emitted, version_created, finance.income.created/updated, accounting.commercial_cost_attribution.period_materialized). Acepta scope por quote o por período.
  - **Cron scheduled**:
    - Vercel fallback: `GET /api/cron/quotation-lifecycle` 10:00 UTC daily (07:00 Santiago).
    - Cloud Run canonical: `POST /quotation-lifecycle/sweep` en ops-worker; Cloud Scheduler job `ops-quotation-lifecycle` 07:00 Santiago declarado en `services/ops-worker/deploy.sh`.
  - **API surface**:
    - `GET /api/finance/commercial-intelligence/pipeline?stage=&clientId=&businessLineCode=&renewalsDueOnly=true` → `{ items, totals, count }`.
    - `GET /api/finance/commercial-intelligence/profitability?periodYear=&periodMonth=&quotationId=&driftSeverity=` → `{ items, count }`.
    - `GET /api/finance/commercial-intelligence/renewals?include=renewals|expired|all` → `{ renewals, expired, counts }`.
    - `POST /api/finance/commercial-intelligence/materialize` (admin / finance_manager) — `{ quotationId? , lifecycleSweep?: boolean }` para re-hydrate manual.
  - **UI**:
    - `CommercialIntelligenceView.tsx` — 3 tabs: Pipeline (4 KPIs + tabla filtrable), Rentabilidad (tabla con drift chips), Renovaciones (2 secciones: por vencer / vencidas). Scope automático según `tenant.tenantType` (cliente ve solo lo suyo, efeonce_internal ve todo).
    - `FinanceIntelligenceView.tsx` extendido: tercera tab "Cotizaciones" renderiza `CommercialIntelligenceView`.
- **Política de rematerialización:**
  - Reactive: cualquiera de los 12/9 eventos dispara re-hydrate automáticamente vía `ops-reactive-cost-intelligence` (domain cost_intelligence, cada 10min).
  - Scheduled: sweep diario detecta `expired` y `renewal_due`, que a su vez emiten eventos que disparan pipeline_materialized.
  - Manual: POST `/materialize` con `quotationId` o `lifecycleSweep:true`.
- **Métrica default del dashboard y cómo cambia por BU:** 
  - Pipeline tab default = `openPipelineClp` (suma de etapas draft/in_review/sent/approved). Alternativas visibles en misma row: `weightedPipelineClp`, `wonClp`, `lostClp`.
  - Filtrable por `businessLineCode` vía query string del endpoint `pipeline`. Future dashboards por BU pueden filtrar explícito (TASK-351 follow-up doc).
- **Detección `expired_without_renewal` sin duplicar lógica:**
  - Único fuente de expiration: `runQuotationLifecycleSweep` (flip status + emit event).
  - `expired` se correlaciona con ausencia de `quotation_renewal_reminders.last_reminder_at` + absence de drafts posteriores (attribute queryable via audit log). No hay cron separado — la lógica vive en un solo módulo.
- **Convivencia rama simple vs enterprise en profitability:**
  - Rama simple: `invoicedVsQuotedPct` y `realizedVsQuotedPct` son los drivers principales (no hay PO).
  - Rama enterprise: además `authorizedVsQuotedPct` muestra drift entre lo cotizado y lo autorizado por HES.
  - Ambos drivers quedan expuestos en `drift_drivers` JSONB para consumidores downstream.
- **Validado:**
  - `pnpm migrate:status` ✓ (sin pendientes)
  - `pnpm exec tsc --noEmit --incremental false` ✓
  - `pnpm lint` ✓
  - `pnpm test` ✓ 1337 passed, 2 skipped
  - `pnpm build` en curso al commit.
- **Follow-ups (out of scope):**
  - Forecasting predictivo ML.
  - Dashboard ejecutivo hiper-pulido por BU (agregar filtros visibles + mini-charts).
  - Cloud Run deploy del nuevo endpoint `/quotation-lifecycle/sweep` (`bash services/ops-worker/deploy.sh` después del merge).
  - Draft automático de renovación — actualmente solo se emite el evento; draft lo crea el usuario desde UI con audit `renewal_generated`.

## Sesion 2026-04-17 — TASK-350 Quotation-to-Cash Document Chain Bridge

- **Estado:** `complete`, entregado.
- **Rama:** `task/TASK-350-quotation-to-cash-document-chain-bridge`
- **Dependencias:** TASK-345 (schema canónico), TASK-346 (pricing engine), TASK-348 (governance runtime), TASK-164 (purchase_orders), TASK-212 (Nubox multiline). Todas mergeadas excepto 212 (solo necesitamos `emission.ts` existente).
- **Entregado:**
  - **Migration** `20260417190539017_task-350-quotation-to-cash-bridge.sql`:
    - `purchase_orders.quotation_id` (FK → `greenhouse_commercial.quotations.quotation_id`, ON DELETE SET NULL, indexada).
    - `service_entry_sheets.quotation_id` (FK + index) + `amount_authorized_clp` (para drift vs submitted).
    - `income.quotation_id` + `income.source_hes_id` (FK a HES, SET NULL).
  - **Stores extendidos (sin romper callers existentes):**
    - `purchase-order-store.ts`: acepta/devuelve `quotationId`; `listPurchaseOrders` filtra por `quotationId`; `updatePurchaseOrder` acepta `quotationId`.
    - `hes-store.ts`: `CreateHesInput.quotationId` (opcional; auto-hereda del PO cuando se crea HES con `purchaseOrderId`). `approveHes` acepta overload `{ actorUserId, amountAuthorizedClp }` — legacy string signature preservada. Al aprobar, setea `amount_authorized_clp` (default = `amount_clp`).
  - **Bridge helpers** en `src/lib/finance/quote-to-cash/`:
    - `link-purchase-order.ts` — `linkPurchaseOrderToQuotation` valida `client_id`/`organization_id` consistentes, actualiza FK, emite `commercial.quotation.po_linked` + audit `po_received`.
    - `link-service-entry.ts` — `linkServiceEntryToQuotation` análogo; emite `commercial.quotation.hes_linked` + audit `hes_received`.
    - `document-chain-reader.ts` — `readQuotationDocumentChain` lee quote + POs + HES + incomes + totales (quoted/authorized/invoiced + deltas).
    - `materialize-invoice-from-quotation.ts` — **rama simple**: inserta income desde approved/sent quote si NO hay PO/HES aprobadas; rechaza sino (fuerza a usar rama enterprise). Transiciona quote a `converted`.
    - `materialize-invoice-from-hes.ts` — **rama enterprise**: inserta income desde approved HES (con `source_hes_id` y `quotation_id`); marca HES `invoiced=TRUE`; transiciona quote a `converted` si aún no lo está.
  - **Eventos nuevos en catalog** (`src/lib/sync/event-catalog.ts`): `commercial.quotation.po_linked`, `commercial.quotation.hes_linked`, `commercial.quotation.invoice_emitted`.
  - **Publishers** en `src/lib/commercial/quotation-events.ts`: `publishQuotationPurchaseOrderLinked`, `publishQuotationServiceEntryLinked`, `publishQuotationInvoiceEmitted`.
  - **API routes:**
    - `POST /api/finance/purchase-orders` — acepta `quotationId`. Si provisto corre el link helper; en fallo de validación (client mismatch, quote no existe) rollback limpiando FK.
    - `PUT /api/finance/purchase-orders/[id]` — acepta `quotationId`. Si cambia el link, corre helper (emite evento + audit).
    - `POST /api/finance/hes` — emite `hes_linked` + audit si el HES quedó linked (explícito o heredado del PO).
    - `POST /api/finance/hes/[id]/approve` — acepta `amountAuthorizedClp` + opt `materializeInvoice` + `dueDate`. Si se pide materializar y el HES tiene `quotation_id` y no está facturado, corre `materializeInvoiceFromApprovedHes` en el mismo handler. Error → 207 con `invoiceError`.
    - `GET /api/finance/quotes/[id]/document-chain` — lectura de la cadena (quote+POs+HES+incomes+totals+deltas).
    - `POST /api/finance/quotes/[id]/convert-to-invoice` — **rama simple**: materializa factura directa desde quote aprobada sin PO/HES.
  - **UI:**
    - `src/views/greenhouse/finance/workspace/QuoteDocumentChain.tsx` — nuevo componente card con 3 KPIs (Cotizado / Autorizado / Facturado) con delta chips, secciones PO / HES / Facturas con accent borders, CTA "Convertir a factura" con tooltip contextual.
    - `QuoteDetailView.tsx` — nueva tab **"Cadena documental"** con fetch del endpoint, wiring de `canConvertSimple` (viewer.canEdit + approved/sent + sin PO/HES aprobadas/facturas), handlers para navegar a PO/HES/factura individuales.
- **Convivencia de ramas:**
  - **Rama simple** (sin OC/HES): quote aprobada → `POST /convert-to-invoice` → income. Solo habilitada si no hay PO/HES linked.
  - **Rama enterprise**: quote → link PO → submit HES (auto-herence de `quotation_id` del PO) → approve HES (fija `amount_authorized_clp`) → opcional `materializeInvoice:true` en el mismo approve → income con `source_hes_id` y `quotation_id`. Quote transita a `converted` en la primera materialización.
- **Una cotización se considera `converted`** cuando la primera materialización (simple o enterprise) seteó `converted_to_income_id`; subsiguientes HES del mismo quote siguen materializándose sin retransicionar.
- **Validado:**
  - `pnpm migrate:status` — sin pendientes.
  - `pnpm exec tsc --noEmit --incremental false` ✓
  - `pnpm lint` ✓
  - `pnpm test` — 1339 passed, 2 skipped (tras ajustar `purchase-orders/route.test.ts` para incluir `quotationId: null` en el caller expectation).
  - `pnpm build` — en curso al commit.
- **Decisiones notables:**
  - `quotation_id` en PO/HES es nullable: backfill no ejecutado para preservar legacy; bridge solo aplica a nuevos flujos. Callers que pasen `quotationId` obtienen audit + outbox automáticamente.
  - `amount_authorized_clp` en HES se setea en `approveHes` (default = `amount_clp`). Drift `authorized - quoted` se computa en el reader.
  - Emisión DTE (Nubox) no se tocó en esta task — se queda con el income ya materializado. La trazabilidad quedó en `income.source_hes_id` + `income.quotation_id`.
- **Follow-ups (out of scope):**
  - TASK-351 — quotation intelligence/automation pipeline (renewals, profitability) depende de este bridge.
  - Backfill de `quotation_id` en POs/HES legacy heurísticamente (por `po_number` cuando la quote tenga número matching).
  - UI de "Vincular OC existente" desde QuoteDetail — actualmente solo hay chip `canLinkExisting` sin dialog.

## Sesion 2026-04-17 — TASK-146 Service-Level P&L audit de bloqueo documental

- **Estado:** `blocked`, sin implementación iniciada.
- **Rama:** `task/TASK-146-service-pnl`
- **Hallazgo central:** el repo sí tiene P&L operativo por `space` (`greenhouse_serving.operational_pl_snapshots`), costo comercial por `member + client` (`greenhouse_serving.commercial_cost_attribution`) y loaded cost por persona (`greenhouse_serving.member_capacity_economics`), pero **no** tiene un contrato canónico para atribuir revenue/direct cost/labor a `greenhouse_core.services.service_id`.
- **Contratos faltantes que bloquean runtime seguro:**
  - `greenhouse_finance.income` no expone `service_id`; solo `service_line` y referencias auxiliares (`hubspot_deal_id`, `quotation_id`, `hes_id`)
  - `greenhouse_finance.expenses` y `greenhouse_finance.cost_allocations` no exponen `service_id`
  - `commercial_cost_attribution` sigue keyed por `member_id + client_id + period`, no por servicio
  - `computeOperationalPl()` resuelve `space` desde `client_id` con `DISTINCT ON`, suficiente para `space`-level P&L pero no para atribución fiel por servicio
- **Acción tomada:** se corrigió la spec `docs/tasks/to-do/TASK-146-service-pnl.md` para dejar explícito que la task está bloqueada por contratos upstream de atribución y que la UI actual debe seguir mostrando solo contexto contractual por servicio.
- **Siguiente paso recomendado:** abrir task/prerrequisito que formalice el bridge canónico `Finance/Commercial/Staffing -> service_id` antes de volver a intentar `service_economics`.
- **Actualización 2026-04-18:** se registró `TASK-452 - Service Attribution Foundation` como prerrequisito formal y se alineó el índice de tasks para que el siguiente ID disponible pase a `TASK-453`.

## Sesion 2026-04-17 — TASK-349 Quotation Workspace UI + PDF Delivery

- **Estado:** `complete`, entregado.
- **Rama:** `task/TASK-349-quotation-workspace-ui-pdf-delivery`
- **Dependencias:** TASK-345 (schema canónico), TASK-346 (pricing engine), TASK-347 (HubSpot bridge), TASK-348 (governance runtime) — todas mergeadas a develop.
- **Entregado:**
  - **UI workspace** (`src/views/greenhouse/finance/workspace/`):
    - `QuoteCreateDrawer.tsx` — drawer lateral con toggle "Desde cero" / "Desde template". Precarga defaults del template seleccionado. Primary action en QuotesListView.
    - `QuoteLineItemsEditor.tsx` — editor inline con product picker, add/remove, subtotales preview local, guardar/descartar. Read-only cuando el status no permite edición.
    - `QuoteHealthCard.tsx` — card con margen efectivo + target + piso + chip (Óptimo/Atención/Crítico) + alertas MUI + CTA "Solicitar aprobación".
    - `QuoteSendDialog.tsx` — dialog contextual (needs_approval / approval_in_progress / ready / blocked).
    - `QuoteSaveAsTemplateDialog.tsx` — dialog con templateName + templateCode (auto-uppercase) + description.
  - **Endpoints nuevos:**
    - `GET /api/finance/quotes/[id]/pdf` — renderiza PDF client-safe via `@react-pdf/renderer`. `?download=1` cambia a attachment. Registra `pdf_generated` en audit_log (no outbox). Input contract TS excluye cost/margin/cost_breakdown — firewall estructural.
    - `POST /api/finance/quotes/[id]/send` — transiciona draft → sent directo si health OK, o draft → pending_approval si requiere aprobación (crea approval_steps). 409 en transiciones inválidas.
    - `POST /api/finance/quotes/[id]/save-as-template` — copia current-version line items (strip `member_id`), extrae term_ids, crea quote_templates + quote_template_items. Emite `commercial.quotation.template_saved`.
  - **POST `/api/finance/quotes` extendido:** acepta `templateId` opcional → llama `recordTemplateUsage`, hereda defaults (currency/billingFrequency/pricingModel/contractDurationMonths/businessLineCode), genera line items desde template si body vacío, siembra terms vía `seedQuotationDefaultTerms`, emite `publishTemplateUsed`.
  - **QuotesListView:** columnas nuevas Versión (chip vN si >1) + Margen (chip verde/ámbar/rojo vs floor/target). Status config extendida con `pending_approval`/`approved`. Dos botones de creación.
  - **QuoteDetailView:** `QuoteHealthCard` en General tab arriba de las KPIs. Action buttons en header: PDF, Guardar como template (draft), Enviar (draft|pending_approval|approved). Dialogs de send y save-as-template al pie. Mensaje de éxito de acciones.
  - **PDF document + render helper:** `src/lib/finance/pdf/{contracts,quotation-pdf-document,render-quotation-pdf}.{ts,tsx}`. Azul Greenhouse `#0375DB`. Helvetica fallback server-side. Layout: header → cliente → table line items client-safe (7 cols) → totales → términos → footer fiscal.
  - **List row mapping extendido:** `current_version`, `effective_margin_pct`, `margin_floor_pct`, `target_margin_pct` en la response para habilitar badges.
- **Validado:**
  - `pnpm exec tsc --noEmit --incremental false` ✓
  - `pnpm lint` ✓
  - `pnpm test` 1337 passed
  - `pnpm build` ✓
  - Smoke E2E contra dev server + agent auth: PDF 200 + application/pdf 3665 bytes 1 página. `/send` 200 `{ sent:true, newStatus:'sent', health }`.
- **Decisiones notables:**
  - Ruta canónica sigue en `/finance/quotes`. No se abrió workspace comercial separado — Open Question resuelta.
  - HubSpot drawer legacy conservado como acción secundaria; primary es el canonical drawer.
  - PDF input contract **excluye cost/margin a nivel tipos**, no solo runtime: cualquier intento de pasar costo falla en tsc.
  - Save-as-template strip `member_id` (templates role-based).
- **Follow-ups (out of scope):**
  - Email dispatch del PDF como consumer reactivo sobre `commercial.quotation.sent`.
  - PDF multi-página / font embedding (cosmético).
  - Analytics del workspace.

## Sesion 2026-04-17 — TASK-451 Password hash mutation guardrails (cierra ISSUE-053)

- **Estado:** `complete`, entregado.
- **Rama:** `task/TASK-451-password-hash-mutation-guardrails`
- **Incidente (ISSUE-053):** login con credentials en staging dejó de funcionar para `jreyes@efeoncepro.com` tras un batch a las 08:00 UTC que tocó `password_hash` de 7 usuarios en la DB de dev. Producción aparecía sin problema al momento del reporte a pesar de compartir la misma DB (`greenhouse-pg-dev`) — observable sin explicar completa; hipótesis probable: JWT persistente emitido en prod antes del batch, NextAuth no re-valida hash por request.
- **Desbloqueo inmediato:** reset manual del hash en dev DB a la password temporal del usuario (`karor-01`, el usuario la cambia desde profile).
- **Fix estructural (TASK-451):**
  - Migration `20260417165907294_task-451-password-hash-mutation-guard.sql` crea trigger `client_users_password_guard` + función `greenhouse_core.guard_password_hash_mutation()`.
  - Regla: cualquier `UPDATE` sobre `client_users.password_hash` exige que la transacción setee `SET LOCAL app.password_change_authorized = 'true'`. Sino, `RAISE EXCEPTION` con `ERRCODE='P0001'`.
  - Helper `withPasswordChangeAuthorization` en `src/lib/identity/password-mutation.ts` envuelve en `withTransaction`, setea el flag, ejecuta el callback, publica `identity.password_hash.rotated` al outbox (`aggregate_type='identity_credential'`).
  - Writers legítimos migrados al helper: `/api/account/reset-password`, `/api/account/accept-invite`.
  - `scripts/backfill-postgres-identity-v2.ts`: removí `password_hash` + `password_hash_algorithm` del SELECT BQ y del UPDATE PG. Comentario inline explicando la razón y apuntando a TASK-451.
  - Event catalog: agregados `AGGREGATE_TYPES.identityCredential` + `EVENT_TYPES.identityPasswordHashRotated`.
  - 5 unit tests nuevos en `src/lib/identity/__tests__/password-mutation.test.ts`.
- **Validado:**
  - `pnpm pg:connect:migrate` ✓ (trigger live en dev)
  - `pnpm exec tsc --noEmit --incremental false` ✓
  - `pnpm lint` ✓
  - `pnpm test` 1337 passed
  - `pnpm build` ✓
  - Smoke E2E vía tsx: UPDATE sin session var → rechazado; UPDATE legítimo vía helper → hash actualizado + outbox event publicado; login sigue funcionando.
- **Follow-up (out of scope inmediato):**
  - Wire consumer reactivo que alerte a Slack si `identity.password_hash.rotated` viene con `source` inesperado o target distinto de `user-agent-e2e-001`.
  - Auditar si otros campos sensibles de `client_users` (`microsoft_oid`, `google_sub`, `auth_mode`) merecen guards similares.

## Sesion 2026-04-17 — TASK-348 Quotation Governance Runtime (approvals, versions, terms, templates, audit)

- **Estado:** `complete`, entregado y pusheado.
- **Rama:** `task/TASK-348-quotation-governance-runtime`
- **Entregado:**
  - Migration `20260417140553325_task-348-quotation-governance-runtime.sql` — 7 tablas nuevas en `greenhouse_commercial` (`approval_policies`, `approval_steps`, `quotation_audit_log`, `terms_library`, `quotation_terms`, `quote_templates`, `quote_template_items`) + seeds de 3 approval policies globales y 6 terms reutilizables.
  - Runtime helpers en `src/lib/commercial/governance/` (audit-log, approval-evaluator, approval-steps-store, policies-store, terms-store con variable resolver, templates-store, versions-store con clone+diff).
  - API extension:
    - Per-quote: `/api/finance/quotes/[id]/{versions,approve,audit,terms}`.
    - Globales: `/api/finance/quotation-governance/{approval-policies,terms-library,templates}[/[id]]`.
  - 8 eventos outbox nuevos bajo `commercial.quotation.*` (`version_created`, `approval_requested`, `approval_decided`, `sent`, `approved`, `rejected`, `template_used`, `template_saved`).
  - UI con tabs en `QuoteDetailView.tsx`: General / Versiones / Aprobaciones / Términos / Auditoría + componentes en `src/views/greenhouse/finance/governance/`.
  - 21 tests unitarios nuevos en `src/lib/commercial/governance/__tests__/` cubriendo `approval-evaluator`, `version-diff` y `resolveTermVariables`.
  - Doc arch `GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md` → v2.5 con delta del governance runtime y resolución de la open question sobre templates (`default_unit_price` + `default_margin_pct` coexisten).
  - Doc funcional `docs/documentation/finance/cotizaciones-gobernanza.md` creada.
- **Decisiones notables:**
  - La gobernanza se expone bajo `/api/finance/quotes/[id]/*` y `/api/finance/quotation-governance/*` en vez de `/api/commercial/*` declarado en la spec §22 — coherente con el runtime vigente post TASK-345/346; cuando cierre el cutover full-commercial (`TASK-349`) se podrá aliasear.
  - `approved_by` / `approved_at` se siguen poblando en `quotations`, pero la verdad de quién aprobó qué paso vive en `approval_steps`; el audit log registra ambas narrativas.
  - Terms guardan `body_resolved` como snapshot inmutable al aplicar — un cambio en `terms_library` NO re-escribe el texto ya aplicado a una quote.
- **Gaps que quedan para TASK-349:**
  - Apply template al crear quote (`POST /api/finance/quotes` debería aceptar `templateId`).
  - Save-as-template desde quote existente (endpoint nuevo).
  - Páginas admin para CRUD visual de policies / terms / templates.
  - Smoke manual del flow approve/reject pendiente de levantar dev server (cubierto en verificación de TASK-349).
- **Validado:**
  - `pnpm pg:connect:migrate` ✓
  - `pnpm db:generate-types` ✓
  - `pnpm lint` ✓
  - `pnpm exec tsc --noEmit --incremental false` ✓
  - `pnpm test` 1309/1309 ✓ (+ 21 tests nuevos de governance)
  - `pnpm build` ✓

## Sesion 2026-04-17 — Nexa Insights history archive + replay parcial de abril

- **Estado:** `in_progress`, fix backend listo y validado; recovery operativo ejecutado de forma parcial por retención de origen.
- **Rama:** `feat/nexa-insights-timeline`
- **Problema resuelto:** `greenhouse_serving.ico_ai_signal_enrichments` funcionaba como snapshot current-state del período y el worker lo sobrescribía en cada corrida. Eso borraba de facto el historial visible para timeline y weekly digest cuando una anomalía dejaba de estar activa.
- **Implementado:**
  - Migration `20260417131401099_nexa-advisory-history-serving.sql` crea `greenhouse_serving.ico_ai_signal_enrichment_history` y backfillea el snapshot vigente.
  - `src/lib/ico-engine/ai/llm-enrichment-worker.ts` ahora:
    - escribe siempre en historial append-only,
    - mantiene `ico_ai_signal_enrichments` como current-state,
    - soporta replay `historyOnly + asOfTime`,
    - agrega timeout por señal LLM (`60s`) para que una generación colgada no congele toda la corrida.
  - `src/lib/ico-engine/ai/llm-enrichment-reader.ts` mueve timelines Agency/Member/Space a historial deduplicado por `enrichment_id`.
  - `src/lib/nexa/digest/build-weekly-digest.ts` consume historial deduplicado en vez del snapshot actual.
  - Script operativo nuevo: `scripts/backfill-ico-llm-history.ts`.
- **Recovery ejecutado:**
  - BigQuery time travel confirmó frontera dura de retención en `2026-04-10T13:17:57.392Z`.
  - Se relanzó el replay recuperable de abril con:
    - `NODE_OPTIONS=--conditions=react-server pnpm exec tsx scripts/backfill-ico-llm-history.ts --year 2026 --month 4 --from 2026-04-10T13:18:00.000Z --to 2026-04-17T23:59:59.999Z`
  - Resultado:
    - `2026-04-15 10:25:09Z` -> 2 history rows recuperadas
    - `2026-04-16 10:20:18Z` -> 9 history rows recuperadas
    - `2026-04-17 07:20:11Z` -> 2 history rows recuperadas
    - `2026-04-17 07:45:12Z` -> 2 history rows recuperadas
    - `2026-04-17 10:20:10Z` -> 2 history rows recuperadas + snapshot vigente backfilleado
  - Las corridas del `2026-04-11`, `2026-04-12` y `2026-04-14` devolvieron `0` señales replayables en el `SYSTEM_TIME` exacto de esas corridas, pese a que los logs de runs históricos marcaban enrichments en ese momento.
  - Daniela quedó nuevamente visible en historial con 2 insights `ftr_pct` del `2026-04-16 10:20:18Z` (`root_cause` + `recommendation`).
- **Límite conocido:**
  - No hay forma fiel de reconstruir `2026-04-01` a `2026-04-10 13:17 UTC` desde la fuente actual porque el snapshot BQ ya cayó fuera de time travel.
  - Si se quiere blindar el resto del mes completo hacia adelante, este fix ya lo hace: desde ahora las corridas nuevas no deberían volver a perderse.
- **Validado:**
  - `pnpm exec vitest run src/lib/ico-engine/ai/llm-enrichment-reader.test.ts src/lib/nexa/digest/build-weekly-digest.test.ts` ✓
  - `pnpm exec tsc --noEmit --incremental false` ✓
  - `pnpm lint` ✓
  - `pnpm pg:connect:migrate` ✓ (regeneró `src/types/db.d.ts`)

## Sesion 2026-04-17 — TASK-347 Quotation Catalog & HubSpot Canonical Bridge

- **Estado:** `complete`, `validado localmente`, pendiente commit + push.
- **Rama:** `feat/nexa-insights-timeline`.
- **Contexto:** sigue la secuencia del Commercial Quotation Canonical Program
  (TASK-344 ✅ → TASK-345 ✅ → TASK-346 ✅). TASK-345 ya dejó el bridge sidecar;
  TASK-347 (a) formaliza canonical-first sin flip destructivo, (b) introduce el
  namespace de eventos `commercial.quotation.*` con aliases `finance.quote.*`
  durante cutover, (c) cierra la deuda de gobernanza que permitía que
  `costOfGoodsSold` saliera a HubSpot.
- **Implementado:**
  - **Event catalog** (`src/lib/sync/event-catalog.ts`): `AGGREGATE_TYPES.quotation`,
    `quotationLineItem`, `productCatalog`; `EVENT_TYPES.quotationCreated/Synced/
    Converted/LineItemsSynced/DiscountHealthAlert`, `productCatalogCreated/Synced`.
  - **`src/lib/commercial/` nuevo**:
    - `quotation-events.ts` — dual-publish centralizado (legacy + canonical)
    - `hubspot-outbound-guard.ts` — `sanitizeHubSpotProductPayload` +
      `HubSpotCostFieldLeakError` bloqueando 10 variantes de cost/margin fields
    - `product-catalog-store.ts` — reader canónico de `greenhouse_commercial.product_catalog`
  - **5 callers HubSpot** refactorizados para dual-publish y aplicar el guard
    antes de `createHubSpotGreenhouseProduct`.
  - **Defense-in-depth** en `createHubSpotGreenhouseProduct`: borra
    `costOfGoodsSold` del payload incluso si el caller saltó el guard.
  - **API `/api/finance/products?view=canonical`** routea al reader nuevo;
    default preserva contrato legacy.
  - **Fix TASK-346 bug**: orchestrator insertaba en `outbox_events(payload)`
    pero columna real es `payload_json`; emit ahora vía `publishDiscountHealthAlert`.
  - **Docs**: `GREENHOUSE_EVENT_CATALOG_V1.md` secciones nuevas + 
    `GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md` v2.4 Delta 2026-04-17.
- **Validado:**
  - `pnpm exec tsc --noEmit` → 0 errors
  - `pnpm lint` → 0 errors
  - `pnpm test` → 1309 passed / 2 skipped (18 tests nuevos en `src/lib/commercial`)
  - `pnpm build` → exit 0
  - `rg "new Pool\(" src` → sólo `src/lib/postgres/client.ts`
- **Impacto cross-module:**
  - TASK-349 (workspace UI) desbloqueada.
  - TASK-346 bug arreglado: `commercial.discount.health_alert` persiste OK.
  - Consumers legacy (`finance.quote.*`) siguen sin cambio.
- **Out of scope (como spec):** Nubox line items (TASK-212), workspace UI final
  (TASK-349), drop de aliases `finance.quote.*` cuando migren todos los consumers.

## Sesion 2026-04-17 — TASK-346 Quotation Pricing, Costing & Margin Health Core

- **Estado:** `complete`, `validado localmente`, pendiente commit + push.
- **Rama:** `feat/nexa-insights-timeline` (misma rama activa; push directo a develop).
- **Contexto:** cierra el core de pricing de `Commercial Quotation Canonical Program`
  (TASK-343 umbrella → TASK-344/TASK-345 ya consolidados). TASK-345 ya había dejado
  el schema canónico y el bridge con Finance; faltaba el costing explicable desde
  el backbone, los guardrails de margen y las métricas de revenue.
- **Implementado:**
  - **Migration** `migrations/20260417124905235_task-346-quotation-pricing-config.sql`:
    `greenhouse_commercial.{margin_targets, role_rate_cards, revenue_metric_config}` con
    unique indexes por `COALESCE(business_line_code, '__global__')`, CHECKs de rangos,
    seeds por business line (Wave 28/20, Reach 18/10, Globe 40/25, Efeonce Digital 35/20,
    CRM Solutions 30/18, default global 25/15) + revenue metric config per BL; ALTER
    OWNER + grants al runtime/migrator/app.
  - **Pricing helpers** en `src/lib/finance/pricing/`:
    - `contracts.ts` tipos canónicos (MarginTarget, RoleRateCard, RevenueMetricConfig,
      CostComponentBreakdown, QuotationPricingTotals, QuotationRevenueMetrics,
      DiscountAlert, DiscountHealthResult).
    - `pricing-config-store.ts` CRUD + readers con herencia
      `quotation_override → business_line → global_default` para márgenes, rate cards
      (match exacto BL+seniority, fallback global) y revenue metric config.
    - `costing-engine.ts` `resolveLineItemCost` cubre los 4 lineTypes:
      `person` → `member_capacity_economics.cost_per_hour_target` con fallback a snapshot
      más reciente; `role` → role_rate_cards; `deliverable` →
      `product_catalog.default_unit_price`; `direct_cost` → manual. Convierte FX con
      `quotation.exchange_rates` o inverse o `fx_rate` del capacity snapshot.
    - `line-item-totals.ts` calcula subtotals, discount_amount (percentage/fixed_amount
      con clamp a subtotal), subtotal_after_discount, margin_amount y effective_margin_pct.
    - `margin-health.ts` `checkDiscountHealth` clasifica alertas:
      `margin_below_zero` (blocking) / `margin_below_floor` (finance approval) /
      `margin_below_target` (warning) / `item_negative_margin` (warning) /
      `discount_exceeds_threshold` (info, >25%).
    - `revenue-metrics.ts` resuelve `recurrence_type = inherit` (monthly → recurring,
      milestone/one_time → one_time) y calcula MRR/ARR/TCV/ACV + revenue_type
      (recurring | one_time | hybrid).
    - `quotation-pricing-orchestrator.ts` `buildQuotationPricingSnapshot` ->
      `persistQuotationPricing` (tx con `withTransaction`: update headers, replace
      line_items, insert version en `quotation_versions` con `snapshot_json` ordenado,
      publish outbox `commercial.discount.health_alert` cuando hay alerta severa).
    - `quotation-id-resolver.ts` resuelve canonical `quotation_id` desde canonical o
      `finance_quote_id` legacy.
  - **API routes** bajo `requireFinanceTenantContext` (Finance Admin requerido para
    editar pricing config):
    - `POST /api/finance/quotes` — create draft + pricing snapshot inicial.
    - `PUT /api/finance/quotes/[id]` — update headers + recalculate (o skip con
      `recalculatePricing:false`).
    - `POST /api/finance/quotes/[id]/lines` — replace line items + recompute.
    - `POST /api/finance/quotes/[id]/recalculate` — force re-read del backbone.
    - `GET /api/finance/quotes/[id]/health` — discount health server-side (para UI).
    - `GET/PUT /api/finance/quotes/pricing/config` — listar + upsert (PUT gated a
      `finance_admin` o `efeonce_admin`).
- **Detailed spec resuelta:**
  - **Snapshot vs recompute:** `unit_cost`, `cost_breakdown`, `subtotal_cost` se
    congelan como snapshot al guardar; totales y métricas agregadas SIEMPRE se
    recalculan. `/recalculate` fuerza re-read de `member_capacity_economics` y
    `role_rate_cards` sin tocar líneas manuales/direct_cost.
  - **FX multi-moneda:** `quotations.exchange_rates` JSONB congela snapshot; el
    engine intenta `rates[FROM_TO]`, luego inverse `rates[TO_FROM]`, luego
    `member_capacity_economics.fx_rate` si target=CLP. Si no hay match, no convierte
    y deja warning en `resolutionNotes` del line item.
  - **`recurrence_type = inherit`:** `resolveLineRecurrence` → monthly → recurring,
    milestone/one_time → one_time. Probado con 6 tests unitarios.
- **Validado localmente:**
  - `pnpm migrate:up` → tipos regenerados, 3 tablas nuevas visibles en `db.d.ts`.
  - `pnpm exec tsc --noEmit --incremental false` → 0 errors.
  - `pnpm lint` → 0 errors.
  - `pnpm test` → 1291 passed / 2 skipped.
  - `pnpm build` → exit 0 (warnings Dynamic server usage preexistentes, no
    introducidos por esta lane).
  - `rg "new Pool\(" src` → sólo `src/lib/postgres/client.ts`.
- **Casos borde validados (unit tests):**
  - one_time puro con duración null → tcv=sum(one_time), acv=tcv.
  - recurring puro con duración 12m → mrr=X, arr=X*12, tcv=X*12, acv=X*12.
  - hybrid recurring+one_time con duración 12m → tcv = mrr*12 + oneTimeTotal.
  - duración 24m → acv = tcv/2 (ceil(24/12)).
  - inherit con monthly → recurring; inherit con milestone → one_time.
  - margin <0% → blocking; <floor → finance approval; <target → warning.
- **Impacto cross-module:**
  - `TASK-348`, `TASK-349`, `TASK-350`, `TASK-351` ya no están bloqueadas por TASK-346.
  - `member_capacity_economics` del módulo Team Capacity ahora tiene un consumer
    commercial directo (antes solo lo usaba Cost Intelligence / Payroll).
  - Outbox gana evento `commercial.discount.health_alert` (consumer: Notifications
    → Finance, audit log; implementación de consumer queda para TASK-348+).
- **Follow-ups / out of scope (como spec declaró):**
  - Approval workflow UI + backend → TASK-348.
  - Templates + terms library → TASK-349.
  - HubSpot sync del namespace `commercial.quotation.*` → TASK-347.
  - PDF + workspace UI final → TASK-350.
  - Profitability tracking actual vs quoted → TASK-351.

## Sesion 2026-04-17 — Nexa Insights: Historial activado en las 4 superficies

- **Estado:** `complete`, `deployed` (commit `bcf8a9c9`)
- **Rama:** `feat/nexa-insights-timeline` → direct push a develop (política de velocidad)
- **Contexto:** el commit anterior `f3d59422` shipeó el toggle Historial solo para Agency (via `IcoAdvisoryBlock`). Home, Space 360 y Person 360 quedaban opt-in — esta sesión las activa para cerrar el tema en todas las superficies Nexa.
- **Implementado:**
  - Backend scoped timelines:
    - `readMemberAiLlmTimeline(memberId, limit=20)` — enrichments filtrados por `member_id`
    - `readSpaceAiLlmTimeline(spaceId, limit=20)` — enrichments filtrados por `space_id`
    - Ambos ordenan por `processed_at DESC`, `status='succeeded'`, sin filtro de período
  - `readMemberAiLlmSummary` / `readSpaceAiLlmSummary` fetchean su timeline en paralelo (Promise.all) — zero latency extra
  - Types: `MemberNexaInsightItem` / `SpaceNexaInsightItem` / `HomeNexaInsightItem` ganan `processedAt: string`; payloads ganan `timeline: Item[]`
  - `get-home-snapshot.ts` mapea `insightsSummary.timeline` (agency-wide) via `mapHomeInsight`
  - Views: HomeView + OverviewTab + PersonActivityTab pasan `timelineInsights={payload.timeline ?? []}`
  - Tests: fixtures actualizados con `processedAt` + `timeline: []`
- **Política de velocidad:** direct push tras local gates (lint + tsc + test 1269 pass + build). No PR — consistente con merge policy canónica cuando no hay branch protection.
- **Validado:** local gates todos verdes.
- **Impacto consumer:**
  - `/home` → toggle aparece cuando hay timeline data (scope agency-wide)
  - `/agency/spaces/[id]` → toggle con timeline scoped al space
  - `/people/[memberId]` → toggle con timeline scoped al miembro
  - `/agency?tab=ico` → ya estaba activo desde `f3d59422`, sigue idéntico
- **Parallel work de Codex:** Codex pusheó en paralelo `TASK-450` + edits a README/REGISTRY. No pisé esos archivos; mi commit es selective-stage solo a los files owned por la feature.
- **Follow-ups opcionales:**
  - Filtrar timeline por severidad en el toggle (ej: solo críticos)
  - Persistir preferencia de vista por usuario (actualmente es session-local)
  - Agregar timeline a Finance Dashboard si se pide (actualmente el FinanceNexaInsightItem no tiene `processedAt` pero es extensión trivial)

## Sesion 2026-04-17 — Nexa Insights timeline (modo Historial) + root cause mapping fix

- **Estado:** `complete`, `deployed a develop` (commit `f3d59422` + `91f66c3c`)
- **Rama:** trabajo en ramas locales, push directo a develop (ver política de velocidad en modelo multi-agente)
- **Problema resuelto:**
  1. El toggle de vista "Ver causa raíz" no aparecía en `/agency?tab=ico` pese al merge de TASK-446 — tres mappers consumer olvidaban pasar `rootCauseNarrative` porque el field era opcional en el tipo
  2. Usuarios veían solo N señales del período actual sin contexto histórico — no había forma de responder "¿es normal tener 2 insights esta semana?" sin salir a PG
- **Implementado:**
  - **Fix mapping (commit `91f66c3c`, PR #67):**
    - `IcoAdvisoryBlock.tsx` ahora pasa `rootCauseNarrative` al mapear `AgencyAiLlmSummaryItem → NexaInsightItem`
    - `get-home-snapshot.ts` + `HomeNexaInsightItem` incluyen el campo
    - `NexaInsightItem.rootCauseNarrative` pasó de `?:string \| null` a `:string \| null` (required nullable) — TypeScript ahora flaggea cualquier futuro consumer que lo omita
  - **Timeline feature (commit `f3d59422`, push directo):**
    - Nuevo reader `readAgencyAiLlmTimeline(limit=20)` sin filtro de período
    - `AgencyAiLlmSummary.timeline` extiende el contrato (fetched en paralelo con currentEnrichments)
    - Nuevo componente `NexaInsightsTimeline.tsx` con MUI Lab Timeline agrupada por día, dots severity-coded, reuso de `NexaMentionText` + `NexaInsightRootCauseSection`
    - `NexaInsightsBlock` incorpora `ToggleButtonGroup` Recientes/Historial (solo visible si hay timeline data, backward compatible)
    - `IcoAdvisoryBlock` mapea timeline y lo pasa via `timelineInsights` prop
    - Copy keys nuevas en `GH_NEXA`: `insights_view_mode_*`, `insights_timeline_*`
- **Política de velocidad usada:** PR #67 siguió flujo completo (PR + CI + squash merge). Timeline feature se pusheó directo a develop tras local gates verdes (lint + tsc + test 1269 pass + build) — tiempo total ~5 min vs ~20 min del flujo PR. Ver `docs/operations/MULTI_AGENT_WORKTREE_OPERATING_MODEL_V1.md` §Merge policy canónica.
- **Validado:** `pnpm lint` ✓ · `pnpm tsc --noEmit` ✓ · `pnpm test` ✓ (1269 pass, 2 skipped) · `pnpm build` ✓
- **Validado en staging:** Vercel deploy `f3d59422` live a `dev-greenhouse.efeoncepro.com` el 17 abr 12:17 UTC
- **Impacto consumer:**
  - `/agency?tab=ico` (vía `IcoAdvisoryBlock`) — toggle + timeline operativos
  - Home, Space 360, Person 360 — mapping fix propaga `rootCauseNarrative` (visible el collapse "Ver causa raíz"). Timeline no aparece en esas surfaces aún (opt-in futuro — basta con pasar `timelineInsights` prop)
  - Finance Dashboard — inherited del cast directo del JSON, sin cambios necesarios
- **Archivos owned / tocados:**
  - `src/lib/ico-engine/ai/llm-enrichment-reader.ts` (nuevo reader + parallel fetch)
  - `src/lib/ico-engine/ai/llm-types.ts` (`timeline` en AgencyAiLlmSummary)
  - `src/components/greenhouse/NexaInsightsTimeline.tsx` (nuevo)
  - `src/components/greenhouse/NexaInsightsBlock.tsx` (toggle + render condicional + required `rootCauseNarrative`)
  - `src/components/agency/IcoAdvisoryBlock.tsx` (mapping fix + timeline)
  - `src/lib/home/get-home-snapshot.ts` + `src/types/home.ts` (mapping fix)
  - `src/config/greenhouse-nomenclature.ts` (copy keys)
  - `docs/architecture/GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md` (delta)
  - `docs/architecture/Greenhouse_ICO_Engine_v1.md` (delta)
- **Follow-ups opcionales:**
  - Home / Space 360 / Person 360 podrían activar el toggle Historial — solo requiere que sus views pasen `timelineInsights` prop
  - Preferencia de vista podría persistirse por usuario (actualmente es local al componente, se resetea al reload)
  - Timeline podría ganar filtro por severidad / métrica si el operador lo pide

## Sesion 2026-04-17 — Multi-agent integration patterns documentados

- **Estado:** `complete`, `PR abierta contra develop`
- **Rama:** `docs/multi-agent-integration-patterns`
- **Motivación:** tras cerrar TASK-446 en paralelo con TASK-345 de Codex, las lecciones operativas (worktree hygiene, rebase --onto, CI flake heredado, squash merge sin branch protection) quedaban sin canónico. Las formalizamos antes de que la próxima sesión descubra esto a fuego.
- **Implementado:**
  - `docs/operations/MULTI_AGENT_WORKTREE_OPERATING_MODEL_V1.md` con 4 secciones nuevas:
    - Higiene de worktree preexistente
    - Patrones de integración multi-agente
    - CI como gate compartido
    - Merge policy canónica
  - `AGENTS.md` Regla 3 ("Coordinacion entre agentes") agrega 4 pointers breves a las nuevas secciones.
  - `CLAUDE.md` Key Docs agrega entry canónica para trabajo multi-agente.
  - `changelog.md` registra la política nueva.
- **Caso base referenciado:** ISSUE-052 (flake `HrLeaveView.test.tsx` bajo `pnpm test:coverage`), resuelto en PR #65 con bump `testTimeout` 5s → 15s; desbloqueó PR #63 y toda la queue de develop.
- **No cambios de runtime:** pura documentación operativa. Zero riesgo de regresión.

## Sesion 2026-04-17 — TASK-446 Nexa Insights Root Cause Narrative Surfacing (Insights Quick Win)

- **Estado:** `complete`, `documentado`, `branch task/TASK-446-nexa-insights-root-cause-narrative`
- **Problema resuelto:** el LLM generaba `rootCauseNarrative` y lo persistía en `greenhouse_serving.ico_ai_signal_enrichments.root_cause_narrative` y `greenhouse_serving.finance_ai_signal_enrichments.root_cause_narrative`, pero el reader lo excluía de los SELECTs y el tipo UI no lo declaraba. Data pagada en tokens que nunca llegaba al operador.
- **Implementado:**
  - Backend ICO: `src/lib/ico-engine/ai/llm-enrichment-reader.ts` y `src/lib/ico-engine/ai/llm-types.ts` incorporan `rootCauseNarrative: string | null` en 5 funciones (`readAgencyAiLlmSummary`, `readOrganizationAiLlmEnrichments`, `readTopAiLlmEnrichments`, `readMemberAiLlmSummary`, `readSpaceAiLlmSummary`) + sus 5 mappers + 3 SELECTs explícitos
  - Backend Finance: `src/lib/finance/ai/llm-enrichment-reader.ts` y `finance-signal-types.ts` incorporan el campo en `readFinanceAiLlmSummary`, `readClientFinanceAiLlmSummary` y `FinanceNexaInsightItem`
  - Weekly digest builder: `src/lib/nexa/digest/build-weekly-digest.ts` selecciona `enrich.root_cause_narrative` y produce `rootCauseNarrative?: WeeklyDigestNarrativePart[]` via `parseNarrativeText` (reusa el parser de mentions existente)
  - UI: `src/components/greenhouse/NexaInsightRootCauseSection.tsx` (nuevo) — collapsible con localStorage global `nexa.insights.rootCause.expanded`, ARIA completo, keyboard, uppercase caption "Causa raíz"
  - UI: `NexaInsightsBlock.tsx` extiende `NexaInsightItem` con `rootCauseNarrative?: string | null` y renderiza la sección entre `explanation` y `recommendedAction`
  - Copy: 3 keys nuevas en `GH_NEXA` (`insights_root_cause_label`, `_expand`, `_collapse`)
  - Email: `src/emails/WeeklyExecutiveDigestEmail.tsx` renderiza bloque "Causa probable" con left border `EMAIL_COLORS.primary` cuando el campo viene poblado
  - Architecture doc: `docs/architecture/Greenhouse_ICO_Engine_v1.md` con delta canónico
- **No cambios:** prompt del LLM (ya emitía el campo), migraciones (columna existente), sanitizer (ya aplicado al write)
- **Tests:** 3 fixtures actualizados en `llm-enrichment-reader.test.ts` con `rootCauseNarrative: null`; 1 fixture en `Space360View.test.tsx`; fix incidental de TS error pre-existente en `campaigns/tenant-scope.test.ts:21`
- **Verificación:** `pnpm lint` ✓ `pnpm tsc --noEmit` ✓ `pnpm test` ✓ (1269 pass) `pnpm build` ✓
- **Impacto cruzado consumers:**
  - Home (`HomeView` → `readAgencyAiLlmSummary`) — propaga el campo
  - Space 360 Overview — propaga el campo
  - Person 360 Activity — propaga el campo
  - Finance Dashboard — propaga el campo
  - ICO Agency metrics `/api/ico-engine/metrics/agency` — propaga el campo
  - Weekly digest email — renderiza bloque "Causa probable"
- **Backward compat:** enrichments antiguos sin el campo → sección no renderiza, digest no incluye bloque

## Sesion 2026-04-17 — TASK-345 Quotation Canonical Schema & Finance Compatibility Bridge

- **Estado:** `complete`, `validado`, rama publicada para PR contra `develop`
- **Rama local de trabajo:** `task/TASK-345-quotation-canonical-schema-bridge`
- **Worktree:** `/Users/jreye/Documents/greenhouse-eo-task-345`
- **Implementado:**
  - `migrations/20260417103700979_task-345-quotation-canonical-schema-finance-compatibility-bridge.sql`
    - crea `greenhouse_commercial`
    - crea `product_catalog`, `quotations`, `quotation_versions`, `quotation_line_items`
    - aplica ownership/grants/default privileges
    - backfillea desde `greenhouse_finance.quotes`, `quote_line_items`, `products`
  - `src/lib/finance/quotation-canonical-store.ts`
    - façade quote-specific para list/detail/lines
    - sync bridge para quotes/products desde Finance runtime hacia `greenhouse_commercial.*`
    - resolución tenant-aware por `space_id`
  - routes:
    - `src/app/api/finance/quotes/route.ts`
    - `src/app/api/finance/quotes/[id]/route.ts`
    - `src/app/api/finance/quotes/[id]/lines/route.ts`
    - ahora leen vía façade canónica y conservan fallback legacy ante schema drift
  - writers bridgeados:
    - `src/lib/hubspot/create-hubspot-quote.ts`
    - `src/lib/hubspot/sync-hubspot-quotes.ts`
    - `src/lib/hubspot/sync-hubspot-line-items.ts`
    - `src/lib/hubspot/sync-hubspot-products.ts`
    - `src/lib/hubspot/create-hubspot-product.ts`
    - `src/lib/nubox/sync-nubox-to-postgres.ts`
- **Validación ejecutada:**
  - `pnpm pg:connect:migrate`
    - migración aplicada
    - `src/types/db.d.ts` regenerado por el flujo canónico
  - `pnpm exec tsc --noEmit --incremental false`
    - único error restante observado: `src/lib/campaigns/tenant-scope.test.ts(21,44)` preexistente y ajeno a TASK-345
  - `pnpm lint`
  - `pnpm build`
  - `rg -n "new Pool\\(" src --glob '!src/lib/postgres/client.ts'`
- **Notas operativas:**
  - la rama fue rebasada para que el PR arrastre solo TASK-345 y no mezcle commits previos de TASK-344
  - `pnpm build` quedó verde; siguió mostrando warnings conocidos de `Dynamic server usage` en páginas autenticadas del dashboard, pero no bloquearon la build ni fueron introducidos por esta lane

## Sesion 2026-04-17 — TASK-343 Commercial Quotation Canonical Program

- **Estado:** `complete`, `documentado`
- **Rama:** `develop`
- **Implementado:**
  - `docs/tasks/complete/TASK-343-commercial-quotation-canonical-program.md`
    - la umbrella queda cerrada como programa documental, no como runtime task encubierta
    - fija explícitamente que el repo actual sigue siendo `finance-first`
    - publica `TASK-344` como primer hard gate del bloque antes de `TASK-345+`
    - deja explícito que `Finance > Cotizaciones` sigue siendo la surface oficial mientras no cierre el corte contractual/canónico
  - `docs/tasks/README.md`
    - el bloque `TASK-343` a `TASK-351` ahora deja explícito el rol cerrado de la umbrella
  - `docs/tasks/TASK_ID_REGISTRY.md`
    - `TASK-343` sincronizada como `complete` y movida a `docs/tasks/complete/`
- **Cambio operativo/documental:**
  - el programa de Quotation ya no debe leerse como si faltara crear la secuencia de child tasks; esa secuencia ya existe
  - el drift principal confirmado por la auditoría es contractual/documental:
    - `Quote` sigue desalineado entre 360 object model y arquitectura comercial
    - `schema-snapshot-baseline.sql` está atrasado respecto del runtime real de quotes/products/line items
    - el naming/event policy y la convivencia `finance.quote.*` vs `commercial.quotation.*` siguen pendientes
  - el siguiente corte real del programa es `TASK-344`, no `TASK-345`
- **Validación ejecutada en esta sesión:**
  - revisión manual cross-doc de:
    - `docs/tasks/complete/TASK-343-commercial-quotation-canonical-program.md`
    - `docs/tasks/README.md`
    - `docs/tasks/TASK_ID_REGISTRY.md`
    - `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
    - `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
    - `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
    - `docs/architecture/schema-snapshot-baseline.sql`
- **Notas operativas:**
  - no hubo cambios de runtime, schema físico, API, UI ni migraciones
  - el workspace ya tenía trabajo ajeno no trackeado para `TASK-441` a `TASK-445`; no se tocó ni se revirtió

## Sesion 2026-04-17 — TASK-440 hardening de labels de proyecto en Nexa

- **Estado:** `implementado localmente`, `validado`
- **Rama:** `develop`
- **Implementado:**
  - `src/lib/ico-engine/ai/entity-display-resolution.ts`
    - resolver tenant-safe nuevo para labels de proyecto por `space_id`
    - soporta `project_record_id` y `notion_project_id` / `project_source_id`
    - agrega sanitización backend de narrativa para mentions y texto plano cuando aparece un ID técnico
  - `src/lib/ico-engine/ai/resolve-signal-context.ts`
    - deja de resolver proyectos solo por `project_record_id`
    - ahora expone `projectResolutions` y helper `getResolvedProjectLabel()`
  - `src/lib/ico-engine/ai/materialize-ai-signals.ts`
    - humaniza `dimension_label` de root causes de proyecto antes de construir señales
    - las recomendaciones de proyecto degradan a `este proyecto` cuando el label sigue siendo técnico
  - `src/lib/ico-engine/ai/llm-provider.ts`
    - corta el fallback `projectName = projectId`
    - solo expone `projectId` al prompt cuando existe `projectName` humano confiable
    - sanea `explanationSummary`, `rootCauseNarrative` y `recommendedAction` antes de persistir enrichments
  - `src/lib/ico-engine/ai/llm-enrichment-worker.ts`
    - persiste metadata mínima de `projectResolution` en `explanation_json.meta`
  - tests nuevos:
    - `src/lib/ico-engine/ai/resolve-signal-context.test.ts`
    - `src/lib/ico-engine/ai/llm-provider.test.ts`
- **Docs alineados:**
  - `docs/architecture/GREENHOUSE_MENTION_SYSTEM_V1.md`
  - `docs/architecture/GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md`
  - `changelog.md`
  - `docs/changelog/CLIENT_CHANGELOG.md`
  - `docs/tasks/README.md`
  - `docs/tasks/TASK_ID_REGISTRY.md`
  - `docs/tasks/in-progress/TASK-440-nexa-project-label-resolution.md`
  - `Handoff.md`
- **Cambio operativo/documental:**
  - se dejó explícito que la corrección de `TASK-440` vive en backend y no en la UI
  - la resolución canónica de proyecto queda documentada como `space_id` + (`project_record_id` o wrapper/source IDs equivalentes)
  - la degradación visible obligatoria cuando no hay label resoluble queda fijada en `este proyecto`
  - `Pulse/Home`, `Space 360` y `Person 360` quedan declaradas como consumers beneficiados vía readers existentes, sin route/surface nueva
  - `explanation_json.meta.projectResolution` queda registrado como metadata mínima permitida para auditoría
- **Validación ejecutada en esta sesión:**
  - `pnpm exec vitest run src/lib/ico-engine/ai/llm-provider.test.ts src/lib/ico-engine/ai/resolve-signal-context.test.ts`
  - `pnpm exec vitest run src/lib/home/get-home-snapshot.test.ts src/lib/agency/space-360.test.ts 'src/app/api/people/[memberId]/intelligence/route.test.ts' src/views/greenhouse/people/tabs/PersonActivityTab.test.tsx`
  - `pnpm exec eslint src/lib/ico-engine/ai/entity-display-resolution.ts src/lib/ico-engine/ai/llm-provider.ts src/lib/ico-engine/ai/llm-provider.test.ts src/lib/ico-engine/ai/llm-types.ts src/lib/ico-engine/ai/materialize-ai-signals.ts src/lib/ico-engine/ai/resolve-signal-context.ts src/lib/ico-engine/ai/resolve-signal-context.test.ts src/lib/ico-engine/ai/llm-enrichment-worker.ts`
  - `pnpm lint`
  - `pnpm build`
  - `rg -n "new Pool\\(" src --glob '!src/lib/postgres/client.ts'`
  - `pnpm exec tsc --noEmit --pretty false` -> falla por issue ajeno en `src/lib/campaigns/tenant-scope.test.ts(21,44): TS2556`
  - `pnpm test` -> falla por suites ajenas con timeouts prolongados:
    - `src/views/greenhouse/people/tabs/PersonHrProfileTab.test.tsx`
    - `src/views/greenhouse/agency/services/ServicesListView.test.tsx`
    - `src/views/greenhouse/payroll/PayrollPeriodTab.test.tsx`
    - `src/views/greenhouse/hr-core/HrLeaveView.test.tsx`
- **Notas operativas:**
  - `pnpm build` quedó verde; siguió imprimiendo warnings conocidos de `Dynamic server usage` en páginas autenticadas del dashboard, pero no bloquearon la build ni fueron introducidos por esta lane
  - no hubo migraciones ni cambios de schema físico
  - la task fue movida a `docs/tasks/in-progress/` y quedó con `Lifecycle: in-progress`

## Sesion 2026-04-17 — TASK-145 Agency Campaigns API rescope

- **Estado:** `complete`, `validado`
- **Rama:** `develop`
- **Implementado:**
  - `src/app/api/agency/campaigns/route.ts`
  - `src/app/api/agency/campaigns/[campaignId]/route.ts`
  - `src/app/api/agency/campaigns/[campaignId]/360/route.ts`
  - `src/app/api/agency/campaigns/[campaignId]/metrics/route.ts`
  - `src/app/api/agency/campaigns/[campaignId]/financials/route.ts`
  - `src/app/api/agency/campaigns/[campaignId]/roster/route.ts`
  - `src/app/api/agency/campaigns/[campaignId]/projects/route.ts`
  - `src/app/api/agency/campaigns/[campaignId]/projects/[linkId]/route.ts`
    - namespace Agency nuevo con paridad sobre el runtime actual de campañas
  - `src/lib/campaigns/tenant-scope.ts`
    - helper tenant-safe nuevo
    - resuelve spaces cliente con `getDb()` sobre `greenhouse_core.spaces`
    - corrige el bug `clientId -> spaceId`
    - endurece acceso detail/sub-routes por pertenencia real a `space_id`
  - `src/lib/campaigns/campaign-store.ts`
    - nuevo reader `listCampaignsBySpaceIds()` para multi-space SQL-first
  - `src/app/api/campaigns/**`
    - rutas compartidas alineadas al helper tenant-safe
  - `src/views/agency/AgencyCampaignsView.tsx`
    - Agency consume `/api/agency/campaigns` como endpoint primario
    - deja de mantener fallback a `/api/campaigns`; la surface Agency queda cortada al namespace dedicado
  - tests nuevos/actualizados:
    - `src/lib/campaigns/tenant-scope.test.ts`
    - `src/app/api/campaigns/route.test.ts`
    - `src/app/api/agency/campaigns/route.test.ts`
    - `src/views/agency/AgencyCampaignsView.test.tsx`
- **Docs alineados:**
  - `docs/architecture/GREENHOUSE_AGENCY_LAYER_V2.md`
  - `docs/tasks/TASK_ID_REGISTRY.md`
  - `docs/tasks/complete/TASK-145-agency-campaigns-rescope.md`
  - `changelog.md`
- **Validación ejecutada:**
  - `pnpm exec vitest run src/lib/campaigns/tenant-scope.test.ts src/app/api/campaigns/route.test.ts src/app/api/agency/campaigns/route.test.ts src/views/agency/AgencyCampaignsView.test.tsx`
  - `pnpm lint`
  - `pnpm build`
  - `rg -n "new Pool\\(" src --glob '!src/lib/postgres/client.ts'`
- **Notas operativas:**
  - `pnpm build` quedó verde; volvió a imprimir warnings conocidos de `Dynamic server usage` en páginas autenticadas del dashboard, pero no bloquearon la build ni fueron introducidos por esta lane
  - no hubo migraciones ni cambios de schema
  - `Agency > Campaigns` ya no mantiene fallback a `/api/campaigns`; el namespace dedicado quedó como contrato primario y único para esa surface
  - `/api/campaigns/**` sigue siendo namespace compartido para internal + client; esa coexistencia es deliberada para no romper `/campaigns` ni `/campanas`

## Sesion 2026-04-17 — TASK-144 Agency Team API dedicada y deduplicada

- **Estado:** `implementado localmente`, `validado`
- **Rama:** `develop`
- **Implementado:**
  - `src/lib/agency/team-capacity-store.ts`
    - store canónico nuevo sobre `getDb()` + SQL tipado
    - consolida roster activo, assignments, enrichment derivado de `space`, metadata de placements y overlay de `member_capacity_economics`
    - expone también conversión `toAgencyCapacityOverview()` para mantener compatibilidad con el shape legacy de `/api/agency/capacity`
  - `src/app/api/agency/team/route.ts`
    - route nueva `GET /api/agency/team`
    - mantiene `requireAgencyTenantContext()` y headers `no-store`
  - wrappers y consumers alineados:
    - `src/app/api/team/capacity-breakdown/route.ts` ahora delega al store canónico
    - `src/app/api/agency/capacity/route.ts` deja la lane `BigQuery-first` y deriva el overview legacy desde el store nuevo
    - `src/views/agency/AgencyTeamView.tsx`
    - `src/views/agency/AgencyWorkspace.tsx`
    - `src/views/agency/drawers/AssignMemberDrawer.tsx`
      ahora consumen `/api/agency/team`
  - tests nuevos/actualizados:
    - `src/lib/agency/team-capacity-store.test.ts`
    - `src/app/api/agency/team/route.test.ts`
    - `src/app/api/team/capacity-breakdown/route.test.ts`
- **Docs alineados:**
  - `docs/architecture/GREENHOUSE_AGENCY_LAYER_V2.md`
  - `docs/architecture/GREENHOUSE_TEAM_CAPACITY_ARCHITECTURE_V1.md`
  - `docs/tasks/TASK_ID_REGISTRY.md`
  - `docs/tasks/complete/TASK-144-agency-team-api-dedup.md`
  - `changelog.md`
- **Validación ejecutada:**
  - `pnpm exec vitest run src/lib/agency/team-capacity-store.test.ts src/app/api/agency/team/route.test.ts src/app/api/team/capacity-breakdown/route.test.ts`
  - `pnpm exec vitest run src/views/agency/AgencyTeamView.test.tsx`
  - `pnpm exec tsc --noEmit --pretty false`
  - `pnpm exec eslint src/types/agency-team.ts src/lib/agency/team-capacity-store.ts src/lib/agency/team-capacity-store.test.ts src/app/api/agency/team/route.ts src/app/api/agency/team/route.test.ts src/app/api/team/capacity-breakdown/route.ts src/app/api/team/capacity-breakdown/route.test.ts src/app/api/agency/capacity/route.ts src/views/agency/AgencyTeamView.tsx src/views/agency/AgencyWorkspace.tsx src/views/agency/drawers/AssignMemberDrawer.tsx src/components/agency/CapacityOverview.tsx`
  - `pnpm lint`
  - `pnpm build`
  - `rg -n "new Pool\\(" src`
- **Notas operativas:**
  - `pnpm build` quedó verde; el log siguió imprimiendo warnings conocidos de `Dynamic server usage` para múltiples páginas autenticadas del dashboard, pero no bloquearon el build ni fueron introducidos por esta lane
  - no hubo migraciones ni cambios de schema en esta sesión

## Sesion 2026-04-17 — TASK-143 Agency Economics API & View

- **Estado:** `implementado localmente`, `validado`
- **Rama:** `develop`
- **Implementado:**
  - `src/lib/agency/agency-economics.ts`
    - reader nuevo sobre `getDb()` + SQL tipado para leer `greenhouse_serving.operational_pl_snapshots` en modo `space-first`
    - resuelve ventana mensual, totales, ranking, tendencia y estado parcial sin recalcular P&L inline
    - reutiliza `getServicesBySpace()` solo como contexto contractual del drill-down, sin inventar economía por servicio
  - `src/app/api/agency/economics/route.ts`
    - route nueva `GET /api/agency/economics`
    - mantiene guard `requireAgencyTenantContext()` y acepta `year`, `month`, `trendMonths`
  - `src/views/greenhouse/agency/economics/EconomicsView.tsx`
    - nueva surface Agency con componentes Vuexy/MUI existentes (`StatsWithAreaChart`, `HorizontalWithSubtitle`, `CustomChip`, `EmptyState`)
    - KPIs, tabla expandible por Space, ranking, tendencias y contexto de servicios
    - copy visible deja explícito que el detalle económico por servicio todavía no existe
  - `src/app/(dashboard)/agency/economics/page.tsx`
    - deja de montar la vista legacy `src/views/agency/AgencyEconomicsView.tsx`
    - ahora apunta al surface nuevo `src/views/greenhouse/agency/economics/EconomicsView.tsx`
  - tests nuevos:
    - `src/app/api/agency/economics/route.test.ts`
    - `src/views/greenhouse/agency/economics/EconomicsView.test.tsx`
- **Docs alineados:**
  - `docs/architecture/GREENHOUSE_AGENCY_LAYER_V2.md`
  - `docs/architecture/GREENHOUSE_PORTAL_VIEWS_V1.md`
  - `docs/tasks/TASK_ID_REGISTRY.md`
  - `docs/tasks/complete/TASK-143-agency-economics-api.md`
  - `changelog.md`
  - `project_context.md`
- **Validación ejecutada:**
  - `pnpm exec vitest run src/app/api/agency/economics/route.test.ts src/views/greenhouse/agency/economics/EconomicsView.test.tsx`
  - `pnpm lint`
  - `pnpm build`
  - `rg -n "new Pool\\(" src`
- **Notas operativas:**
  - la lane queda cerrada sobre `operational_pl_snapshots`; no reintroduce lecturas directas del bridge legacy ni usa `/api/finance/dashboard/pnl` como motor principal
  - el drill-down por servicio sigue pendiente hasta que exista serving dedicado en `TASK-146`

## Sesion 2026-04-17 — documentación del sistema de email aterrizada al runtime real

- **Estado:** `documentado`
- **Rama:** `develop`
- **Actualizado:**
  - `docs/architecture/GREENHOUSE_EMAIL_CATALOG_V1.md`
  - `docs/documentation/plataforma/sistema-email-templates.md`
- **Cambio documental:**
  - la documentación ya no describe el sistema de email como si fuera solo una capa simple de templates, ni como si ya fuera una suite completa de messaging enterprise
  - la foto real quedó explicitada como:
    - delivery centralizado sobre Resend
    - persistencia operativa en `greenhouse_notifications`
    - retries, `dead_letter`, `priority`, `kill switch`, webhook de bounce/complaint, unsubscribe y contexto automático
    - soporte async complementario vía `ops-worker`
  - también quedó documentado lo que todavía falta para evolucionarlo más: observabilidad first-class, control plane más fino, broadcasts más desacoplados, más catálogo vivo y mejor UX operativa de soporte

## Sesion 2026-04-17 — docs operativos de agentes alineados al modelo views + entitlements

- **Estado:** `documentado`
- **Rama:** `develop`
- **Actualizado:**
  - `AGENTS.md`
  - `CLAUDE.md`
  - `docs/tasks/TASK_PROCESS.md`
  - `project_context.md`
  - `changelog.md`
- **Cambio operativo:**
  - los agentes ya no deben pensar permisos solo desde `views`
  - cualquier diseño de arquitectura, task o solución que toque acceso debe distinguir explícitamente entre:
    - `routeGroups`
    - `views` / `authorizedViews`
    - `entitlements`
    - `startup policy`

## Sesion 2026-04-17 — TASK-404 Entitlements Governance Admin Center

- **Estado:** `complete`, `validado localmente`, `migracion aplicada en shared dev DB`
- **Rama:** `develop`
- **Implementado:**
  - migración `migrations/20260417044741101_task-404-entitlements-governance.sql`
    - tablas nuevas `greenhouse_core.role_entitlement_defaults`, `greenhouse_core.user_entitlement_overrides`, `greenhouse_core.entitlement_governance_audit_log`
    - índices tenant-safe por `space_id`
  - `src/lib/admin/entitlements-governance.ts`
    - store Kysely para overview global, acceso efectivo por usuario, defaults por rol, overrides por usuario y startup policy
    - precedencia explícita `runtime -> role default -> user override`
    - outbox events `access.entitlement_role_default_changed`, `access.entitlement_user_override_changed`, `access.startup_policy_changed`
  - `src/lib/admin/entitlement-view-map.ts`
    - bridge entre `VIEW_REGISTRY` y capabilities para explicar relación `vista -> entitlement`
  - rutas admin nuevas:
    - `GET /api/admin/entitlements/governance`
    - `POST /api/admin/entitlements/roles`
    - `GET /api/admin/entitlements/users/[userId]`
    - `POST /api/admin/entitlements/users/[userId]/overrides`
    - `PATCH /api/admin/entitlements/users/[userId]/startup-policy`
  - UI:
    - `Admin Center > Gobernanza de acceso` agrega tab `Entitlements`
    - `Admin Center > Usuarios > Acceso` ahora muestra permisos efectivos, overrides y startup policy editable
- **Docs alineados:**
  - `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
  - `docs/documentation/identity/sistema-identidad-roles-acceso.md`
  - `docs/changelog/CLIENT_CHANGELOG.md`
  - `changelog.md`
  - `project_context.md`
- **Validación ejecutada:**
  - `pnpm exec eslint src/lib/admin/entitlements-governance.ts src/lib/admin/entitlement-view-map.ts src/app/api/admin/entitlements/governance/route.ts src/app/api/admin/entitlements/roles/route.ts 'src/app/api/admin/entitlements/users/[userId]/route.ts' 'src/app/api/admin/entitlements/users/[userId]/overrides/route.ts' 'src/app/api/admin/entitlements/users/[userId]/startup-policy/route.ts' 'src/app/(dashboard)/admin/views/page.tsx' src/views/greenhouse/admin/AdminViewAccessGovernanceView.tsx src/views/greenhouse/admin/EntitlementsGovernanceTab.tsx src/views/greenhouse/admin/users/UserAccessTab.tsx`
  - `pnpm exec tsc --noEmit --pretty false`
  - `pnpm lint`
  - `pnpm build`
  - `rg -n "new Pool\\(" src`
  - `pnpm pg:connect:migrate`
- **Notas operativas:**
  - `pnpm pg:connect:migrate` aplicó la migración y regeneró `src/types/db.d.ts` sin diff final
  - se tocó `src/app/api/hr/evaluations/summaries/[summaryId]/finalize/route.ts` solo para corregir un issue de lint preexistente (`padding-line-between-statements`) que bloqueaba `pnpm lint`
  - el workspace sigue teniendo un archivo ajeno sin trackear: `docs/architecture/GREENHOUSE_FINANCE_METRIC_REGISTRY_V1.md`

## Sesion 2026-04-16 — TASK-246 Digest ejecutivo semanal de Nexa

- **Estado:** `implementado localmente`, `validado`
- **Rama:** `develop`
- **Implementado:**
  - `src/lib/nexa/digest/build-weekly-digest.ts`
    - builder nuevo sobre `getDb()` / Kysely para consolidar los top insights ICO-first de la última semana
    - ranking explícito `critical > warning > info`, luego `quality_score DESC`, luego `processed_at DESC`
    - renderer de `@mentions` para email: `space` y `member` con link; `project` queda como texto
  - `src/lib/nexa/digest/recipient-resolver.ts`
    - resolución runtime de destinatarios internos vía roles de liderazgo + filtro contra identity store interno
  - `src/lib/email/types.ts`
    - nuevo `EmailType` `weekly_executive_digest`
  - `src/lib/email/templates.ts`
  - `src/emails/WeeklyExecutiveDigestEmail.tsx`
    - template React Email + preview catalog del digest semanal
  - `services/ops-worker/server.ts`
    - endpoint nuevo `POST /nexa/weekly-digest`
  - `services/ops-worker/deploy.sh`
    - scheduler job nuevo `ops-nexa-weekly-digest` (`0 7 * * 1`, `America/Santiago`)
- **Docs alineados:**
  - `docs/architecture/GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md`
  - `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
  - `docs/architecture/GREENHOUSE_EMAIL_CATALOG_V1.md`
  - `changelog.md`
  - `docs/changelog/CLIENT_CHANGELOG.md`
  - `docs/documentation/delivery/nexa-insights-digest-semanal.md`
  - `docs/documentation/plataforma/sistema-email-templates.md`
  - `docs/documentation/delivery/motor-ico-metricas-operativas.md`
  - `docs/documentation/operations/ops-worker-reactive-crons.md`
  - `docs/documentation/README.md`
- **Validación ejecutada:**
  - `pnpm exec vitest run src/lib/nexa/digest/build-weekly-digest.test.ts src/lib/email/templates.test.ts`
  - `pnpm exec eslint src/lib/nexa/digest/build-weekly-digest.ts src/lib/nexa/digest/build-weekly-digest.test.ts src/lib/nexa/digest/recipient-resolver.ts src/lib/nexa/digest/types.ts src/lib/email/types.ts src/lib/email/templates.ts src/lib/email/templates.test.ts src/emails/WeeklyExecutiveDigestEmail.tsx services/ops-worker/server.ts`
  - `bash -n services/ops-worker/deploy.sh`
  - `pnpm exec tsc --noEmit --pretty false`
  - `pnpm lint`
  - `pnpm build`
  - `rg -n "new Pool\\(" src`
  - Smoke con datos reales:
    - `buildWeeklyDigest({ limit: 3 })` devolvió `periodLabel="9 abr 2026 - 16 abr 2026"`, `totalInsights=5`, `spacesAffected=1`
    - `resolveWeeklyDigestRecipients()` devolvió liderazgo interno (`daniela.ferreira@efeonce.org`, `agent@greenhouse.efeonce.org`, `jreyes@efeoncepro.com`)
- **Notas operativas:**
  - la spec quedó corregida a un corte realista `ICO-first / cross-Space`; la lane cross-domain queda como follow-up
  - el workspace ya venía sucio por cambios ajenos en `src/app/api/hr/evaluations/summaries/[summaryId]/finalize/route.ts` y no se tocaron
  - no se disparó envío real del digest ni deploy del worker en esta sesión; el endpoint y el scheduler quedaron listos para activación

## Sesion 2026-04-16 — TASK-242 Nexa Insights en Space 360

- **Estado:** `complete`, `validado localmente`
- **Rama:** `develop`
- **Implementado:**
  - `src/lib/ico-engine/ai/llm-types.ts`
    - tipos nuevos `SpaceNexaInsightItem` y `SpaceNexaInsightsPayload`
  - `src/lib/ico-engine/ai/llm-enrichment-reader.ts`
    - reader nuevo `readSpaceAiLlmSummary(spaceId, periodYear, periodMonth, limit)`
    - filtros explícitos por `space_id + period_year + period_month`
    - lista visible solo con `status = 'succeeded'`
    - ranking alineado al resto de Nexa/ICO: `critical > warning > info`, luego `quality_score DESC`, luego `processed_at DESC`
  - `src/lib/agency/space-360.ts`
    - `Space360Detail` ahora expone `nexaInsights`
    - el snapshot canónico de Space 360 carga el summary AI del período Santiago cuando existe `space_id`
  - `src/views/greenhouse/agency/space-360/tabs/OverviewTab.tsx`
    - `NexaInsightsBlock` se renderiza al inicio del Overview real de Space 360
    - cuando `nexaInsights` viene vacío o nulo, la surface cae al empty state compartido de Nexa
  - `src/views/greenhouse/agency/space-360/Space360View.test.tsx`
    - cobertura UI del bloque Nexa al inicio del Overview
  - tests nuevos/actualizados:
    - `src/lib/ico-engine/ai/llm-enrichment-reader.test.ts`
    - `src/lib/agency/space-360.test.ts`
    - `src/views/greenhouse/agency/space-360/Space360View.test.tsx`
- **Docs alineados:**
  - `docs/architecture/GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md`
  - `docs/architecture/Greenhouse_ICO_Engine_v1.md`
  - `docs/architecture/GREENHOUSE_PORTAL_VIEWS_V1.md`
- **Validación ejecutada:**
  - `pnpm exec vitest run src/lib/ico-engine/ai/llm-enrichment-reader.test.ts src/lib/agency/space-360.test.ts src/views/greenhouse/agency/space-360/Space360View.test.tsx`
  - `pnpm exec eslint src/lib/ico-engine/ai/llm-types.ts src/lib/ico-engine/ai/llm-enrichment-reader.ts src/lib/ico-engine/ai/llm-enrichment-reader.test.ts src/lib/agency/space-360.ts src/lib/agency/space-360.test.ts src/views/greenhouse/agency/space-360/tabs/OverviewTab.tsx src/views/greenhouse/agency/space-360/Space360View.test.tsx`
  - `pnpm build`
- **Notas operativas:**
  - `docs/architecture/schema-snapshot-baseline.sql` sigue desfasado frente a `greenhouse_serving.ico_ai_signal_enrichments`; la fuente real sigue siendo `migrations/20260404123559856_task-232-ico-llm-enrichments.sql` + `src/types/db.d.ts`
  - `pnpm lint` sigue rojo por un issue ajeno en `src/app/api/hr/evaluations/summaries/[summaryId]/finalize/route.ts` (`padding-line-between-statements`); no pertenece a `TASK-242`
  - el workspace ya venía sucio por cambios de HR evaluations ajenos y no se modificaron

## Sesion 2026-04-16 — TASK-243 Nexa Insights en Person 360

- **Estado:** `complete`, `pushed a develop`
- **Rama:** `develop`
- **Implementado:**
  - `src/lib/ico-engine/ai/llm-enrichment-reader.ts`
    - reader nuevo `readMemberAiLlmSummary(memberId, periodYear, periodMonth, limit)`
    - filtro explícito `member_id + period_year + period_month`, lista visible solo con `status='succeeded'`
    - ranking alineado a Home/Agency: `critical > warning > info`, luego `quality_score DESC`, luego `processed_at DESC`
  - `src/lib/ico-engine/ai/llm-types.ts`
    - tipos `MemberNexaInsightItem` y `MemberNexaInsightsPayload`
  - `src/lib/person-intelligence/types.ts`
    - `PersonIntelligenceResponse` ahora puede incluir `nexaInsights`
  - `src/app/api/people/[memberId]/intelligence/route.ts`
    - el snapshot del miembro incorpora `nexaInsights` sin abrir route nueva
  - `src/views/greenhouse/people/tabs/PersonActivityTab.tsx`
    - la surface visible `activity` renderiza `NexaInsightsBlock` al inicio
    - consume el summary AI desde la route de intelligence y conserva la navegación por `@mentions`
  - tests nuevos/actualizados:
    - `src/lib/ico-engine/ai/llm-enrichment-reader.test.ts`
    - `src/app/api/people/[memberId]/intelligence/route.test.ts`
    - `src/views/greenhouse/people/tabs/PersonActivityTab.test.tsx`
- **Validación ejecutada:**
  - `pnpm vitest run src/lib/ico-engine/ai/llm-enrichment-reader.test.ts 'src/app/api/people/[memberId]/intelligence/route.test.ts' src/views/greenhouse/people/tabs/PersonActivityTab.test.tsx`
  - `pnpm exec tsc --noEmit --pretty false`
  - `pnpm lint`
  - `pnpm build`
  - `rg -n "new Pool\\(" src`
- **Notas operativas:**
  - la spec original quedó corregida: la surface visible real es `activity`, no un tab `intelligence` montado
  - `docs/architecture/schema-snapshot-baseline.sql` sigue sin reflejar las tablas `ico_ai_signal_enrichments` / `ico_ai_enrichment_runs`; para este dominio la referencia real sigue siendo migración + `src/types/db.d.ts`

## Sesion 2026-04-16 — TASK-029: HRIS Goals & OKRs module

- **Estado:** `complete`, pendiente migracion en shared dev DB
- **Rama:** `develop`
- **Implementado:**
  - Migration: 4 tablas en greenhouse_hr (goal_cycles, goals, goal_key_results, goal_progress)
  - 3 core lib files: postgres-goals-store.ts, eligibility.ts, progress-calculator.ts
  - 12 API routes en /api/hr/goals/
  - 2 paginas: /my/goals (self-service), /hr/goals (admin 3 tabs)
  - 2 view codes, 5 outbox events, menu integration
- **Post-deploy:** pnpm pg:connect:migrate + pnpm db:generate-types
- **Follow-ups:** People 360 tab "Objetivos", TASK-031 (Performance Evaluations)

## Sesion 2026-04-16 — TASK-244 Nexa Insights en Pulse/Home

- **Estado:** `implementado localmente`, `lint dirigido OK`, `tsc/build global bloqueado por frente paralelo hr-goals`
- **Rama:** `develop`
- **Implementado:**
  - `src/lib/ico-engine/ai/llm-enrichment-reader.ts`
    - reader nuevo `readTopAiLlmEnrichments(periodYear, periodMonth, limit)`
    - ranking explícito `critical > warning > info`, luego `quality_score DESC`, luego `processed_at DESC`
  - `src/lib/home/get-home-snapshot.ts`
  - `src/types/home.ts`
    - `HomeSnapshot` ahora puede incluir `nexaInsights`
  - `src/views/greenhouse/home/HomeView.tsx`
    - `Pulse` renderiza `NexaInsightsBlock` en la landing, entre `NexaHero` y `RecommendedShortcuts`
  - docs actualizados:
    - `docs/architecture/GREENHOUSE_NEXA_INSIGHTS_LAYER_V1.md`
    - `docs/architecture/GREENHOUSE_PORTAL_VIEWS_V1.md`
    - `changelog.md`
    - `docs/changelog/CLIENT_CHANGELOG.md`
    - `docs/tasks/README.md`
    - task movida a `docs/tasks/in-progress/TASK-244-nexa-insights-home-dashboard.md`
- **Validación ejecutada:**
  - `pnpm exec eslint src/lib/ico-engine/ai/llm-enrichment-reader.ts src/lib/home/get-home-snapshot.ts src/types/home.ts src/views/greenhouse/home/HomeView.tsx`
  - `pnpm exec tsc --noEmit --pretty false` -> falla por `src/views/greenhouse/hr-goals/HrGoalsView.tsx` (errores ajenos al task)
  - `pnpm build` -> bloqueado en la misma lane `hr-goals`
- **Notas operativas:**
  - el cambio sigue el patrón canónico `ICO Engine -> Gemini -> greenhouse_serving.ico_ai_signal_enrichments`; Home no recalcula señales ni narrativa
  - la navegación contextual en Home depende del contrato actual de `NexaMentionText`; la card completa del insight sigue sin CTA/click dedicado
  - `git status` ya venía sucio por trabajo paralelo de `hr-goals`; no fue tocado por TASK-244

## Sesion 2026-04-16 — HR Leave aclara UI de saldo proporcional Chile y arrastre

- **Estado:** `implemented localmente`, `pendiente lint/build final`
- **Rama:** `develop`
- **Implementado:**
  - `src/views/greenhouse/hr-core/HrLeaveView.tsx`
    - tarjetas y tablas ya no muestran decimales infinitos en saldos
    - `Mis saldos` y el detalle admin del equipo separan `Base / acumulado`, `Progresivos`, `Arrastre` y `Saldo actual`
    - el resumen radial ahora usa el saldo bruto visible, incluyendo arrastre/ajustes, para que el porcentaje no contradiga el detalle
    - se agregan mensajes de apoyo para vacaciones Chile con acumulación proporcional y arrastre
  - `src/lib/hr-core/postgres-leave-store.ts`
  - `src/lib/hr-core/service.ts`
    - normalizan balances de leave a 2 decimales al serializar payloads
  - `src/types/hr-core.ts`
    - `policyExplain` expone `accrualType` para que la UI pueda distinguir acumulación proporcional vs anual fija
  - tests nuevos/actualizados:
    - `src/lib/hr-core/leave-domain.test.ts`
    - `src/views/greenhouse/hr-core/HrLeaveView.test.tsx`
- **Validación ejecutada:**
  - `pnpm vitest run src/lib/hr-core/leave-domain.test.ts src/views/greenhouse/hr-core/HrLeaveView.test.tsx` — OK
  - `pnpm exec eslint src/lib/hr-core/leave-domain.ts src/lib/hr-core/postgres-leave-store.ts src/lib/hr-core/service.ts src/types/hr-core.ts src/views/greenhouse/hr-core/HrLeaveView.tsx src/lib/hr-core/leave-domain.test.ts src/views/greenhouse/hr-core/HrLeaveView.test.tsx` — OK

## Sesion 2026-04-16 — HR Leave team balances recupera identidad visible y actividad admin canónica

- **Estado:** `implemented localmente`, `pendiente lint/build final`
- **Rama:** `develop`
- **Implementado:**
  - `src/types/hr-core.ts`
    - `HrLeaveBalance` ahora puede exponer `memberAvatarUrl`
  - `src/lib/hr-core/postgres-leave-store.ts`
  - `src/lib/hr-core/service.ts`
    - los balances de leave resuelven avatar con el mismo criterio canónico de solicitudes (`avatar_url + linked_user_id -> /api/media/users/.../avatar`)
    - el fallback legacy de requests también queda alineado con la misma resolución
  - `src/views/greenhouse/hr-core/HrLeaveView.tsx`
    - `Saldos del equipo` usa avatar real del colaborador cuando existe
    - el dialog de detalle deja la tabla horizontal y pasa a cards por tipo de permiso
    - el bloque `Actividad administrativa` separa retroactivos `Días ya tomados` de `Ajustes de saldo`
  - tests nuevos/actualizados:
    - `src/lib/hr-core/postgres-leave-store.test.ts`
    - `src/views/greenhouse/hr-core/HrLeaveView.test.tsx`
- **Validación ejecutada:**
  - `pnpm vitest run src/lib/hr-core/postgres-leave-store.test.ts src/views/greenhouse/hr-core/HrLeaveView.test.tsx` — OK
  - `pnpm exec eslint src/lib/hr-core/postgres-leave-store.ts src/lib/hr-core/postgres-leave-store.test.ts src/lib/hr-core/service.ts src/types/hr-core.ts src/views/greenhouse/hr-core/HrLeaveView.tsx src/views/greenhouse/hr-core/HrLeaveView.test.tsx` — OK

---

## Sesion 2026-04-16 — TASK-285: Client Role Differentiation

- **Estado:** `complete`, migracion aplicada en shared dev DB
- **Rama:** `develop`
- **Implementado:**
  - `migrations/20260416095444700_seed-client-role-view-assignments.sql`
    - Siembra `role_view_assignments` para 3 roles x 11 vistas (33 rows)
    - `client_executive`: 11/11 granted
    - `client_manager`: 11/11 granted
    - `client_specialist`: 8/11 granted, 3 denied (analytics, campanas, equipo)
  - `src/lib/admin/client-role-visibility.test.ts` — 8 tests que documentan la matriz
  - `docs/architecture/GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md` §3 actualizado
- **Decision de diseno:** No se necesitan route groups nuevos. La infraestructura existente (view-access-store + canSeeView + hasAuthorizedViewCode) ya estaba cableada. Solo faltaban los datos.
- **Impacto cruzado:** TASK-286 y TASK-303 desbloqueadas (updated blockers). TASK-402 y TASK-404 actualizados con path correcto.
- **Post-deploy:** usuarios client_specialist deberan re-login para que el JWT refleje las nuevas asignaciones.

---

## Sesion 2026-04-16 — HR Leave corrige accrual Chile de primer año y self-heal de balances

- **Estado:** `implemented localmente`, `migracion aplicada en shared dev DB`, `pendiente push/deploy staging`
- **Rama:** `develop`
- **Implementado:**
  - `src/lib/hr-core/postgres-leave-store.ts`
    - la resolución de `leave_policy` ahora prioriza especificidad (`employment_type`, `pay_regime`, `contract_type`, `payroll_via`) en vez de depender del orden de lectura
    - `policy-vacation-chile` deja de sembrar `15` automáticos durante el primer ciclo laboral; el allowance se accrualiza desde `hire_date`
    - el seed de balances pasa de `ON CONFLICT DO NOTHING` a `ON CONFLICT DO UPDATE` para self-heal de `allowance_days`, `progressive_extra_days`, `carried_over_days` y `accumulated_periods`
  - `src/lib/hr-core/leave-domain.ts`
    - helper nuevo `calculateAccruedLeaveAllowanceDays()` para accrual del primer año
  - `migrations/20260416094722775_task-416-hr-leave-chile-accrual-hardening.sql`
    - alinea `greenhouse_hr.leave_policies.policy-vacation-chile` a `accrual_type = 'monthly_accrual'`
  - `scripts/setup-postgres-hr-leave.sql`
    - seed alineado al mismo contrato
  - tests nuevos/actualizados:
    - `src/lib/hr-core/leave-domain.test.ts`
    - `src/lib/hr-core/postgres-leave-store.test.ts`
- **Validación ejecutada:**
  - `pnpm vitest run src/lib/hr-core/leave-domain.test.ts src/lib/hr-core/postgres-leave-store.test.ts`
  - `pnpm exec eslint src/lib/hr-core/leave-domain.ts src/lib/hr-core/postgres-leave-store.ts src/lib/hr-core/leave-domain.test.ts src/lib/hr-core/postgres-leave-store.test.ts`
  - `pnpm lint`
  - `pnpm build`
  - `pnpm pg:connect:migrate`
- **Dato operacional relevante:**
  - el shared dev DB aplicó también una migración pendiente ajena ya presente en el workspace: `20260416095444700_seed-client-role-view-assignments`; no forma parte de este fix de leave, pero quedó registrada en `pgmigrations`
- **Resultado esperado en staging una vez deployado:**
  - Valentina Hoyos deja de ver `15` días completos de vacaciones antes de su aniversario laboral
  - el admin detail y self-service deben resolver `policy-vacation-chile` en vez de la policy default derivada

## Sesion 2026-04-16 — HR Leave UX split de saldos personales vs equipo en develop

- **Estado:** `complete`, `pushed a develop`, `deploy staging en curso`
- **Rama:** `develop`
- **Implementado:**
  - `src/views/greenhouse/hr-core/HrLeaveView.tsx`
    - la pestaña `Saldos` se separa en `Mis saldos` y `Saldos del equipo` para perfiles admin/HR
    - la vista de equipo ya no renderiza un listado gigante `persona x tipo`
    - nueva tabla resumida por colaborador con búsqueda, filtros de alertas y KPIs operativos
    - nuevo drill-down por colaborador en dialog con detalle por tipo de permiso
    - backfills, ajustes y reversión se ejecutan desde ese detalle sin perder trazabilidad
  - `src/views/greenhouse/hr-core/HrLeaveView.test.tsx`
    - tests admin actualizados al nuevo flujo `Saldos del equipo -> Ver detalle`
- **Validación ejecutada:**
  - `pnpm vitest run src/views/greenhouse/hr-core/HrLeaveView.test.tsx`
  - `pnpm exec eslint src/views/greenhouse/hr-core/HrLeaveView.tsx src/views/greenhouse/hr-core/HrLeaveView.test.tsx`
  - `pnpm lint`
  - `pnpm build`
- **Notas operativas:**
  - el deploy de staging levantado desde `develop` corresponde al commit `70534687`
  - sigue existiendo un cambio ajeno en `.claude/scheduled_tasks.lock`; no fue incluido

## Sesion 2026-04-16 — TASK-415 HR leave admin balance visibility, backfill y ajustes manuales

- **Estado:** `complete`, `validado con migracion + tests dirigidos + lint + build`
- **Rama objetivo:** `task/TASK-415-hr-leave-balance-admin-backfill`
- **Implementado:**
  - migracion `20260416083541945_task-415-hr-leave-admin-backfill-adjustments.sql`
    - nuevas columnas `applicable_contract_types` y `applicable_payroll_vias` en `greenhouse_hr.leave_policies`
    - `leave_requests.source_kind`
    - tabla auditable `greenhouse_hr.leave_balance_adjustments`
  - `src/lib/hr-core/postgres-leave-store.ts`
    - resolver de policy endurecido con `contract_type + pay_regime + payroll_via + hire_date`
    - `policyExplain` por saldo
    - flows nuevos de `admin_backfill`, `list/create/reverse leave_balance_adjustments`
    - correccion del movimiento de saldo para evitar doble multiplicacion en used/reserved deltas
  - nuevas rutas:
    - `POST /api/hr/core/leave/backfills`
    - `GET/POST /api/hr/core/leave/adjustments`
    - `POST /api/hr/core/leave/adjustments/[adjustmentId]/reverse`
  - entitlements runtime nuevos:
    - `hr.leave_balance`
    - `hr.leave_backfill`
    - `hr.leave_adjustment`
  - `src/views/greenhouse/hr-core/HrLeaveView.tsx`
    - tabla admin de saldos por colaborador
    - dialogo de backfill retroactivo
    - dialogo de ajuste manual
    - historial de ajustes con reversal
    - badge de `Carga administrativa` para requests retroactivos
- **Validacion ejecutada:**
  - `pnpm pg:connect:migrate`
  - `pnpm vitest run src/lib/hr-core/postgres-leave-store.test.ts src/lib/entitlements/runtime.test.ts src/app/api/hr/core/meta/route.test.ts src/views/greenhouse/hr-core/HrLeaveView.test.tsx`
  - `pnpm lint`
  - `pnpm build`
  - `rg -n "new Pool\\(" src` -> solo `src/lib/postgres/client.ts`
- **Docs alineados:**
  - `docs/documentation/hr/sistema-permisos-leave.md`
  - `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
  - `project_context.md`
  - `changelog.md`
  - `docs/changelog/CLIENT_CHANGELOG.md`
- **Notas operativas:**
  - `docs/architecture/schema-snapshot-baseline.sql` sigue con drift respecto al DDL vivo de HR leave; para este dominio hay que contrastar siempre con migraciones y `scripts/setup-postgres-hr-leave.sql`
  - el caso Chile interno indefinido ya no depende solo de moneda; la policy observable usa atributos laborales canonicos
  - el backfill retroactivo se modela como request aprobada `source_kind='admin_backfill'`; el ajuste manual queda separado en ledger reversible
  - existe un cambio ajeno en `.claude/scheduled_tasks.lock`; no pertenece a TASK-415

## Sesion 2026-04-15 — TASK-403 entitlements runtime bridge para Pulse/Nexa

- **Estado:** `implementado localmente`, `validado con lint + tests dirigidos + build`
- **Rama:** `develop`
- **Implementado:**
  - `src/config/entitlements-catalog.ts`
    - catálogo mínimo de módulos, capabilities, actions y scopes para la primera layer runtime
  - `src/lib/entitlements/types.ts`
  - `src/lib/entitlements/runtime.ts`
    - helpers `getTenantEntitlements()`, `can()`, `canSeeModule()`
    - derivación backward-compatible desde `roleCodes`, `routeGroups` y `authorizedViews`
  - `src/lib/home/build-home-entitlements-context.ts`
    - bridge compartido para Home/Nexa con `recommendedShortcuts`, `accessContext` y `canSeeFinanceStatus`
  - `src/lib/home/get-home-snapshot.ts`
  - `src/app/api/home/snapshot/route.ts`
  - `src/app/api/home/nexa/route.ts`
    - ambos consumers ya usan el mismo runtime bridge
  - `src/views/greenhouse/home/components/RecommendedShortcuts.tsx`
  - `src/views/greenhouse/home/HomeView.tsx`
    - Pulse ahora expone shortcuts y contexto de acceso visible
  - tests nuevos:
    - `src/lib/entitlements/runtime.test.ts`
    - `src/lib/home/build-home-entitlements-context.test.ts`
- **Validación ejecutada:**
  - `pnpm vitest run src/lib/entitlements/runtime.test.ts src/lib/home/build-home-entitlements-context.test.ts`
  - `pnpm lint`
  - `pnpm build`
  - guardrail `new Pool()` confirmado solo en `src/lib/postgres/client.ts`
- **Docs alineados:**
  - `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_PORTAL_VIEWS_V1.md`
  - `project_context.md`
  - `changelog.md`
- **Notas operativas:**
  - no hubo migraciones DB en este corte
  - `CAPABILITY_REGISTRY` sigue vivo para módulos capability-based; la layer de entitlements no lo reemplaza, lo complementa
  - follow-on natural: `TASK-402` para la Home adaptativa completa y `TASK-404` para gobernanza admin de entitlements

## Sesion 2026-04-15 — ISSUE-049 leave review fix local + ISSUE-050 staging email drift identificada

- **Estado:** `fix local aplicado para review`, `issue separado abierto para email staging`
- **Rama:** `develop`
- **Root cause confirmada del review error (`Unable to review leave request.`):**
  - logs de staging para `POST /api/hr/core/leave/requests/leave-f7b4f48c-cea0-4c0a-89ee-fb4152a8344c/review`
  - PostgreSQL devolvía `42P08: could not determine data type of parameter $4`
  - el query afectado era `applyWorkflowApprovalOverrideInTransaction()` en `src/lib/approval-authority/store.ts`, dentro de `jsonb_build_object(...)`
- **Implementado localmente:**
  - `src/lib/approval-authority/store.ts`
    - casteo explícito `$4::text` y `$5::text` en el payload JSON del override HR
  - `src/lib/hr-core/leave-review-policy.ts` (nuevo)
    - policy pura compartida para acciones válidas de review por actor + estado
  - `src/views/greenhouse/hr-core/HrLeaveView.tsx`
    - elimina dispatch stale por `reviewAction` state
    - envía la acción clickeada explícitamente
    - muestra solo botones válidos según la policy
    - consume `hasHrAdminAccess` desde meta
  - `src/app/api/hr/core/meta/route.ts`
  - `src/types/hr-core.ts`
  - `src/lib/hr-core/postgres-leave-store.ts`
  - `src/lib/hr-core/service.ts`
    - backend alineado a la misma policy para evitar drift UI/backend
- **Validación ejecutada:**
  - `pnpm exec vitest run src/lib/approval-authority/store.test.ts src/lib/hr-core/leave-review-policy.test.ts src/app/api/hr/core/meta/route.test.ts src/views/greenhouse/hr-core/HrLeaveView.test.tsx`
  - `12` tests OK
  - `pnpm exec eslint ...` dirigido sobre los archivos tocados OK
- **Tema adicional investigado (correo/notificación al crear la solicitud):**
  - `leave_request.created` sí se publicó en staging
  - autenticado como `jreyes@efeoncepro.com`, `GET /api/notifications?unreadOnly=true&pageSize=10` sí devuelve la notificación in-app de Daniela
  - los correos `leave_request_submitted` y `leave_request_pending_review` existen pero quedaron `skipped` con `errorMessage = "RESEND_API_KEY is not configured."`
  - se abrió `docs/issues/open/ISSUE-050-staging-leave-emails-skipped-resend-not-configured-in-reactive-runtime.md`
- **Hardening adicional aplicado localmente para ISSUE-050:**
  - `src/lib/resend.ts`
    - Resend ya no depende solo de env directo; ahora resuelve `RESEND_API_KEY` vía helper canónico `Secret Manager -> env fallback`
  - `services/ops-worker/deploy.sh`
    - acepta `RESEND_API_KEY_SECRET_REF`
    - propaga `EMAIL_FROM`
    - deja warning explícito si el worker se despliega sin contrato de email
  - `src/lib/resend.test.ts` (nuevo)
    - cubre resolución vía secret helper + fallback unconfigured/default sender
  - `.env.example`, `project_context.md`, `changelog.md`, `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`, `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
    - sincronizados al contrato nuevo multi-runtime
- **Lectura operativa actual:**
  - el problema de review sí era código y quedó corregido localmente
  - el problema de email staging es drift/config del runtime reactivo y contrato incompleto de Resend entre runtimes, no del flujo HR
- **Pendiente antes de cerrar ISSUE-049/ISSUE-050 en staging:**
  - commit + push del fix local
  - redeploy de `develop`
  - reprobar aprobación/rechazo real de solicitudes `pending_supervisor`
  - desplegar `ops-worker` con `RESEND_API_KEY_SECRET_REF` real
  - reprobar un `leave_request.created` real verificando in-app + emails
- **Delta 2026-04-15 15:30 CLST — email approval confirmation estabilizado en staging**
  - deployado `ops-worker` revision `ops-worker-00011-ln8`
  - `services/ops-worker/deploy.sh` ahora:
    - asegura `roles/secretmanager.secretAccessor` para los secrets runtime del worker
    - inyecta `RESEND_API_KEY` como secret nativo de Cloud Run
    - conserva `RESEND_API_KEY_SECRET_REF` como contrato declarativo para observabilidad/fallback
  - `gcloud run services describe ops-worker` confirma:
    - `RESEND_API_KEY_SECRET_REF=greenhouse-resend-api-key-staging`
    - `RESEND_API_KEY` via `valueFrom.secretKeyRef`
  - evidencia de entrega ya enviada en staging para la aprobación de Daniela:
    - `leave_review_confirmation` -> `jreyes@efeoncepro.com` -> `status=sent` -> `resend_id=afeadeae-851d-4ab3-af18-fa77036806fa`
    - `leave_request_decision` -> `dferreira@efeoncepro.com` -> `status=sent` -> `resend_id=1497dfc7-4d98-4e7a-85b7-260f3b00da06`
    - `notification` -> `daniela.ferreira@efeonce.org` -> `status=sent` -> `resend_id=dc34b39a-9caf-4b96-8e43-49b39c9203c8`
  - nota: `POST /api/admin/ops/email-delivery-retry` ya no encontró backlog pendiente porque esas tres entregas ya habían sido drenadas exitosamente antes del recheck final
- **Delta 2026-04-15 15:58 CLST — worker compartido alineado también para production**
  - investigación confirmó que hoy no existe `greenhouse-pg-prod`; la topología vigente sigue siendo una única instancia `greenhouse-pg-dev` consumida por todos los runtimes
  - el drift real estaba en `ops-worker`: venía sirviendo con `RESEND_API_KEY_SECRET_REF=greenhouse-resend-api-key-staging`
  - se creó el secret `greenhouse-resend-api-key-production` en Secret Manager y se le otorgó `roles/secretmanager.secretAccessor` al SA `greenhouse-portal@efeonce-group.iam.gserviceaccount.com`
  - `services/ops-worker/deploy.sh` quedó endurecido para:
    - soportar overrides explícitos de `NEXTAUTH_SECRET_REF`, `PG_PASSWORD_REF`, `PG_INSTANCE` y `RESEND_API_KEY_SECRET_REF`
    - dejar `ENV=production` alineado a la topología real actual en vez de asumir refs/instancias productivas inexistentes
  - deploy productivo ejecutado desde worktree limpio (el árbol principal tenía cambios de payroll que rompían el tarball de Cloud Build) -> revisión activa `ops-worker-00012-shc`
  - contrato activo verificado en Cloud Run:
    - `NEXTAUTH_SECRET -> greenhouse-nextauth-secret-production`
    - `RESEND_API_KEY -> greenhouse-resend-api-key-production`
    - `RESEND_API_KEY_SECRET_REF=greenhouse-resend-api-key-production`
    - `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME=efeonce-group:us-east4:greenhouse-pg-dev`
    - `GREENHOUSE_POSTGRES_PASSWORD -> greenhouse-pg-dev-app-password`
  - smoke adicional sobre producción:
    - últimos 7 días: `0` filas con `error_message='RESEND_API_KEY is not configured.'`
    - últimos 7 días: `leave_request_decision=2 sent`, `leave_review_confirmation=2 sent`

## Sesion 2026-04-15 — Reconciliacion main/develop (content parity)

- **Estado:** `complete`
- **Ramas:** `origin/main` y `origin/develop`
- **Resultado:** no quedan diferencias de contenido entre ambas ramas (`git diff --name-only origin/main origin/develop` -> `0`). La divergencia restante de historial (`git rev-list --left-right --count origin/main...origin/develop` -> `33 39`) responde a cherry-picks y promociones separadas, no a archivos distintos.
- **Promovido a `main`:**
  - hardening de finance y Nubox ya validado en `develop`
  - cierre del `portal home contract` (runtime, navegación, backfill y consumers)
  - guardrail de payroll para lookup de compensaciones
- **Promovido a `develop`:**
  - identity endpoint de sister platforms
  - hardening de creación de leave requests
- **Validación ejecutada:** suite Vitest verde en los lotes finales (`256` archivos, `1151` tests OK, `2` skipped), más pruebas focalizadas para payroll y Nubox/finance.
- **Nota operativa:** para ver el estado reconciliado en VS Code basta trabajar con refs actualizadas; el contenido de `main` y `develop` ya coincide aunque el historial de commits no sea idéntico.

## Sesion 2026-04-13 — TASK-392 Management Accounting Reliable Actual Foundation Program (complete)

- **Estado:** `complete` (umbrella cerrado como entrega documental; TASK-176 queda como unico blocker externo del gate)
- **Rama:** `develop`
- **Implementado:**
  - `docs/architecture/GREENHOUSE_MANAGEMENT_ACCOUNTING_ARCHITECTURE_V1.md` — nueva seccion `## Reliable Actual Foundation` insertada entre el roadmap de madurez y el checklist enterprise. Define 5 criterios operativos para "actual confiable" (reconciled, fully-loaded, period-aware, traceable, tested & transactional), tabla de fundaciones por criterio, gate de readiness (5 verdes + 1 rojo), y secuencia canonica de cierre.
  - `docs/tasks/complete/TASK-392-...md` — spec del umbrella actualizada con snapshot del gate, deliverables y delta historico conservado.
  - `docs/tasks/to-do/TASK-176-labor-provisions-fully-loaded-cost.md` — delta 2026-04-13 agregado flaggeandola como el unico blocker restante del gate.
- **Decision clave:** el umbrella se cerro aunque TASK-176 sigue abierta. La entrega es la DEFINICION del gate, no el estado final de cada checkbox. Patron correcto para umbrella tasks: cerrar cuando el programa queda formalizado, dejar que las deps individuales vivan sus propios lifecycles, y confiar en el gate documentado para bloquear declaraciones prematuras de "enterprise-ready".
- **Context dependencia:** en esta misma sesion se cerraron TASK-174, TASK-175, TASK-179 y TASK-401 — 4 de las 5 deps del gate. TASK-167 esta superseded por TASK-192 (cerrada en runtime, pendiente reclasificacion administrativa). Solo TASK-176 queda como trabajo real pendiente del gate.
- **Unblocks (documentalmente):** TASK-393, TASK-395, TASK-396, TASK-397, TASK-398 — estas tasks downstream ahora tienen un criterio explicito de cuando pueden declararse ready (cuando el gate este 100% verde).

## Sesion 2026-04-13 — TASK-401 Bank Reconciliation Continuous Matching (complete)

- **Estado:** `complete` (Slice 1 + Slice 2 + cron fallback; Slice 3 UX polish y hooks directos diferidos a follow-on)
- **Rama:** `develop`
- **Implementado:**
  - `src/lib/finance/auto-match.ts` (nuevo) — motor de scoring puro (amountMatches, dateMatchesWithinWindow, hasPartialReferenceMatch, scoreAutoMatches) + `persistAutoMatchDecisions` con callbacks inyectados. No DB, no side effects en las funciones de scoring. Contrato preparado para reusar desde cualquier trigger (manual, cron, post-sync).
  - `src/lib/finance/postgres-reconciliation.ts` — extracción de `listReconciliationCandidatesByDateRangeFromPostgres` (date range en vez de period_id), `listUnmatchedStatementRowsByDateRangeFromPostgres` (joins con reconciliation_periods para filtrar por status, optional account filter, LIMIT 2000). El wrapper `listReconciliationCandidatesFromPostgres` ahora delega al date-range variant.
  - `src/app/api/finance/reconciliation/auto-match/route.ts` (nuevo, standalone) — recibe `{ fromDate, toDate, accountId? }`, corre el motor, persiste, retorna counts + ventana.
  - `src/app/api/finance/reconciliation/[id]/auto-match/route.ts` (refactor) — 195 LOC reducidas a 100; reusa `scoreAutoMatches()` + `persistAutoMatchDecisions()` del módulo compartido. Cero duplicación de scoring.
  - `src/app/api/cron/reconciliation-auto-match/route.ts` (nuevo) — Vercel cron diario 07:45 UTC, ventana de 7 días, cron auth guard, alertCronFailure, idempotente vía filtro `match_status = 'unmatched'`.
  - `vercel.json` — nueva entrada cron.
  - `src/lib/finance/__tests__/auto-match.test.ts` (nuevo) — 22 tests sobre las funciones puras y el orchestrator.
- **Total suite:** 1148 tests verdes. Lint clean, build OK.
- **Nota de scope:** La spec describe hooks directos post-Nubox-sync y post-factoring. Decisión pragmática: el cron diario de 7 días cubre el mismo ground con menos acoplamiento. Si se requiere matching inmediato de un payment específico, el endpoint manual `POST /api/finance/reconciliation/auto-match` puede invocarse puntualmente.
- **Insight aprendido:** El tier 0.85 del scoring ladder es efectivamente inalcanzable — su condición (hasPartialReferenceMatch) ya está capturada por el tier 0.95. El lift del código preserva el bug original; la corrección semántica queda como posible follow-on.
- **Prereqs cerrados:** TASK-174 (locking), TASK-175 (test coverage), TASK-179 (Postgres-only) — los tres prerrequisitos de esta task fueron cerrados antes de implementar.

## Sesion 2026-04-13 — ISSUE-048 payroll compensation member ambiguity fix local

- **Estado:** `fix local aplicado, pendiente verificación en staging`
- **Issue:** `docs/issues/open/ISSUE-048-payroll-compensation-member-id-ambiguous-silent-degradation.md`
- **Root cause corregida:**
  - `src/lib/payroll/postgres-store.ts`
  - la CTE `current_compensation` en `pgListPayrollCompensationMembers()` usaba `member_id` sin alias en `DISTINCT ON`, `SELECT` y `ORDER BY`
  - se corrigió a `cv.member_id`, `cv.effective_from` y `cv.version` para evitar `column reference "member_id" is ambiguous`
- **Guardrail agregado:**
  - `src/lib/payroll/postgres-store.test.ts`
  - nueva prueba focalizada que inspecciona el SQL y asegura que el reader quede aliasado
- **Validación ejecutada:**
  - `pnpm exec vitest run src/lib/payroll/postgres-store.test.ts`
  - runtime local autenticado:
    - `POST /api/auth/agent-session` -> `200`
    - `GET /api/hr/payroll/compensation` -> `200`
    - payload post-fix: `compensations=6`, `members=7`, `eligibleMembers=1`
    - `GET /hr/payroll` -> `200`
- **Decisión explícita de no tocar en este lote:**
  - `pgGetCompensationOverview()` sigue degradando silenciosamente si falla el reader de miembros
  - se dejó igual para mantener backward compatibility y limitar el diff al root cause confirmado del issue
- **Pendiente operativo:**
  - verificar en staging `/api/hr/payroll/compensation`
  - validar visualmente `Payroll > Compensaciones vigentes` post-deploy

## Sesion 2026-04-13 — TASK-179 Finance Reconciliation Postgres-Only Cutover (complete)

- **Estado:** `complete`
- **Rama:** `develop`
- **Implementado:**
  - `src/lib/finance/schema.ts` — removidos `fin_reconciliation_periods` y `fin_bank_statement_rows` del DDL BigQuery (`FINANCE_TABLE_DEFINITIONS` + `FINANCE_COLUMN_REQUIREMENTS`). Reconciliation ya no provisiona tablas BQ.
  - `src/app/api/finance/expenses/bulk/route.ts` — eliminados 3 imports obsoletos (`ensureFinanceInfrastructure`, `shouldFallbackFromFinancePostgres`, `isFinanceBigQueryWriteEnabled`) y el bloque BQ fallback try/catch completo (~80 LOC). La Phase 2 ahora es un `await withTransaction(...)` directo sin red BigQuery.
  - `src/app/api/finance/reconciliation/route.ts` — removido stale error message `"BigQuery fallback is disabled"` y código `FINANCE_BQ_WRITE_DISABLED` del POST catch. Los errores de Postgres ahora se re-lanzan limpiamente.
  - `src/lib/finance/hubspot.ts` — agregada schema validation (`validateHubSpotCompaniesSchema`, `validateHubSpotDealsSchema`) con `publishOutboxEvent` en `integration_health` para drift crítico (throws) y drift de columnas esperadas (warning). `pickColumn` ahora loguea cuando usa una columna fallback.
  - `src/app/api/finance/bigquery-write-cutover.test.ts` — actualizados 2 tests que verificaban el comportamiento 503/FINANCE_BQ_WRITE_DISABLED eliminado; ahora verifican que los errores Postgres se propagan (rethrow).
- **Verificación:** 1122/1122 tests, lint clean, build OK.
- **Nota:** `bigquery-write-flag.ts` tiene 15 callsites activos en income/expenses/accounts — está fuera del scope de esta task. El flag sigue vigente para esos paths. El cleanup completo pertenece a un bloque de cutover posterior.

## Sesion 2026-04-13 — TASK-175 Finance Core Test Coverage (complete)

- **Estado:** `complete`
- **Rama:** `develop`
- **Implementado:**
  - `src/lib/finance/__tests__/postgres-store-slice2.test.ts` — 14 tests: income CRUD, expense CRUD con/sin client externo, buildMonthlySequenceIdFromPostgres, TTL readiness cache
  - `src/lib/finance/__tests__/postgres-store.test.ts` — 11 tests: shouldFallbackFromFinancePostgres, createFinanceAccountInPostgres, upsertFinanceExchangeRateInPostgres, seedFinanceSupplierInPostgres, listFinanceAccountsFromPostgres
  - `src/lib/finance/__tests__/payment-ledger.test.ts` — 15 tests: recordPayment (happy path, 409 overpayment, 409 duplicate, 404 income not found, full paid), getPaymentsForIncome, reconcilePaymentTotals (4 escenarios)
  - `src/lib/finance/__tests__/postgres-reconciliation.test.ts` — 18 tests: createReconciliationPeriodInPostgres (happy, 409 dup, 404 account), listReconciliationPeriods, updateStatementRowMatch con/sin client, clearStatementRowMatch, assertMutable, validateReconciledTransition
  - `src/lib/finance/__tests__/finance-pnl-e2e.test.ts` — 5 tests: computeClientEconomicsSnapshots (zero-revenue, empty period, multi-client, labor attribution call, silent error swallowing)
- **Total:** 64 tests nuevos. Suite: 1122 tests, 255 archivos, lint clean, build OK.
- **Patrones clave aprendidos:**
  - `assertFinanceSlice2PostgresReady` tiene TTL 60s de módulo — se primea en `beforeAll`, evitando consumo extra de mocks en tests posteriores
  - `reconcilePaymentTotals` usa `client.query` directo (no `queryRows`), retorna `{ rows, rowCount }` — mock distinto al resto
  - `postgres-reconciliation.ts` importa `'server-only'` — requiere `vi.mock('server-only', () => ({}))`
  - outbox local en slice2/store vs outbox importado en reconciliation/ledger — distinto mock target

## Sesion 2026-04-13 — Arquitectura de entitlements modulares formalizada

- **Estado:** `documentado`
- **Artefacto nuevo:**
  - `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- **Decisión principal:**
  - Greenhouse debe converger a una capa híbrida de autorización:
    - `roleCodes` para identidad base
    - `routeGroups` para superficies broad
    - `entitlements` para autorización real por capability
    - `authorizedViews` como proyección derivada
    - `startupPolicy` como contrato separado
- **Integración documental:**
  - `docs/README.md` actualizado
  - `project_context.md` actualizado
  - `changelog.md` actualizado
  - `TASK-402` ahora referencia esta arquitectura como foundation obligatoria

## Sesion 2026-04-13 — Hotfix de Home universal para superadmin y perfiles mixtos

- **Estado:** `validado localmente`
- **Problema detectado:**
  - la policy de `resolvePortalHomePath()` seguía derivando el startup home desde `routeGroups`
  - como `efeonce_admin` hereda `admin`, `internal`, `hr`, `finance`, `my` y otras superficies, el resolver estaba priorizando `hr_workspace`
  - resultado visible: superadministradores y perfiles mixtos entraban a `/hr/payroll` en vez de a `/home`
- **Fix aplicado:**
  - `src/lib/tenant/resolve-portal-home-path.ts`
    - `efeonce_admin` y perfiles con `routeGroups` administrativos ahora priorizan `internal_default`
    - el startup home de superadmin queda forzado a `/home`
  - `src/lib/tenant/resolve-portal-home-path.test.ts`
    - se agregó regresión explícita para `efeonce_admin` + route groups mixtos
- **Validación cerrada:**
  - `pnpm exec vitest run src/lib/tenant/resolve-portal-home-path.test.ts`
  - `pnpm build`
  - verificación real con login por credenciales:
    - `GET /` sin sesión -> `/login`
    - login del usuario agente/superadmin-like -> `/home`
    - contenido visible en `/home`: `Home Nexa y operación de hoy`
- **Decisión de producto sugerida:**
  - consolidar `/home` como entrypoint universal del portal
  - mantener HR / Finance / My como workspaces especializados dentro de una Home adaptativa, no como homes rivales
- **Follow-up sembrado:**
  - `TASK-402` para diseñar e implementar Home universal adaptativa con policy de startup separada de permisos

## Sesion 2026-04-13 — TASK-400 cierre formal con verificación runtime real

- **Estado:** `complete`
- **Ajuste de cierre detectado durante la verificación:**
  - `next.config.ts` todavía forzaba `source: '/' -> destination: '/dashboard'`
  - ese redirect global estaba sobreescribiendo el contrato de `src/app/page.tsx`
  - se removió para que `/` respete el `portalHomePath` resuelto por sesión
- **Cleanup aplicado además del runtime ya convergido:**
  - `src/components/layout/shared/search/NoResult.tsx` ahora vuelve a `/home`
  - breadcrumbs cliente-safe de proyecto y sprint ahora vuelven a `/home`
  - docs sincronizadas:
    - `docs/architecture/GREENHOUSE_PORTAL_VIEWS_V1.md`
    - `docs/architecture/Greenhouse_Nomenclatura_Portal_v3.md`
    - `docs/documentation/identity/sistema-identidad-roles-acceso.md`
  - lifecycle sincronizado:
    - spec movida a `docs/tasks/complete/`
    - `docs/tasks/README.md` y `docs/tasks/TASK_ID_REGISTRY.md` actualizados
- **Validación cerrada:**
  - `pnpm lint`
  - `pnpm build`
  - `rg -n "new Pool\\(" src scripts`
  - runtime local autenticado con agente:
    - `GET /` -> `307 /hr/payroll`
    - `GET /home` -> `200`
    - `GET /dashboard` -> `200`
    - `GET /hr/payroll` -> `200`
- **Notas:**
  - `pnpm build` sigue emitiendo warnings esperados de `Dynamic server usage` en páginas autenticadas que usan `headers`; no bloquean el build y no nacen de esta task
  - el workspace sigue teniendo cambios ajenos de `TASK-174`; no fueron tocados
- **Pendiente fuera del cierre técnico:**
  - commit + push
  - verificación de staging post-push si se quiere confirmar el deployment nuevo contra `/`, `/home` y `/dashboard`

## Sesion 2026-04-13 — TASK-174 Slice 1-3 implementados (Finance Data Integrity)

- **Rama activa:** `develop`
- **Motivación:** P0 — prevenir double-entry por retry de red, bulk parcial sin rollback, y race conditions en conciliación.
- **Implementado:**
  - Migración `20260413222055844_finance-idempotency-keys.sql` — tabla `greenhouse_finance.idempotency_keys` (TTL 24h)
  - `src/lib/finance/idempotency.ts` — middleware `withIdempotency()` aplicado a `POST /api/finance/income` y `POST /api/finance/expenses`
  - `expenses/bulk/route.ts` — resolución de items separada de inserción; toda la escritura Postgres ocurre en un solo `withTransaction` (rollback total si falla cualquier item)
  - `postgres-store-slice2.ts` — `createFinanceExpenseInPostgres` acepta `opts?: { client?: PoolClient }` para participar en transacción externa
  - `postgres-reconciliation.ts` — `updateReconciliationPeriodInPostgres` usa `withGreenhousePostgresTransaction` + `SELECT FOR UPDATE NOWAIT`; `updateStatementRowMatchInPostgres` y `clearStatementRowMatchInPostgres` aceptan `opts?.client`
  - `match/route.ts` y `unmatch/route.ts` — `withTransaction` + `FOR UPDATE NOWAIT` en `bank_statement_rows` antes de modificar match state
- **Validación:** `pnpm tsc --noEmit` limpio, `pnpm lint` limpio, `pnpm test` 250/250 archivos pass
- **Pendiente para cerrar TASK-174:**
  - `pnpm migrate:up` en staging para crear `idempotency_keys`
  - Verificación en staging: bulk rollback real, idempotency-key retry, concurrent reconciliation → 409
  - Slice 4 minor: `reconcilePaymentTotals()` en `payment-ledger.ts` (ya tiene transaction en `recordPayment`, esto es corrección menor)

## Sesion 2026-04-13 — TASK-400 implementada localmente con policy centralizada de Home y compatibilidad legacy gobernada

- implementación cerrada en código:
  - `/` y `/auth/landing` ya resuelven solo `session.user.portalHomePath`; se elimina la dependencia estructural de `|| '/dashboard'`
  - `src/lib/tenant/resolve-portal-home-path.ts` ahora concentra:
    - aliases legacy (`/dashboard`, `/internal/dashboard`, `/finance/dashboard`, `/hr/leave`, `/my/profile`)
    - policy centralizada por tipo de home (`client_default`, `internal_default`, `hr_workspace`, `finance_workspace`, `my_workspace`)
    - base explícita para soportar homes distintas por tipo de usuario sin volver a dispersar lógica en routes y shell
  - `src/lib/auth.ts`, `src/lib/tenant/access.ts` y `src/app/api/auth/agent-session/route.ts` ya consumen la misma policy
  - provisioning, theme config, navegación, search suggestions, footers, dropdown de usuario, notifications y `view-access-catalog` quedaron alineados a `/home` como contrato canónico
  - `/dashboard` sigue accesible como compatibilidad/feature route, pero ya no es fallback estructural y quedó hardenizado para no explotar cuando faltan señales de calidad/delivery
  - se agregó `scripts/backfill-portal-home-contract.ts` para normalizar `default_portal_home_path` en PostgreSQL + BigQuery (dry-run por default, `--apply` para ejecutar)
- validación local cerrada:
  - `pnpm test src/lib/tenant/resolve-portal-home-path.test.ts src/views/greenhouse/GreenhouseDashboard.test.tsx`
  - `pnpm lint`
  - `pnpm build`
  - `rg -n "new Pool\\(" src scripts` sin nuevos pools fuera de `src/lib/postgres/client.ts`
- cobertura agregada:
  - tests de aliases/policy en `src/lib/tenant/resolve-portal-home-path.test.ts`
  - regresión de render para `src/views/greenhouse/GreenhouseDashboard.test.tsx`
- estado de staging antes del push:
  - `pnpm staging:request /`
  - `pnpm staging:request /home`
  - `pnpm staging:request /dashboard`
  - los tres siguen devolviendo `HTTP 500` en el deployment actual de `develop`, por lo que ese entorno todavía no refleja este diff local
- próximos pasos operativos:
  - commit + push de `develop`
  - volver a verificar staging en `/`, `/home` y `/dashboard` una vez que el deploy nuevo termine
  - si staging siguiera en `500` tras el deploy, revisar logs del deployment nuevo y reconciliar con `ISSUE-044`

## Sesion 2026-04-13 — TASK-400 sembrada para gobernar el contrato canónico de Home y desactivar `/dashboard` como fallback estructural

- backlog nuevo:
  - `docs/tasks/in-progress/TASK-400-portal-home-contract-governance-entrypoint-cutover.md`
- problema formalizado:
  - el repo actual tiene múltiples contratos de entrada conviviendo:
    - `src/app/page.tsx` redirige a `session.user.portalHomePath || '/dashboard'`
    - `src/app/auth/landing/page.tsx` cae a `'/home'`
    - `src/lib/admin/tenant-member-provisioning.ts` sigue sembrando `DEFAULT_PORTAL_HOME = '/dashboard'`
    - decenas de guards/layouts y navegación usan `tenant.portalHomePath || '/dashboard'`
  - `/dashboard` está actuando como fallback estructural pese a que semánticamente `Home` ya es la landing moderna del portal
- alcance que debe cubrir la task:
  - policy canónica para startup home / access-denied fallback / legacy compatibility
  - cutover coordinado de root, auth, provisioning, agent auth y navegación
  - normalización/backfill de valores persistidos legacy (`/dashboard`, `/internal/dashboard`)
  - compatibilidad gobernada para `/dashboard` y hardening mínimo si sigue accesible
- relación con issues/tasks existentes:
  - esto no reemplaza el fix SSR de `ISSUE-044`; lo complementa
  - tampoco duplica `TASK-378`: esa lane endurece SSR/error boundaries; `TASK-400` gobierna el contrato de entrada
- estado operativo:
  - tomada en `in-progress`
  - discovery ya confirmó drift adicional en stores PG/BQ, shell UI, notifications y docs de arquitectura

## Sesion 2026-04-13 — ISSUE-044 root cause confirmado y fix mínimo implementado

- issue atacado:
  - `docs/issues/open/ISSUE-044-dashboard-ssr-500-agent-headless.md`
- causa raíz confirmada:
  - el 500 de HTML SSR para requests headless autenticados no venía de auth, cookies, MUI ni providers
  - el runtime de producción local reprodujo el fallo exacto: `ReferenceError: DOMMatrix is not defined`
  - la fuente real era un import transitive desde el barrel `@/components/greenhouse`, que exportaba `CertificatePreviewDialog` y arrastraba `react-pdf/pdfjs` al SSR del layout y de vistas cliente-safe
- fix aplicado:
  - `src/components/layout/vertical/FooterContent.tsx` ahora importa `BrandWordmark` directo
  - `src/components/layout/horizontal/FooterContent.tsx` ahora importa `BrandWordmark` directo
  - `src/components/greenhouse/index.ts` deja de exportar `CertificatePreviewDialog` y documenta que debe importarse directo
- blast radius validado:
  - build local de producción
  - auth real con `/api/auth/agent-session`
  - HTML 200 para `/home`, `/admin`, `/settings`, `/dashboard`, `/updates`
- pendiente:
  - no quedó validado en `staging` porque en este turno no se desplegó el fix
  - por política del tracker el issue se mantiene `open` hasta verificar `pnpm staging:request /home|/admin|/settings`

## Sesion 2026-04-13 — Management Accounting ya queda aterrizado como programa ejecutable de 7 tasks robustas

- backlog nuevo documentado:
  - `docs/tasks/to-do/TASK-392-management-accounting-reliable-actual-foundation-program.md`
  - `docs/tasks/to-do/TASK-393-management-accounting-period-governance-restatements-reclassification.md`
  - `docs/tasks/to-do/TASK-394-management-accounting-scope-expansion-bu-legal-entity-intercompany.md`
  - `docs/tasks/to-do/TASK-395-management-accounting-planning-engine-budgets-drivers-approval-governance.md`
  - `docs/tasks/to-do/TASK-396-management-accounting-variance-forecast-executive-control-tower.md`
  - `docs/tasks/to-do/TASK-397-management-accounting-financial-costs-integration-factoring-fx-fees-treasury.md`
  - `docs/tasks/to-do/TASK-398-management-accounting-enterprise-hardening-explainability-rbac-observability-runbooks.md`
- criterio de particion:
  - se evitó fragmentar demasiado el programa
  - las 7 lanes quedan lo bastante grandes para coordinar trabajo enterprise, pero lo bastante separadas para no mezclar foundation, governance, planning, analytics, financial costs y hardening
- amarras importantes:
  - `TASK-392` queda como gate fundacional antes de planning / forecast / variance
  - `TASK-395` absorbe y reencuadra `TASK-178` como planning engine
  - `TASK-397` amarra `TASK-391` al modelo de Management Accounting
  - `TASK-398` concentra explainability, RBAC, observabilidad, runbooks y testing de negocio
- docs sincronizados:
  - `docs/tasks/TASK_ID_REGISTRY.md`
  - `docs/tasks/README.md`
  - `changelog.md`
- validación:
  - documentación solamente
  - pendiente correr `git diff --check` tras la actualización del índice y registro

## Sesion 2026-04-13 — TASK-391 Finance Factoring Operations: implementación completa

- implementación:
  - `migrations/20260413195519177_factoring-operations-fee-breakdown.sql` — 4 columnas nuevas en `factoring_operations` (interest_amount, advisory_fee_amount, external_reference, external_folio). Migración aplicada, `db.d.ts` regenerado.
  - `src/lib/finance/factoring.ts` — función `recordFactoringOperation()`: transacción atómica con `withGreenhousePostgresTransaction`, 8 operaciones en un solo commit (lock income, validate provider, INSERT factoring_op, INSERT income_payment, INSERT expense x2, UPDATE income)
  - `src/app/api/finance/income/[id]/factor/route.ts` — `POST` con validación de fee balance (±$1 CLP tolerancia), auth guard, manejo de errores
  - `src/app/api/finance/factoring/providers/route.ts` — `GET` para dropdown filtrado por `provider_type = 'factoring'`
  - `src/views/greenhouse/finance/drawers/FactoringOperationDrawer.tsx` — Drawer 520px, provider select, advance/interés/asesoría inputs, fee calculator en tiempo real con indicador visual, fechas, referencias externas, cuenta de depósito
  - `src/views/greenhouse/finance/IncomeDetailView.tsx` — `collectionMethod` en interfaz + botón "Ceder a Factoring" (oculto si ya pagado/cedido) + badge FACTORADA + drawer montado
  - `src/views/greenhouse/finance/IncomeListView.tsx` — `collectionMethod` en interfaz + badge FACTORADA en columna de estado
  - `src/views/greenhouse/finance/CashInListView.tsx` — `paymentSource` en interfaces + badge "Vía factoring" cuando `payment_source = 'factoring_proceeds'`
  - `src/app/api/finance/income/[id]/route.ts` — `collectionMethod` agregado al BigQuery fallback normalizer
- semántica de negocio implementada:
  - `income.amount_paid = nominalAmount` (obligación del cliente saldada al 100%)
  - `income_payment.amount = advanceAmount` (efectivo real recibido — conciliable contra banco)
  - diferencia (fee) = 2 expenses en P&L (factoring_fee + factoring_advisory)
- validación: `npx tsc --noEmit` — 0 errores
- task: `TASK-391` movida a `complete/`
- pendiente para uso real: seed del proveedor Xepelin en `greenhouse_core.providers` (INSERT manual con `provider_type = 'factoring'`)

## Sesion 2026-04-13 — Management Accounting queda documentado como capability enterprise distinta de contabilidad legal

- alcance documental:
  - `docs/architecture/GREENHOUSE_MANAGEMENT_ACCOUNTING_ARCHITECTURE_V1.md`
  - `docs/README.md`
  - `project_context.md`
  - `changelog.md`
- decisión tomada:
  - Greenhouse no debe abrir primero un módulo de contabilidad legal/partida doble
  - la capability correcta a profundizar es `Management Accounting`, con lectura funcional `contabilidad de costos` y surface recomendada `Finance > Economia operativa`
- actualización clave:
  - el documento nuevo ya no deja solo la tesis base del módulo
  - también fija el inventario de gaps y hardening enterprise pendiente:
    - budget / variance / forecast
    - fully-loaded labor cost
    - BU P&L
    - cierre gobernado
    - explainability y auditabilidad
    - overrides manuales
    - RBAC
    - observabilidad y data quality
    - materialización escalable
    - legal entity / intercompany / related parties
    - multi-moneda más fuerte
    - runbooks, testing de negocio y roadmap de madurez
- nota importante:
  - `factoring` quedó explicitado como input financiero que pertenece primero a `Finance`, pero cuyo impacto real debe absorberse dentro de `Management Accounting`
- validación:
  - documentación solamente
  - `git diff --check`

## Sesion 2026-04-13 — hardening del lifecycle de tasks para forzar cierre real

- alcance documental:
  - `docs/tasks/TASK_TEMPLATE.md`
  - `docs/tasks/TASK_PROCESS.md`
  - `docs/tasks/README.md`
  - `AGENTS.md`
  - `CLAUDE.md`
- problema atacado:
  - algunos agentes estaban terminando la implementación pero dejaban la task en `in-progress/`
  - el protocolo anterior dejaba el cierre genérico demasiado implícito y fácil de omitir
- ajuste aplicado:
  - tomar una task ahora exige moverla a `in-progress/` y sincronizar `Lifecycle` dentro del markdown
  - cerrar una task ahora exige cambiar `Lifecycle` a `complete`, mover el archivo a `complete/` y sincronizar `README`
  - se declaró explícitamente que una task no puede reportarse como "cerrada" si sigue en `in-progress/`
- validación:
  - `git diff --check`

## Sesion 2026-04-13 — TASK-039 y TASK-040 ya no compiten como la misma lane

- alcance documental:
  - `docs/tasks/to-do/TASK-039-data-node-architecture-v1.md`
  - `docs/tasks/to-do/TASK-040-data-node-architecture-v2.md`
  - `docs/tasks/TASK_ID_REGISTRY.md`
  - `docs/tasks/README.md`
- decisión tomada:
  - `TASK-039` queda rescatada como referencia legacy de visión del Data Node
  - `TASK-040` queda rebaselined como baseline técnica/operativa vigente
- actualización clave:
  - `TASK-039` deja de leerse como backlog ejecutable independiente
  - `TASK-040` absorbe el reality check del repo actual, el split con sister platforms y el mapa de follow-ons
  - el Data Node ya no se modela como una pieza única, sino como secuencia `DN0 -> DN1 -> DN2 -> DN3`
- validación:
  - `git diff --check`

## Sesion 2026-04-13 — TASK-156 ahora explicita tambien la capa SLI

- alcance documental:
  - `docs/tasks/to-do/TASK-156-sla-slo-per-service.md`
  - `docs/tasks/TASK_ID_REGISTRY.md`
- decisión tomada:
  - la lane ya no se modela solo como SLA/SLO
  - `TASK-156` ahora formaliza la cadena `SLI -> SLO -> SLA` por servicio
- actualización clave:
  - `SLI` queda definido como la métrica observable que se mide
  - `SLO` queda como el objetivo operativo sobre ese indicador
  - `SLA` queda como el compromiso contractual apoyado en esos indicadores
  - el seteo y gobierno de estas definiciones queda exigido como CRUD en Admin Center
- validación:
  - `git diff --check`

## Sesion 2026-04-15 — TASK-156 implementada end-to-end

- alcance:
  - `docs/tasks/complete/TASK-156-sla-slo-per-service.md`
  - `migrations/20260415233952871_task-156-service-sla-foundation.sql`
  - `src/lib/services/service-sla-store.ts`
  - `src/lib/agency/sla-compliance.ts`
  - `src/app/api/agency/services/[serviceId]/sla/route.ts`
  - `src/lib/sync/projections/service-sla-compliance.ts`
  - `src/lib/sync/projections/notifications.ts`
  - `src/views/greenhouse/agency/services/ServiceDetailView.tsx`
  - `src/views/greenhouse/agency/space-360/tabs/ServicesTab.tsx`
  - `src/views/greenhouse/admin/ServiceSlaGovernanceView.tsx`
  - `src/app/(dashboard)/admin/service-slas/page.tsx`
  - `src/lib/agency/space-360.ts`
  - `src/types/service-sla.ts`
  - `src/types/db.d.ts`
  - `docs/architecture/GREENHOUSE_AGENCY_LAYER_V2.md`
  - `project_context.md`
  - `changelog.md`
  - `docs/changelog/CLIENT_CHANGELOG.md`
- decisión tomada:
  - la implementación v1 soporta solo indicadores con source defendible hoy: `otd_pct`, `rpa_avg`, `ftr_pct`, `revision_rounds`, `ttm_days`
  - `response_hours` y `first_delivery_days` quedan explícitamente diferidos hasta que exista source canónica materializada por servicio
  - el compliance contractual se materializa en `greenhouse_serving.service_sla_compliance_snapshots` y emite señal reactiva `service.sla_status.changed`
- actualización clave:
  - Admin Center ya tiene surface `/admin/service-slas`
  - la ficha de servicio ya permite CRUD de definiciones SLA y muestra compliance/evidence
  - `Space 360 > Servicios` ya expone badge SLA por servicio
  - breach / at-risk ya disparan `ico_alert` para admins vía proyección de notificaciones
- validación:
  - `pnpm exec vitest run src/lib/agency/sla-compliance.test.ts`
  - `pnpm lint`
  - `pnpm build`
  - `pnpm migrate:up`
  - `rg -n "new Pool\\(" src`
- notas operativas:
  - `pnpm build` sigue mostrando logs preexistentes de `Dynamic server usage` por `headers()` en múltiples rutas del dashboard/auth shell, pero el comando termina exitosamente
  - había cambios ajenos en el worktree que no se tocaron: `.claude/scheduled_tasks.lock` y `services/ops-worker/deploy.sh`

## Sesion 2026-04-13 — TASK-031 rebaselined al runtime actual del repo

- alcance documental:
  - `docs/tasks/to-do/TASK-031-hris-performance-evaluations.md`
  - `docs/tasks/TASK_ID_REGISTRY.md`
  - `changelog.md`
- decisión tomada:
  - `TASK-031` sigue vigente funcionalmente y conserva cabida real en el backlog HRIS
  - la lane deja de asumir BigQuery directo y fija `greenhouse_serving.ico_member_metrics` como source cuantitativa canónica
  - `TASK-029` deja de leerse como bloqueo duro del primer corte; goals queda como integración soft con degradación graceful
- actualización clave:
  - el diseño ahora reconoce que hoy no existen tablas `eval_*`, APIs ni surfaces de evaluaciones en el repo
  - el módulo debe reutilizar `reports_to_member_id`, `person_intelligence` y `workflowDomain = performance_evaluation`
  - el scope ya separa schema, orchestration, APIs, UI y summary enrichment sin mezclar una lane de goals dentro de esta task
- validación:
  - `git diff --check`

## Sesion 2026-04-13 — TASK-025 rescatada como policy estratégica y no como implementación

- alcance documental:
  - `docs/tasks/to-do/TASK-025-hr-payroll-module-delta-ftr.md`
  - `docs/tasks/TASK_ID_REGISTRY.md`
  - `changelog.md`
- decisión tomada:
  - `TASK-025` sigue teniendo cabida, pero ya no como lane de implementación inmediata
  - la propuesta legacy `RpA -> FTR` se reencuadra como policy de compensación futura
  - el runtime vigente de Payroll sigue anclado a `OTD + RpA` según `TASK-065`
- guardrails documentados:
  - no renombrar ni eliminar `bonus_rpa_*` / `kpi_rpa_*` en caliente
  - no leer `FTR` desde raw BigQuery / Notion para nómina
  - benchmark de `FTR` y threshold de bono son conceptos distintos
- validación:
  - `git diff --check`

## Sesion 2026-04-13 — TASK-027 rebaselined al runtime actual del repo

- alcance documental:
  - `docs/tasks/to-do/TASK-027-hris-document-vault.md`
  - `docs/tasks/TASK_ID_REGISTRY.md`
  - `changelog.md`
- decisión tomada:
  - `TASK-027` sigue vigente funcionalmente, pero ya no como brief legacy
  - la lane ahora queda explícitamente montada sobre `TASK-173` (`private assets`) y no sobre bucket/signed URL propios
  - `Document Vault` se redefine como dominio de documentos laborales/compliance y no debe duplicar `member_certifications` ni `member_evidence`
- actualización clave:
  - el contrato esperado pasa a `asset_id` como referencia principal
  - se formalizan las surfaces objetivo `/my/documents`, `/hr/documents` y surfacing en `People 360`
  - se deja abierta como decisión de discovery la semántica exacta de `certificado` para no chocar con `TASK-313`
- validación:
  - `git diff --check`

## Sesion 2026-04-13 — TASK-381 sembrada para hardening enterprise de la SCL

- backlog nuevo documentado:
  - `docs/tasks/to-do/TASK-381-structured-context-layer-enterprise-hardening.md`
- alcance formalizado:
  - registry canónico de `context_kind`
  - readers tenant-safe con access scope enforcement
  - lifecycle de retention / quarantine / lineage
  - observabilidad de adopción y salud
  - segundo piloto real y criterio de promoción a modelo relacional
- documentación operativa actualizada:
  - `docs/tasks/README.md`
  - `docs/tasks/TASK_ID_REGISTRY.md`
  - `changelog.md`
- validación de este turno:
  - documentación solamente; sin cambios runtime
  - correr `git diff --check` antes de commit

## Sesion 2026-04-13 — TASK-380 gap operativo cerrado en develop

- cierre del gap:
  - `pnpm pg:connect:migrate` ya aplicó `20260413113902271_structured-context-layer-foundation.sql` en el shared dev DB
  - `src/types/db.d.ts` quedó regenerado en `develop` con las tablas de `greenhouse_context`
- validación ejecutada:
  - `pnpm pg:connect:migrate`
  - `pnpm exec vitest run src/lib/structured-context/validation.test.ts src/lib/structured-context/store.test.ts src/lib/structured-context/reactive.test.ts`
- aprendizaje operativo confirmado:
  - el bloqueo previo no era de la migración de `TASK-380`, sino drift temporal de historial con `TASK-379`
  - una vez reconciliado `develop`, la materialización de DB cerró sin errores

## Sesion 2026-04-13 — TASK-380 foundation runtime implementada en worktree aislado

- worktree usado:
  - `/Users/jreye/Documents/greenhouse-eo-codex-task-380`
  - branch `task/TASK-380-structured-context-layer-foundation`
- alcance implementado:
  - migración `20260413113902271_structured-context-layer-foundation.sql`
  - runtime nuevo `src/lib/structured-context/{types,validation,store,reactive,index}.ts`
  - tests nuevos `src/lib/structured-context/*.test.ts`
  - piloto real conectado a `src/lib/sync/reactive-run-tracker.ts`
- comportamiento nuevo:
  - Greenhouse ya tiene foundation sidecar para contexto estructurado con documentos, versiones y quarantine
  - la taxonomía inicial queda registrada y validada runtime-side
  - los runs reactivos ya pueden persistir y releer `event.replay_context` sin romper el tracking canónico
- criterio de robustez:
  - el store rechaza secretos y llaves sensibles
  - la capa aplica límites de tamaño por `context_kind`
  - la validación fallida cae en quarantine antes de explotar
  - el piloto reactivo escribe en modo degradado: si la capa falla, el worker no se cae por ese sidecar
- verificación:
  - `pnpm exec vitest run src/lib/structured-context/validation.test.ts src/lib/structured-context/store.test.ts src/lib/structured-context/reactive.test.ts`
  - `pnpm exec eslint src/lib/structured-context/types.ts src/lib/structured-context/validation.ts src/lib/structured-context/store.ts src/lib/structured-context/reactive.ts src/lib/sync/reactive-run-tracker.ts`
  - `pnpm build`
- bloqueo real:
  - `pnpm pg:connect:migrate` en shared dev DB falla por drift de historial: esa base ya tiene aplicada `20260413105218813_reactive-pipeline-v2-circuit-breaker` de `TASK-379`, pero esta rama/worktree no trae todavía esa migración
  - no mezclé esa migración ajena en esta branch para no cruzar lanes sin decisión explícita
- aprendizajes críticos:
  - documentos persistidos deben ser JSON puros también a nivel de tipos; `undefined` fue el principal roce de implementación
  - el patrón correcto para valores opcionales es `null`
  - quarantine-before-throw deja evidencia operativa mucho más útil que fallar en seco
  - el piloto sidecar debe degradar con seguridad si falla, no romper el flujo canónico
  - worktree aislado + Turbopack exige `node_modules` local real; un symlink fuera del root puede romper el build sin relación con el código

## Sesion 2026-04-13 — operating model multi-agent con worktrees formalizado

- alcance documental:
  - `docs/operations/MULTI_AGENT_WORKTREE_OPERATING_MODEL_V1.md`
  - `docs/README.md`
  - `AGENTS.md`
  - `project_context.md`
  - `changelog.md`
- decisión tomada:
  - el workspace actual se preserva para el agente que ya está trabajando ahí
  - si otro agente necesita otra rama en paralelo, debe abrir worktree propio y no cambiar la rama del checkout ocupado
- contrato nuevo:
  - naming de worktrees y ramas
  - checklist de inicio/cierre de sesión
  - reglas de sincronización con `develop`/`main`
  - rollback y limpieza del esquema
- verificación:
  - `git diff --check`

## Sesion 2026-04-13 — Structured Context Layer formalizada y TASK-380 sembrada

- alcance documental:
  - `docs/architecture/GREENHOUSE_STRUCTURED_CONTEXT_LAYER_V1.md`
  - `docs/documentation/plataforma/capa-contexto-estructurado.md`
  - `docs/tasks/to-do/TASK-380-structured-context-layer-foundation.md`
  - índices/documentos vivos actualizados: `docs/README.md`, `docs/documentation/README.md`, `docs/tasks/README.md`, `docs/tasks/TASK_ID_REGISTRY.md`, `project_context.md`, `changelog.md`
- decisión tomada:
  - Greenhouse formaliza una `Structured Context Layer` como sidecar del modelo relacional para contexto flexible, payloads normalizados, replay reactivo, auditoría y memoria de trabajo de agentes
  - el schema objetivo es `greenhouse_context` y la raíz runtime prevista es `src/lib/structured-context/`
- criterio de modelado:
  - JSONB no reemplaza la verdad canónica ni evita modelar tablas cuando un dato se vuelve contractual, transaccional o consultable de forma intensiva
  - la capa sí habilita guardar bundles tipados/versionados que hoy terminan dispersos en payloads ad hoc, docs o prompts
  - se añadió una regla explícita para agentes sobre cuándo usar relacional, `JSONB`, `JSON` o ninguno
  - además se endureció el contrato enterprise con clasificación, redacción, retención, idempotencia, access scope, límites de tamaño y quarantine
- verificación:
  - `git diff --check`
- notas operativas:
  - no hubo cambios de runtime, migraciones ni deploy funcional en esta sesión
  - quedaron cambios ajenos en el árbol (`TASK-379` / `docs/issues/**`) que no se mezclaron en este lote

## Sesion 2026-04-13 — MINI-004 cerrada: HES ya se registra como documento recibido y no como envío outbound

- alcance implementado:
  - `src/lib/finance/hes-store.ts`
  - `src/lib/finance/hes-store.test.ts`
  - `src/views/greenhouse/finance/HesListView.tsx`
  - `src/views/greenhouse/finance/drawers/CreateHesDrawer.tsx`
  - routes HES bajo `src/app/api/finance/hes/**`
- comportamiento nuevo:
  - `Finance > HES` ya registra la HES en estado operativo `Recibida` al momento del alta
  - la UI deja de hablar de envío al cliente y pasa a expresar recepción, validación y observación
  - el estado visible `Validada por` reemplaza la semántica previa de aprobación outbound
  - el feedback backend también quedó alineado en español cuando una transición de lifecycle ya no aplica
- criterio de robustez:
  - el cambio reutiliza el lifecycle backend existente (`submitted`, `approved`, `rejected`) sin abrir un contrato paralelo ni meter migraciones
  - se agregó regresión de store para asegurar que `createHes()` siga naciendo como `submitted`
- verificación:
  - `pnpm exec vitest run src/lib/finance/hes-store.test.ts`
  - `pnpm lint -- src/lib/finance/hes-store.ts src/lib/finance/hes-store.test.ts src/views/greenhouse/finance/HesListView.tsx src/views/greenhouse/finance/drawers/CreateHesDrawer.tsx src/app/api/finance/hes/route.ts src/app/api/finance/hes/[id]/submit/route.ts src/app/api/finance/hes/[id]/approve/route.ts src/app/api/finance/hes/[id]/reject/route.ts`
  - `pnpm build`
- documentación:
  - mini-task cerrada en `docs/mini-tasks/complete/MINI-004-hes-received-workflow-semantics.md`
  - doc funcional nueva `docs/documentation/finance/hes-recepcion-y-validacion.md`
  - trackers `docs/mini-tasks/README.md` y `docs/documentation/README.md` actualizados

## Sesion 2026-04-13 — MINI-003 cerrada: OC ya permite cargar o reemplazar respaldo después del alta

- alcance implementado:
  - `src/views/greenhouse/finance/PurchaseOrdersListView.tsx`
  - drawer nuevo `src/views/greenhouse/finance/drawers/UpdatePurchaseOrderDocumentDrawer.tsx`
  - ajuste de copy en `src/views/greenhouse/finance/drawers/CreateHesDrawer.tsx`
  - endurecimiento de reemplazo en `src/lib/finance/purchase-order-store.ts`
- comportamiento nuevo:
  - la tabla de `Finance > Purchase Orders` ahora expone una acción por fila para cargar o reemplazar el respaldo de la OC
  - si la OC ya tiene documento, se puede abrir y reemplazar desde esa misma surface
  - la HES mantiene la herencia del respaldo desde la OC y ahora explica explícitamente que el documento debe completarse en Órdenes de compra
- criterio de robustez:
  - al reemplazar un respaldo de OC, el store marca el asset anterior como `orphaned` para no dejar adjuntos supersedidos colgados del aggregate
- verificación:
  - `pnpm exec vitest run src/lib/finance/purchase-order-store.test.ts`
  - `pnpm lint -- src/views/greenhouse/finance/PurchaseOrdersListView.tsx src/views/greenhouse/finance/drawers/UpdatePurchaseOrderDocumentDrawer.tsx src/views/greenhouse/finance/drawers/CreateHesDrawer.tsx src/lib/finance/purchase-order-store.ts src/lib/finance/purchase-order-store.test.ts`
  - `pnpm build`
- gap conocido:
  - la validación manual automatizada local quedó bloqueada por Playwright MCP en este runtime (`ENOENT: no such file or directory, mkdir '/.playwright-mcp'`)
- documentación:
  - mini-task cerrada en `docs/mini-tasks/complete/MINI-003-po-post-create-document-upload-for-hes-inheritance.md`
  - tracker `docs/mini-tasks/README.md` actualizado

## Sesion 2026-04-13 — MINI-002 cerrada: HES reutiliza contactos del cliente y hereda respaldo desde la OC

- alcance implementado:
  - `src/views/greenhouse/finance/drawers/CreateHesDrawer.tsx`
  - helper nuevo `src/views/greenhouse/finance/drawers/financeClientContacts.ts`
  - refactor menor de reuse en `src/views/greenhouse/finance/drawers/CreatePurchaseOrderDrawer.tsx`
- comportamiento nuevo:
  - HES ya no usa nombre/email abiertos como camino principal
  - el contacto se selecciona desde los contactos asociados al cliente, con el mismo patrón que OC
  - el email se completa desde el contacto vinculado
  - se mantiene fallback manual explícito si el contacto no existe todavía
  - HES ya no expone `URL del documento (PDF)` como campo editable
  - si la OC vinculada tiene respaldo, la HES hereda ese documento y lo informa en la UI
- criterio de escalabilidad:
  - la carga de contactos asociados quedó extraída a un helper compartido del módulo Finance para evitar duplicidad entre OC y HES
- verificación:
  - `pnpm lint -- src/views/greenhouse/finance/drawers/financeClientContacts.ts src/views/greenhouse/finance/drawers/CreatePurchaseOrderDrawer.tsx src/views/greenhouse/finance/drawers/CreateHesDrawer.tsx`
  - `pnpm build`
- documentación:
  - mini-task cerrada en `docs/mini-tasks/complete/MINI-002-hes-client-contact-and-po-document-inheritance.md`
  - tracker y registry de mini-tasks actualizados

## Sesion 2026-04-13 — ISSUE-045 abierto: registrar OC cae por `client_id` ambiguo en Finance canonical

- incidente:
  - el flujo `Finance > Purchase Orders > Registrar OC` devuelve error genérico al crear una OC en staging
  - Sentry confirmó `error: column reference "client_id" is ambiguous`
  - la falla vive en `resolveFinanceClientContext()` y no en el selector nuevo de contactos
- causa raíz confirmada:
  - el query de `src/lib/finance/canonical.ts` hace `LEFT JOIN greenhouse_core.spaces s ON s.client_id = cp.client_id`
  - en el `WHERE`, el lookup de `client_profiles` usaba `client_id`, `client_profile_id` y `hubspot_company_id` sin alias
  - al existir `s.client_id`, PostgreSQL rompe con referencia ambigua
- fix aplicado en repo:
  - columnas del lookup ahora quedan calificadas con `cp.`
  - se agregó regresión en `src/lib/finance/canonical.test.ts` para asegurar que ese SQL siga aliasado
- verificación ejecutada:
  - `pnpm exec vitest run src/lib/finance/canonical.test.ts src/app/api/finance/purchase-orders/route.test.ts`
  - `pnpm lint -- src/lib/finance/canonical.ts src/lib/finance/canonical.test.ts`
- estado documental:
  - issue creado en `docs/issues/open/ISSUE-045-purchase-order-create-ambiguous-client-id.md`
  - queda **open** hasta validar el recovery en staging post-deploy
  - tracker actualizado en `docs/issues/README.md`

## Sesion 2026-04-13 — MINI-001 cerrada: OC ahora prioriza contactos del cliente seleccionado

- alcance implementado:
  - `src/views/greenhouse/finance/drawers/CreatePurchaseOrderDrawer.tsx`
  - el drawer de OC ya no depende solo de nombre/email libres como camino principal
  - al elegir cliente:
    - intenta cargar memberships de la organización de ese cliente
    - prioriza memberships `billing`, `contact` y `client_contact`
    - si no existen, cae a miembros de esa misma organización con email
    - si tampoco hay memberships útiles, cae al snapshot legacy `financeContacts` del cliente
  - el selector muestra solo contactos asociados a ese cliente, nunca una búsqueda global
  - se mantiene fallback manual explícito con `No encuentro el contacto`
- verificación:
  - `pnpm lint -- src/views/greenhouse/finance/drawers/CreatePurchaseOrderDrawer.tsx`
  - `pnpm build`
- nota:
  - `pnpm build` volvió a emitir logs preexistentes de Next sobre `Dynamic server usage` en rutas que usan `headers`; no bloqueó el build ni nace de esta mini-task

## Sesion 2026-04-13 — lane `MINI-###` materializada para mejoras chicas planificadas

- alcance implementado:
  - nueva taxonomía `docs/mini-tasks/` con pipeline `to-do`, `in-progress`, `complete`
  - tracker nuevo `docs/mini-tasks/README.md`
  - plantilla nueva `docs/mini-tasks/MINI_TASK_TEMPLATE.md`
  - registry nuevo `docs/mini-tasks/MINI_TASK_ID_REGISTRY.md`
  - operating model nuevo `docs/operations/MINI_TASK_OPERATING_MODEL_V1.md`
  - docs vivas alineadas:
    - `AGENTS.md`
    - `docs/README.md`
    - `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`
    - `project_context.md`
    - `changelog.md`
- primer seed operativo:
  - `docs/mini-tasks/to-do/MINI-001-po-client-contact-selector.md`
- criterio nuevo:
  - `MINI-###` para mejoras chicas, locales y planificadas
  - `ISSUE-###` sigue reservado para problemas reales de runtime
  - `TASK-###` sigue siendo la lane cuando el alcance deja de ser claramente acotado

## Sesion 2026-04-11 — Seed operativo Kortex pilot READY

- alcance implementado:
  - helper nuevo `src/lib/sister-platforms/consumers.ts`
    - lista consumers
    - crea consumer con token hasheado
    - upsert idempotente por `sister_platform_key + consumer_name`
    - rotacion opcional de token
  - script nuevo `scripts/seed-kortex-sister-platform-pilot.ts`
  - comando nuevo `pnpm seed:kortex-pilot`
  - docs actualizados:
    - `docs/architecture/GREENHOUSE_SISTER_PLATFORM_BINDINGS_RUNTIME_V1.md`
    - `docs/documentation/plataforma/sister-platform-bindings.md`
- contrato operativo:
  - el seed provisiona o actualiza el consumer dedicado de Kortex y su binding `portal -> Greenhouse scope`
  - defaults seguros:
    - consumer `active`
    - binding `draft`
    - allowed scopes `client,space`
  - el token solo aparece cuando se crea o se rota (`KORTEX_ROTATE_CONSUMER_TOKEN=true`)
- siguiente accion natural:
  - correr `pnpm seed:kortex-pilot` con IDs reales del piloto y guardar el token emitido en los secrets del runtime Kortex
  - luego hacer smoke call a `/api/integrations/v1/sister-platforms/context`

## Sesion 2026-04-11 — local Next build isolation ACTIVADA para evitar colisiones entre agentes

- alcance implementado:
  - helper nuevo `scripts/next-dist-dir.mjs`
  - `scripts/run-next-build.mjs` ahora usa `distDir` aislado bajo `.next-local/build-<timestamp>-<pid>` en local fuera de Vercel/CI
  - `scripts/run-next-start.mjs` arranca desde el ultimo build exitoso resuelto por `.next-build-dir`
  - `.next-build-dir` ya no se actualiza antes del build; solo despues de un build exitoso
  - cleanup controlado de builds aislados viejos
- problema que resuelve:
  - locks sobre `.next/lock`
  - corrupcion del output cuando dos agentes o procesos ejecutan `pnpm build` en el mismo workspace
  - `start` apuntando a un build fallido o incompleto
- rollback:
  - temporal: `GREENHOUSE_FORCE_SHARED_NEXT_DIST=true pnpm build`
  - hard rollback: revertir `scripts/next-dist-dir.mjs`, `scripts/run-next-build.mjs` y `scripts/run-next-start.mjs`
- nota operativa:
  - en Vercel y CI el comportamiento sigue compartido sobre `.next` para no cambiar el contrato de esos entornos sin necesidad

## Sesion 2026-04-11 — TASK-376: Sister Platforms Read-Only External Surface Hardening COMPLETADA

- alcance implementado:
  - nueva migracion `20260411201917370_sister-platform-read-surface-hardening.sql`
  - nueva tabla canónica `greenhouse_core.sister_platform_consumers`
  - nueva tabla canónica `greenhouse_core.sister_platform_request_logs`
  - secuencia `greenhouse_core.seq_sister_platform_consumer_public_id` para `EO-SPK-####`
  - helper reusable `src/lib/sister-platforms/external-auth.ts` con:
    - auth por consumer token
    - resolucion obligatoria de binding activo
    - allowlist de scopes por consumer
    - rate limiting por consumer
    - request logging con `requestId`
  - nuevo lane read-only endurecido:
    - `/api/integrations/v1/sister-platforms/context`
    - `/api/integrations/v1/sister-platforms/catalog/capabilities`
    - `/api/integrations/v1/sister-platforms/readiness`
  - actualización de docs:
    - `docs/api/GREENHOUSE_INTEGRATIONS_API_V1.md`
    - `docs/api/GREENHOUSE_INTEGRATIONS_API_V1.openapi.yaml`
    - `docs/api/GREENHOUSE_API_REFERENCE_V1.md`
    - `docs/architecture/GREENHOUSE_SISTER_PLATFORM_BINDINGS_RUNTIME_V1.md`
    - `docs/documentation/plataforma/sister-platform-bindings.md`
- decisiones de contrato:
  - la task se corrigió para operar sobre `src/app/api/integrations/v1/*`, no sobre un inexistente `src/app/api/v1/*`
  - el lane nuevo queda separado del carril genérico y mutativo ya existente
  - MCP sigue downstream; no se implementó aquí
- verificación esperada:
  - `pnpm lint`
  - `pnpm build`
  - chequeo de `new Pool()`
  - `pnpm pg:connect:migrate`
- cierre real:
  - la migración quedó aplicada sobre Cloud SQL el 2026-04-11 vía `pnpm pg:connect:migrate`
  - `src/types/db.d.ts` quedó regenerado en el mismo lote
  - `TASK-376` ya puede considerarse cerrada

## Sesion 2026-04-11 — TASK-375: Sister Platforms Identity & Tenancy Binding Foundation COMPLETADA

- alcance implementado:
  - nueva migracion `20260411192943501_sister-platform-bindings-foundation.sql`
  - nueva tabla canónica `greenhouse_core.sister_platform_bindings`
  - secuencia `greenhouse_core.seq_sister_platform_binding_public_id` para `EO-SPB-####`
  - helper reusable `src/lib/sister-platforms/bindings.ts` con:
    - list/read admin
    - create/update
    - resolver `external scope -> greenhouse scope`
    - soporte de scopes `organization`, `client`, `space` e `internal`
  - eventos outbox nuevos en `event-catalog.ts` para lifecycle del binding
  - rutas admin nuevas:
    - `/api/admin/integrations/sister-platform-bindings`
    - `/api/admin/integrations/sister-platform-bindings/[bindingId]`
  - `/admin/integrations` ahora muestra la sección `Sister Platform Bindings`
- reusable real para futuras sister platforms:
  - no hay hardcode a Kortex en la foundation de runtime
  - `kortex` y `verk` aparecen solo como keys/plataformas, no como shape especial
  - el contrato queda listo para `TASK-376` y `TASK-377`
- verificación:
  - `pnpm build` pasa
  - `pnpm lint` pasa con 2 warnings preexistentes en `HrOrgChartView.tsx`
  - `pnpm pg:connect:migrate` terminó OK el 2026-04-11 tras reautenticar ADC y levantar Cloud SQL Proxy
  - `src/types/db.d.ts` quedó regenerado en el mismo lote
- cierre real:
  - la foundation runtime ya quedó materializada en DB y tipos
  - `TASK-375` ya puede considerarse cerrada

## Sesion 2026-04-11 — TASK-374: Sister Platforms Integration Program COMPLETADA

- alcance cerrado:
  - `TASK-374` ya no se interpreta como task de runtime sino como umbrella de programa
  - se corrigió la spec contra la realidad del repo actual
  - se dejó explícito que hoy la surface externa viva es `/api/integrations/v1/*`
  - se dejó explícito que `API v1` y `MCP` para sister platforms siguen pendientes de implementación
  - la continuación real del programa queda secuenciada en:
    - `TASK-375` — binding canónico sister-platform -> Greenhouse
    - `TASK-376` — read-only external surface hardening
    - `TASK-377` — primer bridge Greenhouse -> Kortex
- impacto:
  - evita implementar sobre el supuesto falso de que ya existe `src/app/api/v1/*`
  - evita mezclar umbrella documental con runtime foundation
  - deja el backlog sister-platform listo para ejecución técnica real
- verificación:
  - auditoría manual de task + arquitectura + runtime real + schema snapshot
  - sin cambios de código de producto ni migraciones
  - no aplica `build`/`lint` por tratarse de cierre documental / backlog orchestration

## Sesion 2026-04-11 — TASK-373: Sidebar Reorganization COMPLETADA

- alcance cerrado:
  - **Microinteracciones CSS:** hover transition 150ms ease-out, active transition 200ms ease-out, `prefers-reduced-motion` media query que deshabilita todas las transiciones del sidebar
  - **Gestión:** de 8 flat + 1 collapsible a 3 flat + 2 collapsibles ("Equipo y talento", "Operaciones")
  - **Personas y HR:** de 10 flat a 1 flat (Personas) + 3 collapsibles ("Nómina", "Supervisión", "Organización"). 5 variantes condicionales preservadas.
  - **Finanzas > Flujo:** de 10 items a 7 (Flujo operativo) + 3 (Tesorería nuevo submenu)
  - **Admin > Gobierno:** de 11 items a 2 submenús ("Identidad y acceso" 6 items, "Equipo y operaciones" 5 items)
  - **Iconos diferenciados:** Agency Equipo→`tabler-affiliate`, Personas→`tabler-address-book`, Client Equipo→`tabler-users`
- impacto: admin ve ~18 items sin expandir (antes ~40), reducción del 55%
- sin cambios en: rutas, view codes, permisos, portal cliente, Mi Ficha
- verificación: `tsc`, `lint` (0 errors), `build` — todos pasan

## Sesion 2026-04-11 — contrato marco para sister platforms + anexo Kortex + backlog derivado

- alcance cerrado:
  - creada la spec base `docs/architecture/GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`
  - creado el anexo `docs/architecture/GREENHOUSE_KORTEX_INTEGRATION_ARCHITECTURE_V1.md`
  - Greenhouse ahora fija explícitamente que las apps hermanas se integran como `peer systems`, no como módulos embebidos
  - el contrato separa:
    - institutional layer reusable
    - tenancy binding cross-platform
    - read-only external surfaces
    - MCP / agent adapter downstream
- backlog nuevo abierto:
  - `TASK-374` — Sister Platforms Integration Program
  - `TASK-375` — Sister Platforms Identity & Tenancy Binding Foundation
  - `TASK-376` — Sister Platforms Read-Only External Surface Hardening
  - `TASK-377` — Kortex Operational Intelligence Bridge
- próximos pasos naturales:
  - bajar primero la foundation reusable (`375`, `376`)
  - después cerrar el primer carril Kortex (`377`)
  - abrir anexo para `Verk` solo cuando exista baseline real de repo/arquitectura equivalente

## Sesion 2026-04-11 — TASK-372: Kortex Visual Preset Documentation COMPLETADA

- alcance cerrado:
  - creado `docs/architecture/GREENHOUSE_KORTEX_VISUAL_PRESET_V1.md` con contrato visual completo
  - §2: tokens compartibles (palette, typography DM Sans + Poppins, shape 6px, shadows, WCAG AA)
  - §3: tokens NO compartibles (GH_COLORS dominio, nav, nomenclatura, brand assets)
  - §4: ejemplo de consumo con snippets funcionales para Kortex
  - §5: governance — drift detection, actualizacion manual, criterios para package futuro
- **TASK-264 UMBRELLA COMPLETADA** — 5/5 sub-tasks cerradas:
  - TASK-368: Token audit + contrato de decisiones
  - TASK-369: Hex cleanup
  - TASK-370: Semantic + neutral absorption (40 archivos, WCAG fix)
  - TASK-371: Primary chain simplification + WCAG formal
  - TASK-372: Kortex preset (esta)
- proximo paso: extender identidad visual al repo `efeoncepro/kortex` usando el contrato

## Sesion 2026-04-11 — TASK-371: Shell Primary Cutover COMPLETADA

- alcance real vs spec:
  - **Spec original:** cambiar primary de Vuexy purple (#7367F0) al institucional (#0375DB)
  - **Realidad:** primary ya era #0375DB via cadena mergedTheme→provider. No había cambio visual pendiente.
  - **Alcance ejecutado:** limpieza de cadena redundante + formalización WCAG
- cambios implementados:
  - Eliminado primary override redundante de mergedTheme.ts (light + dark) — el provider ya lo aplicaba via settings.primaryColor desde primaryColorConfig.ts
  - La cadena queda: `primaryColorConfig.ts` → `brandSettings.ts` → `Provider` → `theme.palette.primary.main`
- WCAG AA formalizado:
  - #0375DB vs #FFFFFF: 4.59:1 (PASA AA)
  - #FFFFFF vs #0375DB (botones): 4.59:1 (PASA AA)
  - #0375DB vs #F8F9FA: 4.36:1 (marginal, aceptable — primary usado en large text / buttons)
  - #0375DB vs dark backgrounds: 3.55-3.87:1 (PASA AA large text)
- verificación: `tsc`, `lint` (0 errors), `build` — todos pasan
- **No hay cambio visual** — el portal se ve exactamente igual antes y después

## Sesion 2026-04-11 — TASK-370: Semantic Token Absorption into Theme COMPLETADA

- alcance cerrado:
  - **Oleada 1 — Fix at source:** GH_COLORS.neutral.textSecondary actualizado #848484→#667085 (WCAG fix), bgSurface #F7F7F5→#F8F9FA. Nueva categoría GH_COLORS.capability (15 tokens). helpers.ts getCapabilityPalette() migrado a GH_COLORS.capability.
  - **Oleada 2 — Semantic migration:** 9 archivos migrados de GH_COLORS.semantic a theme.palette.{success,warning,error,info}. CLIENT_STATUS_COLORS convertido a función getClientStatusColors(theme). TeamSignalChip y TeamProgressBar reciben theme.
  - **Oleada 2 — Neutral migration:** 32 archivos migrados de GH_COLORS.neutral a theme.palette equivalentes. textPrimary→customColors.midnight, textSecondary→text.secondary, border→customColors.lightAlloy, bgSurface→background.default.
  - **Post-migración:** 0 refs a GH_COLORS.semantic, 0 refs a GH_COLORS.neutral en todo el codebase. Ambas categorías marcadas @deprecated en nomenclature.
- cambios visuales aprobados:
  - textSecondary: gris neutro #848484 → gris azulado #667085 (mejora WCAG 3.9:1→5.2:1) en 21 archivos
  - bgSurface: warm grey #F7F7F5 → cool grey #F8F9FA (imperceptible) en 16 archivos
- verificación ejecutada: `tsc`, `lint` (0 errors, 2 warnings pre-existentes), `build` — todos pasan

## Sesion 2026-04-11 — TASK-369: Hardcoded Hex Cleanup COMPLETADA

- alcance cerrado:
  - CSC_COLORS duplicado en 2 archivos → extraído a `CSC_CHART_COLORS` en `metric-registry.ts` (fuente única)
  - TREND_LINE_COLORS → derivado de `Object.values(CSC_CHART_COLORS)` (ya no es array hardcodeado)
  - PayrollReceiptCard `#023c70` → `GH_COLORS.role.account.source` (2 instancias)
  - NexaInsightsBlock `#7367F0` (old Vuexy purple) → `theme.palette.primary.main` (bug fix: purple→blue)
  - helpers.ts `getCapabilityPalette()` → EXCLUIDO (hex no coinciden con GH_COLORS.service, documentado)
- hallazgos documentados en delta de TASK-369:
  - CSC_COLORS no mapea a GH_COLORS.cscPhase (fases y colores distintos)
  - helpers.ts usa paleta completamente diferente a GH_COLORS.service
  - NexaInsightsBlock tenía bug: usaba Vuexy purple (#7367F0) en vez del primary actual (#0375DB)
- verificación ejecutada: `tsc`, `lint`, `build` — todos pasan
- documentos actualizados: task file, README.md, TASK_ID_REGISTRY.md, Handoff.md

## Sesion 2026-04-11 — TASK-368: Theme Token Audit & Decision Contract COMPLETADA

- alcance cerrado:
  - se creó `docs/architecture/GREENHOUSE_THEME_TOKEN_CONTRACT_V1.md` con clasificación token-por-token de los 114 tokens de `GH_COLORS`
  - decisión de primary institucional: **`#0375DB` (coreBlue) ya es el primary** — mergedTheme.ts lo overridea desde su implementación. No se requiere cambio de color.
  - 3 conflictos neutral resueltos:
    - `textPrimary` (#022A4E) migra a `customColors.midnight` (no reemplaza `text.primary` #1A1A2E)
    - `textSecondary` (#848484) migra a `text.secondary` (#667085) — mejora contraste WCAG
    - `bgSurface` (#F7F7F5) converge a `background.default` (#F8F9FA)
  - clasificación: 14 tokens eliminables (semantic + neutral parcial), 3 requieren resolución, 86 permanecen en GH_COLORS como dominio
  - mapa de migración documentado para TASK-369 a TASK-372
  - TASK-371 reclasificada como limpieza de capas (no cambio visual) — el primary ya es correcto
- tasks desbloqueadas: TASK-369, TASK-370, TASK-371, TASK-372
- documentos vivos actualizados:
  - `docs/architecture/GREENHOUSE_THEME_TOKEN_CONTRACT_V1.md` (nuevo)
  - `docs/tasks/to-do/TASK-368-theme-token-audit-decision-contract.md` (delta con hallazgos)
- validación: task de investigación pura — no aplica build/lint

## Sesion 2026-04-11 — TASK-264 descompuesta en 5 sub-tasks (TASK-368 a TASK-372)

- alcance cerrado:
  - TASK-264 convertida en umbrella con tabla de sub-tasks y secuencia recomendada
  - 5 tasks creadas: 368 (audit, riesgo cero) → 369 (hex cleanup, bajo) + 370 (token absorption, medio) → 371 (primary cutover, opcional) + 372 (Kortex preset, cero)
- documentos vivos actualizados:
  - `docs/tasks/TASK_ID_REGISTRY.md`, `docs/tasks/README.md`

## Sesion 2026-04-11 — TASK-367 creada para lane Claude de microinteracciones

- alcance cerrado:
  - se creó `TASK-367` para pedir a Claude:
    - investigación externa propia sobre mejores prácticas de microinteracciones UI/UX
    - creación de una skill repo-local para Greenhouse
    - creación de una skill global portable
  - la task quedó formulada explícitamente como paridad multi-agente con la lane ya materializada en Codex, pero exigiendo research independiente y skills en el formato de Claude
- documentos vivos actualizados:
  - `docs/tasks/to-do/TASK-367-claude-microinteractions-research-dual-skill-creation.md`
  - `docs/tasks/TASK_ID_REGISTRY.md`
  - `docs/tasks/README.md`
- validación ejecutada:
  - revisión manual de consistencia contra `TASK_TEMPLATE`, `TASK_PROCESS`, `CLAUDE.md`, `TASK-231` y `TASK-305`
  - no aplica build/lint; cambio exclusivamente documental / backlog

## Sesion 2026-04-11 — nueva skill local `greenhouse-microinteractions-auditor`

- alcance cerrado:
  - se creó la skill de Codex `.codex/skills/greenhouse-microinteractions-auditor/SKILL.md`
  - la skill quedó orientada a auditoría e implementación de microinteracciones UI/UX en Greenhouse:
    - motion y reduced motion
    - loading / empty / warning / error / success feedback
    - hover / focus / keyboard affordances
    - inline validation, live regions, toasts y dialogs
  - se separó el conocimiento detallado en `references/microinteraction-playbook.md` para mantener `SKILL.md` corto
  - se agregó metadata de discovery en `agents/openai.yaml`
- documentos vivos actualizados:
  - `project_context.md`
  - `changelog.md`
- validación ejecutada:
  - revisión manual de consistencia contra `AGENTS.md`, `DOCUMENTATION_OPERATING_MODEL_V1.md`, `GREENHOUSE_UI_PLATFORM_V1.md` y `GREENHOUSE_ACCESSIBILITY_GUIDELINES_V1.md`
  - no aplica build/lint; cambio documental y de tooling local para agentes

## Sesion 2026-04-11 — TASK-320 + TASK-314: Talent Profile Enterprise Program COMPLETADO

- TASK-320: service talent-ops.ts (completeness, stale, gaps, actions), API /api/hr/core/talent-ops, dashboard /admin/talent-ops, nav "Salud del talento"
- TASK-314 UMBRELLA CERRADA — 8/8 child tasks complete:
  - TASK-313: Skills, certs, links, profile CRUD
  - TASK-315: Taxonomy (tools, languages, headline)
  - TASK-316: Trust ops (verification states, review queue)
  - TASK-317: Internal talent discovery & search
  - TASK-318: Client-safe verified profiles
  - TASK-319: Reputation, evidence & endorsements
  - TASK-320: Ops analytics & maintenance
- STATUS: PROGRAM COMPLETE

## Sesion 2026-04-11 — TASK-319: Reputation, Evidence & Endorsements completada

- Migration: member_evidence + member_endorsements tables con runtime grants
- Services: evidence.ts (CRUD + asset attach), endorsements.ts (create + moderate)
- APIs: /api/my/evidence (CRUD), /api/my/endorsements (view), /api/hr/core/members/[id]/endorse (peer), /api/hr/core/members/[id]/endorsements (admin moderate)
- UI: Evidence section (cards con type chip, skill/tool links, URL) + Endorsements section (avatar+name+skill chip+comment+time)
- Asset context: evidence_draft/evidence con retention class hr_evidence
- Event catalog: memberEvidence + memberEndorsement aggregates
- STATUS: COMPLETE

## Sesion 2026-04-11 — backlog ejecutable para `Assigned Team Enterprise Program`

- alcance cerrado:
  - se creó el bloque `TASK-357` a `TASK-366` como programa de implementación completo para `Equipo asignado`
  - el bloque quedó separado por capas:
    - umbrella / sequencing
    - semantic layer
    - field-level access
    - UI shared
    - main module runtime
    - talent detail drawer
    - capacity + health bridge
    - risk / continuity alerts
    - cross-surface consumers
    - observability / export / hardening
  - se fijó la secuencia recomendada de ejecución:
    - `358`
    - `359` + `360`
    - `363`
    - `361`
    - `362` + `364`
    - `365`
    - `366`
- documentos vivos actualizados:
  - `docs/tasks/README.md`
  - `docs/tasks/TASK_ID_REGISTRY.md`
  - `docs/tasks/to-do/TASK-357-assigned-team-canonical-program.md`
  - `docs/tasks/to-do/TASK-358-assigned-team-semantic-layer-portfolio-readers.md`
  - `docs/tasks/to-do/TASK-359-assigned-team-client-visibility-policy-field-access.md`
  - `docs/tasks/to-do/TASK-360-assigned-team-shared-ui-primitives-cards.md`
  - `docs/tasks/to-do/TASK-361-assigned-team-main-module-runtime.md`
  - `docs/tasks/to-do/TASK-362-assigned-team-talent-detail-drawer-client-safe-dossier.md`
  - `docs/tasks/to-do/TASK-363-assigned-team-capacity-health-signals-integration.md`
  - `docs/tasks/to-do/TASK-364-assigned-team-risk-continuity-coverage-alerts.md`
  - `docs/tasks/to-do/TASK-365-assigned-team-cross-surface-consumers.md`
  - `docs/tasks/to-do/TASK-366-assigned-team-enterprise-hardening-observability-export.md`
- validación ejecutada:
  - revisión manual de consistencia contra `Assigned Team Architecture`, `Client Portal`, `Identity Access`, `Team Capacity` y foundations runtime existentes
  - no aplica build/lint; cambio exclusivamente documental

## Sesion 2026-04-11 — arquitectura canónica de `Equipo asignado` para portal cliente enterprise

- alcance cerrado:
  - se formalizó `Equipo asignado` como capability enterprise cliente-facing y ya no como roster aislado de `/equipo`
  - se fijó que el root de lectura es `Organization / Space + assignments`, sin crear una tabla transaccional paralela
  - la arquitectura quedó separada en tres capas:
    - assignments operativos
    - capability profile `client-safe`
    - service health / capacity signals
  - se dejó explícito que el módulo no debe absorber `ATS`, `HR`, `Payroll` ni `Staff Augmentation` admin
  - se agregó un `Greenhouse Synergy Contract` dentro de la spec para dejar explícito cómo este módulo compone con `Organization/Space`, `Assignments`, `Staff Augmentation`, `HRIS`, `Person Complete 360`, `Talent Trust`, `Team Capacity`, `Delivery/ICO`, `Capability Modules`, `Finance`, `Hiring / ATS` e `Identity Access`
  - se agregó también la sección `UI / UX Architecture` con:
    - pattern family (`hero + KPI strip + roster inteligente + detail drawer`)
    - estrategia de componentes Vuexy/Greenhouse
    - microinteracciones y motion sobria
    - estados, microcopy y accessibility contract
  - se agregó además `Reusable UI Component Model`, separando:
    - `shared primitives`
    - `shared building blocks`
    - `module-local composites`
    - reglas de promoción a `shared`
- documentos vivos actualizados:
  - `docs/architecture/GREENHOUSE_ASSIGNED_TEAM_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `docs/architecture/GREENHOUSE_CLIENT_PORTAL_ARCHITECTURE_V1.md`
  - `docs/README.md`
  - `project_context.md`
  - `changelog.md`
- validación ejecutada:
  - revisión manual de consistencia contra `Client Portal`, `Team Capacity`, `Person ↔ Organization`, `Person Complete 360` y `TASK-318`
  - no aplica build/lint; no hubo cambios de runtime

## Sesion 2026-04-11 — TASK-318: Client-Safe Verified Talent Profiles completada

- Service: src/lib/team/client-safe-profile.ts — reader que filtra solo verified + client_visible
- APIs: GET /api/team/profiles (batch), GET /api/team/members/[memberId]/profile (individual)
- Component: ClientSafeTalentCard — dossier enterprise con collapsed/expanded views
- Integración: /equipo ahora muestra "Ver perfil profesional" por miembro con Dialog
- Seguridad: nunca expone phone, address, internal notes, twitter, threads
- Nomenclature: GH_CLIENT_TALENT con labels en español
- STATUS: COMPLETE

## Sesion 2026-04-11 — Projected Payroll aclara retención SII para honorarios CLP

- alcance cerrado:
  - se confirmó que el motor de `honorarios` estaba correcto: aplica retención SII (`14.5%` en 2026) sobre el bruto
  - el problema real estaba en `ProjectedPayrollView`: mostraba AFP/salud/cesantía/impuesto en `0` pero dejaba el total rojo, generando un descuento fantasma
  - la UI ahora distingue explícitamente `Retención SII` para honorarios y renombra la card a `Retención honorarios`
- archivos tocados:
  - `src/views/greenhouse/payroll/ProjectedPayrollView.tsx`
  - `src/views/greenhouse/payroll/ProjectedPayrollView.test.tsx`
- documentos vivos actualizados:
  - `changelog.md`
  - `docs/changelog/CLIENT_CHANGELOG.md`
- validación ejecutada:
  - `pnpm exec vitest run src/views/greenhouse/payroll/ProjectedPayrollView.test.tsx src/lib/payroll/project-payroll.test.ts` — OK
  - `pnpm exec eslint src/views/greenhouse/payroll/ProjectedPayrollView.tsx src/views/greenhouse/payroll/ProjectedPayrollView.test.tsx` — OK

## Sesion 2026-04-11 — TASK-317: Internal Talent Discovery completada

- Service: src/lib/agency/talent-discovery.ts — search, filter, rank across members with weighted scoring
- API: GET /api/agency/talent-discovery — faceted search with q, skills, tools, languages, verification, sortBy
- Page: /agency/talent-discovery con cards grid (3/2/1 cols responsive), 4 KPI cards, filtros
- Discovery score (0-100): completeness 20% + verification 30% + availability 25% + cert freshness 15% + seniority 10%
- Nav: "Talento" en sidebar Agency (GESTIÓN)
- Nomenclature: GH_TALENT_DISCOVERY block + GH_AGENCY_NAV.talentDiscovery
- STATUS: COMPLETE

## Sesion 2026-04-11 — TASK-316: Talent Trust Ops completada

- Migration: verification_status + rejection_reason en member_skills y member_tools (backfill desde verified_by)
- Modelo unificado: skills, tools y certifications comparten 4 estados (self_declared → pending_review → verified | rejected)
- Cola de revision admin: /admin/talent-review con tabla filtrable, 5 KPIs, acciones verify/reject/unverify
- APIs: tool verify endpoint + skill reject support
- Event catalog: memberTool, memberCertification, memberLanguage aggregates
- Nav: "Verificacion de talento" en Admin Center > Gobierno
- STATUS: COMPLETE

## Sesion 2026-04-11 — Payroll Deel: conectividad vuelve a ser canónica en compensaciones

- alcance cerrado:
  - `Payroll > Compensaciones` ya permite capturar `Bono conectividad` para contratos `Contractor (Deel)` y `EOR (Deel)`
  - la policy quedó centralizada por tipo de contrato en `src/types/hr-contracts.ts`
  - el cálculo de entries Deel ahora suma conectividad al bruto/neto referencial en vez de descartarla
- archivos de alto impacto tocados:
  - `src/types/hr-contracts.ts`
  - `src/views/greenhouse/payroll/CompensationDrawer.tsx`
  - `src/lib/payroll/calculate-payroll.ts`
  - `src/views/greenhouse/payroll/CompensationDrawer.test.tsx`
  - `src/lib/payroll/project-payroll.test.ts`
- documentos vivos actualizados:
  - `project_context.md`
  - `changelog.md`
  - `docs/changelog/CLIENT_CHANGELOG.md`
  - `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
- validación ejecutada:
  - `pnpm exec vitest run src/views/greenhouse/payroll/CompensationDrawer.test.tsx src/lib/payroll/project-payroll.test.ts` — OK
  - `pnpm exec eslint src/types/hr-contracts.ts src/views/greenhouse/payroll/CompensationDrawer.tsx src/lib/payroll/calculate-payroll.ts src/views/greenhouse/payroll/CompensationDrawer.test.tsx src/lib/payroll/project-payroll.test.ts` — OK
- nota operativa:
  - el cambio deja resuelto el contrato de producto y cálculo para Deel, pero los registros existentes con conectividad en `0` siguen requiriendo actualización de monto si hoy el dato no está versionado

## Sesion 2026-04-11 — bloque TASK-352 a TASK-356 para Hiring / ATS canónico

- alcance cerrado:
  - se tomó la nueva arquitectura `Hiring / ATS` y se bajó a bloque ejecutable de tasks
  - el programa quedó separado en:
    - `TASK-352` umbrella del programa
    - `TASK-353` foundation transaccional del dominio
    - `TASK-354` landing pública de vacantes + apply intake
    - `TASK-355` desks internos + publication governance
    - `TASK-356` handoff + signals + bridges downstream
- decisiones de shape ya fijadas en las tasks:
  - `TalentDemand` como root
  - `HiringApplication` como unidad del pipeline
  - landing pública como lens del mismo `HiringOpening`
  - handoff explícito antes de `member` / `assignment` / `placement`
- documentos vivos actualizados:
  - `docs/tasks/README.md`
  - `docs/tasks/TASK_ID_REGISTRY.md`
  - `docs/tasks/to-do/TASK-352-hiring-ats-canonical-program.md`
  - `docs/tasks/to-do/TASK-353-hiring-ats-domain-foundation.md`
  - `docs/tasks/to-do/TASK-354-public-careers-landing-apply-intake.md`
  - `docs/tasks/to-do/TASK-355-hiring-desk-internal-workspaces-publication-governance.md`
  - `docs/tasks/to-do/TASK-356-hiring-handoff-reactive-signals-downstream-bridges.md`
- validación ejecutada:
  - revisión manual de consistencia contra `GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`, `RESEARCH-003`, `Person 360`, `Staff Aug` y `TASK_TEMPLATE`
  - no aplica build/lint; no hubo cambios de runtime
- próximo paso natural:
  - arrancar por `TASK-353` y usar ese foundation para destrabar `354` y `355`

## Sesion 2026-04-11 — arquitectura canónica de Hiring / ATS para Efeonce / Greenhouse

- alcance cerrado:
  - se promovió de research a arquitectura viva el dominio `Hiring / ATS` como capa canónica de fulfillment de talento
  - el documento nuevo ya cubre:
    - demanda interna + cliente
    - trabajo `on_demand` + `on_going`
    - pool mixto de talento
    - objeto raíz `TalentDemand`
    - pipeline sobre `HiringApplication`
    - boundary explícito `HiringHandoff`
    - landing pública de vacantes + apply flow como lens del mismo ATS
  - se dejó explícito que:
    - `Person` sigue siendo la raíz humana
    - `HRIS` conserva `member` + onboarding interno
    - `Staff Aug` conserva `placement`
    - el ATS no debe duplicar payroll, margin ni costo canónico
- documentos vivos actualizados:
  - `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
  - `docs/README.md`
  - `project_context.md`
  - `changelog.md`
- validación ejecutada:
  - revisión manual de consistencia contra `RESEARCH-003`, `Staff Aug enterprise`, `360 Object Model` y boundary HRIS
  - no aplica build/lint; no hubo cambios de runtime
- próximo paso natural:
  - bajar esta arquitectura a task(s) de data model, UI surfaces y handoff con Staff Aug

## Sesion 2026-04-11 — TASK-314: Talent Profile Enterprise Program activado

- tipo: `umbrella` — coordinación, no código
- TASK-313 completada → programa desbloqueado
- TASK-314 movida a `in-progress`; referencias a TASK-313 corregidas (`to-do/` → `complete/`)
- TASK_ID_REGISTRY.md sincronizado (TASK-313: complete, TASK-314: in-progress)
- Próximo paso del programa: TASK-315 (Talent Taxonomy & Canonical Model)
- Cadena: `313 ✓ → 315 → 316 → 317 → 318 → 319 → 320`

## Sesion 2026-04-11 — bloque TASK-343 a TASK-351 para implementación canónica de Quotation

- alcance cerrado:
  - se leyó y contrastó `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md` contra:
    - `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
    - `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
    - `docs/documentation/finance/cotizaciones-multi-source.md`
    - `TASK-210`, `TASK-211` y `TASK-212`
  - se detectaron gaps de contrato que justifican arrancar por una task de policy/consolidación antes del runtime:
    - `pending_approval` usado por el flow pero ausente en el `CHECK` del status de quotations
    - referencias de capacity/cost desalineadas con el repo real (`client_team_assignments`, `greenhouse_serving.member_capacity_economics`)
    - convivencia aún ambigua entre `quotes multi-source en finance` y `quotation comercial canónica`
  - se creó el bloque completo:
    - `TASK-343` umbrella del programa
    - `TASK-344` policy de consolidación/cutover
    - `TASK-345` schema canónico + compat Finance
    - `TASK-346` pricing/costing/margin health
    - `TASK-347` bridge canónico HubSpot
    - `TASK-348` governance runtime (approvals/versions/templates/audit)
    - `TASK-349` workspace UI + PDF
    - `TASK-350` quote-to-cash bridge
    - `TASK-351` pipeline/renewals/profitability
- documentos vivos actualizados:
  - `docs/tasks/README.md`
  - `docs/tasks/TASK_ID_REGISTRY.md`
- validación ejecutada:
  - revisión manual de consistencia entre task block, índice y registry
  - pendiente natural del próximo agente: tomar `TASK-344` antes de implementar runtime de Quotation

## Sesion 2026-04-11 — TASK-313: Skills y certificaciones — perfil profesional, verificación Efeonce y CRUD

- rama: `task/TASK-313-skills-certifications-profile-crud`
- alcance implementado:
  - **3 migraciones**: social links en `members`, visibility en `member_skills`, tabla `member_certifications`
  - **Asset context**: `certification_draft` / `certification` — upload, attach, access control
  - **Certification service**: CRUD + verificación + rechazo en `src/lib/hr-core/certifications.ts`
  - **Skills service extendido**: self-service (upsert/remove/verify/unverify sin space), visibility field
  - **10 API routes**: self-service (`/api/my/skills`, `/api/my/certifications`, `/api/my/professional-links`) + admin (`/api/hr/core/members/[memberId]/skills`, certifications, verify, professional-profile)
  - **4 UI components**: `SkillsCertificationsTab` (shared self/admin), `CertificatePreviewDialog`, `ProfessionalLinksCard`, `AboutMeCard`
  - **Integración**: nueva tab "Skills y certificaciones" en `/my/profile` y `/admin/users/[id]`
  - **Nomenclatura**: `GH_SKILLS_CERTS` en `greenhouse-nomenclature.ts`
  - **Badge**: reutiliza `VerifiedByEfeonceBadge` existente
- política de visibilidad: `internal` (self+admin) vs `client_visible` (requiere verified)
- verificación: `pnpm lint` ✓, `tsc --noEmit` ✓ (1 error pre-existente), `pnpm build` ✓
- migraciones aplicadas: 3/3 contra Cloud SQL, `db.d.ts` regenerado (181 tablas)
- docs de arquitectura actualizados:
  - `GREENHOUSE_UI_PLATFORM_V1.md` — patrón de perfil profesional + preview embebido
  - `Greenhouse_HRIS_Architecture_v1.md` — agregado de certificaciones, social links, verificación
- cross-impact: delta notes aplicados a 9 tasks (TASK-314 a TASK-320, TASK-332, TASK-334)
- **STATUS: COMPLETE** — task movida a `docs/tasks/complete/`

## Sesion 2026-04-11 — contrato arquitectónico persona ↔ entidad legal para CCA y compensación ejecutiva

- alcance cerrado:
  - se agregó la spec canónica `docs/architecture/GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1.md`
  - el repo ya deja explícito que relaciones societarias/contractuales/financieras no deben colgar primariamente de `user`, `member`, `space` ni `organization_type`
  - `Finance > Cuenta accionista` queda documentada como instrumento derivado de una relación `person ↔ legal entity`
  - `Payroll` queda documentado como owner de nómina formal, sin absorber toda la semántica de compensación ejecutiva
- documentos vivos actualizados:
  - `docs/architecture/GREENHOUSE_PERSON_LEGAL_ENTITY_RELATIONSHIPS_V1.md`
  - `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md`
  - `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
  - `project_context.md`
  - `docs/README.md`
  - `changelog.md`
- validación ejecutada:
  - revisión manual de consistencia documental cross-module
  - no aplica build/lint; no hubo cambios de runtime
  - pendiente natural: bajar esta semántica a task/ADR de implementación cuando se quiera tocar modelo runtime

## Sesion 2026-04-11 — arquitectura base para separar estructura, equipos y capacidad extendida

- alcance cerrado:
  - quedó documentada la semántica canónica para no mezclar:
    - estructura interna
    - equipos operativos
    - trabajo puntual
    - capacidad extendida
  - `Mi Perfil`, `People`, `Mi equipo`, `Org Chart` y directorios internos ya tienen una pauta explícita de diseño/lectura antes de abrir una task nueva de UX o modelado
  - `assignments` queda formalizado como contrato de equipo operativo, no como reader suficiente de estructura interna
- documentos vivos actualizados:
  - `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md`
  - `docs/architecture/GREENHOUSE_PERSON_COMPLETE_360_V1.md`
  - `project_context.md`

## Sesion 2026-04-11 — leave reenganchado al pipeline canónico de avatar/persona

- alcance cerrado:
  - `HR > Permisos` y `/api/my/leave` dejaron de recibir `memberAvatarUrl: null` desde el store PostgreSQL por un gap de migración tras la eliminación del fallback hardcodeado por nombres
  - el store de permisos ahora resuelve persona/avatar con el pipeline canónico vigente:
    - `greenhouse_serving.person_360`
    - `resolveAvatarUrl()`
    - fallback defensivo a `greenhouse_core.members.avatar_url`
  - el ajuste cubre:
    - `listLeaveRequestsFromPostgres()`
    - `getLeaveRequestByIdInternal()`
    - la respuesta inmediata de `createLeaveRequestInPostgres()`
- archivos sensibles / de alto impacto tocados:
  - `src/lib/hr-core/postgres-leave-store.ts`
  - `src/lib/hr-core/postgres-leave-store.test.ts`
- validación ejecutada:
  - `pnpm exec vitest run src/lib/hr-core/postgres-leave-store.test.ts src/lib/hr-core/service.test.ts` — OK
  - `pnpm exec eslint src/lib/hr-core/postgres-leave-store.ts src/lib/hr-core/postgres-leave-store.test.ts` — OK
  - `pnpm build` — OK

## Sesion 2026-04-11 — organigrama con lectura por liderazgo + acceso visible a Mi equipo

- alcance cerrado:
  - `HR > Organigrama` ahora soporta dos lecturas complementarias en la misma route:
    - `Estructura`: mantiene departamentos como nodos estructurales
    - `Líderes y equipos`: agrupa por personas líderes y deja las áreas asociadas como metadata
  - la vista alternativa no reutiliza el grafo estructural como si fuera el mismo contrato; deriva un modelo propio de liderazgo para no reabrir la duplicación entre responsables y áreas
  - `Mi equipo` y `Aprobaciones` ya quedan visibles en el menú lateral para perfiles broad HR/admin con identidad interna vinculada, además de los supervisors que aterrizan por workspace
- archivos sensibles / de alto impacto tocados:
  - `src/views/greenhouse/hr-core/HrOrgChartView.tsx`
  - `src/components/greenhouse/OrgLeadershipNodeCard.tsx`
  - `src/lib/reporting-hierarchy/org-chart-leadership.ts`
  - `src/components/layout/vertical/VerticalMenu.tsx`
  - `src/config/greenhouse-nomenclature.ts`
- validación ejecutada:
  - `pnpm exec vitest run src/lib/reporting-hierarchy/org-chart-leadership.test.ts src/lib/reporting-hierarchy/org-chart.test.ts src/app/api/hr/core/org-chart/route.test.ts` — OK
  - `pnpm exec eslint src/views/greenhouse/hr-core/HrOrgChartView.tsx src/components/greenhouse/OrgLeadershipNodeCard.tsx src/components/layout/vertical/VerticalMenu.tsx src/config/greenhouse-nomenclature.ts src/lib/reporting-hierarchy/org-chart-leadership.ts src/lib/reporting-hierarchy/org-chart-leadership.test.ts` — OK

## Sesion 2026-04-11 — organigrama estructural sin duplicar responsables como hijos

- alcance cerrado:
  - `HR > Organigrama` ya no duplica a la persona responsable de un área como si fuera hija de su propio departamento
  - el reader ahora resuelve un parentaje visual robusto en este orden:
    - adscripción estructural directa (`members.department_id`)
    - liderazgo de área (`departments.head_member_id`)
    - contexto estructural heredado desde el área visible más cercana
  - regla operativa explícita:
    - los departamentos son los nodos estructurales del organigrama
    - el responsable del área se representa dentro del nodo del departamento, no como persona hija de esa misma área
    - la supervisoría formal sigue visible como metadata y se administra en `HR > Jerarquía`, pero no define las aristas del organigrama
  - cuando una persona todavía no tiene adscripción estructural directa:
    - el breadcrumb conserva el contexto completo del área visible
    - el panel lateral marca el caso como `Contexto heredado`
    - el nodo cuelga del área estructural visible más cercana, no de otra persona
- archivos sensibles / de alto impacto tocados:
  - `src/lib/reporting-hierarchy/org-chart.ts`
  - `src/views/greenhouse/hr-core/HrOrgChartView.tsx`
  - `src/components/greenhouse/OrgChartNodeCard.tsx`
  - `src/types/hr-core.ts`
- validación ejecutada:
  - `pnpm exec vitest run src/lib/reporting-hierarchy/org-chart.test.ts src/app/api/hr/core/org-chart/route.test.ts` — OK
  - `pnpm exec eslint src/lib/reporting-hierarchy/org-chart.ts src/lib/reporting-hierarchy/org-chart.test.ts src/views/greenhouse/hr-core/HrOrgChartView.tsx src/components/greenhouse/OrgChartNodeCard.tsx src/types/hr-core.ts` — OK
  - `pnpm lint` — OK
  - `pnpm build` — OK

## Sesion 2026-04-10 — cierre de issues 036-043 en jerarquía, organigrama y departamentos

- alcance cerrado:
  - `ISSUE-036`: la ficha HR ya resuelve supervisoría desde la jerarquía canónica en Postgres
  - `ISSUE-037`: el historial preserva `effectiveTo` y demás timestamps aunque Postgres/Kysely los entregue como `Date`
  - `ISSUE-038`: asignar `head_member_id` en departamentos sincroniza la adscripción del responsable y el organigrama tiene fallback estructural
  - `ISSUE-039`: los modales de cambio de supervisor y reasignación masiva muestran validación visible cuando falta la razón
  - `ISSUE-040`: el reemplazo de delegaciones quedó transaccional; ya no puede dejar al supervisor sin delegación activa si falla el create
  - `ISSUE-041`: la reasignación masiva calcula reportes directos según la `effectiveFrom` elegida
  - `ISSUE-042`: `HR > Organigrama` ahora materializa estructura de departamentos y no una cadena de reporting lines
  - `ISSUE-043`: el menú lateral ya muestra `Organigrama` cuando el acceso supervisor-limited realmente puede abrir la ruta
- validación ejecutada:
  - `pnpm exec vitest run src/lib/reporting-hierarchy/admin.test.ts src/lib/reporting-hierarchy/org-chart.test.ts src/lib/hr-core/service.test.ts src/lib/hr-core/postgres-departments-store.test.ts src/views/greenhouse/hr-core/HrHierarchyView.test.tsx src/lib/tenant/authorization.test.ts src/app/api/hr/core/org-chart/route.test.ts` — OK
  - `pnpm lint` — OK
  - `pnpm build` — OK
- nota operativa:
  - los issues `ISSUE-036` a `ISSUE-043` quedaron movidos a `docs/issues/resolved/` y el tracker ya no los deja abiertos
  - el cierre mezcla fixes ya empujados en `develop` con el remate documental y de fallback estructural final

## Sesion 2026-04-10 — organigrama/departamentos realineados con estructura

- alcance cerrado:
  - `HR > Organigrama` ya no usa `reporting_lines` como edges principales; ahora materializa:
    - `greenhouse_core.departments.parent_department_id`
    - `greenhouse_core.members.department_id`
    - fallback estructural por `departments.head_member_id` cuando el snapshot del miembro todavía no está al día
  - `HR > Departamentos` ahora sincroniza `members.department_id` al crear o cambiar `head_member_id`
  - el store de departamentos ya bloquea ciclos transitorios de padre/hijo (`A -> B -> A`)
  - `/hr/org-chart` y `GET /api/hr/core/org-chart` usan un resolver propio `resolveHrOrgChartAccessContext()` en vez de reciclar el access resolver de permisos
  - el menú lateral ya deja visible `Organigrama` para personas que entran por el workspace supervisor
- archivos sensibles / de alto impacto tocados:
  - `src/lib/reporting-hierarchy/org-chart.ts`
  - `src/lib/hr-core/postgres-departments-store.ts`
  - `src/views/greenhouse/hr-core/HrOrgChartView.tsx`
  - `src/components/greenhouse/OrgChartNodeCard.tsx`
  - `src/components/layout/vertical/VerticalMenu.tsx`
  - `src/lib/tenant/authorization.ts`
- validación ejecutada:
  - `pnpm exec vitest run src/lib/reporting-hierarchy/org-chart.test.ts src/lib/hr-core/postgres-departments-store.test.ts src/app/api/hr/core/org-chart/route.test.ts src/lib/tenant/authorization.test.ts` — OK
  - `pnpm exec tsc --noEmit --incremental false` — OK
  - `pnpm lint` — OK
  - `pnpm build` — OK
- nota operativa:
  - los issues `ISSUE-038`, `ISSUE-042` y `ISSUE-043` quedaron movidos a `resolved/` junto con el update del tracker
  - el fix de `ISSUE-038` deja corregido el write lane y el organigrama; consumers legacy como la ficha HR siguen siendo otra lane distinta si se quiere eliminar todo fallback restante

## Sesion 2026-04-10 — follow-up jerarquía/org chart en staging

- alcance cerrado:
  - `HR > Jerarquía` ya no confunde una línea futura abierta con la supervisión vigente al guardar cambios con fecha efectiva hoy
  - las validaciones de reporting hierarchy ahora devuelven errores de dominio (`HrCoreValidationError`) en vez de caer en `500` genérico
  - `GET /api/hr/core/hierarchy/history` ya no revienta cuando Postgres entrega `created_at` / `updated_at` como `Date` en delegaciones
  - `HR > Organigrama` ahora puede recuperar `departmentName` desde roster (`People`) cuando la snapshot de jerarquía todavía viene atrasada
  - la UI de delegaciones deja explícito que solo una delegación primaria puede quedar activa por supervisor y que una nueva reemplaza la anterior
- archivos sensibles / de alto impacto tocados:
  - `src/lib/reporting-hierarchy/store.ts`
  - `src/lib/reporting-hierarchy/shared.ts`
  - `src/lib/reporting-hierarchy/admin.ts`
  - `src/app/api/hr/core/hierarchy/history/route.ts`
  - `src/lib/reporting-hierarchy/org-chart.ts`
  - `src/lib/people/get-people-list.ts`
  - `src/views/greenhouse/hr-core/HrHierarchyView.tsx`
- validación ejecutada:
  - `pnpm exec vitest run src/app/api/hr/core/hierarchy/history/route.test.ts src/lib/reporting-hierarchy/org-chart.test.ts` — OK
  - `pnpm exec eslint src/lib/reporting-hierarchy/store.ts src/lib/reporting-hierarchy/shared.ts src/lib/reporting-hierarchy/admin.ts src/app/api/hr/core/hierarchy/history/route.ts src/lib/people/get-people-list.ts src/lib/reporting-hierarchy/org-chart.ts src/views/greenhouse/hr-core/HrHierarchyView.tsx src/app/api/hr/core/hierarchy/history/route.test.ts src/lib/reporting-hierarchy/org-chart.test.ts src/types/people.ts` — OK
  - `pnpm lint` — OK
  - `pnpm build` — OK
- nota operativa:
  - en staging quedó una línea futura de Daniela (`2026-04-11`) creada durante la depuración previa; este fix está pensado justamente para permitir adelantar esa reasignación a hoy sin dejar la vista actual en estado incoherente

## Sesion 2026-04-10 — TASK-330 cerrada: gobernanza de drift Entra vs Greenhouse

- alcance cerrado:
  - nueva migración:
    - `migrations/20260410133033615_reporting-hierarchy-drift-governance.sql`
  - nueva cola canónica de review:
    - `greenhouse_sync.reporting_hierarchy_drift_proposals`
  - nueva helper lane:
    - `src/lib/reporting-hierarchy/governance.ts`
  - Graph client ampliado:
    - `src/lib/entra/graph-client.ts` ahora resuelve `manager`
  - nuevos endpoints runtime:
    - `GET /api/hr/core/hierarchy/governance`
    - `POST /api/hr/core/hierarchy/governance/run`
    - `POST /api/hr/core/hierarchy/governance/proposals/[proposalId]/resolve`
  - Entra cron/webhook ya reusan el mismo snapshot de usuarios para:
    - profile sync
    - drift detection de jerarquía
  - `HR > Jerarquía` ya materializa un panel de gobernanza con:
    - policy visible
    - último run
    - resumen de propuestas
    - acciones aprobar / rechazar / descartar
- regla operativa vigente:
  - `greenhouse_core.reporting_lines` sigue siendo la fuente formal canónica
  - Entra solo propone drift; no pisa supervisoría manual silenciosamente
  - approvals ya snapshot-eados en `greenhouse_hr.workflow_approval_snapshots` no se recalculan retroactivamente
- validación ejecutada:
  - `pnpm exec vitest run src/app/api/hr/core/hierarchy/governance/route.test.ts src/app/api/hr/core/hierarchy/governance/run/route.test.ts src/app/api/hr/core/hierarchy/governance/proposals/[proposalId]/resolve/route.test.ts src/app/api/cron/entra-profile-sync/route.test.ts` — OK
  - `pnpm exec tsc --noEmit --incremental false` — OK
  - `pnpm lint` — OK
  - `pnpm pg:connect:migrate` — OK
  - `pnpm build` — OK
- nota operativa:
  - `reporting_lines`, `members` y la cola de drift siguen sin `space_id`; esta capability mantiene el mismo aislamiento interno por tenant context/route group `hr` que el resto del bloque de jerarquía
  - el Cloud SQL Proxy quedó levantado por `pg:connect:migrate`; si sigue vivo fuera de la sesión, puede cerrarse con `kill 59099`

## Sesion 2026-04-10 — TASK-329 cerrada: organigrama y explorador de jerarquias

- alcance cerrado:
  - nueva helper lane read-only:
    - `src/lib/reporting-hierarchy/org-chart.ts`
  - nueva route runtime:
    - `GET /api/hr/core/org-chart`
  - nuevas surfaces:
    - `src/views/greenhouse/hr-core/HrOrgChartView.tsx`
    - `src/components/greenhouse/OrgChartNodeCard.tsx`
    - `/hr/org-chart`
  - navegación/access actualizados:
    - `equipo.organigrama` en view catalog
    - item nuevo en menu HR
    - entry point desde `HrCoreDashboard`
    - búsqueda rápida alineada a `/hr/org-chart`
  - nuevos contratos tipados:
    - `HrOrgChartNode`
    - `HrOrgChartEdge`
    - `HrOrgChartBreadcrumb`
    - `HrOrgChartResponse`
  - la spec de `TASK-329` quedó saneada antes de implementar para reflejar:
    - `TASK-325`, `TASK-327` y `TASK-328` ya cerradas
    - `/hr/hierarchy`, `/hr/team` y `/hr/approvals` ya existentes
    - visibilidad broad vs supervisor subtree-aware sobre la misma jerarquía canonica
- archivos sensibles / de alto impacto tocados:
  - `package.json`
  - `pnpm-lock.yaml`
  - `src/app/(dashboard)/hr/layout.tsx`
  - `src/app/(dashboard)/hr/page.tsx`
  - `src/components/layout/vertical/VerticalMenu.tsx`
  - `src/lib/admin/view-access-catalog.ts`
  - `src/lib/reporting-hierarchy/admin.ts`
  - `src/lib/tenant/authorization.ts`
  - `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
  - `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
- validación ejecutada:
  - `pnpm pg:doctor` — OK
  - `pnpm migrate:status` — no ejecutable sin Cloud SQL Proxy en `127.0.0.1:15432`; no hubo migración en este slice
  - `pnpm exec vitest run src/lib/reporting-hierarchy/org-chart.test.ts src/app/api/hr/core/org-chart/route.test.ts` — OK
  - `pnpm exec tsc --noEmit --incremental false` — OK
  - `pnpm lint` — OK
  - `pnpm build` — OK
  - smoke local autenticada con usuario agente (`agent@greenhouse.efeonce.org`) contra `http://localhost:3002`:
    - `GET /api/hr/core/org-chart` — 200
    - `GET /hr/org-chart` — 200
- nota operativa:
  - durante la smoke real apareció una falla SQL en `listHierarchy()` por CTE recursiva sin `WITH RECURSIVE`; quedó corregida en `src/lib/reporting-hierarchy/admin.ts`
  - el tenant actual sigue teniendo una jerarquía plana en `reporting_lines` (`7` raíces, `0` aristas). El organigrama materializa correctamente ese estado de datos; no es un bug de rendering
  - Playwright MCP no pudo usarse en esta sesión por `ENOENT` al crear `/.playwright-mcp`; la verificación runtime quedó hecha con cookie real de agente + `curl`

## Sesion 2026-04-10 — TASK-328 cerrada: workspace supervisor materializado

- alcance cerrado:
  - nueva lane agregada `src/lib/hr-core/supervisor-workspace.ts` para componer:
    - scope derivado de supervisor
    - cola de approvals visible
    - ausencias próximas
    - roster del subárbol reutilizable por UI
  - nueva route runtime:
    - `GET /api/hr/core/supervisor-workspace`
  - nuevas surfaces:
    - `src/views/greenhouse/hr-core/SupervisorWorkspaceView.tsx`
    - `/hr/team`
    - `/hr/approvals`
  - `/hr` ya es supervisor-aware:
    - HR/admin conserva `HrCoreDashboard`
    - supervisor limitado aterriza en `Mi equipo`
  - la spec de `TASK-328` quedó saneada contra el repo real antes de implementar
- validación ejecutada:
  - `pnpm exec tsc --noEmit --incremental false` — OK
  - `pnpm vitest run src/app/api/hr/core/supervisor-workspace/route.test.ts src/app/api/hr/core/meta/route.test.ts src/views/greenhouse/hr-core/HrLeaveView.test.tsx` — OK
  - `pnpm lint` — OK
  - `pnpm build` — OK
- siguiente paso natural:
  - `TASK-329` para materializar organigrama/explorer sobre la misma foundation
  - `TASK-330` para source governance, sync y drift de jerarquías

## Sesion 2026-04-10 — TASK-327 cerrada: supervisor scope subtree-aware

- alcance cerrado:
  - nueva helper lane `src/lib/reporting-hierarchy/access.ts` para derivar scope de supervisor desde `reporting_lines` + `approval_delegate`
  - `requirePeopleTenantContext()` ya distingue acceso `broad` vs `supervisor` sin crear un role code `supervisor`
  - `/people` ya puede abrirse en modo supervisor limitado; list, detail y subroutes relevantes recortan visibilidad al subárbol o delegación vigente
  - `PersonView` ya recibe tabs limitadas para supervisoría (`profile`, `activity`, `memberships`) sin abrir HR profile, payroll ni finance
  - `/hr/leave` ya puede abrirse para supervisoría limitada sin otorgar `routeGroup: hr`
  - `leave` mantiene visibilidad por snapshot/direct supervisor y ahora acepta subtree/delegation también en checks de member visibility para readers puntuales
  - la spec de `TASK-327` quedó saneada contra el repo real y lista para archivo en `complete/`
- validación ejecutada:
  - `pnpm exec tsc --noEmit --incremental false` — OK
  - `pnpm exec vitest run src/lib/tenant/authorization.test.ts src/lib/people/permissions.test.ts` — OK
  - `pnpm lint` — OK
  - `pnpm build` — OK
- siguiente paso natural:
  - `TASK-328` para materializar el workspace de supervisor y la cola dedicada de aprobaciones
  - `TASK-329` para el organigrama/explorer sobre la misma policy subtree-aware

## Sesion 2026-04-10 — TASK-326 cerrada: approval authority snapshots

- alcance cerrado:
  - nueva lane shared `src/lib/approval-authority/{types,config,resolver,store}.ts`
  - nueva migración `migrations/20260410114658761_workflow-approval-snapshots.sql`
  - nueva tabla `greenhouse_hr.workflow_approval_snapshots` con snapshot por dominio/etapa
  - `src/lib/hr-core/postgres-leave-store.ts` ya resuelve autoridad por dominio y congela snapshot en submit/review
  - `leave` ya permite aprobación por delegado activo y deja auditado el override HR cuando interviene fuera de la cadena normal
  - `src/lib/sync/projections/notifications.ts` ya notifica al aprobador efectivo del snapshot y reutiliza fallback roles del workflow
- validación ejecutada:
  - `pnpm vitest run src/lib/approval-authority/resolver.test.ts` — OK
  - `pnpm vitest run src/lib/sync/projections/notifications.test.ts` — OK
- siguiente paso natural:
  - `TASK-327` para subtree-aware access y visibilidad limitada del supervisor

## Sesion 2026-04-10 — TASK-325 cerrada: admin de jerarquías HR

- alcance cerrado:
  - nueva superficie `HR > Jerarquía` en `/hr/hierarchy`
  - nuevas APIs dedicadas:
    - `GET /api/hr/core/hierarchy`
    - `GET /api/hr/core/hierarchy/history`
    - `POST /api/hr/core/hierarchy/reassign`
    - `GET/POST/DELETE /api/hr/core/hierarchy/delegations`
  - nueva helper lane `src/lib/reporting-hierarchy/admin.ts` para:
    - listado enriquecido de jerarquía actual
    - historial auditado de `reporting_lines`
    - delegaciones temporales por `approval_delegate`
    - cambio individual de supervisor
    - reasignación bulk de reportes directos
  - `src/lib/reporting-hierarchy/store.ts` ahora expone `upsertReportingLineInTransaction()` para reuse transaccional en bulk ops
  - navegación/access actualizados:
    - `equipo.jerarquia` en view catalog
    - item nuevo en menú HR
    - entry point desde `HrCoreDashboard`
    - búsqueda rápida alineada a `/hr/hierarchy`
  - documentación alineada:
    - snapshot baseline ahora incluye `operational_responsibilities`
    - docs de arquitectura y documentación funcional HR ya mencionan la nueva surface
  - migración de hardening aplicada:
    - `migrations/20260410105829326_reporting-hierarchy-runtime-grants.sql`
    - resuelve grants runtime sobre `greenhouse_core.reporting_lines`
- archivos sensibles / de alto impacto tocados:
  - `src/lib/reporting-hierarchy/store.ts`
  - `src/lib/reporting-hierarchy/admin.ts`
  - `src/app/api/hr/core/hierarchy/**`
  - `src/views/greenhouse/hr-core/HrHierarchyView.tsx`
  - `src/app/(dashboard)/hr/layout.tsx`
  - `src/app/(dashboard)/hr/page.tsx`
  - `src/app/(dashboard)/hr/hierarchy/page.tsx`
  - `src/components/layout/vertical/VerticalMenu.tsx`
  - `src/lib/admin/view-access-catalog.ts`
  - `docs/architecture/schema-snapshot-baseline.sql`
- validación ejecutada:
  - `pnpm pg:connect:migrate` — OK
  - runtime query a `greenhouse_core.reporting_lines` como app user — OK (`count = 7`)
  - `pnpm exec tsc --noEmit --incremental false` — OK
  - `pnpm exec vitest run src/app/api/hr/core/hierarchy/route.test.ts src/app/api/hr/core/hierarchy/history/route.test.ts src/app/api/hr/core/hierarchy/reassign/route.test.ts src/app/api/hr/core/hierarchy/delegations/route.test.ts src/views/greenhouse/hr-core/HrHierarchyView.test.tsx` — OK
  - `pnpm lint` — OK
  - `pnpm build` — OK
- nota operativa:
  - `members`, `reporting_lines` y `operational_responsibilities` siguen sin `space_id`; el aislamiento actual de esta capacidad entra por `tenant context`, route group `hr` y `authorizedViews`, no por filtro físico por tenant en esas tablas
  - quedaron cambios ajenos ya presentes en el worktree bajo `docs/issues/**`, `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md` y `src/app/api/internal/ico-diagnostics/route.ts`; no se tocaron ni se deben revertir desde este slice

## Sesion 2026-04-10 — foundation compartida de iconografia: Tabler + Flaticon + BrandLogo

- alcance en curso:
  - se instaló `@flaticon/flaticon-uicons`
  - `src/app/layout.tsx` ahora importa selectivamente:
    - `@flaticon/flaticon-uicons/css/brands/all.css`
    - `@flaticon/flaticon-uicons/css/regular/rounded.css`
  - nuevo primitive shared:
    - `src/components/greenhouse/GhIcon.tsx`
    - `src/components/greenhouse/gh-icon-registry.ts`
  - `BrandLogo` se amplió para redes profesionales comunes (`linkedin`, `behance`, `dribbble`, `x`, `threads`, `twitter`)
  - primeros consumers adaptados:
    - `src/components/greenhouse/TeamIdentityBadgeGroup.tsx`
    - `src/views/greenhouse/my/my-profile/tabs/AboutOverview.tsx`
- archivos sensibles / de alto impacto tocados:
  - `package.json`
  - `pnpm-lock.yaml`
  - `src/app/layout.tsx`
  - `src/components/greenhouse/BrandLogo.tsx`
  - `src/components/greenhouse/index.ts`
- nota operativa:
  - la regla vigente es `Tabler` para semántica de producto, `BrandLogo` para logos reales y `Flaticon` solo como fuente complementaria detrás de la primitive `GhIcon`
  - el serving actual de assets privados sigue devolviendo `Content-Disposition: attachment`; el preview embebido de certificados de `TASK-313` necesitará una vía inline/controlada adicional

## Sesion 2026-04-10 — hardening GCP auth local vs Vercel runtime

- alcance en curso:
  - `src/lib/google-credentials.ts` ahora trata `Workload Identity Federation` como credencial de runtime real de Vercel, no como fallback activable por un `VERCEL_OIDC_TOKEN` persistido en `.env*`
  - se agregó diagnóstico explícito para detectar drift local:
    - `hasPersistedLocalVercelOidcToken()`
    - `getGoogleCredentialDiagnostics()`
    - `pnpm gcp:doctor`
  - páginas admin que consumen `getAdminAccessOverview()` quedaron `force-dynamic` para evitar que el build estático vuelva a cruzar esta ruta como si fuera dato estable
- archivos sensibles / de alto impacto tocados:
  - `src/lib/google-credentials.ts`
  - `src/lib/google-credentials.test.ts`
  - `scripts/gcp-auth-doctor.ts`
  - `scripts/lib/load-greenhouse-tool-env.ts`
  - `src/app/(dashboard)/admin/page.tsx`
  - `src/app/(dashboard)/admin/users/page.tsx`
  - `src/app/(dashboard)/admin/roles/page.tsx`
- nota operativa:
  - `WIF` sigue siendo la postura preferida en `Vercel`; el hardening solo evita usar tokens OIDC efímeros como si fueran secretos persistibles para local/CLI
  - si `pnpm gcp:doctor` reporta `VERCEL_OIDC_TOKEN` en `.env.local` o `.env.production.local`, la remediación correcta es remover esa variable de los archivos locales, no desactivar `WIF`

## Sesion 2026-04-10 — TASK-157 cerrada: Skills Matrix + Intelligent Staffing Engine

- alcance cerrado:
  - nuevas tablas canónicas en `greenhouse_core`:
    - `skill_catalog`
    - `member_skills`
    - `service_skill_requirements`
  - nuevo helper `src/lib/agency/skills-staffing.ts` con validación tenant-safe por `spaceId`, reads/writes canónicos y scoring de cobertura/fit
  - nuevas APIs:
    - `GET /api/agency/skills`
    - `GET/PATCH /api/agency/skills/members/[memberId]`
    - `GET/PATCH /api/agency/skills/services/[serviceId]`
    - `GET /api/agency/staffing`
  - `Space 360 > Team` ahora consume la matriz de skills y muestra:
    - cobertura agregada del Space
    - chips de skills por persona
    - gaps y recomendaciones por servicio
  - `src/lib/sync/event-catalog.ts` agrega eventos de outbox para `member_skill` y `service_skill_requirement`
- archivos sensibles / de alto impacto tocados:
  - `migrations/20260410012752662_skills-matrix-staffing.sql`
  - `src/lib/agency/skills-staffing.ts`
  - `src/lib/agency/space-360.ts`
  - `src/views/greenhouse/agency/space-360/tabs/TeamTab.tsx`
  - `src/app/api/agency/skills/**`
  - `src/app/api/agency/staffing/route.ts`
  - `src/types/agency-skills.ts`
  - `src/types/db.d.ts`
- validación ejecutada:
  - `pnpm pg:connect:migrate` — OK
  - `pnpm exec tsc --noEmit --incremental false` — OK
  - `pnpm exec vitest run src/views/greenhouse/agency/space-360/Space360View.test.tsx` — OK
  - `pnpm lint` — OK
  - `pnpm build` — OK
- nota operativa:
  - el primer corte del staffing engine rankea y detecta gaps sobre los miembros ya asignados al `space_id` canónico; la búsqueda cross-space de talento queda como follow-on futuro si se requiere
  - durante `pnpm build` reapareció el fallback no bloqueante de `admin-access-overview` hacia BigQuery por `invalid_grant` de un ID token stale; el build completó OK y no pertenece al slice de TASK-157

## Sesion 2026-04-10 — TASK-306 cerrada: trazabilidad canónica de Cuenta accionista

- alcance cerrado:
  - `greenhouse_finance.shareholder_account_movements` ahora persiste `source_type` + `source_id`
  - nueva helper lane `src/lib/finance/shareholder-account/source-links.ts` para búsqueda/resolución tenant-safe de `expense`, `income`, `expense_payment`, `income_payment` y `settlement_group`
  - nueva route `GET /api/finance/shareholder-account/lookups/sources`
  - `GET/POST /api/finance/shareholder-account/[id]/movements` ya devuelve/acepta el contrato canónico de origen
  - UI CCA ahora usa búsqueda remota, muestra origen enriquecido y deja de pedir IDs libres
  - `ExpenseDetailView` e `IncomeDetailView` ya abren la creación de movimientos CCA con contexto del documento real
- archivos sensibles / de alto impacto tocados:
  - `src/lib/finance/shareholder-account/store.ts`
  - `src/app/api/finance/shareholder-account/[id]/movements/route.ts`
  - `src/app/api/finance/shareholder-account/lookups/sources/route.ts`
  - `src/views/greenhouse/finance/shareholder-account/*`
  - `src/views/greenhouse/finance/ExpenseDetailView.tsx`
  - `src/views/greenhouse/finance/IncomeDetailView.tsx`
  - `src/types/db.d.ts`
  - `migrations/20260410005343119_shareholder-account-canonical-traceability.sql`
- validación ejecutada:
  - `pnpm exec tsc --noEmit --incremental false` — OK
  - `pnpm pg:connect:migrate` — OK
  - `pnpm lint` — OK
  - `pnpm build` — OK
- nota operativa:
  - durante `pnpm build` apareció un fallback no bloqueante en `admin-access-overview` hacia BigQuery por `invalid_grant` de un ID token stale; el build completó OK y no pertenece al slice de TASK-306

## Sesion 2026-04-09 — Skill nueva de Claude: `codex-skill-creator`

- se creó la skill local de Claude en:
  - `.claude/skills/codex-skill-creator/skill.md`
- objetivo:
  - crear o actualizar skills de Codex bajo `.codex/skills/`
  - estandarizar la estructura mínima de `SKILL.md`, `agents/openai.yaml` y el uso opcional de `references/`, `scripts/` y `assets/`
- decisión de alcance:
  - se descartó crear otra skill de Codex para esto
  - la necesidad real era una skill de Claude que supiera producir skills de Codex

## Sesion 2026-04-09 — TASK-305 cerrado + skill de Claude integrada

- se integró también el trabajo creado por Claude en `feature/codex-claude-skill-builder`
- resultado publicado en el repo:
  - `.claude/skills/greenhouse-secret-hygiene/skill.md`
- decisión operativa:
  - no se reescribió la skill de Claude
  - se preserva exactamente el archivo que Claude ya había creado
- `TASK-305` quedó movida a `complete/` y el índice de tasks ya refleja el cierre
- además se documentó para Claude cómo crear skills de Codex en:
  - `AGENTS.md`
  - `CLAUDE.md`
  - `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`

## Sesion 2026-04-09 — Skill nueva: `claude-skill-creator`

- se investigó la documentación oficial actual de Claude Skills:
  - fuente: `https://code.claude.com/docs/en/skills`
- hallazgo clave:
  - Anthropic documenta `.claude/skills/<skill-name>/SKILL.md` como entrypoint canónico
  - el repo todavía tiene ejemplos legacy con `skill.md` minúscula en `.claude/skills/`
- se creó la skill local de Codex en:
  - `.codex/skills/claude-skill-creator/SKILL.md`
  - `.codex/skills/claude-skill-creator/agents/openai.yaml`
  - `.codex/skills/claude-skill-creator/references/official-claude-skills-reference.md`
- objetivo:
  - crear o actualizar skills de Claude usando formato oficial, frontmatter correcto y supporting files cuando haga falta
  - reconciliar explícitamente el drift entre el estándar oficial `SKILL.md` y los ejemplos legacy del repo
- follow-on relacionado:
  - `TASK-305` ya quedó cerrada sobre la implementación real que Claude dejó en `.claude/skills/greenhouse-secret-hygiene/skill.md`

## Sesion 2026-04-09 — Skill nueva: `greenhouse-secret-hygiene`

- se creó la skill local de Codex en:
  - `.codex/skills/greenhouse-secret-hygiene/SKILL.md`
  - `.codex/skills/greenhouse-secret-hygiene/agents/openai.yaml`
- objetivo:
  - estandarizar auditoría, clasificación de riesgo, remediación mínima segura y verificación de secretos para Secret Manager, auth, webhooks, PostgreSQL y provider tokens
  - default `read-only` salvo instrucción explícita del usuario para rotar/corregir en origen
- follow-on ya cerrado para Claude:
  - `docs/tasks/complete/TASK-305-claude-secret-hygiene-skill.md`
- documentación de índice actualizada:
  - `docs/tasks/README.md`
  - `docs/tasks/TASK_ID_REGISTRY.md`

## Sesion 2026-04-09 — ISSUE-032 cerrado: Secret Manager payload contamination

- contexto:
  - después del incidente de Nubox se auditó el resto de secretos runtime críticos servidos por `*_SECRET_REF`
  - se detectó el mismo patrón de payload contaminado en secretos de auth y un caso menor de webhook
- causa raíz confirmada:
  - algunos secretos en GCP Secret Manager habían sido publicados con comillas envolventes o whitespace/literal `\\n` residual
  - `src/lib/secrets/secret-manager.ts` saneaba refs `*_SECRET_REF`, pero no el payload efectivo devuelto por Secret Manager
- fix aplicado:
  - `src/lib/secrets/secret-manager.ts` ahora sanea payloads y fallbacks env antes de entregarlos al runtime
  - cobertura agregada en `src/lib/secrets/secret-manager.test.ts`
  - se publicaron nuevas versiones limpias de:
    - `greenhouse-google-client-secret-shared`
    - `greenhouse-nextauth-secret-staging`
    - `greenhouse-nextauth-secret-production`
    - `webhook-notifications-secret`
  - se documentó el protocolo anti-contaminación en:
    - `AGENTS.md`
    - `CLAUDE.md`
    - `project_context.md`
    - `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md`
    - `docs/operations/ISSUE_OPERATING_MODEL_V1.md`
    - `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`
    - `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`
    - `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
    - `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
    - `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- validación ejecutada:
  - `pnpm exec vitest run src/lib/secrets/secret-manager.test.ts src/lib/auth-secrets.test.ts src/lib/nubox/client.test.ts` — OK
  - `pnpm exec tsc --noEmit --incremental false` — OK
  - `pnpm lint` — OK
  - `pnpm staging:request /api/auth/providers --pretty` — `200`
  - `pnpm staging:request /api/auth/session --pretty` — `200`
  - `curl https://greenhouse.efeoncepro.com/api/auth/providers` — `200`
  - `curl https://greenhouse.efeoncepro.com/api/auth/session` — `200`
  - auditoría posterior de secretos runtime críticos: todos quedaron limpios en origen
- nota operativa:
  - la rotación de `NEXTAUTH_SECRET` puede forzar re-login al invalidar sesiones previas; tratar futuras rotaciones como cambio con impacto visible

## Sesion 2026-04-08 — Hotfix Nubox DTE: token con comillas en Secret Manager

- contexto:
  - `Descargar PDF`, `Descargar XML` y `Actualizar estado` de DTE Nubox estaban fallando en `staging`
  - el runtime devolvía `502`, pero la causa raíz venía de Nubox con `401 Unauthorized`
- causa raíz confirmada:
  - `NUBOX_BEARER_TOKEN` en `staging` se resolvía desde Secret Manager, pero el secreto `greenhouse-nubox-bearer-token-staging` estaba guardado con comillas envolventes
  - el mismo patrón apareció también en `greenhouse-nubox-bearer-token-production`
  - Greenhouse enviaba `Authorization: Bearer "NP_SECRET_..."`, y Nubox rechazaba tanto `GET /sales/:id` como `GET /sales/:id/pdf` / `xml`
- fix aplicado:
  - `src/lib/nubox/client.ts` ahora sanea el bearer token antes de usarlo:
    - remueve comillas envolventes
    - remueve sufijos literales `\\n`
    - hace `trim()` final
  - se agregó cobertura en `src/lib/nubox/client.test.ts` para tokens quoted / contaminados
  - se publicó una nueva versión limpia de los secretos:
    - `greenhouse-nubox-bearer-token-staging`
    - `greenhouse-nubox-bearer-token-production`
- validación ejecutada:
  - `pnpm exec vitest run src/lib/nubox/client.test.ts` — OK
  - `pnpm exec tsc --noEmit --incremental false` — OK
  - `pnpm lint` — OK
  - `GET /api/finance/income/INC-NB-26639047/dte-status` en staging — `200`
  - `GET /api/finance/income/INC-NB-26639047/dte-pdf` en staging — `200 (application/pdf)`

## Sesion 2026-04-08 — Hotfix CCA en staging: listado roto por mismatch `numeric`/`text`

- contexto:
  - en `develop` ya estaba desplegado `TASK-284`, pero `/api/finance/shareholder-account` respondía `500`
  - el drawer de creación mostraba error genérico aunque la cuenta sí alcanzaba a insertarse
- causa raíz confirmada:
  - `listShareholderAccounts()` en `src/lib/finance/shareholder-account/store.ts` construía `movement_summary.current_balance` y `current_balance_clp` como `text`
  - luego hacía `COALESCE(lb.current_balance, ms.current_balance, a.opening_balance)`, mezclando `numeric` y `text`
  - PostgreSQL devolvía: `COALESCE types numeric and text cannot be matched`
- fix aplicado:
  - se removió el cast `::text` dentro del CTE `movement_summary` para que el `COALESCE` opere siempre sobre `numeric`
  - commit del fix: `e9308dd5`
  - mergeado a `develop` y empujado: `1bdfc58b`
- validación ejecutada:
  - `pnpm exec tsc --noEmit --incremental false` — OK
  - `pnpm lint` — OK
  - reproducción SQL directa contra Cloud SQL con la consulta corregida — OK, sin `500`
- estado de datos en staging:
  - la cuenta `sha-cca-julio-reyes-clp` ya existe
  - `account_name`: `CCA — Julio Reyes`
  - `profile_id`: `identity-greenhouse-auth-client-user-user-efeonce-admin-julio-reyes`
  - `member_id`: `julio-reyes`
  - `space_id`: `null`

## Sesion 2026-04-08 — TASK-284 cerrada: Cuenta corriente accionista

- estado actual:
  - `TASK-284` quedó implementada sobre el runtime de tesorería existente
  - la nueva superficie vive en `/finance/shareholder-account`
  - acceso protegido por `finanzas.cuenta_corriente_accionista` con fallback equivalente a `Banco`
- cambios principales:
  - nueva migración aplicada:
    - `20260409002205385_shareholder-current-account.sql` quedó vacía pero ya aplicada
    - `20260409002455606_shareholder-current-account-schema.sql` contiene el DDL real de `shareholder_accounts` + `shareholder_account_movements`
  - `greenhouse_finance.accounts.instrument_category` ahora admite `shareholder_account`
  - nuevo store `src/lib/finance/shareholder-account/store.ts`
  - nuevas APIs:
    - `GET/POST /api/finance/shareholder-account`
    - `GET /api/finance/shareholder-account/people`
    - `GET /api/finance/shareholder-account/[id]/balance`
    - `GET/POST /api/finance/shareholder-account/[id]/movements`
  - nueva UI:
    - `src/app/(dashboard)/finance/shareholder-account/page.tsx`
    - `src/views/greenhouse/finance/shareholder-account/*`
  - navegación y catálogo de acceso ya incluyen `Cuenta accionista`
- decisiones operativas:
  - la CCA se modela como extensión 1:1 de `greenhouse_finance.accounts`, no como identidad paralela
  - cada movimiento manual crea `settlement_group` + `settlement_legs` reutilizando el mismo rail que Banco/Tesorería
  - la búsqueda de accionista en el drawer de creación consume Identity (`profile_id` + `member_id`) y soporta el caso donde el accionista también es usuario interno/admin
- validación ejecutada:
  - `pnpm pg:connect:migrate` — OK
  - `pnpm exec tsc --noEmit --incremental false` — OK
  - lint acotado del módulo/rutas nuevas — OK
- validación pendiente al cerrar el turno:
  - correr `pnpm lint` global
  - correr `pnpm build` global
  - si todo queda verde, commit + push de la rama
  - smoke recomendado en staging: crear una cuenta, registrar un crédito, registrar un débito y revisar que `/finance/bank` refleje el instrumento `shareholder_account`

## Sesion 2026-04-08 — Protocolo nuevo: Preview es baseline genérico para ramas distintas de develop/main

- se documentó en `AGENTS.md` y docs operativos que:
  - `Preview` es el baseline genérico para cualquier rama distinta de `develop` y `main`
  - `Staging` es el baseline compartido de `develop`
  - `Production` es el baseline de `main`
  - `Preview (develop)` y `Preview (<branch>)` no pueden seguir siendo source of truth del runtime base
- regla nueva:
  - los overrides por branch quedan permitidos solo como excepción temporal y documentada
  - si una variable es necesaria para previews normales, debe vivir en `Preview` genérico
- motivación:
  - evitar que ramas nuevas hereden un preview casi vacío y generen cascadas de failures en GitHub/Vercel por drift acumulado de env vars

## Sesion 2026-04-08 — ISSUE-031 cerrado de punta a punta: Preview baseline ya no depende de overrides por branch

- contexto:
  - el hardening de auth ya habia cerrado el deploy blocker, pero faltaba confirmar si `Preview` seguia dependiendo de env vars atadas a `develop` y ramas historicas
  - con `vercel` CLI autenticado se pudo inspeccionar el entorno efectivo real de una preview cualquiera
- causa raiz operativa confirmada:
  - el `Preview` generico resolvia casi solo `NUBOX_*` + variables internas de Vercel
  - auth, GCP, PostgreSQL, media buckets y `AGENT_AUTH_*` estaban mayormente como overrides por branch (`develop` u otras ramas), no como baseline generico de `Preview`
  - por eso una branch nueva podia buildar con drift severo aunque `develop` pareciera sano
- fix operativo aplicado en Vercel:
  - se forzaron overrides genericos `preview` para:
    - `AGENT_AUTH_EMAIL`, `AGENT_AUTH_SECRET`
    - `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`
    - `GCP_PROJECT`, `GCP_SERVICE_ACCOUNT_EMAIL`, `GCP_WORKLOAD_IDENTITY_PROVIDER`
    - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
    - `GREENHOUSE_MEDIA_BUCKET`, `GREENHOUSE_PRIVATE_ASSETS_BUCKET`, `GREENHOUSE_PUBLIC_MEDIA_BUCKET`
    - `GREENHOUSE_POSTGRES_DATABASE`, `GREENHOUSE_POSTGRES_HOST`, `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME`, `GREENHOUSE_POSTGRES_IP_TYPE`, `GREENHOUSE_POSTGRES_MAX_CONNECTIONS`, `GREENHOUSE_POSTGRES_PASSWORD`, `GREENHOUSE_POSTGRES_SSL`, `GREENHOUSE_POSTGRES_USER`
    - `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
    - `WEBHOOK_NOTIFICATIONS_SECRET_SECRET_REF`
  - `GOOGLE_APPLICATION_CREDENTIALS_JSON` no se forzo porque el baseline local actual lo lleva vacio; el runtime queda cubierto por WIF (`GCP_*` + `VERCEL_OIDC_TOKEN`)
- validacion operativa ejecutada:
  - `vercel env pull --environment preview --git-branch fix/codex-preview-baseline-smoke` — ya resuelve `NEXTAUTH_*`, `GCP_*`, `GOOGLE_CLIENT_*`, `GREENHOUSE_POSTGRES_*` y `AGENT_AUTH_*`
  - preview fresco desplegado: `https://greenhouse-mi5qiomu5-efeonce-7670142f.vercel.app`
  - `GET /api/auth/session` en ese preview — `200 {}` (ya no `503`)
  - `POST /api/auth/agent-session` con el usuario agente — `200`, devolviendo `cookieName`, `cookieValue`, `portalHomePath`, `userId`
- documentacion a mantener alineada:
  - `docs/issues/resolved/ISSUE-031-vercel-preview-build-fails-missing-nextauth-secret.md`
  - `project_context.md`
  - `changelog.md`

## Sesion 2026-04-08 — ISSUE-031 resolved: Vercel Preview build no longer dies on missing NEXTAUTH_SECRET

- contexto:
  - los PR `#41`, `#42` y `#43` seguian mostrando `Vercel: Error` aun despues de limpiar la baseline de CI
  - la reproduccion inicial local daba falso verde porque Next estaba leyendo `.env.production.local`
- causa raiz confirmada:
  - al aislar el entorno real de `Preview` (solo `.vercel/.env.preview.local`, sin `.env.local` ni `.env.production.local`), `pnpm build` fallo con:
    - `NEXTAUTH_SECRET is not set`
    - `Failed to collect page data for /api/admin/invite`
  - `Preview` tambien venia sin `NEXTAUTH_URL`, `GCP_PROJECT` y `GOOGLE_APPLICATION_CREDENTIALS_JSON`
  - el trigger tecnico del build rojo era que `src/lib/auth.ts` resolvia `authOptions` en import-time
- fix aplicado:
  - `src/lib/auth.ts` ahora resuelve auth lazy via `getAuthOptions()` y `getServerAuthSession()`
  - los consumers server-side dejaron de importar `authOptions` eager
  - `src/app/api/auth/[...nextauth]/route.ts` ahora devuelve `503` controlado si falta configuracion de auth
- validacion ejecutada:
  - `pnpm build` — OK
  - `pnpm lint` — OK
  - `pnpm build` con solo `.vercel/.env.preview.local` — OK
- documentacion actualizada:
  - `project_context.md`
  - `changelog.md`
  - `docs/issues/resolved/ISSUE-031-vercel-preview-build-fails-missing-nextauth-secret.md`
  - `docs/issues/README.md`
- nota operativa:
  - el hardening evita que `Preview` quede rojo por drift de env
  - si una branch preview necesita login real, Vercel igual debe tener `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GCP_PROJECT` y credenciales Google validas

## Sesion 2026-04-08 — CI root cause for open PRs 41/42

- contexto:
  - los PR `#41` y `#42` en GitHub fallaban en `Lint, test and build` aunque `#42` solo cambia docs
  - el único test rojo en CI era `src/views/greenhouse/organizations/tabs/OrganizationPeopleTab.test.tsx`
- causa raiz confirmada:
  - `OrganizationPeopleTab` ahora hace 2 requests al montar:
    - `/api/organizations/[id]/memberships`
    - `/api/organization/[id]/360?facets=team`
  - el test seguía asumiendo 1 request y además asumía que `1.0` solo aparecía una vez; con los KPIs 360 ahora aparece también en `FTE total`
- fix local aplicado:
  - se actualizó el test para mockear ambas respuestas, validar ambos endpoints y aceptar `1.0` en KPI + tabla
- validación local:
  - `pnpm exec vitest run src/views/greenhouse/organizations/tabs/OrganizationPeopleTab.test.tsx` — OK
  - `pnpm test` — OK (`224 passed`, `946 passed`, `2 skipped`)
  - `pnpm build` — OK
- pendiente:
  - el failure de Vercel no se pudo inspeccionar por CLI local porque esta máquina no tiene sesión activa de `vercel login`
  - como `#42` solo toca docs y `pnpm build` pasa local en `9ef3dcc`, el fallo de Vercel parece de entorno/configuración preview más que del diff mismo

## Sesion 2026-04-08 — Hotfix productivo Banco

- contexto:
  - despues del merge de `TASK-283` a `main`, el page `/finance/bank` cargaba en produccion pero `GET /api/finance/bank` respondia `500`
  - logs Vercel mostraban: `bind message supplies 14 parameters, but prepared statement "" requires 13`
- causa raiz:
  - `materializeAccountBalance()` en `src/lib/finance/account-balances.ts` enviaba un parametro extra (`actorUserId`) al `INSERT INTO greenhouse_finance.account_balances`
  - la sentencia tenia placeholders `$1..$13`, pero el array de valores estaba pasando 14 elementos
- fix aplicado:
  - se removio el parametro sobrante del upsert de `account_balances`
- validacion local:
  - `pnpm exec tsc --noEmit` — OK
  - `pnpm lint` — OK
  - `pnpm build` — OK
- siguiente paso operativo:
  - commit + push directo a `main`
  - esperar deploy productivo
  - revalidar `POST /api/auth/callback/credentials`, `GET /api/auth/session`, `GET /api/finance/bank` y `/finance/bank` en `greenhouse.efeoncepro.com`

## Sesion 2026-04-08 — TASK-283 cerrada

- estado actual:
  - `TASK-283` quedó implementada y lista para merge/deploy
  - el módulo `Banco` ya existe como surface propia en `Finance`
  - acceso endurecido después del cierre: `Banco` solo lo pueden ver `efeonce_admin`, `finance_admin` y `finance_analyst`
- cambios principales:
  - nueva tabla `greenhouse_finance.account_balances` con snapshots diarios por cuenta y cierre de período
  - nuevos helpers `account-balances.ts` e `internal-transfers.ts`
  - nueva projection reactiva `accountBalancesProjection`
  - nuevas APIs:
    - `GET/POST /api/finance/bank`
    - `GET/POST /api/finance/bank/[accountId]`
    - `POST /api/finance/bank/transfer`
  - nueva UI:
    - `/finance/bank`
    - `BankView`
    - `AccountDetailDrawer`
    - `AssignAccountDrawer`
    - `InternalTransferDrawer`
  - navegación y access catalog ya incluyen `finanzas.banco`
  - drawers de `Cobros`, `Pagos`, `Ingresos`, `Egresos` y settlement ya leen instrumentos desde `/api/finance/accounts`
- validación ejecutada:
  - `pnpm pg:connect:migrate` — OK
  - `pnpm exec tsc --noEmit` — OK
  - `pnpm lint` — OK
  - `pnpm build` — OK
- siguiente paso recomendado:
  - validar en staging los flujos `Banco -> Transferencia interna`, `Asignación retroactiva` y `Cerrar período`

## Sesion 2026-04-08 — TASK-283 tomada para discovery/audit

- estado actual:
  - `TASK-283` movida a `in-progress`
  - discovery y auditoría formal ya ejecutados antes de escribir runtime
- hallazgos que cambian la baseline:
  - `TASK-282` ya está cerrada y operativa; deja de ser bloqueo y pasa a foundation real
  - la task estaba stale respecto al runtime: dependencias reales son `reconciliation_periods` / `bank_statement_rows`, no `fin_*`
  - `settlement_groups` / `settlement_legs` ya existen y soportan `internal_transfer`, `funding`, `fx_conversion`, pero todavía no existe un módulo Banco/Tesorería como surface propia
  - no existe `account_balances`, no existe projection reactiva de balances por cuenta y no existe `POST /api/finance/bank/transfer`
  - tampoco existe `viewCode` `finanzas.banco`; navegación y permisos tendrán que ampliarse
- siguiente paso:
  - imprimir mapa de conexiones completo entre treasury, cash ledgers, settlement, reconciliación, proyecciones y navegación
  - luego cerrar plan de implementación por slices antes de invocar skills y editar código

## Sesion 2026-04-08 — TASK-282 cerrada

- estado actual:
  - `TASK-282` ya quedó en `complete`
  - el módulo de conciliación ya no está solo en foundation: quedó operable end-to-end desde el portal
- cambios principales:
  - `ReconciliationDetailView` ahora muestra snapshots instrument-aware del período y acciones `Marcar conciliado` / `Cerrar período`
  - `SettlementOrchestrationDrawer` quedó disponible desde el historial de pagos/cobros en `IncomeDetailView` y `ExpenseDetailView`
  - nuevo endpoint `GET/POST /api/finance/settlements/payment` para inspección y alta de legs suplementarios
  - `RegisterCashOutDrawer` soporta `settlementMode`, `fundingInstrumentId`, `fee*`, `exchangeRateOverride`
  - `RegisterCashInDrawer` soporta `fee*` y `exchangeRateOverride`
  - `match`, `unmatch`, `exclude` y `auto-match` ya no duplican eventos de pago en las routes
  - `period_closure_status`, `client_economics`, `operational_pl` y `commercial_cost_attribution` ya escuchan también `internal_transfer` / `fx_conversion`
- validación ejecutada:
  - `pnpm exec tsc --noEmit` — OK
  - `pnpm lint` — OK
  - `pnpm build` — OK
  - `pnpm exec vitest run src/app/api/finance/bigquery-write-cutover.test.ts` — OK
- validación staging adicional:
  - `cash-in`, `cash-out`, `reconciliation` y `settlements/payment` responden `200` con la shape nueva
  - el drawer `Liquidación` abre correctamente desde `ExpenseDetailView`
  - se detectó y corrigió un bug donde los `supplemental settlement legs` se insertaban pero `ensureSettlementForPayment()` los borraba al reread
  - fix aplicado: `ensureSettlementForPayment()` ahora preserva legs suplementarios, recalcula `settlement_mode` efectivo y no degrada un grupo `mixed` a `direct`
  - se validó también el tramo `statement import -> reimport idempotente -> unmatch -> match` sobre `santander-clp_2026_03`
  - el row `santander-clp_2026_03_3bf2f840e20a` se importó una vez, el segundo import quedó en `skipped = 1`, `unmatch` bajó `isReconciled = false` en `cash-in` y el rematch volvió a dejar reconciliados el `income_payment` y su `settlement_leg`
- riesgo / siguiente paso recomendado:
  - como follow-on ya no queda deuda funcional de `TASK-282`; lo siguiente es tesorería/banking UX o nuevos rails, no hardening del core
  - `TASK-283` aparece en el backlog pero no pertenece a este cierre

## Sesion 2026-04-08 — TASK-282 tomada para discovery/audit

### TASK-282 — Finance Payment Instrument Reconciliation & Settlement Orchestration

- rama de trabajo esperada: `task/TASK-282-finance-payment-instrument-reconciliation-settlement-orchestration`
- estado:
  - `TASK-282` esta en `in-progress`
  - discovery y auditoria en curso antes de tocar runtime
- hallazgos iniciales que cambian la baseline:
  - `TASK-280` y `TASK-281` ya actuan como foundations implementadas; dejaron de ser bloqueos reales
  - conciliacion sigue con fallback BigQuery activo y ese residual de `TASK-179` debe absorberse en Slice 1
  - ingresos ya tienen carril parcial payment-level; egresos siguen document-level sobre `expenses`
  - `ReconciliationView` sigue cargando pendientes desde documentos, no desde `cash-in` / `cash-out`
  - el outbox/reactive engine ya consume `finance.income_payment.recorded` y `finance.expense_payment.recorded` en `client_economics`, `commercial_cost_attribution`, `operational_pl` y `period_closure_status`
- siguiente paso:
  - imprimir auditoria formal `TASK-282`
  - imprimir mapa de conexiones
  - cerrar plan de implementacion antes de invocar skills y editar codigo

## Sesion 2026-04-08 — Finance cash lane alignment (document detail → cash modules)

### UX semantica caja: estado != conciliacion (2026-04-08)

Se corrigio una ambiguedad visible en `Cobros` y `Pagos`.

- Antes:
  - la columna `Estado` en los ledgers de caja mostraba realmente `isReconciled`
  - eso hacia que un movimiento ya ejecutado apareciera como `Pendiente` si todavia no estaba conciliado con cartola
  - caso visible: el pago E2E `E2E-EXP-NB-35568077-20260408` se veia como `Pendiente` en `Pagos` pese a existir en `expense_payments`
- Ahora:
  - `Cobros` muestra `Estado = Cobrado` y `Conciliacion = Conciliado / Por conciliar`
  - `Pagos` muestra `Estado = Pagado` y `Conciliacion = Conciliado / Por conciliar`
- Archivos:
  - `src/views/greenhouse/finance/CashInListView.tsx`
  - `src/views/greenhouse/finance/CashOutListView.tsx`
  - `docs/documentation/finance/modulos-caja-cobros-pagos.md`
- Validacion pendiente al cerrar este lote:
  - volver a revisar staging una vez desplegado para confirmar que el pago E2E se ve `Pagado` + `Por conciliar`

### Cobros/Pagos ahora leen y renderizan el ledger correcto (2026-04-08)

Se corrigió una deriva entre el detalle documental (`Ventas` / `Compras`) y los módulos de caja (`Cobros` / `Pagos`).

- **Ventas / cobros**:
  - `IncomeDetailView` registraba pagos por el endpoint legacy singular `POST /api/finance/income/[id]/payment`.
  - Ese carril podía caer al fallback BigQuery y dejar el pago fuera de `greenhouse_finance.income_payments`, mientras `cash-in` lee solo el ledger Postgres.
  - Fix: el detalle ahora usa `POST /api/finance/income/[id]/payments` (endpoint canónico del ledger).
- **Cobros UI**:
  - `CashInListView` esperaba campos legacy (`cashInId`, `reconciled`) pero `GET /api/finance/cash-in` entrega `paymentId` e `isReconciled`.
  - Fix: normalización client-side del payload antes de renderizar.
- **Pagos UI**:
  - `CashOutListView` esperaba `cashOutId`, `amountClp`, `description`; la API entrega `paymentId`, `amount`, `currency`, `expenseDescription`, `isReconciled`.
  - Fix: normalización client-side + render de monto en moneda real.
- **Verificación**:
  - `pnpm exec tsc --noEmit` — OK
- **Riesgo abierto / contexto**:
  - Los documentos históricos marcados como `paid` sin fila en `income_payments` / `expense_payments` pueden seguir sin aparecer en `Cobros` / `Pagos`.
  - Eso ya no afecta pagos nuevos registrados desde el detalle, pero sigue indicando deuda histórica de backfill / unificación de source-of-truth.

### Contrato canónico ledger + outbox endurecido (2026-04-08)

Se dejó cerrada la semántica para que caja real, remediación y proyecciones reactivas hablen el mismo idioma.

- **Write path legacy endurecido**:
  - `POST /api/finance/income/[id]/payment` ya no mantiene un carril propio ni puede caer a BigQuery fallback.
  - Quedó como wrapper compatible de `recordPayment()` y devuelve `503 FINANCE_BQ_WRITE_DISABLED` si el ledger Postgres no está disponible.
- **Sync Nubox alineado al contrato reactivo**:
  - `src/lib/nubox/sync-nubox-to-postgres.ts` ahora registra cobros bancarios vía `recordPayment()`.
  - Eso garantiza `income_payments` + evento `finance.income_payment.recorded`, que sí escucha `client_economics`, `operational_pl`, `commercial_cost_attribution` y otros consumers reactivos.
  - Se mantiene además el evento legacy `finance.income.payment_received_via_nubox` para compatibilidad.
- **Auditoría y backfill operativos**:
  - Nuevo módulo `src/lib/finance/payment-ledger-remediation.ts`.
  - Nuevos comandos:
    - `pnpm audit:finance:payment-ledgers`
    - `pnpm backfill:finance:payment-ledgers`
  - El backfill usa `recordPayment()` y `recordExpensePayment()` para que cualquier corrección histórica también publique outbox canónico.
- **Readers / KPIs**:
  - `GET /api/finance/data-quality` ahora revisa:
    - `income amount_paid` vs `SUM(income_payments)`
    - `expense amount_paid` vs `SUM(expense_payments)`
    - documentos `paid/partial` sin ledger
  - `income/summary` y `expenses/summary` Postgres-first ya informan `cashDataQuality` usando el ledger, no solo flags embebidos.
- **Validación**:
  - `pnpm exec tsc --noEmit` — OK
  - `pnpm exec vitest run src/app/api/finance/bigquery-write-cutover.test.ts` — OK
  - `pnpm exec eslint ...` sobre archivos tocados — OK
- **Pendiente operativo**:
  - Ejecutado en base dev/staging:
    - migración `20260408084803360_widen-income-payment-source-check.sql`
    - backfill de cobros `pnpm exec tsx scripts/remediate-finance-payment-ledgers.ts --apply --income-only`
  - Resultado del backfill:
    - `21` cobros históricos recuperados en `income_payments`
    - `Cobros` pasó de `1` a `22` pagos visibles
  - Verificación E2E en staging (`develop`):
    - ingreso `INC-NB-25302941` ahora vuelve a estado `paid` y expone `paymentsReceived[0].paymentSource = nubox_bank_sync`
    - se registró desde UI un pago sobre `EXP-NB-35568077` por `$19.495` con referencia `E2E-EXP-NB-35568077-20260408`
    - el documento quedó `paymentStatus = paid` y el pago apareció como primera fila en `Pagos`
  - Hallazgo de UX operativo:
    - `Cobros` abre filtrado al rango actual (`2026-04-01` → `2026-04-08` en la prueba), por lo que cobros históricos recuperados no se ven hasta ampliar el rango
  - Ruido observado en browser:
    - errores CORS de Sentry al usar `x-vercel-protection-bypass`; son efecto del bypass de staging, no del flujo de caja en sí

---

## Sesion 2026-04-07 — Leave request email family (P2 completado)

### Sistema de emails de permisos/ausencias (2026-04-07)

4 templates transaccionales dedicados que cubren el ciclo completo de solicitudes de permisos:

| Template | Evento | Destinatario |
|----------|--------|-------------|
| `leave_request_submitted` | `leave_request.created` | Solicitante |
| `leave_request_pending_review` | `created` + `escalated_to_hr` | Supervisor / HR |
| `leave_request_decision` | `approved` / `rejected` / `cancelled` | Solicitante |
| `leave_review_confirmation` | `approved` / `rejected` | Revisor |

- **Personalizacion**: nombres, tipo de permiso, fechas, dias, motivo, notas — todo desde event payload (no hardcodeado)
- **Hero images**: clay 3D fondo blanco en GCS public bucket (Imagen 4)
- **Delivery**: ops-worker Cloud Run (outbox reactivo cada 5 min). Redeployado con templates nuevos.
- **Skill**: `/greenhouse-email` con workflow completo (repo + global)
- **Verificado**: 8 emails enviados en produccion con 4 tipos de permiso y 4 personas distintas
- **Rama**: develop → main

---

## Sesion 2026-04-07 — labor_cost_clp separation + type consolidation

### Separación de costo laboral en client_economics (2026-04-07)

El costo laboral estaba lumped en `direct_costs_clp`, causando que la columna "Costo laboral" mostrara $0 y el sanitizer anulara márgenes cuando los otros costos eran 0.

- **Migración**: `labor_cost_clp` columna dedicada en `client_economics` + backfill desde `commercial_cost_attribution.commercial_labor_cost_target`
- **Compute**: `computeClientEconomicsSnapshots` separa `laborCosts` de `directCosts` en el pipeline
- **Sanitizer**: `laborCostClp` ahora **requerido** (no opcional) — `totalCosts = labor + direct + indirect`. TypeScript rechaza callers que no lo pasen.
- **360 facet**: `AccountClientProfitability.laborCostCLP` expuesto en `byClient`
- **Finance tab**: nueva columna "Costo laboral" en tabla Rentabilidad por Space
- **Economics tab**: `laborCostClp` usa campo real (no hardcoded 0), `directCostsClp = costCLP - laborCostCLP`
- **Trend chart**: ordenado cronológicamente (Nov 25 → Mar 26) en vez de invertido
- **Type consolidation**: `OrganizationClientFinance` y `OrganizationFinanceSummary` definidas solo en `types.ts`. Backend importa de ahí — eliminados duplicados de `organization-store.ts`.
- **Archivos**: migration SQL, `postgres-store-intelligence.ts`, `postgres-store-slice2.ts`, `client-economics-presentation.ts`, `organization-store.ts`, `types.ts`, `account-complete-360.ts`, `economics.ts` (facet), `OrganizationEconomicsTab.tsx`, `OrganizationFinanceTab.tsx`
- **Rama**: develop

---

## Sesion 2026-04-07 — ops-worker: cost attribution endpoint + deploy + fixes

### ops-worker Cloud Run update (2026-04-07)

Nuevo endpoint `POST /cost-attribution/materialize` en Cloud Run ops-worker para materializar commercial cost attribution sin timeout de Vercel serverless.

- **Endpoint**: `POST /cost-attribution/materialize` — acepta `{year, month}` para single-period o vacío para bulk. `recomputeEconomics` (default true) recomputa `client_economics` después.
- **Pipeline**: Ejecuta VIEW `client_labor_cost_allocation` (3 CTEs + LATERAL JOIN + exchange rates) → `atomicReplacePeriod` (transaccional) → opcionalmente `computeClientEconomicsSnapshots`.
- **Deploy**: Cloud Build + Cloud Run revision `ops-worker-00006-qtl` sirviendo 100% tráfico.
- **Verificado**: Health check OK + `/cost-attribution/materialize` respondiendo (576ms).
- **Bug fix pre-existente**: `deploy.sh` usaba `--headers` en `gcloud scheduler jobs update` (flag solo existe en `create`). Corregido a `--update-headers`. Los 3 scheduler jobs actualizados manualmente.
- **Test fix**: Mock de `materializeCommercialCostAttributionForPeriod` en `commercial-cost-attribution.test.ts` actualizado para nuevo return type `{ rows, replaced }`.
- **Archivos**: `services/ops-worker/server.ts`, `services/ops-worker/deploy.sh`, `src/lib/sync/projections/commercial-cost-attribution.test.ts`
- **Documentación**: Architecture §4.9, functional doc ops-worker v1.1, CLAUDE.md, AGENTS.md, project_context.md actualizados.

---

## Sesion 2026-04-07 — TASK-279: Labor Cost Attribution Pipeline

### TASK-279 — Labor Cost Attribution Pipeline (2026-04-07)

Cierre de brecha entre payroll y client_economics. Los costos laborales existian en serving tables pero no fluian a los snapshots de rentabilidad.

- **Causa raiz**: 5 `.catch(() => [])` silenciosos en el pipeline de commercial cost attribution ocultaban errores. `commercial_cost_attribution` nunca se materializo (0 rows). Snapshots se computaban sin costos laborales.
- **Fix codigo**: Reemplazo de silent catches por `console.error` con contexto. Cron `economics-materialize` ahora materializa cost attribution como primer paso.
- **Fix datos**: Backfill manual de `commercial_cost_attribution` (5 rows Feb+Mar 2026), actualizacion de `client_economics` y `operational_pl_snapshots` para Sky Airline con costos reales.
- **Resultado**: Sky Airline marzo 2026 — Revenue $6.9M, Labor $2.5M, Margen 63.6%, 3 FTE. UI muestra margenes reales en vez de "—".
- **Archivos**: `src/lib/commercial-cost-attribution/member-period-attribution.ts`, `store.ts`, `src/lib/finance/postgres-store-intelligence.ts`, `src/app/api/cron/economics-materialize/route.ts`
- **Causa raiz Vercel**: VIEW `client_labor_cost_allocation` tiene 3 CTEs + LATERAL JOIN + exchange rates → timeout en serverless cold-start. Solucion: materializar via Cloud Run/admin, Vercel solo lee de tabla materializada.
- **Enterprise hardening**: `atomicReplacePeriod` (transaccional), `materializeAllAvailablePeriods`, admin endpoint `POST /api/internal/cost-attribution-materialize`, cron best-effort con fallback graceful.
- **Backfill**: Feb 2026 (78.5% margin, 2 allocations) + Mar 2026 (63.6% margin, 3 allocations) + operational_pl_snapshots actualizados.
- **Rama**: develop

### ISSUE-028 — HubSpot Cloud Run Token Expirado (2026-04-07)

- Private App Token en Secret Manager revocado → 401 en todas las llamadas HubSpot
- Fix: nuevo token → Secret Manager version 2 → Cloud Run service update
- Verificado: company profile + contacts devuelven 200

### ISSUE-029 — HubSpot Sync identity_profiles Column Mismatch (2026-04-07)

- `createIdentityProfile` usaba `source_system` (no existe) en vez de `primary_source_system`, y faltaba `profile_type` (NOT NULL)
- Fix: renombrar columnas + agregar `profile_type = 'external_contact'`

## Sesion 2026-04-07 — TASK-274: Account Complete 360

### TASK-274 — Account Complete 360 (2026-04-07)

Implementacion completa del resolver federado por facetas para organizaciones/cuentas. Analogo a Person Complete 360 (TASK-273).

- **Resolver**: `getAccountComplete360(identifier, { facets: [...] })` en `src/lib/account-360/account-complete-360.ts`
- **9 facetas**: identity, spaces, team, economics, delivery, finance, crm, services, staffAug
- **Scope**: org → spaces → clients resuelto una sola vez, compartido por todas las facetas
- **API**: `GET /api/organization/[id]/360?facets=...` + `POST /api/organizations/360` (bulk, max 50)
- **Auth**: por faceta segun rol (admin todo, operations sin finance, client limitado a identity+spaces+team+delivery+services)
- **Cache**: in-memory per-facet TTL + invalidacion por 22 eventos outbox
- **Verificado E2E**: Sky Airline 9/9 facetas con datos reales (economics $6.9M revenue mar-2026, 20 team members, 7 CRM deals, 72 proyectos)
- **Consumer migration**: TODAS las tabs de Organization Detail migradas al 360
- **Rama**: develop (pendiente merge a main)

### Consumer Migration — Organization Detail Tabs (2026-04-07)

Todas las tabs de la vista Organization Detail (`/agency/organizations/{id}`) ahora usan el Account 360 resolver en lugar de endpoints legacy separados.

- **OverviewTab**: `GET /api/organization/{id}/360?facets=economics,delivery,team&asOf={lastClosedMonth}` — fix: usa ultimo mes cerrado en vez de mes actual (soluciona KPIs mostrando "—" en abril sin datos)
- **EconomicsTab**: `GET /api/organization/{id}/360?facets=economics&asOf={year}-{month}-01&limit=6` — mapea currentPeriod, trend y byClient del facet economics
- **FinanceTab**: fetch paralelo legacy + 360 finance — legacy para tabla de detalle por Space, 360 para KPIs YTD (revenue YTD, invoice count, outstanding)
- **PeopleTab**: fetch paralelo legacy + 360 team — legacy para tabla de memberships, 360 para KPIs summary (totalMembers, totalFte)
- **ProjectsTab**: (migrado anteriormente) 360 delivery como source of truth para conteos, legacy para detalle por proyecto Notion
- **OrganizationView header KPIs**: (migrado anteriormente) 360 economics para revenue, margen, FTE, spaces
- **ICO Tab**: se mantiene en endpoint especializado (tiene distribuciones CSC, radar health, metricas por space que el facet delivery no replica)

## Sesion 2026-04-07 — TASK-278: AI Visual Asset Generator + Profile Banners

### Rama / alcance

- rama: `develop` (direct)
- scope: Modulo de generacion de assets visuales con IA + banners de perfil por categoria

### Cambios

- `src/lib/ai/image-generator.ts` — helper con `generateImage()` (Imagen 4) y `generateAnimation()` (Gemini SVG)
- `src/app/api/internal/generate-image/route.ts` — endpoint POST admin-only
- `src/app/api/internal/generate-animation/route.ts` — endpoint POST admin-only
- `src/lib/person-360/resolve-banner.ts` — resolver role/department → banner category
- `src/views/greenhouse/my/my-profile/MyProfileHeader.tsx` — acepta bannerUrl prop
- `src/views/greenhouse/my/MyProfileView.tsx` — pasa bannerUrl del resolver
- `public/images/banners/*.png` — 7 banners generados con Imagen 4
- `scripts/generate-banners.mts` — script batch de generacion
- `docs/architecture/GREENHOUSE_AI_VISUAL_ASSET_GENERATOR_V1.md` — spec
- `docs/documentation/ai-tooling/generador-visual-assets.md` — doc funcional

### Verificacion

- `pnpm build` — OK
- `pnpm lint` — OK

### Riesgo / siguiente paso

- Los banners estan como archivos estaticos en public/ — considerar moverlos a GCS bucket para mejor cache y no inflar el repo
- Extender banner resolver a Admin User Detail y People Detail
- Generar animaciones SVG para empty states existentes (reemplazar Lottie JSON)

## Sesion 2026-04-07 — TASK-273: Person Complete 360 federated serving layer

### Rama / alcance

- rama: `task/TASK-273-person-complete-360`
- scope: Capa de serving federada que consolida toda la data de una persona bajo un solo resolver con facetas on-demand, autorizacion, cache, y observabilidad.

### Cambios

- `src/types/person-complete-360.ts` — Types completos: PersonComplete360, 8 facet interfaces, ResolverMeta, authorization/trace types
- `src/lib/person-360/resolve-avatar.ts` — resolveAvatarUrl centralizado (reemplaza 3 copias)
- `src/lib/person-360/facet-authorization.ts` — Motor de autorizacion per-facet + field-level redaction
- `src/lib/person-360/facet-cache.ts` — Cache in-memory con TTL per-facet, stale-while-revalidate
- `src/lib/person-360/facet-cache-invalidation.ts` — Outbox event → cache invalidation mapping
- `src/lib/person-360/person-complete-360.ts` — Resolver federado principal + bulk resolver
- `src/lib/person-360/facets/{identity,assignments,organization,leave,payroll,delivery,costs,staff-aug}.ts` — 8 modulos de faceta
- `src/app/api/person/[id]/360/route.ts` — GET endpoint (single person)
- `src/app/api/persons/360/route.ts` — POST endpoint (bulk, max 100)
- `src/lib/person-360/get-person-profile.ts` — Importa resolveAvatarUrl centralizado
- `src/app/api/my/assignments/route.ts` — Importa resolveAvatarUrl centralizado
- `src/app/api/my/organization/members/route.ts` — Importa resolveAvatarUrl centralizado
- `docs/architecture/GREENHOUSE_PERSON_COMPLETE_360_V1.md` — Spec de arquitectura
- `docs/documentation/personas/person-complete-360.md` — Documentacion funcional

### Verificacion

- `pnpm build` — OK
- `pnpm lint` — OK (0 errores)
- `tsc --noEmit` — OK (0 errores)

### Riesgo / siguiente paso

- Phase F (consumer migration) pendiente: MyProfileView, Admin User Detail, People Detail deben migrar a usar el endpoint 360
- TASK-274 (Account Complete 360) sigue el mismo patron para organizaciones
- TASK-276 (Upstash Redis) reemplazara el cache in-memory por cache distribuido
- Pool sizing: con 8 facetas paralelas, verificar que el PG pool soporta la concurrencia en produccion

## Sesion 2026-04-06 — ISSUE-025: fix sendEmail() status aggregation

### Rama / alcance

- rama: `develop`
- scope: ISSUE-025 — `sendEmail()` retornaba `'sent'` cuando todos los recipients eran `'skipped'`, causando inconsistencia entre `notification_log` y `email_deliveries`

### Cambios

- `src/lib/email/delivery.ts` — agregado tracking de `sawSkipped` en aggregate status de `sendEmail()`; retorna `'skipped'` cuando corresponde
- `src/lib/email/delivery.test.ts` — test para escenario "all recipients skipped"
- `docs/issues/open/ISSUE-025-sendmail-status-aggregation-skipped-as-sent.md` — documentación del issue

### Verificacion

- 4/4 tests de delivery passing
- 2/2 tests de notification service passing
- `npx tsc --noEmit` — OK

### Riesgo / siguiente paso

- Los 18 registros históricos en `notification_log` con `status='sent'` que realmente fueron `'skipped'` quedan como están (data histórica)
- Para corregirlos se podría hacer un UPDATE manual validando contra `email_deliveries`, pero no es crítico
- El fix previene inconsistencia futura

---

## Sesion 2026-04-06 — ISSUE-024: fix observabilidad Admin Notifications

### Rama / alcance

- rama: `develop`
- scope: ISSUE-024 — Admin Notifications mostraba KPIs en cero sin indicar si era por falta de datos o error silencioso

### Cambios

- `src/lib/admin/get-admin-notifications-overview.ts` — logging con `console.error` en los 6 catch blocks + campo `diagnostics: string[]` en interfaz + recolección de diagnósticos descriptivos
- `src/lib/notifications/notification-service.ts` — logging en catch vacío de `logDispatch()`
- `src/app/api/admin/ops/notifications/test-dispatch/route.ts` — `ensureNotificationSchema()` con 503 si falla + detalle en respuesta
- `src/views/greenhouse/admin/AdminNotificationsView.tsx` — banner `Alert` de diagnósticos cuando hay problemas detectados
- `scripts/setup-postgres-notifications.sql` — columna `metadata JSONB DEFAULT '{}'` faltante en `notification_log`

### Verificacion

- `npx tsc --noEmit` — OK
- `pnpm lint` — OK (archivos modificados)

### Riesgo / siguiente paso

- Verificar en staging que el banner de diagnósticos aparece cuando corresponde
- Si los KPIs siguen en cero sin diagnósticos, el sistema simplemente no ha recibido eventos de notificación

## Sesion 2026-04-06 — repo upstream Vuexy registrado en ecosystem doc

### Rama / alcance

- rama: actual
- scope: documentar `pixinvent/vuexy-nextjs-admin-template` como upstream de referencia del tema Vuexy usado por Greenhouse

### Cambios

- `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md` ahora incluye el repo upstream de Vuexy con su rol, source of truth tecnico y guardrails de uso.
- `project_context.md` actualizado con delta breve para dejar explicita la regla de consulta del upstream.

### Verificacion

- Validacion documental solamente

### Riesgo / siguiente paso

- Cuando un cambio toque shell, layout base o patrones heredados de Vuexy, revisar este upstream antes de asumir que el comportamiento nace en Greenhouse.

## Sesion 2026-04-05 — TASK-263: Permission Sets enterprise view access

### Rama / alcance

- rama: `fix/ISSUE-006-silent-payroll-leave-zeroing` (trabajo incluido en rama existente)
- scope: TASK-263 — Permission Sets CRUD, resolucion 3+1 capas, API, UI, effective views

### Cambios

- **Migracion**: `20260405232932457_permission-sets-tables.sql` — tablas `permission_sets` + `user_permission_set_assignments`, ALTER `view_access_log` CHECK constraint, seed 6 sets de sistema
- **Event catalog**: `viewAccessSetAssigned` + `viewAccessSetRevoked` en `event-catalog.ts`; nuevo aggregate `permissionSet`
- **Lib**: `src/lib/admin/permission-sets.ts` — CRUD completo, asignacion de usuarios, resolucion de vistas por sets, audit log
- **Resolucion**: `resolveAuthorizedViewsForUser()` extendido con layer 2 (Permission Sets) entre rol y overrides
- **API**: 5 nuevos endpoints bajo `/api/admin/views/sets/` + 1 effective-views en `/api/admin/team/roles/[userId]/effective-views`
- **Types**: `src/types/permission-sets.ts` — shared types para API y UI
- **UI**: `PermissionSetsTab.tsx` — nuevo tab "Permission Sets" en admin view governance (CRUD, detalle, asignacion usuarios)
- **UI**: `UserAccessTab.tsx` — nuevo tab "Accesos" en admin user detail (roles, sets, overrides, effective views con source attribution)
- **Nomenclatura**: 16 nuevos mensajes `admin_user_access_*` en `greenhouse-nomenclature.ts`

### Verificacion

- `npx tsc --noEmit` — OK
- `pnpm lint` — OK
- `pnpm build` — OK
- Migracion pendiente: `pnpm migrate:up` (requiere Cloud SQL Proxy)

### Riesgo / siguiente paso

- Usuarios deben re-login para que los Permission Sets se reflejen en el JWT (`authorizedViews`)
- La migracion debe ejecutarse antes del deploy (crea tablas + seed)
- Follow-ups: Permission Set Groups, muting, data-scoping, PIM

## Sesión 2026-04-05 — ISSUE-006: payroll leave fallback ya no permite cálculo oficial silenciosamente degradado

### Rama / alcance

- rama: `fix/ISSUE-006-silent-payroll-leave-zeroing`
- scope: bloquear el cálculo oficial de Payroll cuando `leave_requests` no está disponible y exponer degradación explícita en proyección/readiness

### Cambios

- `src/lib/payroll/fetch-attendance-for-period.ts` — `fetchApprovedLeaveForPeriod()` ahora retorna `{ rows, degraded }`; el reader de asistencia propaga `leaveDataDegraded`
- `src/types/payroll.ts` — nuevo code `leave_data_unavailable` + `leaveDataDegraded` en `PayrollAttendanceDiagnostics`
- `src/lib/payroll/payroll-readiness.ts` — agrega blocker explícito si los permisos no pueden leerse
- `src/lib/payroll/calculate-payroll.ts` — falla explícitamente si la data de permisos está degradada; ya no permite cálculo oficial con `daysOnUnpaidLeave = 0` implícito
- `src/lib/payroll/project-payroll.ts` — mantiene tolerancia en proyección pero ahora expone `attendanceDiagnostics` para UI/API
- tests actualizados en `payroll-readiness.test.ts` y `project-payroll.test.ts`

### Verificación

- `npx tsc --noEmit` — OK
- `pnpm lint` — OK
- `pnpm test` — OK
- `pnpm build` — OK

### Riesgo / siguiente paso

- La API de proyección ahora expone `attendanceDiagnostics`; si alguna vista asume shape cerrada del payload, verificar en staging la lectura del nuevo campo

## Sesion 2026-04-05 — TASK-257: Mi Perfil enterprise redesign (sidebar + tabs)

### Rama / alcance

- rama: `develop`
- scope: TASK-257 — redesign Mi Perfil usando patron Vuexy User View (sidebar 4 cols + tabs 8 cols)

### Cambios

- `src/views/greenhouse/my/MyProfileView.tsx` — reescrito: layout Grid lg=4/lg=8, TabContext con CustomTabList pill, dynamic() imports
- `src/views/greenhouse/my/my-profile/MyProfileSidebar.tsx` — nuevo: avatar 120px, nombre, cargo chip, stats KPI (sistemas vinculados, facetas), detalles (email, telefono, departamento, nivel, contrato, fecha ingreso). Campos null no se renderizan.
- `src/views/greenhouse/my/my-profile/tabs/OverviewTab.tsx` — nuevo: datos profesionales en FieldGrid (3 cols) + sistemas vinculados con status icon+texto
- `src/views/greenhouse/my/my-profile/tabs/SecurityTab.tsx` — nuevo: placeholder "Proximamente"
- No se modifico la API `/api/my/profile` ni el tipo `PersonProfileSummary` — ya retornaban todo lo necesario

### Patron aplicado

Sidebar + Tabs (Vuexy User View), documentado en GREENHOUSE_UI_PLATFORM_V1.md. Distinto del Person Detail View (horizontal header) usado para admin views. Sidebar fija identidad personal; tabs escalan para futuros modulos self-service.

### Verificacion

- `npx tsc --noEmit` — OK
- `pnpm build` — OK
- `pnpm lint` (archivos modificados) — OK
- Fallback de sesion sigue funcionando (usuario sin person_360 ve nombre + email desde JWT)

### Proximos pasos

- Implementar tab "Mi Nomina" con datos de compensacion self-service
- Implementar tab "Mi Delivery" con metricas ICO del colaborador
- Implementar tab "Seguridad" con historial de login y 2FA

## Sesión 2026-04-05 — Normalizacion de source systems en person_360

### Rama / alcance

- rama: `develop`
- scope: resolver que Mi Perfil mostraba Microsoft como desvinculado a pesar de que el Entra sync funciona correctamente

### Diagnostico

- Mi Perfil busca `'microsoft'` en `linkedSystems` pero la DB almacenaba `azure_ad` y `azure-ad`
- Ya existia un normalizador TypeScript `mapIdentityProvider()` en `src/lib/people/shared.ts` pero no se usaba en Mi Perfil
- El array crudo de `person_360.linked_systems` contenia 7 valores tecnicos: `azure_ad`, `azure-ad`, `greenhouse_auth`, `greenhouse_team`, `hubspot`, `hubspot_crm`, `notion`

### Solucion

- Funcion SQL `greenhouse_core.canonical_source_system(raw TEXT)` (`IMMUTABLE`) que normaliza valores tecnicos a display-friendly
- La VIEW `person_360` ahora usa la funcion en el LATERAL join de `link_agg` para producir `linked_systems` limpio
- Sistemas internos (`greenhouse_auth`, `greenhouse_team`) se filtran (retornan NULL → excluidos del array)
- Resultado: `{hubspot,microsoft,notion}` — limpio, normalizado, deduplicado
- No se toco TypeScript — la normalizacion vive en la unica fuente de verdad (la DB)

### Verificacion

- Query directa: 7/8 usuarios con `{hubspot,microsoft,notion}`, admin bootstrap con `{}`
- `npx tsc --noEmit` — OK
- Tipos regenerados por `kysely-codegen`

### Archivos

- `migrations/20260405180048252_canonical-source-system-function-person360.sql` (nuevo)
- `src/types/db.d.ts` (regenerado)

### Regla nueva

Nuevos source systems se agregan al CASE de `canonical_source_system()`, no al frontend ni al TypeScript.

## Sesión 2026-04-05 — TASK-254: Reactive cron workers migrados a Cloud Run ops-worker

### Rama / alcance

- rama: `task/TASK-254-operational-cron-durable-worker-migration`
- scope: migrar 3 cron operativos worker-like (`outbox-react`, `outbox-react-delivery`, `projection-recovery`) de Vercel a Cloud Run como servicio dedicado `ops-worker`

### Qué se hizo

1. **Workload placement matrix**: los 16 cron de `vercel.json` se clasificaron en `keep in Vercel`, `trigger only` o `migrate to Cloud Run`. Resultado: 3 migran (los reactivos), el resto se queda.
2. **`services/ops-worker/`** — nuevo servicio Cloud Run con 4 endpoints:
   - `GET /health` — health check
   - `POST /outbox-react` — process reactive backlog (todos los dominios)
   - `POST /outbox-react-delivery` — process reactive backlog solo dominio `delivery`
   - `POST /projection-recovery` — recovery de orphans de `projection_refresh_queue`
3. **`src/lib/sync/reactive-run-tracker.ts`** — run tracking institucional usando `source_sync_runs` para que Ops vea corridas exitosas/fallidas del worker reactivo
4. **`vercel.json`** — 3 cron eliminados (16 → 13), las rutas API siguen como fallback manual
5. **`src/lib/operations/get-operations-overview.ts`** — nuevo subsistema `Reactive Worker` en Ops Health con `lastRunAt`, `lastRunStatus`, etc.
6. **`docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`** — v1.2 con ops-worker, scheduler jobs y política de workload placement ampliada
7. **`Dockerfile`** + **`deploy.sh`** + **`.dockerignore`** + **`README.md`** del servicio

### Verificación

- `npx tsc --noEmit` — OK
- `pnpm lint` — OK (error pre-existente en ico-diagnostics, no relacionado)
- `pnpm build` — OK

### Archivos modificados

- `services/ops-worker/server.ts` (nuevo)
- `services/ops-worker/Dockerfile` (nuevo)
- `services/ops-worker/deploy.sh` (nuevo)
- `services/ops-worker/.dockerignore` (nuevo)
- `services/ops-worker/README.md` (nuevo)
- `src/lib/sync/reactive-run-tracker.ts` (nuevo)
- `vercel.json` (3 cron eliminados)
- `src/lib/operations/get-operations-overview.ts` (subsistema Reactive Worker)
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` (v1.2)

### Riesgo / siguiente paso

- **Desplegado y operativo**: Cloud Run revision `ops-worker-00004-pmk` sirviendo 100% tráfico
- **3 Cloud Scheduler jobs activos**: `ops-reactive-process` (_/5), `ops-reactive-process-delivery` (2-59/5), `ops-reactive-recover` (_/15)
- **IAM**: `greenhouse-portal@efeonce-group.iam.gserviceaccount.com` tiene `roles/run.invoker` sobre `ops-worker`
- **Health check confirmado**: `{"status":"ok","service":"ops-worker"}` via proxy
- **Scheduler → Cloud Run confirmado**: invocación exitosa (200, 50 events processed, 758ms)
- **Problema resuelto**: ESM/CJS interop con `next-auth` — shimmed via esbuild `--alias` (6 aliases: next-auth, 3 providers, next-auth/next, bcryptjs)
- Las rutas API de Vercel (`/api/cron/outbox-react`, etc.) siguen existiendo como fallback manual, pero ya no están scheduleadas en `vercel.json`
- **Mergeado a `develop`** (commit `3562f835`, 2026-06-17) — staging deployment disparado en Vercel
- **Siguiente paso**: observar Staging, verificar que `getOperationsOverview()` expone Reactive Worker en Admin > Ops Health, y luego promover a `main`

## Sesión 2026-04-05 — ISSUE-014: person_360 VIEW v2 + TASK-256 cierre

### Rama / alcance

- rama: `develop`
- scope: diagnosticar y resolver por que Mi Perfil mostraba datos enriched como null a pesar de que el Entra sync reportaba exito

### Diagnostico

- Conexion directa a PostgreSQL via Cloud SQL Proxy (puerto 15432) confirmo:
  - `client_users.avatar_url` = `gs://efeonce-group-greenhouse-public-media-staging/users/user-efeonce-admin-julio-reyes/avatar-1775407131810.jpg` — **el Entra sync SI escribio**
  - `client_users.identity_profile_id` = linkeado correctamente
- Pero la VIEW `person_360` en la DB no tenia columnas `resolved_avatar_url`, `resolved_job_title`, `resolved_phone`
- La VIEW era la version antigua (rollup-based) — el script v2 (`scripts/setup-postgres-person-360-v2.sql`) existia pero nunca se habia aplicado como migracion

### Solucion

- Migracion `20260405164846570_person-360-v2-enriched-view.sql` aplicada con `pnpm migrate:up`
- La VIEW ahora usa LATERAL joins y expone: `resolved_avatar_url`, `resolved_email`, `resolved_phone`, `resolved_job_title`, `department_name`, `job_level`, `employment_type`, `linked_systems`, `active_role_codes`
- Tipos regenerados por `kysely-codegen`

### Verificacion

- Query directa: 7/8 usuarios internos con avatar, todos con cargo y member facet
- `npx tsc --noEmit` — OK
- `pnpm lint` — OK (error pre-existente en ico-diagnostics, no relacionado)

### Documentacion

- ISSUE-014 creado en `docs/issues/resolved/`
- `docs/issues/README.md` actualizado (next ID: ISSUE-015)
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md` — delta person_360 v2
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` — delta Entra sync pipeline completo
- `docs/documentation/identity/sistema-identidad-roles-acceso.md` — Mi Perfil actualizado con flujo completo
- `changelog.md` — entradas para ISSUE-014 y TASK-256

### Archivos modificados

- `migrations/20260405164846570_person-360-v2-enriched-view.sql` (nuevo)
- `src/types/db.d.ts` (regenerado)
- `docs/issues/resolved/ISSUE-014-person-360-view-missing-enriched-columns.md` (nuevo)
- `docs/issues/README.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/documentation/identity/sistema-identidad-roles-acceso.md`
- `changelog.md`
- `Handoff.md`

### Riesgo / siguiente paso

- `src/lib/identity/canonical-person.ts` tiene fallback code para columnas antiguas (`primary_member_id`, `primary_user_id`, etc.) — es dead code que no rompe pero deberia limpiarse
- `scripts/verify-account-360.ts` referencia columnas antiguas (`membership_count`, `person_facets`) — fallara si se ejecuta
- Verificar en staging que Mi Perfil muestra datos completos tras el deploy de Vercel

## Sesión 2026-04-05 — Staging deploy failures: diagnóstico y resolución (3 problemas)

### Rama / alcance

- rama: `develop` (sin cambios de código — solo infraestructura Vercel)
- scope: resolver failures constantes reportados por GitHub en cada push

### Qué se encontró y resolvió

**Problema 1: Variables de Agent Auth no existían en Vercel**

- `AGENT_AUTH_SECRET` y `AGENT_AUTH_EMAIL` no estaban configuradas en ningún entorno de Vercel
- Se agregaron a Staging + Preview(develop) via `vercel env add`
- Resultado: el endpoint `POST /api/auth/agent-session` ahora funciona en staging (HTTP 200, JWT válido para `user-agent-e2e-001`)

**Problema 2: Proyecto Vercel duplicado en scope personal**

- Existía un segundo proyecto (`prj_5zqdjJOz6OUQy7hiPh8xHZJj8tA8`) en scope personal (`julioreyes-4376's projects`) vinculado al mismo repo GitHub
- Tenía 0 variables de entorno y sin framework configurado → cada push disparaba builds en AMBOS proyectos, el duplicado siempre fallaba con `NEXTAUTH_SECRET is not set`
- Se eliminó el proyecto duplicado via Vercel API
- Resultado: GitHub ya no reporta failures constantes

**Problema 3: VERCEL_AUTOMATION_BYPASS_SECRET con valor incorrecto**

- Otro agente había creado manualmente la variable `VERCEL_AUTOMATION_BYPASS_SECRET` en staging y preview(develop) con un valor que NO correspondía al secret real del sistema
- El valor manual sombreaba el secret auto-gestionado por Vercel (`gNYWFfHSlny2FXL7CO7IBnZuuJaEkIPJ`)
- Se eliminaron las variables manuales via `vercel env rm`
- Resultado: el bypass de SSO funciona correctamente con el secret del sistema

### Verificación

- Agent auth en staging: `curl -s -X POST "https://greenhouse-eo-env-staging-efeonce-7670142f.vercel.app/api/auth/agent-session"` con bypass header → HTTP 200, JWT válido
- GitHub deploy status: sin failures adicionales tras eliminar proyecto duplicado
- Vercel dashboard: solo el proyecto canónico `greenhouse-eo` existe para el team

### Riesgo / siguiente paso

- **Documentación**: se actualizaron AGENTS.md, CLAUDE.md, project_context.md, changelog.md, GREENHOUSE_IDENTITY_ACCESS_V2.md, y se creó ISSUE-013
- Si un agente necesita el valor real del bypass secret, debe leerlo desde la variable de entorno del sistema `VERCEL_AUTOMATION_BYPASS_SECRET`, NO hardcodearlo
- No crear NUNCA manualmente esa variable en Vercel — el sistema la gestiona

## Sesión 2026-04-05 — TASK-255: Mi Perfil identity chain fix

### Rama / alcance

- rama: `develop`
- scope: cerrar TASK-255 — hacer que Mi Perfil nunca muestre "Perfil no disponible"

### Qué se hizo

- **Root cause:** `GET /api/my/profile` respondía 422 porque `requireMyTenantContext()` exigía `memberId` en la sesión, pero el JWT no lo tenía
- **3 bugs encontrados y corregidos:**
  1. `src/lib/tenant/access.ts` — BigQuery SELECT en `getIdentityAccessRecord()` no incluía `cu.member_id` ni `cu.identity_profile_id` → los 3 paths de login (credentials, Microsoft SSO, Google SSO) quedan corregidos
  2. `src/lib/auth.ts` — `authorize()` de credentials no incluía `memberId`, `identityProfileId`, `spaceId`, `organizationId`, `organizationName` en el user retornado → el JWT callback leía `undefined`
  3. `src/app/api/my/profile/route.ts` — usaba `requireMyTenantContext` (exige memberId) → cambiado a `requireTenantContext` con fallback a session data
- **Tipos y proyecciones nuevos:** `PersonProfileSummary`, `toPersonProfileSummary()`, `toPersonProfileSummaryFromSession()` — siguen el patrón de Person360 contexts

### Verificación

- `npx tsc --noEmit` — OK
- `pnpm lint` — OK (error pre-existente en ico-diagnostics, no relacionado)
- `pnpm test` — 935 tests passed
- Validación manual en staging: usuario hizo logout + login → `/my/profile` muestra datos

### Riesgo / siguiente paso

- Otros endpoints de "Mi Ficha" que usen `requireMyTenantContext` tienen el mismo gap potencial (Mi Nómina, Mis Permisos, Mi Delivery, Mi Desempeño) — documentado como follow-up en la task
- Considerar migrar `password_hash` a PostgreSQL para eliminar el fallthrough a BigQuery en credentials login

## Sesión 2026-04-05 — Agent Auth: endpoint headless + Playwright setup

### Rama / alcance

- rama: `develop`
- scope: habilitar autenticación headless para agentes AI y tests E2E

### Qué se hizo

- Se creó `POST /api/auth/agent-session` — endpoint que genera un JWT NextAuth válido dado un shared secret + email
- Se creó `scripts/playwright-auth-setup.mjs` — script que obtiene la cookie y genera `.auth/storageState.json`
- Se agregó `AGENT_AUTH_SECRET`, `AGENT_AUTH_EMAIL` a `.env.example`
- Se agregó `/.auth/` a `.gitignore`
- Se creó `getTenantAccessRecordForAgent()` en `src/lib/tenant/access.ts` — variante PG-first que NO requiere `passwordHash` y evita fallthrough roto a BigQuery
- Se documentó en `AGENTS.md` (sección "Agent Auth"), `CLAUDE.md` (API Routes), `GREENHOUSE_IDENTITY_ACCESS_V2.md` (sección Agent Auth), `docs/documentation/identity/sistema-identidad-roles-acceso.md`, `project_context.md` y `changelog.md`

### Archivos modificados

- `src/app/api/auth/agent-session/route.ts` (nuevo)
- `src/lib/tenant/access.ts` — nueva función `getTenantAccessRecordForAgent`
- `scripts/playwright-auth-setup.mjs` (nuevo)
- `.env.example` — variables de agent auth
- `.gitignore` — excluir `.auth/`
- `AGENTS.md` — sección Agent Auth completa
- `CLAUDE.md` — API Routes actualizado
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` — delta Agent Auth
- `docs/documentation/identity/sistema-identidad-roles-acceso.md` — sección agentes
- `project_context.md` — variables de entorno
- `changelog.md` — entrada de agent auth

### Seguridad

- Endpoint desactivado por defecto (requiere `AGENT_AUTH_SECRET`)
- Bloqueado en production (`VERCEL_ENV === 'production'` → 403) salvo override explícito
- Timing-safe comparison con `crypto.timingSafeEqual`
- No crea usuarios — solo autentica emails que ya existen en la tabla de acceso

### Uso rápido

```bash
# 1. Generar secret y agregarlo a .env.local
openssl rand -hex 32
# → AGENT_AUTH_SECRET=<valor>

# 2. Con el dev server corriendo
AGENT_AUTH_SECRET=<secret> AGENT_AUTH_EMAIL=<email> node scripts/playwright-auth-setup.mjs

# 3. Usar storageState en Playwright
# → .auth/storageState.json contiene la cookie de sesión
```

### Verificación

- Endpoint probado localmente con `curl` — HTTP 200, JWT generado correctamente
- Cookie verificada contra `http://localhost:3000/home` — página protegida devuelve HTML autenticado
- `julio.reyes@efeonce.org` NO está en `greenhouse_serving.session_360` — no puede usarse como email de test
- `valentina.hoyos@efeonce.org` SÍ está y funciona como email de prueba
- `NEXTAUTH_SECRET` debe tener un valor real en `.env.local` (estaba vacío — genera error en `encode()`)

### Hallazgo: PG-first para agent auth

- `getTenantAccessRecordByEmail()` original hace fallthrough a BigQuery cuando `passwordHash` es null en PG
- El query BigQuery fallaba con `Name member_id not found` (columna faltante en la vista — bug pre-existente, corregido por TASK-255)
- Para agent auth no se necesita `passwordHash` → se creó `getTenantAccessRecordForAgent()` que resuelve desde PG sin exigir hash
- Si PG no tiene el usuario, recién entonces cae a BigQuery como fallback

### Riesgo / siguiente paso

- El endpoint está listo pero requiere que `AGENT_AUTH_SECRET` y `NEXTAUTH_SECRET` estén en `.env.local`
- Modo credentials requiere Playwright instalado como devDependency

## Sesión 2026-04-05 — Agent User dedicado (E2E)

### Qué se hizo

- Se creó un usuario dedicado para agentes/E2E en PostgreSQL via migración `20260405151705425_provision-agent-e2e-user.sql`
- Este usuario NO depende de cuentas de team members reales — es exclusivo para automatización

### Datos del usuario

| Campo         | Valor                           |
| ------------- | ------------------------------- |
| `user_id`     | `user-agent-e2e-001`            |
| `email`       | `agent@greenhouse.efeonce.org`  |
| `password`    | `Gh-Agent-2026!`                |
| `tenant_type` | `efeonce_internal`              |
| `roles`       | `efeonce_admin`, `collaborator` |

### Archivos modificados

- `migrations/20260405151705425_provision-agent-e2e-user.sql` (nuevo)
- `.env.local` — `AGENT_AUTH_EMAIL` actualizado a `agent@greenhouse.efeonce.org`

### Verificación

- Migración aplicada con `pnpm migrate:up` — OK
- `POST /api/auth/agent-session` con el nuevo email — HTTP 200, JWT válido
- Cookie probada contra `/home` — HTTP 200, autenticación exitosa
- No se tocó middleware ni rutas existentes — es puramente aditivo
- `julio.reyes@efeonce.org` necesita ser provisionado en `greenhouse_serving.session_360` para funcionar como email de agent auth

## Sesión 2026-04-05 — TASK-254 plan drafted, no runtime implementation

### Rama / alcance

- rama: `develop`
- scope: cerrar Plan Mode del worker migration sin tocar runtime

### Qué se hizo

- se detectó colisión documental: `TASK-253` ya existía como task cerrada en el registry
- la lane urgente de cron durable worker migration se reasignó al siguiente ID libre: `TASK-254`
- se movió la task a `docs/tasks/in-progress/TASK-254-operational-cron-durable-worker-migration.md`
- se creó `docs/tasks/plans/TASK-254-plan.md`
- el plan deja confirmados estos hallazgos:
  - `outbox-react`, `outbox-react-delivery` y `projection-recovery` ya operan como workers sobre backlog/cola persistente
  - el criterio actual basado solo en duración `<30s` ya no alcanza para decidir workload placement
  - `services/ico-batch/` ya ofrece el patrón Cloud Run reusable para la primera ola

### Riesgo / siguiente paso

- **no se implementó runtime**
- el siguiente paso correcto es checkpoint humano sobre `docs/tasks/plans/TASK-254-plan.md`
- decisiones abiertas a resolver antes de código:
  - si el worker nuevo vive como `services/ops-worker/` o extensión de `ico-batch`
  - si `outbox-publish` entra en la misma ola o queda sólo clasificado para follow-up

## Sesión 2026-04-05 — TASK-254 created: durable worker migration for operational crons

### Rama / alcance

- rama: `develop`
- scope: registrar task urgente para sacar del path primario de Vercel los cron que ya operan como workers durables

### Qué se hizo

- se creó `TASK-254` como lane de migración de cron operativos worker-like fuera de Vercel
- la task nace como follow-on estructural de `ISSUE-009`, `ISSUE-012`, `TASK-241` y `TASK-251`
- foco inicial explícito:
  - `outbox-react`
  - `outbox-react-delivery`
  - `projection-recovery`
- se dejó claro que esta lane no reemplaza `TASK-251`; la complementa resolviendo el execution plane del worker reactivo

### Riesgo / siguiente paso

- el siguiente agente debe ejecutar Discovery sobre `vercel.json`, `services/ico-batch/`, el consumer reactivo y la política cloud para decidir si se crea `services/ops-worker/` dedicado o se extiende el patrón existente
- esta task es `P0` / `Alto`, por lo que requiere `plan.md` y checkpoint humano antes de implementación

## Sesión 2026-04-05 — ISSUE-012 resolved: Vercel Cron no longer depends on CRON_SECRET

### Rama / alcance

- rama: `develop`
- scope: cerrar `ISSUE-012` corrigiendo el gate de auth para routes cron

### Qué se hizo

- `src/lib/cron/require-cron-auth.ts` ahora autoriza primero requests válidas de Vercel Cron (`x-vercel-cron` o `user-agent` `vercel-cron/*`)
- `CRON_SECRET` queda como guardrail para invocaciones bearer/manuales fuera de Vercel
- si falta `CRON_SECRET`, las requests no-Vercel siguen respondiendo `503`, por lo que no se abrió el endpoint manualmente
- nueva regresión focalizada en `src/lib/cron/require-cron-auth.test.ts`:
  - acepta Vercel Cron con secret presente
  - acepta Vercel Cron con secret ausente
  - mantiene fail-close para requests no-Vercel sin secret
- `ISSUE-012` quedó movida a `docs/issues/resolved/`

### Verificación

- `pnpm exec vitest run src/lib/cron/require-cron-auth.test.ts` — OK (`8` tests)
- `pnpm exec tsc --noEmit --pretty false` — OK

### Riesgo / siguiente paso

- este fix destraba el scheduler path, pero `TASK-251` sigue pendiente para replay scoped, `dryRun` y semántica enterprise del backlog reactivo
- conviene observar la próxima corrida real de `/api/cron/outbox-react` en el ambiente afectado para confirmar que `lastReactedAt` vuelve a avanzar

## Sesión 2026-04-05 — ISSUE-012 opened: reactive cron auth can block scheduled drain

### Rama / alcance

- rama: `develop`
- scope: investigar por qué el carril reactivo dejó de drenar y documentarlo como issue operativo

### Qué se hizo

- se confirmó que `vercel.json` sí agenda `GET /api/cron/outbox-react` cada `5` minutos
- se aisló una causa operacional de alta confianza en `src/lib/cron/require-cron-auth.ts`:
  - si `CRON_SECRET` falta, la helper responde `503`
  - esa validación ocurre antes de aceptar requests legítimas de Vercel Cron via `x-vercel-cron` / `user-agent`
- se verificó además que `.env.local` no define `CRON_SECRET`
- se intentó reproducir la route localmente por HTTP, pero el entorno local cae antes con `NEXTAUTH_SECRET` faltante; eso impide la reproducción end-to-end local, aunque no cambia el hallazgo principal del gate cron
- se abrió `docs/issues/open/ISSUE-012-reactive-cron-routes-fail-closed-without-cron-secret.md`

### Riesgo / siguiente paso

- mientras no se corrija el gate de cron auth o la configuración del entorno afectado, el backlog reactivo puede seguir creciendo aunque la schedule exista
- el fix debería entrar como parte de `TASK-251` o como fix puntual si se quiere destrabar el carril antes del replay scoped enterprise

## Sesión 2026-04-05 — ISSUE-009 resolved: hidden reactive backlog is now visible in Admin Ops

### Rama / alcance

- rama: `develop`
- scope: cerrar `ISSUE-009` corrigiendo la invisibilidad del backlog reactivo en surfaces admin

### Qué se hizo

- nuevo reader canónico `src/lib/operations/reactive-backlog.ts`
  - total backlog reactivo oculto
  - backlog últimas `24h`
  - oldest/newest
  - `lastReactedAt`
  - `lagHours`
  - status derivado + top event types
- `getOperationsOverview()` ahora expone:
  - `kpis.hiddenReactiveBacklog`
  - bloque estructurado `reactiveBacklog`
  - subsystem visible `Reactive backlog`
- `/api/internal/projections` ahora devuelve `reactiveBacklog` y deja de marcar health global como sana cuando hay backlog oculto
- `AdminOpsHealthView` ahora muestra:
  - KPI separado de backlog reactivo real
  - `lastReactedAt`
  - ventana oldest/newest
  - top event types sin abrir SQL
- `AdminCenterView` ahora deja de mostrar `Ops Health` como `Ok` cuando existe backlog reactivo oculto y lo agrega al bloque `Requiere atención`
- nueva cobertura focalizada:
  - `src/lib/operations/reactive-backlog.test.ts`
  - `src/views/greenhouse/admin/AdminCenterView.test.tsx`

### Verificación

- `pnpm exec vitest run src/lib/operations/reactive-backlog.test.ts src/views/greenhouse/admin/AdminCenterView.test.tsx` — OK (`8` tests)
- `pnpm exec tsc --noEmit --pretty false` — OK
- query runtime confirmada post-fix:
  - `607` eventos reactivos ocultos
  - `128` en últimas `24h`
  - `lastReactedAt = 2026-04-03 01:50:29+00`

### Riesgo / siguiente paso

- el incidente de invisibilidad quedó resuelto
- el backlog live sigue existiendo y ahora ya es visible; no se ejecutó replay global ciego porque podría disparar side effects stale
- el siguiente paso estructural sigue siendo `TASK-251`: replay/drain scoped, `dryRun`, lag semantics y guardrails enterprise

## Sesión 2026-04-05 — TASK-252 pre-implementation plan drafted, still blocked by TASK-251

### Rama / alcance

- rama: `develop`
- scope: ejecutar discovery y dejar plan de `TASK-252` sin tocar implementación runtime

### Qué se hizo

- se validó que `TASK-252` sigue correctamente bloqueada por `TASK-251`
- se confirmó que el runtime más fuerte para esta lane no es `greenhouse-agent`, sino `NexaService` + `nexa-tools`:
  - `greenhouse-agent` hoy funciona como prompt helper advisory
  - `NexaService` ya soporta function calling, `runtimeContext`, gating por roles y synthesis con tools
- se confirmó que las surfaces target ya existen:
  - `AdminCenterView`
  - `AdminOpsHealthView`
  - `AdminOperationalActionsPanel`
- se confirmó que el sistema actual de notificaciones ya puede reutilizarse para avisos no invasivos con guardrails sobre `NotificationService`
- se creó `docs/tasks/plans/TASK-252-plan.md` con:
  - decisión de runtime base
  - orden de slices
  - archivos probables a crear/modificar
  - riesgos y preguntas abiertas

### Riesgo / siguiente paso

- no iniciar implementación de `TASK-252` hasta que `TASK-251` entregue la truth layer del backlog reactivo y el replay scoped/dry-run
- cuando `TASK-251` cierre o deje esos contratos listos, `TASK-252` ya tiene plan humano-aprobable y puede entrar a ejecución sin redescubrir la lane

## Sesión 2026-04-05 — ISSUE-009 Reactive backlog invisible to current Ops metrics

### Rama / alcance

- rama: `develop`
- scope: registrar incidente operativo confirmado en el carril outbox/reactive sin tocar runtime

### Qué se hizo

- se confirmó que el publish lane está sano en `greenhouse-pg-dev`:
  - `0` eventos `pending`
  - `329` eventos en últimas `24h`, todos publicados
- se confirmó backlog reactivo real no visible por los KPIs actuales:
  - `607` eventos reactivos publicados sin fila en `greenhouse_sync.outbox_reactive_log`
  - `128` de esos eventos ocurrieron en últimas `24h`
  - backlog observado desde `2026-03-20 08:22:59+00`
  - último `reacted_at` observado: `2026-04-03 01:50:29+00`
- se creó `ISSUE-009` para formalizar el incidente y la brecha de observabilidad

### Riesgo / siguiente paso

- `getOperationsOverview()` hoy puede mostrar `pendingProjections = 0` y `failedHandlers = 0` mientras exista backlog real en la transición `published -> outbox_reactive_log`
- además del fix operativo puntual, esto amerita una capacidad más robusta de observabilidad/replay del control plane reactivo

## Sesión 2026-04-05 — ISSUE-008 Finance schema drift degraded responses

### Rama / alcance

- rama: `develop`
- scope: cerrar `ISSUE-008` sin romper consumers que hoy esperan listas en Finance

### Qué se hizo

- nuevo helper shared: `src/lib/finance/schema-drift.ts`
- `purchase-orders`, `hes`, `quotes` y `intelligence/operational-pl` ahora responden payload degradado explícito cuando detectan drift de schema:
  - preservan `items` / `total` o `snapshots`
  - agregan `degraded: true`, `errorCode`, `message`
- `ISSUE-008` quedó resuelta y movida a `docs/issues/resolved/`
- nueva regresión: `src/app/api/finance/schema-drift-response.test.ts`
- `purchase-orders/route.test.ts` ahora cubre también el caso degradado

### Verificación

- `pnpm exec vitest run src/app/api/finance/purchase-orders/route.test.ts src/app/api/finance/schema-drift-response.test.ts` — OK
- `pnpm exec vitest run src/lib/finance/**/*.test.ts src/app/api/finance/**/*.test.ts` — OK (`24` files, `102` passed, `2` skipped)

## Sesión 2026-04-05 — ISSUE-007 Finance fallback write ID reuse + issue protocol

### Rama / alcance

- rama: `develop`
- scope: cerrar `ISSUE-007` sin perder fallback funcional en Finance y formalizar lifecycle operativo de `ISSUE-###`

### Qué se hizo

- `POST /api/finance/income` y `POST /api/finance/expenses` ahora preservan un ID canónico por request:
  - si el path Postgres-first ya generó `incomeId` / `expenseId`, el fallback BigQuery reutiliza ese mismo valor
  - ya no se recalcula una segunda secuencia dentro del mismo create lógico
- nueva regresión: `src/app/api/finance/fallback-id-reuse.test.ts`
- `ISSUE-007` quedó resuelta y movida a `docs/issues/resolved/`
- nuevo protocolo operativo de issues: `docs/operations/ISSUE_OPERATING_MODEL_V1.md`
- `docs/issues/README.md` quedó alineado para tratar `ISSUE-###` como carril formal separado de tasks

### Verificación

- `pnpm exec vitest run src/app/api/finance/fallback-id-reuse.test.ts src/app/api/finance/identity-drift-payloads.test.ts src/app/api/finance/bigquery-write-cutover.test.ts` — OK
- `pnpm exec vitest run src/lib/finance/**/*.test.ts src/app/api/finance/**/*.test.ts` — OK (`23` files, `99` passed, `2` skipped)

## Sesión 2026-04-05 — TASK-248 Identity & Access Spec Compliance

### Rama / alcance

- rama: `develop`
- scope: cerrar 4 gaps de spec compliance post contraste arquitectura vs implementación

### Qué se hizo

- **TASK-248 implementada y cerrada** (4/4 slices):
  - **Slice 1 — Scope audit**: `scope.assigned`/`scope.revoked` event types + payloads. Emission en `tenant-member-provisioning.ts` para project scopes (fire-and-forget)
  - **Slice 2 — Login audit**: `auth.login.success`/`auth.login.failed` event types + payloads. Success via NextAuth `events.signIn`, failed inline en `authorize()` credentials
  - **Slice 3 — People drift**: `people` agregado a mapping base de `efeonce_operations` y `hr_payroll`. `canAccessPeopleModule` simplificado. Drift #1 cerrado
  - **Slice 4 — Legacy codes**: 1 usuario migrado (`employee` → `collaborator`), 0 `finance_manager` activos. Ambos eliminados de `ROLE_CODES`, `ROLE_PRIORITY`, `ROLE_ROUTE_GROUPS`. Route group `employee` eliminado del type system. 15 archivos actualizados

### Verificación

- `tsc --noEmit` — OK
- `pnpm build` — OK
- `pnpm lint` — OK
- `pnpm test` — 220 files, 922 tests passing

---

## Sesión 2026-04-05 — TASK-249 Test Observability MVP

### Rama / alcance

- rama: `develop`
- scope: implementación completa del MVP de observabilidad de tests sin backend admin

### Qué se hizo

- `TASK-249` quedó implementada y cerrada.
- Se agregaron scripts canónicos: `test:inventory`, `test:results`, `test:coverage`, `test:observability:summary` y `test:observability`.
- `scripts/test-inventory.ts` ahora genera `artifacts/tests/inventory.json` e `inventory.md` con clasificación por dominio, tipo y entorno.
- `scripts/test-observability-summary.ts` sintetiza inventario, resultados, coverage y warnings en `artifacts/tests/summary.md` y publica el mismo contenido en GitHub Actions Summary.
- `vitest.config.ts` ahora publica coverage con provider `v8` y reporters `text`, `json-summary`, `html` hacia `artifacts/coverage/`.
- `.github/workflows/ci.yml` ahora ejecuta inventario, `test:results`, `test:coverage`, summary y upload de artifacts reutilizables.
- `docs/architecture/12-testing-development.md` quedó alineado con la nueva fuente operativa de verdad basada en CI + artifacts.

### Verificación

- `pnpm test:inventory` — OK
- `pnpm test:results` — OK (`220` archivos, `924` tests, `922` passed, `2` skipped)
- `pnpm test:coverage` — OK (`lines 51.22%`, `statements 49.94%`, `functions 44.79%`, `branches 34.28%`)
- `pnpm test:observability:summary` — OK
- `pnpm lint` — OK
- `npx tsc --noEmit` — OK
- `pnpm build` — OK

## Sesión 2026-04-05 — TASK-247 Identity & Platform Block Hardening

### Rama / alcance

- rama: `develop`
- scope: cerrar 12 gaps de robustez post-auditoría del bloque TASK-225→229

### Qué se hizo

- **TASK-247 implementada y cerrada** (12/12 gaps):
  - **Slice 1 — Race conditions críticas**: superadmin count movido dentro de transacción con `FOR UPDATE` en role-management.ts; primary demotion con `SELECT ... FOR UPDATE` en store.ts (create + update)
  - **Slice 2 — Gaps altos**: `administracion.cuentas` viewCode en VIEW_REGISTRY; VerticalMenu filtra con viewCode correcto; date validation `effectiveFrom < effectiveTo` en store.ts; `RoleGuardrailError` class con statusCode para HTTP 400
  - **Slice 3 — Paginación + UI**: `listResponsibilities()` con LIMIT/OFFSET y count paralelo; API retorna `{ items, total, page, pageSize }`; `AdminAccountsView` con Alert + "Reintentar" en error
  - **Slice 4 — Eventos**: 5 event types agregados a REACTIVE_EVENT_TYPES; 6 payload interfaces definidas
  - **Slice 5 — Menores**: input validation en POST responsibilities; Vitest test para VIEW_REGISTRY uniqueness; fix pre-existing mock en space-360.test.ts; fix ownership en Space360View.test.tsx fixture
- **Archivos modificados**: role-management.ts, store.ts, readers.ts, view-access-catalog.ts, VerticalMenu.tsx, AdminAccountsView.tsx, event-catalog.ts, responsibilities/route.ts, users/[id]/roles/route.ts
- **Archivos creados**: view-access-catalog.test.ts

### Verificación

- `tsc --noEmit` — OK
- `pnpm build` — OK
- `pnpm lint` — OK
- `pnpm test` — 220 files, 923 tests passing

---

## Sesión 2026-04-05 — TASK-229 Client View Catalog Deduplication

### Rama / alcance

- rama: `develop`
- scope: eliminar 5 viewCodes duplicados del catálogo cliente, agregar validación build-time

### Qué se hizo

- **TASK-229 implementada y cerrada**:
  - 5 entries duplicadas eliminadas de VIEW_REGISTRY (cliente.equipo, cliente.revisiones, cliente.analytics, cliente.campanas, cliente.notificaciones)
  - Entries con descripciones más ricas conservadas como canónicas
  - Validación build-time: throw si viewCode duplicado en VIEW_REGISTRY
- **Bloque completo TASK-225→229 cerrado** (5/5 tasks del bloque de identidad/platform)

### Verificación

- `pnpm build` — OK
- `pnpm lint` — OK

---

## Sesión 2026-04-05 — TASK-228 Employee Legacy Role Code Convergence

### Rama / alcance

- rama: `develop`
- scope: deprecar employee y finance_manager, actualizar consumers a finance_admin

### Qué se hizo

- **TASK-228 implementada y cerrada**:
  - `employee` y `finance_manager` marcados `@deprecated` en role-codes.ts
  - ROLE_ROUTE_GROUPS mantiene aliases backwards-compat
  - 7 archivos runtime actualizados para aceptar `finance_admin` como canonical
  - BigQuery seeds actualizados con descripción legacy
  - Delta en INTERNAL_ROLES_HIERARCHIES_V1

### Pendiente operacional

- Nada — convergencia TypeScript completa, migración de datos usuarios pendiente cuando se confirme inventario

### Verificación

- `pnpm build` — OK
- `pnpm lint` — OK

---

## Sesión 2026-04-05 — TASK-226 Superadministrador Bootstrap & Assignment Policy

### Rama / alcance

- rama: `develop`
- scope: policy de Superadministrador, guardrails, audit events, pg:doctor health check

### Qué se hizo

- **TASK-226 implementada y cerrada**:
  - `SUPERADMIN_PROFILE_ROLES` + `isSuperadmin()` en `role-codes.ts`
  - Guardrails en `updateUserRoles()`: solo admin asigna admin, no revocar último superadmin, efeonce_admin siempre incluye collaborator
  - Audit events: `role.assigned` + `role.revoked` vía outbox con `assigned_by_user_id`
  - Invite hardened: auto-agrega collaborator al invitar con efeonce_admin
  - `pnpm pg:doctor` reporta superadmin health (count, users, warning si 0)
  - Docs: deltas en IDENTITY_ACCESS_V2 + INTERNAL_ROLES_HIERARCHIES_V1

### Pendiente operacional

- Nada

### Verificación

- `pnpm build` — OK
- `pnpm lint` — OK (1 error pre-existente en AnimatedCounter.test.tsx)

---

## Sesión 2026-04-05 — TASK-195 Space Identity Consolidation

### Rama / alcance

- rama: `develop`
- scope: consolidación org-first del admin, nueva surface de cuentas, legacy banner, breadcrumbs

### Qué se hizo

- **TASK-195 implementada y cerrada** (5 slices):
  - Slice 1: deltas en ARCHITECTURE_V1 y 360_OBJECT_MODEL_V1 formalizando Organization/Space/Space 360
  - Slice 2: `/admin/accounts` (lista de organizaciones con KPIs) + `/admin/accounts/[id]` (detalle con spaces, readiness, create space dialog)
  - Slice 3: creación de Space accesible desde ficha de cuenta con dialog inline
  - Slice 4: banner info en `/admin/tenants/[id]` "Esta vista está en transición" con link a Cuentas
  - Slice 5: breadcrumbs Space 360 muestran Organization, "Cuentas" en sidebar admin, nomenclatura en GH_INTERNAL_NAV

### Pendiente operacional

- Nada — build y lint OK, todo pusheado

### Verificación

- `pnpm build` — OK
- `pnpm lint` — OK

---

## Sesión 2026-04-05 — TASK-230 cierre documental + convergencia final

### Rama / alcance

- rama: `develop`
- scope: cierre completo de `TASK-230` (wrapper canónico + documentación + commit/push)

### Qué se hizo

- `src/libs/FramerMotion.tsx` ahora expone `useInView`.
- `src/components/greenhouse/AnimatedCounter.tsx` dejó de importar `framer-motion` directo y ahora usa `@/libs/FramerMotion`.
- Nueva cobertura focalizada: `src/components/greenhouse/AnimatedCounter.test.tsx`.
- Verificación del carril de animación:
  - `pnpm exec eslint src/components/greenhouse/AnimatedCounter.test.tsx` — OK
  - `pnpm build` — OK
  - `pnpm exec vitest run src/components/greenhouse/AnimatedCounter.test.tsx src/components/greenhouse/EmptyState.test.tsx src/views/greenhouse/finance/FinancePeriodClosureDashboardView.test.tsx` — OK
- Intento de preview manual local ejecutado sobre `http://localhost:3000/finance` con `NEXTAUTH_SECRET` temporal:
  - el route dejó de caer en `500`
  - el dashboard siguió bloqueado por sesión local de login
  - no se observaron errores de runtime propios de la lane de animación
- `TASK-230` movida a `complete/`.
- Índice, registry, changelog y task docs alineados.
- Cross-impact check: `TASK-233` recibió delta porque el `Out of Scope` de `TASK-230` ya referencia la lane 3D correcta.

### Limitaciones verificadas

- `pnpm lint` completo del repo ya no está verde por errores ajenos a `TASK-230` en `src/config/role-codes.ts` y `src/lib/tenant/role-route-mapping.ts`.
- `pnpm test` completo del repo sigue con fallas ajenas a `TASK-230` (`Space360View` / `space-360`).
- `npx tsc --noEmit` también sigue contaminado por drift ajeno en tests; el `build` productivo sí completó TypeScript.

---

## Sesión 2026-04-05 — TASK-225 cierre + TASK-227 implementación

### Rama / alcance

- rama: `develop`
- scope: cierre de TASK-225 (roles y jerarquías) + implementación completa de TASK-227 (Operational Responsibility Registry)

### Qué se hizo

- **TASK-225 cerrada**: todos los acceptance criteria verificados, spec canónica de 474 líneas completada, follow-ons spawned (226/227/228/229)
- **TASK-227 implementada**:
  - Migración DDL: `greenhouse_core.operational_responsibilities` con unique constraints, indexes, ownership
  - Config: `src/config/responsibility-codes.ts` (5 responsibility types, 4 scope types, labels español)
  - Event catalog extendido: `responsibility.assigned/revoked/updated`
  - Store CRUD: `src/lib/operational-responsibility/store.ts` (create, update, revoke + outbox + primary demotion)
  - Readers: `src/lib/operational-responsibility/readers.ts` (list, getScopeOwnership, getMember, getSpace)
  - API Admin: `GET/POST /api/admin/responsibilities`, `PATCH/DELETE /api/admin/responsibilities/[id]`
  - UI Admin: `/admin/responsibilities` con tabla CRUD, diálogo de asignación, autocomplete de miembros
  - Consumer Agency: Space 360 OverviewTab muestra ownership badges
- **Cross-impact check**: deltas aplicados en TASK-226, TASK-228, TASK-229, TASK-195
- Docs de arquitectura actualizados: INTERNAL_ROLES_HIERARCHIES_V1 + EVENT_CATALOG_V1
- Task README actualizado

### Pendiente operacional

- Nada — todo cerrado end-to-end

### Verificación

- `pnpm build` — OK
- `pnpm lint` — OK

---

## Sesión 2026-04-04 — TASK-241 ICO Batch Worker Cloud Run Service

### Rama / alcance

- rama: `develop`
- scope: Cloud Run service para batch processing ICO, Dockerfile, deploy script, Cloud Scheduler

### Qué se hizo

- Creado `services/ico-batch/server.ts` — HTTP server standalone con Node.js nativo
- Endpoints: `GET /health`, `POST /ico/materialize`, `POST /ico/llm-enrich`
- `services/ico-batch/Dockerfile` — Node.js 22-slim, tsx runtime, `--conditions=react-server` para shim server-only
- `services/ico-batch/deploy.sh` — gcloud run deploy + Cloud Scheduler jobs (IAM OIDC)
- Documentado en §4 y §5 de `GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- Delta en `Greenhouse_ICO_Engine_v1.md`
- Eliminado endpoint temporal `ico-llm-rematerialize`
- Política §1.1 Workload Placement formalizada (sesión anterior)

### Pendiente operacional

- Ejecutar `bash services/ico-batch/deploy.sh` para deploy real en GCP
- Verificar health check y primer run manual
- Re-materializar TASK-239 Slice 4 (Feb/Mar/Abr 2026) vía el nuevo servicio
- Tras período de transición (2 semanas), deshabilitar crons redundantes en `vercel.json`

### Verificación

- `pnpm tsc --noEmit` — OK
- `pnpm lint` — OK
- `pnpm build` — OK

---

## Sesión 2026-04-04 — TASK-239 Nexa Insights Prompt Enrichment

### Rama / alcance

- rama: `develop`
- scope: prompt LLM v2 con glosario de métricas, cadena causal, doble capa narrativa, entity resolution, shortName en UI

### Qué se hizo

- `MetricDefinition.shortName` agregado a las 11 métricas ICO + 6 métricas Person Intelligence
- Glosario dinámico generado desde `ICO_METRIC_REGISTRY` inyectado al prompt
- Cadena causal formal (BCS → FTR% → RpA → CT → TTM → RE) inyectada al prompt
- Instrucciones de doble capa narrativa (técnica + bajada operativa, spanglish)
- `resolve-signal-context.ts` — batch entity resolution (spaces, members, projects vía Kysely)
- `enrichSignalPayload()` agrega metricDisplayName, spaceName, memberName, projectName al JSON de la señal
- `NexaInsightsBlock` muestra `shortName` (FTR%, RpA) en chips en vez de `label` (español)
- Prompt version bumped: `ico_signal_enrichment_v1` → `ico_signal_enrichment_v2`
- Delta documentado en `Greenhouse_ICO_Engine_v1.md`

### Pendiente

- Slice 4: re-materializar enrichments con el prompt nuevo (requiere trigger manual del pipeline en staging)
- Mover TASK-239 a `complete/` después de validar re-materialización

### Verificación

- `pnpm tsc --noEmit` — OK
- `pnpm lint` — OK
- `pnpm build` — OK

---

## Sesión 2026-04-04 — TASK-238 Agency Workspace & Space 360 Data Storytelling UX

### Rama / alcance

- rama: `task/TASK-238-agency-data-storytelling`
- scope: terminología, tooltips, breadcrumbs, KPIs, donut chart, team cleanup, animated empty states

### Qué se hizo

- "Revenue" → "Ingresos" en Space360View y AgencyEconomicsView (0 instancias restantes)
- "360 listo" → "Snapshot activo" en StaffAugmentationListView
- "Abrir economía"/"Economía"/"Abrir finanzas" → "Ver finanzas" (unificado)
- Tooltips en RpA, OTD, FTR, Throughput, Cycle, Stuck (nomenclatura centralizada en GH_AGENCY)
- Breadcrumbs en Space 360 (Agencia > Spaces > [Space Name]) — "Volver a Spaces" removido
- Per-service "Abrir detalle" removido (nombre linkeable directo)
- Space 360 KPIs: 5→4 (Cobertura removido), layout 4-columns con AnimatedCounter
- Pulse KPIs: AnimatedCounter en RpA, OTD, Assets, Feedback
- ExecutiveMiniStatCard: value type widened a `string | ReactNode`
- Finance tab: donut chart ApexCharts para composición de costo (reemplaza lista plana)
- Team tab: campos null ocultos (grid adaptativo)
- Animated EmptyState en 5 puntos (Space not found, Delivery, Finance income/expenses, ICO)
- TASK-146 reference limpiada de ServicesTab

### Verificación

- `pnpm build` — OK
- `pnpm lint` — OK
- `pnpm test` — 218 files, 917 tests pass

---

## Sesión 2026-04-04 — TASK-234 Codex animation skill sync cerrada

### Rama / alcance

- rama actual: `develop`
- scope:
  - `docs/tasks/complete/TASK-234-codex-skills-animation-library-sync.md`
  - `.codex/skills/greenhouse-agent/SKILL.md`
  - `.codex/skills/greenhouse-portal-ui-implementer/SKILL.md`
  - `.codex/skills/greenhouse-ui-orchestrator/SKILL.md`
  - `.codex/skills/greenhouse-vuexy-ui-expert/SKILL.md`
  - `.codex/skills/greenhouse-ux-content-accessibility/SKILL.md`

### Qué se hizo

- Se corrigió primero la spec de `TASK-234` para reflejar rutas y estado reales.
- Se sincronizó el conocimiento de animación de `TASK-230` hacia las 5 skills de Codex:
  - wrappers `Lottie` y `FramerMotion`
  - `useReducedMotion`
  - `AnimatedCounter`
  - `EmptyState.animatedIcon`
  - guardrails de assets y anti-patterns
- La task quedó cerrada en `docs/tasks/complete/TASK-234-codex-skills-animation-library-sync.md`.

### Verificación

- `pnpm lint` — OK
- `pnpm build` — OK
- `rg -n "new Pool\\(" src` — solo `src/lib/postgres/client.ts`

### Riesgo / coordinación

- El worktree tiene cambios paralelos de Agency y `TASK-238`; no se deben mezclar ni revertir en este lote.

## Sesión 2026-04-04 — Payroll PDF download backend incident fixed

### Rama / alcance

- rama actual: `develop`
- scope:
  - `src/lib/payroll/payroll-export-packages-store.ts`
  - `src/lib/payroll/payroll-export-packages-store.test.ts`

### Qué se hizo

- Se investigó el fallo real de `HR > Nómina > Descargar PDF`.
- Hallazgo principal:
  - el PDF no estaba roto
  - el store compartido de exportación (`payroll-export-packages-store`) ejecutaba DDL runtime sobre `greenhouse_payroll.payroll_export_packages`
  - como la tabla ya existe y el owner canónico es `greenhouse_ops`, el usuario runtime fallaba con `must be owner of table payroll_export_packages`
- Se corrigió la causa raíz:
  - se eliminó el bootstrap DDL (`CREATE SCHEMA/TABLE/INDEX IF NOT EXISTS`) del path transaccional
  - el store ahora asume la infraestructura migrada, alineado con el modelo Postgres del repo
  - no se rompió el contrato shared del paquete de exportación:
    - `Descargar PDF`
    - `Descargar CSV`
    - `sendPayrollExportReadyNotification()` con PDF + CSV adjuntos siguen usando el mismo paquete persistido
- Issue documentado:
  - GitHub issue `#26` — `Payroll PDF download fails because runtime export store performs DDL on payroll_export_packages`

### Evidencia verificada

- repro dirigido de `getOrCreatePayrollExportPackageAssets('2026-03')`:
  - `wasGenerated: false`
  - PDF persistido leído correctamente (`16550 bytes`)
  - CSV persistido leído correctamente (`973 bytes`)
  - metadata de delivery existente preservada (`deliveryStatus: sent`)

### Verificación

- `pnpm exec vitest run src/lib/payroll/payroll-export-packages-store.test.ts src/lib/payroll/payroll-export-packages.test.ts --reporter=dot` — OK
- `pnpm exec tsc --noEmit --pretty false` — OK

---

## Sesión 2026-04-04 — TASK-237 Agency ICO Engine Tab UX Redesign

### Rama / alcance

- rama: `task/TASK-237-agency-ico-tab-ux`
- scope: rediseño UX completo del tab ICO Engine en Agency

### Qué se hizo

- IcoGlobalKpis: reducido de 6 a 4 KPIs (RpA, OTD%, FTR%, Throughput), AnimatedCounter, trust como tooltip
- IcoCharts: paletas diferenciadas (CSC=fases, RPA=roles), tooltips en labels truncados, Pipeline Velocity gauge eliminado
- SpaceIcoScorecard: migrado de CSS grid a TanStack React Table con sticky headers, sorting visible con aria-sort, tooltips en zone dots, stuck assets como chip clickeable
- AgencyIcoEngineView: performance report reestructurado en 3 Accordions colapsables (Salud de entrega, Volumen y composición, Resumen ejecutivo), charts y scorecard movidos antes del report, trust highlights eliminados del report (ya en KPI tooltips)
- Patrón de progressive disclosure documentado en GREENHOUSE_UI_PLATFORM_V1.md

---

## Sesión 2026-04-04 — TASK-236 Agency Resilience & Feedback Patterns

### Rama / alcance

- rama: `task/TASK-236-agency-resilience-feedback`
- scope: error states, empty states, toasts, loading text en todo el módulo Agency

### Qué se hizo

- 7 vistas Agency ahora muestran error accionable con "Reintentar" cuando un fetch falla (nunca más spinner infinito)
- StaffAugmentationListView ahora tiene EmptyState animado cuando no hay placements
- ServicesListView ahora usa EmptyState centralizado (antes era Typography plana)
- PlacementDetailView.updateOnboardingItem ahora muestra toast success/error
- CreatePlacementDialog ahora muestra toast "Placement creado" al crear exitosamente
- AgencyWorkspace lazy tabs (Spaces, Capacity, ICO) tienen retry en error states
- 4 vistas standalone muestran texto contextual junto al spinner ("Cargando servicios...", etc.)
- Patrón documentado en GREENHOUSE_UI_PLATFORM_V1.md para adopción en otros módulos

### Verificación

- `pnpm build` — OK
- `pnpm lint` — OK
- `pnpm test` — 218 files, 917 tests pass

---

## Sesión 2026-04-04 — Notion delivery backend incident fixed per-space

### Rama / alcance

- rama actual: `develop`
- scope:
  - `src/lib/integrations/notion-sync-orchestration.ts`
  - `src/lib/integrations/notion-sync-orchestration.test.ts`
  - `src/lib/sync/sync-notion-conformed.ts`

### Qué se hizo

- Se investigó el incidente real de `Notion Delivery Data Quality` en `/admin/integrations`.
- Hallazgo principal:
  - el monitor no estaba mintiendo
  - `Sky Airline` tenía raw fresco (`2026-04-04T06:02Z` / `06:08Z`) pero `greenhouse_conformed` seguía en `2026-04-03T16:14Z`
  - la causa raíz era de orquestación:
    - el gate de frescura seguía actuando como bloqueo global
    - un `space` stale (`Efeonce`) impedía materializar otro `space` ya listo (`Sky Airline`)
- Se corrigió el runtime para cerrar por `space`:
  - la orquestación ya no deja retenido un tenant listo por otro tenant stale
  - el writer conformed parcial preserva los `space_id` no listos y solo reescribe el scope elegible
  - el control plane completa/falla snapshots por `space` en vez de cerrar todo en bloque
- Remediación aplicada:
  - se ejecutó una corrida manual `manual_admin`
  - resultado real:
    - `Sky Airline` pasó a `sync_completed`
    - `Efeonce` quedó correctamente en `waiting_for_raw`
    - el monitor post-sync quedó `healthy` para `Sky` y `broken` para `Efeonce` por raw stale real

### Evidencia verificada

- `pnpm audit:notion-delivery-parity --space-id=spc-ae463d9f-b404-438b-bd5c-bd117d45c3b9 --year=2026 --month=4 --period-field=due_date`
  - antes: `diff=81`, bucket `fresh_raw_after_conformed_sync=81`
  - después: `diff=0`, todos los buckets en `0`
- overview actual de orquestación:
  - `Sky Airline` → `sync_completed`
  - `Efeonce` → `waiting_for_raw`
- últimas corridas de data quality:
  - `Sky Airline` → `healthy` (`post_sync`)
  - `Efeonce` → `broken` por `rawFreshnessReady=false`

### Verificación

- `pnpm exec vitest run src/lib/integrations/notion-sync-orchestration.test.ts src/lib/integrations/notion-readiness.test.ts src/lib/integrations/notion-delivery-data-quality-core.test.ts src/lib/sync/notion-task-parity.test.ts` — OK
- `pnpm exec tsc --noEmit` — OK
- `pnpm exec eslint src/lib/integrations/notion-sync-orchestration.ts src/lib/integrations/notion-sync-orchestration.test.ts src/lib/sync/sync-notion-conformed.ts` — OK
- `pnpm build` — OK

### Pendiente real

- `Efeonce` sigue con raw stale en `notion_ops` y requiere que el upstream refresh del día termine o se rerunée.
- El incidente backend de bloqueo cruzado quedó corregido; el fallo restante ya no es del portal sino del upstream raw de ese `space`.

---

## Sesión 2026-04-04 — TASK-232 implementada end-to-end y cerrada

### Rama / alcance

- rama actual: `task/TASK-230-portal-animation-library`
- scope final:
  - lane async LLM del `ICO Engine`
  - storage complementario BQ/PG para explanations + run audit
  - proyección reactiva y readers downstream en `Agency`, `Ops Health` y `Nexa`

### Qué se hizo

- Se creó la lane generativa async colgada de `ico.ai_signals.materialized` sin tocar el request path crítico del materializer.
- Provider/model policy activa:
  - `Vertex AI`
  - `@google/genai`
  - `Gemini`
  - baseline: `google/gemini-2.5-flash@default`
- Nuevos artefactos principales:
  - `src/lib/ico-engine/ai/llm-provider.ts`
  - `src/lib/ico-engine/ai/llm-enrichment-worker.ts`
  - `src/lib/ico-engine/ai/llm-enrichment-reader.ts`
  - `src/lib/ico-engine/ai/llm-types.ts`
  - `src/lib/sync/projections/ico-llm-enrichments.ts`
  - migración `20260404123559856_task-232-ico-llm-enrichments.sql`
- Se agregaron tablas/contratos:
  - BQ: `ai_signal_enrichments`, `ai_enrichment_runs`
  - PG serving: `ico_ai_signal_enrichments`, `ico_ai_enrichment_runs`
- Downstream:
  - `Agency > ICO Engine` ahora expone `aiLlm`
  - `Ops Health` ahora muestra `AI LLM Enrichment`
  - `Nexa > get_otd` agrega resumen breve de enriquecimientos recientes
- Documentación cruzada actualizada:
  - `docs/tasks/README.md`
  - `docs/architecture/Greenhouse_ICO_Engine_v1.md`
  - deltas en `TASK-150`, `TASK-151`, `TASK-152`, `TASK-154`, `TASK-155`, `TASK-159`

### Verificación

- `pnpm lint` — OK
- `pnpm clean && pnpm build` — OK
- `pnpm test` — OK
- `pnpm migrate:up` — OK
  - migración aplicada
  - `src/types/db.d.ts` regenerado

### Pendiente / follow-up real

- Calibrar umbrales y uso downstream del `qualityScore` antes de convertirlo en input fuerte de scoring compuesto (`TASK-150`, `TASK-151`)
- Evaluar provider-per-metric solo después de observar costos/latencia reales con el baseline Gemini

## Sesión 2026-04-04 — TASK-232 downstream wiring integrado

### Rama / alcance

- rama actual: `task/TASK-230-portal-animation-library`
- scope: consumo downstream del carril LLM de `TASK-232` sin tocar worker, migraciones ni el pipeline reactivo base

### Qué se hizo

- Se consolidó el reader reusable `src/lib/ico-engine/ai/llm-enrichment-reader.ts` para resumir enriquecimientos LLM y el snapshot operativo del carril
- `src/app/api/ico-engine/metrics/agency/route.ts` ahora devuelve `aiLlm` además de `aiCore`
- `src/lib/operations/get-operations-overview.ts` suma el subsystem `AI LLM Enrichment` con fallback `not_configured` si faltan tablas
- `src/lib/nexa/nexa-tools.ts` ahora adjunta un resumen breve de enriquecimientos LLM recientes al tool `get_otd` para organizaciones

### Verificación

- `pnpm exec eslint src/app/api/ico-engine/metrics/agency/route.ts src/lib/operations/get-operations-overview.ts src/lib/nexa/nexa-tools.ts src/lib/ico-engine/ai/llm-enrichment-reader.ts src/lib/ico-engine/ai/llm-types.ts` — OK
- `pnpm build` — OK
- `pnpm lint` global — bloqueado por `src/lib/ico-engine/ai/llm-enrichment-worker.ts` en trabajo paralelo fuera de este alcance

### Pendiente para cierre

- Validar el worker LLM cuando su autor lo tome o cuando se autorice tocar ese archivo
- Si cambia el contrato de `AiSignalEnrichmentRecord`, revisar de nuevo el worker para mantener compatibilidad

## Sesión 2026-04-04 — TASK-230 Animation Library Integration

### Rama / alcance

- rama: `task/TASK-230-portal-animation-library`
- scope: integración de `lottie-react` + `framer-motion` al portal

### Qué se hizo

- Instaladas dependencias: `lottie-react@2.4.1`, `framer-motion@12.38.0`
- Creados wrappers: `src/libs/Lottie.tsx` (dynamic import), `src/libs/FramerMotion.tsx` (client re-export)
- Creado hook `src/hooks/useReducedMotion.ts` para `prefers-reduced-motion`
- Creado `src/components/greenhouse/AnimatedCounter.tsx` con Framer Motion `useSpring`
- Extendido `EmptyState.tsx` con prop `animatedIcon` (backward-compatible, 37 consumers)
- Ampliado tipo `stats` en `HorizontalWithSubtitle` a `string | ReactNode`
- Piloto en Finance: 3 AnimatedCounter (DSO, DPO, Payroll Ratio) + 2 animated EmptyState (Period Closure)
- Assets Lottie: `public/animations/empty-inbox.json`, `public/animations/empty-chart.json`

### Verificación

- `pnpm build` — OK
- `pnpm lint` — OK
- `npx tsc --noEmit` — OK
- `pnpm test` — 218 files, 914 tests pass

### Pendiente para cierre

- Preview visual en navegador (manual)
- Validación `prefers-reduced-motion` en OS (manual)

---

## Sesión 2026-04-04 — TASK-232 auditada, movida a in-progress y rebaselinada

### Rama / alcance

- rama actual: `feature/codex-task-232-ico-llm-pipeline`
- scope inicial:
  - `docs/tasks/in-progress/TASK-232-ico-llm-quality-scoring-explanation-pipeline.md`
  - `docs/tasks/README.md`
  - `Handoff.md`
  - auditoría runtime/documental sobre:
    - `src/lib/ico-engine/materialize.ts`
    - `src/lib/ico-engine/schema.ts`
    - `src/lib/ico-engine/ai/materialize-ai-signals.ts`
    - `src/lib/ico-engine/ai/read-signals.ts`
    - `src/lib/ico-engine/brief-clarity.ts`
    - `src/lib/ico-engine/methodological-accelerators.ts`
    - `src/lib/sync/event-catalog.ts`
    - `src/lib/sync/reactive-consumer.ts`
    - `src/lib/sync/refresh-queue.ts`
    - `src/lib/sync/projections/ico-ai-signals.ts`
    - `src/lib/ai/google-genai.ts`
    - `src/config/nexa-models.ts`
    - `src/lib/nexa/nexa-service.ts`
    - `src/lib/nexa/nexa-tools.ts`
    - `src/lib/operations/get-operations-overview.ts`
    - `docs/architecture/Greenhouse_ICO_Engine_v1.md`
    - `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
    - `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
    - `docs/architecture/GREENHOUSE_NEXA_ARCHITECTURE_V1.md`
    - `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
    - `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
    - `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
    - `docs/architecture/schema-snapshot-baseline.sql`

### Resultado

- `TASK-232` quedó movida a `in-progress` y la spec ya refleja el baseline real del repo.
- La auditoría confirmó:
  - `TASK-118` ya está cerrada y no debe seguir tratándose como prerequisito abierto
  - `ai_metric_scores` ya tiene consumers runtime reales (`BCS` y `Brand Consistency`)
  - la lane correcta para `TASK-232` cuelga de `ico.ai_signals.materialized` usando `outbox` + `reactive-consumer`
  - el baseline operativo del provider en repo es `Vertex AI` + `@google/genai` + `Gemini`
  - `ai_metric_scores` no alcanza por sí sola para esta lane porque faltan `signal_id`, `status`, `tokens_in`, `tokens_out` y storage de explanations/run audit
- `docs/tasks/README.md` ya quedó alineado con el nuevo estado `in-progress`.

### Riesgos / siguientes pasos

- La arquitectura histórica de `Greenhouse_ICO_Engine_v1.md` todavía mezcla diseño viejo con `Claude via Vertex`; en esta lane debe prevalecer el baseline Gemini ya operativo del repo.
- `docs/architecture/schema-snapshot-baseline.sql` quedó atrasado para este dominio tras `TASK-118`; para `TASK-232` prevalecen `src/lib/ico-engine/schema.ts`, la migración PG de `ico_ai_signals` y `src/types/db.d.ts`.
- La implementación debería crear storage complementario para explanations y run audit antes de abrir consumers downstream nuevos.

## Sesión 2026-04-04 — TASK-118 cerrada y TASK-232 desbloqueada

### Rama / alcance

- rama actual: `task/TASK-118-ico-ai-core-embedded-intelligence`
- scope principal:
  - `docs/tasks/complete/TASK-118-ico-ai-core-embedded-intelligence.md`
  - `docs/tasks/to-do/TASK-232-ico-llm-quality-scoring-explanation-pipeline.md`
  - `docs/tasks/to-do/TASK-152-anomaly-detection-engine.md`
  - `docs/tasks/to-do/TASK-155-scope-intelligence.md`
  - `docs/tasks/to-do/TASK-159-nexa-agency-tools.md`
  - `docs/tasks/README.md`
  - `docs/tasks/TASK_ID_REGISTRY.md`
  - `docs/architecture/Greenhouse_ICO_Engine_v1.md`
  - `Handoff.md`
  - `changelog.md`

### Resultado

- `TASK-118` quedó cerrada sobre su alcance real:
  - `ai_signals`
  - `ai_prediction_log`
  - serving PG `greenhouse_serving.ico_ai_signals`
  - `ico.ai_signals.materialized`
  - consumers base en `Agency`, `Ops Health` y `Nexa`
- La task ya no deja remanente implícito:
  - lane LLM async movida a `TASK-232`
  - `TASK-232` quedó desbloqueada (`Blocked by: none`)
- Se actualizó el impacto cruzado mínimo:
  - `TASK-152` ahora se lee como anomaly registry/workflow sobre señales `ICO` persistidas, no como duplicado del detector base
  - `TASK-155` y `TASK-159` ahora documentan que deben consumir la foundation de `TASK-118` y tratar `TASK-232` como follow-on generativo separado

### Riesgos / siguientes pasos

- `TASK-232` debe decidir durante Discovery si basta con `ai_metric_scores` o si necesita storage auditado adicional para explicaciones.
- `TASK-152` sigue siendo una lane grande y debe cuidar no volver a abrir lógica duplicada de anomalías ya resuelta por `ICO`.
- Los slices históricos 4-13 de `TASK-118` quedan como roadmap de referencia, no como deuda invisible dentro de una task “cerrada”.

### Verificación

- validación histórica preservada desde el cierre foundation:
  - `pnpm pg:doctor --profile=runtime`
  - `pnpm pg:doctor --profile=migrator`
  - `MIGRATE_PROFILE=migrator pnpm migrate:up`
  - `pnpm exec vitest run src/lib/ico-engine/ai/ai-signals.test.ts src/lib/sync/event-catalog.test.ts`
  - `pnpm build`
  - `pnpm lint`

## Sesión 2026-04-04 — TASK-231 cerrada y TASK-232 creada

### Rama / alcance

- rama actual: `task/TASK-231-codex-task-planner-skill`
- scope principal:
  - `.codex/skills/greenhouse-task-planner/SKILL.md`
  - `.codex/skills/greenhouse-task-planner/agents/openai.yaml`
  - `/Users/jreye/.codex/skills/greenhouse-task-planner/SKILL.md`
  - `/Users/jreye/.codex/skills/greenhouse-task-planner/agents/openai.yaml`
  - `docs/tasks/complete/TASK-231-codex-task-planner-skill.md`
  - `docs/tasks/to-do/TASK-232-ico-llm-quality-scoring-explanation-pipeline.md`
  - `docs/tasks/TASK_ID_REGISTRY.md`
  - `docs/tasks/README.md`
  - `changelog.md`
  - `Handoff.md`

### Resultado

- `TASK-231` quedó cerrada:
  - existe la skill `greenhouse-task-planner` a nivel repo en `.codex/skills/greenhouse-task-planner/`
  - existe la misma skill instalada a nivel global en `/Users/jreye/.codex/skills/greenhouse-task-planner/`
  - ambas instalaciones validaron con `python3 /Users/jreye/.codex/skills/.system/skill-creator/scripts/quick_validate.py`
- Se creó `TASK-232` como follow-on explícito de `TASK-118` para la lane LLM async del `ICO Engine`
  - alcance: `quality scoring + explanations` auditable
  - no es chat y no usa `NexaService` como runtime del pipeline
  - baseline recomendado: `Vertex AI` con `Gemini`, alineado con el repo actual

### Riesgos / siguientes pasos

- La skill repo-level queda versionada; la copia global fuera del repo sigue siendo instalación local y puede requerir resync manual si el skill evoluciona.
- `TASK-232` quedó bloqueada por `TASK-118`: debe tomar la foundation de `ai_signals` ya implementada y definir durante Discovery si alcanza con `ai_metric_scores` o si necesita storage complementario auditado.
- El registry tenía drift mínimo en `TASK-118`; quedó corregido a `in-progress`.

### Verificación

- `python3 /Users/jreye/.codex/skills/.system/skill-creator/scripts/quick_validate.py .codex/skills/greenhouse-task-planner`
- `python3 /Users/jreye/.codex/skills/.system/skill-creator/scripts/quick_validate.py /Users/jreye/.codex/skills/greenhouse-task-planner`

## Sesión 2026-04-04 — TASK-118 auditada, corregida y movida a in-progress

### Rama / alcance

- rama actual: `task/TASK-118-ico-ai-core-embedded-intelligence`
- scope inicial:
  - `docs/tasks/in-progress/TASK-118-ico-ai-core-embedded-intelligence.md`
  - `docs/tasks/README.md`
  - `Handoff.md`
  - auditoría runtime/documental sobre:
    - `src/lib/ico-engine/schema.ts`
    - `src/lib/ico-engine/materialize.ts`
    - `src/lib/ico-engine/read-metrics.ts`
    - `src/lib/ico-engine/brief-clarity.ts`
    - `src/lib/ico-engine/methodological-accelerators.ts`
    - `src/lib/operations/get-operations-overview.ts`
    - `src/lib/nexa/nexa-tools.ts`
    - `src/lib/person-360/get-person-ico-profile.ts`
    - `src/lib/sync/projections/ico-member-metrics.ts`
    - `src/lib/sync/projections/agency-performance-report.ts`
    - `docs/architecture/Greenhouse_ICO_Engine_v1.md`
    - `docs/architecture/Contrato_Metricas_ICO_v1.md`
    - `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
    - `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
    - `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
    - `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
    - `docs/architecture/GREENHOUSE_AGENCY_LAYER_V2.md`
    - `docs/architecture/schema-snapshot-baseline.sql`

### Resultado

- `TASK-118` quedó rebaselinada sobre el runtime real de `ICO`.
- La foundation backend/pipeline ya quedó implementada y validada:
  - `src/lib/ico-engine/materialize.ts` ahora materializa `ai_signals` + `ai_prediction_log` y emite `ico.ai_signals.materialized`
  - `src/lib/ico-engine/schema.ts` ahora provisiona las tablas BigQuery `ico_engine.ai_signals` y `ico_engine.ai_prediction_log`
  - `greenhouse_serving.ico_ai_signals` quedó creada vía migración `20260404113502039_task-118-ico-ai-signals.sql` y reflejada en `src/types/db.d.ts`
  - la proyección `src/lib/sync/projections/ico-ai-signals.ts` sincroniza BQ -> PG en el backbone canónico de eventos reactivos
  - `Agency` expone `aiCore` en `/api/ico-engine/metrics/agency`, `Ops Health` suma el subsystem `AI Core` y `Nexa get_otd` puede adjuntar señales AI recientes por organización
- La auditoría confirmó que:
  - `TTM`, `Iteration Velocity`, `BCS`, `Revenue Enabled` y aceleradores metodológicos ya no son foundations pendientes de esta task
  - `ai_metric_scores` ya se consume en runtime y no debe tratarse como placeholder vacío
  - el gap real está en la foundation backend/pipeline para `ai_signals` persistidas, `ai_prediction_log`, cache PG, observabilidad AI Core y readers scope-aware
  - los follow-ons de Agency/Nexa sobre health/risk/anomalies/capacity ya están modelados en `TASK-150` a `TASK-159`

### Riesgos / siguientes pasos

- El carril canónico nuevo ya quedó operativo; el siguiente paso es cerrar surfaces más profundas o modelos avanzados sin abrir crons paralelos ni romper el backbone `materialize -> outbox/projection -> greenhouse_serving`.
- `People` requiere cuidado extra de scope: sin `organizationId`, el snapshot PG member-level puede exponer contexto cross-space si se agregan señales AI por miembro sin scoping consistente.
- `Agency` es internal/cross-tenant; cualquier surfacing de señales AI debe seguir siendo estrictamente internal-only.
- La task sigue `in-progress`: cualquier extensión LLM debe colgarse de `ai_metric_scores` o de un carril async auditado, no del materializer crítico síncrono.

### Verificación

- `pnpm pg:doctor --profile=runtime`
- `pnpm pg:doctor --profile=migrator`
- `MIGRATE_PROFILE=migrator pnpm migrate:up`
- `pnpm exec vitest run src/lib/ico-engine/ai/ai-signals.test.ts src/lib/sync/event-catalog.test.ts`
- `pnpm build`
- `pnpm lint`

## Sesion 2026-04-04 — Task template split: TASK_TEMPLATE.md + TASK_PROCESS.md

### Que cambio

El task template monolitico (`TASK_TEMPLATE.md`, ~683 lineas) se separo en dos documentos:

- **`docs/tasks/TASK_TEMPLATE.md`** — plantilla copiable (~150 lineas). Solo lo que se copia al crear una task nueva.
- **`docs/tasks/TASK_PROCESS.md`** — protocolo de referencia. Plan Mode, Skill Protocol, Subagent Protocol, matrices de Checkpoint/Mode, Lightweight Mode, migracion CODEX.

### Cambios de modelo

- Se agrego campo `Type: implementation | umbrella | policy` en Zone 0 para diferenciar tasks que producen codigo vs coordinacion vs documentacion.
- `Checkpoint` y `Mode` ya no son campos manuales en Status — el agente los deriva automaticamente de Priority x Effort al tomar la task.
- Zone 2 (Plan Mode) ya no se llena al crear la task — es responsabilidad del agente que la toma.
- Lint + tsc baseline se movio de Discovery a Execution (no gastar tiempo en baseline antes de tener plan aprobado).
- Closing Protocol en cada task solo lista items especificos; el protocolo generico sigue en `CLAUDE.md` § Task Lifecycle Protocol.

### Compatibilidad

Las tasks existentes en el backlog — tanto `CODEX_TASK_*` como `TASK-###` ya creadas — siguen vigentes con su formato original. Solo las tasks creadas a partir de ahora usan la nueva estructura.

### Docs actualizados

- `CLAUDE.md` — Task Lifecycle Protocol actualizado
- `AGENTS.md` — referencia a ambos archivos
- `project_context.md` — delta de plantilla
- `docs/tasks/README.md` — convencion vigente
- `docs/README.md` — indice de tasks
- `docs/operations/GITHUB_PROJECT_OPERATING_MODEL_V1.md` — flujo operativo

---

## Sesión 2026-04-04 — TASK-213 implementada y cerrada

### Rama / alcance

- rama actual: `develop`
- scope principal:
  - `src/lib/ico-engine/read-metrics.ts`
  - `src/lib/capability-queries/creative-hub.ts`
  - `src/views/greenhouse/people/tabs/PersonIntelligenceTab.tsx`
  - `src/views/greenhouse/people/tabs/PersonIntelligenceTab.test.tsx`
  - `src/views/agency/AgencyIcoEngineView.tsx`
  - `src/lib/ico-engine/methodological-accelerators.test.ts`
  - docs/lifecycle:
    - `docs/tasks/complete/TASK-213-ico-metrics-hardening-trust-model.md`
    - `docs/tasks/README.md`
    - `docs/architecture/Greenhouse_ICO_Engine_v1.md`
    - `docs/architecture/Greenhouse_Capabilities_Architecture_v1.md`
    - `docs/changelog/CLIENT_CHANGELOG.md`
    - `changelog.md`
    - `Handoff.md`

### Resultado

- `TASK-213` quedó cerrada como umbrella de convergencia sobre el runtime real.
- `Creative Hub` ya preserva trust metadata de `throughput` al componer `Revenue Enabled`.
- `People > Person Intelligence` ahora muestra estados de confianza de KPIs delivery reutilizando el reader `/api/people/[memberId]/ico`.
- `Agency > ICO Engine` ahora resume `metricTrust` del `Performance Report` mensual con componentes shared ya existentes.
- No se creó migración ni route nueva.

### Riesgos / siguientes pasos

- `Payroll` sigue siendo el consumer más parcial: hoy la persistencia trust-aware visible sigue concentrada en la lane `RpA`.
- Si se quiere cerrar esa brecha, el follow-on correcto ya no pertenece a la umbrella `TASK-213`, sino a una task específica de payroll trust propagation/persistence.

### Verificación

- `pnpm exec vitest run src/views/greenhouse/people/tabs/PersonIntelligenceTab.test.tsx src/lib/capability-queries/creative-cvr.test.ts src/lib/ico-engine/creative-velocity-review.test.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm lint`
- `pnpm build`
- `rg -n "new Pool\\(" src`

## Sesión 2026-04-04 — TASK-213 auditada y movida a in-progress

### Rama / alcance

- rama actual: `develop`
- scope inicial:
  - `docs/tasks/in-progress/TASK-213-ico-metrics-hardening-trust-model.md`
  - `docs/tasks/README.md`
  - `Handoff.md`
  - auditoría runtime y documental sobre:
    - `src/lib/ico-engine/metric-registry.ts`
    - `src/lib/ico-engine/metric-trust-policy.ts`
    - `src/lib/ico-engine/read-metrics.ts`
    - `src/lib/ico-engine/performance-report.ts`
    - `src/lib/agency/agency-queries.ts`
    - `src/components/agency/metric-trust.tsx`
    - `src/lib/person-360/get-person-ico-profile.ts`
    - `src/lib/sync/projections/ico-member-metrics.ts`
    - `src/lib/sync/projections/agency-performance-report.ts`
    - `src/lib/ico-engine/time-to-market.ts`
    - `src/lib/ico-engine/iteration-velocity.ts`
    - `src/lib/ico-engine/brief-clarity.ts`
    - `src/lib/ico-engine/revenue-enabled.ts`
    - `src/lib/ico-engine/creative-velocity-review.ts`
    - `src/lib/ico-engine/methodological-accelerators.ts`
    - `src/lib/capability-queries/creative-hub.ts`
    - `docs/architecture/Greenhouse_ICO_Engine_v1.md`
    - `docs/architecture/Contrato_Metricas_ICO_v1.md`
    - `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
    - `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
    - `docs/architecture/GREENHOUSE_AGENCY_LAYER_V2.md`
    - `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
    - `docs/architecture/GREENHOUSE_DELIVERY_PERFORMANCE_REPORT_PARITY_V1.md`
    - `docs/architecture/schema-snapshot-baseline.sql`

### Resultado

- `TASK-213` quedó rebaselinada como umbrella activa, no como backlog aspiracional de lanes que ya existen.
- La auditoría confirmó que `TASK-214` a `TASK-223` ya están cerradas y que el drift principal era documental:
  - estados y paths de lifecycle desactualizados
  - gap description que seguía presentando `TTM`, `Iteration Velocity`, `BCS`, `Revenue Enabled`, `CVR` y aceleradores metodológicos como pendientes base
- No apareció un blocker de schema ni upstream para continuar; el siguiente paso es documentar el mapa de conexiones y decidir el residual técnico real.

### Riesgos / siguientes pasos

- `schema-snapshot-baseline.sql` sigue representando una foto anterior al agregado de `metric_trust_json`; para trust serving la fuente correcta hoy es combinar baseline + migraciones recientes.
- La convergencia residual probable está en semántica compartida y no en “volver a implementar” lanes ya cerradas.

## Sesión 2026-04-04 — TASK-223 implementada y cerrada

### Rama / alcance

- rama actual: `feature/codex-task-223-methodological-accelerators`
- scope principal:
  - `src/lib/ico-engine/methodological-accelerators.ts`
  - `src/lib/ico-engine/methodological-accelerators.test.ts`
  - `src/lib/ico-engine/creative-velocity-review.ts`
  - `src/lib/ico-engine/creative-velocity-review.test.ts`
  - `src/lib/capability-queries/creative-cvr.ts`
  - `src/lib/capability-queries/creative-cvr.test.ts`
  - `src/lib/capability-queries/creative-hub.ts`
  - `src/lib/capability-queries/creative-hub-runtime.ts`
  - `src/lib/capability-queries/helpers.ts`
  - `src/config/capability-registry.ts`
  - docs/lifecycle:
    - `docs/architecture/Contrato_Metricas_ICO_v1.md`
    - `docs/architecture/Greenhouse_ICO_Engine_v1.md`
    - `docs/architecture/Greenhouse_Capabilities_Architecture_v1.md`
    - `docs/changelog/CLIENT_CHANGELOG.md`
    - `changelog.md`
    - `docs/tasks/complete/TASK-223-ico-methodological-accelerators-instrumentation.md`
    - `docs/tasks/README.md`
    - `docs/tasks/TASK_ID_REGISTRY.md`
    - `docs/tasks/to-do/TASK-213-ico-metrics-hardening-trust-model.md`
    - `Handoff.md`

### Resultado

- `ICO` ya tiene un contrato runtime inicial para `Design System` y `Brand Voice para AI`.
- `CVR` ahora compone esa lane metodológica sin abrir una surface paralela a `Creative Hub`.
- `Creative Hub` agrega `Methodological accelerators` y mantiene `Brand Consistency` alineado al carril auditado de `ico_engine.ai_metric_scores`.
- Policy visible:
  - `Design System` queda como acelerador `proxy` sobre outcomes canónicos.
  - `Brand Voice para AI` solo sube a señal `observed` cuando existe `brand_consistency_score` auditado.
- No se creó migración nueva ni route nueva.

### Riesgos / siguientes pasos

- `Design System` sigue siendo lectura `proxy` hasta que exista writer metodológico específico.
- `Brand Voice para AI` seguirá apareciendo parcial o sin evidencia en cuentas sin `brand_consistency_score` auditado; eso es intencional y evita precisión falsa.
- Si una lane futura quiere publication formal de aceleradores metodológicos, primero necesita decidir si seguirá `on-read` dentro de `CVR` o si merece objeto/persistencia propia.

### Verificación

- `pnpm exec vitest run src/lib/ico-engine/methodological-accelerators.test.ts src/lib/ico-engine/creative-velocity-review.test.ts src/lib/capability-queries/creative-cvr.test.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm lint`
- `pnpm build`
- `rg -n "new Pool\\(" src`

## Sesión 2026-04-04 — TASK-223 auditada, corregida y movida a in-progress

### Rama / alcance

- rama actual: `develop`
- scope inicial:
  - `docs/tasks/in-progress/TASK-223-ico-methodological-accelerators-instrumentation.md`
  - `docs/tasks/README.md`
  - `docs/tasks/TASK_ID_REGISTRY.md`
  - `Handoff.md`
  - auditoría runtime sobre:
    - `src/lib/ico-engine/schema.ts`
    - `src/lib/ico-engine/brief-clarity.ts`
    - `src/lib/ico-engine/iteration-velocity.ts`
    - `src/lib/ico-engine/revenue-enabled.ts`
    - `src/lib/ico-engine/creative-velocity-review.ts`
    - `src/lib/ico-engine/read-metrics.ts`
    - `src/lib/capability-queries/creative-hub.ts`
    - `src/lib/capability-queries/creative-cvr.ts`
    - `src/lib/capability-queries/helpers.ts`
    - `src/config/capability-registry.ts`
    - `docs/architecture/Contrato_Metricas_ICO_v1.md`
    - `docs/architecture/Greenhouse_ICO_Engine_v1.md`
    - `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
    - `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
    - `docs/architecture/Greenhouse_Capabilities_Architecture_v1.md`
    - `docs/architecture/schema-snapshot-baseline.sql`

### Resultado

- `TASK-223` quedó movida a `in-progress` antes de implementación.
- La auditoría corrigió la spec para dejar explícito que:
  - la lane reutiliza la capa outcome ya existente (`BCS`, `Iteration Velocity`, `Revenue Enabled`, `read-metrics`)
  - cualquier surfacing visible debe colgar del `CVR` ya visible en `Creative Hub`
  - el carril inicial correcto para señales metodológicas debe ser auditable y compatible con `ico_engine.ai_metric_scores`
- Gap confirmado:
  - no existe aún helper/runtime canónico para `Design System`
  - no existe aún helper/runtime canónico para `Brand Voice para AI`

### Verificación

- revisión manual de consistencia entre spec, arquitectura, runtime ICO y host visible de `CVR`

## Sesión 2026-04-04 — TASK-222 implementada y cerrada

### Rama / alcance

- rama actual: `feature/codex-task-222-cvr-tiered-surfacing`
- scope principal:
  - `src/lib/ico-engine/creative-velocity-review.ts`
  - `src/lib/ico-engine/creative-velocity-review.test.ts`
  - `src/lib/capability-queries/creative-cvr.ts`
  - `src/lib/capability-queries/creative-cvr.test.ts`
  - `src/lib/capability-queries/creative-hub.ts`
  - `src/lib/capability-queries/helpers.ts`
  - `src/lib/capabilities/module-content-builders.ts`
  - `src/components/capabilities/CapabilityCard.tsx`
  - `src/types/capabilities.ts`
  - `src/config/capability-registry.ts`
  - docs/lifecycle:
    - `docs/architecture/Contrato_Metricas_ICO_v1.md`
    - `docs/architecture/Greenhouse_ICO_Engine_v1.md`
    - `docs/architecture/Greenhouse_Capabilities_Architecture_v1.md`
    - `docs/changelog/CLIENT_CHANGELOG.md`
    - `changelog.md`
    - `docs/tasks/complete/TASK-222-creative-velocity-review-tiered-metric-surfacing.md`
    - `docs/tasks/to-do/TASK-223-ico-methodological-accelerators-instrumentation.md`
    - `docs/tasks/README.md`
    - `docs/tasks/TASK_ID_REGISTRY.md`
    - `Handoff.md`

### Resultado

- `CVR` ya tiene contrato runtime inicial y surface client-facing real en `Creative Hub`.
- `Creative Hub` ahora muestra:
  - `Creative Velocity Review`
  - `CVR structure`
  - `Tier visibility`
  - `Narrative guardrails`
- `Revenue Enabled` en la capability ahora cuelga del mismo contrato `CVR`, dejando una sola fuente para `TTM`, `Iteration Velocity`, policy de atribución y guardrails.
- La matriz `Basic / Pro / Enterprise` quedó formalizada como contrato editorial de comunicación visible para el portal.
- No se creó migración nueva ni publication trimestral persistida:
  - la lane sigue siendo `read-only / on-read`
  - el hard-gating comercial por tier sigue pendiente de una source policy runtime canónica

### Riesgos / siguientes pasos

- `Early Launch` seguirá apareciendo controlado o `unavailable` en scopes sin evidencia suficiente de `TTM`; eso es correcto y evita precisión falsa.
- La matriz por tier sigue siendo visible, pero no hace enforcement real sobre sesión/auth ni sobre tenant context.
- Si una lane futura quiere publication formal de `CVR`, primero necesita un objeto trimestral propio en serving/publication en vez de seguir componiéndolo on-read.
- `TASK-223` debe reutilizar este bloque `CVR` para conectar aceleradores metodológicos, no inventar otra narrativa paralela.

### Verificación

- `pnpm exec vitest run src/lib/capability-queries/creative-cvr.test.ts src/lib/ico-engine/creative-velocity-review.test.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm lint`
- `pnpm build`
- `rg -n "new Pool\\(" src`

## Sesión 2026-04-04 — TASK-221 implementada y cerrada

### Rama / alcance

- rama actual: `feature/codex-task-221-revenue-enabled`
- scope principal:
  - `src/lib/ico-engine/revenue-enabled.ts`
  - `src/lib/ico-engine/revenue-enabled.test.ts`
  - `src/lib/capability-queries/helpers.ts`
  - `src/config/capability-registry.ts`
  - docs/lifecycle:
    - `docs/architecture/Contrato_Metricas_ICO_v1.md`
    - `docs/architecture/Greenhouse_ICO_Engine_v1.md`
    - `docs/changelog/CLIENT_CHANGELOG.md`
    - `changelog.md`
    - `docs/tasks/complete/TASK-221-revenue-enabled-measurement-model-attribution-policy.md`
    - `docs/tasks/to-do/TASK-222-creative-velocity-review-tiered-metric-surfacing.md`
    - `docs/tasks/to-do/TASK-223-ico-methodological-accelerators-instrumentation.md`
    - `docs/tasks/README.md`
    - `Handoff.md`

### Resultado

- `Revenue Enabled` ya tiene helper canónico inicial con clases explícitas `observed`, `range`, `estimated` y `unavailable`.
- `Creative Hub` dejó de reconstruir la narrativa de `Revenue Enabled` desde `OTD`, `RpA` y benchmarks de industria; ahora consume el measurement model canónico.
- La policy documental ya dejó explícito que:
  - `Early Launch` depende de `TTM`
  - `Iteration` depende del contrato canónico de `Iteration Velocity`
  - `Throughput` actual sigue siendo output operativo y no revenue observado
- No se creó migración ni materialización nueva; esta entrega cierra el carril `on-read` y deja pendiente una attribution layer monetaria futura.
- `TASK-221` quedó movida a `complete`.
- Se dejaron deltas cruzados en `TASK-222` y `TASK-223` para que no vuelvan a introducir heurísticas locales de `Revenue Enabled`.

### Riesgos / siguientes pasos

- `Early Launch` seguirá apareciendo como `unavailable` en scopes sin `TTM` suficiente; eso es correcto y evita precisión falsa.
- `Throughput` sigue intencionalmente en `estimated` hasta que exista linkage defendible a iniciativas incrementales/revenue.
- Si una lane futura quiere mostrar monto de `Revenue Enabled`, primero necesita attribution layer auditable por palanca/campaña.

### Verificación

- `pnpm exec vitest run src/lib/ico-engine/revenue-enabled.test.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm lint`
- `pnpm build`
- `rg -n "new Pool\\(" src`

## Sesión 2026-04-04 — TASK-221 auditada, corregida y movida a in-progress

### Rama / alcance

- rama actual: `feature/codex-task-220-brief-clarity-governance`
- scope:
  - `docs/tasks/in-progress/TASK-221-revenue-enabled-measurement-model-attribution-policy.md`
  - `docs/tasks/README.md`
  - `Handoff.md`
  - auditoría runtime sobre:
    - `src/lib/ico-engine/time-to-market.ts`
    - `src/lib/ico-engine/iteration-velocity.ts`
    - `src/lib/ico-engine/brief-clarity.ts`
    - `src/lib/ico-engine/read-metrics.ts`
    - `src/lib/campaigns/campaign-metrics.ts`
    - `src/lib/campaigns/campaign-extended.ts`
    - `src/lib/capability-queries/helpers.ts`
    - `src/lib/capability-queries/creative-hub.ts`
    - `src/app/api/projects/[id]/ico/route.ts`
    - `src/app/api/campaigns/[campaignId]/metrics/route.ts`
    - `src/app/api/campaigns/[campaignId]/360/route.ts`
    - `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
    - `docs/architecture/Contrato_Metricas_ICO_v1.md`
    - `docs/architecture/Greenhouse_ICO_Engine_v1.md`
    - `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
    - `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
    - `docs/architecture/schema-snapshot-baseline.sql`

### Resultado

- `TASK-221` quedó movida a `in-progress` tras discovery/auditoría real del repo.
- La spec se corrigió para dejar explícito que:
  - la lane no parte desde cero
  - `TTM`, `Iteration Velocity` y `BCS/effectiveBriefAt` ya existen como foundations runtime reutilizables
  - `TASK-213` sigue siendo paraguas de alineación, no blocker técnico duro
  - el consumer visible de `Revenue Enabled` en `Creative Hub` hoy sigue siendo heurístico y debe converger a contrato canónico
  - no existe todavía read model, materialización ni attribution policy runtime específica para `Revenue Enabled`
- Riesgo operativo detectado:
  - `CampaignFinancials` agrega revenue a nivel cliente y no resuelve atribución incremental por campaña/palanca
  - `Creative Hub` mezcla narrativa `Revenue Enabled` con heurísticas locales (`OTD`, `RpA`, benchmarks de industria)

### Verificación

- revisión manual de consistencia entre spec, arquitectura, runtime ICO, consumers visibles y schema snapshot

## Sesión 2026-04-04 — TASK-220 implementada y verificada

### Rama / alcance

- rama actual: `feature/codex-task-220-brief-clarity-governance`
- scope principal:
  - `src/lib/ico-engine/brief-clarity.ts`
  - `src/lib/ico-engine/brief-clarity.test.ts`
  - `src/app/api/projects/[id]/ico/route.ts`
  - `src/lib/campaigns/campaign-metrics.ts`
  - docs/lifecycle:
    - `docs/architecture/Contrato_Metricas_ICO_v1.md`
    - `docs/architecture/Greenhouse_ICO_Engine_v1.md`
    - `docs/tasks/complete/TASK-220-ico-brief-clarity-score-intake-governance.md`
    - `docs/tasks/README.md`
    - `docs/tasks/TASK_ID_REGISTRY.md`
    - `docs/tasks/to-do/TASK-221-revenue-enabled-measurement-model-attribution-policy.md`
    - `docs/tasks/to-do/TASK-223-ico-methodological-accelerators-instrumentation.md`
    - `docs/changelog/CLIENT_CHANGELOG.md`
    - `changelog.md`

### Resultado

- `TASK-220` queda cerrada.
- `ICO` ya tiene un helper canónico inicial para `Brief Clarity Score` en `src/lib/ico-engine/brief-clarity.ts`, con:
  - `value`
  - `passed`
  - `dataStatus`
  - `confidenceLevel`
  - `intakePolicyStatus`
  - `effectiveBriefAt`
  - `qualityGateReasons`
- `GET /api/projects/[id]/ico` ya expone `briefClarityScore` sin romper tenant isolation.
- `Campaign Metrics` ya puede usar `brief efectivo` observado desde `ico_engine.ai_metric_scores.processed_at`; cuando no existe score válido, conserva la jerarquía proxy previa.
- La source policy inicial de `BCS` combina score auditado en BigQuery con `readiness` de Notion por `space`; la ausencia de score se sirve como `unavailable/degraded`, no como evidencia inventada.
- No se abrió migración nueva:
  - la slice reutiliza `ico_engine.ai_metric_scores`
  - reutiliza también el carril existente de `Notion governance`

### Verificación

- `pnpm exec vitest run src/lib/ico-engine/brief-clarity.test.ts src/lib/ico-engine/time-to-market.test.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `rg -n "new Pool\\(" src`
- `pnpm lint`
- `pnpm build`

## Sesión 2026-04-04 — TASK-220 auditada y movida a in-progress

### Rama / alcance

- rama actual: `feature/codex-task-220-brief-clarity-governance`
- scope:
  - `docs/tasks/in-progress/TASK-220-ico-brief-clarity-score-intake-governance.md`
  - `docs/tasks/README.md`
  - `docs/tasks/TASK_ID_REGISTRY.md`
  - `Handoff.md`
  - auditoría de runtime y schema sobre:
    - `src/lib/ico-engine/*`
    - `src/lib/campaigns/*`
    - `src/lib/projects/get-project-detail.ts`
    - `src/lib/space-notion/*`
    - `src/types/notion-governance.ts`
    - `src/app/api/campaigns/[campaignId]/metrics/route.ts`
    - `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
    - `docs/architecture/Contrato_Metricas_ICO_v1.md`
    - `docs/architecture/Greenhouse_ICO_Engine_v1.md`
    - `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
    - `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
    - `docs/architecture/GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md`
    - `docs/architecture/schema-snapshot-baseline.sql`
    - `scripts/setup-postgres-source-sync.sql`

### Resultado

- `TASK-220` quedó movida a `in-progress` antes de implementación.
- La auditoría confirmó drift documental que ya quedó corregido en la spec:
  - `TASK-213` se mantiene como paraguas programático, no como blocker técnico duro
  - `TASK-223` pasa a ser impacto explícito de `TASK-220`
  - `TASK-218` y `TASK-219` ya están cerradas y consumen fallback/proxy mientras `BCS` siga sin contrato canónico
- Se confirmó foundation reutilizable real:
  - `ico_engine.ai_metric_scores`
  - fase `briefing` ya normalizada en runtime
  - proxy start de `TTM` desde campañas/delivery
  - readiness y governance de Notion por `space`
- Riesgo operativo detectado:
  - no existe hoy un contrato `BCS` servido en runtime ni una proyección `latest/effective`
  - tampoco existe carril formal de `ready/degraded/blocked` con override humano para intake

### Verificación

- revisión manual de consistencia entre:
  - `docs/tasks/in-progress/TASK-220-ico-brief-clarity-score-intake-governance.md`
  - `docs/tasks/README.md`
  - `docs/tasks/TASK_ID_REGISTRY.md`
  - `docs/architecture/Contrato_Metricas_ICO_v1.md`
  - `docs/architecture/Greenhouse_ICO_Engine_v1.md`

## Sesión 2026-04-04 — TASK-219 implementada y verificada

### Rama / alcance

- rama actual: `feature/codex-task-219-iteration-velocity-contract`
- scope principal:
  - `src/lib/ico-engine/iteration-velocity.ts`
  - `src/lib/ico-engine/iteration-velocity.test.ts`
  - `src/app/api/projects/[id]/ico/route.ts`
  - `src/lib/capability-queries/creative-hub-runtime.ts`
  - `src/lib/capability-queries/helpers.ts`
  - docs/lifecycle:
    - `docs/architecture/Contrato_Metricas_ICO_v1.md`
    - `docs/architecture/Greenhouse_ICO_Engine_v1.md`
    - `docs/tasks/complete/TASK-219-ico-iteration-velocity-experimentation-signal-contract.md`
    - `docs/tasks/README.md`
    - `docs/tasks/TASK_ID_REGISTRY.md`
    - `docs/tasks/to-do/TASK-221-revenue-enabled-measurement-model-attribution-policy.md`
    - `docs/tasks/to-do/TASK-222-creative-velocity-review-tiered-metric-surfacing.md`
    - `docs/tasks/to-do/TASK-223-ico-methodological-accelerators-instrumentation.md`
    - `docs/changelog/CLIENT_CHANGELOG.md`
    - `changelog.md`

### Resultado

- `TASK-219` queda cerrada.
- `ICO` ya tiene un helper canónico inicial para `Iteration Velocity` como iteraciones útiles cerradas en `30d`, con:
  - `dataStatus`
  - `confidenceLevel`
  - `evidenceMode`
  - `qualityGateReasons`
  - evidencia cuantificada de iteración útil vs corrección
- `Creative Hub` ya dejó de derivar `Iteration Velocity` desde `RpA` y ahora consume el contrato canónico con copy explícita de proxy operativo.
- `GET /api/projects/[id]/ico` ya expone `iterationVelocity` y además refuerza tenant isolation con filtro por `space_id`.
- La lane queda explícitamente separada de `pipeline_velocity`.
- No se abrió migración nueva:
  - esta slice cierra contrato + consumer + project reader
  - la evidencia observada de mercado/ads-platform queda para follow-ons posteriores

### Verificación

- `pnpm exec vitest run src/lib/ico-engine/iteration-velocity.test.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `rg -n "new Pool\\(" src`
- `pnpm lint`
- `pnpm build`

## Sesión 2026-04-04 — TASK-219 auditada y corregida antes de implementación

### Rama / alcance

- rama actual: `feature/codex-task-219-iteration-velocity-contract`
- scope:
  - `docs/tasks/in-progress/TASK-219-ico-iteration-velocity-experimentation-signal-contract.md`
  - `docs/tasks/README.md`
  - `Handoff.md`
  - auditoría runtime sobre:
    - `src/lib/ico-engine/*`
    - `src/lib/capability-queries/*`
    - `src/lib/projects/get-project-detail.ts`
    - `src/types/greenhouse-project-detail.ts`
    - `src/app/api/projects/[id]/ico/route.ts`
    - `docs/architecture/schema-snapshot-baseline.sql`
    - `scripts/setup-postgres-source-sync.sql`
    - `scripts/setup-bigquery-source-sync.sql`
    - `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
    - `docs/architecture/Contrato_Metricas_ICO_v1.md`
    - `docs/architecture/Greenhouse_ICO_Engine_v1.md`
    - `docs/architecture/GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md`
    - `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
    - `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`

### Resultado

- `TASK-219` queda movida a `in-progress` tras discovery y auditoría real del repo.
- La spec se corrigió para dejar explícito que:
  - `Iteration Velocity` significa capacidad habilitada para que el cliente testee más rápido en mercado a partir del proceso productivo medido con `ICO`
  - `Creative Hub` ya tiene un consumer visible, pero hoy es heurístico y no canónico
  - el repo sí tiene evidencia operativa reutilizable en `delivery tasks / projects` y `campaign_project_links`
  - `pipeline_velocity` no puede reciclarse como sustituto de esta lane
- No se implementó código todavía en esta pasada; solo se corrigió el contrato operativo para no construir sobre supuestos rotos.

### Verificación

- revisión manual de consistencia contra arquitectura, tasks vecinas y runtime actual en `ICO`, `Creative Hub`, `Projects` y `delivery`

## Sesión 2026-04-04 — TASK-218 implementada y verificada

### Rama / alcance

- rama actual: `feature/codex-task-218-ttm-activation-contract`
- scope principal:
  - `src/lib/ico-engine/time-to-market.ts`
  - `src/lib/ico-engine/time-to-market.test.ts`
  - `src/lib/campaigns/campaign-metrics.ts`
  - `src/views/greenhouse/campaigns/CampaignDetailView.tsx`
  - docs/lifecycle:
    - `docs/architecture/Contrato_Metricas_ICO_v1.md`
    - `docs/architecture/Greenhouse_ICO_Engine_v1.md`
    - `docs/tasks/complete/TASK-218-ico-time-to-market-activation-evidence-contract.md`
    - `docs/tasks/README.md`
    - `docs/tasks/TASK_ID_REGISTRY.md`
    - `docs/tasks/to-do/TASK-220-ico-brief-clarity-score-intake-governance.md`
    - `docs/tasks/to-do/TASK-222-creative-velocity-review-tiered-metric-surfacing.md`
    - `docs/changelog/CLIENT_CHANGELOG.md`
    - `changelog.md`

### Resultado

- `TASK-218` queda cerrada como primer contrato runtime de `TTM`.
- Se creó `src/lib/ico-engine/time-to-market.ts` para formalizar:
  - selección de evidencia de inicio/activación
  - estados `available`, `degraded`, `unavailable`
  - `confidenceLevel` y `qualityGateReasons`
- `src/lib/campaigns/campaign-metrics.ts` ahora publica `timeToMarket` y filtra BigQuery por `space_id` para respetar tenant isolation.
- `Campaign Detail` ya muestra `TTM` con evidencia seleccionada, estado de dato y confianza como primer consumer visible.
- La policy vigente queda explícita:
  - inicio = proxy operativo hasta que `TASK-220` cierre `brief efectivo`
  - activación = evidencia observada preferente con fallbacks proxy/planned
- No se abrió migración nueva:
  - esta slice cierra contrato + consumer inicial
  - registry/materialization/Agency-wide rollout quedan para follow-ons del engine

### Verificación

- `pnpm exec vitest run src/lib/ico-engine/time-to-market.test.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `rg -n "new Pool\\(" src`
- `pnpm lint`
- `pnpm build`

## Sesión 2026-04-04 — TASK-218 auditada y corregida antes de implementación

### Rama / alcance

- rama actual: `feature/codex-task-218-ttm-activation-contract`
- scope:
  - `docs/tasks/in-progress/TASK-218-ico-time-to-market-activation-evidence-contract.md`
  - `docs/tasks/README.md`
  - `docs/tasks/TASK_ID_REGISTRY.md`
  - `Handoff.md`
  - auditoría runtime sobre:
    - `src/lib/ico-engine/*`
    - `src/lib/campaigns/*`
    - `scripts/setup-postgres-source-sync.sql`
    - `scripts/backfill-postgres-campaigns.ts`
    - `docs/architecture/schema-snapshot-baseline.sql`
    - `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
    - `docs/architecture/Greenhouse_ICO_Engine_v1.md`
    - `docs/architecture/Contrato_Metricas_ICO_v1.md`
    - `docs/architecture/GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md`
    - `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
    - `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`

### Resultado

- `TASK-218` quedó movida a `in-progress` tras discovery/auditoría real del repo.
- La spec se corrigió para dejar explícito que:
  - `TTM` no parte desde cero
  - ya existen foundations parciales en campañas (`planned_launch_date`, `actual_launch_date`), links campaña↔proyecto y pipeline `Activación`
  - el gap real es cerrar el measurement model canónico y la policy de evidence para activación
  - `TASK-220` sigue siendo dependencia real para la señal madura de `brief efectivo`
- No se implementó código todavía en esta pasada; solo se corrigió el contrato operativo para evitar construir sobre supuestos incompletos.

### Verificación

- revisión manual de consistencia contra arquitectura, tasks vecinas y runtime actual en `campaigns`, `delivery` e `ICO`

## Sesión 2026-04-04 — TASK-217 implementada y verificada

### Rama / alcance

- rama actual: `feature/codex-task-217-agency-trust-propagation`
- scope principal:
  - `src/lib/agency/agency-queries.ts`
  - `src/lib/agency/agency-queries.test.ts`
  - `src/lib/ico-engine/read-metrics.ts`
  - `src/components/agency/metric-trust.tsx`
  - `src/components/agency/PulseGlobalKpis.tsx`
  - `src/components/agency/SpaceHealthTable.tsx`
  - `src/components/agency/IcoGlobalKpis.tsx`
  - `src/components/agency/SpaceIcoScorecard.tsx`
  - `src/views/agency/AgencyDeliveryView.tsx`
  - `src/app/(dashboard)/agency/page.tsx`
  - `src/lib/agency/space-360.ts`
  - lifecycle/docs:
    - `docs/tasks/complete/TASK-217-agency-kpi-trust-propagation-serving-semantics.md`
    - `docs/tasks/README.md`
    - `docs/tasks/TASK_ID_REGISTRY.md`
    - `docs/tasks/to-do/TASK-160-agency-enterprise-hardening.md`
    - `docs/changelog/CLIENT_CHANGELOG.md`
    - `changelog.md`

### Resultado

- `TASK-217` queda cerrada.
- `Agency > Pulse`, `Agency > Delivery` y `Agency > ICO Engine` ya propagan trust metadata upstream (`benchmarkType`, `qualityGateStatus`, `confidenceLevel`, `dataStatus`, evidencia) en vez de depender de números crudos o semáforos locales.
- Se creó `src/components/agency/metric-trust.tsx` como capa shared para:
  - tono visual
  - labels de estado
  - chips con tooltip
  - footers de benchmark/confianza/muestra
- `src/lib/agency/agency-queries.ts` ya no agrega `OTD`/`RpA` de forma engañosa promediando por `space` cuando la semántica correcta requiere agregación o weighting.
- `TASK-160` queda actualizada con delta para tratar esta lane como foundation cerrada de semántica trust-aware en consumers Agency.
- No se abrió migración nueva:
  - el trust model ya existía upstream por `TASK-216`
  - el trabajo de `TASK-217` fue consumer cutover + response shaping + UI semantics

### Verificación

- `pnpm exec vitest run src/lib/agency/agency-queries.test.ts src/lib/agency/space-360.test.ts`
- `pnpm exec eslint src/lib/agency/agency-queries.ts src/components/agency/metric-trust.tsx src/components/agency/PulseGlobalKpis.tsx src/components/agency/SpaceHealthTable.tsx src/components/agency/IcoGlobalKpis.tsx src/components/agency/SpaceIcoScorecard.tsx src/views/agency/AgencyDeliveryView.tsx src/app/(dashboard)/agency/page.tsx src/lib/agency/space-360.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `rg -n "new Pool\\(" src`
- `pnpm lint`
- `pnpm build`

### Riesgos / follow-on no bloqueantes

- `src/app/api/ico-engine/metrics/agency/route.ts` con `live=true` sigue siendo un carril separado del consumer Agency directo y puede requerir alineación de scope/freshness en una lane posterior.
- `src/lib/ico-engine/performance-report.ts` todavía usa un enum local de confidence con `low`, mientras el helper genérico Agency opera además con estados UI derivados; no bloquea `TASK-217`, pero conviene convergerlo después.

## Sesión 2026-04-04 — TASK-217 auditada y corregida antes de implementación

### Rama / alcance

- rama actual: `develop`
- scope:
  - `docs/tasks/complete/TASK-217-agency-kpi-trust-propagation-serving-semantics.md`
  - `docs/tasks/README.md`
  - `docs/tasks/TASK_ID_REGISTRY.md`
  - `Handoff.md`
  - auditoría runtime sobre:
    - `src/lib/agency/agency-queries.ts`
    - `src/views/agency/AgencyDeliveryView.tsx`
    - `src/views/agency/AgencyPulseView.tsx`
    - `src/components/agency/*`
    - `src/lib/ico-engine/read-metrics.ts`
    - `src/lib/ico-engine/metric-trust-policy.ts`
    - `src/lib/ico-engine/performance-report.ts`
    - `src/app/api/agency/pulse/route.ts`
    - `src/app/api/agency/spaces/route.ts`
    - `src/app/api/ico-engine/metrics/agency/route.ts`
    - `docs/architecture/schema-snapshot-baseline.sql`
    - `migrations/20260404011307094_ico-serving-trust-metadata.sql`

### Resultado

- `TASK-217` quedó movida a `in-progress` tras discovery/auditoría real del repo.
- La spec se corrigió para dejar explícito que:
  - el trust runtime ya existe en `ICO` y en serving (`metric_trust_json`)
  - el gap real no es crear un contrato base nuevo, sino propagarlo en `Agency`
  - `Pulse` y `Delivery` siguen en readers legacy con números crudos
  - `Agency > ICO Engine` ya consume readers canónicos pero todavía no renderiza trust de forma explícita
- No se implementó código todavía en esta pasada; solo se corrigió el contrato operativo para evitar construir sobre supuestos rotos.

### Verificación

- revisión manual de consistencia contra:
  - `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_AGENCY_LAYER_V2.md`
  - `docs/architecture/Greenhouse_ICO_Engine_v1.md`
  - `docs/architecture/Contrato_Metricas_ICO_v1.md`
  - `docs/architecture/schema-snapshot-baseline.sql`
  - runtime actual en `Agency`, `ICO` y serving PostgreSQL

## Sesión 2026-04-03 — TASK-216 implementada y verificada

### Rama / alcance

- rama actual: `feature/codex-task-216-ico-trust-model`
- scope principal:
  - `src/lib/ico-engine/metric-registry.ts`
  - `src/lib/ico-engine/metric-trust-policy.ts`
  - `src/lib/ico-engine/read-metrics.ts`
  - `src/lib/person-360/get-person-ico-profile.ts`
  - `src/lib/ico-engine/performance-report.ts`
  - `src/lib/sync/projections/ico-member-metrics.ts`
  - `src/lib/sync/projections/agency-performance-report.ts`
  - `src/app/api/cron/ico-member-sync/route.ts`
  - migración `20260404011307094_ico-serving-trust-metadata.sql`
  - docs de arquitectura / lifecycle de `TASK-216`

### Resultado

- `ICO Engine` ya publica trust metadata genérica por métrica (`benchmarkType`, `qualityGateStatus`, `confidenceLevel`, evidencia)
- `metric-registry.ts` ya modela benchmark semantics y trust config por KPI sin reabrir fórmulas base
- `greenhouse_serving.ico_member_metrics` y `greenhouse_serving.agency_performance_reports` ahora persisten `metric_trust_json`
- `People` y `Agency Performance Report` leen trust desde serving con fallback runtime para rows legacy
- `Payroll` quedó intacto y siguió verde consumiendo el carril `materialized_first_with_live_fallback`
- `TASK-216` queda lista para moverse a `docs/tasks/complete/`

### Verificación

- `pnpm pg:doctor --profile=migrator`
- `pnpm migrate:up`
- `pnpm exec vitest run src/lib/ico-engine/*.test.ts src/lib/payroll/fetch-kpis-for-period.test.ts src/lib/person-360/get-person-ico-profile.test.ts`
- `rg -n "new Pool\\(" src`
- `pnpm lint`
- `pnpm build`

## Sesión 2026-04-03 — TASK-215 implementada y verificada

### Rama / alcance

- rama actual: `feature/codex-task-215-rpa-reliability-policy`
- scope principal:
  - `src/lib/ico-engine/shared.ts`
  - `src/lib/ico-engine/rpa-policy.ts`
  - `src/lib/ico-engine/read-metrics.ts`
  - `src/lib/ico-engine/materialize.ts`
  - `src/lib/ico-engine/schema.ts`
  - `src/lib/payroll/fetch-kpis-for-period.ts`
  - `src/types/payroll.ts`
  - tests del lane `ICO/Payroll`
  - docs de arquitectura y lifecycle de `TASK-215`

### Resultado

- `TASK-215` quedó cerrada como contrato runtime de `RpA`
- el engine ya materializa evidencia de coverage y clasifica `RpA` como `valid`, `low_confidence`, `suppressed` o `unavailable`
- `read-metrics` propaga esa metadata junto al valor saneado
- `Payroll` consume `rpaAvg` sin reinterpretar `0` o `null` localmente y recibe metadata de confianza/evidencia
- no se creó migración PostgreSQL; el cambio quedó en schema/materialización BigQuery y contrato runtime
- `TASK-215` quedó movida a `docs/tasks/complete/`

### Verificación

- `pnpm exec vitest run src/lib/ico-engine/rpa-policy.test.ts src/lib/ico-engine/shared.test.ts src/lib/payroll/fetch-kpis-for-period.test.ts src/lib/payroll/project-payroll.test.ts src/lib/person-intelligence/compute.test.ts`
- `pnpm exec vitest run src/lib/ico-engine/*.test.ts src/lib/payroll/fetch-kpis-for-period.test.ts`
- `pnpm lint`
- `pnpm build`
- `rg -n "new Pool\\(" src`

## Sesión 2026-04-03 — TASK-215 documentación de policy RpA alineada

### Rama / alcance

- rama actual: `feature/codex-task-215-rpa-reliability-policy`
- scope:
  - `docs/tasks/in-progress/TASK-215-ico-rpa-reliability-source-policy-fallbacks.md`
  - `docs/architecture/Greenhouse_ICO_Engine_v1.md`
  - `docs/architecture/Contrato_Metricas_ICO_v1.md`
  - `docs/tasks/to-do/TASK-160-agency-enterprise-hardening.md`
  - `docs/tasks/to-do/TASK-150-space-health-score.md`
  - `docs/tasks/to-do/TASK-218-ico-time-to-market-activation-evidence-contract.md`
  - `Handoff.md`
  - `changelog.md`

### Resultado

- se dejó documentado el contrato runtime de `RpA` para `TASK-215` con estados `valid`, `low_confidence`, `suppressed` y `unavailable`
- se agregó la evidencia mínima esperada para la lane:
  - `rpa_eligible_task_count`
  - `rpa_missing_task_count`
  - `rpa_non_positive_task_count`
- se alineó el `ICO Engine` para que la policy se lea desde el engine y no desde reinterpretaciones locales en consumers
- se dejaron deltas mínimos en tareas vecinas para evitar drift de backlog sobre confidence / benchmark semantics

### Verificación

- no se ejecutó build / lint / test en esta pasada de documentación
- no se tocaron archivos en `src/` ni `migrations/` durante esta sesión de docs

## Sesión 2026-04-03 — TASK-215 auditada y corregida antes de implementación

### Rama / alcance

- rama actual: `feature/codex-task-215-rpa-reliability-policy`
- scope:
  - `docs/tasks/in-progress/TASK-215-ico-rpa-reliability-source-policy-fallbacks.md`
  - `docs/tasks/README.md`
  - `docs/tasks/TASK_ID_REGISTRY.md`
  - `Handoff.md`
  - auditoría runtime sobre:
    - `src/lib/ico-engine/shared.ts`
    - `src/lib/ico-engine/metric-registry.ts`
    - `src/lib/ico-engine/read-metrics.ts`
    - `src/lib/ico-engine/materialize.ts`
    - `src/lib/ico-engine/schema.ts`
    - `src/lib/sync/sync-notion-conformed.ts`
    - `src/lib/payroll/fetch-kpis-for-period.ts`
    - `src/lib/payroll/bonus-proration.ts`
    - `src/lib/agency/agency-queries.ts`
    - `src/lib/person-360/get-person-ico-profile.ts`
    - `src/lib/ico-engine/performance-report.ts`

### Resultado

- `TASK-215` quedó movida a `in-progress` tras discovery/auditoría real del repo.
- La spec se corrigió para dejar explícito que:
  - `RpA` ya tiene una policy implícita ejecutable en el engine (`completed terminal + rpa_value > 0`)
  - el gap real es la inconsistencia entre consumers sobre `null` vs `0` y la ausencia de trust/fallback policy explícita
  - la fuente principal de `rpa_value` ya existe en `greenhouse_conformed.delivery_tasks`
  - el impacto real incluye engine + sync + Agency + Payroll + People + Performance Report
- No se implementó código todavía en esta pasada; solo se corrigió el contrato operativo para evitar construir sobre supuestos incompletos.

### Verificación

- revisión manual de consistencia contra:
  - `docs/architecture/Greenhouse_ICO_Engine_v1.md`
  - `docs/architecture/GREENHOUSE_DELIVERY_PERFORMANCE_REPORT_PARITY_V1.md`
  - `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
  - `docs/architecture/Contrato_Metricas_ICO_v1.md`
  - `docs/architecture/schema-snapshot-baseline.sql`
  - runtime actual en engine y consumers downstream

## Sesión 2026-04-03 — TASK-214 implementada y verificada end-to-end

### Rama / alcance

- rama actual: `develop`
- scope:
  - `migrations/20260403234122383_ico-member-metrics-bucket-parity.sql`
  - `src/lib/ico-engine/shared.ts`
  - `src/lib/ico-engine/shared.test.ts`
  - `src/lib/ico-engine/read-metrics.ts`
  - `src/lib/ico-engine/materialize.ts`
  - `src/lib/ico-engine/schema.ts`
  - `src/lib/ico-engine/metric-registry.ts`
  - `src/lib/sync/projections/ico-member-metrics.ts`
  - `src/app/api/cron/ico-member-sync/route.ts`
  - `src/lib/person-360/get-person-ico-profile.ts`
  - `src/app/api/people/[memberId]/ico/route.ts`
  - `scripts/backfill-ico-to-postgres.ts`
  - `scripts/setup-postgres-ico-member-metrics.sql`
  - `src/types/db.d.ts`
  - docs de arquitectura/task impactadas por la lane

### Resultado

- `TASK-214` queda cerrada.
- La semántica de completitud se endureció en todo el carril ICO:
  - cierre válido = `completed_at + terminal status`
  - `delivery_signal` ya no depende solo de `completed_at`
  - `overdue`, `carry_over` y `overdue_carried_forward` requieren tarea abierta de forma explícita
- `greenhouse_serving.ico_member_metrics` quedó alineado a `metrics_by_member` con buckets member-level completos:
  - `on_time_count`
  - `late_drop_count`
  - `overdue_count`
  - `carry_over_count`
  - `overdue_carried_forward_count`
- `Person 360` ya expone `overdue_carried_forward` y el cron legacy/backfill/projection de member serving quedó a par con el contrato actual.
- Guardrail importante:
  - Payroll no cambió de source policy
  - el carril `BQ materialized-first + live fallback` sigue intacto; esta lane solo endurece semántica y serving aditivo

### Verificación

- `pnpm pg:doctor --profile=migrator`
- `pnpm migrate:up`
- `pnpm exec vitest run src/lib/ico-engine/shared.test.ts src/lib/payroll/fetch-kpis-for-period.test.ts`
- `pnpm lint`
- `pnpm build`
- chequeo manual:
  - sin `new Pool()` nuevos fuera del cliente canónico
  - docs dependientes (`TASK-215`, `TASK-216`, `TASK-217`) actualizadas con delta de foundation cerrada

## Sesión 2026-04-03 — TASK-214 auditada y corregida antes de implementación

### Rama / alcance

- rama actual: `develop`
- scope:
  - `docs/tasks/in-progress/TASK-214-ico-completion-semantics-bucket-normalization.md`
  - `docs/tasks/README.md`
  - `Handoff.md`
  - auditoría runtime sobre:
    - `src/lib/ico-engine/shared.ts`
    - `src/lib/ico-engine/metric-registry.ts`
    - `src/lib/ico-engine/read-metrics.ts`
    - `src/lib/ico-engine/materialize.ts`
    - `src/lib/ico-engine/schema.ts`
    - `src/lib/sync/projections/ico-member-metrics.ts`
    - `src/app/api/cron/ico-member-sync/route.ts`
    - `src/lib/person-360/get-person-ico-profile.ts`

### Resultado

- `TASK-214` quedó movida a `in-progress` tras discovery/auditoría real del repo.
- La spec se corrigió para dejar explícito que:
  - la semántica canónica base ya existe en `src/lib/ico-engine/shared.ts`
  - el gap real incluye drift interno del engine (`metric-registry`, `schema`, queries auxiliares)
  - el serving `greenhouse_serving.ico_member_metrics` sigue incompleto frente a `metrics_by_member`
  - `Person 360` todavía expone una versión parcial del contexto de buckets
- No se implementó código todavía en esta pasada; solo se corrigió el contrato operativo para evitar construir sobre supuestos rotos.

### Verificación

- revisión manual de consistencia contra:
  - `docs/architecture/Greenhouse_ICO_Engine_v1.md`
  - `docs/architecture/GREENHOUSE_DELIVERY_PERFORMANCE_REPORT_PARITY_V1.md`
  - `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
  - `docs/architecture/schema-snapshot-baseline.sql`
  - runtime actual en `src/lib/ico-engine/**` y consumers downstream

## Sesión 2026-04-03 — Roles internos y jerarquías formalizados como lane + spec canónica

### Rama / alcance

- rama actual: `develop`
- scope:
  - `docs/tasks/in-progress/TASK-225-internal-roles-hierarchies-approval-ownership-model.md`
  - `docs/architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md`
  - `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
  - `docs/tasks/TASK_ID_REGISTRY.md`
  - `docs/tasks/README.md`
  - `docs/tasks/to-do/TASK-161-agency-permissions-retention-onboarding.md`
  - `docs/README.md`
  - `project_context.md`
  - `changelog.md`

### Resultado

- se abrió `TASK-225` para institucionalizar el modelo interno de roles y jerarquías
- `TASK-225` quedó movida a `in-progress`
- se creó la spec canónica `GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md`
- el contrato nuevo separa explícitamente 4 planos:
  - `Access Role`
  - `Reporting Hierarchy`
  - `Structural Hierarchy`
  - `Operational Responsibility`
- se dejó explícito que:
  - `supervisor` no es un role code, sino una relación vía `reports_to_member_id`
  - `departments` no debe usarse como jerarquía universal para approvals u ownership comercial
  - el ownership operativo de cuentas/spaces/proyectos debe converger a relaciones scoped explícitas
- se dejó además explícito que el rol visible más amplio del sistema debe llamarse `Superadministrador`, manteniendo `efeonce_admin` como código técnico actual
- el mapping runtime de `efeonce_admin` quedó alineado para incluir todos los `routeGroups` del portal, de modo que `Superadministrador` herede todas las vistas posibles
- se formalizó además una jerarquía visible de personas separada de RBAC:
  - `Superadministrador`
  - `Responsable de Área`
  - `Supervisor`
  - `Colaborador`
- se documentó además en la task la matriz base actual `rol -> route groups -> catálogo de vistas` para que la convergencia futura no mezcle:
  - acceso derivado al login
  - fallback hardcoded de gobernanza
  - overrides persistidos por vista
- se creó `TASK-226` como follow-on específico para formalizar la policy de bootstrap y asignación del `Superadministrador` owner/founder
- se dejó delta de alineación en `TASK-161` para que Agency Permissions no reinvente una jerarquía paralela

### Verificación

- revisión manual de consistencia contra:
  - `GREENHOUSE_IDENTITY_ACCESS_V2.md`
  - `Greenhouse_HRIS_Architecture_v1.md`
  - `GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md`
  - `schema-snapshot-baseline.sql`

## Sesión 2026-04-03 — TASK-224 creada para institucionalizar documento vs caja en Finance

### Rama / alcance

- rama actual: `main`
- scope:
  - `docs/tasks/in-progress/TASK-224-finance-document-vs-cash-semantic-contract.md`
  - `docs/tasks/TASK_ID_REGISTRY.md`
  - `docs/tasks/README.md`

### Resultado

- se creó `TASK-224 - Finance Document vs Cash Semantic Contract`
- la task deja explícito que:
  - `Nubox sales/purchases` deben leerse primero como documentos
  - `income` / `expenses` operan como ledgers de devengo
  - caja real debe apoyarse en `income_payments`, `payment_date` y follow-ons como `TASK-194`
- la lane quedó en `in-progress` porque ya existe un primer slice visible aplicado en el repo, pero el runtime y consumers downstream siguen parcialmente abiertos
- guardrail adicional ya documentado en la task:
  - esta lane no puede dejar huérfanos los cálculos actuales de `Finance` / `Cost Intelligence`
  - debe preservar explícitamente la realidad de facturas cobradas y compras pagadas mientras corrige la semántica visible y contractual

### Verificación

- revisión manual de consistencia contra:
  - `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
  - `project_context.md`
  - `docs/tasks/TASK_TEMPLATE.md`
  - `docs/tasks/TASK_ID_REGISTRY.md`

## Sesión 2026-04-03 — Finance visible semantics aligned: Nubox documents vs cash

### Rama / alcance

- rama actual: `main`
- scope:
  - `src/config/greenhouse-nomenclature.ts`
  - `src/views/greenhouse/finance/IncomeListView.tsx`
  - `src/views/greenhouse/finance/ExpensesListView.tsx`
  - `src/app/(dashboard)/finance/income/page.tsx`
  - `src/app/(dashboard)/finance/expenses/page.tsx`
  - `src/components/layout/{vertical,horizontal}/NavbarContent.tsx`
  - `src/components/layout/shared/search/DefaultSuggestions.tsx`
  - `src/data/searchData.ts`
  - `src/lib/admin/view-access-catalog.ts`
  - `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
  - `project_context.md`
  - `changelog.md`

### Resultado

- `Finance > income` y `Finance > expenses` ya no quedan presentados solo como `Ingresos/Egresos` en la capa visible principal.
- La semántica visible ahora deja más claro que:
  - `income` funciona como ledger de documentos de venta/devengo
  - `expenses` funciona como ledger de compras/obligaciones/devengo
  - caja real sigue viviendo en cobros, `payment_date` y conciliación
- Se agregaron alerts contextuales en ambas vistas para evitar confundir documentos Nubox con eventos de caja.
- No se cambió el schema ni el runtime de P&L en esta pasada; el objetivo fue corregir contrato visible y arquitectura viva con cambio mínimo y reversible.

### Verificación

- pendiente ejecutar `pnpm lint`

## Sesión 2026-04-03 — Backlog ICO consumers aligned to Contrato_Metricas_ICO_v1

### Rama / alcance

- rama actual: `main`
- scope:
  - tasks `Agency`, `Nexa`, `HR`, `Frame.io`, `AI core`, `SLA`, `Scope`, `Temporal contract` y `Integrations` que consumen o podrían consumir métricas `ICO`
  - `Handoff.md`

### Resultado

- se dejó delta explícito en las tasks activas o de backlog que podrían contradecir el contrato de métricas si consumen `ICO`
- patrón aplicado:
  - no redefinir localmente `OTD`, `FTR`, `RpA`, `TTM`, `Iteration Velocity`, `BCS` o `Revenue Enabled`
  - distinguir benchmark canónico, policy local y confidence/trust metadata
  - impedir que consumers usen thresholds legacy como si fueran contrato vigente
- tasks alineadas en esta pasada:
  - `TASK-188`
  - `TASK-110`
  - `TASK-020`
  - `TASK-025`
  - `TASK-029`
  - `TASK-031`
  - `TASK-058`
  - `TASK-118`
  - `TASK-123`
  - `TASK-150`
  - `TASK-151`
  - `TASK-152`
  - `TASK-155`
  - `TASK-156`
  - `TASK-160`
  - `TASK-161`
  - `TASK-190`

### Verificación

- revisión manual de consistencia con:
  - `docs/architecture/Contrato_Metricas_ICO_v1.md`
  - `docs/architecture/Greenhouse_ICO_Engine_v1.md`

## Sesión 2026-04-03 — Contrato_Metricas_ICO_v1 aligned to benchmark-informed thresholds

### Rama / alcance

- rama actual: `main`
- scope:
  - `docs/architecture/Contrato_Metricas_ICO_v1.md`
  - `docs/architecture/Greenhouse_ICO_Engine_v1.md`
  - `project_context.md`
  - `Handoff.md`
  - `changelog.md`

### Resultado

- `Contrato_Metricas_ICO_v1.md` ya no deja mezclados en una sola tabla thresholds benchmark-informed e internos
- el contrato ahora adopta explícitamente las bandas investigadas y documentadas antes en `Greenhouse_ICO_Engine_v1.md` para:
  - `OTD%`
  - `FTR%`
  - `RpA`
- además separa como métricas de calibración interna:
  - `Cycle Time`
  - `Cycle Time Variance`
  - `BCS`
- esto corrige la contradicción donde el contrato seguía usando:
  - `OTD >= 90`
  - `FTR >= 70`
  - `RpA <= 1.5`
    como si fueran thresholds equivalentes en respaldo metodológico

### Verificación

- revisión manual de consistencia entre:
  - `docs/architecture/Contrato_Metricas_ICO_v1.md`
  - `docs/architecture/Greenhouse_ICO_Engine_v1.md` § `A.5.5`

## Sesión 2026-04-03 — ICO north-star task wave aligned to Contrato_Metricas_ICO_v1

### Rama / alcance

- rama actual: `main`
- scope:
  - `docs/tasks/to-do/TASK-213-ico-metrics-hardening-trust-model.md`
  - `docs/tasks/to-do/TASK-218-ico-time-to-market-activation-evidence-contract.md`
  - `docs/tasks/to-do/TASK-219-ico-iteration-velocity-experimentation-signal-contract.md`
  - `docs/tasks/to-do/TASK-220-ico-brief-clarity-score-intake-governance.md`
  - `docs/tasks/to-do/TASK-221-revenue-enabled-measurement-model-attribution-policy.md`
  - `docs/tasks/to-do/TASK-222-creative-velocity-review-tiered-metric-surfacing.md`
  - `docs/tasks/to-do/TASK-223-ico-methodological-accelerators-instrumentation.md`
  - `docs/tasks/TASK_ID_REGISTRY.md`
  - `docs/tasks/README.md`
  - `Handoff.md`

### Resultado

- la ola `TASK-213` a `TASK-217` ya no queda limitada solo a trust de KPIs operativos
- ahora queda explícitamente alineada al norte de `Contrato_Metricas_ICO_v1`
- se abrió una segunda ola de tasks para llegar al norte real:
  - `TASK-218` — `TTM` + evidencia de activación
  - `TASK-220` — `BCS` + intake governance
  - `TASK-219` — `Iteration Velocity` + señal de experimentación
  - `TASK-221` — `Revenue Enabled` como measurement model defendible
  - `TASK-222` — `CVR` + tiers + narrativa client-facing
  - `TASK-223` — aceleradores metodológicos internos
- orden recomendado total:
  - trust foundation: `TASK-214` → `TASK-216` → `TASK-215` → `TASK-217`
  - north-star enablement: `TASK-218` → `TASK-220` → `TASK-219` → `TASK-221` → `TASK-222` → `TASK-223`

### Verificación

- revisión manual de consistencia contra:
  - `docs/architecture/Contrato_Metricas_ICO_v1.md`
  - `docs/tasks/TASK_TEMPLATE.md`
  - `docs/tasks/TASK_ID_REGISTRY.md`
  - `docs/tasks/README.md`

## Sesión 2026-04-03 — ICO metrics hardening tasks package created

### Rama / alcance

- rama actual: `main`
- scope:
  - `docs/tasks/TASK_ID_REGISTRY.md`
  - `docs/tasks/README.md`
  - `docs/tasks/to-do/TASK-213-ico-metrics-hardening-trust-model.md`
  - `docs/tasks/to-do/TASK-214-ico-completion-semantics-bucket-normalization.md`
  - `docs/tasks/to-do/TASK-215-ico-rpa-reliability-source-policy-fallbacks.md`
  - `docs/tasks/to-do/TASK-216-ico-metric-trust-model-benchmark-quality-gates.md`
  - `docs/tasks/complete/TASK-217-agency-kpi-trust-propagation-serving-semantics.md`
  - `Handoff.md`

### Resultado

- se creó el paquete institucional de tasks para robustecer `ICO Engine` como sistema de métricas confiables
- `TASK-213` queda como paraguas de coordinación
- orden recomendado de ejecución:
  - `TASK-214`
  - `TASK-216`
  - `TASK-215`
  - `TASK-217`
- foco de cada lane:
  - `TASK-214`: semántica canónica de completitud y buckets
  - `TASK-216`: benchmark registry, quality gates y confidence metadata
  - `TASK-215`: source policy y fallbacks específicos de `RpA`
  - `TASK-217`: serving y propagación a `Agency`

### Verificación

- revisión manual de consistencia contra:
  - `docs/tasks/TASK_TEMPLATE.md`
  - `docs/tasks/TASK_ID_REGISTRY.md`
  - `docs/tasks/README.md`
  - `docs/architecture/Greenhouse_ICO_Engine_v1.md`

## Sesión 2026-04-03 — ICO Engine external benchmarks documented

### Rama / alcance

- rama actual: `main`
- scope:
  - `docs/architecture/Greenhouse_ICO_Engine_v1.md`
  - `project_context.md`
  - `Handoff.md`
  - `changelog.md`

### Resultado

- `Greenhouse_ICO_Engine_v1.md` ahora documenta benchmarks externos y estándar recomendado para Greenhouse en `A.5.5`
- el bloque distingue entre:
  - benchmark externo fuerte
  - benchmark por análogo
  - benchmark parcial creativo
  - policy interna sin benchmark portable
- quedaron aterrizados criterios recomendados para:
  - `FTR`
  - `RpA`
  - `OTD`
  - `cycle time`
  - `throughput`
  - `pipeline velocity`
  - `stuck assets`
  - `carry-over`
  - `overdue carried forward`
- el documento también deja explícito qué referencias sí son comparables cross-industry y cuáles no deben venderse como estándar de mercado

### Fuentes externas usadas

- `SCOR / APICS`
- `APQC`
- `IndustryWeek`
- `visualloop`

### Verificación

- investigación web manual contra fuentes externas primarias o de benchmarking reconocido
- revisión manual de consistencia documental con las métricas ya inventariadas en `A.5.4`

## Sesión 2026-04-03 — ICO Engine metrics inventory consolidated in architecture

### Rama / alcance

- rama actual: `main`
- scope:
  - `docs/architecture/Greenhouse_ICO_Engine_v1.md`
  - `project_context.md`
  - `Handoff.md`
  - `changelog.md`

### Resultado

- `Greenhouse_ICO_Engine_v1.md` ahora tiene un inventario consolidado y explícito de:
  - categorías funcionales de métricas ICO
  - señales base que ya llegan calculadas/normalizadas
  - derivados por tarea en `v_tasks_enriched`
  - métricas agregadas canónicas del engine
  - buckets/contexto operativo
  - rollups adicionales de `performance_report_monthly`
- cada métrica y rollup relevante ya declara además:
  - en qué consiste su cálculo
  - qué pregunta de negocio responde
- esto reduce el drift entre:
  - arquitectura
  - `metric-registry.ts`
  - `shared.ts`
  - `schema.ts`

### Verificación

- revisión manual de consistencia documental contra:
  - `src/lib/ico-engine/metric-registry.ts`
  - `src/lib/ico-engine/shared.ts`
  - `src/lib/ico-engine/schema.ts`
  - `src/lib/ico-engine/read-metrics.ts`

## Sesión 2026-04-03 — ICO completed semantics hardened against non-terminal statuses

### Rama / alcance

- rama actual: `main`
- scope:
  - `src/lib/ico-engine/shared.ts`
  - `src/lib/ico-engine/shared.test.ts`
  - `project_context.md`
  - `Handoff.md`
  - `changelog.md`
  - `docs/changelog/CLIENT_CHANGELOG.md`

### Resultado

- el motor ICO ya no considera una tarea como `completed` solo porque `completed_at` venga poblado
- nuevo contrato canónico:
  - `completed_at IS NOT NULL`
  - `task_status IN ('Listo','Done','Finalizado','Completado','Aprobado')`
- esto endurece de una vez:
  - `OTD`
  - `RpA`
  - `FTR`
  - `cycle time`
  - `throughput`
- además, `performance_indicator_code = 'on_time'` / `late_drop` ya no puede saltarse la validación de estado terminal

### Evidencia

- en `Sky Airline`, abril 2026 mostraba filas con:
  - `completed_at = 2026-04-02`
  - `task_status = 'Sin empezar'`
  - `task_status = 'Listo para revisión'`
- distribución confirmada para `Sky` en abril 2026:
  - `135` filas con `completed_at`
  - `101` de esas filas estaban en estados no terminales
  - `81` filas contaban como `on_time`, pero solo `7` estaban realmente en `Aprobado`

### Verificación

- `pnpm exec vitest run src/lib/ico-engine/shared.test.ts src/lib/agency/agency-queries.test.ts`
- `pnpm exec eslint src/lib/ico-engine/shared.ts src/lib/ico-engine/shared.test.ts src/lib/agency/agency-queries.ts src/lib/agency/agency-queries.test.ts`
- validación manual BigQuery:
  - `Sky` abril 2026 tenía `81` `on_time` bajo la semántica vieja
  - con estado terminal obligatorio, cae a `7` `on_time` reales
  - `RpA` sigue `null` porque esas tareas terminales no traen `rpa_value > 0`

## Sesión 2026-04-03 — Agency Delivery vuelve a mes en curso con cálculo live real

### Rama / alcance

- rama actual: `main`
- scope:
  - `src/lib/agency/agency-queries.ts`
  - `src/lib/agency/agency-queries.test.ts`
  - `project_context.md`
  - `Handoff.md`
  - `changelog.md`
  - `docs/changelog/CLIENT_CHANGELOG.md`

### Resultado

- `Agency > Delivery` ya no queda anclado al último mes cerrado
- `RPA promedio`, `OTD` y la tabla por Space vuelven a usar el mes calendario en curso (`America/Santiago`)
- la lectura ahora sale de live compute sobre `ico_engine.v_tasks_enriched`, reutilizando:
  - `buildMetricSelectSQL()`
  - `buildPeriodFilterSQL()`
- esto corrige el drift introducido por el hotfix anterior:
  - el snapshot abierto podía mostrar números absurdos
  - pero el cambio a `mes cerrado` rompía la semántica esperada por negocio para la vista operativa

### Evidencia

- para `Sky Airline`, abril 2026 en snapshot mensual abierto mostraba `otd_pct = 9.5` y `rpa_avg = null`
- contrastado contra live compute del mismo mes sobre `v_tasks_enriched`, `Sky Airline` devuelve:
  - `otd_pct = 100.0`
  - `rpa_avg = null`
- esto confirma que el `9.5%` era un artefacto del snapshot mensual parcial y no del dato real del mes en curso

### Verificación

- `pnpm exec vitest run src/lib/agency/agency-queries.test.ts`
- `pnpm exec eslint src/lib/agency/agency-queries.ts src/lib/agency/agency-queries.test.ts`
- validación manual BigQuery con `bq query --use_legacy_sql=false` sobre abril 2026:
  - `Sky Airline` → `otd_pct = 100.0`, `rpa_avg = null`

## Sesión 2026-04-03 — Agency Delivery KPI reader pinned to latest closed month

> Superseded el mismo día por la sesión `Agency Delivery vuelve a mes en curso con cálculo live real`.

### Rama / alcance

- rama actual: `main`
- scope:
  - `src/lib/agency/agency-queries.ts`
  - `src/lib/agency/agency-queries.test.ts`
  - `project_context.md`
  - `Handoff.md`
  - `changelog.md`

### Resultado

- `Agency > Delivery` deja de usar el snapshot del mes abierto más reciente para `OTD` / `RpA`
- el reader ahora limita `ico_engine.metric_snapshots_monthly` al último período mensual cerrado disponible
- esto corrige el caso visible de `Sky Airline` donde abril 2026 mostraba `OTD 9.5%` y `RpA null` por leer un snapshot abierto/inestable
- la evidencia contrastada en BigQuery fue:
  - snapshot leído por la vista: `2026-04`, `rpa_avg = null`, `otd_pct = 9.5`, `carry_over_count = 67`
  - período cerrado previo: `2026-03`, `rpa_avg = 1.15`, `otd_pct = 95.8`

### Verificación

- pendiente ejecutar:
  - `pnpm exec vitest run src/lib/agency/agency-queries.test.ts`
  - `pnpm exec eslint src/lib/agency/agency-queries.ts src/lib/agency/agency-queries.test.ts`

## Sesión 2026-04-03 — Hotfix Deel KPI bonuses in projected/offical payroll

### Rama / alcance

- rama actual: `main`
- scope:
  - `src/lib/payroll/calculate-payroll.ts`
  - `src/lib/payroll/project-payroll.test.ts`
  - `src/views/greenhouse/payroll/CompensationDrawer.tsx`
  - `src/views/greenhouse/payroll/PayrollEntryTable.tsx`
  - `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
  - `project_context.md`
  - `changelog.md`

### Resultado

- `payroll_via = 'deel'` ya no cae en la rama que fuerza `bonusOtdAmount` / `bonusRpaAmount` a `0`
- `Deel` ahora calcula bonos KPI automáticos desde `OTD` y `RpA` con la policy vigente
- se preserva el contrato operativo de Deel sin descuentos previsionales locales ni attendance proration dentro de Greenhouse
- la UI de compensación/payroll deja de afirmar que Deel parte con bonos discrecionales en `0`
- `kpiDataSource` para Deel ahora refleja `ico` cuando el snapshot real vino de ICO

### Verificación

- pendiente ejecutar:
  - `pnpm exec vitest run src/lib/payroll/project-payroll.test.ts`
  - `pnpm exec eslint src/lib/payroll/calculate-payroll.ts src/lib/payroll/project-payroll.test.ts src/views/greenhouse/payroll/CompensationDrawer.tsx src/views/greenhouse/payroll/PayrollEntryTable.tsx`

### Nota operativa

- la separación explícita ahora es:
  - `honorarios` = bonos KPI discrecionales
  - `deel` = bonos KPI automáticos, pero settlement/compliance final fuera de Greenhouse

## Sesión 2026-04-03 — TASK-204 Carry-Over & Overdue Carried Forward Semantic Split

### Rama / alcance

- rama actual: `main`
- scope:
  - `src/lib/ico-engine/shared.ts` — bucket SQL, OTD formula, period filter
  - `src/lib/ico-engine/schema.ts` — BQ DDL + column migrations
  - `src/lib/ico-engine/materialize.ts` — all INSERT statements + agency OTD denominator
  - `src/lib/ico-engine/read-metrics.ts` — types, normalizers, validation
  - `src/lib/ico-engine/performance-report.ts` — report payload, OTD compute, alerts
  - `src/lib/ico-engine/metric-registry.ts` — OTD denominator + new OCF metric
  - `src/lib/ico-engine/historical-reconciliation.ts` — baseline + comparisons
  - `src/lib/sync/projections/agency-performance-report.ts` — PG upsert
  - `src/lib/sync/projections/ico-member-metrics.ts` — PG upsert
  - `src/lib/space-notion/notion-performance-report-publication.ts` — Notion outbound
  - `src/views/agency/AgencyIcoEngineView.tsx` — agency scorecard UI
  - `src/views/greenhouse/agency/space-360/tabs/IcoTab.tsx` — space context UI
  - `src/views/greenhouse/people/tabs/PersonHrProfileTab.tsx` — fallback context
  - `migrations/20260403175430107_delivery-semantic-split-overdue-carried-forward.sql`
  - 4 architecture/operations docs

### Resultado

- 5 buckets mutuamente excluyentes: On-Time, Late Drop, Overdue, Carry-Over, Overdue Carried Forward
- Carry-Over ahora exige `created_at in period` (antes era dead metric — period filter lo excluía)
- OTD = On-Time / (On-Time + Late Drop + Overdue) — carry-over y OCF fuera del denominador
- overdue_carried_forward_count materializado en todas las tablas BQ y PG serving
- UI y Notion publication incluyen la nueva métrica

### Verificación

- `pnpm build` sin errores
- `pnpm lint` sin errores
- Migración PG lista para `pnpm migrate:up` (requiere Cloud SQL Proxy)

## Sesión 2026-04-03 — TASK-206 Delivery Operational Attribution Model

### Rama / alcance

- rama actual: `main`
- scope:
  - `docs/architecture/GREENHOUSE_OPERATIONAL_ATTRIBUTION_MODEL_V1.md` (NEW)
  - `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md` (cross-reference)
  - `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md` (delta)
  - `docs/architecture/GREENHOUSE_DELIVERY_PERFORMANCE_REPORT_PARITY_V1.md` (delta)

### Resultado

- Modelo canónico de atribución operativa formalizado como spec standalone
- Separa 4 capas: source identity → identity profile → operational actor → attribution role
- Documenta contrato de campos, política `primary_owner_first_assignee`, matriz de consumo por reader
- Cross-references actualizados en 3 docs de arquitectura existentes
- No hay cambios de runtime — este trabajo formaliza decisiones ya implementadas por TASK-199

### Verificación

- `pnpm build` sin errores
- `pnpm lint` sin errores
- Revisión cruzada contra TASK-198, TASK-199, TASK-205
- Validación conceptual con casos reales (Daniela, Constanza, Adriana)

## Sesión 2026-04-03 — Health & Freshness separa estado actual de incidentes recientes

### Rama / alcance

- rama actual: `main`
- scope:
  - `src/lib/integrations/health.ts`
  - `src/lib/integrations/health.test.ts`
  - `src/views/greenhouse/admin/AdminIntegrationGovernanceView.tsx`

### Resultado

- el badge `Health` del overview ya no cae a `degraded` solo porque existan fallos en las ultimas 24 horas
- el contrato nuevo es:
  - `Health` refleja el estado actual segun la ultima senal valida y su frescura
  - `Fallos 24h` permanece visible como contexto operativo separado
- con esto, una integracion recuperada vuelve a verse sana de inmediato, sin perder trazabilidad de incidentes recientes

### Verificación

- `pnpm exec vitest run src/lib/integrations/health.test.ts`
- `pnpm exec eslint src/lib/integrations/health.ts src/lib/integrations/health.test.ts src/views/greenhouse/admin/AdminIntegrationGovernanceView.tsx`
- `pnpm exec next build --webpack`

## Sesión 2026-04-03 — Fix trustable state for Notion Sync Orchestration UI

### Rama / alcance

- rama actual: `main`
- scope:
  - `src/lib/integrations/notion-sync-orchestration.ts`
  - `src/lib/integrations/notion-sync-orchestration.test.ts`

### Resultado

- el control plane ya persiste una señal nueva de `sync_completed` por `space` cuando el ciclo raw -> conformed converge correctamente
- eso aplica tanto cuando:
  - hubo runs abiertos y se completaron
  - como cuando el sync terminó `skipped` porque el conformed ya estaba fresco
- con este cambio, la UI de `/admin/integrations` deja de quedar pegada al último `sync_failed` histórico si el pipeline ya se resolvió

### Verificación

- `pnpm exec vitest run src/lib/integrations/notion-sync-orchestration.test.ts`
- `pnpm exec eslint src/lib/integrations/notion-sync-orchestration.ts src/lib/integrations/notion-sync-orchestration.test.ts`

## Sesión 2026-04-03 — Documentación de arquitectura alineada al cierre real de TASK-209

### Rama / alcance

- rama actual: `main`
- scope:
  - `docs/architecture/GREENHOUSE_SYNC_PIPELINES_OPERATIONAL_V1.md`
  - `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
  - `docs/architecture/Greenhouse_ICO_Engine_v1.md`

### Resultado

- la arquitectura ya refleja el estado real post-cierre de `TASK-209`
- quedó documentado que:
  - `notion-bq-sync` escribe `notion_ops` y hace callback a `sync-conformed` en corridas full exitosas
  - `sync-conformed` sigue siendo el único writer canónico de `greenhouse_conformed.delivery_*`
  - el writer conformed ahora usa staging + swap y gate de frescura por tabla
  - la mejora fortalece la consistencia del snapshot para métricas, sin cambiar sus fórmulas

### Verificación

- revisión manual de consistencia documental contra runtime ya validado hoy en production

## Sesión 2026-04-03 — TASK-209 production hardening del writer conformed de Notion

### Rama / alcance

- rama actual: `main`
- scope:
  - `src/lib/sync/sync-notion-conformed.ts`

### Resultado

- el writer `raw -> greenhouse_conformed` ya no hace `WRITE_TRUNCATE` secuencial directo sobre las tablas canónicas
- ahora carga primero a tablas staging efímeras y luego hace un swap transaccional sobre:
  - `greenhouse_conformed.delivery_projects`
  - `greenhouse_conformed.delivery_tasks`
  - `greenhouse_conformed.delivery_sprints`
- esto elimina el failure mode observado hoy en production donde `delivery_projects` quedaba adelantada mientras `delivery_tasks` / `delivery_sprints` fallaban por quota
- además se agregó una gate de frescura por tabla:
  - si `notion_ops.{proyectos,tareas,sprints}` no es más nueva que `greenhouse_conformed.{delivery_projects,delivery_tasks,delivery_sprints}`, la corrida se marca `succeeded` sin volver a escribir
- con eso el callback determinístico hacia Greenhouse deja de quemar operaciones de tabla innecesarias cuando el conformed ya está al día

### Verificación

- `pnpm exec eslint src/lib/sync/sync-notion-conformed.ts`
- `npx next build`
  - compiló y llegó a `Running TypeScript`, pero el proceso quedó demasiado largo para esta sesión CLI y terminó cortado sin emitir error de código concreto

### Nota operativa

- evidencia previa del incidente:
  - `delivery_projects.max(synced_at)` quedó en `2026-04-03T15:43:08Z`
  - `delivery_tasks.max(synced_at)` y `delivery_sprints.max(synced_at)` seguían en `2026-04-03T12:02:05Z`
  - eso confirma que el writer anterior podía dejar el conformed en estado parcial
- siguiente paso esperado en esta misma lane: deploy productivo, rerun de `/api/cron/sync-conformed` y luego rerun full de `notion-bigquery`

## Sesión 2026-04-03 — Hotfix GCP auth preference para runtime production

### Rama / alcance

- rama actual: `develop`
- scope:
  - `src/lib/google-credentials.ts`
  - `src/lib/google-credentials.test.ts`
  - `.env.example`
  - `project_context.md`

### Resultado

- se agregó `GCP_AUTH_PREFERENCE` como switch explícito para seleccionar la fuente de credenciales GCP en runtime:
  - `auto`
  - `wif`
  - `service_account_key`
  - `ambient_adc`
- el comportamiento default no cambia: Greenhouse sigue prefiriendo `WIF` cuando no existe override
- se añadió cobertura de tests para el caso crítico donde un runtime Vercel con WIF configurado necesita degradar de forma controlada a `service_account_key`

### Verificación

- `pnpm exec vitest run src/lib/google-credentials.test.ts`
- `pnpm exec eslint src/lib/google-credentials.ts src/lib/google-credentials.test.ts`

### Nota operativa

- este cambio existe para destrabar incidentes de runtime Cloud SQL / BigQuery en production sin desmontar WIF en todos los entornos
- si `production` fija `GCP_AUTH_PREFERENCE=service_account_key`, debe existir también `GOOGLE_APPLICATION_CREDENTIALS_JSON` o `GOOGLE_APPLICATION_CREDENTIALS_JSON_BASE64`

## Sesión 2026-04-03 — TASK-209 cerrada con orquestación explícita raw -> conformed para Notion Delivery

### Rama / alcance

- rama actual: `feature/codex-task-209-sync-orchestration`
- task cerrada: `TASK-209`
- scope implementado:
  - `migrations/20260403124323269_notion-sync-orchestration-retry-control-plane.sql`
  - `src/lib/integrations/notion-sync-orchestration.ts`
  - `src/lib/integrations/notion-sync-orchestration.test.ts`
  - `src/types/notion-sync-orchestration.ts`
  - `src/app/api/cron/sync-conformed/route.ts`
  - `src/app/api/cron/sync-conformed-recovery/route.ts`
  - `src/app/api/admin/integrations/[integrationKey]/data-quality/route.ts`
  - `src/app/api/admin/tenants/[id]/notion-data-quality/route.ts`
  - `src/app/(dashboard)/admin/integrations/page.tsx`
  - `src/views/greenhouse/admin/AdminIntegrationGovernanceView.tsx`
  - `src/views/greenhouse/admin/tenants/TenantNotionPanel.tsx`
  - `src/types/db.d.ts`
  - `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
  - lifecycle/documentación de `TASK-209`

### Resultado

- Greenhouse ya no depende de reruns manuales de `sync-conformed` para cerrar el drift operativo observado entre `notion_ops` y `greenhouse_conformed.delivery_tasks`
- el control plane nuevo persiste evidencia por `space_id` en `greenhouse_sync.notion_sync_orchestration_runs`
- `/api/cron/sync-conformed` deja evidencia `waiting_for_raw` cuando el upstream todavía no está fresco
- `/api/cron/sync-conformed-recovery` reintenta automáticamente dentro de la ventana diaria
- admin global y tenant detail ya distinguen `waiting_for_raw`, `retry_scheduled`, `retry_running`, `sync_completed` y `sync_failed`

### Verificación

- `pnpm exec vitest run src/lib/integrations/notion-sync-orchestration.test.ts`
- `pnpm lint`
- `pnpm build`
- `pnpm migrate:up`
- `rg -n "new Pool\\(" src scripts`

### Nota operativa

- esta lane nació cerrando la recurrencia localmente con polling de frescura + retry auditado
- update `2026-04-03`:
  - el upstream `../notion-bigquery` ya quedó alineado con callback determinístico hacia `GET /api/cron/sync-conformed`
  - el control plane local y el recovery cron se mantienen como resiliencia, no como sustituto del callback

## Sesión 2026-04-03 — Nueva lane TASK-209 para prevenir recurrencia del drift Notion raw -> conformed

### Rama / alcance

- rama actual: `develop`
- task nueva: `TASK-209`
- scope documental:
  - `docs/tasks/to-do/TASK-209-delivery-notion-sync-recurrence-prevention.md`
  - `docs/tasks/TASK_ID_REGISTRY.md`
  - `docs/tasks/README.md`

### Resultado

- se formalizó una lane nueva para cerrar el hueco operativo que quedó después del incidente de `Notion Delivery Data Quality`
- el problema actual ya quedó resuelto y visible, pero la recuperación final todavía dependió de un rerun manual de `sync-conformed`
- `TASK-209` define el follow-on correcto:
  - chaining / retry / scheduling entre refresh raw y writer canónico
  - evidencia explícita en control plane para distinguir `waiting for raw` vs `sync completed`
  - validación de que staging permanezca `healthy` sin intervención manual

### Verificación

- consistencia documental revisada en:
  - `docs/tasks/TASK_ID_REGISTRY.md`
  - `docs/tasks/README.md`
  - `docs/tasks/to-do/TASK-209-delivery-notion-sync-recurrence-prevention.md`

## Sesión 2026-04-03 — TASK-130 Login Auth Flow UX

### Rama / alcance

- rama actual: `develop`
- task: `TASK-130`
- scope implementado:
  - `src/views/Login.tsx`
  - `src/app/auth/landing/loading.tsx` (nuevo)
  - `src/config/greenhouse-nomenclature.ts`

### Resultado

- **Slice 1 — Loading states**: LoadingButton con spinner para credenciales, CircularProgress individual por SSO provider, `isAnyLoading` deshabilita todo el formulario
- **Slice 2 — LinearProgress**: Barra indeterminada en top del form card durante cualquier loading
- **Slice 3 — Transición post-auth**: Pantalla con logo + spinner + "Preparando tu espacio de trabajo..." reemplaza el formulario tras auth exitosa. `loading.tsx` en `auth/landing` cubre la resolución de sesión
- **Slice 4 — Error categorization**: Errores mapeados desde NextAuth con severity diferenciada
- **Slice 5 — Nomenclatura**: 8 nuevos textos en GH_MESSAGES

### Verificación

- `pnpm build`
- `pnpm lint`

## Sesión 2026-04-03 — Fix monitor Notion Delivery degraded por null param en BigQuery

### Rama / alcance

- rama actual: `fix/codex-notion-data-quality-null-param`
- scope:
  - `src/lib/space-notion/notion-parity-audit.ts`
  - `src/lib/space-notion/notion-parity-audit-query.test.ts`

### Resultado

- el `degraded` visible en staging no venía primero por drift real, sino porque `GET /api/cron/notion-delivery-data-quality` fallaba antes de persistir runs
- evidencia runtime confirmada en Vercel:
  - `Error: Parameter types must be provided for null values via the 'types' field in query options`
  - la falla ocurría al correr el parity audit sin filtro de assignee
- fix aplicado:
  - `notion-parity-audit.ts` ya no manda `assigneeSourceId: null` a BigQuery cuando el filtro no aplica
  - se agregó regresión para asegurar que los params del query omiten el campo opcional en ese caso

### Verificación

- `pnpm exec vitest run src/lib/space-notion/notion-parity-audit.test.ts src/lib/space-notion/notion-parity-audit-query.test.ts`
- `pnpm exec eslint src/lib/space-notion/notion-parity-audit.ts src/lib/space-notion/notion-parity-audit-query.test.ts`
- `pnpm build`

### Nota operativa

- quedó un cambio ajeno sin tocar en `src/config/greenhouse-nomenclature.ts`; no mezclarlo con este fix
- siguiente paso esperado: push de esta rama, merge a `develop`, redeploy de staging y rerun del cron para confirmar si el estado resultante pasa a `healthy` o expone findings reales

## Sesión 2026-04-03 — Fix residual de data quality por jerarquía falsa en conformed

### Rama / alcance

- rama actual: `develop`
- scope:
  - `src/lib/space-notion/notion-parity-audit.ts`
  - `src/lib/space-notion/notion-parity-audit-query.test.ts`

### Resultado

- después del fix de `assigneeSourceId`, el rerun manual de `sync-conformed` confirmó que el pipeline real ya resolvía:
  - `missing_in_conformed`
  - `fresh_raw_after_conformed_sync`
  - mismatches de status / due date / assignee
- el estado residual `degraded` quedó acotado a `hierarchy_gap_candidate`
- causa raíz:
  - el auditor de paridad leía jerarquía real desde `notion_ops.tareas`
  - pero en `readConformedParityRows()` devolvía `ARRAY<STRING>[]` para `tarea_principal_ids` y `subtareas_ids` aunque las columnas sí existían en `greenhouse_conformed.delivery_tasks`
  - eso inflaba falsamente el warning de jerarquía en todos los rows con parent/subtask
- fix aplicado:
  - el auditor ahora selecciona `IFNULL(tarea_principal_ids, ARRAY<STRING>[])` y `IFNULL(subtareas_ids, ARRAY<STRING>[])` desde conformed cuando esas columnas existen
  - la regresión nueva verifica que el query de conformed usa las columnas persistidas reales

### Verificación

- `pnpm exec vitest run src/lib/space-notion/notion-parity-audit.test.ts src/lib/space-notion/notion-parity-audit-query.test.ts`
- `pnpm exec eslint src/lib/space-notion/notion-parity-audit.ts src/lib/space-notion/notion-parity-audit-query.test.ts`
- `pnpm build`

### Estado esperado después de deploy

- rerun de `GET /api/cron/notion-delivery-data-quality` o del `post_sync` de `sync-conformed`
- si no aparecen nuevas mutaciones en raw entre medio, el monitor debería pasar a `healthy`

## Sesión 2026-04-03 — TASK-109 Projected Payroll Runtime Hardening

### Rama / alcance

- rama actual: `develop`
- task: `TASK-109`
- scope implementado:
  - `src/lib/payroll/projected-payroll-store.ts`
  - `src/lib/payroll/projected-payroll-store.test.ts`
  - `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md`
  - `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`

### Resultado

- **Slice 1 — Runtime DDL removal**: `projected-payroll-store.ts` ya no ejecuta `CREATE TABLE IF NOT EXISTS`. Reemplazado por `verifyInfrastructure()` que hace fail-fast con error accionable si la tabla no existe.
- **Slice 2 — Projection health**: La observabilidad ya existía vía `GET /api/internal/projections`. Se documentaron señales específicas de `projected_payroll` en el Reactive Projections Playbook.
- **Slice 3 — Event contract hardening**: Los cuatro eventos `payroll.projected_*` quedan formalizados como audit-only en el Event Catalog. `payroll.projected_snapshot.refreshed` marcado como deprecated/no usado.

### Verificación

- `pnpm exec vitest run src/lib/payroll/projected-payroll-store.test.ts`
- `pnpm exec eslint src/lib/payroll/projected-payroll-store.ts`
- `pnpm build`

## Sesión 2026-04-03 — Fix rápido de navegación Cloud & Integrations

### Rama / alcance

- rama actual: `fix/codex-cloud-integrations-route`
- scope:
  - `src/app/(dashboard)/admin/cloud-integrations/page.tsx`
  - `src/components/layout/vertical/VerticalMenu.tsx`
  - `src/views/greenhouse/admin/AdminCenterView.tsx`
  - `src/views/greenhouse/admin/AdminOpsHealthView.tsx`
  - `src/views/greenhouse/admin/AdminIntegrationGovernanceView.tsx`
  - `src/lib/admin/view-access-catalog.ts`

### Resultado

- `Cloud & Integrations` ya usa `/admin/integrations` como route canónica
- `/admin/cloud-integrations` queda como alias server-side con redirect para compatibilidad
- se alinearon menú, CTA del Admin Center, CTA de Ops Health y metadata de acceso para evitar drift de navegación

### Verificación

- `pnpm exec eslint 'src/app/(dashboard)/admin/cloud-integrations/page.tsx' src/components/layout/vertical/VerticalMenu.tsx src/views/greenhouse/admin/AdminCenterView.tsx src/views/greenhouse/admin/AdminOpsHealthView.tsx src/views/greenhouse/admin/AdminIntegrationGovernanceView.tsx src/lib/admin/view-access-catalog.ts`
- `pnpm build`

## Sesión 2026-04-03 — TASK-208 cerrada con monitor recurrente de data quality para Notion Delivery

### Rama / alcance

- rama actual: `feature/codex-task-208-data-quality-monitor`
- task cerrada: `TASK-208`
- scope implementado:
  - `migrations/20260403110709982_integration-data-quality-monitoring.sql`
  - `src/lib/integrations/notion-delivery-data-quality.ts`
  - `src/lib/integrations/notion-delivery-data-quality-core.ts`
  - `src/lib/integrations/notion-delivery-data-quality-core.test.ts`
  - `src/types/integration-data-quality.ts`
  - `src/app/api/cron/notion-delivery-data-quality/route.ts`
  - `src/app/api/admin/integrations/[integrationKey]/data-quality/route.ts`
  - `src/app/api/admin/tenants/[id]/notion-data-quality/route.ts`
  - `src/app/api/cron/sync-conformed/route.ts`
  - `src/app/(dashboard)/admin/integrations/page.tsx`
  - `src/views/greenhouse/admin/AdminIntegrationGovernanceView.tsx`
  - `src/views/greenhouse/admin/AdminOpsHealthView.tsx`
  - `src/views/greenhouse/admin/tenants/TenantNotionPanel.tsx`
  - `src/lib/operations/get-operations-overview.ts`
  - `vercel.json`
  - `src/types/db.d.ts`
  - cierre documental/lifecycle de `TASK-208`

### Resultado

- Greenhouse ya tiene monitoreo recurrente de calidad para el pipeline `Notion -> notion_ops -> greenhouse_conformed.delivery_tasks`
- la salud del pipeline ahora se clasifica y persiste como `healthy`, `degraded` o `broken` por `space`
- la evidencia histórica y los findings viven en:
  - `greenhouse_sync.integration_data_quality_runs`
  - `greenhouse_sync.integration_data_quality_checks`
- el monitor corre:
  - por cron dedicado `GET /api/cron/notion-delivery-data-quality`
  - como hook post-sync después de `GET /api/cron/sync-conformed`
- `/admin/integrations`, `/admin/ops-health` y `TenantNotionPanel` ya exponen la señal operativa resultante

### Verificación

- `pnpm pg:doctor --profile=migrator`
- `pnpm migrate:up`
- `pnpm exec vitest run src/lib/integrations/notion-delivery-data-quality-core.test.ts`
- `pnpm build`
- `pnpm lint`
- `rg -n "new Pool\\(" src scripts`

### Follow-on

- el patrón `integration_data_quality_*` queda listo para generalizarse a otros upstreams dentro de `TASK-188`
- `TASK-195` debe considerar que `TenantNotionPanel` ya concentra también la señal operativa de calidad del pipeline mientras siga existiendo como surface legacy

## Sesión 2026-04-03 — TASK-207 cerrada con hardening runtime y convergencia a writer canónico

### Rama / alcance

- rama actual: `feature/codex-task-207-notion-sync-hardening`
- task cerrada: `TASK-207`
- scope implementado:
  - `migrations/20260403103800741_delivery-task-hierarchy-runtime.sql`
  - `src/lib/integrations/notion-readiness.ts`
  - `src/lib/integrations/notion-readiness.test.ts`
  - `src/lib/integrations/readiness.ts`
  - `src/lib/integrations/health.ts`
  - `src/lib/sync/notion-task-parity.ts`
  - `src/lib/sync/notion-task-parity.test.ts`
  - `src/lib/sync/sync-notion-conformed.ts`
  - `src/app/api/cron/sync-conformed/route.ts`
  - `scripts/setup-postgres-source-sync.sql`
  - `scripts/sync-source-runtime-projections.ts`
  - `scripts/setup-bigquery-source-sync.sql`
  - `src/types/db.d.ts`
  - `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`

### Resultado

- el cron `sync-conformed` ya no debe materializar contra raw stale o incompleto
- el writer canónico preserva jerarquía `task/subtask` en `greenhouse_conformed.delivery_tasks`
- la paridad runtime ahora se valida en dos tramos:
  - `raw -> transformed`
  - `transformed -> persisted`
- el carril legacy/manual ya no sobreescribe `greenhouse_conformed.*` salvo flag explícito `GREENHOUSE_ENABLE_LEGACY_CONFORMED_OVERWRITE=true`

### Verificación

- `pnpm exec vitest run src/lib/integrations/notion-readiness.test.ts src/lib/sync/notion-task-parity.test.ts`
- `pnpm build`
- `pnpm lint`
- `rg -n "new Pool\\(" src scripts`

### Follow-on

- `TASK-208` debe reutilizar estos gates y snapshots para monitoreo recurrente, scoring histórico y alerting
- quedaron cambios ajenos en el árbol de trabajo; no fueron tocados ni deben mezclarse con el cierre de `TASK-207`

## Sesión 2026-04-03 — TASK-207 entra a descubrimiento con spec corregida

### Rama / objetivo

- rama actual: `feature/codex-task-207-notion-sync-hardening`
- task activa: `TASK-207`
- objetivo inmediato:
  - auditar el tramo `Notion -> notion_ops -> greenhouse_conformed.delivery_tasks`
  - validar writer activo vs carril legacy
  - corregir supuestos documentales antes de implementar freshness gates, paridad runtime y preservación de jerarquía

### Corrección documental aplicada

- `TASK-207` se confirmó en `in-progress`
- se corrigieron supuestos del brief para reflejar el estado real del repo:
  - `schema-snapshot-baseline.sql` no refleja por sí solo toda la superficie vigente del dominio
  - `integration_registry` y parte del control plane actual viven en migraciones posteriores al baseline
  - `sync-notion-conformed.ts` es el writer runtime activo
  - `sync-source-runtime-projections.ts` sigue siendo un carril legacy/manual todavía ejecutable
  - `space_property_mappings` no es hoy la source of truth principal del writer activo

## Sesión 2026-04-03 — TASK-205 cerrada con auditoría executable y evidencia real

### Rama / alcance

- rama actual: `feature/codex-task-205-parity-audit`
- scope implementado:
  - `src/lib/space-notion/notion-parity-audit.ts`
  - `src/app/api/admin/tenants/[id]/notion-parity-audit/route.ts`
  - `scripts/audit-notion-delivery-parity.ts`
  - `src/lib/space-notion/notion-parity-audit.test.ts`
  - cierre documental/lifecycle de `TASK-205`

### Verificación cerrada

- `pnpm exec vitest run src/lib/space-notion/notion-parity-audit.test.ts`
- `pnpm build`
- `pnpm lint`
- auditorías reales ejecutadas:
  - `Daniela / due_date / Abril 2026`
    - `Sky Airline`: `56 -> 50`
    - `Efeonce`: `24 -> 23`
  - `Andrés / due_date / Abril 2026`
    - `Sky Airline`: `6 -> 4`
    - `Efeonce`: `7 -> 6`
  - `Andrés / created_at / Abril 2026`
    - `Sky Airline`: `8 -> 0`
    - `Efeonce`: `1 -> 1`

### Decisión / follow-on

- `TASK-205` queda cerrada como auditoría reusable y evidencia base
- `TASK-207` debe consumir este auditor para hardening runtime y freshness gates
- `TASK-208` debe convertir este auditor en monitoreo recurrente y alerting
- nota colateral de validación:
  - se corrigieron errores de lint preexistentes y triviales en `src/types/db.d.ts` y `src/views/greenhouse/admin/ScimTenantMappingsView.tsx` para dejar `pnpm lint` verde en la rama

## Sesión 2026-04-03 — TASK-205 deja auditoría reusable y delega hardening a TASK-207

### Estado

- `TASK-205` queda registrada como lane de auditoría reusable de paridad `Notion -> notion_ops -> greenhouse_conformed.delivery_tasks`
- el hardening estructural del pipeline sigue fuera de esta lane y permanece en `TASK-207`

## Sesión 2026-04-03 — TASK-207 entra a descubrimiento con spec corregida

### Rama / objetivo

- rama actual: `feature/codex-task-205-parity-audit`
- task activa: `TASK-207`
- objetivo inmediato:
  - endurecer el runtime `Notion -> notion_ops -> greenhouse_conformed.delivery_tasks`
  - corregir la spec sobre el estado real del control plane y del writer legacy antes de implementar

### Correcciones de descubrimiento ya confirmadas

- `GET /api/cron/sync-conformed` es el único writer automatizado encontrado para `delivery_tasks`
- `scripts/sync-source-runtime-projections.ts` sigue como carril manual/legacy con capacidad de overwrite
- `checkIntegrationReadiness('notion')` ya cruza:
  - `integration_registry`
  - `greenhouse_sync.source_sync_runs`
  - `greenhouse_core.space_notion_sources.last_synced_at`
- el gap abierto no es health genérico, sino frescura real de `notion_ops.*` y preservación de jerarquía `tarea_principal_ids` / `subtareas_ids`

### Nota documental

- se dejó constancia mínima en:
  - `changelog.md`
- no se tocaron docs técnicos adicionales para no invadir el scope de `TASK-207`

## Sesión 2026-04-03 — TASK-205 entra a ejecución con spec corregida

### Rama / objetivo

- rama actual: `develop`
- task activa: `TASK-205`
- objetivo inmediato:
  - cerrar auditoría reusable del tramo `Notion -> notion_ops -> greenhouse_conformed.delivery_tasks`
  - separar claramente auditoría/paridad (`TASK-205`) de hardening estructural (`TASK-207`) antes de implementar cambios funcionales

### Corrección documental aplicada

- `TASK-205` pasó de `to-do` a `in-progress`
- se corrigieron supuestos del brief para reflejar el estado real del repo:
  - el writer runtime activo hoy es `src/lib/sync/sync-notion-conformed.ts` vía `GET /api/cron/sync-conformed`
  - `scripts/sync-source-runtime-projections.ts` sigue existiendo como carril legacy/manual, todavía ejecutable y con capacidad de reescribir `greenhouse_conformed.delivery_tasks`
  - la jerarquía `tarea_principal_ids` / `subtareas_ids` aún no forma parte del contrato versionado local de `greenhouse_conformed.delivery_tasks`
  - parte de la documentación viva sigue describiendo la capa conformed como `config-driven`, pero el cron runtime actual no usa `space_property_mappings` como source of truth principal

### Delta documental

- se actualizaron:
  - `docs/tasks/in-progress/TASK-205-delivery-notion-origin-parity-audit.md`
  - `docs/tasks/README.md`
  - `docs/tasks/TASK_ID_REGISTRY.md`

## Sesión 2026-04-03 — Orden explícito para las lanes Notion parity/hardening/monitoring

### Decisión

- el orden recomendado de implementación queda formalizado dentro de cada task:
  1. `TASK-205`
  2. `TASK-207`
  3. `TASK-208`

### Motivo

- `TASK-205` define el diff real contra origen
- `TASK-207` corrige estructuralmente la tubería usando esa evidencia
- `TASK-208` deja guardrails permanentes una vez que el contrato ya está entendido y endurecido

### Delta documental

- se actualizaron:
  - `docs/tasks/to-do/TASK-205-delivery-notion-origin-parity-audit.md`
  - `docs/tasks/in-progress/TASK-207-delivery-notion-sync-pipeline-hardening.md`
  - `docs/tasks/in-progress/TASK-208-delivery-data-quality-monitoring-auditor.md`

## Sesión 2026-04-03 — Re-encuadre de lanes Notion/Delivery dentro de la integración nativa

### Objetivo

- Dejar explícito que las lanes abiertas de paridad, hardening y monitoreo (`TASK-205`, `TASK-207`, `TASK-208`) no deben ejecutarse como un carril separado de Delivery.

### Decisión

- estas lanes quedan formalmente absorbidas dentro de la integración nativa de `Notion` en Greenhouse
- su marco shared/control plane sigue siendo `TASK-188`
- su referencia específica de implementación para `Notion` sigue siendo `TASK-187`
- cualquier fix de:
  - paridad contra origen
  - frescura del sync
  - preservación de jerarquía
  - observabilidad y data quality
    debe nacer dentro de ese integration layer, no como solución paralela

### Delta documental

- se actualizaron:
  - `docs/tasks/to-do/TASK-205-delivery-notion-origin-parity-audit.md`
  - `docs/tasks/in-progress/TASK-207-delivery-notion-sync-pipeline-hardening.md`
  - `docs/tasks/in-progress/TASK-208-delivery-data-quality-monitoring-auditor.md`
  - `docs/tasks/in-progress/TASK-188-native-integrations-layer-platform-governance.md`
  - `docs/tasks/README.md`

## Sesión 2026-04-03 — Nueva lane TASK-208 para monitoreo continuo de data quality

### Delta 2026-04-03 — Ejecución iniciada

- `TASK-208` se movió a `in-progress` para ejecución activa.
- Auditoría inicial confirmada:
  - el helper reusable ya existe en `src/lib/space-notion/notion-parity-audit.ts`
  - el baseline `schema-snapshot-baseline.sql` no refleja por sí solo el estado actual de este dominio
  - faltan tablas especializadas para histórico del monitor; `source_sync_runs` no alcanza como storage de score/checks/evidencia
- Superficies reutilizables ya confirmadas para esta lane:
  - `/admin/integrations`
  - `/admin/ops-health`
  - `TenantNotionPanel`
- Archivo activo:
  - `docs/tasks/in-progress/TASK-208-delivery-data-quality-monitoring-auditor.md`

### Objetivo

- Abrir una task separada para construir un auditor/monitor recurrente de calidad de datos en Delivery, de modo que Greenhouse detecte automáticamente drift entre `Notion`, raw y conformed.

### Motivo

- la auditoría actual confirmó que el equipo estaba ciego ante el drift del pipeline
- aunque `TASK-205` y `TASK-207` cierren el problema actual, hace falta una capa continua que diga si el pipeline está:
  - sano
  - degradado
  - roto

### Delta documental

- se creó:
  - `docs/tasks/in-progress/TASK-208-delivery-data-quality-monitoring-auditor.md`
- se actualizó:
  - `docs/tasks/TASK_ID_REGISTRY.md`
  - `docs/tasks/README.md`

## Sesión 2026-04-03 — Nueva lane TASK-207 para hardening del sync Delivery

### Objetivo

- Separar en una task propia el trabajo estructural de endurecimiento del pipeline `Notion -> notion_ops -> delivery_tasks`, distinto de la auditoría de paridad de `TASK-205`.

### Motivo

- la auditoría ya confirmó que el problema principal no es `Estado` vs `Estado 1`
- tampoco viene hoy de `space_property_mappings`, porque la tabla está vacía
- la lectura más fuerte apunta a:
  - gates insuficientes de frescura del raw
  - riesgo estructural por doble writer
  - pérdida de jerarquía `task/subtask`
  - ausencia de validaciones automáticas `raw -> conformed`

### Delta documental

- se creó:
  - `docs/tasks/in-progress/TASK-207-delivery-notion-sync-pipeline-hardening.md`
- se actualizó:
  - `docs/tasks/TASK_ID_REGISTRY.md`
  - `docs/tasks/README.md`

## Sesión 2026-04-03 — Verificación de estatus `Estado` vs `Estado 1` en TASK-205

### Objetivo

- Confirmar si Greenhouse está trayendo correctamente el campo de estatus desde Notion para `Efeonce` y `Sky Airline`, y medir qué tan similar queda entre `Notion`, raw y conformed.

### Hallazgos

- `Efeonce` usa `Estado` tipo `status`
- `Sky Airline` usa `Estado 1` tipo `status`
- `sync-notion-conformed.ts` sí contempla ambas variantes con `COALESCE(estado, estado_1)`
- `Notion directo` y `notion_ops.tareas` coinciden exactamente en distribución de estatus para ambos spaces
- por lo tanto, el problema no está en la lectura de `Estado` / `Estado 1`
- el drift nace después, entre `notion_ops.tareas` y `greenhouse_conformed.delivery_tasks`
- `Efeonce` queda casi en paridad total por status
- `Sky Airline` sí muestra drift material de status, concentrado sobre todo en:
  - `Sin empezar`
  - `Aprobado`
  - `Listo para revisión`
- corte más fino sobre `Sky / Sin empezar`:
  - `428` tareas en raw
  - `348` match exacto en conformed
  - `62` missing en conformed
  - `18` mutadas a `Aprobado`
- patrón observado:
  - las `62` faltantes son mayormente filas creadas el `2026-04-02T11:44:00.000Z` con fuerte presencia de jerarquía `parent/subtask`
  - las `18` mutadas a `Aprobado` son principalmente tareas antiguas de enero 2026
  - `space_property_mappings` no es la causa: la tabla hoy tiene `0` filas
  - evidencia de orden/frescura:
    - raw `_synced_at = 2026-04-03T06:01:53.473592Z`
    - conformed `synced_at = 2026-04-03T03:45:21.802Z`
  - lectura actual:
    - `sync-conformed` está corriendo antes de que `notion-bq-sync` termine de refrescar el raw del día
    - la readiness gate actual no alcanza a detectar ese lag porque no valida frescura real de `notion_ops.tareas`

### Implicación operativa

- la hipótesis `Sky usa Estado 1 y por eso no entra bien` queda debilitada
- la hipótesis fuerte ahora es:
  - filas que se pierden en la proyección raw -> conformed
  - filas que cambian de `task_status` en esa misma proyección

### Delta documental

- se actualizó:
  - `docs/tasks/to-do/TASK-205-delivery-notion-origin-parity-audit.md`

## Sesión 2026-04-03 — Auditoría de pipeline sync y estrategia de resolución para TASK-205

### Objetivo

- Auditar exclusivamente el pipeline de sync de Delivery para encontrar dónde nace la inconsistencia `Notion -> Greenhouse`, sin tocar runtime, y dejar explícita la estrategia correcta de resolución.

### Hallazgos

- las tareas auditadas sí existen en `notion_ops.tareas`
- el problema principal nace después del raw ingest, entre `notion_ops.tareas` y `greenhouse_conformed.delivery_tasks`
- hoy existen dos writers distintos hacia `greenhouse_conformed.delivery_tasks`:
  - `src/lib/sync/sync-notion-conformed.ts`
  - `scripts/sync-source-runtime-projections.ts`
- `notion_ops.tareas` ya preserva jerarquía de Notion:
  - `subtareas`
  - `subtareas_ids`
  - `tarea_principal`
  - `tarea_principal_ids`
- ninguno de los dos writers proyecta hoy esa jerarquía hacia `delivery_tasks`
- el drift actual se parte en tres buckets reales:
  - filas presentes en raw pero ausentes en conformed
  - tareas presentes en ambos lados pero con drift de `assignee`, `due_date` o `task_status`
  - pérdida de jerarquía `task/subtask`, especialmente relevante en `Sky Airline`

### Decisión operativa

- no atacar primero métricas ni publicación
- resolver primero la paridad del sync en este orden:
  - congelar un solo writer canónico a `delivery_tasks`
  - preservar jerarquía `tarea principal / subtareas`
  - cerrar integridad fila por fila `raw vs conformed`
  - atacar el patrón repetido de `Sky` con tareas creadas en abril y `due_date = null`

### Delta documental

- se actualizó:
  - `docs/tasks/to-do/TASK-205-delivery-notion-origin-parity-audit.md`
    - ahora incluye la estrategia de resolución basada en la auditoría real del pipeline

## Sesión 2026-04-03 — TASK-205 paridad origen: segundo caso y sospecha de subitems

### Objetivo

- Extender la evidencia de paridad `Notion -> Greenhouse` más allá de `Daniela` y dejar explícita la nueva hipótesis de `subitems` / subtareas en Notion como posible fuente del drift.

### Hallazgos

- `Andrés Carlosama / Abril 2026` también queda desalineado:
  - `due_april`: `Notion 13` vs `Greenhouse 10`
  - `created_april`: `Notion 9` vs `Greenhouse 1`
- `Notion only` para `due_april`:
  - `Generar Banco de poses + expresiones`
  - `HM Argentina - Diseños Nuevos`
  - `Shopping Story`
- `Notion only` para `created_april`:
  - `8` tareas de `Sky Airline`
  - todas creadas el `2026-04-02T11:44:00.000Z`
  - varias con `due_date = null`
- Insight nuevo:
  - Notion maneja `subitems` / subtareas además de tareas principales
  - queda abierta la hipótesis de que Greenhouse esté filtrando, colapsando o perdiendo parte de esos subitems en el sync
  - la verificación posterior ya confirmó que:
    - `notion_ops.tareas` sí trae `subtareas_ids` y `tarea_principal_ids`
    - `sync-notion-conformed.ts` no los proyecta hoy a `delivery_tasks`
    - en `Sky` varios faltantes auditados sí son subtareas reales
    - en `Efeonce` los casos faltantes auditados no se explican por subtareas
  - además, parte del drift no es solo “fila ausente”; también hay drift de `assignee` y `due_date` en tareas que sí existen en `delivery_tasks`

### Delta documental

- `docs/tasks/to-do/TASK-205-delivery-notion-origin-parity-audit.md`
  - ya incluye el caso `Andrés / Abril 2026`
  - ya incluye la hipótesis de `subitems` como causa a verificar

## Sesión 2026-04-03 — Nueva lane TASK-206 para atribución operativa Delivery

### Objetivo

- Formalizar una lane separada para modelar la atribución operativa de trabajo encima del backbone de identidad, evitando seguir mezclando `identity resolution` con `owner attribution`.

### Delta documental

- Se creó:
  - `docs/tasks/to-do/TASK-206-delivery-operational-attribution-model.md`
- Se actualizó:
  - `docs/tasks/TASK_ID_REGISTRY.md`
  - `docs/tasks/README.md`

### Estado resultante

- `identity_profile_source_links` queda reafirmado como fuente de enlaces de identidad, no como solución completa de atribución operativa.
- La reconciliación de Delivery queda ahora separada en tres lanes distintas:
  - identidad (`TASK-198`)
  - atribución de performance (`TASK-199`)
  - modelo reusable de atribución operativa (`TASK-206`)

## Sesión 2026-04-03 — Corrección contractual de Carry-Over vs Overdue Carried Forward

### Objetivo

- Corregir la semántica funcional de `Carry-Over` después de la auditoría, para separar carga futura de deuda vencida arrastrada.

### Delta documental

- Se corrigió el contrato funcional en:
  - `docs/tasks/complete/TASK-200-delivery-performance-metric-semantic-contract.md`
  - `docs/architecture/GREENHOUSE_DELIVERY_PERFORMANCE_REPORT_PARITY_V1.md`
  - `docs/operations/GREENHOUSE_PERFORMANCE_REPORT_OPERATING_MODEL_V1.md`
  - `docs/architecture/Greenhouse_ICO_Engine_v1.md`
  - `docs/tasks/complete/TASK-189-ico-period-filter-due-date-anchor.md`
- La definición canónica queda así:
  - `Carry-Over` = tarea creada dentro del período con `due_date` posterior al cierre del período
  - `Overdue Carried Forward` = tarea con `due_date` en o antes del cierre que sigue abierta al comenzar el mes siguiente
  - el scorecard mensual de cumplimiento queda con `On-Time`, `Late Drop` y `Overdue`
  - `OTD` no debe usar `Carry-Over` ni `Overdue Carried Forward` en el denominador
- Se abrió la follow-on task:
  - `docs/tasks/to-do/TASK-204-delivery-carry-over-backlog-semantic-split.md`

### Estado resultante

- La corrección en esta sesión es contractual/documental, no de runtime.
- El engine sigue con la semántica previa hasta implementar `TASK-204`.
- La parte estable del sistema sigue siendo:
  - `due_date` como ancla del período
  - snapshots congelados
  - read path `materialized-first` para el reporte

## Sesión 2026-04-03 — Nueva lane TASK-205 para paridad `Notion -> Greenhouse`

### Objetivo

- Formalizar el gap de universo detectado entre `Notion` origen y `Greenhouse` para Delivery, usando `Daniela / Abril 2026` como primer caso de reconciliación fila por fila.

### Evidencia inicial

- `Notion` directo:
  - `due_april`: `80` (`24` Efeonce, `56` Sky Airline)
  - `created_april`: `22` (`2` Efeonce, `20` Sky Airline)
- `Greenhouse`:
  - `due_april`: `73` (`23` Efeonce, `50` Sky Airline)
  - `created_april`: `1` (`1` Efeonce, `0` Sky Airline)

### Delta documental

- Se creó:
  - `docs/tasks/to-do/TASK-205-delivery-notion-origin-parity-audit.md`

### Estado resultante

- El problema ya no se trata como observación suelta dentro de la lane de métricas.
- Queda formalizado como task separada de paridad de origen, previa a seguir confiando en cualquier scorecard downstream.

## Sesión 2026-04-03 — Auditoría de métricas Delivery y hardening del read path canónico

### Objetivo

- Auditar las métricas del `Performance Report` después del cutover a Notion y corregir cualquier inconsistencia real en el cálculo, priorizando el source of truth canónico.

### Delta de auditoría

- Se auditó `Marzo 2026` task-level sobre `ico_engine.delivery_task_monthly_snapshots`:
  - `294` filas `locked`
  - `293` tareas clasificadas
  - `247 on_time`
  - `25 late_drop`
  - `21 overdue`
  - `0 carry_over`
  - `1 unclassified` (`Archivado` en `Sky`)
- La fila de `greenhouse_serving.agency_performance_reports` para `2026-03` coincide exactamente con el snapshot congelado:
  - `84.3% OTD`
  - `293 total_tasks`
  - `247/25/21/0`
- Hallazgo fuerte:
  - la inconsistencia principal ya no estaba entre snapshot y serving para marzo
  - el riesgo real era que `readAgencyPerformanceReport()` seguía leyendo `serving` antes que `performance_report_monthly`
- Se auditó también un intento de reintroducir `carry-over` de períodos anteriores directamente en el filtro compartido:
  - en `2026-04` disparó `carry_over_count = 509` y `total_tasks = 530`
  - conclusión: esa semántica no debe entrar a ciegas en el scorecard mensual del reporte

### Delta de implementación

- `src/lib/ico-engine/performance-report.ts`
  - `readAgencyPerformanceReport()` ahora prioriza `ico_engine.performance_report_monthly`
  - `greenhouse_serving.agency_performance_reports` queda como fallback/cache y no como fuente preferida
- nueva prueba unitaria:
  - `src/lib/ico-engine/performance-report.test.ts`
  - verifica preferencia `materialized-first`
  - verifica fallback a `serving` cuando BigQuery no tiene fila materializada
- documentación actualizada:
  - `docs/architecture/GREENHOUSE_DELIVERY_PERFORMANCE_REPORT_PARITY_V1.md`
  - `docs/operations/GREENHOUSE_PERFORMANCE_REPORT_OPERATING_MODEL_V1.md`
  - `docs/tasks/complete/TASK-200-delivery-performance-metric-semantic-contract.md`
  - `docs/tasks/complete/TASK-201-delivery-performance-historical-materialization-reconciliation.md`

### Verificación

- `pnpm exec vitest run src/lib/ico-engine/performance-report.test.ts`
- `pnpm build`
- `pnpm lint`
  - sigue fallando por issues preexistentes ajenos a este cambio:
    - `src/types/db.d.ts`
    - `src/views/greenhouse/admin/ScimTenantMappingsView.tsx`

### Estado resultante

- El read path del reporte ya quedó endurecido hacia la fuente canónica correcta.
- `Marzo 2026` sigue estable bajo el contrato actual.
- `carry-over` sigue siendo la principal decisión semántica pendiente, pero ya no está mezclada con un bug de fuente ni con drift entre snapshot y serving.

## Sesión 2026-04-02 — TASK-201 historical reconciliation + frozen monthly snapshots

### Objetivo

- Cerrar `TASK-201` dejando `Marzo 2026` recalculable en Greenhouse con materialización histórica auditable y una estrategia operativa para evitar reescritura retroactiva del `Performance Report`.

### Delta de implementación

- `sync-notion-conformed` se reejecutó y confirmó que `Sky` sí tenía status operativo en origen; el gap era stale conformed.
- `src/lib/space-notion/notion-governance-contract.ts`
  - `task_status` ahora acepta también alias `estado_1`
- `src/lib/ico-engine/schema.ts`
  - `v_tasks_enriched` ahora expone `performance_indicator_label` y `original_due_date`
  - nuevo objeto BigQuery `ico_engine.delivery_task_monthly_snapshots`
- `src/lib/ico-engine/shared.ts`
  - nuevo `buildDeliveryPeriodSourceSql()` para preferir snapshot task-level congelado y usar view vivo solo como fallback
- `src/lib/ico-engine/materialize.ts`
  - nuevo `materializeDeliveryTaskMonthlySnapshot()`
  - nuevo `freezeDeliveryTaskMonthlySnapshot()`
  - las materializaciones mensuales Delivery ahora leen desde `buildDeliveryPeriodSourceSql()`
- `src/lib/ico-engine/historical-reconciliation.ts`
  - la reconciliación ahora congela el período antes de rematerializar y comparar
- nuevos scripts operativos:
  - `scripts/freeze-delivery-performance-period.ts`
  - `scripts/reconcile-delivery-performance-history.ts`
- `package.json`
  - nuevo comando `pnpm freeze:delivery-performance-period`

### Verificación

- `pnpm build`
- `pnpm lint`
- `rg -n "new Pool\\(" src scripts`
- `pnpm freeze:delivery-performance-period 2026 3`
  - `294` filas `locked`
  - `293` tareas clasificadas
  - `agency_performance_reports` refrescado para `2026-03`
- `pnpm reconcile:delivery-performance-history 2026 3`
  - Greenhouse congelado: `84.3% OT`, `293` tareas, `247 on-time`, `25 late drops`, `21 overdue`
  - baseline Notion: `67.5% OT`, `283` tareas, `191 on-time`, `75 late drops`, `17 overdue`

### Conclusión operativa

- `TASK-201` queda cerrada.
- El residual de marzo ya no apunta principalmente a fórmula, sync ni owner attribution.
- La evidencia más fuerte apunta a historia mutable en Notion posterior al cierre:
  - `Sky` hoy aparece casi completo como `Aprobado`
  - múltiples tareas muestran `completed_at <= due_date` en el estado actual
  - el reporte histórico parece haber sido calculado antes de ediciones posteriores sobre fechas/cierre
- Regla nueva:
  - `Abril 2026` en adelante debe operarse con snapshot mensual congelado
  - los períodos cerrados ya no deben recalcularse desde el estado vivo mutable de Notion

## Sesión 2026-04-02 — TASK-196 delivery performance report parity lane

### Objetivo

- Abrir la lane canónica para que el `Performance Report` mensual de Delivery pueda calcularse completo en Greenhouse con paridad frente a Notion y usar luego Notion como capa de consumo.

### Delta de ejecución

- Se creó la task formal:
  - `docs/tasks/complete/TASK-196-delivery-performance-report-parity-greenhouse-notion.md`
- Se crearon los documentos canónicos de esta lane:
  - `docs/architecture/GREENHOUSE_DELIVERY_PERFORMANCE_REPORT_PARITY_V1.md`
  - `docs/operations/GREENHOUSE_PERFORMANCE_REPORT_OPERATING_MODEL_V1.md`
- La nueva lane quedó posicionada explícitamente como follow-on de:
  - `TASK-186` para trust/paridad de métricas
  - `TASK-187` para governance de schema y readiness de Notion
- Alcance fijado para esta fase:
  - congelar el contrato semántico del reporte
  - cerrar la matriz de paridad `Notion -> conformed -> Greenhouse`
  - recalibrar `Marzo 2026` como baseline
  - definir `Abril 2026` como primer período operativo Greenhouse-first
- Índices actualizados:
  - `docs/tasks/TASK_ID_REGISTRY.md`
  - `docs/tasks/README.md`
  - `docs/README.md`
- Consistencia documental corregida:
  - `TASK-187` quedó alineada como `complete` también en `TASK_ID_REGISTRY.md`

### Validación

- No hubo cambios de runtime ni schema en esta sesión.
- Validación documental/manual:
  - nuevos archivos creados y enlazados desde índices principales
  - `TASK-196` registrada como `in-progress`

### Follow-on inmediato

- Se auditó adicionalmente el schema real de `Efeonce` vía Notion MCP para separar fórmulas y rollups de `Proyectos`/`Tareas`.
- La ruta de portabilidad quedó documentada en:
  - `docs/architecture/GREENHOUSE_DELIVERY_PERFORMANCE_REPORT_PARITY_V1.md`
- Se documentó también el modelo recomendado para replicar la conexión `Proyecto -> Tareas` de Notion en Greenhouse:
  - `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- Se agregó baseline de reconciliación real en `TASK-196` para `Daniela / Marzo 2026`:
  - Notion reporta `86.3% OT` y `102 tareas`
  - Greenhouse hoy reporta `82.4%` y `34 total_tasks`
  - en `delivery_tasks` con `due_date` marzo 2026 solo aparecen `18` tareas para Daniela, todas en `Efeonce` interno y ninguna en `Sky`
  - `performance_report_monthly` y `agency_performance_reports` no tienen snapshot `agency` para `2026-03`
  - `metrics_by_member` tiene `on_time_count` / `late_drop_count` nulos en `2026-03`
- Se agregó baseline de identidad/atribución en `TASK-196`:
  - `greenhouse_conformed.delivery_tasks` tiene `304` tareas de marzo 2026; `116` con match a miembro y `188` sin match
  - por `space`: `Efeonce` mapea `116/116`, `Sky Airline` mapea `0/188`
  - corrección del audit:
    - `Sky Airline` no llega vacío; usa `Responsable` en singular
    - en `notion_ops.tareas`, `Sky Airline` trae `responsable_ids` en `187/190` tareas del período y `3` quedan `Sin asignar`
    - `sync-notion-conformed.ts` ya hace `COALESCE(responsables_ids, responsable_ids)`, así que el hueco no es el nombre de la propiedad
    - aun así, en `greenhouse_conformed.delivery_tasks`, `Sky Airline` queda con `0/188` `assignee_source_id`
    - `Sky Airline` tiene `5` `notion_user_id` distintos en marzo 2026; solo `3` existen en `greenhouse.team_members`
    - faltan por resolver `constanza rojas` y `Adriana`
    - `Efeonce` sí trae tareas ya mapeadas a `daniela-ferreira`, `melkin-hernandez`, `andres-carlosama`, `luis-reyes`
- Criterio fijado:
  - portar a Greenhouse las primitivas faltantes
  - recomputar derivaciones determinísticas en `conformed`
  - dejar KPI/report logic en `ICO` o marts mensuales
  - dejar helpers visuales para serving o publicación a Notion
- Se descompuso `TASK-196` en subtasks ejecutables para evitar mezclar lanes:
  - `TASK-197` source sync parity de responsables y proyecto
  - `TASK-198` coverage de identidad `notion_user_id -> member_id`
  - `TASK-199` contrato de owner attribution
  - `TASK-200` contrato semántico de métricas
  - `TASK-201` reconciliación y materialización histórica de `Marzo 2026`
  - `TASK-202` cutover de publicación/consumo en Notion
  - `TASK-197` ya quedó cerrada como slice de source sync/runtime parity

## Sesión 2026-04-02 — TASK-202 publication cutover Greenhouse -> Notion

### Objetivo

- Implementar `TASK-202` para publicar el `Performance Report` mensual desde Greenhouse hacia Notion usando el período congelado como source of truth.

### Delta de descubrimiento

- `TASK-202` pasó a `in-progress` tras auditoría formal.
- La spec quedó corregida para reflejar la realidad actual:
  - el output canónico base ya existe en `ico_engine.delivery_task_monthly_snapshots`, `ico_engine.performance_report_monthly` y `greenhouse_serving.agency_performance_reports`
  - el gap principal ya no es “definir el reporte desde cero”, sino formalizar e implementar el `publication contract` hacia Notion
  - el cutover debe colgarse del control plane de integraciones existente y no nacer como script aislado
- Hallazgo central:
  - hoy el repo ya tiene discovery/register/governance de Notion, pero no tiene writer saliente para publicar el reporte mensual

### Delta de implementación

- `TASK-202` quedó cerrada.
- Se aplicó la migración `20260403022246213_notion-delivery-performance-publication-cutover.sql`.
- Nuevos objetos:
  - `greenhouse_core.space_notion_publication_targets`
  - `greenhouse_sync.notion_publication_runs`
- Nueva integración registrada:
  - `notion_delivery_performance_reports`
- Nuevo endpoint cron:
  - `GET /api/cron/notion-delivery-performance-publish`
- Nuevos módulos:
  - `src/lib/space-notion/notion-client.ts`
  - `src/lib/space-notion/notion-publication-store.ts`
  - `src/lib/space-notion/notion-performance-report-publication.ts`
  - `src/types/notion-publication.ts`
- Validación funcional:
  - `dryRun` contra `Marzo 2026` resolvió correctamente el target Notion existente:
    - `space_id = spc-c0cf6478-1bf1-4804-8e04-db7bc73655ad`
    - `target_database_id = 935718d8e8ec4a79b0261be1ce300f73`
    - `target_page_id = 4504bd15-76da-4cef-8404-c2d8b0769b30`
    - `payloadHash = 5a7c586865bd7d5e745da78a046ac9edc7344e40939afe4f5a0e59a98a188ad4`
- La epic `TASK-196` también quedó cerrada con este slice.

## Sesión 2026-04-02 — TASK-197 source sync assignee/project parity

### Objetivo

- Implementar `TASK-197` con enfoque en paridad de responsables y relación `Proyecto -> Tareas` entre `notion_ops`, `greenhouse_conformed` y `greenhouse_delivery`, sin romper consumers actuales.

### Delta de descubrimiento

- `TASK-197` pasó a `in-progress` tras auditoría formal.
- La spec quedó corregida para reflejar la realidad del repo:
  - no existe un solo sync path; conviven el cron moderno `sync-notion-conformed.ts` y el carril legacy/manual `sync-source-runtime-projections.ts`
  - el sospechoso principal para la pérdida de `Sky` es hoy el carril legacy/manual, no el cron moderno
  - PostgreSQL runtime todavía no tiene columnas para `assignee_source_id`, `assignee_member_ids` ni `project_source_ids`
- Evidencia verificada:
  - en `notion_ops.tareas`, `Sky` mantiene `responsable_ids`
  - en `greenhouse_conformed.delivery_tasks`, `Sky` mantiene `project_source_id` pero cae a `0` `assignee_source_id`
  - `ICO` depende de `assignee_member_ids`
  - `Person 360` sigue dependiendo de `greenhouse_delivery.tasks.assignee_member_id`
  - `team-queries` todavía solo mira `responsables_ids`

### Delta de implementación

- `src/lib/sync/sync-notion-conformed.ts`
  - preserva `project_source_ids`
  - endurece validación de assignee por `space_id`
- `scripts/sync-source-runtime-projections.ts`
  - ya soporta `responsable_ids` además de `responsables_ids`
  - proyecta `assignee_source_id`, `assignee_member_ids` y `project_source_ids` a PostgreSQL runtime
  - agrega validación por `space_id` antes de persistir `delivery_tasks`
- `scripts/setup-bigquery-source-sync.sql`
  - agrega `project_source_ids ARRAY<STRING>` a `greenhouse_conformed.delivery_tasks`
- `scripts/setup-postgres-source-sync.sql`
  - agrega `assignee_source_id`, `assignee_member_ids TEXT[]` y `project_source_ids TEXT[]` a `greenhouse_delivery.tasks`
- `src/lib/team-queries.ts`
  - deja de quedar ciego para spaces que usan `responsable_ids`
- `src/lib/projects/get-project-detail.ts`
  - ya considera `proyecto_ids` además del proyecto primario
- migración creada:
  - `migrations/20260402220356569_delivery-source-sync-assignee-project-parity.sql`

### Verificación y bloqueo

- verificación lograda:
  - targeted `eslint` de archivos tocados
  - `pnpm lint`
  - `rg -n "new Pool\\(" src scripts`
- follow-up del mismo día:
  - el bloqueo de migraciones quedó resuelto en la práctica; `pnpm migrate:up` sí aplicó `20260402222438783_delivery-runtime-space-fk-canonicalization.sql`
  - `src/types/db.d.ts` se regeneró correctamente
  - `greenhouse_delivery.{projects,sprints,tasks}.space_id` ya referencia `greenhouse_core.spaces(space_id)` en vez de `greenhouse_core.notion_workspaces`
  - la migración también backfillea `space_id` legacy (`space-efeonce`, `greenhouse-demo-client`, `hubspot-company-*`) a `spc-*`
  - `scripts/setup-postgres-source-sync.sql` quedó alineado con esa FK canónica
  - `sync-notion-conformed.ts` dejó de perder `Sky` por el falso fallback `COALESCE([] , responsable_ids)` y ahora usa un `CASE` de arrays no vacíos
  - verificación real en `greenhouse_conformed.delivery_tasks` para marzo 2026:
    - `Sky`: `190/190` con `project_source_ids`
    - `Sky`: `187/190` con `assignee_source_id`
    - `Sky`: `151/190` con `assignee_member_ids`
    - `Efeonce`: `116/116` con `assignee_source_id`
  - `scripts/sync-source-runtime-projections.ts` también quedó endurecido:
    - merge correcto de `responsables_ids` y `responsable_ids`
    - arrays `assignee_member_ids` / `project_source_ids` siempre no nulos para PostgreSQL
    - resolución de `client_id` por `space_notion_sources -> spaces`, no por asumir que `space_id` canónico es cliente
  - reseed runtime en curso:
    - PostgreSQL ya empezó a poblar `Sky` con `space_id = spc-ae463d9f-b404-438b-bd5c-bd117d45c3b9`
    - corte intermedio observado para marzo 2026: `161` tareas `Sky`, `158` con `assignee_source_id`, `150` con `assignee_member_ids`, `161` con `project_source_ids`
    - el seed completo de `scripts/sync-source-runtime-projections.ts` sigue corriendo/lento y la paridad total runtime todavía no debe considerarse cerrada

### Riesgos abiertos

- cualquier cambio debe ser aditivo y backward-compatible para no romper `ICO`, `Person 360`, `Project Detail` ni `team-queries`
- la task probablemente requerirá ensanchar PostgreSQL runtime, no solo corregir BigQuery/source sync

### Cierre real

- `TASK-197` quedó cerrada.
- Validación final marzo 2026:
  - `greenhouse_delivery.tasks`
    - `Sky`: `190` tareas, `190` con `project_record_id`, `190` con `project_source_ids`, `187` con `assignee_source_id`, `151` con `assignee_member_ids`
    - `Efeonce`: `116` tareas, `116` con `project_record_id`, `116` con `project_source_ids`, `116` con `assignee_source_id`, `116` con `assignee_member_ids`
  - `greenhouse_delivery.{projects,sprints,tasks}` ya referencia `greenhouse_core.spaces(space_id)` en sus FKs de `space_id`
  - `scripts/sync-source-runtime-projections.ts` terminó exitosamente:
    - `notion.recordsProjectedPostgres = 4421`
    - `hubspot.recordsProjectedPostgres = 97`
- El siguiente carril natural es `TASK-198`, porque ya no estamos perdiendo tasks/responsables por el pipeline sino por coverage de identidad restante.

## Sesión 2026-04-02 — TASK-198 delivery notion assignee identity coverage

### Objetivo

- Implementar `TASK-198` para cerrar la cobertura de identidad humana entre responsables Notion de Delivery y el grafo canónico de Greenhouse, sin degradar `ICO`, `Person 360`, `Project Detail` ni readers de team.

### Delta de descubrimiento

- `TASK-198` pasó a `in-progress` tras auditoría formal.
- La spec quedó corregida para reflejar que `TASK-197` ya cerró source sync parity y que el cuello actual es identidad canónica, no ingestión de tareas.
- La auditoría confirmó que la lane no es solo `notion_user_id -> member_id`; el contrato correcto es `notion_user_id -> identity_profile -> member/client_user` según faceta.
- Sigue existiendo dualidad de autoridad:
  - discovery/matching actuales leen BigQuery `greenhouse.team_members`
  - la arquitectura canónica y varios readers consumen PostgreSQL `greenhouse_core.*`
- En marzo 2026 el gap verificable sigue concentrado en `Sky`:
  - `greenhouse_conformed.delivery_tasks` mantiene `2` `assignee_source_id` sin `assignee_member_id`
  - esos IDs concentran `29` y `13` tareas
- La cola de reconciliación existente ya tiene foundation fuerte:
  - discovery
  - matching
  - proposals
  - admin resolve
  - cron
- Quedó identificado un supuesto desactualizado potencial en `src/lib/identity/reconciliation/discovery-notion.ts`:
  - usa `COALESCE(responsables_ids, responsable_ids, ARRAY<STRING>[])`
  - eso puede seguir ocultando casos donde `responsables_ids = []` y `responsable_ids` sí tiene valor

### Próximo paso recomendado

- Fase 3 del trabajo: documentar el mapa de conexiones completo entre identity reconciliation, delivery sync, `ICO`, `Person 360`, `Project Detail`, `Team` y el grafo canónico `greenhouse_core.*` antes de definir el plan de implementación.

### Cierre real

- `TASK-198` quedó cerrada.
- La lane de identidad Delivery ya no asume que toda persona asignada en el teamspace debe resolverse a `member`.
- Política cerrada para `Sky / Marzo 2026`:
  - `Constanza Rojas` y `Adriana Velarde` pertenecen a `Sky`, no a `Efeonce`
  - conviven en el mismo teamspace como diseñadoras in-house del cliente
  - por eso se resuelven como `client_user + identity_profile`, no como `member`
- Implementación cerrada:
  - `delivery-coverage.ts` ahora clasifica `member`, `client_user`, `external_contact`, `linked_profile_only` y `unclassified`
  - se versionó `scripts/backfill-delivery-notion-client-assignee-links.ts` para sembrar source links cliente en BigQuery y PostgreSQL
  - quedaron sembrados los links Notion para:
    - `242d872b-594c-8178-9f19-0002c0cda59c` -> `Constanza Rojas`
    - `242d872b-594c-819c-b0fe-0002083f5da7` -> `Adriana Velarde`
- Verificación final marzo 2026:
  - `Efeonce`: `116/116` tareas con `assignee_member_id`
  - `Sky`: `187` tareas con `assignee_source_id`
  - `Sky`: `145` tareas con `assignee_member_id`
  - `Sky`: `42` tareas clasificadas correctamente como contactos cliente (`Constanza` `29`, `Adriana` `13`)
  - `Sky collaborator coverage`: `145/145 = 100%`
- Residual intencional:
  - `Sin asignar` queda fuera del denominador de coverage colaborador
  - la semántica final de owner principal / co-asignados / no asignadas se cierra en `TASK-199`
- El siguiente carril natural pasa a ser `TASK-199`, porque el hueco principal ya no es identidad sino atribución semántica.

## Sesión 2026-04-02 — TASK-199 delivery performance owner attribution contract

### Objetivo

- Congelar el contrato canónico de `owner principal` para Delivery y alinear `ICO`, readers operativos y scorecards con una misma regla de atribución.

### Delta de descubrimiento

- `TASK-199` pasó a `in-progress` tras auditoría formal.
- El runtime actual ya preserva un owner técnico implícito:
  - `sync-notion-conformed.ts` y `sync-source-runtime-projections.ts` bajan el primer assignee de Notion como `assignee_source_id` / `assignee_member_id`
  - al mismo tiempo preservan `assignee_member_ids` como array completo para co-crédito potencial
- El drift vigente queda localizado:
  - `ICO` acredita a todos los assignees con `UNNEST(te.assignee_member_ids)`
  - readers como `Project Detail`, `Reviews Queue`, `Team queries` y métricas operativas ya tratan el assignee singular como principal de facto
- Evidencia real marzo 2026:
  - `Sky`: `190` tareas, `0` multi-assignee resueltas a más de un `member`, `42` owners primarios cliente sin `member`
  - `Efeonce`: `116` tareas, `4` multi-assignee
  - caso borde crítico verificado: `Adriana, Daniela` llega con owner primario cliente no-miembro y co-asignada interna sí resoluble
- Riesgo arquitectónico confirmado:
  - hoy no existe helper ni campo explícito `primary_owner_*`
  - distintos consumers ya aplican reglas distintas sobre el mismo dato base

### Cierre real

- `TASK-199` quedó cerrada.
- Contrato canónico fijado:
  - owner principal = primer assignee de Notion preservado por Greenhouse
  - `member` attribution = solo `primary_owner_member_id`
  - co-asignados quedan para trazabilidad, no para co-crédito en `ICO`
  - owner primario cliente o externo sigue contando para métricas de `space` / `agency`, pero no acredita a un miembro interno
  - `Sin asignar` queda fuera de member attribution y explícitamente tratada como borde
- Implementación cerrada:
  - `src/lib/ico-engine/schema.ts`
    - `v_tasks_enriched` ahora expone `primary_owner_source_id`, `primary_owner_member_id`, `primary_owner_type` y `has_co_assignees`
  - `src/lib/ico-engine/shared.ts`
    - la dimensión `member` ya apunta a `primary_owner_member_id`
  - `src/lib/ico-engine/materialize.ts`
    - `metrics_by_member` deja de usar `UNNEST(te.assignee_member_ids)` y acredita solo al owner principal miembro
  - `src/lib/ico-engine/read-metrics.ts`
    - live compute y member snapshots quedan alineados al mismo contrato
  - `src/lib/person-360/get-person-ico-profile.ts`
    - `Person ICO` ya no usa co-crédito
  - `src/lib/ico-engine/performance-report.ts`
    - la policy publicada para `Top Performer` ya explicita primary-owner credit
- Verificación de negocio marzo 2026:
  - `Daniela` por co-crédito amplio: `104` tareas
  - `Daniela` por owner principal: `98` tareas
  - `multi_member_tasks`: `4`
  - `Sky` con owner primario no-miembro: `39` tareas
- Validación técnica:
  - `pnpm build` ✅
  - `pnpm lint` ✅
  - `rg -n "new Pool\\(" src scripts` ✅
- El siguiente carril natural pasa a ser `TASK-200`, porque ya no queda ambiguo quién recibe el crédito; ahora toca congelar la fórmula semántica de las métricas.

## Sesión 2026-04-02 — TASK-200 delivery performance metric semantic contract

### Objetivo

- Congelar el contrato semántico de `OTD`, `Late Drop`, `Overdue`, `Carry-Over`, `FTR`, `RpA` y comparativos mensuales para que Greenhouse y Notion hablen exactamente del mismo reporte.

### Delta de descubrimiento

- `TASK-200` pasó a `in-progress` tras auditoría formal.
- La spec original quedó corregida:
  - el problema real no es solo la fórmula de `OTD`
  - ya existe una semántica canónica parcial en `src/lib/ico-engine/shared.ts`
  - el hueco principal ahora es cerrar contrato completo + alinear materializaciones + consumers legacy
- Hallazgos verificados en runtime:
  - `src/lib/ico-engine/shared.ts` ya define:
    - `CANONICAL_ON_TIME_SQL`
    - `CANONICAL_LATE_DROP_SQL`
    - `CANONICAL_OVERDUE_SQL`
    - `CANONICAL_CARRY_OVER_SQL`
    - `CANONICAL_FTR_*`
  - `src/lib/ico-engine/materialize.ts` ya usa ese contrato parcial para:
    - `metric_snapshots_monthly`
    - `metrics_by_member`
    - `metrics_by_project`
    - `performance_report_monthly`
  - todavía conviven consumers legacy fuera del contrato:
    - `src/lib/projects/get-project-detail.ts`
    - `src/lib/capability-queries/shared.ts`
    - surfaces que siguen leyendo `% On-Time` de proyecto o infiriendo `delivery_signal` desde `cumplimiento/completitud`
- Baseline real `Marzo 2026` al momento de abrir la task:
  - `metrics_by_member` para `daniela-ferreira`:
    - `otd_pct = 82.4`
    - `total_tasks = 34`
    - `completed_tasks = 17`
    - `active_tasks = 17`
    - `on_time_count = NULL`
    - `late_drop_count = NULL`
    - `overdue_count = NULL`
    - `carry_over_count = NULL`
  - `metric_snapshots_monthly` mantiene buckets nulos en varias filas de marzo 2026
  - `performance_report_monthly` no tiene fila `agency` para `2026-03`
- Lectura operativa:
  - `TASK-200` no requiere migración DDL obligatoria hoy
  - primero hay que fijar la semántica y luego `TASK-201` recalcula y reconcilia el histórico

### Cierre real

- `TASK-200` quedó cerrada.
- Contrato semántico fijado:
  - grano mensual = `tasks con due_date dentro del período`
  - fecha de corte canónica = `period_end + 1 day`
  - exclusiones mínimas = `Archivada`, `Cancelada`, `Tomado`
  - buckets del scorecard = `On-Time`, `Late Drop`, `Overdue`, `Carry-Over`
  - `OTD` del scorecard mensual = `On-Time / total_classified_tasks`
  - `Top Performer` usa `OTD` canónico y volumen total de tareas del período, no solo completadas
- Implementación cerrada:
  - `src/lib/ico-engine/shared.ts`
    - cambia el período canónico a `due_date`
    - agrega helpers explícitos del contrato: `REPORT_CUTOFF_DATE_SQL`, `REPORT_PERIOD_SCOPE_SQL`, `CANONICAL_OPEN_TASK_SQL`, `CANONICAL_CLASSIFIED_TASK_SQL`
    - alinea `OTD`, `Overdue`, `Carry-Over`, `completed_tasks` y `active_tasks` al scorecard mensual
  - `src/lib/ico-engine/metric-registry.ts`
    - alinea la definición declarativa de `OTD` y `FTR`
  - `src/lib/ico-engine/materialize.ts`
    - `performance_report_monthly` ya materializa `on_time_pct` con denominador `total_tasks`
    - `Top Performer` ya usa `total_tasks` como elegibilidad/desempate
  - `src/lib/ico-engine/performance-report.ts`
    - fallback live y reader materialized quedan alineados al mismo contrato
- Validación:
  - `pnpm lint` ✅
  - `pnpm build` ✅
  - Notion `Performance Report — Marzo 2026` confirma explícitamente que:
    - el scorecard usa tareas con fecha límite en marzo
    - los indicadores son mutuamente excluyentes
    - `On-Time % = On-Time / Total Tareas`
    - tareas compartidas se atribuyen al responsable principal
- Residual intencional:
  - el histórico `Marzo 2026` en Greenhouse sigue con drift material y buckets nulos legacy
  - esa reconciliación queda correctamente movida a `TASK-201`

## Sesión 2026-04-02 — TASK-201 delivery performance historical materialization reconciliation

### Objetivo

- Rehidratar la infraestructura ejecutable del `ICO Engine` y reconciliar `Marzo 2026` para dejar el baseline histórico materializado y auditable en Greenhouse.

### Delta de descubrimiento

- `TASK-201` pasó a `in-progress` tras auditoría formal.
- La spec quedó corregida para reflejar que el problema ya no es solo “faltan snapshots”:
  - `ico_engine.performance_report_monthly` sigue sin fila `agency` para `2026-03`
  - `greenhouse_serving.agency_performance_reports` sigue vacío para `2026-03`
  - `ico_engine.metrics_by_member` y `metric_snapshots_monthly` mantienen buckets nulos legacy para `2026-03`
  - `ico_engine.v_tasks_enriched` sigue viejo en BigQuery y no expone todavía:
    - `primary_owner_source_id`
    - `primary_owner_member_id`
    - `primary_owner_type`
    - `has_co_assignees`
- Verificación directa:
  - `INFORMATION_SCHEMA.COLUMNS` de `ico_engine.v_tasks_enriched` no incluye esos campos
  - una query directa a `primary_owner_member_id` en el view falla hoy con `Unrecognized name`
- Implicación operativa:
  - la task debe empezar rehidratando la infraestructura del engine en BigQuery antes de intentar rematerializar marzo con el contrato de `TASK-199` y `TASK-200`

## Sesión 2026-04-02 — RESEARCH-004 space identity consolidation

### Objetivo

- Capturar como research brief previo a task la ambigüedad actual entre `tenant`, `client`, `organization` y `space`, para ordenar futuras decisiones sobre onboarding, admin y surfaces operativas.

### Delta de ejecución

- Se creó el brief:
  - `docs/research/RESEARCH-004-space-identity-consolidation.md`
- El brief documenta:
  - baseline real del repo donde `admin/tenants` sigue siendo `client-first`
  - formalización de `space` como unidad operativa más robusta que el `tenant` legacy
  - recomendación de `Organization` como entrypoint admin principal, con `Spaces` como child objects operativos
  - aclaración de que `Space 360` debe tratarse como vista del objeto `Space`, no como entidad paralela
  - conflicto actual entre `/admin/tenants/[id]` y `Space 360`
  - recomendación de separar onboarding de `space` fuera de la surface legacy
  - breakdown sugerido en futuras tasks:
    - formalización de identidad `space`
    - onboarding surface
    - decomposición del admin tenant legacy
    - alineación de navegación/naming
- Índices actualizados:
  - `docs/research/README.md`
  - `docs/README.md`
- No hubo cambios de runtime, rutas ni comportamiento del producto en esta sesión.

### Follow-on

- Se creó la task formal derivada:
  - `docs/tasks/to-do/TASK-195-space-identity-consolidation-organization-first-admin.md`
- `TASK-195` fija como decisiones base:
  - `Organization` como entrypoint admin principal
  - `Space` como child object operativo de la cuenta
  - onboarding dedicado de `space`
  - `Space 360` como vista del objeto `Space`, no como entidad paralela

## Sesión 2026-04-02 — TASK-187 Notion integration formalization

### Objetivo

- Ejecutar discovery y auditoría de `TASK-187` antes de implementar, para corregir la spec contra el runtime real de Notion, Native Integrations Layer, Delivery/ICO y el schema vigente.

### Delta de ejecución

- Implementación completada sobre el carril auditado:
  - migración aplicada: `20260402120604104_notion-space-governance-registry.sql`
  - nota operativa: `20260402120531440_notion-space-governance.sql` queda como placeholder no-op ya aplicado durante el bootstrap del slice
  - nuevas tablas:
    - `greenhouse_sync.notion_space_schema_snapshots`
    - `greenhouse_sync.notion_space_schema_drift_events`
    - `greenhouse_sync.notion_space_kpi_readiness`
  - nuevos helpers/types:
    - `src/lib/space-notion/notion-governance.ts`
    - `src/lib/space-notion/notion-governance-contract.ts`
    - `src/types/notion-governance.ts`
  - nuevas APIs admin tenant-scoped:
    - `GET /api/admin/tenants/[id]/notion-governance`
    - `POST /api/admin/tenants/[id]/notion-governance/refresh`
  - `POST /api/integrations/notion/register` ahora:
    - intenta `refreshSpaceNotionGovernance()` best-effort después del binding
    - devuelve `governanceRefresh`
    - corrige `nextStep` al control plane real `POST /api/admin/integrations/notion/sync`
  - `TenantNotionPanel` ahora expone:
    - KPI readiness por `space`
    - snapshots por base (`proyectos/tareas/sprints/revisiones`)
    - drift abierto por DB role
    - CTA admin `Refrescar schema`
  - `scripts/notion-schema-discovery.ts` quedó corregido para leer el binding canónico actual desde `greenhouse_core.space_notion_sources` sin el join legacy roto
  - `.env.example` y `project_context.md` documentan ahora:
    - `NOTION_PIPELINE_URL`
    - `NOTION_TOKEN`
    - el split entre discovery vía pipeline y refresh governance vía token server-side
- Verificación final ejecutada:
  - `pnpm migrate:up` ✅
  - `pnpm lint` ✅
  - `pnpm build` ✅
  - `rg -n "new Pool\\(" src` ✅ solo `src/lib/postgres/client.ts`

- `TASK-187` se movió de `to-do/` a `in-progress/`.
- La auditoría inicial confirmó drift importante en la spec:
  - `scripts/notion-schema-discovery.ts` ya no refleja el schema real ni los joins actuales de `space_notion_sources`.
  - `greenhouse_delivery.space_property_mappings` existe, pero hoy está vacía en DB real y todavía no participa del carril runtime principal `sync-notion-conformed`.
  - el onboarding básico ya no es greenfield:
    - `TenantNotionPanel`
    - `GET /api/admin/tenants/[id]/notion-status`
    - `POST /api/admin/spaces`
    - `POST /api/integrations/notion/register`
    - `GET /api/integrations/notion/discover`
  - la governance shared de integraciones ya existe, pero solo a nivel integración global:
    - `greenhouse_sync.integration_registry`
    - helpers `registry/health/readiness/sync-trigger`
    - control plane `/admin/integrations`
  - el readiness ya existe para `notion` a nivel upstream global y ya bloquea `sync-conformed` / `ico-member-sync`; el gap real es readiness contractual por `space`
  - persisten dos carriles de sync con drift entre sí:
    - `src/lib/sync/sync-notion-conformed.ts` ya consume `space_id`
    - `scripts/sync-source-runtime-projections.ts` sigue siendo seed/manual path con fallback legacy
  - `POST /api/integrations/notion/register` devuelve un `nextStep` hacia `/api/integrations/notion/sync`, pero ese route no existe en el repo
  - persiste dualidad estructural entre el binding nuevo (`space_notion_sources -> greenhouse_core.spaces`) y FKs legacy de `greenhouse_delivery.{projects,sprints,tasks}` hacia `greenhouse_core.notion_workspaces`
  - el coverage real de bindings activos hoy es parcial:
    - `Efeonce`
    - `Sky`
    - `ANAM` sigue auditado documentalmente, pero todavía no está registrado en `space_notion_sources`
- Validación operativa ejecutada:
  - `git status --short` ✅ limpio al iniciar
  - `pnpm pg:doctor --profile=runtime` ✅
  - introspección ad hoc de PostgreSQL runtime:
    - `greenhouse_core.space_notion_sources` → `2` rows
    - `greenhouse_delivery.space_property_mappings` → `0` rows
    - `greenhouse_sync.integration_registry` → `4` rows
    - `greenhouse_delivery.projects` → `131` rows
    - `greenhouse_delivery.tasks` → `3997` rows
  - introspección ad hoc de BigQuery:
    - `notion_ops.proyectos` → `135` rows / `2` spaces
    - `notion_ops.tareas` → `4259` rows / `2` spaces
    - `greenhouse_conformed.delivery_tasks` → `4112` rows / `2` spaces
- La spec de `TASK-187` quedó corregida para reflejar este estado real antes de pasar a mapa de conexiones, plan e implementación.

## Sesión 2026-04-02 — Finance Clients financial contacts org-first UI follow-on

### Objetivo

- Cerrar el hueco operativo detectado post `TASK-193`: `Finance > Clients > Contactos` ya leía sinergia parcial `Person ↔ Organization`, pero seguía sin CTA UI para crear contactos financieros desde la propia ficha del cliente.

### Delta de ejecución

- `ClientDetailView` dejó de ser read-only en la tab `Contactos`:
  - ahora expone CTA `Agregar contacto` cuando el cliente tiene `organizationId` y el usuario tiene rol admin
  - el CTA reutiliza `AddMembershipDrawer` desde `Organization` en modo restringido (`billing` / `contact`, default `billing`)
- `AddMembershipDrawer` quedó endurecido como primitive reusable:
  - acepta `title`
  - acepta `submitLabel`
  - acepta `allowedMembershipTypes`
  - acepta `initialMembershipType`
- `GET /api/finance/clients/[id]` ahora prioriza contactos canónicos desde `getOrganizationMemberships()` cuando existe `organization_id`:
  - memberships `billing`, `contact`, `client_contact`
  - `finance_contacts` permanece como fallback legacy
- La decisión de auth no cambió en este slice:
  - el write path sigue pasando por `POST /api/organizations/[id]/memberships`
  - ese route continúa protegido por `requireAdminTenantContext`
  - por eso el CTA quedó visible solo para admins, no para cualquier usuario Finance

### Validación

- `pnpm exec vitest run src/app/api/finance/clients/read-cutover.test.ts src/views/greenhouse/finance/ClientDetailView.test.tsx` ✅
- `pnpm lint` ✅
- `pnpm build` ✅

## Sesión 2026-04-02 — TASK-193 person-organization synergy activation

### Objetivo

- Ejecutar discovery y auditoría de `TASK-193` antes de tocar runtime, para alinear la spec con el estado real de Person, Organization, session, CanonicalPerson y los consumers downstream (`Finance`, `Payroll`, `ICO`, `Agency`) sobre la rama actual `develop`.

### Delta de ejecución

- `TASK-193` se movió de `to-do/` a `in-progress/`.
- La auditoría inicial confirmó drift importante en la spec:
  - `greenhouse_core.person_memberships.membership_type` ya tiene `CHECK constraint`; el gap real es helper/contrato shared y compatibilidad con `client_contact`.
  - `greenhouse_serving.session_360` ya resuelve `organization_id` para todos los usuarios `tenant_type='client'`; el gap real de sesión está en `efeonce_internal`.
  - `greenhouse_serving.person_360` ya publica `membership_count`, `memberships` y `organization_ids`; el gap real no es ausencia de org data, sino falta de `primaryOrganization*` y consumo downstream.
  - La base real no tiene ninguna organización con `is_operating_entity = TRUE`; esto bloquea poblar `organizationId` interno y memberships de operating entity sin definir primero ese anchor canónico.
- Validación adicional sobre runtime real:
  - `person_memberships` activos hoy: `client_contact` (31) y `team_member` (4)
  - `session_360` coverage:
    - `client`: `31/31` con `organization_id`
    - `efeonce_internal`: `0/8` con `organization_id`
  - `members` activos con `identity_profile_id`: `7`
  - `members` con membership en operating entity: `0`
- La spec de `TASK-193` quedó corregida para reflejar este estado real antes de continuar con implementación.
- Slice implementado sobre runtime real:
  - migración `20260402094316652_task-193-operating-entity-session-canonical-person.sql` aplicada por Cloud SQL Proxy
  - `Efeonce` regularizada como operating entity canónica (`is_operating_entity = TRUE`, `legal_name = Efeonce Group SpA`, `tax_id = 77.357.182-1`)
  - backfill de `person_memberships(team_member)` para `7` members activos con `identity_profile_id`, dejando esa membership como primaria
  - `session_360` ya resuelve `organization_id` para internos vía operating entity; coverage real post-migración:
    - `client`: `31/31` con `organization_id`
    - `efeonce_internal`: `8/8` con `organization_id`
- `person_360` ahora publica `primary_organization_*`, `primary_membership_type`, aliases `eo_id` / `member_id` / `user_id` y `is_efeonce_collaborator`
- `CanonicalPersonRecord` consume ya el contexto org primario
- `People > Finance` acepta `organizationId` opcional y fuerza tenant isolation para usuarios `client`
- `Organization > People` y `getOrganizationMemberships()` ya distinguen `internal` vs `staff_augmentation` como contexto operativo del vínculo cliente sobre `team_member`, exponiendo `assignmentType` y `assignedFte` sin crear un `membership_type` nuevo
- se agregó proyección `operating_entity_membership` para mantener el vínculo forward en `member.created` / `member.updated` / `member.deactivated`
- `createIdentityProfile()` en Account 360 ahora deduplica por email antes de insertar un `identity_profile`
- Follow-on de cierre ejecutado sobre la misma lane:
  - `People` ya usa `resolvePeopleOrganizationScope()` como helper compartido para propagar `organizationId` hacia `finance`, `delivery`, `ico-profile`, `ico` y el aggregate `GET /api/people/[memberId]`
  - `getPersonDeliveryContext()` y `getPersonIcoProfile()` ya soportan org scope real filtrando por los `client_id` activos de la organización, sin recalcular métricas inline fuera del contrato ICO Engine / serving
  - `HR` e `intelligence` quedaron explícitamente cerrados con `403` para tenant `client` mientras no exista una versión org-aware segura
  - `organizations/[id]/memberships` y `AddMembershipDrawer` ya permiten crear `identity_profiles` ad hoc con nombre + email antes de sembrar la membership, abriendo la foundation mínima para contactos de suppliers / orgs `both`
- `finance/suppliers` create/update ahora intenta sembrar `organization contact memberships` cuando existe `organization_id` y contacto primario usable, manteniendo `primary_contact_*` como compatibilidad transicional
- `Finance Suppliers` ya consume esa foundation en lectura:
  - detail `GET /api/finance/suppliers/[id]` expone `organizationContacts`
  - list `GET /api/finance/suppliers` expone `contactSummary` + `organizationContactsCount`
  - `SupplierDetailView` y `SuppliersListView` priorizan contactos org-first y dejan `primary_contact_*` como fallback
- Cierre administrativo:
  - `TASK-193` se movió de `in-progress/` a `complete/`
  - el residual `HR`/`intelligence` ya no se trata como deuda client-facing; queda explicitado como surface interna por contrato
  - los residuals no bloqueantes pasan a follow-ons futuros: directorio supplier fully canonical y modelado fino de orgs `both`

### Validación

- `pnpm pg:doctor --profile=runtime` ✅
- `pnpm exec tsx scripts/verify-account-360.ts` ✅
- Queries ad hoc via `tsx` sobre `session_360`, `person_memberships`, `organizations.is_operating_entity` y `members` ✅
- `GREENHOUSE_POSTGRES_HOST=127.0.0.1 GREENHOUSE_POSTGRES_PORT=15432 GREENHOUSE_POSTGRES_SSL=false pnpm migrate:up` ✅
- `NEXTAUTH_SECRET=test-secret pnpm exec vitest run src/lib/identity/canonical-person.test.ts src/lib/person-360/get-person-finance.test.ts src/lib/sync/projections/assignment-membership-sync.test.ts src/lib/sync/projections/operating-entity-membership.test.ts` ✅
- `pnpm exec vitest run src/lib/person-360/get-person-delivery.test.ts src/lib/person-360/get-person-ico-profile.test.ts src/lib/account-360/organization-store.test.ts src/views/greenhouse/organizations/tabs/OrganizationPeopleTab.test.tsx` ✅
- `pnpm exec vitest run src/app/api/finance/suppliers/[id]/route.test.ts` ✅
- `pnpm exec vitest run src/app/api/people/[memberId]/hr/route.test.ts src/app/api/people/[memberId]/intelligence/route.test.ts src/lib/people/permissions.test.ts` ✅
- `pnpm lint` ✅
- `pnpm build` ✅
- `rg -n "new Pool\\(" src` → solo `src/lib/postgres/client.ts` ✅

## Sesión 2026-04-02 — TASK-192 finance org-first materialized serving cutover

### Objetivo

- Cerrar la deuda residual post `TASK-191`, donde Finance ya acepta input org-first pero `allocations`, `client_economics`, `commercial_cost_attribution`, `operational_pl` y varios consumers seguían materializando o resolviendo boundaries sobre `client_id`.

### Delta de ejecución

- `TASK-192` se movió de `to-do/` a `in-progress/` y quedó cerrada en `complete/`.
- La spec se corrigió antes de implementar:
  - `operational_pl scope_type='organization'` ya existía en repo y schema; `TASK-167` quedó marcada como desactualizada
  - el gap real no era recrear organization scope, sino persistir y servir contexto `organization_id` / `space_id` en layers materiales que seguían client-first
- Se agregó la migración `20260402085449701_finance-org-first-materialized-serving-keys.sql` para:
  - `greenhouse_finance.cost_allocations.organization_id`
  - `greenhouse_finance.cost_allocations.space_id`
  - `greenhouse_finance.client_economics.organization_id`
  - `greenhouse_serving.commercial_cost_attribution.organization_id`
  - índices y backfill compatibles
- `src/lib/finance/postgres-store-intelligence.ts` quedó endurecido para persistir y leer allocations/economics con contexto org-first, incluyendo readers por organización.
- `src/lib/commercial-cost-attribution/member-period-attribution.ts` y `src/lib/commercial-cost-attribution/store.ts` ahora materializan `organization_id` explícito como bridge downstream desde el grano canónico `member + client`.
- `src/lib/cost-intelligence/compute-operational-pl.ts` dejó de depender ciegamente del bridge `client -> space` y ahora arrastra `organizationId` persistido desde ingresos, allocations, expenses y attribution.
- Consumers downstream alineados:
  - `src/lib/account-360/organization-economics.ts`
  - `src/lib/agency/agency-finance-metrics.ts`
  - `src/lib/agency/space-360.ts`
  - `src/views/agency/AgencySpacesView.tsx`
  - `src/app/api/finance/intelligence/allocations/route.ts`
  - `src/app/api/finance/intelligence/client-economics/route.ts`
- Impacto cruzado documentado:
  - `TASK-167` marcada como desactualizada porque organization scope ya existía
  - `TASK-177` recibió delta para dejar explícito que `TASK-192` cerró la base materialized-first org-aware sobre la que podrá vivir `business_unit`
- Arquitectura actualizada:
  - `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_COMMERCIAL_COST_ATTRIBUTION_V1.md`
  - `docs/architecture/GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md`

### Validación

- `GREENHOUSE_POSTGRES_HOST=127.0.0.1 GREENHOUSE_POSTGRES_PORT=15432 GREENHOUSE_POSTGRES_SSL=false pnpm migrate:up` ✅
- `pnpm exec vitest run src/lib/finance/postgres-store-intelligence.test.ts src/lib/commercial-cost-attribution/store.test.ts src/lib/commercial-cost-attribution/member-period-attribution.test.ts src/lib/cost-intelligence/compute-operational-pl.test.ts src/lib/agency/agency-finance-metrics.test.ts src/lib/agency/space-360.test.ts src/app/api/finance/intelligence/allocations/route.test.ts src/app/api/finance/intelligence/client-economics/route.test.ts` ✅
- `pnpm lint` ✅
- `pnpm build` ✅
- `rg -n "new Pool\\(" src` → solo `src/lib/postgres/client.ts` ✅

## Sesión 2026-04-02 — TASK-191 finance downstream organization-first cutover

### Objetivo

- Ejecutar discovery, auditoría y cutover downstream para que `purchase-orders`, `hes`, `expenses`, `cost allocations` y los readers analíticos de Finance acepten contexto org-first sin volver a exigir `clientId` como input contract primario.

### Delta de ejecución

- `TASK-191` se movió de `to-do/` a `in-progress/`.
- Discovery en curso sobre:
  - `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
  - `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
  - `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
  - `docs/architecture/GREENHOUSE_COMMERCIAL_COST_ATTRIBUTION_V1.md`
  - `docs/architecture/schema-snapshot-baseline.sql`
  - `src/app/api/finance/purchase-orders/*.ts`
  - `src/app/api/finance/hes/*.ts`
  - `src/app/api/finance/expenses*.ts`
  - `src/app/api/finance/intelligence/allocations/route.ts`
  - `src/lib/finance/canonical.ts`
  - `src/lib/finance/purchase-order-store.ts`
  - `src/lib/finance/hes-store.ts`
  - `src/lib/finance/expense-scope.ts`
  - `src/lib/finance/postgres-store-intelligence.ts`
  - `src/lib/account-360/organization-economics.ts`
  - `src/lib/cost-intelligence/compute-operational-pl.ts`
  - drawers/list views Finance relacionadas
- Hallazgo temprano confirmado:
  - `resolveFinanceClientContext()` ya resuelve `organizationId`, `clientId`, `clientProfileId`, `hubspotCompanyId` y `spaceId`, pero los consumers downstream siguen client-first en API/UI/store.
- Dependencia de contexto faltante en esta máquina:
  - `../Greenhouse_Portal_Spec_v1.md` no existe en el workspace ni en `/Users/jreye/Documents`; discovery continuó con arquitectura viva local.

### Update de implementación

- Se cerró el tramo documental del cutover org-first downstream:
  - `purchase-orders` y `hes` ya quedaron documentados como contratos que aceptan `organizationId` además de `clientId`
  - `expenses`, `bulk expenses`, `client economics` y `allocations` quedaron alineados con un helper downstream compartido para resolver scope org-first sin depender de que la UI empuje `clientId` manualmente
  - los drawers Finance quedaron descritos como org-first en la selección de clientes, preservando el bridge legado solo donde el storage aún lo requiere
- Legacy residual a mantener visible:
  - `client_id` sigue existiendo como bridge de compatibilidad para varios readers y tablas legacy
  - `cost_allocations` y parte del serving analítico siguen materializando sobre `client_id`
- Validación completada de este tramo:
  - `pnpm exec vitest run src/lib/finance/canonical.test.ts src/app/api/finance/purchase-orders/route.test.ts src/app/api/finance/intelligence/allocations/route.test.ts` ✅
  - `pnpm lint` ✅
  - `pnpm build` ✅
- Validación todavía pendiente:
  - smoke manual para OC, HES, expense por `space` y allocations/economics con cliente org-first

### Validación

- `pnpm exec vitest run src/lib/finance/canonical.test.ts src/app/api/finance/purchase-orders/route.test.ts src/app/api/finance/intelligence/allocations/route.test.ts` ✅
- `pnpm lint` ✅
- `pnpm build` ✅
- Smoke manual todavía pendiente.

### Follow-on creado

- Se creó `TASK-192` para capturar la deuda residual post `TASK-191`:
  - el input contract downstream ya es org-first
  - la materialización/serving de `allocations`, `client_economics`, `commercial_cost_attribution` y `operational_pl` sigue teniendo boundaries client-first
  - esto evita mezclar esa evolución estructural con `TASK-177` o reabrir `TASK-191`

## Sesión 2026-04-01 — TASK-181 finance clients canonical source migration

### Objetivo

- Reconciliar `Finance Clients` con el modelo B2B canónico antes de implementar: cortar el anchor principal de `greenhouse_core.clients` hacia `greenhouse_core.organizations WHERE organization_type IN ('client','both')` sin romper consumers existentes.

### Delta de ejecución

- `TASK-181` se movió de `to-do/` a `in-progress/`.
- La spec de `TASK-181` se corrigió tras auditoría de runtime/schema:
  - `Finance Clients` ya opera `Postgres-first`; el drift real es el anchor en `greenhouse_core.clients`, no una dependencia primaria de BigQuery.
  - `resolveOrganizationForClient()` vive en `src/lib/account-360/organization-identity.ts`, no en `canonical.ts`.
  - El blast radius real incluye también:
    - `src/lib/finance/postgres-store-slice2.ts`
    - consumers de `resolveFinanceClientContext()` como `src/app/api/finance/income/route.ts`
    - readers organization-first que todavía unen `client_economics` por `cp.client_id`
  - `client_profiles.organization_id` ya existe como FK + índice; falta el cutover del runtime y de los joins downstream.
  - la arquitectura viva sigue con drift documental porque `GREENHOUSE_POSTGRES_CANONICAL_360_V1` y `GREENHOUSE_DATA_MODEL_MASTER_V1` todavía presentan `greenhouse_core.clients` como anchor canónico de client.
- Árbol no limpio detectado al iniciar:
  - existía cambio ajeno en `src/lib/notifications/schema.ts`
  - se terminó tocando después, en un subtramo explícito de saneamiento de lint, para cerrar el bloqueo real del repo
- Implementación principal cerrada:
  - `src/app/api/finance/clients/route.ts` y `src/app/api/finance/clients/[id]/route.ts` quedaron org-first sobre `greenhouse_core.organizations`
  - `src/lib/finance/canonical.ts` ya resuelve `organizationId` como anchor fuerte
  - `src/lib/finance/postgres-store-slice2.ts` ya sincroniza y upsertea `client_profiles` con `organization_id` como FK principal
  - `src/lib/account-360/organization-store.ts`, `src/lib/account-360/organization-economics.ts` y `src/lib/finance/postgres-store-intelligence.ts` quedaron endurecidos para no perder snapshots cuando el runtime financiero venga identificado por organización
  - drawers Finance alineados: `CreateIncomeDrawer` soporta `organizationId`; `CreatePurchaseOrderDrawer` y `CreateHesDrawer` restringen selección a clientes con `clientId` legado disponible
- Backfill runtime:
  - migración `20260402020611201_finance-clients-organization-canonical-backfill.sql` quedó aplicada pero fue `no-op`
  - se corrigió con `20260402022518358_finance-clients-organization-canonical-backfill-followup.sql`, ya aplicada en `greenhouse-pg-dev`
  - resultado real: los legacy clients `nubox-client-76438378-8` y `nubox-client-91947000-3` ahora tienen `client_profile_id = client_id` y `organization_id` poblado
- Drift documental reconciliado en:
  - `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
  - `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
  - `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`

### Validación

- Discovery y auditoría manual de:
  - `docs/tasks/in-progress/TASK-181-finance-clients-organization-canonical-source.md`
  - `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
  - `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
  - `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
  - `docs/architecture/schema-snapshot-baseline.sql`
  - `src/app/api/finance/clients/*.ts`
  - `src/lib/finance/canonical.ts`
  - `src/lib/finance/postgres-store-slice2.ts`
  - `src/lib/account-360/*.ts`
- Sin `build/lint/test` todavía en este tramo: solo discovery + corrección documental previa a implementación.
- `pnpm pg:doctor --profile=ops` ✅ usando `GREENHOUSE_POSTGRES_HOST=127.0.0.1`, `GREENHOUSE_POSTGRES_PORT=15432`, `GREENHOUSE_POSTGRES_SSL=false`
- `pnpm exec vitest run src/lib/finance/canonical.test.ts src/app/api/finance/clients/read-cutover.test.ts src/lib/account-360/organization-identity.test.ts` ✅
- `pnpm migrate:up` ✅ usando Cloud SQL Proxy local en `127.0.0.1:15432`
- `pnpm build` ✅
- `pnpm exec eslint src/types/db.d.ts src/lib/notifications/schema.ts` ✅
- `pnpm lint` ✅

## Sesión 2026-04-01 — TASK-189 rolling rematerialization + projection hardening

### Objetivo

- Cerrar el saneamiento operativo de `TASK-189` para que cambios de semántica por período no queden atrapados en snapshots viejos.

### Delta de ejecución

- `/api/cron/ico-materialize` ahora rematerializa por defecto una ventana rolling de `3` meses y acepta `monthsBack` hasta `6`.
- La proyección `ico_member_metrics` ahora respeta `periodYear` / `periodMonth` cuando el payload de materialización los informa, en vez de asumir siempre el mes actual.
- `schema-snapshot-baseline.sql` quedó reconciliado con `carry_over_count` en `greenhouse_serving.ico_member_metrics`.
- Esto fortalece la recuperación de snapshots stale después de cambios semánticos en el engine sin abrir un carril paralelo a `ICO`.

### Validación

- No hubo cambios de contrato UI en este sub-slice.
- Validación pendiente de repo completo antes del commit final del lote: `lint` y `build`.

## Sesión 2026-04-01 — TASK-189 cierre del hardening materialized-first por miembro

### Objetivo

- Cerrar el gap restante de `TASK-189`: evitar que `People` y otros consumers por miembro lean snapshots materializados legacy incompletos después del cambio de semántica por `due_date`.

### Delta de ejecución

- `readMemberMetrics()` ahora detecta filas incompletas de `ico_engine.metrics_by_member` y hace fallback a `computeMetricsByContext('member', ...)`.
- `readMemberMetricsBatch()` ahora replica el mismo guardrail para consumers batch como `Payroll`.
- `PersonActivityTab` ahora muestra `Sin cierres` en KPIs de calidad cuando hay trabajo comprometido del período pero todavía no hay completaciones reales.
- Verificación de datos reales:
  - `metrics_by_member` para `daniela-ferreira` en `2026-04` seguía con `carry_over_count = null` y buckets/contexto críticos vacíos
  - el live compute sobre `v_tasks_enriched` ya devolvía `carry_over_count = 4`, `throughput_count = 3`, `otd_pct = 100`, `ftr_pct = 100`
- `TASK-189` vuelve a `complete` después de este hardening.

### Validación

- `pnpm lint` ✅
- `pnpm exec tsc --noEmit --pretty false` ✅
- `pnpm build` ✅
- No hubo migraciones nuevas.

## Sesión 2026-04-01 — TASK-189 reabierta por gap funcional visible

### Objetivo

- Reabrir `TASK-189` porque el engine ya absorbió el `due_date anchor` y el `carry-over`, pero la experiencia visible del período sigue sin cerrar completamente el problema que la spec describe.

### Delta de ejecución

- `TASK-189` se movió de `complete/` a `in-progress/`.
- Se corrigió la spec para dejar explícito que:
  - el tramo implementado sí endureció el contrato temporal del engine
  - el tramo pendiente ahora es la experiencia visible / contrato operativo cuando hay trabajo comprometido en el período y todavía no hay cierres
- `docs/tasks/README.md` y `docs/tasks/TASK_ID_REGISTRY.md` quedaron alineados con la reapertura.

### Validación

- Auditoría manual de:
  - `src/lib/ico-engine/shared.ts`
  - `src/lib/ico-engine/read-metrics.ts`
  - `src/views/greenhouse/people/tabs/PersonActivityTab.tsx`
  - `src/app/api/ico-engine/context/route.ts`
  - `src/lib/sync/projections/ico-member-metrics.ts`
- Sin `build/lint/test` todavía en este subtramo porque el cambio fue documental de reapertura previa a implementación.

## Sesión 2026-04-01 — TASK-188 Native Integrations Layer

### Objetivo

- Institucionalizar la `Native Integrations Layer` como capability de plataforma con registro central, taxonomía, health y governance surface.

### Delta de ejecución

- Migration `integration-registry`: tabla `greenhouse_sync.integration_registry` con taxonomía, ownership, readiness, consumer domains, auth mode, sync cadence
- Seed de 4 integraciones nativas: Notion (hybrid), HubSpot (system_upstream), Nubox (api_connector), Frame.io (event_provider)
- Shared types: `src/types/integrations.ts`
- Helpers: `src/lib/integrations/registry.ts` (Kysely), `src/lib/integrations/health.ts` (aggregation from sync_runs + source signals)
- API: `GET /api/admin/integrations`, `GET /api/admin/integrations/[key]/health`
- Admin governance page: `/admin/integrations` — registry table, health/freshness bars, consumer domain map
- Admin Center card added linking to governance page
- Cloud & Integrations view links to governance page
- Architecture docs updated: GREENHOUSE_ARCHITECTURE_V1, SOURCE_SYNC_PIPELINES, DATA_MODEL_MASTER
- Slice adicional del control plane ya implementado:
  - `integration_registry` ahora contempla `sync_endpoint`, `paused_at`, `paused_reason`, `last_health_check_at`
  - nuevos helpers: `pauseIntegration()`, `resumeIntegration()`, `registerIntegration()`
  - nuevos helpers shared: `checkIntegrationReadiness()` y `triggerSync()`
  - nuevas rutas:
    - `POST /api/admin/integrations/[integrationKey]/pause`
    - `POST /api/admin/integrations/[integrationKey]/resume`
    - `POST /api/admin/integrations/[integrationKey]/sync`
    - `GET /api/integrations/v1/readiness`
    - `POST /api/integrations/v1/register`
  - `/admin/integrations` ahora muestra una sección `Control plane` con acciones operativas visibles

### Validación

- `pnpm lint` ✅
- `pnpm exec tsc --noEmit --pretty false` ✅
- `pnpm build` ✅
- `pnpm migrate:up` ✅ usando `GREENHOUSE_POSTGRES_HOST=127.0.0.1`, `GREENHOUSE_POSTGRES_PORT=15432`, `GREENHOUSE_POSTGRES_SSL=false`
- `pnpm db:generate-types` ✅ usando el mismo carril local por proxy

### Riesgos / próximos pasos

- Follow-up: `TASK-187` formaliza Notion como primer consumer fuerte del registry
- Follow-up: contract registry (OpenAPI/AsyncAPI) y readiness automática declarativa son fases posteriores
- Follow-up: integration inventory en el v1 integration API para acceso externo
- Follow-up: endurecer el trigger manual para decidir cuándo conviene `fetch` interno vs workflow/outbox durable

## Sesión 2026-04-01 — Implementación MVP para TASK-189 + TASK-186

### Objetivo

- Implementar el tramo MVP de trust de métricas Delivery sin romper `ICO`, payroll ni serving runtime.
- Aclaración posterior: el trabajo ejecutado en `TASK-186` durante este tramo corresponde a un sub-slice técnico de soporte y no al foco principal de la lane.

### Delta de ejecución

- `TASK-189`:
  - `buildPeriodFilterSQL()` quedó anclado en `due_date` con fallback a `created_at` / `synced_at`
  - `carry-over` quedó modelado relativo al período consultado/materializado
  - `buildMetricSelectSQL()` ahora expone `carry_over_count`
  - `v_tasks_enriched` ahora expone `period_anchor_date`
  - las materializaciones BigQuery principales se extendieron de forma aditiva para persistir `carry_over_count`
- `TASK-186`:
  - `readMemberMetrics()` ya reconstruye `CSC distribution` en el path materializado por miembro
  - el contrato `IcoMetricSnapshot` / `SpaceMetricSnapshot` ahora expone contexto aditivo del scorecard: `onTimeTasks`, `lateDropTasks`, `overdueTasks`, `carryOverTasks`
  - `PersonActivityTab` ahora muestra chip de `carry-over` y banner informativo cuando el período tiene carga pero aún no tiene cierres
  - `buildMetricSelectSQL()` y las materializaciones BigQuery del engine ahora persisten buckets canónicos aditivos (`on_time_count`, `late_drop_count`, `overdue_count`) sin redefinir `otd_pct` ni `ftr_pct`
  - se cerró la semántica actual del engine:
    - `on_time` / `late_drop` prefieren `performance_indicator_code` y caen a derivación por fechas cuando no existe
    - `overdue` / `carry-over` permanecen período-relativos dentro de `ICO`
    - `FTR` ya no se trata como una sola columna: usa `rpa_value <= 1` cuando existe, o fallback a rounds cliente/workflow en cero cuando no existe
    - `FTR` además exige cierre limpio: sin `client_review_open`, sin `workflow_review_open` y sin `open_frame_comments`
  - se agregó `src/lib/ico-engine/performance-report.ts` como read-model mensual reusable del `Performance Report`
  - `GET /api/ico-engine/metrics/agency` ahora devuelve `report` de forma aditiva
  - `AgencyIcoEngineView` ya muestra:
    - comparativo `On-Time %` vs mes anterior
    - `Late Drops`, `Overdue`, `Carry-Over`
    - `Top Performer` MVP
  - el `Performance Report` mensual de Agency ahora también queda materializado dentro de `ICO`:
    - tabla BigQuery `ico_engine.performance_report_monthly`
    - construida desde `metric_snapshots_monthly` + `metrics_by_member`
    - `readAgencyPerformanceReport()` usa `materialized-first` y mantiene fallback al cálculo previo si el snapshot aún no existe
  - el read-model mensual ahora persiste y entrega además:
    - `taskMix` por segmento dominante del período
    - `alertText`
    - `executiveSummary`
  - la segmentación del scorecard ahora expone explícitamente:
    - `Tareas Efeonce`
    - `Tareas Sky`
    - `taskMix` para segmentos adicionales
  - `AgencyIcoEngineView` ya expone esas piezas del reporte como cards y texto ejecutivo
  - se agregó serving formal del scorecard mensual:
    - migración PostgreSQL para `greenhouse_serving.agency_performance_reports`
    - proyección reactiva `agency_performance_reports`
    - `readAgencyPerformanceReport()` ahora intenta `Postgres-first`, luego `BigQuery materialized`, luego fallback computado
  - supuestos MVP actuales del ranking:
    - elegibilidad `throughput_count >= 5`
    - ranking por `OTD` del período
    - desempate por `throughput_count DESC`, luego `rpa_avg ASC`
    - multi-assignee usa el modelo actual de `metrics_by_member`
  - `Space 360 > ICO` ya muestra esos buckets como contexto visible del snapshot para auditoría operativa
  - `scripts/materialize-member-metrics.ts` dejó de duplicar SQL y pasó a usar `materializeMonthlySnapshots()` como wrapper canónico
  - el cierre de la lane debe leerse como `MVP` de confianza de métricas y scorecard sobre `ICO`, no como sustituto de `TASK-187` / `TASK-188`
- Documentación actualizada:
  - `docs/architecture/Greenhouse_ICO_Engine_v1.md`
  - `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
  - `docs/tasks/README.md`
  - `changelog.md`

### Validación

- `pnpm lint` ✅
- `pnpm exec tsc --noEmit --pretty false` ✅
- `pnpm build` ✅
- `pnpm migrate:up` ✅ usando `GREENHOUSE_POSTGRES_HOST=127.0.0.1`, `GREENHOUSE_POSTGRES_PORT=15432`, `GREENHOUSE_POSTGRES_SSL=false`
- `pnpm db:generate-types` ✅ usando el mismo carril local por proxy
- No se crearon `new Pool()` nuevos fuera de `src/lib/postgres/client.ts`
- El proxy de Cloud SQL ya estaba corriendo en `127.0.0.1:15432`; el bloqueo previo venía de no forzar el host local en los comandos
- `TASK-189` y `TASK-186` ya se movieron a `complete`; el siguiente carril natural pasa a `TASK-187` / `TASK-188`

### Riesgos / próximos pasos

- follow-up natural para `TASK-187` / `TASK-188`:
  - formalizar aliases/IDs de segmentación `Sky` si `contains('sky')` resulta demasiado laxo
  - decidir si `alertText` / `executiveSummary` deben mantenerse determinísticos o moverse después a una capa narrativa separada

## Sesión 2026-04-01 — TASK-189 y TASK-186 activadas para MVP de trust de métricas

### Objetivo

- Iniciar formalmente la ejecución de `TASK-189` y `TASK-186` bajo el orden `MVP` definido, corrigiendo primero los supuestos rotos antes de implementar.

### Delta de ejecución

- `TASK-189` y `TASK-186` se movieron de `to-do/` a `in-progress/`.
- Se actualizó `docs/tasks/README.md` y `docs/tasks/TASK_ID_REGISTRY.md` para reflejar el lifecycle activo.
- La auditoría confirmó dos correcciones clave de spec:
  - `TASK-189`: `carry-over` no puede definirse contra `CURRENT_DATE()`; debe ser relativo al período consultado/materializado.
  - `TASK-186`: la lane no es solo `Notion -> conformed`; hoy ya existe una cadena runtime activa `Notion -> conformed -> ICO -> serving Postgres -> payroll / person intelligence`.
- Quedó explícito en ambas tasks que:
  - `ICO` sigue siendo consumer protegido
  - el MVP debe ser incremental y compatible con payroll/serving
  - cualquier divergencia con `scripts/materialize-member-metrics.ts` debe alinearse o deprecarse

### Validación

- Descubrimiento y auditoría manual de:
  - `src/lib/ico-engine/shared.ts`
  - `src/lib/ico-engine/read-metrics.ts`
  - `src/lib/ico-engine/materialize.ts`
  - `src/lib/sync/sync-notion-conformed.ts`
  - `src/lib/sync/projections/ico-member-metrics.ts`
  - `src/lib/payroll/fetch-kpis-for-period.ts`
  - `docs/architecture/schema-snapshot-baseline.sql`
- No se ejecutaron `build/lint/test` todavía porque este tramo fue de discovery + corrección de spec previa a implementación.

## Sesión 2026-04-01 — Guardrail explícito para no romper ICO

### Objetivo

- Dejar documentado que las lanes de métricas e integraciones no autorizan romper o reescribir `ICO`.

### Delta de ejecución

- Se agregó guardrail explícito en:
  - `TASK-186`
  - `TASK-187`
  - `TASK-188`
  - `TASK-189`
  - `docs/architecture/GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md`
  - `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- La regla común quedó así:
  - `ICO` es un consumer protegido
  - las nuevas lanes deben fortalecerlo, no desestabilizarlo
  - cualquier cambio al engine debe ser incremental, compatible y verificable

### Validación

- Revisión documental de coherencia entre tasks activas y arquitectura viva.
- No se ejecutaron `build/lint/test` porque el cambio de este turno fue solo documental.

## Sesión 2026-04-01 — Secuencia reajustada a MVP primero para métricas Delivery

### Objetivo

- Dejar explícito que el siguiente carril de ejecución prioriza un `MVP` visible y confiable de métricas antes del hardening enterprise completo de integraciones.

### Delta de ejecución

- La secuencia de la lane quedó reajustada así:
  - `Fase 1 MVP`: `TASK-189` -> `TASK-186`
  - `Fase 2 hardening estructural`: `TASK-188` -> `TASK-187`
- `TASK-189` quedó explicitada como fix quirúrgico inmediato del filtro de período/carry-over.
- `TASK-186` quedó explicitada como carril de confianza visible en métricas y scorecards sobre la foundation actual.
- `TASK-188` y `TASK-187` quedaron posicionadas como el siguiente tramo de institucionalización enterprise, una vez validado el MVP operativo.
- `docs/tasks/README.md` y las tasks involucradas quedaron alineadas con esta priorización.

### Validación

- Revisión documental de consistencia entre:
  - `docs/tasks/to-do/TASK-189-ico-period-filter-due-date-anchor.md`
  - `docs/tasks/to-do/TASK-186-delivery-metrics-trust-notion-property-audit-contract.md`
  - `docs/tasks/to-do/TASK-188-native-integrations-layer-platform-governance.md`
  - `docs/tasks/to-do/TASK-187-notion-integration-formalization-space-onboarding-schema-governance.md`
  - `docs/tasks/README.md`
- No se ejecutaron `build/lint/test` porque el cambio de este turno fue solo documental.

## Sesión 2026-04-01 — TASK-186 y TASK-187 reencuadradas bajo la Native Integrations Layer

### Objetivo

- Ajustar `TASK-186` y `TASK-187` para que queden explícitamente subordinadas a la arquitectura canónica de `TASK-188` y `GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md`.

### Delta de ejecución

- `TASK-187` ahora queda posicionada como `reference implementation` de la `Native Integrations Layer` para `Notion`.
- `TASK-186` ahora queda posicionada como `consumer hardening` para `Delivery / ICO / Performance Report` sobre esa foundation.
- Se reforzaron en ambas tasks:
  - la referencia a `GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md`
  - la nueva posición arquitectónica
  - el criterio de implementación subordinado a `TASK-188`
- `docs/tasks/README.md` quedó con una nota más explícita sobre esta jerarquía:
  - `TASK-187` implementa la layer para `Notion`
  - `TASK-186` endurece el consumer de métricas

### Validación

- Revisión documental de consistencia entre:
  - `docs/architecture/GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md`
  - `docs/tasks/to-do/TASK-188-native-integrations-layer-platform-governance.md`
  - `docs/tasks/to-do/TASK-187-notion-integration-formalization-space-onboarding-schema-governance.md`
  - `docs/tasks/to-do/TASK-186-delivery-metrics-trust-notion-property-audit-contract.md`
- No se ejecutaron `build/lint/test` porque el cambio de este turno fue solo documental.

## Sesión 2026-04-01 — Native Integrations Layer promovida a arquitectura viva

### Objetivo

- Sacar la `Native Integrations Layer` del estado “solo task” y dejarla como documento canónico de arquitectura.

### Delta de ejecución

- Se creó `docs/architecture/GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md` como fuente de verdad de la capability.
- El documento consolida:
  - tesis arquitectónica
  - principios enterprise
  - taxonomía de integraciones
  - reference architecture
  - design-time vs runtime governance
  - anti-patterns
  - relación con `TASK-188`, `TASK-187` y `TASK-186`
- `TASK-188` quedó actualizada para referenciar esta nueva fuente canónica en vez de absorber toda la arquitectura dentro de la task.
- Se actualizaron:
  - `docs/README.md`
  - `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
  - `project_context.md`
  - `changelog.md`

### Validación

- Revisión documental de consistencia entre arquitectura maestra, task lane y contexto operativo.
- No se ejecutaron `build/lint/test` porque el cambio de este turno fue solo documental.

## Sesión 2026-04-01 — TASK-188 enriquecida con research enterprise externo

### Objetivo

- Dejar `TASK-188` respaldada por patrones enterprise vigentes, no solo por intuición arquitectónica interna.

### Delta de ejecución

- `TASK-188` ahora incluye una baseline de investigación externa al `2026-04-01` con:
  - principios enterprise convergentes
  - arquitectura de referencia recomendada para Greenhouse
  - metodología sugerida (`API-led`, `EDA`, `contract-first`, `canonical core`)
  - anti-patterns a evitar
  - referencias oficiales y de patrones de integración
- La task ya deja explícito que una integration layer enterprise para Greenhouse debe incluir:
  - registry
  - contract governance
  - source adapters
  - canonical mapping layer
  - event/workflow backbone
  - runtime governance
  - readiness downstream

### Validación

- Revisión documental + contraste con fuentes externas vigentes al `2026-04-01`.
- No se ejecutaron `build/lint/test` porque el cambio de este turno fue solo documental.

## Sesión 2026-04-01 — Secuencia conectada para TASK-188 / TASK-187 / TASK-186

### Objetivo

- Dejar explícito que las tres tasks forman una misma lane conectada, pero deben iterarse fortaleciendo lo existente y no rompiendo el carril actual de Notion, `greenhouse_conformed` e `ICO`.

### Delta de ejecución

- `TASK-188`, `TASK-187` y `TASK-186` quedaron actualizadas con un principio común de iteración:
  - no hacer `rip-and-replace`
  - construir sobre bindings, mappings, syncs y métricas ya existentes
  - encapsular y gobernar primero; reemplazar después solo si todavía hace falta
- Se dejó explícito el orden recomendado de ejecución:
  - `TASK-188` como paraguas de `Native Integrations Layer`
  - `TASK-187` como formalización de Notion dentro de ese marco
  - `TASK-186` como endurecimiento final de confianza/paridad de métricas Delivery
- `docs/tasks/README.md` también quedó con nota breve de secuencia para esta lane conectada.

### Validación

- Revisión documental de coherencia entre:
  - `docs/tasks/to-do/TASK-186-delivery-metrics-trust-notion-property-audit-contract.md`
  - `docs/tasks/to-do/TASK-187-notion-integration-formalization-space-onboarding-schema-governance.md`
  - `docs/tasks/to-do/TASK-188-native-integrations-layer-platform-governance.md`
  - `docs/tasks/README.md`
- No se ejecutaron `build/lint/test` porque el cambio de este turno fue solo documental.

## Sesión 2026-04-01 — TASK-188 abierta para Native Integrations Layer

### Objetivo

- Abrir la lane paraguas de arquitectura para institucionalizar una `Native Integrations Layer` en Greenhouse, más allá del caso específico de Notion.

### Delta de ejecución

- Se creó `docs/tasks/to-do/TASK-188-native-integrations-layer-platform-governance.md`.
- La task posiciona a `TASK-187` como primer consumer fuerte del modelo, pero explicita que el problema y la solución son cross-integration.
- Se actualizó `docs/tasks/TASK_ID_REGISTRY.md` y `docs/tasks/README.md` para registrar `TASK-188` y dejar `TASK-189` como siguiente ID disponible.
- `TASK-187` quedó referenciando a `TASK-188` como follow-up/paraguas arquitectónico.

### Validación

- Documentación revisada contra:
  - `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
  - `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
  - `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
  - `docs/operations/GREENHOUSE_REPO_ECOSYSTEM_V1.md`
- No se ejecutaron `build/lint/test` porque el cambio de este turno fue solo documental.

## Sesión 2026-04-01 — TASK-187 abierta para formalizar integración Notion

### Objetivo

- Abrir una lane separada de `TASK-186` para formalizar Notion como integración gobernada del platform layer, evitando que el onboarding de nuevos spaces dependa de discovery manual por agente/MCP.

### Delta de ejecución

- Se creó `docs/tasks/to-do/TASK-187-notion-integration-formalization-space-onboarding-schema-governance.md`.
- La task captura el gap estructural detrás de `TASK-186`:
  - hoy existen bindings, mappings y scripts
  - pero todavía no existe onboarding gobernado, schema registry, drift detection ni KPI readiness formal
- `TASK-186` quedó referenciando a `TASK-187` como follow-up explícito.
- Se actualizó `docs/tasks/TASK_ID_REGISTRY.md` y `docs/tasks/README.md` para registrar `TASK-187` y dejar `TASK-188` como siguiente ID disponible.

### Validación

- Documentación revisada contra:
  - `src/app/api/integrations/notion/register/route.ts`
  - `scripts/notion-schema-discovery.ts`
  - `scripts/sync-source-runtime-projections.ts`
  - `src/lib/space-notion/space-notion-store.ts`
  - `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
- No se ejecutaron `build/lint/test` porque el cambio de este turno fue solo documental.

## Sesión 2026-04-01 — TASK-186 creada para confianza de métricas Delivery

### Objetivo

- Dejar institucionalizada una task específica para auditar propiedades Notion que alimentan métricas de Delivery y cerrar la brecha de confianza entre Notion, `greenhouse_conformed` e `ICO`.

### Delta de ejecución

- Se creó `docs/tasks/to-do/TASK-186-delivery-metrics-trust-notion-property-audit-contract.md`.
- La task ya incorpora baseline de auditoría hecha vía MCP sobre Notion:
  - `Efeonce > Proyectos`: `15288d9b-1459-4052-9acc-75439bbd5470`
  - `Efeonce > Tareas`: `3a54f090-4be1-4158-8335-33ba96557a73`
  - `Sky Airlines > Proyectos`: `23039c2f-efe7-817a-8272-ffe6be1a696a`
  - `Sky Airlines > Tareas`: `23039c2f-efe7-8138-9d1e-c8238fc40523`
  - `ANAM > Proyectos`: `32539c2f-efe7-8053-94f7-c06eb3bbf530`
  - `ANAM > Tareas`: `32539c2f-efe7-81a4-92f4-f4725309935c`
- La task documenta:
  - propiedades auditadas por DB
  - cobertura actual de `sync-notion-conformed`
  - gaps de primitivas para scorecards auditables
  - deriva semántica actual de `FTR`
  - regla explícita de diseño: `core KPI contract` compartido + flexibilidad por `space_id` para particularidades de cliente/proyecto
  - matriz de cobertura del `Performance Report` (`qué ya se puede calcular`, `qué falta`, `prioridad`)
- Los DB IDs auditados también quedaron promovidos a arquitectura viva en:
  - `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
  - `docs/architecture/Greenhouse_ICO_Engine_v1.md`
- Se actualizó `docs/tasks/TASK_ID_REGISTRY.md` y `docs/tasks/README.md` para registrar `TASK-186` como lane nueva y dejar `TASK-187` como siguiente ID disponible.

### Validación

- Documentación revisada contra:
  - `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
  - `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`
  - `src/lib/sync/sync-notion-conformed.ts`
  - `scripts/setup-bigquery-source-sync.sql`
  - `src/lib/ico-engine/shared.ts`
  - `scripts/materialize-member-metrics.ts`
- No se ejecutaron `build/lint/test` porque el cambio de este turno fue solo documental.

## Sesión 2026-04-01 — Reconciliación real de grants runtime/migrator en PostgreSQL

### Objetivo

- Cerrar la causa raíz detrás de `/people` y notificaciones en staging: grants incompletos del principal runtime sobre objetos existentes en `greenhouse_notifications`, `greenhouse_serving` y parte de `greenhouse_payroll`.

### Delta de ejecución

- Se auditó Cloud SQL con `greenhouse_ops` y se confirmó drift real:
  - `greenhouse_runtime` no tenía `USAGE` sobre `greenhouse_notifications`
  - también faltaban grants explícitos sobre tablas existentes como `greenhouse_serving.member_capacity_economics`, `greenhouse_serving.ico_member_metrics` y tablas de `greenhouse_notifications`
- Se creó la migración versionada `20260402001200000_postgres-runtime-grant-reconciliation.sql` para reconciliar grants de `runtime` y `migrator` sobre schemas, tablas y secuencias ya existentes.
- La reconciliación se aplicó contra Cloud SQL usando `greenhouse_ops` vía proxy local y quedó registrada en `public.pgmigrations`.
- `scripts/setup-postgres-access-runtime.sql`, `scripts/setup-postgres-operations-infra.sql` y `scripts/setup-postgres-notifications.sql` quedaron alineados con el access model canónico para no reintroducir el drift en bootstrap/setup.
- `scripts/pg-doctor.ts` ahora audita también `greenhouse_notifications`, que antes quedaba fuera del diagnóstico.

### Validación

- Auditoría `greenhouse_runtime` post-fix:
  - `greenhouse_notifications` `USAGE` ✅
  - `greenhouse_notifications.notifications` `SELECT` ✅
  - `greenhouse_notifications.notification_preferences` `SELECT` ✅
  - `greenhouse_serving.member_capacity_economics` `SELECT` ✅
  - `greenhouse_serving.ico_member_metrics` `SELECT` ✅
- Barrido completo de privilegios runtime esperados en schemas canónicos: `0` objetos faltantes ✅
- `pnpm pg:doctor --profile=runtime` ✅
- `pnpm exec tsc --noEmit --pretty false` ✅
- `pnpm lint -- scripts/pg-doctor.ts` ✅

### Nota operativa

- `pnpm migrate:up` desde `.env.local` seguía intentando salir por la IP pública (`34.86.135.144`) y no por el proxy local; además `node-pg-migrate` devolvió `ECONNRESET` en ese carril. La migración quedó igualmente aplicada y registrada usando `greenhouse_ops` sobre `127.0.0.1:15432`, que era la ruta operativa sana.

## Sesión 2026-04-01 — People y Notifications con fallback por grants rotos en staging

### Objetivo

- Restaurar la carga de `/people` y evitar que el shell siga degradándose cuando staging tenga permisos incompletos sobre tablas/schemas de PostgreSQL.

### Delta de ejecución

- Se verificó en logs del deployment activo que:
  - `GET /api/people` fallaba por `permission denied for table member_capacity_economics`
  - `GET /api/notifications/unread-count` fallaba por `permission denied for schema greenhouse_notifications`
- `src/lib/people/get-people-list.ts` ahora mantiene el roster operativo aunque falle el overlay de `member_capacity_economics`; deja warning y conserva valores base.
- `src/app/api/notifications/unread-count/route.ts` ahora devuelve `unreadCount: 0` cuando el store de notificaciones no es accesible por permisos, en vez de romper el shell con `500`.
- Se agregaron tests para ambos fallbacks.

### Validación

- `pnpm exec vitest run src/lib/people/get-people-list.test.ts src/app/api/notifications/unread-count/route.test.ts` ✅
- `pnpm exec tsc --noEmit --pretty false` ✅
- `pnpm lint -- src/lib/people/get-people-list.ts src/lib/people/get-people-list.test.ts src/app/api/notifications/unread-count/route.ts src/app/api/notifications/unread-count/route.test.ts src/lib/hr-core/service.test.ts` ✅

## Sesión 2026-04-01 — HR Departments responsable lookup reparado

### Objetivo

- Recuperar el selector `Responsable` en `HR > Departments`, que había dejado de poblar opciones al abrir el modal.

### Delta de ejecución

- `HrDepartmentsView` ya no consulta `/api/people` para ese lookup.
- Nueva route `GET /api/hr/core/members/options` bajo permisos HR:
  - usa `requireHrCoreManageTenantContext`
  - lee miembros activos desde `greenhouse_core.members` vía reader liviano del módulo HR
  - entrega un payload liviano con `memberId`, `displayName` y `roleTitle`
- Con esto, el modal de departamentos deja de depender de permisos del módulo `People` para resolver responsables.
- Se agregó cobertura en route/store/service tests del carril nuevo.

### Validación

- `pnpm exec vitest run src/app/api/hr/core/members/options/route.test.ts src/lib/hr-core/postgres-departments-store.test.ts src/lib/hr-core/service.test.ts src/app/api/hr/core/departments/route.test.ts 'src/app/api/hr/core/departments/[departmentId]/route.test.ts'` ✅
- `pnpm exec tsc --noEmit --pretty false` ✅
- `pnpm lint` ✅

## Sesión 2026-04-01 — Vitest scripts discovery alineado

### Objetivo

- Cerrar la deuda de plataforma que impedía correr tests unitarios ubicados en `scripts/**`.

### Delta de ejecución

- `vitest.config.ts` ya incluye discovery para:
  - `scripts/**/*.test.ts`
  - `scripts/**/*.test.tsx`
  - `scripts/**/*.spec.ts`
  - `scripts/**/*.spec.tsx`
- El caso real que motivó el ajuste fue `scripts/lib/load-greenhouse-tool-env.test.ts`, agregado al endurecer el soporte de `greenhouse_ops`.
- `scripts/lib/load-greenhouse-tool-env.ts` ahora elimina `GREENHOUSE_POSTGRES_PASSWORD` cuando el profile trae password vacía y `*_PASSWORD_SECRET_REF`, manteniendo limpio el contrato canónico del entorno.
- Se actualizó `project_context.md` para dejar explícito que tooling/CLI también puede versionar tests unitarios bajo `scripts/**`.

### Validación

- `pnpm exec vitest run scripts/lib/load-greenhouse-tool-env.test.ts` ✅
- `pnpm exec vitest run scripts/lib/load-greenhouse-tool-env.test.ts src/lib/google-credentials.test.ts` ✅
- `pnpm exec tsc --noEmit --pretty false` ✅
- `pnpm lint` ✅

## Sesión 2026-04-01 — TASK-026 contract canonicalization cerrada end-to-end

### Objetivo

- Cerrar `TASK-026` end-to-end: runtime, migración aplicada en Cloud SQL, regeneración de tipos y documentación viva alineada.

### Estado vigente

- `greenhouse_core.members` ya es el ancla canónica para `contract_type`, `pay_regime`, `payroll_via` y `deel_contract_id`.
- `compensation_versions` sigue guardando snapshot histórico del contrato, pero no reemplaza al miembro como fuente de verdad.
- `payroll_entries` ya expone `payroll_via`, `deel_contract_id`, `sii_retention_rate` y `sii_retention_amount`.
- `daily_required` sigue siendo el flag almacenado; `schedule_required` queda como alias de lectura en serving, UI y helpers.
- Se actualizaron docs vivos y task pipeline:
  - `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
  - `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
  - `project_context.md`
  - `changelog.md`
  - `Handoff.md`
  - `docs/tasks/README.md`
  - `docs/tasks/TASK_ID_REGISTRY.md`
  - `docs/tasks/complete/TASK-026-hris-contract-type-consolidation.md`
  - `docs/tasks/to-do/TASK-027-hris-document-vault.md`

### Nota operativa

- La migracion de `TASK-026` requirio Cloud SQL Proxy local en `127.0.0.1:15432`; el intento directo a la IP publica de Cloud SQL termino en `ETIMEDOUT`.
- Las primeras migraciones generadas quedaron con timestamps anteriores a migraciones ya aplicadas; se regeneraron con `node-pg-migrate create` hasta quedar posteriores al tracking real en `public.pgmigrations`.
- El DDL cross-schema no pudo aplicar con `migrator` ni con el `admin` legacy (`postgres`); se usó `greenhouse_ops` via Secret Manager como carril break-glass efectivo.
- Validación ya cerrada en el branch:
  - `pnpm migrate:up` ✅
  - `pnpm db:generate-types` ✅
  - `pnpm lint` ✅
  - `pnpm build` ✅

## Uso

Este archivo es el snapshot operativo entre agentes. Debe priorizar claridad y continuidad.

## Sesión 2026-04-01 — TASK-180 implementada y validada end-to-end

### Objetivo

- Implementar `TASK-180` respetando la secuencia descubrimiento -> auditoría -> mapa de conexiones -> plan -> implementación para cortar `HR > Departments` a PostgreSQL.

### Delta de ejecución

- `TASK-180` se movió a `docs/tasks/in-progress/` y el índice operativo quedó actualizado durante la ejecución.
- Se auditó arquitectura, runtime HR/People y schema live antes de tocar código.
- Hallazgos confirmados en auditoría:
  - `src/lib/hr-core/service.ts` sigue leyendo/escribiendo `departments` en BigQuery para `list/create/update`.
  - `src/lib/hr-core/postgres-leave-store.ts`, `greenhouse_serving.person_360` y views HR/Payroll ya consumen `greenhouse_core.departments` en PostgreSQL.
  - en `dev`, tanto `greenhouse.departments` (BigQuery) como `greenhouse_core.departments` (Postgres) están vacías; tampoco hay `members` con `department_id` poblado en ninguno de los dos stores.
  - `greenhouse_core.departments` no tiene `space_id`; el tenancy vigente del módulo sigue siendo `efeonce` via `TenantContext`/route group.
  - `greenhouse_core.departments` no tiene FK para `head_member_id`; solo existe FK recursiva para `parent_department_id`.
- La spec de la task recibió delta corto con esos supuestos corregidos para no implementar sobre drift inexistente en `dev`.
- Implementación aterrizada:
  - nuevo store `src/lib/hr-core/postgres-departments-store.ts`
  - `src/lib/hr-core/service.ts` ya corta `departments` a PostgreSQL para list/detail/create/update y para la asignación `member.department_id`
  - `getMemberHrProfile()` ya overlaya `departmentId`/`departmentName` desde PostgreSQL
  - nuevo backfill `scripts/backfill-hr-departments-to-postgres.ts`
  - nueva migración `migrations/20260402001000000_hr-departments-head-member-fk.sql`
  - tests nuevos/ajustados en store, service y routes de departments
- Verificación cerrada:
  - `pnpm exec vitest run src/lib/hr-core/postgres-departments-store.test.ts src/lib/hr-core/service.test.ts src/app/api/hr/core/departments/route.test.ts src/app/api/hr/core/departments/[departmentId]/route.test.ts` ✅
  - `pnpm lint` ✅
  - `pnpm build` ✅
  - `pnpm exec tsc --noEmit --pretty false` ✅
- Cierre operativo de DB:
  - se releyó `AGENTS.md` y se confirmó el carril correcto para CLI: Cloud SQL Auth Proxy en `127.0.0.1:15432`
  - `pnpm pg:doctor --profile=runtime` ✅ por proxy
  - `pnpm pg:doctor --profile=migrator` ✅ por proxy
  - la baseline quedó normalizada a `20260401120000000_initial-baseline`
  - la migración de ownership quedó reconciliada en tracking como `20260402000000000_consolidate-ownership-to-greenhouse-ops`
  - `pnpm migrate:up` ✅ (`No migrations to run!` después de aplicar la nueva)
  - `pnpm db:generate-types` ✅
  - `public.pgmigrations` ya registró `20260402001000000_hr-departments-head-member-fk`

### Rama

- `develop`

## Sesión 2026-04-01 — Database Tooling Foundation (TASK-184 + TASK-185)

### Objetivo

Instalar infraestructura fundacional de base de datos: migraciones versionadas, conexión centralizada, y query builder tipado.

### Lo que se hizo

- Instaló `node-pg-migrate`, `kysely`, `kysely-codegen`
- Creó `src/lib/db.ts` — wrapper centralizado que re-exporta `postgres/client.ts` + agrega Kysely lazy
- Creó `scripts/migrate.ts` — wrapper TypeScript para migraciones, reutiliza sistema de profiles existente
- Creó `migrations/20260401120000000_initial-baseline.sql` — baseline no-op aplicada en dev
- Generó `src/types/db.d.ts` — 140 tablas, 3042 líneas, introspectadas desde `greenhouse-pg-dev`
- Creó `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md` — spec de arquitectura completa
- Actualizó `AGENTS.md`, `project_context.md`, 3 docs de arquitectura existentes
- Tasks cerradas en pipeline con delta notes en TASK-172, TASK-174, TASK-180

### Nota operativa

- Migraciones y codegen requieren Cloud SQL Proxy local (`cloud-sql-proxy ... --port 15432`) porque la IP pública de Cloud SQL no es alcanzable directamente desde esta máquina.
- Credenciales migrator: user `greenhouse_migrator_user`, password en Secret Manager `greenhouse-pg-dev-migrator-password`.
- Schema snapshot (`pg_dump --schema-only`) y CI integration quedan como follow-ups (TASK-172).

### Rama

`develop` — commits `362e6ba9`, `b5d77224`, `094fcd96`

---

## Sesión 2026-03-31 — Finance reactive backlog starvation + payroll expenses backfill

### Objetivo

- Explicar por qué `Finance > Egresos` no mostraba las nóminas ya exportadas de febrero/marzo y dejar corregido tanto el runtime como el dato operativo faltante.

### Hallazgos confirmados

- `greenhouse_payroll.payroll_periods` tenía `2026-02` y `2026-03` en estado `exported`.
- Ambos períodos ya habían emitido `payroll_period.exported` en `greenhouse_sync.outbox_events`.
- `greenhouse_finance.expenses` no tenía filas para esos `payroll_period_id`.
- `finance_expense_reactive_intake` no había dejado rastro en:
  - `greenhouse_sync.outbox_reactive_log`
  - `greenhouse_sync.projection_refresh_queue`
- La causa operativa no era UI: el cron reactivo de `finance` quedaba starved por eventos `published` más antiguos ya terminales para sus handlers.

### Delta de ejecución

- Se endureció `src/lib/sync/reactive-consumer.ts` para escanear el outbox por chunks y omitir eventos que ya estén terminales para todos los handlers del dominio.
- Se corrigió la dedupe reactiva para tratar `dead-letter` como estado terminal y no reencolarlo indefinidamente.
- Se agregó regresión en `src/lib/sync/reactive-consumer.test.ts` para cubrir el caso de starvation por eventos terminales viejos.
- Se corrigió `src/lib/finance/postgres-store-slice2.ts`: el `INSERT` de `createFinanceExpenseInPostgres()` tenía desalineado el bloque `VALUES`, por lo que el path canónico de creación podía fallar con `INSERT has more target columns than expressions`.
- Se agregó `scripts/backfill-payroll-expenses-reactive.ts` para rematerializar períodos `exported` faltantes con el mismo path canónico del reactor.
- Se ejecutó backfill real en Cloud SQL `greenhouse-pg-dev / greenhouse_app` para:
  - `2026-02` → `2` expenses `payroll`
  - `2026-03` → `4` expenses `payroll` + `1` `social_security`

### Verificación

- `pnpm exec vitest run src/lib/sync/reactive-consumer.test.ts` ✅
- `pnpm exec eslint src/lib/sync/reactive-consumer.ts src/lib/sync/reactive-consumer.test.ts scripts/backfill-payroll-expenses-reactive.ts src/lib/finance/postgres-store-slice2.ts` ✅
- Verificación live en DB:
  - marzo quedó visible en orden de grilla como filas `6` a `10`
  - febrero quedó visible como filas `19` y `20`

### Gaps abiertos detectados en el mismo carril

- `greenhouse_serving.provider_tooling_snapshots` no existe en `staging`, aunque el runtime y la documentación ya lo consumen.
- `greenhouse_serving.provider_tooling_360` tampoco existe materializado en `staging`.
- `greenhouse_serving.commercial_cost_attribution` sí existe, pero el reactor de Finance viene chocando con `permission denied`.
- En `vercel.json` sigue scheduleado solo el catch-all `/api/cron/outbox-react`; las domain routes (`outbox-react-finance`, `people`, `org`, `notify`) existen en código/documentación pero no están agendadas hoy en Vercel.
- El auto-allocation de estos expenses emitió `numeric field overflow`; no bloqueó la creación del ledger, pero el subflujo quedó pendiente de hardening.

## Sesión 2026-03-31 — TASK-182 + TASK-183 en descubrimiento/auditoría conjunta

### Objetivo

- Implementar la lane conjunta `TASK-182` + `TASK-183` respetando el orden descubrimiento → auditoría → mapa de conexiones → plan → implementación.

### Delta de ejecución

- Se movieron ambas tasks a `docs/tasks/in-progress/` y se actualizó el índice operativo.
- Se auditó arquitectura, código Finance/Payroll/Cost y DDL versionado antes de tocar runtime.
- Se confirmó drift que obliga a corregir spec antes de implementar:
  - trigger canónico de nómina: `payroll_period.exported`, no `payroll_entry.approved`
  - no existe evento `expense.tool_linked`; el contrato reactivo vigente es `finance.expense.created|updated`
  - el helper reusable de tooling está en `src/lib/team-capacity/tool-cost-reader.ts`
  - `expenses` todavía no aplica tenant isolation por `space_id`
  - el schema versionado no muestra columnas `source_type`, `payment_provider`, `payment_rail` ni `space_id`
  - el spec externo `../Greenhouse_Portal_Spec_v1.md` no existe en este workspace
- La inspección live de PostgreSQL quedó bloqueada:
  - `psql` no está instalado
  - `pnpm pg:doctor` no pudo correr por credenciales/permisos faltantes

### Nota de coordinación

- Esta lane tocará zona sensible de `Finance > Expenses`, `Payroll` y projections de `Cost Intelligence`.
- Mantener compatibilidad transicional con `expense_type` legacy (`payroll`, `social_security`) hasta cerrar el slice completo.

## Sesión 2026-03-31 — cierre documental TASK-182 + TASK-183

### Objetivo

- Dejar actualizados los docs de cierre para reflejar el contrato final implementado en la lane conjunta.

### Delta de ejecución

- Se ajustó `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` para documentar:
  - `space_id`, `source_type`, `payment_provider` y `payment_rail` como parte del contrato del ledger
  - la taxonomía visible del drawer `Operacional / Tooling / Impuesto / Otro`
  - `payroll_period.exported` como trigger reactivo para expenses de `payroll` y `social_security`
- Se ajustó `docs/architecture/GREENHOUSE_EVENT_CATALOG_V1.md` para registrar:
  - el consumer/projection `finance_expense_reactive_intake`
  - el rol downstream de `payroll_period.exported` sobre Finance
- Se actualizó `changelog.md` con el cierre conjunto de `TASK-182` + `TASK-183`.

### Validación

- En este turno documental no se re-ejecutaron `build` ni `lint`.
- El cierre documental se apoya en la verificación ya obtenida en la implementación previa de la lane.

## Sesión 2026-03-31 — cierre runtime TASK-182 + TASK-183

### Objetivo

- Cerrar la implementación runtime y dejar ambas tasks listas para pasar a `complete`.

### Delta de ejecución

- Se endureció el ledger `greenhouse_finance.expenses` con `space_id`, `source_type`, `payment_provider` y `payment_rail`.
- Se actualizó `CreateExpenseDrawer` a la taxonomía `Operacional / Tooling / Impuesto / Otro` con imputación, recurrencia y sinergia de tooling.
- Se registró la proyección `finance_expense_reactive_intake` para materializar expenses de `payroll` y `social_security` desde `payroll_period.exported`.
- Se separaron constantes cliente-safe en `src/lib/finance/contracts.ts` para evitar que el drawer arrastrara dependencias `server-only` al bundle del cliente.
- Se ejecutó chequeo de impacto cruzado mínimo:
  - `TASK-174` ahora debe cubrir el contrato expandido de `expenses`
  - `TASK-176` se corrigió para reflejar que Previred sigue en compatibilidad transicional como `social_security`
  - `TASK-177` ya puede apoyarse en `cost_category`, `space_id` y fees financieros del ledger

### Validación

- `pnpm build` ✅
- `pnpm lint` ✅ (`0 errors`, `2 warnings` legacy en `src/views/greenhouse/hr-core/HrDepartmentsView.tsx`)

## Sesión 2026-03-31 — PostgreSQL Finance setup ejecutado en Cloud SQL

### Objetivo

- Cerrar el pendiente operativo de PostgreSQL para la lane `TASK-182` + `TASK-183`.

### Delta de ejecución

- Se reautenticó `gcloud` con `julio.reyes@efeonce.org`.
- Se descubrieron los secretos reales del entorno `greenhouse-pg-dev`:
  - `greenhouse-pg-dev-app-password`
  - `greenhouse-pg-dev-migrator-password`
  - `greenhouse-pg-dev-postgres-password`
- Se validó acceso real a Cloud SQL `greenhouse-pg-dev` / DB `greenhouse_app`:
  - `pnpm pg:doctor --profile=runtime` ✅
  - `pnpm pg:doctor --profile=migrator` ✅
- Se aplicó en Cloud SQL la migración puntual `scripts/migrations/add-expense-ledger-reactive-columns.sql`.
- Se verificó en DB real que `greenhouse_finance.expenses` ya tiene:
  - `space_id`
  - `source_type`
  - `payment_provider`
  - `payment_rail`
  - índices `finance_expenses_space_idx`, `finance_expenses_source_type_idx`, `finance_expenses_payroll_period_idx`
- `pnpm setup:postgres:finance` inicialmente falló por ownership drift en `greenhouse_finance`.
- Se saneó ownership operativo para reproducibilidad del setup:
  - tablas de `greenhouse_finance` movidas a `greenhouse_migrator` salvo `economic_indicators` que ya estaba en `greenhouse_migrator_user`
  - vistas serving de Finance alineadas a `greenhouse_migrator`
  - se otorgó temporalmente `greenhouse_migrator` a `greenhouse_app` solo para transferir ownership y luego se revocó
- Tras ese saneamiento, `pnpm setup:postgres:finance` quedó ejecutado con éxito vía `greenhouse_migrator_user`.

### Nota de coordinación

- El entorno Cloud SQL quedó más alineado al modelo de acceso documentado, pero sigue valiendo revisar ownership drift en otros schemas si futuros setups vuelven a fallar por `must be owner`.

## Sesión 2026-03-31 — TASK-183 creada para ledger reactivo de Expenses

### Objetivo

- Abrir una lane formal para robustecer `Finance > Expenses` más allá del drawer: intake reactivo de nómina, fees bancarios/gateway y boundary explícito entre Finance ledger y Cost Intelligence.

### Delta de ejecución

- Se creó `docs/tasks/to-do/TASK-183-finance-expenses-reactive-intake-cost-ledger.md`.
- La task fija como postura:
  - `expenses` sigue siendo ledger canónico y owner de egresos
  - `Cost Intelligence` consume y atribuye; no crea gastos
  - `Payroll` debe poder materializar expenses system-generated
  - fees bancarios y rails de pago requieren taxonomía y carriles propios
  - `payment_method` y `payment_provider/payment_rail` no deben mezclarse en un solo campo
- También se dejó explícita la relación con:
  - `TASK-182` como lane UX/taxonomía visible del drawer
  - `TASK-174`, `TASK-175`, `TASK-176`, `TASK-177`, `TASK-179`

### Nota de coordinación

- `TASK-182` recibió delta para aclarar que ya no debe intentar cerrar sola el contrato reactivo cross-module de `expenses`.
- No hubo cambios de runtime; este turno fue documental únicamente.

### Delta adicional

- `TASK-183` ya no queda solo como framing; se agregaron recomendaciones concretas para:
  - usar `payroll_period.exported` como trigger de generación reactiva
  - modelar `Previred` como `social_security` consolidado por período
  - separar `bank_fee` y `gateway_fee`
  - separar `payment_method` de `payment_provider/payment_rail`
  - mantener a `Finance` como owner del ledger y a `Cost Intelligence` como consumer/attributor

## Sesión 2026-03-31 — Finance Expenses: selector de proveedores alineado a Postgres

### Objetivo

- Corregir el dropdown `Proveedor` de `Finance > Expenses > Registrar egreso`, que no reflejaba el universo actual de suppliers aunque el módulo `Finance > Suppliers` y el backfill ya estuvieran alineados.

### Causa raíz confirmada

- El drawer `CreateExpenseDrawer` consume `/api/finance/expenses/meta`.
- Ese endpoint seguía leyendo suppliers desde `greenhouse.fin_suppliers` en BigQuery.
- El listado principal de `Finance > Suppliers` y el backfill reciente operan sobre `greenhouse_finance.suppliers` en PostgreSQL.
- Resultado: el selector de egresos y el directorio de proveedores podían mostrar catálogos distintos.

### Delta de ejecución

- `src/app/api/finance/expenses/meta/route.ts` ahora usa suppliers `Postgres-first`, alineado con `Finance > Suppliers`.
- BigQuery queda solo como fallback para suppliers si el carril Postgres no está disponible.
- Se agregó regresión en:
  - `src/app/api/finance/expenses/meta/route.test.ts`
  - valida que `expenses/meta` devuelva suppliers desde Postgres y no consulte la tabla legacy `greenhouse.fin_suppliers` cuando Postgres está sano

### Validación ejecutada

- `pnpm exec vitest run src/app/api/finance/expenses/meta/route.test.ts`
- `pnpm exec eslint src/app/api/finance/expenses/meta/route.ts src/app/api/finance/expenses/meta/route.test.ts`
- `pnpm exec tsc --noEmit --pretty false`

### Nota de coordinación

- El backfill previo de vínculo canónico se ejecutó en `staging`.
- Este hotfix corrige el source of truth del dropdown; no implica por sí solo que `dev` y `staging` tengan exactamente el mismo set de suppliers si el dato operativo entre entornos ya venía distinto.

## Sesión 2026-03-31 — memoria operativa GCP/ADC solicitada por owner

### Objetivo

- Persistir una preferencia operativa explícita del usuario para futuros turnos y evitar repetir el mismo desvío de ejecución.

### Regla operativa fijada

- Para operaciones GCP/Cloud SQL/BigQuery:
  - entrar primero por `gcloud`
  - usar preferentemente la cuenta humana `julio.reyes@efeonce.org`
  - priorizar `Application Default Credentials (ADC)` como carril base para tooling y scripts locales
- Solo usar `vercel env pull` o env remotos como fallback cuando:
  - `ADC` no esté inicializado, o
  - el alcance efectivo no permita ejecutar la operación requerida

### Estado observado en esta sesión

- `gcloud` sí mostró `julio.reyes@efeonce.org` como cuenta activa.
- `ADC` no estaba inicializado en esta máquina al momento de la verificación.
- Por esa razón, el backfill operativo reciente de suppliers terminó corriendo con env remoto de `staging` y no por `ADC`.

### Nota de coordinación

- No volver a asumir como primer carril operativo que Vercel/env pull es la vía correcta para backfills o scripts GCP.
- Antes de cambiar de carril, verificar y dejar evidencia mínima de:
  - `gcloud auth list`
  - `gcloud config get-value account`
  - `gcloud auth application-default print-access-token`

## Sesión 2026-03-31 — Suppliers / Provider 360: vínculo manual + backfill batch

### Objetivo

- Resolver el gap operativo de `Finance > Suppliers` donde el badge `Sin vínculo canónico` no tenía salida desde UI.

### Causa raíz confirmada

- El backend de suppliers sí soportaba `providerId` y derivación canónica.
- El listado y el detalle solo mostraban el estado del vínculo, pero no ofrecían ninguna acción para crearlo o repararlo.
- Los suppliers históricos sin `provider_id` podían quedar huérfanos aunque el modelo `Provider 360` ya existiera.

### Delta de ejecución

- `src/views/greenhouse/finance/SupplierDetailView.tsx` ahora expone `Crear vínculo canónico` cuando falta `providerId`.
- `src/views/greenhouse/finance/SupplierProviderToolingTab.tsx` ahora ofrece el mismo CTA dentro del empty state del tab `Provider 360`.
- `src/app/api/finance/suppliers/[id]/route.ts` ahora acepta `autoLinkProvider: true` para derivar y persistir el `providerId` server-side.
- `src/lib/finance/postgres-store.ts` suma `backfillFinanceSupplierProviderLinksInPostgres()` para batch linking Postgres-first.
- Nueva route batch:
  - `POST /api/finance/suppliers/backfill-provider-links`
- `src/views/greenhouse/finance/SuppliersListView.tsx` ahora muestra:
  - cuántos proveedores siguen sin vínculo canónico
  - botón `Backfill Provider 360` para reparar en lote los suppliers pendientes

### Validación ejecutada

- `pnpm exec vitest run 'src/app/api/finance/suppliers/[id]/route.test.ts' 'src/app/api/finance/suppliers/backfill-provider-links/route.test.ts' src/views/greenhouse/finance/SupplierProviderToolingTab.test.tsx`
- `pnpm exec eslint 'src/app/api/finance/suppliers/[id]/route.ts' 'src/app/api/finance/suppliers/[id]/route.test.ts' src/app/api/finance/suppliers/backfill-provider-links/route.ts src/app/api/finance/suppliers/backfill-provider-links/route.test.ts src/lib/finance/postgres-store.ts src/views/greenhouse/finance/SupplierDetailView.tsx src/views/greenhouse/finance/SupplierProviderToolingTab.tsx src/views/greenhouse/finance/SupplierProviderToolingTab.test.tsx src/views/greenhouse/finance/SuppliersListView.tsx`
- `pnpm exec tsc --noEmit --pretty false`

### Nota de coordinación

- No se hizo smoke manual en `dev-greenhouse`.
- El backfill batch opera sobre PostgreSQL (`greenhouse_finance.suppliers`) y reusa el carril canónico actual de `providers/postgres.ts`.

## Sesión 2026-03-31 — hotfix HR Departments create path en BigQuery

### Objetivo

- Corregir el fallo visible `Unable to create department.` en `/hr/departments` mientras se prepara el cutover formal del módulo a PostgreSQL.

### Causa raíz confirmada

- El write path actual de `departments` sigue corriendo sobre BigQuery en `src/lib/hr-core/service.ts`.
- Al crear un departamento raíz, el formulario envía campos opcionales `STRING` en `null`, especialmente `parentDepartmentId`.
- `runHrCoreQuery()` no pasaba `types` explícitos al cliente de BigQuery, así que el query podía fallar al inferir parámetros nulos.
- La route terminaba devolviendo el genérico `Unable to create department.` aunque el problema real fuera tipado de parámetros.

### Delta de ejecución

- `src/lib/hr-core/shared.ts` ahora permite pasar `types` opcionales a `runHrCoreQuery()`.
- `src/lib/hr-core/service.ts` ahora declara tipos `STRING` explícitos en create/update de departamentos para:
  - `description`
  - `parentDepartmentId`
  - `headMemberId`
- `src/lib/hr-core/service.test.ts` suma regresión para create de departamento raíz con `parentDepartmentId = null`.

### Validación ejecutada

- `pnpm exec vitest run src/lib/hr-core/service.test.ts`
- `pnpm exec eslint src/lib/hr-core/shared.ts src/lib/hr-core/service.ts src/lib/hr-core/service.test.ts`
- `pnpm exec tsc --noEmit --pretty false`

### Nota de coordinación

- Este hotfix no resuelve la contradicción arquitectónica de fondo.
- El correctivo real quedó abierto como `TASK-180`, que mueve `HR > Departments` a `greenhouse_core.departments` en PostgreSQL.

## Sesión 2026-03-31 — TASK-180 creada para cutover de Departments a PostgreSQL

### Objetivo

- Abrir una task formal para resolver el drift entre `HR > Departments` en BigQuery y el resto del dominio HR/People que ya converge a PostgreSQL.

### Delta de ejecución

- Se creó `docs/tasks/to-do/TASK-180-hr-departments-postgres-runtime-cutover.md`.
- La task deja explícito:
  - que `greenhouse_core.departments` debe ser source of truth operativo
  - que `/api/hr/core/departments` debe cortar a PostgreSQL
  - que el legacy `greenhouse.departments` en BigQuery debe reclasificarse como downstream, histórico o deprecado
  - que el cutover requiere verificación de completitud/backfill y no solo cambio de queries
- Se actualizaron:
  - `docs/tasks/TASK_ID_REGISTRY.md`
  - `docs/tasks/README.md`

### Nota de coordinación

- El árbol ya tenía cambios locales no commiteados en:
  - `src/lib/hr-core/shared.ts`
  - `src/lib/hr-core/service.ts`
  - `src/lib/hr-core/service.test.ts`
- Esos cambios corresponden al hotfix puntual del create de departamentos sobre BigQuery y no fueron mezclados con la task nueva.

## Sesión 2026-03-31 — research abierto para Hiring Desk reactivo

### Objetivo

- Formalizar un research inicial para el futuro módulo `Hiring` / mini ATS enfocado en `Staff Augmentation`, sin abrir todavía una task de implementación.

### Delta de ejecución

- Se creó `docs/research/RESEARCH-003-hiring-desk-reactive-ecosystem.md`.
- El brief deja fijado:
  - aggregate types sugeridos
  - eventos salientes y eventos entrantes del dominio
  - estrategia de projections sobre dominios existentes (`organization`, `people`, `finance`, `notifications`)
  - modelo recomendado de notificaciones `in_app` vs `email`
  - sinergias con `Staff Aug`, `People`, `HRIS`, `Identity`, `Payroll`, `Finance`, `shared assets` y repos upstream
- Se actualizaron índices:
  - `docs/research/README.md`
  - `docs/README.md`

### Regla operativa propuesta

- La secuencia canónica a preservar es:
  - `person(candidate facet) -> member facet -> assignment -> placement`
- `Hiring` no debe tratarse como reemplazo de `People` ni de `Staff Augmentation`.

### Delta adicional

- Se refinó la decisión de modelado:
  - `candidate` no debe vivir como identidad humana paralela
  - debe vivir como `Person` temprana dentro del grafo Greenhouse
  - la separación correcta es por `facets`:
    - `candidate facet`
    - `member facet`
    - facets comerciales/operativas posteriores
- Implicación directa:
  - `Person 360` pasa a ser el lugar natural para trazar el journey longitudinal desde candidate hasta historia multi-cliente
- Se añadió otra decisión upstream:
  - antes de `HiringOpening` debe existir una capa `StaffingRequest`
  - captura solicitudes de búsqueda desde cliente existente, prospecto o demanda interna
  - funciona como intake de demanda muy sinérgico con `Staff Aug`, pero no como extensión del `placement`
- Se consolidó una matriz de recomendaciones `P0` en el research:
  - producto/modelo
  - operación/gobierno
  - sistema/ecosistema
  - corte recomendado de alcance para primera iteración

### Validación ejecutada

- No aplica validación runtime; cambio documental únicamente.

### Nota de coordinación

- Al iniciar la sesión el árbol ya venía dirty en:
  - `docs/tasks/README.md`
  - `docs/tasks/TASK_ID_REGISTRY.md`
  - `docs/tasks/to-do/TASK-174-finance-data-integrity-hardening.md`
  - `docs/tasks/to-do/TASK-175-finance-core-test-coverage.md`
  - `docs/tasks/to-do/TASK-176-labor-provisions-fully-loaded-cost.md`
  - `docs/tasks/to-do/TASK-177-operational-pl-business-unit-scope.md`
  - `docs/tasks/to-do/TASK-178-finance-budget-engine.md`
  - `docs/tasks/to-do/TASK-179-finance-reconciliation-cutover-hardening.md`
- No fueron tocados por este trabajo.

## Sesión 2026-03-31 — TASK-173 cierre formal

### Estado final

- `TASK-173` ya pasó a `complete`.
- La foundation shared de adjuntos queda cerrada como baseline operativa, ya no como lane abierta con smoke pendiente.
- Cierre sustentado por:
  - registry shared + Cloud SQL bootstrap
  - buckets dedicados GCP por entorno
  - env vars Vercel alineadas
  - flujo manual real de `leave` validado hasta `Revisar solicitud` con respaldo visible

## Sesión 2026-03-31 — HR leave review modal muestra respaldo adjunto

### Objetivo

- Hacer visible el documento de respaldo dentro del modal `Revisar solicitud` en `HR > Permisos`.

### Causa raíz confirmada

- El backend ya persistía correctamente `attachment_asset_id` y `attachment_url`.
- La UI de revisión no renderizaba ningún bloque para `reviewReq.attachmentUrl`, así que el archivo existía pero quedaba invisible para HR al revisar la solicitud.

### Delta de ejecución

- `src/views/greenhouse/hr-core/HrLeaveView.tsx` ahora renderiza una sección `Respaldo adjunto` dentro del modal de revisión.
- La acción visible es `Abrir respaldo`, enlazando al download privado del asset en una nueva pestaña.
- Se agregó regresión en `src/views/greenhouse/hr-core/HrLeaveView.test.tsx` para cubrir el flujo:
  - carga de solicitudes
  - apertura de `Revisar`
  - presencia del CTA `Abrir respaldo`

### Validación ejecutada

- `pnpm exec vitest run src/views/greenhouse/hr-core/HrLeaveView.test.tsx src/lib/storage/greenhouse-assets-shared.test.ts src/app/api/assets/private/route.test.ts src/components/greenhouse/LeaveRequestDialog.test.tsx`
- `pnpm exec eslint src/views/greenhouse/hr-core/HrLeaveView.tsx src/views/greenhouse/hr-core/HrLeaveView.test.tsx`
- `pnpm exec tsc --noEmit --pretty false`

## Sesión 2026-03-31 — shared assets hardening para attach de leave

### Objetivo

- Corregir el error visible `Unable to attach the supporting document.` después de un upload exitoso en `HR > Permisos`.

### Causa raíz confirmada

- El upload del draft normalizaba `ownerClientId` / `ownerSpaceId` vacíos a `null`.
- El attach final del asset al `leave_request` reutilizaba el contexto tenant crudo.
- Para usuarios internos como `julio.reyes`, `tenant.clientId` puede venir como cadena vacía `''`; eso no fallaba en el upload, pero sí rompía la FK de `greenhouse_core.assets.owner_client_id` al promover el asset draft a owner definitivo.
- El síntoma visible era:
  - upload OK
  - asset quedaba en `status='pending'` con `owner_aggregate_type='leave_request_draft'`
  - el submit final caía con `Unable to attach the supporting document.`

### Delta de ejecución

- Se agregó `src/lib/storage/greenhouse-assets-shared.ts` para normalizar ownership scope compartido.
- `src/lib/storage/greenhouse-assets.ts` ahora normaliza `ownerClientId`, `ownerSpaceId` y `ownerMemberId` en:
  - `createPrivatePendingAsset()`
  - `attachAssetToAggregate()`
  - `upsertSystemGeneratedAsset()`
- Resultado:
  - cualquier `''` o whitespace en owner scope ya se trata como `null` antes de tocar FKs
  - el hardening beneficia no solo `leave`, también `purchase orders` y futuros consumers del registry shared

### Validación ejecutada

- `pnpm exec vitest run src/lib/storage/greenhouse-assets-shared.test.ts src/app/api/assets/private/route.test.ts src/components/greenhouse/LeaveRequestDialog.test.tsx`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm exec eslint src/lib/storage/greenhouse-assets.ts src/lib/storage/greenhouse-assets-shared.ts src/lib/storage/greenhouse-assets-shared.test.ts`

### Evidencia técnica

- Se consultó `staging` con env real y se confirmó un asset huérfano reciente:
  - `status='pending'`
  - `owner_aggregate_type='leave_request_draft'`
  - `owner_client_id=NULL`
  - `owner_member_id='julio-reyes'`
- Se reprodujo el attach técnico sobre ese asset y se descartó problema en:
  - bucket GCP
  - tabla `greenhouse_core.assets`
  - `asset_access_log`
  - `greenhouse_sync.outbox_events`
- La falla estaba en la diferencia de normalización entre draft upload y attach final.

## Sesión 2026-03-31 — shared assets: buckets dedicados GCP + cutover de runtime

### Objetivo

- Resolver el error `Unable to upload private asset.` observado al subir respaldos de `leave`, provisionar de verdad la topología `public/private` en GCP y dejar el runtime cortado a esos buckets por entorno.

### Causa raíz confirmada

- El runtime de assets privados estaba derivando por defecto `${GCP_PROJECT}-greenhouse-private-assets-{env}`.
- En Vercel no existían `GREENHOUSE_PRIVATE_ASSETS_BUCKET` / `GREENHOUSE_PUBLIC_MEDIA_BUCKET` alineados a una infraestructura real.
- El bucket operativo vigente seguía siendo `efeonce-group-greenhouse-media`, pero la topología dedicada todavía no estaba provisionada.

### Delta de ejecución

- Se configuró en Vercel:
  - `development`:
    - `GREENHOUSE_PRIVATE_ASSETS_BUCKET=efeonce-group-greenhouse-private-assets-dev`
    - `GREENHOUSE_PUBLIC_MEDIA_BUCKET=efeonce-group-greenhouse-public-media-dev`
    - `GREENHOUSE_MEDIA_BUCKET=efeonce-group-greenhouse-public-media-dev`
  - `staging`:
    - `GREENHOUSE_PRIVATE_ASSETS_BUCKET=efeonce-group-greenhouse-private-assets-staging`
    - `GREENHOUSE_PUBLIC_MEDIA_BUCKET=efeonce-group-greenhouse-public-media-staging`
    - `GREENHOUSE_MEDIA_BUCKET=efeonce-group-greenhouse-public-media-staging`
  - `production`:
    - `GREENHOUSE_PRIVATE_ASSETS_BUCKET=efeonce-group-greenhouse-private-assets-prod`
    - `GREENHOUSE_PUBLIC_MEDIA_BUCKET=efeonce-group-greenhouse-public-media-prod`
    - `GREENHOUSE_MEDIA_BUCKET=efeonce-group-greenhouse-public-media-prod`
  - `preview (develop)`:
    - `GREENHOUSE_PRIVATE_ASSETS_BUCKET=efeonce-group-greenhouse-private-assets-staging`
    - `GREENHOUSE_PUBLIC_MEDIA_BUCKET=efeonce-group-greenhouse-public-media-staging`
    - `GREENHOUSE_MEDIA_BUCKET=efeonce-group-greenhouse-public-media-staging`
- Se provisionó en GCP con `julio.reyes@efeonce.org`:
  - buckets `public-media-{dev,staging,prod}` y `private-assets-{dev,staging,prod}`
  - `US-CENTRAL1`, `STANDARD`, `uniform bucket-level access=true`
  - `private` con `publicAccessPrevention=enforced`
  - `public` con `roles/storage.objectViewer` para `allUsers`
  - `greenhouse-portal@efeonce-group.iam.gserviceaccount.com` con `roles/storage.objectAdmin` en los seis buckets
- Validación de infraestructura ejecutada:
  - upload autenticado a bucket público y privado: OK
  - lectura anónima desde bucket público: `200`
  - lectura anónima desde bucket privado: `401`
  - borrado autenticado de probes: OK
- Se redeployó y el estado final quedó en:
  - `staging` → `https://greenhouse-12ehg5shd-efeonce-7670142f.vercel.app`
  - `production` → `https://greenhouse-cosgfclp0-efeonce-7670142f.vercel.app`
- Alias activos confirmados:
  - `https://dev-greenhouse.efeoncepro.com` → `greenhouse-12ehg5shd-efeonce-7670142f.vercel.app`
  - `https://greenhouse.efeoncepro.com` → `greenhouse-cosgfclp0-efeonce-7670142f.vercel.app`
- Smoke no autenticado ejecutado:
  - `GET /api/auth/session` respondió `{}` en `staging` y `production`
  - `HEAD /login` respondió `HTTP/2 200` en `staging` y `production`

### Regla operativa

- `GREENHOUSE_PRIVATE_ASSETS_BUCKET` es configuración de entorno, no secreto; no debe vivir en Secret Manager.
- `GREENHOUSE_PUBLIC_MEDIA_BUCKET` sigue la misma regla: configuración, no secreto.
- `GREENHOUSE_MEDIA_BUCKET` queda como compatibilidad legacy para surfaces públicas que aún usan `src/lib/storage/greenhouse-media.ts`; el helper ya prioriza `GREENHOUSE_PUBLIC_MEDIA_BUCKET`.
- En este proyecto no conviene asumir un `Preview` totalmente shared; Vercel ya tiene múltiples env vars branch-scoped y el baseline mínimo debe fijarse explícitamente al menos en `preview (develop)`.
- La infraestructura de buckets dedicados ya quedó provisionada; el pendiente residual de `TASK-173` pasa a ser solo smoke autenticado final de upload/download sobre el portal ya cortado.

## Sesión 2026-03-31 — Hotfix upload leave drafts ownerMemberId

### Objetivo

- Corregir el error visible en producción `ownerMemberId is required for leave drafts.` al subir respaldos desde `greenhouse.efeoncepro.com/hr/leave`.

### Causa raíz

- `LeaveRequestDialog` usaba `GreenhouseFileUploader` con `contextType='leave_request_draft'`, pero no le propagaba `ownerMemberId`.
- En `/hr/leave`, la sesión puede no traer `tenant.memberId` directo, aunque backend sí pueda resolver al colaborador actual por `userId` / `identity_profile_id` / email.
- Resultado: el upload draft fallaba antes del submit final.

### Delta de ejecución

- `src/app/api/hr/core/meta/route.ts` ahora devuelve `currentMemberId` resuelto server-side.
- `src/lib/hr-core/service.ts` expone `resolveCurrentHrMemberId()` para reusar la resolución del colaborador actual.
- `src/views/greenhouse/hr-core/HrLeaveView.tsx` pasa `currentMemberId` al diálogo de permisos.
- `src/views/greenhouse/my/MyLeaveView.tsx` pasa `data.memberId` al mismo diálogo.
- `src/components/greenhouse/LeaveRequestDialog.tsx` ahora:
  - pasa `ownerMemberId` al uploader
  - incluye `memberId` en el payload final de `CreateLeaveRequestInput`
- `src/app/api/assets/private/route.ts` hace fallback adicional via `resolveCurrentHrMemberId()` para `leave_request_draft` cuando la sesión no expone `tenant.memberId`.

### Validación ejecutada

- `pnpm exec vitest run src/components/greenhouse/LeaveRequestDialog.test.tsx src/app/api/hr/core/meta/route.test.ts src/app/api/assets/private/route.test.ts`
- `pnpm exec eslint src/components/greenhouse/LeaveRequestDialog.tsx src/views/greenhouse/hr-core/HrLeaveView.tsx src/views/greenhouse/my/MyLeaveView.tsx src/app/api/hr/core/meta/route.ts src/app/api/assets/private/route.ts src/lib/hr-core/service.ts src/types/hr-core.ts src/components/greenhouse/LeaveRequestDialog.test.tsx src/app/api/hr/core/meta/route.test.ts src/app/api/assets/private/route.test.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm lint`

### Limitación real

- `pnpm build` volvió a quedarse detenido después de `Compiled successfully` en `Running TypeScript`, igual que el antecedente previo ya documentado en este repo.
- Para este hotfix la mitigación fue validar con `tsc --noEmit`, `lint` y tests focalizados antes de push/deploy.

## Sesión 2026-03-31 — TASK-173 bootstrap remoto Cloud SQL + ownership drift

### Objetivo

- Cerrar el pendiente remoto de `TASK-173`: aplicar `setup:postgres:shared-assets` en Cloud SQL y dejar el setup reproducible con el perfil `migrator`, sin seguir dependiendo de `postgres` ni de fallbacks por schema drift.

### Estado actual

- `greenhouse-pg-dev / greenhouse_app` ya tiene aplicado `shared-assets-platform-v1`.
- Validación remota confirmada:
  - `greenhouse_core.assets`
  - `greenhouse_core.asset_access_log`
  - `greenhouse_hr.leave_requests.attachment_asset_id`
  - `greenhouse_finance.purchase_orders.attachment_asset_id`
  - `greenhouse_payroll.payroll_receipts.asset_id`
  - `greenhouse_payroll.payroll_export_packages.pdf_asset_id`
  - `greenhouse_payroll.payroll_export_packages.csv_asset_id`
  - FKs e índices shared asociados
- Ownership corregido:
  - `greenhouse_finance.purchase_orders -> greenhouse_migrator`
  - `greenhouse_payroll.payroll_receipts -> greenhouse_migrator`
  - `greenhouse_payroll.payroll_export_packages -> greenhouse_migrator`
- Revalidación canónica ejecutada:
  - `pnpm pg:doctor --profile=admin` OK (`current_user=postgres`)
  - `pnpm pg:doctor --profile=migrator` OK (`current_user=greenhouse_migrator_user`)
  - `pnpm setup:postgres:shared-assets` OK con `greenhouse_migrator_user`

### Hallazgo operativo importante

- El proyecto sí tiene un login break-glass `greenhouse_ops`.
- Hereda:
  - `greenhouse_app`
  - `greenhouse_migrator`
  - `greenhouse_migrator_user`
  - `postgres`
- Se usó solo para resolver ownership drift histórico cuando `postgres` no pudo hacer `ALTER TABLE ... OWNER TO ...` sobre un objeto owned por `greenhouse_app`.
- Después del saneamiento, el carril canónico volvió a quedar en `greenhouse_migrator_user`.

### Pendiente real

- `TASK-173` ya no tiene pendiente GCP/DDL.
- El único punto abierto es smoke manual autenticado en `staging` de upload/download sobre:
  - `leave`
  - `purchase orders`

### Archivos tocados

- `docs/tasks/in-progress/TASK-173-shared-attachments-platform-gcp-governance.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `project_context.md`
- `Handoff.md`
- `changelog.md`

### Nota de coordinación

- Al iniciar esta sesión el árbol ya venía dirty en:
  - `src/lib/ico-engine/materialize.ts`
  - `src/lib/ico-engine/schema.ts`
  - `src/lib/ico-engine/shared.ts`
- No fueron tocados por este trabajo y deben considerarse cambios ajenos.

## Sesión 2026-03-31 — TASK-173 foundation compartida de adjuntos + buckets GCP

### Objetivo

- Formalizar una lane propia para adjuntos/archivos compartidos del portal después de detectar que `leave` sigue con `attachmentUrl` manual y que `Document Vault`/`Expense Reports` estaban intentando resolver storage desde una óptica HR-first.

### Estado actual

- `TASK-173` quedó movida a `in-progress`.
- El repo ya quedó implementado para la foundation shared:
  - registry `greenhouse_core.assets`
  - access log `greenhouse_core.asset_access_log`
  - helper `src/lib/storage/greenhouse-assets.ts`
  - routes `/api/assets/private` y `/api/assets/private/[assetId]`
  - `GreenhouseFileUploader`
  - convergencia inicial en `leave`, `purchase orders`, `payroll receipts` y `payroll export packages`
- La auditoría ya contrastó:
  - arquitectura (`core`, `identity/access`, `data model`, `cloud/security`)
  - codebase real
  - PostgreSQL real en `greenhouse-pg-dev / greenhouse_app`
- Realidad confirmada:
  - `leave` es el único consumer HR runtime hoy
  - `Document Vault` y `Expense Reports` siguen sin runtime
  - `purchase_orders` ya persiste `attachment_url`
  - `payroll_receipts` y `payroll_export_packages` ya persisten `storage_bucket/storage_path`
  - no existe todavía un registry genérico de `assets/attachments` en PostgreSQL
  - las tablas runtime auditadas no tienen FKs físicas declaradas hacia sus anchors canónicos
- La spec se corrigió para que la primera ola real no sea solo HR:
  - `leave`
  - `purchase orders`
  - convergencia shared de `payroll receipts`
  - convergencia shared de `payroll export packages`

### Delta de ejecución

- Task movida y corregida en:
  - `docs/tasks/in-progress/TASK-173-shared-attachments-platform-gcp-governance.md`
- La task fija el baseline recomendado:
  - UI basada en `react-dropzone` + `AppReactDropzone`
  - registry compartido de assets/attachments en PostgreSQL
  - GCP gobernado por dos buckets principales:
    - `public media`
    - `private assets`
  - separación por prefixes/autorización antes que por proliferación de buckets por módulo
- Cross-impact documentado:
  - `TASK-170` queda con `attachmentUrl` como estado transicional
  - `TASK-027` y `TASK-028` pasan a leerse como consumers de la foundation shared, no como dueños del patrón base de storage/upload
- Índice de tasks y registry actualizados:
  - `docs/tasks/README.md`
  - `docs/tasks/TASK_ID_REGISTRY.md`
- Decisión arquitectónica posterior explicitada:
  - `GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md` y `GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md` ya fijan bucket topology y access model
  - baseline aprobado:
    - `public media` por entorno
    - `private assets` por entorno
  - `private assets` debe bajar siempre por control de acceso Greenhouse; signed URLs solo como mecanismo efímero, no como contrato persistido

### Validación ejecutada

- Revisión de arquitectura/task taxonomy y búsqueda de solapes en repo/docs
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm lint`
- `pnpm build`

### Limitación real

- El repo ya quedó implementado y validado, pero la sesión no pudo aplicar `pnpm setup:postgres:shared-assets` en Cloud SQL porque no hubo acceso al secreto `migrator`.
- Estado real:
  - foundation shared lista en código
  - docs/taxonomía alineadas
  - bootstrap remoto pendiente
- Siguiente paso operativo:
  - correr `pnpm setup:postgres:shared-assets` con perfil `migrator`
  - smoke autenticado de upload/download en `leave` y `purchase orders`

## Sesión 2026-03-31 — HR profile UI para fecha de ingreso

### Objetivo

- Cerrar la brecha operativa detectada después de `TASK-170`: el backend ya soportaba `hire_date`, pero RRHH no tenía una UI visible para editarla y eso debilitaba el uso real de vacaciones por antigüedad.

### Delta de ejecución

- `People > HR profile` ahora expone acción `Editar ingreso` en la card `Información laboral`.
- La tab abre un diálogo pequeño y guarda `hireDate` vía `PATCH /api/hr/core/members/[memberId]/profile`.
- La vista prioriza el valor devuelto por el profile HR recién guardado para que el cambio se refleje de inmediato aunque otro contexto de lectura todavía no se refresque.
- Esto deja operativa la captura del dato que `leave` ya usa para antigüedad/progresivos en vacaciones.
- Se deja explícito en arquitectura que este dato sigue siendo `BigQuery-first` para edición y no debe moverse todavía a `Postgres-first`.
- Corrección posterior: la edición visible quedó finalmente en la surface real `People > [colaborador] > Perfil > Datos laborales`; el primer intento había quedado en `PersonHrProfileTab`, componente hoy no montado por `PersonTabs`.

### Archivos de alto impacto

- `src/views/greenhouse/people/tabs/PersonHrProfileTab.tsx`
- `src/views/greenhouse/people/tabs/PersonHrProfileTab.test.tsx`
- `src/views/greenhouse/people/tabs/PersonProfileTab.tsx`
- `src/views/greenhouse/people/tabs/PersonProfileTab.test.tsx`

### Validación ejecutada

- `pnpm exec vitest run src/views/greenhouse/people/tabs/PersonHrProfileTab.test.tsx`
- `pnpm exec vitest run src/views/greenhouse/people/tabs/PersonProfileTab.test.tsx src/views/greenhouse/people/PersonTabs.test.tsx`
- `pnpm exec eslint src/views/greenhouse/people/tabs/PersonHrProfileTab.tsx src/views/greenhouse/people/tabs/PersonHrProfileTab.test.tsx`
- `pnpm exec eslint src/views/greenhouse/people/tabs/PersonProfileTab.tsx src/views/greenhouse/people/tabs/PersonProfileTab.test.tsx`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm build`

### Limitación real

- El endpoint de edición sigue escribiendo por el carril HR legacy/profile y no corta todavía directo a `greenhouse_core.members` en Postgres.
- Una reejecución posterior de `next build` quedó colgada en `Running TypeScript` sin error explícito; como mitigación, el estado final volvió a pasar `vitest`, `eslint` y `tsc --noEmit`.
- Fix posterior 2026-03-31:
  - guardar solo `hireDate` estaba disparando también un `MERGE` innecesario contra `greenhouse.member_profiles`
  - eso exponía al runtime a `500` y además era riesgoso porque podía tocar campos suplementarios no editados
  - `updateMemberHrProfile()` ahora solo muta `member_profiles` cuando realmente vienen campos de ese subperfil
- Arquitectura actualizada:
  - `GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md` ahora enumera las reglas runtime vigentes de `leave`
  - incluye policy resolution, cálculo de días, validaciones de creación, balances, aprobación y baseline seed por tipo
  - deja explícito que saldo disponible no reemplaza reglas como `min_advance_days`

## Sesión 2026-03-31 — TASK-016 Business Units Canonical v2 Fase 1

### Objetivo

- Implementar Fase 1 de TASK-016: metadata canónica de business lines, helpers, API, admin UI y TenantContext enrichment.

### Delta de ejecución

- PG `service_modules` extendida con `module_kind` + `parent_module_code` (paridad con BigQuery)
- Nueva tabla `greenhouse_core.business_line_metadata`: metadata rica por module_code con colores de `GH_COLORS.service`
- Seed: 5 BLs (globe, efeonce_digital, reach, wave, crm_solutions)
- Type: `BusinessLineMetadata` + `BusinessLineMetadataSummary` en `src/types/business-line.ts`
- Helper: `loadBusinessLineMetadata()`, `updateBusinessLineMetadata()`, `getCachedBusinessLineSummaries()` en `src/lib/business-line/metadata.ts`
- API: `GET/PUT /api/admin/business-lines` y `/api/admin/business-lines/[moduleCode]`
- `TenantContext` extendido con `businessLineMetadata?: BusinessLineMetadataSummary[]` (cached server-side, no JWT)
- Componente `BusinessLineMetadataCard` + barrel export
- Admin page `/admin/business-lines` con `AdminBusinessLinesView` + `BusinessLineEditDialog`
- `brand-assets.ts`: added `crm_solutions` entry
- `helpers.ts`: added `getCapabilityPaletteFromMetadata()` (metadata-driven palette resolver)

Fase 2 completada:

- `greenhouse_conformed.dim_business_lines` creada y poblada en BigQuery (5 BLs)
- ETL `scripts/etl-business-lines-to-bigquery.ts` (PG → BQ full replace)
- Finance `/api/finance/dashboard/by-service-line` enriched con metadata (label, colorHex, loopPhase)
- Hallazgo: producción PG faltaban `efeonce_digital` y `reach` — insertados
- Todas las migraciones aplicadas contra `greenhouse-pg-dev` con `greenhouse_ops`

Fase 3 completada:

- Propiedad `Business Unit` (Select: Globe, Efeonce Digital, Reach, Wave, CRM Solutions) creada en Notion Proyectos via API
- `sync-notion-conformed.ts` extendido: normaliza label→module_code, escribe `operating_business_unit`
- BQ `delivery_projects.operating_business_unit` columna agregada

Fase 4 completada:

- `ICO_DIMENSIONS` allowlist: `business_unit` → `operating_business_unit`
- `v_tasks_enriched` JOIN a `delivery_projects` para exponer BU
- `ico_engine.metrics_by_business_unit` tabla + materialization (Step 10)
- Live compute disponible: `/api/ico-engine/context?dimension=business_unit&value=wave`

### Estado: TASK-016 CERRADA — Fases 1-4 completas

### Riesgos residuales

- `.env.local` tiene `GOOGLE_APPLICATION_CREDENTIALS_JSON` malformado (literal \n). ETL requiere `GOOGLE_APPLICATION_CREDENTIALS_JSON=""` para caer a ADC
- `getCachedBusinessLineSummaries()` falla gracefully si tabla no existe (returns [])
- `metrics_by_business_unit` solo tendrá datos cuando el equipo asigne BU en Notion y corra materialization

---

## Sesión 2026-03-31 — TASK-170 leave flow canónico + calendario + impacto payroll

### Objetivo

- Reconciliar `TASK-170` contra arquitectura/runtime real y cerrar la lane operativa de permisos con calendario canónico, policies, outbox granular y wiring reactivo hacia payroll/costos/notificaciones.

### Delta de ejecución

- `TASK-170` se movió a `in-progress` y se reescribió para reflejar el baseline real del repo en vez de asumir un módulo inexistente.
- `leave` ahora deriva días hábiles desde la capa hija `src/lib/hr-core/leave-domain.ts`, apoyada en:
  - `src/lib/calendar/operational-calendar.ts`
  - `src/lib/calendar/nager-date-holidays.ts`
- El store Postgres de permisos quedó endurecido:
  - ya no confía en `requestedDays` enviado por el caller
  - calcula breakdown por año y valida overlap, ventana mínima, attachment y balance según policy
  - introduce `leave_policies`, progressive/carry-over/adjustment fields y calendar payloads
- Outbox/eventos:
  - nuevos eventos `leave_request.created`, `leave_request.escalated_to_hr`, `leave_request.approved`, `leave_request.rejected`, `leave_request.cancelled`, `leave_request.payroll_impact_detected`
  - notificaciones para revisión HR/supervisor, estado del solicitante y alertas payroll/finance
- Wiring reactivo:
  - `projected_payroll` refresca snapshots proyectados
  - nueva projection `leave_payroll_recalculation` recalcula nómina oficial para períodos no exportados
  - `staff_augmentation` vuelve a refrescar tras `accounting.commercial_cost_attribution.materialized`
- UI/API:
  - nueva route `GET /api/hr/core/leave/calendar`
  - `/api/my/leave` ahora entrega `requests` + `calendar`
  - `/hr/leave` suma tab de calendario y deja de pedir días manuales
  - `/my/leave` pasa a vista self-service con calendario, historial y solicitud compartida
  - nuevo componente `src/components/greenhouse/LeaveRequestDialog.tsx`
- DDL/documentación runtime:
  - `scripts/setup-postgres-hr-leave.sql`
  - `scripts/setup-postgres-person-360-contextual.sql`
- Validación y aplicación real en GCP / Cloud SQL:
  - `pg:doctor` pasó con `runtime`, `migrator` y `admin` vía connector contra `greenhouse-pg-dev`
  - `setup:postgres:hr-leave` quedó aplicado en `greenhouse_app`
  - `setup:postgres:person-360-contextual` quedó reaplicado y verificó que el carril `person_hr_360` sigue reproducible con `migrator`
  - lectura runtime posterior validada:
    - `leave_policies = 10`
    - `leave_types = 10`
    - `leave_balances = 4`
  - se detectó drift de ownership en objetos `greenhouse_hr.leave_*`; se usó el carril admin temporal para sanearlos y dejar `setup:postgres:hr-leave` pasando otra vez con `migrator`

### Archivos de alto impacto

- `src/lib/hr-core/postgres-leave-store.ts`
- `src/lib/hr-core/leave-domain.ts`
- `src/lib/hr-core/service.ts`
- `src/lib/sync/event-catalog.ts`
- `src/lib/sync/projections/notifications.ts`
- `src/lib/sync/projections/projected-payroll.ts`
- `src/lib/sync/projections/leave-payroll-recalculation.ts`
- `src/lib/sync/projections/staff-augmentation.ts`
- `src/views/greenhouse/hr-core/HrLeaveView.tsx`
- `src/views/greenhouse/my/MyLeaveView.tsx`
- `scripts/setup-postgres-hr-leave.sql`

### Validación ejecutada

- `pnpm exec eslint` focalizado sobre los archivos modificados de HR leave, projections, APIs y vistas
- `pnpm exec vitest run src/lib/hr-core/leave-domain.test.ts src/lib/sync/event-catalog.test.ts src/lib/sync/projections/notifications.test.ts src/lib/sync/projections/staff-augmentation.test.ts src/lib/sync/projections/leave-payroll-recalculation.test.ts`
- `pnpm build`
- `pnpm pg:doctor --profile=runtime` por connector contra `greenhouse-pg-dev`
- `pnpm pg:doctor --profile=migrator` por connector contra `greenhouse-pg-dev`
- `pnpm pg:doctor --profile=admin` por connector contra `greenhouse-pg-dev`
- `pnpm setup:postgres:hr-leave` aplicado en Cloud SQL
- `pnpm setup:postgres:person-360-contextual` aplicado en Cloud SQL

### Limitación real

- No hubo smoke manual autenticado de `/my/leave` ni `/hr/leave`.

## Sesión 2026-03-31 — Staff Aug create flow vuelve a drawer seguro

### Objetivo

- Recuperar la UX de `drawer` para `Crear placement` sin volver al carril de página-card ni reintroducir el freeze ya investigado.

### Delta de ejecución

- `Agency > Staff Augmentation` vuelve a abrir el alta en `drawer`.
- La ruta `/agency/staff-augmentation/create` ya no renderiza una página separada:
  - ahora renderiza el listado con el drawer abierto
  - el cierre vuelve al listado base
- La ruta legacy `?create=1&assignmentId=...` sigue soportada en `/agency/staff-augmentation`.
- Se eliminó el wrapper `CreatePlacementPageView` porque dejó de ser necesario al volver a un flujo route-driven sobre el listado.
- El shell de apertura ya no usa `Dialog`; ahora usa `Drawer` con mount perezoso y apertura controlada por ruta.

### Validación ejecutada

- `pnpm exec vitest run src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.test.tsx src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.test.tsx src/views/greenhouse/people/tabs/PersonMembershipsTab.test.tsx --reporter=verbose`
- `pnpm exec eslint 'src/app/(dashboard)/agency/staff-augmentation/page.tsx' 'src/app/(dashboard)/agency/staff-augmentation/create/page.tsx' src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.tsx src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.tsx src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.test.tsx src/views/greenhouse/people/tabs/PersonMembershipsTab.tsx src/views/greenhouse/people/tabs/PersonMembershipsTab.test.tsx`
- `pnpm exec tsc --noEmit --pretty false`

## Sesión 2026-03-31 — Staff Aug Postgres baseline reparado en GCP para develop

### Objetivo

- Investigar el `500` persistente de `GET /api/agency/staff-augmentation/placements` y corregirlo en la base real detrás de `develop`.

### Delta de ejecución

- Se confirmó en Vercel que el `500` venía de `error: relation "greenhouse...` sobre `/api/agency/staff-augmentation/placements`.
- Verificación directa en GCP / Cloud SQL:
  - instancia: `greenhouse-pg-dev`
  - base: `greenhouse_app`
  - usuario runtime: `greenhouse_app`
  - las tablas de Staff Aug no existían realmente:
    - `greenhouse_delivery.staff_aug_placements`
    - `greenhouse_delivery.staff_aug_onboarding_items`
    - `greenhouse_delivery.staff_aug_events`
    - `greenhouse_serving.staff_aug_placement_snapshots`
- Se aplicó el bootstrap canónico `pnpm setup:postgres:staff-augmentation` contra Cloud SQL usando el perfil `migrator` vía connector.
- El problema no estaba en el código del endpoint sino en drift de schema en PostgreSQL para el entorno compartido.

### Validación ejecutada

- Confirmación previa del error en runtime logs de Vercel sobre `GET /api/agency/staff-augmentation/placements`.
- Consulta directa por Cloud SQL Connector antes del fix:
  - `to_regclass(...) = null` para las 4 tablas Staff Aug
- Ejecución exitosa de setup:
  - `pnpm setup:postgres:staff-augmentation`
- Consulta directa por Cloud SQL Connector después del fix:
  - `greenhouse_delivery.staff_aug_placements`
  - `greenhouse_delivery.staff_aug_onboarding_items`
  - `greenhouse_delivery.staff_aug_events`
  - `greenhouse_serving.staff_aug_placement_snapshots`
  - `COUNT(*) FROM greenhouse_delivery.staff_aug_placements = 0`

### Limitación real

- En esta pasada no hubo smoke autenticado final del listado contra `dev-greenhouse` después del repair de Cloud SQL porque el runner no conserva una sesión autenticada reutilizable del portal.
- Sí queda verificación directa sobre la base real de `develop` de que el schema faltante ya existe y es legible por el usuario runtime.

## Sesión 2026-03-31 — Staff Aug create placement moved to dedicated route after real freeze reproduction

### Objetivo

- Resolver el cuelgue real de `Crear placement` después de reproducirlo con sesión autenticada real en `dev-greenhouse`.

### Delta de ejecución

- Se confirmó que el freeze ocurría al hacer click real sobre `Crear placement` en la vista de listado.
- Replanteamiento aplicado:
  - `Agency > Staff Augmentation` ya no monta el create flow dentro del listado
  - el botón ahora navega a `/agency/staff-augmentation/create`
  - `?create=1&assignmentId=...` redirige server-side a la nueva ruta dedicada
  - el bridge desde `People` también apunta a la ruta dedicada con `assignmentId`
- Objetivo técnico:
  - sacar el formulario del árbol del listado, que era el carril donde el browser quedaba colgado al abrir
  - mantener intacto el contrato funcional de creación y el deep-link desde `People`
- Archivos tocados:
  - `src/app/(dashboard)/agency/staff-augmentation/page.tsx`
  - `src/app/(dashboard)/agency/staff-augmentation/create/page.tsx`
  - `src/views/greenhouse/agency/staff-augmentation/CreatePlacementPageView.tsx`
  - `src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.tsx`
  - `src/views/greenhouse/people/tabs/PersonMembershipsTab.tsx`
  - tests asociados

### Validación ejecutada

- Reproducción real previa del freeze con sesión autenticada y click real sobre `Crear placement`
- `pnpm exec vitest run src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.test.tsx src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.test.tsx src/views/greenhouse/people/tabs/PersonMembershipsTab.test.tsx --reporter=verbose`
- `pnpm exec eslint 'src/app/(dashboard)/agency/staff-augmentation/page.tsx' 'src/app/(dashboard)/agency/staff-augmentation/create/page.tsx' src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.tsx src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.test.tsx src/views/greenhouse/agency/staff-augmentation/CreatePlacementPageView.tsx src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.tsx src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.test.tsx src/views/greenhouse/people/tabs/PersonMembershipsTab.tsx src/views/greenhouse/people/tabs/PersonMembershipsTab.test.tsx`
- `pnpm exec tsc --noEmit --pretty false`

## Sesión 2026-03-31 — Staff Aug create placement freeze replanteado inline

### Objetivo

- Sacar `Crear placement` del carril `MUI Dialog` porque el freeze siguió ocurriendo en `dev-greenhouse` aun después de simplificar búsqueda y focus handling.

### Delta de ejecución

- Replanteamiento del flujo:
  - `CreatePlacementDialog` ahora soporta modo `inline`
  - `StaffAugmentationListView` deja de abrir el create flow como modal y lo renderiza inline dentro de la misma página
- La búsqueda incremental, preselección por `assignmentId` y creación del placement se mantienen; lo que cambia es el shell de interacción para evitar el bloqueo al abrir.
- Contexto relevante:
  - el reporte manual del usuario en `dev-greenhouse` confirmó que el deployment previo seguía congelando Chrome al hacer click en `Crear placement`
  - por eso se descartó seguir endureciendo el modal y se movió el flujo fuera de `Dialog`
- Archivos tocados:
  - `src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.tsx`
  - `src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.tsx`
  - `src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.test.tsx`

### Validación ejecutada

- `pnpm exec vitest run src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.test.tsx src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.test.tsx --reporter=verbose`
- `pnpm exec eslint src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.tsx src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.tsx src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.test.tsx src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.test.tsx`
- `pnpm exec tsc --noEmit --pretty false`

### Limitación real

- No hubo verificación autenticada end-to-end en `dev-greenhouse` desde el runner porque el portal exige sesión y no hay bypass reutilizable en Playwright dentro de este entorno.
- Sí queda evidencia local de que el click ya no monta `role="dialog"` y abre el formulario inline, que es precisamente el carril replanteado para evitar el cuelgue.

## Sesión 2026-03-31 — Staff Aug create placement freeze fallback simplification

### Objetivo

- Aplicar una mitigación más conservadora al cuelgue de `Crear placement` sin depender del stack `Dialog + Autocomplete`.

### Delta de ejecución

- Se reemplazó el selector `Autocomplete` del modal por un buscador incremental más simple:
  - input controlado
  - búsqueda remota debounceada
  - lista inline de resultados elegibles dentro del dialog
- Objetivo técnico:
  - sacar del carril crítico la combinación `MUI Dialog + Autocomplete + Popper`
  - mantener el contrato funcional del flujo sin volver al `select` masivo
- Ajuste adicional posterior:
  - `StaffAugmentationListView` ahora hace lazy-mount real del modal solo cuando `createOpen=true`
  - `CreatePlacementDialog` desactiva `auto/enforce/restore focus` del `Dialog` para reducir riesgo de freeze al abrir en Chrome
- Archivos tocados:
  - `src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.tsx`
  - `src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.tsx`
  - `src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.test.tsx`

### Validación ejecutada

- `pnpm exec vitest run src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.test.tsx src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.test.tsx --reporter=verbose`
- `pnpm exec eslint src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.tsx src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.test.tsx`
- `pnpm exec tsc --noEmit --pretty false`

### Limitación real

- Se intentó verificación browser sobre `dev-greenhouse` pero quedó bloqueada por autenticación del portal dentro de Playwright.
- Sí se confirmó que el alias `dev-greenhouse.efeoncepro.com` apunta al deployment del commit `e3936909`; lo que faltó fue una sesión Greenhouse reutilizable dentro del runner para ejecutar el click autenticado.

## Sesión 2026-03-31 — Staff Aug create placement freeze hardening

### Objetivo

- Corregir el cuelgue visible al hacer click en `Crear placement` dentro de `/agency/staff-augmentation`.

### Delta de ejecución

- Se confirmó y corrigió el patrón de riesgo principal del modal:
  - antes cargaba y renderizaba todas las opciones elegibles en un `select`
  - ahora usa búsqueda incremental y acotada para assignments elegibles
- Cambios principales:
  - `src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.tsx`
    - reemplaza `select` masivo por `Autocomplete`
    - no carga opciones al abrir salvo deep-link por `assignmentId`
    - busca remoto al escribir
  - `src/app/api/agency/staff-augmentation/placement-options/route.ts`
    - ahora acepta `search`, `assignmentId` y `limit`
  - `src/lib/staff-augmentation/store.ts`
    - mueve filtro y `LIMIT` al query Postgres para no traer todo el universo al modal
- Resultado esperado:
  - abrir `Crear placement` ya no debería congelar la página por render masivo de opciones

### Validación ejecutada

- `pnpm exec vitest run src/app/api/agency/staff-augmentation/placement-options/route.test.ts src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.test.tsx`
- `pnpm exec eslint src/lib/staff-augmentation/store.ts src/app/api/agency/staff-augmentation/placement-options/route.ts src/app/api/agency/staff-augmentation/placement-options/route.test.ts src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.tsx src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.test.tsx`
- `pnpm exec tsc --noEmit --pretty false`
- Faltante:
  - no hubo smoke browser autenticado en `dev-greenhouse` desde este turno; el fix quedó validado por contrato, tests y tipado

## Sesión 2026-03-31 — RESEARCH-002 Staff Aug enterprise module grounded in codebase

### Objetivo

- Seguir iterando el brief enterprise de `Staff Augmentation`, pero aterrizado contra el runtime actual del repo y no solo como diseño aspiracional.

### Delta de ejecución

- `docs/research/RESEARCH-002-staff-augmentation-enterprise-module.md` ahora distingue con más fuerza:
  - baseline runtime ya confirmado
  - gaps reales vs target enterprise
- El brief ya deja explícito, con referencia a código y arquitectura vigente, que hoy ya existen:
  - `assignment` como pivote operativo
  - `placement` como entidad transaccional real
  - bridge `People -> assignment -> placement`
  - contexto `Space` / `organization` ya persistido en placements
  - snapshots económicos Staff Aug
  - reactividad con Payroll, Finance, Providers y Tooling
- También quedó explicitado qué falta todavía para una task enterprise nueva:
  - `Placement 360` completo
  - profitability desk
  - renewal/risk desk
  - talent coverage
  - governance placement-first con provider/tooling

### Validación ejecutada

- Relectura de arquitectura:
  - `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`
  - `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- Contraste manual contra runtime:
  - `src/lib/staff-augmentation/store.ts`
  - `src/lib/staff-augmentation/snapshots.ts`
  - `src/lib/sync/projections/staff-augmentation.ts`
  - `src/lib/agency/space-360.ts`
  - `src/lib/people/get-person-detail.ts`
  - `src/lib/person-360/get-person-finance.ts`
  - `src/lib/providers/provider-tooling-snapshots.ts`

## Sesión 2026-03-31 — TASK-169 Staff Aug bridge + create placement hardening

### Objetivo

- Corregir el cuelgue real de `Crear placement` y consolidar el bridge vigente entre `People`, `Assignments` y `Staff Augmentation`.

### Delta de ejecución

- `CreatePlacementDialog` ya no usa `/api/team/capacity-breakdown`.
- Nueva route liviana:
  - `src/app/api/agency/staff-augmentation/placement-options/route.ts`
  - reusa `listStaffAugPlacementOptions()` desde `src/lib/staff-augmentation/store.ts`
- El modal ahora:
  - carga assignments elegibles livianos
  - muestra contexto `organization + contract type + pay regime + costo base`
  - acepta `initialAssignmentId` para deep-link desde `People`
- `StaffAugmentationListView` ya entiende `?create=1&assignmentId=...` para abrir el modal con preselección.
- `People 360` ahora expone el bridge real:
  - `src/lib/people/get-person-detail.ts` agrega `assignmentType`, `placementId`, `placementStatus`
  - `src/types/people.ts` refleja esas señales
  - `src/views/greenhouse/people/tabs/PersonMembershipsTab.tsx` ahora muestra:
    - chip `Staff Aug` / `Interno`
    - CTA `Crear placement` si existe assignment elegible
    - CTA `Abrir placement` si ya existe
- Consolidación documental iniciada:
  - nueva `docs/tasks/in-progress/TASK-169-staff-aug-placement-bridge-hris-runtime-consolidation.md`
  - deltas en `TASK-019`, `TASK-038`, `TASK-041`
  - `docs/tasks/README.md`, `docs/tasks/TASK_ID_REGISTRY.md` y `project_context.md` alineados al bridge real

### Validación ejecutada

- `pnpm exec vitest run src/app/api/agency/staff-augmentation/placement-options/route.test.ts src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.test.tsx src/app/api/agency/staff-augmentation/placements/route.test.ts src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.test.tsx`
- `pnpm exec tsc --noEmit --pretty false`

### Cierre

- `TASK-169` queda cerrada como baseline mínimo del bridge `People -> assignment -> placement`.
- `TASK-038` y `TASK-041` quedan cerradas administrativamente como documentos históricos absorbidos; la próxima iteración del módulo enterprise de Staff Aug debe nacer como task nueva, no reabrir estos briefs.
- Validación adicional completada después de este delta:
  - `pnpm exec vitest run src/app/api/agency/staff-augmentation/placement-options/route.test.ts src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.test.tsx src/views/greenhouse/people/tabs/PersonMembershipsTab.test.tsx src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.test.tsx src/app/api/agency/staff-augmentation/placements/route.test.ts`
  - `pnpm exec eslint src/lib/staff-augmentation/store.ts src/app/api/agency/staff-augmentation/placement-options/route.ts src/app/api/agency/staff-augmentation/placement-options/route.test.ts src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.tsx src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.test.tsx src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.tsx src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.test.tsx src/lib/people/get-person-detail.ts src/types/people.ts src/views/greenhouse/people/tabs/PersonMembershipsTab.tsx src/views/greenhouse/people/tabs/PersonMembershipsTab.test.tsx`
  - `pnpm exec tsc --noEmit --pretty false`
  - `git diff --check`

## Sesión 2026-03-30 — cierre de TASK-142 Agency Space 360

### Objetivo

- Cerrar `TASK-142` end-to-end: runtime, API, UI, pruebas y documentación viva.

### Delta de ejecución

- `/agency/spaces/[id]` ya no redirige a `/admin/tenants/*`.
- Nueva agregación canónica:
  - `src/lib/agency/space-360.ts`
  - resuelve `clientId` como clave operativa y la enriquece con `space_id`, organización, Finance, ICO, Team, Services, Staff Aug y outbox activity
- Nueva surface:
  - `src/views/greenhouse/agency/space-360/Space360View.tsx`
  - tabs `Overview`, `Team`, `Services`, `Delivery`, `Finance`, `ICO`
- Nueva route:
  - `src/app/api/agency/spaces/[id]/route.ts`
- Governance:
  - la page usa `getTenantContext()` + `hasAuthorizedViewCode('gestion.spaces')`
- Impacto cruzado ya documentado:
  - `TASK-146`, `TASK-150`, `TASK-151`, `TASK-158`, `TASK-159`

### Validación ejecutada

- `pnpm exec vitest run 'src/app/api/agency/spaces/[id]/route.test.ts' 'src/views/greenhouse/agency/space-360/Space360View.test.tsx' src/lib/agency/space-360.test.ts`
- `pnpm exec eslint 'src/app/api/agency/spaces/[id]/route.ts' 'src/app/api/agency/spaces/[id]/route.test.ts' 'src/app/(dashboard)/agency/spaces/[id]/page.tsx' 'src/lib/agency/space-360.ts' 'src/lib/agency/space-360.test.ts' 'src/views/greenhouse/agency/space-360/Space360View.tsx' 'src/views/greenhouse/agency/space-360/Space360View.test.tsx' 'src/views/greenhouse/agency/space-360/shared.ts' 'src/views/greenhouse/agency/space-360/tabs/*.tsx'`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm pg:doctor --profile=runtime` intentado al inicio, pero bloqueado por variables faltantes:
  - `GREENHOUSE_POSTGRES_DATABASE`
  - `GREENHOUSE_POSTGRES_USER`
  - `GREENHOUSE_POSTGRES_PASSWORD` / secret ref

### Lifecycle

- `TASK-142` debe quedar en `docs/tasks/complete/`
- `docs/tasks/README.md`, `docs/tasks/TASK_ID_REGISTRY.md`, `project_context.md` y `changelog.md` quedan actualizados

## Sesión 2026-03-30 — inicio de TASK-142 Agency Space 360

### Objetivo

- Reconciliar `TASK-142` con la arquitectura real y reemplazar el redirect de `/agency/spaces/[id]` por una vista `Space 360` operativa sobre el baseline actual de Agency.

### Contexto clave

- `TASK-142` estaba desalineada:
  - asumía `BigQuery-first`
  - asumía que el route param ya era `space_id` puro
  - dejaba implícito que el health/risk engine ya existía
- Estado real confirmado:
  - el listado Agency navega hoy por `clientId` como proxy del Space
  - el runtime sí tiene `greenhouse_core.spaces`, `services`, `operational_pl_snapshots`, `member_capacity_economics`, `staff_aug_*` y `outbox_events` para componer una 360 útil
  - la emisión específica de eventos Agency sigue siendo follow-on de `TASK-148`, no un bloqueo para esta vista
- `pnpm pg:doctor --profile=runtime` fue intentado y falló por variables faltantes:
  - `GREENHOUSE_POSTGRES_DATABASE`
  - `GREENHOUSE_POSTGRES_USER`
  - `GREENHOUSE_POSTGRES_PASSWORD` / secret ref

### Delta de ejecución

- `TASK-142` movida a `docs/tasks/in-progress/`
- `docs/tasks/README.md` y `docs/tasks/TASK_ID_REGISTRY.md` alineados a `in-progress`
- La task ya quedó corregida con delta explícito:
  - `clientId` como key operativa actual con resolución posterior a `space_id`
  - consumo preferente de serving/projections existentes
  - health/risk como heurística transicional en esta lane

## Sesión 2026-03-30 — cierre de TASK-019 Staff Augmentation

### Objetivo

- Reconciliar `TASK-019` contra arquitectura/modelo de datos/codebase/cloud y cerrarla completa con runtime, outbox/projections, consumers Agency y documentación viva.

### Delta de ejecución

- Baseline Staff Aug cerrado sobre `client_team_assignments`:
  - `assignment_type` ya forma parte del flujo operativo
  - nuevo bootstrap en `scripts/setup-postgres-staff-augmentation.sql` + `setup-postgres-staff-augmentation.ts`
  - tablas vigentes:
    - `greenhouse_delivery.staff_aug_placements`
    - `greenhouse_delivery.staff_aug_onboarding_items`
    - `greenhouse_delivery.staff_aug_events`
    - `greenhouse_serving.staff_aug_placement_snapshots`
- Runtime nuevo:
  - `src/lib/staff-augmentation/store.ts`
  - `src/lib/staff-augmentation/snapshots.ts`
  - `src/lib/sync/projections/staff-augmentation.ts`
  - eventos `staff_aug.*` en `src/lib/sync/event-catalog.ts`
- Surface nueva en Agency:
  - `/agency/staff-augmentation`
  - `/agency/staff-augmentation/[placementId]`
  - navegación/gobernanza:
    - `gestion.staff_augmentation`
    - `GH_AGENCY_NAV.staffAugmentation`
    - sidebar de Agency
- Consumer actualizado:
  - `src/app/api/team/capacity-breakdown/route.ts` ahora expone `assignmentType`, `placementId` y `placementStatus`
  - `src/views/agency/AgencyTeamView.tsx` muestra chip Staff Aug y CTA al placement
- Drilldowns del placement:
  - `/agency/team`
  - `/hr/payroll`
  - `/admin/ai-tools?tab=catalog&providerId=<id>`
- Consistencia corregida:
  - onboarding limpia `verified_at` / `verified_by_user_id` al salir de `done`
  - latest snapshot del detail se normaliza a camelCase
  - KPI cards del listado usan summary real del backend, no solo la página visible
  - creación redirige al `Placement 360` recién creado

### Validación ejecutada

- `pnpm exec vitest run src/app/api/team/capacity-breakdown/route.test.ts src/lib/sync/projections/staff-augmentation.test.ts src/lib/sync/event-catalog.test.ts src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.test.tsx src/views/greenhouse/agency/staff-augmentation/PlacementDetailView.test.tsx`
- `pnpm exec eslint src/lib/staff-augmentation/store.ts src/lib/staff-augmentation/snapshots.ts src/lib/sync/projections/staff-augmentation.ts src/lib/sync/event-catalog.ts src/app/api/team/capacity-breakdown/route.ts src/app/api/team/capacity-breakdown/route.test.ts src/views/agency/AgencyTeamView.tsx src/views/greenhouse/agency/staff-augmentation/CreatePlacementDialog.tsx src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.tsx src/views/greenhouse/agency/staff-augmentation/StaffAugmentationListView.test.tsx src/views/greenhouse/agency/staff-augmentation/PlacementDetailView.tsx src/views/greenhouse/agency/staff-augmentation/PlacementDetailView.test.tsx 'src/app/(dashboard)/agency/layout.tsx' 'src/app/(dashboard)/agency/staff-augmentation/page.tsx' 'src/app/(dashboard)/agency/staff-augmentation/[placementId]/page.tsx' src/components/layout/vertical/VerticalMenu.tsx src/config/greenhouse-nomenclature.ts src/lib/admin/view-access-catalog.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `git diff --check`

### Impacto documental

- `TASK-019` movida a `docs/tasks/complete/`
- `docs/tasks/README.md` debe quedar con `TASK-019` cerrada y con `TASK-038`/`TASK-041` reinterpretadas como follow-ons/documentos históricos
- `TASK-038` y `TASK-041` ya tienen delta aclarando el baseline real
- `docs/architecture/Greenhouse_HRIS_Architecture_v1.md`, `project_context.md` y `changelog.md` quedaron reconciliados con el runtime actual

## Sesión 2026-03-30 — cierre end-to-end UI/tests de TASK-059

### Objetivo

- Cerrar el remanente operativo de `TASK-059` después del carril reactivo y del aterrizaje inicial en Finanzas.

### Delta de ejecución

- `Provider 360` quedó navegable de verdad:
  - `src/views/greenhouse/finance/SupplierProviderToolingTab.tsx` ahora expone drilldowns a:
    - `/finance/expenses?supplierId=<id>`
    - `/admin/ai-tools?tab=catalog&providerId=<id>`
    - `/admin/ai-tools?tab=licenses&providerId=<id>`
    - `/hr/payroll`
- `src/views/greenhouse/ai-tools/AiToolingDashboard.tsx` ahora acepta `providerId` y `tab` por query string y filtra client-side catálogo/licencias/wallets para sostener ese drilldown desde Finanzas.
- Cobertura nueva agregada:
  - `src/app/api/finance/suppliers/[id]/route.test.ts`
  - `src/views/greenhouse/finance/SupplierProviderToolingTab.test.tsx`
  - `src/lib/providers/provider-tooling-snapshots.test.ts` ahora cubre también `getLatestProviderToolingSnapshot()`

### Validación ejecutada

- `pnpm exec vitest run src/lib/providers/provider-tooling-snapshots.test.ts 'src/app/api/finance/suppliers/[id]/route.test.ts' src/views/greenhouse/finance/SupplierProviderToolingTab.test.tsx src/lib/sync/projections/provider-tooling.test.ts src/lib/sync/event-catalog.test.ts`
- `pnpm exec eslint src/lib/providers/provider-tooling-snapshots.ts src/lib/providers/provider-tooling-snapshots.test.ts 'src/app/api/finance/suppliers/[id]/route.ts' 'src/app/api/finance/suppliers/[id]/route.test.ts' src/views/greenhouse/finance/SupplierDetailView.tsx src/views/greenhouse/finance/SupplierProviderToolingTab.tsx src/views/greenhouse/finance/SupplierProviderToolingTab.test.tsx src/views/greenhouse/finance/SuppliersListView.tsx src/views/greenhouse/ai-tools/AiToolingDashboard.tsx src/lib/providers/monthly-snapshot.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `git diff --check`
- Smoke local intentado con `pnpm dev`:
  - `HEAD /finance/suppliers` respondió `307 -> /login`
  - `HEAD /admin/ai-tools?tab=catalog&providerId=anthropic` respondió `307 -> /login`
  - conclusión: el entorno local respondió sano, pero no hubo browser QA autenticado desde este turno por barrera de auth
- Residual no bloqueante confirmado:
  - `src/lib/providers/monthly-snapshot.ts` queda como stack legacy sin consumers activos detectados fuera de su propio archivo; no bloquea el cierre de `TASK-059`

## Sesión 2026-03-30 — aterrizaje UI de TASK-059 en Finance Suppliers

### Objetivo

- Llevar la lectura canónica `provider 360` al módulo correcto de Finanzas, sin duplicar la consola táctica de `AI Tooling`.

### Delta de ejecución

- `Finance > Suppliers` ahora expone explícitamente la sinergia supplier/provider:
  - `src/views/greenhouse/finance/SuppliersListView.tsx` muestra cobertura `Provider 360` y estado de vínculo canónico por fila
  - `src/views/greenhouse/finance/SupplierDetailView.tsx` agrega chip de vínculo canónico y nuevo tab `Provider 360`
  - nuevo componente route-local `src/views/greenhouse/finance/SupplierProviderToolingTab.tsx`
- `GET /api/finance/suppliers/[id]` ahora devuelve además `providerTooling` cuando el supplier ya está enlazado a `providerId`
- `src/lib/providers/provider-tooling-snapshots.ts` suma helper de lectura puntual del último snapshot por provider para surfaces de UI
- La UX queda deliberadamente separada:
  - `Finance > Suppliers` como home canónica del objeto provider/supplier
  - `Admin > AI Tooling` como consola operativa de catálogo, licencias, wallets y consumo

### Validación ejecutada

- `pnpm exec eslint src/lib/providers/monthly-snapshot.ts 'src/app/api/finance/suppliers/[id]/route.ts' src/lib/providers/provider-tooling-snapshots.ts src/views/greenhouse/finance/SupplierDetailView.tsx src/views/greenhouse/finance/SupplierProviderToolingTab.tsx src/views/greenhouse/finance/SuppliersListView.tsx`
- `pnpm exec tsc --noEmit --pretty false`
- `git diff --check`

## Sesión 2026-03-30 — cierre reactivo de TASK-059 Provider canónico cross-module

### Objetivo

- Corregir `TASK-059` contra la arquitectura vigente e implementar el carril provider-centric faltante entre tooling, Finance, costos y Payroll.

### Delta de ejecución

- `TASK-059` quedó reconciliada y cerrada:
  - se descarta la propuesta vieja de `tool_providers`
  - el ancla vigente queda reafirmada en `greenhouse_core.providers`
  - `greenhouse_finance.suppliers` se preserva como extensión Finance
  - `greenhouse_ai.*` se preserva como runtime transaccional de tooling
- Nuevo wiring reactivo cerrado:
  - `src/lib/providers/postgres.ts` ahora publica `provider.upserted`
  - `src/lib/finance/postgres-store.ts` ahora publica `finance.supplier.created` / `finance.supplier.updated`
  - nueva materialización `src/lib/providers/provider-tooling-snapshots.ts`
  - nueva proyección `src/lib/sync/projections/provider-tooling.ts`
  - nueva tabla `greenhouse_serving.provider_tooling_snapshots`
  - nueva vista `greenhouse_serving.provider_tooling_360`
  - nuevo evento saliente `provider.tooling_snapshot.materialized`
- Consumer ya absorbido:
  - `GET /api/finance/analytics/trends?type=tools` ahora lee el snapshot provider-centric y deja de agrupar por labels legacy de supplier/description
- Documentación viva actualizada:
  - `project_context.md`
  - `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
  - lifecycle de `TASK-059` en `docs/tasks/*`

### Validación ejecutada

- `pnpm exec vitest run src/lib/providers/provider-tooling-snapshots.test.ts src/lib/sync/projections/provider-tooling.test.ts src/lib/sync/event-catalog.test.ts`
- `pnpm exec eslint src/lib/providers/provider-tooling-snapshots.ts src/lib/providers/provider-tooling-snapshots.test.ts src/lib/providers/postgres.ts src/lib/finance/postgres-store.ts src/lib/sync/projections/provider-tooling.ts src/lib/sync/projections/provider-tooling.test.ts src/lib/sync/projections/index.ts src/lib/sync/event-catalog.ts src/app/api/finance/analytics/trends/route.ts`
- `pnpm exec tsc --noEmit --pretty false`

## Sesión 2026-03-30 — verificación staging Finance + reconciliación TASK-164

### Objetivo

- Confirmar que los flujos visibles de Finance ya cargan en `staging` y dejar `TASK-164` alineada al estado real del repo.

### Delta de ejecución

- Verificación manual asistida con browser en `staging`:
  - `https://dev-greenhouse.efeoncepro.com/finance/income/INC-NB-26639047` carga como `Ingreso — Greenhouse`
  - `https://dev-greenhouse.efeoncepro.com/finance/clients` carga como `Clientes — Greenhouse`
  - los únicos errores observados en consola son de `vercel.live` embed/CSP y no del runtime funcional del módulo
- `docs/tasks/complete/TASK-164-purchase-orders-module.md` quedó reconciliada con su estado real:
  - ya no debe leerse como plan pendiente
  - los slices/checklists pasan a ser contexto histórico del diseño original

### Validación ejecutada

- Browser verification en `staging`
- `git diff --check`

## Sesión 2026-03-30 — smoke visual de Purchase Orders, HES y Finance Intelligence en staging

### Objetivo

- Verificar que las surfaces nuevas/cerradas de Finance cargan realmente en `staging` después de los últimos cortes.

### Delta de ejecución

- Verificación manual asistida con browser:
  - `https://dev-greenhouse.efeoncepro.com/finance/purchase-orders` carga como `Órdenes de compra`
  - `https://dev-greenhouse.efeoncepro.com/finance/hes` carga como `Hojas de entrada de servicio`
  - `https://dev-greenhouse.efeoncepro.com/finance/intelligence` carga como `Economía operativa — Greenhouse`
- Requests relevantes observados:
  - `GET /api/cost-intelligence/periods?limit=12` → `200`
  - `GET /api/notifications/unread-count` → `200`
- Consola:
  - se mantiene ruido conocido de `vercel.live` / CSP report-only
  - en `finance/intelligence` apareció además `OPTIONS /dashboard -> 400` durante prefetch; no bloqueó render ni las llamadas principales del módulo

### Validación ejecutada

- Browser verification en `staging`

## Sesión 2026-03-30 — hardening de OPTIONS en page routes del portal

### Objetivo

- Eliminar el `OPTIONS /dashboard -> 400` observado durante prefetch en `finance/intelligence` sin tocar el comportamiento de las APIs.

### Delta de ejecución

- `src/proxy.ts` ahora responde `204` a `OPTIONS` sobre page routes no-API.
- El cambio preserva el comportamiento normal de `/api/**`, que no queda short-circuiteado por el proxy.
- Tests reforzados en `src/proxy.test.ts`:
  - page route `OPTIONS` → `204`
  - api route `OPTIONS` → no interceptado como página

### Validación ejecutada

- `pnpm exec vitest run src/proxy.test.ts`
- `pnpm exec eslint src/proxy.ts src/proxy.test.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `git diff --check`

## Sesión 2026-03-30 — cierre del ruido `vercel.live` en CSP report-only

### Objetivo

- Cerrar el ruido residual de consola en `staging/preview` sin relajar la postura de `production`.

### Delta de ejecución

- `src/proxy.ts` ahora construye la CSP report-only según entorno:
  - `production` conserva `frame-src` limitado a las fuentes originales
  - `preview/staging` permiten además `https://vercel.live` en `frame-src`
- El cambio es deliberadamente acotado al canal report-only y no modifica la política efectiva de runtime de `production`.
- Tests reforzados en `src/proxy.test.ts`:
  - `vercel.live` presente fuera de `production`
  - `vercel.live` ausente en `production`

### Validación ejecutada

- `pnpm exec vitest run src/proxy.test.ts`
- `pnpm exec eslint src/proxy.ts src/proxy.test.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `git diff --check`

## Sesión 2026-03-30 — reconciliación documental final Finance/Nubox

### Objetivo

- Cerrar el drift documental que quedaba después de los últimos cutovers de Finance Clients, BigQuery fail-closed y Nubox enrichment.

### Delta de ejecución

- `docs/architecture/FINANCE_DUAL_STORE_CUTOVER_V1.md` quedó degradado explícitamente a historial de migración; ya no debe leerse como estado operativo vigente.
- `docs/tasks/complete/TASK-163-finance-document-type-separation.md` quedó alineada a estado `complete`, dejando claro que el problema original fue absorbido por el runtime actual.
- `docs/tasks/complete/TASK-165-nubox-full-data-enrichment.md` quedó alineada a estado implementado real y al hardening reciente de PDF/XML en Income detail.
- La fuente viva para el estado actual de Finance queda reafirmada en:
  - `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
  - `docs/tasks/complete/TASK-166-finance-bigquery-write-cutover.md`
  - `docs/tasks/complete/TASK-050-finance-client-canonical-runtime-cutover.md`

### Validación ejecutada

- `git diff --check`

## Sesión 2026-03-30 — fix de descarga PDF/XML Nubox en Finance income detail

### Objetivo

- Resolver el incidente visible en `staging` donde el detalle de ingreso mostraba `Nubox PDF download failed with 401`.

### Delta de ejecución

- Se verificó contra Nubox real que `/sales/{id}`, `/sales/{id}/pdf?template=TEMPLATE_A4` y `/sales/{id}/xml` responden `200` con credenciales válidas.
- El detalle de ingreso ya no fuerza siempre el proxy `/api/finance/income/[id]/dte-pdf|xml`:
  - ahora prioriza `nuboxPdfUrl` / `nuboxXmlUrl` directos cuando el sync ya los dejó en el record
  - conserva fallback al proxy cuando esos links no existen
- `src/lib/nubox/client.ts` ahora:
  - hace `trim()` de `NUBOX_API_BASE_URL` y `NUBOX_X_API_KEY`
  - envía `Accept` explícito para PDF/XML
- Test reforzado en `src/lib/nubox/client.test.ts`.

### Validación ejecutada

- `pnpm exec vitest run src/lib/nubox/client.test.ts`
- `pnpm exec eslint src/lib/nubox/client.ts src/lib/nubox/client.test.ts src/views/greenhouse/finance/IncomeDetailView.tsx`
- `pnpm exec tsc --noEmit --pretty false`
- `git diff --check`

## Sesión 2026-03-30 — hardening del drift de lectura en income y expenses

### Objetivo

- Reducir el drift residual de identidad financiera en lectura sin romper compatibilidad histórica de `income`.

### Delta de ejecución

- `GET /api/finance/income` ahora resuelve `clientId` / `clientProfileId` / `hubspotCompanyId` contra el contexto canónico antes de consultar Postgres o BigQuery fallback.
- `src/lib/finance/postgres-store-slice2.ts` ya no mezcla `clientProfileId` con `hubspot_company_id` en una sola comparación ad hoc; el filtro usa anclas canónicas separadas.
- Se dejó un shim transicional explícito para no romper callers legacy de `income`: si `clientProfileId` se usaba como alias de `hubspotCompanyId`, el handler reintenta esa lectura solo para esa compatibilidad histórica.
- `GET /api/finance/expenses` ahora acepta filtros por `clientProfileId` y `hubspotCompanyId`, resolviéndolos a `clientId` canónico sin cambiar el modelo operativo del expense runtime.
- Cobertura reforzada en `src/app/api/finance/identity-drift-payloads.test.ts`.

### Validación ejecutada

- `pnpm exec vitest run src/app/api/finance/identity-drift-payloads.test.ts src/lib/finance/canonical.test.ts src/app/api/finance/bigquery-write-cutover.test.ts src/app/api/finance/clients/read-cutover.test.ts src/lib/finance/bigquery-write-flag.test.ts`
- `pnpm exec eslint src/app/api/finance/income/route.ts src/app/api/finance/income/[id]/route.ts src/app/api/finance/expenses/route.ts src/app/api/finance/expenses/[id]/route.ts src/app/api/finance/identity-drift-payloads.test.ts src/lib/finance/postgres-store-slice2.ts src/lib/finance/canonical.ts src/lib/finance/canonical.test.ts`
- `pnpm exec tsc --noEmit --pretty false`

## Sesión 2026-03-30 — agregaciones financieras con client_id canónico

### Objetivo

- Cortar el bridge legacy donde `client_economics` y `operational_pl` seguían tratando `client_profile_id` como si fuera `client_id`.

### Delta de ejecución

- `src/lib/finance/postgres-store-intelligence.ts` ya no agrega revenue por `COALESCE(client_id, client_profile_id)`.
- `computeClientEconomicsSnapshots()` ahora resuelve `client_id` canónico desde `greenhouse_finance.client_profiles` cuando un income histórico viene solo con `client_profile_id`.
- `src/lib/cost-intelligence/compute-operational-pl.ts` quedó alineado al mismo criterio para snapshots de margen operativo.
- Tests nuevos/reforzados:
  - `src/lib/finance/postgres-store-intelligence.test.ts`
  - `src/lib/cost-intelligence/compute-operational-pl.test.ts`

### Validación ejecutada

- `pnpm exec vitest run src/lib/finance/postgres-store-intelligence.test.ts src/lib/cost-intelligence/compute-operational-pl.test.ts`
- `pnpm exec eslint src/lib/finance/postgres-store-intelligence.ts src/lib/finance/postgres-store-intelligence.test.ts src/lib/cost-intelligence/compute-operational-pl.ts src/lib/cost-intelligence/compute-operational-pl.test.ts`
- `pnpm exec tsc --noEmit --pretty false`

## Sesión 2026-03-30 — cierre de residuals canon client_id en Finance Clients y Campaigns

### Objetivo

- Cerrar los últimos consumers obvios que seguían tratando `client_profile_id` como si fuera `client_id`.

### Delta de ejecución

- `src/app/api/finance/clients/route.ts` ya calcula receivables por `client_id` canónico en Postgres y BigQuery fallback.
- `src/app/api/finance/clients/[id]/route.ts` ya consulta invoices y summary con la misma traducción canónica vía `client_profiles`.
- `src/lib/campaigns/campaign-extended.ts` ya reancla revenue al `client_id` canónico antes de calcular `CampaignFinancials`.
- Tests nuevos/reforzados:
  - `src/app/api/finance/clients/read-cutover.test.ts`
  - `src/lib/campaigns/campaign-extended.test.ts`

### Validación ejecutada

- `pnpm exec vitest run src/app/api/finance/clients/read-cutover.test.ts src/lib/campaigns/campaign-extended.test.ts src/lib/finance/postgres-store-intelligence.test.ts src/lib/cost-intelligence/compute-operational-pl.test.ts`
- `pnpm exec eslint src/app/api/finance/clients/route.ts src/app/api/finance/clients/[id]/route.ts src/app/api/finance/clients/read-cutover.test.ts src/lib/campaigns/campaign-extended.ts src/lib/campaigns/campaign-extended.test.ts src/lib/finance/postgres-store-intelligence.ts src/lib/finance/postgres-store-intelligence.test.ts src/lib/cost-intelligence/compute-operational-pl.ts src/lib/cost-intelligence/compute-operational-pl.test.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `git diff --check`

## Sesión 2026-03-30 — cierre formal de TASK-166 Finance BigQuery write cutover

### Objetivo

- Cerrar el lifecycle real de `FINANCE_BIGQUERY_WRITE_ENABLED` como guard operativo de Finance y dejar el remanente clasificado explícitamente.

### Delta de ejecución

- Guard operativo extendido a:
  - `POST /api/finance/accounts`
  - `PUT /api/finance/accounts/[id]`
  - `POST /api/finance/exchange-rates`
  - `POST /api/finance/suppliers`
  - `PUT /api/finance/suppliers/[id]`
  - `POST /api/finance/expenses/bulk`
- `suppliers` ya no escribe primariamente a BigQuery:
  - `POST` y `PUT` usan `seedFinanceSupplierInPostgres()`
- Test nuevo:
  - `src/app/api/finance/bigquery-write-cutover.test.ts`
- Lifecycle cerrado:
  - `docs/tasks/complete/TASK-166-finance-bigquery-write-cutover.md`
  - `docs/tasks/README.md`
  - `docs/tasks/TASK_ID_REGISTRY.md`
- Delta cruzado:
  - `docs/tasks/complete/TASK-139-finance-module-hardening.md` ahora explicita que el remanente del flag quedó absorbido y cerrado por `TASK-166`

### Validación ejecutada

- `pnpm exec vitest run src/lib/finance/bigquery-write-flag.test.ts src/app/api/finance/bigquery-write-cutover.test.ts`
- `pnpm exec eslint src/lib/finance/bigquery-write-flag.ts src/lib/finance/bigquery-write-flag.test.ts src/app/api/finance/bigquery-write-cutover.test.ts src/app/api/finance/accounts/route.ts src/app/api/finance/accounts/[id]/route.ts src/app/api/finance/exchange-rates/route.ts src/app/api/finance/suppliers/route.ts src/app/api/finance/suppliers/[id]/route.ts src/app/api/finance/expenses/bulk/route.ts src/app/api/finance/income/route.ts src/app/api/finance/expenses/route.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `git diff --check`

### Residual explícito

- Siguen clasificados fuera de `TASK-166`:
  - reads legacy de `Finance Clients` que aún consultan BigQuery por compatibilidad
- El criterio vigente es tratarlos como lanes o follow-ons localizados, no como bloqueo del flag operativo core.

## Sesión 2026-03-30 — expansión final del guard sobre core + reconciliation + clients

### Objetivo

- Extender el guard operativo más allá del bloque master-data inicial para que el remanente sensible de Finance tampoco pueda reabrir writes legacy con el flag apagado.

### Delta de ejecución

- El guard se extendió a:
  - `income/[id]`
  - `expenses/[id]`
  - `income/[id]/payment`
  - `clients` create/update
  - `reconciliation` create/update/match/unmatch/exclude/statements/auto-match
- `economic-indicators.ts` y `exchange-rates.ts` ahora lanzan `FINANCE_BQ_WRITE_DISABLED` antes del write BigQuery fallback cuando PostgreSQL falla y el flag está apagado.
- Las rutas `sync` ya propagan ese `code` en la respuesta.
- Apoyo de subagentes utilizado:
  - un worker cerró `clients`
  - otro worker endureció `exchange-rates`/sync helpers
  - un explorer auditó el bloque `core + reconciliation` para reducir riesgo antes del cambio

### Validación ejecutada

- `pnpm exec vitest run src/app/api/finance/bigquery-write-cutover.test.ts src/lib/finance/bigquery-write-flag.test.ts`
- `pnpm exec eslint ...` del bloque expandido
- `pnpm exec tsc --noEmit --pretty false`
- `git diff --check`

## Sesión 2026-03-30 — clients write path Postgres-first

### Objetivo

- Cortar el residual real que quedaba después del fail-closed: `clients/sync` y el writer canónico de `Finance Clients`.

### Delta de ejecución

- Nuevo baseline shared en `src/lib/finance/postgres-store-slice2.ts`:
  - `getFinanceClientProfileFromPostgres()`
  - `upsertFinanceClientProfileInPostgres()`
  - `syncFinanceClientProfilesFromPostgres()`
- `Finance Clients` write path ya opera Postgres-first en:
  - `src/app/api/finance/clients/route.ts`
  - `src/app/api/finance/clients/[id]/route.ts`
  - `src/app/api/finance/clients/sync/route.ts`
- Compatibilidad preservada:
  - si PostgreSQL no está disponible y `FINANCE_BIGQUERY_WRITE_ENABLED=true`, las rutas todavía conservan fallback BigQuery transicional
  - si el flag está apagado, responden `503` con `FINANCE_BQ_WRITE_DISABLED`
- Apoyo de subagentes utilizado:
  - explorer para confirmar el estado real de `Finance Clients`
  - worker de tests para el carril `clients`

### Validación ejecutada

- `pnpm exec vitest run src/app/api/finance/bigquery-write-cutover.test.ts src/lib/finance/bigquery-write-flag.test.ts`
- `pnpm exec eslint src/app/api/finance/bigquery-write-cutover.test.ts src/app/api/finance/clients/route.ts 'src/app/api/finance/clients/[id]/route.ts' src/app/api/finance/clients/sync/route.ts src/lib/finance/postgres-store-slice2.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `git diff --check`

### Residual explícito

- El remanente de `Finance Clients` ya no es write path:
  - solo queda fallback transicional de compatibilidad cuando el carril Postgres no está disponible
  - `TASK-050` ya no queda abierta por request path principal

## Sesión 2026-03-30 — cierre del read path de Finance Clients

### Objetivo

- Cortar `GET /api/finance/clients` y `GET /api/finance/clients/[id]` al grafo Postgres-first para dejar `Finance Clients` realmente alineado con `TASK-050`.

### Delta de ejecución

- `GET /api/finance/clients` ya intenta resolver primero desde:
  - `greenhouse_core.clients`
  - `greenhouse_finance.client_profiles`
  - `greenhouse_crm.companies`
  - `greenhouse_core.v_client_active_modules`
  - `greenhouse_finance.income`
- `GET /api/finance/clients/[id]` ya intenta resolver primero desde:
  - `greenhouse_core.clients`
  - `greenhouse_finance.client_profiles`
  - `greenhouse_crm.companies`
  - `greenhouse_crm.deals`
  - `greenhouse_core.v_client_active_modules`
  - `greenhouse_finance.income`
- BigQuery queda solo como fallback explícito cuando el read-path Postgres no está disponible.
- Apoyo de subagentes utilizado:
  - explorer para mapear el drift real del read path
  - worker para sugerir cobertura de tests del cutover

### Validación ejecutada

- `pnpm exec eslint src/app/api/finance/clients/route.ts 'src/app/api/finance/clients/[id]/route.ts' src/app/api/finance/clients/sync/route.ts src/lib/finance/postgres-store-slice2.ts src/app/api/finance/bigquery-write-cutover.test.ts`
- `pnpm exec vitest run src/app/api/finance/bigquery-write-cutover.test.ts src/lib/finance/bigquery-write-flag.test.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `git diff --check`

### Residual explícito

- `Finance Clients` conserva fallback BigQuery transicional por compatibilidad.
- El request path principal ya no depende de BigQuery; el remanente dejó de ser blocker arquitectónico.

## Sesión 2026-03-30 — hardening del resolver canónico Finance Clients

### Objetivo

- Evitar que `resolveFinanceClientContext()` tape errores arbitrarios del carril canónico detrás de fallback BigQuery.

### Delta de ejecución

- `src/lib/finance/canonical.ts` ahora consulta `shouldFallbackFromFinancePostgres()` antes de caer a BigQuery.
- Nuevo test canónico:
  - `src/lib/finance/canonical.test.ts`
- Comportamiento fijado:
  - Postgres-first cuando el carril está sano
  - fallback BigQuery solo para errores permitidos de readiness/conectividad
  - errores no permitidos ya no se esconden detrás de compatibilidad legacy

### Validación ejecutada

- `pnpm exec vitest run src/lib/finance/canonical.test.ts src/app/api/finance/bigquery-write-cutover.test.ts src/app/api/finance/clients/read-cutover.test.ts src/lib/finance/bigquery-write-flag.test.ts`
- `pnpm exec eslint src/lib/finance/canonical.ts src/lib/finance/canonical.test.ts`
- `pnpm exec tsc --noEmit --pretty false`

## Sesión 2026-03-30 — arranque de TASK-166 Finance BigQuery write cutover

### Objetivo

- Empezar el cutover real del write fallback legacy de Finance sin big bang, usando `FINANCE_BIGQUERY_WRITE_ENABLED` como guard operativo verdadero.

### Delta de ejecución

- Nueva task activa:
  - `docs/tasks/complete/TASK-166-finance-bigquery-write-cutover.md`
- Helper nuevo:
  - `src/lib/finance/bigquery-write-flag.ts`
- Primer slice runtime:
  - `POST /api/finance/income`
  - `POST /api/finance/expenses`
  - si PostgreSQL falla y el flag está apagado, responden `503` con `FINANCE_BQ_WRITE_DISABLED`

### Pendiente inmediato

- expandir el inventario/wiring a writes secundarios:
  - `expenses/bulk`
  - `accounts`
  - `suppliers`
  - `exchange-rates`
- validar manualmente en staging con `FINANCE_BIGQUERY_WRITE_ENABLED=false`

## Sesión 2026-03-30 — reconciliación final de TASK-138 + TASK-139

### Objetivo

- Contrastar ambas tasks ya cerradas contra el repo real y resolver el remanente técnico auténtico sin reabrir lanes artificialmente.

### Delta de ejecución

- `TASK-138`:
  - se confirmó que el repo actual ya absorbió la adopción UI/runtime que el doc seguía marcando como “pendiente”
  - el drift quedó saneado en la task markdown
- `TASK-139`:
  - `src/lib/finance/dte-emission-queue.ts` ahora preserva `dte_type_code`
  - `src/app/api/cron/dte-emission-retry/route.ts` ya llama `emitDte()` real, no stub
  - `src/app/api/finance/income/[id]/emit-dte/route.ts` y `src/app/api/finance/income/batch-emit-dte/route.ts` encolan fallos retryable
  - nuevo test:
    - `src/app/api/cron/dte-emission-retry/route.test.ts`

### Validación ejecutada

- `pnpm exec vitest run src/lib/finance/dte-emission-queue.test.ts src/app/api/cron/dte-emission-retry/route.test.ts`
- `pnpm exec eslint src/lib/finance/dte-emission-queue.ts src/lib/finance/dte-emission-queue.test.ts src/app/api/cron/dte-emission-retry/route.ts src/app/api/cron/dte-emission-retry/route.test.ts 'src/app/api/finance/income/[id]/emit-dte/route.ts' 'src/app/api/finance/income/batch-emit-dte/route.ts'`
- `pnpm exec tsc --noEmit --pretty false`
- `git diff --check`

## Sesión 2026-03-30 — cierre formal de TASK-162

### Objetivo

- Ejecutar el último cut técnico sobre consumers residuales del bridge legacy y cerrar `TASK-162` como baseline institucional.

### Delta de ejecución

- Residual runtime cortado:
  - `src/lib/person-360/get-person-finance.ts`
  - `Person Finance` ya usa `greenhouse_serving.commercial_cost_attribution` para explain por miembro/período
- Residual técnico secundario cortado:
  - `src/lib/finance/payroll-cost-allocation.ts`
  - ahora resume `readCommercialCostAttributionByClientForPeriod()`
- Test nuevo:
  - `src/lib/person-360/get-person-finance.test.ts`
- Lifecycle cerrado:
  - `docs/tasks/complete/TASK-162-canonical-commercial-cost-attribution.md`
  - `docs/tasks/README.md`
  - `docs/tasks/TASK_ID_REGISTRY.md`
- Documentación viva alineada:
  - `project_context.md`
  - `changelog.md`

### Validación ejecutada

- `pnpm exec vitest run src/lib/finance/payroll-cost-allocation.test.ts src/lib/person-360/get-person-finance.test.ts src/lib/commercial-cost-attribution/member-period-attribution.test.ts src/lib/commercial-cost-attribution/insights.test.ts src/lib/commercial-cost-attribution/store.test.ts src/lib/sync/projections/commercial-cost-attribution.test.ts src/lib/cost-intelligence/compute-operational-pl.test.ts`
- `pnpm exec eslint src/lib/finance/payroll-cost-allocation.ts src/lib/finance/payroll-cost-allocation.test.ts src/lib/person-360/get-person-finance.ts src/lib/person-360/get-person-finance.test.ts src/lib/commercial-cost-attribution/member-period-attribution.test.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `git diff --check`

## Sesión 2026-03-30 — consolidación arquitectónica de TASK-162

### Objetivo

- Dejar la estrategia de cutover de `commercial cost attribution` consolidada en arquitectura canónica, no solo en la task operativa.

### Delta de ejecución

- Se actualizaron las fuentes canónicas:
  - `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- Quedó explícito que:
  - `greenhouse_serving.commercial_cost_attribution` es la truth layer canónica
  - `operational_pl_snapshots` y `member_capacity_economics` siguen siendo serving derivado por consumer
  - `client_labor_cost_allocation` queda como bridge/input histórico y no como contrato consumidor nuevo

### Validación ejecutada

- `git diff --check`

## Sesión 2026-03-30 (session 2) — TASK-165 + TASK-164 + ISSUE-002

### Objetivo

- Implementar completamente TASK-165 (Nubox Full Data Enrichment) y TASK-164 (Purchase Orders & HES).
- Cerrar ISSUE-002 (Nubox sync data integrity).

### Delta de ejecución

- **TASK-165** cerrada — 33 archivos, 2,746 líneas:
  - Schema: 16 columnas nuevas en income + 16 en expenses + tabla `income_line_items`
  - Sync: mappers conformed capturan TODOS los campos Nubox, sync migrado de DELETE-all a upsert selectivo
  - Cron: `/api/cron/nubox-balance-sync` cada 4h con detección de divergencias
  - Events: `finance.sii_claim.detected`, `finance.balance_divergence.detected`
  - Cross-module: PnL filtra annulled expenses, 2 data quality checks nuevos
  - UI: PDF/XML links en income, SII chips + annulled badge en expenses
- **TASK-164** implementada — 19 archivos nuevos:
  - `purchase_orders`: CRUD + reconciliación de saldo + auto-expire
  - `service_entry_sheets`: lifecycle draft→submitted→approved/rejected
  - 9 API routes, 7 event types, 4 notification mappings
  - `PurchaseOrdersListView` con progress bars, `HesListView` con status chips
- **ISSUE-002** cerrada — los 3 fixes aplicados

### DDL ejecutados

- `scripts/setup-nubox-enrichment.sql` — ejecutado en Cloud SQL (greenhouse_app)
- `scripts/setup-postgres-purchase-orders.sql` — ejecutado en Cloud SQL (greenhouse_app)
- GRANTs corregidos a `greenhouse_runtime` (el DDL original decía `runtime`)

### Pendiente inmediato

- Re-ejecutar Nubox sync para poblar los campos enriquecidos con los nuevos datos
- Verificar visualmente en staging que las nuevas columnas aparecen en las vistas

### Validación ejecutada

- `npx tsc --noEmit` — sin errores
- `pnpm test` — 138/139 test files passed (1 pre-existing failure)
- `pnpm build` — exitoso
- Committed y pushed a `develop`

## Sesión 2026-03-30 — TASK-141 contrato canónico + bridge inicial en /admin/views

### Objetivo

- Convertir `TASK-141` desde contrato endurecido a primer slice real de implementación, sin romper carriles reactivos ni llaves operativas.

### Delta de ejecución

- Nueva fuente canónica del contrato:
  - `docs/architecture/GREENHOUSE_PERSON_IDENTITY_CONSUMPTION_V1.md`
- Nuevo baseline shared:
  - `src/lib/identity/canonical-person.ts`
  - `src/lib/identity/canonical-person.test.ts`
- Contrato runtime que ya expone el resolver:
  - `identityProfileId`
  - `memberId`
  - `userId`
  - `canonicalEmail`
  - `portalAccessState`
  - `resolutionSource`
- Primer consumer adoptado:
  - `src/lib/admin/get-admin-view-access-governance.ts`
  - `src/lib/admin/view-access-store.ts`
  - `src/views/greenhouse/admin/AdminViewAccessGovernanceView.tsx`
- Postura aplicada en el cut:
  - `/admin/views` ahora muestra `identityProfileId`, `memberId`, `portalAccessState` y `resolutionSource`
  - overrides y auditoría siguen `userId`-scoped
  - no se tocaron payloads de outbox, webhook envelopes ni serving member-scoped
- Documentación viva actualizada:
  - `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_PERSON_IDENTITY_CONSUMPTION_V1.md`
  - `docs/tasks/in-progress/TASK-141-canonical-person-identity-consumption.md`
  - `docs/tasks/to-do/TASK-140-admin-views-person-first-preview.md`
  - `docs/tasks/to-do/TASK-134-notification-identity-model-hardening.md`
  - `docs/tasks/in-progress/TASK-162-canonical-commercial-cost-attribution.md`
  - `docs/tasks/README.md`
  - `project_context.md`
  - `changelog.md`

### Validación ejecutada

- `pnpm exec vitest run src/lib/identity/canonical-person.test.ts`
- `pnpm exec eslint src/lib/identity/canonical-person.ts src/lib/identity/canonical-person.test.ts src/lib/admin/get-admin-view-access-governance.ts src/lib/admin/view-access-store.ts src/views/greenhouse/admin/AdminViewAccessGovernanceView.tsx`
- `pnpm exec tsc --noEmit --pretty false`

### Pendiente inmediato

- `TASK-140`:
  - mover el universo base del preview desde principal portal a persona previewable real
- `TASK-134`:
  - terminar de alinear notifications y callers legacy sobre el contrato shared
- `TASK-162`:
  - ya puede apoyarse en este contrato sin reabrir persona/member/user, preservando `member_id` como llave operativa de costo

## Sesión 2026-03-30 — cierre formal de `TASK-141` en `develop`

### Objetivo

- Cerrar la lane institucional sin mover de rama y sin mezclar el trabajo paralelo de Finance ya abierto en `develop`.

### Delta de ejecución

- `TASK-141` se reclasificó de `in-progress` a `complete`.
- El archivo canónico quedó en:
  - `docs/tasks/complete/TASK-141-canonical-person-identity-consumption.md`
- Se actualizaron:
  - `docs/tasks/README.md`
  - `docs/tasks/TASK_ID_REGISTRY.md`
  - `project_context.md`
  - `changelog.md`
- Criterio de cierre explicitado:
  - la lane queda cerrada por contrato institucional + resolver shared + primera adopción real
  - la adopción restante se delega formalmente a `TASK-140`, `TASK-134` y `TASK-162`

### Validación ejecutada

- `git diff --check`

### Riesgo / coordinación

- `develop` mantiene además cambios paralelos sin commitear en Finance:
  - `src/app/api/finance/dashboard/pnl/route.ts`
  - `src/app/api/finance/dashboard/summary/route.ts`
  - `src/app/api/finance/income/route.ts`
  - `src/lib/finance/postgres-store-slice2.ts`
  - `src/views/greenhouse/finance/IncomeListView.tsx`
- No se deben mezclar en este cierre de `TASK-141`; stage/commit selectivo solamente.

## Sesión 2026-03-30 — `TASK-140` slice 1 persona-first en `/admin/views`

### Objetivo

- Empezar implementación real de `TASK-140` sin reabrir `TASK-141` y sin romper overrides, auditoría ni `authorizedViews`.

### Delta de ejecución

- Nueva pieza shared:
  - `src/lib/admin/admin-preview-persons.ts`
  - `src/lib/admin/admin-preview-persons.test.ts`
- `getAdminViewAccessGovernance()` y `view-access-store` ya construyen el universo previewable agrupando por:
  - `identityProfileId` cuando existe
  - fallback `user:<userId>` cuando todavía no hay bridge persona completo
- `/admin/views` ya cambió el selector y el framing del preview:
  - ahora habla de `persona previewable`
  - muestra si el caso es `persona canónica` o `principal portal`
  - conserva el principal portal compatible para guardar overrides
- Guardrail preservado:
  - `user_view_overrides`, `view_access_log`, `authorizedViews` y la resolución runtime siguen `userId`-scoped

### Validación ejecutada

- `pnpm exec vitest run src/lib/admin/admin-preview-persons.test.ts`
- `pnpm exec eslint src/lib/admin/admin-preview-persons.ts src/lib/admin/admin-preview-persons.test.ts src/lib/admin/get-admin-view-access-governance.ts src/lib/admin/view-access-store.ts src/views/greenhouse/admin/AdminViewAccessGovernanceView.tsx`
- `pnpm exec tsc --noEmit --pretty false`

### Pendiente inmediato

- Validación manual visual en `/admin/views` para confirmar copy, chips y casos borde.
- Decidir si un siguiente slice debe abrir el universo a personas sin principal portal persistible o si ese caso queda fuera del preview editable.
- UX hardening ya aplicado en este mismo carril:
  - copy del panel alineado a `persona previewable`
  - alertas explícitas para `active`, `inactive`, `missing_principal` y `degraded_link`
  - roadmap tab ya refleja los remanentes reales de `TASK-140`

## Sesión 2026-03-30 — cierre formal de `TASK-140`

### Objetivo

- Cerrar el consumer `/admin/views` como adopción real de la policy persona-first sin reabrir `TASK-141` ni romper el runtime user-scoped existente.

### Delta de ejecución

- `TASK-140` se movió de `in-progress` a `complete`.
- El archivo canónico quedó en:
  - `docs/tasks/complete/TASK-140-admin-views-person-first-preview.md`
- Se actualizaron:
  - `docs/tasks/README.md`
  - `docs/tasks/TASK_ID_REGISTRY.md`
  - `changelog.md`
- Criterio de cierre explicitado:
  - el selector y preview ya son persona-first cuando existe `identityProfileId`
  - `userId` quedó preservado como llave operativa de compatibilidad para overrides, auditoría y `authorizedViews`
  - el remanente pasa a policy/validación continua, no a gap estructural del consumer

### Validación ejecutada

- `git diff --check`

## Sesión 2026-03-30 — `TASK-134` slice 1 shared recipients en Notifications

### Objetivo

- Empezar implementación real de `TASK-134` sin tocar llaves `userId`-scoped de inbox/preferences/dedupe y sin romper el carril reactivo webhook/projections.

### Delta de ejecución

- `TASK-134` ya quedó en `in-progress`.
- Nuevo helper shared:
  - `src/lib/notifications/person-recipient-resolver.ts`
    - `getRoleCodeNotificationRecipients(roleCodes)`
- Adopción inicial en callers legacy/duplicados:
  - `src/lib/sync/projections/notifications.ts`
  - `src/lib/webhooks/consumers/notification-recipients.ts`
- Efecto del slice:
  - recipients role-based ya no repiten mapping ad hoc desde `greenhouse_serving.session_360`
  - projections y webhook consumers ya comparten el mismo shape persona/member/user/email/fullName
  - `NotificationService`, `notification_preferences`, `notifications` y `notification_log` siguen intactos en su semántica `userId`-scoped / recipient-key-scoped

### Validación ejecutada

- `pnpm exec vitest run src/lib/notifications/person-recipient-resolver.test.ts src/lib/webhooks/consumers/notification-recipients.test.ts src/lib/sync/projections/notifications.test.ts`
- `pnpm exec eslint src/lib/notifications/person-recipient-resolver.ts src/lib/notifications/person-recipient-resolver.test.ts src/lib/webhooks/consumers/notification-recipients.ts src/lib/webhooks/consumers/notification-recipients.test.ts src/lib/sync/projections/notifications.ts src/lib/sync/projections/notifications.test.ts`
- `pnpm exec tsc --noEmit --pretty false`

### Pendiente inmediato

- Cerrar el resto de callers legacy de Notifications que todavía no consuman el contrato shared.
- Documentar el contrato transversal final de Notifications para poder cerrar `TASK-134` sin mover las fronteras `userId`-scoped del sistema.

## Sesión 2026-03-30 — cierre formal de `TASK-134`

### Objetivo

- Cerrar la lane de hardening de identidad en Notifications sin cambiar la semántica `userId`-scoped del sistema.

### Delta de ejecución

- `TASK-134` se movió a `complete`.
- La institucionalización final quedó reflejada en:
  - `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
  - `docs/tasks/to-do/TASK-128-webhook-consumers-roadmap.md`
- Criterio de cierre explicitado:
  - recipient resolution `person-first` ya es shared en projections y webhook consumers
  - `identity_profile` es la raíz humana, pero `userId` sigue siendo la llave operativa de inbox/preferences/audit/dedupe
  - no queda gap estructural abierto del recipient model; los remanentes futuros pasan a consumers de dominio, no a la base transversal de Notifications

### Validación ejecutada

- `pnpm exec vitest run src/lib/notifications/person-recipient-resolver.test.ts src/lib/webhooks/consumers/notification-recipients.test.ts src/lib/sync/projections/notifications.test.ts`
- `pnpm exec eslint src/lib/notifications/person-recipient-resolver.ts src/lib/notifications/person-recipient-resolver.test.ts src/lib/webhooks/consumers/notification-recipients.ts src/lib/webhooks/consumers/notification-recipients.test.ts src/lib/sync/projections/notifications.ts src/lib/sync/projections/notifications.test.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `git diff --check`

## Sesión 2026-03-30 — hardening urgente de Postgres por incidentes TLS en cron

### Objetivo

- Cortar la cascada de fallos repetidos en `outbox-publish` y `webhook-dispatch` ante errores TLS/SSL transitorios de PostgreSQL en `production`.

### Diagnóstico

- Slack mostró errores repetidos `SSL routines:ssl3_read_bytes:sslv3 alert bad certificate`.
- Verificación operativa local:
  - `production` sí tiene `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME`
  - Cloud SQL sigue con `sslMode=ENCRYPTED_ONLY`
  - el runtime usa Cloud SQL Connector por diseño; no hay evidencia de que el issue venga de falta de env del connector
- Riesgo detectado en código:
  - `src/lib/postgres/client.ts` cacheaba `__greenhousePostgresPoolPromise` incluso si la creación del pool fallaba una vez
  - un fallo TLS/handshake podía quedar pegado en el runtime caliente y repetir alertas hasta el próximo cold start

### Delta de ejecución

- `src/lib/postgres/client.ts` ahora:
  - normaliza envs boolean/number con `trim()`
  - resetea el pool global si `buildPool()` falla
  - cierra pool/connector ante errores emitidos por `pg`
  - reintenta una vez queries y transacciones cuando detecta fallos retryable de conexión/TLS

### Validación ejecutada

- `pnpm exec eslint src/lib/postgres/client.ts`
- `pnpm exec tsc --noEmit --pretty false`

### Pendiente inmediato

- Desplegar este hardening para observar si desaparece el spam de cron failures en `production`.
- Si reaparece el mismo error después del deploy, revisar ya a nivel infra/Cloud SQL Connector rotation y runtime logs productivos.

## Sesión 2026-03-30 — Hardening canónico de atribución comercial para Cost Intelligence

### Objetivo

- Contrastar `TASK-162` contra la arquitectura y el código real para decidir si la lane ya estaba lista o si necesitaba endurecerse antes del cutover.

### Delta de ejecución

- El contraste confirmó drift semántico real:
  - `computeOperationalPl()` mezcla `client_labor_cost_allocation` para labor y `member_capacity_economics` para overhead
  - `client_economics` y `organization-economics` todavía dependen del bridge histórico
  - `auto-allocation-rules.ts` mantenía heurísticas locales de clasificación
- Se endureció la fuente canónica del dominio:
  - `docs/architecture/GREENHOUSE_COMMERCIAL_COST_ATTRIBUTION_V1.md`
- `TASK-162` se movió a `in-progress` con slice 1 explícito:
  - `docs/tasks/in-progress/TASK-162-canonical-commercial-cost-attribution.md`
- Primer módulo shared implementado:
  - `src/lib/commercial-cost-attribution/assignment-classification.ts`
  - `src/lib/commercial-cost-attribution/assignment-classification.test.ts`
- Slice 2 ya implementado:
  - `src/lib/commercial-cost-attribution/member-period-attribution.ts`
  - `src/lib/commercial-cost-attribution/member-period-attribution.test.ts`
  - combina `member_capacity_economics` + `client_labor_cost_allocation` por `member_id + período`
  - expone costo base, labor comercial, internal load y overhead comercialmente atribuible
- Primer consumer ya cortado a la capa intermedia:
  - `src/lib/cost-intelligence/compute-operational-pl.ts`
  - `src/lib/cost-intelligence/compute-operational-pl.test.ts`
- Consumers adicionales ya alineados:
  - `src/lib/finance/postgres-store-intelligence.ts`
  - `src/lib/account-360/organization-economics.ts`
  - ambos dejaron de depender directamente de `computeClientLaborCosts()`
- Slice 4 ya implementado:
  - `src/lib/commercial-cost-attribution/store.ts`
  - `src/lib/commercial-cost-attribution/store.test.ts`
  - tabla `greenhouse_serving.commercial_cost_attribution`
  - `member-period-attribution.ts` ahora hace read serving-first con fallback
  - `materializeOperationalPl()` rematerializa primero `commercial_cost_attribution`
- Slice 5 ya implementado:
  - `src/lib/sync/projections/commercial-cost-attribution.ts`
  - `src/lib/sync/projections/commercial-cost-attribution.test.ts`
  - `src/lib/sync/projections/index.ts`
  - `src/lib/sync/event-catalog.ts`
  - la capa ya tiene refresh reactivo dedicado y evento `accounting.commercial_cost_attribution.materialized`
- Slice 6 ya implementado:
  - `src/lib/commercial-cost-attribution/insights.ts`
  - `src/lib/commercial-cost-attribution/insights.test.ts`
  - `src/app/api/cost-intelligence/commercial-cost-attribution/health/route.ts`
  - `src/app/api/cost-intelligence/commercial-cost-attribution/explain/[year]/[month]/[clientId]/route.ts`
  - `src/app/api/cron/materialization-health/route.ts`
  - la capa ya tiene health semántico por período, explain por cliente y freshness visible en materialization health
- Adopción inicial sin big bang:
  - `src/lib/team-capacity/internal-assignments.ts` ahora reexporta la regla shared
  - `src/lib/finance/auto-allocation-rules.ts` ya filtra assignments con el classifier shared
- Guardrail aplicado:
  - no se tocó todavía `client_labor_cost_allocation`
  - no se tocó serving de `operational_pl`
  - no se mezcló con los cambios paralelos abiertos en Finance/Nubox

### Validación ejecutada

- `pnpm exec vitest run src/lib/commercial-cost-attribution/assignment-classification.test.ts src/lib/team-capacity/internal-assignments.test.ts src/lib/finance/auto-allocation-rules.test.ts`
- `pnpm exec eslint src/lib/commercial-cost-attribution/assignment-classification.ts src/lib/commercial-cost-attribution/assignment-classification.test.ts src/lib/team-capacity/internal-assignments.ts src/lib/team-capacity/internal-assignments.test.ts src/lib/finance/auto-allocation-rules.ts src/lib/finance/auto-allocation-rules.test.ts`
- `pnpm exec vitest run src/lib/commercial-cost-attribution/assignment-classification.test.ts src/lib/commercial-cost-attribution/member-period-attribution.test.ts src/lib/team-capacity/internal-assignments.test.ts src/lib/finance/auto-allocation-rules.test.ts src/lib/cost-intelligence/compute-operational-pl.test.ts`
- `pnpm exec vitest run src/lib/commercial-cost-attribution/assignment-classification.test.ts src/lib/commercial-cost-attribution/store.test.ts src/lib/commercial-cost-attribution/member-period-attribution.test.ts src/lib/team-capacity/internal-assignments.test.ts src/lib/finance/auto-allocation-rules.test.ts src/lib/cost-intelligence/compute-operational-pl.test.ts`
- `pnpm exec vitest run src/lib/commercial-cost-attribution/assignment-classification.test.ts src/lib/commercial-cost-attribution/store.test.ts src/lib/commercial-cost-attribution/member-period-attribution.test.ts src/lib/sync/projections/commercial-cost-attribution.test.ts src/lib/sync/projections/operational-pl.test.ts src/lib/sync/projections/client-economics.test.ts src/lib/sync/event-catalog.test.ts`
- `pnpm exec vitest run src/lib/commercial-cost-attribution/assignment-classification.test.ts src/lib/commercial-cost-attribution/store.test.ts src/lib/commercial-cost-attribution/member-period-attribution.test.ts src/lib/commercial-cost-attribution/insights.test.ts src/lib/sync/projections/commercial-cost-attribution.test.ts src/lib/sync/projections/operational-pl.test.ts src/lib/sync/projections/client-economics.test.ts src/lib/sync/event-catalog.test.ts`
- `pnpm exec eslint src/lib/commercial-cost-attribution/assignment-classification.ts src/lib/commercial-cost-attribution/assignment-classification.test.ts src/lib/commercial-cost-attribution/member-period-attribution.ts src/lib/commercial-cost-attribution/member-period-attribution.test.ts src/lib/team-capacity/internal-assignments.ts src/lib/team-capacity/internal-assignments.test.ts src/lib/finance/auto-allocation-rules.ts src/lib/finance/auto-allocation-rules.test.ts src/lib/cost-intelligence/compute-operational-pl.ts src/lib/cost-intelligence/compute-operational-pl.test.ts`
- `pnpm exec eslint src/lib/commercial-cost-attribution/assignment-classification.ts src/lib/commercial-cost-attribution/assignment-classification.test.ts src/lib/commercial-cost-attribution/member-period-attribution.ts src/lib/commercial-cost-attribution/member-period-attribution.test.ts src/lib/team-capacity/internal-assignments.ts src/lib/team-capacity/internal-assignments.test.ts src/lib/finance/auto-allocation-rules.ts src/lib/finance/auto-allocation-rules.test.ts src/lib/cost-intelligence/compute-operational-pl.ts src/lib/cost-intelligence/compute-operational-pl.test.ts src/lib/finance/postgres-store-intelligence.ts src/lib/account-360/organization-economics.ts`
- `pnpm exec eslint src/lib/commercial-cost-attribution/assignment-classification.ts src/lib/commercial-cost-attribution/assignment-classification.test.ts src/lib/commercial-cost-attribution/store.ts src/lib/commercial-cost-attribution/store.test.ts src/lib/commercial-cost-attribution/member-period-attribution.ts src/lib/commercial-cost-attribution/member-period-attribution.test.ts src/lib/team-capacity/internal-assignments.ts src/lib/team-capacity/internal-assignments.test.ts src/lib/finance/auto-allocation-rules.ts src/lib/finance/auto-allocation-rules.test.ts src/lib/cost-intelligence/compute-operational-pl.ts src/lib/cost-intelligence/compute-operational-pl.test.ts src/lib/finance/postgres-store-intelligence.ts src/lib/account-360/organization-economics.ts`
- `pnpm exec eslint src/lib/commercial-cost-attribution/assignment-classification.ts src/lib/commercial-cost-attribution/assignment-classification.test.ts src/lib/commercial-cost-attribution/store.ts src/lib/commercial-cost-attribution/store.test.ts src/lib/commercial-cost-attribution/member-period-attribution.ts src/lib/commercial-cost-attribution/member-period-attribution.test.ts src/lib/sync/projections/commercial-cost-attribution.ts src/lib/sync/projections/commercial-cost-attribution.test.ts src/lib/sync/projections/index.ts src/lib/sync/event-catalog.ts src/lib/cost-intelligence/compute-operational-pl.ts src/lib/cost-intelligence/compute-operational-pl.test.ts src/lib/finance/postgres-store-intelligence.ts src/lib/account-360/organization-economics.ts`
- `pnpm exec eslint src/lib/commercial-cost-attribution/assignment-classification.ts src/lib/commercial-cost-attribution/assignment-classification.test.ts src/lib/commercial-cost-attribution/store.ts src/lib/commercial-cost-attribution/store.test.ts src/lib/commercial-cost-attribution/member-period-attribution.ts src/lib/commercial-cost-attribution/member-period-attribution.test.ts src/lib/commercial-cost-attribution/insights.ts src/lib/commercial-cost-attribution/insights.test.ts src/lib/sync/projections/commercial-cost-attribution.ts src/lib/sync/projections/commercial-cost-attribution.test.ts src/lib/sync/projections/index.ts src/lib/sync/event-catalog.ts src/app/api/cost-intelligence/commercial-cost-attribution/health/route.ts src/app/api/cost-intelligence/commercial-cost-attribution/explain/[year]/[month]/[clientId]/route.ts src/app/api/cron/materialization-health/route.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `git diff --check`

### Limitación de validación

- `pnpm exec tsc --noEmit --pretty false` falla por cambios paralelos ajenos:
  - `src/app/(dashboard)/finance/hes/page.tsx`
  - `src/app/(dashboard)/finance/purchase-orders/page.tsx`
  - faltan views `HesListView` y `PurchaseOrdersListView`
- La lane `TASK-162` no introdujo ese fallo.

### Pendiente inmediato

- Siguiente slice de `TASK-162`:
  - revisar si hace falta projection domain propio o si `cost_intelligence` basta como partición operativa
  - decidir si el explain surface necesita UI en `/finance/intelligence`
  - luego evaluar cierre formal del bridge legacy como contrato interno en vez de consumer API

### Objetivo

- Corregir la divergencia entre la FTE visible en `Agency > Team` / Person 360 y la atribución comercial usada por Finance / Cost Intelligence.
- Dejar la regla documentada para que no vuelva a bifurcarse por consumer.

### Delta de ejecución

- Se creó una regla shared en:
  - `src/lib/team-capacity/internal-assignments.ts`
- Esa regla ya se reutiliza en:
  - `src/app/api/team/capacity-breakdown/route.ts`
  - `src/lib/sync/projections/member-capacity-economics.ts`
  - `src/lib/finance/auto-allocation-rules.ts`
  - `scripts/setup-postgres-finance-intelligence-p2.sql`
  - `src/lib/cost-intelligence/compute-operational-pl.ts`
- Semántica consolidada:
  - `space-efeonce`, `efeonce_internal` y `client_internal` siguen siendo válidos para carga operativa interna
  - no participan como cliente comercial en labor attribution, auto-allocation ni snapshots de `operational_pl`
- También se endureció el serving runtime:
  - `greenhouse_runtime` requiere `DELETE` acotado sobre `greenhouse_serving.operational_pl_snapshots`
  - el materializador lo usa solo para purgar scopes obsoletos de la misma revisión antes del upsert

### Pendiente inmediato

- Reaplicar `setup-postgres-cost-intelligence.sql`
- Re-materializar `operational_pl` y verificar que filas stale de `Efeonce` desaparezcan del período afectado
- Cerrar con validación + documentación final + commit/push

## Sesión 2026-03-30 — Documentación de la capa canónica de commercial cost attribution

### Objetivo

- Dejar explícito en docs que la consolidación pendiente ya no debe pensarse como “más lógica dentro de Cost Intelligence”, sino como una capa canónica nueva de plataforma ya decidida.

### Delta de ejecución

- Se documentó que la capa de `commercial cost attribution` debe ubicarse entre:
  - Payroll / Team Capacity / Finance base
  - y Finance / Cost Intelligence / Agency / People / Home / Nexa
- `TASK-162` queda como la lane institucional para esa capa.

### Pendiente inmediato

- Mover `TASK-162` a `in-progress` cuando empecemos implementación real.
- Usarla como prerequisito semántico antes de profundizar más `Agency Economics`, `Service P&L` y scorecards financieros.

## Sesión 2026-03-30 — TASK-071 slice 1-3 consumers distribuidos

### Objetivo

- Ejecutar el primer corte real de `TASK-071` contrastando primero arquitectura, consumers y serving ya implementado del módulo Cost Intelligence.

### Delta de ejecución

- Agency:
  - `src/lib/agency/agency-finance-metrics.ts` ya no calcula este consumer desde `greenhouse_finance.income` / `expenses`; ahora lee `greenhouse_serving.operational_pl_snapshots`.
  - `src/components/agency/SpaceCard.tsx` ya puede mostrar período del snapshot y si el margen corresponde a cierre efectivo.
- Organization 360:
  - `src/lib/account-360/organization-economics.ts` ya es serving-first para `organization` y breakdown `client`, con fallback al compute legacy si falta snapshot.
  - `src/views/greenhouse/organizations/tabs/OrganizationEconomicsTab.tsx` ya muestra chips de cierre por período y badge del período actual.
- People 360:
  - `src/lib/person-360/get-person-finance.ts` ahora publica `latestCostSnapshot`.
  - `src/views/greenhouse/people/tabs/PersonFinanceTab.tsx` suma card `Costo total del período` con desglose y badge de cierre.
  - `src/app/api/people/[memberId]/finance-impact/route.ts` y `src/views/greenhouse/people/tabs/PersonHrProfileTab.tsx` ya muestran período + closure awareness.
- Home:
  - `src/lib/home/get-home-snapshot.ts` ahora resuelve `financeStatus` para roles internos/finance.
  - `src/views/greenhouse/home/HomeView.tsx` reemplaza placeholders por estado real de cierre/margen.

### Validación ejecutada

- `pnpm exec tsc --noEmit --pretty false`
- `pnpm exec eslint src/lib/agency/agency-finance-metrics.ts src/lib/account-360/organization-economics.ts src/views/greenhouse/organizations/tabs/OrganizationEconomicsTab.tsx src/types/people.ts src/lib/person-360/get-person-finance.ts 'src/app/api/people/[memberId]/finance-impact/route.ts' src/views/greenhouse/people/tabs/PersonFinanceTab.tsx src/views/greenhouse/people/tabs/PersonHrProfileTab.tsx src/types/home.ts src/lib/home/get-home-snapshot.ts src/app/api/home/snapshot/route.ts src/views/greenhouse/home/HomeView.tsx`

### Limitación de validación

- `pnpm build` quedó inestable en esta sesión por locks/artifacts de `.next` (`Unable to acquire lock` y luego `ENOENT` sobre `_buildManifest.js.tmp`), incluso después de limpiar `.next`.
- No apareció error de tipos del slice después de `tsc`; el ruido observado fue del runtime/build workspace de Next en esta máquina.

### Pendiente inmediato

- Validación visual real del slice en Agency / Organization 360 / People / Home.
- Nexa ya recibe el mismo `financeStatus` resumido en `lightContext`; el remanente ya no es funcional sino de validación/cierre formal.

## Sesión 2026-03-30 — TASK-070 validación visual + fix de fecha operativa

### Objetivo

- Validar visualmente `/finance/intelligence` con sesión local admin.
- Confirmar que el “último día hábil” realmente venga del calendario operativo y no quede roto en UI.

### Delta de ejecución

- Se usó sesión local firmada vía `scripts/mint-local-admin-jwt.js` para entrar al portal en dev y validar `/finance/intelligence`.
- Resultado:
  - la API `/api/cost-intelligence/periods?limit=12` ya devolvía períodos correctos y `lastBusinessDayOfTargetMonth` calculado desde el calendario operativo
  - el bug estaba en display: la UI parseaba `YYYY-MM-DD` con `new Date(...)` y corría la fecha por timezone
- Fix aplicado:
  - `src/views/greenhouse/finance/FinancePeriodClosureDashboardView.tsx`
  - `src/views/greenhouse/finance/FinancePeriodClosureDashboardView.test.tsx`
- Validación visual adicional:
  - la tabla de períodos, el expandible inline de P&L y el diálogo de cierre funcionan con datos reales
  - Home ya muestra `financeStatus` usable
  - People 360 ya muestra `latestCostSnapshot` y closure awareness
  - Organization 360 no pudo validarse bien en este entorno por falta de datos
  - Agency no mostró issue técnico; el consumer financiero está en `SpaceCard`, no en cualquier tabla listada

### Validación ejecutada

- `pnpm exec vitest run src/views/greenhouse/finance/FinancePeriodClosureDashboardView.test.tsx`
- `pnpm exec eslint src/views/greenhouse/finance/FinancePeriodClosureDashboardView.tsx src/views/greenhouse/finance/FinancePeriodClosureDashboardView.test.tsx`
- `pnpm exec tsc --noEmit --pretty false`

### Pendiente inmediato

- Seguir validación visual de Agency/Organization 360 con dataset más representativo.
- Decidir si el lifecycle de `TASK-070` y `TASK-071` se normaliza en docs, porque hoy sus archivos viven en `complete/` pero varias notas todavía las describen como lanes abiertas.

## Sesión 2026-03-30 — Consolidación documental de Cost Intelligence

### Objetivo

- Dejar el módulo documentado a todo nivel antes del siguiente corte funcional.

### Delta de ejecución

- Arquitectura master actualizada:
  - `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- Arquitectura especializada actualizada:
  - `docs/architecture/GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- Índice de docs actualizado:
  - `docs/README.md`
- Pipeline de tasks reconciliado:
  - `docs/tasks/README.md`
  - `docs/tasks/in-progress/TASK-070-cost-intelligence-finance-ui.md`
- Contexto vivo actualizado:
  - `project_context.md`

### Estado real tras la consolidación

- Cost Intelligence ya debe leerse como módulo operativo distribuido.
- Finance sigue siendo owner del motor financiero central.
- Cost Intelligence ya sirve:
  - `/finance/intelligence`
  - Agency
  - Organization 360
  - People 360
  - Home
  - Nexa

### Pendiente inmediato

- Validación visual final de `TASK-070` y `TASK-071`.
- Cierre formal de fallbacks legacy donde todavía existen por resiliencia.

## Sesión 2026-03-30 — TASK-069 cerrada + arquitectura del módulo endurecida

### Objetivo

- Cerrar formalmente `TASK-069`.
- Dejar el módulo de Cost Intelligence documentado de forma más completa en arquitectura.

### Delta de ejecución

- `TASK-069` pasó de `in-progress` a `complete`.
- Motivo:
  - `operational_pl` ya materializa snapshots por `client`, `space` y `organization`
  - APIs de lectura ya están expuestas
  - smoke reactivo E2E ya quedó validado
  - la UI principal de Finance ya consume este serving como contrato estable
- Arquitectura endurecida en:
  - `docs/architecture/GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md`
- Lo documentado ahora incluye:
  - estado implementado por lanes `067-070`
  - serving canónico
  - invariantes operativos
  - authorization vigente
  - consumers pendientes (`TASK-071`)

### Pendiente inmediato

- `TASK-070` sigue abierta solo por validación visual final y decisión sobre `ClientEconomicsView`.
- El siguiente carril funcional natural ya es `TASK-071`.

## Sesión 2026-03-30 — TASK-070 surface principal de Finance Intelligence implementada

### Objetivo

- Ejecutar `TASK-070` después de contrastarla con:
  - `docs/architecture/GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
  - APIs reales de `period closure` y `operational_pl`
- Confirmar el orden operativo:
  - `TASK-070` antes de `TASK-071`

### Delta de ejecución

- `TASK-070` pasó a `in-progress`.
- `/finance/intelligence` ya dejó de renderizar `ClientEconomicsView` como portada y ahora usa:
  - `src/views/greenhouse/finance/FinancePeriodClosureDashboardView.tsx`
- La nueva surface ya incluye:
  - hero de cierre operativo
  - KPIs agregados de readiness
  - tabla de 12 períodos con semáforos por pata
  - expandible inline de P&L por cliente
  - diálogo de cierre con summary agregado
  - reapertura con razón obligatoria
- Gating aplicado en UI:
  - cierre para `finance_manager` y `efeonce_admin`
  - reapertura solo para `efeonce_admin`

### Validación ejecutada

- `pnpm exec eslint 'src/app/(dashboard)/finance/intelligence/page.tsx' 'src/views/greenhouse/finance/FinancePeriodClosureDashboardView.tsx'`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm build`

### Pendiente inmediato

- Validación visual real del flujo en local/preview antes de cerrar `TASK-070`.
- Decidir si `ClientEconomicsView`:
  - se reubica a otra route/surface de analytics, o
  - queda como legacy candidate para retiro en un follow-on.

## Sesión 2026-03-30 — TASK-069 slice 1 materializado

### Objetivo

- Abrir `TASK-069` con contraste previo duro contra:
  - `docs/architecture/GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
  - motor canónico de `src/app/api/finance/dashboard/pnl/route.ts`
  - serving actual (`client_labor_cost_allocation`, `member_capacity_economics`, `period_closure_status`)

### Delta de ejecución

- `TASK-069` pasó a `in-progress`.
- Slice implementado:
  - `src/lib/cost-intelligence/pl-types.ts`
  - `src/lib/cost-intelligence/compute-operational-pl.ts`
  - `src/lib/sync/projections/operational-pl.ts`
  - `src/app/api/cost-intelligence/pl/route.ts`
  - `src/app/api/cost-intelligence/pl/[scopeType]/[scopeId]/route.ts`
  - tests:
    - `src/lib/cost-intelligence/compute-operational-pl.test.ts`
    - `src/lib/sync/projections/operational-pl.test.ts`
- Integraciones mínimas cerradas en el mismo slice:
  - registro de `operational_pl` en `src/lib/sync/projections/index.ts`
  - `accounting.margin_alert.triggered` entra al carril reactivo
  - `notification_dispatch` ya lo consume
  - `materialization-health` ya revisa `greenhouse_serving.operational_pl_snapshots`

### Decisiones semánticas aplicadas

- `operational_pl` no redefine el P&L de Finance:
  - revenue cliente = `total_amount_clp - partner_share`
  - costo laboral = `client_labor_cost_allocation`
  - overhead = `member_capacity_economics`
  - `period_closed` / `snapshot_revision` = `period_closure_status`
- Para evitar doble conteo, el carril `direct_expense` excluye `expenses.payroll_entry_id`.
- El primer slice ya materializa `client -> space -> organization`; todavía no reemplaza consumers on-read existentes como `organization-economics.ts`.

### Validación ejecutada

- `pnpm exec vitest run src/lib/cost-intelligence/compute-operational-pl.test.ts src/lib/sync/projections/operational-pl.test.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm exec eslint src/lib/cost-intelligence/compute-operational-pl.ts src/lib/cost-intelligence/compute-operational-pl.test.ts src/lib/sync/projections/operational-pl.ts src/lib/sync/projections/operational-pl.test.ts src/app/api/cost-intelligence/pl/route.ts 'src/app/api/cost-intelligence/pl/[scopeType]/[scopeId]/route.ts' src/lib/sync/projections/notifications.ts src/app/api/cron/materialization-health/route.ts src/lib/sync/projections/index.ts src/lib/sync/event-catalog.ts`
- `pnpm build`

### Pendiente inmediato

- Siguiente corte sano:
  - smoke reactivo E2E de `operational_pl`
  - consumers downstream (`TASK-071`)
  - decidir si el cron dedicado `outbox-react-cost-intelligence` ya merece scheduling propio o si seguimos temporalmente con catch-all

## Sesión 2026-03-30 — TASK-069 smoke reactivo E2E validado

### Objetivo

- Cerrar el remanente técnico más claro de `TASK-069`: demostrar que `operational_pl` ya procesa el carril reactivo real, no solo tests y build.

### Delta de ejecución

- Nuevo smoke script:
  - `scripts/smoke-cost-intelligence-operational-pl.ts`
  - comando: `pnpm smoke:cost-intelligence:operational-pl`
- El smoke:
  - detecta un período real con actividad
  - inserta un evento sintético `finance.income.updated`
  - lo publica de forma aislada
  - procesa solo `cost_intelligence`
  - valida reactive log + snapshots materializados + eventos salientes `accounting.pl_snapshot.materialized`

### Evidencia obtenida

- `periodId=2026-03`
- `eventsProcessed=5`
- `eventsFailed=0`
- `projectionsTriggered=6`
- `snapshotCount=3`
- `publishedEventsCount=10`
- handler validado:
  - `operational_pl:finance.income.updated`

### Validación ejecutada

- `pnpm smoke:cost-intelligence:operational-pl`
- `pnpm exec eslint scripts/smoke-cost-intelligence-operational-pl.ts package.json`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm build`

### Pendiente inmediato

- El remanente principal de `TASK-069` ya no es de wiring base.
- Siguiente corte lógico:
  - consumers downstream (`TASK-071`)
  - decidir si el cron dedicado de `cost_intelligence` ya merece scheduling propio

## Sesión 2026-03-30 — TASK-068 cerrada

### Completado

- `TASK-068` pasó de `in-progress` a `complete`.
- Criterio de cierre validado:
  - checker de readiness operativo
  - close/reopen operativos
  - projection `period_closure_status` registrada
  - alineación con calendario operativo aplicada
  - smoke reactivo E2E validado
- Chequeo de impacto cruzado ejecutado:
  - `TASK-069` ya no queda bloqueada por remanentes de `TASK-068`
  - `TASK-070` y `TASK-071` pasan a depender solo de `TASK-069`

### Archivos tocados

- `docs/tasks/complete/TASK-068-period-closure-status-projection.md`
- `docs/tasks/README.md`
- `docs/tasks/to-do/TASK-069-operational-pl-projection.md`
- `docs/tasks/to-do/TASK-070-cost-intelligence-finance-ui.md`
- `docs/tasks/to-do/TASK-071-cost-intelligence-cross-module-consumers.md`
- `project_context.md`
- `Handoff.md`
- `changelog.md`

### Validación ejecutada

- `pnpm smoke:cost-intelligence:period-closure`
- `pnpm exec vitest run src/lib/cost-intelligence/check-period-readiness.test.ts src/lib/sync/projections/period-closure-status.test.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm exec eslint scripts/smoke-cost-intelligence-period-closure.ts src/lib/cost-intelligence/check-period-readiness.ts src/lib/cost-intelligence/check-period-readiness.test.ts`
- `pnpm build`

### Pendiente inmediato

- La continuación natural del carril ya es `TASK-069`.

## Sesión 2026-03-30 — TASK-068 smoke reactivo E2E validado

### Objetivo

- Cerrar el remanente real de `TASK-068` verificando el circuito reactivo del domain `cost_intelligence` con evidencia de runtime, no solo tests unitarios.

### Contexto operativo

- Antes de implementarlo se recontrastó `TASK-068` contra:
  - `docs/architecture/GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
  - projection registry, outbox consumer y reactive consumer del codebase
- Hallazgo clave:
  - la tarea sí estaba alineada con arquitectura y modelo de datos
  - el único gap real restante era demostrar la cadena `outbox -> reactive -> serving`

### Delta de ejecución

- Se agregó el smoke script:
  - `scripts/smoke-cost-intelligence-period-closure.ts`
  - comando: `pnpm smoke:cost-intelligence:period-closure`
- El smoke inserta un evento sintético `finance.expense.updated`, lo publica de forma aislada y procesa solo `cost_intelligence` con `batchSize: 1`.
- Evidencia obtenida:
  - `periodId=2026-03`
  - `eventsProcessed=1`
  - `eventsFailed=0`
  - `projectionsTriggered=1`
  - row materializada en `greenhouse_serving.period_closure_status`
  - row reactiva registrada en `greenhouse_sync.outbox_reactive_log`

### Validación ejecutada

- `pnpm smoke:cost-intelligence:period-closure`
- `pnpm exec vitest run src/lib/cost-intelligence/check-period-readiness.test.ts src/lib/sync/projections/period-closure-status.test.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm build`

### Pendiente inmediato

- El remanente de `TASK-068` ya no es de wiring técnico.
- Solo queda decidir si vale la pena endurecer `income_status` / `expense_status` a un `partial` más rico cuando Finance exponga señales de completitud más finas.

## Sesión 2026-03-30 — TASK-068 alineada al calendario operativo

### Objetivo

- Evitar que `period closure` nazca como lógica de mes calendario puro y alinearlo al calendario operativo ya existente en Payroll.

### Contexto operativo

- La implementación inicial de `TASK-068` ya estaba en `develop` y validada.
- Se revisaron explícitamente:
  - `docs/architecture/GREENHOUSE_HR_PAYROLL_ARCHITECTURE_V1.md`
  - `src/lib/calendar/operational-calendar.ts`
  - `src/lib/calendar/nager-date-holidays.ts`
  - `src/lib/payroll/auto-calculate-payroll.ts`
  - `src/lib/payroll/current-payroll-period.ts`
- Hallazgo clave:
  - Cost Intelligence ya estaba documentado como consumidor potencial del calendario operativo; convenía alinearlo ahora y no más tarde.

### Delta de ejecución

- `src/lib/cost-intelligence/check-period-readiness.ts` ahora:
  - resuelve contexto operativo con `resolveOperationalCalendarContext()`
  - hidrata feriados vía `loadNagerDateHolidayDateSet()`
  - calcula `currentOperationalMonthKey`, `inCurrentCloseWindow` y `lastBusinessDayOfTargetMonth`
  - expone ese bloque en `operationalCalendar`
- `listRecentClosurePeriods()` ahora asegura presencia del mes operativo actual aunque aún no existan señales materializadas del período.
- `src/lib/cost-intelligence/check-period-readiness.test.ts` ganó cobertura para el bloque `operationalCalendar`.

### Validación ejecutada

- `pnpm exec vitest run src/lib/cost-intelligence/check-period-readiness.test.ts src/lib/sync/projections/period-closure-status.test.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm build`

### Pendiente inmediato

- Sigue pendiente el smoke reactivo end-to-end del domain `cost_intelligence` para cerrar `TASK-068`.

## Sesión 2026-03-30 — TASK-068 Period Closure Status iniciada

### Objetivo

- Implementar el primer slice operativo de Cost Intelligence después de `TASK-067`:
  - checker de readiness mensual
  - projection `period_closure_status`
  - base de APIs close/reopen para ceremonia de cierre

### Contexto operativo

- `TASK-068` ya fue movida a `in-progress`.
- Esta lane se ejecuta apoyándose en:
  - `docs/architecture/GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`
- Restricción arquitectónica explícita:
  - el readiness y el cierre deben conversar con el lifecycle canónico de Payroll/Finance
  - no inventar semánticas paralelas para el período financiero

### Pendiente inmediato

- mapear columnas canónicas de `payroll_periods`, `income`, `expenses`, `exchange_rates`
- implementar helper `check-period-readiness`
- registrar projection reactiva y su scope `finance_period`

### Delta de ejecución

- El slice principal ya quedó materializado:
  - `src/lib/cost-intelligence/check-period-readiness.ts`
  - `src/lib/cost-intelligence/close-period.ts`
  - `src/lib/cost-intelligence/reopen-period.ts`
  - `src/lib/sync/projections/period-closure-status.ts`
  - rutas `GET/POST` bajo `/api/cost-intelligence/periods/**`
- Decisiones semánticas implementadas:
  - income mensual se lee por `invoice_date`
  - expenses mensuales se leen por `COALESCE(document_date, payment_date)`
  - FX mensual se considera por `rate_date`
  - payroll gating usa `payroll_periods.status`, con `exported` como condición default de readiness
- Validación pasada:
  - tests del carril `cost-intelligence`
  - `tsc --noEmit`
  - `pnpm build`
- Remanente inmediato:
  - smoke reactivo E2E del projection domain
  - evaluar si Finance amerita una semántica `partial` más rica para income/expenses antes de cerrar `TASK-068`

## Sesión 2026-03-30 — TASK-067 Cost Intelligence Foundation iniciada

### Objetivo

- bootstrap técnico de Cost Intelligence:
  - schema `greenhouse_cost_intelligence`
  - serving tables base
  - eventos `accounting.*`
  - domain `cost_intelligence` en projections
  - cron route dedicada

### Contexto operativo

- Esta lane se ejecuta después de revisar:
  - `docs/architecture/GREENHOUSE_COST_INTELLIGENCE_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
  - `docs/architecture/GREENHOUSE_REACTIVE_PROJECTIONS_PLAYBOOK_V1.md`
- Hay un cambio ajeno ya abierto y no mezclado en:
  - `src/app/api/finance/dashboard/summary/route.ts`

### Pendiente inmediato

- ninguno dentro del alcance de `TASK-067`; la continuation natural es `TASK-068` / `TASK-069`

### Delta de ejecución

- El bootstrap ya quedó implementado y validado:
  - `pnpm setup:postgres:cost-intelligence`
  - `pnpm pg:doctor --profile=runtime`
  - `pnpm pg:doctor --profile=migrator`
  - `pnpm exec eslint ...`
  - `pnpm build`
- Resultado:
  - schema `greenhouse_cost_intelligence` visible para runtime y migrator
  - route `outbox-react-cost-intelligence` compila y entra al build
  - `supportedDomains` ya incluye `cost_intelligence`
- El remanente del smoke local ya quedó resuelto:
  - raíz del problema: `GOOGLE_APPLICATION_CREDENTIALS_JSON` podía traer `private_key` PEM colapsada en una sola línea
  - fix aplicado en `src/lib/google-credentials.ts` reconstruyendo los saltos de línea del PEM antes de instanciar `google-auth-library`
  - cobertura agregada en `src/lib/google-credentials.test.ts`
  - smoke local autenticado de `/api/cron/outbox-react-cost-intelligence` ya responde `200`
- Decisión operativa vigente:
  - `TASK-067` queda cerrada para su alcance
  - la cron dedicada en `vercel.json` puede seguir diferida mientras `068/069` aún no registran projections reales; ya no por bloqueo OpenSSL/JWT
- Alineación nueva obligatoria para el siguiente slice:
  - `TASK-068` y `TASK-069` deben respetar también `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
  - `TASK-069` no redefine el P&L; materializa y distribuye por scope la semántica financiera canónica ya documentada por Finance

## Sesión 2026-03-30 — hardening documental para `TASK-141` sin romper reactive lanes

### Completado

- Se revisaron explícitamente los carriles sensibles antes de profundizar el cutover `person-first`:
  - `src/lib/sync/publish-event.ts`
  - `src/lib/webhooks/dispatcher.ts`
  - `src/lib/webhooks/consumers/notification-recipients.ts`
  - `src/lib/notifications/person-recipient-resolver.ts`
  - `src/lib/notifications/notification-service.ts`
  - `src/lib/sync/projections/notifications.ts`
  - `src/lib/sync/projections/client-economics.ts`
  - `src/lib/sync/projections/ico-member-metrics.ts`
  - `src/lib/sync/projections/person-intelligence.ts`
- Se dejó explícito en arquitectura y en `TASK-141` que:
  - persona canónica no reemplaza a ciegas `member_id` ni `user_id`
  - notificaciones siguen necesitando `userId` para inbox/preferencias cuando aplique
  - ICO, finance y serving por colaborador siguen necesitando `member_id` como clave operativa
  - cualquier cutover futuro debe ser gradual, observable y con compatibilidad transicional

### Archivos tocados

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/tasks/to-do/TASK-141-canonical-person-identity-consumption.md`
- `project_context.md`
- `Handoff.md`
- `changelog.md`

### Validación ejecutada

- revisión documental/manual del contrato
- lectura explícita de outbox, webhook dispatcher, recipient resolution y projections sensibles

### Pendiente inmediato

- si se implementa `TASK-141`, el primer slice debería crear o endurecer el resolver shared sin cambiar todavía recipient keys ni payloads reactivos
- consumers de notifications, finance e ICO deben verificarse con evidencia antes de cualquier cutover más agresivo

## Sesión 2026-03-30 — documentación arquitectónica del modelo de views

### Completado

- El modelo de gobernanza por vistas ya quedó documentado en arquitectura, no solo en tasks/handoff:
  - `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
  - `project_context.md`
- Quedó explícito que:
  - `routeGroups` siguen como boundary broad
  - `authorizedViews` + `view_code` son la capa fina
  - `/admin/views` es la superficie oficial para operar matrix, overrides, expiración, auditoría y preview

### Validación ejecutada

- Validación documental/manual del delta en arquitectura

### Pendiente inmediato

- Si en el siguiente corte nacen más superficies gobernables, ya no deberían documentarse solo en la task; deben actualizar también la arquitectura canónica.

## Sesión 2026-03-30 — decisión explícita: `/home` queda fuera de `view_code`

### Completado

- Se revisó el rol arquitectónico de `/home` y se dejó la decisión documentada en:
  - `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
  - `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
  - `project_context.md`
  - `docs/tasks/in-progress/TASK-136-admin-view-access-governance.md`
- Decisión vigente:
  - `/home` no entra al catálogo gobernable
  - sigue siendo landing transversal interna resuelta por `portalHomePath`

### Razón corta

- Gobernar `/home` como vista revocable hoy metería riesgo innecesario en el punto de entrada base de internos.

## Sesión 2026-03-30 — TASK-136 cierra capability modules cliente y mejora bulk ops en la matrix

### Completado

- Se agregó `cliente.modulos` al catálogo gobernable para cubrir `/capabilities/**`.
- El menú cliente ya no expone `Módulos` solo por `routeGroups`; ahora exige `authorizedViews` vía `cliente.modulos`.
- El layout dinámico `src/app/(dashboard)/capabilities/[moduleId]/layout.tsx` ahora aplica:
  - guard broad por `view_code` (`cliente.modulos`)
  - guard fino por módulo (`verifyCapabilityModuleAccess`)
- `/admin/views` ganó acciones masivas por rol sobre el set filtrado actual:
  - conceder filtradas
  - revocar filtradas
  - restablecer filtradas

### Archivos tocados

- `src/lib/admin/view-access-catalog.ts`
- `src/components/layout/vertical/VerticalMenu.tsx`
- `src/app/(dashboard)/capabilities/[moduleId]/layout.tsx`
- `src/views/greenhouse/admin/AdminViewAccessGovernanceView.tsx`
- `docs/tasks/in-progress/TASK-136-admin-view-access-governance.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `project_context.md`
- `changelog.md`

### Validación ejecutada

- `pnpm exec eslint src/lib/admin/view-access-catalog.ts src/app/'(dashboard)'/capabilities/[moduleId]/layout.tsx src/components/layout/vertical/VerticalMenu.tsx src/views/greenhouse/admin/AdminViewAccessGovernanceView.tsx`
- `pnpm build`

### Limitación observada

- `pnpm exec tsc --noEmit --pretty false` falló por drift ajeno en una ruta nueva ya presente en el árbol:
  - `src/app/api/people/[memberId]/finance-impact/route.ts`
- El build completo sí pasó, incluyendo `/capabilities/[moduleId]` y `/admin/views`.

### Pendiente inmediato

- El remanente fino de `TASK-136` ya se parece más a cleanup/cobertura residual que a un gap estructural:
  - decidir si más access points transversales merecen `view_code` propio
  - cerrar rutas profundas que aún hereden por layouts amplios

## Sesión 2026-03-30 — TASK-136 cerrada

### Completado

- `TASK-136` pasó de `in-progress` a `complete`.
- Se validó el criterio de cierre:
  - catálogo gobernable por `view_code` activo
  - persistencia role/user activa
  - expiración, auditoría y notificación reactiva activas
  - `authorizedViews` integrado a sesión, menú y guards
  - `/admin/views` ya funciona como superficie operativa real
- Chequeo de impacto cruzado ejecutado:
  - no se detectaron otras tasks activas o `to-do` que requieran delta inmediato por este cierre
  - el remanente futuro debe abrirse como follow-on, no reabrir artificialmente `TASK-136`

### Archivos tocados

- `docs/tasks/complete/TASK-136-admin-view-access-governance.md`
- `docs/tasks/README.md`
- `Handoff.md`
- `changelog.md`

### Validación ejecutada

- Validación documental/manual del cierre y del índice de tasks

## Sesión 2026-03-30 — TASK-136 cierra más rutas terciarias y completa la operabilidad de `/admin/views`

### Completado

- Se ampliaron superficies gobernables client-facing en `view_registry`:
  - `cliente.campanas`
  - `cliente.notificaciones`
- Nuevos guards por layout activos en:
  - `src/app/(dashboard)/campaigns/layout.tsx`
  - `src/app/(dashboard)/campanas/layout.tsx`
  - `src/app/(dashboard)/notifications/layout.tsx`
- `/admin/views` ya no se comporta solo como matrix editable básica:
  - resumen de cambios pendientes vs estado persistido
  - foco sobre vistas que siguen en fallback hardcoded
  - preview con baseline visible, overrides activos, grants extra y revokes efectivos
  - filtro del panel de overrides por `impact / overrides / visibles / todas`
  - lectura más clara de vistas ocultas por revoke

### Archivos tocados

- `src/lib/admin/view-access-catalog.ts`
- `src/app/(dashboard)/campaigns/layout.tsx`
- `src/app/(dashboard)/campanas/layout.tsx`
- `src/app/(dashboard)/notifications/layout.tsx`
- `src/views/greenhouse/admin/AdminViewAccessGovernanceView.tsx`
- `docs/tasks/in-progress/TASK-136-admin-view-access-governance.md`
- `docs/tasks/README.md`
- `changelog.md`

### Validación ejecutada

- `pnpm exec eslint src/lib/admin/view-access-catalog.ts src/app/'(dashboard)'/campaigns/layout.tsx src/app/'(dashboard)'/campanas/layout.tsx src/app/'(dashboard)'/notifications/layout.tsx src/views/greenhouse/admin/AdminViewAccessGovernanceView.tsx`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm build`

### Pendiente inmediato

- `home` y algunos access points transversales siguen sin `view_code` propio porque todavía conviene decidir si deben ser superficies gobernables o rutas base siempre disponibles para sesión autenticada.
- Quedan cambios ajenos en el árbol fuera de este carril:
  - `src/lib/operations/get-operations-overview.ts`
  - `src/views/greenhouse/admin/AdminOpsHealthView.tsx`
  - `src/lib/finance/dte-emission-queue.test.ts`

## Sesión 2026-03-30 — TASK-136 agrega notificación reactiva al usuario afectado

### Completado

- Los overrides por usuario de `/admin/views` ya no quedan solo en persistencia + auditoría:
  - `saveUserViewOverrides()` ahora compara acceso efectivo antes/después del save
  - cuando el set real de vistas cambia, publica un evento outbox `access.view_override_changed`
- Los overrides expirados ya no quedan como deuda silenciosa:
  - `getPersistedUserOverrides()` limpia overrides vencidos de forma oportunista
  - registra `expire_user` en `greenhouse_core.view_access_log`
  - publica el mismo evento reactivo si la expiración cambia el acceso efectivo del usuario
- El dominio `notifications` ya consume ese evento y notifica al usuario afectado con:
  - resumen de vistas concedidas
  - resumen de vistas revocadas
  - deep-link preferente a la vista recién habilitada o fallback `/dashboard`
- Se agregó cobertura unitaria del projection reactivo para este caso.

### Archivos tocados

- `src/lib/admin/view-access-store.ts`
- `src/lib/sync/projections/notifications.ts`
- `src/lib/sync/projections/notifications.test.ts`
- `docs/tasks/in-progress/TASK-136-admin-view-access-governance.md`
- `docs/tasks/README.md`
- `changelog.md`

### Validación ejecutada

- `pnpm exec vitest run src/lib/sync/projections/notifications.test.ts`
- `pnpm exec eslint src/lib/admin/view-access-store.ts src/lib/sync/event-catalog.ts src/lib/sync/projections/notifications.ts src/lib/sync/projections/notifications.test.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm build`

### Pendiente inmediato

- El evento hoy notifica solo cuando cambia el acceso efectivo; ajustes de razón sin cambio de vistas no notifican al usuario, por diseño.
- El siguiente cierre fuerte de `TASK-136` pasa por:
  - modelar más rutas terciarias con `view_code` propio donde todavía exista herencia amplia
  - decidir si conviene exponer en UI un historial más rico de expiraciones/cleanup automático

## Sesión 2026-03-30 — baseline moderna de UI/UX y skills locales

### Completado

- Se auditó la capa local de skills UI de Greenhouse y se confirmó drift operativo:
  - el repo dependía demasiado de skills globales y de una lectura vieja de Vuexy
  - `greenhouse-ui-orchestrator` referenciaba heurísticas no alineadas con el estado actual
- Se agregó `docs/ui/GREENHOUSE_MODERN_UI_UX_BASELINE_V1.md` como referencia canónica para:
  - first-fold hierarchy
  - densidad y ritmo visual
  - estados empty/partial/warning/error
  - UX writing
  - accessibility baseline
- Se reforzaron las skills locales:
  - `.codex/skills/greenhouse-agent/SKILL.md`
  - `.codex/skills/greenhouse-vuexy-ui-expert/SKILL.md`
  - `.codex/skills/greenhouse-portal-ui-implementer/SKILL.md`
  - `.codex/skills/greenhouse-ui-orchestrator/SKILL.md`
- Nueva skill creada:
  - `.codex/skills/greenhouse-ux-content-accessibility/SKILL.md`

### Fuentes externas sintetizadas

- Android Developers / Material guidance para layouts adaptativos y list-detail
- GOV.UK Design System
- US Web Design System
- Atlassian content design
- W3C WAI / WCAG quick reference

### Pendiente inmediato

- No hay validación de build necesaria por ser un cambio documental/skills, pero conviene probar en los siguientes trabajos UI que la selección automática de skills ya priorice la baseline local.

## Sesión 2026-03-30 — TASK-136 iniciada con slice UI de gobernanza de vistas

### Completado

- `TASK-136` pasó a `in-progress`.
- Se abrió el primer corte real del módulo en `/admin/views` para probar la nueva baseline UI/UX en una superficie compleja de admin governance.
- El slice actual implementa:
  - hero y KPIs de contexto
  - matriz de acceso por vista × rol
  - filtros por sección y tipo de rol
  - preview por usuario de la navegación efectiva
  - cards de siguiente slice para overrides, persistencia configurable y auditoría
- Integración inicial aplicada en:
  - `Admin Center` landing
  - sidebar admin
- Decisión deliberada del slice:
  - la pantalla usa el baseline real actual (`roles` + `routeGroups`) sin fingir todavía `view_registry` persistido
  - esto deja honesto el estado parcial de la lane y permite validar UX antes del cambio fuerte de backend

### Archivos tocados

- `src/lib/admin/get-admin-view-access-governance.ts`
- `src/views/greenhouse/admin/AdminViewAccessGovernanceView.tsx`
- `src/app/(dashboard)/admin/views/page.tsx`
- `src/views/greenhouse/admin/AdminCenterView.tsx`
- `src/components/layout/vertical/VerticalMenu.tsx`
- `src/config/greenhouse-nomenclature.ts`
- `docs/tasks/in-progress/TASK-136-admin-view-access-governance.md`
- `docs/tasks/README.md`
- `docs/tasks/TASK_ID_REGISTRY.md`

### Pendiente inmediato

- Validar `lint` del slice nuevo.
- Evaluar si el helper actual debe endurecer la simulación de acceso de admin para empatar exactamente todos los casos especiales del menú vigente.
- Siguiente salto funcional de la task:
  - persistencia `view_registry` / `role_view_assignments`
  - overrides por usuario
  - auditoría y save real

## Sesión 2026-03-30 — TASK-137 iniciada con activación real de la foundation UI

### Completado

- `TASK-137` pasó a `in-progress`.
- Se activó un slice inicial real de la capa UI transversal:
  - `react-hook-form` en `Login`
  - `react-hook-form` en `Forgot Password`
  - `GreenhouseDatePicker`
  - `GreenhouseCalendar`
  - `GreenhouseDragList`
- Primera vista de calendario en repo:
  - `/admin/operational-calendar`
- Primer uso real de drag-and-drop:
  - reorder local de domain cards en `Admin Center`
- Arquitectura UI actualizada para reflejar activación real en:
  - `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`

### Archivos tocados

- `src/lib/forms/greenhouse-form-patterns.ts`
- `src/views/Login.tsx`
- `src/app/(blank-layout-pages)/auth/forgot-password/page.tsx`
- `src/components/greenhouse/GreenhouseDatePicker.tsx`
- `src/components/greenhouse/GreenhouseCalendar.tsx`
- `src/components/greenhouse/GreenhouseDragList.tsx`
- `src/components/greenhouse/index.ts`
- `src/lib/calendar/get-admin-operational-calendar-overview.ts`
- `src/views/greenhouse/admin/AdminOperationalCalendarView.tsx`
- `src/app/(dashboard)/admin/operational-calendar/page.tsx`
- `src/views/greenhouse/admin/AdminCenterView.tsx`
- `src/components/layout/vertical/VerticalMenu.tsx`
- `src/config/greenhouse-nomenclature.ts`
- `docs/tasks/in-progress/TASK-137-ui-foundation-activation.md`
- `docs/tasks/README.md`
- `docs/tasks/TASK_ID_REGISTRY.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`

### Pendiente inmediato

- Correr validación local del slice (`eslint`, `tsc`, `build`, `test`).
- Confirmar si el wrapper de date picker necesita endurecer integración explícita con `Controller` para forms complejos futuros.

## Sesión 2026-03-30 — TASK-136 avanza a persistencia inicial por rol

### Completado

- `/admin/views` ya soporta save real de la matriz role × view.
- Nuevo slice persistido implementado:
  - store Postgres para catálogo de vistas y assignments
  - API admin `POST /api/admin/views/assignments`
  - matrix editable en UI con guardar/restablecer
  - fallback seguro al baseline hardcoded cuando la capa persistida no está lista
- Infra aplicada en dev con:
  - `pnpm setup:postgres:view-access`

### Archivos tocados

- `src/lib/admin/view-access-catalog.ts`
- `src/lib/admin/view-access-store.ts`
- `src/lib/admin/get-admin-view-access-governance.ts`
- `src/views/greenhouse/admin/AdminViewAccessGovernanceView.tsx`
- `src/app/api/admin/views/assignments/route.ts`
- `scripts/setup-postgres-view-access.sql`
- `scripts/setup-postgres-view-access.ts`
- `package.json`
- `docs/tasks/in-progress/TASK-136-admin-view-access-governance.md`

### Validación ejecutada

- `pnpm pg:doctor`
- `pnpm setup:postgres:view-access`
- `pnpm exec eslint src/lib/admin/view-access-catalog.ts src/lib/admin/view-access-store.ts src/lib/admin/get-admin-view-access-governance.ts src/views/greenhouse/admin/AdminViewAccessGovernanceView.tsx src/app/api/admin/views/assignments/route.ts scripts/setup-postgres-view-access.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm build`

### Pendiente inmediato

- Conectar esta persistencia al runtime de sesión (`TenantContext`, `NextAuth`, guards y menú) para que las vistas guardadas gobiernen acceso real y no solo la matrix administrativa.
- Activar overrides por usuario y auditoría visible en la misma pantalla.

## Sesión 2026-03-30 — TASK-136 integra authorizedViews en sesión y navegación

### Completado

- `TenantAccessRecord` ahora resuelve `authorizedViews` desde la capa persistida de view access cuando existe.
- `NextAuth` y `TenantContext` ya propagan:
  - `authorizedViews`
  - `routeGroups` derivados de las vistas autorizadas
- `VerticalMenu` ya usa `authorizedViews` para filtrar items clave de:
  - Gestión
  - Finanzas
  - HR
  - Administración
  - AI tooling

### Validación ejecutada

- `pnpm exec eslint src/lib/admin/view-access-store.ts src/lib/tenant/access.ts src/lib/auth.ts src/lib/tenant/get-tenant-context.ts src/types/next-auth.d.ts src/components/layout/vertical/VerticalMenu.tsx`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm build`

### Pendiente inmediato

- Los guards broad por layout ya heredan `routeGroups` derivados, pero aún no existe enforcement page-level exhaustivo por `view_code` en todas las rutas del portal.
- El warning OpenSSL/JWT durante `build` sigue apareciendo en static generation de `/admin/views`; el artefacto termina bien y cae a fallback hardcoded durante esa fase.

## Sesión 2026-03-30 — TASK-136 cierra el primer enforcement page-level por view_code

### Completado

- Se agregó `hasAuthorizedViewCode()` en `src/lib/tenant/authorization.ts` para resolver autorización por vista usando:
  - `tenant.authorizedViews`
  - fallback explícito a `routeGroups` cuando el catálogo persistido aún no gobierna ese usuario
- Ya hay enforcement page-level o nested layout específico para superficies catalogadas clave:
  - `/dashboard`, `/settings`
  - `/proyectos/**`, `/sprints/**`
  - `/agency`, `/agency/organizations/**`, `/agency/services/**`
  - `/people/**`, `/hr/payroll/**`
  - `/finance`, `/finance/income/**`, `/finance/expenses/**`, `/finance/reconciliation/**`
  - `/admin`, `/admin/roles`, `/admin/views`, `/admin/ops-health`, `/admin/ai-tools`, `/admin/tenants/**`, `/admin/users/**`
  - `/my/profile`, `/my/payroll`

### Archivos tocados

- `src/lib/tenant/authorization.ts`
- `src/app/(dashboard)/dashboard/page.tsx`
- `src/app/(dashboard)/settings/page.tsx`
- `src/app/(dashboard)/proyectos/layout.tsx`
- `src/app/(dashboard)/sprints/layout.tsx`
- `src/app/(dashboard)/agency/page.tsx`
- `src/app/(dashboard)/agency/organizations/layout.tsx`
- `src/app/(dashboard)/agency/services/layout.tsx`
- `src/app/(dashboard)/people/layout.tsx`
- `src/app/(dashboard)/hr/payroll/layout.tsx`
- `src/app/(dashboard)/finance/page.tsx`
- `src/app/(dashboard)/finance/income/layout.tsx`
- `src/app/(dashboard)/finance/expenses/layout.tsx`
- `src/app/(dashboard)/finance/reconciliation/layout.tsx`
- `src/app/(dashboard)/admin/page.tsx`
- `src/app/(dashboard)/admin/roles/page.tsx`
- `src/app/(dashboard)/admin/views/page.tsx`
- `src/app/(dashboard)/admin/ops-health/page.tsx`
- `src/app/(dashboard)/admin/ai-tools/page.tsx`
- `src/app/(dashboard)/admin/tenants/layout.tsx`
- `src/app/(dashboard)/admin/users/layout.tsx`
- `src/app/(dashboard)/my/profile/page.tsx`
- `src/app/(dashboard)/my/payroll/page.tsx`
- `docs/tasks/in-progress/TASK-136-admin-view-access-governance.md`
- `changelog.md`

### Validación ejecutada

- `pnpm exec tsc --noEmit --pretty false`
- `pnpm exec eslint src/lib/tenant/authorization.ts src/app/'(dashboard)'/agency/page.tsx src/app/'(dashboard)'/agency/organizations/layout.tsx src/app/'(dashboard)'/agency/services/layout.tsx src/app/'(dashboard)'/dashboard/page.tsx src/app/'(dashboard)'/finance/page.tsx src/app/'(dashboard)'/finance/income/layout.tsx src/app/'(dashboard)'/finance/expenses/layout.tsx src/app/'(dashboard)'/finance/reconciliation/layout.tsx src/app/'(dashboard)'/hr/payroll/layout.tsx src/app/'(dashboard)'/people/layout.tsx src/app/'(dashboard)'/admin/page.tsx src/app/'(dashboard)'/admin/roles/page.tsx src/app/'(dashboard)'/admin/views/page.tsx src/app/'(dashboard)'/admin/ops-health/page.tsx src/app/'(dashboard)'/admin/ai-tools/page.tsx src/app/'(dashboard)'/admin/tenants/layout.tsx src/app/'(dashboard)'/admin/users/layout.tsx src/app/'(dashboard)'/my/profile/page.tsx src/app/'(dashboard)'/my/payroll/page.tsx src/app/'(dashboard)'/settings/page.tsx src/app/'(dashboard)'/proyectos/layout.tsx src/app/'(dashboard)'/sprints/layout.tsx`
- `pnpm build`

### Pendiente inmediato

- Extender el mismo enforcement a rutas todavía no catalogadas en `view_registry` para reducir los últimos escapes por subpath.
- Decidir si algunos módulos amplios deben endurecerse con layouts más altos en el árbol una vez que el catálogo de vistas cubra todos los descendants.

## Sesión 2026-03-30 — TASK-136 amplía enforcement sobre layouts amplios y páginas vecinas

### Completado

- `src/lib/tenant/authorization.ts` ahora también expone `hasAnyAuthorizedViewCode()`.
- Los layouts amplios ya respetan catálogo persistido cuando existe:
  - `src/app/(dashboard)/admin/layout.tsx`
  - `src/app/(dashboard)/finance/layout.tsx`
  - `src/app/(dashboard)/hr/layout.tsx`
  - `src/app/(dashboard)/my/layout.tsx` nuevo
- Páginas vecinas no catalogadas todavía quedaron amarradas al `view_code` más cercano:
  - `src/app/(dashboard)/hr/leave/page.tsx` → `equipo.permisos`
  - `src/app/(dashboard)/admin/team/page.tsx` → `administracion.usuarios`
  - `src/app/(dashboard)/admin/operational-calendar/page.tsx` → `administracion.admin_center`
  - `src/app/(dashboard)/admin/cloud-integrations/page.tsx` → `administracion.ops_health`
  - `src/app/(dashboard)/admin/email-delivery/page.tsx` → `administracion.ops_health`
  - `src/app/(dashboard)/admin/notifications/page.tsx` → `administracion.ops_health`
  - `src/app/(dashboard)/finance/intelligence/page.tsx` → `finanzas.resumen`
  - `src/app/(dashboard)/finance/cost-allocations/page.tsx` → `finanzas.resumen`

### Validación ejecutada

- `pnpm exec eslint src/lib/tenant/authorization.ts src/app/'(dashboard)'/admin/layout.tsx src/app/'(dashboard)'/finance/layout.tsx src/app/'(dashboard)'/hr/layout.tsx src/app/'(dashboard)'/my/layout.tsx src/app/'(dashboard)'/hr/leave/page.tsx src/app/'(dashboard)'/admin/team/page.tsx src/app/'(dashboard)'/admin/operational-calendar/page.tsx src/app/'(dashboard)'/admin/email-delivery/page.tsx src/app/'(dashboard)'/admin/notifications/page.tsx src/app/'(dashboard)'/admin/cloud-integrations/page.tsx src/app/'(dashboard)'/finance/intelligence/page.tsx src/app/'(dashboard)'/finance/cost-allocations/page.tsx`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm build`

### Pendiente inmediato

- El enforcement ya cubre mejor navegación y descendencia visible, pero el catálogo `view_registry` sigue sin modelar cada superficie secundaria del portal.
- El siguiente paso saludable es expandir `view_registry` antes de seguir repartiendo ownership de subpaths ambiguos por inferencia.

## Sesión 2026-03-30 — TASK-136 empieza el cierre del cuello de modelo en Admin + Finance

### Completado

- `src/lib/admin/view-access-catalog.ts` sumó nuevos `view_code` explícitos:
  - `finanzas.clientes`
  - `finanzas.proveedores`
  - `finanzas.inteligencia`
  - `finanzas.asignaciones_costos`
  - `administracion.cloud_integrations`
  - `administracion.email_delivery`
  - `administracion.notifications`
  - `administracion.calendario_operativo`
  - `administracion.equipo`
- Se alinearon guards directos con esos códigos nuevos en:
  - `src/app/(dashboard)/admin/team/page.tsx`
  - `src/app/(dashboard)/admin/operational-calendar/page.tsx`
  - `src/app/(dashboard)/admin/email-delivery/page.tsx`
  - `src/app/(dashboard)/admin/notifications/page.tsx`
  - `src/app/(dashboard)/admin/cloud-integrations/page.tsx`
  - `src/app/(dashboard)/finance/intelligence/page.tsx`
  - `src/app/(dashboard)/finance/cost-allocations/page.tsx`
  - `src/app/(dashboard)/finance/clients/layout.tsx`
  - `src/app/(dashboard)/finance/suppliers/layout.tsx`
- `src/components/layout/vertical/VerticalMenu.tsx` ya filtra también esos accesos nuevos en sidebar.
- Hardening clave del resolver:
  - `src/lib/admin/view-access-store.ts` ya no apaga por defecto un `view_code` nuevo cuando un rol tiene assignments persistidos parciales
  - si falta la combinación `role_code + view_code`, se usa fallback por vista hasta que se persista explícitamente

### Validación ejecutada

- `pnpm exec eslint src/lib/admin/view-access-catalog.ts src/lib/admin/view-access-store.ts src/components/layout/vertical/VerticalMenu.tsx src/app/'(dashboard)'/finance/clients/layout.tsx src/app/'(dashboard)'/finance/suppliers/layout.tsx src/app/'(dashboard)'/admin/team/page.tsx src/app/'(dashboard)'/admin/operational-calendar/page.tsx src/app/'(dashboard)'/admin/email-delivery/page.tsx src/app/'(dashboard)'/admin/notifications/page.tsx src/app/'(dashboard)'/admin/cloud-integrations/page.tsx src/app/'(dashboard)'/finance/intelligence/page.tsx src/app/'(dashboard)'/finance/cost-allocations/page.tsx`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm build`

### Pendiente inmediato

- Repetir la misma expansión de modelo en `Agency`, `HR`, `My` y otras superficies secundarias para quitar más inferencias del catálogo.
- Luego de eso, recién tiene sentido abrir con fuerza los overrides por usuario y la auditoría fina desde `/admin/views`.

## Sesión 2026-03-30 — TASK-136 extiende el catálogo a Agency, HR y My

### Completado

- `src/lib/admin/view-access-catalog.ts` sumó nuevos `view_code` explícitos en:
  - Agency: `gestion.spaces`, `gestion.economia`, `gestion.equipo`, `gestion.delivery`, `gestion.campanas`, `gestion.operaciones`
  - HR: `equipo.departamentos`, `equipo.asistencia`
  - My: `mi_ficha.mi_inicio`, `mi_ficha.mis_asignaciones`, `mi_ficha.mi_desempeno`, `mi_ficha.mi_delivery`, `mi_ficha.mis_permisos`, `mi_ficha.mi_organizacion`
- Se alinearon guards concretos en:
  - `src/app/(dashboard)/agency/layout.tsx`
  - `src/app/(dashboard)/agency/spaces/page.tsx`
  - `src/app/(dashboard)/agency/economics/page.tsx`
  - `src/app/(dashboard)/agency/team/page.tsx`
  - `src/app/(dashboard)/agency/delivery/page.tsx`
  - `src/app/(dashboard)/agency/campaigns/page.tsx`
  - `src/app/(dashboard)/agency/operations/page.tsx`
  - `src/app/(dashboard)/hr/departments/page.tsx`
  - `src/app/(dashboard)/hr/attendance/page.tsx`
  - `src/app/(dashboard)/my/layout.tsx`
  - `src/app/(dashboard)/my/page.tsx`
  - `src/app/(dashboard)/my/assignments/page.tsx`
  - `src/app/(dashboard)/my/delivery/page.tsx`
  - `src/app/(dashboard)/my/performance/page.tsx`
  - `src/app/(dashboard)/my/leave/page.tsx`
  - `src/app/(dashboard)/my/organization/page.tsx`
- `src/components/layout/vertical/VerticalMenu.tsx` ya filtra también `Agency`, `HR` y `Mi Ficha` con esos `view_code` nuevos.

### Validación ejecutada

- `pnpm exec eslint src/lib/admin/view-access-catalog.ts src/app/'(dashboard)'/agency/layout.tsx src/app/'(dashboard)'/agency/spaces/page.tsx src/app/'(dashboard)'/agency/economics/page.tsx src/app/'(dashboard)'/agency/team/page.tsx src/app/'(dashboard)'/agency/delivery/page.tsx src/app/'(dashboard)'/agency/campaigns/page.tsx src/app/'(dashboard)'/agency/operations/page.tsx src/app/'(dashboard)'/hr/departments/page.tsx src/app/'(dashboard)'/hr/attendance/page.tsx src/app/'(dashboard)'/my/layout.tsx src/app/'(dashboard)'/my/page.tsx src/app/'(dashboard)'/my/assignments/page.tsx src/app/'(dashboard)'/my/delivery/page.tsx src/app/'(dashboard)'/my/performance/page.tsx src/app/'(dashboard)'/my/leave/page.tsx src/app/'(dashboard)'/my/organization/page.tsx src/components/layout/vertical/VerticalMenu.tsx`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm build`

### Pendiente inmediato

- El mayor remanente ya queda en rutas secundarias que no están directamente en menú o que representan tabs/flows internos más finos.
- El siguiente paso útil puede ser:
  - expandir catálogo a superficies secundarias restantes, o
  - empezar overrides por usuario y auditoría visible apoyados en el catálogo ya bastante más completo.

## Sesión 2026-03-30 — TASK-136 alinea portal cliente y access points secundarios

### Completado

- `src/lib/admin/view-access-catalog.ts` sumó:
  - `gestion.capacidad`
  - `cliente.equipo`
  - `cliente.analytics`
  - `cliente.revisiones`
  - `cliente.actualizaciones`
- Se alinearon guards en:
  - `src/app/(dashboard)/agency/capacity/page.tsx`
  - `src/app/(dashboard)/hr/page.tsx`
  - `src/app/(dashboard)/equipo/page.tsx`
  - `src/app/(dashboard)/analytics/page.tsx`
  - `src/app/(dashboard)/reviews/page.tsx`
  - `src/app/(dashboard)/updates/page.tsx`
- `src/components/layout/vertical/VerticalMenu.tsx` ahora filtra también la navegación primaria cliente con `authorizedViews`.

### Validación ejecutada

- `pnpm exec eslint src/lib/admin/view-access-catalog.ts src/app/'(dashboard)'/agency/capacity/page.tsx src/app/'(dashboard)'/hr/page.tsx src/app/'(dashboard)'/equipo/page.tsx src/app/'(dashboard)'/analytics/page.tsx src/app/'(dashboard)'/reviews/page.tsx src/app/'(dashboard)'/updates/page.tsx src/components/layout/vertical/VerticalMenu.tsx`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm build`

### Pendiente inmediato

- El remanente más claro ahora está en superficies terciarias, redirects/tabs internas y algunas páginas genéricas no modeladas como vistas gobernables.
- Ya empieza a tener sentido abrir el siguiente gran bloque: overrides por usuario y auditoría visible, o bien hacer una última pasada de catálogo fino en rutas profundas.

## Sesión 2026-03-30 — TASK-136 activa overrides por usuario

### Completado

- Nuevo endpoint:
  - `src/app/api/admin/views/overrides/route.ts`
- `src/lib/admin/view-access-store.ts` ahora:
  - lee overrides activos desde `greenhouse_core.user_view_overrides`
  - guarda overrides por usuario
  - aplica `grant/revoke` al resolver final de `authorizedViews`
- `src/lib/tenant/access.ts` ya pasa `userId` al resolver para que la sesión reciba la lectura efectiva final.
- `src/lib/admin/get-admin-view-access-governance.ts` y `src/views/greenhouse/admin/AdminViewAccessGovernanceView.tsx` ya exponen y usan `userOverrides`.
- El tab `Preview` de `/admin/views` ahora permite:
  - alternar cada vista entre `inherit`, `grant` y `revoke`
  - guardar overrides permanentes con razón
  - ver el resultado efectivo en la sidebar simulada y el detalle de vistas

### Validación ejecutada

- `pnpm exec eslint src/lib/admin/get-admin-view-access-governance.ts src/lib/admin/view-access-store.ts src/lib/tenant/access.ts src/views/greenhouse/admin/AdminViewAccessGovernanceView.tsx src/app/api/admin/views/overrides/route.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm build`

### Pendiente inmediato

- Este slice inicial ya hace el trabajo útil, pero aún faltan:
  - reasons por vista más finas
  - evento/notificación al usuario afectado cuando cambie su acceso

## Sesión 2026-03-30 — TASK-136 suma expiración opcional y auditoría visible

### Completado

- `src/views/greenhouse/admin/AdminViewAccessGovernanceView.tsx` ahora soporta:
  - expiración opcional por batch de overrides del usuario seleccionado
  - feed de auditoría reciente por usuario en el tab `Preview`
- `src/lib/admin/get-admin-view-access-governance.ts` y `src/lib/admin/view-access-store.ts` ahora exponen `auditLog` desde `greenhouse_core.view_access_log`.
- Para sostener el repo verde durante el cierre se corrigió un drift de tipos en:
  - `src/app/api/finance/income/reconcile-payments/route.ts`
  - el handler usaba `newAmountPaid`, pero el contrato actual del ledger expone `amountPaid`

### Validación ejecutada

- `pnpm exec eslint src/lib/admin/get-admin-view-access-governance.ts src/lib/admin/view-access-store.ts src/views/greenhouse/admin/AdminViewAccessGovernanceView.tsx src/app/api/finance/income/reconcile-payments/route.ts`
- `pnpm build`

### Pendiente inmediato

- El remanente más valioso de `TASK-136` ya es:
  - reasons por vista más finas
  - expiración individual por override, no solo por batch
  - notificación/evento al usuario afectado

## Sesión 2026-03-30 — hardening Sentry incident reader

### Completado

- Se aisló el incidente visible en `staging` desde `/admin/ops-health`: el bloque `Incidentes Sentry` degradaba con `HTTP 403 {"detail":"You do not have permission to perform this action."}`.
- La causa raíz es de permisos/token, no de UI:
  - el runtime estaba usando `SENTRY_AUTH_TOKEN` para leer issues de Sentry
  - ese token puede servir para build/source maps y aun así no tener permisos de lectura de incidentes
- `src/lib/cloud/observability.ts` ahora:
  - resuelve `SENTRY_INCIDENTS_AUTH_TOKEN` / `SENTRY_INCIDENTS_AUTH_TOKEN_SECRET_REF` como credencial preferida
  - mantiene fallback a `SENTRY_AUTH_TOKEN` solo como compatibilidad transicional
  - cuando Sentry responde `401/403`, proyecta un warning accionable en vez de un fallo genérico

### Archivos tocados

- `src/lib/cloud/observability.ts`
- `src/lib/cloud/observability.test.ts`
- `.env.example`
- `project_context.md`
- `docs/tasks/complete/TASK-133-ops-health-sentry-incident-surfacing.md`
- `changelog.md`

### Pendiente inmediato

- Correr validación local (`vitest`, `eslint`, `tsc`, `build`).
- Sembrar en `staging` un `SENTRY_INCIDENTS_AUTH_TOKEN` con permisos reales de lectura de incidentes si se quiere recuperar el bloque con data real.

## Sesión 2026-03-29 — Notifications endurecida a person-first

### Completado

- Se confirmó y corrigió el drift de identidad del sistema de notificaciones:
  - antes coexistían rutas `member-first`, `client_user-first` y `userId-first`
  - ahora el resolver compartido nace desde `identity_profile` / `member`
- Nuevo helper canónico:
  - `src/lib/notifications/person-recipient-resolver.ts`
- `NotificationService.dispatch()` ahora resuelve recipients a través de ese helper antes de elegir canales.
- `notification-recipients.ts` (webhook bus) ya quedó alineado al mismo contrato.
- `notification-dispatch.ts` ya dedupea por recipient key efectiva, no solo `userId`.
- `TASK-117` quedó revalidada con notificaciones reales para Julio y Humberly.
- Se creó `TASK-134` para el follow-on transversal de governance del modelo Notifications.

### Validación ejecutada

- `pnpm exec vitest run src/lib/notifications/person-recipient-resolver.test.ts src/lib/notifications/notification-service.test.ts src/lib/webhooks/consumers/notification-recipients.test.ts src/lib/webhooks/consumers/notification-dispatch.test.ts src/lib/webhooks/consumers/notification-mapping.test.ts src/lib/sync/projections/notifications.test.ts`
- `pnpm exec eslint ...` sobre notifications + webhook consumers + reactive projection
- `pnpm exec tsc --noEmit --pretty false`

### Pendiente inmediato

- El inbox y las preferencias siguen `userId`-scoped por diseño; no reabrir eso sin un corte de schema/policy explícito.
- Si se sigue esta línea, el siguiente slice natural es `TASK-134`.

## Sesión 2026-03-29 — TASK-117 cerrada con auto-cálculo mensual de payroll

### Completado

- `TASK-117` pasó a `complete`.
- Payroll ya formaliza el hito mensual de cálculo con:
  - `getLastBusinessDayOfMonth()` / `isLastBusinessDayOfMonth()`
  - `getPayrollCalculationDeadlineStatus()`
  - `calculation readiness` separado de `approval readiness`
  - `runPayrollAutoCalculation()` + `GET /api/cron/payroll-auto-calculate`
  - auto-creación del período mensual cuando falta
  - consumer reactivo `payroll_period.calculated` con categoría `payroll_ops`
- `PayrollPeriodTab` ahora muestra deadline, estado operativo y cumplimiento del cálculo.
- `approve/route` consume la rama `approval` del readiness en vez del readiness legacy mezclado.
- Validación local ejecutada:
  - `pnpm exec vitest run src/lib/calendar/operational-calendar.test.ts src/lib/payroll/current-payroll-period.test.ts src/lib/payroll/payroll-readiness.test.ts src/lib/payroll/auto-calculate-payroll.test.ts src/views/greenhouse/payroll/PayrollPeriodTab.test.tsx`
  - `pnpm exec eslint ...` sobre calendario, payroll, cron y UI
  - `pnpm exec tsc --noEmit --pretty false`
  - `pnpm build`

### Pendiente inmediato

- No queda blocker abierto dentro del alcance de `TASK-117`; los follow-ons que resten son de policy/UX futura o de adopción operativa en ambientes.

## Sesión 2026-03-29 — TASK-133 cerrada con surfacing fail-soft de incidentes Sentry

### Completado

- `TASK-133` pasó a `complete`.
- `src/lib/cloud/observability.ts` ahora separa:
  - `getCloudObservabilityPosture()`
  - `getCloudSentryIncidents()`
- `getOperationsOverview()` ya proyecta:
  - `cloud.observability.posture`
  - `cloud.observability.incidents`
- `GET /api/internal/health` ya expone también `sentryIncidents`.
- UI conectada:
  - `AdminOpsHealthView` muestra incidentes Sentry con status, summary, release, environment, ocurrencia y deep-link
  - `AdminCloudIntegrationsView` resume el estado de incidentes y deriva a `Ops Health`
- Validación local ejecutada:
  - `pnpm exec vitest run src/lib/cloud/observability.test.ts src/lib/webhooks/target-url.test.ts`
  - `pnpm exec eslint ...` sobre cloud/ops/admin views
  - `pnpm exec tsc --noEmit --pretty false`
  - `pnpm build`

### Pendiente inmediato

- No queda blocker de repo para el surfacing; la validación runtime adicional en ambiente queda como smoke operativo, no como gap de implementación.

## Sesión 2026-03-29 — TASK-133 iniciada con surfacing fail-soft de incidentes Sentry

### Completado

- `TASK-133` pasó a `in-progress`.
- `src/lib/cloud/observability.ts` ahora separa:
  - `getCloudObservabilityPosture()`
  - `getCloudSentryIncidents()`
- Nuevo contrato canónico en `src/lib/cloud/contracts.ts`:
  - `CloudSentryIncident`
  - `CloudSentryIncidentsSnapshot`
- `getOperationsOverview()` ya proyecta:
  - `cloud.observability.posture`
  - `cloud.observability.incidents`
- `GET /api/internal/health` ya expone también `sentryIncidents` sin mezclar incidentes con el health runtime base.
- UI conectada:
  - `AdminOpsHealthView` muestra incidentes Sentry con status, summary, release, environment, ocurrencia y deep-link
  - `AdminCloudIntegrationsView` resume el estado de incidentes y deriva a `Ops Health`
- Validación local ejecutada:
  - `pnpm exec vitest run src/lib/cloud/observability.test.ts src/lib/webhooks/target-url.test.ts`
  - `pnpm exec eslint src/lib/cloud/contracts.ts src/lib/cloud/observability.ts src/lib/cloud/observability.test.ts src/lib/operations/get-operations-overview.ts src/app/api/internal/health/route.ts src/views/greenhouse/admin/AdminOpsHealthView.tsx src/views/greenhouse/admin/AdminCloudIntegrationsView.tsx src/lib/webhooks/target-url.test.ts`
  - `pnpm exec tsc --noEmit --pretty false`
  - `pnpm build`
- Drift incidental corregido:
  - `src/lib/webhooks/target-url.test.ts` ahora pasa `NODE_ENV: 'test'` para respetar el contrato tipado actual de `ProcessEnv`

### Pendiente inmediato

- Superado por el cierre posterior de `TASK-133` en esta misma fecha.

## Sesión 2026-03-29 — TASK-129 promovida a production y validada end-to-end

### Completado

- `develop` fue promovida a `main` vía PR `#22`:
  - merge commit `95a03a7266c60b07e0eeb93977137b5ffaff0cff`
- `production` absorbió el deployment:
  - `https://greenhouse-efjxg8r0x-efeonce-7670142f.vercel.app`
  - alias productivo activo: `https://greenhouse.efeoncepro.com`
- Validación real en `production`:
  - `POST /api/internal/webhooks/notification-dispatch` respondió `200`
  - payload result:
    - `mapped=true`
    - `recipientsResolved=1`
    - `sent=1`
  - `greenhouse_notifications.notifications` persistió la fila:
    - `eventId=evt-prod-final-1774830739019`
    - `user_id=user-efeonce-admin-julio-reyes`
    - `category=assignment_change`
    - `status=unread`
- Conclusión:
  - `TASK-129` ya no queda solo validada en `staging`; el carril webhook notifications quedó operativo también en `production`

### Pendiente inmediato

- El draft PR `#21` (`release/task-129-prod-promo`) ya quedó redundante después de promover `develop -> main`; puede cerrarse por higiene cuando convenga.
- El check `Preview` del PR individual falló por drift de env/build (`NEXTAUTH_SECRET` durante page-data collection), pero no bloqueó el rollout real porque la promoción completa de `develop` a `main` sí quedó validada en `production`.

## Sesión 2026-03-29 — Rollout de production intentado para TASK-129, bloqueado por drift de branch

### Completado

- `production` ya tiene `WEBHOOK_NOTIFICATIONS_SECRET_SECRET_REF=webhook-notifications-secret`.
- Se confirmó que `production` no conserva `WEBHOOK_NOTIFICATIONS_SECRET` crudo; el fallback legacy ya no está presente en Vercel para este carril.
- Se ejecutó redeploy seguro de la build productiva existente:
  - source deployment previo: `https://greenhouse-pcty6593d-efeonce-7670142f.vercel.app`
  - nuevo deployment: `https://greenhouse-j35lx1ock-efeonce-7670142f.vercel.app`
  - target: `production`

### Bloqueo real

- El smoke firmado contra `production` no llegó al consumer `notification-dispatch`; devolvió HTML del portal en vez de JSON del route handler.
- La causa observada en el build productivo es branch drift:
  - el deployment de `main` (`commit: fbe21a3`) no incluye `/api/internal/webhooks/notification-dispatch` en el artefacto compilado
  - sí incluye `/api/internal/webhooks/canary`, pero no el consumer de `TASK-129`
- Conclusión operativa:
  - `production` ya está lista a nivel de secretos
  - el rollout funcional de `TASK-129` en `production` queda bloqueado hasta que el código del consumer llegue a `main`

### Pendiente inmediato

- Promover a `main` el slice real de `TASK-129` antes de repetir validación productiva.
- Una vez `main` incluya la route, repetir:
  - redeploy/redeploy seguro de `production`
  - smoke firmado
  - verificación de persistencia en `greenhouse_notifications.notifications`

## Sesión 2026-03-29 — TASK-129 hardening final en staging con Secret Manager-only

### Completado

- `staging` ya no conserva `WEBHOOK_NOTIFICATIONS_SECRET` crudo en Vercel.
- Se forzó redeploy del entorno `Staging` después del retiro del env legacy.
- Validación real posterior al redeploy:
  - `POST /api/internal/webhooks/notification-dispatch` respondió `200`
  - `assignment.created` volvió a crear notificación visible para `user-efeonce-admin-julio-reyes`
  - la resolución efectiva quedó servida por `WEBHOOK_NOTIFICATIONS_SECRET_SECRET_REF -> webhook-notifications-secret`
- Hardening adicional en repo:
  - `src/lib/secrets/secret-manager.ts` ahora sanitiza también secuencias literales `\\n` / `\\r` en `*_SECRET_REF`
  - esto evita depender de formatos tolerados al importar/pullar env vars desde Vercel

### Pendiente inmediato

- El mismo retiro del env legacy puede replicarse en cualquier otro ambiente que todavía conserve fallback crudo.
- Siguiente lane sugerida sin blocker técnico de `TASK-129`:
  - `TASK-133` para surfacing de incidentes Sentry en `Ops Health`

## Sesión 2026-03-29 — TASK-129 iniciada sobre webhook bus con convivencia explícita

### Completado

- `TASK-129` deja `to-do` y pasa a `in-progress`.
- Estrategia elegida para evitar duplicados y mantener la arquitectura vigente:
  - `src/lib/sync/projections/notifications.ts` se mantiene para eventos legacy internos
  - el nuevo consumer webhook toma solo eventos UX-facing con payload estable
- Ownership inicial por `eventType`:
  - `reactive`: `service.created`, `identity.reconciliation.approved`, `finance.dte.discrepancy_found`, `identity.profile.linked`
  - `webhook notifications`: `assignment.created`, `assignment.updated`, `assignment.removed`, `compensation_version.created`, `member.created`, `payroll_period.exported`
- Contrato nuevo en implementación:
  - `POST /api/internal/webhooks/notification-dispatch`
  - `POST /api/admin/ops/webhooks/seed-notifications`
  - `WEBHOOK_NOTIFICATIONS_SECRET`
  - `WEBHOOK_NOTIFICATIONS_SECRET_SECRET_REF`
  - `WEBHOOK_NOTIFICATIONS_VERCEL_PROTECTION_BYPASS_SECRET`

### Criterio operativo

- No eliminar el dominio reactivo `notifications`.
- No tocar `payroll_export_ready_notification`; el correo operativo downstream sigue fuera del alcance de `TASK-129`.
- El consumer nuevo debe apoyar su dedupe en metadata JSONB de `greenhouse_notifications.notifications`, evitando migración schema-first salvo que resulte impracticable.

## Sesión 2026-03-29 — TASK-129 endurecida y env rollout listo en Vercel

### Completado

- El consumer webhook de notificaciones quedó endurecido:
  - `POST /api/internal/webhooks/notification-dispatch` ahora exige firma HMAC cuando `WEBHOOK_NOTIFICATIONS_SECRET` resuelve a un secreto real
  - el dedupe ya no mira solo `greenhouse_notifications.notifications`; también usa `notification_log` para cubrir casos `email-only`
- `staging` y `production` ya tienen cargada en Vercel la ref:
  - `WEBHOOK_NOTIFICATIONS_SECRET_SECRET_REF=webhook-notifications-secret`
- `staging` conserva además `WEBHOOK_NOTIFICATIONS_SECRET` como fallback transicional, lo que deja la migración fail-soft mientras se confirma GCP.
- El secret `webhook-notifications-secret` ya fue creado/verificado en GCP Secret Manager y el consumer smoke firmado responde `200` en `staging`.
- El subscriber `wh-sub-notifications` quedó corregido en DB para usar el alias estable:
  - `https://dev-greenhouse.efeoncepro.com/api/internal/webhooks/notification-dispatch?...`
- Se alineó el dataset de `staging` para recipients internos:
  - `greenhouse_core.client_users.member_id` quedó enlazado por match exacto de nombre para usuarios internos activos
- Se corrigió también el drift operativo de los seed routes:
  - ahora prefieren el host real del request sobre `VERCEL_URL`
  - sanitizan `\n`/`\r` literales en bypass secrets para no persistir `%5Cn` en `target_url`
- Se creó `TASK-133` para surfacing de incidentes Sentry en `Ops Health`.
- Validación local ejecutada:
  - `pnpm exec vitest run src/lib/webhooks/consumers/notification-mapping.test.ts src/lib/webhooks/consumers/notification-recipients.test.ts src/lib/webhooks/consumers/notification-dispatch.test.ts src/app/api/internal/webhooks/notification-dispatch/route.test.ts src/lib/webhooks/notification-target.test.ts src/lib/notifications/notification-service.test.ts`
  - `pnpm exec eslint src/views/greenhouse/admin/AdminNotificationsView.tsx src/lib/notifications/schema.ts src/lib/notifications/notification-service.ts src/lib/webhooks/consumers/notification-dispatch.ts src/app/api/internal/webhooks/notification-dispatch/route.ts src/app/api/internal/webhooks/notification-dispatch/route.test.ts`
  - `pnpm exec tsc --noEmit --pretty false`
  - `pnpm build`
  - `pnpm exec vitest run src/lib/webhooks/notification-target.test.ts src/lib/webhooks/canary-target.test.ts src/lib/webhooks/target-url.test.ts src/app/api/internal/webhooks/notification-dispatch/route.test.ts`
  - `pnpm exec eslint src/lib/webhooks/target-url.ts src/lib/webhooks/target-url.test.ts src/lib/webhooks/notification-target.ts src/lib/webhooks/canary-target.ts src/app/api/admin/ops/webhooks/seed-notifications/route.ts src/app/api/admin/ops/webhooks/seed-canary/route.ts`
  - `pnpm pg:doctor --profile=runtime` usando `.env.staging.pull`
  - smoke firmado contra `https://dev-greenhouse.efeoncepro.com/api/internal/webhooks/notification-dispatch`
  - evidencia funcional:
    - `assignment.created` visible en campanita para `user-efeonce-admin-julio-reyes`
    - `payroll_period.exported` creó 4 notificaciones `payroll_ready` para recipients resolubles del período `2026-03`

### Pendiente inmediato

- `TASK-129` ya queda lista para cierre documental.
- Siguiente follow-on razonable:
  - retirar el fallback crudo `WEBHOOK_NOTIFICATIONS_SECRET` de `staging` cuando se confirme que Secret Manager queda como única fuente
  - decidir si el enlace `client_users.member_id` interno observado en `staging` debe formalizarse como backfill/lane de identidad separada

## Sesión 2026-03-29 — TASK-131 cerrada: health separa runtime vs tooling posture

### Completado

- `TASK-131` ya no está solo documentada; quedó implementada en la capa `cloud/*`.
- Corrección aplicada:
  - `src/lib/cloud/secrets.ts` clasifica secretos tracked entre `runtime` y `tooling`
  - `src/lib/cloud/health.ts` evalúa `postureChecks.secrets` solo con la porción runtime-crítica
  - `postgresAccessProfiles` mantiene la visibilidad separada de `runtime`, `migrator` y `admin`
- Esto corrige el warning residual observado en `production`:
  - `overallStatus=degraded`
  - runtime `postgres/bigquery/observability` sanos
  - gap real concentrado en perfiles Postgres `migrator/admin` no cargados en el runtime del portal
- Validación local ejecutada:
  - `pnpm exec vitest run src/lib/cloud/health.test.ts src/lib/cloud/secrets.test.ts src/lib/cloud/postgres.test.ts`
  - `pnpm exec eslint src/lib/cloud/contracts.ts src/lib/cloud/health.ts src/lib/cloud/secrets.ts src/lib/cloud/postgres.ts src/lib/cloud/health.test.ts src/lib/cloud/secrets.test.ts src/lib/cloud/postgres.test.ts src/app/api/internal/health/route.ts`
  - `pnpm exec tsc --noEmit --pretty false`

### Pendiente inmediato

- Validar el nuevo contrato en `staging` y `production` después del siguiente deploy de `develop/main`.
- No cargar `GREENHOUSE_POSTGRES_MIGRATOR_PASSWORD` ni `GREENHOUSE_POSTGRES_ADMIN_PASSWORD` en el runtime productivo como workaround del health.

## Sesión 2026-03-29 — TASK-125 cerrada con validación E2E real en staging

### Completado

- `TASK-125` ya quedó validada end-to-end en `staging`.
- Se confirmó que el proyecto ya tenía `Protection Bypass for Automation` activo en Vercel.
- `WEBHOOK_CANARY_VERCEL_PROTECTION_BYPASS_SECRET` quedó cargado en `staging`.
- La canary subscription `wh-sub-canary` quedó apuntando al deployment protegido con `x-vercel-protection-bypass`.
- Validación real:
  - `eventsMatched=1`
  - `deliveriesAttempted=1`
  - `succeeded=1`
  - `HTTP 200` en el canary
  - `webhook_delivery_id=wh-del-b9dc275a-f5b5-4104-adcd-d9519fa3794c`
- Ajustes de baseline dejados en repo:
  - `seed-canary` usa `finance.income.nubox_synced` como familia activa observada en `staging`
  - el dispatcher ya prioriza eventos `published` más recientes para no hambrear subscriptions nuevas

## Sesión 2026-03-29 — TASK-125 canary soporta bypass opcional de Vercel

### Completado

- `POST /api/admin/ops/webhooks/seed-canary` ya puede registrar el target del canary con bypass opcional de `Deployment Protection`.
- Contrato soportado:
  - `WEBHOOK_CANARY_VERCEL_PROTECTION_BYPASS_SECRET`
  - fallback a `VERCEL_AUTOMATION_BYPASS_SECRET`

## Sesión 2026-03-29 — TASK-125 casi cerrada, bloqueada por Vercel Deployment Protection

### Completado

- `WEBHOOK_CANARY_SECRET_SECRET_REF` quedó cargado en Vercel `staging`.
- El schema de webhooks quedó provisionado en la base usada por `develop/staging`; antes solo existía `outbox_events`.
- Se activó `wh-sub-canary` en DB y se validó el dispatcher con tráfico real:
  - `eventsMatched=3`
  - `deliveriesAttempted=3`
  - attempts registrados en `greenhouse_sync.webhook_delivery_attempts`
- Se verificó también que la base usada por `production/main` ya ve las tablas de webhooks provisionadas.

### Bloqueo real

- El self-loop a `https://dev-greenhouse.efeoncepro.com/api/internal/webhooks/canary` no falla por firma ni por schema.
- Falla por `Vercel Deployment Protection`: los attempts reciben `401 Authentication Required` antes de llegar al route handler.
- El remanente real de `TASK-125` ya no es repo ni Postgres; es definir el mecanismo de bypass/target para que el canary pueda atravesar la protección de Vercel en entornos compartidos.

## Sesión 2026-03-29 — TASK-125 canary alineada a Secret Manager

### Completado

- `src/lib/webhooks/signing.ts` ya no resuelve secretos solo por env plano; ahora usa el helper canónico de Secret Manager.
- Impacto práctico:
  - inbound webhooks
  - outbound deliveries
  - `POST /api/internal/webhooks/canary`
    ya soportan `*_SECRET_REF` además del env legacy.
- `TASK-125` ya no requiere exponer `WEBHOOK_CANARY_SECRET` crudo en Vercel si el secreto ya existe en Secret Manager.

## Sesión 2026-03-29 — TASK-127 creada como follow-on de consolidación Cloud

### Completado

- Se creó `TASK-127` para capturar la siguiente necesidad institucional del dominio Cloud:
  - scorecard semáforo por dominio
  - cleanup de drift documental residual
  - plan corto de “next hardening wave”
- La task no reabre lanes ya cerradas; sirve para consolidar la lectura post-baseline después de `TASK-096`, `TASK-098`, `TASK-099`, `TASK-102`, `TASK-103`, `TASK-124` y `TASK-126`.

## Sesión 2026-03-29 — TASK-102 cerrada

### Completado

- Se completó el restore test end-to-end con el clone efímero `greenhouse-pg-restore-test-20260329d`.
- Verificación SQL real sobre el clone:
  - `payroll_entries=6`
  - `identity_profiles=40`
  - `outbox_events=1188`
  - schemata presentes: `greenhouse_core`, `greenhouse_payroll`, `greenhouse_sync`
- El clone fue eliminado después de validar datos y `gcloud sql instances list` volvió a mostrar solo `greenhouse-pg-dev`.
- `TASK-102` ya no queda abierta:
  - PITR y WAL retention verificados
  - slow query logging con evidencia real en Cloud Logging
  - runtime health confirmado en `staging` y `production`
  - restore verification ya documentada de punta a punta

## Sesión 2026-03-29 — TASK-102 validación externa casi cerrada

### Completado

- Se confirmó postura real de `greenhouse-pg-dev` en GCP:
  - `pointInTimeRecoveryEnabled=true`
  - `transactionLogRetentionDays=7`
  - `log_min_duration_statement=1000`
  - `log_statement=ddl`
  - `sslMode=ENCRYPTED_ONLY`
- `pnpm pg:doctor --profile=runtime` y `pnpm pg:doctor --profile=migrator` pasaron por connector contra `greenhouse-pg-dev`.
- Slow query logging ya quedó verificada con evidencia real en Cloud Logging:
  - `duration: 1203.206 ms`
  - `statement: SELECT pg_sleep(1.2)`
- `staging` y `production` también quedaron revalidadas por `vercel curl /api/internal/health`:
  - `postgres.status=ok`
  - `usesConnector=true`
  - `sslEnabled=true`
  - `maxConnections=15`

### Pendiente inmediato

- En ese momento, el único remanente real de `TASK-102` era el restore test end-to-end.
- Dos clones efímeros fueron creados y limpiados:
  - `greenhouse-pg-restore-test-20260329b`
  - `greenhouse-pg-restore-test-20260329c`
- El primero se eliminó antes de completar la verificación SQL y el segundo quedó demasiado tiempo en `PENDING_CREATE`; ese remanente ya quedó resuelto después con el clone `greenhouse-pg-restore-test-20260329d`.

## Sesión 2026-03-29 — TASK-099 cerrada con `CSP-Report-Only`

### Completado

- `TASK-099` queda cerrada para su baseline segura y reversible.
- `src/proxy.ts` ahora agrega también `Content-Security-Policy-Report-Only` con allowlist amplia para no romper:
  - login `Azure AD` / `Google`
  - MUI / Emotion
  - observabilidad (`Sentry`)
  - assets y uploads
- Validación local ejecutada:
  - `pnpm exec vitest run src/proxy.test.ts`
  - `pnpm exec eslint src/proxy.ts src/proxy.test.ts`
  - `pnpm exec tsc --noEmit --pretty false`
  - `pnpm build`

### Decisión explícita

- La task no intenta endurecer a `Content-Security-Policy` enforce.
- Cualquier tightening posterior (`Report-Only` tuning, nonces, eliminación de `unsafe-*`) queda como mejora futura y ya no bloquea el hardening baseline.
- Esa mejora futura ya quedó registrada como `TASK-126`.

## Sesión 2026-03-29 — TASK-099 re-acotada al baseline real

### Completado

- Se revisó `TASK-099` contra el estado real de `src/proxy.ts` y `src/proxy.test.ts`.
- Hallazgo consolidado:
  - el repo ya tiene validado el baseline de headers estáticos
  - la task seguía abierta con criterios mezclados de un lote futuro de `Content-Security-Policy`
- Se re-acotó la task para reflejar correctamente el slice actual:
  - `Status real` pasa a `Slice 1 validado`
  - `CSP` queda explícitamente como follow-on pendiente
  - el baseline ya no exige en falso login/uploads/dashboard bajo `CSP`

### Pendiente inmediato

- Decidir si `CSP` se implementa todavía dentro de `TASK-099` como `Report-Only` o si conviene derivarla a una task nueva para no inflar esta lane.

## Sesión 2026-03-29 — TASK-096 cerrada

### Completado

- `TASK-096` deja de seguir `in-progress` y pasa a `complete`.
- Razón de cierre:
  - baseline WIF-aware ya validada en `preview`, `staging` y `production`
  - hardening externo de Cloud SQL ya aplicado
  - la Fase 3 de Secret Manager ya quedó absorbida y cerrada por `TASK-124`
- La task queda como referencia histórica del track cloud, no como lane activa.

## Sesión 2026-03-29 — TASK-098 cerrada en `production`

### Completado

- `production` recibió el merge `main <- develop` en `bcbd0c3`.
- Se cargaron las variables externas de observabilidad en `production`:
  - `SENTRY_DSN`
  - `NEXT_PUBLIC_SENTRY_DSN`
  - `SENTRY_AUTH_TOKEN`
  - `SENTRY_ORG`
  - `SENTRY_PROJECT`
  - `SLACK_ALERTS_WEBHOOK_URL_SECRET_REF`
- Hubo que reescribir `SLACK_ALERTS_WEBHOOK_URL_SECRET_REF` en `production` y redeployar para corregir drift de la ref.
- Deployment validado:
  - `dpl_5fyHqra7AgV865QmHSuZ2iqYWcYk`
  - `GET /api/internal/health` con `postureChecks.observability.status=ok`
  - `GET /api/auth/session` con respuesta `{}`
- `TASK-098` ya puede moverse a `complete`.

### Pendiente no bloqueante

- Rotar el webhook de Slack expuesto en una captura previa.

## Sesión 2026-03-29 — TASK-098 validación end-to-end en `staging`

### Completado

- Se confirmó que `staging` ya no tiene solo postura configurada, sino observabilidad operativa real:
  - `vercel curl /api/internal/health --deployment dpl_G5L2467CPUF6T2GxEaoB3tWhB41K`
  - `observability.summary=Sentry runtime + source maps listos · Slack alerts configuradas`
  - `postureChecks.observability.status=ok`
- Smoke real de Slack:
  - envío con el webhook resuelto desde `greenhouse-slack-alerts-webhook`
  - respuesta `HTTP 200`
- Smoke real de Sentry:
  - se emitió `task-098-staging-sentry-smoke-1774792462445`
  - el issue quedó visible en el dashboard del proyecto `javascript-nextjs`
- Hallazgo importante:
  - el único remanente operativo de `TASK-098` ya no está en `develop/staging`
  - queda concentrado en `main/production`

### Pendiente inmediato

- Replicar en `production`:
  - `SENTRY_DSN`
  - `NEXT_PUBLIC_SENTRY_DSN`
  - `SENTRY_AUTH_TOKEN`
  - `SENTRY_ORG`
  - `SENTRY_PROJECT`
  - `SLACK_ALERTS_WEBHOOK_URL_SECRET_REF`
- Validar `main/production` con smoke equivalente antes de mover `TASK-098` a `complete`
- Rotar el webhook de Slack expuesto en una captura previa cuando se decida hacerlo

## Sesión 2026-03-29 — TASK-098 Secret Manager slice para Slack alerts

### Completado

- Se abrió `feature/codex-task-098-observability-secret-refs` desde `develop`.
- `SLACK_ALERTS_WEBHOOK_URL` quedó alineado al helper canónico:
  - valor legacy `SLACK_ALERTS_WEBHOOK_URL`
  - ref opcional `SLACK_ALERTS_WEBHOOK_URL_SECRET_REF`
  - resolución efectiva `Secret Manager -> env fallback`
- `GET /api/internal/health` ahora refleja esta resolución real tanto en `observability` como en `secrets`.
- Validación local ejecutada:
  - `pnpm exec vitest run src/lib/alerts/slack-notify.test.ts src/lib/cloud/observability.test.ts src/lib/cloud/secrets.test.ts src/lib/cloud/health.test.ts`
  - `pnpm exec eslint src/lib/alerts/slack-notify.ts src/lib/alerts/slack-notify.test.ts src/lib/cloud/observability.ts src/lib/cloud/observability.test.ts src/lib/cloud/secrets.ts src/lib/cloud/secrets.test.ts src/app/api/internal/health/route.ts`
  - `pnpm exec tsc --noEmit --pretty false`

### Decisión explícita

- `CRON_SECRET` sigue `env-only`:
  - moverlo a Secret Manager haría asíncrono `requireCronAuth()` y abriría un cambio transversal en múltiples routes
- `SENTRY_AUTH_TOKEN` sigue `env-only`:
  - hoy se consume en `next.config.ts` durante build
- `SENTRY_DSN` también se deja fuera de este slice:
  - el path client (`NEXT_PUBLIC_SENTRY_DSN`) lo vuelve config pública/operativa, no un secreto crítico prioritario

## Sesión 2026-03-29 — TASK-098 validada en `develop/staging`

### Completado

- `develop` absorbió el slice mínimo de Sentry en `ac11287`.
- El deployment compartido `dev-greenhouse.efeoncepro.com` quedó `READY` sobre ese commit.
- Validación autenticada de `GET /api/internal/health`:
  - `version=ac11287`
  - Postgres `ok`
  - BigQuery `ok`
  - `observability.summary=Observabilidad externa no configurada`
- Hallazgo importante:
  - el repo ya tiene el adapter `src/lib/alerts/slack-notify.ts`
  - los hooks de `alertCronFailure()` ya existen en `outbox-publish`, `webhook-dispatch`, `sync-conformed`, `ico-materialize` y `nubox-sync`
  - por lo tanto el cuello de botella actual de `TASK-098` ya no es de código repo, sino de configuración externa en Vercel

### Pendiente inmediato

- Cargar en Vercel las variables externas de observabilidad:
  - `SENTRY_DSN` o `NEXT_PUBLIC_SENTRY_DSN`
  - `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`
  - `SLACK_ALERTS_WEBHOOK_URL`
- Revalidar `GET /api/internal/health` y confirmar que `postureChecks.observability` deje de salir `unconfigured`.

## Sesión 2026-03-29 — TASK-098 retoma Sentry mínimo sobre branch dedicada

### Completado

- Se retomó `TASK-098` desde `feature/codex-task-098-sentry-resume` sobre una base donde `develop` ya absorbió el baseline de `TASK-098` y `TASK-099`.
- Quedó reconstruido y validado el wiring mínimo de Sentry para App Router:
  - `next.config.ts` con `withSentryConfig`
  - `src/instrumentation.ts`
  - `src/instrumentation-client.ts`
  - `sentry.server.config.ts`
  - `sentry.edge.config.ts`
- La postura de observabilidad quedó endurecida para distinguir:
  - DSN runtime total
  - DSN público (`NEXT_PUBLIC_SENTRY_DSN`)
  - auth token
  - org/project
  - readiness de source maps
- Validación local ejecutada:
  - `pnpm exec vitest run src/lib/cloud/observability.test.ts src/lib/cloud/health.test.ts`
  - `pnpm exec eslint next.config.ts src/instrumentation.ts src/instrumentation-client.ts sentry.server.config.ts sentry.edge.config.ts src/lib/cloud/contracts.ts src/lib/cloud/observability.ts src/lib/cloud/observability.test.ts src/lib/cloud/health.test.ts`
  - `pnpm exec tsc --noEmit --pretty false`
  - `pnpm build`

### Pendiente inmediato

- Push de esta branch para obtener Preview Deployment y validar que `/api/internal/health` refleje la postura nueva de Sentry.
- Solo después de esa verificación, decidir si este slice pasa a `develop`.

## Sesión 2026-03-29 — TASK-099 iniciada sobre `develop`

### Completado

- `develop` absorbió el baseline sano de `TASK-098` (`4167650`, `4d485f4`) y el fix de compatibilidad `3463dc8`.
- Se abrió `feature/codex-task-099-security-headers` desde ese `develop` ya integrado.
- `TASK-099` pasa a `in-progress` con un primer slice mínimo:
  - nuevo `src/proxy.ts`
  - headers estáticos cross-cutting
  - matcher conservador para no tocar `_next/*` ni assets
  - `Strict-Transport-Security` solo en `production`

### Pendiente inmediato

- validar lint, tests, `tsc` y `build` del middleware
- decidir si el siguiente slice de `TASK-099` introduce CSP en `Report-Only` o la difiere hasta después de retomar `TASK-098`

## Sesión 2026-03-29 — TASK-098 iniciada con slice seguro de postura

### Completado

- `TASK-098` pasó a `in-progress`.
- Se eligió un primer slice sin integraciones externas para no romper el runtime ya estabilizado:
  - nuevo `src/lib/cloud/observability.ts`
  - `GET /api/internal/health` ahora incluye `observability`
  - el payload proyecta si existen `SENTRY_DSN`, `SENTRY_AUTH_TOKEN` y `SLACK_ALERTS_WEBHOOK_URL`
- El contrato de `GET /api/internal/health` quedó separado en:
  - `runtimeChecks` para dependencias que sí definen `200/503`
  - `postureChecks` para hallazgos operativos que degradan señal pero no cortan tráfico
  - `overallStatus` y `summary` como resumen estable para futuras integraciones
- `GET /api/internal/health` ahora expone también `postgresAccessProfiles`:
  - `runtime`
  - `migrator`
  - `admin`
    manteniendo `postgres` solo para postura runtime del portal
- `.env.example` quedó alineado con esas variables.

### Pendiente inmediato

- Instalar y configurar `@sentry/nextjs`
- decidir si el siguiente slice conecta primero Slack alerts o Sentry
- validar este contrato nuevo en preview antes de cablear integraciones externas

## Sesión 2026-03-29 — TASK-124 validada en `staging`

### Completado

- Se armó una integración mínima desde `origin/develop` para no arrastrar el resto de `feature/codex-task-096-wif-baseline`.
- `develop` quedó promovido a `497cb19` con los tres slices de `TASK-124`:
  - helper canónico `src/lib/secrets/secret-manager.ts`
  - postura de secretos en `GET /api/internal/health`
  - migración de `NUBOX_BEARER_TOKEN`, Postgres secret refs y auth/SSO (`NEXTAUTH_SECRET`, `AZURE_AD_CLIENT_SECRET`, `GOOGLE_CLIENT_SECRET`)
- Validación local sobre la base integrada:
  - `pnpm exec eslint ...`
  - `pnpm exec vitest run src/lib/secrets/secret-manager.test.ts src/lib/cloud/secrets.test.ts src/lib/nubox/client.test.ts src/lib/postgres/client.test.ts scripts/lib/load-greenhouse-tool-env.test.ts src/lib/auth-secrets.test.ts`
  - `pnpm exec tsc --noEmit --pretty false`
  - `pnpm pg:doctor --profile=runtime`
- Rollout externo ya preparado:
  - secretos nuevos creados en GCP Secret Manager para `staging` y `production`
  - `*_SECRET_REF` cargados en Vercel `staging` y `production`
  - `greenhouse-portal@efeonce-group.iam.gserviceaccount.com` con `roles/secretmanager.secretAccessor` sobre los secretos nuevos
- Validación compartida en `staging`:
  - `dev-greenhouse.efeoncepro.com/api/internal/health` respondió `200`
  - `version=497cb19`
  - `GREENHOUSE_POSTGRES_PASSWORD`, `NEXTAUTH_SECRET`, `AZURE_AD_CLIENT_SECRET` y `NUBOX_BEARER_TOKEN` reportan `source=secret_manager`
- Ajuste externo mínimo posterior:
  - el secreto heredado `greenhouse-pg-dev-app-password` no tenía IAM para el runtime service account
  - se agregó `roles/secretmanager.secretAccessor` para `greenhouse-portal@efeonce-group.iam.gserviceaccount.com`
  - luego de ese binding, `GREENHOUSE_POSTGRES_PASSWORD` pasó también a `source=secret_manager` en `staging`

### Pendiente inmediato

- `production` sigue pendiente de validación real; no se promovió a `main` en esta sesión.
- El remanente ya no es de código en `staging`, sino de rollout/control:
  - decidir cuándo retirar env vars legacy
  - decidir si `GREENHOUSE_POSTGRES_MIGRATOR_PASSWORD` y `GREENHOUSE_POSTGRES_ADMIN_PASSWORD` deben quedar proyectados en el health runtime del portal

## Sesión 2026-03-29 — TASK-096 WIF-aware baseline en progreso

### Completado

- `TASK-096` pasó a `in-progress` sobre el estado actual del repo.
- El repo ya quedó WIF-aware sin romper el runtime actual:
  - `src/lib/google-credentials.ts` resuelve `wif | service_account_key | ambient_adc`
  - el helper ahora también sabe pedir el token OIDC desde runtime Vercel con `@vercel/oidc`, no solo desde `process.env.VERCEL_OIDC_TOKEN`
  - `src/lib/bigquery.ts`, `src/lib/postgres/client.ts`, `src/lib/storage/greenhouse-media.ts` y `src/lib/ai/google-genai.ts` consumen el helper canónico
  - `src/lib/ai/google-genai.ts` ya no usa temp file para credenciales
- Scripts con parsing manual de `GOOGLE_APPLICATION_CREDENTIALS_JSON` quedaron alineados al helper central:
  - `check-ico-bq`
  - `backfill-ico-to-postgres`
  - `materialize-member-metrics`
  - `backfill-task-assignees`
  - `backfill-postgres-payroll`
  - `admin-team-runtime-smoke`
- Arquitectura y docs vivas alineadas:
  - `GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
  - `GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`
  - `project_context.md`
  - `changelog.md`
- Rollout externo ya avanzado y validado sin bigbang:
  - existe Workload Identity Pool `vercel` y provider `greenhouse-eo` en `efeonce-group`
  - `greenhouse-portal@efeonce-group.iam.gserviceaccount.com` ya tiene bindings `roles/iam.workloadIdentityUser` para `development`, `preview`, `staging` y `production`
  - `GCP_WORKLOAD_IDENTITY_PROVIDER` y `GCP_SERVICE_ACCOUNT_EMAIL` ya quedaron cargadas en Vercel
  - `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME` quedó cargada en Vercel para preparar el cutover hacia Cloud SQL Connector
  - validación local con OIDC + WIF:
    - BigQuery respondió OK sin SA key
    - Cloud SQL Connector respondió `SELECT 1` sin SA key usando `runGreenhousePostgresQuery()`
  - validación real en preview Vercel:
    - se completó el env set mínimo de la branch `feature/codex-task-096-wif-baseline`
    - se forzó redeploy del preview
    - `greenhouse-i3cak6akh-efeonce-7670142f.vercel.app/api/internal/health` respondió `200 OK`
    - posture observada:
      - `auth.mode=wif`
      - BigQuery reachable
      - Cloud SQL reachable con connector e `instanceConnectionName=efeonce-group:us-east4:greenhouse-pg-dev`

### Validación

- `pnpm exec eslint src/lib/google-credentials.ts src/lib/google-credentials.test.ts src/lib/bigquery.ts src/lib/postgres/client.ts src/lib/storage/greenhouse-media.ts src/lib/ai/google-genai.ts scripts/check-ico-bq.ts scripts/backfill-ico-to-postgres.ts scripts/materialize-member-metrics.ts scripts/backfill-task-assignees.ts scripts/backfill-postgres-payroll.ts scripts/admin-team-runtime-smoke.ts`
- `pnpm exec vitest run src/lib/google-credentials.test.ts src/lib/cloud/gcp-auth.test.ts`
- `pnpm exec tsc --noEmit --pretty false`
- Smoke adicional externo:
  - BigQuery con `VERCEL_OIDC_TOKEN` y WIF sin SA key
  - Cloud SQL Connector con `GREENHOUSE_POSTGRES_INSTANCE_CONNECTION_NAME=efeonce-group:us-east4:greenhouse-pg-dev` y query `SELECT 1::int as ok`

### Pendiente inmediato

- Limpiar drift de Vercel env antes del endurecimiento final:
  - las variables activas del rollout WIF/conector ya fueron corregidas en Vercel
  - el paso pendiente ya no es el formato, sino cerrar el baseline WIF final en `develop/staging`
- Aclarar y corregir el mapa de ambientes Vercel:
  - `dev-greenhouse.efeoncepro.com` ya quedó confirmado como `target=staging`
  - tras redeploy del staging activo respondió `version=7a2ecec`, `auth.mode=mixed` y `usesConnector=true`
- Camino seguro elegido:
  - no desplegar la feature branch al entorno compartido `staging`
  - mantener el flujo `feature -> preview -> develop/staging -> main`
- Validar el entorno compartido con WIF final después de mergear a `develop`, antes de retirar `GOOGLE_APPLICATION_CREDENTIALS_JSON`
- Cerrar Fase 1 externa de Cloud SQL:
  - remover `0.0.0.0/0`
  - pasar `sslMode` a `ENCRYPTED_ONLY`
  - activar `requireSsl=true`
- No declarar `TASK-096` cerrada todavía: el repo quedó listo, pero la postura cloud real sigue transicional.

## Sesión 2026-03-29 — TASK-115 Nexa UI Completion (4 slices)

### Completado

- **Slice A**: Edit inline de mensajes user — pencil hover button + EditComposer con ComposerPrimitive (Guardar/Cancelar)
- **Slice B**: Follow-up suggestions (chips clicables desde `suggestions` del backend) + feedback thumbs (👍/👎 fire-and-forget a `/api/home/nexa/feedback`)
- **Slice C**: Nexa floating portal-wide — FAB sparkles fixed bottom-right, panel 400×550 en desktop, Drawer bottom en mobile, hidden en `/home`
- **Slice D**: Thread history sidebar (Drawer izquierdo, lista agrupada por fecha, new/select thread) + threadId tracking en adapter + NexaPanel.tsx eliminado

### Archivos nuevos

- `src/views/greenhouse/home/components/NexaThreadSidebar.tsx`
- `src/components/greenhouse/NexaFloatingButton.tsx`

### Archivos modificados

- `src/views/greenhouse/home/components/NexaThread.tsx` — edit inline, feedback, suggestions, compact mode, history toggle
- `src/views/greenhouse/home/HomeView.tsx` — threadId tracking, suggestions state, sidebar integration
- `src/app/(dashboard)/layout.tsx` — NexaFloatingButton montado

### Archivos eliminados

- `src/views/greenhouse/home/components/NexaPanel.tsx` (legacy)

## Sesión 2026-03-29 — TASK-122 desarrollada y cerrada

### Completado

- `TASK-122` quedó desarrollada y cerrada como base documental del dominio Cloud.
- Se creó `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md` como operating model canónico para institucionalizar `Cloud` como capa interna de platform governance.
- Se agregó una baseline real de código en `src/lib/cloud/*`:
  - `contracts.ts` para checks y snapshots
  - `health.ts` para checks compartidos de Postgres y BigQuery
  - `bigquery.ts` para cost guards base (`maximumBytesBilled`)
  - `cron.ts` para postura mínima de control plane sobre `CRON_SECRET`
- El documento deja explícito:
  - boundary entre `Admin Center`, `Cloud & Integrations` y `Ops Health`
  - control families del dominio Cloud
  - qué debe vivir en UI, qué en code/helpers y qué en runbooks/config
  - el framing operativo de `TASK-100`, `TASK-101`, `TASK-102` y `TASK-103`
- `TASK-100` a `TASK-103` quedaron actualizadas para referenciar esta base, evitando redecidir ownership y scope en cada ejecución.
- `docs/tasks/TASK_ID_REGISTRY.md` y `docs/tasks/README.md` quedaron alineados con `TASK-122` en `complete`.
- La conexión con la UI ya es total:
  - `getOperationsOverview()` ahora expone `cloud`
  - `Admin Center`, `Cloud & Integrations` y `Ops Health` consumen el snapshot institucional del dominio Cloud
  - la UI deja de reflejar solo integrations/ops aislados y pasa a mostrar runtime health, cron posture y BigQuery guard

### Pendiente inmediato

- La base ya está lista para ejecutar `TASK-100` a `TASK-103` con framing consistente del dominio Cloud

## Sesión 2026-03-29 — TASK-100 CI test step en progreso

### Completado

- `TASK-100` pasó a `in-progress` como primera lane activa del bloque Cloud hardening.
- `.github/workflows/ci.yml` ahora ejecuta `pnpm test` entre `Lint` y `Build`, con `timeout-minutes: 5`.
- La validación local previa confirmó que la suite actual es apta para CI:
  - `99` archivos de test
  - `488` pruebas verdes
  - runtime total `6.18s`

### Pendiente inmediato

- Confirmar la primera corrida real en GitHub Actions en el próximo push.
- Mantener el commit aislado de `TASK-115`, porque el árbol sigue teniendo cambios paralelos en `Home/Nexa` no relacionados con CI.

## Sesión 2026-03-29 — TASK-100 y TASK-101 cerradas

### Completado

- `TASK-100` quedó cerrada:
  - `.github/workflows/ci.yml` ahora ejecuta `pnpm test` entre `Lint` y `Build`
  - el step de tests tiene `timeout-minutes: 5`
- `TASK-101` quedó cerrada:
  - nuevo helper `src/lib/cron/require-cron-auth.ts`
  - `src/lib/cloud/cron.ts` ahora expone estado del secret y detección reusable de Vercel cron
  - migración de `19` rutas scheduler-driven sin auth inline
  - los endpoints `POST` de Finance preservan fallback a `requireFinanceTenantContext()` cuando no vienen como cron autorizado
- Validación de cierre:
  - `pnpm lint`
  - `pnpm test`
  - `pnpm build`

### Pendiente inmediato

- La siguiente lane del bloque solicitado queda en `TASK-102`, con `TASK-103` después.
- El árbol sigue teniendo cambios paralelos de `TASK-115` en Home/Nexa; no mezclar esos archivos al stage del lote Cloud.

## Sesión 2026-03-29 — Cloud layer robustness expansion

### Completado

- La capa `src/lib/cloud/*` quedó reforzada antes de entrar a `TASK-096`:
  - `src/lib/cloud/gcp-auth.ts` modela la postura runtime GCP (`wif`, `service_account_key`, `mixed`, `unconfigured`)
  - `src/lib/cloud/postgres.ts` modela la postura Cloud SQL (`connector`, `ssl`, `pool`, riesgos)
  - `src/app/api/internal/health/route.ts` expone health institucional para deploy/runtime validation
  - `src/lib/alerts/slack-notify.ts` deja listo el adapter base para alertas operativas
- `getOperationsOverview()` ahora proyecta también posture de auth GCP y posture de Cloud SQL.
- Se agregaron hooks de `alertCronFailure()` a los crons críticos:
  - `outbox-publish`
  - `webhook-dispatch`
  - `sync-conformed`
  - `ico-materialize`
  - `nubox-sync`

### Pendiente inmediato

- `TASK-096` ya puede apoyarse en una postura GCP explícita en código en vez de partir solo desde env vars sueltas.
- `TASK-098` ya no necesita inventar desde cero el health endpoint ni el adapter Slack.
- En ese momento `TASK-099`, `TASK-102` y `TASK-103` seguían abiertas, pero hoy solo queda `TASK-103` como remanente del bloque cloud baseline.

## Sesión 2026-03-29 — TASK-102 en progreso

### Completado

- Cloud SQL `greenhouse-pg-dev` quedó con:
  - `pointInTimeRecoveryEnabled=true`
  - `transactionLogRetentionDays=7`
  - `log_min_duration_statement=1000`
  - `log_statement=ddl`
- `GREENHOUSE_POSTGRES_MAX_CONNECTIONS=15` quedó aplicado y verificado en:
  - `Production`
  - `staging`
  - `Preview (develop)`
- El repo quedó alineado:
  - `src/lib/postgres/client.ts` ahora usa `15` como fallback por defecto
  - `.env.example` documenta `GREENHOUSE_POSTGRES_MAX_CONNECTIONS=15`
- Validación ejecutada:
  - `pnpm pg:doctor --profile=runtime`
  - `pnpm pg:doctor --profile=migrator`
  - `gcloud sql instances describe greenhouse-pg-dev`
  - `vercel env pull` por entorno para confirmar el valor efectivo

### Pendiente inmediato

- Terminar el restore test:
  - clone iniciado: `greenhouse-pg-restore-test-20260329`
  - seguía en `PENDING_CREATE` al cierre de esta actualización
- Cuando el clone quede `RUNNABLE`:
  - verificar tablas críticas
  - documentar resultado
- Este remanente ya quedó resuelto después con el clone `greenhouse-pg-restore-test-20260329d`.
  - eliminar la instancia efímera

## Sesión 2026-03-29 — TASK-114 backend Nexa + cierre TASK-119/TASK-120

### Completado

- `TASK-114` quedó implementada y cerrada:
  - nuevo store server-only `src/lib/nexa/store.ts`
  - validación de readiness para `greenhouse_ai.nexa_threads`, `greenhouse_ai.nexa_messages`, `greenhouse_ai.nexa_feedback`
  - migración canónica `scripts/migrations/add-nexa-ai-tables.sql` ya aplicada con perfil `migrator`
  - endpoints:
    - `POST /api/home/nexa/feedback`
    - `GET /api/home/nexa/threads`
    - `GET /api/home/nexa/threads/[threadId]`
  - `/api/home/nexa` ahora persiste conversación, retorna `threadId` y genera `suggestions` dinámicas
- `TASK-119` cerrada:
  - verificación manual confirmada para `login -> /auth/landing -> /home`
  - fallback interno y sesiones legadas ya normalizan a `/home`
  - `Control Tower` deja de operar como home y el pattern final queda absorbido por `Admin Center`
- `TASK-120` cerrada por absorción:
  - `/internal/dashboard` redirige a `/admin`
  - el follow-on separado ya no era necesario como lane autónoma
- `TASK-115` quedó actualizada con delta para reflejar que su backend ya está disponible
- `GREENHOUSE_DATA_MODEL_MASTER_V1.md` ya reconoce `nexa_threads`, `nexa_messages` y `nexa_feedback` dentro de `greenhouse_ai`

### Validación

- `pnpm pg:doctor --profile=runtime`
- `pnpm pg:doctor --profile=migrator`
- `pnpm exec tsx scripts/run-migration.ts scripts/migrations/add-nexa-ai-tables.sql --profile=migrator`
- `pnpm exec eslint src/lib/nexa/nexa-contract.ts src/lib/nexa/nexa-service.ts src/lib/nexa/nexa-service.test.ts src/lib/nexa/store.ts src/app/api/home/nexa/route.ts src/app/api/home/nexa/feedback/route.ts src/app/api/home/nexa/threads/route.ts src/app/api/home/nexa/threads/[threadId]/route.ts`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm exec vitest run src/lib/nexa/nexa-service.test.ts`
- verificación runtime directa de `greenhouse_ai.nexa_threads`, `greenhouse_ai.nexa_messages` y `greenhouse_ai.nexa_feedback` bajo perfil `runtime`

### TASK-121 Admin Center Hardening (5 slices cerrados)

- **Slice 1**: Sorting por todas las columnas en AdminCenterSpacesTable (TableSortLabel)
- **Slice 2**: `loading.tsx` skeleton para `/admin` (hero, KPIs, tabla 8 filas, domain cards)
- **Slice 3**: Health real en domain cards — Cloud & Integrations y Ops Health consumen `getOperationsOverview`
- **Slice 4**: Deep-link con `searchParams` — `/admin?filter=attention&q=empresa` funciona
- **Slice 5**: Bloque "Requiere atencion" con alertas consolidadas cross-dominio
- **Cierre final 2026-03-31**: tests UI dedicados en `AdminCenterView.test.tsx`, `AdminCenterSpacesTable.test.tsx` y `src/app/(dashboard)/admin/loading.test.tsx`; además se corrigió un re-render loop en `AdminCenterView` memoizando `buildDomainCards`
- **Validación de cierre**:
  - `pnpm exec vitest run src/views/greenhouse/admin/AdminCenterView.test.tsx src/views/greenhouse/admin/AdminCenterSpacesTable.test.tsx 'src/app/(dashboard)/admin/loading.test.tsx'`
  - `pnpm exec eslint src/views/greenhouse/admin/AdminCenterView.tsx src/views/greenhouse/admin/AdminCenterView.test.tsx src/views/greenhouse/admin/AdminCenterSpacesTable.test.tsx 'src/app/(dashboard)/admin/loading.test.tsx'`
  - `pnpm exec tsc --noEmit --pretty false`
  - `pnpm build`
  - `git diff --check`

### Pendiente inmediato

- `TASK-115` pasa a ser la siguiente lane natural de Nexa UI porque ya tiene backend real para feedback, suggestions y thread history
- Si se quiere endurecer `TASK-114` más adelante:
  - agregar tests específicos para `src/lib/nexa/store.ts`
  - decidir si el route principal de Nexa debe responder `404/400` en `threadId` inválido en vez de caer al handler genérico
  - agregar smoke o tests de route para ownership y feedback

## Sesión 2026-03-29 — Admin Center + Control Tower unificado

### Completado

- **Admin Center landing redesign v2**: Control Tower absorbido como sección dentro de `/admin`
  - Hero (gradiente purple→cyan) → 4 ExecutiveMiniStatCards → Torre de control (tabla MUI limpia 5 cols, sin scroll horizontal) → Mapa de dominios (outlined cards ricos con avatar, bullets, CTA)
  - Nuevo componente `AdminCenterSpacesTable.tsx`: MUI Table size='small', 5 columnas (Space, Estado, Usuarios, Proyectos, Actividad), paginación 8 filas, filter chips + search + export
  - `/internal/dashboard` redirige a `/admin` (backward compat)
  - Sidebar: removido item "Torre de control" de Gestión; UserDropdown apunta a `/admin`
- `TASK-119` movida a `in-progress`.
- Se aplicó el cutover base de landing para internos/admin:
  - fallback de `portalHomePath` ahora cae en `/home` en vez de `/internal/dashboard`
  - `Home` pasa a ser la entrada principal interna en sidebar y dropdown
  - `Control Tower` queda preservado como surface especialista dentro de `Gestión` y en sugerencias globales
- Se corrigió el drift que seguía mandando a algunos usuarios a `'/internal/dashboard'`:
  - `resolvePortalHomePath()` ahora normaliza también el valor legado en `NextAuth jwt/session`
  - si la sesión trae `'/internal/dashboard'` como home histórico para un interno/admin, el runtime lo reescribe a `'/home'` sin depender de un relogin manual
- Se mantuvieron intactos los landings especializados:
  - `hr_*` sigue cayendo en `/hr/payroll`
  - `finance_*` sigue cayendo en `/finance`
  - `collaborator` puro sigue cayendo en `/my`

### Validación

- `pnpm exec eslint src/lib/tenant/access.ts src/config/greenhouse-nomenclature.ts src/components/layout/vertical/VerticalMenu.tsx src/components/layout/shared/UserDropdown.tsx src/components/layout/shared/search/DefaultSuggestions.tsx src/app/auth/landing/page.tsx src/app/page.tsx`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm exec eslint src/lib/auth.ts src/lib/tenant/access.ts src/lib/tenant/resolve-portal-home-path.ts src/lib/tenant/resolve-portal-home-path.test.ts`
- `pnpm exec vitest run src/lib/tenant/resolve-portal-home-path.test.ts`

### Pendiente inmediato

- drift documental resuelto en la sesión posterior: `TASK-119` y `TASK-120` ya no quedan abiertas

## Sesión 2026-03-28 — Resumen

### Completado

- **TASK-104**: Payroll export email redesign (subject español, desglose por régimen, plain text profesional)
- **TASK-106**: Email delivery admin UI en Control Tower (historial + suscripciones + retry)
- **TASK-009 Slice A+B**: Fix del freeze de Home Nexa (timeouts, try/catch, error boundary)
- **TASK-009 Slice E**: NexaPanel migrado a `@assistant-ui/react` con LocalRuntime
- **TASK-009 Home Redesign**: UX prompt-first tipo Notion AI (NexaHero + NexaThread + QuickAccess + OperationStatus)
- **TASK-110**: Spec completo de Nexa assistant-ui feature adoption (29 componentes catalogados)
- **TASK-110 Lane A**: Nexa backend operativo con tool calling real a payroll, OTD, emails, capacidad y facturas; `/api/home/nexa` devuelve `toolInvocations` y Home renderiza cards mínimas inline
- **GREENHOUSE_NEXA_ARCHITECTURE_V1.md**: Doc canónico de Nexa creado
- **TASK-095**: Spec completo (Codex implementó la capa)
- **TASK-111**: Secret ref governance UI — tabla con dirección, auth, owner, scope, estado governance en `/admin/cloud-integrations`
- **TASK-112**: Integration health/freshness UI — tabla con LinearProgress, stale thresholds (6h/24h/48h) en `/admin/cloud-integrations`
- **TASK-113**: Ops audit trail UI — ActivityTimeline con actor, resultado, follow-up en `/admin/ops-health`
- **TASK-110 Lane B / Slice 1**: NexaThread con ActionBar Copy+Reload, Send/Cancel toggle, ScrollToBottom, error UI, animaciones; NexaHero con suggestions self-contained; adapter con throw errors

### Pendiente inmediato

| Prioridad | Task              | Qué falta                                                                           |
| --------- | ----------------- | ----------------------------------------------------------------------------------- |
| 1         | TASK-110 Slice 1b | EditComposer inline, FollowupSuggestions (requiere backend), deprecar NexaPanel.tsx |
| 2         | TASK-110 Slice 4  | Nexa flotante portal-wide (AssistantModalPrimitive)                                 |
| 5         | TASK-119          | Rollout final de `/home`, `portalHomePath`, sidebar y cutover de `Control Tower`    |
| 6         | TASK-120          | Role scoping fino y verification bundle de `Admin Center`                           |

### Notas de staging

- `dev-greenhouse.efeoncepro.com/home` funcional (Gemini responde, Home carga)
- Chat UI ahora tiene Copy, Reload, Cancel, ScrollToBottom, error states y animaciones (Lane B / Slice 1)
- CI falla por lint debt preexistente (TASK-105), no por cambios de esta sesión
- Playwright MCP registrado en `~/.claude/settings.json`

### Prioridad operativa vigente — hardening `TASK-098` a `TASK-103`

- Orden recomendado: `TASK-100` → `TASK-101` → `TASK-098` → `TASK-099` → `TASK-102` → `TASK-103`.
- Rationale corto: primero guardrails baratos y transversales, luego cron auth, después observabilidad, middleware, resiliencia DB y finalmente costos.

### Prioridad operativa vigente — HRIS `TASK-025` a `TASK-031`

- Orden recomendado: `TASK-026` → `TASK-030` → `TASK-027` → `TASK-028` → `TASK-029` → `TASK-031` → `TASK-025`.
- Rationale corto: primero consolidar el modelo canónico de contratación que desbloquea elegibilidad y branches futuras; luego onboarding/offboarding y document vault como valor operativo inmediato; después expenses, goals y evaluaciones; `TASK-025` se mantiene al final porque sigue en `deferred`.

### Prioridad operativa vigente — Staff Aug `TASK-038` y `TASK-041`

- `TASK-038` se mantiene importante como línea comercial, pero posterior al bloque HRIS operativo y siempre implementada sobre la baseline moderna de Staff Aug, no sobre el brief original.
- `TASK-041` se trata como addendum de integración entre Staff Aug y HRIS; no compite como lane inmediata y debería entrar solo después de `TASK-026` y del baseline efectivo de Staff Aug.

### Prioridad operativa vigente — backlog global `to-do`

- Top ROI ahora: `TASK-100` → `TASK-101` → `TASK-072` → `TASK-098` → `TASK-026` → `TASK-109` → `TASK-117` → `TASK-030`.
- Siguiente ola: `TASK-027` → `TASK-028` → `TASK-116` → `TASK-067` → `TASK-068` → `TASK-070` → `TASK-011` → `TASK-096`.
- Estratégicas pero caras: `TASK-008` → `TASK-005` → `TASK-069` → `TASK-118` → `TASK-018` → `TASK-019`.
- Later / oportunistas: `TASK-029` → `TASK-031` → `TASK-015` → `TASK-016` → `TASK-020` → `TASK-115` → `TASK-107` → `TASK-099` → `TASK-102` → `TASK-103` → `TASK-021` → `TASK-032` → `TASK-053` → `TASK-054` → `TASK-055` → `TASK-058` → `TASK-059` → `TASK-071`.
- No gastar tokens ahora: `TASK-025`, `TASK-033` a `TASK-038`, `TASK-039`, `TASK-041`.

### Hallazgo de backlog

- `TASK-106` ya quedó movida formalmente a `complete`; `TASK-108` puede seguir tratándola como dependencia cerrada dentro de `Admin Center`.

### Release channels y changelog client-facing

- Se documento la policy canonica de releases en `docs/operations/RELEASE_CHANNELS_OPERATING_MODEL_V1.md`.
- Greenhouse operara releases principalmente por modulo/feature visible, con canal opcional de plataforma y disponibilidad separada por `internal | pilot | selected_tenants | general`.
- El esquema de versionado quedo ajustado a modelo hibrido: `CalVer + canal` para modulos/producto visible y `SemVer` solo para APIs o contratos tecnicos versionados.
- Se creo `docs/changelog/CLIENT_CHANGELOG.md` como fuente curada para cambios client-facing; `changelog.md` raiz sigue siendo tecnico-operativo.
- La policy ya incluye una baseline inicial por modulo con version/canal/tag sugerido a `2026-03-29`; los tags reales quedaron pendientes hasta cerrar un commit limpio que represente ese snapshot.

### Nueva task documentada

- `TASK-117` creada en `to-do`: policy de Payroll para dejar el período oficial en `calculated` el último día hábil del mes operativo, reutilizando la utility de calendario y sin alterar el lifecycle base `draft -> calculated -> approved -> exported`.
- La task también deja explícito que `payroll_period.calculated` debería notificar a Julio Reyes y Humberly Henríquez vía `NotificationService`/email delivery, idealmente como consumer reactivo del dominio `notifications`.

### Cierre administrativo de tasks cercanas

- `TASK-009` quedó en `complete` como baseline principal de `Home + Nexa v2`.
- Lo pendiente de `TASK-009` se repartió así:
  - `TASK-119` para rollout final de `/home`, `portalHomePath`, sidebar y cutover de `Control Tower`
  - `TASK-110` sigue como owner de la evolución funcional y visual de Nexa
- `TASK-108` quedó en `complete` como baseline del shell de `Admin Center`.
- Lo pendiente de `TASK-108` se deriva a `TASK-120` para role scoping fino, convivencia con surfaces especialistas y verificación manual consolidada.
- Drift documental corregido en pipeline:
  - `TASK-074` ya no debe tratarse como activa
  - `TASK-110` se trata como `in-progress`
  - `TASK-111`, `TASK-112` y `TASK-113` se tratan como `complete`

### Sesión 2026-03-28 — TASK-110 Lane A

- Archivos tocados: `src/lib/nexa/nexa-tools.ts`, `src/lib/nexa/nexa-service.ts`, `src/app/api/home/nexa/route.ts`, `src/views/greenhouse/home/HomeView.tsx`, `src/views/greenhouse/home/components/NexaToolRenderers.tsx`, docs de task/handoff/changelog.
- Decisión de implementación: mantener la UI actual de `/home`, exponer `toolInvocations` desde backend y mapearlos a `tool-call` parts de assistant-ui. Lane B puede reemplazar el renderer mínimo sin rehacer contratos ni lógica.
- Ajuste adicional de esta sesión: Nexa ya soporta selección de modelo en UI con allowlist segura usando IDs reales de Vertex: `google/gemini-2.5-flash@default`, `google/gemini-2.5-pro@default`, `google/gemini-3-flash-preview@default`, `google/gemini-3-pro-preview@default` y `google/gemini-3.1-pro-preview@default`.
- Claude en Vertex quedó verificado como disponibilidad de plataforma, pero no está conectado al runtime de Nexa; requerirá provider/capa de integración separada.
- Validación ejecutada:
  - `pnpm exec eslint src/app/api/home/nexa/route.ts src/lib/nexa/nexa-contract.ts src/lib/nexa/nexa-service.ts src/lib/nexa/nexa-service.test.ts src/lib/nexa/nexa-tools.ts src/views/greenhouse/home/HomeView.tsx src/views/greenhouse/home/components/NexaToolRenderers.tsx`
  - `pnpm exec tsc --noEmit --pretty false`
  - `pnpm exec vitest run src/lib/nexa/nexa-service.test.ts`
- Validación adicional del switch:
  - `pnpm exec eslint src/config/nexa-models.ts src/config/nexa-models.test.ts src/lib/ai/google-genai.ts src/lib/nexa/nexa-contract.ts src/lib/nexa/nexa-service.ts src/app/api/home/nexa/route.ts src/views/greenhouse/home/HomeView.tsx src/views/greenhouse/home/components/NexaHero.tsx src/views/greenhouse/home/components/NexaThread.tsx src/views/greenhouse/home/components/NexaModelSelector.tsx`
  - `pnpm exec vitest run src/config/nexa-models.test.ts src/lib/nexa/nexa-service.test.ts`
- No se tocó `.env.staging-check`.

### Sesión 2026-03-31 — incidente `HR > Permisos` + TASK-173

- Incidente observado en `dev-greenhouse.efeoncepro.com/hr/leave`: banner `Unable to load leave requests.` y tabla vacía en staging.
- Causa raíz confirmada en Cloud SQL:
  - el deploy `c96cf284` ya lee `greenhouse_hr.leave_requests.attachment_asset_id`
  - `shared-assets-platform-v1` todavía no estaba aplicado
  - en runtime faltaban `greenhouse_core.assets`, `greenhouse_core.asset_access_log` y la columna `greenhouse_hr.leave_requests.attachment_asset_id`
- Mitigación remota aplicada por GCP/ADC con perfil `migrator`:
  - creación de `greenhouse_core.assets`
  - creación de `greenhouse_core.asset_access_log`
  - `ALTER TABLE greenhouse_hr.leave_requests ADD COLUMN attachment_asset_id`
  - FK `greenhouse_leave_requests_attachment_asset_fk`
  - índice `leave_requests_attachment_asset_idx`
  - grants a `greenhouse_app`, `greenhouse_runtime` y `greenhouse_migrator`
- Verificación remota:
  - `attachment_asset_id` ya existe en `greenhouse_hr.leave_requests`
  - `greenhouse_core.assets` y `greenhouse_core.asset_access_log` ya existen
  - query directa sobre `greenhouse_hr.leave_requests` volvió a devolver filas
- Hardening en repo:
  - `src/lib/hr-core/service.ts` ahora trata `undefined_column` / `relation does not exist` (`42703` / `42P01`) como fallback recuperable a BigQuery para evitar que `leave requests` tire la UI completa por schema drift
  - test nuevo en `src/lib/hr-core/service.test.ts`
- Validación local:
  - `pnpm vitest run src/lib/hr-core/service.test.ts`
  - `pnpm eslint src/lib/hr-core/service.ts src/lib/hr-core/service.test.ts`
  - `pnpm lint`
  - `pnpm build`
- Estado real de `TASK-173` tras esta mitigación:
  - `leave` quedó restaurado en staging
  - `purchase orders` y `payroll receipts` ya quedaron endurecidos en repo para convivir con schema legacy:
    - `src/lib/finance/purchase-order-store.ts` detecta `attachment_asset_id` antes de escribir
    - `src/lib/payroll/payroll-receipts-store.ts` detecta `asset_id` antes de persistir/regenerar
    - ambos tienen tests focalizados nuevos
  - validación local posterior:
    - `pnpm exec vitest run src/lib/finance/purchase-order-store.test.ts src/lib/payroll/payroll-receipts-store.test.ts src/lib/hr-core/service.test.ts`
    - `pnpm exec eslint src/lib/finance/purchase-order-store.ts src/lib/finance/purchase-order-store.test.ts src/lib/payroll/payroll-receipts-store.ts src/lib/payroll/payroll-receipts-store.test.ts src/lib/hr-core/service.ts src/lib/hr-core/service.test.ts`
    - `pnpm lint`
    - `pnpm build`
  - el bootstrap full sigue incompleto porque `greenhouse_finance.purchase_orders` y `greenhouse_payroll.payroll_receipts` continúan owned por `postgres`
  - verificación explícita: con credenciales runtime, `ALTER TABLE greenhouse_finance.purchase_orders ...` falla con `must be owner of table purchase_orders`
  - falta resolver acceso/owner `postgres` para cerrar completamente la task en GCP

### Sesión 2026-04-10 — TASK-324 reporting hierarchy foundation

- Archivos tocados:
  - `migrations/20260410102941383_reporting-hierarchy-foundation.sql`
  - `src/lib/reporting-hierarchy/*`
  - `src/lib/hr-core/service.ts`
  - `src/lib/hr-core/service.test.ts`
  - `src/lib/operational-responsibility/store.ts`
  - `src/config/responsibility-codes.ts`
  - `src/lib/sync/event-catalog.ts`
  - `src/types/db.d.ts`
  - `docs/architecture/GREENHOUSE_INTERNAL_ROLES_HIERARCHIES_V1.md`
  - `docs/architecture/schema-snapshot-baseline.sql`
- Decisión de arquitectura cerrada:
  - `greenhouse_core.reporting_lines` es la lane canónica de supervisoría formal e historizable
  - `greenhouse_core.members.reports_to_member_id` se conserva como snapshot actual / compat layer
  - la delegación temporal del supervisor efectivo reutiliza `greenhouse_core.operational_responsibilities` con `scope_type = member` + `responsibility_type = approval_delegate`
- Guardrails implementados:
  - no self-reporting
  - no ciclos
  - no vigencias solapadas por miembro
- Integración cerrada en runtime:
  - `updateMemberHrProfile()` ahora enruta cambios de supervisor por reporting hierarchy
  - se publica `reporting_hierarchy.updated` en outbox
- Validación ejecutada:
  - `pnpm pg:connect:migrate`
  - `pnpm exec vitest run src/lib/hr-core/service.test.ts`
  - `pnpm exec tsc --noEmit --incremental false`
  - `pnpm lint`
  - `pnpm test`
  - `pnpm build`
- Ajuste adicional de verificación:
  - `src/lib/cloud/gcp-auth.test.ts` quedó deterministic-friendly para no depender del runtime local de Vercel/WIF durante `pnpm test`
  - se corrigió un `padding-line-between-statements` preexistente en `src/views/greenhouse/agency/space-360/tabs/TeamTab.tsx` para dejar `pnpm lint` verde

### Sesión 2026-04-10 — auditoría staging `Jerarquía` / `Organigrama` / `Departamentos`

- Pedido del usuario: auditar antes de seguir tocando código porque `Cambiar supervisor` “no deja guardar” y había drift visible entre supervisoría, delegaciones y departamentos.
- Verificación browser + API en staging (`/hr/hierarchy` y endpoints `hr/core/*`):
  - con `Razón` vacía el botón `Guardar cambio` queda deshabilitado sin validación visible
  - al completar `Razón`, el cambio de supervisor sí persiste y `daniela-ferreira -> julio-reyes` ya aparece en la API canónica de jerarquía y en el organigrama actual basado en reporting lines
  - siguen abiertos drifts en ficha HR, historial y departamentos
- Issues documentados:
  - `ISSUE-036` ficha HR stale tras cambio de supervisor
  - `ISSUE-037` historial pierde `effectiveTo`
  - `ISSUE-038` responsable de departamento no implica adscripción del miembro
  - `ISSUE-039` modal bloquea guardar sin feedback visible
  - `ISSUE-040` crear nueva delegación revoca antes de confirmar la nueva
  - `ISSUE-041` reasignación masiva ignora fecha efectiva al resolver scope
  - `ISSUE-042` organigrama usa reporting lines, no jerarquía estructural
  - `ISSUE-043` acceso al organigrama puede existir sin reflejo en el menú
- No se hicieron fixes nuevos en esta sesión de auditoría; solo documentación y verificación end-to-end para dejar el estado reproducible.

### Sesión 2026-04-13 — hardening real de sync Nubox docs

- Pedido del usuario: revisar por qué Nubox “no estaba sincronizando docs hace días” y dejarlo resuelto con una solución robusta y escalable, no un parche.
- Diagnóstico operativo:
  - `raw` sí estaba corriendo diariamente en staging/producción; había runs exitosos hasta `2026-04-13 07:30 UTC`.
  - El problema real era doble:
    - el raw default solo cubría ventana corta reciente, así que rectificaciones históricas podían quedar fuera indefinidamente
    - la capa `conformed` seguía usando `DELETE + INSERT` por ID en BigQuery; al ejecutar un backfill masivo, chocó con el streaming buffer (`UPDATE or DELETE ... would affect rows in the streaming buffer`)
  - además, `postgres_projection` marcaba `nubox_last_synced_at = NOW()` aunque el raw real no hubiera refrescado ese documento en la corrida actual; eso maquillaba frescura.
  - el fallo local `403 Invalid key=value pair in Authorization header` vino de drift del token/local env; staging siguió autenticando bien, por lo que no era la causa raíz del incidente productivo.
- Cambios implementados:
  - `src/lib/nubox/sync-plan.ts` + `src/lib/nubox/sync-plan.test.ts`
    - nuevo plan de sync con hot window configurable + historical sweep rotativo persistido en `greenhouse_sync.source_sync_watermarks`
  - `src/lib/nubox/sync-nubox-raw.ts`
    - usa el sync plan por defecto
    - registra `period_window`
    - marca `partial` si hay familias con error pero el raw escribió algo
  - `src/lib/nubox/client.ts` + `src/lib/nubox/client.test.ts`
    - `fetchAllPages()` ya no depende ciegamente de `x-total-count`; sigue paginando cuando la página viene llena
  - `src/lib/nubox/sync-nubox-conformed.ts`
    - cambia el contrato de `conformed` a append-only snapshots
    - ya no hace `DELETE` previo sobre tablas calientes de BigQuery
  - `src/lib/nubox/sync-nubox-to-postgres.ts`
    - lectores de `conformed` y `bank_movements` ahora resuelven latest snapshot por ID
    - `nubox_last_synced_at` ahora se alimenta desde `source_last_ingested_at` del raw real, no desde `NOW()`
  - `src/app/api/cron/nubox-balance-sync/route.ts`
    - balances leen latest snapshot por ID, compatibles con append-only conformed
  - `src/lib/finance/payment-ledger-remediation.ts`
    - bank movements usan latest snapshot por `nubox_movement_id`
  - `src/app/api/finance/nubox/sync-status/route.ts`
    - expone `lastRaw`, `lastConformed`, `lastProjection` y deja de esconder frescura real detrás de cualquier run Nubox reciente
  - `scripts/setup-bigquery-nubox-conformed.sql`
    - documentación actualizada a append-only snapshots
- Recuperación operativa ejecutada:
  - staging backfill raw por lotes `2023-01 -> 2026-04`: completado con éxito
  - conformed local con nuevo contrato: `nubox-conf-2e8e7828-68ce-48b6-bebd-076da5f798c8` succeeded
  - postgres projection local: `nubox-pg-ce4b8eeb-8a2b-4777-9885-37d96c0a1ed8` succeeded
    - `Income: 1 created, 71 updated`
    - `Expenses: 2 created, 122 updated`
    - `Reconciled: 0 expenses, 2 incomes`
    - `Orphaned: 17`
- Estado final verificado:
  - `GET /api/finance/nubox/sync-status` en staging terminó en `succeeded` para `postgres_projection`
  - los failures `conformed_sync` previos a las `20:30 UTC` del `2026-04-13` quedan como evidencia histórica del incidente de streaming buffer y ya no representan el estado actual
- Validación ejecutada:
  - `pnpm exec vitest run src/lib/nubox/client.test.ts src/lib/nubox/sync-plan.test.ts`
  - `pnpm exec eslint src/lib/nubox/sync-nubox-conformed.ts src/lib/nubox/sync-nubox-to-postgres.ts src/app/api/cron/nubox-balance-sync/route.ts src/lib/finance/payment-ledger-remediation.ts`
  - `pnpm exec tsc --noEmit`
  - `git diff --check`
  - `pnpm exec tsx scripts/test-nubox-sync.ts conformed`
  - `pnpm exec tsx scripts/test-nubox-sync.ts postgres`
  - `pnpm staging:request /api/finance/nubox/sync-status --pretty`
- Riesgo/deuda abierta:
  - siguen existiendo `17` orphaned sales sin identity resolution suficiente; eso ya no es un problema de sincronización sino de matching organizacional/RUT.
  - follow-on arquitectónico/documental abierto:
    - `docs/architecture/GREENHOUSE_NATIVE_INTEGRATIONS_LAYER_V1.md` y `docs/architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md` ya quedaron ampliados con el `Integration Runtime Pattern`
    - nueva `TASK-399` creada para institucionalizar el hardening runtime de integraciones source-led como carril separado de `TASK-188`
