# Product Design 360 — ficha de servicio

> **Familia:** Wave · sexta familia **propuesta**
> **Estado:** `Proposed` — no habilita venta general; sólo pilotos gobernados por SOW
> **Owner:** Wave + Design
> **Versión:** 1.1 — reorganizada por cómo se compra, no por disciplina
> **Fecha:** 2026-09-10
> **Modelo económico:** [`Product Design 360 — Business Model V1.1`](../../business-models/product-design-360/PRODUCT_DESIGN_360_BUSINESS_MODEL_V1.md)
> **Decisión de portfolio:** [`ADR Wave Portfolio Boundaries`](../../architecture/EFEONCE_WAVE_PORTFOLIO_BOUNDARIES_DECISION_V1.md) — la sexta familia está **propuesta, no aceptada**

---

## Qué es

Efeonce **extiende la capacidad de product design de un equipo que ya existe**, sin reemplazarlo.

La empresa mid o grande normalmente ya tiene diseñadores. No le falta gente que sepa diseñar: le falta capacidad
elástica y especializada para las lanes que su equipo nunca alcanza. Su equipo hace feature work; research, design
system, accesibilidad y deuda de diseño quedan siempre para el próximo trimestre.

Cubrimos la disciplina completa —research, arquitectura de información, flujos, prototipado, UI, design system,
accesibilidad, validación y design ops— sobre cualquier superficie operable: app, portal de cliente, SaaS,
herramienta interna, sitio transaccional, experiencia conversacional.

## Qué no es

