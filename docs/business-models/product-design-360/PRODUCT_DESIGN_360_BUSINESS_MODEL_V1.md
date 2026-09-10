# Product Design 360 — Business Model V1.1

> **Status:** `Proposed` — requiere revisión de Strategy, Finance, Legal y Commercial antes de venta general
> **Owner:** Efeonce Strategy + Wave + Design
> **Version:** 1.1 — corrección de tesis: el comprador **ya tiene equipo de diseño**
> **Date:** 2026-09-10
> **Validated as of:** 2026-09-10 — comparables de mercado verificados con fuente y `as-of`; sin cohortes de cliente
> **Review cadence:** trimestral, o antes ante cualquier gate de la sección 12
> **Related:** [`ADR Wave Portfolio Boundaries`](../../architecture/EFEONCE_WAVE_PORTFOLIO_BOUNDARIES_DECISION_V1.md) · [`Wave Business Model V1`](../wave/WAVE_BUSINESS_MODEL_V1.md) · [`Ficha de servicio`](../../services/wave/product-design-360.md) · [`Product Service Operating Model V1`](../EFEONCE_PRODUCT_SERVICE_OPERATING_MODEL_V1.md)

---

## Delta V1 → V1.1 — qué cambió y por qué

**V1 asumía un cliente sin capacidad de diseño.** Modelaba correctamente la disciplina, pero se equivocaba en el
comprador y en el motion: proponía que Efeonce diseñara el producto del cliente, y listaba al *"diseñador interno
que lee el servicio como amenaza"* como un **blocker**.

**Eso estaba invertido.** Las empresas mid y grandes normalmente **ya tienen product design in-house**. El diseñador
interno no es el obstáculo: es **el comprador, el operador y el campeón** — y también el único con poder de veto.

V1.1 corrige la tesis: el motion primario es **extensión de capacidad de un equipo que ya existe**, no sustitución.
Cambian las secciones 1, 2, 3, 4, 5, 9, 10 y 13, se agrega la sección 8 (contrato anti-desplazamiento) y se
reemplaza la evidencia de mercado por comparables verificados de product design.

Lo que **no** cambió: la frontera con Web Experience 360 y con Globe, la unidad de cobro (capacidad gobernada,
nunca horas ni pantallas) y el estado `Proposed`.

---

## 1. Decisión ejecutiva

Efeonce vende **capacidad de product design gobernada, que extiende un equipo in-house sin reemplazarlo**.

La empresa mid o grande ya tiene diseñadores. No le falta gente que sepa diseñar: le falta **capacidad elástica y
especializada** para las lanes que su equipo nunca alcanza — research, design system, accesibilidad, deuda de
diseño, overflow de features. Su equipo hace feature work; las lanes especializadas quedan siempre para el próximo
trimestre, y nunca llega.

**Dos motions, con prioridad declarada:**

| | Motion | Cliente | Peso |
|---|---|---|---|
| **A** | **Design Velocity — extensión de capacidad** | Ya tiene equipo de diseño in-house | **Primario.** Es donde está el mid-market y el enterprise |
| **B** | **Design ownership — diseño integral** | No tiene equipo, o tiene uno mínimo | Secundario. Mercado real pero menor, y con forma de proyecto |

**El mecanismo comercial de A: se venden lanes, no diseñadores.** Vender "diseñadores adicionales" es staff
augmentation — se compite por tarifa, no queda IP y no hay defensa de margen. Vender **una lane con outcome, QA
propio y accountability medida** es capacidad gobernada. La diferencia no es semántica: define quién responde por
la entrega, y por lo tanto define el precio.

**El mecanismo político: el Head of Design elige qué lanes conserva.** Nosotros tomamos las que él suelta. Ese
gesto, hecho explícito en el intake, es lo que convierte al único que puede vetar el deal en el que lo defiende.

**Tres razones de compra, y sólo una es un problema.** Se contrata capacidad por **expansión** (el roadmap creció
y su equipo no alcanza), por **gap estructural permanente** (no tiene research, accesibilidad o design system y no
los va a contratar) o por **deterioro** (algo se degradó). Las dos primeras son **retainer desde el mes uno** y son
mejores cuentas; sólo la tercera entra como proyecto y necesita convertirse.

**Cómo cobramos.** Envelope de capacidad mensual por lane. Nunca por hora. Nunca por pantalla.

**Qué NO aprueba este documento.** Precio, tarifario, claims públicos, venta general, checkout, ARR, ni el nombre
público "Product Design 360". Estado `Proposed`: sólo habilita pilotos gobernados por SOW.

---

## 2. Problema, operador, ICP, buyer y JTBD

### El problema real, y la aritmética que lo produce

El ratio diseñador:ingeniero en un equipo maduro debería estar entre **1:2 y 1:1** cuando la UI es compleja; en
etapas tempranas ronda **1:4**. Ingeniería crece con presupuesto de ingeniería. Diseño no. Cuando el ratio se
rompe, **diseño se convierte en el cuello de botella de un equipo que ya está pagado**, y el síntoma no aparece en
diseño: aparece como sprints bloqueados esperando pantallas.

Encima de eso, la deuda de diseño necesita **10–20% de la capacidad de sprint** sostenida para no crecer, y
**~75% de los equipos la ve volver al backlog** porque el feature work siempre gana la priorización. Esa lane
—la que nadie protege— es exactamente la que un tercero puede sostener sin quitarle nada al equipo interno.

### 🎯 Las tres razones por las que alguien contrata capacidad — y sólo una es un problema

🔴 **No todo necesita arreglarse.** Modelar el servicio únicamente sobre señales de disfunción sesga el ICP hacia
clientes en problemas, que son los peores clientes: menos presupuesto, más fricción, más política interna. El mejor
cliente es el que **está creciendo y necesita más output**, y en ese cliente no hay nada roto.

| # | Razón | Estado del cliente | Forma comercial |
|---|---|---|---|
| **1** | 🎯 **Expansión de capacidad productiva** — el roadmap creció, hay más superficies, se lanza en más mercados, entró capital, ingeniería contrató | **Sano y creciendo** | **Retainer desde el día uno.** El envelope escala con él |
| **2** | 🎯 **Gap estructural permanente** — no tiene research, accesibilidad o design system in-house, y **no los va a contratar** | **Sano, incompleto por diseño** | **Recurrente por naturaleza.** El gap no se cierra: se cubre |
| **3** | **Deterioro** — algo se degradó y hay que recuperarlo | Con deuda acumulada | Proyecto; **necesita conversión** a sostener |

**Las razones 1 y 2 son retainer desde el primer mes y no requieren ninguna conversión.** Sólo la 3 tiene ese
problema. Y son además mejores cuentas: mayor margen, menos fricción y vida más larga.

🎯 **Consecuencia comercial:** la prospección no se hace buscando empresas con diseño roto. Se hace buscando
**empresas que van a construir más de lo que su equipo alcanza a diseñar** — que es una señal pública y anticipable
(ronda levantada, expansión de mercado, contratación de ingeniería, línea de producto nueva, adquisición).

### Señales de compra observables

| Señal | Qué significa |
|---|---|
**De expansión** *(el mejor cliente — nada está roto)*

| Señal | Qué significa |
|---|---|
| Ingeniería contrató y diseño no | El ratio se va a romper el próximo trimestre. **Llegar antes del dolor** |
| Ronda levantada, adquisición o entrada a un mercado nuevo | Va a haber más superficies de las que su equipo alcanza |
| Línea de producto nueva sin equipo de diseño asignado | Capacidad requerida sin headcount aprobado |
| Migración de plataforma o rediseño de marca aterrizando en producto | Pico de demanda con fecha, que no justifica contratar |

**De gap estructural** *(sano, pero incompleto)*

| Señal | Qué significa |
|---|---|
| No hay investigador, y no hay vacante abierta | El gap es permanente, no temporal |
| El design system lo mantiene quien puede, cuando puede | No hay dueño con tiempo, y no lo habrá |
| Accesibilidad la resuelve ingeniería al final | No hay criterio ni owner |

**De deterioro** *(el cliente con problema — se atiende, pero no se prospecta por acá)*

| Señal | Qué significa |
|---|---|
| Sprints bloqueados esperando diseño | El ratio ya se rompió |
| Backlog de **6+ meses** de solicitudes de componentes | El design system no tiene dueño con tiempo |
| Inconsistencias de UX creciendo entre superficies | Nadie está sosteniendo la coherencia |
| Necesidad de skills que el equipo no tiene: research, accesibilidad, design system | Gap estructural, no de volumen |
| Head of Design haciendo trabajo de producción | El líder es el recurso, y eso tiene techo |
| Una auditoría de accesibilidad con fecha de cumplimiento | Lane con deadline externo y sin dueño interno |

