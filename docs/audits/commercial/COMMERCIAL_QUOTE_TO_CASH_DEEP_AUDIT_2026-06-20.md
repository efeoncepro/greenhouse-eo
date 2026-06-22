# Commercial Quote-to-Cash Deep Audit 2026-06-20

> **Delta 2026-06-21 — resuelto por TASK-1206 (code-complete, smoke de conversión diferido).** El hallazgo principal (cierre partido en dos caminos) quedó cerrado con el comando canónico `closeQuoteToCash` (`src/lib/commercial/quote-to-cash/close-quote-to-cash.ts`): income idempotente PRIMERO → `convertQuoteToCash` DESPUÉS (nunca converted sin income), 3 estrategias (`simple_invoice`/`enterprise_hes`/`contract_only`), idempotencia vía ledger + primitives idempotentes (anti doble-AR), 5 reliability signals (converted_without_income/audit, issued_without_deal, contract_only_sla_breach, duplicate_income). `convert-to-invoice` delega en el command detrás de `COMMERCIAL_Q2C_CANONICAL_CLOSE_ENABLED` (default OFF). **Pendiente de rollout:** el smoke de conversión real quedó diferido porque las 12 `issued` de dev son `source_system='nubox'` (convertir = doble AR); requiere fixture manual o sign-off. Detalle en `docs/tasks/in-progress/TASK-1206-commercial-q2c-canonical-close-command.md`.

> Snapshot operativo del dominio Commercial, con foco en cotizaciones y Quote-to-Cash.
> Fecha: 2026-06-20.
> Alcance verificado: docs de arquitectura, rutas API, commands/readers, UI, tests focales y Cloud SQL dev read-only.
> Estado: audit-only; no cambia runtime.

## Veredicto ejecutivo

El modulo Commercial/Quote-to-Cash esta construido con una base tecnica seria, pero no esta cerrado como operacion Quote-to-Cash end-to-end.

Lo solido: existe schema canonico en `greenhouse_commercial`, pricing/costing versionado, lifecycle de emision, governance de aprobaciones de cotizacion, document chain, materializacion de income simple/enterprise, party lifecycle, deal creation inline, proyecciones reactivas y un comando atomico `convertQuoteToCash`.

Lo que no esta solido: el circuito esta partido en dos caminos que no se componen completamente:

- `POST /api/commercial/quotations/[id]/convert-to-cash` formaliza contrato, party/client y evento `deal.won`, pero no crea income.
- `POST /api/finance/quotes/[id]/convert-to-invoice` crea income y marca la quote como convertida, pero no usa el audit substrate `commercial_operations_audit` ni el choreography formal de `convertQuoteToCash`.
- La UI visible usa `convert-to-invoice`; no encontre consumo visible de `convert-to-cash`.
- En dev no hay evidencia de ejecucion Q2C completa: 57 quotations, 12 emitidas, 0 convertidas y 0 filas `quote_to_cash` en `commercial_operations_audit`.

Full API Parity existe en sentido parcial: hay rutas programaticas internas y commands server-side, pero no hay contrato API Platform versionado (`api/platform/app` o `api/platform/ecosystem`) para quotations/Q2C, y varias mutaciones siguen sin capability fina/idempotencia uniforme.

## Fuentes revisadas

Arquitectura:

- `docs/architecture/GREENHOUSE_COMMERCIAL_QUOTATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_PARTY_LIFECYCLE_V1.md`
- `docs/architecture/GREENHOUSE_COMMERCIAL_FINANCE_DOMAIN_BOUNDARY_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/audits/finance/FINANCE_DEEP_OPERABILITY_AUDIT_2026-06-20.md`
- `docs/audits/finance/FINANCE_ROUTE_CAPABILITY_AUDIT_2026-06-20.md`

Runtime/code:

- `src/lib/commercial/party/commands/convert-quote-to-cash.ts`
- `src/app/api/commercial/quotations/[id]/convert-to-cash/route.ts`
- `src/lib/finance/quote-to-cash/materialize-invoice-from-quotation.ts`
- `src/lib/finance/quote-to-cash/materialize-invoice-from-hes.ts`
- `src/app/api/finance/quotes/[id]/convert-to-invoice/route.ts`
- `src/views/greenhouse/finance/QuoteDetailView.tsx`
- `src/views/greenhouse/finance/workspace/QuoteDocumentChain.tsx`
- `src/lib/sync/projections/quote-to-cash-autopromoter.ts`
- `src/lib/sync/projections/quotation-pipeline.ts`
- `src/lib/sync/projections/quotation-hubspot-outbound.ts`
- `src/lib/finance/quotation-canonical-store.ts`
- rutas `src/app/api/finance/quotes/**` y `src/app/api/commercial/**`

Evidencia ejecutada:

- Cloud SQL dev read-only via `cloud-sql-proxy`.
- Tests focales:
  - `pnpm test src/lib/commercial/party/commands/__tests__/convert-quote-to-cash.test.ts src/lib/finance/quote-to-cash/materialize-invoice-from-quotation.test.ts src/lib/finance/quote-to-cash/materialize-invoice-from-hes.test.ts 'src/app/api/commercial/organizations/[id]/deals/route.test.ts' src/lib/hubspot/__tests__/push-canonical-quote.test.ts src/lib/hubspot/__tests__/create-hubspot-quote.test.ts`
  - Resultado: 6 files passed, 18 tests passed.

## Estado observado en Cloud SQL dev

Snapshot read-only:

| Chequeo | Resultado |
|---|---:|
| `greenhouse_commercial.quotations` | 57 rows |
| Estados | 43 `draft`, 12 `issued`, 2 `expired` |
| Total quoteado CLP | 119.953.739,68 aproximado |
| Quotes convertidas | 0 |
| `commercial_operations_audit` para `operation_type='quote_to_cash'` | 0 rows |
| Quotes sin `organization_id` | 9 / 57 |
| Quotes sin `contact_identity_profile_id` | 53 / 57 |
| Quotes sin `hubspot_deal_id` | 32 / 57 |
| Quotes emitidas/convertibles | 12 |
| Emitidas sin `hubspot_deal_id` | 12 / 12 |
| `quotation_pipeline_snapshots` | 27 distinct quotes |
| `quotation_profitability_snapshots` | 3 distinct quotes |
| `greenhouse_finance.quotes` mirror | 37 rows |
| Finance quotes sin commercial anchor | 1 |
| Commercial quotes con broken finance anchor | 0 |

Estado de HubSpot anchors en `greenhouse_commercial.quotations`:

| Campo | Rows |
|---|---:|
| `hubspot_deal_id IS NOT NULL` | 25 / 57 |
| `hubspot_quote_id IS NOT NULL` | 25 / 57 |
| `hubspot_quote_link IS NOT NULL` | 0 / 57 |
| `hubspot_last_synced_at IS NOT NULL` | 25 / 57 |
| `hubspot_quote_locked = true` | 0 / 57 |

Nota de drift documental/runtime: la arquitectura menciona persistencia de `hubspot_sync_status`, pero la tabla dev no tiene esa columna. Las columnas HubSpot reales observadas son `hubspot_quote_id`, `hubspot_deal_id`, `hubspot_last_synced_at`, `hubspot_quote_status`, `hubspot_quote_link`, `hubspot_quote_pdf_download_link`, `hubspot_quote_locked`.

## Lo que esta solido

### 1. Modelo canonico Commercial existe y no es solo UI

El dominio no depende solamente de tablas finance legacy. Hay tablas y ownership en `greenhouse_commercial` para:

- `quotations`
- `quotation_line_items`
- `quotation_versions`
- governance de terms/templates/approvals
- `contracts`
- `commercial_operations_audit`
- parties/deals/product catalog

El canonical store (`src/lib/finance/quotation-canonical-store.ts`) ya lee por `organization_id` y conserva `space_id` como compatibilidad, alineado con el cutover de TASK-486.

### 2. Pricing/costing tiene mejor calidad que un quote builder superficial

El builder usa simulacion server-side antes de persistir. En `QuoteBuilderShell`, antes de guardar se fuerza una simulacion fresca contra `/api/finance/quotes/pricing/simulate`, reduciendo race conditions del debounce del UI.

