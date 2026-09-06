# changelog.md

> Ventana reciente de cambios internos reales. El historial completo y verificable se consulta en
> [docs/changelog/internal/README.md](docs/changelog/internal/README.md). No cargar snapshots completos al
> inicio ni usar una entrada histórica como contrato vigente sin contrastarla.
>
> Techo operativo: 60 entradas, 2.000 líneas y ~60.000 tokens. Rotación:
> `pnpm docs:context-rotate --apply`.

## 2026-09-06 — Efeonce ID: invitación externa verificada end-to-end en staging (TASK-1837)

Con los flags ON en Vercel staging y un binding de prueba sobre el emisor real, el recorrido completo corrió sin que
nadie tocara el token: correo real en Outlook, aceptación en `auth.efeonce.org`, persona externa nueva con admin
designado, magic link y sesión viva; rebote forzado con `bounced@resend.dev` marcado `bounced` y la señal
`identity.external_invitation.undelivered` observada encendiéndose; reenvío que rota, revelación de 1 h, y la lane
delegada ejercitada con el token del gateway (200/403/422/201, correo real). Al cierre el binding se revocó y la
sesión murió (401). Producción espera el release y el flip de flags; la federación de la lane en `efeonce-mcp` sigue
pendiente. [Evidencia](docs/audits/2026-09-06-task-1837-external-invitation-delivery-evidence.md).

## 2026-09-06 — Efeonce ID: el sistema entrega la invitación externa; autoridad delegada del cliente (TASK-1837)

`issueExternalInvitation` envía el correo (`external_access_invitation`, token_sensitive, marca Efeonce) después
de confirmar la transacción y devuelve `delivery` en vez de exponer el secreto; la URL de aceptación se deriva del
`issuer_url` del environment (`/i/<token>`), nunca de una env var. Reenviar rota el token; revelarlo es una
excepción auditada de 1 h con capability propia. El rebote de Resend deja `delivery_status='bounced'` por una
proyección reactiva y tres señales nuevas vuelven observable el ciclo de vida. `designated_admin` pasa a conferir
autoridad real: un solo admin vigente por binding y una lane ecosystem para que invite a su propia gente (403/422
fail-closed). El consentimiento muestra el host del `redirect_uri` (MUST del protocolo). Migración additive y dos
flags default OFF. **Migración aplicada 2026-09-06 y verificada; smoke live `--apply` verde contra PG real
(reenvío, revelación, entrega fallida, delegada, admin cleared; `token_revealed` encendida ok→warning); build de
producción ✔.** Pendiente: binding externo real + flag en staging + correo real (decisión del operador) y
federación de la lane delegada en el gateway. Skills actualizadas (espejo `.claude`/`.codex`): `efeonce-mcp-platform`
(SKILL + native-authority + verification-matrix) y `greenhouse-qa-release-auditor/security-qa`. Commits `5518d868e…db5a0adf3`.

## 2026-09-05 — Efeonce ID: acceso Microsoft y publicación certificados

Corrección posterior `21aa12608` promovida por PR226 a main `456d9accf`, auth `00032-h45` y
manifest `456d9accffb6-3b09047e-c37f-4ac7-acbc-0e463e1610fd` released (run `34005056894` success):
`/login` directo reutiliza el botón de Claude y retorna a sesión autenticada; 235 pruebas pasan.
Botón visible y clic hacia Microsoft verificados en público a1440/390; nuevo canary humano directo
pendiente. Un primer run quedó aborted por deploys concurrentes de develop; el retry cerró sin bypass,
cinco servicios con el SHA exacto y watchdog `ok`. Barrido de tres subagentes consolida TASK1836+1831 en ADRs, docs
funcionales, manuales, runbook, tasks/epic, skills espejo e invariantes. [Evidencia y límites](docs/audits/2026-09-06-task-1836-1831-consolidated-evidence.md).

PR225 integra las reparaciones OIDC, lector de consentimiento interno y origen/CSP del formulario.
Release `08acfb2c6`, run `34000876213`, manifest `released` sin override. CI, Deep, smoke,
Vercel Production y health aprobados; watchdog operativo 5/5, drift0. Canary final sobre gateway36:
emisión de token, lectura propia, rechazo de otra organización y revocación efectiva en6.633s.
El piloto conserva gv5 y su vencimiento original; todos los tokens de prueba quedaron revocados.
No se declaran completas las matrices externas/multicontexto ni UI/WebKit. Evidencia:
[TASK-1836](docs/tasks/in-progress/TASK-1836-efeonce-id-internal-workforce-mcp-authorization.md).

## 2026-09-05 — MCP gateway: cartel propio del servidor (title, websiteUrl, íconos Efeonce)

El gateway se anunciaba como `efeonce-mcp 0.1.0` sin título, sitio ni ícono. Declara ahora su
`Implementation` completo y sirve el isotipo Efeonce desde su propio origen, con `src` derivados de
`MCP_PUBLIC_URL` y nunca como `data:` URI (el SDK estampa el `serverInfo` en cada resultado del
carril moderno). Tras el estudio de contenedor, el asset es UNO: isotipo blanco sobre placa navy
opaca 512×512 (marca al 76%, safe area 12%, sin radio horneado). Se retiran la variante dark y el
campo `theme` — la placa opaca no los necesita y el spec no define si `theme` describe el fondo del
ícono o el del cliente, cosa que ningún cliente permite falsificar. Un ícono sólo se declara si sus bytes cargaron: asset ausente
deja al gateway sin ícono + WARNING, nunca una promesa que responde 404. El `Dockerfile` copia
`assets/` y un test lo afirma, porque ningún test de runtime ve el contenido de la imagen.
`pnpm check` verde (131 tests) y ambas guardas falsificadas. **Desplegado** (`815df9b`, revisión
`efeonce-mcp-gateway-00036-5wc`): `/icon-512.png` 200 `image/png` con bytes idénticos al repo y sin
challenge, protected-resource 200, `POST /mcp` sin token 401, ruta retirada 404 y `auth.efeonce.org`
intacto. Sabido: ningún cliente Claude renderiza `icons` hoy — se declara porque es correcto.
Detalle y razones en
[`EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`](docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md)
§Delta 2026-09-05.

## 2026-09-05 — TASK-1836: diagnóstico cerrado del rechazo JWT corporativo

El callback real pasó el intercambio upstream y fue rechazado por jwtVerify; no se emitió token MCP.
Se añaden causas internas fijas para firma/clave/algoritmo, claims requeridos, issuer/audience y tiempo,
sin conservar payload/cause ni relajar verificaciones. Respuesta pública sin detalles sensibles.
20 pruebas focales y106 de auth correctas; revisión independiente sin hallazgos materiales. Emisor OFF
tras el fallo, diagnóstico aún local y causa exacta pendiente de comprobar en runtime. Tsc y bundle
del emisor correctos; build Next compiló pero se interrumpió en tipos, sin acreditarlo completo.

Actualización21:48Z: diagnóstico desplegado confirma jwt_expired. Corrección local sustituye
max_age=0 por prompt=login, conserva exp estricto y auth_time firmado/fresco; elimina orden
no requerido auth_time<=iat. Emisor OFF rev19; nuevo canary y rollout pendientes.

Actualización22:04Z: SSO Microsoft correcto en runtime. Consentimiento bloqueado por lector
externo usado para organización interna; corrección local agrega proyección interna mínima y
selección/verificación explícita de población. Readback PG real y150pruebas correctos;
publicación/token/canary final pendientes, emisorOFF rev22.

Actualización22:19Z: consentimiento visible tras publicar reader. Envío del formulario
rechazado por Origin:null bajo no-referrer, reproducido con navegador real. Corrección local
HTMLstrict-origin conserva CSRF y no envía rutas/query en Referer; canarytoken pendiente.

Actualización22:44Z: canary interno real completo con09def4fc4: Microsoft, consentimiento,
token y lectura propia correctos, foreigndeny, refreshrotativo, revocacióntoken10.151s,
retirogrant<=11s y gatewayOFFdeny<=20s. Piloto restauradoON, gv5 y expiración original;
tokenspruebarevocados. Promociónformal main y matricesamplias externas/UI pendientes.

## 2026-09-05 — TASK-1836: reparación de integridad aplicada en PG

Migración CLI `20260905183812333` aplicada: población explícita e inmutable, verificación de evidencia
y grants internos con caducidad. Piloto gv 2 → 3; reconciliación actual audit/outbox para binding y
grant, con actor/razón, sin extender autoridad ni fabricar historia. Repetición 0/0; señales de
escrituras sin evidencia y mezcla ambas cero. Resolver externo devuelve `internal_population`;
gateway comprende el rechazo sin fallback. Pruebas: 118 unitarias, 20 live y 1 live adicional de
recuperación. Publicación pendiente mientras Claude termina WIP UI que bloqueó el build compartido;
emisor interno OFF. Commit completo `7d704f483` autorizado por el operador, incluido Berel.

## 2026-09-05 — TASK-1836: autoridad corporativa nativa y límites de autenticación

