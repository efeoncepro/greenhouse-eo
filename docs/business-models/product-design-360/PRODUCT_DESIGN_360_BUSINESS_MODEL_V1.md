# Product Design 360 — Business Model V1

> **Status:** `Proposed` — requiere revisión de Strategy, Finance, Legal y Commercial antes de venta general
> **Owner:** Efeonce Strategy + Wave + Product + Design
> **Version:** 1.0
> **Date:** 2026-09-10
> **Validated as of:** 2026-09-10 — evidencia de capability interna verificada; sin cohortes de cliente externo
> **Review cadence:** trimestral, o antes ante cualquier gate de la sección 11
> **Related decision / architecture / service:** [`ADR Wave Portfolio Boundaries`](../../architecture/EFEONCE_WAVE_PORTFOLIO_BOUNDARIES_DECISION_V1.md) · [`Wave Business Model V1`](../wave/WAVE_BUSINESS_MODEL_V1.md) · [`Ficha de servicio`](../../services/wave/product-design-360.md) · [`Product Service Operating Model V1`](../EFEONCE_PRODUCT_SERVICE_OPERATING_MODEL_V1.md)

---

## 1. Decisión ejecutiva

Efeonce vende el diseño de las superficies con las que una persona **opera** algo: un sitio, una app, un portal de
cliente, un SaaS, una herramienta interna, una experiencia conversacional. Product Design 360 es la **sexta familia
propuesta de Wave** y agrupa el oficio que hoy Efeonce ejerce a diario pero nunca nombró como servicio: research,
arquitectura de información, flujos, prototipado, interfaz, design system, accesibilidad, validación y design ops.

**Por qué existe como familia y no como sub-línea de web.** El ADR de Wave le entregó a **Web Experience 360** el
*diseño técnico, delivery y operación* de la web. Eso cubre arquitectura, performance, accesibilidad técnica,
despliegue y operación — es decir, **construir y operar**. No cubre **decidir cómo debe ser la experiencia**. Esa
decisión es una disciplina distinta, con personas, método y evidencia propios, y se aplica a superficies que no son
un sitio web. Meterla dentro de Web Experience 360 la subordina a "la web" y hace imposible venderla a un cliente
que tiene un producto digital y no necesita un sitio nuevo.

**Cómo cobramos.** Tres formas, según la línea: proyecto de alcance cerrado por complejidad (diagnóstico, sprint,
diseño de producto), build más gobierno recurrente (design system) y **capacidad gobernada mensual** (design ops).
Nunca por hora ni por pantalla.

**Qué riesgo asume Efeonce.** El riesgo estructural de este servicio es el **diseño entregado y no implementado**.
Un diseño que no llega a producción no produce ningún resultado y destruye la evidencia del servicio. Por eso el
modelo obliga a declarar, en cada engagement, quién construye lo diseñado y con qué capacidad.

**Qué NO está aprobado por este documento.** Precio, tarifario, claims públicos, venta general, checkout, ARR ni la
promoción del nombre "Product Design 360" como marca pública. El estado es `Proposed` y sólo habilita pilotos
gobernados por SOW.

---

## 2. Problema, operador, ICP, buyer y JTBD

### El problema

La organización tiene una superficie digital que **funciona técnicamente pero se usa mal**. Nadie discute que el
sitio carga, que la app compila o que el portal está desplegado. Lo que nadie puede responder es por qué el usuario
abandona el flujo, por qué cada pantalla nueva se ve distinta, por qué ingeniería reconstruye el mismo componente
cuatro veces, y por qué cada decisión de interfaz se resuelve por opinión en una reunión.

El síntoma que hace levantar el teléfono suele ser uno de estos cuatro:

1. un flujo crítico con abandono que no se explica por precio ni por tráfico;
2. un producto que creció por agregado y ya no es coherente consigo mismo;
3. un equipo de ingeniería que gasta tiempo en decisiones visuales que nadie gobierna;
4. un rediseño anterior que se entregó en Figma y nunca llegó a producción.

### ICP

