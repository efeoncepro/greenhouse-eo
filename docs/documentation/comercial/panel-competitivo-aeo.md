# Panel Competitivo AEO — Comparar marcas en las respuestas de IA

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-09-11 por Claude
> **Ultima actualizacion:** 2026-09-11 por Claude
> **Documentacion tecnica:** [GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md)
> **Manual comercial:** [Usar el Panel Competitivo AEO en venta](../../manual-de-uso/comercial/panel-competitivo-aeo-en-venta.md)
> **Estado:** procedimiento operador (todavía no es una capacidad gobernada; ver "Lo que viene")

---

## Qué es

Un **panel competitivo AEO multi-marca** es correr el AI Visibility Grader sobre varias marcas a la vez —el
cliente y sus competidores— **en las mismas condiciones**: el mismo set de preguntas, el mismo día, el mismo
mercado y los mismos cinco motores de respuesta con IA (ChatGPT, Claude, Gemini, Perplexity y Google). Como las
condiciones son idénticas, los informes de cada marca se pueden comparar entre sí. Después se leen juntos
(análisis cruzado) para armar un **panorama** de quién aparece, quién es citado y dónde.

Un informe del Grader sobre una sola marca dice cómo le va a esa marca. El panel dice **cómo le va frente a las
demás**, que es la pregunta que se hace un gerente de marketing.

## Por qué existe

Tiene dos usos:

1. **Operación con un cliente contratado.** Fija un panel de referencia contra el cual medir el trabajo: qué
   motores lo ignoran, qué preguntas gana la competencia y qué fuentes de terceros sostienen esas respuestas.
2. **Paso de venta.** Es la forma más clara de aplicar el principio de la práctica SEO/AEO de Efeonce:
   **evidencia antes que promesa**. En vez de explicar lo que haríamos, se entrega el mapa completo medido, con sus
   límites declarados, y se pide una reunión para leerlo juntos.

> Detalle técnico: el principio viene del módulo 05 de la práctica SEO/AEO
> (`.claude/skills/seo-aeo-practice/modules/05_CUNA_GRADER.md`), incluida la lista de lo que el Grader no puede
> hacer.

## Cómo funciona

| Paso | Qué pasa | Quién |
|---|---|---|
| 1. Elegir marcas y mercado | Se acuerdan el cliente, sus competidores y el mercado (país) | Comercial con el cliente o prospecto |
| 2. Diseñar el set de preguntas | Preguntas conversacionales armadas desde **demanda real** del mercado (Semrush), no desde keywords sueltas | Growth / AEO |
| 3. Preparar y encolar | Se crea un perfil por marca, se activa el mismo set en todos y se encola un run por marca | Growth / AEO |
| 4. Medición | Cada run hace las 12 preguntas en los 5 motores (60 respuestas por marca), puntúa y publica el informe solo | La plataforma |
| 5. Revisión humana | Si un informe queda en revisión, una persona lee la frase que lo disparó y decide | Operador (humano) |
| 6. Análisis cruzado | Se cuentan las menciones de **todas** las marcas con la misma regla en todas las respuestas | Growth / AEO |
| 7. Entrega | Informe web tokenizado + PDF por marca, y un correo con el panorama que cierra pidiendo una reunión | Comercial |

Tres rasgos lo hacen confiable:

- **El set de preguntas es curado y viene de demanda real.** En el caso fuente fueron 12 preguntas: 8 de
  descubrimiento que no nombran ninguna marca (lo que pregunta alguien que todavía no eligió), 1 comparativa
  anclada en el cliente ("¿Qué alternativas hay a SKY…?", con el texto idéntico en todos los runs) y 3 que nombran
  la marca de cada run (reputación, reclamos, identidad). El máximo es 12 preguntas por run.
- **El conteo es simétrico.** Las menciones de cada marca se cuentan con la misma regla en todas las respuestas de
  todos los runs. Ninguna marca se cuenta con un criterio más favorable.
- **Hay revisión humana.** Cuando el Grader detecta lenguaje sensible en un informe, no se publica solo: una
  persona lo lee y lo aprueba con criterio y con su firma.

> Detalle técnico: cómo funciona el motor del Grader (proveedores, puntaje, informe) en
> [AI Visibility Grader](../growth/ai-visibility-grader.md). El procedimiento operativo del panel (perfiles, set
> activo, encolado, revisión) vive en el runbook
> [Correr el AI Visibility Grader](../../manual-de-uso/growth/ai-visibility-grader-smoke.md), sección "Panel
> competitivo multi-marca".

## Qué produce

- **Un informe web por marca**, en un enlace tokenizado (link corto `think.efeoncepro.com/s/<code>`). El enlace no
  vence.
