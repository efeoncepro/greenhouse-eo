# Convertir un negocio existente en negocio compartido con HubSpot

Regla de Julio del 18/10/2026: al registrar un negocio compartido autorizado, seleccionar siempre **Partner** en «¿Quién debería dirigir el negocio de aquí en adelante?». El liderazgo se elige expresamente; «Colaboración iniciada por el partner» es otro campo y no sustituye esta selección. La preferencia no autoriza convertir todos los negocios ni enviar mensajes adicionales.

Dueños: `hubspot-solutions-partner` para registro/colaboración; `hubspot-as-a-service` para operación del portal. Aplicar [identidad, permisos y readback](../../operations/HUBSPOT_AGENT_CLI_MCP_OPERATOR_V1.md). Procedimiento observado el 18/10/2026 en Efeonce `48713323`; volver a leer el formulario al reutilizarlo. Se documenta una capacidad existente, sin cambiar acceso, contratos ni automatizaciones.

## Flujo observado en la interfaz

1. Abrir el negocio correcto y comprobar portal, empresa principal, contactos asociados y autorización. Evitar un segundo Deal. La documentación oficial exige empresa/contacto y capacidad disponible del partner.
2. En la columna derecha, «Negocios compartidos» → **Convertir en negocio compartido**.
3. Revisar nombre, pipeline, etapa, propietario, empresa y contacto asociado. El formulario observado exige fecha de cierre: usar la estimación comercial indicada por el operador, separada del plazo del comprador. No inventar una fecha de licitación. Comprobar después tanto el valor local como el mostrado en la tarjeta compartida.
4. Leer la declaración sobre privacidad y acuerdos del Solutions Partner Program. Cuando requiera una declaración que el agente no puede acreditar, obtener confirmación concreta del operador antes de marcarla; no atribuir consentimiento al cliente. En Esenttia Julio confirmó expresamente la declaración.
5. «Siguiente». Revisar representantes y avisos de actividad existente de HubSpot. No asignarse exclusividad ni presumir que el aviso confirma una venta o adjudicación.
6. Elegir sólo productos y ediciones respaldados; dejar sin seleccionar partners tecnológicos e intercambio cuando no correspondan. Describir la oportunidad y las incertidumbres con hechos. Este contenido se publica como mensaje compartido con HubSpot al terminar el registro.
7. En **«¿Quién debería dirigir el negocio de aquí en adelante?» elegir «Partner»**, y comprobar que quedó seleccionado. Elegir la cercanía de compra según conversaciones reales. Un requerimiento público no permite afirmar que el prospecto está listo para firmar. La opción observada «Aún no hemos hablado de HubSpot» despliega campos obligatorios de ayuda requerida y próximos pasos.
8. Completar esos campos sin inventar conversaciones, autoridad, presupuesto, calendario ni interés. «Crear negocio compartido» una sola vez. Si hay demora, leer el registro antes de reintentar para evitar duplicados.
9. Verificar tarjeta compartida, mensaje publicado con **liderazgo Partner**, productos, representantes, etapa compartida y fecha. Guardar captura y lectura independiente de propiedades del Deal local. Una property aislada o un cambio de pipeline no demuestra la conversión.

## Redacción y edición del contexto compartido

Corrección de Julio del 18/10/2026: el destinatario es el especialista de crecimiento de HubSpot. Escribir como interlocutor comercial de Efeonce: qué necesita la empresa, qué queremos trabajar juntos, qué hemos conversado realmente y qué apoyo o siguiente paso pedimos. Usar frases naturales y preguntas concretas; mantener códigos del radar, auditoría de herramientas, permisos internos y advertencias repetitivas en el expediente privado. Conservar sólo incertidumbres que cambian la decisión comercial.

**Edición directa verificada:** desplegar el mensaje y hacer clic en su **cuerpo** para abrir el editor; reemplazar el texto, pulsar **Guardar** y leerlo de nuevo fuera del editor. El menú «Acciones» no muestra esa vía: su ausencia de «Editar» no prueba que el mensaje sea ineditable. Preferir corregir el mensaje existente antes de publicar otra aclaración. Se comprobó tanto en el contexto automático del registro como en un mensaje compartido posterior. Editar el texto no sustituye verificar las propiedades del negocio.

## Límites y sincronización

El registro compartido y la prueba de participación del cliente (**POI**) son estados diferentes. No afirmar firma del cliente, derecho a comisión, aceptación del comprador ni admisión en una licitación. No enviar POI o mensajes posteriores sin mandato aplicable.

Según la [documentación oficial de creación](https://knowledge.hubspot.com/partner-tools/create-shared-partner-deals), la conversión registra el negocio en el CRM de HubSpot y asigna un representante. Pipeline, etapa, propietario y contacto del registro local no se sincronizan con los registros internos; nombre, empresa y cierre tienen reglas de sincronización específicas. No cambiar el pipeline local para imitar la etapa de HubSpot ni corregir una discrepancia de fechas inventando un dato. La coordinación específica de expansión/renovación, asignación y elegibilidad requiere confirmación del equipo HubSpot cuando no esté acreditada.

## Caso verificado: Esenttia, 18/10/2026

> **Corrección comercial:** el procedimiento de interfaz fue observado, pero la compra usada como caso ya estaba adjudicada aDACARTEC. Julio cerró el Deal10:32 y dejó de sincronizarse. Su registro fue un error de calificación; no usarlo como éxito de prospección ni oportunidad vigente. [Rectificación](../../commercial/prospecting-agent/runs/2026-10-18-1036-esenttia-adjudicada-rectificacion.md).

[Deal 66218288550](https://app.hubspot.com/contacts/48713323/record/0-3/66218288550?defaultTab=shared), HSP-0034: convertido a las 10:08 GMT-3; liderazgo **Partner**, colaboración iniciada por el partner, Marketing Hub Professional y Service Hub Professional. CMS se describe en el mensaje con edición pendiente, sin elegir una edición arbitraria. Cercanía: aún sin conversación. Tarjeta interna: Discovery; pipeline local conservado. La tarjeta muestra PDM y especialista en crecimiento; no hay POI.

Cierre local autorizado **31/12/2026**, lectura API `2026-12-31T03:00:00Z` y encabezado 31/12/2026. La tarjeta «Fecha de cierre de HubSpot» muestra **30/12/2026**: discrepancia observada, causa no confirmada, sin falsear el cierre local para compensarla. Evidencia y seguimiento en el [reporte de ejecución](../../commercial/prospecting-agent/runs/2026-10-18-1002-esenttia-shared-deal.md). Datos individuales y capturas se conservan exclusivamente en el expediente privado.
