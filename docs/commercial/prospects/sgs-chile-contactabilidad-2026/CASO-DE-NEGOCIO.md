# Caso de negocio · Trazabilidad comercial en Salesforce · SGS Chile

**Versión:** 6 (borrador de trabajo, consolidado) · **Corte:** 10 de octubre de 2026 · **Responsable:** Julio Reyes.

**Estado:** borrador para iterar con Bárbara Quiroga y José Pedro De Oliveira antes de llevarlo a la región. No enviado. Sin honorarios ni fechas comprometidas.

**Decisión que fija esta versión:** Julio aprobó el 2026-10-10 proponer la solución con número de empresa en Aircall. La alternativa que conserva el número del ejecutivo queda documentada como respaldo en la [propuesta de habilitación](PROPUESTA-DE-HABILITACION.md).

**Consolidación (versión 5):** incorpora lo investigado el 2026-10-10: números geográficos, registro de WhatsApp en Salesforce mediante una integración que construye Efeonce, y resultado del contacto tomado del estado de la llamada.

**Versión 6:** la vista de gestión pasa de informes de Salesforce a un panel de contactabilidad de Efeonce Insights, en tiempo real para llamadas y WhatsApp, más un informe mensual. Julio aprobó el 2026-10-10 extender Efeonce Insights para esto.

Este archivo tiene dos partes. La **Parte A** es el texto que verá SGS. La **Parte B** son notas internas de Efeonce y no se entrega.

---

## Parte A · Texto para SGS

### 1. Qué se pide decidir

Dos decisiones, en este orden:

1. **SGS Chile:** iniciar un piloto con un equipo comercial para que todo contacto con clientes por correo, llamada, WhatsApp y reunión quede registrado sin trabajo manual.
2. **Equipo regional de Salesforce:** autorizar cinco habilitaciones acotadas para que esos registros vivan también en Salesforce, solo para los usuarios del piloto.

El piloto no cambia la experiencia del resto de los países ni la configuración común de la región. Efeonce diseña, construye, habilita y opera la solución.

### 2. Situación actual

- Las reuniones que agendan los ejecutivos comerciales se registran solas en Salesforce.
- El correo tiene seguimiento, aunque falta confirmar que esté activo para todo el equipo.
- Las llamadas y los negocios se registran a mano.
- Los contactos por WhatsApp no quedan registrados.

Dos efectos:

1. **Para quien lleva la cuenta:** carga administrativa. Registrar cada contacto compite con el tiempo de venta, así que el historial queda incompleto.
2. **Para la jefatura comercial:** falta de visibilidad. Hoy no es posible saber cuántas veces se contactó a un cliente ni por qué canal, y por lo tanto tampoco detectar clientes sin seguimiento.

Esta necesidad ya se había levantado antes desde otra unidad de negocio de SGS Chile.

### 3. Objetivo

Trazabilidad completa de la relación con cada cliente, en un solo historial y en dos vistas:

- **Vista de cuenta:** quien conversa con el cliente ve en la ficha todos los correos, llamadas, mensajes y reuniones, con fecha y responsable.
- **Vista de gestión:** excelencia comercial y las jefaturas ven, en un panel que se actualiza solo, intentos por cliente, canal y resultado; clientes sin contacto en el período; cobertura por equipo.

Las dos vistas parten de los mismos contactos.

**Fuera de alcance:** agentes de inteligencia artificial, campañas de marketing, rediseño del modelo de datos y despliegue en otros países durante el piloto.

### 4. Criterios de diseño

1. **El gobierno regional se respeta.** Todo cambio dentro de Salesforce lo aprueba y lo despliega el equipo regional.
2. **Piloto por grupo de usuarios.** Las capacidades se asignan por usuario; el resto de la organización no ve cambios.
3. **Se registra el contacto, no se graba.** Queda quién contactó a quién, cuándo, por qué canal y con qué resultado. No se graban ni transcriben llamadas.
4. **Menos trabajo para el ejecutivo.** Llama y escribe desde su celular; el registro ocurre solo.
5. **Se miden cuentas, no personas.** La información sirve para dar seguimiento a los clientes, no para evaluar individualmente al equipo.

### 5. La solución

| Canal | Cómo trabaja el ejecutivo | Qué queda en Salesforce |
| --- | --- | --- |
| Correo y reuniones | Como hoy, desde Outlook | Cada correo con un cliente y cada reunión, en la ficha |
| Llamadas | Desde la aplicación de Aircall en su celular o computador, con un número de empresa | Cada llamada, incluidas las no contestadas y las perdidas |
| WhatsApp | Desde la misma aplicación, con el mismo número de empresa | Cada mensaje enviado y recibido, como actividad en la ficha del cliente |

