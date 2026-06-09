# 06 · Glosario y Métricas (fuente de verdad para naming)

> **Autoritativo para nombres en código, UI y BD.** Si un string del producto contradice este glosario, el string está mal. Documento de autoridad upstream: **Contrato de Métricas ICO v1.0** + **Addendum v1.1 (Outcome)** + **Addendum v1.2 (SEO/AEO Manager)**. Donde hay inconsistencia conocida en el corpus, se marca ⚠️ con la resolución.

---

## A. El sistema ICO en 3 niveles

ICO mide en tres niveles que fluyen de abajo hacia arriba: **drivers operativos** (lo que el equipo controla) → **velocidad competitiva** (lo que el negocio siente) → **Revenue Enabled** (lo que el negocio gana).

> *La creatividad sin velocidad no compite. La velocidad sin medición no mejora. La medición sin conexión a negocio no justifica inversión.*

### Las dos cadenas causales

**Cadena de producción** (eficiencia — roles ejecutores):
```
BCS ↑ → FTR ↑ → RpA ↓ → Cycle Time ↓ → TTM ↓ → Revenue Enabled ↑
```

**Cadena de outcome** (efectividad — roles estratégicos/conceptuales):
```
Insight de mercado → Concepto → Ejecución → Distribución → Engagement → Outcome cliente → Revenue Enabled ↑
```

Ambas se cruzan en cada campaña: sin producción eficiente el concepto llega tarde; sin concepto acertado la producción perfecta no mueve métricas. ICO mide ambas con pesos distintos según el rol (ver sección D).

### Las cuatro dimensiones

Toda métrica ICO cae en una de cuatro dimensiones. Cada rol recibe un perfil de pesos sobre ellas que define su evaluación y su bono variable.

| Dimensión | Mide | Aplica con más peso a |
|---|---|---|
| **Production** | Eficiencia operativa: tiempo, calidad técnica, iteraciones, capacidad. | Ejecutores (diseño, motion, video) |
| **Concept** | Calidad del pensamiento creativo antes de ejecutar. | Roles conceptuales (redacción, estrategia) |
| **Outcome** | Impacto medible en el cliente una vez en mercado. | Roles estratégicos / de servicio |
| **Anticipation** | Capacidad de anticipar tendencias y capitalizarlas antes que la competencia. | Roles de strategy (AEO, social) |

> ⚠️ **Nota de inventario:** la memoria de marca habla de "17 siglas oficiales". El corpus consolidado (v1.0 + v1.1 + v1.2) lista **más de 17** una vez sumadas las extensiones por rol. Pendiente: definir qué subconjunto es el "canónico core" vs. extensiones por addendum. Mientras tanto, este archivo documenta el set completo.

---

## B. Glosario completo de siglas

### B.1 Drivers operativos / Production

| Sigla | Nombre canónico | Definición | Fuente | Dirección / Meta |
|---|---|---|---|---|
| **RpA** | **Rounds per Asset** | Rondas de revisión promedio por pieza. | Frame.io + Notion | ↓ · ≤1.5 (saludable) / ≤2 (ref. v1.1) |
| **OTD%** | On-Time Delivery Rate | % de piezas entregadas dentro del plazo del brief. | Notion (auto) | ↑ · ≥90% (≥95% para entregables de strategy) |
| **FTR%** | First Time Right | % de piezas aprobadas en primera ronda. | Frame.io + Notion | ↑ · ≥70% (≥85% ref. v1.1) |
| **Cycle Time** (CT) | Cycle Time | Tiempo promedio desde brief aprobado hasta entrega. | Notion | ↓ · dentro de estándar por tipo |
| **CTV** | Cycle Time Variance | Desviación estándar del CT. Detecta dónde está la fricción. | Notion | ↓ · DE <30% del promedio |
| **BCS** | Brief Clarity Score | Completitud del brief, validada automáticamente por AI Agent. | Notion + AI Agent | ↑ · ≥80/100 |
| **Stuck Assets** | Stuck Assets | Activos bloqueados o en riesgo que requieren intervención. | Notion | ↓ |
| **Utilización** | Utilization | % de capacidad efectiva sobre disponible. | Notion | 80–90% (sobre 85% = riesgo) |
| **ICR** | Indexation Coverage Rate | % de URLs estratégicas indexadas en Google sobre total del cluster. | Google Search Console | ≥95% |
| **TSH** | Technical SEO Health | % de issues técnicos críticos resueltos dentro de SLA. Solo cuando Wave gestiona la infra. | Semrush Site Audit + GSC | ≥90% |

