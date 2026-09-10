# Product Design 360 — ficha de servicio

> **Familia:** Wave · sexta familia **propuesta**
> **Estado:** `Proposed` — no habilita venta general; sólo pilotos gobernados por SOW
> **Owner:** Wave + Design
> **Fecha:** 2026-09-10
> **Modelo económico:** [`Product Design 360 — Business Model V1`](../../business-models/product-design-360/PRODUCT_DESIGN_360_BUSINESS_MODEL_V1.md)
> **Decisión de portfolio:** [`ADR Wave Portfolio Boundaries`](../../architecture/EFEONCE_WAVE_PORTFOLIO_BOUNDARIES_DECISION_V1.md) — la sexta familia está **propuesta, no aceptada**

---

## Qué es

Efeonce diseña las superficies con las que una persona **opera** algo: un sitio transaccional, una app, un portal
de cliente, un SaaS, una herramienta interna, una experiencia conversacional.

Esta familia agrupa el oficio completo, no una etapa de él: investigación, arquitectura de información, flujos,
prototipado, interfaz, design system, accesibilidad, validación con usuarios y operación continua del diseño.

## Qué no es

- **No es producción creativa.** Marca, contenido, campañas, piezas, ilustración y audiovisual pertenecen a
  [Creative Services / Globe](../creative-services/README.md). *Un brandbook no es un design system.*
- **No es desarrollo.** Construir, desplegar y operar la web pertenece a **Web Experience 360**.
- **No es diseño industrial ni de producto físico.**
- **No es "que se vea mejor".** Si no hay una superficie operada por usuarios reales, el encargo no entra acá.

## La frontera que hay que sostener

> **Product Design 360 decide cómo debe ser la experiencia.**
> **Web Experience 360 la construye, la despliega y la opera.**

Ninguna de las dos es completa sola en una superficie web: se venden en una sola propuesta con lanes declarados. En
una app o portal, quien construye puede ser el equipo del cliente — y el SOW debe decirlo con nombre y apellido.

---

## Los seis servicios

| # | Servicio | Rol en la familia | Engagement |
|---|---|---|---|
| **D1** | Diagnóstico de Experiencia | Puerta de entrada | On-Demand |
| **D2** | Experience Design Sprint | Primer valor demostrable | On-Demand / Sample Sprint |
| **D3** | Digital Product Design | Núcleo de proyecto | On-Demand |
| **D4** | Design System — construcción y gobierno | Activo que amortiza | On-Demand + On-Going |
| **D5** | Experience Research & Validation | Capability de evidencia | On-Demand o embebido |
| **D6** | Design Operations | Núcleo recurrente | On-Going |

---

## D1 · Diagnóstico de Experiencia  ·  *puerta de entrada*

**Promesa.** Al terminar sabes dónde pierde gente tu superficie, por qué, y en qué orden intervenir — con una lista
que puedes defender frente a tu jefe sin que suene a opinión.

**Problema y owner.** El Product Manager o el Digital Lead recibe los reclamos y no tiene con qué sostener una
prioridad. El problem owner es el Head of Product o el Gerente de Marketing Digital.

**Alcance incluido.** Inventario de superficies y flujos; recorrido del flujo crítico con hallazgos de usabilidad;
auditoría de accesibilidad contra criterio declarado (WCAG 2.2 AA como piso de referencia); revisión de consistencia
y deuda de diseño; lectura de la instrumentación existente y de lo que no se puede medir hoy; hallazgos priorizados
por impacto × costo de intervención; sesión de lectura con el equipo.

**Opcional.** Testing con usuarios reales (pasa a D5); benchmark de experiencia contra competidores; extensión a
superficies adicionales.

**Excluido.** Cualquier ejecución del remedio; rediseño; desarrollo; auditoría de código.

**Entregables y aceptación.** Informe de hallazgos priorizados con el mapa de superficies. **Se acepta cuando el
cliente puede decidir qué intervenir primero sin pedirnos análisis adicional.** Si entrega un informe correcto y el
cliente no puede decidir, el diagnóstico falló.

