# TASK-2072 — Rooms: backend cloud de medios y contrato para diseño

<!-- ZONE 0 — IDENTITY & TRIAGE -->

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
- Status real: `Canary real 2026-10-26 PASS: Efeonce ID con Microsoft/MFA, PNG físico de 3.010.606 bytes por PUT GCS, worker a dos WebP, preview 304.540 bytes 1122x1402 con SHA/ETag/SQL coincidentes. Un correo recibido en Outlook, código válido abre sala V3 e imagen, incorrecto/replay/otro espacio/borrador denegados; revocación niega sala e imagen. Sala archivada, flags web/Auth y correo OFF restaurados. Main e4b2e890 (PR3) añade disparador privado de Cloud Scheduler, flags humanos OFF; migración8 y worker por digest desplegados. Disparo automático verificado: Scheduler OIDC200 en vacío,202 con demanda, un Job4r9nz exitoso, cola vacía y ack cercado; sin nuevo correo ni imagen. Tooling b2f90fa local preservado. Consumidor frontend Claude Design pendiente; Auth deploy-control PR263/264 retenidas por operador, sin merge/deploy. Sin cierre de rollout general.`
- Rank: `R05 cloud después del circuito local2070; frontend2071 conserva ownership separado`
- Domain: `platform|data|content|ops`
- Blocked by: `none`
- Branch: `efeonce-rooms main@e4b2e890 vía PR3 (dispatch); base de medios PR2; documentos greenhouse-eo develop`

## Conciliación vigente — 2026-10-26

Entrega cloud y canary: [canary real cerrado](../../audits/rooms/2026-10-26-auth-rooms-real-image-canary.md); coordinación posterior: [disparo automático](../../audits/rooms/2026-10-26-automatic-media-dispatch.json). El único correo ya recibido no se repite. Persisten como trabajo nuevo la integración del consumidor de Claude Design y sus gates; el disparo del Job ya no es un pendiente.

El estado consolidado vigente y el siguiente bloque están en [contrato para Claude Design](../../documentation/rooms/backend-api-for-claude-design.md). Producción conserva los flags humanos OFF; conectar el diseño no autoriza activarlos ni repetir el correo único. Auth permanece en PR por decisión expresa del operador.

## Summary

Completar el backend cloud de imágenes privadas: storage GCS, subida directa limitada, procesamiento
separado y entrega privada con autoridad fresca. Entregar a Claude Design un contrato de API completo.
El diseño visual y su aceptación los conserva el operador con Claude Design.

## Why This Task Exists

El corte7ca5fd3 tiene filesystem local y worker con loader de desarrollo. Vercel no admite el original
máximo20MiB en un request de Function, y el perfil actual de PG cloud sólo acepta identidad Vercel.
Hace falta un adapter propio y un perfil de worker real, sin simular entorno Vercel ni ampliar autoridad.

## Goal

- Imágenes privadas cloud con metadatos y generaciones fijados; ninguna lectura por URL bearer.
- Worker compilado sin tsx ni dependencias web innecesarias, identidad y rol propios.
- API/CLI y guía de integración suficientes para conectar un frontend independiente.
- Pruebas de fallo/aislamiento/recuperación; rollout sólo con gates y readback específicos.

<!-- ZONE 1 — CONTEXT & CONSTRAINTS -->

## Architecture Alignment

- `docs/architecture/rooms/EFEONCE_ROOMS_CLOUD_MEDIA_BACKEND_DECISION_V1.md`.
- `docs/architecture/rooms/EFEONCE_ROOMS_PRIVATE_IMAGE_MEDIA_AND_PROVENANCE_DECISION_V1.md`.
- `docs/architecture/rooms/EFEONCE_ROOMS_ARCHITECTURE_V1.md`.
- `docs/architecture/rooms/EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md`.
- `docs/architecture/GREENHOUSE_WORKER_BUILD_CONTRACT_V1.md`.
- `docs/architecture/GREENHOUSE_FULL_API_PARITY_DECISION_V1.md`.

## Normative Docs

- `docs/operations/GREENHOUSE_DATABASE_TOOLING_V1.md`.
- `docs/architecture/GREENHOUSE_POSTGRES_ACCESS_MODEL_V1.md`.
- `docs/operations/GREENHOUSE_CLOUD_GOVERNANCE_OPERATING_MODEL_V1.md`.
- `.codex/skills/efeonce-rooms/SKILL.md` y `efeonce-auth` para canary de identidad separado.

## Dependencies & Impact

### Depends on

- TASK-2070: modelo de imágenes V3, autoridad, publicación y procesamiento local.
- TASK-2069: WIF/Cloud SQL/secretos de aplicación ya preparados.
- Autorización vigente de construcción backend; recursos/activación conservan preparación y gates propios.

### Blocks / Impacts

- Medios reales en Vercel y conexión del diseño frontend; no bloquea maquetas de Claude Design.
- No completa PDF/audio/video, MCP ni el piloto externo.

### Files owned