| Dimensión | Incluido | Excluido |
|---|---|---|
| Tipo | Organización con una superficie digital propia que un usuario opera de forma recurrente | Quien sólo necesita una pieza gráfica, un brandbook o una campaña |
| Madurez | Tiene equipo de ingeniería propio o proveedor de desarrollo estable | Quien no tiene ninguna vía de implementación |
| Superficie | Sitio transaccional, app, portal de cliente, SaaS, herramienta interna, experiencia conversacional | Producto físico, packaging, diseño industrial, retail físico |
| Tamaño | Mid-market y enterprise con un producto o canal digital que sostiene ingreso u operación | Emprendimiento sin usuarios ni tráfico donde el diseño precede a la demanda |

**Exclusión dura:** si el cliente busca "que se vea mejor" sin una superficie operada por usuarios reales, el
encargo pertenece a **Creative Services / Globe**, no acá.

### Operator & Buying Group Contract

| Rol | Nombre funcional | Qué hace con el servicio |
|---|---|---|
| **Operador** | Product Manager / Product Owner; en superficies de marketing, Digital o Web Lead | Vive dentro del problema todos los días: recibe los reclamos, prioriza el backlog y negocia con ingeniería qué se construye |
| **Primer valor** | — | El diagnóstico le entrega, en una lista defendible y priorizada, la fricción que él ya sospechaba pero no podía sostener frente a su jefe sin sonar a opinión |
| **Operator-champion path** | PM → Head of Product / Head of Digital → CPO, CTO o Gerente Comercial | El operador se vuelve champion cuando el primer flujo rediseñado llega a producción y mueve una métrica que él ya reportaba |
| **Problem owner** | Head of Product o Gerente de Marketing Digital | Responde por el resultado de la superficie |
| **Sponsor / director** | CPO, CTO o CMO según la superficie | Valida prioridad y continuidad |
| **Economic buyer** | Gerente General, CPO o CMO según el tamaño del engagement | Autoriza presupuesto |
| **Governance owner** | Head of Engineering | Manda acá más de lo que parece: el design system y el handoff aterrizan sobre **su** equipo, y puede bloquear el servicio sin tener presupuesto sobre él |
| **Procurement / ratifier** | Compras y Legal | Papeleo, DPA, propiedad intelectual del diseño |
| **Blockers reales** | Ingeniería sin capacidad de implementación; diseñador interno que lee el servicio como amenaza a su rol | Ambos son causa de muerte del engagement y deben detectarse en intake, no en la semana seis |

**Decision process** (cómo se decide): el operador reconoce la fricción → busca evidencia → el sponsor prioriza
frente a otras iniciativas → Engineering confirma que puede implementar → el economic buyer autoriza.

**Paper / procurement process** (cómo se firma): SOW con alcance, entregables, rondas y criterio de aceptación
explícitos; cláusula de propiedad intelectual del diseño entregado; DPA cuando el research toque datos o usuarios
reales del cliente.

Estos dos procesos son **distintos** y se mueven a velocidades distintas. Un sí del operador no es un sí de compra.

### JTBD

- **Funcional:** "necesito que este flujo deje de perder gente y que el próximo que construyamos no empiece de cero".
- **Emocional:** "necesito dejar de defender decisiones de interfaz con mi gusto personal".
- **De riesgo:** "no puedo pagar otro rediseño que quede en Figma y nunca se construya".

### Alternativas actuales y costo de no actuar

| Alternativa | Por qué la eligen | Dónde falla |
|---|---|---|
| Diseñador freelance | Barato y rápido | No deja sistema; el siguiente encargo vuelve a costar lo mismo |
| Agencia de branding | Ya trabajan con ellos | Entrega marca, no interfaz operable; el brandbook no es un design system |
| Que lo haga ingeniería | Nadie tiene que aprobar presupuesto | Ingeniería toma decisiones de diseño sin método y las paga en retrabajo |
| Plantilla o kit UI comprado | Costo cero de decisión | Resuelve la primera pantalla y ninguna de las siguientes |

**Costo de no actuar:** retrabajo de ingeniería en decisiones no gobernadas, abandono en el flujo crítico, y deuda
de diseño que crece de forma compuesta — cada superficie nueva incoherente encarece la siguiente.

---

## 3. Taxonomía de la relación

### Delivery models válidos

