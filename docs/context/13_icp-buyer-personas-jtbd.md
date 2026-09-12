# 13 · ICP, Buyer Personas & Jobs-to-be-Done

> **Para qué sirve este archivo.** Define **para quién** se construye Greenhouse y **qué "job"** intenta resolver cada usuario. Un agente de producto traduce JTBD en features: saber qué intenta lograr un CMO o un Head de CRM cuando entra al portal es lo que separa una feature que importa de una cosmética. Fuente: doc de Segmentación Comercial (mar-2026), que tiene los 12 ICPs con 11 dimensiones c/u y los JTBD completos — aquí está lo que mueve decisiones de producto.

> **Actualización transversal:** el customer model debe separar al usuario/operator del operator-champion, problem
> owner, sponsor, economic buyer y governance owner. Los productos verticales se diseñan primero para el workflow
> del operador; Greenhouse soporta la evidencia y la superficie ejecutiva. Ver [`Efeonce Operator-First Product &
> Growth Contract V1`](../strategy/EFEONCE_OPERATOR_FIRST_PRODUCT_AND_GROWTH_CONTRACT_V1.md).

## Principio rector

**No todos los clientes entran igual.** Algunos ICPs son **puertas de entrada** (ciclo corto, ticket bajo, trigger urgente); otros se activan por **venta cruzada** una vez dentro. Esto importa para producto porque **el portal es el activo que convierte una puerta de entrada de ticket bajo en una relación expandible**: el onboarding al portal y la transparencia temprana son lo que dispara el cross-sell (ver Bow-tie en `11` y modelo ASaaS en `14`).

---

## Los 12 ICPs (resumen)

| Línea de negocio / práctica | ICP | Qué es | Ciclo / ticket | Dolor central |
|---|---|---|---|---|
| **Growth Strategy & Measurement** | ICP1 B2B revenue | B2B LATAM, ciclo de venta complejo | 6-8 sem / alto | "No puedo decir cuánto vendimos gracias a marketing". CRM muerto. |
| | ICP2 Retail/consumo | Consumo/retail en madurez digital | 4-8 sem / medio | Múltiples proveedores, nadie integra. Cada Q empieza de cero. |
| | **ICP3 AEO** ⭐ | Necesita posicionarse en motores de IA | 2-4 sem / bajo | Cero visibilidad de cómo los LLMs citan su marca. |
| **Creative Services** | ICP1 Escalar producción | Volumen alto de contenido | 3-6 sem / medio | Sin sistema escalable. No produce a la velocidad del negocio. |
| | ICP2 Rebranding | Construir/reconstruir marca | educación / alto | Identidad que no comunica su evolución. |
| | ICP3 Ejecución a escala | Modelo Sky Airlines | cross-sell | Tiene concepto, no producción. |
| **Media & Distribution** | ICP1 Distribución | Inversión de medios fragmentada | cross-sell | Sin visión unificada de amplificación. |
| | ICP2 Retail media | Retail media sin estrategia | 3-5 sem / medio | Retail media desconectado de estrategia. |
| | **ICP3 Vocería/PR** ⭐ | Visibilidad ejecutiva / PR | 2-4 sem / bajo | Sin programa sostenido de visibilidad. Acceso directo al CEO. |
| **Digital Services & Engineering** | ICP1 Infraestructura | Necesita infra/plataforma web | educación / alto | Deuda técnica, infra es cuello de botella. |
| | **ICP2 Velocidad Web** ⭐ | Landing/web rápida | 1-3 sem / bajo | Conversiones perdidas por sitio lento. |
| | ICP3 Datos/Analytics | Medición confiable | cross-sell | Sin medición confiable para decidir. |

⭐ = **Puertas de entrada primarias (Tier 1)**: AEO, Vocería/PR, Velocidad Web. Ciclo corto, dolor concreto, ticket bajo → es por donde entra la mayoría. El producto debe brillar rápido para estos.

---

## Buyer Personas (comités de compra)

8 vigentes, de la Segmentación Comercial (mar-2026), y 1 **candidata en validación** (BP9). Una persona candidata
**no** es un buyer persona vigente: lo es cuando pasa su plan de validación.

