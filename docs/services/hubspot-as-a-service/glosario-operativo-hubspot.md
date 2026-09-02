# Glosario operativo de HubSpot

> Una guía breve para entender cómo se conectan los datos, los procesos y las métricas.

**Efeonce · RevOps & CRM**  
**Versión:** 1.0 · **Fecha:** 11 de agosto de 2026

---

## Cómo usar este glosario

Usa este documento durante la capacitación y como referencia después. Cada término explica qué representa en HubSpot, cómo se usa en el proceso y qué error conviene evitar.

Antes de crear o cambiar un registro, parte por una pregunta simple: **¿qué objeto representa este dato?** Un campo o un tablero ayuda a trabajar; no reemplaza una definición clara del negocio.

---

## 1. Datos y ciclo de vida

### Objeto y grano · Object / grain

El objeto indica qué tipo de registro estás viendo; el grano indica qué hecho representa cada registro. Contacto, Deal, Service, Ticket y Billing Event pueden relacionarse, pero no cuentan la misma historia.

**Pregunta guía:** ¿qué hecho representa este registro y qué dato no debería guardarse aquí?

### Contacto · Contact

Registro de una persona identificada. Puede relacionarse con una Empresa, un Deal, un Ticket y otros objetos según el proceso.

La persona puede avanzar en su ciclo de vida de manera distinta a la empresa a la que pertenece.

**No confundir con:** un Lead o un Deal. El Contacto es la identidad de la persona; la calificación y la oportunidad son procesos distintos.

### Lead

Registro que organiza la pre-calificación comercial de una persona o una empresa cuando el proceso lo utiliza.

**Regla práctica:** Lead qualification, ejecución del Deal y entrega del servicio son momentos distintos. No conviertas una etapa artificial del Deal en sustituto de un Lead.

### Empresa · Company

Registro de una organización o cuenta. Conserva la relación de largo plazo, sus datos principales y las relaciones con Contactos, Deals, Services y Tickets.

La vista de cuenta —o Account 360— se construye aquí: reúne el contexto necesario para entender qué ocurre con esa organización.

**No confundir con:** un Contacto asociado o una fila de facturación. Una persona y un evento financiero no sustituyen la identidad de la cuenta.

### Lifecycle stage · Etapa del ciclo de vida

Estado de la relación de un registro con el negocio. Según el objeto y el proceso, puede incluir etapas como Lead, MQL, SQL, Opportunity, Customer u Onboarding.

MQL significa _Marketing Qualified Lead_ —lead calificado por marketing— y SQL significa _Sales Qualified Lead_ —lead calificado por ventas—.

**No confundir con:** una etapa de Deal. El ciclo de vida describe la relación; la etapa de Deal describe una oportunidad específica.

### Asociación · Association

Vínculo explícito entre dos registros, como Contacto → Empresa o Deal → Empresa. La asociación indica qué registros están relacionados y, cuando corresponde, qué rol cumple cada uno.

**Regla práctica:** una coincidencia por nombre, dominio o título es una pista; la identidad del registro debe comprobarse antes de relacionarlo.

### Propiedad · Property

Campo que guarda un hecho, una clasificación o una señal de proceso. Puede ser estándar o personalizada, y puede recibir su valor desde una persona, un formulario, un workflow o una integración.

Antes de crear una propiedad, comprueba si una existente ya resuelve la necesidad. Define qué significa, en qué objeto vive, quién la mantiene y qué decisión permite tomar.

### Fuente de verdad · Source of truth

Registro o sistema que debe considerarse la referencia principal para un hecho. Si un dato vive en más de un lugar, define cuál manda y cómo se sincronizan los demás.

No dupliques una cuenta, una oportunidad o un servicio para compensar un dato faltante en la fuente correcta.

---

## 2. Oportunidades y pipelines

### Deal

Registro de una oportunidad comercial. Puede contener la cotización, la adjudicación, la clasificación de ingreso y varias líneas de productos o servicios.

**Regla práctica:** el Deal representa la oportunidad completa. El detalle de cada componente contratado pertenece a sus Line items.

### Pipeline

Camino ordenado de etapas que describe un proceso comercial. Puede haber pipelines diferentes para venta nueva, expansión o renovación cuando cada motion tiene reglas y responsables distintos.

**No confundir con:** lifecycle, tipo de ingreso o estado de renovación. El pipeline organiza un proceso; no define por sí solo la verdad del negocio.

### Growth y Fidelización/Renovación · Motions de ANAM

**Growth** organiza nuevo negocio y expansión. **Fidelización/Renovación** organiza la continuidad de una cuenta y sus Services. Pueden pertenecer a la misma Empresa, pero requieren pipelines y evidencias distintas.

**Regla ANAM:** `Radar 0%` pertenece a Lead; no es una etapa ordinaria para crear Deals en Growth.

### Etapa · Deal stage

Momento verificable dentro de un pipeline. Una etapa representa evidencia de avance del comprador o del negocio, no solo una actividad que alguien realizó.