| Delivery model | Cuándo aplica | Quién responde por el outcome |
|---|---|---|
| **Productized Service** | Diagnóstico y Experience Design Sprint: alcance, entregable y ciclo fijos | Efeonce |
| **Implementation** | Digital Product Design y Design System Build: alcance mayor, cerrado por complejidad | Efeonce |
| **Managed Squad** | Design Operations: capacidad de diseño gobernada y continua | Efeonce conserva staffing, método y accountability |
| **Staff Augmentation** | Diseñadores integrados al equipo del cliente bajo su dirección | El cliente dirige y asume el outcome operativo del perfil |
| **Advisory** | Design leadership fraccionado: gobierno, criterio y revisión sin ejecución | Efeonce sobre el criterio; el cliente sobre la ejecución |
| **Platform-enabled Service** | Cuando la entrega corre sobre AXIS, GVC o la UI Platform de Greenhouse | Efeonce, con la plataforma declarada en el SOW |

### Engagements

`On-Demand` (diagnóstico, sprint, build) · `On-Going` (design ops, gobierno de design system) · `Sample Sprint`
(prueba acotada antes de un compromiso mayor).

### Operating modes

`efeonce-managed` (default) · `co-operated` (el design system se opera junto al equipo del cliente) ·
`client-operated` (sólo tras transferencia de capacidad verificada).

### Combinaciones inválidas o condicionadas

| Combinación | Estado | Razón |
|---|---|---|
| Design Operations + `client-operated` | **Inválida** | Si el cliente opera, no es capacidad gestionada de Efeonce; eso es Staff Augmentation o Advisory |
| Digital Product Design sin vía de implementación declarada | **Inválida** | Es la causa raíz de muerte del servicio; el SOW debe nombrar quién construye |
| Design System `client-operated` | **Condicionada** | Sólo después de transferencia de capacidad con evidencia de contribución del equipo del cliente |
| Staff Augmentation vendido como "diseño con outcome garantizado" | **Inválida** | En Staff Augmentation el cliente dirige; Efeonce no puede responder por el outcome |
| Product Design 360 vendido como producción creativa | **Inválida** | Eso es Globe; ver sección 7 |

---

## 4. Propuesta de valor y evidencia

### Resultado prometido

Al terminar, el cliente tiene **tres cosas que antes no tenía**: la experiencia diseñada con evidencia en vez de
opinión, un sistema que hace más barata la superficie siguiente, y un equipo que quedó más capaz de decidir sin
Efeonce.

### Mecanismo causal

El valor no viene de las pantallas. Viene de tres mecanismos verificables:

1. **Decisión con evidencia.** Research y validación convierten una discusión de gusto en un hallazgo defendible.
2. **Sistema en vez de piezas.** Un design system amortiza el costo de diseño sobre todas las superficies futuras;
   es el único mecanismo del servicio cuyo retorno crece con el tiempo.
3. **Handoff que sobrevive al build.** Un diseño que llega a producción sin degradarse. Esto se verifica, no se
   promete: es lo que hace Greenhouse Visual Capture.

### Evidencia disponible — y su límite

**Lo que sí podemos demostrar hoy** (capability interna, verificable en el repositorio):

- **AXIS**, design system multi-marca (Efeonce, Kortex, Verk) con tokens gobernados y drift-guard.
- **UI Platform de Greenhouse**: contratos de primitives, Composition Shell, Adaptive Card, contratos de motion y
  elevación, y gates mecánicos que bloquean el merge cuando el diseño se desvía del sistema.
- **Greenhouse Visual Capture (GVC)**: verificación visual automatizada de la superficie construida contra la
  intención de diseño.
- **Premium UI Delivery Standard** con scorecard y piso de calidad declarado.
- Función de diseño formalizada en la organización: `designer` es uno de los 14 role codes reales del portal.

**Lo que NO podemos afirmar todavía.** Esa evidencia demuestra que Efeonce **opera** la disciplina con método y
gobierno propios. No demuestra resultado en un cliente externo, porque el cuerpo de evidencia es un producto propio.
Hasta cerrar el gate G1 de la sección 11, la evidencia se presenta como **capability demostrable**, nunca como caso
de éxito de cliente.

### Claims prohibidos

- "Subimos la conversión un X%" sin instrumentación previa y baseline acordado con Measurement & Analytics.
- "Diseño validado" cuando no hubo usuarios reales del cliente en la validación.
- "Accesible" o "cumple WCAG" sin auditoría contra un criterio nombrado y su nivel.
- Presentar la UI Platform de Greenhouse como caso de cliente.
- Prometer una métrica de negocio que dependa de precio, tráfico, inventario u operación fuera del alcance.

