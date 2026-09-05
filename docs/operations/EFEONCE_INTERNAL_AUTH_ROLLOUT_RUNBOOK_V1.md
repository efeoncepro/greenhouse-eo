# Efeonce ID interno — operación y rollout

Owner: TASK-1836 / EPIC-044. Decisión: `EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md`.

## Readback de integridad 2026-09-05 — posterior a PR #223

Migración `20260905183812333` aplicada por runner; población y tracking releídos. Piloto gv 2 → 3.
Reconciliación canónica: revisión 1 binding/1 grant, apply 1/1 y revisión posterior 0/0; ambas señales
de integridad en cero. Emisor sigue OFF en `auth-server-00013-jhz`, 100% tráfico. Código aún pendiente
de publicar: build compartido bloqueado por WIP UI de Claude, a quien el operador decidió esperar.
Smoke externo read-only/apply completado con fixture final revocada. Los pares de reconciliación
comparten ID `41659bc7-c6f0-4eb0-8c46-6dafb80e562b` y referencian la auditoría original.
El commit completo `7d704f483` está autorizado, incluido Berel. No repetir la migración ni fabricar
auditoría; repetir dry-run/readbacks para comprobar continuidad. Canary humano y rollback pendientes.

## Estado previo verificado 2026-09-05

Main `a68662508b1d928bbb1b6d048215a970ff008d21` (PR #223) está released por
`33982717767`; manifest `a68662508b1d-750f5ab8-31c7-418d-a33c-9ea5b6871c1b`, sin override.
CI, Deep, smoke de staging y Vercel Production `dpl_J8KpRZzN8AMG6PYBJuzeUjPXpSbn` READY;
health del orquestador correcto y watchdog posterior `ok`, 5/5 sincronizados. El árbol completo del
squash coincide con develop `1c75e89f`, servido por auth-server y ops-worker mediante change-gate.
La corrección OIDC y el canary CSRF ya están publicados. GC permanece ON y su ejecución real anterior
está comprobada; gateway `00032-qm5` conserva discovery ON. Esto no acredita el canary humano.

El emisor interno continúa OFF (variable durable false; `auth-server-00013-jhz`, 100% tráfico).
El intento anterior completó Microsoft/MFA pero el callback rechazó `upstream_rejected`, sin token.
No atribuir ese error agregado a una causa histórica específica. Los defectos de scope/reloj sí están
corregidos y probados. **No reactivar todavía:** la auditoría posterior confirmó writer compartido fuera
del owner canónico y recuperación externa potencialmente capaz de desactivar un source link interno.

El piloto de EO-ORG-0007 conserva enrollment y grant personal vigentes hasta 2026-09-12T15:00:00Z,
gv 2 al readback, cero access tokens emitidos. Esos commands escribieron audit/eventos internos reales,
pero cero audit/eventos externos canónicos para binding/grant; no declarar integrado ese criterio.
La organización tiene status activo y es entidad operativa; lifecycle comercial other/inactive no la
convierte en cliente ni exige reclasificación. La decisión A del ADR unifica primitives transaccionales,
persistencia de población, recuperación aislada y reconciliación actual explícita sin falsear historia.

Antes de continuar el piloto: migración aditiva y código compatibles, reconciliación dry-run/apply con
actor/razón, detectores `unaudited_write` y `mixed_population` en cero y tests live/smoke externo; luego publicación gobernada,
login nuevo y canaries de lectura/aislamiento/revocación/rollback. Todos siguen pendientes de cierre.

Los seis permisos de release faltantes se restauraron por rol; el actor canónico se revalidó antes de
usar la excepción de batch. El motivo quedó persistido y releído en manifest y auditoría PG.
[Diagnóstico y reparación](TASK-1836_RELEASE_AUTHORITY_GAP_2026-09-05.md). La identidad declarada por
GitHub y la autoridad Greenhouse se comprobaron por separado, sin inventar un vínculo entre ellas.

## Interpretar el acceso interno frente al externo

Consultar sólo `resolveExternalAccess` no determina el acceso corporativo: un source link de enrollment interno devuelve
`internal_population` y deniega ese recorrido, aunque pueda ser elegible en el interno. No es unbound.
La fachada ecosystem usa contexto interno + jti verificados para resolverlo y devuelve población interna;
sin ese contexto conserva la política externa. No conceder `linked` ficticio ni relajar active_client.
Para soporte, registrar población, recorrido, contexto y resultado redacted del reader que realmente se usó.
No ejecutar ambos resolvers como sondeo read-only: el externo registra denials. Los canaries negativos y
positivos deben ejercitar el recorrido correcto; diferencia entre poblaciones no es automáticamente drift.

## Regularización del piloto — procedimiento de integridad

Estado inicial medido: dos registros sin audit canónico. Conservar emisor interno OFF durante toda la
transición. La migración `20260905183812333_task-1836-authority-populations.sql` se ejecuta exclusivamente
por el runner gobernado, después de pruebas y revisión; no ejecutar SQL copiado ni reclasificar registros
ambiguos manualmente. Clasificación es por evidencia de enrollment y grants, no por issuer/email.

1. Verificar versión del código, migraciones pendientes y autoridad actual del operador. Confirmar que no
   hay otro writer operativo de este módulo durante la transición. Conservar snapshot de IDs, estado y gv.
2. Aplicar migración aditiva por el runner y comprobar population interna sólo en bindings demostrables.
   La versión aumenta una vez para invalidar contextos previos; no inventar un valor esperado fijo.
3. Ejecutar `pnpm identity:internal-access:reconcile -- --binding-id <binding> --actor-id <actor> --reason "<razón de regularización>"`. Sin `--apply` es revisión: devolver conteos planeados, sin audit/outbox.
4. Revisar que el plan corresponda al binding y grants existentes; no crea autoridad ni extiende vigencia.
   Ejecutar con `--apply` bajo la autorización del rollout. Repetir la revisión debe planear cero registros.
5. Releer audit/eventos de reconciliación actuales, actor/razón, referencias a audit original y IDs exactos.
   Ejecutar la señal: `unaudited_write_count=0` y `mixed_population_count=0` son necesarios; nunca insertar audit ajeno para silenciarla.
   El par audit/outbox debe estar correlacionado: una fila audit sola no acredita integración.
   El command rechaza capability/vencimiento distintos de la última concesión original y no los renueva.
6. Ejecutar smoke externo read-only y suites live por `pnpm test:live`, serializadas. Verificar separación
   de población, recuperación externa, revocación, grants personales y ausencia de escalamiento.
7. Publicar por release control plane, releer todos los runtimes y recién entonces reactivar emisor para
   canary humano. Detector cero y release verde no sustituyen el login, aislamiento ni revocación reales.

Rollback: apagar gate interno y conservar columnas, población e historia. No invertir clasificación,
reducir `gv`, borrar auditoría ni recrear subjects. La migración tiene rollback conservador; un cambio de
política exige nueva decisión/migración. Si la clasificación detecta mezcla, abortar y documentar antes
de reparar por un command explícito. No declarar este procedimiento ejecutado hasta conservar readbacks.

## Configuración del emisor

- `AUTH_SERVER_INTERNAL_AUTH_ENABLED=false`: gate independiente, revisado al login/callback, authorize,
  intercambio/refresh y resolución de contexto. OFF no cambia el carril externo.
- `AUTH_SERVER_ENTRA_TENANT_ID`, `AUTH_SERVER_ENTRA_CLIENT_ID`: aplicación upstream de un solo tenant.
- Redirect web exacto: `https://auth.efeonce.org/auth/internal/callback`.
- Solicitar `openid profile`, PKCE S256 y `prompt=login`; configurar emisión de `auth_time`. `profile` es necesario para el claim `oid`; no pedir scopes de negocio ni `offline_access`.
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

### Incorporar futuros colaboradores y clientes

El piloto no crea una excepción por usuario o correo. Para incorporar otro colaborador, repetir este
procedimiento con su identidad canónica:

1. Verificar persona, vínculo workforce elegible y source Entra vigentes; resolver el tenant y object ID
   exactos. No crear personas u organizaciones duplicadas ni inferir identidad por dominio de correo.
2. Asignar al colaborador a la aplicación empresarial Efeonce ID Corporate Login en Microsoft Entra.
   La aplicación requiere asignación; la asignación del piloto no habilita a todo el tenant.
3. Ejecutar `enroll` primero con `dryRun:true`, revisar y aplicar con un actor autorizado.
4. Otorgar sólo las capabilities necesarias mediante `grant`, con vencimiento explícito y dry-run previo.
   El colaborador debe tener esos permisos vigentes en Greenhouse; enrolar no los concede por sí solo.
5. Completar su autenticación Microsoft y consentimiento en el cliente MCP. Verificar una lectura
   permitida, una operación fuera de alcance denegada y la revocación antes de ampliar permisos.

No se requiere modificar código por cada incorporación. El grant del piloto vence el 2026-09-12 a las
15:00 UTC; una renovación requiere el mismo command y una nueva vigencia explícita, no una extensión
automática. La asignación Microsoft, el enrolamiento y los permisos son controles independientes.

Los clientes siguen el acceso externo B2B de TASK-1631 y EPIC-044, con su organización y grants
correspondientes; no deben convertirse en workforce interno para poder usar MCP. El rollout y la
compatibilidad de clientes externos de TASK-1832 requieren su propia evidencia.

## Contrato del consumer TASK-1831

Readback 2026-09-05 del despliegue Production `1086fe40a55396fc199ef2e446391c14a69b665d`:
reader sin credencial → 401 `invalid_token`; con credencial máquina existente y contexto sintético
sin `jti` → 400 `bad_request`. Probe GET sin escrituras, exit 0. Esto verifica el contrato publicado,
no acredita todavía una sesión corporativa ni el canary autenticado.

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

## GC operativo — 2026-09-05

`AUTH_SERVER_GC_ENABLED=true` verificado en la variable del repositorio GitHub y en
`ops-worker-00652-x8t`, Ready, 100% del tráfico, SHA `669a2b86186b880b335eb719ee8fa8b86f61d07c`.
El scheduler `ops-auth-ephemeral-gc` quedó ENABLED. Ejecución manual del job existente a las
16:47:28.755028 UTC y log `auth_ephemeral_gc_completed` a las 16:47:29.331126 UTC: `dryRun:false`,
`locked:true`, batch 500, cutoff `2026-08-06T16:47:29Z`, cero borrados en las once tablas.
Esto verifica scheduler → handler autenticado → función PG → log, sin necesidad de fabricar filas
antiguas en producción. La siguiente ejecución automática conserva el horario minuto 13 de cada hora.

## Release y activación de controles — 2026-09-05

PR #222 integrado en main `1086fe40a55396fc199ef2e446391c14a69b665d`; CI, Deep y E2E success.
Orquestador único `33978290957` success, manifest
`1086fe40a553-2bdc070c-ead3-4f52-8100-708d63b6aa39` released a las 16:46:02 UTC. Watchdog
posterior `aggregateSeverity:ok`, 5/5 servicios sincronizados. Auth/ops conservan SHA669a2b861 con
árbol completo idéntico al target; los cambios posteriores de flags no reconstruyen ese código.

Reader Production: valor `AUTH_SERVER_INTERNAL_AUTH_ENABLED=true` confirmado mediante env pull
filtrado; redeploy del mismo SHA `dpl_4Ytq4GHm6rCSoDXAxK2vM5Br6gQ9` READY. Usar target CLI
`production` en minúsculas para `vercel env update`; `Production` no encontró la variable existente.
Emisor: variable GitHub del repositorio true y `auth-server-00011-xkj` Ready, 100% de tráfico, flag
true. Readyz público: PostgreSQL, KMS y activeKey ok. El gateway se activa por su workflow independiente.
La ruta de navegación es `/login`; la raíz `/` devuelve 404 y Chrome mostró ERR_BLOCKED_BY_CLIENT
al intentar abrirla. `/login` abrió sin cambiar protecciones. Todavía no se ha emitido token corporativo.

## Diagnóstico del primer login corporativo real

El primer intento de Microsoft mostró AADSTS900561 (GET en un endpoint que exige POST). Un flujo nuevo
llegó correctamente a la aprobación Authenticator y volvió al callback con code/state y sin error
upstream. El callback propio rechazó ese segundo intento: request 17:02:18.767 UTC, transacción
consumida 17:02:43.698 UTC dentro de vigencia, rechazo 17:02:44.085 UTC con `upstream_rejected`.
Esto descarta expiración, replay y cookie ausente para ese intento; el motivo agregado no distingue
intercambio, claims o elegibilidad. No se emitió un token MCP.

Se confirmó un defecto contractual: el cliente pedía `openid` pero exigía `oid`; Microsoft documenta
que `oid` requiere `profile`. La aplicación registrada sí tiene `auth_time` como claim ID esencial
(readback de Entra), sin necesidad de cambiarlo. Se corrige el scope y se añade diagnóstico interno
por etapa sin guardar tokens, códigos, valores de claims ni cuerpos upstream. La causa exacta del
rechazo observado sigue sin demostrarse hasta contar con diagnóstico o canary posterior.
Fuente: https://learn.microsoft.com/en-us/entra/identity-platform/id-token-claims-reference

Corrección local verificada: `openid profile`, reloj de validación posterior al intercambio y seis
diagnósticos internos cerrados; 65 pruebas integradas y typecheck correctos. Emisión interna apagada
en la variable durable GitHub y en Cloud Run durante la publicación de este follow-up. Reader y
gateway quedan preparados; no se emitió token corporativo. La prueba temporal usa JWT firmado y
confirma también rechazo al vencer durante el intercambio, sin ampliar tolerancias.

Gateway recuperado: commit `dd04f470415b7234cbda77df8c6b380c6d5e811e`, run `33979635307` success,
revisión `efeonce-mcp-gateway-00032-qm5` Ready al 100%, digest
`sha256:6f28046f525d965a54a6fca97e730fa5ef741c9be578181c79962df14bec4a39`. Ambos flags ON,
referencias de máquina montadas; health 200 y discovery ON verificado, conservando Entra. Este
resultado no acredita todavía un dispatch con token corporativo.


## Integridad publicada y nuevo intento corporativo — 2026-09-05 21:09 UTC

PR224/main d551cf368, release33991304002 success; manifest
`d551cf3689db-8a4af809-0c28-496d-82c9-a17ed7593ce3` released, health y watchdog5/5 correctos.
Migración/reconciliación aplicadas, dos eventos publicados, señales0. Gateway d7469d7/revisión00033-597
publicado; reader Production devuelve internal_population sin membresías para el recorrido externo.
Detalle de evidencias en TASK-1836 §Release de integridad y ledger de tiempos.

Emisor activado después del release: GitHub repo true y revisión auth-server-00015-jrc Ready100%,
misma imagen validada de ace63705e. Reader y gateway ON. No ampliar la cohorte: falta token humano,
refresh, revocación selectiva y rollback cronometrado. El intento actual espera contraseña reciente
Microsoft, introducida exclusivamente por el operador en su navegador.

La UI de Claude presenta Microsoft sólo con `internalLoginEnabled` y `return_to` válido hacia
`/oauth/authorize`. Abrir `/login` directamente muestra la puerta de invitación por correo. Para probar
el acceso corporativo, iniciar una solicitud OAuth válida del cliente registrado y seguir el enlace al
login. No fabricar un return_to arbitrario ni eliminar validaciones para hacer visible el botón.


## Nuevo rechazo JWT — 2026-09-05 21:20 UTC

El callback21:15:25.036Z registra upstream_rejected / jwt_validation_failed, posterior al intercambio
upstream. No existe token MCP nuevo. Emisor contenido otra vez: GitHub false y auth-server-00016-srj
Ready100%, internalAuth false verificado. Reader/gateway no cambiados. Nueva clasificación JOSE local
mantiene validación y respuesta pública; registrar sólo enums, nunca payload/cause/token.
Azure CLI y documentación Microsoft no justifican cambiar tenant, firma ni claims: investigar con el
diagnóstico publicado antes de repetir canary. Evidencia y fuentes en TASK-1836 §Callback real rechazado.

## Corrección de la solicitud interactiva — 2026-09-05 21:48 UTC

Diagnóstico e4977392b publicado en auth-server-00017-mrd y activado temporalmente en
00018-w7g. El intento real request21:47:13.951Z / callback21:48:03.553Z se rechazó
con `jwt_expired`; no hubo token MCP. Emisor apagado nuevamente: GitHub false y
auth-server-00019-4sg Ready100%.

La solicitud pasa de `max_age=0` a `prompt=login`. Microsoft documenta que prompt login
solicita credenciales; el mantenedor MSAL documentó efectos de max_age corto sobre exp,
pero ese antecedente no prueba el lifetime del ID token de este intento. No se amplía
tolerancia de exp ni se aceptan tokens expirados. auth_time sigue obligatorio y firmado,
no futuro, dentro de 600 segundos y posterior a la transacción server-side menos 60 segundos.
Se retira únicamente el orden auth_time<=iat, que OIDC no exige: el instante de
autenticación no se deduce del instante de emisión retrospectivo. Firma, issuer, audiencia,
nonce, PKCE, tenant y object ID siguen vigentes. Nuevo canary pendiente.

Fuentes: [Microsoft OIDC](https://learn.microsoft.com/en-us/entra/identity-platform/v2-protocols-oidc),
[MSAL discussion598](https://github.com/AzureAD/microsoft-authentication-library-for-python/discussions/598).

## Follow-up 22:04 UTC — Microsoft completado, consentimiento en reparación

SSO consume22:01:26.817Z success en61d5fe1f0; ya no jwt_expired. El siguiente authorize
rechazó consent_context_unavailable porque usó reader externo para binding interno.
Corrección local separa la proyección de nombre interna y comprueba población. Readback PG
real y pruebas unitarias correctos; cero tokens MCP. Emisor OFF rev22-8n5/GitHub false.
Publicación y nuevo authorize con sesión humana pendientes; no reutilizar el callback OAuth.
