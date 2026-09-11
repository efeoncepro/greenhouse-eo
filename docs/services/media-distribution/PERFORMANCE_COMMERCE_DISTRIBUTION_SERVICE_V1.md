# Performance & Commerce Distribution — ficha de servicio

> **Línea de negocio:** Media & Distribution
> **Marca contractual:** Efeonce · **Product brand habilitadora:** Reach, cuando aporte método o tooling
> **Estado:** `Proposed` — la solución sigue `Approved for validation` en el catálogo de la línea; esta ficha propone su
> estructura V1 y no autoriza precios públicos, claims ni venta general
> **Fecha:** 2026-09-10 · **Revisión:** después de cada piloto pagado y, como mínimo, trimestral
> **Decisión:** [`EFEONCE_PERFORMANCE_COMMERCE_DISTRIBUTION_DECISION_V1`](../../architecture/EFEONCE_PERFORMANCE_COMMERCE_DISTRIBUTION_DECISION_V1.md)
> **Pricing:** [`Pricing Integrity Pack V1`](../../business-models/media-distribution/PERFORMANCE_COMMERCE_PRICING_INTEGRITY_PACK_V1.md)
> **Catálogo de la línea:** [`Media & Distribution`](README.md)

## Qué es

Una operación de medios pagados que hace que los algoritmos de las plataformas trabajen con **mejores señales, mejor
creatividad y objetivos de negocio reales**, y que aprende en cada ciclo qué escalar, qué detener y dónde poner el
siguiente peso.

El cliente compra el sistema: la señal correcta, la operación de campañas, el test creativo, el gobierno de la
automatización y una lectura honesta del resultado. Las plataformas —Meta, Google, TikTok, LinkedIn, programmatic,
retail media— son cobertura dentro de ese sistema.

## Qué no es

- **No es "gestión de Google Ads" ni "agencia de Meta Ads".** Configurar campañas y ajustar pujas es necesario, pero las
  plataformas automatizan cada vez más esa parte. Vender eso como producto es competir por tarifa.
- **No es compra de medios.** La inversión es del cliente, se declara aparte y, cuando se puede, la factura la
  plataforma directo al cliente.
- **No es producción creativa.** Performance diseña el test y lee el aprendizaje; Creative Services produce.
- **No es una promesa de ROAS, CAC ni pipeline.** Efeonce no controla precio, oferta, stock, sitio, CRM ni ventas.

## Resultado que se vende

Inversión publicitaria que optimiza hacia la señal de negocio correcta —venta, margen u oportunidad calificada, no el
clic ni el formulario—, con aprendizaje acumulado y documentado que el cliente conserva, y una recomendación explícita
de asignación para el siguiente ciclo.

## Catálogo en una vista

| # | Servicio | Qué compra el cliente | Forma | Estado |
|---|---|---|---|---|
| 1 | **Performance Diagnostic** | revisión de inversión, cuentas, señal, creatividad y datos hacia plataformas; plan de 90 días | 2–4 semanas, precio fijo | `Proposed` |
| 2 | **Growth Activation Sprint** | señal remediada, cuentas reestructuradas o tomadas, primera matriz creativa, línea base | 8–12 semanas, precio fijo | `Proposed` |
| 3 | **Managed Performance** | operación mensual de los canales del motion, testing, reporting y gobierno trimestral | mensual por nivel, mínimo 3 meses | `Proposed` |
| 4 | **Incrementality & Media Investment Architecture** | experimentos y MMM para una pregunta de asignación | por estudio | `Proposed`, sólo con madurez |
| 5 | **Programmatic vía Real Audiences** | display, video, audio, pDOOH y push dentro del mix | canal dentro de 2 o 3; managed y luego autogestionado | pendiente de términos |
| 6 | **ChatGPT Ads** | campañas donde OpenAI lo habilita (MX, BR, EE.UU., España…) | canal selectivo dentro de 3 | `Proposed` |
| 7 | **Preparación para anuncios en IA** | intents, landings y medición listos para cuando ChatGPT Ads llegue a Chile | dentro de 1 o con Search Visibility 360 | `Proposed` |
| 8 | **Staff Augmentation** | perfil de performance dirigido por el cliente | tarifa de rol del catálogo | vigente en catálogo |
| 9 | **Advisory** | criterio y recomendación; el cliente opera | fase o retainer | `Proposed` |

