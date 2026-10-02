# Performance Report Septiembre 2026 — evidencia TeamBot

> Fecha: 2026-09-30
> Alcance: anuncio grupal `EO Team` + follow-ups personales 1:1
> Estado: ejecutado y aceptado por Bot Framework; sin afirmación de lectura

## Fuente y aprobación

- Informe entregado por el operador: `Performance Report — Septiembre 2026` en Notion (corte al 30/09; 6 tareas con deadline 30/09 contadas como Carry-Over).
- El operador revisó el texto exacto del grupo y el resumen de los cuatro 1:1 y autorizó el envío el mismo 30/09 (antes del ritual del día 1, para dejar abierta la ventana de cierre de las tareas que vencían ese día).
- Criterios de redacción aplicados: ningún OT bajo se trata como desempeño individual (Daniela y Valentina se explican por la última milla de Berel); la carga de Andrés se cita contra el tope acordado de 60 que registra el informe, pero se atribuye al reparto del equipo y no a él; la redistribución de carga se presenta como propuesta al directorio, no como decisión tomada; Valentina se lee como línea base de onboarding.

## Anuncio grupal

- Destino: `EO Team` (`chat_group`).
- Contenido: seis bloques, voz Nexa, cuatro menciones y CTA `Abrir informe`.
- Fingerprint: `016eb679dab30025bb2ca107`.
- Audit run: `teams-manual-565de62c-f595-49da-be90-71e580561722` (`succeeded`).
- Message ID: `1790793377463`.
- Readback: el mensaje publicado devuelve las cuatro menciones (Andrés, Melkin, Daniela, Valentina) con sus Object IDs de Entra esperados.

## Follow-ups 1:1

Cada destinatario fue revalidado en Microsoft Entra (`accountEnabled=true`) inmediatamente antes del envío. El dry-run confirmó cero duplicados para `manual-performance-feedback:2026-09:<member>:v1`; el envío usó cards sin mención y sin `activity.text`, con CTA al mismo informe. Puente temporal: `tmp/send-performance-feedback-2026-09.ts` (no versionado; no es una API permanente).

| Persona | Audit run | Message ID | Outcome |
| --- | --- | --- | --- |
| Andrés Carlosama | `teams-manual-84d68979-ca7d-404e-9bb6-9efef28cf34b` | `1790793444534` | `succeeded` |
| Melkin Hernández | `teams-manual-a280d1eb-4655-4fb9-ae71-9b156d25ed92` | `1790793446582` | `succeeded` |
| Daniela Ferreira | `teams-manual-d813d2db-822d-447a-88d5-36a3629957d6` | `1790793449588` | `succeeded` |
| Valentina Hoyos | `teams-manual-6829a008-d03f-4356-91a2-f80c12c3904c` | `1790793451437` | `succeeded` |

## Notas operativas

- Valentina resolvió con Object ID `a2334f27-11af-4952-8303-718091982662` (`valentina.hoyos@efeonce.org`).
- `chat_message_search` no devolvió el card recién publicado (índice con retraso o card no indexado); el readback se hizo leyendo el mensaje por ID en el chat.
- `succeeded` demuestra aceptación del transporte y persistencia de auditoría, no lectura.
- Segundo mes con un script temporal para los 1:1: el follow-up mensual sigue pendiente de converger a Notification Hub / CLI gobernado.
