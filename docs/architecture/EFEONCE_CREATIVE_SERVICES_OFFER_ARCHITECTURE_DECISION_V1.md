# Efeonce Creative Services — Offer Architecture Decision V1

## Architecture Decision 2026-07-30 — Creative Operations como sistema de oferta

- **Status:** Accepted
- **Date:** 2026-07-30
- **Owner:** Efeonce Strategy + Creative Practice + Commercial
- **Required partners:** Finance + Legal/IP + Operations + Product/Globe cuando aplique
- **Scope:** catálogo comercial de Creative Services, beachhead Creative Velocity & Production, paquetes de entrada, Managed Creative Capacity, Content & Social Operations, Run & Gun Production, Creative Operations y composiciones con Globe/Reach/Wave
- **Reversibility:** two-way-but-slow
- **Confidence:** high para arquitectura de oferta; medium para willingness-to-pay, pricing y throughput de mercado
- **Validated as of:** 2026-07-30
- **Evidence:** [`CREATIVE_SERVICES_MARKET_BENCHMARK_2026-07-30.md`](../audits/commercial/CREATIVE_SERVICES_MARKET_BENCHMARK_2026-07-30.md)

### Context

Creative Services ya tiene un catálogo válido de servicios de estrategia, campañas, contenido, producción,
capacidad recurrente, Run & Gun y Creative Studio. Sin embargo, una lista plana de servicios no refleja cómo los
compradores enterprise y mid-market están adquiriendo creatividad en 2026.

La investigación de referentes globales y regionales muestra una convergencia hacia:

- equipos internos complementados por capacidad externa integrada;
- producción continua y modular de contenido, especialmente video y social;
- sistemas de marca, memoria y governance;
- IA aplicada a briefing, producción, adaptación, QA y aprendizaje;
- entrada por diagnóstico, sprint o proyecto exploratorio;
- expansión a retainer, equipo dedicado, embedded team o plataforma;
- proof que combina calidad creativa, impacto comercial y confiabilidad operativa.

El catálogo no debe copiar el tamaño ni la complejidad de WPP, Publicis, Omnicom, Dentsu, Monks o Huge. Debe
absorber el patrón comercial que sí es compatible con Efeonce: vender capacidad gobernada y sistemas de producción,
mantener una relación contractual única con Efeonce, preservar ownership por lane y usar Globe como habilitador
cuando la plataforma esté lista para el estadio comercial correspondiente.

### Decision

Efeonce adopta **Creative Operations como arquitectura comercial de Creative Services**.

La oferta se organiza en cuatro rutas de compra, no en un catálogo plano:

```text
Creative Velocity
  Diagnostic → Sprint/Capture → Managed Creative Capacity → Campaign/Content Systems → Studio/Media expansion

Brand & Campaign Systems
  Brand Diagnostic → Creative Strategy & Brand Systems → Campaign Platform → Content/Production rollout

Content Production System
  Supply Chain Diagnostic → Content System Design → Managed Production Lane → Adaptation/Localization → Measurement

AI Creative Operations
  AI Creative Operations Diagnostic → Studio Foundation → Managed Creative Production → Studio Access gradual
```

Los servicios existentes permanecen como Product Services o capabilities con estos roles:

| Elemento | Rol vigente | Tratamiento comercial |
|---|---|---|
| Creative Strategy & Brand Systems | Product Service | Core de Brand & Campaign Systems |
| Campaign & Creative Platform Systems | Product Service | Core de Brand & Campaign Systems |
| Content & Social Operations | Product Service | Core recurrente de Content Production System y Creative Velocity |
| Audiovisual, Motion & Audio Production | Product Service/capability componible | Scope por proyecto o lane |
| Run & Gun Production | Product Service especializado | Wedge de Capture Sprint y módulo de producción |
| Managed Creative Capacity | Product Service recurrente | Core de Creative Velocity |
| Creative Operations | Capa transversal de delivery | Diferenciador y método; no crea una línea contractual separada por sí sola |
| Creative Diagnostic | Wedge | Entrada a una ruta; no es una sexta línea productiva |
| AI Creative Operations / Studio Access | Product Service platform-enabled en validación | Gradual; Globe habilita cuando corresponde, no reemplaza Efeonce |
| Globe Managed Production Sprint | Composición condicionada | Sólo con aprobación y runtime/operación verificables |
| Performance Creative Lab | Composición | Media & Distribution/Reach y Measurement conservan ownership |

### Offer ladder

Todo movimiento comercial creativo debe declarar la siguiente escalera:

1. **Diagnóstico o proyecto exploratorio pagado** — descubre el problema, establece baseline y toma una decisión.
2. **Sprint** — demuestra una capacidad acotada con alcance, rounds, derechos y aceptación explícitos.
3. **Managed Creative Capacity** — compra continuidad, capacidad reservada, gobierno y aprendizaje acumulado.
4. **Sistema o lane especializado** — amplía a campañas, contenido, producción, social, localización o performance.
5. **Studio/Globe o composición de portfolio** — añade memoria, provenance, workflow, media, measurement, Search o CRM cuando existe fit y gate.

