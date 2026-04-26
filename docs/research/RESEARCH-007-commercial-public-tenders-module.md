# RESEARCH-007 — Commercial Public Tenders Module

> **Tipo de documento:** Research brief (modulo naciente)
> **Version:** 0.1
> **Creado:** 2026-04-26 por Julio + Codex
> **Status:** Active
> **Alcance:** Dominio Commercial / Comercial, licitaciones publicas ChileCompra, Mercado Publico API, adjuntos de licitacion, opportunity-to-bid, bid desk interno

## Proposito

Explorar un modulo de **Licitaciones Publicas** dentro del dominio Commercial de Greenhouse.

El objetivo no es solo listar licitaciones de Mercado Publico. El objetivo es convertir una senal publica de demanda en una unidad operable del ciclo comercial de Efeonce:

- descubrir oportunidades relevantes
- verificar bases y adjuntos
- clasificar fit comercial
- decidir si se participa
- preparar bid/no-bid
- conectar una oportunidad adjudicable con deals, quotes, SOW, contratos y delivery readiness

Este brief nace despues de validar acceso real a la API de Mercado Publico y comprobar que los adjuntos de una licitacion se pueden recuperar desde la ficha publica usando el flujo WebForms de MercadoPublico.cl.

> **Delta 2026-04-26:** `TASK-673` implemento un POC standalone de matcher comercial en `scripts/research/mercadopublico-poc/`. Hallazgos iniciales: el listado `estado=activas` trae solo campos resumidos; `Descripcion` e `Items` requieren llamada por `codigo`; las senales no canonicas como medios/PR/influencers deben vivir separadas de `servicios_matched`. Resultados en `docs/research/TASK-673-findings.md`.

## Contexto Confirmado

### Fuentes Externas

- ChileCompra expone una API de Mercado Publico para datos reales y en linea de licitaciones y ordenes de compra, accesible mediante ticket de acceso entregado por DCCP.
- El endpoint validado para licitaciones es:
  - `https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json`
  - filtros confirmados por uso: `estado`, `codigo`, `ticket`
- La API JSON entrega detalle estructurado de licitacion, comprador, fechas, items, adjudicacion y metadata contractual.
- Los adjuntos no aparecen como archivos descargables dentro del JSON validado. Para adjuntos, el camino efectivo validado es la ficha publica:
  - `https://www.mercadopublico.cl/Procurement/Modules/RFB/DetailsAcquisition.aspx?idlicitacion=<codigo>`
  - links a `Attachment/VerAntecedentes.aspx?enc=...`
  - descarga por postback WebForms sobre el control `grdAttachment$...$grdIbtnView`

### Postulacion / Oferta Por API

Hallazgo 2026-04-26: con la documentacion publica vigente, **no hay evidencia de un endpoint oficial para postular/ofertar a una licitacion desde la API Mercado Publico**.

Lo confirmado:

- La documentacion publica describe la API como acceso a informacion de compras publicas bajo un marco de transparencia y datos abiertos.
- Los metodos publicados para licitaciones son consultas por `GET`:
  - por codigo de licitacion
  - por estado
  - por fecha
  - por codigo de organismo publico
  - por codigo de proveedor
- Los metodos publicados para ordenes de compra tambien son consultas por `GET`.
- La documentacion publica no lista endpoints transaccionales para:
  - crear oferta
  - subir anexos de oferta
  - firmar/enviar postulacion
  - modificar oferta
  - retirar oferta

Decision para Greenhouse:

- El modulo debe asumir que Mercado Publico API es **read-only para Greenhouse** hasta que ChileCompra entregue formalmente otro contrato.
- Greenhouse puede preparar, controlar y auditar la postulacion, pero la accion juridicamente efectiva de ofertar debe ocurrir en MercadoPublico.cl con el usuario/proveedor habilitado.
- Cualquier automatizacion tipo browser/RPA para enviar ofertas queda fuera del primer contrato recomendado por riesgo legal, fragilidad tecnica y ausencia de API oficial documentada.
- Si el negocio necesita postulacion end-to-end desde Greenhouse, debe abrirse una investigacion separada con ChileCompra/DCCP para confirmar si existe API privada, convenio, ambiente proveedor o integracion certificada.

### Complemento Chrome Como Carril Alternativo

