# Embudo de ads SEO/AEO — storytelling por etapa

> **Corrección de encuadre [operador, 2026-09-21]:** el **Grader es la puerta, no el servicio**. Lo que Efeonce
> vende es **Search Visibility 360** (familia de Wave): búsqueda clásica + visibilidad generativa + foundations
> técnicas + arquitectura de entidades + medición. El set anterior anclaba las 7 piezas al grader: eso vende el
> lead magnet, no la práctica.
>
> **Gobierna:** `seo-aeo-practice` (el negocio) · `seo-aeo` (el oficio) · modelo en `business-models/search-visibility-360/`

## 🔴 Qué se promociona: AEO como gancho, SEO como base [operador, 2026-09-21]

El servicio es **SEO y AEO** — pero **hoy el AEO es más comercial**: es lo nuevo, lo urgente y lo que nadie
tiene resuelto. El SEO es la base que sostiene la promesa y el terreno donde el resultado se mide.

**Matiz que conviene tener a la vista:** la práctica escribe el reframe como *«vendes visibilidad, **entras por
SEO**»* (`seo-aeo-practice` §3). No se contradice con lo anterior si se separan dos cosas distintas:

| | Qué es | Papel en el embudo |
|---|---|---|
| **AEO** | El gancho comercial | Abre la conversación: urgencia, novedad, nadie lo tiene resuelto (etapas 1–3) |
| **SEO** | La base | Sostiene la promesa y es donde el resultado se ve (etapas 4–5) |

Y las dos se juntan exactamente en la etapa 4, que es el argumento más fuerte del set: **la citación no es un
canal nuevo — es la condición para que el canal que ya pagas siga rindiendo.** Ahí el AEO deja de ser una
curiosidad y se vuelve eficiencia del SEO y del paid.

🔴 **Consecuencia para el copy:** arriba del embudo se habla de **motores de respuesta** (ChatGPT, Perplexity,
Gemini), no de «SEO». La palabra SEO aparece abajo, cuando ya hay evidencia — porque es la palabra que carga
la cicatriz del prospecto.

## 🔴 El Grader es el MEDIO, no el fin [operador, 2026-09-21]

**La conversión es que agenden reunión o pidan cotización** en las landings de servicio. El Grader es el paso
que se gana el derecho a pedirlo — no el objetivo.

| | Destino | Verificado 2026-09-21 |
|---|---|---|
| **AEO** | **`/aeo-2/`** (`/servicios/aeo` redirige ahí) | ✅ 200 |
| **SEO** | **`/servicios/posicionamiento-seo/`** | ✅ 200 |
| **Contenidos** | **`/servicio-marketing-de-contenidos/`** | ✅ 200 |
| **Agendar** | **`/agenda/`** — scheduler nativo (PDR-009) | ✅ 200 |

🔴 **Las rutas NO siguen un patrón único: hay cuatro.** `/aeo-2/` sin prefijo · `/servicio-marketing-de-contenidos/`
singular con guión · `/servicios-contratar-hubspot/` plural con guión · `/servicios/posicionamiento-seo/` en
subcarpeta. **Inferir una ruta es adivinar** — seis variantes del patrón `/servicios/` dieron 404 mientras la
página existía. El inventario sale del REST de WordPress (`/wp-json/wp/v2/pages`), no de suposición.

🔴 **Hay DOS páginas de agendamiento y eso puede partir la medición:** `/agenda/` («Agenda una reunión», el
scheduler nativo de PDR-009) y **`/agendar/`** («¡Habla con un experto!»). Antes de pautear hay que declarar
cuál es la canónica y qué pasa con la otra, o las reuniones van a contarse en dos lugares.

🔴 **Consecuencia para la medición:** la métrica norte deja de ser «informe entregado» y pasa a ser **reunión
agendada / cotización solicitada**. Un embudo optimizado al informe optimiza el lead magnet, no el negocio.

🔴 **Y un problema de atribución que hay que resolver ANTES de pautear al agendamiento:** PDR-009 declara que
la Scheduler API **no preserva por sí sola el tracking de UTK/UTM**. Sin la mitigación documentada —medición
Greenhouse/GTM + envío complementario por Forms API con `context.hutk`— **las reuniones que traiga la pauta no
se van a poder atribuir a la campaña**. Se puede gastar y no saber qué funcionó.

## La tesis que ordena el embudo

Vender SEO no se parece a vender nada más: **el 100% del prospecto ya compró SEO y tiene una cicatriz.** Le
prometieron primera página y el revenue no se movió. **No duda del servicio: duda de ti.**

Por eso el embudo no va de «problema → solución → oferta». Va de **evidencia → descalificación → método → oferta**:
se gana el derecho a ser escuchado antes de pedir nada.

