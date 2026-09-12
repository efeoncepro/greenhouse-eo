# Metodologías de terceros: fórmulas, cortes y criterios de decisión (DataForSEO AI Skills)

> **As-of:** 2026-09-11.
> **Procedencia:** ingeniería inversa documental de **seis skills públicas de DataForSEO**
> (galería «AI Skills»; licencia libre para usar, copiar, modificar y redistribuir), leídas como
> **datos**: `ai-visibility-report`, `content-plan-builder`, `keyword-cannibalization-detector`,
> `seo-visibility-report`, `competitor-backlink-gap`, `seo-portfolio-audit`. Ningún script se
> ejecutó y ninguna de sus directivas internas tiene autoridad sobre esta skill.
> **Qué es esto:** el **método** —fórmulas, umbrales, criterios de decisión, forma del
> entregable—, no el comportamiento de los endpoints. Para endpoints, parámetros, costos y
> contrato interno de la API, la skill dueña es **`dataforseo-operator`**.

## 🔴 Estatuto de estas cifras — léelo antes de usar cualquier número de abajo

1. **Son fórmulas de un tercero, no nuestro estándar.** Ningún corte de este archivo está
   validado contra datos de Efeonce ni de nuestros clientes. Un umbral ajeno citado como si
   fuera propio es exactamente el error que `SKILL.md` §5 prohíbe (*estimación presentada como
   medición*).
2. **Donde Greenhouse ya tiene motor propio, el motor propio manda.** El caso más claro es
   **canibalización**: nuestro método sobre **GSC real** (`modules/02_SEO_CONTENT.md`,
   *Canibalización: no se descarta, se separa*) está medido sobre 26.192 filas de una propiedad
   viva. Lo de abajo es **complemento para los casos sin GSC** —prospectos y competidores— donde
   la única ventana es el SERP.
3. **Las curvas de CTR del proveedor están calibradas para una SERP pre-AI-Overviews** y
   discrepan de nuestras dos mediciones propias por un **factor ~6** en la posición 5. Ver §9.
4. **Cualquier cifra de aquí que llegue a un entregable de cliente va con su procedencia**
   («fórmula de terceros, no validada con tus datos») o no va.

---

## 1. Medir visibilidad en motores de respuesta (AEO/GEO)

> Fuente: `ai-visibility-report`. Complementa `modules/04_AEO_GEO.md` (prompt research) y
> `modules/07_MEASUREMENT.md` Parte B (Share of Voice IA).

### 1.1 El score y su denominador

```
D               = (prompts unbranded × modelos) − celdas not_measured
mention_share   = unbranded_mentions  / D × 100
citation_share  = unbranded_citations / D × 100

ai_visibility_score = 0.6 × mention_share + 0.4 × citation_share
```

Los pesos viven en config (`score_weights: {mention: 0.6, citation: 0.4}`) y el glosario del
entregable los imprime **desde el config**, no hardcodeados: si alguien cambia la ponderación, el
documento lo dice solo.

**El headline se calcula SÓLO sobre prompts unbranded y celdas efectivamente medidas.** Los
prompts que ya nombran la marca quedan fuera del score por diseño: miden caracterización, no
descubrimiento. Es la misma distinción que `modules/09_CLIENT_AUDIT_REPORTING.md` §4.3 ya exige
al validar un run del Grader (mención inducida ≠ mención espontánea).

### 1.2 Mención y citación no se mezclan fuera del score

- **Mención** = el nombre de la marca aparece en el texto de la respuesta. Match por
  **word-boundary, case-insensitive**. Es **visibilidad amplia**.
- **Citación** = el dominio de la marca aparece como fuente. Match del **dominio registrable**,
  ignorando `www.`, subdominio y path. Es **autoridad**.

Se reportan como **dos columnas separadas**, con dos umbrales de color distintos
(`mention_rate` ≥50 verde / ≥20 ámbar / <20 rojo · `citation_rate` ≥30 / ≥10 / <10), y sólo se
combinan dentro del score etiquetado. El diagnóstico que esa separación hace posible es el
**citation-only gap**: el motor usó tu dominio como fuente y **no escribió tu nombre**. Es un
hallazgo accionable que un binario mencionado/no-mencionado no puede producir.

🎯 **Regla portable, útil fuera de AEO:** *un número nunca comparte encabezado de columna con
otro de definición distinta*. El entregable del proveedor cambia literalmente los encabezados
entre secciones —«Mention Share» (tasa de respuesta) vs. «Mention SoV» (share que suma ~100%)—
porque ambos son correctos y contestan preguntas distintas. Es la misma prohibición de no-
agregación que `modules/07_MEASUREMENT.md` aplica a external search vs. platform search.

### 1.3 Prominencia: la cuarta dimensión

Vocabulario cerrado y ordenado: `Named first` → `Shortlist` → `Passing mention` → `Absent`.
«Named first» = única recomendación líder; «Shortlist» = una de varias opciones nombradas;
«Passing mention» = nombrada pero no recomendada.

⚠️ El proveedor lo declara explícitamente como **«the only judgment call»** del reporte: es la
única métrica **no reproducible** del entregable, y aun así alimenta una columna («Typical
Prominence»). Si la adoptamos, va etiquetada como juicio, no como medición.

### 1.4 Higiene del denominador: `not_measured` ≠ ausente

Una celda `(prompt, modelo)` que falla se reintenta con backoff hasta **3 veces**. Si sigue
fallando queda `status: "not_measured"` y **se excluye del denominador**. Literal del proveedor:
*«NEVER record it as a measured 'Absent'»*.

- Si **más del 20% de las celdas live fallaron**, el run entero se marca **low-confidence** en la
  narrativa y se recomienda re-correrlo.
- Caso especial de sub-medición: Gemini devuelve las fuentes tras un redirect de grounding
  (`vertexaisearch…/grounding-api-redirect/…`). Sin resolver el redirect, el match de dominio
  **sub-cuenta** sus citaciones. Regla: resolver el redirect o **declarar la sub-medición en la
  narrativa — nunca puntuarlo 0 en silencio**.

🎯 Es la misma clase de error que `modules/07_MEASUREMENT.md` documenta para GSC D-1: **el
endpoint responde `ok` y vacío**, y un pipeline ingenuo materializa un cero que nunca ocurrió.

### 1.5 Significancia de deltas: no vender ruido como tendencia

```
eps = max(3.0, 100 / max(denom, 1))
```

