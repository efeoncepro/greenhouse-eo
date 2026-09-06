# TASK-1832 — plan de ejecución 2026-09-06

Goal confirmado por el operador y `pnpm codex:task-hook TASK-1832 --develop` ejecutado. Trabajo en el checkout
compartido, sin subagentes ni worktrees. El WIP visible de TASK-1835 queda fuera del ownership y nunca se incluye
en staging. Este documento es el checkpoint P0/Alto previo a implementación: está pendiente de aprobación.

## Resultado y evidencia admisible

El resultado es una certificación técnica del issuer nativo y del gateway mediante una población externa
sintética controlada por Efeonce. Debe probar el mismo recorrido que usaría una persona cliente —invitación,
sesión, consentimiento, code + PKCE, access/refresh token, resolución y dispatch— sin usar una organización
cliente, escribir datos de negocio ni atribuir adopción comercial. Sólo se declara `complete` después de la
matriz live, cleanup y siete días steady; antes de eso el máximo honesto es `code complete, rollout pendiente`.

No cuentan como cierre: metadata/readyz 200, status del gateway, un JWT inyectado manualmente, tests skipped,
capturas con DTOs ficticios, migración registrada sin apply, push sin deploy o deploy sin readback de policy.

## Auditoría de partida

| Frontera | Estado verificado | Consecuencia del plan |
|---|---|---|
| `bindExternalOrganization` | Requiere organización `client|both` + lifecycle `active_client` | No se relaja. El canary usa command y registry separados. |
| Resolver externo | Devuelve binding/grants sin purpose ni vencimiento de binding | El contrato añade ambos y falla cerrado por flag/expiry/revocation. |
| Gateway | `native-external` no despacha tools de negocio; status no prueba grants | Se agrega una excepción declarativa sólo para el tool read seguro. |
| Auth server | Emite a partir de memberships resueltas por Greenhouse | El gate Greenhouse debe cortar también emisión, no sólo dispatch. |
| `identity_profiles.data_origin` | Existe `real|synthetic_seed|smoke_test|demo`, default `real` | El canary declara `smoke_test` al nacer; nunca se deriva de email/nombre. |
| Person/Account 360 | Readback DB: los 30 perfiles `smoke_test` aparecen en la view; ninguno tiene membership, client user ni contacto CRM | Excluir sólo `smoke_test`, sin redefinir otros orígenes ni cambiar retención/compliance. |
| Runtime live | Issuer/gateway listos y flags nativo/interno ON | Es baseline actual, no evidencia de canary externo. Revalidar antes de rollout. |

Evidencia redactada:
[`TASK-1832_PRE_IMPLEMENTATION_READBACK_2026-09-06.md`](../../audits/mcp/TASK-1832_PRE_IMPLEMENTATION_READBACK_2026-09-06.md).
Los seis smokes externos previos están revocados y usan sólo `efeonce.invalid`; no prueban M365/Google. El único
candidato inequívocamente diagnóstico es `EO-ORG-0050`, todavía sin seleccionar por decisión del operador.

## Decisiones a aceptar en Delta ADR

1. `binding_purpose` aplica a población externa: `customer` para el command comercial y `canary` para el
   command sintético. Población interna usa `NULL`; no se la denomina cliente por default accidental.
2. El purpose, la registración y el vencimiento son inmutables. Renovación crea otra registración/binding;
   revocación conserva historia append-only y aumenta la versión de grants.
3. Un registry `external_canary_registrations` es la única allowlist. Cada fila fija organización,
   environment, external ref exacta, una capability, actor, razón, expiry y estado/revocación. Nace vacío.
4. V1 permite exactamente `growth.seo.observation.read`: es read-only y el tool `get_seo_entitlement` puede
   demostrar resolución/capability sin leer contenido cliente. Una ampliación requiere nuevo Delta y pruebas.
5. Canary no puede ser `designated_admin`, usar commands delegados ni recibir writes. `customer` externo sigue
   sin acceso de negocio hasta TASK-1841; `internal` conserva su carril separado.
6. Todos los perfiles canary nacen `smoke_test`. Coincidencia de correo con perfil `real` se rechaza; nunca se
   fusiona ni reclasifica. Person/Account 360 excluyen `smoke_test`; retención, consentimiento y revocación no
   usan procedencia como bypass. `demo|synthetic_seed` quedan fuera de esta decisión.
7. Dos gates independientes, default OFF: `EXTERNAL_IDENTITY_CANARY_ENABLED` en Greenhouse/auth-server y
   `MCP_NATIVE_EXTERNAL_CANARY_ENABLED` en el gateway. OFF bloquea emisión y dispatch incluso si existen filas.

## Slices y ownership

### Slice 1 — ADR, schema y commands locales

- Aceptar el Delta ADR y registrar los flags en el ledger.
- Crear migración additive con registry, columnas/constraints/índices/grants y capabilities administrativas
  `identity.external_canary.register`, `.bind` y `.revoke` en registry/runtime.
