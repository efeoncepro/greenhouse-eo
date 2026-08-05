# TASK-1585 — Globe Credit Admin: break-glass gobernado + retiro del HMAC (ADR-015 Slice H)

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
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-028`
- Status real: `Diseno`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `TASK-1584`
- Branch: `Greenhouse develop; Globe main; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Gobierna el **break-glass** de administración de crédito de Globe (TTL, motivo, autorización
atribuida, revocación automática, readback del corte, contador propio con señal
`globe.credit_admin.break_glass_active`) y ejecuta el **retiro del HMAC**: cuando la señal
`globe.credit_admin.legacy_hmac_approval_used` (TASK-1584) quede en cero por la ventana declarada,
el verificador dual pierde el formato legacy y `api_runtime` pierde el acceso al secreto
`globe-credit-approval-secret`. Es el Slice H de ADR-015 — el último paso del rollout §10.

## Why This Task Exists

El break-glass hoy es un procedimiento documentado (`GLOBE_RUNTIME_HANDOFF.md` § break-glass) que
depende de que alguien se acuerde de revocar, y su historia lo condena: se usó ≥3 veces para la
misma clase de acto ANTES del carril gobernado. Con el carril vivo (TASK-1566) el objetivo declarado
de ADR-015 es que su contador quede en **cero** — pero sin contador, la respuesta la da la memoria
de quien estuvo. Y un verificador dual sin retiro ejecutado es un esquema simétrico con pasos extra:
mientras el HMAC viva y `api_runtime` pueda leerlo, quien verifica puede forjar.

## Goal

- Todo uso de break-glass de crédito queda **atribuido** (quién, por qué, hasta cuándo), con
  **revocación automática al vencer el TTL** y **readback verificado del corte**.
- La señal `globe.credit_admin.break_glass_active` (steady = 0) existe y cuenta; el diagnóstico
  «¿se está usando como operación normal?» deja de depender de la memoria.
