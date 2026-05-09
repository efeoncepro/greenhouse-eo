# ASaaS Manifesto V1 — Agency-as-a-Service

> **Versión:** 1.0
> **Creado:** 2026-05-07 por Claude (Opus 4.7) bajo dirección Julio Reyes
> **Audiencia:** equipo Efeonce Group (comercial, delivery, finance, leadership), agentes AI que operen el portal Greenhouse, partners y stakeholders externos que necesiten entender el modelo
> **Tipo:** documento canónico de doctrina comercial
> **Related:** `spec/Arquitectura_BowTie_Efeonce_v1_1.md`, `docs/architecture/GREENHOUSE_BOWTIE_OPERATIONAL_BRIDGE_V1.md`, `docs/architecture/GREENHOUSE_CLIENT_LIFECYCLE_V1.md`, `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md`

---

## 0. Por qué este documento existe

Cuando Efeonce dice **ASaaS** (Agency-as-a-Service) suelen pasar 3 cosas malas:

1. El stakeholder externo lo escucha como "agencia con software" — categoría que ya existe y no diferencia.
2. El stakeholder interno lo aplica al pricing, al pitch, al delivery, al onboarding como si fuera un branding label sin doctrina.
3. Las decisiones operativas (pricing tiers, comp plans, ICP, dashboards Bow-tie) se toman sin un norte canónico — cada quien lo interpreta y diverge.

Este documento fija qué es ASaaS para Efeonce, qué no es, en qué se basa, cómo se opera, y qué consecuencias arquitectónicas + comerciales tiene. Cualquier otro documento del ecosistema Efeonce que mencione ASaaS debe poder referenciarse contra este.

---

## 1. Definición canónica

> **ASaaS (Agency-as-a-Service) es la operación de una agencia digital cuyas capacidades de servicio están productizadas, instrumentadas con software propio, y entregadas con la confiabilidad operativa, transparencia de datos, y economía unitaria de un negocio SaaS — sin renunciar a la sofisticación humana del trabajo creativo y estratégico que define la disciplina de agencia.**

Tres palabras clave:

- **Productizadas**: cada servicio tiene un alcance, métrica de output, y unidad económica claros (no "lo que el cliente necesite este mes").
- **Instrumentadas**: el delivery corre sobre software propio que da telemetría, automatización, y data al cliente y al operador (no "Excel + Notion + buena fe").
- **Confiabilidad operativa SaaS**: SLA, observabilidad, predictabilidad, retention metrics. Operamos como producto, no como project shop.

Lo que NO renunciamos: la calidad humana del trabajo creativo + estratégico + consultivo de agencia. ASaaS no es "reemplazar humanos con software". Es "elevar el trabajo humano con software que lo hace más predecible, escalable y medible".

---

## 2. Qué NO es ASaaS

Dejar claro lo que no es resuelve más confusiones que repetir lo que sí es.

- **NO es agencia que vende su software como producto extra**. Si vendes la agencia + el software por separado y el cliente puede contratar uno sin el otro, eso es una agencia con un producto, no ASaaS.
- **NO es consultoría con dashboard**. Un dashboard sales-facing no convierte un servicio time-and-materials en ASaaS. Falta productización + economía unitaria.
- **NO es servicios cobrados por suscripción mensual**. Un retainer flat es solo una forma de billing. ASaaS requiere que el output esté instrumentado y la economía sea predecible.
- **NO es project shop con buenos clientes recurrentes**. Recurrencia ≠ ASaaS. La señal correcta es **NRR > 110%** sostenido (Bow-tie §9.1) y `client_kind` clasificable.
- **NO es "agency + AI"**. AI es una tecnología; ASaaS es un modelo de negocio. Pueden coexistir, no se equivalen.
- **NO es vender SaaS y hacer onboarding como servicio**. Eso es PLG con high-touch onboarding. Distinto modelo.

---

## 3. Por qué ASaaS y por qué ahora

Tres convergencias hacen ASaaS la jugada correcta para Efeonce en 2025-2026:

### 3.1 La crisis del modelo agencia tradicional

El modelo agencia tradicional (time-and-materials, retainer flat sin telemetría, project shop) sufre 4 fuerzas convergentes:

1. **Margen comprimido**: clientes piden más por menos, AI desinflando perceived value de tareas operativas.
2. **Talento fugado**: los mejores creativos/estrategas/data scientists prefieren productos o consultoría top-tier; agencias quedan con segundo tier.
3. **Comoditización**: campañas, dashboards, content production tienen ofertas de $100/mes en plataformas. La agencia sin diferencial técnico real desaparece.
4. **Cliente desencantado**: marcas grandes (Globe clients enterprise marketing teams) ya no toleran "agency theater" — quieren outcomes medibles, transparencia, y data como contrato.

La salida no es bajar precios ni hacer más features. Es subir de modelo de negocio.

### 3.2 La oportunidad SaaS para servicios

El modelo SaaS demostró por 25 años que productos digitales pueden tener:

- Net Revenue Retention > 100% (los clientes existentes crecen contigo)
- Margen bruto > 75%
- Predictabilidad operativa (SLA, observabilidad, dashboards)
- Economía unitaria clara (CAC, LTV, payback period)

Hasta hace ~5 años eso era exclusivo de software puro. Hoy, la combinación de:

- **Productización rigurosa** (definir scope + output como producto, no como hours bucket)
- **Software propio que instrumenta el delivery** (Greenhouse portal + Kortex + Verk para Efeonce)
- **AI que comprime tiempo de ejecución** (Vertex AI + Gemini en el stack Efeonce)
- **Data architecture canónica** (PG + BQ dual-store, métricas Bow-tie) 

…permite que un servicio creativo/estratégico/operativo opere con economía unitaria SaaS-grade.

### 3.3 El contexto Efeonce específico

Efeonce ya tiene tres ventajas que la mayoría de agencias no:

1. **Software propio en producción**: Greenhouse (operational portal interno + cliente), Kortex (CRM platform), Verk (data/AI tooling). No es vendor lock-in; es leverage.
2. **Data canónica**: dual-store PG + BQ con domain boundaries claros, identity 360 model, outbox + reactive consumers. Plumbing que la mayoría de agencias jamás tendrán.
3. **Disciplina operativa**: Bow-tie spec adoptado, operational case lifecycle, reliability control plane, ICO engine. Más cerca del rigor de SaaS B2B serio que de un project shop.

ASaaS no es un pivot. Es la formalización del modelo que Efeonce ya está construyendo.

---

## 4. Los 3 tipos de relación cliente (canónico Bow-tie)

ASaaS Efeonce opera con **3 tipos de clientes simultáneos**, no uno. Cada uno tiene motion comercial, métrica de éxito, cadencia de QBR, y modelo económico distintos. Esto es el corazón de la asimetría que el Bow-tie spec §5.1 describe.

### 4.1 Active Account (`clients.client_kind='active'`)

> **Cliente enterprise con MSA + SOWs activos. La relación principal es un master agreement, los SOWs entran y salen, la suscripción SaaS puede o no estar.**

Ejemplos Efeonce: Sky Airlines, ANAM, Grupo Aguas (clientes con relaciones operativas profundas, equipos compuestos, retainer + proyectos).

Características:

- Decisor: CMO / Head of Marketing / Director Brand
- Buying committee: 5-10 stakeholders modern enterprise
- Sales cycle: 3-9 meses
- AOV: $30K-$500K+ anuales
- Owner GH: Account Lead (Account-based)
- QBR: trimestral business review formal
- Métrica de éxito: Net Revenue Retention > 110%, Expansion Rate > 15% trimestral, % de scope expandido
- Economía: full absorption costing per loaded cost model (TASK-MEMBER_LOADED_COST), margen bruto target > 50%

### 4.2 Self-Serve Customer (`clients.client_kind='self_serve'`)

> **Cliente que paga solo suscripción SaaS (Kortex y/o Verk) sin MSA de servicio activo. PLG puro.**

Ejemplos Efeonce: empresas que adoptan Kortex como su CRM stack, sin contratar la agencia.

Características:

- Decisor: founder / VP / individual practitioner
- Sales cycle: días-semanas, free trial → paid
- AOV: $50-$2K mensuales
- Owner GH: CSM (futuro), automation now
- QBR: digital, in-product cadence + email lifecycle
- Métrica de éxito: trial-to-paid conversion, monthly active usage, expansion via tier upgrade
- Economía: pure SaaS unit economics (CAC < 6 months payback, LTV/CAC > 3, gross margin > 80%)

