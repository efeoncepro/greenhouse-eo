# TASK-2062 — contenido versionado y autoría local

Fecha: 2026-10-25. Runtime `../efeonce-rooms`, commit local e72ad65; base pública anterior bd4b802. Este corte no cambia
el deployment público dpl_8vJ75Cbn1q75JNe7FEa7LkUccigc. No activa identidad, DB cloud, editor ni medios.

## Resultado

DraftManifest V2 independiente por perfil, bloques/editorial/diagnostic/plan/media, evidencia y linaje con
IDs/anclas estables, import preview no mutante, apply/upsert/arrange/linkEvidence transaccionales y coverage
con revisión/hash. Snapshot V2 congela coverage recalculado. V1 permanece legible, no se reescribe ni rehashea.
Assets sin registro gestionado quedan unresolved; autoría no certifica fuentes remotas. Datos sólo sintéticos.

## Verificación ejecutada

- `pnpm test`: 66/66 PASS, 0 skips; 21 nuevas pruebas específicas (10 puras,11 PostgreSQL), más HTTP/CLI.
- `pnpm lint`, `pnpm typecheck`, `pnpm build`: PASS; ambas rutas nuevas aparecen en el build.
- CLI en proceso independiente → HTTP loopback → reader PostgreSQL: preview/validation comparten hash y
  revisión; no crean receipts/audit/outbox. Import unsupported devuelve reporte y rechaza apply atómicamente.
- Negativos: cross-tenant, principal/permiso expirado/revocado, replay con payload distinto, anclas rotas,
  downgrade V2→V1, límites de payload, caller ready/verified y fallos de auditoría. Sin metadata interna en receipt.
- PG recovery `pnpm db:recovery --restart`: PASS, reinicio y dump/restore a base temporal; 140 rooms,
  111 drafts,57 editions,367 receipts/audit/outbox; hash agregado `d30886e52504ff75569397762e513124`.
  Inventario posterior:46 ediciones V1 y11 V2. Conteos son del instante del smoke, no valores permanentes.

QA independiente detectó y cerró dos defectos antes de aprobación: lectura de autor sobre recurso incorrecto
al crear/reabrir V2 y reporte que confundía elementos soportados con unsupported cuando otro elemento fallaba.
Las regresiones están incluidas. No se repite GVC: no hubo cambios de píxeles; smoke demo/API se registra al cierre.

## Límites y continuidad

Sin publicación nueva, sin credenciales API reales, sin assets listos, sin renderer/editor V2 visible. R04 ahora
se coordina con foundation Auth TASK-1834, loginV4 TASK-2064, consumer Rooms2065, invitaciones2066 y OTP2067.
Pedido vigente: un correo inicial Resend con enlace tokenizado y código generado; el cliente pega el código
en Rooms. Ese flujo sigue en construcción separada, no lo acredita TASK-2062. EPIC-052 continúa abierto.


## Cierre de migración y smoke

`node-pg-migrate` runner real sobre una base temporal restaurada del dump exclusivo Rooms: down count1
retiró sólo `1792963858690_rooms-content-v2`; up count1 restauró las dos restricciones, con
`pg_get_constraintdef` idéntico. Fingerprints después de cada paso conservaron drafts
`131c0351c00bccd3b6a531d08bbd0ace`, snapshots `844f98b27ccf59beabb439fa9d84dbde` y hash agregado de ediciones
anterior. Nunca se hizo down sobre rooms_local. Base temporal/dump/script efímeros eliminados.

`pnpm lint:negative`:3/3PASS. Servidor de build optimizado: `/demo`200 y API demo200;
GET validation y POST validate-import sin sesión401. Sin cambios de píxeles ni bypass de autenticación.
