# Contrato de métricas ICO

## Delta 2026-04-04 — TASK-223 formaliza la lane runtime inicial de aceleradores metodológicos

`TASK-223` no convierte todavía `Design System` ni `Brand Voice para AI` en productos visibles independientes, pero sí deja su primera lectura runtime defendible dentro del contrato `CVR`.

- regla vigente:
  - `Design System` se lee primero como acelerador `proxy`, apoyado en outcomes canónicos (`FTR`, `RpA`, `Cycle Time`, `Throughput`, `Iteration Velocity`)
  - `Brand Voice para AI` solo puede comunicarse como señal `observed` cuando exista `brand_consistency_score` auditado en `ico_engine.ai_metric_scores`
  - si falta score auditado, la lectura correcta es parcial o sin evidencia; no se reemplaza con heurísticas heroicas de portfolio
- implicaciones inmediatas:
  - `Creative Hub` debe enchufar esta lane al bloque `CVR` ya existente y no abrir una segunda narrativa enterprise
  - la conexión a `Revenue Enabled` sigue siendo policy-aware; estas capas no saltan directo a revenue observado
  - `Brand Consistency` visible debe priorizar el carril auditado antes de cualquier proxy local

## Delta 2026-04-04 — TASK-222 formaliza el contrato inicial de Creative Velocity Review

`TASK-222` deja el primer contrato runtime de `CVR` y lo baja a una surface client-facing real dentro de `Creative Hub`.

- el `CVR` ya no vive solo como doctrina documental:
  - existe contrato runtime inicial
  - existe matriz visible `Basic / Pro / Enterprise`
  - existen guardrails explícitos para narrativa client-facing
- regla vigente:
  - la visibilidad por tier sigue siendo un contrato editorial de comunicación
  - todavía no existe un entitlement runtime persistido para `Basic`, `Pro` o `Enterprise`
  - por lo tanto, el portal hoy puede mostrar la matriz y sus límites, pero no hacer hard-gating comercial real por tier
- implicaciones inmediatas:
  - `Creative Hub` pasa a separar explícitamente drivers operativos, métricas puente y `Revenue Enabled`
  - `Early Launch` sigue controlado por el contrato de `TTM`; si la scope no trae evidencia suficiente, debe quedar `unavailable`
  - `Iteration` y `Throughput` ya no pueden venderse como revenue observado cuando la evidencia siga en `proxy` o `estimated`

## Delta 2026-04-04 — TASK-221 formaliza el measurement model inicial de Revenue Enabled

`TASK-221` no convierte todavía `Revenue Enabled` en un KPI universal con monto total por tenant, pero sí cierra su primer contrato defendible de medición y atribución.

- `Revenue Enabled` ya debe leerse como un modelo con clases explícitas:
  - `observed`
  - `range`
  - `estimated`
- regla vigente:
  - `observed` exige linkage directo entre la palanca y un outcome real de revenue/performance
  - `range` exige señal operativa suficientemente observada + baseline comparable de revenue
  - `estimated` cubre señales operativas válidas que todavía no tienen baseline directo o que siguen en `proxy`
- implicaciones inmediatas por palanca:
  - `Early Launch` ya no puede inferirse desde `OTD`; depende de `TTM`
  - `Iteration` ya no puede inferirse desde `RpA` ni `pipeline_velocity`; depende del contrato canónico de `Iteration Velocity`
  - `Throughput` no puede vender el `throughput_count` actual como si ya fuera “campañas adicionales con revenue observado”; hoy esa palanca sigue estimada
- `Creative Hub` ya no debe presentar revenue habilitado desde benchmarks heurísticos locales; debe explicitar la clase de atribución y los límites de cada palanca

## Delta 2026-04-04 — TASK-220 formaliza el contrato inicial de Brief Clarity Score

`TASK-220` cierra el primer contrato runtime de `BCS` y de `brief efectivo` sin esperar al AI layer completo end-to-end.

