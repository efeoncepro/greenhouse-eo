# TASK-939 — Limpieza física de account_balances pre-genesis stale (4 cuentas)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P3`
- Impact: `Bajo`
- Effort: `Medio`
- Type: `remediation`
- Epic: `none`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `finance`
- Blocked by: `TASK-714 (wrinkle de transferencias internas — ver Why)`
- Branch: `task/TASK-939-stale-pre-genesis-cleanup`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Hay ~970 filas `account_balances` con `balance_date < genesis_date` del OTB activo, repartidas en 4 cuentas (global66-clp 30, santander-clp 333, santander-usd 303, sha-cca-julio-reyes-clp 303). Son **proyecciones derivadas stale** que el cascade OTB (TASK-703b) debió prunear pero un rematerialize sin genesis floor re-creó. **Hoy son inofensivas** — no afectan ningún saldo vigente y el detector ya las ignora (TASK-938). Esta task las limpia físicamente, de forma gated, una vez resuelto el wrinkle de transferencias internas.

## Why This Task Exists

Derivada de TASK-938 (que cerró la **causa** + apagó la alarma sin tocar saldos). Lo que queda es **higiene de datos**, no un bug activo:

- **No urgente.** Las filas no afectan el saldo vigente de ninguna cuenta (el saldo se deriva desde el OTB anchor hacia adelante; las filas pre-anchor no entran). Verificado en TASK-938.
- **No hacen sonar alarmas.** El detector `finance.account_balances.fx_drift` ya ignora fechas `< genesis` del OTB activo (TASK-938 Slice 2). Y el genesis floor del rematerializer (TASK-938 Slice 3) evita que se re-creen.
- **No es plata mal contada.** Son saldos calculados viejos que sobran (cálculo derivado), no registros de dinero.

**Wrinkle que BLOQUEA el borrado simple (descubierto en TASK-938):** el mecanismo canónico de limpieza (`cascade_supersede_pre_otb_transactions`) también marca `superseded_by_otb_id` las `settlement_legs` pre-genesis. Para global66 esas legs son **transferencias internas entrantes desde Santander** (5 legs: $1.078.750, $668.825, $1.137.362, $437.077, $291.026). Marcar solo el lado de global66 (mientras el lado Santander queda activo, porque su OTB es 02-28 y esas fechas son post-genesis para Santander) puede **desbalancear el par de transferencia interna** (área TASK-714 / detector `task714d`). Hay que resolver esto ANTES de correr el cascade, o el par queda asimétrico.

## Goal

