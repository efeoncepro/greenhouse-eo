# Informe de pruebas — Customer Agent ANAM

**Fecha de evaluación:** 16 de julio de 2026
**Estado del informe:** corte de QA de la sesión; evidencia cuantitativa conservadora
**Superficie evaluada:** Customer Agent de ANAM en el entorno de previsualización de HubSpot

## 1. Objetivo

Evaluar y mejorar el Customer Agent de ANAM para que pueda:

- orientar consultas técnicas sobre aguas, RILES, residuos sólidos y lodos;
- reunir antecedentes útiles para cotizar sin convertir la conversación en un formulario;
- responder primero lo que sí conoce sobre facturación y materias administrativas;
- manejar seguimiento, reclamos y solicitudes de calidad con empatía y precisión;
- recordar la información entregada durante la conversación;
- transferir a una persona solo cuando sea necesaria una acción o revisión humana;
- evitar afirmaciones técnicas, legales, comerciales o de plazo que no estén respaldadas.

## 2. Configuración evaluada

Durante la sesión se trabajó sobre la siguiente configuración de HubSpot:

- persona e instrucciones de comportamiento del agente;
- base de conocimiento privada en archivos Markdown;
- documentación de servicios, normas y captura de datos para cotización;
- preguntas frecuentes;
- instrucciones de seguimiento, facturación, calidad y derivación;
- catálogo de parámetros, métodos y plazos estándar;
- pautas de transferencia a una persona;
- respuestas cortas entrenadas para casos de facturación;
- ruta de transferencia destinada a María Paz Haeger.

Las pruebas se realizaron en el entorno de previsualización del Customer Agent. No se probaron desde una identidad real de cliente con todas sus propiedades de CRM disponibles; por ello, algunos comportamientos de identificación y solicitud de correo corresponden específicamente a la previsualización.

## 3. Método y alcance cuantitativo

Se utilizó un guion de QA de **39 escenarios definidos**. El guion cubre presentación, servicios, normas, cotización, precios, plazos, privacidad, seguimiento, facturación, calidad, parámetros, enrutamiento y familias de servicio.

El número de escenarios definidos no se presenta como número de pruebas ejecutadas. Para este informe se contabiliza únicamente lo que puede sostenerse con la evidencia recuperable de la sesión:

| Métrica | Cantidad verificable | Método de conteo |
|---|---:|---|
| Escenarios definidos en el guion | 39 | Filas numeradas del 1 al 39 en el guion de QA |
| Turnos mínimos definidos en el guion | 40 | Un turno por escenario, más el segundo turno explícito del escenario 11 |
| Escenarios distintos ejecutados durante la sesión | **mínimo 24** | 19 escenarios técnicos de aguas/sólidos más factura no recibida, diferencia factura/OC, administrativo general, reclamo/seguimiento e intención mixta |
| Turnos o ejecuciones durante la sesión | **mínimo 35** | 19 técnicos base; 2 de factura no recibida; 4 de diferencia factura/OC; 4 de RIL DS 609; 1 de sólidos DS 148; 1 administrativo; 3 de reclamo `COT-778`; 1 mixto |
| Escenarios con resultado técnico satisfactorio tras ajustes | 19 | Batería de aguas y sólidos reportada como aprobada después de las correcciones |
| Escenarios de facturación observados | 2 | Factura no recibida y diferencia entre factura y orden de compra |

**Importante:** no se conserva un transcript exportado que permita desglosar con certeza los 19 escenarios técnicos entre aguas y sólidos ni contar posibles turnos adicionales. Por esa razón se usa un **mínimo verificable**, no una cifra estimada. Las pruebas explícitas de RIL DS 609 y lodo DS 148 pueden solaparse semánticamente con esa batería técnica; se cuentan sus ejecuciones de regresión dentro de los 35 turnos, pero no se vuelven a sumar como escenarios distintos. El mínimo de 24 escenarios evita así el doble conteo.

