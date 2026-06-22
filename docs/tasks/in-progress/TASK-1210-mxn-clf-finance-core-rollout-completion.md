# TASK-1210 — MXN + CLF Finance Core — Rollout completion + CLF income breakdown derivation

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- Backend impact: `command`
- Epic: `EPIC-CLIENT-360`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `none` — código base ya entregado en TASK-990 (Slices 0–9, MXN) y TASK-995 (Slices 0–6, CLF). Esta task consolida SOLO el rollout operativo pendiente + el fix de desglose CLF que quedó diferido por convivencia con Codex.
- Branch: `task/TASK-1210-mxn-clf-finance-core-rollout-completion`
- Legacy ID: `none`
- GitHub Issue: `[optional]`

## Summary

Cierra el rollout operativo pendiente de TASK-990 (MXN finance core) y TASK-995 (CLF/UF indexed finance core), ambas code-complete pero NO operationally-complete (flags OFF, sin push, workers no redeployados). Agrega el único fix de código pendiente: derivar el desglose neto/IVA de cotizaciones CLF que HubSpot entrega solo con `total` (sin asumir IVA — la clasificación afecta/exenta es por cotización). Sin este cierre, Berel (MXN) y los clientes CLF/UF no facturan/proyectan completos en producción.

## Progreso 2026-06-22 — Slice 1 code-complete (local-first), Slices 2–3 rollout pendiente

**Slice 1 (CÓDIGO) — DONE, local-first en `develop` (sin push), commit `b715c2aff`.**

