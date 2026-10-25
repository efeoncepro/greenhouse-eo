# Rooms — primera experiencia implementada

Fecha: 2026-10-25 · TASK-2058/2059 · [EPIC-052](../../epics/in-progress/EPIC-052-efeonce-rooms-sales-enablement-platform.md).

Rooms dispone de una primera experiencia local con una propuesta ficticia de Nómada: tres piezas en sus formatos originales, artículo SEO/AEO estructurado, radiografía de evidencia y plan de trabajo. El entorno consume el logo oficial, La órbita y primitives AXIS publicados. La muestra y las imágenes generadas se identifican como sintéticas; no son un cliente ni un resultado medido.

Hay vistas cliente, operador y administrador. El servidor decide las capacidades por actor y recurso antes de construir la respuesta; ocultar controles no concede ni retira autoridad. La sala del cliente excluye notas internas, personas y grants. La evidencia tiene permiso independiente. El workspace filtra salas y notas por ámbito; sólo el administrador autorizado consulta accesos.

`can` incorpora roles como techo de capacidades, grants específicos, organización/sala/edición, estados y vigencia. El administrador tampoco evita estas restricciones. Ediciones publicadas son inmutables; editar/publicar requiere borrador y capacidad expresa. Las operaciones de escritura son contratos futuros, no acciones disponibles.

La API demo y CLI HTTP consumen los mismos readers. La identidad real está cerrada: no existe aún login conectado, persistencia ni rollout. [Contrato detallado](../../architecture/rooms/EFEONCE_ROOMS_API_AND_ACCESS_CONTRACT_V1.md#7-primer-corte-ejecutable-2026-10-25) · [Manual local](../../manual-de-uso/rooms/operar-primera-experiencia-local.md) · [QA](../../audits/rooms/2026-10-25-first-local-delivery.md).
