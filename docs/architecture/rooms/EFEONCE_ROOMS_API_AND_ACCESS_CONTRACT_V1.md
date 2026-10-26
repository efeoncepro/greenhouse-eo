# Efeonce Rooms — contrato API y acceso V1

Diseño inicial: 2026-10-07. **Contrato objetivo; el corte implementado al2026-10-26 se distingue abajo de la paridad futura.** [Arquitectura](EFEONCE_ROOMS_ARCHITECTURE_V1.md).

## Corte vigente — 2026-10-26

Salas/lifecycle, borradores/ediciones V1/V2/V3, permisos `can`, API/CLI, identidad/invitación y medios
privados tienen backend ejecutable. [Guía de endpoints/DTO/errores para Claude Design](../../documentation/rooms/backend-api-for-claude-design.md)
es el contrato de conexión actual: `authoring`, `preview`, `media`, estado/transfer de uploads, commands
y bytes privados de derivados. Main `e4b2e890`; ocho migraciones/26 tablas y Scheduler de máquina por demanda.

Canary real de identidad/correo/imagen completado y cerrado; no repetir. Acceso/invitaciones/medios web
OFF, dispatch máquina ON; sala del canary archivada e invitación revocada. La nueva interfaz aún requiere
conexión/prueba integrada; Auth se conserva en PR263/264. [Estado y evidencia](README.md).

Las familias de §1 son el **contrato objetivo completo**, no inventario de endpoints disponibles. MCP,
colaboración, presentación avanzada, escenarios y multimedia más allá de imágenes siguen en roadmap.
Los apartados fechados25Oct preservan el avance de cada corte; sus pendientes locales no sustituyen
este estado vigente. La autoridad productiva no acepta un bearer nativo por inferencia de CLI/MCP.

## 1. Paridad por capacidad

La API es la entrada al dominio. UI, CLI y MCP consumen las mismas operaciones, políticas y estados; ninguna mutation existe únicamente en una server action o click handler. Un registro versionado declara operationId, schema, authorization, idempotency, auditoría y exposición por canal. OpenAPI y catálogo MCP se contrastan contra ese registro.

| Familia candidata | Operaciones mínimas | Verificación |
|---|---|---|
| rooms | create, get, list, update, archive | Reader de estado y revisión |
| content | importManifest, listAssets, listBlocks, upsertBlock, arrange, updateNarrative, linkEvidence | Inventario de archivos/bloques, orden y asociaciones |
| evidence | importSnapshot, get, list, validate | Fuente, ámbito, fecha, método, cobertura, estado y versión |
| relations | upsert, list, delete | Anclas editoriales/técnicas y linaje dentro de la edición |
| scenarios | evaluate, save | Modelo/fórmula acotados, unidades/supuestos y revisión; evaluar no altera la edición |
| uploads | initiate, getStatus, complete, cancel | Bytes, hash, owner y validación real |
| media | getStatus, retry, cancel, authorizeDelivery | Derivados ready y ámbito del ticket |
| tours | create, update, get, list | Secuencia y referencias válidas |
| notes | create, update, get, list, delete | Owner y audiencia de cada nota; denegación de notas ajenas |
| editions | validate, publish, list, get | Snapshot, hash y política aplicada |
| access | invite, listGrants, updateGrant, revoke | Permisos efectivos, expiración y auditoría |
| questions | create, list, answer, resolve | Edición/bloque/pieza/ancla, autor y visibilidad |
| steps | create, list, update | Responsable, fecha y estado explícitos |
| exports | authorizeOriginalDownload | Archivo exacto y permiso separado |
| presentation | prepare, startSession, endSession | Edición, recorrido y grants vigentes |
| analytics | getRoomActivity | Definición de eventos, cobertura y permisos |

Nombres ilustrativos hasta fijar schemas. Paridad incluye uploads: CLI transmite bytes por sesión autorizada; MCP inicia/finaliza la misma sesión y usa un mecanismo de transferencia compatible con el host. Una URL local inaccesible no cuenta como upload MCP. Si el host carece de transferencia, devolver limitación explícita, nunca publicar un asset vacío. Tokens/tickets de transferencia no se imprimen en logs ni mensajes visibles.

