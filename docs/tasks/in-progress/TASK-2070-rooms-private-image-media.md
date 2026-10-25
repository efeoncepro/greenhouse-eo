# TASK-2070 — Rooms: imágenes privadas, versiones y procedencia

## Delta 2026-10-25 — estado al corte de Codex

- **Rescate 2026-10-25 (Claude):** el WIP quedó commiteado en la rama local `task/2070-2071-private-media` de `efeonce-rooms` (`c0facfd` backend, `2626921` UI; sin push). Se corrigió el TS2322 y los tests de medios entraron a `pnpm test`: `pnpm verify` PASS con 205/205 tests (incluye 9 de persistencia en la PG local) y build OK. `main` sigue en `20f9fe9` (candidato del canary). Lo de abajo describe el estado previo al rescate.
- El WIP en `efeonce-rooms` está **sin commitear**. `pnpm typecheck` falla (TS2322, `src/app/rooms/[roomId]/edit/page.tsx`, `schemaVersion` 2→1). `pnpm test` 178/178 no incluye `tests/media-*` (18/18 aparte, sin DB); los 9 de persistencia y `build` no se corrieron. Migración sin bloque DO y aplicada sólo en la PG local. Llevar a rama, nunca a `main` (cada push es producción). Corte en [registro de estado](../../audits/rooms/2026-10-25-rooms-auth-status-after-codex-stop.md).

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `in-progress`
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
- Epic: `EPIC-052`
- Status real: `Implementación LOCAL en curso: ADR/plan aceptados, hook --subagents PASS, linttask0warnings. SchemasV3/media, migraciónaditiva y servicio/worker en construcción. HTTP streaming autenticado y rutas/api/v1 implementadas;8/8 pruebas transportePASS y5/5 auth-returnPASS. No integraciónPG/worker/UI completa ni rolloutmedia. Candidataremota20f9fe9 preservada.`
- Rank: `R05A después de R03B/R04; consumidor UI dependiente separado`
- Domain: `platform|data|content`
- Blocked by: `none`
- Branch: `Greenhouse develop para documentos; efeonce-rooms main para runtime; sin worktrees`

## Summary

Construir el primer circuito de imágenes privadas: transferencia autorizada, inspección de bytes,
versiones inmutables, derivados, publicación con cobertura real y lectura protegida de una edición.
Añadir procedencia explícita para material real sin reinterpretar fixtures ni snapshots históricos.
La interfaz se construye en una task dependiente; este corte no completa PDF/audio/video de R05.

## Why This Task Exists

`content-validation.ts` marca todos los assets como unresolved; no hay uploads, tablas de medios ni worker.
`room-reader.tsx` muestra entrega pendiente. Manifest, snapshot y SQL sólo aceptan `dataOrigin=synthetic`;
permitir subir archivos reales sin resolver esa frontera produciría procedencia falsa.

## Goal

- Subir y publicar imágenes verificadas de dos organizaciones sin confiar en metadata o readiness del caller.
- Conservar originales y generaciones; entregar previews sólo tras autorización fresca y pertenencia a edición.
- Probar fallos, reintentos, concurrencia, aislamiento y restore de bytes+metadata por API/CLI.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/rooms/EFEONCE_ROOMS_PRIVATE_IMAGE_MEDIA_AND_PROVENANCE_DECISION_V1.md` — decisión aceptada para implementación local; cloud fuera del corte autorizado.
- `docs/architecture/rooms/EFEONCE_ROOMS_ARCHITECTURE_V1.md` §§3–5.
- `docs/architecture/rooms/EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md`.
- `docs/architecture/rooms/EFEONCE_ROOMS_EXPERIENCE_PROFILES_V1.md`.
- `docs/architecture/rooms/EFEONCE_ROOMS_CLOUD_RUNTIME_PILOT_DECISION_V1.md`.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`.
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`.

## Normative Docs

- `docs/operations/GREENHOUSE_DATABASE_TOOLING_V1.md`.
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`.
- `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md`.
- `.codex/skills/greenhouse-secret-hygiene/SKILL.md`.
- `docs/architecture/GREENHOUSE_WORKER_BUILD_CONTRACT_V1.md`.

## Dependencies & Impact

### Depends on

- TASK-2060/2062: dominio, migraciones, can, transacciones y manifest V2 existentes.
- TASK-2065/2066/2068: identidad interna, invitaciones guest y lectura protegida existentes.
- TASK-2069: WIF, pool y aislamiento cloud; su canary activo no se altera por esta task.
- Hook de task, ADR aceptado y contrato DTO congelado antes de código; recursos cloud requieren preparación/readback y autorización aplicable.

