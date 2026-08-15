# 04 · Pricing — la política que falta

> **Estado, dicho sin adornos (operador, 2026-07-13):** *"actualmente no tenemos una metodología o método para
> fijar precios; tampoco lo del margen"*.
>
> 🎯 **Eso es cierto a medias — y la mitad que es falsa es la buena noticia.**

---

## 🔴 Corrección 2026-08-15 — el alcance de Berel estaba mal, y la acción #4 de este módulo estaba invertida

> **Qué decía este módulo hasta hoy:** que el alcance de Berel era *"medición + el portal + creación de contenido
> \+ posteo + SEO técnico si necesitasen"* **citando al operador (2026-07-13)**, y que la acción de mayor plata era
> **desagregar el AEO a USD 900/mes (+30% de revenue)**.
>
> ## 🔴 El AEO de Berel está contratado, entregable y pagado — con descuento — desde febrero de 2026.

**El expediente de la licitación** *(OneDrive `4. Comercial/Licitaciones/Pinturas Berel/1. SEO/Listo/`)*:

| Fuente | Qué prueba |
|---|---|
| **`Alcance del Servicio.pdf`** *(feb-2026)* | Título: **"SEO + AEO + Producción de Contenido Editorial y Visual"**. Tres escenarios y **AEO en los tres** *(básico → completo → completo + PR)* |
| **`Presupuesto Detallado Abril.pdf`** | *"Pinturas Berel ha seleccionado el **Escenario Crecimiento**"* — lista **MXN 60.000/mes**, mínimo 6 meses, on-going, MXN, notice 30 días, **herramientas incluidas** |
| **Su §3 — AEO** | AEO avanzado en cada pieza · **Digital PR 5-10 menciones/mes** · **monitoreo en ChatGPT, Perplexity, Google AI Overviews y Gemini** · **KPI 15-25 AI citations/mes** |
| **El brief del cliente en wherEX** | Pedía **sólo "SEO + Blog"** — 🎯 **el AEO lo introdujo Efeonce como diferenciador y Berel lo compró** |
| **El runtime** | `migrations/20260628103818271_task-1277-aeo-module-seed-revert-grant.sql:44-58` → `ai_visibility_v1`, **`aeo_tier: 'contracted'`** |
| **Se lo declaramos a un tercero** | `docs/commercial/tenders/sky-blog-2026/oferta-tecnica.md:656-658` |

### Lo que cambia en este módulo

| # | Antes | 🔴 Ahora |
|---|---|---|
| **Alcance** | *"medición + portal + contenido + posteo + SEO técnico si necesitasen"* **(memoria)** | ✅ **Escenario Crecimiento completo: 12 art/mes (3 pillar + 9 satélite) + Serie Laboratorio + AEO completo + Entity SEO + Digital PR + link building + reporting quincenal** |
| **Fee** | *"52.000 MXN/mes"* sin trazabilidad | ✅ **MXN 52.000 confirmado — pero es lista 60.000 − 13,3% de descuento** |
| **El riesgo** | *"regalamos el AEO, hay +30% en la mesa"* | 🔴 **El AEO está pagado. El riesgo es under-delivery contra un KPI contratado** *(15-25 citations/mes; el grader lleva sin correr desde el **2026-07-17**)* |
| **El instrumento** | *"desagregar el AEO"* | ⚠️ **Retirar el descuento de entrada en la renovación** — o ampliar alcance con adenda. **Ver § 12** |
| **Acción #4** | 🔴 Retirada | Reemplazada — **ver § 12** |

> ## 🔴 Regla de práctica — invariante
> **Ningún análisis de pricing de un cliente adjudicado se hace contra la memoria del operador.**
> **Se hace contra el expediente de la licitación más la facturación real.**
>
> 🎯 **Aplica antes que el checklist de § 11:** si el cliente está adjudicado y no abriste su expediente,
> **no empieces el análisis.** *(El de Berel estaba en OneDrive todo el tiempo. Costó un mes y una acción
> comercial que nos habría hecho quedar mal frente al cliente.)*

---

## 0. No falta el motor. Falta la política.

Greenhouse **tiene** un motor de pricing cost-plus completo, gobernado y con Full API Parity:

| Pieza | Path |
|---|---|
| El motor | `src/lib/finance/pricing/pricing-engine-v2.ts` → `buildPricingEngineOutputV2()` |
| La fórmula | `precio = costo / (1 − margen)` (`applyMarginFormula`) |
| Simulación (audiencias internal/client/**public**) | `src/lib/finance/pricing/simulate-quote-pricing.ts` |
| Márgenes por tier | `greenhouse_commercial.role_tier_margins` · `service_tier_margins` |
| Multiplicador por modelo comercial | `commercial_model_multipliers` |
| Factor por país | `country_pricing_factors` |
| Loaded cost real | `src/lib/commercial-cost-basis/**` (nómina real, snapshots de proveedores) |
| Consumers | Portal · **Nexa** (`quote_price`) · **MCP** · API Platform |

**Y se usó exactamente una vez: en el squad blueprint de SKY.**
De ahí salieron los únicos tres números honestos de la práctica: `loaded 2,26M → precio 5,2M → piso 3,9M`.

> ## El motor calcula. Alguien tiene que decidir el margen.
> **Ese "alguien" no es el software. Es el dueño. Y esta política es esa decisión.**

🔴 **Consecuencia operativa inmediata:** *"no tenemos método"* **deja de ser una excusa válida el día que esta
página existe.** Lo que falta es **disciplina**, no herramienta.

---

## 1. El diagnóstico: dos clientes, dos mundos

**FX as-of 2026-07-13** *(reverificar antes de cotizar — ver `SOURCES.md`)*: **USD/MXN 17,54** · **USD/CLP ~930**.

| | **Berel** (MX) | **SKY** (CL, licitación) |
|---|---|---|
| Precio | **52.000 MXN/mes** — ⚠️ **lista 60.000 − 13,3% de descuento** | **5.200.000 CLP/mes** *(plan base, 8 artículos)* |
| **En USD** | **≈ 2.965** *(lista: ≈ 3.421)* | **≈ 5.591** |
| **En CLP** | **≈ 2.760.000** | 5.200.000 |
| **Alcance real** *(expediente)* | 🔴 **12 art/mes + Serie Laboratorio + AEO completo + Entity SEO + Digital PR + link building + reporting quincenal** | 8 artículos + SEO/AEO + multimedia + reportería + portal |
| **Loaded cost** | 🔴 **DESCONOCIDO** | **2.260.000** *(2,2 FTE, blueprint)* |
| **Piso** | 🔴 **NO EXISTE** | **3.900.000** |
| **Margen bruto** | 🔴 **NO SABEMOS** | **56%** *(42% en el piso)* |
| Cómo nació el precio | **Pasó** *(lista razonada, descuento no modelado)* | **Se ingenió** |

🔴 **Berel, convertido a CLP (2,76M), está POR DEBAJO del piso de negociación de SKY (3,9M) — y apenas 22% por
encima de su costo cargado.**

> ### 🔴 Delta 2026-08-15 — la salida de emergencia se cerró
> **Este párrafo decía: *"puede estar perfectamente bien: el alcance de Berel podría ser más chico".***
> **Ya no.** El expediente dice que el alcance es **Escenario Crecimiento: 12 artículos/mes** *(3 pillar + 9
> satélite)* + Serie Laboratorio + Digital PR + link building + reporting quincenal + 4 superficies.
> 🔴 **Es MÁS grande que el plan base de SKY, no más chico.** Y se entrega **al 87% del precio de lista.**
>
> **Y no saberlo sigue siendo el hallazgo — pero ahora sabemos hacia qué lado se inclina.**

### 🔴 La tabla que hay que mirar hasta que duela

*(Loaded cost del pod SKY = CLP 2.260.000 / 2,2 FTE = **CLP 1.027.000 ≈ USD 1.105 por FTE-mes**.)*
**¿Cuántos FTE consume Berel a USD 2.965/mes?**

| FTE en Berel | Loaded cost (USD) | **Margen bruto** | Veredicto |
|---|---|---|---|
| 1,0 | 1.105 | **63%** | ✅ Muy sano |
| **1,2** | 1.326 | **55%** | ✅ **Target** |
| 1,5 | 1.658 | **44%** | ⚠️ **Al filo del piso** |
| 1,8 | 1.989 | **33%** | 🔴 Después de overhead, ~cero |
| **2,2** *(el mismo pod que SKY)* | 2.430 | 🔴 **18%** | 🔴🔴 **Perdemos plata todos los meses** |

> 🔴 **Corregido 2026-08-15.** Este párrafo decía: *"el operador describió el alcance de Berel como 'medición +
> el portal + creación de contenido + posteo + SEO técnico si necesitasen'. Eso se parece bastante al pod de SKY."*
>
> **El expediente dice otra cosa: es el Escenario Crecimiento — 12 artículos/mes (3 pillar + 9 satélite), Serie
> Laboratorio con datos de I+D, AEO completo, Entity SEO, Digital PR, link building y reporting quincenal.**
>
> ## 🔴 No "se parece" al pod de SKY: es MÁS que el plan base de SKY (8 artículos).
> **Lee esta tabla desde ABAJO hacia arriba.** Las filas de 1,0 y 1,2 FTE describen un pod que **no puede producir
> 12 piezas al mes con Digital PR y reporting quincenal**. 🔴 **Las filas realistas son 1,8 y 2,2 — es decir, 33%
> y 18% de margen.** *(Y peor: esos márgenes están calculados sobre USD 2.965, que ya es **13,3% bajo el precio
> de lista** con el que se dimensionó el escenario.)*
>
> ⚠️ **Sigue siendo una hipótesis hasta que el blueprint la confirme.** Pero la carga de la prueba se dio vuelta:
> **antes había que demostrar que Berel estaba mal; ahora hay que demostrar que está bien.**

🔴 **Acción #1 de esta política, y es urgente: correr el squad blueprint de Berel y saber en qué fila estamos.**
*(Un cliente que factura puntual todos los meses y te destruye el margen **no se ve en el banco: se ve en el
agotamiento del equipo y en un año sin utilidad.**)*

---

## 1.5 El precio de mercado — el número que nunca miramos

**Verificado 2026-07-13** (fuentes al pie). ✅ **Dato primario.**

| | **El mercado** | **Nosotros** |
|---|---|---|
| **Retainer promedio de SEO** | **USD 3.209/mes** *(encuesta Ahrefs, 439 profesionales)* · **USD 3.199** *(Clutch)* | — |
| **Tramo más común** *(48% de las agencias)* | USD 1.500 – 5.000 | — |
| Cobran > USD 5.000/mes | **solo el 5,5%** de las agencias | — |
| **Small business** | USD 2.500 – 5.000 | — |
| 🔴 **Mid-market** | **USD 5.000 – 10.000** | 🔴 **Berel: USD 2.965** |
| 🔴 **Enterprise** | **USD 10.000 – 50.000+** | 🔴 **SKY: USD 5.591** |
| 🎯 **AEO/GEO** | **se cobra APARTE, desde USD 900/mes** *(el 37% de las agencias que subieron precio en 2025-26 lo hizo por esto)* | ⚠️ **Nosotros lo vendemos ADENTRO del retainer — y en Berel está contratado y pagado, no regalado** *(corregido 2026-08-15)* |

### 🔴 Lo que dice esta tabla

**Berel** es **Grupo Berel** — un fabricante industrial mexicano grande. **SKY** es **una aerolínea nacional.**
**Ninguno de los dos es una PyME local sensible al precio.** Y sin embargo:

- **Berel paga por debajo del promedio global de un retainer de SEO** *(USD 2.965 vs 3.209)* —
  siendo, por tamaño, **mid-market: un tramo donde el mercado cobra USD 5.000-10.000.**
- **SKY**, una aerolínea, **paga USD 5.591** — el piso del tramo *enterprise*, **donde el mercado cobra
  USD 10.000-50.000+.**

⚠️ **El benchmark es global/US. LATAM cobra menos, y eso es real.** Pero:

> 🎯 **No estamos baratos porque seamos de LATAM. Estamos baratos porque nunca miramos.**
> **En nuestros precios no hay un descuento LATAM deliberado — no hay ninguna referencia en absoluto.**
> El precio no se fijó bajo: **se fijó sin mirar nada.**
>
> **Y la brecha es tan grande que, incluso aplicando un descuento LATAM generoso del 35%, seguimos abajo.**

### 🔴 CORREGIDO 2026-08-15 — "el dinero sobre la mesa" no aplica a Berel

> **Esta sección decía que desagregar el AEO a USD 900/mes daba *"+30% de revenue en Berel, casi todo margen,
> porque el trabajo ya se hace"*.**
>
> ## 🔴 En Berel eso es falso, y decirlo en voz alta nos haría daño.
> **El AEO no "se hace" sin cobrarse: se vendió, se contrató y se está pagando** — con descuento incluido.
> Presentarle a Berel un cobro nuevo por algo que ya paga desde febrero **le informa que le cobramos mal.**

**Lo que sigue siendo cierto, y hay que conservarlo:**

| Afirmación | Estado |
|---|---|
| El 54,3% de las agencias subió precios en 2025-26; **el 37% lo hizo por GEO/AEO** | ✅ **Vigente** |
| **El mercado cobra el AEO aparte desde USD 900/mes** | ✅ **Vigente — y es referencia útil para PRICEAR CLIENTES NUEVOS** |
| *"Nosotros lo regalamos"* | 🔴 **FALSO para Berel.** En Berel está dentro del fee **por diseño de la oferta**, no por omisión |

🎯 **Cómo usar el benchmark correctamente:**

| Caso | Uso del USD 900+ |
|---|---|
| **Cliente nuevo** | ✅ **Anclar.** El AEO tiene precio de mercado propio — cotizarlo como capa con valor explícito, esté o no empaquetado |
| **SKY** *(licitación viva)* | ✅ **Válido como argumento de valor** — el AEO va dentro del retainer, pero **su precio de mercado justifica el nivel del retainer** |
| 🔴 **Berel** *(adjudicado, AEO contratado y pagado)* | 🔴 **NO.** No es revenue en la mesa. **La palanca es el descuento, no un cobro nuevo** — ver § 12 |

> 🔴 **La excepción que estamos pagando no es "regalar el AEO". Es entregar el Escenario Crecimiento completo
> al 87% del precio de lista sin haber medido el pod.** Eso es un problema de **margen y de disciplina de
> descuento**, no de empaquetado.

---

## 2. 🔴 El error de raíz: estamos priceando la cosa que la IA está abaratando

La métrica de valor de la oferta actual es **artículos por mes**.

```
SKY:  8 artículos → CLP 5,2M     (650.000 por artículo)
     12 artículos → CLP 6,9M     (575.000 por artículo)
     +1 ad-hoc   → CLP 260.000
```

**Tres problemas, y el tercero es letal:**

**(a) Se comoditiza.** Le enseñaste al cliente a dividir. Un freelancer cobra CLP 150.000 por artículo.
**Ahora te compara.** *(Y no puedes ganar esa comparación, porque él no tiene overhead, ni estrategia, ni
plataforma — y al cliente le cuesta ver la diferencia hasta el mes seis.)*

**(b) Se desacopla del resultado.** 8 artículos malos siguen siendo 8 artículos. **Cobras por producir, no por
mover.** Y cuando no se mueva, la conversación va a ser sobre la cantidad, no sobre la estrategia.

**(c) 🔴 Se está deflacionando, y rápido.** El costo de producir un artículo con IA cae cada trimestre.
**Si tu precio está anclado al artículo, tu precio cae con él.** No es una amenaza futura: **es la única
dirección posible.**

> ## Estamos cobrando por el input justo cuando el input se está volviendo gratis.

### Lo que sobrevive

| | ¿Sobrevive a la IA? | ¿Sobrevive a la comoditización? |
|---|---|---|
| **El artículo** | 🔴 No — el costo se desploma | 🔴 No — el freelancer lo hace |
| **La medición** | ⚠️ Sí | 🔴 **No — y ahora tiene precio público** *(ver abajo)* |
| 🎯 **El criterio** *(qué producir, para quién, en qué orden)* | ✅ **Sí** | ✅ Sí |
| 🎯 **La superficie cubierta** *(Google + IA + Reddit + YouTube · mercados · marcas)* | ✅ **Sí** | ✅ Sí |
| 🎯 **El sistema que lo prueba** *(portal + ICO)* | ✅ **Sí** | ✅ **Sí — y es lo único que un freelancer NO puede tener** |

### 🔴 Corrección de una tesis propia: la medición NO se va a cero. Es peor.

**La primera versión de este módulo decía *"la medición se va a cero"*. El dato lo afinó, y la versión real es
más incómoda:** ✅ *verificado 2026-07-13*

| La medición de visibilidad en IA | Precio |
|---|---|
| **Semrush — AI Search Visibility Checker** | 🔴 **GRATIS** |
| **Semrush — AI Visibility Toolkit** | **USD 99/mes** *(add-on)* |
| **Ahrefs — Brand Radar** | USD 199/plataforma · **USD 699** el bundle *(mínimo realista ~828/mes)* |
| **HubSpot** | **Gratis dentro de Marketing Hub** *(PDR-006 §5)* |

> 🔴 **No se va a cero: tiene un precio público, bajo y verificable — USD 99 a 828 al mes.**
> **Tu cliente puede cotizarla.** Y el día que lo haga, va a mirar tu retainer y va a preguntar:
> *"¿me estás cobrando por algo que Semrush me da por 99 dólares?"*
>
> 🎯 **Y ahora el otro lado del dato, que es la respuesta:**
>
> | | Precio |
> |---|---|
> | La **herramienta** que mide | USD 99 – 828/mes |
> | El **servicio** de AEO que el mercado vende | **USD 900+/mes** ✅ |
>
> ## El margen no está en el medidor. Está en el criterio.
> **Nadie paga 900 dólares por un número. Pagan por saber qué hacer con él.**

🔴 **Consecuencia dura para el Grader:** nuestro AI Visibility Grader **compite con el checker gratis de
Semrush en la dimensión "medir"**. Ahí no gana, y **no tiene por qué**.
🎯 **Tiene que ganar en la que Semrush no juega: la prescripción.** *"Estás invisible en 4 de 7 motores, esto
es lo que lo mueve, en este orden, y esto es lo que cuesta."*
**Un score es un commodity. Un plan, no.**

🔴 **Regla dura #2 (SKILL.md):** **NUNCA publiques un precio unitario por artículo.**
🎯 **El conteo de artículos vuelve, pero como *techo de capacidad declarada*, no como *unidad de valor*.**

```
❌ "8 artículos/mes = CLP 5,2M"
   → el cliente calcula 650k/artículo y te compara con un freelancer.

✅ "Operación de visibilidad de [marca] en [Google + motores de IA] para [CL] — CLP 5,2M/mes.
    Incluye una capacidad de producción de hasta 8 piezas/mes."
   → el artículo es un BORDE del alcance, no el precio de nada.
```

---

## 3. La arquitectura de precios (las cuatro capas)

🔴 **El problema del "todo incluido… etc" es que el "etc" no tiene borde — y el margen se va por ahí.**

| # | Capa | Modelo | Margen objetivo | Regla |
|---|---|---|---|---|
| **0** | 🎯 **Diagnóstico** *(el Grader)* | **GRATIS** | — | **Es la cuña, no un servicio.** Evidencia antes que promesa |
| **1** | **Fundación** *(SEO técnico, entidad, schema, arreglo de base)* | **Proyecto, precio fijo, one-time** | **55-60%** | **Tiene fin.** Nunca dentro del retainer: **es lo que hace que el retainer funcione, y si es "gratis" el cliente cree que no valía nada** |
| **2** | **Operación** *(el squad: estrategia, contenido, publicación, on-page)* | **Retainer por capacidad declarada** | **50-55%** | El techo de piezas es un **borde**, no un precio unitario |
| **3** | 🎯 **Plataforma** *(portal + medición + ICO)* | **Suscripción** | 🎯 **80%+** *(costo marginal ≈ 0)* | 🔴 **NUNCA se descuenta.** Es lo único que el freelancer no tiene |
| **4** | **Expansión** | Palanca | 55%+ | **+mercado · +idioma · +marca · +superficie** *(no "+artículos")* |

### 🎯 Por qué la capa 3 es el ancla, y no un accesorio

**La medición se va a cero** (HubSpot la regaló). **Pero el portal no vende medición: vende no tener que confiar
en nosotros.**

> **"Puedes ver, cualquier día, qué estamos haciendo, qué se publicó, qué se movió y qué no —
> sin pedirnos un reporte y sin creernos nada."**

🎯 **En una categoría donde el 100% de los compradores tiene una cicatriz, la transparencia no es una feature:
es el producto.** Y **no se comoditiza**, porque no es un dato — es un sistema que tienes y ellos no.

🔴 **Por eso, y esto es una regla y no una preferencia: se descuentan horas. NUNCA la plataforma.**
Descontarla es (a) regalar margen puro *(costo marginal cero)* y (b) **decirle al cliente que tu único
diferenciador no vale nada.**

---

## 4. El piso — se computa, no se siente

🔴 **El piso NO es "el precio más bajo que aceptaría".** Es un número que sale de una cuenta.

```
PISO = loaded cost del pod          ← del squad blueprint (nómina real, %dedicación)
     + overhead absorbido           ← full absorption (GREENHOUSE_MEMBER_LOADED_COST_MODEL_V1)
     + buffer de riesgo             ← penalidades, scope creep, comisión de plataforma
     ────────────────────────────
     ÷ (1 − margen mínimo)
```

### 🔴 Aplicado a SKY — y el piso declarado NO pasa la regla

**Loaded delivery: CLP 2.260.000/mes (2,2 FTE).**
**Las bases del tender reconocen un riesgo de penalidades del 10-15% + comisión Wherex.**

| Escenario | Costo | **PISO a 45%** | Si cerramos a **3,9M**, el margen real es… |
|---|---|---|---|
| **Sin buffer** | 2.260.000 | **CLP 4.110.000** | **42,1%** 🔴 |
| **Buffer 10%** | 2.486.000 | **CLP 4.520.000** | **36,3%** 🔴 |
| **Buffer 12%** | 2.531.200 | 🎯 **CLP 4.602.000** | **35,1%** 🔴 |
| **Buffer 15%** | 2.599.000 | **CLP 4.725.000** | **33,4%** 🔴🔴 |

> ## 🔴 El piso declarado (3,9M) da entre 33% y 42% de margen. La regla dice 45%.
> **Y el mercado dice que bajo 40% el delivery está roto.** ✅
>
> **El piso real de SKY no es 3,9M. Es ≈ CLP 4,6M.**

### 🔴 Y la consecuencia que hay que ver antes de negociar

| | |
|---|---|
| Precio de lista | **CLP 5.200.000** *(margen 56,5% ✅ — **el precio de lista está bien**)* |
| **Piso real** *(45% + buffer 12%)* | **CLP 4.602.000** |
| 🔴 **Margen de negociación REAL** | 🔴 **CLP 598.000 — un 11%, no un 25%** |

**Creíamos tener CLP 1,3M de espacio para negociar. Tenemos 598 mil.**

🔴 **Si SKY aprieta y bajamos a 3,9M creyendo que hay colchón, cerramos al 35% — con penalidades encima.**
🎯 **Esto hay que saberlo ANTES de entrar a la negociación, no después.**

### 🔴 La política de margen — **APROBADA POR EL DUEÑO, 2026-07-13**

> ## 🔴 PISO DURO: 45% de margen bruto. Debajo de eso, no se cotiza.
> **Firmado por el operador el 2026-07-13. No es una recomendación: es la regla.**
>
> **Cualquier agente que produzca una cotización bajo 45% está violando la política, no interpretándola.**

### El respaldo — ✅ **confirmado por el mercado, ya no es opinión**

**Benchmark verificado 2026-07-13** *(fuentes al pie)*:

- **Margen bruto sano de una agencia: 50%+.** Es el estándar que repiten todas las fuentes.
- 🔴 **Bajo 40%: "tus costos de delivery son demasiado altos"** — es la señal de que algo está roto.
- **Margen NETO promedio de una agencia: ~13%.** *(Confirma la aritmética: a 45% bruto, después de overhead,
  ventas y admin, quedas cerca de ese 13% — y **un solo scope creep te lo borra**.)*
- 🎯 **Agencias de nicho / especializadas: 40-75% bruto.** **La especialización es lo que compra el margen alto.**

| | Margen bruto | Qué significa |
|---|---|---|
| 🔴 **Piso duro** | **45%** | **Debajo de esto no se cotiza. Punto.** ✅ El mercado dice que **bajo 40% el delivery está roto**; 45% es el margen de seguridad sobre esa línea |
| ✅ **Target** | **55-60%** | Por encima del 50% sano, dentro del rango de agencia especializada. *(SKY a precio de lista: **56%** ✅ — **el precio de lista está bien.** Es lo único que hicimos bien sin método)* |
| 🎯 **Plataforma** | **80%+** | Costo marginal ≈ 0 |
| ⚠️ **Sobre 75% en servicios puros** | Revisar | O sub-inviertes en delivery, o tienes **leverage de software** — que en ASaaS **es legítimo y hay que declararlo**, no esconderlo |

🎯 **El dato del 40-75% de las agencias de nicho es el que más importa para nosotros:**
**el margen alto no se pide — se compra con especialización.** Una agencia generalista cobra menos porque es
reemplazable. **Nuestra especialización (AEO + el portal + el Grader) es exactamente lo que justifica estar en
la parte alta de ese rango — y hoy estamos en la baja, sin razón.**

🔴 **Una vez tomada la decisión, se siembra en `role_tier_margins` / `service_tier_margins` y el motor la aplica
solo.** *(Ese es el punto: la política deja de depender de que alguien se acuerde.)*

---

## 5. El gate: ninguna cotización sale sin pasar por el motor

🔴 **Regla dura #1.** Y es mecanizable, porque el motor ya tiene Full API Parity:

```
1. Squad blueprint      → % dedicación por rol            (el pod real)
2. Cotizador            → simulateQuotePricing()          (loaded cost + margen + piso)
3. Política             → ¿margen ≥ 45%?  Si no → NO SE COTIZA
4. Propuesta            → audiencia `client` (el redactor ya oculta cost stack y margen)
```

**El redactor por audiencia ya existe** (`pricing-output-redaction.ts`: `internal | client | public`) y **corta
el cost stack, el margen y los multiplicadores** antes de que nada cruce al cliente. **No hay excusa técnica.**

🎯 **Y hay un efecto secundario grande:** con el motor en el loop, **Nexa puede cotizar** (`quote_price` ya
existe como tool). *"Nexa, ¿a cuánto sale un pod de 1,5 FTE para un cliente en México con 55% de margen?"*
**Eso ya funciona. Solo hay que empezar a usarlo.**

---

## 6. Los tres bugs de la oferta viva de SKY

*(Encontrados el 2026-07-13 leyendo `docs/commercial/tenders/sky-blog-2026/oferta-economica.md`.)*

### 🔴 Bug 1 — El plan ampliado está dominado

```
Ampliado (12 artículos)            CLP 6.900.000
Base + 4 ad-hoc (12 artículos)     CLP 6.240.000     ← 5,2M + 4×260k
                                   ─────────────
El "ampliado" cuesta 660.000 MÁS por exactamente lo mismo.
```

**Nadie racional compra el ampliado.** Un analista de compras lo ve en 30 segundos, y la lectura es
**descuido** o **mala fe**. 🔴 **En una licitación, las dos nos cuestan.**

**Fix:** o el ampliado baja, o el ad-hoc sube. **Y el ad-hoc debe subir** (bug 2).

### 🔴 Bug 2 — El ad-hoc es más barato que el marginal del plan, y eso está al revés

| | CLP por artículo |
|---|---|
| Promedio del plan base | 650.000 |
| **Marginal del plan** *(base → ampliado)* | **425.000** |
| **Ad-hoc** | 🔴 **260.000** |

**El ad-hoc rompe la planificación, entra fuera de grilla y consume coordinación extra.**
🔴 **Tiene que costar MÁS que el marginal del plan, no un 39% menos.** Hoy **premiamos al cliente por salirse
del plan** — y de paso le enseñamos que un artículo nuestro vale 260 mil.

**Fix propuesto:** ad-hoc **≥ CLP 550.000** *(por encima del marginal de 425k)*. Y **mejor todavía: no publicar
precio unitario** (regla dura #2) y cotizar el ad-hoc **por lote**.

### ⚠️ Bug 3 — "Sin reajuste" en un contrato CLP a 2 años

La oferta dice **"tarifa fija en CLP, sin reajuste durante la vigencia"**, con **duración de 2 años**.
Nuestra base de costo es **mixta: nómina CLP (que sube) + contractors en USD (que se mueve con el FX)**.

🔴 **A dos años sin reajuste, la erosión de margen es silenciosa y estructural.** *(Si las bases lo imponen, es
una decisión consciente. Si no lo imponen, es un regalo.)*

**Fix:** si las bases lo permiten → **reajuste anual por IPC o UF**. Si no lo permiten → **el buffer va en el
precio, no en la esperanza.**

---

## 7. FX — estamos cortos en moneda local y nadie lo cubrió

**Cobramos en USD… salvo que no.** Berel factura en **MXN**, SKY en **CLP**, y **el costo es mixto**.

| Riesgo | Qué pasa | Impacto real |
|---|---|---|
| **MXN se devalúa** *(de 17,5 a 20 — pasó en 2025)* | Berel sigue pagando 52.000 MXN | 🔴 **USD 2.965 → 2.600. −12% de margen, en silencio** |
| **CLP se devalúa** | SKY sigue pagando 5,2M CLP | Idem, agravado por los 2 años sin reajuste |

> 🔴 **Confirmado 2026-08-15 contra el expediente:** el `Presupuesto Detallado Abril.pdf` de Berel fija
> **"fee mensual fijo en MXN"** y **no contiene ninguna cláusula de reajuste ni de FX**. **No era una suposición:
> la exposición es real y está sin cubrir.** ⚠️ Y se acumula con el descuento: **13,3% bajo lista, sin reajuste,
> sin cobertura FX, con costo mixto CLP/USD.** **Las tres erosiones van en la misma dirección.**

🔴 **Regla:** **precio en USD, factura en moneda local a un tipo de cambio declarado, con cláusula de revisión.**
*(Ejemplo: *"Valor: USD 2.965/mes. Se factura en MXN al tipo de cambio del primer día hábil del mes. Si el tipo
de cambio se mueve más de ±7% respecto del pactado, las partes revisan."*)*

🎯 **Y no es solo defensa: es una conversación que te posiciona como operador serio.** Un cliente enterprise
**espera** que gestiones tu FX. Uno que no lo pide, no lo hace.

*(El repo tiene `GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md` — la plataforma existe. Otra vez: falta la política.)*

---

## 8. Descuentos — qué se toca y qué no

| Palanca | ¿Se descuenta? | Por qué |
|---|---|---|
| **Horas / capacidad** *(bajar de 8 a 6 piezas)* | ✅ **Sí** — **es la primera** | Bajas el precio **bajando el alcance**. **El margen se preserva.** |
| **Plazo** *(12 → 24 meses)* | ✅ Sí, a cambio de **compromiso** | El descuento **se compra**, no se regala |
| **Pago anticipado** | ✅ Sí, ~5% | Tiene valor financiero real |
| **Fundación** *(la capa 1)* | ⚠️ Con cuidado | **Regalarla enseña que no valía nada** |
| 🔴 **Plataforma** *(capa 3)* | 🔴 **NUNCA** | Margen puro **+ es tu único diferenciador** |
| 🔴 **El margen, sin bajar alcance** | 🔴 **NUNCA** | 🎯 **Eso no es un descuento: es una donación** |

> ## 🔴 Y esto ya nos pasó — en Berel *(descubierto 2026-08-15)*
> **Berel recibió un 13,3% de descuento *(60.000 → 52.000 MXN)* y se quedó con el Escenario Crecimiento
> COMPLETO.** Ni un artículo menos, ni una superficie menos, ni el Digital PR, ni el reporting quincenal.
>
> 🔴 **Es exactamente la fila de arriba: bajamos el precio sin bajar el alcance.** No fue mala fe — fue no tener
> esta política escrita en abril. **Pero es el caso de referencia de por qué la regla existe.**
>
> 🎯 **Lo que se debió hacer:** *"¿60.000 está fuera de presupuesto? Perfecto — vamos al Escenario Base (8
> artículos, AEO básico, reporting mensual) a 50.000."* **El escalón ya existía en el mismo documento.**
> *(Ver `ESTADO_ACTUAL.md` § 1 y § 6 para el instrumento de renovación.)*

> 🎯 **La regla de oro, y resuelve el 90% de las negociaciones:**
> ## Nunca bajes el precio. Baja el alcance.
> *"¿USD 3.000 está fuera de presupuesto? Perfecto: bajamos a 5 piezas y quedamos en 2.400.
> **Lo que no hago es darte lo mismo por menos**, porque entonces te estoy mintiendo sobre lo que cuesta."*
>
> **Esa frase, dicha en voz alta, gana más deals de los que pierde** — y **te separa del que sí baja el precio,
> que es exactamente el que ya le falló al cliente antes.**

---

## 9. 🔴 Pricing por performance: la trampa

*"Cóbrame por resultados"* suena honesto y es, casi siempre, **una forma de que el cliente traslade el riesgo
sin traspasar el control.**

| Por qué no | |
|---|---|
| **No controlas las variables** | El cliente aprueba el contenido, tiene el sitio, decide el producto y el precio. **Tú controlas ~40% del resultado y te llevas el 100% del riesgo** |
| 🔴 **En AEO NO HAY ATRIBUCIÓN** | **No existe el modelo que conecte citación en ChatGPT con revenue.** Firmar performance sobre algo no medible **es firmar una pelea futura** |
| **Financia al cliente, no a ti** | El costo lo pones tú por adelantado, meses |
| **Selecciona adversamente** | El que más lo pide es **el que menos confía**, y el que menos confía **es el que peor cliente va a ser** |

**Cuándo SÍ:** un **bonus** sobre un piso sano, con una **métrica que tú controlas** y un **techo**.
*"Retainer de USD 3.000 + bonus de USD 500 si superamos X citaciones/mes."* ✅
**Nunca:** *"cobramos solo si funciona"* ❌ — **eso no es un modelo de negocio, es una apuesta con tu nómina.**

---

## 10. Cuándo te levantas de la mesa

🔴 **Se cierra la conversación, sin drama y sin bajar el precio, cuando:**

1. **El margen cae bajo 45%** aun bajando alcance.
2. **El cliente exige rankings garantizados.** *(No podemos, no lo vamos a fingir, y el que se los prometa le
   va a fallar. **Decírselo es un regalo.**)*
3. **Espera resultados en 3 meses.** El SEO no los da, y **firmar es firmar el churn del mes 9**.
4. **No tiene capacidad de aprobar contenido.** Sin eso, el motor se detiene y **la culpa va a ser nuestra**.
5. **Su categoría no tiene demanda de búsqueda** y no quiere construirla. *(Hay negocios donde SEO **no es la
   respuesta**. Decirlo es la venta más creíble que vas a hacer en el año.)*
6. **Compara por precio con un freelancer y solo mira eso.** **No es nuestro cliente. Y está bien.**

🎯 **Cada "no" temprano vale más que un "sí" que churnea al mes nueve** — porque el que churnea **se lleva tu
referencia, tu caso y tu moral de equipo.**

---

## 11. El checklist antes de mandar cualquier precio

- [ ] 🔴 **Si el cliente ya está adjudicado: ¿abrí su EXPEDIENTE de licitación?** *(alcance contratado, escenario
      seleccionado, KPIs comprometidos, fee de lista, descuentos, condiciones)* **— y la facturación real.**
      🔴 **NUNCA analices el pricing de un cliente adjudicado contra la memoria del operador.** *(Es el invariante
      del bloque de corrección del 2026-08-15. Berel costó un mes por saltarse este paso.)*
- [ ] 🔴 **¿Corrí el squad blueprint?** *(¿Cuántos FTE, con qué roles, a qué % de dedicación?)*
- [ ] 🔴 **¿Pasé por el cotizador?** *(loaded cost real, no estimado a ojo)*
- [ ] 🔴 **¿El margen es ≥ 45%?** Si no → **no se cotiza.**
- [ ] 🔴 **¿Publiqué un precio unitario por artículo?** → **Sácalo.**
- [ ] 🔴 **¿El ad-hoc es más caro que el marginal del plan?** *(Si no, está al revés.)*
- [ ] 🔴 **¿Algún plan está dominado por otro?** *(Haz la aritmética del comprador. Él la va a hacer.)*
- [ ] **¿La plataforma es una línea propia?** *(Y **no la descontaste**.)*
- [ ] 🔴 **Si hay descuento: ¿bajé también el alcance?** *(Si no, es una donación — § 8.)* **¿Y el motor vio el
      precio NETO, no el de lista?** *(Berel: 13,3% descontado sin pasar por el cotizador.)*
- [ ] **¿Declaré el FX y una cláusula de revisión?**
- [ ] **¿Hay reajuste si el contrato dura > 12 meses?**
- [ ] **¿El alcance tiene borde?** *(Cero "etc". Cero "todo incluido" sin lista cerrada.)*
- [ ] **¿Sé cuál es mi piso y a qué alcance corresponde?** *(Para poder decir: "a ese precio, este alcance".)*

---

## 12. Las acciones que esta política exige, hoy — **reordenadas 2026-08-15**

| # | Acción | Por qué | Plata |
|---|---|---|---|
| **0** | 🔴🔴 **Despertar el grader para Berel** | **Es entrega contratada:** monitoreo mensual + KPI de **15-25 AI citations/mes**. **Sin correr desde el 2026-07-17** | 🔴 **Riesgo de incumplimiento, no upside** |
| **1** | 🔴 **Correr el squad blueprint de Berel** | **Podemos estar al 18% de margen y no saberlo** — y ahora sabemos que el alcance es **Crecimiento completo al 87% de lista** | — |
| **2** | 🔴 **Arreglar la oferta de SKY** *(el plan dominado + el ad-hoc invertido)* | **Está viva.** Un analista de compras encuentra el bug en 30 segundos | Reputacional |
| **3** | 🔴 **Sembrar la política de margen en el motor** + **declarar el piso de 45%** | 🎯 **Es lo que convierte esta página en una política y no en un ensayo** | — |
| **4** | 🔴 **RETIRADA — era "desagregar AEO en Berel"** → reemplazada por **el instrumento de renovación** *(abajo)* | **El AEO de Berel está contratado y pagado.** El benchmark de USD 900+ **se conserva para clientes nuevos** | ⚠️ **No es +30%. Era un error** |
| **5** | ⚠️ **Poner cláusula FX + reajuste** en Berel y en el próximo contrato | ✅ **Confirmado: el presupuesto de Berel no tiene ninguna de las dos** | **~12% de margen expuesto** |
| **6** | 🔴 **Modelar el descuento en el motor** | **13,3% se descontó sin pasar por el cotizador.** El motor tiene que ver el precio NETO, no el de lista | **Es el gate de § 5** |

### ⚠️ Acción 4 (reemplazo) — el instrumento correcto en Berel

> 🔴 **NUNCA: "ahora te cobro el AEO aparte".** Está pagado desde febrero — **y pagado con descuento.**
> Decirlo le informa al cliente que le cobramos mal, y **pone en duda todo lo demás que le facturamos.**

🎯 **El argumento limpio ya existe y es habitual: Berel paga 52.000 sobre una lista de 60.000.**
**No hay que subir el precio — hay que retirar el descuento de entrada.**

> *"El descuento de lanzamiento cubría los primeros meses. A partir de la renovación volvemos a lista."*
> **Eso se dice sin incomodidad y no cuestiona nada de lo ya facturado.**

| Si el blueprint muestra… | Instrumento | Por qué es defendible |
|---|---|---|
| **Margen bajo el piso del 45%** | **Retirar o reducir el descuento en la renovación** *(52.000 → hacia 60.000)*, incorporando **reajuste** y **cláusula FX** | 🎯 **Es volver a la lista de su propio presupuesto.** El techo de la banda Crecimiento son **80.000 MXN** — ni siquiera pedimos eso |
| **Margen sano y el cliente quiere más** | **Ampliación de alcance con adenda:** **Crecimiento (60-80k) → Full Surround (100-120k MXN)** | 🎯 **El escalón se lo presentamos en febrero, en el mismo documento.** Es crecimiento, no corrección |

⚠️ **Ninguna de las dos se mueve antes del blueprint (#1), ni antes de confirmar el timing en el contrato** —
el mínimo son 6 meses y el repo fecha la adjudicación en **may-2026**. 🔴 **No asumas que la ventana de renovación
está abierta.** Y ojo con el timing reputacional: **estamos citando a Berel como comparable en la licitación viva
de SKY** *(`oferta-tecnica.md:656-658`)*.

### ⚠️ wherEX no es compra pública

**wherEX es sourcing privado entre empresas, no un portal estatal.** 🎯 **No hay prohibición legal de modificar
el contrato** — no aplica régimen de contratación pública ni impugnación de terceros. **Lo que restringe es
(a) contractual** *(fee fijo MXN, mínimo 6 meses, notice 30 días, herramientas incluidas en el fee)* **y
(b) reputacional** *(Berel es nuestro comparable vivo frente a SKY)*.

### 🔴 Lo que falta verificar **en el contrato** — no está en el repo

✅ **El fee ya está resuelto** *(52.000 = lista 60.000 − 13,3%)*. Lo pendiente es **estructural**:

| # | Qué falta | Por qué cambia el instrumento |
|---|---|---|
| **1** | **Fecha real de adjudicación e inicio** | Define cuándo vence el mínimo de 6 meses |
| **2** | **Vigencia y régimen de renovación** *(automática · tácita · expresa)* | Sin esto, "retirar el descuento en la renovación" **no tiene fecha** |
| **3** | **Régimen de modificación de precio y alcance** | ¿Adenda posible? ¿Con qué preaviso? ¿Acuerdo escrito de ambas partes? |
| **4** | 🔴 **Reajuste** | No existe en el presupuesto. Fee fijo MXN + inflación mexicana = erosión silenciosa |
| **5** | 🔴 **Cláusula FX** | No existe. Costo mixto CLP/USD contra ingreso 100% MXN |
| **6** | ⚠️ **Si el descuento quedó escrito como temporal o permanente** | 🎯 **Es la diferencia entre "vence el descuento" y "renegociar el precio"** |

---

## Fuentes y trazabilidad

**Internas (✅ verificadas en el repo):**

- **SKY:** `docs/commercial/tenders/sky-blog-2026/oferta-economica.md` (precio 5,2M/6,9M/260k) +
  `squad-blueprint-INTERNO.md` (loaded cost **2,26M** · piso **3,9M** · 2,2 FTE).
- **Berel** *(fuente corregida 2026-08-15 — antes decía "operador, 2026-07-13")*:
  - **Expediente de licitación** *(OneDrive `4. Comercial/Licitaciones/Pinturas Berel/1. SEO/Listo/`)*:
    **`Alcance del Servicio.pdf`** *(feb-2026 — 3 escenarios, AEO en los tres)* + **`Presupuesto Detallado Abril.pdf`**
    *(Escenario Crecimiento seleccionado · lista **MXN 60.000/mes** · 12 art/mes · mínimo 6 meses · notice 30 días ·
    herramientas incluidas · **KPI 15-25 AI citations/mes** · **sin reajuste ni cláusula FX**)*.
  - **Fee final adjudicado: MXN 52.000/mes** *(operador, 2026-08-15 — **lista 60.000 − 13,3% de descuento**)*.
  - **Facturación real:** DTE 110 de exportación, `src/lib/nubox/__tests__/dte-foreign-currency.test.ts:7-12`
    *(venta 28800562 · `PESO MEX` · MntExe 89.960 · TC 51 → CLP 4.617.647)* — **pago inicial de mes y medio a
    precio de lista** *(1,5 × 60.000 = 90.000)*. **Línea de conciliación contable, no discrepancia de alcance.**
  - **Runtime:** `migrations/20260628103818271_task-1277-aeo-module-seed-revert-grant.sql:44-58`
    → `ai_visibility_v1`, **`aeo_tier: 'contracted'`**.
  - 🔴 **Sigue sin blueprint, sin loaded cost y sin piso** — y ahora con **alcance confirmado más grande de lo supuesto.**
- **El motor:** `src/lib/finance/pricing/**` (TASK-464b/d/e · 1202 · 1211 · 1212).
- **Modelo de costo:** `GREENHOUSE_MEMBER_LOADED_COST_MODEL_V1.md` (full absorption).
- **FX platform:** `GREENHOUSE_FX_CURRENCY_PLATFORM_V1.md`.
- **Canibalización de la medición:** PDR-006 §5.

**Externas (✅ verificadas 2026-07-13 — reverificar cada 2 trimestres):**

| Dato | Valor | Fuente |
|---|---|---|
| Retainer SEO promedio | **USD 3.209/mes** (Ahrefs, n=439) · **USD 3.199** (Clutch) | ✅ |
| Tramo más común | USD 1.500-5.000 (**48%** de agencias) · solo **5,5%** cobra >5.000 | ✅ |
| Por segmento | SMB 2.500-5.000 · **Mid-market 5.000-10.000** · **Enterprise 10.000-50.000+** | ✅ |
| **AEO/GEO como línea aparte** | **USD 900+/mes.** 54,3% de agencias subió precio en 25-26; **37% por AEO/GEO** | ✅ |
| **Margen bruto sano** | **50%+** · 🔴 **bajo 40% = delivery roto** · **neto promedio ~13%** | ✅ |
| **Agencias de nicho** | **40-75% bruto** — *la especialización compra el margen* | ✅ |
| **Precio de la medición IA** | Semrush checker **gratis** · Toolkit **USD 99/mes** · Ahrefs Brand Radar **USD 199-828/mes** | ✅ |
| **FX** | USD/MXN **17,54** · USD/CLP **~930** | ✅ 🔴 **reverificar antes de CADA cotización** |

⚠️ **Los benchmarks de precio son globales/US.** LATAM cobra menos. **Pero la brecha es tan grande que, aun con
un descuento LATAM del 35%, seguimos abajo** — y **nuestros dos clientes no son PyMEs locales: son un grupo
industrial mexicano y una aerolínea.**
# Pricing architecture companion

Load `efeonce-pricing-operator` first for cross-line pricing architecture, value metrics, delivery models,
cost-to-serve, discounts, versioning and governance. This module owns only Search Visibility 360-specific
packaging, floors, FX and SEO/AEO offer economics.
