# Efeonce Auth — ledger del programa

> Estado vivo. La entrada más reciente va arriba. Cada hecho dice su fuente: `vivo` (readback),
> `doc` (lo afirma un documento) o `local` (check en el workspace).
> Las entradas fechadas previas son snapshots: no ejecutar sus secuencias pendientes cuando la entrada actual las haya superado.

## 2026-11-02 — Pantallas de Efeonce ID con la órbita: implementadas en `develop`, sin release

- `local`: el operador aprobó en el canvas (2026-11-02) el rediseño de todas las pantallas que no son el login V4 y
  confirmó La órbita como sistema de Efeonce ID. Todas usan el shell de `src/lib/auth-server/oauth/pages/orbit-shell.ts`:
  consentimiento (también multiorganización y app no verificada), step-up, «Primero, entra a tu cuenta», errores OAuth,
  error corporativo, segundo factor (seis casillas + modo de respaldo) y su activación en tres pasos, enlaces por correo,
  invitación, sesión, acceso retirado y límites.
- Panel: la órbita canónica (geometría de Rooms) rodea un ícono del catálogo AXIS en reposo (`resolveIcon`, generado en
  `orbit-assets.generated.ts`) o una palabra («Listo», «Hasta pronto», «De nuevo»). Una sola esfera por pantalla.
- Marca: lockup «Efeonce | ID» y el isotipo de Rooms como copias exactas de `axis-brand-assets` 0.4.32 en
  `public/branding/SVG/` (Greenhouse fija 0.4.25). El cliente `efeonce-rooms-cli` muestra su marca por id exacto.
- Fuentes nuevas: Bricolage variable y Poppins 400/500/600 en `fonts.generated.ts` (sube a ~1,6 MB).
- Gates locales: `vitest src/lib/auth-server` 784/784, `pnpm typecheck`, `pnpm auth-server:verify-contrast` (0 bajo
  WCAG en 1440 y 390) y revisión en el arnés en claro, oscuro y 390 px.
- **No desplegado.** Es el mismo servicio del login MCP: llega a producción sólo con release gobernado a `main`. No
  cubierto: `pnpm build`, GVC de producción y una corrida real de consentimiento/step-up contra el host.

## 2026-11-02 — Botón canónico «Continuar con Efeonce ID» aprobado; favicon sigue sin release