### Blocks / Impacts

- R07/R08 imágenes: upload visible, editor mínimo y visor sobre el mismo renderer.
- R05B PDF/audio/video/tile pyramids, y R13 certificación MCP; no se reservan IDs futuros aquí.

### Files owned

- Futuras `../efeonce-rooms/src/domain/media-*.ts`, `content-contracts.ts`, `content-validation.ts`, permisos/registry pertinentes.
- Futuras `../efeonce-rooms/src/server/media/**`, `src/server/persistence/media*.ts`, `src/server/commands/**` y migración aditiva.
- `../efeonce-rooms/src/server/persistence/content-projection.ts`, readers/store y HTTP/CLI para las nuevas operaciones.
- Futuro `../efeonce-rooms/workers/media/**`, scripts y tests de medios; dependencias pesadas sólo worker.
- Esta task, su plan y ADR; índices/Handoff/CLAUDE quedan coordinados por raíz.

## Current Repo State

### Already exists

- HEAD observado `20f9fe9`; checkout runtime limpio durante discovery.
- `src/domain/content-contracts.ts`: media block y AssetVersionRef con IDs estables.
- `src/server/commands/execute.ts`: CAS, autoridad persistida, receipts/audit/outbox y publish atómico.
- `src/server/persistence/readers.ts`: reader autorizado por tenant/room/edition.
- `src/server/cloud/`: WIF explícito; runtime no usa ADC humano ni credenciales migrator.

### Gap

- `src/domain/content-validation.ts:86`: toda referencia no excluida es pending; ningún byte está verificado.
- `src/domain/content-contracts.ts` y constraints SQL fuerzan synthetic; V1/V2 carecen de snapshot de renditions.
- No uploads, AssetVersion/renditions/jobs, entrega privada, attach puntual ni preview de audiencia para borrador.
- `src/server/presentation/content.ts` sólo cuenta medios; `room-reader.tsx` no muestra archivos privados.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `../efeonce-rooms`; documentación Greenhouse.
- Future candidate home: `worker`
- Boundary: dominio/versiones/permisos en Rooms; worker procesa planes de medios propios, nunca CRM/Globe.
- Server/browser split: claves, storage object keys y authority server-only; DTO browser sin URL persistida ni secrets.
- Build impact: Sharp/decoder en worker aislado; SDK GCS server-only; no native codecs en Next client ni prerender.
- Extraction blocker: atomicidad SQL, generación inmutable y fencing de jobs; no reutilizar workers vecinos por inferencia.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth afectado: nuevas tablas Rooms de uploads/assets/renditions/jobs, manifest/snapshot versionados y storage privado.
- Consumidores afectados: API, CLI, UI dependiente y worker; MCP sigue deuda explícita R13.
- Runtime target: `local` y `worker`; cloud únicamente tras gates/provisión coordinada.

### Contract surface

- Contrato existente a respetar: V1/V2, can, command envelope/idempotency/CAS y reader de edición.
- Contrato nuevo o modificado: uploads.initiate/getStatus/complete/cancel; media.getStatus/retry/cancel/authorizeDelivery; content.attachAsset y previewAudience.
- Backward compatibility: `gated`; V3 explícito, lectores V1/V2 conservados y sin reescritura de snapshots.
- Full API parity: registry por operación, HTTP/CLI mismos primitives y transferencia efectiva; MCP no anunciado hasta adapter certificado.

### Data model and invariants

- Entidades/tablas/views afectadas: futuras `rooms.upload_sessions`, `assets`, `asset_versions`, `media_renditions`, `media_jobs`, `edition_assets`; más constraints V3 en drafts/editions.
- Invariantes que no se pueden romper: bytes+generation+checksum inmutables; ready sólo worker; snapshot fija renditions; autor/grants jamás provenientes del payload; variants editoriales no son derivados técnicos.
- Write-target allowlist: declarar tablas y grants en migración/boundary test propio; no tablas, buckets, cookies ni workers ajenos.
- Tenant/space boundary: principal fresco intersecta org/sala/draft/edition; una referencia no concede acceso a otro asset del tenant.
- Idempotency/concurrency: receipts durables; org lock2060; expectedRevision; generation preconditions; jobs `(assetVersionId,profileVersion)` únicos, lease/fencing y retries acotados.
- Audit/outbox/history: eventos append-only de transferencias y transiciones; ningún descriptor de transferencia/token en receipts/outbox/logs.

### Migration, backfill and rollout

