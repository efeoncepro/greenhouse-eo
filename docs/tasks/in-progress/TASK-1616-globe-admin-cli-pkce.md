# TASK-1616 — Globe Admin CLI con OAuth PKCE y fondeo gobernado

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
- Backend impact: `integration`
- Epic: `EPIC-028`
- Status real: `Parcial`
- Rank: `TBD`
- Domain: `platform|identity|finance|globe`
- Blocked by: `none`
- Branch: `codex/TASK-1616-globe-admin-cli-pkce`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cierra la paridad programática que TASK-1566 declaró pero no entregó: un humano o agente autenticado por
Greenhouse podrá ejecutar `propose → confirm` desde un CLI first-party mediante Authorization Code +
PKCE, sin exportar cookies, compartir passwords ni asumir una identidad de workload. Una sesión agente
es válida y conserva esa procedencia hasta la evidencia financiera.

## Why This Task Exists

El command transaccional de fondeo está vivo y probado, pero su único adapter operativo exige una cookie
NextAuth humana. El CLI no tiene autenticación humana delegada, el broker OAuth sólo admite clientes
confidenciales y `agent-session` puede acuñar una sesión seleccionando un email. Esa combinación hizo que
cada operación reaprendiera el acceso y tentara atajos incompatibles con la atribución financiera.

## Goal

- Reusar el broker OAuth existente para un cliente público instalado con PKCE y loopback seguro.
- Publicar el fondeo en API Platform `app` como adapter del broker canónico, con entitlements e idempotencia.
- Entregar un CLI tipado y auditable que autorice una sesión Greenhouse en Chrome y no maneje cookies.
- Permitir confirmación agente sólo por delegación explícita del workspace y límites server-side.
- Ejercer el flujo real en staging y conservar readback correlacionado.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/creative-studio/EFEONCE_GLOBE_GREENHOUSE_ADMINISTRATION_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`
- `docs/architecture/GREENHOUSE_IDENTITY_ACCESS_V2.md`
- `docs/operations/ARCHITECTURE_DECISION_RECORD_OPERATING_MODEL_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- Greenhouse autentica y atribuye al usuario humano/agente; Globe conserva la autoridad y la mutación financiera.
- El CLI es cliente público: PKCE S256 obligatorio, ningún `client_secret` embebido.
- La excepción de puerto efímero aplica sólo a loopback `127.0.0.1`; scheme, host y path siguen exactos.
- Un principal de servicio nunca confirma. Un usuario agente requiere scopes, entitlements, política por workspace
  y límites de grant/tope mensual; el default fuera del workspace interno es OFF.
- API Platform y CLI son adapters; no duplican el command ni acceden a DB/Globe directamente.

## Normative Docs

- `docs/tasks/complete/TASK-1566-globe-governed-credit-funding-command.md`
- `docs/manual-de-uso/creative-studio/fondear-creditos-globe.md`
- `.codex/skills/greenhouse-globe/SKILL.md`

## Dependencies & Impact

### Depends on

- `src/lib/sister-platforms/oauth-broker.ts`
- `src/lib/globe/credit-administration-broker.ts`
- `src/lib/api-platform/core/app-auth.ts`
- `greenhouse_core.sister_platform_oauth_clients`
- `greenhouse_core.globe_credit_funding_intents`

### Blocks / Impacts

- Operación repetible de fondeo para evaluaciones y promoción de modelos Globe.
- Full API Parity real de la capability entregada por TASK-1566.
- Nexa queda fuera de este slice, pero puede consumir la misma API en el futuro sin autoridad adicional.

### Files owned

- `src/lib/sister-platforms/oauth-broker.ts`
- `src/app/api/integrations/v1/sister-platforms/oauth/token/route.ts`
- `src/app/api/platform/app/globe/credit-funding/**`
- `src/app/api/admin/globe/credit-funding/**`
- `src/lib/globe/credit-administration-broker.ts`
- `scripts/globe-credit-funding.mjs`
- `migrations/*task-1616*`
- `docs/manual-de-uso/creative-studio/fondear-creditos-globe.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_GREENHOUSE_ADMINISTRATION_DECISION_V1.md`

## Current Repo State

### Already exists

- TASK-1566 entregó commands, broker Greenhouse, rutas NextAuth y transacción única.
- El broker sister-platform ya implementa Authorization Code, PKCE S256, códigos one-time, auditoría,
  revocación y access tokens opacos.
- API Platform `app` ya valida bearer tokens, rehidrata permisos y registra requests.

### Gap

