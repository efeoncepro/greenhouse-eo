# TASK-2077 — Rooms: pipeline local privado de PDF, audio y video

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     "Que task es y puedo tomarla?"
     Un agente lee esto primero. Si Lifecycle = complete, STOP.
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
- Backend impact: `command`
- Epic: `EPIC-052`
- Status real: `2026-10-29: Pipeline local V4 completo: imagen+PDF/audio/video en misma edición, derivados físicos/sandbox/pins y entrega privada; anclas temporales sólo en duración medida.337testsPASS/0skip, lint/types/build, fresh13/43 y restore mixto PG16/18(23objetos/14pins) PASS. Linux/cloud/rollout y UI excluidos del cierre local.`
- Rank: `wip`
- Domain: `platform|data`
- Blocked by: `none`
- Branch: `Rooms codex/rooms-design-integration; Greenhouse develop, checkout compartido sin worktrees`

## Summary

Completar un pipeline local opt-in V4 para PDF completo, audio y video privados, con subida acotada,
validación/decodificación real aislada, jobs con fencing, derivados medidos y entrega reautorizada.
Claude Design conserva UI; Linux/cloud permanecen bloqueados hasta toolchain pinneado/certificado.

## Why This Task Exists

R05A admite exclusivamente imágenes. Ampliar MIME sin decoder, inventario PDF íntegro, duración/peaks
medidos y streaming privado sería anunciar una capacidad inexistente. Ninguna task posee R05B.

## Goal

- Procesar bytes físicos de los tres formatos y conservar metadata/hash del original sin descarga.
- Publicar V4 sólo desde assets ready del mismo ámbito y procedencia; V1/V2/V3 permanecen intactos.
- Probar denegación, hash, Range, revocación y errores locales sin proveedor ni producción.


<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     "Que necesito entender antes de planificar?"
     El agente lee cada doc referenciado aqui. Si un doc no
     existe en el repo, reporta antes de continuar.
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

- `docs/architecture/rooms/EFEONCE_ROOMS_ARCHITECTURE_V1.md`
- `docs/architecture/rooms/EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md`
- `docs/architecture/rooms/EFEONCE_ROOMS_LOCAL_MULTIMEDIA_DECISION_V1.md`
- `docs/architecture/rooms/EFEONCE_ROOMS_PRIVATE_IMAGE_MEDIA_AND_PROVENANCE_DECISION_V1.md`

Reglas: contenido publicado inmutable, autoridad persistida, decoder fuera de transacción, sin red,
original no descargable, pipeline local explícito distinto del worker cloud de imágenes.

## Normative Docs

- `docs/tasks/TASK_PROCESS.md`
- `docs/tasks/TASK_BACKEND_DATA_ADDENDUM.md`
- `docs/operations/MODULAR_MIGRATION_NEW_WORK_OPERATING_MODEL_V1.md`

## Dependencies & Impact

### Depends on

- TASK-2060/2062/2070/2072: dominio, revisiones, inmutabilidad y patrón worker.

### Blocks / Impacts

- EPIC-052 R05B, UI2071 posterior, presentación y certificación multimedia R15.

### Files owned

- `../efeonce-rooms/src/domain/multimedia-contracts.ts`
- `../efeonce-rooms/src/server/media/multimedia/`
- `../efeonce-rooms/tests/media-multimedia-persistence.test.ts`
- `../efeonce-rooms/migrations/1793253000000_rooms-multimedia-local.sql`

## Current Repo State

> Snapshot del discovery inicial; el resultado vigente y los límites están en Status real y el cierre29Oct.

### Already exists

- `../efeonce-rooms/src/server/media/`: imágenes privadas y storage con límites de imagen.
- FFmpeg8.1.1/Poppler26.04 en host local; Dockerdaemon no disponible.

### Gap

- No decoder ni persistencia/entrega de PDF/audio/video ni formato V4.

## Modular Placement Contract

