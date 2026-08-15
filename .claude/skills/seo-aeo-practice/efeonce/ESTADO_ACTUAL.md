# El estado real de la práctica SEO/AEO — sin adornos

> **As-of 2026-07-13**, con **corrección estructural del 2026-08-15** *(ver bloque siguiente)*.
> Fuente: **expediente de licitación** + repo + facturación real + benchmark de mercado verificado.
> 🔴 **Este documento existe para que ningún agente venda con una realidad que no tenemos.**

---

## 🔴 Corrección 2026-08-15 — el alcance de Berel estaba mal, y la conclusión que salía de ahí estaba invertida

> **Qué decía este documento hasta hoy:** que el alcance de Berel era *"medición · portal · contenido · posteo ·
> SEO técnico si necesitasen"*, **citando al operador (2026-07-13)** — y de ahí que **el AEO se regalaba** y que
> había que **desagregarlo por ~USD 900/mes (+30%)**.
>
> ## 🔴 Es falso. El AEO de Berel está vendido, contratado y pagado desde el día uno.

**Lo que dice el expediente** *(OneDrive `4. Comercial/Licitaciones/Pinturas Berel/1. SEO/Listo/`)*:

| Fuente | Qué prueba |
|---|---|
| **`Alcance del Servicio.pdf`** *(feb-2026)* | Se titula **"SEO + AEO + Producción de Contenido Editorial y Visual"**. Tres escenarios — **Base · Crecimiento · Full Surround** — y **AEO está en los tres** *(básico → completo → completo + PR)* |
| **`Presupuesto Detallado Abril.pdf`** | *"Pinturas Berel ha seleccionado el **Escenario Crecimiento**"*. **MXN 60.000/mes**, mínimo 6 meses, on-going, facturación mensual en MXN, notice 30 días, **"Herramientas: incluidas en el fee"** |
| **Su §3 — Answer Engine Optimization** | **AEO avanzado en cada pieza** · **Digital PR 5-10 menciones/mes** · **monitoreo de presencia en ChatGPT, Perplexity, Google AI Overviews y Gemini** · KPI **15-25 AI citations/mes** |
| **El brief del cliente en wherEX** | Pedía **sólo "SEO + Blog"**. 🎯 **El AEO lo introdujo Efeonce como diferenciador — y Berel lo compró** al elegir Crecimiento |
| **El runtime** | `migrations/20260628103818271_task-1277-aeo-module-seed-revert-grant.sql:44-58` → `ai_visibility_v1` para Berel con **`aeo_tier: 'contracted'`** |
| **Se lo declaramos a un tercero** | `docs/commercial/tenders/sky-blog-2026/oferta-tecnica.md:656-658` — citamos a Berel ante SKY como *"servicio recurrente de contenido con SEO y AEO"* |

### 🔴 Las cuatro consecuencias, y ninguna es la que decía este documento

**1. El riesgo se invierte.** No es que dejemos plata en la mesa: es que **tenemos un KPI contratado que no estamos
midiendo**. El presupuesto compromete **monitoreo mensual de citations** y **15-25 AI citations/mes** — y el
grader **lleva sin correr desde el 2026-07-17** *(`docs/audits/platform/2026-08-15-growth-seo-aeo-module-opportunity-audit.md`)*.
🔴 **Eso es under-delivery contra una obligación, y es más urgente que cualquier upside de pricing.**
*(Y el descuento no lo atenúa: **haber bajado el precio no baja el compromiso**.)*

**2. El instrumento comercial cambia.** No es desagregar. 🔴 **"Ahora te cobro el AEO aparte" es la peor frase
posible: ya está pagado, y decirla nos deja como si hubiéramos cobrado mal.** Las palancas legítimas están más abajo.

**3. El alcance real es MÁS grande de lo que creíamos.** Crecimiento son **12 artículos/mes** *(3 pillar + 9 satélite)*
\+ Serie Laboratorio + Digital PR + link building + reporting quincenal. 🔴 **Es más que el plan base de SKY (8
artículos), no menos.** La tabla de sensibilidad de FTE en `modules/04_PRICING.md` § 1 sigue siendo el instrumento
correcto — pero hay que leerla **desde arriba**, no desde abajo.