- El broker exige `client_secret`, por lo que no admite un CLI instalado de forma segura.
- El fondeo no está expuesto en API Platform `app` y no existe CLI tipado.
- No existe una política delegada y acotada para que los agentes confirmen sin fabricar identidad humana.

## Modular Placement Contract

- Topology impact: `api`
- Current home: `src/lib/sister-platforms/**`, `src/lib/api-platform/**`, `src/app/api/platform/app/**` y `scripts/**` en Greenhouse
- Future candidate home: `api`
- Boundary: OAuth broker emite identidad autenticada; API Platform adapta el broker de fondeo; el CLI sólo consume HTTP
- Server/browser split: command, stores, tokens y secretos son server-only; el navegador sólo autoriza y redirige el código one-time al loopback
- Build impact: `none` — usa Node y dependencias existentes; agrega un entrypoint local explícito
- Extraction blocker: API Platform y broker dependen de la sesión/identidad y Postgres canónicos de Greenhouse

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: OAuth clients/codes/tokens y evidencia append-only de fondeo
- Consumidores afectados: `API|CLI|E2E`
- Runtime target: `staging|production`

### Contract surface

- Contrato existente a respetar: broker OAuth sister-platform, API Platform `app`, ADR-015 y `credit-administration-broker.ts`
- Contrato nuevo o modificado: tipo OAuth `public|confidential`, exchange PKCE-only, routes app y CLI `globe:fund`
- Backward compatibility: `compatible` — confidential conserva secret y redirect exacto
- Full API parity: API NextAuth y API Platform consumen el mismo primitive; CLI consume API Platform

### Data model and invariants

- Entidades/tablas/views afectadas: `greenhouse_core.sister_platform_oauth_clients`
- Invariantes que no se pueden romper:
  - public nunca acepta/necesita `client_secret`; confidential siempre lo exige;
  - PKCE S256, state, código one-time y redirect binding siguen obligatorios;
  - puerto efímero sólo para `http://127.0.0.1/<path exacto>` de public clients;
  - confirmación agente exige `agent_confirmation_enabled`, límites y `actor_auth_mode=agent` durable;
  - `provider=agent` prevalece sobre el modo base de la cuenta; `unknown` y workloads fallan cerrados;
  - el fingerprint se compara contra la propuesta durable antes de registrar `confirm`;
  - una respuesta ambigua se reanuda con la idempotency key original y termina en `completed|confirm_failed`;
  - propuesta y confirmación usan idempotency keys distintas y correlacionadas.
- Tenant/space boundary: usuario rehidratado por access token; entitlement fino; workspace validado por broker
- Idempotency/concurrency: claves obligatorias; replay OAuth/command rechazado o estable por constraints existentes
- Audit/outbox/history: OAuth audit + API request log + funding intents append-only + correlación Globe

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: `disabled` hasta registrar `greenhouse-admin-cli`
- Backfill plan: `none`
- Rollback path: suspender cliente público y retirar routes; confidential no cambia
- External coordination: migración, registro de loopback, deploy staging y release gobernado

### Security and access

- Auth/access gate: NextAuth en authorize + OAuth bearer + entitlement fino
- Sensitive data posture: `finance|secrets`; tokens no se imprimen ni guardan en repo/.env
- Error contract: OAuth/API canónicos sanitizados; upstream crudo no cruza al CLI
- Abuse/rate-limit posture: API Platform limits, PKCE, state, TTL, one-time code, idempotencia y revocación

### Runtime evidence

- Local checks: tests focales OAuth/routes/CLI + lint/typecheck proporcional
- DB/runtime checks: migration gate, tipo de cliente y audit readback sin tokens
- Integration checks: PKCE con Chrome autenticado, propose→confirm real y readback
- Reliability signals/logs: OAuth audit, API request logs y señales credit-admin
- Production verification sequence: staging completo → release gobernado → health/read-only prod

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

<!-- ZONE 2 — PLAN MODE: ver docs/tasks/plans/TASK-1616-plan.md -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — OAuth public client PKCE

- Migración aditiva y mapping `public|confidential`.
- Exchange PKCE-only para public; secreto obligatorio para confidential.
- Loopback con puerto efímero y path/host exactos, con tests negativos.

### Slice 2 — API Platform y autoridad delegada

- Routes `app` propose/confirm como adapters del broker canónico.
- Enforcement server-side/DB que permite agente sólo en workspaces delegados y bajo ambos límites.
- Errores canónicos, rate limit, entitlement y tests.

### Slice 3 — CLI first-party

- PKCE, state, loopback efímero, apertura de Chrome y exchange.
- `propose → confirm` con preview, idempotencia distinta y salida redactada.
- Cero cookies, passwords, secrets persistidos o llamadas directas a Globe.

