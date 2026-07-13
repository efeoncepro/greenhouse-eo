---
name: seo-aeo-practice
description: >-
  Operador comercial de la práctica SEO/AEO de Efeonce: cómo se VENDE, se
  PRICEA, se descalifica, se prospecta y se retiene el servicio de visibilidad
  (SEO + AEO/GEO). NO es la skill del oficio — el oficio es `seo-aeo`. Cubre:
  arquitectura de precios y política de margen (con el cotizador real de
  Greenhouse), el piso de negociación, descuentos, FX multi-moneda, la cuña del
  AI Visibility Grader como motor de venta, descalificación honesta,
  displacement (freelancer / in-house / la herramienta / no hacer nada),
  canales y prospección, outbound/inbound, la conversación de venta, el retainer
  que sobrevive, y el estado real de la práctica (Berel, SKY, cero casos
  citables). Triggers: "vender SEO", "vender AEO", "precio de SEO", "cuánto
  cobramos", "retainer", "margen", "piso", "cotizar SEO", "propuesta de SEO",
  "descuento", "prospección SEO", "outbound de SEO", "canales para vender SEO",
  "objeción SEO", "el cliente dice que es caro", "competimos con un freelancer",
  "AI Visibility Grader como venta", "licitación de contenido".
---

# SEO/AEO Practice — el negocio, no el oficio

Esta skill opera **el negocio de vender SEO/AEO**. No enseña a hacer SEO.

- ¿*"Cómo hago citable esta página / qué schema uso / cómo audito el sitio"*? → **`seo-aeo`** (el oficio).
- ¿*"Cómo lo vendo, a cuánto, a quién, y cuándo me levanto de la mesa"*? → **acá**.

---

## 0. La tesis — en una categoría de humo, la honestidad es el producto

**Vender SEO no se parece a vender HubSpot. Se parece a lo contrario.**

| | HubSpot | **SEO / AEO** |
|---|---|---|
| Qué vendes | El producto **de otro** | **El tuyo** |
| El estado del comprador | *"¿me sirve a mí?"* — **duda de encaje** | 🔴 *"¿eres un estafador?"* — **duda de honestidad** |
| Dónde se gana | Calificando bien | 🎯 **Ganándote el derecho a ser escuchado** |

**El 100% de tus prospectos ya compró SEO y tiene una cicatriz.** Le prometieron primera página, le mostraron
rankings de keywords que nadie busca, y el revenue no se movió. **No duda del servicio: duda de ti.**

Eso invierte la venta. La secuencia que gana:

```
1. Le REGALAS el diagnóstico (el Grader)      ← evidencia antes que promesa
2. Le dices para qué NO le sirve               ← descalificación honesta
3. Le muestras el piso y el techo, con supuestos ← un precio con método, no un número
4. Recién ahí, la oferta
```

🎯 **Es la misma mecánica del waiver de HubSpot: le entregas la evidencia antes de pedirle plata.**
En una categoría con déficit de confianza, **eso no es un imán de leads: es el motor de venta entero.**

---

## 1. Las cuatro verdades que ordenan todo

**(a) 🔴 La métrica de valor de hoy se está deflacionando.** Priceamos por **artículo/mes**. Es exactamente
la cosa cuyo costo la IA está desplomando. **Si le enseñas al cliente que compra artículos, tu precio cae con
el costo del artículo.** → `modules/04_PRICING.md` § 2.

**(b) 🔴 La medición no se va a cero: ya tiene precio público, y es bajo.** ✅ *verificado 2026-07-13*
Semrush regala un **AI Search Visibility Checker gratis**; su **AI Visibility Toolkit cuesta USD 99/mes**;
Ahrefs Brand Radar, **USD 199-828/mes**; HubSpot la metió **gratis dentro de Marketing Hub** (PDR-006 §5).
🔴 **Tu cliente puede cotizar la medición.** Y el día que lo haga: *"¿me cobras por lo que Semrush me da por 99
dólares?"*

🎯 **Y el mismo dato trae la respuesta:** la **herramienta** que mide vale USD 99-828/mes; **el servicio de AEO
que el mercado vende, USD 900+/mes.** ✅

> ## El margen no está en el medidor. Está en el criterio.
> **Nadie paga 900 dólares por un número. Pagan por saber qué hacer con él.**

**El movimiento es de "medimos" a "movemos"** — y de *"te medimos"* a
🎯 **"puedes ver lo que hacemos sin tener que confiar en nosotros"** *(que es otra cosa, y no se comoditiza:
es **transparencia como producto**, y en una categoría con déficit de confianza, es el moat)*.

