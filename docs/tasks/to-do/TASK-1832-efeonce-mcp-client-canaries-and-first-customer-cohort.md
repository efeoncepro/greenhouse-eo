# TASK-1832 — Efeonce MCP Client Canaries and First Customer Cohort Rollout

## Delta 2026-09-06 — prerrequisitos de la cohorte que trae TASK-1837 (existen en código; migración aplicada; flags OFF)

- `TASK-1837` (commits `5518d868e…189148c6e`, **code complete; migración aplicada 2026-09-06; flags OFF; verificación
  viva de correo pendiente** — `docs/audits/2026-09-06-task-1837-external-invitation-delivery-evidence.md`) deja en código tres cosas que la primera
  cohorte necesita: entrega automática de la invitación por correo (flag
  `EXTERNAL_INVITATION_SYSTEM_DELIVERY_ENABLED`, reenvío/rebote/revelación gobernados), el host del `redirect_uri`
  visible en la pantalla de consentimiento (sin flag, aditivo) y la lane delegada por la que el administrador
  designado del cliente invita a su propia gente (`GET/POST /api/platform/ecosystem/identity/invitations`, flag
  `EXTERNAL_INVITATION_DELEGATED_AUTHORITY_ENABLED`, OFF ⇒ 404).
- **Dependencia nueva para la cohorte:** la lane delegada exige federación en `efeonce-mcp` — el gateway verifica
  el JWT de la persona y llama a Greenhouse con `(environment, subject)` como ya hace para `identity/binding`;
  Greenhouse no conoce personas en ese harness. Sin esa federación (TASK-1831 + esta task) el cliente no puede
  invitar a nadie y toda invitación sigue pasando por un operador de Efeonce. Los 4 negativos en staging
  (binding ajeno 403, auto-elevación 422, tope de asientos 422, no-admin 403) se corren desde el gateway.
- Antes de la cohorte: migración `20260906004450748_task-1837-…` ✔ aplicada 2026-09-06 (smoke `--apply` verde
  contra PG real; los 4 negativos de la lane delegada corrieron in-process, NO desde el gateway); faltan flags en
  staging → producción con 24 h, dominio remitente Efeonce verificado en Resend, correo real a una persona externa
  (no existe binding externo aún) y el consentimiento con host visible capturado (GVC).

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