### ICP

| Dimensión | Incluido | Excluido |
|---|---|---|
| **Capacidad de diseño** | **Tiene equipo in-house** (desde 1 diseñador con sobrecarga hasta un área con design ops) | — *(sin equipo → motion B)* |
| Tamaño | Mid-market y enterprise con producto o canal digital que sostiene ingreso u operación | Emprendimiento pre-PMF donde el diseño precede a la demanda |
| Superficie | App, portal de cliente, SaaS, herramienta interna, sitio transaccional, experiencia conversacional | Producto físico, packaging, diseño industrial |
| Ingeniería | Tiene equipo o proveedor de desarrollo estable | Sin ninguna vía de implementación |

**Exclusión dura:** si el cliente busca "que se vea mejor" sin una superficie operada por usuarios reales, el
encargo pertenece a **Creative Services / Globe**.

### Operator & Buying Group Contract

| Rol | Nombre funcional | Qué hace con el servicio |
|---|---|---|
| **Operador** | **Head of Design / Design Director / Design Manager** | Es quien vive el problema: recibe la demanda, no puede contratar al ritmo que la necesita, y su equipo se quema |
| **Primer valor** | — | Una lane sale de su plato en el primer ciclo, con evidencia de que salió bien — sin que él tenga que supervisarla |
| **Champion path** | Head of Design → CPO / VP Product → economic buyer | Se vuelve campeón cuando recupera tiempo para el trabajo por el que quiere ser evaluado |
| **Problem owner** | Head of Design, o Head of Product cuando diseño reporta a producto | Responde por la entrega de diseño |
| **Sponsor** | CPO, CTO o VP Product | Valida prioridad y continuidad |
| **Economic buyer** | CPO, CTO o Gerente General según tamaño | Autoriza presupuesto |
| **Governance owner** | Head of Engineering | El design system y el handoff aterrizan sobre su equipo; puede bloquear sin tener presupuesto |
| **Procurement** | Compras y Legal | SOW, IP del diseño, DPA cuando hay research con usuarios |
| **🔴 El veto** | **El propio Head of Design** | Si el pitch huele a reemplazo, mata el deal — sin importar que el CMO o el CPO quieran firmar |

**Corrección explícita respecto de V1:** el diseñador interno **no es un blocker**. Es el comprador. Tratarlo como
obstáculo fue el error de tesis de V1 y es el error que pierde este deal en la primera reunión.

**Decision process:** el Head of Design reconoce que no llega → busca capacidad → evalúa contratar vs externalizar
→ el sponsor prioriza → Engineering confirma que puede absorber el output → el economic buyer autoriza.

**Paper process:** SOW con lanes, envelope, rondas numeradas, criterio de aceptación, IP y DPA. Se mueve más lento
y por otro carril que el decision process. Un sí del Head of Design no es un sí de compra.

### JTBD

- **Funcional:** "necesito que salgan las lanes que mi equipo nunca alcanza, sin sumar headcount que después no puedo sostener".
- **Emocional:** "necesito dejar de ser el cuello de botella de mi propia área y volver a hacer el trabajo por el que me contrataron".
- **De riesgo:** "no puedo traer un proveedor que le diga a mi jefe que mi equipo no da el ancho".

### Alternativas — el comparable real

🔴 **Nuestro comparable NO es la agencia de diseño local.** Es el costo de contratar, y es la suscripción de
capacidad. Posicionarse contra la agencia local es auto-descontarse.

| Alternativa | Costo para el cliente | Qué obtiene | Qué NO obtiene |
|---|---|---|---|
| **Contratar un senior product designer (US)** | Mediana **~USD 185k/año**; costo cargado **1,4×–2,4× base** → **~USD 186k–239k el primer año** con reclutamiento y rampa | Una persona con contexto total | Elasticidad, cobertura, especialistas; y si la demanda baja, sigue pagando |
| **Contractor embebido senior (US)** | **USD 80–135/hora** | Manos con seniority | Gobierno, QA propio, método, memoria, accountability |
| **Design lead fraccional** | **USD 5.000–12.000/mes** | Criterio senior | Capacidad de ejecución |
| **Suscripción de diseño** *(Design Pickle, NoLimit y similares)* | **USD 399–999/mes** | Volumen de producción gráfica | 🎯 **No es product design.** Es diseño gráfico/marketing. Comparable equivocado si el cliente lo trae a la mesa |
| **Superside** | **~USD 5.000/mes** + plataforma | Capacidad asignada, rápida | Estrategia, métricas de calidad, equipo con nombre. **Ya publica contenido sobre escalar capacidad de product design: se está moviendo a este terreno** |
| **No hacer nada** | 0 | La deuda de diseño sigue creciendo de forma compuesta | *(y es el competidor que más deals gana)* |
| **Efeonce — Design Velocity** | Envelope por lane *(sin precio aprobado)* | Capacidad + criterio + **gobierno medido** | — |

⚠️ **Sesgo declarado de las fuentes.** Buena parte de los comparables de "contratar vs externalizar" provienen de
proveedores de outsourcing, que tienen interés en que contratar se vea caro. Son direccionalmente útiles y su
`as-of` es 2026, pero **no son evidencia neutral**. Antes de usarlos en una propuesta hay que rehacer el cálculo
con el loaded cost del mercado del comprador. Los rangos de arriba son **EE.UU.**; para un comprador chileno el
cálculo es otro y todavía no está verificado *(ver decisión abierta D7)*.

---

## 3. Design Velocity — la arquitectura de lanes

**No se venden diseñadores. Se venden lanes.** Cada lane tiene outcome, QA propio, telemetría y un límite
declarado. El cliente elige cuáles conserva su equipo; Efeonce toma las que suelta.

### Capability única, dos ofertas, dos superficies

**El oficio es uno. Los compradores son dos.** Investigación, UI, UX, design system, accesibilidad y design ops son
la misma disciplina, la misma gente y el mismo método, se apliquen a un producto o a un sitio público. Lo que cambia
no es el trabajo: es **quién lo compra y con qué presupuesto**.

Por eso Product Design 360 se modela como **capability**, no como una familia que compite por el mismo trabajo:

| Plano | Quién | Qué posee |
|---|---|---|
| **Capability** | **Product Design 360** | El oficio: método, gente, quality gates, práctica de design system, telemetría. **Siempre, en las dos superficies** |
| **Oferta — superficie producto** *(app, portal, SaaS, herramienta interna)* | **Product Design 360** | Vende y responde por el outcome. Comprador: Head of Design → CPO/CTO |
| **Oferta — superficie sitio público** *(marca, campaña, landings)* | **Web Experience 360** | Vende y responde por el outcome; **consume esta capability** dentro de su oferta. Comprador: CMO → Head of Digital |

No inventa gramática nueva: en la cartera de Wave las familias **son** capabilities base y las ofertas se componen
sobre ellas. Web Experience 360 componiendo Product Design 360 es el patrón que el ADR ya autoriza.

🔴 **Regla anti-conflicto de canal:** **NUNCA** dos ofertas de Efeonce compitiendo por la capacidad de diseño de la
misma cuenta. Una sola propuesta, con owner declarado por lane. Si el cliente compra las dos superficies, hay **un**
contrato con dos lanes de entrega, no dos contratos.

### Las lanes, y en qué superficie viven

Re-priorizadas 2026-09-10 contra la investigación de mercado (§15). **El orden no es el que tenía V1.1: la evidencia
lo invirtió.**

| Lane | Superficie | Por qué está donde está |
|---|---|---|
| **L1 · Accesibilidad** | **Ambas — compartida** | 🎯 **La más fuerte.** Único dolor con ley, fecha, medición independiente y tendencia **empeorando**. No se comoditiza porque lo empuja la regulación, no el gusto. Aparece primero o segundo en las listas de **los dos** compradores |
| **L2 · Design system y tokens** | **Ambas — compartida** | El sitio consume el sistema que gobierna producto. Segunda costura real entre superficies |
| **L3 · Research y validación** | Ambas | Se contrae mientras se le pide más; el research sintético no lo reemplaza |
| **L4 · Entrega de diseño (UI/UX)** | **Ambas — cambia el owner comercial** | Mismo oficio; en producto lo vende Product Design 360, en sitio público lo vende Web Experience 360. **Es la lane que se está comoditizando: nunca se vende sola** |
| **L5 · Deuda de diseño y consistencia** | Ambas | La lane que el equipo interno nunca protege |
| **L6 · Design ops** | Ambas | La coordinación es el nuevo cuello de botella, no la ejecución |
| **L7 · Endurecer lo generado con IA** | Ambas | **Lane nueva.** El mercado ya paga por terminar o arreglar lo que se empezó con IA |