### B.2 Concept

| Sigla | Nombre canónico | Definición | Meta |
|---|---|---|---|
| **BQS** | Brief Quality Score | Calidad del brief evaluada por quien lo recibe (Strategist/Redactor), escala 1–10. | ≥8/10 |
| **KSA** | Keyword/Entity Strategy Accuracy | % de keywords/entidades con volumen, intent y factibilidad documentados. | ≥85% |
| **AOR** | AEO Optimization Rate | % de piezas publicadas con schema, estructura citable y entity markup verificados. | 100% |
| **TAC** | Topical Authority Coverage | % de keywords/entidades del cluster donde el cliente aparece en top 10 (SEO) o como fuente citada (AEO). | Documentado / trimestral |
| **ASI** | Authority Signal Index | Score compuesto de menciones de marca ponderado por autoridad y citabilidad LLM. Compartida con Reach. | Documentado / trimestral |
| *(v1.1, sin sigla)* | Brief-to-concept fit · NPS de concept (interno) · Diversidad de territorios | Métricas cualitativas de calidad conceptual. | ≥4/5 · ≥8/10 · ≥3 territorios |

> ⚠️ **BCS vs BQS:** parecen solaparse. **BCS** (Brief *Clarity* Score) es automático, lo da el AI Agent, vive en la cadena de producción. **BQS** (Brief *Quality* Score) es evaluación humana del receptor del brief, vive en Concept. Mantener ambas siglas distintas hasta que el equipo confirme si una reemplaza a la otra. No las uses como sinónimos en código.

### B.3 Outcome

| Sigla | Nombre canónico | Definición | Meta |
|---|---|---|---|
| **OTL** | Organic Traffic Lift | Lift trimestral de tráfico orgánico vs. baseline (90 días previos). | ≥15% trimestral |
| **ACR** | AEO Citation Rate | Crecimiento trimestral de citaciones de marca en ChatGPT, Claude, Perplexity, Gemini. **Fuente de verdad: Otterly.ai** (50 prompts × 4 modelos × 4 corridas/mes). | ≥20% trimestral |
| **PVR** | Position Value Rate | Movimiento ponderado de posiciones en keywords de alto valor comercial. | Documentado |
| **MOR** | MQL Origin Rate | % de MQLs con first-touch atribuido a orgánico (SEO/AEO). | Documentado por cliente |
| **OPC** | Organic Pipeline Contribution | Pipeline atribuible a orgánico (last-touch) sobre pipeline total. | Documentado por cliente |
| **CNS** | Client NPS Score | NPS del cliente sobre el servicio recibido. | ≥8/10 |
| **SCS** | Stakeholder Confidence Score | Review trimestral del cliente: claridad de reportes, calidad estratégica, educación, defensibilidad. | ≥8/10 |
| *(v1.1, sin sigla)* | % campañas que cumplen objetivo de canal · Lift de métrica primaria · Revenue Enabled atribuido | Impacto de campaña en mercado. | ≥80% · ≥15% · Documentado |

### B.4 Anticipation

| Sigla | Nombre canónico | Definición | Meta |
|---|---|---|---|
| **TLA** | Trend Log Activity | Entradas mensuales documentadas sobre cambios de algoritmo, SERP, releases LLM, comportamiento de citaciones. | ≥4/mes |
| **TCR** | Trend Capitalization Rate | % de tendencias logueadas que se traducen en acción concreta. | ≥30% (≥50% hit rate en v1.1) |
| **RMC** | Roadmap Contribution | Contribuciones documentadas al roadmap AEO del ecosistema. | ≥1/trimestre |
| **Time-to-trend** | Time-to-trend | Días entre detección de tendencia y lanzamiento de pieza. | ≤14 días |

