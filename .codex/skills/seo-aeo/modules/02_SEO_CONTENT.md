# 02 · Contenido y Topical Authority

> Carga este módulo para: search intent, topical authority, pillar/cluster,
> contenido programático, content decay, canibalización y operación editorial.
> Sello: as-of 2026-06.

## Principio raíz: intención > keyword

Google y los motores IA resuelven **intención**, no cadenas de texto. Antes de
escribir, clasifica la intención de la query objetivo:

| Intención | Qué busca el usuario | Formato que gana |
|---|---|---|
| **Informacional** | aprender/entender | guía, explicación, definición, how-to |
| **Comercial** (investigation) | comparar antes de comprar | comparativas, "mejores X", reviews, alternativas |
| **Transaccional** | hacer/comprar ya | página de producto/servicio, pricing, demo |
| **Navegacional** | llegar a una marca/página | home, landing de marca |

**Regla:** mira la SERP actual de la query — Google ya te dice qué intención
premia (¿muestra blogs? ¿productos? ¿videos? ¿local pack?). No pelees contra el
formato que la SERP recompensa.

## Topical authority (la palanca estructural de fondo)

Rankear consistentemente en un tema no se gana con una página, sino **cubriendo
el tema completo** con profundidad y enlazado coherente. Modelo **pillar +
cluster**:

```
        ┌────────────────────────┐
        │   PILLAR (guía madre)  │  ← término amplio, enlaza a todo el cluster
        │   /guia-tema/          │
        └───────────┬────────────┘
        ┌───────────┼───────────┐
        ▼           ▼           ▼
   /tema/sub-a  /tema/sub-b  /tema/sub-c   ← cada uno cubre una sub-intención
   (cluster)    (cluster)    (cluster)        y enlaza de vuelta al pillar
```

- **Information gain:** Google premia contenido que *agrega* algo nuevo al corpus
  (dato propio, ángulo, experiencia), no que reescribe lo que ya existe. En 2026
  esto es doblemente cierto para AEO: el contenido derivativo no se cita.
- **Cobertura de sub-intenciones = cobertura del Query Fan-Out** (ver
  `04_AEO_GEO.md`): el mismo trabajo de cluster que da topical authority es el
  que te hace recuperable cuando la IA descompone una query en sub-queries.

## Anatomía de una página que rankea Y se cita (2026)

1. **Answer capsule arriba** — respuesta directa en 40–60 palabras bajo un H2 con
   la pregunta. El **72.4%** de páginas citadas por ChatGPT tienen este patrón.
2. **Estructura escaneable** — H2/H3 como preguntas, párrafos cortos, listas,
   **tablas** (páginas con ≥1 tabla + ≥1 lista numerada tienen ~2.3× más
   probabilidad de ser citadas).
3. **Densidad de hechos** — estadística/dato cada ~150–200 palabras, con fuente.
4. **Fuentes y citas** — enlaza a autoridades; las citas/quotes aumentan la
   citabilidad IA (ver tácticas GEO en `04`).
5. **Profundidad real** — cubre la pregunta y sus derivadas, no relleno. La
   longitud no es factor; la *completitud* sí.
6. **Autoría visible** — byline con credenciales (`03_EEAT_ENTITY.md`).
7. **Frescura** — fecha de actualización honesta; contenido <2 meses gana ~28%
   más citas IA.

## Contenido programático (programmatic SEO)

Escalar páginas desde plantilla + datos (p.ej. "X en {ciudad}", "{producto} vs
{competidor}"). Funciona cuando:
- Hay **demanda real** por cada variante (validar volumen, no generar al voleo).
- Cada página aporta **valor único** (datos propios por variante), no solo
  swap de tokens → si no, es thin content y Google lo entierra (o peor,
  penaliza por "scaled content abuse", política reforzada 2024).
- Hay control de calidad e indexación selectiva (no indexar las variantes vacías).

⚠️ En la era IA, el contenido programático **genérico generado por LLM a escala**
es exactamente lo que Google y los answer engines descartan. Programmatic sí, pero
con data propietaria y valor incremental. Ver `ANTIPATTERNS.md`.

## Content operations: mantener, no solo publicar

- **Content decay** — el tráfico de una página decae con el tiempo (competencia,
  desactualización). Audita trimestralmente las páginas que perdieron
  posiciones/clicks y **actualízalas** (refresh suele rendir más que publicar
  nuevo). La frescura es factor IA explícito.
- **Canibalización** — dos URLs compitiendo por la misma intención se diluyen.
  Diagnóstico: GSC → misma query rankeando con URLs que rotan. Fix: consolidar
  (301 + merge), diferenciar intención, o canonical.
- **Pruning** — contenido thin/obsoleto sin tráfico ni enlaces puede *bajar* la
  calidad percibida del dominio. Opciones: mejorar, consolidar, o `noindex`/
  eliminar (con 301 si tenía valor). Hazlo con datos, no por corazonada.
- **Cadencia de refresh** — define un ciclo (p.ej. revisar top-20 páginas dinero
  cada trimestre). El contenido es un activo que se mantiene.

## Keyword research que sigue sirviendo en 2026

- Usa **Semrush MCP** (`keyword_research`, `organic_research`) para volumen,
  dificultad, intención y gaps vs. competidores. Database `cl` para Chile.
- **Keyword gap** vs competidores = mapa de oportunidades de cluster.
- Pero complementa con **prompt/answer-space research** (qué le preguntan a los
  LLMs, no solo qué teclean en Google) → `04_AEO_GEO.md`. Son disciplinas
  hermanas: keyword research para la SERP, prompt research para la respuesta IA.

## Errores frecuentes de contenido
- Escribir para el keyword y no para la intención real de la SERP.
- Publicar sin answer capsule (pierdes citabilidad gratis).
- "Más palabras = mejor": no. Completitud, no longitud.
- No actualizar nunca (decay garantizado).
- Generar a escala con IA sin valor incremental (riesgo de penalización + cero
  citas).
- Ignorar canibalización (auto-competencia silenciosa).

> **Cross-refs:** estructura para ser citado → `04_AEO_GEO.md`. Autoría/E-E-A-T
> → `03_EEAT_ENTITY.md`. Medir decay/posiciones → `07_MEASUREMENT.md`. Calidad
> y borde de spam → `ANTIPATTERNS.md`.
