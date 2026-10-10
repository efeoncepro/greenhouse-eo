# Propuesta de habilitación · SGS Chile · Trazabilidad comercial

**Corte:** 10 de octubre de 2026 · **Uso interno** · **Responsable:** Julio Reyes.

**Estado:** propuesta de trabajo de Efeonce, resultado de cuatro investigaciones de mercado con verificación de los puntos decisivos. No enviada. Alimenta la próxima versión del [caso de negocio](CASO-DE-NEGOCIO.md).

## 1. Qué proponemos

Un programa de trazabilidad comercial en cuatro capas. Cada capa entrega algo útil por sí sola y deja preparada la siguiente.

| Capa | Qué entrega | A quién sirve primero | Depende de la región |
| --- | --- | --- | --- |
| 0. Diagnóstico exprés | Estado real del correo en Salesforce, inventario de teléfonos y WhatsApp del equipo, reglas de seguridad | A todos: decide el resto | No |
| 1. Correo y reuniones | El correo con clientes queda en la ficha, sin anotarlo | José Pedro | Poco o nada, según el diagnóstico |
| 2. Llamadas y WhatsApp | Cada llamada y conversación queda registrada | Bárbara y el equipo comercial | Sí: un conector |
| 3. Vista de gestión | Informe de intentos por cliente, canal y resultado; clientes sin contacto | Bárbara | Sí: ajustes menores |
| Habilitación (transversal) | El equipo adopta la forma de trabajo | El equipo comercial | No |

El orden importa: se empieza por donde hay menos fricción y más valor inmediato, y se llega a la región con algo funcionando.

## 2. Capa 0 · Diagnóstico exprés

Dura una a dos semanas y no requiere a la región.

**Cuatro comprobaciones que José Pedro y Bárbara pueden hacer solos:**

1. En Salesforce, configuración personal, "Cuentas conectadas" → "Cuentas de correo y calendario". Si aparece una cuenta, la captura automática está activa. Si dice "Requiere atención", falta reconectarla.
2. En Outlook, en el panel de Salesforce: si el botón dice "Compartir" en lugar de "Registrar correo", la captura automática ya toma su correo.
3. Si el panel dice "Pide permiso a tu administrador para registrar correo", falta una configuración de la región.
4. En Salesforce, configuración personal, "Mi Email to Salesforce": si existe la página con una dirección, la vía de copia oculta está activa.

**Alerta con fecha:** Microsoft retiró este mes (octubre de 2026) el protocolo que usaban las integraciones antiguas de Salesforce con Outlook. Cada usuario debía reconectar su cuenta. Si las reuniones dejaron de registrarse solas en las últimas semanas, esa es la causa probable. Preguntarlo es útil para ellos y nos da el primer dato del diagnóstico.

**Inventario del equipo piloto:**

- Teléfonos: Android o iPhone; de la empresa o personales; administrados por TI o no.
- Líneas: número personal o corporativo; quién paga.
- WhatsApp: aplicación personal o WhatsApp Business; uso de grupos con clientes.
- Volumen estimado de llamadas y conversaciones por semana.

**Reglas:** proceso de evaluación de proveedores de SGS, estándar corporativo de telefonía si existe, y quién administra la cuenta de Meta de SGS.

## 3. Capa 1 · Correo y reuniones

Hay tres vías y el diagnóstico decide cuál.

| Si el diagnóstico muestra | Qué se hace | Qué se le pide a la región |
| --- | --- | --- |
| Captura automática activa | Reconectar cuentas y pedir que los correos se guarden como actividades con informes | Confirmar esa configuración e incluir a los usuarios del piloto |
| Captura inactiva, complemento de Outlook disponible | Usar el complemento con registro al enviar | Activar dos ajustes de correo si no lo están |
| Solo copia oculta activa | Regla de Outlook que agrega la copia oculta en los correos a clientes | Nada |

Límites que hay que conocer: la captura automática solo crea registro si el correo coincide con un contacto existente, no guarda adjuntos ni correos internos, y en organizaciones antiguas requiere una migración que Salesforce está aplicando por tandas durante 2026.

Descartado: el asistente de ventas de Microsoft. Exige licencia de Copilot por usuario, guarda cada correo a mano y crea un almacén de datos fuera de Salesforce.

## 4. Capa 2 · Llamadas y WhatsApp

No existe una opción sin costo de cambio. Hay dos variantes y una pregunta las separa: **¿acepta SGS que el ejecutivo pase a un número de empresa, o es indispensable que conserve su número y su WhatsApp actuales?**

### Variante A · Número de empresa en Aircall

El ejecutivo llama y escribe desde la aplicación de Aircall en su celular. Un solo proveedor, un solo conector en Salesforce.

