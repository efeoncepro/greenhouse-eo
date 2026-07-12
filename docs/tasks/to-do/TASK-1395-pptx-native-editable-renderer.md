# TASK-1395 — PPTX Native Editable Renderer for Artifact Composer

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `to-do`
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
- Epic: `EPIC-027`
- Status real: `Diseno`
- Rank: `TBD — posterior a TASK-1393; habilita el primer target editable antes de su incorporación productiva en TASK-1391`
- Domain: `commercial|platform|ops`
- Blocked by: `TASK-1393 (Artifact Composer, catalog snapshot y ResolvedCompositionManifest)`
- Branch: `task/TASK-1395-pptx-native-editable-renderer`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Agregar `pptx-native` como renderer del Artifact Composer. Recibe exclusivamente el
`ResolvedCompositionManifest`, construye texto, formas, tablas, barras, hitos e imágenes como objetos
PowerPoint editables y declara una matriz de capacidad por plantilla. No convierte HTML, PNG ni PDF.

El primer corte demuestra que `TimelineFull` conserva unidades, rangos, fases, hitos y `barLabel` desde
datos, y que `ChartSplit` conserva sus marcas y callout derivados. Todo content type sin representación
nativa aborta; no se rasteriza una slide completa ni hay fallback silencioso a PDF.

## Why This Task Exists

Hoy el Composer emite PDF contractual y PNGs de revisión desde Chromium. El manifest post-TASK-1393
contendrá la semántica/versiones que necesita un segundo renderer, pero no existe writer `.pptx`, matriz
de editabilidad ni prueba real de PowerPoint. Convertir HTML/CSS congelaría gradientes, filtros y
geometría derivada, creando una falsa promesa de editabilidad.

## Goal

- Implementar un adaptador `pptx-native` determinista desde el manifest, no copy libre ni DOM/HTML.
- Emitir objetos PowerPoint editables: una barra y su `barLabel` deben seguir siendo forma y texto.
- Versionar una capability matrix por `contentType`/plantilla y fallar cerrado fuera de ella.
- Dejar un contrato que `artifact-worker` de TASK-1391 pueda consumir sin recrear geometría, selector ni
  autoridad del manifest.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/GREENHOUSE_TENDER_DECK_COMPOSER_V1.md`
- `docs/architecture/GREENHOUSE_ARTIFACT_COMPOSER_PLATFORM_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md`
- `docs/tasks/to-do/TASK-1393-artifact-composer-extraction-catalogs-brand-pack.md`
- `docs/tasks/to-do/TASK-1391-tender-deck-renderer-worker-artifact-pipeline.md`

Reglas obligatorias:

- PDF/Chromium sigue contractual y de referencia; PPTX no sustituye ni interpreta HTML.
- El único input es `ResolvedCompositionManifest`; autor/agente no escoge template ni entrega coordenadas.
- La geometría semántica de schedules se comparte antes de mapear a PowerPoint; no hay porcentajes
  manuales por renderer.
- Una edición externa es variante declarada, no mutación silenciosa del manifest.

## Normative Docs

- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`
- `docs/operations/SOLUTION_QUALITY_OPERATING_MODEL_V1.md`
- `docs/architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md`

## Dependencies & Impact

### Depends on

- `TASK-1393` — entrega `src/lib/artifact-composer/**`, catálogo `deck-axis`, brand/font pack y manifest
  resuelto. No iniciar contra el `DeckPlan` histórico.
- Los contratos/fixtures de `src/lib/commercial/tenders/deck/**`, que sobreviven el move de TASK-1393,
  son baseline de contenido y geometría.

### Blocks / Impacts

- Bloquea el primer target editable que después integrará el job de TASK-1391.
- Afecta registry de targets/CLI/matriz de editabilidad; no modifica PDF contractual ni Adobe Express.

### Files owned

- `src/lib/artifact-composer/**` post-TASK-1393 (adapter, tipos y tests)
- Entry point CLI canónico existente, sólo para invocación explícita `pptx-native`
- Documentación de arquitectura/manual del Composer

## Current Repo State

### Already exists

- `src/lib/commercial/tenders/deck/compose.ts` compone PDF/PNG con Chromium y preserva el orden de slides.
- `TimelineFull` deriva grilla, rangos, barras, hitos, conectores y `barLabel` desde schedule; sus tests
  viven en `src/lib/commercial/tenders/deck/__tests__/timeline-full.test.ts`.
- TASK-1393 deja `outputTarget` extensible/fail-closed, pero sólo implementa `pdf-merged` y `png-set`.

### Gap

- No existe writer PPTX, capability matrix, test OOXML de editabilidad ni validación PowerPoint
  macOS/Windows.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `src/lib/artifact-composer/**` post-TASK-1393; CLI sólo consumer local.
