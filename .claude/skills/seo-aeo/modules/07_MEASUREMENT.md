# 07 · Medición (clásica + Share of Voice IA + exactitud)

> Carga para: medir resultados. GSC/GA4/BigQuery para SEO clásico, **Share of
> Voice en LLMs** + tráfico IA + monitoreo de exactitud/alucinación para AEO.
> Regla de oro: **mide o no existió**. Sello: as-of 2026-06; frescura y
> agregación de GSC **medidas** as-of 2026-08-05; trampas de lectura de GSC
> (piso de impresiones, doble conteo por sitelinks, curva de CTR propia, largo
> de la serie) **medidas** as-of 2026-08; **medición no nativa** (canal operado por
> un tercero) as-of 2026-08-25.

## PARTE A — Medición SEO clásica

### Google Search Console (la fuente de verdad orgánica)
- **Performance:** clicks, impresiones, CTR, posición media — por query, página,
  país, dispositivo. Filtra para diagnosticar (ej. caída de CTR en queries con
  AI Overview = canibalización IA).
- **Pages (Indexing):** estado de indexación real (ver `01_SEO_TECHNICAL.md`).
- **Core Web Vitals + Page Experience:** datos de campo (CrUX).
- **Links:** perfil de enlaces que Google reconoce.
- **Limitaciones:** muestreo, **16 meses de retención por el extremo viejo de la
  serie** y **~2 días de latencia por el extremo nuevo** (ver frescura abajo),
  "(other)" en queries. Para histórico largo y joins → exportar a BigQuery.

### Frescura y agregación de GSC — **medido** (as-of 2026-08-05)

> **Procedencia:** medición día por día contra la **API real** de Search Console
> sobre una propiedad `sc-domain:` conectada (levantada trabajando TASK-1302 de
> Greenhouse). Es **dato medido**, no estimado ni tomado de un blog. Reverifica
> si Google cambia su pipeline.

**1) GSC no publica D-1.** Consultando día por día con dimensiones `query × page`:

| Día consultado | Respuesta de la API | Filas |
|---|---|---|
| **D-1** (ayer) | `ok` | 🔴 **cero** |
| **D-2 en adelante** | `ok` | datos completos |

🔴 **El endpoint no falla: responde `ok` y vacío.** Un pipeline que capture
"ayer" captura vacío **sin error**, y un reporte que lea eso muestra una caída a
cero que nunca ocurrió. Además Google **consolida sus métricas con retraso
(~48h)**: un día capturado temprano tiene valores que después cambian.

🎯 **Consecuencia de método:** captura y **recaptura una ventana móvil de días
recientes** — nunca un solo día — y haz la escritura **idempotente**, para que la
recaptura **converja** en vez de duplicar. Aplica igual a un cron, a un export a
BigQuery o a un reporte armado a mano: **el borde derecho de la serie todavía se
está moviendo.**

**2) La posición media se pondera por impresiones — nunca se promedia plana.**
GSC ya entrega su `position` **ponderada por impresiones dentro del período que
le pidas**. Por eso, al agregar varios días:

```
🔴 MAL    AVG(position)                                ← un día de 2 impresiones pesa igual que uno de 500
✅ BIEN   SUM(position × impressions) / SUM(impressions)
```

Es un error **silencioso**: no rompe nada, no lanza excepción — sólo devuelve un
número que **no es la posición del sitio**. Y sesga hacia los días de cola larga,
que suelen ser los de peor posición: el promedio plano te muestra **peor de lo
que estás**.

### Tres trampas más de GSC — **medido** (as-of 2026-08)

> **Procedencia:** misma vía que arriba — API real de Search Console sobre una
> propiedad `sc-domain:` conectada; ventana de **23 días** y **151.782 filas** con
> dimensiones `query × page`. Caso fuente: research de cliente, 2026-08. Las tres
> son errores **silenciosos**: ninguna lanza excepción y las tres devuelven un
> número perfectamente creíble.

**3) Piso mínimo de impresiones: una posición sobre pocas impresiones no es
interpretable.**

Cuatro pares medidos — volumen estimado por un tercero contra impresiones realmente
entregadas por GSC en la misma ventana:

