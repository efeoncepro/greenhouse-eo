# TASK-722 — Bank Reconciliation Synergy Workbench

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Epic: `optional`
- Status real: `Cerrada 2026-04-29`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-722-bank-reconciliation-synergy-workbench`
- Legacy ID: `none`
- GitHub Issue: `optional`

## Summary

Conectar `/finance/bank` y `/finance/reconciliation` como un solo flujo operativo: Banco queda como tablero de cuentas, snapshot, drift y evidencia; Conciliacion queda como workbench transaccional para importar extractos, resolver filas y cerrar periodos. La task crea el bridge de datos, estado y UI para que un snapshot declarado en Banco se refleje y se pueda continuar en Conciliacion sin crear periodos aislados ni perder evidencia.

## Why This Task Exists

Hoy la sinergia existe parcialmente en el backend, pero no como producto:

- `/finance/bank` ya lee `account_balances`, `reconciliation_periods` y `account_reconciliation_snapshots`.
- El drawer de Banco declara snapshots/drift y, con `TASK-721`, adjuntara evidencia canonica via `evidence_asset_id`.
- `/finance/reconciliation` lista periodos y movimientos de caja pendientes, pero no muestra snapshots, drift, evidencia, readiness por cuenta ni la continuidad natural desde Banco.
- Staging confirma la desconexion: `GET /api/finance/reconciliation` devuelve `items: []` mientras `GET /api/finance/bank?year=2026&month=4` muestra snapshots activos/reconciled para Global66 y Santander Corp.
- La UI de Conciliacion puede parecer innecesaria o duplicada, cuando en realidad deberia ser el drill-down transaccional de Banco.

## Goal

- Convertir Conciliacion en el workbench transaccional downstream de Banco, no en una lista paralela.
- Mostrar en Conciliacion el estado de Banco: snapshot, drift, evidencia, periodo, filas importadas y filas pendientes.
- Permitir continuar desde un snapshot declarado en Banco hacia crear/abrir periodo, importar extracto y resolver matches.
- Mantener el uploader/evidencia dentro del scope de `TASK-721`; esta task solo consume el contrato canonico una vez disponible.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/FINANCE_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_POSTGRES_CANONICAL_360_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DOMAINS_MODULES_ARCHITECTURE_V1.md`

Reglas obligatorias:

- Banco (`/finance/bank`) es el tablero de cuentas/instrumentos, saldos, drift y evidencia.
- Conciliacion (`/finance/reconciliation`) es el workbench de periodos, extractos bancarios, filas de cartola, matching y cierre.
- No duplicar uploader ni storage: depender de `TASK-721` para `GreenhouseFileUploader`, `greenhouse_core.assets` y `account_reconciliation_snapshots.evidence_asset_id`.
- No cerrar un snapshot como conciliado solo por tener evidencia; el cierre transaccional requiere periodo, extracto importado, filas resueltas y diferencia en cero.
- No ocultar estados con color solamente: chips deben tener label claro, icono cuando aporte y tooltip/copy accesible.

## Normative Docs

- `docs/tasks/complete/TASK-721-finance-evidence-canonical-uploader.md`
- `docs/tasks/to-do/TASK-715-reconciliation-test-period-archive-ux.md`
- `docs/tasks/complete/TASK-720-instrument-category-kpi-rules.md`
- `docs/operations/DOCUMENTATION_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-721` para evidence uploader, `evidence_asset_id`, content hash y attach atomico de assets al snapshot.
- `greenhouse_finance.account_reconciliation_snapshots`
- `greenhouse_finance.reconciliation_periods`
- `greenhouse_finance.bank_statement_rows`
- `src/lib/finance/account-balances.ts`
- `src/lib/finance/reconciliation/snapshots.ts`
- `src/lib/finance/postgres-reconciliation.ts`

### Blocks / Impacts

- Desbloquea un flujo coherente Banco -> Conciliacion -> cierre.
- Reduce confusion sobre si `/finance/reconciliation` debe existir.
- Impacta UX de `/finance/reconciliation`, `/finance/reconciliation/[id]` y potencialmente CTAs de `/finance/bank`.
- Debe coordinarse con `TASK-715` para no romper archive/unarchive de periodos de prueba.

