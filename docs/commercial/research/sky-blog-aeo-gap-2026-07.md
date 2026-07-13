# SKY — Investigación de brecha SEO/AEO del blog (Slice 1 de TASK-1410)

> **Tipo:** artefacto de evidencia (interno de trabajo; su destilado es `client_facing`)
> **Fuente:** Semrush, base de datos **`cl`** (Google Chile) · **as-of 2026-07-13**
> **Owner task:** `TASK-1410 — Radiografía AEO`
> **Estado:** 🔴 **Cierra con gate humano.** El operador elige el ángulo. El agente **no** elige el artículo.

---

## Para qué existe este documento

La muestra de TASK-1410 solo tiene valor si el artículo **existe porque un dato lo pidió**. Si lo eligiera el redactor por intuición, el tercer panel (la evidencia) sería decorativo y la pieza mentiría sobre su propio método. Este documento es esa evidencia.

El criterio de selección **no es volumen**. Es el cruce de tres condiciones:

1. **Volumen real** (Semrush, base `cl`).
2. **SKY no lo posee hoy** (no rankea, o rankea mal).
3. **SKY tiene un ángulo legítimamente propio** — algo que sabe *porque es la aerolínea* y que un blog de viajes solo puede copiar.

Buscar solo (1) produce una guía de destino genérica: un *commodity* que cualquiera escribe, y por eso las citas se las llevan terceros. Ese es exactamente el patrón que el AI Visibility Grader ya midió en SKY (**0 citas en 35 respuestas**; las fuentes son BioBioChile, YouTube, Instagram, Despegar, Trustpilot).

---

## Hallazgo transversal (el más importante, y aplica a toda la oferta)

**Semrush mide el volumen de búsqueda de Google. No mide el espacio de preguntas que la gente le hace a un LLM.** Y la diferencia es brutal:

| Consulta | Volumen en Google Chile |
|---|---|
| `requisitos para viajar a [país]` | **0–10/mes** (prácticamente nulo en todas sus variantes) |
| `mejor época para viajar a [destino]` | **0–30/mes** |
| `carretera austral` | **18.100/mes** |
| `san pedro de atacama` | **49.500/mes** |

Las dos primeras son **exactamente** las preguntas que un pasajero le hace a ChatGPT o Perplexity. Tienen volumen casi nulo en Google y **enorme presencia en el espacio de prompts**.

**Consecuencia de diseño (y es la tesis de la oferta, medida):** el artículo no puede elegirse solo por volumen, ni escribirse solo para el volumen. La arquitectura correcta es de **dos capas**:

- **Ancla SEO** — el término principal con volumen real (es lo que trae tráfico de Google y lo que el comité puede verificar en Semrush).
- **Cobertura AEO** — las sub-preguntas del *query fan-out* (8–12 por consulta), que **no tienen volumen medible en Google** pero son donde el motor de respuesta recupera y cita.

Un artículo que solo hace lo primero es el *commodity* de siempre. Uno que solo hace lo segundo no se puede defender con datos ante un comité. La muestra hace **las dos**, y el panel de evidencia lo muestra.

---

## Candidato A — Carretera Austral ⭐ **(recomendado)**

### La cifra que lo define

| Dato | Valor | Fuente |
|---|---|---|
| Volumen del término principal `carretera austral` | **18.100/mes** | Semrush `cl`, 2026-07-13 |
| Posición de SKY para ese término | **NO aparece en el top 100** | Semrush `cl`, 2026-07-13 |
| Lo único que SKY rankea del tema | `ruta 7 carretera austral` → **#6** (210/mes) · `cochamo carretera austral` → **#27** (50/mes) | Semrush `cl` |
| Página existente de SKY | `blog.skyairline.com/carretera-austral/` — **existe y no rankea** | Semrush `cl` |

### Quién ocupa hoy ese espacio (top 12 real)

| # | Dominio |
|---|---|
| 1 | **es.wikipedia.org** |
| 2 | **instagram.com** |
| 3 | gochile.cl |
| 4 | carretera-austral.cl |
| 5 | chile.travel |
| 6 | chileestuyo.cl |
| 7 | tur.com |
| 8 | autofact.cl *(un sitio de revisión técnica de autos)* |
| 9 | wikiexplora.com |
| 10 | **tripadvisor.cl** |
| 11 | visitchile.com |
| 12 | facebook.com |

**Cero aerolíneas.** Y el SERP está encabezado por **Wikipedia + Instagram + TripAdvisor**, que son *precisamente* las fuentes que los motores de respuesta citan. (Wikipedia sola representa el **47,9%** de las citas de ChatGPT Search.)

