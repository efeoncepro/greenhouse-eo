# TASK-1833 — Efeonce Auth Server Security Assurance and Operations

## Delta 2026-09-04 — acceso interno nativo (TASK-1836)

Incluir en aseguramiento la frontera de autoridad introducida por TASK-1836: sujetos internos y externos
bajo emisor común, binding upstream, baja efectiva, revocación multicontexto y aislamiento de consent/refresh.
El assessment de este slice consume su ADR y código; no bloquea el diseño inicial de TASK-1836.


## Delta 2026-09-04

- `TASK-1828` ya entregó parte de la base operativa que esta task asumía como gap — cerrado por trabajo en
  `TASK-1828`:
  - Rotación de llave: el equivalente de `rotateSigningKey` son `registerSigningKeyVersion` +
    `retireSigningKey` en `src/lib/auth-server/keys/signing-keys-store.ts` (solapamiento mínimo
    `SIGNING_KEY_MIN_OVERLAP_MS` = 1 h, `force` explícito), con CLI `pnpm auth-server:rotate-key`
    (`scripts/auth-server/rotate-signing-key.ts`). La rotación ya se ejercitó en staging: v1 → v2, JWKS con dos
    `kid`, v2 `active` y v1 `retiring`.
  - Señales: `auth.issuer.jwks_unreachable` (kind runtime; `not_configured` hasta declarar
    `AUTH_SERVER_JWKS_URL` en Vercel) y `auth.signing_keys.lifecycle` (kind data_quality) en
    `src/lib/reliability/queries/auth-server-signals.ts`.
  - Runbook base `docs/operations/runbooks/auth-server.md`; audit append-only en
    `greenhouse_auth.signing_key_events`.
- **Queda en esta task:** retiro programado de la versión 1 (hoy `retiring`; retiro pendiente con ≥ 1 h de
  solapamiento), scheduler trimestral `ops-auth-key-rotate` + `auth.keys.rotation_overdue`, señal
  `auth.kms.sign_failures`, jobs de retención, red-team agéntico, pentest externo, runbooks de incidente y
  revocación masiva, y la revisión de privacidad V2.
- Sigue bloqueada por `TASK-1829` y `TASK-1830` (superficie completa a auditar); la rotación y las señales base
  ya se pueden verificar contra el runtime en staging.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-044`
- Status real: `Especificación; desde 2026-09-04 existen rotación manual ejercitada (registerSigningKeyVersion/retireSigningKey, CLI auth-server:rotate-key), 2 señales base y el runbook base de TASK-1828; sin red-team, pentest, scheduler de rotación, retención ni privacidad V2; retiro de la versión 1 (retiring) pendiente`
- Rank: `TBD`
- Domain: `platform|identity|ops`
- Blocked by: `TASK-1829 y TASK-1830 en staging (superficie completa a auditar)`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Asegurar y hacer operable el authorization server antes del primer cliente pagando: red-team agéntico
cruzado (Fable 5.1 y GPT 5.6 High con roles adversarios sobre la superficie real en staging), pentest externo
con hallazgos críticos cerrados, rotación de llaves KMS ejercitada y programada, señales de reliability
completas, runbooks de incidente, revocación masiva y recuperación, retención y postura frente a la Ley
21.719 (vigente 2026-12-01). El ADR nativo asumió la operación permanente; esta task es donde esa
responsabilidad se vuelve verificable.

## Why This Task Exists

La operación 24/7 de un servicio de autenticación público fue el argumento que hizo caro el camino nativo.
Los agentes comprimen el build, no la responsabilidad. Sin un ciclo de aseguramiento explícito, el primer
incidente se descubre con un cliente adentro. Además, la revisión de privacidad de agosto quedó escrita para
un subprocesador externo y debe reescribirse para un tratamiento propio.

## Goal

- Red-team agéntico: catálogo de abuse cases (CIMD SSRF, PKCE downgrade, reuso de código/refresh, open
  redirect, enumeración, brute force TOTP, replay de challenge WebAuthn, confused deputy por cliente,
  token del issuer externo sobre tool interna, JWKS poisoning) con resultado por caso y fix aplicado.
- Pentest externo contratado sobre staging con alcance documentado; hallazgos críticos y altos cerrados.
- Rotación de llave ejercitada en staging y producción; programación trimestral por Cloud Scheduler
  (`ops-auth-key-rotate`) con verificación post-rotación.
- Señales de reliability del dominio registradas en el control plane con steady y severidad.
- Runbooks: incidente de emisor comprometido (revocación masiva + rotación de emergencia), revocación por
  organización, persona bloqueada, JWKS caído, KMS caído.
- Revisión de privacidad V2 (tratamiento propio): datos tratados, minimización, retención por tabla, ARCO,
  notificación de brechas, registro de actividades.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md` (§4-pillar scoring, §Hard rules)