Hallazgo 2026-04-26: LicitaLAB declara publicamente una extension Chrome para ejecutar acciones en Mercado Publico desde su plataforma web. Su centro de ayuda indica que, para aceptar/rechazar ordenes de compra o enviar postulaciones a Compra Agil, es necesario instalar la extension que conecta la cuenta LicitaLAB con Mercado Publico.

Interpretacion tecnica:

- Esto no evidencia una API publica de postulacion.
- Es consistente con una arquitectura **browser-mediated**:
  - el usuario esta autenticado en MercadoPublico.cl en su navegador
  - la extension opera dentro de esa sesion y/o contra paginas de Mercado Publico
  - la plataforma SaaS prepara datos, documentos y comandos
  - la extension ejecuta acciones en el contexto del usuario
- La extension actua como bridge local entre Greenhouse/LicitaLAB y MercadoPublico.cl, no como integracion server-to-server.

Implicacion para Greenhouse:

- Existe un camino competitivo plausible para un futuro **Greenhouse Mercado Publico Companion Extension**.
- No debe ser Fase 0 ni Fase 1: antes hay que resolver ingestion, documentos, workflow, evidencia, permisos y decision governance.
- Si se implementa, debe tratarse como producto regulado de alto riesgo, con confirmaciones humanas explicitas, no como bot silencioso.

Contrato recomendado para una extension futura:

- La extension nunca debe almacenar credenciales de Mercado Publico.
- Debe requerir que el usuario este autenticado directamente en MercadoPublico.cl.
- Toda accion irreversible debe requerir confirmacion humana visible.
- Greenhouse debe registrar intentos, payload preparado, usuario, timestamp y resultado, pero no debe simular una postulacion si Mercado Publico no entrega comprobante.
- Debe existir kill switch remoto por tenant/usuario/version.
- Debe limitarse inicialmente a acciones de bajo riesgo:
  - abrir ficha correcta
  - prellenar campos
  - adjuntar documentos preparados
  - capturar comprobante
  - registrar estado
- El envio final de oferta debe quedar detras de confirmacion explicita del usuario y validacion de evidencia.

### Validacion Greenhouse Ya Realizada

- Ticket Mercado Publico provisionado en GCP Secret Manager:
  - secret: `greenhouse-mercado-publico-ticket`
  - runtime preferido: `MERCADO_PUBLICO_TICKET_SECRET_REF=greenhouse-mercado-publico-ticket`
- Helper local implementado:
  - `src/lib/integrations/mercado-publico/tenders.ts`
- Smoke live:
  - licitacion `1000813-8-LE26`
  - estado `Publicada`
  - tipo `LE`
  - `itemsCount=2`
  - adjunto descargado: `ANEXO_N°1_FORMULARIO_OFERTA_ECÓNOMICA.docx`
  - tamano: `23090` bytes
  - hash parcial: `d5ab9465ec63`

## Por Que Pertenece A Commercial

Licitaciones Publicas no pertenece primariamente a Finance.

Finance consumira informacion cuando una licitacion derive en cotizacion, contrato, ingreso, OC, HES o cobranza. Pero el ownership primario es Commercial porque el modulo trata de:

- demanda de mercado
- oportunidad comercial
- calificacion bid/no-bid
- estrategia de oferta
- construccion de propuesta
- formalizacion pre-venta

Esto encaja con la decision canonica de `GREENHOUSE_COMMERCIAL_FINANCE_DOMAIN_BOUNDARY_V1.md`.

| Objeto | Owner canonico | Consumers downstream |
| --- | --- | --- |
| Licitacion publica | Commercial | Finance, Legal, Delivery |
| Bases y adjuntos | Commercial document intelligence | Legal, Delivery, Finance |
| Bid/no-bid decision | Commercial | Executive, Delivery |
| Oferta tecnica/economica | Commercial | Delivery, Finance |
| Quote/SOW derivada | Commercial | Finance, Delivery |
| OC/HES/facturacion | Finance / Operations | Commercial lectura historica |

## Nombre De Modulo Recomendado

Nombre visible recomendado:

- **Comercial > Licitaciones Publicas**

Nombres internos recomendados:

- domain: `commercial`
- module slug: `public_tenders`
- source system: `mercado_publico`
- primary external id: `mercado_publico_tender_code`

Evitar:

- `Finance > Licitaciones`
- `Procurement`, porque en Greenhouse esto no es compras internas; es venta al Estado.
- `Mercado Publico` como nombre de modulo, porque Mercado Publico es fuente/proveedor de datos, no el trabajo que Greenhouse hace.

## Jobs To Be Done

### Commercial Lead / Account Owner

