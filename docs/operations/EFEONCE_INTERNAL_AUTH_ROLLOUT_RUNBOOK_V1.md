# Efeonce ID interno — operación y rollout

Owner: TASK-1836 / EPIC-044. Decisión: `EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md`.

## Estado verificado 2026-09-05

Backend publicado parcialmente; promoción del reader y activación pendientes. Las migraciones
`20260905124526557_task-1836-internal-authorization-contexts` y
`20260905130319708_task-1836-auth-ephemeral-gc` y
`20260905132652846_task-1836-session-bound-passkey-step-up` están aplicadas en la instancia compartida.
Esto afecta al esquema común de staging/producción; no hay segunda instancia de pruebas.
El runtime releído es `auth-server-00009-4tl`, SHA `a9f16b89393cfb19995baf07f48616a139f6bffb`,
100% tráfico. OAuth/personas ON; configuración interna preparada pero OFF. Ingress real:
`internal-and-cloud-load-balancing`.

El reader de elegibilidad en PG devuelve el perfil canónico del caso autorizado `jreyes@efeoncepro.com`
y la organización `EO-ORG-0007` (`org-2df565fb-98aa-42f7-b324-ea9a2209017f`). Su condición comercial
`other/inactive` no es una condición de pertenencia laboral: la organización está activa y es entidad
operativa. No se modificó la organización. Tras autorización de rollout se aplicaron enrollment y grant
`growth.seo.observation.read` por commands canónicos, con vencimiento `2026-09-12T15:00:00Z`.
No se emitió todavía un token corporativo ni se completó el canary autenticado.

Gateway `fa1ee2a05caf1adc66a034bdfe2e7db3ba4b103c`, revisión `efeonce-mcp-gateway-00031-xwx`,
100% tráfico, contiene la validación jti; ambos flags nativos OFF. Vercel staging del SHA a9f16b893
está READY y el smoke E2E `33975085336` terminó success. PR de promoción: #222, todavía sin merge.
El preflight clasifica el batch `requires_break_glass`; la comprobación real de permisos deniega al
actor ambas capabilities de excepción porque faltan los grants en el evaluador. Reparación concreta
en [diagnóstico de autoridad](TASK-1836_RELEASE_AUTHORITY_GAP_2026-09-05.md), autorizada por el operador. Seis grants faltantes restaurados localmente y readback real permitido;
pruebas de permisos 28 passed. Se integra la auditoría del motivo antes de publicar y usar la excepción.
GC permanece OFF/PAUSED.

## Configuración del emisor

- `AUTH_SERVER_INTERNAL_AUTH_ENABLED=false`: gate independiente, revisado al login/callback, authorize,
  intercambio/refresh y resolución de contexto. OFF no cambia el carril externo.
- `AUTH_SERVER_ENTRA_TENANT_ID`, `AUTH_SERVER_ENTRA_CLIENT_ID`: aplicación upstream de un solo tenant.
- Redirect web exacto: `https://auth.efeonce.org/auth/internal/callback`.
- Solicitar sólo `openid`, PKCE S256 y `max_age=0`; configurar emisión de `auth_time`.
  No inferir MFA desde Entra ni pedir scopes Graph de negocio.
- `AUTH_SERVER_ENTRA_CLIENT_SECRET_REF`: referencia Secret Manager en deploy;
  el runtime recibe `AUTH_SERVER_ENTRA_CLIENT_SECRET`. Nunca incluir valor en CLI/documentación.
- `AUTH_SERVER_INTERNAL_LOGIN_KMS_KEY`: llave simétrica dedicada para transacciones OIDC con AAD
  `internal-login-v1:<environment>|<transaction>`, permisos encrypt/decrypt del SA del emisor.
- Vercel, dueño del reader ecosystem, necesita su configuración de issuer/environment/audience y
  `AUTH_SERVER_INTERNAL_AUTH_ENABLED` coherente. No hereda variables de Cloud Run.

### Control durable de activación

