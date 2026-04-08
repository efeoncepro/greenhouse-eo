# TASK-284 — Shareholder Current Account (Cuenta Corriente Accionista)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none`
- Branch: `task/TASK-284-shareholder-current-account`
- Legacy ID: —
- GitHub Issue: —

## Summary

Crear un módulo de Cuenta Corriente de Accionista (CCA) dentro de Finance que registre movimientos bidireccionales entre accionistas y la empresa. Cuando el accionista paga gastos corporativos con fondos personales, la empresa le debe. Cuando retira fondos para uso personal, él le debe a la empresa. El saldo neto indica quién le debe a quién en cada momento.

## Why This Task Exists

El accionista mayoritario frecuentemente paga gastos de la agencia con su tarjeta personal o retira dinero de la empresa. Hoy estos movimientos no tienen representación formal en el sistema — quedan como gastos o retiros sin trazabilidad de la deuda bidireccional. Esto genera opacidad en la posición financiera real de la empresa y del accionista.

No son préstamos formales con calendario de cuotas — es una cuenta corriente donde el saldo vivo es lo que importa.

## Goal

- Registrar movimientos bidireccionales accionista ↔ empresa con trazabilidad completa
- Conocer el saldo neto en cualquier momento: "la empresa me debe $X" o "yo le debo $X"
- Vincular movimientos a documentos existentes (expenses, incomes) cuando corresponda
- Preparar la estructura para soportar aportes de capital en el futuro sin cambio estructural

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`

Reglas obligatorias:

- Reutilizar el settlement layer existente (`settlement_groups`, `settlement_legs`) para integrar desembolsos y reembolsos al flujo de tesorería
- No crear identidades paralelas — el accionista se modela como extensión del objeto `Persona` (identity_profiles) o `team_members`
- Schema destino: `greenhouse_finance` (consistente con el resto del módulo Finance)
- Migraciones via `node-pg-migrate`, tipos regenerados con `kysely-codegen`
- Multi-moneda nativo (CLP/USD) reutilizando infraestructura FX existente (`exchange_rates`, `economic_indicators`)

## Normative Docs

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` — settlement layer, treasury, accounts model
- `docs/architecture/GREENHOUSE_PERSON_ORGANIZATION_MODEL_V1.md` — modelo person para vincular al accionista

## Dependencies & Impact

### Depends on

- `greenhouse_finance.accounts` — la CCA se puede modelar como un instrumento tipo `shareholder_account`
- `greenhouse_finance.settlement_groups` / `settlement_legs` — para integrar al flujo de tesorería
- `greenhouse_finance.expenses` / `greenhouse_finance.income` — para vincular movimientos a documentos origen
- `greenhouse_core.identity_profiles` — para identificar al accionista como persona canónica

### Blocks / Impacts

- `TASK-283` (Banco/Tesorería) — la CCA debería aparecer en la posición de tesorería como un instrumento más
- `TASK-070` (Cost Intelligence Finance UI) — el saldo CCA podría ser relevante en el dashboard de economía
- Futuro módulo de Equity/Aportes de Capital — esta task sienta las bases

### Files owned

- `src/lib/finance/shareholder-account/` (nuevo)
- `src/app/api/finance/shareholder-account/` (nuevo)
- `src/views/greenhouse/finance/shareholder-account/` (nuevo)
- `migrations/*shareholder-account*.sql` (nuevo)

## Current Repo State

### Already exists

- Settlement layer completo (`settlement_groups`, `settlement_legs`) con soporte para `leg_type: funding`
- Modelo de `accounts` (instrumentos financieros) con categorías: `bank_account`, `credit_card`, `fintech`, `payment_platform`, `cash`, `payroll_processor`
- Infraestructura FX: `exchange_rates`, `economic_indicators`, campos `amount_clp`, `exchange_rate_at_payment` en payments
- `account_balances` con snapshots diarios por instrumento
- `expense_payments` / `income_payments` como ledger append-only
- Kysely tipado + `src/lib/db.ts` centralizado
- `node-pg-migrate` operativo con scripts `pnpm migrate:*`

### Gap