- **A favor:** somos partners; un paquete cubre llamadas y WhatsApp; registra también las llamadas no contestadas; usa la interfaz oficial de WhatsApp; el piloto puede empezar sin Salesforce.
- **En contra:** Aircall no ofrece números móviles chilenos. Solo fijos, nacionales y 800, todos por solicitud a soporte. El cliente vería llamadas desde un número fijo. WhatsApp no admite grupos y el historial anterior se pierde.
- **Atenuante por confirmar:** Aircall permite conectar a WhatsApp un número externo. Si eso incluye el celular actual del ejecutivo, el cliente seguiría escribiendo al mismo número.

### Variante B · Conservar número y hábito

El ejecutivo sigue en la aplicación WhatsApp Business de su teléfono, con su número. Los mensajes llegan a Salesforce por la "coexistencia" de Meta, a través de un proveedor oficial y un conector que construye Efeonce.

- **A favor:** casi no cambia el hábito, que es el mayor riesgo de adopción; conserva seis meses de historial; es trabajo de construcción nuestro.
- **En contra:** suma un proveedor y un desarrollo a medida, más difícil de aprobar para la región que un paquete ya revisado; no sincroniza grupos; exige WhatsApp Business, no el WhatsApp personal; Aircall no lo soporta.
- **Llamadas en esta variante:** la única captura verificada que conserva el número es Salestrail, y solo está documentada a fondo para Android. No publica certificaciones de seguridad. Es un candidato débil para una multinacional; la alternativa realista es el registro asistido desde la aplicación móvil de Salesforce.

### Comparación

| Criterio | A · Aircall | B · Conservar número |
| --- | --- | --- |
| Cambio para el ejecutivo | Alto: número y aplicación nuevos | Bajo en WhatsApp; llamadas sin resolver bien |
| Cobertura de llamadas | Completa, incluidas las no contestadas | Parcial |
| Cobertura de WhatsApp | Completa, sin grupos | Completa, sin grupos |
| Qué se le pide a la región | Instalar un paquete | Aprobar una integración a medida |
| Proveedores | Uno | Dos o tres |
| Puede empezar sin Salesforce | Sí | No |
| Riesgo principal | Que el equipo siga usando su número personal | Que la región no apruebe o Meta no cubra Chile |

### Recomendación

Proponer la variante A como base, porque es la que la región puede aprobar con menos fricción y la que cubre llamadas de verdad. Tener la variante B lista para WhatsApp si SGS declara que el número no se toca. No prometer ninguna hasta cerrar la capa 0 y las confirmaciones de Aircall de la sección 9.

Descartadas: herramientas que leen el WhatsApp personal sin interfaz oficial (TimelinesAI, Eazybe, Cooby). Violan las reglas de WhatsApp y entregan a un tercero la sesión completa del ejecutivo. También la mensajería nativa de Salesforce para este piloto: su página oficial solo la ofrece sobre el producto de servicio.

Otros proveedores con números chilenos, por si Aircall no resulta: CloudTalk es el único verificado que ofrece números móviles chilenos (+56 9) con voz. No somos partners.

## 5. Capa 3 · Vista de gestión

Se construye con informes estándar de Salesforce sobre actividades.

- **Intentos por cliente y canal:** tipos de informe "Tareas y eventos" y "Actividades con cuentas", filtrados por tipo de actividad.
- **Clientes sin contacto:** informe de cuentas con filtro cruzado "sin actividades".
- **Límite:** Salesforce no tiene un tipo de actividad "WhatsApp". El canal debe venir en un campo del conector o en un valor nuevo que agrega la región.
- **Límite:** un usuario solo ve actividades propias y de sus subordinados en la jerarquía. Hay que confirmar qué ve Bárbara.

## 6. Lo que se le pide a la región

Cinco cosas, todas acotadas:

1. Confirmar el estado de la captura de correo e incluir a los usuarios chilenos del piloto.
2. Instalar el paquete del conector, primero en ambiente de pruebas y luego en producción en modo "solo administradores", con permisos asignados únicamente al grupo piloto.
3. Un usuario de integración, si el conector lo requiere. Las ediciones Enterprise y Unlimited incluyen cinco.
4. Un valor "WhatsApp" en el tipo de actividad, si el conector no trae campo propio.
5. Un tipo de informe "cuentas con o sin actividades" y una carpeta compartida para los informes.

Argumento de reversibilidad: el paquete se desinstala desde la configuración y elimina sus componentes; las actividades estándar ya creadas permanecen.

Qué suele exigir un centro de excelencia antes de aprobar: métricas de éxito definidas de antemano, revisión de arquitectura, evaluación de seguridad, impacto en los datos y un aprobador nombrado. El caso de negocio debe traer esas cinco piezas.