- `Brief Clarity Score` ya puede servirse como contrato canónico project-level desde el score auditado más reciente en `ico_engine.ai_metric_scores`
- la lectura se combina con `governance` de Notion por `space`, usando estados `ready`, `degraded` y `blocked`
- el umbral operativo inicial de `brief efectivo` queda fijado en `>= 80/100` o `passed = true`
- `TTM` ya no debe tratar siempre el inicio como `proxy`: cuando existe `BCS` válido y fecha procesada, el evento de inicio puede viajar como evidencia `observed`; si no existe ese score, el fallback proxy sigue vigente
- la ausencia de score auditado no significa “brief malo”; significa que la lane sigue `unavailable` o `degraded` y no debe venderse como evidencia plenamente observada

## Delta 2026-04-04 — TASK-219 formaliza la source policy inicial de Iteration Velocity

`TASK-219` no cambia el rol conceptual de `Iteration Velocity` dentro de `Revenue Enabled`, pero sí cierra su primer contrato runtime para que deje de depender de heurísticas locales.

- `Iteration Velocity` significa capacidad habilitada por Greenhouse para que el cliente testee mas rapido en mercado; no equivale a `pipeline_velocity`, a conteo de comentarios ni a rondas de correccion
- la source policy inicial usa evidencia operativa de `delivery_tasks`:
  - `frame_versions`
  - `workflow_change_round`
  - `client_change_round_final`
  - `client_review_open`
  - `workflow_review_open`
  - `open_frame_comments`
- una iteracion util requiere evidencia de versionado / iteracion interna y ausencia de arrastre correctivo client-facing
- mientras no exista evidencia observada de mercado o ads-platform ligada a la iteracion, la metrica debe servirse como `proxy operativo` y `degraded`
- `Creative Hub` no puede volver a derivar `Iteration Velocity` desde `RpA`; cualquier consumer nuevo debe usar este contrato y no la heuristica legacy

## Delta 2026-04-04 — TASK-218 formaliza la source policy inicial de TTM

`TASK-218` no cambia la definición conceptual de `TTM`, pero sí cierra la primera policy runtime para servir la métrica con evidencia y sin vender como canónico lo que todavía es proxy.

- el evento de inicio (`brief efectivo`) ahora puede ser **observed** cuando existe un `BCS` válido; si no existe, sigue degradando a la jerarquía proxy previa
- la prioridad actual para inicio es: primera tarea en `briefing` -> `delivery_projects.start_date` -> `campaign.actual_start_date` -> primera tarea creada -> `campaign.planned_start_date`
- la prioridad actual para activación es: `campaign.actual_launch_date` -> primera tarea con evidencia de activación/publicación -> `delivery_projects.end_date` -> `campaign.planned_launch_date`
- `TTM` solo puede servirse como `available` cuando ambos extremos son observados; si usa `proxy` o `planned`, debe viajar como `degraded`, y si falta evidencia o hay inconsistencia temporal, como `unavailable`
- `pipeline_activation` sigue siendo señal útil de pipeline, pero no equivale por sí sola a evidencia canónica de salida real a mercado

## Delta 2026-04-03 — TASK-215 adds runtime RpA confidence policy

`TASK-215` no cambia la definición conceptual de `RpA`, pero sí formaliza que su lectura runtime debe viajar con policy de confianza y evidencia desde el `ICO Engine`.

- la métrica sigue significando `Rounds per Asset`
- el engine es quien clasifica la lectura como `valid`, `low_confidence`, `suppressed` o `unavailable`
- los consumers no deben reinventar localmente la interpretación de `0` o `null`
- cualquier surface que presente `RpA` debe respetar la naturaleza benchmark adaptada de la métrica y su estado de confianza

Esta delta no altera la tabla de benchmarks de la sección 7; solo aclara el contrato de consumo para no perder trazabilidad entre métrica y evidencia.

**Sistema de medición que conecta operación creativa con Revenue Enabled**

Documento ancla — Fuente de verdad del ecosistema de métricas

Metodología propietaria de Efeonce Group | Versión 1.0 | 2026

---

## 1. Propósito de este documento

Este documento es la **fuente de verdad canónica** del sistema de métricas que opera ICO (Intelligent Creative Operations) dentro de Globe by Efeonce. Define qué se mide, cómo se mide, cuándo se mide, qué significa cada resultado y cómo conecta con el impacto en negocio del cliente.

Cuando cualquier otro documento del ecosistema Efeonce haga referencia a métricas ICO, Revenue Enabled, o la cadena causal entre operación creativa y crecimiento, este documento es la referencia autoritativa.

