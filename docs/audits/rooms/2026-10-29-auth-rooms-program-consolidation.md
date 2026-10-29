# Efeonce Auth + Rooms — mapa de lo construido y lo pendiente

Corte documental: 2026-10-29 UTC. Este mapa consolida el trabajo de este programa
sin convertir pruebas locales en despliegues. Los recibos enlazados conservan
comandos, resultados y límites; los SHA y estados de terceros se fechan porque
pueden cambiar. No contiene credenciales, códigos, cookies ni datos del canary.

## Continuidad documental posterior del29Oct

Esta consolidación conserva su fotografía anterior a la ampliación del backend consumer. El
[recibo local posterior](2026-10-29-backend-local-completion.md) acredita aplicación Rooms3c7bcb5,
337pruebas,13migraciones/43tablas, V4 mixto, colaboración/presentación y MCPstdio; sin release.
El [recibo de dos RP con Authca97eecd1](2026-10-28-two-rp-auth-ca97eecd1.md), citado como ausente en
la tabla original, ya existe en este checkout. Conserva sus límites de issuerQA/HTTP local; no prueba
el entrypoint Auth completo, HTTPS ni MFA nuevos. Estado vigente en el [dossier](../../architecture/rooms/README.md)
y ledgers Rooms/Auth; la retención de Auth y el cierre OFF siguen vigentes.

## Decisión, repositorios y fronteras

- Efeonce Auth vive en `greenhouse-eo` (`services/auth-server/`,
  `src/lib/auth-server/`, `scripts/auth-server/`) y sirve el emisor
  `auth.efeonce.org`; no tiene repo propio. Rooms vive en el repo hermano
  privado `efeonce-rooms`. [Decisión de Rooms primero](../../architecture/EFEONCE_AUTH_ROOMS_FIRST_AND_LOGIN_V4_DECISION_V1.md).
- Rooms es el primer relying party first-party; la convergencia del login del
  portal Greenhouse sigue en TASK-2063. La sesión de identidad del issuer no
  concede roles ni acceso a salas: Rooms liga `(issuer, sub)` a una autoridad
  propia que revalida. El OTP de invitado da acceso limitado a una sala y no
  crea SSO interno ni consentimiento MCP.
- La pantalla Login V4 de Greenhouse fue adaptada al emisor. Julio aceptó el
  preview local renovado después de detectar una diferencia de fidelidad;
  el renderer, copy, assets y generadores del stack Auth fueron comparados
  contra el árbol visual aceptado. Eso no es aceptación del servicio productivo
  tras release. [QA visual integrado](2026-10-28-auth-develop-integration-local.md),
  [preparación de PR](2026-10-29-auth-pr-readiness-local.md).

## Evidencia por circuito

| Circuito | Construido o comprobado | Límite en el corte original |
| --- | --- | --- |
| Foundation Auth TASK-1834 | Registro administrado de RP, OAuth code + PKCE S256, ID token ES256 de audiencia exacta, sesión/introspection/revoke first-party separadas de grants MCP; SQL y arneses locales. [Base](../identity/2026-10-25-auth-rooms-first-local.md) | La rama integrada no está publicada en las PR remotas; flags first-party siguen OFF en el último readback vivo. |
| Login TASK-2064 | V4 neutral y contextual Rooms desde RP confiable; preview aceptado por Julio, revisión local desktop/móvil y feed público acotado. [QA](2026-10-28-auth-develop-integration-local.md) | Sin CI del HEAD nuevo ni readback visual productivo. |
| Invitación TASK-2066/2067 | Un mensaje con enlace y código; issuer verifica y consume OTP, Rooms conserva sesión guest acotada. B18 local probó 51 checks: guest sin cookie/sesión interna y `prompt=none` → `login_required`. [B18](2026-10-28-b18-guest-without-internal-sso.md) | B18 fue local, sin nuevo correo ni UI de Claude Design. |
| Consumer Rooms TASK-2065 | Callback valida `iss`, state, nonce, firma y audiencia; principal y permisos Rooms se revalidan. El peer reportó 35 checks browser/HTTP/PG PASS para dos adapters RP; el script `scripts/auth-two-rp-integration.ts` está en la rama Rooms `8750750`. [Conciliación](2026-10-29-auth-develop-reconciliation-local.md) | Ese run usó issuer QA con protocolo/store reales; no el entrypoint completo ni HTTPS productivo. El recibo detallado citado como `2026-10-28-two-rp-auth-ca97eecd1.md` no está en este checkout ni en la rama Rooms inspeccionada; conservar la atribución al peer. |
| Canary único 26-10 | Microsoft/MFA humano, sala sintética, imagen física procesada y servida en privado, OTP recibido y consumido una vez, autoridad guest y revocación comprobadas. Un correo fue aceptado por Resend y recibido en Outlook. [Recibo](2026-10-26-auth-rooms-real-image-canary.md) | Cerró con Auth/Rooms e invitación OFF; no repetir correo ni inferir activación para clientes. No certifica la UI nueva ni el producto completo. |
| Medios Rooms | Foundation de imagen privada y dispatch autenticado incorporados en Rooms; readback Git local 29-10: `main=origin/main=e4b2e89`, design branch `8750750`. [Arquitectura Rooms](../../architecture/rooms/README.md) | Ese ref local no prueba deployment Vercel nuevo. PDF/audio/video, presentación, notas, Q&A, actividad, MCP y CRM conservan alcance en EPIC-052. |
| MCP B10 | Consentimiento explícito read persistido en PostgreSQL local; token Auth hasta gateway local, write 403 y binding revocado 401; browser Rooms repitió consent/read sin crear consentimiento al entrar. [Gateway](../auth-server/2026-10-28-b10-real-binding-gateway-local.md), [reader Auth](../auth-server/2026-10-28-b10-real-grants-reader-local.md) | Algunas pruebas usan proyecciones y filas sintéticas; sin E2E del gateway/proveedor desplegado ni MFA humana completa. |
| Seguridad TASK-1833 | Evaluación propia, 20 casos backend ejecutados: 18 PASS locales; B15/B20 parciales. Revocación atómica PG, OTP fail-closed, límite de feed y HTTP 413 con socket real corregidos. [Dossier](../auth-server/AUTH_SERVER_RED_TEAM_2026-10-25.md), [413](../auth-server/2026-10-29-oversized-body-node-transport.md) | La prueba ofensiva CIMD se detuvo por revisión automática; no se declara pentest completo ni assurance cerrado. Privacidad V2, simulacros y steady siguen abiertos. |
| Entrypoint Auth OFF | `services/auth-server/server.ts` real respondió health 200, ready 503 disabled, authorize 404 y Host ajeno 421 en Node local, 4/4. [Recibo](../auth-server/2026-10-29-entrypoint-off-local-smoke.md) | Sin imagen Docker ni carriles ON/KMS/PG/ALB. |
| Rotación TASK-1833 | Job aislado y ledger durable en `987044d9d`; flags OFF/dry-run ON, sin Scheduler. PostgreSQL real 4/4, focales 44/44, gates y scan `b7cde4ec-c166-409f-aeaa-c1bfaf9a4a9d` sin hallazgos reportables. [Recibo](../auth-server/2026-10-29-key-rotation-job-local.md) | Sin build de imagen, IAM/secretos/migración aplicados, KMS real, ensayo de recuperación ni steady. Retiro/disable/destroy no automáticos. |