- Lifecycle: `to-do`
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
- Status real: `Canaries reales pendientes; task to-do. Readback 2026-09-05T15:02:44Z: auth readyz 200 y metadata del gateway 200, authorization_servers=[https://mcp.efeonce.org]. OAuth/personas ON consta en readback anterior del runbook; estos GET no verifican flags actuales ni compatibilidad nativa. TASK-1836 y gateway/UI tienen integración local; faltan deploy/config coherentes, enrollment/grant real, selección del emisor nativo y canary refresh/revocación/rollback.`
- Rank: `TBD`
- Domain: `platform|identity|integration|ops`
- Blocked by: `TASK-1829 (code complete en develop 2026-09-04; espera AUTH_SERVER_OAUTH_ENABLED=true en staging con el environment efeonce-auth registrado), TASK-1830, TASK-1631 (producción), TASK-1831 y la task ui-ux de login/consentimiento, TASK-1837 (entrega de la invitación externa; sin ella la cohorte real exige que un operador transporte el token a mano y el consentimiento incumple el MUST del `redirect_uri`)`
- Branch: `Greenhouse develop; efeonce-mcp main; checkout compartido; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Probar el emisor propio contra los clientes MCP reales y habilitar la primera organización cliente: matriz
de tokens live redactada por cliente (Claude Code, claude.ai/Desktop, Codex, ChatGPT), OAuth/PKCE en las
dos formas de redirect (loopback con puerto efímero y HTTPS hospedado), CIMD y DCR según lo que cada cliente
soporte, allowlist de una organización Account 360 existente con administrador designado, una capability
read-only, y la secuencia de verificación de producción con allow, base-only deny, expiración y revocación.
Cierra de paso la prueba base-only pendiente de `TASK-1626`.

## Why This Task Exists

Un authorization server correcto en el papel no prueba nada hasta que un cliente real lo atraviesa. Los
clientes divergen en discovery, registro y redirects, y la única forma de saberlo es el flujo completo con
cada uno. Además, este es el primer momento en que una persona de una organización cliente toca la
plataforma por MCP: el rollout debe ser una organización, una persona, una capability, con revocación
probada antes de ampliar.

## Goal

- Matriz de tokens redactada por cliente: `iss`, `aud`, `sub`, `azp`, `scope`, `gv`, `exp`, forma de redirect, mecanismo de registro (CIMD/DCR/pre-registrado), resultado.
- Confirmación de que el mismo `sub` se obtiene desde loopback y desde hospedado para la misma persona.
- Primera organización allowlisted por `bindExternalOrganization`, administrador invitado por
  `issueExternalInvitation`, grant de una capability read-only por command auditado.
- Pruebas negativas: base-only deny, token expirado, grant revocado, cliente no consentido, issuer externo sobre tool interna.
- Runbook de onboarding de una organización cliente para el operador.

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

- La cohorte externa es una organización cliente EXISTENTE en Account 360; NUNCA un cliente sintético ni match por dominio. El canary interno TASK-1836 usa la organización operativa canónica y no la reclasifica como cliente.
- Una capability read-only primero; ninguna escritura, gasto ni derecho sensible en esta task.
- Evidencia siempre redactada: nunca pegar tokens, códigos ni correos completos en docs o Handoff.
- `agent@…` y personas agente NO son la cohorte; sirven sólo para el smoke previo.

## Normative Docs

- `docs/operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md`
- `docs/tasks/in-progress/TASK-1626-efeonce-mcp-platform-gateway.md` (§Estado de rollout, prueba base-only pendiente)
- `docs/audits/EFEONCE_MCP_CODEX_OAUTH_INTEROPERABILITY_2026-09-02.md`

## Dependencies & Impact

### Depends on

- `TASK-1829` (emisor), `TASK-1830` (autenticación), task ui-ux (pantallas), `TASK-1631` (commands de binding/invitación/grant), `TASK-1831` (gateway multi-issuer).
- Sesiones interactivas del operador con cada cliente y una persona real de la organización elegida.

### Blocks / Impacts

- Habilita los writes federados de EPIC-011/022/043 a pedir su propio gate.
- `TASK-1834` (convergencia del login) requiere una cohorte MCP viva.
- `TASK-1833`: el pentest externo debe cerrarse antes de la primera organización pagando.

### Files owned

- `docs/operations/runbooks/mcp-customer-organization-onboarding.md` (nuevo)
- `docs/audits/mcp/EFEONCE_MCP_CLIENT_TOKEN_MATRIX_<fecha>.md` (nuevo, redactado)
- `scripts/mcp/external-client-canary.mjs` (nuevo: flujo PKCE automatizable con cliente CIMD de prueba)
- `tests/e2e/smoke/auth-server-oauth.spec.ts` (nuevo)

## Current Repo State

### Already exists

- Canary interno Entra y prueba manual con Claude Code (ADR gateway §Delta 2026-08-06).
- Commands de binding de `TASK-1631` (Slice 1 code complete + staging verificado 2026-09-04); señales `unbound_dispatch_attempt`, `revoked_still_dispatching`, `subject_collision`, `orphan_grant`.
- Personas agente para smoke (`agent-client@greenhouse.efeonce.org`).
- **Desde `TASK-1828` (2026-09-04):** emisor `https://auth.efeonce.org` vivo en staging (`readyz`, JWKS con 2
  `kid`, front door compartido con el gateway); sin metadata OAuth, CIMD/DCR ni tokens todavía.

### Gap

