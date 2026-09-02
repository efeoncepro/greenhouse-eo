# Workflow técnico de handoff de Emma

> **Tipo:** Especificación técnica y runbook de diagnóstico
> **Cliente/portal:** ANAM / `19893546`
> **Workflow:** `1876744588` — `Reasignar tickets para la transferencia de agentes de clientes`
> **Objeto:** Ticket de Help Desk
> **Estado verificado:** `ACTIVADA`
> **Último readback live:** 2026-09-02
> **Funcional para cliente:** [`../../../documentation/hubspot-as-a-service/anam-customer-agent-handoff-workflow-functional.md`](../../../documentation/hubspot-as-a-service/anam-customer-agent-handoff-workflow-functional.md)
> **Evidencia E2E:** [`../../../audits/ANAM_CUSTOMER_AGENT_HANDOFF_E2E_QA_2026-09-01.md`](../../../audits/ANAM_CUSTOMER_AGENT_HANDOFF_E2E_QA_2026-09-01.md)

## Propósito y límite

Este documento describe la configuración live que distribuye a Pablo Puga, Marco Jiménez Venegas y María Paz
Haeger los tickets que Emma transfiere desde el chat público de ANAM. La directriz de Emma decide **cuándo** se
necesita una persona; el workflow decide **quién** recibe el ticket según intención y disponibilidad.

No es una acción externa de Emma ni una ejecución de un agente mediante workflow. Es un workflow de tickets
seleccionado por el handoff de Customer Agent para Help Desk. Esta lectura documental no cambió ni volvió a
publicar el runtime.

## Arquitectura del flujo

```text
Visitante solicita atención humana o una acción fuera del alcance de Emma
        |
        v
Emma activa Live handoff y HubSpot crea el ticket en Help Desk
        |
        v
Workflow 1876744588: resumir -> clasificar -> borrar owner Emma -> ramificar
        |
        v
Intentar propietario principal disponible -> intentar reemplazo si sigue sin owner
        |
        +--> owner humano asignado: continúa en el mismo chat abierto
        |
        +--> ambos ausentes: ticket sin propietario; el chat permanece abierto
```

## Configuración de entrada

| Parámetro | Valor live | Consecuencia |
|---|---|---|
| Estado | `ACTIVADA` | Puede recibir tickets desde el handoff configurado en Emma. |
| Inscripción | `Solo activado manualmente` | No existe un disparador autónomo por propiedades; Customer Agent invoca el workflow al transferir. |
| Reinscripción | Desactivada | El mismo ticket no vuelve a entrar automáticamente por cambios posteriores. |
| Modalidad de handoff | `Live handoff` | Conserva el hilo abierto y el contexto previo para continuidad humana. |
| Bandeja | Help Desk `Asistencia al cliente` | La unidad de routing es Ticket, no Conversación. |

## Secuencia exacta de acciones

### 1. Resumir registro

- Registro de entrada: ticket inscrito.
- Salida: resumen textual del ticket para la clasificación.
- Razón: concentra el contexto reunido por Emma y los mensajes de la conversación sin depender de una sola
  propiedad breve.
- Límite mostrado por HubSpot: 3.000 ejecuciones mensuales para esta acción. Al agotarse, la acción falla hasta
  el primer día del mes siguiente.

### 2. Enviar a la IA

- Entrada: salida de `1. Resumir registro`.
- Salida nombrada: `Categoría de atención ANAM`.
- Consumo: acción inteligente sujeta a HubSpot/Breeze Credits.
- Contrato: debe devolver una sola de tres etiquetas. El prompt live es:

```text
Clasifica el motivo sustantivo del ticket para enrutarlo. Ignora marcadores administrativos o de prueba como
"PRUEBA", "QA", "test", "interno", "demo", nombres del canal y avisos de que no es una solicitud real; esas
palabras nunca convierten por sí solas un caso en Calidad. Responde exactamente con una sola etiqueta:
COTIZACION_NUEVO_NEGOCIO si el pedido principal solicita cotización, precio, propuesta o un servicio nuevo;
SEGUIMIENTO_SERVICIO si consulta resultados, programación, estado o facturación de un servicio en curso;
CALIDAD_FACTURACION_OTROS si el pedido principal trata felicitaciones, apelaciones, quejas, calidad, una
incidencia de facturación o cualquier otro requerimiento. Si hay varias intenciones, prioriza la necesidad
operativa principal que requiere atención humana. Resumen del ticket: [Resumen de objetos (1. Resumir registro)]
```