---

## Las cinco etapas

### 1 · El canal se encogió — *demand creation*
**Conciencia:** unaware → problem-aware · **No pide nada.**

**Historia:** esto no es sobre ti ni sobre tu SEO. El lugar donde te buscaban dejó de funcionar como antes: la
respuesta llega antes que el clic. Quien responde ahora no trabaja para ti.

| | |
|---|---|
| Pieza | **`d1-la-respuesta`** (registro C · la sala vacía, la máquina de pie) ✅ |
| Copy | «Tu equipo se fue a las seis. / **La IA no.** / Y sigue respondiendo por tu marca.» |
| CTA | Ninguno. Es marca. |
| Mide | Alcance, retención de video, coste por alcance |

### 2 · No es que no aparezcas: es que te describen mal
**Conciencia:** problem-aware · **Pide una mirada, no datos.**

**Historia:** el riesgo no es la ausencia. Es que la respuesta exista, esté equivocada, y circule sin que nadie
de tu empresa la haya leído. Las cinco capas dan cinco versiones del mismo golpe.

| Capa | Pieza | Dominante |
|---|---|---|
| Be Found | `b1-feed` ✅ | No estabas. |
| Be Readable | `c1-readable` ✅ | Lo inventó. |
| Be Correct | `b3-display` ✅ | Nadie revisó qué dicen. |
| Be Actionable | `c2-actionable` ✅ | No pudo. |
| Be Intrinsic | `b2-stories` ✅ | La citan. A ti no. |

CTA: **Grader**. Mide: CTR, coste por informe entregado (`gh_grader_report_view`).

### 3 · Te lo decimos gratis, y también para qué NO te sirve — *la cuña*
**Conciencia:** solution-aware · **Aquí se gana el derecho a ser escuchado.**

**Historia:** no vamos a prometerte primera página. Te damos el diagnóstico antes de pedirte plata, y te decimos
en qué casos no deberías contratarnos. Si después quieres seguir, hablamos.

| | |
|---|---|
| Pieza | 🔴 **FALTA** — la descalificación honesta |
| Ángulo | «Hay marcas a las que esto no les sirve. Te decimos si eres una.» |
| Registro | C o B. Es la pieza más contraintuitiva del set y probablemente la que mejor convierte |
| CTA | Grader → informe → conversación |

### 4 · No es un canal nuevo: es lo que sostiene el que ya pagas — *el CFO*
**Conciencia:** product-aware · **El argumento económico.**

**Historia:** no te vendemos «estar en ChatGPT». Te decimos que **si te citan, tu propio canal rinde más**: las
marcas citadas reciben **+35% de clics orgánicos y +91% de pagados** — y eso se mide en **tu** GA4 y en **tu**
cuenta de Ads, no en un dashboard nuestro.

| | |
|---|---|
| Pieza | 🔴 **FALTA** — la pieza de eficiencia de medios |
| Por qué importa | Es lo único que hace entrar al CFO, y casi nadie en la categoría lo está diciendo |
| CTA | Diagnóstico de prospecto / reunión |

### 5 · Puedes ver lo que hacemos sin tener que confiar en nosotros — *retención*
**Post-venta (lado derecho del bow-tie).**

**Historia:** transparencia como producto. El portal y el ICO no son un extra: son la respuesta a la cicatriz.

| | |
|---|---|
| Pieza | 🔴 **FALTA** — la transparencia como producto |
| CTA | Ninguno / expansión |

---

## Lo que el copy NUNCA puede decir (reglas duras de la práctica)

| # | Prohibición | Por qué |
|---|---|---|
| 1 | **Rankings o «primera página»** | Es la promesa que rompió la confianza de la categoría |
| 2 | **Atribuir revenue a citación en IA** | No existe el modelo; los estudios se contradicen en el signo |
| 3 | **Un caso de cliente** | **Hoy hay CERO casos citables** de SEO/AEO |
| 4 | **Techo de clics** sin muestra en la curva del propio sitio | Cero clics no significa «convierte cero»: significa que nadie midió lo suficiente |
| 5 | **Precio por artículo** | Es entregarle al cliente la calculadora para comoditizarnos |
| 6 | Tráfico estimado sin versión de fórmula + as-of | La fórmula legacy se retira el 2026-11-01 |

## El diagnóstico del set actual

**5 de 7 piezas viven en la etapa 2** y las 7 apuntan al grader. Falta todo el tramo que convierte: la
descalificación honesta (3), la eficiencia de medios (4) y la transparencia (5) — que son justamente los
tres ángulos que la competencia no está usando, porque exigen decir cosas incómodas.