- Ninguna organización cliente ligada; ningún cliente externo probado contra un emisor propio; matriz de tokens sin ejecutar.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `scripts/mcp/**`, `tests/e2e/smoke/**`, runbooks y auditorías
- Future candidate home: `remain-shared`
- Boundary: los scripts consumen sólo endpoints públicos del emisor y del gateway y los commands canónicos de `TASK-1631` por API
- Server/browser split: n/a
- Build impact: none
- Extraction blocker: none

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: filas reales en `external_organization_bindings`, `external_member_invitations`, `external_capability_grants` (primera organización)
- Consumidores afectados: gateway, clientes MCP, operador
- Runtime target: `production` (con paso previo en staging)

### Contract surface

- Contrato existente a respetar: commands de `TASK-1631`; metadata y tokens de `TASK-1829`; `AuthContext` de `TASK-1831`
- Contrato nuevo o modificado: ninguno; esta task ejercita contratos existentes y produce evidencia
- Backward compatibility: `not applicable`
- Full API parity: el onboarding se ejecuta sólo por commands canónicos (CLI/Admin/Nexa), nunca por SQL

### Data model and invariants

- Entidades/tablas/views afectadas: las tres tablas de binding (escritura por command)
- Invariantes que no se pueden romper:
  - `Una sola organización, un administrador y una capability read-only hasta que todas las pruebas negativas pasen.`
  - `Toda fila creada tiene actor operador, invitación auditada y revocación probada.`
- Write-target allowlist: `N/A — no crea tablas`
- Tenant/space boundary: organización elegida explícitamente por el operador
- Idempotency/concurrency: commands idempotentes de `TASK-1631`
- Audit/outbox/history: audit de cada command; señales de reliability observadas durante 7 días

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: flags de `TASK-1829/1830/1831` ON sólo para la organización allowlisted
- Backfill plan: none
- Rollback path: `revokeExternalAccess` (binding) + flag externo del gateway OFF; < 5 min
- External coordination: persona real de la organización; sesiones interactivas por cliente

### Security and access

- Auth/access gate: commands con capabilities dedicadas de `TASK-1631`
- Sensitive data posture: evidencia redactada; sin tokens en repos
- Error contract: n/a (consume)
- Abuse/rate-limit posture: n/a (consume)

### Runtime evidence

- Local checks: `pnpm playwright test tests/e2e/smoke/auth-server-oauth.spec.ts`
- DB/runtime checks: lectura de las filas de binding/grant y de `auth_attempts` tras cada prueba
- Integration checks: flujo completo por cliente; matriz de tokens
- Reliability signals/logs: las cuatro señales de `TASK-1631` + `mcp.auth.*` de `TASK-1831` steady = 0 salvo pruebas negativas esperadas
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

### Slice 1 — Canary automatizable y smoke con persona agente

- `external-client-canary.mjs` (cliente CIMD de prueba, PKCE, loopback) y spec Playwright; smoke en staging con `agent-client@…` ligada a una organización de prueba interna.

### Slice 2 — Matriz de tokens con clientes reales

- Sesiones interactivas: Claude Code, claude.ai/Desktop, Codex, ChatGPT; loopback y hospedado; registro por CIMD/DCR/pre-registro según soporte; auditoría redactada.

### Slice 3 — Primera organización cliente

- Allowlist + invitación + grant read-only por commands; pruebas positivas y negativas en producción; runbook de onboarding; 7 días de señales.

## Out of Scope

- Segunda organización o segunda capability; cualquier escritura; autoadministración del cliente.
- Corregir defectos del emisor o del gateway (se abren issues y vuelven a su task dueña).

## Detailed Spec