- `docs/architecture/GREENHOUSE_RELIABILITY_CONTROL_PLANE_V1.md`
- `docs/architecture/GREENHOUSE_AUTH_RESILIENCE_V1.md`
- `docs/architecture/agent-invariants/OPS_RELIABILITY_AGENT_INVARIANTS.md`
- `docs/operations/EFEONCE_CUSTOMER_IDENTITY_PRIVACY_REVIEW_V1.md`

Reglas obligatorias:

- NUNCA cerrar un hallazgo crítico "con mitigación documentada"; se cierra con fix verificado en staging.
- NUNCA rotar la llave sin solapamiento; NUNCA retirar un `kid` con tokens vigentes.
- Skills: `legal-privacy-ip-operator` para la revisión V2; `greenhouse-secret-hygiene` para rotación; `greenhouse-qa-release-auditor` para el veredicto de cierre.

## Normative Docs

- `docs/operations/runbooks/auth-server.md` (creado por `TASK-1828`)
- `docs/operations/FEATURE_FLAG_STATE_LEDGER.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-1829`, `TASK-1830` en staging con flags ON; `TASK-1828` para llaves y señales base.
- Proveedor de pentest contratado por el operador (fuera del repo).

### Blocks / Impacts

- `TASK-1832` Slice 3 cuando la organización es un cliente pagando.
- `TASK-1834`: no converge el login sin este cierre.

### Files owned

- `docs/audits/auth-server/AUTH_SERVER_RED_TEAM_<fecha>.md` (nuevo)
- `docs/audits/auth-server/AUTH_SERVER_PENTEST_<fecha>.md` (nuevo, redactado)
- `docs/operations/runbooks/auth-server-incident.md`, `auth-server-key-rotation.md` (nuevos)
- `docs/operations/EFEONCE_CUSTOMER_IDENTITY_PRIVACY_REVIEW_V2.md` (nuevo)
- `src/lib/reliability/queries/auth-server-*.ts` (nuevo: señales)
- `services/ops-worker/deploy.sh` + Cloud Scheduler `ops-auth-key-rotate` (rotación programada)
- `src/lib/auth-server/**` (fixes derivados del red-team/pentest)

## Current Repo State

### Already exists

- Reliability Control Plane con registry de señales y dashboard `/admin/operations`.
- Patrón de rotación con verify-before-cutover (`pnpm secrets:rotate`) y Cloud Scheduler en `ops-worker`.
- Revisión de privacidad V1 (subprocesador).
- **Desde `TASK-1828` (2026-09-04):** commands `registerSigningKeyVersion`/`retireSigningKey`
  (`src/lib/auth-server/keys/signing-keys-store.ts`, solapamiento mínimo 1 h) y CLI
  `pnpm auth-server:rotate-key`; rotación ejercitada en staging (KMS `auth-server-es256` v2 `active`, v1
  `retiring`); señales `auth.issuer.jwks_unreachable` y `auth.signing_keys.lifecycle`
  (`src/lib/reliability/queries/auth-server-signals.ts`); runbook base `docs/operations/runbooks/auth-server.md`;
  audit append-only `greenhouse_auth.signing_key_events`; IAM mínimo (SA `auth-server@` signerVerifier +
  cloudsql.client; deployer `cloudkms.viewer`).

### Gap

- Sin abuse cases, pentest, runbooks de incidente/revocación masiva ni scheduler de rotación; privacidad V1
  no aplica al tratamiento propio.