- Quiero ver licitaciones relevantes para Efeonce sin revisar manualmente MercadoPublico.cl todos los dias.
- Quiero entender rapidamente si vale la pena participar.
- Quiero saber que documentos debo leer antes de decidir.
- Quiero convertir una licitacion interesante en oportunidad/deal y luego en quote/SOW.

### Bid Desk / Operaciones Comerciales

- Quiero descargar y versionar bases, anexos y aclaraciones.
- Quiero detectar cambios de fechas o nuevos adjuntos.
- Quiero registrar preguntas, plazos y responsables.
- Quiero preparar una checklist de requisitos administrativos, tecnicos y economicos.

### Delivery / Solution Owner

- Quiero revisar bases tecnicas y esfuerzo esperado antes de comprometer una oferta.
- Quiero opinar sobre fit, riesgos, capacidad y fechas.
- Quiero que los requisitos relevantes sobrevivan al paso a SOW o delivery kickoff.

### Executive / Commercial Leadership

- Quiero ver pipeline publico por monto, fecha de cierre, fit, probabilidad y estado interno.
- Quiero distinguir oportunidades nuevas, en evaluacion, ofertadas, adjudicadas, perdidas y descartadas.
- Quiero medir conversion bid/no-bid -> oferta -> adjudicacion -> contrato -> revenue.

## Alcance Funcional Propuesto

### Fase 0 — Intake Tecnico Confiable

- Buscar licitaciones por estado, fecha y codigo.
- Hidratar detalle por codigo externo.
- Descubrir y descargar adjuntos.
- Persistir snapshot normalizado y raw payload.
- Dedupe de adjuntos por `sha256`.
- Guardar binarios en bucket privado, no en PostgreSQL.
- Registrar freshness, fuente, errores y reintentos.

### Fase 1 — Workbench Comercial

- Lista de licitaciones candidatas con filtros:
  - estado Mercado Publico
  - fecha de cierre
  - organismo comprador
  - monto estimado
  - rubro / categoria
  - palabras clave
  - fit interno
  - estado Greenhouse
- Detail view:
  - resumen ejecutivo
  - fechas criticas
  - comprador
  - items
  - documentos
  - cambios detectados
  - notas internas
  - decision bid/no-bid
- Acciones:
  - marcar para evaluar
  - asignar owner
  - pedir revision Delivery/Legal/Finance
  - convertir a deal/oportunidad

### Fase 2 — Bid Intelligence

- Extraccion de texto desde adjuntos.
- Clasificacion de documentos:
  - bases administrativas
  - bases tecnicas
  - anexos economicos
  - formularios
  - aclaraciones
  - modificaciones
- Checklist de requisitos:
  - garantias
  - experiencia requerida
  - certificaciones
  - plazos
  - formato oferta tecnica
  - formato oferta economica
  - documentos legales
- Alertas:
  - cierre cercano
  - preguntas vencen pronto
  - nuevo adjunto detectado
  - cambio en fecha de cierre
  - oportunidad sin owner

### Fase 3 — Quote/SOW Bridge

- Crear deal comercial desde licitacion.
- Crear quote draft usando:
  - comprador como organization candidate
  - items/requisitos como scope seed
  - moneda y fechas como contexto
  - documentos como evidence pack
- Vincular licitacion con:
  - `greenhouse_commercial.deals`
  - `greenhouse_commercial.quotations`
  - `greenhouse_commercial.contracts`
  - `greenhouse_core.assets`

### Fase 4 — Submission Control Room

Esta fase no postula por API. Coordina la postulacion externa en MercadoPublico.cl.

- Generar paquete interno de postulacion:
  - oferta tecnica
  - oferta economica
  - anexos administrativos
  - certificados requeridos
  - checklist de cumplimiento
- Registrar estado operacional:
  - paquete en preparacion
  - listo para revision
  - aprobado internamente
  - postulado en Mercado Publico
  - comprobante/evidencia cargada
- Guardar evidencia manual:
  - timestamp de envio
  - usuario responsable
  - comprobante o screenshot/PDF de MercadoPublico.cl
  - monto ofertado
  - archivos finales enviados
- Reconciliar despues contra API/read model:
  - estado de licitacion
  - adjudicacion
  - orden de compra si aplica

## Modelo De Datos Candidato

Este research no define DDL final. Propone el agregado para futura arquitectura.

### `greenhouse_commercial.public_tenders`