**Ciclo.** `intake → inventory → design → propose → approve → execute → verify → document → measure`

**Responsabilidades.** Efeonce: método, ejecución y análisis. Cliente: acceso a la superficie, a la analítica
existente y a las personas que conocen el flujo.

**Dependencias y estados degradados.** Sin acceso a analítica, el diagnóstico se entrega **degradado y declarado**:
se reporta qué no se pudo observar en lugar de estimarlo. Nunca se convierte una hipótesis en un hallazgo.

**Métricas.** Cobertura de flujos auditados; hallazgos por severidad; **ciclo entrega → decisión priorizada**.

**Continuidad.** Alcance cerrado, sin renovación automática. Lo que sigue se cotiza aparte y sin obligación.

**Packaging (hipótesis).** Proyecto cerrado por complejidad: superficies × flujos × plataformas. Sin precio publicado.

---

## D2 · Experience Design Sprint  ·  *primer valor*

**Promesa.** Un flujo crítico rediseñado, validado y listo para construirse — en un alcance acotado y con fecha.

**Por qué existe separado de D3.** Es la prueba barata de que el método funciona antes de comprometer un proyecto
grande. Es también el formato natural del `Sample Sprint`.

**Alcance incluido.** Research ligero sobre el flujo; arquitectura de información y flujos; wireframes; prototipo
navegable; interfaz final con **todos los estados** (vacío, carga, error, sin permiso, sin datos, límite);
microcopy de interfaz; handoff documentado a quien construya; **número de rondas declarado explícitamente**.

**Opcional.** Validación con usuarios (D5); acompañamiento de la implementación con verificación visual.

**Excluido.** Desarrollo; QA funcional; contenido de marketing; rondas fuera de las declaradas.

**Aceptación.** El equipo que va a construir puede hacerlo sin volver a preguntar qué pasa en cada estado.

**Responsabilidades.** Efeonce: criterio y decisión de diseño. Cliente: **un decisor único de diseño nombrado**, y
la vía de implementación declarada. Sin decisor único, el sprint no arranca.

**Estados degradados.** Sin usuarios disponibles para validar, desaparece toda afirmación de "validado" y se
entrega como diseño fundamentado, no verificado.

**Métricas.** First-time-right del handoff; rondas consumidas ÷ declaradas; llegada a producción en ≤2 ciclos.

**Packaging (hipótesis).** Proyecto cerrado por alcance: un flujo o superficie acotada, rondas numeradas.

---

## D3 · Digital Product Design  ·  *núcleo de proyecto*

**Promesa.** El producto o la superficie mayor diseñada completa y coherente consigo misma: no una colección de
pantallas, sino un sistema de decisiones que tu equipo puede seguir extendiendo.

**Alcance incluido.** Research; arquitectura de información del producto; modelo de navegación; sistema de patrones
propio de la superficie; diseño de todos los flujos y estados en scope; prototipo navegable; especificación de
comportamiento e interacción; accesibilidad; responsive y adaptación por breakpoint; microcopy de interfaz;
handoff completo; **acompañamiento de la implementación con verificación visual de lo construido**.

**Opcional.** Design system formal (D4); investigación continua (D5); internacionalización.

**Excluido.** Desarrollo y despliegue; QA funcional; migración de datos; contenido de producto más allá del
microcopy de interfaz.

**Aceptación.** La superficie construida corresponde a lo diseñado, verificado visualmente, y el equipo del cliente
puede diseñar la pantalla siguiente sin nosotros.

**Composición.** Con **Web Experience 360** cuando Efeonce construye; con **Measurement & Analytics** cuando el
engagement compromete métricas de resultado; con **Agent Systems & Platforms** cuando la superficie es
conversacional o agéntica; con **Globe** cuando se necesita ilustración, motion o producción de assets.