Cada servicio 1–4 tiene dos variantes —**Demand & Commerce** y **B2B Pipeline**— y se entrega como Managed Squad o
co-operated. Los canales (Google, Meta, TikTok, LinkedIn, retail media, programmatic, ChatGPT Ads, X bajo pedido) son
cobertura dentro de estos servicios, nunca productos sueltos.

---

# Las dos motions

Mismo oficio, dos compradores. La motion se decide en la calificación y cambia la señal, los canales, la métrica de
valor y la composición.

## Motion A · Demand & Commerce

**Para quién:** B2C, B2B2C, DTC, e-commerce, retail y servicios masivos con inversión activa en dos o más canales.

**JTBD:** *"Cuando mi inversión crece pero la eficiencia no, y cada plataforma se atribuye la misma venta, quiero una
operación que optimice hacia venta y margen reales y me diga dónde poner el siguiente peso."*

**Señal de optimización:** compra y valor de compra; margen cuando el cliente lo entrega; eventos de catálogo;
conversaciones calificadas por WhatsApp cuando el canal de venta es mensajería.

**Métrica de valor:** eficiencia combinada del negocio (MER, CAC combinado), margen de contribución y, cuando hay diseño
experimental, revenue incremental.

## Motion B · B2B Pipeline

**Para quién:** B2B con ciclo consultivo, ticket alto y un CRM con etapas confiables —o disposición a instrumentarlas—.

**JTBD:** *"Cuando pago leads caros que ventas descarta, quiero que la pauta aprenda de las oportunidades que sí avanzan
en el CRM, para invertir en las cuentas y mensajes que generan pipeline."*

**Señal de optimización:** etapas del CRM enviadas como conversiones offline: lead calificado → oportunidad → cierre,
con valor cuando existe.

**Métrica de valor:** costo por oportunidad calificada, pipeline con fuente CRM y velocidad de avance. El costo por lead
es una métrica operativa, nunca de valor.

**Por qué Efeonce:** operamos HubSpot y Salesforce. Conectar la etapa del CRM con la plataforma publicitaria es trabajo
que las agencias de performance puro subcontratan o no hacen.

**Condición de entrada:** sin CRM con etapas confiables, el motion B se degrada a Motion A con objetivo de lead, y la
propuesta lo declara.

---

# Los cinco módulos por motion

Los módulos son la estructura de lanes de la solución. La motion cambia su contenido; no crea módulos nuevos.

| Módulo | Motion A · Demand & Commerce | Motion B · B2B Pipeline | Owner y composición |
|---|---|---|---|
| **Measurement & Signal Foundation** | eventos de compra y valor, feeds, deduplicación web/servidor, consentimiento | mapeo de etapas CRM → conversiones offline, calidad de datos de lead, matching de cuentas | Performance especifica la señal; Wave Measurement & Analytics implementa; RevOps & CRM opera el lado CRM |
| **Performance Media Operations** | Meta, Google (Search, PMax, Demand Gen, YouTube), TikTok; presupuesto, pacing, audiencias, exclusiones | LinkedIn, Google Search, retargeting en Meta, ABM programático vía partner | Performance |
| **Commerce Media Operations** | retail media y marketplaces: catálogo, disponibilidad, venta y margen | normalmente no aplica | Performance; Channel & Commerce lee el resultado junto a la góndola |
| **Creative Performance System** | matriz de hooks, ofertas, formatos y fatiga; UGC y variantes | matriz de mensajes por etapa y cargo, thought leadership, documentos y casos | Performance diseña y lee; Creative Services / Globe produce |
| **Algorithmic Media Governance** | qué automatizar (Advantage+, PMax, Smart+), qué controlar, exclusiones de marca, calidad del tráfico | qué señales compartir, límites de expansión de audiencia, calidad de lead | Performance |

**Incrementality & Marketing Effectiveness** sigue siendo una capability avanzada transversal —holdouts, geo-tests,
lift studies, MMM—, condicionada por volumen, historial, variación y capacidad de experimentar. No se activa por
defecto.

---

# Cobertura de canales

Estado a 2026-09-10. Se revisa cuando una plataforma cambia de producto o disponibilidad. El detalle de cada plataforma
y su fuente vive en la [investigación de mercado 2026-09-10](../../audits/commercial/PERFORMANCE_MEDIA_CHANNELS_PARTNERS_PRICING_RESEARCH_2026-09-10.md).

