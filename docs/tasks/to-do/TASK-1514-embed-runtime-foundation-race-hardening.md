# TASK-1514 — Embed Runtime Foundation and Release Race Hardening

<!-- ZONE 0 — IDENTITY & TRIAGE -->

## Status

- Lifecycle: `to-do`
- Priority: `P0`
- Impact: `Muy alto`
- Effort: `Alto`
- Type: `implementation`
- Execution profile: `backend-data`
- UI impact: `none`
- UI ready: `n/a`
- Wireframe: `none`
- Flow: `none`
- Motion: `none`
- Backend impact: `integration`
- Epic: `EPIC-035`
- Status real: `Diseño aceptado; foundation pendiente`
- Rank: `TBD`
- Domain: `platform`
- Blocked by: `none`
- Branch: `task/TASK-1514-embed-runtime-foundation-race-hardening`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

Estabiliza el carril Vercel vigente de Meetings y materializa el protocolo común de Efeonce Embed Runtime: manifests
tipados, releases retenidos, fleet snapshots, separación API/assets y fixtures host. El objetivo inmediato es hacer
imposible la carrera manifest→asset antes de seleccionar/provisionar otro delivery plane o migrar productos.

## Why This Task Exists

El site build de Meetings conserva sólo el release corriente. Si el browser obtiene el manifest A y el alias cambia
a B antes de pedir el asset A, la nueva deployment puede responder 404. Forms y CTA, además, carecen de un protocolo
común y mezclan el origen de API con el de assets. Migrar ese estado a otro CDN sólo trasladaría el defecto.

## Goal

- Garantizar que todo release alcanzable por un manifest siga disponible durante promoción y rollback.
- Definir y validar el protocolo V1 compartido sin crear un megabundle.
- Proveer fixtures reproducibles para WordPress y Think/Astro que las migraciones posteriores reutilicen.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/GREENHOUSE_EFEONCE_EMBED_RUNTIME_DELIVERY_DECISION_V2.md`
- `docs/architecture/GREENHOUSE_EFEONCE_EMBED_RUNTIME_ARCHITECTURE_V1.md`
- `docs/architecture/GREENHOUSE_PUBLIC_RENDERER_ARTIFACT_DELIVERY_DECISION_V1.md`
- `docs/architecture/GREENHOUSE_GROWTH_MEETINGS_SCHEDULER_ARCHITECTURE_V1.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

Reglas obligatorias:

- Build de producto nunca elimina releases todavía alcanzables ni ejecuta garbage collection.
- Loader, manifest y assets de una carga pertenecen al mismo release; assets inmutables, pointers revalidables.
- `api-base-url` y `asset-base-url` son inputs distintos; ningún provider URL forma parte del protocolo.
- La task no cambia diseño, booking, submission, targeting ni fuentes de verdad Growth.

## Normative Docs

- `docs/epics/to-do/EPIC-035-efeonce-embed-runtime.md`

## Dependencies & Impact

### Depends on

- `scripts/build-growth-meeting-renderer-site.mjs`
- `scripts/release-growth-meeting-renderer-site.mjs`
- `scripts/verify-growth-meeting-renderer-site.mjs`
- `scripts/lib/growth-meeting-renderer-build.mjs`
- `TASK-1510` como evidencia del renderer vigente; no cambia su epic primario.

### Blocks / Impacts

- Bloquea la mutación/provisioning de `TASK-1515` y los cutovers de `TASK-1516`..`1518`. Discovery no mutante de
  provider/IAM/costos puede avanzar en paralelo; Forms/CTA pueden inventariar compatibilidad, pero no implementar el
  protocolo antes de congelar V1.
- Cambia el contrato de artifact build/release, no la UI del scheduler.

### Files owned

- `scripts/build-growth-meeting-renderer-site.mjs`
- `scripts/release-growth-meeting-renderer-site.mjs`
- `scripts/verify-growth-meeting-renderer-site.mjs`
- `scripts/lib/embed-runtime/` (nuevo, tooling acotado)
- `src/growth-meeting-renderer/contract.ts`
- `docs/architecture/GREENHOUSE_EFEONCE_EMBED_RUNTIME_ARCHITECTURE_V1.md`

