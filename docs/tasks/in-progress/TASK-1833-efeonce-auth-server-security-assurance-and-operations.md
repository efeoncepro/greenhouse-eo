# TASK-1833 — Efeonce Auth Server Security Assurance and Operations

## Revalidación 2026-10-25 — assurance para producción controlada Rooms

Julio autorizó el goal de producción controlada Auth + Rooms y el correo real únicamente a
`jreyes@efeoncepro.com`. El coordinador conserva infraestructura/release/env/envíos. Esta revisión sólo
hizo discovery, lectura pública y metadata GCP; no ejecutó mutaciones cloud, correo ni nuevos modelos/API pagadas.
Steering posterior explícito de Julio: «Pentest contratado? No. Hazlo tu. No le pagaré a nadie mas». La evaluación ofensiva y refutación se ejecutan por los agentes disponibles, sin proveedor externo, API pagadas ni pareo obligatorio de modelos. La evidencia no se presenta como certificación de un tercero.

Plan y matriz A1–A7: [TASK-1833-plan](../plans/TASK-1833-plan.md).

- TASK-1829/TASK-1830 ya ofrecen superficie implementada y autenticada; sus cierres parciales no bloquean
  iniciar este aseguramiento. No se declaran completas sus matrices pendientes de navegador/cohortes.
- El piloto interno controlado y el cierre de esta task son hitos distintos. La evaluación ofensiva reproducible y refutada permanece
  exigida antes de la primera organización cliente pagando; no se presenta este canary como pentest, cierre
  total de assurance ni autorización de expansión. Los gates de rollout aplicables siguen abiertos hasta su evidencia.
- Los párrafos fechados de septiembre se conservan como historia, no describen la operación actual. Existe
  GC horario y ocho señales base; no se deben reconstruir como capacidades ausentes.
- Readback 2026-10-25T21:55Z: `auth-server-00165-kn4` Ready/100%; `/healthz` y `/readyz` 200,
  PG/KMS/activeKey `ok`, SHA `ba15711d022cb0450e2e9d185e692d02631fc306`; metadata aún sólo MCP.
  JWKS publica dos kids históricos. Scheduler `ops-auth-ephemeral-gc` ENABLED, `13 * * * *`,
  America/Santiago, último intento `21:13:03Z`. `ops-auth-key-rotate` no existe en us-east4.
- KMS v1/v2 siguen ENABLED/HSM (creadas 2026-09-04). Eso y el JWKS público no prueban el estado
  SQL ni antigüedad exacta de `retiring`; CLI `rotate-key --status` no pudo consultarlo por falta del
  `AUTH_SERVER_KMS_KEY` local. Requiere readback SQL/config del coordinador antes de retirar ninguna llave.

## Delta 2026-09-07 — assurance de entry, RP y consentimiento

El ADR `docs/architecture/EFEONCE_ID_RELYING_PARTY_ENTRY_AND_CONSENT_DECISION_V1.md` agrega casos obligatorios al
aseguramiento previo a Production: spoofing de contexto/marca RP, degradación de un cliente delegado a first-party,
reuso cross-RP de code/token/cookie/session, open redirect y loops de legacy/recovery. Debe probarse además que una
sesión suficiente permite fast path first-party sin consentimiento, mientras un cliente MCP nuevo, scopes elevados o
una operación que exige step-up conservan autorización explícita. Estas pruebas cubren el contrato transversal y
TASK-1834 como primer consumer; no declaran la convergencia implementada ni reabren la certificación ya observada.

## Delta 2026-09-06 — el red-team cierra los dos tests abiertos de TASK-1831

Dos abuse cases de esta task —**token del issuer externo sobre tool interna** y **confused deputy por
cliente**— son, palabra por palabra, los criterios de aceptación (a) y (b) que `TASK-1831` dejó abiertos:

- (a) token externo con scope string internal-only → deny en dispatch con señal redactada
- (b) `roles` con string de escritura y sin scope delegado → deny, también en el issuer Entra

`TASK-1831` está desplegada con el carril interno verificado, pero esos dos tests siguen sin tildar porque no
existe membership externa real; el "rechazo ajeno" que sí se probó es interno contra interno. El Slice 1 de
esta task los ejercita sintéticamente contra staging, sin esperar a un cliente externo.

**Contrato entre ambas tasks:** el red-team produce el request reproducible y la refutación cruzada; el fix, si
lo hay, y el tilde del criterio son de `TASK-1831`, que es la dueña del verifier en `../efeonce-mcp`. Ninguna de
las dos ejecuta el caso dos veces. Coordinar antes de correr el Slice 1.


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

- Lifecycle: `in-progress`
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
- Status real: `2026-10-26: assurance propio conserva pruebas/señales locales y revisión entre agentes; no pentest completo ni certificación externa. Canary real Auth/Rooms con Microsoft/MFA, un correo y una imagen completado y cerrado OFF; Auth00168-vzb100%, SHA754a2a28, health/ready/discovery200. Esto no cierra abuso ofensivo refutado, privacidadV2, rotación programada, ensayos de runbooks ni steady7d. PR263/264 de control de despliegue retenidas por el operador, sin merge/deploy.`
- Rank: `TBD`
- Domain: `platform|identity|ops`
- Blocked by: `none`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Conciliación vigente — 2026-10-26

Canary de identidad y correo ya completado: [canary real cerrado](../../audits/rooms/2026-10-26-auth-rooms-real-image-canary.md). [Auth retenido en PR](../../audits/rooms/2026-10-26-auth-deploy-control.md). No ampliar esa prueba a assurance completo, login Greenhouse, clientes o nueva activación. CI general y Vercel de ambos HEAD PR263/264 PASS según el [readback documental26Oct](../../audits/rooms/2026-10-26-docs-skills-state-readback.json); ambas PR siguen abiertas y retenidas. Los criterios aún abiertos abajo mantienen su razón y alcance.

El estado consolidado vigente y el siguiente bloque están en [contrato para Claude Design](../../documentation/rooms/backend-api-for-claude-design.md). Producción conserva los flags humanos OFF; conectar el diseño no autoriza activarlos ni repetir el correo único. Auth permanece en PR por decisión expresa del operador.

## Summary

Asegurar y hacer operable el authorization server antes del primer cliente pagando: evaluación ofensiva por los agentes disponibles, refutación independiente y retest
con hallazgos críticos/altos cerrados, rotación de llaves KMS ejercitada y programada, señales de reliability
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
  spoofing/degradación de clase RP, cross-RP code/token/session, loops de recovery, token del issuer externo sobre
  tool interna, JWKS poisoning) con resultado por caso y fix aplicado.
- Evaluación ofensiva propia sobre entorno aislado/staging autorizado, con catálogo>=10 casos reproducibles, revisión de un agente separado, retest y críticos/altos cerrados. No certificación de tercero.
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
- `docs/architecture/EFEONCE_ID_RELYING_PARTY_ENTRY_AND_CONSENT_DECISION_V1.md`
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

- `TASK-1829`/`TASK-1830`: superficie implementada y autenticada según evidencia de septiembre y readback público actual; sus matrices incompletas permanecen con sus dueños. `TASK-1828` aporta llaves/señales base.
- Un agente separado para refutar la evaluación ofensiva y evidencia reproducible; no contratación externa.

### Blocks / Impacts

- `TASK-1832` Slice 3 cuando la organización es un cliente pagando.
- `TASK-1834` y consumer Rooms: assurance del alcance activado y evidencia de rollout antes de producción controlada; cierre completo antes del primer cliente pagando. La migración Greenhouse tiene dueño TASK-2063.

### Files owned

