# TASK-1836 y TASK-1831 — construcción, evidencia y límites

Fecha: 2026-09-06 UTC (noche del 2026-09-05 en Chile). Coordinador: Codex, con tres subagentes
de documentación, contratos y skills. Corte de implementación: Greenhouse `21aa126082a30561bebf4c8be3f819465d23c94d`;
gateway certificado en la prueba `815df9b`. TASK-1837 y los commits posteriores de otros agentes quedan fuera
del alcance de este barrido. Este documento consolida evidencia; los ADRs y contratos enlazados gobiernan
el comportamiento. No reemplaza un nuevo readback ni acredita como actuales snapshots históricos.

## Estado que se puede afirmar

- El carril interno Microsoft → consentimiento → token nativo → lectura MCP quedó probado con una persona
  real. PR [#225](https://github.com/efeoncepro/greenhouse-eo/pull/225) tiene release certificado.
- La corrección posterior de `/login` directo conserva el botón y diseño de Claude. Ya está servida desde
  `develop`; visibilidad, foco y clic hacia Microsoft están verificados en la URL pública. No se completó
  un nuevo login humano directo hasta `/auth/session` ni su logout en producción.
- PR [#226](https://github.com/efeoncepro/greenhouse-eo/pull/226) seguía **OPEN**, sin merge, al readback de
  este barrido. El despliegue compartido no equivale a promoción certificada de ese fix a `main`.
- TASK-1836 y TASK-1831 conservan pendientes de sus matrices completas. No hay ampliación de cohorte,
  nuevos permisos, prórroga del piloto ni habilitación de clientes externos en este cierre documental.

## Mapa de lo construido

| Área | Implementación y contrato | Evidencia y límite |
| --- | --- | --- |
| Identidad corporativa | OIDC de tenant fijo, `openid profile`, `oid`/`tid`, state/nonce/PKCE, transacción de un uso y envelope KMS. `prompt=login`, reloj leído después del intercambio, `exp` estricto y `auth_time` firmado/fresco; no se presupone `auth_time <= iat`. [OIDC](../../src/lib/auth-server/internal/oidc.ts). | Callback Microsoft real exitoso el 05/09 a las 22:01 UTC, después de diagnosticar `jwt_expired`. Los errores públicos no exponen causas/claims; diagnóstico interno usa categorías fijas. |
| Sesión y assurance | Evidencia corporativa asociada a sesión; composición del `SubjectSessionPort` sin fallback de procedencia. Passkey UV y TOTP ligados a la sesión y propósito, sin crear otra sesión ni elevar automáticamente el MFA upstream. | Tests de replay, firma, UV, otra persona/propósito y revocación concurrente; PG real de persistencia/UV. No se certifica aquí toda la matriz de navegadores. |
| Autoridad interna | Enrollment interno sobre persona canónica y entidad operativa activa; grants personales explícitos y caducados denegados; contexto delegado vinculado a cliente, sesión, environment y binding. [Dominio](../../src/lib/identity/internal-access/). | Piloto único; grant de lectura SEO con vencimiento original, sin usar invitaciones externas ficticias ni cambiar lifecycle comercial. |
| Integridad compartida | Población explícita/inmutable `internal`/`external`; estado, audit, outbox y `gv` en la misma transacción. Reconciliación sólo con evidencia válida, actor/razón e idempotencia; reader externo devuelve `internal_population` sin fallback. [Primitives](../../src/lib/identity/external-access/authority-transactions.ts), [reconciliación](../../src/lib/identity/internal-access/reconcile.ts). | Migración aplicada, regularización 1 binding/1 grant y repetición 0/0; señales `unaudited_write` y `mixed_population` en cero. Recuperación externa probada sin desactivar vínculos internos. |
| OAuth y revocación | Code/token/refresh con contexto, población, scopes y `gv`; ledger de access tokens y revocación comprobados antes del dispatch. Refresh rotativo no eleva identidad, contexto o permisos. | Emisión y lectura real; refresh, revocación de familia/token y retiro de grant medidos con access token aún vigente. El caso A=10/B=2→3 está probado localmente, no en toda la matriz live. |
| Gateway TASK-1831 | Multi-issuer con validación JWT/JWKS y contexto confiable; binding/contexto/jti y versión revisados en la lane de Greenhouse; política por tool/población/capability/organización. Entra conserva su carril por scopes. | El canary nativo acredita el grant y aislamiento, cosa que un token Entra directo no acredita. `efeonce.gateway.status` externo no demuestra capacidades o scoping empresarial de otras tools. |
| Consentimiento y transporte | Reader de consentimiento elegido por población; HTML con `Referrer-Policy: strict-origin`; guard CSRF intacto. CSP `form-action` añade sólo el origen del callback previamente validado. | Se reprodujeron `Origin: null` y bloqueo de callback en navegador real. Chromium 6/6; no se relajaron orígenes, registro del redirect ni validaciones del cliente. |
| Login directo y UI | Reutilización de «Nocturno editorial», logo, botón Microsoft y shell de Claude. Ausencia de `return_to` selecciona `/auth/session` exacto; valor explícito vacío/duplicado/inválido se rechaza. Destino revalidado al iniciar y completar. HTML usa el resolver canónico y POST de logout; JSON conserva contrato. | 235 tests pasados/4 live omitidos; público 1440/390 con botón visible, foco, sin overflow y clic a Microsoft. Una sesión directa no fabrica cliente OAuth, audiencia, grant, contexto ni token MCP. |
| Retención y protección | Límites de las cuatro ceremonias passkey; GC efímero con retención, conteos agregados y preservación de evidencia/familias vigentes. | SQL real y ejecución scheduler del 05/09 a las 16:47:28 UTC con `dryRun=false`, `locked=true`, cero borrados en once tablas. Scheduler releído ENABLED, `13 * * * *`, America/Santiago. |

## Migraciones y trazabilidad

Las cuatro migraciones de TASK-1836 quedaron aplicadas y registradas por el runner; no repetirlas como
paso de activación. El rollback operativo apaga emisión/dispatch internos y conserva historia y estructura;
la migración de población es forward-only.

- [`20260905124526557`](../../migrations/20260905124526557_task-1836-internal-authorization-contexts.sql): contextos internos.
- [`20260905130319708`](../../migrations/20260905130319708_task-1836-auth-ephemeral-gc.sql): GC efímero.
- [`20260905132652846`](../../migrations/20260905132652846_task-1836-session-bound-passkey-step-up.sql): step-up ligado a sesión.
- [`20260905183812333`](../../migrations/20260905183812333_task-1836-authority-populations.sql): integridad de poblaciones y evidencia canónica.

Hitos de código: `51e285bb3` rollout interno; `a9f16b893` revocación antes del dispatch; `bac1c53f9`
claims/reloj; `7d704f483` y `0fc7a4bc5` integridad compartida; `e4977392b` diagnóstico redactado;
`c44856f4d` solicitud OIDC interactiva; `ddbd011f5` reader de consentimiento; `09def4fc4`
origen/CSP; `21aa12608` entrada directa. El operador autorizó explícitamente el commit mixto
`7d704f483`; este barrido no modifica el contenido Berel que viajaba allí.

## Evidencia runtime por momento

| Momento y superficie | Evidencia |
| --- | --- |
| Release PR225 | Main `08acfb2c6992251063044583e5a7642d37d9ed52`, [orquestador 34000876213](https://github.com/efeoncepro/greenhouse-eo/actions/runs/34000876213) success; manifest `08acfb2c6992-ee142c2a-dda2-4d33-984b-f2207d8dbd49` released a las 00:28:46.029 UTC, sin override. Releído en este barrido, sin manifest activo. |
| Calidad y operación PR225 | CI `33999842879`, Deep `33999842871`, smoke `33999850040`, Vercel `dpl_4E9q6hjbgSZdWcGewmCGBNHAQC2z` sobre el SHA exacto; health 00:27:30; watchdog 00:30:17, perfil `ops`, 5/5 y drift 0. Es evidencia de ese release, no un watchdog nuevo tras el fix directo. |
| Auth al canary MCP | `auth-server-00029-tfx`, código `09def4fc4`, digest `sha256:0dd44fc490ef4d0ee5ec59a84fcb08992ab5f180919bb1f5d90123c3f8820afa`. |
| Auth tras fix directo | [Deploy 34002082020](https://github.com/efeoncepro/greenhouse-eo/actions/runs/34002082020), 00:44:35–00:51:43 UTC, success. `auth-server-00030-rtm`, SHA `21aa126082a30561bebf4c8be3f819465d23c94d`, Ready desde 00:51:30.433584, 100% tráfico; digest `sha256:7354202ee9ab5bd32458ad90f0acd1e40c572ed8dedfb92d5e45107ba901917c`. Flags maestro/OAuth/personas/interno ON releídos. Región `us-east4`, proyecto `efeonce-group`. |
| Gateway al canary y readback | `efeonce-mcp-gateway-00036-5wc`, Ready/100%, nativo e interno ON. Región `southamerica-west1`, proyecto `efeonce-group`. Canary certificado sobre `815df9b`, digest `sha256:90e3e109b9100e12c69ff9edcacfe0483b5e86db47cc62fa336ed23b6f826338`. El HEAD posterior del repo hermano no se confunde con esa revisión. |

### Canary humano MCP y latencias

El 05/09 se completó SSO Microsoft; consentimiento a las 22:38:22.142 UTC y emisión a las 22:38:24.063.
Lectura propia permitida, organización ajena denegada con lectura propia antes/después, refresh rotativo
en 963 ms y dimensiones estables. Revocación con token no expirado efectiva para MCP en 10.151 s.
Retiro canónico del grant: denegación en una cota conservadora de 11 s; restauración auditada con el mismo
vencimiento (`gv` 3→4→5). Gateway interno OFF: denegación ≤20 s. Emisor OFF: refresh denegado.
Ciclo de apagado/restauración: 79 s; nueva emisión y lectura propia verificaron recuperación.

Canary final del 06/09 reutilizando la sesión corporativa: token a las 00:24:04.575 UTC; lectura propia
en 5442 ms; ajena denegada; revocación auditada a las 00:24:47.251 y rechazo MCP a los 6633 ms,
con access token aún no expirado. Todos los tokens de los helpers fueron revocados y permanecieron sólo
en RAM. No se guardan códigos, tokens, cookies ni claims personales en este expediente.

Readback PG de este barrido: una enrollment activa, `gv=5`, un grant `growth.seo.observation.read`
activo y el anterior revocado; ambos con vencimiento original `2026-09-12T15:00:00Z`. Auditoría con
actor canónico y razón en enrollment/grant/revoke/restore; señales de escrituras sin evidencia y mezcla
de población en cero. No se repitieron mutaciones del piloto para documentarlo.

### Evidencia visual pública del login directo

Capturas del host público, no del fixture local: [desktop 1440](evidence/2026-09-06-task-1836/login-1440.png)
y [móvil 390](evidence/2026-09-06-task-1836/login-390.png). Botón existente visible con destino
`/auth/internal/login`, foco de teclado, `scrollWidth <= clientWidth`, sin errores JS; clic lleva a
`login.microsoftonline.com` en ambos tamaños. El navegador del operador también mostró el botón al
actualizar `/login`. Esto acredita visibilidad e inicio SSO, no un nuevo callback humano directo completo.

## Verificación local por lote, sin sumar suites solapadas

| Lote | Resultado registrado |
| --- | --- |
| Backend inicial | 263 pruebas unitarias/integración; seis live ejecutadas aparte (persistencia/UV 4, identidad 1, GC 1). Build y gates registrados en TASK-1836. |
| Reparación de integridad | 118 unitarias, 20 live y una live adicional de recuperación externa; gateway 126 pruebas. Migración y reconciliación con readbacks. |
| Entrada directa `21aa12608` | 235 pasadas/4 live omitidas, 20 archivos pasados/1 omitido; typecheck y lint dirigido correctos, bundle del servicio correcto. Hook pre-push completo sin errores (26 warnings previos de lint). |
| Transporte y visual | `node scripts/auth-server/probe-form-origin.mjs --chromium-only`: 6/6. Renderizadores reales 1440/390 y revisión independiente; después, capturas/prueba del host público. WebKit omitido por falta de ejecutable. |

## Pendientes que este barrido no cierra

1. Promoción gobernada del fix directo a `main` y canary humano `/login` → Microsoft → `/auth/session`
   → logout; no reutilizar la prueba MCP como sustituto de ese recorrido.
2. Matriz live multicontexto A=10/B=2→3, aislamiento concurrente/handles/cursors y baja remota versus
   canónica con sus latencias separadas; las pruebas locales no miden esos caminos desplegados.
3. Clientes externos, Entra legado durante rollback, discovery/challenges y consentimiento por cliente
   en las revisiones MCP/clientes requeridas por TASK-1831/1832. Un 401 o metadata 200 es prueba negativa.
4. WebKit y pendientes amplios de UI; invitaciones/correo externos, passkeys entre navegadores y otras
   matrices de TASK-1830/1832 siguen con su owner. TASK-1837 en paralelo no hereda aprobación de estas pruebas.
5. Mantener el vencimiento original del piloto. Continuidad posterior requiere decisión y command
   auditado; nunca una extensión implícita al repetir una prueba.

## Dueños documentales

- [TASK-1836](../tasks/in-progress/TASK-1836-efeonce-id-internal-workforce-mcp-authorization.md) y
  [TASK-1831](../tasks/in-progress/TASK-1831-efeonce-mcp-gateway-multi-issuer-authorization-context.md): alcance y aceptación.
- [ADR interno](../architecture/EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md),
  [ADR nativo](../architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md): contratos y decisiones.
- [Runbook](../operations/EFEONCE_INTERNAL_AUTH_ROLLOUT_RUNBOOK_V1.md),
  [manual interno](../manual-de-uso/identity/efeonce-id-interno.md),
  [autorizador funcional](../documentation/identity/autorizador-efeonce.md): operación y experiencia.
- [Ledger de flags](../operations/FEATURE_FLAG_STATE_LEDGER.md),
  [ledger de releases](../operations/PRODUCTION_RELEASE_TIMING_LEDGER.md): snapshots y promoción.

Las skills e invariantes contienen las reglas durables, no copias de este inventario mutable.

## Verificación del barrido documental

Tres subagentes con ownership separado actualizaron arquitectura, documentación funcional/manuales,
operación/tasks/epic y skills/invariantes; el coordinador revisó la integración y la evidencia pública.
Las skills MCP/QA/mcp-craft se mantienen espejadas; las skills GVC de cada agente conservan sus diferencias
existentes y comparten la excepción de login público. La regla auto-cargada de auth-server apunta al contrato
actual. No se creó otra UI ni se modificó código de aplicación.

Task lint TASK-1836 y TASK-1831 sin errores ni warnings; espejos y enlaces locales añadidos correctos.
La revisión del gateway repitió 9 tests de verifier/authorized-tools, todos pasados, ninguno omitido.
El gate global `docs:closure-check` falló por dos flags de TASK-1837 incorporados en paralelo y no registrados
al momento de ejecutarlo: `EXTERNAL_INVITATION_DELEGATED_AUTHORITY_ENABLED` y
`EXTERNAL_INVITATION_SYSTEM_DELIVERY_ENABLED`. No se consideran un fallo de esta implementación ni se
oculta el resultado: el barrido documental se verifica con pathspecs propios, y la regularización de esos
flags pertenece al owner de TASK-1837. `ops:lint --changed` reportó cero errores con warnings de otras
unidades/índices; no equivale a cierre global sin advertencias. No se hizo push ni release en este barrido.