La clasificación es semántica, no una búsqueda determinística de palabras. Los marcadores de QA se excluyen
porque en la primera prueba contaminaban el motivo real del caso.

### 3. Editar registro

- Objeto: ticket actual.
- Propiedad: `Propietario del ticket`.
- Cambio: `Borrar`.
- Razón: el ticket llega con Emma como propietaria. Si ese owner permanece, las acciones posteriores configuradas
  para no sobrescribir propietarios se omiten. El borrado habilita la selección humana sin forzar reemplazos.

### 4. Ramificación

La ramificación evalúa `Categoría de atención ANAM` y abre cuatro caminos:

1. `COTIZACION_NUEVO_NEGOCIO`;
2. `SEGUIMIENTO_SERVICIO`;
3. `CALIDAD_FACTURACION_OTROS`;
4. `Sin clasificación` como contingencia.

### 5–12. Asignación principal y reemplazo

Cada ruta contiene dos acciones secuenciales `Rotar registro al propietario`. Todas comparten estas opciones:

- `Sobrescribir cualquier ticket propietario existente`: desactivada.
- `Asignar solo a usuarios disponibles`: activada.
- Si todos los usuarios intentados están ausentes, el ticket queda sin propietario.

| Rama | Primera acción | Segunda acción | Resultado esperado |
|---|---|---|---|
| Cotización / nuevo negocio | Paso 5: Pablo Puga | Paso 9: María Paz Haeger | Pablo si está disponible; María Paz sólo si el ticket sigue sin owner. |
| Seguimiento de servicio | Paso 6: Marco Jiménez Venegas | Paso 10: Pablo Puga | Marco si está disponible; Pablo sólo si el ticket sigue sin owner. |
| Calidad, facturación u otros | Paso 7: María Paz Haeger | Paso 11: Marco Jiménez Venegas | María Paz si está disponible; Marco sólo si el ticket sigue sin owner. |
| Sin clasificación | Paso 8: María Paz Haeger | Paso 12: Marco Jiménez Venegas | María Paz como contención; Marco sólo si el ticket sigue sin owner. |

La segunda acción funciona como reemplazo por composición, no como una función nativa de “backup”: no puede
sobrescribir el owner colocado por la primera. Si la persona principal está ausente, la primera acción no asigna
y la segunda encuentra el ticket libre.

## Pseudocódigo operativo

```text
ticket = crear_ticket_desde_live_handoff(conversacion)
resumen = resumir(ticket)
categoria = clasificar_semanticamente(resumen)
borrar(ticket.propietario)

(principal, reemplazo) = matriz[categoria o SIN_CLASIFICACION]

si principal.disponible:
    asignar_solo_si_sin_owner(ticket, principal)

si ticket.sin_owner y reemplazo.disponible:
    asignar_solo_si_sin_owner(ticket, reemplazo)

si ticket.sin_owner:
    mantener_ticket_sin_asignar_y_chat_abierto()
```

## Comportamiento visible y continuidad humana

- Emma no promete el nombre de la persona antes de que el workflow confirme el owner efectivo.
- Una solicitud libre como “quiero hablar con Pablo” activa la necesidad de handoff, pero la versión actual
  enruta por intención y disponibilidad; no garantiza asignación nominal.
- Después del primer handoff, otra persona puede continuar en el mismo hilo mediante reasignación manual del
  propietario en Help Desk, siempre que el chat siga abierto.
- Si se termina el chat, HubSpot no permite reabrir esa misma conversación.

## Fallas y contingencias

| Condición | Comportamiento | Revisión operativa |
|---|---|---|
| La IA no devuelve una etiqueta reconocida | Entra a `Sin clasificación`: María Paz y luego Marco. | Revisar resumen, salida de IA y frecuencia de la contingencia. |
| Principal ausente | No se asigna en la primera acción; se intenta el reemplazo. | Verificar disponibilidad del usuario y log de ambas acciones. |
| Principal y reemplazo ausentes | Ticket sin owner; chat abierto. | Atender la cola sin asignar y corregir disponibilidad/cobertura. |
| Emma sigue como owner | Las acciones no sobrescriben y podrían omitirse. | Confirmar que el paso 3 terminó antes de la rama. |
| Límite mensual del resumen agotado | La acción de resumen falla. | Revisar consumo y diseñar contingencia antes del agotamiento. |
| Créditos insuficientes | La clasificación inteligente puede fallar. | Revisar créditos, error de acción y ruta de atención manual. |
| Chat terminado | No se puede continuar en el mismo hilo. | Crear una nueva conversación si el visitante vuelve a contactar. |

