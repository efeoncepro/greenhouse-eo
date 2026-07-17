# Caso ANAM — Customer Agent, conocimiento y frontera humana

> **Tipo:** brief editorial maestro de caso de implementación.
> **Estado:** aplicado al draft privado v4; no autoriza publicación.
> **Versión:** 1.0.
> **Fecha:** 2026-07-17.
> **Cliente:** ANAM.
> **Pieza dentro de la serie:** artículo 2 de 3.
> **Formato ancla:** case study + thought leadership de autoridad y consideración.
> **Autor/byline:** Julio Reyes.
> **Speaker:** Julio Reyes + doctrina Efeonce atribuida explícitamente.
> **Runtime destino:** blog WordPress de `efeoncepro.com`, vía Content Factory y estado inicial `private`.
> **Artículo anterior:** [Dashboards confiables en HubSpot: el caso ANAM](https://efeoncepro.com/hubspot/dashboards-hubspot-confiables-caso-anam/).
> **Servicio probado:** [`hubspot.customer-agent-managed`](../services/hubspot-as-a-service/hubspot-customer-agent-managed-service.md).
> **Draft privado:** [Artículo v4 — pasada autoral en voz de Julio](./HUBSPOT_CUSTOMER_AGENT_ANAM_ARTICLE_DRAFT_V4.md).
> **Auditoría editorial:** [copywriting, SEO y AEO — 2026-07-17](../audits/public-site/2026-07-17-anam-customer-agent-copy-seo-aeo.md).
> **Aprobación cliente:** [confirmada; registro interno](./HUBSPOT_CUSTOMER_AGENT_ANAM_APPROVAL_RECORD_V1.md).
> **Sistema visual:** [dirección visual y manifest](./HUBSPOT_CUSTOMER_AGENT_ANAM_VISUAL_SYSTEM_V1.md).
> **Spec Gutenberg:** [versión local validada](./HUBSPOT_CUSTOMER_AGENT_ANAM_GUTENBERG_SPEC_V1.json).

## 1. Decisión editorial

### Título de trabajo recomendado

**¿Qué necesita una IA para atender bien a tus clientes? Lo que aprendimos diseñando el Customer Agent de ANAM**

Alternativas para calibración:

1. **¿Puede una IA atender a tus clientes? Lo que aprendimos diseñando el Customer Agent de ANAM**
2. **No basta con cargar documentos: cómo diseñamos el Customer Agent de HubSpot para ANAM**
3. **Un agente de atención no necesita resolverlo todo: necesita conocer sus límites**

El título recomendado entra por el trabajo que el lector reconoce —usar IA para responder consultas— sin exigirle
conocer la categoría `Customer Agent`. La entidad HubSpot aparece en la bajada, la definición inicial, el SEO title
y el cuerpo. El título no afirma que el agente esté activo en producción.

### Pregunta central

> **¿Qué necesita una empresa para que una IA responda consultas de clientes sin perder contexto, control ni
> responsabilidad?**

### Tesis

> Usar IA para responder consultas no consiste en conectarla a más documentos. Consiste en diseñar un sistema que
> sepa responder, pedir contexto, transferir responsabilidad y reconocer cuándo no puede continuar solo. En
> HubSpot, ese sistema toma la forma de un Customer Agent, pero su calidad depende del diseño y de la operación que
> lo sostienen.

### Frase central

> El trabajo difícil no fue enseñarle a responder. Fue decidir con evidencia qué podía responder solo y qué debía
> conservar para una persona.

### Promesa al lector

Al terminar la pieza, el lector podrá:

- entender qué es un Customer Agent y cómo se diferencia de un chatbot tradicional;
- distinguir knowledge, instrucciones, acciones, handoff, canal y runtime;
- diseñar una frontera de autonomía para un agente de atención;
- reconocer por qué una base de conocimiento no es un depósito de documentos;
- evaluar si una transferencia humana ocurre con contexto y en el momento correcto;
- separar agente configurado, agente probado y agente efectivamente operativo.

## 2. Objetivo, audiencia y trabajo de la pieza

### Objetivo

Construir autoridad y prueba comercial para la práctica HubSpot as a Service de Efeonce sin convertir el caso en
una landing de producto ni exagerar el estado del runtime. La pieza debe mostrar el oficio detrás de un Customer
Agent: arquitectura de conocimiento, diseño conversacional, límites, memoria, handoff, QA y verificación.

### Etapa de funnel

Awareness -> consideración -> decisión. La entrada sirve a quien reconoce el deseo de automatizar respuestas,
aunque no conozca Customer Agent; el caso y el método acompañan después a quien ya evalúa HubSpot o corrige una
implementación existente.

### Audiencia prioritaria

- Gerencia de servicio, operaciones o experiencia de cliente en una empresa B2B.
- Responsable que quiere incorporar IA a la atención, pero todavía no conoce el producto ni la categoría.
- Responsable de HubSpot que necesita llevar Customer Agent más allá del setup inicial.
- Champion interno que debe explicar qué automatizar y qué conservar humano.
- Equipo que teme respuestas inventadas, transferencias prematuras o pérdida de contexto.
- Comprador que necesita distinguir una demo convincente de un canal realmente operable.

### JTBD

> “Quiero que la IA responda consultas repetibles y ayude a mi equipo, sin inventar respuestas, perder contexto ni
> asumir decisiones que debería tomar una persona.”

### Nivel de consciencia

Problem-aware -> solution-aware -> product-aware. El lector puede conocer sólo el resultado deseado —que la IA
responda consultas—, haber visto chatbots o estar evaluando Customer Agent. La pieza debe enseñar la categoría sin
convertirse en glosario ni asumir conocimiento de HubSpot.

### Trabajo que debe hacer la pieza

- Desafiar la idea de que knowledge + widget equivale a agente listo.
- Traducir el deseo informal de “usar IA para responder” a un sistema comprensible de capacidades y límites.
- Enseñar qué es un Customer Agent antes de profundizar en su implementación.
- Convertir el caso en un método transferible, no en inventario de features.
- Demostrar criterio mediante decisiones negativas y límites explícitos.
- Hacer visible la transferencia humana como parte del diseño de responsabilidad.
- Dar al lector una herramienta para evaluar cualquier Customer Agent.
- Continuar la doctrina de la serie: una superficie convincente no prueba que el sistema debajo sea confiable.

## 3. Gran idea y tensión narrativa

### Gran idea

**La confianza no nace de darle más autonomía a la IA. Nace de definir con precisión los límites de esa
autonomía.**

### Antagonista

El antagonista no es HubSpot, la IA ni una falta del cliente. Es una creencia extendida:

> “Si ponemos una IA en el chat y le damos nuestros documentos, podrá responder por nosotros.”

El artículo demuestra por qué el conocimiento por sí solo no resuelve contradicciones, intención mixta, memoria,
compromisos, acceso a sistemas, handoff ni disponibilidad runtime.

### Arco del caso

1. El lector reconoce un deseo simple: usar IA para responder consultas de clientes.
2. La pieza explica qué es un Customer Agent y por qué no equivale a un chatbot conectado a documentos.
3. ANAM necesitaba orientar consultas y reunir contexto sin convertir el chat en formulario.
4. El trabajo no empezó por el widget, sino por separar contratos.
5. Veintitrés fuentes se organizaron por propósito y autoridad.
6. La experiencia visible simplificó la entrada; la arquitectura conservó la complejidad operativa.
7. Se diseñó qué debía saber, aclarar, preparar y entregar a una persona.
8. Las conversaciones se probaron por escenarios y turnos, no por una respuesta aislada.
9. HubSpot mostró límites nativos que debían documentarse, no ocultarse.
10. El readback final confirmó que configuración y operación son estados diferentes.

### Continuidad con el artículo 1

| Artículo | Superficie visible | Sistema que debe probarse | Error que evita |
|---|---|---|---|
| 1. Dashboards | Gráfico/KPI | modelo, cobertura, denominador y ownership | confundir visualización con verdad |
| 2. Customer Agent | chat/respuesta | knowledge, límites, memoria, handoff, QA y runtime | confundir configuración con autonomía operativa |

## 4. Objeto intelectual citable — Frontera de autonomía conversacional

### Propósito

Entregar una matriz que un responsable de servicio, partner o consultor pueda usar para decidir qué debe hacer un
agente y qué debe conservar una persona. El nombre es descriptivo; no se forzará una sigla propietaria.

| Zona | Qué ocurre | Ejemplo ANAM | Dueño |
|---|---|---|---|
| **Saber** | La respuesta está documentada y no implica una decisión sensible. | Servicios, normas disponibles, orientación administrativa general. | Agente |
| **Aclarar** | Existe conocimiento, pero faltan antecedentes para aplicarlo correctamente. | Matriz, origen, parámetro, norma o referencia de cotización. | Agente |
| **Preparar** | Se requiere una acción humana, pero el agente puede reunir y resumir el contexto. | Revisión de factura, seguimiento de informe o reclamo. | Agente -> persona |
| **Decidir** | Se necesita juicio, acceso operativo o capacidad de comprometer a la organización. | Precio final, refacturación, fecha comprometida o interpretación legal. | Persona |

### Definición autocontenida

> La frontera de autonomía conversacional separa cuatro trabajos: responder conocimiento confiable, aclarar
> antecedentes, preparar una acción humana y tomar decisiones que comprometen a la organización. Un agente no
> necesita resolverlo todo; necesita reconocer con precisión en qué zona está la conversación.

### Gates de utilidad citable

- **Use test:** un tercero puede usar la matriz en discovery, diseño o QA de un agente.
- **Unbrand test:** sigue siendo útil sin logos ni CTA.
- **Standalone test:** tabla y definición se entienden sin el caso completo.
- **Evidence test:** cada ejemplo deriva del contrato y QA documentados.
- **Link-target test:** debe publicarse como HTML nativo bajo un H2 estable.
- **Expert test:** requiere revisión de 2-3 profesionales antes de publicación.

## 5. Estructura narrativa propuesta

### Apertura — el deseo es simple; el sistema no

Abrir con un trabajo reconocible: una empresa quiere que la IA responda consultas frecuentes y ayude al equipo de
atención. Traducir inmediatamente esa aspiración: no se resuelve instalando un chat ni conectando documentos. Se
necesita un sistema capaz de responder, pedir contexto, conservar memoria, reconocer límites y transferir.

No comenzar con terminología HubSpot ni con el bloqueo runtime. Primero ayudar al lector a nombrar correctamente
lo que busca. El caso ANAM entra después como evidencia concreta.

### H2 1 — ¿Qué es un Customer Agent y en qué se diferencia de un chatbot?

Definición answer-first: un Customer Agent es un agente de IA conectado a los canales y al conocimiento de una
empresa para responder consultas, reunir antecedentes y transferir conversaciones cuando se necesita intervención
humana. No es sólo un chatbot con mejores respuestas: necesita fuentes gobernadas, límites explícitos y una
operación capaz de sostener lo que promete.

Explicar sin feature dump:

- un chatbot tradicional suele seguir árboles o respuestas predefinidas;
- un agente interpreta lenguaje natural y recupera conocimiento;
- esa flexibilidad aumenta la necesidad de gobierno, pruebas y handoff;
- `Customer Agent` es el nombre de esta capacidad en HubSpot, no una categoría que el lector deba conocer antes.

### H2 2 — ¿Qué problema debía resolver el Customer Agent de ANAM?

Conectar con el artículo anterior. El Customer Agent fue una de las señales iniciales, pero merecía su propio
workstream: consultas técnicas, cotización progresiva, seguimiento, facturación, calidad, memoria y handoff.

### H2 3 — ¿Por qué cargar documentos no crea una buena respuesta?

Introducir los contratos independientes:

1. identidad y tono;
2. conocimiento;
3. instrucciones y secuencia;
4. acciones reales;
5. transferencia humana;
6. canal y entrada;
7. medición y disponibilidad.

### H2 4 — ¿Cómo se diseñó una base de conocimiento de 23 fuentes?

Explicar arquitectura y función:

- seis archivos Markdown de dominio;
- 17 respuestas cortas para situaciones críticas;
- catálogo técnico de 356 registros;
- separación entre empresa, servicios/normas/FAQ, cotización, seguimiento/facturación/calidad y catálogo;
- reconciliación de contradicciones antes de cargar;
- fuentes privadas, gobernadas y no expuestas como citas al visitante.

Insight: **una base de conocimiento no es un depósito de documentos; es una arquitectura de decisiones.**

### H2 5 — ¿Por qué la landing tiene tres intenciones y el agente opera con cinco?

Separar:

- puertas visibles: `Cotizar`, `Seguimiento del Servicio`, `Requerimientos de Calidad`;
- clasificación operativa: `Información`, `Cotización`, `Seguimiento`, `Facturación`, `Calidad`.

Insight: **la interfaz simplifica la entrada; la arquitectura conserva la complejidad necesaria para operar.**

### H2 6 — ¿Qué debe recordar y qué no puede prometer un agente?

Memoria esperada: empresa, RUT, servicio, matriz, norma, referencias y montos ya entregados.

Límites: precios finales, fechas comprometidas, interpretación legal, cumplimiento, disponibilidad no documentada,
refacturación, resultado de una investigación o acción no ejecutada.

### H2 7 — ¿Cuándo transferir a una persona es una decisión correcta?

Introducir la Frontera de autonomía conversacional. Mostrar que una transferencia correcta preserva contexto y
responsabilidad. Evaluarla por necesidad, momento, contexto mínimo, resumen y continuidad; no sólo por ocurrencia.

### H2 8 — ¿Cómo se prueba una conversación y no sólo una respuesta?

Presentar el método y resultados conservadores:

- 39 escenarios definidos, no 39 pruebas declaradas;
- mínimo verificable de 24 escenarios distintos y 35 turnos/ejecuciones;
- 19 escenarios técnicos satisfactorios después de ajustes;
- administrativo e intención mixta `PASS`;
- reclamo y seguimiento `PASS WITH LIMITATION`;
- facturación con un resultado favorable y uno parcial.

Explicar por qué multi-turno, memoria, naturalidad, frustración, intención mixta y failure modes son parte del QA.

### H2 9 — ¿Qué limitaciones aparecieron en HubSpot?

- transferencia nativa que puede anteceder una aclaración;
- preview sin identidad CRM real;
- respuestas cortas sin garantía para toda formulación humana;
- prefill del composer no confiable;
- ausencia de export completo de transcripts del corte;
- cero acciones publicadas y dos borradores que no son capacidad activa.

No presentar estas limitaciones como defecto universal: son comportamientos observados bajo este corte.

### H2 10 — ¿Por qué configurado, probado y operativo son estados distintos?

Usar la escalera:

| Estado | Pregunta de evidencia | ANAM al corte |
|---|---|---|
| **Vendor-documented** | ¿HubSpot documenta la capacidad? | Sí |
| **Portal-eligible** | ¿La cuenta muestra la superficie? | Sí |
| **Configured** | ¿Knowledge, directrices, handoff y canal están presentes? | Sí |
| **Preview-tested** | ¿Se observaron escenarios y límites en prueba? | Sí, con caveats |
| **Runtime-verified** | ¿Acepta conversaciones nuevas reales y permite medir outcomes? | **No; bloqueado** |

Cerrar la sección con el bloqueo administrativo de facturación sin publicar número, monto, fecha ni detalles
sensibles de la factura.

### Cierre — autonomía con responsabilidad

Volver a la pregunta central. El agente confiable no es el que aparenta resolver más, sino el que llega tan lejos
como permite la evidencia y se detiene antes de comprometer algo que necesita una persona.

CTA de baja presión: invitar al lector a revisar la frontera de autonomía, knowledge y handoff de su propia
operación antes de activar un agente.

## 6. Contrato SEO/AEO

### Lectura de intent

- **Intent principal:** informacional/problem-aware — cómo usar IA para responder consultas de clientes.
- **Intent secundario:** informacional/product-aware — qué es y cómo implementar Customer Agent de HubSpot.
- **Intent terciario:** investigación comercial — si sirve para una operación B2B y qué trabajo requiere.
- **Problema reconocido:** incorporar IA a la atención sin perder contexto, control ni responsabilidad.
- **Concepto enseñado:** frontera de autonomía conversacional.
- **Volumen/dificultad:** no medidos; no inventar forecast.

### Entidad y consultas candidatas

- `Customer Agent de HubSpot`;
- `Agente de clientes de HubSpot`;
- `cómo usar IA para atención al cliente`;
- `IA para responder consultas de clientes`;
- `cómo automatizar respuestas de clientes con IA`;
- `cómo configurar Customer Agent HubSpot`;
- `agente de IA para atención al cliente`;
- `transferencia humana chatbot HubSpot`;
- `base de conocimiento Customer Agent`.

### Query fan-out editorial

- ¿Cómo se puede usar IA para responder consultas de clientes?
- ¿Qué diferencia hay entre un chatbot y un agente de atención con IA?
- ¿Qué es Customer Agent de HubSpot?
- ¿Qué fuentes puede usar un Customer Agent?
- ¿Cómo se diseña una base de conocimiento para un agente?
- ¿Cuándo debe transferir a una persona?
- ¿Cómo se prueba un agente de atención?
- ¿Qué diferencia existe entre configurado, publicado y activo?
- ¿Cómo influyen créditos y estado de cuenta en Customer Agent?
- ¿Qué no debería automatizar un agente de servicio?

### Answer capsules obligatorias

Crear pasajes autocontenidos para:

1. definición de Customer Agent y diferencia frente a un chatbot;
2. definición de base de conocimiento gobernada;
3. definición de handoff correcto;
4. Frontera de autonomía conversacional;
5. diferencia entre configuración, prueba y operación;
6. checklist de readiness.

### Metadata provisional

| Superficie | Propuesta de trabajo |
|---|---|
| H1 | ¿Qué necesita una IA para atender bien a tus clientes? Lo que aprendimos diseñando el Customer Agent de ANAM |
| SEO title | IA para atención al cliente: caso Customer Agent de HubSpot |
| OG title | Una IA puede responder. ¿Sabe cuándo detenerse? |
| Meta description | Qué necesita una IA para atender bien a tus clientes: conocimiento, límites, pruebas y transferencia humana en el caso Customer Agent de ANAM. |
| Excerpt | El caso ANAM muestra qué necesita un Customer Agent de HubSpot para responder consultas sin perder contexto, inventar compromisos ni reemplazar decisiones humanas. |
| Slug | `ia-atencion-cliente-caso-anam` |
| Categoría | `HubSpot` |
| Tags | Ninguno nuevo por defecto; usar sólo taxonomía existente con archivo útil. |

Canonical y robots se cierran al preparar el post privado en WordPress; no copiar mecánicamente el H1 en otras
superficies.

## 7. Claim ledger

| ID | Claim candidato | Evidencia | Redacción permitida | Límite / redacción prohibida |
|---|---|---|---|---|
| CA-01 | El portal conserva 23 fuentes configuradas/en uso. | Source pack + readback autenticado 2026-07-17. | `23 fuentes: seis archivos y 17 respuestas cortas`. | No decir que el agente está activo por este hecho. |
| CA-02 | El catálogo técnico contiene 356 registros. | Fuente Markdown reconciliada. | `catálogo de 356 registros técnicos`. | No convertirlo en 356 servicios ni afirmar disponibilidad universal. |
| CA-03 | La landing ofrece tres intenciones. | Landing build 22 + QA. | Nombrar las tres puertas visibles. | No decir que prellenan confiablemente el mensaje. |
| CA-04 | El agente clasifica cinco rutas principales. | Directrices live. | Información, Cotización, Seguimiento, Facturación y Calidad. | No confundirlas con workflows activos por intención. |
| CA-05 | Existe handoff a una persona y Help Desk configurado. | Source pack + portal. | Describir owner funcional y preservación de contexto. | Nombre individual sólo con consentimiento específico. |
| CA-06 | Se definieron 39 escenarios de QA. | QA report. | `guion de 39 escenarios definidos`. | Nunca `39 pruebas ejecutadas`. |
| CA-07 | La evidencia recuperable acredita mínimo 24 escenarios y 35 turnos/ejecuciones. | QA report. | Usar `mínimo verificable`. | No presentarlo como export completo ni cobertura total. |
| CA-08 | La batería técnica conjunta de 19 escenarios quedó satisfactoria tras ajustes. | QA report. | Usar con `tras ajustes`. | No desglosar aguas/sólidos sin transcript. |
| CA-09 | Facturación obtuvo un resultado favorable y uno parcial. | QA report. | Explicar ambos comportamientos. | No resumir área como `PASS`. |
| CA-10 | HubSpot puede anticipar una transferencia nativa. | QA observada. | `en este corte se observó`. | No declararlo universal ni controlable por una respuesta corta. |
| CA-11 | El chatflow está configurado para todas las horas y 100% de cobertura. | Readback canal. | `cobertura configurada`. | Nunca `atención efectiva 24/7`. |
| CA-12 | El agente no atiende conversaciones nuevas al corte. | Readback autenticado 2026-07-17. | `conversaciones nuevas pausadas`. | No presentarlo como activo, productivo u operativo. |
| CA-13 | El bloqueo actual es administrativo de facturación. | Cuenta/facturación + dos intentos fallidos documentados. | Describir la dependencia y owner de resolución. | No publicar número, fecha, monto ni detalles sensibles. |
| CA-14 | No existen acciones publicadas. | Inventario live. | `cero acciones publicadas; dos borradores`. | No atribuir acceso a facturas, servicios o sistemas externos. |

### Claims rechazados

- reducción de carga humana de 56% o pico de 76%; faltan baseline, período y reconciliación;
- tasa de resolución, ROI, ahorro o mejora de tiempos atribuible al agente;
- Customer Agent `activo`, `en producción`, `live` u `operando`;
- atención 24/7 efectiva;
- 39 pruebas ejecutadas;
- facturación aprobada completamente;
- acciones reales sobre CRM, facturas, servicios o sistemas externos;
- prefill confiable del composer;
- causalidad entre el trabajo de Efeonce y un outcome de negocio aún no medido.

## 8. Voz, byline y authoring agentic

- **Voz primaria:** Julio Reyes.
- **Frontera híbrida:** Julio interpreta y explica; `En Efeonce...` atribuye método o práctica organizacional.
- **Tono:** preciso, pedagógico, transparente, conversacional; sin triunfalismo.
- **Primera persona:** no inventar reuniones, emociones, escenas ni recuerdos.
- **Caso:** real, nombrado sólo bajo permiso editorial específico.
- **Motif:** `con manzanitas 🍏🍏🍏` queda disponible una sola vez si simplifica realmente la matriz; no es
  obligatorio.
- **CTA:** baja presión y coherente con el aprendizaje, no una interrupción comercial.
- **Disclosure candidato:** `Este artículo fue desarrollado por Julio Reyes con apoyo de IA en investigación,
  estructura y edición. Julio definió la tesis, verificó las afirmaciones y aprobó la versión final.`

Antes del draft largo, Julio debe aprobar tesis, título de trabajo, matriz, límites, material en primera persona y
CTA. La aprobación de este brief no equivale a autorización de publicación.

## 9. Sistema visual y activos

No producir assets antes de cargar el sistema visual editorial y el método determinístico. La estética del artículo
1 puede dar continuidad de serie, pero no debe copiarse mecánicamente.

### Activos propuestos

1. **Hero conceptual:** una conversación dividida entre conocimiento, aclaración y handoff, sin screenshot del
   portal ni estética de chatbot genérico.
2. **Diagrama principal:** Frontera de autonomía conversacional — `Saber -> Aclarar -> Preparar -> Decidir`.
3. **Arquitectura de knowledge:** seis archivos + 17 respuestas cortas -> directrices -> respuesta/handoff.
4. **Escalera de estado:** vendor-documented -> eligible -> configured -> preview-tested -> runtime-verified.

Todos deben tener equivalente HTML; el objeto central no se gatea. Capturas del portal sólo si están sanitizadas,
aprobadas por ANAM y agregan evidencia que un diagrama no puede expresar mejor.

## 10. Distribución, repurposing y medición

### Mapa inicial de átomos

- carrusel LinkedIn: las cuatro zonas de autonomía;
- post corto: `Configurado no significa operativo`;
- clip/video: cuándo una transferencia humana es correcta;
- checklist descargable/imagen: readiness de Customer Agent;
- lámina de sales enablement: knowledge -> QA -> runtime;
- enlace cruzado desde el artículo 1 y futura pieza 3.

### Distribución

- blog Efeonce como ancla;
- LinkedIn de Julio para interpretación autoral;
- LinkedIn Efeonce para doctrina y servicio;
- newsletter HubSpot/operaciones;
- uso individual en discovery y revisión de implementaciones;
- outreach útil a profesionales HubSpot/Service, sin pedir enlaces.

### Medición

- lectura/scroll y navegación artículo 1 -> artículo 2;
- clicks hacia servicio HubSpot y solicitud de revisión;
- guardados, shares y uso del framework;
- enlaces o menciones hacia el anchor de la matriz;
- consultas orgánicas relacionadas con Customer Agent;
- presencia/citación en un panel estable de preguntas;
- pipeline influenciado, sin atribuir causalidad exclusiva.

Baseline y medición 30/60/90 días se definen al publicar; no presentar benchmarks externos como resultados propios.

## 11. Gates de avance y publicación

### Gate para paquete de escritura

- [x] Julio aprueba la tesis y la pregunta central (2026-07-17: “Me gusta, vamos”).
- [x] Julio aprueba el título de trabajo problem-aware (2026-07-17: “Sí, vamos por la segunda”).
- [x] Julio aprueba la Frontera de autonomía conversacional (2026-07-17: “Me gusta, vamos”).
- [ ] Se decide si el nombre de la persona de handoff puede aparecer.
- [ ] Se define material autorizado en primera persona.
- [ ] Se aprueba CTA y disclosure candidato.

### Gate para draft privado

- [x] Claim ledger sin claims rechazados en prosa.
- [x] H2 answer-first y pasajes autocontenidos.
- [x] Diferencia entre tres intents visibles y cinco clases operativas explícita.
- [x] Facturación presentada como resultado conversacional parcial y bloqueo runtime independiente.
- [x] Sin datos sensibles de cuenta, factura, portal o clientes finales.
- [ ] Artículo queda `private` y no indexable.

### Gate para publicación

- [ ] Autorización específica de ANAM para este segundo artículo y assets.
- [ ] Readback autenticado cercano a publicación.
- [ ] Si continúa pausado, título, bajada y cuerpo dicen `no operativo` sin ambigüedad.
- [ ] Si se reactiva, conversación nueva real verificada; activación sola no basta.
- [ ] QA desde landing con contacto de prueba y evidencia de handoff.
- [ ] Runtime, créditos, canal, owner y limitaciones actualizados.
- [ ] Aprobación final de Julio sobre texto, CTA, disclosure y publicación.
- [ ] Snapshot, rollback y QA live según el runbook editorial.

## 12. Fuentes canónicas

- [Canon HubSpot as a Service](../architecture/kortex/hubspot-as-a-service/README.md)
- [Source pack Customer Agent](../architecture/kortex/hubspot-as-a-service/anam-customer-agent-source-pack/README.md)
- [Identidad, directrices, handoff y canales](../architecture/kortex/hubspot-as-a-service/anam-customer-agent-source-pack/07-identidad-directrices-handoff-y-canales.md)
- [Inventario y reconciliación live](../architecture/kortex/hubspot-as-a-service/anam-customer-agent-source-pack/08-inventario-y-reconciliacion-live.md)
- [QA Customer Agent](../audits/ANAM_CUSTOMER_AGENT_QA_REPORT_2026-07-16.md)
- [Landing e intenciones](../architecture/kortex/hubspot-cms/anam-chat-landing.md)
- [Servicio Customer Agent gestionado](../services/hubspot-as-a-service/hubspot-customer-agent-managed-service.md)
- [Documentación funcional](../documentation/hubspot-as-a-service/anam-hubspot-managed-service-end-to-end.md)
- [Manual operativo](../manual-de-uso/hubspot-as-a-service/operar-anam-hubspot-managed-service.md)
- [Brief del artículo 1](HUBSPOT_REVOPS_ANAM_CASE_STUDY_BRIEF_V1.md)

Fuentes oficiales de producto y capacidad deben reverificarse cerca del draft/publicación contra
`hubspot-solutions-partner/SOURCES.md`; la documentación del vendor no sustituye evidencia del portal ANAM.
