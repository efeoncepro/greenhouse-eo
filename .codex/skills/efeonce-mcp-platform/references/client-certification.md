# Certificación de clientes Efeonce MCP

> Contrato durable. Los IDs, conteos, revisiones y resultados fechados viven en la matriz/manifiesto de la task
> activa; esta referencia no los duplica.

## Frontera

Separa el canary externo de TASK-1832 y la cohorte interna v2 de TASK-1844. El primero usa una organización
sintética dedicada, no comercial y eliminable; el segundo una identidad interna autorizada y targets de prueba
con ownership, vencimiento y retiro canónico. No reutilices una party con historia append-only, alteres un canary
ajeno ni presentes una certificación técnica como piloto cliente. El primer cliente comercial conserva su gate.

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
  ChatGPT. En un cambio de discovery/autoridad certifica las superficies afectadas con login fresco, sesión
  nueva, lectura real, negativo write y refresh post-TTL. Reutiliza evidencia vigente para capas sin cambios;
  una pantalla de callback o un conector visible no sustituyen ese recorrido.
- Una certificación base-only por sí sola no prueba autoridad multiorganización. La matriz v2 de TASK-1844
  exige targets explícitos contra el reader canónico, sin listas/comodines en JWT ni widening del bootstrap.

## Matriz interna v2 y continuidad de permisos

Carga `native-authority.md` y el [manual interno](../../../../docs/manual-de-uso/identity/usar-mcp-interno-multiorganizacion.md).
V1 exige una reautorización inicial por cliente para pasar a v2; sus consentimientos y refresh permanecen v1.
Después, altas/bajas de organizaciones cubiertas por permisos vigentes no requieren reconectar. No confundas
esta continuidad con nuevos scopes/clases de autoridad, revocación global o recuperación de un rollback OFF.

Certifica con la misma familia: listado paginado A/B sin C; A/B allow; C, missing e inválido deny; A después
del deny; B retirada con A vigente; B restaurada sin reconectar. Añade refresh posterior al TTL y revocaciones
de contexto/familia con token aún vigente. Para concurrencia exige eventos solapados con targets/resultados
separados; dos respuestas en una UI no demuestran paralelismo. El provider conserva sus límites: una lectura
`no_entitlement` sin módulo es válida y no autoriza gasto.

La matriz de cierre del 2026-09-08 acredita Codex, Claude Code y Claude hospedado/una UI Desktop para una
identidad interna. No extiende la certificación v2 a ChatGPT hospedado, otras personas ni otros providers.
Versiones, familias, timestamps y excepciones se leen en la [auditoría QA](../../../../docs/audits/mcp/TASK-1844_INTERNAL_MULTI_ORG_QA_2026-09-08.md).

## CIMD compatible sin ampliar grants

El emisor valida `grant_types` como strings no vacíos ni whitespace y exige `authorization_code`. Registra
sólo la intersección soportada `{authorization_code, refresh_token}`: un vendor puede anunciar grants
adicionales sin invalidar su flujo compatible, pero `/oauth/token` debe rechazar su intercambio como
`unsupported_grant_type`. El caso `urn:ietf:params:oauth:grant-type:jwt-bearer` no habilita JWT bearer.
Prueba metadata extendida, arrays/identificadores inválidos y el rechazo real del grant no soportado;
conserva PKCE, callbacks, anti-SSRF, auth method y allowlist de scopes. Canon: contrato OAuth §3.

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
- En v1/externo certifica la organización exacta; en v2 el consentimiento del actor y los targets autorizados.
  En ambos: sólo lectura, tool permitida, write denegado, refresh post-TTL sin widening, rotación y revoke.
- El conector interno permanente puede usar el CIMD compartido del vendor. No impongas DCR run-owned fuera
  de una prueba eliminable. Si Claude impide otro conector al mismo endpoint, inventaría el existente: sólo
  una autorización expresa que abarque reemplazarlo permite retirar esa conexión y su familia exacta.
  TASK-1844 autorizó únicamente sustituir la conexión hospedada Claude del canary; registro, otros clientes
  y ventana global permanecieron. No declares siete días continuos de esa conexión sustituida.