**Nivel de confianza:** capability `alta` (verificable); demanda externa `no verificada`; economics `no validados`.

---

## 5. Arquitectura de ingresos

| Línea | Unidad | Trigger de cobro | Incluye | No incluye | Reconocimiento |
|---|---|---|---|---|---|
| **Diagnóstico** | Proyecto cerrado por complejidad (superficies × flujos × plataformas) | Firma y hito de entrega | Auditoría, hallazgos priorizados, sesión de lectura | Cualquier ejecución del remedio | Al entregar |
| **Experience Design Sprint** | Proyecto cerrado por alcance (un flujo o superficie acotada) | Firma; hitos por fase | Research ligero, IA, flujos, prototipo, UI, handoff, rondas declaradas | Implementación; rondas fuera de las declaradas | Por avance de hitos |
| **Digital Product Design** | Proyecto cerrado por complejidad (superficies × estados × plataformas × idiomas) | Firma; hitos por fase | Research, arquitectura, sistema de patrones, todos los estados, prototipo, handoff, acompañamiento de build | Desarrollo; QA funcional; contenido | Por avance de hitos |
| **Design System — build** | Proyecto por alcance (inventario de componentes, plataformas, marcas) | Firma; hitos | Auditoría, tokens, componentes, documentación, modelo de contribución | Migración de superficies existentes | Por avance de hitos |
| **Design System — gobierno** | Fee recurrente por sistema gobernado | Mensual | Versionado, revisión de contribuciones, drift, evolución | Construcción de superficies nuevas | Devengo mensual |
| **Design Operations** | **Capacidad gobernada mensual** (squad envelope) | Mensual, por adelantado | Cola de diseño priorizada, QA visual, evolución del sistema, acompañamiento de releases | Trabajo fuera del envelope; picos no acordados | Devengo mensual |
| **Research & Validation** | Proyecto por estudio, o incluido dentro de otra línea | Firma o hito | Diseño del estudio, reclutamiento, ejecución, análisis, recomendación | Incentivos y paneles de terceros (pass-through) | Al entregar |
| **Advisory / design leadership** | Fee recurrente por ventana de disponibilidad | Mensual | Criterio, gobierno, revisión, decisiones | Ejecución | Devengo mensual |
| **Pass-through** | Costo + fee de gestión declarado | Al incurrir | Herramientas, paneles, incentivos, licencias de fuentes o assets | — | Sin margen oculto |

**Reglas duras de esta arquitectura:**

- **Nunca** se cobra por hora ni por pantalla. La unidad de Design Operations es **capacidad gobernada**, coherente
  con el invariante de la práctica creativa. Cobrar por pieza commoditiza el servicio y castiga el diseño que
  resuelve un problema con menos pantallas — que es justamente el buen diseño.
- **Nunca** se mezcla costo humano dentro de un pass-through ni dentro de un fee de plataforma.
- Las **rondas** son parte del alcance y se declaran numéricamente en el SOW. Una ronda adicional es change order,
  no cortesía.

### Expansión

Diagnóstico → Sprint → Digital Product Design → Design System → Design Operations es el recorrido natural, y cada
paso tiene un trigger observable (sección 9). La expansión hacia otras familias de Wave —Web Experience 360 para
construir, Measurement para medir, Agent Systems para experiencias conversacionales— es composición, no upsell
automático.

---

## 6. Unidad económica

**Estado: no validada.** Esta sección declara la *forma* del cálculo y sus guardrails. Los valores concretos
requieren cierre de Finance y no se publican acá.

