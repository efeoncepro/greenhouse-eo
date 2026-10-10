# Caso de negocio · Contactabilidad comercial en Salesforce · SGS Chile

**Versión:** 1 (borrador de trabajo) · **Corte:** 10 de octubre de 2026 · **Responsable:** Julio Reyes.

**Estado:** borrador para iterar con Bárbara Quiroga y José Pedro De Oliveira antes de llevarlo a la región. No enviado. Sin honorarios ni fechas comprometidas.

Este archivo tiene dos partes. La **Parte A** es el texto que verá SGS. La **Parte B** son notas internas de Efeonce y no se entrega.

---

## Parte A · Texto para SGS

### 1. Qué se pide decidir

Autorizar un piloto acotado en Chile para que los contactos comerciales por correo, llamada y WhatsApp queden registrados en Salesforce sin trabajo manual del vendedor, y para que la jefatura comercial pueda ver cuántas veces se intentó contactar a cada cliente, por qué canal y con qué resultado.

El piloto se habilita solo para un grupo de usuarios de Chile. No cambia la experiencia del resto de los países ni la configuración común de la región. Efeonce diseña, construye y habilita la solución bajo el gobierno del equipo regional de Salesforce.

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

**Incluye:** registro automático o asistido de correo, llamadas y WhatsApp; asociación de cada contacto a la cuenta, la persona y la oportunidad; un informe de intentos de contacto por cliente y por canal; habilitación del equipo que lo usa.

**No incluye:** agentes de inteligencia artificial, campañas de marketing, rediseño del modelo de datos, ni despliegue en otros países durante el piloto.

### 4. Criterios de diseño

1. **El gobierno regional se respeta.** Toda habilitación dentro de Salesforce la aprueba y la despliega el equipo regional por su proceso habitual.
2. **Piloto por grupo de usuarios.** Las capacidades se asignan por usuario, de modo que el resto de la organización no ve cambios.
3. **Se registra el intento antes que el contenido.** El objetivo es saber quién contactó a quién, cuándo, por qué canal y con qué resultado. Guardar el contenido de llamadas o mensajes es una decisión aparte, sujeta a seguridad y privacidad.
4. **Menos trabajo para el vendedor, no más.** Si una opción agrega pasos al vendedor, se descarta.

### 5. Qué cubre Salesforce hoy y qué falta

| Canal | Qué existe | Qué requiere | Límite que importa |
| --- | --- | --- | --- |
| Correo y reuniones | Captura automática incluida en Sales Cloud; desde 2025 los correos pueden guardarse como actividades estándar, con informes | Que el administrador regional confirme cómo está configurada hoy y, si corresponde, la actualice | Si la configuración es anterior a 2025, los correos se ven en la ficha pero no entran en los informes |
| Llamadas | Salesforce Voice, complemento de pago que registra cada llamada | Licencia adicional, un proveedor de telefonía y configuración regional | Funciona en el escritorio, no en la aplicación móvil. La llamada hecha desde el celular se registra a mano |
| WhatsApp | Mensajería de Salesforce sobre WhatsApp Business Platform | Licencia adicional, un número de empresa, plantillas aprobadas, consentimiento del cliente y configuración regional | No captura el WhatsApp personal del vendedor. Su disponibilidad para usuarios de ventas debe confirmarse con Salesforce |

En resumen: correo y reuniones están cubiertos con lo que SGS ya tiene. Llamadas y WhatsApp existen como capacidades de la plataforma, pero necesitan licencias adicionales, decisiones de canal y trabajo de configuración.

### 6. Tres frentes de trabajo

**Frente 1 · Correo y reuniones (resultado rápido).** Verificar con la región cómo está configurada la captura de actividad, dejar los correos como actividades con informe y habilitar al equipo piloto. Es el frente de menor costo y entrega el primer informe de contactabilidad.

**Frente 2 · Llamadas.** Depende de cómo llaman hoy los vendedores, y hay dos caminos:

- *Dentro de Salesforce:* Salesforce Voice con un proveedor de telefonía, para quienes llaman desde el computador.
- *Solución conectada:* una herramienta de telefonía o de registro de llamadas móviles que escribe la actividad en Salesforce, para quienes llaman desde el celular.

**Frente 3 · WhatsApp.** La decisión de fondo es de canal antes que de tecnología: para tener trazabilidad, las conversaciones comerciales deben pasar por un número de empresa. También hay dos caminos:

- *Dentro de Salesforce:* mensajería nativa sobre WhatsApp Business Platform.
- *Solución conectada:* un proveedor de WhatsApp para empresas con conector a Salesforce.

### 7. Comparación de caminos

| Criterio | Dentro de Salesforce | Solución conectada |
| --- | --- | --- |
| Dónde vive el dato | En Salesforce | En la herramienta, con copia en Salesforce |
| Qué aprueba la región | Licencias, permisos y configuración | Instalación del conector y acceso por API |
| Qué cambia para el vendedor | Trabaja desde Salesforce | Trabaja desde la herramienta o desde su teléfono |
| Cobertura del celular | Limitada | Mayor |
| Dependencia de terceros | Proveedor de telefonía | Proveedor de la herramienta |
| Seguridad y datos | Dentro del perímetro actual | Requiere evaluación del proveedor |

Los dos caminos requieren aprobación del administrador regional. La solución conectada no evita a la región: cambia qué se le pide.

Una tercera posibilidad es medir fuera de Salesforce, sin conexión, durante unas semanas. No es una solución, porque crea un registro paralelo, pero sirve para obtener la línea base que este caso necesita. Solo procede si las reglas de seguridad de SGS lo permiten.

### 8. Cómo se mide el valor

Este caso no promete ventas. Mide tres cosas:

1. **Cobertura de registro:** contactos registrados sobre contactos reales. Hoy es desconocida.
2. **Tiempo administrativo recuperado:** usuarios × contactos por semana × minutos por registro manual × proporción que pasa a ser automática.
3. **Continuidad de seguimiento:** proporción de clientes y oportunidades abiertas con un contacto registrado en el período, y clientes sin contacto.

Datos que necesitamos de SGS para completar el modelo:

| Dato | Para qué |
| --- | --- |
| Número de ejecutivos comerciales del equipo piloto | Tamaño del piloto y licencias |
| Llamadas y conversaciones de WhatsApp por ejecutivo a la semana (estimación) | Volumen y tiempo recuperado |
| Minutos que toma registrar una llamada hoy | Tiempo recuperado |
| Desde dónde llaman: celular, computador o Teams | Camino para el frente 2 |
| Qué WhatsApp usan: personal, de empresa o ambos | Camino para el frente 3 |
| Edición de Salesforce y complementos contratados | Qué está incluido y qué falta |

### 9. Piloto propuesto

- **Población:** un equipo comercial de Chile, por definir con SGS.
- **Duración:** 8 a 12 semanas (indicativo).
- **Línea base:** dos semanas de medición antes de habilitar.
- **Criterios de éxito:** cobertura de registro por canal, tiempo de registro por contacto, uso del informe por la jefatura y percepción del equipo.
- **Decisión al cierre:** extender, ajustar o detener, con los datos del piloto a la vista de la región.

### 10. Etapas y responsabilidades

| Etapa | Qué se hace | Efeonce | SGS Chile | Región |
| --- | --- | --- | --- | --- |
| 1. Diseño y línea base | Revisar la configuración actual, levantar el proceso, elegir camino por canal y medir la línea base | Conduce y documenta | Define el equipo piloto y entrega los datos | Informa el estado de la plataforma y sus reglas |
| 2. Construcción y piloto | Configurar, integrar, probar y poner en marcha con el grupo piloto | Construye y prueba | Valida con usuarios | Aprueba y despliega |
| 3. Habilitación | Formar al equipo, entregar guías y el informe de contactabilidad | Forma y acompaña | Adopta y da feedback | Recibe la documentación |
| 4. Operación y extensión | Sostener la solución, medir y preparar la extensión a otros equipos o países | Opera y reporta | Usa y prioriza | Decide la extensión |

