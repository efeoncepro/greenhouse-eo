# 09 — Analytics & Measurement

> **Alcance.** Analítica social **nativa**: qué mirar por objetivo, las métricas que importan en
> 2026 (y las vanity que ya no), cómo leer engagement rate de verdad, cadencia de reporting y
> qué reportar a un cliente vs a operación interna. **Borde:** atribución dura de funnel, dark
> social medido, modelos de conversión → `growth-marketing-cro`. Cierra con `templates/social-report.md`.

> **Tesis 2026.** Likes y followers están **demotados** a señal débil. Lo que rankea (y lo que
> pruebas negocio) es **watch time/completion, saves, shares/sends y dwell**. Medir la vanidad
> es medir el ruido.

---

## 1. Métricas por objetivo (elige el objetivo primero)

No hay "las métricas de redes": hay **la métrica del objetivo**. Declara el objetivo, después mira.

| Objetivo | Métrica primaria | Secundarias | Vanity a ignorar |
|---|---|---|---|
| **Alcance / notoriedad** | Alcance (personas únicas), completion | Impresiones, shares/sends | Likes, followers brutos |
| **Engagement / comunidad** | Save rate + send rate | Comentarios con sustancia, dwell | Likes totales |
| **Conversión / negocio** | Add-to-cart, conversión, clics a destino | Save→visita, tráfico social | Impresiones |
| **Comunidad / lealtad** | Retorno de audiencia, UGC generado, DMs | Sentiment, menciones, respuestas | Followers |

Regla: **una pieza puede ganar en un objetivo y perder en otro** (un Reel de alcance no tiene por
qué generar saves). Nunca juzgues una pieza contra una métrica que no era su objetivo.

## 2. Las métricas que importan en 2026 (y las que no)

**Importan (señales fuertes):**
- **Watch time / completion rate** — cuánto del video se ve; la señal #1 de video.
- **Saves (guardados)** — intención de volver; vale mucho más que un like.
- **Shares / sends** — reenvíos por DM; la señal de distribución más potente hoy.
- **Dwell time** — cuánto tiempo se detiene la persona en tu post (clave en LinkedIn/IG).
- **Comentarios con sustancia** — no emojis: conversación real.

**Demotadas / vanity (no las reportes como logro):**
- **Likes** — señal débil, fácil de inflar, poca correlación con negocio.
- **Followers brutos** — crecer en followers no es crecer en alcance ni en ventas.
- **Impresiones sueltas** — sin alcance/completion al lado, no dicen nada.

> **Nunca** construyas un reporte alrededor de likes y followers. Si el cliente los pide, muéstralos
> como contexto, pero **encabeza con save/send/completion**. Educar es parte del trabajo.

## 3. Definiciones que se confunden (úsalas bien)

- **Reach (alcance)** = personas únicas que vieron el contenido. **Impressions** = veces mostrado
  (una persona puede sumar varias). Reportar impresiones como "alcance" es un error clásico.
- **Engagement rate real = interacciones ÷ ALCANCE**, no ÷ followers. El rate por followers
  infla la cuenta chica y castiga la grande; el rate por alcance mide *calidad de la pieza*.
- **Save rate** = saves ÷ alcance. **Send rate** = sends ÷ alcance. Son las tasas que mejor
  predicen distribución en 2026.
- **Retención de video** = curva de cuánta gente sigue viendo segundo a segundo; el **drop en
  los primeros 3s** te dice si el hook falla.
- **Completion rate** = % que ve hasta el final; en video corto es la señal que más pesa.

## 4. Benchmarks honestos (evita promesas)

- Los benchmarks **varían por red, industria, tamaño de cuenta y formato**. No prometas un número
  absoluto ("vamos a llegar a X% de engagement") — **compara contra el propio baseline** de la
  cuenta y contra la mediana de la industria como referencia, no como garantía.
- **Nunca prometas viralidad ni cifras de alcance/venta.** El alcance depende del algoritmo, no
  se compra con voluntad. Promete **proceso** (cadencia, calidad, iteración), no resultado.