| Concepto | Definición aplicable | Fuente |
|---|---|---|
| **Fully loaded cost** | Costo del miembro cargado con overhead, herramientas y tiempo no facturable, según el modelo de costo canónico de Greenhouse | `GREENHOUSE_MEMBER_LOADED_COST_MODEL_V1.md` |
| **Cost-to-serve** | Fully loaded cost del squad asignado + herramientas de diseño y research + coordinación + memoria/documentación | Finance |
| **Margen bruto** | Por línea, nunca agregado: proyecto, gobierno y capacidad tienen perfiles distintos | Finance |
| **Piso de margen** | Se adopta el piso vigente de la práctica creativa (**45%**) como guardrail provisional para capacidad gobernada, hasta que Finance fije el piso propio de esta familia | `creative-practice` — provisional |
| **Utilización / capacidad** | Para Design Operations, el envelope se dimensiona con holgura declarada; un envelope al 100% no es sostenible ni honesto | Operations |
| **Realization** | Alcance entregado contra alcance vendido; las rondas no declaradas son la principal fuga | Operations + Finance |
| **Costo variable p50/p95** | Concentrado en research: reclutamiento, incentivos y paneles. p95 puede duplicar p50 en segmentos difíciles de reclutar | Finance |
| **Working capital, FX, impuestos** | Según jurisdicción del cliente; el servicio es exportable y arrastra las mismas reglas de FX y tributación que las demás familias de Wave | Finance |
| **Stop-loss** | Un engagement que supera las rondas declaradas sin change order aprobado se detiene y escala; no se absorbe en silencio | Práctica + Finance |

**Sensibilidad principal.** El margen de este servicio es sensible a **una sola variable dominante: las rondas de
revisión**. Un cliente con proceso de aprobación difuso o con más de un decisor no declarado puede consumir el
margen completo en iteración. Por eso el intake debe identificar al decisor único de diseño antes de firmar; si no
existe, el riesgo se refleja en el alcance, no en la esperanza.

---

## 7. Scope, SLA y responsabilidad

### RACI base

| Actividad | Efeonce | Cliente |
|---|---|---|
| Método, criterio y decisión de diseño | **A/R** | C |
| Acceso a usuarios, datos y sistemas | C | **A/R** |
| Decisión de negocio y prioridad | C | **A/R** |
| Implementación en producción | C (o **A/R** si compone Web Experience 360) | **A/R** por defecto |
| Aceptación del entregable | R | **A** |

### Incluido siempre

Método declarado, entregables nombrados, rondas numeradas, criterio de aceptación explícito, documentación del
sistema y handoff a quien construya.

### Excluido siempre

Desarrollo y despliegue (pertenecen a Web Experience 360 o al equipo del cliente); QA funcional; producción de
contenido y assets de campaña (Globe); redacción de contenido de producto más allá del microcopy de interfaz;
gestión de la migración de datos.

### Frontera con Creative Services / Globe — invariante

> Product Design 360 diseña **la interfaz y el sistema con el que alguien opera algo**.
> Globe produce **contenido, marca y piezas**.
> Un brandbook no es un design system. Una campaña no es un producto. Un identity system no es una interfaz.

Cuando un engagement necesita ambas, se declara composición con owner por lane. Globe no se subcontrata en silencio
ni se absorbe su ownership.

### Frontera con Web Experience 360 — invariante

> Product Design 360 **decide cómo debe ser la experiencia**.
> Web Experience 360 **la construye, la despliega y la opera**.

Ninguna de las dos es completa sola en una superficie web. En una app o portal, quien construye puede ser el equipo
del cliente; el SOW lo declara.

### Estados degradados

| Situación | Comportamiento |
|---|---|
| Sin acceso a usuarios reales | El research se entrega **degradado y declarado**: se reporta qué no se pudo validar en lugar de estimarlo, y desaparece toda afirmación de "validado" |
| Sin instrumentación de medición | No se prometen métricas de resultado; se propone la composición con Measurement & Analytics o se acota el claim |
| Ingeniería sin capacidad de build | Se escala al sponsor antes de continuar; entregar diseño sin vía de implementación es acumular deuda para el cliente y destruir la evidencia del servicio |
| Decisor de diseño no identificado | Se detiene el intake hasta nombrarlo |

### Change order

Alcance nuevo, ronda adicional, superficie adicional, plataforma adicional o idioma adicional son change order. Se
cotizan antes de ejecutarse.

---

## 8. Derechos, privacidad, seguridad y compliance