| Canal | Motion A | Motion B | Cómo lo operamos | Notas |
|---|---|---|---|---|
| Google Search, PMax, Demand Gen | `core` | `core` (Search) | cuenta del cliente, acceso de partner | PMax necesita exclusiones de marca y señal limpia |
| YouTube | `selectivo` | `selectivo` | cuenta del cliente | cuando el objetivo incluye alcance en video |
| Meta (Facebook, Instagram, Advantage+) | `core` | `selectivo` (retargeting, audiencias de cuenta) | Business Manager del cliente | la creatividad es la palanca principal |
| Anuncios click-to-WhatsApp | `core` cuando se vende por mensajería | `selectivo` | Business Manager del cliente | exige lectura de la conversación, no sólo del clic |
| TikTok | `core` si hay capacidad creativa nativa | `no ofrecido` por defecto | cuenta del cliente | sin producción nativa, no se activa. TikTok Shop y GMV Max operan en México y Brasil; en Chile sin fecha oficial a 2026-08 |
| LinkedIn | `selectivo` | `core` | Campaign Manager del cliente | caro por diseño: se justifica por la calidad de la cuenta alcanzada |
| Microsoft Advertising | `selectivo` | `selectivo` | cuenta del cliente | búsqueda incremental en audiencias corporativas |
| Programmatic display, video, rich media e interstitials | `vía partner` | `vía partner` (ABM por confirmar) | Real Audiences, managed o autogestionado | cláusula de transparencia obligatoria |
| pDOOH (pantallas digitales en vía pública) | `selectivo` vía partner | `no ofrecido` por defecto | Real Audiences | se compone con la capacidad ATL, OOH & DOOH de la línea y con Channel & Commerce cuando la pantalla está cerca del punto de venta |
| Notificaciones push | `selectivo` vía partner | `no ofrecido` | Real Audiences | sólo con revisión de calidad del inventario |
| CTV / OTT | `vía partner` | `no ofrecido` por defecto | por confirmar con Real Audiences; si no lo cubre, alternativa | sólo con escala y objetivo de alcance |
| Retail media (redes de cadenas, marketplaces) | `core` cuando hay commerce | `no ofrecido` | cuenta del cliente en cada red | requiere acceso a venta y catálogo. En Chile: Mercado Ads, Walmart Connect, Cencosud Media, Fmedia, Sodimac Media, Ripley Media |
| Amazon Ads | `selectivo` sólo en México | `no ofrecido` | cuenta del cliente | Amazon no opera su programa de partners en Chile |
| Audio digital | `vía partner` | `no ofrecido` | Real Audiences | selectivo |
| **ChatGPT Ads** | `selectivo` donde existe | `selectivo` donde existe | Ads Manager del cliente | self-service en 52 países; en LATAM sólo Brasil y México. **En Chile no hay anuncios ni self-service** a 2026-09-10 |
| Anuncios en AI Overviews / AI Mode de Google | vía Search/PMax/AI Max | vía Search/AI Max | cuenta Google del cliente | no se compra aparte; hoy sólo en inglés y en 12 países, Chile no incluido |
| **X Ads** | `selectivo` bajo pedido | `selectivo` bajo pedido | cuenta del cliente | sólo con revisión de brand safety y verificación de terceros |
| Pinterest, Snap, Reddit | `no ofrecido` por defecto | `no ofrecido` | — | se evalúa caso a caso |
| Perplexity | `no disponible` | `no disponible` | — | abandonó la publicidad en febrero de 2026 |

Estados: `core` = lo operamos con equipo propio; `selectivo` = lo operamos cuando se cumplen condiciones; `vía partner`
= un partner opera el seat y Efeonce planifica, gobierna y audita; `no ofrecido` = no entra en propuesta sin decisión
explícita.

## Programmatic vía Real Audiences

Efeonce no tiene seat propio en un DSP. El partner programático seleccionado por el CEO el 2026-09-10 es **Real
Audiences**, un DSP con sede en Miami y oficinas en Chile, México, Colombia, Ecuador, Argentina, Uruguay y Reino Unido.
Declara inventario y campañas activas en los cinco países de Efeonce: Chile, Colombia, México, Perú y EE.UU. Formatos
declarados: display, video, rich media, audio, interstitials, pDOOH y notificaciones push, con segmentación
geolocalizada.

