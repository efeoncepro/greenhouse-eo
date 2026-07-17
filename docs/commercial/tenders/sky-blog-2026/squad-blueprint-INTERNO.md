# Squad Blueprint — SKY Airline · Blog (INTERNO)

> Documento **interno** de Efeonce (NO va a SKY). Diseña el pod que se asigna al cliente: roles, seniority, % dedicación, jerarquía, RACI y sinergias, con mapeo a nómina real para trazar el loaded cost. La versión de cara al cliente (roles + seniority, sin nombres ni nómina) vive en la §10 de la Oferta Técnica.
> Artefacto de la skill `greenhouse-talent-people-operator` → `references/client-squad-design.md`.

## 0. Encabezado

- **Cliente / engagement:** SKY Airline — Producción de Contenido Blog (SEO/AEO)
- **Modo:** **Managed Squad / Delivery Pod** (Efeonce arma y opera; SKY compra el servicio/outcome). *No es staff-aug: nadie incrusta bodies bajo dirección de SKY.*
- **Alcance que dimensiona el squad:** 8 artículos/mes + planificación editorial + SEO/AEO + imagen por artículo + multimedia (video simple + adaptación social) + reportería mensual.
- **Total FTE dedicado:** ≈ 2,2 FTE
- **Account Lead (interlocutor único):** Responsable de Cuenta (Senior)

## 1. Composición del squad (con mapeo a nómina)

| Rol (cliente) | Lane | Seniority | Responsabilidad | % dedic | Reporta a | Rol real en nómina |
|---|---|---|---|---|---|---|
| Responsable de Cuenta | Cuenta | Senior | Interlocutor único; accountable global | 12% | — | `[EST]` (no en subset nómina) |
| Estratega Editorial / SEO Lead | Estrategia/SEO | Senior/Lead | Owner línea contenido/SEO; grilla, keywords, autoridad temática | 20% | Account Lead | `[EST]` (Efeonce Digital) |
| Especialista SEO/AEO + Analítica | SEO/AEO + Datos | Senior | On-page, citabilidad IA, GA4/GSC, reportería, AI Visibility Grader | 25% | SEO Lead | `[EST]` (Efeonce Digital) |
| Editor / Redactor SEO | Contenido | Senior | Redacción + QA editorial | 50% | SEO Lead | **Creative Copywritter** (CLP 650.000) |
| Redactor de contenido | Contenido | Semi-senior | Producción de artículos | 40% | SEO Lead | **Creative Content Creator** (USD 327) |
| Dirección Creativa / QA de marca | Diseño | Lead | Estándar visual + consistencia de marca | 12% | Account Lead | **Creative Operations Lead** (USD 1.250) |
| Diseñador Visual | Diseño | Senior | Imágenes / gráfica por artículo | 30% | Dir. Creativa | **Senior Visual Designer** (USD 800) |
| Productor Audiovisual | Audiovisual | Senior | Videos simples | 15% | Dir. Creativa | **Senior Visual Designer** (USD 927) |
| Social Content Strategist | Social | Senior | Adaptación social (insumo, no gestiona cuentas) | 20% | Dir. Creativa | **Creative Social Media Strategist** (USD 800) |
| **Total** | | | | **224% ≈ 2,2 FTE** | | |

> **La columna de nómina es BASE DE COSTO por rol (referencial), NO un compromiso de personas.** La dotación del squad se hace desde la **capacidad disponible de Efeonce** (confirmado: los roles existen y hay holgura, 2026-07-11), y es un **equipo dedicado al blog** — **NO** las mismas personas del equipo de performance que Efeonce ya opera para SKY. Los montos de nómina se usan solo para estimar el loaded cost del rol.
> `[EST]` = roles cuya comp no está en el subset de nómina consultado; se estima a comp senior de mercado CL hasta fijar la dotación.
> **Gate de capacity:** aunque hay holgura confirmada, al asignar el equipo definitivo reconciliar cada % dedicación contra la capacidad libre real (ICO/skills-matrix) — nadie debe superar 100% sumando todos sus engagements.

## 2. Jerarquía (organigrama del pod)

```
Responsable de Cuenta (Account Lead)
├─ Estratega Editorial / SEO Lead        (Delivery Lead A)
│   ├─ Especialista SEO/AEO + Analítica
│   ├─ Editor / Redactor SEO
│   └─ Redactor de contenido
└─ Dirección Creativa / QA               (Delivery Lead B)
    ├─ Diseñador Visual
    ├─ Productor Audiovisual
    └─ Social Content Strategist
```

## 3. RACI por workstream

| Workstream | Responsible | Accountable | Consulted | Informed |
|---|---|---|---|---|
| Planificación editorial | Estratega/SEO Lead | Account Lead | SKY | squad |
| Producción de contenido | Editor + Redactor | Estratega/SEO Lead | Especialista SEO/AEO | Account Lead |
| SEO/AEO on-page | Especialista SEO/AEO | SEO Lead | Editor | Account Lead |
| Visual + multimedia | Diseñador + Productor AV | Dirección Creativa | Estratega | Account Lead |
| Adaptación social | Social Strategist | Dirección Creativa | Editor | SKY |
| Reportería | Especialista SEO/AEO (analítica) | SEO Lead | Account Lead | SKY |
| Relación con SKY | Account Lead | Account Lead | delivery leads | squad |

## 4. Sinergias (por qué es un sistema, no una lista)

- **Datos → Estrategia:** la reportería mensual (GA4/GSC + AI Visibility) alimenta la grilla del mes siguiente. Ningún mes empieza de cero.
- **Estrategia → Ejecución:** un solo mapa de keywords/intención briefea a editor y a especialista SEO/AEO desde una fuente.
- **Contenido → Visual → Social:** un artículo genera su imagen, su video y su átomo social en un mismo flujo (atomización), no tres producciones paralelas.
- **Account Lead** sostiene el contexto del cliente para que ninguna lane lo pierda.

## 5. Hand-offs

- **Loaded cost** (%dedic × costo/rol de nómina) → `greenhouse-finance-accounting-operator`. *(Ya calculado en la Parte C del borrador económico: loaded delivery ≈ CLP 2,26M/mes.)*
- **Margen / precio** → `commercial-expert` + 🔴 **`seo-aeo-practice` → `modules/04_PRICING.md`**.
  *(Precio FINAL de oferta: **CLP 5,2M/mes lista**, plan ampliado 6,9M. Loaded delivery ≈ 2,26M/mes.)*

  > 🔴 **DELTA 2026-07-13 — el piso de 3,9M queda DEROGADO. No pasa la política.**
  >
  > **El dueño aprobó un piso duro de 45% de margen bruto** (`seo-aeo-practice/modules/04_PRICING.md` § 4;
  > respaldo de mercado: **50%+ es el margen sano de una agencia; bajo 40% el delivery está roto**).
  >
  > | Escenario | Costo | **Piso a 45%** | Margen real si cerramos a 3,9M |
  > |---|---|---|---|
  > | Sin buffer | 2.260.000 | **4.110.000** | **42,1%** 🔴 |
  > | **Buffer 12%** *(penalidades 10-15% + Wherex)* | 2.531.200 | 🎯 **4.602.000** | 🔴 **35,1%** |
  > | Buffer 15% | 2.599.000 | 4.725.000 | 🔴 **33,4%** |
  >
  > 🔴 **PISO VIGENTE: CLP 4.600.000.** *(No 3,9M.)*
  > 🔴 **Margen de negociación real: CLP 598.000 (11%), no 1,3M (25%).**
  > **Creíamos tener el doble de espacio del que tenemos. Hay que saberlo ANTES de negociar.**
  >
  > ⚠️ **Y dos bugs vivos de la oferta económica, a corregir antes del cierre:**
  > **(1)** el plan **ampliado está dominado** — 12 art a 6,9M **cuesta 660.000 MÁS** que base + 4 ad-hoc
  > (6,24M); **un analista de compras lo ve en 30 segundos**. **(2)** el **ad-hoc (260k) es más barato que el
  > marginal del plan (425k)** — premiamos salirse del plan **y le entregamos al cliente la calculadora para
  > comoditizarnos**. **Fix: ad-hoc ≥ 550k, o mejor, sin precio unitario publicado.**
  >
  > *(Drift previo corregido 2026-07-11: una versión anterior citaba 4,9M/3,5M.)*

  > 🔴🔴 **DELTA 2026-07-14 — el piso de 4,6M TAMPOCO pasa. Es un piso de HOY, y el contrato es a DOS AÑOS SIN REAJUSTE.**
  >
  > Las Bases **imponen** tarifa fija en CLP **sin reajuste** (§3.2). Nuestra base de costo es **mixta**
  > (nómina CLP + contractors en USD) y **sube todos los años**. El margen se erosiona durante la vigencia,
  > en silencio. El piso hay que computarlo contra el **costo del año 2**, no contra el de hoy.
  >
  > | Inflación de costo | Costo año 2 *(con buffer 12%)* | Margen si cerramos a **4,6M** | **PISO real** *(45% en año 2)* | Espacio de negociación desde 5,2M |
  > |---|---|---|---|---|
  > | 3 % / año | 2.685.350 | 🔴 **41,6 %** | **4.882.000** | **318.000** |
  > | **4 % / año** | 2.737.746 | 🔴 **40,5 %** | 🎯 **4.978.000** | 🔴 **222.000** |
  > | 5 % / año | 2.790.648 | 🔴 **39,3 %** | **5.074.000** | 🔴 **126.000** |
  >
  > 🔴 **PISO VIGENTE: ≈ CLP 5.000.000.** *(No 4,6M. No 3,9M.)*
  > 🔴 **Espacio de negociación real: CLP 130.000 – 320.000. Prácticamente CERO.**
  >
  > **Consecuencia operativa, y es la que importa el 20/07** *(«reuniones de negociación» = documento
  > integrante de las Bases, §1.1 → hay BAFO):* **no tenemos palanca de precio. Necesitamos palanca de
  > ALCANCE.** La doctrina es explícita (`04_PRICING` §8): **nunca bajes el precio; baja el alcance.**
  >
  > ### 🎯 La carta del BAFO — plan reducido de 6 piezas (INTERNO, **NO se publica en la oferta**)
  >
  > La capa fija (estrategia, capa técnica, medición, portal, gobernanza = **69 %** de la dedicación) **no
  > escala con el volumen**. Solo escala la producción (**155 %**). Bajar de 8 a 6 piezas preserva el margen:
  >
  > | Capacidad | Precio | Loaded *(c/ buffer)* | Margen hoy | Margen año 2 | Promedio/pieza |
  > |---|---|---|---|---|---|
  > | **6 piezas** 🎯 *(carta BAFO)* | **4.300.000** | 2.093.325 | **51,3 %** ✅ | **47,3 %** ✅ | 716.667 |
  > | **8 piezas** *(propuesto)* | **5.200.000** | 2.531.200 | **51,3 %** ✅ | **47,4 %** ✅ | 650.000 |
  > | 12 piezas *(ampliado)* | 6.900.000 | 3.406.950 | 50,6 % ✅ | 46,6 % ✅ | 575.000 |
  >
  > **Marginal 6→8 = 450.000 · marginal 8→12 = 425.000** → **decreciente** (economías de escala sobre la capa
  > fija). **Ningún plan domina a otro.** ✅ La escalera es coherente y sobrevive la aritmética del comprador.
  >
  > 🔴 **El plan de 6 NO se publica.** Es lo que se cede en la ronda del 20/07 **a cambio de bajar alcance**,
  > no de regalar margen. Publicarlo en la oferta invita a SKY a tomar el más barato antes de negociar.
  >
  > ### ✅ Los tres bugs de `04_PRICING` §6 — CERRADOS en la oferta económica (2026-07-14)
  >
  > | Bug | Fix aplicado |
  > |---|---|
  > | **1 · Plan ampliado dominado** (base + 4 ad-hoc = 6,24M < 6,9M) | **Muerto**: ya no existe precio unitario con el que construir la alternativa |
  > | **2 · Ad-hoc invertido** (260k < marginal de 425k) | **Muerto**: el ad-hoc **se produce dentro de la capacidad mensual contratada** (ocupa un espacio del mes). **Cero precio unitario publicado** — regla dura #2 de `04_PRICING` |
  > | **3 · Sin reajuste a 2 años** | Las Bases **lo imponen** (§3.2) → no es negociable. **El buffer va en el precio**: por eso el piso real es 5,0M y no 4,6M *(ver tabla arriba)* |
  >
  > ⚠️ **Bug 4, nuevo, encontrado el 2026-07-14:** la oferta económica anterior publicaba *«valor referencial
  > de mercado ~CLP 600.000/mes»* para el multimedia — **una cifra sin fuente en un documento contractual**.
  > **Eliminada.** *(Regla: cero cifras sin fuente googleable.)*
- **Sección de equipo del bid** → `greenhouse-public-private-tenders`. *(Aplicado en §10 de la Oferta Técnica, roles + seniority sin nombres.)*
- **Reconciliación de capacity** → `greenhouse-ico` + `engagement-wellbeing.md`.
- **Demanda runtime** → `TalentDemand` (stakeholder=client, fulfillment=managed).
