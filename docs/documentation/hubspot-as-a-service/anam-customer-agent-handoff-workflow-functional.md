# Cómo Emma deriva cada solicitud al equipo ANAM

> **Tipo:** Documentación funcional para cliente
> **Versión:** 1.1
> **Actualizado:** 2026-09-02
> **Cliente:** ANAM
> **Alcance:** Customer Agent `Emma`, chat web y distribución humana
> **Especificación técnica:** [`../../architecture/kortex/hubspot-as-a-service/anam-customer-agent-handoff-workflow-1876744588.md`](../../architecture/kortex/hubspot-as-a-service/anam-customer-agent-handoff-workflow-1876744588.md)

## Objetivo

El flujo permite que Emma atienda primero, conserve el contexto de la consulta y, cuando se necesita una persona,
derive el caso al integrante adecuado del equipo ANAM. La distribución considera dos variables: el motivo principal
de la consulta y la disponibilidad actual de las personas responsables.

El visitante no tiene que volver a explicar su caso. El ticket conserva la conversación y el resumen reunido por
Emma para que la atención humana continúe con contexto.

## Recorrido completo, paso a paso

### 1. La persona conversa con Emma

El visitante escribe en el chat de la landing de ANAM. Emma responde preguntas respaldadas por el conocimiento
publicado y solicita sólo los antecedentes necesarios para entender el caso.

### 2. Emma identifica que hace falta una persona

La transferencia se activa cuando la persona la solicita expresamente o cuando el requerimiento exige una acción
humana que Emma no debe ejecutar. Pedir “quiero hablar con una persona” activa el handoff; no designa por sí solo
al destinatario.

### 3. HubSpot crea un ticket en Help Desk

El modo `Live handoff` mantiene abierto el mismo chat y crea el ticket operativo en la bandeja `Asistencia al
cliente`. La conversación previa queda asociada para que ANAM reciba el contexto.

### 4. El workflow resume el caso

HubSpot prepara un resumen del ticket y de la conversación. Esta síntesis reduce la lectura inicial del equipo y
entrega una entrada común para clasificar casos breves o extensos.

### 5. Se identifica la necesidad principal

El sistema interpreta el contenido sustantivo y selecciona una categoría:

- cotización o nuevo negocio;
- seguimiento de un servicio en curso;
- calidad, facturación u otro requerimiento;
- sin clasificación, si no puede concluir con seguridad.

La clasificación considera el significado completo del caso. Palabras administrativas usadas en pruebas, como
`QA` o `test`, no cambian por sí solas la categoría.

### 6. Emma deja de figurar como propietaria

Emma puede aparecer inicialmente como propietaria técnica del ticket. El workflow limpia ese dato antes del
routing para que el caso pueda pasar correctamente a una persona de ANAM.

### 7. Se intenta asignar a la persona principal

Cada categoría tiene una persona principal. HubSpot comprueba su disponibilidad antes de asignar el ticket.

### 8. Se intenta el reemplazo si hace falta

Si la persona principal está ausente, el ticket permanece libre y se intenta la persona de reemplazo. Si la
principal recibió el ticket, la segunda acción no la sustituye.

### 9. La persona asignada continúa en el mismo chat

Cuando existe un owner disponible, esa persona recibe el ticket y puede continuar la conversación desde Help Desk
con el contexto anterior. Emma no anuncia un nombre antes de que la asignación sea efectiva.

### 10. Si nadie está disponible, el caso no se pierde

Si la persona principal y su reemplazo están ausentes, el ticket queda sin propietario y el chat permanece
abierto. El equipo debe vigilar la cola sin asignar; el sistema no promete una asignación que no ocurrió.

## Matriz de distribución

| Tipo de solicitud | Responsable principal | Reemplazo si está ausente |
|---|---|---|
| Cotización, precio, propuesta o servicio nuevo | Pablo Puga | María Paz Haeger |
| Resultados, programación, estado o facturación de un servicio en curso | Marco Jiménez Venegas | Pablo Puga |
| Felicitaciones, apelaciones, quejas, calidad, incidencia de facturación u otros | María Paz Haeger | Marco Jiménez Venegas |
| Caso sin clasificación suficiente | María Paz Haeger | Marco Jiménez Venegas |

## Ejemplos sencillos para explicar al cliente

**“Necesito una cotización para análisis de agua.”**

Emma reúne el contexto, se crea el ticket, el caso se clasifica como nuevo negocio y se intenta a Pablo. Si Pablo
está ausente, se intenta a María Paz.

**“¿Cuándo estarán listos los resultados de mi servicio?”**

El caso se clasifica como seguimiento. Se intenta a Marco y, si está ausente, a Pablo.

**“Quiero reportar una inconformidad con el informe recibido.”**

El caso se clasifica como Calidad. Se intenta a María Paz y, si está ausente, a Marco.

**“Necesito ayuda con un tema que no aparece entre las opciones.”**

El caso entra a la ruta de contención. Se intenta a María Paz y luego a Marco.