| Materia | Posición |
|---|---|
| **IP del diseño entregado** | Se transfiere al cliente sobre los entregables específicos del engagement, contra pago íntegro. Se declara en el SOW; no se asume |
| **IP de Efeonce** | Método, plantillas, checklists, criterios de auditoría, herramientas internas y AXIS permanecen de Efeonce. Un design system construido *para* el cliente es del cliente; el método con que se construyó, no |
| **Licencias de terceros** | Fuentes tipográficas, iconografía, imágenes y componentes de terceros se declaran con licencia, territorio y plazo. El cliente asume la licencia a su nombre cuando corresponde |
| **Datos de research** | Los datos de usuarios del cliente son del cliente. Requieren DPA, base de licitud, consentimiento informado y política de retención declarada antes de reclutar |
| **Grabaciones de sesiones** | Consentimiento explícito, finalidad limitada, retención declarada y borrado verificable |
| **Portfolio rights** | El uso del trabajo como referencia externa requiere autorización expresa y por escrito del cliente, coherente con la regla del catálogo de servicios |
| **Accesibilidad** | Se declara el criterio y nivel objetivo (WCAG 2.2 AA como piso de referencia). No se afirma cumplimiento sin auditoría |
| **IA en el proceso** | El uso de IA generativa en el proceso de diseño se declara, con sus derechos de uso y su gobernanza. Canon: `greenhouse-ai-creative-rights-governance` + `legal-privacy-ip-operator` |

Legal valida esta sección antes de cualquier venta. Ninguna de estas posiciones está aprobada por este documento.

---

## 9. Journey y expansión

`problema → wedge → uso → operator-champion → sponsor → compra recurrente → evangelización`

| Etapa | Qué pasa | Evidencia que lo prueba | Trigger de la siguiente |
|---|---|---|---|
| **Adquisición** | El operador llega con una fricción concreta o un rediseño fallido | Intake con superficie, flujo y decisor nombrados | Acepta el diagnóstico |
| **Wedge — Diagnóstico** | Hallazgos priorizados y defendibles | El operador presenta la lista a su jefe sin pedirnos ayuda | Prioriza un flujo para intervenir |
| **Primer valor — Sprint** | Un flujo rediseñado llega a producción | La superficie construida pasa verificación visual contra el diseño | La métrica que el operador ya reportaba se mueve |
| **Operator-champion** | El operador defiende internamente la continuidad | Pide una segunda superficie sin que la ofrezcamos | El sponsor pregunta por el resto del producto |
| **Expansión — Producto / Sistema** | Diseño integral o design system | Ingeniería construye desde el sistema en vez de desde cero | Aparece cola de diseño recurrente |
| **Compra recurrente — Design Ops** | Capacidad gobernada continua | Cola priorizada, drift bajo control, contribuciones del equipo cliente | Renovación |
| **Evangelización** | Referencia y caso | Autorización escrita de uso externo | — |

**Onboarding:** intake, inventario de superficies, identificación del decisor único, acceso a sistemas y usuarios,
acuerdo de rondas.

**Time-to-value:** el diagnóstico debe producir una decisión, no un informe. Si el cliente no puede decidir al
terminarlo, el diagnóstico falló aunque el documento sea correcto.

**Downgrade y offboarding:** el design system y su documentación quedan con el cliente en formato operable, no
propietario. **La portabilidad es una obligación del modelo, no una cortesía**: un cliente retenido por no poder
llevarse su propio sistema es exactamente el tipo de captura de valor que el modelo de negocio de Efeonce prohíbe.

---

## 10. Métricas

Toda métrica declara fórmula, período, denominador, fuente y owner. Las de resultado de negocio **requieren
instrumentación previa acordada**; sin ella no se comprometen.

### Valor cliente

| Métrica | Fórmula | Período | Fuente | Condición |
|---|---|---|---|---|
| Completitud del flujo crítico | sesiones que completan ÷ sesiones que inician | Mensual | Analítica del cliente | Requiere baseline pre-intervención |
| Tiempo a tarea | mediana del tiempo de completitud | Por estudio | Usability testing | Requiere usuarios reales |
| Errores por sesión | errores de usuario ÷ sesiones | Mensual | Instrumentación | Requiere Measurement |
| Hallazgos de accesibilidad cerrados | cerrados ÷ detectados, por nivel WCAG | Por ciclo | Auditoría | Criterio declarado |

### Delivery