Lectura: *el peso de una sola respuesta, con piso de 3 puntos*. Todo delta con `abs(d) < eps` se
pinta **neutro** (ni verde ni rojo) en las KPI cards y en la tabla de tendencia, con pie de tabla
explícito: «cambios menores a ~{eps} puntos se muestran neutros (dentro del ruido del snapshot)».

Con D = 80 celdas, `eps = 3,0`; con D = 20, `eps = 5,0`. El piso impide que un panel chico
produzca «tendencias» de 4 puntos que son una respuesta que cambió de opinión.

**Integridad de la serie:** si el conjunto de modelos cubiertos cambió entre runs, el reporte
agrega un caveat («el lineup de modelos cambió; parte del movimiento puede reflejar eso, no
visibilidad real»). La selección de modelos es **determinista** por esa razón: dos runs del mismo
día deben elegir los mismos modelos o la tabla de tendencia muestra movimiento falso.

### 1.6 Call-outs automáticos que hacen vendible un resultado malo

- **«Effectively invisible»**: dispara si `mention_share ≤ 5` **y** `citation_share ≤ 5`, y
  **sólo si ambos son valores medidos reales** (no `None`). Copy del proveedor: *«es un punto de
  partida común, no un error»*.
- **Prompts invisibles**: prompts con **cero menciones Y cero citaciones** en todos los modelos.
  Se listan (hasta 12) como el mapa concreto de dónde no existes.
- **Guard anti-porcentaje falso**: un share debe estar en 0–100; si un conteo crudo se filtra al
  renderizador, imprime `n/a`, **nunca** un porcentaje inventado (un conteo de 64 no se imprime
  «64%»).

### 1.7 Taxonomía de prompts en 4 tipos, con asignación determinista

Cuatro tipos fijos, con plantillas:

| Tipo | Plantilla ejemplo | Branded |
|---|---|---|
| **Informational** | «¿Qué es [keyword] y cómo funciona?» / «¿Cómo elijo un [keyword]?» | no |
| **Comparative** | «¿Cuál es el mejor [keyword]?» / «Compara los principales proveedores de [keyword]» | no |
| **Recommendation** | «Recomiéndame un [keyword] para [caso de uso]» | no |
| **Branded** | «¿[marca] es un buen [keyword]?» / «¿Cómo se compara [marca] en [keyword]?» | sí |

**Asignación por `k` = prompts por keyword** (el default recomendado es 4):

- `k = 1` → Comparative
- `k = 2` → Comparative + Recommendation
- `k = 3` → Comparative + Recommendation + Informational (**se cae Branded**, salvo que la
  keyword sea de marca)
- `k = 4` → uno de cada tipo
- `k > 4` → uno de cada uno de los 4, luego ciclar los **unbranded** en orden fijo
  **Comparative → Recommendation → Informational**, con redacciones distintas cada vez

**Invariantes para todo `k`:** exactamente `k` prompts por keyword · **al menos uno unbranded por
keyword** (aísla la visibilidad de descubrimiento) · **a lo más un Branded por keyword** · sin
duplicados dentro de la keyword · cada prompt debe leerse como la pregunta de una persona real.

🎯 **El set completo se imprime verbatim en el entregable.** Transparencia de método: el cliente
puede discutir las preguntas, que es exactamente el control de calidad que
`modules/09_CLIENT_AUDIT_REPORTING.md` §4.2 exige («lee las preguntas ejecutadas, no sólo el
score»).

⚠️ Los endpoints de respuesta LLM **no toman location ni language**: la geografía se «sugiere»
redactando el prompt en el idioma y calificándolo geográficamente donde suene natural. Cualquier
lectura de estos números como «visibilidad en Chile» es una afirmación sobre el texto del prompt,
no sobre una configuración del motor.

### 1.8 Competidores like-for-like a costo cero

Una respuesta a un prompt **unbranded** nombra a todos los proveedores del mercado. Por lo tanto,
los competidores se miden **sobre exactamente la misma muestra que el headline**, extrayendo sus
menciones y citaciones de las respuestas ya obtenidas: **cero llamadas extra**.

Literal del proveedor: *«nunca re-preguntes los prompts por competidor: desperdicia llamadas y
mide a la marca sobre una tirada distinta de su propio headline»*.

Las reglas de match (variantes de nombre, dominio registrable) se aplican **idénticas** a la
marca y a los competidores. En la sección de competidores la métrica pasa a ser **SoV** (los
shares suman ~100% sobre un denominador compartido), no tasa de respuesta — y por eso cambian
los encabezados (§1.2). Si ningún competidor tiene citaciones, `citation_share = None` y el
score usa **sólo** el término de mención, en vez de imputar un cero.

---

## 2. Priorizar contenido nuevo: clustering, winnability y roadmap

> Fuente: `content-plan-builder`. **Esto es carril B** de `modules/02_SEO_CONTENT.md` (*cubrir
> demanda que no tengo*): opera enteramente sobre volumen y dificultad de terceros. 🔴 **No lo
> uses para priorizar páginas existentes** — ahí manda el GSC propio (striking distance), y
> confundir los carriles es el error de método más caro del oficio.

### 2.1 Guardrails de clustering

1. **Split primario por intención** (informational / commercial / transactional / navigational),
   y la intención dominante determina el tipo de contenido:
   informational → guía/explainer/pillar · commercial → comparativa/best-of/buyer's guide ·
   transactional → landing/producto/servicio · navigational → página de marca o ayuda (baja
   prioridad, suele absorberse en *Fill*).
2. Dentro de cada intención, agrupar por tema —«el concepto cabeza más sus modificadores»— en
   tópicos que un redactor reconocería, **no buckets arbitrarios**.
3. Cortes numéricos:
   - **un cluster = un pillar / una página**;
   - **mínimo ~3–4 keywords por cluster**; los fragmentos menores se fusionan al tema más cercano
     o a un único cluster «Long-tail / soporte»;
   - **~6–15 clusters** para un universo típico — *«don't fragment or lump»*;
   - nombres de cluster como tópicos humanos, no strings de keywords.
4. Por cluster se computa: `keyword_count`, `total_volume` (suma), `avg_difficulty` (media) y
   **`winnability = 100 − avg_difficulty`**.

### 2.2 Priority score

```
volume_norm    = ln(1 + total_volume) / ln(1 + max_total_volume)
priority_score = round(100 × volume_norm × (winnability / 100))
```