**(c) 🔴 La atribución de AEO a revenue NO existe.** ✅ *verificado*: los estudios de conversión de tráfico LLM
**van de +900% a −13% — se contradicen en el signo**, y el tráfico de IA es **el 1,08% del total**.
**Quien te dé un ROI de AEO te lo está inventando.** 🎯 **Decirlo en voz alta es el activo.**

🎯 **Pero SÍ existe un puente honesto, y casi nadie lo usa:** las marcas **citadas** en AI Overviews reciben
**+35% de clics orgánicos** y **+91% de clics pagados** ✅ — **y eso se mide en el GA4 y la cuenta de Ads DEL
CLIENTE, no en un dashboard nuestro.**

> ## La citación no es un canal nuevo. Es la condición para seguir existiendo en el viejo.
> **El AEO no se vende como canal: se vende como eficiencia de medios.** *(Y eso hace entrar al CFO.)*
> → `modules/01_MERCADO_2026.md` · `modules/08_PRUEBA.md`

**(d) 🎯 Tenemos un activo que casi nadie tiene: el AI Visibility Grader, funcionando, en producción.**
Y **ya se usa en la venta**. Pero por (b), **su valor tiene que migrar de dar un *score* a dar una
*prescripción con delta esperado***. Un número no vende. *"Estás invisible en 4 de 7 motores, esto es lo que lo
mueve, y este es el orden"* sí.

---

## 2. Reglas duras — NUNCA

**Precio**

1. 🔴 **NUNCA cotices sin pasar por el cotizador.** El motor existe
   (`src/lib/finance/pricing/pricing-engine-v2.ts`, cost-plus, Full API Parity). **Un precio sin loaded cost
   detrás no es un precio: es una corazonada con decimales.**
2. 🔴 **NUNCA publiques un precio unitario por artículo.** 🎯 **Es entregarle al cliente la calculadora para
   comoditizarte.** *(Ya lo hicimos: la oferta de SKY dice "artículo adicional CLP 260.000" — y ahora SKY puede
   dividir cualquier propuesta futura por ese número.)*
3. 🔴 **NUNCA el ad-hoc más barato que el marginal del plan.** Rompe la planificación y consume coordinación:
   **tiene que costar MÁS, no menos.** *(Hoy hacemos lo contrario y premiamos salirse del plan.)*
4. 🔴 **NUNCA descuentes la línea de plataforma.** Costo marginal ≈ 0 **y es lo único que un freelancer no
   puede tener.** Descontarla es regalar margen puro **y devaluar tu único diferenciador.**
   **Descuenta horas. Nunca la plataforma.**
5. 🔴 **NUNCA cierres bajo el 45% de margen bruto.** **Piso aprobado por el dueño el 2026-07-13.**
   **No es una guía: es la regla.** El piso se **computa**, no se siente. → `modules/04_PRICING.md` § 4.
6. 🔴 **NUNCA pricing por performance** *(pago por ranking/tráfico/lead)* sin leer § 9 del módulo de pricing.
   **Es una trampa** — y en AEO, además, **no hay atribución que la sostenga.**
7. 🔴 **NUNCA "todo incluido… etc".** Un alcance sin borde es cómo mueren las agencias: las expectativas se
   expanden, las horas se expanden, el margen se evapora — **y churnean igual al mes 9.**

**Verdad**

8. 🔴 **NUNCA prometas rankings.** Ni posiciones, ni "primera página". **Es la promesa que rompió la confianza
   de la categoría** — y la que va a hacer que te comparen con el que te precedió.
9. 🔴 **NUNCA atribuyas revenue a citación en IA.** No existe el modelo. **Decirlo en voz alta es el activo.**
10. 🔴 **NUNCA inventes un caso.** **Hoy tenemos CERO casos de SEO/AEO citables** (métrica verificable +
    relación sana + autorización). → `efeonce/ESTADO_ACTUAL.md`. **Con cero casos, el precio y el Grader hacen
    el trabajo de la prueba — y por eso tienen que estar impecables.**

**Fronteras**

11. 🔴 **NUNCA reinventes el método de venta** (`commercial-expert`) ni el motion GTM (`gtm-architect`).
    Esta skill aporta el **dominio**, no el **método**.
12. 🔴 **NUNCA reimplementes el oficio** (`seo-aeo`). Acá se vende; allá se hace.

---

## 3. Router de módulos — **todos escritos** ✅

