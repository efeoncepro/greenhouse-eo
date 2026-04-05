# Research: Nexa Insights Layer — Análisis y Roadmap

> **Fecha:** 2026-04-05
> **Contexto:** Post-implementación de TASK-239 (prompt enrichment), TASK-240 (@mentions), TASK-241 (Cloud Run migration)
> **Autor:** Sesión de análisis Claude + Julio Reyes

---

## 1. Estado actual de Nexa Insights

### Dónde vive hoy

| Surface | Componente | Qué muestra | Alcance |
|---------|-----------|-------------|---------|
| Agency ICO tab | `NexaInsightsBlock` > `InsightCard` | 8 enrichments con explicación, acción, @mentions clickeables | Métricas delivery (OTD%, RpA, FTR%) a nivel Space |
| Nexa Chat (Home) | `NexaThread` + herramientas | Conversación AI con contexto operativo | Usa enrichments como input para respuestas |

### Señales AI que genera el ICO Engine

| Tipo | Qué detecta | Ejemplo |
|------|-------------|---------|
| **Anomaly** | Desviación estadística (z-score >= 2.0) | "FTR% cayó a 69% vs esperado 95%" |
| **Prediction** | Proyección lineal al cierre del mes | "RpA proyectado a 2.8 para fin de mes" |
| **Root Cause** | Atribución por dimensión (member, project, phase) | "53% de la desviación viene de Andrés en Campaña Q1" |
| **Recommendation** | Acción sugerida basada en root cause | "Redistribuir carga de Campaña Q1 o revisar briefs" |

### Métricas cubiertas: 3 de 11

Solo `otd_pct`, `rpa_avg`, `ftr_pct` generan señales AI. Las 8 métricas restantes (cycle_time, throughput, pipeline_velocity, etc.) tienen datos pero no generan señales.

### Dimensiones de root cause: 3

| Dimensión | Cómo se usa | Navegación |
|-----------|-------------|------------|
| `member` | Identifica al miembro que contribuye a la desviación | `/people/[memberId]` via @mention |
| `project` | Identifica el proyecto donde se concentra la anomalía | Chip no-clickeable (ruta pendiente) |
| `phase` | Identifica la fase CSC problemática | Sin navegación |

---

## 2. El problema: el 90% del portal no tiene narrativa inteligente

### Módulos sin insights (auditados)

| Módulo | Tiene métricas | Tiene narrativa AI | Gap |
|--------|---------------|-------------------|-----|
| Space 360 | Si (KPIs, charts, ICO) | No | Alto — vista ejecutiva sin "por qué" |
| Person 360 | Si (12-month trends, health zones) | No | Alto — datos ricos sin interpretación |
| Project Detail | Si (progress, RPA, OTD, reviews) | No | Alto — no explica bottlenecks |
| Home Dashboard | Si (operation status, shortcuts) | Parcial (chat) | Medio — no hay resumen proactivo |
| Finance Dashboard | Si (accounts, balances, FX) | No | Alto — números sin explicación |
| Campaign Detail | Si (budget, margin, TTM, team) | No | Alto — no conecta drivers |
| Payroll | Si (periods, compensation, expenses) | No | Medio — datos tabulares |
| HR Core | Si (leave, attendance, departments) | No | Medio — operacional, menos analítico |
| Client Pulse | Si (delivery signals, quality) | No | Medio — señales sin narrativa |

### Qué falta en cada caso

Todos los módulos muestran **qué** pasó (el número). Ninguno explica:
- **Por qué** pasó (causa raíz, drivers)
- **Qué implica** (impacto en cadena, riesgo downstream)
- **Qué hacer** (acción concreta, prioridad)

---

## 3. Propuesta: Nexa Insights como capa transversal

### Definición

**Nexa Insights Layer** = un sistema estandarizado donde cualquier módulo del portal puede:
1. Generar señales operativas (anomalías, predicciones, root causes)
2. Enriquecerlas con narrativa AI (LLM enrichment)
3. Mostrarlas en la UI con componentes reutilizables (NexaInsightsBlock, NexaMentionText)

### Beneficios

- **Consistencia:** cada módulo explica sus datos de la misma manera
- **Reutilización:** un componente UI, un pipeline LLM, un formato de mención
- **Escalabilidad:** agregar un nuevo dominio = crear signal detector + prompt domain-aware
- **Feedback loop:** el operador marca insights como útiles → calibra prompts futuros

### Componentes de la capa

```
SIGNAL SOURCES           LLM ENRICHMENT        UI COMPONENTS
─────────────            ──────────────         ─────────────
ICO Engine (existe)  ──► Cloud Run Worker  ──►  NexaInsightsBlock
Finance Engine (nuevo)   (Gemini 2.5 Flash)    NexaMentionText
Capacity Engine (nuevo)  Prompt domain-aware    NexaInsightCard
HR Engine (nuevo)        @mentions format       NexaDigestWidget
                         Cadena causal
```