- Claude Code 2.1.263 necesitó `claude mcp login <nombre-configurado>` después de rollback OFF/ON; reiniciar
  el proceso no bastó. Registra esa recuperación y la nueva familia; no la atribuyas a incorporar una nueva
  organización ni la generalices a futuras versiones. El login reutiliza SSO cuando sea válido, sin copiar tokens.

## ChatGPT, Codex y superficie

- En ChatGPT verifica la app importada, el catálogo filtrado, una llamada real y refresh post-TTL. La ausencia de
  `offline_access` no es éxito ni bloqueo por sí sola: manda la renovación observada.
- En Codex un `ERR_BLOCKED_BY_CLIENT` después del callback puede ser sólo cierre visual. Exige confirmación del CLI
  y lectura desde una sesión nueva.
- Toda tool visible conserva schemas, `structuredContent`, cuatro annotations y `_meta.securitySchemes` derivado
  de la policy. Dos tools visibles a un cliente no reducen el inventario total del gateway.
- El probe JSON vacío anónimo responde `401`, y autenticado puede responder `400`; nunca `500`.

## Evidencia del cliente real

- Lee eventos nativos de tool calls o los bloques Request/Response/Error del conector. Prosa del modelo,
  `exit=0`, estado Connected y cero tool calls no acreditan dispatch: conserva esas rondas como fallidas/no
  ejecutadas y registra la repetición exitosa por separado.
- Distingue `authorization_denied` del payload de fallos `invalid_token`/`invalid_grant` en inicialización o
  refresh y del estado UI que pide autenticar. Pueden acreditar un corte anterior al dispatch, pero no son
  dos respuestas MCP de deny. No conviertas una revocación controlada en diagnóstico de inestabilidad.
- Si falla la resolución de metadata antes de llamar tools, verifica DNS/health y etapa exacta antes de
  cambiar credenciales. Un cliente hospedado puede funcionar mientras falla DNS local; no imputes esa
  ronda al gateway ni cuentes una recuperación espontánea como efecto de un cambio no demostrado.
- Mide refresh desde expiración original + timestamps del ledger, y revoke desde mutación canónica hasta
  negativa con JWT vigente. Separa p95 de transporte mezclado del p95 exclusivo del reader. Sin medición
  no declares cero dispatch después de revoke ni capacidad suficiente para ampliar la cohorte.

## Observación y señales

- El monitor de la ventana usa exclusivamente discovery, estado y tools de lectura con los clientes ya registrados.
  No abre nuevos consentimientos, no crea DCR, no reenvía invitaciones y no ejecuta writes ni gasto.
- Un warning heurístico de `issuer` se conserva como observación, pero no bloquea por sí solo cuando el flujo runtime
  completo valida discovery, autorización, token ligado al resource, dispatch y refresh. Tampoco autoriza a falsear
  `issuer` para apagar el warning: registra herramienta/versión y conserva el seguimiento.
- Antes de `delete_after`, el cleanup del canary sólo corre en dry-run. Ningún verde, revoke o fin del smoke
  adelanta el retiro. Una excepción expresa debe nombrar el asset/conexión y conservar el resto de la ventana;
  no se convierte en autorización para borrar el registro completo o los clientes compartidos.

## Cierre

Para el canary externo, después de `delete_after`: corta authority, mide deny con token vigente, revoca
familias/consents/sesiones, exige `unexpectedRefs=0` y `deletionReady=true`, aplica con el registration ID
exacto, relee cero y apaga sus gates. Audit/outbox y assets compartidos de marca/correo se conservan.

Para fixtures internos, sigue el command de la task: verifica ownership, retira sólo overrides/relaciones
propias, conserva historia y relee targets denegados y ausentes de discovery. No revoques conexiones
internas definitivas: contexto compartido no significa familia idéntica. El retiro de fixtures no apaga
la cohorte productiva autorizada ni el canary externo.

Canon:

- `docs/operations/runbooks/mcp-external-canary-certification.md`
- `docs/manual-de-uso/identity/certificar-cliente-mcp-con-canary-sintetico.md`
- `docs/architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md`
- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md`
- `docs/architecture/agent-invariants/IDENTITY_WORKFORCE_AGENT_INVARIANTS.md`