## 4. Matriz de pruebas

| Área | Cobertura definida | Ejecución verificable | Resultado observado | Estado del corte |
|---|---|---:|---|---|
| Aguas y RILES | Agua potable, RILES, DS 90, DS 609, parámetros, matriz, cotización y plazos | Parte de la batería conjunta de 19 escenarios técnicos, más 4 turnos explícitos de RIL DS 609 en dos conversaciones | Después de los ajustes, el agente orientó según origen, proceso y requerimiento aplicable; evitó convertir el catálogo completo en un panel normativo y no prometió fechas | PASS |
| Sólidos y lodos | Residuos sólidos, lodos, DS 148, separación entre catálogo de lodos y residuos peligrosos | Parte de la batería conjunta de 19 escenarios técnicos, más 1 ejecución explícita de lodo DS 148 | Evitó presentar ensayos de lodos como exigencias automáticas del DS 148, pidió origen y requerimiento y no emitió una clasificación legal | PASS |
| Facturación | Factura no recibida, monto incorrecto, acceso a documentos y validación de identidad | 2 escenarios / mínimo 6 turnos o ejecuciones | La factura no recibida continuó conversacionalmente y transfirió después de reunir contexto; la diferencia factura/OC se ejecutó al menos 4 veces entre iteraciones y HubSpot llegó a imponer una transferencia inmediata | PARCIAL; requiere regresión adicional |
| Administrativo | Formas de pago y consulta de factura | 1 escenario / 1 ejecución | Respondió condiciones de pago y explicó cómo consultar una factura sin transferir de inmediato | PASS |
| Calidad, reclamos y seguimiento | Molestia por atraso o falta de respuesta, con referencia de cotización | 1 escenario / 3 ejecuciones con `COT-778` | En una iteración reconoció la molestia y retuvo `COT-778`; en otra, HubSpot impuso la transferencia nativa. El mensaje final quedó empático y sin prometer solución o plazo | PASS WITH LIMITATION |
| Intención mixta | Cotización de agua potable más corrección de una factura anterior | 1 escenario / 1 ejecución | Separó la necesidad técnica de agua potable y la gestión de factura, sin tratarlas como una única solicitud | PASS |

## 5. Resultados observados

### 5.1 Aguas y sólidos

La batería técnica conjunta incluyó un mínimo de 19 escenarios y quedó reportada como satisfactoria después de iterar las instrucciones y el conocimiento. Además, el caso explícito de RIL bajo DS 609 se probó en dos conversaciones de dos turnos cada una, y el caso explícito de lodo bajo DS 148 se ejecutó una vez. Estas regresiones pueden solaparse con los escenarios de la batería y, por tanto, no aumentan el conteo de escenarios distintos. Los comportamientos relevantes observados fueron:

- pedir el origen o proceso del RIL y el instrumento o requerimiento aplicable antes de proponer parámetros;
- distinguir DS 90 y DS 609 sin presentar todo el catálogo como una obligación normativa;
- consultar la matriz antes de informar disponibilidad o plazo de un parámetro;
- tratar el plazo del catálogo como referencia estándar y no como fecha comprometida de entrega;
- separar los análisis disponibles para lodos de los ensayos aplicables a residuos peligrosos;
- no concluir por cuenta propia si un residuo cumple, incumple o tiene clasificación legal determinada;
- reunir antecedentes de cotización de manera progresiva, permitiendo más preguntas cuando la complejidad técnica lo requiere.

### 5.2 Factura no recibida

Consulta probada: factura asociada a la cotización `12345`, requerida con urgencia para cierre de mes.

En el primer turno, el agente:

- reconoció la urgencia y el contexto del cierre de mes;
- recordó el número de cotización;
- no transfirió de inmediato;
- pidió únicamente nombre de empresa o RUT para identificar el caso.

