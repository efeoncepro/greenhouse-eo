# RESEARCH-007 — Commercial Public Tenders Module

> **Tipo de documento:** Research brief (modulo naciente)
> **Version:** 0.5
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

### Inventario Endpoint API Oficial

Hallazgo 2026-04-26: la documentacion publica vigente de Mercado Publico expone una API principalmente **read-only** con tres familias de recursos: licitaciones, ordenes de compra y catalogo de empresas/codigos internos. Todas las consultas documentadas usan `GET` y requieren `ticket`.

#### Formatos Soportados

La documentacion muestra variantes por extension:

- `.json`
- `.jsonp` con parametro `callback`
- `.xml`

Para Greenhouse, el formato recomendado es `.json`. `jsonp` y `xml` pueden ignorarse salvo que aparezca una restriccion legacy especifica.

#### Licitaciones

Base:

```text
https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json
```

Endpoints/patrones documentados:

| Caso | Query params | Notas |
| --- | --- | --- |
| Detalle por codigo | `codigo=<CodigoExterno>&ticket=<ticket>` | No requiere fecha. Devuelve detalle completo cuando existe: descripcion, comprador, fechas, items, adjudicacion y metadata contractual. |
| Listado dia actual, todos los estados | `ticket=<ticket>` | Devuelve listado resumido del dia actual. |
| Listado por fecha, todos los estados | `fecha=<ddmmaaaa>&ticket=<ticket>` | `fecha` usa formato `ddmmaaaa`. Devuelve listado resumido. |
| Activas | `estado=activas&ticket=<ticket>` | La documentacion indica que muestra licitaciones publicadas al dia de consulta. En smoke live devuelve miles de registros resumidos. |
| Por fecha y estado | `fecha=<ddmmaaaa>&estado=<estado>&ticket=<ticket>` | Estados documentados: `publicada`, `cerrada`, `desierta`, `adjudicada`, `revocada`, `suspendida`, `todos`. |
| Por proveedor | `fecha=<ddmmaaaa>&CodigoProveedor=<codigo>&ticket=<ticket>` | Requiere codigo interno de proveedor, no RUT. El codigo se obtiene via `BuscarProveedor`. |
| Por organismo publico | `fecha=<ddmmaaaa>&CodigoOrganismo=<codigo>&ticket=<ticket>` | Requiere codigo interno de organismo comprador. El codigo se obtiene via `BuscarComprador`. |

Estados documentados para licitaciones:

| Codigo | Estado |
| --- | --- |
| `5` | Publicada |
| `6` | Cerrada |
| `7` | Desierta |
| `8` | Adjudicada |
| `18` | Revocada |
| `19` | Suspendida |

Smokes 2026-04-26:

- `estado=activas` con ticket de prueba/documentacion respondio `Cantidad=4346`, `Version=v1`, primer item `1000813-8-LE26`.
- La respuesta de listado trae campos resumidos (`CodigoExterno`, `Nombre`, `CodigoEstado`, `FechaCierre`).
- El detalle por `codigo` es el contrato que Greenhouse debe usar para hidratar descripcion, items y adjudicacion.

#### Ordenes De Compra

Base:

```text
https://api.mercadopublico.cl/servicios/v1/publico/ordenesdecompra.json
```

Endpoints/patrones documentados:

| Caso | Query params | Notas |
| --- | --- | --- |
| Detalle por codigo OC | `codigo=<CodigoOC>&ticket=<ticket>` | No requiere fecha. Devuelve detalle completo de la OC cuando existe. |
| Listado dia actual, todos los estados | `estado=todos&ticket=<ticket>` | Devuelve listado resumido del dia actual. |
| Listado por fecha, todos los estados | `fecha=<ddmmaaaa>&ticket=<ticket>` | `fecha` usa formato `ddmmaaaa`. |
| Por fecha y estado | `fecha=<ddmmaaaa>&estado=<estado>&ticket=<ticket>` | Estados textuales documentados abajo. |
| Por organismo publico | `fecha=<ddmmaaaa>&CodigoOrganismo=<codigo>&ticket=<ticket>` | Codigo interno de comprador. |
| Por proveedor | `fecha=<ddmmaaaa>&CodigoProveedor=<codigo>&ticket=<ticket>` | Codigo interno de proveedor. |

Estados documentados para ordenes de compra:

| Codigo respuesta | Parametro `estado` | Estado |
| --- | --- | --- |
| `4` | `enviadaproveedor` | Enviada a proveedor |
| `5` | No documentado como parametro textual en la pagina principal | En proceso |
| `6` | `aceptada` | Aceptada |
| `9` | `cancelada` | Cancelada |
| `12` | `recepcionconforme` | Recepcion conforme |
| `13` | `pendienterecepcion` | Pendiente de recepcionar |
| `14` | `recepcionaceptadacialmente` | Recepcionada parcialmente; la documentacion contiene este typo en el parametro |
| `15` | `recepecionconformeincompleta` | Recepcion conforme incompleta; la documentacion contiene este typo en el parametro |
| n/a | `todos` | Todos los estados anteriores |

Smokes 2026-04-26:

- `estado=todos` respondio `Cantidad=180`, `Version=v1`, primer item `1057417-11423-CM26`.
- La API de OC es clave para cerrar el loop comercial: adjudicaciones, OC emitidas, Compra Agil downstream (`Tipo=AG`) y aprendizaje win/loss.

Nota documental:

- La pagina HTML principal usa `ordenesdecompra.json`.
- Un PDF/diccionario historico menciona `OrdenCompra.json` singular. Para implementacion Greenhouse se debe preferir el contrato observado/documentado en la pagina principal (`ordenesdecompra.json`) y tratar `OrdenCompra.json` como legacy/no canonic hasta validarlo.

#### Empresas / Codigos Internos

Proveedor por RUT:

```text
https://api.mercadopublico.cl/servicios/v1/Publico/Empresas/BuscarProveedor?rutempresaproveedor=<rut-con-puntos-guion-dv>&ticket=<ticket>
```

Compradores/organismos publicos:

```text
https://api.mercadopublico.cl/servicios/v1/Publico/Empresas/BuscarComprador?ticket=<ticket>
```

Notas:

- `BuscarProveedor` requiere RUT con puntos, guion y digito verificador, por ejemplo `70.017.820-k`.
- `BuscarComprador` devuelve el listado de organismos publicos con `CodigoEmpresa` y `NombreEmpresa`.
- Estos endpoints son necesarios porque las busquedas de licitaciones/OC por proveedor u organismo usan codigos internos (`CodigoProveedor`, `CodigoOrganismo`), no RUT ni nombre.

Smokes 2026-04-26:

- `BuscarProveedor` para `70.017.820-k` respondio `CodigoEmpresa=17793`, `NombreEmpresa=Cámara de Comercio de Santiago A.G. (CCS)`.
- `BuscarComprador` respondio `Cantidad=899` organismos.

#### Endpoints No Encontrados En La Documentacion Publica

No se encontro documentacion oficial publica para:

- adjuntos de licitacion por API JSON
- Compra Agil / `COT` como recurso consultable via API ticket
- Consultas al Mercado / `RFI` como recurso consultable via API ticket
- postulacion/oferta transaccional
- subida de anexos de oferta
- aceptacion/rechazo de OC
- webhooks/push events

Implicacion:

- La ingesta inicial robusta debe cubrir `licitaciones`, `ordenesdecompra` y `Empresas`.
- Adjuntos, Compra Agil y RFI requieren carriles separados de investigacion/ingesta.
- La API oficial sirve para **descubrimiento, normalizacion y trazabilidad**, no para ejecutar postulaciones.

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

### Taxonomia De Procedimientos Y Familias De Oportunidad

Hallazgo 2026-04-26: Mercado Publico no debe modelarse solo como "licitaciones". Para Greenhouse conviene distinguir **procedimientos de compra**, **consultas tempranas de mercado** y **ordenes/contrataciones downstream**.

#### Procedimientos De Compra ChileCompra

Segun ChileCompra, la licitacion publica es la regla general, pero existen varios procedimientos y procedimientos especiales:

- Licitacion publica.
- Licitacion privada.
- Trato directo / contratacion excepcional directa con publicidad.
- Compra Agil.
- Compra por cotizacion.
- Convenio Marco.
- Compras Coordinadas.
- Bases Tipo de licitacion.
- Contratos para la Innovacion.
- Dialogo Competitivo de Innovacion.
- Subasta Inversa Electronica.
- Otros procedimientos especiales definidos por Reglamento.

Implicacion:

- El modulo visible puede llamarse `Licitaciones Publicas`, pero el objeto interno deberia ser mas amplio: `public_opportunity` o `public_procurement_opportunity`.
- `public_tenders` puede seguir siendo la primera tabla si el primer corte solo cubre licitaciones, pero el modelo debe dejar espacio para `opportunity_kind`.

#### Codigos De Tipo En La API De Licitaciones

La documentacion API de Mercado Publico lista codigos de tipo de licitacion/compra que deben persistirse como catalogo externo, no como enums improvisados.

Precision importante:

- En payload real, `Tipo` trae el codigo del procedimiento (`LE`, `LP`, `L1`, etc.).
- En payload real, `CodigoTipo` puede venir como codigo numerico de visibilidad/tipo binario de licitacion (`1=Pública`, `2=Privada` segun anexo).
- En el `CodigoExterno`, el sufijo tambien expone informacion del tipo/procedimiento, por ejemplo `1000813-8-LE26`.
- Por lo tanto, Greenhouse debe guardar ambos planos: el codigo de procedimiento (`Tipo`) y el codigo numerico externo (`CodigoTipo`), sin mezclarlos.

Codigos relevantes observados en la documentacion:

| Codigo | Familia | Descripcion |
| --- | --- | --- |
| `L1` | licitacion_publica | Licitacion Publica menor a 100 UTM |
| `LE` | licitacion_publica | Licitacion Publica entre 100 y 1000 UTM |
| `LP` | licitacion_publica | Licitacion Publica mayor a 1000 UTM |
| `LS` | licitacion_publica | Licitacion Publica servicios personales especializados |
| `A1` | licitacion_privada | Licitacion Privada por licitacion publica anterior sin oferentes |
| `B1` | licitacion_privada | Licitacion Privada por remanente de contrato anterior |
| `E1` | licitacion_privada | Licitacion Privada por convenios con personas juridicas extranjeras fuera del territorio nacional |
| `F1` | licitacion_privada | Licitacion Privada por servicios de naturaleza confidencial |
| `J1` | licitacion_privada | Licitacion Privada por otras causales, excluidas de la ley de Compras |
| `CO` | licitacion_privada | Licitacion Privada entre 100 y 1000 UTM |
| `B2` | licitacion_privada | Licitacion Privada mayor a 1000 UTM |
| `E2` | licitacion_privada | Licitacion Privada menor a 100 UTM |
| `A2` | trato_directo | Trato Directo por producto de licitacion privada anterior sin oferentes o desierta |
| `D1` | trato_directo | Trato Directo por proveedor unico |
| `C2` / `F2` / `G2` | trato_directo_cotizacion | Trato Directo / Directo con cotizacion |
| `C1` / `F3` / `G1` | compra_directa | Compra Directa / Orden de Compra |
| `R1` | orden_compra | Orden de Compra menor a 3 UTM |
| `CA` | orden_compra | Orden de Compra sin Resolucion |
| `SE` | orden_compra | Orden de Compra proveniente de adquisicion sin emision automatica de OC |
| `COT` | compra_agil | Cotizacion solicitada por Compra Agil |
| `RFI` / `RF` | consulta_mercado | Consulta al Mercado / Request for Information |

Implicacion:

- Guardar `external_procedure_code` desde `Tipo`, `external_procedure_label`, `external_codigo_tipo` desde `CodigoTipo`, `external_code_suffix` cuando sea parseable y `procedure_family`.
- No derivar familia solo desde prefijo del codigo sin una tabla de mapping versionada.
- El scoring debe ponderar distinto `LP`, `LE`, `L1`, Compra Agil/RFQ-like y RFI.
- `COT` y `RFI/RF` deben tratarse como codigos de oportunidad Mercado Publico aunque no esten disponibles en `licitaciones.json`.

#### Compra Agil / RFQ-Like

Compra Agil es un procedimiento simplificado para compras de menor cuantia. La informacion oficial vigente post reforma indica que permite adquirir bienes y servicios por monto igual o inferior a **100 UTM**, de forma expedita en MercadoPublico.cl, solicitando al menos tres cotizaciones. Hay paginas antiguas de ChileCompra que aun mencionan 30 UTM; para diseño 2026 conviene tratar 100 UTM como criterio vigente y dejar la fuente/regla versionada.

Codigo:

- ChileCompra define `COT` como cotizacion solicitada por Compra Agil.
- Ejemplos publicos siguen formato `2409-196-COT26`.
- Smoke tecnico contra `licitaciones.json?codigo=<COT>` devolvio `{}` para IDs `COT` reales, por lo que Compra Agil probablemente no entra por el endpoint publico de licitaciones validado.
- Las ordenes de compra downstream pueden aparecer con sufijo `AG` y nombre del tipo "Orden de Compra generada por invitacion a compra agil: <codigo COT>", por lo que el puente OC -> COT tambien debe investigarse.

##### Como Encontrar Compras Agiles

Hallazgo 2026-04-26: hay cinco caminos distintos para encontrar o reconstruir Compra Agil, con distintas latencias y niveles de oficialidad.

**1. API Beta Compra Agil anunciada por ChileCompra**

ChileCompra publico el 17 de abril de 2026 que lanzara en mayo una nueva **API de Compra Agil version Beta**, actualmente en certificacion y pruebas tecnicas. La consulta publica previa indica que la nueva version de APIs incorporara oportunidades de negocio de Compra Agil y Licitacion, incluyendo documentos adjuntos.

Implicacion:

- Este debe ser el carril oficial preferido apenas este publicado.
- Greenhouse debe dejar un feature flag / provider adapter `mercado_publico_compra_agil_beta_api`.
- No conviene invertir demasiado en scraping irreversible antes de ver el contrato Beta.
- En backlog: monitorear `api.mercadopublico.cl`, `desarrolladores.mercadopublico.cl/lista-apis` y noticias ChileCompra durante mayo 2026.

**2. Datos Abiertos mensuales `COT_YYYY-MM.zip`**

El sitio oficial de Datos Abiertos contiene una seccion de descargas de Compra Agil. La SPA publica construye links con este patron:

```text
https://transparenciachc.blob.core.windows.net/trnspchc/COT_<YYYY-MM>.zip
```

Ejemplos validados:

- `https://transparenciachc.blob.core.windows.net/trnspchc/COT_2026-03.zip`
- `https://transparenciachc.blob.core.windows.net/trnspchc/COT_2026-02.zip`
- `https://transparenciachc.blob.core.windows.net/trnspchc/COT_2025-12.zip`

Smoke 2026-04-26:

- `COT_2026-03.zip` respondio `200` y pesa aprox. `81 MB` comprimido.
- Contiene dos CSV:
  - `COT1_2026-03.csv`
  - `COT2_2026-03.csv`
- Los dos CSV suman aprox. `4.27M` lineas para marzo 2026, por lo que representan cotizaciones/respuestas, no solo oportunidades unicas.
- Encoding observado: requiere tolerancia a `ISO-8859-1`/Latin-1 o manejo defensivo de caracteres.
- Separador observado: `;`.

Columnas observadas:

```text
NombreOOPP
RazonSocialUnidaddeCompra
NombreUnidaddeCompra
RUTUnidaddeCompra
CodigoUnidaddeCompra
CodigoCotizacion
NombreCotizacion
DescripcionCotizacion
DireccionEntrega
Region
FechaPublicacionParaCotizar
FechaCierreParaCotizar
PlazoEntrega
MontoTotalDisponble
ProductoCotizado
CodigoProducto
NombreProductoGenerico
CantidadSolicitada
Estado
NOMBRECONTACTO
RazonSocialProveedor
RUTProveedor
Tamano
DetalleCotizacion
ProveedorSeleccionado
moneda
MontoTotal
NombreCriterio
CodigoOC
EstadoOC
FechaAceptacionOCProveedor
MotivoCancelacion
ConsideraRequisitosMedioambientales
ConsideraRequisitosImpactoSocialEconomico
```

Ejemplo de fila observada:

- `CodigoCotizacion=1058339-140-COT26`
- `NombreCotizacion=Adquisicion de ramos de flores plasticas...`
- `FechaPublicacionParaCotizar=2026-03-05`
- `FechaCierreParaCotizar=2026-03-06`
- `Estado=Cerrada`

Implicacion:

- Este carril es oficial, descargable y util para historico, scoring, entrenamiento y market intelligence.
- No sirve como unico carril para oportunidades **abiertas en tiempo real**, porque el propio texto de Datos Abiertos indica que mensualmente queda disponible un nuevo link con registros del mes anterior.
- Debe modelarse como ingesta batch mensual, deduplicando por `CodigoCotizacion` y agregando respuestas/ofertas por proveedor.
- La cardinalidad obliga a procesar en streaming/chunks, no cargar completo en memoria.
- El grano de raw debe ser fila de cotizacion/respuesta; el grano conformed debe agrupar por `CodigoCotizacion`.

**3. Ordenes de Compra `AG` como downstream / adjudicacion**

La API publica de ordenes de compra documenta `Tipo=AG` como Compra Agil. Ademas, fichas publicas de OC muestran nombres como:

```text
Orden de Compra generada por invitacion a compra agil: 4703-200-COT24
```

La ficha publica de OC puede incluir seccion "Datos cotizaciones" con RUT de cotizantes y adjuntos, y la API `ordenesdecompra.json` permite consultar OCs por fecha/estado/codigo/proveedor/organismo.

Implicacion:

- Este carril no descubre todas las oportunidades abiertas, pero si permite cerrar loop de adjudicacion/compra.
- Greenhouse debe parsear `CodigoCotizacion` desde `Nombre`/`Descripcion` de OC cuando exista el patron `compra agil: <COT>`.
- `CodigoOC` del CSV de Datos Abiertos y `CodigoLicitacion`/`Tipo=AG` de OC deben reconciliarse contra `public_procurement_opportunities`.
- Es el carril mas util para win/loss, competidores, precios adjudicados y comportamiento historico del comprador.

**4. SPA publica `compra-agil.mercadopublico.cl` / API interna**

La superficie publica `https://compra-agil.mercadopublico.cl/resumen-cotizacion/<COT>` existe para codigos `COT`. La app carga un bundle JS que referencia endpoints internos bajo:

```text
https://servicios-compra-agil.mercadopublico.cl/v1/compra-agil/...
```

Endpoints observados en el bundle:

- `/v1/compra-agil/solicitud/`
- `/v1/compra-agil/solicitud/cotizacion/`
- `/v1/compra-agil/proveedor/cotizacion`
- `/v1/compra-agil/proveedor/cotizacion/adjuntos/`
- `/v1/compra-agil/proveedor/cotizacion/descargarAdjunto/`
- `/v1/compra-agil/orden-compra/crear`
- `/v1/compra-agil/catalogo/*`

Smoke sin sesion:

- Los endpoints responden `401 Unauthorized` con `WWW-Authenticate: Bearer realm="chilecomprarealm"`.

Implicacion:

- Esta API interna no debe tratarse como contrato oficial server-to-server.
- Puede servir para entender el modelo de datos y para un futuro Companion Extension browser-mediated con usuario autenticado.
- No debe ser fuente productiva backend hasta que ChileCompra entregue contrato oficial o autorizacion explicita.

**5. Mirrors/terceros como senal exploratoria**

Sitios terceros indexan Compra Agil por codigo `COT`, por ejemplo `licitacionesdechile.cl/compra-agil/<COT>`, con nombre, descripcion, productos, adjuntos, calendario, institucion y estado. Esto confirma que existen formas practicas de obtener o reconstruir el detalle, pero no establece un contrato oficial para Greenhouse.

Implicacion:

- Sirven como evidencia de factibilidad y para comparar cobertura.
- No deben ser source of truth productivo sin acuerdo/licencia/terminos claros.
- Pueden usarse manualmente en research para validar que un `COT` existe y que tiene adjuntos/productos.

##### Estrategia Recomendada Compra Agil

Fase inmediata:

- Ingerir historico mensual `COT_YYYY-MM.zip` desde Datos Abiertos.
- Construir tabla conformed `public_procurement_opportunities` agregada por `CodigoCotizacion`.
- Crear tabla hija para cotizaciones/respuestas por proveedor.
- Reconciliar contra OC `AG` desde `ordenesdecompra.json`.

Fase mayo 2026:

- Evaluar API Beta Compra Agil apenas ChileCompra la publique.
- Si expone oportunidades abiertas y adjuntos, promoverla a source primaria para near-real-time.
- Mantener Datos Abiertos mensual como backfill/auditoria.

Fase avanzada:

- Companion Extension solo para flujos autenticados y acciones humanas en MercadoPublico.cl.
- Browser-mediated read-only para completar adjuntos o comprobantes cuando la API oficial no cubra el caso.

Equivalencia conceptual:

- Compra Agil se parece mas a un **RFQ** comercial: solicitud rapida de cotizaciones, menor cuantia, decision con velocidad y foco en precio/condiciones.
- No debe tratarse como licitacion grande: el SLA interno y el esfuerzo de bid deben ser livianos.

Implicacion para Greenhouse:

- `opportunity_kind = compra_agil`
- `commercial_motion = rfq_like`
- SLA mucho mas corto.
- Scoring debe favorecer respuesta rapida, bajo esfuerzo y plantillas reutilizables.
- Workbench debe permitir "responder rapido" o "descartar por bajo monto/esfuerzo".

#### Consulta Al Mercado / RFI

ChileCompra usa **Consultas al Mercado (RFI / Request for Information)** como herramienta de participacion temprana para recopilar informacion de mercado, precios, caracteristicas, tiempos de preparacion y otros insumos antes de elaborar bases de licitacion.

Validacion tecnica:

- IDs publicos recientes usan formato como `3233-2-RFI26` o `869591-1-RFI26`.
- Algunos IDs historicos de Consulta al Mercado aparecen como `...-RF23` / `...-RF22`; por lo tanto el parser no debe asumir solo `RFI`.
- Prueba contra `licitaciones.json?codigo=<RFI>` devolvio payload vacio (`{}`), por lo que RFI no parece estar disponible en el endpoint publico de licitaciones validado.
- La superficie web de Consultas al Mercado vive en `consulta-mercado.mercadopublico.cl` y requiere JavaScript.

Equivalencia conceptual:

- RFI no es una oportunidad de venta inmediata.
- Es una oportunidad estrategica de **market shaping**: influir bases futuras, entender demanda temprana, posicionarse con el comprador y detectar licitaciones futuras antes de que existan.

Implicacion para Greenhouse:

- `opportunity_kind = rfi`
- `commercial_motion = market_intelligence`
- Estado interno distinto: `discovered -> review -> respond_information -> monitor_future_tender`
- No debe crear quote por defecto.
- Puede crear account insight, relationship task o watchlist del organismo.
- Document intelligence debe extraer preguntas, ambitos consultados y potencial proceso futuro.

#### RFP

RFP no aparece como etiqueta formal estable en la documentacion publica revisada. En el contexto chileno de Mercado Publico, el equivalente funcional suele ser una licitacion publica/privada con bases tecnicas y economicas donde el proveedor presenta una oferta.

Equivalencia conceptual:

- `L1`, `LE`, `LP`, `LS` y algunas licitaciones privadas son **RFP-like**.
- Hay bases, requisitos, criterios de evaluacion, documentos y oferta tecnica/economica.

Implicacion para Greenhouse:

- `commercial_motion = rfp_like`
- Requiere Bid / No-Bid Room.
- Puede generar deal/quote/SOW.
- Requiere checklist, reviews y evidence pack.

#### RFQ

RFQ tampoco aparece necesariamente como etiqueta formal unica, pero aparece funcionalmente como:

- Compra Agil.
- Compra por cotizacion.
- Trato directo con cotizacion.
- Procesos rapidos donde se solicitan cotizaciones y se formaliza via OC.

Implicacion para Greenhouse:

- `commercial_motion = rfq_like`
- Requiere respuesta rapida, pricing template y bajo overhead.
- Puede vivir en una sub-bandeja distinta de licitaciones complejas.

#### Recomendacion De Modelo Conceptual

No modelar todo como `public_tender`.

Modelo conceptual recomendado:

```text
public_procurement_opportunity
  source_system = mercado_publico
  source_surface = licitaciones_api | consulta_mercado | compra_agil | ordenes_compra | datos_abiertos
  external_code
  opportunity_kind = licitacion_publica | licitacion_privada | compra_agil | rfi | trato_directo | convenio_marco | compra_coordinada | innovacion | subasta_inversa | orden_compra
  commercial_motion = rfi | rfq_like | rfp_like | direct_award | framework | post_award
  procedure_family
  external_procedure_code
  external_codigo_tipo
  external_code_suffix
  external_status
```

Para el primer corte se puede implementar solo `licitaciones_api`, pero el contrato debe admitir todas las familias:

- RFI como source separada.
- Compra Agil/COT/RFQ-like como flujo liviano.
- Licitaciones/RFP-like como flujo bid desk.
- Ordenes de compra como downstream/post-award.

Conclusion: Greenhouse deberia poder abordar todas las familias, pero no todas vendran por la misma API ni tendran el mismo workflow.

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

## Oportunidad Producto / Operativa

La oportunidad no es "tener una lista de licitaciones". La oportunidad es que Greenhouse convierta una fuente publica de demanda en un flujo comercial accionable, con memoria, ownership y trazabilidad.

### Nivel 1 — Radar Comercial Automatico

Objetivo: detectar senales relevantes sin que un Account Manager revise MercadoPublico.cl todos los dias.

Capacidades:

- Ingestion diaria de licitaciones activas.
- Scoring por fit con servicios Efeonce.
- Clasificacion por business line sugerida.
- Priorizacion por fecha de cierre, monto, organismo comprador y fit.
- Deteccion de oportunidades nuevas o cambios relevantes.
- Bandeja interna de "oportunidades detectadas".

Valor:

- Reduce trabajo manual.
- Evita perder oportunidades por no verlas a tiempo.
- Crea historico para aprender que keywords, rubros y organismos realmente convierten.

### Nivel 2 — Intake Productivo De Licitaciones

Objetivo: pasar de POC/CSV a un intake confiable que alimente el dominio Commercial.

Capacidades:

- Persistencia en `greenhouse_commercial.public_tenders*`.
- Raw payload + modelo normalizado.
- Documentos/adjuntos en assets privados.
- Dedupe por codigo externo y hash de archivo.
- Observabilidad via `source_sync_runs` y `source_sync_watermarks`.
- Freshness, reintentos, DLQ y parser fixtures.

Valor:

- Crea el sistema de registro interno para licitaciones publicas.
- Permite operar sobre datos confiables, no sobre un script exploratorio.
- Deja listo el puente hacia documentos, quotes, deals y decisiones.

### Nivel 3 — Bid / No-Bid Room

Objetivo: convertir una licitacion interesante en una decision comercial gobernada.

Capacidades:

- Vista de detalle con resumen ejecutivo, comprador, fechas, items y documentos.
- Checklist de requisitos administrativos, tecnicos y economicos.
- Registro de riesgos, dudas, owner y responsables.
- Solicitud de revision a Delivery, Finance, Legal o liderazgo.
- Decision `bid` / `no_bid` con razon, evidencia y auditoria.
- Alertas por cierre cercano, preguntas pendientes, nuevos adjuntos o falta de owner.

Valor:

- Evita que la bandeja sea pasiva.
- Ordena el trabajo real de postular.
- Captura conocimiento comercial reutilizable.
- Reduce riesgo de postular sin capacidad, margen o documentacion suficiente.

### Nivel 4 — Sinergia Con El Ecosistema Greenhouse

Objetivo: que una licitacion no viva aislada, sino que active el ciclo comercial completo.

Conexiones recomendadas:

- **Commercial / Deals:** crear oportunidad/deal desde licitacion seleccionada.
- **Quotes / Pricing Governance:** generar quote draft o pricing simulation con procurement channel `licitacion_publica`.
- **Product Catalog / Services:** mapear items y scope contra servicios vendibles.
- **Delivery / Capacity:** pedir revision de factibilidad, capacidad y fechas.
- **Finance:** preparar lectura de monto, moneda, OC/HES/facturacion si se adjudica.
- **Documents / Assets:** guardar bases, anexos, oferta final y comprobantes.
- **Teams Notifications:** avisar a owner comercial, bid desk o reviewers.
- **Nexa / AI:** resumir bases, extraer requisitos y sugerir riesgos, siempre como apoyo no autoritativo.
- **Reliability / Ops Health:** monitorear freshness de API, fallas de adjuntos y cuota.

Valor:

- Convierte licitaciones en pipeline comercial medible.
- Une preventa, propuesta, delivery readiness y finance sin reingresar informacion.
- Permite medir conversion: detectada -> evaluada -> ofertada -> adjudicada -> revenue.

### Nivel 5 — Companion Extension Browser-Mediated

Objetivo: cubrir el gap competitivo de postulacion asistida cuando no existe API publica transaccional.

Enfoque recomendado:

- Greenhouse prepara paquete, checklist, documentos y payload sugerido.
- El usuario entra a MercadoPublico.cl con su sesion real.
- Una extension Chrome ayuda a abrir la ficha correcta, prellenar campos, adjuntar documentos y capturar evidencia.
- El envio final queda detras de confirmacion humana explicita.

Condiciones:

- No almacenar credenciales de Mercado Publico.
- No simular postulacion si Mercado Publico no entrega comprobante.
- No ejecutar acciones irreversibles en background.
- Kill switch por tenant/usuario/version.
- Registro auditable del intento, usuario, timestamp, archivos preparados y resultado.

Valor:

- Acerca Greenhouse a una experiencia end-to-end sin inventar una API inexistente.
- Mantiene al humano en control para acciones juridicamente sensibles.
- Puede diferenciar el producto frente a plataformas que solo monitorean licitaciones.

### Camino Recomendado

El siguiente corte deberia ser **Commercial Public Tenders Intake V1**, no una UI completa ni la extension.

Secuencia propuesta:

1. Intake productivo: tablas, ingestion, documentos, observabilidad y scoring basico.
2. Workbench simple: lista + detalle + decision inicial.
3. Bid / No-Bid Room: checklist, reviews y alerts.
4. Quote/deal bridge: convertir una licitacion aprobada en oportunidad operable.
5. Companion extension: solo cuando el flujo interno y la evidencia ya esten maduros.

## Tesis De Producto

### Hipotesis Central

Greenhouse puede convertirse en el sistema operativo comercial para vender al Estado: no reemplazando MercadoPublico.cl, sino agregando inteligencia, coordinacion, evidencia y continuidad operacional sobre lo que hoy es una fuente publica ruidosa.

La ventaja no esta en "scrapear mas licitaciones". La ventaja esta en conectar:

- senal publica de demanda
- fit con capacidades reales de Efeonce
- documentos y requisitos
- decision bid/no-bid
- pricing y propuesta
- capacidad de delivery
- evidencia de postulacion
- aprendizaje historico

Cuando esas piezas viven juntas, cada licitacion deja de ser una ficha externa y se transforma en un objeto comercial con memoria.

### Problema De Fondo

El trabajo actual de licitaciones publicas suele fallar por tres razones:

1. **Descubrimiento tardio:** las oportunidades se ven cuando ya queda poco plazo o cuando alguien las encontro manualmente.
2. **Evaluacion incompleta:** se decide participar sin entender requisitos, riesgos, capacidad, margen o documentos.
3. **Perdida de continuidad:** aun cuando se postula, la informacion queda dispersa entre MercadoPublico.cl, archivos locales, correos, chats y cotizaciones.

El modulo debe atacar esos tres puntos. Si solo lista oportunidades, sera otro dashboard pasivo.

### Resultado Deseado

El estado ideal es que una persona de Commercial pueda abrir Greenhouse y responder en minutos:

- Que licitaciones nuevas tienen fit real con Efeonce?
- Cuales requieren decision hoy?
- Que documentos debo revisar?
- Que riesgos bloquean participar?
- Quien es owner y que falta?
- Si decidimos participar, que quote/deal/documentos se generan?
- Si postulamos, donde esta la evidencia?
- Si ganamos o perdemos, que aprendimos?

### Anti-Metas

El modulo no debe transformarse en:

- un clon visual de MercadoPublico.cl
- una bandeja infinita de oportunidades sin owner
- un crawler fragil sin evidencia ni observabilidad
- un motor que recomienda postular sin justificar riesgos
- un sistema que "envia ofertas" sin contrato oficial o confirmacion humana
- una feature aislada de Finance, Delivery, Documents y Commercial
- una superficie de AI que inventa requisitos o reemplaza lectura humana de bases

## Principios De Diseno

### 1. Human-In-Control

Greenhouse puede priorizar, resumir, sugerir y preparar. Las decisiones juridicamente sensibles quedan en manos humanas:

- bid/no-bid
- aprobacion interna
- envio de oferta
- aceptacion de riesgos
- validacion de documentos finales

### 2. Evidence-First

Toda decision relevante debe poder explicarse con evidencia:

- payload API
- documento fuente
- version de adjunto
- requisito extraido
- usuario que decidio
- timestamp
- razon declarada
- link a objeto downstream

El modulo debe estar preparado para auditoria, no solo para eficiencia.

### 3. Commercial Before Finance

La licitacion nace como oportunidad comercial. Finance participa cuando hay precio, quote, contrato, OC, HES o revenue. Diseñar el modulo desde Finance haria que se pierdan las etapas de descubrimiento, evaluacion y estrategia.

### 4. Fit Before Volume

El objetivo no es traer 4.000 oportunidades al dia. Es traer pocas oportunidades accionables, con suficiente contexto para decidir.

### 5. Read-Only API, Operacion Coordinada

Hasta tener contrato transaccional oficial, Mercado Publico API se trata como fuente read-only. Greenhouse coordina el trabajo, prepara paquetes y registra evidencia; MercadoPublico.cl sigue siendo el sistema donde ocurre la postulacion formal.

### 6. Productizar Solo Despues De Medir Ruido

Antes de invertir en UX compleja o extension, hay que medir:

- precision del matcher
- rubros utiles
- falsos positivos recurrentes
- volumen diario accionable
- tiempo promedio hasta decision
- capacidad real del equipo para operar el flujo

## Lifecycle Operativo De Una Licitacion

El modulo debe modelar una licitacion como un objeto vivo. La licitacion cambia en la fuente externa, pero tambien cambia internamente segun decisiones Greenhouse.

### 1. Discovered

La licitacion aparece por primera vez en ingestion.

Sistema:

- guarda raw payload
- normaliza campos principales
- calcula fingerprint
- clasifica fit preliminar
- crea evento `commercial.public_tender.discovered`

Preguntas:

- Es nueva o ya vista?
- Tiene fecha de cierre valida?
- Tiene comprador identificable?
- Tiene adjuntos disponibles?

### 2. Screened

La licitacion se evalua automaticamente con reglas iniciales.

Sistema:

- calcula score
- asigna business line sugerida
- marca señales positivas y negativas
- detecta exclusiones
- decide si entra a bandeja humana o queda archivada por bajo fit

Preguntas:

- Que servicios matchea?
- Que campos explican el match?
- Hay exclusiones duras?
- El plazo permite actuar?

### 3. Triage

Una persona revisa si vale la pena mirar con mas detalle.

Acciones:

- marcar como `watching`
- asignar owner
- descartar con razon
- pedir lectura de documentos
- pedir revision de delivery

Decision gate:

- `ignore`
- `watch`
- `evaluate`

### 4. Evaluate

La oportunidad entra en revision bid/no-bid.

Sistema:

- muestra requisitos detectados
- organiza documentos
- registra dudas
- permite review por area
- calcula riesgo preliminar

Decision gate:

- `no_bid`
- `bid_planning`
- `needs_more_info`

### 5. Plan Bid

Se decide participar y se prepara el paquete.

Sistema:

- crea deal/oportunidad si aplica
- inicia quote draft
- conecta documentos
- asigna responsables
- arma checklist
- genera tareas o recordatorios

Decision gate:

- `ready_for_internal_approval`
- `blocked`
- `withdraw`

### 6. Submit Externally

El envio formal ocurre fuera de Greenhouse, en MercadoPublico.cl, salvo contrato oficial futuro.

Sistema:

- guarda paquete final
- registra evidencia de envio
- marca usuario responsable
- guarda monto ofertado
- captura comprobante

Decision gate:

- `submitted`
- `submission_failed`
- `not_submitted`

### 7. Reconcile Outcome

Greenhouse monitorea resultado posterior.

Sistema:

- consulta estado/adjudicacion
- vincula OC si aparece
- marca lost/awarded/cancelled
- alimenta metricas y aprendizaje

Decision gate:

- `awarded`
- `lost`
- `cancelled`
- `archived`

## Scoring Y Clasificacion

El scoring debe ser explicable. Para V1 conviene evitar un score opaco y combinar reglas deterministicas con señales auditables.

### Componentes Del Score

| Componente | Pregunta | Ejemplos |
| --- | --- | --- |
| Fit de servicio | La licitacion parece pedir algo que Efeonce vende? | audiovisual, web, CRM, campanas, analytics |
| Fit de business line | Hay una BU naturalmente responsable? | Globe, Wave, Reach, CRM Solutions |
| Calidad del match | El match aparece en nombre, descripcion, items o documentos? | nombre pesa menos que bases tecnicas |
| Plazo | Hay tiempo real para preparar oferta? | cierre en 3 dias vs 18 dias |
| Monto estimado | Justifica el esfuerzo comercial? | umbral por BU |
| Comprador | Hay historial, relacion o rubro atractivo? | organismo recurrente, municipio, ministerio |
| Complejidad documental | Hay muchos anexos o requisitos pesados? | garantias, certificaciones, boletas |
| Riesgo de fit | Parece commodity, obra civil, hardware o scope fuera de agencia? | exclusiones |
| Capacidad interna | Hay equipo y ventanas disponibles? | Delivery/capacity |
| Estrategia | Abre cuenta, caso publico o relacion futura? | first logo, sector prioritario |

### Score Explicable

Cada score debe guardar:

- valor numerico
- version de scoring
- señales positivas
- señales negativas
- campos/documentos que sustentan la decision
- fecha de calculo

Ejemplo conceptual:

```text
fit_score = 78
positive_signals:
  - service_match: produccion_audiovisual from items
  - closing_window: 16 days
  - buyer_sector: cultura
negative_signals:
  - documentation_complexity: medium
  - no_prior_buyer_relationship
```

### Decision Bands

Bandas sugeridas:

- `80-100`: revisar hoy, alta prioridad
- `60-79`: candidata, requiere triage
- `40-59`: monitorear o revisar si hay capacidad
- `<40`: archivar salvo keyword/rubro estrategico

Estas bandas deben calibrarse con evidencia real, no declararse definitivas.

## Document Intelligence

Los documentos son la diferencia entre "hay una licitacion" y "podemos decidir".

### Tipos De Documento

Clasificacion objetivo:

- bases administrativas
- bases tecnicas
- anexo economico
- formulario de oferta
- declaracion jurada
- garantia / boleta
- preguntas y respuestas
- aclaracion
- modificacion
- contrato / convenio
- pauta de evaluacion
- otro

### Extracciones Utiles

AI o parsers pueden extraer:

- fecha de cierre
- fecha limite de preguntas
- fecha de visita tecnica
- criterios de evaluacion
- ponderaciones
- requisitos administrativos
- requisitos tecnicos
- experiencia exigida
- formatos obligatorios
- garantias
- multas
- plazos de ejecucion
- presupuesto referencial
- causales de inadmisibilidad

### Reglas Para AI

AI no debe declarar requisitos sin cita o evidencia.

Cada extraccion AI debe guardar:

- documento fuente
- pagina o fragmento
- texto citado breve
- confidence
- modelo/version
- timestamp
- revision humana si aplica

Estados recomendados para extracciones:

- `suggested`
- `accepted`
- `rejected`
- `superseded`

### Output Ideal De Resumen Ejecutivo

Un resumen util deberia responder:

- Que compra el organismo?
- Que debemos entregar?
- Cual es el plazo de ejecucion?
- Cuales son los requisitos bloqueantes?
- Que documentos hay que adjuntar?
- Como evalua el comprador?
- Cuales son los riesgos?
- Cual es la siguiente accion?

## Operating Model

### Roles

| Rol | Responsabilidad |
| --- | --- |
| Commercial Owner | decide triage, asigna estrategia, convierte a deal |
| Bid Coordinator | controla checklist, documentos, plazos y evidencia |
| Solution Owner / Delivery | valida factibilidad tecnica, capacidad y scope |
| Finance / Pricing | valida margen, moneda, impuestos, condiciones de pago |
| Legal / Admin | revisa requisitos legales, garantias y declaraciones |
| Executive Approver | aprueba participacion en oportunidades estrategicas o riesgosas |
| Agent / AI Assistant | resume, extrae, alerta y sugiere, sin decidir por humanos |

### SLAs Internos Sugeridos

- Nueva oportunidad alta prioridad: owner asignado en menos de 1 dia habil.
- Licitacion con cierre menor a 7 dias: decision bid/no-bid en menos de 4 horas habiles.
- Licitacion con cierre 7-15 dias: decision bid/no-bid en menos de 1 dia habil.
- Paquete de documentos: checklist completo antes de 48 horas del cierre.
- Oferta final: aprobada internamente antes de 24 horas del cierre.

### Politicas De Decision

Se deberia exigir razon obligatoria para:

- descartar oportunidad con score alto
- participar con score bajo
- participar con plazo menor a umbral
- participar sin revision Delivery
- participar sin validacion de pricing/margen
- marcar como submitted sin evidencia

## Ecosystem Synergy Map

### Commercial

Consume y produce:

- crea oportunidades/deals
- crea quote drafts
- alimenta pipeline publico
- registra decision bid/no-bid
- conecta con product catalog y pricing

### Finance

Consume cuando existe:

- quote
- oferta economica
- adjudicacion
- OC
- HES
- facturacion

Finance no debe ser owner de discovery, pero si debe tener lectura para oportunidades adjudicadas o con quote activa.

### Delivery

Consume:

- requisitos tecnicos
- plazos de ejecucion
- compromisos de SLA
- estimacion de roles/capacidad

Produce:

- factibilidad
- riesgos
- supuestos de entrega
- restricciones de capacidad

### Documents / Assets

Responsable de:

- almacenar adjuntos
- versionar documentos
- deduplicar por hash
- retener evidencias
- habilitar extraccion de texto

### Notifications / Teams

Eventos candidatos:

- nueva licitacion alta prioridad
- cierre cercano sin decision
- nuevo adjunto detectado
- owner asignado
- review solicitada
- decision bid/no-bid tomada
- paquete listo para aprobacion
- evidencia de postulacion cargada
- adjudicacion detectada

### Reliability / Platform Health

Señales candidatas:

- API Mercado Publico freshness
- consumo de cuota diaria
- tasa de 429/5xx
- parser de adjuntos roto
- descargas fallidas
- documento sin hash
- licitaciones sin detalle
- backlog de jobs de documentos

## Moat / Diferenciacion

La diferenciacion defensible de Greenhouse no esta en consultar una API publica. Otros pueden hacerlo.

El moat aparece al combinar:

- conocimiento del catalogo real de servicios
- pricing governance
- historial de clientes/organismos
- capacidad delivery
- documentos y evidence packs
- decision governance
- aprendizaje de conversion
- integration con quote/deal/contract
- companion extension con control humano

En terminos de producto, Greenhouse podria pasar de "monitor de licitaciones" a **sistema de decision y ejecucion comercial para ventas publicas**.

## KPIs Y Metricas De Aprendizaje

### Funnel

- licitaciones ingeridas
- licitaciones candidatas
- licitaciones revisadas
- decisiones bid
- decisiones no-bid
- ofertas presentadas
- adjudicaciones
- revenue adjudicado

### Calidad Del Matcher

- precision manual en muestra
- falsos positivos por servicio
- falsos negativos descubiertos manualmente
- matches por campo (`nombre`, `descripcion`, `items`, `documentos`)
- keywords agregadas/removidas por semana

### Operacion

- tiempo de deteccion a owner asignado
- tiempo de owner asignado a decision
- oportunidades vencidas sin decision
- oportunidades bid sin evidencia final
- documentos descargados por licitacion
- fallas de parser/descarga

### Negocio

- win rate de licitaciones postuladas
- valor adjudicado
- margen estimado vs real
- revenue publico por business line
- organismos con mayor conversion
- razones frecuentes de no-bid

## Roadmap De Madurez

### M0 — Research / POC

Estado actual:

- ticket validado
- helper de detalle/adjuntos validado
- POC de matcher en CSV
- research de dominio creado

Objetivo:

- entender ruido, shape de API y viabilidad de adjuntos.

### M1 — Intake Productivo

Objetivo:

- tener ingestion persistente, confiable y observable.

Entregables:

- DDL `greenhouse_commercial.public_tenders*`
- ingestion diaria o multiple veces al dia
- document discovery/download background
- assets privados
- source_sync observability
- scoring basico versionado

### M2 — Commercial Workbench

Objetivo:

- permitir triage humano y ownership.

Entregables:

- lista operacional
- detail view
- estados internos
- assign owner
- no-bid reasons
- watch/evaluate workflow

### M3 — Bid Desk

Objetivo:

- coordinar decision, requisitos y paquete.

Entregables:

- document intelligence
- checklist
- reviews
- deadlines
- notifications
- evidence pack

### M4 — Quote / Deal Bridge

Objetivo:

- convertir licitaciones aprobadas en pipeline comercial operativo.

Entregables:

- deal link/create
- quote draft
- pricing simulation
- delivery capacity review
- contract/SOW evidence linkage

### M5 — Submission Companion

Objetivo:

- asistir postulacion en MercadoPublico.cl sin credenciales server-side ni acciones silenciosas.

Entregables:

- extension browser-mediated
- confirmaciones humanas
- prefill/attachment assist
- comprobante capture
- audit trail
- kill switch

## Decision Gates Para Antes De Implementar Intake V1

Antes de abrir la task productiva, conviene cerrar:

1. **Owner operativo:** quien revisa la bandeja diariamente.
2. **Business lines iniciales:** que servicios/rubros entran en el primer scoring.
3. **Umbral de accion:** que score/plazo/monto crea oportunidad humana.
4. **Storage:** bucket privado y retention de adjuntos.
5. **Cadencia:** una corrida diaria vs varias durante horario habil.
6. **Politica de documentos:** que tipos se descargan automaticamente.
7. **Estados V1:** si el primer corte llega hasta `evaluating` o tambien `bid_planning`.
8. **Access:** quienes pueden descargar documentos, decidir no-bid y linkear deals.
9. **Notification policy:** que eventos merecen Teams y cuales quedan solo en UI.
10. **AI policy:** si AI entra en V1 o espera a tener documentos persistidos y evidence model.
11. **Taxonomia inicial:** si Intake V1 cubre solo licitaciones API o tambien RFI/Compra Agil.
12. **Naming del agregado:** si la tabla base nace como `public_tenders` o como `public_procurement_opportunities`.

## Modelo De Datos Candidato

Este research no define DDL final. Propone el agregado para futura arquitectura.

### Opcion Recomendada — `greenhouse_commercial.public_procurement_opportunities`

Grano: una oportunidad publica externa por codigo/fuente Mercado Publico, incluyendo licitaciones, Compra Agil/RFQ-like, RFI/Consultas al Mercado y otros procedimientos.

Campos candidatos:

- `public_procurement_opportunity_id`
- `source_system = 'mercado_publico'`
- `source_surface`
- `external_code`
- `opportunity_kind`
- `commercial_motion`
- `procedure_family`
- `external_procedure_code`
- `external_procedure_label`
- `external_codigo_tipo`
- `external_code_suffix`
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

### Opcion Narrow V1 — `greenhouse_commercial.public_tenders`

Grano: una licitacion externa por codigo Mercado Publico.

Esta opcion es aceptable solo si Intake V1 cubre estrictamente `licitaciones.json`. Si se elige, debe dejar clara una migracion futura hacia `public_procurement_opportunities` o usar una vista/alias que no bloquee RFI/Compra Agil.

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

Grano: un documento/adjunto versionado. Si se adopta el agregado amplio, renombrar a `public_procurement_documents`.

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

Grano: decision interna por oportunidad. Para RFI puede ser `respond/no_respond`; para RFQ-like puede ser `quote/no_quote`; para RFP-like puede ser `bid/no_bid`. Si se adopta el agregado amplio, renombrar a `public_procurement_decisions`.

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

Grano: vinculo entre oportunidad publica y objetos comerciales. Si se adopta el agregado amplio, renombrar a `public_procurement_links`.

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
Mercado Publico API / source surface
  -> opportunity search / detail
  -> normalize
  -> upsert public_procurement_opportunities
  -> enqueue document discovery when applicable

MercadoPublico.cl ficha publica
  -> discover VerAntecedentes pages
  -> parse attachment rows
  -> download changed documents
  -> write private asset
  -> upsert public_procurement_documents
  -> emit commercial.public_procurement.documents_changed
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
- La bandeja puede incentivar postular a oportunidades que no calzan por ansiedad comercial.
- Si la AI resume sin evidencia, puede ocultar requisitos bloqueantes.
- Si el modulo no conecta con quote/deal/delivery, se vuelve una herramienta paralela y no sistema operativo.
- Si no se mide false positive/false negative, el equipo perdera confianza en el radar.
- Si se automatiza postulacion demasiado temprano, se introduce riesgo juridico y reputacional.

### Riesgos Legales / Compliance

- Una oferta publica puede tener consecuencias contractuales; Greenhouse debe distinguir preparacion interna de postulacion formal.
- El modulo debe conservar evidencia de quien decidio, que documentos se usaron y que version estaba vigente.
- Aunque las bases sean publicas, las notas internas, evaluaciones, pricing y estrategia son informacion sensible.
- Una extension browser-mediated podria ser percibida como automatizacion de una plataforma externa; requiere evaluacion legal y terminos de uso antes de operar.
- No se deben almacenar credenciales de Mercado Publico ni tokens de sesion del navegador.

### Riesgos De Operacion

- Si no hay owner diario, las oportunidades vencen sin decision.
- Si Teams notifica todo, se vuelve ruido; si notifica poco, se pierden plazos.
- Si las descargas de documentos fallan silenciosamente, las decisiones pueden tomarse con informacion incompleta.
- Si no hay rollback/kill switch de parser, un cambio HTML de MercadoPublico.cl puede romper el modulo.
- Si las oportunidades no se archivan con razones, no se aprende nada del no-bid.

### Preguntas Abiertas

- Que categorias/rubros de Mercado Publico son realmente relevantes para Efeonce?
- Cual es el umbral minimo de monto o fit para crear oportunidad?
- Quien es owner natural: Comercial, Bid Desk, Account Owner o Delivery Lead?
- Se requiere aprobacion ejecutiva para participar?
- Que documentos deben almacenarse como evidencia legal de oferta?
- La extraccion AI de requisitos puede operar sobre todos los adjuntos o solo sobre tipos permitidos?
- Como se representaran preguntas/respuestas y aclaraciones si aparecen como documentos posteriores?
- Se debe monitorear solo licitaciones activas o tambien historicas/adjudicadas para aprender win/loss?
- Que relacion tendra el modulo con organismos publicos que ya existen como organizations en Greenhouse?
- Como se modela una UTP/consorcio si una postulacion requiere socios?
- Que umbrales de monto hacen viable invertir tiempo comercial?
- Que oportunidades requieren aprobacion ejecutiva?
- Que senales de capacidad delivery deben bloquear o advertir antes del bid?
- Como se manejan documentos con formatos dificiles (Excel protegido, scans, ZIP, PDFs pesados)?
- Que pasa si Mercado Publico cambia fecha de cierre despues de que Greenhouse ya envio alertas?

## Madurez Requerida Antes De Implementar

Esta seccion convierte el research en criterios de arquitectura y producto para que las tasks siguientes no nazcan como "hacer un crawler", sino como un modulo Commercial sostenible.

### Source Strategy V1

Greenhouse debe tratar Mercado Publico como un ecosistema multi-fuente. No todas las oportunidades tienen la misma fuente, frescura, granularidad ni riesgo.

| Familia | Fuente primaria candidata | Frescura esperada | Grano externo | Estado |
| --- | --- | --- | --- | --- |
| Licitaciones publicas/privadas | `licitaciones.json` + detalle por `codigo` | Near-real-time / diaria | `CodigoExterno` | Validada |
| Adjuntos de licitacion | Ficha publica WebForms `DetailsAcquisition.aspx` | Diaria / on-demand | attachment row + file hash | Validada como tecnica, no contrato oficial JSON |
| Ordenes de compra | `ordenesdecompra.json` | Diaria | `CodigoOC` | Validada |
| Compra Agil historica | Datos Abiertos `COT_YYYY-MM.zip` | Mensual, mes anterior | fila CSV de cotizacion/respuesta | Validada |
| Compra Agil near-real-time | API Beta anunciada por ChileCompra | Por confirmar | `CodigoCotizacion` esperado | Pendiente mayo 2026 |
| Compra Agil adjudicada | OC `Tipo=AG` + `CodigoOC` / nombre con COT | Diaria | `CodigoOC` + `CodigoCotizacion` parseado | Validada parcialmente |
| Consulta al Mercado / RFI | `consulta-mercado.mercadopublico.cl` / API futura | Por investigar | `CodigoRFI/RF` | Pendiente |
| Datos agregados / analitica | Datos Abiertos `mserv-datos-abiertos` y OCDS | Historica/agregada | mes/region/rubro/proveedor | Complementaria |

Decision recomendada:

- Source primaria V1 para licitaciones: API oficial `licitaciones.json`.
- Source primaria V1 para Compra Agil historica: `COT_YYYY-MM.zip`.
- Source primaria V1 para cierre/adjudicacion: `ordenesdecompra.json`.
- Source experimental: API Beta Compra Agil cuando se publique.
- Source no productiva sin aprobacion: API interna de SPA `servicios-compra-agil`.

### Freshness / SLA Matrix

La UX y las alertas deben declarar la frescura de cada familia. No se debe mostrar Compra Agil historica mensual como si fuera radar en vivo.

| Tipo | Freshness target | Uso principal | Alerta |
| --- | --- | --- | --- |
| Licitacion activa | 1-4 horas o diaria, segun cuota | Radar comercial y bid/no-bid | Si fit alto y cierre cercano |
| Licitacion detalle/documentos | On-demand + refresh diario si activa | Decision/evidencia | Si documentos cambian |
| OC | Diario | Win/loss, adjudicacion, reconciliacion | Si una oportunidad interna fue adjudicada o tuvo OC |
| Compra Agil CSV mensual | Mensual | Inteligencia historica, scoring, benchmark | No alertar como oportunidad abierta |
| Compra Agil Beta API | TBD | Radar RFQ-like | Solo cuando contrato/frescura este confirmado |
| RFI | TBD | Market shaping / relacion | Alerta separada de bid, no quote por defecto |

Regla de producto:

- Cada oportunidad debe mostrar `source_surface`, `source_freshness_at`, `last_seen_at`, `last_successful_sync_at` y `freshness_status`.
- Las alertas deben incluir si la fuente es live, batch o experimental.

### Data Model Grain V1

El error a evitar es guardar todo como una fila plana de "licitacion". Compra Agil y OC exigen varios granos.

Granos recomendados:

1. `public_procurement_opportunities`
   - Una oportunidad externa consolidada por codigo/fuente.
   - Ejemplos: `1000813-8-LE26`, `1058339-140-COT26`, `3233-2-RFI26`.
2. `public_procurement_items`
   - Lineas/productos/servicios requeridos.
   - En licitaciones viene desde `Items.Listado`.
   - En Compra Agil viene desde `ProductoCotizado`, `CodigoProducto`, `NombreProductoGenerico`, `CantidadSolicitada`.
3. `public_procurement_documents`
   - Metadata de adjuntos, checksums, storage URI, fuente y estado de descarga.
4. `public_procurement_supplier_quotes`
   - Respuestas/cotizaciones por proveedor, especialmente para Compra Agil.
   - Grano minimo: `CodigoCotizacion + RUTProveedor + CodigoProducto + DetalleCotizacion`.
5. `public_procurement_awards`
   - Resultado/adjudicacion cuando exista.
   - Puede venir de licitaciones detail, OC o CSV COT.
6. `public_procurement_purchase_orders`
   - Ordenes de compra reconciliadas, especialmente `Tipo=AG`.
7. `public_procurement_decisions`
   - Decision Greenhouse: watch, evaluate, no-bid, bid, submitted externally, awarded, lost.
8. `public_procurement_match_explanations`
   - Por que matcheo: keywords, rubros, items, comprador, monto, negativas.

Regla de raw/conformed:

- Raw debe guardar payload original o archivo/fila referenciable con `source_checksum`.
- Conformed debe deduplicar por oportunidad e item.
- Nunca perder el identificador externo original.

### Matching / Scoring V1

El matching debe mezclar nombre, descripcion e items. Para Compra Agil, el campo fuerte puede ser `ProductoCotizado`; para licitaciones, el campo fuerte puede estar en `Items.Listado.Descripcion`, no solo en `Nombre`.

Senales recomendadas:

- `title_match`: `Nombre` / `NombreCotizacion`.
- `description_match`: `Descripcion` / `DescripcionCotizacion`.
- `item_match`: items/productos/servicios.
- `buyer_match`: organismo, unidad, region, historial.
- `procedure_match`: `LE`, `LP`, `L1`, `COT`, `RFI`, etc.
- `amount_fit`: monto disponible/estimado y umbral comercial.
- `deadline_fit`: dias hasta cierre y SLA operativo.
- `delivery_fit`: plazo de entrega, region, capacidad delivery.
- `negative_keywords`: exclusiones como aseo, guardias, insumos irrelevantes.
- `strategic_signals`: organismo target, relacion previa, oportunidad de market shaping.

Decision bands:

- `high_fit`: crear review y alerta.
- `medium_fit`: mostrar en radar, sin alerta agresiva.
- `low_fit`: guardar para aprendizaje, no molestar.
- `blocked`: descartar por regla dura, con reason.

Explicabilidad minima:

- Toda oportunidad candidata debe mostrar "por que aparece" y "por que no fue high fit".
- El scoring debe versionarse: `scoring_model_version`.

### Document Intelligence V1

No todo documento debe procesarse igual. El objetivo V1 es evidencia y checklist, no resumen creativo.

Pipeline recomendado:

1. Clasificar documento: bases, formulario oferta, anexo economico, anexo tecnico, aclaracion, acta, otro.
2. Extraer texto si el tipo lo permite.
3. Detectar requisitos duros:
   - experiencia
   - certificaciones
   - garantias
   - visita obligatoria
   - fechas
   - formatos obligatorios
   - criterios de evaluacion
4. Generar checklist con evidencia: cada item debe apuntar a archivo/pagina/seccion cuando sea posible.
5. Marcar incertidumbre si OCR o parser falla.

Guardrails:

- No usar AI para decidir bid/no-bid sin evidencia.
- No ocultar documentos no procesados.
- Si hay documentos pendientes o fallidos, la UI debe advertir `decision_may_be_incomplete`.

### Operating Model V1

El modulo necesita personas, no solo datos.

Roles operativos:

- `Commercial Owner`: decide si se evalua y asigna.
- `Bid Owner`: prepara respuesta/documentos.
- `Delivery Reviewer`: confirma capacidad/plazo.
- `Finance/Pricing Reviewer`: valida pricing o restricciones economicas.
- `Executive Approver`: requerido para montos/riesgos altos.

Lifecycle interno recomendado:

```text
discovered
  -> matched
  -> triage_pending
  -> evaluating
  -> no_bid
  -> bid_approved
  -> prepared
  -> submitted_externally
  -> awarded
  -> lost
  -> archived
```

Estados especiales:

- `awaiting_documents`
- `documents_failed`
- `deadline_expired`
- `source_stale`
- `external_status_changed`
- `needs_human_review`

Decision governance:

- Todo `no_bid` debe tener reason versionada.
- Todo `bid_approved` debe registrar decision maker, timestamp, version de documentos y evidencia.
- `submitted_externally` no significa que Greenhouse postulo por API; significa que un humano registro evidencia de postulacion en MercadoPublico.cl.

### Compliance / Legal Checklist

Antes de cualquier flujo de postulacion asistida:

- Confirmar terminos de uso vigentes de Mercado Publico y ChileCompra.
- Confirmar si una extension browser-mediated esta permitida.
- No almacenar credenciales ni cookies de MercadoPublico.cl.
- No enviar ofertas sin confirmacion humana explicita.
- Mantener evidencia auditable del paquete preparado y del comprobante externo.
- Separar datos publicos externos de notas internas, pricing y estrategia.
- Definir retention para documentos publicos e internos.

### Reliability / Ops Contract

Requisitos minimos:

- `source_sync_runs` por source surface.
- `source_sync_watermarks` por familia/estado/fecha.
- `source_payloads` o raw storage para debug.
- Retry/backoff por fuente.
- Circuit breaker para HTML parser de adjuntos.
- Checksums de ZIP/CSV y documentos.
- DLQ para filas/documentos no parseables.
- Canarios:
  - licitacion conocida
  - OC conocida
  - ZIP COT mensual esperado
  - endpoint Compra Agil Beta cuando exista
- Budget de cuota: API Mercado Publico documenta limite diario; el plan de hidratacion debe respetarlo.

### Integration Map Greenhouse

Sinergias esperadas:

- `Commercial Deals`: oportunidad aprobada puede crear deal/quote draft.
- `Organizations`: comprador publico debe mapearse a organization/account cuando aplique.
- `Assets/Documents`: adjuntos externos + documentos internos curados.
- `Teams Notifications`: alertas high fit, cierre cercano, cambio documental, decision pendiente.
- `Reliability / Ops Health`: freshness, parser health, quota, DLQ.
- `Identity Access`: surface `comercial.licitaciones_publicas` + capabilities finas.
- `Delivery`: review de capacidad antes de bid.
- `Finance/Pricing`: aprobacion de pricing y margen cuando se transforme en quote.

### Implementation Cuts Recomendados

#### Cut 0 — Research Hardening / Watch

- Monitorear publicacion API Beta Compra Agil en mayo 2026.
- Validar si Beta incluye oportunidades abiertas, adjuntos y autenticacion por ticket.
- Cerrar rubros/keywords/organismos objetivo Efeonce.

#### Cut 1 — Data Foundation

- Crear tablas `public_procurement_*`.
- Ingerir licitaciones activas + detalle.
- Ingerir OC diaria.
- Ingerir `COT_YYYY-MM.zip` historico mensual.
- Exponer CLI/job dry-run con metrics.

#### Cut 2 — Matching + Review Queue

- Scoring versionado con nombre/descripcion/items.
- Lista operacional interna sin document intelligence avanzada.
- Estados `matched`, `triage_pending`, `no_bid`, `evaluating`.

#### Cut 3 — Documents + Evidence

- Descarga/control de adjuntos de licitaciones.
- Raw assets privados, checksums, parser health.
- Checklist manual + evidence links.

#### Cut 4 — Commercial Workflow

- Bid/no-bid governance.
- Owner, approvals, Teams alerts.
- Bridge a deal/quote draft.

#### Cut 5 — Compra Agil Live / Extension

- Integrar API Beta si cumple contrato.
- Evaluar companion extension solo si hay necesidad y compliance claro.

## Ready For Task

Este research puede convertirse en tasks cuando se cierren estas decisiones:

1. Rubros/keywords iniciales de vigilancia.
2. Owner operativo del modulo.
3. Storage target para adjuntos (`greenhouse_core.assets` + bucket privado recomendado).
4. Primer workflow interno: solo watch/evaluate/no-bid o tambien submitted/awarded.
5. Surface y access inicial: `comercial.licitaciones_publicas` + capabilities.
6. Scope del primer corte: ingestion-only, workbench UI, o ambos.
7. Cadencia de ingestion y politica de cuota.
8. Modelo minimo de scoring explicable.
9. Politica de AI: fuera de V1, resumen con evidence, o solo document classification.
10. Eventos que deben integrarse con Teams y Reliability.
11. Si Compra Agil V1 entra como historico mensual solamente o se espera API Beta.
12. Politica de raw retention para ZIP/CSV y payload JSON.
13. Tabla canonica de codigos/rubros/procedimientos y owner de su versionado.

## Tasks Candidatas

- `TASK-674` — Commercial Public Procurement architecture contract.
  - Define el bounded context como `public_procurement_opportunities`, lifecycle, events, access model, source sync observability, raw retention, data grains and asset policy.
- `TASK-675` — Mercado Publico licitaciones ingestion foundation.
  - Implementa ingestion `licitaciones.json`, detail hydration por `codigo`, retries, watermarks and source sync runs.
- `TASK-676` — Mercado Publico OC reconciliation foundation.
  - Ingiere `ordenesdecompra.json`, detecta `Tipo=AG`, parsea `CodigoCotizacion` cuando exista y reconcilia adjudicaciones/OC con oportunidades.
- `TASK-677` — Compra Agil monthly COT ingestion foundation.
  - Descarga `COT_YYYY-MM.zip`, procesa CSV en streaming, normaliza encoding/separador, dedupe por `CodigoCotizacion` y persiste respuestas por proveedor.
- `TASK-678` — Compra Agil Beta API watch + adapter spike.
  - Monitorea publicacion mayo 2026, valida contrato, autenticacion, adjuntos, oportunidades abiertas y define adapter productivo si aplica.
- `TASK-679` — Mercado Publico document ingestion + private assets.
  - Implementa discovery/download de adjuntos de licitaciones, storage privado, checksums, DLQ, parser canaries and source sync runs.
- `TASK-680` — Mercado Publico procedure taxonomy registry.
  - Versiona mapping de codigos externos (`L1`, `LE`, `LP`, `LS`, Compra Agil/RFQ-like, RFI, trato directo, etc.) hacia `opportunity_kind`, `commercial_motion` y scoring.
- `TASK-681` — Consulta al Mercado / RFI discovery spike.
  - Investiga source surface `consulta-mercado.mercadopublico.cl`, acceso, datos disponibles, attachments y feasibility de ingestion read-only.
- `TASK-682` — Public Tenders scoring V1.
  - Versiona reglas, explainability, keywords, exclusions, nombre+descripcion+items, decision bands and calibration workflow.
- `TASK-683` — Public Tenders workbench list/detail.
  - Crea surface Commercial con lista operacional, detail, estados y ownership.
- `TASK-684` — Public Tenders bid/no-bid workflow.
  - Agrega decision gates, reasons, approvals, review requests and audit.
- `TASK-685` — Tender document intelligence and requirement extraction.
  - Clasifica documentos, extrae requisitos con evidence y habilita checklist.
- `TASK-686` — Tender to deal/quote bridge.
  - Convierte licitacion aprobada en opportunity/deal/quote draft con pricing governance.
- `TASK-687` — Public tender notifications and reliability signals.
  - Teams alerts, freshness, quota, parser health and operational status.
- `TASK-688` — Public tender submission control room without API-side posting.
  - Prepara paquete, evidencia y reconciliacion sin enviar oferta por API.
- `TASK-689` — Mercado Publico companion extension research spike.
  - Evalua feasibility, compliance, manifest, browser-mediated actions, kill switch and proof-of-evidence.

## Fuentes

- ChileCompra — API Mercado Publico: https://www.chilecompra.cl/api/
- Mercado Publico API condiciones de uso: https://api.mercadopublico.cl/modules/CondicionesUso.aspx
- Diccionario API Licitaciones: https://api.mercadopublico.cl/documentos/Documentaci%C3%B3n%20API%20Mercado%20Publico%20-%20Licitaciones.pdf
- Ficha publica MercadoPublico.cl validada por smoke: `DetailsAcquisition.aspx?idlicitacion=<codigo>`
- Helper Greenhouse validado: `src/lib/integrations/mercado-publico/tenders.ts`
