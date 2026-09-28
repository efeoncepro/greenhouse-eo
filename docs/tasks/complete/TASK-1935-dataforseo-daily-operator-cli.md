# TASK-1935 — CLI diaria y catálogo completo de DataForSEO

## Delta 2026-09-28 — research gobernado y reanudable

Las cinco limitaciones registradas en el ADR quedan resueltas sin ampliar el allowlist: `research` produce matriz
SEO/SERP con evidencia, exige gobernanza de finalistas, pagina con cursor/offset y reanuda desde checkpoint con
TTL; revalida costo real acumulado y entitlement antes de cada POST; usa SERP Standard por defecto. El nuevo
`ai-research` ejecuta paneles versionados y separa API de consumer surface mientras normaliza citas, fan-out,
entidades y resultados por plataforma. TASK-1651 aplicó y verificó después el CHECK de `ai_optimization` y su
primer canary acotado; TASK-1651-B no se inicia.

## Delta 2026-09-28 — discoverability para agentes y documentación operativa

Las skills espejo `dataforseo-operator` y `seo-aeo` ahora enrutan explícitamente a `pnpm dataforseo`, distinguen
catálogo, presets, ejecución genérica, lifecycle asíncrono, research SEO y superficies AI, y conservan los
guardrails de costo, organización, consumer y allowlist. El manual operativo y el ADR técnico quedaron ampliados
como las dos fuentes canónicas; no se creó un cliente, transporte ni documentación paralela.

## Delta 2026-09-28 — keyword research compuesto

La CLI completa el caso de minería con `research`: Suggestions + Related, Ideas opt-in, Keywords for Site y
competidores cuando hay target, Overview para enriquecer y SERP sólo para finalistas. El comando deduplica,
conserva procedencia y estados de volumen, calcula previsión agregada conservadora y exporta JSON/CSV.

## Delta 2026-09-28 — consumer de TASK-1651-A

La CLI conserva su cierre y ahora consume la sexta familia habilitada por TASK-1651-A:
`ai_optimization`. El catálogo sigue en 545 endpoints, con 320 ejecutables en total y 53 rutas AI
Optimization. La ampliación del allowlist, CHECK y rollout DB pertenece a TASK-1651; su verificación runtime
posterior no reabre este scope.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — INTAKE
     "Que problema resolvemos y para quien?"
     Esta zona se llena al crear la task.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P1`
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
- Status real: `Complete local: catálogo 545/320, research SEO/AI gobernado y reanudable; canary AI USD 0,0101 con resume sin recompra; sin push, deploy ni flags`
- Rank: `TBD`
- Domain: `growth|seo|platform|ops`
- Blocked by: `none`; coordina sin solapar con `TASK-1863` sobre `src/lib/growth/markets/`
- Branch: `Greenhouse develop; checkout compartido; sin worktrees`

## Summary

Crea `pnpm dataforseo` como entrada diaria para personas y agentes: descubre el inventario oficial, describe
contratos, construye consultas comunes, ejecuta GET/POST por el transporte canónico y gobierna costo, errores y
tasks asíncronas. El catálogo se regenera desde la documentación oficial en vez de mantener rutas a mano.

## Why This Task Exists

El caso Banco Pichincha Perú requirió scripts temporales para doce SERPs y cuatro consultas AI Mode. El Grader
además probó que HTTP 200 puede contener `task40501`: enviar la etiqueta localizada `Perú` como identidad del
proveedor falló, mientras `location_code=2604` funcionó. Sin una CLI, cada agente vuelve a descubrir endpoints,
payloads, códigos y límites, con riesgo de gasto, fallback geográfico o una segunda implementación de auth.

## Goal

- Exponer los endpoints oficiales vigentes con procedencia y cobertura ejecutable explícita.
- Permitir consultas frecuentes y genéricas sin inventar payloads ni evadir entitlement, breaker o spend ledger.
- Hacer seguro el lifecycle async y distinguir transporte, task error, pendiente, éxito y ausencia de datos.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_SEO_MODULE_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_DATAFORSEO_OPERATOR_CLI_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_DATAFORSEO_ETV_METHOD_VERSIONING_DECISION_V1.md`
- `src/lib/ai/dataforseo.ts`
- `src/lib/ai/dataforseo-families.ts`