### 1.1 Qué problema resuelve

Las métricas de producción creativa en la industria están rotas. La mayoría de las agencias miden piezas entregadas y satisfacción subjetiva. Los clientes miden performance de campaña (CTR, ROAS, conversiones) pero no la cadena operativa que produce esas campañas. El resultado: nadie conecta cómo se produce con cuánto se vende.

ICO resuelve esto con un sistema de medición en tres niveles que fluye de abajo hacia arriba: **drivers operativos** (lo que Globe controla) → **velocidad competitiva** (lo que el negocio siente) → **Revenue Enabled** (lo que el negocio gana).

> *La creatividad sin velocidad no compite. La velocidad sin medición no mejora. La medición sin conexión a negocio no justifica inversión.*

### 1.2 Documentos que derivan de este contrato

Las secciones de métricas en los siguientes documentos deben ser consistentes con este contrato:

| Documento | Sección que referencia métricas ICO |
|---|---|
| ICO — Intelligent Creative Operations v1 | Sección 4: Sistema de Métricas ICO |
| Globe Pitch Comercial ICO 2026 v3 | Cadena causal completa |
| Globe Pitch Comercial 2026 | Revenue Enabled / 3 palancas |
| Ecosistema Efeonce Group v5.3+ | Revenue Enabled: la cadena causal |
| ASaaS Strategy Efeonce 2026 | Métricas Operativas Core / Revenue Enabled |
| CSC Whitepaper Efeonce | KPIs de la cadena |
| Greenhouse Sistema Experiencia | Visibilidad de métricas por tier |

---

## 2. North Star Metric: Revenue Enabled

### 2.1 Definición formal

> **Revenue Enabled (RE)** es el revenue incremental que el cliente captura gracias a la velocidad creativa competitiva habilitada por Globe operando bajo ICO.

No es "entregamos a tiempo". Es: **el cliente gana más porque lanza antes, itera más y ejecuta más iniciativas.**

Revenue Enabled es una métrica ofensiva (crecimiento), positiva (dinero capturado), basada en hechos observables (fechas, campañas, performance, volumen de iniciativas) y conectada directamente con el claim de Efeonce: Empower your Growth.

### 2.2 Por qué Revenue Enabled y no Cost of Delay

Cost of Delay Avoided (CoDA) puede servir como métrica defensiva de soporte, pero como North Star es débil por cuatro razones:

- Es contrafactual: mide "lo que no pasó".
- Se percibe como cumplimiento mínimo: el cliente piensa "para eso te pago".
- Requiere baselines negativos para sonar bien.
- No escala a campañas no críticas.

Revenue Enabled invierte la narrativa: no es "evitamos que perdieras" sino **"ganaste más porque operamos mejor"**.

### 2.3 Las tres palancas de Revenue Enabled

Revenue Enabled se descompone en tres fuentes independientes pero acumulativas:

#### Palanca 1: Early Launch Advantage

Revenue habilitado por días ganados. Lanzar antes = más tiempo en mercado = más captura de demanda.

- **Indicador de soporte:** Time-to-Market (TTM)
- **Uso ideal:** Campañas estacionales, ventanas competitivas, lanzamientos.

#### Palanca 2: Iteration Velocity Impact

Revenue habilitado por mejora de performance gracias a iteraciones rápidas. Más tests = mejor ROAS.

- **Indicador de soporte:** Iteration Velocity, #tests, cadencia de variantes
- **Uso ideal:** Performance marketing, creatividades para paid, optimización continua.

#### Palanca 3: Throughput Expandido

Revenue habilitado por más iniciativas ejecutadas con la misma capacidad. Más campañas/mes.

- **Indicador de soporte:** Creative Throughput, capacidad liberada
- **Uso ideal:** Portafolios con alta carga operativa, equipos internos saturados.

### 2.4 Estructura de cálculo (alto nivel)

| Palanca | Fórmula | Supuestos requeridos |
|---|---|---|
| **RE Early Launch** | Días ganados × revenue diario estimado (o proxy de captura) | Revenue diario promedio de campaña comparable. Ventana de demanda definida por el cliente. |
| **RE Iteration** | Uplift de performance × revenue base de campaña | Baseline de ROAS/CTR antes de iteración. Revenue atribuible a campaña. |
| **RE Throughput** | Campañas adicionales × revenue promedio por campaña | Baseline de campañas/mes antes de Globe. Revenue promedio histórico por campaña. |