Acciones exclusivas del dispositivo —fullscreen, abrir ventana, gesto de audio, selección local— son exclusiones documentadas del registro, no capacidades server-side ocultas. CLI/MCP pueden preparar contenido, permisos y sesiones; no simular gestos del navegador.

## Design system y datos de apariencia

La apariencia propia de Rooms consume La órbita según la [dirección visual](../../ui/visual-directions/EFEONCE_ROOMS_VISUAL_DIRECTION_V1.md). UI/CLI/MCP usan el mismo schema de temas/roles: solo valores de contrato permitidos y referencias versionadas, sin CSS/fuentes arbitrarios que reemplacen el sistema. Bricolage editorial/Poppins funcional en el entorno; estilos y archivos originales del cliente permanecen aislados. La referencia de tema/composición de una edición se conserva para reproducibilidad.

## 2. Modelo de dominio

| Entidad | Identidad y reglas |
|---|---|
| Room | organizationId, roomId, contexto, profiles[], lifecycle, owner; referencias CRM opcionales |
| ContentBlock | Tipo/schema versionados, contenido estructurado, anclas y referencias; perfiles combinables, sin scripts arbitrarios |
| EvidenceSnapshot | Fuente, ámbito, fecha/período, método/versión, unidad, cobertura y estado del claim; inmutable al publicar |
| ContentRelation | Origen/destino tipados y anclas estables; radiografía y linaje con validación de integridad |
| ScenarioModel | Modelo versionado, inputs/supuestos, fórmulas permitidas y unidades; sin ejecución de código importado |
| AssetVersion | bytes inmutables, checksum, tipo real, provenance, dimensiones/duración, estado |
| Piece / Variant | Concepto y adaptación editorial; ratio declarado y medido, formato, canal |
| Rendition | Derivado técnico versionado; no reemplaza ni inventa una adaptación |
| Narrative / Evidence | Argumentos y fuentes con referencias verificables, visibilidad definida |
| Tour | Secuencia de escenas y duración orientativa; puede usar solo parte del inventario |
| Edition | Snapshot publicado con versiones exactas, coverage report y contrato de render |
| Grant | Principal, room/edition scope, capabilities, expiración, estado y revocación |
| PresenterNotes | Contenido privado del rol/autor autorizado; nunca parte del DTO de audiencia |
| Question / Step | Colaboración mutable, anclada a edición, con autores y visibilidad |
| Session / Event | Sesión efímera y eventos mínimos, sin inferir comprensión o intención de compra |

Índice narrativo e inventario son vistas diferentes del mismo material. Validación informa activos importados, incluidos, pendientes y excluidos con razón; las exclusiones requieren decisión editorial explícita. No publicar silenciosamente solo los primeros archivos o páginas. El manifest incluye bloques, relaciones, evidencias y versiones de perfiles; no convertir el artículo/diagnóstico en una imagen para eludir su estructura. Ver [perfiles y reglas de claims](EFEONCE_ROOMS_EXPERIENCE_PROFILES_V1.md).

## 3. Semántica de operaciones

- Commands durables con idempotency key por actor/operación y hash de payload; reutilizar clave con payload distinto devuelve conflicto.
- Edición de borrador con expectedRevision/ETag: conflicto visible, nunca last-write-wins silencioso.
- Jobs asíncronos responden operationId y reader de progreso; accepted no equivale a completed.
- Publish es atómico respecto al snapshot y registra auditoría/outbox; no admite referencias rotas o assets requeridos sin ready.
- Paginación estable, filtros y límites explícitos. Fechas ISO, errores tipados y correlationId, sin raw errors internos.
- Eventos externos versionados mediante outbox, firma y reintentos; consumidores idempotentes, orden por agregado cuando corresponda.
- Importar un manifest valida referencias y presenta resultado por elemento; modo validate/preview disponible antes de mutation.

## 4. Identidad y acceso

Operadores internos: Efeonce ID y autoridad delegada verificable. El organizationId enviado por el cliente solo intersecta el ámbito del principal; jamás lo amplía. Revocación/expiración vence sobre roles nominales. MCP usa el gateway como adapter, no como dueño de las políticas Rooms.