### Files owned

- `src/views/greenhouse/finance/ReconciliationView.tsx`
- `src/views/greenhouse/finance/ReconciliationDetailView.tsx`
- `src/views/greenhouse/finance/drawers/CreateReconciliationPeriodDrawer.tsx`
- `src/views/greenhouse/finance/drawers/ImportStatementDrawer.tsx`
- `src/views/greenhouse/finance/BankView.tsx`
- `src/app/api/finance/reconciliation/route.ts`
- `src/app/api/finance/reconciliation/[id]/route.ts`
- `src/app/api/finance/reconciliation/snapshots/route.ts`
- `src/lib/finance/postgres-reconciliation.ts`
- `src/lib/finance/reconciliation/snapshots.ts`
- `src/lib/finance/account-balances.ts`

## Current Repo State

### Already exists

- `BankView` muestra cuentas, saldos, `reconciliationStatus`, `reconciliationPeriodId` y `drift`.
- `DeclareReconciliationDrawer` ya esta siendo migrado por `TASK-721` para usar `GreenhouseFileUploader`.
- `declareReconciliationSnapshot` persiste snapshot/drift y tiene contrato para `evidenceAssetId`.
- `ReconciliationView` lista periodos, permite crear periodo y muestra movimientos de caja pendientes.
- `ReconciliationDetailView` permite importar extracto, auto-match, match manual, excluir filas y marcar periodo como conciliado/cerrado.
- `reconciliation_periods` y `bank_statement_rows` son el runtime transaccional actual.

### Gap

- Conciliacion no consume ni muestra `account_reconciliation_snapshots`.
- Conciliacion no muestra evidencia bancaria ni freshness de snapshot.
- Crear periodo no puede partir desde un snapshot declarado en Banco.
- Banco no ofrece CTA contextual "Abrir workbench" cuando hay periodo o snapshot accionable.
- No existe link persistido entre snapshot, periodo e import batch/extracto.
- El empty state de Conciliacion dice que no hay periodos aunque existan snapshots/drifts en Banco que requieren accion.
- Los KPIs de Conciliacion no distinguen "cuentas con snapshot", "cuentas con drift abierto/aceptado", "periodos sin extracto" y "filas pendientes".
- La tabla "Movimientos de caja por conciliar" no deja claro que son candidatos internos sin match bancario, no filas de cartola.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Bridge contract and read model

- Crear un helper server-side que exponga estado combinado por cuenta/periodo: account, selected period, latest snapshot, drift, evidence asset, statement row count, unmatched row count y actionable next step.
- Extender `GET /api/finance/reconciliation` para aceptar `year`/`month` opcionales y devolver metadata de Banco cuando no hay periodos activos.
- Extender `GET /api/finance/reconciliation/[id]` para incluir snapshot/evidence asociado al periodo cuando exista.
- Definir estrategia persistente para relacionar snapshot con periodo:
  - preferido: columnas aditivas nullable `reconciliation_period_id` y, si aplica, `statement_import_batch_id` en `account_reconciliation_snapshots`.
  - alternativa permitida solo si la migracion se posterga: helper deterministico por `account_id + snapshot_at month` con warning de deuda.
- **Garantía de idempotencia** — verificar si existe `UNIQUE (account_id, year, month)` en `reconciliation_periods`. Hoy la PK es solo `period_id` (text); el formato deterministico `accountId_year_month` (e.g. `santander-clp_2026_03`) protege a nivel aplicacional, no a nivel DB. Agregar migración aditiva `ALTER TABLE ... ADD CONSTRAINT IF NOT EXISTS uniq_recon_periods_account_year_month UNIQUE (account_id, year, month)` con pre-flight que aborte si hay duplicados existentes. Sin esto, dos requests concurrentes de `createPeriodFromSnapshot` pueden crear duplicados con `period_id` diferente.

### Slice 2 — Period creation from Bank snapshot