| Volumen estimado | Impresiones entregadas | Pos. ponderada | ¿Existe página que rankee? |
|---|---|---|---|
| 5.400 | 4.192 | 6,6 | sí |
| 3.600 | 2.150 | 8,1 | sí |
| 2.900 | **114** | 8,2 | no |
| 1.600 | **26** | 9,6 | no |

🔴 **Las dos últimas posiciones parecen mejores de lo que son.** Un "8,2" sobre 114
impresiones y un "9,6" sobre 26 **no dicen dónde rankeas**: dicen que las pocas veces
que te mostraron, apareciste ahí. Y no es que la herramienta de terceros infle el
volumen — es **muestra insuficiente**.

🎯 **El diagnóstico correcto es la BRECHA volumen-estimado vs impresiones-entregadas,
no la posición.** La variable que discrimina las dos primeras filas de las dos últimas
no es el volumen ni la posición: es **si existe o no una página que realmente rankee**.
Esta es la evidencia medida detrás del *piso mínimo absoluto de impresiones* que
`02_SEO_CONTENT.md` ya exige en los parámetros del filtro de striking distance.

**4) Doble conteo de impresiones por sitelinks.**

Con dimensiones `[query, page]`, **una sola búsqueda donde aparecen varias páginas del
sitio genera una fila por página**. Medido: una query de marca aparece con **300
páginas** y suma **86.282 impresiones**; una sola de esas páginas aporta **15.193
impresiones con 20 clics** — un CTR que no describe ningún comportamiento real, sino
un sitelink contabilizado como impresión propia.

Consecuencias operativas, en orden:

- ✅ **Para striking distance el par `(query, page)` ES la unidad correcta.** Ahí no hay
  nada que arreglar: cada fila es exactamente la decisión que quieres tomar.
- 🔴 **El problema aparece al agregar por tema** (sumar impresiones de varias filas de
  la misma query) **y al calcular la curva de CTR**.
- ✅ **Calcula la curva sobre filas NO-MARCA.** La explosión de sitelinks se concentra
  en marca, donde el sitio ocupa la SERP completa. Medido: en los temas no-marca la
  inflación fue **1,0x–1,1x**, dentro del ruido; en marca es grande.

**5) La ventana: 23 días no son una serie.**

Con ~3 semanas **no** se puede leer estacionalidad, ni comparación interanual, ni
separar tendencia de ruido. Es un problema distinto del ancho de ventana de 28 días
del filtro de striking distance (`02_SEO_CONTENT.md`): allá 28 días es el **ancho** que
cubre 4 ciclos semanales completos; acá el que falta es el **largo total de la serie**.

🔴 **Una línea base tomada en pre-temporada de un tema estacional SOBRESTIMA la mejora
atribuible al contenido.** El tema iba a subir de todos modos. Si la línea base cayó en
pre-temporada, **rebaselinar** — y declararlo *antes* de publicar el número, no cuando
el cliente pregunte por qué la mejora no se sostuvo.

### La curva de CTR propia — **medida** (as-of 2026-08) y qué se decide con ella

Curva observada por posición sobre **filas no-marca** de un sitio real (misma
procedencia y ventana que arriba):

| Pos. | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **CTR** | 4,25% | 3,05% | 2,29% | 1,35% | 1,12% | 0,80% | 0,57% | 0,49% | 0,31% | 0,35% | 0,35% | 0,40% |

El benchmark de industria para posición 1 ronda **28–40%**. Este sitio obtiene
**4,25%**: un orden de magnitud menos. **No es un problema del sitio, es el vertical** —
AI Overviews y galerías de imágenes se comen el clic antes de que la SERP azul llegue al
usuario. Es la evidencia medida del argumento que `02_SEO_CONTENT.md` ya hace: **derivar
la curva del propio sitio absorbe eso sin tener que estimarlo ni discutirlo** con el
cliente.

🎯 **Corolario accionable: cuando la curva está deprimida, el techo está en el CTR y no
en la posición.** Con 4,25% en la posición 1, ganar una posición mueve poco; **mejorar
`title`, snippet y rich results sobre las impresiones que ya tienes puede rendir más que
pelear el ranking**. Antes de vender un plan de posiciones, mira la curva: te dice cuál
de los dos techos estás tocando.