---

## 4. Roadmap de expansión (priorizado)

### Tier 1 — Expandir insights a surfaces existentes (Q2 2026)

Reutilizan el pipeline LLM existente + señales ICO ya materializadas. Solo UI + reader scoped.

| # | Surface | Datos disponibles | Esfuerzo | Impacto |
|---|---------|------------------|----------|---------|
| 1 | **Space 360** | Enrichments por `space_id` | Bajo | Muy alto — vista ejecutiva principal |
| 2 | **Person 360** | Enrichments por `member_id` | Bajo | Alto — contexto individual |
| 3 | **Home Dashboard** | Top N enrichments cross-Space | Bajo | Alto — resumen proactivo |

### Tier 2 — Nuevos dominios de señales (Q3 2026)

Requieren nuevo signal detector + prompt domain-specific. Pipeline LLM se reutiliza.

| # | Dominio | Señales | Ejemplo de insight |
|---|---------|---------|-------------------|
| 4 | **Finance** | Anomalías de margen, cash flow, DSO | "El margen operativo cayó 6pp. Driver: +23% en tooling costs." |
| 5 | **Capacity** | Sobre/sub-utilización, burnout risk | "3 miembros del equipo Design están sobre 90% utilización." |
| 6 | **HR/Payroll** | Headcount anomalías, costo previsional | "El costo previsional subió 8% por nuevas contrataciones." |

### Tier 3 — Inteligencia cross-módulo (Q4 2026)

Requieren síntesis de señales de múltiples engines + nuevo formato de delivery.

| # | Capacidad | Descripción |
|---|-----------|-------------|
| 7 | **Narrativa ejecutiva semanal** | Digest consolidado por email con top insights cross-Space |
| 8 | **Cadena causal cross-dominio** | Conectar: "RpA ↑ correlacionado con ausentismo de 2 miembros" |
| 9 | **Feedback loop** | Operador marca "útil" / "no relevante" → calibra prompts |
| 10 | **Insights en Nexa Chat** | `NexaMentionText` en respuestas del asistente |

---

## 5. Impacto en tokens y costo

| Escenario | Señales/mes | Tokens input/señal | Costo LLM/mes |
|-----------|------------|-------------------|---------------|
| Hoy (ICO only) | ~15 | ~850 | ~$0.01 |
| Tier 1 (mismas señales, más surfaces) | ~15 | ~850 | ~$0.01 (sin costo adicional) |
| Tier 2 (Finance + Capacity) | ~50 | ~900 | ~$0.04 |
| Tier 3 (cross-módulo + digest) | ~80 | ~1,000 | ~$0.07 |

El costo de Gemini Flash es negligible (~$0.075/1M input tokens). El bottleneck no es costo sino **cobertura de señales** (más métricas monitoreadas = más insights valiosos).

---

## 6. Decisiones arquitectónicas

### Tabla de señales: unificada vs domain-scoped

| Opción | Pro | Contra |
|--------|-----|--------|
| **Tabla unificada** `nexa_signals` | Query simple, un reader | Schema genérico, difícil evolucionar |
| **Domain-scoped** (actual) | Cada engine controla su schema | Más tablas, readers por dominio |

**Recomendación:** mantener domain-scoped (como hoy). Cada engine conoce sus métricas. El LLM enrichment ya es genérico. La UI consume el contrato estándar `{ explanation, recommendedAction, severity, metricName }`.

### Prompt: uno genérico vs domain-aware

| Opción | Pro | Contra |
|--------|-----|--------|
| **Prompt genérico** (actual) | Simple, un template | No entiende contexto financiero vs delivery |
| **Prompt domain-aware** | Mejor calidad narrativa por dominio | Más templates que mantener |

**Recomendación:** evolucionar a domain-aware cuando se agreguen Finance/Capacity engines. Hoy el prompt genérico sirve bien para ICO.

### Frecuencia de materialización

| Surface | Frecuencia óptima |
|---------|-------------------|
| Agency ICO | Diaria (cron 3:45 AM) — ya implementado |
| Space 360 | On-demand al abrir el view — reader existente |
| Person 360 | On-demand — reader existente |
| Home Dashboard | Cada 6h o al login — widget ligero |
| Digest semanal | Semanal (lunes 7 AM) — Cloud Scheduler |

---

## 7. Tasks derivadas

| Task | Título | Prioridad | Esfuerzo | Dependencia |
|------|--------|-----------|----------|-------------|
| TASK-242 | Nexa Insights en Space 360 | P1 | Bajo | ninguna |
| TASK-243 | Nexa Insights en Person 360 | P1 | Bajo | ninguna |
| TASK-244 | Nexa Insights en Home Dashboard | P2 | Bajo | ninguna |
| TASK-245 | Finance Signal Engine | P2 | Alto | TASK-242 (valida patrón) |
| TASK-246 | Narrativa ejecutiva semanal | P2 | Medio | TASK-244 (valida widget) |