El primer paso no debe ser gratuito salvo una excepción aprobada por la política de spec work. El sprint debe tener
precio y margen propios; no puede ser loss-leading ni convertirse en un retainer ambiguo.

### Packaging decision

Se validan tres paquetes descriptivos, sin convertirlos todavía en SKUs públicos ni precios aprobados:

#### 1. Creative Sprint

Proyecto acotado para validar fit y resolver un resultado concreto. Puede tomar la forma de Campaign Sprint,
Content Sprint, Run & Gun Sprint o AI Creative Production Sprint.

Debe declarar:

- problema y trigger;
- brief y owner del cliente;
- hipótesis o resultado controlable;
- fases y calendario;
- entregables cerrados;
- número de rondas;
- quality gates;
- derechos y pass-through;
- dependencias y fallback;
- aceptación y retrospectiva;
- siguiente fase recomendada sin obligación de compra.

#### 2. Creative Capacity

Managed Creative Capacity como relación `On-Going + Managed Squad`, con capacidad mensual reservada y lanes
priorizadas.

Debe declarar:

- capacity envelope, no horas vendidas;
- roles, seniority y dedicación;
- lanes y prioridades;
- RACI y operator/approver;
- cadencia de planificación y QBR;
- capacidad reactiva máxima;
- expected delivery, no outcome de negocio no controlado;
- OTD, FTR, RpA, cycle time y stuck work cuando exista muestra suficiente;
- change order, pause, rollover y expansión;
- memoria, aprendizaje y offboarding.

#### 3. Creative Studio / Production System

Servicio platform-enabled para equipos maduros que necesitan autonomía gobernada o producción generativa
repetible.

Separa explícitamente:

- gobierno/plataforma;
- capacidad humana;
- implementación e IP;
- Studio Credits;
- derechos/licencias/pass-through;
- soporte y adopción.

No promete por defecto dirección creativa, QA managed, SLA de delivery, precio público por crédito, top-ups,
checkout ni acceso externo general. Esos elementos requieren los gates del Creative Studio Business Model y de
Finance/Legal/Product.

### Content Production System contract

La producción debe operar como una cadena, no como una colección de piezas:

```text
intake → brief → concept → produce → adapt → localize → review → approve → deliver → distribute → measure → learn
```

El SOW debe registrar, según aplique:

- fuente original y derivados;
- formatos, ratios, canales y mercados;
- templates y reglas de marca;
- edición, motion, audio, color y finishing;
- cantidad de variantes como input interno, no precio unitario público;
- revisión y aceptación;
- derechos por territorio, plazo, canal, paid usage, exclusividad y talento;
- provenance y uso de IA;
- metadata, manifest y handoff;
- sistema de medición y limitaciones causales.

La unidad comercial principal es capacidad, sprint, lane, fase o engagement. La pieza individual explica un
escenario de producción, pero no debe convertirse en la calculadora de procurement.

### Creative Operations contract

Creative Operations es la capa que vuelve demostrable la promesa de confiabilidad. Cada oferta debe definir, dentro
de su scope:

1. intake y brief ownership;
2. triage y priorización;
3. calendario/backlog;
4. approval workflow;
5. governance de marca y claims;
6. derechos y provenance;
7. queue y capacidad;
8. revisión y change order;
9. entrega y evidencia;
10. learning log y memoria;
11. cadencia ejecutiva;
12. offboarding y portabilidad.

La plataforma puede asistir la operación, pero la autoridad creativa, aprobación, derechos, presupuesto y
publicación permanecen humanos y explícitos.

### ICP and buying group

El beachhead prioritario es **Creative Velocity & Production**:

- equipos mid-market o enterprise con demanda recurrente;
- marketing/brand/creative in-house existente;
- saturación, picos, demasiados formatos o múltiples mercados;
- sensibilidad de marca, derechos y consistencia;
- un creative lead o brand owner identificable;
- sponsor CMO, Marketing Director, Brand Director o Head of Growth;
- procurement, Finance, Legal/IP y, cuando aplique, Media/CRM como ratifiers.

Anti-ICP inicial:

- comprador que sólo compara precio por pieza;
- cliente sin owner de brief o aprobación;
- solicitud de rondas ilimitadas;
- demanda de derechos perpetuos, exclusivos e ilimitados dentro del fee base;
- necesidad de media buying, customer care 24/7 o atribución causal sin owner de esa línea;
- cliente que exige Staff Augmentation al precio y con accountability de Managed Squad;
- generación barata sin revisión, derechos ni governance.

### Proof architecture

Creative Services adopta un proof system de tres capas:

| Capa | Evidencia | Claim que soporta |
|---|---|---|
| Creative proof | casos, craft, premios, portfolios, testimonios | sabemos resolver el problema creativo |
| Commercial proof | ventas, leads, tráfico, participación, performance con baseline | la solución produjo un efecto de negocio en condiciones determinadas |
| Operational proof | OTD, FTR, RpA, cycle time, throughput, stuck work, adopción | podemos entregar con confiabilidad visible |