> *Regla de oro: Revenue Enabled se presenta en QBR como "RE observado" + "RE estimado (rango)" según disponibilidad de data. Supuestos siempre explícitos. Nunca se promete exactitud absoluta cuando la atribución no lo permite.*

### 2.5 Policy de observed / range / estimated

`Revenue Enabled` ya no debe viajar como una sola cifra sin clase de evidencia.

| Clase | Cuándo aplica | Qué permite decir | Qué NO permite decir |
|---|---|---|---|
| **Observed** | Existe linkage directo entre la palanca y el outcome económico o de performance relevante. | “Hay evidencia observada de impacto habilitado por esta palanca.” | No autoriza extrapolar a todo el trimestre o tenant sin el mismo linkage. |
| **Range** | Existe señal operativa suficientemente observada y un baseline comparable de revenue, pero no linkage causal directo completo. | “El impacto razonable cae dentro de este rango.” | No autoriza presentar una cifra puntual como verdad exacta. |
| **Estimated** | Existe señal operativa útil, pero la palanca sigue en proxy, sin baseline comparable o sin attribution layer defendible. | “Hay evidencia operativa que sostiene la hipótesis, pero el impacto económico sigue siendo estimado.” | No autoriza hablar de revenue observado. |

Aplicación vigente por palanca:

- **Early Launch**
  - usa `TTM` como señal puente obligatoria
  - si `TTM` no existe para la scope, la palanca queda `unavailable`
  - si `TTM` existe pero no hay linkage directo a revenue, la lectura es `range` o `estimated`, nunca `observed`
- **Iteration**
  - usa el contrato canónico de `Iteration Velocity`
  - mientras la iteración siga en `proxy operativo`, la palanca no puede declararse `observed`
- **Throughput**
  - el `throughput_count` actual mide output operativo, no todavía campañas adicionales o revenue incremental capturado
  - por lo tanto esta palanca debe leerse como `estimated` hasta que exista un carril de iniciativas incrementales atribuibles

Regla de consumer:

- ningún consumer debe volver a reconstruir `Revenue Enabled` desde benchmarks locales de industria, `OTD`, `RpA` o `pipeline_velocity`
- si la scope no tiene la métrica puente correcta, el estado correcto es `unavailable`, no una heurística heroica

---

## 3. Métricas de velocidad competitiva (nivel puente)

Estas métricas son el puente entre lo que Globe controla (drivers operativos) y lo que el negocio gana (Revenue Enabled). Miden lo que el negocio siente.

| Métrica | Definición | Fórmula / Fuente | Conexión con RE |
|---|---|---|---|
| **Time-to-Market (TTM)** | Días desde brief efectivo hasta asset activo en mercado. | Fecha de activación – Fecha de brief aprobado. Fuente: activación observada + `brief efectivo` observado cuando exista `BCS` válido; si no, fallback proxy de delivery/campaign. | TTM ↓ → Early Launch Advantage ↑ |
| **Creative Throughput** | Cantidad de iniciativas (campañas / paquetes de assets) ejecutadas por período. | Conteo mensual de campañas completadas. Fuente: Notion. | Throughput ↑ → Throughput Expandido ↑ |
| **Iteration Velocity** | Cuántas iteraciones útiles cerradas puede habilitar Globe para que el cliente testee más rápido en mercado. | Contrato inicial: iteraciones útiles cerradas / período (`30d`) usando `delivery_tasks.frame_versions`, `workflow_change_round`, `client_change_round_final` y señales de review. Ads-platform / mercado observado quedan como capa futura. | IV ↑ → Iteration Velocity Impact ↑ |
| **On-Time Delivery (OTD)** | Puntualidad real para cumplir el calendario del negocio. | Piezas entregadas on-time / total piezas. Fuente: Notion automático. | OTD ↑ → Early Launch Advantage ↑ (prerequisito) |

> *TTM y OTD son necesarias, pero el valor heroico está en adelantar, iterar y expandir throughput, no solo "cumplir". Cumplir es el baseline. Habilitar crecimiento es la promesa.*

---

## 4. Métricas operativas core (drivers)