El pricing engine persiste snapshots de costos/margen/impuestos por version, con explicitud de IVA y FX readiness en la emision. Esto es una base robusta para margen real, auditoria y profitability.

### 3. Lifecycle documental de quote esta bien separado

`requestQuotationIssue` y `finalizeQuotationIssued` separan:

- draft / approval
- emision oficial (`issued`)
- distribucion/document chain
- conversion

Eso corrige el modelo temprano donde `sent` mezclaba emision, aprobacion y envio.

### 4. El comando `convertQuoteToCash` esta bien concebido como core transaccional

En `src/lib/commercial/party/commands/convert-quote-to-cash.ts`, el comando:

- bloquea la quote con `FOR UPDATE`
- valida estados convertibles `issued|sent|approved`
- exige `organization_id`
- abre `commercial_operations_audit` con `correlation_id`
- marca `status='converted'`
- crea/reusa contrato via `ensureContractForQuotation`
- promueve party a `active_client`
- instancia cliente si falta
- emite `commercial.quotation.converted`
- emite `commercial.deal.won` local cuando corresponde
- finaliza audit y evento `commercial.quote_to_cash.completed`

Esto es una buena primitive server-side para unificar el cierre comercial.

### 5. Hay coverage focal de comandos criticos

Los tests focales Q2C/HubSpot pasan. Esto no prueba runtime real completo, pero si cubre logica de comando y rutas con mocks.

### 6. El sistema reactivo existe y opera para pipeline

Dev muestra actividad abundante de:

- `quotation_pipeline`
- `deal_pipeline`
- `income_hubspot_outbound`
- `quotation_profitability`

El handler `quote_to_cash_autopromoter` existe y corrio al menos una vez, aunque sin candidato convertible.

## Brechas criticas

### C1. Quote-to-Cash no esta cerrado como flujo end-to-end

La brecha central es de orquestacion. Hay dos commands utiles, pero no un flujo unico que cierre:

quote emitida -> contrato activo -> party/client activo -> income -> AR/cobro -> HubSpot mirror -> audit correlacionado.

`convertQuoteToCash` declara explicitamente como out of scope la materializacion de income. `materializeInvoiceFromApprovedQuotation` si crea income, pero no escribe `commercial_operations_audit` ni emite `commercial.quote_to_cash.*`.

Riesgo: se puede tener una quote convertida con contrato pero sin AR, o una factura creada desde quote sin el audit/choreography Q2C. Hoy la data dev no muestra conversiones, asi que el riesgo aun no se ve como drift masivo, pero el diseno permite bifurcacion.

Recomendacion: crear un command canonical `closeQuoteToCash` o extender `convertQuoteToCash` con strategy explicita:

- `simple_invoice`: crea income directa.
- `enterprise_hes`: exige OC/HES y materializa desde HES.
- `contract_only`: solo permitido como estado intermedio con flag/audit y SLA.

El output debe tener `operationId`, `correlationId`, `contractId`, `incomeId`, `clientId`, `events[]` y estado final observable.

### C2. La UI no usa el comando Q2C atomico

`QuoteDetailView` llama `/api/finance/quotes/[id]/convert-to-invoice`; `QuoteDocumentChain` muestra CTA "Convertir a factura". No encontre un consumo UI de `/api/commercial/quotations/[id]/convert-to-cash`.

Riesgo: el comando mas gobernado existe pero queda como API oculta/proyeccion, mientras el operador usa el camino de invoice simple. Esto rompe el objetivo de un choreography unico.

Recomendacion: la accion visible de cierre debe invocar el command canonico de Q2C, aunque internamente seleccione rama simple/enterprise. La UI no deberia elegir un subcommand que omite audit comercial.

### C3. No hay evidencia runtime de Q2C ejecutado

Cloud SQL dev:

- 12 quotes emitidas.
- 0 convertidas.
- 0 audit rows `quote_to_cash`.
- 0 converted rows con income.

No puedo afirmar que "no funciona" en terminos absolutos porque los tests focales pasan, pero si puedo afirmar que el entorno dev no demuestra operabilidad end-to-end.

Recomendacion: crear un smoke controlado con una quote fixture real:

1. crear/adoptar organization con HubSpot anchors,
2. crear quote con line items priced,
3. emitir,
4. cerrar Q2C simple,
5. verificar contract + client + income + outbox + pipeline + HubSpot state,
6. registrar evidence en audit o task.

### C4. Todas las quotes emitidas observadas carecen de `hubspot_deal_id`

Las 12 quotes `issued` en dev tienen `hubspot_deal_id` null. El autopromoter de Q2C escucha `commercial.deal.won` y busca quote por `hubspot_deal_id`; con esta data nunca puede convertirlas.

Riesgo: el cierre automatico desde HubSpot queda sin dientes para el stock emitido. El operador queda obligado a cierre manual.

Recomendacion: remediation job/readiness:

- listar `issued` sin deal,
- exponer accion "vincular deal antes de cerrar",
- bloquear o degradar conversion si la politica requiere HubSpot,
- permitir conversion sin deal solo con reason/audit explicito.

### C5. Approval Q2C >100M queda como suspension sin workflow resoluble visible

`convertQuoteToCash` persiste `pending_approval` y emite evento cuando supera $100M CLP, pero el propio comentario marca el workflow generico como follow-up.

Riesgo: una operacion grande puede quedar suspendida sin UI/proceso de resolucion, o requerir `skipApprovalGate` manual.

Recomendacion: antes de usar Q2C en deals grandes, conectar `commercial.quote_to_cash.approval_requested` a un workflow real de aprobaciones y a UI de resolucion.

### C6. Full API Parity es parcial, no completa

Hay capacidad programatica interna, pero no Full API Parity completa bajo la definicion vigente:

- No hay endpoints `src/app/api/platform/app/**` ni `src/app/api/platform/ecosystem/**` para quotations/Q2C.
- No hay OpenAPI/versioned contract para Q2C.
- Las rutas internas mutan estado pero no usan el command harness compartido de API Platform.
- Idempotencia esta presente en algunas rutas de email/share, en el command Q2C por audit/idempotent-hit y en deal creation por substrate propio, pero no es uniforme en `issue`, `approve`, `convert-to-invoice`, `lines`, `terms`, `versions`, `pricing/config`.
- La autorizacion fina es desigual: `convert-to-cash` y `deal creation` tienen `hasEntitlement`; muchas rutas `finance/quotes/**` se apoyan en tenant context/route group y helpers de rol, no en capabilities finas por accion.

Recomendacion: declarar un contrato `quotation.v1` y `quote_to_cash.v1` con lanes:

- app lane para first-party/mobile/agent interno,
- ecosystem lane solo si hay consumer externo real,
- command audit/idempotency via `api_platform_command_executions`,
- wrapper thin sobre readers/commands existentes, sin duplicar SQL.

## Brechas altas

### H1. Drift entre Commercial owner y paths Finance

Arquitectura define Commercial y Finance como dominios hermanos, pero la UI y APIs visibles siguen bajo `/finance/quotes`. La compatibilidad esta documentada, pero mantiene ambiguedad de ownership.

Riesgo: permisos, copy, navegacion y mental model siguen mezclando venta/cotizacion con contabilidad.

Recomendacion: mantener URLs legacy si hace falta, pero mover command/read contracts y view codes a namespace commercial de forma consistente. Nuevos endpoints Q2C deberian nacer en `/api/commercial` o API Platform, no en `/api/finance`.

### H2. HubSpot outbound tiene evidencia limitada y datos incompletos

Hay 25 quotes con `hubspot_quote_id` y `hubspot_last_synced_at`, pero 0 con `hubspot_quote_link`. La auditoria Finance del mismo dia marco handlers `quotation_hubspot_outbound:*` como degraded. En dev, el handler aparece con pocos runs y sin dead letters activos, pero el stock emitido carece de deal/quote anchors.

Riesgo: Greenhouse puede creer que la quote esta emitida, pero HubSpot no tiene un artefacto usable o link.

Recomendacion: agregar readiness signal especifico:

- issued without hubspot deal,
- issued with hubspot quote id but no link,
- hubspot last sync older than SLA,
- hubspot quote locked state unknown.

### H3. Pipeline coverage es incompleta