Compradores: principal externo limitado a la sala, mediante invitación y sesión verificadas. El mecanismo concreto de canje y recuperación se define con Identity antes de build. Un vínculo compartido no concede por defecto acceso a toda la cuenta ni a notas privadas. Modo público de muestra exige publicación explícita independiente de una sala privada.

| Rol de experiencia | Capacidades candidatas; siempre acotadas por grant |
|---|---|
| Autor | Editar borrador, importar y preparar; publicar/invitar solo con entitlement separado |
| Responsable comercial | Publicar, conceder/revocar acceso y leer actividad autorizada |
| Champion | Explorar, presentar, preparar notas propias y compartir por política; sin editar el master |
| Evaluador | Explorar y formular preguntas; descargar solo si fue autorizado |
| Audiencia | Proyección de presentación, sin consola, notas privadas ni analítica |

La etiqueta de rol orienta UX; la decisión efectiva combina principal + tenant + recurso + capability + estado. Notas internas de agencia, notas privadas del champion y argumentos compartidos son tres clases distintas. No enviar datos privados al navegador de audiencia aunque estén ocultos por CSS.

## 5. Privacidad, conservación y observación

Registrar eventos observables: apertura autorizada, escena visible, reproducción efectiva, pregunta y descarga permitida. Distinguir actor identificado, sesión y visita anónima cuando esta exista; no identificar personas por conjetura. Minimizar IP/dispositivo y fijar retención/base de tratamiento antes de producción. No capturar teclas, pantallas ni contenido de notas en analytics.

Propuesta de lifecycle: draft → ready → published → archived; revocar acceso y archivar son operaciones distintas. Ediciones publicadas inmutables; correcciones generan nueva edición. Borrado, retención y preservación contractual requieren política explícita por clase de dato; no prometer borrado físico inmediato de backups.

## 6. Pruebas de aceptación posteriores al go

Misma fixture por UI, CLI y MCP: crear sala → subir imagen/audio/video/PDF e importar artículo/diagnóstico/evidencia → leer derivados y bloques → vincular radiografía/linaje → configurar plan/escenario → ordenar → publicar → invitar → leer como invitado → denegar notas ajenas → revocar → verificar nuevos accesos/tickets denegados. Probar aislamiento entre dos organizaciones, conflictos concurrentes, retries, payload inválido y revocación durante reproducción. Registrar la limitación temporal de tickets ya emitidos.

La paridad se demuestra con cambios persistidos y readback independiente; un inventario de tools o un mock no la acredita.

La certificación repite el ciclo en perfil creativo, SEO/AEO y sala combinada. Probar referencias rotas, datos sin ámbito, simulación identificada, fuente caída, anclas tras revisión y esquema cliente inerte. Publish/readback deben devolver los mismos bloques y evidencias por UI/CLI/MCP; un enlace a Think no acredita esta paridad.

## 7. Primer corte ejecutable 2026-10-25

TASK-2058 implementa `src/domain/{contracts,permissions,operations,errors}.ts` y readers server-only en el runtime `efeonce-rooms`. El [ADR de arranque](EFEONCE_ROOMS_PRODUCT_AND_PLATFORM_DECISION_V1.md) autoriza este corte local. Los roles de experiencia de §4 siguen siendo especializaciones futuras; las tres jerarquías iniciales solicitadas por el operador son:

| Capacidad | Cliente | Operador | Administrador | Recurso requerido |
|---|---|---|---|---|
| rooms.read / evidence.read | sí | sí | sí | edición publicada para cliente |
| workspace.read | no | sí | sí | organización |
| notes.internal.read | no | sí | sí | sala/edición |
| content.edit | no | sí | sí | edición borrador |
| editions.publish | no | no | sí | edición borrador |
| access.read | no | no | sí | sala/edición |
| access.manage / rooms.archive | no | no | sí | sala |

Cada «sí» es sólo un techo: exige principal activo/no vencido, pertenencia a organización y grant del mismo principal, activo, iniciado, no vencido, con capacidad y scope que cubra el recurso. Se validan schemas estrictos y hora finita. Externos sólo pueden ser cliente y no reciben grants de organización. Una edición archivada se deniega. Ningún rol concede privilegio global.

