# 06 · Benchmark Design

Un benchmark mal diseñado es peor que ninguno: da falsa confianza y decisiones equivocadas con apariencia de rigor. El diseño ES la credibilidad. Antes de recolectar un solo dato, define el **framework**: entidad, peer set, métricas, normalización.

## Los 4 pilares del diseño (define TODOS antes de medir)

### 1. Entidad y objetivo
- ¿Qué se benchmarkea? (Efeonce, un cliente, un competidor, un canal).
- ¿Contra qué? (pares, un estándar/best-practice, tu propio pasado).
- ¿Qué **decisión** habilita el gap? (invertir, reposicionar, corregir). Sin decisión, no benchmarkees.

### 2. Peer set (la decisión más importante)
El peer set define si el benchmark es justo o basura. Reglas (as-of 2026):
- **6–12 pares que el cliente realmente compara** (cross-shop), no una lista de "rivales" aspiracionales o irrelevantes.
- **+ 1–3 best-in-class** como analógos de referencia (aunque no compitan directo) para ver el techo.
- **Comparabilidad real:** mismo perfil (tamaño, geografía, modelo, trade lane/vertical). Comparar Efeonce con una agencia global de 5.000 personas no es justo ni útil.
- Para segmentación fina, un **código de industria de 4 dígitos** (NAICS/SIC) da grupos más limpios que uno de 2 dígitos.
- **Declara el peer set y el porqué.** La transparencia del peer set es lo primero que un cliente escéptico revisa.

### 3. Métricas (qué mides y por qué)
- **5–8 métricas primarias** (no 40 — el ruido mata la señal). Elige las que conectan con la decisión.
- Mezcla **outcome** (resultado: share, conversión, revenue) + **driver** (lo que lo mueve: presencia, velocidad, calidad).
- Cada métrica con **definición explícita** (qué cuenta y qué no). "Engagement" sin definición es incomparable entre fuentes.
- Prefiere métricas **observables y verificables** externamente cuando comparas competidores (no puedes ver su CRM, pero sí su presencia digital, pricing público, reviews, contrataciones, AI Share of Voice).

### 4. Normalización (comparación justa)
Sin normalizar, comparas peras con manzanas:
- **Moneda** (a una base común), **estacionalidad** (mismo período), **mix de canal/producto**, **tamaño** (usa ratios/per-unit, no absolutos: revenue per employee, costo por lead, share %).
- **Definiciones alineadas** entre fuentes (que "lead" signifique lo mismo).
- Crea **unidades comparables** (por cliente, por campaña, por $1.000 de inversión).

## Fuentes de datos de benchmark (2026)

- **Presencia digital / competidor:** Semrush (tráfico, keywords, **AI Visibility Index**), social listening, análisis de sus canales.
- **AI Share of Voice:** herramientas de visibilidad IA (LLM Pulse, Semrush AI Visibility, etc.) — ver `07`.
- **Performance por industria:** reportes de benchmark de la industria (con `as-of` — envejecen rápido; corre el paso 2026).
- **First-party (Efeonce/cliente):** BigQuery, HubSpot, ICO, GA4.
- **Público:** pricing pages, reviews, job posts, filings.

Regla: para datos de competidores usa lo **observable externamente**; no inventes lo que no puedes ver. Marca lo estimado como estimado (`05`).

## El framework como artefacto

Documenta el diseño **antes** de recolectar (plantilla `templates/benchmark-scorecard.md`, sección diseño): entidad · peer set + justificación · métricas + definiciones · fuentes · método de normalización · rúbrica de scoring (`08`). Esto es lo que hace el benchmark **reproducible** y defendible.

## Checklist de salida

- [ ] Entidad + objetivo + **decisión** que habilita el gap.
- [ ] **Peer set 6–12 + 1–3 best-in-class**, comparables, con justificación declarada.
- [ ] **5–8 métricas primarias** con definición explícita (outcome + driver).
- [ ] Métricas de competidor **observables externamente**.
- [ ] **Normalización** definida (moneda, estacionalidad, mix, tamaño → ratios).
- [ ] Framework documentado antes de recolectar.

## Cross-links

- Tipos de benchmark (competitivo/AI SoV/performance…) → `07`; scoring/gap → `08`.
- Diseño de research base → `01`; fuentes/credibilidad → `02`; rigor → `05`.
- Datos: Semrush/`seo-aeo` (digital), `gcp-bigquery`/`greenhouse-ico` (first-party); visual → `dataviz`.
