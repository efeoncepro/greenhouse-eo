# TASK-1811 — Growth SEO: benchmarking histórico masivo de tráfico

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
- Priority: `P2`
- Impact: `Alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-022`
- Status real: `Diseño registrado; sin implementación, gasto ni rollout`
- Rank: `TBD`
- Domain: `growth|seo|data|integration`
- Blocked by: `none`
- Branch: `Greenhouse develop; sin worktrees`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Incorpora DataForSEO Labs `historical_bulk_traffic_estimation/live` como carril gobernado para comparar la
trayectoria ETV de cohortes allowlisted de dominios. Reutiliza el modelo formula-aware y la lectura de domain
overview, evita recomprar historia dominio por dominio y entrega un reader/API/MCP de benchmarking con calidad,
metodología, cobertura y costo explícitos.

Registrar esta task no autoriza código, migraciones, llamadas al proveedor, gasto, deploy ni habilitación.

## Why This Task Exists

`TASK-1775` ya posee el snapshot de un dominio, el histórico individual y el bulk actual. Lo que no existe es un
carril masivo histórico para comparar carteras, cohortes o mercados sin orquestar cientos de consultas
individuales. El endpoint puede devolver hasta 1.000 dominios por request y meses históricos, pero su salida es
ETV: usarlo sin la identidad metodológica de `TASK-1805` volvería incomparables las series.

La capacidad merece una task propia porque agrega selección de cohortes, presupuesto, idempotencia de batch,
calidad histórica y una proyección comparativa. No reabre `TASK-1775`, no convierte una optimización de transporte
en una segunda fuente de verdad y no ejecuta un cron preventivo.

## Goal

- Capturar benchmarking histórico de cohortes acotadas con Improved ETV explícito y provenance completa.
- Reutilizar el source of truth de domain overview sin crear una serie competidora o mezclar metodologías.
- Entregar un primitive de lectura, API ecosystem y MCP para agentes y operadores.
- Hacer forecast y control de gasto obligatorios antes de cualquier batch externo.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`
- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATAFORSEO_ETV_METHOD_VERSIONING_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_API_PLATFORM_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_MCP_ARCHITECTURE_V1.md`
- `docs/architecture/agent-invariants/MCP_TOOL_SURFACE_INVARIANTS.md`
- `docs/architecture/GREENHOUSE_DATABASE_TOOLING_V1.md`

Reglas obligatorias:

- `historical_bulk_traffic_estimation` es otro productor de hechos domain-overview, no otro source of truth.
- Toda request fija `use_improved_etv` mediante la policy efectiva de `TASK-1805`; nunca usa el default externo.
- Series pre-julio de 2026 conservan la calidad/provenance informada por el proveedor; no se presentan como
  observaciones recalculadas si son aproximaciones calibradas.
- Una cohorte es una selección de ejecución, no una entidad que confiere acceso ni mezcla organizaciones.
- El batch es one-shot/allowlisted y deshabilitado por defecto; no nace scheduler recurrente.
- Un reader sirve una sola metodología o degrada de forma explícita; nunca concatena legacy e improved.

## Normative Docs

- `docs/tasks/complete/TASK-1775-growth-seo-domain-traffic-overview.md`
- `docs/tasks/to-do/TASK-1805-growth-seo-dataforseo-improved-etv-versioned-transition.md`
- `docs/tasks/to-do/TASK-1806-growth-seo-dataforseo-improved-etv-evaluation-cutover.md`
- `.codex/skills/dataforseo-operator/SKILL.md`
- `.claude/skills/dataforseo-operator/references/02-labs.md`
- `.claude/skills/dataforseo-operator/references/07-contrato-greenhouse.md`
- `.codex/skills/seo-aeo/modules/07_MEASUREMENT.md`

## Dependencies & Impact

### Depends on

- `TASK-1805` completa y verificada en el runtime consumidor.
- Cutover/metodología efectiva gobernados por `TASK-1806` antes de habilitar llamadas productivas.
- Foundation de domain overview de `TASK-1775`.
- Transporte neutral `src/lib/ai/dataforseo.ts` y spend ledger vigente.