🎯 **L1 y L2 se contratan UNA sola vez por cliente, aunque compre las dos superficies.** No hay dos accesibilidades
ni dos sistemas de tokens: hay uno. Es un argumento económico honesto para el cliente y **la ruta de expansión más
natural que tenemos** — quien entra por una superficie ya tiene media compra hecha para la otra.

### Delta de re-priorización — qué cambió y por qué

| Cambio | Evidencia (detalle y fuentes en §15) |
|---|---|
| **Accesibilidad sube de 4ª a 1ª** | WebAIM Million 2026: 95,9% de home pages fallando, 56,1 errores/página, **+10,1% interanual, revirtiendo seis años de mejora**. WebAIM atribuye parte del deterioro al desarrollo asistido por IA. Único dolor con serie temporal medida por un tercero sin interés comercial |
| **Entrega de diseño baja de 1ª a 4ª** | Es lo que se está comoditizando: la ejecución se abarata mientras la coordinación se encarece |
| **Design system se re-corta** | Ya lo construyeron y les duele: buy-in 42%→32%, sólo 7% con adopción completa, **sólo 5% mide ROI**. La lane no es construirlo — **es hacerlo adoptado y demostrable** |
| **Se agrega L7** | Upwork Q2-2026: crece el volumen de clientes contratando para terminar o arreglar proyectos empezados con IA |

### Los dos tiempos de una lane — arreglar y sostener

**Sólo aplica cuando el cliente entra por la razón 3 (deterioro).** Si entra por expansión de capacidad o por gap
estructural, **la lane nace en `run` y no hay nada que convertir** — se contrata el envelope y punto.

🔴 **Pero cuando sí hay un arreglo de por medio, una lane vendida sólo como arreglo no es un retainer: es un
proyecto con cuota mensual.** El arreglo termina, y con él termina el ingreso.

| | **Arreglar** *(fix)* | **Sostener** *(run)* |
|---|---|---|
| Forma | Proyecto acotado, On-Demand | Envelope mensual, On-Going |
| Qué es | Cerrar el gap acumulado | Impedir que el gap vuelva a abrirse |
| Termina | **Sí** | **No, mientras el cliente siga sacando producto** |
| Rol comercial | **Entrada.** Bajo riesgo político, decisión rápida | **El retainer.** Es el negocio |

**Por qué el sostener existe de verdad y no es una excusa para seguir facturando.** Tres mecanismos verificables:

1. **El producto sigue saliendo.** Cada release trae superficies que hay que diseñar, que deben cumplir el sistema,
   que necesitan auditoría de accesibilidad y que suman deuda. El retainer se ancla a la **cadencia de release del
   cliente**, no a un backlog que se vacía.
2. **El estado se degrada solo.** ~75% de los equipos ve la deuda de diseño volver al backlog cuando nadie la
   sostiene. La deuda no es un stock que se paga: es una **tasa** que se contiene.
3. **El drift es medible.** Podemos mostrar el número subiendo cuando el gobierno se detiene. El retainer se
   defiende con evidencia, no con argumento.

### Qué regenera cada lane

| Lane | Arreglar *(entrada)* | Sostener *(retainer)* | Qué lo regenera |
|---|---|---|---|
| **L1 · Accesibilidad** | Auditoría + remediación | **Gate sobre todo lo nuevo** | Cada superficie nueva nace sin auditar, la norma no se detiene, y **el promedio de la web empeora mientras el output sube** |
| **L2 · Design system y tokens** | Build, o rescate de uno existente | Versionado, contribuciones, drift, **evidencia de adopción** | El producto crece y el sistema debe crecer con él; y sin evidencia de adopción, el buy-in se cae |
| **L3 · Research** | Un estudio puntual | **Cadencia de discovery** por release o trimestre | Cada decisión nueva necesita evidencia nueva |
| **L4 · Entrega de diseño (UI/UX)** | — *(sin fase de arreglo)* | **Run puro** | El roadmap y el calendario de campañas no terminan nunca |
| **L5 · Deuda de diseño** | Sprint de reducción | **Contención sostenida** (10–20% de capacidad) | La deuda es una tasa, no un stock |
| **L6 · Design ops** | — *(sin fase de arreglo)* | **Run puro** | Intake, priorización y QA ocurren cada sprint |
| **L7 · Endurecer lo generado con IA** | Saneamiento de lo ya generado | **Gate sobre lo que se genera de aquí en adelante** | Mientras el equipo siga generando con IA, sigue habiendo qué endurecer |

🎯 **L1 y L6 son retainer desde el día uno.** Pero L1 no puede ser la entrada —sola se lee como sustitución—, así
que **no es la puerta: es el destino.** Se llega a ella después de haber probado el método en una lane
especializada.

**Reglas de la arquitectura de lanes:**

- Una lane se contrata **completa o no se contrata**. Media lane es staff augmentation con otro nombre.
- **L4 (entrega de diseño) nunca se vende sola a un cliente nuevo con equipo in-house.** Sola, es sustitución percibida y arranca la
  guerra política. Se vende acompañada de al menos una lane especializada (L1, L2, L3 o L7), que es la que el equipo interno
  reconoce como ayuda y no como amenaza.
- El cliente puede recuperar una lane con aviso. La reversibilidad es parte del contrato, no una concesión.
- 🔴 **Todo SOW de arreglo declara el sostener que le sigue** — disparador, alcance y banda de precio. No como
  obligación de compra, sino para que la conversación exista desde el día uno. **Vender un arreglo sin sostener
  declarado es cómo se construye un negocio de proyectos que nunca convierte.**

### Los tres ejes, sin mezclarlos

| Eje | Opciones |
|---|---|
| **Delivery model** | Managed Squad *(default de Design Velocity)* · Embedded Managed Pod · Implementation · Advisory · Staff Augmentation *(sólo cuando el cliente lo pide explícitamente y acepta el traslado de accountability)* · Platform-enabled |
| **Engagement** | On-Going *(el corazón)* · On-Demand *(proyecto)* · Sample Sprint *(la puerta)* |
| **Operating mode** | `efeonce-managed` · `co-operated` *(lo normal cuando hay equipo in-house)* · `client-operated` *(sólo tras transferencia verificada)* |

### 🔴 Managed Squad ≠ Staff Augmentation — la distinción que sostiene el margen

| | **Design Velocity (capacidad gobernada)** | **Staff Augmentation** |
|---|---|---|
| Qué compra el cliente | **Una lane con outcome y límites declarados** | Un perfil con dedicación |
| Quién prioriza | El cliente prioriza la cola | El cliente dirige todo |
| Quién dirige la ejecución | **Efeonce** | El cliente |
| Quién hace QA | **Efeonce** | El cliente |
| Quién responde por la entrega | **Efeonce** — por eso puede comprometer telemetría | El cliente. Si su dirección falla, no es falla nuestra |
| Unidad de cobro | **Envelope de capacidad por lane** | Rate por perfil |
| Qué queda al salir | Sistema, documentación y memoria de decisiones | Nada |

🔴 **NUNCA usar "staff augmentation" como sinónimo comercial de "squad dedicado".** Y nunca vender Staff
Augmentation prometiendo outcome: en ese modelo dirige el cliente, y Efeonce no puede responder por lo que no
dirige.

**El riesgo de deriva es real:** un engagement de capacidad gobernada se degrada a staff augmentation cuando el
cliente empieza a asignar tareas directo a las personas y Efeonce deja de dirigir. Es la forma más común de perder
el margen sin cambiar el contrato. Se detecta en el QBR y se corrige ahí.

---

## 4. Propuesta de valor y evidencia

### El reencuadre que gana

> *"No venimos a reemplazar a tu equipo. Tu equipo tiene el contexto del negocio, que nosotros nunca vamos a tener.
> Venimos a que tu equipo deje de ser el cuello de botella y pueda hacer aquello para lo que lo contrataron.
> Nosotros absorbemos las lanes que nunca alcanzan, con un sistema que te muestra si estamos cumpliendo."*

**El argumento político, que es el que decide:** el Head of Design no quiere ser reemplazado — quiere ser
ascendido. Este servicio es literalmente su promoción: deja de administrar una cola y pasa a dirigir la estrategia
de diseño con capacidad a su servicio. **Véndeselo a él. El CPO firma; él veta.**

### La aritmética que cierra

| | Contratar un senior más | Design Velocity |
|---|---|---|
| Costo | **~USD 186k–239k el primer año** (loaded 1,4–2,4× base, con reclutamiento y rampa) | Envelope declarado |
| Qué obtiene | **1 persona**, generalista, que se enferma, toma vacaciones y puede renunciar | **Varias lanes**, con especialistas que no justificarían un headcount cada uno |
| Cuando baja la demanda | Sigue pagando el sueldo | Ajusta el envelope |
| Cuando sube | Vuelve a reclutar, con meses de rampa | Escala dentro del contrato |
| Research, a11y y design system | Nadie los cubre: no hay headcount para tres especialistas | Cubiertos como lanes |
| Su Head of Design | Sigue administrando la cola | **Recupera la estrategia** |

