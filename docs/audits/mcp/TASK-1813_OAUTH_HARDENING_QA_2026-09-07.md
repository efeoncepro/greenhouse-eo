# QA Release Audit — TASK-1813 OAuth hardening y rollout

## Verdict

`PASS`

Closure state: `complete`

## Scope

- Cambio revisado: discovery/config/deploy/tests/documentación de `efeonce-mcp` `1.2.0` y su contrato en
  Greenhouse.
- Runtime revisado: artefacto local compilado en `127.0.0.1:18080`, CI/Docker, Cloud Run y front door público
  `https://mcp.efeonce.org` hasta `2026-09-08T00:18Z`; clientes Claude Desktop y ChatGPT hospedado incluidos.
- Fuera de alcance: WIP preexistente de TASK-1834, payroll, UI, HubSpot, Teams y otras tasks; no se editó ni se
  usó como evidencia. Hubo push/deploy/traffic rollback autorizados del gateway; no hubo cambio Entra, grant o
  cleanup.

## Risk Classification

| Riesgo | Nivel | Razón |
| --- | ---: | --- |
| Auth/discovery OAuth | Alto | Cambia el bootstrap de todos los clientes nuevos y mantiene una trust lane legacy. |
| Config/deploy Cloud Run | Alto | Retira dos inputs que antes podían reactivar el shim o ampliar scopes. |
| Autorización/tenant | Alto | Un scope incremental nunca puede despachar sin grant y policy exactos. |
| Producción/rollback | PASS | SHA, revisión, imagen, tráfico y rollback/restauración se leyeron y ejercitaron. |

## Injected Skills

- `efeonce-mcp-platform` y `mcp-craft`: protocolo, frontera gateway/emisor y matriz cliente.
- `software-architect-2026`: decisión compartida y compatibilidad legacy sin doble autoridad.
- `greenhouse-secret-hygiene`: retiro declarativo sin leer ni copiar secretos.
- `greenhouse-qa-release-auditor` y `greenhouse-documentation-governor`: riesgo, evidencia y cierre honesto.

## Evidence