Estas son las palancas que el equipo de Globe controla directamente. Se miden en tiempo real a nivel de pieza individual. No son métricas agregadas que se revisan una vez al mes: son indicadores vivos que permiten intervención inmediata.

| Métrica | Definición | Fórmula / Cálculo | Conexión causal |
|---|---|---|---|
| **OTD%** | % de piezas entregadas dentro del plazo del brief. | Piezas on-time / Total piezas × 100. Fuente: Notion automático. | OTD% ↑ → Early Launch Advantage → más días de captura de demanda. |
| **Cycle Time** | Tiempo promedio desde brief aprobado hasta pieza entregada. | Promedio de (Fecha entrega – Fecha brief aprobado). Fuente: Notion. | CT ↓ → Iteration Velocity ↑ → más tests, mejor ROAS. |
| **Cycle Time Variance** | Desviación del estándar. Detecta dónde está la fricción (interna vs. cliente). | Desviación estándar del CT por tipo de pieza. Fuente: Notion. | CTV alta → fricción no resuelta → oportunidad de mejora identificable. |
| **Rounds per Asset (RpA)** | Número promedio de rondas de revisión por pieza. | Total rondas / Total piezas. Fuente: Frame.io + Notion. | RpA ↓ → menor fricción → menor costo de producción → Throughput ↑. |
| **First Time Right % (FTR)** | % de assets aprobados en la primera ronda. | Piezas aprobadas en R1 / Total piezas × 100. Fuente: Frame.io + Notion. | FTR ↑ → RpA ↓ → CT ↓ → Throughput Expandido ↑. |
| **Brief Clarity Score (BCS)** | Score de completitud del brief validado de forma auditable. | Último score auditado en `ico_engine.ai_metric_scores` + governance por `space` desde Notion. Umbral operativo inicial: `>= 80/100` o `passed = true`. | BCS ↑ → FTR ↑ → menos iteraciones desde el origen. |

---

## 5. Cadena causal formal

Este es el mapa completo de cómo cada driver operativo conecta con cada palanca de Revenue Enabled. La cadena fluye de abajo hacia arriba: inputs de calidad generan velocidad competitiva que habilita revenue.

### 5.1 Flujo completo

**Nivel 1 — Inputs de calidad (proceso)**

Brief Clarity Score alto + Alineación cliente temprana + Utilización saludable del equipo (<80-85%).

**Nivel 2 — Palancas operativas (lo que Globe controla)**

BCS ↑ → FTR ↑ → RpA ↓ → Cycle Time ↓

**Nivel 3 — Velocidad competitiva (lo que el negocio siente)**

- Cycle Time ↓ → TTM ↓ (lanzas antes)
- RpA ↓ → Throughput ↑ (ejecutas más con la misma capacidad)
- FTR ↑ → Iteration Velocity ↑ (iteraciones sobre performance, no sobre correcciones)

**Nivel 4 — Revenue Enabled (lo que el negocio gana)**

- TTM ↓ → Early Launch Advantage ↑
- Iteration Velocity ↑ → Iteration Velocity Impact ↑
- Throughput ↑ → Throughput Expandido ↑

### 5.2 Tabla de conexiones directas

| Driver operativo | Impacta a | Que mueve | Habilitando RE | Dirección deseada |
|---|---|---|---|---|
| BCS | FTR | RpA, CT | Las 3 palancas | BCS ↑ |
| FTR% | RpA, CT | Throughput, IV | Throughput Expandido + IV Impact | FTR ↑ |
| RpA | CT | Throughput | Throughput Expandido | RpA ↓ |
| Cycle Time | TTM | Early Launch | Early Launch Advantage | CT ↓ |
| OTD% | TTM | Early Launch | Early Launch Advantage | OTD ↑ |

---

## 6. Capas metodológicas aceleradoras

ICO opera dos capas metodológicas que aceleran la cadena causal. No son productos standalone ni se venden por separado: son capacidades embebidas en el servicio de Globe que impactan directamente las métricas operativas.

### 6.1 Design System

Globe construye y opera un **Design System** para cada cliente como infraestructura visual que habilita consistencia, reutilización de componentes y velocidad de producción. No es un manual de marca en PDF. Es una biblioteca viva de componentes, tokens de diseño, templates y patrones que el equipo creativo usa para producir más rápido y con menos error.

