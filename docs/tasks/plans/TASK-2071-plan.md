# TASK-2071 — Plan de consumidor de imágenes privadas

> Estado posterior26Oct: consultar la [task vigente](../in-progress/TASK-2071-rooms-private-image-authoring-and-viewer.md) y sus criterios/evidencias. Este plan conserva la secuencia e hipótesis de su fecha; sus pendientes históricos no sustituyen el estado actual. Auth retenido en PR; interfaz Claude Design y activación general separadas.

Estado: diseño mínimo aprobado por raíz bajo goal vigente; contrato 2070 congelado, readiness lista; ejecución local tras hook. Sin cloud, push ni ampliación de canary 20f9fe9. Backend2070 posee package/lock y codec.

## Source and decision

Código 20f9fe9, galería 2059 y dirección Rooms existente. Product Design: critical-overrides/get-context aplicados a extensión de producto; no scaffold/branding nuevo. Una imagen y propiedades título/alt/pie, no editor completo. Backend 2070 posee V3/provenance/upload/ready/bytes/permissions.

## Sequence

1. Confirmar DTO/rutas2070, FileField AXIS y límites; adaptar campos del wireframe sin inventar endpoints. ADR2070 accepted; task 2071 UI ready=yes sólo conmapping completo. Root ejecuta hook.
2. Ruta edit y proyección de autoría; FileField→UploadStatus; resolver incertidumbre con reader y keys. Adjuntar imagen mediante command; conservar revisión/inputs.
3. Propiedades y preview usa RoomReader. Validate/publicar reutilizan command; no datos privados adicionales en props del cliente.
4. ProtectedImage/ImageInspector para edición autorizada; conserva aspecto/alpha, teclado, reset y viewport. Texto legacy V1/V2 permanece.
5. QA local real y GVC premium; conflictos/red/revocación; revisión humana de capturas aparte. Commit scoped sólo tras aviso a raíz; ningún push/deploy.

## Ownership

Ownership UI: app/rooms/[roomId]/edit y preview; components/authoring y media; room-reader/content-reader-contract; server/presentation/content y authoring; copy/media; styles/media; tests UI. Enlaces contextuales coordinados con raíz. Domain/server/media/schema/worker/API/proxy/secrets no son de esta unidad.

## Gates

- Preparación: task/wireframe/flow/motion/readiness sin errores, contratos 2070 congelados.
- Funcional: bytes de upload verificados→attach→preview→publish→guest; no ready fake ni originales descargables.
- Interacción: teclado/teclado dezoom/pan/Escape,403/409/expiry, reduce/noAPI snapshots.
- Visual:1440/1024/390/320/200%, ratio/alpha/contain,axe,scrollwidth; dossierTASK-2071-rooms-private-image-authoring-and-viewer sin secretos.
- Release: candidata local hasta autorización coordinada por raíz; canary Auth 20f9fe9 intacto.

## Current blockers

TASK-2070 tiene exports/DTO/rutas congelados; sus servicios se implementan en paralelo. La QA integrada espera esos servicios. El hook de TASK-2071 precede al JSX. No bloqueo humano de dirección; aceptación visual final se solicita sobre el render real.
