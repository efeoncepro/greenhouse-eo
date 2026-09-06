# TASK-1832 — Efeonce MCP Synthetic External Canaries and Client Compatibility Certification

## Delta 2026-09-06 — certificación sintética separada del piloto con cliente real

Por decisión del operador, ninguna persona cliente participa en el QA técnico del emisor, el gateway o los
clientes MCP. Esta task conserva la matriz real de Claude Code, Claude Desktop/web, Codex y ChatGPT, pero la
ejecuta con una población externa sintética controlada por Efeonce. La primera organización cliente consentida
sale a `TASK-1841`, después de que esta task y `TASK-1833` cierren.

La separación es de evidencia, no un bypass: el canary sintético debe atravesar el mismo issuer, invitación,
sesión, consentimiento, code + PKCE, access/refresh token, gateway y policy que usaría un cliente. Para no
contaminar Person 360 ni Account 360 comercial, las personas llevan `data_origin='smoke_test'`, la organización
canary no se reclasifica como `client|both`, y el binding usa un propósito `canary` explícito, con vencimiento,
capabilities read-only, auditoría y revocación. Un resultado verde prueba readiness técnica para piloto; nunca
se presenta como adopción, usabilidad o validación de un cliente real.

## Delta 2026-09-06 — prerrequisitos de la cohorte que trae TASK-1837 (verificados en staging; queda release a producción + federación en el gateway)

- `TASK-1837` (commits `5518d868e…189148c6e`, **migración aplicada 2026-09-06 y verificado end-to-end en staging el
  2026-09-06 con los dos flags ON en staging** — `docs/audits/2026-09-06-task-1837-external-invitation-delivery-evidence.md`)
  deja probadas tres cosas que la primera cohorte necesita: entrega automática de la invitación por correo (flag
  `EXTERNAL_INVITATION_SYSTEM_DELIVERY_ENABLED`, reenvío/rebote/revelación gobernados), el host del `redirect_uri`
  visible en la pantalla de consentimiento (sin flag, aditivo) y la lane delegada por la que el administrador
  designado del cliente invita a su propia gente (`GET/POST /api/platform/ecosystem/identity/invitations`, flag
  `EXTERNAL_INVITATION_DELEGATED_AUTHORITY_ENABLED`, OFF ⇒ 404).
- **Dependencia nueva para la cohorte:** la lane delegada exige federación en `efeonce-mcp` — el gateway verifica
  el JWT de la persona y llama a Greenhouse con `(environment, subject)` como ya hace para `identity/binding`;
  Greenhouse no conoce personas en ese harness. Sin esa federación (TASK-1831 + esta task) el cliente no puede
  invitar a nadie desde un cliente MCP y toda invitación sigue pasando por un operador de Efeonce. La lane ya
  respondió correcto en staging al token del consumer del gateway (`efeonce-mcp-gateway-greenhouse-token`) con el
  `subject` de una persona externa real: lista del binding propio 200, binding ajeno 403, auto-elevación 422 e
  invitación delegada 201 con correo real recibido; falta la tool MCP que la llame con el JWT de la persona.
- Antes de la cohorte, verificado en staging el 2026-09-06: migración `20260906004450748_task-1837-…` ✔ aplicada;
  flags ON en staging; remitente Efeonce funcionando en Resend (correo real de invitación y magic link recibidos);
  persona externa de prueba con sesión viva en `auth.efeonce.org` y muerta al revocar el binding; rebote forzado
  con `undelivered` encendiéndose; consentimiento con host del `redirect_uri` capturado en dev-UI (1440/390).
  Quedan sólo: promoción de `develop` → `main` con los flags en Vercel Production (24 h de observación) y la
  federación de la lane delegada en el gateway; la primera persona de un CLIENTE real sigue siendo decisión del
  operador.

## Delta 2026-09-04 — acceso interno nativo (TASK-1836)

La matriz incorpora empleados Efeonce por emisor nativo además de clientes externos y carril Entra existente. El canary interno depende de TASK-1836 + integración TASK-1831/1835; usar la identidad real indicada por operador y organización canónica, sin reclasificar Efeonce ni crear excepciones de prueba.


## Delta 2026-09-04 (TASK-1835)

- Las pantallas que los canaries y la primera cohorte verán (consentimiento, login, step-up, recuperación) son `TASK-1835` (EPIC-044 U06); esta task queda bloqueada también por ella para la cohorte real (los canaries de protocolo con `prompt=none` o clientes de prueba no la necesitan).

## Historia 2026-09-04 (TASK-1829) — estado anterior a activación

Registro conservado de ese momento; las menciones de flag OFF y personas pendientes no describen
el estado posterior. Ver actualización de readiness del 2026-09-05 al final.

- `TASK-1829` quedó `code complete, rollout pendiente` en `develop` (commits `263ee3a74`, `19d1658de`,
  `d31e6e913`): metadata RFC 8414/OIDC (`issuer` idéntico al origen, `client_id_metadata_document_supported:
  true`, S256 único), CIMD como registro primario, DCR (`POST /oauth/register`) como compatibilidad para
  públicos, clientes confidenciales por command, `authorize`/`token`/`revoke`/`introspect` y consentimiento
  persistido, todo detrás de `AUTH_SERVER_OAUTH_ENABLED=false`; contrato en
  `docs/architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md` — cerrado por trabajo en `TASK-1829`.