### Slice 4 — Rollout y operación real

- Migración/registro/deploy staging.
- Autorización con la sesión autenticada disponible en Chrome, humana o agente.
- Fondeo real, readback correlacionado y manual/skill actualizados.

## Out of Scope

- Crear otro ledger, command de crédito o sistema de sesiones.
- Dar autoridad de fondeo a un workload genérico, una API key global o un adapter sin política server-side.
- Exportar cookies, leer perfiles de Chrome o guardar tokens en archivos del repo.
- Cambiar el daily cap del Model Lab: es un fence distinto y se gobierna en TASK-1614.

## Detailed Spec

El `client_type` es una propiedad persistida y validada, no inferida por ausencia de secreto. El authorize
request conserva PKCE S256 para todos los clientes. En el token exchange, `confidential` autentica con el
secreto actual; `public` rechaza cualquier secreto y prueba posesión sólo con el `code_verifier`. Para el
redirect loopback de un public client se compara protocolo `http:`, hostname literal `127.0.0.1` y pathname
exacto contra el redirect registrado; el puerto lo elige el sistema operativo. Ningún otro host, protocolo,
path o tipo de cliente recibe esa excepción.

Las rutas API Platform reciben el bearer token, rehidratan al usuario y construyen el mismo entitlement
subject que las rutas admin existentes. Ambas delegan a `credit-administration-broker.ts`; no hacen HTTP
interno. Confirm persiste el auth mode y la base permite `agent` sólo para un workspace delegado, con límites
de grant y tope mensual; fuera de esa política falla cerrado. El CLI conserva access token sólo en memoria, imprime el plan sin tokens ni upstream
raw errors y destruye su servidor loopback al completar o expirar.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

Slice 1 → Slice 2 → Slice 3 → Slice 4. La política DB allow/deny/over-limit debe quedar verde antes del fondeo.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Public evita PKCE | identity | low | tipo explícito + tests negativos | `token_reject` |
| Loopback demasiado amplio | identity | medium | 127.0.0.1 + path exacto | `redirect_rejected` |
| Agente amplía su autoridad | finance | medium | política DB default-OFF + dos límites | error canónico + audit |
| Doble fondeo | finance | low | idempotency keys + propuesta durable | intent/grant duplicado |

### Feature flags / cutover

Sin flag global: el cliente OAuth no existe hasta registrarlo y puede suspenderse en DB.

### Rollback plan per slice

- Slice 1: revertir migration/code; confidential mantiene contrato previo.
- Slice 2: retirar routes app; rutas NextAuth y command siguen vivos.
- Slice 3: retirar entrypoint local, sin impacto runtime.
- Slice 4: suspender cliente y revertir deploy; el fondeo posteado queda auditado.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Verification

- `pnpm task:lint --task TASK-1616`
- tests focales OAuth, routes, autoridad y CLI
- `pnpm lint` y typecheck/build proporcional
- migration up/down y readback de constraints
- smoke OAuth PKCE + propose→confirm + readback correlacionado
- verificación posterior de Globe en UI autenticada

## Acceptance Criteria

- [ ] Public client PKCE funciona sin secret y confidential no cambia.
- [ ] Sólo loopback `127.0.0.1` con path exacto admite puerto efímero.
- [ ] API Platform expone propose/confirm sobre primitive existente con entitlement e idempotencia.
- [ ] Una sesión agente confirma dentro de la delegación interna; workspace no delegado y monto sobre límite fallan.
- [ ] CLI completa PKCE y fondeo sin cookies/passwords/secrets persistidos.
- [ ] Fondeo real staging conserva identidad + auth mode y tiene readback correlacionado.
- [ ] Tests, task gate, docs y verificación UI de Globe quedan verdes.

## Follow-ups

- Evaluar refresh token en Keychain sólo si la frecuencia operativa lo justifica.

## Closing Protocol

- Marcar todos los Acceptance Criteria únicamente con evidencia local/runtime proporcional.
- Cambiar `Lifecycle` a `complete` y mover este archivo a `docs/tasks/complete/`.
- Actualizar `docs/tasks/README.md`, `TASK_ID_REGISTRY.md`, `Handoff.md` y `changelog.md`.
- Actualizar ADR-015 mediante delta append-only y el manual operativo.
- Ejecutar `pnpm qa:gates --changed`, `pnpm docs:closure-check` y `pnpm docs:context-check:strict`.
- Eliminar el worktree temporal sólo después de preservar branch/commits y verificar que no contiene basura.
