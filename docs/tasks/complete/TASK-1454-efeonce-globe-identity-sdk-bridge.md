# TASK-1454 — Efeonce Globe Federated Identity and Governed SDK Bridge

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `complete`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-028`
- Status real: `Cerrada para piloto interno no productivo; broader release condicionado por QA follow-ups`
- Rank: `TBD`
- Domain: `identity`
- Blocked by: `none`
- Branch: `develop` (excepción confirmada por operador; sin push ni producción)
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Generaliza el broker OAuth de sister platforms para que la elegibilidad sea política por cliente/plataforma y no código Kortex-specific. Registra Efeonce Globe para audiencia interna, conecta Greenhouse y Globe mediante SDK + identidades WIF/ADC sin llaves, y prueba acceso, denegación, replay y revocación sin habilitar producción ni clientes externos.

## Why This Task Exists

El broker reusable de `TASK-948` conserva `KORTEX_OPERATOR_SCOPE` y mensajes/políticas Kortex dentro de `oauth-broker.ts`; por eso no puede incorporar Globe sin duplicar condicionales o ampliar acceso accidentalmente. Globe ya tiene un SDK/adapter ADC local, pero todavía no existen client registration, service identities, WIF, Cloud Run privado ni smokes entre ambos runtimes.

## Goal

- Convertir la elegibilidad del broker en un contrato multiproducto validado, fail-closed y backward-compatible para Kortex.
- Habilitar Efeonce Globe sólo para colaboradores internos explícitamente autorizados, con sesión propia y capabilities namespaced.
- Implementar el bridge Greenhouse → Globe mediante credenciales efímeras WIF/ADC y SDK, sin service-account keys.
- Probar acceso, denegación, replay, revocación y correlación de auditoría en un entorno interno no productivo.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`
- `docs/architecture/GREENHOUSE_ECOSYSTEM_ACCESS_CONTROL_PLANE_V1.md`
- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_DECISION_V1.md`
- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_SECURITY_POSTURE_V1.md`
- `docs/architecture/GREENHOUSE_CLOUD_INFRASTRUCTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `../efeonce-globe/docs/architecture/GREENHOUSE_CONNECTIVITY_V1.md`

Reglas obligatorias:

- Greenhouse y Globe no comparten cookies, sesiones, bases de datos, buckets, provider secrets ni roles implícitos.
- La política de audiencia se deriva del OAuth client/plataforma; no agregar otro `if (platform === ...)` al broker.
- Kortex conserva su comportamiento vigente y `kortex.operator_console.access`; Globe usa `globe.studio.access` y claims mínimos.
- ADC es identidad de workload, no sesión humana. Vercel usa OIDC → WIF; Cloud Run usa service identity adjunta; local usa ADC/impersonación.
- No crear ni aceptar service-account JSON keys como fallback.
- El primer rollout es internal-only, no productivo y sin clientes externos.
- UI, MCP y agentes futuros consumirán los mismos commands/readers de Globe; Greenhouse no invoca providers ni infraestructura creativa directamente.

## Normative Docs

- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/tasks/TASK_PROCESS.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md`
- `docs/tasks/in-progress/TASK-948-greenhouse-identity-broker-kortex-sso.md`
- `../efeonce-globe/AGENTS.md`
- `../efeonce-globe/docs/operations/LOCAL_AUTHENTICATION.md`

## Dependencies & Impact

### Depends on

- Implementación existente de `TASK-948` en `src/lib/sister-platforms/oauth-broker.ts` y rutas OAuth; su rollout productivo no bloquea esta task.
- Foundation de bindings/consumers de `TASK-375`/`TASK-376`.
- Proyecto GCP `efeonce-globe` y repositorio hermano `efeoncepro/efeonce-globe` ya creados.
- SDK Globe commit `8987b2b` local; debe publicarse/sincronizarse por el flujo autorizado antes del smoke cross-runtime.

### Blocks / Impacts

- Futuro acceso visible “Abrir Efeonce Globe” en Greenhouse, que requiere una task `ui-ux` separada.
- Primer Cloud Run/API interno de Globe y su IAM.
- `TASK-948`/`TASK-949`: deben conservar el contrato Kortex sin adelantar rollout productivo.
- `TASK-885` a `TASK-888`: siguen siendo prerequisito para desired access/provisioning de clientes externos; esta task no los sustituye.

