# Diagnóstico del Blog SKY — SEO + AEO (INTERNO)

> Documento **interno** de Efeonce (NO va a SKY). Análisis de `blog.skyairline.com` con Semrush + fetch directo + metodología AEO propia (AI Visibility Grader / Be X). Fecha: 2026-07-11. Base para calibrar la oferta técnica.

## 1. El blog NO es una hoja en blanco (dato Semrush, database CL)

| Métrica | Valor |
|---|---|
| Keywords orgánicas del blog | **~13.510** |
| Tráfico orgánico del blog | **~40.390 visitas/mes** |
| Participación del blog en el tráfico orgánico del dominio | **3,46%** (el resto es el sitio de reservas `www`, 92,6%) |
| Autoridad del dominio raíz (skyairline.com) | Rank 129 · ~54K keywords · ~1,16M visitas/mes |

**Implicación comercial:** SKY ya tiene un activo de contenido con tracción. El trabajo no es "empezar a producir", es **subir el techo de un blog que ya rankea**. Eso cambia el mix óptimo (ver §5).

## 2. Qué funciona hoy (clusters fuertes)

El blog rankea bien (pos 1–6) en:
- **Estacionalidad Chile** — cluster potente: "cuándo empieza el invierno/verano/primavera en Chile", "estaciones en Chile" (varias en pos 1–5). Alto volumen agregado.
- **Aeropuertos** — "aeropuerto chiloé/temuco/pucón/castro" (pos 1–6).
- **Equipaje / utilitario de marca** — "equipaje de cabina/bodega", "medidas bolso de mano sky" (pos 1).
- **Algunos destinos** — Camboriú, Puerto Fuy, terminal sur Santiago.

## 3. Las oportunidades grandes (near-miss: alto volumen en pos 6–12)

Aquí está el oro — páginas que **ya existen** pero rankean en fondo de página 1 / página 2, sobre términos de altísimo volumen:

| Keyword | Volumen | Posición | Página |
|---|---|---|---|
| **antofagasta** | **110.000** | **12** | que-hacer-en-antofagasta |
| terminal sur santiago de chile | 33.100 | 9 | terminal-sur-de-santiago |
| camboriú | 22.200 | 6 | camboriu |
| puerto fuy | 22.200 | 6 | puerto-fuy |
| invierno (+ variantes) | 12.100 | 3–7 | estaciones/invierno |

**Empujar estas de pos 6–12 → 1–3 es el mayor ROI del blog** (alto impacto / bajo esfuerzo): refresh + answer capsule + schema + enlazado interno. No requiere artículos nuevos.

## 4. Análisis AEO — metodología Efeonce (AI Visibility Grader / Be X)

Sondas técnicas corridas sobre el blog y un artículo muestra (`bodegas-en-mendoza`, ~2.500 palabras):

| Nivel (Be X) | Estado | Evidencia |
|---|---|---|
| **01 · Be Found** (¿existes para la IA?) | 🟡 Parcial | Indexado y rankeando (13,5K kw), **pero `robots.txt` = 404** (sin política de crawlers IA), **sin `llms.txt`**. Sitemap WP existe. |
| **02 · Be Readable** (¿te lee sin adivinar?) | 🔴 **Débil** | **Sin JSON-LD / structured data** (0 schema), **sin meta description** en los artículos. Estructura de encabezados-pregunta + listas SÍ decente (favorable a citación), pero falta toda la capa de máquina. |
| **03 · Be Correct** (¿habla bien de ti?) | 🟢 OK | Contenido de marca, sin señales de imprecisión. No es el gap. |
| **04 · Be Actionable** (¿te pueden usar?) | 🔴 Bajo | Poca acción estructurada; enlazado débil hacia reserva de vuelos. Frontera agéntica sin trabajar. |
| **05 · Be Intrinsic** (¿eres el default?) | 🟡 Parcial | Fuerte en estacionalidad/aeropuertos; **no** es la respuesta por defecto en "qué hacer en [destino]" (ahí está en pos 6–12). |

**Lectura AEO:** el contenido es humano-legible pero **máquina-invisible**. Sin schema ni meta descriptions, los motores de respuesta con IA (AI Overviews, ChatGPT, Perplexity) tienen que adivinar de qué trata cada pieza. Es el gap #1 de AEO y es transversal a las 13,5K keywords existentes.

## 4-bis. Medición REAL con el AI Visibility Grader (supersede la inferencia de §4)