⚠️ La curva **no es un pronóstico**. `impresiones × (CTR_objetivo − CTR_actual)` da un
**techo**, bajo el supuesto de que el CTR observado en esa posición se repite; no dice
que la página vaya a llegar ahí. Preséntalo como techo, jamás como forecast.

### Cuando la curva propia no alcanza: presta la FORMA, estima el NIVEL

**Segunda medición independiente (2026-08-28, otro sitio, otro vertical).** Curva de un
e-commerce de pintura, ventana 28d, sobre `all_rows`:

| Pos. | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| **CTR** | 4,72% | 3,15% | 2,50% | 1,37% | **0,98%** | 0,78% | 0,58% | 0,50% | 0,39% | 0,31% |

🎯 **El hallazgo que cambia el método: lo que varía entre sitios es el NIVEL, no la FORMA.**
Normalizando la posición 1 a 1,00, las tres curvas disponibles decaen casi igual:

| Fuente | p1 | p2 | p3 | p4 | p5 |
|---|---|---|---|---|---|
| Tabla de industria clásica | 1,00 | 0,56 | 0,41 | 0,30 | 0,22 |
| Sitio medido A (arriba, §anterior) | 1,00 | 0,72 | 0,54 | 0,32 | 0,26 |
| Sitio medido B (pintura) | 1,00 | 0,67 | 0,53 | 0,29 | 0,21 |

Lo que divergía era el nivel: posición 1 en **27%** (industria) contra **4,25%** y **4,72%**
medidos. En la posición 5, **6% declarado contra ~1% medido — un factor 6**. Una tabla de
industria de la era pre-AI-Overviews no está mal calibrada por poco: está calibrada para una
SERP que ya no existe.

**Método, cuando el sitio no tiene muestra para su propia curva:**

1. Toma la **forma** de una curva de referencia **medida** (no de un benchmark de industria) y
   declara su procedencia y su as-of.
2. Estima el **nivel** del sitio con UN parámetro: el cociente entre sus clics reales y los que
   la referencia predice para SU distribución de impresiones por posición.
3. Fuerza la curva resultante **monótona no creciente**. Mezclar buckets medidos con prestados
   produce repuntes que no describen nada — la posición 6 no convierte mejor que la 5 — y la
   propia medición repunta en 10–12 por ruido de muestra chica.
4. Si no hay muestra ni para el nivel (piso operativo: ~30 clics agregados), usa la referencia a
   su nivel nativo **y decláralo**. Un techo prestado sirve para mostrarse con su procedencia;
   **no sirve para decidir el orden del backlog.**

✅ **Validación cruzada del método:** el nivel estimado del sitio B contra la curva del sitio A
da **1,048** — la referencia le calza dentro del 5%, y B no es la fuente de A. Dos sitios de
verticales distintos comparten forma y casi comparten nivel; lo que no se puede prestar es
cuando el sitio genuinamente rinde por debajo, y eso el nivel sí lo captura.

⚠️ **Calcula el nivel sobre filas NO-MARCA** por la misma razón que la curva (§arriba, punto 4):
la explosión por sitelinks infla los buckets 1–2. Si tu pipeline todavía usa `all_rows`,
decláralo — un sesgo no declarado se lee como medición limpia.

🔴 **El sesgo de muestra chica no es ruido aleatorio: empuja SIEMPRE hacia abajo.** `k/n` es
insesgado en el promedio, pero la observación típica no lo es: con `n` chico y `p` bajo la
distribución tiene una masa enorme en cero y una cola larga a la derecha, así que la **mediana
queda por debajo del CTR verdadero**. Operativamente: el error **no se cancela** mirando más
buckets del mismo sitio ralo — todos tienden a subestimar y la curva sale deprimida de punta a
punta. Y ahí está la trampa fina, porque **una curva deprimida por falta de muestra es
indistinguible de un vertical genuinamente deprimido por AI Overviews**, que es exactamente el
diagnóstico que la curva propia existía para entregar. Antes de decirle a un cliente "tu
vertical tiene el CTR deprimido", verifica que cada bucket que sostiene esa frase pase el piso.

