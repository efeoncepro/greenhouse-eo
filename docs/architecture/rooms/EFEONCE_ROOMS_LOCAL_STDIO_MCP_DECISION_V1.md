# Rooms — adapter MCP stdio local sobre sesión existente

- Status: **Accepted para implementación LOCAL** por instrucción humana2026-10-29: terminar backend independiente de UI. Sin publicación ni cambios Auth.
- Owner: Platform/MCP; EPIC-052 R13 parcial; TASK-2078.

## Decisión

Construir un adapter stdio local con el SDK TypeScript oficial, paquetes exactos `@modelcontextprotocol/server@2.0.0` y cliente de pruebas `@modelcontextprotocol/client@2.0.0`. La [lista oficial de SDKs](https://modelcontextprotocol.io/docs/sdk), verificada2026-10-29, enlaza TypeScript como SDK oficial. Los exports instalados incluyen McpServer, InMemoryTransport y transportes stdio; se usa el SDK, sin protocolo JSON-RPC manual ni afirmar soporte de cada host por la versión del paquete.

El único gateway MCP remoto Efeonce conserva su dominio, OAuth y gobierno. Este proceso stdio es una herramienta local del operador, sin puerto entrante ni registro/federación pública. No es un relying party nuevo ni acepta bearer alternativo. Reutiliza `scripts/lib/rooms-cli-session.ts`: sesión ya existente, archivo propio0600 sin symlink y origen idéntico. No inicia login ni cambia consentimientos/grants de Auth; la API Rooms revalida autoridad en cada llamada.

## Contrato y presupuesto

Toolset estático `read` por defecto: sólo un reader router. `--toolset authoring|invitations|media|collaboration|presentation|integrations|multimedia|all` habilita la familia explícita; all presenta9tools: un reader router con unión discriminada, siete familias de comandos y preview de importación. Read/write nunca se mezclan; las cuatro annotations se emiten explícitamente y se verifican por tools/list real. Comandos/payloads se derivan de los schemas canónicos Rooms, incluido CAS e idempotencyKey obligatorio. El adapter no define permisos ni lógica de negocio.

El manifest coteja cada operación canónica con binding o exclusión con razón. Alias históricos de workspace/permisos se documentan; permisos efectivos ya viajan en DTOs autorizados. OTP/browser/device y transferencia binaria no se convierten en herramientas de filesystem. Uploads de bytes se hacen por UI/CLI autorizado; no se exponen paths arbitrarios, bytes base64 ni URLs de transferencia firmadas. Si un receipt incluye descriptor local se omite ese campo con `omittedSensitiveFields` explícito; se conservan IDs/revisión/estado para readback.

Origen fijo HTTPS, salvo loopback HTTP explícito; sin credenciales en URL, path/query arbitrarios ni redirects. Relectura del archivo de sesión por llamada, timeout15s, body<=1MiB, respuesta<=256KiB y error explícito en vez de truncamiento silencioso. Error upstream sólo conserva códigos allowlisted; nunca texto/stack/provider. Defensa adicional bloquea firmas/credencial de sesión en output. stdout pertenece al SDK; diagnósticos propios mínimos por stderr.

## Verificación y alcance

Tests deterministas de inventario, schemas, cuatro annotations serializadas, presupuesto medido, errores/redacción, origen/redirects/tamaño y archivo privado. Cliente MCP real con InMemoryTransport llama HTTP loopback real, backed por PG efímero y primitives canónicos, para write/readback/replay/revoke. Stdio se prueba con SDK client, sin configurar apps ni producción.

Esto acredita operación MCP local de los contratos disponibles y exclusiones explícitas. No acredita cliente remoto, consentimiento OAuth delegado, gateway público, delivery binaria por MCP, rollout, cohorte cliente ni UI de Claude Design. La federación remota requerirá contrato de provider y autorización independientes.

## Evolución y rollback

Sin schema/migración ni grants automáticos. Retirar el proceso/config local revierte el adapter; receipts de operaciones ejecutadas permanecen por contrato. Cambiar el inventario o descripción exige gate/contexto medido y versionado del adapter; no tocar versión ni manifiesto del gateway hermano.

## Evidencia local 2026-10-29

9testsPASS0skip incluyendo clienteSDKstdio, SDK→HTTP→PG y revocación. Tools/list serializado: defaultread13227B (1tool), presentation22219B (2tools), all168242B (9tools),73operaciones canónicas cubiertas o excluidas. Estimación de contexto:3307/5555/42061tokens a4bytes/token, no tokenización medida de un host/modelo. Por eso la configuración default sólo expone lectura. No se conectó ningún host externo ni se cambió el gateway.

Candidato local verificado3c7bcb5 y fronteras de release: [recibo29Oct](../../audits/rooms/2026-10-29-backend-local-completion.md).
El cierre de la task local no certifica interfaz, proveedores reales ni producción.