- Migration posture: `additive`; CLI genera ID, no editar migraciones aplicadas.
- Default state: flag multimedia OFF; fixtures locales sintéticas explícitas.
- Backfill plan: ninguno; convertir un borrador a V3 exige command explícito, edición histórica intacta.
- Rollback path: flag OFF + detener nuevas transferencias/jobs; conservar originals/ediciones, down sólo clon y restore probado.
- External coordination: bucket privado propio, IAM runtime/worker mínimo, CORS origen exacto, WIF sin keys, región/coste/retención y release con Platform.

### Security and access

- Auth/access gate: content.edit sobre borrador para escritura/preview; rooms.read sobre edición y pertenencia a snapshot para bytes; operador no gana publish. Original download denegado en este corte.
- Sensitive data posture: archivos y metadatos privados; procedencia declarada no es licencia ni medición acreditada; tokens de transferencia efímeros, no logs/querystrings internos.
- Error contract: códigos estables/redactados, foreign y missing indistinguibles; unsupported/failed/cancelled honestos.
- Abuse/rate-limit posture: tamaños/píxeles/cuotas por org/sala, sesiones y jobs acotados; decoder aislado, sin SVG/HTML/URLs remotas.

### Runtime evidence

- Local checks: lint/types/build y suites puro/PG/HTTP/CLI/worker con imágenes reales de pruebas sintéticas.
- DB/runtime checks: PG16 objetivo, ACL runtime/worker, down/up y restore metadata+objetos/generaciones en entorno desechable.
- Integration checks: cancel/retry, MIME falsificado, checksum incorrecto, bytes truncados, raster enorme, pérdida de lease y fallo de storage.
- Reliability signals/logs: pending/age/failure_code/attempts/fenced_result, bytes procesados/egress; sólo IDs/correlation y métricas sin nombres privados.
- Production verification sequence: fixtures locales → worker/storage aislados → cloud flags OFF → canary explícito sólo imágenes autorizadas → readback/revocar/recovery.

### Acceptance criteria additions

- [ ] Source of truth, contratos, consumidores y destinos de escritura/grants quedan en el mismo cambio.
- [ ] Tenancy, CAS/idempotencia, permisos y errores no filtrantes están verificados.
- [ ] Migración/rollback y restore de bytes+metadata están acreditados.
- [ ] HTTP/CLI/registry usan primitives únicos; exclusión/deuda MCP explícita sin declarar parity completa.

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

### Slice 1 — contratos, procedencia y persistencia

Manifest/snapshot V3 explícitos con real|synthetic y metadata de procedencia; jamás convertir V1/V2 históricos.
Modelar upload, AssetVersion inmutable, rendition/profileVersion, jobs y enlace edition_assets; input no puede declarar ready.
Congelar DTO consumidor con UI y una operación attach atómica que preserve el resto del inventario.

### Slice 2 — transferencia y worker de imágenes

PNG/JPEG/WebP estáticos, originales privados, checksum calculado leyendo bytes, tipo/dimensiones/orientación/alpha medidos.
Transferencia directa a cuarentena; complete revalida identidad, tamaño y generación. Inspección/derivados fuera de locks SQL.
Worker local ejecutable y adapter GCS explícito; perfil normalizado y miniatura con ratio íntegro, sin recorte/estiramiento.
Job con fencing/retry/cancel; corrupción o formato no soportado bloquean publication del asset requerido.

### Slice 3 — publicación, lectura y paridad

Publish carga AssetVersion ready autorizadas y congela generación, checksum, metadata y rendition IDs en la edición.
Reader de previewAudience requiere content.edit y devuelve proyección de audiencia sin hacerse pasar por cliente.
Endpoint same-origin GET/HEAD/Range reautoriza cada petición y transmite derivados con backpressure; nunca arrayBuffer de archivo completo.
HTTP/CLI suben bytes y hacen readback; original descargable, PDF/audio/video quedan explícitamente fuera de esta primera entrega.

## Out of Scope

UI visible, cambio al canary de identidad, buckets/worker nuevos sin gate de recursos, email a clientes, URLs remotas,
SVG/HTML/GIF animado, PDF/audio/video/HLS/tiles, escenarios/tours, integraciones CRM y activación MCP.

## Detailed Spec

El ADR de esta task fija inputs/output V3, estado y metadata; el plan propone límites iniciales y orden de verificación.
Los formatos no soportados se rechazan antes de abrir una transferencia, conservando el inventario de importación con error explícito.
La metadata real verificada describe bytes; no transforma evidencia comercial author-declared en verified/measured.

## Rollout Plan & Risk Matrix

### Slice ordering hard rule

