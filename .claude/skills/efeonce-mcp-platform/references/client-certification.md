# Certificación de clientes externos Efeonce MCP

> Contrato durable. Los IDs, conteos, revisiones y resultados fechados viven en la matriz/manifiesto de la task
> activa; esta referencia no los duplica.

## Frontera

La certificación técnica usa una organización sintética dedicada, no comercial y eliminable. No reutilices una
party con historia append-only ni presentes el resultado como piloto cliente. El primer cliente consentido tiene
su propia task y gate.

Cada cliente se registra por `producto + versión + local|hospedado + redirect + mecanismo`. Separa discovery,
consentimiento, token, catálogo visible, dispatch, refresh, revoke y cleanup. Un verde en una etapa no cierra las
demás.

## Ownership del OAuth canary

- DCR público del canary: `software_id=run_id`, callback exacto, PKCE S256, allowlist base; es run-owned.
- CIMD o client ID compartido por un vendor: es shared. Nunca se borra ni se reclama como propiedad de la corrida.
- El cleanup borra hijos del DCR run-owned por `client_id`; no debe barrer un cliente compartido por sujeto,
  correo o fecha. Todo cliente no marcado bloquea el apply.

## Discovery después de TASK-1813

- Con auth nativo ON, los dos PRM del gateway deben ser equivalentes y anunciar sólo
  `https://auth.efeonce.org` + `efeonce.mcp.read`. Los scopes superiores llegan sólo por el challenge `403`.
- La metadata del authorization server y el DCR/CIMD se leen en `auth.efeonce.org`. Las rutas AS y `/register`
  del gateway deben responder `404`; `OAUTH_PUBLIC_CLIENT_ID` no configura comportamiento.
- TASK-1813 cerró sólo después de verificar `1.2.0` en producción, el rollback y el regreso a la revisión Ready,
  más login/renovación post-cutover y lectura real base-only en Claude Code, Codex, Claude.ai, Claude Desktop y
  ChatGPT. En cada rollout posterior repite login fresco, sesión nueva, lectura real, negativo write y refresh
  post-TTL por cliente; una pantalla de callback o un conector visible no sustituyen ese recorrido.
- Una certificación base-only prueba interoperabilidad del cliente, no autoridad multiorganización. Esa capacidad
  interna pertenece a TASK-1844 y debe elegir una organización objetivo por llamada contra el reader canónico,
  sin listas o comodines en el JWT ni widening del scope de bootstrap.

## Claude

- Claude Code mínimo `2.1.196`; fija `oauth.scopes="efeonce.mcp.read"`. No uses
  `authServerMetadataUrl`: puede reemplazar el discovery normal y ensanchar el conjunto solicitado.
- La versión histórica `2.1.186` pidió el catálogo completo y falló cerrado. Conserva esa fila al repetir con una
  versión nueva.
- Claude.ai/Desktop/Cowork/mobile usan el conector remoto hospedado y callback
  `https://claude.ai/api/mcp/auth_callback`; un login CLI no certifica ese carril. Para una corrida eliminable,
  elige **Usa tu propio cliente OAuth**, registra un DCR público con `software_id=run_id`, deja el secreto vacío,
  conserva **Siempre requerido** + **HTTP transmisible** y no aceptes el CIMD detectado como asset de la corrida.
- Esas superficies hospedadas comparten la infraestructura de conexión y la identidad OAuth del conector. Una
  invocación adicional desde Desktop certifica esa UI, pero no implica por sí sola un tercer DCR: reconcilia los
  clientes realmente persistidos y nunca inventes un asset de cleanup por contar superficies.
- Certifica consentimiento de la organización exacta, sólo lectura, una tool permitida, write denegado, refresh
  post-TTL sin widening, rotación, revocación y readback.

## ChatGPT, Codex y superficie

- En ChatGPT verifica la app importada, el catálogo filtrado, una llamada real y refresh post-TTL. La ausencia de
  `offline_access` no es éxito ni bloqueo por sí sola: manda la renovación observada.
- En Codex un `ERR_BLOCKED_BY_CLIENT` después del callback puede ser sólo cierre visual. Exige confirmación del CLI
  y lectura desde una sesión nueva.
- Toda tool visible conserva schemas, `structuredContent`, cuatro annotations y `_meta.securitySchemes` derivado
  de la policy. Dos tools visibles a un cliente no reducen el inventario total del gateway.
- El probe JSON vacío anónimo responde `401`, y autenticado puede responder `400`; nunca `500`.

## Observación y señales

- El monitor de la ventana usa exclusivamente discovery, estado y tools de lectura con los clientes ya registrados.
  No abre nuevos consentimientos, no crea DCR, no reenvía invitaciones y no ejecuta writes ni gasto.
- Un warning heurístico de `issuer` se conserva como observación, pero no bloquea por sí solo cuando el flujo runtime
  completo valida discovery, autorización, token ligado al resource, dispatch y refresh. Tampoco autoriza a falsear
  `issuer` para apagar el warning: registra herramienta/versión y conserva el seguimiento.
- Antes de `delete_after`, el cleanup sólo corre en dry-run. Ningún resultado verde, revocación aislada o fin del
  smoke adelanta la fecha mínima de retiro.

## Cierre

Sólo después de `delete_after`: corta authority, mide deny con token vigente, revoca familias/consents/sesiones, exige
`unexpectedRefs=0` y `deletionReady=true`, aplica con el registration ID exacto, relee cero y apaga ambos gates.
Audit/outbox y assets compartidos de marca/correo se conservan.

Canon:

- `docs/operations/runbooks/mcp-external-canary-certification.md`
- `docs/manual-de-uso/identity/certificar-cliente-mcp-con-canary-sintetico.md`
- `docs/architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md`
- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md`
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`
