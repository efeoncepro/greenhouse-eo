# Plan — TASK-1948 DataForSEO: relevancia por URL y sujeto explícito

> Coordinación de diseño por Codex y subagentes, 2026-09-30. Pedido directo del operador: lanzar subagentes,
> revisar con detalle y sumar la capacidad a la CLI del repo. P2 / Effort Medio: plan auto-aprobable conforme
> TASK_PROCESS; aquí se registra el diseño coordinado y su ejecución, sin afirmar commit, push o deploy.

## Discovery summary

Keywords for Site ya estaba catalogado bajo Labs y disponible en `run`/research general. El anuncio oficial
amplía relevancia a URL. Falta entrada específica de una página/host y scope declarado. Source oficial distingue
relevancia de rankings y expone métricas Ads. TASK-1935 conserva la CLI general cerrada; TASK-1776 conserva
visibilidad por rankings. Registro/filas/filesystem verificaron TASK-1948 libre antes de crearla.
La documentación antigua sólo mencionaba dominio. Repo contiene WIP ajeno que se preserva sin branch changes.

## Access model

- routeGroups/views/authorizedViews/startup policy: no cambios, CLI local server-only.
- entitlements: `enforceSeoRunEntitlement` existente, org real explícita y consumer SEO.
- Decision de diseño: preview sin credenciales/org/gasto; ejecución con `--yes --org --max-usd`.

## Architecture decision

- ADR existente: `docs/architecture/GREENHOUSE_DATAFORSEO_OPERATOR_CLI_DECISION_V1.md` Accepted.
- ADR delta: sujeto explícito, relevancia aislada, scope/costo/paginación/checkpoint terminal durable.
- Status requerido: Accepted for implementation, bajo autorización directa del usuario para capacidad compatible.
- Sin nueva familia, schema, acceso runtime ni política de gasto.

## Backend/data contract

Backend-lite tooling. Un builder reusable en `src/lib/ai/dataforseo-site-keywords.ts`; CLI consume transporte,
breaker, entitlement y ledger existentes. `--target-kind domain|subdomain|url` requerido; HTTPS o www→HTTPS;
path/query/trailing slash preservados; rechaza credentials/port/fragment/wildcards. Host no pide expansión a
subdominios; URL omite flag. Limita filas 1–1000 y páginas 1–20. No seeds/Overview/Competitors/SERP.

Checkpoint atado a org/fingerprint y TTL; pasos frescos no recompran. Antes de TTL o nueva compra revisa
checkpoint completo: unknown cost, fallo HTTP/task, scope divergente o multi-block impiden recomprar POST incierto.
`httpOk` durable, costo desconocido NULL. Cada POST nuevo compara costo acumulado + estimate y entitlement.
No schema/backfill/cron; rollback scoped revert + release SemVer correctiva. Source/provenance en plan.source;
relevancia no demuestra ranking/canonicalización; competencia/CPC Ads y volumen invalid/missing/NULL/zero distintos.

## Skills

- Discovery y builder: `dataforseo-operator`, `software-architect-2026` (root).
- Registro: `greenhouse-task-planner`; docs/skills: `greenhouse-documentation-governor`.
- Semántica de workflow editorial: `seo-aeo`; verificación: QA root con tests focales.

## Subagent strategy

`fork`, autorizado explícitamente por el usuario. Tres ramas independientes con ownership y revisión root:

- Provider audit: investigación primaria read-only, URL scope/precio/shapes; sin paid calls.
- CLI implementation: builder/normalizador/preset/orquestación/tests; root integra y audita riesgo de gasto.
- Docs audit: manual/documentación/ADR/skills/taxonomía; no Handoff/changelog/version antes de autorización root.

No branch/worktree changes. Root gobierna contratos, correcciones cruzadas, bump, gates finales y cierre.

## Execution order

1. Verificar contrato oficial y arquitectura/source locales; fijar scope requerido y límites.
2. Builder/normalizador puro y preset compatible; doc semantics y uso diario en paralelo tras contrato.
3. Compuesto paginado usando primitives de transporte/checkpoint/spend existentes.
4. Tests adversariales de args, query con '=', scope/multi-block, TTL/resume y costo desconocido.
5. Bump minor 1.1.0 con helper en governedPaths; lint/tests/typecheck/dry-run y readback SemVer.
6. Evidencia local, Handoff/changelog y aceptación proporcionada; sin paid canary, commit/push/deploy automáticos.

## Files to create

- `src/lib/ai/dataforseo-site-keywords.ts` y test focal en `src/lib/ai/__tests__/`.
- `scripts/dataforseo/__tests__/site-keywords-cli.test.ts`.
- `docs/tasks/in-progress/TASK-1948-dataforseo-url-keyword-relevance-cli.md` y este plan.
- `docs/audits/seo/2026-09-30-task-1948-site-keywords-cli-verification.md` (root registra evidencia final).

## Files to modify

- `scripts/dataforseo/cli.ts`: parser compatible, comandos, costo/resume durable y recibos.
- `src/lib/ai/dataforseo-cli-presets.ts`: preset Keywords for Site y scope explícito.
- `src/lib/ai/dataforseo-research-checkpoint.ts`: metadatos HTTP/costo durables compartidos.
- Tests CLI/preset/checkpoint existentes: compatibilidad y barreras significativas.
- `data/dataforseo/cli-versions.json`: minor e historial/digest por herramienta canónica.
- Manual/documentación CLI, ADR/índice, reference Labs y skills DataForSEO/SEO-AEO espejo.
- Task registry/README/EPIC-022: alta mínima sin normalizar deuda ajena.
- Handoff/changelog/auditoría: root, después de gates finales.

## Files to delete

Ninguno. Se preserva WIP ajeno y outputs existentes se crean de forma exclusiva.

## Risk flags

- Parser query con '=' perdía contenido: prueba adversarial distingue parser viejo/nuevo y bytes restaurados.
- TTL puede inducir recompra tras respuesta fallida: barrera checkpoint completa previa a expiración.
- Múltiples bloques o scope distinto aparentarían resultado válido: fallo explícito sin normalizar filas.
- Costo unknown no es cero: conserva NULL y detiene nuevas compras.
- Los fixtures prueban contrato/camino local, no calidad real de recomendaciones editoriales.

## Open questions

Ninguna bloquea preparación local. Evaluación editorial real de un artículo y contraste GSC siguen como
uso posterior con autorización/presupuesto propios; no se simulan ni se sustituyen por la prueba de integración.

## Verificación posterior autorizada — México

El cierre de implementación anterior se mantuvo sin gasto. Tras el pedido separado del operador de probar
la CLI, la corrección explícita de mercado estableció México para Berel. La integración live de
`https://berel.com/ubica-tienda` verificó respuesta con filas, paginación, CSV y resume sin recompra; el gasto
se reconcilió con el ledger. La consulta SERP fue una operación separada de `site-keywords`, cuyo contrato
sigue comprando únicamente Keywords for Site. Evidencia y límites:
[auditoría consolidada](../../audits/seo/2026-09-30-task-1948-site-keywords-cli-verification.md#corrección-de-mercado-del-operador--berel-méxico).
CL permanece como antecedente separado; no se mezcla con series/targets MX del cliente. El resultado
demuestra integración, no recomienda automáticamente todas las filas ni demuestra qué pinturería es mejor.
Esta actualización documental no reabre la task ni agrega commit/push/deploy.
