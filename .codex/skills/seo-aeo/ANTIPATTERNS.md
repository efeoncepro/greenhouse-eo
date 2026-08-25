# ANTIPATTERNS — Qué NO hacer (guardrails)

> Contrasta toda táctica agresiva contra este archivo ANTES de recomendarla.
> Efeonce/Greenhouse no hace black-hat: el riesgo (penalización, daño
> reputacional, pérdida de confianza de modelos IA) no compensa el atajo.
> Sello: as-of 2026-06; anti-patrones de **inventario y lectura de evidencia**
> as-of 2026-08-25.

## 🔴 Sobre-declarar una cifra (el error más caro del oficio)

> **Auditado en vivo el 2026-07-14** sobre una muestra de trabajo real: **de las 6 cifras que la pieza
> exhibía, 3 no resistían una verificación**. Todas venían de *esta skill*. Se corrigieron acá para que
> no vuelvan a salir. En una categoría de humo, la honestidad es el producto — y una cifra
> sobre-declarada la destruye más rápido que la prosa plana.

### 1. Una PREVALENCIA no es un LIFT

**El error:** el estudio dice *«las páginas que ChatGPT cita **contienen** una tabla 2,3× más seguido
que las que rankean en Google»* (30% vs 13%) — una **razón de prevalencia entre dos corpus**. Y se
publica como *«poner una tabla te da 2,3× más citas»* — un **lift causal** que nadie midió.

Es la misma operación mental que convirtió el **`Quotation Addition` (+41%)** —que mide **citar
FUENTES o EXPERTOS entre comillas**— en *«nuestra cita destacada da +41%»*. Tomar una descripción y
venderla como palanca.

- 🔴 **NUNCA** conviertas una correlación/prevalencia en una recomendación causal.
- 🔴 **NUNCA** le agregues variables al hallazgo (*«tabla **+ lista numerada** → 2,3×»* — la lista
  **no estaba** en el estudio).
- ✅ Si el mecanismo se sostiene solo (*una fila tabulada **es** la respuesta, se extrae sin
  ambigüedad*), **argumenta el mecanismo y suelta el número**. Es más fuerte y no te pueden cazar.

### 2. El nombre de la fuente tiene que poder GOOGLEARSE

**El error:** se publicó *«AI Platform Citation Source Index 2026 — 680 millones de citas, 6 estudios
independientes»*. **Ese estudio no existe con ese nombre.** El dato era de **Bluefish** (reportado por
Adweek), los **6,1M** de citas eran de **Goodie AI** (otro sub-hallazgo del mismo artículo), y eran **4
firmas**, no 6 estudios. Un resumen de búsqueda había fundido dos datasets en uno, y se transcribió.

- 🔴 **NUNCA** publiques una fuente cuyo nombre no puedas encontrar buscándolo. El evaluador **va a
  buscarlo** — y si no lo encuentra, **se cae todo lo demás que dijiste**, no solo ese dato.
- 🔴 **NUNCA** confíes en el resumen de un buscador para atribuir: **abre la fuente primaria**. Los
  resúmenes sintetizan varios estudios en una frase y no lo avisan.
- ✅ Cita **quién midió**, **sobre qué muestra** y **con qué fecha**. Si la muestra no incluye tu
  dominio (p. ej. el estudio de 66 marcas de consumo/gaming/salud/fintech **no tenía turismo**),
  **dilo**.

### 3. Un base rate sin grupo de control no prueba nada

*«El 72,4% de las páginas citadas tiene cápsula de respuesta»* **no dice** qué porcentaje de las **NO
citadas** también la tiene. Casi cualquier post bien escrito abre con un resumen. **Sin el
contrafactual, el número describe un patrón — no prueba un lift.** Decláralo así, o no lo uses.

## Borde black-hat / spam (riesgo de penalización Google)

- **Cloaking** — mostrar a Googlebot/bots IA algo distinto que al usuario.
  Violación dura. Incluye servir contenido por user-agent.
- **Link schemes** — compra de links, PBNs, intercambios masivos, anchors
  exactos a escala, links en footer/sidebar sitewide. Google los detecta y
  penaliza el dominio que recibe.
- **Scaled content abuse** (política reforzada 2024) — generar contenido a escala
  (IA o no) con poco valor para manipular ranking. **Este es el anti-patrón
  estrella de la era IA.** Generar 1000 posts con LLM sin datos ni valor
  incremental = penalización + cero citas IA.
- **Doorway pages** — páginas casi idénticas por ciudad/keyword sin valor único,
  hechas solo para capturar variantes. Distinto de páginas locales/programáticas
  *con valor real*.
- **Keyword stuffing** — repetir keywords antinaturalmente. Muerto hace años;
  además **no** mueve la aguja en GEO (la investigación lo confirma).
- **Hidden text / hidden links** — texto del color del fondo, oculto en CSS,
  marcar schema de contenido no visible. Violación.
- **Sneaky redirects** — redirigir al usuario a algo distinto de lo indexado.
- **Parasite SEO** — explotar la autoridad de un dominio host publicando
  contenido de terceros poco relacionado. Google endureció contra esto
  ("site reputation abuse", 2024).

## Anti-patrones específicos de AEO/GEO

- **Tratar "AEO" como canal único** — optimizar genérico "para IA" sin distinguir
  motor. Cada motor cita fuentes distintas (`04_AEO_GEO.md`).