- El formato HMAC queda **retirado** del verificador dual tras la ventana declarada con la señal
  legacy en cero, y `api_runtime` **pierde** `secretmanager.versions.access` sobre
  `globe-credit-approval-secret`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/EFEONCE_GLOBE_GREENHOUSE_ADMINISTRATION_DECISION_V1.md` —
  **ADR-015** §8 (break-glass), §10 (rollout: el retiro del HMAC va AL FINAL) y Reglas duras.
- `docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md` — el procedimiento de break-glass
  vigente que esta task gobierna (grant temporal de `serviceAccountTokenCreator` + revocación con
  readback).
- `docs/operations/creative-studio/EFEONCE_GLOBE_IAC_RUNBOOK_V1.md` — todo cambio de IAM va por
  Terraform con plan leído; una mutación `gcloud` fuera de banda muere en el próximo apply.

Reglas obligatorias:

- **NUNCA** retirar el HMAC si `globe.credit_admin.legacy_hmac_approval_used` no estuvo en cero por
  la ventana declarada: reabrir ADR-015 con la evidencia de quién lo usa (gatillo de revisión
  explícito del ADR).
- **NUNCA** un break-glass sin TTL, motivo y autorización atribuida; **NUNCA** confiar la
  revocación a la memoria: es automática + readback.
- **SIEMPRE** que el corte se ejecute, verificar el CORTE (patrón de TASK-1503: grant → verificar →
  revocar → **verificar la revocación**).

## Normative Docs

- `docs/tasks/to-do/TASK-1584-globe-credit-admin-kms-disjoint-identities.md` — define el dual
  verifier, la señal legacy y la fecha de retiro que esta task ejecuta.
- `.claude/skills/greenhouse-globe/SKILL.md` § «Gasto y crédito en Globe» reglas 5 y 8.

## Dependencies & Impact

### Depends on

- `TASK-1584` completa: verificador dual + señal `legacy_hmac_approval_used` + fecha de retiro
  declarada. Sin eso, retirar el HMAC corta el único formato verificable.
- Ventana de observación cumplida (la declara TASK-1584 en ADR-015; típicamente N días con la señal
  en cero).

### Blocks / Impacts

- Cierra el roadmap de firma de ADR-015 (§4/§8/§10). Tras esto, el único camino de aprobación es
  asimétrico y el break-glass es válvula medida, no atajo.

### Files owned

En `efeonce-globe`:

- `apps/studio-web/src/credit-admin-approval.ts` — retiro del formato `hmac-v1` del dual verifier.
- `infra/terraform/{secrets,iam}.tf` — `api_runtime` pierde el accessor del secreto HMAC; recursos
  del break-glass gobernado (si la implementación usa IAM condicional con expiry).
- Scripts/tooling del break-glass (`scripts/**`) según la forma que el Plan Mode decida.

En `greenhouse-eo`: `docs/**` (ADR delta, runtime handoff, manual si el procedimiento operativo
cambia).

## Current Repo State

### Already exists

- Procedimiento de break-glass documentado y ejercido (grant temporal de tokenCreator + revocación
  manual con readback) en `GLOBE_RUNTIME_HANDOFF.md`.
- El retiro de la autoridad directa de credit-admin del caller genérico (TASK-1566 Delta (7)) — el
  break-glass ya NO da admin de crédito por esa vía; lo que queda por gobernar es el mecanismo
  genérico de impersonación temporal y el secreto HMAC.
- Señal-patrón para eventos estructurados (`globe.credit_admin.caller_authority_drift`).

### Gap

- El break-glass no tiene TTL automático, ni contador, ni señal: la revocación depende de la
  disciplina del operador.
- El secreto HMAC sigue vivo y legible por `api_runtime`; el dual verifier (cuando exista, TASK-1584)
  lo aceptará hasta que ESTA task lo retire.
- No existe `globe.credit_admin.break_glass_active`.

## Modular Placement Contract

- Topology impact: `worker`
- Current home: `efeonce-globe`: `apps/studio-web` (verificador) + `infra/terraform` (IAM/secrets)
- Future candidate home: `remain-shared`
- Boundary: el verificador de approvals del transporte y la política IAM del secreto HMAC; el
  break-glass gobernado es tooling de IAM con expiry, no una capability del spine (regla de
  ADR-015: infraestructura no se modela como command)
- Server/browser split: íntegramente server-side/IAM; esta task no tiene superficie de browser
- Build impact: `none` (sin dependencias nuevas esperadas; si el TTL usa IAM conditions, es HCL)
- Extraction blocker: `none`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: formato de evidencia de aprobación aceptado (retiro del legacy) +
  política IAM del secreto HMAC + procedimiento de break-glass
- Consumidores afectados: verificador de approvals; operadores que hoy usan el break-glass
- Runtime target: `production` (Cloud Run api + IAM/Secret Manager)

### Contract surface

- Contrato existente a respetar: el dual verifier de TASK-1584 con formato explícito versionado.
- Contrato nuevo o modificado: el verificador pasa a aceptar SOLO `kms-v1`; `hmac-v1` = rechazo con
  código canónico (no un error crudo).
- Backward compatibility: `breaking` — deliberado y gateado por la ventana de la señal legacy en
  cero; las aprobaciones son efímeras (TTL 15 min), no hay históricas activas que romper.
- Full API parity: sin superficie nueva; el break-glass NO se expone como capability.

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna tabla nueva obligatoria; si el contador de break-glass
  necesita persistencia, reusar el patrón de evento estructurado + Cloud Logging metric antes de
  crear tabla (decisión de Plan Mode, documentada).
- Invariantes que no se pueden romper:
  - Ningún break-glass sin TTL + motivo + atribución; revocación automática + readback.
  - El retiro del HMAC sólo con la señal legacy en cero por la ventana declarada.
  - Quien verifica no puede forjar (se preserva de TASK-1584; esta task la vuelve absoluta).
- Tenant/space boundary: sin cambios.
- Idempotency/concurrency: revocación idempotente (revocar lo ya revocado = no-op verificable).
- Audit/outbox/history: señal `globe.credit_admin.break_glass_active` (steady = 0) + registro
  atribuido de cada uso.

### Migration, backfill and rollout

- Migration posture: `none`.
- Default state: el retiro del HMAC es un acto explícito post-ventana, no un flag que se prende.
- Backfill plan: `n/a`.
- Rollback path: re-otorgar el accessor del secreto por Terraform + re-habilitar `hmac-v1` en el
  verificador (revert PR). Sólo como respuesta a un gatillo de revisión de ADR-015, nunca silencioso.
- External coordination: cambio IAM en GCP (Terraform), aviso al operador de que el procedimiento
  de break-glass cambia de forma.

### Security and access

- Auth/access gate: IAM; el break-glass gobernado exige autorización atribuida del operador.
- Sensitive data posture: el secreto HMAC nunca se loggea; tras el retiro, nadie lo lee.
- Error contract: rechazo de formato legacy con código canónico del spine.
- Abuse/rate-limit posture: el contador + señal ES la postura anti-abuso (detección, no prevención
  — resolución Safety vs Resilience de ADR-015).

### Runtime evidence

- Local checks: `pnpm check && pnpm build` en `efeonce-globe`; test de que `hmac-v1` se rechaza
  post-retiro, registrado en el script `test`.
- DB/runtime checks: readback de IAM del secreto (accessor ausente); `tofu plan` No changes.
- Integration checks: un `confirm` real KMS sigue verde post-retiro; un break-glass de ensayo
  expira solo y su revocación se verifica.
- Reliability signals/logs: `globe.credit_admin.break_glass_active` en cero; la señal legacy
  congelada en cero.
- Production verification sequence: ver Rollout Plan.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE (no llenar al crear la task)
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Break-glass gobernado

- Mecanismo de grant temporal con TTL + motivo + atribución (forma candidata: IAM conditions con
  expiry vía Terraform + tooling que registra el acto; decidir en Plan Mode), revocación automática
  al vencer y readback del corte.
- Señal `globe.credit_admin.break_glass_active` (evento estructurado + métrica; steady = 0) con su
  contador.
- Actualizar el runbook del break-glass en `GLOBE_RUNTIME_HANDOFF.md` a la forma gobernada.

### Slice 2 — Retiro del HMAC

- Verificada la ventana declarada con `legacy_hmac_approval_used` en cero: quitar `hmac-v1` del
  verificador (rechazo canónico), quitar el accessor de `globe-credit-approval-secret` a
  `api_runtime` en Terraform, y dejar el secreto en contención (sin lectores).
- Test de regresión: un approval HMAC bien formado se RECHAZA; un confirm KMS real sigue verde.
- Delta de cierre en ADR-015 (el §4 pasa de «transición» a «retirado»).

## Out of Scope

- Nada del carril de fondeo en sí (vivo desde TASK-1566).
- KMS, dual verifier y las identidades disjuntas (TASK-1584 — prerequisito).
- El desambiguador de negación (TASK-1586) y la superficie ui-ux del portal.
- Break-glass de OTROS dominios de Globe (promoción de rutas, etc.): esta task gobierna el de
  crédito; si el mecanismo resulta genérico, extenderlo es follow-up explícito.

## Detailed Spec

La forma la dicta ADR-015 §8. Decisión que el Plan Mode debe cerrar: si el TTL se implementa con
**IAM Conditions con expiry** (revocación por vencimiento, readback como verificación) o con un
**job de revocación** (más móvil, más superficie). Preferir la que revoca sin depender de un
proceso vivo. El contador puede ser una log-based metric sobre el evento estructurado antes que una
tabla — no crear persistencia nueva sin necesidad demostrada.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (break-glass gobernado) → Slice 2 (retiro del HMAC).
- Slice 2 tiene un GATE EXTERNO: la ventana declarada por TASK-1584 con la señal legacy en cero.
  Ejecutarlo antes viola el gatillo de revisión de ADR-015.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Retirar el HMAC con un consumidor legacy vivo | credit funding | low | gate de ventana con señal en cero; reabrir ADR si no llega a cero | `globe.credit_admin.legacy_hmac_approval_used` |
| Break-glass gobernado más lento que la emergencia que atiende | ops | medium | el TTL/atribución no agrega pasos al OTORGAMIENTO, solo a la evidencia; ensayo cronometrado en staging-interno | ensayo del runbook |
| Revocación automática falla en silencio | IAM | low | readback verificado como parte del acto + señal activa mientras el grant viva | `globe.credit_admin.break_glass_active` > 0 sostenido |

### Feature flags / cutover

- Sin flag para el retiro: es un acto explícito gateado por ventana + señal (un flag lo volvería
  reversible en silencio, que es lo contrario del punto). El break-glass gobernado es aditivo.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert PR del tooling; el procedimiento manual documentado sigue existiendo | <15 min | sí |
| Slice 2 | re-otorgar accessor por Terraform + revert del verificador — SOLO vía gatillo de revisión de ADR-015 | <30 min | sí, pero gobernado |

### Production verification sequence

1. Slice 1: ensayo completo de break-glass en el workspace interno — otorgar → usar → expirar →
   readback del corte; señal en 1 durante la ventana y en 0 después.
2. Gate: ventana declarada cumplida con señal legacy en cero (evidencia de Cloud Logging).
3. Slice 2: retiro aplicado; confirm KMS real verde; approval HMAC de ensayo rechazado con código
   canónico; readback del secreto sin lectores.

### Out-of-band coordination required

- Aviso al operador: el procedimiento de break-glass cambia de forma (runbook actualizado).
- Cambios IAM por Terraform con plan leído.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Un break-glass de ensayo queda atribuido (quién/por qué/hasta cuándo), expira solo, y el
  corte se verifica con readback.
- [ ] `globe.credit_admin.break_glass_active` cuenta el ensayo y vuelve a cero.
- [ ] `hmac-v1` se rechaza con código canónico post-retiro; un confirm KMS real sigue verde.
- [ ] `api_runtime` no tiene `secretmanager.versions.access` sobre `globe-credit-approval-secret`
  (readback de IAM como evidencia).
- [ ] El retiro se ejecutó SOLO tras la ventana declarada con la señal legacy en cero (evidencia
  adjunta al cierre).
- [ ] `pnpm check` + `pnpm build` verdes en `efeonce-globe`; tests registrados.

## Verification

- `cd ../efeonce-globe && pnpm check && pnpm build`
- `tofu plan` en No changes post-apply
- Readback IAM del secreto HMAC (cero lectores) y de la clave KMS
- Confirm real KMS verde post-retiro (smoke por el puente)

## Closing Protocol

- [ ] `Lifecycle` del markdown quedo sincronizado con el estado real
- [ ] el archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` quedo sincronizado con el cierre
- [ ] `Handoff.md` quedo actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes
- [ ] `changelog.md` quedo actualizado si cambio comportamiento, estructura o protocolo visible
- [ ] se ejecuto chequeo de impacto cruzado sobre otras tasks afectadas
- [ ] ADR-015 §4/§8 con delta de retiro ejecutado; `GLOBE_RUNTIME_HANDOFF.md` y la skill
  `greenhouse-globe` (reglas 5 y 8 de gasto/crédito) actualizadas

## Follow-ups

- Si el mecanismo de break-glass gobernado resulta genérico, task aparte para extenderlo a los
  break-glass de promoción de rutas (ADR-009) — no mezclarlo acá.

## Open Questions

- ¿IAM Conditions con expiry o job de revocación? Preferir revocación que no dependa de un proceso
  vivo; decidir en Plan Mode con evidencia.
- ¿La ventana declarada (N días con señal en cero) — cuánto? La declara TASK-1584 en su delta de
  ADR-015; esta task la hereda, no la inventa.
