# TASK-1948 — DataForSEO: keywords relevantes por URL y sujeto explícito

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Medio`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-022`
- Status real: `Complete: CLI 1.1.0 y 96 tests/9 archivos; integración live México por URL, paginación, CSV y resume sin recompra verificados; gasto reconciliado; sin push/deploy`
- Rank: `TBD`
- Domain: `growth|seo|platform`
- Blocked by: `none`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`

## Summary

Agrega investigación independiente de keywords relevantes para dominio, subdominio o URL a la CLI local.
El operador declara el tipo de sujeto y obtiene una muestra JSON/CSV trazable, paginada y reanudable,
sin mezclar relevancia temática con posiciones orgánicas ni comprar enriquecimiento o SERP adicionales.

## Why This Task Exists

Keywords for Site ya está catalogado, pero falta una entrada diaria para el soporte por URL anunciado por
DataForSEO. Un target ambiguo puede devolver keywords del dominio completo. Es un follow-up acotado de
TASK-1935 cerrada; no reabre inventario, transporte, AI Optimization ni captura recurrente.

## Goal

- Exponer `quick keywords-for-site` y `site-keywords` con sujeto explícito y validación fail-closed.
- Separar relevancia de posiciones y de consultas observadas en Search Console.
- Reutilizar transporte, entitlement, ledger, checkpoint y SemVer con presupuesto progresivo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_DATAFORSEO_OPERATOR_CLI_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATAFORSEO_ETV_METHOD_VERSIONING_DECISION_V1.md`

Reglas: transporte único `requestDataForSeo`; Labs ya autorizada; consumer SEO explícito; relevancia no es ranking.

## Normative Docs

- `.codex/skills/dataforseo-operator/SKILL.md`
- `.claude/skills/dataforseo-operator/references/02-labs.md`
- `docs/manual-de-uso/growth/dataforseo-cli.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- `docs/tasks/complete/TASK-1935-dataforseo-daily-operator-cli.md`: CLI general ya materializada.

### Blocks / Impacts

- Briefs y optimización editorial ad hoc; ningún dashboard/scheduler nuevo.

### Files owned

- `scripts/dataforseo/cli.ts`
- `src/lib/ai/dataforseo-cli-presets.ts`
- `src/lib/ai/dataforseo-site-keywords.ts`
- `data/dataforseo/cli-versions.json`
- Tests focales DataForSEO; ADR, manual, documentación CLI y skills espejo.

## Current Repo State

### Already exists

- `data/dataforseo/endpoints.v3.json` contiene endpoint Labs `keywords_for_site/live` ejecutable.
- `src/lib/ai/dataforseo-research-checkpoint.ts` con fingerprints, TTL y escritura atómica.
- `src/lib/growth/seo/entitlement.ts` y `src/lib/growth/seo/register-provider-spend.ts`.

### Gap al inicio (resuelto)

- Faltaba entrada exclusiva de relevancia con sujeto declarado; reference Labs aún limitaba target a dominio.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `scripts/dataforseo/cli.ts` y `src/lib/ai/dataforseo-site-keywords.ts`.
- Future candidate home: `remain-shared`
- Boundary: builder/normalizador reusable consumido por CLI; transporte y entitlement existentes.
- Server/browser split: tooling server-only; secretos, filesystem y proveedor fuera del browser.
- Build impact: sin SDK ni dependencia pesada nueva; catálogo y SemVer locales existentes.
- Extraction blocker: transporte, catálogo y ledger gobernados compartidos; no autoriza mover paquetes.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-lite`
- Impacto principal: `integration`
- Source of truth afectado: contrato oficial Keywords for Site y registro SemVer local.
- Consumidores afectados: CLI local de operador/agentes.
- Runtime target: `local`

### Contract surface

- Contrato existente a respetar: `requestDataForSeo`, checkpoint y ADR operador.
- Contrato nuevo o modificado: preset y compuesto de relevancia JSON/CSV.
- Backward compatibility: `compatible`.
- Full API parity: primitive reusable + CLI declarada; no capability de producto/ruta nueva.

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna nueva; transporte usa ledger existente.
- Invariantes: URL conserva path/query/trailing slash; tipo declarado; NULL no es cero.
- Write-target allowlist: sin tabla nueva ni persistencia productiva de resultados.
- Tenant/space boundary: org real explícita, entitlement SEO y checkpoint tenant-safe.
- Idempotency/concurrency: reusa pasos frescos por fingerprint/TTL; nunca retry POST.
- Audit/outbox/history: artefactos locales y ledger existente; sin outbox nuevo.