### Mecanismo causal

1. **La lane sale del plato del equipo interno** y deja de competir por priorización con el feature work.
2. **El sistema hace más barata la superficie siguiente** — el único mecanismo cuyo retorno crece con el tiempo.
3. **El handoff sobrevive al build**, verificado contra lo construido en vez de prometido.
4. **La memoria se acumula:** el ciclo 6 sabe más que el ciclo 1, y eso no se puede comprar de nuevo en otro lado.

### Evidencia — y su límite

**Capability verificable hoy** (interna, en el repositorio): **AXIS** como design system multi-marca con tokens
gobernados y drift-guard; **UI Platform** de Greenhouse con contratos de primitives, Composition Shell y gates que
bloquean el merge cuando una superficie se desvía del sistema; **GVC** para verificación visual de lo construido;
**Premium UI Delivery Standard** con scorecard; y `designer` como rol formal de la organización.

**Lo que NO podemos afirmar.** Todo eso lo construimos para un producto propio. Demuestra que Efeonce **opera** la
disciplina con método y gobierno. **No demuestra resultado en un cliente externo, ni demanda.** Hasta cerrar G1, se
presenta como capability demostrable, nunca como caso de éxito de cliente.

### El moat: accountability medida — **hipótesis, no diferenciador probado**

Podemos mostrarle al cliente, en su propio login, **si cumplimos**: OTD, FTR, RpA, cycle time, first-time-right del
handoff y drift diseño↔runtime. Y el sistema declara cuándo un número no es confiable en vez de pintarlo bonito.

**El espacio está libre en la oferta.** Ningún proveedor de diseño revisado publica un SLA con consecuencia. Design
Pickle lo **desmiente explícitamente** en su propio centro de ayuda: el turnaround es *"a general estimate, not a
guarantee"*. Las métricas de entrega existen en el mercado como **software que el comprador compra para vigilar a su
proveedor**, nunca como compromiso que el proveedor asume.

🔴 **Pero ausencia de oferta NO es evidencia de demanda.** La investigación no encontró a **ningún comprador
articulando** "no pude medir si el proveedor cumplió". Que nadie lo venda puede significar que nadie lo pide. Tratar
este hueco como diferenciador probado es el error más caro que podríamos cometer con este modelo.

**Lo que sí está articulado** son las consecuencias de no poder medir, en forma de reclamo verificable: una
estimación de 100 horas para trabajo que tomó 2; un proyecto de 4 semanas que terminó en 5 meses y pasó de
USD 15.000 a USD 33.000; *"lack of time tracking transparency"*. Eso es demanda de accountability en forma de daño
sufrido, no de requisito pedido. ⚠️ **Y casi toda esa evidencia es de diseño de marketing, no de product design** —
no transfiere limpio a nuestro comprador.

**Estado honesto: hipótesis con evidencia indirecta.** Es lo primero que debe validar el gate G1 o la calculadora.
Un dato del mercado adyacente sugiere el mecanismo real: en accesibilidad **sí** se compra medición y certificación
—Level Access la vende— pero se compra **porque la regulación la obliga**, no porque el proveedor la ofrezca.

🔴 **Es un arma de doble filo:** si comprometes un número y no lo cumples, el cliente lo ve antes que tú. **Qué se
firma como SLA y qué se muestra como telemetría es una decisión comercial, no técnica.**

### Claims prohibidos

- "Subimos la conversión un X%" sin instrumentación previa y baseline acordado.
- "Diseño validado" sin usuarios reales del cliente.
- "Cumple WCAG" sin auditoría contra criterio y nivel nombrados.
- Presentar la UI Platform de Greenhouse como caso de cliente.
- Cualquier insinuación de que el equipo in-house del cliente no da el ancho.
- Comparaciones de costo con cifras US frente a un comprador chileno sin rehacer el cálculo local.

---

## 5. Arquitectura de ingresos

| Línea | Unidad | Trigger | Incluye | No incluye |
|---|---|---|---|---|
| **Lane — arreglar** *(fix)* | Proyecto acotado por lane | Firma; hitos | Cerrar el gap acumulado de esa lane | El sostener posterior, que se cotiza aparte |
| **Lane — sostener** *(run)* | **Envelope de capacidad mensual por lane** | Mensual, por adelantado | Ejecución continua, QA propio, telemetría, memoria | Trabajo fuera del envelope; lanes no contratadas |
| **Gobierno / plataforma** | Línea propia por engagement | Mensual | Intake, priorización, quality gates, telemetría, soporte base, memoria | — |
| **Sample Sprint** | Piloto pagado acotado | Firma | Una lane, un ciclo, gobernanza completa | Compromiso de continuidad |
| **Diagnóstico de Capacidad** | Proyecto cerrado | Firma | Dimensionamiento de la capacidad que exige el roadmap contra la real; lanes cubiertas/ausentes; recomendación | Ejecución |
| **Design System — build** | Proyecto por inventario × plataformas × marcas | Hitos | Auditoría, tokens, componentes, documentación, modelo de contribución | Migración de superficies existentes |
| **Diseño integral (motion B)** | Proyecto por complejidad | Hitos | Research, arquitectura, sistema, estados, prototipo, handoff, acompañamiento | Desarrollo, QA funcional |
| **Advisory / design leadership** | Fee por ventana de disponibilidad | Mensual | Criterio, gobierno, revisión | Ejecución |
| **Derechos de uso** | Se cotiza **aparte** del fee de creación | Según alcance | Canal, territorio y plazo declarados | Perpetuidad e ilimitado dentro del fee base |
| **Pass-through** | Costo + fee de gestión declarado | Al incurrir | Paneles, incentivos de research, licencias | Margen oculto |

**Reglas duras:**

- 🔴 **Nunca por hora. Nunca por pantalla.** Cobrar por pieza commoditiza el servicio y castiga al buen diseño, que
  es el que resuelve el problema con menos pantallas. Además entrega al procurement la calculadora para dividir
  cualquier propuesta futura.
- 🔴 **El gobierno es línea propia y no se descuenta.** Tiene costo operativo real y sostiene el control, la
  transparencia y el switching cost. Si hay que descontar, se descuenta capacidad o alcance — nunca se finge que el
  gobierno cuesta cero.
- 🔴 **Nunca "rondas ilimitadas".** Rondas numeradas en el SOW; la siguiente es change order.
- 🔴 **Nunca derechos perpetuos, exclusivos e ilimitados dentro del fee base.**
- 🔴 **El ad-hoc nunca más barato que el marginal del plan.** Rompe la planificación y consume coordinación: tiene
  que costar más.

### 🎯 La arquitectura de recurrencia — cómo un arreglo se vuelve retainer

**Dos de las tres entradas ya son recurrentes y no necesitan conversión:**

| Entrada | Recurrencia | Por qué |
|---|---|---|
| **1 · Expansión de capacidad** | 🎯 **Retainer desde el mes uno** | El envelope se dimensiona contra el roadmap del cliente. Mientras siga construyendo, sigue necesitándolo — y **crece con él** |
| **2 · Gap estructural** | 🎯 **Recurrente por naturaleza** | El gap no se cierra: se cubre. Un cliente que no va a contratar un investigador lo sigue necesitando cada trimestre |
| **3 · Deterioro** | Requiere conversión | El arreglo termina. Es la única entrada con este problema |

**Para la entrada 3, la conversión no aparece por insistir: aparece porque el arreglo crea un estado que se degrada
solo.** Cada lane tiene un disparador observable, y el SOW del arreglo lo declara desde el día uno.

| Lane | Disparador de conversión — el momento exacto |
|---|---|
| **L2 · Design system** | Llega la primera contribución del equipo del cliente y hay que revisarla; aparece el primer drift contra producción |
| **L1 · Accesibilidad** | El siguiente release saca superficies nuevas sin auditar; o entra una fecha de cumplimiento |
| **L5 · Deuda de diseño** | Termina el sprint de reducción y la tasa de acumulación vuelve a correr — medible desde el ciclo siguiente |
| **L3 · Research** | Se cierra el estudio y la siguiente decisión de producto queda otra vez sin evidencia. **Se vende cadencia, no estudios** |
| **L4 · Entrega de diseño** | No convierte: **nace recurrente**. Se llega a ella tras probar el método en otra lane |
| **L6 · Design ops** | No convierte: **nace recurrente** |