Reglas obligatorias:

- Todo request real pasa por el transporte canónico; no existe SDK/REST paralelo.
- Inventario oficial no equivale a autorización: fuera del allowlist se describe la razón y habilitación.
- Ningún mercado desconocido cae a EE. UU.; identidad del proveedor y etiqueta localizada son campos distintos.
- HTTP 200 no equivale a task `20000`; POST no se reintenta automáticamente.

## Normative Docs

- `.claude/skills/dataforseo-operator/references/00-fundamentos.md`
- `.claude/skills/dataforseo-operator/references/01-serp.md`
- `.claude/skills/dataforseo-operator/references/02-labs.md`
- `.claude/skills/dataforseo-operator/references/03-backlinks.md`
- `.claude/skills/dataforseo-operator/references/04-onpage.md`
- `.claude/skills/dataforseo-operator/references/05-keywords-domain-analytics.md`
- `.claude/skills/dataforseo-operator/references/06-resto-catalogo.md`
- `.claude/skills/dataforseo-operator/references/07-contrato-greenhouse.md`
- `.claude/skills/dataforseo-operator/references/08-ai-optimization.md`

## Dependencies & Impact

### Depends on

- `src/lib/ai/dataforseo.ts`: auth, timeout, breaker y registro de costo.
- `src/lib/growth/seo/entitlement.ts`: gate antes de gasto atribuible.
- `src/lib/growth/markets/index.ts`: resolver compartido de TASK-1863; esta task sólo lo consume.

### Blocks / Impacts

- Sustituye scripts ad hoc de investigación DataForSEO.
- Da un carril reproducible a SEO/AEO, research y soporte operativo.

### Files owned

- `scripts/dataforseo/**`
- `src/lib/ai/dataforseo-catalog.ts`
- `src/lib/ai/dataforseo-cli-presets.ts`
- `data/dataforseo/endpoints.v3.json`
- `docs/manual-de-uso/growth/dataforseo-cli.md`
- `docs/architecture/GREENHOUSE_DATAFORSEO_OPERATOR_CLI_DECISION_V1.md`

## Current Repo State

### Already exists

- Cliente POST con cinco familias, breaker y ledger en `src/lib/ai/dataforseo.ts`.
- Allowlist cerrado en `src/lib/ai/dataforseo-families.ts`.
- Resolver de mercados en `src/lib/growth/markets/index.ts` bajo TASK-1863.

### Gap

- Sin inventario completo, descubrimiento, GET genérico, CLI, validación, preview ni lifecycle async reusable.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `scripts/dataforseo/**` y primitives server-only en `src/lib/ai/**`
- Future candidate home: `remain-shared`
- Boundary: `requestDataForSeo` es transporte; catálogo/presets/CLI son consumers, no otra integración.
- Server/browser split: `server-only`; credenciales, provider y archivos nunca llegan al browser.
- Build impact: snapshot JSON grande sólo leído por la CLI; no entra a entrypoints de Next.
- Extraction blocker: auth, Secret Manager, breaker, entitlement y spend recorder pertenecen a Greenhouse.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: documentación oficial DataForSEO v3 + transporte `src/lib/ai/dataforseo.ts`
- Consumidores afectados: `CLI`, agentes SEO/AEO y operador
- Runtime target: `local`

### Contract surface

- Contrato existente a respetar: `DataForSeoTaskInput`, `DATAFORSEO_FAMILIES`, `enforceSeoRunEntitlement`
- Contrato nuevo o modificado: `requestDataForSeo`, snapshot v1 y comandos `catalog|quick|run|task wait`
- Backward compatibility: `compatible`; `postDataForSeoTask` se conserva.
- Full API parity: CLI consume el mismo transporte y gates que los consumers productivos.

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna nueva; ledger existente recibe gasto atribuible.
- Invariantes que no se pueden romper:
  - Un POST no se reintenta automáticamente.
  - Un endpoint fuera del allowlist nunca se ejecuta.
  - Una familia SEO pagada exige organización real y entitlement.