| Cuándo | Módulo |
|---|---|
| 🔴 **El mercado 2026** — el argumento de urgencia, con evidencia *(−58% CTR · −68% paid · +35%/+91% si te citan · el 1% de tráfico LLM y por qué el ROI de AEO es humo)* | **`modules/01_MERCADO_2026.md`** |
| **El comprador y su cicatriz** — ICP, comité, **las 6 objeciones que matan el deal** | **`modules/02_COMPRADOR.md`** |
| **La oferta** — el reframe *(vendes visibilidad, entras por SEO)*, las 4 capas, qué está mal empaquetado | **`modules/03_OFERTA.md`** |
| 🎯 **Precio, margen, piso, descuentos, FX, cuándo levantarte de la mesa** | **`modules/04_PRICING.md`** |
| 🎯 **La cuña: el Grader** — el motor de venta, y su migración de *score* a *prescripción* | **`modules/05_CUNA_GRADER.md`** |
| 🔴 **Descalificación** — los 8 casos en que NO vendemos | **`modules/06_DESCALIFICACION.md`** |
| **Displacement** — el freelancer · la herramienta · el in-house · la agencia titular · **no hacer nada** | **`modules/07_DISPLACEMENT.md`** |
| 🎯 **Prueba sin mentir** — el puente de atribución que SÍ existe | **`modules/08_PRUEBA.md`** |
| **Canales, prospección y outbound** — de dónde salen los deals | **`modules/09_CANALES_OUTBOUND.md`** |
| **La conversación** — discovery *(las 9 preguntas)*, propuesta, negociación, QBR | **`modules/10_CONVERSACION.md`** |
| **El retainer que sobrevive** — por qué la mayoría muere al mes 9 | **`modules/11_RETENCION.md`** |
| 🔴 **El estado real de la práctica** — Berel, SKY, el Grader, **cero casos citables** | **`efeonce/ESTADO_ACTUAL.md`** |
| **Qué se puede afirmar y con qué evidencia** *(+ § Datos que NO se citan)* | **`SOURCES.md`** |

| 🔴 **Lo que NUNCA se hace** *(+ los bugs vivos de Efeonce marcados 🩸)* | **`ANTIPATTERNS.md`** |
| **El vocabulario de la práctica** *(loaded cost, piso, la cuña, la cicatriz, el puente…)* | **`GLOSSARY.md`** |

**Artefactos listos:** `templates/calculadora-piso.md` · `templates/secuencia-outbound.md` ·
`templates/guion-reunion-grader.md`

🔴 **Carga solo el módulo que la tarea necesita.** `SOURCES.md` se carga **siempre** que vayas a citar un número.

---

## 4. Contrato de sinergias — quién manda en qué

| Skill | Quién manda | Contrato |
|---|---|---|
| **`seo-aeo`** | **El oficio.** | Auditar, schema, citabilidad, topical authority, medición técnica. Esta skill lo **vende**; no lo reimplementa. Su overlay ya tiene `efeonce/AI_VISIBILITY_GRADER.md`. |
| **`commercial-expert`** | **El método de venta.** | Discovery (MEDDPICC), JOLT, Challenger, negociación, forecast. Esta skill pone el **dominio SEO/AEO** encima. |
| **`greenhouse-finance-accounting-operator`** | **La economía.** | **Loaded cost, margen real, overhead, el cotizador.** 🔴 **El piso sale de acá, no de la intuición.** |
| **`gtm-architect`** | **El motion.** | Si la práctica necesita cambiar de motion (PLG, partner-led, ABM). |
| **`content-marketing-studio`** + **`digital-marketing`** | **El canal y el contenido.** | Los assets de captura y la distribución. |
| **`research-benchmark-operator`** + `/deep-research` | **La evidencia.** | Todo refresh de `SOURCES.md`. **Esta skill no guarda hechos de memoria.** |
| **`greenhouse-public-private-tenders`** | **Si entra por licitación.** | El caso SKY vive ahí (`docs/commercial/tenders/sky-blog-2026/`). |
| **`deck-studio`** | **El deck.** | La propuesta se compone ahí. Esta skill es *consumer*. |
| **`greenhouse-ico`** | **La prueba operativa.** | El portal + ICO son **la línea de plataforma**, y son **transparencia como producto**. |

---

## 5. Antes de responder cualquier cosa

1. ¿Vas a decir un precio? → **cotizador primero.** `modules/04_PRICING.md`.
2. ¿Vas a prometer un resultado? → **regla dura 8 y 9.** No hay rankings, no hay atribución de IA.
3. ¿Vas a citar un caso? → **`efeonce/ESTADO_ACTUAL.md`. Hoy tenemos cero.**
4. ¿Vas a citar un dato de mercado (CTR, zero-click, tráfico de IA)? → **`SOURCES.md`, y si no está: verifícalo.**
   **Es el dominio más volátil que existe.**
5. ¿Es una decisión de método de venta genérica? → **es de `commercial-expert`**, no de acá.