- Topology impact: `none`
- Current home: `efeonce-rooms/src/domain` y `efeonce-rooms/src/server/media/multimedia`
- Future candidate home: `remain-shared`
- Boundary: primitive multimedia local, V4 opt-in y adapters HTTP/CLI/SDK del mismo dominio.
- Server/browser split: schemas/DTO browser-safe; decoder, SQL, filesystem y binarios server-only.
- Build impact: binaries FFmpeg/Poppler locales exactos; no modificación del worker cloud de imágenes.
- Extraction blocker: publicación, autoridad y transacción de Rooms; toolchain Linux sin certificar.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-standard`
- Impacto principal: `command`
- Source of truth afectado: tablas multimedia separadas de imágenes.
- Consumidores afectados: API/CLI/SDK; UI y MCP posteriores.
- Runtime target: `local`

### Contract surface

- Contrato existente a respetar: Rooms V1/V2/V3, can, CAS, receipts/audit/outbox.
- Contrato nuevo o modificado: V4, multimedia.initiate/complete/cancel/retry/attachAsset y readers/bytes.
- Backward compatibility: additive y opt-in, no conversión legacy por inferencia.
- Full API parity: primitive único; adapters consumen catálogo; MCP R13 conserva integración posterior.

### Data model and invariants

- Entidades/tablas/views afectadas: multimedia_assets/uploads/jobs/renditions/edition_assets.
- Invariantes que no se pueden romper:
  - PDF conserva todas sus páginas; multimedia ready sólo desde decoder sobre bytes verificados.
  - La edición fija hashes/generaciones; original no se entrega por permiso rooms.read.
- Write-target allowlist: tablas propias explícitas; no boundary allowlist existente en este runtime.
- Tenant/space boundary: autoridad persistida y org/room/edition compuestos, owner upload y can actual.
- Idempotency/concurrency: tenantlock, CAS y receipt; worker lease con fencing, sin I/O dentro de SQL.
- Audit/outbox/history: commands atómicos sin paths/cuerpos/URLs; ediciones y pins inmutables.

### Migration, backfill and rollout

- Migration posture: additive.
- Default state: OFF; sólo configuración local explícita; perfil cloud rechazado.
- Backfill plan: ninguno; V4 sólo creación explícita.
- Rollback path: down vacío, rechaza pérdida de assets/pins con datos; revert código mantiene bytes.
- External coordination: toolchain Linux pinneado y decoder/container assurance pendientes antes de release.

### Security and access

- Auth/access gate: content.edit para carga/borrador, editions.publish para edición, rooms.read para derivados.
- Sensitive data posture: archivos privados0700/0600; hashes/metadata públicas sólo bajo autorización.
- Error contract: RoomsError canónico, errores decoder saneados, sin stderr/camino/secreto.
- Abuse/rate-limit posture: tamaños/páginas/duración/dimensiones/outputs/timeout/concurrencia explícitos.

### Runtime evidence

- Local checks: FFmpeg/Poppler reales con fixtures físicas pequeñas y límites negativos.
- DB/runtime checks: migración, lease/fencing, revocación, publish/attach, Range y SHA por petición.
- Integration checks: pipeline local completo; sin nube ni proveedores.
- Reliability signals/logs: job state/problema saneado/attempts; no stdout de decoder arbitrario.
- Production verification sequence: no production runtime impact; falta certificar Linux antes de release.

### Acceptance criteria additions

- [x] Source of truth, contratos, límites, permisos y consumers documentados.
- [x] Migración y rollback no destruyen datos existentes. Evidencia: [corte local29Oct](../../audits/rooms/2026-10-29-backend-local-completion.md).
- [x] Evidencia runtime distingue local de Linux/cloud/producción.


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

### Slice 1 — Contrato y decoder

- V4 opt-in, formatos/perfiles/límites y toolchain local exacto, decoder aislado.
- PDF páginas completas, audio preview+peaks, video MP4faststart+poster y metadata física.

### Slice 2 — Persistencia y operación

- Upload privado bounded, jobs lease/fencing, metadata ready y attach/publicación V4.
- Lectura privada stream/Range con autoridad y checksum actuales; sin original.

### Slice 3 — Evidencia

- Fixtures reales, negativas y flujo HTTP/CLI/SDK en coordinación con el integrador.

## Out of Scope

- UI, despliegue, activar flags, correo, Linux certificado, HLS, originales descargables o auto-conversión.

## Detailed Spec

El ADR dedicado define límites, codecs, outputs y autoridad. No lectura remota ni comandos libres.

## Rollout Plan & Risk Matrix

Corte additive local, no production runtime impact. Cero push/deploy/flags remotos.

### Slice ordering hard rule

ADR/límites → decoder validado → persistencia/jobs → publish/delivery → pruebas; Linux después.

### Risk matrix

| Riesgo | Sistema | Probabilidad | Mitigation | Signal de alerta |
|---|---|---|---|---|
| Decoder hostil | worker | medium | aislamiento OS, allowlist protocolos, timeout | failed/problema saneado |
| Filtración de archivo | data/access | medium | can revalidado, ruta privada y hash | pruebas negativas |
| PDF truncado | content | medium | conteo completo antes/después, rechazo sobre límite | invalid_media |

### Feature flags / cutover

ROOMS_MULTIMEDIA_LOCAL_ENABLED explícito sólo en local; ausencia/defaultOFF, cloud/VERCEL rechazados.

### Rollback plan per slice

| Slice | Rollback | Tiempo | Reversible? |
|---|---|---|---|
| 1 | no configurar módulo local / revert | local | sí |
| 2 | down vacío; si datos conservar y deshabilitar módulo | local | parcial |
| 3 | mantener recibo sin habilitar producción | local | sí |

### Production verification sequence

No habilitar producción por este corte. Exige toolchain Linux exacto, contenedor aislado, costos/memoria,
storage/jobs/entrega cloud y posterior decisión del operador.

### Out-of-band coordination required

Repo-only; no credenciales/provider/red. Pin/certificación Linux es gate posterior explícito.


<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     "Como compruebo que termine y que actualizo?"
     El agente ejecuta estos checks al cerrar cada slice y
     al cerrar la task completa.
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [x] V4 explícito preserva formatos V1/V2/V3 publicados. Evidencia: [corte local29Oct](../../audits/rooms/2026-10-29-backend-local-completion.md).
- [x] PDF rasteriza todas las páginas o falla; nunca resultado parcial ready.
- [x] Audio produce preview y peaks medidos; video poster y MP4faststart con duración/dimensiones reales.
- [x] Pipeline upload/hash/worker/attach/publish/read funciona con bytes reales localmente.
- [x] Privacidad y revocación se verifican para GET/HEAD/Range/304; original no accesible.
- [x] Límites, fallo, replay, fencing y rollback se prueban en PostgreSQL y decoder locales. Evidencia: [corte local29Oct](../../audits/rooms/2026-10-29-backend-local-completion.md).
- [x] Lint/types y gates de integración pasan; Linux/cloud/UI siguen explícitamente pendientes. Evidencia: [corte local29Oct](../../audits/rooms/2026-10-29-backend-local-completion.md).

## Verification

- Runtime: lint/typecheck, tests media-multimedia y fixture pipeline real.
- Task: pnpm task:lint --task TASK-2077; closure del integrador root.


## Closing Protocol

- [x] Lifecycle y carpeta sincronizados con estado real.
- [x] README/registry/EPIC sincronizados.
- [x] Handoff/changelog/skills a cargo del integrador root.
- [x] Limitaciones Linux/cloud registradas antes de reportar cierre.

## Follow-ups

- Certificación Linux/toolchain y producción por decisión posterior; interfaz Claude Design.


## Delta 2026-10-29 — pipeline local físico

-7/7pruebas PostgreSQL18PASS0skip:PDF3páginas/audioMP3/videoH264, upload/SHA/worker/attach/publish/bytes;
  reautorización404 tras revoke, corrupción de mismo tamaño503 inclusoHEAD/304, owner/tenant/hash/expiry,
  retry2/cancelación/leaseagotado y fencing con resultado físico descartado, revocación durantePUT.
-6/6processorPASS:MP3/AAC/Ogg, PDF1y3páginas, MP4faststart/poster; malformed/mismatch/>40páginas
  y sandbox real niega archivo ajeno/symlink/red con contador loopback0.
- Todo decoder nativo corre aislado (FFmpeg8.1.1,Poppler26.04.0,cwebp1.6.0), sin Sharp en proceso DB.
  MonitorRSS/timeout local no sustituye cgroup. DockerDesktop ausente; Linux/cloud no certificados.
- Logs privados en `efeonce-rooms/.captures/rooms-backend-qa-20261029/multimedia-{processor,persistence}.log`;
  lintfocal/typesglobalPASS. Integrador root posee adapters comunes y gate final fresh/restore.

CLI/SDK:7/7focalPASS0skip (`tests/media-multimedia-cli.test.ts`, `tests/client-multimedia.test.ts`).
CLI implementa list/status/upload-bytes/delivery-bytes multimedia con inputFD O_NOFOLLOW y streams,
namespace/TTL/tamaño/headers exactos, wx0600 y límites separados de imágenes. Fixture de transporte21MiB
no acredita codecMP4; los codecs reales tienen el recibo processor/PG anterior. SDK verifica mismoSHA
delPDF físico y rechaza archivos sobrelímite antes de leerlos. Logprivado `multimedia-clients.log`.

## Cierre backend local — 2026-10-29

[Corte consolidado](../../audits/rooms/2026-10-29-backend-local-completion.md):337/337tests,0fallos/0skip;
lint/negativo/types/build,13migraciones/43tablas, restore mixtoPG16/18 y cinco guards poblados PASS.
[Contrato Claude Design](../../documentation/rooms/backend-api-for-claude-design.md), manual y skill espejo
registran lo construido y los gates externos. El cierre sólo cubre el alcance local declarado; no UI,
release, conectores reales ni activación productiva. Los deltas anteriores conservan evidencia por fecha.
