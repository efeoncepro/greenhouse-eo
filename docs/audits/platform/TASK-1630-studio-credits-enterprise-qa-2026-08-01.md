# QA Release Audit — TASK-1630 Studio Credits enterprise control plane

## Verdict

PASS

Closure state: el carril interno de fondeo, status, recovery, workbench, self-read y MCP write está operativo live;
TASK-1483/TASK-1628 pasaron GVC y smoke autenticado. Los dos holds históricos fueron adjudicados y liberados por
la primitive gobernada, y los 500.000 históricos quedaron sólo en auditoría append-only.

## Scope and risk

- Se revisó la autoridad económica única en Globe, el broker Greenhouse, la delegación CEO→agente, UI admin,
  CLI OAuth PKCE, self-view Producer, ciclo mensual, idempotencia, receipts, expiry y observabilidad.
- Los riesgos dominantes fueron doble ledger, segundo confirmador obligatorio, retry ciego, rollover sin pool,
  divergencia status↔reserve, filtración de autoridad al browser y liberación de holds con outcome ambiguo.
- El rollout externo y la monetización comercial permanecen fuera de este corte; `internal-only` describe el
  estadio, no cambia la naturaleza comercial de Globe.

## Skills and specialized review

- Arquitectura: `software-architect-2026`, `greenhouse-globe`.
- Finanzas/seguridad: `greenhouse-finance-accounting-operator`, `greenhouse-secret-hygiene`.
- UI/QA: `greenhouse-ai-design-studio`, `greenhouse-ui-enterprise-review`,
  `greenhouse-qa-release-auditor`, `greenhouse-gvc-playwright`.
- Operación/documentación: `greenhouse-production-release`, `vercel-operations`,
  `greenhouse-documentation-governor`.

## Evidence

| Gate | Result | Evidence |
| --- | --- | --- |
| Autoridad económica | PASS | Globe conserva pools, grants, allocations, ledger, reservations y receipts; Greenhouse guarda intents/provenance y adapta readers, sin segundo ledger. |
| Owner-operated approval | PASS | `requireSecondConfirmer` es policy opcional y está OFF para `greenhouse-org:efeonce`; UI y CLI permiten una instrucción atribuida del CEO ejecutada por humano o agente autenticado. |
| Fondeo live | PASS | Operación `23db5b0e-89dd-4661-9b8d-c12f9be4ad7a`: target/grant 800, cap 1500, pool `internal-month:2026-08`, capacidad `0 → 800`, cero blockers. |
| Readback convergente | PASS | Workbench Greenhouse, CLI OAuth PKCE y Producer leen 800 efectivos, funding 800, cap/remaining 1500 y spent/held 0. |
| Rollover mensual | PASS | Pool determinístico creado/reusado dentro de la transacción de funding; paused/closed/incompatible falla cerrado. Globe `649eb08`; CI/API/Studio verdes. |
| Idempotencia/recovery | PASS | list/get/status/reconcile y receipts autoritativos; outcome ambiguo exige readback y nunca repite la mutación económica. |
| Expiry worker | PASS | Scheduler minutely, topología `1×1`, flag activo, grants exactos. Canary `fmspk`: `claimed=2`, `reconciliationRequested=2`, `deferred=2`, `failed=0`. |
| Least privilege | PASS | El gap live se acotó a `SELECT`/`INSERT` en `governed_run_control_commands`; workflow `30717172080` aplicó y verificó el contrato exacto, sin owner ni grants amplios. |
| Seguridad de incertidumbre | PASS | Dos runs históricos sin `providerOperationId` y sin entregable fueron adjudicados por decisión Finance exacta; receipts gobernados liberaron 14+16 y terminalizaron ambos runs sin retry ni SQL. |
| Evidencia visual focal | PASS | Capturas autenticadas desktop de Greenhouse y Producer en `docs/operations/creative-studio/evidence/2026-08-01/`. |
| QA UI exhaustivo | PASS LIVE | TASK-1483 pasó desktop + drawer mobile y TASK-1628 desktop/mobile con 14 frames. El smoke Chrome autenticado confirmó ambas superficies desplegadas, sus cifras convergentes y cero errores de consola. |
| MCP write parity | PASS | `globe.credits.funding.ensure` acepta sólo `authorityId`; OAuth/Entra, WIF, token exchange y command Greenhouse pasaron canary real con resultado terminal `completed/no_effect`. |
| Finance 500k/calibración | PASS P0 | Los 500.000 se clasificaron `historical_internal_shadow_bootstrap`, nunca funding-eligible y se excluyeron de toda proyección operativa; TASK-1468/TASK-1579 conservan calibración amplia no bloqueante. |

## Risk disposition

| Riesgo residual | Severidad | Disposición |
| --- | --- | --- |
| Aparición tardía de evidencia provider de los dos holds | Low | No cobrar al workspace en silencio; registrar costo interno de excepción y exigir nueva decisión Finance. |
| Drift futuro entre UI y readers | Medium | Mantener DTO-only, coverage/freshness y smoke autenticado por corte; nunca recalcular saldos en browser. |
| Acceso MCP externo | High si se adelanta | El canary es interno y single-tenant; B2B/multitenant continúa gated por TASK-1631. |
| Rollout externo | High si se adelanta | Sigue gated por TASK-1480 y controles comerciales/tenant. |

## Final call

El sistema tiene vías inmediatas y recuperables por UI, API/CLI y MCP para fondear y leer créditos internos sin
segundo humano obligatorio. El corte cierra TASK-1630 como operación interna enterprise. No habilita monetización
externa, checkout ni identidad B2B/multitenant.