- Reporta **tendencia** (¿mejora vs el mes pasado?) más que valor absoluto aislado.
- Marca cualquier benchmark de industria con `as-of` y fuente — son volátiles.

## 5. Cadencia de reporting

| Cadencia | Para quién | Qué incluye |
|---|---|---|
| **Semanal (interno)** | Operación / el estudio | Piezas top/flop, señales tempranas, qué iterar, qué amplificar |
| **Mensual (cliente)** | Cliente / stakeholder | Tendencia por objetivo, aprendizajes, top pieces, próximos pasos |
| **Trimestral (estratégico)** | Cliente / dirección | ¿Funciona la estrategia? ¿Cambiar red/formato/cadencia? |

Regla: **el reporte semanal es para decidir**, el mensual es para **narrar el progreso**, el
trimestral es para **decidir el rumbo**. No mezcles profundidad interna con lectura de cliente.

## 6. Qué reportar a un cliente vs a operación interna

**A un cliente (claridad + narrativa + valor):**
- 3–5 KPIs por objetivo declarado, con **tendencia** (▲/▼ vs período anterior).
- Top 3 piezas ganadoras (con *por qué* ganaron) + 1–2 aprendizajes.
- Traducción a negocio: qué significa para su marca/ventas, no jerga.
- Próximos pasos concretos. **Sin** métricas crudas de plataforma que confundan.

**A operación interna (profundidad + acción):**
- Todas las señales (retención por segundo, save/send rate por pieza, hora, formato).
- Flops y por qué; qué hook falló; qué amplificar (→ módulo 07).
- Experimentos abiertos y su lectura.

> **Nunca** entregues un volcado crudo de dashboard a un cliente. El valor está en la **síntesis**,
> no en la exportación. Un reporte de cliente que solo lista números no es un reporte, es data.

## 7. Cómo leer Metricool analytics

- **`getAnalyticsDataByMetrics`** — trae las métricas por red/período. Pide primero
  **`getAnalyticsAvailableMetrics`** para saber qué está disponible por red antes de armar la query.
- Cruza **alcance + completion + save/send** para juzgar una pieza; nunca una métrica sola.
- Usa **`getBestTimeToPostByNetwork`** como input de cadencia/horario, no como dogma — valida
  contra tu propio histórico.
- Para el detalle de tooling (endpoints, flujo, confirmación humana) → `efeonce/STUDIO_TOOLING.md`
  y el módulo 10.

## 8. Atribución social y dark social

- **Dark social = invisible por diseño:** compartir por DM, WhatsApp, Discord, screenshot. Buena
  parte de la distribución real **no aparece** en la analítica nativa. **Nunca asumas que el
  tráfico "directo" es orgánico casual** — mucho es dark social sin referrer.
- El estudio mide lo que la plataforma expone (alcance, engagement, señales). **La atribución
  dura — vincular una compra/lead a una pieza, modelar el funnel, medir incrementalidad — es
  `growth-marketing-cro`.** No inventes atribución social precisa: es honesto decir "no rastreable
  al 100%".
- Proxies honestos de dark social: picos de "directo" tras un post, sends elevados, menciones no
  linkeadas, "¿de dónde me conociste?" en formularios (→ `greenhouse-growth-forms`).

## 9. Borde con skills hermanas + cierre

- **`growth-marketing-cro`** → atribución/funnel duro, dark social medido, CRO, experimentos.
- **`digital-marketing`** → medición de campaña integrada multi-canal, media mix ROI.
- **`dataviz-design`** → si el reporte necesita gráficos/dashboard visual serio.
- **Cierra siempre** con `templates/social-report.md` (no con prosa suelta ni un dump).

> **Reglas duras del módulo.** **NUNCA** encabeces un reporte con likes/followers. **NUNCA**
> calcules engagement rate sobre followers (usa alcance). **NUNCA** prometas viralidad ni cifras
> de alcance/venta. **NUNCA** entregues un volcado crudo a un cliente (sintetiza). **NUNCA**
> inventes atribución social precisa — el dark social es invisible y el funnel duro es
> `growth-marketing-cro`. **SIEMPRE** declara el objetivo antes de elegir la métrica y reporta
> tendencia contra el propio baseline.
