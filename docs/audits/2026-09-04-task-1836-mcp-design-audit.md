# TASK-1836 — auditoría de diseño MCP

- Fecha: 2026-09-04 (America/Santiago).
- Objeto: `docs/tasks/in-progress/TASK-1836-efeonce-id-internal-workforce-mcp-authorization.md`.
- Skills aplicadas: `efeonce-mcp-platform`, `mcp-craft`, `mcp-craft/security-and-auth.md` y matriz
  `efeonce-mcp-platform/references/verification-matrix.md`.
- Método: lectura del contrato, contraste de código local en Greenhouse y gateway, revisión de fuentes
  primarias MCP y correspondencia entre riesgos, responsables, pruebas y rollout.
- Veredicto inicial: requería cambios de diseño antes de implementar.
- Veredicto tras edición: hallazgos incorporados como requisitos verificables; apta para Slice 1 de
  decisión/contrato. Slice 2 y activación siguen condicionados al ADR y a las pruebas de consumers.
- Límite: revisión documental y estática. No se ejecutó login, pentest, llamada MCP autenticada ni cambio
  de runtime. Las observaciones de código no se presentan como vulnerabilidades productivas explotadas.

## Hallazgos

| ID | Severidad de diseño | Hallazgo y consecuencia | Evidencia | Corrección y dueño |
|---|---|---|---|---|
| A1 | Alta | Reutilización de sesión sin contrato de assurance/procedencia: podría inventar MFA o convertir login externo en autoridad interna | `persons/types.ts` no tiene método Entra; `oauth/subject.ts` exige nivel/tiempo; `persons/sessions.ts` deriva nivel de factor fuerte y reciente | TASK-1836 §11/14: mapping explícito, no usar magic link para contexto corporativo, tests refresh/frescura |
| A2 | Alta | Token nativo útil no garantiza que el cliente lo descubra: faltaban metadata, challenges, resource y coexistencia real | Gateway `src/app.ts` publica metadata y shim; `src/auth/token-verifier.ts` sigue un issuer y combina roles/scopes | TASK-1836 §12 + 1831/1832: discovery completo, scopes mínimos y denegación antes de dispatch; verifier antiguo no habilita interno nativo |
| A3 | Alta | El flujo upstream no diferenciaba login OIDC de proxy OAuth ni probaba abuso de SSO/consent por otro cliente | §3 enviaba upstream antes de consent; fuente MCP distingue precondiciones de confused deputy | §13/14: ADR fija perfil, tokens upstream aislados, aprobación MCP por cliente, prueba A/B; preconsent si hay proxy de APIs |
| A4 | Alta | Pruebas de tool permitida/denegada omitían listado, llamadas directas, handles y concurrencia | Skill exige controles por request; task sólo cubría allow/deny genérico | §12/14 + 1831: impedir fuga por caché/listado/cursor y estado compartido; manifiesto sigue dueño del inventario |
| A5 | Alta | Secuencia de rollout activaba cohorte antes de coordinar gateway/UI, contradiciendo gate descrito arriba | Runtime evidence y Production verification sequence de la versión preauditoría | Orden unificado: backend y consumers compatibles OFF -> readback -> cohorte -> canaries; test de token nuevo ante verifier viejo |
| A6 | Media | Entra aparecía como propuesta abierta pero Slice 2 ordenaba implementarlo sin condición explícita | Architecture Alignment frente a Scope Slice 2 | Slice 2 condicionado al ADR; si cambia alternativa, actualizar task/consumers antes de código |
| A7 | Baja | Referencia residual al diseño de “659” dentro del orden de ejecución de task nueva | Slice ordering hard rule | Corregida a TASK-1836; TASK-659 sólo aparece en contexto histórico legítimo |

Estado de todos: **corregido en especificación; implementación y validación pendientes**. La severidad
califica el riesgo de ejecutar un contrato incompleto, no un hallazgo confirmado del servicio publicado.

## Observaciones que no deben sobredimensionarse

- `oauth/token.ts` pasa `authTime: now` en refresh. Esto exige revisar la semántica antes de usar el tiempo
  para assurance corporativo; no demuestra por sí solo que el gateway actual esté concediendo MFA.