### 4.3 Project Customer (`clients.client_kind='project'`)

> **Cliente con SOW puntual sin MSA recurrente y sin SaaS. Un trabajo específico con principio y fin.**

Ejemplos Efeonce: rebranding one-off, content production short-term, audit estratégico.

Características:

- Decisor: variado
- Sales cycle: semanas-meses
- AOV: $10K-$100K
- Owner GH: PM + Account Lead light
- QBR: solo cierre de proyecto + post-mortem
- Métrica de éxito: project margin, NPS, conversión a Active Account o Self-Serve
- Economía: project margin > 30%, cost recovery + reasonable margin

### 4.4 Oscilación entre los 3 tipos

Crítico: un cliente puede oscilar entre los 3 tipos a lo largo del tiempo (Bow-tie §5.3). Sky puede pasar de Active a Project si solo mantiene un SOW, o un Self-Serve puede convertirse en Active al firmar MSA. **Esto es feature, no bug.** ASaaS abraza la fluidez del cliente moderno.

El sistema Greenhouse persiste el `client_kind` actual + historial completo (`client_kind_history` append-only, TASK-816 Delta) — y el motion comercial se ajusta automáticamente.

---

## 5. Los 4 productos Efeonce y cómo se combinan

ASaaS Efeonce opera 4 productos que se combinan según el cliente. Decision tree de positioning:

| Producto | Categoría | Cuándo es eje principal | Cuándo es soporte |
|---|---|---|---|
| **Servicio agencia** (creative + strategy + operations) | Agencia productizada | Active Account: MSA + SOWs operativos | N/A — es el corazón |
| **Kortex** | CRM platform | Self-Serve standalone, o componente de Active | Soporta Active integrando data CRM al pitch |
| **Verk** | Data / AI tooling | Self-Serve standalone, o componente analítico de Active | Habilita differentiation técnico en Active |
| **Greenhouse** | Operational portal cliente | Componente always-on de Active y Project | Plumbing de delivery, no se vende standalone |

**Regla de positioning**: nunca pitch los 4 a la vez. Pitch el que resuelve el job-to-be-done del cliente, los otros 3 entran como leverage cuando hace sentido.

**Combinaciones canónicas**:

- **Globe Active deal**: Servicio + Greenhouse + (Kortex o Verk) según necesidad data
- **Self-Serve Kortex**: Kortex standalone, upgrade path a Active si el cliente quiere servicio
- **Project**: Servicio puntual + Greenhouse para delivery transparency
- **Kortex + servicio onboarding** (variant Self-Serve): tier "Kortex con managed setup" — high-touch onboarding como upsell

---

## 6. Pricing canónico ASaaS

ASaaS pricing es triple complejo: combina retainer (servicios recurrentes), proyectos (SOW puntuales), y SaaS subscriptions. Doctrinas canónicas:

### 6.1 Value-based primero, cost-plus es derrota

Cada SOW + retainer se prescribe por outcome económico para el cliente, no por costo Efeonce + margen. Si no podemos articular el value el deal no existe.

Marco de referencia: **Monetizing Innovation** (Madhavan Ramanujam) + **ProfitWell pricing data**.

### 6.2 Margin transparency con el cliente

Active Accounts maduros (MSA > 12 meses) tienen visibilidad razonada de la economía de su cuenta — qué cuesta qué, dónde va la inversión, cuál es el margen Efeonce. Es contraintuitivo pero crea trust deeper que opacar.

Esto es ASaaS-grade: tratar al cliente como un partner económico, no como un budget a explotar.

### 6.3 Pricing tiers SaaS (Kortex + Verk)

Modelo good/better/best (3 tiers) con anchoring claro. Tier middle es el target económico (~70% de adopción). Tier high tiene features que no usan la mayoría pero los hace sentir que el middle es razonable. Tier low es el funnel.

### 6.4 Tres reglas anti-erosión de margen

1. **No descontar sin lograr concesión recíproca** (multi-year, expanded scope, case study, referencia).
2. **No firmar nuevos SOWs sin loaded cost model actualizado** (Member Loaded Cost spec, TASK-710..713).
3. **No hacer pilot/discovery free** sin entry criteria explícitos para conversión a paid.

### 6.5 La trampa del retainer flat