### B.5 Velocidad competitiva (nivel puente)

| Sigla | Nombre canónico | Definición | Conexión |
|---|---|---|---|
| **TTM** | Time-to-Market | Días desde brief efectivo hasta asset activo en mercado. | TTM ↓ → Early Launch Advantage ↑ |
| **Creative Throughput** | Creative Throughput | Iniciativas/campañas ejecutadas por período. | ↑ → Throughput Expandido ↑ |
| **Iteration Velocity** (IV) | Iteration Velocity | Iteraciones útiles (tests/variantes) por ciclo. | ↑ → Iteration Velocity Impact ↑ |

### B.6 Métricas de interfaz (NO son del colaborador — son de la unidad ejecutora)

Sirven para diagnóstico quirúrgico: si Outcome está rojo pero los inputs propios están verdes, el problema está río abajo en una unidad.

| Sigla | Nombre canónico | Unidad responsable | Definición |
|---|---|---|---|
| **BFR** | Brief Fidelity Rate | **Globe** | % de contenido publicado que respeta el brief SEO/AEO sin desviación crítica. |
| **TFR** | Technical Fidelity Rate | **Wave** | % de especificaciones técnicas implementadas según requerimiento y plazo. |
| **AFR** | Amplification Fidelity Rate | **Reach** | % de activaciones de signal/link building/PR que cumplen criterios SEO/AEO. |

---

## C. Umbrales de los drivers core

| Métrica | Saludable ✅ | Alerta ⚠️ | Crítico 🛑 |
|---|---|---|---|
| OTD% | ≥90% | 75–89% | <75% |
| Cycle Time | dentro de estándar | +20–40% | +40% |
| CTV | DE <30% | DE 30–60% | DE >60% |
| RpA | ≤1.5 | 1.6–2.5 | >2.5 |
| FTR% | ≥70% | 50–69% | <50% |
| BCS | ≥80/100 | 60–79/100 | <60/100 |

> Los umbrales se calibran en el mes 1 de baseline por cuenta. Una cuenta regulada (financiero, farma) tiene umbrales distintos a retail.

---

## D. Modelo de pesos por rol (alimenta el cálculo de bonos en payroll)

Cada rol recibe un perfil porcentual sobre las 4 dimensiones. **Esto es lo que define el bono variable mensual** — relevante para quien construya el scoring/payroll en Greenhouse.

| Rol | Production | Concept | Outcome | Anticipation |
|---|---|---|---|---|
| Senior Visual Designer | 60% | 30% | 10% | 0% |
| Motion / Video Designer | 65% | 25% | 10% | 0% |
| Redactor Creativo (Mid) | 15% | 45% | 30% | 10% |
| Creative Social Media Strategist | 10% | 25% | 50% | 15% |
| **SEO/AEO Manager** | 15% | 35% | 35% | 15% |
| **Head of Creative** (rol futuro) | 20% | 30% | 30% | 20% |

> ⚠️ **"Head of Creative", nunca "ICO Lead".** Los addenda v1.1/v1.2 todavía rotulan ese rol como "ICO Lead" en algunas tablas; la decisión vigente es **Head of Creative** (el propio v1.2 ya lo usa en gobernanza). Usa "Head of Creative" en código/UI.

**Cláusulas de excepción** (lógica de negocio a respetar si modelas el scoring): force majeure algorítmico (core update, release LLM → se congelan OTL/ACR/PVR del mes); tracking degradado (<80% confiabilidad → se neutralizan MOR/OPC y se redistribuye su 15% a OTL/ACR/CNS); bloqueo del cliente (>15 días hábiles → se congelan OTL/ACR). Cadencia de reponderación: semestral.

---

## E. Revenue Enabled (North Star) y sus 3 palancas

**Revenue Enabled (RE):** revenue incremental que el cliente captura gracias a la velocidad creativa competitiva. Métrica **ofensiva** (crecimiento), positiva (dinero capturado), no contrafactual. **No** es "entregamos a tiempo" — es "el cliente gana más porque lanza antes, itera más y ejecuta más iniciativas".

