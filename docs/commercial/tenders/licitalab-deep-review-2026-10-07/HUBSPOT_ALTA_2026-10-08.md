# Alta autorizada en HubSpot — 8 de octubre de 2026

**Actualización posterior de UTEM:** presentación confirmada y Deal65832566144 actualizado a Presentación de soluciones /CLP4.800.000 netos. [Readback posterior](../utem-seo-aeo-2026/PRESENTACION-2026-10-08.md). Este documento y su JSON conservan la evidencia histórica de las trece altas, no sus valores actuales.

**Resultado: 13 Deals creados y verificados en portal 48713323, owner Julio Reyes (75788512).** Autorización directa: «Te autorizo», referida a las trece altas de la selección presentada. No autoriza envío de mensajes, ofertas ni postulaciones.

Se revalidaron las trece fichas en LicitaLAB el 08/10 entre 06:14 y 06:17 Chile: todas Publicada, no vencidas, cierres sin cambios respecto de la selección. Se buscaron duplicados por ID, llave `hubspot-public-tender:CL:<ID>` y nombres de comprador. Cero coincidencias de proceso antes de crear; trece IDs distintos en búsqueda posterior.

## Propiedades y resultado

- `pipeline=default`, `dealstage=qualifiedtobuy`, `dealtype=newbusiness`; canal Mercado público, modalidad Compra ágil o Licitación según proceso. No se presume una relación comercial previa por un bucket automático.
- `presupuesto_de_la_licitacion` y `deal_currency_code=CLP` contienen presupuesto del comprador y moneda. `amount` y `closedate` permanecen vacíos: no hay precio propio ni fecha comercial acordada. El plazo de presentación vive en `fecha_de_cierre_de_licitacion`, con la hora textual Chile en descripción.
- Puelche conserva CLP 101.220.000 como presupuesto del proceso, con L11 ChatGPT 9.600.000 y L10 Claude 15.000.000 explicadas separadamente. Ninguna cifra se asignó a amount.
- Descripciones incluyen alcance, fit, pendientes, fuente y límites. `hs_next_step` registra la acción comercial; no se crearon tareas ni actividades de envío.
- Se crearon solo Deals; ninguna Company o Contact. La conciliación y asociación a Company canónica queda pendiente, explícita en la descripción. No se atribuyó un contacto comprador.

## Lectura independiente y deriva

La creación se hizo por MCP autenticado en lotes de 1, 10 y 2, sin fallos. El primer Deal tuvo lectura antes de continuar el lote. Dos lecturas posteriores compararon todas las propiedades enviadas: solo difiere el bucket de nueve Deals.

**Resultado observado: 9 Core Pipeline y 4 Strategic Bets**, todos newbusiness y qualifiedtobuy. Propuesto: 13 Strategic Bets. La regla responsable no está identificada; el conector no expone lectura de workflows en esta sesión y no se modificaron reglas ni se forzó una corrección repetitiva. Core Pipeline no demuestra cliente existente. Owner RevOps/Julio: revisar la regla antes de usar el bucket como clasificación comercial.

