# Plan — TASK-1813 Compatibilidad OAuth del MCP Efeonce con Codex y Claude

> Estado final: plan ejecutado y TASK-1813 cerrada. Las referencias siguientes a `in-progress`, rollout pendiente,
> runtime previo o acciones por autorizar describen gates intermedios conservados como historia de ejecución.
> Estado: aprobado por el operador el 2026-09-07 (`P1`, esfuerzo `Medio`).
> Preparado: 2026-09-07.
> Rama/checkout: Greenhouse `develop`; `efeonce-mcp` `main`; checkouts compartidos, sin cambio de rama ni worktree.
> Alcance autorizado: implementación local y verificación. Sin push, deploy, release, cambios Entra ni limpieza
> de credenciales/sesiones.

## Discovery summary

- TASK-1832 ya certificó Codex `0.153.4`, Claude Code `2.1.263`, Claude.ai y Claude Desktop `1.46388.4`, además
  de ChatGPT hospedado: login/consentimiento base-only, dos tools read-only, lectura real y refresh post-TTL
  donde corresponde. Claude Code `2.1.186` permanece como versión no soportada y caso histórico.
- La causa original no está cerrada como invariante. El PRM productivo anuncia el emisor nativo y el origin del
  gateway; la metadata de este último sigue devolviendo issuer Entra. El catálogo mezcla scopes bare y
  cualificados e incluye clases de escritura, lo que reproduce el bootstrap excesivo de clientes antiguos.
- `../efeonce-mcp/.github/workflows/deploy.yml` usa un fallback de shell para `OAUTH_PUBLIC_CLIENT_ID`; una
  variable ausente o vacía vuelve a activar el shim. `.env.example` y el comportamiento del workflow discrepan.
- El gateway conserva verificación multi-issuer, policy por tool y recheck de autoridad. Retirar el shim de
  discovery no requiere quitar soporte a tokens Entra ya emitidos ni tocar providers, grants o datos.
- No existe un harness conductual que demuestre que el fixture con issuer distinto al origen falla y que un
  resource server separado de un authorization server coherente pasa. Los tests actuales prueban forma de rutas,
  no la regla que rompió Codex.
- `efeonce-mcp` está limpio en `main` y alineado con `origin/main` `171965c`; format, typecheck y 153/153 tests
  pasan. Greenhouse tiene WIP ajeno en docs compartidos; el agente principal será el único editor y preservará
  hunks no relacionados.
- La revisión MCP vigente `2025-11-25` permite varios authorization servers, pero recomienda scopes mínimos y
  exige que el cliente descubra cada AS mediante RFC 8414/OIDC. La multiplicidad no legitima publicar metadata
  cuyo `issuer` no coincide con el documento descubierto.

### Solution quality assessment

La causa raíz es la mezcla de tres responsabilidades en `OAUTH_PUBLIC_CLIENT_ID`: valor de un cliente Entra,
interruptor del shim y selector de discovery. La solución elimina esa sobrecarga: Efeonce ID queda como discovery
soportado; la validación Entra permanece como compatibilidad de tokens legacy; los permisos siguen gobernados por
scope delegado + policy/capability downstream. No se agregará un bypass por cliente ni se ampliará ningún scope.

## Access model

- `routeGroups`: no aplica.
- `views` / `authorizedViews`: no aplica.
- `entitlements`: no cambian; el gateway sigue revalidando authority/capability por tool y organización.
- `startup policy`: sí cambia el contrato de configuración OAuth/discovery del gateway.
- Decisión: discovery y consentimiento seleccionan el emisor; nunca sustituyen grants, membership, capability,
  audience ni el recheck previo al dispatch.

## Architecture decision

- ADR existente: `EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md`,
  `EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md` y
  `EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md`.
- Delta propuesto: retirar el shim DCR Entra del camino soportado ahora que Efeonce ID ofrece DCR/CIMD conforme y
  la matriz objetivo está verde. Con auth nativo habilitado, el PRM anunciará sólo `https://auth.efeonce.org` y
  el scope base mínimo. El verifier seguirá aceptando tokens Entra válidos para sesiones legacy, pero Entra no
  será bootstrap/discovery por omisión.
- `OAUTH_PUBLIC_CLIENT_ID` deja de decidir comportamiento y se retira del deploy/config soportados junto con
  `/register` y la metadata AS espejada del gateway. No se falsea el issuer y no se crea otro broker.
- Scopes adicionales se descubren incrementalmente por `403 insufficient_scope`; la lista de bootstrap no
  anuncia writes. El challenge conserva la forma requestable del AS activo y la validación interna conserva
  claims bare.
- Rollback del cambio: revisión Cloud Run previa exacta. No se reintroduce el shim en código como fallback
  silencioso; un retorno permanente necesitaría nueva decisión y evidencia de clientes.
- Status requerido antes de implementar: aprobación humana de este plan/Delta. Deploy y cutover requieren una
  autorización posterior independiente.

## Backend/data contract

- Rigor: `backend-critical`; impacto `integration`; sin DB, migración, backfill ni writes de negocio.
- Source of truth: `../efeonce-mcp/src/config.ts`, `src/app.ts` y `.github/workflows/deploy.yml`; contratos en los
  ADR/runbooks Greenhouse.
- Contrato público: PRM root/path-specific, AS nativo RFC 8414/OIDC, challenge `WWW-Authenticate`, DCR del emisor
  y verificación JWT multi-issuer.
- Invariantes: resource único, issuer/origen coherentes, bootstrap base-only, audience exacta, write scopes
  fail-closed, cero dispatch sin scope/authority, sin secretos en cliente/browser/logs.
