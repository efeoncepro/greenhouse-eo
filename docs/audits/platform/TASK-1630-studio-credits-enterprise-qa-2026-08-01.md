# QA Release Audit — TASK-1630 Studio Credits enterprise control plane

## Verdict

CONDITIONAL PASS

Closure state: el carril interno de fondeo, status, recovery, workbench y self-read está operativo live;
TASK-1483/TASK-1628 pasaron GVC y smoke autenticado. TASK-1630 permanece `in-progress` por paridad MCP write,
calibración/receipts transversales y dos holds históricos con resultado desconocido.

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
| Seguridad de incertidumbre | PASS | Dos runs históricos `submission_unknown` sin `providerOperationId` permanecen diferidos; no se cobra ni libera a ciegas. |
| Evidencia visual focal | PASS | Capturas autenticadas desktop de Greenhouse y Producer en `docs/operations/creative-studio/evidence/2026-08-01/`. |
| QA UI exhaustivo | PASS LIVE | TASK-1483 pasó desktop + drawer mobile y TASK-1628 desktop/mobile con 14 frames. El smoke Chrome autenticado confirmó ambas superficies desplegadas, sus cifras convergentes y cero errores de consola. |
| MCP write parity | PENDING | El gateway MCP actual es read-only; el carril interno no depende de ampliar autoridad MCP. |
| Finance 500k/calibración | PENDING | TASK-1468/TASK-1579 conservan receipts/calibración amplia y el ejercicio de volumen; no bloquean el fondeo interno live. |

## Risk disposition

| Riesgo residual | Severidad | Disposición |
| --- | --- | --- |
| Dos holds históricos mantienen edad alta | Medium | Mantener diferidos y observables; resolver sólo con evidencia autoritativa o procedimiento financiero explícito. Nunca force-release. |
| Drift futuro entre UI y readers | Medium | Mantener DTO-only, coverage/freshness y smoke autenticado por corte; nunca recalcular saldos en browser. |
| MCP no puede fondear | Low para carril interno | Mantener read-only hasta diseñar delegación/scopes/auditoría equivalentes; UI/API/CLI ya entregan operación end-to-end. |
| Rollout externo | High si se adelanta | Sigue gated por TASK-1480 y controles comerciales/tenant. |

## Final call

El sistema ya tiene una vía inmediata y recuperable por UI y CLI/API para fondear y leer créditos internos sin
segundo humano obligatorio. El corte es apto para operación interna enterprise con las condiciones anteriores;
no equivale a cerrar TASK-1630, monetización externa ni MCP write. TASK-1483 y TASK-1628 sí quedan completas.
