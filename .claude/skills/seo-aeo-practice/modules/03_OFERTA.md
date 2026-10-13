# 03 · Oferta — referencia de categoría con representación fiel

Canon: `docs/operations/SEO_AEO_CATEGORY_LEADERSHIP_OPERATING_MODEL_V1.md` (2026-10-12).
El método actualiza objetivo, prueba y compromisos; no aprueba nuevos precios, packaging o disponibilidad.

## 1. Qué objetivo proponemos

Ser descubiertos, comprendidos y considerados como opción de referencia para una categoría, comprador,
situación de compra y mercado delimitados. Liderazgo es aspiración estratégica; no se promete una posición,
selección del motor ni superioridad sin evidencia. Entrar por SEO/AEO cuando ese es el problema reconocido
por el comprador y explicar el alcance con sus necesidades y pruebas.

La presencia de una marca ante consultas non-brand es descubrimiento genérico, incluso si no hay clic.
Conservar tráfico branded/non-brand y su intención; no vender el abandono del tráfico genérico, el blog
ni un supuesto 90–95% branded universal. Fuente, mención, fidelidad y recomendación son resultados distintos.

## 1.5 Qué trabajo se contrata

Investigar decisiones de compra y cobertura, revisar fundamentos técnicos, convertir capacidad en pruebas
útiles, hacer comprensible la marca, distribuir evidencia autorizada, medir y corregir. El orden responde
al diagnóstico; no imponer el mismo volumen editorial, formato o todos los canales a cualquier cliente.

Relacionar cada brecha con acción, owner, dependencia, aceptación y resultado a observar. La cantidad de
piezas delimita capacidad cuando corresponda; no es la unidad de valor ni prueba de liderazgo.

## 2. Cómo explicarlo al comprador

> «Trabajamos para que tu empresa sea descubierta y comprendida como una opción pertinente cuando tus
> compradores buscan resolver [necesidad]. Empezamos por [brecha verificada], construimos [prueba/acción]
> y evaluamos presencia, representación y avance comercial con fuentes y límites visibles».

Adaptar a la evidencia de la cuenta. Distinguir la aspiración compartida de los entregables contratados.
No presumir caída de tráfico, mala experiencia anterior ni ahorro en paid. Un estudio externo de CTR no
promete recuperar clics para ese prospecto. Referencias/conversiones pueden medirse; causalidad exige
un diseño defendible y no se deduce de simultaneidad.

---

## 3. La arquitectura de la oferta (las 4 capas)

**Espeja la arquitectura de precios de `04_PRICING` § 3. No son dos cosas: son la misma, vista desde la venta.**

### Capa 0 — 🎯 **El diagnóstico. GRATIS.**

**El AI Visibility Grader, corrido sobre SU marca, en su cara.** → `05_CUNA_GRADER.md`.

🔴 **No es un lead magnet. Es el motor de venta.** En una categoría con déficit de confianza,
**regalarle la evidencia antes de pedirle plata es lo único que te separa del que le falló.**

---

### Capa 1 — **La fundación.** Proyecto, precio fijo, con fin.

**SEO técnico · entidad / Knowledge Graph · schema · arreglo de la base.**

🔴 **NUNCA va gratis dentro del retainer.**
🎯 **Regalarla le enseña al cliente que no valía nada — y es lo que hace que el retainer funcione.**

*"Antes de producir una línea de contenido, hay que arreglar la casa. Si no, estás poniendo muebles en un
edificio sin cimientos."*

---

### Capa 2 — **La operación.** Retainer, por **capacidad declarada**.

Estrategia editorial · producción · publicación · on-page · citabilidad.