### Blocks / Impacts

- Benchmarking histórico de carteras de clientes, mercados y competidores declarados.
- Readers/agentes que necesiten comparar tendencia longitudinal entre múltiples dominios.
- API ecosystem y manifiesto MCP de Growth SEO.

### Files owned

- `src/lib/growth/seo/domain-overview/**`
- `src/lib/api-platform/resources/ecosystem-growth-seo.ts`
- `src/mcp/greenhouse/tool-manifest.ts`
- `src/mcp/greenhouse/tool-manifest.generated.json`
- `src/mcp/greenhouse/server.ts`
- `src/mcp/greenhouse/tools.ts`
- `services/ops-worker/server.ts`
- `migrations/*_task-1811-*.sql` sólo si Plan Mode demuestra que el ledger de cohortes exige persistencia.
- `docs/manual-de-uso/growth/` para el runbook operativo resultante.

## Current Repo State

### Already exists

- Domain overview individual e histórico bajo `src/lib/growth/seo/domain-overview/**`.
- `seo_domain_overview_snapshots` append-only y readers/proyecciones asociadas.
- Transporte DataForSEO Labs, breaker, presupuesto y señales de gasto.
- API ecosystem y MCP SEO con manifiesto canónico.

### Gap

- Cero callers para `historical_bulk_traffic_estimation` en `src/` y `services/`.
- No existe contrato de cohorte, preview de costo, batch idempotente ni replay para historia masiva.
- No existe reader que compare cobertura/calidad/metodología entre dominios de una misma corrida.
- La historia anterior a julio de 2026 necesita una etiqueta de calidad explícita para no parecer observada.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/growth/seo/domain-overview/**`, consumido por Vercel, ops-worker, API y MCP.
- Future candidate home: `domain-package`
- Boundary: command batch gobernado de captura y reader de benchmarking; adapters HTTP/MCP/worker sólo delegan.
- Server/browser split: provider, DB, spend policy y cohortes son server-only; DTO comparativo es browser-safe.
- Build impact: sin SDK nuevo ni filesystem input; Vercel y ops-worker compilan el mismo contrato.
- Extraction blocker: PostgreSQL compartido, entitlement por organización, spend ledger y proveedor externo.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: `greenhouse_growth.seo_domain_overview_snapshots` y ledger de ejecución `[verificar en Plan Mode]`.
- Consumidores afectados: `API|MCP|Nexa|worker|reporting`
- Runtime target: `local|staging|production|worker|external`

### Contract surface

- Contrato existente a respetar: `src/lib/growth/seo/domain-overview/**`, `src/lib/ai/dataforseo.ts` y policy ETV.
- Contrato nuevo o modificado: preview/command de batch histórico y reader de benchmarking de cohorte.
- Backward compatibility: `compatible` y aditiva; readers actuales de dominio no cambian su default.
- Full API parity: command y reader canónicos alimentan App/API ecosystem/MCP sin lógica de batch duplicada.

### Data model and invariants

- Entidades/tablas/views afectadas: `seo_domain_overview_snapshots`; ledger de cohortes sólo si Discovery lo exige.
- Invariantes que no se pueden romper:
  - hechos por dominio conservan identidad `domain × market × period × methodology` definida por `TASK-1805`;
  - la misma respuesta bulk se descompone mediante el writer canónico de domain overview;
  - calidad histórica, cobertura y source endpoint viajan con el hecho o con evidencia enlazable;
  - un dominio sin resultado se persiste como outcome explícito y no se recompra silenciosamente;
  - nunca se mezclan organizaciones para autorización, aunque un mismo dominio aparezca en varias cohortes.
- Write-target allowlist: cualquier tabla de runs nueva se declara en el boundary de Growth SEO en el mismo PR.
- Tenant/space boundary: la organización y targets se derivan server-side; una cohorte cross-org requiere
  capability interna explícita y nunca confiere lectura sobre datos first-party de otra organización.
- Idempotency/concurrency: digest de `domains × market × months × methodology × policy_version`; retry/replay no
  vuelve a comprar ni duplica snapshots y usa claim atómico si se ejecuta en worker.
- Audit/outbox/history: snapshots append-only + run ledger con forecast/actual/outcomes; sin outbox salvo consumer real.

### Migration, backfill and rollout

- Migration posture: `additive` sólo si se requiere ledger; sin reescritura destructiva de snapshots.
- Default state: `disabled`; dry-run y preview antes de una allowlist explícita.
- Backfill plan: batches acotados por dominios/meses/USD, primero staging; pre-julio conserva quality metadata.
- Rollback path: deshabilitar command/worker, conservar hechos append-only y revertir adapters; no borrar compras.
- External coordination: monto máximo, allowlist, deploy y ejecución pagada requieren aprobaciones separadas.

### Security and access

- Auth/access gate: entitlement Growth SEO para una org; capability interna adicional para cohorts cross-org.
- Sensitive data posture: sin PII nueva; dominios y métricas de mercado, sin exponer GSC ni datos first-party cruzados.
- Error contract: `historical_bulk_disabled`, `historical_bulk_budget_exceeded`, `historical_bulk_methodology_mismatch`,
  `historical_bulk_partial`; sanitizados, sin raw provider errors.
- Abuse/rate-limit posture: límites duros de dominios, meses, calls y USD; breaker Labs, replay guard y cooldown.

### Runtime evidence

- Local checks: tests dirigidos para builder, cost preview, parser, quality, idempotencia y reader mono-metodología.
- DB/runtime checks: migración/sanity PG si hay ledger; duplicate rejection, append-only y aislamiento por org.
- Integration checks: fixtures/replay primero; smoke staging pagado sólo con presupuesto y autorización explícitos.
- Reliability signals/logs: run status, forecast/actual, domains requested/returned/missing, months, methodology,
  quality mix, retries y breaker state.
- Production verification sequence: deploy disabled -> dry-run allowlist -> aprobación USD -> canary pequeño ->
  readback DB/API/MCP -> reconciliar costo -> ampliar dentro del cap -> observar señales.

### Acceptance criteria additions

- [ ] Source of truth, contract surface and consumers are named with real paths or objects.
- [ ] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [ ] Toda tabla nueva queda declarada con su justificación en el allowlist de destinos de escritura del dominio.
- [ ] Migration/backfill/rollback posture is explicit and proportional to risk.
- [ ] Runtime or DB evidence is listed for any change beyond docs/tooling.
- [ ] Errores son canónicos; no hay raw provider errors ni cruces first-party entre organizaciones.

## Capability Definition of Done — Full API Parity gate

- [ ] Batch y reader viven en primitives server-side, nunca dentro de UI, route o tool MCP.
- [ ] Read expuesto por App/API ecosystem/MCP desde una proyección canónica.
- [ ] Write usa capability fina, preview, confirmación, idempotencia, audit y errores sanitizados.
- [ ] MCP manifest source/generated y gateway consumidor quedan sincronizados en el mismo cambio funcional.
- [ ] Parity check = SÍ: agentes y producto operan el mismo contrato gobernado.

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

### Slice 1 — Contrato de cohorte, costo y metodología

- Definir input bounded, digest idempotente, quality vocabulary y preview sin llamar al proveedor.
- Extender la policy de `TASK-1805` para habilitar esta única familia con Improved ETV explícito.

### Slice 2 — Captura batch y persistencia canónica

- Construir adapter/parser y command worker-safe sobre el writer de domain overview.
- Persistir outcomes parciales/missing y ledger sólo si Plan Mode confirma que no existe primitive reutilizable.

### Slice 3 — Reader de benchmarking

- Entregar comparación por cohorte, dominio, mercado y periodo con metodología/calidad/cobertura explícitas.
- Evitar ranking causal o mezcla con GSC; exponer datos y factores verificables.

### Slice 4 — API, MCP, señales y rollout gated

- Exponer preview/command/read por contratos gobernados y sincronizar el manifiesto MCP.
- Verificar dry-run, canary allowlisted, readbacks y costo antes de ampliar.

## Out of Scope

- UI visible; cualquier superficie requiere task `ui-ux` dependiente.
- Cron recurrente o captura de toda la cartera por defecto.
- Llamadas pagadas, gasto, deploy o rollout durante la planificación/registro.
- Reabrir `TASK-1775`, duplicar su source of truth o recomprar historia ya suficiente.
- Mezclar ETV con GSC, legacy con improved o presentar aproximaciones como observaciones.
- Prospección pública sin organización/entitlement; requiere caso de uso y política separados.

## Detailed Spec

El límite inicial será el menor entre el máximo del proveedor y los caps internos de dominios, meses, calls y USD.
Plan Mode debe decidir si el run necesita tabla propia o si el ledger de operaciones existente puede representar
preview, approval, claim, outcomes y costo sin perder idempotencia. La escritura de cada dominio reutiliza el
writer de domain overview; `source_endpoint` preserva procedencia pero no crea una serie paralela.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 -> Slice 2 -> Slice 3 -> Slice 4.
- `TASK-1805` debe estar desplegada y leída en runtime antes de cualquier writer.
- Rollout productivo espera el método efectivo/cutover gobernado por `TASK-1806`.
- Reader/API/MCP no se habilitan hasta verificar idempotencia, aislamiento y partial outcomes.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Compra masiva accidental | provider/spend | medium | dry-run, cap USD, confirmación, allowlist | forecast/actual y breaker |
| Serie histórica falsa o mixta | data/reporting | high | método y quality explícitos, fail-closed | methodology/quality mismatch |
| Duplicado entre bulk e individual | DB | medium | writer común y digest idempotente | duplicate/no-op ratio |
| Fuga cross-org en cohorte | access/API | low | capability interna y proyección allowlisted | deny/audit signal |
| Respuesta parcial interpretada como cero | integration | medium | outcome por dominio y cobertura | missing/partial ratio |

### Feature flags / cutover

- Capability deshabilitada por defecto mediante el mecanismo de rollout que Plan Mode asigne.
- Improved ETV es explícito; no existe fallback silencioso al default del proveedor.
- Apagar la capability detiene compras y deja readers sobre evidencia persistida etiquetada.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Slice 1 | revertir contrato/policy antes de habilitar | <30 min | sí |
| Slice 2 | deshabilitar command/worker y revertir adapter; conservar hechos append-only | <30 min | parcial |
| Slice 3 | retirar reader/proyección y volver al domain overview individual | <30 min | sí |
| Slice 4 | flag/capability OFF, retirar routes/tools y reconciliar último run | <30 min | sí, salvo gasto ejecutado |

### Production verification sequence

1. Verificar `TASK-1805` y método efectivo en staging.
2. Ejecutar dry-run con cohorte mínima y comprobar forecast, digest y autorización.
3. Con aprobación separada, ejecutar canary pagado pequeño en staging.
4. Leer DB, reader, API y MCP; reconciliar dominios/meses/costo y partial outcomes.
5. Repetir en producción con allowlist mínima y cooldown de observación.
6. Ampliar sólo dentro de caps aprobados; detenerse ante drift o diferencia material forecast/actual.

### Out-of-band coordination required

- Aprobaciones separadas para monto máximo, allowlist de dominios, deploy y ejecución pagada.
- No se requieren secretos ni scopes nuevos si el contrato DataForSEO vigente permanece válido.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## MCP Tools & Skills Contract

Esta task incluye como entregable obligatorio la capa de uso por agentes; no se considera completa con el
primitive, reader, API o documentación humana solamente.

- [ ] Crear o actualizar las tools MCP necesarias para operar/leer esta capacidad desde el mismo primitive
  canónico. Si una tool existente cubre el caso, actualizarla sin duplicarla; si no corresponde una tool nueva,
  declarar las tools afectadas y la razón de exclusión explícita en el gateway.
- [ ] Crear o actualizar la guía de uso en las skills dueñas `.codex/skills/dataforseo-operator/**` y
  `.codex/skills/seo-aeo/**`, junto con sus espejos `.claude/**`, incluyendo selección de tool, inputs,
  interpretación, metodología/provenance, costos, límites, errores y acciones prohibidas.
- [ ] Mantener las copias Codex/Claude byte-idénticas y, cuando el registro de skills servidas de `TASK-1804`
  esté disponible, crear o actualizar también el recurso/manual agent-facing que el MCP entrega bajo demanda.
  No crear una skill por endpoint si la skill de dominio vigente puede ampliarse de forma clara.
- [ ] Actualizar en el mismo PR el lane ecosystem, `src/mcp/greenhouse/tool-manifest.ts`, su artefacto generado,
  schema/annotations/descripción y la federación del gateway; toda tool interna queda federada o excluida con una
  razón sustantiva, nunca simplemente ausente.
- [ ] Las tools read sólo leen evidencia persistida y no disparan llamadas pagadas on-read. Toda tool que escriba,
  compre o comprometa gasto usa capability fina, presupuesto, idempotencia, audit y
  `propose → confirm → execute`; nunca se agrega un write scope al cliente PKCE público compartido.
- [ ] Verificar `pnpm mcp:manifest:generate && pnpm mcp:manifest:check`, `pnpm skills:mirrors`, paridad
  bidireccional del gateway y canaries allow/deny/fault. Registro o compilación sin readback de la lane y del
  gateway no constituye cierre operativo.


## Acceptance Criteria

- [ ] `historical_bulk_traffic_estimation` tiene caller real con `use_improved_etv` explícito y policy versionada.
- [ ] Dry-run calcula dominios, meses, calls y máximo USD sin efectuar llamadas externas.
- [ ] Retry/replay no recompra ni duplica snapshots y los outcomes missing/partial quedan explícitos.
- [ ] Bulk e individual escriben mediante un source of truth compatible y no generan series paralelas.
- [ ] Metodología, quality, source, periodo, cobertura y captured-at llegan al reader/API/MCP.
- [ ] Reader rechaza/degrada series mixtas y nunca promedia ETV con GSC.
- [ ] Tenant/capability y cohortes cross-org pasan allow/deny sin filtrar first-party data.
- [ ] Provider smoke, gasto, deploy y rollout conservan aprobaciones separadas y evidencia runtime.
- [ ] `pnpm mcp:manifest:check` pasa cuando la capacidad programática se incorpora.
- [ ] Documentación funcional, runbook y arquitectura describen límites, costo y calidad histórica.

## Verification

- `pnpm task:lint --task TASK-1811`
- Tests focales del adapter, command, store, reader, API y MCP.
- `pnpm mcp:manifest:check`
- `pnpm test:live` para evidencia DB serializada cuando exista implementación.
- `pnpm qa:gates --changed`
- Readback staging/prod de DB, API/MCP, señales y spend ledger.

## Closing Protocol

- [ ] `Lifecycle` del markdown quedó sincronizado con el estado real.
- [ ] el archivo vive en la carpeta correcta.
- [ ] `docs/tasks/README.md` quedó sincronizado con el cierre.
- [ ] `Handoff.md` quedó actualizado si hubo cambios, aprendizajes, deuda o validaciones relevantes.
- [ ] `changelog.md` quedó actualizado si cambió comportamiento, estructura o protocolo visible.
- [ ] se ejecutó chequeo de impacto cruzado sobre otras tasks afectadas.
- [ ] `TASK-1775`, `TASK-1805` y `TASK-1806` conservan ownership y dependencias coherentes.

## Follow-ups

- Crear task `ui-ux` sólo cuando exista una superficie visible aprobada para comparar cohortes.
- Evaluar cron únicamente después de observar demanda, costo, frescura y latencia de uso real.

## Open Questions

- Plan Mode debe resolver la allowlist inicial de carteras y el máximo USD antes de cualquier smoke pagado.