| Métrica | Fórmula | Owner |
|---|---|---|
| Ciclo diagnóstico → decisión | días desde entrega hasta decisión priorizada del cliente | Práctica |
| First-time-right del handoff | componentes construidos sin retrabajo de diseño ÷ componentes entregados | Práctica + Engineering |
| Drift diseño ↔ runtime | superficies que se desvían del sistema ÷ superficies vivas | Práctica |
| Rondas consumidas | rondas usadas ÷ rondas declaradas | Práctica + Finance |

### Adopción

Superficies nuevas construidas desde el design system ÷ superficies nuevas totales · contribuciones del equipo del
cliente al sistema por período · cola de diseño atendida ÷ cola ingresada.

### Economía

Margen por línea y por engagement · utilización del envelope · realization · costo variable de research p50/p95.

### Riesgo / calidad

Deuda de diseño abierta por superficie · engagements con diseño entregado y no implementado (**esta es la métrica
de alarma del servicio; su estado saludable es cero**) · engagements sin decisor único identificado.

---

## 11. Validación y gates

| # | Hipótesis | Experimento | Muestra | Ventana | Éxito | Fallo → decisión | Owner |
|---|---|---|---|---|---|---|---|
| **G1** | Existe demanda externa por diseño con evidencia, separado de "hacer un sitio" | Ofrecer el Diagnóstico a cuentas vivas y a pipeline de Wave | 8 conversaciones calificadas | 90 días | ≥3 diagnósticos vendidos a 2 clientes distintos | Replegar a capability dentro de Web Experience 360 | Commercial + Wave |
| **G2** | El diagnóstico produce decisión, no informe | Medir ciclo diagnóstico → decisión priorizada | Todos los diagnósticos de G1 | 90 días | ≥70% decide en ≤15 días | Rediseñar el entregable del diagnóstico | Práctica |
| **G3** | El diseño llega a producción | Verificación visual de lo construido contra lo diseñado | Todos los sprints | 120 días | ≥80% de las superficies llegan a producción en ≤2 ciclos | Obligar composición con Web Experience 360 en todo SOW | Práctica + Engineering |
| **G4** | La capacidad gobernada es económicamente viable | Costear un envelope real de Design Ops | 1 engagement | 6 meses | Margen ≥ piso aprobado por Finance | Reclasificar Design Ops como Staff Augmentation | Finance |
| **G5** | La frontera con Globe se sostiene en la venta real | Revisar cada propuesta que mezcle diseño y producción | Todas las del período | 90 días | 0 propuestas con ownership ambiguo | Reabrir la frontera en el ADR | Strategy + Creative Practice |

**Gates de estado.** `Proposed → Approved for validation` requiere G1 iniciado y Legal con posición sobre la
sección 8. `Approved for validation → Commercially approved` requiere G1, G3 y G4 cerrados, más pricing aprobado
por Finance y el pack de pricing de la familia.

---

## 12. Riesgos y self-critique

| Riesgo | Horizonte | Severidad | Mitigación |
|---|---|---|---|
| **Diseño entregado y no implementado** | 12 meses | **Crítico** | Vía de implementación declarada en el SOW; composición obligatoria con Web Experience 360 cuando el cliente no tiene capacidad; verificación visual como criterio de cierre |
| Canibalización con Web Experience 360 en la venta | 12 meses | Alta | Frontera "decidir vs construir" escrita en ambas fichas; una sola propuesta al cliente con lanes declarados |
| Confusión con Globe en el mercado | 12 meses | Alta | Invariante de sección 7; guion comercial explícito; G5 |
| Fuga de margen por rondas | 12 meses | Alta | Rondas numeradas en SOW; decisor único identificado en intake; stop-loss |
| Dependencia de talento senior escaso | 36 meses | Alta | El sistema y el método deben ser el activo, no la persona; documentación y transferencia como parte del entregable |
| Commoditización por IA generativa de interfaces | 36 meses | Media-alta | El diferenciador no puede ser producir pantallas — eso ya se automatiza. Debe ser research, sistema, gobierno y verificación. Si el modelo depende de producir pantallas, el modelo está muerto a 36 meses |
| Servicio percibido como estético y no económico | 12 meses | Media | Toda venta entra por fricción medible, nunca por "se ve antiguo" |
| Cognitive debt del cliente | 36 meses | Media | Transferencia de capacidad y portabilidad como obligación contractual |

### Autocrítica honesta del modelo