🔴 **El conteo de piezas es un BORDE del alcance, no la unidad de valor.**
**NUNCA publiques un precio por artículo** *(→ `04_PRICING` regla dura #2: es entregarle la calculadora)*.

```
❌ "8 artículos/mes = X"
✅ "Operación de visibilidad de [marca] en [Google + IA] para [mercado] = X.
    Incluye capacidad de hasta 8 piezas/mes."
```

---

### Capa 3 — 🎯 **La plataforma.** Suscripción. **EL ANCLA.**

**El portal + ICO + la medición.**

> **"Puedes entrar cualquier día y ver qué hicimos, qué se publicó, qué se movió y qué no —
> sin pedirnos un reporte y sin tener que creernos nada."**

🎯 **Esto NO es "medición" (eso lo regala Semrush). Es transparencia como producto.**
La transparencia permite evaluar trabajo, cobertura y pendientes; no presupone una mala experiencia
previa de todos los compradores.

🔴 **Es lo único que un freelancer no puede tener. NUNCA se descuenta.**

### 🔴 Pero cuidado — la plataforma HOY solo existe para AEO

**Auditado 2026-07-13** *(→ `12_ACTIVOS.md` § 2)*:

| | ¿Existe en el portal? |
|---|---|
| 🎯 **AEO** *(el Grader: 7 dimensiones · 14 probes · 5 motores · **el reporte del cliente en `/aeo`**)* | ✅ **Live en producción** |
| 🔴 **SEO** *(rank tracking · site audit · backlinks · E-E-A-T · reportería)* | 🔴 **Nada visible al cliente.** *(Delta 2026-08-05 fin de día: EPIC-022 ya tiene motor — schema `greenhouse_growth.seo_*` + entitlement per-org (clave viva **`seo_v2`** desde el cutover de TASK-1677; `seo_v1` quedó CERRADA y no tiene assignments vigentes)/chokepoint (TASK-1299/1301), registry DataForSEO + ledger (TASK-1300), materializer GSC LIVE + `readKeywordOpportunities` (TASK-1302), cruce SEO↔AEO real `readSeoAeoGap`/quadrant 360 (TASK-1305) y 3 MCP tools **live en producción** (TASK-1645 + TASK-1647 complete 2026-08-06: el provider `greenhouse-seo` sirve en `mcp.efeonce.org`). **Y rank tracking real EN PRODUCCIÓN** — TASK-1303 complete 2026-08-06, release `fcee5ab9f7ce`: serie diaria de posiciones exactas con AI Overview presence por keyword (cron `ops-seo-rank-capture` 05:00 CLT, día 1 = Berel 31 keywords), consultable por `readRankEvolution` y la 4.ª MCP tool `get_seo_rank_evolution`. Operable por MCP de verdad, rumbo Wave. **Delta 2026-08-07 — ya hay COCKPIT INTERNO, y sigue sin haber cara de cliente:** TASK-1306/1307/1308 complete → el equipo entra a `/admin/growth/seo` (overview, rank & URL performance, mapa de oportunidades de keyword) y **puede seguir/dejar de seguir keywords** desde la pantalla; el inventario MCP del dominio SEO subió a **21 lecturas + 7 escrituras** (verificado contra `src/mcp/greenhouse/tool-manifest.ts` el 2026-08-31; escrituras `track_seo_keywords`/`untrack_seo_keywords`, TASK-1308, federadas y hoy fail-closed hasta el cliente OAuth con grant revocable de TASK-1631; la 10.ª lectura es `get_seo_keyword_market_data`, TASK-1661 complete y en producción — volumen de búsqueda y barrera de enlaces por keyword, con `as-of` obligatorio). Eso mejora lo que el EQUIPO puede reportarte, no lo que el cliente ve solo. **La superficie autoservicio del cliente sigue sin existir — la advertencia de abajo sigue vigente**)* |
| Search Console | ⚠️ Panel de conexión — **staging ON, producción OFF** |

> 🔴 **Cuando vendes un retainer de SEO y dices *"puedes entrar al portal y ver todo"*, para SEO eso todavía
> NO es cierto. NO lo prometas.**

🎯 **Y la versión honesta vende igual de bien:**

> *"En visibilidad de IA te doy transparencia total: entras cualquier día y ves los siete ejes, los cinco
> motores y qué se movió. **En SEO todavía te doy el reporte del equipo** — la capa de autoservicio está en
> construcción, **y cuando salga la tienes sin costo adicional.**"*

🔴 **Decirlo así te cuesta cero y te ahorra la promesa que después no puedes cumplir.**

---

### Capa 4 — **La expansión.** La palanca de crecimiento.

| Se expande por… | NO por… |
|---|---|
| ✅ **+ mercado** *(Berel MX → CO)* | 🔴 **+ artículos** |
| ✅ **+ idioma** | |
| ✅ **+ marca / submarca** | |
| ✅ **+ superficie** *(Google → +IA → +Reddit/YouTube → + tiendas de apps si el cliente tiene app: `14_ASO_COMPLEMENTARIO.md`)* | |

🎯 **Expandir por superficie es lo que convierte "SEO" en "visibilidad" — y lo que justifica el precio de
enterprise.**

---

## 4. Lo que hoy está mal empaquetado

| Hoy | 🔴 El problema | Fix |
|---|---|---|
| *"medición + portal + contenido + posteo + SEO técnico si necesitasen… etc"* | 🔴 **El "etc" no tiene borde.** Las expectativas se expanden, las horas se expanden, **el margen se evapora — y churnean igual** | **Lista cerrada.** Cero "etc" |
| **El AEO va gratis adentro** | 🔴 **El mercado lo cobra aparte desde USD 900/mes** *(37% de las agencias que subieron precio lo hizo por esto)* ✅ | **Línea propia** |
| **El portal va gratis adentro** | 🔴 **Es nuestro mayor diferenciador y lo regalamos** | **Suscripción, línea propia, nunca descontada** |
| **La fundación va adentro** | 🔴 **El cliente cree que no valía nada** | **Proyecto aparte, con fin** |
| **El precio es por artículo** | 🔴 **Es lo que la IA está abaratando.** Le entregamos la calculadora | **Capacidad declarada** |

🎯 **Los cinco arreglos son de empaquetado, no de producto. El trabajo ya lo hacemos.**

---

## 5. La oferta escrita (el shape)

```
DIAGNÓSTICO                                              GRATIS
  AI Visibility Grader sobre tu marca + prescripción

FUNDACIÓN (una vez)                                      USD X
  Técnico · entidad · schema · citabilidad de base

OPERACIÓN DE VISIBILIDAD (mensual)                       USD Y
  Estrategia · producción · publicación · on-page
  Capacidad: hasta N piezas/mes
  Superficie: Google + motores de IA

PLATAFORMA (mensual)                                     USD Z     ← nunca se descuenta
  Portal + ICO + medición continua
  "Ves lo que hacemos sin tener que creernos"

EXPANSIÓN (opcional)
  + mercado · + idioma · + marca · + superficie
```

🔴 **Sin "etc". Sin precio por artículo. Sin promesa de rankings. Sin ROI de AEO inventado.**

---

## 6. Reglas duras

1. **Conecta visibilidad y representación con una necesidad pertinente.** La puerta SEO/AEO y el diagnóstico dependen del estado de la cuenta.
2. 🔴 **Cero "etc" en el alcance.** Lista cerrada o no hay oferta.
3. 🔴 **El AEO es línea propia.** El mercado lo cobra aparte. **Nosotros lo regalamos y es el único que no.**
4. 🔴 **El portal es línea propia y NUNCA se descuenta.**
5. 🔴 **La fundación nunca va gratis.** Regalarla la devalúa.
6. 🔴 **Nunca precio por artículo.**
7. 🔴 **Nunca outcome-based** *(→ `04_PRICING` § 9 y `01_MERCADO` § 3)*.