Cada etapa cierra con una decisión explícita antes de pasar a la siguiente.

### 11. Estructura de la inversión

La inversión se presenta separada en cinco componentes. Los montos se completan al cierre de la etapa 1.

1. Licencias y complementos de Salesforce, contratados por SGS bajo su acuerdo vigente.
2. Consumo variable: conversaciones de WhatsApp y minutos de telefonía.
3. Herramientas de terceros, solo si se elige una solución conectada.
4. Servicios de Efeonce por etapa: diseño, construcción, habilitación.
5. Operación continua de Efeonce, si SGS la contrata.

### 12. Riesgos y condiciones

- **Gobierno:** sin aprobación regional no hay piloto dentro de Salesforce.
- **Privacidad:** el registro de contactos con clientes y la eventual grabación deben revisarse con el área legal de SGS, considerando la nueva ley chilena de protección de datos personales.
- **WhatsApp:** exige consentimiento del cliente y un número de empresa. Mover las conversaciones a ese número es un cambio de hábito.
- **Adopción:** si el vendedor percibe control y no ayuda, el registro no mejora.
- **Disponibilidad:** la cobertura de telefonía y de WhatsApp para Chile debe confirmarse con Salesforce antes de comprometer un camino.

### 13. Próximos pasos

1. Revisar este borrador con SGS Chile y ajustarlo a la operación.
2. Completar los seis datos del punto 8.
3. Presentarlo en conjunto a la contraparte regional.

---

## Parte B · Notas internas (no entregar)

### B1. Qué corrige este borrador respecto de la reunión del 29-09

En la reunión se dijo que llamadas y WhatsApp están "de forma nativa" en Salesforce y que el vendedor "no tiene que salirse de su teléfono" (minuto 19:30). La verificación no lo sostiene tal cual:

- Correo y reuniones: sí, incluido.
- WhatsApp: existe, pero con complemento de pago, número de empresa, plantillas y consentimiento. No captura el WhatsApp personal. La documentación está escrita para servicio; para usuarios de ventas no quedó verificado.
- Llamadas: el marcador clásico (Sales Dialer) solo opera en EE. UU. y Canadá y está en retiro. Salesforce Voice es de escritorio. La llamada desde el celular se registra a mano.

Recomendación: abrir la sesión de revisión con esta precisión, presentada como resultado del análisis. La sección 5 ya lo dice sin referirse a la reunión.

### B2. Cómo este caso lleva a que Efeonce construya

- Efeonce aparece como ejecutor en las cuatro etapas, no solo en el diseño.
- El frente 1 da un resultado rápido que no depende de comprar licencias y nos pone a trabajar con el administrador regional desde el inicio.
- La habilitación en español y en terreno es algo que la región no puede hacer a distancia.
- La solución conectada, si se elige, la construimos y la operamos nosotros.

Riesgo principal: que la región tome el caso y lo ejecute con su propio equipo. Bárbara dijo que no hay partner local y que todo se hace "con la región"; no sabemos si la región tiene un integrador. Preguntas para Bárbara:

1. ¿SGS Chile puede contratar servicios localmente aunque la plataforma sea regional?
2. ¿La región trabaja con algún integrador?
3. ¿Qué unidad levantó antes la contactabilidad y qué respondió la región?
4. ¿La contraparte de marketing regional decide sobre la plataforma, o solo canaliza la solicitud?

### B3. Pendientes antes de enviar

- **Honorarios:** sin usuarios ni canales no hay base. Cotizar al tener los seis datos.
- **Duraciones:** "8 a 12 semanas" es una propuesta mía, no una estimación de capacidad. Confirmar.
- **Claim de partner:** el texto no afirma partnership. Si se agrega, usar solo la insignia "Salesforce Partner" (referencia `salesforce-partner-authorization-2026-09-29`); no afirmar nivel ni certificaciones.
- **Ley de datos:** la referencia a la ley chilena es general. Validar alcance y vigencia con la skill legal antes de enviar.
- **Formato de entrega:** este texto es contenido. Falta decidir si va como documento membretado o como láminas.
- **Ricardo Valenzuela:** sin correo verificado; no recibió la minuta.