**Dependencia crítica.** El SOW debe nombrar **quién construye y con qué capacidad**. Un Digital Product Design sin
vía de implementación declarada no se firma: es la forma más cara de acumular deuda para el cliente.

**Métricas.** Superficies llegadas a producción; drift diseño ↔ runtime; first-time-right del handoff.

**Packaging (hipótesis).** Proyecto cerrado por complejidad: superficies × estados × plataformas × idiomas.

---

## D4 · Design System — construcción y gobierno

**Promesa.** El costo de diseñar la superficie siguiente baja, y sigue bajando. Es el único servicio de la familia
cuyo retorno crece con el tiempo.

**Alcance incluido — construcción.** Auditoría del inventario visual existente y de su duplicación real; tokens
(color, tipografía, espaciado, elevación, motion); biblioteca de componentes con variantes y estados;
documentación operable; modelo de contribución y versionado; criterios de accesibilidad incorporados al sistema;
plan de adopción por superficie.

**Alcance incluido — gobierno (recurrente).** Versionado; revisión de contribuciones del equipo del cliente;
detección de drift entre el sistema y lo que corre en producción; evolución del sistema; acompañamiento de releases.

**Excluido.** Migración de las superficies existentes al sistema (se cotiza aparte); desarrollo de la biblioteca de
código cuando el cliente no tiene equipo — en ese caso compone con Web Experience 360.

**Aceptación.** Una superficie nueva se construye desde el sistema, sin componentes inventados fuera de él.

**Responsabilidades.** Efeonce: sistema, criterio y gobierno. Cliente: adopción real por parte de ingeniería —
**sin eso el sistema es documentación muerta, no un activo**.

**Portabilidad — obligación, no cortesía.** El sistema queda con el cliente en formato operable y no propietario.
Un cliente que no puede llevarse su propio design system está retenido por opacidad, y eso el modelo lo prohíbe.

**Métricas.** Superficies nuevas construidas desde el sistema ÷ totales; contribuciones del equipo del cliente;
drift; duplicación de componentes eliminada.

**Packaging (hipótesis).** Build como proyecto por inventario × plataformas × marcas; gobierno como fee recurrente
por sistema gobernado.

**Evidencia de capability.** AXIS, el design system multi-marca de Efeonce (Efeonce, Kortex, Verk), con tokens
gobernados, drift-guard y gates mecánicos que bloquean el merge cuando una superficie se desvía del sistema.

---

## D5 · Experience Research & Validation

**Promesa.** Dejas de discutir sobre gustos. La decisión queda sostenida por lo que hicieron usuarios reales.

**Por qué existe separado.** Es lo que distingue diseño con evidencia de diseño con criterio. Se vende suelto —a un
equipo que ya tiene diseñador y necesita evidencia— o embebido dentro de D2, D3 o D6.

**Alcance incluido.** Diseño del estudio; reclutamiento; entrevistas en profundidad; usability testing moderado o
no moderado; validación de prototipo; benchmark de experiencia; análisis y recomendación priorizada; medición
post-lanzamiento cuando existe instrumentación.

**Excluido.** Investigación de mercado, segmentación y pricing research (pertenecen a `research-benchmark-operator`
y a la práctica comercial); paneles e incentivos, que van como pass-through declarado.

**Aceptación.** El cliente cambia o confirma una decisión concreta con base en el estudio.

**Derechos y privacidad.** Requiere DPA, base de licitud, consentimiento informado, finalidad limitada, retención
declarada y borrado verificable **antes de reclutar**. Los datos de los usuarios son del cliente.

**Estados degradados.** Sin acceso a usuarios reales del cliente, no se emite ninguna afirmación de "validado".

**Métricas.** Decisiones cambiadas o confirmadas por estudio; tiempo a tarea; tasa de éxito por tarea.

**Packaging (hipótesis).** Proyecto por estudio, o incluido en el alcance de otra línea.

---

## D6 · Design Operations  ·  *núcleo recurrente*