Retainer flat es cómodo y peligroso. Si Efeonce no instrumenta el delivery (output, hours, member allocation), el retainer eventualmente erosiona margen cuando:

- El cliente expande scope informalmente ("¿pueden ver esto también?")
- El equipo crece sin que el retainer crezca
- Costos suben (talento, herramientas, FX)

Antídoto canónico: cada retainer Active Account tiene **scope canónico documentado + telemetría de delivery + revisión trimestral en QBR + cláusula de re-pricing anual contractual**.

---

## 7. Métricas canónicas (alineadas Bow-tie)

ASaaS Efeonce se mide con las 6 métricas Bow-tie §9 + 3 métricas operativas de delivery:

| Métrica | Tipo | Target Efeonce 2026 | Por qué importa |
|---|---|---|---|
| **NRR** (Net Revenue Retention) | reina | > 110% | Mide si los clientes existentes crecen contigo |
| **GRR** (Gross Revenue Retention) | retención pura | > 90% | Mide si los clientes se quedan |
| **Expansion Rate** | crecimiento orgánico | > 15% trimestral | Mide la palanca de expansión |
| **Logo Retention** | conteo de cuentas | > 95% | Complemento al NRR (peso por logo) |
| **Time-to-Expansion** | velocidad | < 180 días | Velocidad de detection de oportunidades |
| **Renewal Rate on MSA** | retención contractual | > 90% | Specific a Active Accounts |
| **Member Utilization Rate** | operativa | 65-75% billable | Eficiencia del talento |
| **Project Margin** | operativa | > 30% | Sanity de Project Customers |
| **CAC Payback** | sales efficiency | < 12 meses Active, < 6 Self-Serve | Eficiencia del comercial |

Las 6 primeras se computan en `greenhouse_serving.bowtie_metrics_monthly` (TASK-833). Las 3 operativas vienen de las VIEWs canónicas existentes (Member Loaded Cost, Commercial Cost Attribution).

---

## 8. Implicaciones operativas ASaaS

ASaaS no es solo pricing + métricas. Es una forma de operar que tiene consecuencias en cada función:

### 8.1 Comercial

- Discovery profundo (MEDDPICC) — no aceptar deals sin economic buyer y paper process claros
- Pitch es cualitativo + cuantitativo (case studies + data + economía proyectada)
- Pricing transparente con margin breakdown post-MSA-firma
- Cierre con deal architecture (multi-year, ramps, opt-outs) en lugar de descuento

### 8.2 Delivery

- Cada miembro asignado a un cliente con FTE explícito + fecha fin
- Output trackable en Greenhouse portal (sprints, tasks, ICO metrics)
- QBR no es show-and-tell; es revisión económica + estratégica
- Member loaded cost transparente para decisiones de allocation

### 8.3 Finance

- Revenue recognition ASC 606 / IFRS 15 para servicios + SaaS combinados
- Margin tracking per servicio + per cliente + per miembro (cost attribution V2)
- Provisioning forecasting basado en MSAs activos + pipeline Renewal
- Treasury con FX awareness para clientes Globe LATAM/internacional

### 8.4 Producto (Kortex / Verk / Greenhouse)

- Cada producto debe servir a una de las 3 audiencias (cliente Active, Self-Serve, internal)
- Roadmap balanceado entre los 3 (no solo internal, no solo Self-Serve)
- API + integration first (los 4 productos componen el ASaaS)

### 8.5 Identity / Access

- Acceso cliente al portal Greenhouse es parte del producto (no extra)
- Capabilities granulares per cliente per módulo (TASK-822..829 Client Portal V1)
- Audit trail completo (un Active Account puede pedir ver "qué tocaste y cuándo")

### 8.6 Data

- Bow-tie metrics computadas Greenhouse-side, proyectadas a HubSpot
- Cada deal tiene `deal_type` que dispara classification correcta del client_kind
- Reliability signals end-to-end (drift HubSpot, dead_letter cascade, NRR below target)

---

## 9. ICP — quién es el cliente ASaaS Efeonce

### 9.1 Globe Active Account ICP (target principal hoy)