**La métrica que sostiene la conversación de renovación es el drift.** Si podemos mostrar el número subiendo
cuando el gobierno se detiene, el retainer se defiende con evidencia y no con argumento. Si el drift no sube
cuando nos vamos, **el retainer no se merecía y hay que decirlo** — es exactamente el tipo de dependencia opaca
que el modelo de negocio de Efeonce prohíbe.

**Salud de la cartera:** un engagement es sano cuando ≥1 lane está en `run`. Una cuenta con todas sus lanes en
`fix` es un cliente de proyectos, no una cuenta recurrente, y así debe reportarse.

🎯 **Y la métrica de calidad de la cartera es la mezcla de entradas.** Una cartera dominada por la entrada 3
(deterioro) es una cartera de clientes con problemas: proyectos, fricción y conversión incierta. Una cartera
dominada por las entradas 1 y 2 es recurrente por construcción. **La prospección debe empujar hacia 1 y 2.**

### Expansión

`Diagnóstico → Sample Sprint (1 lane) → 2ª lane → design system → Design Ops → motion B en una superficie nueva`.
La expansión hacia otras familias de Wave —Web Experience 360 para construir, Measurement para medir, Agent
Systems para superficies conversacionales— es composición con ownership declarado, no upsell automático.

---

## 6. Unidad económica

**Estado: no validada.** Se declara la *forma* del cálculo y sus guardrails; los valores concretos los cierra
Finance y no se publican acá.

| Concepto | Definición aplicable |
|---|---|
| **Fully loaded cost** | Del squad asignado. ⚠️ **El motor real es `pricing-engine-v2.ts`** (cost stack por línea, `costBasisConfidenceScore`, `suggestedBillRate`, `margin-health` que bloquea bajo el piso) — está en producción y no detrás de flag. El `Member Loaded Cost Model V1` es **SPEC no implementado**: no se cita como capacidad |
| **Cost-to-serve por lane** | Loaded cost + herramientas + research variable + coordinación + gobierno + memoria. **Se calcula por lane**, porque su perfil difiere: L2 tiene costo variable alto, L3 es intensiva en seniority, L5 es la más estandarizable |
| **Piso de margen** | 🔴 **45% de margen bruto. Regla, no guía.** El piso se computa, no se siente |
| **Cotizador** | 🔴 Ningún precio sale sin pasar por el motor de pricing con loaded cost detrás. Un precio sin loaded cost es una corazonada con decimales |
| **Utilización** | El envelope se dimensiona con holgura declarada; un envelope al 100% no es sostenible ni honesto |
| **Realization** | Alcance entregado ÷ vendido. Las rondas no declaradas son la principal fuga |
| **Costo variable p50/p95** | Concentrado en L2 (research): reclutamiento, incentivos y paneles. p95 puede duplicar p50 en segmentos difíciles |
| **Stop-loss** | Superar las rondas declaradas sin change order aprobado detiene y escala; no se absorbe en silencio |

**Las dos sensibilidades dominantes:** las **rondas de revisión** (un cliente con decisor difuso puede consumir el
margen completo en iteración) y la **deriva a staff augmentation** (cuando el cliente empieza a dirigir, se pierde
la justificación del precio de capacidad gobernada sin que nadie cambie el contrato).

---

## 7. Scope, SLA y responsabilidad

### RACI base

| Actividad | Efeonce | Cliente |
|---|---|---|
| Visión de producto y roadmap | — | **A/R** |
| Prioridad de la cola de cada lane | C | **A/R** |
| Dirección de la ejecución dentro de la lane | **A/R** | C |
| Método, QA y criterio de calidad | **A/R** | C |
| Acceso a usuarios, datos y sistemas | C | **A/R** |
| Implementación en producción | C *(o A/R si compone Web Experience 360)* | **A/R** por defecto |
| Aceptación | R | **A** |

### Fronteras — invariantes

> **Product Design 360 decide cómo debe ser la experiencia.**
> **Web Experience 360 la construye, la despliega y la opera.**

> **Product Design 360 diseña la interfaz y el sistema con el que alguien opera algo.**
> **Globe produce contenido, marca y piezas.** *Un brandbook no es un design system.*

### Estados degradados

| Situación | Comportamiento |
|---|---|
| Sin acceso a usuarios reales | El research se entrega **degradado y declarado**; desaparece toda afirmación de "validado" |
| Sin instrumentación | No se prometen métricas de resultado; se propone composición con Measurement o se acota el claim |
| Ingeniería sin capacidad de build | Se escala al sponsor antes de continuar |
| Sin owner de aprobación del lado del cliente | 🔴 Causal de descalificación. Sin una persona que apruebe no hay ronda 1: hay rondas infinitas |
| El cliente empieza a dirigir a las personas | Se corrige en el QBR o se reclasifica el contrato a Staff Augmentation, con su precio y su accountability |

---

## 8. Contrato anti-desplazamiento

**Norma de delivery y cláusula de SOW — NO material de venta.** Enumerar en una reunión los daños que no vamos a
causar inventa preocupaciones que el cliente no traía, y proyecta la postura de quien espera ser desconfiado. En el
pitch sólo se dice la cláusula 1, como **oferta de control** y no como promesa de contención. El contrato completo
se despliega **si el cliente levanta el miedo**, y pesa porque está escrito y no se le vendió.

1. **El cliente elige qué lanes conserva.** Se declaran en el SOW, con las que Efeonce toma y las que no.
2. **Efeonce nunca posee la visión de producto, el roadmap ni la marca.** Esas quedan en el equipo interno.
3. **Efeonce no discute el desempeño ni el alcance del trabajo de diseño con la jefatura del cliente sin el Head of
   Design presente.** ⚠️ Acotado a propósito: el absoluto *"nunca sin ti"* es incumplible (compras, finanzas y legal
   convocan reuniones) y una promesa incumplible es peor que ninguna.
4. **La autoría y el crédito del trabajo son del equipo del cliente** hacia adentro de su organización.
5. **Ninguna comunicación de Efeonce —propuesta, QBR, informe— compara el desempeño del equipo interno con el
   nuestro.** La telemetría mide nuestras lanes, no a su gente.
6. **Reversibilidad declarada:** el cliente puede recuperar una lane con aviso, y se lleva el sistema, la
   documentación y la memoria en formato operable.
7. **La transferencia de capacidad es un entregable, no una cortesía.** El objetivo declarado es que su equipo
   quede más capaz — porque un cliente más capaz produce mejores briefs, y mejores briefs son menos rondas, mejor
   margen y gente que no se quema.

🔴 **Regla anti-humo:** nunca decir "somos una extensión de tu equipo" sin el mecanismo pegado — el login, el
número, el ciclo, la lane declarada. Dicha sola, es exactamente lo que dice la agencia commodity.

🔴 **Regla de placement:** este contrato **no se recita en la venta**. Pre-manejar una objeción que el cliente no
levantó es crearla. Lo único que se dice en voz alta es la elección de frentes; lo demás se cumple y el cliente lo
descubre por comportamiento.

---

## 9. Derechos, privacidad, seguridad y compliance

| Materia | Posición |
|---|---|
| **IP del diseño entregado** | Se transfiere al cliente sobre los entregables del engagement, contra pago íntegro; se declara en el SOW |
| **IP de Efeonce** | Método, plantillas, criterios de auditoría, herramientas internas y AXIS permanecen de Efeonce. Un design system construido *para* el cliente es del cliente; el método con que se construyó, no |
| **Derechos de uso** | Se cotizan **aparte** del fee de creación, con canal, territorio y plazo. Cederlos perpetuos e ilimitados dentro del fee base es regalar múltiplos del trabajo |
| **Licencias de terceros** | Fuentes, iconografía e imágenes con licencia, territorio y plazo declarados; a nombre del cliente cuando corresponde |
| **Datos de research** | Del cliente. Requieren DPA, base de licitud, consentimiento informado y retención declarada **antes de reclutar** |
| **Grabaciones** | Consentimiento explícito, finalidad limitada, borrado verificable |
| **Portfolio rights** | Uso externo del trabajo sólo con autorización expresa por escrito |
| **Accesibilidad** | Criterio y nivel declarados (WCAG 2.2 AA como piso de referencia). No se afirma cumplimiento sin auditoría |
| **IA en el proceso** | Se declara, con derechos de uso y gobernanza. Canon: `greenhouse-ai-creative-rights-governance` + `legal-privacy-ip-operator` |

Legal valida esta sección antes de cualquier venta.

---

## 10. Journey y expansión

`problema → wedge → primera lane → operator-champion → segunda lane → sistema → capacidad recurrente → evangelización`