### Files owned

- `src/lib/sister-platforms/oauth-broker.ts`
- `src/lib/sister-platforms/oauth-policy.ts` si discovery confirma la extracción del contrato
- `src/lib/sister-platforms/*.test.ts`
- `src/lib/google-credentials.ts`
- `src/app/api/auth/sister-platforms/authorize/route.ts`
- `src/app/api/integrations/v1/sister-platforms/oauth/token/route.ts`
- `src/app/api/integrations/v1/sister-platforms/oauth/userinfo/route.ts`
- `src/lib/reliability/queries/sister-platform-oauth-signals.ts`
- `scripts/` sólo para provisioning/smokes idempotentes y sin secretos
- `docs/architecture/GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`
- `docs/architecture/EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md`
- `../efeonce-globe/packages/contracts/`
- `../efeonce-globe/packages/sdk/`
- `../efeonce-globe/apps/studio-web/` sólo para callback/session/API mínimo confirmado por plan
- `../efeonce-globe/infra/terraform/` sólo después del checkpoint de plan
- `../efeonce-globe/docs/`

## Current Repo State

### Already exists

- Broker authorization-code + PKCE, exact redirect allowlist, code one-time, token/userinfo y audit de `TASK-948`.
- `sister_platform_consumers`, bindings y OAuth clients en Greenhouse.
- WIF Vercel → GCP ya probado para recursos de `efeonce-group` mediante `src/lib/google-credentials.ts`.
- En Globe, SDK tipado, auth inyectable, adapter ADC Google ID token, capabilities namespaced y documentación ADR-001 están implementados en commit local `8987b2b`.

### Gap