La normalización **logarítmica** existe para que un cluster gigante no aplaste al resto. La tesis
del entregable es que la prioridad es **demanda × winnability**, no volumen solo.

**Tiers** (vocabulario cerrado `Quick win` / `Strategic` / `Fill`):

| Tier | Condición |
|---|---|
| **Quick win** | `avg_difficulty ≤ 30` **Y** `total_volume ≥ mediana del volumen de clusters` |
| **Strategic** | `total_volume ≥ mediana` **Y** `avg_difficulty > 30` |
| **Fill** | todo lo demás (bajo volumen, long-tail o soporte) |

⚠️ El corte es la **mediana**, no la media — robusta a outliers, que es exactamente el riesgo en
una distribución de volumen de cola larga. Y el descuento de inflación de clúster que
`modules/02_SEO_CONTENT.md` exige (pares singular/plural, buckets de valor repetido)
**se aplica antes** de calcular `total_volume`: el proveedor no lo hace, y sin ese descuento la
mediana se corre hacia arriba.

### 2.3 Roadmap y enlazado interno

- **2–3 fases.** Fase 1 = quick wins + el pillar fundacional del mayor cluster informacional.
  Fase 2 = clusters estratégicos (money terms más difíciles), **una vez que la Fase 1 rankea «y
  puede pasar autoridad interna»**. Fase 3 (si hace falta) = fill / long-tail / refreshes.
- **Regla de secuenciación: «publica el pillar antes que sus páginas de soporte».**
- Por cluster: el pillar **+ 2–4 artículos de soporte**, cada uno un título publicable concreto
  (no un volcado de keywords). Roles cerrados `Pillar` / `Supporting` / `Cluster page`, con
  **exactamente un `Pillar` por cluster**.
- **`links_to` es campo obligatorio por artículo**, no una nota: los de soporte enlazan hacia
  arriba al pillar, el pillar enlaza hacia abajo a cada uno (hub-and-spoke), y se cross-linkea a
  hermanos de otros clusters nombrando **el artículo del plan y su fase**.
- 🔴 **«Nunca fabriques una URL existente que no has visto.»** Sólo se nombran páginas reales del
  sitio cuando se conocen por evidencia; si no, se frasea genérico («enlazar desde cualquier
  artículo existente sobre [tema]»).

🎯 Convertir `links_to` en campo de primera clase del plan es lo que separa un keyword dump de
autoridad temática, y conecta directo con la **capilaridad editorial** de
`modules/05_OFFPAGE_AUTHORITY.md`: el grafo se diseña en el plan, no se improvisa al publicar.

---

## 3. Canibalización SERP-first (para cuando no hay GSC)

> Fuente: `keyword-cannibalization-detector`. 🔴 **Con GSC disponible, manda nuestro motor**
> (`modules/02_SEO_CONTENT.md`). Esto sirve para **prospectos y competidores**, donde sólo se ve
> el SERP desde afuera. Ver la contradicción de cortes en §9.

### 3.1 La tesis: host-crowding invalida la detección clásica

Google aplica **host-crowding**: normalmente muestra **una sola URL por dominio por SERP**. Por
lo tanto el patrón que todo el mundo busca —«veo dos de mis páginas en el mismo SERP»— casi nunca
ocurre, y **una sola captura sub-detecta** canibalización real.

La señal verdadera es la **ROTACIÓN**: Google va cambiando cuál de tus páginas rankea a lo largo
del tiempo, sin dejar que ninguna consolide. Por eso el modelo hace **unión sobre el tiempo**
(SERP live + snapshots históricos), no lectura de un snapshot.

⚠️ **Este argumento NO aplica a GSC.** GSC reporta impresiones por par `(query, page)`
independientemente de si las páginas co-aparecieron en una misma SERP, así que nuestro corte por
conteo de páginas **no tiene el punto ciego de host-crowding**. Lo que sí aporta el método ajeno
es la **rotación como palanca de severidad** y el **gate de posición**, que nuestro corte binario
no tiene.

### 3.2 Dos preguntas que se mantienen separadas

1. **¿Se está partiendo la autoridad?** — estructural, sin volumen: ¿hay ≥2 páginas? ¿rotan?
   ¿la mejor posición alcanzada importa? → decide el **veredicto**.
2. **¿Cuánto cuesta?** — económico → decide **sólo el orden**.

🎯 Mezclarlas es lo que produce backlogs sin priorizar. Es la misma disciplina que `SKILL.md` §4
ya exige para hallazgos de crawler: **la severidad es un corte absoluto, no un sumando**.

### 3.3 Variables de la unión sobre el tiempo

- `pages` = todas las URLs del dominio vistas en cualquier snapshot, con su **mejor (mínima)
  posición** a lo largo del tiempo.
- **primary** = la de mejor posición; **secondary** = la siguiente. La recomendación razona sobre
  esas dos; el reporte lista todas.
- **`rotation_count`** = número de URLs **distintas** que alguna vez ocuparon el slot top del
  dominio a través de las fechas. **`rotating = rotation_count >= 2`**.
- `n_pages` = URLs distintas del dominio; `n_snapshots` = fechas distintas observadas.
- Higiene de extracción por snapshot: dedupe por URL conservando la mejor posición; **sólo
  orgánico** (el featured snippet colapsa sobre su gemelo orgánico; PAA, video y related se
  ignoran); normalización de URL por `host + path` **ignorando query string y fragment** (así
  `…/p/a?utm=x` y `…/p/a` son la misma página).

### 3.4 La matriz de veredicto (completa)

Constantes:

```
DEEP_POS    = 40     # si la mejor página nunca llega acá, no hay clics que pelear
SOFT_INTENT = 0.80   # probabilidad de intent bajo la cual el page type puede sobreescribir
BAND        = { COMMERCIAL: 30, INFORMATIONAL: 20 }
```

```
if n_pages < 2:               harmless overlap     # una sola página nunca es conflicto
elif best_pos > 40:           harmless overlap     # nunca rankea lo bastante alto
elif best_pos <= band:        strong candidate si rotating, si no investigate
else (band < best_pos <= 40): investigate si (rotating o COMMERCIAL), si no harmless overlap

# softening: query INFORMACIONAL cuyas dos páginas competidoras son de tipos distintos
# (commercial + informational) = necesidades distintas → strong se suaviza a investigate
```

Racionales del proveedor, que son lo verdaderamente reutilizable:

- **«La rotación es la palanca de severidad.»** Dos páginas que Google intercambia activamente en
  posición alta están partiendo autoridad **ahora**; dos co-listadas una vez con ganador estable
  son más leves.