| BP | Rol | Dolor central | Qué necesita ver |
|---|---|---|---|
| **BP1** | **CMO bajo presión de revenue** | Sin conexión marketing→ventas; el directorio le pide accountability | Contribución a pipeline/revenue, en tiempo real |
| **BP2** | **Dir. Marketing Digital / Head of Growth** | 4 proveedores, ninguno integra; no puede armar la foto completa | Reporting unificado, ROI por peso invertido |
| **BP3** | **CEO / Gerente General** | Marca no refleja a la empresa; o crisis reputacional | Impacto de negocio, visión ejecutiva |
| **BP4** | **CTO / VP de Tecnología** | Deuda técnica, infra como cuello de botella | Performance, confiabilidad, autonomía |
| **BP5** | **Head of Analytics / Data Lead** | Es "el mensajero de malas noticias"; data sin accionar | Datos confiables, una sola fuente de verdad |
| **BP6** | **Brand Manager / Dir. de Arte** | Cada campaña es un acto heroico; inconsistencia entre piezas | Gobernanza de marca, consistencia, velocidad |
| **BP7** | **Head of E-commerce** | E-commerce es "el hijo no reconocido"; retail media aislado | Retail media como canal medido |
| **BP8** | **Director Comercial / VP Ventas** | Marketing y ventas desalineados | Leads calificados, ciclo más corto |
| **BP9** *(candidata · hipótesis)* | **Head of Design / Design Director in-house** | La demanda de diseño crece más rápido que su equipo; research, accesibilidad y design system quedan siempre para el próximo trimestre | Capacidad liberada verificable, control de qué delega y evidencia para pedir presupuesto |

> Para producto: **BP1, BP2, BP5 y BP6 son los usuarios primarios del portal.** Son quienes se logean. El dashboard tiene que responder *su* pregunta en los primeros 10 segundos (revenue para BP1, foto unificada para BP2, fuente de verdad para BP5, gobernanza/RpA para BP6).

### Roles de producto en Creative Studio

Creative Studio no reduce el buying committee a una sola “persona usuaria”:

- **Protagonista:** el equipo creativo/marketing que debe producir mejor como sistema.
- **Punto de vista:** BP6 o el operador activo —designer, producer, marketer o director de arte— que idea,
  configura, explora y selecciona.
- **Autoridad creativa:** Head of Creative/Brand o aprobador designado; no se infiere del rol que ejecuta.
- **Sponsor económico:** BP1/BP2 y Procurement/Finance según el engagement.
- **Guía:** Globe / Creative Studio, que absorbe ingeniería de producción y conserva memoria sin reclamar autoría.

La experiencia debe hacer al operador más capaz sin depender de sobrecarga individual: el usuario es héroe de la
interacción, pero el producto elimina la necesidad de actos heroicos para entregar.

### Segmento candidato — equipos de otras agencias

Otras agencias **no se agregan a los 12 ICPs vigentes** todavía. Son una hipótesis B2B2B separada para equipos
creativos con múltiples cuentas, picos de demanda y presión de consistencia. Antes de promoverla se validan
tenancy agencia→cliente final, confidencialidad, derechos, aprobación de marca, atribución
`white-label|endorsed`, accountability y economics. No se crea una modalidad nueva: cualquier piloto usaría
`Studio Access`, `co-operated` o `client-operated` bajo los gates del business model.

### Persona candidata — líder de diseño in-house (BP9 · Product Design 360)

> **Estado:** `hypothesis_only` · **Owner:** Strategy + Commercial, con Wave + Design · **Fecha:** 2026-09-10 ·
> **Confidence:** baja · **Oferta:** [Product Design 360](../business-models/product-design-360/PRODUCT_DESIGN_360_BUSINESS_MODEL_V1.md) (`Proposed`)

No se suma a los buyer personas vigentes hasta pasar su plan de validación. Nace del business model y de
investigación de escritorio, **no de conversaciones con este comprador**. Los roles son roles, no cargos: una misma
persona puede tener varios, y en cuentas chicas el Head of Design suele ser también el problem owner.

| Rol | Quién suele ser *(hipótesis)* | Qué le importa | Evidencia |
|---|---|---|---|
| Operador | Head of Design / Design Director / Design Manager | Que su equipo deje de ser el cuello de botella | `unknown` |
| Operator-champion | La misma persona, cuando el primer frente entrega sin que tenga que supervisarlo | Recuperar tiempo para el trabajo por el que quiere ser evaluado | `unknown` |
| Problem owner | Head of Design, o Head of Product si diseño reporta a producto | La entrega de diseño | `unknown` |
| Sponsor | CPO, CTO (BP4) o VP Product | Que ingeniería no se detenga esperando diseño | `unknown` |
| Economic buyer | CPO, CTO o Gerente General según tamaño | Costo frente a contratar | `unknown` |
| Governance owner | Head of Engineering | Que el design system y el handoff no le sumen trabajo | `unknown` |
| Procurement / ratifier | Compras y Legal | IP del diseño y datos de research | `unknown` |
| **Veto** | **El propio Head of Design** | Que el proveedor no se lea como su reemplazo | `unknown` |