## Evidencia E2E disponible

| Ticket | Escenario | Resultado probado |
|---|---|---|
| `48103069613` | Cotización | Clasificación de cotización y owner efectivo Pablo. |
| `48105602378` | Seguimiento con Marco no disponible | Clasificación de seguimiento y reemplazo efectivo Pablo. |
| `48094218332` | Calidad | Clasificación de calidad y owner efectivo María Paz. |

La primera sonda, ticket `48103382175`, reveló dos defectos de configuración: Emma seguía como owner y el texto
`PRUEBA QA INTERNA` sesgaba la clasificación. El paso 3 y la exclusión explícita de marcadores administrativos
resolvieron esas causas antes de repetir las pruebas.

La evidencia demuestra creación del ticket, clasificación, terminación del workflow, asignación efectiva y
actualización del widget. Todavía no demuestra una respuesta humana real, la ruta con ambas personas ausentes ni
una segunda reasignación humana dentro del mismo chat.

## Diagnóstico y observabilidad

Ante un caso incorrecto, revisar en este orden:

1. que la conversación calificó realmente para handoff por las directrices de Emma;
2. que se creó el ticket en Help Desk y se inscribió en `1876744588`;
3. la salida de `Resumir registro` y `Categoría de atención ANAM`;
4. que `Editar registro` borró el owner anterior;
5. qué rama recorrió el ticket y el resultado de ambas acciones de propietario;
6. la disponibilidad live del principal y el reemplazo;
7. el owner efectivo del ticket y el estado visible en el widget;
8. créditos, límite mensual y errores de acciones inteligentes.

No se debe inferir éxito sólo porque el workflow está activado o terminó: el readback del owner efectivo es la
evidencia de routing.

## Cambio y recuperación

Cualquier ajuste a etiquetas, prompt, orden de acciones, personas, disponibilidad, inscripción o handoff requiere
change set, aprobación, readback y una matriz E2E proporcional. Durante una intervención controlada puede
restaurarse temporalmente un handoff directo a una persona responsable, pero esa operación cambia el runtime y no
forma parte de esta actualización documental.

## Entrega y soporte

Los entregables externos vigentes son la
[especificación técnica en PDF](reports/ANAM_Emma_Handoff_Especificacion_Tecnica_2026-09-02.pdf) y la
[guía funcional en PDF](reports/ANAM_Emma_Handoff_Documentacion_Funcional_2026-09-02.pdf). Los HTML/CSS bajo
[`reports/html/`](reports/html/) son la fuente editable; los PDF son el master visual para envío. Las diez
capturas de página bajo [`reports/previews/`](reports/previews/) son evidencia de revisión, no piezas separadas
para el cliente.

El soporte del proyecto Customer Agent y del proyecto KPI dura **tres meses**, desde el **13 de agosto de 2026**
hasta el **12 de noviembre de 2026**, ambas fechas incluidas. Dentro de esta ventana Efeonce atiende incidentes
del alcance construido, diferencias frente al comportamiento entregado, dudas de operación, restauración de la
configuración aprobada y documentación que deba corregirse como consecuencia.

No son soporte las nuevas funcionalidades, nuevos KPI, nuevos workflows o automatizaciones, integraciones,
rediseños ni innovaciones. Cada solicitud de evolución requiere evaluación y alcance separado. La consolidación
en SharePoint anunciada para la semana del 2 de septiembre permanece pendiente hasta contar con evidencia del
enlace compartido.

## Referencias

- [Configurar y personalizar el handoff de Customer Agent](https://knowledge.hubspot.com/customer-agent/set-up-and-customize-the-customer-agents-handoff-process)
- [Asignar tickets mediante workflows](https://knowledge.hubspot.com/workflows/assign-tickets-using-workflows)
- [Configurar y probar Customer Agent](https://knowledge.hubspot.com/customer-agent/set-up-the-customer-agent)
- [Contrato live de identidad, directrices, handoff y canales](anam-customer-agent-source-pack/07-identidad-directrices-handoff-y-canales.md)