- Write-target allowlist: `N/A — no tabla nueva`
- Tenant/space boundary: `organizationId` explícito, no inferido ni inventado.
- Idempotency/concurrency: GET reintentable; POST at-most-one attempt; polling nunca resubmite.
- Audit/outbox/history: JSON de salida conserva fecha, endpoint, task ID/status, costo y superficie.

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `dry-run implícito sin --yes`
- Backfill plan: `none`
- Rollback path: revertir scripts/snapshot y wrapper GET; POST legacy sigue compatible.
- External coordination: ninguna; usa credenciales ya gobernadas.

### Security and access

- Auth/access gate: Basic auth resuelta por Secret Manager en cliente canónico + entitlement por organización.
- Sensitive data posture: secretos nunca se imprimen ni persisten.
- Error contract: exit codes y task status sanitizados; no raw body HTTP.
- Abuse/rate-limit posture: batch limit, timeout, budget ceiling, GET retry acotado y breaker por familia.

### Runtime evidence

- Local checks: Vitest focal, TypeScript, lint, catálogo check y previews.
- DB/runtime checks: entitlement AEO focal; CHECK `ai_optimization` aplicado/validado y ledger del canary leído.
- Integration checks: un GET gratuito y smokes pagados mínimos sólo dentro de techo explícito.
- Reliability signals/logs: breaker y spend ledger existentes.
- Production verification sequence: no hay deploy; sync → tests → preview → GET gratuito → smoke mínimo autorizado.

### Acceptance criteria additions

- [x] Source of truth, contract surface and consumers are named with real paths or objects.
- [x] Data invariants, tenant/access boundary and idempotency/concurrency posture are explicit.
- [x] No hay tabla nueva ni allowlist de escritura que ampliar.
- [x] Migration/backfill/rollback posture is explicit and proportional to risk.
- [x] Runtime evidence está definida para el tooling local.
- [x] Errores y secretos tienen postura fail-closed y sanitizada.

## Capability Definition of Done — Full API Parity gate

- [x] La ejecución vive en el transporte canónico, no en la CLI.
- [x] Catálogo, request y lifecycle son contratos reutilizables.
- [x] Los writes conservan authorization, entitlement, atribución, breaker y errores sanitizados.
- [x] No crea capability/grant de producto; es un consumer local de capabilities existentes.
- [x] Camino programático: CLI machine-readable.
- [x] Preview → confirmación `--yes` → execute con techo.
- [x] Un transporte, múltiples consumers.
- [x] Parity check: sí; no se creó un REST paralelo.

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

### Slice 1 — Catálogo oficial reproducible

- Generador desde REST y páginas renderizadas oficiales, snapshot, digest y drift check.
- Método, familia, descripción, campos, required/conditional, ejemplo, batch, modo, docs y fecha fuente.

### Slice 2 — Transporte y gobierno

- GET + POST en el cliente canónico; retry sólo para GET y compatibilidad del wrapper POST.
- Cobertura oficial separada de cobertura ejecutable y razón de habilitación.

### Slice 3 — UX terminal y lifecycle

- `catalog info|list|search|describe`, `quick`, `run` y polling acotado.
- Payload por flag/archivo/stdin, preview, ceilings, salida JSON/archivo y exit codes.

### Slice 4 — Adopción y evidencia

- Tests, manual, package scripts y actualización de la skill de DataForSEO.
- Smokes gratuitos y consultas pagadas mínimas de los casos diarios.

## Out of Scope

- Ampliar el allowlist a AI Optimization, Keywords Data, Business Data u otra familia.
- Crear organización para prospectos, cambiar flags, desplegar o programar crons.
- Probar todos los endpoints mediante llamadas pagadas.
- Modificar el resolver de mercados ni el alcance de TASK-1863.

## Detailed Spec

El snapshot es evidencia del catálogo, no autorización. Una ruta `catalog_only` conserva `reason` y `enablement`.
Una ejecución pagada sin estimador verificable exige `--estimated-usd`, `--max-usd` y `--yes`. La salida conserva
`queriedAt`, `surface`, endpoint, familia, organización si existe, task IDs/status, costo y resultado íntegro.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3 → Slice 4.
- El smoke pagado sólo corre después de preview, tests y GET gratuito.

### Risk matrix

