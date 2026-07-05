# Módulo 01 — Mecánica de plataforma (algoritmos y señales de ranking)

> **Carga esto cuando** necesites entender *por qué* una red distribuye (o entierra) una
> pieza: señales de ranking, el "test batch" inicial, la cascada de distribución, y qué
> acción concreta tomar por cada señal.
>
> **Frescura.** Los **principios** de engagement (save/share/dwell > like) son **estables**.
> Los **pesos exactos** y **qué red lidera** son **trimestral/volátil** — reverifica antes
> de estampar cualquier número o umbral. Ver `SOURCES.md` (tabla de volatilidad).

---

## 1. El modelo mental correcto: no rankeas, te distribuyen por prueba

Ninguna red moderna "muestra tu post a tus seguidores y ya". Todas corren una variante del
mismo mecanismo de **distribución en cascada por lotes de prueba**:

1. **Test batch inicial** — la red muestra la pieza a un lote pequeño (seguidores activos +
   una muestra fría). Mide la **respuesta temprana** en los primeros minutos/horas.
2. **Señal de calidad** — no cuenta *cuántos* la vieron, sino *cómo respondieron*: ¿la
   completaron?, ¿la guardaron?, ¿la reenviaron por DM?, ¿se quedaron leyendo?
3. **Cascada o corte** — si la respuesta supera el umbral de su cohorte, la red la sirve a
   un lote mayor y más frío. Se repite. Si no, muere en el primer lote.
4. **Cola larga** — saves, sends y búsqueda (social search) reactivan piezas *semanas*
   después. Por eso el contenido "evergreen + buscable" tiene segunda y tercera vida.

**Implicancia dura:** las **primeras 1–3 horas** son el examen. Todo lo que hagas para subir
la respuesta temprana (hook fuerte, responder comentarios al toque, sembrar en dark social)
mueve la cascada. Comprar likes o followers no — están demotados (§3).

---

## 2. Señales UNIVERSALES que rankean en 2026

Estas cuatro cruzan todas las redes y son lo primero que optimizas *(principio estable; pesos
exactos volátiles — as-of 2026-07 — reverificar → SOURCES.md)*:

| Señal | Qué mide | Por qué pesa | Qué hacer |
|---|---|---|---|
| **Watch time / completion** | % del video visto, rewatches | prueba de que el contenido *entrega* | hook <2s, retención, loop, quitar relleno |
| **Saves / bookmarks** | intención de volver | señal de valor duradero | contenido de referencia, "guárdalo para…" CTA |
| **Shares / sends (DM)** | reenvío persona-a-persona | máxima confianza social + alcance frío | contenido "esto es tan bueno que lo mando" |
| **Dwell time** | segundos parado en la pieza | atención real, no scroll | primer frame denso, texto que obliga a leer |

**Likes y followers = señal débil** en todas las redes *(as-of 2026-07 — reverificar)*. Un
like es un reflejo barato; un save/send es una decisión. Deja de perseguir vanity metrics.

---

## 3. Mecánica por red (2026)

> Todos los pesos numéricos y features abajo son **trimestral/volátil** *(as-of 2026-07 —
> reverificar → SOURCES.md)*. El *sentido* del sistema es más estable que el número.

### Instagram
- **Reels = entry point** de cuentas nuevas y alcance frío. Es la puerta principal a no-seguidores.
- **Sends por DM ponderan ~3–5× un like**; **saves ~3× un like** *(as-of 2026-07 — reverificar)*.
- **Likes y followers demotados.** Seguir a alguien ya casi no garantiza ver su feed.
- Señal de oro: **"¿se lo mandarías a un amigo?"** IG optimiza literalmente para sends.
- **Qué hacer:** diseña la pieza para el reenvío privado (relatable, útil, "etiqueta a…"),
  no para el like público. Carruseles para engagement, Reels para alcance (ver módulo 02).

### TikTok
- **Completion + rewatches** mandan en el For You. Un video corto visto 2–3 veces > uno largo
  abandonado.
- **Followers = señal débil en For You** *(as-of 2026-07 — reverificar)*: el FYP sirve a frío
  casi ciego a tu conteo de seguidores. Una cuenta de 200 seguidores puede reventar.
- Recompensa **rewatch loops** y **hooks que retienen el pulgar** en el primer segundo.
- **Qué hacer:** optimiza para que se vea *entero* y otra vez (loops, on-screen text que pide
  re-ver, duración justa al contenido — no estirar). TikTok también es buscador → módulo 05.