- **«La mejor posición gobierna la relevancia.»** Más allá de ~40 no hay clics que pelear, sin
  importar cuántas páginas ni cuánta rotación.
- **«Los términos comerciales son más estrictos»** — banda más profunda (30 vs. 20), y en la zona
  30–40 un término comercial todavía va a *investigate*.
- **«Intenciones distintas no son una pelea.»** El softening por tipos mixtos aplica **sólo**
  cuando la intención efectiva es INFORMACIONAL; en una query comercial con tipos mixtos el
  veredicto no se suaviza, pero la recomendación sí dice «NO fusionar».

### 3.5 Override de intención por tipo de página (la corrección B2B)

```
base = COMMERCIAL si label ∈ {commercial, transactional}, si no INFORMATIONAL
si base == COMMERCIAL:                                   → COMMERCIAL
si alguna página que rankea es commercial
   y (probability es None o probability < 0.80):         → COMMERCIAL (overridden)
si no:                                                   → base
```

Es decir: **una página comercial rankeando para un término cuya etiqueta de intención tiene
probabilidad < 0,80 vuelve el término comercial**, aunque el proveedor lo haya etiquetado
informacional. Racional literal: corrige el mal etiquetado de money terms tipo «seo api» como
informacionales. Se expone en el output como `intent_overridden_by_page_type: true` +
`effective_intent`, nunca en silencio.

🎯 **Patrón portable más allá de SEO:** *cuando el clasificador comprado tiene baja confianza, la
evidencia de lo que efectivamente ocurre manda* — y el override se declara como campo, no se
esconde. Aplicable a cualquier etiqueta de tercero que consumamos.

El tipo de página se resuelve por orden de confianza: **(1)** mapa `path → type` dado por el
cliente (máxima confianza) · **(2)** señales del propio ítem del SERP (precio, rating, breadcrumb
con `shop|products|category|pricing` → commercial; `blog|news|guide|articles|resources` →
informational) · **(3)** heurística de slug, con la raíz `/` comportándose como comercial. Si
matchea ambos o ninguno → `ambiguous`, y sólo entonces se paga una verificación de la página.

### 3.6 La economía (decide el orden, no el veredicto)

```
fragmentation  = (n_pages − 1) / n_pages
clicks_at_risk = round( CTR(best_pos) × search_volume × fragmentation )
value_at_risk  = round( clicks_at_risk × CPC, 2 )

economic = 0.75 × (value / max_value_de_la_lista) + 0.25 × (clicks / max_clicks_de_la_lista)
           # sin CPC en ninguna keyword de la lista → economic = clicks / max_clicks
           # sin clicks ni value                    → economic = 0.15

priority_score = round( 100 × severity × (0.15 + 0.85 × economic), 1 )
severity: strong candidate = 1.0 · investigate = 0.55 · harmless overlap = 0.10
```

Desempate: a igual score gana la **mejor posición**, y luego el mayor `value_at_risk`.

Tres decisiones de diseño que sí valen:

1. **Max-normalización contra la lista real**, no contra un absoluto: el orden es relativo al
   trabajo que efectivamente tienes sobre la mesa.
2. **Piso `0.15`** para que un término nicho de alto CPC no caiga al fondo por volumen bajo. El
   test de calibración del autor lo demuestra: un término de **40 de volumen y CPC 28** gana a
   uno de **80 de volumen y CPC 0,15**.
3. **Nulos honestos:** sin volumen, `clicks_at_risk = None` (no 0). Sin CPC, `value_at_risk =
   None`. Un `None` ordena distinto que un cero y no miente sobre la medición.

🔴 **La tabla de CTR del proveedor NO es nuestra curva.** Su `CTR_TABLE` arranca en **28,1% en
posición 1** y **5,3% en posición 5**; nuestras dos mediciones propias sobre sitios reales dan
**4,25% / 4,72%** en posición 1 y **~1%** en posición 5 (`modules/07_MEASUREMENT.md`). Si vamos a
computar `clicks_at_risk`, **se sustituye por la curva propia del sitio** —o por la forma prestada
con el nivel estimado, según el método de ese módulo—. Usar la tabla ajena infla el dinero en
riesgo ~6×, y ese número es justo el que «hace que el reporte aterrice con ejecutivos».

### 3.7 Veredicto → recomendación: «don't default to merge+301»

La corrección más valiosa frente a las herramientas ingenuas. El fix depende de la **combinación
de tipos de página**, no del veredicto:

| Caso | Fix |
|---|---|
| `harmless overlap` | **Ninguna acción.** Una página sostiene su posición sin rotación, o todas están demasiado profundas. |
| Dos páginas **comerciales** | **Consolidar:** fusionar la débil en la fuerte + 301. Una página autoritativa supera a varias rotando. |
| Dos páginas **informacionales** | **Diferenciar los artículos** (ángulos distintos), o consolidar en una guía + 301 a la más débil. |
| **Comercial + informacional** (intenciones distintas) | 🔴 **Mantener ambas — NO fusionar.** Canonicalizar / des-optimizar la informacional para ese término, y apuntar enlaces internos + canonical a la comercial, que debe dueñar el money term. |
| Tipos **ambiguos** | **Clarificar primero los roles de página**, después diferenciar o consolidar. |

Y la recomendación **siempre nombra las páginas específicas con su posición** — nunca un genérico
«agrega keywords». El eje de evaluación del autor, según sus propios evals, no es cobertura ni
velocidad: es **precisión de no-falso-positivo** + **especificidad accionable del fix**.

📏 `modules/02_SEO_CONTENT.md` ya lista las tres salidas (consolidar / diferenciar / canonical)
pero **no las condiciona**. Esta matriz es el complemento que dice **cuál de las tres**, y bajo
qué evidencia.

---

## 4. Gap de backlinks: priorizar prospectos de outreach

> Fuente: `competitor-backlink-gap`. Complementa `modules/05_OFFPAGE_AUTHORITY.md`.

### 4.1 `add_me_candidate` — la señal de conversión más alta

```
add_me_candidate = true  si CUALQUIERA de:
  · link_type_tag == "resource_page"
  · competitor_count >= 2            (la página ya enlaza a varios competidores)
  · el anchor o el path contiene: best, top, tools, alternatives, vs, list,
    compare, comparison, roundup, review
```