### Migration, backfill and rollout

- Migration posture: `none`.
- Default state: preview sin gasto; execute explícito con org y ceiling.
- Backfill plan: no backfill ni captura recurrente.
- Rollback path: revert scoped paths propios y release SemVer correctiva.
- External coordination: ninguna para preparar tooling; el uso facturable posterior autorizado se verificó con ceiling/org y ledger, sin alterar targets SEO activos.

### Security and access

- Auth/access gate: credenciales/entitlement canónicos; sin bypass.
- Sensitive data posture: rechaza credentials URL; sin secretos en outputs.
- Error contract: exit codes CLI y task fallida nunca se normaliza éxito vacío.
- Abuse/rate-limit posture: breaker Labs, límites y techo progresivo pre-POST.

### Runtime evidence

- Local checks: tests CLI/preset/builder/checkpoint y dry-run por tipo de sujeto.
- DB/runtime checks: sin schema nuevo; tooling repo-only, sin impacto en runtime productivo.
- Integration checks: documentación oficial, mocks fieles e integración live por URL en México con paginación y resume. Las sugerencias requieren selección editorial; no validan ranking ni calidad automática.
- Reliability signals/logs: diagnóstico/task codes y gasto real del transporte.
- Production verification sequence: no production runtime impact; sin deploy/flags.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md segun TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     "Que construyo exactamente, slice por slice?"
     El agente solo lee esta zona DESPUES de que el plan este
     aprobado. Ejecuta un slice, verifica, commitea, y avanza.
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — sujeto y contrato

- Builder compartido con `target-kind domain|subdomain|url` y validación URL.
- Normalización/provenance/CSV para relevancia; CPC/competition son métricas Ads.

### Slice 2 — integración gobernada

- Preset quick y compuesto acotado, paginación, JSON/CSV y checkpoint/resume.
- Techo y entitlement progresivos antes de cada POST nuevo.

### Slice 3 — documentación y verificación

- Manual/ADR/skills espejo y minor SemVer; tests, dry-run, lint/typecheck y gates.

## Out of Scope

- Nuevas familias/tablas/workers/crons/MCP/UI, publicación, push o deploy. La implementación local se cerró sin paid canary; la prueba facturable posterior fue autorizada aparte por el operador.
- Overview, Competitors, SERP y seeds en `site-keywords`.

## Detailed Spec

Plan coordinado: `docs/tasks/plans/TASK-1948-plan.md`; registro de ejecución local:
`docs/audits/seo/2026-09-30-task-1948-site-keywords-cli-verification.md` (evidencia final a cargo de root).

`--target-kind domain|subdomain|url` es requerido. Host targets envían `include_subdomains:false` para no
solicitar expansión. URL con https o prefijo www conserva su ruta y query; se añade https al prefijo www.
El flag de subdominios no se envía para URL. No afirmar equivalencia canonical ni hostname garantizado.
`--limit` default 100, rango 1–1000; compuesto `--max-pages` default 1, rango 1–20.
El plan conserva endpoint, `source` explícita, mercado, sujeto, paginación, estimación y ceiling.
Sólo consume Keywords for Site. Unknown cost/fallo terminal bloquea todo checkpoint antes de TTL/nueva compra;
`httpOk` durable. Scope multi-block aborta; volumen inválido conserva estado invalid con NULL.

## Rollout Plan & Risk Matrix

Cambio additive local, sin impacto en runtime productivo.

### Slice ordering hard rule

Slice 1 → Slice 2 → verificación; docs pueden avanzar tras cerrar contrato.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| URL convertida a dominio | Labs | medium | tipo explícito y URL con esquema | preview target/scope |
| Relevancia presentada como ranking | informe | medium | semantics/provenance | tests contrato |
| Resume recompra/cruza org | tooling | low | fingerprint/TTL/org | checkpoint mismatch |
| Página siguiente excede techo | gasto | medium | costo real + estimación pre-POST | exit budget |

