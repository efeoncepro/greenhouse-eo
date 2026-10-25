# TASK-2065 — consumidor OIDC de Rooms

2026-10-25. Goal Rooms activo; integración Efeonce ID, subagentes y coordinación Auth autorizados por Julio.
Hook `pnpm codex:task-hook TASK-2065 --subagents` ejecutado. No repetir confirmación para implementación local.

## Discovery y ADR

Canon Accepted: `docs/architecture/EFEONCE_AUTH_ROOMS_FIRST_AND_LOGIN_V4_DECISION_V1.md`.
Issuer1834 en implementación paralela; contrato code/PKCE S256/state/nonce, ES256 IDtoken300s, handleopaco300s
sólo introspection/revoke client-auth, sin refresh/UserInfo/roles/org/gv. Modules actuales revisados en
`src/lib/auth-server/first-party/`; no importarlos en Rooms. Fuente OIDC Core IDTokenValidation y RFC9700
consultadas el25/10. Consumer library `jose`6.2.13 verificada en registry público; pin exacto, no JWT manual.

Rooms ya tiene66 pruebas PASS, V1/V2 durable y API fail-closed. `session.ts` único seam; autoridad PG fresca
por operación. PG sólo loopback55432/rooms_local. No binding ni sessions/transacciones. Distintos roles por
organización no justifican elegir primer tenant. OTP invitaciones es método separado2066/67: no sesiónSSO
fabricada desde prueba de invitación.

## Access model y contratos

- Flag `ROOMS_FIRST_PARTY_AUTH_ENABLED` defaultfalse. OFF no conecta issuer ni DB, resolvePrincipal devuelve null.
- Config desde servidor: issuer/origin/clientId/secret, encryptionkey32bytes, callback exacto. HTTPS excepto
  loopback local explícito. No issuer/baseURL/secret mediante requests, no redirects automáticos de fetch.
- beginAuthorization, consumeCallback, resolveSession, selectContext, revokeLocalSession server-only.
- Logintransacción durable ligada a cookie browser/state/nonce/PKCE/redirect/client; TTL≤300s, consumo atómico
  antesdelcanje y anti-replay. Destino relativo allowlist, defaultsafe, sin openredirect.
- IDtoken por jose/JWKS remoto configurado: ES256/iss/aud/nonce/iat/exp/auth_time, TTL300s conformeissuer,
  rechazartokens MCP, unknowncriticalheaders, jku/x5u caller. HTTP boundedtimeouts/body, sin tokenlogging.
- Stores `rooms.auth_transactions`, `rooms.identity_bindings`, `rooms.sessions`, eventos auth separados.
  Cookie opaca aleatoria, hash enDB; verifier yhandle cifrados AES256GCM con keyservidor, no tokensbrowser.
- Binding explícito issuer/sub→principal+org. Bootstrap/control plane administrado fuera callback; ningún
  INSERT principals/memberships ni roles derivado de correo/claims. Cero contextos:deny; uno:elegir; varios:
  DTO+selección POST verificada, sin primercontexto implícito. Selección sólo intersecta identidad elegible.
- Introspection por solicitud autenticada, sin cachépositiva; comprueba active/iss/sub/aud/client_id/exp,
  luego binding/membership vigentes. loadAuthority relee grants. Expiry/falloissuer failclosed sin loops.
- Logout POST mismoorigen, revocación local idempotente aunque issuer caiga; best effortrevoke remoto acotado.
  No afirmar logoutglobal. Cookie host-onlyHttpOnlySameSiteLaxSecure; excepciónHTTP sólo loopbackdev.
- CLI existente no acepta handleOIDC de identidad como bearer de negocio. Authbrowser no abrecanalCLIporaccidente.
- Retención/GC explícita para transacciones/sesiones expiradas y eventos sanitizados; no códigos/token/email.

## Ownership y secuencia

1. Plan/task/ADR/hook antes implementación;2062commit separado.
2. rooms_domain: auth config/protocol/crypto/stores/bindings/sessions/migration+contracts; `session.ts` fachada.
   Comunica tipos/exports temprano. No rutas ni packagejson; raíz instala jose exacto y integra adapters.
3. raíz: package/lock, routes `/login`, `/auth/callback`, `/auth/context`, `/auth/logout`, `/api/auth/session`,
   HTTP/cookies/origin/canonerrors, documentación/gates. Sin pantalla nueva enestefoundation; context/recovery
   transport outcomes explícitos, consumidorvisual posterior antes de tráfico humano.
4. rooms_qa: tests/auth*.test.ts PG/crypto/abuse/replay/tenant/revoke; fixtures issuer controladas, no prodsecrets.
5. PeerAuth proporciona harness issuer real aislado; integrar endtoend dosRPs. Mockssólo unitarios, no cierre.
6. Lint/types/tests/build, migración+rollback/restore y demo regression; docsStatus/criteria/handoff.

## Files y modularidad

Crear src/server/auth/**, src/domain/auth-contracts.ts, migración CLI, rutas ytests dedicados; modificar
session.ts/package/lock/testglob/ejemploenv. Ningún nuevo repo/paquete compartido ni acceso tablasissuer.
Docs sólo Greenhouse. Sin deletes de datos ni archivosprevios. Stores/runtime secret staysserver-only.

## Riesgos y gates

Critical: mezcla audiencias, sessionfixation/replay, retorno malicioso, revocaciónincompleta, contextsambiguous,
secret leakage, aprovisionamientocallback. Tests negativos por cada límite y2tenants. No cachépositiva inicial.
Migration additive en DB local; rollback restaura sólo guards/storesdesanclados en clon descartable. Enrollback
normal flagOFF + sesionesrevocadas, conservaraudit/bindings. No down sobre DB compartida.

## Rollout y preguntas

Esta task prueba integración local real y conserva activaciónOFF. CloudDB/config RPsecrets/callbackprod/UI humana
son gates posteriores; no se migran recursosremotos ni issuerlive. Ningunapregunta alusuario bloquea elbuild:
contrato yaacordado; detallesdeexports/harness se coordinan conpeer. Si issuerdrift cambia load-bearing claims,
actualizarADR/plan antesadapter. OTP2066/67 no bloquea OIDC interno ni lo reemplaza.