| Etapa | Qué pasa | Evidencia | Trigger |
|---|---|---|---|
| **Adquisición** | El Head of Design llega con una lane que nunca alcanza | Intake con lanes, ratio y decisor nombrados | Acepta el diagnóstico |
| **Wedge — Diagnóstico** | Mapa de capacidad + recomendación de qué lanes soltar | Puede presentar el caso a su jefe sin nuestra ayuda | Elige la primera lane |
| **Sample Sprint — 1ª lane** | Una lane sale de su plato, un ciclo, gobernanza completa | La lane entrega sin que él la supervise | Pide continuidad |
| **Operator-champion** | Defiende internamente la continuidad | Pide una segunda lane sin que se la ofrezcamos | El sponsor pregunta por el resto |
| **Expansión — 2ª lane / sistema** | Se suman lanes especializadas o el design system | Ingeniería construye desde el sistema | Aparece cola recurrente |
| 🎯 **Conversión fix → run** | Termina el arreglo y se activa el sostener declarado en el SOW | El disparador de esa lane ocurrió y es observable *(drift, release nuevo, tasa de deuda corriendo)* | **Primer ingreso recurrente** |
| **Capacidad recurrente** | Envelope estable, QBR con telemetría | OTD/FTR/RpA, drift, adopción del sistema | Renovación |
| **Evangelización** | Referencia y caso | Autorización escrita | — |

**Time-to-value:** la primera lane debe entregar dentro del primer ciclo. Si el Head of Design tiene que
supervisarnos, no le devolvimos tiempo — y el servicio no cumplió su promesa aunque el trabajo esté bien.

**Offboarding:** sistema, documentación y memoria quedan con el cliente en formato operable, no propietario. **La
portabilidad es obligación del modelo.** El switching cost se gana por capacidad y memoria, nunca por opacidad.

---

## 11. Métricas

Cada métrica declara fórmula, período, denominador, fuente y owner. Las de resultado de negocio requieren
instrumentación previa acordada.

**Valor cliente** — capacidad devuelta al equipo interno *(horas de su equipo liberadas de la lane, declaradas por
el cliente)* · backlog de la lane atendido ÷ ingresado · completitud del flujo crítico *(requiere baseline)* ·
hallazgos de accesibilidad cerrados por nivel WCAG · deuda de diseño cerrada ÷ detectada.

**Delivery** — OTD · FTR · RpA · cycle time · first-time-right del handoff · drift diseño↔runtime.

**Adopción** — superficies nuevas construidas desde el design system ÷ totales · contribuciones del equipo del
cliente al sistema · lanes activas por cuenta.

**Recurrencia** — 🎯 **lanes en `run` ÷ lanes contratadas** *(salud de cartera; una cuenta con todo en `fix` es
cliente de proyectos)* · tasa de conversión fix → run por lane · meses de permanencia del envelope · drift medido
en las ventanas sin gobierno *(la evidencia de que el sostener se merece)*.

**Economía** — margen por lane y por engagement · utilización del envelope · realization · costo variable de
research p50/p95.

**Riesgo / calidad** — 🔴 **engagements derivando a staff augmentation** *(alarma; estado saludable: cero)* ·
engagements con diseño entregado y no implementado *(alarma; estado saludable: cero)* · engagements sin owner de
aprobación identificado.

🔴 **SLA ≠ telemetría.** Qué número se firma y qué número sólo se muestra es decisión comercial, no técnica.

---

## 11b. Wedge declarado — Calculadora de Capacidad de Diseño

**Estado:** idea aprobada por el operador 2026-09-10 · **no construida** · owner Wave + Growth

**Qué es.** Una herramienta pública y autoservicio: el visitante declara su número de ingenieros, la complejidad
de su producto, sus superficies comprometidas y su cadencia de release; obtiene **la brecha entre la capacidad de
diseño que su roadmap exige y la que tiene**.

**Por qué esta forma y no un folleto.** Replica el patrón del AI Visibility Grader, que Efeonce ya sabe operar:
entrega valor por sí sola, califica a quien entra y —lo decisivo— **produce el número que el Head of Design
necesita para pedir presupuesto**. No le damos una pieza de marketing: le damos munición para su reunión interna.

🎯 **Y probablemente ES el experimento del gate G1, no un entregable posterior a él.** Construir el wedge después
de validar demanda invierte el orden: la calculadora es una forma **más barata y más rápida** que ocho
conversaciones de venta para producir la misma señal —¿le importa a un líder de diseño este problema lo suficiente
como para dedicarle tiempo?—, y además deja lista la captación. Decidir esto antes de programar G1.

**Contrato de la herramienta:**

- **NUNCA** devuelve un precio ni una cotización. Devuelve una brecha de capacidad, y esa brecha es del cliente.
- **NUNCA** presenta el resultado como diagnóstico: es un dimensionamiento declarativo con los datos que el propio
  usuario ingresó. El diagnóstico pagado es otra cosa y se declara distinto.
- **NUNCA** ancla el resultado en un único ratio de benchmark como si fuera ley. Los ratios varían mucho por tipo
  de producto; el output debe declarar su supuesto y permitir ajustarlo *(ver §13, riesgo del benchmark)*.
- **SIEMPRE** el resultado es exportable y presentable por el usuario **sin la marca Efeonce como protagonista**.
  Si no le sirve para su reunión interna, falló.

**Dependencias:** `growth-marketing-cro` (loop, activación y medición) · `greenhouse-growth-forms` (captación) ·
patrón de referencia `src/lib/growth/ai-visibility/**` · `greenhouse-gtm-ga4-operator` (instrumentación).

**Antes de construir:** decidir si reemplaza o acompaña a G1, y fijar la métrica primaria (no es tráfico: es
**cuántos usuarios exportan o comparten el resultado**, que es la señal de que sirvió para la reunión interna).

## 12. Validación y gates

| # | Hipótesis | Experimento | Muestra | Ventana | Éxito | Fallo → decisión |
|---|---|---|---|---|---|---|
| **G1** | Un equipo de diseño in-house **compra** capacidad externa por lane | Diagnóstico + propuesta de lane a cuentas vivas y pipeline Wave | 8 conversaciones con Head of Design | 90 días | ≥3 Sample Sprints vendidos a 2 clientes distintos | Replegar a capability dentro de Web Experience 360 |
| **G2** | El Head of Design es el comprador, no el veto | Registrar quién abre, quién impulsa y quién frena cada deal | Todos los de G1 | 90 días | ≥60% impulsado por el Head of Design | Rediseñar el pitch y el interlocutor de entrada |
| **G3** | La lane devuelve capacidad de forma verificable | Medir capacidad liberada declarada por el cliente | Todos los Sample Sprints | 120 días | El cliente declara haber recuperado capacidad y renueva | Rediseñar el alcance de la lane |
| **G4** | La capacidad gobernada no deriva a staff augmentation | Auditar dirección de tareas en el QBR | Todos los On-Going | 6 meses | 0 engagements derivados | Reclasificar y repreciar |
| **G5** | El envelope por lane es económicamente viable | Costear lanes reales contra el piso de 45% | ≥2 lanes distintas | 6 meses | Margen ≥ piso en cada lane | Retirar la lane deficitaria del catálogo |
| **G6** | La frontera con Globe se sostiene en la venta | Revisar cada propuesta que mezcle diseño y producción | Todas las del período | 90 días | 0 propuestas con ownership ambiguo | Reabrir la frontera en el ADR |

`Proposed → Approved for validation` requiere G1 iniciado y posición de Legal sobre la sección 9.
`Approved for validation → Commercially approved` requiere G1, G3, G4 y G5 cerrados, más pricing aprobado por
Finance.

---

## 13. Riesgos y self-critique

| Riesgo | Horizonte | Severidad | Mitigación |
|---|---|---|---|
| 🔴 **El Head of Design lo lee como reemplazo y veta** | 12 meses | **Crítico** | Sección 8 completa; el pitch entra por su promoción, no por nuestra capacidad; él elige qué lanes conserva |
| 🔴 **Deriva a staff augmentation** | 12 meses | **Crítico** | Lanes completas; Efeonce dirige la ejecución; auditoría en QBR; G4 |
| Diseño entregado y no implementado | 12 meses | Alta | Vía de implementación declarada; composición con Web Experience 360; verificación visual como criterio de cierre |
| 🔴 **La lane no convierte de arreglo a sostener** | 12 meses | **Crítico** | Todo SOW de arreglo declara su sostener con disparador y banda de precio; el drift como evidencia de renovación; salud de cartera medida por lanes en `run` |
| **El cliente internaliza la capacidad y el retainer se achica** | 36 meses | Media | Es consecuencia buscada del Why, no un fallo. Se transfiere **capacidad de decidir y contribuir**; se conserva **capacidad de ejecutar a volumen y profundidad especialista**. Ningún equipo interno quiere volverse una fábrica de auditorías de accesibilidad |
| **Superside y las suscripciones entran a product design** | 12–36 meses | Alta | Ya publican sobre escalar capacidad de product design. La defensa no es precio: es criterio, memoria y accountability medida |
| Fuga de margen por rondas | 12 meses | Alta | Rondas numeradas; owner de aprobación en intake; stop-loss |
| Canibalización con Web Experience 360 | 12 meses | Media-alta | Frontera "decidir vs construir"; una sola propuesta con lanes declaradas |
| Confusión con Globe | 12 meses | Media-alta | Invariante de sección 7; guion comercial; G6 |
| Dependencia de talento senior escaso | 36 meses | Alta | El sistema y el método deben ser el activo, no la persona |
| Commoditización por IA generativa de interfaces | 36 meses | Media-alta | Producir pantallas ya se automatiza. Si el modelo depende de producir pantallas, está muerto a 36 meses. El diferenciador tiene que ser research, sistema, gobierno y verificación |