- Señales pendientes: `auth.kms.sign_failures`, `auth.keys.rotation_overdue`, `auth.oauth.*`, `auth.person.*`;
  `auth.issuer.jwks_unreachable` sigue `not_configured` hasta declarar `AUTH_SERVER_JWKS_URL` en Vercel.
- Retiro programado de la versión 1 de la llave (hoy `retiring`) y retención por tabla sin ejecutar.

## Modular Placement Contract

- Topology impact: `worker`
- Current home: `src/lib/auth-server/**`, `src/lib/reliability/queries/**`, `services/ops-worker/**` (scheduler), docs
- Future candidate home: `worker`
- Boundary: señales leídas por el control plane; rotación invocada por Cloud Scheduler → `ops-worker` → command de `TASK-1828`
- Server/browser split: server
- Build impact: none
- Extraction blocker: none

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `greenhouse_auth.signing_keys` (rotación), registry de señales
- Consumidores afectados: control plane, operadores, `TASK-1832`
- Runtime target: `worker` y `cron`

### Contract surface

- Contrato existente a respetar: registry de señales; `registerSigningKeyVersion`/`retireSigningKey` de `TASK-1828` (equivalentes de `rotateSigningKey`)
- Contrato nuevo o modificado: endpoint `POST /auth/keys/rotate` en `ops-worker` (autenticado por OIDC de Scheduler) `[verificar patrón vigente de endpoints programados]`
- Backward compatibility: `compatible`
- Full API parity: la rotación y la revocación masiva son commands con capability (`auth.keys.rotate`, `auth.access.revoke_all`) operables por CLI/Admin/Nexa vía propose→confirm

### Data model and invariants

- Entidades/tablas/views afectadas: `signing_keys`; tablas de `TASK-1829/1830` para retención
- Invariantes que no se pueden romper:
  - `Retención: authorization_codes 24 h, magic_link_tokens 7 días, refresh revocados 90 días, auth_attempts 12 meses, audit append-only.`
  - `Rotación programada sólo si la última rotación verificada tiene más de 80 días.`
- Write-target allowlist: `N/A — sin tablas nuevas`
- Tenant/space boundary: n/a
- Idempotency/concurrency: rotación idempotente por ventana; job de retención por lotes
- Audit/outbox/history: audit de rotación y de revocación masiva

### Migration, backfill and rollout

- Migration posture: `none` (jobs de retención usan tablas existentes)
- Default state: scheduler `paused` hasta la primera rotación manual verificada
- Backfill plan: none
- Rollback path: pausar scheduler; retirar señal
- External coordination: pentest externo; Cloud Scheduler; Sentry alert rules

### Security and access

- Auth/access gate: commands con capability; scheduler por OIDC
- Sensitive data posture: reportes de pentest redactados en el repo; detalle completo fuera del repo
- Error contract: `captureWithDomain`
- Abuse/rate-limit posture: verificada por el red-team; umbrales documentados

### Runtime evidence

- Local checks: `pnpm vitest run src/lib/auth-server src/lib/reliability/queries`
- DB/runtime checks: `signing_keys` con historial de rotación; conteos de retención
- Integration checks: rotación en staging y producción con JWKS de dos `kid`; revocación masiva en staging
- Reliability signals/logs: `auth.issuer.jwks_unreachable`, `auth.kms.sign_failures`, `auth.oauth.code_reuse_detected`, `auth.oauth.refresh_reuse_detected`, `auth.person.*`, `auth.keys.rotation_overdue`
- Production verification sequence: ver Rollout

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada en el allowlist — N/A, sin tablas nuevas.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

<!-- ZONE 2 — PLAN MODE: lo produce el agente que toma la task. -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Red-team agéntico y fixes

- Catálogo de abuse cases; ejecución cruzada por dos agentes con rol adversario sobre staging; fixes en las tasks dueñas o aquí si son de hardening.

### Slice 2 — Señales, rotación y retención

- Señales registradas; `auth.keys.rotation_overdue`; scheduler de rotación; jobs de retención.

### Slice 3 — Runbooks y privacidad V2

- Runbooks de incidente/rotación/revocación; revisión de privacidad V2; registro de actividades de tratamiento.

### Slice 4 — Pentest externo