## Release y estado observado

El único emisor productivo se leyó por última vez en los recibos del 28-10
como Cloud Run `auth-server-00168-vzb`, con `GIT_SHA=754a2a280`, 100% de
tráfico, first-party/OTP OFF y health/ready/discovery/JWKS 200. Es un
**readback fechado**, no una consulta nueva de este dossier. [Estado de release](2026-10-28-auth-release-readiness.md).

La ruta local de Auth se reconstruyó sobre el guard `develop` y conserva como
ancestro el SHA servido. El guard de `main` y `develop` elimina el deploy
automático desde `develop` y comprueba revisión activa al 100% y SHA después de
deploy/skip; sólo se probó offline. [Conciliación](2026-10-29-auth-develop-reconciliation-local.md).
La rama `codex/auth-pr-develop-stack` añadió luego el Job de rotación:
`987044d9d` código y `0485a065f` recibo del scan. La rama está local; no se
creó PR nueva ni se publicó ese HEAD.

Readback GitHub repetido durante la consolidación del 29-10: las tres PR
seguían abiertas y la API las declaraba mergeable. Esos estados no prueban
CI de las ramas locales ni autorizan el merge.

| PR | Estado en ese readback | Falta |
| --- | --- | --- |
| [#262](https://github.com/efeoncepro/greenhouse-eo/pull/262) | draft `develop@f93583bb0 → main@e593e3993` | Revisar batch y CI del HEAD que se promueva. |
| [#263](https://github.com/efeoncepro/greenhouse-eo/pull/263) | abierta `5e1fc2554 → main@e593e3993` | Publicar/revisar guard local de main y obtener CI exacta. |
| [#264](https://github.com/efeoncepro/greenhouse-eo/pull/264) | abierta `aabd6d78d → develop@f93583bb0` | Publicar/revisar guard local de develop y obtener CI exacta. |

Las descripciones propuestas de las PR están [preparadas localmente](2026-10-29-auth-pr-readiness-local.md).
El preflight previo del candidato estrecho devolvió `readyToDeploy=false` y
`requires_break_glass`; ni la partición ni los checks locales levantan ese
veredicto. [Recibo](2026-10-28-auth-focused-main-candidate.md). La retención
de release sigue vigente: sin push/merge/deploy nuevos, flips de flags,
segundo canary ni correo adicional. El Job no se ejecutó ni creó una versión
KMS.

## Próximo orden verificable

1. Recibir la UI de Claude Design en la sesión dueña de Rooms e integrar sus
   pantallas con los conectores existentes; repetir QA completo, permisos,
   revocación, separación entre clientes y aceptación visual humana. La UI
   aún no se había entregado al último intercambio con Julio y el peer.
2. Cerrar los gates locales pendientes de seguridad y operación según
   [TASK-1833](../../tasks/in-progress/TASK-1833-efeonce-auth-server-security-assurance-and-operations.md):
   B15/B20, privacidad V2, ensayo de incidente/recuperación, señales y steady.
   El Job requiere provisión separada y ensayo cloud antes de habilitar su
   Scheduler; no es prerrequisito técnico para repetir el canary ya cerrado.
3. Sólo tras levantarse expresamente la retención, releer PR/HEAD/base y
   runtime, obtener CI sobre SHAs nuevos, reconciliar #263/#264, integrar Auth
   hacia `develop`, revaluar #262 y el preflight del batch. El release aprobado
   exige readback del SHA que sirve 100% del tráfico, flags y recorridos Rooms.

Este mapa no cambia el estado de ninguna task a `complete`. Los estados y
criterios específicos viven en EPIC-044, EPIC-052 y sus tasks; los recibos
anteriores permanecen como historia fechada.