En runtime Greenhouse, la primera instrumentación válida de esta capa no expone componentes, tokens ni artefactos internos. La lectura inicial conecta su efecto a outcomes canónicos del engine y por eso arranca como señal `proxy`, no como score metodológico autónomo.

**Impacto en métricas:**

| Métrica impactada | Cómo impacta | Mecanismo |
|---|---|---|
| **FTR% ↑** | Componentes pre-validados reducen errores de ejecución. | El creativo trabaja sobre una base aprobada, no desde cero. |
| **RpA ↓** | Menos correcciones de consistencia visual. | Los componentes ya cumplen guidelines. Las rondas se enfocan en concepto, no en ejecución. |
| **Cycle Time ↓** | Reutilización de componentes acelera producción. | No se rediseña lo que ya existe. Se adapta, se combina, se escala. |
| **Throughput ↑** | Misma capacidad produce más iniciativas. | Efecto acumulativo: menos tiempo por pieza = más piezas por período. |

**Qué se comunica al cliente:**
- **Sí se comunica:** "Globe construye tu infraestructura visual para que cada pieza sea consistente, rápida de producir y escalable."
- **No se expone:** Las bibliotecas de componentes, tokens de diseño, archivos fuente ni la mecánica interna del sistema.

### 6.2 Brand Voice para AI

Globe opera una metodología de **Brand Voice para AI** que codifica la voz, tono y estilo de cada cliente en un framework estructurado que permite que las herramientas de IA generativa repliquen esa voz de forma consistente y gobernada.

En runtime Greenhouse, esta capa se considera `observed` solo cuando exista `brand_consistency_score` auditado en `ico_engine.ai_metric_scores`. Si el score todavía no existe para la cuenta, la narrativa correcta es `sin evidencia` o `parcial`, no una reconstrucción heurística de consistencia de marca.

No es "usar ChatGPT para escribir". Es un proceso formal donde se audita la voz actual del cliente, se codifica en un framework de prompts estructurados, se testea contra los modelos del Multi-Model AI Studio, y se itera hasta lograr consistencia medible.

**Impacto en métricas:**

| Métrica impactada | Cómo impacta | Mecanismo |
|---|---|---|
| **FTR% ↑** | IA produce contenido on-brand desde el primer draft. | El framework de prompts incluye restricciones de voz, tono y estilo. El output ya suena como la marca. |
| **RpA ↓** | Menos rondas de corrección de tono y estilo. | Las correcciones se concentran en mensaje estratégico, no en "eso no suena como nosotros". |
| **Cycle Time ↓** | Ideación y primeros drafts más rápidos. | IA genera opciones que el copywriter refina, en vez de partir de página en blanco. |
| **Iteration Velocity ↑** | Más variantes de copy para testing en menos tiempo. | El framework permite generar variantes consistentes con la voz de marca rápidamente. |

**Qué se comunica al cliente:**
- **Sí se comunica:** "Globe codifica tu voz de marca para que la inteligencia artificial trabaje con tu identidad, no contra ella."
- **No se expone:** Los prompts específicos, las bibliotecas de voz, el stack de modelos ni la mecánica interna del framework.

> *Ambas capas metodológicas se instrumentalizan a través de ICO y se gestionan operativamente en Verk. No son productos standalone. Son lo que hace que Globe produzca con calidad predecible a velocidad industrial.*

---

## 7. Umbrales y targets

No todas las métricas de `ICO` tienen el mismo tipo de respaldo:

- `OTD%` tiene benchmark externo fuerte
- `FTR%` usa benchmark por análogo (`FPY` / `first-time error-free`)
- `RpA` usa benchmark creativo adaptado
- `Cycle Time`, `Cycle Time Variance` y `BCS` siguen siendo métricas con calibración principalmente interna por tipo de pieza, cuenta y contexto operativo

Por esa razón, el contrato distingue dos grupos:

### 7.1 Métricas con benchmark informado por referencias externas

Estas bandas quedan alineadas al criterio documentado en `Greenhouse_ICO_Engine_v1.md` § `A.5.5 Benchmarks externos y estándar recomendado para Greenhouse`.