- Alcance, ejecución sobre staging, cierre de críticos/altos, informe redactado.

## Out of Scope

- Cambios funcionales del protocolo o de la autenticación (vuelven a `TASK-1829/1830`).
- Certificaciones formales (SOC 2, ISO 27001).

## Detailed Spec

- Red-team: cada agente recibe la superficie (metadata, endpoints, contratos) y un objetivo por caso; la
  evidencia es un request reproducible; el otro agente intenta refutar el hallazgo antes de aceptarlo
  (los hallazgos de subagentes fallan hacia el daño máximo).
- Rotación: `registerSigningKeyVersion` → verificación de JWKS con dos `kid` → espera ≥ `SIGNING_KEY_MIN_OVERLAP_MS` (1 h, mayor que el TTL del access token) → `retireSigningKey` del viejo.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3 → Slice 4. El pentest (Slice 4) sólo sobre la superficie ya endurecida por Slice 1.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Hallazgo crítico tardío bloquea la cohorte | rollout | medium | red-team temprano; pentest antes de clientes pagando | informe |
| Rotación programada retira un `kid` con tokens vigentes | identity | low | solapamiento fijo ≥ TTL máximo + margen; verificación post-rotación | `auth.issuer.jwks_unreachable` |
| Retención borra evidencia de un incidente | ops | low | audit append-only excluido; retención por tabla documentada | revisión de runbook |

### Feature flags / cutover

- Scheduler `ops-auth-key-rotate` nace `paused`; se activa tras la primera rotación manual verificada.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert de fixes individuales | variable | sí |
| Slice 2 | pausar scheduler; retirar señal | < 5 min | sí |
| Slice 3 | revert del PR de runbooks/privacidad; sin efecto en runtime | < 5 min | sí |
| Slice 4 | el informe no cambia runtime; los fixes derivados se revierten en su task dueña | < 5 min | sí |

### Production verification sequence

1. Staging: red-team completo con hallazgos cerrados.
2. Staging y producción: rotación manual verificada; scheduler activado.
3. Producción: señales steady 7 días; runbooks probados en simulacro de revocación masiva en staging.
4. Pentest cerrado antes de la primera organización pagando.

### Out-of-band coordination required

- Contratación del pentest; validación de la revisión de privacidad V2 por abogado habilitado.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Revisar hallazgos A1–A7 y evidencia de docs/audits/2026-09-04-task-1836-mcp-design-audit.md; el cierre documental de la auditoría no acredita mitigaciones runtime ni pentest.

- [ ] Cambio de frontera de TASK-1836 cubierto por assurance: externo del mismo issuer sin autoridad interna, binding no derivado de email y revocación con token vigente.

- [ ] Catálogo de abuse cases con ≥ 10 casos ejecutados, cada uno con resultado y refutación cruzada.
- [ ] Pentest externo con alcance documentado y sin críticos/altos abiertos.
- [ ] Rotación de llave ejercitada en staging y producción; scheduler trimestral activo con verificación.
- [ ] Señales del dominio registradas en el control plane con steady y severidad.
- [ ] Runbooks de incidente, rotación y revocación masiva publicados y ensayados en staging.
- [ ] Revisión de privacidad V2 publicada con retención por tabla y registro de actividades.

## Verification

- `pnpm vitest run src/lib/auth-server src/lib/reliability/queries`
- simulacro de revocación masiva en staging
- `pnpm qa:gates --changed` y veredicto del QA release auditor

## Closing Protocol

- [ ] `Lifecycle` sincronizado y archivo en la carpeta correcta
- [ ] `docs/tasks/README.md`, `Handoff.md` y `changelog.md` actualizados
- [ ] chequeo de impacto cruzado sobre `TASK-1832`, `TASK-1834`
- [ ] ledger de flags al día

## Follow-ups

- Repetir red-team en cada cambio de protocolo; pentest anual.

## Open Questions

- Proveedor y alcance del pentest; decisión del operador.

## Correction 2026-09-05 — TASK-1836

Evaluar propuesta D1–D7 de TASK-1836: OIDC puro, procedencia corporativa, factor local fuerte, contexto opaco firmado y permiso vigente leído por request; no dar por implementada la corrección documental.