- Runtime `src/server/media/*`, `src/server/cloud/worker-*`, pool/config y migración de generaciones.
- `services/media-worker/*`, scripts de build/recovery, tests de backend y CLI.
- Contrato de integración en `docs/documentation/rooms/`, esta task/plan/ADR.

## Current Repo State

> Snapshot del discovery original. El estado actual y los pendientes posteriores están en `Status real` y «Conciliación vigente — 2026-10-26»; no ejecutar otra vez un canary ya completado por leer esta fotografía inicial.

### Already exists

- Runtime7ca5fd3 local: upload, assets/jobs, Sharp, lecturas protegidas y limpieza; verify207 registrado.
- Vercel20f9fe9 y Auth00166 OFF; canary único aún pendiente de su coordinación.

### Gap

- GCS y generación física de objetos; perfil de identidad/pool para worker Cloud Run.
- Worker compilado/desplegable, restore de DB+storage y contrato de transferencia directo.

## Modular Placement Contract

- Topology impact: `cross-runtime`
- Current home: `efeonce-rooms` app/API y worker propio del mismo producto.
- Future candidate home: `remain-shared`
- Boundary: aplicación autoriza; GCS almacena; worker sólo procesa jobs de Rooms.
- Server/browser split: credenciales, bucket/keys y SQL exclusivamente servidor; DTO público saneado.
- Build impact: artefacto worker propio, manifest/lock mínimo con versiones exactas y gate de deriva.
- Extraction blocker: no dependencia de código privado de Greenhouse ni bases ajenas.

## Backend/Data Contract

### Backend/data brief

- Backend rigor: `backend-critical`
- Impacto principal: `integration`
- Source of truth: PostgreSQL Rooms y generaciones privadas de GCS.
- Consumidores: API/CLI y frontend futuro; worker propio.
- Runtime target: cloud preparado OFF; verificar local/aislado antes de cualquier activación.

### Contract surface

- Contrato existente: upload/complete, lectura privada, publicación inmutable y can por recurso.
- Contrato nuevo: uploads.getTransfer efímero con autoridad fresca; descriptor jamás en receipt.
- Backward compatibility: local y V1/V2/V3 preservados; UUID de dominio y generation física separados.
- Full API parity: HTTP/CLI desde el mismo servicio; MCP conserva deuda explícita R13.

### Data model and invariants

- Columnas nuevas de generación física GCS en fuentes/derivados; NULL legacy local.
- Invariantes: fuente inmutable, generation-match para bytes y borrado, ready sólo tras inspección.
- Write-target allowlist: schema Rooms y bucket propio; sin esquemas/objetos de otros productos.
- Tenant/space boundary: autoridad persistida fresca; organizationId del caller nunca concede acceso.
- Idempotency/concurrency: CAS y leases; I/O fuera de locks; no reintentar commit incierto.
- Audit/outbox/history: metadatos sin URL firmada, tokens, objeto completo o secretos.

### Migration, backfill and rollout

- Migration posture: nueva migración aditiva; sin down de bases vivas.
- Default state: flags OFF, sin recursos implícitos por registrar task.
- Backfill plan: ninguno; objetos locales no se convierten en GCS por inferencia.
- Rollback path: OFF, detener claims worker, conservar generaciones/publicaciones y auditoría.
- External coordination: canary Auth único conserva su owner y destinatario autorizado.

### Security and access

- Auth/access gate: sesión/grants Rooms; worker SA y rol exclusivos propuestos, sin claves JSON.
- Sensitive data: fuente y derivados privados; token de escritura efímero fuera de logs/receipts/storage browser.
- Error contract: mensajes saneados, sin bucket/key/provider stack ni enumeración cross-tenant.
- Abuse/rate-limit: tamaño/tipo firmados, TTL corto, checksum y cuotas; métricas sin URLs firmadas.

### Runtime evidence

- Local checks: unit/PG/contrato/CLI, lint/typecheck/build y manifest worker.
- DB/runtime checks: clon restore/down-up, generación/ACL/FK y estados fenced.
- Observability: jobs/edad/reintentos/bytes/error codes y conexiones; sin payloads sensibles.
- Production verification sequence: recursos/IAM/capacidad → OFF → migración → runtime → canary autorizado.

<!-- ZONE 2 — PLAN MODE: plan aceptado bajo continuidad backend autorizada -->

<!-- ZONE 3 — EXECUTION SPEC -->

## Scope

1. Ports storage y GCS con generation preconditions; upload directo V4 PUT efímero.
2. Worker compilado y perfil Cloud Run propio; no suplantar variables Vercel.
3. Migración aditiva, DTO/CLI/API y documentación para Claude Design.
4. Recuperación, casos negativos y rollout gobernado cuando pase gates aplicables.

## Out of Scope

Diseño/JSX/layout/motion nuevos, clientes externos, PDF/audio/video, notas/champion/conversaciones y MFA.

## Detailed Spec

Ver ADR y `docs/tasks/plans/TASK-2072-plan.md`. El máximo20MiB de original se transfiere directamente a
GCS; previews siguen <=3MiB. La app reautoriza GET/HEAD/Range y nunca ofrece original por ruta pública.