Se usan dos modos, en secuencia:

| Modo | Quién opera | Cuándo |
|---|---|---|
| **Managed por briefing** | Real Audiences opera; Efeonce define y audita | primeras campañas, hasta pasar el gate |
| **Autogestionado** | un trader de Efeonce certificado por Real Audiences (4 sesiones: campañas, tags y tracking, audiencias y listas, formatos, reportes) | después del gate: más control, aprendizaje propio y sin fee de servicio del partner |

En modo managed, la división del trabajo es:

| Efeonce | Real Audiences |
|---|---|
| objetivo, audiencias, listas de cuentas, exclusiones, frecuencia, brand safety | operación del seat, trafficking, optimización táctica |
| auditoría del supply path y de los reportes por dominio, app y placement | reporte a nivel de dominio, app y placement |
| lectura de resultados junto al resto del mix | fees de tecnología y de servicio declarados |

**Cláusula de transparencia — sin esto no se compra:**

1. fee de tecnología, fee de datos y fee de servicio del partner declarados por separado;
2. ningún markup no declarado sobre el costo del inventario;
3. reporte por dominio, app y placement con acceso para el cliente;
4. listas de exclusión de brand safety y de sitios hechos para arbitraje publicitario (MFA) aplicadas y auditables;
5. derecho del cliente a auditar y a llevarse listas, audiencias y aprendizajes al terminar.

**Gate para pasar a autogestionado:** dos campañas managed entregadas y auditadas contra la cláusula, un trader
certificado con backup y un checklist de brand safety y reporte aprobado.

**Por confirmar con Real Audiences antes de la primera campaña:** fees de plataforma, datos y servicio, y si hay
mínimos; aceptación de la cláusula de transparencia; verificación de brand safety de terceros; reporte por dominio, app y
placement; si cubre CTV y targeting B2B por cuenta. La conversación está abierta desde 2026-09-02, sin acuerdo firmado:
no se comunica como partnership hasta firmar.

**Alternativas si Real Audiences no cubre una necesidad:** MiQ (compró Adsmovil LATAM) y TenX (DV360). El DSP de
Microsoft (ex Xandr) cerró su compra en febrero de 2026. Estado vigente en el [Partnership Registry](../../operations/EFEONCE_PARTNERSHIP_REGISTRY_V1.md).

## Anuncios en respuestas de IA

ChatGPT Ads es el primer canal masivo de anuncios dentro de un asistente de IA. Lo operamos donde existe y lo
preparamos donde todavía no llega.

**Cómo funciona (fuente: centro de ayuda de OpenAI, leído 2026-09-10):**

- el anuncio aparece **debajo** de la respuesta, rotulado como patrocinado; no cambia lo que ChatGPT responde;
- sólo lo ven usuarios de los planes Free y Go, nunca menores de 18, nunca junto a temas de salud, salud mental ni
  política; no hay publicidad política;
- se muestra según el contexto e intención de la conversación, el landing, el copy y las señales que da el anunciante;
- el anunciante recibe sólo vistas y clics agregados: **la conversión se mide del lado del sitio** (UTMs, GA4, CRM);
- para usar el self-service, la entidad legal que anuncia y paga debe estar en un país habilitado. Los anunciantes
  grandes también pueden entrar por el equipo de OpenAI Ads o por agencias partner.

**Qué hacemos:**

| Situación del cliente | Qué ofrecemos |
|---|---|
| Entidad y audiencia en México, Brasil, EE.UU., España u otro país habilitado | campañas en ChatGPT Ads como canal `selectivo`, medidas en el sitio |
| Sólo Chile u otro país no habilitado | preparación: intents y prompts donde la marca debería aparecer, landings listas y medición; se activa cuando llegue |
| Marca que ya trabaja AEO | composición con Search Visibility 360: la misma inteligencia de prompts sirve para la visibilidad orgánica y para la pagada |

**Regla:** un anuncio en ChatGPT **no es** visibilidad orgánica ni AEO. Nunca se vende como "aparecer en la respuesta de
ChatGPT": aparece debajo, rotulado. La visibilidad orgánica en respuestas es de Search Visibility 360.