## Current Repo State

### Already exists

- Release Meetings content-addressed y loader estable en `efeonce-public-renderers`.
- Builders separados para Forms, CTA y Meetings.
- Telemetry y contratos browser-safe por producto.

### Gap

- Snapshot nuevo no retiene el release anterior.
- `health.json` no prueba asset/SRI/API/host compatibility.
- Manifest no declara producto, protocolo, contrato/API range ni dependencias.
- No existe fixture común WordPress + Think ni fleet composer.

## Modular Placement Contract

- Topology impact: `tooling`
- Current home: `scripts/*growth-*-renderer* + src/growth-*-renderer`
- Future candidate home: `remain-shared`
- Boundary: `manifest schema + fleet composer; los builders de producto son consumers independientes`
- Server/browser split: `tooling Node compone artifacts; loader browser-safe sólo interpreta manifest público`
- Build impact: `nuevo input filesystem explícito para snapshots retenidos; sin dependencia runtime pesada`
- Extraction blocker: `release history y fixtures viven hoy en el repo monolítico`

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `integration`
- Source of truth afectado: `release manifests y fleet snapshot de public renderers`
- Consumidores afectados: `release tooling, WordPress, Think/Astro, browsers`
- Runtime target: `external`

### Contract surface

- Contrato existente a respetar: `meeting renderer loader + content-addressed release`
- Contrato nuevo o modificado: `embed-runtime protocol v1 manifest + fleet retention contract`
- Backward compatibility: `compatible`
- Full API parity: `N/A — no capability de negocio; tooling de artifacts`

### Data model and invariants

- Entidades/tablas/views afectadas: `ninguna DB; JSON manifests y release directories`
- Invariantes que no se pueden romper:
  - `manifest alcanzable implica assets alcanzables`
  - `hash/SRI corresponden a los bytes publicados`
  - `productos mantienen versionado y rollback independientes`
- Tenant/space boundary: `N/A — artifacts públicos sin tenant ni PII`
- Idempotency/concurrency: `mismo input produce mismo release/fleet digest; promoción concurrente serializada`
- Audit/outbox/history: `release receipt con sourceSha, actor/run y fleet digest`

### Migration, backfill and rollout

- Migration posture: `none`
- Default state: `read-only`
- Backfill plan: `incorporar release stable y previous vigente al primer snapshot retenido`
- Rollback path: `usar el release Vercel verificado anterior y revertir tooling`
- External coordination: `ninguna promoción productiva sin autorización`

### Security and access

- Auth/access gate: `protected release workflow; local build no promueve`
- Sensitive data posture: `no sensitive data`
- Error contract: `errores deterministas sin paths sensibles ni payloads externos`
- Abuse/rate-limit posture: `N/A — artifacts estáticos`

### Runtime evidence

- Local checks: `tests focales de schema/composer + site verify`
- DB/runtime checks: `N/A`
- Integration checks: `manifest A → switch a snapshot B → assets A siguen 200 y hash-match`
- Reliability signals/logs: `receipt + health ampliado por producto/release`
- Production verification sequence: `local fixture → Vercel preview → carrera simulada; no cutover`

### Acceptance criteria additions

- [ ] Source of truth y contratos usan paths reales.
- [ ] Retención, concurrencia y rollback están probados.
- [ ] No se introduce PII, secreto o state de negocio.

<!-- ZONE 2 — PLAN MODE -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

### Slice 1 — Race hardening

- Hacer acumulativo el snapshot con stable, previous, previews/rollback y releases de 30 días.
- Agregar test que intercale manifest A, promoción B y fetch tardío del asset A.

### Slice 2 — Protocol V1 and fleet composer

- Schema/validator con product, protocolVersion, rendererVersion, releaseId, sourceSha, contract/API range,
  dependencies, hashes y SRI.
- Fleet composer determinista, receipts y health ampliado; garbage collection como operación separada.

### Slice 3 — Host fixtures

- Fixtures mínimos WordPress y Think/Astro con loader blocked/incompatible/timeout, telemetry y consent states.
- Inventario de deep selectors host que deban migrarse o formalizarse.