### Autocrítica

1. **La evidencia sigue siendo propia.** Todo lo que podemos mostrar lo construimos para nosotros. Es evidencia
   sólida de capability y **nula de demanda**. G1 existe porque este modelo podría describir un servicio que
   Efeonce sabe hacer y que nadie está pidiendo comprar por separado.
2. **Los comparables de costo tienen sesgo de proveedor** y son de EE.UU. Frente a un comprador chileno, la
   aritmética de "contratar vs externalizar" todavía no está hecha con datos locales. Usarla tal cual es un riesgo
   de credibilidad, no un argumento.
3. **La frontera con Globe es más frágil en la venta que en el papel.** En una reunión real "diseño" significa
   ambas cosas. Se sostiene con guion comercial, no con un invariante en un documento.
4. **La sexta familia agrega superficie comercial que hay que sostener.** Si G1 falla, replegar a capability dentro
   de Web Experience 360 es la decisión correcta y no debe leerse como fracaso.
5. **El nombre puede no resistir el mercado.** "Product design" en LATAM puede leerse como diseño industrial.

---

## 14. Decisiones abiertas y revisit triggers

| # | Decisión | Owner | Revisit trigger |
|---|---|---|---|
| D1 | **Nombre público de la familia** y de la ruta comercial *(hoy: "Design Velocity", en paralelo a Creative Velocity)* | Strategy + Commercial | Antes de cualquier material público |
| D2 | ¿L1 Feature Delivery se ofrece sola alguna vez, o queda siempre acompañada? | Wave + Commercial | Al primer cliente que pida sólo overflow |
| D3 | Piso de margen por lane; hoy se aplica el 45% transversal | Finance | Al cerrar G5 |
| D4 | ¿El diseño de experiencias conversacionales/agénticas vive acá o en Agent Systems & Platforms? | Wave + Product | Al primer engagement que lo requiera |
| D5 | Transferencia de IP del design system cuando conviven marcas del cliente y componentes de Efeonce | Legal | Antes del primer build |
| D6 | ¿Se aprueba la sexta familia en el ADR de Wave, o se repliega a capability? | Strategy + Leadership | Al cerrar G1 |
| **D7** | **Loaded cost local: cuánto cuesta de verdad un senior product designer en Chile con cargas** — sin esto la aritmética de displacement no es usable frente a un comprador chileno | Finance + Commercial | Antes de la primera propuesta a un cliente chileno |
| D8 | ¿Efeonce ofrece `Fully Managed Design Capacity` (absorber equipo, licencias, contratación) como configuración? | Leadership + Finance + Legal | Si un cliente lo solicita |

---

## 15. Fuentes y trazabilidad

### Comparables de mercado — product design (verificados 2026-09-10)

