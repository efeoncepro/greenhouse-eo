# Efeonce MCP — auditoría de interoperabilidad OAuth con Codex y Claude

- Fecha: 2026-09-02; última lectura pública: `2026-09-02T22:51:26Z`.
- Alcance: discovery público, código del gateway, configuración declarativa, pruebas y clientes.
- Runtime inspeccionado: `https://mcp.efeonce.org/mcp`.
- Código inspeccionado: checkout compartido `../efeonce-mcp`, HEAD `58517f00e550748e271c9b2138970d32290e0c80`, limpio al comprobarlo. Este SHA identifica código local, **no acredita la revisión desplegada**.
- Cliente observado: Codex CLI `0.152.0`, distribuido en `/Applications/ChatGPT.app/Contents/Resources/codex`.
- Seguimiento: [TASK-1813](../tasks/to-do/TASK-1813-efeonce-mcp-oauth-client-interoperability.md).

## Conclusión

El discovery de Efeonce anuncia al gateway como authorization server pero publica el issuer de Microsoft Entra.
Codex rechazó la conexión antes de abrir el flujo interactivo. No basta con agregar el servidor a su configuración,
leer una skill o proporcionar un client ID. La contingencia de pre-registro debe cubrir además scopes, callbacks,
configuración de despliegue y diferencias entre clientes. No se ha aplicado esa contingencia.