Grano: una licitacion externa por codigo Mercado Publico.

Campos candidatos:

- `public_tender_id`
- `source_system = 'mercado_publico'`
- `external_code`
- `name`
- `description`
- `status_external`
- `status_greenhouse`
- `buyer_external_code`
- `buyer_name`
- `buyer_tax_id`
- `currency_code`
- `estimated_amount`
- `published_at`
- `questions_deadline_at`
- `closing_at`
- `adjudication_at`
- `raw_payload_json`
- `last_seen_at`
- `last_hydrated_at`
- `fingerprint`

### `greenhouse_commercial.public_tender_documents`

Grano: un documento/adjunto versionado.

Campos candidatos:

- `public_tender_document_id`
- `public_tender_id`
- `source_page_url`
- `source_page_fingerprint`
- `filename`
- `document_type`
- `description`
- `published_at`
- `asset_id`
- `sha256`
- `size_bytes`
- `content_type`
- `downloaded_at`
- `last_seen_at`

### `greenhouse_commercial.public_tender_decisions`

Grano: decision interna bid/no-bid por licitacion.

Campos candidatos:

- `decision_id`
- `public_tender_id`
- `decision_status`
- `owner_user_id`
- `fit_score`
- `expected_value`
- `risk_level`
- `reason_codes`
- `notes`
- `decided_at`
- `decided_by`

### `greenhouse_commercial.public_tender_links`

Grano: vinculo entre licitacion y objetos comerciales.

Campos candidatos:

- `public_tender_id`
- `linked_object_type`
- `linked_object_id`
- `link_reason`
- `created_at`
- `created_by`

## Estados Internos Propuestos

Los estados externos de Mercado Publico no deben ser el workflow interno.

Workflow Greenhouse recomendado:

- `new` — detectada, no revisada
- `watching` — monitoreada por potencial fit
- `evaluating` — en revision bid/no-bid
- `no_bid` — descartada con razon
- `bid_planning` — se decidio participar y se prepara oferta
- `submitted` — oferta enviada
- `awarded` — adjudicada a Efeonce
- `lost` — adjudicada a tercero o no seleccionada
- `cancelled` — anulada/revocada/desierta segun fuente
- `archived` — cerrada sin accion futura

## Arquitectura De Ingestion Recomendada

### Principios

- API oficial primero para datos estructurados.
- Ficha publica solo para adjuntos y gaps que la API no entrega.
- Persistir raw payload + modelo normalizado.
- Separar metadata de documentos y binarios.
- Idempotencia por codigo externo, URL de antecedente, filename y hash.
- No bloquear UI por descargas; usar worker/background jobs.
- Tratar WebForms como fuente fragil: parser con tests fixture y fallback controlado.

### Pipeline

```text
Mercado Publico API
  -> tender search / tender detail
  -> normalize
  -> upsert public_tenders
  -> enqueue document discovery

MercadoPublico.cl ficha publica
  -> discover VerAntecedentes pages
  -> parse attachment rows
  -> download changed documents
  -> write private asset
  -> upsert public_tender_documents
  -> emit commercial.public_tender.documents_changed
```

### Resiliencia

- Timeouts cortos y retries con backoff.
- Circuit breaker por fuente si MercadoPublico.cl empieza a devolver HTML inesperado.
- `source_sync_runs` para observabilidad.
- DLQ para documentos que fallan por parser/postback.
- Fingerprints para detectar cambios sin redescargar todo.
- Smoke canario diario sobre una licitacion conocida mientras exista.
- Fixtures versionados de HTML de ficha y antecedentes para proteger el parser.

## Views Y Entitlements

Este modulo toca acceso y debe distinguir ambos planos.

### Views / Surfaces

Surface objetivo:

- `comercial.licitaciones_publicas`

Navegacion objetivo:

- `Comercial > Licitaciones Publicas`

URLs candidatas:

- primera etapa: `/commercial/public-tenders`
- detail: `/commercial/public-tenders/[id]`

Si el programa de separacion Commercial todavia no ha migrado rutas, se puede usar un entrypoint transicional, pero la surface visible debe declararse como Commercial, no Finance.

### Entitlements / Capabilities

Capabilities candidatas:

- `commercial.public_tenders.read`
- `commercial.public_tenders.evaluate`
- `commercial.public_tenders.assign`
- `commercial.public_tenders.download_documents`
- `commercial.public_tenders.link_deal`
- `commercial.public_tenders.admin`

Roles iniciales:

- `efeonce_admin`: full
- `efeonce_account`: read/evaluate/link
- `commercial_admin`: full futuro
- `sales_lead`: evaluate/assign/link futuro
- `finance_admin`: lectura transicional cuando Finance consuma oportunidad adjudicada o quote

Regla: no abrir descarga de documentos a cualquier lector si luego hay documentos con datos sensibles. Aunque la fuente sea publica, el paquete curado por Greenhouse puede incluir notas internas, clasificacion y decisiones.

## UI Target

### Lista Operacional

Una tabla densa, no una landing page.

Columnas sugeridas:

- codigo
- nombre
- comprador
- estado externo
- estado Greenhouse
- cierre
- monto estimado
- fit
- owner
- documentos
- ultima actualizacion

Acciones inline:

- ver detalle
- marcar para evaluar
- asignar
- descartar

### Detail View

Estructura sugerida:

- Header: codigo, nombre, estado, cierre, owner, CTA principal.
- Summary rail: comprador, monto, fechas, tipo, links externos.
- Tabs:
  - Resumen
  - Documentos
  - Requisitos
  - Evaluacion
  - Links comerciales
  - Historial

### Estados Obligatorios

- loading parcial
- sin adjuntos
- adjuntos detectados pero descarga pendiente
- parser fallo en adjuntos
- ticket/API no configurado
- licitacion no encontrada
- cierre vencido
- oportunidad descartada

## Riesgos Y Preguntas Abiertas

### Riesgos Tecnicos

- El flujo de adjuntos depende de HTML/WebForms publico, no de contrato JSON estable.
- Los nombres de controles (`grdAttachment$...`) pueden cambiar.
- Algunos documentos pueden requerir sesion o condiciones distintas.
- Encoding de filenames puede venir inconsistente entre HTML y headers.
- Descargas grandes pueden exceder limites serverless si se hacen inline.

### Riesgos De Producto

- Sin scoring claro, el modulo puede transformarse en una bandeja ruidosa.
- Licitaciones publicas tienen plazos estrictos; alertas mal calibradas generan falsa confianza.
- El equipo necesita ownership claro de bid/no-bid para que no quede como dashboard pasivo.

### Preguntas Abiertas

- Que categorias/rubros de Mercado Publico son realmente relevantes para Efeonce?
- Cual es el umbral minimo de monto o fit para crear oportunidad?
- Quien es owner natural: Comercial, Bid Desk, Account Owner o Delivery Lead?
- Se requiere aprobacion ejecutiva para participar?
- Que documentos deben almacenarse como evidencia legal de oferta?
- La extraccion AI de requisitos puede operar sobre todos los adjuntos o solo sobre tipos permitidos?
- Como se representaran preguntas/respuestas y aclaraciones si aparecen como documentos posteriores?

## Ready For Task

Este research puede convertirse en tasks cuando se cierren estas decisiones:

1. Rubros/keywords iniciales de vigilancia.
2. Owner operativo del modulo.
3. Storage target para adjuntos (`greenhouse_core.assets` + bucket privado recomendado).
4. Primer workflow interno: solo watch/evaluate/no-bid o tambien submitted/awarded.
5. Surface y access inicial: `comercial.licitaciones_publicas` + capabilities.
6. Scope del primer corte: ingestion-only, workbench UI, o ambos.

## Tasks Candidatas

- `TASK-TBD` — Commercial Public Tenders architecture contract.
- `TASK-TBD` — Mercado Publico ingestion persistence + private assets.
- `TASK-TBD` — Public Tenders workbench list/detail.
- `TASK-TBD` — Public Tenders bid/no-bid workflow.
- `TASK-TBD` — Tender document intelligence and requirement extraction.
- `TASK-TBD` — Tender to deal/quote bridge.
- `TASK-TBD` — Public tender submission control room without API-side posting.

## Fuentes

- ChileCompra — API Mercado Publico: https://www.chilecompra.cl/api/
- Mercado Publico API condiciones de uso: https://api.mercadopublico.cl/modules/CondicionesUso.aspx
- Diccionario API Licitaciones: https://api.mercadopublico.cl/documentos/Documentaci%C3%B3n%20API%20Mercado%20Publico%20-%20Licitaciones.pdf
- Ficha publica MercadoPublico.cl validada por smoke: `DetailsAcquisition.aspx?idlicitacion=<codigo>`
- Helper Greenhouse validado: `src/lib/integrations/mercado-publico/tenders.ts`