**Ejemplo:** una reunión agendada puede apoyar una etapa de discovery; enviar un correo no convierte automáticamente una oportunidad en negociación.

### Evidencia de etapa · Stage evidence

Dato o hecho comprobable que justifica permanecer o avanzar en una etapa. Puede ser un compromiso del comprador, un monto, una fecha, un país de ejecución, un próximo paso o un motivo de cierre.

Una actividad registrada no es evidencia suficiente si no demuestra qué cambió en la oportunidad.

### Paso siguiente · Next step

Acción concreta que mantiene vivo un Deal abierto. Debe tener contexto, una persona responsable y un momento para ejecutarse.

**Fórmula práctica:** verbo + objeto + responsable + fecha + resultado esperado. Ejemplo: “Confirmar reunión de renovación · responsable comercial · 12 de agosto · registrar alcance y decisión”.

**No confundir con:** un comentario genérico o una tarea sin fecha ni responsable. Si no sabes cuál es el siguiente movimiento, la oportunidad todavía no tiene una señal operativa clara.

### Line item

Componente individual de una cotización o de un servicio vendido. Conserva el detalle de producto o servicio, cantidad, valor, frecuencia y otros atributos necesarios para entender qué se contrató.

Una oportunidad puede tener varios Line items. Por eso, no guardes en el Deal un dato que pertenece únicamente a uno de sus componentes.

### Service · Servicio

Registro de un servicio adjudicado o contratado, con su duración, recurrencia y renovación.

En HubSpot, `Service` (`0-162`) es un objeto CRM activable para representar ofertas entregadas. Es distinto de
**Service Hub** —el producto de atención/Customer Success— y de una familia comercial de servicios de Efeonce.
Tampoco implica por sí solo un PSA completo.

Un servicio representa lo contratado. Una fila de factura representa un hecho de facturación. Son granos distintos y no deben mezclarse.

### Renewal · Renovación

Proceso que gestiona la continuidad de un Service existente. La elegibilidad, la renovación, la contracción y el riesgo deben basarse en servicios comparables y en reglas revisadas.

**No confundir con:** cambiar una etapa o pertenecer a un pipeline. La renovación requiere evidencia sobre el servicio que continúa, cambia o termina.

### Motion state · Estado del movimiento

Señal que describe qué está ocurriendo en la relación: expansión, renovación, riesgo o fidelización.

Estas señales complementan el ciclo de vida. No lo reemplazan ni deben convertirse automáticamente en nuevas etapas del pipeline.

---

## 3. Servicio, soporte y agentes

### Ticket

Caso de seguimiento operativo: soporte, calidad, reclamo, facturación o administración.

Un Ticket puede tener un SLA y una persona responsable, pero no es el contrato ni la fuente de verdad de la adjudicación. Un evento de facturación tampoco se convierte en Ticket por el nombre que tenga en un archivo.

### SLA · Acuerdo de nivel de servicio

Regla que define la ventana de respuesta, resolución, escalamiento y responsabilidad de un caso.

Para que sea operativo, debe tener un reloj, un estado y una condición de cumplimiento que se puedan comprobar. Guardar el texto del SLA no demuestra que se esté cumpliendo.

### Customer Agent · Agente de clientes

Agente conversacional que responde con conocimiento aprobado y transfiere a una persona cuando la solicitud requiere una decisión, un compromiso, una excepción, una investigación o una acción sensible.

La configuración guardada no basta. Hay que probar respuestas, contexto, límites y transferencia en escenarios reales o controlados.

### Handoff · Transferencia

Paso en que una automatización o un agente entrega el caso a una persona.

Una buena transferencia conserva el contexto, explica por qué interviene una persona y deja claro cuál es el siguiente paso. El mensaje para el cliente debe referirse al rol, no depender del nombre de una persona específica.

---

## 4. Calidad, medición y gobernanza

### Data quality · Calidad de datos

Disciplina para mantener registros completos, correctos, únicos, actualizados y bien relacionados.

Antes de corregir un problema, identifica su causa: diseño de campos, fuente de datos, integración o captura del equipo. Una asociación sugerida por nombre parecido es una pista, no una identidad aprobada.

### Readback · Verificación posterior

Revisión que confirma qué quedó realmente después de crear o editar un registro, una asociación, una propiedad o una automatización.

Una pantalla de confirmación o un mensaje de éxito no reemplaza la revisión del resultado. Comprueba el registro final y, cuando corresponda, prueba también el caso en que la condición no se cumple.

### Dashboard · Tablero

Superficie que reúne reportes para apoyar una decisión.

Un tablero confiable declara período, población, denominador, cobertura, fuente, definición y acción. Que exista un gráfico no convierte sus valores en KPI oficial ni en revenue reconocido.

### Goal · Meta

Meta configurada en HubSpot para una métrica, una persona responsable y un período.

Si la métrica o la población no se pueden medir con fidelidad, documenta la limitación. No uses un proxy que parezca equivalente.

### Billing Event · Evento de facturación