**4. Y el fee, ya reconciliado, empeora el cuadro.** ✅ **MXN 52.000/mes es correcto** — pero es el **precio de
lista de 60.000 menos un 13,3% de descuento**. 🔴 **El descuento se aplicó al precio, no al alcance:** entregamos
Crecimiento completo *(AEO avanzado, Digital PR, monitoreo mensual, KPI de citations)* **al 87% de lista**.
**El colchón de margen es más delgado de lo que el presupuesto asumía.** Detalle en § 1.

> ## 🔴 Regla de práctica, y es un invariante
> **Ningún análisis de pricing de un cliente adjudicado se hace contra la memoria del operador.**
> **Se hace contra el expediente de la licitación más la facturación real.**
>
> *(Este documento tardó un mes en propagar un alcance dictado de memoria hasta una acción comercial que nos
> habría hecho quedar mal frente al cliente. El expediente estaba en OneDrive todo el tiempo.)*

---

## 1. La cartera: dos clientes, y ninguno con método

| | **Berel** (MX) | **SKY** (CL) |
|---|---|---|
| Estado | **Cliente activo, facturando** | 🔴 **Licitación EN CURSO** (Wherex) |
| Precio | ✅ **MXN 52.000/mes** — **lista 60.000 − 13,3% de descuento** *(operador, 2026-08-15)*. 🔴 **Alcance Crecimiento COMPLETO al 87% del precio de lista** | **CLP 5.200.000/mes** *(plan base)* |
| **USD equivalente** | **≈ 2.965** *(FX 17,54 — reverificar)* | **≈ 5.591** |
| Alcance **real** *(expediente, no memoria)* | ✅ **Escenario Crecimiento: SEO + AEO + producción de contenido editorial y visual.** 12 art/mes · AEO completo · Entity SEO · Digital PR · monitoreo mensual de AI citations · reporting quincenal | 8 artículos + SEO/AEO + multimedia + reportería + portal |
| **Loaded cost** | 🔴 **DESCONOCIDO** | CLP **2.260.000** (2,2 FTE) |
| **Piso** | 🔴 **NO EXISTE** | 🔴 **3.900.000 declarado → NO PASA la regla del 45%.** El piso real es **≈ CLP 4.602.000** *(45% + buffer 12% de penalidades/Wherex)* |
| **Margen** | 🔴 **NO SABEMOS** | **56%** (lista) · **42%** (piso) |
| Contrato | **Fee fijo MXN · mínimo 6 meses · notice 30 días · herramientas incluidas.** 🔴 **Sin reajuste ni cláusula FX** | **2 años, CLP, SIN reajuste** ⚠️ |

### ✅ El fee de Berel: RESUELTO — lista → descuento → final

**La cadena completa, y la skill ya tenía bien el número final:**

| Eslabón | Cifra | Fuente |
|---|---|---|
| **Precio de lista** del Escenario Crecimiento | **MXN 60.000/mes** | `Presupuesto Detallado Abril.pdf` *(banda publicada: 60.000-80.000)* |
| **Descuentos aplicados** | **−MXN 8.000/mes** *(−13,3%)* | Negociación de adjudicación |
| ✅ **Fee final adjudicado** | ## **MXN 52.000/mes** | **Operador, 2026-08-15. Es la cifra vigente y correcta** |
| *Pago inicial* | *MXN 89.960* | *Mes y medio de arranque, facturado a precio de lista (1,5 × 60.000 = 90.000). DTE 110 exento, `dte-foreign-currency.test.ts:7-12`. **Línea de conciliación contable para Finance, no discrepancia de alcance*** |

> ## 🔴 El descuento cambió el PRECIO. **No cambió el ALCANCE.**
> **Berel tiene contratado el Escenario Crecimiento completo:** AEO avanzado en cada pieza · **Digital PR 5-10
> menciones/mes** · **monitoreo mensual en ChatGPT, Perplexity, Google AI Overviews y Gemini** · **KPI de 15-25
> AI citations/mes**. 🔴 **Nada de eso salió del alcance por el descuento.**

**Las tres consecuencias:**