Los workflows de Greenhouse transportan las variables de repositorio GitHub
`AUTH_SERVER_INTERNAL_AUTH_ENABLED` y `AUTH_SERVER_GC_ENABLED` a sus deploy scripts, con default false.
Se prepararon ambas en false y se verificó ausencia de overrides en los environments Production y
staging. Ambos ambientes comparten servicio: no mantener valores contradictorios por environment.
El script GC valida true/false antes de llamadas cloud y deriva la pausa del scheduler del mismo flag;
una activación no debe desaparecer por el siguiente `--set-env-vars`.

Después de verificar el reader productivo, activar la variable de GitHub y aplicar el mismo valor al
runtime Cloud Run para efecto inmediato; confirmar revisión activa. Vercel requiere su propia variable
y un deployment nuevo. El gateway tiene sus controles en su propio repo/environment. Para rollback,
apagar también los controles durables, además de los runtimes activos, y pausar el scheduler GC.
Un deploy local explícito conserva default OFF: la vía operativa normal es el workflow gobernado.

### Bootstrap verificado 2026-09-05

Tras inventariar todas las aplicaciones por callback/nombre exactos, se creó `Efeonce ID Corporate Login`:

- Tenant: `a80bf6c1-7c45-4d70-b043-51389622a0e4`; client ID: `3a327355-b1a5-4de2-867b-08365c76fcd2`.
- Application object: `cd9d408e-dbb8-4dac-8d8e-ae4f3e749ea3`; service principal: `f8791b70-135e-4d50-b2cb-ad34b7e99d9e`.
- `AzureADMyOrg`, callback exacto anterior, claim `auth_time` esencial, implicit grants apagados,
  sin permisos Graph/API adicionales ni redirects de cliente público.
- Service principal activo con `appRoleAssignmentRequired=true`; única asignación al OID canónico
  `71acd85d-15a6-4eb6-953d-125370032e93`, usuario activo de tipo Member. Esta asignación permite usar
  la aplicación upstream; no constituye enrolamiento, capability ni consentimiento MCP.
- Secret Manager: `projects/efeonce-group/secrets/auth-server-entra-client-secret/versions/1`.
  Credencial nueva con vencimiento `2026-12-04T00:00:00Z`; owner de rotación: Identity/Operations,
  antes del vencimiento. Transferencia por stdin y comparación de readback sin imprimir el valor.
- KMS: `projects/efeonce-group/locations/us-east4/keyRings/auth-server/cryptoKeys/auth-server-internal-login-envelope`,
  simétrica HSM, rotación 90 días. IAM de recurso: sólo se agregó `auth-server@efeonce-group.iam.gserviceaccount.com`
  como secretAccessor y cryptoKeyEncrypterDecrypter, respectivamente. El deployer CI tiene cloudkms.viewer
  sólo sobre esta llave para el preflight; su rol secretmanager.admin de proyecto ya existía y no se amplió.

Las referencias quedan declaradas en `services/auth-server/deploy.sh`, manteniendo el flag interno OFF.
No se desplegó esta configuración ni se probó aún el intercambio OAuth contra el callback real.
La preparación de secretos y la asignación upstream no acreditan un login de Efeonce ID. El readback IAM
confirma esos bindings; la impersonación local del deployer no está permitida, por lo que su ejecución
efectiva del preflight queda por verificar en el siguiente workflow. No se otorgó Token Creator al operador.

## Enrolar, otorgar y revocar

Superficie programática: `POST /api/admin/identity/internal-access`, sesión admin vigente y capability
fina (`identity.internal_access.enroll`, `.grant` o `.revoke`, acción `execute`, scope `tenant`).
Los commands viven en `src/lib/identity/internal-access/commands.ts`. El actor sale de la sesión,
nunca del cuerpo de la petición. Primero ejecutar con `dryRun:true` y revisar el resultado.

- `action:enroll`: environmentId, profileId, tenantId, objectId, issuer, reason, dryRun.
  El command compara vínculos Entra y workforce canónicos, sin enlace por correo. Colisiones no fusionan
  ni reactivan personas. Un source nativo externo existente requiere decisión explícita, no reutilización silenciosa.