- El gap original quedó resuelto en el piloto interno: policy por cliente validada, consumer/client/binding Globe, revocación convergente, service identities, WIF, API privada y callback web no productivo.
- Quedan fuera de esta task la UI/branding, producción, clientes externos, storage/providers creativos y distribución definitiva del SDK por registry privado.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/sister-platforms/** en Greenhouse y packages/sdk + runtime adapter en ../efeonce-globe`
- Future candidate home: `remain-shared`
- Boundary: `SisterPlatformOAuthPolicy + broker authorize/token/userinfo en Greenhouse; @efeonce-globe/sdk y API versionada en Globe`
- Server/browser split: `OAuth exchange, WIF/ADC, IAM, stores y secrets server-only; browser recibe sólo redirects/cookie propia de Globe y DTOs mínimos`
- Build impact: `google-auth-library permanece aislada en el subpath server-only de Globe; Greenhouse reutiliza su helper WIF y no importa providers creativos`
- Extraction blocker: `sesión Greenhouse, tenant access record, OAuth audit PostgreSQL y Cloud Run IAM viven en runtimes distintos`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `Greenhouse para identidad, OAuth clients y desired access; Globe para sesión local, workspace entitlements y commands creativos`
- Consumidores afectados: `Greenhouse server, Globe studio-web/API, futuros agentes/MCP y Kortex como consumer existente`
- Runtime target: `staging`

### Contract surface

- Contrato existente a respetar: `src/lib/sister-platforms/oauth-broker.ts + rutas OAuth + ../efeonce-globe/packages/sdk`
- Contrato nuevo o modificado: `SisterPlatformOAuthPolicy versionada; client Globe internal-only; Google ID-token bridge por audience exacto`
- Backward compatibility: `gated`
- Full API parity: `Greenhouse consume Globe por SDK/API gobernada; ninguna UI, agente o MCP accede a tablas, buckets o provider endpoints`

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_core.sister_platform_oauth_clients.policy_json; correlation_id en codes/tokens/audit; revoked_by_user_id y revocation_reason en tokens; nuevos audit event types; registros consumer/client/binding Globe`
- Invariantes que no se pueden romper:
  - `cada OAuth client resuelve exactamente una policy validada; policy ausente/inválida falla cerrada`
  - `Kortex conserva scope/audience vigente; Globe sólo efeonce_internal + globe.studio.access + claims mínimos`
  - `authorization code es one-time, PKCE S256, redirect exacto y token/cookie nunca se comparten entre plataformas`
  - `workload identity autoriza invocación; workspace/capability autoriza la acción`
- Tenant/space boundary: `Greenhouse emite subject mínimo; Globe resuelve binding local a workspace y nunca confía en workspace/actor arbitrario enviado por caller`
- Idempotency/concurrency: `upsert consumer/client/binding idempotente; código OAuth consume atómicamente; commands Globe requieren idempotency key`
- Audit/outbox/history: `audit OAuth append-only + correlationId propagado hasta command/run/artifact; revocación y denegaciones observables`

### Migration, backfill and rollout

- Migration posture: `forward-only aditiva aplicada el 2026-07-19 en greenhouse-pg-dev/greenhouse_app, después de aprobación explícita; Kortex backfilled con policy legacy explícita`
- Default state: `Globe active sólo en Preview/internal allowlisted por instrucción del operador; Production y clientes externos ausentes`
- Backfill plan: `Kortex recibió policy explícita; Globe se registró idempotentemente con consumer EO-SPK-0002, binding EO-SPB-0003 y audiencia efeonce_internal`
- Rollback path: `suspender client/consumer Globe, retirar roles/run.invoker resource-level, deshabilitar flag y revertir adapter sin tocar Kortex`
- External coordination: `configurar WIF/IAM/Cloud Run no productivo en efeonce-globe y variables no secretas de audience/provider; ningún secreto persistente`

### Security and access

- Auth/access gate: `sesión Greenhouse + policy OAuth + capability globe.studio.access para humano; Google-signed ID token + roles/run.invoker para workload`
- Sensitive data posture: `identity subject/email mínimos; códigos/tokens/cookies/claims sensibles no se loguean; assets creativos fuera del exchange`
- Error contract: `client_not_allowed, policy_invalid, user_not_eligible, required_scope_missing, invalid_grant, invalid_token, workload_access_denied, workspace_access_denied`
- Abuse/rate-limit posture: `rate limit OAuth existente, TTL corto, replay guard, audience exacto, WIF attributes por repo/proyecto/env y circuit breaker del SDK`

### Runtime evidence

- Local checks: `tests focales broker/policy/routes/google credentials + ../efeonce-globe pnpm check && pnpm build`
- DB/runtime checks: `queries read-only de client/consumer/binding/audit; ninguna policy o binding externo`
- Integration checks: `human authorize→callback→session, workload SDK→private API, denial sin capability, wrong audience, code replay y revocation/suspension`
- Reliability signals/logs: `identity.sister_platform_oauth.* + Globe correlation/auth denial signals sin payload sensible`
- Production verification sequence: `production rollout is explicitly forbidden; el piloto interno permanece activo para que Globe exista y sea alcanzable, con rollback por suspensión del client/binding y retiro de IAM/WIF`

### Acceptance criteria additions

- [x] Source of truth, contract surface and consumers are named with real paths or objects.
- [x] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [x] Migration/backfill/rollback posture is explicit and proportional to risk.
- [x] Runtime evidence covers both human and workload identity paths.
- [x] Canonical errors, audit/signals and secret hygiene are verified without raw credential output.

## Capability Definition of Done — Full API Parity gate

- [x] Broker policy lives in one primitive, not in routes, UI or per-platform conditionals.
- [x] Human and workload reads/writes use governed API/SDK contracts.
- [x] Globe capability and at least one real internal grant/binding are active sólo en la allowlist interna no productiva.
- [x] Mutating commands remain compatible with propose → confirm → execute, actor, workspace, idempotency and audit.
- [x] Kortex and Globe are canonical consumers of the same generic broker without duplicated authorization logic.

<!-- ZONE 2 — PLAN MODE: se completa al tomar la task -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Multiproduct OAuth policy

- Extraer/crear policy contract validado desde client metadata with required scopes, tenant audience y claim projection.
- Reemplazar Kortex hardcode por policy resolution fail-closed y agregar regresión Kortex + casos Globe allow/deny.

### Slice 2 — Globe internal client and revocation contract

- Registrar consumer/client/binding Globe de forma idempotente, flag OFF/internal allowlist, redirect exacto y `globe.studio.access`.
- Implementar claims mínimos, session revalidation/revocation convergence y smokes de code replay/client suspension.

### Slice 3 — Keyless workload bridge

- Extender el helper Greenhouse para obtener Google ID token desde su WIF sin persistir llaves y conectarlo a `@efeonce-globe/sdk`.
- Provisionar, vía IaC/script idempotente aprobado, caller/runtime/deployer identities y IAM resource-level en `efeonce-globe` no productivo.

### Slice 4 — Internal runtime smokes and closure

- Desplegar la mínima API/callback interna definida por el plan y ejecutar smokes acceso/denegación/wrong audience/replay/revocación/correlación.
- Documentar evidencia, rollback y estado exacto; producción, clientes externos y launch UI permanecen deshabilitados.

## Out of Scope

- Producción, `main`, release train o dominios públicos definitivos.
- Usuarios/clientes externos, billing, créditos comerciales o provisioning general del Access Control Plane.
- UI “Abrir Globe”, navegación, logo/branding, onboarding visual o GVC; requieren task `ui-ux` posterior.
- Providers creativos, buckets, Cloud SQL productivo, render/generation runs o secretos fal.ai/Vertex.
- Cambios a SSO core, SCIM, Entra provisioning, Graph sync o cookies/session callbacks de Greenhouse.

## Detailed Spec

La policy se resuelve desde metadata versionada del OAuth client y produce una decisión pura: active tenant, allowed tenant types, required scopes y projection de claims. Defaults legacy sólo preservan clients existentes explícitamente migrados; una policy desconocida o mal formada falla cerrada y emite señal. Globe recibe subject, email/name mínimos, identity profile y capabilities permitidas; no usa role names de Greenhouse como autorización local.

El bridge máquina usa `X-Serverless-Authorization` con Google ID token para el audience exacto del servicio Cloud Run. Vercel intercambia su OIDC por WIF e impersona sólo `greenhouse-globe-caller`; Cloud Run usa service identities adjuntas; local usa ambos logins `gcloud auth login` + `gcloud auth application-default login` y, cuando exista, impersonación. Ningún camino admite key JSON.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 policy + regression Kortex → Slice 2 client/revocation flag OFF → Slice 3 IAM/WIF/API privada → Slice 4 smokes internal-only.
- No provisioning ni deploy antes de que Slice 1 cierre y el plan P0 tenga aprobación humana.
- No habilitar launch UI hasta que los cinco smokes críticos estén verdes y documentados.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
| --- | --- | --- | --- | --- |
| Regresión Kortex al generalizar | identity / SSO | medium | golden tests + policy legacy explícita + flag | oauth authorize/token failure rate |
| Globe amplía audiencia accidentalmente | identity / access | medium | internal tenant allowlist + capability requerida + deny tests | user_scope_not_allowed / access_denied |
| Token para audience incorrecto | Cloud Run / WIF | medium | audience exacto + mismatch test + resource-level invoker | workload_access_denied |
| Revocación no invalida sesión Globe | auth/session | medium | revalidation/TTL contract + suspension smoke | revoked_session_accepted |
| Credencial persistente introducida | security | low | WIF/ADC only + secret scan + no fallback | service_account_key_detected |
| Checkout compartido pisa trabajo ajeno | repo coordination | medium | `--develop`, files owned estrictos, diff por slice | unexpected changed paths |

### Feature flags / cutover

- Client/consumer Globe nació controlado y quedó `active` sólo en el entorno interno allowlisted por instrucción posterior del operador, para priorizar que Globe exista ya.
- Rollback inmediato = suspender client/consumer + retirar invoker/WIF; no hay Production ni audiencia externa.
- Kortex mantiene sus flags y rollout separados; esta task no activa `TASK-949`.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
| --- | --- | --- | --- |
| 1 | revert policy adapter; conservar broker legacy probado | <15 min | sí |
| 2 | suspend Globe client/consumer y flag OFF | <5 min | sí |
| 3 | retirar resource-level invoker/WIF binding y deploy interno | <15 min | sí |
| 4 | no promover; preservar evidencia y volver a flag OFF | inmediato | sí |

### Production verification sequence

No existe cutover productivo en esta task: cualquier intento de promover `main`, configurar Production o habilitar clientes externos bloquea el cierre. La secuencia interna se completó y el piloto queda activo/revocable, no promovido:

1. Tests locales Kortex legacy + Globe allow/deny/replay.
2. DB readback de policy/client/binding internal-only.
3. Deploy privado no productivo con service identity dedicada.
4. Human SSO smoke y sesión Globe.
5. SDK/WIF smoke con audience correcto.
6. Wrong-audience y no-capability denial.
7. Replay code denial.
8. Suspend/revoke y verificar rechazo convergente.
9. Correlacionar audit ID → session → command/request.
10. Mantener sólo el piloto interno activo; Preview WIF diagnóstico retirado, bindings `development`/`staging` conservados y Production ausente.

### Out-of-band coordination required

- GCP IAM/WIF/Cloud Run dentro de `efeonce-globe`, sin producción ni SA keys.
- Configuración de redirect URI interna de Globe.
- No push/release de Greenhouse ni promoción a producción sin orden posterior explícita.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [x] No existe `KORTEX_OPERATOR_SCOPE` ni copy Kortex dentro de la decisión genérica del broker; Kortex funciona por policy registrada.
- [x] Policy schema inválida/ausente, tenant no interno o scope Globe faltante fallan cerrados con errores canónicos y audit.
- [x] Globe client/binding existe sólo internal/non-production y sin roles Greenhouse usados como autorización local.
- [x] Authorization code conserva PKCE S256, exact redirect, TTL y atomic one-time consumption.
- [x] Greenhouse invoca Globe con SDK + Google ID token de audience exacto mediante WIF/ADC; no hay SA key ni token persistido.
- [x] Smokes verdes: acceso humano, acceso workload, denegación capability, wrong audience, replay y revocación/suspensión.
- [x] Audit/correlation puede seguir un flujo desde Greenhouse hasta Globe sin tokens, cookies ni errores raw.
- [x] Kortex regression suite y rutas OAuth existentes permanecen verdes.
- [x] Producción, clientes externos y launch UI permanecen fuera de scope; el callback técnico interno sí está activo.
- [x] `pnpm task:lint --task TASK-1454` reporta `template=1`, `errors=0`, `warnings=0`.

## Verification

- `pnpm task:lint --task TASK-1454`
- `pnpm ops:lint --changed`
- tests focales de `src/lib/sister-platforms/**` y rutas OAuth
- `pnpm typecheck`
- `pnpm lint`
- `pnpm build`
- `pnpm qa:gates --changed --agent codex --task TASK-1454 --auth --integration --security --runtime --docs`
- `cd ../efeonce-globe && pnpm check && pnpm build && pnpm audit --prod`
- smokes internos versionados con IDs de audit/correlation y sin payload sensible

## Closing Protocol

- [x] `Lifecycle` y carpeta sincronizados con rollout real.
- [x] `docs/tasks/README.md` y `docs/tasks/TASK_ID_REGISTRY.md` sincronizados.
- [x] `EPIC-028`, arquitectura sister-platform/Globe, `Handoff.md` y changelogs actualizados.
- [x] Cierre documental ejecutado con `greenhouse-documentation-governor`.
- [x] QA final `CONDITIONAL PASS` emitida por `greenhouse-qa-release-auditor` para el piloto interno.
- [x] Impacto sobre `TASK-948`, `TASK-949` y `TASK-885…888` revisado explícitamente; no se amplió su rollout.

## Follow-ups

- Task `ui-ux` para entrada visible Greenhouse → Globe y branding/logo canónico con wireframe/flow/GVC.
- Access Control Plane runtime (`TASK-885…888`) antes de cualquier cliente externo.
- Producción y custom domain sólo mediante task/release separados.

## Open Questions

- Confirmar en Plan Mode si Globe necesita introspection/revalidation por request o sesión corta con revocation polling; la decisión debe demostrar el smoke de revocación sin compartir sesión.
