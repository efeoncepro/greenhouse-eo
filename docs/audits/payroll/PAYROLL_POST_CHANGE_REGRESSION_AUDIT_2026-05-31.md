# PAYROLL_POST_CHANGE_REGRESSION_AUDIT_2026-05-31

## Status

- Date: 2026-05-31
- Scope: verificación profunda de que Payroll (dominio + dependencias + cálculo) sigue sano tras los cambios del 2026-05-30/31 (TASK-956 / TASK-957 / TASK-958).
- Auditor: Claude usando `$greenhouse-payroll-auditor`.
- Criticality: crítica.
- Business sensitivity: alta (montos de nómina + sueldos ya pagados).
- Runtime checked: dev/local contra **Cloud SQL `greenhouse-pg-dev`** vía Cloud SQL proxy + repo en `develop @ 25b83563`.
- Mutation policy: **100% read-only**. Todas las pruebas de constraint corrieron dentro de `BEGIN … ROLLBACK`. Cero escrituras.
- **Decision: `PASS`** — Payroll no está roto. Dominio, dependencias y cálculo verdes. Cambios del día probados payroll-neutrales; sueldos ya pagados byte-idénticos.

## Por qué existe esta auditoría (baseline re-ejecutable)

El operador seguirá tocando Payroll. Este documento es el **baseline de regresión**: deja registrado el estado sano observado hoy + el **protocolo exacto de re-ejecución** (comandos + queries + fingerprints) para que cualquier agente/operador pueda, tras un cambio futuro, re-correr la misma batería y responder con evidencia *"¿se rompió o no?"* comparando contra los valores de baseline de abajo.

No reemplaza specs/tasks/runbooks y **no debe asumirse vigente automáticamente**: si el motor, el roster reader, las tablas o los gates cambian materialmente, re-correr y versionar un refresh.

## Executive Summary

Tras TASK-956 (comando employee→contractor), TASK-957 (gate de exclusión contractor + clasificación laboral vigente) y TASK-958 (reconciliación de tupla de `compensation_versions` + VALIDATE del CHECK), Payroll permanece **sano y sin regresión**:

- El **motor de cálculo** (`buildPayrollEntry`) no cambió y sus watchlist items legales están correctos (SII 15.25% 2026, split cesantía plazo_fijo, AFP/salud).
- El **roster reader** (`pgGetApplicableCompensationVersionsForPeriod`) mantiene **parity bit-for-bit**: el post-filtro de TASK-957 es no-op con su flag en OFF (default + confirmado no seteado en producción).
- La **data** quedó consistente: 0 violadores de tupla en `compensation_versions` y en `members`; los 3 contractors Deel reconciliados quedaron `(contractor, international, deel)` con su `deel_contract_id`; Valentina con su comp version cerrada.
- Los **sueldos ya pagados** (`payroll_entries`) están intactos — fingerprint de montos capturado como baseline.
- El **CHECK** validado rechaza going-forward exactamente las tuplas inválidas y acepta las 6 válidas.
- Las **señales de reliability** están en steady state esperado (todas en 0).

## Cambios auditados

| Task | Qué tocó en/cerca de Payroll | Riesgo evaluado |
|---|---|---|
| TASK-956 | Comando atómico employee→contractor (cierra relación + abre contractor + crea engagement). NO toca payroll_entries/finiquito/offboarding. | Boundary no-regresión. |
| TASK-957 Slice A | Nuevo `src/lib/payroll/contractor-exclusion/` + post-filtro en el roster reader, **flag-gated** (`PAYROLL_CONTRACTOR_ENGAGEMENT_EXCLUSION_ENABLED`, default OFF) + señal `payroll.contractor.double_rail_overlap`. | Parity del roster. |
| TASK-957 Slice B | `resolveCurrentWorkClassification` (account-360) + fix `toDateStr` en `get-person-hr.ts` + display Person 360. | Display, no cálculo. |
| TASK-957 data | Comp version v2 de Valentina cerrada (`effective_to=2026-04-30`). | Integridad data. |
| TASK-958 | Reconcilió 5 comp versions (Melkin/Andres/Daniela, Deel) `(indefinido,international)→(contractor,international)` + VALIDATE del CHECK `compensation_versions_contract_pay_regime_check` + señal `payroll.deel_member_without_contract_id` + backfill `melkin.deel_contract_id='m4ye2qg'`. | Cálculo + data + constraint. |

## Hallazgos por stream (evidencia)

### A. Cálculo — motor `buildPayrollEntry` (PASS)

- **Watchlist SII** (`src/types/hr-contracts.ts:75-83`): `SII_RETENTION_RATES[2026] = 0.1525` (15.25%) — coincide con la tasa oficial SII vigente desde 2026-01-01. ✓
- **Watchlist cesantía** (`src/lib/payroll/chile-previsional-helpers.ts:454-467`): worker `plazo_fijo` = `0` (no se le cobra el 3%), empleador `plazo_fijo` = `3%` / `indefinido` = `2.4%`; worker `indefinido` = `0.6%`. Coincide con AFC/SP. ✓
- **AFP / salud**: split AFP (cotización + comisión con default conservador 10%) y tope isapre 7% obligatorio presentes y correctos. ✓
- **El gate de exclusión NO entra al cálculo**: opera en el roster (selección de a quién se le calcula), no dentro de `buildPayrollEntry`.
- **Neutralidad del cambio de tupla del día**: `CONTRACT_COMPENSATION_POLICIES.indefinido.allowsRemoteAllowance === contractor === true` → para el path Deel (único donde `contract_type` entra al cálculo, vía `allowsRemoteAllowance`), `indefinido→contractor` produce `deelGrossTotal` idéntico. Probado byte-idéntico en apply-time de TASK-958 (aserción `buildPayrollEntry` before/after del primitivo de reconcile).
- **Suite del motor**: `pnpm vitest run src/lib/payroll` → **528 passed / 6 skipped (58 files)**. Ejercita Chile dependiente, honorarios, Deel passthrough e international_internal.

### B. Roster reader — parity (PASS)

- `pgGetApplicableCompensationVersionsForPeriod` (`src/lib/payroll/postgres-store.ts:1001-1033`): el post-filtro corre antes del branch split; con el flag OFF, `resolveContractorExcludedMemberIds` retorna **`Set` vacío sin tocar la DB** → `.filter(row => !excluded.has(...))` es no-op → **parity bit-for-bit** con el comportamiento pre-TASK-957. Envuelto en `try/catch` con fail-open (Set vacío) + `captureWithDomain`.
- Flag **no seteado en Vercel producción** (`vercel env ls` → ausente) ⇒ default OFF en runtime real.
- Nota: `PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED` (TASK-890, pre-existente, ortogonal a hoy) sí está seteado; el filtro de TASK-957 es no-op igual porque corre antes del branch y su Set está vacío.

### C. Integridad de data (PASS)

- **F1** `compensation_versions` violadores de tupla `(contract_type, pay_regime)`: **0**.
- **C1** members reconciliados: `andres-carlosama`, `daniela-ferreira`, `melkin-hernandez` → todos `(contractor, international, deel)` con `deel_contract_id` poblado (`3wpjyxp`, `3rz7g72`, `m4ye2qg`).
- **C2** sus 8 comp versions (histórica + vigente): todas `(contractor, international)`. ✓
- **C3** Valentina: v1 + v2 `(indefinido, chile)`; v2 `effective_to=2026-04-30`, `is_current=false` (empleo cerrado, historia preservada). ✓
- **C4** `payroll_entries` (sueldos pagados) — **fingerprint baseline** (MD5 de `period_id:gross_total:net_total` agregado por member):

  | member_id | entries | gross_net_fingerprint |
  |---|---|---|
  | andres-carlosama | 3 | `1a944a780ce835a93069728268d1df1a` |
  | daniela-ferreira | 4 | `ffe97eea1b6e4e9a117b9f37a9f3c487` |
  | melkin-hernandez | 4 | `a7e0db9cee96555ff6773966fbb1c427` |
  | valentina-hoyos | 3 | `eb6f43ec9ceb2c458ebf9d7b28c326a0` |

  Si un cambio futuro NO debía tocar estos sueldos, estos fingerprints deben permanecer idénticos.

### D. Dependencias (PASS)

- `pnpm exec tsc --noEmit` → exit 0.
- `pnpm build` (Turbopack producción) → exit 0.
- `pnpm vitest run src/lib/payroll` → 528 passed / 6 skipped.
- `pnpm vitest run src/lib/contractor-engagements` → 105 passed.
- `pnpm vitest run src/lib/workforce/offboarding` → 34 passed.
- `pnpm exec eslint` (superficies cambiadas payroll/reliability/account-360 + hr-contracts) → exit 0.

### E. Constraint `compensation_versions_contract_pay_regime_check` (PASS)

- Definición real enforced (vía `pg_get_constraintdef`): `(contract_type IN (indefinido,plazo_fijo,honorarios) AND pay_regime='chile') OR (contract_type IN (contractor,eor,international_internal) AND pay_regime='international')`. Exacta. ✓
- `convalidated = true` (promovido de NOT VALID por TASK-958). ✓
- **Live (BEGIN/ROLLBACK)**: las 3 tuplas inválidas (`indefinido,international` · `contractor,chile` · `honorarios,international`) → **rechazadas específicamente por `compensation_versions_contract_pay_regime_check`**. Las 6 válidas → pasan el CHECK (solo las frena el FK de `member_id` aguas abajo, lo que prueba que superaron el CHECK).

### F. Señales de reliability (PASS — todas en steady state esperado = 0)

- `payroll.contractor.double_rail_overlap` (TASK-957): **0**.
- `payroll.deel_member_without_contract_id` (TASK-958): **0** (Melkin backfilleado).
- `members` tupla inválida `(contract_type,pay_regime,payroll_via)`: **0**.
- Cross-table `compensation_versions ↔ members` drift en versiones vigentes (intent de `payroll.contract_taxonomy.invalid_tuple_drift`): **0**.

## Known non-issues (no son regresión)