### Feature flags / cutover

Sin flag nuevo: CLI aditiva con preview por defecto; no cambia despliegues.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1–2 | revert paths propios y release correctiva | minutos | sí |
| 3 | corrección docs sin reescribir historial | minutos | sí |

### Production verification sequence

Tests/dry-run antes de uso real; sin release cloud/migration/flags. El canary facturable posterior autorizado
en México está registrado en Verification, sin convertir esta CLI local en un rollout productivo nuevo.

### Out-of-band coordination required

Ninguna: repo-only tooling change; uso real sigue ceiling y entitlement del manual.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] Target-kind requerido en ambos comandos y scope declarado en preview/output.
- [x] URL conserva path/trailing slash/query; rechaza fragmentos, credentials, puertos y wildcards.
- [x] Site-keywords sólo compra Keywords for Site; relevancia no declara rankings.
- [x] Límites/paginación acotados; continuación, ausencia/error/NULL honestos.
- [x] Resume reusa pasos frescos y rechaza otra org/plan; no retry POST.
- [x] Ceiling y entitlement SEO antes de cada compra; transporte y ledger únicos.
- [x] JSON conserva provenance, sujeto, mercado, task, fecha y semántica Ads; CSV viaja con ese JSON.
- [x] Minor SemVer/digest check verdes; manual/ADR/skills espejo sincronizados.
- [x] Tests focales/dry-run/lint/typecheck registrados con evidencia.
- [x] Cierre local sin gasto y prueba facturable posterior autorizada distinguidos; integración live y ausencia de deploy descritos con evidencia.

## Verification

Evidencia consolidada: [auditoría local y live 2026-09-30](../../audits/seo/2026-09-30-task-1948-site-keywords-cli-verification.md).
Root verificó 96 tests en 9 archivos (23 de integración CLI), parser query con `=` preservada con prueba de
falsificación y restauración de bytes; lint de paths propios limpio, digest/versión 1.1.0 y dry-run URL MX,
dominio CL y subdominio PE. Typecheck con tsconfig heredado excluyendo sólo `ai-generations` WIP ajeno exit 0;
el global conserva 17 errores en ese WIP. El cierre original de implementación no realizó POST pagado ni
canary facturable; fixtures/local verificaron contratos. No hubo commit/push ni deploy.

Posteriormente el operador autorizó probar la capacidad y corrigió explícitamente el mercado a México.
La URL `https://berel.com/ubica-tienda` en MX (`2484`, español) devolvió 20 filas en dos páginas con scope
`matched`, CSV de 20 filas y costo Labs USD 0,0264. Resume reutilizó ambas páginas y task IDs originales,
con costo incremental cero. La consulta SERP separada costó USD 0,002; el total USD 0,0284 se reconcilió
con el ledger. La captura CL queda como antecedente separado y no sustituye ni se mezcla con la evidencia
MX aplicable a Berel. La muestra tiene cobertura acotada y ruido; `total_count` no demuestra keywords
exclusivas del cliente. Los artefactos originales y la evidencia de gasto están referenciados en la auditoría.

- Tests focales CLI y módulos DataForSEO.
- `pnpm dataforseo -- site-keywords --target https://example.com/page --target-kind url --market CL --dry-run`
- `pnpm dataforseo:version:check`
- `pnpm skills:mirrors`
- Typecheck/eslint de paths propios.
- `pnpm task:lint --task TASK-1948`
- `pnpm docs:context-check:strict`

## Closing Protocol

- [x] Lifecycle/carpeta/README/registry sincronizados con evidencia real.
- [x] Handoff/changelog registran mejora, gates y límites.
- [x] Impacto sobre TASK-1935 y CLI previa revisado: tests de research y transporte previos verdes.
- [x] Acceptance sólo tildadas tras evidencia; integración live verificada y límites de calidad editorial declarados.

## Follow-ups

La integración facturable ya está verificada para la página de ubicación de tiendas en México. Evaluar un
artículo editorial de Berel y contrastar sugerencias seleccionadas con consultas observadas en GSC sigue
siendo un uso posterior, con autorización y presupuesto propios si requiere compras nuevas. No bloquea
esta task ni convierte relevancia estimada en ranking, tráfico observado o selección editorial automática.