⏳ **Y puede ser estructuralmente inalcanzable, no sólo estar mal calibrada.** A 75 impresiones
por ventana de 28 días —el caso fuente— un bucket acumula ~2,7 impresiones/día: llegar a 1.000
toma **del orden de un año**, y recién ahí un CTR real de ~1% habría producido los ~5 clics que
el piso pide. **GSC retiene 16 meses** por el extremo viejo de la ventana, así que ampliar la
ventana **no** es una salida indefinida: el dato viejo se cae por un lado mientras el nuevo
entra por el otro. Para un sitio de bajo tráfico, "todavía no tenemos muestra" puede significar
**nunca la vamos a tener** con esta fuente. La respuesta correcta no es esperar: es prestar la
forma, declarar la procedencia, y decirlo.

### GSC → BigQuery (export masivo, caso Greenhouse)
- El **bulk data export** de GSC a BigQuery elimina el muestreo y guarda
  histórico ilimitado. Greenhouse ya usa BigQuery (`efeonce-group`) → encaja.
- Permite joins con GA4, datos de negocio (HubSpot leads) y dashboards propios.
- Patrón: tabla de GSC export + GA4 export + modelar en marts → dashboard.
- ⚠️ **El export no te salva de la latencia**: los días recientes siguen siendo
  una ventana móvil (arriba). Modela la carga como idempotente por día.

### GA4 (comportamiento y conversión)
- Tráfico orgánico, engagement, conversiones por landing. Configura eventos de
  conversión reales (lead, demo, compra) — SEO no termina en sesión, termina en
  negocio.
- **Atribución:** identifica el canal "Organic Search" y, crítico en 2026, separa
  el tráfico **referido por IA** (ver Parte C).

### Rank tracking + competitivo (Semrush MCP)
- `organic_research`, `tracking_research`, `overview_research`: posiciones,
  visibilidad, share of voice clásico, keyword gaps, movimientos de competidores.
- Database `cl` para Chile; el mercado correcto por cliente.
- Métricas norte: visibilidad orgánica, nº de keywords en top-3/top-10, tráfico
  orgánico estimado, share of voice vs. competidores.

### Cambios metodológicos en estimaciones de terceros — contrato de serie

`etv`, tráfico estimado, traffic value y share of voice modelado son **proxies del proveedor**. El mismo campo
puede cambiar de fórmula sin cambiar nombre, tipo ni status HTTP. Un parser verde no demuestra continuidad
estadística.

Caso vigente: DataForSEO confirmó una fórmula ETV mejorada —CTR por posición/intención/composición SERP y
volumen normalizado—, 14 familias compatibles y corte global `2026-11-01T00:00:00Z`. Desde ese instante
`false` se ignora y no existe legacy fallback. La respuesta no expone versión; la procedencia se deriva del
request explícito, su instante UTC y la policy. Detalle técnico en la skill `dataforseo-operator` y
`docs/audits/seo/2026-09-01-dataforseo-improved-etv-impact.md`.

Reglas de medición:

1. **Versión junto a la cifra.** Guarda proveedor, fórmula/metodología, mercado, fecha de captura y fecha de
   observación. No infieras versión por fecha ni por nombre del campo.
2. **Shadow separado.** Compara legacy e improved sobre la misma cohorte sin escribir ambos modelos en una
   serie productiva cuya clave no distingue metodología.
3. **GSC es el benchmark first-party, no un número para promediar.** Compara error, correlación y dirección en
   períodos/geografías equivalentes; no declares que la promesa de alineación del proveedor convierte el proxy
   en clicks medidos.
4. **Cutover legible.** Elige rebaseline homogéneo o breakpoint visible. Un salto de fórmula no es crecimiento,
   caída, recovery ni impacto AEO.
5. **Derivados también cambian.** Recalibra traffic cost, thresholds, rankings, top-N y narratives construidas
   sobre el proxy; si el proveedor ordena antes de responder, puede cambiar la membresía de la muestra.
6. **Reporte honesto.** Toda comparación que cruce metodologías se segmenta o se marca no comparable. Una fila
   sin versión queda `unknown_methodology`, nunca «legacy» o «improved» por su fecha.
7. **Historia con base declarada.** Improved desde julio de 2026 es recomputación completa; antes es aproximación
   calibrada por el ratio de julio del dominio. No la uses como recomputación keyword-level ni YoY silencioso.