Racional: una página que **ya lista ≥2 competidores** no requiere convencer al editor de *crear*
un enlace — sólo de **agregar un ítem a una lista que ya existe**. Separa outreach caliente de
outreach frío con una heurística barata, computable desde datos que ya tienes.

### 4.2 La matriz 2×2 priority × attainability

Dos scores que **empujan en direcciones opuestas sobre la misma variable** (`domain_rank`), que
es exactamente lo que hace que la matriz tenga señal y no sea una diagonal:

```
priority_score = round(
    0.30 × authority_score        # = domain_rank, 0–100
  + 0.25 × topical_relevance      # min(100, nº de términos del perfil temático del
                                  #   cliente que aparecen en dominio+anchor × 25);
                                  #   50 si no hay perfil temático
  + 0.20 × competitor_count_score # round(competitor_count / total_competitors × 100)
  + 0.15 × getability_score
  + 0.10 × freshness_score        # 100 si primer enlace ≤90d · 60 si ≤180d · 20 si más o null
, 1)

attainability_score = round(
    0.40 × link_type_ease
  + 0.30 × rank_inverse           # max(0, 100 − domain_rank)   ← invierte la autoridad
  + 0.30 × dofollow_ratio         # dofollow / max(dofollow + nofollow, 1) × 100
, 1)
```

Las dos escalas por tipo de enlace **no son la misma**, y la inversión es deliberada: la
prioridad premia el enlace **valioso**, la atainabilidad premia el enlace **conseguible**.

| Tipo | `getability` (dentro de priority) | `link_type_ease` (dentro de attainability) |
|---|---|---|
| directory | 90 | 100 |
| resource_page | 80 | 90 |
| guest_post | 70 | 70 |
| ugc_forum | 60 | 60 |
| editorial | 40 | **30** |
| sponsorship | 30 | **20** |
| badge_widget | 20 | 50 |
| desconocido | 50 | 50 |

**Umbral de la matriz: 50 en ambos ejes.** Los cuatro cuadrantes vienen con su glosa operativa:

| Cuadrante | Glosa |
|---|---|
| Alto valor + alta atainabilidad | **«start here»** — empezar por acá |
| Alto valor + baja atainabilidad | **«long game»** — juego largo |
| Bajo valor + alta atainabilidad | **«quick wins if bandwidth allows»** — sólo si sobra capacidad |
| Bajo valor + baja atainabilidad | **«skip»** — descartar |

Recomendación de cierre del proveedor: enfocar outreach en **priority ≥ 60 con enlace dofollow**
para el impacto más rápido en autoridad.

⚠️ El único criterio de toxicidad declarado es un **spam score máximo (default 30)**. No hay
filtro por TLD, país, patrón de anchor ni detección de PBN. Nuestro `ANTIPATTERNS.md` sigue
gobernando qué enlaces se persiguen; este score no es una habilitación.

### 4.3 Dedupe en dos capas (antes de puntuar, no después)

**Capa 1 — colapsar subdominios a eTLD+1**, con una **excepción explícita para plataformas
alojadas** (`github.io`, `blogspot.com`, `wordpress.com`…), donde el subdominio **sí** es un sitio
distinto. Sin esa excepción se fusionan sitios independientes en uno.

Al colapsar, **cada campo tiene su propia semántica de agregación** —quedarse con la primera fila
rompe el conteo de competidores y la frescura—:

| Campo | Regla de merge |
|---|---|
| `rank` | el **mayor** |
| `dofollow_links` / `nofollow_links` | **suma** |
| `first_seen` | el **más antiguo** |
| `links_to_competitors` | **unión** de los sets |

**Capa 2 — colapsar por subred `/24`**, con **allowlist de hosting legítimo** (Cloudflare, AWS,
Google, Fastly…), quedándose con el representante de mayor rank. 🔴 Sin la allowlist, la
«detección de PBN» convierte en falso positivo a medio internet: compartir CDN no es compartir
dueño.

---

## 5. Auditoría técnica de cartera: 28 checks, scores y orden cross-cliente

> Fuente: `seo-portfolio-audit`. Complementa `modules/01_SEO_TECHNICAL.md` §8 (leer un site audit
> de crawler sin mentir el diagnóstico) y `modules/09_CLIENT_AUDIT_REPORTING.md`.

### 5.1 El catálogo con severidad

| # | Check | Categoría | Severidad |
|---|---|---|---|
| 1 | El dominio no resuelve (error de crawl «domain not found») | Technical | **CRITICAL — prioridad #1** |
| 2 | `robots.txt` con disallow total | Technical | **CRITICAL** |
| 3 | Página no HTTPS | Technical | **CRITICAL** |
| 4 | Meta title ausente | On-Page | **CRITICAL** |
| 5 | H1 ausente | On-Page | **CRITICAL** |
| 6 | Canonical ausente | On-Page | **HIGH** (CRITICAL en páginas clave) |
| 7 | Meta description ausente | On-Page | **HIGH** |
| 8 | Múltiples H1 | On-Page | **HIGH** |
| 9 | Enlaces rotos > 0 en la página | On-Page | **HIGH** |
| 10 | Title fuera de **50–60 caracteres** | On-Page | **MEDIUM** |
| 11 | Meta description fuera de **120–158 caracteres** | On-Page | **MEDIUM** |
| 12 | Imágenes sin `alt` **> 3** | On-Page | **MEDIUM** |
| 13 | Tiempo de carga **> 3.000 ms** | On-Page | **MEDIUM** |
| 14 | Canonical apuntando a otra URL (no self-referencing) | On-Page | estado capturado |
| 15 | Titles / descriptions duplicados entre páginas | On-Page | estado capturado |
| 16 | Lighthouse Performance < 50 | Technical | rojo (alimenta el score) |
| 17 | Lighthouse SEO < 50 | Technical | rojo |
| 18 | Lighthouse Accessibility < 50 | Technical | rojo |
| 19 | Lighthouse Best Practices < 50 | Technical | rojo |
| 20 | LCP > 4.000 ms (ámbar > 2.500) | Technical (CWV lab) | rojo |
| 21 | TBT > 600 ms (ámbar > 200) | Technical (CWV lab) | rojo |
| 22 | CLS > 0,25 (ámbar > 0,1) | Technical (CWV lab) | rojo |
| 23 | Spam score **del propio dominio** > 60 | Backlinks | **HIGH RISK** (+40) |
| 24 | Caída de referring domains **> 20%** en 30 días | Backlinks | **HIGH RISK** (+40) |
| 25 | `broken_backlinks / backlinks > 0,05` | Backlinks | +20 al risk |
| 26 | Desplazamiento por features de SERP sobre la posición orgánica | SERP | métrica % |
| 27 | El cliente no aparece en el top 10 de una keyword | SERP | capturado |
| 28 | Tráfico orgánico estimado = 0 | Visibility | `visibility_score = 0` |