### El ángulo propio de SKY (verificado, no supuesto)

SKY **vuela a Balmaceda (Coyhaique)** — el aeropuerto de entrada a la Carretera Austral. Rutas verificadas en Semrush: desde Santiago, Concepción, Puerto Montt, Castro, Valdivia, Temuco, Calama, Iquique, y también desde Lima, Montevideo y Buenos Aires. El término `aeropuerto balmaceda` mueve **6.600/mes** y SKY rankea **#11**.

**Nadie en ese top 12 puede decirte cómo llegar volando.** Wikipedia describe la ruta; Instagram la fotografía; TripAdvisor la reseña. **Ninguno resuelve la logística — y la logística es lo primero que pregunta quien realmente va a ir.**

### Por qué es citable (no solo rankeable)

A Wikipedia no se le gana escribiendo una Wikipedia peor. Se le gana con **lo que Wikipedia no tiene y no puede tener**: logística práctica, fechada, estructurada y verificable — cuándo ir, cuántos días toma cada tramo, cómo se llega en avión, qué se arrienda, qué está pavimentado y qué no. Eso es *dato con unidad y fuente*, que es la forma de contenido que los motores de respuesta extraen y citan.

### El argumento frente al comité (esto es lo que vende)

> *"Este es el SERP de 'carretera austral', 18.100 búsquedas al mes. Están Wikipedia, Instagram y TripAdvisor. Ustedes son la aerolínea que vuela ahí, tienen una página sobre el tema, y no aparecen en las primeras cien posiciones. Esto es lo que escribiríamos."*

No hay que adornarlo. **El dato es el argumento.**

### Riesgos honestos de este candidato

- SKY **ya tiene una página** de Carretera Austral. El artículo nuevo **no la reescribe**: es un satélite con **otra intención** (la logística de llegada y recorrido), que además apuntala a la página madre. Esto hay que decirlo explícito en la muestra, porque un evaluador atento lo va a notar y **la honestidad es el activo de la pieza**.
- Es el único candidato cuyo ángulo depende de un hecho externo (que SKY vuele a Balmaceda). **Verificado arriba.** Si cambiara la ruta, el ángulo se cae.

---

## Candidato B — San Pedro de Atacama

| Dato | Valor |
|---|---|
| `san pedro de atacama` (head) | **49.500/mes** — el volumen más alto de todos los candidatos |
| `que hacer en san pedro de atacama` | 1.000/mes — SKY en **posición 70** |
| Página existente | `blog.skyairline.com/san-pedro-de-atacama-3/` — **existe y falla** |
| Ángulo propio | Alto: SKY vuela a Calama, el aeropuerto de entrada |

**Por qué no lo recomiendo como primera opción:** es el caso más claro de **refresh**, no de artículo nuevo. Una página que rankea 70ª con contenido existente es exactamente el "frente 2" que la oferta ya promete por separado (*optimización de lo existente*). Usarla como muestra de **producción de contenido nuevo** confunde los dos frentes.

**Cuándo sí elegirlo:** si prefieres que la muestra demuestre el mayor volumen posible y estás dispuesto a enmarcarla como *"así reescribimos una página que hoy está en la 70"*. Es un argumento distinto —igual de válido— pero **no es el que pediste**.

---

## Candidato C — Punta Arenas / Torres del Paine

| Dato | Valor |
|---|---|
| `que hacer en punta arenas` | 1.900/mes — SKY en **posición 23** con página existente |
| `las torres del paine` | 3.600/mes — SKY en posición 33 |
| `puerto natales torres del paine` | 210/mes — SKY en **#6** |

**Descartado.** Es el territorio **mejor cubierto** de los tres: SKY ya tiene páginas de Torres del Paine, Puerto Natales y Punta Arenas, y rankea razonablemente. El upside es bajo y no hay una brecha que mostrar. Como demo, no argumenta nada.

---

## Recomendación

**Candidato A — Carretera Austral.** Es el único que cumple las tres condiciones a la vez, y es el único cuyo **SERP es en sí mismo el argumento**: un término de 18.100 búsquedas mensuales, dominado por Wikipedia, Instagram y TripAdvisor, donde la aerolínea que te lleva ahí **no existe**.

Además convierte el diagnóstico abstracto que ya está en la oferta (*"0 citas en 35 respuestas; las fuentes son terceros"*) en algo que el comité puede **ver en una sola pantalla**.

## 🔴 Gate

**El operador elige.** No se escribe una línea del artículo hasta que el ángulo esté confirmado.
