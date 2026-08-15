# El estado real de la práctica SEO/AEO — sin adornos

> **As-of 2026-07-13.** Fuente: operador + repo + benchmark de mercado verificado.
> 🔴 **Este documento existe para que ningún agente venda con una realidad que no tenemos.**

---

## 1. La cartera: dos clientes, y ninguno con método

| | **Berel** (MX) | **SKY** (CL) |
|---|---|---|
| Estado | **Cliente activo, facturando** | 🔴 **Licitación EN CURSO** (Wherex) |
| Precio | **52.000 MXN/mes** | **CLP 5.200.000/mes** *(plan base)* |
| **USD equivalente** | **≈ 2.965** | **≈ 5.591** |
| Alcance declarado | medición · portal · contenido · posteo · SEO técnico *"si necesitasen"* 🔴 | 8 artículos + SEO/AEO + multimedia + reportería + portal |
| **Loaded cost** | 🔴 **DESCONOCIDO** | CLP **2.260.000** (2,2 FTE) |
| **Piso** | 🔴 **NO EXISTE** | 🔴 **3.900.000 declarado → NO PASA la regla del 45%.** El piso real es **≈ CLP 4.602.000** *(45% + buffer 12% de penalidades/Wherex)* |
| **Margen** | 🔴 **NO SABEMOS** | **56%** (lista) · **42%** (piso) |
| Contrato | Sin cláusula FX conocida | **2 años, CLP, SIN reajuste** ⚠️ |

🔴 **Berel puede estar entre 63% y 18% de margen según cuántos FTE consuma. Nadie lo ha medido.**
→ tabla de sensibilidad completa en `modules/04_PRICING.md` § 1.

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
3. **Regalamos el AEO.** El mercado lo cobra **aparte, desde USD 900/mes** (37% de las agencias que subieron
   precio en 2025-26 lo hizo por esto). **Nosotros ya hacemos el trabajo.**

---

## 5. Contra el mercado: estamos baratos, y no por ser de LATAM

| | Mercado ✅ | Nosotros |
|---|---|---|
| Retainer SEO promedio | **USD 3.209/mes** | — |
| **Mid-market** | **USD 5.000-10.000** | 🔴 **Berel: 2.965** |
| **Enterprise** | **USD 10.000-50.000+** | 🔴 **SKY: 5.591** |
| Margen bruto sano | **50%+** *(bajo 40% = delivery roto; neto promedio ~13%)* | SKY 56% ✅ · **Berel: ?** 🔴 |
| Agencias **de nicho** | **40-75% bruto** — *la especialización compra el margen* | Estamos en la parte baja **sin razón** |

> 🎯 **No estamos baratos porque seamos de LATAM. Estamos baratos porque nunca miramos.**
> **Berel es un grupo industrial mexicano. SKY es una aerolínea. No son PyMEs sensibles al precio.**

---

## 6. Las cinco acciones, en orden

| # | Acción | Dueño | Impacto |
|---|---|---|---|
| **1** | 🔴 **Squad blueprint de Berel** — saber si ganamos o perdemos plata | Finance + Delivery | **Podría estar al 18%** |
| **2** | 🔴 **Arreglar la oferta de SKY** *(plan dominado + ad-hoc invertido)* — **está viva** | Comercial | Reputacional en una licitación |
| **3** | ✅ **Piso del 45% APROBADO (2026-07-13)** → **sembrarlo en el motor** | Dueño ✅ / Ingeniería | Convierte la política en gate automático |
| **3b** | 🔴 **URGENTE — corregir el piso de SKY: 3,9M → 4,6M** | Comercial | **A 3,9M cerramos al 35%. La negociación real es de CLP 598.000, no de 1,3M** |
| **4** | 🎯 **Desagregar AEO como línea propia** *(USD 900+/mes)* | Comercial | **+30% de revenue en Berel** |
| **5** | 🎯 **Conseguir el primer caso citable** *(Berel es el candidato)* | Delivery + Cliente | **Desbloquea vender con prueba** |

---

## 7. Lo que NO podemos decir todavía

🔴 **Ningún agente puede afirmar, hoy:**

- *"Hemos aumentado el tráfico de nuestros clientes un X%"* → **no hay caso verificado.**
- *"Somos líderes en AEO en LATAM"* → **no hay dato que lo sostenga.**
- *"Te garantizamos rankings"* → **nunca, con nadie.** Es la promesa que rompió la categoría.
- *"Ser citado por ChatGPT te va a generar X en ventas"* → 🔴 **no existe el modelo de atribución.**
  **Y decirlo en voz alta es el activo, no la debilidad.**