- Permitir crear/abrir periodo desde un snapshot declarado en Banco sin duplicar captura de saldo.
- Si existe periodo para `accountId/year/month`, enlazar snapshot y navegar al workbench.
- Si no existe, crear periodo con:
  - `openingBalance` desde read model mensual/canonico disponible.
  - `closingBalanceBank` inicial desde snapshot bancario cuando corresponda.
  - notas/provenance indicando snapshot/evidence source.
- Mantener idempotencia por `period_id = accountId_year_month`.

### Slice 3 — Reconciliation landing redesign

- Cambiar el framing de `/finance/reconciliation` a "Conciliacion transaccional" o copy equivalente que explique que Banco es el tablero y esta vista resuelve extractos/matches.
- Agregar summary cards accionables por cuenta/periodo:
  - snapshot declarado / sin snapshot
  - drift abierto / aceptado / reconciled
  - evidencia adjunta / faltante
  - extracto importado / pendiente
  - filas pendientes
- Si no hay periodos pero si hay snapshots de Banco, mostrar empty state accionable: "Hay snapshots bancarios listos; abre o crea un periodo para continuar".
- Renombrar o aclarar "Movimientos de caja por conciliar" como candidatos internos pendientes de match bancario.
- Incluir CTA contextual "Volver a Banco" y "Abrir workbench" sin duplicar rutas.

### Slice 4 — Reconciliation detail synergy

- En `/finance/reconciliation/[id]`, agregar panel superior con:
  - cuenta/instrumento
  - snapshot bank mas reciente del periodo
  - evidencia asset/ref
  - drift status y explicacion
  - diferencia periodo vs snapshot
- Si no hay extracto importado pero hay evidencia asset compatible, mostrar CTA "Importar desde evidencia" cuando el parser lo soporte; si no, "Importar extracto" normal con contexto.
- Mantener los CTAs actuales: importar extracto, auto-match, marcar conciliado, cerrar periodo.
- Agregar estado bloqueante claro cuando `Marcar conciliado` esta disabled: falta extracto, quedan filas pendientes o diferencia no es cero.
- **Surface canonical match channel** — en la tabla de filas del extracto, mostrar `matched_settlement_leg_id` (canal canónico TASK-708) además de `match_status`/`matched_payment_id`. Cuando `matched_settlement_leg_id` esté poblado, el match es vía settlement leg (vinculación canónica con el ledger); cuando esté null pero `matched_payment_id` no, es un match legacy/payment-only que requiere upgrade. La UI debe distinguir ambos casos con chip diferenciado y tooltip ("Match canónico vía settlement leg" vs "Match legacy via payment_id — pendiente upgrade a settlement leg").

### Slice 5 — UX, accessibility and microinteractions

- Usar `Skeleton` para primera carga, `LinearProgress` para refresh/auto-match/import y feedback persistente con `Alert`/toast.
- Anunciar cambios de conteos con `role="status"` y `aria-live="polite"`.
- Asegurar foco y teclado:
  - rows accionables con `role="button"`, `tabIndex=0` y Enter/Space.
  - al cerrar drawer/dialog, foco vuelve al trigger.
- Chips con texto entendible y no solo color.
- Copy de errores por campo cuando falten cuenta, periodo, evidencia o saldo.
- Respetar reduced-motion; no introducir animaciones decorativas.

## Out of Scope

- Implementar uploader/storage/evidence hash: vive en `TASK-721`.
- OCR o parser automatico de PDFs/screenshots.
- Reemplazar todo el modulo de Conciliacion.
- Cambiar la semantica contable de saldos/KPIs de Banco ya cubierta por `TASK-720`.
- Migracion retroactiva masiva de snapshots legacy sin evidencia asset.
- Reescribir permisos del modulo Finance fuera de los entitlements necesarios.

## Detailed Spec

### Modelo conceptual

```text
Banco
  account balance + instrument state + latest snapshot + drift + evidence
    |
    | "Abrir workbench" / "Crear periodo desde snapshot"
    v
Conciliacion
  period + bank statement rows + candidates + match/exclude + close
```

### Data bridge target

La respuesta de Conciliacion debe poder expresar:

```ts
type BankReconciliationBridge = {
  accountId: string
  accountName: string
  currency: string
  periodId: string | null
  year: number
  month: number
  latestSnapshot: {
    snapshotId: string
    snapshotAt: string
    driftStatus: 'open' | 'accepted' | 'reconciled'
    driftAmount: number
    bankClosingBalance: number
    pgClosingBalance: number
    evidenceAssetId: string | null
    sourceEvidenceRef: string | null
  } | null
  reconciliation: {
    status: string | null
    statementImported: boolean
    statementRowCount: number
    unmatchedRowCount: number
    difference: number
  }
  nextAction:
    | 'declare_snapshot'
    | 'create_period'
    | 'import_statement'
    | 'resolve_matches'
    | 'mark_reconciled'
    | 'closed'
}
```

### Access model

#### Estado verificado del motor de entitlements (2026-04-29)

- El motor de entitlements **ya existe** y está cerrado por `TASK-403` (complete). Vive en `src/lib/entitlements/runtime.ts` con helpers `can()`, `canSeeModule()`, `getTenantEntitlements()`.
- El catálogo canónico es runtime-only en `src/config/entitlements-catalog.ts` (no hay tabla DB `entitlement_capabilities` — el TS catalog **es** la fuente de verdad).
- Capabilities `finance.*` ya seedeadas (9): `finance.workspace`, `finance.status`, `finance.payment_instruments.{read,update,deactivate,manage_defaults,reveal_sensitive}`, `finance.cash.{adopt,dismiss}-external-signal`.
- Forma de cada capability: `{ module, capability, action, scope }` — **NO** existe la sintaxis postfija `capability@scope`. `scope` es campo separado del catálogo.

#### Plan de access model dentro del scope de esta task

- Mantener `requireFinanceTenantContext` (route group `finance` o `efeonce_admin`) como guard transversal en `/api/finance/reconciliation/*` y `/api/finance/reconciliation/[id]/*`. NO eliminarlo.
- Agregar **5 capabilities nuevas** al catálogo en `src/config/entitlements-catalog.ts` (file edit, sin migration):
  - `finance.reconciliation.read` — `{ action: 'read', scope: 'tenant' }`
  - `finance.reconciliation.match` — `{ action: 'write', scope: 'space' }`
  - `finance.reconciliation.import` — `{ action: 'write', scope: 'space' }`
  - `finance.reconciliation.declare_snapshot` — `{ action: 'write', scope: 'space' }`
  - `finance.reconciliation.close` — `{ action: 'write', scope: 'space' }`
- Extender `getTenantEntitlements()` (mismo helper de TASK-403) para que conceda esas 5 según role + routeGroup actual:
  - `efeonce_admin` o `finance_admin` → todas
  - `finance_operator` o `routeGroup=finance` → `read` + `match` + `import` + `declare_snapshot`
  - `close` solo a `efeonce_admin` y `finance_admin` (acción transaccional de cierre).
- En los endpoints de mutación (auto-match, match manual, import, exclude, accept, reconcile, archive), agregar guard granular adicional `can({ subject, capability, action, scope })` además del `requireFinanceTenantContext` general.
- En `BankView` y `ReconciliationView`/`ReconciliationDetailView`, gatear CTAs sensibles (`Importar extracto`, `Marcar conciliado`, `Cerrar período`) con `can()` para evitar que aparezcan disabled cuando la persona no debe verlos.
- `views` / `authorizedViews`: la task reutiliza las surfaces existentes `/finance/bank` y `/finance/reconciliation`; no se introduce un view code nuevo en V1.
- La instalación/visibilidad de views no concede automáticamente matching ni cierre — el guard `can()` cubre esa separación.

### UX review inputs

Hallazgos usados para esta task:

- `ReconciliationView` carga periodos + cuentas + cash-in/out pendientes, pero no snapshots.
- `ReconciliationDetailView` tiene buen workbench de filas, pero no muestra evidencia/snapshot de Banco.
- `BankView` ya muestra drift y status, pero sus chips no llevan al workbench.
- Staging muestra Banco con snapshots/drift mientras Conciliacion aparece vacia por no incluir periodos archivados ni snapshots.
- Playwright con sesión de agente confirma la fricción visual actual:
  - `/finance/reconciliation`: titulo `Conciliación`, KPIs `0/0/0/10`, alerta "Ya existen movimientos de caja por conciliar, pero aún no hay períodos abiertos..." y CTA único `Nuevo periodo`.
  - `/finance/bank`: KPIs y alertas sí muestran estado operacional, freshness, cobertura y CTA `Declarar conciliación`.