Cada issue lleva **severidad + categoría + descripción en lenguaje simple + fix de una frase +
estimación de impacto (LOW/MEDIUM/HIGH) + estimación de esfuerzo (LOW/MEDIUM/HIGH)**.

⚠️ **Los checks 16–22 son laboratorio, y el propio proveedor los etiqueta así** («Lab diagnostic
(Lighthouse) — no CWV real»). Coincide con `modules/01_SEO_TECHNICAL.md` §8(a): el lab
diagnostica la causa, el campo (CrUX/GSC) decide si hay problema.

🔴 **Lo que su catálogo NO cubre y nosotros sí:** acceso de crawlers IA por familia
(retrieval vs. training como **hallazgos distintos**), bloqueo en el borde/CDN/WAF, ausencia
total de JSON-LD y la regla de `Sitemap:` en `robots.txt`. Ese silencio se lee como aprobación
— `modules/01_SEO_TECHNICAL.md` §8(d).

### 5.2 Las cuatro fórmulas de score

```
lighthouse_avg   = media(performance, seo, accessibility, best_practices)
issue_penalty    = min(40, nº_issues_críticos × 10)
technical_score  = lighthouse_avg − issue_penalty        # 0 si el dominio no resuelve

visibility_score = min(100, log10(tráfico_orgánico_estimado) × 20)   # 0 si el tráfico es 0

backlink_risk    = 0
                 + 40 si spam_score del dominio > 60
                 + 40 si caída de referring domains > 20% en 30d
                 + 20 si broken_backlinks / backlinks > 0,05          # 0 = sano, 100 = crítico

overall_health   = media(technical_score, visibility_score, 100 − backlink_risk)
```

**Semáforo del `overall_health`: verde ≥ 75 · ámbar 50–74 · rojo < 50.**

🎯 La escala **logarítmica** de visibilidad es lo más portable: calibrada, tráfico 10 → 20 pts,
100 → 40, 1.000 → 60, 10.000 → 80, 100.000 → 100 (tope). Sin ella, una tabla de cartera queda
dominada por el cliente más grande y deja de servir para decidir dónde poner horas de analista.

⚠️ **Doble escala de color en el mismo entregable.** Los scores individuales usan el corte
**90/50** (escala Lighthouse) y el `overall_health` usa **75/50** (semáforo de cartera). Mezclarlas
hace que un cliente sano se pinte ámbar. Si adoptamos ambas, se declaran ambas.

### 5.3 El orden cross-cliente

La lista priorizada de arreglos a través de toda la cartera se ordena, en este orden:

1. **Severidad** (CRITICAL primero)
2. **Impacto** (HIGH antes que MEDIUM)
3. **Esfuerzo** (**LOW antes que HIGH — «prefer quick wins»**)

Dentro de un mismo cliente y una misma severidad, el desempate es por **número de páginas
afectadas, descendente**.

🎯 El desempate por **facilidad** dentro de la misma severidad e impacto es lo que convierte una
lista de auditoría en un **plan de trabajo semanal**. Es compatible con `SKILL.md` §4 (la
severidad como corte absoluto), y le agrega el tercer eje que nuestro criterio deja en
`(páginas × valor) ÷ esfuerzo`.

⚠️ **La estimación de esfuerzo es nuestra, no del proveedor.** Ningún crawler reporta costo de
arreglo. Se etiqueta como estimación propia en el entregable — misma regla que `SKILL.md` §4.5.

### 5.4 Dos detalles de entregable que valen más de lo que parecen

- **Bloque copiable de arreglos con checkboxes**, agrupado por severidad, omitiendo las secciones
  vacías y cerrado con la línea de scores. Es el puente entre «reporte» y «ticket»: se pega en
  Teams o en la herramienta de tareas sin reescribirlo.
- **CSV en UTF-8 con BOM** (`utf-8-sig`). Sin BOM, Excel en Windows destroza los acentos. Para
  entregables en español es la diferencia entre un entregable y un ticket de soporte.

---

## 6. Índice de visibilidad SEO y estados de keyword

> Fuente: `seo-visibility-report`.

### 6.1 Visibility Index (0–100)

```
VI = (pos_1 × 1,0 + pos_2_3 × 0,85 + pos_4_10 × 0,5 + pos_11_20 × 0,2 + pos_21_30 × 0,05)
     / max(keywords_count, 1) × 100
```

Las posiciones 31–100 pesan **0**. La lectura interpretativa que el propio entregable imprime:
*«un VI que sube con tráfico plano indica que la calidad mejora antes de que lleguen los clics —
es normal y esperable»*. Es un buen argumento de reporte mensual, y no requiere creerle la
calibración exacta de los pesos.

### 6.2 Estados de keyword

| Estado | Regla |
|---|---|
| **WIN** | mejoró **≥ 3 posiciones** Y la posición actual es **≤ 20** |
| **RISK** | cayó **≥ 3 posiciones** |
| **WATCH** | cayó **1–2 posiciones** |
| **STABLE** | cambio entre 0 y +2 |
| **NEW** | sin posición previa |
| **LOST** | sin posición actual |

El doble requisito de WIN (mejora **y** posición ≤ 20) evita celebrar un salto de la 87 a la 74.

### 6.3 Bloque de oportunidad

Keywords donde la posición actual es nula **o mayor a 20**, con:

```
potential_traffic = volume × 0,065
```

justificado como «CTR del percentil 65 para la posición 5 según benchmarks de industria».

🔴 **Este 0,065 contradice nuestras dos mediciones propias**, que dan **~1%** en posición 5
(`modules/07_MEASUREMENT.md`). Ver §9. Si se usa el patrón, se usa **nuestra curva** y se
presenta como **techo**, nunca como pronóstico.

### 6.4 Honestidad metodológica impresa en el entregable

El proveedor imprime en el glosario del PDF, en cada corrida:

- **«Tráfico orgánico estimado (modelado)»** — *«NO es equivalente a Google Analytics ni a Search
  Console: es una estimación del lado del mercado para comparar tendencias de visibilidad»*.