Hay 57 quotations pero solo 27 distinct quotes en `quotation_pipeline_snapshots` y 3 en `quotation_profitability_snapshots`.

Puede ser esperable por legacy_excluded/estado, pero como audit no encontre evidencia suficiente para tratarlo como intencional en todos los casos.

Riesgo: dashboards de pipeline/profitability no reflejan todo el stock comercial.

Recomendacion: crear check de cobertura:

- total active/non-legacy quotations,
- expected in pipeline,
- expected profitability,
- missing by reason.

### H4. Contact identity esta casi ausente

53/57 quotations no tienen `contact_identity_profile_id`.

Riesgo: PDF/email/share/HubSpot quote/contact association y trazabilidad buyer-side quedan debiles. Para Q2C enterprise, el contacto deberia ser parte del expediente comercial.

Recomendacion: no bloquear legacy, pero exigir contacto en nuevas quotes que se emitan salvo excepcion auditable.

### H5. Mirror `greenhouse_finance.quotes` no esta totalmente cerrado

Hay 37 finance quotes y 57 commercial quotations; 1 finance quote no tiene commercial anchor. No vi broken anchors desde commercial hacia finance.

Riesgo: readers que todavia caen al mirror legacy pueden mostrar un universo distinto.

Recomendacion: mantener fallback legacy solo como compatibilidad, pero agregar signal de mirror drift y plan de retiro del fallback.

## Brechas medias

### M1. Capability hardening pendiente en rutas de quotes

El scan estatico muestra que muchas rutas tienen tenant context pero no capability fina visible. Ejemplos de superficies sensibles:

- `approve`
- `issue`
- `convert-to-invoice`
- `lines`
- `terms`
- `versions`
- `pricing/config`
- `save-as-template`

Esto coincide con la auditoria `FINANCE_ROUTE_CAPABILITY_AUDIT_2026-06-20`.

### M2. Idempotencia heterogenea

`send-email`/`resend-email` usan `Idempotency-Key`; Q2C tiene idempotencia por audit/completed op; deal creation tiene idempotencia propia. Pero `convert-to-invoice` genera `INC-${randomUUID()}` y depende del lock/status para prevenir doble conversion, no de un idempotency key/replay response. En retries de cliente, el segundo intento devuelve conflicto, no replay del resultado previo.

### M3. Event/audit taxonomy fragmentada

La conversion simple registra `invoice_triggered` y `status_changed` en audit de governance, mientras `convertQuoteToCash` usa `commercial_operations_audit` + `commercial.quote_to_cash.*`. Ambos son utiles, pero para soporte no hay una sola narrativa.

### M4. Drift documental de HubSpot sync columns

La arquitectura menciona `hubspot_sync_status` en quotations, pero runtime dev no lo tiene. Esto puede ser doc stale o migracion no aplicada. Debe corregirse en arquitectura o DDL si la columna sigue siendo contrato objetivo.

## Full API Parity

### Estado actual

| Capacidad | Path programatico actual | UI usa command/readers? | API Platform versionada? | Observacion |
|---|---|---|---|---|
| Crear/listar quote | `/api/finance/quotes` | Si | No | Interna, tenant-scoped, namespace finance legacy |
| Editar quote/lineas | `/api/finance/quotes/[id]`, `/lines` | Si | No | Sin command harness compartido |
| Simular pricing | `/api/finance/quotes/pricing/simulate` | Si | No | Buena primitive, reusable internamente |
| Emitir quote | `/api/finance/quotes/[id]/issue` | Si | No | Governance fuerte, capability fina no evidente |
| Aprobar quote | `/api/finance/quotes/[id]/approve` | Si | No | Role/helper, no API Platform |
| Compartir/enviar PDF | `/api/finance/quotes/[id]/share/**`, `/pdf` | Si | No | Algunas rutas si tienen idempotencia |
| Crear deal inline | `/api/commercial/organizations/[id]/deals` | Si | No | Tiene capability e idempotency substrate propio |
| Convertir a cash | `/api/commercial/quotations/[id]/convert-to-cash` | No encontrado en UI | No | Command fuerte pero no cierra income |
| Convertir a invoice | `/api/finance/quotes/[id]/convert-to-invoice` | Si | No | Cierra income pero no Q2C audit |
| Autopromoter deal won | Reactive projection | N/A | No | Depende de `hubspot_deal_id` |