🔴 **Riesgo central: puede adoptar, pero no suele poder comprar.** El presupuesto vive en CPO/CTO, no en diseño. El
valor tiene que traducirse al idioma del sponsor —capacidad de ingeniería que ya se pagó y no puede avanzar— o el
deal queda en un sí del operador sin compra. `unknown` hasta verificar quién tiene el presupuesto en cuentas reales.

**JTBD**

- *Funcional:* Cuando ingeniería crece y diseño no, quiero sacar de mi equipo los frentes que nunca alcanza, para cumplir el roadmap sin sumar headcount que después no pueda sostener.
- *Emocional:* Cuando la demanda me supera, quiero dejar de ser el cuello de botella de mi propia área, para volver al trabajo por el que me contrataron.
- *Social:* Cuando presento el plan a mi jefatura, quiero verme como quien convirtió diseño en un sistema medible, no como quien sólo pidió más gente.
- *De riesgo:* Cuando evalúo un proveedor, quiero que no le diga a mi jefatura que mi equipo no da el ancho, para no perder autoría ni poder interno.

**ICP y anti-ICP** *(hipótesis, por fase)*

| | Estratégico | De oportunidad | De delivery |
|---|---|---|---|
| **ICP** | Mid-market y enterprise con producto digital propio (app, portal, SaaS) y equipo de diseño in-house | Trigger activo: ronda, ingeniería contratando sin diseño, línea nueva, deadline de accesibilidad | Decisor único de diseño identificado; vía de implementación declarada; acceso a usuarios para research |
| **Anti-ICP** | Sin equipo de diseño (→ diseño integral, otra oferta de la misma familia); "que se vea mejor" sin superficie operada (→ Creative Services) | Sin trigger ni presupuesto accesible | Sin decisor de diseño, sin ingeniería que construya, o con intención de dirigir a las personas (→ Staff Augmentation, otro precio y otra accountability) |

**Triggers observables:** ronda levantada · vacantes de ingeniería abiertas sin vacantes de diseño · línea de producto
nueva · entrada a un mercado · deadline de accesibilidad · backlog de solicitudes de componentes de 6+ meses.

**Dolores de agencia → capacidad → evidencia al sponsor**

| Dolor | Cómo lo vive el operador | Capacidad que lo reduce | Evidencia que llega al sponsor |
|---|---|---|---|
| Contexto perdido | Cada freelance o suscripción empieza de cero | Squad con nombre y memoria de decisiones | Continuidad de personas; registro de decisiones |
| Retrabajo | Ingeniería vuelve a preguntar qué pasa en cada estado | Handoff con estados completos | First-time-right del handoff |
| Aprobaciones difusas | Rondas sin fin | Decisor único y rondas numeradas | Rondas consumidas frente a declaradas |
| Reporting débil | No puede demostrar que el design system sirve | Adopción y drift medidos | Superficies construidas desde el sistema |
| Ownership difuso | Coordinación cada vez más desordenada | Design ops como frente | Cola atendida frente a ingresada |
| Dependencia de una persona | Todo pasa por un senior | Cobertura del squad | Continuidad ante ausencias |
| Coordinación multi-proveedor | Freelancers + suscripción + agencia | Un contrato con frentes declarados | Un solo reporte de cumplimiento |

**Plan de validación**

- **Hipótesis falsable:** en empresas mid/enterprise con equipo in-house, quien siente el dolor de capacidad de diseño es el Head of Design, y el presupuesto está en CPO/CTO.
- **Muestra:** ≥ 5 conversaciones con Heads of Design o Design Directors in-house, idealmente en Chile, más ≥ 2 con su CPO o CTO.
- **Métrica primaria:** cuántos describen el dolor de capacidad sin inducción y nombran quién aprueba el gasto.
- **Umbral:** ≥ 4 de 5 lo describen sin inducción y ≥ 3 de 5 ubican el presupuesto fuera de diseño.
- **Stop / reemplazo:** si el dolor lo siente otro rol (PM, CTO) o el Head of Design no reconoce la capacidad como problema, se redefine el operador y se reescribe la persona.
- **Owner:** Commercial + Research. **Registro:** palabras literales, que alimentan el copy de la landing [`TASK-1859`](../tasks/to-do/TASK-1859-landing-product-design-360.md).