Backend implementado con Entra OIDC, procedencia de sesión persistida, contexto delegado por cliente/binding,
consentimiento aislado y refresh sin rejuvenecer auth_time. Enrolamiento interno gobernado sobre la
persona y organización propias, grants personales con vigencia y reader sin caché positiva. Tres migraciones
aplicadas en PG compartido; pruebas reales de persistencia/identidad/GC y UV ligado a sesión. Tras aviso de Claude se añaden
límites passkey y limpieza SECURITY DEFINER acotada de estado vencido; auditoría y familias refresh vivas
se conservan. App Entra, secreto y KMS dedicados preparados con cohorte upstream individual. Emisor
y gateway publicados con gates internos OFF; sin acceso MCP interno real todavía. Gateway con 114 pruebas y JWKS acotado; first fold UI con
GVC anónimo sin credenciales, pendiente aprobación visual. Consentimiento revalida binding/step-up
y reader externo excluye grants vencidos. DTO canónico integrado en authorize, POST y renderer;
permisos separados por organización y fallos sin fallback. Retorno OAuth/Microsoft conectado con flag y validación de URL; code/refresh revalidan scopes actuales del cliente. Guard de origen protege sesiones y factores, con regresiones de login CSRF; shell consume fuentes/licencias y CSS bajo CSP estricta; segundo factor TOTP/UV y alta con QR local integrados. Cuatro GVC desktop/móvil y seis checks de navegador pasan con factores ficticios. Primer despliegue autorizado con gates OFF; recheck por jti agrega revocación del token a la validación de contexto antes de activar la cohorte. El piloto ya tiene enrollment y grant de lectura temporal, por el command interno (integración auditora compartida reabierta posteriormente). Se restauran seis permisos release faltantes del rol administrador (execute ya existía), con negativos para los otros roles y Finance sólo lectura de resultados. CLI exige motivo para excepciones y lo conserva en manifest/auditoría; no inventa identidad Greenhouse desde GitHub actor. Pruebas focales 46 passed y typecheck correcto. Actualización operativa: PR #222 / main1086fe40 released por run33978290957; CI/Deep/E2E y watchdog5/5 correctos. Reader y emisor internos ON; GC ON con scheduler y ejecución real confirmada, once tablas y cero borrados. Motivo de excepción releído en manifest y auditoría PG. Activación del gateway detenida por intento de sobrescribir tag inmutable; flags restaurados OFF y fix de reutilización por digest publicado en dd04f470, 125 pruebas correctas, nuevo deploy en curso. Login Microsoft/MFA completado, callback propio rechazado. Follow-up local con openid profile, reloj JWT posterior al intercambio y diagnóstico cerrado; 65 pruebas y typecheck correctos. Emisor temporalmente OFF durante publicación; token, canaries y rollback aún pendientes. [Runbook](docs/operations/EFEONCE_INTERNAL_AUTH_ROLLOUT_RUNBOOK_V1.md).

Estado actualizado: PR #223 / main a6866250 released por run33982717767, sin override, health y watchdog5/5 correctos. Corrección OIDC y CSRF publicadas; emisor permanece OFF por hallazgo de integridad confirmado. El audit interno existe pero faltaba audit externo canónico para binding/grant; detector nuevo mide2 en PG. Decisión A: población persistida y primitives transaccionales compartidas, recuperación aislada, reconciliación actual con procedencia sin fabricar historia. Implementación local: 146 tests integrados y typecheck correctos, migración SQL13/13 y commands live TEMP correctos; endurecimiento de guard final/último canary de poblaciones en validación. No se aplicó la migración ni reconciliación real. Criterio auditado de TASK-1836 reabierto; Claude dejó ownership a Codex.

## 2026-09-04 — Berel: feedback de septiembre promovido a la skill de producción

Lectura integral del Playbook Producción vivo y contraste con Recomendaciones Cliente, Reglas del cliente
y Aprendizajes del feedback. Las skills espejo Claude/Codex incorporan voz pública sin lenguaje interno,
la rama para productos nuevos/de awareness, vocabulario técnico/público inequívoco, Kelvin homologado,
tablas y CTA accionables, render oficial del empaque, datos faltantes solo como pendientes internos,
correcciones de catálogo y separación Notion → CMS → publicación → URL viva. Se conserva la precedencia
vigente frente a reglas antiguas del Playbook (`Enlace`, `/search`, longitud). No se editaron artículos,
assets ni Drupal y no se declara ninguna publicación.

## 2026-09-04 — TASK-1830: autenticación de personas externas del emisor, sin contraseñas (viva desde el 05)

**Delta 2026-09-05 — activada, y el correo del magic link estaba muerto.** El operador prendió ambos
flags (revisión `auth-server-00007-cxb`) y la superficie quedó viva. El canary nuevo
`pnpm auth-server:person-auth:canary` —que ejercita el contrato HTTP contra el host desplegado, no el
SQL contra la base— encontró en su primera corrida que el enlace de acceso fallaba con
`RESEND_API_KEY is not configured`: el `deploy.sh` declaraba el `*_SECRET_REF` sin montar el secreto,
y `sendEmail` usa el cliente síncrono, que lee un secreto ya resuelto. Arreglado en `deploy.sh`,
pendiente de redeploy.

Nadie se habría enterado: la respuesta al pedir un enlace es 202 idéntica exista o no el correo, así
que un correo muerto no se reporta solo (misma clase que `GROWTH_EBOOK_EMAIL_DELIVERY_ENABLED`). De
ahí la regla generalizable: **toda superficie cuya respuesta es deliberadamente indistinguible
necesita una verificación externa de su efecto**, porque por diseño renunció a reportarlo.

Verificado en vivo por primera vez (22 ok / 0 fallidos): consumo del enlace y su uso único, sesión
sin filtrar el sujeto, passkey con `uv` abriendo en `step_up`, TOTP con secreto cifrado por KMS,
anti-replay y muerte de la sesión al revocar el link. El canary comprueba además que la señal de
sesión huérfana **se enciende** al revocar —un detector que sólo se ve en `ok` es una afirmación— y
distingue tres estados: verde, rojo e **incompleto**, porque un canary con pasos omitidos no es
verde. Pendiente: redeploy, organización elegible para el carril de tokens, passkey en dos
navegadores y el límite de tasa del reto de passkey anónimo.


Cuatro slices en `develop` detrás de `AUTH_SERVER_PERSON_AUTH_ENABLED=false`: sesión propia
(`__Host-efeonce_auth`) que implementa el `SubjectSessionPort` que dejaba a `authorize` en
`login_required` desde TASK-1829; magic link con patrón selector/verificador (15 min, un uso, consumo
por POST tras página intermedia porque los escáneres de correo abren los GET); passkeys con
credenciales descubribles —sin `allowCredentials`, que sería un oráculo de existencia— y contador
anti-clonación; TOTP de step-up cifrado con la llave KMS **simétrica** `auth-server-totp-envelope`
creada el mismo día (la de firma es EC y no cifra), con AAD `<environment>|<subject>` verificada
contra la llave real; recuperación por re-invitación auditada, sin self-service de reset.

8 tablas `greenhouse_auth` aplicadas y verificadas contra PG real, capability
`identity.auth_person.revoke` con su ruta admin por Full API Parity y 3 señales `auth.person.*`.
Desviaciones declaradas: ledger propio `person_auth_attempts` (el del portal tiene CHECK cerrados de
NextAuth y GRANT a otro rol) y `sha256`+timing-safe en vez de bcrypt (un KDF lento no agrega nada
sobre 256 bits y sí 300-800 ms de CPU en un endpoint no autenticado).

Cuatro defectos los encontró el trabajo, no una revisión: la librería de WebAuthn lanzaba al
retroceder el contador y dejaba **viva** la credencial clonada; `deactivateOrphanSourceLinks` no se
llamaba al aceptar una re-invitación, así que el subject anterior seguía autenticando y la
recuperación no recuperaba nada; `epochTolerance` de `otplib` va en `verify` y el `epoch` en
segundos; y un código mal formado hacía responder 500 a un endpoint público de autenticación.

Falta rollout: prender el flag en staging (exige `AUTH_SERVER_OAUTH_ENABLED=true` + environment
`efeonce-auth` en `active`), verificar que el correo sale de verdad por Resend y probar passkey en
dos navegadores.

## 2026-09-04 — Release `9100bbd2765d` a producción: EPIC-044 (auth-server + OAuth code complete) y TASK-1631

PR #221 squash `9100bbd27`, orquestador `33893120972` (un run, sin retry), manifest `released` 16:39:40Z. `auth-server` en producción (`/readyz` 200, JWKS 2 kid, superficie OAuth 404 con `AUTH_SERVER_OAUTH_ENABLED=false`), TASK-1631 lane ecosystem verificado en prod, 4/4 workers + auth-server Ready (dos change-gated con árbol idéntico). Post-release: `AUTH_SERVER_JWKS_URL` en Vercel Production+staging con redeploy; environment `efeonce-auth` registrado `draft` por command (`pnpm auth-server:register-issuer-environment`). El watchdog aprendió el change-gate del `auth-server` (espejo por servicio + test de paridad con los workflows). Ledger de tiempos y de flags actualizados. Barrido documental del release: control plane, playbook (anti-patterns #17/#18), runbooks y manuales del orquestador/watchdog/auth-server, ADR nativo, contrato OAuth, `CLOUD_RUN.md`, EPIC-044, rule `auth-server` y skills `efeonce-mcp-platform` (+espejo Codex), `greenhouse-production-release` y `greenhouse-backend`.

## 2026-09-04 — TASK-1829 (EPIC-044 U02): superficie OAuth del emisor propio, code complete detrás de flag