Los anuncios de Google en AI Overviews y AI Mode llegan por las campañas de Search, Shopping, PMax y AI Max existentes;
no se compran aparte. Perplexity abandonó la publicidad en febrero de 2026.

## X Ads — sólo bajo pedido

X reconstruyó su Ads Manager desde abril de 2026 y ofrece reportes de brand safety de terceros (DoubleVerify, IAS) y
controles de adyacencia. No entra en propuestas por defecto. Se activa cuando el cliente lo pide o cuando su audiencia
vive ahí —noticias, deportes, tecnología, finanzas, eventos en tiempo real—, y siempre con:

1. revisión de brand safety aprobada por el cliente;
2. verificación de terceros activa y listas de exclusión de palabras;
3. lectura separada del resto del mix, sin mezclar sus resultados con los de otras plataformas.

---

# Puertas de entrada 2026

Tres cambios de mercado del segundo semestre de 2026 afectan la señal de casi todos los anunciantes. Son la razón
concreta para pedir un Diagnostic ahora y no "cuando haya tiempo":

| Cambio | Qué rompe | Qué revisa el Diagnostic |
|---|---|---|
| **Meta cambió su atribución** (desde 2026-03-03, el click-through cuenta sólo clics en el link) | los KPIs históricos dejan de ser comparables | rebaseline de KPIs y lectura correcta de los resultados |
| **Google retira Dynamic Search Ads y broad match de campaña** (sin campañas nuevas desde septiembre 2026; migración automática a AI Max en febrero 2027) | campañas de búsqueda cambian de comportamiento sin decisión del anunciante | qué migrar, con qué controles y exclusiones |
| **La Ley 21.719 entra en vigencia el 2026-12-01** | el envío de datos first-party a plataformas necesita base de licitud documentada | inventario de flujos de datos hacia plataformas para revisión de Legal |

El Diagnostic identifica los flujos de datos y los deja listos para revisión. No es asesoría legal: la interpretación
para cada cliente es de Legal.

---

# Escalera de paquetes

Una sola escalera; cada paquete tiene variante por motion. Los precios viven en el pricing pack.

## 1. Performance Diagnostic — la puerta de entrada

**Qué incluye:** auditoría de inversión, estructura de cuentas, señal de conversión, audiencias, creatividad,
desperdicio y calidad del resultado downstream. Variante A: venta, margen, catálogo y feeds. Variante B: calidad de lead
contra el CRM, conversiones offline y costo por oportunidad.

**Qué entrega:** mapa de decisiones priorizado, estado de la señal, plan de 90 días y recomendación de siguiente fase.

**Qué no incluye:** cambios en las cuentas, implementación técnica ni garantía de mejora.

**Duración de referencia:** 2 a 4 semanas según cuentas, mercados y calidad de datos.

## 2. Growth Activation Sprint

**Qué incluye:** remediación o setup de la señal, reestructuración o takeover de cuentas, primera matriz creativa,
dashboard operativo y primera lectura de aprendizaje. En el motion B incluye el mapeo de etapas CRM a conversiones
offline con RevOps & CRM.

**Duración de referencia:** 8 a 12 semanas, sujeta a scope y a la velocidad de aprendizaje de cada plataforma.

**Salida:** propuesta de Managed Performance con baseline documentado.

## 3. Managed Performance — el core recurrente

**Qué incluye:** operación continua de los canales del motion, presupuesto y pacing, señales, testing creativo,
experimentos, reporting ejecutivo mensual y gobierno trimestral con recomendación de asignación.

**Compromiso inicial:** tres meses como mínimo, porque los algoritmos necesitan ciclos de aprendizaje.

## 4. Incrementality & Media Investment Architecture — expansión avanzada

**Qué incluye:** holdouts, geo-tests, lift studies, MMM ligero o completo según escala, saturación y escenarios de
asignación. Se activa sólo con volumen, historial y capacidad de experimentar.

---

# Delivery

| Modelo | Cuándo | Quién dirige | Qué responde Efeonce |
|---|---|---|---|
| **Managed Squad** (`efeonce-managed`) | el cliente no tiene equipo de medios o quiere externalizar la operación | Efeonce | operación y aprendizaje del scope |
| **Co-operated** | el cliente tiene un performance lead o demand gen in-house | según RACI por módulo | los módulos que tomamos, típicamente señal, gobierno y creatividad de performance |
| **Staff Augmentation** | el cliente dirige y necesita un perfil | el cliente | disponibilidad y calidad del perfil, no el outcome |
| **Advisory** | el cliente opera y quiere criterio | el cliente | análisis y recomendación |

