# TASK-1513 — Sister Platform Redirect Allowlist Governance

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P1`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `api`
- Epic: `none`
- Status real: `Diseño; la primitive existe y funciona, pero sin audit persistido, sin capability y sin contrato programático`
- Rank: `TBD`
- Domain: `identity`
- Blocked by: `none`
- Branch: `task/TASK-1513-sister-platform-redirect-allowlist-governance`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Cerrar las tres piezas de gobernanza que `updateSisterPlatformOAuthRedirectUris` declaró faltantes al nacer
(`GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md` §15.5): **audit trail persistido**, **capability de
entitlements** que gobierne quién puede mover un allowlist, y **contrato programático** (route + MCP) para que la
capability deje de operarse sólo por CLI.

## Why This Task Exists

`TASK-1507` extrajo la primitive aditiva porque el mecanismo anterior —el seed script— reemplazaba el array completo y
rotaba el client secret, lo que la hacía inservible para un cutover. La primitive resolvió eso bien: transaccional,
idempotente, con `normalizeRedirectUris` como única autoridad de validación.

Pero quedó a medio gobernar, y el propio contrato lo dice: acepta un `actorUserId` que **no persiste en ningún lado**, y
**ninguna capability** decide quién puede ejecutarla. Mover un redirect allowlist es un write sensible de identidad —
es la lista que determina a qué URL puede volar un código de autorización— y hoy lo puede correr cualquiera con acceso
al repo y a la DB, sin dejar rastro de quién fue.

Además viola el **Full API Parity Principle**: la capability existe pero no tiene contrato programático gobernado, así
que ni Nexa ni MCP ni una superficie de admin pueden operarla sin reimplementar lógica.

## Goal

- Persistir quién cambió un redirect allowlist, cuándo y qué cambió, de forma auditable.
- Gobernar la operación con una capability del catálogo de entitlements, granteada a roles reales.
- Exponer el contrato programático (route + MCP) para que CLI, UI, Nexa y MCP consuman la misma primitive.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md` (§15.5 — el hueco que esta task cierra)
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_ENTITLEMENTS_AUTHORIZATION_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/creative-studio/GREENHOUSE_CONNECTIVITY_V1.md` (ADR-001)

Reglas obligatorias:

- La validación sigue viviendo en `normalizeRedirectUris`: sin wildcards, HTTPS salvo localhost, nunca vacío. La route
  **no** re-implementa validación propia.
- La primitive sigue tocando **sólo** `redirect_uris`: nunca policy, scopes, TTLs ni el token del consumer.
- Toda capability nueva nace con grant a ≥1 rol real de `src/config/role-codes.ts` en el mismo PR
  (guard `capability-grant-coverage.test`).
- Errores al cliente por `canonicalErrorResponse` en es-CL; nunca prosa inglesa ni detalle interno.

## Normative Docs

- `docs/tasks/complete/TASK-1507-globe-internal-front-door-alb-terraform.md`
- `docs/documentation/plataforma/sister-platform-bindings.md`
- `docs/architecture/GREENHOUSE_SISTER_PLATFORM_BINDINGS_RUNTIME_V1.md`

## Dependencies & Impact

### Depends on

- `src/lib/sister-platforms/oauth-broker.ts` → `updateSisterPlatformOAuthRedirectUris` (ya existe).
- `greenhouse_core.sister_platform_oauth_clients` (tabla vigente).
- `capabilities_registry` + `src/config/entitlements-catalog.ts` + `src/lib/entitlements/runtime.ts`.
- Patrón de audit vigente del dominio sister-platforms `[verificar]`.

### Blocks / Impacts

- Cierra el hueco declarado en `GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md` §15.5.
- Habilita operar el allowlist desde Nexa/MCP/UI sin duplicar lógica (Full API Parity).
- Afecta a los dos clientes vivos del broker: `globe` y `kortex`.

### Files owned

- `src/lib/sister-platforms/oauth-broker.ts`
- `src/app/api/admin/integrations/sister-platform-oauth-clients/[clientId]/redirect-uris/route.ts` (nuevo) `[verificar]`
- `migrations/` (tabla o extensión de audit) `[verificar]`
- `src/config/entitlements-catalog.ts`, `src/lib/entitlements/runtime.ts`
- `scripts/sister-platform-oauth-redirect-uris.ts`
- `docs/architecture/GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md`
- `docs/documentation/plataforma/sister-platform-bindings.md`

## Current Repo State

### Already exists

- `updateSisterPlatformOAuthRedirectUris`: aditiva/sustractiva, una transacción, `SELECT ... FOR UPDATE`, toca sólo
  `redirect_uris`, idempotente, falla fuerte al quitar un URI no allowlisted, 404 en cliente desconocido.
- 11 tests unitarios (`src/lib/sister-platforms/oauth-redirect-uris.test.ts`).
- CLI `pnpm sister-platform:redirect` con dry-run por defecto.
- `normalizeRedirectUris` como autoridad de validación única.

### Gap

- `actorUserId` se acepta como parámetro pero **no se persiste**: no hay forma de saber quién movió un allowlist.
- No existe capability que gobierne la operación; hoy basta acceso al repo y a la DB.
- No hay route ni MCP: la única superficie es el CLI, lo que viola Full API Parity.
- La doc funcional documenta el CLI pero no hay contrato programático que referenciar.

## Modular Placement Contract

- Topology impact: `api`
- Current home: `src/lib/sister-platforms + src/app/api/admin/integrations + migrations`
- Future candidate home: `remain-shared`
- Boundary: `la primitive del broker es el único escritor de redirect_uris; CLI, route, MCP y Nexa son consumers`
- Server/browser split: `server-only; el broker ya es server-only y la route corre en runtime nodejs`
- Build impact: `none`
- Extraction blocker: `acoplado a greenhouse_core y al modelo de entitlements de Greenhouse`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `api`
- Source of truth afectado: `greenhouse_core.sister_platform_oauth_clients.redirect_uris + su audit trail`
- Consumidores afectados: `CLI, futura route admin, MCP/Nexa, operadores de identidad`
- Runtime target: `production`

### Contract surface

- Contrato existente a respetar: `updateSisterPlatformOAuthRedirectUris (firma y garantías), normalizeRedirectUris`
- Contrato nuevo o modificado: `capability nueva + route admin + registro de audit`
- Backward compatibility: `gated` — el CLI sigue funcionando; la capability se exige desde el primer release
- Full API parity: `SÍ — esta task es precisamente la que la restituye para esta capability`

### Data model and invariants

- Entidades/tablas/views afectadas: `sister_platform_oauth_clients` + tabla de audit `[verificar]`
- Invariantes que no se pueden romper:
  - `sólo la primitive escribe redirect_uris; la route no hace SQL propio`
  - `sin wildcards, HTTPS salvo localhost, allowlist nunca vacío`
  - `nunca se tocan policy, scopes, TTLs ni el token del consumer`
  - `todo cambio queda con actor, timestamp y diff (antes/después) persistido`
- Tenant/space boundary: `operación de plataforma, no de tenant; la capability es interna`
- Idempotency/concurrency: `ya resuelto por la primitive (FOR UPDATE + merge idempotente); la route no lo relaja`
- Audit/outbox/history: `el objeto de la task — audit persistido; evaluar outbox event si hay consumers downstream`

### Migration, backfill and rollout

- Migration posture: `migration` (tabla o columnas de audit) + seed de la capability en `capabilities_registry`
- Default state: `capability granteada sólo a roles internos de identidad/admin`
- Backfill plan: `N/A — el audit arranca desde el primer cambio posterior; los cambios previos quedan sin actor`
- Rollback path: `revert de la route + capability; la primitive y el CLI siguen operando como hoy`
- External coordination: `owner de identidad para decidir qué roles reciben la capability`

### Security and access

- Auth/access gate: `sesión + capability nueva; least-privilege, nunca admin broad`
- Sensitive data posture: `pii` — el audit guarda actor y diff de URIs; nunca el client secret ni tokens
- Error contract: `canonicalErrorResponse en es-CL con code estable; sin filtrar detalle interno`
- Abuse/rate-limit posture: `write de identidad de baja frecuencia; la capability es el control principal`

### Runtime evidence

- Local checks: `pnpm local:check`, tests focales del broker
- DB/runtime checks: verificar la fila de audit tras un cambio real; confirmar que `redirect_uris` quedó correcto
- Integration checks: cambio por la route con capability presente (200) y ausente (403); CLI sigue funcionando
- Reliability signals/logs: `captureWithDomain` en el path de error; evaluar signal de drift `[verificar]`
- Production verification sequence: ver §Rollout Plan

### Acceptance criteria additions

- [ ] Source of truth, contract surface y consumers nombrados con paths reales.
- [ ] Invariantes de validación y de "sólo redirect_uris" preservados.
- [ ] Postura de rollback explícita por slice.
- [ ] Evidencia runtime listada (fila de audit real, 200/403 por capability).
- [ ] Sin secretos ni tokens en el audit.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Audit persistido

- Migration con el registro de cambios de allowlist: cliente, actor, timestamp, URIs antes y después.
- La primitive escribe el audit **dentro de la misma transacción** que el `UPDATE`: o quedan los dos, o ninguno.
- Tests: el audit refleja el diff real y no se escribe cuando la operación es no-op.

### Slice 2 — Capability de entitlements

- Capability nueva en `capabilities_registry` (migration seed) + `entitlements-catalog.ts`.
- Grant a ≥1 rol real en `src/lib/entitlements/runtime.ts`, en el mismo PR (guard de coverage).
- La primitive o su caller exigen la capability; el CLI declara con qué identidad opera.

### Slice 3 — Contrato programático (route + MCP)

- Route admin que consume la primitive, con `can(...)`, validación de payload y `canonicalErrorResponse`.
- Exposición MCP/Nexa por el mismo contrato, sin lógica duplicada.
- Doc técnica + funcional actualizadas; §15.5 deja de declarar el hueco y pasa a describir el contrato.

## Out of Scope

- Cambiar el modelo de federación, PKCE, scopes o la política de los clientes OAuth.
- Reemplazar los seed scripts de provisioning (`seed-globe-internal-pilot.ts`, `seed-kortex-...`).
- UI visible: esta task entrega el contrato; una superficie de admin es otra task.
- Tocar `redirect_uris` de un cliente específico como parte de la task (eso es operación, no plataforma).

## Detailed Spec

El punto delicado es el **orden**: la capability debe existir y estar granteada antes de que la route la exija, o el
primer release deja la operación inalcanzable para todos. Por eso Slice 2 precede a Slice 3.

El audit va **dentro** de la transacción del `UPDATE`, no después. Un audit escrito fuera de la transacción puede
perderse ante un rollback y produce exactamente el problema que la task quiere resolver: un cambio sin rastro.

El CLI existente no se rompe: sigue invocando la primitive. Lo que cambia es que declara identidad y queda auditado.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 (audit) → Slice 2 (capability + grant) → Slice 3 (route/MCP).
- NUNCA exponer la route antes de que la capability esté seedeada y granteada: dejaría el write inalcanzable o abierto.
- NUNCA escribir el audit fuera de la transacción del `UPDATE`.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| La capability se exige antes de estar granteada | Identity | medium | Slice 2 antes de Slice 3; guard de coverage en CI | 403 para todos los roles |
| El audit se pierde ante rollback | Datos | medium | escritura dentro de la misma transacción | cambio en `redirect_uris` sin fila de audit |
| La route re-implementa validación y diverge | Identity | medium | la route sólo llama la primitive; test que lo verifica | wildcard o URI no-HTTPS aceptado por la route |
| Un secreto entra al audit | Security | low | el audit guarda sólo URIs y actor; revisión explícita | client secret o token en la tabla de audit |

### Feature flags / cutover

Sin feature flag. El cutover es de gobernanza: la capability empieza granteada a roles internos y la route nace ya
gateada. El CLI convive sin cambios de comportamiento observable más allá del audit.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revert del PR; la tabla de audit queda vacía y sin consumers | <30 min | sí |
| Slice 2 | revert de capability + grant; la primitive vuelve a no exigirla | <30 min | sí |
| Slice 3 | revert de la route/MCP; el CLI sigue siendo la superficie | <30 min | sí |

### Production verification sequence

1. Aplicar migration de audit; verificar que un cambio real deja fila con diff correcto.
2. Seedear + grantear la capability; verificar 200 con capability y 403 sin ella.
3. Ejercitar la route contra un cliente de prueba y confirmar que el allowlist quedó correcto.
4. Confirmar que el CLI sigue operando y ahora queda auditado.

### Out-of-band coordination required

- Owner de identidad para decidir qué roles reciben la capability nueva.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Todo cambio de redirect allowlist deja fila de audit con actor, timestamp y diff antes/después.
- [ ] El audit se escribe en la misma transacción que el `UPDATE`: no existe cambio sin rastro.
- [ ] Existe capability nueva en `capabilities_registry` + catálogo TS, granteada a ≥1 rol real en el mismo PR.
- [ ] La route admin consume la primitive, exige la capability (200 con / 403 sin) y responde errores es-CL canónicos.
- [ ] La route no re-implementa validación: wildcards y no-HTTPS siguen rechazados por `normalizeRedirectUris`.
- [ ] MCP/Nexa operan la capability por el mismo contrato, sin lógica duplicada.
- [ ] El CLI existente sigue funcionando y queda auditado.
- [ ] §15.5 del contrato deja de declarar el hueco y describe el contrato vigente.

## Verification

- `pnpm local:check`, `pnpm test` (full), `pnpm build`
- `pnpm vitest run src/lib/sister-platforms`
- Verificación en DB de la fila de audit tras un cambio real
- `pnpm task:lint --task TASK-1513`, `pnpm ops:lint --changed`, `pnpm docs:closure-check`

## Closing Protocol

- [ ] `Lifecycle` sincronizado con el estado real.
- [ ] El archivo vive en la carpeta correcta.
- [ ] `docs/tasks/README.md` y `TASK_ID_REGISTRY.md` sincronizados.
- [ ] `GREENHOUSE_SISTER_PLATFORMS_INTEGRATION_CONTRACT_V1.md` §15.5 actualizado.
- [ ] Doc funcional (`sister-platform-bindings.md`) y manual actualizados.
- [ ] `greenhouse-qa-release-auditor` y `greenhouse-documentation-governor` revisan el cierre.

## Follow-ups

- Superficie de admin visible para operar allowlists (UI), si el uso lo justifica.
- Revisar si otros writes del broker comparten el mismo hueco de audit/capability.

## Open Questions

- ¿El audit va a una tabla nueva dedicada o extiende el registro de audit existente del dominio sister-platforms?
  Resolver en Discovery contra el patrón vigente `[verificar]`.
