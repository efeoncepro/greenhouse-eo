# TASK-1629 — Globe Admin CLI con OAuth PKCE y fondeo gobernado

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
- Status real: `PR #176 integrado; base OAuth/API/CLI viva; autoridad one-shot y adapters one-command/readback pendientes`
- Rank: `next.4`
- Domain: `platform|identity|finance|globe`
- Blocked by: `TASK-1482, TASK-1586`
- Branch: `none — base integrada por PR #176; crear branch TASK-1629 sólo al retomar el delta pendiente`
- Legacy ID: `TASK-1616` (etiqueta histórica de la rama; colisionó y fue reasignada a MiniMax H3)
- GitHub Issue: `none`

## Summary

La base integrada cierra el acceso programático `propose → confirm` mediante OAuth PKCE, API Platform y CLI
first-party. El delta pendiente agrega autoridad one-shot y adapters `status/readback/ensure/reconcile` que
consumen TASK-1482/TASK-1586, sin duplicar el lifecycle económico ni asumir una identidad de workload.

## Why This Task Exists

El command transaccional de fondeo y el acceso OAuth/CLI ya están vivos, pero el operador todavía debe aportar
pool/período y dos claves, y no dispone de recovery autoritativo ante timeout. Además, la instrucción textual del
CEO todavía no se materializa como autoridad one-shot de runtime. Sin ese delta, la automatización sigue siendo
plomería recuperada, no una operación end-to-end robusta.

## Goal

- Conservar la base ya integrada: OAuth public client PKCE, API Platform, CLI, provenance y agent-confirm.
- Materializar una instrucción atribuida del CEO como autoridad one-shot exacta, expirable y no reutilizable.
- Exponer en API Platform/CLI los readers/recovery de TASK-1586 y `ensure-funded` de TASK-1482, con una operation
  key visible y readback-first.
- Alinear el vocabulario Globe `HumanAttributionV1`/`assertHumanAttribution` con la frontera real: usuario
  autenticado humano o agente delegado; service/workload principal rechazado.
- Ejercer el flujo end-to-end en staging y conservar receipt correlacionado.

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
- La excepción de puerto efímero aplica al loopback registrado `127.0.0.1`; scheme/path siguen exactos y
  `localhost` se acepta sólo como normalización observada de Vercel/Next para ese mismo request.
- Un principal de servicio nunca confirma. Un usuario agente requiere scopes, entitlements, política por workspace
  y límites de grant/tope mensual; el default fuera del workspace interno es OFF.
- API Platform y CLI son adapters; no duplican el command ni acceden a DB/Globe directamente.
- `runAppRoute` debe propagar `oauthSessionAuthMode` desde la resolución del bearer hasta el handler; omitirlo
  degrada una sesión válida a `unknown` y el broker financiero la rechaza correctamente.

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
- `TASK-1482` para `ensure-funded` y `CreditDecisionSnapshot`.
- `TASK-1586` para lifecycle/status/list/get/reconcile y receipts autoritativos.

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
- `src/config/entitlements-catalog.ts`
- `src/lib/entitlements/runtime.ts`
- `src/lib/api/canonical-error-response.ts`
- `src/lib/api-platform/resources/app-globe-credit-funding.ts`
- `src/app/api/admin/globe/credit-funding/confirm/route.ts`
- `scripts/globe-credit-funding.ts`
- adapters y tipos de autoridad one-shot bajo paths definidos en Plan Mode;
- en `efeonce-globe`, sólo el rename/evolución compatible de attribution que evita llamar “humano” al usuario
  agente autenticado; TASK-1586 posee lifecycle/list/get/reconcile.
- `migrations/*task-1616*`
- `docs/manual-de-uso/creative-studio/fondear-creditos-globe.md`
- `docs/architecture/creative-studio/EFEONCE_GLOBE_GREENHOUSE_ADMINISTRATION_DECISION_V1.md`

Los nombres `migrations/*task-1616*` son históricos y ya fueron aplicados. No se renombran ni reescriben: el
ownership operativo vigente de ese trabajo es `TASK-1629`.

## Current Repo State

### Already exists

- TASK-1566 entregó commands, broker Greenhouse, rutas NextAuth y transacción única.
- El broker sister-platform ya implementa Authorization Code, PKCE S256, códigos one-time, auditoría,
  revocación y access tokens opacos.
- API Platform `app` ya valida bearer tokens, rehidrata permisos y registra requests.
- PR `#176` agregó el cliente público, routes API Platform, CLI first-party, provenance de auth mode, policy
  agente por workspace y reanudación con la idempotency key original.

### Gap