- `action:grant`: enrollmentId, capability, active (boolean obligatorio), expiresAt para alta, reason,
  dryRun. Sólo grants personales; sin grant automático al enrolar. El target debe tener hoy la capability
  en el catálogo Greenhouse para todas sus acciones. Namespaces de providers ajenos requieren adapter
  dueño y fallan cerrado mientras no exista. La resolución vuelve a intersectar permisos actuales.
- `action:revoke`: enrollmentId, reason, dryRun. Revoca enrolamiento/link/grants según command y eleva `gv`.
  Conservar auditoría y eventos. No editar tablas a mano para desbloquear una colisión.

El callback sólo usa enrolamientos existentes: genera sesión primary y evidencia corporativa atómicas.
El login programático es `GET /auth/internal/login?return_to=<authorize-path>`; UI/consent visible pertenece
 a TASK-1835. Contexto estable por sesión/cliente/binding; cambiar cliente no hereda consentimiento.
El contexto vence como máximo con el límite absoluto de la sesión y no se rejuvenece al reutilizarlo.
Una sesión web expirada no termina por sí sola una familia ya consentida; revocar la sesión sí invalida
su contexto. Al vencer el contexto se requiere nueva autenticación/consentimiento.

## Contrato del consumer TASK-1831

El JWT nativo interno añade `authorization_context_id` y `authorization_context_version:1`.
Issuer, audiencia, azp, scopes, firma, expiración y `gv` conservan validación obligatoria. Un token sin
contexto no puede clasificarse como interno por issuer, correo o roles.

El reader existente `GET /api/platform/ecosystem/identity/binding` mantiene su autenticación de máquina
con binding `internal` y parámetros environment, subject, clientId. Para V1 interno añade
`authorizationContextId`, `contextVersion=1`, `audience`, `grantsVersion` y `jti` firmado. Rechaza contexto parcial,
duplicados y números no canónicos. El issuer se obtiene de configuración confiable. Devuelve
`population:internal`, `outcome:bound|denied`, `cacheTtlSeconds:0`; en bound, profileId, organizationId,
bindingId, grantsVersion y capabilities efectivas. Una denegación interna nunca cae al reader externo.
No cachear resultados positivos en esta cohorte. El gateway debe aplicar su flag
`MCP_NATIVE_INTERNAL_AUTH_ENABLED` por request/dispatch, incluso para tokens ya emitidos.

Readback público renovado 2026-09-05 14:25 UTC: `/readyz` del emisor devuelve ready con PG/KMS/llave
activa correctos; `/.well-known/oauth-protected-resource` del gateway devuelve 200 y anuncia sólo
`https://mcp.efeonce.org` como authorization server. Su metadata OAuth mantiene endpoints de Entra
(`login.microsoftonline.com/<tenant>/oauth2/v2.0/*`) y `/register` del shim. La revisión pública no acredita compatibilidad interna nativa; el flag del emisor debe permanecer OFF
hasta verificar los consumers desplegados. Este readback es
de discovery; no prueba dispatch ni autorización de un token.

La integración local posterior de TASK-1831 añade verificación ES256/RS256 separada, reader sin caché,
37 policies explícitas y guards de listado/dispatch. `pnpm check` pasa 114 pruebas; el contenedor compilado
previamente no incluye todavía la última corrección de transporte de `market` en discovery.
Smoke local del contenedor: health/discovery 200, MCP sin token y token inválido 401; no acredita despliegue. La cohorte interna puede alcanzar únicamente las
tools cuyo provider/policy ya admite autoridad nativa; Globe, Hiring, skills y otras superficies sin
adapter compatible permanecen denegadas. Los clientes externos no tienen aún federación de negocio
completa. No conceder scopes adicionales para sortear esas denegaciones.

Canary de lectura propuesto: `get_seo_entitlement` sobre la organización propia. Su handler devuelve
estado de habilitación/cupo incluso con `hasModule=false`; no requiere crear target ni comprar datos.
Verificar resultado de negocio y rechazo de otra organización con el token real antes de acreditarlo.
El DTO de consentimiento ya está compuesto en el runtime y conserva autoridad por organización;
authorize y POST lo revalidan, y el renderer muestra nombres escapados. La aprobación visual de
TASK-1835 sigue pendiente; el rediseño completo y el recorrido real todavía no están verificados.