`authorize` devuelve decisión y razón estable; `can` el booleano. Los readers aplican la misma política antes de proyectar datos. `projectRoom` construye allowlist, valida el DTO y clona estructuras; sin evidence.read elimina tanto snapshots como anclas `evidenceIds`. Workspace comprueba acceso a organización y filtra cada sala/nota por permiso propio. Grants no viajan al cliente.

Operaciones implementadas: `rooms.get`, `workspace.get`, `access.getEffective`. UI/server y API demo usan readers compartidos; CLI consume esos endpoints HTTP. Gestos de dispositivo se excluyen expresamente. Los permisos de escritura se calculan para fijar contrato, pero no existen commands, rutas de mutación ni transporte MCP.

`resolvePrincipal()` devuelve null hasta conectar Efeonce ID. La API `/api/v1/rooms/:roomId` devuelve401 incluso con rol/organización forjados. El selector de `/demo` sólo elige fixtures sintéticas y nunca se usa como autenticación real. Este corte no acredita invitaciones, revocación de tokens remotos, tickets de medios ni persistencia. [Manual](../../manual-de-uso/rooms/operar-primera-experiencia-local.md) y [evidencia](../../audits/rooms/2026-10-25-first-local-delivery.md).

Límites de esta implementación: el resumen `permissionRows`/`access` del workspace se refiere a la primera sala visible de la muestra única, y su copy lo declara. Antes de soportar varias salas se debe resolver una selección/agregación explícita, sin mostrar el permiso de una sala como global. El reader interno distingue not_found y forbidden; la futura API autenticada deberá normalizar la respuesta de recursos ajenos para no convertirse en oráculo de existencia. Hoy la ruta real deniega401 antes de cualquier lookup.

## 8. Ciclo durable y siguiente contrato de contenido

TASK-2060 implementa commands `rooms.create`, `rooms.updateDraft`, `editions.publish`, `editions.reopen`, `rooms.archive`, `access.grant` y `access.revoke` en `src/server/commands/execute.ts`; readers persistidos en `src/server/persistence/readers.ts`. HTTP `/api/v1/commands` y CLI `execute` consumen el mismo primitive. `rooms.create`/`editions.reopen` amplían capabilities a11, con grants acotados y autoridad persistida revalidada por transacción. Pruebas con PostgreSQL local, rollback, idempotencia y restore; API de producción401 mientras Efeonce ID dependa de TASK-1834. TASK-2061 publica sólo demo sintética.

TASK-2062 prepara contenido v2 para autoría y mantiene snapshots v1. Importar/editar/ordenar/vincular evidencia será dominio durable, no click handler ni almacenamiento sólo en navegador. Publicación exige validación de integridad/cobertura y resolución de medios; metadata declarada no verifica bytes ni claims remotos. Su implementación y evidencia se registran en la task, sin ampliar el alcance completado de2060.


## Implementación local TASK-2062 y siguiente acceso

Desde runtime e72ad65, `rooms.content.v2` permite borradores incompletos y perfiles independientes;
`rooms.room.v2`/`rooms.renderer.v2` identifica snapshots sin reinterpretar V1. Commands content.importManifest,
content.upsertBlock, content.arrange y content.linkEvidence comparten autoridad/revisión/idempotencia/audit/outbox.
Readers previewContentImport y validateDraft exponen coverage con revisión/hash; GET validation y POST
validate-import son lecturas, no acreditan permiso futuro de publicar. Publication recalcula en transacción.
Referencias de medios permanecen unresolved hastaR05; fuentes author-declared/unverified y datos sintéticos.
API/CLI y recovery mixto verificados; no editor ni nueva publicacióncloud.

R04 se divide en consumerOIDC interno2065 y guest invitations2066. Foundationissuer1834 y loginV42064
son deAuth; OTP2067 se rige por [ADR correo único](../EFEONCE_AUTH_INVITATION_EMAIL_OTP_DECISION_V1.md).
Cada room conserva ID estable; cada invitación tiene token opaco revocable, destinatario/version/vigencia.
UN correo Resend contiene enlace y código; Rooms muestra input y verifica S2S. No se presenta como MFA ni
sesión SSOglobal; proof delissuer tieneaud/RP/invitación/nonce/jti y consumoúnico local. El rol invitado sólo
lee publicado autorizado. Identidad propia para operador usa OIDC y bindingexplícito, nunca tokensMCP.
