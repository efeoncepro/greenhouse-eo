# Compatibilidad de clientes MCP

> Verificado contra documentación oficial de Anthropic, OpenAI y MCP el 2026-09-07. Esta página caduca con la
> versión del cliente: registra producto, versión y superficie exactos en cada certificación.

## Separa el cliente del servidor

Un servidor conforme puede fallar con una versión concreta de un cliente. Conserva la evidencia por
`producto + versión + local|hospedado`; no sobrescribas una falla antigua con el resultado de una actualización.
CLI, web, desktop y runtime cloud se certifican por separado aunque compartan marca o SDK.

Un badge `connected`, DCR `201`, metadata `200`, catálogo importado o URL OAuth bien formada sólo acreditan una
etapa. La certificación exige consentimiento visible, token para el resource exacto, `tools/list`, una llamada
permitida, una negativa y revocación efectiva. Cuenta eventos de tools o Request/Response/Error reales:
`exit=0` con cero llamadas, el resumen del modelo o una integración marcada Connected no prueban dispatch.
Un rechazo de inicialización/refresh puede demostrar corte previo al dispatch; no lo rotules como payload de
una tool. Conserva las rondas sin llamadas y los reintentos por separado.

## OAuth y refresh

- El request anónimo de transporte recibe `401` con `WWW-Authenticate`; no encapsules el challenge en un
  resultado MCP `200`.
- Un probe con JSON vacío se autentica antes de validar el payload: anónimo `401`; autenticado puede ser
  `400 invalid_request`; nunca `500`.
- Selecciona el scope mínimo desde el challenge/PRM. No amplíes grants ni `scopes_supported` para acomodar un
  cliente defectuoso.
- Prueba refresh después del TTL. Si el cliente omite `scope`, el emisor conserva el conjunto original; nunca
  entrega el catálogo completo ni eleva permisos. Verifica rotación, invalida el refresh anterior y prueba revoke.
- DCR/CIMD/pre-registro identifican al cliente, no autorizan al usuario. En fixtures eliminables, un client ID
  compartido por el vendor es `shared`: no se borra por haber sido observado.

## Cambios de autoridad detrás de una conexión estable

Si el contrato separa identidad consentida de targets resueltos por llamada, incorporar un target autorizado
no requiere crear otro cliente ni copiar permisos al JWT. El listado es discovery: pagina, revalida el cursor
y autoriza de nuevo el target antes de ejecutar. Prueba retirada selectiva con otro target aún válido y
restauración sin reconectar. Un cambio material de scopes/clase de autoridad conserva su nuevo consentimiento.
Este patrón no permite prometer acceso automático a todo target nuevo ni omitir el recheck del provider.

Para metadata extensible, distingue lo anunciado por el cliente de lo soportado y registrado por el emisor.
No habilites un grant desconocido para aceptar su documento, ni rechaces un flujo compatible únicamente por
un grant extra cuando el contrato permite intersección. Valida el shape completo y prueba que el endpoint
rechaza el intercambio no soportado. Evidencia de implementación, no regla universal del protocolo:
`efeonce-mcp-platform/references/client-certification.md` (TASK-1844, 2026-09-08).

## Superficie observable

Inspecciona el `tools/list` que ve el cliente. Cada tool conserva `inputSchema`, `outputSchema`,
`structuredContent` y las cuatro annotations explícitas. El texto es mirror de compatibilidad, no una segunda
verdad. `_meta.securitySchemes` es compatibilidad de OpenAI: se deriva de la misma policy y no reemplaza la
autorización server-side.

## Diferencias Claude/OpenAI que importan

- Claude Code `>=2.1.196` permite fijar `oauth.scopes` y dejó de solicitar automáticamente todo el catálogo del
  authorization server. No uses `authServerMetadataUrl` sin revisar que no ensanche scopes.
- Claude.ai/Desktop/Cowork/mobile usan infraestructura hospedada; el callback documentado es
  `https://claude.ai/api/mcp/auth_callback`. Una prueba CLI local no certifica ese carril. Si el fixture debe
  borrarse, usa en la UI de Claude un cliente OAuth propio, DCR público marcado con el `run_id` y secreto vacío;
  el CIMD detectado por Claude es compartido y no pertenece al cleanup.
- Las superficies hospedadas de Claude comparten el conector y su identidad OAuth. Probar Desktop después de web
  certifica otra UI, no demuestra ni exige un DCR adicional: el inventario de clientes se obtiene del emisor, no
  del número de superficies probadas.
- En OpenAI verifica schemas, annotations y security metadata visibles en la app hospedada, una acción real y
  continuidad post-TTL.

## Observación y retiro

- Un monitor de estabilidad reutiliza el cliente existente y sólo ejecuta discovery, estado y tools de lectura. No
  registra clientes, abre consentimientos, reenvía invitaciones, ejecuta writes ni consume presupuesto proveedor.
- Un warning heurístico de `issuer` no sustituye la prueba runtime. Si discovery, authorization code + PKCE, token
  ligado al resource, dispatch y refresh pasan con validación real, conserva el warning como seguimiento no
  bloqueante; nunca falsees `issuer` para silenciarlo.
- El cleanup de un fixture temporal es dry-run hasta `delete_after`. Sólo después de esa barrera se corta authority,
  se prueba deny, se revocan hijos run-owned, se exige readback cero y se apagan los gates correspondientes.

Fuentes oficiales:

- https://code.claude.com/docs/en/mcp
- https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md
- https://claude.com/docs/connectors/building/authentication
- https://claude.com/docs/connectors/building/testing
- https://developers.openai.com/plugins/reference
- https://developers.openai.com/plugins/build/auth
- https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization
