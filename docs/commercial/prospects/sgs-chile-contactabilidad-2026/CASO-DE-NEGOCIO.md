# Caso de negocio · Contactabilidad comercial en Salesforce · SGS Chile

**Versión:** 3 (borrador de trabajo) · **Corte:** 10 de octubre de 2026 · **Responsable:** Julio Reyes.

**Estado:** borrador para iterar con Bárbara Quiroga y José Pedro De Oliveira antes de llevarlo a la región. No enviado. Sin honorarios ni fechas comprometidas.

**Cambios:** la versión 2 diseñó la solución sobre Aircall para llamadas y WhatsApp, con Salesforce como registro. La versión 3 fija el objetivo como trazabilidad completa de la relación con el cliente, con dos vistas: la de gestión comercial y la de quien lleva la cuenta.

**En revisión (2026-10-10):** las secciones 5 a 8 de la Parte A describen la solución solo sobre Aircall y quedaron superadas por la [propuesta de habilitación](PROPUESTA-DE-HABILITACION.md). Dos correcciones de hecho pendientes de incorporar: Aircall no ofrece números móviles chilenos, solo fijos, nacionales y 800; y existe una variante que conserva el número y el WhatsApp del ejecutivo. No enviar esta versión; se reescribe cuando SGS responda la pregunta del número de empresa.

Este archivo tiene dos partes. La **Parte A** es el texto que verá SGS. La **Parte B** son notas internas de Efeonce y no se entrega.

---

## Parte A · Texto para SGS

### 1. Qué se pide decidir

Autorizar un piloto acotado en Chile para que SGS tenga trazabilidad completa de la relación con cada cliente: que todo contacto por correo, llamada, WhatsApp y reunión quede registrado en Salesforce sin trabajo manual, en un solo historial por cliente.

Esa trazabilidad sirve a dos personas distintas. Quien lleva la cuenta ve todo lo conversado con su cliente, en orden. La jefatura comercial ve cuántas veces se intentó contactar a cada cliente, por qué canal y con qué resultado.

El piloto se habilita solo para un grupo de usuarios de Chile. No cambia la experiencia del resto de los países ni la configuración común de la región. Efeonce diseña, construye, habilita y opera la solución bajo el gobierno del equipo regional de Salesforce.

### 2. Situación actual

- Las reuniones que agendan los ejecutivos comerciales se registran solas en Salesforce.
- El correo tiene seguimiento.
- Las llamadas y los negocios se registran a mano.
- Los contactos por WhatsApp no quedan registrados.

Dos efectos:

1. **Para el vendedor:** carga administrativa. Registrar cada llamada compite con el tiempo de venta, así que el registro queda incompleto.
2. **Para la jefatura comercial:** falta de visibilidad. Hoy no es posible saber cuántas veces se contactó a un cliente ni por qué canal, y por lo tanto tampoco detectar clientes sin seguimiento.

Esta necesidad ya se había levantado antes desde otra unidad de negocio de SGS Chile.

### 3. Alcance del caso

**Incluye:** registro automático de correo, llamadas, WhatsApp y reuniones; asociación de cada contacto a la cuenta, la persona y la oportunidad; el historial completo en la ficha de cada cliente; un informe de intentos de contacto por cliente y por canal; habilitación del equipo que lo usa.

**No incluye:** agentes de inteligencia artificial, campañas de marketing, rediseño del modelo de datos, ni despliegue en otros países durante el piloto.

### 4. Criterios de diseño

1. **El gobierno regional se respeta.** Todo cambio dentro de Salesforce lo aprueba y lo despliega el equipo regional por su proceso habitual.
2. **Piloto por grupo de usuarios.** Las capacidades se asignan por usuario, de modo que el resto de la organización no ve cambios.
3. **Se registra el intento antes que el contenido.** El objetivo es saber quién contactó a quién, cuándo, por qué canal y con qué resultado. Grabar llamadas es una decisión aparte y parte desactivada.
4. **Menos trabajo para el vendedor, no más.** El vendedor llama y escribe desde su celular; el registro ocurre solo.

### 5. La solución

Una sola herramienta de comunicación, Aircall, para llamadas y WhatsApp, conectada a Salesforce. El correo y las reuniones siguen en lo que Salesforce ya incluye.

| Canal | Cómo trabaja el vendedor | Qué queda en Salesforce |
| --- | --- | --- |
| Llamadas | Llama y recibe desde la aplicación de Aircall en su celular o en su computador, con un número de empresa | Cada llamada como actividad en la persona, la cuenta y la oportunidad, incluidas las no contestadas y las perdidas |
| WhatsApp | Escribe desde la misma aplicación, con el mismo número de empresa | Cada conversación registrada en la ficha del cliente |
| Correo y reuniones | Sin cambios | Actividades capturadas por Salesforce, con informes |
| Informe de contactabilidad | La jefatura lo consulta en Salesforce | Intentos por cliente, por canal y por resultado, y clientes sin contacto en el período |

Que las llamadas no contestadas también se registren es lo que permite contar intentos, no solo conversaciones.

**Dos vistas de la misma trazabilidad:**

- **Vista de cuenta**, para quien conversa con el cliente todo el día: la ficha del cliente muestra en un solo historial los correos, las llamadas, los mensajes y las reuniones, con fecha y responsable. Nadie tiene que anotar nada.
- **Vista de gestión**, para excelencia comercial y las jefaturas: intentos por cliente, canal y resultado; clientes sin contacto en el período; cobertura por equipo.

Las dos vistas leen los mismos registros. Lo que ve la jefatura es exactamente lo que ocurrió en las cuentas.

### 6. Cómo se llega: dos pasos

**Paso 1 · Piloto local, sin cambios en Salesforce.** El equipo piloto empieza a llamar y escribir por Aircall. La herramienta ya entrega la cuenta de intentos por canal y por ejecutivo. Este paso no requiere configuración regional; sí requiere la aprobación de seguridad y compras de SGS Chile. Entrega dos cosas: el equipo trabajando con trazabilidad y la línea base medida que este caso necesita.

**Paso 2 · Conexión a Salesforce, con la región.** Con los datos del paso 1, se solicita a la región una habilitación concreta: instalar el conector de Aircall y asignarlo a los usuarios del piloto, y confirmar la configuración de captura de correo. Desde ese momento los contactos aparecen en la ficha de cada cliente y el informe vive en Salesforce.

La solicitud a la región queda así reducida a una instalación acotada y reversible, respaldada con datos del propio equipo.

### 7. Alternativa considerada

Hacerlo solo con capacidades de Salesforce: Salesforce Voice para llamadas y la mensajería nativa para WhatsApp.

| Criterio | Aircall conectado a Salesforce | Solo Salesforce |
| --- | --- | --- |
| Llamadas desde el celular | Sí | No: Salesforce Voice funciona en el escritorio |
| WhatsApp para vendedores | Sí, en la misma aplicación | Disponibilidad para ventas por confirmar con Salesforce |
| Puede empezar sin la región | Sí, en el paso 1 | No |
| Qué se le pide a la región | Instalar un conector | Licencias nuevas, proveedor de telefonía y configuración de canales |
| Dónde vive el dato | En Aircall, con registro en Salesforce | En Salesforce |

Los dos esquemas son compatibles: Aircall ofrece también una versión integrada con Salesforce Voice, por si la región define ese estándar.

### 8. Qué cambia para el equipo

- Cada ejecutivo pasa a usar un número de empresa para llamadas y WhatsApp. Los clientes deben conocer ese número.
- WhatsApp de empresa tiene reglas: para iniciar una conversación se usa un mensaje aprobado previamente; dentro de las 24 horas siguientes a la respuesta del cliente se escribe con libertad.
- El historial de WhatsApp anterior no se traslada.

Por eso la habilitación es parte de la solución y no un cierre: guías, formación por equipo y acompañamiento durante las primeras semanas.

### 9. Cómo se mide el valor

Este caso no promete ventas. Mide tres cosas:

1. **Cobertura de registro:** contactos registrados sobre contactos reales. Hoy es desconocida; el paso 1 la mide.
2. **Tiempo administrativo recuperado:** usuarios × contactos por semana × minutos por registro manual.
3. **Continuidad de seguimiento:** proporción de clientes y oportunidades abiertas con un contacto en el período, y clientes sin contacto.