- **`scim-workforce-signals.live.test.ts`** falla local (espera 6 señales SCIM, hay 10). Confirmado **pre-existente / ajeno** vía `git stash` (falla sin los cambios del día); es `.live` y skipea en CI sin PG. Dominio SCIM, fuera de scope de payroll. NO bloquea.
- **`PAYROLL_EXIT_ELIGIBILITY_WINDOW_ENABLED` seteado en prod**: pre-existente (TASK-890), ortogonal a los cambios de hoy.

## Protocolo de re-ejecución (para auditar Payroll tras cambios futuros)

> Correr esto y comparar contra los valores de baseline de arriba. Todo es read-only salvo donde se indique. PATH: `export PATH="$HOME/.nvm/versions/node/<ver>/bin:$PATH"`.

**Estático / motor / dependencias:**

```bash
pnpm vitest run src/lib/payroll                      # esperar: ~528 passed (subir si se agregan tests)
pnpm vitest run src/lib/contractor-engagements       # esperar: verde
pnpm vitest run src/lib/workforce/offboarding        # esperar: verde
pnpm exec tsc --noEmit --pretty false                # esperar: exit 0
pnpm exec eslint src/lib/payroll src/types/hr-contracts.ts src/types/payroll.ts  # exit 0
pnpm build                                           # esperar: exit 0
```

**Watchlist legal (grep, sin correr nada):**

- `SII_RETENTION_RATES` en `src/types/hr-contracts.ts` — confirmar la tasa del año vigente contra SII oficial.
- `getChileUnemploymentRatesForPeriod` en `src/lib/payroll/chile-previsional-helpers.ts` — worker plazo_fijo = 0.
- Tax table no vacía para el período (`src/lib/payroll/compute-chile-tax.ts`).

**Data + constraint + señales (vía Cloud SQL proxy `127.0.0.1:15432`, queries read-only; las del CHECK dentro de `BEGIN … ROLLBACK`):**

1. Violadores de tupla en `compensation_versions` (esperar 0):
   `SELECT COUNT(*) FROM greenhouse_payroll.compensation_versions cv WHERE NOT ((cv.contract_type IN ('indefinido','plazo_fijo','honorarios') AND cv.pay_regime='chile') OR (cv.contract_type IN ('contractor','eor','international_internal') AND cv.pay_regime='international'));`
2. Violadores de tupla en `members` activos (esperar 0): análogo con `payroll_via`.
3. CHECK validado: `SELECT convalidated FROM pg_constraint WHERE conname='compensation_versions_contract_pay_regime_check';` (esperar `t`).
4. Fingerprint de sueldos pagados del cohorte tocado (comparar contra tabla C4):
   `SELECT pe.member_id, COUNT(*) entries, MD5(STRING_AGG(pe.period_id||':'||COALESCE(pe.gross_total::text,'_')||':'||COALESCE(pe.net_total::text,'_'),'|' ORDER BY pe.period_id)) fp FROM greenhouse_payroll.payroll_entries pe WHERE pe.member_id IN (SELECT member_id FROM greenhouse_core.members WHERE LOWER(display_name) ~ '(melkin|andr[eé]s|daniela|valentina)') GROUP BY 1 ORDER BY 1;`
5. Señales: `double_rail_overlap`, `deel_member_without_contract_id` (esperar 0).

**Cálculo del cohorte tocado (read-only, ejercita `buildPayrollEntry`):**

```bash
set -a && source .env.local && set +a
pnpm tsx --require ./scripts/lib/server-only-shim.cjs \
  scripts/payroll/reconcile-compensation-version-tuple.ts --member-id=melkin-hernandez --include-historical
# esperar: "tuple ✓ canonical … Nada que reconciliar (idempotente no-op)"
```

**Verde global = Payroll no roto. Cualquier rojo o fingerprint cambiado (sin un cambio intencional documentado) = regresión a investigar antes de aprobar/exportar nómina.**

## Recomendación

- **PASS**: Payroll está sano. Los cambios del día son payroll-neutrales y los sueldos pagados están intactos.
- Mantener el flag `PAYROLL_CONTRACTOR_ENGAGEMENT_EXCLUSION_ENABLED` en OFF hasta su staging shadow-compare (TASK-957). El activarlo cambia el roster (excluye engaged) y debe re-auditarse con este protocolo + recálculo en staging.
- Re-correr este protocolo antes de aprobar/exportar cualquier período tras un cambio que toque: el motor (`src/lib/payroll/calculate-*`), el roster reader, `compensation_versions`/`members` schema, o cualquier gate de payroll.

## Verification

Ejecutado 2026-05-31 contra `develop @ 25b83563` + Cloud SQL `greenhouse-pg-dev`:
`pnpm vitest run src/lib/payroll` (528✓) · `…/contractor-engagements` (105✓) · `…/workforce/offboarding` (34✓) · `tsc --noEmit` (0) · `pnpm build` (0) · `eslint` (0) · queries F1/F2/E1/C1-C4/F3/F4/cross-table vía proxy (todas en baseline esperado) · CHECK live BEGIN/ROLLBACK (rechaza 3 inválidas por el tuple-check, acepta 6 válidas) · reconcile dry-run idempotente no-op para Melkin + Valentina.