ADR/hook → contratos/migración → transferencia/worker → resolver publish/delivery → QA → consumidor UI → canary cloud.
No desbloquear publish quitando asset_unresolved antes de existir resolver persistido y prueba negativa cross-tenant.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Ready falsificado o asset ajeno | SQL/API | medium | Resolver interno + scope y generación | rejected_asset_scope |
| Decoder agota CPU/RAM | worker | medium | Raster/bytes/timeout/concurrencia acotados | media_limit_exceeded |
| Upload cancelado sigue llegando | GCS | medium | Cancel session + cuarentena + complete denegado + cleanup | orphan_quarantine_bytes |
| Worker viejo sobrescribe derivado | worker/storage | medium | Fencing + generación/precondition | fenced_result |
| Revocación pierde efecto por caché | delivery | medium | Auth cada request, no-store, sin URL bearer de lectura | delivery_denied |
| Origen real falsificado por migración | contenido | medium | V3 explícito, autor/fecha y sin relabel | provenance_mismatch |

### Feature flags / cutover

`ROOMS_MEDIA_ENABLED=false` inicialmente; OFF niega nuevas escrituras/entregas sin tocar OIDC/OTP ni textos V1/V2.
Rollout por cohorte y configuración explícita; no ADC/local fallback en Production.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| Contratos/migración | Deshabilitar writers V3, conservar legacy y snapshots | Medir en QA | Sí, datos conservados |
| Transferencia/worker | OFF, cancelar sesiones propias y pausar claims; no borrar originales | Medir en QA | Parcial: bytes ya transferidos persisten |
| Lectura/publicación | OFF + renderer de estado indisponible; no reescribir edición | Medir en QA | Sí para nuevas peticiones |

### Production verification sequence

1. Migración y restore PG16+storage aislado, negativos de permisos/worker PASS.
2. Build y perfil cloud OFF sin llamadas de red de prerender; cuotas/coste/IAM readback.
3. Canary autorizado con dos organizaciones, upload→ready→publish→preview→revoke, sin clientes por inferencia.
4. UI verifica render real sin URLs privadas en HTML/cache/logs; registrar versión y límites.
5. Sólo entonces release/promoción aprobada; detener al primer gate fallido.

### Out-of-band coordination required

Platform decide recursos/región/IAM/presupuesto/retención; Auth mantiene su canary independiente; UI acuerda DTO.
El registro de esta task no inicia aprovisionamiento ni despliegue.

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] V1/V2 permanecen legibles e inmutables; V3 real/synthetic explícito y procedencia sin inferencias.
- [ ] PNG/JPEG/WebP de dos marcas/tenants recorren upload→bytes verificados→derivados→publish→lectura privada por HTTP/CLI.
- [ ] MIME/ready/checksum/dimensiones falsificados, oversized, malformed, unsupported y assets ajenos son rechazados sin pérdida silenciosa.
- [ ] Retry/CAS/cancel/replay y lease/fencing no duplican originales ni publican resultado obsoleto; auditoría y outbox son atómicos.
- [ ] Snapshot fija assetVersion/rendition/generation y conserva edición antigua cuando llega material nuevo.
- [ ] Revocar sesión/grant o archivar niega nuevas peticiones de bytes; cache/logs/HTML no filtran transferencias o keys.
- [ ] Ratios/orientación/alpha e imágenes largas se verifican sin crop/stretch; límite de resolución y original no descargable quedan explícitos.
- [ ] Down/up y restore de DB+storage/generaciones/ACL PASS; código worker aislado del bundle de UI.
- [ ] Gates lint/typecheck/test/build, paridad HTTP/CLI, manual técnico y limitaciones R05B/R13 actualizados.

## Verification

- `pnpm task:lint --task TASK-2070` antes de ejecución/cierre; `pnpm codex:task-hook TASK-2070 --subagents` antes de código, por raíz.
- Runtime: tests media puro+PG+HTTP+CLI+worker; full suite existente, lint/types/build y lectura V1/V2.
- Restore de metadata/objetos y fallos de storage/lease; cloud y UI se acreditan separadamente, sin marcar gates no ejecutados.

## Closing Protocol

No cerrar por código local solamente: registrar evidencia exacta por criterio y pendientes cloud/UI; tasklint antes del move.

## Closing Checklist

- [ ] Lifecycle/Status real/criterios y carpeta coinciden con evidencia.
- [ ] Raíz sincroniza README/registry/epic/DECISIONS_INDEX/Handoff sin sobrescribir WIP.
- [ ] Manuales de operar medios y documentación técnica registran límites y recuperación.
- [ ] Deuda PDF/audio/video/editor/MCP conserva owner y siguiente condición verificable.

## Follow-ups

R05B amplía formatos y derivados; R07/R08 UI consume la imagen privada; R13 agrega/certifica transferencia MCP.