- El source of truth OAuth PKCE/API Platform/CLI fue integrado por PR `#176`; la rama histórica
  `codex/TASK-1616-globe-admin-cli-pkce` no se integra completa ni se renombran migraciones aplicadas.
- Sólo existen adapters `propose`/`confirm`; faltan adapters API Platform/CLI sobre el status/list/get/reconcile
  que entregará TASK-1586 para resolver outcomes ambiguos y operar propuestas stale individualmente.
- El CLI todavía expone plomería de pool/período y dos idempotency keys; falta la fachada `ensure-funded` con una
  operation key y resolución server-side del ciclo.
- La delegación persistente acota grant/tope, pero aún falta modelar la instrucción one-shot del CEO con período,
  target, vigencia, fingerprint y receipt, coordinada por TASK-1630.
- El contrato Globe todavía llama `HumanAttributionV1`/`assertHumanAttribution` a un guard que en realidad rechaza
  service principals y acepta usuarios agentes ya autorizados por Greenhouse; el nombre/comentarios deben converger.
- Greenhouse ya aplica en DB que `confirmante != proponente` depende de `requireSecondConfirmer`, pero comentarios y
  copy de error en `entitlements-catalog.ts`, `entitlements/runtime.ts`, `credit-administration-broker.ts`, la route
  admin, API Platform y `canonical-error-response.ts` todavía la presentan como invariante universal; TASK-1629
  debe alinearlos sin borrar el error condicional que sigue siendo válido cuando la policy está activa.

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
  - puerto efímero sólo para el loopback registrado `http://127.0.0.1/<path exacto>` de public clients;
    `localhost` es un alias de transporte aceptado sólo contra ese registro y nunca se persiste como redirect;
  - confirmación agente exige `agent_confirmation_enabled`, límites y `actor_auth_mode=agent` durable;
  - `provider=agent` prevalece sobre el modo base de la cuenta; `unknown` y workloads fallan cerrados;
  - el fingerprint se compara contra la propuesta durable antes de registrar `confirm`;
  - en la base V1, una respuesta ambigua puede reanudarse con la idempotency key original; tras TASK-1586 se lee
    primero status/receipt y sólo se redispatcha si el estado autoritativo demuestra que no hubo efecto;
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

<!-- ZONE 2 — PLAN MODE: ver docs/tasks/plans/TASK-1629-plan.md -->

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
- Bypass de automatización Vercel resuelto por el helper canónico y limitado a requests API de staging;
  nunca se incorpora al authorization URL ni se imprime.
- `propose → confirm` con preview, idempotencia distinta y salida redactada.
- Cero cookies, passwords, secrets persistidos o llamadas directas a Globe.

### Slice 4 — Rollout y operación real

- Migración/registro/deploy staging.
- Autorización con la sesión autenticada disponible en Chrome, humana o agente.
- Fondeo real, readback correlacionado y manual/skill actualizados.

Las Slices 1–4 quedaron entregadas por PR `#176`; se preservan como evidencia y no se reimplementan.

### Slice 5 — Attribution y autoridad one-shot

- Evolucionar la nomenclatura `HumanAttributionV1`/`assertHumanAttribution` a usuario autenticado sin romper el
  wire contract; Globe sigue rechazando principals `globe:service:*` y Greenhouse valida sesión/delegación.
- Corregir comentarios y copy Greenhouse para explicar que maker-checker es policy opcional por workspace/umbral;
  conservar `confirmer_is_proposer` únicamente como resultado condicional cuando `requireSecondConfirmer` está ON.
- Persistir autoridad one-shot exacta con issuer CEO, workspace, período, target/cap, TTL, max executions,
  fingerprint, revocación y evidence reference; el agente no puede emitirla ni ampliarla.

### Slice 6 — Adapters one-command y recovery

- Consumir `ensure-funded` de TASK-1482 y status/list/get/reconcile de TASK-1586 desde API Platform/CLI.
- Exponer `preview|ensure|status|operations get|list|reconcile` con una operation key; cero DB/Globe directo.
- Timeout ejecuta readback-first y sólo redispatcha si el receipt autoritativo prueba ausencia de efecto.

### Slice 7 — Evidencia end-to-end

- Ejercer instrucción CEO → autoridad one-shot → preview/propose/confirm → status/receipt en staging con la sesión
  Chrome autenticada indicada por el operador.
- Probar expiración, fingerprint mismatch, revocación, over-limit, service principal deny y timeout recuperado.

## Out of Scope

- Crear otro ledger, command de crédito o sistema de sesiones.
- Dar autoridad de fondeo a un workload genérico, una API key global o un adapter sin política server-side.
- Exportar cookies, leer perfiles de Chrome o guardar tokens en archivos del repo.
- Cambiar el daily cap del Model Lab: es un fence distinto y se gobierna en TASK-1614.