**Promesa.** Tienes capacidad de diseño gobernada y continua, con cola priorizada y calidad verificada — sin
contratar, sin reclutar y sin que la calidad dependa de quién esté disponible ese mes.

**Alcance incluido.** Squad de diseño con capacidad declarada; cola de diseño priorizada con el operador; diseño de
superficies y flujos dentro del envelope; QA visual de lo construido; evolución del design system; acompañamiento
de releases; memoria de decisiones de diseño acumulada y consultable.

**Excluido.** Trabajo fuera del envelope acordado; picos no planificados sin ampliación acordada; desarrollo.

**Unidad de cobro.** **Capacidad gobernada mensual.** Nunca horas. Nunca pantallas. Cobrar por pieza commoditiza el
servicio y castiga precisamente al buen diseño, que es el que resuelve el problema con menos pantallas.

**Modo operativo.** `efeonce-managed` o `co-operated`. **`client-operated` es inválido**: si el cliente dirige la
capacidad, eso es Staff Augmentation o Advisory, y se vende como tal — con el outcome operativo en el cliente.

**Aceptación.** La cola se atiende dentro del envelope y las superficies entregadas llegan a producción sin
retrabajo de diseño.

**Responsabilidades.** Efeonce conserva staffing, método, gobierno y accountability. Cliente: prioriza la cola y
sostiene la capacidad de implementación.

**Métricas.** Cola atendida ÷ ingresada; utilización del envelope; drift; first-time-right; margen del engagement.

**Continuidad.** Contrato recurrente con ventana de aviso; el sistema, la documentación y la memoria de decisiones
quedan con el cliente al salir.

---

## Composición con el resto del ecosistema

| Con | Cuándo | Quién posee qué |
|---|---|---|
| **Web Experience 360** | La superficie es web y Efeonce construye | Product Design decide; Web Experience construye, despliega y opera |
| **Measurement & Analytics** | El engagement compromete métricas de resultado | Sin instrumentación no se compromete ninguna métrica de negocio |
| **Agent Systems & Platforms** | La superficie es conversacional o agéntica | Frontera abierta (D4 del modelo económico); se declara por engagement |
| **Search Visibility 360** | La arquitectura de información toca entidades y descubribilidad | Product Design posee la IA de uso; Search posee la de entidades |
| **Creative Services / Globe** | Se necesita ilustración, motion, contenido o producción | Globe conserva su ownership; no se subcontrata en silencio |
| **Efeonce Digital / Kortex** | La superficie es un CRM o una extensión de él | CRM permanece en Efeonce Digital; Product Design aporta la capa de experiencia |

---

## Lo que esta familia nunca vende

- Diseño por hora o por pantalla.
- Un rediseño sin vía de implementación declarada.
- "Validado" sin usuarios reales del cliente.
- Una métrica de negocio sin instrumentación previa y baseline acordado.
- Un design system que el cliente no pueda llevarse.
- Un caso de éxito de cliente construido con evidencia de un producto propio de Efeonce.

---

## Referencias

- Modelo económico: [`PRODUCT_DESIGN_360_BUSINESS_MODEL_V1.md`](../../business-models/product-design-360/PRODUCT_DESIGN_360_BUSINESS_MODEL_V1.md)
- Portfolio: [`ADR Wave Portfolio Boundaries`](../../architecture/EFEONCE_WAVE_PORTFOLIO_BOUNDARIES_DECISION_V1.md) · [`Wave Business Model V1`](../../business-models/wave/WAVE_BUSINESS_MODEL_V1.md)
- Contrato transversal: [`Product Service Operating Model V1`](../../business-models/EFEONCE_PRODUCT_SERVICE_OPERATING_MODEL_V1.md)
- Capability interna verificable: [`ui-platform/`](../../architecture/ui-platform/README.md) · [`Premium UI Delivery Standard V1`](../../ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md) · [`Frontend Capture Helper V1`](../../architecture/GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md)