## Solicitudes por nombre y cambios entre personas

Si el visitante escribe “quiero hablar con Pablo”, Emma entiende que necesita atención humana, pero el routing
actual sigue la categoría y la disponibilidad. Por eso no debe prometer que Pablo será el owner hasta que HubSpot
lo confirme.

Una vez que una persona recibió el caso, el equipo puede reasignar manualmente el propietario en Help Desk. La
segunda persona continúa en el mismo chat y conserva el historial mientras la conversación permanezca abierta.
Terminar el chat cierra esa continuidad: la conversación terminada no puede reabrirse.

## Responsabilidad de cada participante

| Participante | Responsabilidad |
|---|---|
| Emma | Orientar, reunir contexto, detectar la necesidad humana y activar el handoff sin prometer un destinatario no confirmado. |
| HubSpot | Crear el ticket, resumir, clasificar, consultar disponibilidad y ejecutar la matriz de propietarios. |
| Pablo, Marco y María Paz | Mantener su disponibilidad al día, atender los tickets asignados y reasignar cuando corresponda. |
| Equipo que monitorea Help Desk | Vigilar tickets sin propietario, fallas de clasificación y continuidad del chat. |
| Efeonce | Mantener el contrato documentado, revisar evidencia y ejecutar cambios aprobados con pruebas. |

## Qué se probó

El 1 de septiembre de 2026 se completaron tres conversaciones públicas de punta a punta:

- cotización asignada a Pablo;
- seguimiento con Marco ausente, asignado correctamente al reemplazo Pablo;
- requerimiento de Calidad asignado a María Paz.

Estas pruebas confirmaron la creación del ticket, clasificación, distribución, propietario efectivo y actualización
visible en el chat. Los tickets de evidencia son `48103069613`, `48105602378` y `48094218332`.

## Qué queda por validar en una prueba acompañada

Para cerrar también la experiencia humana, conviene ejecutar una ventana coordinada con ANAM y comprobar:

1. que la persona asignada responde realmente desde Help Desk;
2. que una reasignación manual permite a una segunda persona continuar en el mismo chat;
3. que, con principal y reemplazo ausentes, el ticket queda visible en la cola sin owner;
4. que los mensajes del visitante y la respuesta humana mantienen el contexto esperado.

Lo anterior no impide el funcionamiento probado del routing; son evidencias adicionales de continuidad operativa.

## Entrega y período de soporte

ANAM recibe dos documentos finales: una especificación técnica y esta explicación funcional, ambas en PDF. Los
archivos editables se conservan en HTML/CSS para mantener tipografía, composición y marca sin depender de Word.

El soporte para el proyecto Customer Agent y el proyecto KPI es de **tres meses: del 13 de agosto al 12 de
noviembre de 2026, ambas fechas incluidas**. Durante ese período Efeonce cubre incidentes y correcciones sobre lo
construido, dudas de uso u operación, revisión de comportamientos inesperados, recuperación de la configuración
entregada y actualización documental cuando una corrección lo requiera.

El soporte no incorpora nuevas funcionalidades, KPI adicionales, nuevos workflows o automatizaciones,
integraciones, rediseños ni innovaciones. Esas necesidades se evalúan y cotizan como evolución independiente.
Efeonce comunicará durante la semana del 2 de septiembre el SharePoint que consolidará la documentación; hasta
que el enlace sea enviado, esa entrega permanece pendiente.

## Guion breve para presentarlo en reunión

> Emma resuelve primero las consultas que están dentro de su conocimiento. Cuando hace falta una persona, mantiene
> el mismo chat, crea un ticket y conserva el contexto. HubSpot resume el caso, identifica si corresponde a
> cotización, seguimiento o Calidad, y consulta la disponibilidad del responsable principal. Si esa persona está
> ausente, intenta automáticamente al reemplazo definido. Si ambos están ausentes, el ticket queda visible y sin
> asignar para no prometer una atención que todavía no ocurrió. El equipo puede reasignarlo manualmente sin perder
> el historial mientras el chat continúe abierto.

## Documentos relacionados

- [PDF funcional para ANAM](../../architecture/kortex/hubspot-as-a-service/reports/ANAM_Emma_Handoff_Documentacion_Funcional_2026-09-02.pdf)
- [PDF técnico para ANAM](../../architecture/kortex/hubspot-as-a-service/reports/ANAM_Emma_Handoff_Especificacion_Tecnica_2026-09-02.pdf)
- [Correo de entrega y contrato de soporte](anam-entrega-documentacion-y-soporte-2026-09-02.md)
- [Servicio ANAM HubSpot de punta a punta](anam-hubspot-managed-service-end-to-end.md)
- [QA E2E del handoff](../../audits/ANAM_CUSTOMER_AGENT_HANDOFF_E2E_QA_2026-09-01.md)
- [Manual de operación](../../manual-de-uso/hubspot-as-a-service/operar-anam-hubspot-managed-service.md)