- **Mecanismos de registro disponibles para los canaries:** CIMD (`client_id` = URL https del documento,
  validado con guard anti-SSRF y cacheado 24 h), DCR (`dcr-…`, sólo `token_endpoint_auth_method: none`, 10/min
  por IP) y cliente confidencial pre-registrado vía `pnpm auth-server:register-client` o
  `POST /api/admin/auth-server/oauth-clients` (capability `identity.auth_client.register`; secreto una sola vez).
  La fila «cliente no soporta CIMD ni DCR» de la matriz de riesgos ya tiene camino.
- **Política de redirect decidida por el operador (2026-09-04):** públicos = loopback `127.0.0.1`/`[::1]`/alias
  `localhost` en cualquier puerto (Claude Code lo necesita) o HTTPS exacto; confidenciales/hospedados = HTTPS
  exacto y `localhost` por nombre rechazado. La matriz de tokens debe registrar la forma de redirect por cliente
  contra esa política.
- Revocación operativa que los canaries de allow/deny/expiración/revocación deben ejercitar: `POST /oauth/revoke`
  (familia completa) y `POST /api/admin/auth-server/consents/revoke` (capability
  `identity.auth_consent.revoke`; mata todas las familias de `(subject, client)`). Señales a observar en
  `/admin/operations`: `auth.oauth.code_reuse_detected`, `auth.oauth.refresh_reuse_detected`,
  `auth.oauth.cimd_rejected` (steady 0).
- **Pendientes registrados entonces (históricos):** flag ON en staging (environment `efeonce-auth` `active` +
  metadata validada), `TASK-1830` (`authorize` responde `login_required` hasta entonces: ningún code para una
  persona), `TASK-1831` (gateway multi-issuer) y la task ui-ux. `Blocked by` se precisa en consecuencia.

## Historia 2026-09-04 — bootstrap inicial

La lista de bloqueos siguiente corresponde al bootstrap; fue superada parcialmente por la activación
de OAuth/personas y no debe utilizarse como inventario actual.

- `TASK-1828` dejó el runtime del emisor vivo en staging: `https://auth.efeonce.org/readyz` 200 y
  `/.well-known/jwks.json` con dos `kid` (KMS HSM ES256), publicado en el mismo front door del gateway. Los
  canaries de esta task ya tienen un issuer real contra el que verificar JWT — cerrado por trabajo en `TASK-1828`.
- `TASK-1631` Slice 1 (commands de binding/invitación/grant y 4 señales) quedó code complete y verificado en
  staging el mismo día.
- **En ese momento quedaba bloqueada** por `TASK-1829` (metadata, CIMD/DCR y tokens), `TASK-1830` (autenticación de personas),
  `TASK-1631` (release a producción), `TASK-1831` (gateway multi-issuer) y la task ui-ux de login/consentimiento.

## Delta 2026-09-05 — entrega de la invitación (TASK-1837)

La cohorte no puede abrirse con el recorrido de alta actual. Medido sobre el código: `issueExternalInvitation`
devuelve el token en claro en la respuesta de la ruta admin y el evento `identity.external_invitation.issued`
no tiene ningún consumidor, así que **el último tramo del alta lo hace una persona de Efeonce copiando un
secreto**. Investigación de mercado del 2026-09-05 (8 productos, 2 vendors de identidad): en los ocho productos
la invitación nominal la envía el sistema, y mostrarle el secreto de otra persona a un administrador contradice
NIST SP 800-63A-4 §3.8, NIST SP 800-63B-4 §3.1.3.1 e ISO/IEC 27002:2022 §5.17.

Además, la pantalla de consentimiento **no muestra el host del `redirect_uri`** (verificado en
`src/lib/auth-server/oauth/pages/render.ts`): la persona autoriza sin ver a dónde va el código. Es un MUST del
protocolo y una cohorte real no debería abrirse incumpliéndolo.