## 7. Habilitación del equipo

Seis pasos:

1. **Codiseño con los ejecutivos:** qué se registra y qué no.
2. **Acuerdo de uso:** quién ve qué. Se miden cuentas, no personas.
3. **Entrega:** números, firma, tarjeta de contacto y aviso a los clientes por correo.
4. **Convivencia** de cuatro a ocho semanas, con respuesta automática y desvío en el número anterior.
5. **Acompañamiento semanal,** con un tablero que el ejecutivo ve antes que su jefatura.
6. **Cierre** con datos comparados contra la línea base y decisión según umbrales acordados antes de empezar.

Cinco condiciones desde el primer día:

1. Base legal documentada y política de datos actualizada: finalidad, destinatarios, transferencia internacional y plazo de conservación.
2. Sin grabación ni transcripción de llamadas. Solo quién, cuándo, canal y resultado.
3. La medida consta en el reglamento interno o en un anexo de contrato antes de activarse: general, impersonal y sin uso disciplinario individual.
4. Número y aplicación de empresa separados de lo personal. Si se usa el celular propio, acuerdo escrito y costos a cargo de SGS. Nunca se captura el WhatsApp personal.
5. Consentimiento del cliente para WhatsApp, registrado por contacto.

Esto es orientación, no asesoría legal. SGS debe validarlo con su área legal.

## 8. Piloto

- **Línea base:** cuatro semanas antes de habilitar.
- **Tamaño:** 8 a 12 ejecutivos, con un grupo similar de comparación. Resultado direccional, no estadístico.
- **Adopción:** actividad capturada sin intervención, usuarios activos por semana, contactos que siguen saliendo del número anterior.
- **Resultado:** cobertura de cuentas, intentos por canal, horas administrativas declaradas. No se promete efecto en ventas en doce semanas.
- **Decisión:** umbrales de seguir, ajustar o detener, firmados por Chile y la región antes de empezar.

Cifras que se pueden citar ante la región:

- El vendedor promedio dedica el 40% de su tiempo a vender (Salesforce State of Sales 2026, 4.050 encuestados en 22 países; no incluye Chile).
- Se requieren en promedio ocho contactos para lograr una primera reunión (RAIN Group, 2018; mide reunión inicial, no venta).
- La línea base del propio piloto, que será la más convincente.

No usar: "el 80% de las ventas requiere cinco seguimientos", "el 44% abandona tras un intento", ni ahorros de horas tomados de estudios pagados por proveedores.

## 9. Preguntas para Aircall antes de comprometer la variante A

Pedir respuesta por escrito:

1. ¿Una cuenta facturada en Chile puede contratar el complemento de WhatsApp, y un número chileno de Aircall puede activarlo?
2. ¿Se puede conectar a WhatsApp el número móvil actual de un ejecutivo como número externo?
3. ¿En qué objeto de Salesforce quedan los mensajes de WhatsApp y con qué campos?
4. ¿Las llamadas hechas desde la aplicación móvil se registran en Salesforce igual que las de escritorio?
5. ¿El registro en Salesforce sigue funcionando después del retiro de Open CTI en febrero de 2028 sin pasar a la versión sobre Salesforce Voice?
6. ¿En qué región se alojan los datos, y existe certificación ISO 27001 o solo alineamiento?
7. ¿Se puede mostrar como identificador de llamada un número que no sea de Aircall, y cómo se resuelve el desvío desde el celular actual?

## 10. Lo que puede cambiar la decisión

- **Momentum.** Producto de Salesforce que captura calendario, correo y videollamadas hacia el CRM. Requiere Data 360, es incompatible con la captura automática actual y no menciona WhatsApp. No sirve para el piloto, pero la región puede citarlo para pedir que se espere.
- **Retiro de Open CTI,** 28 de febrero de 2028. Afecta al conector clásico de telefonía.
- **Ley 21.719 de datos personales.** Rige desde el 1 de diciembre de 2026. Hay un proyecto del Ejecutivo para postergarla a diciembre de 2027, en primer trámite en el Senado al 4 de octubre, sin votar. Hasta que se publique, la fecha vigente es 2026.
- **Cobro de WhatsApp.** Fuentes de proveedores indican que desde el 1 de octubre de 2026 Meta cobra también mensajes dentro de la ventana de 24 horas, con mil gratuitos por número al mes. La página de Meta consultada aún decía lo contrario. Confirmar antes de estimar consumo.
- **Números 600 y 809 en Chile.** Un proveedor los describe como prefijos para llamadas comerciales masivas. No verifiqué la norma ni si alcanza a llamadas uno a uno de un ejecutivo de cuenta. Revisar antes de elegir tipo de número.

## 11. Próximas acciones

