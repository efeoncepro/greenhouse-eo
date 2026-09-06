# Seguridad y autorización

## El servidor como resource server OAuth

Requisitos normativos de la revisión vigente (ver `protocol-radar.md` para la fecha):

- El servidor MCP **MUST** implementar **Protected Resource Metadata (RFC 9728)**.
- **MUST** validar que el token fue emitido **para él** como audiencia (RFC 8707), y **MUST NOT**
  aceptar ni retransmitir ningún otro token. Prohibido el *token passthrough*.
- El cliente **MUST** mandar el parámetro `resource` en autorización y token.
- El servidor de autorización **MUST** ofrecer descubrimiento por RFC 8414 u OIDC Discovery.
- **CIMD (Client ID Metadata Documents) es SHOULD**; **DCR (RFC 7591) bajó a MAY y está
  deprecado**, retenido para servidores de autorización que no soportan CIMD.

🔴 **`scopes_supported` es el MÍNIMO para funcionalidad básica, no el catálogo.** El spec lo dice y
además define la prioridad del cliente: si no hay `scope` en el `WWW-Authenticate` de la 401,
**usa todos los scopes publicados**. Publicar ahí los scopes de escritura hace que todo cliente
pida privilegio máximo en el primer contacto. Es un error que el spec nombra explícitamente.

**El camino correcto es el step-up:** publica el mínimo, y devuelve los scopes que faltan en el
`WWW-Authenticate` del `403 insufficient_scope`. Manda **todos** los que la operación necesita en
un solo desafío: desafiar de a uno fuerza varias vueltas de autorización por una sola operación.

## Granularidad de scopes

**Un scope por clase de radio de daño, jamás uno por capacidad.** Una lista por capacidad
convierte al proveedor de identidad en un espejo a mano de tu registro de permisos, los dos
divergen, y un espejo de autorización divergido es peor que ninguno. El scope responde *"¿puede
este cliente hacer esta CLASE de acción?"*; la capacidad responde *"¿puede este actor, sobre esta
organización?"* y se aplica aguas abajo.

## Clases de ataque, con su precondición

| Ataque | Precondición | Mitigación |
|---|---|---|
| **Confused deputy** | Un proxy con client id upstream estático y registro dinámico aguas abajo | Consentimiento **por usuario y por `client_id`** verificado **antes** de reenviar upstream |
| **Token passthrough / confusión de audiencia** | Aceptar un token no emitido para ti | Validar audiencia siempre; prohibido por el spec |
| **Inyección de prompt por RESULTADOS** | Devolver al agente texto de fuente no confiable | Sólo mensajes de fuentes confiables o plantillas propias |
| **Envenenamiento de descripción / rug pull** | El cliente confía en metadata del servidor | El spec obliga al cliente a tratar las `annotations` como **no confiables** de servidores no confiables |
| **Colisión / sombra entre servidores** | Dos servidores con la misma tool | Prefijo del agregador (obligación del spec) |
| **Fuga cruzada entre clientes** | Reusar una instancia de servidor/transporte entre conexiones | Mantener el SDK al día; aislar por request |
| **SSRF desde tu propio servidor** | Tú también eres CLIENTE: buscas metadata OAuth en URLs que controla el upstream | El spec advierte explícitamente contra validar IPs a mano |

🔴 **El modo de falla más fino del consentimiento:** setear la cookie de consentimiento **antes**
de la aprobación deja una pantalla que se ve correcta y no protege nada. El spec dice que eso
*"vuelve inefectiva la pantalla de consentimiento"*. **Invisible a cualquier prueba funcional** —
sólo lo ve una revisión de código dirigida.

## Asume que la confirmación del cliente nunca ocurrió

El human-in-the-loop es **SHOULD** en todo el spec; las `annotations` son hints que el propio spec
manda desconfiar; y la política de seguridad del proyecto deja **fuera de alcance** las decisiones
de invocación tomadas por el LLM.

**Lo único que puedes hacer cumplir desde el servidor** es el `403 insufficient_scope` que fuerza
un step-up, y —para credenciales o pagos— la elicitation en modo URL, normativamente requerida.

Patrones publicados que sí protegen, de menor a mayor fuerza:

1. **Cotizar y confirmar**: una tool de sólo lectura emite una `idempotencyKey` firmada con los
   términos; la de escritura sólo acepta esa clave y rechaza si los parámetros no calzan exacto.
   Con expiración corta.
2. **Preparar y completar**: aplicar el cambio en una rama temporal, probarlo, y recién entonces
   confirmarlo contra la principal.
3. **Elevación fuera de banda**: sesión de sólo lectura por defecto; la escritura se habilita con
   un código de un solo uso que **el agente nunca ve**, y **expira** (un caso real: 15 minutos).

## Multi-tenencia

Con las sesiones eliminadas del protocolo, tu frontera de tenencia son los **handles** que acuña el
servidor. 🔴 **Vincúlalos al usuario del token verificado** (`<user_id>:<handle>`), **nunca** a un
identificador que venga como argumento. Un handle es un nombre, no una capacidad: revalida la
autorización del llamador en **cada** llamada.

## Evidencia de autenticación frente a autorización

Un login upstream correcto identifica a una persona; no demuestra consentimiento del cliente ni permisos
en el resource server. Verifica por separado sesión, emisión del token para la audiencia, dispatch
permitido y revocación efectiva con token aún vigente. La versión de permisos debe pertenecer al contexto
seleccionado; un máximo agregado entre tenants puede ocultar una revocación. Validar claves desde JWKS
no sustituye reevaluar autoridad. Son criterios de diseño y prueba, no nuevos requisitos del protocolo.

El canary debe atravesar la entrada que usa la persona: una sesión reutilizada o un arranque OAuth con
parámetros puede ocultar un botón ausente en el login directo. Prueba ambas entradas cuando existan.
Registra etapas y tiempos; códigos, tokens, cookies y URLs de callback completas no son evidencia publicable.