`TASK-1837` cierra ambos, más el ciclo de vida de la entrega y la autoridad delegada del administrador del
cliente. Los canaries de protocolo (clientes de prueba, `prompt=none`) no dependen de ella; **la primera
organización cliente real, sí**.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

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
- Backend impact: `migration`
- Epic: `EPIC-044`
- Status real: `Ownership tomado 2026-09-06: goal confirmado, pnpm codex:task-hook TASK-1832 --develop verde, auditoría de código/schema/runtime completada y plan versionado en docs/tasks/plans/TASK-1832-plan.md. El operador exigió que la organización canary quede documentada y sea eliminable; el plan ahora descarta EO-ORG-0050, exige fixture dedicado, manifiesto por corrida, cleanup dry-run/apply y readback cero. No hay implementación, migración aplicada, datos canary, flags, push ni deploy de esta ejecución; el checkpoint humano P0/Alto está pendiente antes de código. El apply exige aprobación específica para crear la organización dedicada y para las cuentas M365/Google controladas.`
- Rank: `TBD`
- Domain: `platform|identity|integration|ops`
- Blocked by: `checkpoint humano del plan para iniciar código; aprobación de creación del fixture canary dedicado y cuentas M365/Google para apply y matriz live`
- Branch: `Greenhouse develop; efeonce-mcp main; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Certificar el emisor propio y el gateway contra clientes MCP reales usando exclusivamente una organización
canary y personas sintéticas controladas por Efeonce. La matriz cubre loopback y HTTPS hospedado, CIMD/DCR/
pre-registro, correo real, passkeys, consentimiento, tokens, allow/deny, expiración, refresh y revocación sin
incorporar ni afectar a un cliente. Cierra la prueba base-only de `TASK-1626` y habilita `TASK-1841`.

## Why This Task Exists

Un authorization server correcto en el papel no prueba interoperabilidad. Los clientes divergen en discovery,
registro y redirects, y los mocks no ejercitan correo, navegador, cookies, consentimientos, tokens ni dispatch.
Esa prueba no necesita trasladar riesgo técnico a una persona cliente: una población `smoke_test` puede recorrer
el contrato productivo completo si su procedencia, authority boundary, vencimiento y limpieza son explícitos.

## Goal

- Matriz de tokens redactada por cliente: `iss`, `aud`, `sub`, `azp`, `scope`, `gv`, `exp`, forma de redirect, mecanismo de registro (CIMD/DCR/pre-registrado), resultado.
- Confirmación de que el mismo `sub` se obtiene desde loopback y desde hospedado para la misma persona.
- Carril canary externo gobernado: organización no-cliente, binding `canary`, perfiles `smoke_test`,
  capabilities read-only, vencimiento, auditoría y revocación por commands.
- Pruebas negativas: base-only deny, token expirado, grant revocado, cliente no consentido, issuer externo sobre tool interna.
- Expediente de readiness técnica para que `TASK-1841` pueda elegir un cliente sin pedirle hacer QA.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md`
- `docs/architecture/EFEONCE_CUSTOMER_IDENTITY_MCP_FEDERATION_DECISION_V1.md` (§Rollout gates 5 y 6)
- `docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_ACCOUNT_COMPLETE_360_V1.md`

Reglas obligatorias:

- Un canary NUNCA se clasifica como cliente, prospecto, contrato o ingreso. La procedencia no se infiere por
  dominio, nombre ni plus-addressing.
- La organización canary es dedicada y efímera: nace inactiva/disqualified, sin historia comercial, y cada
  referencia queda en un manifiesto por corrida. No se reutiliza una party existente.
- `bindExternalOrganization` conserva intacta su elegibilidad `client|both` + `active_client`; el canary usa un
  command separado sobre la misma primitive transaccional y no introduce un bypass en el command comercial.
- Una capability read-only; ninguna escritura de negocio, gasto, dato cliente ni derecho sensible.
- Evidencia siempre redactada: nunca pegar tokens, códigos ni correos completos en docs o Handoff.
- Personas `smoke_test` y buzones controlados por Efeonce prueban el mecanismo, nunca una cohorte.
- Antes de implementar `binding_purpose` y el registro canary, aceptar un Delta del ADR de identidad/federación
  que fije la separación `customer|canary`, su retención y sus consumers.

## Normative Docs

- `docs/operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md`
- `docs/tasks/in-progress/TASK-1626-efeonce-mcp-platform-gateway.md` (§Estado de rollout, prueba base-only pendiente)
- `docs/audits/EFEONCE_MCP_CODEX_OAUTH_INTEROPERABILITY_2026-09-02.md`

## Dependencies & Impact

### Depends on

- `TASK-1829` (emisor activo), `TASK-1830` (autenticación activa), `TASK-1631` (binding/invitación/grant),
  `TASK-1831` (gateway multi-issuer) y `TASK-1837` (entrega/autoridad delegada en producción).
- Buzones y cuentas de prueba gobernadas por Efeonce para Microsoft 365 y Google; plus-addressing sólo amplía
  casos, no sustituye una segunda infraestructura de correo/identidad.

### Blocks / Impacts

- Habilita `TASK-1841`, que posee el primer piloto consentido con una organización cliente existente.
- Aporta evidencia técnica a `TASK-1834` y al cierre de `TASK-1829/1830/1831`, sin sustituir sus gates propios.
- Los writes federados conservan tasks y gates por dominio; esta task no los habilita.

### Files owned

- `src/lib/identity/external-access/**` (primitive/command/store canary y boundary tests)
- `migrations/<timestamp>_task-1832-external-canary-binding-purpose.sql`
- `src/app/api/admin/identity/external-access/canaries/**` y capacidades runtime/registry correspondientes
- `src/lib/account-360/organization-store.ts` y la definición vigente de `greenhouse_serving.person_360`
  únicamente para excluir `data_origin='smoke_test'` de los readers 360; sin cambiar la raíz de identidad
- `services/auth-server/**` y su workflow sólo para el gate canary fail-closed en emisión
- `/Users/jreye/Documents/efeonce-mcp/src/**` y workflow de deploy sólo para contrato/policy/gate del gateway;
  cualquier commit, push, PR o deploy en el repo hermano conserva autorización separada