Datos que necesitamos de SGS para dimensionar:

| Dato | Para qué |
| --- | --- |
| Número de ejecutivos comerciales del equipo piloto | Tamaño del piloto y licencias |
| Llamadas y conversaciones de WhatsApp por ejecutivo a la semana (estimación) | Volumen y consumo |
| Minutos que toma registrar una llamada hoy | Tiempo recuperado |
| Desde dónde llaman hoy: celular propio, celular de empresa, computador o Teams | Plan de cambio de número |
| Qué WhatsApp usan hoy: personal, de empresa o ambos | Plan de cambio de canal |
| Edición de Salesforce y complementos contratados | Conector y captura de correo |

### 10. Piloto propuesto

- **Población:** un equipo comercial de Chile, por definir con SGS.
- **Duración:** 8 a 12 semanas (indicativo), con el paso 2 dentro del plazo si la región lo aprueba.
- **Criterios de éxito:** cobertura de registro por canal, uso real de la aplicación por el equipo, uso del informe por la jefatura y percepción de los ejecutivos.
- **Decisión al cierre:** extender, ajustar o detener, con los datos del piloto a la vista de la región.

### 11. Etapas y responsabilidades

| Etapa | Qué se hace | Efeonce | SGS Chile | Región |
| --- | --- | --- | --- | --- |
| 1. Diseño | Levantar el proceso, definir equipo, números, reglas de registro y revisión de seguridad | Conduce y documenta | Define el equipo y gestiona seguridad y compras | Informa el estado de la plataforma y sus reglas |
| 2. Piloto local | Configurar Aircall y WhatsApp, formar al equipo y medir la línea base | Configura, forma y mide | Usa y da feedback | Recibe los resultados |
| 3. Conexión a Salesforce | Instalar y configurar el conector, ajustar la captura de correo y construir el informe | Configura y prueba | Valida con usuarios | Aprueba y despliega |
| 4. Operación y extensión | Sostener la solución, medir y preparar la extensión a otros equipos o países | Opera y reporta | Usa y prioriza | Decide la extensión |

Cada etapa cierra con una decisión explícita antes de pasar a la siguiente.

### 12. Estructura de la inversión

Los montos se completan al conocer el tamaño del equipo piloto.

1. Licencias de Aircall por usuario, incluido el complemento de WhatsApp.
2. Consumo variable: minutos de llamada y mensajes de WhatsApp iniciados por la empresa.
3. Licencias de Salesforce: ninguna nueva en el esquema recomendado, salvo que la región opte por Salesforce Voice.
4. Servicios de Efeonce por etapa: diseño, configuración, conexión, informe y habilitación.
5. Operación continua de Efeonce, si SGS la contrata.

### 13. Riesgos y condiciones

- **Seguridad:** SGS debe aprobar a Aircall como proveedor antes del paso 1.
- **Gobierno:** sin aprobación regional no hay paso 2. El paso 1 conserva su valor aunque el paso 2 se demore.
- **Cambio de número:** si los ejecutivos mantienen su número personal en paralelo, el registro queda incompleto.
- **WhatsApp:** requiere una cuenta de empresa verificada ante Meta y el consentimiento del cliente para recibir mensajes.
- **Privacidad:** el registro de contactos con clientes debe revisarse con el área legal de SGS, considerando la nueva ley chilena de protección de datos personales.

### 14. Próximos pasos

1. Revisar este borrador con SGS Chile y ajustarlo a la operación.
2. Completar los seis datos del punto 9.
3. Mostrar la solución funcionando en un ambiente de demostración.
4. Presentarlo en conjunto a la contraparte regional.

---

## Parte B · Notas internas (no entregar)

### B1. Qué corrige este borrador respecto de la reunión del 29-09

En la reunión se dijo que llamadas y WhatsApp están "de forma nativa" en Salesforce y que el vendedor "no tiene que salirse de su teléfono" (minuto 19:30). Solo con Salesforce no se sostiene: el marcador clásico no opera en Chile y está en retiro, Salesforce Voice es de escritorio y la mensajería nativa no captura el WhatsApp personal. Con Aircall la promesa de fondo sí se cumple: el vendedor trabaja desde su celular y el registro ocurre solo. El texto para SGS presenta la solución sin aludir a la reunión.

