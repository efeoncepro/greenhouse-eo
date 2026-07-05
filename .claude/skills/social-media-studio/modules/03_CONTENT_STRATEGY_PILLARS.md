# Módulo 03 — Estrategia de contenido (pilares, series, batching, calendario, cadencia)

> **Carga esto cuando** tengas que definir *qué* se publica de forma sostenible: pilares de
> contenido, serialización, producción en lote, calendario editorial y cadencia óptima por red.
>
> **Frescura.** El *método* (pilares, series, batching, consistencia > volumen) es **estable**.
> Las **cadencias óptimas por red** son **trimestral** — reverifica antes de estampar cualquier
> número *(as-of 2026-07 — reverificar → SOURCES.md)*.
>
> **Límite.** Esto es ejecución profunda del *canal social*. La mezcla de canales, el presupuesto
> y la campaña integrada multi-canal **no van acá** → `digital-marketing`. Cierra siempre con el
> template `templates/content-calendar-30d.md`.

---

## 1. Doctrina 2026: "estar en todas murió"

La estrategia ganadora **no** es presencia en 6 redes. Es:

> **Una red primaria. Un formato núcleo. Una cadencia sostenible.**

Consistencia + engagement **vencen** a volumen disperso *(as-of 2026-07 — reverificar)*. Un
creador que domina Reels en Instagram 4×/semana durante 6 meses gana a uno que publica flojo en
todas. Elige donde tu audiencia *ya vive* (§6), domina un formato (módulo 02), y expande a una
segunda red solo cuando la primera esté en piloto automático.

**Antes de escalar redes, escala consistencia.** La red castiga el arranque-y-abandono.

---

## 2. Pilares de contenido (cómo definirlos)

Un **pilar** es un tema recurrente que conecta lo que *tú* sabes con lo que tu audiencia
*necesita*. Define **3–5 pilares** (más = dispersión, menos = repetición). Método:

1. **Intersección** — lista lo que dominas × lo que tu audiencia pregunta/sufre. Los cruces son pilares.
2. **Prueba de sostenibilidad** — ¿puedes generar 10+ piezas por pilar sin forzar? Si no, no es pilar.
3. **Asigna un trabajo a cada pilar** — educar, inspirar, probar (social proof), entretener, convertir.
4. **Nómbralos** — un pilar con nombre se convierte en serie (§3).

**Ejemplo (canales propios del grader AEO / Efeonce — overlay):**

| Pilar | Trabajo | Formato típico | Señal objetivo |
|---|---|---|---|
| "Por qué la IA no te cita" | educar | Reel + carrusel | saves |
| "Auditorías en vivo" | probar | Live / long-form | dwell + conversión |
| "Antes/después de marca" | inspirar | carrusel | sends |
| "Detrás del estudio" | humanizar | foto/estático | comunidad |

---

## 3. Series y serialización — la palanca de 2026

Las **series ganan** en 2026 *(as-of 2026-07 — reverificar)*: crean *expectativa* (el algoritmo
y la audiencia esperan la próxima), suben retención de seguidores, y **bajan drásticamente el
costo de idear** (el formato ya está resuelto, solo cambias el contenido).

- Convierte cada pilar en **una serie con nombre y formato fijo**: "Auditoría #7", "Error de Reels #12".
- **Estructura repetible** = producción más barata (mismo intro, mismo layout, misma duración).
- **Numeración/temporadas** disparan el "quiero la anterior/siguiente" (saves + follow + binge).
- Cierra cada pieza anticipando la próxima ("la próxima semana, el error #3").

> Serie > post suelto: una serie es un *producto*, un post suelto es un *evento*.

---

## 4. Batching / producción en lote

**No produces día a día. Produces por lotes.** El batching separa las fases mentales (idear,
grabar, editar, escribir, programar) y multiplica el output con la misma energía.

Flujo canónico de una sesión de batch:

1. **Idear en bloque** — llena el calendario de 30 días de una sola sentada (por pilar/serie).
2. **Grabar en bloque** — mismo setup, misma ropa/escena → 5–10 piezas en una sesión.
3. **Editar en bloque** — mismo template/preset (aquí entran los generadores: Higgsfield para
   video, greenhouse-ai-image-generator / Figma para estáticos y carruseles).