| Afirmación | Dato | Fuente | as-of | Confianza |
|---|---|---|---|---|
| Senior product designer (US) | Mediana **~USD 185k/año**; senior product designer USD 160k–300k+ en total comp | [Untitled UI](https://www.untitledui.com/blog/ux-designer-salaries) · [KORE1](https://www.kore1.com/ux-designer-salary-guide/) | 2026 | Media-alta |
| Costo cargado real | **1,4×–2,4× el sueldo base** → ~USD 186k–239k el primer año sobre un hire de USD 120k, con beneficios, reclutamiento y rampa | [you-source](https://www.you-source.com/blogs/cost-to-hire-ux-designer-2026) | 2026 | **Media — fuente proveedor** |
| Contractor senior embebido (US) | **USD 80–135/hora** | [A.Team](https://www.a.team/talent/guides/product-designer-rates) | 2026 | **Media — fuente proveedor** |
| Design lead fraccional | **USD 5.000–12.000/mes** | [925 Studios](https://www.925studios.co/blog/alternatives-to-hiring-in-house-designer-2026) | 2026 | **Media — fuente proveedor** |
| Suscripción de diseño | **USD 399–999/mes** — ⚠️ es diseño gráfico/marketing, **no product design** | [NoLimit Creatives](https://nlc.com/university/in-house-vs-subscription-cost) | 2026 | Media |
| Ratio diseñador:ingeniero | **~1:4** en etapa temprana; **1:2 o 1:1** en equipos maduros con UI compleja | [Awesomic](https://www.awesomic.com/blog/guide-how-to-structure-your-design-team-in-2024) | 2026 | Media |
| Estructura enterprise (50+) | Incluye design ops, squads de research, equipos de design system y accessibility owners | [The Design System Guide](https://learn.thedesignsystem.guide/p/design-systems-team-structure-in) | 2026 | Media |
| Señal de capacidad agotada | Backlog de **6+ meses** de solicitudes de componentes; sprints bloqueados por diseño faltante; inconsistencias de UX creciendo | [The Design System Guide](https://learn.thedesignsystem.guide/p/design-systems-team-structure-in) · [Superside](https://www.superside.com/blog/scale-product-design-capacity) | 2026 | Media |
| Deuda de diseño | **10–20%** de la capacidad de sprint sostenida; **~75%** de los equipos la ve volver al backlog sin tracking | [Figr](https://figr.design/blog/how-to-reduce-design-debt) | 2026 | Media |
| Señal competitiva | **Superside ya publica sobre escalar capacidad de product design** — se está moviendo a este terreno | [Superside](https://www.superside.com/blog/scale-product-design-capacity) | 2026 | Alta |

⚠️ **Sesgo declarado.** Varias de estas fuentes son proveedores de outsourcing con interés en que contratar se vea
caro. Direccionalmente útiles; **no neutrales**. Antes de una propuesta hay que rehacer el cálculo con el loaded
cost del mercado del comprador *(D7)*. Los rangos son de EE.UU.; **nunca mezclar monedas ni mercados en la misma
lámina**.

### Investigación de mercado 2026-09-10 — dolor, oferta y huecos

Fan-out de cuatro investigaciones. **Cada fila declara si la fuente vende la solución.**

| Hallazgo | Dato | Fuente + as-of | Sesgo | Confianza |
|---|---|---|---|---|
| **Accesibilidad empeorando** | 95,9% de home pages con fallas WCAG (94,8% en 2025); **56,1 errores/página, +10,1%**; revierte 6 años de mejora; elementos por página +22,5%; **páginas con ARIA promedian 59,1 errores vs 42 sin ARIA**. WebAIM atribuye parte del deterioro al desarrollo asistido por IA | [WebAIM Million](https://webaim.org/projects/million/) · **verificado en fuente primaria 2026-09-10** | **Ninguno** — nonprofit, censo automatizado | **Alta** |
| Litigio y regulación | >5.000 demandas de accesibilidad digital en EE.UU. en 2025; EAA exigible desde 2025-06-28 | [UsableNet](https://blog.usablenet.com/inside-the-2026-midyear-numbers-where-digital-accessibility-litigation-is-going) · [DWT](https://www.dwt.com/insights/2025/07/european-accessibility-act-digital-products) | ⚠️ UsableNet vende remediación (aunque cuenta expedientes reales) | Media |
| **Design system: el buy-in se cae** | Satisfacción con buy-in 42%→32%; insatisfacción 23%→40%; **7% adopción completa; 5% mide ROI**; 56% nombra falta de staffing | [zeroheight Design Systems Report 2026](https://report.zeroheight.com/), n=147 | ⚠️ Vende plataforma de design systems | Media (n bajo, 90% NA+EU) |
| **La coordinación es el nuevo cuello** | 65% de diseñadores hace trabajo de PM/ingeniería; 34% dice que la colaboración se volvió más desordenada; 20% reporta *menos* colaboración (4× vs 2025) | [AI in Design Report 2026](https://stateofaidesign.com/chapters/teams) | ⚠️ VCs con interés en que la IA se vea inevitable — **sus datos negativos son los más creíbles** | Media |
| Headcount: más output, no recorte | 32% mantiene planta subiendo output · 28% crece · 10% reduce | ídem | ídem | Media |
| **El mercado paga por arreglar lo generado con IA** | Crece el volumen de clientes contratando para terminar o arreglar proyectos empezados con IA; AI Strategy & Consulting **+50%** GSV interanual | [Upwork Q2-2026](https://investors.upwork.com/news-releases/news-release-details/upwork-reports-second-quarter-2026-financial-results) | Dato de plataforma en earnings | Media-alta |
| Research sintético no reemplaza al real | NN/g comparó usuarios sintéticos contra 3 estudios propios: superficialidad, mala predicción de conducta y **sicofancia** | [NN/g vía UXLift](https://www.uxlift.org/articles/synthetic-users-if-when-and-how-to-use-ai-generated-research/) | Ninguno relevante | Media-alta |
| Research se contrae | 21% de empresas despidió researchers; 54% no mide impacto cuantitativamente | [User Interviews, State of UX Research](https://www.userinterviews.com/state-of-user-research-report), n=485 | ⚠️ Vende reclutamiento de participantes | Media |
| **Sitio público = comprador distinto** | El martech (22,4% del presupuesto) lo asigna el CMO; **agencias cayeron a 20,7%, por debajo del personal in-house 21,9%; 39% de CMOs planeaba recortar agencia** | [Gartner CMO Spend Survey 2025](https://www.gartner.com/en/newsroom/press-releases/2025-05-12-gartner-2025-cmo-spend-survey-reveals-marketing-budgets-have-flatlined-at-seven-percent-of-overall-company-revenue) | Analista independiente | Media-alta |
| Replatform no resuelve el cuello | 89% con DXP sigue restringido vs 95% con CMS tradicional — 6 puntos por un replatform de 6 cifras | [Webflow State of the Website](https://webflow.com/resources/report/2025-state-of-the-website) (panel Vanson Bourne) | ⚠️ Vende la cura | Media |
| Dependencia de ingeniería para publicar | 93% de líderes de marketing depende de devs o agencias para actualizar el sitio | [Webflow 2026](https://webflow.com/resources/report/2026-state-of-the-website/collaboration-crisis) | ⚠️ Vende la cura · **el informe original no se pudo abrir: verificar contra el PDF antes de uso comercial** | **Baja para citar** |

### Comparables de precio — verificados en la página del proveedor (2026-09-10)

| Proveedor | Precio publicado | Fuente |
|---|---|---|
| **Superside** | **Mínimo USD 15.000/mes**; `Dedicated` desde **USD 30.000/mes a 12 meses**; +USD 1.000/mes software; compromiso anual. **UI/UX incluido** | [superside.com/pricing](https://www.superside.com/pricing) — **verificado en fuente primaria** |
| **Eleken** *(el comparable real de product design)* | **USD 4.599 / 6.599 / 11.999 al mes** por diseñador dedicado, mínimo 2 meses | [eleken.co/pricing](https://www.eleken.co/pricing) |
| **Awesomic** | USD 200 / 1.490 / 2.995 al mes (1 tarea activa concurrente) | [awesomic.com/pricing](https://awesomic.com/pricing) |
| **Penji** · **ManyPixels** | USD 995–4.500 · USD 699–2.599 al mes | [penji.co](https://penji.co/pricing/) · [manypixels.co](https://www.manypixels.co/pricing) |
| **Design Pickle** | **Retiró su precio público** — señal de que la categoría dejó de competir por precio de lista | [designpickle.com/pricing](https://www.designpickle.com/pricing/) |

🔴 **Esto corrigió un error de 3× en nuestra propia doctrina:** `creative-practice` citaba Superside a ~USD 5.000/mes
desde un blog de tercero. Corregido 2026-09-10 en los tres archivos. **Regla derivada: todo comparable de precio se
verifica en la página del propio proveedor.**

### El hueco de oferta — y su límite

**Nadie vende capacidad de *producto*; todos venden producción.** Design Pickle la excluye; Penji y ManyPixels
llegan hasta landing pages; Superside la incluye como *specialist production* dentro de creative ops y **no tiene
página de servicio de product design**; A.Team y Andela pivotearon a ingeniería. El único que la vende como tal es
Eleken, y la vende **por persona**, no como capacidad gobernada.

**La queja #1 de compradores es la discontinuidad de personas** (*"too many cooks in the kitchen"*) — y es
precisamente lo que rompe el trabajo de producto, que necesita contexto acumulado. Es demanda articulada y
verificable, y le pega a nuestro modelo de pod con nombres y memoria.

⚠️ **Límites de toda esta investigación, declarados:** cero datos de mid-market, **cero de LATAM**; el corpus es
tech/enterprise, 90% Norteamérica y Europa occidental. El argumento legal de accesibilidad es de EE.UU. y la UE —
**para un cliente chileno aplica sólo si vende a esos mercados, y el marco chileno está sin verificar**. Reddit, G2
y Capterra fueron inaccesibles: toda la voz del comprador viene de Trustpilot y Hacker News. Y **no existe una sola
encuesta de dolores de equipos de product design in-house que no esté financiada por quien vende la solución** —
ese vacío es en sí mismo un dato sobre cuánta certeza podemos tener.

### Proxy adyacente — in-housing creativo

**82%** de los miembros de ANA tiene in-house agency (vs 58% en 2013); son **5× más** propensos a decir que se
está in-housing más que nunca; **53%** quiere que su in-house sea socio estratégico upstream; su dolor declarado
es **talento y energía creativa**, no falta de proveedores.
Fuente: [ANA](https://www.ana.net/content/show/id/79185) · [Marketing Dive](https://www.marketingdive.com/news/in-house-agency-trend-gain-steam-ana/649681/), as-of 2025–2026, vía `creative-practice/SOURCES.md`.
⚠️ **Es in-house de *marketing creativo*, no de product design.** Sostiene la dirección de la tesis; no es
evidencia directa de este mercado.

### Doctrina y decisiones internas

- Skill [`creative-practice`](../../../.claude/skills/creative-practice/SKILL.md) — verdades (b) in-housing y (c) el comparable real; `modules/09_DISPLACEMENT.md`; `modules/03_OFERTA.md` §2.1 Managed Squad ≠ Staff Augmentation; regla del piso 45% y del gobierno que no se descuenta
- [`Creative Velocity — Modular Production Addendum V1`](../../services/creative-services/EFEONCE_CREATIVE_VELOCITY_MODULAR_PRODUCTION_ADDENDUM_V1.md) — el patrón de ruta de velocidad que este modelo replica en product design
- [`ADR Wave Portfolio Boundaries`](../../architecture/EFEONCE_WAVE_PORTFOLIO_BOUNDARIES_DECISION_V1.md) · [`Wave Business Model V1`](../wave/WAVE_BUSINESS_MODEL_V1.md)
- [`Product Service Operating Model V1`](../EFEONCE_PRODUCT_SERVICE_OPERATING_MODEL_V1.md) · [`Engagement–Project Operating Model V1`](../EFEONCE_ENGAGEMENT_PROJECT_OPERATING_MODEL_V1.md)
- [`Operator & Buying Group Registry V1`](../OPERATOR_BUYING_GROUP_REGISTRY_V1.md) · [`Operator-First Product & Growth Contract V1`](../../strategy/EFEONCE_OPERATOR_FIRST_PRODUCT_AND_GROWTH_CONTRACT_V1.md)

### Capability interna verificable (2026-09-10)

`docs/architecture/ui-platform/` · `docs/architecture/agent-invariants/UI_PLATFORM_AGENT_INVARIANTS.md` ·
[`Premium UI Delivery Standard V1`](../../ui/GREENHOUSE_PREMIUM_UI_DELIVERY_STANDARD_V1.md) ·
[`Frontend Capture Helper V1`](../../architecture/GREENHOUSE_FRONTEND_CAPTURE_HELPER_V1.md) ·
[`Design Tokens V1`](../../architecture/GREENHOUSE_DESIGN_TOKENS_V1.md) · `src/config/role-codes.ts` (`designer`)

### Costos

Motor real y verificable: `src/lib/finance/pricing/pricing-engine-v2.ts` (en producción, sin flag) · piso de margen
45% (`creative-practice`, aprobado 2026-07-13) · ⚠️ [`Member Loaded Cost Model V1`](../../architecture/GREENHOUSE_MEMBER_LOADED_COST_MODEL_V1.md)
es **SPEC no implementado** — sirve como definición conceptual, **nunca se cita como capacidad ante un cliente**
· 🩸 hallazgo abierto: el loaded cost del squad podría estar subestimado si la base es sueldo bruto y no costo
empresa (en Chile ~1,25–1,3×) — refuerza la urgencia de D7

**Fecha de verificación de este documento:** 2026-09-10.