**(a) 🎯 Entregamos el alcance Crecimiento completo al 87% del precio de lista.** Descontar para ganar una
licitación **es legítimo y no es el hallazgo**. Pero significa que **el colchón de margen es 13% más delgado de lo
que el presupuesto asumía** — 🔴 **y eso hace del squad blueprint un prerrequisito, no una tarea pendiente.**

**(b) 🔴 Regalar más está definitivamente descartado.** El AEO no sólo está pagado: **está pagado con descuento.**

**(c) 🔴 El riesgo de under-delivery se agrava, no se alivia.** El KPI de 15-25 citations/mes sigue en pie tal cual.
**Que hayamos descontado el precio no descuenta el compromiso.**

🔴 **Berel puede estar entre 63% y 18% de margen según cuántos FTE consuma. Nadie lo ha medido.**
→ tabla de sensibilidad completa en `modules/04_PRICING.md` § 1. ⚠️ **Y ahora sabemos que el alcance real
(12 art/mes + PR + quincenal) está en la parte ALTA de esa tabla, no en la baja.**

---

## 2. 🔴 Cero casos citables — **pero no partimos de cero**

### 🎯 Delta 2026-07-13 — hay DOS candidatos con número, sin verificar

| Candidato | El número *(en `docs/context/01_quienes-somos.md`)* | 🔴 Qué le falta para ser citable |
|---|---|---|
| **Sky** | **+127% de tráfico orgánico** *(vs LATAM)* | ⚠️ **Es tráfico, no AEO.** Verificar contra su GSC · **declarar denominador y ventana** · **autorización** |
| **Bresler** | **+180% de ventas digitales** | Lo mismo — **y la atribución al SEO** |
| **Berel** | Retainer SEO+AEO adjudicado *(wherEX #5234, may-2026)* | 🔴 **Sin métrica de resultado.** Es el candidato para construirlo bien **desde el baseline** |

🎯 **El trabajo pendiente NO es "conseguir un caso": es VERIFICAR dos números que ya tenemos.**
🔴 **Pero la regla no cambia: sin las 3 condiciones, no se usa.** Ni "ilustrativo", ni redondeado.

**Logos usables** *(sin métrica)*: Sky · ANAM · Berel · Carozzi · Bresler · Marca Chile · Aguas Andinas ·
BeFUN · Gobierno de Santiago · Universidad de Temuco. 🎯 **No prueban resultados, pero prueban que empresas
serias nos dejan entrar — y en una categoría con déficit de confianza, eso vale.**

🔴 **Testimoniales: no existe ninguno en el repo.**


**No tenemos ni un solo caso de SEO/AEO con las tres condiciones:**
**(a)** métrica verificable · **(b)** relación sana · **(c)** autorización del cliente.

**Consecuencias, y hay que aceptarlas:**

- 🔴 **No podemos vender con prueba social.** Vendemos con **el Grader** (diagnóstico) y **el método**.
- 🔴 **Por eso el precio y el Grader tienen que estar impecables:** están haciendo el trabajo que debería hacer
  un caso. **Un error de aritmética en una oferta** *(y tenemos uno vivo en SKY)* **nos cuesta más de lo normal,
  porque no hay un caso que lo compense.**
- 🎯 **La acción de mayor ROI de la práctica es conseguir el primer caso citable.** Berel es candidato natural:
  es cliente activo, hay data, y solo falta **medir, verificar y pedir autorización.**

*(Es exactamente el mismo hoyo que encontramos en la práctica HubSpot. Y allá la respuesta también fue: el QBR
con el cliente que ya tienes.)*

---

## 3. Lo que sí tenemos (y no estamos usando bien)

| Activo | Estado | 🔴 El problema |
|---|---|---|
| 🎯 **AI Visibility Grader** | ✅ **En producción**, 7 dimensiones, entity probes, reporte público. **Y ya se usa en la venta** | 🔴 **Compite con el checker GRATIS de Semrush en "medir".** Su valor tiene que migrar a **la prescripción**, no al score |
| **El cotizador** | ✅ Motor cost-plus completo, Full API Parity, Nexa + MCP lo consumen | 🔴 **Se usó UNA vez** (SKY). Para el cliente que factura todos los meses, **no** |
| **El portal / ICO** | ✅ Existe, está en la oferta de SKY | 🔴 **Va adentro del retainer, sin línea propia ni precio.** Es nuestro mayor diferenciador y **lo regalamos** |
| **Landing de SEO** (`/servicios/posicionamiento-seo`) | ✅ **Live** (TASK-1343) | — |
| **Landing de AEO** (`/aeo-2/`) | ✅ **Live** | — |
| **Squad blueprint** | ✅ Método probado (SKY) | 🔴 **Existe para un cliente de licitación y no para el que paga todos los meses** |
| **EPIC-022 · Search Visibility 360** | 🟡 **Motor real, sin cara** *(2026-08-05 fin de día: COMPLETE TASK-1299 schema `greenhouse_growth.seo_*` + TASK-1301 entitlement per-org (hoy la clave viva es `seo_v2`)/chokepoint `enforceSeoRunEntitlement` + TASK-1300 registry DataForSEO/ledger + TASK-1302 materializer GSC LIVE/`readKeywordOpportunities` + TASK-1305 `readSeoAeoGap`/quadrant 360 — primer quadrant real: **Berel #1.75 orgánico × AEO 44.5 → `riesgo`**, autoridad sin citabilidad = cross-sell al AEO. **Delta 2026-08-06 — TASK-1645 y TASK-1647 COMPLETE, el motor está VIVO EN PRODUCCIÓN y operable por MCP**: release `70e912056273` (manifest `released`) + `GROWTH_SEO_ENABLED=true` en Vercel Production, y el provider `greenhouse-seo` habilitado en `mcp.efeonce.org` (revisión `efeonce-mcp-gateway-00012-dkj`). Canary contra **producción**: el 360 de Berel responde **`riesgo` / 50 keywords / AEO 44.5**, entitlement Efeonce ok + `no_seo_data` honesto, deny anti-oracle 404. Efeonce own-brand provisionada `EO-ORG-0007` con lente AEO propia + assignment **`seo_v2`**; **Berel provisionada** (`cpma-berel-seo-contracted`, **`seo_v2`**) — **su target vigente es `seot-berel-mx` (México), NO el `seot-berel-fase0` original, que quedó PAUSADO** (ver más abajo, `ISSUE-152`); SKY con lente AEO ligada. **La clave del módulo per-org es `seo_v2`, no `seo_v1`:** `TASK-1677` cerró la fase CONTRACT del cutover (migración `20260809163352129`) y **no queda ni un assignment `seo_v1` vigente**; el código lee sólo `seo_v2`. **TASK-1303 también COMPLETE y EN PRODUCCIÓN** (release `fcee5ab9f7ce`, 2026-08-06): rank capture diario DataForSEO — cron `ops-seo-rank-capture` ACTIVO 05:00 CLT en ops-worker, `captureRankSnapshot` con gate de costo + spend fence, serie día-1 Berel 31 keywords **con AI Overview presence por keyword**, consultable por `readRankEvolution` y la 4.ª MCP tool `get_seo_rank_evolution`, señal `seo.rank.capture_lag`. **Delta 2026-08-07 — el motor YA TIENE CARA, pero es interna:** TASK-1306/1307/1308 complete → cockpit operador en `/admin/growth/seo` (overview + rank/URL performance + mapa de oportunidades de keyword), y el equipo puede **seguir/dejar de seguir keywords** desde la pantalla. Inventario MCP del dominio SEO (verificado contra `src/mcp/greenhouse/server.ts` el 2026-08-14): **10 lecturas + 2 escrituras** — la 10.ª lectura es `get_seo_keyword_market_data` (TASK-1661, complete y en producción: volumen de búsqueda + barrera de enlaces por keyword, con `as-of` obligatorio y `found=false` = desconocido, NUNCA cero). `track_seo_keywords`/`untrack_seo_keywords` (TASK-1308) son las primeras tools de ESCRITURA del dominio y comprometen gasto recurrente del proveedor, así que van con techo por target, entitlement per-ORG, outcome por keyword y reverso; federadas y **fail-closed** hasta que exista el cliente OAuth con grant revocable (TASK-1631). La cara pública/cliente sigue sin existir — no venderlo como autoservicio. **Delta 2026-08-13 — `ISSUE-152`: Berel se mide en MÉXICO, no en Chile.** El target original `seot-berel-fase0` estaba configurado con `location_code 2152` (Chile) para una marca mexicana: `berel` tiene **30 búsquedas/mes en Chile contra 49.500 en México** (1.650×), y el set monitoreado incluso traía términos de español mexicano. Se corrigió con **target nuevo `seot-berel-mx`** (`2484`/`es`/`MX`, activo) + las 31 keywords re-trackeadas por el command canónico, y **pausa del target de Chile — sin borrar** los 238 snapshots históricos (la tabla es append-only; cambiar el `location_code` in-place habría mezclado dos mercados bajo una misma serie sin marcador). **Consecuencia comercial: si armas una propuesta o un report de Berel, el país es México.** El año de serie previo describe el SERP equivocado y no debe presentarse como evolución de posiciones del cliente. Hallazgo hermano del mismo issue: `keyword_difficulty` no es creíble en español (`pintura` sale KD 0 con 135.000 búsquedas/mes en México), así que **la dificultad no se muestra a un cliente**; el volumen sí es utilizable)* | El nombre ya declara la estrategia: **vender visibilidad, no SEO** |

---

## 4. 🔴🔴 LA HEMORRAGIA — el bug más caro, y es de una línea

> **La landing de SEO (`/servicios/posicionamiento-seo`, live) tiene su form `efeonce-seo-diagnostic` con
> `deliveryMode = disabled`.**
>
> ## Los leads entran a Greenhouse y NUNCA llegan al CRM. Desde que se publicó.
>
> 🔴 **Nadie los está trabajando. Es una línea de configuración.**
> *(La de AEO sí entrega: `efeonce-aeo-diagnostic` → HubSpot + auto-grader.)*

---

## 4b. 🔴 Los otros bugs vivos

1. **La oferta de SKY tiene un plan dominado.** El "ampliado" (12 art · 6,9M) **cuesta CLP 660.000 MÁS** que
   comprar base + 4 ad-hoc (6,24M). **Un analista de compras lo ve en 30 segundos.**
2. **El ad-hoc está invertido.** CLP 260.000 vs un marginal de plan de 425.000. **Premiamos salirse del plan** —
   y le entregamos al cliente **la calculadora para comoditizarnos.**
3. 🔴 **~~Regalamos el AEO~~ → CORREGIDO 2026-08-15: el AEO de Berel está PAGADO, y le estamos quedando cortos.**
   El presupuesto compromete **monitoreo mensual de presencia en ChatGPT/Perplexity/AI Overviews/Gemini** y un KPI
   de **15-25 AI citations/mes**. 🔴 **El grader lleva dormido desde el 2026-07-17.**
   **No es revenue perdido: es una obligación contratada que no se está cumpliendo** — y el cliente puede pedir
   ese reporte cualquier día. *(Que el mercado cobre el AEO aparte desde USD 900/mes sigue siendo cierto, pero es
   referencia para **clientes nuevos** — no plata sobre la mesa en Berel.)*

---

## 5. Contra el mercado: estamos baratos, y no por ser de LATAM

| | Mercado ✅ | Nosotros |
|---|---|---|
| Retainer SEO promedio | **USD 3.209/mes** | — |
| **Mid-market** | **USD 5.000-10.000** | 🔴 **Berel: 2.965** *(y su propia lista, 60.000 MXN, son 3.421 — **también abajo del tramo**)* |
| **Enterprise** | **USD 10.000-50.000+** | 🔴 **SKY: 5.591** |
| Margen bruto sano | **50%+** *(bajo 40% = delivery roto; neto promedio ~13%)* | SKY 56% ✅ · **Berel: ?** 🔴 |
| Agencias **de nicho** | **40-75% bruto** — *la especialización compra el margen* | Estamos en la parte baja **sin razón** |

> 🔴 **Delta 2026-08-15 — la cifra de Berel se sostiene, y el cuadro es PEOR de lo que decía esta tabla.**
> Los USD 2.965 son correctos, **pero ahora sabemos contra qué alcance**: Escenario Crecimiento completo —
> **12 artículos/mes**, AEO avanzado, Digital PR, monitoreo mensual, reporting quincenal. **Y a 13,3% bajo su
> propio precio de lista.** 🎯 **No es que Berel esté barato para lo que creíamos entregar: está barato para
> mucho más de lo que creíamos entregar.**

> 🎯 **No estamos baratos porque seamos de LATAM. Estamos baratos porque nunca miramos.** *(Vigente para SKY.)*
> **Berel es un grupo industrial mexicano. SKY es una aerolínea. No son PyMEs sensibles al precio.**

---

## 6. Las acciones, en orden — **reordenadas 2026-08-15**

| # | Acción | Dueño | Impacto |
|---|---|---|---|
| **0** | 🔴🔴 **Despertar el grader para Berel — es entrega contratada, no mejora.** KPI comprometido: **15-25 AI citations/mes** con **monitoreo mensual**; dormido desde el **2026-07-17** | Delivery + Ingeniería | 🔴 **Under-delivery contra contrato. Es lo primero** |
| **1** | 🔴🔴 **Squad blueprint de Berel — ahora es PRERREQUISITO, no tarea.** Alcance Crecimiento completo *(12 art/mes + PR + quincenal)* **al 87% del precio de lista** | Finance + Delivery | **Podría estar al 18%, y con 13% menos de colchón** |
| **2** | ✅ **Fee RESUELTO: MXN 52.000** *(lista 60.000 − 13,3%)*. Sólo queda pasar el pago inicial de 89.960 como **línea de conciliación contable** | Finance | Cerrado — ya no bloquea |
| **3** | 🔴 **Arreglar la oferta de SKY** *(plan dominado + ad-hoc invertido)* — **está viva** | Comercial | Reputacional en una licitación |
| **4** | ✅ **Piso del 45% APROBADO (2026-07-13)** → **sembrarlo en el motor** | Dueño ✅ / Ingeniería | Convierte la política en gate automático |
| **4b** | 🔴 **URGENTE — corregir el piso de SKY: 3,9M → 4,6M** | Comercial | **A 3,9M cerramos al 35%. La negociación real es de CLP 598.000, no de 1,3M** |
| **5** | ⚠️ **Instrumento comercial de Berel — retirar el descuento en la renovación, NO desagregar el AEO** *(ver abajo)* | Comercial | **Depende del blueprint (#1). No se mueve antes** |
| **6** | 🎯 **Conseguir el primer caso citable** *(Berel es el candidato)* | Delivery + Cliente | **Desbloquea vender con prueba** |

### ⚠️ Acción 5 — cuál es el instrumento correcto en Berel *(y cuál nos hace daño)*

> 🔴 **NUNCA: "ahora te cobro el AEO aparte".** Ya está pagado desde febrero. Decirlo le informa al cliente que
> **le cobramos mal**, y pone en duda todo lo demás que le facturamos.

> 🎯 **Y el argumento correcto tampoco es "subo el precio".** Berel paga **52.000 sobre una lista de 60.000**:
> la conversación limpia y habitual es **retirar o reducir el descuento de entrada**, no inventar un cobro nuevo.
> *"El descuento de lanzamiento cubría los primeros meses. A partir de la renovación volvemos a lista."*
> **Eso se dice sin incomodidad, y no pone en duda nada de lo ya facturado.**

**Según lo que muestre el squad blueprint, hay dos palancas legítimas — y las dos usan su propio expediente:**

| Si el blueprint muestra… | Instrumento | Por qué es defendible |
|---|---|---|
| **Margen bajo el piso con el alcance actual** | **Retirar o reducir el descuento de entrada en la renovación** *(52.000 → hacia 60.000)*, incorporando además **reajuste** y **cláusula FX** *(hoy no existe ninguna de las dos)* | 🎯 **No es un aumento: es volver al precio de lista que su propio presupuesto publicó.** El techo de la banda Crecimiento son 80.000 MXN — **ni siquiera estamos pidiendo eso** |
| **Margen sano, y el cliente quiere más** | **Ampliación de alcance con adenda**, usando el escalón publicado: **Crecimiento (60-80k) → Full Surround (100-120k MXN)** | 🎯 **El escalón ya se lo presentamos en febrero.** Es una conversación de crecimiento, no de corrección |

⚠️ **Antes de mover cualquiera de las dos hay que confirmar el timing contractual en el contrato**, no en este
documento: el mínimo son **6 meses** y el repo fecha la adjudicación en **may-2026**, lo que pondría el fin del
mínimo cerca de **nov-2026**. 🔴 **No asumas que la ventana de renovación ya está abierta** — es justo el tipo de
dato que este documento acaba de aprender a no inventar.

---

## 6b. wherEX no es compra pública — la restricción es otra

⚠️ **Berel llegó por wherEX, y eso confunde.** wherEX es **sourcing privado entre empresas**, no un portal de
compra estatal. 🎯 **No hay prohibición legal de modificar el contrato** — no aplica régimen de contratación
pública, ni tope de modificación, ni impugnación de terceros.

**Lo que sí restringe, y es suficiente:**

| Restricción | De dónde viene |
|---|---|
| **Contractual** | Fee **fijo en MXN** · **mínimo 6 meses** · **notice 30 días** · **"herramientas incluidas en el fee, sin costos adicionales"** *(presupuesto seleccionado)* |
| 🔴 **Reputacional** | **Estamos citando a Berel como comparable en la licitación VIVA de SKY** *(`oferta-tecnica.md:656-658`)*. Cualquier fricción de precio con Berel ahora **contamina la referencia que estamos usando para ganar SKY** |

🔴 **La restricción reputacional es la que manda en el timing.** No es que no se pueda repricear: es que **no
conviene abrir esa conversación mientras SKY está evaluando**, salvo que el blueprint muestre que estamos
perdiendo plata.

---

## 6c. 🔴 Lo que falta verificar **en el contrato** — y no está en el repo

✅ **El fee ya NO está en esta lista: está resuelto (52.000, lista 60.000 − 13,3%).** Lo que queda es **estructural**
— sale del contrato firmado, no del expediente de la propuesta, y **cada punto cambia el instrumento comercial**:

| # | Qué falta | Por qué importa |
|---|---|---|
| **1** | **Fecha real de adjudicación e inicio del servicio** | Define cuándo se cumple el mínimo de 6 meses. El repo dice *"wherEX #5234, may-2026"*; el presupuesto es de abril. **No es lo mismo** |
| **2** | **Vigencia y régimen de renovación** *(automática · tácita · expresa)* | Determina **si existe un punto de renovación** y cuándo. Sin esto, "retirar el descuento en la renovación" no tiene fecha |
| **3** | **Régimen de modificación de precio y alcance** | ¿Se puede emitir una adenda? ¿Con qué preaviso? ¿Requiere acuerdo escrito de ambas partes? |
| **4** | 🔴 **Reajuste** | El presupuesto **no menciona ninguno**. A fee fijo en MXN, la inflación mexicana erosiona el margen en silencio |
| **5** | 🔴 **Cláusula FX** | **No existe.** Costo mixto *(nómina CLP + contractors USD)* contra ingreso 100% MXN. Ver `modules/04_PRICING.md` § 7 |
| **6** | ⚠️ **Si el descuento quedó escrito como temporal o como precio permanente** | 🎯 **Es la diferencia entre "vence el descuento" y "renegociar el precio".** La primera conversación es trivial; la segunda no |

---

## 7. Lo que NO podemos decir todavía

🔴 **Ningún agente puede afirmar, hoy:**

- *"Hemos aumentado el tráfico de nuestros clientes un X%"* → **no hay caso verificado.**
- *"Somos líderes en AEO en LATAM"* → **no hay dato que lo sostenga.**
- *"Te garantizamos rankings"* → **nunca, con nadie.** Es la promesa que rompió la categoría.
- *"Ser citado por ChatGPT te va a generar X en ventas"* → 🔴 **no existe el modelo de atribución.**
  **Y decirlo en voz alta es el activo, no la debilidad.**
