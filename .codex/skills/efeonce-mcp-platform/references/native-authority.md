# Autenticación corporativa y autoridad MCP nativa

Contrato durable de TASK-1836, su consumer TASK-1831 y la autoridad interna v2 de TASK-1844. Lee primero
`docs/architecture/EFEONCE_INTERNAL_NATIVE_AUTHORITY_DECISION_V1.md` y
`docs/architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md`; la secuencia operativa y el estado fechado
viven en `docs/operations/EFEONCE_INTERNAL_AUTH_ROLLOUT_RUNBOOK_V1.md` y
`docs/operations/TASK-1844_INTERNAL_MULTI_ORG_ROLLOUT.md`. Esta referencia no certifica flags, versiones
desplegadas, elegibilidad de clientes ni finalización de matrices. Para operar, usa el
[manual interno](../../../../docs/manual-de-uso/identity/usar-mcp-interno-multiorganizacion.md).

## Fronteras que no se pueden colapsar

- Microsoft OIDC autentica al colaborador; Efeonce ID crea su sesión propia. Ni el ID token upstream,
  ni una cookie Greenhouse, ni un login exitoso autorizan MCP. Sólo el emisor nativo emite el access token
  para el resource MCP después de resolver contexto, scopes y consentimiento por cliente.
- La identidad corporativa se resuelve por tenant + OID verificados y enrollment canónico; nunca por
  email, dominio, `azp` o una invitación externa artificial. La población persistida del binding es
  inmutable e independiente de la clase del issuer. No asumir que issuer nativo implica población externa.
- El contexto v1 fija una organización. V2 conserva organización, población y binding como **ancla del
  actor**, y separa los targets por llamada. `gv` valida el ancla; nunca es el máximo entre organizaciones
  ni se compara con la revisión opaca de un target. Igualdad de `gv` sola no concede acceso.
- Un contexto v2 tiene ID distinto y versión inmutable. Exige consentimiento fresco por cliente; activar
  flags no promueve un consentimiento, code ni refresh v1. Refresh conserva cliente, contexto, scopes y
  `auth_time`, sin elevar autoridad. No serialices organizaciones en claims, uses comodines ni sumes
  permisos entre contextos.
- La sesión corporativa no hereda step-up local desde `amr`/`acr` upstream. Refresh conserva `auth_time`;
  no puede volver reciente una autenticación antigua. El callback valida firma, tenant/issuer, audiencia,
  expiración, nonce, PKCE, transacción de un uso y frescura firmada de `auth_time`. La solicitud usa
  `prompt=login`; no restaures `max_age=0` ni impongas `auth_time <= iat` como arreglo para un fallo de
  Entra. Nunca relajes expiración para aceptar un token rechazado.
- Los writers compartidos componen estado, audit, outbox y versión en la misma transacción. Audit interno
  no sustituye audit compartido. Recuperación externa no revoca links internos; reconciliación conserva
  actor, razón, vencimiento y evidencia original, sin fabricar historia.

## Operación interna v2 y nuevas organizaciones

- Una conexión OAuth por persona y cliente puede operar las organizaciones autorizadas en cada llamada.
  Crear una organización no concede acceso: el reader compone usuario activo y único, roles vigentes y su
  alcance, relación canónica con el target y capability efectiva (`base -> role defaults -> approved user
  overrides`). Un permiso de un space no se extiende a todos los spaces; ambigüedad o cobertura insuficiente
  deniega. No crees grants de targets en `external_capability_grants` para simular esta autoridad.
- Para descubrir IDs, llama `efeonce.organizations.list`: `limit` 1–50 (default 20), sin total global.
  Usa `nextAfterOrganizationId` como `afterOrganizationId` de la página siguiente; si el cursor dejó de
  estar autorizado, reinicia sin cursor. La lista contiene únicamente IDs, nombres y capabilities
  autorizados; no es una credencial ni reemplaza la autorización posterior.