- **Sobre-invertir en `llms.txt`** — Google no lo usa, 97% reciben cero requests.
  Ponerlo si quieres, pero no a costa de estructura/frescura/entidad.
- **Spam en Reddit/comunidades** — autopromoción descarada. Reddit y los modelos
  castigan el spam; quema la marca. Participación = valor genuino o nada.
- **Fabricar reseñas / señales falsas** — reseñas compradas, menciones falsas.
  Riesgo legal + de plataforma + reputacional.
- **Falsear E-E-A-T** — autores ficticios, credenciales inventadas, "experiencia"
  que no existe. En YMYL es especialmente grave y detectable.
- **Edición promocional de Wikipedia/Wikidata** — se revierte, daña reputación y
  puede generar cobertura negativa.

## Anti-patrones de proceso / criterio

- **Recomendar sin diagnosticar** — listas genéricas de 40 ítems sin intake ni
  priorización. (Ver SKILL.md §0.)
- **Perseguir el 100 de Lighthouse** — optimizar métricas de laboratorio en vez
  de datos de campo (CrUX). Arregla lo rojo, no persigas vanity scores.
- **Sacrificar contenido/UX por SEO** — texto keyword-stuffed que el humano
  odia, intersticiales agresivos. Google premia experiencia real.
- **Presentar estimaciones como mediciones** — si no hay GSC/herramienta, dilo;
  marca como estimado (SKILL.md §5).
- **Prometer rankings/timelines garantizados** — el SEO/AEO no se garantiza;
  quien lo promete miente. Comunica rangos y probabilidades.
- **Ignorar el costo de bloquear bots IA** — bloquear retrieval bots = salir de
  esas respuestas; data 2026: bloquear → −23.1% tráfico sin reducir citas de
  forma fiable. Decisión consciente, no default (`01_SEO_TECHNICAL.md`).
- **Afirmar datos volátiles de memoria** — features de motores y cifras cambian.
  Reverifica con WebSearch (`SOURCES.md`).

## Anti-patrones de inventario y de lectura de evidencia (as-of 2026-08-25)

> Los cinco salen de una misma sesión de research de cliente. Ninguno es black-hat:
> los cinco se cometen **creyendo que se está siendo riguroso**, y los cinco terminan
> en una afirmación falsa dentro de un entregable.

### 1. Un grep de patrón de nombre no es un inventario

Un regex anclado a la convención vieja (`^N##_`) devolvió **cero** para el mes que ya
usaba otra convención, y se concluyó que los entregables **habían desaparecido**.
Existían: otra extensión, otro nombre.

- 🔴 **NUNCA** concluyas ausencia desde un solo eje de búsqueda. «Pocos resultados» no
  es «hay pocos»: puede ser «buscaste por el eje equivocado».
- ✅ Para concluir ausencia, **cambia el eje** (barre por carpeta y por extensión, no
  por patrón de nombre) **y nombra dónde no miraste**.

### 2. El peso en caracteres no mide la calidad de una sección

Se calificó de «flaca» una capa AEO porque **pesaba 8% del documento**; eran checklist
y tabla — el formato **más denso que existe**. El texto corrido pesa más y decide
menos.

- 🔴 **NUNCA** midas la solidez de una sección por volumen de texto.
- ✅ Mide **cobertura de decisiones**: cuántas preguntas accionables deja resueltas.

### 3. Descartar una oportunidad leyendo el SERP de la keyword equivocada

Una familia entera se descartó por el SERP de un término de **referencia de código**,
cuando el término con **intención comercial** tenía otra cara.
→ Método completo, con la tabla del caso medido, en `02_SEO_CONTENT.md`
(*Verifica el SERP del eje que vas a atacar, no el de su prima léxica*).

- 🔴 El matiz que se suma acá: el error **no es sólo elegir mal el objetivo**, es
  **descartar** — un falso negativo no deja rastro en ningún backlog, así que nadie lo
  audita después. Verifica el eje **antes de matar una familia**, no sólo antes de
  atacarla.

### 4. Una dificultad sospechosamente baja se verifica en SERP antes de fijarse como objetivo

Un KD anómalamente bajo para el volumen que declara suele ser **demanda de
referencia** (códigos de color, muestrarios, tablas de equivalencia), no demanda del
tema. Es fácil de ganar y no le sirve al negocio.

- 🔴 **NUNCA** fijes como objetivo una keyword por su dificultad sin haber mirado su
  SERP real.
- ✅ Hasta verificarla, entra al plan como **oportunidad condicionada**, nunca como
  objetivo comprometido. La condición y su dueño se escriben junto a la fila.

### 5. Un hallazgo de inventario local no es una acusación de proceso

Carpetas vacías o cruzadas pueden ser **sincronización de almacenamiento**, no
incumplimiento de entrega. Reportarlo al cliente como incumplimiento es un daño
difícil de deshacer, y el costo de verificar es una pregunta.

- 🔴 **NUNCA** conviertas una observación de sistema de archivos en un juicio sobre el
  trabajo de un equipo.
- ✅ **Reverifica con el equipo dueño** antes de que salga del borrador. Si igual entra
  al entregable, entra marcado como **OBSERVADO / pendiente de confirmar**, con dueño.

## Señal de alarma transversal

Si una táctica depende de que Google o un motor IA **no se den cuenta**, es
black-hat y es deuda con interés. La estrategia robusta y escalable (la que
Greenhouse exige) gana porque el contenido y la entidad son *genuinamente*
buenos, no porque engañan al sistema.