| Deal                                                                                                                                                                                              | ID licitación      | Presupuesto comprador CLP | Cierre oferta Chile | Bucket observado |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------: | ------------------- | ---------------- |
| [Efeonce — UTEM — SEO/GEO/AEO](https://app.hubspot.com/contacts/48713323/record/0-3/65832566144?utm_source=app_12360546_mcp&utm_medium=ai_agent&utm_campaign=fetch)                               | `5251-1060-COT26`  |                 6,800,000 | 08-10-2026 18:00    | Core Pipeline    |
| [Efeonce — INDAP — Claude Team Premium](https://app.hubspot.com/contacts/48713323/record/0-3/65806293639?utm_source=app_12360546_mcp&utm_medium=ai_agent&utm_campaign=fetch)                      | `609-107-COT26`    |                 7,180,000 | 08-10-2026 14:00    | Core Pipeline    |
| [Efeonce Factory — MINSAL — Diseño SANNA](https://app.hubspot.com/contacts/48713323/record/0-3/65806331396?utm_source=app_12360546_mcp&utm_medium=ai_agent&utm_campaign=fetch)                    | `757-422-COT26`    |                 2,000,000 | 09-10-2026 09:00    | Core Pipeline    |
| [Efeonce Factory — MINSAL — Adaptación de videos y dípticos](https://app.hubspot.com/contacts/48713323/record/0-3/65832763160?utm_source=app_12360546_mcp&utm_medium=ai_agent&utm_campaign=fetch) | `757-429-COT26`    |                 4,000,000 | 13-10-2026 11:00    | Core Pipeline    |
| [Efeonce — FUCOA/CNR — Portal institucional y aula virtual](https://app.hubspot.com/contacts/48713323/record/0-3/65832737849?utm_source=app_12360546_mcp&utm_medium=ai_agent&utm_campaign=fetch)  | `1108660-10-LE26`  |                13,000,000 | 14-10-2026 15:30    | Core Pipeline    |
| [Efeonce — Estación Central — Continuidad web municipal](https://app.hubspot.com/contacts/48713323/record/0-3/65806250773?utm_source=app_12360546_mcp&utm_medium=ai_agent&utm_campaign=fetch)     | `2432-31-LE26`     |                28,000,000 | 13-10-2026 15:20    | Core Pipeline    |
| [Efeonce — SERNAGEOMIN — ChatGPT Business](https://app.hubspot.com/contacts/48713323/record/0-3/65806299318?utm_source=app_12360546_mcp&utm_medium=ai_agent&utm_campaign=fetch)                   | `1562-76-LE26`     |                 9,000,000 | 16-10-2026 15:01    | Core Pipeline    |
| [Efeonce — SLEP Puelche — ChatGPT y Claude por líneas](https://app.hubspot.com/contacts/48713323/record/0-3/65832650852?utm_source=app_12360546_mcp&utm_medium=ai_agent&utm_campaign=fetch)       | `1375757-32-LP26`  |               101,220,000 | 19-10-2026 17:00    | Core Pipeline    |
| [Efeonce — Ministerio de la Mujer — Claude Team Premium](https://app.hubspot.com/contacts/48713323/record/0-3/65806334790?utm_source=app_12360546_mcp&utm_medium=ai_agent&utm_campaign=fetch)     | `918434-271-COT26` |                 3,000,000 | 12-10-2026 12:30    | Core Pipeline    |
| [Efeonce — SERNATUR Ñuble — Campaña turística](https://app.hubspot.com/contacts/48713323/record/0-3/65806359148?utm_source=app_12360546_mcp&utm_medium=ai_agent&utm_campaign=fetch)               | `1040538-11-LP26`  |               135,000,000 | 26-10-2026 15:00    | Strategic Bets   |
| [Efeonce — SERNATUR Aysén — Campaña de promoción](https://app.hubspot.com/contacts/48713323/record/0-3/65832697782?utm_source=app_12360546_mcp&utm_medium=ai_agent&utm_campaign=fetch)            | `1332-12-LP26`     |               200,000,000 | 21-10-2026 15:00    | Strategic Bets   |
| [Efeonce — MINSAL — Campaña de actividad física](https://app.hubspot.com/contacts/48713323/record/0-3/65832645385?utm_source=app_12360546_mcp&utm_medium=ai_agent&utm_campaign=fetch)             | `757-90-LP26`      |               130,000,000 | 27-10-2026 15:00    | Strategic Bets   |
| [Efeonce — Protección de la Niñez — Familias de Acogida](https://app.hubspot.com/contacts/48713323/record/0-3/65806377357?utm_source=app_12360546_mcp&utm_medium=ai_agent&utm_campaign=fetch)     | `1177296-23-LP26`  |               270,699,000 | 02-11-2026 15:01    | Strategic Bets   |

## Registros previos leídos sin cambios

- [ProChile 65678232118](https://app.hubspot.com/contacts/48713323/record/0-3/65678232118?utm_source=app_12360546_mcp&utm_medium=ai_agent&utm_campaign=fetch) y [UNAP 65678277469](https://app.hubspot.com/contacts/48713323/record/0-3/65678277469?utm_source=app_12360546_mcp&utm_medium=ai_agent&utm_campaign=fetch) se conservaron.

La búsqueda por nombre devolvió estos históricos, todos closedlost y con otros IDs; no son duplicados ni fueron modificados:

- [Sernatur - Campaña Comunicacional Posicionamiento Turístico · 64465215819](https://app.hubspot.com/contacts/48713323/record/0-3/64465215819?utm_source=app_12360546_mcp&utm_medium=ai_agent&utm_campaign=search) — `1878-9-LP26`.
- [Ministerio de la Mujer - Campaña Nacional VCM 2026 · 64466272830](https://app.hubspot.com/contacts/48713323/record/0-3/64466272830?utm_source=app_12360546_mcp&utm_medium=ai_agent&utm_campaign=search) — `918434-14-LP26`.
- [Campaña comunicacional Coquimbo - SERNATUR · 43063042631](https://app.hubspot.com/contacts/48713323/record/0-3/43063042631?utm_source=app_12360546_mcp&utm_medium=ai_agent&utm_campaign=search) — `1869-14-LP25`.
- [SERNATUR Arica - Agencia Creativa - Globe · 37421639753](https://app.hubspot.com/contacts/48713323/record/0-3/37421639753?utm_source=app_12360546_mcp&utm_medium=ai_agent&utm_campaign=search) — `1330-4-LE25`.
- [Ministerio de la Mujer y la Equidad de Género - Plan de Medios - Licitación · 34778897591](https://app.hubspot.com/contacts/48713323/record/0-3/34778897591?utm_source=app_12360546_mcp&utm_medium=ai_agent&utm_campaign=search) — `918434-12-LE25`.

## Evidencia y continuidad

- [Manifiesto de las trece altas](hubspot-altas-2026-10-08.csv).
- [Análisis comercial](README.md).
- Evidencia completa local, ignorada por Git: `.auth/licitalab-radar-reports/create-20261008-*` (payload exacto, respuestas, dos readbacks y búsqueda final).
- Registros comunes sincronizados: `docs/commercial/CRM_DEAL_REGISTER.md` y `docs/commercial/tenders/LICITATION_CRM_REGISTER.md`.
- No se modificó ProChile/UNAP ni la higiene histórica propuesta. La autorización fue alta de trece oportunidades, no cierre de negocios antiguos.
- Antes de ofertar siguen pendientes expediente completo, admisibilidad, costos/margen/caja, capacidad, canal de licencias y GO de postulación.

## Continuidad posterior a este readback

Julio indicó conservar las altas ya hechas, pero **calificar desde lead antes de promover nuevas señales a oportunidad**. Esta instrucción no cambia retroactivamente etapas ni convierte `qualifiedtobuy` en prueba de calificación. No se repiten las altas.

UTEM fue seleccionada para preparación: [expediente actualizado](UTEM-5251-1060-COT26-REVISION-2026-10-08.md), con anexos firmados y declaraciones del operador resueltas. Las tareas y borradores posteriores pertenecen al [agente de seguimiento](../../follow-up-agent/README.md); el texto anterior “no se crearon tareas” describe únicamente la ronda de altas CRM. Esta actualización documental no representa otro readback ni modifica CRM.
