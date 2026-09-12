# Usar el Panel Competitivo AEO en venta

> **Tipo de documento:** Manual de uso (comercial)
> **Version:** 1.0
> **Creado:** 2026-09-11 por Claude
> **Ultima actualizacion:** 2026-09-11 por Claude
> **Modulo:** Comercial / SEO-AEO / Growth
> **Documentacion funcional:** [Panel Competitivo AEO](../../documentation/comercial/panel-competitivo-aeo.md)
> **Documentacion tecnica:** [GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md)
> **Runbook operativo:** [Correr el AI Visibility Grader — Panel competitivo multi-marca](../growth/ai-visibility-grader-smoke.md#panel-competitivo-multi-marca)

## Para qué sirve

El Panel Competitivo AEO compara cómo aparecen tu cliente o prospecto y sus competidores en las respuestas de
cinco motores de IA (ChatGPT, Claude, Gemini, Perplexity y Google), con las mismas preguntas, el mismo día y el
mismo mercado. Te entrega un informe web y un PDF por marca, más un panorama cruzado.

En venta cumple una sola función: **evidencia antes que promesa**. En vez de explicar lo que haríamos, le regalas
al prospecto el mapa completo medido, con sus límites declarados, y le pides una reunión para leerlo juntos.
El panel **se presenta; no se manda y se espera**.

También sirve con un cliente contratado: fija el panel de referencia contra el cual se mide el trabajo mes a mes.

## Antes de empezar

- El panel todavía es un **procedimiento operador**, no un botón. Growth prepara los perfiles y el set de preguntas
  con un script local y encola los runs. Tú decides marcas, mercado y preguntas con el cliente; Growth lo ejecuta.
- Reserva tiempo: cada run tarda unos **17 minutos** y el worker llega a correr dos en paralelo. Un panel de cinco
  marcas queda listo en alrededor de **una hora**.
- Ten claro el contexto comercial. Si hay una licitación en curso con ese cliente, el panel va **fuera** de ella:
  sin propuesta ni precio, en registro formal (usted) y declarando que es un trabajo independiente.
- Ten a mano la plantilla del correo:
  [`correo-panel-competitivo-aeo.md`](../../../.claude/skills/seo-aeo-practice/templates/correo-panel-competitivo-aeo.md).

## Paso a paso

### 1. Decide marcas y mercado con el cliente o prospecto

Acuerda quién entra al panel (el cliente y sus competidores directos) y en qué mercado (país). En el caso SKY
fueron cinco aerolíneas en Chile: LATAM, JetSMART, SKY, Avianca y Gol.

Define también **cómo se escribe cada marca**, porque el conteo es literal: palabra completa, sin mayúsculas y sin
alias. Usa la forma más corta que cubra las variantes ("LATAM" cuenta "LATAM" y "LATAM Airlines"; "LATAM
Airlines" no cuenta "LATAM"). Ese nombre no se cambia entre runs.

### 2. Diseña el set de preguntas desde demanda real

Parte de lo que el mercado busca de verdad (Semrush, base de datos `cl` para Chile) para priorizar segmentos.
Después escribe **preguntas conversacionales**, con la situación de quien pregunta, no keywords sueltas.

Estructura recomendada (máximo **12 preguntas**):

| Tipo | Cantidad | Para qué |
|---|---|---|
| Descubrimiento sin marca | 8 | Lo que pregunta alguien que todavía no eligió. Es donde se ve la presencia ganada |
| Comparativa anclada en el cliente | 1 | "¿Qué alternativas hay a [cliente]…?", con el **mismo texto literal** en todos los runs |
| Con la marca de cada run | 3 | Reputación, reclamos, identidad de la marca que se está midiendo |

En el caso SKY, las 8 de descubrimiento cubrieron presupuesto, equipaje, ruta sur, negocios, Argentina, Brasil,
Perú/Colombia y familias con mascotas.

### 3. Pide a Growth que prepare perfiles y set, y que encole

Entrega a Growth la lista de marcas, el mercado y las 12 preguntas. Growth crea un perfil por marca, activa el mismo
set en todos y encola un run por marca, siguiendo el
[runbook del Grader, sección "Panel competitivo multi-marca"](../growth/ai-visibility-grader-smoke.md#panel-competitivo-multi-marca).

Pídele que confirme, **antes de encolar el resto**, que el primer run tomó el set curado (12 preguntas) y no el
pack genérico.

### 4. Espera

La plataforma ejecuta cada run, lo puntúa y **publica el informe sola**, unos 30 segundos después de terminar.
Cuenta con unos 17 minutos por run y alrededor de una hora para cinco. No hace falta hacer nada en ese tiempo.

### 5. Revisión humana

Si un informe queda **en revisión**, no está roto: el Grader detectó una palabra sensible en la narrativa y pide que
una persona lo lea antes de publicar. Lee la frase que disparó la revisión. El detector busca fragmentos de palabras:
en el caso SKY, "denuncia" se disparó con "denunciados" (Avianca) y "quiebra" con una frase sobre Gol. Si la frase
no es un problema real, apruébalo con criterio; la aprobación queda firmada por la persona que decide.

### 6. Verifica los enlaces

Antes de mandar nada, abre cada enlace:

- el informe web (link corto `think.efeoncepro.com/s/<code>`) debe cargar y mostrar el nombre de la marca en el título;
- el PDF debe abrir como PDF.

Los enlaces no vencen.

### 7. Haz el análisis cruzado y arma el panorama

Cuenta las menciones de **todas** las marcas con la misma regla en todas las respuestas (conteo simétrico). Mira:

- presencia en las preguntas de descubrimiento;
- resultado por pregunta;
- resultado por motor (cada motor es un canal);
- quién aparece cuando se piden alternativas al cliente;
- qué parte de las citas apunta al sitio propio de cada marca;
- qué fuentes de terceros se citan más.

Recuerda que **aparecer no es lo mismo que ser citado**, y separa ambas lecturas.

### 8. Escribe el correo y pide la reunión

Usa la [plantilla del correo](../../../.claude/skills/seo-aeo-practice/templates/correo-panel-competitivo-aeo.md).
La estructura que funcionó en el caso SKY:

1. Contexto y aclaración (si aplica): "fuera de la licitación, sin propuesta ni precio".
2. Qué medimos y cómo: condiciones idénticas, 5 motores, preguntas desde demanda real, conteo simétrico, revisión humana.
3. Las preguntas.
4. Cómo leer el informe: las 7 dimensiones con sus pesos; aparecer no es ser citado; cada motor es un canal.
5. El panorama en tabla, más 8 a 10 hallazgos con números.
6. Cómo sería trabajar con nosotros: panel fijo → diagnóstico técnico, de contenido, de entidad y de fuentes →
   prescripción priorizada → re-medición mensual, sobre plataforma propia.
7. Lo que el análisis no dice (los límites).
8. Los enlaces web en el cuerpo y los PDF adjuntos.
9. La invitación a una reunión de 30 a 40 minutos.

El correo **cierra pidiendo la reunión**. El valor está en leer el panel juntos, no en el adjunto.

### 9. Vuelve a medir con el mismo panel

El panel es una foto de un día. Para mostrar tendencia, repite **el mismo panel** (mismas marcas escritas igual,
mismo mercado, mismo set) con cadencia fija. Si cambias preguntas o nombres, los resultados dejan de ser
comparables.

## Qué significan los estados o señales

| Estado o señal | Qué significa | Qué haces |
|---|---|---|
| Informe publicado | El run terminó, se puntuó y el informe quedó publicado solo | Verifica el enlace y el PDF (paso 6) |
| En revisión (`review_required` / `in_review`) | El detector encontró una palabra sensible en la narrativa | Lee la frase y decide (paso 5) |
| `no_lead` | El run no está asociado a un lead ni a una organización, así que la plataforma no sincroniza HubSpot ni manda su correo automático | Nada: en el panel, el correo lo escribes tú (paso 8) |
| "Sin dato" en lecturas técnicas | El sitio bloquea la lectura automática | Preséntalo como "sin dato", **nunca como cero** |
| Puntaje 0–100 | Combina 7 dimensiones: Visibilidad en IA 25 · Claridad de entidad 15 · Dominio de categoría 15 · Participación frente a la competencia 15 · Calidad de las citas 15 · Alineación del mensaje 10 · Cobertura de intención de compra 5 | Úsalo como resumen; la historia está en el panorama |

## Qué no hacer

- **No puntúes ni publiques un informe a mano.** La plataforma lo hace sola al terminar el run; hacerlo a mano pisa
  la lectura que el worker hizo de las respuestas.
- **No uses el código ISO del país como mercado** ("CL"). El mercado va por nombre ("Chile"); con el ISO, las
  preguntas salen con un "…en CL" crudo.
- **No cambies el nombre de una marca entre runs** ni dentro del mismo panel. El conteo es literal y el perfil se
  identifica por el nombre.
- **No presentes como hecho algo que no verificaste.** En el caso SKY, el bloqueo al rastreador de OpenAI (GPTBot)
  se probó desde la red de Efeonce, no desde la de OpenAI: se presenta como algo a validar, nunca como un hecho. Lo
  mismo con los chequeos de `llms.txt` y `robots.txt` cuando el sitio responde a todo con su página principal.
- **No lo mezcles con la oferta de una licitación ni le pongas precio.** Si hay licitación en curso, el panel es
  independiente y así se declara.
- **No mandes el PDF y esperes.** Sin reunión, el panel es un adjunto más.
- **No prometas atribución a ventas.** El panel no mide cuánto vende una marca por aparecer en IA.

## Problemas comunes

- **Un informe quedó en revisión.** Casi siempre es el detector por fragmentos ("denuncia" dentro de
  "denunciados", "demanda" dentro de "demandadas"). Lee la frase antes de aprobar; que pase por revisión no
  significa que haya un problema real.
- **El run salió con competidores viejos o preguntas que no son las tuyas.** El perfil se identifica por marca +
  mercado + idioma, y sus competidores quedan fijos desde el primer run (no se pueden editar). Si ese nombre ya se
  usó, se reutiliza el perfil antiguo. En el caso SKY, "SKY Airline" traía un perfil viejo con otro sitio y otro
  competidor; por eso el panel usó "SKY".
- **El run salió con 7 preguntas genéricas.** El perfil no tenía el set curado activo. Pide a Growth que lo active
  y vuelva a encolar; por eso conviene revisar el primer run antes de encolar el resto (paso 3).
- **Las preguntas dicen "en CL".** Se encoló con el ISO del país en vez del nombre. Hay que volver a correr con
  "Chile".
- **Una marca aparece menos de lo esperado.** Las menciones se cuentan sobre los primeros 600 caracteres de cada
  respuesta. Una marca nombrada al final de una lista larga queda subcontada, y no hay texto completo guardado para
  recontar. Declara el límite en el correo.
- **Un sitio sale "sin dato".** Bloquea la lectura automática (en el caso SKY pasó con LATAM, Avianca y Gol). No es
  un cero; preséntalo como falta de dato.
- **La marca del cliente aparece "demasiado" en la pregunta de alternativas.** Es eco: la pregunta la nombra. No la
  cuentes como presencia ganada.

## Referencias técnicas

- Documentación funcional: [Panel Competitivo AEO](../../documentation/comercial/panel-competitivo-aeo.md)
- Motor del Grader: [AI Visibility Grader](../../documentation/growth/ai-visibility-grader.md)
- Runbook operativo:
  [Correr el AI Visibility Grader — Panel competitivo multi-marca](../growth/ai-visibility-grader-smoke.md#panel-competitivo-multi-marca)
- Arquitectura: [GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_PUBLIC_AI_VISIBILITY_GRADER_ARCHITECTURE_V1.md)
- Plantilla del correo:
  [`correo-panel-competitivo-aeo.md`](../../../.claude/skills/seo-aeo-practice/templates/correo-panel-competitivo-aeo.md)
- Principio "evidencia antes que promesa": `.claude/skills/seo-aeo-practice/modules/05_CUNA_GRADER.md`
- Lo que viene (capacidad gobernada): `TASK-1861` (grader por MCP), `TASK-1863` (multi-mercado), `TASK-1864`
  (superficie agéntica del MCP)
- Encadenamiento comercial: [Diagnóstico SEO de prospecto](diagnostico-seo-prospecto-en-venta.md) ·
  [Radiografía AEO](usar-radiografia-aeo-en-venta.md)