| Riesgo                                     | Sistema        | Probabilidad | Mitigation                          | Signal de alerta        |
| ------------------------------------------ | -------------- | ------------ | ----------------------------------- | ----------------------- |
| Ruta oficial catalogada pero no autorizada | provider/spend | medium       | `catalog_only` fail-closed          | exit 3                  |
| Doble gasto por retry                      | DataForSEO     | low          | cero retry POST                     | task/cost provenance    |
| Mercado incorrecto                         | SEO/AEO        | medium       | resolver compartido + location code | error antes del request |
| Drift documental                           | catálogo       | medium       | digest + `catalog:check`            | CI/local gate           |

### Feature flags / cutover

Sin flag — herramienta local aditiva; la ejecución real sigue exigiendo confirmación y controles existentes.

### Rollback plan per slice

| Slice | Rollback                             | Tiempo  | Reversible? |
| ----- | ------------------------------------ | ------- | ----------- |
| 1     | revertir snapshot y generador        | minutos | sí          |
| 2     | revertir GET; wrapper POST permanece | minutos | sí          |
| 3     | retirar scripts de package.json      | minutos | sí          |
| 4     | revertir docs/tests                  | minutos | sí          |

### Production verification sequence

1. Sincronizar catálogo y verificar conteos/rutas diarias.
2. Ejecutar tests focales y TypeScript con heap del repo.
3. Ejecutar previews Perú/US y confirmar payloads.
4. Ejecutar GET gratuito de catálogo/estado.
5. Ejecutar un smoke mínimo por caso diario sólo con techo explícito y registrar costo/status.

### Out-of-band coordination required

N/A — cambio repo-only; no compra planes, no rota secretos y no despliega.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] El catálogo proviene de la documentación oficial concreta y contiene más de 500 endpoints.
- [x] Cada endpoint declara cobertura oficial y cobertura ejecutable separadas.
- [x] GET/POST, breaker, ledger y entitlement pasan pruebas focales sin segundo cliente.
- [x] La CLI permite descubrimiento, preview, queries comunes, ejecución genérica y lifecycle async.
- [x] Perú AI Mode produce `location_code=2604`, español y desktop sin fallback.
- [x] Fallo task `40501`, pendiente, éxito vacío y transporte tienen estados/exit codes distintos.
- [x] Manual, package scripts y skill permiten que el siguiente agente encuentre la CLI.
- [x] Smokes reales mínimos quedan registrados con costo; no hay barrido pagado del catálogo.
- [x] `research` encadena discovery, overview, SERP finalista y competencia bajo un presupuesto agregado.
- [x] La salida deduplica, conserva procedencia y distingue volumen ausente, `null` y cero en JSON/CSV.
- [x] El CSV normaliza intención, gobernanza, URLs propias/competidoras, features, PAA, AI Overview/citas y
      provenance; el JSON conserva raw.
- [x] SERP sólo corre con archivo de finalistas o aprobación automática explícita; `--yes` no sustituye ese gate.
- [x] Checkpoint tenant-safe conserva runId, fingerprints, task IDs, TTL, cursores y costo para `--resume`.
- [x] Cada POST compuesto revalida entitlement y costo observado + siguiente estimación contra `--max-usd`.
- [x] SERP Standard es default; live y AI Overview son opt-in, y polling nunca resubmite.
- [x] `ai-research` separa API/consumer y normaliza citas, fan-out, entidades, plataforma, modelo y costo.

## Verification

- `pnpm dataforseo:catalog:check`
- `pnpm test -- src/lib/ai/__tests__/dataforseo-catalog.test.ts src/lib/ai/__tests__/dataforseo-cli-presets.test.ts scripts/dataforseo/__tests__/cli.test.ts`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm task:lint --task TASK-1935`
- previews y GET gratuito documentados en el cierre

## Closing Protocol

- [x] `Lifecycle` del markdown quedó sincronizado con el estado real.
- [x] El archivo vive en la carpeta correcta.
- [x] `docs/tasks/README.md` quedó sincronizado.
- [x] `Handoff.md` quedó actualizado sin pisar TASK-1863.
- [x] `changelog.md` quedó actualizado.
- [x] Se ejecutó chequeo de impacto cruzado sobre TASK-1863 y consumers de DataForSEO.
- [x] No hubo commit, push, deploy ni cambio de flags sin autorización separada.

## Follow-ups

- Una ampliación del allowlist usa su propia decisión/migración; no se infiere desde el catálogo.

## Open Questions

- Ninguna load-bearing para la herramienta local; cada familia no autorizada conserva su ruta de habilitación.