- `doc`: [ADR de la marca](../../../../docs/architecture/brand/EFEONCE_ID_MARK_DECISION_V1.md#el-botón-continuar-con-efeonce-id-aprobado-2026-11-02).
  Botón de Rooms, Studio, Greenhouse y cualquier relying party: «Continuar con» + `efeonce-id-button-lockup-{positive,negative}`
  («ID» en la tinta del texto). Sello `#001a33` sobre papel, blanco con borde sobre oscuro; 52 px por defecto, 56, compacto 40
  (sólo la marca, nombre accesible «Continuar con Efeonce ID»), ancho completo y sólo símbolo; diez estados (reposo, cursor con
  halo teal, presionado, foco con teclado, foco + cursor, cargando con la órbita + «Conectando…» y `aria-busy`, cargando con
  movimiento reducido, conectado, error «No pudimos conectar. Inténtalo de nuevo.» con `role=alert`, deshabilitado). Nunca el
  monograma antes del texto, nunca en teja, nunca la órbita sola como símbolo. **Corrige** la entrada del 2026-11-01, que
  ponía el isotipo chico en el botón.
- `local`: `button-lockup` en `@efeoncepro/axis-brand-assets` 0.4.32 (release `v0.4.32`, AXIS `0d45749`); el catálogo de logos
  de AXIS cuenta 336 archivos / 59 familias, 14 de la familia `efeonce-id`.
- **Sin implementar:** falta la primitive en `axis-ui-primitives` y la adopción en cada relying party. Frontera con el
  [ADR de entrada de RP](../../../../docs/architecture/EFEONCE_ID_RELYING_PARTY_ENTRY_AND_CONSENT_DECISION_V1.md) D2/D9 (sin CTA
  intermedio ni vestíbulo antes del redirect; TASK-1898 lo repite para Studio): el botón va donde el producto ya ofrece una
  acción para entrar, nunca entre una ruta protegida y el redirect. Si un producto quiere otra cosa, decide el operador.
- `local`: favicon de Efeonce ID sigue en `develop` (`04aaba55e`), **sin release**; `auth.efeonce.org` sirve el isotipo azul de
  Efeonce. Pendientes sin cambio: lockup del encabezado del formulario; copia de `public/branding` a
  `src/config/efeonce-brand-assets.test.ts` cuando Greenhouse fije `axis-brand-assets` ≥ 0.4.31 (hoy 0.4.25, TASK-2014).
- `doc`: delta en [login V4](../../../../docs/architecture/EFEONCE_AUTH_ROOMS_FIRST_AND_LOGIN_V4_DECISION_V1.md#delta-2026-11-02--marca-de-efeonce-id-en-el-login),
  [runbook](../../../../docs/operations/runbooks/auth-server.md), [pantallas](../../../../docs/documentation/identity/pantallas-efeonce-id.md),
  [manual](../../../../docs/manual-de-uso/identity/operar-pantallas-efeonce-id.md) y [acceso a productos](../../../../docs/documentation/identity/acceso-a-productos-efeonce.md).

## 2026-11-02 — Audiencia Rooms en producción (`auth-server-00172-zcn`, hotfix PR #267) y aceptada

- `vivo` (aceptación 2026-11-02, ledger de `efeonce-rooms`): el operador corrió `pnpm rooms login` una vez contra producción y el
  agente armó y publicó la sala `demo-volta` con 17 acciones `cli/claude-code`; `logout` respondió `revoked: true` y un segundo
  `login` terminó en «Listo». Introspección real con el secreto de Secret Manager verificada. TASK-2095 sigue `in-progress` hasta su
  cierre formal; el copy del consentimiento sigue sólo en `develop`.

- Operador: «Seguir con Efeonce ID» (variable, hotfix con solo `9ea3b8fd5`, release, clientes, secreto, flags).
- `vivo`: release `69b0ba90832c-5e4bdd3f-386a-4827-8e45-0b4b2ef5dd1d` (run `41372622852`, success, un intento, break-glass por
  `cloud_release`). `auth-server-00172-zcn` al 100 %, `GIT_SHA=69b0ba9`, `AUTH_SERVER_ROOMS_AUDIENCE=https://efeonce-rooms.vercel.app/api/v1`
  (variable de repo, fuente durable), first-party/OTP siguen `true`; `/healthz`, `/readyz`, metadata, JWKS y `/login` en 200. Watchdog `ok` 6/6.
- `vivo`: canary de contrato. `authorize` de `efeonce-rooms-cli` con `resource` Rooms → 401 (login requerido: la audiencia existe);
  las mismas clases con `resource` del gateway → `invalid_target`.
- `vivo`: clientes registrados en la base compartida (`efeonce-rooms-cli` público loopback; `efeonce-rooms-resource` confidencial).
  Secreto `rooms-production-agent-introspection-client-secret:1` (47 bytes, sin salto, comparado por hash) con `secretAccessor` para
  `rooms-runtime-production`; archivo local borrado.
- **Pendiente en `develop`:** descripciones del consentimiento (`75b40772d`) con el próximo release completo; hasta entonces la pantalla
  muestra «Permiso efeonce.mcp.rooms.…». **Rollback:** `update-traffic --to-revisions=auth-server-00171-xdd=100` (y luego `--to-latest`)
  o vaciar la variable + deploy gobernado; suspender `efeonce-rooms-cli` corta todas las CLIs.

## 2026-11-01 — Audiencia Rooms y cliente de la CLI de agentes (TASK-2095): código en `develop`, sin release (snapshot; en producción y aceptada desde la entrada 2026-11-02)

- Decisión del operador: «CLI primero, gateway después» ([enmienda D1-bis](../../../../docs/architecture/rooms/EFEONCE_ROOMS_AGENT_LANE_DECISION_V1.md#enmienda-d1-bis--carril-cli-directo-2026-11-01)).
- `local`: commits `23ee051ef` (ADR + tasks) y `9ea3b8fd5` (código) en `develop`, sin push. `src/lib/auth-server/oauth/resources.ts`:
  segunda audiencia `AUTH_SERVER_ROOMS_AUDIENCE` (vacía = apagada, `invalid_target` como antes); `aud` derivado de las clases;
  clases `efeonce.mcp.rooms.*` **restringidas** (solo clientes que las listan); solo contexto interno; access de 300 s;
  introspección por `metadata.introspection_audience`. Clientes por `pnpm auth-server:register-rooms-agent-clients`
  (`efeonce-rooms-cli` público loopback; `efeonce-rooms-resource` confidencial, secreto a archivo 0600).
- `local`: 758 tests de `src/lib/auth-server` + `scripts/auth-server` PASS (11 nuevos en `rooms-audience.test.ts`), typecheck PASS,
  drift y contrato de deploy PASS. **No es un grant nuevo:** reutiliza code + PKCE, refresh rotativo con reuso, revoke e introspect.
- **Pendiente con autorización del operador:** release a `main` (o hotfix enfocado), variable de repo `AUTH_SERVER_ROOMS_AUDIENCE`,
  deploy gobernado + readback, registro de los dos clientes en la base compartida y el secreto del cliente de introspección en
  Secret Manager (`rooms-production-agent-introspection-client-secret`) con `secretAccessor` para `rooms-runtime-production`.
- Lado Rooms (verificador y `pnpm rooms login`): TASK-2087, ledger de `efeonce-rooms`.

## 2026-11-01 — Marca de Efeonce ID aprobada (archivos en AXIS; adopción en Auth pendiente)

- `doc`: [ADR de la marca](../../../../docs/architecture/brand/EFEONCE_ID_MARK_DECISION_V1.md). «La órbita vive en la D»:
  asta, tramo recto y media órbita, esfera Growth a la 1:30. `local`: 12 SVG `efeonce-id-{logo,lockup,isotype,isotype-small}-{positive,negative,white}`
  en `@efeoncepro/axis-brand-assets` 0.4.31 (publicado en el release `v0.4.31`: AXIS `5a6a597` + `5540a2c`, 2026-11-02, readback en GitHub Packages), generador `scripts/brand/build-efeonce-id-logos.mjs`.
- **Regla del operador para la pantalla de entrada:** la marca va **sólo en el favicon** (`efeonce-id-isotype-small-*`, para
  ≤ 32 px) **y en ciertas aplicaciones del formulario** (lockup `efeonce-id-lockup-*` en el encabezado; botón «Continuar con
  Efeonce ID» con el isotipo chico en las aplicaciones). **Nunca el isotipo grande en el panel lateral:** ese panel es del
  carrusel de novedades, que se conserva.
- `local`: **favicon cambiado en `develop`, sin release.** `/favicon.svg` es ahora la teja de Efeonce ID (oscuro
  `#001a33`, radio 22 %, isotipo chico en negativo, esfera `#36c8bf`), compuesta por `scripts/auth-server/efeonce-id-favicon.ts`
  desde `public/branding/SVG/efeonce-id-isotype-small-negative.svg` y regenerada con `pnpm auth-server:brand-assets:generate`
  (constante `EFEONCE_ID_FAVICON_SVG`; guarda en `pages/brand-assets.test.ts`). Verificado en el arnés (200,
  `image/svg+xml`, legible a 16 px). Llega a `auth.efeonce.org` sólo con un release gobernado.
- Pendiente: lockup del encabezado del formulario y botón «Continuar con Efeonce ID»; meter la copia de `public/branding`
  en `src/config/efeonce-brand-assets.test.ts` cuando Greenhouse fije `axis-brand-assets` ≥ 0.4.31 (TASK-2014).

## 2026-11-01 — Login first-party vencido: hotfix en producción (`auth-server-00171-xdd`)

- Hotfix PR #266 (`main@60872da`), release `60872da089ed-6925b98e-7b47-4ab4-8435-d3eb64ad94c9` `released` (run
  `41328604666`). El primer intento quedó `aborted` porque el job final se colgó en el checkout; los deploys ya estaban
  verdes. Se usó `bypass_preflight_reason` autorizado por el operador (solo advertencias `playwright_smoke` y staging).
  Rollback: tráfico a `auth-server-00170-qlx`. ISSUE-190 resuelto.

- [ISSUE-190](../../../../docs/issues/open/ISSUE-190-rooms-login-expired-continuation-raw-json.md): la solicitud first-party dura 10 min y
  un login con MFA de 12 min devolvía `{"error":"invalid_request"}` en crudo. `b05403b3d` (develop): continuación vencida →
  `login_required` al RP con su `state`; error irrecuperable → página de error HTML para navegadores. Requiere release a `main`
  (hotfix o próximo release). Rooms ya reinicia el login una vez (PR #16 en producción).

## 2026-11-01 — Conciliación de TASK-1833: trabajo de seguridad sin integrar

- La evaluación ofensiva propia (20 casos, refutación separada) y los casos (a)/(b) de TASK-1831 están hechos; se
  tildaron en `develop` los dos criterios que los respaldan. Esa conciliación existía antes sólo en ramas de Codex.
- **Rama local `codex/auth-pr-develop-stack`** (punta `dddc922d7`, 2026-10-29): **integrada en `develop` el 2026-11-01**
  (sin release a `main` ni deploy). Trae: revocación de consentimiento + tokens atómica, recuperación atómica, 413 antes de
  cerrar un cuerpo excesivo, Job aislado de rotación (migración `20261029092236733`, workflow `auth-key-maintenance-deploy.yml`)
  e inventario de privacidad corregido. Además: verificación post-deploy de la revisión activa y retiro del trigger `push:main` de Auth; se conservó el guard
  squash y se declararon las tablas del Job en el allowlist de escritura. Falta promoverla a `main`, aplicar la migración
  y provisionar el Job (`AUTH_KEY_MAINTENANCE_PROVISIONED`). Lo mismo vale para `efeonce-mcp`
  rama local `codex/auth-gateway-assurance@9fb877b` (tests (a)/(b)).
- GCP (lectura 2026-11-01): sin Job ni Scheduler de rotación; KMS versiones 1 y 2 del 2026-09-04.
  `auth.keys.rotation_overdue` avisará pasados 80 días, alrededor del 2026-11-23.
- Faltan además: ventana steady de 7 días, simulacro de revocación masiva en staging, aprobación de privacidad V2 y la
  cobertura ofensiva CIMD/gateway bloqueada.

## 2026-11-01 — Retención levantada y Efeonce ID en `main`: 00170 con carrusel de novedades, release `released`

- Operador: «Ok pasa todo develop a main, todo con /release» y «Autorizo todo». Release `935583f88db0-544b3943-a041-4fe6-9e62-03aca45c6c8f`
  `released` (run `41284120477`), tras dos intentos `aborted` (ver timing ledger).
- `vivo`: `auth-server-00170-qlx` al 100 % con `GIT_SHA=935583f88…`, first-party/OTP/internal ON, los mismos 6 secretos que la 00169.
  `/healthz`, `/readyz`, discovery, `oauth-authorization-server`, JWKS (2 llaves) y `/login` en 200; issuer `https://auth.efeonce.org`;
  `/login` y el recorrido desde Rooms («Entra a Rooms») muestran el carrusel con el feed publicado de Greenhouse. MCP sigue declarando
  `authorization_servers: ["https://auth.efeonce.org"]`.
- **El tráfico ya no está fijado:** `gcloud run services update-traffic auth-server --to-latest` (la 00170 quedó con 0 % tras el deploy
  gobernado porque la 00169 estaba fijada). **Rollback:** `gcloud run services update-traffic auth-server --region us-east4
  --project efeonce-group --to-revisions=auth-server-00169-4pq=100` y readback.
- Guard de `auth-server-deploy.yml` compatible con squash (PR #265): si el commit servido no es ancestro del objetivo, acepta sólo si es
  ancestro de la coincidencia de árbol MÁS ANTIGUA en `origin/develop`; un runtime servido más nuevo sigue rechazado (pruebas en
  `scripts/auth-server/test_deploy_contract.py`, incluido el caso de revert).
- `main` ya contiene el guard de deploy. PR #263 (`main`) y #264 (`develop`) de Codex se **cerraron** el 2026-11-01 como superadas
  por el release; las ramas se conservan.
- Intentos abortados antes del `released` (`doc`, timing ledger): run `41274930062` (manifest `5f2e69806eee…`), el guard viejo exigía
  ancestría y el squash no la tiene → [ISSUE-184](../../../../docs/issues/resolved/ISSUE-184-auth-deploy-guard-rejected-squash-releases.md);
  run `41282851247` (manifest `935583f88db0-3f177dd4…`), el deploy gobernado creó `auth-server-00170` con 0 % porque el tráfico seguía
  fijado a `auth-server-00169-4pq` desde la activación manual del 31-10 →
  [ISSUE-185](../../../../docs/issues/resolved/ISSUE-185-auth-governed-deploy-revision-without-traffic.md).
- CI de `develop` bloqueado ese mismo día por 20 tests de growth SEO atados al corte ETV `2026-11-01T00:00:00.000Z`; fix `1543335fb`
  (reloj fijado) → [ISSUE-186](../../../../docs/issues/resolved/ISSUE-186-growth-seo-tests-broke-at-etv-cutover.md). La rotación de
  `changelog.md` (`9c166d03b`) fue rutina.
- `vivo`: watchdog 6/6 synced; `ops-worker` y `artifact-worker` quedan en `1543335fb` por change-gate legítimo (el diff del release
  posterior es sólo el workflow de Auth y su test).
- **Sin verificar:** errores de Sentry del release (sin token local) y un login humano completo a Rooms de punta a punta. Por eso
  TASK-2064 sigue `in-progress`.
- Sigue abierto: TASK-1833 (sin pentest completo) y ningún cliente real sin autorización nueva; delegación interactiva para la audiencia
  Rooms (EPIC-044) sigue como task por crear.

## 2026-11-01 — Operador levanta la retención; panel de novedades integrado en develop (sin desplegar)

- Operador: «Levanta la retención». `local`: `4a5d00277` en `develop` (sin push) trae desde
  `codex/auth-pr-develop-stack` sólo el lector del feed público (`src/lib/auth-server/persons/login-announcements.ts`)
  y su conexión en `routes.ts`/`server.ts`; 213 tests de `persons` PASS, typecheck PASS. Arnés
  `/login/public-feed-preview` renderiza el carrusel con el feed de producción de Greenhouse.
- `vivo`: el feed `https://greenhouse.efeoncepro.com/api/public/login-announcements` responde 200 con historias.
- Hallazgo: `develop` ya tiene el guard de deploy (`f6ea72278`); `main` no. El workflow sólo despliega desde `main`
  (`expected_sha` ancestro de `origin/main`). `develop` está 4 761 commits delante de `main` y la PR #262 es esa
  promoción completa (7 735 archivos). Producción Auth corre `754a2a28` (develop) en la 00169.
- Pendiente: decisión de cómo llegar a `main` (release completo #262 vs. PR enfocada de Auth) y luego deploy gobernado,
  `update-traffic`, readback (GIT_SHA, flags, discovery/JWKS/readyz) y rollback a la 00169.

## 2026-10-31 — First-party y OTP ON en producción para Rooms; PR #263/#264 siguen sin merge

- Autorización del operador: «Prende todo» y, tras explicar qué implica liberar Efeonce ID, «Todo»; después
  «Sí, fíjalos» para dejarlo durable. Recibo
  [`2026-10-31-production-activation.md`](../../../../docs/audits/rooms/2026-10-31-production-activation.md).
- `vivo`: `auth-server-00169-4pq` con el 100 % del tráfico, misma imagen que la 00168.
  - `AUTH_SERVER_FIRST_PARTY_ENABLED=true` y `AUTH_SERVER_INVITATION_EMAIL_OTP_ENABLED=true`.
  - Secretos montados: `auth-server-rooms-invitation-otp-hmac:1` y `rooms-production-invitation-authority-token:1`.
  - `/healthz`, `/readyz` y discovery en 200.
  - **Rollback:** tráfico a `auth-server-00168-vzb` (los dos flags OFF y sin esos secretos). El tráfico está fijado
    por revisión: moverlo exige `update-traffic` explícito.
- `vivo`, fuente durable: variables de repo GitHub `AUTH_SERVER_FIRST_PARTY_ENABLED` y
  `AUTH_SERVER_INVITATION_EMAIL_OTP_ENABLED` en `true` (inputs de `auth-server-deploy.yml`; el environment
  `production` no las sobreescribe). El próximo deploy gobernado conserva el estado.
- **Regla rota, documentada y conciliada:** la 00169 se creó con `gcloud run services update` manual, fuera del
  deploy gobernado. La configuración gobernada (variables de repo) ya coincide con ese estado.
- Fix `51d9f3203`: `scripts/auth-server/rooms-config-drift.py` buscaba `ROOMS_INVITATION_AUTHORITY_TOKEN_REF` en lugar
  de `..._SECRET_REF`, así que con OTP ON siempre reportaba drift. Ahora usa `SECRET_REFS` y tiene un test contra el
  workflow; contra la 00169 da `true`.
- `vivo`: `greenhouse_notifications.email_type_config.auth_server_rooms_invitation_otp` en `enabled=true`.
- `vivo`: el recorrido HTTP sin sesión de Rooms llega a `auth.efeonce.org/login` con `first_party_request`.
- PR #263/#264 siguen abiertas y sin merge: los flags se liberaron sólo para esta activación, por decisión del
  operador. La retención de release (#262) y de integración sigue vigente.
- TASK-1833 (revisión de seguridad: B15/B20, incidente, señales) sigue abierta. Ningún cliente real sin una
  autorización nueva.
- Necesidad nueva de EPIC-044: el [carril de agentes de Rooms](../../../../docs/architecture/rooms/EFEONCE_ROOMS_AGENT_LANE_DECISION_V1.md)
  (Accepted) requiere delegación interactiva para un **segundo resource server**, la audiencia Rooms (canje RFC 8693,
  `act`, autorización clase D10). TASK-1917 no la cubre; hace falta una task nueva, bloqueada por la retención de
  Efeonce ID.
- Falta: primer login humano real del operador en Rooms con la versión nueva.

## 2026-10-29 — Conciliación con backend local Rooms; issuer y release sin cambio

- `doc`: el [recibo final de Rooms](../../../../docs/audits/rooms/2026-10-29-backend-local-completion.md)
  acredita `codex/rooms-design-integration@3c7bcb5`, 337 tests/0 skips, 13 migraciones/43 tablas,
  Chrome/API 18+23 y recovery mixto PG16/18. Colaboración, presentación, derechos guest explícitos,
  puertos X-ray/CRM OFF, V4 local y MCP stdio ya están construidos en el consumer; no son backend
  pendiente del issuer Auth. No hubo cambio de fuentes Auth ni push/deploy/flags/correo por ese corte.
- `doc`: el recibo detallado de [dos adapters RP](../../../../docs/audits/rooms/2026-10-28-two-rp-auth-ca97eecd1.md)
  ya está versionado en este checkout y supera la indicación de ausencia del snapshot inferior:
  35 checks con fuentes ejecutables Auth `ca97eecd1`, checkout avanzado sólo por docs a `0ab888728`.
  Ejecutó issuer QA con protocolo/store reales; no el servidor completo `services/auth-server/server.ts`.
  RP2 es otro adapter del mismo consumer, sin certificar segundo producto, HTTPS, MFA o rollout.
- `doc`: la invitación guest sigue sin sesión interna/SSO; sus nuevos derechos locales se fijan
  expresamente a la edición inicial y los receipts referencian invitación/sesión, sin internalización.
  Stdio MCP consume la sesión HTTP existente de Rooms: no modifica consentimiento, scopes ni issuer.
- Pendientes separados: UI Claude Design y QA de experiencia; Linux/cloud multimedia, conectores
  reales y federación remota de Rooms; gates de seguridad/CI/readback y release Auth bajo su retención
  humana vigente. No reactivar first-party/OTP, fusionar PR ni repetir el único canary del 26-10.

## 2026-10-29 UTC — candidato local y release retenido

- `local`: [dossier Auth+Rooms](../../../../docs/audits/rooms/2026-10-29-auth-rooms-program-consolidation.md).
  El único canary real del 26-10 sigue cerrado con first-party/OTP y correo OFF;
  no se autorizó otro correo ni activación general. Login V4 aceptado en preview
  y revisado localmente en el stack Auth; falta CI del HEAD y readback visual
  tras release. La UI nueva de Rooms aún no estaba entregada.
- `local`: `codex/auth-pr-develop-stack@dddc922d7` conserva fixes de Auth,
  guards de deploy y Job de rotación en `987044d9d`. El Job es candidato
  OFF/dry-run, sin Scheduler, IAM ni ejecución KMS cloud; [recibo](../../../../docs/audits/auth-server/2026-10-29-key-rotation-job-local.md).
  No hubo push/merge/deploy/flags por este corte. #262/#263/#264 conservaban
  HEAD remotos anteriores al readback del 29-10 y el release sigue retenido.
- `local` (reporte peer Rooms): dos adapters RP probaron 35 checks frente a
  issuer QA con protocolo/store reales. El recibo detallado no está en este
  checkout; no prueba el entrypoint completo, HTTPS ni producción.

## 2026-10-26 — Control de despliegue corregido; operador retiene Auth en PR

- `doc/local`: [PR #263 main](https://github.com/efeoncepro/greenhouse-eo/pull/263) HEAD `5e1fc2554` y
  [PR #264 develop](https://github.com/efeoncepro/greenhouse-eo/pull/264) HEAD `aabd6d78d`, ambas abiertas.
  Sólo control/tests/docs y delta de metadata; sin producto Auth/UI ni historial local ajeno.
- `local`: 22 Python + 14 Vitest de drift/paridad/watchdog PASS en árbol main exportado, gates y hook normal
  PASS sin bypass. CI inicial encontró fixture/espejo omitidos, corregidos. Seguimiento CI26Oct: PR #263 y #264 CI completo, governance/reliability aplicables y Vercel PASS. Ambas OPEN, sin merge; ver `ciFollowUp` del readback enlazado.
- `vivo`: `auth-server-00168-vzb` al 100% del tráfico, `GIT_SHA=754a2a28…`, misma imagen/digest `122e2acb…`; first-party/OTP false, HMAC/authority ausentes, Resend production v1 y Sentry production; health/ready/discovery200.
- Decisión humana expresa: **dejar Auth en PR por ahora**, sin merge main/develop ni deploy. No release #262,
  flags, correos ni disable/enable de otros workflows. Revisar filtros src/lib de otros deploys antes de PR #264.
  El guard production/main existe LOCAL+PR, no está desplegado ni integrado: remoto main/develop sigue con el workflow viejo. El path `src/lib/**` de PR #264 puede disparar artifact/commercial/ico/ops; hace falta protección antes de cualquier futura integración, ninguna aplicada ahora.
- Diseño y desarrollo de nueva UI en entorno aislado pueden continuar; acceso productivo OFF y aceptación visual siguen separados. Canary único Microsoft/MFA+PNG+correo recibido PASS y cerrado: no repetir ni ampliar.
  [Readback actual 17:38:40 Chile](../../../../docs/audits/rooms/2026-10-26-docs-skills-state-readback.json).
  [Evidencia y siguiente paso](../../../../docs/audits/rooms/2026-10-26-auth-deploy-control.md).

## 2026-10-26 — Canary interno Rooms y una imagen real PASS; flags OFF

[Recibo conjunto](../../../../docs/audits/rooms/2026-10-26-auth-rooms-real-image-canary.md): una sala
sintética, un archivo físico y un correo al único destinatario autorizado; ningún cliente.

- Código ya servido en `754a2a280`, digest `122e2acb…`: sin imagen nueva ni full release de Greenhouse.
  Revisión de configuración `00167-ml6` ON temporal con HMAC/authority v1 y Resend producción v1.
- Microsoft/MFA aprobados por la persona; seis códigos first-party emitidos y consumidos. Renovación
  por SSO sin ampliar grants, workspace global ni scopes MCP.
- RP, secreto y redirect coincidentes; seis tablas Auth. Remitente exacto sin tracking. Un correo
  aceptado y recibido en Outlook, un challenge y un proof; código incorrecto400, replay404 y
  revocación401/404. Guest HTTP real leyó sala V3 e imagen procesada en GCS.
- Final activo `auth-server-00168-vzb`, 100%, misma imagen; first-party/OTP false, montajes HMAC/authority
  retirados y tipo de correo OFF. Health/readiness/discovery200. Resend producción v1 y Sentry production
  permanecen corregidos. Variables GitHub no cambiaron: false.
- Workflow con ENV staging por defecto pendiente de corrección antes de activación duradera. Este
  canary no cierra el release262, assurance1833, migración Greenhouse ni aceptación del nuevo frontend.
- Invitación revocada y sala archivada; sesiones de prueba cerradas, sin rotación ni claves nuevas.
  Identificadores personales y recibos sensibles permanecen en `.auth` privada, fuera de Git.

## Segunda auditoría 2026-10-25 ~23:30 UTC (EPIC-044 completo + logs)

Detalle en §6 de la [auditoría](../../../../docs/audits/rooms/2026-10-25-rooms-auth-status-after-codex-stop.md).

- **Sin repo propio** (verificado en GitHub, disco, Cloud Build y sesiones de Codex): el servidor vive en `greenhouse-eo`.
- **EPIC-044 tiene 27 unidades.** No iniciadas: 1838–1843, 2063, 1864, 1904, 1917 y 2000. Cierres administrativos ganados: 1828, 1829, 1830 y 1832.
- **PR #262:** CI verde (11/11 + 1 omitido), `CLEAN`, draft. No mover el HEAD de `develop` hasta mergearlo.
- **Logs (`vivo`):** cero token 200 y cero `/oauth/authorize` desde el 2026-09-26. Unos 5.000 `/oauth/token` 400 de `codex-mcp-client` en dos semanas, mientras el gateway responde 200 a esos clientes. **Explicado por el operador:** el MCP nativo está construido y probado; faltan los conectores de Codex y Claude (TASK-1904/TASK-2000), así que todavía no hay logins nativos. Los 400 serían una configuración vieja de Codex con un refresh vencido. Pendiente menor: registrar el motivo del 400 y una señal de tasa de error.
- **Últimas 15 revisiones desde `develop`:** ningún release a `main` desplegó `auth-server`. Configuración staging en producción (Sentry, Resend) y `minScale=0`.

## Corte 2026-10-25 ~22:55 UTC — Codex se queda sin uso

Fuente consolidada: [auditoría de estado](../../../../docs/audits/rooms/2026-10-25-rooms-auth-status-after-codex-stop.md).

### Vivo

- **Emisor del MCP:** `mcp.efeonce.org` declara `authorization_servers: ["https://auth.efeonce.org"]` (`vivo`). Scopes publicados: `efeonce.mcp.read`, `efeonce.mcp.globe.read` y `efeonce.mcp.hiring.read`. Un solo servicio Cloud Run `auth-server` (`vivo`). En producción desde el 2026-09-04.

- **`auth-server-00166-p77`**: Ready, 100% del tráfico, `GIT_SHA=754a2a28…` (`vivo`).
  - Login V4 servido en `/login`.
  - `AUTH_SERVER_FIRST_PARTY_ENABLED=false`, `AUTH_SERVER_INVITATION_EMAIL_OTP_ENABLED=false` y `EXTERNAL_IDENTITY_CANARY_ENABLED=false`.
  - Base ON: `AUTH_SERVER_ENABLED`, `OAUTH`, `PERSON_AUTH`, `INTERNAL_AUTH` e `INTERNAL_MULTI_ORG`.
- **Cloud aplicado** (`doc`):
  - Migraciones 1834 y 2067.
  - RP `efeonce-rp-rooms-production`, con callback `https://efeonce-rooms.vercel.app/auth/callback`.
  - Secretos HMAC OTP y client secret de Rooms en v1.
  - `email_type_config` del OTP en FALSE.
- **`ops-worker-00787-7fd`** todavía con `GROWTH_EVENT_EMAILS_ENABLED=true` (`vivo`). El `:-false` del `deploy.sh` espera un deploy del worker.

### Código

- `deae1ce15`: first-party (1834), Login V4 (2064) y OTP de invitación (2067).
- Fixes posteriores: `f3d3713c9`, `515ca529e`, `754a2a280` y `1859e90a6`. El runtime es idéntico entre 754 y 1859.

### Tasks

- **1834** (in-progress): falta la paridad ON/OFF del login Greenhouse/MCP y el gate 1833.
- **1833** (in-progress): evaluación propia hecha; cobertura ofensiva bloqueada; sin pentest completo.
- **2064** (in-progress): ya servido en `/login` (su `Status real` dice lo contrario). Falta el login real hacia Rooms y la fuente de novedades.
- **2067** (in-progress): faltan parity S2S, mailer/KMS/S2S integrados, consumo atómico en Rooms y canary.
- **2063** (to-do): convergencia Greenhouse, sin empezar.

### Secuencia pendiente

1. CI, build y smoke verdes sobre `1859e90a6` (PR #262 en draft, `UNSTABLE`).
2. Preflight con `target-branch=main`.
3. PR listo para revisión y promoción gobernada, con readback de `ops-worker` mostrando el correo de eventos OFF.
4. Secret refs y flags ON, deploy y readback.
5. `email_type_config` ON.
6. Un único canary con correo a `jreyes@efeoncepro.com`, replay, revocación y rollback (junto a Rooms, ver skill `efeonce-rooms`).

### Riesgos abiertos

- La vía de deploy en push a `develop` toca el único servicio, que es el login del MCP; el comentario del workflow dice «staging».
- `SENTRY_ENVIRONMENT=staging` y Resend con secreto `…-staging` en ese servicio.
- Login SQL con `CREATEROLE`/`CREATEDB`.
- KMS v1 lleva más de 51 días *retiring*.
- El runtime puede modificar `signing_keys`.
- Los recibos del operador siguen en el historial público.

### Lecciones

- Una ráfaga de pushes cancela el CI de los commits intermedios: `754a2a2` y `c6f145a` nunca se juzgaron. Leer el veredicto del SHA final, no el del anterior.
- Recibos de autoridad o identidad del operador: siempre fuera del árbol desde el primer día. Sacarlos después no los borra del historial.