- `docs/operations/runbooks/mcp-external-canary-certification.md` (nuevo)
- `docs/audits/mcp/EFEONCE_MCP_CLIENT_TOKEN_MATRIX_<fecha>.md` (nuevo, redactado)
- `docs/audits/mcp/TASK-1832_CANARY_ASSET_MANIFEST_TEMPLATE.md` y un manifest por `run_id`
- `scripts/mcp/external-client-canary.mjs` (nuevo: flujo PKCE automatizable con cliente CIMD de prueba)
- `tests/e2e/smoke/auth-server-oauth.spec.ts` (nuevo)

## Current Repo State

### Already exists

- Canary interno Entra y prueba manual con Claude Code (ADR gateway §Delta 2026-08-06).
- Commands de binding de `TASK-1631` (Slice 1 code complete + staging verificado 2026-09-04); señales `unbound_dispatch_attempt`, `revoked_still_dispatching`, `subject_collision`, `orphan_grant`.
- `identity_profiles.data_origin` ya distingue `real`, `synthetic_seed`, `smoke_test` y `demo`.
- `TASK-1837` probó invitación, correo, aceptación, magic link, sesión y revocación con una persona externa
  sintética; el release `b3e324cb5c8d` dejó entrega y autoridad delegada en producción.
- El emisor sirve metadata/JWKS y los carriles OAuth/personas están activos; TASK-1836 probó token, refresh y
  revocación con población interna, no la matriz externa.

### Gap

- No existe un propósito de binding canary separado del binding comercial. El command actual rechaza correctamente
  cualquier organización que no sea `client|both` + `active_client`; no debe relajarse.