- Cada tool org-scoped exige `organizationId` exacta; el reader autoriza ese target sin caché positiva y
  el gateway reemplaza defensivamente el argumento antes del provider. El provider mantiene sus checks
  de módulo, entitlement y regla de negocio. `hasModule=false` / `no_entitlement` puede ser una lectura
  autorizada de un módulo ausente; no lo presentes como fallo OAuth ni como permiso para gastar.
- Altas/bajas posteriores de organizaciones o capabilities se reflejan al releer, sin reconectar mientras
  no cambien materialmente los scopes o la clase de autoridad consentida. No prometas acceso a toda nueva
  organización ni uses una lista guardada como permiso. Nuevos scopes/clases requieren su contrato y
  consentimiento; el reader nunca los añade al token.
- El contrato inicial admite sólo `efeonce.mcp.read` y `growth.seo.observation.read`. Otros providers,
  escrituras, presupuesto y población externa no quedan habilitados por v2. La certificación del
  2026-09-08 cubre una identidad interna; el estado de la cohorte se relee del rollout/ledger y runtime.
  Más usuarios/tráfico requieren medir latencia y errores del snapshot antes de ampliar la cohorte;
  paginar el listado no demuestra capacidad ilimitada ni habilita una caché positiva.

## Revocación y recuperación

- Retirar B debe denegar nuevas llamadas a B manteniendo A si sigue autorizada. Restaurar la relación
  permite releer B sin nuevo consentimiento. Una resolución posterior al commit de revocación debe
  observarla; mide la cota de 60 s con controles positivos, sin prometer cancelar llamadas ya autorizadas.
- Revocar persona/contexto corta toda esa autoridad; revocar una familia sólo debe afectar esa familia.
  En cleanup identifica el grant exacto: un contexto puede contener familias de prueba y definitivas.
  No revoques todas las familias del contexto para retirar sólo la conexión antigua.
- OFF se ejecuta issuer (emisión/refresh), gateway y reader; restore reader, gateway e issuer. Conserva
  schema/historia v1/v2 y el mínimo de writer compatible después de contract. Sigue el runbook gobernado.
- Tras rollback OFF, Claude Code 2.1.263 necesitó login estándar aunque el runtime ya estaba ON; Codex
  recuperó su familia. Si persiste `needs-auth`, usa `claude mcp login <nombre-configurado>` y verifica
  nueva familia/contexto y dispatch. No copies tokens, amplíes scopes ni infieras que todas las versiones
  recuperan igual. Esto es recuperación de rollback, no un requisito al agregar organizaciones.

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

## Invitación externa entregada por el sistema (TASK-1837)

- El gateway es el único llamador de la lane delegada `GET/POST /api/platform/ecosystem/identity/invitations`:
  verifica el JWT de la persona y llama con `(environment, subject)` + `bindingId`, igual que en
  `identity/binding`; el POST va por el command harness con `Idempotency-Key`. La autoridad la resuelve
  Greenhouse (admin designado del binding): el gateway nunca acepta `bindingId` como autoridad venida del
  cliente ni decide por argumentos. 404 con flag OFF o consumer no interno; 403 si el sujeto no es el admin
  de ese binding; 422 auto-elevación o tope de asientos; 429 tope por hora.
- La respuesta nunca expone el token: la invitación llega por correo desde Greenhouse a `/i/<token>` del
  emisor (`issuer_url` del environment). Reenviar rota; revelar es excepción gobernada con audit sin token.
- Scope de escritura nuevo del emisor: `efeonce.mcp.identity.write` (clase «administrar a las personas de mi
  organización»; consentimiento explícito + step-up, nunca en el `scopes_supported` mínimo). Las tools
  `identity.*` del gateway deniegan a Entra y a la población interna: sólo issuer nativo y persona
  `native-external`, con la organización resuelta por membership.
- El consentimiento muestra el host del `redirect_uri` validado; su ausencia es error de render. La federación
  inicial de la lane de invitaciones de `efeonce-mcp` PR #3 fue integrada después del release Greenhouse y del
  flag de Production; cualquier afirmación sobre la revisión servida requiere readback live. `resend`/`revoke`
  delegados aún no están federados.

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
