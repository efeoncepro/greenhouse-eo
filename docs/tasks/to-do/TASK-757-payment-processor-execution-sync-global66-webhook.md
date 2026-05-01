# TASK-757 — Payment Processor Execution Sync + Global66 Webhook Adapter V1

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-750` ✅, `TASK-751` ✅
- Branch: `task/TASK-757-payment-processor-execution-sync-global66-webhook`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Greenhouse ya puede crear y cerrar `payment_orders`, pero el cambio de estado
real del processor sigue siendo manual. Esta task conecta el runtime de
Tesorería con webhooks inbound provider-neutral, usando `Global66` como primer
adapter, para sincronizar `submitted` / `paid` sin romper maker-checker,
idempotencia ni conciliación.

## Why This Task Exists

Hoy `TASK-750` y `TASK-751` dejan el runtime listo para operar órdenes y
registrar `expense_payments`, pero el paso intermedio sigue dependiendo del
operador: cuando Global66 acepta o liquida una remesa, Greenhouse no recibe la
confirmación automáticamente. Eso deja tres gaps:

- el estado visible de la `payment_order` puede quedar atrasado respecto del
  processor;
- el loop `order -> paid -> expense_payment -> reconciliation` no se cierra
  solo;
- no existe un adapter reusable para futuros processors (`Wise`, bancos, Deel,
  etc.) sobre el webhook bus canónico.

## Goal

- Sincronizar el estado de ejecución de `payment_orders` desde eventos inbound
  de processors externos.
- Reutilizar el gateway genérico `POST /api/webhooks/[endpointKey]` y
  `greenhouse_sync.webhook_inbox_events` en vez de crear un carril paralelo.
- Entregar un primer adapter operativo para `Global66` sobre
  `Cambio de estado de una remesa`.

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
- `docs/architecture/GREENHOUSE_PAYMENT_ORDERS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_WEBHOOKS_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`

Reglas obligatorias:

- **Persist first, process second**: el webhook inbound debe persistirse en
  `greenhouse_sync.webhook_inbox_events` antes de ejecutar lógica financiera.
- **Processor event != payroll event**: el adapter no toca `payroll_entries`
  ni recalcula nómina; solo sincroniza `payment_orders` y deja a `TASK-751`
  cerrar el loop downstream cuando corresponda.
- **Provider-neutral core**: no hardcodear reglas del core como
  `internacional = Global66`; `Global66` es solo el primer adapter.
- **State machine estricta**: un payload externo no puede saltarse
  transiciones inválidas ni reabrir órdenes terminales silenciosamente.

## Normative Docs

- `docs/documentation/finance/ordenes-de-pago.md`
- `docs/documentation/finance/conciliacion-bancaria.md`
- `docs/documentation/hr/pagos-de-nomina.md`
- `docs/manual-de-uso/finance/ordenes-de-pago.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/complete/TASK-750-payment-orders-batches-maker-checker.md`
- `docs/tasks/complete/TASK-751-payroll-settlement-orchestration-reconciliation.md`
- `src/app/api/webhooks/[endpointKey]/route.ts`
- `src/lib/webhooks/inbound.ts`
- `src/lib/webhooks/store.ts`
- `src/lib/webhooks/signing.ts`
- `src/lib/webhooks/handlers/index.ts`
- `src/lib/finance/payment-orders/submit-order.ts`
- `src/lib/finance/payment-orders/mark-paid.ts`

### Blocks / Impacts

- Cierra el loop operativo real de `payment_orders` cuando el processor ya
  emitió confirmación externa.
- Complementa `TASK-756`: auto-generar órdenes desde Payroll deja de ser solo
  un paso interno y puede terminar en sincronización de ejecución real.
- Deja foundation reusable para adapters futuros (`Wise`, bancos,
  `provider_payroll`, rails locales) sin volver a diseñar el boundary.

### Files owned

- `src/lib/webhooks/handlers/index.ts`
- `src/lib/webhooks/inbound.ts`
- `src/lib/webhooks/store.ts`
- `src/lib/finance/payment-orders/`
- `src/app/api/webhooks/[endpointKey]/route.ts`
- `docs/documentation/finance/ordenes-de-pago.md`
- `docs/manual-de-uso/finance/ordenes-de-pago.md`

## Current Repo State

### Already exists

- Gateway inbound genérico: `POST /api/webhooks/[endpointKey]` delega a
  `processInboundWebhook()` y persiste receipts idempotentes en
  `greenhouse_sync.webhook_inbox_events`.
- `payment_orders` ya tiene `processor_slug` y `external_reference`, más
  machine de estados `approved -> scheduled -> submitted -> paid`.
- `submitPaymentOrder()` y `markPaymentOrderPaid()` ya publican eventos
  auditados al outbox.
- `TASK-751` ya escucha `finance.payment_order.paid` y materializa
  `expense_payment` + `settlement_leg` para payroll.

### Gap

- No existe handler inbound de processor que traduzca payload externo a
  transición canónica de `payment_order`.
- No hay contrato reusable para correlacionar un evento de processor con una
  orden viva vía `processor_slug` + `external_reference` + metadata ya
  persistida.
- No hay guardrails explícitos para eventos duplicados, tardíos o fuera de
  orden en el dominio de Tesorería.
- No hay seed/documentación operativa para un endpoint inbound de `Global66`.

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

### Slice 1 — Correlación y transición canónica de orders

- Agregar un helper reusable en `src/lib/finance/payment-orders/` que:
  - resuelva la `payment_order` candidata por `processor_slug` +
    `external_reference` y, si hace falta, metadata persistida;
  - traduzca un `processor_status_raw` a una acción canónica de Greenhouse
    (`noop`, `submit`, `mark_paid`, `manual_review`);
  - rechace regresiones o transiciones imposibles sin mutar la order.
- Formalizar el uso de `external_reference` y `processor_slug` como contrato
  mínimo para correlación runtime; si falta evidencia suficiente, el evento
  queda auditable pero no muta estado.

### Slice 2 — Adapter inbound de Global66 sobre webhook bus genérico

- Registrar un handler de `Global66` en `src/lib/webhooks/handlers/index.ts`
  usando `processInboundWebhook()` y el schema inbox existente.
- Consumir solo el caso V1 `Cambio de estado de una remesa`.
- Resolver auth según el contrato real disponible en la plataforma de
  Global66, reutilizando `auth_mode` y `secret_ref` del endpoint canónico en
  `greenhouse_sync.webhook_endpoints`.
- Traducir payload provider-specific a un shape interno mínimo:
  `provider`, `sourceEventId`, `processorReference`, `processorStatusRaw`,
  `occurredAt`, `payload`.

### Slice 3 — Idempotencia, errores operativos y re-proceso seguro

- Hacer que eventos duplicados o reintentos del provider no dupliquen cambios
  ni reemitan transiciones terminales.
- Marcar como `processed`, `failed` o `manual_review` con reason visible en la
  inbox cuando:
  - no exista correlación contra una order viva;
  - el estado sea desconocido;
  - la transición sea inválida para el state actual.
- Exponer un path manual mínimo para reprocesar o inspeccionar receipts
  fallidos usando el control plane/inbox existente, sin crear SQL ad hoc.

### Slice 4 — Contrato documental y smoke operativo

- Documentar en Finance qué parte del flujo cambia cuando el processor
  confirma `submitted` o `paid`.
- Documentar el contrato operativo del endpoint `Global66`:
  nombre del endpoint, secret contract, qué eventos se aceptan y qué estados
  de Greenhouse pueden mutar.
- Dejar smoke test reproducible con payload sintético/real redactado.

## Out of Scope

- Envío outbound desde Greenhouse hacia la API de Global66 para crear remesas.
- Auto-aprobación de orders o bypass de maker-checker.
- Conciliación bancaria final basada solo en webhook del processor.
- Soporte V1 para `Recepción de dinero por transferencia bancaria`.
- Matching heurístico por monto/beneficiario si no existe referencia fuerte;
  eso solo puede entrar como follow-up explícito.

## Detailed Spec

V1 debe tratar el webhook del processor como **confirmación de ejecución**, no
como source of truth única del cash.

### Mapeo funcional inicial

- Si Greenhouse ya tiene una order `approved` o `scheduled` y Global66 emite un
  estado equivalente a "remesa aceptada / enviada / en proceso", el adapter
  puede aplicar `submitPaymentOrder()` si la transición es válida.
- Si Greenhouse recibe un estado equivalente a "pagada / completada" y la
  order ya está en `submitted`, el adapter puede aplicar
  `markPaymentOrderPaid()`.
- Si llega un estado tardío, contradictorio o no reconocido, el evento queda
  auditado y se marca para revisión manual; no se fuerza una mutación.

### Correlación mínima

- `payment_orders.processor_slug` debe distinguir `global66` de otros rails.
- `payment_orders.external_reference` debe usarse como referencia primaria de
  correlación si el operator la cargó al marcar `submitted`.
- Si Global66 provee un identificador más fuerte de remesa en el payload, debe
  persistirse en metadata de la order o en un campo confirmado por Discovery
  antes de depender de heurísticas.

### Manejo de fallos

- `failed` del provider no debe implicar `cancelled` en Greenhouse.
- Si el runtime actual no tiene helper canónico para pasar una order a
  `failed`, el evento queda registrado como `manual_review` y se abre follow-up
  técnico en vez de improvisar una transición nueva inline.

### Items a verificar durante Discovery

- `[verificar]` nombre exacto del `auth_mode` que conviene para Global66
  (`shared_secret`, `bearer` u otro compatible con el gateway existente).
- `[verificar]` shape real del payload `Cambio de estado de una remesa`.
- `[verificar]` si Global66 expone un `event_id` estable o si la deduplicación
  debe apoyarse en `id` + `status` + timestamp.
- `[verificar]` si el runtime necesita ampliar `payment_orders.metadata_json`
  o basta con `external_reference`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Un receipt inbound de `Global66` queda persistido primero en
  `greenhouse_sync.webhook_inbox_events` y su reproceso es idempotente.
- [ ] Un evento correlacionado de remesa mueve una `payment_order` viva solo
  por transiciones válidas (`approved|scheduled -> submitted`, `submitted -> paid`).
- [ ] Eventos duplicados, tardíos o inválidos no duplican `expense_payments`
  ni corrompen el state machine de la order.
- [ ] Los eventos sin correlación suficiente quedan auditables y marcados para
  revisión sin mutar la order.
- [ ] El contrato operativo/documental del endpoint Global66 queda registrado
  en docs del repo.

## Verification

- `pnpm vitest run src/lib/webhooks src/lib/finance/payment-orders`
- `pnpm exec eslint src/lib/webhooks src/lib/finance/payment-orders src/app/api/webhooks`
- `pnpm exec tsc --noEmit --pretty false`
- `pnpm build`
- Smoke manual o staging con payload de prueba sobre
  `POST /api/webhooks/<endpointKey-global66>`

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] el endpoint inbound quedó sembrado/documentado con su contract de secreto sin publicar credenciales reales

## Follow-ups

- Adapter V2 para `Recepción de dinero por transferencia bancaria`.
- Soporte adicional para estados `failed` / `cancelled` del processor con
  helper canónico explícito si el negocio lo necesita.
- Adapters adicionales para `Wise`, bancos directos y processors payroll.
- UI/Audit timeline por order mostrando receipts inbound del processor.

## Open Questions

- ¿Global66 expone una firma fuerte o solo secret/API key en header?
- ¿La referencia más estable del lado Global66 es la misma que hoy el
  operador carga como `external_reference` al marcar `submitted`?
- ¿Conviene modelar un estado explícito `manual_review` fuera de la inbox o
  basta con `webhook_inbox_events.status + error_message` en V1?