## Out of Scope

- Provisionar Firebase, DNS o billing.
- Cambiar UI/product logic de cualquier renderer.
- Migrar Forms/CTA o retirar URLs legacy.

## Detailed Spec

El fleet snapshot es acumulativo: compone releases ya verificados con el candidato y cambia sólo el channel pointer
del producto promovido. El manifest se valida antes de escribir el snapshot y sus URLs nunca apuntan a un release no
incluido. El test de carrera debe ejecutar el interleaving real y no limitarse a inspeccionar directorios.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

- Slice 1 → Slice 2 → Slice 3. Ningún provisioning de delivery plane inicia hasta cerrar la carrera y congelar
  protocolo V1; sólo discovery read-only de `TASK-1515` puede correr en paralelo.

### Risk matrix

| Riesgo                         | Sistema         | Probabilidad | Mitigation                                | Signal de alerta           |
| ------------------------------ | --------------- | ------------ | ----------------------------------------- | -------------------------- |
| Asset anterior desaparece      | static delivery | high         | snapshots acumulativos + test intercalado | manifest 200 / asset 404   |
| Snapshot crece sin límite      | build           | medium       | retention declarada + GC separado         | tamaño/tiempo de deploy    |
| Loader incompatible rompe host | public host     | medium       | fail-contained fixtures                   | custom element no registra |

### Feature flags / cutover

Sin feature flag de producto. El channel manifest sigue siendo el control de promoción; esta task no cambia live.

### Rollback plan per slice

| Slice | Rollback                                                    | Tiempo  | Reversible? |
| ----- | ----------------------------------------------------------- | ------- | ----------- |
| 1     | restaurar builder Vercel anterior y reasignar alias previo  | <15 min | sí          |
| 2     | mantener loader/protocolo previo; manifests V1 son aditivos | <30 min | sí          |
| 3     | retirar fixtures/tooling sin impacto runtime                | <15 min | sí          |

### Production verification sequence

1. Build determinista local dos veces y comparar digests.
2. Verificar carrera simulada y hashes/SRI.
3. Desplegar preview Vercel sin mover stable y medir el tiempo desde candidate aprobado hasta preview disponible.
4. Ejecutar fixtures WordPress/Think y conservar receipt.

### Out-of-band coordination required

La preview Vercel es la única mutación cloud autorizada y no mueve alias stable, DNS ni consumers live.

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria

- [ ] La prueba manifest A → snapshot B → asset A devuelve 200 y hash correcto.
- [ ] El build no elimina releases retenidos y GC es una operación separada.
- [ ] Protocol V1 valida todos los campos definidos por la arquitectura.
- [ ] `api-base-url` y `asset-base-url` no se derivan uno del otro.
- [ ] Fixtures WordPress y Think cubren loader sano, bloqueado, incompatible y timeout.
- [ ] Health/receipt prueban assets, source SHA y fleet digest, no sólo release ID.
- [ ] Actions/CLI están versionadas o pinneadas, el lockfile es respetado y cada asset live puede mapearse a source
  SHA, digest, workflow protegido y aprobación.
- [ ] Fixtures registran 2048/1440/820/390, teclado, foco, reduced motion y `scrollWidth === clientWidth`.
- [ ] El release receipt permite medir preview ≤5 min y confirmar que no hubo Greenhouse application release.
- [ ] No cambia UI ni fuentes de verdad de Forms/CTA/Meetings.

## Verification

- Tests focales de `scripts/lib/embed-runtime/` y renderers.
- `pnpm renderer:meeting:site:build`, `pnpm renderer:meeting:site:verify`.
- `pnpm local:check`, `pnpm task:lint --task TASK-1514`, `pnpm ops:lint --changed`.

## Closing Protocol

- [ ] Lifecycle/carpeta e índices sincronizados.
- [ ] EPIC-035 actualizado con evidencia de foundation.
- [ ] Handoff/changelog actualizados si cambia el carril operativo.
- [ ] QA release auditor y documentation governor revisan cierre.

## Follow-ups

- `TASK-1515` — delivery-plane selection and gated provisioning.
- `TASK-1516` — Meetings dual-publish/cutover.