1. Enviar a Aircall las preguntas de la sección 9.
2. Enviar a Bárbara y José Pedro el correo de abajo, previa revisión de Julio.
3. Montar la demostración: Aircall más una organización Salesforce de desarrollo.
4. Con las respuestas, reescribir el caso de negocio con una sola variante.

### Borrador de correo (no enviado)

> Hola Bárbara y José Pedro:
>
> Avancé con el caso de contactabilidad. Antes de mostrarles el primer planteamiento necesito aterrizar cinco cosas de su operación; con eso lo que les lleve va a calzar con SGS.
>
> 1. ¿Cuántos ejecutivos comerciales tendría el equipo piloto?
> 2. ¿Usan celular de la empresa o personal? ¿Android o iPhone?
> 3. ¿Escriben a clientes desde WhatsApp personal o desde WhatsApp Business? ¿Usan grupos con clientes?
> 4. ¿Sería viable que el equipo use un número de empresa para llamadas y WhatsApp, o es importante conservar el número actual?
> 5. José Pedro: en Outlook, ¿ves el panel de Salesforce? Si lo ves, ¿el botón dice "Registrar correo" o "Compartir"?
>
> Un dato que les puede servir desde ya: Microsoft cambió este mes la forma en que Outlook se conecta con Salesforce, y cada usuario tuvo que reconectar su cuenta. Si notaron que las reuniones dejaron de registrarse solas, esa es la causa probable y tiene arreglo simple.
>
> ¿Les acomoda una llamada de 30 minutos esta semana para revisarlo?
>
> Un abrazo,
> Julio

## 12. Evidencia y grado de verificación

Contrastado directamente por la sesión principal:

- [Números de Aircall por país](https://support.aircall.io/en-gb/articles/26567725155741): Chile tiene geográfico, nacional y 800; ningún tipo móvil; ninguno en autoservicio; advertencia sobre el rango +5644.
- [Conectar un número a WhatsApp en Aircall](https://support.aircall.io/en-gb/articles/26799936028061): el número externo debe desvincularse de WhatsApp y se pierde el historial; la verificación es por llamada de voz.
- [Salestrail para Salesforce](https://www.salestrail.io/salesforce): captura de llamadas de la SIM en Android; llamadas de WhatsApp, no mensajes; sin datos de seguridad ni del lado Salesforce.
- [Números de CloudTalk en Chile](https://www.cloudtalk.io/virtual-number-chile/): móvil +56 9 con voz, sin SMS.
- Retiro de EWS y reconexión de cuentas: confirmado en la ayuda de Salesforce sobre [la captura automática](https://help.salesforce.com/s/articleView?language=en_US&id=sales.einstein_sales_aac.htm&type=5).
- Ley 21.719: vigencia y proyecto de postergación confirmados en [Garrigues](https://www.garrigues.com/es_ES/noticia/chile-ejecutivo-presenta-proyecto-postergar-entrada-vigor-nueva-ley-proteccion-datos) y prensa; no consulté el boletín del Senado.

Reportado por los investigadores con fuente leída, sin segundo contraste:

- [Coexistencia de Meta](https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users): mensajes de la aplicación llegan al proveedor; seis meses de historial; sin grupos.
- [Coexistencia en Infobip](https://www.infobip.com/docs/whatsapp/manage-integration/coexistence): excluye Nigeria y Sudáfrica; Chile no aparece nombrado.
- [Reglas de WhatsApp contra clientes no oficiales](https://www.whatsapp.com/legal/messaging-guidelines?lang=en).
- [Instalación](https://help.salesforce.com/s/articleView?id=xcloud.distribution_installing_packages.htm&type=5) y [desinstalación](https://help.salesforce.com/s/articleView?id=xcloud.distribution_uninstalling_packages.htm&type=5) de paquetes en Salesforce.
- [Campos de la actividad en Salesforce](https://developer.salesforce.com/docs/atlas.en-us.object_reference.meta/object_reference/sforce_api_objects_task.htm): no existe subtipo WhatsApp.
- [Requisitos de Momentum](https://help.salesforce.com/s/articleView?id=sales.mci_requirements.htm&type=5).
- [Salesforce State of Sales 2026](https://www.salesforce.com/news/stories/state-of-sales-report-announcement-2026/).
- [Ley 21.719 en la Biblioteca del Congreso](https://www.bcn.cl/leychile/navegar?idNorma=1209272).

Sin verificar:

- WhatsApp de Aircall para cuentas y números chilenos.
- Objeto de Salesforce donde Aircall registra WhatsApp.
- Coexistencia de Meta disponible en Chile.
- Registro de llamadas desde la aplicación móvil de Aircall, que solo aparece en material comercial.
- Alcance de Salestrail en iPhone.