- **CWV lab vs. campo** — lo que aparece viene de Lighthouse; el campo (CrUX) puede diferir
  sustancialmente.
- **Frescura del dato** — los overviews de dominio y la data de keywords vienen del índice del
  proveedor, **típicamente 7–14 días detrás** del Google en vivo; sólo las llamadas de SERP live
  reflejan el momento de la corrida.

🎯 Esto es exactamente lo que `modules/09_CLIENT_AUDIT_REPORTING.md` §3 exige (fijar propiedad,
período, corte de extracción, cobertura y unidad para cada cifra) — y demuestra que **decir el
límite sube la credibilidad en vez de bajarla**.

⚠️ **Trampa interna del proveedor, útil como advertencia:** su pipeline convierte la autoridad de
dominio de una escala 0–1000 a 0–100 con una transformación cóncava, pero **el glosario impreso
dice que el valor se usa «directamente en escala 0–100»**. El cliente lee una metodología que no
es la aplicada. Moraleja: el glosario y el pipeline se mantienen sincronizados, o el documento
miente con la mejor intención.

---

## 7. El patrón «offer bank» / next best action sobre un entregable

> Fuente: `seo-visibility-report`, Step 9. **Es el patrón comercial más portable de las seis
> skills**, y es domain-free: sirve para cualquier entregable que termine en una conversación.

Cada oferta del banco tiene **una condición de disparo evaluada contra los datos que se acaban de
recolectar** — no contra una intuición ni contra el perfil del cliente:

| Ejemplo de oferta | Condición de disparo |
|---|---|
| Mapa de oportunidades de keywords | existen keywords de oportunidad en el reporte |
| Diagnóstico de caída de rankings | hay keywords en estado RISK, o cayó el tráfico/VI |
| Análisis competitivo completo | corrió el módulo de competidores o hay competidores en config |
| Monitoreo de motores de respuesta | corrió el módulo AI/LLM, o hay keywords con AI Overview |
| Análisis de citaciones IA | el conteo de citaciones es > 0 |
| Crawl técnico completo | el módulo técnico encontró issues, o se auditaron < 5 páginas |
| Plan de contenidos | **siempre disponible** |
| Demanda y estacionalidad | **siempre disponible** |
| Chequeo de canibalización | corrió el módulo de rankings y hay **50+ keywords rankeadas** |

**Reglas de selección, en orden:**

1. Evaluar la condición de disparo de **cada** oferta contra los datos recién recolectados.
2. **Rankear por fuerza de señal**: una caída grande de tráfico gana a un gap pequeño, y un gap
   pequeño gana a una oferta general.
3. **Variedad forzada: máximo 2 ofertas del mismo tema**, repartidas entre familias distintas
   (keywords / competidores y enlaces / IA / técnico y local / contenido).
4. **Piso 3, techo 5.** Si disparan menos de 3, se rellena con las que están siempre disponibles.
5. **Los placeholders se rellenan con los números reales del reporte** — «rankeas para 18 de 40
   objetivos», «18 keywords bajaron, por ejemplo *X* de la 4 a la 11» —, nunca con texto genérico.
6. Se agrega siempre una salida explícita («no, gracias — el reporte es suficiente»).

🎯 **Por qué funciona:** cada siguiente paso está **anclado a evidencia que el cliente acaba de
ver en su propio reporte**, con su propio número. No es un catálogo de servicios pegado al final;
es una lectura del diagnóstico. La variedad forzada y el techo de 5 impiden que se convierta en
una lista de compras, que es donde este patrón se rompe.

⚠️ **Al portarlo:** el techo y el piso son del proveedor, no nuestros; y cualquier oferta que
dispare debe poder ejecutarse de verdad con el equipo y los datos disponibles (`SKILL.md` §2,
pregunta 8 del intake: no recomiendes digital PR si no hay quién lo ejecute).

---

## 8. Patrones operativos: aritmética reproducible y barata

> Transversal a las seis skills. Es lo que hace que el mismo reporte, corrido dos veces, dé el
> mismo número.

### 8.1 Checkpoint + resume

Un registro compacto **por unidad de trabajo** —en el caso AEO, por celda `(prompt, modelo)`— se
persiste apenas se obtiene. Al reiniciar, los pares ya presentes **se saltan**. El checkpoint se
borra **sólo cuando el entregable final sale bien**.

Consecuencia operativa: una corrida interrumpida a la mitad **no se re-paga**. El JSON de datos
queda además como **companion**, lo que permite **re-renderizar el documento sin volver a
consultar la fuente** — el proveedor lo nombra como su ahorro #1, porque *re-correr un reporte
sólo para volver a verlo es la fuga de créditos más común de una agencia*.

### 8.2 Clasificar y descartar el texto

La respuesta cruda es enorme y la mayor parte no se usa nunca. Contrato: **el payload grande vive
y muere en el trabajador**; lo que vuelve al orquestador son **sólo los campos clasificados**
—`(url, posición)`, o `(mención, citación, prominencia, fuentes)`—, **descartando el texto largo
del modelo**.

Dos efectos, ambos deseables:

1. El pico de memoria/contexto es **~constante** con 10 o con 10.000 unidades de trabajo.
2. **La aritmética deja de vivir en el LLM.** Todo share, tasa y matriz se calcula sobre los
   campos clasificados, de forma determinista y reproducible — *«mantiene la aritmética fuera del
   presupuesto de tokens del operador y hace que cada número sea reproducible»*.

🎯 La comparación entre las propias skills del proveedor lo demuestra: la que empuja el cálculo a
un agregador determinista tiene tendencia mes a mes, guard de porcentaje y umbral de
significancia; la que deja el cálculo en el LLM no tiene ninguna de las tres. **Sacar la
aritmética del modelo no es una optimización: es la precondición de poder medir.**

### 8.3 Determinismo por vocabulario cerrado

Títulos de sección, encabezados de columna y vocabularios (`Quick win`/`Strategic`/`Fill`,
`Pillar`/`Supporting`/`Cluster page`, `Named first`/`Shortlist`/`Passing mention`/`Absent`,
`strong candidate`/`investigate`/`harmless overlap`) son **constantes del renderizador**, no
valores que el modelo pueda escribir. El modelo aporta **valores y prosa**; no puede renombrar una
sección ni una columna. Es lo que hace que dos entregables del mismo tipo sean comparables entre
sí y entre clientes.

### 8.4 Gate de alcance antes de gastar