Un logo no reemplaza un caso. Un caso no prueba repetibilidad. Una métrica de delivery no prueba revenue. Cada claim
debe conservar fuente, período, denominador, owner, confidence y condición de falsación.

### Commercial rules

1. No vender horas ni piezas como unidad pública principal.
2. No usar “unlimited” sin cola, solicitudes simultáneas, turnaround, rounds, exclusiones y overages explícitos.
3. No vender Managed Squad, Staff Augmentation y Studio Access como tiers de una misma accountability.
4. No descontar gobierno/plataforma sin reducir alcance.
5. No cerrar bajo el piso de 45% de margen bruto aprobado por Creative Practice/Finance.
6. No comprometer revenue, awareness, share o ventas si Efeonce no controla la causalidad.
7. No prometer superficies de Globe o del portal que no existen en runtime.
8. Separar creación, capacidad, plataforma, implementación/IP, derechos y pass-through.
9. El ad-hoc debe costar más por unidad de capacidad que el compromiso recurrente equivalente.
10. Todo brief debe tener owner de aprobación del lado cliente.
11. Todo Sprint debe cerrar con acceptance, retro y recomendación de siguiente fase.
12. Todo cambio material de oferta, pricing, rights o entitlement requiere el owner y gate correspondiente.

### Consequences

Positivas:

- la oferta se entiende desde el problema del comprador;
- Creative Capacity se convierte en core recurrente y no en un retainer genérico;
- Run & Gun obtiene una ruta de entrada concreta;
- Social, audiovisual, motion, audio y Globe caben en un sistema común sin perder ownership;
- Creative Operations hace visible la diferenciación real de Efeonce;
- el cross-sell hacia Media, Search, Wave, CRM y Globe tiene un momento y un trigger explícitos;
- se conserva la taxonomía de tres ejes del Creative Studio Business Model.

Costos y riesgos:

- cada ruta necesita Product Service Contract, customer model, pricing integrity y proof;
- la integración comercial no autoriza integración contable, técnica o de ownership;
- los claims de IA, throughput y ahorro requieren evidencia por workflow;
- el cliente puede pedir flexibilidad que exceda la capacidad reservada;
- el catálogo seguirá `Approved for validation` hasta completar Finance, Legal/IP, Operations y evidencia comercial.

### Runtime and documentation contract

- Offer architecture: [`EFEONCE_CREATIVE_SERVICES_OFFER_ARCHITECTURE_V2.md`](../services/creative-services/EFEONCE_CREATIVE_SERVICES_OFFER_ARCHITECTURE_V2.md)
- Catalog entry point: [`docs/services/creative-services/README.md`](../services/creative-services/README.md)
- Market evidence: [`CREATIVE_SERVICES_MARKET_BENCHMARK_2026-07-30.md`](../audits/commercial/CREATIVE_SERVICES_MARKET_BENCHMARK_2026-07-30.md)
- Business model: [`EFEONCE_CREATIVE_STUDIO_BUSINESS_MODEL_V1.md`](../business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_BUSINESS_MODEL_V1.md)
- Pricing method: [`creative-practice/modules/04_PRICING.md`](../../.codex/skills/creative-practice/modules/04_PRICING.md)
- Customer model: [`creative-practice`](../../.codex/skills/efeonce-customer-model-operator/SKILL.md)

### Revisit when

- dos cohortes comerciales contradigan el beachhead Creative Velocity;
- tres o más clientes demuestren un JTBD distinto con mejor repetibilidad;
- el sprint no convierta a Managed Creative Capacity después de la muestra definida;
- los datos reales muestren que la capacidad, el margen o el delivery no soportan el packaging;
- Finance/Legal/Product aprueben un modelo de Studio Access externo diferente;
- el portfolio de Efeonce cambie ownership de Media, Wave, Kortex o Globe.

## Delta 2026-07-30 — arquitectura híbrida para reconocimiento y conversión

La decisión adopta una aclaración comercial solicitada después de revisar la heurística de identificación del
mercado: **la lista plana de servicios no se elimina**. Es necesaria para que un comprador, un buscador, un
procurement o un evaluador reconozca rápidamente la categoría y encuentre términos familiares.

La arquitectura vigente queda en tres capas:

```text
1. índice de servicios reconocibles
   → 2. rutas por problema
      → 3. paquete, modalidad, alcance y siguiente paso
```

El catálogo plano sigue siendo el índice público de reconocimiento. Las cuatro rutas —`Creative Velocity`, `Brand &
Campaign Systems`, `Content Production System` y `AI Creative Operations`— funcionan como capa de orientación y
venta, no como reemplazo del catálogo. Creative Operations sigue siendo una capa transversal de delivery y no un SKU
independiente por defecto.

Esta aclaración no cambia ownership, delivery models, engagement, rights, economics, Studio Credits ni gates de
validación. **Confidence:** high para la necesidad de reconocimiento comercial; debe validarse en analytics,
entrevistas y experimentos de conversión.
