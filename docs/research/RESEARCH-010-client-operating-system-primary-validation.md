# RESEARCH-010 — Validación primaria del Efeonce Client Operating System

> **Status:** Active
> **Creado:** 2026-07-28
> **Owner:** Efeonce Strategy / Product / Client Experience
> **Relacionado:** [RESEARCH-009](RESEARCH-009-creative-operations-agentic-workflows.md) · [Customer Model Integrity Pack](../business-models/search-visibility-360/SEARCH_VISIBILITY_360_CUSTOMER_MODEL_INTEGRITY_PACK_V1.md)

## Propósito

Validar con operadores-champion reales de marketing, marca, social, contenido, performance y comunicaciones qué dolores de trabajar con agencias son frecuentes, urgentes y costosos, y qué capacidades internas de Efeonce podrían convertirlos en una ventaja observable.

Este research implementa el contrato transversal de Efeonce para construir productos **operator-first**. El operador es la persona que ejecuta, coordina o hace avanzar el trabajo y que, cuando percibe valor, puede convertirse en el champion que recomienda, defiende y expande la relación dentro de su organización.

Este brief **no autoriza** una plataforma, una API, una nueva oferta comercial ni tareas de implementación. Su resultado debe ser una decisión de priorización y un conjunto de hipótesis suficientemente evidenciadas para diseñar un piloto controlado.

## Decisión que habilita

¿Qué primera capacidad interna debe priorizar Efeonce para aumentar la capacidad del operador-champion, reducir coordinación y retrabajo, aumentar continuidad y fortalecer su influencia interna?

Opciones iniciales a comparar:

1. Approval and Accountability OS.
2. Client Operating Memory.
3. Evidence-to-Growth Reporting.
4. Brand Governance Layer.
5. Multi-Agency Orchestration.

## Pregunta central

¿Qué problema de la relación operador-agencia genera suficiente frecuencia, impacto y disposición a cambiar el proceso como para justificar un producto interno de Efeonce que el operador quiera adoptar, defender y expandir?

## Subpreguntas

1. ¿Qué tareas el operador termina haciendo manualmente por falta de la agencia?
2. ¿Qué dolores aparecen semanalmente, mensualmente y solo en eventos críticos?
3. ¿Qué costo producen en tiempo, retrabajo, presupuesto, riesgo de marca o credibilidad interna?
4. ¿Qué soluciones utiliza hoy y por qué no son suficientes?
5. ¿Qué significa para el operador que una agencia “entienda el negocio”?
6. ¿Qué evidencia necesita para defender la inversión ante dirección?
7. ¿Qué nivel de control, memoria, integración y velocidad estaría dispuesto a adoptar?
8. ¿Qué debería permanecer bajo criterio humano y qué podría automatizarse con seguridad?

## Contrato operator-first

Los servicios y productos de Efeonce pueden ser aprobados por directores, pero deben generar su primer valor tangible en el operador. El director compra capacidad, control o resultado; el operador recibe utilidad diaria y se convierte en champion cuando la solución mejora su capacidad de responder, decidir y entregar.

```text
Director reconoce la necesidad
  → operador vive la fricción
  → Efeonce aumenta su capacidad
  → operador se convierte en champion
  → dirección valida continuidad y expansión
```

El contrato no asume que todo operador sea champion. La investigación debe distinguir entre:

- **operador:** usa, coordina o ejecuta el servicio;
- **problem owner:** responde internamente por el problema;
- **operator-champion:** usa la solución, percibe valor y tiene influencia para recomendarla o expandirla;
- **director/sponsor:** valida relevancia y prioridad;
- **economic buyer:** aprueba presupuesto;
- **governance owner:** define límites de marca, legal, seguridad o riesgo.

## Evidencia secundaria que origina el contrato

La primera fase combinó fuentes sectoriales, estudios de relación agencia-cliente y voz cualitativa pública. Esta
evidencia orienta la investigación primaria; no prueba por sí sola prevalencia en Chile/LatAm ni product-market fit.