### LinkedIn
- **Dwell time manda.** Post que retiene **≥61s ≈ 15,6% engagement** vs **~1,2%** si pierde al
  lector en **0–3s** *(as-of 2026-07 — reverificar)*. La caída inicial te mata la distribución.
- **Un comentario con sustancia ≈ 15× un like** en distribución *(as-of 2026-07 — reverificar)*.
- **Video +34% YoY** en consumo *(as-of 2026-07 — reverificar)* — formato en alza.
- Premia **conversación profesional real** (comentarios largos, no emojis) y contenido que se
  lee completo (documentos/carruseles nativos, "ver más" que vale la pena).
- **Qué hacer:** primeras 2 líneas antes del "ver más" tienen que frenar el scroll (dwell);
  cierra pidiendo una opinión concreta (comentarios), no un like. Responde cada comentario.

### YouTube
- **Conecta Shorts con long-form** vía **session engagement**: un Short que lleva a que el
  espectador siga viendo *más YouTube* (incluido tu long-form) es premiado.
- Métricas núcleo: **watch time**, **retención** (curva de abandono), **session time**.
- Shorts = descubrimiento / tope de embudo; **long-form = profundidad, autoridad y saves**.
- **Qué hacer:** usa Shorts como anzuelo hacia el long-form (mismo tema, "versión completa en
  el canal"); optimiza retención mirando la curva de abandono y cortando el valle.

### Facebook / X / emergentes
- **FB/X**: alcance orgánico bajo; sirven para comunidad existente, grupos, y amplificación.
  Cadencia alta (1–2/día) *(as-of 2026-07 — reverificar → módulo 03)*.
- **Emergentes / cambios de propiedad** (nuevas redes, adquisiciones, cambios de algoritmo por
  cambio de dueño): **volátil por definición** — nunca afirmes nada sin reverificar en el
  momento. Cuando una red cambia de dueño, su mecánica puede cambiar en semanas.

---

## 4. Tabla comparativa de señales por red

*(as-of 2026-07 — reverificar → SOURCES.md; usa esto como brújula, no como verdad congelada)*

| Red | Señal #1 | Entry point / alcance frío | Followers | Palanca principal |
|---|---|---|---|---|
| **Instagram** | sends (DM) + saves | Reels | débil | reenvío privado |
| **TikTok** | completion + rewatches | For You (casi ciego a followers) | muy débil | loop + hook <1s |
| **LinkedIn** | dwell (≥61s) + comentarios | feed profesional | medio | conversación real |
| **YouTube** | watch time + retención | Shorts → long-form | medio | session engagement |
| **FB / X** | shares + comentarios | grupos / feed | medio | comunidad + cadencia |

---

## 5. Qué hacer con cada señal (playbook accionable)

- **Sube completion:** hook <2s, corta el relleno, cierra en loop, duración = contenido (no estires).
- **Sube saves:** entrega algo *de referencia* (checklist, framework, dato), pídelo explícito
  ("guárdalo para cuando…").
- **Sube sends:** haz la pieza *reenviable* — relatable, útil o divertida a nivel 1-a-1 ("mándaselo a…").
- **Sube dwell (LinkedIn/texto):** primeras 2 líneas densas, formato escaneable, "ver más" que paga.
- **Sube session time (YouTube):** enlaza Shorts↔long-form, tarjetas al final, playlists temáticas.
- **Protege el test batch:** publica cuando tu audiencia está activa (Metricool
  `getBestTimeToPostByNetwork`), y **responde comentarios en la primera hora** (sube respuesta temprana).

---

## 6. Reglas duras

- **NUNCA** optimices para likes/followers como métrica de éxito — están demotados *(as-of 2026-07 — reverificar)*.
- **NUNCA** afirmes un peso exacto ("sends = 3–5× likes", "dwell 61s") sin reverificar; son trimestrales.
- **NUNCA** asumas que la mecánica de una red emergente o recién adquirida sigue igual — reverifica en el momento.
- **SIEMPRE** diseña para la **respuesta temprana** (primeras 1–3h): es el examen que decide la cascada.
- **SIEMPRE** elige la señal objetivo *antes* de crear la pieza, y deja que esa señal decida el formato (módulo 02).