- Future candidate home: `domain-package`
- Boundary: `ArtifactTargetRenderer` recibe manifest y expone bytes, capability matrix y errores. Sólo CLI,
  `artifact-worker` de TASK-1391 y tests pueden consumirlo; ninguna view importa librería PPTX.
- Server/browser split: contratos/matrices/errores browser-safe; writer, filesystem temporal, fuentes y
  librería PPTX server-only.
- Build impact: dependencia PPTX pinneada, fuentes/imagenes locales y fixtures ZIP/XML; sin deployable.
- Extraction blocker: fidelidad de fuentes y evidencia Office macOS/Windows; persistencia/publicación es
  de TASK-1391.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: `ResolvedCompositionManifest` y catálogo `deck-axis` post-TASK-1393.
- Consumidores afectados: CLI, futuro `artifact-worker`, Proposal artifact command y QA.
- Runtime target: `local|worker`

### Contract surface

- Contrato existente a respetar: ADR del Composer y contratos/catalogos que TASK-1393 materializa.
- Contrato nuevo o modificado: target `pptx-native`, `ArtifactTargetRenderer`, matriz
  `template/contentType → native-editable|brand-locked|unsupported` y errores serializables.
- Backward compatibility: `compatible`; PDF/PNG no cambian y PPTX jamás es default implícito.
- Full API parity: primitive server-side consumible por el command/worker de TASK-1391; no nace botón ni
  endpoint PPTX paralelo.

### Data model and invariants

- Entidades/tablas/views afectadas: ninguna; manifest/hashes son input inmutable.
- Invariantes que no se pueden romper:
  - cada slide conserva `slideId`, orden, slots y versiones; no se inventa copy, fechas ni assets;
  - fases/hitos de TimelineFull derivan del schedule y `barLabel` queda editable o el target rechaza;
  - template/asset/fuente/primitive no soportada aborta el deck; nunca una imagen de slide completa.
- Tenant/space boundary: no hay DB/API; catalog/brand pack/`ownerOrgId` delimitan input. TASK-1391/1392
  derivan proposal, audience y actor al publicar.
- Idempotency/concurrency: `manifestHash + targetRevision` produce mismo modelo; lock/persistencia queda
  en TASK-1391.
- Audit/outbox/history: resultado devuelve target revision/capability/hashes para TASK-1391; sin ledger
  paralelo.

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `disabled`; sólo fixtures/CLI explícito hasta cobertura aprobada y worker productivo.
- Backfill plan: `N/A — no hay estado persistido`.
- Rollback path: desregistrar `pptx-native` y revertir adapter; PDF/PNG intactos.
- External coordination: licencia de librería y evidencia manual PowerPoint macOS/Windows.

### Security and access

- Auth/access gate: server-only; no acepta manifest arbitrario desde browser. TASK-1391 gobierna renders.
- Sensitive data posture: no loguear slots, evidencias ni assets en errores/fixtures/telemetría.
- Error contract: `artifact_target_unsupported`, `artifact_target_geometry_unsupported`,
  `artifact_target_editability_violation`, `artifact_target_asset_unavailable`.
- Abuse/rate-limit posture: sin endpoint público; worker futuro aplica cola/límites.

### Runtime evidence

- Local checks: tests target/fixtures TimelineFull/ChartSplit e inspección OOXML de texto/formas.
- DB/runtime checks: `N/A — sin DB/servicio`; probar que PDF/PNG no cambian.
- Integration checks: abrir fixtures en PowerPoint macOS/Windows, comparar con PDF y editar título,
  `barLabel`, fase e hito sin desarmar la slide.
- Reliability signals/logs: retorno target/revision/capability; señal persistida corresponde a TASK-1391.
- Production verification sequence: `N/A` hasta TASK-1391; cierre correcto es `code complete, rollout pendiente`.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     Se completa al tomar la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — DETAILED SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

In scope:

- Target `pptx-native`, capability matrix, shared semantic geometry and native object mapping para
  texto/imagen base, `TimelineFull` y `ChartSplit`.
- Tests OOXML, fixtures de variación de timeline y evidencia de edición en PowerPoint macOS/Windows.

El target se declara limitado a esa matriz. No se representa como soporte general de `deck-axis` hasta
que cada content type tenga implementación y evidencia.

## Detailed Spec

### Slice 0 — Contrato de target y matriz

- Confirmar shape post-1393 y librería PPTX pinneada/licenciada.
- Definir soporte inicial explícito: texto/imagen base, `TimelineFull` y `ChartSplit`; todo lo demás
  queda `unsupported`.
- Añadir preflight de deck completo antes de escribir el primer archivo.

