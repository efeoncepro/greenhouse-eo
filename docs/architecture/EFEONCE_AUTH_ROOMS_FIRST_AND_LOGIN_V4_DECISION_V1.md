# Efeonce Auth: Rooms primero y login V4 compartido

> Status: Accepted — decisión explícita de Julio, 2026-10-25.
> Owner: EPIC-044; consumer inicial EPIC-052.
> Scope: secuencia first-party, contrato de identidad y reutilización del login renovado.
> Reversibility: aditiva; flags independientes y sesiones por producto. No migra Greenhouse.
> Confidence: alta en límites; readiness productiva depende de pruebas y rollout.
> Validated as of: 2026-10-25, discovery de código y probes públicos del issuer.

**Actualización 2026-10-29:** [corte consolidado Auth+Rooms](../audits/rooms/2026-10-29-auth-rooms-program-consolidation.md).
El canary único del 26-10 sigue cerrado con acceso humano OFF. Login V4 fue
revisado en el candidato Auth local, cuya CI/release y readback visual faltan;
la nueva UI de Rooms no se había entregado. El Job de rotación y los guards
de deploy continúan como candidatos locales, sin activar producción.

## Corte operativo — 2026-10-26

El canary conjunto Auth+Rooms pasó con una identidad interna y Microsoft/MFA, OIDC y renovación SSO,
una sala sintética, un PNG privado y un único correo recibido. Se verificaron wrong-code, replay y
revocación; invitación revocada, sala archivada y sesiones de prueba cerradas. No repetir el correo.
Auth conserva `00168-vzb` al 100%, SHA754a2a28/digest122e2acb, first-party/OTP false y montajes HMAC/authority
ausentes; Resend production v1 y Sentry production. Esto no abre acceso general ni acredita pentest,
release #262, migración del portal o aceptación de la nueva UI. La UI puede desarrollarse aislada.
El control de deploy sólo está LOCAL+PR #263/#264 abiertas, con retención humana sin merge/despliegue.
[Estado, CI y próximos pasos](../operations/runbooks/auth-server.md#estado-operativo-y-retención--2026-10-26).

## Context (baseline de aceptación 2026-10-25)

Auth publica login y OAuth MCP, pero no emite todavía identidad OIDC first-party. El registro y los códigos
actuales están acoplados a grants, consentimientos y audiencia MCP. Rooms ya tiene demo Vercel y autoridad
persistida local, con `resolvePrincipal()` cerrado; no tiene aún binding OIDC ni DB cloud.

Julio decidió usar Rooms como primer consumidor por su alcance menor y llevar a Efeonce Auth la pantalla
de login renovada de Greenhouse (dirección V4 de TASK-1964). La aceptación visual del source no acredita la
fidelidad del nuevo adapter ni la implementación de todos sus estados.

## Decision

1. TASK-1834 entrega la foundation OIDC reusable. Rooms es el primer producto real consumidor, mediante
   TASK-2065, ejecutada por la sesión dueña de Rooms. TASK-2063 conserva la convergencia específica Greenhouse,
   incluidos los criterios originales NextAuth, TenantAccessRecord, legacy/recovery y revalidación.
2. TASK-2064 lleva la composición V4 a Auth mediante su adapter HTML/CSS/JS sin React. Reutiliza fuentes,
   fotografías y marca oficiales; no importa Next/MUI al issuer. La pantalla neutral es Efeonce y la contextual
   identifica Rooms sólo desde un registro/transacción confiable. Los métodos visibles son los implementados.
3. El registro first-party es administrado por command con capability. CIMD, DCR y el navegador no pueden
   crear esa clase. Se guardan política, presentación, audiencia, redirect exacto, actor y estado tipados.
4. Se separan registros/códigos/handles first-party de los grants MCP; no se inventa `gv=1` ni consentimiento.
   Se reutilizan firma KMS, PKCE, utilidades HTTP, errores y auditoría, con controles propios de identidad.
5. Sesión de identidad y autorización local son distintas: el callback no crea personas, memberships ni
   roles por email. Rooms liga `(issuer, sub)` a un principal previamente autorizado y revalida sus permisos.
6. El permiso de autenticación corporativa no exige una capability MCP. Se mantiene tenant/OID verificado,
   perfil/source-link/enrollment elegibles y procedencia upstream sin crear un contexto delegado.

## Runtime Contract

Contrato inicial que deben compartir issuer y consumer:

| Elemento | Contrato |
|---|---|
| Issuer productivo | `https://auth.efeonce.org`; tests locales usan issuer explícito aislado |
| Registro | cliente confidencial por entorno, secreto hasheado, redirects exactos, clase server-owned |
| Authorize | `/oauth/authorize`, `response_type=code`, sólo `scope=openid`, PKCE S256, state y nonce |
| Callback | `code`, `state`, `iss` del issuer (RFC 9207); consumer exige `iss` exacto antes del exchange |
| Token | `/oauth/token`, client authentication, code de un uso, redirect y verifier vinculados |
| ID token | ES256, `iss/sub/aud/iat/exp/auth_time/nonce`; `aud=client_id`, TTL inicial 300 s |
| Access token | opaco, TTL 300 s, exclusivo de esa sesión y cliente; no bearer de negocio ni MCP |
| Respuesta | `id_token`, `access_token`, `token_type=Bearer`, `expires_in`, `scope=openid` |
| Renovación | sin refresh first-party inicial; nueva autorización puede reutilizar SSO suficiente |
| Introspection | `/oauth/introspect`, client-auth, sólo token propio; revalida identidad y sesión |
| Revocación | `/oauth/revoke` del handle propio; no implica cierre global de sesiones |
| Claims omitidos | email, roles, organización, capabilities, `gv`; Rooms conserva autoridad local |
| Consentimiento | first-party no muestra ni fabrica consentimiento delegado; MCP mantiene su policy |
| Feature flag | first-party OFF por defecto; no rebaja ni desactiva OAuth MCP |

Rooms exige `iss` exacto en el callback antes del exchange, además de state y transacción de un uso. Valida firma/JWKS, issuer, audiencia exacta, tiempos y nonce en el ID token. Conserva
el handle en servidor, nunca en localStorage o query. Revalida su vigencia en el issuer antes de autorizar una
sesión autenticada; expiración exige nueva autorización sin loop. La autorización Rooms se relee desde sus
primitives persistidas. La implementación puede introducir una ventana de caché sólo mediante política y SLA
explícitos, no por comodidad. Logout local de Rooms no se presenta como logout de todos los productos.

La sesión que respalda el código se vuelve a comprobar al intercambiarlo y al introspectar; link/profile/env,
procedencia y enrollment inválidos fallan cerrado. Dos RPs sintéticos prueban aislamiento de código, secreto,
redirect, audiencia y handle. No se toca Greenhouse para simular un segundo RP.

## Ownership y secuencia

- TASK-1834: protocolo, registro, persistencia, resolución first-party, metadata, wiring y conformance.
- TASK-2064: login V4 del issuer, copy, assets, CSP, responsive, estados y QA visual.
- TASK-2065 / sesión Rooms: binding explícito, entry/callback/sesión, permisos, recovery y pruebas del consumer.
- TASK-2063: adopción posterior Greenhouse, preservada sin activar nuevos métodos ni migrar cohortes ahora.
- TASK-1840: logout multiproducto; TASK-1833: assurance operacional; TASK-1832/1841: certificación/piloto externo.

Studio (TASK-1898) y Workbench (TASK-1952) siguen consumiendo foundation TASK-1834. La puerta de credenciales
de Greenhouse (TASK-1842) y los deep links del portal dependen de su consumer TASK-2063.

## Invitación a una sala: extensión coordinada

El mismo día Julio precisó el recorrido: **un único correo** con enlace tokenizado y código temporal;
la persona introduce ese código en Rooms. Abrir el enlace no dispara un segundo mensaje. Rooms posee
invitación, sala, expiry, revocación y grant limitado. TASK-2067 agrega OTP y correo gobernado al issuer;
TASK-2066 consume su proof y crea una sesión guest limitada a la sala, sin sesión global de identidad.
La [decisión de OTP](EFEONCE_AUTH_INVITATION_EMAIL_OTP_DECISION_V1.md) fija autoridad S2S, HMAC,
intentos y proof. El canary real acotado del 26 de octubre ya pasó y quedó cerrado; activación duradera y
rollout general siguen pendientes de decisiones separadas.

## Alternatives Considered

- Greenhouse primero: conserva planificación anterior, pero incorpora migración de métodos, contexto y roles
  que no son necesarios para probar la foundation; diferido por decisión del operador.
- Reutilizar token MCP para login: rechazado por audiencia, delegación y acoplamiento a grants.
- Copiar Login.tsx completo al servicio: rechazado por dependencia Next/MUI y controles no implementados.
- Crear Auth propio en Rooms: rechazado; duplicaría identidad y métodos.

## Rollout y evidencia

La autorización inicial del 25 de octubre cubrió discovery, ajuste canónico, implementación y pruebas locales. Push, deploy,
registro real de clientes, secretos y DB cloud se preparan con recibos/canary y se ejecutan bajo su autorización
de release; no se deducen de la demo Rooms. Las acciones acotadas del canary del 26 de octubre se documentan arriba;
la retención actual de Auth sustituye aquella secuencia como próximo paso operativo. Una migración en Cloud SQL compartido afecta producción.

Baseline previo: 442 tests Auth PASS, 7 skip explícitos de integración; `pg:doctor` PASS. Esto no valida el
nuevo carril. El cierre exige SQL real aislado, regresiones MCP, browser E2E Rooms/issuer, GVC V4 desktop/390px,
fallos de firma/replay/cliente/revocación, rollback y estado runtime honesto.

## Fuentes y relación con decisiones existentes

Esta decisión cambia el primer consumidor de
[entrada y consentimiento](EFEONCE_ID_RELYING_PARTY_ENTRY_AND_CONSENT_DECISION_V1.md), conservando sus
fronteras y reemplazando la obligación de Greenhouse como primera integración. Los deltas y auditorías fechados
permanecen como historia. [OIDC Core](https://openid.net/specs/openid-connect-core-1_0.html#TokenResponse) y
[RFC 7662](https://www.rfc-editor.org/rfc/rfc7662.html#section-2.2), consultados el 2026-10-25, sustentan respuesta
de token e introspección; este perfil no anuncia refresh/UserInfo first-party sin implementarlos.