Staff Augmentation no es un tier barato de Managed Squad; si convive en un engagement, se separa por lane, RACI y
pricing.

---

# Operator & Buying Group Contract

| Rol | Motion A · Demand & Commerce | Motion B · B2B Pipeline |
|---|---|---|
| **Operador** | Performance Lead o E-commerce Manager | Demand Gen Manager o Marketing Ops |
| **Workflow** | plan de medios, presupuesto, creatividad, lectura semanal | campañas por cuenta, handoff a ventas, lectura de pipeline |
| **Primer valor** | el diagnóstico muestra desperdicio concreto y la señal que falta, en su propio lenguaje | la primera lectura cruza el lead con la etapa del CRM y muestra qué campañas producen oportunidades |
| **Camino a champion** | lleva al CMO una recomendación de asignación con evidencia | lleva a ventas y al CMO pipeline con fuente CRM, no leads |
| **Problem owner** | Head of Growth o Head of E-commerce | CMO o VP Marketing |
| **Sponsor** | CMO | CMO, con el líder comercial como co-sponsor |
| **Economic buyer** | CMO o CFO según tamaño de la inversión | CMO; CFO cuando el compromiso es anual |
| **Governance owner** | Finance (inversión), Legal (datos) | RevOps (datos CRM), Legal (datos) |
| **Procurement y blockers** | registro de proveedor, política de acceso a cuentas, agencia incumbente | IT/Seguridad por acceso al CRM, Legal por envío de datos a plataformas |
| **Evidencia de adopción** | la recomendación de asignación se ejecuta; el cliente consulta el aprendizaje acumulado | ventas usa la señal; el CMO reporta pipeline con fuente |
| **Triggers de expansión** | nuevo mercado, retail media, incrementalidad, Creative Services | ABM, CRM Intelligence, contenido para comité de compra |

Estado del contrato: `hypothesis_only`. Se valida con los pilotos de G1.

---

# Requisitos de intake — sin esto no se firma

1. **Propiedad de cuentas:** cuentas publicitarias, píxeles/datasets, audiencias y catálogos son del cliente; Efeonce
   accede como partner. No se opera desde cuentas propiedad de Efeonce.
2. **Definición de éxito:** qué señal de negocio se optimiza y con qué fuente.
3. **Acceso a datos:** ventas o CRM según motion; si no existen, el primer paquete es Measurement & Signal Foundation.
4. **Base legal para datos first-party:** consentimiento y DPA revisados antes de subir listas o conversiones.
5. **Inversión suficiente para aprender:** la inversión y el volumen de conversiones deben alcanzar los mínimos de
   aprendizaje de cada plataforma; si no, se consolidan canales antes de abrir nuevos.
6. **Owner del cliente** con autoridad para aprobar presupuesto, creatividad y cambios.
7. **Motion B:** CRM con etapas definidas y un owner en RevOps o Sales Ops. LinkedIn entra sólo con inversión de al
   menos USD 3.000/mes, por el mínimo práctico de aprendizaje de la plataforma.

---

# Estados degradados

| Situación | Qué hacemos | Qué no hacemos |
|---|---|---|
| Señal rota o duplicada | Measurement & Signal Foundation antes de optimizar | escalar inversión sobre una señal que miente |
| Sin CRM confiable | motion A con objetivo de lead, declarado | vender motion B |
| Volumen bajo | consolidar canales y campañas | abrir canales nuevos |
| Sin capacidad creativa | limitar TikTok y formatos nativos; componer con Creative Services | prometer rendimiento creativo |
| Cliente no da acceso de partner a sus cuentas | no firmar operación | operar con credenciales compartidas |
| El cliente sólo quiere ejecución barata de una plataforma | descalificar con honestidad | competir por tarifa |

---

# Operación AI-native