`auth.efeonce.org` gana su protocolo, detrás de `AUTH_SERVER_OAUTH_ENABLED=false` (`services/auth-server/deploy.sh`):
metadata RFC 8414 + OIDC con `issuer` idéntico al origen y `client_id_metadata_document_supported`, CIMD como
registro primario (URL `client_id`, anti-SSRF, cache 24 h + etag), DCR RFC 7591 sólo para clientes públicos,
clientes confidenciales pre-registrados por command (`pnpm auth-server:register-client` · `POST /api/admin/auth-server/oauth-clients`),
`authorize` con PKCE S256 obligatorio, consentimiento por (sujeto, cliente, scope) y step-up para escrituras,
access JWT ES256 de 15 min firmado en KMS HSM (`iss sub aud azp scope gv jti`), refresh opaco rotativo 30/90 d
con detección de reuso que revoca la familia, revoke RFC 7009, introspect RFC 7662 y `POST /oauth/consent`.
Siete tablas nuevas en `greenhouse_auth` (aplicadas) y dos capabilities (`identity.auth_client.register`,
`identity.auth_consent.revoke`, EFEONCE_ADMIN). Las primitives puras del broker sister-platform se extrajeron a
`src/lib/auth-server/oauth/primitives.ts` sin cambiar su contrato. Tres señales `auth.oauth.*` (steady 0).
`gv = max(grantsVersion)` de memberships `bound` (TASK-1631); sin binding, `access_denied`. Hasta TASK-1830
`authorize` responde `login_required`: ningún token para persona real todavía. Contrato:
[EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1](docs/architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md). Rollout
pendiente: release del runtime a `main`, fila del emisor en `external_identity_environments`, flag ON en staging.

## 2026-09-04 — Método de informes SEO/AEO y continuidad de Berel

Se incorpora el [modelo de informes para clientes](docs/operations/SEO_AEO_CLIENT_AUDIT_REPORTING_OPERATING_MODEL_V1.md)
a las skills SEO/AEO y Berel, espejadas para Claude/Codex: lectura de auditorías y Content Hub, voz de agencia
que redacta/publica, límites GSC/GA4/DataForSEO, validez de preguntas y probes del Grader y readback Notion/Markdown.
Se conserva la [auditoría de agosto](docs/audits/seo/BEREL_AUDITORIA_SEO_AEO_AGOSTO_2026.md) como caso fechado.
El método no implementa las correcciones del Grader ni del sitio; esas acciones siguen pendientes.
Se añade `report-studio` para Claude/Codex, registrada en router y gate de espejos: fuentes primarias, siete módulos, plantillas, evaluación editorial y preflight PDF con pruebas negativas. Berel conserva 55 páginas A4 con marca/contacto completos, cobertura On-time, gráficos y acabado reproducible; revisión y evidencia en su carpeta de informe. Entrega local, sin envío.

## 2026-09-04 — TASK-1631 (EPIC-044 U04): binding de identidad externa aplicado, commands, API y señales

Migración aditiva aplicada en `greenhouse_core` (environments registry, bindings Account 360, grants provider-neutral con
`profile_id` opcional, invitaciones con `token_hash`, audit y resolution log append-only, índice único parcial de subjects
`external_idp:%`) más forward-fix del CHECK `linked_consistent`. Dominio `src/lib/identity/external-access/**`: seis
commands idempotentes en una transacción (estado + audit + outbox, `grants_version` sube en cada cambio de autoridad) y el
reader `resolveExternalAccess(environment, subject)` que deniega fail-closed y registra sólo denials. Seis capabilities
`identity.external_*` (sólo `efeonce_admin`), rutas admin `/api/admin/identity/external-access/**`, lane ecosystem
`GET /api/platform/ecosystem/identity/binding` para el gateway (TASK-1831) y cuatro señales `identity.external_binding.*`.
Smoke live `pnpm identity:external-access:smoke` verificó bind → grant → invite → accept → resolve → revoke contra PG real.
Estado: code complete, rollout pendiente (deploy + señales en `/admin/operations`).
Barrido documental del mismo día: skills `efeonce-mcp-platform`/`seo-aeo-practice`/`talent`/`growth-cro` (+ espejos), regla
`.claude/rules/identity-external-access.md`, AGENTS.md, docs de API (OpenAPI + referencia), 18 docs de arquitectura y 10
manuales/docs funcionales: «fail-closed hasta TASK-1631» pasa a «hasta el emisor + gateway multi-issuer de EPIC-044; el grant
ya existe». Backfill de paridad `capabilities_registry` (11 capabilities ajenas).

## 2026-09-04 — TASK-1828: runtime del authorization server propio desplegado en staging y publicado en el front door del gateway

Slices 0–2 de `TASK-1828` (EPIC-044): llave ES256 con protección **HSM** en Cloud KMS (`auth-server-es256`, versión 1
activa) y SA `auth-server@` con permiso de firma sólo sobre esa llave; schema `greenhouse_auth` (`signing_keys` con una
sola `active` por índice parcial + `signing_key_events` append-only) aplicado; `src/lib/auth-server/keys` (firma vía
KMS con CRC32C, DER→JOSE, `kid` RFC 7638, verificación local obligatoria, rotación `active→retiring→retired`) con token
real firmado por el HSM y verificado con el JWKS servido desde PG; `services/auth-server` (node:http, `/healthz`,
`/readyz`, `/.well-known/jwks.json`, Host allowlist) desplegado en Cloud Run `us-east4` con `AUTH_SERVER_ENABLED=false`;
`Auth Server Deploy` registrado en `RELEASE_DEPLOY_WORKFLOWS` y cableado en `production-release.yml`; host
`auth.efeonce.org` publicado como segundo host del LB del gateway (`efeonce-mcp` `6a144a5`: 3 recursos nuevos, 2
in-place, 0 destruidos; `mcp.efeonce.org` intacto); señales `auth.issuer.jwks_unreachable` y
`auth.signing_keys.lifecycle` en el control plane; runbook `docs/operations/runbooks/auth-server.md`. Producción del
emisor queda `code complete, rollout pendiente` (release control plane).

## 2026-09-03 — Globe: pausa reversible del reconciliador externo de tenancy

`ops-globe-tenancy-reconcile` (`efeonce-group/us-east4`) quedó `PAUSED` a las 22:26:05Z, sin eliminar su
definición ni modificar cron, destino o identidad. Deja de programar llamadas hacia Globe con SQL detenido.
`services/ops-worker/deploy.sh` declara la pausa deseada localmente; sin commit/push/deploy en esta ejecución,
la protección frente a futuros despliegues aún requiere promoción. Reinicio y sincronización source/runtime:
[runbook](docs/operations/creative-studio/GLOBE_DEEP_HIBERNATION_RUNBOOK_V1.md).
TASK-1807 sigue abierta; ahorro posterior al corte pendiente de Billing Export.

## 2026-09-03 — EPIC-044: authorization server propio de Efeonce (ADR aceptado) y siete tasks nuevas

Decisión del operador: Efeonce construye y opera su propio authorization server en `auth.efeonce.org`; no se compra
un IdP. Nuevo ADR `EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md` (Accepted) supersede la composición WorkOS del
ADR de federación y conserva sus invariantes, binding y contrato del gateway. `EPIC-044` (`in-progress`) agrupa
TASK-1626/1631/1813 y crea TASK-1828 (runtime Cloud Run + front door + KMS HSM + JWKS), TASK-1829 (metadata, CIMD, DCR
compat, PKCE, tokens ES256, refresh, revocación, consentimiento), TASK-1830 (passkeys, magic link, TOTP, recuperación),
TASK-1831 (gateway multi-issuer `AuthContext`), TASK-1832 (canaries + primera cohorte), TASK-1833 (red-team, pentest,
rotación, runbooks, privacidad V2) y TASK-1834 (convergencia del login cliente). `TASK-1631` re-alcanzada a binding/grants.
`DECISIONS_INDEX`, registries y READMEs sincronizados. Delta posterior el mismo día: el emisor se publica como segundo host
del front door del gateway (sin LB ni Armor nuevos, ≈ USD 15/mes adicionales medidos contra el billing export) —
ADR §Delta 2026-09-03 y TASK-1828 actualizados.

## 2026-09-03 — TASK-1349: un `identity_only` ejecutado no es hecho de salida; purga de sujetos sintéticos (PR #220)

Incidente «colaboradores fantasma» ~17:50Z: la pre-nómina de septiembre mostró seis `Colaborador <uuid>` «sin
contrato» — sujetos sintéticos de `review-execute.live.test.ts`, inactivos con compensación abierta, admitidos por el
roster relajado de Slice 2 y rescatados por `hasDecidedExitFact`, que contaba su caso `identity_only` ejecutado como
salida decidida. Fix `0233f81e7` (`policy.ts` exige lane ≠ `identity_only`; `policy.test.ts`; el live test cierra
compensación y desactiva en `afterAll`), en producción con PR #220 (`a824d073a`, manifest released 19:30:49Z). Datos:
9 compensaciones cerradas con `closeCompensationVigencyAtExit`; 18:37Z purga de los 12 sujetos (253 filas,
`scripts/workforce/purge-task1349-live-subjects.sql`, predicado sintético explícito; 265→253 members, 0 reales).
Docs: `LIVE_TESTS_AGENT_INVARIANTS.md` §3 (nunca dejar compensación abierta en un sujeto sintético),
`PAYROLL_WORKFORCE_AGENT_INVARIANTS.md`, decisión (2) en `GREENHOUSE_WORKFORCE_EXIT_PAYROLL_ELIGIBILITY_V1.md`,
runbook `offboarding-recovery.md` (readback previo por sujeto, lección Valentina; harness vs commands por `tsx`).

## 2026-09-03 — Contratos y skills de reingreso sincronizados