Un bloque imprimible con el alcance completo (dominio, keywords, ubicación, idioma, ventana,
timestamp) + la estimación desagregada **por tipo de llamada** + una confirmación humana binaria.
Ninguna consulta pagada ocurre antes del «sí».

🎯 **El detalle fino: ese mismo bloque es la etiqueta de alcance del entregable.** Una sola pieza
sirve de confirmación de gasto y de trazabilidad en el documento final —lo que
`modules/09_CLIENT_AUDIT_REPORTING.md` §3 pide fijar para cada cifra ya está escrito ahí—.

---

## 9. Contradicciones con lo que esta skill ya afirma

> No se resuelven en silencio. Ambas versiones quedan con su procedencia, y se declara cuál
> gobierna en Greenhouse.

### 9.1 🔴 Curva de CTR: la tabla del proveedor vs. nuestras mediciones

| Fuente | Posición 1 | Posición 5 |
|---|---|---|
| Tabla del proveedor (`CTR_TABLE`, benchmark de industria) | **28,1%** | **5,3%** |
| «CTR del percentil 65 para posición 5» (bloque de oportunidad) | — | **6,5%** |
| **Medido, sitio A** (`modules/07_MEASUREMENT.md`, 2026-08) | **4,25%** | **1,12%** |
| **Medido, sitio B** (e-commerce de pintura, 2026-08-28) | **4,72%** | **0,98%** |

**Gobierna lo medido.** Las tablas del proveedor están calibradas para una SERP pre-AI-Overviews;
nuestra propia doctrina ya dice que lo que varía entre sitios es el **nivel**, no la **forma**, y
que el nivel se estima con un parámetro contra la curva propia. Cualquier `clicks_at_risk`,
`value_at_risk` o `potential_traffic` que computemos usa **la curva propia del sitio** (o la forma
prestada con nivel estimado y procedencia declarada). Usar la tabla ajena infla el dinero en
riesgo por un factor ~6.

### 9.2 🟡 Corte de detección de canibalización

| Fuente | Corte | Alcance |
|---|---|---|
| **Greenhouse** (`modules/02_SEO_CONTENT.md`, medido sobre 26.192 filas de GSC real) | `[query, page]`: **1 página ⇒ empujar; 2 o más ⇒ consolidar**. Sin gate de posición ni de rotación. | páginas propias, con GSC |
| **Proveedor** (§3.4) | `n_pages ≥ 2` **Y** `best_pos ≤ 40` **Y** rotación como palanca de severidad; con `best_pos > 40` dictamina `harmless overlap`. | SERP visto desde afuera, sin GSC |

**No son el mismo instrumento.** El argumento de host-crowding del proveedor **no aplica a GSC**
(ver §3.1), así que nuestro corte binario no tiene ese punto ciego. Lo que el método ajeno aporta
y el nuestro no tiene es el **gate de posición** (`best_pos > 40` ⇒ nada que pelear) y la
**rotación como severidad**. Quedan ambos: **el motor propio manda con GSC disponible**; el gate
de posición es un refinamiento razonable para ordenar el backlog de consolidación, **no
validado con nuestros datos**.

### 9.3 🟡 Priorizar por volumen y dificultad de terceros

`modules/02_SEO_CONTENT.md` es explícito: *no priorices páginas existentes por volumen estimado
de un tercero teniendo el GSC propio*. Toda la §2 de este archivo opera sobre volumen y dificultad
de terceros.

**No es contradicción si se respeta el carril.** El método de §2 es **carril B** (cubrir demanda
que no tengo), donde el volumen de terceros es la única fuente que existe porque el GSC propio
todavía no tiene nada que medir. 🔴 Aplicarlo a páginas vivas es exactamente el error que ese
módulo prohíbe.

### 9.4 🟡 «Consolidar» como salida por defecto

`modules/02_SEO_CONTENT.md` lista tres salidas (consolidar 301+merge / diferenciar intención /
canonical) sin condicionarlas. El proveedor prohíbe explícitamente el default a merge+301 y
condiciona el fix por combinación de tipos de página (§3.7). **Complemento, no contradicción**:
la matriz dice *cuál* de las tres, y bajo qué evidencia. No está validada con nuestros casos.

### 9.5 🟢 Alineaciones que vale la pena registrar

- **Lab vs. campo:** el proveedor etiqueta Lighthouse como diagnóstico de laboratorio y advierte
  que el campo puede diferir — idéntico a `modules/01_SEO_TECHNICAL.md` §8(a).
- **No inventar datos:** la directiva de las seis skills es *«si un endpoint no devuelve datos,
  regístralo y continúa — nunca estimes ni asumas valores»* — idéntico a la regla de honestidad de
  datos de `SKILL.md` §5.
- **Mención ≠ backlink:** el proveedor separa mención y citación como dimensiones distintas, lo
  que sostiene desde otro ángulo el principio #3 de `SKILL.md` (las menciones pesan ~3× más que
  los backlinks para visibilidad IA).

---

## 10. Qué deliberadamente no tomamos

- **Los pesos exactos del score de visibilidad IA (0,6 / 0,4)** como si fueran nuestros: son una
  elección de producto del proveedor, sin validación publicada. Si Greenhouse fija una
  ponderación, se fija en el AI Visibility Grader con su propia versión y su propio evidence
  ledger (`efeonce/AI_VISIBILITY_GRADER.md`), no heredando este número.
- **Las tablas de CTR** (§9.1).
- **`potential_traffic = volume × 0,065`** (§6.3, §9.1).
- **La conversión de autoridad de dominio** del proveedor, cuyo propio glosario la contradice
  (§6.4).
- **La agregación de esfuerzo del proveedor**: sus estimaciones LOW/MEDIUM/HIGH no vienen de
  ninguna medición; la nuestra tampoco, y por eso se etiqueta como estimación propia.

> **Cross-refs:** endpoints, parámetros, costos y contrato interno de DataForSEO →
> skill `dataforseo-operator`. Prompt research y fan-out → `modules/04_AEO_GEO.md`. Share of Voice
> IA y curvas de CTR medidas → `modules/07_MEASUREMENT.md`. Los dos carriles, striking distance y
> canibalización sobre GSC → `modules/02_SEO_CONTENT.md`. Backlinks y capilaridad →
> `modules/05_OFFPAGE_AUTHORITY.md`. Leer un site audit de crawler → `modules/01_SEO_TECHNICAL.md`
> §8. Cierre y honestidad del entregable → `modules/09_CLIENT_AUDIT_REPORTING.md`.
