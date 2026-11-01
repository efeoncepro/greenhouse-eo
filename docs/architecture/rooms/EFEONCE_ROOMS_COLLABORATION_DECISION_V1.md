# Rooms — colaboración durable V1

- Status: Accepted para implementación local por continuidad del goal EPIC-052 y pedido del operador 2026-10-29 de terminar backend sin UI.
- Owner: Rooms Platform; TASK-2074, EPIC-052 R11.
- Runtime: repo hermano efeonce-rooms; sin producción/Auth/UI.

## Decisión

La colaboración es mutable, fuera del snapshot, y fija organizationId/roomId/editionId publicado.
Toda operación revalida autoridad persistida y rooms.read sobre esa edición, además de capability fina.
Se agregan collaboration.read, questions.create, questions.answer, questions.resolve, steps.manage y
activity.read sin autogrants ni ampliación de grants existentes. Los techos de rol no conceden acceso.
Externos sólo participan mediante grants explícitos de edición; las invitaciones actuales siguen read-only.

Questions.create fija pregunta y autor, texto4k y anchor opcional validado contra edición. Answer agrega
respuesta append-only sólo de actor interno con questions.answer; no altera pregunta ni snapshot.
Resolve exige questions.resolve y ser autor o actor interno. Pregunta resuelta no recibe nuevas respuestas.
Steps.create/update exige actor interno con steps.manage; próximo paso fija título, estado open/in_progress/
done/cancelled, responsable interno activo de la organización o null, fecha ISO o null y anchor.

Readers questions.list/steps.list exigen collaboration.read+rooms.read; devuelven DTO allowlist con IDs
opacos, textos y timestamps, sin emails/grants/notas. analytics.getRoomActivity es interno y exige
activity.read+rooms.read; sólo enumera comandos de colaboración completados (operation/revision/time),
no visitas, engagement, intención comercial ni contenido de los cuerpos. Cada lector pagina por ID,
limit default25/max100; 200preguntas/edición,20respuestas/pregunta y100pasos/edición.

Anchors V1: pieceId o sección editorial/fragmento existente. Anchors V2/V3/V4: blockId y fragmentId editorial,
assetVersionId resuelto y referido por un bloque visible del snapshot. timeMs sólo se admite en audio/video
V4 con duración medida, entre0 y durationSeconds*1000 inclusive; imagen/PDF/V3, referencias excluidas
y assets ajenos fallan. Readers, writes y replay revalidan la ancla. Referencias de evidencia exigen
evidence.read además de existencia. No se admiten anclas
hacia otro room/edition ni texto o URLs arbitrarios. Un anchor vacío indica contexto general de la edición.

Cada command usa expectedRevision de sala y key idempotente por actor/operación. Un único tenantlock y
transacción actualizan datos, revisión, receipt, audit/outbox; replay revalida permisos actuales y rechazo
por revocación antes de devolver receipt. Receipt sólo identifica entidad y revisión, nunca body.
Las tablas conservan FKs compuestas y respuestas inmutables; down con filas rechaza para no perder datos.

## Alternativas

- Usar rooms.read como write: rechazado, ampliaría invitaciones históricas.
- Guardar preguntas en manifest: rechazado, mutaría el contenido publicado.
- Convertir audit técnico en analítica de visitas: rechazado, no es observación de navegación.
- Comunicación/correo automático: fuera de alcance, ninguna respuesta envía mensajes.

## Verificación y límites

PostgreSQL local prueba FK/tenancy, anchors, límites, replay, CAS/race, revocación, snapshot inmutable y
actividad sin cuerpos. HTTP/CLI/SDK y el adapter MCPstdio local2078 consumen el mismo primitive. Federación MCP remota
y consumidor visual conservan su integración pendiente.
No existe migración cloud ni certificación UI/producción por este ADR local.

## Delta 2026-10-29 — invitado real y delegación explícita

La nueva capacidad también debe ser operable por una sesión guest de invitación, no sólo por un principal sintético. El contrato Rooms permite solicitar explícitamente colaboración y presentación en una invitación nueva; nunca agrega derechos a invitaciones existentes. Migración13 amplía únicamente la allowlist SQL. Las capacidades originales de lectura conservan su scope de sala; los derechos nuevos se emiten en un grant separado fijado a `initial_edition_id`. La autoridad del emisor se vuelve a comprobar en cada acceso y limita cada capacidad/expiración. Preguntas de otro autor, respuestas internas, pasos, actividad comercial e integraciones conservan sus restricciones.

El protocolo OTP/emisor Auth, su despliegue y sus flags no cambian. Las pruebas usan el issuer local y buzón RAM; ningún correo real ni producción.

Candidato local verificado3c7bcb5 y fronteras de release: [recibo29Oct](../../audits/rooms/2026-10-29-backend-local-completion.md).
El cierre de la task local no certifica interfaz, proveedores reales ni producción.