4. **Escribir captions en bloque** — con voz consistente (delega craft fino a `copywriting`).
5. **Programar en bloque** — Metricool `createScheduledPost` + `getBestTimeToPostByNetwork`,
   **con confirmación humana antes de que salga en vivo** (regla dura de la skill).

Meta realista: **1 sesión de batch = 2–4 semanas de contenido** de la red primaria.

---

## 5. Calendario editorial + mix de contenido

**Regla 70-20-10** (mix de contenido, no de canales — el mix de canales es `digital-marketing`):

| % | Tipo | Propósito |
|---|---|---|
| **70%** | Valor / contenido núcleo probado | educa, entretiene, sirve a la audiencia — construye confianza |
| **20%** | Contenido de terceros / colaboraciones / tendencias | conecta con la conversación, presta alcance |
| **10%** | Promoción directa / venta | pide la acción (comprar, agendar, suscribir) |

El calendario cruza **pilar × formato × señal objetivo × fecha**, no "publicar algo el martes".
Cada slot del calendario declara: qué pilar, qué serie, qué formato, qué señal persigue, y su
mejor horario (Metricool). Aterriza esto en `templates/content-calendar-30d.md`.

---

## 6. Cadencia óptima por red

*(as-of 2026-07 — reverificar CADA número → SOURCES.md; tratar como piso referencial, no ley)*

| Red | Cadencia referencial | Nota |
|---|---|---|
| **Instagram** | **3–5 feed + 2–4 Reels/semana** | Reels para alcance, carrusel/feed para engagement |
| **LinkedIn** | **2–3/semana** | calidad > frecuencia; el dwell castiga el relleno |
| **TikTok** | **5–10/semana** | volumen alto tolerado; el FYP premia experimentar |
| **Facebook / X** | **1–2/día** | alcance orgánico bajo; comunidad + amplificación |
| **YouTube** | **1–2 long-form/semana + 3–5 Shorts** | Shorts alimentan el long-form (session engagement) |

**Consistencia > volumen:** es mejor sostener el piso bajo de cada red durante meses que reventar
una semana y desaparecer. Si no puedes sostener la cadencia alta, baja la meta — no la abandones.

---

## 7. Cómo priorizar la red primaria según audiencia

Elige donde tu audiencia **ya está y ya consume tu formato**, no donde te gustaría:

- **B2B / decisores / autoridad profesional** → **LinkedIn** (dwell + comentarios).
- **Descubrimiento amplio / cultura / <30 años** → **TikTok** o **Reels** (alcance frío + social search).
- **Educación profunda / SEO / autoridad de largo plazo** → **YouTube** (long-form + cola de búsqueda).
- **Comunidad visual / lifestyle / producto** → **Instagram** (carrusel + Reel + Stories).
- **Clientes Globe (enterprise marketing):** decide con datos del cliente (dónde vive *su* audiencia),
  no por defecto → ver `efeonce/CLIENT_DELIVERY.md`.

Regla: **una** primaria dominada > cinco a medias. Expande solo tras alcanzar consistencia en la primera.

---

## 8. Reglas duras

- **NUNCA** planifiques presencia simultánea en muchas redes sin una primaria dominada — "estar en todas murió".
- **NUNCA** estampes una cadencia por red sin reverificar — son trimestrales *(as-of 2026-07 — reverificar)*.
- **NUNCA** produzcas pieza a pieza cuando puedes batchear — separa idear/grabar/editar/escribir/programar.
- **NUNCA** programes en vivo con Metricool sin confirmación humana explícita (regla dura de la skill).
- **NUNCA** planifiques el mix de *canales* ni el presupuesto acá — eso es `digital-marketing`; acá es el canal social por dentro.
- **SIEMPRE** define 3–5 pilares con prueba de sostenibilidad y conviértelos en series con nombre.
- **SIEMPRE** aplica 70-20-10 al mix de *contenido* y cierra en `templates/content-calendar-30d.md`.
- **SIEMPRE** prioriza consistencia sobre volumen; si no sostienes la cadencia, baja la meta, no la abandones.