- **Geografía**: LATAM principal (Chile, México, Colombia, Perú, Argentina, Brasil) + spots internacionales (US, Europa)
- **Vertical**: enterprise marketing teams en aviación, banking, retail, telco, manufacturing, services
- **Tamaño empresa**: > $100M revenue (B2C grandes) o >$500M (B2B grandes)
- **Tamaño team marketing del cliente**: 10+ FTEs internos
- **Decisores típicos**: CMO, VP Marketing, Head of Brand, Director Performance Marketing, Director Digital
- **Pain points alineados a oferta**:
  - Equipos in-house saturados
  - Calidad inconsistente entre vendors actuales
  - Falta de data unificada cross-canal
  - Procurement quiere medir outcomes, no entregables
  - Quieren tech enablement sin vendor lock-in
- **Anti-pattern (NO ICP)**:
  - Empresas que buscan agencia barata (cualquier modelo)
  - Empresas que no aceptan transparencia operativa
  - Empresas con culture procurement-first (todo bid, todo descuento)
  - SMBs con < 10 FTE marketing (no fit para Active; fit potencial Self-Serve)

### 9.2 Self-Serve ICP (Kortex / Verk standalone)

- Founders, ops leaders, growth teams en startups + scaleups
- Geographic-agnostic (PLG global)
- Decisión individual o equipo pequeño
- Buy via website, free trial, self-serve

### 9.3 Project ICP

- Variable, generalmente clientes que conoce el equipo o vienen de referidos
- Trabajos específicos con TTL claro
- Pueden converter a Active si el primer SOW va bien

---

## 10. Las 5 doctrinas operativas ASaaS

Resumen accionable de las decisiones que diferencian ASaaS de "agencia con software":

### Doctrina 1: Productización rigurosa

Ningún servicio sale a vender sin: scope canónico, output medible, unidad económica clara, ETA, owner role, dependencies, exit criteria. Si el equipo no puede articular esos 7 elementos, el servicio no es ASaaS — es time-and-materials con lipstick.

### Doctrina 2: Telemetría de delivery siempre

Todo trabajo entregado a Active Accounts tiene observabilidad en Greenhouse portal. El cliente ve sprints, tasks, ICO metrics, evidencia. La opacidad operativa erosiona trust y bloquea expansion. Telemetría no es opcional.

### Doctrina 3: Net Revenue Retention es la métrica reina

Sobre todas las métricas comerciales — más que ARR nuevo, más que pipeline cubrir, más que win rate. NRR > 110% es el norte. Los comp plans, los QBRs, las decisiones de inversión miran a esta primero.

### Doctrina 4: Software es leverage, no decoración

Kortex, Verk y Greenhouse no son "demos para impresionar al cliente". Son operación real. Si el cliente Active no usa ninguno en su día a día post-onboarding, el modelo se rompe — quedamos siendo "agencia tradicional con un dashboard que nadie abre".

### Doctrina 5: Margin transparency con clientes maduros

Active Accounts > 12 meses con NRR > 100% reciben transparencia razonada de su economía con Efeonce. Esto es contraintuitivo. Funciona porque crea co-ownership de la cuenta y previene la conversación adversarial annual de renewal.

---

## 11. Roadmap del modelo (V1.0 → V2.0)

### V1.0 — donde estamos hoy (2026-Q2)

- 3 productos en producción (Greenhouse portal, Kortex, Verk en distintos grados de madurez)
- Active Accounts identificados (Sky, ANAM, Aguas, otros)
- Bow-tie spec adoptado, en proceso de implementación (TASK-830..834)
- Operational case lifecycle Greenhouse-side (TASK-816..821)
- ICP Globe enterprise marketing teams formalizado (este doc §9)
- Loaded Cost Model y Commercial Cost Attribution V2 en producción

Gaps V1.0:
- Sync Greenhouse → HubSpot incompleto (TASK-831)
- NRR/GRR no computados todavía (TASK-833)
- Dashboards Bow-tie no implementados (TASK-834)
- Self-Serve motion (Kortex/Verk) madura informal, no formalizado en pricing tiers

### V1.1 — próximo trimestre (2026-Q3)

- TASK-830..834 completas → sistema de medición Bow-tie operativo
- Pricing tiers Kortex y Verk formalizados con good/better/best
- Comp plans alineados a NRR como métrica reina
- 3 dashboards Bow-tie en producción (Revenue Health, Expansion Engine, At Risk Accounts)

### V2.0 — 2027