## Detailed Spec

El `client_type` es una propiedad persistida y validada, no inferida por ausencia de secreto. El authorize
request conserva PKCE S256 para todos los clientes. En el token exchange, `confidential` autentica con el
secreto actual; `public` rechaza cualquier secreto y prueba posesión sólo con el `code_verifier`. Para el
redirect loopback de un public client se compara protocolo `http:` y pathname exacto contra el redirect
registrado `127.0.0.1`; el puerto lo elige el sistema operativo. Vercel/Next normaliza ese query param a
`localhost`, por lo que el matcher admite ese único alias de runtime, lo canoniza al registro literal antes
de emitir el código y exige igualdad exacta en el token exchange; ningún otro
host, protocolo, path o tipo de cliente recibe la excepción.

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
| Loopback demasiado amplio | identity | medium | registro 127.0.0.1 + alias localhost medido + path exacto | `redirect_rejected` |
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

- `pnpm task:lint --task TASK-1629`
- tests focales OAuth, routes, autoridad y CLI
- `pnpm lint` y typecheck/build proporcional
- migration up/down y readback de constraints
- smoke OAuth PKCE + propose→confirm + readback correlacionado
- verificación posterior de Globe en UI autenticada

## Acceptance Criteria

- [x] Public client PKCE funciona sin secret y confidential no cambia (PR `#176`).
- [x] Sólo loopback registrado `127.0.0.1` (o su alias Vercel `localhost`) con path exacto admite puerto efímero.
- [x] API Platform expone propose/confirm sobre primitive existente con entitlement e idempotencia.
- [x] Una sesión agente confirma dentro de la delegación interna; workspace no delegado y monto sobre límite fallan.
- [x] CLI completa PKCE y fondeo sin cookies/passwords/secrets persistidos.
- [x] Fondeo real staging conserva identidad + auth mode y tiene readback correlacionado.
- [x] Tests y evidencia de la base integrada quedaron asociados a PR `#176`/TASK-1566.
- [ ] API Platform y CLI adaptan `status/list/get/reconcile` de TASK-1586 sin duplicar lifecycle ni errores crudos.
- [ ] El CLI ofrece `status`, `preview`, `ensure` y `operations reconcile` usando una sola operation key visible.
- [ ] Una instrucción one-shot atribuida del CEO puede autorizar al mismo usuario agente para proponer y confirmar
  cuando `requireSecondConfirmer` está OFF; una policy que lo active sigue exigiendo actor distinto.
- [ ] Los comentarios, errores y manuales dejan de presentar `confirmante ≠ proponente` como invariante universal.
- [ ] El contrato y guard de Globe describen “usuario autenticado” y no “humano”; principals de servicio siguen
  fallando cerrados y la evidencia conserva `actor_auth_mode`.

## Follow-ups

- Evaluar refresh token en Keychain sólo si la frecuencia operativa lo justifica.

## Delta 2026-08-01 — PR integrado; cierre rebaselinado por TASK-1630

PR `#176` fue mergeada a `develop` en `626eda751`. Quedaron integrados OAuth public client + PKCE, API Platform,
CLI tipado, provenance `actor_auth_mode`, policy de agent-confirm y terminalización local
`completed|confirm_failed`. La etiqueta histórica `TASK-1616` permanece únicamente en nombres de migraciones ya
aplicadas; el owner vigente es TASK-1629.

La task no cierra todavía: el control plane necesita readers de operación, recuperación ante timeout, preview
puro y la fachada `ensure-funded` coordinada por TASK-1630. El requisito del operador queda explícito: en el
workspace owner-operated, una instrucción atribuida del CEO permite que el mismo usuario agente autenticado
complete `preview → propose → confirm → readback`; el segundo actor sólo se exige cuando una policy del
workspace/umbral lo activa.

## Closing Protocol

- Marcar todos los Acceptance Criteria únicamente con evidencia local/runtime proporcional.
- Cambiar `Lifecycle` a `complete` y mover este archivo a `docs/tasks/complete/`.
- Actualizar `docs/tasks/README.md`, `TASK_ID_REGISTRY.md`, `Handoff.md` y `changelog.md`.
- Actualizar ADR-015 mediante delta append-only y el manual operativo.
- Ejecutar `pnpm qa:gates --changed`, `pnpm docs:closure-check` y `pnpm docs:context-check:strict`.
- Limpiar únicamente los snapshots temporales creados para esta recuperación después de preservar branch/commits.
- No crear ni usar worktrees aislados para esta task.