| Métrica | World-class | Strong | Attention | Critical |
|---|---|---|---|---|
| **OTD%** | `>= 98%` | `95% - 97.9%` | `90% - 94.9%` | `< 90%` |
| **FTR%** | `>= 85%` | `70% - 84.9%` | `60% - 69.9%` | `< 60%` |
| **RpA** | `<= 2.0` | `> 2.0 y <= 3.0` | `> 3.0 y <= 4.0` | `> 4.0` |

Lectura correcta:

- `OTD%` adopta una referencia enterprise más exigente que el baseline previo del contrato
- `FTR%` no se lleva a niveles manufactureros (`95%+`) porque el trabajo creativo es más iterativo y subjetivo
- `RpA` se interpreta con benchmark creativo adaptado, no como estándar universal cross-industry

### 7.2 Métricas con calibración interna por cuenta o tipo de pieza

Estas métricas siguen calibrándose durante el mes 1 de baseline y pueden variar por cuenta, complejidad y categoría de contenido.

| Métrica | Saludable ✅ | Alerta ⚠️ | Crítico 🛑 |
|---|---|---|---|
| **Cycle Time** | Dentro del estándar por tipo de pieza | `+20–40%` sobre estándar | `+40%` sobre estándar |
| **Cycle Time Variance** | Baja dispersión (`DE < 30%` del promedio) | Dispersión media (`DE 30–60%`) | Dispersión alta (`DE >60%`) |
| **BCS** | `>= 80/100` | `60–79/100` | `<60/100` |

> *Los umbrales benchmark-informed y los umbrales internos no deben venderse como equivalentes. Una cuenta con contenido regulado (financiero, farmacéutico) o con alta complejidad de aprobación puede requerir calibraciones distintas en `Cycle Time`, `CTV` y `BCS`, pero no debería bajar arbitrariamente el estándar de referencia para `OTD%`, `FTR%` o `RpA` sin explicitar la excepción.*

---

## 8. Cadencia de medición

ICO mide en cuatro niveles de cadencia. Cada nivel tiene un propósito distinto y audiencia distinta.

| Cadencia | Nivel | Qué se revisa | Audiencia |
|---|---|---|---|
| **Tiempo real** | Pieza individual | OTD%, estado en pipeline, alertas de retraso, aprobaciones pendientes. | Equipo operativo Globe + cliente (vía Notion/Frame.io). |
| **Semanal** | Operativo | Cuellos de botella activos, proyectos atrasados, brief queue, capacidad vs. demanda. | Ops Lead Globe + Account Lead. |
| **Mensual** | Táctico | KPIs vs. mes anterior: OTD%, Cycle Time, FTR%, RpA. Volumen de producción. Tendencias. | Cliente (contacto operativo) + equipo Globe. |
| **Trimestral** | Estratégico | Revenue Enabled (3 palancas), calidad creativa, consistencia de marca, salud de relación, mejora continua. | Cliente (CMO/VP Marketing) + Director Globe + Managing Director Efeonce. |

---

## 9. Creative Velocity Review (CVR)

La **Creative Velocity Review** es el rito trimestral donde Globe presenta al cliente el impacto de la operación creativa en términos de negocio. Es el momento donde Revenue Enabled deja de ser una métrica interna y se convierte en una conversación de crecimiento con el cliente.

### 9.1 Estructura del CVR

1. **Resumen ejecutivo (5 min):** Revenue Enabled total del trimestre + tendencia vs. trimestre anterior.
2. **Las 3 palancas (10 min):** Desglose por Early Launch, Iteration Velocity, Throughput Expandido. Con casos concretos de campañas.
3. **Drivers operativos (10 min):** OTD%, FTR%, RpA, Cycle Time. Tendencias y mejoras implementadas.
4. **Capas metodológicas (5 min):** Evolución del Design System y Brand Voice para AI. Qué se construyó, qué se mejoró y qué outcomes canónicos ya sostienen esa lectura sin exponer IP interna.
5. **Plan de mejora continua (5 min):** 1-2 mejoras priorizadas para el próximo trimestre.
6. **Oportunidades de expansión (5 min):** Nuevos carriles de producción, formatos o mercados donde la velocidad creativa puede habilitar más revenue.

### 9.2 Reglas del CVR