| Capa | Qué hace | Autoridad |
|---|---|---|
| Lectura | extrae datos de cuentas por API o conector MCP oficial de cada plataforma | automática, sólo lectura |
| Detección | anomalías de gasto y rendimiento, pacing, fatiga creativa, términos de búsqueda irrelevantes | automática, genera alertas |
| Recomendación | propone cambios de presupuesto, pujas, exclusiones y rotación creativa | el agente propone |
| Ejecución | aplica el cambio en la plataforma | **humano confirma**; nunca automática |
| Memoria | registro de experimentos, aprendizajes y decisiones por cuenta | el cliente lo conserva al salir |

Hoy no existe integración de plataformas publicitarias en Greenhouse. El conector MCP oficial de Meta existe como
herramienta de operador fuera del runtime. Llevar cualquier capa a Greenhouse requiere su propia TASK con contrato
gobernado. Madurez declarada: **1 · Structured**.

---

# Métricas

| Tipo | Métrica | Definición |
|---|---|---|
| Delivery | salud de la señal | % de conversiones deduplicadas y con valor sobre el total esperado, por plataforma, mensual |
| Delivery | cadencia de aprendizaje | experimentos cerrados con decisión por mes |
| Delivery | pacing | gasto real / gasto planificado del período |
| Valor · A | eficiencia combinada | revenue total del período / inversión total en medios del período (MER), fuente: ventas del cliente |
| Valor · A | margen de contribución | revenue − costo variable − inversión en medios, cuando el cliente entrega el margen |
| Valor · B | costo por oportunidad calificada | inversión del período / oportunidades creadas con fuente paid en el CRM |
| Valor · B | pipeline con fuente | valor de oportunidades con fuente paid creadas en el período |
| Economics | margen del fee | (fee Efeonce − costo cargado del equipo − herramientas) / fee Efeonce |
| Economics | conversión de la escalera | diagnósticos que pasan a Sprint o Managed en 90 días |

Toda métrica declara período, denominador, fuente y owner. Platform ROAS se reporta como dato operativo, no como
resultado.

---

# Contra quién competimos

| Alternativa | Qué ofrece | Nuestra respuesta |
|---|---|---|
| Agencias de performance puro (Chile) | operación de plataformas, dominan la SERP con rankings propios | señal, CRM y aprendizaje; no competir por tarifa de operación |
| Agencias integrales con el mismo discurso | SEO, AEO, paid y contenido en un paquete | pauta conectada al CRM y memoria del aprendizaje verificables |
| Freelancer o equipo in-house | costo bajo, conocimiento de la marca | co-operated: tomamos señal, gobierno y creatividad de performance |
| La automatización de la plataforma sola | Advantage+, PMax y Smart+ sin agencia | la automatización optimiza lo que le das; sin señal de negocio optimiza el clic |
| No hacer nada | seguir con la agencia actual | el diagnóstico hace visible el desperdicio en su lenguaje |

El detalle competitivo y de precios fechado vive en la investigación de mercado 2026-09-10.

---

# Lo que esta solución nunca vende

- gestión de una plataforma como producto;
- porcentaje de inversión como único cobro;
- markups no declarados sobre medios o partners;
- garantías de ROAS, CAC, pipeline o revenue;
- producción creativa dentro del fee;
- cuentas publicitarias o datos del cliente como propiedad de Efeonce;
- badges de partner no verificados.

# Referencias

- [Decisión de arquitectura de oferta](../../architecture/EFEONCE_PERFORMANCE_COMMERCE_DISTRIBUTION_DECISION_V1.md)
- [Pricing Integrity Pack V1](../../business-models/media-distribution/PERFORMANCE_COMMERCE_PRICING_INTEGRITY_PACK_V1.md)
- [Media & Distribution — Business Model V1](../../business-models/media-distribution/MEDIA_DISTRIBUTION_BUSINESS_MODEL_V1.md)
- [Investigación de mercado 2026-07-26](../../audits/commercial/PERFORMANCE_COMMERCE_DISTRIBUTION_MARKET_RESEARCH_2026-07-26.md)
- [Investigación de mercado 2026-09-10](../../audits/commercial/PERFORMANCE_MEDIA_CHANNELS_PARTNERS_PRICING_RESEARCH_2026-09-10.md)
- [Partnership Registry](../../operations/EFEONCE_PARTNERSHIP_REGISTRY_V1.md)
- [ADR de Wave — fronteras de Measurement & Analytics](../../architecture/EFEONCE_WAVE_PORTFOLIO_BOUNDARIES_DECISION_V1.md)