En el segundo turno, el cliente entregó empresa y RUT e indicó que su correo ya debía estar registrado. El agente activó la transferencia, comportamiento coherente con la necesidad de una acción humana real. En el modo de prueba, HubSpot solicitó igualmente un correo electrónico porque la conversación no estaba asociada a una identidad autenticada con propiedades disponibles.

### 5.3 Diferencia entre factura y orden de compra

Consulta probada: factura `F-889` por `$1.250.000` frente a una orden de compra por `$1.050.000`, con solicitud urgente de revisión.

El caso se ejecutó al menos cuatro veces entre las distintas iteraciones. El Customer Agent llegó a activar inmediatamente el flujo de transferencia y mostrar el mensaje genérico del sistema. El resultado fue seguro desde el punto de vista de no confirmar un error ni prometer refacturación, pero no cumplió completamente el objetivo conversacional de reconocer los montos, conservarlos en un resumen visible y solicitar primero el antecedente mínimo de identificación.

Este caso se considera **parcial**, no aprobado. Demuestra que la clasificación nativa de HubSpot puede priorizar una solicitud de acción sobre las instrucciones de conversación o una respuesta corta entrenada.

### 5.4 Consulta administrativa general

La prueba consultó por condiciones de pago y por el procedimiento para revisar una factura. El agente respondió la orientación disponible para ambas materias y no transfirió de inmediato. El resultado se considera **PASS** porque resolvió primero la información administrativa disponible antes de escalar una acción específica.

### 5.5 Reclamo y seguimiento

El escenario expresó molestia por una muestra o servicio pendiente y entregó la referencia `COT-778`. Se realizaron tres ejecuciones. En una iteración, el agente reconoció la molestia y conservó correctamente la referencia sin volver a pedirla. En otra, la transferencia nativa de HubSpot se impuso sobre la respuesta conversacional.

El mensaje final de transferencia quedó empático y no prometió solución ni plazo. El resultado se considera **PASS WITH LIMITATION**: el contenido y la conducta configurada fueron adecuados, pero la transición puede volverse abrupta cuando el mecanismo nativo de HubSpot toma control del turno.

### 5.6 Intención mixta

La prueba combinó una cotización de análisis de agua potable con la corrección de una factura anterior. El agente separó ambas necesidades y no las redujo a una sola gestión. El resultado se considera **PASS**.

## 6. Mejoras aplicadas durante la sesión

Se ajustaron y publicaron las instrucciones y contenidos para:

- responder orientación administrativa o de facturación disponible antes de transferir;
- evitar una transferencia en el primer turno solo por detectar palabras como factura, pago, orden de compra, reclamo o cotización;
- solicitar el contexto mínimo necesario antes de una acción humana;
- no afirmar “he registrado” una solicitud antes de que exista una acción real del sistema;
- recordar empresa, RUT, número de cotización, factura, orden de compra, montos y otros datos ya entregados;
- no volver a pedir información disponible en la conversación o en el CRM;
- usar una secuencia natural de preguntas, sin imponer un máximo rígido de dos preguntas cuando el servicio requiere mayor calificación;
- mantener separadas la orientación técnica y la determinación legal o normativa;
- transferir a María Paz con un resumen suficiente para que el cliente no tenga que repetir su situación;
- responder reclamos con empatía sin admitir responsabilidad, reinterpretar resultados ni prometer una solución o plazo;
- entrenar respuestas cortas para factura no recibida y diferencia entre factura y orden de compra.

## 7. Criterios de calidad conversacional

### Empatía

Se consideró satisfactorio cuando el agente reconoce la situación concreta, su impacto o urgencia sin exagerar, usar frases vacías, discutir con el cliente o admitir responsabilidad no verificada. En asuntos sensibles se evitó depender de emojis o signos de exclamación para simular cercanía.

### Memoria

El agente debe conservar durante la conversación referencias, montos, empresa, RUT, servicio, matriz, norma y antecedentes ya entregados. Repetir una pregunta ya contestada se considera una falla, salvo que exista una contradicción que requiera aclaración.

