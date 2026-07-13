# GLOSSARY — el vocabulario de la práctica

> **Solo lo que se usa al VENDER.** El vocabulario del oficio (schema, chunking, query fan-out, llms.txt)
> vive en la skill **`seo-aeo`**.

---

## Precio y economía

| Término | Qué es | Por qué importa |
|---|---|---|
| **Loaded cost** | El costo real de un rol: nómina + cargas + herramientas + overhead, prorrateado por % de dedicación | 🔴 **Sin esto no hay precio.** Sale del squad blueprint |
| **Squad blueprint** | El diseño del pod que se asigna a un cliente: roles, seniority, % dedicación, mapeo a nómina | **El insumo del piso.** *(Existe para SKY. NO para Berel)* |
| **Margen bruto** *(delivery margin)* | `(precio − loaded cost) / precio` | 🔴 **Piso aprobado: 45%.** Target: 55-60%. Mercado: 50%+ sano, **bajo 40% el delivery está roto** |
| **Margen neto** | Lo que queda después de overhead, ventas, admin e impuestos | **Promedio de agencia: ~13%.** Por eso 45% bruto es el filo |
| **Piso** | El precio mínimo: `costo / (1 − margen mínimo)` | 🔴 **Se COMPUTA, no se siente** |
| **Métrica de valor** | La unidad sobre la que cobras *(artículo, hora, mercado, superficie)* | 🔴 **Hoy cobramos por artículo — la cosa que la IA está abaratando** |
| **Plan dominado** | Un plan que cuesta más que comprar lo mismo por partes | 🩸 **SKY: el ampliado (6,9M) cuesta más que base + 4 ad-hoc (6,24M)** |
| **Full absorption costing** | Modelo que carga TODO el overhead al costo del servicio | El modelo existe en el repo. **No se aplicó al piso** |
| **Cotizador** | El motor cost-plus de Greenhouse (`src/lib/finance/pricing/`) | ✅ Existe, Full API Parity. **Se usó UNA vez** |

---

## El mercado

| Término | Qué es | El dato ✅ |
|---|---|---|
| **AI Overview (AIO)** | El resumen generado por IA arriba de los resultados de Google | **Aparece en el 48% de las búsquedas** |
| **CTR** | Click-through rate — qué % de los que ven, hacen clic | 🔴 **−58% en el #1 cuando hay AIO** *(hace 8 meses: −34,5%)* |
| 🔴 **CTR pagado** | El CTR de los anuncios | 🎯 **−68%.** **El dato que hace entrar al CFO** |
| **Zero-click** | Búsquedas que terminan sin clic a ningún sitio | **De 54% → 72%** en queries con AIO |
| 🎯 **Citación** | Aparecer **dentro** del resumen de IA / la respuesta del LLM | 🎯 **+35% clics orgánicos · +91% clics pagados** |
| **Tráfico referral de IA** | Visitas que llegan desde ChatGPT/Perplexity/etc. | 🔴 **1,08% del total.** 47-190× más chico que Google |
| **AEO / GEO** | Answer / Generative Engine Optimization — optimizar para ser citado | **El mercado lo cobra APARTE: USD 900+/mes** |

---

## La venta

| Término | Qué es |
|---|---|
| 🎯 **La cuña** | El AI Visibility Grader corrido gratis **antes** de pedir nada. **No es un lead magnet: es el motor de venta** |
| 🎯 **La cicatriz** | El daño que le dejó la agencia anterior. **El 100% de los prospectos con presupuesto la tiene** |
| **Descalificación honesta** | Decirle para qué **NO** le sirve. 🎯 **En esta categoría, es la venta más creíble del año** |
| **El puente** | La atribución honesta: *"las marcas citadas reciben +35%/+91%, y eso se mide en TU GA4"* |
| **Displacement** | Contra quién compites: freelancer · herramienta · in-house · agencia titular · **no hacer nada** |
| 🔴 **No hacer nada** | **El competidor #1.** El 40-60% de las pérdidas B2B son indecisión, no competencia (JOLT) |
| **Ventana de first-mover** | Que **ningún competidor del prospecto haya ganado el AEO todavía** *(SKY: ni JetSMART ni Flybondi)* |
| **Breakup** | El toque 5 del outbound: *"no te insisto más, el diagnóstico es tuyo"*. 🎯 **El que más reuniones produce** |
| **Contrato de expectativas** | Lo que se firma en el **mes 0** sobre qué se mueve y cuándo. **Evita el churn del mes 9** |
| **Caso citable** | Métrica verificable **+** relación sana **+** autorización. 🔴 **Hoy: CERO** |
| **Baseline** | La foto del punto de partida *(GA4 + GSC + Grader)*. 🔴 **Sin baseline no hay caso, nunca** |

---

## Frameworks heredados *(de `commercial-expert`)*

| Término | Qué es |
|---|---|
| **MEDDPICC** | El framework de calificación. Las 9 preguntas del discovery mapean a él |
| **JOLT** | **El 40-60% de las pérdidas B2B son indecisión, no competencia** |
| **Challenger** | Enseñar → adaptar → tomar control. **El reencuadre del mercado es Challenger puro** |
| **Command of the Message** | Anclar a **capacidades requeridas y outcomes**, no a listas de features |

---

## Las tres frases que hay que poder decir

> 🎯 **"Si tu problema es producir contenido, contrata al freelancer."**
> *(La que más deals cierra. Solo la puede decir el que no la necesita.)*

> 🎯 **"Cómprate Semrush, en serio. Lo que no vas a tener es qué hacer con el número."**
> *(Confirmar que la herramienta es buena te hace creíble. Negarlo te hace sospechoso.)*

> 🎯 **"Nadie sabe cuánto convierte el tráfico de IA. Quien te dé un ROI de AEO te lo está inventando."**
> *(Es lo que el comprador sospecha y nadie le confirma. Confirmárselo te compra la reunión entera.)*