- Implementar routes y commands con idempotencia, actor/razón, errors canónicos y audit/outbox sin PII/secrets.
- Escribir purpose `customer` explícito en el command existente y pruebas que demuestren semántica sin cambio.
- Agregar purpose/expiry al DTO del reader ecosystem con contrato backward-compatible sólo después de coordinar
  consumer. Ningún SQL manual desde scripts o gateway.

### Slice 2 — aislamiento de personas, emisión y gateway

- Para canary, grant exige profile `smoke_test`, capability exacta, expiry no mayor que registry/binding y
  membresía no administrativa. Invitación/aceptación sólo busca o crea perfiles `smoke_test`; conflicto real
  falla cerrado.
- Excluir `data_origin='smoke_test'` de la view `person_360` y de `searchProfiles`; cubrir persona real visible,
  smoke oculta y facetas/retención intactas, sin cambiar el contrato de otros orígenes.
- Gatear resolución/emisión en Greenhouse/auth-server. El token no nace si el canary está OFF, expirado o
  revocado; refresh vuelve a resolver sin elevar scope.
- En `/Users/jreye/Documents/efeonce-mcp`, ampliar el schema estricto del reader, policy declarativa y tests.
  Sólo `get_seo_entitlement` acepta `native-external + canary`; todos los writes, identity-admin e internal-only
  quedan denegados. No hay bump de superficie si no cambia el manifiesto, pero se ejecuta su gate real.

### Slice 3 — automatización, rollout y certificación

- Agregar Playwright + `scripts/mcp/external-client-canary.mjs`, usando secretos sólo en memoria, redacción de
  claims y correlation/idempotency por corrida. Cubrir consentimiento, PKCE S256, token, refresh y revocación.
- Publicar runbook y matriz por `(cliente, redirect, registro)`: Claude Code, Claude Desktop/web, Codex,
  ChatGPT; CIMD/DCR/pre-registro; M365/Google; Chrome/Safari/WebKit.
- Probar cinco negativos: scope base insuficiente, token expirado, grant revocado con token vigente, cliente sin
  consentimiento y token externo sobre tool internal-only. Medir rechazo de revocación en ≤60 s.
- Revocar sesiones, consents, grants, binding y registry antes de archivar/purgar profiles; releer que no quedan
  dispatches ni superficies 360/CRM. Conservar audit redactado.
- Observar siete días las señales de identidad/MCP. Sólo entonces emitir readiness técnica a TASK-1841.

## Secuencia de migración y rollout

1. Código/tests locales y Delta ADR aceptado; consumers preparados para contrato extendido, flags OFF.
2. Checkpoint específico de mutaciones: organización canary exacta y buzones aprobados; estado live revalidado.
3. Migración aditiva sobre la instancia compartida mediante tooling canónico; readback de defaults, constraints,
   registry vacío, capabilities y command comercial sin cambio. No dejar migración estacionada sin aplicar.
4. Desplegar consumers compatibles con flags OFF siguiendo sus release controls: Greenhouse/auth-server y luego
   gateway. Confirmar SHA/revisión/config servidos y denegación OFF en ambos extremos.
5. Activar sólo staging; registrar fixture por command, ejecutar matriz/negativos/cleanup y verificar señales.
6. Promover mediante procesos canónicos y repetir en producción. No push/PR/deploy sin autorización explícita.
7. Apagar gates y revocar inmediatamente ante fuga 360/CRM, capability inesperada, subject collision, token
   vigente autorizado tras revocación o ausencia de audit.

## Verificación proporcional

- Focal: unit/integration de `external-access`, routes, auth grants y account-360; tests del sibling gateway.
- DB: migration guard real, boundary allowlist, live test serializado vía `pnpm test:live`; validar `passed`, no
  ausencia de rojo. Nunca cargar `.env.local` globalmente.
- Repo Greenhouse: typecheck/lint focal, `pnpm mcp:manifest:check`, `pnpm qa:gates --changed`, task lint y gates
  que inyecte `greenhouse-qa-release-auditor`.
- Repo gateway: `pnpm check`, auth-negative/integration, policy parity y surface-version gate.
- Runtime: metadata, issuer/aud/azp/sub/scope/gv/exp redactados; DB/audit antes/después; policy allow/deny;
  flags y revisiones servidas; cleanup; señales steady.

## Checkpoints y autorizaciones

- **Ahora — pendiente:** aprobación humana de estas siete decisiones y del plan antes de código.
- **Antes de editar el repo hermano:** confirmar ownership local y preservar cualquier WIP; commit/push/PR
  requieren alcance explícito y revisión independiente.
- **Antes de migration/data/flags/deploy:** autorización específica, readback de Platform Health y estado live.
- **Antes del fixture:** ID exacto de organización no-cliente y cuentas M365/Google aprobadas. No inferir ni
  crear valores.
- **Cierre:** nunca marcar complete sin matriz productiva, cleanup y siete días de señales estables.

## Siguiente acción tras aprobar

Formalizar el Delta ADR y escribir primero tests rojos de invariantes/schema/policy. No aplicar migración, no
crear fixture y no tocar runtime en ese slice.