El requisito de igualdad de issuer ya está en [RFC 8414 §3.3](https://www.rfc-editor.org/rfc/rfc8414.html#section-3.3):
no depende de adoptar una revisión nueva de MCP. No se debe resolver falsificando el issuer ni desactivando su validación.

## Evidencia observada

| Plano               | Evidencia                                                                                                                                                                              | Qué demuestra / límite                                                                           |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Protected resource  | GET `/.well-known/oauth-protected-resource` → 200; `resource=https://mcp.efeonce.org/mcp`; `authorization_servers=[https://mcp.efeonce.org]`                                           | El gateway se anuncia como AS.                                                                   |
| AS metadata         | GET `/.well-known/oauth-authorization-server` → 200; issuer `https://login.microsoftonline.com/a80bf6c1-7c45-4d70-b043-51389622a0e4/v2.0`; registro `https://mcp.efeonce.org/register` | El issuer difiere del anunciado.                                                                 |
| Sin credencial      | POST `/mcp`, `tools/list`, sin Authorization → 401                                                                                                                                     | El endpoint sigue protegido. No demuestra login ni lectura autorizada.                           |
| Challenge           | `Bearer resource_metadata="https://mcp.efeonce.org/.well-known/oauth-protected-resource", scope="efeonce.mcp.read"`                                                                    | El challenge anuncia scope sin cualificar, distinto de metadata.                                 |
| Scopes metadata     | Cinco scopes cualificados: base, Globe read, funding write, SEO write y Hiring read                                                                                                    | Anunciar scopes no equivale a concederlos; el login no debe pedir automáticamente todos.         |
| Codex               | Intento previo en esta conversación: `OAuth authorization server issuer does not match authorization metadata origin`                                                                  | Fallo antes del navegador/token; no prueba que el siguiente paso funcione al corregir discovery. |
| Configuración local | Se añadió `[mcp_servers.efeonce]` con la URL canónica a `/Users/jreye/.codex/config.toml`; registry enabled, auth unknown                                                              | Registrado, **no autenticado**. No se volvió a modificar en esta investigación.                  |
| Claude              | ADR/runbook registran conexión de Claude Code el 2026-08-06                                                                                                                            | Evidencia documental histórica; no se realizó login nuevo de Claude en esta auditoría.           |

No se consultaron credenciales almacenadas, no se copiaron tokens entre clientes y no se ejecutaron herramientas
de negocio. La lectura de metadata no permite afirmar cuál es el consentimiento efectivo actual en Entra.

## Hallazgos de código y pruebas

1. **Discovery inconsistente deliberadamente.** `../efeonce-mcp/src/app.ts` monta el shim sólo con
   `config.oauth.publicClientId`. Sobrescribe `authorization_servers` con el origin del gateway, pero el handler
   AS devuelve `config.oauth.issuer` de Entra. `/register` retorna un ID fijo y eco de redirect URIs; no registra
   aplicaciones ni prueba que Entra acepte esas URLs. El control efectivo de redirects se debe verificar en Entra.
2. **Apagar el shim altera también los scopes.** La cualificación `${config.publicUrl}/${scope}` está dentro de
   ese mismo `if`; sin shim la metadata vuelve a scopes sin cualificar. El challenge usa directamente los scopes
   internos en ambos modos. Deben separarse scope requestable de Entra y claim `scp` validado por el gateway.
3. **La configuración OFF no es durable hoy.** `.github/workflows/deploy.yml` usa
   `${OAUTH_PUBLIC_CLIENT_ID:-32617b87-e7ef-493a-838f-1ff3f0213b93}`. Una variable ausente o vacía restaura el
   cliente/shim en el siguiente deploy. Borrar sólo la env de Cloud Run no resuelve la fuente declarativa.
4. **Los tests del shim no verifican el recorrido que falla.** `test/dcr-shim.test.ts` prueba ID fijo, metadata
   PRM y ausencia de `/register` sin shim. No solicita el handler AS ni contrasta su issuer con el PRM. El test
   verde sostiene la forma actual, no conformidad de discovery.
5. **El canary no es equivalente a un cliente nuevo.** `scripts/oauth-canary.mjs` construye `authority` desde
   tenant y llama directamente `/authorize` y `/token`; usa `http://localhost:8765/callback`. No descubre el AS
   a partir del recurso. Su happy path puede pasar mientras `codex mcp login` falla. No se ejecutó el canary aquí.
6. **Pre-registro no evita discovery en Codex.** En el código de la versión `rust-v0.152.0`,
   `OauthLoginFlow::new` llama `resolve_authorization_manager` aun con `oauth_client_id`. La resolución carga y
   valida metadata. Además, la URL de callback puede incorporar un identificador específico del servidor;
   no se puede asumir que sea el callback del canary.
7. **La documentación necesita matices por cliente y fecha.** La frase local «los clientes todavía no aplican
   la igualdad de issuer» ya no describe el intento observado de Codex. Claude Code documenta pre-registro y un
   override de discovery; esto no prueba que claude.ai o Desktop tengan la misma configuración ni que el operador
   la esté usando. La etiqueta de una app tampoco acredita sus grants.

Fuentes primarias de cliente: [flujo OAuth de Codex 0.152.0](https://github.com/openai/codex/blob/rust-v0.152.0/codex-rs/rmcp-client/src/perform_oauth_login.rs),
[resolución de metadata](https://github.com/openai/codex/blob/rust-v0.152.0/codex-rs/rmcp-client/src/oauth_client_registration.rs)
y [configuración OAuth de Claude Code](https://code.claude.com/docs/en/mcp#use-pre-configured-oauth-credentials).

## Incertidumbres que la implementación debe despejar

- **Posible defecto independiente de cliente:** [Codex #40885](https://github.com/openai/codex/issues/40885)
  reporta en `0.149.1` rechazo aun con PRM/issuer coherentes. No se reprodujo ese escenario en `0.152.0` y no se
  atribuye a él nuestro fallo. Hace falta un fixture conforme con recurso y AS distintos, además del fixture
  deliberadamente inconsistente, antes de afirmar que modificar el gateway basta.
- **Callbacks y permisos efectivos:** leer la app registration real y el comportamiento/versiones de los clientes;
  conservar grants y redirects ajenos. No inferir compatibilidad del eco de `/register` ni del consentimiento viejo.
- **Productos Claude distintos:** identificar cuáles usa el operador. Claude Code es el mínimo de regresión;
  claude.ai/Desktop deben quedar con evidencia propia o explícitamente no certificados, no heredar su resultado.
- **Prueba en entorno previo:** verificar si existe lane no productivo que permita OAuth real con resource canónico
  y redirects válidos. No inventar otro resource ni abrir ingress para facilitar el test. Si no existe, exigir un
  plan de canary productivo acotado aprobado y rollback antes de cambiar tráfico.
- **Read mínimo disponible:** preferir catálogo/manual `get_greenhouse_skill` o reader SEO sin gasto ya autorizado.
  Globe puede estar hibernado; esta task no debe reactivarlo ni comprar datos para probar auth.

## Partición de ownership y seguridad

`TASK-1626` conserva foundation del gateway y providers; `TASK-1813` será follow-up acotado para reparar esta
interoperabilidad de clientes internos y su regresión de discovery. Hay overlap físico: se coordina antes de
editar `app.ts`, configuración, deploy y docs; no se concede ownership exclusivo del repo completo.

`TASK-1631` conserva broker/identidad B2B, CIMD y grants por tenant/capability (superseded por EPIC-044: el
emisor es TASK-1828/1829; el binding, TASK-1631, aplicado 2026-09-04). No se duplica aquí. `TASK-659`
describe auth hosted del MCP interno de Greenhouse, no esta reparación sobre el gateway ya desplegado.
`TASK-1654` aparece como formalización pendiente en comentarios/docs, pero no se encontró archivo ni fila propia
en el registry; no es una implementación pendiente que deba asumirse existente.

El incidente Git de las skills Berel es otro plano. Esta investigación no atribuye el mismatch OAuth a esos
commits ni lo corrige con merge/rebase/cherry-pick. Crear la task no autoriza cambiar ramas, push, deploy,
registrar aplicaciones, ampliar grants o editar el playbook de Notion.

## Recomendación de diseño, no solución validada

Evaluar primero discovery directo al issuer Entra + client ID pre-registrado, conservando un solo resource.
Resolver cualificación y mínimos de scopes independientemente del modo, y dar al despliegue una configuración
explícita que no reactive el shim accidentalmente. Sólo adoptar tras evidencia en los clientes/versiones objetivo.
Si el cliente rechaza metadata conforme, resolver su compatibilidad por una versión/ruta soportada o registrar
el bloqueo upstream; no debilitar TLS/issuer/audience ni convertir el gateway en un nuevo authorization server.

El cierre exige distinguir: configuración registrada → OAuth terminado → herramienta visible en una sesión
nueva → lectura real sin gasto → rechazos negativos preservados. Ningún paso sustituye al siguiente.