- Falta la matriz externa completa con clientes MCP reales y buzones/personas `smoke_test`.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/identity/external-access/**`, `services/auth-server/**`, `scripts/mcp/**` y gateway `efeonce-mcp`
- Future candidate home: `domain-package`
- Boundary: primitive transaccional común; command canary separado; emisor/gateway/clientes consumen sólo contracts gobernados
- Server/browser split: `commands, registry, resolución, emisión, policy y cleanup son server-only; el browser sólo participa en login/consentimiento/PKCE mediante superficies OAuth existentes y Playwright, sin recibir reglas de elegibilidad ni secretos`
- Build impact: `Greenhouse/Vercel + auth-server Cloud Run + efeonce-mcp gateway; no crea un deployable nuevo`
- Extraction blocker: transacción de binding/grant/audit en Greenhouse y policy de dispatch en el gateway

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `migration`
- Source of truth afectado: `organizations`, `external_organization_bindings`, registro canary gobernado,
  `identity_profiles.data_origin`, audit y grants
- Consumidores afectados: gateway, clientes MCP, operador
- Runtime target: `production` (con paso previo en staging)

### Contract surface

- Contrato existente a respetar: commands de `TASK-1631`; metadata y tokens de `TASK-1829`; `AuthContext` de `TASK-1831`
- Contrato nuevo o modificado: `binding_purpose='customer'|'canary'` (default `customer`), registro de
  organizaciones canary y commands `createExternalCanaryFixture`, `bindExternalCanaryOrganization` y
  `cleanupExternalCanaryFixture`
- Backward compatibility: `compatible` — columna additive con default; `bindExternalOrganization` no cambia
- Full API parity: el alta/revocación canary usa commands canónicos; scripts y MCP nunca escriben SQL

### Data model and invariants

- Entidades/tablas/views afectadas: `external_organization_bindings`, nueva allowlist/registry canary y `identity_profiles`
- Invariantes que no se pueden romper:
  - `Un binding canary nunca vuelve elegible a la organización como cliente ni puede recibir capabilities fuera de la allowlist read-only.`
  - `Toda persona canary tiene data_origin=smoke_test; merge, CRM y métricas comerciales la excluyen.`
  - `Toda fila canary tiene actor, razón, expires_at, audit y revocación probada.`
  - `La organización canary no tiene lifecycle history ni referencias comerciales; el cleanup se niega a borrar si el catálogo descubre una referencia inesperada.`
- Write-target allowlist: declarar la nueva tabla/registry y el binding en `src/lib/identity/external-access/boundary-domain.test.ts`
- Tenant/space boundary: organización exacta del registry canary; sin match por dominio/correo
- Idempotency/concurrency: commands idempotentes de `TASK-1631`
- Audit/outbox/history: audit de alta/uso/expiración/revocación; outbox sin tokens; señales separadas de cliente

### Migration, backfill and rollout

- Migration posture: `additive`
- Default state: bindings existentes reciben `customer`; registry canary vacío y carril OFF
- Backfill plan: default/constraint verificados; cero reclasificación de organizaciones o personas reales
- Rollback path: revocar binding/grants/consents/sesiones canary + gate canary OFF; luego cleanup gobernado por
  `canary_registration_id`, con dry-run y manifest; conservar audit y columnas
- External coordination: buzones M365/Google de prueba controlados por Efeonce; ninguna persona cliente

### Security and access

- Auth/access gate: capability dedicada para registrar/ligar canaries; dispatch exige purpose, vigencia y capability read-only permitida
- Sensitive data posture: emails sintéticos; evidencia redactada; sin tokens/códigos/cookies en disco o docs
- Error contract: errores canónicos fail-closed (`canary_not_registered`, `canary_expired`, `capability_not_allowed`)
- Abuse/rate-limit posture: un binding activo, TTL obligatorio, límites existentes de invitación/auth y kill switch

### Runtime evidence

- Local checks: `pnpm playwright test tests/e2e/smoke/auth-server-oauth.spec.ts`
- DB/runtime checks: lectura de purpose/origin/expiry, binding/grant/session/consent y auditoría antes/después
- Integration checks: flujo completo por cliente; matriz de tokens
- Reliability signals/logs: las cuatro señales de `TASK-1631` + `mcp.auth.*` de `TASK-1831` steady = 0 salvo pruebas negativas esperadas
- Production verification sequence: ver Rollout

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada y justificada en el boundary test del dominio.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Sensitive domains have canonical errors, audit/signal posture and no raw data leaks.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     ═══════════════════════════════════════════════════════════ -->

## Audit record — 2026-09-06

Plan completo: [`docs/tasks/plans/TASK-1832-plan.md`](../plans/TASK-1832-plan.md).
Readback DB redactado:
[`TASK-1832_PRE_IMPLEMENTATION_READBACK_2026-09-06.md`](../../audits/mcp/TASK-1832_PRE_IMPLEMENTATION_READBACK_2026-09-06.md).

El preflight se ejecutó con `pnpm codex:task-hook TASK-1832 --develop`. Se confirmó `develop` con WIP ajeno
de TASK-1835, que queda fuera del ownership y del staging de esta task. Readback live no mutante: emisor y
gateway responden, los flags nativo/interno vigentes están ON y el gateway servido es compatible con el
emisor nativo, pero el carril canary externo no existe ni está acreditado por esos GET. La auditoría de código
confirmó que `bindExternalOrganization` todavía protege la elegibilidad comercial, que el gateway deniega hoy
`native-external` en tools de negocio y que la resolución no transporta purpose/vencimiento.

La revisión de procedencia encontró que `identity_profiles.data_origin` ya modela `smoke_test`, pero
`greenhouse_serving.person_360` y `searchProfiles` incluyen hoy todo perfil activo salvo los fusionados. Por
eso el cierre no puede descansar sólo en «sin membership/CRM»: los readers 360 deben excluir explícitamente
la procedencia `smoke_test` y probar que una persona real permanece visible. Retención, consentimientos y revocación
siguen siendo ciegos a procedencia; el filtro sólo gobierna visibilidad.

El readback con `greenhouse_ops` contó 30 perfiles `smoke_test`, y los 30 aparecen hoy en `person_360`; ninguno
tiene membership organizacional, `client_user` o contacto CRM. Los seis perfiles de identidad externa tienen
source link inactivo, invitación/binding revocados y sólo dominio `efeonce.invalid`, sin entrega real. El
candidato existente con nombre inequívocamente diagnóstico, `EO-ORG-0050`, tiene cero spaces/memberships/
bindings, pero sí tax ID, commercial party e historia de lifecycle append-only. La FK `ON DELETE RESTRICT` y
los triggers inmutables impiden garantizar su eliminación, por lo que queda descartado. El fixture debe ser una
organización dedicada creada sólo después de una autorización específica.

## Plan pendiente de checkpoint

1. Aceptar un Delta ADR que haga `binding_purpose` explícito y mutuamente excluyente: `customer` para bindings
   externos comerciales, `canary` sólo para una registración externa exacta, y `NULL` para población interna.
   Purpose, registro y vencimiento son inmutables; renovar crea una nueva registración/binding.
2. Agregar una migración aditiva con registry canary vacío, FK a organización/environment/capability,
   vencimiento obligatorio, estado/revocación, checks de propósito y nuevas capabilities administrativas
   finas. La única capability de negocio permitida en V1 será `growth.seo.observation.read`.
3. Implementar `createExternalCanaryFixture`, `bindExternalCanaryOrganization`, revocación y
   `cleanupExternalCanaryFixture` sobre transacción/audit/outbox canónicos. El alta crea una organización
   dedicada inactiva/disqualified, sin historia comercial, y una registración raíz. El cleanup hace dry-run,
   enumera FKs actuales, protege assets compartidos y sólo aplica con `unexpected_refs=0`.
   `bindExternalOrganization` conserva su semántica: sigue exigiendo `client|both` + `active_client` y escribe
   purpose `customer` explícito.
4. Endurecer invitación/grant/resolución: un binding canary sólo acepta perfiles `smoke_test`, nunca
   `designated_admin`, no fusiona por correo con perfiles reales, exige expiración y rechaza cualquier
   capability fuera de la allowlist. Los commands delegados siguen exclusivos de purpose `customer`.
5. Excluir `data_origin='smoke_test'` de `person_360` y de la búsqueda de Account 360, con tests positivos y
   negativos. No se borra el perfil, no se redefine el tratamiento de `demo|synthetic_seed` ni se alteran
   compliance, retención o auditoría.
6. Agregar gates independientes default OFF en Greenhouse/auth-server y gateway. OFF debe impedir emisión y
   dispatch; el gateway sólo permitirá purpose `canary` en `get_seo_entitlement`. Customer externo continúa
   fail-closed hasta TASK-1841 y todos los writes/internal-only quedan denegados.
7. Construir pruebas locales/live, script PKCE sin persistir secretos, template/manifiesto de assets, runbook y
   matriz redactada. Después se secuencia migración aditiva, consumers compatibles con flags OFF, staging,
   aprobación del fixture exacto,
   producción, cleanup y siete días de señales. Un `skipped`, GET de metadata o status tool no cuenta como
   certificación.

### Checkpoint humano P0/Alto

- `pendiente`: aprobar este diseño antes del primer cambio de código o ADR.
- La aprobación del plan autoriza sólo cambios locales reversibles y su verificación; no autoriza commit/push
  al repo hermano, PR, apply de migración, creación/reutilización de organización, cuentas, invitaciones,
  flags, deploy ni sesiones interactivas.
- Antes del apply, el operador debe aprobar explícitamente la creación del fixture dedicado y las cuentas
  M365/Google controladas. Los IDs se generan y registran antes del primer write; no se inferirá ni reutilizará
  una organización existente.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Decisión y frontera canary explícita

- Aceptar un Delta del ADR de identidad/federación que separe `customer|canary`, retención, exclusiones y
  evidencia válida. Migración additive para `binding_purpose` y registry/allowlist canary vacío por default.
- `bindExternalCanaryOrganization` reutiliza la transacción canónica sin relajar `bindExternalOrganization`;
  exige organización exacta registrada, profiles `smoke_test`, TTL, capability dedicada y allowlist read-only.
- `createExternalCanaryFixture` genera organización + registro raíz y manifiesto; `cleanupExternalCanaryFixture`
  ofrece dry-run/apply, consulta el catálogo de FKs y se niega a eliminar lifecycle, evidencia o assets shared.

### Slice 2 — Buzones, limpieza y canary automatizable

- Provisionar buzones de prueba M365 y Google controlados por Efeonce; plus-addressing sirve para aislar corridas,
  no como sustituto de otro proveedor. Incluir bounce/suppression y scanner-safe POST del magic link.
- `external-client-canary.mjs` + Playwright ejecutan invitación, email, magic link, passkey Chrome/Safari,
  consentimiento, PKCE, token, refresh, revocación y cleanup. Cada corrida usa correlation/idempotency y TTL.
- Antes de provisionar, copiar y completar
  [`TASK-1832_CANARY_ASSET_MANIFEST_TEMPLATE.md`](../../audits/mcp/TASK-1832_CANARY_ASSET_MANIFEST_TEMPLATE.md);
  el estado `deleted` sólo se usa después del readback cero.

### Slice 3 — Matriz con clientes MCP reales sobre población sintética

- Sesiones interactivas operadas por Efeonce en Claude Code, Claude Desktop/web, Codex y ChatGPT; loopback y
  hospedado; CIMD/DCR/pre-registro según soporte. Ningún cliente participa.
- Ejecutar allow y las cinco negaciones en producción, revocar todo, publicar matriz redactada y observar
  señales 7 días. Entregar verdict `técnicamente certificado para piloto` a TASK-1841.

## Out of Scope

- Cualquier organización/persona cliente real, validación de usabilidad o adopción: `TASK-1841`.
- Segunda organización canary, cualquier escritura de negocio, gasto o autoadministración.
- Corregir defectos del emisor o del gateway (se abren issues y vuelven a su task dueña).

## Detailed Spec

- Pruebas negativas mínimas por cliente: (1) token base-only sobre tool con scope superior → deny; (2) token expirado → 401 con `WWW-Authenticate` correcto; (3) grant revocado con token vigente → deny ≤ 60 s; (4) cliente sin consent → `authorize` exige consentimiento; (5) token externo sobre tool internal-only → deny.
- Matriz de tokens: una fila por (cliente, forma de redirect, registro) con claims redactados (`sub` truncado, sin tokens).
- Persona canary: `data_origin='smoke_test'`, nombre no humano, mailbox controlado, sin merge automático; cleanup
  revoca primero y archiva/purga después según la policy de procedencia.
- Organización canary: no cambia a `client|both` ni `active_client`; su elegibilidad existe únicamente mediante
  el registry + purpose canary. Es una fila dedicada inactiva/disqualified, sin lifecycle history ni referencias
  comerciales. Readers comerciales y métricas deben ignorarla por construcción.
- Manifiesto: registra desde antes del alta `run_id`, `canary_registration_id`, organización, profiles, links,
  environment/client ownership, binding, grants, invitaciones, contextos/consents y conteos de sesiones/tokens;
  nunca secretos o hashes. El cleanup usa el registro exacto, no nombre, correo o ventana temporal.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3. La migration/command no se implementa con el ADR todavía `Proposed`. Producción
  no inicia hasta que staging cierre cleanup, passkeys en Chrome/Safari y las cinco negaciones. TASK-1841 no
  inicia hasta que esta task y TASK-1833 estén completas.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un cliente no soporta CIMD ni DCR conforme | clientes MCP | medium | pre-registro confidencial por command; documentar por cliente | fila roja en la matriz |
| `sub` distinto entre loopback y hospedado | identity | low | `subject_types_supported: public`; test explícito | `subject_collision` |
| Canary contamina Person 360/Account 360/CRM | identity/data | high | `smoke_test`, purpose explícito, exclusiones y cleanup verificado | señal canary fuera de boundary |
| Bypass canary concede autoridad comercial | identity/MCP | high | command separado, registry exacto, TTL y capability allowlist read-only | `canary_capability_rejected` |
| Fixture no puede eliminarse o borra un asset compartido | identity/data | high | organización dedicada, manifest, FK census, dry-run y refusal con referencias inesperadas | `canary_cleanup_blocked` |
| Revocación no efectiva a tiempo | identity / MCP | low | prueba de revocación antes de dar acceso | `revoked_still_dispatching` |

### Feature flags / cutover

- Gate canary nuevo default OFF en Greenhouse/gateway; no modifica flags globales del emisor ni la elegibilidad
  comercial. El registry vacío mantiene el path fail-closed aunque el flag esté mal configurado.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | gate canary OFF + revert de code; columnas/registry se conservan | < 10 min | sí |
| Slice 2 | revocar sesiones/invitaciones/consents/grants/binding por commands; cleanup dry-run; eliminar sólo assets run-owned sin blockers | < 10 min | sí |
| Slice 3 | gate canary OFF en gateway/Greenhouse + revocación de todos los artefactos de la corrida | < 5 min | sí |

### Production verification sequence

1. Migración en staging: bindings existentes = `customer`, registry vacío y command comercial sin cambios.
2. Crear manifiesto; provisionar organización canary dedicada por command, crear profile `smoke_test`, invitar y verificar audit/outbox.
3. Correo → sesión → passkeys Chrome/Safari → consentimiento → OAuth/PKCE → MCP en staging; cleanup completo.
4. Repetir en producción con una capability read-only sin datos cliente; clientes objetivo operados por Efeonce.
5. Allow + deny base-only/expirado/revocado/sin consent/internal-only; verificar revalidación provider.
6. Revocar y releer que ninguna sesión/token/grant/binding sigue autorizando; ejecutar cleanup dry-run y
   demostrar `deletion_ready`; conservar audit redactado.
7. Siete días steady; emitir readiness técnica. Cuando corresponda el retiro, ejecutar cleanup apply y releer
   cero referencias antes de marcar el manifest `deleted`. La invitación de un cliente pertenece a TASK-1841.

### Out-of-band coordination required

- Operador: aprobar la creación del fixture canary dedicado y cuentas M365/Google de prueba; sesiones
  interactivas en los clientes MCP. No hay contacto ni tratamiento de datos de una organización cliente.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Auditoría MCP de TASK-1836 §14: registrar cliente y revisión reales, discovery desde URL canónica, login, consentimiento por cliente y revocación; no sustituir el flujo por inyección manual de token.

- [ ] Cada cliente MCP real completa login con persona externa `smoke_test`, token nativo, llamada autorizada,
  refresh y revocación; el mismo issuer nunca permite tools internas. Evidencia por cliente y revisión registradas.

- [ ] Matriz de tokens publicada con al menos Claude Code, Codex y un cliente hospedado, sin tokens crudos.
- [ ] El mismo `sub` para la misma persona en loopback y hospedado (evidencia).
- [ ] Organización canary no-cliente registrada y ligada por command dedicado; `bindExternalOrganization`
  continúa rechazándola y los readers/KPI comerciales no la presentan como cliente.
- [ ] Manifiesto de assets creado antes del primer write y completo con IDs/ownership/TTL; cleanup dry-run
  reporta `deletion_ready`, `unexpected_refs=0`, lifecycle history cero y ningún intento de borrar assets shared.
- [ ] Todos los profiles del canary tienen `data_origin='smoke_test'`; no se fusionan con personas reales y el
  cleanup/revocación queda probado sin borrar audit.
- [ ] Correo/invitación/magic link se verifican en buzones M365 y Google controlados, con bounce y scanner-safe POST.
- [ ] Passkey real pasa en Chrome y Safari/WebKit con la misma persona canary.
- [ ] Las cinco pruebas negativas pasan en producción con evidencia redactada.
- [ ] Prueba base-only pendiente de `TASK-1626` cerrada y referenciada en su task.
- [ ] Runbook de certificación canary y expediente de readiness para TASK-1841 publicados.
- [ ] Siete días de señales steady registrados en Handoff.

## Verification

- `pnpm playwright test tests/e2e/smoke/auth-server-oauth.spec.ts`
- `node scripts/mcp/external-client-canary.mjs --env=staging`
- sesiones interactivas por cliente MCP operadas por Efeonce (evidencia redactada en la auditoría)

## Closing Protocol

- [ ] `Lifecycle` sincronizado y archivo en la carpeta correcta
- [ ] `docs/tasks/README.md`, `Handoff.md` y `changelog.md` actualizados
- [ ] chequeo de impacto cruzado sobre `TASK-1626`, `TASK-1829`, `TASK-1830`, `TASK-1831`, `TASK-1833`, `TASK-1841`
- [ ] manual de uso `docs/manual-de-uso/identity/certificar-cliente-mcp-con-canary-sintetico.md` publicado

## Follow-ups

- `TASK-1841`: primera organización cliente consentida, sin trasladarle QA técnico.
- Segunda organización canary sólo si una nueva forma de identidad/protocolo exige cobertura independiente.
- Writes federados por epic dueño.

## Open Questions

- Autorización específica para crear la organización canary dedicada antes del apply. La task no autoriza
  crearla todavía ni reutilizar Efeonce u otra party; los IDs exactos se generan y documentan al provisionar.

## Correction 2026-09-05 — TASK-1836

Probar D1–D7 de TASK-1836 con contexto firmado ligado a persona/cliente/recurso; el rollback debe rechazar también el token interno emitido antes de apagar el gate del gateway.


## Readiness actualizada — 2026-09-05

Readback del coordinador a `2026-09-05T15:02:44Z`: `https://auth.efeonce.org/readyz` respondió 200;
`https://mcp.efeonce.org/.well-known/oauth-protected-resource` respondió 200 y anunció únicamente
`authorization_servers=[https://mcp.efeonce.org]`. No acredita todavía discovery/dispatch del emisor
nativo. OAuth/personas ON fue verificado anteriormente en el
[runbook interno](../../operations/EFEONCE_INTERNAL_AUTH_ROLLOUT_RUNBOOK_V1.md); estos dos GET no
son un readback nuevo de esas flags. Se conserva la historia OFF anterior sin convertirla en bloqueo actual.

### Canary interno mínimo y límites

Recorrido: cliente MCP real → Microsoft → consentimiento por cliente/contexto → `get_seo_entitlement`
→ refresh → revocación y rollback. Pedir sólo `efeonce.mcp.read`; requiere capability personal vigente
`growth.seo.observation.read` y organización resuelta por el contexto. No hay writes de negocio.
Microsoft crea sesión primary; este permiso de lectura no exige MFA adicional. Login passkey completo,
alta TOTP y toda la matriz UI no son requisitos funcionales de este piloto read. La superficie utilizada
sí requiere revisión proporcional; aprobación visual y `UI ready: no` de TASK-1835 siguen pendientes,
y el piloto no constituye cierre de esa task ni aprobación de una cohorte amplia.

### Prerrequisitos operativos y owners

- Identity/TASK-1836: desplegar auth-server compatible conservando inicialmente gate interno OFF;
  referencias Entra/secret/KMS y callback exacto del runbook. La asignación upstream no es enrollment.
- Greenhouse/Identity: desplegar reader y commands en Vercel; configurar por separado
  `AUTH_SERVER_INTERNAL_AUTH_ENABLED`, issuer/environment/audience coherentes con el emisor.
  Enrolar la persona canónica mediante `POST /api/admin/identity/internal-access`, primero dry-run,
  y otorgar grant personal read con vencimiento/razón. Sin SQL manual ni identidad ficticia.
- MCP Platform/TASK-1831: desplegar gateway compatible; preparar `MCP_NATIVE_AUTH_ENABLED`,
  `MCP_NATIVE_INTERNAL_AUTH_ENABLED`, issuer/JWKS/environment y `MCP_IDENTITY_BINDING_URL` con
  secret del consumer autorizado (`MCP_IDENTITY_BINDING_SECRET_REF` en workflow). Verificar acceso
  real al reader. SEO requiere `GREENHOUSE_SEO_PROVIDER_ENABLED`, URL/token ecosystem y bypass
  Vercel cuando aplique; no deducir permisos de la mera presencia de configuración.
- TASK-1832: seleccionar el emisor nativo en un cliente real mediante discovery; verificar redirect,
  PKCE, consentimiento y token. Un cliente que siga usando el shim Entra no prueba este recorrido.
- TASK-1832/1836: comprobar refresh sin elevación, retiro de grant/enrollment y rechazo de dispatch
  con token vigente en ≤60 s. Apagar gates internos de emisor/reader/gateway debe denegar tokens
  previos; medir rollback y preservar carriles externo/Entra. Registrar revisión, tiempos y resultados.

Carril canónico: auth-server mediante `.github/workflows/auth-server-deploy.yml` desde `develop`;
producción por `production-release.yml`. Gateway: `.github/workflows/deploy.yml` del repo hermano,
`workflow_dispatch`, environment production e ingress ALB. Primero consumers compatibles con gates
internos OFF, después cohorte y readbacks; no sustituir configuración declarativa por cambios ad hoc.

Referencias: [runbook interno](../../operations/EFEONCE_INTERNAL_AUTH_ROLLOUT_RUNBOOK_V1.md),
[ADR interno](../../architecture/EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md),
[review UI local](../../ui/reviews/TASK-1835-first-fold-review.md). Capturas con DTOs ficticios y tests
locales no acreditan autenticación real, deploy ni consentimiento persistido. En ese readback, Lifecycle
continuaba `to-do`; todos los acceptance criteria de canary permanecían sin marcar.