| Gate | Resultado | Evidencia |
| --- | --- | --- |
| Gateway integral | PASS | `pnpm check`: format, typecheck, 154/154 tests, 0 fail, 0 skipped, build. |
| Commit/CI | PASS | `cd229069ee9e7f0d1f75d56d08d9dd93833eadd1` en `origin/main`; CI `34162827740` verde. |
| Harness discovery/auth | PASS | Mismatch falla; resource/AS distintos coherentes pasan; PRM root/path iguales; shim 404; base-only; legacy-only cualificado. |
| Negativos | PASS | JWT real de fixture: issuer, audience y expiry inválidos → 401; base ausente → 403; OAuth ausente → 503; cero dispatch. Live: bearer inválido → `401 invalid_token`; anónimo → `401`. |
| Smoke de artefacto | PASS | `dist`: health 200; PRM nativo único/base-only 200; metadata AS y `POST /register` 404; MCP anónimo 401. |
| Contenedor | PASS CI | El runner construyó `efeonce-mcp:cd229069…`; imagen desplegada `sha256:608a4789…b29e`. |
| Runtime público | PASS | `00047-8b5`/100 %/Ready; PRM nativo base-only, shim y register 404, anónimo 401. AS nativo mantiene PKCE S256 + refresh; los env retirados ya no existen en la revisión. |
| Rollback | PASS | 100 % a `00046-6n2`, contrato viejo verificado; restauración 100 % a `00047-8b5`, contrato nuevo repetido. |
| Claude Code post-cutover | PASS | `2.1.263` refrescó base-only y ejecutó status + lectura SEO sin gasto. |
| Codex post-cutover | PASS canary | `0.153.4` emitió token CIMD externo sólo con `efeonce.mcp.read`; una sesión efímera ejecutó status + lectura SEO sin gasto. El primer listener expiró; el retry fresco completó el recorrido. |
| Claude.ai post-cutover | PASS | El conector hospedado repitió una lectura base-only; `no_entitlement`, allowance/budget usados en cero. |
| Claude Desktop post-cutover | PASS | `Claude.app` `1.46388.4` abrió el chat remoto y ejecutó `get_seo_entitlement`: `ok=true`, `no_entitlement`, allowance/budget cero. El DCR hospedado refrescó a `2026-09-07T23:38:30Z`; seis access/refresh, cinco rotados, uno activo y scope base único. Cloud Run registró dispatch 200 en `00047-8b5`. |
| ChatGPT post-cutover | PASS | El chat hospedado con la app `Efeonce` ejecutó una lectura única: `ok=true`, `no_entitlement`, allowance/budget cero y sin escrituras. El DCR pasó de 3 a 4 access/refresh y de 2 a 3 rotados, con uno activo y un único consentimiento `efeonce.mcp.read`; Cloud Run registró `POST /mcp` 200 en `00047-8b5` a `2026-09-08T00:18:00Z`. |
| Codex corporativo | FUERA DEL CIERRE 1813 / brecha 1836+1831 | `jreyes@efeoncepro.com` completó consentimiento sólo para `Efeonce`; PG registra consentimiento activo y code interno no consumido/expirado, sin access/refresh token ni dispatch. El requisito multiorganización no se resuelve ampliando OAuth o el canary. |
| Tool surface | PASS | `surface-baseline.json` conserva 39 tools; `pnpm mcp:manifest:check` Greenhouse conserva 44 tools internas. |
| QA advisory | PASS | `pnpm qa:gates --changed --agent codex --task TASK-1813 --runtime --auth --integration --docs --production --security` terminó 0 y la revisión especializada emitió este veredicto PASS. |
| Lifecycle/docs | PASS local | Task lint 0/0; ADR/runbook/funcional/manual/task/epic/README/registry/project context/handoff/changelog y bundle espejado `efeonce-mcp-platform` sincronizados. |
| Cierre documental | PASS | `pnpm docs:closure-check` terminó 0, con cero warnings y sin dueño documental faltante. |
| Ops lint | PASS con ruido ajeno | Exit 0; una advertencia TASK-1842 y 13 advertencias de paridad de otros epics, fuera de esta unidad. |
| Secret audit Greenhouse | NO APLICA al diff | El comando global terminó 1 porque el entorno local no resolvió ocho vars de la app Greenhouse; el cambio hermano sólo elimina nombres de env y no añade valores. |

## Blockers

Ninguno.

## Conditional Follow-Ups

1. Bajo TASK-1844, conservar el token base y validar en cada tool org-scoped la combinación
   `contexto + capability + organizationId objetivo` mediante el reader machine-only de Greenhouse. Requiere Delta
   ADR, reconsentimiento y matriz A/B permitidas + C denegada; no agregar memberships al JWT, ampliar scopes ni
   reutilizar el grant canary.

## False-Closure Traps Checked

- Tests verdes pero runtime faltante: cerrado con SHA/revisión/imagen/tráfico y canary de contrato.
- UI/captura ausente: cerrada con respuesta visible en Claude Desktop y ChatGPT; no se evaluó diseño porque no cambió UI.
- Env/redeploy/rollback pendiente: cerrado con readback y ensayo medido.
- Drift de lifecycle/docs: corregido; la task pasa a `complete` sólo después del readback de ambos clientes.
- Observabilidad productiva: Cloud Run se leyó hasta `00:18Z`; el refresh y los scopes efectivos se correlacionaron
  con el ledger PostgreSQL sin exponer tokens, subjects ni URLs OAuth.

## Final Call

El rollout satisface el contrato aprobado, sirve `1.2.0` y conserva la trust lane Entra legacy sin ampliar
permisos. Claude Code, Codex canary, Claude.ai, Claude Desktop y ChatGPT están verdes post-cutover; Desktop y
ChatGPT tienen respuesta visible, refresh base-only y dispatch 200 correlacionado contra `00047-8b5`. El intento
corporativo correcto completó consentimiento sólo para `Efeonce`, pero su code expiró sin intercambio ni token;
el requisito multiorganización queda separado en TASK-1844 y no bloquea el cierre de TASK-1813.