- `oauth/grants.ts` toma máximo de versiones. A=10/B=2->3 prueba que el máximo no cambia; no prueba
  por sí solo dispatch no autorizado: un reader que reevalúa memberships/grants puede denegar. La task
  conserva el caso como prueba end-to-end obligatoria, no como incidente demostrado.
- El verifier local del gateway mezcla `scp`, `scope` y `roles` y hace fallback `azp` a `sub`.
  TASK-1831 ya posee su reemplazo; esta auditoría refuerza la dependencia y no traslada ownership a 1836.
- El consentimiento previo a autorización upstream de la guía MCP tiene precondiciones de proxy OAuth.
  No se impone sin análisis a un login OIDC puro, ni se omite si luego se agregan scopes/API upstream.
- Se conserva UI impact `none` porque esta task define primitives y contratos; las pantallas y su
  wireframe/flow siguen en TASK-1835. Se añadió la exigencia al consumer, no implementación UI escondida.

## Fuentes y evidencia

Código Greenhouse:

- `src/lib/auth-server/oauth/subject.ts`
- `src/lib/auth-server/oauth/authorize.ts`
- `src/lib/auth-server/oauth/token.ts`
- `src/lib/auth-server/oauth/grants.ts`
- `src/lib/auth-server/persons/types.ts`
- `src/lib/auth-server/persons/subject-port.ts`
- `src/lib/auth-server/persons/sessions.ts`
- `src/lib/identity/external-access/types.ts`
- `src/lib/identity/external-access/resolve-external-access.ts`

Gateway (checkout hermano leído, sin modificación):

- `../efeonce-mcp/src/auth/token-verifier.ts`
- `../efeonce-mcp/src/app.ts`
- `../efeonce-mcp/src/config.ts`

Fuente primaria MCP consultada el 2026-09-04:
[Security Best Practices, revisión 2026-07-28, repositorio oficial](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/docs/docs/2026-07-28/tutorials/security/security_best_practices.mdx).
Sustenta el análisis condicional de confused deputy, consentimiento por cliente, token passthrough y mix-up.
No se afirma que todos los clientes implementen esa revisión. Las rutas web `latest/basic/authorization`
y `latest/basic/security_best_practices` no se pudieron resolver con el navegador de investigación;
por ello se usó el documento oficial versionado y se exige verificar compatibilidad por cliente al ejecutar.
Los requisitos adicionales de mínimo scope, manifiesto y challenges se aplican como contrato de las skills
del repositorio; no se atribuyen a una versión web que no se pudo leer.

## Cierre de auditoría

- Task nueva conserva ID/epic, marcadores de plantilla y Zone 2 vacía.
- Requisitos A1–A7 integrados; nuevos casos de aceptación sin marcar como implementados.
- TASK-1831/1832/1835 reciben exigencias de sus fronteras; TASK-1833 recibe esta auditoría como insumo.
- No se requiere nuevo ADR para registrar esta auditoría: la aceptación del ADR de TASK-1836 sigue
  siendo entregable de Slice 1; no se cambió la decisión vigente del sistema.
- Validación documental: task lint de documentos tocados, diff whitespace, closure y contexto estricto.

## Seguimiento 2026-09-05 — corrección solicitada

TASK-1836 §2 ahora contiene propuesta D1–D7 concreta, tradeoffs y campos nuevos identificados como propuestos.
Se reemplazó el listado de decisiones sin solución por OIDC puro, login corporativo primary, step-up local,
contexto opaco firmado y permisos efectivos por contexto sin caché positiva inicial. La tabla Correction
trace liga A1–A7 a solución y prueba. Los valores de Entra/organización siguen sujetos a readback.

Se corrigió además el cuerpo de TASK-1831: ya no contradice sus propios criterios al exigir exclusivamente
Entra para toda tool interna; no deriva población del issuer nativo y verifica permisos/contexto además de gv.
El rollback tiene gates de emisión y dispatch, incluyendo tokens emitidos antes de OFF. TASK-1832/1833/1835
reciben el mismo contrato. Formalización ADR y evidencia runtime siguen pendientes; no hay código cambiado.