- **Un PDF por marca** con el mismo contenido.
- **Un panorama cruzado**: presencia en las preguntas de descubrimiento, resultado por pregunta, resultado por
  motor, quién aparece cuando se piden alternativas al cliente, qué parte de las citas apunta al sitio propio de
  cada marca y qué fuentes de terceros se citan más.
- **Un correo de entrega** con el método, las preguntas, cómo leer el informe, el panorama, cómo sería trabajar
  juntos, los límites y una invitación a una reunión.

> Detalle técnico: la plantilla del correo vive en
> [`correo-panel-competitivo-aeo.md`](../../../.claude/skills/seo-aeo-practice/templates/correo-panel-competitivo-aeo.md)
> (skill `seo-aeo-practice`).

## Cómo leerlo

### Las 7 dimensiones del puntaje

El puntaje de cada marca (0 a 100) combina siete dimensiones con pesos fijos:

| Dimensión | Peso |
|---|---|
| Visibilidad en IA | 25 |
| Claridad de entidad | 15 |
| Dominio de categoría | 15 |
| Participación frente a la competencia | 15 |
| Calidad de las citas | 15 |
| Alineación del mensaje | 10 |
| Cobertura de intención de compra | 5 |

### Aparecer no es lo mismo que ser citado

Una marca puede **aparecer** en la respuesta (el motor la nombra) sin ser **citada** (el motor no enlaza su sitio
como fuente). Son dos cosas distintas y el panel las mide por separado: la presencia dice si la marca está en la
conversación; la cuota de citas del sitio propio dice si el motor confía en lo que la marca publica. Cuando el
sitio propio no se cita, las respuestas se sostienen en sitios de terceros (comparadores, enciclopedias, foros,
agencias de viaje).

### Cada motor es un canal

Los cinco motores no se comportan igual. Una marca puede estar presente en casi todas las respuestas de un motor y
en la mitad de las de otro. Por eso el panel se lee **motor por motor**, como se leería el rendimiento de una marca
en canales distintos, y no sólo por el promedio.

## Límites conocidos

Se declaran siempre, en el informe y en la conversación:

| Límite | Qué significa |
|---|---|
| **Extracto de 600 caracteres** | Las menciones se cuentan sobre el tramo inicial de cada respuesta (600 caracteres), que es donde suele estar la recomendación. Una marca nombrada al final de una lista larga queda **subcontada**, y no hay texto completo guardado para recontar |
| **Eco en la pregunta comparativa** | La pregunta que nombra al cliente ("¿Qué alternativas hay a…?") hace que el cliente aparezca en esas respuestas por eco; no es presencia ganada |
| **Sitios bloqueados = "sin dato"** | Si un sitio bloquea la lectura automática, sus lecturas técnicas quedan "sin dato", **nunca cero** |
| **Revisión disparada por palabras sueltas** | El detector de lenguaje sensible busca fragmentos de palabras: "denuncia" dispara con "denunciados" y "demanda" dispararía con "demandadas". Que un informe pase por revisión no significa que haya un problema real |
| **Falso positivo del chequeo de `llms.txt`** | Si un sitio responde a cualquier dirección con su página principal, el chequeo puede decir "llms.txt presente con contenido curado" cuando no existe. Del mismo modo, "robots.txt no bloquea" es trivialmente cierto si no hay robots.txt real. Esos chequeos no se citan sin revisar el contenido |
| **Foto de un día** | El panel es una medición puntual. La tendencia exige repetir el mismo panel con cadencia fija |
| **Sin atribución a ventas** | El panel no mide cuánto vende una marca por aparecer en IA |

El extracto de 600 caracteres, el falso positivo de `llms.txt` y el detector por fragmentos son defectos del Grader
detectados el 2026-09-11. Todavía no tienen task: quedan como follow-up pendiente de registrar.

> Detalle técnico: el límite del extracto es `GROWTH_AI_VISIBILITY_EXCERPT_MAX = 600`
> (`src/lib/growth/ai-visibility/contracts.ts`); el detector de revisión es `RISKY_REVIEW_TERMS`
> (`review-gates/gates.ts`). Ver [AI Visibility Grader](../growth/ai-visibility-grader.md).

## Ejemplo: el caso SKY (2026-09-11)

**Contexto.** Lo pidió Nicolá Lamiaux, Gerente de Marketing de SKY Airline. Se hizo **fuera de la licitación de
SEO en curso con SKY**: sin propuesta ni precio, sólo para mostrar el método.

**Medición.** Cinco aerolíneas, mercado Chile, 12 preguntas × 5 motores = 60 respuestas por marca (300 en total).
Cada run tardó unos 17 minutos; los cinco quedaron listos en alrededor de una hora.