- Siempre con datos reales. Nunca con estimaciones sin respaldo.
- Supuestos explícitos cuando la atribución no es directa.
- RE presentado como "observado" + "estimado (rango)".
- El CVR es también el momento para detectar oportunidades de cross-sell hacia otras unidades del ecosistema Efeonce.
- En runtime Greenhouse, el primer host visible del `CVR` es `Creative Hub`; hoy funciona como surface client-facing y no como publicación trimestral persistida independiente.
- La matriz `Basic / Pro / Enterprise` se trata hoy como contrato editorial de visibilidad. No existe todavía un hard-gating canónico por tier comercial en sesión, tenant context ni base de datos.

> *El CVR eleva la relación de proveedor a partnership de crecimiento. Es lo que diferencia a Globe de una agencia que manda un informe mensual de vanity metrics.*

---

## 10. Reglas de comunicación por tier de Greenhouse

No todos los clientes ven las mismas métricas. La visibilidad se escala según el tier de Greenhouse, alineado con el modelo ASaaS:

| Métrica / Nivel | Basic | Pro | Enterprise |
|---|---|---|---|
| **OTD%** | ✅ Visible | ✅ Visible | ✅ Visible |
| **RpA** | ✅ Visible | ✅ Visible | ✅ Visible |
| **Cycle Time** | — | ✅ Visible | ✅ Visible |
| **FTR%** | — | ✅ Visible | ✅ Visible |
| **Revenue Enabled** | — | ✅ Visible | ✅ Visible |
| **CVR trimestral** | — | ✅ Incluido | ✅ Incluido |
| **Benchmarks de industria** | — | — | ✅ Incluido |
| **Revenue Enabled comparativo** | — | — | ✅ Incluido |

---

## 11. Checklist de coherencia trimestral

Antes de cada Creative Velocity Review, el equipo interno valida:

1. ¿Estamos moviendo FTR hacia arriba y bajando RpA?
2. ¿Cycle Time está dentro del target por tipo de pieza?
3. ¿TTM bajó vs. trimestre anterior?
4. ¿Iteration Velocity subió?
5. ¿Throughput subió o se mantuvo con la misma capacidad?
6. ¿Tenemos un Revenue Enabled Story por cliente?
7. ¿El Design System evolucionó (nuevos componentes, mejoras)?
8. ¿Brand Voice para AI está calibrado con los últimos outputs?
9. ¿Los supuestos de RE son trazables y defendibles?
10. ¿Hay oportunidades de expansión identificadas para proponer en el CVR?

---

## 12. Glosario

| Término | Definición |
|---|---|
| **ICO** | Intelligent Creative Operations. Capa propietaria de Efeonce que habilita gobernanza, medición y automatización en la Creative Supply Chain. |
| **CSC** | Creative Supply Chain. Modelo operativo de referencia de industria (7 fases) que estructura cómo se produce contenido creativo. ICO opera sobre la CSC. |
| **Revenue Enabled (RE)** | North Star Metric. Revenue incremental que el cliente captura gracias a la velocidad creativa competitiva. |
| **OTD%** | On-Time Delivery Rate. % de piezas entregadas dentro del plazo del brief. |
| **Cycle Time (CT)** | Tiempo promedio desde brief aprobado hasta pieza entregada. |
| **RpA** | Rounds per Asset. Número promedio de rondas de revisión por pieza. |
| **FTR%** | First Time Right. % de assets aprobados en primera ronda. |
| **BCS** | Brief Clarity Score. Score de completitud del brief validado por AI Agent. |
| **TTM** | Time-to-Market. Días desde brief efectivo hasta asset activo en mercado. |
| **CVR** | Creative Velocity Review. Rito trimestral de presentación de Revenue Enabled al cliente. |
| **Design System** | Capa metodológica: infraestructura visual de componentes, tokens y patrones que habilita consistencia y velocidad. |
| **Brand Voice para AI** | Capa metodológica: framework que codifica voz, tono y estilo del cliente para que la IA generativa produzca contenido on-brand. |

---

**Efeonce Group SpA**

ICO — Intelligent Creative Operations™

Loop Marketing™ | Nested Loops™ | Creative Supply Chain + ICO

Chile | Colombia | México | Perú

*Este documento es propiedad intelectual de Efeonce Group SpA. Su reproducción total o parcial está prohibida sin autorización escrita.*