Orden: consumers compatibles OFF -> verificar reader y denegación -> emisor/UI compatibles -> cohorte
mínima -> canary real TASK-1832 -> rollback medido. No habilitar emisión contra el verifier anterior.
Scopes de escritura requieren factor local fuerte reciente para nueva concesión/elevación; refresh
conserva el `auth_time` del login primario original. Ese claim no acredita MFA ni se sustituye por la hora
del refresh o del step-up. Si una operación exige un factor reciente al ejecutarse, su provider debe
verificar evidencia específica; no deducirla de `auth_time`, del scope ni de claims MFA de Entra.

## Passkeys y limpieza

Step-up explícito: `POST /auth/passkeys/step-up/start` y `/finish`, con sesión existente. El reto se liga
al propósito, environment, sujeto y hash de esa sesión; exige user verification real. Actualiza la misma
sesión sin reemplazar cookie, `auth_time` ni evidencia Entra. Un login passkey normal no se convierte en
corporativo. TOTP y UV rechazan la actualización si la revocación/vencimiento del vínculo o sesión gana
la carrera antes del UPDATE. El cambio de schema es aditivo y compatible con el código anterior.

Las ceremonias passkey de registro, login y step-up limitan intentos antes de asignar retos/verificar firmas. Registro limita
además por sujeto. El transporte del emisor descarta prefijos XFF proporcionados por cliente y confía
sólo en el hop cliente añadido por ALB; fuera de ese contrato usa bucket desconocido compartido.

`pnpm auth:gc --dry-run` reporta candidatos, sin secretos. `pnpm auth:gc --apply` llama el mismo
command de mantenimiento. La función PG SECURITY DEFINER `greenhouse_auth.gc_ephemeral_state`
no concede DELETE general al runtime, fija search_path, conserva auditoría/autenticadores y mantiene
familias refresh vigentes y sus ancestros. Retención mínima 30 días tras vencimiento; hasta 500 filas por
cada una de 11 tablas (5.500 total), lock transaccional y timeout antes de invocación.
Cadencia horaria: hasta 12.000 filas por tabla al día; si el reporte alcanza 500 repetidamente, revisar
backlog y capacidad antes de ampliar límites. Dry-run cuenta el estado actual: apply puede liberar dependencias adicionales dentro de la transacción.

Mantenimiento programado declarado: ops-worker `POST /auth/ephemeral-gc`, protegido por su autenticación
canónica y `wrapCronHandler`; job `ops-auth-ephemeral-gc`, `13 * * * *`, America/Santiago.
Verificación real del command: dry-run y apply devolvieron cero candidatos/cero borrados en las once tablas.
Inicialmente PAUSED y `AUTH_SERVER_GC_ENABLED=false`, ambos declarados en deploy.sh.
El handler registra `auth_ephemeral_gc_completed` en Cloud Logging con cutoff, lock, batch y conteos
agregados; Scheduler no conserva el cuerpo HTTP. No incluye sujetos, tokens ni credenciales.
Activar después de readback de función/GC y revisión del deploy compartido; un flag de Cloud Run no se
limita a staging. Verificar ejecución y registro del cron, no sólo existencia del job.

## Rollback y pendientes de cierre

Apagar flags internos de emisor, reader y gateway; revocar cohorte por command; conservar Entra directo
 y externos. Verificar que tokens existentes sean rechazados, no esperar su expiración. Para GC, flag OFF
 y job PAUSED declarativos. Las migraciones son aditivas y permanecen; no borrar evidencias al revertir código.

Pendientes: aplicar configuración por runtime, despliegue de cambios, entrada UI 1835,
verifier/policy gateway 1831, canaries reales 1832, latencia baja upstream separada de revocación local,
rollback cronometrado y activación/readback del job GC. Ningún test unitario sustituye estas evidencias.


## Guardas adicionales antes de consentimiento