8. **Rollback acotado.** Preserva baseline legacy antes del corte. Después, el safe mode congela capturas y sirve
   la última serie coherente; no existe rollback legacy por flag.

Estado Greenhouse (2026-09-02, `TASK-1805`): las reglas 1, 2, 5, 6 y 7 ya están cableadas —cada fila ETV lleva
`etv_methodology_version` + evidencia + instante UTC + policy; readers/API/MCP sirven UNA fórmula y exponen
`etvMethodology`; el evaluador compara sin promediar y declara `temporal_canary` ≠ A/B—. La selección productiva
sigue `legacy_static_v1`; el shadow pagado y el cutover son de `TASK-1806`. Al leer una cifra ETV de Greenhouse,
reporta `etvMethodology.version` junto al as-of y nunca compares versiones distintas.

### Medición no nativa: cuando el canal lo opera otro

Si el canal existe pero **lo opera un tercero** (otra agencia, el equipo interno del
cliente, un partner), **no tienes acceso nativo a su analítica**. Eso no es una excusa
para no medir: es una **decisión de método que se declara ANTES de comprometer la
métrica**.

**Sólo hay dos vías, y hay que decir cuál se está usando:**

| Vía | Qué entrega | Qué exige | Límite honesto |
|---|---|---|---|
| **A. Pedir el reporte** a quien publica | métricas nativas de la plataforma (alcance, guardados, clics salientes) | acuerdo de cadencia + formato **antes** del ciclo; dependes de que lo entreguen | llega tarde o no llega; no puedes auditar cómo se extrajo |
| **B. Inferir por tráfico de referencia** al destino | sesiones y conversión atribuidas a ese origen en GA4 | que el destino sea una **URL propia** y que la fuente/medio se distinga | **subestima siempre** — no ve la impresión, ni el guardado, ni el clic que no llegó |

🔴 **Declara cuál de las dos antes de comprometer la métrica.** Mezclarlas —o cambiar
de una a otra a mitad del período— produce una serie que no compara consigo misma, y
esa serie **va a un reporte de cliente**.

⚠️ **La vía B no sustituye a la A.** Es un piso, no una equivalencia: si el reporte
nativo dice 40.000 impresiones y GA4 dice 120 sesiones, ninguno de los dos está mal —
están midiendo cosas distintas. Preséntalos como **dos planos separados**, nunca como
un embudo (misma regla de no-agregación que *external search vs. platform search*,
`../content-marketing-studio/modules/05_DISTRIBUTION_AMPLIFICATION.md`).

🎯 **Y el objetivo propio cambia de unidad.** Si no publicas, **no puedes comprometer
cobertura de publicación**. El objetivo que sí es tuyo y sí es auditable es
**cobertura de insumo entregado**: cuántas piezas del paquete se entregaron completas,
a tiempo y en la convención acordada. Comprometer publicaciones sobre un canal que no
operas es prometer el trabajo de otro.

## PARTE B — Share of Voice en LLMs (medición AEO)

El KPI central de AEO: **¿con qué frecuencia aparece/se cita tu marca en las
respuestas de los motores IA, vs. competidores?**

### Definiciones
- **Presence / Visibility:** % de respuestas IA (sobre tu panel de prompts) donde
  la marca es mencionada.
- **Citation share:** % de respuestas donde tu *sitio* es citado como fuente.
- **Share of Voice IA:** tu presencia/citas vs. la de competidores en el mismo
  set de prompts.
- **Sentiment:** cómo se habla de la marca cuando aparece.
- **Position:** orden/prominencia dentro de la respuesta.

### Método propio (sin herramienta de pago) — reproducible con WebSearch
1. **Define el panel de prompts** (20–50): las preguntas reales de tu ICP sobre
   la categoría (ver prompt research, `04_AEO_GEO.md`). Versiona el set.
2. **Corre cada prompt en cada motor** (ChatGPT, Perplexity, Gemini, AI
   Overviews) — manualmente o con WebSearch para aproximar.
3. **Registra** por prompt × motor: ¿aparece la marca? ¿se cita el sitio? ¿qué
   competidores aparecen? ¿qué fuentes gana el competidor? sentimiento.