### Precisión

El agente debe responder solo con información respaldada por la base de conocimiento. No debe inventar precios, disponibilidad analítica, parámetros obligatorios, interpretación de cumplimiento, clasificación legal, fechas de entrega ni capacidades no documentadas.

### Transferencia a una persona

La transferencia es adecuada cuando el cliente la solicita explícitamente o cuando se necesita una acción humana real: revisar una factura, investigar un reclamo, confirmar una excepción técnica o comprometer una cotización. Antes de transferir, cuando sea posible, el agente debe reunir el contexto mínimo y resumirlo. No debe transferir una consulta meramente informativa que puede resolver con conocimiento disponible.

## 8. Limitaciones nativas observadas

- El flujo nativo de transferencia puede reemplazar la respuesta redactada por el agente con un mensaje genérico del sistema.
- La clasificación de una solicitud como acción puede activar el traspaso antes de una pregunta aclaratoria, incluso si las instrucciones indican recopilar contexto primero.
- En previsualización, HubSpot puede pedir correo electrónico aunque el usuario afirme que ya está registrado, porque no existe una identidad real de CRM asociada a esa sesión de prueba.
- Las respuestas cortas entrenadas no garantizan coincidencia para todas las formulaciones humanas de una misma intención.
- La prueba del widget y su caja de composición está condicionada por la aceptación previa de privacidad y por las capacidades expuestas por el widget; no existe un prellenado confiable para todos los estados del chat.
- Este corte no incluye un export completo de transcripts ni una ejecución trazable de los 39 escenarios del guion.

## 9. Continuidad comercial confirmada

ANAM confirmó que Customer Agent ya fue comprado y que se adquirieron **30.000 créditos**. El aviso observado durante la sesión indicaba que quedaba un día antes de comenzar el consumo de los créditos pagados; no correspondía a la expiración de un trial ni anunciaba la desactivación del agente. A este corte no existe un bloqueo de continuidad por licencia o créditos. El consumo debe monitorearse como parte de la operación normal.

## 10. Próximos pasos recomendados

1. Monitorear consumo y saldo de los 30.000 créditos adquiridos.
2. Ejecutar nuevamente el caso de diferencia factura/OC con varias formulaciones y validar el mensaje real de transferencia en la landing.
3. Ejecutar de manera trazable los 39 escenarios del guion, guardando fecha, prompt, respuesta, número de turnos, resultado y evidencia.
4. Ampliar las regresiones de administrativo, calidad e intención mixta con más formulaciones, aunque los casos ejecutados en este corte resultaron satisfactorios con la limitación nativa descrita para reclamos.
5. Repetir una selección de conversaciones desde la landing pública con un contacto real de prueba para verificar memoria de propiedades y evitar solicitudes redundantes de correo o RUT.
6. Medir por separado resolución autónoma, transferencia necesaria, transferencia prematura, precisión técnica, repetición de preguntas y calidad del resumen de handoff.
7. Revisar periódicamente la base Markdown cuando cambien servicios, normas, parámetros, tiempos, responsables o políticas administrativas.

## 11. Conclusión

El Customer Agent mostró una mejora material en la orientación técnica de aguas y sólidos y en el manejo progresivo de una factura no recibida. El principal riesgo conversacional restante es la transferencia inmediata que HubSpot puede activar frente a solicitudes de acción, como una diferencia entre factura y orden de compra.

Con la evidencia recuperable, este informe acredita **un mínimo de 24 escenarios distintos y 35 turnos o ejecuciones**, no la ejecución total trazable del guion de 39 escenarios. La batería técnica conjunta de 19 escenarios quedó satisfactoria tras los ajustes. Administrativo e intención mixta obtuvieron `PASS`; reclamo y seguimiento obtuvieron `PASS WITH LIMITATION` por la precedencia ocasional de la transferencia nativa; facturación presenta un resultado favorable y uno parcial.