Authorize revalida el binding antes de presentar consentimiento o pedir step-up. El POST allow debe
revalidar el binding y exigir step-up para scopes de escritura antes de persistir la decisión; deny
conserva su salida aunque se haya revocado acceso. No interpretar scopes como capabilities de dominio:
el DTO de organización/permisos efectivos se obtiene del reader canónico de presentación.

La caducidad del schema compartido se aplica también al reader externo: grants activos con
`expires_at <= NOW()` quedan fuera; `NULL` conserva semántica legacy sin expiración. Prueba PG ejecuta
el SELECT real sobre tabla temporal con rollback, incluyendo el límite exacto de caducidad.

## Origen de mutaciones de navegador

Los POST de consumo de magic link, inicio/final de autenticación y registro passkey, step-up UV,
TOTP y logout exigen `Origin` exactamente igual al origen del emisor. Si falta, sólo se acepta
`Referer` del mismo origen; `Sec-Fetch-Site` nunca sustituye esta evidencia y, si está presente,
debe indicar `same-origin`. Un origen inválido falla antes de consumir credenciales o crear sesión.
El GET de confirmación del correo sigue siendo inerte y su formulario funciona desde el emisor.
`person-auth-canary.ts` ya envía Origin también antes de recibir cookie. Otros clientes programáticos
de estas rutas deben hacerlo; no se agregaron credenciales, excepciones ni bypasses de autenticación.
Petición de magic link e invitaciones mantienen su contrato actual.

Regresiones con magic link válido y assertion WebAuthn P-256 real comprueban rechazo del POST hostil,
ausencia de consumo/Set-Cookie y éxito posterior de la misma credencial desde el origen correcto.
Revalidación local: 363 passed / 6 skipped y typecheck de 8 GB correcto. Bundle del emisor compilado
con esbuild y las opciones/shims del Dockerfile; no equivale a un contenedor ejecutado o desplegado.

## UI integrada localmente; recorrido operativo pendiente

`auth-server:brand-assets:generate` produce isotipo, CSS de tokens AXIS, fuentes con avisos OFL y
controller de segundo factor. El renderer consume esos assets; las rutas exactas `/fonts/*.ttf`
y `/fonts/licenses/*-OFL.txt` tienen pruebas de bytes/SHA-256, GET/HEAD, método, host y flag maestro.
CSP permite fuentes propias y hashes de estilos confiables; el segundo factor usa nonce de script.
El shell enlaza licencias. Login corporativo y consentimiento conservan retorno y DTO canónico.

La página de segundo factor conecta TOTP, códigos de respaldo, alta TOTP explícita con QR local y
passkey UV ligada a sesión. El alta exige reconocer que se guardaron los códigos antes de confirmar.
GVC de login, consentimiento, segundo factor y alta pasa en 1440/390. El script
`node scripts/auth-server/verify-ui-browser.mjs` verifica seis recorridos locales sin violaciones,
con respuestas de factores ficticias y tráfico restringido a 127.0.0.1:19036. El harness usa renderers
reales pero no autentica ni escribe PG; esto no acredita un login o consentimiento operativo.

Quedan en TASK-1835 login por passkey, cobertura completa de estados y revisión de la experiencia;
`UI ready: no`, aprobación visual pendiente. Despliegue, canary de persona real y rollback siguen
pendientes. Evidencias detalladas: `docs/ui/reviews/TASK-1835-first-fold-review.md`.

## Preparación del piloto de lectura — 2026-09-05 15:05 UTC

El recorrido mínimo Microsoft → consentimiento → `get_seo_entitlement` solicita sólo
`efeonce.mcp.read` y requiere grant personal vigente `growth.seo.observation.read`. No depende del
login por passkey ni de un factor de escritura. Esto no cierra la UI completa de TASK-1835 ni la matriz
completa de TASK-1832. La recuperación de errores internos ya ofrece HTML bajo Accept explícito,
sin reflejar query, códigos o errores upstream; mantiene JSON, estados, cookies y Retry-After.
GVC de esa página: `.captures/2026-09-05T15-04-28_task1835-runtime-internal-error` (1440/390).