- `docs/audits/auth-server/AUTH_SERVER_RED_TEAM_<fecha>.md` (nuevo)
- `docs/audits/auth-server/AUTH_SERVER_PENTEST_<fecha>.md` (nuevo, redactado)
- `docs/operations/runbooks/auth-server-incident.md`, `auth-server-key-rotation.md` (nuevos)
- `docs/operations/EFEONCE_CUSTOMER_IDENTITY_PRIVACY_REVIEW_V2.md` (nuevo)
- `src/lib/reliability/queries/auth-server-*.ts` (nuevo: señales)
- `services/ops-worker/deploy.sh` + Cloud Scheduler `ops-auth-key-rotate` (rotación programada)
- `src/lib/auth-server/**` (fixes derivados del red-team/pentest)

## Current Repo State

> Snapshot del discovery original. El estado actual y los pendientes posteriores están en `Status real` y «Conciliación vigente — 2026-10-26»; no ejecutar otra vez un canary ya completado por leer esta fotografía inicial.

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

### Gap revalidado

- Existe GC acotado en `src/lib/auth-server/maintenance/gc.ts` y scheduler horario activo. La extensión
  first-party/OTP está probada localmente (funciones ausentes → skip; 30 días; locks; counts), aún pendiente
  del despliegue/migraciones y ejecución observada del nuevo código en ops-worker.
- Existen ocho señales en `src/lib/reliability/queries/auth-server-signals.ts`: JWKS, lifecycle, code reuse,
  refresh reuse, CIMD rejected, magic-link rate-limit, passkey counter regression y orphan sessions.
  KMS usa incidente de dominio existente. Reader `rotation_overdue` y cuatro señales first-party/OTP ya implementados localmente y probados encendiendo/recuperando; SQL real verifica clasificación. Falta su despliegue y readback operativo.
- No se encontró scheduler/command automático de rotación ni runbooks específicos `auth-server-incident.md`
  y `auth-server-key-rotation.md`. El runbook base sí contiene rollback, rotación manual y diagnóstico;
  expandir/reusar, no fingir ausencia total de operación.
- Privacidad V1 está superseded para WorkOS y no es revisión del tratamiento propio. V2/RAT y validación
  pertinente siguen pendientes. No se afirma cumplimiento jurídico con una prueba técnica.
- Retiro SQL/KMS de la versión antigua por verificar; KMSv1 sigue ENABLED y su kid sigue publicado.
  No retirar por inferencia: probar solapamiento y ausencia de tokens que aún dependan de ella.
- Evaluación ofensiva y refutación de esta task no están acreditadas sólo por las pruebas de implementación.
  Se reutiliza evidencia1836/1831/1844 con fecha y límites; no se cuentan sesiones/modelos como refutación independiente automáticamente.

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
  - Retención implementada: función `gc_ephemeral_state` de migración1836 conserva mínimo30d después de expiración y respeta dependencias/familias vigentes; audit e intentos no se borran. Helpers1834/2067 conservan30d y lotes<=500. Los objetivos históricos24h/7d/90d/12meses requieren conciliación explícita en privacidadV2; no se ejecutan borrados nuevos desde este spec.
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
- External coordination: evaluación ofensiva interna; Cloud Scheduler; Sentry alert rules

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
- Los casos *externo sobre interno* (token del issuer externo sobre tool interna, confused deputy por cliente)
  se ejecutan contra el gateway y su evidencia se entrega a `TASK-1831` para tildar sus criterios (a) y (b);
  el fix del verifier es de esa task, no de esta.
- Los casos de relying party prueban en el emisor y el primer consumer que presentación/return/mode vienen del
  registro/transacción, que un RP no reutiliza artefactos de otro y que recovery/legacy no forman un redirect loop.
- La matriz de consentimiento contrasta fast path first-party con cliente MCP nuevo, scope elevado y escritura con
  step-up; omitir UI de login nunca equivale a autorizar al cliente delegado.