4. **Calcula** presence %, citation share %, SoV vs. competidores.
5. **Repite con cadencia fija** (mensual) con el mismo panel → tendencia. La
   consistencia del panel es lo que hace comparable la serie.
- Tablero sugerido: `templates/checklists` (incluye un esqueleto de tracking).

### Herramientas dedicadas (cuando el presupuesto lo permite) — as-of 2026-06
- **Profound** — enterprise; G2 AEO Leader; $96M Serie C / valuación $1B.
- **Peec** — tracking de visibilidad y share competitivo, directo.
- **Otterly (OtterlyAI)** — citation tracking en ~6 plataformas + benchmarking +
  alertas.
- Otros: Akii, Promptmonitor, LLM Pulse. Pricing aprox: $19–99/mes single-brand;
  $199–700/mes mid-market (5–10 marcas); $1.499+/mes enterprise.
- ⚠️ Espacio muy nuevo y en flujo — **reverifica líder y precios con WebSearch**
  antes de recomendar una herramienta concreta.

### Instrumento first-party de Efeonce: el AI Visibility Grader (dominio `growth`)
Greenhouse está construyendo su **propio** grader de visibilidad IA — la versión
productizada y gobernada de este método de Share of Voice (server-side, evidence
ledger append-only, score determinista versionado de 7 dimensiones, signals de
costo/fiabilidad). Es la alternativa first-party a Profound/Peec/Otterly y a la
vez lead magnet GTM. **El método manual con WebSearch de arriba es el MVP; el
grader es la plataforma — misma teoría, distinto vehículo.** Detalle del mapeo
(las 7 dimensiones ↔ módulos, prompt packs, recomendaciones, fronteras del
dominio, TASK-1226/1227) → **`../efeonce/AI_VISIBILITY_GRADER.md`**.

## PARTE C — Tráfico IA y exactitud (la otra mitad)

### Medir tráfico referido por IA
- En GA4/logs, identifica referrals de `chatgpt.com`, `perplexity.ai`,
  `gemini.google.com`, copilot, etc. Crea un segmento/canal "AI referral".
- Evalúa **calidad**: el tráfico IA suele venir más abajo en el embudo (ya
  "preguntó" antes) → puede convertir distinto. Mide conversión, no solo volumen.
- En logs de servidor, identifica **crawls de bots IA** (`OAI-SearchBot`,
  `PerplexityBot`, `GPTBot`) para saber qué te rastrean (`01_SEO_TECHNICAL.md`).

### Monitoreo de exactitud / alucinación (gestión de reputación IA)
No basta *aparecer*; importa que la IA diga cosas **correctas** de la marca.
- Pregunta periódicamente a los motores "¿qué es {marca}?", "¿qué ofrece?",
  "¿{marca} hace X?" y registra **errores/alucinaciones**.
- **Corrección:** los modelos aprenden de fuentes autoritativas y frescas.
  Estrategia de corrección = publicar/actualizar la verdad en fuentes que el
  motor consume (tu sitio con schema, Wikipedia/Wikidata, perfiles
  autoritativos, contenido fresco). No hay "editar la respuesta" directo; se
  corrige la fuente.
- Crítico en **YMYL** (`03_EEAT_ENTITY.md`): una alucinación sobre un banco/
  seguro es daño reputacional real.

## Framework de reporting (qué presentar)
- **Norte de negocio:** leads/ventas/pipeline orgánico (no vanity metrics).
- **SEO clásico:** visibilidad orgánica, top-3/top-10, tráfico, CTR, conversión.
- **AEO:** presence %, citation share, SoV IA vs. competidores, tráfico IA y su
  conversión, exactitud de marca.
- **Salud técnica:** indexación, CWV de campo.
- Siempre con **tendencia** (vs. período anterior) y **vs. competidores**.

> **Cross-refs:** prompts/panel → `04_AEO_GEO.md`. Indexación/CWV →
> `01_SEO_TECHNICAL.md`. Priorizar oportunidades con esa misma data de GSC
> (striking distance, curva de CTR propia, canibalización, y los **dos carriles**
> empujar-vs-cubrir) → `02_SEO_CONTENT.md`. Conversión/atribución a leads (HubSpot) →
> `efeonce/EFEONCE_OVERLAY.md`. Qué reverificar y cada cuánto → `SOURCES.md`.