## Rollout Plan & Risk Matrix

| Riesgo | Control |
| --- | --- |
| Límites Vercel | Original directo; complete inspecciona streams acotados fuera de SQL |
| Token de escritura robado | TTL<=5min, destino generado, tipo/tamaño y generation0, nunca lectura |
| Worker con autoridad excesiva | Identidad/pool/rol propios y fail-closed de perfiles |
| Pérdida/deriva de objetos | Lectura/borrado fijados a generación y restore por hashes |
| Cancel/retry obsoleto | CAS/lease y resultados fenced; no resucitar asset cancelado |

<!-- ZONE 4 — VERIFICATION & CLOSING -->

## Acceptance Criteria


- [x] Canary interno real de identidad, un correo y una imagen: acceso válido, denegaciones y revocación, con flags restaurados OFF. Evidencia: [canary2026-10-26](../../audits/rooms/2026-10-26-auth-rooms-real-image-canary.md). No acredita UI ni activación general.
- [x] GCS privado escribe sólo destinos propios y fija generation en lectura/borrado. Evidencia: suite225, tests cloud-worker/media-storage/media-http/media-cli y guía de integración; SDK falso no acredita recursos vivos.
- [x] Transfer directo exige sesión/owner/expiry y no persiste URL en receipts/logs. Evidencia: suite225, tests cloud-worker/media-storage/media-http/media-cli y guía de integración; SDK falso no acredita recursos vivos.
- [x] Complete confirma bytes/checksum/generación antes de encolar, con autoridad fresca al confirmar. Evidencia: suite225, tests cloud-worker/media-storage/media-http/media-cli y guía de integración; SDK falso no acredita recursos vivos.
- [x] GET/HEAD/Range/304 reautorizan y conservan no-store/denegación de originales. Evidencia: suite225, tests cloud-worker/media-storage/media-http/media-cli y guía de integración; SDK falso no acredita recursos vivos.
- [x] Worker se construye/ejecuta sin tsx; perfil cloud propio y ninguna SA key/ADC local en Production. Evidencia: suite225, tests cloud-worker/media-storage/media-http/media-cli y guía de integración; SDK falso no acredita recursos vivos.
- [x] Disparo automático privado sin contenedor en vacío; una demanda arranca un único Job y libera lease por nonce. Evidencia: [Scheduler y readback SQL](../../audits/rooms/2026-10-26-automatic-media-dispatch.json), PR3 y nueve pruebas focales.
- [x] PG y restore preservan V1/V2/V3, hashes, generaciones, permisos y auditoría. Evidencia: recovery aislado PG16/18, seis salas de dos tenants,25tablas/18objetos/12bindings; generaciones físicas verificadas después en el canary real26Oct; ese canary no equivale a restore cloud completo del schema ampliado26tablas.
- [x] HTTP/CLI comparten operaciones y guía frontend completa sin lógica de permisos en cliente. Evidencia: suite225, tests cloud-worker/media-storage/media-http/media-cli y guía de integración; SDK falso no acredita recursos vivos.
- [x] Recursos/env/flags/migraciones tienen readback; canary de identidad/correo/imagen completado en criterio separado, rollout general pendiente. Evidencias: [storage/IAM](../../audits/rooms/2026-10-26-media-storage-infra.json), [DB](../../audits/rooms/2026-10-26-media-database-infra.json), [Job](../../audits/rooms/2026-10-26-media-worker-deployment.json) y [configuración](../../audits/rooms/2026-10-26-media-vercel-configuration.json). Ejecución de cola vacía no acredita imagen real.
- [x] Transferencia física GCS y procesamiento/lectura de imagen por autoridad real verificados. Evidencia: [canary real](../../audits/rooms/2026-10-26-auth-rooms-real-image-canary.md).
- [ ] Consumidor frontend de Claude Design integrado y recorrido UI completo verificado antes de activar medios de forma general. El disparo automático del Job ya está comprobado y tiene su criterio propio tildado; faltan entorno aislado/datos/permisos, consumidor same-origin y gates UI/humanos. No cerrar por el canary de backend.

## Verification

Pruebas focales y suite completa del runtime; build/smoke worker; ensayo aislado recovery; task/ops lint.
No confundir dobles SDK con canary GCS real ni logs de build con recepción de correo.

## Closing Protocol

Estado real y acceptance con evidencia; actualizar ledger Rooms espejo, manual, epic y handoff propio.

## Closing Checklist

- [ ] Criterios, lifecycle y carpeta honestos; no cierre cloud por pruebas locales.
- [ ] Ledger/índices/epic/manual sincronizados y WIP ajeno preservado.
- [x] Readback de commit/branch/deployment; scripts y evidencias sin secretos. Evidencia: [recibo de release](../../audits/rooms/2026-10-26-production-backend-release.json); activación cloud separada.

## Follow-ups

R05 PDF/audio/video; diseño Claude Design; R13 MCP; canary de identidad2066/2067/2069 separado.