### Slice 1 — Primitives y geometría nativa

- Mapear canvas, font/color brand pack, texto, tablas, imágenes, barras, diamonds, conectores y callouts.
- Mapear TimelineFull desde `timeUnit`, unidades, ranges y milestones; no aceptar porcentajes de negocio.
- Mapear ChartSplit desde series/porcentajes/`gapCallout` y conservar `value ↔ valuePct`.

### Slice 2 — Editabilidad y equivalencia

- Inspeccionar ZIP OOXML: texto/shapes nativos, sin full-slide image fallback.
- Probar fixtures con unidades/rangos/fases/hitos/labels distintos y comparar geometría con PDF.
- Revisar/editar en PowerPoint macOS y Windows; documentar diferencias aceptadas por primitive.

## Out of Scope

- Convertir HTML/CSS, PDF o PNG a PPTX.
- Declarar las 25 plantillas editables sin implementación/QA.
- Worker, storage, DB, API, capability/publicación: TASK-1391.
- Sincronización bidireccional de cambios manuales PPTX.
- Adobe Express/credenciales: TASK-1396.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

1. TASK-1393 congela manifest/brand-font pack antes de Slice 0.
2. Matriz/preflight antes de emitir `.pptx`.
3. OOXML + Office macOS/Windows antes de marcar un content type `native-editable`.
4. No worker/publicación hasta que TASK-1391 entregue su gate de artefactos.

| Riesgo | Sistema | Probabilidad | Mitigación | Señal |
| --- | --- | --- | --- | --- |
| Parece editable pero rasteriza | PPTX | medium | OOXML + anti-full-slide-image | falta shape/texto nativo |
| Deriva Gantt/PDF | timeline | medium | geometría compartida + fixtures | posición/label distinto |
| Fuente sustituida altera layout | PowerPoint | medium | font pack + QA en dos SO | overflow/salto |
| Template no implementado se entrega | propuesta | low | preflight fail-closed | content type desconocido |

### Feature flags / cutover

`PPTX_NATIVE_TARGET_ENABLED=false` cuando exista worker. Antes, sólo CLI/fixtures y nunca publicación.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible |
| --- | --- | --- | --- |
| 0–2 | Desregistrar target y revertir adapter/tests; PDF/PNG intactos | minutos | sí |
| worker futuro | Flag OFF y detener nuevos jobs PPTX | minutos | sí |

### Production verification sequence

1. QA OOXML + Office en ambos sistemas.
2. Tras TASK-1391, staging con flag OFF y manifest controlado.
3. Habilitar staging para matriz, validar hash/metadata y editar PPTX.
4. Piloto allowlisted con monitoreo y rollback por flag.

### Out-of-band coordination required

- Licencia/versionado de librería PPTX.
- Acceso a PowerPoint macOS y Windows.
- Aprobación de diferencias visuales deliberadas frente al PDF contractual.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] `pptx-native` recibe sólo manifest post-1393; PDF/PNG no regresan.
- [ ] Matriz versionada declara soporte y toda slide fuera aborta antes de emitir archivo.
- [ ] TimelineFull conserva schedule/fases/hitos/`barLabel` como objetos editables.
- [ ] ChartSplit conserva series/porcentajes/callout derivado como objetos PPTX.
- [ ] Tests OOXML prueban objetos nativos y ausencia de raster fallback.
- [ ] Existe evidencia PowerPoint macOS/Windows con diferencias aceptadas documentadas.
- [ ] Error/access/idempotencia/migración/rollback tienen postura explícita y testeada.
- [ ] Target no es publicable hasta TASK-1391 + rollout.

## Verification

- `pnpm task:lint --task TASK-1395`
- `pnpm ops:lint --changed`
- `pnpm lint`
- `pnpm tsc --noEmit`
- Tests focales `src/lib/artifact-composer/**` y fixtures TimelineFull/ChartSplit
- Inspección OOXML + revisión Office macOS/Windows

## Closing Protocol

- [ ] Lifecycle/carpeta reflejan estado real; sin worker/staging, declarar `code complete, rollout pendiente`.
- [ ] README/registry, arquitectura, changelog, Handoff y manual declaran matriz/flags/límites reales.
- [ ] TASK-1391 se actualiza si pasa a consumir este target.
- [ ] `pnpm qa:gates --changed --agent codex` antes de cierre implementado.

## Follow-ups

- Ampliar matriz por content type sólo con implementación/QA.
- Integrar al command/worker de TASK-1391.
- TASK-1396 — Adobe Express REST limitado a templates etiquetados.

## Open Questions

- Umbral de fidelidad/fuentes aceptables por versión de PowerPoint antes de ampliar matriz.