Una sola herramienta de comunicación para llamadas y WhatsApp. El correo y las reuniones usan lo que Salesforce ya incluye.

**La vista de gestión: panel de contactabilidad de Efeonce Insights.**

- Muestra intentos por cliente, canal, ejecutivo y resultado, y los clientes sin contacto en el período.
- Las llamadas y los WhatsApp aparecen en el momento en que ocurren, porque llegan directo desde Aircall.
- Funciona desde el piloto, antes de la conexión a Salesforce.
- Guarda el contacto, no el contenido: quién, cuándo, canal, resultado y cuenta. No guarda el texto de los mensajes ni audio.
- Cada mes entrega un informe con los hallazgos del período, que se comparte por enlace. Es el documento para llevar los resultados a la región.

Se propone un panel propio y no los paneles de Salesforce porque estos se refrescan a mano o una o dos veces por hora, tienen un tope por edición y sus versiones avanzadas requieren una licencia adicional.

Cómo llega cada canal a Salesforce:

- **Correo y reuniones:** la captura de actividad incluida en Salesforce.
- **Llamadas:** el conector de Aircall para Salesforce, un paquete publicado y revisado.
- **WhatsApp:** una integración que construye Efeonce. Recibe de Aircall cada mensaje y lo escribe como actividad en Salesforce.

Que las llamadas no contestadas también se registren es lo que permite contar intentos y no solo conversaciones. El resultado de cada llamada (contestada, no contestada, buzón de voz) se toma de la propia llamada; el ejecutivo no tiene que clasificarla.

### 6. Etapas

| Etapa | Qué se hace | Qué entrega | Requiere a la región |
| --- | --- | --- | --- |
| 0. Diagnóstico | Revisar cómo está el correo en Salesforce, levantar teléfonos y canales del equipo, revisar seguridad | Plan ajustado a la operación real | No |
| 1. Correo y reuniones | Dejar activa la captura de correo para el equipo piloto | Historial de correo en la ficha del cliente | Poco o nada |
| 2. Piloto de llamadas y WhatsApp | Entregar números de empresa, configurar la aplicación, poner en marcha el panel, formar al equipo y medir | El equipo trabajando con trazabilidad, el panel en uso y la línea base medida | No |
| 3. Conexión a Salesforce | Instalar el conector de llamadas, construir la integración de WhatsApp, sumar el correo al panel y validar con usuarios | Todo el historial en la ficha del cliente y el panel con los cuatro canales | Sí |
| 4. Operación y extensión | Sostener, medir, emitir el informe mensual y preparar otros equipos o países | Continuidad y decisión de extensión | Sí, para extender |

La etapa 2 funciona antes de la etapa 3: el panel ya muestra los intentos por canal y por ejecutivo. Así la solicitud a la región llega respaldada con datos del propio equipo. Hasta la etapa 3, el panel identifica a los clientes por su número; después, por su cuenta.

Cada etapa cierra con una decisión explícita antes de pasar a la siguiente.

### 7. Qué se le pide al equipo regional

1. Confirmar cómo está configurada la captura de correo e incluir a los usuarios chilenos del piloto.
2. Instalar el conector de Aircall, primero en ambiente de pruebas y luego en producción, con permisos asignados solo al grupo piloto.
3. Autorizar la integración de WhatsApp: acceso por API con un usuario de integración de permisos mínimos: leer contactos y cuentas para asociar el mensaje, y crear actividades.
4. Agregar un valor "WhatsApp" en el tipo de actividad.
5. Permitir a esa misma integración leer el conteo de actividades de correo, para sumar el correo al panel.

Es reversible: el conector se desinstala desde la configuración de Salesforce y la integración se apaga revocando su acceso. Las actividades ya registradas permanecen.

Para la revisión regional, este caso entrega: métricas de éxito definidas de antemano, descripción de la arquitectura, evaluación de seguridad del proveedor, impacto en los datos y un responsable local del proceso.

### 8. Qué cambia para el equipo

- Cada ejecutivo pasa a usar un número de empresa para llamadas y WhatsApp. Es un número fijo de su ciudad, no un número móvil.
- WhatsApp de empresa tiene reglas: para iniciar una conversación se usa un mensaje aprobado previamente; después de que el cliente responde, se escribe con libertad durante 24 horas.
- No admite grupos, y el historial de WhatsApp anterior no se traslada.

La habilitación es parte de la solución:

1. **Codiseño con los ejecutivos:** qué se registra y qué no.
2. **Acuerdo de uso:** quién ve qué.
3. **Entrega:** números, firma de correo, tarjeta de contacto y aviso a los clientes.
4. **Convivencia** de cuatro a ocho semanas, con respuesta automática y desvío en el número anterior.
5. **Acompañamiento semanal,** con un tablero que el ejecutivo ve antes que su jefatura.
6. **Cierre** con datos comparados contra la línea base.

### 9. Condiciones de privacidad y laborales

Aplican desde el primer día del piloto y deben validarse con el área legal de SGS:

1. Base legal documentada y política de datos actualizada: finalidad, destinatarios, transferencia internacional y plazo de conservación.
2. Sin grabación ni transcripción de llamadas.
3. La medida consta en el reglamento interno o en un anexo de contrato: general, impersonal y sin uso disciplinario individual.
4. Número y aplicación de empresa separados de lo personal. Si se usa el celular propio, acuerdo escrito y costos a cargo de SGS.
5. Consentimiento del cliente para recibir mensajes de WhatsApp, registrado por contacto.
6. Acuerdo de tratamiento de datos con Efeonce por el panel: qué datos guarda, dónde, por cuánto tiempo y cómo se eliminan.

La nueva ley chilena de protección de datos personales rige desde el 1 de diciembre de 2026, salvo que se apruebe la postergación que hoy se tramita.

### 10. Cómo se mide

Este caso no promete ventas. El piloto mide:

- **Adopción:** contactos registrados sin intervención, ejecutivos activos por semana y contactos que siguen saliendo del número anterior.
- **Resultado:** cuentas con contacto en el período, intentos por canal y horas administrativas declaradas por el equipo.

Diseño del piloto:

- **Línea base:** cuatro semanas antes de habilitar.
- **Tamaño:** 8 a 12 ejecutivos, con un grupo similar que sigue trabajando como hoy para comparar.
- **Duración:** 8 a 12 semanas (indicativo).
- **Decisión:** umbrales de seguir, ajustar o detener, acordados por SGS Chile y la región antes de empezar.

Datos que necesitamos de SGS para dimensionar:

| Dato | Para qué |
| --- | --- |
| Número de ejecutivos del equipo piloto | Tamaño y licencias |
| Teléfonos: de la empresa o personales; Android o iPhone | Instalación y acuerdo de uso |
| WhatsApp actual: personal o de empresa; uso de grupos con clientes | Plan de cambio de canal |
| Llamadas y conversaciones por ejecutivo a la semana (estimación) | Volumen y consumo |
| Edición de Salesforce y complementos contratados | Conector y captura de correo |
| Quién administra la cuenta de Meta de SGS | Alta de WhatsApp de empresa |

### 11. Alternativas consideradas

| Alternativa | Por qué no es la propuesta |
| --- | --- |
| Solo capacidades de Salesforce | La telefonía de Salesforce funciona en el escritorio, no en el celular, y exige licencias nuevas y más configuración regional. No permite empezar sin la región |
| Paneles de Salesforce para la vista de gestión | Refresco manual o programado, tope de paneles por edición, licencia adicional para análisis avanzado, y cada ajuste pasa por la región |
| Conservar el número y el WhatsApp de cada ejecutivo | Requiere una integración a medida, más difícil de aprobar, y no resuelve bien las llamadas |
| Herramientas que leen el WhatsApp personal | Incumplen las reglas de WhatsApp y no son aceptables para la seguridad de SGS |

### 12. Responsabilidades

| Etapa | Efeonce | SGS Chile | Región |
| --- | --- | --- | --- |
| 0. Diagnóstico | Conduce y documenta | Define el equipo y entrega los datos | Informa el estado de la plataforma |
| 1. Correo | Configura lo que corresponde y forma | Reconecta cuentas y valida | Confirma la configuración |
| 2. Piloto | Configura Aircall, pone en marcha el panel, forma y mide | Gestiona seguridad y compras; usa | Recibe los resultados |
| 3. Conexión | Configura el conector, construye la integración de WhatsApp, suma el correo al panel y prueba | Valida con usuarios | Aprueba y despliega |
| 4. Operación | Opera, emite el informe mensual y reporta | Usa y prioriza | Decide la extensión |

### 13. Estructura de la inversión

Los montos se completan al conocer el tamaño del equipo piloto.

1. Licencias de Aircall por usuario, incluido el complemento de WhatsApp.
2. Consumo variable: minutos de llamada y mensajes de WhatsApp.
3. Licencias de Salesforce: ninguna nueva en este esquema.
4. Servicios de Efeonce por etapa: diagnóstico, configuración, integración de WhatsApp y habilitación.
5. Panel de contactabilidad e informe mensual de Efeonce Insights, como servicio recurrente.
6. Operación continua de Efeonce, que incluye el mantenimiento de la integración.