Registro de un hecho de facturación proveniente de una fuente externa. Conserva su clave, fecha, monto, moneda y origen.

Para ANAM, cada evento debe mantener su propio grano y relacionarse con una Empresa. Solo se asocia a un Service o Deal cuando la línea contractual se puede identificar sin ambigüedad.

### ARR · Annual Recurring Revenue

Ingresos recurrentes anualizados de una cohorte comparable.

Solo es válido cuando el Service tiene moneda, periodicidad, vigencia y criterio de recurrencia claros. No equivale al monto total de un Deal ni a la suma de facturas de distintas monedas o períodos.

### NRR y GRR

Métricas que muestran cuánto revenue recurrente conserva una cohorte en el tiempo.

NRR incluye expansión y GRR la excluye. Ambas requieren un valor inicial, contracción o churn, moneda, periodicidad y fechas consistentes. En ANAM, no deben tratarse como KPI oficiales hasta cerrar esas condiciones.

---

## 5. Términos para trabajar un caso en ANAM

### Workspace · Espacio de trabajo

Vista donde una persona revisa sus registros, actividades, tareas y oportunidades para decidir qué hacer después. Un Workspace ordena el trabajo; no reemplaza el objeto ni la definición del proceso.

### Responsable · Owner

Persona o equipo que debe mantener un registro, ejecutar el próximo paso o responder por una excepción. Quien creó el registro no necesariamente es su responsable actual.

### Backlog comercial · Commercial backlog

Conjunto de oportunidades abiertas que todavía requieren una acción. Conviene separar monto nominal, monto ponderado y negocios ganados; ninguno equivale automáticamente a revenue reconocido.

### KPI · Indicador clave

Métrica que ayuda a tomar una decisión concreta. Un gráfico puede ser informativo sin ser un KPI oficial; para declararlo como tal necesita definición, período, población, fuente y responsable.

### Ficha de un indicador

Antes de interpretar un número, identifica:

- **Período:** ¿qué fechas cubre?
- **Universo o población:** ¿qué registros incluye y cuáles excluye?
- **Denominador:** ¿sobre qué base se calcula una tasa o porcentaje?
- **Cobertura:** ¿qué parte de la población tiene datos utilizables?
- **Fuente y acción:** ¿qué objeto lo alimenta y quién trabaja la excepción?

### Breeze · IA asistida

Capacidades de inteligencia artificial de HubSpot que pueden resumir información, proponer un siguiente paso o preparar un borrador.

Breeze propone; una persona revisa la fuente, el destinatario, el lenguaje, la etapa y los permisos antes de enviar, cambiar o ejecutar algo.

### Meeting Notetaker · Notas de reunión

Función que puede convertir una reunión en notas, acuerdos, tareas o sugerencias de seguimiento. Su resultado depende de calendario, grabación, transcripción, permisos y licencia.

La sugerencia necesita revisión; no convierte automáticamente una conversación en una etapa o en una decisión comercial.

### Intent · Intención

Motivo principal de una solicitud. En esta capacitación se trabaja con cuatro rutas: cotizar, seguimiento de servicio, requerimiento de calidad y soporte/contrato.

### Routing · Enrutamiento

Regla que dirige una solicitud al equipo correcto según su intención, contexto y nivel de autoridad. Enruta primero; no envía todo a ventas ni reemplaza el handoff.

### Workflow · Automatización

Regla que ejecuta acciones cuando se cumple una condición: crear una tarea, actualizar un campo, notificar o mover información.

Una automatización guardada no demuestra que funciona. Debe probarse el camino en que se activa y el camino en que no debe activarse.

### Revisión humana · Human review

Control en que una persona con autoridad verifica fuente, contexto, lenguaje, datos sensibles, destinatario y próximo paso antes de confirmar una propuesta de IA o una automatización.

La IA puede acelerar el trabajo; la responsabilidad de la decisión sigue siendo humana.

### Estado de una capacidad

Indica cuánto se puede confiar en una función o dato:

- **Operativo / documentado:** existe una definición y un uso acordado.
- **Piloto:** sirve para probar el flujo; no es un KPI ni una conclusión final.
- **Validación live:** todavía requiere comprobar portal, licencia, permisos o configuración.
- **No publicado:** está diseñado, pero no es una capacidad activa para el equipo.

### Health score · Índice de salud

Señal compuesta que intenta resumir el estado de una cuenta o relación. Solo puede usarse como indicador cuando sus variables, período, fuente y criterio de interpretación están definidos.

No lo presentes como resultado oficial por el solo hecho de verlo en un mockup o en un tablero.

---

## Regla para llevarte

Un CRM confiable no se construye acumulando campos y gráficos. Se construye cuando cada registro tiene un significado claro, cada etapa tiene evidencia, cada relación tiene identidad y cada métrica explica su período y su población.

Antes de guardar o cambiar algo, pregunta:

- ¿Qué objeto representa?
- ¿Qué hecho guarda?
- ¿Quién lo mantiene?
- ¿Qué decisión habilita?
- ¿Cómo comprobaré que quedó bien?