1. **La evidencia es propia.** Todo lo que podemos mostrar hoy lo construimos para nosotros. Es evidencia sólida de
   capability y evidencia nula de demanda. G1 existe justamente porque este modelo podría estar describiendo un
   servicio que Efeonce sabe hacer y que nadie está pidiendo comprar por separado.
2. **La sexta familia agrega superficie comercial que hay que sostener.** Wave tenía cinco familias y una historia
   limpia. Seis es más difícil de contar. Si G1 falla, replegar a capability dentro de Web Experience 360 es la
   decisión correcta y no debe leerse como fracaso.
3. **La frontera con Globe es más frágil en la venta que en el papel.** En una reunión real, "diseño" significa
   ambas cosas para el cliente. La frontera se sostiene con guion comercial, no con un invariante en un documento.
4. **El nombre puede no resistir el mercado.** "Product design" en Chile y LATAM puede leerse como diseño
   industrial. Es una decisión abierta, no una decisión tomada.

---

## 13. Decisiones abiertas y revisit triggers

| # | Decisión abierta | Owner | Revisit trigger |
|---|---|---|---|
| D1 | **Nombre público de la familia.** "Product Design 360" es el término que usa Efeonce internamente y el que usó el operador al pedir este modelo; no está validado contra mercado LATAM, donde puede leerse como diseño industrial | Strategy + Commercial | Antes de cualquier material público |
| D2 | ¿Design System se vende como línea propia o siempre dentro de otro engagement? | Wave + Commercial | Al segundo cliente que lo pida suelto |
| D3 | Piso de margen propio de la familia (hoy se adopta el 45% de la práctica creativa como provisional) | Finance | Al cerrar G4 |
| D4 | ¿El diseño de experiencias conversacionales/agénticas vive acá o en Agent Systems & Platforms? | Wave + Product | Al primer engagement que lo requiera |
| D5 | Modelo de transferencia de IP del design system cuando conviven marcas del cliente y componentes de Efeonce | Legal | Antes del primer build de design system |
| D6 | ¿Se aprueba la sexta familia en el ADR de Wave, o se repliega a capability de Web Experience 360? | Strategy + Leadership | Al cerrar G1 |

---

## 14. Fuentes y trazabilidad

**Decisiones y arquitectura**

- [`ADR — Wave como productora de ingeniería digital, visibilidad y sistemas de agentes`](../../architecture/EFEONCE_WAVE_PORTFOLIO_BOUNDARIES_DECISION_V1.md) — `Accepted direction` 2026-07-25; define las cinco familias vigentes y el boundary con Globe
- [`Wave Business Model V1`](../wave/WAVE_BUSINESS_MODEL_V1.md)
- [`Efeonce Product Service Operating Model V1`](../EFEONCE_PRODUCT_SERVICE_OPERATING_MODEL_V1.md)
- [`Efeonce Engagement–Project Operating Model V1`](../EFEONCE_ENGAGEMENT_PROJECT_OPERATING_MODEL_V1.md)
- [`Operator & Buying Group Registry V1`](../OPERATOR_BUYING_GROUP_REGISTRY_V1.md)
- [`Efeonce Operator-First Product & Growth Contract V1`](../../strategy/EFEONCE_OPERATOR_FIRST_PRODUCT_AND_GROWTH_CONTRACT_V1.md)

**Evidencia de capability interna** (verificada 2026-09-10)

- `docs/architecture/ui-platform/` — contratos de primitives, patrones, estado, motion y gobierno
- `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md`
- `docs/ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md` — scorecard y piso de calidad
- `docs/architecture/GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md` — verificación visual (GVC)
- `docs/architecture/GREENHOUSE_DESIGN_TOKENS_V1.md` y `DESIGN.md` — AXIS
- `src/config/role-codes.ts` — `designer` como rol formal de la organización

**Skills que gobiernan la ejecución**

`greenhouse-ai-design-studio` (orquestador) · `product-design-loop` · `design-studio` · `greenhouse-ux` ·
`modern-ui` · `typography-design` · `a11y-architect` · `design-system-governance` · `greenhouse-ux-writing`

**Costos y economía**

- `docs/architecture/GREENHOUSE_MEMBER_LOADED_COST_MODEL_V1.md`
- Piso de margen provisional: invariante de la skill `creative-practice`

**Fecha de verificación de este documento:** 2026-09-10.
