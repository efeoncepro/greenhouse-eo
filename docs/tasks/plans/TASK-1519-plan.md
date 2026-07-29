# TASK-1519 — Execution Plan

- Fecha: 2026-07-22
- Estado: aprobado por el operador; ejecución autorizada
- Repos: `greenhouse-eo` + sibling `efeonce-globe`
- Skills: `greenhouse-globe`, `software-architect-2026`, `greenhouse-secret-hygiene`,
  `greenhouse-task-execution-hook`, `greenhouse-task-planner`

## Audit

El runtime actual sirve `web` y `api` desde el mismo artefacto, pero ambos despachan localmente. La API convierte
todo caller permitido en `internalServicePrincipal()`. Por ello `web_runtime` no puede agregarse al allowlist
genérico: sería un confused deputy con autoridad interna. Los grants OAuth sólo incluyen el shell, UI coverage
sigue bloqueado y el output del web no cruza la API privada.

TASK-1504 está avanzada localmente pero no cerrada operacionalmente: adapters fake, voice preset in-memory,
multi-output Omni no real, voice cloning sin job/vendor binding, retrieval no entiende descriptores por output y no
hay deploy/canary. TASK-1519 no falsificará esas capabilities; sólo habilitará las que tengan owner ejecutable.

## Decisions

1. Caller workload existente conserva allowlist/principal servicio y `surface=http`.
2. Caller BFF usa allowlist separada; sin delegación válida recibe `access_denied`, nunca principal servicio.
3. Delegación HMAC V1 stateless, server-only, request-bound y TTL máximo 30 s. Claims: issuer/audience/purpose,
   actor/workspace/capabilities/surface, caller, method/path/body hash/capability/correlation/idempotency, iat/exp/jti.
4. Broker/sesión siguen siendo source of truth. Revalidación privilegiada ocurre antes de emitir delegación.
   TASK-1511 conserva ownership del modelo rico de tenancy y grants.
5. El BFF adapta transporte y outputs; no duplica policy/routing/pricing/commands/readers.
6. CSRF HMAC ligado a sesión + Origin/Sec-Fetch-Site/content-type para mutaciones same-origin.
7. Flag `GLOBE_UI_BFF_ENABLED` inicia OFF. MCP, reveal-house, evaluation y commercial permanecen bloqueados.

## Execution slices

### 1. Contracts and caller isolation

- Contrato/codec/firma/verificación de delegación y fingerprint determinista.
- Preservar email del caller verificado y clasificar BFF vs workload.
- Resolver principal/surface fail-closed; audit durable incluye caller/delegation/fingerprint sin secretos.
- Tests tamper/expiry/audience/path/body/correlation/idempotency y BFF sin delegación.

### 2. Same-origin BFF and private API

- Proxy tipado capabilities/commands/readers usando ADC ID token y delegation header server-only.
- CSRF, Origin, bounds, error sanitation y revalidación del broker.
- Output proxy BFF → API con ownership/capability/grant y streaming/no-store; definir Range explícitamente.
- Pruebas de no ejecución local, spoofing, propagación de correlation/idempotency y secreto ausente del browser.

### 3. Broker grants and coverage

- Primitive focal y reversible para ampliar grants sin reemplazar redirects ni rotar client secret.
- Solicitar/emitir sólo shell + catalog + experiment run + assets; voice preset cuando cierre su owner.
- Promover coverage UI exclusivamente después de enforcement verde; HTTP/MCP conservan semántica propia.
- Tests tenant/client suspendido/scope faltante/revocación.

### 4. IaC and rollout controls

- Invoker mínimo para `web_runtime`, allowlist BFF separada, API URL/audience y secret refs en ambos runtimes.
- Retirar del web permisos/provider secrets/bucket que el BFF ya no necesita.
- Terraform validate/plan sin replace; flags OFF, staging negativos, capability piloto, smoke interno y rollback.

### 5. Verification and closure

- `pnpm test`, `pnpm check`, `pnpm build` en Globe; gates focales en Greenhouse.
- Secret scan, tests de contratos, evidencia de IAM/flags/audit y verificación de no secretos.
- Actualizar ADR/spec/runbook/task/README/Handoff/changelog con estado runtime honesto.

## Ordering and rollback

Caller isolation → delegación/API → BFF/CSRF/output → broker grants/coverage → IaC flag OFF → staging negativos →
piloto interno. Nunca se habilita coverage/grant antes de los negativos. Rollback: flag OFF, retirar grants y revocar
invoker BFF; el caller workload y los commands/readers existentes permanecen intactos.

## Completion boundary

La task sólo puede cerrar con humano → BFF → API privado positivo y negativos de spoofing/revocación. Código sin
deploy queda `code complete, rollout pendiente`. Commercial continúa en TASK-1521 y la UI completa en TASK-1505.