- Pruebas negativas mínimas por cliente: (1) token base-only sobre tool con scope superior → deny; (2) token expirado → 401 con `WWW-Authenticate` correcto; (3) grant revocado con token vigente → deny ≤ 60 s; (4) cliente sin consent → `authorize` exige consentimiento; (5) token externo sobre tool internal-only → deny.
- Matriz de tokens: una fila por (cliente, forma de redirect, registro) con claims redactados (`sub` truncado, sin tokens).

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3. Slice 3 no inicia sin todas las filas de la matriz en verde para al menos Claude Code y Codex, y sin el pentest de `TASK-1833` cerrado si la organización es un cliente pagando.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Un cliente no soporta CIMD ni DCR conforme | clientes MCP | medium | pre-registro confidencial por command; documentar por cliente | fila roja en la matriz |
| `sub` distinto entre loopback y hospedado | identity | low | `subject_types_supported: public`; test explícito | `subject_collision` |
| Persona real ve un error sin recuperación | customer experience | medium | canary con persona interna primero; runbook de soporte | `auth_attempts` fallidos |
| Revocación no efectiva a tiempo | identity / MCP | low | prueba de revocación antes de dar acceso | `revoked_still_dispatching` |

### Feature flags / cutover

- Sin flag propio; usa `OAUTH_EXTERNAL_ISSUER_ENABLED` (gateway) y los flags del emisor; allowlist por organización es el cutover real.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | borrar cliente de prueba y binding interno | < 10 min | sí |
| Slice 2 | revocar consents/clients de prueba por command | < 10 min | sí |
| Slice 3 | `revokeExternalAccess` + flag externo OFF | < 5 min | sí |

### Production verification sequence

1. Nada cambia con flags OFF (comportamiento interno intacto).
2. Organización elegida por el operador; binding, administrador e invitación por command; evidencia de audit.
3. OAuth/PKCE + MCP initialize desde cada cliente objetivo.
4. Allow de la tool read-only; deny base-only; deny expirado; deny revocado; deny issuer externo sobre interna.
5. Revalidación de organización/workspace/capability en el provider; telemetría redactada.
6. Señales steady durante 7 días antes de proponer una segunda organización.

### Out-of-band coordination required

- Operador: sesiones interactivas con cada cliente; contacto con la organización cliente y su administrador.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Auditoría MCP de TASK-1836 §14: registrar cliente y revisión reales, discovery desde URL canónica, login, consentimiento por cliente y revocación; no sustituir el flujo por inyección manual de token.

- [ ] Cliente MCP real completa login interno, token nativo, llamada autorizada, refresh y revocación; externo del mismo issuer no puede ejecutar tools internas. Evidencia de cada cliente y limitación registrada.

- [ ] Matriz de tokens publicada con al menos Claude Code, Codex y un cliente hospedado, sin tokens crudos.
- [ ] El mismo `sub` para la misma persona en loopback y hospedado (evidencia).
- [ ] Una organización Account 360 existente ligada, con administrador invitado y capability read-only, todo por commands auditados.
- [ ] Las cinco pruebas negativas pasan en producción con evidencia redactada.
- [ ] Prueba base-only pendiente de `TASK-1626` cerrada y referenciada en su task.
- [ ] Runbook de onboarding de organización publicado.
- [ ] Siete días de señales steady registrados en Handoff.

## Verification

- `pnpm playwright test tests/e2e/smoke/auth-server-oauth.spec.ts`
- `node scripts/mcp/external-client-canary.mjs --env=staging`
- sesiones interactivas por cliente (evidencia en la auditoría)

## Closing Protocol

- [ ] `Lifecycle` sincronizado y archivo en la carpeta correcta
- [ ] `docs/tasks/README.md`, `Handoff.md` y `changelog.md` actualizados
- [ ] chequeo de impacto cruzado sobre `TASK-1626`, `TASK-1720`, `TASK-1722`, `TASK-1824`, EPIC-022
- [ ] manual de uso `docs/manual-de-uso/identity/conectar-cliente-mcp-organizacion.md` publicado

## Follow-ups

- Segunda organización y segunda capability, cada una con gate propio.
- Writes federados por epic dueño.

## Open Questions

- Qué organización cliente será la primera; decisión comercial del operador.

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
locales no acreditan autenticación real, deploy ni consentimiento persistido. Lifecycle continúa
`to-do`; todos los acceptance criteria de canary permanecen sin marcar.