### Slice 2 — Señales, rotación y retención

- Señales registradas; `auth.keys.rotation_overdue`; scheduler de rotación; jobs de retención.

### Slice 3 — Runbooks y privacidad V2

- Runbooks de incidente/rotación/revocación; revisión de privacidad V2; registro de actividades de tratamiento.

### Slice 4 — Evaluación ofensiva propia y retest

- Catálogo de amenazas y>=10casos reproducibles en entorno aislado/staging autorizado; agente separado refuta hallazgos y cobertura.
- Fixes por ownership, retest red/green y reporte redactado. No contratación, modelos adicionales ni certificación de tercero.

## Out of Scope

- Cambios funcionales del protocolo o de la autenticación (vuelven a `TASK-1829/1830`).
- Certificaciones formales (SOC 2, ISO 27001).

## Detailed Spec

- Red-team: cada agente recibe la superficie (metadata, endpoints, contratos) y un objetivo por caso; la
  evidencia es un request reproducible; el otro agente intenta refutar el hallazgo antes de aceptarlo
  (los hallazgos de subagentes fallan hacia el daño máximo).
### Ejecución y refutación por agentes — autoridad vigente 2026-10-25

Julio sustituyó expresamente el requisito de contratación externa y el pareo obligatorio entre proveedores:
la evaluación la hacemos nosotros. Usar los agentes disponibles autorizados; no comprar servicios ni llamar
APIs pagadas. Un agente ejecuta el catálogo, otro intenta refutar cada hallazgo y señalar cobertura ausente.
La independencia de revisión es por ownership y revisión separada; compartir proveedor no equivale a
independencia comercial ni certificación externa. Conservar requests/tests reproducibles, resultados,
retest de fixes y limitaciones. Ningún crítico/alto se cierra sólo por mitigación escrita.
Las pruebas adversariales son de superficie propia y en entorno aislado/staging explícitamente autorizado;
la activación productiva usa canaries acotados, no ataques de carga contra SQL compartido.

- Rotación: `registerSigningKeyVersion` → verificación de JWKS con dos `kid` → espera ≥ `SIGNING_KEY_MIN_OVERLAP_MS` (1 h, mayor que el TTL del access token) → `retireSigningKey` del viejo.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3 → Slice 4. La evaluación ofensiva final (Slice 4) sólo sobre la superficie ya endurecida por Slice 1.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Hallazgo crítico tardío bloquea la cohorte | rollout | medium | evaluación/refutación temprana y retest antes de clientes pagando | informe |
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
4. Evaluación propia>=10casos, refutación y retest cerrados antes de la primera organización pagando; no certificado externo.

### Out-of-band coordination required

- Sin contratación de pentest. La revisión de privacidad describe hechos técnicos y sus límites; cualquier validación jurídica que resulte necesaria debe tratarse separadamente, sin contratar servicios por inferencia.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Revisar hallazgos A1–A7 y evidencia de docs/audits/2026-09-04-task-1836-mcp-design-audit.md; revisión2026-10-25 contrastada con evidencia1836/1831/1844 y código actual en el plan. El cierre documental no acredita todas las mitigaciones runtime actuales ni pentest.

- [ ] Cambio de frontera de TASK-1836 cubierto por assurance: externo del mismo issuer sin autoridad interna, binding no derivado de email y revocación con token vigente.

- [ ] Catálogo de abuse cases con ≥ 10 casos ejecutados, cada uno con resultado y refutación cruzada.
- [ ] Un cliente o parámetro no confiable no puede inyectar marca/return ni autodeclararse `first_party_sign_in`;
      code, token, cookie y sesión de RP A fallan en RP B.
- [ ] Fast path first-party sin UI y recovery/legacy sin loops están ejercitados; la misma sesión no omite el
      consentimiento de un cliente MCP nuevo, scopes elevados ni el step-up de escritura.