Arquitectura, invariantes, manuales, documentación funcional y runbooks reflejan compensación bruta/snapshots,
proporcionales autorizados, identidad longitudinal, recuperación transaccional y verificación de consumidores.
Skills de Payroll, Talent, Finance, Release, QA y arquitectura actualizadas para Codex/Claude; nuevo espejo
Finance con gate. Tareas e índices ya no prescriben restaurar Valentina por SQL ni presentan la guarda como
pendiente de deploy. [Cobertura documental](docs/audits/payroll/VALENTINA_DOCUMENTATION_SKILLS_CLOSURE_2026-09-03.md).
Sin nuevas mutaciones de datos, flags o release. Prorrateo automático, resolución de ID público en off-cycle,
UI TASK-1814 y bug de correlación de releases conservan su condición pendiente.

## 2026-09-03 — Corrección de reingreso y recuperación de disponibilidad

Las actualizaciones de member confirman identidad y auditoría de forma transaccional; la proyección legal no reabre relaciones terminadas. Recovery y detector comparten vigencia real de episodios. Comando compensatorio con preview, hash de estado e idempotencia sustituye el SQL puntual. [Decisión y contrato](docs/architecture/GREENHOUSE_WORKFORCE_REENTRY_RECOVERY_DECISION_V1.md). Vercel Production y worker corregidos verificados; Valentina restaurada 18:38:48Z, contratos/pagos/usuario intactos. Proyecciones People completadas 18:42:05Z sin reabrir employee ni alterar datos protegidos. Release `33795564223` cerrado, manifest released 19:30:49Z, health success y watchdog ok; readback final intacto.

## 2026-09-03 — TASK-1349 en producción (release `62356c9b7fd4`) — revisión contractual de offboarding, elegibilidad por episodio y writeback de lifecycle

Cierre operativo posterior: Maggie y María Fernanda revisadas como despido y ejecutadas con fechas 29/06 y
29/07; reader 4/4, unresolved=0 y nómina agosto lista. Runbook, manual, documentación funcional y skills
Payroll/Talent Codex/Claude distinguen casos manuales del recovery SCIM y cierre de conciliación Finance.
[Evidencia y método](docs/audits/payroll/MAGGIE_MARIA_FERNANDA_OFFBOARDING_CLOSURE_2026-09-03.md).

Cierra el circuito SCIM → decisión → nómina → lifecycle que la auditoría del 03/09 encontró incompleto (ISSUE-117,
near miss del 06/07). Nómina: el resolver de elegibilidad elige el caso gobernante por relevancia temporal, sirve
`contract_type_snapshot` (el threshold `international_internal` era inalcanzable), detecta reingresos y deja de tratar
`members.active=false` como filtro histórico (un inactivo con salida el 02/06 conserva mayo íntegro); una salida sin
resolver relevante al período mantiene al colaborador proyectado pero **bloquea calcular/aprobar** (readiness
`unresolved_exit_signal`, `calculatePayroll` 409) y una falla del resolver ya no incluye a todos en silencio.
Offboarding: command `reviewOffboardingCase` (`access_only` | `relationship_ended`, causal y fechas explícitas,
`expectedUpdatedAt`, audit + outbox), guard «sin revisión no se aprueba» en el state machine, executor lane-aware
(solo acceso no toca compensación/relación/member; término real termina relación con fecha real y desactiva member
detrás de `WORKFORCE_OFFBOARDING_MEMBER_DEACTIVATION_ENABLED`, OFF), proyecciones honestas en la cola, tres señales
nuevas, guards de ownership en SCIM y backfill BQ, capability `workforce.offboarding.review_case` (seed aplicado),
rutas HR + carril `app`, y `pnpm workforce:offboarding:recovery` (dry-run ejecutado sobre la cohorte real; nada
aplicado). Tras el release la nómina de septiembre bloqueará hasta resolver Felipe y Maria Fernanda: es el control
buscado. **Rollout 2026-09-03:** PR #219 squash, orquestador `33779259694` `released` 16:45Z, `WORKFORCE_OFFBOARDING_MEMBER_DEACTIVATION_ENABLED`
ON en Production+staging tras live smoke sintético (`review-execute.live.test.ts`). Pendiente del operador: recovery
por allowlist (bloqueada al agente por permisos), causal de Felipe, conciliación Finance, UI TASK-1814.

## 2026-09-03 — TASK-1806 seguimiento: alerta Teams determinista para drift de metodología ETV

Nuevo cron `ops-seo-etv-drift-watch` (Cloud Scheduler, diario 12:00 America/Santiago, sin flag) en el
ops-worker: lee la señal existente `seo.etv_methodology.drift` y avisa a Microsoft Teams sólo si
`severity=error`, vía el dispatcher determinista `sendManualTeamsAnnouncement` y un destino nuevo
`growth-seo-reliability-alerts` (mismo canal "EO - Admin" que `production-release-alerts`). Antes,
la única forma de enterarse era abrir `/admin/operations`. Verificado en vivo (rev `ops-worker-00637-2ww`):
respondió `warning`/`alerted:false`, correcto para el estado actual de la señal.

## 2026-09-03 — TASK-1806: Improved ETV de DataForSEO en producción (rebaseline versionado)

