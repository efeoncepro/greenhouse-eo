# TASK-1519 — Globe Producer Human Execution Bridge

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `in-progress`
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
- Backend impact: `api`
- Epic: `EPIC-028`
- Status real: `Discovery cerrada y ejecución autorizada; bridge, grants y enforcement en implementación`
- Rank: `TBD`
- Domain: `creative|platform|identity|security`
- Blocked by: `none`
- Branch: `task/TASK-1519-globe-producer-human-execution-bridge`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Construir el bridge server-side que permite al humano autenticado en Producer invocar capabilities de Globe sin
exponer la API IAM-private ni credenciales de workload al browser. Incluye BFF same-origin, grants OAuth/broker,
delegación verificable, enforcement real de `surface=ui`, IAM/env/secrets y evidencia negativa de seguridad.

## Why This Task Exists

El browser hoy recibe sesión humana y `globe.studio.access`, pero los commands/readers de Producer siguen
`policy-blocked`; la API privada exige identidad de workload. Coverage es metadata y el dispatch HTTP actual no
puede demostrar por sí solo que una llamada vino de la UI. Sin este bridge, la UI aprobada no puede ejecutar el
backend existente de forma segura.

## Goal

- Browser → BFF same-origin → API IAM-private, preservando actor/workspace/correlation/idempotency.
- Grants de capabilities derivados del broker y enforcement fail-closed de la superficie UI.
- Configuración/IAM/secrets por ambiente con CSRF, límites, errores sanitizados y conformance positivo/negativo.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/creative-studio/EFEONCE_GLOBE_PRODUCER_HUMAN_EXECUTION_DECISION_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_API_CONTRACT_SPINE_V1.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_FRONTEND_HOSTING_FRONT_DOOR_DECISION_V1.md`
- `docs/architecture/creative-studio/PLATFORM_FOUNDATION_V1.md`
- `docs/architecture/creative-studio/GREENHOUSE_CONNECTIVITY_V1.md`

Reglas obligatorias:

- El browser nunca recibe service credentials/provider secrets ni llama directamente a la API privada.
- Actor, workspace, capabilities y surface se derivan server-side; ningún payload/header no confiable los eleva.
- El BFF adapta transporte; no duplica policy, pricing, routing ni lógica de commands/readers.
- Cualquier cambio de boundary no cubierto por las decisiones aceptadas requiere ADR antes de código.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `TASK-1454`, `TASK-1481`, `TASK-1500`, `TASK-1501`, `TASK-1502`, `TASK-1503`.
- Capabilities adicionales se habilitan sólo cuando su task dueña esté disponible; `TASK-1504` no se duplica aquí.

### Blocks / Impacts

- Habilita la ejecución humana interna de `TASK-1505` y los consumers de `TASK-1493`–`TASK-1498`/`TASK-1520`.
- No habilita ambiente comercial; ese gate pertenece a `TASK-1521`.

### Files owned

- `../efeonce-globe/apps/studio-web/`
- `../efeonce-globe/packages/contracts/`
- `../efeonce-globe/packages/domain/`
- `../efeonce-globe/packages/sdk/`
- `../efeonce-globe/infra/`
- `src/lib/sister-platforms/`, `scripts/` y migración focal de grants OAuth en `greenhouse-eo`.
- Este spec, su plan, índices, arquitectura, runbook y handoff aplicables.

## Current Repo State

### Already exists

- Sesión humana, OAuth broker, trusted context, CapabilityRegistry, SDK y API Cloud Run IAM-private.
- Catalog, output-shape, estimate y asset-serving gobernados para el Producer.

### Gap

- No existe adapter UI/BFF que invoque la API privada con workload identity y delegación humana verificable.
- Los grants Producer no llegan al principal humano; `ui` sigue declarativo/policy-blocked sin enforcement dedicado.
- El verificador actual descarta la identidad del service account: agregar `web_runtime` al allowlist genérico lo
  convertiría en `internalServicePrincipal()` con autoridad de gasto. Caller BFF y caller workload deben ser clases
  distintas y fail-closed.
- El output route del web todavía sirve localmente y materializa el payload completo; falta el proxy autorizado y
  streaming privado BFF → API.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `apps/studio-web + packages/{contracts,domain,sdk} en efeonce-globe`
- Future candidate home: `api`
- Boundary: `BFF UI adapter + actor delegation + CapabilityRegistry; commands/readers canónicos siguen siendo el SoT`
- Server/browser split: `sesión, OAuth, workload identity, delegation, IAM y secrets server-only; browser usa same-origin`
- Build impact: `auth library/ADC existente; sin provider SDK en web`
- Extraction blocker: `sesión same-origin, Cloud Run IAM y propagación de trusted context`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `api`
- Source of truth afectado: `BFF ingress/dispatch, broker grants y runtime surface policy`
- Consumidores afectados: `Producer UI, API privada, SDK/conformance, audit`
- Runtime target: `internal web/BFF + private API; commercial sólo tras TASK-1521`

### Contract surface

- Contrato existente a respetar: `TrustedCommandContextV1`, CapabilityRegistry, códigos de error del spine y broker OAuth.
- Contrato nuevo o modificado: `UI/BFF adapter + signed/verified actor delegation + trusted UI surface context`.
- Backward compatibility: `gated`; HTTP/SDK existentes no cambian de autoridad.
- Full API parity: `el BFF invoca los mismos commands/readers; no crea endpoints de negocio por botón`.

### Data model and invariants

- Entidades/tablas/views afectadas: `policy/grants OAuth existentes; no se persiste delegation ni se duplica TASK-1511`.
- Invariantes que no se pueden romper:
  - `workspace/actor/capability/surface son server-derived y auditable`.
  - `la delegación es acotada, expira y no puede convertirse en workload credential`.
- Tenant/space boundary: `workspace binding del principal/broker; nunca body libre`.
- Idempotency/concurrency: `idempotencyKey y correlationId preservados end-to-end; delegación request-bound y
  duplicados absorbidos por el contrato idempotente del command`.
- Audit/outbox/history: `audit durable por dispatch con actor, workspace, capability, surface, caller workload,
  delegationId, fingerprint, outcome y correlationId; nunca tokens ni retrieval grants`.

### Migration, backfill and rollout

- Migration posture: `actualización focal y reversible de policy/grants OAuth; delegation stateless sin tabla nueva`.
- Default state: `flag OFF / capability UI policy-blocked`.
- Backfill plan: `N/A; grants se emiten por allowlist controlada`.
- Rollback path: `flag/grant OFF y revocar IAM invoker del BFF sin alterar commands/readers`.
- External coordination: `broker OAuth/grants, Cloud Run IAM, env/secrets y redirect/origin allowlists`.

### Security and access

- Auth/access gate: `sesión same-origin + CSRF + broker capability + workload IAM + surface policy`.
- Sensitive data posture: `cookies, OAuth tokens, delegation evidence y service identity; server-only/redacted`.
- Error contract: `códigos canónicos del spine; no raw upstream/provider/auth errors`.
- Abuse/rate-limit posture: `payload bounds, rate/quota, replay guard y deny-by-default`.

### Runtime evidence

- Local checks: `tests de CSRF, spoofing, grants, replay y surface positivo/negativo`.
- DB/runtime checks: `readback de audit/grants si aplica migración`.
- Integration checks: `browser session → BFF → IAM-private API en staging interno`.
- Reliability signals/logs: `dispatch outcome por capability/surface/correlation, sin tokens`.
- Production verification sequence: `local → staging flag OFF → allowlist interna → smoke positivo/negativo → gate comercial separado`.

### Acceptance criteria additions

- [ ] Browser no recibe credencial de servicio ni endpoint privado invocable directamente.
- [ ] Spoofing de actor/workspace/surface/capability falla cerrado.
- [ ] Grant revocado converge y bloquea nuevos dispatches con audit correlacionado.
- [ ] Caller BFF sin delegación jamás cae a principal servicio; caller workload existente conserva `surface=http`.
- [ ] Output retrieval valida sesión, capability, workspace, ownership y grant; transmite bytes con `private,
  no-store` sin registrar el grant.

## Capability Definition of Done — Full API Parity gate

- [ ] Cada operación UI despacha un command/reader canónico; el BFF sólo adapta/authentica.
- [ ] Capability + grant + coverage + enforcement runtime y tests negativos se entregan juntos.
- [ ] Errores/resultados/correlación coinciden con HTTP/SDK existentes.
- [ ] Mutaciones son aptas para propose → confirm → execute e idempotencia.

<!-- ZONE 2 — PLAN MODE: Discovery produce plan.md; no se llena al crear. -->
<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Delegation y BFF private adapter

- Implementar delegación HMAC V1 server-derived, TTL máximo 30 s, audience/purpose `ui` y fingerprint completo del
  request; el secreto vive en Secret Manager y nunca llega al browser.
- Separar caller BFF (`surface=ui`, delegación obligatoria) de caller workload (`surface=http`, principal servicio).
- Implementar adapter same-origin commands/readers/capabilities y output proxy streaming hacia la API IAM-private.
- Propagar trusted context/idempotency/correlation y sanitizar límites/errores.

### Slice 2 — Grants y surface enforcement

- Emitir/revocar grants Producer desde el broker y estampar `surface=ui` sólo desde el adapter confiable.
- Agregar conformance positivo/negativo; HTTP genérico no puede autodeclararse UI.
- Habilitar únicamente `globe.studio.access`, catalog, experiment run y assets para el piloto; voice preset se
  activa junto a su owner. No conceder reveal-house, evaluation, MCP ni capacidades administrativas por arrastre.

### Slice 3 — IAM, env, secrets y rollout interno

- Configurar mínima invocación BFF→API, origins/CSRF/session, revalidación privilegiada y flags por capability.
- Live smoke interno y runbook de rollback sin promover commercial runtime.

## Out of Scope

- Ledger/budgets (`TASK-1468`/`TASK-1482`), tenancy durable (`TASK-1511`) y modalidades (`TASK-1504`).
- Reimplementar commands/readers de Producer o habilitar MCP por arrastre.
- Elegir/activar el frontend comercial (`TASK-1521`).

## Detailed Spec

Flujo canónico: browser autenticado → BFF same-origin/CSRF → revalidación broker → principal+workspace desde
sesión/broker → delegación HMAC request-bound (TTL ≤30 s) + `surface=ui` → workload-authenticated private API →
CapabilityRegistry. La API verifica caller, firma, audience, expiry, path/method/body/capability/correlation/
idempotency, workspace y surface; el request del browser nunca es autoridad. La delegación es stateless: broker y
sesión siguen siendo source of truth; TASK-1511 conserva ownership de workspace/members/grants ricos.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 → Slice 2 → Slice 3. Ningún grant/UI flag se habilita antes de enforcement y negativos verdes.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Confused deputy o spoofing | identity/API | high | delegation acotada + trusted derivation + negativos | dispatch con actor/surface no verificable |
| Fuga de token/secret | BFF/IAM | medium | server-only + redaction + secret scan | token/cookie en response/log |
| Coverage dice available sin enforcement | registry | medium | fail-closed + conformance | UI dispatch por HTTP genérico |
| BFF admitido como servicio privilegiado | identity/API | high | allowlists y principal resolver separados | dispatch BFF sin delegationId |
| Output privado bufferizado o cacheado | media/API | medium | streaming + no-store + tests de headers | heap/latencia o cache compartida |

### Feature flags / cutover

`GLOBE_UI_BFF_ENABLED=false` por defecto y grant por capability; allowlist interna después de staging. El rollback
es flag OFF + revocar invoker BFF + retirar grants, sin tocar el caller workload existente.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | deshabilitar adapter/revertir cambio aditivo | medido en rehearsal | sí |
| 2 | revocar grants y volver coverage a policy-blocked | medido en rehearsal | sí |
| 3 | flag OFF + revocar IAM invoker del BFF | medido en rehearsal | sí |

### Production verification sequence

1. Ejecutar tests locales/conformance de spoofing, CSRF, replay y errores.
2. Desplegar staging con flags OFF; comprobar que paths existentes no cambian.
3. Habilitar una capability en allowlist; ejecutar smoke browser→BFF→API y negativos.
4. Repetir en internal runtime; commercial permanece bloqueado por `TASK-1521`.

### Out-of-band coordination required

Broker OAuth/grants, Cloud Run IAM, origin/redirect allowlist y secrets/env de runtime.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] Un humano autorizado ejecuta una capability Producer vía BFF y recibe resultado canónico correlacionado.
- [ ] Usuario sin grant, workspace ajeno, surface spoofed, CSRF/replay y direct-private-call fallan cerrado.
- [ ] Revocación, IAM, env/secrets y rollback tienen evidencia runtime sin secretos en logs.
- [ ] No se duplicó lógica de negocio, ledger, tenancy ni modalidades.

## Verification

- `pnpm task:lint --task TASK-1519`
- `pnpm check` en `../efeonce-globe`
- Conformance del spine + smoke staging/internal documentado.

## Closing Protocol

- [ ] Lifecycle/carpeta, README, Handoff y changelog se sincronizaron al cerrar.
- [ ] ADR/arquitectura se actualizaron sólo si Discovery cambió una frontera aceptada.
- [ ] Evidencia negativa y rollback quedaron adjuntos; internal ≠ commercial.

## Follow-ups

- `TASK-1521` para commercial runtime; nuevas surfaces dedicadas requieren owner/ADR propio.

## Open Questions

- Resuelta en Discovery 2026-07-22: delegación stateless HMAC V1, request-bound, TTL máximo 30 s y revalidación
  broker antes de dispatch privilegiado. No hay replay store ni grant persistente nuevo; el command conserva
  idempotencia y TASK-1511 sigue siendo dueña del modelo rico de tenancy/grants.
