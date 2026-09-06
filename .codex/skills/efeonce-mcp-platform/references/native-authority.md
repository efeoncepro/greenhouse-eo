# Autenticación corporativa y autoridad MCP nativa

Contrato durable de TASK-1836 y su consumer TASK-1831. Lee primero
`docs/architecture/EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md` y
`docs/architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md`; la secuencia operativa y el estado fechado
viven en `docs/operations/EFEONCE_INTERNAL_AUTH_ROLLOUT_RUNBOOK_V1.md` y las tasks. Esta referencia no
certifica flags, versiones desplegadas, elegibilidad de clientes ni finalización de matrices.

## Fronteras que no se pueden colapsar

- Microsoft OIDC autentica al colaborador; Efeonce ID crea su sesión propia. Ni el ID token upstream,
  ni una cookie Greenhouse, ni un login exitoso autorizan MCP. Sólo el emisor nativo emite el access token
  para el resource MCP después de resolver contexto, scopes y consentimiento por cliente.
- La identidad corporativa se resuelve por tenant + OID verificados y enrollment canónico; nunca por
  email, dominio, `azp` o una invitación externa artificial. La población persistida del binding es
  inmutable e independiente de la clase del issuer. No asumir que issuer nativo implica población externa.
- El contexto seleccionado fija organización, población y binding. `gv` pertenece a ese contexto,
  nunca al máximo de versiones entre organizaciones. Consentimiento, token, refresh y gateway deben
  conservarlo y reevaluar elegibilidad y permisos vigentes; igualdad de `gv` sola no concede acceso.
- La sesión corporativa no hereda step-up local desde `amr`/`acr` upstream. Refresh conserva `auth_time`;
  no puede volver reciente una autenticación antigua. El callback valida firma, tenant/issuer, audiencia,
  expiración, nonce, PKCE, transacción de un uso y frescura firmada de `auth_time`. La solicitud usa
  `prompt=login`; no restaures `max_age=0` ni impongas `auth_time <= iat` como arreglo para un fallo de
  Entra. Nunca relajes expiración para aceptar un token rechazado.
- Los writers compartidos componen estado, audit, outbox y versión en la misma transacción. Audit interno
  no sustituye audit compartido. Recuperación externa no revoca links internos; reconciliación conserva
  actor, razón, vencimiento y evidencia original, sin fabricar historia.

## Consumer multi-issuer

- Mantén verificación separada de issuers/audiencias y deny antes del provider. El gateway transporta
  autoridad verificada hacia readers canónicos; no emite tokens ni decide permisos desde argumentos.
- El carril interno requiere el `jti` firmado y reader de ledger vigente además de contexto y `gv`.
  Revocar una familia debe negar dispatch con access token aún vigente sin invalidar otra familia del
  mismo contexto. No reemplazar esa lectura por una caché positiva de autorización.
- La caché JWKS de claves no es caché de permisos: fallback limitado a la última copia válida sólo ante
  fallos transitorios y dentro de su TTL; rotación exitosa no resucita claves retiradas.
- La coexistencia con Entra legacy no demuestra apertura externa. Conserva sus metadatos y canaries por
  separado. Un provider que rechaza población nativa necesita su propio contrato y pruebas; habilitar el
  verifier no lo vuelve compatible automáticamente.

## Dos entradas de navegador, dos pruebas

1. Abre `/login` sin query ni cookie previa: verifica el botón Microsoft existente, teclado, 390 px y
   redirección al proveedor cuando el flag interno lo permite. Conserva UI/primitives de Claude;
   una condición de visibilidad defectuosa no exige diseñar otro botón.
2. Completa por separado `/oauth/authorize` → login → consentimiento → callback cliente → token → MCP.
   Una sesión reutilizada o un helper local `/start` no prueba la entrada directa ni es UI de producto.

Sólo la ausencia de `return_to` en el inicio directo selecciona `/auth/session`. Valores explícitos
inválidos, vacíos o duplicados no reciben un fallback permisivo. Valida el retorno al iniciar y al
completar: continuación OAuth del mismo issuer o landing exacto `/auth/session`, sin query/hash ni
variante absoluta para ese landing. La entrada directa crea sesión, no un cliente/contexto/token MCP
ficticio. La página HTML y el API JSON de `/auth/session` comparten resolver y revocación; prueba logout.

Para formularios nativos, usa `scripts/auth-server/probe-form-origin.mjs`: un `fetch` con Origin manual
no reproduce el navegador. HTML usa `Referrer-Policy: strict-origin` para conservar Origin propio sin
filtrar query; `no-referrer` puede producir Origin opaco en POST. No aceptes `Origin: null` ni apagues
CSRF para compensarlo. CSP `form-action` gobierna también la cadena POST → redirect al cliente: permite
sólo `self` y el origen del callback previamente validado contra el registro, nunca comodines ni un
origen derivado de un parámetro sin validar. No confundas esta política HTML con la respuesta JSON.

## Evidencia y cierre

Registra cada capa por separado: código/commit; revisión, digest y flags reales de emisor/reader/gateway;
UI pública directa; sesión humana; consentimiento; token; lectura MCP propia y deny ajeno; refresh;
revocación de familia y de grant; OFF/restore de ambos lados. Flags ON, HTTP 200 o metadata correctos no
prueban emisión ni dispatch. Una pantalla Microsoft visible prueba llegada al proveedor, no retorno
humano completo. No marques WebKit, cliente externo o multicontexto como passed por omisión.

Mide la revocación desde la mutación canónica hasta deny con token vigente, con control positivo antes y
después para evitar confundir caída total con aislamiento. Rollback acotado conserva estructura, audit,
cohorte, capabilities y vencimiento; restaura configuración original y hace readback. Cierra listeners
locales y revoca familias de prueba. Mantén códigos/tokens sólo en memoria: evidencia con etapas,
timestamps y enums cerrados, nunca URLs OAuth completas, cookies, claims ni errores JOSE crudos.
