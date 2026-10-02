# TASK-1904 — Instalación, consentimiento y operación de Efeonce MCP

## Meta

- Status: `draft`
- Owner task: `TASK-1904 — Efeonce MCP para Codex y ChatGPT`
- Related wireframe: [ficha e instalación](../wireframes/TASK-1904-efeonce-openai-plugin.md).
- Intended route / surface: fuente privada del host → Efeonce ID → conversación.
- Flow type: `cross-route`
- Primary primitives: ficha del host, autorización OAuth y shell existente del emisor.
- Copy source: manifest del paquete y fuente canónica de auth.

## Flow Brief

- Primary user: persona elegible con acceso al cliente OpenAI.
- Entry moment: plugin privado disponible por marketplace o registro de workspace soportado.
- Successful outcome: identidad reconocida, conexión autorizada, skills/guía cargadas y operación comprobada.
- Primary decision/action: consentir permisos del cliente identificado y elegir objetivo autorizado.
- Non-goals: onboarding de clientes comerciales nuevos o creación automática de grants.

## Surfaces Involved

| Surface | Role | Desktop behavior | Mobile / compact behavior | Primitive |
|---|---|---|---|---|
| Ficha privada | Reconocer e instalar | Ficha nativa con marca | Vista web soportada sin overflow | Host |
| Conexión | Iniciar OAuth | Modal/ventana según host | Mantener retorno contextual | Host |
| Efeonce ID | Autenticar y consentir | Shell canónico, cliente/scopes honestos | Flujo vertical accesible | Emisor existente |
| Conversación | Descubrir y operar | Chat nuevo con tools/skills | Sólo cliente que lo soporte | Composer nativo |
| Configuración | Recuperar o retirar | Reconectar/deshabilitar/revocar diferenciados | Controles nativos | Host + issuer |

## Flow Map

1. Entry: verificar cliente, versión, plan/policy y fuente privada; no requiere publicación pública.
2. Primary action: instalar paquete o registrar conexión según el host; obtener mapping real.
3. Transition: OAuth hacia Efeonce ID con metadata/resource correctos; mantener state y retorno seguro.
4. User decision: login si corresponde; consentir o cancelar para ese cliente y scopes concretos.
5. Completion: callback válido → chat nuevo → discovery de autoridad/manual → primera lectura verificada.
6. Recovery / exit: cancelar no conecta; error distingue autenticación de permisos; reconectar según causa.
7. Upgrade: cambiar versión, refrescar caché según host y comprobar tools/skills sin duplicados.
8. Retirement: deshabilitar/desinstalar paquete; revocar consentimiento cuando se retire acceso delegado.

## Interaction Triggers

| Trigger | Source | Target state/surface | Keyboard equivalent | Notes |
|---|---|---|---|---|
| Instalar/conectar | Ficha | authorizing | Enter/Espacio | Guardar config no es éxito final |
| Consentir | Efeonce ID | validating | Submit accesible | Cliente/permisos visibles |
| Cancelar | Host/emisor | disconnected | Escape donde lo soporte el host | Sin bucle de reintentos |
| Prompt natural | Chat | running | Enviar | Cargar skill/manual antes del flujo |
| Reconectar | Error auth | authorizing | Activar enlace | No ampliar grants |
| Retirar | Configuración | disconnected | Control nativo | Desinstalar y revoke se comprueban separados |

## State Machine

| State | Meaning | Entry trigger | Exit trigger | UI requirements |
|---|---|---|---|---|
| unavailable | Policy/plan impide instalación | Preflight | Acceso habilitado | Bloqueo concreto y responsable |
| disconnected | Paquete disponible sin sesión | Install/cancel/revoke | Conectar | No afirmar herramientas operativas |
| authorizing | Login/consentimiento pendiente | Conectar | Callback/cancel/error | Pending y salida segura |
| validating | Callback recibido, operación no probada | OAuth success | Lectura correcta/error | Sin éxito prematuro |
| ready | Catálogo y lectura probados | Verify | Prompt/revoke/expire | Nombre y permisos honestos |
| running | Operación en curso | Prompt autorizado | Resultado/error | Espera, paginación y retries acotados |
| denied | Objetivo/capability no permitido | 403/policy | Objetivo permitido | No recomendar bypass |
| degraded | Provider/429/timeout | Error operacional | Retry acotado | No inventar resultados |
| reconnect | Sesión no válida | 401/revocation | Login nuevo | Sin filtrar token/error crudo |

## Routing Contract