- Helper puro `src/lib/finance/multi-currency/clf-quote-breakdown.ts` (`deriveClfQuoteBreakdown`): afecta (`cl_vat_19`) → `neto=total/1.19`, `IVA=total−neto`; exenta (`cl_vat_exempt`) → `IVA=0`; cualquier otra clasificación o `tax_code` NULL → **fail-closed** (`FinanceValidationError`, no inventa IVA → revisión manual).
- Wire en la rama CLF de `buildQuotationIncomeWriteFields` (`materialize-invoice-from-quotation.ts`): gatillo **solo** cuando `currency='CLF'` + `FINANCE_CLF_INCOME_PROJECTION_ENABLED` ON + sin `tax_snapshot_json` congelado + sin desglose header. Builder-authored (snapshot congelado) y no-CLF quedan **bit-for-bit**. Base = `total_amount` (total UF documental confiable; `total_price` es ruido del sync legacy).
- **Hardening de la rama CLF (TASK-995):** el IVA/total CLP ahora se derivan autoritativamente desde el subtotal CLP funcional (antes reusaba `taxWriteFields.taxAmount` redondeado a 2dp y lo proyectaba ×UF → drift ~156 CLP, rompía `total=neto+IVA`); el plano native UF conserva decimales (128.996, no 129); el `totalAmountClp` de evento/audit usa el funcional CLF→CLP.
- **Hallazgo de Discovery (resuelve la Open Question):** el path de income materializa desde `greenhouse_commercial.quotations` (NO `greenhouse_finance.quotes` del dry-run). Las CLF de ese path NO tienen line items (orden de resolución #1 no aplica) y su `total_price`/`total_amount` es inconsistente → la derivación usa orden #2 (despeje por `tax_code`). El gap subtotal/tax=NULL es **solo legacy HubSpot**; quotes autoradas por el builder ya nacen con desglose congelado.
- Tests: helper (7 totales UF reales + exenta + fail-closed) + integración del materializer (afecta deriva IVA>0, exenta IVA=0, `tax_code` NULL no materializa). Suite finance **998/998** verde; lint + tsc + build limpios.

**Slice 2 (ROLLOUT MXN) — backfill Berel APLICADO + writer fix sistémico (commit `8ce041af4`), con sign-off del CEO.**

- **Bug sistémico encontrado y arreglado:** `upsertIncomeFromSale` tomaba una rama UPDATE temprana cuando el income ya existía (caso Berel — TASK-1209 crea la fila CLP primero) que NUNCA poblaba el native plane (solo la rama INSERT lo hacía). Resultado: prender `FINANCE_CORE_MXN_ENABLED` + re-sync devolvía `updated` con `native_amount` NULL para siempre. Fix: computar `foreignActive`/native/fxEvidence antes del branch + backfillear el native plane en la rama UPDATE (COALESCE, en tx con el snapshot FX, gated). Con flag OFF o sin plano foráneo → bit-for-bit. 2 tests de regresión nuevos.
- **Backfill aplicado (DB compartida dev/staging/prod):** ambas facturas de exportación Berel con native plane — `INC-NB-28800562` native 89.960 MXN (FX 51.33), `INC-NB-29062197` native 84.760 MXN (FX 52.66), source `nubox_legal_document`, CLP legal bit-for-bit, exentas DTE 110. Scripts `task-990-berel-*` generalizados al allowlist de ambas (antes solo 1). **Verificación operador: ninguna factura anulada** (chequeado en Nubox API: `dataCl.annulled=false` en ambas).

**Slices 2–3 (FLAGS + DEPLOY) — DONE en PRODUCCIÓN (release `3a39c68ba`, sign-off CEO 2026-06-22).**

- **Release full develop→main** vía release control plane (orchestrator `production-release.yml` run `27990002019`, `bypass_preflight_reason` para el batch policy payroll+finance) → manifest `released`, Vercel + 4 workers + health OK.
- **8 flags MXN/CLF ON en producción:** Vercel prod (agregados + redeploy `greenhouse-midjr78bo`, `greenhouse.efeoncepro.com` HTTP 200) + ops-worker (persistente via `deploy.sh`). NO los `*_BACKFILL_APPLY_ENABLED`.
- **ISSUE-107 (worker drift) resuelto:** el path filter de `ops-worker-deploy.yml` excluía `src/lib/nubox/**` → worker stuck en código stale; fix = nubox en las 3 listas + redeploy break-glass → ops-worker `GIT_SHA=3a39c68ba`, watchdog `worker_revision_drift=ok` (4/4 synced).
- **Pendiente observacional (no bloqueante):** verificar una conversión de cotización CLF real en prod → income con desglose neto/IVA correcto (código + tests lo cubren; falta la observación end-to-end con dato real).

**Slice 4 (diferidos) — se mantiene diferido con razón documentada** (ver §Scope Slice 4): expense-CLF writer (sin upstream — compras UF aún no se registran como expense), readers/reconciliación CLF (TASK-995 Slice 5), revaluación-al-pago + su signal. No se cablea consumer muerto hasta que exista data CLF real.

## Why This Task Exists

TASK-990 y TASK-995 quedaron `in-progress` por la **Runtime Rollout Completion Gate**: el código está mergeable y gated default-OFF, pero faltan acciones de producción money-movement (flip de flags, redeploy de workers Cloud Run, backfill de income, verificación con datos reales). El operador decidió **cerrar ambas tasks de implementación** y trasladar todo el pendiente operativo + el fix CLF restante a esta task única de seguimiento, para no dejar las dos tasks abiertas indefinidamente esperando ventanas de rollout.

Además, el dry-run de cotizaciones CLF (`scripts/finance/task-995-clf-quotes-projection-dryrun.ts`) detectó un **gap de datos**: las 7 quotes CLF reales de HubSpot traen `subtotal/tax_amount=0` (solo `total_amount`), así que se proyectarían sin desglose neto/IVA. El fix se documentó (TASK-995 §#1.1) pero NO se implementó porque toca la zona de cotizaciones/materializer que Codex está editando en paralelo.

## Goal

- MXN finance core operationally-complete: flags ON, workers redeployados, income de Berel con plano nativo MXN, señales en steady.
- CLF/UF finance core operationally-complete: fix de desglose implementado, flags ON, verificado con una OC/cotización CLF real.
- Items CLF diferidos por anti-drift (expense-CLF writer, readers/reconciliación, revaluación-al-pago) trackeados aquí, cableados solo cuando exista upstream/datos reales.
- TASK-990 y TASK-995 quedan cerradas (`complete`) con su pendiente trazado en esta task.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_FINANCE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLF_INDEXED_FINANCE_CORE_V1.md` (ADR Accepted)
- `docs/architecture/GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`

Reglas obligatorias:

- **INVOCAR la skill `greenhouse-finance-accounting-operator`** antes de tocar `src/lib/finance/**` o cualquier flujo ledger/fiscal/tesorería.
- Respetar la **Runtime Rollout Completion Gate**: no declarar complete hasta flags ON + workers redeployados + datos verificados en runtime real.
- Respetar el **Feature Flag State Ledger** (`docs/operations/FEATURE_FLAG_STATE_LEDGER.md`): actualizar el snapshot por environment de cada flag al prenderlo.
- CLF = unidad indexada ≠ moneda cash: `toFinanceCurrency('CLF')` sigue lanzando; el plano CLP funcional se redondea a entero (factura chilena sin centavos).

## Normative Docs

- `docs/tasks/complete/TASK-990-mxn-multi-currency-finance-core.md` (Slices + rollout sequence + open questions resueltas)
- `docs/tasks/complete/TASK-995-clf-uf-indexed-finance-core.md` (§#1.1 plan del fix de desglose + items diferidos)
- `docs/manual-de-uso/finance/monedas-indexadas-uf-clf-rollout.md` (runbook CLF)

## Dependencies & Impact

### Depends on

- TASK-990 (código MXN, mergeado en `develop`).
- TASK-995 (código CLF, local-first, sin push).
- TASK-1209 (Nubox export income projection): ya creó las filas income CLP de Berel (`INC-NB-28800562`, `INC-NB-29062197`) vía `upsertIncomeFromSale`. El backfill MXN de esta task **actualiza** esas filas agregando el plano nativo (MXN), no las crea. Coordinar el redeploy de workers (compartido).

### Blocks / Impacts

- Facturación/proyección productiva de clientes MXN (Berel) y CLF/UF.
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` (snapshot de los flags MXN + CLF).

### Files owned

- `scripts/finance/task-990-berel-income-native-backfill.ts` (apply gated)
- `src/lib/finance/multi-currency/*` (CLF derivation; rama CLF del quote-to-cash materializer / `buildClfIncomeProjection`)
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- `docs/tasks/in-progress/TASK-1210-*.md`

## Current Repo State

### Already exists

- MXN: Slices 1–9 mergeados; cuenta Global66 MXN nativa creada y verificada (`global-66-mxn-mxn`, MXN, activa); dry-runs verdes (RFC 2/2, income native correcto); signal `fx_drift` excluye cuentas no-CLP por construcción (open question resuelta 2026-06-21).
- CLF: Slices 0–6 (type split, schema native/indexed, snapshot CLF→CLP, income projection gated, payment-order guard, 4 reliability signals); CLP entero + dry-run 7/7; triple doc + 5 flags en el ledger.

### Gap

- Flags MXN y CLF en OFF en todos los environments; workers Cloud Run sin redeploy con el código activo.
- Income de Berel sin plano nativo MXN (`native_amount=NULL`).
- Cotizaciones CLF de HubSpot con `subtotal/tax=0` → se proyectarían sin desglose neto/IVA (fix #1.1 NO implementado).
- Items CLF diferidos (expense-CLF writer, readers/reconciliación, revaluación-al-pago) sin consumer vivo.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `command`
- Source of truth afectado: `greenhouse_finance.income` (plano nativo), quote-to-cash materializer, feature flags MXN/CLF
- Consumidores afectados: `worker (ops-worker / projection), UI finance, reliability signals`
- Runtime target: `production` (vía staging primero)

### Contract surface

- Contrato existente a respetar: `upsertIncomeFromSale`, `buildClfIncomeProjection`, `resolveNuboxIncomeTaxCode`, VIEWs `*_normalized`
- Contrato nuevo o modificado: lógica de derivación de desglose neto/IVA en la rama CLF (sin nuevo endpoint; additive en el materializer)
- Backward compatibility: `gated` (flags default-OFF; income afecto/CLP existente bit-for-bit)
- Full API parity: el fix vive en el primitive de proyección server-side (`src/lib/finance/**`), no en UI; los consumers (materializer, Nexa, readers) lo heredan.

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_finance.income`, `payment_obligations`, `fx_snapshots`
- Invariantes que no se pueden romper:
  - **NO asumir IVA en todas las quotes.** Afecta/exenta se decide por cotización (y por línea si existe el desglose). Una quote exenta nunca recibe gross-up.
  - Income afecto: identidad `total = neto + IVA`. Income exento: `total = exento`, `IVA = 0`.
  - Plano CLP funcional CLF redondeado a entero; native UF conserva decimales.
  - El income CLP/fiscal existente queda bit-for-bit (el plano nativo es additive).
- Tenant/space boundary: vía la organización/cliente canónico resuelto por la quote/factura.
- Idempotency/concurrency: backfill idempotente con allowlist + expected-mutation-count; materializer reentrante.
- Audit/outbox/history: outbox `finance.income.created/updated`; `fx_snapshots` append-only.

### Migration, backfill and rollout

- Migration posture: `none` (schema CLF/MXN ya aplicado en tasks origen)
- Default state: `flag OFF` hasta verificación staging
- Backfill plan: Berel native plane — dry-run (`task-990-berel-income-native-dryrun.ts`) → apply allowlist (`28800562` + `29062197`, gated `FINANCE_MXN_BEREL_BACKFILL_APPLY_ENABLED`), abort si mutation count ≠ esperado
- Rollback path: apagar flags (revierte comportamiento sin tocar data); backfill se compensa vía supersede/reprojection desde la evidencia del dry-run
- External coordination: flip de env vars en Vercel + redeploy ops-worker; sign-off Finance

### Security and access

- Auth/access gate: capability finance existente; backfill = script operador con allowlist
- Sensitive data posture: `finance`
- Error contract: `canonicalErrorResponse` / `captureWithDomain('finance')`
- Abuse/rate-limit posture: `N/A — internal command/materializer`

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/finance/multi-currency` + tests del fix de desglose (fixtures de las 7 quotes CLF, ≥1 exenta)
- DB/runtime checks: dry-runs read-only (RFC, income native, CLF quotes); post-apply SELECT del plano nativo de Berel
- Integration checks: smoke staging con flags ON sobre una OC/cotización CLF real
- Reliability signals/logs: 4 signals indexed-unit (CLF) + signals MXN en steady `ok`
- Production verification sequence: ver Rollout Plan abajo

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumers nombrados con paths reales.
- [ ] Invariantes de datos, boundary y idempotencia explícitos.
- [ ] Posture de backfill/rollback explícita y proporcional al riesgo.
- [ ] Evidencia runtime/DB listada para cada cambio.
- [ ] Dominio sensible con errores canónicos, señales y sin fugas de data.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (no se llena al crear la task)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Fix de desglose neto/IVA en cotizaciones CLF (CÓDIGO)

- Implementar el plan TASK-995 §#1.1: derivar `subtotal` + `IVA` cuando la quote CLF trae solo `total`.
- Orden de resolución: (1) desglose real por línea si existe; (2) fallback despeje desde total + clasificación fiscal por cotización (afecta → `neto = round(total/1.19)`, `IVA = total − neto`; exenta → `neto=total`, `IVA=0`); (3) si no se puede clasificar con confianza → NO proyectar, marcar para revisión.
- Clasificación afecta/exenta desde el resolver fiscal existente (no heurística nueva).
- Tests con las 7 quotes CLF reales como fixtures, **incluyendo ≥1 exenta** para blindar la regla dura.
- Ejecutar **solo después** de que Codex libere la zona de cotizaciones/materializer (evitar conflicto).

### Slice 2 — Rollout MXN

- Flip de flags: `FINANCE_CORE_MXN_ENABLED`, `NUBOX_EXPORT_FOREIGN_CURRENCY_ENABLED`, `FINANCE_MXN_PAYMENT_ORDERS_ENABLED`, `FINANCE_MULTI_CURRENCY_REPORTING_ENABLED` (staging → prod).
- Redeploy ops-worker (bundle esbuild incluye `src/lib/{nubox,finance}` MXN al encender flags).
- Backfill Berel native plane: dry-run → apply allowlist (`28800562` + `29062197`).
- Verificación post-rollout: ambas filas income de Berel con `native_amount`/`native_currency` MXN + functional CLP intacto; señales MXN steady; `pnpm pg:doctor`.

### Slice 3 — Rollout CLF

- Flip de flags CLF: `FINANCE_CORE_CLF_INDEXED_ENABLED`, `FINANCE_CLF_INCOME_PROJECTION_ENABLED` (+ resto del set CLF) — staging → prod.
- Verificación con una OC/cotización CLF real: income CLP entero + plano native UF + snapshot indexed_unit; 4 signals indexed-unit steady.
- Actualizar el snapshot por environment en el Feature Flag State Ledger.

### Slice 4 — Items CLF diferidos (cablear cuando exista upstream)

- Expense-CLF writer (schema listo, sin upstream — las compras en UF aún no se registran como expense).
- Slice 5 de TASK-995: readers/reconciliación CLF.
- Revaluación-al-pago (delta `indexed_unit_revaluation`) + su signal.
- Mantener diferidos con razón documentada hasta que haya datos CLF reales (anti-drift).

## Out of Scope

- **Fix de convención de exento en expenses** (TASK-1209 follow-up, `expense-tax-snapshot.ts:431`): convención opuesta, riesgo de doble-conteo sobre el sync de compras → **task separada**, NO se cuela aquí.
- Rediseño de la UI de cotizaciones que Codex está ejecutando (`QuoteBuilderShell`, etc.).
- Corrección del dato origen en HubSpot (poblar subtotal/tax en la quote) si requiere trabajo HubSpot-side; aquí se deriva en la proyección.
- Cross-currency settlement de AR foráneo (pagar una factura MXN con CLP) — slice futura ya documentada en TASK-990.

## Detailed Spec

Ver TASK-995 §#1.1 (plan del fix con regla dura, orden de resolución, fixtures) y TASK-990 §"Slice 9 — Rollout sequence" (secuencia de flags + backfill + verificación). Esta task no redefine esos contratos; los ejecuta.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (fix de desglose) DEBE shipear ANTES de Slice 3 (rollout CLF) — encender la proyección CLF sin el fix materializaría income con total=0.
- Slice 1 DEBE ejecutarse DESPUÉS de que Codex libere la zona de cotizaciones (evitar conflicto de merge).
- Slice 2 (rollout MXN) es independiente de Slice 1/3 y puede ir primero (Berel es el caso vivo).
- Slice 4 (diferidos) solo cuando exista upstream real; nunca especular sin consumer.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Gross-up ciego sobre quote exenta → IVA inventado (descuadre SII) | finance/fiscal | medium | Regla dura: clasificar por cotización/línea; fixture exento obligatorio; si no clasifica → no proyectar | revisión manual + tests |
| Backfill Berel duplica o muta de más | finance | low | allowlist + expected-mutation-count + idempotencia (filas ya existen vía TASK-1209) | conteo income Berel = 2 |
| Worker no toma flags nuevos (env no redeployado) | finance/worker | medium | redeploy ops-worker explícito en la secuencia | señales MXN/CLF no salen de OFF |
| Conflicto de merge con Codex (zona quotes) | finance/commercial | medium | Slice 1 después de que Codex libere; rebase antes de implementar | git conflict |
| Flip CLF antes del fix → income total=0 | finance | medium | Slice ordering: 1 antes de 3 | dry-run CLF muestra subtotal/tax=0 |

### Feature flags / cutover

- MXN: `FINANCE_CORE_MXN_ENABLED`, `NUBOX_EXPORT_FOREIGN_CURRENCY_ENABLED`, `FINANCE_MXN_PAYMENT_ORDERS_ENABLED`, `FINANCE_MULTI_CURRENCY_REPORTING_ENABLED`, `FINANCE_MXN_BEREL_BACKFILL_APPLY_ENABLED` (todas default-OFF).
- CLF: `FINANCE_CORE_CLF_INDEXED_ENABLED`, `FINANCE_CLF_INCOME_PROJECTION_ENABLED` (+ resto del set CLF, default-OFF).
- Revert: env var a `false` + redeploy. Tiempo < 5 min vía Vercel/Cloud Run.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR del fix de desglose | <10 min | si |
| Slice 2 | flags MXN → false + redeploy; backfill compensa vía supersede/reprojection | <30 min | si (parcial el backfill) |
| Slice 3 | flags CLF → false + redeploy | <10 min | si |
| Slice 4 | Diferido — no introduce runtime hasta que exista upstream; nada que revertir (no se cablea sin datos CLF reales) | — | si |

### Production verification sequence

1. Slice 1 en local + tests (incl. fixture exento) verdes → commit.
2. Rollout MXN en staging: flags ON + redeploy worker → verify income existente intacto.
3. Backfill Berel dry-run staging → verify plan; apply allowlist → verify plano nativo en ambas filas.
4. Rollout CLF en staging: flags ON → verify una OC/cotización CLF real proyecta con desglose correcto + signals steady.
5. Repetir 2–4 en producción con cooldown entre ambientes.
6. Monitor signals (MXN + 4 indexed-unit CLF) 7d post-prod.

### Out-of-band coordination required

- Flip de env vars en Vercel (staging + prod) + redeploy ops-worker (Cloud Run).
- Sign-off Finance antes del backfill apply y del flip CLF.
- Coordinar redeploy de worker con TASK-1209 (comparten el mismo worker) para no redeployar dos veces.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] El fix de desglose CLF NO aplica IVA a quotes exentas: una quote exenta proyecta `IVA=0`, `total=exento` (verificado con fixture exento).
- [ ] Una quote CLF afecta con solo `total` proyecta `total = neto + IVA` con `neto = round(total/1.19)` (CLP entero).
- [ ] Si una quote CLF no se puede clasificar afecta/exenta con confianza, NO se proyecta (se marca para revisión) en vez de inventar IVA.
- [ ] Flags MXN en ON en producción; ops-worker redeployado; ambas filas income de Berel (`INC-NB-28800562`, `INC-NB-29062197`) tienen `native_amount`/`native_currency` MXN y functional CLP intacto.
- [ ] Flags CLF en ON en producción; una OC/cotización CLF real proyecta income CLP entero + plano native UF + snapshot indexed_unit.
- [ ] Las 4 reliability signals indexed-unit (CLF) y las signals MXN están en steady `ok` post-rollout.
- [ ] El Feature Flag State Ledger refleja el estado ON por environment de todos los flags MXN/CLF prendidos.
- [ ] Los items CLF diferidos (Slice 4) quedan documentados con razón + condición de cableado, sin sembrar consumer muerto.

## Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- Dry-runs read-only (RFC, income native, CLF quotes) + smoke staging con flags ON + `pnpm pg:doctor`

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado con el estado real.
- [ ] el archivo vive en la carpeta correcta.
- [ ] `docs/tasks/README.md` sincronizado.
- [ ] `Handoff.md` actualizado.
- [ ] `changelog.md` actualizado.
- [ ] chequeo de impacto cruzado ejecutado.
- [ ] `docs/operations/FEATURE_FLAG_STATE_LEDGER.md` actualizado con el estado final de los flags.

## Follow-ups

- TASK separada: fix de convención de exento en expenses (`expense-tax-snapshot.ts:431`, TASK-1209 follow-up).
- Cross-currency settlement de AR foráneo (MXN pagado en CLP) — slice futura de TASK-990.
- Corrección del dato origen de quotes CLF en HubSpot (poblar subtotal/tax), si se decide arreglar en la fuente además de derivarlo.

## Open Questions

- ¿Las quotes CLF traen desglose por línea (aunque el encabezado venga en 0)? Confirmar en Discovery — si existe, es la fuente preferida sobre el despeje.