> Corre real, no inferido. Runs `EO-GRUN-00044` y **`EO-GRUN-00045` (publicado)** (staging), 5 motores (OpenAI, Anthropic, Perplexity, Gemini 3, Google AI Overview), categoría `aerolínea de pasajeros`, competidores JetSMART/Flybondi/LATAM. **As-of 2026-07-11.**
>
> **📄 Informe público VIGENTE (run `EO-GRUN-00046`, AUTO-PUBLICADO por el worker — camino canónico, pipeline v2 + extracción de prosa completa):** `https://think.efeoncepro.com/brand-visibility/r/grt-9892e5684c394557a63f8171926871c26d3278216daf42a2a8100951ccb5537f` — **las 7 dimensiones puntúan por primera vez**: overall **60,6** · citation_quality **91,2** (real) · message_alignment 36,8 · tono poblado (19 calificadas: 1+/7=/2±/9−) · categoría percibida ✓ ('Aerolíneas y aviación'). Ownership 20. Blog: 0 citas (claim intacto). Tokens anteriores (v1 rico sin citation real: grt-d8cb68da…; v2 manual sin prosa: grt-31784cce…) quedan inmutables como historia. **Lección operativa: el informe completo SOLO sale del camino del worker (auto-publish); nunca puntuar/publicar a mano.**
>
> **⚠️ Caveats del informe (análisis profundo 2026-07-11, ver `ISSUE-120`):**
> 1. **`brandMentioned` real = `yes:23 / no:11 / unknown:1`** (el "0/35" reportado antes era un bug de conteo nuestro — enum vs booleano). SKY SÍ aparece mencionada en 2/3 de las respuestas.
> 2. **`citation_quality=0` es un ARTEFACTO del pipeline, NO un hecho de SKY:** los adapters no clasifican `sourceType` (33/33 citas = 'unknown') y la dimensión exige owned/earned/news → **sale 0 para cualquier marca, siempre**. El claim defendible es por dominios: **blog.skyairline.com = 0 citas en 35 respuestas** (verificado), sitio corporativo 6+, terceros dominan (Despegar 8, Trustpilot 8+4, TripAdvisor 7+4+3, YouTube 7, Instagram 8, BioBio 5). Ni blog.flybondi.com aparece; jetsmart.com 4× (dominio, no distinguible su /blog).
> 3. **Sentimiento/message_alignment `unknown`:** la extracción LLM degradó silenciosa (router produce la causa — disabled/not_configured/cost_exceeded/provider_error — pero el finding la descarta). Causa real verificable solo en Sentry `domain=growth`.
> 4. **`partial`** = 1 obs Gemini `provider_error` (34/35 OK), no un fallo sistémico.
> Números duros confiables: entity_clarity, competitive_sov, category_ownership, menciones de competidores, **dominios citados**. Los 4 gaps del producto quedaron registrados en **`docs/issues/open/ISSUE-120`** con fix propuesto (clasificador sourceType, matching eTLD+1, fallback reason visible, desglose del partial).

**⚠️ Corrección importante:** la afirmación previa "SKY es casi invisible / no citado por la IA" era **inferida de sondas técnicas (falta schema/meta) y es FALSA**. La medición real:

| Dimensión (0-100) | SKY | Lectura |
|---|---|---|
| entity_clarity | **100** | La IA sabe perfectamente quién es SKY |
| competitive_sov | **88** | Aparece con fuerza vs competidores |
| ai_visibility | 35 | Presente, moderado |
| category_ownership | 35 | No dueño de la categoría |
| citation_quality | **0** ⚠️ | **Artefacto del pipeline (ISSUE-120), NO hecho de SKY.** El claim defendible es por dominios: blog = 0 citas / terceros dominan |
| revenue_intent_coverage | 40 | Aparece parcial en prompts de compra |
| **Overall** | **49,1** | Presente, no dominante |

- **skyairline.com SÍ es citado** como fuente (aparece en `citationDomains`). NO está invisible.
- **Fuentes que la IA cita hoy para la categoría:** Trustpilot, Despegar, BioBioChile, YouTube, TripAdvisor, Reddit, TikTok — **terceros, no el blog de SKY**.
- **Menciones de competidores:** **LATAM 17× · JetSMART 9× · Flybondi 1×** → LATAM domina la conversación de categoría en IA.
- **Caveat de dato:** `sentimentLabel`/`brandMentioned` salieron `unknown`/0 en este run → la **extracción de prosa (LLM) no se pobló** (drift worker vs Vercel, documentado en Handoff). Esos campos NO son confiables aquí; el resto (SoV, citation, competidores, dominios) sí. Para un número/sentimiento definitivo o para incrustar el reporte público, **re-correr con la extracción confirmada en el worker**.

### Escalera de madurez Be X — valores MEDIDOS por el grader (run 46, lente percepción)

