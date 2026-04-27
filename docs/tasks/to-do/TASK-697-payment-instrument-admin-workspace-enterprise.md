# TASK-697 — Payment Instrument Admin Workspace Enterprise

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Epic: `[optional]`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-697-payment-instrument-admin-workspace-enterprise`
- Legacy ID: `TASK-281 follow-up`
- GitHub Issue: `[optional]`

## Summary

Convertir `/admin/payment-instruments/[id]` desde una ficha read-only / route de recuperacion de 404 hacia un workspace enterprise para administrar instrumentos de pago con calidad de interfaz tipo banco moderno: configuracion editable por categoria, gobierno operativo, seguridad de datos sensibles, impacto antes de mutar, actividad treasury, conciliacion y auditoria. Debe ser una mejora incremental sobre `TASK-281/282/283`, sin romper la lista existente, los drawers de caja, Banco, Conciliacion ni el modelo `greenhouse_finance.accounts`.

## Why This Task Exists

`TASK-281` definio "Admin Center CRUD con lista, detalle y formulario por categoria", pero el runtime quedo incompleto: la lista navegaba a `/admin/payment-instruments/${accountId}` sin page App Router, y el fix inicial solo materializo una vista de detalle defensiva. Eso evita el 404, pero no entrega la capacidad real de administracion: editar, gobernar defaults, entender impacto, revisar uso operacional, desactivar con seguridad y proteger identificadores sensibles.

El instrumento de pago no es un objeto decorativo. Es el anchor compartido por Cobros, Pagos, Banco, Conciliacion, Posicion de caja, settlement multi-leg, FX y CCA. Una mala edicion puede afectar reportes de caja, periodos cerrados, reconciliacion y selectors operativos. La vista debe comportarse como un panel bancario/admin de alto nivel: claro, potente, visualmente impecable, rapido para operar y seguro por defecto.

## Goal

- Entregar un workspace admin real para cada instrumento: `Configuracion`, `Actividad`, `Conciliacion`, `Auditoria` y health/readiness operacional.
- Permitir edicion segura por secciones sobre el contrato existente de `greenhouse_finance.accounts`, con validaciones por categoria y confirmaciones para cambios de alto impacto.
- Separar datos sensibles del payload default: enmascarar por defecto, revelar solo con capability/accion auditada y nunca exponer secretos.
- Mostrar contexto operativo: saldos, ultimo movimiento, periodos, discrepancias, coverage, defaults, usos y dependencias antes de desactivar o cambiar campos criticos.
- Elevar la UI/UX a una experiencia "bank-grade": moderna, densa pero legible, con jerarquia fuerte, microinteracciones utiles, estados completos y accesibilidad AA.
- Mantener compatibilidad total con `/admin/payment-instruments`, `/api/admin/payment-instruments/**`, `/api/finance/accounts`, `/finance/bank`, drawers de cobro/pago y `PaymentInstrumentChip`.

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
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATA_MODEL_MASTER_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md`
- `docs/architecture/GREENHOUSE_UI_PLATFORM_V1.md`
- `docs/ui/GREENHOUSE_UI_ORCHESTRATION_V1.md`
- `docs/ui/GREENHOUSE_VUEXY_COMPONENT_CATALOG_V1.md`
- `docs/ui/GREENHOUSE_MODERN_UI_UX_BASELINE_V1.md`
- `docs/ui/GREENHOUSE_ACCESSIBILITY_GUIDELINES_V1.md`

Reglas obligatorias:

- No crear una tabla paralela de instrumentos: el agregado canonico sigue siendo `greenhouse_finance.accounts`.
- No romper el contrato existente de selectors y drawers que consumen `/api/finance/accounts`.
- No borrar instrumentos con ledger, settlement, balances o periodos asociados. La baja operativa debe ser `is_active = false` con impacto visible.
- No exponer `account_number_full` ni `provider_identifier` completos en el payload default del detalle admin. Cualquier reveal debe ser explicito, capability-gated, auditado y no persistir el valor completo en logs/client state mas alla de la vista local.
- No almacenar API keys, tokens, passwords, OAuth secrets, bank credentials ni webhooks secretos dentro de `accounts.metadata_json`.
- Cualquier cambio de acceso debe declarar ambos planos:
  - `views` / `authorizedViews` / `view_code` para la surface visible.
  - `entitlements` / `capabilities` para acciones finas (`read`, `update`, `reveal_sensitive`, `deactivate`, `close_period` si aplica).
- La UI debe usar patrones Vuexy/MUI existentes y primitives Greenhouse antes de inventar.
- La calidad visual debe ser "bank-grade" sin volverse landing page: interfaz operacional, densa, elegante, confiable, no decorativa.
- Microinteracciones solo cuando reduzcan incertidumbre, confirmen estado, guien el proximo paso o prevengan errores.
- Mantener `LF` line endings y no mezclar refactors amplios con este feature slice.

## Normative Docs

- `docs/tasks/complete/TASK-281-payment-instruments-registry-fx-tracking.md`
- `docs/tasks/complete/TASK-282-finance-payment-instrument-reconciliation-settlement-orchestration.md`
- `docs/tasks/complete/TASK-283-finance-bank-treasury-module.md`
- `docs/documentation/finance/modulos-caja-cobros-pagos.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`
- `docs/operations/RELEASE_CHANNELS_OPERATING_MODEL_V1.md`

Skill protocol obligatorio para el agente que tome esta task:

- Repo UI/product:
  - `.codex/skills/greenhouse-agent/SKILL.md`
  - `.codex/skills/greenhouse-portal-ui-implementer/SKILL.md`
  - `.codex/skills/greenhouse-vuexy-ui-expert/SKILL.md`
  - `.codex/skills/greenhouse-ux-content-accessibility/SKILL.md`
  - `.codex/skills/greenhouse-microinteractions-auditor/SKILL.md`
- Global UI/UX:
  - `/Users/jreye/.codex/skills/ux-content-accessibility/SKILL.md`
  - `/Users/jreye/.codex/skills/microinteractions-auditor/SKILL.md`
- Backend / data / access:
  - usar los documentos de arquitectura listados arriba como source of truth; si existe un skill backend local al momento de ejecutar, leerlo en Discovery y declararlo en el plan.

## Dependencies & Impact

### Depends on

- `TASK-281` — foundation de payment instruments: `greenhouse_finance.accounts`, provider catalog, logos, admin list, create drawer.
- `TASK-282` — reconciliation / settlement orchestration instrument-aware.
- `TASK-283` — `Banco` / treasury module y `account_balances`.
- `TASK-403` — entitlements runtime foundation.
- `TASK-404` — entitlements governance en Admin Center.
- `src/config/payment-instruments.ts`
- `src/components/greenhouse/PaymentInstrumentChip.tsx`
- `src/lib/finance/postgres-store.ts`
- `src/lib/finance/account-balances.ts`
- `src/app/api/admin/payment-instruments/route.ts`
- `src/app/api/admin/payment-instruments/[id]/route.ts`
- `src/app/api/finance/bank/[accountId]/route.ts`
- `src/views/greenhouse/admin/payment-instruments/PaymentInstrumentsListView.tsx`
- `src/views/greenhouse/admin/payment-instruments/CreatePaymentInstrumentDrawer.tsx`
- `src/views/greenhouse/admin/payment-instruments/PaymentInstrumentDetailView.tsx`
- `src/views/greenhouse/finance/components/AccountDetailDrawer.tsx`
- `src/views/greenhouse/finance/BankView.tsx`

### Blocks / Impacts

- Mejora la administracion diaria de Cobros, Pagos, Banco, Conciliacion y Posicion de caja sin cambiar sus rutas.
- Puede desbloquear follow-ups de importacion bancaria, governance de defaults, y futuras integraciones bank/fintech.
- Puede afectar tests de Finance Preventive Lane (`TASK-599`) si cambia markup o flujos de `/admin/payment-instruments`.
- Debe coordinar con cualquier trabajo activo que toque `src/app/(dashboard)/admin/layout.tsx`, `src/components/layout/**`, `src/lib/tenant/authorization.ts`, `src/config/entitlements-catalog.ts`, `src/lib/entitlements/runtime.ts`.

### Files owned

- `src/app/(dashboard)/admin/payment-instruments/[id]/page.tsx`
- `src/views/greenhouse/admin/payment-instruments/PaymentInstrumentDetailView.tsx`
- `src/views/greenhouse/admin/payment-instruments/CreatePaymentInstrumentDrawer.tsx`
- `src/views/greenhouse/admin/payment-instruments/PaymentInstrumentsListView.tsx`
- `src/app/api/admin/payment-instruments/[id]/route.ts`
- `src/app/api/admin/payment-instruments/route.ts`
- `src/lib/finance/postgres-store.ts`
- `src/lib/finance/account-balances.ts`
- `src/config/payment-instruments.ts`
- `src/config/entitlements-catalog.ts`
- `src/lib/entitlements/runtime.ts`
- `src/lib/sync/event-catalog.ts`
- `migrations/**`
- `src/lib/finance/__tests__/**`
- `src/views/greenhouse/admin/payment-instruments/**/__tests__/**`
- `docs/documentation/finance/modulos-caja-cobros-pagos.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/changelog/CLIENT_CHANGELOG.md`
- `changelog.md`
- `Handoff.md`

## Current Repo State

### Already exists

- `greenhouse_finance.accounts` ya contiene `instrument_category`, `provider_slug`, `provider_identifier`, `card_last_four`, `card_network`, `credit_limit`, `responsible_user_id`, `default_for`, `display_order`, `metadata_json`.
- `src/lib/finance/postgres-store.ts` ya expone `getFinanceAccountFromPostgres`, `listFinanceAccountsFromPostgres`, `createFinanceAccountInPostgres` y `updateFinanceAccountInPostgres`.
- `src/app/api/admin/payment-instruments/[id]/route.ts` ya soporta `GET` y `PUT`.
- `src/app/(dashboard)/admin/payment-instruments/[id]/page.tsx` existe como route materializada tras el fix del 404.
- `src/views/greenhouse/admin/payment-instruments/PaymentInstrumentDetailView.tsx` existe como detalle defensivo read-only con loading/error/not-found y masking en UI.
- `src/views/greenhouse/admin/payment-instruments/PaymentInstrumentsListView.tsx` lista instrumentos y navega por `accountId`.
- `src/views/greenhouse/admin/payment-instruments/CreatePaymentInstrumentDrawer.tsx` crea instrumentos por categoria, pero no cubre todo el contrato de gobierno.
- `src/app/api/finance/bank/[accountId]/route.ts` y `src/lib/finance/account-balances.ts` ya entregan balance, historial y movimientos por instrumento.
- `PaymentInstrumentChip` y provider logos ya existen.
- `AdminLayout` ya cubre la surface visible por `administracion.instrumentos_pago` y fallback `routeGroups.includes('admin')`.

### Gap

- La vista detalle no administra realmente: no edita, no guarda por seccion, no muestra impacto antes de mutar y no expone acciones operativas.
- El payload `GET /api/admin/payment-instruments/[id]` devuelve campos sensibles completos al cliente aunque la UI los enmascare.
- No hay endpoint/action de reveal sensible con auditoria y capability propia.
- No hay diff/audit domain-specific para cambios administrativos de instrumentos, mas alla del outbox genrico `finance.account.updated`.
- No hay UI de impacto: pagos vinculados, settlement legs, balances, periodos cerrados, conciliaciones, defaults y uso por modulo antes de desactivar o cambiar campos criticos.
- El create drawer no captura `defaultFor`, `responsibleUserId`, `displayOrder`, `openingBalanceDate` y tiene una generacion local de `accountId` distinta al helper server-side `name + currency`.
- No hay data quality/readiness visible para "Listo para cobros", "Listo para pagos", "Requiere configuracion" o "Riesgo por periodo cerrado".
- La experiencia visual no esta a la altura de una interfaz bancaria moderna: falta header de identidad fuerte, tabbed workspace, summary operativo, microinteracciones de guardado, skeletons consistentes, empty/error states accionables y accesibilidad verificable.

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

### Slice 1 — Admin detail contract, security serializer and impact reader

- Crear una capa server-side dedicada para el detalle admin, por ejemplo `src/lib/finance/payment-instruments/admin-detail.ts`.
- Separar el payload default del payload sensible:
  - default: datos seguros, masked summaries, estado, provider metadata, default routing, timestamps.
  - sensitive: numero completo / provider identifier completo solo por accion explicita.
- Agregar un serializer que nunca devuelva `accountNumberFull` completo en `GET /api/admin/payment-instruments/[id]`.
- Agregar un `impact` summary para el instrumento:
  - conteo de `income_payments` y `expense_payments` asociados.
  - conteo de `settlement_legs` donde participa como `instrument_id` o `counterparty_instrument_id`.
  - conteo y ultimo estado de `account_balances`.
  - periodos cerrados y reconciliaciones vinculadas si existen.
  - defaults (`default_for`) y si el instrumento aparece en selectors operativos.
- El reader debe degradar por secciones: si una fuente secundaria falla, la pagina responde con `partial` y `sectionErrors`, no 500 total salvo que falle la cuenta base.
- Tests unitarios para serializer, masking, impact reader y degraded section behavior.

### Slice 2 — Fine-grained capabilities, audit and safe mutations

- Extender `src/config/entitlements-catalog.ts` y runtime asociado con capabilities finas:
  - `finance.payment_instruments.read`
  - `finance.payment_instruments.update`
  - `finance.payment_instruments.reveal_sensitive`
  - `finance.payment_instruments.deactivate`
  - opcional `finance.payment_instruments.manage_defaults`
- Mantener la view surface `administracion.instrumentos_pago` para entrada/menu/page guard.
- Backend debe aplicar capabilities a acciones, no solo confiar en UI.
- Agregar auditoria domain-specific para cambios administrativos. Opciones permitidas en Discovery:
  - tabla aditiva `greenhouse_finance.payment_instrument_admin_audit_log`, o
  - evento outbox enriquecido con diff seguro + actor + reason.
- Para reveal sensible:
  - nuevo endpoint/action dedicado, por ejemplo `POST /api/admin/payment-instruments/[id]/reveal-sensitive`.
  - requiere `finance.payment_instruments.reveal_sensitive`.
  - requiere `reason` no vacio.
  - registra audit sin guardar el valor completo revelado.
  - respuesta con TTL UX corto y redaction-safe logging.
- Para update:
  - validar categoria, provider compatible, currency soportada por provider, credit limit no negativo, last four con 4 digitos, `default_for` contra opciones canonicas.
  - cambios de `currency`, `instrumentCategory`, `providerSlug`, `isActive=false` deben devolver/usar impacto y exigir confirmacion/`reason` si hay ledger o periodos cerrados.
  - no permitir delete fisico.
- Tests de API route para 401/403/404/422, reveal gated, update validation y audit.

### Slice 3 — Bank-grade Admin Workspace UI

- Redisenar `PaymentInstrumentDetailView` como workspace admin moderno, operacional y elegante, usando MUI/Vuexy y primitives Greenhouse.
- Layout objetivo:
  - Header sticky/first-fold con logo/provider, nombre, estado, moneda, readiness, acciones primarias.
  - Summary strip con balance, ultimo movimiento, coverage/uso, conciliacion, responsable.
  - Tabs: `Configuracion`, `Actividad`, `Conciliacion`, `Auditoria`.
  - Side rail o panel de "Riesgos y readiness" con blockers accionables.
- `Configuracion`:
  - formularios por seccion con save independiente:
    - Identidad: nombre, categoria, proveedor, moneda, pais, estado.
    - Datos del instrumento: campos dinamicos por categoria.
    - Gobierno: default routing, responsable, display order, notas.
    - Metadata segura: solo valores simples y no secretos.
  - dirty state visible, save/cancel por seccion, feedback inline + toast sonner para resultado.
  - high-impact changes abren confirm dialog con resumen de impacto.
- `Actividad`:
  - reutilizar datos de `GET /api/finance/bank/[accountId]` o reader equivalente.
  - mostrar movimientos recientes, inflows/outflows, saldo estimado, historial y empty states accionables.
  - CTAs cross-link: abrir `Banco`, abrir cobros/pagos filtrados si el filtro existe; si no existe, mostrar CTA disabled con tooltip honesto.
- `Conciliacion`:
  - estado de periodo, discrepancia, periodos cerrados, ultimo cierre, link a conciliacion si existe.
  - no reimplementar todo `BankView`; debe ser un resumen navegable.
- `Auditoria`:
  - timeline de cambios administrativos y reveals sensibles.
  - si la tabla/audit source no existe en Slice 2 por decision de plan, leer eventos outbox enriquecidos.
- Visual quality bar:
  - no cards dentro de cards.
  - cards con radius <= 8px segun tokens.
  - numeros con `fontVariantNumeric: 'tabular-nums'`, no monospace.
  - iconos lucide/tabler existentes con tamaños tokenizados.
  - nada de gradientes decorativos/orbs/hero marketing.
  - skeletons con layout estable; no spinner global salvo accion localizada.
  - estados loading/empty/partial/warning/error/success completos.

### Slice 4 — Create drawer and list convergence

- Alinear `CreatePaymentInstrumentDrawer` con el contrato nuevo:
  - Capturar `defaultFor`, `responsibleUserId`, `displayOrder`, `openingBalanceDate`.
  - Usar generacion de ID server-side por default (`name + currency`) o mostrar preview del ID canonico si se mantiene accountId explicito.
  - Validar por categoria antes de POST.
  - No permitir metadata que parezca secret (`token`, `secret`, `key`, `password`, `credential`, `webhook`, `bearer`).
- La lista debe reflejar readiness/estado:
  - chips de `Listo para cobros`, `Listo para pagos`, `Requiere configuracion`.
  - warning para instrumentos sin provider/responsable/default cuando aplique.
  - row action accesible para "Administrar" sin depender solo del click en fila.
- No romper sorting/filter actual.

### Slice 5 — Microinteractions, accessibility and visual verification

- Usar `greenhouse-microinteractions-auditor` + global `microinteractions-auditor` para revisar:
  - hover/focus/pressed de tabs, row actions, reveal, save buttons.
  - button loading localized.
  - dirty state per section.
  - confirm dialog high-impact.
  - partial state announcements.
- Usar `greenhouse-ux-content-accessibility` + global `ux-content-accessibility` para revisar:
  - copy de errores, confirmations, empty states y warnings.
  - headings, labels, aria-live, role=status, focus return tras dialog/drawer.
  - no color-only status.
- Verificar con browser/Playwright screenshots desktop y mobile:
  - `/admin/payment-instruments`
  - `/admin/payment-instruments/santander-clp` o fixture real equivalente.
  - estados: loading, normal, partial, not found, no activity, save success, validation error, reveal gated.
- Si se usa el in-app browser/plugin, documentar capturas o hallazgos en Handoff.

### Slice 6 — Docs, release notes and operational handoff

- Actualizar `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` con el contrato admin workspace, payload sensitive/default y audit.
- Actualizar `docs/documentation/finance/modulos-caja-cobros-pagos.md` con administracion real de instrumentos.
- Actualizar `docs/changelog/CLIENT_CHANGELOG.md` por cambio visible interno.
- Actualizar `changelog.md`.
- Actualizar `Handoff.md` con:
  - rutas tocadas.
  - access planes (`views` + entitlements).
  - validaciones ejecutadas.
  - riesgos residuales.

## Out of Scope

- Integraciones directas con APIs bancarias, PayPal, Wise, Stripe, Deel, MercadoPago o Previred.
- Importacion automatica de extractos bancarios.
- Reconciliacion automatica nueva; esta task solo muestra/resume y enlaza capacidades existentes.
- Cambio de tabla canonica desde `greenhouse_finance.accounts` a otra entidad.
- Delete fisico de instrumentos.
- Crear un nuevo modulo Finance paralelo a `Banco`.
- Rehacer `BankView`, `CashInListView`, `CashOutListView` o `ReconciliationView` salvo links/consumo minimo requerido.
- Exponer o persistir secretos.
- Redisenar toda la navegacion Admin Center.

## Detailed Spec

### Modelo de acceso esperado

Surface visible:

- `view_code`: `administracion.instrumentos_pago`
- path: `/admin/payment-instruments` y `/admin/payment-instruments/[id]`
- route group fallback actual: `admin`

Capabilities finas propuestas:

```ts
{
  module: 'finance.payment_instruments',
  capabilities: [
    { action: 'read', scope: 'tenant' },
    { action: 'update', scope: 'tenant' },
    { action: 'manage_defaults', scope: 'tenant' },
    { action: 'deactivate', scope: 'tenant' },
    { action: 'reveal_sensitive', scope: 'tenant' }
  ]
}
```

Regla:

- `read`: permite abrir workspace y ver masked data.
- `update`: permite guardar campos no sensibles.
- `manage_defaults`: permite mutar `default_for` y `display_order`.
- `deactivate`: permite `is_active=false` con confirmacion e impacto.
- `reveal_sensitive`: permite reveal temporal de identificadores completos con reason + audit.

### Payload default sugerido

```ts
type PaymentInstrumentAdminDetail = {
  account: {
    accountId: string
    accountName: string
    instrumentCategory: InstrumentCategory
    providerSlug: string | null
    providerName: string | null
    currency: string
    country: string
    isActive: boolean
    openingBalance: number
    openingBalanceDate: string | null
    accountType: string
    accountNumberMasked: string | null
    providerIdentifierMasked: string | null
    cardLastFour: string | null
    cardNetwork: string | null
    creditLimit: number | null
    responsibleUserId: string | null
    defaultFor: string[]
    displayOrder: number
    notes: string | null
    metadataJsonSafe: Record<string, string | number | boolean>
    createdAt: string | null
    updatedAt: string | null
  }
  readiness: {
    status: 'ready' | 'needs_configuration' | 'at_risk' | 'inactive'
    checks: Array<{
      key: string
      label: string
      status: 'pass' | 'warning' | 'fail'
      actionHref?: string
    }>
  }
  impact: {
    incomePaymentsCount: number
    expensePaymentsCount: number
    settlementLegsCount: number
    closedPeriodsCount: number
    latestBalanceDate: string | null
    latestMovementAt: string | null
    highImpactMutationRequired: boolean
  }
  treasury?: {
    balance: TreasuryBankAccountDetail['currentBalance'] | null
    recentMovements: TreasuryBankAccountDetail['movements']
    history: TreasuryBankAccountDetail['history']
  }
  audit: Array<PaymentInstrumentAuditEntry>
  sections: {
    account: 'ok' | 'error'
    impact: 'ok' | 'partial' | 'error'
    treasury: 'ok' | 'partial' | 'error'
    audit: 'ok' | 'partial' | 'error'
  }
}
```

### Sensitive reveal contract

```http
POST /api/admin/payment-instruments/:id/reveal-sensitive
Content-Type: application/json

{
  "field": "accountNumberFull" | "providerIdentifier",
  "reason": "Necesito confirmar el numero para conciliacion con el banco"
}
```

Response:

```json
{
  "field": "accountNumberFull",
  "value": "...",
  "expiresAt": "2026-04-27T12:10:00.000Z",
  "auditId": "..."
}
```

Hard rules:

- No cache.
- No logs with `value`.
- Audit stores field, actor, reason, timestamp, accountId, not the value.
- UI hides the revealed value automatically after TTL or navigation.

### UI interaction model

- Header actions:
  - `Guardar cambios` appears only if current tab/section dirty.
  - `Desactivar` appears if active and capability allows; uses danger confirm.
  - `Reactivar` appears if inactive and capability allows.
  - `Ver en Banco` links to `/finance/bank` with best available filter behavior; if no query filter exists, link to `/finance/bank` and document limitation.
- Forms:
  - Save per section with optimistic disabled state but not optimistic mutation of critical fields.
  - Validation inline, not only toast.
  - Toast only confirms completed save.
- Readiness:
  - persistent panel, not modal.
  - statuses use icon + label + helper, never color alone.
- Activity:
  - movement rows show source, date, amount, reconciliation state.
  - no activity empty state explains whether instrument has never been used or data source failed.

### Backend validation rules

- `instrumentCategory` must be one of `INSTRUMENT_CATEGORIES`.
- `providerSlug` must exist and match category or be null only for cash/manual cases.
- `currency` must be supported by provider when provider declares `currencies`.
- `creditLimit` must be >= 0.
- `cardLastFour` must be exactly 4 digits when provided.
- `cardNetwork` must be valid for credit card category.
- `defaultFor` must be subset of `DEFAULT_FOR_OPTIONS`.
- `metadataJson` must be plain object, max bounded size, no nested secrets, no keys matching secret/token/password patterns.
- Changing `currency` or `instrumentCategory` when linked usage exists requires explicit `reason` and high-impact confirmation.

### Design quality bar

The workspace should feel closer to Stripe/Ramp/Mercury-style admin banking software than a generic CRUD table:

- fast first read: "what is this instrument, can I use it, what is risky?"
- strong object identity with provider/logo/status.
- high density where useful, but not visually flat.
- primary actions near relevant decisions.
- section saves with local feedback.
- skeletons preserve layout.
- no ornamental animation.
- no marketing hero.
- no "card soup"; each block has a job.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `/admin/payment-instruments/[id]` is a full admin workspace with tabs/sections for configuration, activity, reconciliation and audit.
- [ ] Default detail payload does not expose full `accountNumberFull` or full `providerIdentifier`.
- [ ] Sensitive reveal requires capability + reason and writes audit without storing revealed value.
- [ ] Instrument updates are section-based, validated server-side and produce safe audit/outbox evidence.
- [ ] High-impact mutations show impact summary and require confirmation/reason.
- [ ] Deactivation is supported without physical delete and is blocked or strongly confirmed when usage exists.
- [ ] Create drawer captures all governance fields needed by the workspace or intentionally defers them with documented rationale.
- [ ] List view remains functional and gains an accessible "Administrar" affordance plus readiness/status signal.
- [ ] Treasury/activity summary reuses existing bank/account balance readers and degrades by section instead of failing the whole page.
- [ ] Access model is explicit: `administracion.instrumentos_pago` remains the visible view; fine-grained entitlements gate actions.
- [ ] UI passes the repo and global UX/microinteraction review checklists.
- [ ] Existing flows for Cobros, Pagos, Banco, Conciliacion and `/api/finance/accounts` are not broken.

## Verification

- `pnpm lint`
- `npx tsc --noEmit --pretty false`
- `pnpm test`
- Focused tests:
  - `src/lib/finance/**payment-instrument**.test.ts` or equivalent new tests.
  - `src/app/api/admin/payment-instruments/**/route.test.ts` if route test harness exists.
  - Component tests for `PaymentInstrumentDetailView` critical states if feasible.
- Manual/browser verification:
  - `/admin/payment-instruments`
  - `/admin/payment-instruments/santander-clp` or real fixture.
  - Edit safe field.
  - Attempt invalid category/provider/currency.
  - Reveal sensitive without permission (expect forbidden) and with permission/reason (expect audit).
  - Deactivate instrument with linked usage (expect impact confirmation).
  - Mobile viewport for tabs and action layout.
- Finance regression smoke:
  - `/finance/bank`
  - register cash-in/cash-out drawer opens and still loads instrument selector.
  - `GET /api/finance/accounts` returns compatible payload.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] `docs/changelog/CLIENT_CHANGELOG.md` quedo actualizado por el cambio visible en Admin Center / Finanzas
- [ ] `docs/documentation/finance/modulos-caja-cobros-pagos.md` quedo actualizado
- [ ] `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` quedo actualizado si se agrego audit/reveal/capability contract
- [ ] se ejecuto chequeo de impacto cruzado sobre `TASK-281`, `TASK-282`, `TASK-283`, `TASK-599`
- [ ] se documento el access model final: `views`, `entitlements`, `routeGroups`, `startup policy`
- [ ] se dejaron screenshots o notas de verificacion visual si la UI cambio materialmente

## Follow-ups

- Integracion bancaria/API real para importacion de movimientos por provider.
- Bank statement import per instrument desde el workspace.
- Workflow de aprobacion dual para reveal sensible o desactivacion de instrumentos con alto impacto.
- Reglas de ownership por responsable (`responsible_user_id`) y notificaciones ante drift/config incompleta.
- Deep links canonicos via `TASK-694` para abrir actividad, conciliacion o audit de un instrumento.
- Export seguro de audit trail.

## Open Questions

- Confirmar si `finance.payment_instruments.reveal_sensitive` debe quedar solo para `efeonce_admin` o tambien para `finance_admin` con reason obligatorio.
- Confirmar si `payment_instrument_admin_audit_log` debe vivir en `greenhouse_finance` o si basta con outbox/audit existente enriquecido.
- Confirmar si el path `/finance/bank` debe aceptar query params (`accountId`, `year`, `month`) como parte de esta task o quedar como follow-up.
- Confirmar si `accountId` debe seguir siendo editable/explicito en create drawer o quedar siempre server-generated e inmutable.