### Veredicto de parity

No se puede declarar Full API Parity completa para Quote-to-Cash. Hay API interna y commands suficientes para evolucionar hacia parity, pero falta:

1. contrato versionado por aggregate/command,
2. single command de cierre con output estable,
3. idempotencia uniforme,
4. capability fina por accion,
5. OpenAPI/schema,
6. lane app/ecosystem o decision explicita de que el internal product API es el contrato temporal,
7. smoke runtime demostrable.

## Recomendaciones priorizadas

### P0 - Cerrar el choreography canonico

Crear/ajustar un command unico:

```text
closeQuoteToCash({
  quotationId,
  strategy: 'simple_invoice' | 'enterprise_hes' | 'contract_only',
  idempotencyKey,
  actor,
  reason?
}) -> {
  operationId,
  correlationId,
  quotationId,
  contractId,
  incomeId?,
  clientId?,
  finalState,
  events
}
```

Debe componer lo que hoy esta separado entre `convertQuoteToCash` y `materializeInvoiceFromApprovedQuotation`.

### P0 - Hacer que la UI use el command canonico

El CTA "Convertir a factura" debe convertirse en "Cerrar venta" / "Cerrar quote-to-cash" segun copy canonico, pero internamente llamar al command Q2C. Si el output requiere invoice, la UI muestra el `incomeId`; si requiere approval, muestra la bandeja de aprobacion.

### P0 - Crear smoke operacional

Un test/smoke con fixture real debe verificar:

- quote emitida con org/contact/deal,
- Q2C simple,
- contract active,
- income pending,
- quotation converted con `converted_to_income_id`,
- commercial audit completed,
- outbox published,
- pipeline/profitability refreshed,
- no dead letters activos.

### P1 - API Platform parity

Introducir `api/platform/app/commercial/quotations` o equivalente:

- `GET /quotations`
- `GET /quotations/:id`
- `POST /quotations/:id/issue`
- `POST /quotations/:id/close`
- `GET /quotations/:id/document-chain`

No debe duplicar SQL: wrappers thin sobre readers/commands existentes.

### P1 - Capability hardening

Definir capabilities granulares:

- `commercial.quotation.read`
- `commercial.quotation.create`
- `commercial.quotation.update`
- `commercial.quotation.issue`
- `commercial.quotation.approve`
- `commercial.quotation.share`
- `commercial.quotation.close`
- `commercial.quotation.cost_override`
- `commercial.pricing_config.manage`

Mapearlas en `ENTITLEMENT_CAPABILITY_CATALOG` y rutas.

### P1 - Readiness signals

Agregar signals:

- `commercial.quotation.issued_without_deal`
- `commercial.quotation.issued_without_contact`
- `commercial.quotation.pipeline_projection_missing`
- `commercial.quotation.profitability_projection_missing`
- `commercial.quote_to_cash.audit_missing_for_converted`
- `commercial.quote_to_cash.converted_without_income`
- `commercial.hubspot_quote.sync_stale_or_link_missing`

### P2 - Limpiar drift documental/runtime

Actualizar arquitectura si `hubspot_sync_status` ya no existe como columna objetivo, o crear migracion si debe existir.

### P2 - Separar Commercial de Finance progresivamente

Mantener deep links `/finance/quotes` si hace falta, pero declarar nuevos command contracts y capabilities en `commercial`.

## Conclusion

Commercial/Quotation no es humo: hay mucho construido y varias piezas son de buena calidad. Pero Quote-to-Cash todavia no debe considerarse cerrado operativamente. El core transaccional existe, la materializacion financiera existe, la UI existe y los eventos existen; el problema es que no forman un unico camino gobernado, observable, idempotente y verificable.

La siguiente inversion deberia ser menos "mas pantallas de cotizacion" y mas "cerrar el choreography canonico": un solo command, una sola evidencia, un solo audit trail, y un smoke que pruebe que una venta pasa de quote emitida a factura/cobro-ready sin depender de conocimiento tribal.