### B1b. Objetivo según Julio (2026-10-10)

Que Bárbara tenga toda la trazabilidad, igual que José Pedro. Lo interpreto así: los dos deben quedar servidos, cada uno en su vista. José Pedro pidió en la reunión lo que tenía en HubSpot: que su correo con clientes quede registrado solo (21:22–22:00). Bárbara pidió el seguimiento de llamadas y WhatsApp (19:05–19:21). Si la frase quería decir otra cosa, por ejemplo que Bárbara vea lo mismo que ve José Pedro en sus cuentas, la sección 5 también lo cubre.

Consecuencia para el plan: la vista de cuenta de José Pedro depende sobre todo del correo, y el correo depende de la configuración de Salesforce. Primera verificación con la región: si la captura de correo ya está activa y José Pedro solo necesita conectar su cuenta, o si hay que habilitarla.

### B2. Por qué este diseño lleva a que Efeonce construya

- El paso 1 no depende de la región: podemos empezar con una decisión de SGS Chile.
- Aircall llega por nosotros; licencias, configuración y soporte de primer nivel pasan por Efeonce.
- El conector, el informe y la captura de correo son trabajo de configuración en Salesforce que hacemos con la región.
- La habilitación en español y en terreno no la puede hacer la región a distancia.
- La operación y la extensión a otros países quedan planteadas desde el inicio.

Preguntas para Bárbara:

1. ¿SGS Chile puede contratar una herramienta de comunicación y servicios localmente, sin la región?
2. ¿SGS tiene un estándar corporativo de telefonía o un proveedor global que lo impida?
3. ¿Qué unidad levantó antes la contactabilidad y qué respondió la región?
4. ¿La contraparte de marketing regional decide sobre la plataforma, o solo canaliza la solicitud?
5. ¿Quién administra la cuenta de Meta de SGS? La verificación de empresa para WhatsApp puede ser global.

### B3. Pendientes antes de enviar

- **Demostración:** armar un ambiente propio (Aircall más una organización Salesforce de desarrollo) que muestre una llamada y un WhatsApp desde el celular apareciendo en la ficha del cliente, y el informe. Es el activo que convierte el caso en algo visible.
- **Condiciones con Aircall:** confirmar si revendemos o referimos, precios, y soporte para Chile.
- **Registro de partnerships:** Aircall no figura en `EFEONCE_PARTNERSHIP_REGISTRY_V1.md`. Agregarlo antes de afirmar el partnership ante SGS.
- **Honorarios:** cotizar al tener el tamaño del equipo.
- **Duraciones:** "8 a 12 semanas" es una propuesta, no una estimación de capacidad.
- **Ley de datos:** validar alcance y vigencia con la skill legal antes de enviar.
- **Formato de entrega:** documento membretado o láminas, por decidir.
- **Ricardo Valenzuela:** sin correo verificado; no recibió la minuta.

### B4. Disponibilidad de WhatsApp en Aircall para Chile

Julio planteó el 2026-10-10 que Aircall no tendría WhatsApp para Latinoamérica. La documentación pública no muestra esa exclusión, pero tampoco confirma el caso de Chile:

- El [centro de ayuda](https://support.aircall.io/en-gb/articles/26482846047901) dice que está disponible en todas las geografías, que todos los números de Aircall son elegibles y que se pueden conectar números externos.
- La [página de producto](https://aircall.io/es/products/whatsapp-in-aircall/) lo limita a los números de Aircall de los países de su [lista de cobertura](https://aircall.io/countries/). Esa lista incluye Chile, México, Colombia y Perú; Brasil y Argentina no aparecen.
- Ninguna página nombra a Chile de forma expresa para WhatsApp, y no hay matriz por país.

Estado: sin exclusión encontrada, sin confirmación positiva. Se resuelve con una pregunta directa al contacto de partners de Aircall: si un número chileno comprado en Aircall puede activar el complemento de WhatsApp, y si una cuenta facturada en Chile puede contratarlo.

Si la respuesta es no, el diseño se mantiene para llamadas y WhatsApp cambia de pieza: un proveedor de WhatsApp para empresas con conector a Salesforce, o la mensajería nativa de Salesforce. En ambos casos WhatsApp deja de poder empezar en el paso 1 y pasa a depender de la región.

### B4b. Por confirmar en la demostración

- Que las llamadas hechas desde la aplicación móvil de Aircall se registren igual que las del computador. La documentación dice que se registra "cada llamada hecha o recibida con Aircall", sin distinguir el dispositivo.
- En qué objeto de Salesforce quedan los mensajes de WhatsApp y si entran en los informes estándar. La documentación solo dice que se registran.
- Qué plan de Aircall exige el conector de Salesforce. Una fuente de terceros indica Professional; sin confirmar.
- Números chilenos: Aircall lista a Chile como país disponible, con documentos regulatorios. Advierte que el rango +5644 puede no ser alcanzable desde números extranjeros.
- Calidad de llamada por datos móviles en zonas de baja cobertura, relevante para la Zona Sur.

### B5. Evidencia (corte 2026-10-10)

Aircall, leído en su documentación:

- [Registro de llamadas en Salesforce](https://support.aircall.io/en-gb/articles/10375396027805): cada llamada queda como Task y en el objeto Aircall Log; incluye llamadas salientes no contestadas, perdidas y buzón de voz; asocia a Contact o Lead y a Account, Case u Opportunity. No crea oportunidades.
- [WhatsApp en Aircall](https://support.aircall.io/en-gb/articles/26482846047901): usa WhatsApp Business Platform; exige cuenta de empresa verificada en Meta; plantilla aprobada para iniciar conversación; mensajes dentro de la ventana de 24 horas sin costo; funciona en la aplicación móvil; es un complemento con licencia y consumo; registra en Salesforce; activar un número borra el acceso a su historial previo.
- [Aircall for Salesforce Voice](https://aircall.io/es/integraciones-CRM-helpdesk/salesforce-voice/): requiere plan Professional de Aircall y licencias de Salesforce Voice; complemento de 30 € por usuario al mes.
- [Países con números disponibles](https://aircall.io/es-mx/paises/): Chile figura en la lista.

Salesforce, leído directamente en la fuente:

- [Retiro de Open CTI](https://help.salesforce.com/s/articleView?id=005306437&type=1): 28 de febrero de 2028. Afecta al conector clásico de Aircall; la versión sobre Salesforce Voice es la salida.
- [Digital Engagement for Sales](https://help.salesforce.com/s/articleView?id=sf.sales_core_digital_engagment.htm&type=5): complemento de pago; la página no nombra WhatsApp.
- [Anuncios de Dreamforce 2026](https://www.salesforce.com/blog/dreamforce-2026-announcements/): sin anuncio de captura automática de llamadas o WhatsApp para vendedores.

Salesforce, confirmado por dos búsquedas sobre páginas oficiales:

- [Límites de Sales Dialer](https://help.salesforce.com/s/articleView?id=dialer_limitations.htm&language=en_US&type=5): solo EE. UU. y Canadá; en retiro.
- [Límites de Salesforce Voice](https://help.salesforce.com/s/articleView?id=sf.voice_limitations.htm&type=5): solo escritorio.
- [Sync Email as Salesforce Activity](https://help.salesforce.com/s/articleView?id=release-notes.rn_sales_productivity_eac_email_sync.htm&language=en_US&release=256&type=5): correos como actividades con informes desde Summer '25; las organizaciones anteriores requieren migración.

Sin verificar:

- "Momentum", producto de Salesforce que convertiría llamadas, reuniones, textos y correos en datos estructurados, con disponibilidad anunciada para octubre de 2026. Fuente de terceros ([Salesforce Ben](https://www.salesforceben.com/top-sales-cloud-announcements-at-dreamforce-26/)). Si se confirma, la región podría preferir esperar.

### B6. Fuentes del caso

- Transcripción de la [reunión HubSpot 115791682150](https://app.hubspot.com/contacts/48713323/record/0-47/115791682150), leída completa el 2026-10-10.
- Minuta «Minuta y próximos pasos | SGS + Efeonce», enviada el 2026-09-29. Sin respuesta de SGS al 2026-10-10.
- [Expediente del prospecto](PROSPECT-CASE.md).
