# Efeonce Auth — ledger del programa

> Estado vivo. La entrada más reciente va arriba. Cada hecho dice su fuente: `vivo` (readback),
> `doc` (lo afirma un documento) o `local` (check en el workspace).
> Las entradas fechadas previas son snapshots: no ejecutar sus secuencias pendientes cuando la entrada actual las haya superado.

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