- Route changes: `path` controlado por host y issuer; no rutas nuevas del portal.
- Canonical URL: `https://mcp.efeonce.org/mcp`; issuer `https://auth.efeonce.org`.
- Deep-link behavior: sólo retornos del contrato OAuth; nunca URLs de retorno arbitrarias.
- Back button behavior: volver/cancelar no concede permisos ni duplica clientes OAuth.
- Reload behavior: recuperar estado o reiniciar autorización segura; no reutilizar code consumido.
- Shareability: compartir fuente de instalación sin tokens/codes ni enlaces de sesión personales.

## Focus & Accessibility

- Initial focus: acción primaria del host; input requerido en login existente.
- Escape behavior: cancelar modal donde esté soportado; no autorizar implícitamente.
- Click-away behavior: según host, con estado desconectado si no finaliza OAuth.
- Focus restore: control de conectar al cerrar ventana si el host permite; comprobar.
- Modal vs non-modal semantics: no introducir modal propio; respetar semántica nativa.
- Screen reader announcement: pending, error y resultado con texto; auth mantiene implementación canónica.
- Keyboard traversal: ficha → consentir/cancelar → conversación sin mouse obligatorio.
- Reduced motion: sin motion propia; conservar preferencias del host/emisor.

## Data & Command Boundaries

- Readers: discovery OAuth, `initialize`, `tools/list`, status y lecturas autorizadas del provider.
- Commands: autorización, refresh/revoke del emisor; writes sólo bajo contrato del dominio.
- API routes: superficies existentes del issuer/gateway; endpoints exactos desde discovery.
- Optimistic updates: ninguna afirmación de conexión operativa hasta readback real.
- Cache / invalidation: versión del paquete y digest gateway; refrescar tools/skills tras upgrade.
- Audit / signals: correlación y actor del gateway/issuer, evidencia sanitizada por host.
- Tenant / access boundary: identidad + scopes + capabilities + objetivo intersectado, fail closed.

## Failure Paths

| Failure | User-facing behavior | Recovery | Notes |
|---|---|---|---|
| denied | Operación no permitida | Elegir objetivo autorizado | No filtrar otras organizaciones |
| not found / empty | Acceso o resultado vacío explicado | Revisar catálogo/acceso | Distinguir vacío de 403 |
| partial / degraded | Resultado incompleto declarado | Retry acotado | No repetir writes |
| stale data | Indicar versión/estado observado | Actualizar paquete/catálogo | No regenerar auth sin diagnóstico |
| timeout / API error | Operación no confirmada | Consultar estado antes de retry | Sin errores crudos |
| dirty exit | OAuth cancelado, sin conexión certificada | Reiniciar flujo válido | No hay edición de dominio en onboarding |
| host unsupported | Fuente/skill no soportada en ese cliente | Vía privada soportada o bloqueo documentado | No extrapolar instalación local a hosted |

## GVC Scenario Plan

- Scenario: instalación nueva y transición selectiva desde canary, en ambos hosts primarios.
- Scenario file: evidencia propuesta en `docs/audits/mcp/TASK-1904/`; crear durante ejecución.
- Route: registro privado real, issuer y conversación nueva; capturar URLs sin secretos.
- Viewports: desktop 1440×1000 y web 390×844 donde corresponda.
- Required steps: instalar → consentir → leer → denegar cross-tenant → reconectar → actualizar → retirar.
- Required captures: ficha, consentimiento, retorno, primera lectura y recuperación.
- Required `data-capture` markers: ninguno en host de terceros; reusar GVC existente en auth propia.
- Assertions: actor correcto, catálogo autorizado, marca visible, sin duplicados ni éxito ficticio.
- Scroll-width checks: auth propia sin overflow; registrar límites del host.
- Accessibility/focus checks: teclado, cancelación, retorno y zoom.
- Reduced-motion evidence: sin animación propia; preferencias conservadas.

## Design Decision Log

- Decision: usar los recorridos nativos de cada cliente sobre el mismo MCP.
- Alternatives considered: configuración MCP sola; plugin privado completo; directorio público como requisito.
- Why this pattern: el usuario necesita instalación, marca y skills sin depender de revisión pública.
- Reuse / extend / new primitive: `reuse`; paquete extiende metadata/routing sin cambiar auth.
- Open risks: soporte de skills y metadata depende del host; requiere lectura y capturas actuales.
- Follow-up: ampliar autoridad o UI sólo bajo tarea dueña específica.

## Acceptance Checklist

- [ ] Task declara este Flow y el wireframe asociado.
- [ ] OAuth completo, cancelación y recuperación probados por cliente.
- [ ] Navegación, foco y estados en desktop/web móvil documentados con evidencia.
- [ ] Readers/commands/policy existentes respetados; sin lógica de negocio en el cliente.
- [ ] Actualización, rollback, desinstalación y revoke probados por separado.
- [ ] Capturas demuestran secuencia y resultados; ningún bloqueo de cuenta se marca PASS.