- Idempotencia/concurrencia: no cambia estado; metadata es determinista por config y ambos well-known deben ser
  equivalentes. Las requests concurrentes no comparten contexto de autorización.
- Rollout: repo-only hasta autorización separada. El cambio entra sin deploy automático; la task queda
  `code complete, rollout pendiente` hasta SHA/revisión/tráfico/readback y clientes post-cutover.
- Errores/señales: 401 sin/invalid token, 403 insufficient scope, 503 sin OAuth/authority; ningún body upstream.

## Skills

- Discovery/contrato: `efeonce-mcp-platform`, `mcp-craft`, `software-architect-2026`.
- Configuración: `greenhouse-secret-hygiene`; no se leerá ni mutará material secreto.
- Cierre: `greenhouse-qa-release-auditor` y `greenhouse-documentation-governor`.

## Subagent strategy

`fork` de auditoría read-only, ya autorizado por el operador; implementación secuencial por el agente principal.

- Subagente docs: mapeó ACs transferibles y archivos canónicos, sin editar.
- Subagente gateway: inspeccionó código/config/tests y ejecutó checks locales, sin editar.
- Subagente evidencia: contrastó matriz TASK-1832 y readbacks públicos, sin editar.
- Contrato compartido: ningún subagente edita; `/root` posee todos los cambios y consolida los tres reportes.

## Execution order

1. Registrar el Delta en el ADR del gateway y rebaselinar TASK-1813 con la decisión aprobada, sin reescribir
   historia ni absorber TASK-1831/1832/1843.
2. En `efeonce-mcp`, separar discovery nativo de verificación Entra legacy; retirar el shim y su activación por
   `OAUTH_PUBLIC_CLIENT_ID`; publicar sólo scope base en bootstrap.
3. Agregar harness conductual mismatch/conforme, equivalencia PRM root/path, bootstrap sin writes y negativos
   base/write/issuer/audience/expiry/OAuth ausente con spy de cero dispatch.
4. Actualizar contrato operativo, documentación funcional/manual, `AGENTS.md`, `.env.example` y los mirrors de
   `efeonce-mcp-platform`; dejar versionado soporte mínimo por cliente y retirar la referencia huérfana TASK-1654.
5. Ejecutar `pnpm check`, `git diff --check` y status limpio de artefactos generados en `efeonce-mcp`; luego gates
   de task/ops/skills/QA/docs/context en Greenhouse.
6. Registrar evidencia local y dejar TASK-1813 en `in-progress` con estado `code complete, rollout pendiente`.
   Un cutover posterior autorizado releerá SHA/revisión/tráfico/config, repetirá clientes y podrá cerrar la task.

## Files to create

- `../efeonce-mcp/test/oauth-discovery.test.ts` — harness conductual de discovery/issuer/scopes y regresiones.

## Files to modify

- `../efeonce-mcp/src/app.ts` — PRM nativo mínimo; retiro de AS espejado y `/register` legacy.
- `../efeonce-mcp/src/config.ts` — retirar el client ID como interruptor y conservar trust multi-issuer.
- `../efeonce-mcp/test/dcr-shim.test.ts` — retirar/reemplazar fixtures del shim por contrato de no exposición.
- `../efeonce-mcp/test/app.test.ts` y/o `test/native-integration.test.ts` — bootstrap/negativos/cero dispatch.
- `../efeonce-mcp/.github/workflows/deploy.yml`, `.env.example`, `AGENTS.md` — configuración durable y canon local.
- `docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md` y, si el índice lo exige,
  `docs/architecture/DECISIONS_INDEX.md` — Delta aceptado y trazabilidad.
- `docs/operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md`,
  `docs/documentation/plataforma/efeonce-mcp-gateway.md`,
  `docs/manual-de-uso/plataforma/operar-efeonce-mcp-gateway.md` — triple documentación.
- `.codex/skills/efeonce-mcp-platform/SKILL.md` y `.claude/skills/efeonce-mcp-platform/SKILL.md` — soporte de
  clientes y discovery vigente, preservando el WIP no relacionado.
- `docs/tasks/complete/TASK-1813-efeonce-mcp-oauth-client-interoperability.md`, `docs/tasks/README.md`,
  `docs/tasks/TASK_ID_REGISTRY.md`, EPIC-044, `Handoff.md` y `changelog.md` — progreso/evidencia/handoff.

## Files to delete

- Ningún archivo de datos o historial.
- `../efeonce-mcp/test/dcr-shim.test.ts` sólo se elimina si toda su cobertura válida queda migrada al nuevo
  harness en el mismo cambio; de otro modo se reescribe con el contrato de retiro.

## Risk flags

- Cambiar discovery afecta clientes nuevos y relogin; la matriz debe repetirse después del deploy autorizado.
- Entra sigue siendo issuer aceptado por verifier; retirar discovery no equivale a revocar tokens ni sesiones.
- El challenge debe ser requestable por el AS activo sin mezclarlo con el claim validado por el gateway.
- No tocar grants, redirects, apps Entra, providers, canary/cleanup TASK-1832 ni el rollback de transporte TASK-1843.
- `Handoff.md`, README, registry, EPIC, DECISIONS_INDEX y skills contienen WIP ajeno; staging/commits deben ser por
  hunks propios y nunca incluir ese trabajo.

## Checkpoints

- Plan y Delta aprobados por el operador el 2026-09-07: retirar el shim Entra del discovery soportado,
  conservar la verificación de tokens Entra legacy y hacer de Efeonce ID el único AS anunciado cuando el
  carril nativo está habilitado.
- El deploy/cutover no está autorizado en este goal. Tras cerrar el cambio local, se requerirá un checkpoint
  independiente para promover, medir rollback y repetir la matriz cliente contra la revisión nueva.