### B4. Evidencia y su grado de verificación (corte 2026-10-10)

Leído directamente en la fuente:

- [Digital Engagement for Sales](https://help.salesforce.com/s/articleView?id=sf.sales_core_digital_engagment.htm&type=5): complemento de pago en Enterprise y Unlimited; la página no nombra WhatsApp.
- [Precio de lista de Digital Engagement](https://www.salesforce.com/service/digital-customer-engagement-platform/pricing/): US$75 por usuario al mes, presentado para Service Cloud. Sin precio público para ventas.
- [Retiro de Open CTI](https://help.salesforce.com/s/articleView?id=005306437&type=1): 28 de febrero de 2028; reemplazo recomendado, Salesforce Voice con telefonía de partner.
- [Retiro de Activity 360 Reports](https://help.salesforce.com/s/articleView?id=005385951&type=1): Spring '27.
- [Anuncios de Dreamforce 2026](https://www.salesforce.com/blog/dreamforce-2026-announcements/): sin anuncio de captura automática de llamadas o WhatsApp para vendedores.

Confirmado por dos búsquedas independientes sobre páginas oficiales, sin abrir el cuerpo completo:

- [Límites de Sales Dialer](https://help.salesforce.com/s/articleView?id=dialer_limitations.htm&language=en_US&type=5): llamadas salientes solo a EE. UU. y Canadá; solo escritorio; en retiro, sin fecha encontrada.
- [Sync Email as Salesforce Activity](https://help.salesforce.com/s/articleView?id=release-notes.rn_sales_productivity_eac_email_sync.htm&language=en_US&release=256&type=5): desde Summer '25 los correos capturados se guardan como Task y EmailMessage; las organizaciones configuradas antes requieren migración.
- [Límites de Salesforce Voice](https://help.salesforce.com/s/articleView?id=sf.voice_limitations.htm&type=5): solo Lightning de escritorio; disponibilidad regional a confirmar con Salesforce.

Leído solo en extracto del buscador (abrir antes de citar ante el cliente):

- [Consideraciones de WhatsApp en Salesforce](https://help.salesforce.com/s/articleView?id=sf.messaging_whatsapp_considerations.htm&type=5): número propio, plantillas, ventana de 24 horas.
- [Precio de Salesforce Voice](https://www.salesforce.com/editions-pricing/service-cloud/voice/): telefonía de partner US$50 por usuario al mes, más el proveedor.
- [Acciones de la app móvil](https://help.salesforce.com/s/articleView?id=actionbar_considerations.htm&type=5): la llamada desde el móvil se registra con la acción manual.
- [Integración con Teams](https://help.salesforce.com/s/articleView?id=teams_int_features.htm&type=5): no registra llamadas.

Sin verificar:

- Disponibilidad de WhatsApp para usuarios de ventas en Sales Cloud.
- Cobertura de Salesforce Voice en Chile.
- "Momentum", producto de Salesforce que convertiría llamadas, reuniones, textos y correos en datos estructurados, con disponibilidad general anunciada para octubre de 2026. Fuente de terceros ([Salesforce Ben](https://www.salesforceben.com/top-sales-cloud-announcements-at-dreamforce-26/)). Si se confirma, cambia el camino nativo y la región podría preferir esperar.

### B5. Fuentes del caso

- Transcripción de la [reunión HubSpot 115791682150](https://app.hubspot.com/contacts/48713323/record/0-47/115791682150), leída completa el 2026-10-10.
- Minuta «Minuta y próximos pasos | SGS + Efeonce», enviada el 2026-09-29. Sin respuesta de SGS al 2026-10-10.
- [Expediente del prospecto](PROSPECT-CASE.md).
