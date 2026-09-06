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
Los seis smokes externos previos están revocados y usan sólo `efeonce.invalid`; no prueban M365/Google.
`EO-ORG-0050` queda descartada: aunque su nombre es diagnóstico, ya posee commercial party e historia de
lifecycle append-only, por lo que no cumple el nuevo requisito de eliminación completa. El fixture deberá ser
una organización dedicada, creada sólo tras aprobación específica y registrada desde antes de su primer write.

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
8. La organización canary es un asset efímero, no una party comercial reutilizada. Nace `active=false`,
   `status='inactive'`, `organization_type='other'` y `lifecycle_stage='disqualified'`, sin tax ID, HubSpot,
   spaces, memberships, clientes, contratos, ingresos ni fila en `organization_lifecycle_history`. Cada corrida
   crea antes del primer write un manifiesto redactado con `canary_registration_id`, `run_id`, IDs exactos,
   ownership, TTL, dependencias y estado de retiro. Audit OAuth/identidad permanece append-only como evidencia
   desacoplada; ninguna tabla retenida conserva FK que impida borrar la organización.
9. El retiro tiene dos fases: revocación inmediata de autoridad y eliminación posterior del fixture. Un command
   dedicado hace primero dry-run, enumera FKs reales desde catálogo y se niega a mutar si encuentra lifecycle,
   datos comerciales, assets compartidos o referencias fuera de su allowlist. Sólo con `unexpected_refs=0`
   elimina por `canary_registration_id` y relee cero organización, perfiles y referencias operativas.

## Slices y ownership

### Slice 1 — ADR, schema y commands locales

- Aceptar el Delta ADR y registrar los flags en el ledger.
- Crear migración additive con registry, columnas/constraints/índices/grants y capabilities administrativas
  `identity.external_canary.register`, `.bind` y `.revoke` en registry/runtime.
- Implementar routes y commands con idempotencia, actor/razón, errors canónicos y audit/outbox sin PII/secrets.
- Implementar alta y retiro del fixture como commands canónicos. El alta crea la organización dedicada en la
  misma transacción que el registro canary y rechaza cualquier identidad comercial. El retiro expone `dry-run`
  y `apply`, usa el ID de registro exacto, protege assets compartidos y conserva audit append-only sin FK.
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
- Crear `TASK-1832_CANARY_ASSET_MANIFEST_<run_id>.md` desde el template versionado antes del fixture y actualizarlo
  después de cada fase. Revocar sesiones, consents, grants, binding y registry antes de archivar/purgar profiles;
  releer que no quedan dispatches ni superficies 360/CRM. Conservar audit redactado.
- Antes de producción, ejecutar el cleanup en `dry-run` y demostrar `deletion_ready`. Tras la ventana de siete
  días —o cuando el operador ordene el retiro— ejecutar `apply`, si corresponde, y registrar readback final. La
  eliminación real no se infiere de la revocación ni de una fila marcada `deleted` en el manifiesto.
- Observar siete días las señales de identidad/MCP. Sólo entonces emitir readiness técnica a TASK-1841.

## Secuencia de migración y rollout

1. Código/tests locales y Delta ADR aceptado; consumers preparados para contrato extendido, flags OFF.
2. Checkpoint específico de mutaciones: autorización para crear la organización canary dedicada y buzones
   aprobados; estado live revalidado. No se reutiliza ninguna organización existente.
3. Migración aditiva sobre la instancia compartida mediante tooling canónico; readback de defaults, constraints,
   registry vacío, capabilities y command comercial sin cambio. No dejar migración estacionada sin aplicar.
4. Desplegar consumers compatibles con flags OFF siguiendo sus release controls: Greenhouse/auth-server y luego
   gateway. Confirmar SHA/revisión/config servidos y denegación OFF en ambos extremos.
5. Activar sólo staging; crear manifiesto, registrar fixture por command, ejecutar matriz/negativos, revocar,
   verificar `deletion_ready` por dry-run y comprobar señales.
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
  flags y revisiones servidas; manifest completo; cleanup dry-run/apply; señales steady.

## Checkpoints y autorizaciones

- **Ahora — pendiente:** aprobación humana de estas siete decisiones y del plan antes de código.
- **Antes de editar el repo hermano:** confirmar ownership local y preservar cualquier WIP; commit/push/PR
  requieren alcance explícito y revisión independiente.
- **Antes de migration/data/flags/deploy:** autorización específica, readback de Platform Health y estado live.
- **Antes del fixture:** aprobación específica para crear una organización canary dedicada y cuentas
  M365/Google aprobadas. El command genera los IDs exactos y el manifiesto los registra; no se reutiliza ni se
  infiere una organización existente.
- **Cierre:** nunca marcar complete sin matriz productiva, cleanup y siete días de señales estables.

## Siguiente acción tras aprobar

Formalizar el Delta ADR y escribir primero tests rojos de invariantes/schema/policy. No aplicar migración, no
crear fixture y no tocar runtime en ese slice.