> **Por qué RE y no Cost of Delay Avoided (CoDA):** CoDA es contrafactual ("lo que no pasó"), se percibe como cumplimiento mínimo, requiere baselines negativos y no escala. RE invierte la narrativa: "ganaste más porque operamos mejor". CoDA solo sirve como métrica defensiva de soporte.

| Palanca | Qué habilita | Indicador de soporte |
|---|---|---|
| **Early Launch Advantage** | Días ganados → más tiempo en mercado → más captura de demanda. | TTM |
| **Iteration Velocity Impact** | Mejor performance por iterar rápido → mejor ROAS. | Iteration Velocity, #tests |
| **Throughput Expandido** | Más iniciativas con la misma capacidad. | Creative Throughput, capacidad liberada |

Se presenta en QBR/CVR como "RE observado" + "RE estimado (rango)", supuestos siempre explícitos.

---

## F. Métricas de negocio / GTM

| Término | Definición |
|---|---|
| **Revenue Enabled** | Framing primario de valor (ver sección E). North star de atribución. |
| **Pipeline Enabled** | Pipeline atribuible a la operación de Efeonce. |
| **NRR** | Net Revenue Retention. **Métrica reina** del modelo de expansión. Meta **>110%** (Q3 2026). |
| **Win rate** | ~50% en cuentas existentes; 2–3% en new business frío. |
| **Core Pipeline** | Trato directo, relación previa, control comercial. Win rate hist. 43%+. Único bucket en forecast. |
| **Strategic Bets** | Licitaciones / new business de menor control. Win rate ~0%. Upside, no forecast. |
| **Opportunistic** | Pequeñas/administrativas. No entran a pipeline. |

> **Regla de marca:** lideramos con métricas de **impacto** (Revenue Enabled, Pipeline Influenced, NRR, CAC), nunca con métricas de **actividad** (impresiones, reach). La actividad es contexto, no protagonista (ver `05`).

---

## G. Bow-tie Efeonce (lifecycle + expansión)

NRR >110% como métrica reina. Arquitectura HubSpot: **7 lifecycle stages** (contactos), **12 lifecycle stages** (companies, segmentación post-venta), **4 propiedades booleanas de motion** en empresa: `is_in_expansion` · `is_in_renewal` · `is_at_risk` · `is_advocate` (+ `is_advocate_individual` en contacto).

> Los **internal names exactos** de los 19 stages y las properties (de deals y de motion) están en `11_hubspot-bowtie`. Úsalos textualmente para el sync de Account 360.

> Principio de diseño: los motion states son **booleanos sobre el lifecycle stage**, no etapas que lo reemplacen. Ej.: Sky Airlines en crisis de renovación sigue siendo "Active Account" con `At Risk = true`, no se convierte en "At Risk". Respétalo en Account 360 / Pulse.

---

## H. Visibilidad de métricas por tier de Greenhouse

La visibilidad se escala por tier (alineado con el modelo ASaaS). **Directamente relevante para los capability flags por tenant.**

| Métrica / Nivel | Basic | Pro | Enterprise |
|---|---|---|---|
| OTD% | ✅ | ✅ | ✅ |
| RpA | ✅ | ✅ | ✅ |
| Cycle Time | — | ✅ | ✅ |
| FTR% | — | ✅ | ✅ |
| Revenue Enabled | — | ✅ | ✅ |
| CVR trimestral | — | ✅ | ✅ |
| Benchmarks de industria | — | — | ✅ |
| Revenue Enabled comparativo | — | — | ✅ |

> **Lo que materializa Greenhouse hoy** (vía ICO Engine → dashboard cliente + Person 360 + bonos de payroll): RpA, OTD%, FTR, Cycle Time, Stuck Assets. El resto del sistema (4 dimensiones completas, scoring por rol, Outcome/Anticipation) es la dirección de expansión del producto conforme se exponen más métricas al cliente.