**Evidencia hoy**

| Claim | Fuente | Fecha | Confidence | Se falsa si… |
|---|---|---|---|---|
| El dolor es de capacidad, no de calidad | Business model §2 · zeroheight Design Systems Report 2026 (56% nombra falta de staffing) | 2026-09-10 | baja — encuesta de proveedor, NA/EU | los líderes lo describen como problema de calidad o de proceso |
| La coordinación, más que la ejecución, es el nuevo cuello | AI in Design Report 2026 (65% hace trabajo de PM/ingeniería; 34% reporta colaboración más desordenada) | 2026-09-10 | media — financiado por VCs, pero es un dato contra su interés | el dolor dominante resulta ser la ejecución |
| El presupuesto no vive en diseño | inferencia del business model | 2026-09-10 | `unknown` | el Head of Design controla su presupuesto de proveedores |

Toda la evidencia disponible es enterprise de Norteamérica y Europa: **cero mid-market y cero LATAM**.

---

## Jobs-to-be-Done (los que más informan producto)

Formato del doc: Situación/Trigger → Job Statement → Resultado Esperado. Aquí los de las líneas que Greenhouse opera más directo (Growth Strategy & Measurement + Creative Services).

### Growth Strategy & Measurement · ICP1 B2B (buyer: CMO + Dir. Comercial)
- **Conectar marketing con revenue** → "demostrar al directorio cuánto revenue genera cada peso" → reporte con contribución a pipeline validada por ventas.
- **Activar el CRM como sistema de inteligencia** → lead scoring con datos de cierre real, workflows que maduran leads, ciclo más corto.
- **Contenido que genera pipeline** → contenido por etapa de funnel, no solo tráfico.
- *Emocional:* tener control y hablar con confianza ante el directorio. *Social:* ser visto como quien convirtió marketing en motor de revenue.

### Growth Strategy & Measurement · ICP2 Retail (buyer: Dir. Digital / Head Growth + CMO)
- **Integrar el ecosistema de proveedores** → un solo interlocutor, reporting unificado.
- **Acumular conocimiento entre ciclos** → "cada trimestre mejor, no un reinicio"; cada ciclo hereda insights. ← *Este job es literalmente el valor acumulativo del ASaaS (`14`).*
- *Emocional:* dejar de "volar a ciegas con millones". *Social:* que vean al equipo digital como motor de crecimiento.

### Growth Strategy & Measurement · ICP3 AEO (buyer: CMO / Head of Digital)
- **Visibilidad en motores de IA** → diagnóstico de cómo los LLMs citan la marca + monitoreo de citaciones.
- **Contenido dual Google + IA** → estructura semántica que funciona en Google, ChatGPT, Perplexity y Gemini.
- *Emocional:* "ser el que vio venir el cambio". *Social:* innovador que entiende hacia dónde va el mercado.

### Creative Services · ICP1 Escalar producción (buyer: CMO / Brand Manager)
- **Producir a la velocidad del negocio** → entrega a tiempo, calidad consistente, **máximo 2 rondas**. ← *RpA (`06`) es el KPI de este job.*
- **Escalar sin fragmentar** → "todas las piezas se sienten como la misma marca"; gobernanza real.
- **Medir impacto creativo** → **Revenue Enabled**: cuánto revenue se habilitó por velocidad, iteración y volumen.
- *Emocional:* dejar de sentir que cada campaña es un acto heroico. *Social:* quien profesionalizó la operación creativa.

### Creative Services · ICP2 Rebranding (buyer: CEO / GM)
- **Marca que refleje la empresa actual** + **sistema de marca escalable** (multi-mercado, multi-superficie).
- *Emocional:* orgullo de la marca. *Social:* que la perciban moderna y con visión.

> Media & Distribution y Digital Services & Engineering tienen sus propios JTBD en el doc fuente (vocería/PR, distribución integrada, velocidad web, infra, datos). Para producto son secundarios hoy porque Greenhouse modela sobre todo operación creativa, métricas y CRM.

> **Product Design 360 (candidato):** su JTBD vive en la sección de la persona candidata BP9; no se mezcla con los vigentes hasta validarse.