Verificación local final de esta integración: `pnpm build` exit 0; suite enfocada auth/identity de
253 passed / 6 skipped, sin atribuir los live tests omitidos a PG; gates worker build/runtime-deps
y MCP manifest correctos. Bundle del emisor compilado con opciones/shims del Dockerfile. Arranque
local del bundle con configuración desactivada y sin credenciales cloud: health 200; login, authorize,
login interno y fuentes 404. No es una ejecución de imagen Docker ni un deploy.

Readback público 15:02:44 UTC: auth ready 200 y gateway metadata 200, todavía anuncia únicamente
`https://mcp.efeonce.org` como authorization server. No hubo cambio de flags ni nuevos grants.

Siguiente paso de publicación propuesto: commit enfocado de cambios de identidad/auth y sus
consumers/documentación, preservando WIP Berel; push Greenhouse develop y gateway main, seguido del
deploy canónico del gateway, manteniendo gates internos OFF. Greenhouse develop publica el emisor
compartido automáticamente: no tratar ese push como operación sólo local. Cuatro commits locales
previos de auth/personas/documentación también viajarían con develop. La promoción posterior a
main requiere revisar el delta completo del release; no está implícita en este primer paso.
Después: verificar revisions/reader, preparar configuración durable y cohorte, y ejecutar canary y
rollback. El operador autorizó el rollout el 2026-09-05. Se inicia publicación con gates internos OFF;
la UI completa conserva sus criterios pendientes. No solicitar otra aprobación para este mismo rollout.

## Gate detectado al preparar el canary — revocación OAuth

La preparación del canary detectó que revoke/retirar consentimiento invalida el ledger y refresh,
pero un JWT vigente podía seguir pasando el reader que sólo revalidaba contexto y grants. La cohorte
permanece OFF hasta desplegar y verificar el recheck por `jti` firmado en ese mismo reader. No sustituir
esta prueba por un refresh rechazado: deben comprobarse ambos, refresh y dispatch MCP posteriores.
El fix conserva familias independientes y no introduce introspección remota. Owner: TASK-1836/1831.

## Primera publicación OFF autorizada — 2026-09-05

Greenhouse `51e285bb3af36e9bf1cefeca7a0b46e9248265ad` publicado en develop; el merge de ancestría
`1ba317fbba43e55e1b934c1579f2453d05b3d7a3` conserva el árbol idéntico. WIP Berel quedó sin stage.
Readback Cloud Run: `auth-server-00008-zwh` y `ops-worker-00649-6sv`, ambos 100% tráfico con SHA51;
flag interno del emisor false y flag GC del worker false. Runs: auth33974375630, ops33974375691.
El gateway `93819fa349ea05f2b1c600491e734b3b3585bc01` desplegó por run33974235412 exitoso:
`efeonce-mcp-gateway-00030-87s`, 100%, digest
`sha256:091b650a8ead38ad5c1304f52fea35522617c49e5449e8363f81eb8ebcbc2357`, ambos gates nativos false.
Health/discovery200 y MCPsin/invalidtoken401. No equivale a token corporativo real.

Vercel Production tiene preparados issuer, environment, audiencia y flag interno false para su próximo
build; no hubo aún promoción main. El gateway usará su consumer interno existente EO-SPK-0004 y
binding EO-SPB-0004, verificados activos; no se amplían permisos ni se crea credencial. URLbase del
reader y referencia del mismo Secret Manager preparadas en vars GitHub production.
Dry-run de enrollment de la persona canónica: elegible, applied:false; todavía sin enrollment/grant.
La activación queda retenida por la corrección de revocación por jti y el consumer Vercel pendiente.

Corrección local verificada: reader consulta `OAuthStore.getAccessToken(jti)` y rechaza revocación,
expiración o dimensiones ajenas antes de resolver contexto. Las pruebas usan los commands reales
`revokeGrant` y `revokeClientConsent` sobre store de memoria; una familia distinta del mismo contexto
permanece válida al revocar sólo la primera. Gateway exige jti firmado, su prueba HTTP confirma 401
sin llamar al provider cuando el ledger niega. La prueba productiva sigue pendiente.
