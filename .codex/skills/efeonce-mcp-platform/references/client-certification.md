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

## Claude

- Claude Code mínimo `2.1.196`; fija `oauth.scopes="efeonce.mcp.read"`. No uses
  `authServerMetadataUrl`: puede reemplazar el discovery normal y ensanchar el conjunto solicitado.
- La versión histórica `2.1.186` pidió el catálogo completo y falló cerrado. Conserva esa fila al repetir con una
  versión nueva.
- Claude.ai/Desktop/Cowork/mobile usan el conector remoto hospedado y callback
  `https://claude.ai/api/mcp/auth_callback`; un login CLI no certifica ese carril. Para una corrida eliminable,
  elige **Usa tu propio cliente OAuth**, registra un DCR público con `software_id=run_id`, deja el secreto vacío,
  conserva **Siempre requerido** + **HTTP transmisible** y no aceptes el CIMD detectado como asset de la corrida.
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

## Cierre

Tras la ventana: corta authority, mide deny con token vigente, revoca familias/consents/sesiones, exige
`unexpectedRefs=0` y `deletionReady=true`, aplica con el registration ID exacto, relee cero y apaga ambos gates.
Audit/outbox y assets compartidos de marca/correo se conservan.

Canon:

- `docs/operations/runbooks/mcp-external-canary-certification.md`
- `docs/manual-de-uso/identity/certificar-cliente-mcp-con-canary-sintetico.md`
- `docs/architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md`
- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md`
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`