| Marca | Puntaje |
|---|---|
| LATAM | 81,1 |
| JetSMART | 72,7 |
| SKY | 70,6 |
| Avianca | 41,5 (pasó por revisión humana) |
| Gol | 37,3 (pasó por revisión humana) |

**Panorama** (medido sobre los primeros 600 caracteres de cada respuesta):

- **Presencia en las 200 respuestas de descubrimiento** (preguntas que no nombran marca): LATAM 83%, SKY 73%,
  JetSMART 73%, Avianca 6%, Gol 0%.
- **Por pregunta** (de 25 respuestas cada una: la misma pregunta en los 5 motores y los 5 runs): "viajar barato"
  JetSMART 23 / SKY 17 / LATAM 12; equipaje LATAM 24 / SKY 14 / JetSMART 13; Buenos Aires SKY 18 = JetSMART 18 /
  LATAM 16; Brasil LATAM 23 / SKY 22; familias y mascotas LATAM 24 / SKY 20.
- **Por motor** (SKY / LATAM / JetSMART, en %): Claude 98 / 98 / 98; Perplexity 93 / 90 / 78; ChatGPT 68 / 90 / 75;
  Gemini 50 / 75 / 43; Google 58 / 63 / 73.
- **"¿Qué alternativas hay a SKY?"**: LATAM aparece en el 92% de las respuestas y JetSMART en el 52% (SKY aparece
  por eco de la pregunta).
- **Cuota de citas del sitio propio** (sobre las respuestas con citas): LATAM 59,6%, JetSMART 43,4%, SKY 29,1%,
  Gol 14,5%, Avianca 12,1%.
- **Fuentes de terceros más citadas**: FlightConnections, Wikipedia, Kayak, Reddit, Momondo, Trip.com, Turismocity,
  Atrápalo, Chócale, Despegar, Skyscanner y TripAdvisor.
- **Dominio de categoría**: las tres líderes rondan 25 sobre 100 (LATAM 26,7, SKY 25, JetSMART 24,4).
- **Sentimiento evaluable**: LATAM 15 positivas / 6 negativas (de 42); SKY 7 / 8 (de 35); JetSMART 5 / 9 (de 31).
- **Técnica de skyairline.com**: `robots.txt`, `sitemap.xml` y `llms.txt` responden con la página de la aplicación,
  no con los archivos, y la portada se arma con JavaScript. Una prueba con el identificador del rastreador de
  OpenAI (GPTBot) desde la red de Efeonce recibió un bloqueo; como no se probó desde la red de OpenAI, se presenta
  como **algo a validar**, nunca como un hecho.

**Entrega.** Cinco informes web tokenizados, cinco PDF y un correo con el método, las preguntas, la lectura, el
panorama, cómo sería trabajar juntos, los límites y una invitación a una reunión de 30 a 40 minutos. El correo se
envió.

**Lectura comercial.** SKY no pierde por no aparecer: aparece en casi tres de cada cuatro respuestas de
descubrimiento. Pierde en **dónde** aparece (motor por motor) y en **quién es citado**: su sitio propio es fuente
en menos de un tercio de las respuestas con citas, frente a casi el 60% de LATAM.

## Lo que viene

Hoy el panel es un **procedimiento operador**: Growth prepara perfiles y set con un script local, encola los runs y
arma el análisis cruzado a mano. La intención es convertirlo en una **capacidad gobernada** (un lote de N marcas
con el mismo set) sobre estas tasks, ya creadas y sin implementar:

| Task | Qué agrega |
|---|---|
| [TASK-1861](../../tasks/to-do/TASK-1861-aeo-grader-mcp-operability.md) | Grader operable por MCP: correr, leer, informe web y PDF, con autoridad humana delegada |
| [TASK-1863](../../tasks/to-do/TASK-1863-aeo-grader-multi-market.md) | Grader multi-mercado: una marca en N mercados, en lotes, con matriz entre mercados |
| [TASK-1864](../../tasks/to-do/TASK-1864-mcp-self-sufficient-agent-surface.md) | Superficie agéntica autosuficiente del MCP: instrucciones, kit de cliente y evaluación de agentes de punta a punta |

> Detalle técnico: arquitectura del Grader en
> [GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md);
> motor funcional en [AI Visibility Grader](../growth/ai-visibility-grader.md); operación en
> [el runbook del Grader](../../manual-de-uso/growth/ai-visibility-grader-smoke.md); correo en
> [`correo-panel-competitivo-aeo.md`](../../../.claude/skills/seo-aeo-practice/templates/correo-panel-competitivo-aeo.md).