**Cadencia de medición ICO:** tiempo real (pieza) · semanal (operativo) · mensual (táctico + cálculo de bono) · trimestral (estratégico = CVR/Creative Velocity Review).

---

## I. Frameworks propietarios (nombres exactos)

| Nombre | Qué es | Cuidado |
|---|---|---|
| **Loop Marketing** | Filosofía: crecimiento compuesto. Express → Tailor → Amplify → Evolve. | — |
| **Nested Loops™** | Metodología para operar Loop Marketing. | Lleva ™. |
| **Surround Discovery™** | Visibilidad en 5 superficies. Motor **S⁴: SENSE → SHAPE → SURFACE → SOLVE**. | SOLVE es la 4ª fase, no un framework suelto. |
| **Surround Strategy™** | Marco de Reach: superficies Owned, Amplified, Earned, Dark. | Lleva ™. |
| **CSC** | Creative Supply Chain: 7 fases de producción. ICO opera sobre la CSC. | — |
| **ICO** | Intelligent Creative Operations: capa de inteligencia operativa transversal. | Transversal a las 4 unidades, no solo Globe. |
| **Design System** (capa ICO) | Infraestructura visual de componentes/tokens que sube FTR, baja RpA/CT. | Capacidad embebida, no producto standalone. |
| **Brand Voice para AI** (capa ICO) | Framework que codifica voz para que la IA generativa produzca on-brand. | Capacidad embebida, no producto standalone. |
| **ASaaS** | Agency Service as a Software. | — |
| **AEO** | **AI Engine Optimization** | Posicionamiento en motores de IA (ChatGPT, Claude, Perplexity, Gemini). **No** "Answer Engine Optimization". Medición: Otterly.ai. |
| **IDD** | Intelligence-Driven Development | Metodología propietaria de Wave. |
| **SOLVE** | Framework de medición y accountability. | 4ª fase del motor S⁴. |
| **CVR** | Creative Velocity Review | Rito trimestral donde se presenta Revenue Enabled al cliente. |

---

## J. Nombres de producto, casos y constantes

**Producto/marca:** `Greenhouse` (nunca "Greenhouse EO") · `Kortex` · `Verk` · `Nexa` (capa AI de Greenhouse: Nexa Insights + Nexa Chat; **nunca "Nexus"**, sub-marca deprecada) · Globe · Globe Studio · Efeonce Digital · Reach · Wave.

**Casos citables (reales):** Sky Airlines · Bresler · Pinturas Berel · SSilva Activos Inmobiliarios.
**Prohibido:** ❌ GEA Grupo / GEA Ambiental (prospecto que nunca cerró; "+340% leads" es métrica falsa).

| Constante | Valor |
|---|---|
| Portal HubSpot Efeonce | `48713323` |
| Owner — Julio | `75788512` · Owner — Luis (BDR) `86856220` |
| GCP data lake (BigQuery) | `efeonce-group` · datasets `greenhouse`, `notion_ops`, `kortex`, `verk`, `hubspot_crm`, `searchconsole`, `analytics_*` |
| GCP Kortex | `efeonce-kortex-dev` |
| Schemas PostgreSQL Greenhouse | `core`, `finance`, `hr`, `payroll`, `sync`, `serving` |
| Tenant key Greenhouse | `space_id` → `company_id` (HubSpot), `portal_id` (Kortex), `brand_id` (Verk) |
| Dominio del portal | `greenhouse.efeoncepro.com` · agencia `efeoncepro.com` (`efeonce.com` obsoleto). Leer de env var (`NEXT_PUBLIC_APP_URL`); no hardcodear. |

---

*Fuentes de autoridad: Contrato de Métricas ICO v1.0 · Addendum ICO v1.1 (Métricas Outcome) · Addendum ICO v1.2 (SEO/AEO Manager) · Arquitectura Bow-tie v1.1 · GTM 2026 · Product Ecosystem v1.0. Ante un nombre nuevo, este archivo manda.*

*Última verificación de drift contra runtime: 2026-06-09 (TASK-1064) — sin claims de runtime hardcodeados; targets/fechas comerciales son intencionales.*