- Self-Serve motion automated end-to-end (trial → paid → expansion)
- Partner / channel program (resellers, SI partners)
- Marketplace presence (HubSpot App, Vercel partner network, etc.)
- LATAM expansion formal (oficinas o partner local en MX, CO, BR mínimo)
- ASaaS playbook documentado para potential acquisitions o joint ventures

---

## 12. Hard rules (anti-regresión doctrinal)

- **NUNCA** vender un retainer sin scope canónico documentado + telemetría + revisión trimestral.
- **NUNCA** firmar SOW sin loaded cost actualizado + project margin proyectado.
- **NUNCA** descontar sin obtener concesión recíproca documentada.
- **NUNCA** cobrar pilot/discovery sin entry criteria de conversión.
- **NUNCA** posicionar los 4 productos a la vez en pitch — uno como eje, otros como leverage.
- **NUNCA** llamar "ASaaS" a un servicio sin productización rigurosa + telemetría + economía unitaria.
- **NUNCA** tratar `client_kind` como label estático — es dimensión time-versioned y refleja contractual state actual.
- **NUNCA** ocultar margin breakdown a un Active Account > 12 meses NRR > 100%.
- **SIEMPRE** medir el motion comercial con NRR como north star.
- **SIEMPRE** que un cliente migre de tipo (Active → Project, Project → Active, Self-Serve → Active), preservar lineage en `client_kind_history`.
- **SIEMPRE** que el equipo cite "ASaaS" en propuesta o materials externos, anclar a este documento.

---

## 13. Glosario

| Término | Definición |
|---|---|
| **ASaaS** | Agency-as-a-Service — operación agencia con productización + telemetría + economía SaaS |
| **Active Account** | Cliente Efeonce con MSA + SOWs activos. Stage 8 Bow-tie |
| **Self-Serve Customer** | Cliente Efeonce con solo SaaS subscription. Stage 9 Bow-tie |
| **Project Customer** | Cliente Efeonce con SOW puntual sin MSA. Stage 10 Bow-tie |
| **NRR** | Net Revenue Retention — métrica reina (Bow-tie §9.1) |
| **MSA** | Master Service Agreement — contrato master Active Accounts |
| **SOW** | Statement of Work — contrato proyecto puntual o entry de Active |
| **Globe clients** | Enterprise marketing teams (airlines, banking, retail, etc.) — ICP principal |
| **Loaded Cost** | Costo total de un miembro asignado (salary + benefits + tools + overhead allocation) |
| **Bow-tie** | Modelo arquitectónico canónico Winning by Design adaptado por Efeonce |
| **Productización** | Definir un servicio con scope, output, economía clara — el opuesto de time-and-materials |
| **Telemetría de delivery** | Observabilidad operativa del trabajo entregado al cliente vía software propio |

---

## 14. Referencias

- `spec/Arquitectura_BowTie_Efeonce_v1_1.md` — fuente canónica del modelo comercial
- `docs/architecture/GREENHOUSE_BOWTIE_OPERATIONAL_BRIDGE_V1.md` — contrato puente Bow-tie ↔ Greenhouse
- `docs/architecture/GREENHOUSE_CLIENT_LIFECYCLE_V1.md` — operational case lifecycle
- `docs/architecture/GREENHOUSE_360_OBJECT_MODEL_V1.md` — modelo canónico de identidad
- `docs/architecture/GREENHOUSE_MEMBER_LOADED_COST_MODEL_V1.md` — loaded cost canon
- Winning by Design — Jacco van der Kooij, *Bow-tie Funnel & Revenue Architecture* (2020-2024)
- Patrick Campbell — *Pricing Strategy for SaaS* (ProfitWell, recurring research)
- Madhavan Ramanujam — *Monetizing Innovation* (Wiley, 2016)
- David Skok — *SaaS Metrics 2.0* (For Entrepreneurs, ongoing)
- Matthew Dixon, Brent Adamson — *The Challenger Sale* (Portfolio, 2011)
- Matthew Dixon, Ted McKenna — *The JOLT Effect* (Portfolio, 2022)
- Christensen, Hall, Dillon, Duncan — *Competing Against Luck* (JTBD, HarperBusiness, 2016)
- Geoffrey Moore — *Crossing the Chasm* (HarperBusiness, 1991, ed. revisada 2014)