- **No es reemplazo del equipo interno.** El cliente conserva visión de producto, roadmap y marca. Ver el
  [contrato anti-desplazamiento](#contrato-anti-desplazamiento).
- **No es staff augmentation.** No vendemos perfiles con dedicación bajo dirección del cliente. Ver la
  [distinción](#managed-squad--staff-augmentation).
- **No es producción creativa.** Marca, contenido, campañas y piezas pertenecen a
  [Creative Services / Globe](../creative-services/README.md). *Un brandbook no es un design system.*
- **No es desarrollo.** Construir, desplegar y operar la web pertenece a **Web Experience 360**.
- **No es diseño industrial ni de producto físico.**

## La frontera que hay que sostener

> **Product Design 360 decide cómo debe ser la experiencia.**
> **Web Experience 360 la construye, la despliega y la opera.**

En una superficie web se venden juntas, en una sola propuesta con lanes declaradas. En una app o un portal, quien
construye puede ser el equipo del cliente — y el SOW lo declara con nombre.

---

## Las dos formas de comprar

| | Motion | Cuándo | Unidad |
|---|---|---|---|
| **A** | **Design Velocity** — extensión de capacidad | El cliente **ya tiene** equipo de diseño | Envelope de capacidad mensual **por lane** |
| **B** | **Design ownership** — diseño integral | El cliente **no tiene** equipo, o tiene uno mínimo | Proyecto cerrado por complejidad |

**A es el motion primario.** Es donde está el mid-market y el enterprise.

---

# Motion A · Design Velocity — se venden lanes, no diseñadores

Vender "diseñadores adicionales" es staff augmentation: se compite por tarifa, no queda sistema y no hay defensa de
margen. Vender **una lane con outcome, QA propio y accountability medida** es capacidad gobernada.

**El cliente elige qué lanes conserva su equipo. Efeonce toma las que suelta.** Ese gesto, explícito en el intake,
es lo que convierte al Head of Design —el único con poder de veto— en quien defiende el deal.

## Las tres razones por las que alguien contrata capacidad

🔴 **No todo necesita arreglarse.** Vender sólo a quien tiene algo roto sesga la cartera hacia clientes en
problemas: menos presupuesto, más fricción, más política. **El mejor cliente es el que está creciendo.**

| # | Razón | Estado del cliente | Recurrencia |
|---|---|---|---|
| **1** | 🎯 **Expansión de capacidad productiva** — el roadmap creció, más superficies, más mercados, entró capital, ingeniería contrató | **Sano y creciendo** | **Retainer desde el mes uno.** El envelope crece con él |
| **2** | 🎯 **Gap estructural permanente** — no tiene research, accesibilidad o design system, y **no los va a contratar** | **Sano, incompleto por diseño** | **Recurrente por naturaleza.** El gap se cubre, no se cierra |
| **3** | **Deterioro** — algo se degradó | Con deuda acumulada | Proyecto; necesita conversión |

**1 y 2 no requieren ninguna conversión: nacen recurrentes.** Sólo 3 entra como proyecto.

🎯 **Cómo se prospecta:** no buscando empresas con diseño roto, sino **empresas que van a construir más de lo que
su equipo alcanza a diseñar**. Esa señal es pública y anticipable — ronda levantada, expansión de mercado,
contratación fuerte de ingeniería, línea de producto nueva, adquisición. **Se llega antes del dolor, no después.**

## Las seis lanes

### L1 · Feature Delivery
Overflow de diseño de features del roadmap: flujos, estados, UI, handoff.
**Por qué la sueltan:** el ratio diseñador:ingeniero se rompió y hay sprints bloqueados esperando pantallas.
🔴 **Nunca se vende sola a un cliente nuevo con equipo in-house.** Sola se percibe como sustitución y arranca la
guerra política. Va siempre acompañada de al menos una lane especializada.

### L2 · Research & Validation
Entrevistas, usability testing, validación de prototipo, benchmark de experiencia, medición post-lanzamiento.
**Por qué la sueltan:** la mayoría de los equipos tiene cero o un investigador. Es un gap estructural, no de volumen.
**Requisitos duros:** DPA, base de licitud, consentimiento informado y retención declarada **antes de reclutar**.
Sin usuarios reales del cliente no se emite ninguna afirmación de "validado". Paneles e incentivos van como
pass-through declarado.

### L3 · Design System
Construcción, mantención, versionado, revisión de contribuciones del equipo del cliente, detección de drift contra
producción, evolución.
**Por qué la sueltan:** un backlog de 6+ meses de solicitudes de componentes es el síntoma clásico.
**Portabilidad como obligación:** el sistema queda con el cliente en formato operable y no propietario. Un cliente
que no puede llevarse su propio design system está retenido por opacidad, y eso el modelo lo prohíbe.
**Capability demostrable:** AXIS, el design system multi-marca de Efeonce, con tokens gobernados, drift-guard y
gates que bloquean el merge cuando una superficie se desvía del sistema.

### L4 · Accessibility
Auditoría contra criterio y nivel declarados (WCAG 2.2 AA como piso de referencia), remediación priorizada,
criterios incorporados al sistema para que la próxima superficie nazca accesible.
**Por qué la sueltan:** suele haber un accessibility owner nominal y sobrecargado; y a veces hay un deadline
regulatorio que nadie puede mover.
🔴 Nunca se afirma cumplimiento sin auditoría.

### L5 · Design Debt & Consistency
La deuda que necesita 10–20% de la capacidad de sprint sostenida y que el feature work siempre desplaza.
**Por qué la sueltan:** es la lane que el equipo interno nunca protege. **La mejor candidata a externalizar,
porque no le quita nada a nadie** — es trabajo que hoy no se está haciendo.

### L6 · Design Ops
Intake, priorización, quality gates, QA visual de lo construido, handoff, memoria de decisiones consultable.
**Por qué la sueltan:** sólo los equipos enterprise grandes tienen design ops propio.

## Los dos tiempos de una lane — y de dónde sale el retainer

**Sólo aplica a la razón 3 (deterioro).** Si el cliente entra por expansión o por gap estructural, **la lane nace
en `sostener` y no hay nada que convertir**.

🔴 **Cuando sí hay un arreglo de por medio: una lane vendida sólo como arreglo no es un retainer, es un proyecto
con cuota mensual.**

En ese caso la lane se vende en dos tiempos. El **arreglo** es la entrada: acotado, de decisión rápida y bajo riesgo
político. El **sostener** es el negocio: mensual, y no termina mientras el cliente siga sacando producto.

| Lane | Arreglar *(entrada)* | Sostener *(retainer)* | Disparador de conversión |
|---|---|---|---|
| **L1 · Feature Delivery** | — | **Nace recurrente** | No convierte: se llega a ella tras probar el método en otra lane |
| **L2 · Research** | Un estudio | Cadencia de discovery por release o trimestre | La siguiente decisión de producto queda sin evidencia. **Se vende cadencia, no estudios** |
| **L3 · Design System** | Build del sistema | Versionado, contribuciones, drift, evolución | Llega la primera contribución del equipo del cliente; aparece el primer drift |
| **L4 · Accessibility** | Auditoría + remediación | Gate sobre todo lo nuevo | El siguiente release trae superficies sin auditar; o entra una fecha de cumplimiento |
| **L5 · Design Debt** | Sprint de reducción | Contención sostenida (10–20% de capacidad) | Termina el sprint y la tasa de acumulación vuelve a correr |
| **L6 · Design Ops** | — | **Nace recurrente** | No convierte |

**Por qué el sostener existe de verdad:** el producto sigue saliendo y cada release trae superficies que diseñar,
que deben cumplir el sistema y que suman deuda; el estado se degrada solo —~75% de los equipos ve la deuda volver
al backlog sin nadie que la contenga—; y **el drift es medible**, así que el retainer se defiende con evidencia.

🔴 **Si el drift no sube cuando nos vamos, el retainer no se merecía — y hay que decirlo.** Retener por opacidad
es exactamente lo que el modelo prohíbe.

## Reglas de la arquitectura de lanes

- Una lane se contrata **completa o no se contrata**. Media lane es staff augmentation con otro nombre.
- **L1 nunca sola** a un cliente con equipo in-house.
- El cliente puede **recuperar una lane con aviso**. La reversibilidad es parte del contrato, no una concesión.
- Cada lane declara capacidad, simultaneidad, rondas, turnaround y exclusiones. **Nunca "ilimitado".**
- 🔴 **Todo SOW de arreglo declara el sostener que le sigue** — disparador, alcance y banda de precio. No como
  obligación de compra, sino para que la conversación exista desde el día uno. **Vender un arreglo sin sostener
  declarado es cómo se construye un negocio de proyectos que nunca convierte.**

## Cómo se cobra

**Envelope de capacidad mensual por lane.** Nunca por hora. Nunca por pantalla.

Cobrar por pieza commoditiza el servicio, castiga al buen diseño —que es el que resuelve el problema con menos
pantallas— y le entrega al procurement la calculadora para dividir cualquier propuesta futura.

**El gobierno es línea propia y no se descuenta.** Intake, priorización, quality gates, telemetría, soporte base y
memoria tienen costo operativo real. Si hay que descontar, se descuenta capacidad o alcance; nunca se finge que el
gobierno cuesta cero.

**Los derechos de uso se cotizan aparte** del fee de creación, con canal, territorio y plazo.

## Managed Squad ≠ Staff Augmentation

| | **Design Velocity** | **Staff Augmentation** |
|---|---|---|
| Qué compra | Una lane con outcome y límites | Un perfil con dedicación |
| Quién prioriza la cola | El cliente | El cliente |
| Quién dirige la ejecución | **Efeonce** | El cliente |
| Quién hace QA | **Efeonce** | El cliente |
| Quién responde por la entrega | **Efeonce** — por eso puede comprometer telemetría | El cliente |
| Unidad de cobro | Envelope por lane | Rate por perfil |
| Qué queda al salir | Sistema, documentación, memoria | Nada |

🔴 **Nunca usar "staff augmentation" como sinónimo comercial de "squad dedicado", ni vender Staff Augmentation
prometiendo outcome.** En ese modelo dirige el cliente; Efeonce no puede responder por lo que no dirige.

**Deriva:** un engagement de capacidad gobernada se degrada a staff augmentation cuando el cliente empieza a
asignar tareas directo a las personas y Efeonce deja de dirigir. Es la forma más común de perder margen sin que
nadie cambie el contrato. Se audita en el QBR y se corrige ahí, o se reclasifica y se reprecia.

## Contrato anti-desplazamiento

🔴 **Esto es una norma de delivery y una cláusula de SOW. NO es material de venta.**

Enumerar en una reunión los daños que no vamos a causar **inventa preocupaciones que el cliente no tenía**.
*"Nunca nos reunimos con tus gerentes sin ti"* le enseña que eso es algo que los proveedores hacen, le sugiere que
nosotros lo hemos hecho, y le entrega una sospecha que no traía. Un proveedor enumerando lo que no hará es la
postura de quien espera ser desconfiado: proyecta culpa, no seguridad.

**Cuándo se usa cada cosa:**

| Momento | Qué se hace |
|---|---|
| **En el pitch** | Sólo la cláusula 1, y dicha como oferta de control: *"tú eliges qué frentes conserva tu equipo y cuáles nos sueltas"*. Más el reparto: *"tu equipo dirige el producto; nosotros dirigimos la ejecución de los frentes que nos sueltas"* |
| **Si el cliente levanta el miedo** *("¿esto no termina reemplazando a mi equipo?")* | Ahí sí, el contrato completo — y pesa **porque está escrito y no se lo vendimos** |
| **En el SOW** | Las siete cláusulas, siempre |
| **En delivery** | Se cumplen sin anunciarlas. El cliente las descubre por comportamiento |

🔴 **Manejo de objeciones adelantado a una objeción no levantada = objeción creada.** No se pre-maneja.

1. El cliente **elige qué lanes conserva**; se declaran en el SOW junto con las que Efeonce toma.
2. Efeonce **nunca posee la visión de producto, el roadmap ni la marca**.
3. Efeonce **no discute el desempeño ni el alcance del trabajo de diseño con la jefatura del cliente sin el Head
   of Design presente.** ⚠️ Redactado acotado a propósito: el absoluto *"nunca nos reunimos con tus gerentes sin
   ti"* es **incumplible** —compras, finanzas y legal convocan reuniones— y una promesa incumplible es peor que
   ninguna: la primera vez que ocurre, quedamos como mentirosos por algo que nunca debimos prometer.
4. La **autoría y el crédito** del trabajo son del equipo del cliente hacia adentro de su organización.
5. **Ninguna comunicación de Efeonce compara el desempeño del equipo interno con el nuestro.** La telemetría mide
   nuestras lanes, no a su gente.
6. **Reversibilidad declarada**: el cliente recupera una lane con aviso y se lleva sistema, documentación y memoria.
7. **La transferencia de capacidad es un entregable**, no una cortesía.

🔴 **Nunca decir "somos una extensión de tu equipo" sin el mecanismo pegado** — la lane declarada, el número, el
ciclo, el login. Dicha sola, es exactamente lo que dice la agencia commodity.

🔴 **Y nunca recitar este contrato como argumento.** El mecanismo que sí se dice en voz alta es la elección de
frentes; el resto se cumple, no se promete.

## Telemetría — el moat

Le mostramos al cliente, en su propio login, **si cumplimos**: OTD, FTR, RpA, cycle time, first-time-right del
handoff y drift diseño↔runtime. El sistema declara cuándo un número no es confiable en vez de pintarlo bonito.

Ninguna suscripción de diseño hace esto.

🔴 **SLA ≠ telemetría.** Qué número se firma y qué número sólo se muestra es decisión comercial, no técnica. No se
improvisa en una reunión.

## Puertas de entrada

**Diagnóstico de Capacidad.** 🎯 **La pregunta es hacia adelante, no hacia atrás:** *¿alcanza tu equipo para lo
que vas a construir los próximos doce meses?*

Preguntar "¿qué tienes roto?" sólo funciona con un cliente enfermo. Preguntar "¿te alcanza para tu roadmap?"
funciona con el cliente sano, que es el que queremos.

Incluye: **dimensionamiento de la capacidad de diseño que exige el roadmap declarado** contra la capacidad real del
equipo (ratio diseñador:ingeniero, superficies comprometidas, cadencia de release); inventario de lanes cubiertas,
descubiertas y estructuralmente ausentes; y —cuando existe— lectura de deterioro: consistencia, accesibilidad y
deuda de diseño. Termina con una recomendación de **qué lanes soltar, en qué orden y con qué capacidad**.

**Se acepta cuando el Head of Design puede presentar el caso a su jefe sin pedirnos ayuda** — incluido el número de
capacidad faltante, que es lo que le permite pedir presupuesto.

**Sample Sprint.** Una lane, un ciclo, gobernanza completa. Piloto pagado para validar relación, workflow, costo y
outcome antes de escalar. **Es la mejor puerta que tenemos.**

---

# Motion B · Design ownership — diseño integral

Para el cliente que no tiene equipo de diseño, o tiene uno mínimo. Mercado real pero menor, y con forma de proyecto.

### Experience Design Sprint
Un flujo o superficie acotada: research ligero, IA, flujos, wireframes, prototipo navegable, UI final con **todos
los estados** (vacío, carga, error, sin permiso, sin datos, límite), microcopy de interfaz, handoff documentado,
**rondas numeradas**.
**Aceptación:** el equipo que va a construir puede hacerlo sin volver a preguntar qué pasa en cada estado.

### Digital Product Design
La superficie mayor completa: research, arquitectura de información, modelo de navegación, sistema de patrones,
todos los flujos y estados en scope, prototipo, especificación de interacción, accesibilidad, adaptación por
breakpoint, handoff completo y **acompañamiento de la implementación con verificación visual**.
**Aceptación:** lo construido corresponde a lo diseñado, verificado; y el equipo del cliente puede diseñar la
pantalla siguiente sin nosotros.
🔴 **Dependencia crítica:** el SOW debe nombrar **quién construye y con qué capacidad**. Un Digital Product Design
sin vía de implementación declarada no se firma — es la forma más cara de acumular deuda para el cliente.

### Design System Build
Auditoría del inventario visual y su duplicación real, tokens, biblioteca de componentes con variantes y estados,
documentación operable, modelo de contribución y versionado, criterios de accesibilidad incorporados, plan de
adopción. El gobierno posterior se contrata como lane L3.
**Excluido:** migración de las superficies existentes, que se cotiza aparte.

---

## Requisitos de intake — sin esto no se firma

| Requisito | Por qué |
|---|---|
| **Owner de aprobación nombrado** del lado del cliente | Sin una persona que apruebe no hay ronda 1: hay rondas infinitas. **Causal de descalificación** |
| **Vía de implementación declarada** | Diseño que no llega a producción no produce ningún resultado |
| **Lanes que el cliente conserva**, declaradas | Es el contrato anti-desplazamiento hecho operativo |
| **Rondas numeradas** en el SOW | El scope creep es el asesino silencioso del margen |
| **Sostener declarado**, cuando el SOW es de arreglo | Sin él, la lane termina y el ingreso con ella |
| **Derechos de uso** con canal, territorio y plazo | Cederlos perpetuos e ilimitados dentro del fee base regala múltiplos del trabajo |

## Estados degradados

| Situación | Comportamiento |
|---|---|
| Sin acceso a usuarios reales | El research se entrega **degradado y declarado**; desaparece toda afirmación de "validado" |
| Sin instrumentación de medición | No se prometen métricas de resultado; se propone composición con Measurement o se acota el claim |
| Ingeniería sin capacidad de build | Se escala al sponsor antes de continuar |
| El cliente empieza a dirigir a las personas | Se corrige en el QBR, o se reclasifica el contrato a Staff Augmentation con su precio y su accountability |

---

## Composición con el resto del ecosistema

| Con | Cuándo | Quién posee qué |
|---|---|---|
| **Web Experience 360** | La superficie es web y Efeonce construye | Product Design decide; Web Experience construye, despliega y opera |
| **Measurement & Analytics** | El engagement compromete métricas de resultado | Sin instrumentación no se compromete ninguna métrica de negocio |
| **Agent Systems & Platforms** | La superficie es conversacional o agéntica | Frontera abierta (D4 del modelo); se declara por engagement |
| **Search Visibility 360** | La arquitectura de información toca entidades y descubribilidad | Product Design posee la IA de uso; Search la de entidades |
| **Creative Services / Globe** | Se necesita ilustración, motion, contenido o producción | Globe conserva su ownership; no se subcontrata en silencio |
| **Efeonce Digital / Kortex** | La superficie es un CRM o una extensión | CRM permanece en Efeonce Digital; Product Design aporta la capa de experiencia |

## Contra quién competimos de verdad

🔴 **No es la agencia de diseño local.** Posicionarse ahí es auto-descontarse.

El comparable real es **el costo de contratar** —un senior product designer en EE.UU. cuesta ~USD 186k–239k el
primer año una vez cargado, con reclutamiento y rampa— y **la suscripción de capacidad**. Superside ya publica
contenido sobre escalar capacidad de product design: se está moviendo a este terreno.

⚠️ Esos rangos son de EE.UU. y varias fuentes son proveedores de outsourcing con interés en que contratar se vea
caro. **Frente a un comprador chileno hay que rehacer el cálculo con loaded cost local antes de mostrarlo.** Nunca
mezclar monedas ni mercados en la misma lámina. Detalle y fuentes en la sección 15 del modelo económico.

## Lo que esta familia nunca vende

- Diseño por hora o por pantalla.
- Rondas ilimitadas, ni capacidad "ilimitada".
- Media lane, o un diseñador suelto presentado como capacidad gobernada.
- Un arreglo sin su sostener declarado.
- Staff Augmentation con promesa de outcome.
- Un rediseño sin vía de implementación declarada.
- "Validado" sin usuarios reales del cliente.
- Una métrica de negocio sin instrumentación previa y baseline acordado.
- Un design system que el cliente no pueda llevarse.
- Cualquier insinuación de que el equipo in-house del cliente no da el ancho.
- Un caso de éxito de cliente construido con evidencia de un producto propio de Efeonce.

---

## Referencias

- Modelo económico: [`PRODUCT_DESIGN_360_BUSINESS_MODEL_V1.md`](../../business-models/product-design-360/PRODUCT_DESIGN_360_BUSINESS_MODEL_V1.md)
- Doctrina comercial: skill `creative-practice` — in-housing, el comparable real, Managed Squad ≠ Staff Augmentation, piso de margen y gobierno que no se descuenta
- Patrón hermano: [`Creative Velocity — Modular Production Addendum V1`](../creative-services/EFEONCE_CREATIVE_VELOCITY_MODULAR_PRODUCTION_ADDENDUM_V1.md)
- Portfolio: [`ADR Wave Portfolio Boundaries`](../../architecture/EFEONCE_WAVE_PORTFOLIO_BOUNDARIES_DECISION_V1.md) · [`Wave Business Model V1`](../../business-models/wave/WAVE_BUSINESS_MODEL_V1.md)
- Capability interna verificable: [`ui-platform/`](../../architecture/ui-platform/README.md) · [`Premium UI Delivery Standard V1`](../../ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md) · [`Frontend Capture Helper V1`](../../architecture/GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md)