- Skill UX: la vista necesita copy que explique el rol de cada surface y estados vacios accionables.
- Skill microinteractions: falta feedback de progreso/estado persistente y affordances de foco/teclado en varias acciones de alto riesgo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `/finance/reconciliation` muestra estado combinado de Banco aunque no existan periodos activos.
- [ ] Un snapshot declarado en Banco puede crear o abrir el periodo correspondiente sin recapturar saldo/evidencia.
- [ ] `/finance/reconciliation/[id]` muestra snapshot, drift y evidencia asociados al periodo.
- [ ] Banco ofrece CTA contextual para abrir el workbench cuando existe periodo o snapshot accionable.
- [ ] Los empty states distinguen "sin cuentas", "sin periodos", "con snapshots pendientes" y "sin movimientos pendientes".
- [ ] `Marcar conciliado` explica exactamente que falta cuando esta bloqueado.
- [ ] El bridge es idempotente y no duplica periodos ni snapshots.
- [ ] No se rompe `TASK-715` archive/unarchive ni `TASK-721` uploader/evidence.
- [ ] Access model documentado en ambos planos: views + entitlements.

## Verification

- `pnpm pg:doctor`
- `pnpm lint`
- `pnpm tsc --noEmit`
- `pnpm test src/lib/finance`
- `pnpm staging:request '/api/finance/reconciliation?year=2026&month=4' --pretty`
- `pnpm staging:request '/api/finance/bank?year=2026&month=4' --pretty`
- Smoke manual en staging:
  - abrir `/finance/bank`
  - declarar snapshot con evidencia (`TASK-721`)
  - abrir `/finance/reconciliation`
  - crear/abrir periodo desde snapshot
  - importar extracto
  - ejecutar auto-match
  - verificar que Banco refleje estado actualizado

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre `TASK-715`, `TASK-721` y `TASK-720`
- [ ] si se agregan columnas o entitlements, quedan documentados en arquitectura o doc funcional correspondiente

## Follow-ups

- Parser/OCR de evidencia bancaria para precargar statement rows desde PDFs/screenshots.
- Garbage collection de draft assets huérfanos si `TASK-721` no lo cierra.
- Reconciliation readiness en Home/Nexa cuando Banco tenga drift o periodos pendientes.

## Delta 2026-04-28

- Task creada tras revisar UI/codigo de Banco y Conciliacion, staging requests reales, Playwright autenticado con usuario agente y las skills `greenhouse-ux-content-accessibility` + `greenhouse-microinteractions-auditor`.

## Delta 2026-04-29

- **Access model corregido contra realidad del codebase**. El motor de entitlements ya existe (TASK-403, complete) en `src/lib/entitlements/runtime.ts` con helpers `can()`/`canSeeModule()`/`getTenantEntitlements()`. El catálogo es runtime-only en `src/config/entitlements-catalog.ts` (no hay tabla DB). Las 5 capabilities `finance.reconciliation.*` se agregan dentro del scope de esta task — son ~50 líneas en 2 archivos, no requieren task separada ni esperar otro entregable. Sintaxis canónica: `{ module, capability, action, scope }` (campos separados, no postfijo `@scope`).
- **Slice 1 reforzado** con garantía DB de idempotencia: agregar `UNIQUE (account_id, year, month)` en `reconciliation_periods` con migración aditiva. Sin eso, dos requests concurrentes de "create period from snapshot" pueden generar duplicados con period_id distintos.
- **Slice 4 ampliado** para mostrar `matched_settlement_leg_id` (canal canónico TASK-708) además de `match_status` y `matched_payment_id`. UI debe distinguir match canónico (vía settlement leg) vs legacy (solo payment_id, pendiente upgrade).
- Referencia incorrecta a "TASK-690 entrega entitlements" eliminada — TASK-690 es Notification Hub (otro dominio).