### 14. Riesgos

- **Adopción:** si los ejecutivos siguen usando su número personal en paralelo, el registro queda incompleto. Es el riesgo principal y por eso la habilitación tiene seis pasos.
- **Número fijo:** algunos clientes pueden no reconocer el número nuevo. Se atiende con el aviso previo y el período de convivencia.
- **Seguridad:** SGS debe aprobar a Aircall como proveedor antes de la etapa 2, y a Efeonce como encargado de los datos del panel.
- **Gobierno:** sin aprobación regional no hay etapa 3. Las etapas 1 y 2 conservan su valor aunque la 3 se demore.
- **Cuenta de Meta:** WhatsApp de empresa requiere una cuenta de SGS verificada y una persona con permisos sobre ella para dar de alta cada número; puede depender de un área global.
- **Integración de WhatsApp:** es un desarrollo a medida y la región puede revisarlo con más detalle que un paquete publicado. Por eso su acceso se limita a leer contactos y crear actividades.

### 15. Próximos pasos

1. Revisar este borrador con SGS Chile.
2. Completar los datos del punto 10.
3. Ver la solución funcionando en un ambiente de demostración.
4. Presentarlo en conjunto a la contraparte regional.

---

## Parte B · Notas internas (no entregar)

### B1. Estado de los tres puntos que no se podían afirmar (investigados el 2026-10-10)

**1. WhatsApp de Aircall en Chile: probable que sí, con una condición sobre el número.** La documentación dice que cualquier número de Aircall es elegible y no contiene ninguna restricción por país. La condición práctica: Meta verifica cada número con una llamada de voz desde el extranjero, y Aircall advierte que los números chilenos del rango +56 44 pueden no ser alcanzables desde números no chilenos. Hay que pedir números geográficos, por ejemplo de Santiago, y no nacionales. Sigue faltando una frase de Aircall que nombre a Chile.

**2. Registro de WhatsApp en Salesforce: lo más probable es que el conector no lo haga, y hay una vía segura que construimos nosotros.** El objeto de registro de Aircall en Salesforce guarda "llamada, SMS o MMS"; WhatsApp no figura. Las notas de versión agregan el registro de WhatsApp integración por integración (HubSpot, Zendesk, Intercom, Jobber, Zoho) y Salesforce no aparece hasta julio de 2026. La vía segura: la API pública de Aircall entrega cada mensaje de WhatsApp, enviado o recibido, con texto, número del cliente, línea, ejecutivo y hora. Efeonce construye el servicio que los escribe como actividades en Salesforce. Consecuencias:

- La solicitud a la región suma una integración por API, además del paquete de Aircall. Ya está reflejado en el punto 4 de la sección 7.
- No existe forma de recuperar mensajes anteriores: hay que escuchar desde el primer día del piloto.
- Las líneas deben estar en el modo estándar de Aircall, no en el modo de envío por API.

**3. Llamadas desde la aplicación móvil: sí, con confianza alta.** El registro se configura por número en el panel de Aircall y ocurre en sus servidores, no en el dispositivo; la documentación dice que se registra "cada llamada hecha o recibida con Aircall". La tabla de diferencias entre móvil y escritorio no incluye el registro en CRM. Queda como comprobación de la demostración, no como duda.

Efecto en el diseño: en el móvil el etiquetado de llamadas no se puede hacer obligatorio. El "resultado" del informe debe salir del estado de la llamada (contestada, no contestada, buzón), no de una etiqueta manual.

Preguntas que siguen abiertas para Aircall: confirmación expresa de Chile, y si el registro nativo de WhatsApp en Salesforce existe o está en su hoja de ruta. Lista completa en la sección 9 de la [propuesta de habilitación](PROPUESTA-DE-HABILITACION.md).

### B1b. Panel e informe sobre Efeonce Insights: qué implica para nosotros

Decisión de Julio (2026-10-10): la vista de gestión es un panel externo y se extiende Efeonce Insights para sostenerlo.

Cómo se alimenta, sin leer el CRM completo:

- Llamadas y WhatsApp: del mismo servicio que recibe los eventos de Aircall para escribirlos en Salesforce.
- Cuenta de cada contacto: del vínculo que la integración ya resuelve al registrar el mensaje. Solo para contactos efectivamente contactados.
- Correo: conteo de actividades leído de Salesforce, en la etapa 3.

Qué es desarrollo nuevo en Greenhouse:

- Un módulo dueño de las métricas de contactabilidad, del que Insights lea. Hoy Insights solo lee de SEO, AEO e ICO.
- La ingesta de eventos de Aircall y su almacenamiento por organización.
- Una superficie de panel vivo. El motor de Insights produce ediciones selladas por ventana de fechas; el panel reutiliza su sistema visual, no su ciclo de ediciones.
- El alta de SGS como organización con el módulo de Insights, para el informe mensual.

Pendiente antes de comprometer plazo o precio con SGS:

- **Decisión de arquitectura.** Dominio, esquema y frontera del módulo nuevo, y dónde vive el panel. Corresponde un ADR y luego tareas bajo el programa de Insights.
- **Revisión de seguridad.** SGS evaluará a Efeonce como proveedor que guarda datos de contacto de sus clientes. No sé qué certificaciones tenemos; hay que saberlo antes de la reunión.
- **Respaldo.** Si seguridad no aprueba datos en nuestra infraestructura, montar el panel dentro del entorno de SGS. No usaría nuestro motor.
- **Transferencia internacional.** Greenhouse corre fuera de Chile; va en el acuerdo de tratamiento de datos.

Valor más allá de SGS: el módulo sirve a cualquier cliente con Aircall, con Salesforce o con HubSpot.

### B2. Respecto de la reunión del 29-09

En la reunión se dijo que llamadas y WhatsApp están "de forma nativa" en Salesforce (19:30). Solo con Salesforce no se sostiene; con Aircall, el fondo de la promesa sí se cumple: el ejecutivo trabaja desde su celular y el registro ocurre solo. La sección 11 lo explica como alternativa descartada, sin aludir a la reunión.

Objetivo fijado por Julio el 2026-10-10: que Bárbara tenga toda la trazabilidad, igual que José Pedro. La sección 3 lo recoge con las dos vistas.

### B3. Por qué este diseño lleva a que Efeonce construya

- Las etapas 0, 1 y 2 no dependen de la región: se puede empezar con una decisión de SGS Chile.
- Aircall llega por nosotros.
- El conector, el informe y la captura de correo son configuración en Salesforce que hacemos con la región.
- La habilitación en terreno y en español no la puede hacer la región a distancia.
- La operación y la extensión quedan planteadas desde el inicio.

Preguntas para Bárbara:

1. ¿SGS Chile puede contratar una herramienta de comunicación y servicios localmente?
2. ¿Existe un estándar corporativo de telefonía o un proveedor global?
3. ¿Qué unidad levantó antes la contactabilidad y qué respondió la región?
4. ¿La contraparte regional decide sobre la plataforma, o solo canaliza la solicitud?
5. ¿Qué ve Bárbara hoy en Salesforce: solo sus actividades o las de toda el área comercial? El informe depende de la jerarquía de usuarios.

### B4. Pendientes antes de enviar

- **Respuestas de Aircall** (B1).
- **Demostración:** Aircall más una organización Salesforce de desarrollo, con una llamada y un WhatsApp desde el celular apareciendo en la ficha.
- **Condiciones con Aircall:** si revendemos o referimos, y a qué precio. Referencia de lista pública: plan Professional US$50 por licencia al mes en contrato anual, mínimo tres licencias; el conector de Salesforce exige ese plan; complemento de WhatsApp US$10 por licencia. No usar estas cifras con SGS sin confirmar las nuestras.
- **Registro de partnerships:** Aircall no figura en `EFEONCE_PARTNERSHIP_REGISTRY_V1.md`.
- **Honorarios de Efeonce:** cotizar al tener el tamaño del equipo.
- **Duraciones:** las del piloto y la convivencia son propuestas, no estimaciones de capacidad.
- **Revisión legal:** las condiciones de la sección 9 son orientación; pasar por la skill legal antes de enviar.
- **Tipo de número:** revisar si los prefijos chilenos para llamadas comerciales masivas (600 y 809) alcanzan a llamadas de un ejecutivo de cuenta.
- **Formato de entrega:** documento membretado o láminas.
- **Ricardo Valenzuela:** sin correo verificado; no recibió la minuta.

### B5. Evidencia

La evidencia completa, con su grado de verificación, está en la sección 12 de la [propuesta de habilitación](PROPUESTA-DE-HABILITACION.md). Fuentes del caso:

- Transcripción de la [reunión HubSpot 115791682150](https://app.hubspot.com/contacts/48713323/record/0-47/115791682150), leída completa el 2026-10-10.
- Minuta «Minuta y próximos pasos | SGS + Efeonce», enviada el 2026-09-29. Sin respuesta de SGS al 2026-10-10.
- [Expediente del prospecto](PROSPECT-CASE.md).
