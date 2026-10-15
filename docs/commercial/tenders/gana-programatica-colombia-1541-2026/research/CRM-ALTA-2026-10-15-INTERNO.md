# Alta CRM — Gana GRD-1541 — 15/10/2026 — INTERNO

## Autoridad y plan ejecutado

Pedido directo de Julio: crear caso, Deal para **Gana** y Contact sólo si aparece en la licitación.
Carril MCP HubSpot, identidad Julio `75788512`, portal `48713323`; DEAL/COMPANY/NOTE/CONTACT disponibles. Propiedades/enums/pipeline leídos antes del write.
La instrucción explícita cubre Deal nuevo, asociación a la Company canónica y nota del caso; no autoriza atribuir contactos históricos al RFP, reabrir otros Deals ni modificar Company/segmentos.

| Objeto/fase | Acción | Campos y fuente | Conservado / pendiente |
| --- | --- | --- | --- |
| Company | Reutilizar [34264439413](https://app.hubspot.com/contacts/48713323/record/0-2/34264439413?utm_source=codex&utm_medium=ai_agent) | Comprador Grupo Réditos / Réditos Empresariales S.A.; identidad de portal y Company canónica por nombre/dominio | No se modifican propiedades, lifecycle, cohorts ni otras marcas |
| Deal | Crear [66065702426](https://app.hubspot.com/contacts/48713323/record/0-3/66065702426?utm_source=codex&utm_medium=ai_agent) | Gana en nombre y primer párrafo; WherEX/Licitación; owner Julio; GRD-1541; performance_paid_media; COP y presupuesto30M/mes | amount/closedate/datetime de licitación sin informar; duración/IVA y hora pendientes |
| Note | Crear [118603990273](https://app.hubspot.com/contacts/48713323/deal/66065702426?engagement=118603990273&utm_source=codex&utm_medium=ai_agent) | Revisión de bases, identidad Gana, requisitos, presupuesto mensual, gates y comunicaciones | Asociada a Deal y Company |
| Contact | No crear ni asociar | RFP, invitación y ficha no identifican responsable; directos deshabilitados, sin Q&A/anuncios | Personas históricas no acreditadas para este proceso |
| Lead/Quote/Proposal | No crear | Fuera del mandato y de la etapa | Calificación/admisibilidad/margen pendientes |

El campo `linea_de_servicio` conserva vacío: enum legacy sin Media & Distribution; se usa `servicios_especificos=performance_paid_media` y descripción, sin inventar una opción.
No existe propiedad inequívoca de marca hallada en la búsqueda: **Gana** queda explícita en dealname, descripción, nota y expediente. No se crea Company paralela ni se renombra al holding.

## Verificación

- Creación Deal `2026-10-15T12:29:56.955Z`; nota `12:30:27.775Z`.
- Dos lecturas MCP separadas, antes/después de la creación de nota y trabajo independiente: `default/appointmentscheduled`, `Strategic Bets`, `newbusiness`, owner75788512, COP, presupuesto30000000.
- `appointmentscheduled` es entrada administrativa; descripción declara que no hay reunión ni calificación completa.
- amount/closedate/fecha_de_cierre_de_licitacion ausentes en ambos readbacks; no se confunde presupuesto mensual con valor total.
- Búsqueda por ID e idempotencia antes de crear: cero. Búsqueda posterior GRD-1541: un resultado, este Deal.
- Company vinculada por búsqueda independiente. UI autenticada confirma **Empresas (1) → Grupo Reditos → Principal** y **Contactos (0)**.
- Nota recuperada por ID y por asociación al Deal; contenido Gana y responsabilidad Efeonce conservados.
- Sin deriva de bucket/tipo observada. Company, seis Deals históricos y nueve contactos preexistentes no modificados por este trabajo.

## Contactos históricos del holding — no son responsables confirmados del RFP

| Contacto CRM | Cargo almacenado (no revalidado) | Tratamiento |
| --- | --- | --- |
| [Erika Curico Valencia](https://app.hubspot.com/contacts/48713323/record/0-1/204143789906?utm_source=codex&utm_medium=ai_agent) | Purchasing Analyst | No acreditado para GRD-1541; sin asociación nueva |
| [sebastian.lopez@gruporeditos.com](https://app.hubspot.com/contacts/48713323/record/0-1/175185297426?utm_source=codex&utm_medium=ai_agent) | No informado | No acreditado para GRD-1541; sin asociación nueva |
| [Deisy Castano](https://app.hubspot.com/contacts/48713323/record/0-1/175185297425?utm_source=codex&utm_medium=ai_agent) | Ecommerce Coordinator | No acreditado para GRD-1541; sin asociación nueva |
| [Hugo Duque](https://app.hubspot.com/contacts/48713323/record/0-1/165590147588?utm_source=codex&utm_medium=ai_agent) | Director of Customer Experience | No acreditado para GRD-1541; sin asociación nueva |
| [Luis Rivas](https://app.hubspot.com/contacts/48713323/record/0-1/165019214102?utm_source=codex&utm_medium=ai_agent) | Director of Business Intelligence | No acreditado para GRD-1541; sin asociación nueva |
| [Tibisay Durango Mesa](https://app.hubspot.com/contacts/48713323/record/0-1/164644804474?utm_source=codex&utm_medium=ai_agent) | Directora de canal y negocios | No acreditado para GRD-1541; sin asociación nueva |
| [Darwin Mauricio Lopez](https://app.hubspot.com/contacts/48713323/record/0-1/164987087477?utm_source=codex&utm_medium=ai_agent) | Coordinador de Marketing | No acreditado para GRD-1541; sin asociación nueva |
| [Gustavo Lopez](https://app.hubspot.com/contacts/48713323/record/0-1/154781343353?utm_source=codex&utm_medium=ai_agent) | Gerente de TI | No acreditado para GRD-1541; sin asociación nueva |
| [Belkys Beleño](https://app.hubspot.com/contacts/48713323/record/0-1/134069434792?utm_source=codex&utm_medium=ai_agent) | Analista de compras | No acreditado para GRD-1541; sin asociación nueva |

No se usaron sus datos como prueba de empleo/autoridad vigente ni se los contactó.

## Procesos históricos preservados

| Deal | Proceso | Estado observado |
| --- | --- | --- |
| [GRUPO REDITOS - Agencia Digital](https://app.hubspot.com/contacts/48713323/record/0-3/58686695541?utm_source=codex&utm_medium=ai_agent) | Lic ID-1393 | closedlost · preservado |
| [Grupo Reditos - Agencia de consultoría estratégica de mercadeo](https://app.hubspot.com/contacts/48713323/record/0-3/56706784693?utm_source=codex&utm_medium=ai_agent) |  ID-1240 | closedlost · preservado |
| [Grupo Reditos - Agencia Digital Loti y Gana](https://app.hubspot.com/contacts/48713323/record/0-3/45968102832?utm_source=codex&utm_medium=ai_agent) | 1238 | closedlost · preservado |
| [Grupo Reditos - Influencer Marketing](https://app.hubspot.com/contacts/48713323/record/0-3/43896978978?utm_source=codex&utm_medium=ai_agent) | 1200 | closedlost · preservado |
| [RFP CRM - Reditos Empresariales](https://app.hubspot.com/contacts/48713323/record/0-3/43331920393?utm_source=codex&utm_medium=ai_agent) | ID-1165, | closedlost · preservado |
| [Grupo Reditos - CRM](https://app.hubspot.com/contacts/48713323/record/0-3/38063761955?utm_source=codex&utm_medium=ai_agent) | 1016 | closedlost · preservado |

GRD-1541 es un proceso nuevo para Gana. No cambia el NO-BID registrado de GRD-1496/1499/1501/1502.

## Condiciones aún pendientes

Años «tres (2)», respaldo de proveedores, documentación extranjera, inventario/categoría apuestas, equipo, costo y margen. Plazo20/10: email14:00Colombia frente a UI18:00sinzona. Conservar evidencia antes de fijar datetime.
Sin nueva consulta, correo al comprador, carga de oferta, firma ni postulación.