- No existe concepto de "cuenta de accionista" ni "préstamo accionista" en el sistema
- No hay tabla para movimientos bidireccionales accionista ↔ empresa
- No hay categoría de instrumento `shareholder_account` en `accounts`
- No hay UI para gestionar ni visualizar la posición del accionista
- No hay integración con settlement layer para funding de accionista

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

### Slice 1 — Schema y migración

- Tabla `shareholder_accounts`: accionista (link a identity_profile_id o member_id), porcentaje de participación, moneda base, estado, metadata
- Tabla `shareholder_account_movements`: cada cargo/abono con direction (`credit` = empresa debe al accionista, `debit` = accionista debe a empresa), movement_type, monto, moneda, FX, link opcional a expense_id/income_id, descripción, evidencia
- Agregar categoría `shareholder_account` al enum/check de `accounts.instrument_category`
- Migración SQL + regenerar tipos Kysely

### Slice 2 — Domain logic y API

- `src/lib/finance/shareholder-account/` — funciones de dominio: crear cuenta, registrar movimiento, calcular saldo, listar movimientos con filtros
- API routes CRUD: `POST/GET /api/finance/shareholder-account`, `POST /api/finance/shareholder-account/[id]/movements`, `GET /api/finance/shareholder-account/[id]/movements`, `GET /api/finance/shareholder-account/[id]/balance`
- Integración con settlement layer: movimientos que se originan de un expense pagado por accionista generan settlement_leg tipo `funding`

### Slice 3 — UI

- Vista listado de cuentas de accionista con saldo actual
- Vista detalle de cuenta con tabla de movimientos (TanStack Table), filtros por fecha/tipo/dirección
- Formulario para registrar movimiento manual (drawer o modal)
- Indicador visual de saldo: positivo (empresa debe), negativo (accionista debe), cero (saldado)
- Entrada en navegación Finance

### Slice 4 — Integración tesorería

- Registrar la CCA como instrumento en `accounts` para que aparezca en posición de tesorería
- Materializar saldo en `account_balances` (o vista derivada)
- Integración con `TASK-283` (Banco/Tesorería) si ya está implementada

## Out of Scope

- Aportes de capital / equity tracking (futuro — el modelo lo soporta pero no se implementa ahora)
- Intereses o tasas sobre el saldo (no hay mutuo formal)
- Calendario de cuotas o amortización (no es un préstamo estructurado)
- Múltiples accionistas con cuentas cruzadas entre sí (solo accionista ↔ empresa)
- Reporting tributario o integración con Nubox/SII

## Detailed Spec

### Schema conceptual

```sql
-- Cuenta del accionista
CREATE TABLE greenhouse_finance.shareholder_accounts (
  shareholder_account_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Identidad del accionista
  identity_profile_id UUID REFERENCES greenhouse_core.identity_profiles(identity_profile_id),
  member_id UUID REFERENCES greenhouse.team_members(member_id),
  -- Metadata
  display_name TEXT NOT NULL,               -- e.g. "CCA — Felipe Efeonce"
  ownership_percentage NUMERIC(5,2),        -- e.g. 51.00
  base_currency TEXT NOT NULL DEFAULT 'CLP',
  status TEXT NOT NULL DEFAULT 'active',    -- active | frozen | closed
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID,
  -- Constraint: al menos una identidad
  CONSTRAINT chk_identity CHECK (identity_profile_id IS NOT NULL OR member_id IS NOT NULL)
);

-- Movimientos de la cuenta corriente
CREATE TABLE greenhouse_finance.shareholder_account_movements (
  movement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shareholder_account_id UUID NOT NULL REFERENCES greenhouse_finance.shareholder_accounts(shareholder_account_id),
  -- Clasificación
  direction TEXT NOT NULL CHECK (direction IN ('credit', 'debit')),
    -- credit = empresa debe al accionista (accionista pagó algo de la empresa)
    -- debit  = accionista debe a empresa (retiro personal)
  movement_type TEXT NOT NULL CHECK (movement_type IN (
    'expense_paid_by_shareholder',   -- pagó gasto corporativo con fondos personales
    'personal_withdrawal',           -- retiró dinero de la empresa
    'reimbursement',                 -- empresa devolvió al accionista
    'return_to_company',             -- accionista devolvió a la empresa
    'salary_advance',                -- adelanto de sueldo (si aplica)
    'capital_contribution',          -- reservado para futuro (aporte de capital)
    'other'
  )),
  -- Montos
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'CLP',
  exchange_rate NUMERIC(12,6),              -- si currency != CLP
  amount_clp NUMERIC(15,2) NOT NULL,        -- monto normalizado a CLP
  -- Trazabilidad
  linked_expense_id UUID,                   -- FK a expenses si aplica
  linked_income_id UUID,                    -- FK a income si aplica
  settlement_group_id UUID,                 -- FK a settlement_groups si se integra
  -- Metadata
  description TEXT,
  evidence_url TEXT,                         -- link a comprobante
  movement_date DATE NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  recorded_by UUID,
  -- Running balance (materializado por trigger o calculado)
  running_balance_clp NUMERIC(15,2)
);

-- Índices
CREATE INDEX idx_sha_movements_account ON greenhouse_finance.shareholder_account_movements(shareholder_account_id, movement_date);
CREATE INDEX idx_sha_movements_type ON greenhouse_finance.shareholder_account_movements(movement_type);
CREATE INDEX idx_sha_movements_expense ON greenhouse_finance.shareholder_account_movements(linked_expense_id) WHERE linked_expense_id IS NOT NULL;
```