- [ ] Evidencia reproducible de los casos externo-sobre-interno entregada a `TASK-1831`, con sus criterios (a) y (b)
      tildados allá o el bloqueo declarado con razón.
- [ ] Evaluación ofensiva propia>=10casos con alcance documentado, revisión independiente de otro agente, retest y sin críticos/altos abiertos; expresamente sin certificación de tercero.
- [ ] Rotación de llave ejercitada en staging y producción; scheduler trimestral activo con verificación.
- [ ] Señales del dominio registradas en el control plane con steady y severidad. Ocho existentes y cinco nuevas integradas localmente; 17 tests de lectores PASS y SQL agregado real PASS. Ventana productiva steady aún pendiente; no se tilda por código.
- [ ] Runbooks de incidente, rotación y revocación masiva publicados y ensayados en staging.
- [ ] Revisión de privacidad V2 publicada con retención por tabla y registro de actividades.

## Verification

- [Revisión técnica de privacidad V2](../../operations/EFEONCE_CUSTOMER_IDENTITY_PRIVACY_REVIEW_V2.md) preparada con inventario/retención/RAT propuesto; sin afirmar aprobación jurídica.
- [Preparación cloud](../../audits/identity/2026-10-25-auth-rooms-controlled-rollout.md): migraciones/RP/secretosv1, gatesOFF; no canary/deploy todavía.

- [Revisión separada y corrección magic-link](../../audits/auth-server/2026-10-25-independent-protocol-review.md):146PASS separados; cobertura ofensiva CIMD bloqueada automáticamente, parche defensivo verificado localmente192PASS con suite de magic-link y TypeScriptPASS.
- Runbooks [incidente](../../operations/runbooks/auth-server-incident.md) y [rotación](../../operations/runbooks/auth-server-key-rotation.md) preparados; ensayos/scheduler pendientes, no tildar criterio completo.

- [Evaluación ofensiva reproducible y hallazgos](../../audits/auth-server/AUTH_SERVER_RED_TEAM_2026-10-25.md): 20 casos backend, 122 PASS/3 SQL omitidos en suite focal; refutación independiente pendiente de consolidar.
- Remediación defensiva CIMD: IP validada fijada al socket HTTPS, parser IPv6 binario y deadline DNS+cuerpo de 3 s, 64 PASS CIMD/OAuth; revisión independiente magic link 128 PASS incluye filas persistidas previas. Ampliación ofensiva CIMD detenida por control automático de seguridad, sin reintento por otro canal; gateway/roles-sin-scope no evaluado en esta pasada. No se afirma pentest completo ni exfiltración demostrada. Detalle y límites en el mismo dossier.
- Señales17PASS; PostgreSQL aislado7PASS con prueba de mutación que falla al quitar clasificación de replay. `pnpm typecheck` y ESLint focal PASS.

- `pnpm vitest run src/lib/auth-server src/lib/reliability/queries`
- simulacro de revocación masiva en staging
- `pnpm qa:gates --changed` y veredicto del QA release auditor

## Closing Protocol

- [ ] `Lifecycle` sincronizado y archivo en la carpeta correcta
- [ ] `docs/tasks/README.md`, `Handoff.md` y `changelog.md` actualizados
- [ ] chequeo de impacto cruzado sobre `TASK-1832`, `TASK-1834`
- [ ] ledger de flags al día

## Follow-ups

- Repetir evaluación ofensiva en cada cambio de protocolo y revisión periódica, sin asumir contratación externa.

## Open Questions

- Ninguna decisión de proveedor pendiente: Julio asignó la evaluación a los agentes. El alcance técnico y resultados se registran en el catálogo del plan.

## Correction 2026-09-05 — TASK-1836

Evaluar propuesta D1–D7 de TASK-1836: OIDC puro, procedencia corporativa, factor local fuerte, contexto opaco firmado y permiso vigente leído por request; no dar por implementada la corrección documental.