> **OJO — dos lentes distintas del Be X, no se contradicen:** §4 (arriba) es la lente **técnica inferida** (¿el SITIO tiene schema/meta/llms.txt? → Be Readable débil). Esta tabla es la lente **medida por el grader** (¿la IA percibe/representa a la marca? → Be Readable 70 óptimo porque entity_clarity 100 + citations creíbles). Una mide el activo, la otra la percepción. En la propuesta al cliente va **solo la medida** (la técnica es munición interna para el scope).

| Peldaño | Valor | Severidad | Eje | Dimensiones que lo alimentan |
|---|---|---|---|---|
| Ser encontrada (Found) | **40** | crítico ← próximo | percepción | ai_visibility |
| Ser legible (Readable) | **70** | óptimo | percepción | entity_clarity, category_ownership, citation_quality |
| Ser correcta (Correct) | **37** | crítico | percepción | message_alignment |
| Ser accionable (Actionable) | **8,4** | crítico | **agentic** | (sin dims de percepción; frontera agéntica) |
| Ser intrínseca (Intrinsic) | **76** | óptimo | percepción | competitive_sov, revenue_intent_coverage |

Lectura para el pitch: 2 fortalezas (Readable/Intrinsic óptimo) + 3 peldaños crítico (Found/Correct/Actionable) = exactamente el scope del servicio. **Actionable 8,4** es donde el gap técnico (schema/estructura ausente, §4) se ve MEDIDO en la escalera → puente entre las dos lentes. Fuente: `model.levels` del informe público token `grt-9892e568…`.

**El gap AEO real (provable):** no es "no aparecen"; es que **la IA cita a terceros, no el contenido propio de SKY** (citation_quality 0), y **LATAM domina la categoría** (category_ownership 35). El trabajo AEO = hacer que el blog de SKY sea la **fuente citada** y ganarle ownership a LATAM.

## 5. Contraste con nuestra propuesta

**Lo que ya está bien alineado:**
- SEO **+ AEO** como diferencial → exactamente lo que el blog necesita (la capa AEO está ausente hoy).
- Reportería con visibilidad IA → mide justo el gap que nadie más ve.
- Clusters por destino → coherente con la estructura del blog.
- Watchlist de content decay / refresh (§9) → toca la oportunidad #3.

**Lo que hay que RE-PONDERAR (clave):**
- El blog ya tiene corpus con tracción → el mix óptimo **no es 8 artículos nuevos y nada más**. El mayor ROI está en: **(a)** capa técnica AEO faltante (schema, meta descriptions, llms.txt, política de bots) sobre lo existente + **(b)** refresh de near-miss (antofagasta 110K en pos 12, etc.) + **(c)** nuevos clusters de destino. La propuesta debe **explicitar capacidad de optimización + auditoría técnica**, no solo net-new. (Nuestro plan 30-60-90 ya abre con diagnóstico — reforzarlo con "auditoría técnica + quick wins de refresh".)

**Lo que FALTA en la propuesta y hay que agregar:**
- **Ángulo WordPress + partner de Automattic.** El blog corre en **WordPress**. Efeonce es experto en WP **y partner de Automattic** (la empresa detrás de WordPress). Podemos operar la **capa técnica directamente en su stack** —schema, meta, performance, plugins, sitemap, llms.txt— algo que un proveedor de solo-contenido no hace. Es un diferenciador enorme y verificable, y ataca justo el gap #1 (Be Readable).

## 6. Recomendación de ajuste a la propuesta

1. **Re-encuadrar el servicio** de "producción de artículos" a "**crecer un blog que ya rankea**": nuevos + **refresh/optimización de existentes** + **capa técnica AEO**.
2. **Reforzar el día 1–30** (30-60-90): auditoría técnica SEO/AEO + priorización de near-miss + primeros quick wins de refresh (mostrar movimiento temprano en términos de alto volumen).
3. **Agregar credencial WordPress + Automattic partner** en §7 (SEO/AEO) y §12 (por qué Efeonce): operamos su stack, no solo escribimos.
4. **Sumar la capa técnica a la reportería**: schema coverage, meta descriptions, near-miss tracker (pos 6–12 → 1–3).

## Datos crudos de referencia
- Semrush: `domain_organic_subdomains` (skyairline.com, cl) + `domain_organic` (blog, cl, top 40 por tráfico).
- Fetch: home, categoría destinos, artículo `bodegas-en-mendoza`.
- Sondas AEO: robots.txt (404), llms.txt (404), wp-sitemap.xml (200), schema JSON-LD (ausente), meta description (ausente en artículo).