| Patrón observado | Evidencia | Confidence |
|---|---|---|
| Entender el negocio y entregar con consistencia son expectativas centrales | Setup 2024 identifica entender el negocio/industria como expectativa importante y la insatisfacción con delivery como razón principal de término; [Setup Marketing Relationship Survey 2024](https://21342746.fs1.hubspotusercontent-na1.net/hubfs/21342746/Gated%20Content/Setup%202024%20Marketing%20Relationship%20Survey%20-%20Download%20Full%20Report.pdf) | Alta |
| Existe una brecha entre confianza de la agencia y satisfacción de la marca | Wpromote/Ascend2 reporta 76% de confianza alta en agencias versus 39% de marcas muy satisfechas, además de velocidad como desafío principal; [Mind the Gap](https://www.wpromote.com/report/agency-partnership-challenges-guide/) | Media-alta |
| La medición no habilita decisiones con suficiente confianza | Forrester reporta que 64% de líderes B2B no confía en su medición para decidir y 61% percibe falta de alineación con objetivos de crecimiento; [Forrester 2024](https://www.forrester.com/blogs/b2b-marketing-leaders-dont-trust-their-measurement-and-what-they-measure-isnt-helping/) | Alta |
| Aprobaciones y feedback generan trabajo invisible | Una encuesta de más de 300 especialistas reporta varios días de aprobación para 60% y uso extendido de chats para gestionar feedback; [Postmypost 2025](https://postmypost.io/resources/60-smm-menedzherov-teryayut-do-25-rabochikh-chasov-v-nedelyu-na-soglasovanii-postov) | Media-alta |
| La coordinación multiagencia deja ownership difuso | Estudios de ANA/4As, WFA y fuentes de procurement convergen en problemas de alineación, criterios, transparencia, governance y coordinación; ver [ANA/4As Agency Search Simplification](https://www.ana.net/miccontent/show/id/rr-2022-09-agency-search-simplification) y [WFA Marketing Procurement](https://wfanet.org/knowledge/item/2024/03/28/Marketing-procurement-seeks-better-smarter-metrics-in-2024) | Media-alta |
| La IA agrega riesgo de provenance, derechos y control de marca | WFA reporta preocupaciones extendidas sobre uso de IA generativa por agencias y revisión contractual; [WFA 2024](https://wfanet.org/knowledge/item/2024/09/17/eighty-percent-of-brands-have-concerns-about-agency-use-of-genAI) | Alta |

La voz cualitativa pública repite un patrón: el operador termina persiguiendo aprobaciones, reconstruyendo contexto,
traduciendo el trabajo para dirección y defendiendo resultados que no controla completamente. Reddit, LinkedIn y
blogs de practitioners sirven como señal exploratoria, pero tienen sesgo de autoselección y no deben utilizarse
para estimar frecuencia.

## Hipótesis falsables

| ID | Hipótesis | Se confirma si… | Se debilita si… |
|---|---|---|---|
| H1 | La aprobación y el feedback son el dolor más frecuente y visible. | Al menos 8 de 12 entrevistas describen atrasos, rondas o versiones como problema recurrente y muestran un parche actual. | El problema aparece solo como molestia menor o se resuelve satisfactoriamente con herramientas existentes. |
| H2 | El operador valora más la memoria operacional que un nuevo dashboard. | Al menos 6 participantes describen repetir contexto, perder decisiones o sufrir cambios de equipo; al menos 3 piden recuperar racionales y aprendizajes. | La necesidad dominante es exclusivamente reporting o ejecución puntual. |
| H3 | Un reporte accionable tiene más valor que un reporte con más métricas. | Al menos 6 participantes pueden describir una decisión que no pudieron tomar por falta de evidencia o atribución confiable. | Los reportes actuales ya habilitan decisiones y el problema está en otra etapa del delivery. |
| H4 | Efeonce puede diferenciarse por integración y accountability, no solo por producción. | Al menos 5 participantes trabajan con múltiples proveedores y atribuyen parte importante de la carga a coordinación y ownership difuso. | La mayoría prefiere un proveedor especialista aislado y no percibe valor en integración. |
| H5 | Un sistema obligatorio fallará si agrega fricción. | Los participantes aceptan un flujo solo cuando reduce pasos, persecución o reuniones; rechazan formularios largos o duplicación de canales. | Existe tolerancia alta a procesos adicionales aunque no reduzcan trabajo visible. |
| H6 | El operador-champion es el principal motor de adopción y expansión. | En al menos 6 entrevistas, el participante puede describir una solución que recomendó, defendió o hizo crecer internamente porque mejoró su capacidad de trabajo. | El operador usa el servicio, pero la adopción depende exclusivamente de dirección, procurement o un sponsor distinto. |
| H7 | Un producto operator-first debe aumentar la influencia del usuario, no solo quitarle tareas. | Los participantes valoran poder decidir mejor, responder con evidencia y ganar credibilidad interna, además de ahorrar tiempo. | El valor se limita a outsourcing o ahorro operativo sin impacto en autonomía o influencia. |

## Método

### Entrevistas cualitativas semiestructuradas

- **Muestra objetivo:** 12 a 15 participantes.
- **Geografía inicial:** Chile como beachhead; ampliar a Colombia, México y Perú solo si aparecen diferencias relevantes.
- **Duración:** 35–45 minutos.
- **Modalidad:** videollamada, con consentimiento para tomar notas; no grabar sin autorización explícita.
- **Muestra mínima por perfil:** 3 marketing managers/leads, 3 brand managers, 3 social/content managers y 3 perfiles de performance, comunicaciones, producto o coordinación multiagencia.
- **Criterio de inclusión:** haber trabajado con una agencia externa durante los últimos 12 meses y haber participado en briefs, aprobaciones, reporting o evaluación del proveedor. Priorizar personas que hayan recomendado, defendido o expandido una relación con un proveedor.
- **Criterio de exclusión:** personas que solo hayan contratado una pieza puntual sin responsabilidad sobre el proceso o el resultado.

### Encuesta corta de triangulación

Después de las entrevistas, enviar una encuesta de 8–10 preguntas a 30–50 operadores para medir frecuencia y ordenar los dolores detectados. La encuesta no debe reemplazar las entrevistas ni usarse para declarar product-market fit.

## Guion de entrevista

### Apertura

Explicar que se investiga la forma de trabajo, no se evalúa a la persona ni se busca vender una solución. Pedir permiso para tomar notas y confirmar que los resultados se anonimizarán.

### Contexto

1. ¿Cuál es tu rol y qué parte del trabajo de marketing, marca o contenido depende de agencias externas?
2. ¿Con cuántas agencias o proveedores trabajas actualmente?
3. Cuéntame sobre el último proyecto relevante que ejecutaste con una agencia.
4. ¿Qué parte de la relación puedes decidir tú y qué parte debe aprobar otra persona?

### Reconstrucción del episodio

5. ¿Qué intentabas lograr?
6. ¿Qué ocurrió desde la solicitud inicial hasta la entrega?
7. ¿Dónde se atrasó, repitió o complicó el trabajo?
8. ¿Qué hiciste tú personalmente para destrabarlo?
9. ¿Qué herramientas, documentos o canales utilizaste?

### Consecuencia

10. ¿Qué impacto tuvo: tiempo, costo, calidad, velocidad, riesgo, presión interna o pérdida de oportunidad?
11. ¿Cómo explicaste el resultado a tu jefe, dirección, ventas o finanzas?
12. ¿Qué parte del problema controlaba la agencia y qué parte controlabas tú?
13. ¿Esto afectó tu capacidad de responder o tu credibilidad interna?

### Alternativa y cambio

14. ¿Qué solución improvisaste o qué cambiarías hoy?
15. ¿Has cambiado de agencia, internalizado trabajo o agregado un proveedor por este problema?
16. ¿Qué tendría que hacer una agencia para que sintieras que entiende realmente tu negocio?
17. Si pudieras eliminar una tarea de coordinación mañana, ¿cuál sería?
18. ¿Has recomendado o defendido internamente una agencia o herramienta? ¿Qué te llevó a hacerlo?

### Concept test neutral

Presentar las cinco capacidades en lenguaje funcional, sin mostrar una solución visual ni sugerir una respuesta. Preguntar:

19. ¿Cuál resolvería un problema real en tu operación?
20. ¿Cuál no usarías y por qué?
21. ¿Qué información o control nunca entregarías a una agencia o sistema?
22. ¿Qué tendría que demostrar la solución en los primeros 30 días para que siguieras usándola?
23. ¿Qué evidencia necesitarías para recomendarla a tu director?

No preguntar “¿te gustaría comprar esto?”. Buscar comportamientos, episodios recientes, alternativas actuales y compromisos reales.

## Scorecard de análisis

Cada episodio debe registrarse como una unidad de evidencia, no como una opinión aislada.

| Campo | Escala / contenido |
|---|---|
| Frecuencia | 1 = anual, 2 = trimestral, 3 = mensual, 4 = semanal, 5 = diaria |
| Severidad | 1 = molestia, 3 = retrabajo o retraso, 5 = riesgo comercial/reputacional o pérdida significativa |
| Costo visible | Minutos/horas, rondas, días, presupuesto o proveedores involucrados |
| Costo político | Bajo / medio / alto; impacto en credibilidad o presupuesto del operador |
| Influencia del participante | Baja / media / alta; capacidad real de recomendar, defender o expandir una solución |
| Estado de champion | Usuario / champion potencial / champion activo / sponsor / no champion |
| Alternativa actual | Herramienta, proceso manual, proveedor, internalización o statu quo |
| Insatisfacción con alternativa | 1–5 |
| Control de Efeonce | Bajo / medio / alto |
| Evidencia de cambio | Acción ya realizada, proveedor cambiado, presupuesto asignado o proceso creado |
| Confianza | Alta, media o baja según detalle del episodio y triangulación |

La prioridad de cada dolor se calcula como una hipótesis:

```text
Prioridad = frecuencia × severidad × insatisfacción con alternativa × control de Efeonce
```

No sumar scores para declarar demanda. El score sirve para ordenar entrevistas y seleccionar qué validar después.

## Entregables

1. Evidence ledger anonimizado con episodios, fuente, fecha, perfil y confidence.
2. Mapa de dolores por operador y etapa del workflow.
3. Ranking de hipótesis confirmadas, debilitadas y desconocidas.
4. Customer Model Integrity Pack con gaps, next experiment, owner y fecha de revisión.
5. Recomendación de un piloto de 3 cuentas; no más de una capacidad principal por piloto.
6. Guion de encuesta y base de respuestas sin datos personales innecesarios.

## Criterios de paso

Este research puede pasar a `Validated` solo si:

- existe evidencia primaria de al menos 12 operadores o una justificación documentada de la muestra alcanzada;
- cada hipótesis tiene episodios a favor y evidencia en contra buscada activamente;
- se separan frecuencia, severidad y disposición a cambiar;
- se identifican al menos tres cuentas potenciales para un piloto;
- cada cuenta tiene owner, problema, métrica base, riesgo y próximo compromiso bilateral;
- se identifica al menos un operador-champion potencial por cuenta piloto y se distingue su influencia de la autoridad presupuestaria;
- Legal/Privacy revisa el tratamiento de notas, grabaciones y datos de contacto antes de ampliar la muestra.

## Próximo paso ejecutable

Construir una lista inicial de 20 candidatos, priorizando operadores con capacidad de champion, seleccionar 12 entrevistas y ejecutar cinco entrevistas piloto antes de cerrar el guion. No abrir tareas de producto hasta revisar los primeros cinco episodios y confirmar que las preguntas capturan hechos recientes, no opiniones abstractas.

## Implicación transversal para Efeonce

La misma lógica puede servir para Globe, Wave, Greenhouse y futuras capacidades: identificar primero a la persona que ejecuta el trabajo, entender qué capacidad le falta, construir para su contexto operativo y convertir su éxito en una vía de adopción ejecutiva y expansión comercial. Esto no elimina al director como comprador; cambia el orden de valor: **adopción por el operador, validación por el director**.

## Limitaciones

La evidencia secundaria actual está dominada por Estados Unidos, Reino Unido y estudios globales. Las voces latinoamericanas son menos abundantes y no permiten inferir prevalencia regional. Las conclusiones de este brief deben tratarse como hipótesis hasta completar investigación primaria.