### Movement types por dirección

| movement_type | direction | Descripción |
|---|---|---|
| `expense_paid_by_shareholder` | `credit` | Accionista pagó un gasto de la empresa → empresa le debe |
| `personal_withdrawal` | `debit` | Accionista retiró fondos → accionista debe a empresa |
| `reimbursement` | `debit` | Empresa devuelve al accionista → reduce deuda de empresa |
| `return_to_company` | `credit` | Accionista devuelve a empresa → reduce deuda de accionista |
| `salary_advance` | `debit` | Adelanto contra sueldo futuro |
| `capital_contribution` | `credit` | Aporte de capital (futuro, no implementar ahora) |
| `other` | `credit` o `debit` | Otros movimientos con descripción obligatoria |

### Saldo

- **Saldo positivo** (sum credits > sum debits) → empresa debe al accionista
- **Saldo negativo** (sum debits > sum credits) → accionista debe a empresa
- **Saldo cero** → cuentas saldadas

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Migración aplicada: tablas `shareholder_accounts` y `shareholder_account_movements` creadas en `greenhouse_finance`
- [ ] API CRUD operativa: crear cuenta, registrar movimiento, listar movimientos, consultar saldo
- [ ] UI funcional: listado de cuentas, detalle con movimientos, formulario de registro
- [ ] Saldo calculado correctamente en CLP con soporte multi-moneda
- [ ] Movimientos vinculables a expenses/incomes existentes
- [ ] Instrumento visible en posición de tesorería (integración con `accounts` / `account_balances`)
- [ ] `pnpm build` + `pnpm lint` + `pnpm test` + `npx tsc --noEmit` pasan

## Verification

- `pnpm lint`
- `npx tsc --noEmit`
- `pnpm test`
- `pnpm build`
- Validación manual: crear cuenta, registrar movimientos en ambas direcciones, verificar saldo

## Closing Protocol

- [ ] Actualizar `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md` con sección CCA
- [ ] Verificar impacto en `TASK-283` (Banco/Tesorería) — CCA como instrumento
- [ ] Verificar impacto en `TASK-070` (Cost Intelligence) — saldo CCA en dashboard

## Follow-ups

- Módulo de Aportes de Capital / Equity Tracker (extiende `capital_contribution` movement_type)
- Intereses devengados sobre saldo si se formaliza mutuo
- Reporting tributario de cuenta corriente accionista
- Conciliación automática: matching de expenses pagados con tarjeta personal del accionista

## Open Questions

- ¿El accionista ya tiene un `identity_profile_id` o `member_id` en el sistema, o hay que provisionarlo?
- ¿Se quiere vincular automáticamente expenses que se pagaron con una tarjeta específica (la personal del accionista) como movimientos CCA, o siempre será registro manual?
- ¿Visibilidad: solo admin/owner ve la CCA, o también el perfil `efeonce_admin`?
