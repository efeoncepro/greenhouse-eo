# Google Ads con agentes: autorización y verificación de lectura

Estado al 17-10-2026: **piloto local de operador comprobado**. Este manual describe la conexión
ensayada y sus controles; no anuncia una CLI, endpoint, pantalla o conexión de producto disponible.
El [ADR](../../architecture/GREENHOUSE_GOOGLE_ADS_INTEGRATION_DECISION_V1.md) y la
[arquitectura](../../architecture/GREENHOUSE_GOOGLE_ADS_MEASUREMENT_ARCHITECTURE_V1.md) gobiernan
la futura incorporación al producto. [Resultado funcional](../../documentation/growth/google-ads-measurement.md).

## Antes de operar

1. Confirmar en Cloud consola/CLI **`julio.reyes@efeonce.org`**, proyecto **`efeonce-group`**.
2. Confirmar que la cuenta Ads autorizada es **`6862539491`** y el usuario **`jreyes@efeoncepro.com`**.
3. Definir operaciones permitidas. Este piloto autoriza sólo `googleAds.search`; no mutate, upload,
   creación de acciones, cambio de goals, campañas, presupuesto o publicación GTM.
4. Comprobar versión API/campos, nivel de acceso del proyecto, cliente/callback y custodia privada.
   GA4/GSC conectados no conceden el scope Ads. No reutilizar sus refresh tokens para ampliar acceso.

## Autorizar

El cliente web existente del proyecto tenía un callback local ya registrado. Se ensayó un listener
temporal limitado a loopback con state de un solo uso, PKCE y vencimiento; el callback valida audiencia,
email verificado exacto y scope concedido antes de consultar. Una nueva ejecución debe generar state y
verifier nuevos; no recuperar códigos de historial ni reutilizar una URL OAuth anterior.

El usuario de Ads concede `adwords` junto con identidad `openid`/email. **Ads no ofrece un scope OAuth
separado de sólo lectura**: el runner y la autoridad de producto restringen operaciones; el rol de
Ads puede imponer límites adicionales. No describir el token como incapaz de escribir por su scope.
Un consentimiento nuevo o ampliado debe tener autorización explícita del operador.

La marca del cliente observado es **Claude** y el contacto del desarrollador es
`julio.reyes@efeonce.org`. Google mostró una aplicación no verificada. La verificación del teléfono
acredita al usuario; no verifica la aplicación. En este piloto el operador confirmó el permiso y
completó el aviso/consentimiento. Para rollout, revisar marca y requisitos de verificación antes de
presentarlo a más usuarios; no cambiar Cloud, audiencia o permisos para eludir ese proceso.

El operador fijó **Efeonce** como marca obligatoria para la autorización de producción. La marca es
del proyecto OAuth: renombrar solamente el client no cambia por sí solo la pantalla. Antes del cambio,
inventariar consumidores compartidos y preparar readback/regresión de GA4/GSC, además del nuevo
consentimiento Ads visible como Efeonce. La verificación de aplicación/scopes se comprueba aparte.

## Probar y leer el resultado

1. Resolver la credencial sólo en memoria desde el almacén privado autorizado. No pegar bearer tokens,
   client secrets, códigos o URLs OAuth en terminal, chat, docs o navegador.
2. Consultar identidad del **target fijo** `6862539491`; exigir ID exacto antes de continuar.
3. La prueba directa devolvió `403 USER_PERMISSION_DENIED`. La ruta comprobada usa
   `login-customer-id: 9531478329`; el endpoint conserva `/customers/6862539491/`.
   No probar managers/cuentas adicionales por enumeración o por coincidencia de nombre.
4. Leer conversion settings/owner, acciones, account/campaign/custom goals e inventario. Usar los
   [templates y recibos de la auditoría](../../audits/growth/2026-10-17-google-ads-api-discovery.md).
5. Registrar versión, UTC, target, ruta de acceso, request ID, HTTP/enum de error, filas y cobertura
   de paginación. Una lista truncada es parcial; un error no es cero filas.
6. Separar resultado de acceso, inventario y medición. El piloto comprobó acceso y configuración;
   no envío, procesamiento, atribución, serving ni mejoras de rendimiento.
7. Cerrar el listener local. Mantener recibos/credencial ignorados por Git con `0700`/`0600` y
   política de custodia; no promover automáticamente el grant a una conexión multiempresa.

Resultado esperado de este snapshot: `Efeonce - Agencia`, CLP, America/Santiago, owner de conversiones
`customers/6862539491`, tracking ID `18432951465`. La cuenta es nueva: `NOT_CONVERSION_TRACKED`,
dos acciones GA4 `HIDDEN`, no primarias, y cero filas de campañas/goals en las consultas realizadas.
Releer antes de actuar: son observaciones fechadas.

## Diagnóstico y próximos pasos

| Situación | Acción |
| --- | --- |
| Se muestra el usuario incorrecto | Detener antes de conceder acceso; elegir el principal autorizado |
| State vencido, callback inválido o código usado | Reiniciar el flujo con state/PKCE nuevos; nunca omitir la validación |
| `USER_PERMISSION_DENIED` sin manager | Usar sólo la ruta manager ya comprobada; si falla, revisar acceso sin ampliar IAM |
| `UNRECOGNIZED_FIELD` | Contrastar campos con versión API y corregir sólo la consulta; conservar el error |
| HTTP 200 sin campañas | Registrar lista vacía con cobertura; en esta cuenta nueva es coherente |
| UI vacía pero API devuelve acciones `HIDDEN` | Conservar ambos snapshots y los estados; no habilitar ni borrar acciones |
| `invalid_grant` / revocación | Detener requests; reautorizar sólo con el principal y permiso aprobados |
| Se requiere Data Manager | Nueva API/scope y gate de acción propios; este grant no los autoriza |

El siguiente trabajo implementa binding por organización y primitive de lectura, con API/CLI por
contrato, custodia, errores, paginación, revocación y pruebas de aislamiento. La activación publicitaria
requiere además acción/owner/objetivo, intención, consentimiento, identidad, valor, escritor único,
preview/readback y autorización de publicación. No usar un evento sintético o una escritura real
para completar una prueba de acceso de lectura.

La siguiente unidad debe entregar también la **CLI de consulta**: ayuda/discovery, conexión/cuenta,
campañas, acciones/goals y reporting de métricas por fechas. Entry point propuesto `pnpm google-ads`,
aún inexistente; los comandos y criterios de aceptación están en arquitectura §5.4. Conexión/reader
y CLI comparten autoridad, resolver de tokens y reglas; esta primera entrega no incluye mutaciones.