- 0 filas `account_balances` con `balance_date < genesis_date` del OTB activo, en las 4 cuentas (o decisión documentada de conservarlas).
- Sin desbalancear ningún par de transferencia interna (Santander↔global66).
- Sin tocar ningún saldo vigente ni ningún registro de dinero real (income/expense payments).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/tasks/complete/TASK-938-global66-otb-cascade-incomplete-fx-drift.md` (causa raíz + por qué se difirió el borrado)
- `docs/tasks/complete/TASK-703-canonical-opening-trial-balance-and-liability-accounting.md` (OTB cascade-supersede)
- CLAUDE.md — "Finance — OTB cascade-supersede (TASK-703b)" + "Finance — Rolling rematerialize anchor contract (TASK-871)" (regla TASK-938 del genesis floor)
- TASK-714 / detector `task714d.internalTransferGroupsWithMissingPair` (invariante de pares de transferencia interna)

Reglas obligatorias:

- **NUNCA** DELETE manual de `account_balances`. Usar `cascade_supersede_pre_otb_transactions` (gated, dry-run primero).
- **NUNCA** correr el cascade sin antes resolver el efecto en las `settlement_legs` de transferencias internas (no dejar el par asimétrico).
- **NUNCA** tocar income/expense payments (la plata real). El cascade no los toca por diseño — verificar que siga así.
- Mutación finance → dry-run + autorización operador explícita + idempotencia + snapshot pre/post.

## Dependencies & Impact

### Depends on

- TASK-938 (✅ complete) — genesis floor + detector floor ya shipped; sin ellos esto recurriría.
- TASK-714 — entendimiento del invariante de pares de transferencia interna (el wrinkle).
- `cascade_supersede_pre_otb_transactions(account_id, obtb_id, genesis_date, reason)` (migration `20260428085056958`).

### Blocks / Impacts

- Ninguna task bloqueada (es higiene). No afecta saldos vigentes.

### Files owned

- `docs/tasks/.../TASK-939-*.md`
- (posible) script one-shot `scripts/finance/cleanup-pre-genesis-balances.ts` (gated, dry-run).

## Current Repo State

### Already exists

- Función cascade canónica (borra account_balances < genesis + supersede legs < genesis).
- Detector + rematerializer ya respetan el genesis floor (TASK-938).
- Diagnóstico completo de las 4 cuentas en TASK-938 (cuentas, fechas, conteos).

### Gap

- Las ~970 filas stale siguen físicamente en la tabla (ruido).
- El wrinkle de transferencias internas no está resuelto (un solo lado superseded).
- No está decidido si los OTBs 02-28 de santander/sha-cca deben absorber la historia 2025 (review finance).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Resolver el wrinkle de transferencias internas (diseño + read-only)

- Mapear los pares de transferencia interna que cruzan un genesis (legs Santander↔global66 pre-genesis de un lado).
- Decidir el tratamiento canónico: ¿superseder ambos lados del par? ¿el par completo se absorbe en los dos OTBs respectivos? Coordinar con el invariante TASK-714.
- Verificar que el cascade no deje `task714d` (pares asimétricos) ni `fx_drift` peor.

### Slice 2 — Review finance de los OTBs 02-28 (santander/sha-cca)

- Confirmar si los OTBs 02-28 (santander-clp $5.703.909, santander-usd USD 2.591, sha-cca $0 estimado) deben prunear la historia 2025 (≈940 filas) o si esa historia debe conservarse por alguna razón de reporting.
- Decisión documentada con el operador/finance.

### Slice 3 — Cleanup gated (dry-run → apply, por cuenta)

- Re-correr `cascade_supersede_pre_otb_transactions` por cuenta (o un script one-shot equivalente) con dry-run (preview de filas a borrar + legs a superseder) → autorización → apply.
- Snapshot pre/post. Verificar: 0 filas pre-genesis, saldo vigente intacto, signals `fx_drift`/`task714d` en steady state.

## Out of Scope

- Re-introducir el bug (ya cerrado por TASK-938). El genesis floor se queda.
- Tocar el detector fx_drift (ya correcto).
- Tocar income/expense payments.

## Rollout Plan & Risk Matrix

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal |
|---|---|---|---|---|
| Desbalancear par de transferencia interna al superseder un lado | finance / itx (TASK-714) | medium | Slice 1 lo resuelve ANTES del cascade; verificar `task714d`=0 post | `task714d.internalTransferGroupsWithMissingPair` |
| Borrar historia 2025 que alguien necesitaba | finance reporting | low-medium | Slice 2 review finance + decisión documentada antes de apply | n/a (revisión humana) |
| Tocar saldo vigente | finance | very low | el saldo vigente no deriva de filas pre-genesis (verificado TASK-938); dry-run + snapshot pre/post | `fx_drift` |

### Feature flags / cutover

Sin flag — recovery one-time gated. Dry-run obligatorio + autorización operador por cuenta.

### Rollback plan per slice

- Slice 3: el supersede de legs es append-only (audit-preserved); las account_balances borradas se rematerializan desde el OTB (con genesis floor, NO re-crean pre-genesis). Snapshot pre-apply permite comparar.

## 4-Pillar Score

- **Safety**: mutación gated + dry-run + autorización por cuenta; no toca saldos vigentes ni plata real; blast radius acotado a filas derivadas pre-genesis. Residual: el wrinkle de transferencias internas (Slice 1 lo cierra).
- **Robustness**: cascade idempotente (filtra por genesis_date); rematerialize idempotente con genesis floor.
- **Resilience**: signals `fx_drift` + `task714d` detectan regresión (steady=0).
- **Scalability**: 4 cuentas, ~970 filas — trivial; one-shot.

## Hard Rules

- **NUNCA** DELETE manual de account_balances — usar el cascade.
- **NUNCA** correr el cascade sin resolver el wrinkle de transferencias internas (Slice 1).
- **NUNCA** tocar income/expense payments.
- **SIEMPRE** dry-run + snapshot pre/post + autorización por cuenta.

## Open Questions

- ¿El tratamiento canónico de un par de transferencia interna que cruza un genesis es superseder ambos lados, o el par completo queda absorbido en los dos OTBs? (Slice 1, coordinar TASK-714.)
- ¿Los OTBs 02-28 de santander/sha-cca deben prunear la historia 2025? (Slice 2, review finance.)