---

## Rutas de entrada → expansión (por qué el portal importa)

| Tier | ICPs | Lógica |
|---|---|---|
| **Tier 1 · Prospección activa** | Growth Strategy & Measurement ICP3 (AEO), Media & Distribution ICP3 (Vocería/PR), Digital Services & Engineering ICP2 (Velocidad Web) | Caballo de Troya: entra por dolor concreto y ticket bajo, **se queda por la estrategia integral**. |
| **Tier 2 · Con educación previa** | Growth Strategy & Measurement ICP1 (B2B Revenue), Creative Services ICP2 (Rebranding), Creative Services ICP1 (Escalar) | Ticket alto, ciclo largo, trigger fuerte. |
| **Tier 3 · Venta cruzada** | Growth Strategy & Measurement ICP2 (Retail), Creative Services ICP3 (Ejecución a escala/Sky), Media & Distribution ICP1 (Distribución) | Se activan **desde dentro**, cuando se diagnostica el gap. |

Ejemplo de cadena de expansión: AEO → Search Visibility 360 → web/medición/agentes → CRM/GTM integral → (si falta contenido) Creative Services potenciado por Globe → (si falta distribución) Media & Distribution potenciado por Reach. En Media & Distribution la entrada recomendada es Distribution Strategy & Media Architecture y la expansión puede ir a Performance & Commerce Distribution o Influence, Earned & Partnership Distribution. Digital Services & Engineering opera visibilidad, web, measurement y agentes; RevOps & CRM/Kortex opera CRM/GTM.

---

## Traducción a producto (lo que el agente debe extraer)

Cada job mapea a una capacidad del portal. Esto es lo accionable:

| Job del cliente | Implicación para Greenhouse |
|---|---|
| "Conectar marketing con revenue" (BP1/BP8) | Vista que une operación creativa/digital con pipeline y revenue (Revenue Enabled visible). El sync HubSpot del `11` alimenta esto. |
| "Acumular conocimiento entre ciclos" (BP2) | El **historial** es feature, no log. `greenhouse_serving` + Account 360 (`04`/`11`) hacen del valor acumulativo algo visible → switching cost (`14`). |
| "Producir a la velocidad del negocio, máx 2 rondas" (BP6) | RpA / OTD% / FTR (`06`) en el dashboard, con semáforos. Es el corazón del ICO Engine. |
| "Escalar sin fragmentar" (BP6) | Gobernanza de marca operacionalizada (BCS, brand checks) visible al cliente. |
| "Foto unificada / dejar de coordinar proveedores" (BP2) | Greenhouse como **hub único** (`03`): un login que reemplaza 4 dashboards. |
| "Visibilidad en motores de IA" (AEO) | Métricas AEO del **motor propio** (AI Visibility Grader) expuestas como otra capa del dashboard. |
| "Una sola fuente de verdad" (BP5) | Confiabilidad del dato = por qué el test coverage en finance/identity no es opcional; revisar arquitectura vigente y `04` antes de tocar esos dominios. |
| "Sacar de mi equipo los frentes que nunca alcanza" (BP9 · candidata) | Telemetría **por frente** (OTD/FTR/RpA, first-time-right del handoff, drift, adopción del design system) visible al líder de diseño **sin medir a su gente**. Se prioriza sólo si BP9 se valida. |

**Regla para el agente:** antes de construir una feature, identifica la línea de negocio, product brand habilitadora, BP y tier del job. Una feature que no sirve a un job de BP1/BP2/BP5/BP6 (los que usan el portal) probablemente no es prioridad. Para casos reales por ICP usa solo los confirmados (`01`/`06`): Sky (Creative Services), Bresler y Berel (Growth Strategy & Measurement / AEO+SEO).

---

*Fuente: doc de Segmentación Comercial — ICPs, Buyer Personas & JTBD (mar-2026). El doc fuente tiene las 11 dimensiones de los 12 ICPs y los JTBD de las líneas de negocio/prácticas; aquí se destiló lo que informa producto.*

*Última verificación de drift contra runtime: 2026-07-23 — roles Creative Studio y la hipótesis B2B2B quedan
alineados al business model V1.1 sin modificar los 12 ICPs vigentes.*

*2026-09-10 — se agrega BP9 como persona candidata (`hypothesis_only`) para Product Design 360; no modifica los 8
buyer personas ni los 12 ICPs vigentes.*