Release `bda12be7e33a` (PR #218, orquestador `33758619690`, manifest `released` 13:14Z, watchdog `ok`). El módulo
SEO sirve desde hoy `improved_layout_clickstream_v2` en los siete caminos consumidores: ops-worker (`deploy.sh`,
rev `00636-h6w`) y Vercel Production+staging con ambos selectores en improved; canary de contrato 13:15:26Z sobre
los lanes de Berel. Antes: contract de schema ETV aplicado (`20260903103858964`), shadow `exact_ab` de 26 requests
(USD 1,095) evaluado contra Search Console — improved 6× mejor calibrado en Berel (err. rel. 49 % vs 321 %),
Jaccard 1,0 en páginas/subdominios, historia continua —, memo de decisión y aprobación del operador; drill de
rollback en staging; rebaseline acotado (historia improved de Berel y Comex, USD 0,2568). Las cifras de tráfico
estimado bajan ≈ 60 % por cambio de fórmula del proveedor, no por pérdida real; cada cifra declara `etvMethodology`.
Efeonce se mide aparte de los clientes (guard de organización en celdas bulk). Writers `rowsWritten` ahora cuentan
filas insertadas. Legacy sólo vuelve como rollback antes del corte 2026-11-01T00:00:00Z.

## 2026-09-03 — Berel: cobertura por negocio, skills sincronizadas y minería trazable

Decisión local del operador 2026-09-02: fortalecer elección, protección y aplicación, manteniendo color
y paletas. [Estrategia](docs/operations/BEREL_EDITORIAL_COVERAGE_STRATEGY_V1.md), inventario de 49 cuerpos,
modelo/brief/manual/funcional y skills espejo Berel/SEO-AEO/DataForSEO actualizados; Playbook Notion
ampliado y releído. [Discovery](docs/audits/seo/BEREL_CAPILLARY_KEYWORD_MINING_2026-09-02.md):
14 runs Labs, 1.517 keywords distintas, 13 SERPs y 52 PAA; costo reportado US$1,23572.
Mapa propuesto de 27 intenciones, no 27 artículos aprobados. No tracking, calendario, CMS ni release.
Ampliación 2026-09-03: skill Berel y espejos incorporan completitud técnica por macropaso, correcciones
acotadas y conciliación de producto; se retira la inferencia «campo CMS vacío = tiempo inexistente».
Control técnico y caso Berelex Semibrillante en módulos 12/13; N29 corregido en Notion, artes y
derivados pendientes, sin publicación. Evidencia: [QA de guardrails](docs/audits/seo/BEREL_TUTORIAL_GUARDRAILS_2026-09-03.md).
Clasificación de piezas: 51 tareas corregidas y releídas; la skill exige tipo/canal/formato
y excluye principales del conteo visual. [Auditoría y límites](docs/audits/seo/BEREL_PIECE_COUNT_CLASSIFICATION_2026-09-03.md).
Tipo/canal obligatorios desde la creación de cada tarea visual, incluidos bloqueados; requisitos y
checklists explícitos en banners, sociales y fotos. Se mantiene el esquema y la agrupación existentes.
Distribución: cuatro opciones, no cuatro derivados obligatorios; módulo 15 y matrices por artículo.
Playbooks Social/Producción en Notion alineados, Instagram Story corregido, contrato 8 artículos
de 3.000–5.000 palabras/50 gráficas/3 videos y cortesía extendida a nov/dic registrados. Octubre
excluido. Aclaración: 50 incluyen blog/RRSS; Blog/Facebook/Instagram/Pinterest. Priorización N52→Navidad
aprobada: 4 banners N52 fuera del paquete, 4 banners y 2 sociales N59 creados. Distribución 50 gráficas
+ 3 videos por mes, con reservas técnicas/editoriales; 193 páginas modificadas releídas, sin pérdida de historial.

Corrección de numeración verificada: [mapa por ID y readback 179/179](docs/audits/seo/BEREL_EDITORIAL_NUMBERING_2026-09-03.md).
Skill Berel módulo 16: bloques mensuales completos, reserva de slots, cambios coordinados y aliases
de archivos; no numerar por orden de trabajo. Se preserva el corte histórico descrito arriba.
Complemento de `1fcc2ade3`: metodología de research SEO/AEO y DataForSEO versionada con su referencia
canónica de minería, gate de espejos y documentación de priorización/brief/operación; sin cambios runtime.

## 2026-09-03 — TASK-1805 en producción: foundation ETV versionada desplegada, selección legacy explícita

Release `5ec4cf769977` (run `33698245254`): readers/lane/MCP sirven `etvMethodology`, señal `seo.etv_methodology.drift`,
readback del selector en `/health` del ops-worker, selectores `legacy_static_v1` explícitos en Vercel y worker,
gateway sincronizado. Canary de contrato en producción verde. Contract de schema parqueado con condición de 7 días
(precondición de `TASK-1806`). Improved ETV no activado.

## 2026-09-02 — TASK-1805: la fórmula detrás de `etv` pasa a ser identidad del hecho (foundation, todavía legacy)

DataForSEO cambia el cálculo de `etv` bajo el mismo campo y corta legacy el `2026-11-01T00:00:00Z` sin exponer
versión. Greenhouse deja de depender del default: una policy pura endpoint-aware construye `use_improved_etv`
explícito por request (falla cerrado ante familia ignorada/no habilitada, config inválida o legacy desde el
corte), las tres tablas ETV ganan versión + evidencia + instante UTC + policy (expand aplicado; filas previas
`legacy_static_v1` por contrato, nunca por fecha; guard de corte en la base), los siete caminos consumidores la
persisten, readers/API/MCP sirven UNA fórmula con `etvMethodology` y `not_available_for_method`, la señal
`seo.etv_methodology.drift` compara configurado vs solicitado en Vercel y ops-worker, y un evaluador
dry-run/replay compara valor, membresía del top-N, traffic cost y prospecto sin gastar. Contract de schema
parqueado hasta el release. Estado: code complete, rollout pendiente; Improved ETV NO activado (`TASK-1806`).

## 2026-09-02 — DCR deprecado en MCP `2026-07-28`: el shim del gateway se queda, pero deja de ser el futuro

La revisión Current del protocolo marcó Dynamic Client Registration como `Deprecated` (PR #2858),
migración a Client ID Metadata Documents, retiro más temprano en la primera revisión publicada en o
después de 2027-07-28. El shim se mantiene porque la excepción está redactada para nuestro caso exacto:
DCR se retiene *"for backwards compatibility with authorization servers that do not support Client ID
Metadata Documents"*, y Entra no soporta ninguno de los dos — su única vía oficial es el pre-registro,
que es justo lo que `POST /register` devuelve.

Lo que cierra la pregunta de fondo: **CIMD no es implementable en la capa del shim.** Es capacidad del
authorization server, el AS es Entra, y el gateway espeja `authorize`/`token` en lugar de proxearlos;
soportarlo exige emitir los tokens, o sea el broker que `TASK-1631` ya está eligiendo con CIMD entre sus
requisitos. No hay task paralela que abrir.

En el camino aparecieron tres cosas que la evaluación no buscaba. La misma revisión agregó texto que no
existía en `2025-11-25` —el `issuer` de la metadata debe ser idéntico al identificador con que se
construyó la well-known URL— y los nuestros difieren desde que el shim existe; funciona sólo porque los
clientes todavía no lo aplican. El `client_id` estático compartido, con `http://localhost` sin puerto
entre sus redirect URIs y el consentimiento cacheado por Entra, reproduce la forma del confused deputy
aunque la letra del `MUST` no ate: lo acota que ese cliente no lleve scopes de escritura, una regla
escrita por otra razón que resulta ser la que limita el daño a lectura. Y esa misma aplicación se llama
"Local Canary Client" cuando es el cliente compartido de producción, de modo que quien la audite por el
nombre concluirá lo contrario de lo que debe.

El horizonte del shim no lo fija el calendario de la spec sino el día que un cliente endurezca
cualquiera de las dos validaciones. Para ese día queda declarado un plan B de pre-registro puro que no
toca Entra ni el modelo de tokens.

## 2026-09-02 — un release quedó huérfano en `main` y se recuperó sin ensuciar el control plane

La promoción `develop→main` (PR #215, 726 archivos, 1490 commits, 2 migraciones) entró a `main` a las
`20:51:04Z` y quedó **sin manifest**: la sesión que la promovía fue archivada por accidente antes de dispatchar
el orquestador. Otra sesión la retomó con autorización directa del operador y cerró el ciclo: run `33683893124`
completed/success en 11m50s, `release_id` `375f56e24187-546f452b-c60f-4617-9974-9c87760c3ab9`, estado final
`released`, con los dos gates `production` aprobados en 34 s y post-release health verde.

Tres verificaciones que no se dieron por hechas. El skip del `ops-worker` (51 s, step `Deploy` en `skipped`) se
validó con el **diff de árbol completo** y con `pnpm worker:deploy-path-gate` —1451 archivos del bundle, todos
cubiertos; `src/mcp` no entra, lo sirve Vercel—, no con la lista del change-gate. El `data_missing=4` del
watchdog se trató como falta de evidencia y no como drift: la lectura autoritativa fue `pnpm release:workers`,
3/4 workers en el target. Y el canary de contrato del lane MCP `skills` se corrió **después** del `released`,
con asserts que sólo el contrato nuevo puede producir.

Flags: `GROWTH_SEO_SITE_FINDINGS_ENABLED` prendido en el ops-worker con los dos pasos, tras probar **por blob**
que el evaluador desplegado es idéntico al de `main`. `HIRING_FAIRNESS_MONITOR_ENABLED` NO se prendió: daría
cero en silencio en una métrica de equidad hasta que cierre `TASK-1365`.

## 2026-09-02 — la práctica Salesforce se canoniza como oferta por outcomes y lifecycle

La práctica Revenue Operations & CRM incorpora una arquitectura comercial Salesforce en cuatro fases:
Diagnose & Architect, Implement & Integrate, Activate & Adopt y Operate & Evolve. El contrato separa CRM core,
Marketing Cloud Engagement y Marketing Cloud Next; define carriles de solución, ICP/anti-ICP, operator y buying
group, delivery, métricas, límites de claims y gates de madurez. El estado queda `Approved for validation`: no
autoriza todavía partnership, badge, certificaciones, reventa, pricing, casos ni Product Service comercialmente
aprobado sin evidencia y sign-offs propios.

## 2026-09-02 — MCP: el manual de uso viaja por el protocolo (TASK-1804, released)

La superficie MCP gana un segundo canal de conocimiento de uso: un manifiesto de manuales
(`skill-manifest.ts`) hermano del de tools, tres `SKILL.md` publicables en `docs/mcp/skills/`
(`seo-spend-discipline`, `seo-visibility-reading`, `competitor-loop`), la tool `get_greenhouse_skill`,
el recurso `skill://efeonce/<name>/SKILL.md` y la lane ecosystem `GET /api/platform/ecosystem/mcp/skills[/{name}]`,
todos sobre el mismo reader. Los cuerpos viajan en el bundle como artefacto generado (`pnpm mcp:skills:generate`
/ `mcp:skills:check`): leerlos del filesystem exigía `outputFileTracingIncludes` y Vercel rechazó el build (función sola
de 397 MB). Publicar es un acto explícito (drift manifiesto↔filesystem no construye el
servidor), un binding de cliente no sabe que los manuales existen (404 anti-oráculo) y la fuga de contenido
interno la controla un test. Las `instructions` del handshake rutean al manual en vez de contener el
procedimiento de gasto. El gateway federa la tool con su propio guard de paridad no-SEO (desplegado,
`efeonce-mcp-gateway-00028-pmx`) y la lane salió a producción en el release `375f56e24` del mismo día, con canary de
contrato verde contra producción. Sin Entra, flag ni persistencia nuevos. Follow-up del mismo día: un agente Claude Code
real cargó el manual por el front door OAuth, y el catálogo creció a seis manuales (discovery→tracking, salud técnica,
diagnóstico de prospecto) sin tocar la tool ni el gateway; los seis salieron a producción en el segundo release del día
(`4379c495013f`) con canary de contrato verde. Barrido documental posterior por subagentes: manuales de uso del
inventario MCP/gateway/provider SEO, docs funcionales de API Platform y gateway, deltas en arquitectura API/ADR del
gateway/patrones canónicos/arquitectura SEO, skills `dataforseo-operator` y `seo-aeo-practice`, y README/AGENTS del
repo `efeonce-mcp`.

## 2026-09-02 — ANAM: entrega premium de Emma y soporte explícito de tres meses

Se consolidó el cierre de la landing, identidad y handoff de Emma en dos PDF de cinco páginas: una especificación
técnica y una guía funcional. Los HTML/CSS son la fuente editable; los PDF, el master para cliente. Se revisaron
diez páginas rasterizadas, fuentes Poppins/Geist embebidas, composición, overflow y pies con sitio, correo,
teléfono y dirección. La captura final de la landing quedó versionada y los borradores Word supersedidos fueron
excluidos del paquete.

El borrador de correo para Óscar, María Paz, Pablo y Marco explica los cambios de landing e identidad, la matriz
de routing y el límite de las pruebas E2E. Quedó listo, no enviado. También registra el SharePoint consolidado
como compromiso pendiente para esta semana.

La documentación y las skills espejo ahora fijan el soporte de Customer Agent y KPI en tres meses, del
2026-08-13 al 2026-11-12 inclusive. Soporte cubre el alcance construido; nuevas funcionalidades, KPI, workflows,
automatizaciones, integraciones, rediseños e innovación requieren un alcance separado. No se cambió runtime
HubSpot, no se envió correo, no se creó SharePoint y no se hizo push.

## 2026-09-02 — La superficie MCP del módulo SEO pasa a tener eval de selección

TASK-1784 agregó un fixture de 55 preguntas de operador en los cinco mercados productivos y un runner que mide
tres precisiones que nunca se promedian: qué tool se elige, qué mercado se pasa y si se llamó a una tool que
gasta cuando no correspondía. Baseline registrado antes de tocar una descripción: tool 94.5%, mercado 98.2%,
gasto 100%.

El resultado contradijo la hipótesis con la que se escribió la task: agregar bloques de ruteo a las
descripciones NO mejoró la selección de tool, y en una variante degradó una tool que nadie había tocado. Lo que
sí funcionó fue corregir dos afirmaciones falsas — la cláusula de mercado ordenaba elegir un país en vez de
preguntar, y la lente dual reclamaba prioridad sin acotarla. La precisión de mercado llegó a 100%, cerrando la
elección silenciosa que costó un año de mediciones contra el país equivocado en ISSUE-152; la de tool bajó a
92.7% y se reporta sin declarar mejora.

El gate de CI mide cobertura del fixture, no precisión: una tool SEO nueva sin caso rompe el build. El guard de
paridad del gateway ahora compara la descripción, y al conectarlo encontró 21 de 27 tools federadas divergentes;
se cerró haciendo que el gateway derive el texto del artefacto en vez de mantener una copia. El redeploy de
`mcp.efeonce.org` queda pendiente.

## 2026-09-02 — Globe entra en hibernación profunda reversible

TASK-1807 incorporó una state machine Terraform `active | draining | hibernated`. Globe quedó en
`hibernated`: tres schedulers pausados, vías productivas cerradas, Cloud Run en scale-to-zero y Cloud SQL
`STOPPED/NEVER`; datos, backups/PITR, buckets, secretos, imágenes, identidades, front door, budgets y
observabilidad permanecen intactos. Los applies finales tuvieron cero deletes/replacements y el post-plan quedó
sin drift.

El runbook nuevo documenta el gate anti-borrado, todos los inputs de preservación, la secuencia segura de apagado
y encendido, los readbacks, rollback, monitoreo y medición de costo. El baseline era ~CLP 348.152/30 días y la
reducción modelada es CLP 318.000–328.000; el ahorro realizado queda pendiente de Billing Export a 24 horas,
7 días y cierre mensual.

Se sincronizaron los índices, arquitectura de persistencia, runbooks IaC/rollout/promoción, ledger de modelos,
plan TASK-1807 y prompt de sesiones nuevas. Las skills `greenhouse-globe` y `greenhouse-globe-model-fleet`
quedaron espejadas Codex/Claude con una compuerta que impide gasto o reactivación implícita.

## 2026-09-02 — tools y skills MCP pasan a ser Definition of Done de toda la secuencia ETV

TASK-1805/1806, TASK-1312/1313/1314 y TASK-1808–1811 exigen ahora crear o actualizar su tool MCP, lane,
manifiesto, federación y skill operativa en el mismo PR. Una tool existente se amplía en vez de duplicarse y toda
ausencia del gateway debe ser una exclusión razonada. Las lecturas no compran al proveedor durante el read; writes
y gasto conservan confirmación, capability fina y scope fail-closed. No cambió runtime: son criterios de ejecución
y cierre para trabajo futuro.

## 2026-09-02 — las cinco familias Labs restantes ya tienen ownership ejecutable

El backlog de Growth SEO incorpora `TASK-1808`–`TASK-1811`: categorías y mercado temático, competidores SERP por
keyword set, comparación entre páginas e historia bulk de cohortes. Las dos direcciones de categorías viven en
una task porque forman una sola capacidad dominio↔categoría; los demás endpoints conservan grano, costo y lifecycle
propios. Las cuatro tasks dependen de `TASK-1805/1806` y no habilitan llamadas por estar registradas.

Los contratos existentes ahora aclaran que DataForSEO sólo aporta evidencia para topic clusters, que
`TASK-1314` compone sin capturar y que las menciones históricas de `serp_competitors`/`page_intersection` no eran
callers reales. No cambió runtime, schema, gasto, flags ni deploy.

## 2026-09-02 — Improved ETV pasa de anuncio a contrato operativo

DataForSEO confirmó 14 familias ETV-capable, alcance sobre todos los ETV/traffic cost, precio sin premium,
históricos fully recomputed desde julio de 2026 y calibrados antes, y corte irreversible
`2026-11-01T00:00:00Z`. La arquitectura, auditoría, runbook, tasks y skills ahora distinguen 14 familias del
proveedor, nueve callers y seis familias/siete caminos consumidores; reemplazan el método «servido» no observable
por método efectivo derivado. `TASK-1806` pasa a P0 deadline-bound. No cambió runtime.

## 2026-09-01 — Emma enruta cotización, seguimiento y Calidad al equipo correcto

El handoff del Customer Agent ANAM dejó de depender de una única propietaria. El workflow activo `1876744588`
clasifica el ticket, elimina a Emma como owner y aplica la matriz Pablo → María Paz para cotización, Marco → Pablo
para seguimiento y María Paz → Marco para Calidad/facturación/otros, respetando disponibilidad. Tres chats públicos
E2E aprobaron las rutas de cotización y Calidad y el fallback real de seguimiento; el primer probe fallido permitió
corregir el owner previo y el sesgo de marcadores QA antes de dejar el flujo conectado.

El canon reusable distingue el trigger del Customer Agent, la asignación por workflow y la reasignación manual
entre personas. También registra el límite de evidencia: el owner visible quedó probado, pero la respuesta humana
y una segunda transferencia en el mismo chat abierto requieren una prueba operativa separada.

## 2026-09-01 — El Customer Agent de ANAM ya sabe que se llama Emma

El perfil y las directrices publicadas del Customer Agent en el portal ANAM `19893546` quedaron alineados con la
landing: nombre `Emma`, preview `Hola, soy Emma.` y saludo `Soy Emma, de ANAM`. El readback confirmó cero
borradores. No cambiaron personalidad, conocimiento, permisos, acciones, routing, handoff, canales ni datos CRM,
y no se envió una conversación real. Dos advertencias anteriores sobre `Registraré tu consulta` quedaron
documentadas para un cambio conversacional separado.

## 2026-09-01 — Emma convierte la landing ANAM en un concierge digital

La landing de atención de ANAM reemplazó al personaje masculino por Emma y reconstruyó la primera pantalla como
una experiencia editorial premium: narrativa clara, selector unificado de tres intenciones, un único CTA y un
panel de confianza integrado con la asistente. La selección prepara el contexto y no abre el chat hasta que la
persona pulsa `Conversar con Emma`.

El build HubSpot CMS React `#28` está desplegado en el portal ANAM `19893546`. El header usa el logo horizontal
del catálogo del repo, sin el círculo superior, y el recurso decorativo queda recortado dentro del hero para no
dejar espacio blanco bajo el footer. La verificación desktop y móvil confirmó HTTP 200, margen del body en cero,
ausencia de overflow, selección por clic y teclado, transferencia del intent al CTA y cero errores de consola,
página o red. Emma usa ahora un asset generativo versionado cuyo bordado dice correctamente
`ANÁLISIS AMBIENTALES S.A.`; se descartó el montaje tipográfico plano y se conservó el asset anterior para
rollback. No se abrió ni se envió una conversación real; tampoco cambiaron el Customer Agent ni datos CRM.

El cierre documental quedó reflejado en el canon y runbook CMS, documentación funcional, manual operativo,
dirección visual, changelog de cliente, `project_context.md` y las dos copias espejadas de la skill
`hubspot-as-a-service`. No se modificaron el router global ni la arquitectura comercial porque no cambió ningún
contrato transversal.

## 2026-09-01 — La auditoría gana una sección para lo que vale en todo el sitio (TASK-1671)

La pantalla de auditoría separa dos preguntas que antes mezclaba. Arriba, una sección nueva
—"Acceso y presentación del sitio"— responde si los motores de IA pueden leer el sitio, si la
portada se presenta y si el mapa del sitio está sano. Abajo, la lista de siempre, ahora rotulada
como lo que es: problemas **por página**.

La distinción importa porque cada hallazgo de la sección nueva vale para el dominio entero. En la
lista se habrían rotulado como "1 página afectada" —falso— y habrían quedado hundidos debajo de
cualquier problema menor que toque muchas páginas. Ahora dicen "Todo el sitio" y nombran dónde se
detectó el problema, para que el cliente pueda verificarlo en vez de concluir que el informe miente.

Y el bloqueo de entrenamiento de modelos de IA no se pinta como una falla: lleva la etiqueta
"Decisión declarada", porque es una decisión legítima sobre el uso del contenido.

🔴 **Sigue apagado.** El código existe pero no está desplegado, y el interruptor tampoco está
encendido. Hasta que las dos cosas pasen, un sitio invisible para los motores de IA **sigue**
saliendo con 95 de salud.

## 2026-09-01 — El audit SEO aprende a mirar el sitio, no sólo sus páginas (TASK-1670)

La auditoría técnica pasa a evaluar cuatro cosas que el crawl de páginas no ve: si el `robots.txt`
le niega el paso a los rastreadores de IA, si el servidor o el CDN los rechaza aunque el `robots.txt`
los permita, si la portada publica datos estructurados y si el mapa del sitio está sano.

La distinción que hace creíble al informe: bloquear el rastreo que **cita** el sitio en una respuesta
de IA es crítico, mientras que bloquear el que **entrena** modelos es una decisión de derechos sobre
el contenido y se reporta como información, nunca como falla. Meterlos en la misma bolsa haría que un
sitio perfectamente accesible saliera en rojo, y eso enseña a ignorar la alerta más importante.

🔴 **Todavía no está encendido.** La capacidad viaja apagada detrás de un flag, porque estos
hallazgos son del dominio completo y la pantalla actual los contaría como "1 página afectada". Hasta
que esa superficie exista (`TASK-1671`), un sitio invisible para los motores de IA **sigue** saliendo
con 95 de salud. El estado real es `code complete, rollout pendiente`.

## 2026-09-01 — Brand Visibility Grader queda disponible en Recursos

El menú principal de `efeoncepro.com` ahora incluye **Brand Visibility Grader** dentro de
`Recursos`, enlazado a `https://think.efeoncepro.com/brand-visibility`. La actualización reutiliza la
navegación nativa de Ohio; no crea una segunda cabecera ni modifica Elementor. Los 26 ítems previos
conservaron membresía, jerarquía y orden persistido, y el nuevo ítem quedó respaldado con snapshot
recuperable.

Después de purgar WordPress/Kinsta, el submenú y el clic se verificaron en producción a 1440 px y
390 px. El destino respondió 200 y ambas vistas quedaron sin overflow horizontal ni errores de
consola.

## 2026-09-01 — TASK-1807 instala los primeros controles FinOps de GCP

Producer corre cada cinco minutos mediante Terraform y permanece bajo observación antes de tocar Media. Dos
budgets nativos alert-only quedaron activos en CLP: 250.000 para Globe y 370.000 consolidados, con cuatro umbrales
de gasto actual y dos de forecast. El lector Greenhouse usa costo neto después de créditos y el watcher deduplica
por incidente estable; su prueba dry-run no consulta persistencia ni envía mensajes.

Globe agregó cuatro labels de atribución a 33 recursos. Artifact Registry, con 418 versiones y 10,4 GB, tiene una
cleanup policy en dry-run que conserva 10 versiones por paquete y sólo simula borrar versiones de más de 30 días;
no hubo eliminación. Asset Governance fue publicado y desplegado por digest inmutable para converger hasta cuatro
stages fenced en una ejecución. El smoke live quedó sano pero no-op, así que conserva cron minutely hasta un canary
con asset real. El post-plan no presenta drift y Greenhouse sigue local, sin publicación.

## 2026-09-01 — cinco licitaciones nuevas entran a HubSpot por MCP

Promoción manual confirmada y verificada de Chile Cultura, Universidad de Chile DII, JUNJI, Temuco y CNTV: cinco
Deals nuevos en `Pipeline de ventas` / `Calificado para comprar`, con ambas llaves de deduplicación, fechas,
modalidad, próximo paso y asociación a Company. Se reutilizaron tres Companies canónicas y se crearon únicamente
las dos ausentes, Temuco y CNTV; no se inventaron contactos. CNTV quedó clasificada como `Strategic Bets`, propiedad
de movimiento comercial separada del stage.

Las skills HubSpot espejadas dejaron de contradecir el contrato ya vigente en el companion LicitaLAB y
`project_context.md`: el MCP de HubSpot es un writer válido para cargas manuales bajo confirmación y readback; el
bridge queda como carril de automatización y su cobertura incompleta no bloquea ese flujo. Los registros comercial
y de licitaciones quedaron sincronizados con los IDs observados. No hubo postulación ni envío de propuesta.

## 2026-09-01 — el registro del avance entra a los checklists de cierre

`stale-progress` existía pero ningún protocolo mandaba correrlo. Los checklists de cierre de
`CLAUDE.md` y `AGENTS.md` ahora exigen tildar los acceptance criteria con evidencia, dejar sin
tildar y con razón lo que no se verificó, poner `Status real` al día y correr
`pnpm task:lint --task TASK-###` antes de mover a `complete/`.

`ui-flow-contract` deja de romper el gate cuando una task de `to-do/` aparece en el diff sin ser el
foco: misma calibración que `ui-wireframe-contract`, con test falsable. El footer de `flags:audit`
deja de llamar «verdad live» a `vercel env ls` (que sólo dice que la variable existe) y nombra
`vercel env pull`.

Barrido de coherencia sobre los 19 cierres del día: `Lifecycle` desincronizado, 5 rutas stale en los
índices, 9 estados falsos en el README de tasks, conteos y prosa stale en cinco epics y en
`AEO_PROGRAM_STATUS.md`, 10 archivos con rutas rotas y cuatro reglas duras apoyadas en hechos ya
falsos.

## 2026-09-01 — el CTA gana foco y salida por teclado, y `Escape` deja de mentirle al ledger

Bundle del renderer CTA **`1.2.0-preview.1` → `1.3.0`**. Minor y no patch: cambia comportamiento
observable, y `dismissed` deja de emitirse al cerrar por teclado — quien mida la tasa de rechazo
verá la serie cambiar de sentido en esta versión. `renderer_version` viaja en la telemetría, así que
el bump es lo único que después permite distinguir qué host corre el arreglo.

`ISSUE-167` resuelto (code complete, rollout pendiente). Primitive `attachDisclosureFocus`
(`src/growth-cta-renderer/disclosure-focus.ts`): al abrir el Growth Form desde un CTA el foco entra
al contenido y `Escape` cierra. Es disclosure, no modal, y `Escape` se escucha en el contenedor —
nunca en el documento, para no secuestrárselo a la página del host.

🔴 Cambio de comportamiento que importa al dato: **`Escape` COLAPSA el form al card y NO emite
`dismissed`**. `dismissed` significa «el visitante rechazó la oferta» y viaja al ledger de
conversión; cerrar un formulario abierto por curiosidad no es rechazar. El botón «✕ Ahora no» sigue
siendo el único rechazo.

Causa raíz: el foco y la salida por teclado estaban modelados por **placement** (`slide-in`) en vez
de por «superficie revelada», así que `embedded` no los heredaba.

## 2026-09-01 — el motor CTA cierra su primera rebanada, y deja un hueco de accesibilidad nombrado

`TASK-1427` complete. El steady-state se observó sobre **45 días** y no sobre los 7 que pedía el
criterio: la ventana literal de julio tuvo tráfico un solo día, así que sus ceros eran un falso
verde. Resultado sobre la serie real: 0 errores server-confirmed, 0 kill switches, 0 colisiones.

Los readers de `growth.cta.*` filtran `INTERVAL '1 day'`: responden «¿está sano ahora?», nunca
«¿estuvo steady durante N días?». Queda `scripts/growth/_sanity-cta-signal-window.ts` para esa
pregunta.

**`ISSUE-167` abierto:** al abrir el Growth Form desde un CTA el foco queda en `body` y `Escape` no
cierra — renderer compartido, afecta a todos los CTA en Think y WordPress.

## 2026-09-01 — el paso de registrar el avance entra a los seis checklists de cierre

Un mecanismo que avisa en un comando que ningún protocolo manda ejecutar está apagado. La regla
—tildar con evidencia, dejar sin tildar con razón, `Status real` al día, `pnpm task:lint --task`—
quedó en `CLAUDE.md`, `AGENTS.md`, el harness `implement-task`, `GREENHOUSE_OPERATING_LOOP_V1.md`,
`TASK_PROCESS.md` y el `greenhouse-documentation-governor`.

`TASK_PROCESS.md` documenta las calibraciones medidas de `stale-progress`/`stale-blocker`.
`TASK_UI_UX_ADDENDUM.md` documenta la severidad foco-vs-incidental de los gates de UI y el protocolo
de contrato retroactivo. El `greenhouse-qa-release-auditor` suma tres defectos de gate nuevos y la
regla de falsificar todo test contra su propio arreglo.

## 2026-09-01 — barrido `stale-progress`: el registro se pone al día en 16 tasks

12 de 16 dejaron de reportar el aviso. Ninguna cerró: ninguna estaba terminada. Se tildó solo lo que
la evidencia respalda y se dejó por escrito la razón de cada criterio sin tildar.

Tres defectos del propio detector, corregidos con test falsable: `stale-blocker` disparaba cuando el
campo decía `none` seguido de la explicación que nombra al blocker cerrado; `ui-flow-contract` rompía
el gate por deuda previa al tocar una task de `to-do` incidentalmente; y un commit de scope `docs`
contaba como implementación. Se documentó por qué NO se filtran los `TASK-###` entre paréntesis.

`TASK-1259` recibió wireframe y flow retroactivos, construidos desde el manual del runtime: estaba
`in-progress` con UI ya implementada en el repo de WordPress y sin contratos declarados.

## 2026-09-01 — DataForSEO ETV deja de ser una cifra sin versión

El anuncio de ETV improved fue contrastado con la documentación pública y con siete consumers Greenhouse.
Las skills DataForSEO/SEO, el dossier Labs, manuales y auditoría ahora distinguen legacy/improved,
`use_improved_etv` de `include_clickstream_data`, y prohíben interpretar el cambio de modelo como performance.
También se incorporó `dataforseo-operator` al gate de mirrors y se corrigieron sus pointers canónicos. No hubo
cambio de runtime. Se registraron el ADR formula-aware, `TASK-1805` para la foundation, `TASK-1806` para
evaluación/cutover, el runbook y un correo de diez preguntas en borrador/no enviado. El cutover queda bloqueado por
aclaración del proveedor, foundation completa, shadow aprobado y decisión histórica antes del default anunciado
para el 1-nov.
[Auditoría](docs/audits/seo/2026-09-01-dataforseo-improved-etv-impact.md).

## 2026-09-01 — TeamBot completa el ciclo mensual del Performance Report

Nexa publicó el resumen de agosto en `EO Team` con cuatro menciones verificadas y envió cuatro lecturas personales 1:1, todas auditadas como `succeeded`. El runbook, la arquitectura, el manual y las skills espejadas ahora exigen separar cifras de interpretación: volumen no prueba sobrecarga, los atrasos heredados se contextualizan y una muestra de onboarding no se presenta como tendencia. También fijan la jerarquía de evidencia para menciones y el uso de Object ID Entra revalidado cuando un correo escrito contiene un typo. [Evidencia y límites](docs/audits/communications/2026-09-01-performance-report-teambot.md).

## 2026-09-01 — 15 cierres del barrido y dos defectos de task:lint corregidos

Quedaron `complete` con evidencia por criterio: 1036, 1040, 1090, 1113, 1209, 1210, 1225, 1253, 1282,
1321, 1330, 1335, 1430, 1431 y 1747. Desbloqueadas 1246, 1254, 1255 y 1336.

`TASK-1078` NO se cerró pese a estar desplegada: es UI sin `Wireframe:` declarado y no se le inventa
uno para pasar el gate. Queda como decisión de política para las tasks de UI previas a esa regla.

Dos defectos de `task:lint`, ambos de mensajes que prometían lo que el mecanismo no honraba:
`ui-wireframe-contract` ignoraba el `UI impact: none` explícito por inferir desde `Domain`, y se
rompía cuando el autor agregaba la razón que la plantilla exige.

## 2026-09-01 — El auditor de flags detecta el drift ledger↔live, y dos defectos quedan registrados

`pnpm flags:audit` era ciego al drift más caro del ledger porque `vercel env ls` lista presencia, no
valor. Ahora hace `vercel env pull` y compara: 24 filas declaran `prod: OFF` con el valor live en
`true`. Ese drift es lo que hace que un agente lea "rollout pendiente" y re-ejecute trabajo hecho.

Del barrido de 27 tasks salen `ISSUE-165` (writer de organizaciones fuera del SSOT en
`/api/admin/spaces`, impacto latente) e `ISSUE-166` (el CTA de Nexa abre el chat sin anclar el insight
ni enviar la pregunta).

## 2026-09-01 — TASK-1709 cerrada y la doc que la daba por apagada

El carril de diagnóstico de prospecto llevaba **5 días desplegado** (flag ON en Vercel Production
desde el 27-ago, corrida real sobre `skyairline.com`) mientras cuatro skills, el runbook del gateway
MCP, dos manuales y la doc funcional decían "flag OFF en todos los ambientes". El runbook incluso
instruía al canary a normalizar un `disabled` — que hoy sería una regresión. Corregido en 9 archivos.

Tier `prospect` documentado: se resuelve sin `module_assignments` y su gasto es presupuesto de
adquisición de Efeonce, nunca costo de cliente.

## 2026-09-01 — TASK-1699 cerrada, y `task:lint` gana la regla `stale-progress`

El top-N del SERP quedó `complete`: serie viva desde el 2026-08-29 (766 · 775 · 762 · 778 filas en
4 días) con costo marginal CERO medido, y su señal de cobertura convergió sola a `ok`/`uncovered=0`
sin tocar el umbral.

Se re-ejecutó cinco veces sin cerrar por un defecto de **registro**, no técnico: 46 checkboxes sin
tildar y `Status real: Diseno` hacían que cada sesión la leyera como no empezada, mientras el trabajo
quedaba anotado sólo en prosa.

Regla nueva `stale-progress` en `task:lint`: avisa cuando el estado declarado contradice la historia
de commits, y cuando una task se cierra sin tildar una sola evidencia. Warning por diseño y por
medición (414 de 975 completas están así); acotada a las que tienen commits de implementación, la
señal cae a 28 tasks.

## 2026-08-31 — Blog WordPress sanea categorías y abre una copia gobernada de Demo 35

La taxonomía live quedó reducida a 13 categorías reales: AEO y SEO son raíces;
Diseño Web depende de Diseño y Redes Sociales de Marketing Digital. Se
reclasificaron 11 posts reales, se enviaron 20 posts Ohio demo a papelera, se
retiraron 15 categorías descartadas y Marketing Digital quedó como default.
Los cambios de URL tienen redirects explícitos y los demo retirados, `410`.

La copia `251875` de Demo 35 está publicada con `noindex` como superficie de
trabajo; la fuente `225984` y `/blog/` permanecen sin cutover. PDR, contrato,
manual y skills WordPress Codex/Claude fijan que jerarquía no equivale a
prominencia y que los 15 widgets deben reconectarse a contenido real antes de
publicar. [Estado y pendientes](docs/audits/public-site/2026-08-31-blog-taxonomy-demo35-work-copy.md).

## 2026-08-31 — Las páginas misceláneas dejan de ser “una 404” y ganan ownership

Discovery live confirmó que Ohio padre gobierna 404, búsqueda/no-results y archivos; Elementor Theme Builder
no tiene templates/conditions especiales activos. Se creó el contrato child-theme-first, el comportamiento
funcional, el runbook, el registro de primitive propuesto y las rutas en skills WordPress/SEO. La política separa
recovery, búsqueda, archivos editoriales y chrome global, con HTTP/robots/canonical por query type. No hubo
mutación ni publicación. Persisten P0: contenido público `(Borrador)`, search vacío con 154 resultados y enlaces
demo/rotos globales. [Discovery y límites](docs/audits/public-site/2026-08-31-wordpress-miscellaneous-surfaces-discovery.md).

## 2026-08-31 — Content Marketing: cierre técnico focal en producción

El stage ya aplica el mismo gate de alto/ancho al cargar y redimensionar; 1440×650 conserva los
siete capítulos en flujo. Se corrigieron contrastes de estados y badges con variantes de la paleta
aprobada. Despliegue WordPress limitado a JS/CSS con backup, hashes y readback de documento intacto.
Nuevo verificador recorre pin, capítulos, tabs/cortes, mobile/reduced-motion/JS-off y contraste;
smoke seguro separa rechazos reales, ledger vacío y un evento GA4 explícitamente sintético.
[Evidencia y límite Turnstile/Realtime](docs/audits/public-site/2026-08-31-content-marketing-technical-closure.md).

## 2026-08-31 — Cobertura Efeonce incorpora Estados Unidos y Contacto corrige su fuente institucional

La cobertura vigente queda en Chile, Estados Unidos, Colombia, México y Perú, sin inferir oficina ni entidad
legal por mercado. Contexto de negocio, posicionamiento público, primitives y skills espejadas apuntan al
mismo estado. El brief de Contacto usa la dirección y los dos teléfonos de la contraportada canónica y marca
como desactualizados Las Bellotas, el teléfono público anterior y las listas de cuatro mercados. `TASK-1801` quedó registrada con contratos visual/flow/motion, routing, privacidad, Meetings y rollout; esta edición no publicó WordPress ni amplió métricas históricas de clientes.
[Brief y límites](docs/public-site/CONTACT_PAGE_REBUILD_BRIEF_V1.md).

## 2026-08-31 — Home: cierre editorial y mantenimiento nativo

Ocho revisiones publicadas: hero desafiante, beneficios concretos, comparación cualitativa, FAQ
con jerarquía tipográfica y encabezado Con + logo. Readback 17 widgets/407 campos/seis repeaters;
doce archivos coinciden local/remoto. Subagente concilió planes, snapshots y evidencia.
Contratos técnico/funcional/manual y skills WordPress/copywriting espejadas actualizados;
commit documental, sin runtime hermano ni WIP SEO previo. QA residual y TASK-1358 siguen abiertos.
[Cierre y límites](docs/audits/public-site/2026-08-31-home-editorial-closure.md).

## 2026-08-31 — TASK-1780: el inventario de tools MCP pasa a ser un manifiesto

`src/mcp/greenhouse/tool-manifest.ts` es la fuente única del catálogo de tools MCP. `server.ts`
registra recorriéndolo —definir una tool sin entrada rompe la construcción del servidor— y el `name`
y las `instructions` que el cliente MCP lee se derivan de él, así que el servidor ya no puede
anunciarse `greenhouse-read-only` mientras registra siete escrituras. Dos banderas ortogonales por
tool: `writes` y `spendsProviderBudget`.

El manual se renombró a `mcp-greenhouse-tool-inventory.md` y se corrigieron sus tres cifras en
conflicto. Nuevo gate `pnpm mcp:manifest:check` en `ci.yml` sobre el artefacto generado que el
gateway consumirá.

Cambio de comportamiento verificado como nulo: el registro del SDK antes y después es idéntico byte a
byte (43 tools, mismo orden y schemas), y el artefacto reproduce el espejo del gateway tool por tool.

Cerrada y pusheada: Greenhouse `d2b3c0639` (9 workflows `success`) y gateway `efeonce-mcp` `e92961e`
(CI `success`). El deploy del gateway es `workflow_dispatch` y sigue sin disparar, así que la revisión
productiva no cambió — la verificación de esta task es de CI, no de runtime.

Barrido documental con 4 subagentes: 8 skills, 5 specs de arquitectura, 9 docs funcionales/manuales,
4 tasks vivas y un epic corregidos. Dos huecos sistémicos cerrados de paso: la rule auto-cargada de
Growth/SEO instruía editar a mano el espejo retirado, y no existía ninguna rule para `src/mcp/**`
(creada). `mcp:manifest:check` entró a `local:check` — antes el drift del artefacto sólo aparecía en CI.
Fila nueva en `DECISIONS_INDEX.md`: la frontera "qué capacidades existen es conocimiento de producto,
no de transporte" es la tercera arista del triángulo que ya fijaban las dos filas MCP existentes.
